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

function weaponAiDetonateProjectile() {
  return {
    update(e, slot, wp, ctx) {
      const sw = weaponSlot(e, slot);
      const slug = findActiveSlug(sw, ctx.bul);
      if(slug) {
        const halfLife = wp.slugLife * wp.slugSpd * .5;
        updateWeaponInputState(e, slot, slug.l <= halfLife);
        return;
      }
      updateWeaponInputState(e, slot, weaponAiTriggerReady(e, slot, wp, ctx, 'detonate-projectile'));
    }
  };
}

function weaponAiStickyDetonate() {
  return {
    update(e, slot, wp, ctx) {
      const sw = weaponSlot(e, slot);
      const active = findStickyMissile(sw, ctx.mis);
      if(active) {
        if(sw.stickyDetonateFrame == null) sw.stickyDetonateFrame = G.fr + 30;
        updateWeaponInputState(e, slot, G.fr >= sw.stickyDetonateFrame);
        return;
      }
      sw.stickyDetonateFrame = null;
      updateWeaponInputState(e, slot, weaponAiTriggerReady(e, slot, wp, ctx, 'sticky-detonate'));
    }
  };
}

const WEAPON_AI_POLICIES = {
  'tap': weaponAiTap('tap'),
  'tap-cooldown': weaponAiTap('tap-cooldown'),
  'beam-pulse': weaponAiTap('beam-pulse'),
  'missile-salvo': weaponAiTap('missile-salvo'),
  'detonate-projectile': weaponAiDetonateProjectile(),
  'sticky-detonate': weaponAiStickyDetonate(),
};

assertWeaponRegistry();
