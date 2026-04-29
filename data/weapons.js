'use strict';

// Missile visual type registry. Each weapon with wpnType:'missile launcher' references one
// of these by string id via missileType. Future heat-seeker / cluster variants add entries here.
const MISSILE_TYPES = {
  'standard': { col:'#ff8800', fin:'#888', length:8, width:3 },
};

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

// Weapon type behavior — firing mechanics for player weapons
const WEAPON_TYPES = {
  'kinetic gun': {
    fire(wp, s, slot, bul) {
      bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life*wp.spd,dmg:wp.dmg});
      if(slot===0)s.scd=Math.round(wp.cd*60);else s.scd2=Math.round(wp.cd*60);
      tone(900,.04,'square',.05);
    }
  },
  'beam gun': {
    fire(wp, s, slot) {
      if(slot===0){s.pulsesLeft=wp.pulses;s.pulseTimer=wp.chargeDelay??1;}
      else{s.pulsesLeft2=wp.pulses;s.pulseTimer2=wp.chargeDelay??1;}
    },
    // Advances one laser pulse; returns castLaser result or null if timer not ready.
    // Caller is responsible for building tgts (context-specific) and handling the hit.
    tick(wp, s, slot, tgts, lsb, walls=[], space=null) {
      const[plK,ptK,cdK]=slot===0?['pulsesLeft','pulseTimer','scd']:['pulsesLeft2','pulseTimer2','scd2'];
      if(--s[ptK]>0){
        if(wp.chargeTone&&s[ptK]===wp.chargeDelay-1)toneRise(wp.chargeTone[0],wp.chargeTone[1],wp.chargeDelay/60,wp.chargeTone[2],wp.chargeTone[3]);
        return null;
      }
      const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;
      const res=castLaserForSpace(ox,oy,s.a,wp.range,tgts,walls,space);
      lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:wp.beamColor??'#0cf',w:wp.beamWidth??2});
      if(wp.beamSound)tone(...wp.beamSound);else tone(1200,.08,'sine',.05);
      s[plK]--;
      if(s[plK]>0)s[ptK]=wp.pulseCd;else s[cdK]=Math.round(wp.cd*60);
      return res;
    }
  },
  'missile launcher': {
    fire(wp, s, slot) {
      // Same pattern as beam gun: fire() only arms the volley; tick() spawns each missile.
      if(slot===0){s.misLeft=wp.salvo;s.misTimer=1;}
      else{s.misLeft2=wp.salvo;s.misTimer2=1;}
    },
    tick(wp, s, slot, mis) {
      const[mlK,mtK,cdK]=slot===0?['misLeft','misTimer','scd']:['misLeft2','misTimer2','scd2'];
      if(--s[mtK]>0)return;
      spawnMissile(wp,s,mis);
      s[mlK]--;
      if(s[mlK]>0)s[mtK]=wp.salvoCd;else s[cdK]=Math.round(wp.cd*60);
    }
  }
};

// Weapon class definitions
const WEAPONS = [
  {id:'mass driver',  name:'MASS DRIVER',  wpnType:'kinetic gun', dmg:3, cd:1.0, spd:7,  life:60, buyable:true},
  {id:'railgun',      name:'RAILGUN',      wpnType:'kinetic gun', dmg:2, cd:2.0, spd:12, life:90, buyable:true},
  {id:'pulse laser', name:'PULSE LASER', wpnType:'beam gun',    dmg:1, cd:2.0, range:267, pulses:5, pulseCd:5, energyCost:1, buyable:true},
  {id: 'mining laser', name:'MINING LASER', wpnType:'beam gun', dmg:1, cd:2.0, range:150, pulses:1, pulseCd:5, energyCost:1, buyable:true},
  {id:'particle accelerator', name:'PARTICLE ACCELERATOR', wpnType:'beam gun',    dmg:8, cd:4.0, range:400, pulses:1, pulseCd:20, energyCost:2, chargeDelay:60, beamWidth:6, beamColor:'#8f0', beamSound:[120,.35,'sawtooth',.09], chargeTone:[1200,1800,'sine',.05], buyable:true},
  {id:'rocket pod', name:'ROCKET POD', wpnType:'missile launcher', missileType:'standard', dmg:6, expDmg:8, expR:55, cd:3.0, spd:1.8, maxSpd:9, accel:0.18, life:140, hp:2, salvo:1, salvoCd:6, buyable:true},
];

const WEAPON_MAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Fire a weapon, deducting energyCost if defined and the ship tracks energy.
// Returns false if the ship lacks energy, true otherwise.
// Enemies (no s.energy) ignore energyCost and always fire.
function tryFire(wp, wt, s, slot, bul) {
  if (wp.energyCost !== undefined && s.energy !== undefined) {
    if (s.energy < wp.energyCost) return false;
    s.energy = Math.max(0, s.energy - wp.energyCost);
  }
  wt.fire(wp, s, slot, bul);
  return true;
}
