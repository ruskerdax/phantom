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
// Returns 4 bodies: [0]=base, [1..3]=planets. Each has {orbitR, orbitA, orbitSpd}.
function genOWBodies(rng){
  const bodies=[],minR=200,maxR=880,minSep=440;
  for(let b=0;b<4;b++){
    let orbitR,orbitA,ix,iy,att=0;
    do{
      const bMinR=b===0?550:minR;
      orbitR=bMinR+rng.fl(0,maxR-bMinR);
      orbitA=rng.fl(0,Math.PI*2);
      ix=OW_W/2+Math.cos(orbitA)*orbitR;
      iy=OW_H/2+Math.sin(orbitA)*orbitR;
      att++;
    }while(att<60&&bodies.some(e=>{
      const ex=OW_W/2+Math.cos(e.orbitA)*e.orbitR,ey=OW_H/2+Math.sin(e.orbitA)*e.orbitR;
      return Math.hypot(ix-ex,iy-ey)<minSep;
    }));
    const orbitSpd=0.00060-(orbitR-minR)/(maxR-minR)*0.00030;
    bodies.push({orbitR,orbitA,orbitSpd});
  }
  return bodies;
}

// ---- Asteroid belt bodies + belt particles ----
function genABodies(rng,planetBodies){
  const minR=200,maxR=880;
  let orbitR,att=0;
  do{orbitR=minR+rng.fl(0,maxR-minR);att++;}
  while(att<60&&planetBodies.some(b=>Math.abs(b.orbitR-orbitR)<100));
  const orbitSpd=0.00060-(orbitR-minR)/(maxR-minR)*0.00030;
  // minimum angle so trigger zones (r+28=78px each) don't overlap
  const minDa=2*Math.asin(Math.min(1,78/orbitR));
  const a1=rng.fl(0,Math.PI*2);
  const da=minDa+rng.fl(0,Math.PI*2-2*minDa);
  const a2=(a1+da)%(Math.PI*2);
  const bodies=[{orbitR,orbitA:a1,orbitSpd,r:50},{orbitR,orbitA:a2,orbitSpd,r:50}];
  const belt=[],spread=20,N=160;
  for(let i=0;i<N;i++){
    belt.push({a:rng.fl(0,Math.PI*2),dr:rng.fl(-spread,spread),rv:1.5+rng.fl(0,3),sides:rng.int(5,8),rot:rng.fl(0,Math.PI*2)});
  }
  return{bodies,belt};
}
// ---- Hostile base orbital parameters ----
function genHBaseBody(rng,allBodies){
  const minR=200,maxR=880;
  let orbitR,orbitA,ix,iy,att=0;
  do{
    orbitR=minR+rng.fl(0,maxR-minR);
    orbitA=rng.fl(0,Math.PI*2);
    ix=OW_W/2+Math.cos(orbitA)*orbitR;
    iy=OW_H/2+Math.sin(orbitA)*orbitR;
    att++;
  }while(att<80&&allBodies.some(b=>{
    const bx=OW_W/2+Math.cos(b.orbitA)*b.orbitR,by=OW_H/2+Math.sin(b.orbitA)*b.orbitR;
    return Math.hypot(ix-bx,iy-by)<440;
  }));
  const orbitSpd=0.00060-(orbitR-minR)/(maxR-minR)*0.00030;
  return{orbitR,orbitA,orbitSpd,r:20};
}
// ---- Slipgate orbital parameters — always at maximum orbit radius ----
function genSlipgateBody(rng,allBodies){
  const orbitR=880;
  let orbitA,ix,iy,att=0;
  do{
    orbitA=rng.fl(0,Math.PI*2);
    ix=OW_W/2+Math.cos(orbitA)*orbitR;
    iy=OW_H/2+Math.sin(orbitA)*orbitR;
    att++;
  }while(att<80&&allBodies.some(b=>{
    const bx=OW_W/2+Math.cos(b.orbitA)*b.orbitR,by=OW_H/2+Math.sin(b.orbitA)*b.orbitR;
    return Math.hypot(ix-bx,iy-by)<440;
  }));
  const orbitSpd=0.00060-(orbitR-200)/(880-200)*0.00030;
  return{orbitR,orbitA,orbitSpd,r:26};
}
// ---- Master world-generation entry point ----
function genWorld(seed){
  if(typeof genBackground==='function')genBackground(seed);
  LV=LV_TMPL.map((tmpl,i)=>genLevel(tmpl,seedChild(seed,i)));
  const bodies=genOWBodies(mkRNG(seedChild(seed,99)));
  BASE={...bodies[0],r:22};
  PP=bodies.slice(1);
  const abData=genABodies(mkRNG(seedChild(seed,300)),bodies);
  AB=abData.bodies;AB_BELT=abData.belt;
  HBASE=genHBaseBody(mkRNG(seedChild(seed,400)),[bodies[0]]);
  SLIPGATE=genSlipgateBody(mkRNG(seedChild(seed,500)),[...bodies,HBASE]);
  const flavorRng=mkRNG(seedChild(seed,0x3000));
  G.systemFlavor={
    levelCount:  3,                                     // placeholder: flavorRng.int(2,4) clamped to 3
    hasHostileBase: true,                               // placeholder: forced true
    shopSeed:    seedChild(seed,0x3001),                // for future shop variation
    encounterSeed: seedChild(seed,0x3002),              // for future encounter variation
    tier:        flavorRng.int(1,5),
  };
  console.log(`[PHANTOM] world seed: 0x${seed.toString(16).toUpperCase().padStart(8,'0')}`,G.systemFlavor);
}
