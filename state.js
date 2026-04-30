'use strict';

// Master game state. G.st drives the state machine — update() and draw() both branch on it so only one
// sub-system runs per frame. Active mode data lives in sub-objects: G.OW (overworld), G.ENC (encounter), G.site (site).
var G={st:'title',stake:0,credits:0,fr:0,owFr:0,lv:0,cleared:[false,false,false],hbCleared:false,hbState:null,lvState:{},slipgateActive:false,slipMsg:0,OW:null,ENC:null,site:null,paused:false,pauseSel:0,cheatSub:false,cheatSubSel:0,baseSel:0,baseTab:0,shopSel:0,shopActionId:null,shopActionSel:0,equipFlow:null,titleSel:0,optFrom:'title',optSel:0,sfxVol:7,musVol:7,dynamicZoom:true,renderQuality:'full',fps:60,frameMs:16.7,ctrlSel:0,optCol:0,optListen:null,seed:0,cheatMode:false,invincible:false,fullscreen:false,customSeed:null,seedInputOpen:false,slipSel:0,licenses:[],loadout:{chassis:'kestrel',weapons:['mass driver','pulse laser'],aux:null,shield:'shield_std'},visitedSeeds:[],tutorialDone:false,prevSeed:null,systemFlavor:null,menuSuppressUntil:0,systemStates:{},needsRebuild:false,lastLocation:null};
function openTitleMenu(){
  G.titleSel=0;
  G.paused=false;
  G.cheatSub=false;
  G.showShipConfig=false;
  G.st='title';
}
function openPauseMenu(){
  G.paused=true;
  G.pauseSel=0;
  G.cheatSub=false;
  G.cheatSubSel=0;
  G.showShipConfig=false;
}
function openOptionsMenu(from){
  G.optFrom=from;
  G.optSel=0;
  G.optListen=null;
  delete G.clearDataSel;
  G.st='options';
}
function openControlsMenu(){
  G.ctrlSel=0;
  G.optCol=0;
  G.optListen=null;
  G.st='controls';
}
function openBaseMenu(){
  G.baseSel=0;
  G.baseTab=0;
  G.shopSel=0;
  G.shopActionId=null;
  G.shopActionSel=0;
  G.equipFlow=null;
  fillShipEnergy(G.OW?.s);
  G.st='base';
}
function openSlipgateMenu(){
  G.slipSel=0;
  G.st='slipgate';
}
function openRebuildMenu(){
  G.rebuildFlow=null;
  G.paused=false;
  G.st='rebuild';
}
function addStake(n){G.stake+=n;}
function activeChassisObj(){return CHASSIS.find(c=>c.id===G.loadout.chassis)||CHASSIS[0];}
function activeAuxObj(){return AUX_ITEMS.find(a=>a.id===G.loadout.aux)||null;}
function activeShieldObj(){return SHIELDS.find(s=>s.id===G.loadout.shield)||null;}
function batteryDefById(id){return BATTERIES.find(b=>b.id===id)||null;}
function reactorDefById(id){return REACTORS.find(r=>r.id===id)||null;}
function batteryDefForChassis(ch){
  return batteryDefById(ch?.batteryId)||batteryDefById(CHASSIS[0]?.batteryId)||BATTERIES[0]||null;
}
function reactorDefForChassis(ch){
  return reactorDefById(ch?.reactorId)||reactorDefById(CHASSIS[0]?.reactorId)||REACTORS[0]||null;
}
function batteryCapacityForDef(def,fallback=100){
  const cap=def?.capacity;
  return Number.isFinite(cap)&&cap>0?cap:fallback;
}
function reactorRateForDef(def){
  const rate=def?.energyPerSec;
  return Number.isFinite(rate)&&rate>0?rate:0;
}
function chassisBatteryCapacity(ch){return batteryCapacityForDef(batteryDefForChassis(ch),ch?.maxEnergy??100);}
function chassisReactorRate(ch){return reactorRateForDef(reactorDefForChassis(ch));}
function wpSlot(n){const id=G.loadout.weapons[n];return id?WEAPONS.find(w=>w.id===id)||null:null;}
function isEquipped(id){return G.loadout.chassis===id||G.loadout.aux===id||G.loadout.shield===id||G.loadout.weapons.includes(id);}
function hasLicense(id){return G.licenses.includes(id);}
function slotMatchesWeapon(slot,wp){return wp.wpnType.startsWith(slot.type+' ');}
function licensedWeaponsForSlot(slot){return WEAPONS.filter(w=>slotMatchesWeapon(slot,w)&&hasLicense(w.id));}
function licensedWeaponIdsForSlot(slot){return licensedWeaponsForSlot(slot).map(w=>w.id);}
function compatibleSlots(wp){return activeChassisObj().slots.map((sl,i)=>({sl,i})).filter(({sl})=>slotMatchesWeapon(sl,wp));}
function thrustStatText(ch){
  const t=ch.thrust;
  const str=Math.max(t.strafeL||0,t.strafeR||0);
  return `FWD ${t.fwd}  REV ${t.rev}  STR ${str}`;
}
function statHas(obj,key){return obj&&obj[key]!==undefined&&obj[key]!==null;}
function statValue(v,suffix=''){return `${v}${suffix}`;}
function chassisStatsText(ch,opts={}){
  if(!ch)return '';
  const parts=[chassisHullStatsText(ch),thrustStatText(ch)];
  if(opts.rot!==false&&ch.thrust?.rotAccel!==undefined)parts.push(`ROT ${ch.thrust.rotAccel}`);
  if(opts.slots!==false&&Array.isArray(ch.slots))parts.push('SLOTS '+ch.slots.map(s=>s.type.toUpperCase()).join('+'));
  return parts.filter(Boolean).join('  ');
}
function chassisHullStatsText(ch){
  if(!ch)return '';
  return `HP ${ch.maxHp}  BAT ${chassisBatteryCapacity(ch)}  RCTR ${chassisReactorRate(ch)}/s`;
}
function chassisThrustStatsText(ch){
  if(!ch)return '';
  const parts=[thrustStatText(ch)];
  if(ch.thrust?.rotAccel!==undefined)parts.push(`ROT ${ch.thrust.rotAccel}`);
  return parts.join('  ');
}
function weaponStatsText(wp,opts={}){
  if(!wp)return '';
  const parts=[];
  if(opts.type!==false&&wp.wpnType)parts.push(`TYPE ${wp.wpnType.toUpperCase()}`);
  if(statHas(wp,'dmg'))parts.push(`DMG ${wp.dmg}`);
  if(statHas(wp,'expDmg')||statHas(wp,'expR'))parts.push(`BLAST ${wp.expDmg??0}@${wp.expR??0}`);
  if(statHas(wp,'cd'))parts.push(`CD ${statValue(wp.cd,'s')}`);
  if(statHas(wp,'range'))parts.push(`RANGE ${wp.range}`);
  if(statHas(wp,'spd'))parts.push(statHas(wp,'maxSpd')?`SPD ${wp.spd}-${wp.maxSpd}`:`SPD ${wp.spd}`);
  if(statHas(wp,'pulses')&&wp.pulses>1)parts.push(`PULSES ${wp.pulses}`);
  if(statHas(wp,'salvo')&&wp.salvo>1)parts.push(`SALVO ${wp.salvo}`);
  if(statHas(wp,'energyCost'))parts.push(`NRG ${wp.energyCost}`);
  if(statHas(wp,'chargeDelay'))parts.push(`CHG ${wp.chargeDelay}fr`);
  return parts.join('  ');
}
function shieldStatsText(sh){
  if(!sh)return '';
  const parts=[];
  if(statHas(sh,'hp'))parts.push(`HP ${sh.hp}`);
  if(statHas(sh,'coverageDeg'))parts.push(`ARC ${sh.coverageDeg}${String.fromCharCode(176)}`);
  if(statHas(sh,'rechargeRate'))parts.push(`RECH ${sh.rechargeRate}/fr`);
  if(statHas(sh,'rechargeDelay'))parts.push(`DELAY ${sh.rechargeDelay}fr`);
  if(statHas(sh,'energyPerHp'))parts.push(`COST ${sh.energyPerHp} NRG/HP`);
  return parts.join('  ');
}
function weaponLoadoutText(wp){
  if(!wp)return '(empty)';
  const parts=[wp.name||wp.id.toUpperCase()];
  if(statHas(wp,'dmg'))parts.push(`DMG ${wp.dmg}`);
  if(statHas(wp,'cd'))parts.push(`CD ${statValue(wp.cd,'s')}`);
  if(statHas(wp,'range'))parts.push(`RNG ${wp.range}`);
  return parts.join('  ');
}
function shieldLoadoutText(sh){
  if(!sh)return '(empty)';
  const parts=[sh.name];
  if(statHas(sh,'hp'))parts.push(`HP ${sh.hp}`);
  if(statHas(sh,'coverageDeg'))parts.push(`ARC ${sh.coverageDeg}${String.fromCharCode(176)}`);
  return parts.join('  ');
}
const ENERGY_PICKUP=38;
const ENERGY_BALANCE={
  thrustDrainPerFrame:{overworld:.035,encounter:.01,site:.012},
  thrustDrainMultiplier:{overworld:4,encounter:1,site:1},
  reactorRechargeMultiplier:{overworld:1.5,encounter:1,site:1},
};
const SHIELD_EMPTY_ENERGY_DRAIN=.5/60;
const SHIELD_FLASH_FRAMES=10;
const FALLBACK_SHIP_HIT_RADIUS=12;
function energyBalanceValue(group,mode,fallback=1){
  const v=ENERGY_BALANCE[group]?.[mode];
  return Number.isFinite(v)?v:fallback;
}
function thrustEnergyDrainForMode(mode){
  const base=energyBalanceValue('thrustDrainPerFrame',mode,0);
  return base*energyBalanceValue('thrustDrainMultiplier',mode,1);
}
function reactorRechargeMultiplierForMode(mode){
  return energyBalanceValue('reactorRechargeMultiplier',mode,1);
}
function chassisDefForShip(s){return CHASSIS.find(c=>c.id===s?.chassisId)||activeChassisObj();}
function batteryDefForShip(s){
  return batteryDefById(s?.batteryId)||batteryDefForChassis(chassisDefForShip(s));
}
function reactorDefForShip(s){
  return reactorDefById(s?.reactorId)||reactorDefForChassis(chassisDefForShip(s));
}
function shipBatteryCapacity(s){
  return batteryCapacityForDef(batteryDefForShip(s),s?.maxEnergy??chassisBatteryCapacity(chassisDefForShip(s)));
}
function shipReactorRate(s){return reactorRateForDef(reactorDefForShip(s));}
function syncShipEnergyProfile(s,opts={}){
  if(!s)return;
  const ch=chassisDefForShip(s);
  const bat=batteryDefForShip(s);
  const rx=reactorDefForShip(s);
  s.batteryId=bat?.id??ch?.batteryId??null;
  s.reactorId=rx?.id??ch?.reactorId??null;
  s.maxEnergy=shipBatteryCapacity(s);
  if(opts.fillEnergy||!Number.isFinite(s.energy))s.energy=s.maxEnergy;
  else s.energy=Math.max(0,Math.min(s.maxEnergy,s.energy));
}
function setShipEnergy(s,energy){
  syncShipEnergyProfile(s);
  s.energy=Number.isFinite(energy)?Math.max(0,Math.min(s.maxEnergy,energy)):s.maxEnergy;
}
function fillShipEnergy(s){syncShipEnergyProfile(s,{fillEnergy:true});}
function copyShipEnergyState(from,to){
  if(!to)return;
  if(from){
    to.batteryId=from.batteryId??to.batteryId;
    to.reactorId=from.reactorId??to.reactorId;
    setShipEnergy(to,from.energy);
  }else syncShipEnergyProfile(to);
}
function tickShipReactor(s,mode=null){
  if(!s||!s.alive)return 0;
  syncShipEnergyProfile(s);
  if(s.energy>=s.maxEnergy)return 0;
  const add=Math.min(s.maxEnergy-s.energy,(shipReactorRate(s)/60)*reactorRechargeMultiplierForMode(mode));
  if(add<=0)return 0;
  s.energy+=add;
  return add;
}
function shipHitRadius(s){
  const r=chassisDefForShip(s)?.hitRadius??FALLBACK_SHIP_HIT_RADIUS;
  return Number.isFinite(r)&&r>0?r:FALLBACK_SHIP_HIT_RADIUS;
}
function shipShieldHitRadius(s,def=shieldDefForShip(s)){
  const fallbackScale=1.42;
  const scale=def?.radiusScale??fallbackScale;
  return shipHitRadius(s)*(Number.isFinite(scale)&&scale>0?scale:fallbackScale);
}
function pickupEnergy(s,x,y,pts,col){syncShipEnergyProfile(s);s.energy=Math.min(s.maxEnergy,s.energy+ENERGY_PICKUP);tone(660,.15,'sine',.08);boomAt(pts,x,y,col,8);}
function drainEnergy(s,amount){syncShipEnergyProfile(s);if(s.energy>0)s.energy=Math.max(0,s.energy-amount);}
// Particle system: boomAt() spawns n particles in random directions; updPts() advances and culls them each frame.
// drPts() fades each particle using its remaining lifetime ratio (p.l / p.ml) as the alpha value.
function boomAt(pts,x,y,c,n=14){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.7+Math.random()*3;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:22+Math.random()*28,ml:50,c});}}
function updPts(pts,gy=0){for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=gy;p.l--;if(p.l<=0)pts.splice(i,1);}}
function shieldDefForShip(s){return SHIELDS.find(sh=>sh.id===s?.shieldId)||activeShieldObj();}
function wholeShieldHp(hp,maxHp){
  const max=Math.max(0,Math.floor(maxHp||0));
  const value=Number.isFinite(hp)?hp:max;
  return Math.max(0,Math.min(max,Math.floor(value)));
}
function shieldProgress(value){return Number.isFinite(value)?Math.max(0,value):0;}
function resetShipShield(s, def=activeShieldObj()){
  if(!s)return;
  s.shieldId=def?.id??null;
  s.shieldMaxHp=wholeShieldHp(def?.hp??0,def?.hp??0);
  s.shieldHp=s.shieldMaxHp;
  s.shieldRechargeProgress=0;
  s.shieldDrainProgress=0;
  s.shieldRechargeTimer=0;
  s.shieldEnabled=true;
  s.shieldOffline=false;
  s.shieldFlash=0;
}
function copyShieldState(from,to){
  if(!from||!to){return;}
  to.shieldId=('shieldId' in from)?from.shieldId:(activeShieldObj()?.id??null);
  to.shieldMaxHp=wholeShieldHp(from.shieldMaxHp??shieldDefForShip(from)?.hp??0,from.shieldMaxHp??shieldDefForShip(from)?.hp??0);
  to.shieldHp=wholeShieldHp(from.shieldHp??to.shieldMaxHp,to.shieldMaxHp);
  to.shieldRechargeProgress=shieldProgress(from.shieldRechargeProgress);
  to.shieldDrainProgress=shieldProgress(from.shieldDrainProgress);
  to.shieldRechargeTimer=from.shieldRechargeTimer??0;
  to.shieldEnabled=from.shieldEnabled!==false;
  to.shieldOffline=!!from.shieldOffline;
  to.shieldFlash=from.shieldFlash??0;
  refreshShieldOffline(to);
}
function refreshShieldOffline(s){
  const def=shieldDefForShip(s);
  if(!def||!s.shieldId){s.shieldOffline=false;return;}
  s.shieldMaxHp=wholeShieldHp(def.hp,def.hp);
  s.shieldHp=wholeShieldHp(s.shieldHp??s.shieldMaxHp,s.shieldMaxHp);
  s.shieldRechargeProgress=shieldProgress(s.shieldRechargeProgress);
  s.shieldDrainProgress=shieldProgress(s.shieldDrainProgress);
  if(s.shieldHp>=s.shieldMaxHp)s.shieldRechargeProgress=0;
  if(s.shieldHp<=0)s.shieldDrainProgress=0;
  if(s.shieldHp<=0)s.shieldOffline=true;
  const threshold=s.shieldMaxHp*(def.reactivateAt??0.5);
  if(s.shieldOffline&&s.shieldHp>=threshold)s.shieldOffline=false;
}
function rechargeShieldFromEnergy(s,force=false){
  const def=shieldDefForShip(s);
  if(!def||s.shieldEnabled===false||!s.shieldId)return 0;
  refreshShieldOffline(s);
  if(s.shieldHp>=s.shieldMaxHp||s.energy<=0)return 0;
  const missing=s.shieldMaxHp-s.shieldHp;
  const room=Math.max(0,missing-s.shieldRechargeProgress);
  const want=force?room:Math.min(def.rechargeRate??0,room);
  const cost=Math.max(0.0001,def.energyPerHp??5);
  const progress=Math.max(0,Math.min(want,s.energy/cost));
  if(progress<=0)return 0;
  s.shieldRechargeProgress+=progress;
  s.energy=Math.max(0,s.energy-progress*cost);
  const add=Math.min(missing,Math.floor(s.shieldRechargeProgress+1e-9));
  if(add>0){
    s.shieldHp=Math.min(s.shieldMaxHp,s.shieldHp+add);
    s.shieldRechargeProgress=Math.max(0,s.shieldRechargeProgress-add);
  }
  refreshShieldOffline(s);
  return add;
}
function drainShieldWithoutEnergy(s){
  if(s.energy>0||s.shieldHp<=0)return 0;
  s.shieldDrainProgress+=SHIELD_EMPTY_ENERGY_DRAIN;
  const drain=Math.min(s.shieldHp,Math.floor(s.shieldDrainProgress+1e-9));
  if(drain<=0)return 0;
  s.shieldHp-=drain;
  s.shieldDrainProgress=Math.max(0,s.shieldDrainProgress-drain);
  refreshShieldOffline(s);
  return drain;
}
function tickShieldRecharge(s){
  if(s?.shieldFlash>0)s.shieldFlash--;
  const def=shieldDefForShip(s);
  if(!def||s.shieldEnabled===false||!s.shieldId)return;
  refreshShieldOffline(s);
  if(s.energy<=0){drainShieldWithoutEnergy(s);return;}
  if(s.shieldHp>=s.shieldMaxHp)return;
  if(s.shieldRechargeTimer>0){s.shieldRechargeTimer--;return;}
  rechargeShieldFromEnergy(s,false);
}
function toggleShipShield(s){
  if(!s||!s.shieldId)return;
  s.shieldEnabled=s.shieldEnabled===false;
  tone(s.shieldEnabled?900:300,.08,'square',.05);
}
function shieldCoversSource(s,source,def){
  if(!def||!source)return true;
  if((def.coverageDeg??360)>=359.9)return true;
  const dx=source.x-s.x,dy=source.y-s.y;
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||(dx===0&&dy===0))return true;
  const sourceA=Math.atan2(dx,-dy);
  return Math.abs(angDiff(s.a,sourceA))<=(def.coverageDeg*Math.PI/180)/2;
}
function shieldAllowsDamage(def,opts){
  const kinds=def.blocksKinds;
  return !Array.isArray(kinds)||kinds.includes(opts?.kind);
}
function shipShieldCanTakeHit(s,opts={}){
  const def=shieldDefForShip(s);
  return !!(def&&s?.shieldId&&s.shieldEnabled!==false&&!s.shieldOffline&&s.shieldHp>0&&shieldAllowsDamage(def,opts)&&shieldCoversSource(s,opts.source,def));
}
function applyShipShieldDamage(s,amount,opts={}){
  const dmg=Math.max(0,amount||0);
  if(!s||dmg<=0)return{shieldDamage:0,passthroughDamage:0,blocked:false,shieldBroken:false};
  if(G.invincible)return{shieldDamage:0,passthroughDamage:0,blocked:true,shieldBroken:false};
  let passthroughDamage=dmg,shieldDamage=0,shieldBroken=false;
  const def=shieldDefForShip(s);
  if(shipShieldCanTakeHit(s,opts)){
    const shieldHp=wholeShieldHp(s.shieldHp,def?.hp??0);
    s.shieldHp=shieldHp;
    shieldDamage=Math.min(shieldHp,dmg);
    s.shieldHp=Math.max(0,s.shieldHp-shieldDamage);
    s.shieldRechargeProgress=0;
    s.shieldDrainProgress=0;
    s.shieldFlash=SHIELD_FLASH_FRAMES;
    s.shieldRechargeTimer=def.rechargeDelay??300;
    passthroughDamage=dmg-shieldDamage;
    if(s.shieldHp<=0){s.shieldHp=0;s.shieldOffline=true;shieldBroken=shieldHp>0;}
  }
  return{shieldDamage,passthroughDamage,blocked:shieldDamage>0&&passthroughDamage<=0,shieldBroken};
}
function applyShipDamage(s,amount,opts={}){
  const dmg=Math.max(0,amount||0);
  if(!s||dmg<=0||G.invincible)return{shieldDamage:0,hullDamage:0,blocked:false};
  const shieldHit=applyShipShieldDamage(s,dmg,opts);
  const hullDamage=shieldHit.passthroughDamage;
  if(hullDamage>0)s.hp=Math.max(0,s.hp-hullDamage);
  return{shieldDamage:shieldHit.shieldDamage,hullDamage,blocked:shieldHit.blocked,shieldBroken:shieldHit.shieldBroken};
}
function shipDamageTone(hit,hullFreq=380,hullDur=.08,hullType='square',hullVol=.08){
  if(hit?.shieldDamage>0)tone(760,.05,'sine',.05);
  if(hit?.hullDamage>0)tone(hullFreq,hullDur,hullType,hullVol);
}
function mkShip(x,y){
  const ch=activeChassisObj(),sh=activeShieldObj();
  const s={x,y,chassisId:ch.id,batteryId:ch.batteryId??null,reactorId:ch.reactorId??null,vx:0,vy:0,va:0,a:0,energy:0,maxEnergy:0,alive:true,inv:120,scd:0,scd2:0,hp:ch.maxHp,maxHp:ch.maxHp,pulsesLeft:0,pulseTimer:0,pulsesLeft2:0,pulseTimer2:0,misLeft:0,misTimer:0,misLeft2:0,misTimer2:0};
  fillShipEnergy(s);
  resetShipShield(s,sh);
  return s;
}
function stopShipMotion(s){
  if(!s)return;
  s.vx=0;s.vy=0;s.va=0;
}
function returnToOverworld(opts={}){
  if(!opts.keepVelocity)stopShipMotion(G.OW?.s);
  G.st='overworld';
}
function markNeedsRebuild(){G.needsRebuild=true;saveGame();}
function enterRebuild(){
  G.needsRebuild=true;
  openRebuildMenu();
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
function beamHitPadding(wp){return wp?.beamHitPadding??Math.max(2,(wp?.beamWidth??2)*.5);}
function beamMotionPadding(o){return Math.min(4,Math.hypot(o?.vx||0,o?.vy||0));}
function laserTargetRadius(tg,basePad=0){return tg.r+(tg.beamPad||0)+basePad;}
// Ray-cast laser: marches a ray from (ox,oy) in direction a, finding the nearest target or wall segment.
// Returns endpoint (x2,y2) and hitIdx: a target array index (>=0) or -1 if a wall stopped the ray first.
function castLaser(ox,oy,a,range,targets,walls=[],hitPad=0){const rdx=Math.sin(a),rdy=-Math.cos(a),ex=ox+rdx*range,ey=oy+rdy*range;let bestT=range,hitIdx=-1;for(let i=0;i<targets.length;i++){const tg=targets[i];if(dseg(tg.x,tg.y,ox,oy,ex,ey)<=laserTargetRadius(tg,hitPad)){const t=(tg.x-ox)*rdx+(tg.y-oy)*rdy;if(t>0&&t<bestT){bestT=t;hitIdx=i;}}}for(const[x1,y1,x2,y2]of walls){const dx=x2-x1,dy=y2-y1,det=dx*rdy-dy*rdx;if(Math.abs(det)<1e-9)continue;const t=(dx*(y1-oy)-dy*(x1-ox))/det,u=(rdx*(y1-oy)-rdy*(x1-ox))/det;if(t>0&&t<bestT&&u>=0&&u<=1){bestT=t;hitIdx=-1;}}return{x2:ox+rdx*bestT,y2:oy+rdy*bestT,hitIdx};}
function castLaserForSpace(ox,oy,a,range,targets,walls=[],space=null,hitPad=0){
  if(!space?.toroidal)return castLaser(ox,oy,a,range,targets,walls,hitPad);
  const rdx=Math.sin(a),rdy=-Math.cos(a),ex=ox+rdx*range,ey=oy+rdy*range;
  let bestT=range,hitIdx=-1;
  for(let i=0;i<targets.length;i++){
    const tg=targets[i];
    for(let kx=-1;kx<=1;kx++)for(let ky=-1;ky<=1;ky++){
      const tx=tg.x+kx*space.worldW,ty=tg.y+ky*space.worldH;
      if(dseg(tx,ty,ox,oy,ex,ey)<=laserTargetRadius(tg,hitPad)){
        const t=(tx-ox)*rdx+(ty-oy)*rdy;
        if(t>0&&t<bestT){bestT=t;hitIdx=i;}
      }
    }
  }
  return{x2:ox+rdx*bestT,y2:oy+rdy*bestT,hitIdx};
}

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
  G.loadout=sv?{chassis:sv.loadout?.chassis??def.loadout.chassis,weapons:[...(sv.loadout?.weapons??def.loadout.weapons)],aux:sv.loadout?.aux??def.loadout.aux,shield:sv.loadout&&('shield' in sv.loadout)?sv.loadout.shield:def.loadout.shield}:{...def.loadout,weapons:[...def.loadout.weapons]};
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
  const maxEnergy=chassisBatteryCapacity(ch);
  const energy=sv?.currentEnergy!=null?Math.min(sv.currentEnergy,maxEnergy):maxEnergy;
  const fallbackKind=(sv&&G.seed!==TUTORIAL_SEED)?'slipgate':'base';
  const fallback=fallbackKind==='slipgate'?owPos(SLIPGATE):owPos(BASE);
  const savedLoc=!hadCustomSeed?normalizeLastLocation(sv?.lastLocation):null;
  const savedSp=spawnPointForLastLocation(savedLoc);
  const sp=savedSp||fallback;
  if(savedSp)G.lastLocation=savedLoc;
  else recordLastLocation(fallbackKind);
  initOW(energy,sp.x,sp.y);
  if(sv?.currentHp!=null)G.OW.s.hp=Math.min(sv.currentHp,G.OW.s.maxHp);
  if(sv?.currentShieldHp!=null)G.OW.s.shieldHp=wholeShieldHp(sv.currentShieldHp,G.OW.s.shieldMaxHp);
  G.OW.s.shieldRechargeProgress=shieldProgress(sv?.currentShieldRechargeProgress);
  G.OW.s.shieldDrainProgress=shieldProgress(sv?.currentShieldDrainProgress);
  if(typeof sv?.currentShieldEnabled==='boolean')G.OW.s.shieldEnabled=sv.currentShieldEnabled;
  if(typeof sv?.currentShieldOffline==='boolean')G.OW.s.shieldOffline=sv.currentShieldOffline;
  refreshShieldOffline(G.OW.s);
  if(!G.visitedSeeds.includes(G.seed))G.visitedSeeds.push(G.seed);
  if(G.needsRebuild){G.ENC=null;G.site=null;openRebuildMenu();}
  saveGame();
}

