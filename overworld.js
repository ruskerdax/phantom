'use strict';

// ===================== OVERWORLD =====================
function owEnemyPos(t,px,py,minDist=600){
  let x,y,attempts=0;
  do{const a=Math.random()*Math.PI*2,d=480+Math.random()*360;
    x=Math.max(40,Math.min(OW_W-40,OW_W/2+Math.cos(a)*d));
    y=Math.max(40,Math.min(OW_H-40,OW_H/2+Math.sin(a)*d));
    attempts++;
  }while(px!=null&&Math.hypot(x-px,y-py)<minDist&&attempts<30);
  return{t,x,y,vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function encSpawnPos(ew,eh,placed,minPlayer,minPeer,sx,sy){
  let x,y,att=0;
  do{x=80+Math.random()*(ew-160);y=80+Math.random()*(eh-160);att++;}
  while(att<50&&(Math.hypot(x-sx,y-sy)<minPlayer||placed.some(p=>Math.hypot(x-p.x,y-p.y)<minPeer)));
  placed.push({x,y});return{x,y};
}
// Place an enemy along an arc near the arena border, centered on contactA.
// Distributes idx-of-total along a ~30deg arc, jittered slightly, then runs
// a short repulsion pass against already-placed peers.
function encClusterPos(ew,eh,placed,minPeer,contactA,idx,total){
  const cx=ew/2,cy=eh/2;
  const baseR=Math.min(ew,eh)/2-120;
  const arc=Math.PI*0.16;
  const t=total>1?(idx/(total-1))-0.5:0;
  const a=contactA+t*arc+(Math.random()-0.5)*0.08;
  const r=baseR*(0.85+Math.random()*0.12);
  let x=cx+Math.sin(a)*r,y=cy-Math.cos(a)*r;
  for(let att=0;att<8;att++){
    let moved=false;
    for(const p of placed){
      const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy)||1;
      if(d<minPeer){const push=(minPeer-d)+1;x+=(dx/d)*push;y+=(dy/d)*push;moved=true;}
    }
    if(!moved)break;
  }
  x=Math.max(80,Math.min(ew-80,x));y=Math.max(80,Math.min(eh-80,y));
  placed.push({x,y});return{x,y};
}
function mkFleet(id,x,y,opts){
  const f={id,x,y,vx:0,vy:0,a:0,alive:true,flash:0,
    state:'idle',comp:rollFleetComp(id),routeIdx:0,postBody:null,postOrbit:null,sysOrbit:null,spawnTimer:0};
  if(opts?.postBody){
    f.postBody=opts.postBody;
    f.postOrbit={r:opts.orbitR||120,a:Math.random()*Math.PI*2,aSpd:opts.aSpd||.0006};
  }
  const F=fleetDef(id);
  if(F.spawnsHunters)f.spawnTimer=F.spawnsHunters.everyFrames;
  return f;
}
function seedSystemFleets(px,py){
  const ow=G.OW;
  // 2 Hunters orbiting at mid-system range
  for(let i=0;i<2;i++){const p=owEnemyPos(0,px,py);ow.fleets.push(mkFleet('HUNTER',p.x,p.y));}
  // 1 Patrol
  {const p=owEnemyPos(0,px,py);ow.fleets.push(mkFleet('PATROL',p.x,p.y));}
  // 1 Swarm per uncleared cave level
  for(let i=0;i<PP.length;i++){
    if(G.cleared[i])continue;
    const bp=owPos(PP[i]),a=Math.random()*Math.PI*2,r=40+Math.random()*30;
    ow.fleets.push(mkFleet('SWARM',bp.x+Math.cos(a)*r,bp.y+Math.sin(a)*r,{postBody:PP[i],orbitR:r,aSpd:.008}));
  }
  // 1 Swarm per asteroid field
  for(let ai=0;ai<AB.length;ai++){
    const ap=owPos(AB[ai]),a=Math.random()*Math.PI*2,r=50+Math.random()*30;
    ow.fleets.push(mkFleet('SWARM',ap.x+Math.cos(a)*r,ap.y+Math.sin(a)*r,{postBody:AB[ai],orbitR:r,aSpd:.007}));
  }
  // Armada at HBASE
  if(!G.hbCleared){
    const hp=owPos(HBASE),a=Math.random()*Math.PI*2,r=280+Math.random()*80;
    ow.fleets.push(mkFleet('ARMADA',hp.x+Math.cos(a)*r,hp.y+Math.sin(a)*r,{postBody:HBASE,orbitR:r,aSpd:.0004}));
  }
}
function initOW(energy,sx,sy){
  const bp=owPos(BASE);
  const px=sx??bp.x,py=sy??bp.y;
  G.OW={s:mkShip(px,py),en:[],fleets:[],fu:[],pts:[],nearP:-1,nearBase:false,nearAst:-1,
    slipgateSpawnTimer:1800,convoySpawnTimer:5400,cam:{x:Math.max(0,Math.min(OW_W-W,px-W/2)),y:Math.max(0,Math.min(OW_H-H,py-H/2)),z:1}};
  setShipEnergy(G.OW.s,energy);G.OW.s.inv=120;
  seedSystemFleets(px,py);
  G.st='overworld';
}
function owKillShip(){
  const ow=G.OW;killShip(ow.s,ow.pts,'dead_ow');
}
function doRebuildFinalize(){
  const bp=owPos(BASE);G.ENC=null;G.site=null;G.stake=0;
  G.needsRebuild=false;
  if(!G.OW){initOW(chassisBatteryCapacity(activeChassisObj()));recordLastLocation('base');saveGame();return;}
  G.OW.s=mkShip(bp.x,bp.y);G.OW.s.inv=180;
  G.OW.en=[];G.OW.fleets=[];
  G.OW.slipgateSpawnTimer=1800;G.OW.convoySpawnTimer=5400;
  seedSystemFleets(bp.x,bp.y);
  recordLastLocation('base');
  G.st='overworld';saveGame();tone(660,.2,'sine',.08);
}
function jumpToSeed(newSeed,sourceSeed){
  const energy=G.OW.s.energy;
  // Snapshot departing system state.
  G.systemStates[G.seed>>>0]={cleared:[...G.cleared],slipgateActive:G.slipgateActive,hbCleared:G.hbCleared,hbState:G.hbState,lvState:G.lvState};
  G.prevSeed=sourceSeed;
  G.seed=newSeed>>>0;
  // Restore destination state if previously visited, else fresh.
  const prev=G.systemStates[G.seed];
  if(prev){G.cleared=[...prev.cleared];G.slipgateActive=prev.slipgateActive;G.hbCleared=prev.hbCleared;G.hbState=prev.hbState;G.lvState=prev.lvState;}
  else{G.cleared=[false,false,false];G.slipgateActive=false;G.hbCleared=false;G.hbState=null;G.lvState={};}
  G.stake=0;G.slipMsg=0;
  genWorld(G.seed);
  if(!G.visitedSeeds.includes(G.seed))G.visitedSeeds.push(G.seed);
  const sgp=owPos(SLIPGATE);
  initOW(energy,sgp.x,sgp.y);
  recordLastLocation('slipgate');
  saveGame();
  tone(300,.15,'sine',.07);setTimeout(()=>tone(500,.15,'sine',.07),160);setTimeout(()=>tone(800,.4,'sine',.07),330);
}
function slipNeighborList(){
  const list=genNeighbors(G.seed);
  if(G.prevSeed!=null&&G.prevSeed!==TUTORIAL_SEED&&!list.includes(G.prevSeed))list[0]=G.prevSeed;
  return list;
}
function owStartEnc(idx,contactA,playerA){
  const ow=G.OW,e=ow.en[idx],et=enemyDef(e.t),ec=et.enc;
  const ens=[];
  const spawnX=EW/2,spawnY=EH/2;
  if(ec.groups){
    const spawns=[];
    for(const grp of ec.groups){
      if(grp.chance!==undefined&&Math.random()>grp.chance)continue;
      spawns.push(grp);
    }
    const total=spawns.reduce((s,g)=>s+g.cnt,0);
    let ei=0;
    const placed=[];
    for(const sp of spawns){
      for(let i=0;i<sp.cnt;i++){
        const def=enemySpawnDef(sp.t),gec=def.enc,initCd=Math.round(WEAPON_MAP[gec.fire.wpn].cd*60);
        const{x,y}=encClusterPos(EW,EH,placed,140,contactA,ei,total);
        ens.push(mkEncEnemy(def.id,x,y,initCd+ei*18));
        ei++;
      }
    }
  } else {
    const placed=[];
    const total=ec.cnt;
    for(let i=0;i<total;i++){
      const def=enemySpawnDef(e.t),dec=def.enc,initCd=Math.round(WEAPON_MAP[dec.fire.wpn].cd*60);
      const{x,y}=encClusterPos(EW,EH,placed,140,contactA,i,total);
      ens.push(mkEncEnemy(def.id,x,y,initCd+i*18));
    }
  }
  const rng=mkRNG(seedChild(G.seed,200+idx));
  const rocks=[];
  let rockCount=0;for(let i=0;i<8;i++)if(rng.fl(0,1)<.25)rockCount++;
  const minSpawnDist=120;
  const tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  for(let i=0;i<rockCount;i++){
    let rx,ry,attempts=0;
    do{rx=rng.fl(60,EW-60);ry=rng.fl(60,EH-60);attempts++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&attempts<30);
    const tier=rng.int(0,2);const td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:rng.fl(-.55,.55),vy:rng.fl(-.55,.55),r:td.r[0]+rng.fl(0,td.r[1]),hp:td.hp,maxHp:td.hp,tier});
  }
  const encShip=mkShip(spawnX,spawnY);copyShipEnergyState(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;encShip.a=playerA;
  copyShieldState(ow.s,encShip);
  const label=ec.groups?et.name+' ENCOUNTER':(ec.cnt>1?'SWARM ATTACK':et.name+' ENCOUNTER');
  G.ENC={owIdx:idx,et:e.t,label,
    s:encShip,en:ens,rocks,bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew:EW,eh:EH,cam:{x:Math.max(0,Math.min(EW-W,spawnX-W/2)),y:Math.max(0,Math.min(EH-H,spawnY-H/2)),z:1}};
  G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function startAstEnc(){
  const ow=G.OW;
  const tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  const rocks=[];
  const rockCount=8+Math.floor(Math.random()*13);
  const spawnX=EW*.08,spawnY=EH/2,minSpawnDist=120;
  for(let i=0;i<rockCount;i++){
    let rx,ry,att=0;
    do{rx=60+Math.random()*(EW-120);ry=60+Math.random()*(EH-120);att++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&att<30);
    const tier=Math.floor(Math.random()*3);const td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:(Math.random()-.5)*1.1,vy:(Math.random()-.5)*1.1,r:td.r[0]+Math.random()*td.r[1],hp:td.hp,maxHp:td.hp,tier});
  }
  const ens=[],astEnemy=ENEMY_TYPES.INTERCEPTOR;
  for(let i=0;i<3;i++){
    if(Math.random()<.35){
      const def=enemySpawnDef(astEnemy),astEc=def.enc,initCd=Math.round(WEAPON_MAP[astEc.fire.wpn].cd*60);
      const a=(i/3)*Math.PI*2;
      ens.push(mkEncEnemy(def.id,EW-200+Math.cos(a)*60,EH/2+Math.sin(a)*60,initCd+i*18));
    }
  }
  const encShip=mkShip(spawnX,spawnY);copyShipEnergyState(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  copyShieldState(ow.s,encShip);
  G.ENC={owIdx:null,isAst:true,et:astEnemy,label:'ASTEROID FIELD',
    s:encShip,en:ens,rocks,bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:ens.length?70:0,cleared:!ens.length,
    ew:EW,eh:EH,cam:{x:0,y:Math.max(0,EH/2-H/2),z:1}};
  G.st=ens.length?'enc_in':'encounter';
  recordLastLocation('asteroid',ow.nearAst);
  saveGame();
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function startHBaseEnc(){
  const ow=G.OW,ew=EW*2,eh=EH*2,HEX_R=150,hx=ew/2,hy=eh/2;
  const hbs=G.hbState;
  const softpts=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3+Math.PI/6,d=HEX_R*Math.sqrt(3)/2;
    return{x:hx+Math.cos(a)*d,y:hy+Math.sin(a)*d,hp:1,alive:hbs?hbs.softpts[i]:true};
  });
  const initCd=Math.round(WEAPON_MAP['mass driver'].cd*60);
  const turrets=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3;
    return{x:hx+Math.cos(a)*HEX_R,y:hy+Math.sin(a)*HEX_R,a:a,timer:initCd+i*22,alive:hbs?hbs.turrets[i]:true};
  });
  const hexPoly=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return[hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R];});
  const encShip=mkShip(ew*.08,eh/2);copyShipEnergyState(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  copyShieldState(ow.s,encShip);
  G.ENC={owIdx:null,isHBase:true,et:ENEMY_TYPES.BATTLESHIP,label:'HOSTILE BASE',
    s:encShip,en:[],rocks:[],bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew,eh,hbase:{HEX_R,hx,hy,softpts,turrets,hexPoly},
    cam:{x:Math.max(0,hx-W/2),y:Math.max(0,hy-H/2),z:1}};
  G.st='enc_in';
  recordLastLocation('hbase');
  saveGame();
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function owStartFleetEnc(fi,contactA,playerA){
  const ow=G.OW,f=ow.fleets[fi];
  const ens=[],total=f.comp.reduce((s,g)=>s+g.cnt,0);
  let ei=0;
  const placed=[],spawnX=EW/2,spawnY=EH/2;
  for(const sp of f.comp){
    for(let i=0;i<sp.cnt;i++){
      const def=enemySpawnDef(sp.t),gec=def.enc,initCd=Math.round(WEAPON_MAP[gec.fire.wpn].cd*60);
      const{x,y}=encClusterPos(EW,EH,placed,140,contactA,ei,total);
      ens.push(mkEncEnemy(def.id,x,y,initCd+ei*18));
      ei++;
    }
  }
  const rng=mkRNG(seedChild(G.seed,300+fi));
  const rocks=[],tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  let rockCount=0;for(let i=0;i<8;i++)if(rng.fl(0,1)<.25)rockCount++;
  const minSpawnDist=120;
  for(let i=0;i<rockCount;i++){
    let rx,ry,att=0;
    do{rx=rng.fl(60,EW-60);ry=rng.fl(60,EH-60);att++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&att<30);
    const tier=rng.int(0,2),td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:rng.fl(-.55,.55),vy:rng.fl(-.55,.55),r:td.r[0]+rng.fl(0,td.r[1]),hp:td.hp,maxHp:td.hp,tier});
  }
  const encShip=mkShip(spawnX,spawnY);copyShipEnergyState(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;encShip.a=playerA;
  copyShieldState(ow.s,encShip);
  // Use the first comp role/type as the representative for encounter color.
  if(!f.comp.length)throw new Error(`Fleet ${f.id} has no enemy composition`);
  const repType=f.comp[0].t;
  G.ENC={owIdx:null,fleetIdx:fi,et:repType,label:f.id+' FLEET',
    s:encShip,en:ens,rocks,bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew:EW,eh:EH,cam:{x:Math.max(0,Math.min(EW-W,spawnX-W/2)),y:Math.max(0,Math.min(EH-H,spawnY-H/2)),z:1}};
  G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function owEdgePos(t){
  const m=60,edge=Math.floor(Math.random()*4);
  let x,y;
  if(edge===0){x=m+Math.random()*(OW_W-m*2);y=m;}
  else if(edge===1){x=m+Math.random()*(OW_W-m*2);y=OW_H-m;}
  else if(edge===2){x=m;y=m+Math.random()*(OW_H-m*2);}
  else{x=OW_W-m;y=m+Math.random()*(OW_H-m*2);}
  return{t,x,y,vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function owHBaseSwarmPos(){
  const hbp=owPos(HBASE);
  const a=Math.random()*Math.PI*2,d=200+Math.random()*150;
  const x=Math.max(40,Math.min(OW_W-40,hbp.x+Math.cos(a)*d));
  const y=Math.max(40,Math.min(OW_H-40,hbp.y+Math.sin(a)*d));
  return{t:enemyClassIdForType(ENEMY_TYPES.DRONE),x,y,vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function updOW(){
  G.owFr++;if(G.slipMsg>0)G.slipMsg--;const ow=G.OW;updPts(ow.pts);
  {const HF=fleetDef('HUNTER'),PF=fleetDef('PATROL');
  if(--ow.slipgateSpawnTimer<=0){ow.slipgateSpawnTimer=1800;
    if(ow.fleets.filter(f=>f.alive&&f.id==='HUNTER').length<HF.maxOnOW){const sgp=owPos(SLIPGATE);ow.fleets.push(mkFleet('HUNTER',sgp.x,sgp.y));}
    if(Math.random()<.4&&ow.fleets.filter(f=>f.alive&&f.id==='PATROL').length<PF.maxOnOW){const sgp=owPos(SLIPGATE);ow.fleets.push(mkFleet('PATROL',sgp.x,sgp.y));}}}
  if(!G.hbCleared&&--ow.convoySpawnTimer<=0){ow.convoySpawnTimer=5400;
    const CF=fleetDef('CONVOY');
    if(ow.fleets.filter(f=>f.alive&&f.id==='CONVOY').length<CF.maxOnOW){const sgp=owPos(SLIPGATE);ow.fleets.push(mkFleet('CONVOY',sgp.x,sgp.y));}}
  for(let i=ow.fu.length-1;i>=0;i--){const f=ow.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,OW_W);f.y=wrap(f.y+f.vy,OW_H);if(Math.hypot(ow.s.x-f.x,ow.s.y-f.y)<20&&ow.s.alive){pickupEnergy(ow.s,f.x,f.y,ow.pts,'#0f8');ow.fu.splice(i,1);}}
  const s=ow.s;if(!s.alive)return;
  applyRotation(s, iRot(), s.energy<=0);
  if(iShieldToggle())toggleShipShield(s);
  tickShieldRecharge(s);
  // sin(angle) = X component, -cos(angle) = Y component: canvas Y increases downward, so "forward" is -cos.
  const thrustIn=iThrustInput();
  if(thrustIn.activeAxes>0){
    applyShipThrust(s, thrustIn, s.energy<=0);
    drainEnergy(s, thrustEnergyDrainForMode('overworld')*thrustEnergyScale(thrustIn));
  }
  thrusterSound(thrustIn,'overworld',s.energy<=0);
  {const sdx=OW_W/2-s.x,sdy=OW_H/2-s.y,sdist=Math.hypot(sdx,sdy)||1;
  const maxSpd=sdist<220?7:4.2;
  // Normalize velocity vector then scale to maxSpd — the standard way to cap speed without distorting direction.
  const sp=Math.hypot(s.vx,s.vy);if(sp>maxSpd){s.vx=s.vx/sp*maxSpd;s.vy=s.vy/sp*maxSpd;}}
  {const bz=600;
  if(s.x<bz&&s.vx<0)s.vx*=s.x/bz;
  if(s.x>OW_W-bz&&s.vx>0)s.vx*=(OW_W-s.x)/bz;
  if(s.y<bz&&s.vy<0)s.vy*=s.y/bz;
  if(s.y>OW_H-bz&&s.vy>0)s.vy*=(OW_H-s.y)/bz;}
  s.x=Math.max(0,Math.min(OW_W,s.x+s.vx));s.y=Math.max(0,Math.min(OW_H,s.y+s.vy));
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  // Inverse-square gravity well at the star (world center). Force grows rapidly as the ship gets close;
  // flying into the star kills the ship instantly.
  {const sdx=OW_W/2-s.x,sdy=OW_H/2-s.y,sdist=Math.hypot(sdx,sdy)||1;
  if(sdist<22){owKillShip();return;}
  s.vx+=sdx*500/(sdist*sdist*sdist);s.vy+=sdy*500/(sdist*sdist*sdist);}
  const bp=owPos(BASE);ow.nearBase=Math.hypot(s.x-bp.x,s.y-bp.y)<BASE.r+28;
  ow.nearP=-1;
  for(let i=0;i<LV.length;i++){if(G.cleared[i])continue;const pp=owPos(PP[i]);if(Math.hypot(s.x-pp.x,s.y-pp.y)<LV[i].pr+28){ow.nearP=i;break;}}
  ow.nearAst=-1;
  for(let ai=0;ai<2;ai++){const ap=owPos(AB[ai]);if(Math.hypot(s.x-ap.x,s.y-ap.y)<AB[ai].r+28){ow.nearAst=ai;break;}}
  ow.nearHBase=false;
  if(!G.hbCleared){const hbp=owPos(HBASE);if(Math.hypot(s.x-hbp.x,s.y-hbp.y)<HBASE.r+28)ow.nearHBase=true;}
  {const sgp=owPos(SLIPGATE);ow.nearSlipgate=Math.hypot(s.x-sgp.x,s.y-sgp.y)<SLIPGATE.r+28;}
  const owFired=iFir();
  if(owFired&&ow.nearBase){G.credits+=G.stake;G.stake=0;suppressMenuInput();recordLastLocation('base');openBaseMenu();saveGame();return;}
  if(owFired&&ow.nearP>=0){G.lv=ow.nearP;enterLv();return;}
  if(owFired&&ow.nearAst>=0){startAstEnc();return;}
  if(owFired&&ow.nearHBase){startHBaseEnc();return;}
  if(owFired&&ow.nearSlipgate){suppressMenuInput();recordLastLocation('slipgate');openSlipgateMenu();saveGame();return;}
  for(let i=0;i<ow.en.length;i++){
    const e=ow.en[i];if(!e.alive)continue;
    const et=enemyDef(e.t);e.spin+=.04+enemyTypeIndex(e.t)*.015;
    const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1;
    const ta=Math.atan2(dx,-dy);
    e.a+=angDiff(e.a,ta)*.07;
    e.vx+=Math.sin(e.a)*et.owSpd*.05;e.vy-=Math.cos(e.a)*et.owSpd*.05;
    e.vx*=.970;e.vy*=.970;const es=Math.hypot(e.vx,e.vy);if(es>et.owSpd){e.vx=e.vx/es*et.owSpd;e.vy=e.vy/es*et.owSpd;}
    e.x=wrap(e.x+e.vx,OW_W);e.y=wrap(e.y+e.vy,OW_H);
    if(e.flash>0)e.flash--;
    if(s.inv<=0&&dist<et.trigR){
      const cdx=e.x-s.x,cdy=e.y-s.y;const contactA=Math.atan2(cdx,-cdy);owStartEnc(i,contactA,s.a);return;
    }
  }
  for(let fi=0;fi<ow.fleets.length;fi++){
    const f=ow.fleets[fi];if(!f.alive)continue;
    if(updFleet(f,fi,s))return;
  }
  for(let i=0;i<ow.fleets.length;i++){
    const a=ow.fleets[i];if(!a.alive)continue;
    const FA=fleetDef(a.id);
    for(let j=i+1;j<ow.fleets.length;j++){
      const b=ow.fleets[j];if(!b.alive)continue;
      const FB=fleetDef(b.id);
      const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||1;
      const minDist=FA.trigR*.5+FB.trigR*.5;
      if(dist<minDist){
        const nx=dx/dist,ny=dy/dist,push=(minDist-dist)*.3;
        a.vx-=nx*push;a.vy-=ny*push;
        b.vx+=nx*push;b.vy+=ny*push;
      }
    }
  }
  tickShipReactor(s,'overworld');
}
function updFleet(f,fi,s){
  const F=fleetDef(f.id);
  if(f.id==='ARMADA'&&G.hbCleared){f.alive=false;return false;}
  const dx=s.x-f.x,dy=s.y-f.y,dist=Math.hypot(dx,dy)||1;
  const aggroD=(f.postBody&&F.behavior==='orbit_post')?Math.hypot(s.x-owPos(f.postBody).x,s.y-owPos(f.postBody).y):dist;
  if(F.aggroR>0&&s.inv<=0){
    if(f.state==='idle'&&aggroD<F.aggroR)f.state='aggro';
    else if(f.state==='aggro'&&aggroD>F.aggroR*1.5){
      f.state='idle';
      if(F.behavior==='triangle'){
        const route=[SLIPGATE,BASE,HBASE];let bd=Infinity;
        route.forEach((b,i)=>{const bp=owPos(b),d=Math.hypot(f.x-bp.x,f.y-bp.y);if(d<bd){bd=d;f.routeIdx=i;}});
      }
    }
  }
  if(f.state==='aggro'){
    const ta=Math.atan2(dx,-dy);
    f.a+=angDiff(f.a,ta)*.07;
    f.vx+=Math.sin(f.a)*F.owSpd*.05;f.vy-=Math.cos(f.a)*F.owSpd*.05;
  } else if(F.behavior==='orbit_system'){
    if(!f.sysOrbit){const sd=Math.hypot(f.x-OW_W/2,f.y-OW_H/2)||500;f.sysOrbit={r:Math.max(300,Math.min(800,sd)),a:Math.atan2(f.y-OW_H/2,f.x-OW_W/2),aSpd:.0007};}
    f.sysOrbit.a+=f.sysOrbit.aSpd;
    const tx=OW_W/2+Math.cos(f.sysOrbit.a)*f.sysOrbit.r,ty=OW_H/2+Math.sin(f.sysOrbit.a)*f.sysOrbit.r;
    const tdx=tx-f.x,tdy=ty-f.y,td=Math.hypot(tdx,tdy)||1,ta=Math.atan2(tdx,-tdy);
    f.a+=angDiff(f.a,ta)*.04;const spd=Math.min(F.owSpd*.08,td*.02);
    f.vx+=(tdx/td)*spd;f.vy+=(tdy/td)*spd;
  } else if(F.behavior==='orbit_post'&&f.postBody){
    f.postOrbit.a+=f.postOrbit.aSpd;
    const bp=owPos(f.postBody);
    const tx=bp.x+Math.cos(f.postOrbit.a)*f.postOrbit.r;
    const ty=bp.y+Math.sin(f.postOrbit.a)*f.postOrbit.r;
    const tdx=tx-f.x,tdy=ty-f.y,td=Math.hypot(tdx,tdy)||1;
    if(td<30){
      // On the orbit ring: snap to the moving target so idle orbit is always visible
      // regardless of how the steering accel cap compares to ring tangential speed.
      f.x=tx;f.y=ty;
      f.a+=angDiff(f.a,Math.atan2(-Math.sin(f.postOrbit.a),-Math.cos(f.postOrbit.a)))*.1;
      f.vx=0;f.vy=0;
    } else {
      // Off the ring (just disengaged from aggro): steer back under thrust, no teleport.
      const ta=Math.atan2(tdx,-tdy);
      f.a+=angDiff(f.a,ta)*.07;
      const spd=Math.min(F.owSpd*.08,td*.04);
      f.vx+=(tdx/td)*spd;f.vy+=(tdy/td)*spd;
    }
  } else if(F.behavior==='triangle'){
    const route=[SLIPGATE,BASE,HBASE];
    const bp=owPos(route[f.routeIdx]);
    const tdx=bp.x-f.x,tdy=bp.y-f.y,td=Math.hypot(tdx,tdy)||1;
    if(td<60)f.routeIdx=(f.routeIdx+1)%3;
    const ta=Math.atan2(tdx,-tdy);
    f.a+=angDiff(f.a,ta)*.05;f.vx+=Math.sin(f.a)*F.owSpd*.04;f.vy-=Math.cos(f.a)*F.owSpd*.04;
  } else if(F.behavior==='route'){
    const route=[SLIPGATE,HBASE];
    const bp=owPos(route[f.routeIdx]);
    const tdx=bp.x-f.x,tdy=bp.y-f.y,td=Math.hypot(tdx,tdy)||1;
    if(td<60)f.routeIdx=(f.routeIdx+1)%2;
    const ta=Math.atan2(tdx,-tdy);
    f.a+=angDiff(f.a,ta)*.04;f.vx+=Math.sin(f.a)*F.owSpd*.04;f.vy-=Math.cos(f.a)*F.owSpd*.04;
  }
  f.vx*=.97;f.vy*=.97;
  const fs=Math.hypot(f.vx,f.vy);if(fs>F.owSpd){f.vx=f.vx/fs*F.owSpd;f.vy=f.vy/fs*F.owSpd;}
  f.x=Math.max(40,Math.min(OW_W-40,f.x+f.vx));f.y=Math.max(40,Math.min(OW_H-40,f.y+f.vy));
  if(f.flash>0)f.flash--;
  if(F.spawnsHunters&&--f.spawnTimer<=0){
    f.spawnTimer=F.spawnsHunters.everyFrames;
    const HF=fleetDef('HUNTER');
    if(G.OW.fleets.filter(ff=>ff.alive&&ff.id==='HUNTER').length<HF.maxOnOW)G.OW.fleets.push(mkFleet('HUNTER',f.x,f.y));
  }
  if(s.inv<=0&&dist<F.trigR){
    const cdx=f.x-s.x,cdy=f.y-s.y;const contactA=Math.atan2(cdx,-cdy);owStartFleetEnc(fi,contactA,s.a);return true;
  }
  return false;
}

function drBase(near){
  const{r}=BASE,{x,y}=owPos(BASE),pu=.5+.5*Math.sin(G.fr*.05);
  cx.save();
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=6+pu*10;cx.lineWidth=1.5;
  cx.beginPath();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;i?cx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):cx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  cx.closePath();cx.stroke();
  cx.lineWidth=1;
  cx.beginPath();cx.moveTo(x-r*1.6,y);cx.lineTo(x-r,y);cx.moveTo(x+r,y);cx.lineTo(x+r*1.6,y);cx.stroke();
  cx.beginPath();cx.moveTo(x,y-r*1.6);cx.lineTo(x,y-r);cx.moveTo(x,y+r);cx.lineTo(x,y+r*1.6);cx.stroke();
  cx.shadowBlur=0;cx.fillStyle='#aaccff';cx.font='bold 10px monospace';cx.textAlign='center';
  cx.fillText('BASE',x,y-r-8);
  if(near){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.fillText('[ FIRE TO DOCK ]',x,y+r+16);}
  cx.restore();
}
function drSlipgate(near){
  const{x,y}=owPos(SLIPGATE),pu=.5+.5*Math.sin(G.fr*.045);
  const active=G.slipgateActive;
  const col=active?'#cc99ff':'#aa99cc';
  cx.save();
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=(active?10:6)+pu*(active?22:14);cx.lineWidth=2.5;
  cx.beginPath();cx.ellipse(x,y,28,17,0,0,Math.PI*2);cx.stroke();
  cx.lineWidth=1.2;cx.globalAlpha=.55;
  cx.beginPath();cx.ellipse(x,y,20,12,0,0,Math.PI*2);cx.stroke();
  cx.globalAlpha=1;cx.shadowBlur=0;cx.fillStyle=col;cx.font='bold 10px monospace';cx.textAlign='center';
  cx.fillText('SLIPGATE',x,y-28-8);
  if(near){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.fillText(active?'[ FIRE TO JUMP ]':'[ FIRE TO ENTER ]',x,y+28+16);}
  cx.restore();
}
const OW_INDICATOR_RANGE=900;
const FLEET_COLS={HUNTER:'#ff6655',SWARM:'#00ddff',PATROL:'#ffaa44',CONVOY:'#ddccaa',ARMADA:'#ff3322'};
function fleetColor(id){return FLEET_COLS[id]||'#fff';}
function owIndicatorTargets(ow){
  const out=[];
  for(const e of ow.en){
    if(!e.alive)continue;
    const et=enemyDef(e.t);
    out.push({x:e.x,y:e.y,r:et.enc?.r||14,col:et.col,alive:true});
  }
  for(const f of ow.fleets){
    if(!f.alive)continue;
    const F=fleetDef(f.id);
    out.push({x:f.x,y:f.y,r:F.trigR||18,col:fleetColor(f.id),alive:true});
  }
  return out;
}
function drFleet(f){
  const F=fleetDef(f.id),pu=.5+.5*Math.sin(G.fr*.07+f.x*.001);
  const col=fleetColor(f.id);
  cx.save();cx.translate(f.x,f.y);
  if(f.flash>0)cx.globalAlpha=f.flash%4<2?1:.3;
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8+pu*8;cx.lineWidth=1.5;
  if(f.id==='HUNTER'){
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3-Math.PI/2;cx.beginPath();cx.arc(Math.cos(a)*7,Math.sin(a)*7,4,0,Math.PI*2);cx.stroke();}
  } else if(f.id==='SWARM'){
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5+G.owFr*.025;cx.beginPath();cx.arc(Math.cos(a)*9,Math.sin(a)*9,3,0,Math.PI*2);cx.stroke();}
  } else if(f.id==='PATROL'){
    cx.beginPath();cx.moveTo(0,-10);cx.lineTo(-9,6);cx.lineTo(9,6);cx.closePath();cx.stroke();
    cx.beginPath();cx.moveTo(0,-6);cx.lineTo(-5,3);cx.lineTo(5,3);cx.closePath();cx.stroke();
  } else if(f.id==='CONVOY'){
    cx.strokeRect(-12,-6,24,12);
    for(let i=-1;i<=1;i+=2){cx.beginPath();cx.arc(i*18,0,5,0,Math.PI*2);cx.stroke();}
  } else if(f.id==='ARMADA'){
    cx.beginPath();cx.moveTo(0,-14);cx.lineTo(14,0);cx.lineTo(0,14);cx.lineTo(-14,0);cx.closePath();cx.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;cx.beginPath();cx.arc(Math.cos(a)*20,Math.sin(a)*20,4,0,Math.PI*2);cx.stroke();}
  }
  cx.globalAlpha=1;cx.restore();
}
function drawSlipgateMenu(){
  drawOW();
  const active=G.slipgateActive;
  const col='#cc99ff',dimCol='#aa99cc';
  cx.save();cx.textAlign='center';
  if(!active){
    const pw=400,ph=200,px=W/2-pw/2,py=H/2-ph/2;
    cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
    cx.strokeStyle=dimCol;cx.shadowColor=dimCol;cx.shadowBlur=18;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
    cx.shadowBlur=12;cx.fillStyle=dimCol;cx.font='bold 22px monospace';cx.fillText('SLIPGATE',W/2,py+40);
    cx.shadowBlur=0;cx.fillStyle='#8877aa';cx.font='bold 15px monospace';
    cx.fillText('Clear all sectors to activate the slipgate.',W/2,py+112);
    cx.fillStyle='#334';cx.font='11px monospace';cx.fillText(pausePrompt('TO LEAVE'),W/2,py+ph-14);
  } else if(G.seed===TUTORIAL_SEED&&!G.tutorialDone){
    const sel=G.slipSel||0;
    const pw=400,ph=260,px=W/2-pw/2,py=H/2-ph/2;
    cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=18;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
    cx.shadowBlur=12;cx.fillStyle=col;cx.font='bold 22px monospace';cx.fillText('SLIPGATE',W/2,py+40);
    cx.shadowBlur=0;cx.fillStyle='#8877aa';cx.font='12px monospace';
    cx.fillText('Slipspace coordinates are unstable.',W/2,py+76);
    cx.fillText('Destination unknown — slipgate distortion.',W/2,py+94);
    cx.fillText('Really use the slipgate?',W/2,py+116);
    const opts=['YES — JUMP','NO — STAY'];
    opts.forEach((o,i)=>{
      const s=i===sel;
      cx.fillStyle=s?col:'#776688';cx.shadowColor=col;cx.shadowBlur=s?8:0;
      cx.font=s?'bold 14px monospace':'13px monospace';
      cx.fillText((s?UI_GLYPH.pointer+' ':' ')+o,W/2,py+158+i*30);
    });
    cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.fillText(pausePrompt('TO LEAVE'),W/2,py+ph-14);
  } else {
    const nb=slipNeighborList(),N=nb.length;
    const rowH=30,ph=120+(N+1)*rowH,pw=400,px=W/2-pw/2,py=H/2-ph/2;
    cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=18;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
    cx.shadowBlur=10;cx.fillStyle=col;cx.font='bold 20px monospace';cx.fillText('SLIPGATE',W/2,py+30);
    cx.shadowBlur=0;cx.fillStyle='#776688';cx.font='11px monospace';
    cx.fillText(N+' NEIGHBORING SYSTEM'+(N===1?'':'S')+' DETECTED',W/2,py+50);
    for(let i=0;i<N;i++){
      const n=nb[i],sel=i===G.slipSel;
      const hexStr=n.toString(16).toUpperCase().padStart(8,'0');
      const tag=(n===G.prevSeed?'  ← BACK':'')+(G.visitedSeeds.includes(n)?'  ★':'');
      cx.fillStyle=sel?col:'#776688';cx.shadowColor=col;cx.shadowBlur=sel?8:0;
      cx.font=sel?'bold 13px monospace':'12px monospace';
      cx.fillText((sel?UI_GLYPH.pointer+' ':'  ')+hexStr+tag,W/2,py+80+i*rowH);
    }
    {const sel=G.slipSel===N;
      cx.fillStyle=sel?col:'#776688';cx.shadowColor=col;cx.shadowBlur=sel?8:0;
      cx.font=sel?'bold 13px monospace':'12px monospace';
      cx.fillText((sel?UI_GLYPH.pointer+' ':'  ')+'RETURN',W/2,py+80+N*rowH);
    }
    cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.fillText(pausePrompt('TO LEAVE'),W/2,py+ph-12);
  }
  cx.restore();
}

