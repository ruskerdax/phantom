'use strict';

// ---- Fleet registry ----
// Fleet compositions reference stable enemy type IDs, not OET positions.
// composition.rolls entries: {t, cnt} for fixed counts, {t, min, max} for a range, optional `chance` to gate the roll.
// Behaviors: 'orbit_system' (Hunters drift around the star), 'orbit_post' (anchor to a body), 'triangle' (3-body loop),
// 'route' (2-body shuttle), 'idle' (stationary).
const FLEETS = [
  { id:'HUNTER',  aggroR:600, trigR:24, owSpd:3.0, maxOnOW:3,
    behavior:'orbit_system',
    composition:{ rolls:[
      { t:ENEMY_IDS.INTERCEPTOR, min:1, max:3 },
      { t:ENEMY_IDS.FIGHTER, min:1, max:2 },
      { t:ENEMY_IDS.DESTROYER, cnt:1, chance:.33 }
    ]},
    glyph:'hunter' },
  { id:'SWARM',   aggroR:180,  trigR:22, owSpd:2.5, maxOnOW:6,
    behavior:'orbit_post',
    composition:{ rolls:[{ t:ENEMY_IDS.DRONE, min:4, max:6 }] },
    glyph:'swarm' },
  { id:'PATROL',  aggroR:360,  trigR:24, owSpd:3.0,  maxOnOW:2,
    behavior:'triangle',
    composition:{ rolls:[
      { t:ENEMY_IDS.DESTROYER, cnt:1 },
      { t:ENEMY_IDS.DESTROYER, cnt:1, chance:.5 },
      { t:ENEMY_IDS.CRUISER, cnt:1, chance:.2 },
      { t:ENEMY_IDS.INTERCEPTOR, min:1, max:3 },
      { t:ENEMY_IDS.FIGHTER, min:1, max:2 },
      { t:ENEMY_IDS.DRONE, min:0, max:2 }
    ]},
    glyph:'patrol' },
  { id:'CONVOY',  aggroR:0,    trigR:26, owSpd:2.0,  maxOnOW:2,
    behavior:'route',
    spawnsHunters:{ everyFrames:2400 },
    composition:{ rolls:[
      { t:ENEMY_IDS.CARRIER, cnt:1 },
      { t:ENEMY_IDS.DESTROYER, cnt:1, chance:.5 },
      { t:ENEMY_IDS.CRUISER, cnt:1, chance:.3 },
      { t:ENEMY_IDS.INTERCEPTOR, min:1, max:3 },
      { t:ENEMY_IDS.FIGHTER, min:1, max:2 },
      { t:ENEMY_IDS.DRONE, min:0, max:2 }
    ]},
    glyph:'convoy' },
  { id:'ARMADA',  aggroR:512,  trigR:28, owSpd:1.5,  maxOnOW:1,
    behavior:'orbit_post',
    composition:{ rolls:[
      { t:ENEMY_IDS.BATTLESHIP, cnt:1, chance:.6 },
      { t:ENEMY_IDS.CARRIER, cnt:1, chance:.5 },
      { t:ENEMY_IDS.DESTROYER, min:1, max:3 },
      { t:ENEMY_IDS.CRUISER, min:0, max:2 },
      { t:ENEMY_IDS.INTERCEPTOR, min:2, max:4 },
      { t:ENEMY_IDS.FIGHTER, min:1, max:3 },
      { t:ENEMY_IDS.DRONE, min:0, max:3 }
    ]},
    glyph:'armada' }
];
function fleetDef(id){return FLEETS.find(f=>f.id===id);}
function rollFleetComp(id){
  const F=fleetDef(id),out=[];
  for(const r of F.composition.rolls){
    if(r.chance!==undefined&&Math.random()>r.chance)continue;
    const cnt=r.cnt!=null?r.cnt:r.min+Math.floor(Math.random()*(r.max-r.min+1));
    if(cnt>0)out.push({t:r.t,cnt});
  }
  return out;
}
