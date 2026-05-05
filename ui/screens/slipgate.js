'use strict';

// =============================================================================
// Slipgate menu (purple theme).
// Three modes:
//   1. inactive — narrative dead-end while sectors not cleared
//   2. tutorial first-jump — yes/no confirmation
//   3. active — list of neighboring seed jumps + return
// =============================================================================

function makeSlipgateScreen() {
  const active = G.slipgateActive;
  const isTutFirst = G.seed === TUTORIAL_SEED && !G.tutorialDone;

  const screen = new Screen({
    id: 'slipgate',
    layout: 'modal',
    theme: 'slip',
    title: 'slipgate',
    footer: () => pausePromptDOM('to leave'),
    onCancel: returnToOverworld,
  });

  if (!active) {
    // Mode 1 — informational; only cancel exits.
    screen.populateBody = function() {
      this._panelBody.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'center-text muted';
      msg.style.padding = '12px 0';
      msg.textContent = 'clear all sectors to activate the slipgate.';
      this._panelBody.appendChild(msg);
    };
    screen.handle = function(input) { if (input.cancel) returnToOverworld(); };
    return screen;
  }

  if (isTutFirst) {
    screen.subtitle = 'slipspace coordinates unstable';

    screen.populateBody = function() {
      this._panelBody.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'center-text muted';
      msg.style.padding = '6px 0 14px';
      msg.innerHTML = 'destination unknown — slipgate distortion.<br>really use the slipgate?';
      this._panelBody.appendChild(msg);
      for (const w of this.widgets) this._panelBody.appendChild(w.render());
    };

    screen.add(new Button({
      label: 'yes — jump',
      onConfirm: () => { ia(); G.tutorialDone = true; jumpToSeed((Math.random() * 0xFFFFFFFF) >>> 0, TUTORIAL_SEED); },
    }));
    screen.add(new Button({
      label: 'no — stay',
      onConfirm: returnToOverworld,
    }));
    return screen;
  }

  // Mode 3 — neighbor list.
  const nb = slipNeighborList();
  screen.subtitle = `${nb.length} neighboring system${nb.length === 1 ? '' : 's'} detected`;

  for (let i = 0; i < nb.length; i++) {
    const seed = nb[i];
    const hex = seed.toString(16).toUpperCase().padStart(8, '0');
    const tags = [];
    if (seed === G.prevSeed) tags.push('← back');
    if (G.visitedSeeds.includes(seed)) tags.push('★');
    const label = hex.toLowerCase() + (tags.length ? '  ' + tags.join('  ') : '');
    screen.add(new Button({
      label,
      onConfirm: () => { ia(); jumpToSeed(seed, G.seed); },
    }));
  }
  screen.add(new Spacer({ size: 'sm' }));
  screen.add(new Button({ label: 'return', onConfirm: returnToOverworld }));

  return screen;
}

registerScreen('slipgate', makeSlipgateScreen);
