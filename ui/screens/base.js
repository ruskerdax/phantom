'use strict';

// =============================================================================
// Friendly base screen.
//
// Structure (one screen, two sub-screens):
//   base            tabs + item list + detail panel
//     ↓ confirm on item
//   shop-action     overlay listing buy/equip choices
//     ↓ buy CHASSIS chooses a loadout
//   equip-config    ship configurator (separate factory)
//
// User has flagged this for a total rework later. The structure here is meant
// to make that easy: tab content is just a list of items, the detail panel is
// re-rendered from the focused item, and any new tab kind plugs in by adding
// a `renderTab` branch.
// =============================================================================

function baseTabsList() { return baseTabs().map(t => ({ id: t.id, label: t.label.toLowerCase() })); }

function makeBaseScreen() {
  const screen = new Screen({
    id: 'base',
    layout: 'modal',
    theme: 'info',
    title: 'friendly base',
    footer: () => `${UI_GLYPH_DOM.left}${UI_GLYPH_DOM.right} switch tab   enter select   ${pausePromptDOM('to leave')}`,
    onCancel: () => { returnToOverworld(); saveGame(); },
  });

  // ---- TabBar widget -------------------------------------------------------
  const tabBar = new TabBar({
    tabs: baseTabsList(),
    get: () => { const list = baseTabsList(); return (list[G.baseTab] || list[0]).id; },
    set: (id) => { const idx = baseTabsList().findIndex(t => t.id === id); if (idx >= 0) G.baseTab = idx; },
    onChange: () => {},
  });
  screen._tabBar = tabBar;

  // ---- Custom DOM ---------------------------------------------------------
  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme}`;
    el.dataset.screen = this.id;

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.minWidth = '540px';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = this.title;
    panel.appendChild(title);

    panel.appendChild(this._tabBar.render());

    const hr = document.createElement('hr'); hr.className = 'panel-divider'; panel.appendChild(hr);

    const body = document.createElement('div');
    body.className = 'panel-body';
    panel.appendChild(body);
    this._panelBody = body;

    const detail = document.createElement('div');
    detail.className = 'row-detail center-text';
    detail.style.minHeight = '46px';
    detail.style.padding = '8px 4px 0';
    detail.style.gridColumn = 'unset';
    panel.appendChild(detail);
    this._detailEl = detail;

    const wallet = document.createElement('div');
    wallet.style.textAlign = 'center';
    wallet.style.fontSize = 'var(--fs-row-detail)';
    wallet.style.color = 'var(--text-strong)';
    wallet.style.padding = '6px 0';
    panel.appendChild(wallet);
    this._walletEl = wallet;

    const footer = document.createElement('div');
    footer.className = 'panel-footer';
    panel.appendChild(footer);
    this._footerEl = footer;

    el.appendChild(panel);
    this._el = el;
    return el;
  };

  // ---- Build tab strip + item list ---------------------------------------
  function rebuildTabsAndItems() {
    // Widgets — rebuild list per tab.
    screen.widgets = [];
    const tabId = baseTabId();
    if (tabId === 'services') {
      const s = G.OW?.s; if (!s) return;
      const repairCost = baseRepairCost(s);
      screen.add(new Button({
        label: () => {
          const cost = baseRepairCost(s);
          if (s.hp >= s.maxHp) return 'repair hull   full';
          return 'repair hull   ' + cost + ' cr';
        },
        onConfirm: () => {
          const cost = baseRepairCost(s);
          if (s.hp >= s.maxHp || G.credits < cost) { tone(80, .1, 'square', .06); return; }
          G.credits -= cost; fillShipHull(s); tone(660, .2, 'sine', .08); saveGame();
        },
      }));
    } else {
      const items = shopItemsForTab(G.baseTab);
      for (const item of items) {
        screen.add(new Button({
          label: () => formatShopRow(item),
          onConfirm: () => { G.shopActionId = item.id; },
        }));
      }
    }
    screen.focusIdx = Math.min(screen.focusIdx, screen.widgets.length - 1);
  }

  function formatShopRow(item) {
    const owned = hasLicense(item.id), eq = isEquipped(item.id);
    const status = eq ? '★ equipped' : owned ? 'licensed' : creditLabel(itemLicensePrice(item));
    return `${item.name.toLowerCase()}   —   ${status.toLowerCase()}`;
  }

  function refreshDetailPanel() {
    const tabId = baseTabId();
    let detail = '', sub = '', cost = '';
    if (tabId === 'services') {
      detail = '';
    } else {
      const items = shopItemsForTab(G.baseTab);
      const item = items[Math.min(screen.focusIdx, items.length - 1)];
      if (item) {
        if (tabId === 'chassis')      detail = chassisStatsText(item);
        else if (tabId === 'weapons') detail = weaponStatsText(item);
        else if (tabId === 'shields') detail = shieldStatsText(item);
        sub = item.desc || '';
        if (!hasLicense(item.id))      cost = 'build: ' + itemBuildPrice(item) + ' cr (after license)';
        else if (!isEquipped(item.id)) cost = 'build cost: ' + itemBuildPrice(item) + ' cr';
      }
    }
    screen._detailEl.innerHTML =
      (detail ? `<div>${escapeHtml(detail.toLowerCase())}</div>` : '') +
      (sub    ? `<div class="muted">${escapeHtml(sub.toLowerCase())}</div>` : '') +
      (cost   ? `<div class="muted">${escapeHtml(cost.toLowerCase())}</div>` : '');
    screen._walletEl.textContent = 'credits: ' + G.credits + '   ·   stake: ' + G.stake;
  }

  // ---- Lifecycle ----------------------------------------------------------
  screen.populateBody = function() {
    rebuildTabsAndItems();
    if (this._panelBody) {
      this._panelBody.innerHTML = '';
      for (const w of this.widgets) this._panelBody.appendChild(w.render());
    }
  };

  // Override refresh so we can rebuild the panel when the tab changes.
  let _lastTab = -1;
  const baseRefresh = screen.refresh.bind(screen);
  screen.refresh = function() {
    if (G.baseTab !== _lastTab) {
      _lastTab = G.baseTab;
      this.populateBody();
    }
    this._tabBar.refresh();
    baseRefresh();
    refreshDetailPanel();
  };

  // ---- Input: tab switching at the screen level --------------------------
  const baseHandle = screen.handle.bind(screen);
  screen.handle = function(input) {
    if (input.left || input.right) {
      this._tabBar.handle(input);
      this.focusIdx = 0;
      this.refresh();
      return;
    }
    baseHandle(input);
  };

  screen.tick = function() { this.refresh(); };

  return screen;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

registerScreen('base', makeBaseScreen);

// =============================================================================
// Shop-action overlay — modal sub-screen with buy/equip options for one item.
// =============================================================================

function makeShopActionScreen() {
  const items = shopItemsForTab(G.baseTab);
  const item = items.find(it => it.id === G.shopActionId);

  const screen = new Screen({
    id: 'shop-action',
    layout: 'modal',
    theme: 'info',
    title: item ? item.name.toLowerCase() : 'item',
    onCancel: () => { G.shopActionId = null; },
  });

  if (!item) { screen.handle = () => { G.shopActionId = null; }; return screen; }

  const opts = shopActionOpts(item);
  for (const opt of opts) {
    screen.add(new Button({
      label: opt.label.toLowerCase(),
      disabled: opt.disabled,
      onConfirm: () => execShopAction(opt),
    }));
  }

  return screen;
}

registerScreen('shop-action', makeShopActionScreen);
