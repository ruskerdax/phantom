'use strict';

// =============================================================================
// Ship configurator — shared between the base shop's "equip flow" and the
// rebuild menu's "config" phase.
//
// Inputs (`flow`): { chassisId, slots: [weaponId|null], shieldId, focus,
// warnShown }
//
// Renders a panel with: per-slot weapon cycles, shield cycle, confirm button,
// back button. The confirm button label / cost is provided by `pricing`.
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
    footer: opts.footer || (() => {
      const cost = opts.priceText ? opts.priceText() : '';
      return [
        cost,
        `${UI_GLYPH_DOM.left}${UI_GLYPH_DOM.right} cycle`,
        'enter confirm',
        pausePromptDOM('cancel'),
      ].filter(Boolean).join('   ');
    }),
    onCancel: opts.onCancel,
  });

  // ---- Slot rows ---------------------------------------------------------
  for (let i = 0; i < ch.slots.length; i++) {
    const slot = ch.slots[i], slotIdx = i;
    screen.add(new Cycle({
      label: `slot ${i + 1} [${slot.type.toLowerCase()}]`,
      values: () => [null, ...licensedWeaponsForSlot(slot).map(w => w.id)],
      get: () => opts.flow()?.slots[slotIdx] ?? null,
      set: v => { const f = opts.flow(); if (f) f.slots[slotIdx] = v; },
      format: v => {
        if (v == null) return '(empty)';
        const wp = WEAPONS.find(w => w.id === v);
        return (wp ? wp.id : v).toLowerCase();
      },
    }));
  }

  // ---- Shield row --------------------------------------------------------
  screen.add(new Cycle({
    label: 'shield',
    values: () => [null, ...SHIELDS.filter(s => hasLicense(s.id)).map(s => s.id)],
    get: () => opts.flow()?.shieldId ?? null,
    set: v => { const f = opts.flow(); if (f) f.shieldId = v; },
    format: v => {
      if (v == null) return '(none)';
      const sh = SHIELDS.find(s => s.id === v);
      return (sh ? sh.name : v).toLowerCase();
    },
  }));

  screen.add(new Spacer({ size: 'sm' }));

  // ---- Confirm + Back ----------------------------------------------------
  screen.add(new Button({
    label: () => opts.confirmLabel ? opts.confirmLabel() : 'confirm',
    onConfirm: () => {
      const f = opts.flow();
      if (!f) return;
      const hasWeapon = f.slots.some(s => s !== null);
      if (!hasWeapon && !f.warnShown) { f.warnShown = true; return; }
      opts.onConfirm();
    },
  }));
  screen.add(new Button({ label: 'back', onConfirm: opts.onCancel }));

  // ---- Tail row: warning -------------------------------------------------
  const warnRow = new TextRow({
    text: () => opts.flow()?.warnShown ? 'warning: no weapons equipped!' : '',
    color: 'var(--accent-warn)',
    align: 'center',
    size: 'sm',
  });
  warnRow.focusable = false;
  screen.add(warnRow);

  // Refresh every frame so warning + price update live.
  screen.tick = function() { this.refresh(); };

  return screen;
}

// -----------------------------------------------------------------------------
// equip-config screen — registered with the input bridge.
// -----------------------------------------------------------------------------

function makeEquipConfigScreen() {
  return makeShipConfigurator({
    id: 'equip-config',
    theme: 'info',
    flow: () => G.equipFlow,
    priceText: () => 'build cost ' + (G.equipFlow?.buildPrice ?? 0) + ' cr',
    confirmLabel: () => 'confirm  ' + creditLabel(G.equipFlow?.buildPrice ?? 0),
    onConfirm: () => {
      const ef = G.equipFlow, ch = CHASSIS.find(c => c.id === ef.chassisId);
      if (!ch) { G.equipFlow = null; return; }
      if (G.credits < ef.buildPrice) { tone(80, .1, 'square', .06); return; }
      const power = defaultPowerForChassisId(ch.id);
      G.credits -= ef.buildPrice;
      G.loadout.chassis = ef.chassisId;
      G.loadout.battery = power.battery;
      G.loadout.reactor = power.reactor;
      G.loadout.weapons = [...ef.slots];
      G.loadout.shield = ef.shieldId;
      while (G.loadout.weapons.length < ch.slots.length) G.loadout.weapons.push(null);
      G.loadout.weapons = G.loadout.weapons.slice(0, ch.slots.length);
      const s = G.OW?.s;
      if (s) {
        s.chassisId = ch.id;
        s.batteryId = power.battery;
        s.reactorId = power.reactor;
        fillShipHull(s); fillShipEnergy(s); resetShipShield(s);
      }
      G.equipFlow = null;
      G.shopActionId = null;
      saveGame();
      tone(660, .2, 'sine', .08);
    },
    onCancel: () => { G.equipFlow = null; },
  });
}

registerScreen('equip-config', makeEquipConfigScreen);
