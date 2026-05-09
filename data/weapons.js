'use strict';

// Missile visual type registry. Each weapon with wpnType:'missile launcher' references one
// of these by string id via missileType. Future heat-seeker / cluster variants add entries here.
const MISSILE_TYPES = {
  'standard': { col:'#ff8800', fin:'#888', length:8, width:3 },
  'heat-seeker': { col:'#ff3322', fin:'#aa3300', length:9, width:3.5 },
  'hull-buster': { col:'#ffff44', fin:'#ccaa22', length:10, width:4.5, finThickness:2.2 },
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
    activeSlugId:null,
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
  {id:'mass driver',  name:'35mm Mass Driver',  wpnType:'kinetic', fireMode:'projectile', dmg:35, cd:1.0, spd:7,  life:60, ammoMax:200, aiPolicy:'tap', buyable:true, buildPrice: 200},
  {id:'mass driver small',  name:'18mm Mass Driver',  wpnType:'kinetic', fireMode:'projectile', dmg:18, cd:1.0, spd:7,  life:60, ammoMax:80, aiPolicy:'tap', buyable:false, licensePrice: 2200, buildPrice: 280},
  {id:'railgun',      name:'22mm Railgun',      wpnType:'kinetic', fireMode:'projectile', dmg:30, cd:2.0, spd:16, life:110, ammoMax:100, aiPolicy:'tap', buyable:true},
  {id:'pulse laser', name:'50 MJ Pulse Laser', wpnType:'energy', fireMode:'beam',    dmg:10, cd:1.5, range:267, pulses:5, pulseCd:5, persist:3, energyCost:5, aiPolicy:'beam-pulse', buyable:true, buildPrice: 250},
  {id:'pulse laser large', name:'80 MJ Pulse Laser', wpnType:'energy', fireMode:'beam',    dmg:20, cd:2.0, range:400, pulses:4, pulseCd:5, persist:3, energyCost:8, aiPolicy:'beam-pulse', buyable:true, licensePrice: 4500, buildPrice: 600},
  {id:'mining laser', name:'10 MJ Mining Laser', wpnType:'energy', fireMode:'beam', dmg:10, cd:1.0, range:150, pulses:1, pulseCd:5, persist:3, energyCost:3, aiPolicy:'beam-pulse', buyable:false},
  {id:'plasma blaster', name:'12 MK Plasma Blaster', wpnType:'energy', fireMode:'projectile', dmg:12, cd:0.15, spd:10, life:60, energyCost:3, aiPolicy:'tap', buyable:true, licensePrice:2000, buildPrice:300, drawProjectile:(b)=>{cx.save();cx.fillStyle='#0ff';cx.shadowColor='#0ff';cx.shadowBlur=sb(12);cx.beginPath();cx.arc(b.x,b.y,3.5,0,Math.PI*2);cx.fill();cx.globalAlpha=.65;cx.fillStyle='#fff';cx.beginPath();cx.arc(b.x,b.y,1.5,0,Math.PI*2);cx.fill();cx.restore();}},
  {id:'ion blaster', name:'38C Ion Disruptor', wpnType:'energy', fireMode:'persistent-projectile', innerR:16, innerDmgPerTick:2, outerR:0, spd:4, life:80, cd:0.3, energyCost:3, aiPolicy:'tap', buyable:true, licensePrice:2200, buildPrice:320, drawProjectile:(p)=>{const fr=typeof G!=='undefined'?G.fr||0:0,pulse=.65+.35*Math.sin(fr*.28+(p.l||0)*.08);cx.save();cx.globalAlpha=.72;cx.fillStyle='#7df';cx.shadowColor='#7df';cx.shadowBlur=sb(14);cx.beginPath();cx.arc(p.x,p.y,4.5+pulse*2,0,Math.PI*2);cx.fill();cx.globalAlpha=.95;cx.fillStyle='#dff';cx.beginPath();cx.arc(p.x,p.y,2.2+pulse*.8,0,Math.PI*2);cx.fill();cx.restore();}},
  {id:'ion cannon', name:'81C Ion Cannon', wpnType:'energy', fireMode:'charged-persistent-projectile', chargeMin:6, chargeMax:120, chargeEnergyDrainPerFrame:0.125, chargeHoldDrainPerFrame:0.04, innerRMin:12, innerRMax:36, outerRMin:30, outerRMax:90, innerDmgPerTick:1, outerDmgPerTick:1, outerTickInterval:4, spd:3, life:90, aiPolicy:null, buyable:true, licensePrice:5000, buildPrice:700, drawProjectile:(p)=>{const fr=typeof G!=='undefined'?G.fr||0:0,level=Math.max(0,Math.min(1,p.chargeLevel??0)),pulse=.65+.35*Math.sin(fr*.22+(p.l||0)*.1),r=4+level*7+pulse*2;cx.save();cx.globalAlpha=.45+.25*pulse;cx.fillStyle='#9df';cx.shadowColor='#9df';cx.shadowBlur=sb(16+level*18);cx.beginPath();cx.arc(p.x,p.y,r,0,Math.PI*2);cx.fill();cx.globalAlpha=.95;cx.fillStyle='#fff';cx.beginPath();cx.arc(p.x,p.y,2.2+level*2+pulse*.7,0,Math.PI*2);cx.fill();cx.restore();}},
  {id:'arc caster', name:'1.5 MA Arc Projector', wpnType:'energy', fireMode:'charged-cone-chain', chargeMin:36, chargeMax:36, chargeEnergyDrainPerFrame:0, chargeHoldDrainPerFrame:0, fireEnergyCost:8, coneAngleRad:Math.PI/9, coneLength:320, primaryDmg:32, chainHopMaxDist:80, chainDamages:[15,8], chainHopsMax:2, cd:0.8, aiPolicy:null, buyable:true, licensePrice:5500, buildPrice:760, drawArc:(srcX,srcY,a,points)=>{if(!Array.isArray(points)||points.length===0)return;cx.save();cx.strokeStyle='#dff';cx.shadowColor='#9df';cx.shadowBlur=sb(14);cx.lineWidth=1.5;cx.beginPath();cx.moveTo(srcX,srcY);for(const p of points)cx.lineTo(p.x,p.y);cx.stroke();cx.strokeStyle='#fff';cx.lineWidth=.75;cx.shadowBlur=0;cx.beginPath();cx.moveTo(srcX,srcY);for(const p of points)cx.lineTo(p.x,p.y);cx.stroke();cx.restore();}},
  {id:'flak cannon', name:'55mm Flak Cannon', wpnType:'kinetic', fireMode:'magazine-burst', dmg:5, spd:12, life:30, burstCount:8, burstSpread:Math.PI*30/180, cd:0.15, magMax:5, ammoMax:100, reloadSec:3.0, aiPolicy:null, buyable:true, licensePrice:3200, buildPrice:420},
  {id:'rotary autocannon', name:'14mm Rotary Autocannon', wpnType:'kinetic', fireMode:'spooled-projectile', dmg:5, spd:12, life:80, cd:7, spoolFrames:6, fireSpread:Math.PI*1/180, ammoMax:500, aiPolicy:null, buyable:true, licensePrice:3800, buildPrice:480, drawProjectile:(b)=>{cx.save();cx.fillStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=sb(5);cx.beginPath();cx.arc(b.x,b.y,2,0,Math.PI*2);cx.fill();cx.restore();}},
  {id:'shredder shot', name:'82mm Shredder Shot', wpnType:'kinetic', fireMode:'detonate-projectile', slugDmg:20, slugSpd:4, slugLife:90, pelletCount:8, pelletDmg:8, pelletSpd:12, pelletLife:30, pelletArcRad:Math.PI*25/180, ammoMax:40, cd:0.4, aiPolicy:null, buyable:true, licensePrice:3000, buildPrice:400, drawSlug:(b)=>{cx.save();cx.fillStyle='#bff';cx.shadowColor='#7ff';cx.shadowBlur=sb(12);cx.beginPath();cx.arc(b.x,b.y,6,0,Math.PI*2);cx.fill();cx.globalAlpha=.8;cx.fillStyle='#fff';cx.beginPath();cx.arc(b.x,b.y,2.4,0,Math.PI*2);cx.fill();cx.restore();}, drawPellet:(b)=>{cx.save();cx.fillStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=sb(4);cx.beginPath();cx.arc(b.x,b.y,1.8,0,Math.PI*2);cx.fill();cx.restore();}, drawProjectile(b){if(b.slug)this.drawSlug(b);else this.drawPellet(b);}},
  {id:'tungsten slugthrower', name:'25mm Tungsten Slugthrower', wpnType:'kinetic', fireMode:'projectile', dmg:25, cd:1.0, spd:13, life:100, ammoMax:100, ricochetsMax:3, aiPolicy:'tap', buyable:true, licensePrice:2400, buildPrice:340, drawProjectile:(b)=>{const sp=Math.hypot(b.vx||0,b.vy||0)||1,tx=-(b.vx||0)/sp*13,ty=-(b.vy||0)/sp*13;cx.save();cx.strokeStyle='#49ffff';cx.globalAlpha=.45;cx.lineWidth=2;cx.beginPath();cx.moveTo(b.x+tx,b.y+ty);cx.lineTo(b.x,b.y);cx.stroke();cx.globalAlpha=1;cx.fillStyle='#dfffff';cx.shadowColor='#49ffff';cx.shadowBlur=sb(10);cx.beginPath();cx.arc(b.x,b.y,2.4,0,Math.PI*2);cx.fill();cx.restore();}},
  {id:'particle accelerator', name:'100 MJ Particle Accelerator', wpnType:'energy', fireMode:'beam',    dmg:100, cd:4.0, range:400, pulses:1, pulseCd:20, persist:4, energyCost:2, chargeDelay:60, beamWidth:6, beamColor:'#8f0', beamSound:[120,.35,'sawtooth',.09], chargeTone:[1200,1800,'sine',.05], aiPolicy:'beam-pulse', buyable:true, licensePrice: 4000, buildPrice: 550},
  {id:'rocket pod', name:'12kg Rocket Launcher', wpnType:'missile', fireMode:'missile', missileType:'standard', dmg:60, expDmg:80, expR:55, cd:3.0, spd:1.8, maxSpd:9, accel:0.18, life:140, hp:20, salvo:1, salvoCd:6, ammoMax:16, aiPolicy:'missile-salvo', buyable:true, licensePrice: 3000, buildPrice: 420},
  {id:'heat seeker', name:'8kg Heat Seeking Missile Launcher', wpnType:'missile', fireMode:'missile', missileType:'heat-seeker', dmg:50, expDmg:60, expR:45, cd:3.0, spd:2, maxSpd:8, accel:0.18, life:160, hp:20, salvo:1, salvoCd:6, ammoMax:8, seek:true, seekTurnRate:0.06, seekTargetKinds:['enemy'], aiPolicy:'missile-salvo', buyable:true, licensePrice:2800, buildPrice:380},
  {id:'hull buster', name:'22kg Hull Buster', wpnType:'missile', fireMode:'sticky-missile-detonate', missileType:'hull-buster', dmg:0, expDmg:120, expR:75, cd:4.0, spd:3, maxSpd:5, accel:0.05, life:240, hp:25, ammoMax:8, gravityScale:'bomb', detonateDelayFrames:6, aiPolicy:null, buyable:true, licensePrice:3500, buildPrice:460},
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
    if(wp.inheritShooterVelocity !== undefined && typeof wp.inheritShooterVelocity !== 'boolean') {
      throw new Error(`Weapon ${wp.id} has invalid inheritShooterVelocity ${wp.inheritShooterVelocity}`);
    }
  }
  for(const id of enemyUsed) {
    if(!WEAPON_MAP[id]) throw new Error(`Enemy registry references unknown weapon ${id}`);
  }
}
