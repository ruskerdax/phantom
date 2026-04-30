'use strict';

const LV_TMPL=[
  {name:'CAVERN PRIME',   col:'#00ff88',bg:'#000c05',grav:.004,pcol:'#00cc66',pr:32,nObs:2,nEn:3,nFu:2,rxHp:3},
  {name:'VORTEX STATION', col:'#00ccff',bg:'#00050f',grav:.001,pcol:'#0077cc',pr:28,nObs:4,nEn:5,nFu:3,rxHp:5},
  {name:'CORE NEXUS',     col:'#ff5533',bg:'#0e0100',grav:.008,pcol:'#cc2200',pr:35,nObs:5,nEn:7,nFu:3,rxHp:8},
];

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
  return{...tmpl,kind:'cave',worldH:wH,terrain,obs,en,fu,rx,ent};
}

// ---- Surface terrain helpers ----
function surfaceYAt(surface,x){
  const w=surface.worldW,pts=surface.terrain;
  if(!pts.length)return H*.72;
  x=wrap(x,w);
  const step=w/(pts.length-1);
  const i=Math.max(0,Math.min(pts.length-2,Math.floor(x/step)));
  const a=pts[i],b=pts[i+1],t=(x-a[0])/(b[0]-a[0]||1);
  return a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,t));
}

function genSurfaceTerrain(rng,worldW){
  const n=Math.ceil(worldW/80);
  const terrain=[];
  let y=H*.72+rng.fl(-20,20);
  const p0=rng.fl(0,Math.PI*2),p1=rng.fl(0,Math.PI*2);
  for(let i=0;i<=n;i++){
    const x=i/n*worldW;
    y+=rng.fl(-18,18);
    const wave=Math.sin(i*.55+p0)*32+Math.sin(i*.17+p1)*46;
    const gy=Math.max(H*.56,Math.min(H*.84,H*.72+wave+(y-H*.72)*.38));
    terrain.push([Math.round(x),Math.round(gy)]);
  }
  terrain[terrain.length-1][1]=terrain[0][1];
  return terrain;
}

function genSurfaceDishes(rng,surface,count,siteId){
  const dishes=[];
  for(let i=0;i<count;i++){
    const zone=(i+.5)/count;
    const x=wrap(zone*surface.worldW+rng.fl(-W*.28,W*.28),surface.worldW);
    const y=surfaceYAt(surface,x)-13;
    dishes.push({x:Math.round(x),y:Math.round(y),hp:3,siteId});
  }
  return dishes;
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

function genSurfaceEnemies(rng,surface,count){
  const en=[];
  for(let i=0;i<count;i++){
    const x=wrap((i+.35+rng.fl(-.18,.18))/count*surface.worldW,surface.worldW);
    const ground=surfaceYAt(surface,x);
    const roll=rng.next();
    if(roll<.34)en.push({kind:'turret',x:Math.round(x),y:Math.round(ground-9),a:-Math.PI/2,hp:2});
    else if(roll<.72)en.push({kind:'skimmer',x:Math.round(x),y:Math.round(ground-rng.fl(70,125)),vx:rng.fl(-1.2,1.2),vy:0,a:Math.PI/2,hp:2});
    else en.push({kind:'diver',x:Math.round(x),y:Math.round(ground-rng.fl(140,230)),vx:rng.fl(-.8,.8),vy:0,a:Math.PI/2,hp:2});
  }
  return en;
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
  const en=[];
  const count=rng.int(2,4);
  for(let i=0;i<count;i++){
    const y=worldH*((i+1)/(count+1));
    const idx=Math.max(0,Math.min(n-1,Math.floor(y/worldH*n)));
    const side=rng.next()<.5?'left':'right';
    const wall=side==='left'?left[idx]:right[idx];
    const wx=wall[0],wy=Math.round(y+rng.fl(-28,28));
    en.push({x:side==='left'?wx+10:wx-10,y:wy,a:side==='left'?Math.PI/2:-Math.PI/2});
  }
  return{...tmpl,kind:'tunnel',name:'CAVE ACCESS',worldH,terrain,obs:[],en,fu:[],entTop:{x:W/2,y:32},entBottom:{x:W/2,y:worldH-42},grav:tmpl.grav};
}

function genSurface(tmpl,seed,sites){
  const rng=mkRNG(seed);
  const screens=rng.int(8,14),worldW=screens*W;
  const surface={...tmpl,kind:'surface',name:tmpl.name+' SURFACE',screenCount:screens,worldW,worldH:Math.round(H*1.05),exitY:-90,terrain:[],dishes:[],en:[],fu:[],tunnel:null,ent:{x:Math.round(W*.5),y:Math.round(H*.28)}};
  surface.terrain=genSurfaceTerrain(rng,worldW);
  const hasTargets=sites.some(s=>s.type==='surface_targets');
  if(hasTargets)surface.dishes=genSurfaceDishes(rng,surface,rng.int(4,6),'targets');
  surface.fu=genSurfaceEnergy(rng,surface,rng.int(2,4));
  surface.en=genSurfaceEnemies(rng,surface,rng.int(6,10));
  const caveSite=sites.find(s=>s.type==='cave_connector');
  if(caveSite){
    const tx=wrap(rng.fl(W*.8,worldW-W*.8),worldW);
    surface.tunnel={x:Math.round(tx),y:Math.round(surfaceYAt(surface,tx)),siteId:caveSite.id};
  }
  return surface;
}

function genPlanetSites(rng){
  const hasTargets=rng.next()<.72;
  const hasCave=rng.next()<.72;
  const sites=[];
  if(hasTargets||!hasCave)sites.push({id:'targets',type:'surface_targets',label:'SURFACE TARGETS',required:true});
  if(hasCave||!hasTargets)sites.push({id:'cave',type:'cave_connector',label:'CAVE ACCESS',required:true});
  return sites;
}

// ---- Compose a planet hub from template + seed ----
function genPlanet(tmpl,seed,index=0){
  const rng=mkRNG(seedChild(seed,0x7100));
  const sites=genPlanetSites(rng);
  const cave=genCaveLevel({...tmpl,name:'CAVE REACTOR'},seedChild(seed,0x7200));
  const tunnel=sites.some(s=>s.type==='cave_connector')?genTunnel(mkRNG(seedChild(seed,0x7300)),tmpl,seedChild(seed,0x7301)):null;
  const surface=genSurface(tmpl,seedChild(seed,0x7400),sites);
  return{...tmpl,kind:'planet',index,sites,cave,tunnel,surface};
}
