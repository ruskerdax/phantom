'use strict';

const TAP_FRAMES = 8;
const BOMB_GRAVITY = 0.3;

function weaponInheritScale(wp, ctx = {}) {
  if(wp?.inheritShooterVelocity === false) return 0;
  const inherit = ctx?.inherit;
  if(Number.isFinite(inherit)) return inherit;
  return 1;
}

function composeLaunchVelocity(angle, launchSpeed, sourceVx = 0, sourceVy = 0, scale = 1) {
  const a = Number.isFinite(angle) ? angle : 0;
  const spd = Number.isFinite(launchSpeed) ? launchSpeed : 0;
  const inheritScale = Number.isFinite(scale) ? scale : 1;
  const svx = Number.isFinite(sourceVx) ? sourceVx : 0;
  const svy = Number.isFinite(sourceVy) ? sourceVy : 0;
  return {
    vx:Math.sin(a) * spd + svx * inheritScale,
    vy:-Math.cos(a) * spd + svy * inheritScale,
  };
}

function weaponBaseProjectileSpeed(wp) {
  if(!wp) return 0;
  if(wp.fireMode === 'detonate-projectile' && Number.isFinite(wp.slugSpd)) return wp.slugSpd;
  if(Number.isFinite(wp.spd)) return wp.spd;
  if(Number.isFinite(wp.slugSpd)) return wp.slugSpd;
  if(Number.isFinite(wp.pelletSpd)) return wp.pelletSpd;
  return 0;
}

function effectiveLeadSpeed(wp, shooter, angle, ctx = {}) {
  const base = weaponBaseProjectileSpeed(wp);
  const a = Number.isFinite(angle) ? angle : 0;
  const scale = weaponInheritScale(wp, ctx);
  const fwdX = Math.sin(a), fwdY = -Math.cos(a);
  const sourceVx = Number.isFinite(shooter?.vx) ? shooter.vx : 0;
  const sourceVy = Number.isFinite(shooter?.vy) ? shooter.vy : 0;
  return Math.max(0.25, base + (sourceVx * fwdX + sourceVy * fwdY) * scale);
}

function setMissileWorldVelocity(m) {
  const propVx = Number.isFinite(m?.propVx) ? m.propVx : 0;
  const propVy = Number.isFinite(m?.propVy) ? m.propVy : 0;
  const inheritVx = Number.isFinite(m?.inheritVx) ? m.inheritVx : 0;
  const inheritVy = Number.isFinite(m?.inheritVy) ? m.inheritVy : 0;
  m.vx = propVx + inheritVx;
  m.vy = propVy + inheritVy;
  return m;
}

// Build a missile object from a weapon config + ship pose. Fires from the ship's nose,
// inheriting optional shooter velocity. The owner ship's heading sets the missile's
// initial heading; speed starts at wp.spd and ramps to wp.maxSpd via wp.accel each frame.
function spawnMissile(wp, s, mis, opts = {}) {
  const md = MISSILE_TYPES[wp.missileType] || MISSILE_TYPES['standard'];
  const a = opts.angle ?? s.a;
  const offset = opts.offset ?? 13;
  const inheritScale = weaponInheritScale(wp, opts);
  const inheritVx = (s.vx || 0) * inheritScale;
  const inheritVy = (s.vy || 0) * inheritScale;
  const prop = composeLaunchVelocity(a, wp.spd, 0, 0, 0);
  const ox = s.x + Math.sin(a)*offset, oy = s.y - Math.cos(a)*offset;
  mis.push({
    x:ox, y:oy, a,
    vx: prop.vx + inheritVx,
    vy: prop.vy + inheritVy,
    propVx:prop.vx, propVy:prop.vy,
    inheritVx, inheritVy,
    spd:Math.hypot(prop.vx, prop.vy), maxSpd:wp.maxSpd, accel:wp.accel,
    hp:wp.hp, maxHp:wp.hp,
    l:wp.life,
    dmg:wp.dmg, expDmg:wp.expDmg, expR:wp.expR,
    type:wp.missileType||'standard', col:md.col,
    seek:!!wp.seek, seekTurnRate:wp.seekTurnRate, seekTargetKinds:wp.seekTargetKinds, trailTimer:0,
    stickyMissile:wp.fireMode === 'sticky-missile-detonate',
    gravityScale:wp.gravityScale,
    detonateDelayFrames:wp.detonateDelayFrames,
    owner:s,
    ownerSlot:opts.ownerSlot ?? null,
    wpId:wp.id,
  });
  tone(360,.10,'square',.06);
}

function reflectVector(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny;
  return {vx:vx - 2 * dot * nx, vy:vy - 2 * dot * ny};
}

function nearestWallHit(x0, y0, x1, y1, walls=[], radius=0) {
  let best = null;
  for(const wall of walls || []) {
    const [ax, ay, bx, by] = wall;
    const t = segHitParam(x0, y0, x1, y1, ax, ay, bx, by);
    const near = t == null && radius > 0 && dseg(x1, y1, ax, ay, bx, by) <= radius ? 1 : t;
    if(near == null) continue;
    if(!best || near < best.t) {
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len, ny = dx / len;
      if((x1 - x0) * nx + (y1 - y0) * ny > 0) { nx = -nx; ny = -ny; }
      best = {t:near, x:x0 + (x1 - x0) * near, y:y0 + (y1 - y0) * near, nx, ny};
    }
  }
  return best;
}

function ricochetTerrainHit(b, ctx, walls, px, py) {
  if(typeof ctx?.terrainHit === 'function') {
    const info = ctx.terrainHit(b, px, py);
    if(info) {
      const n = (typeof info === 'object' && Number.isFinite(info.nx) && Number.isFinite(info.ny))
        ? info
        : (typeof ctx.terrainNormal === 'function' ? ctx.terrainNormal(b, px, py) : null);
      return {
        x:(typeof info === 'object' && Number.isFinite(info.x)) ? info.x : b.x,
        y:(typeof info === 'object' && Number.isFinite(info.y)) ? info.y : b.y,
        nx:n?.nx ?? -Math.sign(b.vx || 1),
        ny:n?.ny ?? -Math.sign(b.vy || 1)
      };
    }
  }
  return nearestWallHit(px, py, b.x, b.y, walls, b.r ?? 0);
}

function stepRicochetBullet(b, ctx={}, walls=ctx.walls || []) {
  const maxStep = ctx.maxStep ?? 4;
  const sx = b.vx || 0, sy = b.vy || 0, sp = Math.hypot(sx, sy);
  const n = Math.max(1, Math.ceil(sp / maxStep));
  const dx = sx / n, dy = sy / n, dl = 1 / n;
  const wrapX = ctx.wrapX ?? ctx.worldW ?? 0, wrapY = ctx.wrapY ?? ctx.worldH ?? 0;
  for(let k=0;k<n;k++) {
    const px = b.x, py = b.y;
    b.x = wrapX ? wrap(b.x + dx, wrapX) : b.x + dx;
    b.y = wrapY ? wrap(b.y + dy, wrapY) : b.y + dy;
    b.l -= dl;
    if(b.l <= 0) return true;
    if(ctx.terrainFirst) {
      const hit = ricochetTerrainHit(b, ctx, walls, px, py);
      if(hit) {
        if((b.ricochetsLeft || 0) <= 0) return true;
        const r = reflectVector(b.vx, b.vy, hit.nx, hit.ny);
        b.vx = r.vx; b.vy = r.vy;
        b.x = hit.x + hit.nx * ((b.r ?? 0) + .5);
        b.y = hit.y + hit.ny * ((b.r ?? 0) + .5);
        b.ricochetsLeft--;
        if(typeof ctx.onRicochet === 'function') ctx.onRicochet(b, hit);
        return false;
      }
    }
    if(typeof ctx.onProjectileStep === 'function' && ctx.onProjectileStep(b)) return true;
    if(ctx.terrainFirst) continue;
    const hit = ricochetTerrainHit(b, ctx, walls, px, py);
    if(!hit) continue;
    if((b.ricochetsLeft || 0) <= 0) return true;
    const r = reflectVector(b.vx, b.vy, hit.nx, hit.ny);
    b.vx = r.vx; b.vy = r.vy;
    b.x = hit.x + hit.nx * ((b.r ?? 0) + .5);
    b.y = hit.y + hit.ny * ((b.r ?? 0) + .5);
    b.ricochetsLeft--;
    if(typeof ctx.onRicochet === 'function') ctx.onRicochet(b, hit);
    return false;
  }
  return false;
}

