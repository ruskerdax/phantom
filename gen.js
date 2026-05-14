'use strict';

const TUTORIAL_SEED = 0xDEADB33F;
const NEIGHBOR_MIN  = 3;
const NEIGHBOR_MAX  = 8;
const MAX_AST_FIELDS = 2;
const HU_ORBIT_OUTER_FRAC = 0.49;
const GAS_ORBIT_INNER_FRAC = 0.50;

// Level data and planet positions - populated by genWorld()
let LV=[];
let PP=[];
let BASE=null;
let AB=[];
let AB_BELT=[];
let HBASE=null;
let SLIPGATE=null;

const MIN_SITE_SEP=440;

// Seeded PRNG - mulberry32
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

function tutorialSystemComposition(){
  return{archetypeId:'compact_rocky',huCount:3,gasCount:2};
}

function rollSystemComposition(seed){
  const arch=rollSystemArchetype(mkRNG(seedChild(seed,0x4000)));
  const huRng=mkRNG(seedChild(seed,0x4001));
  const gasRng=mkRNG(seedChild(seed,0x4002));
  const huCount=huRng.int(arch.hu[0],arch.hu[1]);
  const gasCount=gasRng.int(arch.gas[0],arch.gas[1]);
  return{archetypeId:arch.id,huCount,gasCount};
}

function weightedPickKey(rng,weights,allowFn=null){
  const entries=Object.entries(weights).filter(([k,v])=>v>0&&(!allowFn||allowFn(k)));
  if(!entries.length)return null;
  const total=entries.reduce((sum,[,w])=>sum+w,0);
  let roll=rng.next()*total;
  for(const [k,w] of entries){
    roll-=w;
    if(roll<=0)return k;
  }
  return entries[entries.length-1][0];
}

function clamp01(v){return Math.max(0,Math.min(1,v));}
function wrapHue(h){h%=360;return h<0?h+360:h;}

function hexToRgb(hex){
  const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');
  if(!m)return null;
  const n=parseInt(m[1],16);
  return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}

function rgbToHex(r,g,b){
  const n=(Math.round(r)<<16)|(Math.round(g)<<8)|Math.round(b);
  return '#'+n.toString(16).padStart(6,'0');
}

function rgbToHsl({r,g,b}){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;
  const d=max-min;
  if(d!==0){
    s=d/(1-Math.abs(2*l-1));
    if(max===r)h=60*(((g-b)/d)%6);
    else if(max===g)h=60*((b-r)/d+2);
    else h=60*((r-g)/d+4);
  }
  return{h:wrapHue(h),s,l};
}

function hslToHex(h,s,l){
  h=wrapHue(h);s=clamp01(s);l=clamp01(l);
  const c=(1-Math.abs(2*l-1))*s;
  const x=c*(1-Math.abs((h/60)%2-1));
  const m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;}
  else if(h<120){r=x;g=c;}
  else if(h<180){g=c;b=x;}
  else if(h<240){g=x;b=c;}
  else if(h<300){r=x;b=c;}
  else{r=c;b=x;}
  return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255);
}

function atmosphereColorFromBase(rng,base,avoid=[]){
  const rgb=hexToRgb(base);
  if(!rgb)return base;
  const hsl=rgbToHsl(rgb);
  const shifts=[-24,-14,16,24];
  const avoidSet=new Set(avoid.filter(Boolean).map(c=>c.toLowerCase()));
  const start=rng.int(0,shifts.length-1);
  for(let tries=0;tries<shifts.length;tries++){
    const shift=shifts[(start+tries)%shifts.length];
    const sat=Math.max(hsl.s+.08,0.20);
    const light=clamp01(hsl.l+(shift < 0 ? .04 : -.02));
    const col=hslToHex(hsl.h+shift,sat,light);
    if(!avoidSet.has(col.toLowerCase()))return col;
  }
  return hslToHex(hsl.h+32,Math.max(hsl.s+.12,0.24),clamp01(hsl.l+.03));
}

