'use strict';

function surfaceEnemyWeapon(def) {
  return WEAPON_MAP[def.surf.fire.wpn];
}

function surfaceEnemyCooldown(def) {
  const fw = def.surf.fire, base = weaponCooldownFrames(surfaceEnemyWeapon(def));
  return base + Math.floor(Math.random() * (fw.cdJitter ?? 0));
}

function mkSurfaceEnemy(typeOrClass, x, y, extra = {}, rng = null) {
  const def = surfaceEnemySpawnDef(typeOrClass, rng), sf = def.surf;
  const wp = surfaceEnemyWeapon(def);
  const energyMax=def.energyMax??sf.energyMax,energyRegenPerSec=def.energyRegenPerSec??sf.energyRegenPerSec;
  return {
    x, y, vx:0, vy:0, a:Math.PI/2, hp:sf.hp, mhp:sf.hp, alive:true, t:def.id,
    weaponIds:[sf.fire.wpn],
    ...(Number.isFinite(energyMax)?{energyMax,energy:energyMax,energyRegenPerSec:energyRegenPerSec??0}:{}),
    weapons:[mkWeaponSlot({ammo:ammoForMountedWeapon(wp)})],
    ...extra
  };
}

function initSurfaceEnemy(e, alive = true) {
  const def = surfaceEnemyDef(e), sf = def.surf;
  const baseSlot = e.weapons?.[0] || {};
  const wp = surfaceEnemyWeapon(def);
  const energyMax=def.energyMax??sf.energyMax,energyRegenPerSec=def.energyRegenPerSec??sf.energyRegenPerSec;
  return {
    ...e,
    t:def.id,
    hp:e.hp ?? sf.hp,
    mhp:e.mhp ?? sf.hp,
    alive,
    weaponIds:[sf.fire.wpn],
    ...(Number.isFinite(energyMax)?{energyMax,energy:e.energy ?? energyMax,energyRegenPerSec:energyRegenPerSec??0}:{}),
    weapons:[mkWeaponSlot({...baseSlot, cd:e.timer ?? baseSlot.cd ?? surfaceEnemyCooldown(def), ammo:ammoForMountedWeapon(wp, baseSlot)})],
    phase:e.phase ?? Math.random() * Math.PI * 2,
  };
}

function genSurfaceEnemies(rng, surface, count) {
  const en = [];
  const excl = W * .6, availLen = Math.max(0, surface.worldW - 2 * excl), startX = surface.ent.x + excl;
  for(let i = 0; i < count; i++) {
    const t = (i + .35 + rng.fl(-.18, .18)) / count;
    const x = wrap(startX + t * availLen, surface.worldW);
    const ground = surfaceYAt(surface, x);
    const roll = rng.next();
    if(roll < .58) en.push(mkSurfaceEnemy(SURFACE_ENEMY_TYPES.SKIMMER, Math.round(x), Math.round(ground - rng.fl(70, 125)), {vx:rng.fl(-1.2, 1.2), vy:0, phase:rng.fl(0, Math.PI * 2)}, rng));
    else en.push(mkSurfaceEnemy(SURFACE_ENEMY_TYPES.DIVER, Math.round(x), Math.round(ground - rng.fl(140, 230)), {vx:rng.fl(-.8, .8), vy:0, phase:rng.fl(0, Math.PI * 2)}, rng));
  }
  return en;
}

function surfaceLiveSkimmersAndDivers(site) {
  return (site?.en || []).filter(e => {
    if(!e.alive) return false;
    const type = surfaceEnemyDef(e).type;
    return type === SURFACE_ENEMY_TYPES.SKIMMER || type === SURFACE_ENEMY_TYPES.DIVER;
  });
}

function surfaceSkimmerDiverCounts(site) {
  const out = {skimmers:0, divers:0, total:0};
  for(const e of surfaceLiveSkimmersAndDivers(site)) {
    const type = surfaceEnemyDef(e).type;
    if(type === SURFACE_ENEMY_TYPES.SKIMMER) out.skimmers++;
    else if(type === SURFACE_ENEMY_TYPES.DIVER) out.divers++;
    out.total++;
  }
  return out;
}

function surfaceDroneCount(site) {
  return (site?.en || []).filter(e => e.alive && surfaceEnemyDef(e).type === SURFACE_ENEMY_TYPES.SURFACE_DRONE).length;
}

function airDefenseBaseGround(site, base) {
  return surfaceYAt(site.d, base.x);
}

