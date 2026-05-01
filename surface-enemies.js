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
  return {x, y, vx:0, vy:0, a:Math.PI/2, hp:sf.hp, mhp:sf.hp, alive:true, t:def.id, ...extra};
}

function initSurfaceEnemy(e, alive = true) {
  const def = surfaceEnemyDef(e), sf = def.surf;
  return {
    ...e,
    t:def.id,
    hp:e.hp ?? sf.hp,
    mhp:e.mhp ?? sf.hp,
    alive,
    timer:e.timer ?? surfaceEnemyCooldown(def),
    phase:e.phase ?? Math.random() * Math.PI * 2,
  };
}

function genSurfaceEnemies(rng, surface, count) {
  const en = [];
  for(let i = 0; i < count; i++) {
    const x = wrap((i + .35 + rng.fl(-.18, .18)) / count * surface.worldW, surface.worldW);
    const ground = surfaceYAt(surface, x);
    const roll = rng.next();
    if(roll < .58) en.push(mkSurfaceEnemy(SURFACE_ENEMY_TYPES.SKIMMER, Math.round(x), Math.round(ground - rng.fl(70, 125)), {vx:rng.fl(-1.2, 1.2), vy:0, phase:rng.fl(0, Math.PI * 2)}, rng));
    else en.push(mkSurfaceEnemy(SURFACE_ENEMY_TYPES.DIVER, Math.round(x), Math.round(ground - rng.fl(140, 230)), {vx:rng.fl(-.8, .8), vy:0, phase:rng.fl(0, Math.PI * 2)}, rng));
  }
  return en;
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
    addStake(def.sc);
    boomAt(site.pts, e.x, e.y, site.d.col, 14);
    boomAt(site.pts, e.x, e.y, def.col2, 8);
    tone(200, .25, 'sawtooth', .08);
  }
}

function fireSurfaceEnemyKinetic(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire, cnt = fw.count || 1, spread = fw.spread || 0;
  for(let k = 0; k < cnt; k++) {
    const a = aimAngle + (k - (cnt - 1) / 2) * spread;
    site.ebu.push({
      x:e.x + Math.sin(a) * fw.offset, y:e.y - Math.cos(a) * fw.offset,
      vx:Math.sin(a) * wp.spd, vy:-Math.cos(a) * wp.spd,
      l:wp.life * wp.spd, dmg:wp.dmg, col:def.col,
    });
  }
  tone(520, .04, 'square', .03);
}

function fireSurfaceEnemyMissile(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire, md = MISSILE_TYPES[wp.missileType] || MISSILE_TYPES['standard'];
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
}

function fireSurfaceEnemyBeam(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def), fw = def.surf.fire, s = site.s;
  const ox = e.x + Math.sin(aimAngle) * fw.offset, oy = e.y - Math.cos(aimAngle) * fw.offset;
  const src = {x:surfaceNearX(site.d, ox, s.x), y:oy}, hit = {source:src, kind:'beam', weapon:wp};
  const tgts = [];
  if(shipShieldCanTakeHit(s, hit)) tgts.push({x:s.x, y:s.y, r:shipShieldHitRadius(s), kind:'shield'});
  tgts.push({x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'});
  for(let i = 0; i < site.mis.length; i++) tgts.push({x:site.mis[i].x, y:site.mis[i].y, r:5, kind:'missile', idx:i});
  const res = castLaserForSpace(ox, oy, aimAngle, wp.range, tgts, [], {toroidal:true, worldW:site.d.worldW, worldH:999999});
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
}

function fireSurfaceEnemyWeapon(site, e, def, aimAngle) {
  const wp = surfaceEnemyWeapon(def);
  e.a = aimAngle;
  if(wp.fireMode === 'missile') fireSurfaceEnemyMissile(site, e, def, aimAngle);
  else if(wp.fireMode === 'beam') fireSurfaceEnemyBeam(site, e, def, aimAngle);
  else fireSurfaceEnemyKinetic(site, e, def, aimAngle);
  e.timer = surfaceEnemyCooldown(def);
}

function maybeFireSurfaceEnemy(site, e, def, dist, aimAngle) {
  if(--e.timer > 0) return;
  if(surfaceEnemyCanFire(e, def, dist, aimAngle)) fireSurfaceEnemyWeapon(site, e, def, aimAngle);
  else e.timer = 8 + Math.floor(Math.random() * 12);
}

function updSurfaceEnemy(site, e) {
  if(!e.alive) return;
  const d = site.d, s = site.s, def = surfaceEnemyDef(e), sf = def.surf, ground = surfaceYAt(d, e.x);
  const delta = surfaceDelta(d, s.x, s.y, e.x, e.y), dist = Math.hypot(delta.dx, delta.dy) || 1, aimAngle = Math.atan2(delta.dx, -delta.dy);

  if(def.type === SURFACE_ENEMY_TYPES.SKIMMER) {
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
  if(e.y > g2 - 22) { e.y = g2 - 22; e.vy = -Math.abs(e.vy) * .7; }
  if(e.y < 35) { e.y = 35; e.vy = Math.abs(e.vy) * .5; }
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
