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

// ----- ShipDiagram (SVG silhouette + slot pins, single source via chassisPolygon) --
class ShipDiagram extends Widget {
  constructor(opts) {
    super(opts);
    this.focusable = false;
    this.chassisId = opts.chassisId || 'kestrel';
    this.loadout = opts.loadout || null;
    this.focusedSlotId = opts.focusedSlotId ?? null;
  }
  setFocusedSlotId(id) { this.focusedSlotId = id; this.refresh(); }
  setLoadout(loadout) { this.loadout = loadout; this.refresh(); }
  build() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ship-diagram');
    svg.setAttribute('viewBox', '-15 -13 30 23');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const hull = document.createElementNS(ns, 'polygon');
    hull.setAttribute('class', 'hull');
    svg.appendChild(hull);
    this._hull = hull;
    this._slotEls = [];
    return svg;
  }
  _syncSlots() {
    const ns = 'http://www.w3.org/2000/svg';
    const positions = chassisSlotPositions(this.chassisId);
    while (this._slotEls.length > positions.length) this._slotEls.pop().remove();
    while (this._slotEls.length < positions.length) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('r', '2.5');
      this._el.appendChild(c);
      this._slotEls.push(c);
    }
  }
  refresh() {
    if (!this._el) return;
    const pts = chassisPolygon(this.chassisId);
    this._hull.setAttribute('points', pts.map(p => p.join(',')).join(' '));
    this._syncSlots();
    const positions = chassisSlotPositions(this.chassisId);
    const weapons = this.loadout?.weapons || [];
    for (let i = 0; i < this._slotEls.length; i++) {
      const el = this._slotEls[i];
      const pos = positions[i];
      el.setAttribute('cx', pos[0]);
      el.setAttribute('cy', pos[1]);
      const equipped = !!weapons[i];
      const focused = this.focusedSlotId === i || this.focusedSlotId === String(i);
      el.setAttribute('class', 'slot' + (focused ? ' is-focused' : equipped ? ' is-equipped' : ''));
    }
  }
}

// ----- SiteMap (radar / star-map, focusable, directional nav) ----------------
class SiteMap extends Widget {
  constructor(opts) {
    super(opts);
    this.mode = opts.mode;            // 'system' | 'slipgate'
    this.nodes = opts.nodes;          // () => [{id, x, y, kind, label}]
    this.get = opts.get;              // () => focused id
    this.set = opts.set;              // (id) => void
    this.onConfirm = opts.onConfirm;
    this._nodeEls = new Map();        // String(id) -> SVGCircleElement
  }

  _rawNodes() {
    return typeof this.nodes === 'function' ? this.nodes() : (this.nodes || []);
  }

  // Returns nodes augmented with svgX/svgY in a 0..200 coordinate space.
  // For slipgate, positions are computed deterministically from each node's id (seed).
  // For system, caller-supplied x/y in [-1,1] are mapped to that space.
  _positionedNodes() {
    return this._rawNodes().map(n => {
      if (this.mode === 'slipgate') {
        const seed = n.id >>> 0;
        const u = (seed * 0x9E3779B1) >>> 0;
        const angle = (u / 0xFFFFFFFF) * Math.PI * 2;
        const r = 0.55 + ((seed >> 8) & 0xFF) / 512;
        return { ...n, svgX: 100 + Math.cos(angle) * r * 90, svgY: 100 + Math.sin(angle) * r * 90 };
      }
      return { ...n, svgX: 100 + (n.x ?? 0) * 90, svgY: 100 + (n.y ?? 0) * 90 };
    });
  }

