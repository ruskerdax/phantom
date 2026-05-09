'use strict';

// =============================================================================
// PHANTOM UI WIDGETS
//
// Each widget owns a DOM element, a focus state, and a handle(input) method
// returning true if it consumed Left/Right/Confirm/Clear. Vertical navigation
// is the screen's job; widgets only deal with their own value/action.
//
// Common interface:
//   w.render() -> HTMLElement (built once, cached)
//   w.refresh() -> update DOM to match current value
//   w.setFocused(bool)
//   w.handle(input) -> bool (consumed?)
//   w.focusable (default true; set false for separators/labels)
// =============================================================================

const UI_GLYPH_DOM = {
  pointer: '▶',
  left:    '◄',
  right:   '►',
  back:    '◀',
  star:    '★',
  dash:    '—',
  arrow:   '→',
};

class Widget {
  constructor(opts = {}) {
    this.opts = opts;
    this.focusable = opts.focusable !== false;
    this.disabled = !!opts.disabled;
    this._el = null;
    this._focused = false;
  }
  render() {
    if (!this._el) this._el = this.build();
    this.refresh();
    return this._el;
  }
  build() { return document.createElement('div'); }
  refresh() {
    if (!this._el) return;
    this._el.classList.toggle('is-focused', this._focused);
    this._el.classList.toggle('is-disabled', !!this.disabled);
  }
  setFocused(b) { this._focused = !!b; this.refresh(); }
  setDisabled(b) { this.disabled = !!b; this.refresh(); }
  handle(_input) { return false; }
}

// ----- Static text / heading inside body ------------------------------------
class TextRow extends Widget {
  constructor(opts) { super(opts); this.focusable = false; this.text = opts.text || ''; this.cls = opts.cls || ''; }
  build() {
    const el = document.createElement('div');
    el.className = `text-row ${this.cls}`.trim();
    el.style.textAlign = this.opts.align || 'center';
    el.style.fontSize = this.opts.size === 'sm' ? 'var(--fs-row-detail)' : 'var(--fs-row)';
    el.style.color = this.opts.color || 'var(--text-faint)';
    el.style.padding = '4px 8px';
    return el;
  }
  refresh() { super.refresh(); if (this._el) this._el.textContent = (typeof this.text === 'function' ? this.text() : this.text); }
  setText(t) { this.text = t; this.refresh(); }
}

// ----- Spacer (no-op vertical gap) -------------------------------------------
class Spacer extends Widget {
  constructor(opts = {}) { super(opts); this.focusable = false; this.size = opts.size || 'md'; }
  build() { const el = document.createElement('div'); el.className = `spacer-${this.size}`; return el; }
}

// ----- Divider line ----------------------------------------------------------
class Divider extends Widget {
  constructor(opts = {}) { super(opts); this.focusable = false; }
  build() { const el = document.createElement('hr'); el.className = 'panel-divider'; return el; }
}

// ----- Button (single, full-width centered action) --------------------------
class Button extends Widget {
  constructor(opts) {
    super(opts);
    this.label = opts.label;
    this.onConfirm = opts.onConfirm;
    this.center = opts.center !== false;
    this.cls = opts.cls || '';
  }
  build() {
    const el = document.createElement('div');
    el.className = `row ${this.center ? 'center' : ''} ${this.cls}`.trim();
    const ptr = document.createElement('span'); ptr.className = 'row-pointer'; ptr.textContent = UI_GLYPH_DOM.pointer;
    const lbl = document.createElement('span'); lbl.className = 'row-label';
    el.appendChild(ptr); el.appendChild(lbl);
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    const lbl = this._el.querySelector('.row-label');
    lbl.textContent = typeof this.label === 'function' ? this.label() : this.label;
  }
  handle(input) {
    if (input.confirm && !this.disabled) { this.onConfirm && this.onConfirm(); return true; }
    return false;
  }
}

