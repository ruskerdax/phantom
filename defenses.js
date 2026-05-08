'use strict';

// Shared stationary and environmental combat defense behavior.
function defenseWeapon(def) {
  return WEAPON_MAP[def.defense.fire.wpn];
}

function defenseCooldown(def) {
  const fw = def.defense.fire, base = weaponCooldownFrames(defenseWeapon(def));
  return base + Math.floor(Math.random() * (fw.cdJitter ?? 0));
}

function mkDefense(typeOrClass, x, y, extra = {}, rng = null) {
  const def = defenseSpawnDef(typeOrClass, rng), dc = def.defense;
  const wp = defenseWeapon(def);
  const energyMax=def.energyMax??dc.energyMax,energyRegenPerSec=def.energyRegenPerSec??dc.energyRegenPerSec;
  const {timer, ...rest} = extra;
  return {
    x, y, a:0, hp:dc.hp, mhp:dc.hp, alive:true, t:def.id,
    weaponIds:[dc.fire.wpn],
    ...(Number.isFinite(energyMax)?{energyMax,energy:energyMax,energyRegenPerSec:energyRegenPerSec??0}:{}),
    weapons:[mkWeaponSlot({cd:timer ?? defenseCooldown(def), ammo:ammoForMountedWeapon(wp)})],
    ...rest
  };
}

function initDefense(d, alive = true, defaultClass = DEFENSE_CLASS_IDS.CAVE_TURRET) {
  const def = defenseDef(d.t ?? defaultClass), dc = def.defense;
  const baseSlot = d.weapons?.[0] || {};
  const wp = defenseWeapon(def);
  const energyMax=def.energyMax??dc.energyMax,energyRegenPerSec=def.energyRegenPerSec??dc.energyRegenPerSec;
  return {
    ...d,
    t:def.id,
    hp:d.hp ?? dc.hp,
    mhp:d.mhp ?? dc.hp,
    alive,
    weaponIds:[dc.fire.wpn],
    ...(Number.isFinite(energyMax)?{energyMax,energy:d.energy ?? energyMax,energyRegenPerSec:energyRegenPerSec??0}:{}),
    weapons:[mkWeaponSlot({...baseSlot, cd:d.timer ?? baseSlot.cd ?? defenseCooldown(def), ammo:ammoForMountedWeapon(wp, baseSlot)})],
  };
}

function damageDefense(site, d, dmg, x = d.x, y = d.y) {
  const def = defenseDef(d);
  const boomCol = site.d?.col ?? def.col;
  d.hp -= dmg;
  boomAt(site.pts, x, y, boomCol, 4);
  tone(360, .05, 'square', .05);
  if(d.hp <= 0) {
    d.alive = false;
    addStake(def.sc);
    boomAt(site.pts, d.x, d.y, boomCol, 14);
    boomAt(site.pts, d.x, d.y, def.col2, 8);
    tone(220, .3, 'sawtooth', .1);
  }
}

function defenseAim(site, d) {
  if(site.mode === 'surface') {
    const delta = surfaceDelta(site.d, site.s.x, site.s.y, d.x, d.y);
    return {a:Math.atan2(delta.dx, -delta.dy), dist:Math.hypot(delta.dx, delta.dy) || 1};
  }
  const s = site.s, dx = s.x - d.x, dy = s.y - d.y;
  return {a:Math.atan2(dx, -dy), dist:Math.hypot(dx, dy) || 1};
}

function defenseCanFire(d, def, dist, aimAngle) {
  const fw = def.defense.fire, wp = defenseWeapon(def);
  if(dist > Math.min(weaponEffectiveRange(wp), fw.senseRange ?? Infinity)) return false;
  if(dist < (fw.minRange ?? 0)) return false;
  return Math.abs(angDiff(d.a, aimAngle)) <= (fw.arc ?? Math.PI);
}

function defenseBeamSpace(site) {
  return site.mode === 'surface' ? {toroidal:true, worldW:site.d.worldW, worldH:999999} : null;
}

function fireDefenseKinetic(site, d, def, aimAngle) {
  const wp = defenseWeapon(def), ctx = defenseWeaponContext(site, d, def, 0, aimAngle);
  d.a = aimAngle;
  return tryFire(wp, WEAPON_TYPES[wp.fireMode], d, 0, site.ebu, ctx);
}

function fireDefenseMissile(site, d, def, aimAngle) {
  const wp = defenseWeapon(def), ctx = defenseWeaponContext(site, d, def, 0, aimAngle);
  d.a = aimAngle;
  return tryFire(wp, WEAPON_TYPES[wp.fireMode], d, 0, site.ebu, ctx);
}

function fireDefenseBeam(site, d, def, aimAngle) {
  const wp = defenseWeapon(def), ctx = defenseWeaponContext(site, d, def, 0, aimAngle);
  d.a = aimAngle;
  return tryFire(wp, WEAPON_TYPES[wp.fireMode], d, 0, site.ebu, ctx);
}

