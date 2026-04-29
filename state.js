'use strict';

// Master game state. G.st drives the state machine — update() and draw() both branch on it so only one
// sub-system runs per frame. Active mode data lives in sub-objects: G.OW (overworld), G.ENC (encounter), G.site (site).
var G={st:'title',stake:0,credits:0,fr:0,owFr:0,lv:0,cleared:[false,false,false],hbCleared:false,hbState:null,lvState:{},slipgateActive:false,slipMsg:0,OW:null,ENC:null,site:null,paused:false,pauseSel:0,cheatSub:false,cheatSubSel:0,baseSel:0,baseTab:0,shopSel:0,shopActionId:null,shopActionSel:0,equipFlow:null,titleSel:0,optFrom:'title',optSel:0,sfxVol:10,musVol:10,dynamicZoom:true,ctrlSel:0,optCol:0,optListen:null,seed:0,cheatMode:false,invincible:false,fullscreen:false,customSeed:null,seedInputOpen:false,slipSel:0,licenses:[],loadout:{chassis:'kestrel',weapons:['mass driver','pulse laser'],aux:'shield_std'},visitedSeeds:[],tutorialDone:false,prevSeed:null,systemFlavor:null,menuSuppressUntil:0,systemStates:{},needsRebuild:false,lastLocation:null};
function addStake(n){G.stake+=n;}
function activeChassisObj(){return CHASSIS.find(c=>c.id===G.loadout.chassis)||CHASSIS[0];}
function activeAuxObj(){return AUX_ITEMS.find(a=>a.id===G.loadout.aux)||null;}
function wpSlot(n){const id=G.loadout.weapons[n];return id?WEAPONS.find(w=>w.id===id)||null:null;}
function isEquipped(id){return G.loadout.chassis===id||G.loadout.aux===id||G.loadout.weapons.includes(id);}
function hasLicense(id){return G.licenses.includes(id);}
function slotMatchesWeapon(slot,wp){return wp.wpnType.startsWith(slot.type+' ');}
function licensedWeaponsForSlot(slot){return WEAPONS.filter(w=>slotMatchesWeapon(slot,w)&&hasLicense(w.id));}
function licensedWeaponIdsForSlot(slot){return licensedWeaponsForSlot(slot).map(w=>w.id);}
function compatibleSlots(wp){return activeChassisObj().slots.map((sl,i)=>({sl,i})).filter(({sl})=>slotMatchesWeapon(sl,wp));}
const ENERGY_PICKUP=38;
function pickupEnergy(s,x,y,pts,col){s.energy=Math.min(s.maxEnergy,s.energy+ENERGY_PICKUP);tone(660,.15,'sine',.08);boomAt(pts,x,y,col,8);}
// Particle system: boomAt() spawns n particles in random directions; updPts() advances and culls them each frame.
// drPts() fades each particle using its remaining lifetime ratio (p.l / p.ml) as the alpha value.
function boomAt(pts,x,y,c,n=14){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.7+Math.random()*3;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:22+Math.random()*28,ml:50,c});}}
function updPts(pts,gy=0){for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=gy;p.l--;if(p.l<=0)pts.splice(i,1);}}
function mkShip(x,y){const ch=activeChassisObj();return{x,y,vx:0,vy:0,va:0,a:0,energy:ch.maxEnergy,maxEnergy:ch.maxEnergy,alive:true,inv:120,scd:0,scd2:0,shld:false,hp:ch.maxHp,maxHp:ch.maxHp,pulsesLeft:0,pulseTimer:0,pulsesLeft2:0,pulseTimer2:0,misLeft:0,misTimer:0,misLeft2:0,misTimer2:0};}
function stopShipMotion(s){
  if(!s)return;
  s.vx=0;s.vy=0;s.va=0;s.shld=false;
}
function returnToOverworld(opts={}){
  if(!opts.keepVelocity)stopShipMotion(G.OW?.s);
  G.st='overworld';
}
function markNeedsRebuild(){G.needsRebuild=true;saveGame();}
function enterRebuild(){
  G.needsRebuild=true;
  G.rebuildFlow=null;
  G.paused=false;
  G.st='rebuild';
  saveGame();
}
function killShip(s,pts,deadState,orangeCount=16){
  if(!s.alive)return false;
  s.alive=false;boomAt(pts,s.x,s.y,'#fff',28);boomAt(pts,s.x,s.y,'#fa0',orangeCount);
  tone(200,.5,'sawtooth',.15);
  G.st=deadState;markNeedsRebuild();
  setTimeout(()=>{enterRebuild();},1800);
  return true;
}
// Ray-cast laser: marches a ray from (ox,oy) in direction a, finding the nearest target or wall segment.
// Returns endpoint (x2,y2) and hitIdx: a target array index (>=0) or -1 if a wall stopped the ray first.
function castLaser(ox,oy,a,range,targets,walls=[]){const rdx=Math.sin(a),rdy=-Math.cos(a),ex=ox+rdx*range,ey=oy+rdy*range;let bestT=range,hitIdx=-1;for(let i=0;i<targets.length;i++){const tg=targets[i];if(dseg(tg.x,tg.y,ox,oy,ex,ey)<tg.r){const t=(tg.x-ox)*rdx+(tg.y-oy)*rdy;if(t>0&&t<bestT){bestT=t;hitIdx=i;}}}for(const[x1,y1,x2,y2]of walls){const dx=x2-x1,dy=y2-y1,det=dx*rdy-dy*rdx;if(Math.abs(det)<1e-9)continue;const t=(dx*(y1-oy)-dy*(x1-ox))/det,u=(rdx*(y1-oy)-rdy*(x1-ox))/det;if(t>0&&t<bestT&&u>=0&&u<=1){bestT=t;hitIdx=-1;}}return{x2:ox+rdx*bestT,y2:oy+rdy*bestT,hitIdx};}