function rollPaletteForSubtype(rng,subtype){
  const def=SUBTYPE_PALETTES[subtype];
  if(!def||!Array.isArray(def.terrain)||def.terrain.length<2)throw new Error(`Missing terrain palette for subtype ${subtype}`);
  const baseIdx=rng.int(0,def.terrain.length-1);
  const primary=def.terrain[baseIdx];
  const secondary=def.terrain[(baseIdx+1)%def.terrain.length];
  const sea=Array.isArray(def.sea)&&def.sea.length?def.sea[rng.int(0,def.sea.length-1)]:null;
  const atmo=atmosphereColorFromBase(rng,sea||primary,[...def.terrain,...(def.sea||[])]);
  return{
    primary,
    secondary,
    sea,
    atmo,
    bg:secondary,
  };
}

function rollPopulationClass(rng,kind,subtype){
  if(kind!=='habitable'||subtype==='machine')return 'uninhabited';
  const r=rng.next();
  if(subtype==='continental')return r<0.6?'moderate':'dense';
  if(subtype==='rocky'){
    if(r<0.5)return 'none';
    if(r<0.8)return 'sparse';
    return 'moderate';
  }
  if(r<0.2)return 'none';
  if(r<0.6)return 'sparse';
  if(r<0.9)return 'moderate';
  return 'dense';
}

function rollHUBody(seed,sysLockouts,orbitR,maxR){
  const rng=mkRNG(seed);
  const size=rng.int(1,6);
  const inGoldilocks=orbitR>=GOLDILOCKS_INNER*maxR&&orbitR<=GOLDILOCKS_OUTER*maxR;
  let kind=(size>=2&&size<=4&&inGoldilocks&&rng.next()<0.5)?'habitable':'uninhabitable';
  let subtype=null;

  if(kind==='habitable'){
    subtype=weightedPickKey(rng,SUBTYPE_WEIGHTS.habitable,name=>{
      if(name==='continental'&&(size<CONTINENTAL_SIZE_RANGE[0]||sysLockouts.continental))return false;
      return true;
    });
    if(!subtype)kind='uninhabitable';
  }
  if(kind==='uninhabitable'){
    subtype=weightedPickKey(rng,SUBTYPE_WEIGHTS.uninhabitable,name=>name!=='machine'||!sysLockouts.machine);
    if(!subtype)throw new Error('No uninhabitable subtype available');
  }

  if(subtype==='continental'||subtype==='machine'){
    sysLockouts.continental=true;
    sysLockouts.machine=true;
  }

  const palette=rollPaletteForSubtype(rng,subtype);
  const atmoRange=ATMO_RANGE_BY_SUBTYPE[subtype];
  if(!Array.isArray(atmoRange)||!atmoRange.length)throw new Error(`Missing atmosphere range for subtype ${subtype}`);
  const atmoKind=atmoRange[rng.int(0,atmoRange.length-1)];
  const populationClass=rollPopulationClass(rng,kind,subtype);
  return{kind,subtype,size,palette,atmoKind,populationClass};
}

function forceContinentalBody(seed,sysLockouts){
  const rng=mkRNG(seed);
  sysLockouts.continental=true;
  sysLockouts.machine=true;
  return{
    kind:'habitable',
    subtype:'continental',
    size:3,
    palette:rollPaletteForSubtype(rng,'continental'),
    atmoKind:'moderate',
    populationClass:rng.next()<0.6?'moderate':'dense',
  };
}

function moonCountForSize(rng,parentSize){
  if(parentSize<3)return 0;
  const n=Math.ceil((parentSize+2)/2);
  const rolled=rng.int(1,n)+rng.int(1,n)-2;
  return Math.min(parentSize,Math.max(0,rolled));
}

