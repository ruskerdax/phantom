'use strict';

// =============================================================================
// System Map submenu (P4-02).
// Opened from pause (G.systemMapOpen). Left pane is a SiteMap radar of in-system
// sites; right pane shows BodySummaryPanel for the focused node, plus a moon
// sub-list when a planet with moons is focused. News ticker at the bottom.
//
// Focus zones:
//   'map'  — SiteMap consumes ←/↑/↓; Right enters the moon sub-list (when the
//            focused node is a planet with moons). Confirm opens body-info in
//            'inspect' mode for body / asteroid / HBASE nodes.
//   'list' — Up/Down move through the moon sub-list (row 0 is the parent
//            planet). Left returns to the map. Confirm swaps the BSP siteRef
//            to the highlighted row (no popup).
// =============================================================================

function _smInit() {
  G.systemMap = G.systemMap || {};
  if (G.systemMap.focusedSiteId == null) G.systemMap.focusedSiteId = null;
  if (G.systemMap.focusZone !== 'map' && G.systemMap.focusZone !== 'list') G.systemMap.focusZone = 'map';
  if (!Number.isInteger(G.systemMap.moonRowIdx)) G.systemMap.moonRowIdx = 0;
}

function _smCurrentDockedNodeId() {
  if (typeof G.lvBodyId === 'string' && G.lvBodyId) {
    const body = typeof bodyById === 'function' ? bodyById(G.lvBodyId) : null;
    if (body) {
      if (body.parentId && body.parentId !== 'star') return `body:${body.parentId}`;
      return `body:${body.id}`;
    }
  }
  const loc = G.lastLocation;
  if (!loc) return null;
  if (loc.kind === 'base') return 'base';
  if (loc.kind === 'slipgate') return 'slipgate';
  if (loc.kind === 'hbase') return 'hbase';
  if (loc.kind === 'body' && loc.bodyId) {
    const body = typeof bodyById === 'function' ? bodyById(loc.bodyId) : null;
    if (body && body.parentId && body.parentId !== 'star') return `body:${body.parentId}`;
    return `body:${loc.bodyId}`;
  }
  if (loc.kind === 'asteroid' && loc.bodyId && typeof asteroidIndexFromBodyId === 'function') {
    const ai = asteroidIndexFromBodyId(loc.bodyId);
    if (ai != null) return `asteroid:${ai}`;
  }
  return null;
}

function _smPlayerPos() {
  const s = G.OW?.s;
  if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return null;
  return {
    x: (s.x - OW_W / 2) / (OW_W / 2),
    y: (s.y - OW_H / 2) / (OW_H / 2),
    angle: Number.isFinite(s.a) ? s.a : 0,
  };
}

