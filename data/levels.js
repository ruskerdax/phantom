'use strict';

function hslToHex(h,s,l){
  const a=s*Math.min(l,1-l);
  const f=n=>{
    const k=(n+h/30)%12;
    const c=l-a*Math.max(-1,Math.min(k-3,Math.min(9-k,1)));
    return Math.round(255*c).toString(16).padStart(2,'0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hueDist(a,b){
  const d=Math.abs((((a-b)%360)+540)%360-180);
  return d;
}

function genPlanetHue(rng,prevColors){
  let best=rng.fl(0,360),bestDist=-1;
  for(let att=0;att<96;att++){
    const h=rng.fl(0,360);
    const minDist=prevColors.length?Math.min(...prevColors.map(p=>hueDist(h,p.h))):360;
    if(minDist>=45)return h;
    if(minDist>bestDist){best=h;bestDist=minDist;}
  }
  return best;
}

function genPlanetTmpl(rng,prevColors){
  const h=genPlanetHue(rng,prevColors);
  const s=rng.fl(.65,.92),l=rng.fl(.45,.62);
  prevColors.push({h});
  return{
    pcol:hslToHex(h,s,l),
    col:hslToHex(h,s,Math.min(.72,l+.12)),
    bg:hslToHex(h,s,.04),
    grav:rng.fl(.001,.008),
    pr:rng.int(28,36),
    nObs:rng.int(2,5),
    nEn:rng.int(3,7),
    nFu:rng.int(2,3),
    rxHp:rng.int(30,80)
  };
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

function _placeWallTurrets(rng,terrain,wH,count,minSpacing){
  const en=[];
  for(let att=0;att<count*40&&en.length<count;att++){
    const c=_turretOnWall(rng,terrain,wH);
    if(!c)continue;
    if(!pip(c.x,c.y,terrain))continue;
    if(en.some(e=>Math.hypot(c.x-e.x,c.y-e.y)<minSpacing))continue;
    en.push(c);
  }
  return en;
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

function laserBlocksPath(f, ax, ay, bx, by){
  return segHitParam(ax,ay,bx,by,f.a.x,f.a.y,f.b.x,f.b.y)!=null;
}

const LASER_MAX_TILT_RAD=Math.PI/18; // 10 deg
const LASER_MAX_TILT_TAN=Math.tan(LASER_MAX_TILT_RAD);
const LASER_ANCHOR_SEARCH_MAX=128;
const LASER_ANCHOR_SEARCH_STEP=1;
const LASER_ANCHOR_BINARY_STEPS=8;
const LASER_ANCHOR_INSET=.35;

function sitePointOpen(siteData,x,y){
  return pip(x,y,siteData.terrain)&&!(siteData.obs||[]).some(o=>pip(x,y,o));
}

function laserBoundaryAnchor(siteData,start,outward){
  const len=Math.hypot(outward.x,outward.y);
  if(len<1e-6)return null;
  const ux=outward.x/len,uy=outward.y/len;
  let sx=start.x,sy=start.y;
  if(!sitePointOpen(siteData,sx,sy)){
    let found=false;
    for(let t=LASER_ANCHOR_SEARCH_STEP;t<=LASER_ANCHOR_SEARCH_MAX;t+=LASER_ANCHOR_SEARCH_STEP){
      const ix=start.x-ux*t,iy=start.y-uy*t;
      if(sitePointOpen(siteData,ix,iy)){sx=ix;sy=iy;found=true;break;}
    }
    if(!found)return null;
  }
  let lo=0,hi=null;
  for(let t=LASER_ANCHOR_SEARCH_STEP;t<=LASER_ANCHOR_SEARCH_MAX;t+=LASER_ANCHOR_SEARCH_STEP){
    const x=sx+ux*t,y=sy+uy*t;
    if(!sitePointOpen(siteData,x,y)){hi=t;break;}
    lo=t;
  }
  if(hi==null)return{x:sx+ux*lo,y:sy+uy*lo};
  for(let i=0;i<LASER_ANCHOR_BINARY_STEPS;i++){
    const mid=(lo+hi)*.5;
    const x=sx+ux*mid,y=sy+uy*mid;
    if(sitePointOpen(siteData,x,y))lo=mid;
    else hi=mid;
  }
  const t=Math.max(0,lo-LASER_ANCHOR_INSET);
  return{x:sx+ux*t,y:sy+uy*t};
}

function snapFenceToBoundary(siteData,a,b,minLen){
  const dx=b.x-a.x,dy=b.y-a.y;
  if(Math.hypot(dx,dy)<2)return null;
  const a2=laserBoundaryAnchor(siteData,a,{x:-dx,y:-dy});
  const b2=laserBoundaryAnchor(siteData,b,{x:dx,y:dy});
  if(!a2||!b2)return null;
  if(!sitePointOpen(siteData,a2.x,a2.y)||!sitePointOpen(siteData,b2.x,b2.y))return null;
  if(Math.hypot(b2.x-a2.x,b2.y-a2.y)<minLen)return null;
  return{a:a2,b:b2};
}

function interiorRunsAtY(siteData,y,step=4){
  const runs=[];
  let x0=null,lastX=0;
  for(let x=24;x<=W-24;x+=step){
    const open=sitePointOpen(siteData,x,y);
    if(open&&x0==null)x0=x;
    if(!open&&x0!=null){runs.push({x0,x1:lastX});x0=null;}
    lastX=x;
  }
  if(x0!=null)runs.push({x0,x1:lastX});
  return runs.filter(r=>r.x1-r.x0>=24);
}

function interiorRunsAtX(siteData,x,step=4){
  const runs=[];
  let y0=null,lastY=0;
  const yMax=(siteData.worldH||H)-18;
  for(let y=18;y<=yMax;y+=step){
    const open=sitePointOpen(siteData,x,y);
    if(open&&y0==null)y0=y;
    if(!open&&y0!=null){runs.push({y0,y1:lastY});y0=null;}
    lastY=y;
  }
  if(y0!=null)runs.push({y0,y1:lastY});
  return runs.filter(r=>r.y1-r.y0>=24);
}

function widestRunAtY(siteData,y){
  const runs=interiorRunsAtY(siteData,y);
  if(!runs.length)return null;
  return runs.reduce((a,b)=>(b.x1-b.x0)>(a.x1-a.x0)?b:a);
}

function widestRunAtX(siteData,x){
  const runs=interiorRunsAtX(siteData,x);
  if(!runs.length)return null;
  return runs.reduce((a,b)=>(b.y1-b.y0)>(a.y1-a.y0)?b:a);
}

function runAtYForX(siteData,y,preferX){
  const runs=interiorRunsAtY(siteData,y);
  if(!runs.length)return null;
  if(Number.isFinite(preferX)){
    const contains=runs.filter(r=>preferX>=r.x0&&preferX<=r.x1);
    if(contains.length)return contains.reduce((a,b)=>(b.x1-b.x0)>(a.x1-a.x0)?b:a);
    const nearest=runs.slice().sort((a,b)=>{
      const ac=(a.x0+a.x1)*.5,bc=(b.x0+b.x1)*.5;
      return Math.abs(ac-preferX)-Math.abs(bc-preferX);
    })[0];
    if(nearest)return nearest;
  }
  return runs.reduce((a,b)=>(b.x1-b.x0)>(a.x1-a.x0)?b:a);
}

function runAtXForY(siteData,x,preferY){
  const runs=interiorRunsAtX(siteData,x);
  if(!runs.length)return null;
  if(Number.isFinite(preferY)){
    const contains=runs.filter(r=>preferY>=r.y0&&preferY<=r.y1);
    if(contains.length)return contains.reduce((a,b)=>(b.y1-b.y0)>(a.y1-a.y0)?b:a);
    const nearest=runs.slice().sort((a,b)=>{
      const ac=(a.y0+a.y1)*.5,bc=(b.y0+b.y1)*.5;
      return Math.abs(ac-preferY)-Math.abs(bc-preferY);
    })[0];
    if(nearest)return nearest;
  }
  return runs.reduce((a,b)=>(b.y1-b.y0)>(a.y1-a.y0)?b:a);
}

function buildSiteMainPath(siteData,entry,step=16){
  const xMin=24,xMax=W-24,yMin=18,yMax=(siteData.worldH||H)-18;
  const toGrid=(v,min)=>Math.round((Math.max(min,Math.min(v,maxFor(min)))-min)/step)*step+min;
  function maxFor(min){return min===xMin?xMax:yMax;}
  const key=(x,y)=>`${x}|${y}`;
  const parse=(k)=>{const s=k.split('|');return{x:Number(s[0]),y:Number(s[1])};};
  const nearestOpen=(x,y)=>{
    const sx=toGrid(x,xMin),sy=toGrid(y,yMin);
    if(sitePointOpen(siteData,sx,sy))return{x:sx,y:sy};
    for(let r=1;r<=6;r++){
      for(let ox=-r;ox<=r;ox++){
        for(let oy=-r;oy<=r;oy++){
          if(Math.abs(ox)!==r&&Math.abs(oy)!==r)continue;
          const nx=sx+ox*step,ny=sy+oy*step;
          if(nx<xMin||nx>xMax||ny<yMin||ny>yMax)continue;
          if(sitePointOpen(siteData,nx,ny))return{x:nx,y:ny};
        }
      }
    }
    return null;
  };
  const start=nearestOpen(entry?.x??W/2,entry?.y??32);
  if(!start)return [];
  const q=[start],seen=new Set([key(start.x,start.y)]),parent={},nodes={};
  nodes[key(start.x,start.y)]={x:start.x,y:start.y};
  let deepest=key(start.x,start.y),deepY=start.y;
  while(q.length){
    const cur=q.shift(),kCur=key(cur.x,cur.y);
    if(cur.y>deepY){deepY=cur.y;deepest=kCur;}
    for(const dxy of [[step,0],[-step,0],[0,step],[0,-step]]){
      const nx=cur.x+dxy[0],ny=cur.y+dxy[1];
      if(nx<xMin||nx>xMax||ny<yMin||ny>yMax)continue;
      const k=key(nx,ny);
      if(seen.has(k))continue;
      if(!sitePointOpen(siteData,nx,ny))continue;
      seen.add(k);
      parent[k]=kCur;
      nodes[k]={x:nx,y:ny};
      q.push({x:nx,y:ny});
    }
  }
  const path=[];
  let cur=deepest;
  while(cur){
    path.push(nodes[cur]||parse(cur));
    cur=parent[cur];
  }
  path.reverse();
  return path;
}

function mkFenceAcrossOpening(rng,siteData,axis,coord,prefer=null){
  if(axis==='vertical'){
    const run=runAtXForY(siteData,coord,prefer?.y);
    if(!run)return null;
    const y0=Math.round(run.y0),y1=Math.round(run.y1);
    if(y1-y0<42)return null;
    const dxMax=Math.max(0,Math.floor((y1-y0)*LASER_MAX_TILT_TAN));
    const dx=dxMax>0?rng.int(-dxMax,dxMax):0;
    const a={x:Math.round(coord-dx),y:y0},b={x:Math.round(coord+dx),y:y1};
    const snapped=snapFenceToBoundary(siteData,a,b,40);
    if(!snapped)return null;
    return {a:snapped.a,b:snapped.b,axis:'vertical',coord};
  }
  const run=runAtYForX(siteData,coord,prefer?.x);
  if(!run)return null;
  const x0=Math.round(run.x0),x1=Math.round(run.x1);
  if(x1-x0<70)return null;
  const dyMax=Math.max(0,Math.floor((x1-x0)*LASER_MAX_TILT_TAN));
  const dy=dyMax>0?rng.int(-dyMax,dyMax):0;
  const a={x:x0,y:Math.round(coord-dy)},b={x:x1,y:Math.round(coord+dy)};
  const snapped=snapFenceToBoundary(siteData,a,b,64);
  if(!snapped)return null;
  return {a:snapped.a,b:snapped.b,axis:'horizontal',coord};
}

function caveWalkReachable(siteData, entry, stations, fences){
  // P1-07 safety rule: laser fences must never cut off underground power stations.
  // We flood-fill from the entrance while treating each fence segment as a solid wall;
  // a fence candidate is accepted only if all station points remain reachable.
  if(!stations.length) return true;
  const step=20;
  const xMin=20,xMax=W-20,yMin=16,yMax=(siteData.worldH||H)-16;
  const key=(x,y)=>`${x}|${y}`;
  const q=[],seen=new Set(),reached=new Set();
  const sx=Math.round(Math.max(xMin,Math.min(xMax,entry.x))/step)*step;
  const sy=Math.round(Math.max(yMin,Math.min(yMax,entry.y))/step)*step;
  q.push({x:sx,y:sy});seen.add(key(sx,sy));
  while(q.length){
    const cur=q.shift();
    for(let i=0;i<stations.length;i++)if(Math.hypot(cur.x-stations[i].x,cur.y-stations[i].y)<=28)reached.add(i);
    if(reached.size===stations.length)return true;
    for(const dxy of [[step,0],[-step,0],[0,step],[0,-step]]){
      const nx=cur.x+dxy[0],ny=cur.y+dxy[1];
      if(nx<xMin||nx>xMax||ny<yMin||ny>yMax)continue;
      const k=key(nx,ny);
      if(seen.has(k))continue;
      if(!pip(nx,ny,siteData.terrain))continue;
      if((siteData.obs||[]).some(o=>pip(nx,ny,o)))continue;
      if(fences.some(f=>laserBlocksPath(f,cur.x,cur.y,nx,ny)))continue;
      seen.add(k);q.push({x:nx,y:ny});
    }
  }
  return reached.size===stations.length;
}

function genLaserDefensesInSite(rng,siteData,entry,opts={}){
  const fences=[],target=rng.int(1,3);
  const axis=opts.axis==='vertical'?'vertical':'horizontal';
  // NOTE: underground POWER_STATION buildings must already be in siteData.buildings
  // before this runs, otherwise reachability enforcement cannot protect them.
  const stations=(siteData.buildings||[]).filter(b=>b.classId===BUILDING_CLASS_IDS.POWER_STATION);
  const yMin=Math.min((siteData.worldH||H)-90,Math.max(90,(entry?.y||0)+200));
  const yMax=(siteData.worldH||H)-70;
  const xMin=Math.max(90,(entry?.x||W/2)-220);
  const xMax=Math.min(W-90,(entry?.x||W/2)+220);
  const coordMin=axis==='vertical'?xMin:yMin;
  const coordMax=axis==='vertical'?xMax:yMax;
  const path=buildSiteMainPath(siteData,entry,16);
  const pathCut=Math.floor(path.length*.2);
  const pathSamples=path.slice(pathCut).filter(p=>{
    const c=axis==='vertical'?p.x:p.y;
    return c>=coordMin&&c<=coordMax;
  });
  for(let att=0;att<240&&fences.length<target;att++){
    const prefer=(pathSamples.length&&rng.next()<.85)?rng.pick(pathSamples):null;
    const rawCoord=prefer?(axis==='vertical'?prefer.x+rng.fl(-14,14):prefer.y+rng.fl(-18,18)):rng.fl(coordMin,coordMax);
    const coord=Math.max(coordMin,Math.min(coordMax,rawCoord));
    const f=mkFenceAcrossOpening(rng,siteData,axis,coord,prefer);
    if(!f)continue;
    if(fences.some(x=>Math.abs((x.coord??0)-coord)<18))continue;
    if(!caveWalkReachable(siteData,entry,stations,[...fences,f]))continue;
    fences.push(mkBuilding(BUILDING_CLASS_IDS.LASER_DEFENSE,Math.round((f.a.x+f.b.x)/2),Math.round((f.a.y+f.b.y)/2),{a:f.a,b:f.b,axis:f.axis,coord}));
  }
  if(!fences.length&&pathSamples.length){
    for(const prefer of pathSamples){
      const coord=axis==='vertical'?prefer.x:prefer.y;
      const f=mkFenceAcrossOpening(rng,siteData,axis,coord,prefer);
      if(!f)continue;
      if(!caveWalkReachable(siteData,entry,stations,[...fences,f]))continue;
      fences.push(mkBuilding(BUILDING_CLASS_IDS.LASER_DEFENSE,Math.round((f.a.x+f.b.x)/2),Math.round((f.a.y+f.b.y)/2),{a:f.a,b:f.b,axis:f.axis,coord}));
      if(fences.length>=target)break;
    }
  }
  for(let coord=coordMin;coord<=coordMax&&fences.length===0;coord+=14){
    const f=mkFenceAcrossOpening(rng,siteData,axis,coord,null);
    if(!f)continue;
    if(!caveWalkReachable(siteData,entry,stations,[...fences,f]))continue;
    fences.push(mkBuilding(BUILDING_CLASS_IDS.LASER_DEFENSE,Math.round((f.a.x+f.b.x)/2),Math.round((f.a.y+f.b.y)/2),{a:f.a,b:f.b,axis:f.axis,coord}));
  }
  if(!fences.length)console.warn('laser-defense placement failed for site',siteData?.kind);
  return fences;
}

// ---- Compose a cave level from template + seed ----
function genCaveLevel(tmpl,seed){
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
  const cave={...tmpl,kind:'cave',worldH:wH,terrain,obs,en,fu,rx,ent};
  cave.buildings=genLaserDefensesInSite(rng,cave,ent);
  return cave;
}

// ---- Surface terrain helpers ----
function surfaceYAt(surface,x){
  const w=surface.worldW,pts=surface.terrain;
  if(!pts.length)return H*.72;
  x=wrap(x,w);
  let lo=0,hi=pts.length-2;
  while(lo<hi){
    const mid=(lo+hi+1)>>1;
    if(pts[mid][0]<=x)lo=mid;
    else hi=mid-1;
  }
  const i=Math.max(0,Math.min(pts.length-2,lo));
  const a=pts[i],b=pts[i+1],t=(x-a[0])/(b[0]-a[0]||1);
  return a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,t));
}

const SURFACE_REGION_DEFS={
  flat:{weight:.30,minW:200,maxW:600},
  hills:{weight:.45,minW:250,maxW:800},
  mountains:{weight:.20,minW:320,maxW:850},
  plateau:{weight:.025,minW:250,maxW:500},
  crater:{weight:.025,minW:200,maxW:450}
};
const SURFACE_REGION_KINDS=Object.keys(SURFACE_REGION_DEFS);
const SURFACE_MIN_REGION_WIDTH=200;
const SURFACE_Y_MIN=H*.28;
const SURFACE_Y_MAX=H*.94;

function clampSurfaceY(y){return Math.max(SURFACE_Y_MIN,Math.min(SURFACE_Y_MAX,y));}

function pickSurfaceRegionKind(rng){
  let roll=rng.next()*SURFACE_REGION_KINDS.reduce((a,k)=>a+SURFACE_REGION_DEFS[k].weight,0);
  for(const kind of SURFACE_REGION_KINDS){
    roll-=SURFACE_REGION_DEFS[kind].weight;
    if(roll<=0)return kind;
  }
  return 'hills';
}

function buildSurfaceRegions(rng,worldW){
  const regions=[];
  let x=0,flatCount=0;
  while(x<worldW){
    const remaining=worldW-x,needFlat=Math.max(0,3-flatCount);
    let kind=(needFlat&&remaining<=needFlat*SURFACE_REGION_DEFS.flat.max+SURFACE_MIN_REGION_WIDTH)?'flat':pickSurfaceRegionKind(rng);
    const def=SURFACE_REGION_DEFS[kind];
    let width=Math.round(rng.fl(def.minW,def.maxW));
    if(remaining<=def.maxW&&remaining>=def.minW)width=Math.round(remaining);
    if(remaining-width>0&&remaining-width<SURFACE_MIN_REGION_WIDTH)width=Math.round(remaining);
    width=Math.max(1,Math.min(Math.round(remaining),width));
    const x0=Math.round(x),x1=Math.round(x+width);
    regions.push({x0,x1,kind});
    if(kind==='flat')flatCount++;
    x=x1;
  }
  for(let i=0;flatCount<3&&i<regions.length;i++){
    const r=regions[i];
    if(r.kind!=='flat'&&r.x1-r.x0>=SURFACE_REGION_DEFS.flat.minW&&r.x1-r.x0<=SURFACE_REGION_DEFS.flat.maxW){
      r.kind='flat';
      flatCount++;
    }
  }
  return regions;
}

function addSurfaceTerrainPoint(terrain,x,y){
  const px=Math.round(x),py=Math.round(clampSurfaceY(y));
  const last=terrain[terrain.length-1];
  if(last&&px<=last[0]){
    last[1]=Math.round((last[1]+py)/2);
    return;
  }
  terrain.push([px,py]);
}

function genTerrainFlat(rng,terrain,region,y0,y1){
  const n=Math.max(2,Math.ceil((region.x1-region.x0)/55));
  for(let i=0;i<=n;i++){
    const t=i/n,x=region.x0+(region.x1-region.x0)*t;
    addSurfaceTerrainPoint(terrain,x,y0+(y1-y0)*t+rng.fl(-3,3));
  }
}

function genTerrainHills(rng,terrain,region,y0,y1){
  const n=Math.max(4,Math.ceil((region.x1-region.x0)/38));
  const amp=rng.fl(18,32),phase=rng.fl(0,Math.PI*2);
  for(let i=0;i<=n;i++){
    const t=i/n,x=region.x0+(region.x1-region.x0)*t,blend=Math.sin(Math.PI*t);
    const wave=Math.sin(t*Math.PI*2+phase)*amp*blend;
    addSurfaceTerrainPoint(terrain,x,y0+(y1-y0)*t+wave);
  }
}

function emitMountainKnee(terrain,saddleX,saddleY,peakX,peakY,sharpness,rng){
  if(rng.next()<.22)return;
  const kneeT=rng.fl(.20,.45);
  const kneeRiseFrac=Math.min(kneeT,rng.fl(.10,.45))*(1-sharpness*.35);
  const kx=saddleX+(peakX-saddleX)*kneeT;
  const ky=saddleY+(peakY-saddleY)*kneeRiseFrac;
  addSurfaceTerrainPoint(terrain,kx,ky+rng.fl(-3,3));
}

function genTerrainMountains(rng,terrain,region,y0,y1){
  const w=region.x1-region.x0;
  const startY=clampSurfaceY(y0),endY=clampSurfaceY(y1);
  const baseY=Math.max(startY,endY);
  const peakBudget=300;

  const cr=rng.next();
  const character=cr<.40?'jagged':cr<.70?'dominant':cr<.85?'twin':'cascading';

  let peakCount=Math.max(2,Math.min(5,Math.round(w/rng.fl(140,200))));
  if(character==='twin')peakCount=2;

  const peaks=[];
  const slot=w/peakCount;
  const edge=Math.min(35,slot*.35);
  for(let i=0;i<peakCount;i++){
    let x=region.x0+slot*(i+.5)+rng.fl(-slot*.30,slot*.30);
    x=Math.max(region.x0+edge,Math.min(region.x1-edge,x));
    peaks.push({x});
  }
  peaks.sort((a,b)=>a.x-b.x);
  for(let i=1;i<peaks.length;i++)
    if(peaks[i].x-peaks[i-1].x<60)peaks[i].x=Math.min(region.x1-edge,peaks[i-1].x+60);

  if(character==='dominant'){
    const alpha=rng.int(0,peakCount-1);
    peaks.forEach((p,i)=>p.h=peakBudget*(i===alpha?rng.fl(.90,1.0):rng.fl(.35,.62)));
  }else if(character==='jagged'){
    peaks.forEach(p=>p.h=peakBudget*rng.fl(.55,1.0));
  }else if(character==='twin'){
    peaks.forEach(p=>p.h=peakBudget*rng.fl(.80,.95));
  }else{
    const desc=rng.next()<.5;
    const denom=Math.max(1,peakCount-1);
    peaks.forEach((p,i)=>{
      const t=desc?i/denom:1-i/denom;
      p.h=peakBudget*(rng.fl(.95,1.0)-t*rng.fl(.40,.55));
    });
  }
  peaks.forEach(p=>{p.lSh=rng.fl(0,1);p.rSh=rng.fl(0,1);});

  const maxH=Math.max(...peaks.map(p=>p.h));
  const ridgeFloorBase=baseY-maxH*rng.fl(.40,.65);

  let deepIdx=-1;
  if(peakCount>=3&&rng.next()<.28)deepIdx=rng.int(0,peakCount-2);

  const last=terrain[terrain.length-1];
  if(last&&last[0]===region.x0)last[1]=Math.round(startY);
  else addSurfaceTerrainPoint(terrain,region.x0,startY);

  const firstPeakY=clampSurfaceY(baseY-peaks[0].h);
  emitMountainKnee(terrain,region.x0,startY,peaks[0].x,firstPeakY,peaks[0].lSh,rng);
  addSurfaceTerrainPoint(terrain,peaks[0].x,firstPeakY);

  for(let i=0;i<peakCount-1;i++){
    const cur=peaks[i],nxt=peaks[i+1];
    const curPY=clampSurfaceY(baseY-cur.h),nxtPY=clampSurfaceY(baseY-nxt.h);
    let sY;
    if(i===deepIdx){
      sY=baseY-maxH*rng.fl(.05,.18);
    }else{
      sY=ridgeFloorBase+rng.fl(-15,15);
      sY=Math.min(sY,baseY-rng.fl(25,45));
    }
    sY=clampSurfaceY(sY);
    const sX=cur.x+(nxt.x-cur.x)*rng.fl(.40,.60);
    emitMountainKnee(terrain,sX,sY,cur.x,curPY,cur.rSh,rng);
    addSurfaceTerrainPoint(terrain,sX,sY+rng.fl(-3,3));
    emitMountainKnee(terrain,sX,sY,nxt.x,nxtPY,nxt.lSh,rng);
    addSurfaceTerrainPoint(terrain,nxt.x,nxtPY);
  }

  const lastP=peaks[peakCount-1];
  const lastPY=clampSurfaceY(baseY-lastP.h);
  emitMountainKnee(terrain,region.x1,endY,lastP.x,lastPY,lastP.rSh,rng);
  addSurfaceTerrainPoint(terrain,region.x1,endY);
}

function genTerrainStepRegion(rng,terrain,region,y0,y1,dir){
  const w=region.x1-region.x0,edge=Math.max(42,w*rng.fl(.16,.24));
  const step=rng.fl(dir<0?35:30,dir<0?60:50),top=clampSurfaceY(y0+dir*step);
  const x0=region.x0,x1=region.x1;
  const a=x0+edge,b=x1-edge,hard=8;
  addSurfaceTerrainPoint(terrain,x0,y0);
  addSurfaceTerrainPoint(terrain,Math.min(a,x1),y0+rng.fl(-2,2));
  addSurfaceTerrainPoint(terrain,Math.min(a+hard,x1),top+rng.fl(-2,2));
  addSurfaceTerrainPoint(terrain,Math.max(b-hard,x0),top+rng.fl(-2,2));
  addSurfaceTerrainPoint(terrain,Math.max(b,x0),top+rng.fl(-2,2));
  addSurfaceTerrainPoint(terrain,Math.min(b+hard,x1),y1+rng.fl(-2,2));
  addSurfaceTerrainPoint(terrain,x1,y1);
}

function appendSurfaceRegionTerrain(rng,terrain,region,y0,y1){
  if(region.kind==='flat')genTerrainFlat(rng,terrain,region,y0,y1);
  else if(region.kind==='hills')genTerrainHills(rng,terrain,region,y0,y1);
  else if(region.kind==='mountains')genTerrainMountains(rng,terrain,region,y0,y1);
  else if(region.kind==='plateau')genTerrainStepRegion(rng,terrain,region,y0,y1,-1);
  else genTerrainStepRegion(rng,terrain,region,y0,y1,1);
}

function smoothSurfaceRegionJoins(terrain,regions){
  for(let i=1;i<regions.length;i++){
    const x=regions[i].x0,idx=terrain.findIndex(p=>p[0]===x);
    if(idx<=0||idx>=terrain.length-1)continue;
    const y=terrain[idx][1];
    terrain[idx-1][1]=Math.round((terrain[idx-1][1]+y)/2);
    terrain[idx+1][1]=Math.round((terrain[idx+1][1]+y)/2);
  }
}

function genSurfaceTerrain(rng,worldW){
  const regions=buildSurfaceRegions(rng,worldW);
  const terrain=[];
  const firstY=clampSurfaceY(H*.82+rng.fl(-16,16));
  let y=firstY;
  for(let i=0;i<regions.length;i++){
    let nextY=i===regions.length-1?firstY:clampSurfaceY(y+rng.fl(-24,24));
    if(regions[i].kind==='mountains')nextY=clampSurfaceY(Math.min(nextY,y+18));
    appendSurfaceRegionTerrain(rng,terrain,regions[i],y,nextY);
    y=nextY;
  }
  terrain[0][0]=0;
  terrain[terrain.length-1][0]=worldW;
  smoothSurfaceRegionJoins(terrain,regions);
  if(regions[regions.length-1]?.kind==='mountains')terrain[0][1]=terrain[terrain.length-1][1];
  else terrain[terrain.length-1][1]=terrain[0][1];
  return{terrain,regions};
}

function genSurfaceDishes(rng,surface,count,siteId){
  const buildings=[];
  for(let i=0;i<count;i++){
    const zone=(i+.5)/count;
    const x=wrap(zone*surface.worldW+rng.fl(-W*.28,W*.28),surface.worldW);
    const y=surfaceYAt(surface,x)-13;
    buildings.push(mkBuilding(BUILDING_CLASS_IDS.DISH,Math.round(x),Math.round(y),{siteId}));
  }
  return buildings;
}

function surfacePlacementDist(surface,x,otherX){
  return Math.abs(wrapCoordNear(x,otherX,surface.worldW)-otherX);
}

function surfacePlacementClear(surface,x,minSep,ignore=null){
  const items=[...(surface.buildings||[]),...(surface.defenses||[]),...(surface.fu||[])];
  if(surface.tunnel)items.push(surface.tunnel);
  for(const o of items){
    if(o===ignore)continue;
    if(Number.isFinite(o.x)&&surfacePlacementDist(surface,x,o.x)<minSep)return false;
  }
  return true;
}

function towerTopY(tower){
  return tower.y - 24;
}

function addTowerAt(surface,x){
  const ground=surfaceYAt(surface,x);
  const towerIdx=surface.buildings.length;
  const turretId=surface.defenses.length;
  const tower=mkBuilding(BUILDING_CLASS_IDS.TOWER,Math.round(x),Math.round(ground-17),{turretId});
  const turret=mkDefense(DEFENSE_CLASS_IDS.SURFACE_SENTINEL,tower.x,Math.round(towerTopY(tower)),{a:-Math.PI/2,towerId:towerIdx});
  surface.buildings.push(tower);
  surface.defenses.push(turret);
  return tower;
}

function flattishSpanAt(surface,x,maxSlope=Math.PI/6){
  x=wrap(x,surface.worldW);
  return surfaceFlattishSpans(surface,maxSlope).find(s=>x>=s.x0&&x<=s.x1);
}

function placePairedTower(rng,surface,anchorX,side){
  const dir=side==='left'?-1:1;
  for(let attempt=0;attempt<36;attempt++){
    const dist=56+attempt*4+rng.fl(-12,12);
    const x=wrap(anchorX+dir*dist,surface.worldW);
    if(!flattishSpanAt(surface,x))continue;
    if(!surfacePlacementClear(surface,x,48))continue;
    return addTowerAt(surface,x);
  }
  return null;
}

function randomFlattishX(rng,surface,spans){
  const total=spans.reduce((sum,s)=>sum+Math.max(0,s.x1-s.x0),0);
  let roll=rng.fl(0,total);
  for(const s of spans){
    const w=Math.max(0,s.x1-s.x0);
    if(roll<=w)return rng.fl(s.x0,s.x1);
    roll-=w;
  }
  const s=spans[spans.length-1];
  return rng.fl(s.x0,s.x1);
}

function placeRandomSurfaceTowers(rng,surface){
  const spans=surfaceFlattishSpans(surface,Math.PI/6).filter(s=>s.x1-s.x0>=28);
  if(!spans.length)return;
  const count=rng.int(2,5);
  for(let i=0;i<count;i++){
    let placed=false;
    for(let attempt=0;attempt<120&&!placed;attempt++){
      const x=wrap(randomFlattishX(rng,surface,spans),surface.worldW);
      if(!surfacePlacementClear(surface,x,90))continue;
      addTowerAt(surface,x);
      placed=true;
    }
  }
}

function genSurfacePowerStations(rng,surface,count){
  const spans=surfaceFlatSpans(surface).filter(s=>s.x1-s.x0>=180);
  if(!spans.length)return;
  for(let i=0;i<count;i++){
    let placed=false;
    for(let attempt=0;attempt<160&&!placed;attempt++){
      const span=rng.pick(spans);
      const x=wrap(rng.fl(span.x0+90,span.x1-90),surface.worldW);
      if(!surfacePlacementClear(surface,x,90))continue;
      const ground=surfaceYAt(surface,x);
      const station=mkBuilding(BUILDING_CLASS_IDS.POWER_STATION,Math.round(x),Math.round(ground-14));
      surface.buildings.push(station);
      const side=rng.next()<.5?'left':'right';
      const tower=placePairedTower(rng,surface,station.x,side)||placePairedTower(rng,surface,station.x,side==='left'?'right':'left');
      if(tower)placed=true;
      else surface.buildings.pop();
    }
  }
}

function genSurfaceAirDefenseBase(rng,surface){
  if(rng.next()>=.30)return;
  const spans=surfaceFlatSpans(surface).filter(s=>s.x1-s.x0>=260);
  if(!spans.length)return;
  for(let attempt=0;attempt<180;attempt++){
    const span=rng.pick(spans);
    const x=wrap(rng.fl(span.x0+110,span.x1-110),surface.worldW);
    if(!surfacePlacementClear(surface,x,120))continue;
    const ground=surfaceYAt(surface,x),idx=surface.buildings.length;
    const base=mkBuilding(BUILDING_CLASS_IDS.AIR_DEFENSE_BASE,Math.round(x),Math.round(ground-17),{
      idx,
      spawnTimer:1200,
      guardAlive:true,
    });
    surface.buildings.push(base);
    const side=rng.next()<.5?'left':'right';
    const firstTower=placePairedTower(rng,surface,base.x,side)||placePairedTower(rng,surface,base.x,side==='left'?'right':'left');
    if(!firstTower){
      surface.buildings.pop();
      continue;
    }
    if(rng.next()<.5)placePairedTower(rng,surface,base.x,side==='left'?'right':'left');
    const guardGround=surfaceYAt(surface,base.x);
    surface.en.push(mkSurfaceEnemy(SURFACE_ENEMY_TYPES.SKIMMER,base.x,Math.round(guardGround-105),{
      vx:rng.fl(-.6,.6),
      vy:0,
      phase:rng.fl(0,Math.PI*2),
      role:'guard',
      guardOf:base.idx,
    },rng));
    return;
  }
}

function genSurfaceDroneFactory(rng,surface){
  if(rng.next()>=.25)return;
  const spans=surfaceFlatSpans(surface).filter(s=>s.x1-s.x0>=220);
  if(!spans.length)return;
  for(let attempt=0;attempt<180;attempt++){
    const span=rng.pick(spans);
    const x=wrap(rng.fl(span.x0+100,span.x1-100),surface.worldW);
    if(!surfacePlacementClear(surface,x,120))continue;
    const ground=surfaceYAt(surface,x),idx=surface.buildings.length;
    surface.buildings.push(mkBuilding(BUILDING_CLASS_IDS.DRONE_FACTORY,Math.round(x),Math.round(ground-16),{
      idx,
      spawnTimer:1200,
    }));
    return;
  }
}

function genSurfaceOrbitalGun(rng,surface){
  // TEMP TEST OVERRIDE: force orbital gun spawn attempts on every planet.
  const spans=surfaceFlatSpans(surface).filter(s=>s.x1-s.x0>=300);
  if(!spans.length)return;
  for(let attempt=0;attempt<180;attempt++){
    const span=rng.pick(spans);
    const x=wrap(rng.fl(span.x0+120,span.x1-120),surface.worldW);
    if(!surfacePlacementClear(surface,x,140))continue;
    const ground=surfaceYAt(surface,x),startLen=surface.buildings.length;
    const gun=mkBuilding(BUILDING_CLASS_IDS.ORBITAL_GUN,Math.round(x),Math.round(ground-23),{idx:startLen});
    surface.buildings.push(gun);
    const left=placePairedTower(rng,surface,gun.x,'left')||placePairedTower(rng,surface,gun.x,'right');
    const right=placePairedTower(rng,surface,gun.x,'right')||placePairedTower(rng,surface,gun.x,'left');
    if(!left||!right){
      surface.buildings.length=startLen;
      continue;
    }
    const defenders=rng.int(2,3);
    for(let i=0;i<defenders;i++){
      const ex=wrap(gun.x+rng.fl(-170,170),surface.worldW);
      const eg=surfaceYAt(surface,ex);
      const type=rng.next()<.6?SURFACE_ENEMY_TYPES.SKIMMER:SURFACE_ENEMY_TYPES.DIVER;
      const ey=type===SURFACE_ENEMY_TYPES.SKIMMER?eg-rng.fl(80,130):eg-rng.fl(140,220);
      surface.en.push(mkSurfaceEnemy(type,Math.round(ex),Math.round(ey),{
        vx:rng.fl(-1.1,1.1),
        vy:0,
        phase:rng.fl(0,Math.PI*2),
      },rng));
    }
    return;
  }
}

const CIV_DENSITY_RULES={
  sparse:{
    res:{allowed:['BUNGALOW','RANCH','TOWNHOUSE','MANSION','CONDO'],capped:{HIGH_RISE:1}},
    inf:{allowed:['CROP_DOME','FARMHOUSE','GOV','HOSPITAL'],capped:{WAREHOUSE:1}},
    zoneCount:[1,1],
    budget:[20,40],
  },
  moderate:{
    res:{allowed:['BUNGALOW','RANCH','TOWNHOUSE','MANSION','CONDO','HIGH_RISE'],capped:{HOTEL:2}},
    inf:{allowed:['CROP_DOME','FARMHOUSE','GOV','HOSPITAL','WAREHOUSE','FACTORY'],capped:{SPACEPORT:2}},
    zoneCount:[2,3],
    budget:[50,80],
  },
  dense:{
    res:{allowed:['BUNGALOW','RANCH','TOWNHOUSE','MANSION','CONDO','HIGH_RISE','HOTEL'],capped:{ARCOLOGY:1}},
    inf:{allowed:['CROP_DOME','FARMHOUSE','GOV','HOSPITAL','WAREHOUSE','FACTORY','SPACEPORT'],capped:{ENTERTAINMENT:1}},
    zoneCount:[3,5],
    budget:[100,200],
  },
};

function rollCivPopulationClass(rng){
  const r=rng.next();
  if(r<.20)return 'none';
  if(r<.40)return 'sparse';
  if(r<.80)return 'moderate';
  return 'dense';
}

const CIV_CLASS_BIT_CAP=30;

function pickCivClass(rng,rule,counts){
  const choices=[];
  for(const id of rule.allowed)if((counts[id]||0)<CIV_CLASS_BIT_CAP)choices.push(id);
  for(const id of Object.keys(rule.capped))
    if((counts[id]||0)<rule.capped[id]&&(counts[id]||0)<CIV_CLASS_BIT_CAP)choices.push(id);
  if(!choices.length)return null;
  const id=rng.pick(choices);
  return BUILDING_CLASS_MAP[id];
}

function placeCivBuildingsInZone(rng,surface,zone,rule,counts,budget){
  let placed=0,cursor=zone.x0+6,stallGuard=0;
  while(cursor<zone.x1-6&&placed<budget&&stallGuard<160){
    stallGuard++;
    const def=pickCivClass(rng,rule,counts);
    if(!def)break;
    const fp=def.footprint;
    if(cursor+fp.w>zone.x1-4){cursor+=8;continue;}
    const x=wrap(cursor+fp.w/2,surface.worldW);
    if(!surfacePlacementClear(surface,x,fp.w/2+4)){cursor+=10;continue;}
    const ground=surfaceYAt(surface,x);
    surface.buildings.push(mkBuilding(def.id,Math.round(x),Math.round(ground-fp.h/2)));
    counts[def.id]=(counts[def.id]||0)+1;
    cursor+=fp.w+4;
    placed+=def.pts||0;
  }
  return placed;
}

function placeCivSmattering(rng,surface,zones,rule,counts,budget){
  const allFlat=surfaceFlatSpans(surface).filter(s=>s.x1-s.x0>=80);
  const outside=allFlat.filter(s=>!zones.some(z=>z.x0===s.x0&&z.x1===s.x1));
  if(!outside.length)return 0;
  let placed=0,attempts=0;
  while(placed<budget&&attempts<120){
    attempts++;
    const def=pickCivClass(rng,rule,counts);
    if(!def)break;
    const fp=def.footprint;
    const span=rng.pick(outside);
    if(span.x1-span.x0<fp.w+16)continue;
    const x=wrap(rng.fl(span.x0+fp.w/2+6,span.x1-fp.w/2-6),surface.worldW);
    if(!surfacePlacementClear(surface,x,Math.max(70,fp.w/2+10)))continue;
    const ground=surfaceYAt(surface,x);
    surface.buildings.push(mkBuilding(def.id,Math.round(x),Math.round(ground-fp.h/2)));
    counts[def.id]=(counts[def.id]||0)+1;
    placed+=def.pts||0;
  }
  return placed;
}

function genSurfaceCivilians(rng,surface){
  const popClass=rollCivPopulationClass(rng);
  surface.civPopulation=popClass;
  surface.civResidencePoints=0;
  surface.civInfraPoints=0;
  if(popClass==='none')return;
  const cfg=CIV_DENSITY_RULES[popClass];
  const resBudget=rng.int(cfg.budget[0],cfg.budget[1]);
  const infBudget=Math.round(resBudget/2);
  const zoneTarget=rng.int(cfg.zoneCount[0],cfg.zoneCount[1]);
  const candSpans=surfaceFlatSpans(surface).filter(s=>s.x1-s.x0>=250);
  const zones=[],pool=candSpans.slice();
  while(zones.length<zoneTarget&&pool.length){
    const idx=rng.int(0,pool.length-1);
    zones.push(pool.splice(idx,1)[0]);
  }
  const counts={};
  const totalZoneW=zones.reduce((s,z)=>s+(z.x1-z.x0),0)||1;
  const inZoneRes=Math.round(resBudget*0.80);
  let resPlaced=0;
  for(const zone of zones){
    const portion=Math.round(inZoneRes*(zone.x1-zone.x0)/totalZoneW);
    resPlaced+=placeCivBuildingsInZone(rng,surface,zone,cfg.res,counts,portion);
  }
  const remRes=resBudget-resPlaced;
  if(remRes>0)resPlaced+=placeCivSmattering(rng,surface,zones,cfg.res,counts,remRes);
  const inZoneInf=Math.round(infBudget*0.70);
  let infPlaced=0;
  for(const zone of zones){
    const portion=Math.round(inZoneInf*(zone.x1-zone.x0)/totalZoneW);
    infPlaced+=placeCivBuildingsInZone(rng,surface,zone,cfg.inf,counts,portion);
  }
  const remInf=infBudget-infPlaced;
  if(remInf>0)infPlaced+=placeCivSmattering(rng,surface,zones,cfg.inf,counts,remInf);
  let resTotal=0,infTotal=0;
  for(const b of surface.buildings){
    const def=BUILDING_CLASS_MAP[b.classId];
    if(!def?.category)continue;
    if(def.category==='residence')resTotal+=def.pts||0;
    else if(def.category==='infrastructure')infTotal+=def.pts||0;
  }
  surface.civResidencePoints=resTotal;
  surface.civInfraPoints=infTotal;
}

function genSurfaceEnergy(rng,surface,count){
  const fu=[];
  for(let i=0;i<count;i++){
    const x=rng.fl(0,surface.worldW);
    const ground=surfaceYAt(surface,x);
    fu.push({x:Math.round(x),y:Math.round(ground-rng.fl(95,185))});
  }
  return fu;
}

function genTunnel(rng,tmpl,seed){
  const worldH=Math.round(rng.fl(H*1.1,H*1.55));
  const n=7,mg=58;
  const centers=[],widths=[];
  for(let i=0;i<=n;i++){
    const t=i/n;
    centers.push(W/2+Math.sin(t*Math.PI*2+rng.fl(-.25,.25))*rng.fl(60,120)+rng.fl(-45,45));
    widths.push(rng.fl(145,190));
  }
  centers[0]=W/2;centers[n]=W/2;
  const left=[],right=[];
  for(let i=0;i<=n;i++){
    const y=Math.round(i/n*worldH);
    const lx=Math.max(mg,Math.min(W*.46,centers[i]-widths[i]/2));
    const rx=Math.min(W-mg,Math.max(W*.54,centers[i]+widths[i]/2));
    left.push([Math.round(lx),y]);right.push([Math.round(rx),y]);
  }
  const terrain=[...left,...right.reverse()];
  const en=_placeWallTurrets(rng,terrain,worldH,rng.int(2,4),50);
  const tunnel={...tmpl,kind:'tunnel',worldH,terrain,obs:[],en,fu:[],entTop:{x:W/2,y:32},entBottom:{x:W/2,y:worldH-42},grav:tmpl.grav};
  tunnel.buildings=genLaserDefensesInSite(rng,tunnel,tunnel.entTop,{axis:'horizontal'});
  return tunnel;
}

function genBranchingTunnelStub(rng,tmpl,seed){
  const tunnel=genTunnel(rng,tmpl,seed);
  return {...tunnel,kind:'branching',en:[],fu:[],buildings:[],entBottom:null};
}

function genSurface(tmpl,seed,sites){
  const rng=mkRNG(seed);
  const screens=rng.int(8,14),worldW=screens*W;
  const surface={...tmpl,kind:'surface',screenCount:screens,worldW,worldH:Math.round(H*1.05),exitY:-90,terrain:[],regions:[],buildings:[],en:[],defenses:[],fu:[],tunnel:null,ent:{x:Math.round(W*.5),y:Math.round(H*.28)}};
  const surfaceTerrain=genSurfaceTerrain(rng,worldW);
  surface.terrain=surfaceTerrain.terrain;
  surface.regions=surfaceTerrain.regions;
  const hasTargets=sites.some(s=>s.type==='surface_targets');
  if(hasTargets)surface.buildings=genSurfaceDishes(rng,surface,rng.int(4,6),'targets');
  surface.fu=genSurfaceEnergy(rng,surface,rng.int(2,4));
  const tunnelSite=sites.find(s=>s.type==='cave_connector'||s.type==='branching_tunnel');
  if(tunnelSite){
    const tx=wrap(rng.fl(W*.8,worldW-W*.8),worldW);
    surface.tunnel={x:Math.round(tx),y:Math.round(surfaceYAt(surface,tx)),siteId:tunnelSite.id};
  }
  genSurfacePowerStations(rng,surface,rng.int(1,3));
  const threatSlots=rng.int(6,10);
  surface.defenses.push(...genSurfaceDefenses(rng,surface,0));
  surface.en=genSurfaceEnemies(rng,surface,threatSlots);
  genSurfaceAirDefenseBase(rng,surface);
  genSurfaceDroneFactory(rng,surface);
  genSurfaceOrbitalGun(rng,surface);
  genSurfaceCivilians(rng,surface);
  placeRandomSurfaceTowers(rng,surface);
  return surface;
}

function genPlanetSites(rng,tunnelKind){
  const hasTargets=rng.next()<.25;
  const sites=[];
  if(hasTargets)sites.push({id:'targets',type:'surface_targets',label:'SURFACE TARGETS',required:true});
  if(tunnelKind==='reactor')sites.push({id:'cave',type:'cave_connector',label:'CAVE ACCESS',required:true});
  else sites.push({id:'branching',type:'branching_tunnel',label:'TUNNEL ACCESS',required:true});
  return sites;
}

// ---- Compose a planet hub from template + seed ----
function genPlanet(tmpl,seed,index=0){
  const rng=mkRNG(seedChild(seed,0x7100));
  const tunnelKind=rng.next()<.25?'reactor':'branching';
  const sites=genPlanetSites(rng,tunnelKind);
  const cave=tunnelKind==='reactor'?genCaveLevel(tmpl,seedChild(seed,0x7200)):null;
  const tunnel=tunnelKind==='reactor'
    ?genTunnel(mkRNG(seedChild(seed,0x7300)),tmpl,seedChild(seed,0x7301))
    :genBranchingTunnelStub(mkRNG(seedChild(seed,0x7300)),tmpl,seedChild(seed,0x7301));
  const surface=genSurface(tmpl,seedChild(seed,0x7400),sites);
  return{...tmpl,kind:'planet',index,tunnelKind,sites,cave,tunnel,surface};
}
