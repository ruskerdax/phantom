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

// ---- Cave terrain generator ----
function genTerrain(rng,wH){
  const mg=40,cx2=W/2;
  const opW=rng.fl(75,110);
  const eL=Math.round(cx2-opW/2),eR=Math.round(cx2+opW/2);

  const nChambers=wH>H*1.5?rng.int(2,3):rng.int(1,2);

  const prof=[{y:0,lx:eL,rx:eR}];
  for(let i=0;i<nChambers;i++){
    const chamberT=(i+.5)/nChambers;
    const cY=wH*(0.13+chamberT*.72);
    const cW=rng.fl(260,420);
    const cOff=rng.fl(-65,65);
    prof.push({y:cY,
      lx:Math.max(mg,cx2+cOff-cW/2),
      rx:Math.min(W-mg,cx2+cOff+cW/2)});
    if(i<nChambers-1){
      const pY=wH*((i+1)/nChambers*.86);
      const pW=rng.fl(118,185);
      const pOff=rng.fl(-65,65);
      prof.push({y:pY,
        lx:Math.max(mg+12,cx2+pOff-pW/2),
        rx:Math.min(W-mg-12,cx2+pOff+pW/2)});
    }
  }
  prof.push({y:wH*.93,lx:mg+rng.fl(14,50),rx:W-mg-rng.fl(14,50)});
  prof.sort((a,b)=>a.y-b.y);

  const lNA=rng.fl(6,16),lNF=rng.fl(2.5,4.5),lNP=rng.fl(0,Math.PI*2);
  const rNA=rng.fl(6,16),rNF=rng.fl(2.5,4.5),rNP=rng.fl(0,Math.PI*2);

  const n=11;
  const leftWall=[[eL,0]],rightWall=[];
  for(let i=1;i<=n;i++){
    const t=i/(n+1);
    const y=Math.round(t*wH*.91);
    let k0=prof[0],k1=prof[prof.length-1];
    for(let j=0;j<prof.length-1;j++){if(y>=prof[j].y&&y<=prof[j+1].y){k0=prof[j];k1=prof[j+1];break;}}
    const kt=k1.y>k0.y?(y-k0.y)/(k1.y-k0.y):0;
    const st=kt*kt*(3-2*kt);
    const baseLx=k0.lx+st*(k1.lx-k0.lx);
    const baseRx=k0.rx+st*(k1.rx-k0.rx);
    const lx=baseLx+lNA*Math.sin(t*Math.PI*lNF+lNP);
    const rx=baseRx-rNA*Math.sin(t*Math.PI*rNF+rNP);
    leftWall.push([Math.round(Math.max(mg,Math.min(W*.44,lx))),y]);
    rightWall.push([Math.round(Math.max(W*.56,Math.min(W-mg,rx))),y]);
  }
  const bY=Math.round(wH*.93+rng.fl(-15,15));
  const bottom=[];
  for(let i=0;i<=4;i++){const t=i/4;bottom.push([Math.round(mg+t*(W-2*mg)),bY+Math.round(rng.fl(-12,12))]);}

  const pts=[...leftWall,...bottom,...[...rightWall].reverse(),[eR,0]];
  return{pts,eL,eR};
}

// ---- Obstacle polygons ----
function genObs(rng,terrain,wH,count){
  const obs=[];
  const zStart=wH*.14,zEnd=wH*.87,zH=(zEnd-zStart)/Math.max(count,1);
  const order=[...Array(count).keys()];
  for(let i=order.length-1;i>0;i--){const j=rng.int(0,i);[order[i],order[j]]=[order[j],order[i]];}
  for(let zi=0;zi<count;zi++){
    const zone=order[zi];
    const yMid=zStart+zone*zH+zH/2;
    for(let att=0;att<35;att++){
      const tier=rng.next();
      const r=tier<.5?rng.fl(16,30):tier<.8?rng.fl(31,54):rng.fl(55,88);
      const cx2=rng.fl(W*.14,W*.86);
      const cy2=yMid+rng.fl(-zH*.32,zH*.32);
      if(!pip(cx2,cy2,terrain))continue;
      let bad=false;
      const wallClr=Math.max(24,r*.5);
      for(let i=0;i<terrain.length-1&&!bad;i++)
        if(dseg(cx2,cy2,terrain[i][0],terrain[i][1],terrain[i+1][0],terrain[i+1][1])<wallClr)bad=true;
      for(const o of obs){if(bad)break;if(pip(cx2,cy2,o))bad=true;}
      if(bad)continue;
      const np=r>50?rng.int(5,8):rng.int(4,6);
      const poly=[];
      for(let j=0;j<np;j++){
        const a=(j/np)*Math.PI*2+rng.fl(-.32,.32);
        poly.push([Math.round(cx2+Math.cos(a)*r*rng.fl(.6,1.2)),
                   Math.round(cy2+Math.sin(a)*r*rng.fl(.6,1.2))]);
      }
      obs.push(poly);
      break;
    }
  }
  return obs;
}