function targetIdForSticky(target, kind) {
  return target?.id ?? target?.eid ?? target?.idx ?? `${kind}:${Math.round(target?.x ?? 0)},${Math.round(target?.y ?? 0)}`;
}

function stickProjectile(m, target, kind) {
  if(!m || !target) return null;
  const id = targetIdForSticky(target, kind);
  m.stuckTarget = target;
  m.hasStuck = true;
  m.stuckTo = {
    kind, id,
    offsetX:(m.x ?? 0) - (target.x ?? 0),
    offsetY:(m.y ?? 0) - (target.y ?? 0),
  };
  m.propVx = 0; m.propVy = 0;
  m.vx = 0; m.vy = 0; m.spd = 0;
  return m.stuckTo;
}

function updateStickyProjectile(m, ctx={}) {
  const st = m?.stuckTo;
  if(!st || st.kind === 'terrain') return st?.kind || null;
  const ref = m.stuckTarget && m.stuckTarget.alive !== false ? m.stuckTarget : null;
  const target = ref || (typeof ctx.stickyTarget === 'function' ? ctx.stickyTarget(st) : null);
  if(target && target.alive !== false) {
    m.x = (target.x ?? 0) + st.offsetX;
    m.y = (target.y ?? 0) + st.offsetY;
    return st.kind;
  }
  if(st.kind === 'enemy' || st.kind === 'building' || st.kind === 'turret') {
    m.stuckTo = {kind:'free-fall', id:st.id, offsetX:0, offsetY:0};
    return 'free-fall';
  }
  return st.kind;
}

function findStickyMissile(sw, mis) {
  if(!sw?.stickyMissileId || !Array.isArray(mis)) return null;
  return mis.find(m => m && m.stickyMissile && m.id === sw.stickyMissileId) || null;
}

function finishStickyMissile(m, cooldown = true) {
  if(!m?.stickyMissile) return;
  const sw = m.owner?.weapons?.[m.ownerSlot];
  if(sw && sw.stickyMissileId === m.id) {
    sw.stickyMissileId = null;
    const wp = WEAPON_MAP[m.wpId];
    if(cooldown && wp?.fireMode === 'sticky-missile-detonate') sw.cd = Math.round(wp.cd * 60);
  }
}

function stickMissileToTerrain(m, x = m.x, y = m.y) {
  if(!m) return;
  m.x = x; m.y = y;
  m.propVx = 0; m.propVy = 0;
  m.vx = 0; m.vy = 0; m.spd = 0;
  m.hasStuck = true;
  m.stuckTarget = null;
  m.stuckTo = {kind:'terrain', id:'terrain', offsetX:0, offsetY:0};
}

function triggerStickyMissileDetonation(m, delayFrames = 6) {
  if(!m || m.detonating) return false;
  m.detonating = true;
  m.detonateTimer = Math.max(1, Math.floor(delayFrames || 1));
  return true;
}

function stickyMissileStaticStuck(m) {
  const kind = m?.stuckTo?.kind;
  return kind === 'terrain' || kind === 'enemy' || kind === 'building' || kind === 'turret';
}

function tickStickyMissileState(m, ctx = {}) {
  if(!m?.stickyMissile) return {detonate:false, stuck:false, expired:false};
  updateStickyProjectile(m, ctx);
  const stuck = stickyMissileStaticStuck(m);
  if(m.detonating) {
    if(typeof ctx.flash === 'function') ctx.flash(m);
    if(--m.detonateTimer <= 0) return {detonate:true, stuck, expired:false};
  }
  if(!m.hasStuck && m.l <= 0) return {detonate:false, stuck, expired:true};
  return {detonate:false, stuck, expired:false};
}

function accelerateMissileVector(m, gravity = 0) {
  const inheritVx = Number.isFinite(m?.inheritVx) ? m.inheritVx : 0;
  const inheritVy = Number.isFinite(m?.inheritVy) ? m.inheritVy : 0;
  let propVx = Number.isFinite(m?.propVx) ? m.propVx : ((m?.vx || 0) - inheritVx);
  let propVy = Number.isFinite(m?.propVy) ? m.propVy : ((m?.vy || 0) - inheritVy);
  const accel = m.accel || 0;
  if(accel) {
    const sp = Math.hypot(propVx, propVy);
    if(!Number.isFinite(m.maxSpd) || sp < m.maxSpd) {
      propVx += Math.sin(m.a || 0) * accel;
      propVy -= Math.cos(m.a || 0) * accel;
    }
  }
  if(gravity) propVy += gravity;
  const sp = Math.hypot(propVx, propVy);
  if(Number.isFinite(m.maxSpd) && m.maxSpd > 0 && sp > m.maxSpd) {
    propVx = propVx / sp * m.maxSpd;
    propVy = propVy / sp * m.maxSpd;
  }
  m.propVx = propVx;
  m.propVy = propVy;
  m.spd = Math.hypot(propVx, propVy);
  if(m.spd > 0) m.a = Math.atan2(propVx, -propVy);
  setMissileWorldVelocity(m);
}

function mineTargetDistance(m, target, ctx) {
  if(typeof ctx?.targetDistance === 'function') return ctx.targetDistance(m, target);
  const dx = (target.x ?? 0) - (m.x ?? 0), dy = (target.y ?? 0) - (m.y ?? 0);
  return Math.hypot(dx, dy);
}

function mineTargetDelta(m, target, ctx) {
  if(typeof ctx?.targetDelta === 'function') return ctx.targetDelta(m, target);
  return {dx:(target.x ?? 0) - (m.x ?? 0), dy:(target.y ?? 0) - (m.y ?? 0)};
}

function mineTriggerCheck(m, ctx={}) {
  if(!m || m.triggered) return null;
  const targets = typeof ctx.mineTargets === 'function' ? ctx.mineTargets(m) : [];
  let best = null, bestDist = Infinity;
  for(const t of targets || []) {
    if(!t || t.alive === false) continue;
    const dist = mineTargetDistance(m, t, ctx) - (t.r || 0);
    if(dist <= (m.triggerR || 0) && dist < bestDist) { best = t; bestDist = dist; }
  }
  if(!best) return null;
  m.triggered = true;
  m.triggerTimer = m.triggerDelay ?? 0;
  m.triggerTargetId = targetIdForSticky(best, best.kind || 'enemy');
  m.triggerTargetKind = best.kind || 'enemy';
  const d = mineTargetDelta(m, best, ctx), len = Math.hypot(d.dx, d.dy) || 1;
  m.vx = (m.vx || 0) + d.dx / len * (m.pursuitAccel || 0);
  m.vy = (m.vy || 0) + d.dy / len * (m.pursuitAccel || 0);
  const sp = Math.hypot(m.vx, m.vy), max = m.pursuitMaxSpd || sp;
  if(sp > max) { m.vx = m.vx / sp * max; m.vy = m.vy / sp * max; }
  return best;
}

function heatSeekTurn(m, ctx={}, opts={}) {
  const kinds = opts.kinds || m.seekTargetKinds || ['enemy'];
  const targets = typeof ctx.seekTargets === 'function' ? ctx.seekTargets(m, kinds) : (typeof ctx.lockTargets === 'function' ? ctx.lockTargets(m, null) : []);
  let best = null, bestDist = Infinity, bestDelta = null;
  for(const t of targets || []) {
    if(!t || t.alive === false || (kinds.length && !kinds.includes(t.kind))) continue;
    const d = typeof ctx.seekDelta === 'function' ? ctx.seekDelta(m, t) : mineTargetDelta(m, t, ctx);
    const dist = Math.hypot(d.dx, d.dy);
    if(dist < bestDist) { best = t; bestDist = dist; bestDelta = d; }
  }
  if(!best) return null;
  const targetA = Math.atan2(bestDelta.dx, -bestDelta.dy);
  const turn = Math.max(0, m.seekTurnRate ?? opts.turnRate ?? 0);
  const da = angDiff(m.a || 0, targetA);
  m.a = (m.a || 0) + Math.max(-turn, Math.min(turn, da));
  return best;
}