function owOrbitBodies(){
  return [['#aaccff',BASE.orbitR,BASE],...PP.map((b,i)=>[LV[i].pcol,b.orbitR,b]),...(G.hbCleared?[]:[['#ff4444',HBASE.orbitR,HBASE]]),['#aa99cc',SLIPGATE.orbitR,SLIPGATE]];
}
function owOrbitProfile(){
  const q=renderQuality();
  if(q==='minimal')return{orbitAlpha:.34,orbitBlur:0,arrows:0,arrowAlpha:0,arrowBlur:0,arrowWidth:0,arrowSize:0,asteroidAlpha:.32,asteroidStep:6,asteroidBlur:0};
  if(q==='reduced')return{orbitAlpha:.48,orbitBlur:0,arrows:7,arrowAlpha:.42,arrowBlur:0,arrowWidth:2,arrowSize:8,asteroidAlpha:.42,asteroidStep:3,asteroidBlur:0};
  return{orbitAlpha:.65,orbitBlur:5,arrows:20,arrowAlpha:.58,arrowBlur:5,arrowWidth:1.8,arrowSize:7.5,asteroidAlpha:.6,asteroidStep:1,asteroidBlur:2};
}
function drawOrbitChevron(x,y,a,dir,col,size,width){
  const fx=-dir*Math.sin(a),fy=dir*Math.cos(a),px=-fy,py=fx;
  const tipX=x+fx*size,tipY=y+fy*size;
  const backX=x-fx*size*.55,backY=y-fy*size*.55;
  cx.strokeStyle=col;cx.lineWidth=width;cx.lineCap='round';cx.lineJoin='round';
  cx.beginPath();
  cx.moveTo(backX+px*size*.55,backY+py*size*.55);
  cx.lineTo(tipX,tipY);
  cx.lineTo(backX-px*size*.55,backY-py*size*.55);
  cx.stroke();
}
function drawOWOrbitGuides(){
  const prof=owOrbitProfile(),arrowBodies=owOrbitBodies();
  cx.save();cx.lineWidth=1;cx.globalAlpha=prof.orbitAlpha;cx.setLineDash([4,2]);
  for(const[col,r]of arrowBodies){
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=prof.orbitBlur;
    cx.beginPath();cx.arc(OW_W/2,OW_H/2,r,0,Math.PI*2);cx.stroke();
  }
  cx.strokeStyle='#998877';cx.shadowColor='#998877';cx.shadowBlur=prof.orbitBlur;
  cx.beginPath();cx.arc(OW_W/2,OW_H/2,AB[0].orbitR,0,Math.PI*2);cx.stroke();
  cx.setLineDash([]);
  if(prof.arrows>0){
    const arrowSpd=0.00173,N=prof.arrows,arrowGap=renderQuality()==='full'?0.2:0.35;
    for(const[col,r,b]of arrowBodies){
      const bodyA=b.orbitA+G.owFr*b.orbitSpd;
      cx.shadowColor=col;cx.shadowBlur=prof.arrowBlur;
      for(let i=0;i<N;i++){
        const phase=(G.fr*arrowSpd+i*Math.PI/N)%Math.PI;
        if(phase<arrowGap)continue;
        const fade=phase>Math.PI*.8?1-(phase-Math.PI*.8)/(Math.PI*.2):1;
        cx.globalAlpha=prof.arrowAlpha*fade;
        for(const dir of[1,-1]){
          const a=bodyA+Math.PI+dir*phase;
          drawOrbitChevron(OW_W/2+Math.cos(a)*r,OW_H/2+Math.sin(a)*r,a,dir,col,prof.arrowSize,prof.arrowWidth);
        }
      }
    }
  }
  cx.globalAlpha=1;cx.shadowBlur=0;cx.restore();
}
function drawOWAsteroidBelt(){
  const prof=owOrbitProfile();
  cx.save();cx.globalAlpha=prof.asteroidAlpha;cx.strokeStyle='#776655';cx.lineWidth=0.8;cx.shadowColor='#554433';cx.shadowBlur=prof.asteroidBlur;
  const abOrbitR=AB[0].orbitR,abSpd=AB[0].orbitSpd,step=prof.asteroidStep;
  for(let pi=0;pi<AB_BELT.length;pi+=step){
    const p=AB_BELT[pi],a=p.a+G.owFr*abSpd;
    const bx=OW_W/2+Math.cos(a)*(abOrbitR+p.dr),by=OW_H/2+Math.sin(a)*(abOrbitR+p.dr);
    cx.beginPath();
    for(let i=0;i<p.sides;i++){const pa=(i/p.sides)*Math.PI*2+p.rot;i?cx.lineTo(bx+Math.cos(pa)*p.rv,by+Math.sin(pa)*p.rv):cx.moveTo(bx+Math.cos(pa)*p.rv,by+Math.sin(pa)*p.rv);}
    cx.closePath();cx.stroke();
  }
  cx.restore();
}