  build() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'site-map');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const orbit = document.createElementNS(ns, 'circle');
    orbit.setAttribute('class', 'orbit');
    orbit.setAttribute('cx', '100');
    orbit.setAttribute('cy', '100');
    orbit.setAttribute('r', '67.5');
    svg.appendChild(orbit);

    // For slipgate mode, render the current system at center as a fixed, non-focusable marker.
    if (this.mode === 'slipgate') {
      const center = document.createElementNS(ns, 'circle');
      center.setAttribute('class', 'node is-current');
      center.setAttribute('cx', '100');
      center.setAttribute('cy', '100');
      center.setAttribute('r', '5');
      svg.appendChild(center);
    }

    return svg;
  }

  refresh() {
    if (!this._el) return;
    const ns = 'http://www.w3.org/2000/svg';
    const nodes = this._positionedNodes();
    const focusedId = this.get ? String(this.get()) : null;

    // Remove elements for nodes no longer in the list.
    const activeIds = new Set(nodes.map(n => String(n.id)));
    for (const [id, el] of this._nodeEls) {
      if (!activeIds.has(id)) { el.remove(); this._nodeEls.delete(id); }
    }

    for (const n of nodes) {
      const sid = String(n.id);
      let el = this._nodeEls.get(sid);
      if (!el) {
        el = document.createElementNS(ns, 'circle');
        el.setAttribute('r', '4');
        this._el.appendChild(el);
        this._nodeEls.set(sid, el);
      }
      el.setAttribute('cx', String(n.svgX));
      el.setAttribute('cy', String(n.svgY));
      el.setAttribute('class', 'node' + (sid === focusedId ? ' is-focused' : ''));
    }
  }

  handle(input) {
    if (input.confirm) {
      this.onConfirm && this.onConfirm(this.get ? this.get() : null);
      return true;
    }

    let dirAngle;
    if      (input.right) dirAngle = 0;
    else if (input.down)  dirAngle = Math.PI / 2;
    else if (input.left)  dirAngle = Math.PI;
    else if (input.up)    dirAngle = -Math.PI / 2;
    else return false;

    const nodes = this._positionedNodes();
    if (!nodes.length) return true;

    const focusedId = this.get ? String(this.get()) : null;
    const cur = nodes.find(n => String(n.id) === focusedId);

    // If nothing is focused yet, focus the first node.
    if (!cur) {
      this.set && this.set(nodes[0].id);
      this.refresh();
      return true;
    }

    const others = nodes.filter(n => String(n.id) !== focusedId);
    if (!others.length) return true;

    // Score each candidate by angular distance from the pressed direction.
    const scored = others.map(n => {
      const angle = Math.atan2(n.svgY - cur.svgY, n.svgX - cur.svgX);
      let diff = angle - dirAngle;
      while (diff >  Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return { n, absDiff: Math.abs(diff) };
    });

    // Prefer nodes in the pressed quadrant (±90°); fall back to closest by angle.
    const inQuad = scored.filter(c => c.absDiff <= Math.PI / 2);
    const pool = inQuad.length ? inQuad : scored;
    const best = pool.reduce((a, b) => a.absDiff < b.absDiff ? a : b);

    this.set && this.set(best.n.id);
    this.refresh();
    return true;
  }
}

// ----- RunSummaryPanel (2-column KV grid of run stats) ----------------------
class RunSummaryPanel extends Widget {
  constructor(opts) {
    super(opts);
    this.focusable = false;
    this.mode = opts.mode; // 'current' | 'last'
    this._rows = {};
  }

  _data() {
    if (this.mode === 'current') return (typeof G !== 'undefined' && G.run) ? G.run : null;
    return (typeof G !== 'undefined' && G.lastRun) ? G.lastRun.summary : null;
  }

  _seed() {
    if (this.mode === 'current') return (typeof G !== 'undefined') ? G.seed : null;
    return (typeof G !== 'undefined' && G.lastRun) ? G.lastRun.seed : null;
  }

  _fmt(v) { return (v != null) ? String(v) : '—'; }

  _fmtHex(seed) {
    if (seed == null) return '—';
    return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  _fmtTime(ms) {
    if (ms == null) return '—';
    const totalMin = Math.floor(ms / 60000);
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  }

  _addKVRow(el, key, label, color, spanFull) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    if (spanFull) row.style.gridColumn = '1 / -1';
    const lbl = document.createElement('span'); lbl.className = 'kv-label'; lbl.textContent = label;
    const val = document.createElement('span'); val.className = 'kv-value';
    if (color) val.style.color = color;
    row.appendChild(lbl); row.appendChild(val);
    el.appendChild(row);
    this._rows[key] = val;
  }

  build() {
    const el = document.createElement('div');
    el.className = 'run-summary-panel';
    el.style.display = 'grid';
    el.style.gridTemplateColumns = '1fr 1fr';
    el.style.gap = '0 var(--gap-loose, 16px)';
    this._rows = {};
    this._addKVRow(el, 'seed',           'seed');
    this._addKVRow(el, 'creditsEarned',  'credits earned');
    this._addKVRow(el, 'systemsVisited', 'systems visited');
    this._addKVRow(el, 'sectorsCleared', 'sectors cleared');
    this._addKVRow(el, 'kills',          'kills');
    this._addKVRow(el, 'deaths',         'deaths');
    this._addKVRow(el, 'time',           'time');
    this._addKVRow(el, 'stakeBonus',     'stake bonus', 'var(--stat-up)');
    if (this.mode === 'last') this._addKVRow(el, 'fate', 'fate', 'var(--accent-danger)', true);
    return el;
  }