// ---- Turret placement helpers ----
function _turretOnWall(rng,terrain,wH){
  const segs=[];
  for(let i=0;i<terrain.length-1;i++){
    const midY=(terrain[i][1]+terrain[i+1][1])/2;
    if(midY<wH*.07||midY>wH*.89)continue;
    segs.push(i);
  }
  if(!segs.length)return null;
  const idx=segs[rng.int(0,segs.length-1)];
  const p0=terrain[idx],p1=terrain[idx+1];
  const t=rng.fl(.18,.82);
  const wx=p0[0]+t*(p1[0]-p0[0]),wy=p0[1]+t*(p1[1]-p0[1]);
  const dx=p1[0]-p0[0],dy=p1[1]-p0[1];
  let nx=-dy,ny=dx;
  const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;
  if(nx*(W/2-wx)+ny*(wH/2-wy)<0){nx=-nx;ny=-ny;}
  return{x:Math.round(wx+nx*7),y:Math.round(wy+ny*7),a:Math.atan2(nx,-ny)};
}

function _turretOnObs(rng,obs){
  const o=rng.pick(obs);
  const ocx=o.reduce((s,p)=>s+p[0],0)/o.length;
  const ocy=o.reduce((s,p)=>s+p[1],0)/o.length;
  const idx=rng.int(0,o.length-1);
  const p0=o[idx],p1=o[(idx+1)%o.length];
  const t=rng.fl(.18,.82);
  const ex=p0[0]+t*(p1[0]-p0[0]),ey=p0[1]+t*(p1[1]-p0[1]);
  const dx=p1[0]-p0[0],dy=p1[1]-p0[1];
  let nx=-dy,ny=dx;
  const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;
  if(nx*(ocx-ex)+ny*(ocy-ey)>0){nx=-nx;ny=-ny;}
  return{x:Math.round(ex+nx*8),y:Math.round(ey+ny*8),a:Math.atan2(nx,-ny)};
}

// ---- Turret (cave enemy) placement ----
function genEnemies(rng,terrain,obs,guardObs,wH,count){
  const en=[];
  if(guardObs){
    for(let g=0;g<2&&en.length<count;g++){
      for(let att=0;att<25;att++){
        const c=_turretOnObs(rng,[guardObs]);
        if(!c||!pip(c.x,c.y,terrain))continue;
        if(obs.some(o=>pip(c.x,c.y,o)))continue;
        if(en.some(e=>Math.hypot(c.x-e.x,c.y-e.y)<40))continue;
        en.push(c);break;
      }
    }
  }
  for(let att=0;att<count*40&&en.length<count;att++){
    const useObs=obs.length>0&&rng.next()<.6;
    const c=useObs?_turretOnObs(rng,obs):_turretOnWall(rng,terrain,wH);
    if(!c)continue;
    if(!pip(c.x,c.y,terrain))continue;
    if(obs.some(o=>pip(c.x,c.y,o)))continue;
    if(en.some(e=>Math.hypot(c.x-e.x,c.y-e.y)<50))continue;
    en.push(c);
  }
  return en;
}

// ---- Energy pickup placement ----
function genEnergy(rng,terrain,obs,en,wH,count){
  const fu=[];
  for(let att=0;att<count*30&&fu.length<count;att++){
    const x=rng.fl(W*.12,W*.88),y=rng.fl(wH*.5,wH*.92);
    if(!pip(x,y,terrain))continue;
    if(obs.some(o=>pip(x,y,o)))continue;
    if(en.some(e=>Math.hypot(x-e.x,y-e.y)<44))continue;
    fu.push({x:Math.round(x),y:Math.round(y)});
  }
  return fu;
}

