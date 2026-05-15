'use strict';

// =============================================================================
// Ship configurator — shared between the equip flow (refit, deferred-cost diff)
// and the rebuild menu's "config" phase (full rebuild cost).
//
// Layout (05-b):
//   top:    ShipDiagram (left, focused slot pulses) | SlotPicker info card (260px)
//   below:  shield Cycle (focusable)
//   bottom: confirm Button + back Button (+ warning row)
//
// Input model:
//   ←/→ slot   ↑/↓ weapon   [confirm] apply   [cancel] back
// =============================================================================

function makeShipConfigurator(opts) {
  const flow = opts.flow();
  const ch = CHASSIS.find(c => c.id === flow.chassisId);
  if (!ch) {
    // Defensive: bail out cleanly if flow is malformed
    const blank = new Screen({ id: opts.id, layout: 'modal', title: 'configuration error', onCancel: opts.onCancel });
    blank.handle = function() { opts.onCancel(); };
    return blank;
  }

  const screen = new Screen({
    id: opts.id,
    layout: 'modal',
    theme: opts.theme || 'default',
    title: opts.title || ('configure: ' + ch.name).toLowerCase(),
    footer: opts.footer || (() => [
      bindHint('left/right', 'slot'),
      bindHint('up/down', 'weapon'),
      bindHint('confirm', 'apply'),
      bindHint('cancel', 'back'),
    ].join('   ')),
    onCancel: opts.onCancel,
  });

  // ---- SlotPicker (info card for focused slot) ----------------------------
  const picker = new SlotPicker({
    getSlots: () => {
      const f = opts.flow();
      const c = f ? CHASSIS.find(x => x.id === f.chassisId) : null;
      return c?.slots || [];
    },
    getChoicesForSlot: (slotIdx) => {
      const f = opts.flow();
      if (!f) return [];
      const c = CHASSIS.find(x => x.id === f.chassisId);
      const sl = c?.slots?.[slotIdx];
      if (!sl) return [];
      return [null, ...licensedWeaponsForSlot(sl).map(w => w.id)];
    },
    getCurrent: (slotIdx) => {
      const f = opts.flow();
      return f ? (f.slots[slotIdx] ?? null) : null;
    },
    setCurrent: (slotIdx, id) => {
      const f = opts.flow();
      if (!f) return;
      f.slots[slotIdx] = id;
    },
  });
  screen.add(picker);

  // ---- Shield Cycle (focusable, below SlotPicker) -------------------------
  const shieldCycle = new Cycle({
    label: 'shield',
    values: () => [null, ...SHIELDS.filter(s => hasLicense(s.id)).map(s => s.id)],
    get: () => opts.flow()?.shieldId ?? null,
    set: v => { const f = opts.flow(); if (f) f.shieldId = v; },
    format: v => {
      if (v == null) return '(none)';
      const sh = SHIELDS.find(s => s.id === v);
      return (sh ? sh.name : v).toLowerCase();
    },
  });
  screen.add(shieldCycle);

  // ---- Confirm + Back ----------------------------------------------------
  const confirmBtn = new Button({
    label: () => opts.confirmLabel ? opts.confirmLabel() : 'confirm',
    onConfirm: () => {
      const f = opts.flow();
      if (!f) return;
      if (opts.confirmDisabled && opts.confirmDisabled()) { tone(80, .1, 'square', .06); return; }
      const hasWeapon = f.slots.some(s => s !== null);
      if (!hasWeapon && !f.warnShown) { f.warnShown = true; return; }
      opts.onConfirm();
    },
  });
  screen.add(confirmBtn);
  const backBtn = new Button({ label: 'back', onConfirm: opts.onCancel });
  screen.add(backBtn);

  // ---- Tail row: warning -------------------------------------------------
  const warnRow = new TextRow({
    text: () => opts.flow()?.warnShown ? 'warning: no weapons equipped!' : '',
    color: 'var(--accent-warn)',
    align: 'center',
    size: 'sm',
  });
  warnRow.focusable = false;
  screen.add(warnRow);

  // ---- Diagram (non-focusable display) -----------------------------------
  const diagram = new ShipDiagram({
    chassisId: flow.chassisId,
    loadout: { weapons: flow.slots, shield: flow.shieldId },
    focusedSlotId: 0,
  });

  // ---- Custom 2-pane layout ----------------------------------------------
  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'ship-configurator-grid';

    const leftPane = document.createElement('div');
    leftPane.className = 'ship-configurator-diagram';
    leftPane.appendChild(diagram.render());

    const rightPane = document.createElement('div');
    rightPane.className = 'ship-configurator-info';
    rightPane.appendChild(picker.render());

    grid.appendChild(leftPane);
    grid.appendChild(rightPane);
    this._panelBody.appendChild(grid);

    this._panelBody.appendChild(shieldCycle.render());
    this._panelBody.appendChild(confirmBtn.render());
    this._panelBody.appendChild(backBtn.render());
    this._panelBody.appendChild(warnRow.render());
  };

  // Up/Down on the SlotPicker cycles weapons; the default Screen.handle would
  // otherwise steal them for vertical focus movement before they reach the
  // widget. Override so the picker gets first crack and only falls through to
  // moveFocus at its choice-list boundaries (when handle returns false).
  screen.handle = function(input) {
    if (input.cancel && this.onCancel) { this.onCancel(); return; }
    const w = this.focused();
    if ((input.up || input.down) && w === picker) {
      if (picker.handle(input)) { this.refresh(); return; }
      // Boundary: fall through to vertical focus movement.
      this.moveFocus(input.up ? -1 : 1);
      return;
    }
    if (input.up)   { this.moveFocus(-1); return; }
    if (input.down) { this.moveFocus( 1); return; }
    if (w && w.handle) {
      const consumed = w.handle(input);
      if (consumed) { this.refresh(); return; }
    }
    if (input.confirm && this.onConfirm) { this.onConfirm(); }
  };

  // Refresh every frame so the diagram, info card, and pricing track live state.
  screen.tick = function() {
    const f = opts.flow();
    if (f) {
      const curCh = CHASSIS.find(c => c.id === f.chassisId);
      if (curCh) diagram.chassisId = curCh.id;
      diagram.setLoadout({ weapons: f.slots, shield: f.shieldId });
    }
    diagram.setFocusedSlotId(picker.slotIdx);
    if (opts.confirmDisabled) confirmBtn.setDisabled(!!opts.confirmDisabled());
    this.refresh();
  };

  return screen;
}

