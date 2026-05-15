'use strict';

// =============================================================================
// Ship readout screen (06-b blueprint). Read-only.
// Silhouette on the left, KV-grouped stats on the right.
// Confirm or Cancel closes. Reused inline by the pause screen's right pane
// via populateShipReadoutBody().
// =============================================================================

function populateShipReadoutBody(panelEl) {
  if (!panelEl) return;
  panelEl.innerHTML = '';
  panelEl.classList.add('ship-readout-body');

  const grid = document.createElement('div');
  grid.className = 'ship-readout-grid';

  // ---- Left pane: silhouette + slot callouts ------------------------------
  const leftPane = document.createElement('div');
  leftPane.className = 'ship-readout-diagram';
  const ch = activeChassisObj();
  const diagram = new ShipDiagram({
    chassisId: ch.id,
    loadout: G.loadout,
    focusedSlotId: null,
  });
  const svg = diagram.render();
  leftPane.appendChild(svg);

  const ns = 'http://www.w3.org/2000/svg';
  const positions = chassisSlotPositions(ch.id);
  positions.forEach((pos, i) => {
    const [x, y] = pos;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('class', 'slot-callout');
    line.setAttribute('x1', String(x + 2.5));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(x + 6));
    line.setAttribute('y2', String(y));
    svg.appendChild(line);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('class', 'slot-callout-label');
    text.setAttribute('x', String(x + 7));
    text.setAttribute('y', String(y + 1));
    text.textContent = String(i + 1);
    svg.appendChild(text);
  });

  grid.appendChild(leftPane);

  // ---- Right pane: section groups -----------------------------------------
  const rightPane = document.createElement('div');
  rightPane.className = 'ship-readout-stats';
  function appendW(w) { rightPane.appendChild(w.render()); }

  appendW(new SectionHeader({ label: 'stats' }));
  appendW(new KeyValueRow({ label: 'hull', value: String(ch.maxHp) }));
  appendW(new KeyValueRow({ label: 'thrust', value: chassisThrustStatsText(ch).toLowerCase() }));
  appendW(new KeyValueRow({
    label: 'energy',
    value: `${loadoutBatteryCapacity()} cap · ${loadoutReactorRate()}/s rech`,
  }));

  appendW(new SectionHeader({ label: 'loadout' }));
  ch.slots.forEach((sl, i) => {
    const wp = wpSlot(i);
    appendW(new KeyValueRow({
      label: `slot ${i + 1} [${sl.type.toLowerCase()}]`,
      value: (wp ? weaponLoadoutText(wp) : '(empty)').toLowerCase(),
    }));
  });
  const sh = activeShieldObj();
  appendW(new KeyValueRow({
    label: 'shield',
    value: (sh ? shieldLoadoutText(sh) : '(none)').toLowerCase(),
  }));

  appendW(new SectionHeader({ label: 'credits' }));
  appendW(new KeyValueRow({ label: 'credits', value: String(G.credits) }));
  appendW(new KeyValueRow({ label: 'stake', value: String(G.stake) }));

  grid.appendChild(rightPane);
  panelEl.appendChild(grid);
}

function makeShipConfigScreen() {
  const screen = new Screen({
    id: 'ship-config',
    layout: 'modal',
    theme: 'default',
    title: 'ship readout',
    footer: () => `${bindHint('confirm', 'close')}   ${bindHint('cancel', 'close')}`,
    onCancel: () => { G.showShipConfig = false; },
  });

  screen.add(new Button({ label: 'close', onConfirm: () => { G.showShipConfig = false; } }));

  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';
    const readout = document.createElement('div');
    populateShipReadoutBody(readout);
    this._panelBody.appendChild(readout);
    for (const w of this.widgets) this._panelBody.appendChild(w.render());
  };

  return screen;
}

registerScreen('ship-config', makeShipConfigScreen);