function rollMoonSize(rng,parentSize){
  const maxSize=moonMaxSize(parentSize);
  if(maxSize<=0)return 0;
  let size=1;
  while(size<maxSize){
    if(rng.next()>=0.25)break;
    size++;
  }
  return size;
}

function rollMoonOrbitRadius(rng,parentSize,moonIndex=0,moonCount=1){
  const prParent=bodyDrawRadius(parentSize);
  const minOrbitR=prParent*2.2;
  const sizeClamped=Math.max(1,Math.min(10,parentSize||1));
  const maxOrbitScale=1+((sizeClamped-1)/9)*2;
  const maxOrbitR=prParent*4.7*maxOrbitScale*4;
  if(moonCount<=1)return rng.fl(minOrbitR,maxOrbitR);
  const span=Math.max(0,maxOrbitR-minOrbitR);
  const slot=span/moonCount;
  const center=minOrbitR+slot*(moonIndex+0.5);
  const jitter=slot*0.4;
  return Math.max(minOrbitR,Math.min(maxOrbitR,center+rng.fl(-jitter,jitter)));
}

function rollMoonForPlanet(seed,parentBody,sysLockouts,moonIndex=0,moonCount=1){
  const rng=mkRNG(seed);
  const size=rollMoonSize(rng,parentBody.size);
  if(size<=0)return null;

  let kind=size>=2&&rng.next()<0.5?'habitable':'uninhabitable';
  let subtype=null;

  if(kind==='habitable'){
    subtype=weightedPickKey(rng,SUBTYPE_WEIGHTS.habitable,name=>{
      if(name==='continental'&&(size<CONTINENTAL_SIZE_RANGE[0]||sysLockouts.continental))return false;
      return true;
    });
    if(!subtype)kind='uninhabitable';
  }
  if(kind==='uninhabitable'){
    subtype=weightedPickKey(rng,SUBTYPE_WEIGHTS.uninhabitable,name=>name!=='machine'||!sysLockouts.machine);
    if(!subtype)throw new Error('No uninhabitable moon subtype available');
  }

  if(subtype==='continental'||subtype==='machine'){
    sysLockouts.continental=true;
    sysLockouts.machine=true;
  }

  const palette=rollPaletteForSubtype(rng,subtype);
  const atmoRange=ATMO_RANGE_BY_SUBTYPE[subtype];
  if(!Array.isArray(atmoRange)||!atmoRange.length)throw new Error(`Missing atmosphere range for moon subtype ${subtype}`);
  const atmoKind=atmoRange[rng.int(0,atmoRange.length-1)];
  const populationClass=rollPopulationClass(rng,kind,subtype);
  const orbitR=rollMoonOrbitRadius(rng,parentBody.size,moonIndex,moonCount);
  const spdBuckets=ORBITAL_SPEED_BUCKETS.moon;
  return{
    kind,
    subtype,
    size,
    parentId:parentBody.id,
    orbit:{r:orbitR,a:rng.fl(0,Math.PI*2),spd:spdBuckets[rng.int(0,spdBuckets.length-1)]},
    palette,
    atmoKind,
    populationClass,
  };
}

function parentIndexForMoonId(parentBody){
  const m=/^p(\d+)$/.exec(parentBody?.id||'');
  return m?Number(m[1]):0;
}

function ppBodyFromEnterableBody(body){
  const orbit=body.orbit||{r:0,a:0,spd:0};
  if(body.parentId==='star'){
    return{bodyId:body.id,orbitR:orbit.r,orbitA:orbit.a,orbitSpd:orbit.spd};
  }
  const proxy={bodyId:body.id,_owPos:null,_owPosFr:-1};
  Object.defineProperty(proxy,'orbitR',{enumerable:true,get(){
    if(typeof bodyById==='function'&&typeof bodyOWPos==='function'){
      const b=bodyById(this.bodyId);
      if(b){
        const p=bodyOWPos(b),dx=p.x-OW_W/2,dy=p.y-OW_H/2;
        return Math.hypot(dx,dy);
      }
    }
    return orbit.r;
  }});
  Object.defineProperty(proxy,'orbitA',{enumerable:true,get(){
    if(typeof bodyById==='function'&&typeof bodyOWPos==='function'){
      const b=bodyById(this.bodyId);
      if(b){
        const p=bodyOWPos(b);
        return Math.atan2(p.y-OW_H/2,p.x-OW_W/2);
      }
    }
    return orbit.a;
  }});
  Object.defineProperty(proxy,'orbitSpd',{enumerable:true,get(){return 0;}});
  return proxy;
}