function systemMapNodes() {
  const nodes = [];
  const halfW = OW_W / 2;
  const halfH = OW_H / 2;

  if (Array.isArray(BODIES)) {
    for (const b of BODIES) {
      if (!b || b.kind === 'star') continue;
      if (b.parentId !== 'star') continue; // moons appear in the right-side sub-list
      const p = typeof bodyOWPos === 'function' ? bodyOWPos(b) : { x: halfW, y: halfH };
      nodes.push({
        id: `body:${b.id}`,
        x: Math.max(-1, Math.min(1, (p.x - halfW) / halfW)),
        y: Math.max(-1, Math.min(1, (p.y - halfH) / halfH)),
        kind: b.kind,
        label: b.id,
      });
    }
  }
  if (Array.isArray(AB)) {
    for (let i = 0; i < AB.length; i++) {
      const p = typeof owPos === 'function' ? owPos(AB[i]) : { x: halfW, y: halfH };
      nodes.push({
        id: `asteroid:${i}`,
        x: Math.max(-1, Math.min(1, (p.x - halfW) / halfW)),
        y: Math.max(-1, Math.min(1, (p.y - halfH) / halfH)),
        kind: 'asteroid',
        label: `a${i}`,
      });
    }
  }
  if (HBASE) {
    const p = typeof owPos === 'function' ? owPos(HBASE) : { x: halfW, y: halfH };
    nodes.push({
      id: 'hbase',
      x: Math.max(-1, Math.min(1, (p.x - halfW) / halfW)),
      y: Math.max(-1, Math.min(1, (p.y - halfH) / halfH)),
      kind: 'hbase',
      label: 'hbase',
    });
  }
  if (BASE) {
    const p = typeof owPos === 'function' ? owPos(BASE) : { x: halfW, y: halfH };
    nodes.push({
      id: 'base',
      x: Math.max(-1, Math.min(1, (p.x - halfW) / halfW)),
      y: Math.max(-1, Math.min(1, (p.y - halfH) / halfH)),
      kind: 'base',
      label: 'base',
    });
  }
  if (SLIPGATE) {
    const p = typeof owPos === 'function' ? owPos(SLIPGATE) : { x: halfW, y: halfH };
    nodes.push({
      id: 'slipgate',
      x: Math.max(-1, Math.min(1, (p.x - halfW) / halfW)),
      y: Math.max(-1, Math.min(1, (p.y - halfH) / halfH)),
      kind: 'slipgate',
      label: 'slipgate',
    });
  }

  const currentId = _smCurrentDockedNodeId();
  if (currentId) {
    for (const n of nodes) if (n.id === currentId) n.isCurrent = true;
  }
  return nodes;
}

function _smFocusedNodeRecord() {
  const id = G.systemMap?.focusedSiteId;
  if (!id) return null;
  for (const n of systemMapNodes()) if (n.id === id) return n;
  return null;
}

function _smFocusedBody() {
  const id = G.systemMap?.focusedSiteId || '';
  if (!id.startsWith('body:')) return null;
  return typeof bodyById === 'function' ? bodyById(id.slice(5)) : null;
}

function _smFocusedPlanetMoons() {
  const body = _smFocusedBody();
  if (!body) return [];
  if (body.kind !== 'habitable' && body.kind !== 'uninhabitable') return [];
  if (body.parentId !== 'star') return [];
  const moons = (typeof planetsOf === 'function') ? planetsOf(body.id) : BODIES.filter(b => b.parentId === body.id);
  return moons.slice().sort((a, b) => (a.orbit?.r || 0) - (b.orbit?.r || 0));
}

function _smSiteRefForNode(node) {
  if (!node) return null;
  const id = node.id;
  if (id.startsWith('body:')) {
    const body = bodyById(id.slice(5));
    return body ? { kind: 'body', body } : null;
  }
  if (id.startsWith('asteroid:')) {
    const idx = Number(id.slice(9));
    return Number.isInteger(idx) ? { kind: 'asteroid', idx } : null;
  }
  if (id === 'hbase') return { kind: 'hbase' };
  if (id === 'base') return { kind: 'base' };
  if (id === 'slipgate') return { kind: 'slipgate' };
  return null;
}

// Exposed: mounts body-info in 'inspect' mode for a SiteMap node id.
// BASE / SLIPGATE are no-ops (those are direct-interact in the overworld).
function openBodyInfoInspect(nodeId) {
  if (!nodeId) return;
  if (nodeId === 'base' || nodeId === 'slipgate') return;
  let siteRef = null;
  if (nodeId.startsWith('body:')) {
    const body = typeof bodyById === 'function' ? bodyById(nodeId.slice(5)) : null;
    if (!body) return;
    siteRef = { kind: 'body', body };
  } else if (nodeId.startsWith('asteroid:')) {
    const idx = Number(nodeId.slice(9));
    if (!Number.isInteger(idx)) return;
    siteRef = { kind: 'asteroid', idx };
  } else if (nodeId === 'hbase') {
    siteRef = { kind: 'hbase' };
  }
  if (!siteRef) return;
  if (typeof openBodyInfo === 'function') openBodyInfo(siteRef, 'inspect');
}

