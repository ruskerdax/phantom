'use strict';

// =============================================================================
// Friendly base screen.
//
// Structure:
//   - Header: lbl 'friendly base' + system seed title (left); credits / stake /
//     hull chips (right).
//   - TabBar (focusable): services · shop · refit.
//   - Body: per-tab content. Services (P3-02) shows the repair-hull row.
//     Shop (P3-03) shows category pills + item list + stat-compare detail.
//     Refit body is populated by P3-04.
//   - News ticker: bottom of panel, reads G.system.events; auto-hides when
//     empty.
// =============================================================================

const SHOP_CATEGORIES = [
  { id: 'chassis', label: 'chassis' },
  { id: 'weapons', label: 'weapons' },
  { id: 'shields', label: 'shields' },
];

function baseTabsList() { return baseTabs().map(t => ({ id: t.id, label: t.label.toLowerCase() })); }

function shopItemLockReason(_item) { return null; }

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
    // widgets[1..] = body widgets for the active tab (focusable rows first,
    // followed by any non-focusable display widgets — order only matters for
    // refresh() iteration, not navigation).
    // ticker is rendered outside this list (in buildDOM) but appended last so
    // its refresh() runs each frame.
    this.widgets = [tabBar];
    this._serviceUpdaters = [];
    this._shopUpdate = null;
    this._refitUpdate = null;
    this._refitPicker = null;
    this._flashMsg = null;
    this._flashUntil = 0;

    if (this._panelBody) this._panelBody.innerHTML = '';

    const tabId = baseTabId();
    if (tabId === 'services') {
      this._populateServices();
    } else if (tabId === 'shop') {
      this._populateShop();
    } else if (tabId === 'refit') {
      this._populateRefit();
    }

    this.widgets.push(ticker);

    this.focusIdx = Math.max(0, Math.min(this.widgets.length - 1, this.focusIdx));

    // Fallback render for tabs that didn't take over panel-body themselves.
    if (this._panelBody && tabId !== 'services' && tabId !== 'shop' && tabId !== 'refit') {
      for (let i = 1; i < this.widgets.length - 1; i++) {
        this._panelBody.appendChild(this.widgets[i].render());
      }
    }
  };

  screen._populateServices = function() {
    const s = G.OW?.s;
    if (!s || !this._panelBody) return;

    const split = document.createElement('div');
    split.className = 'base-services';
    split.style.display = 'grid';
    split.style.gridTemplateColumns = '240px 1fr';
    split.style.columnGap = '16px';
    split.style.alignItems = 'start';
    split.style.minHeight = '0';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '4px';
    left.style.paddingRight = '12px';
    left.style.borderRight = '1px solid var(--divider)';

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '4px';

    split.appendChild(left);
    split.appendChild(right);
    this._panelBody.appendChild(split);

    const tryRepair = () => {
      const cost = baseRepairCost(s);
      if (s.hp >= s.maxHp || G.credits < cost) { tone(80, .1, 'square', .06); return; }
      G.credits -= cost; fillShipHull(s); tone(660, .2, 'sine', .08); saveGame();
    };

    const repairCanonicalLabel = 'repair hull';
    const repairValue = () => (s.hp >= s.maxHp ? 'full' : baseRepairCost(s) + ' cr');
    const repairDisabled = () => {
      const cost = baseRepairCost(s);
      return s.hp >= s.maxHp || G.credits < cost;
    };

    const serviceBtn = new Button({
      center: false,
      label: repairCanonicalLabel,
      value: repairValue,
      onConfirm: tryRepair,
    });

    const aboutHdr = new SectionHeader({ label: 'about' });
    const desc = new TextRow({
      text: 'restore your ship\'s hull to full integrity at the local shipyard.',
      align: 'left',
      size: 'sm',
      color: 'var(--text-faint)',
    });

    const curHullRow = new KeyValueRow({ label: 'current hull', value: () => String(Math.round(s.hp)) });
    const maxHullRow = new KeyValueRow({ label: 'max hull', value: () => String(Math.round(s.maxHp)) });
    const costRow = new KeyValueRow({ label: 'cost', value: repairValue });

    const actionHdr = new SectionHeader({ label: 'action' });
    const actionBtn = new Button({
      label: () => (s.hp >= s.maxHp ? 'repair · full' : 'repair · ' + baseRepairCost(s) + ' cr'),
      onConfirm: tryRepair,
    });

    left.appendChild(serviceBtn.render());

    right.appendChild(aboutHdr.render());
    right.appendChild(desc.render());
    right.appendChild(curHullRow.render());
    right.appendChild(maxHullRow.render());
    right.appendChild(costRow.render());
    right.appendChild(actionHdr.render());
    right.appendChild(actionBtn.render());

    // Focusable widgets first (focus navigation order: tabBar → service row → action button).
    this.widgets.push(serviceBtn);
    this.widgets.push(actionBtn);
    // Non-focusable widgets tracked for refresh() iteration.
    this.widgets.push(aboutHdr, desc, curHullRow, maxHullRow, costRow, actionHdr);

    this._serviceUpdaters.push(() => {
      const d = repairDisabled();
      serviceBtn.setDisabled(d);
      actionBtn.setDisabled(d);
    });
    this._serviceUpdaters[0]();
  };

  // ===========================================================================
  // Refit tab (P3-04): embeds the P2-02 configurator inline with deferred-cost.
  //   - flow.original snapshotted on first refit-tab visit (preserved across
  //     in-base tab switches; cleared when the base screen unmounts).
  //   - Confirm: debit diff cost and apply to G.loadout. No chassis change.
  //   - Back button: discard flow and re-snapshot from current G.loadout.
  // ===========================================================================
  screen._populateRefit = function() {
    if (!this._panelBody) return;

    if (!this._refitFlow) {
      this._refitFlow = {
        chassisId: G.loadout.chassis,
        slots: [...(G.loadout.weapons || [])],
        shieldId: G.loadout.shield ?? null,
        original: {
          chassisId: G.loadout.chassis,
          slots: [...(G.loadout.weapons || [])],
          shieldId: G.loadout.shield ?? null,
        },
        warnShown: false,
      };
    }
    const flow = this._refitFlow;
    const flowCost = () => equipFlowCost(flow);

    const picker = new SlotPicker({
      getSlots: () => {
        const c = CHASSIS.find(x => x.id === flow.chassisId);
        return c?.slots || [];
      },
      getChoicesForSlot: (slotIdx) => {
        const c = CHASSIS.find(x => x.id === flow.chassisId);
        const sl = c?.slots?.[slotIdx];
        if (!sl) return [];
        return [null, ...licensedWeaponsForSlot(sl).map(w => w.id)];
      },
      getCurrent: (slotIdx) => flow.slots[slotIdx] ?? null,
      setCurrent: (slotIdx, id) => { flow.slots[slotIdx] = id; },
    });

    const shieldCycle = new Cycle({
      label: 'shield',
      values: () => [null, ...SHIELDS.filter(s => hasLicense(s.id)).map(s => s.id)],
      get: () => flow.shieldId ?? null,
      set: v => { flow.shieldId = v; },
      format: v => {
        if (v == null) return '(none)';
        const sh = SHIELDS.find(s => s.id === v);
        return (sh ? sh.name : v).toLowerCase();
      },
    });

    const confirmBtn = new Button({
      label: () => 'confirm · ' + creditLabel(flowCost()),
      onConfirm: () => {
        const cost = flowCost();
        if (G.credits < cost) { tone(80, .1, 'square', .06); return; }
        const hasWeapon = flow.slots.some(s => s !== null);
        if (!hasWeapon && !flow.warnShown) { flow.warnShown = true; return; }
        const ch = CHASSIS.find(c => c.id === flow.chassisId);
        G.credits -= cost;
        G.loadout.weapons = [...flow.slots];
        G.loadout.shield = flow.shieldId;
        if (ch) {
          while (G.loadout.weapons.length < ch.slots.length) G.loadout.weapons.push(null);
          G.loadout.weapons = G.loadout.weapons.slice(0, ch.slots.length);
        }
        const s = G.OW?.s;
        if (s) { resetShipShield(s); refillAmmoForLoadout(s); }
        flow.original = {
          chassisId: flow.chassisId,
          slots: [...flow.slots],
          shieldId: flow.shieldId,
        };
        flow.warnShown = false;
        saveGame();
        tone(660, .2, 'sine', .08);
      },
    });

    const backBtn = new Button({
      label: 'back',
      onConfirm: () => {
        screen._refitFlow = null;
        screen.focusIdx = 0;
        screen.populateBody();
        screen.refresh();
      },
    });

    const warnRow = new TextRow({
      text: () => flow.warnShown ? 'warning: no weapons equipped!' : '',
      color: 'var(--accent-warn)',
      align: 'center',
      size: 'sm',
    });
    warnRow.focusable = false;

    const diagram = new ShipDiagram({
      chassisId: flow.chassisId,
      loadout: { weapons: flow.slots, shield: flow.shieldId },
      focusedSlotId: 0,
    });

    const grid = document.createElement('div');
    grid.className = 'ship-configurator-grid';
    const leftPane = document.createElement('div');
    leftPane.className = 'ship-configurator-diagram';
    leftPane.appendChild(diagram.render());
    const rightPane = document.createElement('div');
    rightPane.className = 'ship-configurator-info';
    rightPane.appendChild(picker.render());
    grid.appendChild(leftPane);
    grid.appendChild(rightPane);
    this._panelBody.appendChild(grid);
    this._panelBody.appendChild(shieldCycle.render());
    this._panelBody.appendChild(confirmBtn.render());
    this._panelBody.appendChild(backBtn.render());
    this._panelBody.appendChild(warnRow.render());

    this.widgets.push(picker, shieldCycle, confirmBtn, backBtn, warnRow);

    this._refitPicker = picker;
    this._refitUpdate = () => {
      const curCh = CHASSIS.find(c => c.id === flow.chassisId);
      if (curCh) diagram.chassisId = curCh.id;
      diagram.setLoadout({ weapons: flow.slots, shield: flow.shieldId });
      diagram.setFocusedSlotId(picker.slotIdx);
      confirmBtn.setDisabled(G.credits < flowCost());
    };
    this._refitUpdate();
  };

  // ===========================================================================
  // Shop tab (P3-03): category pills + item list left, detail/compare right.
  // ===========================================================================
  screen._populateShop = function() {
    if (!this._panelBody) return;

    if (typeof this.shopCat !== 'string' || !SHOP_CATEGORIES.some(c => c.id === this.shopCat)) {
      this.shopCat = 'chassis';
    }

    const items = shopItemsForTab(this.shopCat);
    if (!items.find(it => it.id === this.shopItemId)) {
      this.shopItemId = items[0]?.id ?? null;
    }
    this._shopItems = items;

    const split = document.createElement('div');
    split.className = 'base-shop';
    split.style.display = 'grid';
    split.style.gridTemplateColumns = '240px 1fr';
    split.style.columnGap = '16px';
    split.style.alignItems = 'start';
    split.style.minHeight = '0';

    const left = document.createElement('div');
    left.className = 'base-shop-left';
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '6px';
    left.style.paddingRight = '12px';
    left.style.borderRight = '1px solid var(--divider)';

    const right = document.createElement('div');
    right.className = 'base-shop-right';
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '6px';

    split.appendChild(left);
    split.appendChild(right);
    this._panelBody.appendChild(split);

    // ----- Category pill row -------------------------------------------------
    const catBar = new TabBar({
      tabs: SHOP_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
      get: () => this.shopCat,
      set: (id) => { this.shopCat = id; this.shopItemId = null; this._shopTargetSlot = null; },
      onChange: () => { this.populateBody(); this.refresh(); },
    });
    this.widgets.push(catBar);
    left.appendChild(catBar.render());

    // ----- Item list ---------------------------------------------------------
    const listEl = document.createElement('div');
    listEl.className = 'shop-item-list';
    left.appendChild(listEl);

    const itemBtns = [];
    for (const item of items) {
      const lockReason = shopItemLockReason(item);
      const btn = new Button({
        center: false,
        label: (item.name || item.id).toLowerCase(),
        value: () => shopItemRowValue(item),
        onConfirm: () => this._shopConfirmItem(item, lockReason),
      });
      btn._shopItemId = item.id;
      btn._shopLocked = !!lockReason;
      btn._shopLockReason = lockReason || '';
      this.widgets.push(btn);
      const btnEl = btn.render();
      if (lockReason) btnEl.classList.add('is-locked');
      listEl.appendChild(btnEl);
      itemBtns.push(btn);
    }
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'shop-item-empty';
      empty.textContent = '(none available)';
      empty.style.color = 'var(--text-faint)';
      empty.style.padding = '6px 8px';
      listEl.appendChild(empty);
    }

    // ----- Right pane: title row + chip --------------------------------------
    const titleRow = document.createElement('div');
    titleRow.className = 'shop-detail-title';
    const titleName = document.createElement('div');
    titleName.className = 'shop-detail-name';
    const titleChip = document.createElement('span');
    titleChip.className = 'chip chip-good';
    titleChip.textContent = 'licensed';
    titleRow.appendChild(titleName);
    titleRow.appendChild(titleChip);
    right.appendChild(titleRow);

    // ----- Preview placeholder ----------------------------------------------
    const phEl = document.createElement('div');
    phEl.className = 'ph shop-detail-preview';
    right.appendChild(phEl);

    // ----- Stat compare section --------------------------------------------
    const compareHdr = new SectionHeader({ label: 'stat compare · current ▶ candidate' });
    this.widgets.push(compareHdr);
    right.appendChild(compareHdr.render());

    const compareEl = document.createElement('div');
    compareEl.className = 'shop-detail-compare';
    right.appendChild(compareEl);

    // ----- Cost row ---------------------------------------------------------
    const costRow = document.createElement('div');
    costRow.className = 'shop-detail-cost';
    const costLabel = document.createElement('span');
    costLabel.className = 'shop-cost-label';
    const costChip = document.createElement('span');
    costChip.className = 'chip';
    costRow.appendChild(costLabel);
    costRow.appendChild(costChip);
    right.appendChild(costRow);

    // ----- Action row (cycle + buttons) -------------------------------------
    const actionRow = document.createElement('div');
    actionRow.className = 'shop-detail-action';
    right.appendChild(actionRow);

    const slotCycle = new Cycle({
      label: 'target slot',
      values: () => this._shopSlotCycleValues(),
      get: () => this._shopTargetSlot,
      set: (v) => { this._shopTargetSlot = v; },
      format: v => (v == null ? '(none)' : `slot ${v + 1}`),
    });
    this.widgets.push(slotCycle);
    actionRow.appendChild(slotCycle.render());

    const primaryBtn = new Button({
      center: false,
      label: () => this._shopPrimaryLabel(),
      onConfirm: () => {
        const item = this._shopCurrentItem();
        if (!item) return;
        this._shopConfirmItem(item, shopItemLockReason(item));
      },
    });
    this.widgets.push(primaryBtn);
    actionRow.appendChild(primaryBtn.render());

    const buyOnlyBtn = new Button({
      center: false,
      label: () => 'buy only · ' + creditLabel(itemLicensePrice(this._shopCurrentItem() || {})),
      onConfirm: () => {
        const item = this._shopCurrentItem();
        if (!item) return;
        this._shopBuyLicenseOnly(item);
      },
    });
    this.widgets.push(buyOnlyBtn);
    actionRow.appendChild(buyOnlyBtn.render());

    // ----- Updater (runs each refresh): retargets right pane to focused item.
    //
    // Stat-compare DOM and per-item display (title, slot cycle visibility,
    // buy-only visibility) only rebuild when the focused item id or loadout
    // signature changes, to avoid per-frame flicker. Cheap reads (cost chip,
    // afford state, primary-button disabled) update every refresh.
    let lastSig = null;
    const rebuildItemDetail = (item) => {
      titleName.textContent = item ? (item.name || item.id).toLowerCase() : '—';
      titleChip.style.display = (item && hasLicense(item.id)) ? '' : 'none';

      compareEl.innerHTML = '';
      if (item) {
        const groups = shopCompareGroups(item);
        for (const g of groups) {
          if (g.header) {
            const h = document.createElement('div');
            h.className = 'shop-compare-group';
            h.textContent = g.header;
            compareEl.appendChild(h);
          }
          for (const r of g.rows) {
            const scr = new StatCompareRow({
              label: r.label,
              current: r.current,
              candidate: r.candidate,
              unit: r.unit || '',
              betterIsHigher: r.betterIsHigher !== false,
            });
            compareEl.appendChild(scr.render());
          }
        }
      }

      const slots = this._shopSlotCycleValues();
      const showCycle = !!(item && WEAPONS.includes(item) && slots.length > 1);
      slotCycle.focusable = showCycle;
      slotCycle._el.style.display = showCycle ? '' : 'none';
      if (showCycle) {
        if (this._shopTargetSlot == null || !slots.includes(this._shopTargetSlot)) {
          this._shopTargetSlot = slots[0];
        }
      }

      const showBuyOnly = !!(item && !hasLicense(item.id) && itemLicensePrice(item) > 0);
      buyOnlyBtn.focusable = showBuyOnly;
      buyOnlyBtn._el.style.display = showBuyOnly ? '' : 'none';

      for (const b of itemBtns) {
        b._el.classList.toggle('is-current', b._shopItemId === this.shopItemId);
      }
    };

    this._shopUpdate = () => {
      const focused = this.widgets[this.focusIdx];
      if (focused && focused._shopItemId !== undefined) {
        if (this.shopItemId !== focused._shopItemId) {
          this.shopItemId = focused._shopItemId;
          this._shopTargetSlot = null;
        }
      }

      const item = this._shopCurrentItem();
      const sig = [
        item?.id || '',
        hasLicense(item?.id || '') ? '1' : '0',
        (G.loadout.weapons || []).join(','),
        G.loadout.chassis || '',
        G.loadout.shield || '',
      ].join('|');
      if (sig !== lastSig) {
        lastSig = sig;
        rebuildItemDetail(item);
      }

      const cost = item ? shopItemCost(item) : 0;
      costLabel.textContent = 'cost · ' + creditLabel(cost);
      if (!item || cost === 0) {
        costChip.style.display = 'none';
      } else {
        costChip.style.display = '';
        const afford = G.credits >= cost;
        costChip.textContent = afford ? 'can afford' : 'insufficient';
        costChip.className = 'chip ' + (afford ? 'chip-good' : 'chip-bad');
      }

      primaryBtn.setDisabled(!item || this._shopPrimaryDisabled());
      if (buyOnlyBtn.focusable) {
        buyOnlyBtn.setDisabled(G.credits < itemLicensePrice(item || {}));
      }
    };

    this._shopUpdate();
  };

  // --- Shop helpers bound to the screen --------------------------------------

  screen._shopCurrentItem = function() {
    const items = this._shopItems || [];
    return items.find(it => it.id === this.shopItemId) || null;
  };

  screen._shopSlotCycleValues = function() {
    const item = this._shopCurrentItem();
    if (!item || !WEAPONS.includes(item)) return [];
    const compat = compatibleSlots(item);
    if (compat.length <= 1) return [];
    const empties = compat.filter(({ i }) => !G.loadout.weapons[i]).map(({ i }) => i);
    return empties.length ? empties : compat.map(({ i }) => i);
  };

  screen._shopPrimaryLabel = function() {
    const item = this._shopCurrentItem();
    if (!item) return 'select item';
    if (shopItemLockReason(item)) return 'locked';
    if (isEquipped(item.id)) return 'already equipped';
    const cost = shopItemCost(item);
    if (WEAPONS.includes(item)) {
      if (!compatibleSlots(item).length) return 'no compatible slot';
      const verb = hasLicense(item.id) ? 'equip' : 'buy & equip';
      return verb + ' · ' + creditLabel(cost);
    }
    if (CHASSIS.includes(item) || SHIELDS.includes(item) || (typeof AUX_ITEMS !== 'undefined' && AUX_ITEMS.includes(item))) {
      const verb = hasLicense(item.id) ? 'equip' : 'buy & equip';
      return verb + ' · ' + creditLabel(cost);
    }
    return 'buy · ' + creditLabel(cost);
  };

  screen._shopPrimaryDisabled = function() {
    const item = this._shopCurrentItem();
    if (!item) return true;
    if (shopItemLockReason(item)) return true;
    if (isEquipped(item.id) && !CHASSIS.includes(item)) return true;
    if (WEAPONS.includes(item) && !compatibleSlots(item).length) return true;
    if (isEquipped(item.id) && CHASSIS.includes(item)) return true;
    return G.credits < shopItemCost(item);
  };

  screen._shopFlash = function(msg) {
    this._flashMsg = msg;
    this._flashUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 2000;
    tone(80, .1, 'square', .06);
  };

  screen._shopConfirmItem = function(item, lockReason) {
    if (!item) return;
    if (lockReason) { this._shopFlash(lockReason); return; }
    if (isEquipped(item.id) && !CHASSIS.includes(item)) { tone(80, .1, 'square', .06); return; }

    const lp = itemLicensePrice(item), bp = itemBuildPrice(item);
    const needsLicense = !hasLicense(item.id);
    const totalCost = (needsLicense ? lp : 0) + bp;

    // Weapons: pick a target slot. Multi-compatible-slot weapons read the cycle;
    // single-compatible-slot weapons use the only compatible slot.
    if (WEAPONS.includes(item)) {
      const compat = compatibleSlots(item);
      if (!compat.length) { tone(80, .1, 'square', .06); return; }
      let slotIdx;
      if (compat.length === 1) {
        slotIdx = compat[0].i;
      } else {
        const cycleVals = this._shopSlotCycleValues();
        slotIdx = (this._shopTargetSlot != null && cycleVals.includes(this._shopTargetSlot))
          ? this._shopTargetSlot
          : cycleVals[0];
        if (slotIdx == null) { tone(80, .1, 'square', .06); return; }
      }
      if (G.credits < totalCost) { tone(80, .1, 'square', .06); return; }
      G.credits -= totalCost;
      if (needsLicense && !hasLicense(item.id)) G.licenses.push(item.id);
      equipWeaponInSlot(item, slotIdx);
      tone(660, .2, 'sine', .08);
      saveGame();
      return;
    }

    if (CHASSIS.includes(item)) {
      // Chassis: pay license now (non-refundable); build cost paid on configurator confirm.
      if (needsLicense) {
        if (G.credits < lp) { tone(80, .1, 'square', .06); return; }
        G.credits -= lp;
        if (!hasLicense(item.id)) G.licenses.push(item.id);
      }
      if (G.credits < bp) { tone(80, .1, 'square', .06); saveGame(); return; }
      G.equipFlow = {
        chassisId: item.id,
        slots: item.slots.map(() => null),
        shieldId: G.loadout.shield,
        focus: 0,
        buildPrice: bp,
        warnShown: false,
      };
      saveGame();
      return;
    }

    if (SHIELDS.includes(item)) {
      if (G.credits < totalCost) { tone(80, .1, 'square', .06); return; }
      G.credits -= totalCost;
      if (needsLicense && !hasLicense(item.id)) G.licenses.push(item.id);
      G.loadout.shield = item.id;
      resetShipShield(G.OW?.s);
      tone(660, .2, 'sine', .08);
      saveGame();
      return;
    }

    if (typeof AUX_ITEMS !== 'undefined' && AUX_ITEMS.includes(item)) {
      if (G.credits < totalCost) { tone(80, .1, 'square', .06); return; }
      G.credits -= totalCost;
      if (needsLicense && !hasLicense(item.id)) G.licenses.push(item.id);
      G.loadout.aux = item.id;
      tone(660, .2, 'sine', .08);
      saveGame();
    }
  };

  screen._shopBuyLicenseOnly = function(item) {
    if (!item) return;
    if (hasLicense(item.id)) return;
    const lp = itemLicensePrice(item);
    if (lp > 0 && G.credits < lp) { tone(80, .1, 'square', .06); return; }
    if (lp > 0) G.credits -= lp;
    if (!hasLicense(item.id)) G.licenses.push(item.id);
    tone(660, .15, 'sine', .08);
    saveGame();
  };

  // Up/Down on the refit SlotPicker cycles weapons before falling through to
  // vertical focus movement. Mirrors the configurator's input override.
  screen.handle = function(input) {
    if (input.cancel && this.onCancel) { this.onCancel(); return; }
    const w = this.focused();
    if ((input.up || input.down) && w === this._refitPicker && this._refitPicker) {
      if (this._refitPicker.handle(input)) { this.refresh(); return; }
      this.moveFocus(input.up ? -1 : 1);
      return;
    }
    if (input.up)   { this.moveFocus(-1); return; }
    if (input.down) { this.moveFocus( 1); return; }
    if (w && w.handle) {
      const consumed = w.handle(input);
      if (consumed) { this.refresh(); return; }
    }
    if (input.confirm && this.onConfirm) { this.onConfirm(); }
  };

  const baseRefresh = screen.refresh.bind(screen);
  screen.refresh = function() {
    if (this._serviceUpdaters) for (const fn of this._serviceUpdaters) fn();
    if (this._shopUpdate) this._shopUpdate();
    if (this._refitUpdate) this._refitUpdate();
    baseRefresh();
    if (this._chipsEl) this._chipsEl.innerHTML = chipsHTML();
    if (this._footerEl) {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (this._flashMsg && now < this._flashUntil) {
        this._footerEl.textContent = this._flashMsg;
      } else if (this._flashMsg) {
        this._flashMsg = null;
      }
    }
  };

  screen.tick = function() { this.refresh(); };

  return screen;
}

registerScreen('base', makeBaseScreen);