// -----------------------------------------------------------------------------
// equip-config screen — registered with the input bridge.
//
// Refit-style flow: deferred-cost diff against flow.original. The original
// snapshot is taken on first mount. A→B→A returns cost to 0.
// -----------------------------------------------------------------------------

function equipFlowCost(flow) {
  if (!flow || !flow.original) return 0;
  let cost = 0;
  // Chassis build price applies when the configurator was opened to swap chassis
  // (buy-chassis flow). Pure refit (same chassis as snapshot) costs 0 here.
  if (flow.chassisId !== flow.original.chassisId) {
    const ch = CHASSIS.find(c => c.id === flow.chassisId);
    if (ch) cost += itemBuildPrice(ch);
  }
  const slots = flow.slots || [];
  const orig = flow.original.slots || [];
  for (let i = 0; i < slots.length; i++) {
    const cur = slots[i] ?? null;
    const was = orig[i] ?? null;
    if (cur !== was && cur != null) {
      const wp = WEAPONS.find(w => w.id === cur);
      if (wp) cost += itemBuildPrice(wp);
    }
  }
  const curShield = flow.shieldId ?? null;
  const wasShield = flow.original.shieldId ?? null;
  if (curShield !== wasShield && curShield != null) {
    const sh = SHIELDS.find(s => s.id === curShield);
    if (sh) cost += itemBuildPrice(sh);
  }
  return cost;
}

function makeEquipConfigScreen() {
  // Snapshot the original loadout for the diff cost. Reuse any existing
  // snapshot if the flow was re-entered without reset.
  const ef = G.equipFlow;
  if (ef && !ef.original) {
    ef.original = {
      chassisId: G.loadout.chassis,
      slots: [...(ef.slots || [])],
      shieldId: ef.shieldId ?? null,
    };
  }

  const screen = makeShipConfigurator({
    id: 'equip-config',
    theme: 'info',
    flow: () => G.equipFlow,
    confirmLabel: () => 'confirm · ' + creditLabel(equipFlowCost(G.equipFlow)),
    confirmDisabled: () => {
      const f = G.equipFlow;
      if (!f) return true;
      return G.credits < equipFlowCost(f);
    },
    onConfirm: () => {
      const ef = G.equipFlow, ch = CHASSIS.find(c => c.id === ef.chassisId);
      if (!ch) { G.equipFlow = null; return; }
      const cost = equipFlowCost(ef);
      if (G.credits < cost) { tone(80, .1, 'square', .06); return; }
      const chassisChanged = G.loadout.chassis !== ef.chassisId;
      G.credits -= cost;
      G.loadout.chassis = ef.chassisId;
      if (chassisChanged) {
        const power = defaultPowerForChassisId(ch.id);
        G.loadout.battery = power.battery;
        G.loadout.reactor = power.reactor;
      }
      G.loadout.weapons = [...ef.slots];
      G.loadout.shield = ef.shieldId;
      while (G.loadout.weapons.length < ch.slots.length) G.loadout.weapons.push(null);
      G.loadout.weapons = G.loadout.weapons.slice(0, ch.slots.length);
      const s = G.OW?.s;
      if (s) {
        if (chassisChanged) {
          const power = defaultPowerForChassisId(ch.id);
          s.chassisId = ch.id;
          s.batteryId = power.battery;
          s.reactorId = power.reactor;
          fillShipHull(s); fillShipEnergy(s);
        }
        resetShipShield(s);
        refillAmmoForLoadout(s);
      }
      G.equipFlow = null;
      G.shopActionId = null;
      saveGame();
      tone(660, .2, 'sine', .08);
    },
    onCancel: () => { G.equipFlow = null; },
  });

  return screen;
}

registerScreen('equip-config', makeEquipConfigScreen);
