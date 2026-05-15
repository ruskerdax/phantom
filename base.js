'use strict';

// =============================================================================
// Friendly base — shop/services data + transactions.
//
// The DOM screen (ui/screens/base.js) and the equip-flow configurator
// (ui/screens/equip-config.js) call into the helpers here. All canvas drawing
// and input loop code from the old base UI has been removed.
// =============================================================================

function baseTabs() { return [
  { id: 'services', label: 'SERVICES' },
  { id: 'shop',     label: 'SHOP'     },
  { id: 'refit',    label: 'REFIT'    },
];}
function baseTabId(tab = G.baseTab) {
  if (typeof tab === 'string') return baseTabs().some(t => t.id === tab) ? tab : 'services';
  return baseTabs()[tab]?.id || 'services';
}

function shopItemsForTab(tab) {
  const id = typeof tab === 'string' ? tab : baseTabId(tab);
  if (id === 'chassis') return CHASSIS.filter(c => c.buyable);
  if (id === 'weapons') return WEAPONS.filter(w => w.buyable);
  if (id === 'shields') return SHIELDS.filter(s => s.buyable);
  return [];
}

function itemLicensePrice(item) { return Math.max(0, item.licensePrice ?? 0); }
function itemBuildPrice(item)   { return Math.max(0, item.buildPrice   ?? 0); }
function creditLabel(cost)      { return cost === 0 ? 'free' : cost + ' cr'; }

function itemTypeLabel(item) {
  if (CHASSIS.includes(item))   return 'CHASSIS';
  if (AUX_ITEMS.includes(item)) return 'AUX';
  if (SHIELDS.includes(item))   return 'SHIELD';
  const wp = WEAPONS.find(w => w === item);
  return wp ? wp.wpnType.toUpperCase() : '';
}

function itemStatusLabel(item) {
  if (isEquipped(item.id))  return 'EQUIPPED';
  if (hasLicense(item.id))  return 'LICENSED';
  return itemLicensePrice(item) === 0 ? 'FREE' : '';
}

function baseRepairCost(s) { return Math.max(0, Math.ceil((s.maxHp - s.hp) * 2)); }

// -----------------------------------------------------------------------------
// Shop tab (P3-03) helpers — pure formatting / cost / stat-compare data used
// by ui/screens/base.js to populate the shop body.
// -----------------------------------------------------------------------------

// The total credit cost to "buy & equip" (or "equip" if already licensed) one
// shop item. License is added when not yet owned.
function shopItemCost(item) {
  if (!item) return 0;
  const lp = hasLicense(item.id) ? 0 : itemLicensePrice(item);
  return lp + itemBuildPrice(item);
}

// Right-side value shown in the item-list row.
//   - "★ eq" (green star) if the item is currently equipped.
//   - "{cost} cr" / "free" for any item whose total cost the player can
//     consider.
function shopItemRowValue(item) {
  if (!item) return '';
  if (isEquipped(item.id)) return UI_GLYPH.star + ' eq';
  return creditLabel(shopItemCost(item));
}

// Chassis stat groups — hull/thrust/slots/mass, candidate vs current.
function shopCompareChassis(candidate) {
  const cur = activeChassisObj();
  const c = candidate || cur;
  const toThrust = ch => Math.round((ch?.thrust?.fwd || 0) * 1000);
  const toMass   = ch => Math.round(ch?.hitRadius || 0);
  return [{
    header: null,
    rows: [
      { label: 'hull',   current: cur?.maxHp || 0,         candidate: c?.maxHp || 0,         betterIsHigher: true },
      { label: 'thrust', current: toThrust(cur),           candidate: toThrust(c),           betterIsHigher: true },
      { label: 'slots',  current: cur?.slots?.length || 0, candidate: c?.slots?.length || 0, betterIsHigher: true },
      { label: 'mass',   current: toMass(cur),             candidate: toMass(c),             betterIsHigher: false },
    ],
  }];
}