function persistentProjectileTick(p, ctx={}) {
  if(typeof ctx.movePersistentProjectile === 'function') ctx.movePersistentProjectile(p);
  else {
    p.x += p.vx || 0;
    p.y += p.vy || 0;
  }
  if(Number.isFinite(p.l) && --p.l <= 0) return true;
  if(typeof ctx.terrainHit === 'function' && ctx.terrainHit(p)) return true;
  const targets = typeof ctx.radiusTargets === 'function' ? ctx.radiusTargets(p) : [];
  const outerEvery = Math.max(1, p.outerTickInterval || 1);
  for(const t of targets || []) {
    if(!t || t.alive === false) continue;
    const dist = mineTargetDistance(p, t, ctx);
    const r = t.r || 0;
    if(p.innerR && dist <= p.innerR + r) {
      if(typeof ctx.damageRadiusTarget === 'function') ctx.damageRadiusTarget(t, p.innerDmgPerTick || 0, p);
    } else if(p.outerR && dist <= p.outerR + r && (((typeof G !== 'undefined' ? G.fr : 0) % outerEvery) === 0)) {
      if(typeof ctx.damageRadiusTarget === 'function') ctx.damageRadiusTarget(t, p.outerDmgPerTick || 0, p);
      if(ctx.lsb) ctx.lsb.push({x1:p.x, y1:p.y, x2:t.x, y2:t.y, l:8, col:p.outerBeamColor || '#9df', w:p.outerBeamWidth || 1, wpId:p.wpId});
    }
  }
  return false;
}

const persistentProjectileTargetKinds = new Set(['enemy', 'defense', 'building', 'reactor', 'softpt', 'ship', 'shield']);

function persistentProjectileTerrainHit(p, ctx={}) {
  const r = p.r ?? Math.max(2, Math.min(8, p.innerR || 4));
  if(ctx.walls?.some(w => dseg(p.x, p.y, w[0], w[1], w[2], w[3]) <= r)) return true;
  if(typeof ctx.terrainHit === 'function') return !!ctx.terrainHit(p);
  return false;
}

function movePersistentProjectile(p, ctx={}) {
  const nx = p.x + (p.vx || 0), ny = p.y + (p.vy || 0), space = ctx.space;
  if(space?.toroidal && Number.isFinite(space.worldW) && space.worldW > 0) {
    p.x = wrap(nx, space.worldW);
    p.y = Number.isFinite(space.worldH) && space.worldH > 0 && space.worldH < 100000 ? wrap(ny, space.worldH) : ny;
  } else {
    p.x = nx;
    p.y = ny;
  }
}

function persistentProjectileDistance(p, target, ctx={}) {
  if(typeof ctx.targetDistance === 'function') return ctx.targetDistance(p, target);
  const space = ctx.space;
  if(space?.toroidal && Number.isFinite(space.worldW) && space.worldW > 0) {
    const dy = Number.isFinite(space.worldH) && space.worldH > 0 && space.worldH < 100000
      ? wrapCoordNear(p.y, target.y, space.worldH) - target.y
      : p.y - target.y;
    return Math.hypot(wrapCoordNear(p.x, target.x, space.worldW) - target.x, dy);
  }
  return Math.hypot((target.x ?? 0) - p.x, (target.y ?? 0) - p.y);
}

function persistentProjectileTargets(ctx={}, p=null) {
  const raw = typeof ctx.radiusTargets === 'function' ? ctx.radiusTargets() : (typeof ctx.tgts === 'function' ? ctx.tgts() : []);
  const allowed = Array.isArray(p?.radiusTargetKinds) ? new Set(p.radiusTargetKinds) : persistentProjectileTargetKinds;
  return (Array.isArray(raw) ? raw : []).filter(t => t && t.alive !== false && allowed.has(t.kind));
}

function damagePersistentProjectileTarget(target, dmg, p, wp, ctx={}) {
  if(dmg <= 0 || typeof ctx.onBeamHit !== 'function') return;
  const hitWp = {...wp, dmg, range:p.innerR || wp.innerR || 1};
  ctx.onBeamHit(target, hitWp, {
    x1:p.x, y1:p.y,
    x2:target.x ?? p.x, y2:target.y ?? p.y,
    a:flightAngle(p),
  });
}

function persistentProjectileContext(wp, ctx={}) {
  return {
    ...ctx,
    movePersistentProjectile:p => movePersistentProjectile(p, ctx),
    terrainHit:p => persistentProjectileTerrainHit(p, ctx),
    radiusTargets:p => persistentProjectileTargets(ctx, p),
    targetDistance:(p, target) => persistentProjectileDistance(p, target, ctx),
    damageRadiusTarget:(target, dmg, p) => damagePersistentProjectileTarget(target, dmg, p, wp, ctx),
  };
}

function tickPersistentProjectilesForActor(owner, slot, wp, projectiles, ctx={}) {
  if(!Array.isArray(projectiles)) return;
  const pctx = persistentProjectileContext(wp, ctx);
  for(let i=projectiles.length-1;i>=0;i--) {
    const p = projectiles[i];
    if(!p?.persistentProjectile || p.owner !== owner || p.ownerSlot !== slot) continue;
    if(persistentProjectileTick(p, pctx)) projectiles.splice(i, 1);
  }
}

const arcChainTargetKinds = new Set(['enemy', 'defense']);

function arcTargetKey(t) {
  return t?.id ?? `${t?.kind || 'target'}:${t?.idx ?? Math.round(t?.x ?? 0)+','+Math.round(t?.y ?? 0)}`;
}

function arcPointNear(x, y, refX, refY, ctx={}) {
  const space = ctx.space;
  if(space?.toroidal && Number.isFinite(space.worldW) && space.worldW > 0) {
    return {
      x:wrapCoordNear(x, refX, space.worldW),
      y:Number.isFinite(space.worldH) && space.worldH > 0 && space.worldH < 100000 ? wrapCoordNear(y, refY, space.worldH) : y,
    };
  }
  return {x, y};
}

function arcTargetInfo(srcX, srcY, target, ctx={}) {
  const p = arcPointNear(target.x ?? srcX, target.y ?? srcY, srcX, srcY, ctx);
  const dx = p.x - srcX, dy = p.y - srcY;
  return {...target, x:p.x, y:p.y, dx, dy, dist:Math.hypot(dx, dy), key:arcTargetKey(target)};
}

function arcVisualLine(lsb, x1, y1, x2, y2, wp) {
  if(!lsb) return;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  let px = x1, py = y1;
  for(let i=1;i<=3;i++) {
    const t = i / 3;
    const jitter = (i % 2 ? 1 : -1) * 4;
    const qx = i === 3 ? x2 : x1 + dx * t + nx * jitter;
    const qy = i === 3 ? y2 : y1 + dy * t + ny * jitter;
    lsb.push({x1:px, y1:py, x2:qx, y2:qy, l:10, col:'#dff', w:1.5, wpId:wp.id});
    px = qx; py = qy;
  }
}

function arcFlash(lsb, x, y, wp) {
  if(!lsb) return;
  lsb.push({x1:x-5, y1:y, x2:x+5, y2:y, l:10, col:'#fff', w:1, wpId:wp.id});
  lsb.push({x1:x, y1:y-5, x2:x, y2:y+5, l:10, col:'#fff', w:1, wpId:wp.id});
}

function arcApplyHit(target, dmg, wp, ctx, srcX, srcY) {
  if(typeof ctx.onBeamHit !== 'function') return;
  ctx.onBeamHit(target, {...wp, dmg}, {x1:srcX, y1:srcY, x2:target.x, y2:target.y, a:Math.atan2(target.x - srcX, -(target.y - srcY))});
}

const stepBulletBase = stepBullet;
stepBullet = function(b, wrapX, wrapY, maxStep, onStep) {
  if(b?.persistentProjectile) return false;
  return stepBulletBase(b, wrapX, wrapY, maxStep, onStep);
};

