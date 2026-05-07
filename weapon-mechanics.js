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

// Fire a weapon, deducting energyCost if defined and the ship tracks energy.
// Returns false if the ship lacks energy, true otherwise.
// Enemies (no s.energy) ignore energyCost and always fire.
function tryFire(wp, wt, s, slot, bul) {
  if (wp.energyCost !== undefined && s.energy !== undefined) {
    if (typeof syncShipEnergyProfile === 'function') syncShipEnergyProfile(s);
    if (s.energy < wp.energyCost) return false;
    s.energy = Math.max(0, s.energy - wp.energyCost);
  }
  wt.fire(wp, s, slot, bul);
  return true;
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
  if (sw.pulsesLeft > 0 && wt.tick) {
    const tgts = ctx.tgts();
    const res = wt.tick(wp, s, slot, tgts, ctx.lsb, ctx.walls || [], ctx.space || null);
    if (res && res.hitIdx >= 0) ctx.onBeamHit(tgts[res.hitIdx], wp, res);
  }
  if (sw.misLeft > 0 && wt.tick && wp.fireMode === 'missile') wt.tick(wp, s, slot, ctx.mis);
  if (sw.input.pressed && !sw.cd && !sw.pulsesLeft && !sw.misLeft) tryFire(wp, wt, s, slot, ctx.bul);
}