function spawnAirDefenseEnemy(site, base, type = null, guard = false) {
  const count = surfaceSkimmerDiverCounts(site).total;
  if(count >= SURFACE_ENEMY_CAP) return null;
  const spawnType = guard ? SURFACE_ENEMY_TYPES.SKIMMER : (type || (Math.random() < .5 ? SURFACE_ENEMY_TYPES.SKIMMER : SURFACE_ENEMY_TYPES.DIVER));
  const ground = airDefenseBaseGround(site, base);
  const y = guard ? ground - 105 : base.y - 28;
  const e = mkSurfaceEnemy(spawnType, base.x, y, {
    vx:(Math.random() - .5) * 1.2,
    vy:-2.2,
    phase:Math.random() * Math.PI * 2,
    ...(guard ? {role:'guard', guardOf:base.idx} : {}),
  });
  site.en.push(initSurfaceEnemy(e, true));
  if(guard) base.guardAlive = true;
  return e;
}

function liveGuardForBase(site, base) {
  return (site?.en || []).some(e => e.alive && e.role === 'guard' && e.guardOf === base.idx);
}

function refreshAirDefenseGuardState(site, base) {
  base.guardAlive = liveGuardForBase(site, base);
}

function spawnNextAirDefenseEnemy(site, base) {
  if(base.guardAlive === false) return spawnAirDefenseEnemy(site, base, SURFACE_ENEMY_TYPES.SKIMMER, true);
  return spawnAirDefenseEnemy(site, base, Math.random() < .5 ? SURFACE_ENEMY_TYPES.SKIMMER : SURFACE_ENEMY_TYPES.DIVER, false);
}

function topUpAirDefenseBase(site, base) {
  const target = Math.ceil(SURFACE_ENEMY_CAP * .6);
  refreshAirDefenseGuardState(site, base);
  let counts = surfaceSkimmerDiverCounts(site);
  const startSkimmers = counts.skimmers, startTotal = counts.total;
  while(counts.total < target && counts.total < SURFACE_ENEMY_CAP) {
    let spawned = null;
    if(base.guardAlive === false) spawned = spawnAirDefenseEnemy(site, base, SURFACE_ENEMY_TYPES.SKIMMER, true);
    else if(startTotal <= 0) spawned = spawnAirDefenseEnemy(site, base, Math.random() < .5 ? SURFACE_ENEMY_TYPES.SKIMMER : SURFACE_ENEMY_TYPES.DIVER, false);
    else {
      const desiredSkimmers = Math.round(target * (startSkimmers / Math.max(1, startTotal)));
      const type = counts.skimmers < desiredSkimmers ? SURFACE_ENEMY_TYPES.SKIMMER : SURFACE_ENEMY_TYPES.DIVER;
      spawned = spawnAirDefenseEnemy(site, base, type, false);
    }
    if(!spawned) break;
    counts = surfaceSkimmerDiverCounts(site);
  }
}

function updateAirDefenseBase(base, site) {
  if(site?.mode !== 'surface' || !base?.alive) return;
  if(!base._enteredTopUpDone) {
    base._enteredTopUpDone = true;
    topUpAirDefenseBase(site, base);
  }
  if(!Number.isFinite(base.spawnTimer)) base.spawnTimer = 1200;
  const counts = surfaceSkimmerDiverCounts(site);
  if(counts.total >= SURFACE_ENEMY_CAP) return;
  if(--base.spawnTimer <= 0) {
    spawnNextAirDefenseEnemy(site, base);
    base.spawnTimer = 1200;
  }
}

function spawnSurfaceDrone(site, factory) {
  if(surfaceDroneCount(site) >= SURFACE_DRONE_CAP) return null;
  const ground = surfaceYAt(site.d, factory.x);
  const e = mkSurfaceEnemy(SURFACE_ENEMY_TYPES.SURFACE_DRONE, factory.x, Math.round(Math.min(factory.y - 28, ground - 44)), {
    vx:(Math.random() - .5) * .8,
    vy:(Math.random() - .5) * .8,
    phase:Math.random() * Math.PI * 2,
    factoryOf:factory.idx,
    homeX:factory.x,
    homeY:factory.y - 56,
  });
  site.en.push(initSurfaceEnemy(e, true));
  return e;
}

function updateDroneFactory(factory, site) {
  if(site?.mode !== 'surface' || !factory?.alive) return;
  if(!Number.isFinite(factory.spawnTimer)) factory.spawnTimer = 1200;
  if(surfaceDroneCount(site) >= SURFACE_DRONE_CAP) return;
  if(--factory.spawnTimer <= 0) {
    spawnSurfaceDrone(site, factory);
    factory.spawnTimer = 1200;
  }
}