function weaponMechanicsInlineTest() {
  const b = {x:0,y:0,vx:10,vy:0,l:20,ricochetsLeft:1,r:0};
  const ricochetConsumed = stepRicochetBullet(b, {}, [[5,-5,5,5]]);
  const m = {x:2,y:3};
  const stuck = stickProjectile(m, {id:'t',x:1,y:1}, 'enemy');
  const mine = {x:0,y:0,vx:0,vy:0,triggerR:10,triggerDelay:3,pursuitAccel:1,pursuitMaxSpd:2};
  const mineTarget = mineTriggerCheck(mine, {mineTargets:()=>[{id:'e',kind:'enemy',x:5,y:0,r:1,alive:true}]});
  const seek = {x:0,y:0,a:0,seekTurnRate:.1};
  const seekTarget = heatSeekTurn(seek, {seekTargets:()=>[{id:'e',kind:'enemy',x:10,y:0,alive:true}]});
  let radiusDamage = 0;
  const expired = persistentProjectileTick({x:0,y:0,vx:0,vy:0,l:2,innerR:5,innerDmgPerTick:2}, {
    radiusTargets:()=>[{id:'e',kind:'enemy',x:3,y:0,r:1,alive:true}],
    damageRadiusTarget:()=>{radiusDamage += 2;}
  });
  return {
    ricochet:!ricochetConsumed && b.ricochetsLeft === 0 && b.vx < 0,
    sticky:stuck?.id === 't' && stuck.offsetX === 1 && stuck.offsetY === 2,
    mine:mineTarget?.id === 'e' && mine.triggered === true,
    heatSeek:seekTarget?.id === 'e' && seek.a > 0,
    persistent:expired === false && radiusDamage === 2,
  };
}

function projectileId(prefix='p') {
  return `${prefix}:${G?.fr ?? 0}:${Math.random().toString(36).slice(2)}`;
}

function shotgunPatternAngles(center, count, arcRad) {
  const n = Math.max(1, Math.floor(count || 1));
  const spread = arcRad ?? 0;
  return Array.from({length:n}, () => center + (Math.random() - .5) * spread);
}

function findActiveSlug(sw, bul) {
  if(!sw?.activeSlugId || !Array.isArray(bul)) return null;
  return bul.find(b => b && b.slug && b.id === sw.activeSlugId) || null;
}

function finishSlugProjectile(b) {
  if(!b?.slug) return;
  const sw = b?.owner?.weapons?.[b.ownerSlot];
  if(sw && sw.activeSlugId === b.id) {
    sw.activeSlugId = null;
    const wp = WEAPON_MAP[b.wpId];
    if(wp?.fireMode === 'detonate-projectile') sw.cd = Math.round(wp.cd * 60);
  }
}

function finishConsumedProjectile(b, bul) {
  if(b?.slug && b.l <= 0) {
    const wp = WEAPON_MAP[b.wpId];
    if(wp?.fireMode === 'detonate-projectile' && b.owner && b.ownerSlot !== undefined) {
      return detonateSlug(wp, b.owner, b.ownerSlot, bul, {ammoCost:0});
    }
  }
  finishSlugProjectile(b);
  return false;
}

function detonateSlug(wp, s, slot, bul, ctx = {}) {
  const sw = weaponSlot(s, slot);
  const slug = findActiveSlug(sw, bul);
  if(!slug) {
    sw.activeSlugId = null;
    return false;
  }
  const sp = Math.hypot(slug.vx || 0, slug.vy || 0) || 1;
  const center = Math.atan2(slug.vx || 0, -(slug.vy || -sp));
  const count = Math.max(1, Math.floor(wp.pelletCount || 1));
  const inheritScale = weaponInheritScale(wp, ctx);
  for(const a of shotgunPatternAngles(center, count, wp.pelletArcRad)) {
    const v = composeLaunchVelocity(a, wp.pelletSpd, slug.vx || 0, slug.vy || 0, inheritScale);
    bul.push({
      x:slug.x, y:slug.y,
      vx:v.vx,
      vy:v.vy,
      l:wp.pelletLife,
      dmg:wp.pelletDmg,
      wpId:wp.id,
    });
  }
  const idx = bul.indexOf(slug);
  if(idx >= 0) bul.splice(idx, 1);
  sw.activeSlugId = null;
  sw.cd = ctx.cooldownFrames ?? Math.round(wp.cd * 60);
  tone(620,.06,'square',.06);
  return true;
}