  refresh() {
    if (!this._el) return;
    const d = this._data();
    this._rows.seed.textContent          = this._fmtHex(this._seed());
    this._rows.creditsEarned.textContent = this._fmt(d?.creditsEarned);
    const sv = this.mode === 'current'
      ? ((typeof G !== 'undefined' && G.totals) ? G.totals.systemsVisited : null)
      : d?.systemsVisited;
    this._rows.systemsVisited.textContent = this._fmt(sv);
    this._rows.sectorsCleared.textContent = this._fmt(d?.sectorsCleared);
    this._rows.kills.textContent          = this._fmt(d?.kills);
    this._rows.deaths.textContent         = this._fmt(d?.deaths);
    this._rows.time.textContent           = this._fmtTime(d?.activeMs);
    const bonus = d?.stakeBonusPct;
    this._rows.stakeBonus.textContent     = (bonus != null) ? `+${bonus}%` : '—';
    if (this.mode === 'last') this._rows.fate.textContent = 'destroyed';
  }
}

// ----- BodySummaryPanel (body/site summary shared by body-info + system map) --
class BodySummaryPanel extends Widget {
  constructor(opts = {}) {
    super(opts);
    this.focusable = false;
    this.siteRef = opts.siteRef || null;
    this.layout = opts.layout || 'inspect'; // 'inspect' | 'enter' | 'compact'
    this.moonFocusId = opts.moonFocusId ?? null;
    this._actionPair = null;
  }

  static bodySummaryRowText(body) {
    if (!body) return '';
    const id = body.id != null ? String(body.id).toLowerCase() : 'body';
    const kind = (body.subtype || body.kind || 'unknown').toString().toLowerCase().replace(/_/g, ' ');
    const size = Number.isFinite(body.size) ? Math.round(body.size) : '?';
    return `${id} · ${kind} · size ${size}`;
  }

  setSiteRef(siteRef) {
    this.siteRef = siteRef || null;
    this.refresh();
  }

  setMoonFocusId(moonFocusId) {
    this.moonFocusId = moonFocusId ?? null;
    this.refresh();
  }

  build() {
    const el = document.createElement('div');
    el.className = 'body-summary';
    return el;
  }

  handle(input) {
    if (this.layout !== 'enter' || !this._actionPair) return false;
    if (input.cancel) {
      this._back();
      return true;
    }
    return this._actionPair.handle(input);
  }

  refresh() {
    if (!this._el) return;
    this._el.innerHTML = '';
    this._actionPair = null;

    const siteRef = this.siteRef;
    if (!siteRef || !siteRef.kind) return;

    if (this.layout === 'compact') {
      if (siteRef.kind === 'body' && siteRef.body) this._appendLine(BodySummaryPanel.bodySummaryRowText(siteRef.body));
      return;
    }

    if (siteRef.kind === 'body') this._renderBody(siteRef.body);
    else if (siteRef.kind === 'hbase') this._renderHBase();
    else if (siteRef.kind === 'asteroid') this._renderAsteroid(siteRef.idx);
    else if (siteRef.kind === 'base') this._renderBase();
    else if (siteRef.kind === 'slipgate') this._renderSlipgate();

    if (this.layout === 'enter') this._appendActionPair();
  }

  _appendWidget(widget) {
    if (!widget) return;
    this._el.appendChild(widget.render());
  }

  _appendIdLabel(id) {
    const el = document.createElement('div');
    el.className = 'bsp-id';
    el.textContent = id != null ? String(id) : 'body';
    this._el.appendChild(el);
  }

  _appendSectionHeader(label) {
    this._appendWidget(new SectionHeader({ label }));
  }

  _appendKV(label, value, valueColor = null) {
    this._appendWidget(new KeyValueRow({ label, value, valueColor }));
  }

