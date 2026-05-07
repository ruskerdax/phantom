'use strict';

// Missile visual type registry. Each weapon with wpnType:'missile launcher' references one
// of these by string id via missileType. Future heat-seeker / cluster variants add entries here.
const MISSILE_TYPES = {
  'standard': { col:'#ff8800', fin:'#888', length:8, width:3 },
};

function mkWeaponSlot(overrides = {}) {
  return {
    cd:0,
    ammo:null,
    mag:null,
    charge:0,
    chargeFrames:0,
    pulsesLeft:0,
    pulseTimer:0,
    misLeft:0,
    misTimer:0,
    persistBeam:null,
    spool:0,
    reloading:false,
    reloadFrames:0,
    lockedTargetId:null,
    lockCooldowns:new Map(),
    stickyMissileId:null,
    input:{pressed:false, pressedFrames:0, justReleased:false, releasedAfterFrames:0},
    ...overrides,
  };
}

function weaponSlot(s, slot) {
  if(!s.weapons) s.weapons = [];
  if(!s.weapons[slot]) s.weapons[slot] = mkWeaponSlot();
  const w = s.weapons[slot];
  if(!w.input) w.input = {pressed:false, pressedFrames:0, justReleased:false, releasedAfterFrames:0};
  if(!w.lockCooldowns) w.lockCooldowns = new Map();
  return w;
}

function tickWeaponCooldowns(s) {
  for(const w of s.weapons || []) if(w && w.cd > 0) w.cd--;
}

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

// Weapon firing mechanic behavior — keyed by wp.fireMode
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

// Weapon class definitions
const WEAPONS = [
  {id:'mass driver',  name:'MASS DRIVER',  wpnType:'kinetic', fireMode:'projectile', dmg:30, cd:1.0, spd:7,  life:60, buyable:true},
  {id:'railgun',      name:'RAILGUN',      wpnType:'kinetic', fireMode:'projectile', dmg:20, cd:2.0, spd:12, life:90, buyable:true},
  {id:'pulse laser', name:'PULSE LASER', wpnType:'energy', fireMode:'beam',    dmg:10, cd:2.0, range:267, pulses:5, pulseCd:5, persist:3, energyCost:1, buyable:true},
  {id: 'mining laser', name:'MINING LASER', wpnType:'energy', fireMode:'beam', dmg:10, cd:2.0, range:150, pulses:1, pulseCd:5, persist:3, energyCost:1, buyable:true},
  {id:'particle accelerator', name:'PARTICLE ACCELERATOR', wpnType:'energy', fireMode:'beam',    dmg:80, cd:4.0, range:400, pulses:1, pulseCd:20, persist:4, energyCost:2, chargeDelay:60, beamWidth:6, beamColor:'#8f0', beamSound:[120,.35,'sawtooth',.09], chargeTone:[1200,1800,'sine',.05], buyable:true},
  {id:'rocket pod', name:'ROCKET POD', wpnType:'missile', fireMode:'missile', missileType:'standard', dmg:60, expDmg:80, expR:55, cd:3.0, spd:1.8, maxSpd:9, accel:0.18, life:140, hp:20, salvo:1, salvoCd:6, buyable:true},
];

const WEAPON_MAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

function weaponEffectiveRange(wp) {
  return wp.range??(wp.life&&wp.spd?wp.life*wp.spd:Infinity);
}

function weaponCooldownFrames(wp) {
  return Math.round(wp.cd*60);
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
  if (sw.pulsesLeft > 0 && wt.tick) {
    const tgts = ctx.tgts();
    const res = wt.tick(wp, s, slot, tgts, ctx.lsb, ctx.walls || [], ctx.space || null);
    if (res && res.hitIdx >= 0) ctx.onBeamHit(tgts[res.hitIdx], wp, res);
  }
  if (sw.misLeft > 0 && wt.tick && wp.fireMode === 'missile') wt.tick(wp, s, slot, ctx.mis);
  const fireBtn = slot === 0 ? iFir() : iFireSec();
  if (fireBtn && !sw.cd && !sw.pulsesLeft && !sw.misLeft) tryFire(wp, wt, s, slot, ctx.bul);
}
