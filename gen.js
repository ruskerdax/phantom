'use strict';

const TUTORIAL_SEED = 0xDEADB33F;
const NEIGHBOR_MIN  = 3;
const NEIGHBOR_MAX  = 8;

// Level data and planet positions — populated by genWorld()
let LV=[];
let PP=[];
let BASE=null;
let AB=[];
let AB_BELT=[];
let HBASE=null;
let SLIPGATE=null;

const MIN_SITE_SEP=440;

// Seeded PRNG — mulberry32
function mkRNG(seed){
  let s=seed>>>0;
  return{
    next(){s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;},
    fl(lo,hi){return this.next()*(hi-lo)+lo;},
    int(lo,hi){return Math.floor(this.next()*(hi-lo+1))+lo;},
    pick(arr){return arr[Math.floor(this.next()*arr.length)];}
  };
}

// Derive a child seed from a parent seed + an integer index
function seedChild(parent,index){
  let h=(parent>>>0)^(Math.imul((index+1)>>>0,2654435761)>>>0);
  h^=h>>>16; h=Math.imul(h,0x45d9f3b)>>>0; h^=h>>>16;
  return h>>>0;
}

// Deterministically derive the neighbor list for a system.
// Returns an array of uint32 seeds, length NEIGHBOR_MIN..NEIGHBOR_MAX.
function genNeighbors(seed){
  const rng=mkRNG(seedChild(seed,0x1000));
  const count=rng.int(NEIGHBOR_MIN,NEIGHBOR_MAX);
  const out=[];
  for(let i=0;i<count;i++){
    let n=seedChild(seed,0x2000+i);
    if(n===seed||n===TUTORIAL_SEED||out.includes(n))n=seedChild(n,0xFA11BACC+i);
    out.push(n>>>0);
  }
  return out;
}

// ---- Overworld body orbital parameters ----
function bodyXY(b){
  return{x:OW_W/2+Math.cos(b.orbitA)*b.orbitR,y:OW_H/2+Math.sin(b.orbitA)*b.orbitR};
}
function orbitSpdFor(orbitR){
  const maxR=Math.max(ORBIT_MIN_R+1,orbitMaxR());
  return 0.00060-(orbitR-ORBIT_MIN_R)/(maxR-ORBIT_MIN_R)*0.00045;
}
function isTooCloseToPlaced(body,placed){
  const p=bodyXY(body);
  return placed.some(b=>{
    const q=bodyXY(b);
    return Math.hypot(p.x-q.x,p.y-q.y)<MIN_SITE_SEP;
  });
}
function placeSite(rng,placed,label,opts={}){
  const minR=opts.minR??ORBIT_MIN_R,maxR=opts.maxR??orbitMaxR();
  let body=null;
  for(let att=0;att<60;att++){
    const orbitR=opts.orbitR??(minR+rng.fl(0,maxR-minR));
    body={orbitR,orbitA:rng.fl(0,Math.PI*2),orbitSpd:orbitSpdFor(orbitR)};
    if(!isTooCloseToPlaced(body,placed)){
      placed.push(body);
      return body;
    }
  }
  console.warn(`[PHANTOM] site spacing exhausted for ${label}; keeping last position`);
  placed.push(body);
  return body;
}

// Returns bodies: [0]=base, [1..planetCount]=planets. Each has {orbitR, orbitA, orbitSpd}.
function genOWBodies(rng,planetCount,placed){
  const bodies=[];
  bodies.push(placeSite(rng,placed,'BASE',{minR:825}));
  for(let i=0;i<planetCount;i++)bodies.push(placeSite(rng,placed,`planet ${i+1}`));
  return bodies;
}

// ---- Asteroid belt bodies + belt particles ----
function genABodies(rng,placed){
  const count=rng.int(1,4)-1;
  if(count===0)return{bodies:[],belt:[]};
  const bodies=[];
  for(let i=0;i<count;i++){
    const body=placeSite(rng,placed,`asteroid field ${i+1}`);
    bodies.push({...body,r:50});
  }
  const belt=[],spread=20,N=160;
  for(let i=0;i<N;i++){
    belt.push({a:rng.fl(0,Math.PI*2),dr:rng.fl(-spread,spread),rv:1.5+rng.fl(0,3),sides:rng.int(5,8),rot:rng.fl(0,Math.PI*2)});
  }
  return{bodies,belt};
}
// ---- Hostile base orbital parameters ----
function genHBaseBody(rng,placed){
  return{...placeSite(rng,placed,'HBASE'),r:20};
}
// ---- Slipgate orbital parameters — always at maximum orbit radius ----
function genSlipgateBody(rng,placed){
  const maxOtherOrbit=placed.reduce((m,b)=>Math.max(m,b.orbitR||0),ORBIT_MIN_R);
  const slipOrbit=maxOtherOrbit+400+rng.fl(0,200);
  return{...placeSite(rng,placed,'SLIPGATE',{orbitR:slipOrbit}),r:26};
}
// ---- Master world-generation entry point ----
function genWorld(seed){
  if(typeof genBackground==='function')genBackground(seed);
  setOWBounds(16000,16000);
  const worldRng=mkRNG(seedChild(seed,0x3100));
  const planetCount=worldRng.int(1,5)+worldRng.int(1,5);
  const tmplRng=mkRNG(seedChild(seed,0x3200)),prevColors=[];
  LV=Array.from({length:planetCount},(_,i)=>genPlanet(genPlanetTmpl(tmplRng,prevColors),seedChild(seed,i),i));
  const placed=[];
  const bodies=genOWBodies(mkRNG(seedChild(seed,99)),planetCount,placed);
  BASE={...bodies[0],r:22};
  PP=bodies.slice(1);
  const abData=genABodies(mkRNG(seedChild(seed,300)),placed);
  AB=abData.bodies;AB_BELT=abData.belt;
  HBASE=genHBaseBody(mkRNG(seedChild(seed,400)),placed);
  SLIPGATE=genSlipgateBody(mkRNG(seedChild(seed,500)),placed);
  const flavorRng=mkRNG(seedChild(seed,0x3000));
  G.systemFlavor={
    levelCount:  planetCount,
    hasHostileBase: true,                               // placeholder: forced true
    shopSeed:    seedChild(seed,0x3001),                // for future shop variation
    encounterSeed: seedChild(seed,0x3002),              // for future encounter variation
    tier:        flavorRng.int(1,5),
  };
  if(typeof genObjectives === 'function')genObjectives(mkRNG(seedChild(seed,0x3300)));
  console.log(`[PHANTOM] world seed: 0x${seed.toString(16).toUpperCase().padStart(8,'0')}`,G.systemFlavor);
}
