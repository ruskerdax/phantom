'use strict';

var ENEMY_AI_TRACE = false;

function weaponAiTrace(policyId, e, wp, ctx) {
  if(!ENEMY_AI_TRACE) return;
  console.log('[weapon-ai]', policyId, e?.t ?? 'actor', wp?.id, ctx?.trace ?? '');
}

function weaponAiTriggerReady(e, slot, wp, ctx, policyId) {
  const sw = weaponSlot(e, slot);
  if(sw.cd > 0 || sw.pulsesLeft > 0 || sw.misLeft > 0) return false;
  if(ctx.blocked?.()) {
    updateWeaponInputState(e, slot, false);
    if(ctx.retryCooldown) sw.cd = ctx.retryCooldown();
    return false;
  }
  if(!ctx.canStartFire?.()) {
    updateWeaponInputState(e, slot, false);
    if(ctx.retryCooldown) sw.cd = ctx.retryCooldown();
    return false;
  }
  if(ctx.aimOnPress) e.a = ctx.angle ?? e.a;
  weaponAiTrace(policyId, e, wp, ctx);
  return true;
}

function weaponAiTap(policyId) {
  return {
    update(e, slot, wp, ctx) {
      updateWeaponInputState(e, slot, weaponAiTriggerReady(e, slot, wp, ctx, policyId));
    }
  };
}

const WEAPON_AI_POLICIES = {
  'tap': weaponAiTap('tap'),
  'tap-cooldown': weaponAiTap('tap-cooldown'),
  'beam-pulse': weaponAiTap('beam-pulse'),
  'missile-salvo': weaponAiTap('missile-salvo'),
};

function assertWeaponAiPolicies() {
  for(const wp of WEAPONS) {
    if(wp.aiPolicy === undefined) throw new Error(`Weapon ${wp.id} is missing aiPolicy`);
    if(wp.aiPolicy !== null && !WEAPON_AI_POLICIES[wp.aiPolicy]) throw new Error(`Weapon ${wp.id} has unknown aiPolicy ${wp.aiPolicy}`);
    if(!WEAPON_TYPES[wp.fireMode]) throw new Error(`Weapon ${wp.id} has unknown fireMode ${wp.fireMode}`);
  }
}

assertWeaponAiPolicies();