// ----- Toggle (ON/OFF) -------------------------------------------------------
class Toggle extends Widget {
  constructor(opts) {
    super(opts);
    this.label = opts.label;
    this.get = opts.get;        // () => bool
    this.set = opts.set;        // (bool) => void
    this.color = opts.color;    // optional override (e.g. 'cheat')
  }
  build() {
    const el = document.createElement('div');
    el.className = 'row';
    el.innerHTML = `
      <span class="row-pointer">${UI_GLYPH_DOM.pointer}</span>
      <span class="row-label"></span>
      <span class="row-value toggle"></span>
    `;
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    const v = !!this.get();
    this._el.querySelector('.row-label').textContent = this.label;
    const t = this._el.querySelector('.toggle');
    t.textContent = v ? 'on' : 'off';
    t.classList.toggle('on', v);
    t.classList.toggle('off', !v);
    if (this.color === 'cheat' && this._focused) this._el.style.setProperty('--accent', 'var(--accent-cheat)');
    else this._el.style.removeProperty('--accent');
  }
  handle(input) {
    if (this.disabled) return false;
    if (input.confirm || input.left || input.right) { this.set(!this.get()); return true; }
    return false;
  }
}

// ----- Slider (volume bar 0-10) ----------------------------------------------
class Slider extends Widget {
  constructor(opts) {
    super(opts);
    this.label = opts.label;
    this.min = opts.min ?? 0;
    this.max = opts.max ?? 10;
    this.step = opts.step ?? 1;
    this.get = opts.get;
    this.set = opts.set;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'row';
    el.innerHTML = `
      <span class="row-pointer">${UI_GLYPH_DOM.pointer}</span>
      <span class="row-label"></span>
      <span class="row-value slider"></span>
    `;
    const slider = el.querySelector('.slider');
    for (let i = this.min; i < this.max; i++) {
      const slot = document.createElement('span');
      slot.className = 'slot';
      slider.appendChild(slot);
    }
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    this._el.querySelector('.row-label').textContent = this.label;
    const v = this.get();
    const slots = this._el.querySelectorAll('.slot');
    slots.forEach((s, i) => s.classList.toggle('filled', i < v));
  }
  handle(input) {
    if (this.disabled) return false;
    if (input.left)  { this.set(Math.max(this.min, this.get() - this.step)); return true; }
    if (input.right) { this.set(Math.min(this.max, this.get() + this.step)); return true; }
    return false;
  }
}

// ----- NumberStepper (numeric shader/config parameter) ----------------------
class NumberStepper extends Widget {
  constructor(opts) {
    super(opts);
    this.label = opts.label;
    this.min = opts.min ?? 0;
    this.max = opts.max ?? 1;
    this.step = opts.step ?? 0.01;
    this.get = opts.get;
    this.set = opts.set;
    this.format = opts.format || (v => String(v));
  }
  build() {
    const el = document.createElement('div');
    el.className = 'row';
    el.innerHTML = `
      <span class="row-pointer">${UI_GLYPH_DOM.pointer}</span>
      <span class="row-label"></span>
      <span class="row-value cycle">
        <span class="arrow left">${UI_GLYPH_DOM.left}</span>
        <span class="cycle-text"></span>
        <span class="arrow right">${UI_GLYPH_DOM.right}</span>
      </span>
    `;
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    this._el.querySelector('.row-label').textContent = typeof this.label === 'function' ? this.label() : this.label;
    this._el.querySelector('.cycle-text').textContent = this.format(this.get());
  }
  _set(v) {
    const n = Math.max(this.min, Math.min(this.max, v));
    this.set(Number(n.toFixed(6)));
  }
  handle(input) {
    if (this.disabled) return false;
    if (input.left)  { this._set(this.get() - this.step); return true; }
    if (input.right) { this._set(this.get() + this.step); return true; }
    return false;
  }
}

