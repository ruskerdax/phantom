'use strict';

// ===================== OVERWORLD =====================
const ORBITAL_GUN_RANGE=700;
const ORBITAL_GUN_COOLDOWN=480;
const ORBITAL_GUN_PROJECTILE_SPEED=1.5;
const ORBITAL_GUN_PROJECTILE_LIFE=180;

function owSpawnPos(px,py,minDist=600){
  let x,y,attempts=0;
  do{const a=Math.random()*Math.PI*2,d=480+Math.random()*360;
    x=Math.max(40,Math.min(OW_W-40,OW_W/2+Math.cos(a)*d));
    y=Math.max(40,Math.min(OW_H-40,OW_H/2+Math.sin(a)*d));
    attempts++;
  }while(px!=null&&Math.hypot(x-px,y-py)<minDist&&attempts<30);
  return{x,y};
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
  for(let i=0;i<2;i++){const p=owSpawnPos(px,py);ow.fleets.push(mkFleet('HUNTER',p.x,p.y));}
  // 1 Patrol
  {const p=owSpawnPos(px,py);ow.fleets.push(mkFleet('PATROL',p.x,p.y));}
  // 1 Swarm per uncleared cave level
  for(let i=0;i<PP.length;i++){
    if(G.cleared[bodyIdForPlanetIndex(i)])continue;
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
  G.OW={s:mkShip(px,py),fleets:[],fu:[],pts:[],nearBodyId:null,nearBase:false,nearAst:-1,nearHBase:false,nearSlipgate:false,spatial:null,
    owGunShots:[],owGunCd:{},
    slipgateSpawnTimer:1800,convoySpawnTimer:5400,cam:{x:Math.max(0,Math.min(OW_W-W,px-W/2)),y:Math.max(0,Math.min(OW_H-H,py-H/2)),z:1}};
  setShipEnergy(G.OW.s,energy);G.OW.s.inv=120;
  seedSystemFleets(px,py);
  G.st='overworld';
}
function owEnsureSpatial(ow){
  if(!ow.spatial||ow.spatial.worldW!==OW_W||ow.spatial.worldH!==OW_H)ow.spatial=mkSpatial(OW_W,OW_H);
  return ow.spatial;
}
function owSpatialPayload(host,kind,ref,r){
  const pl=host._sp||(host._sp={x:0,y:0,r:0,kind,ref});
  pl.kind=kind;pl.ref=ref;pl.r=r;
  return pl;
}
function owPopulateSpatial(ow){
  const g=owEnsureSpatial(ow);
  spatialClear(g);
  for(let i=0;i<LV.length;i++){
    const p=owPos(PP[i]),pl=owSpatialPayload(PP[i],'planet',bodyIdForPlanetIndex(i),LV[i].pr);
    pl.x=p.x;pl.y=p.y;
    spatialAdd(g,p.x,p.y,pl);
  }
  for(let ai=0;ai<AB.length;ai++){
    const ap=owPos(AB[ai]),pl=owSpatialPayload(AB[ai],'asteroid',ai,AB[ai].r);
    pl.x=ap.x;pl.y=ap.y;
    spatialAdd(g,ap.x,ap.y,pl);
  }
  for(let fi=0;fi<ow.fleets.length;fi++){
    const f=ow.fleets[fi];
    if(!f.alive)continue;
    const pl=owSpatialPayload(f,'fleet',fi,fleetDef(f.id).trigR||18);
    pl.x=f.x;pl.y=f.y;
    spatialAdd(g,f.x,f.y,pl);
  }
  {const bp=owPos(BASE),pl=owSpatialPayload(BASE,'base',BASE,BASE.r);pl.x=bp.x;pl.y=bp.y;spatialAdd(g,bp.x,bp.y,pl);}
  {const hbp=owPos(HBASE),pl=owSpatialPayload(HBASE,'hbase',HBASE,HBASE.r);pl.x=hbp.x;pl.y=hbp.y;spatialAdd(g,hbp.x,hbp.y,pl);}
  {const sgp=owPos(SLIPGATE),pl=owSpatialPayload(SLIPGATE,'slipgate',SLIPGATE,SLIPGATE.r);pl.x=sgp.x;pl.y=sgp.y;spatialAdd(g,sgp.x,sgp.y,pl);}
}
function owMaxInteractR(){
  let r=Math.max(BASE.r,HBASE.r,SLIPGATE.r);
  for(let i=0;i<LV.length;i++)if(LV[i].pr>r)r=LV[i].pr;
  for(let ai=0;ai<AB.length;ai++)if(AB[ai].r>r)r=AB[ai].r;
  return r+28;
}
function owKillShip(){
  const ow=G.OW;killShip(ow.s,ow.pts,'dead_ow');
  G.absAimTarget=null;
}
function doRebuildFinalize(){
  const bp=owPos(BASE);G.ENC=null;G.site=null;G.stake=0;
  G.needsRebuild=false;
  if(!G.OW){initOW(loadoutBatteryCapacity(),bp.x,bp.y);fillShipHull(G.OW.s);recordLastLocation('base');saveGame();return;}
  G.OW.s=mkShip(bp.x,bp.y);fillShipHull(G.OW.s);G.OW.s.inv=180;
  G.OW.fleets=[];
  G.OW.owGunShots=[];
  G.OW.owGunCd={};
  G.OW.slipgateSpawnTimer=1800;G.OW.convoySpawnTimer=5400;
  seedSystemFleets(bp.x,bp.y);
  recordLastLocation('base');
  G.st='overworld';saveGame();tone(660,.2,'sine',.08);
}
function jumpToSeed(newSeed,sourceSeed){
  const energy=G.OW.s.energy;
  // Snapshot departing system state.
  G.systemStates[G.seed>>>0]=currentSystemState();
  G.prevSeed=sourceSeed;
  G.seed=newSeed>>>0;
  genWorld(G.seed);
  // Restore destination state if previously visited, else fresh.
  const prev=G.systemStates[G.seed];
  if(prev)applySystemObjectiveState(prev);
  else applySystemObjectiveState({});
  G.stake=0;G.slipMsg=0;
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
function startAstEnc(){
  const ow=G.OW;
  const tierDefs=[{r:[26,8],hp:180},{r:[17,5],hp:90},{r:[9,4],hp:30}];
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
  const encShip=mkShip(spawnX,spawnY);copyShipEnergyState(ow.s,encShip);copyAmmoStateForLoadout(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  copyShieldState(ow.s,encShip);
  G.ENC={isAst:true,et:astEnemy,label:'ASTEROID FIELD',
    s:encShip,en:ens,rocks,bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:ens.length?70:0,cleared:!ens.length,
    ew:EW,eh:EH,cam:{x:0,y:Math.max(0,EH/2-H/2),z:1}};
  G.absAimTarget=null;G.st=ens.length?'enc_in':'encounter';
  recordLastLocation('asteroid',bodyIdForAsteroidIndex(ow.nearAst));
  saveGame();
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function startHBaseEnc(){
  const ow=G.OW,ew=EW*2,eh=EH*2,HEX_R=150,hx=ew/2,hy=eh/2;
  const hbs=G.hbState;
  const softpts=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3+Math.PI/6,d=HEX_R*Math.sqrt(3)/2;
    return{x:hx+Math.cos(a)*d,y:hy+Math.sin(a)*d,hp:10,alive:hbs?hbs.softpts[i]:true};
  });
  const turrets=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3;
    return mkDefense(DEFENSE_CLASS_IDS.HBASE_TURRET,hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R,{a:a,timer:defenseCooldown(defenseDef(DEFENSE_CLASS_IDS.HBASE_TURRET))+i*22,alive:hbs?hbs.turrets[i]:true});
  });
  const hexPoly=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return[hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R];});
  const encShip=mkShip(ew*.08,eh/2);copyShipEnergyState(ow.s,encShip);copyAmmoStateForLoadout(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  copyShieldState(ow.s,encShip);
  G.ENC={isHBase:true,et:ENEMY_TYPES.BATTLESHIP,label:'HOSTILE BASE',
    s:encShip,en:[],rocks:[],bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew,eh,hbase:{HEX_R,hx,hy,softpts,turrets,hexPoly},
    cam:{x:Math.max(0,hx-W/2),y:Math.max(0,hy-H/2),z:1}};
  G.absAimTarget=null;G.st='enc_in';
  recordLastLocation('hbase');
  saveGame();
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function updOWOrbitalGuns(ow,s){
  const cds=ow.owGunCd||(ow.owGunCd={}),shots=ow.owGunShots||(ow.owGunShots=[]);
  for(let pi=0;pi<LV.length;pi++){
    const bodyId=bodyIdForPlanetIndex(pi),guns=orbitalGunAliveRefsForPlanet(pi,bodyId);
    if(!guns.length)continue;
    const p=owPos(PP[pi]),inRange=Math.hypot(s.x-p.x,s.y-p.y)<=ORBITAL_GUN_RANGE;
    for(const gun of guns){
      const key=`${bodyId}:${gun.bitIndex}`;
      let cd=Number.isFinite(cds[key])?cds[key]:ORBITAL_GUN_COOLDOWN;
      cd--;
      if(inRange&&cd<=0){
        const dx=s.x-p.x,dy=s.y-p.y,dist=Math.hypot(dx,dy)||1;
        shots.push({
          x:p.x,y:p.y,
          vx:dx/dist*ORBITAL_GUN_PROJECTILE_SPEED,
          vy:dy/dist*ORBITAL_GUN_PROJECTILE_SPEED,
          l:ORBITAL_GUN_PROJECTILE_LIFE,
          dmg:150,
          from:pi,
        });
        cd=ORBITAL_GUN_COOLDOWN;
      }
      cds[key]=cd;
    }
  }
}
function updOWOrbitalGunShots(ow,s){
  const shots=ow.owGunShots||(ow.owGunShots=[]);
  for(let i=shots.length-1;i>=0;i--){
    const sh=shots[i];
    sh.px=sh.x;sh.py=sh.y;
    sh.x+=sh.vx;sh.y+=sh.vy;sh.l--;
    if(sh.l<=0||sh.x<0||sh.x>OW_W||sh.y<0||sh.y>OW_H){shots.splice(i,1);continue;}
    const shipHit=applyProjectileDamageToShip(s,sh,{targetX:s.x,targetY:s.y,kind:'projectile',weapon:sh,damage:sh.dmg});
    if(!shipHit.consumed&&!shipHit.hullHit)continue;
    shipDamageTone({shieldDamage:shipHit.shieldHit?.shieldDamage??0,hullDamage:shipHit.hullHit?.hullDamage??0});
    shots.splice(i,1);
    if(s.hp<=0&&s.alive){owKillShip();return true;}
  }
  return false;
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
  const rocks=[],tierDefs=[{r:[26,8],hp:180},{r:[17,5],hp:90},{r:[9,4],hp:30}];
  let rockCount=0;for(let i=0;i<8;i++)if(rng.fl(0,1)<.25)rockCount++;
  const minSpawnDist=120;
  for(let i=0;i<rockCount;i++){
    let rx,ry,att=0;
    do{rx=rng.fl(60,EW-60);ry=rng.fl(60,EH-60);att++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&att<30);
    const tier=rng.int(0,2),td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:rng.fl(-.55,.55),vy:rng.fl(-.55,.55),r:td.r[0]+rng.fl(0,td.r[1]),hp:td.hp,maxHp:td.hp,tier});
  }
  const encShip=mkShip(spawnX,spawnY);copyShipEnergyState(ow.s,encShip);copyAmmoStateForLoadout(ow.s,encShip);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;encShip.a=playerA;
  copyShieldState(ow.s,encShip);
  // Use the first comp role/type as the representative for encounter color.
  if(!f.comp.length)throw new Error(`Fleet ${f.id} has no enemy composition`);
  const repType=f.comp[0].t;
  G.ENC={fleetIdx:fi,et:repType,label:f.id+' FLEET',
    s:encShip,en:ens,rocks,bul:[],ebu:[],mis:[],emi:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew:EW,eh:EH,cam:{x:Math.max(0,Math.min(EW-W,spawnX-W/2)),y:Math.max(0,Math.min(EH-H,spawnY-H/2)),z:1}};
  G.absAimTarget=null;G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
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
  applyShipSteering(s, s.energy<=0, false);
  if(iShieldToggle())toggleShipShield(s);
  tickShieldRecharge(s);
  // sin(angle) = X component, -cos(angle) = Y component: canvas Y increases downward, so "forward" is -cos.
  const thrustIn=iThrustInput();
  if(thrustIn.activeAxes>0){
    applyShipThrust(s, thrustIn, s.energy<=0);
    drainEnergy(s, thrustEnergyDrainForMode('overworld')*thrustEnergyScale(thrustIn));
  }
  thrusterSound(thrustIn,'overworld',s.energy<=0);
  {const maxSpd=8.4;
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
  updOWOrbitalGuns(ow,s);
  if(updOWOrbitalGunShots(ow,s))return;
  owPopulateSpatial(ow);
  const near=spatialQueryRadius(ow.spatial,s.x,s.y,owMaxInteractR(),ow._nearSpatial||(ow._nearSpatial=[]));
  ow.nearBase=false;
  ow.nearBodyId=null;
  ow.nearAst=-1;
  ow.nearHBase=false;
  ow.nearSlipgate=false;
  for(let i=0;i<near.length;i++){
    const q=near[i];
    if(Math.hypot(s.x-q.x,s.y-q.y)>=q.r+28)continue;
    if(q.kind==='base'){ow.nearBase=true;continue;}
    if(q.kind==='planet'){
      if(G.cleared[q.ref])continue;
      const nextIdx=bodyIndexFromId(q.ref),curIdx=bodyIndexFromId(ow.nearBodyId);
      if(ow.nearBodyId==null||(Number.isInteger(nextIdx)&&(!Number.isInteger(curIdx)||nextIdx<curIdx)))ow.nearBodyId=q.ref;
      continue;
    }
    if(q.kind==='asteroid'){
      if(ow.nearAst<0||q.ref<ow.nearAst)ow.nearAst=q.ref;
      continue;
    }
    if(q.kind==='hbase'){
      if(!G.hbCleared)ow.nearHBase=true;
      continue;
    }
    if(q.kind==='slipgate'){ow.nearSlipgate=true;}
  }
  const owFired=iFir();
  if(owFired&&ow.nearBase){G.credits+=G.stake;G.stake=0;suppressMenuInput();recordLastLocation('base');openBaseMenu();saveGame();return;}
  if(owFired&&ow.nearBodyId){enterPlanetByBodyId(ow.nearBodyId);return;}
  if(owFired&&ow.nearAst>=0){startAstEnc();return;}
  if(owFired&&ow.nearHBase){startHBaseEnc();return;}
  if(owFired&&ow.nearSlipgate){suppressMenuInput();recordLastLocation('slipgate');openSlipgateMenu();saveGame();return;}
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
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=sb(6+pu*10);cx.lineWidth=1.5;
  cx.beginPath();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;i?cx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):cx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  cx.closePath();cx.stroke();
  cx.lineWidth=1;
  cx.beginPath();cx.moveTo(x-r*1.6,y);cx.lineTo(x-r,y);cx.moveTo(x+r,y);cx.lineTo(x+r*1.6,y);cx.stroke();
  cx.beginPath();cx.moveTo(x,y-r*1.6);cx.lineTo(x,y-r);cx.moveTo(x,y+r);cx.lineTo(x,y+r*1.6);cx.stroke();
  cx.shadowBlur=0;cx.fillStyle='#aaccff';cx.font='bold 10px MajorMonoDisplay, monospace';cx.textAlign='center';
  cx.fillText('base',x,y-r-8);
  if(near){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=sb(10);cx.font='bold 12px MajorMonoDisplay, monospace';cx.fillText('[ fire to dock ]',x,y+r+16);}
  cx.restore();
}
function drSlipgate(near){
  const{x,y}=owPos(SLIPGATE),pu=.5+.5*Math.sin(G.fr*.045);
  const active=G.slipgateActive;
  const col=active?'#cc99ff':'#aa99cc';
  cx.save();
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=sb((active?10:6)+pu*(active?22:14));cx.lineWidth=2.5;
  cx.beginPath();cx.ellipse(x,y,28,17,0,0,Math.PI*2);cx.stroke();
  cx.lineWidth=1.2;cx.globalAlpha=.55;
  cx.beginPath();cx.ellipse(x,y,20,12,0,0,Math.PI*2);cx.stroke();
  cx.globalAlpha=1;cx.shadowBlur=0;cx.fillStyle=col;cx.font='bold 10px MajorMonoDisplay, monospace';cx.textAlign='center';
  cx.fillText('slipgate',x,y-28-8);
  if(near){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=sb(10);cx.font='bold 12px MajorMonoDisplay, monospace';cx.fillText(active?'[ fire to jump ]':'[ fire to enter ]',x,y+28+16);}
  cx.restore();
}
const OW_CULL_PAD=60;
let owStarGrad=null;
const FLEET_COLS={HUNTER:'#ff6655',SWARM:'#00ddff',PATROL:'#ffaa44',CONVOY:'#ddccaa',ARMADA:'#ff3322'};
function fleetColor(id){return FLEET_COLS[id]||'#fff';}
function owIndicatorRange(){return Math.max(900,Math.min(OW_W,OW_H)*0.15);}
function owBodyIndicatorRange(){return 2*owIndicatorRange();}
function bodyChevronColor(b){
  return b?.palette?.primary || (b?.kind==='gas_giant'?'#fa6':'#8af');
}
function owRectIntersectsRect(ax0,ay0,ax1,ay1,bx0,by0,bx1,by1){
  return !(ax1<bx0||bx1<ax0||ay1<by0||by1<ay0);
}
function owPointInRect(x,y,r){
  return x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1;
}
function owRectIntersectsAnnulus(r,cx2,cy2,orbitR,pad){
  const nx=Math.max(r.x0,Math.min(cx2,r.x1)),ny=Math.max(r.y0,Math.min(cy2,r.y1));
  const minDist=Math.hypot(nx-cx2,ny-cy2);
  const farDx=Math.max(Math.abs(r.x0-cx2),Math.abs(r.x1-cx2));
  const farDy=Math.max(Math.abs(r.y0-cy2),Math.abs(r.y1-cy2));
  const maxDist=Math.hypot(farDx,farDy);
  const inner=Math.max(0,orbitR-pad),outer=orbitR+pad;
  return minDist<=outer&&maxDist>=inner;
}
function owIndicatorTargets(ow){
  const out=[];
  // Fleets: render as miniatures at the screen edge; visibility range unchanged.
  for(const f of ow.fleets){
    if(!f.alive)continue;
    const F=fleetDef(f.id);
    const col=fleetColor(f.id);
    out.push({
      x:f.x, y:f.y, r:F.trigR||18, col, alive:true,
      drawMini:(sx,sy,scale,alpha)=>{
        cx.save();
        cx.translate(sx,sy);
        cx.scale(scale,scale);
        cx.globalAlpha=alpha;
        drFleet({...f, x:0, y:0, flash:0});
        cx.restore();
      },
    });
  }
  // Bodies, asteroid fields, and the three static sites: chevrons at the doubled body range.
  // Coded so new entity kinds can be added by appending here.
  const bodyMax=owBodyIndicatorRange();
  if(typeof BODIES!=='undefined'){
    for(const b of BODIES){
      if(b.kind==='star')continue;
      const p=bodyOWPos(b);
      out.push({x:p.x, y:p.y, r:bodyDrawRadius(b.size)||16, col:bodyChevronColor(b), alive:true, maxRange:bodyMax});
    }
  }
  if(typeof AB!=='undefined'){
    for(let ai=0; ai<AB.length; ai++){
      const a=AB[ai],p=owPos(a);
      out.push({x:p.x, y:p.y, r:a.r||30, col:'#998877', alive:true, maxRange:bodyMax});
    }
  }
  if(BASE){const p=owPos(BASE);out.push({x:p.x, y:p.y, r:BASE.r, col:'#aaccff', alive:true, maxRange:bodyMax});}
  if(HBASE){const p=owPos(HBASE);out.push({x:p.x, y:p.y, r:HBASE.r, col:G.hbCleared?'#334':'#e05109', alive:true, maxRange:bodyMax});}
  if(SLIPGATE){const p=owPos(SLIPGATE);out.push({x:p.x, y:p.y, r:SLIPGATE.r, col:'#cc99ff', alive:true, maxRange:bodyMax});}
  return out;
}
function drFleet(f){
  const F=fleetDef(f.id),pu=.5+.5*Math.sin(G.fr*.07+f.x*.001);
  const col=fleetColor(f.id);
  cx.save();cx.translate(f.x,f.y);
  if(f.flash>0)cx.globalAlpha=f.flash%4<2?1:.3;
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=sb(8+pu*8);cx.lineWidth=1.5;
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
function drOWOrbitalGunShot(sh){
  const pulse=.5+.5*Math.sin(G.fr*.22+sh.l*.09);
  const trailLen=9;
  const tx=sh.x-sh.vx*trailLen,ty=sh.y-sh.vy*trailLen;
  cx.save();
  cx.strokeStyle='rgba(255,170,120,.78)';
  cx.lineWidth=1.2;
  cx.beginPath();
  cx.moveTo(tx,ty);
  cx.lineTo(sh.x,sh.y);
  cx.stroke();
  cx.fillStyle='#ffbb88';
  cx.shadowColor='#ffbb88';
  cx.shadowBlur=sb(8+pulse*10);
  cx.beginPath();
  cx.arc(sh.x,sh.y,2.8+pulse*1.4,0,Math.PI*2);
  cx.fill();
  cx.restore();
}
// drawSlipgateMenu has moved to ui/screens/slipgate.js (DOM screen).

function owOrbitGuideForLegacyBody(col,b){
  return{col,r:b.orbitR,b,cx:OW_W/2,cy:OW_H/2,a:b.orbitA+G.owFr*b.orbitSpd};
}
function owOrbitGuideForEnterable(i){
  const body=LV[i]?.body||(typeof bodyById==='function'?bodyById(bodyIdForPlanetIndex(i)):null);
  const b=PP[i];
  if(body?.parentId&&body.parentId!=='star'&&typeof bodyById==='function'&&typeof bodyOWPos==='function'){
    const parent=bodyById(body.parentId);
    if(parent){
      const center=bodyOWPos(parent),orbit=body.orbit||{};
      return{col:LV[i].pcol,r:orbit.r||0,b,cx:center.x,cy:center.y,a:(orbit.a||0)+G.owFr*(orbit.spd||0)};
    }
  }
  return owOrbitGuideForLegacyBody(LV[i].pcol,b);
}
function owOrbitBodies(){
  return [
    owOrbitGuideForLegacyBody('#aaccff',BASE),
    ...PP.map((b,i)=>owOrbitGuideForEnterable(i)),
    ...(G.hbCleared?[]:[owOrbitGuideForLegacyBody('#ff4444',HBASE)]),
    owOrbitGuideForLegacyBody('#aa99cc',SLIPGATE)
  ];
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
// Compute the angular sub-range of a circle (centered at cx2,cy2, radius r) that lies
// inside the camera rect. Returns {full:true} when the ring center is inside the rect
// (caller should draw a full 2pi arc), or {a0,a1} for a single arc span, or null when
// the ring is outside the rect (caller skips). The arc span has a small angular pad so
// dashed strokes don't pop in/out at the camera edges.
function owRingArcRange(cx2,cy2,r,rect){
  if(cx2>=rect.x0&&cx2<=rect.x1&&cy2>=rect.y0&&cy2<=rect.y1)return{full:true};
  const a00=Math.atan2(rect.y0-cy2,rect.x0-cx2);
  const a10=Math.atan2(rect.y0-cy2,rect.x1-cx2);
  const a01=Math.atan2(rect.y1-cy2,rect.x0-cx2);
  const a11=Math.atan2(rect.y1-cy2,rect.x1-cx2);
  // Normalize relative to a00, then take min/max delta. With ring center outside the rect
  // the rect subtends < pi, so [a00+minD, a00+maxD] is a single continuous arc range.
  let d1=a10-a00,d2=a01-a00,d3=a11-a00;
  if(d1>Math.PI)d1-=Math.PI*2;else if(d1<-Math.PI)d1+=Math.PI*2;
  if(d2>Math.PI)d2-=Math.PI*2;else if(d2<-Math.PI)d2+=Math.PI*2;
  if(d3>Math.PI)d3-=Math.PI*2;else if(d3<-Math.PI)d3+=Math.PI*2;
  const minD=Math.min(0,d1,d2,d3),maxD=Math.max(0,d1,d2,d3);
  const pad=0.03;
  return{a0:a00+minD-pad,a1:a00+maxD+pad};
}
function owDrawCulledRing(cx2,cy2,r,rect){
  const range=owRingArcRange(cx2,cy2,r,rect);
  if(!range)return;
  cx.beginPath();
  if(range.full)cx.arc(cx2,cy2,r,0,Math.PI*2);
  else cx.arc(cx2,cy2,r,range.a0,range.a1);
  cx.stroke();
}
function drawOWOrbitGuides(camRect,s){
  const prof=owOrbitProfile(),arrowBodies=owOrbitBodies();
  const sysCx=OW_W/2,sysCy=OW_H/2;
  cx.save();cx.lineWidth=1;cx.globalAlpha=prof.orbitAlpha;cx.setLineDash([4,2]);
  for(const{col,r,b,cx:cx2,cy:cy2}of arrowBodies){
    const bp=owPos(b),bodyVisible=owPointInRect(bp.x,bp.y,camRect);
    const playerInBox=s.x>=cx2-r&&s.x<=cx2+r&&s.y>=cy2-r&&s.y<=cy2+r;
    if(!bodyVisible&&!playerInBox&&!owRectIntersectsAnnulus(camRect,cx2,cy2,r,12))continue;
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=sb(prof.orbitBlur);
    owDrawCulledRing(cx2,cy2,r,camRect);
  }
  if(AB.length>0){
    const abR=AB[0].orbitR;
    if(owRectIntersectsAnnulus(camRect,sysCx,sysCy,abR,24)){
      cx.strokeStyle='#998877';cx.shadowColor='#998877';cx.shadowBlur=sb(prof.orbitBlur);
      owDrawCulledRing(sysCx,sysCy,abR,camRect);
    }
  }
  cx.setLineDash([]);
  if(prof.arrows>0){
    const arrowSpd=0.00173,N=prof.arrows,arrowGap=renderQuality()==='full'?0.2:0.35;
    const chevR=prof.arrowSize+4;
    for(const{col,r,b,cx:cx2,cy:cy2,a:bodyA}of arrowBodies){
      const bp=owPos(b),bodyVisible=owPointInRect(bp.x,bp.y,camRect);
      const playerInBox=s.x>=cx2-r&&s.x<=cx2+r&&s.y>=cy2-r&&s.y<=cy2+r;
      if(!bodyVisible&&!playerInBox&&!owRectIntersectsAnnulus(camRect,cx2,cy2,r,12))continue;
      cx.shadowColor=col;cx.shadowBlur=sb(prof.arrowBlur);
      for(let i=0;i<N;i++){
        const phase=(G.fr*arrowSpd+i*Math.PI/N)%Math.PI;
        if(phase<arrowGap)continue;
        const fade=phase>Math.PI*.8?1-(phase-Math.PI*.8)/(Math.PI*.2):1;
        cx.globalAlpha=prof.arrowAlpha*fade;
        for(let di=0;di<2;di++){
          const dir=di?-1:1;
          const a=bodyA+Math.PI+dir*phase;
          const ax=cx2+Math.cos(a)*r,ay=cy2+Math.sin(a)*r;
          if(ax+chevR<camRect.x0||ax-chevR>camRect.x1||ay+chevR<camRect.y0||ay-chevR>camRect.y1)continue;
          drawOrbitChevron(ax,ay,a,dir,col,prof.arrowSize,prof.arrowWidth);
        }
      }
    }
  }
  cx.globalAlpha=1;cx.shadowBlur=0;cx.restore();
}
function drawOWAsteroidBelt(camRect){
  if(AB.length===0)return;
  let maxAbR=AB[0]._maxAbR;
  if(maxAbR==null){
    let m=0;for(let i=0;i<AB_BELT.length;i++){const p=AB_BELT[i],v=Math.abs(p.dr)+p.rv;if(v>m)m=v;}
    maxAbR=AB[0]._maxAbR=AB[0].orbitR+m;
  }
  if(!owRectIntersectsRect(camRect.x0,camRect.y0,camRect.x1,camRect.y1,OW_W/2-maxAbR,OW_H/2-maxAbR,OW_W/2+maxAbR,OW_H/2+maxAbR))return;
  const prof=owOrbitProfile();
  cx.save();cx.globalAlpha=prof.asteroidAlpha;cx.strokeStyle='#776655';cx.lineWidth=0.8;cx.shadowColor='#554433';cx.shadowBlur=sb(prof.asteroidBlur);
  const abOrbitR=AB[0].orbitR,abSpd=AB[0].orbitSpd,step=prof.asteroidStep,cxw=OW_W/2,cyw=OW_H/2;
  for(let pi=0;pi<AB_BELT.length;pi+=step){
    const p=AB_BELT[pi],a=p.a+G.owFr*abSpd;
    const bx=cxw+Math.cos(a)*(abOrbitR+p.dr),by=cyw+Math.sin(a)*(abOrbitR+p.dr);
    const pr=p.rv;
    if(bx+pr<camRect.x0||bx-pr>camRect.x1||by+pr<camRect.y0||by-pr>camRect.y1)continue;
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
  const camRect={x0:cam.x-OW_CULL_PAD,y0:cam.y-OW_CULL_PAD,x1:cam.x+W+OW_CULL_PAD,y1:cam.y+H+OW_CULL_PAD};
  const visPlanets=[],visAst=[],visFleets=[];
  let visBase=true,visHBase=true,visSlipgate=true;
  if(ow.spatial){
    const vis=spatialQueryRect(ow.spatial,camRect.x0,camRect.y0,camRect.x1,camRect.y1,ow._drawSpatial||(ow._drawSpatial=[]));
    visBase=false;visHBase=false;visSlipgate=false;
    for(let i=0;i<vis.length;i++){
      const v=vis[i];
      if(v.kind==='planet'){
        const pi=bodyIndexFromId(v.ref);
        if(Number.isInteger(pi)&&pi>=0&&pi<PP.length)visPlanets.push(pi);
        continue;
      }
      if(v.kind==='asteroid'){visAst.push(v.ref);continue;}
      if(v.kind==='fleet'){visFleets.push(v.ref);continue;}
      if(v.kind==='base'){visBase=true;continue;}
      if(v.kind==='hbase'){visHBase=true;continue;}
      if(v.kind==='slipgate')visSlipgate=true;
    }
    visPlanets.sort((a,b)=>a-b);
    visAst.sort((a,b)=>a-b);
  }else{
    for(let i=0;i<LV.length;i++)visPlanets.push(i);
    for(let ai=0;ai<AB.length;ai++)visAst.push(ai);
    for(let fi=0;fi<ow.fleets.length;fi++)visFleets.push(fi);
  }
  const dustV=dustVelocityForShip(s,cam);
  drDust(dustV.x,dustV.y,cam);
  cx.save();applyWorldCamera(cam);
  drawOWOrbitGuides(camRect,s);
  drawOWAsteroidBelt(camRect);
  {const sx2=OW_W/2,sy2=OW_H/2,SR=40,pu=.5+.5*Math.sin(G.fr*.04);
  cx.save();cx.translate(sx2,sy2);
  cx.shadowColor='#ffe070';cx.shadowBlur=sb(80+pu*60);
  if(!owStarGrad){
    owStarGrad=cx.createRadialGradient(0,0,0,0,0,SR);
    owStarGrad.addColorStop(0,'#ffffff');owStarGrad.addColorStop(0.5,'#fffbe8');
    owStarGrad.addColorStop(0.82,'#ffe87a');owStarGrad.addColorStop(1,'#ffcc40');
  }
  cx.fillStyle=owStarGrad;cx.beginPath();cx.arc(0,0,SR,0,Math.PI*2);cx.fill();
  cx.shadowBlur=0;
  cx.restore();}
  for(let pi=0;pi<visPlanets.length;pi++){
    const i=visPlanets[pi];
    const p=owPos(PP[i]),d=LV[i];
    if(G.cleared[bodyIdForPlanetIndex(i)]){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();cx.fillStyle='#223';cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();cx.fillStyle='#446';cx.font='bold 10px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText('cleared',p.x,p.y+3);cx.setLineDash([]);cx.restore();continue;}
    const pu=.5+.5*Math.sin(G.fr*.05+i);cx.save();cx.shadowColor=d.pcol;cx.shadowBlur=sb(8+pu*14);
    cx.strokeStyle=d.pcol;cx.lineWidth=1.5;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();
    cx.fillStyle=d.bg;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();
    cx.strokeStyle=d.col;cx.lineWidth=.8;cx.globalAlpha=.4;
    [[-8,-6,5],[7,4,7],[-4,9,4],[10,-8,3]].forEach(([cx2,cy,r])=>{cx.beginPath();cx.arc(p.x+cx2,p.y+cy,r,0,Math.PI*2);cx.stroke();});
    cx.globalAlpha=1;cx.restore();
    if(ow.nearBodyId===bodyIdForPlanetIndex(i)){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=sb(10);cx.font='bold 12px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText('[ fire to enter ]',p.x,p.y+d.pr+16);cx.restore();}
  }
  for(let aii=0;aii<visAst.length;aii++){const ai=visAst[aii],ap=owPos(AB[ai]);
    cx.save();cx.strokeStyle='#998877';cx.shadowColor='#776655';cx.shadowBlur=sb(5);cx.lineWidth=1.2;
    for(const[ox,oy,r2]of[[-14,-9,11],[9,-16,8],[16,6,10],[-9,13,9],[19,-5,7],[1,17,6],[-17,5,8],[8,11,7]]){
      cx.beginPath();
      for(let i=0;i<8;i++){const a2=(i/8)*Math.PI*2,rr=r2*(1+.2*Math.sin(a2*3+r2));
        i?cx.lineTo(ap.x+ox+Math.cos(a2)*rr,ap.y+oy+Math.sin(a2)*rr):cx.moveTo(ap.x+ox+Math.cos(a2)*rr,ap.y+oy+Math.sin(a2)*rr);}
      cx.closePath();cx.stroke();}
    cx.fillStyle='#998877';cx.font='bold 10px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText('asteroid field',ap.x,ap.y-40);
    cx.restore();
    if(ow.nearAst===ai){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=sb(10);cx.font='bold 12px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText('[ fire to enter ]',ap.x,ap.y+44);cx.restore();}}
  if(visHBase){const hbp=owPos(HBASE),HEX_R_OW=20;
  if(G.hbCleared){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW):cx.moveTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW);}cx.closePath();cx.stroke();cx.fillStyle='#446';cx.font='bold 10px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText('cleared',hbp.x,hbp.y+3);cx.setLineDash([]);cx.restore();}
  else{const pu=.5+.5*Math.sin(G.fr*.07);cx.save();cx.strokeStyle='#e05109';cx.shadowColor='#e05109';cx.shadowBlur=sb(6+pu*8);cx.lineWidth=1.5;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW):cx.moveTo(hbp.x+Math.cos(a)*HEX_R_OW,hbp.y+Math.sin(a)*HEX_R_OW);}cx.closePath();cx.stroke();cx.shadowBlur=0;cx.fillStyle='#e05109';cx.font='bold 10px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText('hostile base',hbp.x,hbp.y-HEX_R_OW-8);if(ow.nearHBase){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=sb(10);cx.font='bold 12px MajorMonoDisplay, monospace';cx.fillText('[ fire to enter ]',hbp.x,hbp.y+HEX_R_OW+16);}cx.restore();}}
  for(let fvi=0;fvi<visFleets.length;fvi++){const f=ow.fleets[visFleets[fvi]];if(f?.alive)drFleet(f);}
  for(const sh of (ow.owGunShots||[]))drOWOrbitalGunShot(sh);
  for(const f of ow.fu)drEnergy(f.x,f.y,'#0f8');
  drPts(ow.pts);
  if(visBase)drBase(ow.nearBase);
  if(visSlipgate)drSlipgate(ow.nearSlipgate);
  if(s.alive)drShip(s.x,s.y,s.a,s,iThrustInput(),s.energy,s.inv,G.fr);
  cx.restore();
  if(G.st==='overworld'&&s.alive){
    drawOffscreenIndicators(collectOffscreenIndicators({
      cam,player:s,worldW:OW_W,worldH:OW_H,maxRange:owIndicatorRange(),
      targets:owIndicatorTargets(ow)
    }));
  }
  drHUD(s.energy,s.maxEnergy,s.hp,s.maxHp,s);
  drawObjectivesPanel({layout:'planet',bodyId:ow.nearBodyId});
  if(G.slipMsg>0){
    const alpha=Math.min(1,G.slipMsg/40);
    const msgY=46;
    cx.save();cx.globalAlpha=alpha;
    cx.fillStyle='rgba(4,0,12,.82)';cx.fillRect(W/2-200,msgY,400,52);
    cx.strokeStyle='#cc99ff';cx.shadowColor='#cc99ff';cx.shadowBlur=sb(14);cx.lineWidth=1;cx.strokeRect(W/2-200,msgY,400,52);
    cx.fillStyle='#cc99ff';cx.font='bold 14px MajorMonoDisplay, monospace';cx.textAlign='center';cx.shadowBlur=sb(10);
    cx.fillText('slipgate activated',W/2,msgY+24);
    cx.shadowBlur=0;cx.fillStyle='#9977bb';cx.font='11px MajorMonoDisplay, monospace';
    cx.fillText('the slipgate is now open. find it at the outer rim.',W/2,msgY+46);
    cx.restore();
  }
}