function drawOW(){
  cx.fillStyle='#000008';cx.fillRect(0,0,W,H);drStars();
  const ow=G.OW,s=ow.s;
  const cam=updateWorldCamera(ow.cam||(ow.cam={x:Math.max(0,Math.min(OW_W-W,s.x-W/2)),y:Math.max(0,Math.min(OW_H-H,s.y-H/2)),z:1}),s.x,s.y,OW_W,OW_H,cameraZoomTarget('overworld',s),.5,.5,dynZoomOn()?.12:1);
  const dustV=dustVelocityForShip(s,cam);
  drDust(dustV.x,dustV.y);
  cx.save();applyWorldCamera(cam);
  drawOWOrbitGuides();
  drawOWAsteroidBelt();
  {const sx2=OW_W/2,sy2=OW_H/2,SR=40,pu=.5+.5*Math.sin(G.fr*.04);
  cx.save();cx.translate(sx2,sy2);
  // outer glow
  cx.shadowColor='#ffe070';cx.shadowBlur=80+pu*60;
  // limb darkening gradient
  const grad=cx.createRadialGradient(0,0,0,0,0,SR);
  grad.addColorStop(0,'#ffffff');grad.addColorStop(0.5,'#fffbe8');
  grad.addColorStop(0.82,'#ffe87a');grad.addColorStop(1,'#ffcc40');
  cx.fillStyle=grad;cx.beginPath();cx.arc(0,0,SR,0,Math.PI*2);cx.fill();
  cx.shadowBlur=0;
  cx.restore();}
  for(let i=0;i<LV.length;i++){
    const p=owPos(PP[i]),d=LV[i];
    if(G.cleared[i]){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();cx.fillStyle='#223';cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();cx.fillStyle='#446';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('CLEARED',p.x,p.y+3);cx.setLineDash([]);cx.restore();continue;}
    const pu=.5+.5*Math.sin(G.fr*.05+i);cx.save();cx.shadowColor=d.pcol;cx.shadowBlur=8+pu*14;
    cx.strokeStyle=d.pcol;cx.lineWidth=1.5;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();
    cx.fillStyle=d.bg;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();
    cx.strokeStyle=d.col;cx.lineWidth=.8;cx.globalAlpha=.4;
    [[-8,-6,5],[7,4,7],[-4,9,4],[10,-8,3]].forEach(([cx2,cy,r])=>{cx.beginPath();cx.arc(p.x+cx2,p.y+cy,r,0,Math.PI*2);cx.stroke();});
    cx.globalAlpha=1;cx.fillStyle=d.col;cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText(d.name,p.x,p.y-d.pr-8);cx.restore();
    if(ow.nearP===i){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.textAlign='center';cx.fillText('[ FIRE TO ENTER ]',p.x,p.y+d.pr+16);cx.restore();}
  }
  for(let ai=0;ai<2;ai++){const ap=owPos(AB[ai]);
    cx.save();cx.strokeStyle='#998877';cx.shadowColor='#776655';cx.shadowBlur=5;cx.lineWidth=1.2;
    for(const[ox,oy,r2]of[[-14,-9,11],[9,-16,8],[16,6,10],[-9,13,9],[19,-5,7],[1,17,6],[-17,5,8],[8,11,7]]){
      cx.beginPath();
      for(let i=0;i<8;i++){const a2=(i/8)*Math.PI*2,rr=r2*(1+.2*Math.sin(a2*3+r2));
        i?cx.lineTo(ap.x+ox+Math.cos(a2)*rr,ap.y+oy+Math.sin(a2)*rr):cx.moveTo(ap.x+ox+Math.cos(a2)*rr,ap.y+oy+Math.sin(a2)*rr);}
      cx.closePath();cx.stroke();}
    cx.fillStyle='#998877';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('ASTEROID FIELD',ap.x,ap.y-40);
    cx.restore();
    if(ow.nearAst===ai){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.textAlign='center';cx.fillText('[ FIRE TO ENTER ]',ap.x,ap.y+44);cx.restore();}}
  {const hbp=owPos(HBASE),HEX_R_OW=20;
  if(G.hbCleared){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW):cx.moveTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW);}cx.closePath();cx.stroke();cx.fillStyle='#446';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('CLEARED',hbp.x,hbp.y+3);cx.setLineDash([]);cx.restore();}
  else{const pu=.5+.5*Math.sin(G.fr*.07);cx.save();cx.strokeStyle='#e05109';cx.shadowColor='#e05109';cx.shadowBlur=6+pu*8;cx.lineWidth=1.5;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW):cx.moveTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW);}cx.closePath();cx.stroke();cx.shadowBlur=0;cx.fillStyle='#e05109';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('HOSTILE BASE',hbp.x,hbp.y-HEX_R_OW-8);if(ow.nearHBase){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.fillText('[ FIRE TO ENTER ]',hbp.x,hbp.y+HEX_R_OW+16);}cx.restore();}}
  for(const e of ow.en)if(e.alive)enemyDef(e.t).drawOW(e);
  for(const f of ow.fleets)if(f.alive)drFleet(f);
  for(const f of ow.fu)drEnergy(f.x,f.y,'#0f8');
  drPts(ow.pts);
  drBase(ow.nearBase);
  drSlipgate(ow.nearSlipgate);
  if(s.alive)drShip(s.x,s.y,s.a,s,iThrustInput(),s.energy,s.inv,G.fr);
  cx.restore();
  if(G.st==='overworld'&&s.alive){
    drawOffscreenIndicators(collectOffscreenIndicators({
      cam,player:s,worldW:OW_W,worldH:OW_H,maxRange:OW_INDICATOR_RANGE,
      targets:owIndicatorTargets(ow)
    }));
  }
  drHUD(s.energy,s.maxEnergy,s.hp,s.maxHp,s);
  if(G.slipMsg>0){
    const alpha=Math.min(1,G.slipMsg/40);
    const msgY=46;
    cx.save();cx.globalAlpha=alpha;
    cx.fillStyle='rgba(4,0,12,.82)';cx.fillRect(W/2-200,msgY,400,52);
    cx.strokeStyle='#cc99ff';cx.shadowColor='#cc99ff';cx.shadowBlur=14;cx.lineWidth=1;cx.strokeRect(W/2-200,msgY,400,52);
    cx.fillStyle='#cc99ff';cx.font='bold 14px monospace';cx.textAlign='center';cx.shadowBlur=10;
    cx.fillText('SLIPGATE ACTIVATED',W/2,msgY+24);
    cx.shadowBlur=0;cx.fillStyle='#9977bb';cx.font='11px monospace';
    cx.fillText('The slipgate is now open. Find it at the outer rim.',W/2,msgY+46);
    cx.restore();
  }
}
