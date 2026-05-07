'use strict';

const TAP_FRAMES = 8;

// Build a missile object from a weapon config + ship pose. Fires from the ship's nose,
// inheriting a fraction of ship velocity. The owner ship's heading sets the missile's
// initial heading; speed starts at wp.spd and ramps to wp.maxSpd via wp.accel each frame.
function spawnMissile(wp, s, mis) {
  const md = MISSILE_TYPES[wp.missileType] || MISSILE_TYPES['standard'];
  const ox = s.x + Math.sin(s.a)*13, oy = s.y - Math.cos(s.a)*13;
  mis.push({
    x:ox, y:oy, a:s.a,
    vx: Math.sin(s.a)*wp.spd + s.vx*.3,
    vy:-Math.cos(s.a)*wp.spd + s.vy*.3,
    spd:wp.spd, maxSpd:wp.maxSpd, accel:wp.accel,
    hp:wp.hp, maxHp:wp.hp,
    l:wp.life,
    dmg:wp.dmg, expDmg:wp.expDmg, expR:wp.expR,
    type:wp.missileType||'standard', col:md.col,
    seek:!!wp.seek, trailTimer:0,
  });
  tone(360,.10,'square',.06);
}

// Weapon firing mechanic behavior - keyed by wp.fireMode.
const WEAPON_TYPES = {
  'projectile': {
    fire(wp, s, slot, bul) {
      bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life*wp.spd,dmg:wp.dmg});
      weaponSlot(s, slot).cd = Math.round(wp.cd*60);
      tone(900,.04,'square',.05);
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
    tick(wp, s, slot, tgts, lsb, walls=[], space=null) {
      const sw = weaponSlot(s, slot);
      if(--sw.pulseTimer>0){
        if(wp.chargeTone&&sw.pulseTimer===wp.chargeDelay-1)toneRise(wp.chargeTone[0],wp.chargeTone[1],wp.chargeDelay/60,wp.chargeTone[2],wp.chargeTone[3]);
        if(sw.persistBeam&&sw.persistBeam.l-->0){
          const{ox,oy,a,range,hitPad}=sw.persistBeam;
          const res=castLaserForSpace(ox,oy,a,range,tgts,walls,space,hitPad);
          if(res.hitIdx>=0){sw.persistBeam.l=0;return res;}
        }
        return null;
      }
      const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;
      const hitPad=typeof beamHitPadding==='function'?beamHitPadding(wp):Math.max(2,(wp.beamWidth??2)*.5);
      const res=castLaserForSpace(ox,oy,s.a,wp.range,tgts,walls,space,hitPad);
      lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:wp.beamColor??'#0cf',w:wp.beamWidth??2});
      if(wp.beamSound)tone(...wp.beamSound);else tone(1200,.08,'sine',.05);
      if(wp.persist&&res.hitIdx<0)sw.persistBeam={ox,oy,a:s.a,range:wp.range,hitPad,l:wp.persist};
      else sw.persistBeam=null;
      sw.pulsesLeft--;
      if(sw.pulsesLeft>0)sw.pulseTimer=wp.pulseCd;else sw.cd=Math.round(wp.cd*60);
      return res;
    }
  },
  'missile': {
    fire(wp, s, slot) {
      // Same pattern as beam gun: fire() only arms the volley; tick() spawns each missile.
      const sw = weaponSlot(s, slot);
      sw.misLeft = wp.salvo;
      sw.misTimer = 1;
    },
    tick(wp, s, slot, mis) {
      const sw = weaponSlot(s, slot);
      if(--sw.misTimer>0)return;
      spawnMissile(wp,s,mis);
      sw.misLeft--;
      if(sw.misLeft>0)sw.misTimer=wp.salvoCd;else sw.cd=Math.round(wp.cd*60);
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

function refillAmmoForLoadout(s) {
  if(!s) return;
  const count = Math.max(2, s.weapons?.length ?? 0, G.loadout?.weapons?.length ?? 0);
  for(let i=0;i<count;i++) weaponSlot(s, i).ammo = ammoForWeapon(wpSlot(i));
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

// Fire a weapon, deducting energyCost if defined and the ship tracks energy.
// Returns false if the ship lacks energy, true otherwise.
// Enemies (no s.energy) ignore energyCost and always fire.
function tryFire(wp, wt, s, slot, bul) {
  if (weaponHasMagazine(wp)) {
    const mag = currentMagForSlot(s, slot);
    if (mag === null || mag <= 0) {
      tone(140,.035,'square',.04);
      return false;
    }
  } else
  if (weaponHasAmmo(wp)) {
    const ammo = currentAmmoForSlot(s, slot);
    if (ammo === null || ammo <= 0) return false;
  }
  if (wp.energyCost !== undefined && s.energy !== undefined) {
    if (typeof syncShipEnergyProfile === 'function') syncShipEnergyProfile(s);
    if (s.energy < wp.energyCost) return false;
    s.energy = Math.max(0, s.energy - wp.energyCost);
  }
  if (weaponHasMagazine(wp)) consumeMag(s, slot);
  else if (weaponHasAmmo(wp)) consumeAmmo(s, slot, 1);
  wt.fire(wp, s, slot, bul);
  return true;
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
  tickCharge(s, slot, wp);
  tickReload(s, slot);
  if(weaponHasMagazine(wp) && sw.input.pressedFrames > 6 && sw.mag < wp.magMax && !sw.reloading) beginReload(s, slot);
  if (sw.pulsesLeft > 0 && wt.tick) {
    const tgts = ctx.tgts();
    const res = wt.tick(wp, s, slot, tgts, ctx.lsb, ctx.walls || [], ctx.space || null);
    if (res && res.hitIdx >= 0) ctx.onBeamHit(tgts[res.hitIdx], wp, res);
  }
  if (sw.misLeft > 0 && wt.tick && wp.fireMode === 'missile') wt.tick(wp, s, slot, ctx.mis);
  if (!sw.reloading && sw.input.pressed && !sw.cd && !sw.pulsesLeft && !sw.misLeft) tryFire(wp, wt, s, slot, ctx.bul);
}