function rollGasGiant(seed){
  const rng=mkRNG(seed);
  const size=rng.int(7,10);
  const bands=SUBTYPE_PALETTES.gas_giant.bands;
  const start=rng.int(0,bands.length-1);
  const count=rng.int(2,3);
  const picked=[];
  for(let i=0;i<count;i++)picked.push(bands[(start+i)%bands.length]);
  return{
    kind:'gas_giant',
    subtype:null,
    size,
    palette:{
      primary:picked[0],
      secondary:picked[1]||picked[0],
      sea:null,
      atmo:null,
      bg:picked[picked.length-1],
      bands:picked,
    },
    atmoKind:null,
    populationClass:null,
  };
}

function rollStar(seed){
  const rng=mkRNG(seed);
  const size=rng.int(15,20);
  const family=rng.next()<0.5?'warm':'cool';
  const fam=SUBTYPE_PALETTES.star[family];
  return{
    kind:'star',
    subtype:null,
    size,
    palette:{
      primary:fam.inner[0],
      secondary:fam.mid[0],
      sea:null,
      atmo:null,
      bg:fam.outer[0],
      core:SUBTYPE_PALETTES.star.core[0],
      family,
    },
    atmoKind:null,
    populationClass:null,
  };
}

function bodyLevelTemplateFromBody(body){
  const counts=bodySurfaceCounts(body);
  return{
    ...body,
    bodyId:body.id,
    pcol:body.palette.primary,
    col:body.palette.secondary,
    bg:body.palette.bg||body.palette.secondary,
    grav:FELT_GRAVITY_BY_SIZE[body.size]||0,
    pr:body.pr,
    nObs:counts.nObs,
    nEn:counts.nEn,
    nFu:counts.nFu,
    rxHp:counts.rxHp,
  };
}

// Overworld body orbital parameters
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
    const orbitR=opts.orbitR??(minR+rng.fl(0,Math.max(1,maxR-minR)));
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
function rollOrbit(rng,placed,label,opts={}){
  return placeSite(rng,placed,label,opts);
}

// Asteroid belt bodies + belt particles
function genABodies(rng,placed,opts={}){
  const count=Math.min(MAX_AST_FIELDS,rng.int(1,4)-1);
  if(count===0)return{bodies:[],belt:[]};
  const bodies=[];
  const hasRange=Number.isFinite(opts.minR)&&Number.isFinite(opts.maxR)&&opts.maxR>opts.minR;
  for(let i=0;i<count;i++){
    const body=hasRange
      ?placeSite(rng,placed,`asteroid field ${i+1}`,{minR:opts.minR,maxR:opts.maxR})
      :placeSite(rng,placed,`asteroid field ${i+1}`);
    bodies.push({...body,r:50});
  }
  const belt=[],spread=20,N=160;
  for(let i=0;i<N;i++){
    belt.push({a:rng.fl(0,Math.PI*2),dr:rng.fl(-spread,spread),rv:1.5+rng.fl(0,3),sides:rng.int(5,8),rot:rng.fl(0,Math.PI*2)});
  }
  return{bodies,belt};
}

