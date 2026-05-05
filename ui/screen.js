'use strict';

// =============================================================================
// PHANTOM UI — Screen base class + screen stack.
//
// A Screen owns a DOM subtree mounted under #ui-root, a list of focusable
// widgets, and a `handle(input)` method that routes Up/Down/Left/Right/Confirm/
// Cancel/Clear actions to the focused widget (or to its own onCancel/onConfirm).
//
// The stack lets us push() overlays (pause, dialogs) without flag-soup; the
// top screen receives input, lower screens stay rendered behind.
// =============================================================================

const UI = {
  root: null,                // <div id="ui-root">
  stack: [],                 // active screens (top is last)
};

function uiInit() {
  UI.root = document.getElementById('ui-root');
  if (!UI.root) {
    UI.root = document.createElement('div');
    UI.root.id = 'ui-root';
    document.body.appendChild(UI.root);
  }
  syncThemeFromCSS();
}

function uiTopScreen() {
  return UI.stack[UI.stack.length - 1] || null;
}

function uiPush(screen) {
  if (!UI.root) uiInit();
  UI.stack.push(screen);
  screen._mount(UI.root);
  uiUpdateRootInteractivity();
  if (typeof suppressMenuInput === 'function') suppressMenuInput();
}

function uiPop() {
  const screen = UI.stack.pop();
  if (screen) screen._unmount();
  uiUpdateRootInteractivity();
  if (typeof suppressMenuInput === 'function') suppressMenuInput();
  return screen;
}

function uiClear() {
  while (UI.stack.length) uiPop();
}

function uiReplace(screen) {
  uiClear();
  uiPush(screen);
}

function uiUpdateRootInteractivity() {
  if (!UI.root) return;
  if (UI.stack.length > 0) UI.root.classList.add('is-active');
  else UI.root.classList.remove('is-active');
}

// Called from main.js update() — routes the current frame's menu input to the
// top screen. Returns true if the screen consumed the input.
function uiHandleInput(input) {
  const top = uiTopScreen();
  if (!top) return false;
  top.handle(input);
  return true;
}

// Called once per frame so screens can update animations / refresh dynamic
// state (e.g. the controls menu re-rendering on rebind).
function uiTick() {
  for (const s of UI.stack) s.tick && s.tick();
}

function uiHasScreens() { return UI.stack.length > 0; }

// =============================================================================
// Screen — base class
// =============================================================================

class Screen {
  constructor(opts = {}) {
    this.id = opts.id || 'screen';
    this.theme = opts.theme || 'default';      // 'default' | 'warn' | 'danger' | 'cheat' | 'slip' | 'info'
    this.layout = opts.layout || 'modal';       // 'fullscreen' | 'modal' | 'transparent'
    this.title = opts.title || '';
    this.subtitle = opts.subtitle || '';
    this.footer = opts.footer || '';            // string, or () => string
    this.onCancel = opts.onCancel || null;
    this.onConfirm = opts.onConfirm || null;
    this.widgets = [];                          // focusable widgets in tab order
    this.focusIdx = 0;
    this._el = null;                            // outer container
    this._panelBody = null;                     // body slot for widgets
    this._footerEl = null;
  }

  add(widget) {
    widget.screen = this;
    this.widgets.push(widget);
    return widget;
  }

  // Override in subclasses if you want a non-standard panel structure.
  buildDOM() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme}`;
    el.dataset.screen = this.id;

    const panel = document.createElement('div');
    panel.className = 'panel';

    if (this.title) {
      const t = document.createElement('div');
      t.className = 'panel-title';
      t.textContent = this.title;
      panel.appendChild(t);
    }
    if (this.subtitle) {
      const s = document.createElement('div');
      s.className = 'panel-subtitle';
      s.textContent = this.subtitle;
      panel.appendChild(s);
    }
    if (this.title || this.subtitle) {
      const hr = document.createElement('hr');
      hr.className = 'panel-divider';
      panel.appendChild(hr);
    }

    const body = document.createElement('div');
    body.className = 'panel-body';
    panel.appendChild(body);
    this._panelBody = body;

    if (this.footer) {
      const f = document.createElement('div');
      f.className = 'panel-footer';
      panel.appendChild(f);
      this._footerEl = f;
    }

    el.appendChild(panel);
    this._el = el;
    return el;
  }

  _mount(root) {
    if (!this._el) this.buildDOM();
    this.populateBody();
    this.refresh();
    root.appendChild(this._el);
    this.onMount && this.onMount();
  }

  _unmount() {
    this.onUnmount && this.onUnmount();
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
  }

  // Subclasses or factory functions override this to populate widgets + DOM.
  populateBody() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';
    for (const w of this.widgets) this._panelBody.appendChild(w.render());
  }

  // Re-renders dynamic content (focus state, current values, footer text).
  refresh() {
    this.focusIdx = Math.max(0, Math.min(this.widgets.length - 1, this.focusIdx));
    for (let i = 0; i < this.widgets.length; i++) {
      const w = this.widgets[i];
      w.setFocused(i === this.focusIdx);
      w.refresh && w.refresh();
    }
    const focusedEl = this.widgets[this.focusIdx]?._el;
    if (focusedEl && focusedEl.scrollIntoView) {
      try { focusedEl.scrollIntoView({ block: 'nearest' }); } catch(e) {}
    }
    if (this._footerEl) {
      const txt = typeof this.footer === 'function' ? this.footer() : this.footer;
      this._footerEl.textContent = txt || '';
    }
  }

  focusableCount() { return this.widgets.filter(w => w.focusable !== false).length; }

  moveFocus(delta) {
    if (this.widgets.length === 0) return;
    const focusables = this.widgets.map((w, i) => ({ w, i })).filter(x => x.w.focusable !== false);
    if (focusables.length === 0) return;
    let cur = focusables.findIndex(x => x.i === this.focusIdx);
    if (cur < 0) cur = 0;
    cur = (cur + delta + focusables.length) % focusables.length;
    this.focusIdx = focusables[cur].i;
    this.refresh();
  }

  focused() { return this.widgets[this.focusIdx] || null; }

  handle(input) {
    if (input.cancel && this.onCancel) { this.onCancel(); return; }
    const w = this.focused();
    // Vertical movement is screen-level; widgets handle Left/Right/Confirm.
    if (input.up)   { this.moveFocus(-1); return; }
    if (input.down) { this.moveFocus( 1); return; }
    if (w && w.handle) {
      const consumed = w.handle(input);
      if (consumed) { this.refresh(); return; }
    }
    if (input.confirm && this.onConfirm) { this.onConfirm(); }
  }

  tick() {
    // re-render footer if it's a function (so dynamic prompts update)
    if (this._footerEl && typeof this.footer === 'function') {
      const txt = this.footer();
      if (this._footerEl.textContent !== txt) this._footerEl.textContent = txt || '';
    }
    for (const w of this.widgets) w.tick && w.tick();
  }
}