// Weapon firing mechanic behavior - keyed by wp.fireMode.
const WEAPON_TYPES = {
  'projectile': {
    fire(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const count = Math.max(1, Math.floor(ctx.count ?? 1));
      const spread = ctx.spread ?? 0;
      const center = ctx.angle ?? s.a;
      const angles = Array.isArray(ctx.angles) ? ctx.angles.slice(0, count) : Array.from({length:count}, (_, k) => center + (k - (count - 1) / 2) * spread);
      const offset = ctx.offset ?? 13;
      const inheritScale = weaponInheritScale(wp, ctx);
      for(const a of angles) {
        const v = composeLaunchVelocity(a, wp.spd, s.vx || 0, s.vy || 0, inheritScale);
        bul.push({
          x:s.x+Math.sin(a)*offset, y:s.y-Math.cos(a)*offset,
          vx:v.vx, vy:v.vy,
          l:wp.life, dmg:wp.dmg, col:ctx.projectileColor, wpId:wp.id,
          ricochetProjectile:wp.ricochetsMax !== undefined,
          ricochetsLeft:wp.ricochetsMax ?? 0,
        });
      }
      sw.cd = ctx.cooldownFrames ?? Math.round(wp.cd*60);
      if(ctx.projectileTone) tone(...ctx.projectileTone);
      else tone(900,.04,'square',.05);
    }
  },
  'magazine-burst': {
    fire(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const count = Math.max(1, Math.floor(wp.burstCount ?? 1));
      const center = ctx.angle ?? s.a;
      const offset = ctx.offset ?? 13;
      const inheritScale = weaponInheritScale(wp, ctx);
      for(const a of shotgunPatternAngles(center, count, wp.burstSpread)) {
        const v = composeLaunchVelocity(a, wp.spd, s.vx || 0, s.vy || 0, inheritScale);
        bul.push({
          x:s.x + Math.sin(a) * offset,
          y:s.y - Math.cos(a) * offset,
          vx:v.vx,
          vy:v.vy,
          l:wp.life,
          dmg:wp.dmg,
          wpId:wp.id,
        });
      }
      sw.cd = ctx.cooldownFrames ?? Math.round(wp.cd * 60);
      tone(720,.05,'square',.06);
    }
  },
  'spooled-projectile': {
    fire(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const a = (ctx.angle ?? s.a) + (Math.random() * 2 - 1) * (wp.fireSpread ?? 0);
      const offset = ctx.offset ?? 13;
      const inheritScale = weaponInheritScale(wp, ctx);
      const ox = s.x + Math.sin(a) * offset;
      const oy = s.y - Math.cos(a) * offset;
      const v = composeLaunchVelocity(a, wp.spd, s.vx || 0, s.vy || 0, inheritScale);
      bul.push({
        x:ox,
        y:oy,
        vx:v.vx,
        vy:v.vy,
        l:wp.life,
        dmg:wp.dmg,
        wpId:wp.id,
      });
      if(ctx.lsb) ctx.lsb.push({x1:ox,y1:oy,x2:ox+Math.sin(a)*7,y2:oy-Math.cos(a)*7,l:3,col:'#fff',w:1,wpId:wp.id});
      sw.cd = ctx.cooldownFrames ?? Math.max(1, Math.round(wp.cd));
      tone(1400,.025,'square',.035);
    },
    tick(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const frames = Math.max(1, Math.floor(wp.spoolFrames || 1));
      const step = 1 / frames;
      const prev = Math.max(0, Math.min(1, sw.spool || 0));
      const held = !!sw.input?.pressed;
      if(held) {
        if(prev <= 0 && sw.input.pressedFrames === 1) toneRise(800,1400,.1,'sine',.04);
        sw.spool = Math.min(1, prev + step);
        if(1 - sw.spool < 1e-9) sw.spool = 1;
      } else {
        if(sw.input?.justReleased && prev > 0) {
          const f0 = 800 + 600 * prev;
          if(typeof toneSlide === 'function') toneSlide(f0,800,frames/60,'sine',.035);
          else tone(f0,frames/60,'sine',.035);
        }
        sw.spool = Math.max(0, prev - step);
      }
      if(!held || sw.spool < 1 || sw.cd > 0) return false;
      return tryFire(wp, this, s, slot, bul, ctx);
    }
  },
  'detonate-projectile': {
    fire(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const active = findActiveSlug(sw, bul);
      if(active) {
        detonateSlug(wp, s, slot, bul, ctx);
        return;
      }
      sw.activeSlugId = null;
      const a = ctx.angle ?? s.a;
      const offset = ctx.offset ?? 13;
      const inheritScale = weaponInheritScale(wp, ctx);
      const v = composeLaunchVelocity(a, wp.slugSpd, s.vx || 0, s.vy || 0, inheritScale);
      const id = projectileId('slug');
      bul.push({
        id,
        x:s.x + Math.sin(a) * offset,
        y:s.y - Math.cos(a) * offset,
        vx:v.vx,
        vy:v.vy,
        l:wp.slugLife,
        dmg:wp.slugDmg,
        slug:true,
        owner:s,
        ownerSlot:slot,
        wpId:wp.id,
      });
      sw.activeSlugId = id;
      tone(420,.05,'square',.05);
    }
  },
  'sticky-missile-detonate': {
    fire(wp, s, slot, _bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const active = findStickyMissile(sw, ctx.mis);
      if(active) {
        triggerStickyMissileDetonation(active, wp.detonateDelayFrames);
        tone(180,.04,'square',.05);
        return;
      }
      sw.stickyMissileId = null;
      const id = projectileId('sticky-missile');
      spawnMissile(wp, s, ctx.mis, {angle:ctx.angle ?? s.a, offset:ctx.offset ?? 13, inherit:ctx.inherit, ownerSlot:slot});
      const m = ctx.mis?.[ctx.mis.length - 1];
      if(m) {
        m.id = id;
        m.ownerSlot = slot;
        sw.stickyMissileId = id;
      }
    }
  },
  'persistent-projectile': {
    fire(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const a = ctx.angle ?? s.a;
      const offset = ctx.offset ?? 13;
      const inheritScale = weaponInheritScale(wp, ctx);
      const v = composeLaunchVelocity(a, wp.spd, s.vx || 0, s.vy || 0, inheritScale);
      bul.push({
        x:s.x + Math.sin(a) * offset,
        y:s.y - Math.cos(a) * offset,
        vx:v.vx,
        vy:v.vy,
        l:wp.life,
        r:Math.max(2, Math.min(8, wp.innerR || 4)),
        innerR:wp.innerR,
        innerDmgPerTick:wp.innerDmgPerTick,
        outerR:wp.outerR,
        outerDmgPerTick:wp.outerDmgPerTick,
        outerTickInterval:wp.outerTickInterval,
        persistentProjectile:true,
        owner:s,
        ownerSlot:slot,
        wpId:wp.id,
      });
      sw.cd = ctx.cooldownFrames ?? Math.round(wp.cd * 60);
      tone(760, .06, 'sine', .05);
    },
    tick(wp, s, slot, bul, ctx = {}) {
      tickPersistentProjectilesForActor(s, slot, wp, bul, ctx);
    }
  },
  'charged-persistent-projectile': {
    fire(wp, s, slot, bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const a = ctx.angle ?? s.a;
      const offset = ctx.offset ?? 13;
      const inheritScale = weaponInheritScale(wp, ctx);
      const held = Math.max(wp.chargeMin, Math.min(wp.chargeMax, chargeFramesForSlot(s, slot)));
      const span = Math.max(1, wp.chargeMax - wp.chargeMin);
      const level = Math.max(0, Math.min(1, (held - wp.chargeMin) / span));
      const innerR = wp.innerRMin + (wp.innerRMax - wp.innerRMin) * level;
      const outerR = wp.outerRMin + (wp.outerRMax - wp.outerRMin) * level;
      const v = composeLaunchVelocity(a, wp.spd, s.vx || 0, s.vy || 0, inheritScale);
      bul.push({
        x:s.x + Math.sin(a) * offset,
        y:s.y - Math.cos(a) * offset,
        vx:v.vx,
        vy:v.vy,
        l:wp.life,
        r:Math.max(2, Math.min(10, innerR * .35)),
        innerR,
        innerDmgPerTick:wp.innerDmgPerTick,
        outerR,
        outerDmgPerTick:wp.outerDmgPerTick,
        outerTickInterval:wp.outerTickInterval,
        outerBeamColor:'#9df',
        outerBeamWidth:1,
        chargeLevel:level,
        radiusTargetKinds:['enemy','defense','building','reactor','softpt','ship','shield','rock','missile'],
        persistentProjectile:true,
        owner:s,
        ownerSlot:slot,
        wpId:wp.id,
      });
      sw.cd = ctx.cooldownFrames ?? (wp.cd ? Math.round(wp.cd * 60) : 0);
      tone(520 + level * 420, .09, 'sine', .06);
    },
    tick(wp, s, slot, bul, ctx = {}) {
      tickPersistentProjectilesForActor(s, slot, wp, bul, ctx);
    }
  },
  'charged-cone-chain': {
    fire(wp, s, slot, _bul, ctx = {}) {
      const sw = weaponSlot(s, slot);
      const a = ctx.angle ?? s.a;
      const srcX = s.x + Math.sin(a) * (ctx.offset ?? 13);
      const srcY = s.y - Math.cos(a) * (ctx.offset ?? 13);
      const halfCone = (wp.coneAngleRad ?? 0) * .5;
      const targets = (typeof ctx.tgts === 'function' ? ctx.tgts() : [])
        .filter(t => t && arcChainTargetKinds.has(t.kind))
        .map(t => arcTargetInfo(srcX, srcY, t, ctx));
      const primaryHits = targets.filter(t => t.dist <= wp.coneLength && Math.abs(angDiff(a, Math.atan2(t.dx, -t.dy))) <= halfCone);
      const hitKeys = new Set(primaryHits.map(t => t.key));
      for(const primary of primaryHits) arcApplyHit(primary, wp.primaryDmg, wp, ctx, srcX, srcY);
      for(const primary of primaryHits) {
        const path = [primary];
        let current = primary;
        for(let hop=0; hop<Math.min(wp.chainHopsMax ?? 0, wp.chainDamages?.length ?? 0); hop++) {
          let best = null, bestDist = Infinity;
          for(const candidate of targets) {
            if(hitKeys.has(candidate.key)) continue;
            const p = arcPointNear(candidate.x, candidate.y, current.x, current.y, ctx);
            const dist = Math.hypot(p.x - current.x, p.y - current.y);
            if(dist <= wp.chainHopMaxDist && dist < bestDist) {
              best = {...candidate, x:p.x, y:p.y};
              bestDist = dist;
            }
          }
          if(!best) break;
          hitKeys.add(best.key);
          arcApplyHit(best, wp.chainDamages[hop], wp, ctx, current.x, current.y);
          path.push(best);
          current = best;
        }
        let lx = srcX, ly = srcY;
        for(const p of path) {
          arcVisualLine(ctx.lsb, lx, ly, p.x, p.y, wp);
          arcFlash(ctx.lsb, p.x, p.y, wp);
          lx = p.x; ly = p.y;
        }
      }
      sw.cd = ctx.cooldownFrames ?? Math.round((wp.cd ?? 0) * 60);
      tone(980, .08, 'sawtooth', .06);
    }
  },
  'beam': {
    fire(wp, s, slot) {
      const sw = weaponSlot(s, slot);
      sw.pulsesLeft = wp.pulses;
      sw.pulseTimer = wp.chargeDelay ?? 1;
    },
    // Advances one laser pulse; returns castLaser result or null if timer not ready.
    // Caller is responsible for building tgts (context-specific) and handling the hit.
    // If wp.persist is set and a pulse misses, the same ray is re-cast for that many
    // additional frames so targets moving through the beam path still register hits.
    tick(wp, s, slot, tgts, lsb, walls=[], space=null, ctx = {}) {
      const sw = weaponSlot(s, slot);
      if(--sw.pulseTimer>0){
        if(wp.chargeTone&&sw.pulseTimer===wp.chargeDelay-1)toneRise(wp.chargeTone[0],wp.chargeTone[1],wp.chargeDelay/60,wp.chargeTone[2],wp.chargeTone[3]);
        if(sw.persistBeam&&sw.persistBeam.l-->0){
          const{ox,oy,a,range,hitPad}=sw.persistBeam;
          const res=castLaserForSpace(ox,oy,a,range,tgts,walls,space,hitPad);
          if(res.hitIdx>=0){sw.persistBeam.l=0;res.x1=ox;res.y1=oy;res.a=a;return res;}
        }
        return null;
      }
      const offset = ctx.offset ?? 13;
      const ox=s.x+Math.sin(s.a)*offset,oy=s.y-Math.cos(s.a)*offset;
      const hitPad=typeof beamHitPadding==='function'?beamHitPadding(wp):Math.max(2,(wp.beamWidth??2)*.5);
      const res=castLaserForSpace(ox,oy,s.a,wp.range,tgts,walls,space,hitPad);
      res.x1=ox;res.y1=oy;res.a=s.a;
      lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:ctx.beamColor ?? wp.beamColor ?? '#0cf',w:wp.beamWidth??2,wpId:wp.id});
      if(ctx.beamTone)tone(...ctx.beamTone);else if(wp.beamSound)tone(...wp.beamSound);else tone(1200,.08,'sine',.05);
      if(wp.persist&&res.hitIdx<0)sw.persistBeam={ox,oy,a:s.a,range:wp.range,hitPad,l:wp.persist};
      else sw.persistBeam=null;
      sw.pulsesLeft--;
      if(sw.pulsesLeft>0)sw.pulseTimer=wp.pulseCd;else sw.cd=ctx.cooldownFrames ?? Math.round(wp.cd*60);
      return res;
    }
  },
  'missile': {
    fire(wp, s, slot, _bul, ctx = {}) {
      // Same pattern as beam gun: fire() only arms the volley; tick() spawns each missile.
      const sw = weaponSlot(s, slot);
      const rawCount = ctx.count ?? wp.salvo ?? 1;
      const count = Number.isFinite(rawCount) ? Math.max(1, Math.floor(rawCount)) : 1;
      const spread = ctx.spread ?? 0;
      const center = ctx.angle ?? s.a;
      sw.salvoAngles = Array.isArray(ctx.angles) ? ctx.angles.slice(0, count) : Array.from({length:count}, (_, k) => center + (k - (count - 1) / 2) * spread);
      sw.salvoOffset = ctx.offset ?? 13;
      sw.salvoInherit = Number.isFinite(ctx.inherit) ? ctx.inherit : undefined;
      sw.misTimer = 1;
      sw.misLeft = sw.salvoAngles.length;
    },
    tick(wp, s, slot, mis, ctx = {}) {
      const sw = weaponSlot(s, slot);
      if(--sw.misTimer>0)return;
      const idx = (sw.salvoAngles?.length || sw.misLeft) - sw.misLeft;
      const angle = sw.salvoAngles?.[idx] ?? ctx.angle ?? s.a;
      spawnMissile(wp,s,mis,{angle, offset:sw.salvoOffset ?? ctx.offset ?? 13, inherit:sw.salvoInherit, ownerSlot:slot});
      sw.misLeft--;
      if(sw.misLeft>0)sw.misTimer=wp.salvoCd;else {
        sw.cd=ctx.cooldownFrames ?? Math.round(wp.cd*60);
        sw.salvoAngles=null;
      }
    }
  }
};