function defenseBeamTargets(site) {
  const s = site.s, tgts = [], hit = {source:{x:s.x, y:s.y}, kind:'beam'};
  if(shipShieldCanTakeHit(s, hit)) tgts.push({x:s.x, y:s.y, r:shipShieldHitRadius(s), kind:'shield'});
  tgts.push({x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'});
  for(let i = 0; i < site.mis.length; i++) tgts.push({x:site.mis[i].x, y:site.mis[i].y, r:5, kind:'missile', idx:i});
  return tgts;
}

function defenseHandleBeamHit(site, wp, res, tg) {
  const s = site.s;
  const src = site.mode === 'surface' ? {x:surfaceNearX(site.d, res.x1, s.x), y:res.y1} : {x:res.x1, y:res.y1};
  const hit = {source:src, kind:'beam', weapon:wp};
  if(tg.kind === 'shield') {
    const sh = applyShipShieldDamage(s, wp.dmg, hit);
    if(sh.passthroughDamage > 0) applyShipDamage(s, sh.passthroughDamage, hit);
    shipDamageTone({shieldDamage:sh.shieldDamage, hullDamage:sh.passthroughDamage});
  } else if(tg.kind === 'ship') {
    shipDamageTone(applyShipDamage(s, wp.dmg, hit));
  } else if(tg.kind === 'missile') {
    const m = site.mis[tg.idx];
    m.hp -= wp.dmg; boomAt(site.pts, res.x2, res.y2, m.col, 3);
    if(m.hp <= 0) {
      if(site.mode === 'surface') surfaceExplodeMissile(site, m, false);
      else siteExplodeMissile(site, m, false);
      site.mis.splice(tg.idx, 1);
    }
  }
  if(s.hp <= 0) { siteKillShip(); return true; }
  return false;
}

function defenseWeaponContext(site, d, def, dist, aimAngle) {
  const wp = defenseWeapon(def), fw = def.defense.fire;
  const shots = enemyWeaponShotCount(d, 0, wp, fw.count || 1);
  const angles = enemyFireAngles(d, fw, aimAngle, shots);
  return {
    trace:'defense',
    angle:aimAngle,
    angles,
    count:shots,
    ammoCost:shots,
    spread:fw.spread || 0,
    offset:fw.offset,
    inherit:0,
    cooldownFrames:defenseCooldown(def),
    retryCooldown:enemyRetryCooldown,
    projectileColor:def.col,
    projectileTone:[550, .04, 'square', .03],
    beamColor:def.col,
    beamTone:[550, .08, 'sine', .04],
    bul:site.ebu,
    mis:site.emi,
    lsb:site.lsb,
    walls:siteBeamWalls(site),
    space:defenseBeamSpace(site),
    tgts:()=>defenseBeamTargets(site),
    onBeamHit:(tg, hitWp, res)=>defenseHandleBeamHit(site, hitWp, res, tg),
    canStartFire:()=>shots > 0 && enemyCanFireAnyWeapon(d) && defenseCanFire(d, def, dist, aimAngle),
    aimOnPress:true,
  };
}

function fireDefenseWeapon(site, d, def, aimAngle, dist = Infinity) {
  const wp = defenseWeapon(def);
  return runAiWeaponSlot(d, 0, wp, defenseWeaponContext(site, d, def, dist, aimAngle));
}

function updateDefense(site, d) {
  if(!d.alive) return;
  const def = defenseDef(d), dc = def.defense;
  tickEnemyEnergy(d);
  if(site.mode === 'surface' && d.towerId != null) {
    const tower = site.buildings?.[d.towerId];
    if(!tower?.alive) {
      d.alive = false;
      return;
    }
    d.x = tower.x;
    d.y = towerTopY(tower);
  } else if(site.mode === 'surface' && dc.groundOffset != null) d.y = surfaceYAt(site.d, d.x) - dc.groundOffset;
  if(defenseRequiresPower(d, def) && !defenseIsPowered(site, d)) {
    const sw = weaponSlot(d,0);
    if(--sw.cd <= 0) sw.cd = 8 + Math.floor(Math.random() * 12);
    return;
  }
  const aim = defenseAim(site, d);
  d.a += angDiff(d.a, aim.a) * (dc.turn ?? .04);
  fireDefenseWeapon(site, d, def, aim.a, aim.dist);
}

function drawDefense(d) {
  const def = defenseDef(d), h = defenseHullWorld(d, def);
  cx.save(); cx.translate(d.x, d.y);
  cx.strokeStyle = def.col; cx.shadowColor = def.col; cx.shadowBlur = sb(8); cx.lineWidth = 1.5;
  drawHullParts(h);
  cx.rotate(d.a); cx.beginPath(); cx.moveTo(0, -8); cx.lineTo(0, -18); cx.stroke();
  cx.rotate(-d.a);
  drawActorHealthBar(h.boundsR, d.hp, d.mhp, def.col);
  cx.restore();
}

function genSurfaceDefenses(rng, surface, count) {
  return [];
}