// Weapon stat groups — one section per chassis weapon slot. Each section
// compares the candidate weapon against the weapon (or empty) currently in
// that slot. Ammo/magazine rows only appear when the candidate exposes the
// corresponding field.
function shopCompareWeapons(candidate) {
  if (!candidate) return [];
  const chassis = activeChassisObj();
  const slots = chassis?.slots || [];
  const groups = [];
  const toRate = wp => (wp && wp.cd) ? Math.round(60 / wp.cd) : 0;
  const toRange = wp => {
    if (!wp) return 0;
    if (Number.isFinite(wp.range)) return Math.round(wp.range);
    if (Number.isFinite(wp.spd) && Number.isFinite(wp.life)) return Math.round(wp.spd * wp.life);
    return 0;
  };
  const wpField = (wp, k) => (wp && Number.isFinite(wp[k])) ? wp[k] : 0;
  for (let i = 0; i < slots.length; i++) {
    const sl = slots[i];
    if (!slotMatchesWeapon(sl, candidate)) continue;
    const curId = G.loadout.weapons[i];
    const cur = curId ? WEAPONS.find(w => w.id === curId) : null;
    const header = `slot ${i + 1}: ${cur ? (cur.name || cur.id).toLowerCase() : '(empty)'}`;
    const rows = [
      { label: 'dmg',   current: wpField(cur, 'dmg'),        candidate: wpField(candidate, 'dmg'),        betterIsHigher: true },
      { label: 'rate',  current: toRate(cur),                candidate: toRate(candidate),                betterIsHigher: true },
      { label: 'heat',  current: wpField(cur, 'energyCost'), candidate: wpField(candidate, 'energyCost'), betterIsHigher: false },
      { label: 'range', current: toRange(cur),               candidate: toRange(candidate),               betterIsHigher: true },
    ];
    if (Number.isFinite(candidate.ammoMax)) {
      rows.push({ label: 'ammo', current: wpField(cur, 'ammoMax'), candidate: candidate.ammoMax, betterIsHigher: true });
    }
    if (Number.isFinite(candidate.magMax)) {
      rows.push({ label: 'magazine', current: wpField(cur, 'magMax'), candidate: candidate.magMax, betterIsHigher: true });
    }
    groups.push({ header, rows });
  }
  return groups;
}

// Shield stat group — strength/regen, candidate vs current.
function shopCompareShields(candidate) {
  const cur = activeShieldObj();
  const c = candidate || cur;
  const toRegen = sh => Math.round((sh?.rechargeRate || 0) * 100);
  return [{
    header: null,
    rows: [
      { label: 'strength', current: cur?.hp || 0, candidate: c?.hp || 0, betterIsHigher: true },
      { label: 'regen',    current: toRegen(cur), candidate: toRegen(c), betterIsHigher: true },
    ],
  }];
}

function shopCompareGroups(item) {
  if (!item) return [];
  if (CHASSIS.includes(item)) return shopCompareChassis(item);
  if (WEAPONS.includes(item)) return shopCompareWeapons(item);
  if (SHIELDS.includes(item)) return shopCompareShields(item);
  return [];
}

// -----------------------------------------------------------------------------
// Shop action options builder — given a shop item, produce the list of
// {label, act, slotIdx?, disabled} options that the shop-action overlay shows.
// Pure function, no DOM/canvas. Called from ui/screens/base.js.
// -----------------------------------------------------------------------------
function shopActionOpts(item) {
  const owned = hasLicense(item.id), eq = isEquipped(item.id);
  const lp = itemLicensePrice(item), bp = itemBuildPrice(item);
  const opts = [];
  const canEquip = CHASSIS.includes(item) || AUX_ITEMS.includes(item)
    || SHIELDS.includes(item)
    || (WEAPONS.includes(item) && compatibleSlots(item).length > 0);

  if (!owned) {
    opts.push({ label: `BUY LICENSE  ${creditLabel(lp)}`, act: 'buy_license', disabled: lp > 0 && G.credits < lp });
    if (canEquip) {
      if (WEAPONS.includes(item)) {
        const cslots = compatibleSlots(item), price = lp + bp;
        if (cslots.length === 1) {
          opts.push({ label: `BUY + EQUIP SLOT ${cslots[0].i + 1}  ${creditLabel(price)}`, act: 'buy_equip', slotIdx: cslots[0].i, disabled: G.credits < price });
        } else {
          for (const { i } of cslots) {
            opts.push({ label: `BUY + EQUIP ${UI_GLYPH.arrow} SLOT ${i + 1}  ${creditLabel(price)}`, act: 'buy_equip', slotIdx: i, disabled: G.credits < price });
          }
        }
      } else {
        opts.push({ label: `BUY + EQUIP  ${creditLabel(lp + bp)}`, act: 'buy_equip', disabled: G.credits < lp + bp });
      }
    }
  } else if (!eq) {
    if (canEquip) {
      if (WEAPONS.includes(item)) {
        const cslots = compatibleSlots(item);
        if (cslots.length === 1) {
          opts.push({ label: `EQUIP SLOT ${cslots[0].i + 1}  ${creditLabel(bp)}`, act: 'equip_weapon', slotIdx: cslots[0].i, disabled: G.credits < bp });
        } else {
          for (const { i } of cslots) {
            opts.push({ label: `EQUIP ${UI_GLYPH.arrow} SLOT ${i + 1}  ${creditLabel(bp)}`, act: 'equip_weapon', slotIdx: i, disabled: G.credits < bp });
          }
        }
      } else {
        opts.push({ label: `EQUIP  ${creditLabel(bp)}`, act: 'equip', disabled: G.credits < bp });
      }
    } else {
      opts.push({ label: 'NO COMPATIBLE SLOT', act: 'none', disabled: true });
    }
  } else {
    opts.push({ label: 'ALREADY EQUIPPED', act: 'none', disabled: true });
  }
  opts.push({ label: 'CANCEL', act: 'cancel', disabled: false });
  return opts;
}