function owPos(b){const a=b.orbitA+G.owFr*b.orbitSpd;return{x:OW_W/2+Math.cos(a)*b.orbitR,y:OW_H/2+Math.sin(a)*b.orbitR};}
function recordLastLocation(kind,index=null){
  G.lastLocation=normalizeLastLocation({seed:G.seed,kind,index});
}
function spawnOutsideBody(body,radius){
  const p=owPos(body),dx=p.x-OW_W/2,dy=p.y-OW_H/2,len=Math.hypot(dx,dy)||1;
  const pad=(radius||0)+55;
  return{
    x:Math.max(40,Math.min(OW_W-40,p.x+dx/len*pad)),
    y:Math.max(40,Math.min(OW_H-40,p.y+dy/len*pad))
  };
}
function spawnPointForLastLocation(loc){
  loc=normalizeLastLocation(loc);
  if(!loc||loc.seed!==(G.seed>>>0))return null;
  if(loc.kind==='base')return owPos(BASE);
  if(loc.kind==='slipgate')return owPos(SLIPGATE);
  if(loc.kind==='planet'){
    if(!PP[loc.index]||!LV[loc.index])return null;
    return spawnOutsideBody(PP[loc.index],LV[loc.index].pr);
  }
  if(loc.kind==='asteroid'){
    if(!AB[loc.index])return null;
    return spawnOutsideBody(AB[loc.index],AB[loc.index].r);
  }
  if(loc.kind==='hbase'&&HBASE)return spawnOutsideBody(HBASE,HBASE.r);
  return null;
}

