'use strict';

// =============================================================================
// Ship configuration overlay (read-only). Shown from the pause menu.
// Confirm or Cancel exits.
// =============================================================================

function makeShipConfigScreen() {
  const screen = new Screen({
    id: 'ship-config',
    layout: 'modal',
    theme: 'default',
    title: 'ship configuration',
    footer: () => `enter / ${pausePromptDOM('to close')}`,
    onCancel: () => { G.showShipConfig = false; },
    onConfirm: () => { G.showShipConfig = false; },
  });

  // Custom body — a key/value list rather than focusable widgets.
  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';

    const ch = activeChassisObj();
    const sh = activeShieldObj();

    const list = document.createElement('div');
    list.className = 'kv-list';

    const rows = [
      ['chassis', ch.name],
      ['hull',    chassisHullStatsText(ch)],
      ['thrust',  chassisThrustStatsText(ch)],
      ['shield',  shieldLoadoutText(sh)],
    ];
    ch.slots.forEach((sl, i) => {
      rows.push([`slot ${i + 1} [${sl.type.toLowerCase()}]`, weaponLoadoutText(wpSlot(i))]);
    });
    rows.push(['systems visited', '' + G.visitedSeeds.length]);

    for (const [k, v] of rows) {
      const keyEl = document.createElement('div'); keyEl.className = 'key';   keyEl.textContent = k;
      const valEl = document.createElement('div'); valEl.className = 'value'; valEl.textContent = (v || '').toLowerCase();
      list.appendChild(keyEl); list.appendChild(valEl);
    }
    this._panelBody.appendChild(list);
  };

  // No focusable widgets — but we want Enter/Cancel to exit. Override handle.
  screen.handle = function(input) {
    if (input.cancel || input.confirm) { G.showShipConfig = false; }
  };

  return screen;
}

registerScreen('ship-config', makeShipConfigScreen);
