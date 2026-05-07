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
  const {timer, ...rest} = extra;
  return {x, y, a:0, hp:dc.hp, mhp:dc.hp, alive:true, t:def.id, weapons:[mkWeaponSlot({cd:timer ?? defenseCooldown(def)})], ...rest};
}

function initDefense(d, alive = true, defaultClass = DEFENSE_CLASS_IDS.CAVE_TURRET) {
  const def = defenseDef(d.t ?? defaultClass), dc = def.defense;
  const baseSlot = d.weapons?.[0] || {};
  return {
    ...d,
    t:def.id,
    hp:d.hp ?? dc.hp,
    mhp:d.mhp ?? dc.hp,
    alive,
    weapons:[mkWeaponSlot({...baseSlot, cd:d.timer ?? baseSlot.cd ?? defenseCooldown(def)})],
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
  const wp = defenseWeapon(def), fw = def.defense.fire, cnt = fw.count || 1, spread = fw.spread || 0;
  for(let k = 0; k < cnt; k++) {
    const a = aimAngle + (k - (cnt - 1) / 2) * spread;
    site.ebu.push({
      x:d.x + Math.sin(a) * fw.offset, y:d.y - Math.cos(a) * fw.offset,
      vx:Math.sin(a) * wp.spd, vy:-Math.cos(a) * wp.spd,
      l:wp.life * wp.spd, dmg:wp.dmg, col:def.col,
    });
  }
  tone(550, .04, 'square', .03);
}

function fireDefenseMissile(site, d, def, aimAngle) {
  const wp = defenseWeapon(def), fw = def.defense.fire, md = MISSILE_TYPES[wp.missileType] || MISSILE_TYPES['standard'];
  site.emi.push({
    x:d.x + Math.sin(aimAngle) * fw.offset, y:d.y - Math.cos(aimAngle) * fw.offset, a:aimAngle,
    vx:Math.sin(aimAngle) * wp.spd, vy:-Math.cos(aimAngle) * wp.spd,
    spd:wp.spd, maxSpd:wp.maxSpd, accel:wp.accel,
    hp:wp.hp, maxHp:wp.hp, l:wp.life,
    dmg:wp.dmg, expDmg:wp.expDmg, expR:wp.expR,
    type:wp.missileType || 'standard', col:md.col,
    seek:!!wp.seek, trailTimer:0,
  });
  tone(360, .10, 'square', .06);
}

function fireDefenseBeam(site, d, def, aimAngle) {
  const wp = defenseWeapon(def), fw = def.defense.fire, s = site.s;
  const ox = d.x + Math.sin(aimAngle) * fw.offset, oy = d.y - Math.cos(aimAngle) * fw.offset;
  const src = site.mode === 'surface' ? {x:surfaceNearX(site.d, ox, s.x), y:oy} : {x:ox, y:oy};
  const hit = {source:src, kind:'beam', weapon:wp};
  const tgts = [];
  if(shipShieldCanTakeHit(s, hit)) tgts.push({x:s.x, y:s.y, r:shipShieldHitRadius(s), kind:'shield'});
  tgts.push({x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'});
  for(let i = 0; i < site.mis.length; i++) tgts.push({x:site.mis[i].x, y:site.mis[i].y, r:5, kind:'missile', idx:i});
  const walls = siteBeamWalls(site);
  const res = castLaserForSpace(ox, oy, aimAngle, wp.range, tgts, walls, defenseBeamSpace(site));
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
      if(m.hp <= 0) {
        if(site.mode === 'surface') surfaceExplodeMissile(site, m, false);
        else siteExplodeMissile(site, m, false);
        site.mis.splice(tg.idx, 1);
      }
    }
  }
  if(s.hp <= 0) siteKillShip();
  tone(550, .08, 'sine', .04);
}

function fireDefenseWeapon(site, d, def, aimAngle) {
  const wp = defenseWeapon(def);
  d.a = aimAngle;
  if(wp.fireMode === 'missile') fireDefenseMissile(site, d, def, aimAngle);
  else if(wp.fireMode === 'beam') fireDefenseBeam(site, d, def, aimAngle);
  else fireDefenseKinetic(site, d, def, aimAngle);
  weaponSlot(d,0).cd = defenseCooldown(def);
}

function updateDefense(site, d) {
  if(!d.alive) return;
  const def = defenseDef(d), dc = def.defense;
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
  const sw = weaponSlot(d,0);
  if(--sw.cd <= 0) {
    if(defenseCanFire(d, def, aim.dist, aim.a)) fireDefenseWeapon(site, d, def, aim.a);
    else sw.cd = 8 + Math.floor(Math.random() * 12);
  }
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