function weaponEffectiveRange(wp) {
  return wp.range??(wp.life&&wp.spd?wp.life*wp.spd:Infinity);
}

function weaponCooldownFrames(wp) {
  return Math.round(wp.cd*60);
}

function beamHitPadding(wp) {
  return wp?.beamHitPadding??Math.max(2,(wp?.beamWidth??2)*.5);
}

function weaponHasAmmo(wp) {
  return wp?.ammoMax !== undefined;
}

function weaponHasMagazine(wp) {
  return wp?.magMax !== undefined;
}

function weaponHasCharge(wp) {
  return wp?.chargeMin !== undefined && wp?.chargeMax !== undefined;
}

function currentAmmoForSlot(s, slot) {
  const ammo = s?.weapons?.[slot]?.ammo;
  return ammo ?? null;
}

function currentMagForSlot(s, slot) {
  const mag = s?.weapons?.[slot]?.mag;
  return mag ?? null;
}

function currentReloadingForSlot(s, slot) {
  const sw = s?.weapons?.[slot];
  return sw ? {reloading:!!sw.reloading, reloadFrames:Math.max(0, Math.floor(sw.reloadFrames || 0))} : {reloading:false, reloadFrames:0};
}

function currentChargeForSlot(s, slot) {
  const frames = s?.weapons?.[slot]?.chargeFrames;
  return Number.isFinite(frames) ? Math.max(0, Math.floor(frames)) : 0;
}

function consumeAmmo(s, slot, n=1) {
  const sw = weaponSlot(s, slot);
  if(sw.ammo === null || sw.ammo === undefined) return null;
  sw.ammo = Math.max(0, sw.ammo - Math.max(0, n));
  return sw.ammo;
}

function consumeMag(s, slot) {
  const sw = weaponSlot(s, slot);
  if(sw.mag === null || sw.mag === undefined || sw.mag <= 0) return false;
  sw.mag--;
  return true;
}

function ammoForWeapon(wp, savedAmmo=undefined) {
  if(!weaponHasAmmo(wp)) return null;
  if(savedAmmo === undefined || savedAmmo === null || !Number.isFinite(savedAmmo)) return wp.ammoMax;
  return Math.max(0, Math.min(wp.ammoMax, Math.floor(savedAmmo)));
}

function magForWeapon(wp, savedMag=undefined) {
  if(!weaponHasMagazine(wp)) return null;
  if(savedMag === undefined || savedMag === null || !Number.isFinite(savedMag)) return wp.magMax;
  return Math.max(0, Math.min(wp.magMax, Math.floor(savedMag)));
}

function refillAmmoForLoadout(s, opts = {}) {
  if(!s) return;
  const count = Math.max(2, s.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++){
    const wp = wpSlot(i);
    if(opts.skipMagazines && weaponHasMagazine(wp)) continue;
    weaponSlot(s, i).ammo = ammoForWeapon(wp);
  }
}

function fillMagFromReserve(s, slot, wp) {
  if(!weaponHasMagazine(wp)) return null;
  const sw = weaponSlot(s, slot);
  sw.mag = magForWeapon(wp, sw.mag);
  const missing = Math.max(0, wp.magMax - sw.mag);
  if(missing <= 0) return sw.mag;
  if(weaponHasAmmo(wp)){
    const available = Math.max(0, sw.ammo ?? 0);
    const moved = Math.min(missing, available);
    sw.mag += moved;
    sw.ammo = available - moved;
  }else{
    sw.mag = wp.magMax;
  }
  return sw.mag;
}

function refillMagsForLoadout(s) {
  if(!s) return;
  const count = Math.max(2, s.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++){
    const sw = weaponSlot(s, i), wp = wpSlot(i);
    sw.mag = magForWeapon(wp, sw.mag);
    sw.reloading = false;
    sw.reloadFrames = 0;
    fillMagFromReserve(s, i, wp);
  }
}

function restoreAmmoForLoadout(s, currentAmmo) {
  if(!s) return;
  const count = Math.max(2, s.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++) weaponSlot(s, i).ammo = ammoForWeapon(wpSlot(i), Array.isArray(currentAmmo) ? currentAmmo[i] : undefined);
}

function restoreMagsForLoadout(s, currentMag, currentReloading) {
  if(!s) return;
  const count = Math.max(2, s.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++){
    const wp = wpSlot(i), sw = weaponSlot(s, i);
    sw.mag = magForWeapon(wp, Array.isArray(currentMag) ? currentMag[i] : undefined);
    const reload = Array.isArray(currentReloading) ? currentReloading[i] : null;
    sw.reloading = !!(weaponHasMagazine(wp) && reload?.reloading);
    sw.reloadFrames = sw.reloading ? Math.max(0, Math.floor(reload.reloadFrames || 0)) : 0;
  }
}

function restoreChargeForLoadout(s, currentCharge) {
  if(!s) return;
  const count = Math.max(2, s.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++){
    const wp = wpSlot(i), sw = weaponSlot(s, i);
    const saved = Array.isArray(currentCharge) ? currentCharge[i] : 0;
    const frames = weaponHasCharge(wp) && Number.isFinite(saved) ? Math.max(0, Math.min(wp.chargeMax, Math.floor(saved))) : 0;
    sw.chargeFrames = frames;
    sw.charge = frames;
  }
}

function copyAmmoStateForLoadout(src, dst) {
  if(!src || !dst) return;
  const count = Math.max(2, dst.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++) weaponSlot(dst, i).ammo = ammoForWeapon(wpSlot(i), currentAmmoForSlot(src, i));
}