// ----- Cycle ---------------------------------------------------------------
// `values` may be: array of strings, array of {id, label}, or a function ()=>array.
class Cycle extends Widget {
  constructor(opts) {
    super(opts);
    this.label = opts.label;
    this.values = opts.values;
    this.get = opts.get;
    this.set = opts.set;
    this.format = opts.format || (v => (v && v.label) || String(v));
  }
  _vals() { return typeof this.values === 'function' ? this.values() : this.values; }
  build() {
    const el = document.createElement('div');
    el.className = 'row';
    el.innerHTML = `
      <span class="row-pointer">${UI_GLYPH_DOM.pointer}</span>
      <span class="row-label"></span>
      <span class="row-value cycle">
        <span class="arrow left">${UI_GLYPH_DOM.left}</span>
        <span class="cycle-text"></span>
        <span class="arrow right">${UI_GLYPH_DOM.right}</span>
      </span>
    `;
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    this._el.querySelector('.row-label').textContent = this.label;
    const cur = this.get();
    const vals = this._vals();
    let display = '';
    if (vals.length) {
      const found = vals.find(v => (v && v.id === cur) || v === cur);
      display = this.format(found ?? vals[0]);
    } else {
      display = '(none)';
    }
    this._el.querySelector('.cycle-text').textContent = display;
    const enabled = vals.length > 1;
    this._el.querySelectorAll('.arrow').forEach(a => a.classList.toggle('disabled', !enabled));
  }
  handle(input) {
    if (this.disabled) return false;
    const vals = this._vals();
    if (!vals.length) return false;
    const cur = this.get();
    const idx = vals.findIndex(v => (v && v.id === cur) || v === cur);
    const i = idx < 0 ? 0 : idx;
    if (input.left)  { this.set(this._idAt(vals, (i - 1 + vals.length) % vals.length)); return true; }
    if (input.right) { this.set(this._idAt(vals, (i + 1) % vals.length)); return true; }
    if (input.confirm) { this.set(this._idAt(vals, (i + 1) % vals.length)); return true; }
    return false;
  }
  _idAt(vals, i) { const v = vals[i]; return v && typeof v === 'object' && 'id' in v ? v.id : v; }
}

// ----- Button pair (e.g. BACK | CONFIRM) ------------------------------------
// Behaves as one focus stop with horizontal sub-selection.
class ButtonPair extends Widget {
  constructor(opts) {
    super(opts);
    this.left = opts.left;          // {label, onConfirm, cls?}
    this.right = opts.right;
    this.sel = opts.defaultSel ?? 1;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'button-pair';
    const mk = (which, b) => {
      const btn = document.createElement('div');
      btn.className = `button ${b.cls || ''}`.trim();
      btn.dataset.which = which;
      btn.textContent = b.label;
      el.appendChild(btn);
      return btn;
    };
    this._leftEl = mk('left', this.left);
    this._rightEl = mk('right', this.right);
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    this._leftEl.classList.toggle('is-focused', this._focused && this.sel === 0);
    this._rightEl.classList.toggle('is-focused', this._focused && this.sel === 1);
    if (this._focused) {
      // prefix focused button label with pointer for keyboard discoverability
      this._leftEl.textContent  = (this.sel === 0 ? UI_GLYPH_DOM.pointer + ' ' : '') + this.left.label;
      this._rightEl.textContent = (this.sel === 1 ? UI_GLYPH_DOM.pointer + ' ' : '') + this.right.label;
    } else {
      this._leftEl.textContent = this.left.label;
      this._rightEl.textContent = this.right.label;
    }
  }
  handle(input) {
    if (input.left)  { this.sel = 0; return true; }
    if (input.right) { this.sel = 1; return true; }
    if (input.confirm) {
      const b = this.sel === 0 ? this.left : this.right;
      b.onConfirm && b.onConfirm();
      return true;
    }
    return false;
  }
}

