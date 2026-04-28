'use strict';

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
    tick(wp, s, slot, tgts, lsb, walls=[]) {
      const[plK,ptK,cdK]=slot===0?['pulsesLeft','pulseTimer','scd']:['pulsesLeft2','pulseTimer2','scd2'];
      if(--s[ptK]>0){
        if(wp.chargeTone&&s[ptK]===wp.chargeDelay-1)toneRise(wp.chargeTone[0],wp.chargeTone[1],wp.chargeDelay/60,wp.chargeTone[2],wp.chargeTone[3]);
        return null;
      }
      const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;
      const res=castLaser(ox,oy,s.a,wp.range,tgts,walls);
      lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:wp.beamColor??'#0cf',w:wp.beamWidth??2});
      if(wp.beamSound)tone(...wp.beamSound);else tone(1200,.08,'sine',.05);
      s[plK]--;
      if(s[plK]>0)s[ptK]=wp.pulseCd;else s[cdK]=Math.round(wp.cd*60);
      return res;
    }
  }
};

// Weapon class definitions
const WEAPONS = [
  {id:'mass driver',  name:'MASS DRIVER',  wpnType:'kinetic gun', dmg:3, cd:1.0, spd:7,  life:60, buyable:true},
  {id:'railgun',      name:'RAILGUN',      wpnType:'kinetic gun', dmg:2, cd:2.0, spd:12, life:90, buyable:true},
  {id:'pulse laser', name:'PULSE LASER', wpnType:'beam gun',    dmg:1, cd:2.0, range:267, pulses:5, pulseCd:5, energyCost:1, buyable:true},
  {id: 'mining laser', name:'MINING LASER', wpnType:'beam gun', dmg:1, cd:2.0, range:150, pulses:1, pulsesCd:5, energyCost:1, buyable:true},
  {id:'particle accelerator', name:'PARTICLE ACCELERATOR', wpnType:'beam gun',    dmg:8, cd:4.0, range:400, pulses:1, pulseCd:20, energyCost:2, chargeDelay:60, beamWidth:6, beamColor:'#8f0', beamSound:[120,.35,'sawtooth',.09], chargeTone:[1200,1800,'sine',.05], buyable:true},
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