function startFromSave(){
  const sv=loadSave(),def=defaultSave();
  const hadCustomSeed=G.customSeed!==null;
  G.licenses=sv?[...(sv.licenses??def.licenses)]:[...def.licenses];
  G.loadout=sv?{chassis:sv.loadout?.chassis??def.loadout.chassis,weapons:[...(sv.loadout?.weapons??def.loadout.weapons)],aux:sv.loadout?.aux??def.loadout.aux}:{...def.loadout,weapons:[...def.loadout.weapons]};
  G.visitedSeeds=sv?[...(sv.visitedSeeds??[])]:[];
  G.credits=sv?.credits??0;
  G.stake=0;
  G.cleared=sv?[...(sv.cleared??[false,false,false])]:[false,false,false];
  G.hbCleared=sv?.hbCleared??false;
  G.hbState=sv?.hbState??null;
  G.lvState=sv?.lvState??{};
  G.slipgateActive=sv?.slipgateActive??false;
  G.slipMsg=0;
  G.tutorialDone=sv?.tutorialDone??false;
  G.prevSeed=sv?.prevSeed??null;
  G.systemStates=sv?.systemStates??{};
  G.needsRebuild=!!sv?.needsRebuild;
  G.lastLocation=null;
  // Treat any pre-existing non-tutorial run as having left the tutorial.
  if(sv&&sv.seed!==TUTORIAL_SEED&&!G.tutorialDone)G.tutorialDone=true;
  if(G.customSeed!==null){G.seed=G.customSeed;G.customSeed=null;}
  else if(sv?.seed){G.seed=sv.seed;}
  else{G.seed=TUTORIAL_SEED;}
  genWorld(G.seed);
  const ch=activeChassisObj();
  const energy=sv?.currentEnergy!=null?Math.min(sv.currentEnergy,ch.maxEnergy):ch.maxEnergy;
  const fallbackKind=(sv&&G.seed!==TUTORIAL_SEED)?'slipgate':'base';
  const fallback=fallbackKind==='slipgate'?owPos(SLIPGATE):owPos(BASE);
  const savedLoc=!hadCustomSeed?normalizeLastLocation(sv?.lastLocation):null;
  const savedSp=spawnPointForLastLocation(savedLoc);
  const sp=savedSp||fallback;
  if(savedSp)G.lastLocation=savedLoc;
  else recordLastLocation(fallbackKind);
  initOW(energy,sp.x,sp.y);
  if(sv?.currentHp!=null)G.OW.s.hp=Math.min(sv.currentHp,G.OW.s.maxHp);
  if(!G.visitedSeeds.includes(G.seed))G.visitedSeeds.push(G.seed);
  if(G.needsRebuild){G.rebuildFlow=null;G.paused=false;G.ENC=null;G.site=null;G.st='rebuild';}
  saveGame();
}

// Apply rotation input + inertial dampening to a ship in place.
// rotIn: -1, 0, or 1 (or analog stick value in [-1, 1]).
// energyEmpty: true when ship.energy <= 0.
function applyRotation(s, rotIn, energyEmpty){
  const ch = activeChassisObj();
  const accel = ch.thrust.rotAccel * (energyEmpty ? 0.5 : 1);
  const maxV  = ch.thrust.rotMax;
  if(rotIn !== 0){
    s.va += rotIn * accel;
  } else if(s.va !== 0){
    // Inertial dampening: clamp brake at |va| so we settle on 0 instead of overshooting into reverse spin.
    const brake = Math.min(Math.abs(s.va), accel);
    s.va -= Math.sign(s.va) * brake;
  }
  if(s.va >  maxV) s.va =  maxV;
  if(s.va < -maxV) s.va = -maxV;
  s.a += s.va;
}

// Apply linear forward/reverse thrust to a ship in place.
// thrIn: -1 (reverse), 0, or 1 (forward); accepts analog values too.
// energyEmpty: true when ship.energy <= 0. Caller owns energy-cost deduction (per-mode rates differ).
function applyLinearThrust(s, thrIn, energyEmpty){
  if(thrIn === 0) return;
  const ch = activeChassisObj();
  const base = thrIn > 0 ? ch.thrust.fwd : ch.thrust.rev;
  if(base <= 0) return; // chassis has no reverse capability
  const power = base * (energyEmpty ? 0.2 : 1);
  const dir = Math.sign(thrIn);
  s.vx += Math.sin(s.a) * power * dir;
  s.vy -= Math.cos(s.a) * power * dir;
}