// ----- KeyBinder (controls remap row) ---------------------------------------
// Two columns: keyboard / gamepad. Confirm enters listening mode for whichever
// column is selected (column selection comes from screen-level state).
class KeyBinder extends Widget {
  constructor(opts) {
    super(opts);
    this.actionId = opts.actionId;
    this.label = opts.label;
    this.getCol = opts.getCol;          // () => 0 (key) | 1 (btn)
    this.setCol = opts.setCol;
    this.startListening = opts.startListening;  // (mode: 'key'|'btn') => void
    this.isListening = opts.isListening;        // () => bool, current row listening
  }
  build() {
    const row = document.createElement('div');
    row.className = 'row-action';
    const lbl = document.createElement('span'); lbl.className = 'label';
    const key = document.createElement('span'); key.className = 'key';
    const btn = document.createElement('span'); btn.className = 'btn';
    row.appendChild(lbl); row.appendChild(key); row.appendChild(btn);
    this._lbl = lbl; this._key = key; this._btn = btn;
    return row;
  }
  refresh() {
    if (!this._el) return;
    this._el.classList.toggle('is-focused', this._focused);
    this._el.classList.toggle('is-listening', this._focused && this.isListening && this.isListening());
    this._lbl.textContent = (this._focused ? UI_GLYPH_DOM.pointer + ' ' : '') + this.label;
    const b = (typeof BND !== 'undefined' && BND[this.actionId]) || {};
    const col = this._focused && this.getCol ? this.getCol() : -1;
    const listening = this._focused && this.isListening && this.isListening();
    if (listening && col === 0) this._key.textContent = 'press key...';
    else this._key.textContent = b.key != null ? '[' + (typeof fmtKey === 'function' ? fmtKey(b.key) : b.key) + ']' : '[--]';
    if (listening && col === 1) this._btn.textContent = 'press btn...';
    else this._btn.textContent = b.btn != null ? '[' + (typeof fmtBtn === 'function' ? fmtBtn(b.btn) : b.btn) + ']' : '[--]';
    this._key.classList.toggle('is-active', this._focused && col === 0);
    this._btn.classList.toggle('is-active', this._focused && col === 1);
  }
  handle(input) {
    if (input.left)  { this.setCol && this.setCol(0); return true; }
    if (input.right) { this.setCol && this.setCol(1); return true; }
    if (input.confirm) {
      const col = this.getCol ? this.getCol() : 0;
      this.startListening && this.startListening(col === 0 ? 'key' : 'btn');
      return true;
    }
    if (input.clear) {
      const b = (typeof BND !== 'undefined' && BND[this.actionId]) || {};
      const col = this.getCol ? this.getCol() : 0;
      if (col === 0) b.key = null; else b.btn = null;
      typeof saveBND === 'function' && saveBND();
      return true;
    }
    return false;
  }
}

// ----- SectionHeader (non-focusable label + dashed underline) ---------------
class SectionHeader extends Widget {
  constructor(opts) {
    super(opts);
    this.focusable = false;
    this.label = opts.label || '';
    this.color = opts.color || null;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'section-header';
    if (this.color) el.style.color = this.color;
    return el;
  }
  refresh() {
    if (!this._el) return;
    this._el.textContent = typeof this.label === 'function' ? this.label() : this.label;
  }
}

// ----- KeyValueRow (non-focusable flex label/value row) ----------------------
class KeyValueRow extends Widget {
  constructor(opts) {
    super(opts);
    this.focusable = false;
    this.label = opts.label || '';
    this.value = opts.value ?? '';
    this.valueColor = opts.valueColor || null;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'kv-row';
    const lbl = document.createElement('span'); lbl.className = 'kv-label';
    const val = document.createElement('span'); val.className = 'kv-value';
    if (this.valueColor) val.style.color = this.valueColor;
    el.appendChild(lbl); el.appendChild(val);
    this._lbl = lbl; this._val = val;
    return el;
  }
  refresh() {
    if (!this._el) return;
    this._lbl.textContent = typeof this.label === 'function' ? this.label() : this.label;
    this._val.textContent = typeof this.value === 'function' ? this.value() : this.value;
  }
}