// -----------------------------------------------------------------------------
// Equipment helpers
// -----------------------------------------------------------------------------
function canEquipWeaponInSlot(item, slotIdx) {
  return WEAPONS.includes(item) && compatibleSlots(item).some(({ i }) => i === slotIdx);
}
function equipWeaponInSlot(item, slotIdx) {
  if (!canEquipWeaponInSlot(item, slotIdx)) return false;
  const slots = G.loadout.weapons;
  while (slots.length <= slotIdx) slots.push(null);
  slots[slotIdx] = item.id;
  if (G.OW?.s) {
    const sw = weaponSlot(G.OW.s, slotIdx);
    sw.ammo = ammoForWeapon(item);
    sw.mag = magForWeapon(item);
    sw.reloading = false;
    sw.reloadFrames = 0;
    fillMagFromReserve(G.OW.s, slotIdx, item);
  }
  return true;
}

// -----------------------------------------------------------------------------
// Execute a shop action option (the option chosen by the player from the
// shop-action overlay). Returns no value; updates G state and clears
// G.shopActionId / opens G.equipFlow as appropriate.
// -----------------------------------------------------------------------------
function execShopAction(opt) {
  const items = shopItemsForTab(G.baseTab);
  const item = items.find(it => it.id === G.shopActionId);
  if (!item || opt.disabled) return;
  if (opt.act === 'cancel') { G.shopActionId = null; return; }
  if (opt.act === 'none') return;

  const lp = itemLicensePrice(item), bp = itemBuildPrice(item);

  if (opt.act === 'buy_license') {
    if (G.credits < lp && lp > 0) { tone(80, .1, 'square', .06); return; }
    G.credits -= lp;
    if (!hasLicense(item.id)) G.licenses.push(item.id);
    tone(660, .15, 'sine', .08); G.shopActionId = null; saveGame();
    return;
  }

  if (opt.act === 'buy_equip' || opt.act === 'equip') {
    // Chassis: pay license now (non-refundable); build cost paid on configurator confirm.
    // Other items: pay total now.
    if (opt.act === 'buy_equip' && WEAPONS.includes(item) && !canEquipWeaponInSlot(item, opt.slotIdx)) {
      tone(80, .1, 'square', .06); return;
    }
    if (opt.act === 'buy_equip') {
      if (G.credits < lp) { tone(80, .1, 'square', .06); return; }
      G.credits -= lp;
      if (!hasLicense(item.id)) G.licenses.push(item.id);
    }
    if (CHASSIS.includes(item)) {
      if (G.credits < bp) { tone(80, .1, 'square', .06); if (opt.act === 'buy_equip') saveGame(); return; }
      G.equipFlow = { chassisId: item.id, slots: item.slots.map(() => null), shieldId: G.loadout.shield, focus: 0, buildPrice: bp, warnShown: false };
      G.shopActionId = null;
    } else if (AUX_ITEMS.includes(item)) {
      if (G.credits < bp) { tone(80, .1, 'square', .06); if (opt.act === 'buy_equip') saveGame(); return; }
      G.credits -= bp; G.loadout.aux = item.id;
      tone(660, .15, 'sine', .08); G.shopActionId = null; saveGame();
    } else if (SHIELDS.includes(item)) {
      if (G.credits < bp) { tone(80, .1, 'square', .06); if (opt.act === 'buy_equip') saveGame(); return; }
      G.credits -= bp; G.loadout.shield = item.id; resetShipShield(G.OW?.s);
      tone(660, .15, 'sine', .08); G.shopActionId = null; saveGame();
    } else if (WEAPONS.includes(item)) {
      if (!canEquipWeaponInSlot(item, opt.slotIdx)) { tone(80, .1, 'square', .06); if (opt.act === 'buy_equip') saveGame(); return; }
      if (G.credits < bp) { tone(80, .1, 'square', .06); if (opt.act === 'buy_equip') saveGame(); return; }
      G.credits -= bp;
      equipWeaponInSlot(item, opt.slotIdx);
      tone(660, .15, 'sine', .08); G.shopActionId = null; saveGame();
    }
    return;
  }

  if (opt.act === 'equip_weapon') {
    if (!canEquipWeaponInSlot(item, opt.slotIdx)) { tone(80, .1, 'square', .06); return; }
    if (G.credits < bp) { tone(80, .1, 'square', .06); return; }
    G.credits -= bp;
    equipWeaponInSlot(item, opt.slotIdx);
    tone(660, .15, 'sine', .08); G.shopActionId = null; saveGame();
  }
}

assertWeaponRegistry();