function makeSystemMapScreen() {
  _smInit();

  const seedHex = (typeof seedText === 'function') ? seedText(G.seed) : String(G.seed >>> 0);
  const screen = new Screen({
    id: 'system-map',
    layout: 'modal',
    theme: 'default',
    title: `system view · ${seedHex}`,
    footer: () => `${bindHint('directions', 'select')}   ${bindHint('confirm', 'inspect')}   ${bindHint('cancel', 'back')}`,
    onCancel: () => { G.systemMapOpen = false; },
  });

  // ----- Site map widget -----
  const siteMap = new SiteMap({
    mode: 'system',
    nodes: () => systemMapNodes(),
    get: () => {
      // Initialize / re-validate focused id (handles jumps between systems).
      const nodes = systemMapNodes();
      if (G.systemMap.focusedSiteId == null
          || !nodes.some(n => n.id === G.systemMap.focusedSiteId)) {
        const current = nodes.find(n => n.isCurrent);
        G.systemMap.focusedSiteId = current ? current.id : (nodes[0]?.id || null);
      }
      return G.systemMap.focusedSiteId;
    },
    set: (id) => {
      if (G.systemMap.focusedSiteId !== id) {
        G.systemMap.focusedSiteId = id;
        G.systemMap.moonRowIdx = 0;
        syncRightPane();
      }
    },
    onConfirm: (id) => openBodyInfoInspect(id),
    playerPos: () => _smPlayerPos(),
  });

  // ----- Body summary panel + moon sub-list -----
  const bsp = new BodySummaryPanel({ siteRef: null, layout: 'inspect' });
  let moonListEl = null;
  let moonRowEls = [];

  function focusedPlanetMoonsCached() { return _smFocusedPlanetMoons(); }

  let moonHeaderEl = null;

  function rebuildMoonList() {
    if (!moonListEl) return;
    moonListEl.innerHTML = '';
    moonRowEls = [];
    moonHeaderEl = null;
    const body = _smFocusedBody();
    const moons = focusedPlanetMoonsCached();
    if (!body || moons.length === 0) {
      moonListEl.classList.add('hidden');
      return;
    }
    moonListEl.classList.remove('hidden');

    moonHeaderEl = document.createElement('div');
    moonHeaderEl.className = 'system-map-moon-header';
    moonListEl.appendChild(moonHeaderEl);
    updateMoonHeader();

    const parentRow = document.createElement('div');
    parentRow.className = 'system-map-moon-row';
    parentRow.textContent = `↑ ${body.id}`;
    moonListEl.appendChild(parentRow);
    moonRowEls.push({ el: parentRow, body });

    for (const moon of moons) {
      const row = document.createElement('div');
      row.className = 'system-map-moon-row';
      row.textContent = BodySummaryPanel.bodySummaryRowText(moon);
      moonListEl.appendChild(row);
      moonRowEls.push({ el: row, body: moon });
    }
  }

  function updateMoonHeader() {
    if (!moonHeaderEl) return;
    const count = Math.max(0, moonRowEls.length - 1); // exclude parent row
    const hint = G.systemMap.focusZone === 'list'
      ? '← back to map'
      : '→ navigate';
    moonHeaderEl.innerHTML = '';
    const lbl = document.createElement('span');
    lbl.className = 'system-map-moon-header-label';
    lbl.textContent = `moons (${count})`;
    const hintEl = document.createElement('span');
    hintEl.className = 'system-map-moon-header-hint';
    hintEl.textContent = hint;
    moonHeaderEl.appendChild(lbl);
    moonHeaderEl.appendChild(hintEl);
  }

  function refreshMoonRowFocus() {
    const inList = G.systemMap.focusZone === 'list';
    const idx = G.systemMap.moonRowIdx | 0;
    for (let i = 0; i < moonRowEls.length; i++) {
      moonRowEls[i].el.classList.toggle('is-focused', inList && i === idx);
    }
    updateMoonHeader();
  }

  function bspSiteRefForList() {
    const idx = G.systemMap.moonRowIdx | 0;
    const entry = moonRowEls[idx];
    if (!entry || !entry.body) return null;
    return { kind: 'body', body: entry.body };
  }

  function syncRightPane() {
    const node = _smFocusedNodeRecord();
    const ref = _smSiteRefForNode(node);
    bsp.setSiteRef(ref);
    rebuildMoonList();
    // If we lost the focus zone's context (e.g. moved to a node with no moons),
    // snap back to 'map' mode.
    if (G.systemMap.focusZone === 'list' && moonRowEls.length === 0) {
      G.systemMap.focusZone = 'map';
    }
    refreshMoonRowFocus();
  }

  // ----- News ticker -----
  const ticker = new NewsTicker({
    items: () => (G.system?.events || []).map(e => e.text),
  });

  // ----- Body layout -----
  screen.add(siteMap);

  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';

    const panel = this._panelBody.parentElement;
    if (panel && panel.classList.contains('panel')) {
      panel.style.minWidth = '760px';
      panel.style.maxWidth = '980px';
    }

    const wrap = document.createElement('div');
    wrap.className = 'system-map-wrap';

    const grid = document.createElement('div');
    grid.className = 'system-map-grid';

    const mapPane = document.createElement('div');
    mapPane.className = 'system-map-pane-map';
    mapPane.appendChild(siteMap.render());

    const infoPane = document.createElement('div');
    infoPane.className = 'system-map-pane-info';
    infoPane.appendChild(bsp.render());
    moonListEl = document.createElement('div');
    moonListEl.className = 'system-map-moon-list';
    infoPane.appendChild(moonListEl);

    grid.appendChild(mapPane);
    grid.appendChild(infoPane);

    wrap.appendChild(grid);
    wrap.appendChild(ticker.render());

    this._panelBody.appendChild(wrap);

    // Seed focused id and right pane.
    siteMap.get();
    syncRightPane();
  };

  // ----- Input handling override -----
  screen.handle = function(input) {
    if (input.cancel) { this.onCancel && this.onCancel(); return; }

    const zone = G.systemMap.focusZone;

    if (zone === 'list') {
      const total = moonRowEls.length;
      if (total === 0) { G.systemMap.focusZone = 'map'; refreshMoonRowFocus(); return; }
      if (input.left) {
        G.systemMap.focusZone = 'map';
        refreshMoonRowFocus();
        return;
      }
      if (input.up) {
        if (G.systemMap.moonRowIdx > 0) {
          G.systemMap.moonRowIdx--;
          refreshMoonRowFocus();
        }
        return;
      }
      if (input.down) {
        if (G.systemMap.moonRowIdx < total - 1) {
          G.systemMap.moonRowIdx++;
          refreshMoonRowFocus();
        }
        return;
      }
      if (input.confirm) {
        const ref = bspSiteRefForList();
        if (ref) bsp.setSiteRef(ref);
        return;
      }
      return;
    }

    // zone === 'map'
    if (input.right) {
      const body = _smFocusedBody();
      if (body && (body.kind === 'habitable' || body.kind === 'uninhabitable')
          && body.parentId === 'star' && focusedPlanetMoonsCached().length > 0) {
        G.systemMap.focusZone = 'list';
        G.systemMap.moonRowIdx = 0;
        // Ensure the moon list reflects the current focused planet before we
        // hand input to it (the map → list transition is rare enough to do
        // this defensively even if syncRightPane was already called).
        rebuildMoonList();
        const ref = bspSiteRefForList();
        if (ref) bsp.setSiteRef(ref);
        refreshMoonRowFocus();
        return;
      }
    }

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
    bsp.refresh && bsp.refresh();
    if (ticker.refresh) ticker.refresh();
  };

  return screen;
}

registerScreen('system-map', makeSystemMapScreen);
