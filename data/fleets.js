'use strict';

// ---- Fleet registry ----
// OET indices used in compositions: 4=DESTROYER, 5=CRUISER, 6=INTERCEPTOR, 7=FIGHTER, 8=DRONE, 9=CARRIER, 10=BATTLESHIP.
// composition.rolls entries: {t, cnt} for fixed counts, {t, min, max} for a range, optional `chance` to gate the roll.
// Behaviors: 'orbit_system' (Hunters drift around the star), 'orbit_post' (anchor to a body), 'triangle' (3-body loop),
// 'route' (2-body shuttle), 'idle' (stationary).
const FLEETS = [
  { id:'HUNTER',  aggroR:600, trigR:24, owSpd:3.0, maxOnOW:3,
    behavior:'orbit_system',
    composition:{ rolls:[
      { t:6, min:1, max:3 },
      { t:7, min:1, max:2 },
      { t:4, cnt:1, chance:.33 }
    ]},
    glyph:'hunter' },
  { id:'SWARM',   aggroR:180,  trigR:22, owSpd:2.5, maxOnOW:6,
    behavior:'orbit_post',
    composition:{ rolls:[{ t:8, min:4, max:6 }] },
    glyph:'swarm' },
  { id:'PATROL',  aggroR:360,  trigR:24, owSpd:3.0,  maxOnOW:2,
    behavior:'triangle',
    composition:{ rolls:[
      { t:4, cnt:1 },
      { t:4, cnt:1, chance:.5 },
      { t:5, cnt:1, chance:.2 },
      { t:6, min:1, max:3 },
      { t:7, min:1, max:2 },
      { t:8, min:0, max:2 }
    ]},
    glyph:'patrol' },
  { id:'CONVOY',  aggroR:0,    trigR:26, owSpd:2.0,  maxOnOW:2,
    behavior:'route',
    spawnsHunters:{ everyFrames:2400 },
    composition:{ rolls:[
      { t:9, cnt:1 },
      { t:4, cnt:1, chance:.5 },
      { t:5, cnt:1, chance:.3 },
      { t:6, min:1, max:3 },
      { t:7, min:1, max:2 },
      { t:8, min:0, max:2 }
    ]},
    glyph:'convoy' },
  { id:'ARMADA',  aggroR:512,  trigR:28, owSpd:1.5,  maxOnOW:1,
    behavior:'orbit_post',
    composition:{ rolls:[
      { t:10, cnt:1, chance:.6 },
      { t:9,  cnt:1, chance:.5 },
      { t:4,  min:1, max:3 },
      { t:5,  min:0, max:2 },
      { t:6,  min:2, max:4 },
      { t:7,  min:1, max:3 },
      { t:8,  min:0, max:3 }
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