  _appendLine(text) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    const line = document.createElement('span');
    line.className = 'kv-label';
    line.textContent = text;
    row.appendChild(line);
    this._el.appendChild(row);
  }

  _appendObjectiveRows(rows) {
    this._appendSectionHeader('objectives');
    if (!rows.length) {
      this._appendKV('status', 'none');
      return;
    }
    for (const row of rows) {
      const complete = !!row.complete;
      const label = (row.label || row.type || 'objective').toString().toLowerCase();
      this._appendKV(label, complete ? 'complete' : 'pending', complete ? 'var(--stat-up)' : null);
    }
  }

  _planetObjectiveRows(bodyId) {
    if (typeof objectivePanelRows !== 'function' || !bodyId) return [];
    return objectivePanelRows({ layout: 'planet', bodyId }) || [];
  }

  _hbaseObjectiveRows() {
    const list = Array.isArray(G?.objectives) ? G.objectives : [];
    const hbaseType = (typeof OBJECTIVE_TYPE_IDS !== 'undefined' && OBJECTIVE_TYPE_IDS?.HBASE) || 'hbase';
    return list
      .filter(o => String(o?.type || '').toLowerCase() === String(hbaseType).toLowerCase())
      .map(o => ({ label: o.label, type: o.type, complete: !!o.complete }));
  }

  _asteroidObjectiveRows(idx) {
    const list = Array.isArray(G?.objectives) ? G.objectives : [];
    if (idx == null) return [];
    const keys = new Set([
      `asteroid:${idx}`,
      `asteroid-${idx}`,
      `asteroid ${idx}`,
      `ab:${idx}`,
      `ab${idx}`,
    ]);
    return list
      .filter(o => keys.has(String(o?.bodyId || '').toLowerCase()))
      .map(o => ({ label: o.label, type: o.type, complete: !!o.complete }));
  }

  _gravityLabel(size) {
    const n = Math.max(1, Math.min(6, Math.round(Number(size) || 1)));
    if (n === 1) return 'none';
    if (n === 2) return 'very little';
    if (n === 3) return 'some';
    if (n === 4) return 'moderate';
    if (n === 5) return 'high';
    return 'very high';
  }

  _renderBody(body) {
    if (!body || body.kind === 'star') return; // star is not a selectable site
    this._appendIdLabel(body.id || 'body');
    if (body.kind === 'gas_giant') {
      this._appendKV('size', Number.isFinite(body.size) ? Math.round(body.size) : '?');
      this._appendKV('type', 'gas giant');
      return;
    }
    if (body.kind !== 'habitable' && body.kind !== 'uninhabitable') return;

    this._appendSectionHeader('body');
    this._appendKV('size', Number.isFinite(body.size) ? Math.round(body.size) : '?');
    this._appendKV('gravity', this._gravityLabel(body.size));
    this._appendKV('type', String(body.kind).replace(/_/g, ' '));
    this._appendKV('subtype', body.subtype ? String(body.subtype).replace(/_/g, ' ') : 'none');
    this._appendKV('population', body.kind === 'uninhabitable' ? 'uninhabited' : (body.populationClass || 'none'));
    this._appendKV('atmosphere', body.atmoKind ? String(body.atmoKind).replace(/_/g, ' ') : 'none');
    this._appendObjectiveRows(this._planetObjectiveRows(body.id));
  }

  _renderHBase() {
    this._appendSectionHeader('hostile base');
    this._appendKV('status', G?.hbCleared ? 'cleared' : 'armada fleet active');
    this._appendObjectiveRows(this._hbaseObjectiveRows());
  }

  _renderAsteroid(idx) {
    this._appendSectionHeader('asteroid field');
    this._appendObjectiveRows(this._asteroidObjectiveRows(idx));
  }

  _renderBase() {
    this._appendSectionHeader('friendly base');
    this._appendLine('dock to refuel and refit');
  }

  _renderSlipgate() {
    this._appendSectionHeader('slipgate');
    this._appendLine(G?.slipgateActive ? 'unlocked' : 'locked');
  }

  _hasInteractableSurface() {
    const siteRef = this.siteRef;
    if (!siteRef || !siteRef.kind) return false;
    if (siteRef.kind === 'body') {
      const kind = siteRef.body?.kind;
      return kind === 'habitable' || kind === 'uninhabitable';
    }
    return siteRef.kind === 'hbase' || siteRef.kind === 'asteroid';
  }

  _appendActionPair() {
    const canEnter = this._hasInteractableSurface();
    this._actionPair = new ButtonPair({
      left: { label: 'back', onConfirm: () => this._back() },
      right: {
        label: canEnter ? 'enter' : 'enter (disabled)',
        onConfirm: () => { if (canEnter) this._enter(); },
      },
      defaultSel: canEnter ? 1 : 0,
    });
    this._actionPair.setFocused(true);
    const el = this._actionPair.render();
    if (!canEnter && el.children?.[1]) el.children[1].classList.add('is-disabled');
    this._el.appendChild(el);
  }

  _enter() {
    const siteRef = this.siteRef;
    if (!siteRef || !siteRef.kind) return;
    if (siteRef.kind === 'body') {
      const body = siteRef.body;
      if (!body) return;
      if ((body.kind === 'habitable' || body.kind === 'uninhabitable') && typeof enterPlanetByBodyId === 'function') {
        enterPlanetByBodyId(body.id);
      }
      return;
    }
    if (siteRef.kind === 'asteroid') {
      if (typeof enterAsteroidField === 'function') enterAsteroidField(siteRef.idx);
      return;
    }
    if (siteRef.kind === 'hbase') {
      if (typeof startHBaseEnc === 'function') startHBaseEnc();
    }
  }

  _back() {
    if (typeof uiPop === 'function') {
      uiPop();
      return;
    }
    if (this.screen?.onCancel) this.screen.onCancel();
  }
}

function bodySummaryRowText(body) {
  return BodySummaryPanel.bodySummaryRowText(body);
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