function copyMagStateForLoadout(src, dst) {
  if(!src || !dst) return;
  const count = Math.max(2, dst.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++){
    const wp = wpSlot(i), sw = weaponSlot(dst, i), srcReload = currentReloadingForSlot(src, i);
    sw.mag = magForWeapon(wp, currentMagForSlot(src, i));
    sw.reloading = !!(weaponHasMagazine(wp) && srcReload.reloading);
    sw.reloadFrames = srcReload.reloadFrames;
  }
}

function ammoForMountedWeapon(wp, slotState=null) {
  if(!weaponHasAmmo(wp)) return null;
  const ammo = slotState?.ammo;
  return ammo === undefined || ammo === null ? wp.ammoMax : ammoForWeapon(wp, ammo);
}

function magForMountedWeapon(wp, slotState=null) {
  if(!weaponHasMagazine(wp)) return null;
  const mag = slotState?.mag;
  return mag === undefined || mag === null ? wp.magMax : magForWeapon(wp, mag);
}

function beginReload(s, slot) {
  const wp = wpSlot(slot);
  if(!weaponHasMagazine(wp)) return false;
  const sw = weaponSlot(s, slot);
  sw.mag = magForWeapon(wp, sw.mag);
  if(sw.reloading || sw.mag >= wp.magMax) return false;
  sw.reloading = true;
  sw.reloadFrames = Math.max(1, Math.ceil((wp.reloadSec ?? 3) * 60));
  return true;
}

function tickReload(s, slot) {
  const wp = wpSlot(slot), sw = weaponSlot(s, slot);
  if(!weaponHasMagazine(wp)){
    sw.mag = null;
    sw.reloading = false;
    sw.reloadFrames = 0;
    return;
  }
  sw.mag = magForWeapon(wp, sw.mag);
  if(!sw.reloading) return;
  sw.reloadFrames = Math.max(0, (sw.reloadFrames || 0) - 1);
  if(sw.reloadFrames > 0) return;
  fillMagFromReserve(s, slot, wp);
  sw.reloading = false;
}

// Fire a weapon, deducting energyCost/ammo if defined and the actor tracks them.
// Returns false if the actor lacks energy/ammo, true otherwise.
function tryFire(wp, wt, s, slot, bul, ctx = {}) {
  const ammoCost = Math.max(0, Math.floor(ctx.ammoCost ?? 1));
  if (weaponHasMagazine(wp)) {
    const mag = currentMagForSlot(s, slot);
    if (mag === null || mag <= 0) {
      tone(140,.035,'square',.04);
      return false;
    }
  } else
  if (weaponHasAmmo(wp)) {
    const ammo = currentAmmoForSlot(s, slot);
    if (ammo === null || ammo < ammoCost) return false;
  }
  const energyCost = wp.energyCost ?? wp.fireEnergyCost;
  if (energyCost !== undefined && s.energy !== undefined) {
    if (typeof syncShipEnergyProfile === 'function') syncShipEnergyProfile(s);
    if (s.energy < energyCost) return false;
    s.energy = Math.max(0, s.energy - energyCost);
  }
  if (weaponHasMagazine(wp)) consumeMag(s, slot);
  else if (weaponHasAmmo(wp)) consumeAmmo(s, slot, ammoCost);
  wt.fire(wp, s, slot, bul, ctx);
  return true;
}

function updateWeaponInputState(s, slot, pressed) {
  const sw = weaponSlot(s, slot);
  if(pressed) {
    sw.input.pressedFrames = sw.input.pressed ? sw.input.pressedFrames + 1 : 1;
    sw.input.justReleased = false;
  } else {
    sw.input.justReleased = !!sw.input.pressed;
    sw.input.releasedAfterFrames = sw.input.pressedFrames;
    sw.input.pressedFrames = 0;
  }
  sw.input.pressed = !!pressed;
  return sw.input;
}

function runAiWeaponSlot(s, slot, wp, ctx) {
  const wt = WEAPON_TYPES[wp.fireMode];
  if(!wt) throw new Error(`Weapon ${wp.id} has unknown fire mode ${wp.fireMode}`);
  const sw = weaponSlot(s, slot);
  if(sw.cd > 0) sw.cd--;
  let beamHitResult = false;
  if(sw.pulsesLeft > 0 && wt.tick) {
    const tgts = ctx.tgts ? ctx.tgts() : [];
    const res = wt.tick(wp, s, slot, tgts, ctx.lsb, ctx.walls || [], ctx.space || null, ctx);
    if(res && res.hitIdx >= 0 && ctx.onBeamHit) beamHitResult = !!ctx.onBeamHit(tgts[res.hitIdx], wp, res);
  }
  if(wp.fireMode === 'persistent-projectile' && wt.tick) wt.tick(wp, s, slot, ctx.bul, ctx);
  if(sw.misLeft > 0 && wt.tick && wp.fireMode === 'missile') wt.tick(wp, s, slot, ctx.mis, ctx);
  const policy = WEAPON_AI_POLICIES[wp.aiPolicy];
  if(!policy) throw new Error(`Weapon ${wp.id} has unknown AI policy ${wp.aiPolicy}`);
  policy.update(s, slot, wp, ctx);
  if(sw.input.pressed && !sw.cd && !sw.pulsesLeft && !sw.misLeft) {
    const hasSlug = wp.fireMode === 'detonate-projectile' && !!findActiveSlug(sw, ctx.bul);
    const hasSticky = wp.fireMode === 'sticky-missile-detonate' && !!findStickyMissile(sw, ctx.mis);
    const fired = tryFire(wp, wt, s, slot, ctx.bul, (hasSlug || hasSticky) ? {...ctx, ammoCost:0} : ctx);
    if(!fired && ctx.retryCooldown) sw.cd = ctx.retryCooldown();
    return beamHitResult;
  }
  return beamHitResult;
}

function resetCharge(s, slot) {
  const sw = s?.weapons?.[slot];
  if(!sw) return;
  sw.charge = 0;
  sw.chargeFrames = 0;
}

function cancelActiveCharges(s) {
  if(!s?.weapons) return;
  for(let i=0;i<s.weapons.length;i++) resetCharge(s, i);
}

function chargeFramesForSlot(s, slot) {
  const frames = weaponSlot(s, slot).chargeFrames;
  return Number.isFinite(frames) ? Math.max(0, frames) : 0;
}

function chargeReady(s, slot, wp) {
  return weaponHasCharge(wp) && chargeFramesForSlot(s, slot) >= wp.chargeMin;
}

function chargeProgress(s, slot, wp) {
  if(!weaponHasCharge(wp) || wp.chargeMax <= 0) return 0;
  return Math.max(0, Math.min(1, chargeFramesForSlot(s, slot) / wp.chargeMax));
}

function tickCharge(s, slot, wp) {
  if(!weaponHasCharge(wp)) return 0;
  const sw = weaponSlot(s, slot);
  if(!sw.input?.pressed) return sw.chargeFrames;
  const atCap = sw.chargeFrames >= wp.chargeMax;
  const drain = atCap ? (wp.chargeHoldDrainPerFrame ?? 0) : (wp.chargeEnergyDrainPerFrame ?? 0);
  if(s.energy !== undefined && drain > 0){
    if(s.energy <= 0) return sw.chargeFrames;
    s.energy = Math.max(0, s.energy - drain);
    if(s.energy <= 0) return sw.chargeFrames;
  }
  if(!atCap) sw.chargeFrames = Math.min(wp.chargeMax, sw.chargeFrames + 1);
  sw.charge = sw.chargeFrames;
  return sw.chargeFrames;
}

function lockTargetDelta(s, target, ctx) {
  if(typeof ctx.lockDelta === 'function') return ctx.lockDelta(s, target);
  if(Number.isFinite(target.dx) && Number.isFinite(target.dy)) return {dx:target.dx, dy:target.dy};
  return {dx:(target.x ?? 0) - s.x, dy:(target.y ?? 0) - s.y};
}

function normalizeLockTarget(s, target, ctx, wp) {
  if(!target || target.alive === false || !target.id) return null;
  const delta = lockTargetDelta(s, target, ctx);
  const dist = Number.isFinite(target.dist) ? target.dist : Math.hypot(delta.dx, delta.dy);
  if(!Number.isFinite(dist) || dist > wp.targetLockRange) return null;
  const arc = wp.targetLockArc;
  const aim = Math.atan2(delta.dx, -delta.dy);
  const preferred = Number.isFinite(arc) ? Math.abs(angDiff(s.a, aim)) <= arc : false;
  return {...target, dx:delta.dx, dy:delta.dy, dist, preferred};
}