// ----- StatCompareRow (non-focusable side-by-side stat comparison) ----------
class StatCompareRow extends Widget {
  constructor(opts) {
    super(opts);
    this.focusable = false;
    this.label = opts.label || '';
    this.current = opts.current ?? 0;
    this.candidate = opts.candidate ?? 0;
    this.unit = opts.unit || '';
    this.betterIsHigher = opts.betterIsHigher !== false;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'stat-compare';

    const lbl = document.createElement('span');
    lbl.className = 'sc-label';

    const bars = document.createElement('div');
    bars.className = 'sc-bars';

    const curBar = document.createElement('div');
    curBar.className = 'bar';
    const curFill = document.createElement('div');
    curFill.className = 'fill';
    curBar.appendChild(curFill);

    const arrow = document.createElement('span');
    arrow.className = 'sc-arrow';
    arrow.textContent = '→';

    const canBar = document.createElement('div');
    canBar.className = 'bar';
    const canFill = document.createElement('div');
    canFill.className = 'fill';
    canBar.appendChild(canFill);

    bars.appendChild(curBar);
    bars.appendChild(arrow);
    bars.appendChild(canBar);

    const delta = document.createElement('span');
    delta.className = 'delta';

    el.appendChild(lbl);
    el.appendChild(bars);
    el.appendChild(delta);

    this._lbl = lbl;
    this._curFill = curFill;
    this._canFill = canFill;
    this._delta = delta;
    return el;
  }
  refresh() {
    if (!this._el) return;
    const cur = typeof this.current === 'function' ? this.current() : this.current;
    const can = typeof this.candidate === 'function' ? this.candidate() : this.candidate;
    this._lbl.textContent = typeof this.label === 'function' ? this.label() : this.label;

    const max = Math.max(Math.abs(cur), Math.abs(can), 1);
    this._curFill.style.width = Math.min(100, (Math.abs(cur) / max) * 100) + '%';
    this._canFill.style.width = Math.min(100, (Math.abs(can) / max) * 100) + '%';

    const diff = can - cur;
    const unit = this.unit;
    const sign = diff > 0 ? '+' : '';
    this._delta.textContent = `${sign}${diff}${unit}`;

    const isGood = (diff > 0 && this.betterIsHigher) || (diff < 0 && !this.betterIsHigher);
    const isBad  = (diff < 0 && this.betterIsHigher) || (diff > 0 && !this.betterIsHigher);
    this._delta.className = 'delta' + (isGood ? ' up' : isBad ? ' down' : '');
  }
}

// ----- TabBar (horizontal tab strip, focusable, left/right to switch) -------
class TabBar extends Widget {
  constructor(opts) {
    super(opts);
    this.tabs = opts.tabs;            // [{id, label, badge?}]
    this.get = opts.get;
    this.set = opts.set;
    this.onChange = opts.onChange;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'tab-bar';
    for (const t of this.tabs) {
      const item = document.createElement('div');
      item.className = 'tab';
      item.dataset.id = t.id;
      const lbl = document.createElement('span');
      lbl.textContent = t.label;
      item.appendChild(lbl);
      if (t.badge !== undefined) {
        const badge = document.createElement('span');
        badge.className = 'tab-badge';
        item.appendChild(badge);
      }
      el.appendChild(item);
    }
    return el;
  }
  refresh() {
    super.refresh();
    if (!this._el) return;
    const cur = this.get();
    this._el.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('is-active', t.dataset.id === cur);
    });
    this.tabs.forEach((t, i) => {
      if (t.badge !== undefined) {
        const badgeEl = this._el.children[i].querySelector('.tab-badge');
        if (badgeEl) {
          const val = typeof t.badge === 'function' ? t.badge() : t.badge;
          badgeEl.textContent = val != null ? String(val) : '';
        }
      }
    });
  }
  handle(input) {
    if (!input.left && !input.right) return false;
    const tabs = this.tabs;
    const cur = this.get();
    const idx = tabs.findIndex(t => t.id === cur);
    const i = idx < 0 ? 0 : idx;
    const next = input.left
      ? (i - 1 + tabs.length) % tabs.length
      : (i + 1) % tabs.length;
    const newId = tabs[next].id;
    this.set(newId);
    if (this.onChange) this.onChange(newId);
    return true;
  }
}

// ----- NewsTicker (pulsing dot + scrolling event ribbon) --------------------
class NewsTicker extends Widget {
  constructor(opts) {
    super(opts);
    this.focusable = false;
    this.items = opts.items;
  }
  build() {
    const el = document.createElement('div');
    el.className = 'news-ticker';
    const pulse = document.createElement('div');
    pulse.className = 'pulse';
    const track = document.createElement('span');
    track.className = 'track';
    el.appendChild(pulse);
    el.appendChild(track);
    this._track = track;
    return el;
  }
  refresh() {
    if (!this._el) return;
    const items = typeof this.items === 'function' ? this.items() : this.items;
    const empty = !items || items.length === 0;
    this._el.classList.toggle('hidden', empty);
    if (!empty) {
      this._track.innerHTML = '';
      const all = [...items, ...items];
      for (const text of all) {
        const span = document.createElement('span');
        span.textContent = text;
        this._track.appendChild(span);
      }
    }
  }
}
