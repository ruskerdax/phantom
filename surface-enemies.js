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

function isTunnelDrone(e) {
  return !!e?.tunnelDrone;
}

function tunnelDroneCount(site) {
  return (site?.en || []).filter(e => e.alive && isTunnelDrone(e)).length;
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

function spawnTunnelDrone(site, factory) {
  if(site?.mode !== 'branching') return null;
  if(tunnelDroneCount(site) >= TUNNEL_DRONE_CAP) return null;
  const e = mkSurfaceEnemy(SURFACE_ENEMY_TYPES.SURFACE_DRONE, factory.x, Math.round(factory.y - 28), {
    vx:(Math.random() - .5) * .8,
    vy:(Math.random() - .5) * .8,
    phase:Math.random() * Math.PI * 2,
    factoryOf:factory.idx,
    homeX:factory.x,
    homeY:factory.y - 56,
    tunnelDrone:true,
  });
  site.en.push(initSurfaceEnemy(e, true));
  return e;
}

function updateDroneFactory(factory, site) {
  if((site?.mode !== 'surface' && site?.mode !== 'branching') || !factory?.alive) return;
  if(!Number.isFinite(factory.spawnTimer)) factory.spawnTimer = 1200;
  const cap = site.mode === 'branching' ? TUNNEL_DRONE_CAP : SURFACE_DRONE_CAP;
  const count = site.mode === 'branching' ? tunnelDroneCount(site) : surfaceDroneCount(site);
  if(count >= cap) return;
  if(--factory.spawnTimer <= 0) {
    if(site.mode === 'branching') spawnTunnelDrone(site, factory);
    else spawnSurfaceDrone(site, factory);
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

function tunnelDroneHasLos(site, e, dist, aimAngle) {
  const s = site.s;
  const tgts = [{x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'}];
  const res = castLaserForSpace(e.x, e.y, aimAngle, dist + shipHitRadius(s), tgts, siteBeamWalls(site), null);
  return res.hitIdx >= 0;
}

function tunnelPointOpen(site, x, y) {
  const d = site.d;
  if(!pip(x, y, d.terrain)) return false;
  if((d.obs || []).some(o => pip(x, y, o))) return false;
  return true;
}

function steerTunnelDrone(site, e, dist, aimAngle) {
  const s = site.s, home = surfaceDroneHome(site, e);
  if(tunnelDroneHasLos(site, e, dist, aimAngle)) {
    const orbitA = G.fr * .025 + e.phase;
    const tx = s.x + Math.sin(orbitA) * 120;
    const ty = s.y + Math.cos(orbitA) * 120;
    e.vx += (tx - e.x) * .006;
    e.vy += (ty - e.y) * .006;
  } else {
    const orbitA = G.fr * .016 + e.phase;
    const tx = home.x + Math.sin(orbitA) * 170;
    const ty = home.y + Math.cos(orbitA) * 52;
    const pdx = tx - e.x, pdy = ty - e.y;
    const hdx = home.x - e.x, hdy = home.y - e.y;
    const hdist = Math.hypot(hdx, hdy) || 1;
    e.vx += pdx * .004;
    e.vy += pdy * .004;
    if(hdist > 250) {
      e.vx += hdx / hdist * .08;
      e.vy += hdy / hdist * .08;
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
    addRunKill();
    boomAt(site.pts, e.x, e.y, site.d.col, 14);
    boomAt(site.pts, e.x, e.y, def.col2, 8);
    tone(200, .25, 'sawtooth', .08);
  }
}

function fireSurfaceEnemyKinetic(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), ctx = surfaceEnemyWeaponContext(site, e, def, 0, aimAngle);
  e.a = aimAngle;
  return tryFire(wp, WEAPON_TYPES[wp.fireMode], e, 0, site.ebu, ctx);
}

function fireSurfaceEnemyMissile(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), ctx = surfaceEnemyWeaponContext(site, e, def, 0, aimAngle);
  e.a = aimAngle;
  return tryFire(wp, WEAPON_TYPES[wp.fireMode], e, 0, site.ebu, ctx);
}

function fireSurfaceEnemyBeam(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), ctx = surfaceEnemyWeaponContext(site, e, def, 0, aimAngle);
  e.a = aimAngle;
  return tryFire(wp, WEAPON_TYPES[wp.fireMode], e, 0, site.ebu, ctx);
}

function surfaceEnemyBeamTargets(site) {
  const s = site.s, tgts = [], hit = {source:{x:s.x, y:s.y}, kind:'beam'};
  if(shipShieldCanTakeHit(s, hit)) tgts.push({x:s.x, y:s.y, r:shipShieldHitRadius(s), kind:'shield'});
  tgts.push({x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'});
  for(let i = 0; i < site.mis.length; i++) tgts.push({x:site.mis[i].x, y:site.mis[i].y, r:5, kind:'missile', idx:i});
  return tgts;
}

function surfaceEnemyHandleBeamHit(site, wp, res, tg) {
  const s = site.s;
  const src = {x:surfaceNearX(site.d, res.x1, s.x), y:res.y1}, hit = {source:src, kind:'beam', weapon:wp};
  if(tg.kind === 'shield') {
    const beamEnd = {x:src.x + Math.sin(res.a) * wp.range, y:src.y - Math.cos(res.a) * wp.range};
    shipDamageTone(applyShipBeamDamage(s, wp.dmg, {...hit, beamEnd}));
  } else if(tg.kind === 'ship') {
    shipDamageTone(applyShipDamage(s, wp.dmg, hit));
  } else if(tg.kind === 'missile') {
    const m = site.mis[tg.idx];
    m.hp -= wp.dmg; boomAt(site.pts, res.x2, res.y2, m.col, 3);
    if(m.hp <= 0) { surfaceExplodeMissile(site, m, false); site.mis.splice(tg.idx, 1); }
  }
  if(s.hp <= 0) { siteKillShip(); return true; }
  return false;
}

function surfaceEnemyWeaponContext(site, e, def, dist, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire;
  const shots = enemyWeaponShotCount(e, 0, wp, fw.count || 1);
  const angles = enemyFireAngles(e, fw, aimAngle, shots);
  return {
    trace:'surface-enemy',
    angle:aimAngle,
    angles,
    count:shots,
    ammoCost:shots,
    spread:fw.spread || 0,
    offset:fw.offset,
    cooldownFrames:surfaceEnemyCooldown(def),
    retryCooldown:enemyRetryCooldown,
    projectileColor:def.col,
    projectileTone:[520, .04, 'square', .03],
    beamColor:def.col,
    beamTone:[550, .08, 'sine', .04],
    bul:site.ebu,
    mis:site.emi,
    lsb:site.lsb,
    walls:surfaceTerrainSegments(site.d),
    space:{toroidal:true, worldW:site.d.worldW, worldH:999999},
    tgts:()=>surfaceEnemyBeamTargets(site),
    onBeamHit:(tg, hitWp, res)=>surfaceEnemyHandleBeamHit(site, hitWp, res, tg),
    blocked:()=>e.disengaging && e.disengageKind === 'permanent',
    canStartFire:()=>shots > 0 && enemyCanFireAnyWeapon(e) && surfaceEnemyCanFire(e, def, dist, aimAngle),
    aimOnPress:true,
  };
}

function fireSurfaceEnemyWeapon(site, e, def, aimAngle, dist = Infinity) {
  const wp = surfaceEnemyWeapon(def);
  return runAiWeaponSlot(e, 0, wp, surfaceEnemyWeaponContext(site, e, def, dist, aimAngle));
}

function maybeFireSurfaceEnemy(site, e, def, dist, aimAngle) {
  fireSurfaceEnemyWeapon(site, e, def, aimAngle, dist);
}

function tunnelDroneWeaponContext(site, e, def, dist, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire;
  const shots = enemyWeaponShotCount(e, 0, wp, fw.count || 1);
  const angles = enemyFireAngles(e, fw, aimAngle, shots);
  return {
    trace:'tunnel-drone',
    angle:aimAngle,
    angles,
    count:shots,
    ammoCost:shots,
    spread:fw.spread || 0,
    offset:fw.offset,
    cooldownFrames:surfaceEnemyCooldown(def),
    retryCooldown:enemyRetryCooldown,
    projectileColor:def.col,
    projectileTone:[520, .04, 'square', .03],
    beamColor:def.col,
    beamTone:[550, .08, 'sine', .04],
    bul:site.ebu,
    mis:site.emi,
    lsb:site.lsb,
    walls:siteBeamWalls(site),
    space:null,
    tgts:()=>defenseBeamTargets(site),
    onBeamHit:(tg, hitWp, res)=>defenseHandleBeamHit(site, hitWp, res, tg),
    canStartFire:()=>shots > 0 && enemyCanFireAnyWeapon(e) && surfaceEnemyCanFire(e, def, dist, aimAngle),
    aimOnPress:true,
  };
}

function fireTunnelDroneWeapon(site, e, def, aimAngle, dist = Infinity) {
  const wp = surfaceEnemyWeapon(def);
  return runAiWeaponSlot(e, 0, wp, tunnelDroneWeaponContext(site, e, def, dist, aimAngle));
}

function maybeFireTunnelDrone(site, e, def, dist, aimAngle) {
  fireTunnelDroneWeapon(site, e, def, aimAngle, dist);
}

function updTunnelDrone(site, e) {
  if(!e.alive || site?.mode !== 'branching') return;
  const d = site.d, s = site.s, def = surfaceEnemyDef(e), sf = def.surf;
  tickEnemyEnergy(e);
  const dx = s.x - e.x, dy = s.y - e.y;
  const dist = Math.hypot(dx, dy) || 1, aimAngle = Math.atan2(dx, -dy);
  steerTunnelDrone(site, e, dist, aimAngle);

  e.vx *= .985;
  e.vy *= .985;
  const max = sf.spd ?? 2.8, sp = Math.hypot(e.vx, e.vy);
  if(sp > max) {
    e.vx = e.vx / sp * max;
    e.vy = e.vy / sp * max;
  }

  const prevX = e.x, prevY = e.y;
  e.x += e.vx;
  e.y += e.vy;
  const worldW = d.worldW || W, worldH = d.worldH || H;
  e.x = Math.max(8, Math.min(worldW - 8, e.x));
  e.y = Math.max(8, Math.min(worldH - 8, e.y));
  if(!tunnelPointOpen(site, e.x, e.y)) {
    e.x = prevX;
    e.y = prevY;
    e.vx *= -.35;
    e.vy *= -.35;
  }

  e.a = Math.atan2(e.vx, -e.vy || -.01);
  maybeFireTunnelDrone(site, e, def, dist, aimAngle);

  if(Math.hypot(s.x - e.x, s.y - e.y) < surfaceEnemyRadius(e) + shipHitRadius(s)) {
    const hit = applyShipDamage(s, 2, {source:{x:e.x, y:e.y}, kind:'collision'});
    shipDamageTone(hit, 180, .12, 'sawtooth', .1);
    e.vx -= dx / dist * 1.5;
    e.vy -= dy / dist * 1.5;
    if(s.hp <= 0) siteKillShip();
  }
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

const _nativeUpdateDefense = updateDefense;
updateDefense = function(site, d) {
  if(isTunnelDrone(d)) {
    updTunnelDrone(site, d);
    return;
  }
  _nativeUpdateDefense(site, d);
};

const _nativeDrawDefense = drawDefense;
drawDefense = function(d) {
  if(isTunnelDrone(d)) {
    drawSurfaceEnemy(d);
    return;
  }
  _nativeDrawDefense(d);
};

const _nativeDamageDefense = damageDefense;
damageDefense = function(site, d, dmg, x = d.x, y = d.y) {
  if(isTunnelDrone(d)) return damageSurfaceEnemy(site, d, dmg, x, y);
  return _nativeDamageDefense(site, d, dmg, x, y);
};

const _nativeDefenseRadius = defenseRadius;
defenseRadius = function(d) {
  if(isTunnelDrone(d)) return surfaceEnemyRadius(d);
  return _nativeDefenseRadius(d);
};

const _nativeDefenseColor = defenseColor;
defenseColor = function(d) {
  if(isTunnelDrone(d)) return surfaceEnemyColor(d);
  return _nativeDefenseColor(d);
};

const _nativeDefenseHullWorld = defenseHullWorld;
defenseHullWorld = function(d, def) {
  if(isTunnelDrone(d)) return surfaceEnemyHullWorld(d, surfaceEnemyDef(d));
  return _nativeDefenseHullWorld(d, def);
};

const _nativeDefenseBeamTarget = defenseBeamTarget;
defenseBeamTarget = function(d, idx, kind = 'defense') {
  if(isTunnelDrone(d)) {
    const h = surfaceEnemyHullWorld(d);
    return {x:d.x, y:d.y, r:h.boundsR, hull:h, beamPad:beamMotionPadding(d), kind, idx};
  }
  return _nativeDefenseBeamTarget(d, idx, kind);
};
