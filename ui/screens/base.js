'use strict';

// =============================================================================
// Friendly base screen (P3-01 shell).
//
// Structure:
//   - Header: lbl 'friendly base' + system seed title (left); credits / stake /
//     hull chips (right).
//   - TabBar (focusable): services · shop · refit.
//   - Body: per-tab content. Services has the repair-hull button. Shop and
//     refit bodies are populated by P3-03 / P3-04 — placeholder for now.
//   - News ticker: bottom of panel, reads G.system.events; auto-hides when
//     empty.
// =============================================================================

function baseTabsList() { return baseTabs().map(t => ({ id: t.id, label: t.label.toLowerCase() })); }

function makeBaseScreen() {
  const screen = new Screen({
    id: 'base',
    layout: 'modal',
    theme: 'info',
    footer: () => [
      bindHint('left/right', 'tab'),
      bindHint('up/down', 'select'),
      bindHint('confirm', 'open'),
      bindHint('cancel', 'leave'),
    ].join('   '),
    onCancel: () => { returnToOverworld(); saveGame(); },
  });

  const tabBar = new TabBar({
    tabs: baseTabsList(),
    get: () => G.baseTab,
    set: (id) => { G.baseTab = id; },
    onChange: () => { screen.populateBody(); screen.refresh(); },
  });
  screen._tabBar = tabBar;

  const ticker = new NewsTicker({
    items: () => (G.system?.events || []).map(e => e.text),
  });
  screen._ticker = ticker;

  screen.buildDOM = function() {
    const el = document.createElement('div');
    el.className = `screen ${this.layout} theme-${this.theme}`;
    el.dataset.screen = this.id;

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.minWidth = '540px';

    const header = document.createElement('div');
    header.className = 'base-header';
    const headerL = document.createElement('div');
    headerL.className = 'base-header-left';
    const lbl = document.createElement('div');
    lbl.className = 'base-header-lbl';
    lbl.textContent = 'friendly base';
    const titleEl = document.createElement('div');
    titleEl.className = 'base-header-title';
    titleEl.textContent = 'system ' + seedText(G.seed);
    headerL.appendChild(lbl);
    headerL.appendChild(titleEl);
    header.appendChild(headerL);
    const chips = document.createElement('div');
    chips.className = 'base-header-chips';
    header.appendChild(chips);
    this._chipsEl = chips;
    panel.appendChild(header);

    panel.appendChild(tabBar.render());

    const hr = document.createElement('hr'); hr.className = 'panel-divider'; panel.appendChild(hr);

    const body = document.createElement('div');
    body.className = 'panel-body';
    panel.appendChild(body);
    this._panelBody = body;

    panel.appendChild(ticker.render());

    const footer = document.createElement('div');
    footer.className = 'panel-footer';
    panel.appendChild(footer);
    this._footerEl = footer;

    el.appendChild(panel);
    this._el = el;
    return el;
  };

  function chipsHTML() {
    const s = G.OW?.s;
    const hullPct = (s && s.maxHp > 0) ? Math.round(100 * s.hp / s.maxHp) : 0;
    return `<span class="chip chip-strong">cr ${G.credits}</span>` +
           `<span class="chip">stake ${G.stake}</span>` +
           `<span class="chip">hull ${hullPct}%</span>`;
  }

  screen.populateBody = function() {
    // widgets[0] = tabBar (focusable, rendered in header).
    // widgets[1..] = body widgets for the active tab.
    // ticker is rendered outside this list (in buildDOM) but appended last so
    // its refresh() runs each frame.
    this.widgets = [tabBar];
    const tabId = baseTabId();
    if (tabId === 'services') {
      const s = G.OW?.s;
      if (s) {
        this.add(new Button({
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
      }
    }
    // shop / refit body content is owned by P3-03 / P3-04.

    this.widgets.push(ticker);

    this.focusIdx = Math.max(0, Math.min(this.widgets.length - 1, this.focusIdx));

    if (this._panelBody) {
      this._panelBody.innerHTML = '';
      for (let i = 1; i < this.widgets.length - 1; i++) {
        this._panelBody.appendChild(this.widgets[i].render());
      }
    }
  };

  const baseRefresh = screen.refresh.bind(screen);
  screen.refresh = function() {
    baseRefresh();
    if (this._chipsEl) this._chipsEl.innerHTML = chipsHTML();
  };

  screen.tick = function() { this.refresh(); };

  return screen;
}

registerScreen('base', makeBaseScreen);

// =============================================================================
// Shop-action overlay — modal sub-screen with buy/equip options for one item.
// (Will be deleted in P3-03 when the shop tab embeds its own buy+equip flow.)
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