function eligibleLockTargets(s, ctx, wp) {
  if(!s || !ctx || !wp?.targetLockRange || typeof ctx.lockTargets !== 'function') return [];
  const raw = ctx.lockTargets(s, wp);
  return (Array.isArray(raw) ? raw : [])
    .map(t => normalizeLockTarget(s, t, ctx, wp))
    .filter(Boolean)
    .sort((a, b) => (b.preferred - a.preferred) || (a.dist - b.dist) || String(a.id).localeCompare(String(b.id)));
}

function decrementLockCooldowns(sw) {
  for(const [id, frames] of sw.lockCooldowns) {
    const next = frames - 1;
    if(next > 0) sw.lockCooldowns.set(id, next);
    else sw.lockCooldowns.delete(id);
  }
}

function lockedTargetEntity(s, slot, ctx) {
  const sw = s?.weapons?.[slot];
  if(!sw?.lockedTargetId || typeof ctx?.lockTargets !== 'function') return null;
  const targets = ctx.lockTargets(s, null);
  return (Array.isArray(targets) ? targets : []).find(t => t && t.id === sw.lockedTargetId && t.alive !== false) || null;
}

function cycleLockTarget(s, slot, wp, ctx) {
  const sw = weaponSlot(s, slot);
  const previousId = sw.lockedTargetId;
  if(previousId) sw.lockCooldowns.set(previousId, 90);
  const targets = eligibleLockTargets(s, ctx, wp);
  if(targets.length > 0) {
    const currentIdx = previousId ? targets.findIndex(t => t.id === previousId) : -1;
    const baseIdx = currentIdx >= 0 ? currentIdx : -1;
    let next = null;
    for(let i=1;i<=targets.length;i++) {
      const t = targets[(baseIdx + i) % targets.length];
      if(!sw.lockCooldowns.has(t.id)) { next = t; break; }
    }
    if(next) sw.lockedTargetId = next.id;
    sw.lastLockActivityFrame = G.fr;
  }
  return lockedTargetEntity(s, slot, ctx);
}

function tickLock(s, slot, wp, ctx) {
  const sw = weaponSlot(s, slot);
  decrementLockCooldowns(sw);
  const idleFrames = sw.lastLockActivityFrame == null ? 0 : G.fr - sw.lastLockActivityFrame;
  if(idleFrames > 120) {
    sw.lockCooldowns.clear();
    sw.lockedTargetId = null;
    return null;
  }
  if(!sw.lockedTargetId) return null;
  const target = lockedTargetEntity(s, slot, ctx);
  if(!target) {
    sw.lockedTargetId = null;
    return null;
  }
  const delta = lockTargetDelta(s, target, ctx);
  const dist = Math.hypot(delta.dx, delta.dy);
  if(Number.isFinite(wp.lockBreakRange) && dist > wp.lockBreakRange) {
    sw.lockedTargetId = null;
    return null;
  }
  return target;
}

// Drives one of the player's two weapon slots for a single frame: advances any in-flight
// beam pulses or missile salvos, then triggers a fresh fire if the input is held and
// cooldowns/queues are clear. Each game mode (encounter/cave-site/surface) wires its own
// targets, walls, and hit handler via ctx.
//   ctx.tgts: () => array of beam targets (called only when a beam pulse is active)
//   ctx.walls, ctx.space: forwarded to castLaserForSpace
//   ctx.lsb, ctx.mis, ctx.bul: per-mode arrays the weapon writes into
//   ctx.onBeamHit(tg, wp, res): mode-specific damage/effect dispatcher
function runPlayerWeaponSlot(s, slot, ctx) {
  const wp = wpSlot(slot); if (!wp) return;
  const wt = WEAPON_TYPES[wp.fireMode];
  const sw = weaponSlot(s, slot);
  if(G.paused || !['play','encounter','esc'].includes(G.st)){
    resetCharge(s, slot);
    return;
  }
  const heldNow = slot===0 ? iFir() : iFireSec();
  if(heldNow){
    sw.input.pressedFrames = sw.input.pressed ? sw.input.pressedFrames + 1 : 1;
    sw.input.justReleased = false;
  } else {
    sw.input.justReleased = !!sw.input.pressed;
    sw.input.releasedAfterFrames = sw.input.pressedFrames;
    sw.input.pressedFrames = 0;
  }
  sw.input.pressed = heldNow;
  if(wp.targetLockRange && ctx.lockTargets) {
    tickLock(s, slot, wp, ctx);
    if(sw.input.justReleased && sw.input.releasedAfterFrames <= TAP_FRAMES) cycleLockTarget(s, slot, wp, ctx);
    if(!wt) return;
  }
  tickCharge(s, slot, wp);
  tickReload(s, slot);
  if(weaponHasMagazine(wp) && wp.fireMode !== 'magazine-burst' && sw.input.pressedFrames > 6 && sw.mag < wp.magMax && !sw.reloading) beginReload(s, slot);
  if (sw.pulsesLeft > 0 && wt.tick) {
    const tgts = ctx.tgts();
    const res = wt.tick(wp, s, slot, tgts, ctx.lsb, ctx.walls || [], ctx.space || null, ctx);
    if (res && res.hitIdx >= 0) ctx.onBeamHit(tgts[res.hitIdx], wp, res);
  }
  if (wp.fireMode === 'persistent-projectile' && wt.tick) wt.tick(wp, s, slot, ctx.bul, ctx);
  if (wp.fireMode === 'charged-persistent-projectile' && wt.tick) {
    wt.tick(wp, s, slot, ctx.bul, ctx);
    if(sw.input.justReleased) {
      if(chargeReady(s, slot, wp) && !sw.cd) tryFire(wp, wt, s, slot, ctx.bul, ctx);
      resetCharge(s, slot);
    }
    return;
  }
  if (wp.fireMode === 'charged-cone-chain') {
    if(sw.input.justReleased) {
      if(chargeReady(s, slot, wp) && !sw.cd) tryFire(wp, wt, s, slot, ctx.bul, ctx);
      resetCharge(s, slot);
    }
    return;
  }
  if (wp.fireMode === 'magazine-burst') {
    sw.mag = magForWeapon(wp, sw.mag);
    if(sw.input.pressedFrames > TAP_FRAMES && sw.mag < wp.magMax && !sw.reloading) beginReload(s, slot);
    if(sw.input.justReleased && sw.input.releasedAfterFrames <= TAP_FRAMES && !sw.reloading) {
      if(sw.mag <= 0) tone(140,.035,'square',.04);
      else if(!sw.cd) tryFire(wp, wt, s, slot, ctx.bul, ctx);
    }
    return;
  }
  if (wp.fireMode === 'spooled-projectile') {
    if(wt.tick) wt.tick(wp, s, slot, ctx.bul, ctx);
    return;
  }
  if (wp.fireMode === 'detonate-projectile') {
    const hasSlug = !!findActiveSlug(sw, ctx.bul);
    if(!hasSlug) sw.activeSlugId = null;
    if(sw.input.justReleased && sw.input.releasedAfterFrames <= TAP_FRAMES && !sw.cd) {
      tryFire(wp, wt, s, slot, ctx.bul, {...ctx, ammoCost:hasSlug ? 0 : 1});
    }
    return;
  }
  if (wp.fireMode === 'sticky-missile-detonate') {
    const active = findStickyMissile(sw, ctx.mis);
    if(!active) sw.stickyMissileId = null;
    if(sw.input.justReleased && sw.input.releasedAfterFrames <= TAP_FRAMES && (active || !sw.cd)) {
      tryFire(wp, wt, s, slot, ctx.bul, {...ctx, ammoCost:active ? 0 : 1});
    }
    return;
  }
  if (sw.misLeft > 0 && wt.tick && wp.fireMode === 'missile') wt.tick(wp, s, slot, ctx.mis, ctx);
  const lockReady = !wp.targetLockRange || (sw.input.pressedFrames > TAP_FRAMES && sw.lockedTargetId);
  if (!sw.reloading && sw.input.pressed && lockReady && !sw.cd && !sw.pulsesLeft && !sw.misLeft) {
    if(tryFire(wp, wt, s, slot, ctx.bul, ctx) && wp.targetLockRange) sw.lastLockActivityFrame = G.fr;
  }
}