function surfaceDroneHasLos(site, e, dist, aimAngle) {
  const d = site.d, s = site.s;
  const tgts = [{x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'}];
  const res = castLaserForSpace(e.x, e.y, aimAngle, dist + shipHitRadius(s), tgts, surfaceTerrainSegments(d), {toroidal:true, worldW:d.worldW, worldH:999999});
  return res.hitIdx >= 0;
}

function surfaceDroneHome(site, e) {
  const factory = siteBuildings(site).find(b => b.classId === BUILDING_CLASS_IDS.DRONE_FACTORY && b.idx === e.factoryOf);
  if(factory) return {x:factory.x, y:factory.y - 56};
  return {x:e.homeX ?? e.x, y:e.homeY ?? e.y};
}

function steerSurfaceDrone(site, e, dist, aimAngle) {
  const d = site.d, s = site.s, home = surfaceDroneHome(site, e);
  if(surfaceDroneHasLos(site, e, dist, aimAngle)) {
    const orbitA = G.fr * .025 + e.phase;
    const tx = wrap(s.x + Math.sin(orbitA) * 120, d.worldW);
    const ty = s.y + Math.cos(orbitA) * 120;
    const cd = surfaceDelta(d, tx, ty, e.x, e.y);
    e.vx += cd.dx * .006;
    e.vy += cd.dy * .006;
  } else {
    const orbitA = G.fr * .016 + e.phase;
    const tx = wrap(home.x + Math.sin(orbitA) * 170, d.worldW);
    const ty = home.y + Math.cos(orbitA) * 52;
    const pd = surfaceDelta(d, tx, ty, e.x, e.y);
    const hd = surfaceDelta(d, home.x, home.y, e.x, e.y);
    const hdist = Math.hypot(hd.dx, hd.dy) || 1;
    e.vx += pd.dx * .004;
    e.vy += pd.dy * .004;
    if(hdist > 250) {
      e.vx += hd.dx / hdist * .08;
      e.vy += hd.dy / hdist * .08;
    }
  }
}

function surfaceEnemyCanFire(e, def, dist, aimAngle) {
  const fw = def.surf.fire, wp = surfaceEnemyWeapon(def);
  if(dist > Math.min(weaponEffectiveRange(wp), fw.senseRange ?? Infinity)) return false;
  if(dist < (fw.minRange ?? 0)) return false;
  return Math.abs(angDiff(e.a, aimAngle)) <= (fw.arc ?? Math.PI);
}

function damageSurfaceEnemy(site, e, dmg, x = e.x, y = e.y) {
  const def = surfaceEnemyDef(e);
  e.hp -= dmg;
  boomAt(site.pts, x, y, site.d.col, 4);
  tone(360, .05, 'square', .05);
  if(e.hp <= 0) {
    e.alive = false;
    if(e.role === 'guard') {
      const base = siteBuildings(site).find(b => b.classId === BUILDING_CLASS_IDS.AIR_DEFENSE_BASE && b.idx === e.guardOf);
      if(base) base.guardAlive = false;
    }
    addStake(def.sc);
    boomAt(site.pts, e.x, e.y, site.d.col, 14);
    boomAt(site.pts, e.x, e.y, def.col2, 8);
    tone(200, .25, 'sawtooth', .08);
  }
}

function fireSurfaceEnemyKinetic(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire, cnt = fw.count || 1, spread = fw.spread || 0;
  const shots = weaponHasAmmo(wp) ? Math.min(cnt, currentAmmoForSlot(e, 0)) : cnt;
  if(shots <= 0 || !consumeEnemyWeaponCosts(e, 0, wp, shots)) return false;
  for(let k = 0; k < shots; k++) {
    const a = aimAngle + (k - (shots - 1) / 2) * spread;
    site.ebu.push({
      x:e.x + Math.sin(a) * fw.offset, y:e.y - Math.cos(a) * fw.offset,
      vx:Math.sin(a) * wp.spd, vy:-Math.cos(a) * wp.spd,
      l:wp.life * wp.spd, dmg:wp.dmg, col:def.col,
    });
  }
  tone(520, .04, 'square', .03);
  return true;
}

function fireSurfaceEnemyMissile(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire, md = MISSILE_TYPES[wp.missileType] || MISSILE_TYPES['standard'];
  if(!consumeEnemyWeaponCosts(e, 0, wp, 1)) return false;
  site.emi.push({
    x:e.x + Math.sin(aimAngle) * fw.offset, y:e.y - Math.cos(aimAngle) * fw.offset, a:aimAngle,
    vx:Math.sin(aimAngle) * wp.spd, vy:-Math.cos(aimAngle) * wp.spd,
    spd:wp.spd, maxSpd:wp.maxSpd, accel:wp.accel,
    hp:wp.hp, maxHp:wp.hp, l:wp.life,
    dmg:wp.dmg, expDmg:wp.expDmg, expR:wp.expR,
    type:wp.missileType || 'standard', col:md.col,
    seek:!!wp.seek, trailTimer:0,
  });
  tone(360, .10, 'square', .06);
  return true;
}

function fireSurfaceEnemyBeam(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire, s = site.s;
  if(!consumeEnemyWeaponCosts(e, 0, wp, 1)) return false;
  const ox = e.x + Math.sin(aimAngle) * fw.offset, oy = e.y - Math.cos(aimAngle) * fw.offset;
  const src = {x:surfaceNearX(site.d, ox, s.x), y:oy}, hit = {source:src, kind:'beam', weapon:wp};
  const tgts = [];
  if(shipShieldCanTakeHit(s, hit)) tgts.push({x:s.x, y:s.y, r:shipShieldHitRadius(s), kind:'shield'});
  tgts.push({x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'});
  for(let i = 0; i < site.mis.length; i++) tgts.push({x:site.mis[i].x, y:site.mis[i].y, r:5, kind:'missile', idx:i});
  const res = castLaserForSpace(ox, oy, aimAngle, wp.range, tgts, surfaceTerrainSegments(site.d), {toroidal:true, worldW:site.d.worldW, worldH:999999});
  site.lsb.push({x1:ox, y1:oy, x2:res.x2, y2:res.y2, l:8, col:def.col, w:wp.beamWidth});
  if(res.hitIdx >= 0) {
    const tg = tgts[res.hitIdx];
    if(tg.kind === 'shield') {
      const sh = applyShipShieldDamage(s, wp.dmg, hit);
      if(sh.passthroughDamage > 0) applyShipDamage(s, sh.passthroughDamage, hit);
      shipDamageTone({shieldDamage:sh.shieldDamage, hullDamage:sh.passthroughDamage});
    } else if(tg.kind === 'ship') {
      shipDamageTone(applyShipDamage(s, wp.dmg, hit));
    } else if(tg.kind === 'missile') {
      const m = site.mis[tg.idx];
      m.hp -= wp.dmg; boomAt(site.pts, res.x2, res.y2, m.col, 3);
      if(m.hp <= 0) { surfaceExplodeMissile(site, m, false); site.mis.splice(tg.idx, 1); }
    }
  }
  if(s.hp <= 0) siteKillShip();
  tone(550, .08, 'sine', .04);
  return true;
}

function fireSurfaceEnemyWeapon(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def);
  if(!enemyCanFireAnyWeapon(e)) {
    weaponSlot(e,0).cd = 8 + Math.floor(Math.random() * 12);
    return;
  }
  e.a = aimAngle;
  const fired = wp.fireMode === 'missile' ? fireSurfaceEnemyMissile(site, e, def, aimAngle)
    : wp.fireMode === 'beam' ? fireSurfaceEnemyBeam(site, e, def, aimAngle)
    : fireSurfaceEnemyKinetic(site, e, def, aimAngle);
  weaponSlot(e,0).cd = fired ? surfaceEnemyCooldown(def) : 8 + Math.floor(Math.random() * 12);
}

function maybeFireSurfaceEnemy(site, e, def, dist, aimAngle) {
  const sw = weaponSlot(e,0);
  if(--sw.cd > 0) return;
  if(surfaceEnemyCanFire(e, def, dist, aimAngle)) fireSurfaceEnemyWeapon(site, e, def, aimAngle);
  else sw.cd = 8 + Math.floor(Math.random() * 12);
}

function updSurfaceEnemy(site, e) {
  if(!e.alive) return;
  const d = site.d, s = site.s, def = surfaceEnemyDef(e), sf = def.surf, ground = surfaceYAt(d, e.x);
  const delta = surfaceDelta(d, s.x, s.y, e.x, e.y), dist = Math.hypot(delta.dx, delta.dy) || 1, aimAngle = Math.atan2(delta.dx, -delta.dy);
  const disengaging = enemyTickDisengage(e, {
    surface:true, s, worldW:d.worldW, worldH:d.worldH, exitY:d.exitY ?? 0, cam:site.cam, radius:surfaceEnemyRadius(e),
    deltaFromPlayer:enemy=>surfaceDelta(d, enemy.x, enemy.y, s.x, s.y)
  });
  if(!e.alive) return;

  if(disengaging) {
    // Disengage motion replaces the normal surface role update.
  } else if(def.type === SURFACE_ENEMY_TYPES.SURFACE_DRONE) {
    steerSurfaceDrone(site, e, dist, aimAngle);
  } else if(e.role === 'guard') {
    const base = siteBuildings(site).find(b => b.alive && b.classId === BUILDING_CLASS_IDS.AIR_DEFENSE_BASE && b.idx === e.guardOf);
    if(base) {
      const orbitA = G.fr * .018 + e.phase;
      const tx = wrap(base.x + Math.sin(orbitA) * 120, d.worldW);
      const ty = Math.max(35, surfaceYAt(d, base.x) - 120 + Math.cos(orbitA) * 28);
      const guardDelta = surfaceDelta(d, tx, ty, e.x, e.y);
      const baseDelta = surfaceDelta(d, base.x, surfaceYAt(d, base.x) - 105, e.x, e.y);
      const baseDist = Math.hypot(baseDelta.dx, baseDelta.dy) || 1;
      e.vx += guardDelta.dx * .004;
      e.vy += guardDelta.dy * .004;
      if(baseDist > 200) {
        e.vx += baseDelta.dx / baseDist * .08;
        e.vy += baseDelta.dy / baseDist * .08;
      }
    }
  } else if(def.type === SURFACE_ENEMY_TYPES.SKIMMER) {
    const targetY = surfaceYAt(d, e.x) - 92 + Math.sin(G.fr * .035 + e.phase) * 26;
    e.vx += Math.sign(delta.dx || 1) * .025;
    e.vy += (targetY - e.y) * .006;
    if(dist < 260) e.vx -= Math.sign(delta.dx || 1) * .04;
  } else if(def.type === SURFACE_ENEMY_TYPES.DIVER) {
    const diving = dist < 360 && s.y < ground - 28;
    e.vx += (delta.dx / dist) * (diving ? .075 : .028);
    e.vy += (diving ? delta.dy / dist : -.35) * .055;
    e.vy += (surfaceYAt(d, e.x) - 150 - e.y) * .002;
  }

  e.vx *= .985; e.vy *= .985;
  const max = sf.spd ?? 2.8, sp = Math.hypot(e.vx, e.vy);
  if(sp > max) { e.vx = e.vx / sp * max; e.vy = e.vy / sp * max; }
  e.x = wrap(e.x + e.vx, d.worldW); e.y += e.vy;
  const g2 = surfaceYAt(d, e.x);
  if(!e.disengaging && e.y > g2 - 22) { e.y = g2 - 22; e.vy = -Math.abs(e.vy) * .7; }
  if(!e.disengaging && e.y < 35) { e.y = 35; e.vy = Math.abs(e.vy) * .5; }
  if(e.disengaging&&e.disengageKind==='permanent'&&enemyPastSurfaceBoundary(e,{exitY:d.exitY ?? 0,radius:surfaceEnemyRadius(e)})&&enemyOffscreen(e,{cam:site.cam,radius:surfaceEnemyRadius(e)})){
    e.alive=false;
    return;
  }
  e.a = Math.atan2(e.vx, -e.vy || -.01);
  const fireDelta = surfaceDelta(d, s.x, s.y, e.x, e.y), fireDist = Math.hypot(fireDelta.dx, fireDelta.dy) || 1, fireAim = Math.atan2(fireDelta.dx, -fireDelta.dy);
  maybeFireSurfaceEnemy(site, e, def, fireDist, fireAim);

  if(surfaceDist(d, e.x, e.y, s.x, s.y) < surfaceEnemyRadius(e) + shipHitRadius(s)) {
    const hit = applyShipDamage(s, 2, {source:{x:surfaceNearX(d, e.x, s.x), y:e.y}, kind:'collision'});
    shipDamageTone(hit, 180, .12, 'sawtooth', .1);
    e.vx -= fireDelta.dx / fireDist * 1.5; e.vy -= fireDelta.dy / fireDist * 1.5;
    if(s.hp <= 0) siteKillShip();
  }
}
