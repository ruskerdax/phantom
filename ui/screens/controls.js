'use strict';

// =============================================================================
// Controls screen — keyboard / gamepad rebinding.
//
// Custom layout:
//   panel
//     title "controls"
//     divider
//     [grid] ACTION | KEYBOARD | GAMEPAD column headers
//     [grid] KeyBinder row per ACT_DEFS entry
//     divider
//     [stack] gamepad steering cycle, return, reset
//     footer
// =============================================================================

function makeControlsScreen() {
  const screen = new Screen({
    id: 'controls',
    layout: 'fullscreen',
    theme: 'default',
    title: 'controls',
    footer: () => `${bindHint('left/right', 'column')}   ${bindHint('confirm', 'remap')}   del clear   ${bindHint('cancel', 'back')}`,
    onCancel: () => openOptionsMenu(G.optFrom),
  });

  // ---- Custom DOM ---------------------------------------------------------
  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme}`;
    el.dataset.screen = this.id;

    const panel = document.createElement('div');
    panel.className = 'panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = this.title;
    panel.appendChild(title);

    const hr1 = document.createElement('hr'); hr1.className = 'panel-divider'; panel.appendChild(hr1);

    // Column headers
    const headers = document.createElement('div');
    headers.className = 'controls-grid';
    headers.innerHTML = `
      <div class="col-header">action</div>
      <div class="col-header" data-col="0">keyboard</div>
      <div class="col-header" data-col="1">gamepad</div>
    `;
    this._headers = headers;
    panel.appendChild(headers);

    // Action grid lives inside a clipping container. We can't use overflow:auto
    // because cloneNode (shader SVG path) and getBoundingClientRect (shader
    // manual path) can't reproduce scrollTop state in the rasterized snapshot.
    // Instead, use overflow:hidden + a CSS transform on inner content that JS
    // updates on focus change. Both clip and transform are inline-style state
    // that survives cloneNode/serialization, so the snapshot matches live.
    const gridClip = document.createElement('div');
    gridClip.style.overflow = 'hidden';
    gridClip.style.minHeight = '0';
    panel.appendChild(gridClip);
    this._gridClip = gridClip;

    const grid = document.createElement('div');
    grid.className = 'controls-grid';
    gridClip.appendChild(grid);
    this._gridSlot = grid;

    const hr2 = document.createElement('hr'); hr2.className = 'panel-divider'; panel.appendChild(hr2);

    // Stack for tail widgets (steering / return / reset).
    const stack = document.createElement('div');
    stack.style.display = 'flex';
    stack.style.flexDirection = 'column';
    stack.style.gap = 'var(--gap-tight)';
    stack.style.margin = '4px 0';
    panel.appendChild(stack);
    this._stackSlot = stack;

    const footer = document.createElement('div');
    footer.className = 'panel-footer';
    panel.appendChild(footer);
    this._footerEl = footer;

    el.appendChild(panel);
    this._el = el;
    return el;
  };

  // Override populateBody to route widgets to the right slot.
  screen.populateBody = function() {
    this._gridSlot.innerHTML = '';
    this._stackSlot.innerHTML = '';
    for (const w of this.widgets) {
      const inGrid = w instanceof KeyBinder || w instanceof SectionHeader;
      const target = inGrid ? this._gridSlot : this._stackSlot;
      target.appendChild(w.render());
    }
  };

  // ---- KeyBinder rows grouped by section ----------------------------------
  const isListeningHere = (idx) => G.optListen != null && G.ctrlSel === idx;
  const startListening = (idx, mode) => {
    G.ctrlSel = idx;
    G.optListen = mode;
    suppressMenuInput();
  };
  const SECTION_ORDER = ['movement', 'combat', 'ui'];
  for (const section of SECTION_ORDER) {
    const entries = ACT_DEFS.map((a, i) => ({ a, i })).filter(({ a }) => (a.section || 'ui') === section);
    if (!entries.length) continue;
    for (const { a, i } of entries) {
      screen.add(new KeyBinder({
        actionId: a.id,
        label: a.label.toLowerCase(),
        getCol: () => G.optCol,
        setCol: c => { G.optCol = c; },
        startListening: mode => startListening(i, mode),
        isListening: () => isListeningHere(i),
      }));
    }
  }

  // ---- Tail widgets -------------------------------------------------------
  screen.add(new Cycle({
    label: 'gamepad steering',
    values: ['relative', 'absolute'],
    get: () => G.gpAimMode,
    set: v => {
      G.gpAimMode = v;
      G.absAimTarget = null;
      tone(v === 'absolute' ? 1200 : 400, .08, 'square', .05);
      saveSettings();
    },
  }));
  screen.add(new Button({
    label: 'reset to defaults',
    cls: 'danger-button',
    onConfirm: () => {
      ACT_DEFS.forEach(a => { BND[a.id] = { key: a.defKey, btn: a.defBtn }; });
      saveBND();
      G.gpAimMode = 'relative';
      G.absAimTarget = null;
      saveSettings();
    },
  }));
  screen.add(new Button({
    label: 'return',
    onConfirm: () => openOptionsMenu(G.optFrom),
  }));

  // ---- Sync G.ctrlSel with focused KeyBinder so the legacy input.js
  // keydown handler writes to the right action.
  const origRefresh = screen.refresh.bind(screen);
  screen.refresh = function() {
    const w = this.widgets[this.focusIdx];
    if (w instanceof KeyBinder) {
      const idx = ACT_DEFS.findIndex(a => a.id === w.actionId);
      if (idx >= 0) G.ctrlSel = idx;
    }
    if (this._headers) {
      this._headers.querySelectorAll('[data-col]').forEach(h => {
        h.classList.toggle('is-active', h.dataset.col === String(G.optCol));
      });
    }
    origRefresh();
    if (this._gridClip && this._gridSlot && w instanceof KeyBinder && w._el) {
      const clipRect = this._gridClip.getBoundingClientRect();
      const innerRect = this._gridSlot.getBoundingClientRect();
      const itemRect = w._el.getBoundingClientRect();
      const margin = 4;
      let offset = this._scrollOffset || 0;
      const itemTopInClip = itemRect.top - clipRect.top;
      const itemBotInClip = itemRect.bottom - clipRect.top;
      if (itemTopInClip < margin) offset += margin - itemTopInClip;
      else if (itemBotInClip > clipRect.height - margin) offset -= itemBotInClip - (clipRect.height - margin);
      const maxOffset = 0;
      const minOffset = Math.min(0, clipRect.height - innerRect.height);
      offset = Math.max(minOffset, Math.min(maxOffset, offset));
      this._scrollOffset = offset;
      this._gridSlot.style.transform = `translateY(${offset}px)`;
    }
  };

  // Refresh every frame so the listening "press key..." state updates and key
  // labels redraw immediately after rebind.
  screen.tick = function() {
    this.refresh();
  };

  return screen;
}

registerScreen('controls', makeControlsScreen);