// Apply rotation input + inertial dampening to a ship in place.
// rotIn: -1, 0, or 1 (or analog stick value in [-1, 1]).
// energyEmpty: true when ship.energy <= 0.
function applyRotation(s, rotIn, energyEmpty){
  const ch = chassisDefForShip(s);
  const accel = Math.max(0,(ch.thrust.rotAccel||0) * (energyEmpty ? 0.5 : 1));
  const maxV  = Math.max(0,ch.thrust.rotMax||0);
  const input = Number.isFinite(rotIn) ? Math.max(-1,Math.min(1,rotIn)) : 0;
  if(!Number.isFinite(s.va))s.va=0;
  const targetVa = input * maxV;
  const delta = targetVa - s.va;
  if(delta !== 0){
    const step = Math.min(Math.abs(delta), accel);
    s.va += Math.sign(delta) * step;
  }
  if(s.va >  maxV) s.va =  maxV;
  if(s.va < -maxV) s.va = -maxV;
  s.a += s.va;
}

// Apply local-axis thrust to a ship in place. Forward/reverse and strafe are additive, so diagonal
// thrust gives more acceleration and costs more energy in the callers.
function applyShipThrust(s, thrustIn, energyEmpty){
  if(!thrustIn || thrustIn.activeAxes<=0) return;
  const ch = chassisDefForShip(s);
  const energyMul = energyEmpty ? 0.2 : 1;
  const linear = Number.isFinite(thrustIn.linear) ? Math.max(-1,Math.min(1,thrustIn.linear)) : 0;
  const strafe = Number.isFinite(thrustIn.strafe) ? Math.max(-1,Math.min(1,thrustIn.strafe)) : 0;
  if(linear!==0){
    const base = linear > 0 ? ch.thrust.fwd : ch.thrust.rev;
    if(base>0){
      const power = base * Math.abs(linear) * energyMul * Math.sign(linear);
      s.vx += Math.sin(s.a) * power;
      s.vy -= Math.cos(s.a) * power;
    }
  }
  if(strafe!==0){
    const base = strafe < 0 ? ch.thrust.strafeL : ch.thrust.strafeR;
    if(base>0){
      const power = base * Math.abs(strafe) * energyMul * Math.sign(strafe);
      s.vx += Math.cos(s.a) * power;
      s.vy += Math.sin(s.a) * power;
    }
  }
}
function thrustEnergyScale(thrustIn){
  if(!thrustIn)return 0;
  return (thrustIn.linear!==0?1:0)+(thrustIn.strafe!==0?1:0);
}
