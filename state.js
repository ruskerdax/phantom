'use strict';

// Master game state. G.st drives the state machine — update() and draw() both branch on it so only one
// sub-system runs per frame. Active mode data lives in sub-objects: G.OW (overworld), G.ENC (encounter), G.site (site).
var G={st:'title',bounty:0,credits:0,fr:0,owFr:0,lv:0,cleared:[false,false,false],hbCleared:false,hbState:null,lvState:{},slipgateActive:false,slipMsg:0,OW:null,ENC:null,site:null,paused:false,pauseSel:0,cheatSub:false,cheatSubSel:0,baseSel:0,baseTab:0,shopSel:0,shopActionId:null,shopActionSel:0,equipFlow:null,titleSel:0,optFrom:'title',optSel:0,sfxVol:10,musVol:10,ctrlSel:0,optCol:0,optListen:null,seed:0,cheatMode:false,invincible:false,fullscreen:false,customSeed:null,seedInputOpen:false,slipSel:0,licenses:[],loadout:{chassis:'kestrel',weapons:['mass driver','laser cannon'],aux:'shield_std'},visitedSeeds:[],tutorialDone:false,prevSeed:null,systemFlavor:null,menuSuppressUntil:0,systemStates:{}};
function addBounty(n){G.bounty+=n;}
function activeChassisObj(){return CHASSIS.find(c=>c.id===G.loadout.chassis)||CHASSIS[0];}
function activeAuxObj(){return AUX_ITEMS.find(a=>a.id===G.loadout.aux)||null;}
function wpSlot(n){const id=G.loadout.weapons[n];return id?WEAPONS.find(w=>w.id===id)||null:null;}
function isEquipped(id){return G.loadout.chassis===id||G.loadout.aux===id||G.loadout.weapons.includes(id);}
function hasLicense(id){return G.licenses.includes(id);}
function slotMatchesWeapon(slot,wp){return wp.wpnType===slot.type+' gun';}
function compatibleSlots(wp){return activeChassisObj().slots.map((sl,i)=>({sl,i})).filter(({sl})=>slotMatchesWeapon(sl,wp));}
const ENERGY_PICKUP=38;
function pickupEnergy(s,x,y,pts,col){s.energy=Math.min(s.maxEnergy,s.energy+ENERGY_PICKUP);tone(660,.15,'sine',.08);boomAt(pts,x,y,col,8);}
// Particle system: boomAt() spawns n particles in random directions; updPts() advances and culls them each frame.
// drPts() fades each particle using its remaining lifetime ratio (p.l / p.ml) as the alpha value.
function boomAt(pts,x,y,c,n=14){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.7+Math.random()*3;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:22+Math.random()*28,ml:50,c});}}
function updPts(pts,gy=0){for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=gy;p.l--;if(p.l<=0)pts.splice(i,1);}}
function mkShip(x,y){const ch=activeChassisObj();return{x,y,vx:0,vy:0,a:0,energy:ch.maxEnergy,maxEnergy:ch.maxEnergy,alive:true,inv:120,scd:0,scd2:0,shld:false,hp:ch.maxHp,maxHp:ch.maxHp,pulsesLeft:0,pulseTimer:0,pulsesLeft2:0,pulseTimer2:0};}
// Ray-cast laser: marches a ray from (ox,oy) in direction a, finding the nearest target or wall segment.
// Returns endpoint (x2,y2) and hitIdx: a target array index (>=0) or -1 if a wall stopped the ray first.
function castLaser(ox,oy,a,range,targets,walls=[]){const rdx=Math.sin(a),rdy=-Math.cos(a),ex=ox+rdx*range,ey=oy+rdy*range;let bestT=range,hitIdx=-1;for(let i=0;i<targets.length;i++){const tg=targets[i];if(dseg(tg.x,tg.y,ox,oy,ex,ey)<tg.r){const t=(tg.x-ox)*rdx+(tg.y-oy)*rdy;if(t>0&&t<bestT){bestT=t;hitIdx=i;}}}for(const[x1,y1,x2,y2]of walls){const dx=x2-x1,dy=y2-y1,det=dx*rdy-dy*rdx;if(Math.abs(det)<1e-9)continue;const t=(dx*(y1-oy)-dy*(x1-ox))/det,u=(rdx*(y1-oy)-rdy*(x1-ox))/det;if(t>0&&t<bestT&&u>=0&&u<=1){bestT=t;hitIdx=-1;}}return{x2:ox+rdx*bestT,y2:oy+rdy*bestT,hitIdx};}

function owPos(b){const a=b.orbitA+G.owFr*b.orbitSpd;return{x:OW_W/2+Math.cos(a)*b.orbitR,y:OW_H/2+Math.sin(a)*b.orbitR};}

function startFromSave(){
  const sv=loadSave(),def=defaultSave();
  G.licenses=sv?[...(sv.licenses??def.licenses)]:[...def.licenses];
  G.loadout=sv?{chassis:sv.loadout?.chassis??def.loadout.chassis,weapons:[...(sv.loadout?.weapons??def.loadout.weapons)],aux:sv.loadout?.aux??def.loadout.aux}:{...def.loadout,weapons:[...def.loadout.weapons]};
  G.visitedSeeds=sv?[...(sv.visitedSeeds??[])]:[];
  G.credits=sv?.credits??0;
  G.bounty=0;
  G.cleared=sv?[...(sv.cleared??[false,false,false])]:[false,false,false];
  G.hbCleared=sv?.hbCleared??false;
  G.hbState=sv?.hbState??null;
  G.lvState=sv?.lvState??{};
  G.slipgateActive=sv?.slipgateActive??false;
  G.slipMsg=0;
  G.tutorialDone=sv?.tutorialDone??false;
  G.prevSeed=sv?.prevSeed??null;
  G.systemStates=sv?.systemStates??{};
  // Treat any pre-existing non-tutorial run as having left the tutorial.
  if(sv&&sv.seed!==TUTORIAL_SEED&&!G.tutorialDone)G.tutorialDone=true;
  if(G.customSeed!==null){G.seed=G.customSeed;G.customSeed=null;}
  else if(sv?.seed){G.seed=sv.seed;}
  else{G.seed=TUTORIAL_SEED;}
  genWorld(G.seed);
  const ch=activeChassisObj();
  const energy=sv?.currentEnergy!=null?Math.min(sv.currentEnergy,ch.maxEnergy):ch.maxEnergy;
  const sp=(sv&&G.seed!==TUTORIAL_SEED)?owPos(SLIPGATE):owPos(BASE);
  initOW(energy,sp.x,sp.y);
  if(sv?.currentHp!=null)G.OW.s.hp=Math.min(sv.currentHp,G.OW.s.maxHp);
  if(!G.visitedSeeds.includes(G.seed))G.visitedSeeds.push(G.seed);
  saveGame();
}