// Hostile base orbital parameters
function genHBaseBody(rng,placed){
  return{...placeSite(rng,placed,'HBASE'),r:20};
}
// Slipgate orbital parameters - always at maximum orbit radius
function genSlipgateBody(rng,placed){
  const maxOtherOrbit=placed.reduce((m,b)=>Math.max(m,b.orbitR||0),ORBIT_MIN_R);
  const slipOrbit=maxOtherOrbit+400+rng.fl(0,200);
  return{...placeSite(rng,placed,'SLIPGATE',{orbitR:slipOrbit}),r:26};
}

function preferredAsteroidRange(enterablePlanets,gasGiants){
  if(!gasGiants.length||!enterablePlanets.length)return null;
  const innermostGas=Math.min(...gasGiants.map(b=>b.orbit.r));
  const middle=enterablePlanets[Math.floor(enterablePlanets.length/2)].orbit.r;
  const lo=Math.min(innermostGas,middle);
  const hi=Math.max(innermostGas,middle);
  if(hi-lo<120)return null;
  return{minR:lo,maxR:hi};
}

// Master world-generation entry point
function genWorld(seed){
  if(typeof genBackground==='function')genBackground(seed);
  const composition=seed===TUTORIAL_SEED?tutorialSystemComposition():rollSystemComposition(seed);
  const bodyCount=1+composition.huCount+composition.gasCount;
  const worldSize=Math.max(16000,7000+bodyCount*250);
  setOWBounds(worldSize,worldSize);

  const placed=[];
  const maxR=orbitMaxR();
  const orbitRng=mkRNG(seedChild(seed,99));
  const sysLockouts={continental:false,machine:false};
  const planets=[];

  const firstMinR=Math.max(ORBIT_MIN_R,GOLDILOCKS_INNER*maxR);
  const firstMaxR=Math.max(firstMinR+1,Math.min(GOLDILOCKS_OUTER*maxR,maxR*HU_ORBIT_OUTER_FRAC));
  const firstOrbit=rollOrbit(orbitRng,placed,'hu body 0',{minR:firstMinR,maxR:firstMaxR});
  let firstHU=null;
  for(let att=0;att<10;att++){
    const candidate=rollHUBody(seedChild(seed,0x5100+att),sysLockouts,firstOrbit.orbitR,maxR);
    if(candidate.kind==='habitable'){firstHU=candidate;break;}
  }
  if(!firstHU)firstHU=forceContinentalBody(seedChild(seed,0x51FF),sysLockouts);
  planets.push({
    ...firstHU,
    parentId:'star',
    orbit:{r:firstOrbit.orbitR,a:firstOrbit.orbitA,spd:firstOrbit.orbitSpd},
  });

  const huMaxR=Math.max(ORBIT_MIN_R+1,maxR*HU_ORBIT_OUTER_FRAC);
  for(let i=1;i<composition.huCount;i++){
    const orbit=rollOrbit(orbitRng,placed,`hu body ${i}`,{minR:ORBIT_MIN_R,maxR:huMaxR});
    const hu=rollHUBody(seedChild(seed,0x5200+i),sysLockouts,orbit.orbitR,maxR);
    planets.push({
      ...hu,
      parentId:'star',
      orbit:{r:orbit.orbitR,a:orbit.orbitA,spd:orbit.orbitSpd},
    });
  }

  const gasMinR=Math.max(ORBIT_MIN_R,maxR*GAS_ORBIT_INNER_FRAC);
  for(let i=0;i<composition.gasCount;i++){
    const orbit=rollOrbit(orbitRng,placed,`gas giant ${i+1}`,{minR:gasMinR,maxR:maxR});
    const gas=rollGasGiant(seedChild(seed,0x5300+i));
    planets.push({
      ...gas,
      parentId:'star',
      orbit:{r:orbit.orbitR,a:orbit.orbitA,spd:orbit.orbitSpd},
    });
  }

  planets.sort((a,b)=>a.orbit.r-b.orbit.r);
  for(let i=0;i<planets.length;i++){
    planets[i].id=`p${i}`;
    planets[i].pr=bodyDrawRadius(planets[i].size);
  }

  const moonBodies=[];
  let tutorialDesertClamped=false;
  let tutorialBarrenClamped=false;
  let hitBodyCap=false;
  for(let pi=0;pi<planets.length;pi++){
    if(1+planets.length+moonBodies.length>=MAX_BODY_COUNT){hitBodyCap=true;break;}
    const parent=planets[pi];
    const parentSeed=seedChild(seed,0x6000+pi);
    let moonCount=moonCountForSize(mkRNG(parentSeed),parent.size);
    if(seed===TUTORIAL_SEED&&parent.subtype==='desert'&&!tutorialDesertClamped){
      moonCount=Math.min(moonCount,2);
      tutorialDesertClamped=true;
    }
    if(seed===TUTORIAL_SEED&&parent.subtype==='barren'&&!tutorialBarrenClamped){
      moonCount=Math.min(moonCount,1);
      tutorialBarrenClamped=true;
    }
    const parentIndex=parentIndexForMoonId(parent);
    for(let mi=0;mi<moonCount;mi++){
      if(1+planets.length+moonBodies.length>=MAX_BODY_COUNT){hitBodyCap=true;break;}
      const moon=rollMoonForPlanet(seedChild(parentSeed,mi+1),parent,sysLockouts,mi,moonCount);
      if(!moon)continue;
      moon.id=`m${parentIndex}.${mi}`;
      moon.pr=bodyDrawRadius(moon.size);
      moonBodies.push(moon);
    }
    if(hitBodyCap)break;
  }

  const star={
    id:'star',
    parentId:null,
    orbit:{r:0,a:0,spd:0},
    ...rollStar(seedChild(seed,0x5000)),
  };
  star.pr=bodyDrawRadius(star.size);

  const allNonStarBodies=[...planets,...moonBodies];
  const enterable=allNonStarBodies.filter(b=>b.kind==='habitable'||b.kind==='uninhabitable');
  const gasGiants=planets.filter(b=>b.kind==='gas_giant');

  // Keep enterables first for legacy LV/PP index consumers.
  BODIES=[...enterable,...gasGiants,star];
  if(typeof invalidateBodyOWPosCache==='function')invalidateBodyOWPosCache();

  LV=enterable.map((body,i)=>{
    const lv=genPlanet(bodyLevelTemplateFromBody(body),seedChild(seed,0x7000+i),i);
    lv.bodyId=body.id;
    lv.body=body;
    return lv;
  });
  PP=enterable.map(body=>ppBodyFromEnterableBody(body));

  BASE={...rollOrbit(orbitRng,placed,'BASE',{minR:825}),r:22};
  const astRange=preferredAsteroidRange(enterable,gasGiants);
  const abData=astRange
    ?genABodies(mkRNG(seedChild(seed,300)),placed,astRange)
    :genABodies(mkRNG(seedChild(seed,300)),placed);
  AB=abData.bodies;
  AB_BELT=abData.belt;
  HBASE=genHBaseBody(mkRNG(seedChild(seed,400)),placed);
  SLIPGATE=genSlipgateBody(mkRNG(seedChild(seed,500)),placed);

  const flavorRng=mkRNG(seedChild(seed,0x3000));
  G.systemFlavor={
    levelCount:  LV.length,
    archetypeId: composition.archetypeId,
    hasHostileBase: true,                               // placeholder: forced true
    shopSeed:    seedChild(seed,0x3001),                // for future shop variation
    encounterSeed: seedChild(seed,0x3002),              // for future encounter variation
    tier:        flavorRng.int(1,5),
  };
  if(typeof genObjectives === 'function')genObjectives(mkRNG(seedChild(seed,0x3300)));
  console.log(`[PHANTOM] world seed: 0x${seed.toString(16).toUpperCase().padStart(8,'0')}`,G.systemFlavor);
}
