'use strict';

// =============================================================================
// Rebuild menus.
// Phase 1 (key 'rebuild'):       chassis selection.
// Phase 2 (key 'rebuild-config'): ship configurator (shared with equip flow).
//
// Banner above the panel: "ship destroyed".
// =============================================================================

function makeRebuildScreen() {
  if (!G.rebuildFlow) G.rebuildFlow = { phase: 'chassis', sel: 0 };
  const rf = G.rebuildFlow;

  const screen = new Screen({
    id: 'rebuild',
    layout: 'fullscreen',
    theme: 'warn',
    onCancel: null,    // no exit at chassis-select; quit-to-title is an explicit row
  });

  // ---- Custom DOM with an above-panel banner -----------------------------
  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme}`;
    el.dataset.screen = this.id;

    const banner = document.createElement('div');
    banner.className = 'panel-title';
    banner.style.fontSize = 'var(--fs-banner)';
    banner.style.marginBottom = '24px';
    banner.textContent = 'ship destroyed';
    el.appendChild(banner);

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.minWidth = '520px';

    const subtitle = document.createElement('div');
    subtitle.className = 'panel-subtitle';
    subtitle.textContent = 'select replacement hull';
    panel.appendChild(subtitle);

    const hr = document.createElement('hr'); hr.className = 'panel-divider'; panel.appendChild(hr);

    const body = document.createElement('div');
    body.className = 'panel-body';
    panel.appendChild(body);
    this._panelBody = body;

    const wallet = document.createElement('div');
    wallet.style.textAlign = 'center';
    wallet.style.fontSize = 'var(--fs-row-detail)';
    wallet.style.color = 'var(--text-strong)';
    wallet.style.padding = '8px 0 4px';
    panel.appendChild(wallet);
    this._walletEl = wallet;

    const seedRow = document.createElement('div');
    seedRow.style.textAlign = 'center';
    seedRow.style.fontSize = 'var(--fs-footer)';
    seedRow.style.color = 'var(--text-footer)';
    panel.appendChild(seedRow);
    this._seedEl = seedRow;

    el.appendChild(panel);
    this._el = el;
    return el;
  };

  // ---- Chassis selection rows --------------------------------------------
  const lch = licensedRebuildChassis();
  for (const ch of lch) {
    const cost = ch.buildPrice;
    screen.add(new Button({
      label: `${ch.name.toLowerCase()}   —   ${chassisStatsText(ch, { slots: false }).toLowerCase()}   hull: ${cost === 0 ? 'free' : cost + ' cr'}`,
      onConfirm: () => { ia(); openRebuildConfig(ch); },
    }));
  }
  screen.add(new Spacer({ size: 'sm' }));
  screen.add(new Button({
    label: `charity assistance   —   forfeit all credits & stake — default ship free`,
    onConfirm: () => { ia(); applyCharityRebuild(); },
  }));
  screen.add(new Spacer({ size: 'sm' }));
  screen.add(new Button({
    label: 'quit to title',
    onConfirm: () => {
      ia();
      G.rebuildFlow = null; G.ENC = null; G.site = null;
      openTitleMenu();
      saveGame();
    },
  }));

  // ---- Refresh wallet/seed every tick -----------------------------------
  const baseRefresh = screen.refresh.bind(screen);
  screen.refresh = function() {
    baseRefresh();
    if (this._walletEl) this._walletEl.textContent = `credits: ${G.credits}   ·   stake: ${G.stake}`;
    if (this._seedEl)   this._seedEl.textContent   = 'seed  ' + seedText(G.seed).toLowerCase();
  };
  screen.tick = function() { this.refresh(); };

  return screen;
}

registerScreen('rebuild', makeRebuildScreen);

// -----------------------------------------------------------------------------
// rebuild-config — phase 2; reuses ship configurator with rebuild-specific
// pricing and finalize behavior.
// -----------------------------------------------------------------------------

function makeRebuildConfigScreen() {
  return makeShipConfigurator({
    id: 'rebuild-config',
    theme: 'warn',
    flow: () => G.rebuildFlow,
    priceText: () => {
      const rf = G.rebuildFlow;
      if (!rf) return '';
      const cost = rebuildTotalCost(rf.chassisId, rf.shieldId);
      const ok = G.credits >= cost;
      return `cost: ${cost === 0 ? 'free' : cost + ' cr'}` + (ok ? '' : '   — insufficient credits');
    },
    confirmLabel: () => {
      const rf = G.rebuildFlow;
      if (!rf) return 'rebuild';
      const cost = rebuildTotalCost(rf.chassisId, rf.shieldId);
      return 'rebuild  ' + (cost === 0 ? 'free' : cost + ' cr');
    },
    onConfirm: () => {
      const rf = G.rebuildFlow;
      const ch = CHASSIS.find(c => c.id === rf.chassisId);
      if (!ch) { G.rebuildFlow = null; return; }
      finalizeRebuild(rf, ch);
    },
    onCancel: () => { G.rebuildFlow.phase = 'chassis'; },
  });
}

registerScreen('rebuild-config', makeRebuildConfigScreen);
