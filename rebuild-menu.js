'use strict';

// =============================================================================
// Rebuild menu helpers. The canvas drawing + input loop have moved to
// ui/screens/rebuild.js (chassis selection) and ui/screens/equip-config.js
// (the shared ship configurator used for the rebuild config phase).
//
// The functions retained here are pure logic: they prepare and apply the
// rebuild-flow state without touching DOM or canvas, so they can be called
// from the new screens.
// =============================================================================

function rebuildTotalCost(chassisId, shieldId) {
  const ch = CHASSIS.find(c => c.id === chassisId);
  const sh = SHIELDS.find(s => s.id === shieldId);
  return (ch?.buildPrice ?? 0) + (sh?.buildPrice ?? 0);
}

function licensedRebuildChassis() { return CHASSIS.filter(c => hasLicense(c.id)); }

function currentShieldForRebuild() {
  if (hasLicense(G.loadout.shield)) return G.loadout.shield;
  return SHIELDS.find(s => hasLicense(s.id))?.id ?? null;
}

function rebuildSlotsForChassis(ch) {
  return ch.slots.map((sl, i) => {
    const curWp = G.loadout.weapons[i];
    if (curWp && hasLicense(curWp)) {
      const wp = WEAPONS.find(w => w.id === curWp);
      if (wp && slotMatchesWeapon(sl, wp)) return curWp;
    }
    return licensedWeaponsForSlot(sl)[0]?.id ?? null;
  });
}

function openRebuildConfig(ch) {
  G.rebuildFlow.phase = 'config';
  G.rebuildFlow.chassisId = ch.id;
  G.rebuildFlow.slots = rebuildSlotsForChassis(ch);
  G.rebuildFlow.shieldId = currentShieldForRebuild();
  G.rebuildFlow.focus = 0;
  G.rebuildFlow.warnShown = false;
}

function applyCharityRebuild() {
  const def = defaultSave();
  G.credits = 0; G.stake = 0;
  G.loadout = { ...def.loadout, weapons: [...def.loadout.weapons] };
  def.licenses.forEach(id => { if (!G.licenses.includes(id)) G.licenses.push(id); });
  G.rebuildFlow = null;
  doRebuildFinalize();
}

function finalizeRebuild(rf, ch) {
  const totalCost = rebuildTotalCost(rf.chassisId, rf.shieldId);
  if (G.credits < totalCost) { tone(80, .1, 'square', .06); return false; }
  G.credits -= totalCost;
  const power = defaultPowerForChassisId(rf.chassisId);
  G.loadout.chassis = rf.chassisId;
  G.loadout.battery = power.battery;
  G.loadout.reactor = power.reactor;
  G.loadout.weapons = [...rf.slots];
  while (G.loadout.weapons.length < ch.slots.length) G.loadout.weapons.push(null);
  G.loadout.weapons = G.loadout.weapons.slice(0, ch.slots.length);
  G.loadout.shield = rf.shieldId;
  G.rebuildFlow = null;
  doRebuildFinalize();
  return true;
}
