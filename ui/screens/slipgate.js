'use strict';

// =============================================================================
// Slipgate menu (purple theme).
// Three modes:
//   1. inactive — narrative dead-end while sectors not cleared
//   2. tutorial first-jump — yes/no confirmation
//   3. active — full-bleed SiteMap of neighboring systems (P5-01)
// =============================================================================

// Deterministic pseudo-distance for a (source, dest) seed pair. Symmetric.
function slipDistanceLy(a, b) {
  const lo = Math.min(a >>> 0, b >>> 0);
  const hi = Math.max(a >>> 0, b >>> 0);
  let h = (lo ^ 0x9E3779B1) >>> 0;
  h = (Math.imul(h ^ hi, 0x85EBCA6B)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return 1.0 + (h / 0xFFFFFFFF) * 3.0;
}

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

  // Mode 3 — full-bleed neighbor SiteMap.
  const nb = slipNeighborList();
  screen.subtitle = `${nb.length} neighboring system${nb.length === 1 ? '' : 's'} detected`;
  screen.footer = () => `${bindHint('directions', 'select')}   ${bindHint('confirm', 'jump')}   ${bindHint('cancel', 'leave')}`;

  let focusedSeed = nb.length ? (nb[0] >>> 0) : null;

  const siteMap = new SiteMap({
    mode: 'slipgate',
    nodes: () => nb.map(seed => ({
      id: seed >>> 0,
      kind: G.visitedSeeds.includes(seed) ? 'visited' : 'unknown',
      label: seedText(seed),
    })),
    get: () => focusedSeed,
    set: (id) => {
      if (id == null) return;
      focusedSeed = id >>> 0;
      syncInfoCard();
    },
    onConfirm: (seed) => {
      if (seed == null) return;
      ia();
      jumpToSeed(seed >>> 0, G.seed);
    },
  });

  let infoSeedEl = null;
  let infoBadgesEl = null;
  let infoDistEl = null;

  function syncInfoCard() {
    if (!infoSeedEl) return;
    if (focusedSeed == null) {
      infoSeedEl.textContent = '—';
      infoBadgesEl.innerHTML = '';
      infoDistEl.textContent = '—';
      return;
    }
    const seed = focusedSeed >>> 0;
    infoSeedEl.textContent = seedText(seed).toLowerCase();

    infoBadgesEl.innerHTML = '';
    const badges = [];
    badges.push(G.visitedSeeds.includes(seed) ? 'visited' : 'unknown');
    if (G.prevSeed != null && seed === (G.prevSeed >>> 0)) badges.push('← back');
    for (const b of badges) {
      const chip = document.createElement('span');
      chip.className = 'chip chip-strong';
      chip.textContent = b;
      infoBadgesEl.appendChild(chip);
    }

    infoDistEl.textContent = `${slipDistanceLy(G.seed, seed).toFixed(1)} ly`;
  }

  screen.add(siteMap);

  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';

    const panel = this._panelBody.parentElement;
    if (panel && panel.classList.contains('panel')) {
      panel.style.minWidth = '760px';
      panel.style.maxWidth = '980px';
    }

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 180px';
    grid.style.columnGap = 'var(--gap-loose, 16px)';
    grid.style.alignItems = 'start';
    grid.style.minHeight = '0';

    const mapPane = document.createElement('div');
    mapPane.style.width = '100%';
    mapPane.style.aspectRatio = '1 / 1';
    mapPane.style.minWidth = '0';
    mapPane.style.border = '1px solid var(--divider)';
    mapPane.style.padding = '6px';
    mapPane.appendChild(siteMap.render());

    const rail = document.createElement('div');
    rail.style.display = 'flex';
    rail.style.flexDirection = 'column';
    rail.style.gap = '6px';
    rail.style.minWidth = '0';

    const destLbl = document.createElement('div');
    destLbl.className = 'section-header';
    destLbl.textContent = 'destination';
    rail.appendChild(destLbl);

    infoSeedEl = document.createElement('div');
    infoSeedEl.style.fontFamily = 'var(--mono, monospace)';
    infoSeedEl.style.fontWeight = '700';
    infoSeedEl.style.color = 'var(--accent)';
    infoSeedEl.style.letterSpacing = '0.06em';
    rail.appendChild(infoSeedEl);

    infoBadgesEl = document.createElement('div');
    infoBadgesEl.style.display = 'flex';
    infoBadgesEl.style.flexWrap = 'wrap';
    infoBadgesEl.style.gap = '4px';
    rail.appendChild(infoBadgesEl);

    const distLbl = document.createElement('div');
    distLbl.className = 'section-header';
    distLbl.textContent = 'distance';
    rail.appendChild(distLbl);

    infoDistEl = document.createElement('div');
    infoDistEl.style.fontSize = 'var(--fs-row-detail)';
    infoDistEl.style.color = 'var(--text-strong)';
    rail.appendChild(infoDistEl);

    grid.appendChild(mapPane);
    grid.appendChild(rail);

    this._panelBody.appendChild(grid);

    syncInfoCard();
  };

  screen.handle = function(input) {
    if (input.cancel) { this.onCancel && this.onCancel(); return; }
    const consumed = siteMap.handle(input);
    if (consumed) this.refresh();
  };

  screen.tick = function() {
    if (this._footerEl && typeof this.footer === 'function') {
      const txt = this.footer();
      if (this._footerEl.textContent !== txt) {
        this._footerEl.textContent = txt || '';
        if (typeof shaderMarkUiDirty === 'function') shaderMarkUiDirty();
      }
    }
    siteMap.refresh && siteMap.refresh();
  };

  return screen;
}

registerScreen('slipgate', makeSlipgateScreen);
