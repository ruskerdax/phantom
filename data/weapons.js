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
    lastLockActivityFrame:null,
    stickyMissileId:null,
    input:{pressed:false, pressedFrames:0, justReleased:false, releasedAfterFrames:0},
    ...overrides,
  };
}

function weaponSlot(s, slot) {
  if(!s.weapons) s.weapons = [];
  if(!s.weapons[slot]) s.weapons[slot] = mkWeaponSlot();
  const w = s.weapons[slot];
  w.charge = Math.max(0, w.charge || 0);
  w.chargeFrames = Math.max(0, w.chargeFrames || 0);
  if(!w.input) w.input = {pressed:false, pressedFrames:0, justReleased:false, releasedAfterFrames:0};
  if(!(w.lockCooldowns instanceof Map)) w.lockCooldowns = new Map();
  return w;
}

function tickWeaponCooldowns(s) {
  for(const w of s.weapons || []) if(w && w.cd > 0) w.cd--;
}

// Weapon class definitions
const WEAPONS = [
  {id:'mass driver',  name:'MASS DRIVER',  wpnType:'kinetic', fireMode:'projectile', dmg:30, cd:1.0, spd:7,  life:60, ammoMax:400, aiPolicy:'tap', buyable:true},
  {id:'railgun',      name:'RAILGUN',      wpnType:'kinetic', fireMode:'projectile', dmg:20, cd:2.0, spd:12, life:90, ammoMax:300, aiPolicy:'tap', buyable:true},
  {id:'pulse laser', name:'PULSE LASER', wpnType:'energy', fireMode:'beam',    dmg:10, cd:2.0, range:267, pulses:5, pulseCd:5, persist:3, energyCost:1, aiPolicy:'beam-pulse', buyable:true},
  {id: 'mining laser', name:'MINING LASER', wpnType:'energy', fireMode:'beam', dmg:10, cd:2.0, range:150, pulses:1, pulseCd:5, persist:3, energyCost:1, aiPolicy:'beam-pulse', buyable:true},
  {id:'particle accelerator', name:'PARTICLE ACCELERATOR', wpnType:'energy', fireMode:'beam',    dmg:80, cd:4.0, range:400, pulses:1, pulseCd:20, persist:4, energyCost:2, chargeDelay:60, beamWidth:6, beamColor:'#8f0', beamSound:[120,.35,'sawtooth',.09], chargeTone:[1200,1800,'sine',.05], aiPolicy:'beam-pulse', buyable:true},
  {id:'rocket pod', name:'ROCKET POD', wpnType:'missile', fireMode:'missile', missileType:'standard', dmg:60, expDmg:80, expR:55, cd:3.0, spd:1.8, maxSpd:9, accel:0.18, life:140, hp:20, salvo:1, salvoCd:6, ammoMax:12, aiPolicy:'missile-salvo', buyable:true},
];

const WEAPON_MAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

function enemyMountedWeaponIds() {
  const ids = new Set();
  const add = id => { if(id !== undefined && id !== null) ids.add(id); };
  if(typeof ENEMY_CLASSES !== 'undefined') {
    ENEMY_CLASSES.forEach(e => add(e.enc?.fire?.wpn));
  }
  if(typeof SURFACE_ENEMY_CLASSES !== 'undefined') {
    SURFACE_ENEMY_CLASSES.forEach(e => add(e.surf?.fire?.wpn));
  }
  if(typeof DEFENSE_CLASSES !== 'undefined') {
    DEFENSE_CLASSES.forEach(d => add(d.defense?.fire?.wpn));
  }
  return ids;
}

function assertWeaponRegistry() {
  const enemyUsed = enemyMountedWeaponIds();
  for(const wp of WEAPONS) {
    if(!WEAPON_TYPES[wp.fireMode]) throw new Error(`Weapon ${wp.id} has unknown fireMode ${wp.fireMode}`);
    if(wp.aiPolicy !== undefined && wp.aiPolicy !== null && !WEAPON_AI_POLICIES[wp.aiPolicy]) {
      throw new Error(`Weapon ${wp.id} has unknown aiPolicy ${wp.aiPolicy}`);
    }
    if(enemyUsed.has(wp.id) && (wp.aiPolicy === undefined || wp.aiPolicy === null)) {
      throw new Error(`Enemy-mounted weapon ${wp.id} is missing aiPolicy`);
    }
    if(wp.ammoMax !== undefined && !(Number.isFinite(wp.ammoMax) && wp.ammoMax > 0)) {
      throw new Error(`Weapon ${wp.id} has invalid ammoMax ${wp.ammoMax}`);
    }
    if(wp.magMax !== undefined) {
      if(!(Number.isFinite(wp.magMax) && wp.magMax > 0)) throw new Error(`Weapon ${wp.id} has invalid magMax ${wp.magMax}`);
      if(wp.ammoMax === undefined) throw new Error(`Weapon ${wp.id} has magMax but no ammoMax`);
    }
    if(wp.chargeMin !== undefined || wp.chargeMax !== undefined) {
      if(!(Number.isFinite(wp.chargeMin) && wp.chargeMin > 0)) throw new Error(`Weapon ${wp.id} has invalid chargeMin ${wp.chargeMin}`);
      if(!(Number.isFinite(wp.chargeMax) && wp.chargeMax >= wp.chargeMin)) throw new Error(`Weapon ${wp.id} has invalid chargeMax ${wp.chargeMax}`);
    }
  }
  for(const id of enemyUsed) {
    if(!WEAPON_MAP[id]) throw new Error(`Enemy registry references unknown weapon ${id}`);
  }
}
