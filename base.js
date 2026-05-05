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
  { id: 'chassis',  label: 'CHASSIS'  },
  { id: 'weapons',  label: 'WEAPONS'  },
  { id: 'shields',  label: 'SHIELDS'  },
];}
function baseTabId(tab = G.baseTab) { return baseTabs()[tab]?.id || 'services'; }

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
