'use strict';

// =============================================================================
// Options screen.
// Two-pane layout: category list on the left, category content on the right.
//
// Pane focus is an explicit state machine (`pane` = 'left' | 'right') and the
// screen owns *all* navigation. Widgets only render and respond to confirm /
// left / right when active. Keyboard and gamepad take identical paths because
// neither input source is referenced — only the resolved input.{up,down,...}
// flags from menuInput().
// =============================================================================

function makeOptionsScreen() {
  const categories = [
    { id: 'audio', label: 'audio' },
    { id: 'video', label: 'video' },
    { id: 'gameplay', label: 'gameplay' },
    { id: 'controls', label: 'controls' },
    { id: 'danger', label: 'danger' },
  ];
  let selectedCategory = categories[0].id;
  let pane = 'left';                  // 'left' | 'right'
  let rightFocus = 0;                 // index into rightFocusables()
  let rightWidgets = [];
  const categoryButtons = [];

  const screen = new Screen({
    id: 'options',
    layout: 'fullscreen',
    theme: 'default',
    title: 'options',
    footer: () => `${bindHint('left/right', 'category')}   ${bindHint('confirm', 'select')}   ${bindHint('cancel', 'back')}`,
    onCancel: returnFromOptions,
  });

  function categoryIndex(id) { return categories.findIndex(c => c.id === id); }
  function rightFocusables()  { return rightWidgets.filter(w => w.focusable !== false); }

  function buildRightWidgets(categoryId) {
    if (categoryId === 'audio') {
      return [
        new Slider({
          label: 'sound effects',
          get: () => G.sfxVol,
          set: v => { G.sfxVol = v; tone(900, .04, 'square', .05); saveSettings(); },
        }),
        new Slider({
          label: 'music',
          get: () => G.musVol,
          set: v => { G.musVol = v; saveSettings(); },
        }),
      ];
    }

    if (categoryId === 'video') {
      return [
        new Cycle({
          label: 'visual fx',
          values: RENDER_QUALITY_VALUES,
          get: () => normalizeRenderQuality(G.renderQuality),
          set: v => { G.renderQuality = v; tone(v === 'full' ? 1200 : v === 'reduced' ? 800 : 400, .08, 'square', .05); saveSettings(); },
          format: v => (typeof v === 'string' ? v : v?.id || 'full'),
        }),
        new Toggle({
          label: 'shaders',
          disabled: !shaderSupported(),
          get: () => !!G.shaderEnabled,
          set: v => { shaderSetEnabled(v); tone(v ? 1200 : 400, .08, 'square', .05); saveSettings(); },
        }),
        new Button({
          label: 'open shader settings',
          disabled: !shaderSupported(),
          onConfirm: () => openShaderMenu(),
        }),
        new Toggle({
          label: 'fullscreen',
          get: () => !!document.fullscreenElement,
          set: v => {
            if (v) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
            tone(v ? 1200 : 400, .08, 'square', .05);
          },
        }),
      ];
    }

    if (categoryId === 'gameplay') {
      return [
        new Toggle({
          label: 'dynamic zoom',
          get: () => G.dynamicZoom !== false,
          set: v => { G.dynamicZoom = v; tone(v ? 1200 : 400, .08, 'square', .05); saveSettings(); },
        }),
        new Toggle({
          label: 'cheat mode',
          get: () => !!G.cheatMode,
          set: v => { G.cheatMode = v; tone(v ? 1200 : 400, .08, 'square', .05); },
        }),
      ];
    }

    if (categoryId === 'controls') {
      return [
        new Button({
          label: 'open controls',
          onConfirm: () => openControlsMenu(),
        }),
      ];
    }

    return [
      new Button({
        label: 'clear game data',
        cls: 'danger-button',
        onConfirm: () => { G.clearDataSel = 0; },
      }),
    ];
  }

  function setSelectedCategory(id) {
    if (categoryIndex(id) < 0 || id === selectedCategory) return;
    selectedCategory = id;
    rightFocus = 0;
    screen.populateBody();
    screen.refresh();
  }

  function setPane(next) {
    if (next === 'right') {
      const n = rightFocusables().length;
      if (n === 0) { pane = 'left'; }
      else { pane = 'right'; rightFocus = Math.max(0, Math.min(n - 1, rightFocus)); }
    } else {
      pane = 'left';
    }
    screen.refresh();
  }

  function cycleCategory(delta) {
    const idx = (categoryIndex(selectedCategory) + delta + categories.length) % categories.length;
    setSelectedCategory(categories[idx].id);
  }

  // ---- DOM ---------------------------------------------------------------
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

    const hr = document.createElement('hr');
    hr.className = 'panel-divider';
    panel.appendChild(hr);

    const body = document.createElement('div');
    body.className = 'panel-body';

    const split = document.createElement('div');
    split.style.display = 'grid';
    split.style.gridTemplateColumns = '220px 1fr';
    split.style.columnGap = '16px';
    split.style.alignItems = 'start';
    split.style.minHeight = '0';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '4px';
    left.style.paddingRight = '12px';
    left.style.borderRight = '1px solid var(--divider)';

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '4px';

    split.appendChild(left);
    split.appendChild(right);
    body.appendChild(split);
    panel.appendChild(body);

    this._panelBody = body;
    this._leftPane = left;
    this._rightPane = right;

    const footer = document.createElement('div');
    footer.className = 'panel-footer';
    panel.appendChild(footer);
    this._footerEl = footer;

    el.appendChild(panel);
    this._el = el;
    return el;
  };

  screen.populateBody = function() {
    rightWidgets = buildRightWidgets(selectedCategory);
    this.widgets = [...categoryButtons, ...rightWidgets];
    if (!this._leftPane || !this._rightPane) return;
    this._leftPane.innerHTML = '';
    this._rightPane.innerHTML = '';
    for (const w of categoryButtons) this._leftPane.appendChild(w.render());
    for (const w of rightWidgets) this._rightPane.appendChild(w.render());
  };

  screen.refresh = function() {
    const focusables = rightFocusables();
    if (pane === 'right' && focusables.length === 0) pane = 'left';

    const activeIdx = categoryIndex(selectedCategory);
    for (let i = 0; i < categoryButtons.length; i++) {
      const w = categoryButtons[i];
      w.setFocused(pane === 'left' && i === activeIdx);
      w.refresh && w.refresh();
    }
    const focusedRight = pane === 'right' ? focusables[rightFocus] : null;
    for (const w of rightWidgets) {
      w.setFocused(w === focusedRight);
      w.refresh && w.refresh();
    }

    // Keep base class' focusIdx loosely in sync for any external consumer.
    this.focusIdx = pane === 'left'
      ? activeIdx
      : Math.max(0, this.widgets.indexOf(focusedRight));

    const focusedEl = pane === 'left'
      ? categoryButtons[activeIdx]?._el
      : focusedRight?._el;
    if (focusedEl?.scrollIntoView) {
      try { focusedEl.scrollIntoView({ block: 'nearest' }); } catch(e) {}
    }

    if (this._footerEl) {
      const txt = typeof this.footer === 'function' ? this.footer() : this.footer;
      this._footerEl.textContent = txt || '';
    }
    if (typeof shaderMarkUiDirty === 'function') shaderMarkUiDirty();
  };

  // ---- Build category buttons (no per-button handle override) ------------
  // The screen owns all navigation; the buttons just render their label.
  for (const category of categories) {
    categoryButtons.push(new Button({
      label: () => selectedCategory === category.id ? `${category.label} <` : category.label,
      center: false,
      onConfirm: () => {},
    }));
  }

  // ---- Single source of truth for navigation -----------------------------
  screen.handle = function(input) {
    if (input.pause) { returnFromOptions(); return; }

    if (pane === 'left') {
      if (input.cancel) { returnFromOptions(); return; }
      if (input.up   || input.left)  { cycleCategory(-1); return; }
      if (input.down || input.right) { cycleCategory( 1); return; }
      if (input.confirm) { setPane('right'); return; }
      return;
    }

    // pane === 'right'
    if (input.cancel) { setPane('left'); return; }

    const focusables = rightFocusables();
    if (focusables.length === 0) { setPane('left'); return; }

    if (input.up || input.down) {
      rightFocus = (rightFocus + (input.down ? 1 : -1) + focusables.length) % focusables.length;
      this.refresh();
      return;
    }

    const w = focusables[rightFocus];
    if (w && w.handle && w.handle(input)) this.refresh();
  };

  return screen;
}

registerScreen('options', makeOptionsScreen);