// ---- Reactor placement ----
function genReactor(rng,terrain,obs,wH){
  for(let att=0;att<120;att++){
    const x=rng.fl(W*.28,W*.72),y=rng.fl(wH*.72,wH*.91);
    if(!pip(x,y,terrain))continue;
    if(obs.some(o=>pip(x,y,o)))continue;
    let bad=false;
    for(let i=0;i<terrain.length-1&&!bad;i++)
      if(dseg(x,y,terrain[i][0],terrain[i][1],terrain[i+1][0],terrain[i+1][1])<28)bad=true;
    if(!bad)return{x:Math.round(x),y:Math.round(y)};
  }
  return{x:Math.round(W/2),y:Math.round(wH*.86)};
}

// ---- Reactor guard obstacle ----
function ensureReactorGuard(rng,terrain,obs,rxPos,wH){
  const guardR=150;
  for(const o of obs){
    const ocx=o.reduce((s,p)=>s+p[0],0)/o.length;
    const ocy=o.reduce((s,p)=>s+p[1],0)/o.length;
    if(Math.hypot(ocx-rxPos.x,ocy-rxPos.y)<guardR)return o;
  }
  for(let att=0;att<80;att++){
    const ang=rng.fl(0,Math.PI*2);
    const dist=rng.fl(55,115);
    const cx2=rxPos.x+Math.cos(ang)*dist;
    const cy2=rxPos.y+Math.sin(ang)*dist;
    if(!pip(cx2,cy2,terrain))continue;
    if(obs.some(o=>pip(cx2,cy2,o)))continue;
    const r=rng.fl(28,50);
    let bad=false;
    for(let i=0;i<terrain.length-1&&!bad;i++)
      if(dseg(cx2,cy2,terrain[i][0],terrain[i][1],terrain[i+1][0],terrain[i+1][1])<r*.4)bad=true;
    if(bad)continue;
    const np=rng.int(4,6);
    const poly=[];
    for(let j=0;j<np;j++){
      const a=(j/np)*Math.PI*2+rng.fl(-.3,.3);
      poly.push([Math.round(cx2+Math.cos(a)*r*rng.fl(.65,1.15)),
                 Math.round(cy2+Math.sin(a)*r*rng.fl(.65,1.15))]);
    }
    obs.push(poly);
    return poly;
  }
  if(obs.length){
    return obs.reduce((best,o)=>{
      const ocx=o.reduce((s,p)=>s+p[0],0)/o.length;
      const ocy=o.reduce((s,p)=>s+p[1],0)/o.length;
      const bcx=best.reduce((s,p)=>s+p[0],0)/best.length;
      const bcy=best.reduce((s,p)=>s+p[1],0)/best.length;
      return Math.hypot(ocx-rxPos.x,ocy-rxPos.y)<Math.hypot(bcx-rxPos.x,bcy-rxPos.y)?o:best;
    });
  }
  return null;
}

// ---- Compose a full level from template + seed ----
function genLevel(tmpl,seed){
  const rng=mkRNG(seed);
  const wH=Math.round(rng.fl(H*1.6,H*3));
  const{pts:terrain,eL,eR}=genTerrain(rng,wH);
  const obs      =genObs(rng,terrain,wH,tmpl.nObs);
  const rxPos    =genReactor(rng,terrain,obs,wH);
  const guardObs =ensureReactorGuard(rng,terrain,obs,rxPos,wH);
  const en       =genEnemies(rng,terrain,obs,guardObs,wH,tmpl.nEn);
  const fu       =genEnergy(rng,terrain,obs,en,wH,tmpl.nFu);
  const rx       ={...rxPos,hp:tmpl.rxHp};
  const ent      ={x:Math.round((eL+eR)/2),y:Math.round(wH*.038+18)};
  return{...tmpl,worldH:wH,terrain,obs,en,fu,rx,ent};
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
  LV=LV_TMPL.map((tmpl,i)=>genLevel(tmpl,seedChild(seed,i)));
  const bodies=genOWBodies(mkRNG(seedChild(seed,99)));
  BASE={...bodies[0],r:22};
  PP=bodies.slice(1);
  const abData=genABodies(mkRNG(seedChild(seed,300)),bodies);
  AB=abData.bodies;AB_BELT=abData.belt;
  HBASE=genHBaseBody(mkRNG(seedChild(seed,400)),[bodies[0]]);
  SLIPGATE=genSlipgateBody(mkRNG(seedChild(seed,500)),[...bodies,HBASE]);
  console.log(`[PHANTOM] world seed: 0x${seed.toString(16).toUpperCase().padStart(8,'0')}`);
}
