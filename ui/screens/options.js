'use strict';

// =============================================================================
// Options screen.
// Two-pane layout: category list on the left, category content on the right.
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

  function categoryIndexById(id) {
    return categories.findIndex(c => c.id === id);
  }

  function categoryIdFromOffset(categoryId, delta) {
    const idx = categoryIndexById(categoryId);
    if (idx < 0) return selectedCategory;
    const next = (idx + delta + categories.length) % categories.length;
    return categories[next].id;
  }

  function firstFocusableRightIndex() {
    for (let i = 0; i < rightWidgets.length; i++) {
      if (rightWidgets[i].focusable !== false) return categoryButtons.length + i;
    }
    return categoryButtons.length;
  }

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

  function rebuildWidgetList() {
    rightWidgets = buildRightWidgets(selectedCategory);
    screen.widgets = [...categoryButtons, ...rightWidgets];
  }

  function setSelectedCategory(categoryId, opts = {}) {
    const idx = categoryIndexById(categoryId);
    if (idx < 0) return;
    const changed = selectedCategory !== categoryId;
    selectedCategory = categoryId;
    if (!changed && !opts.force) return;
    screen.populateBody();
    if (opts.keepRightFocus) screen.focusIdx = firstFocusableRightIndex();
    else screen.focusIdx = idx;
    screen.refresh();
  }

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
    rebuildWidgetList();
    if (!this._leftPane || !this._rightPane) return;
    this._leftPane.innerHTML = '';
    this._rightPane.innerHTML = '';
    for (const w of categoryButtons) this._leftPane.appendChild(w.render());
    for (const w of rightWidgets) this._rightPane.appendChild(w.render());
  };

  for (const category of categories) {
    const btn = new Button({
      label: () => selectedCategory === category.id ? `${category.label} <` : category.label,
      center: false,
      onConfirm: () => setSelectedCategory(category.id, { force: true, keepRightFocus: true }),
    });
    btn._categoryId = category.id;
    const baseHandle = btn.handle.bind(btn);
    btn.handle = function(input) {
      if (input.left) {
        setSelectedCategory(categoryIdFromOffset(category.id, -1));
        return true;
      }
      if (input.right) {
        setSelectedCategory(categoryIdFromOffset(category.id, 1));
        return true;
      }
      return baseHandle(input);
    };
    categoryButtons.push(btn);
  }

  const baseHandle = screen.handle.bind(screen);
  screen.handle = function(input) {
    // Pause always exits the options screen regardless of which pane is focused.
    if (input.pause) { returnFromOptions(); return; }

    const prevFocus = this.widgets[this.focusIdx];
    const onRight = prevFocus && !prevFocus._categoryId;

    // Cancel from the right pane returns focus to the selected category on the left.
    if (input.cancel && onRight) {
      this.focusIdx = categoryIndexById(selectedCategory);
      this.refresh();
      return;
    }

    // Up/down on the right pane wraps within the right pane only.
    if (onRight && (input.up || input.down)) {
      const rightFocusables = this.widgets
        .map((w, i) => ({ w, i }))
        .filter(x => !x.w._categoryId && x.w.focusable !== false);
      if (rightFocusables.length > 0) {
        let cur = rightFocusables.findIndex(x => x.i === this.focusIdx);
        if (cur < 0) cur = 0;
        cur = (cur + (input.down ? 1 : -1) + rightFocusables.length) % rightFocusables.length;
        this.focusIdx = rightFocusables[cur].i;
        this.refresh();
        return;
      }
    }

    const wasOnCategory = !!(prevFocus?._categoryId);
    baseHandle(input);

    const focused = this.widgets[this.focusIdx];
    if (focused?._categoryId && focused._categoryId !== selectedCategory) {
      setSelectedCategory(focused._categoryId, { force: true });
      return;
    }

    if (!wasOnCategory && focused?._categoryId && (input.left || input.right)) {
      const nextId = categoryIdFromOffset(focused._categoryId, input.left ? -1 : 1);
      setSelectedCategory(nextId, { force: true });
    }
  };

  return screen;
}

registerScreen('options', makeOptionsScreen);
