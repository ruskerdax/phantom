'use strict';

// =============================================================================
// Cheats sub-menu (yellow theme).
// Each action runs immediately and exits the menu, except invincibility (toggle).
// =============================================================================

function makeCheatsScreen() {
  const screen = new Screen({
    id: 'cheats',
    layout: 'modal',
    theme: 'cheat',
    title: 'cheats',
    subtitle: 'cheat mode',
    footer: () => pausePromptDOM('to go back'),
    onCancel: () => { G.cheatSub = false; },
  });

  const exit = () => { G.paused = false; G.cheatSub = false; };

  screen.add(new Button({
    label: 'repair ship',
    onConfirm: () => {
      fillShipHull(G.OW.s); fillShipEnergy(G.OW.s); resetShipShield(G.OW.s);
      if (G.ENC)  { fillShipHull(G.ENC.s);  fillShipEnergy(G.ENC.s);  resetShipShield(G.ENC.s); }
      if (G.site) { fillShipHull(G.site.s); fillShipEnergy(G.site.s); resetShipShield(G.site.s); }
      tone(660, .2, 'sine', .08); exit();
    },
  }));
  screen.add(new Button({
    label: 'teleport to slipgate',
    onConfirm: () => {
      const sgp = owPos(SLIPGATE);
      G.OW.s.x = sgp.x; G.OW.s.y = sgp.y;
      G.ENC = null; G.site = null; returnToOverworld(); exit();
    },
  }));
  screen.add(new Button({
    label: 'jump to seed',
    onConfirm: () => { showSeedInput(v => { if (v != null) { exit(); jumpToSeed(v, null); } }); },
  }));
  screen.add(new Button({
    label: 'clear all sectors',
    onConfirm: () => {
      G.cleared = [true, true, true]; G.slipgateActive = true; G.slipMsg = 360;
      G.ENC = null; G.site = null; returnToOverworld(); exit();
    },
  }));
  screen.add(new Button({
    label: 'add 10k credits',
    onConfirm: () => { G.credits += 10000; tone(880, .15, 'sine', .07); exit(); },
  }));
  screen.add(new Button({
    label: 'zero credits',
    onConfirm: () => { G.credits = 0; tone(220, .15, 'sawtooth', .07); exit(); },
  }));
  screen.add(new Toggle({
    label: 'invincibility',
    get: () => !!G.invincible,
    set: v => { G.invincible = !!v; tone(G.invincible ? 1200 : 400, .08, 'square', .05); },
  }));
  screen.add(new Button({ label: 'back', onConfirm: () => { G.cheatSub = false; } }));

  return screen;
}

registerScreen('cheats', makeCheatsScreen);
