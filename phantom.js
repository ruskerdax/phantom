'use strict';

// Canvas
const CV=document.getElementById('g'),cx=CV.getContext('2d');
CV.width=W;CV.height=H;

// Audio
let AC=null;
function ia(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
function tone(f,d,t='square',v=.07){if(!AC)return;const sv=(G?G.sfxVol/10:1);if(sv===0)return;try{const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type=t;o.frequency.setValueAtTime(f,AC.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(10,f*.3),AC.currentTime+d);g.gain.setValueAtTime(v*sv,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.start();o.stop(AC.currentTime+d+.05)}catch(e){}}

// Keyboard
const K={};
document.addEventListener('keydown',e=>{
  if(!K[e.code])ia();K[e.code]=true;K[e.code+'j']=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyI'].includes(e.code))e.preventDefault();
  if(G&&G.optListen==='key'){
    const blocked=['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','Tab','Escape'];
    if(e.code==='Escape'){G.optListen=null;}
    else if(!blocked.includes(e.code)){BND[ACT_DEFS[G.ctrlSel].id].key=e.code;saveBND();G.optListen=null;}
    e.preventDefault();
  }
},{passive:false});
document.addEventListener('keyup',e=>K[e.code]=false);
CV.addEventListener('click',()=>ia());
function jp(c){const v=K[c+'j'];K[c+'j']=false;return!!v;}

// Action bindings
const ACT_DEFS=[
  {id:'rotLeft', label:'ROTATE LEFT',  defKey:'KeyA',      defBtn:14},
  {id:'rotRight',label:'ROTATE RIGHT', defKey:'KeyD',      defBtn:15},
  {id:'thrust',  label:'THRUST',       defKey:'KeyW',      defBtn:0},
  {id:'fire',    label:'FIRE',         defKey:'KeyJ',      defBtn:2},
  {id:'fireSec', label:'FIRE SECONDARY',defKey:'KeyO',     defBtn:3},
  {id:'shield',  label:'SHIELD',       defKey:'KeyI',      defBtn:4},
  {id:'pause',   label:'PAUSE',        defKey:'Escape',    defBtn:9},
];
let BND={};ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});
try{const s=localStorage.getItem('phantom_bnd');if(s){const p=JSON.parse(s);Object.keys(p).forEach(k=>{if(BND[k])BND[k]=p[k];});}}catch(e){}
function saveBND(){try{localStorage.setItem('phantom_bnd',JSON.stringify(BND));}catch(e){}}
function fmtKey(c){return({ArrowLeft:'◄ LEFT',ArrowRight:'► RIGHT',ArrowUp:'▲ UP',ArrowDown:'▼ DOWN',Space:'SPACE',ShiftLeft:'L-SHIFT',ShiftRight:'R-SHIFT',Enter:'ENTER',Escape:'ESC',KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyQ:'Q',KeyE:'E',KeyR:'R',KeyF:'F',KeyJ:'J',KeyI:'I',KeyZ:'Z',KeyX:'X',KeyC:'C',ControlLeft:'L-CTRL',AltLeft:'L-ALT',Tab:'TAB'})[c]||c.replace('Key','').replace('Digit','');}
function fmtBtn(i){const n=['A','B','X','Y','LB','RB','LT','RT','SEL','START','L3','R3','↑','↓','◄','►'];return n[i]!==undefined?n[i]:'BTN'+i;}

// Gamepad
let GP={connected:false,id:'',axL:0,thrust:false,fire:false,fireSec:false,shield:false,startj:false,menuUp:false,menuDown:false,menuLeft:false,menuRight:false,thrustj:false};
let _gfh=false,_gfsh=false,_gsh=false,_gmuh=false,_gmdh=false,_gmlh=false,_gmrh=false,_gtjh=false,_gprev=[];
window.addEventListener('gamepadconnected',e=>{GP.connected=true;GP.id=e.gamepad.id;ia();tone(660,.2,'sine',.08);});
window.addEventListener('gamepaddisconnected',()=>{GP.connected=false;GP.id='';});
function bpressed(bt,i){return!!(bt[i]&&(bt[i].pressed||bt[i].value>.3));}
function pollGP(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;
  for(const p of pads){if(p&&p.connected){gp=p;GP.connected=true;GP.id=p.id.slice(0,36);break;}}
  if(!gp){GP.axL=0;GP.thrust=false;GP.fire=false;GP.fireSec=false;GP.shield=false;GP.startj=false;GP.menuUp=false;GP.menuDown=false;GP.menuLeft=false;GP.menuRight=false;GP.thrustj=false;_gprev=[];return;}
  const ax=gp.axes,bt=gp.buttons,dead=.18;
  if(G&&G.optListen==='btn'){
    for(let i=0;i<bt.length;i++){
      if(bpressed(bt,i)&&!_gprev[i]){BND[ACT_DEFS[G.optSel].id].btn=i;saveBND();G.optListen=null;break;}
    }
  }
  _gprev=bt.map(b=>!!(b&&(b.pressed||b.value>.3)));
  const lx=Math.abs(ax[0])>dead?ax[0]:0;
  const ly=ax[1]||0;
  const dL=bpressed(bt,BND.rotLeft.btn),dR=bpressed(bt,BND.rotRight.btn);
  GP.axL=dL?-1:dR?1:lx;
  const dU=bpressed(bt,12),rt=bt[7]?bt[7].value||+bt[7].pressed:0;
  const thrBtn=bpressed(bt,BND.thrust.btn);
  GP.thrust=rt>.3||dU||thrBtn;
  GP.shield=bpressed(bt,BND.shield.btn);
  const fn=bpressed(bt,BND.fire.btn);GP.fire=fn&&!_gfh;_gfh=fn;
  const fsn=bpressed(bt,BND.fireSec.btn);GP.fireSec=fsn&&!_gfsh;_gfsh=fsn;
  const sn=bpressed(bt,BND.pause.btn);GP.startj=sn&&!_gsh;_gsh=sn;
  const mu=dU||(ly<-.5);GP.menuUp=mu&&!_gmuh;_gmuh=mu;
  const dD=bpressed(bt,13);
  const md=dD||(ly>.5);GP.menuDown=md&&!_gmdh;_gmdh=md;
  const ml=dL||(lx<-.5);GP.menuLeft=ml&&!_gmlh;_gmlh=ml;
  const mr=dR||(lx>.5);GP.menuRight=mr&&!_gmrh;_gmrh=mr;
  const tj=thrBtn;GP.thrustj=tj&&!_gtjh;_gtjh=tj;
}
function kdown(id){return!!K[BND[id].key];}
function kjust(id){return jp(BND[id].key);}
function iRot(){return kdown('rotLeft')?-1:kdown('rotRight')?1:GP.axL;}
function iThr(){return!!(kdown('thrust')||GP.thrust);}
function iShd(f){return f>0&&!!(kdown('shield')||GP.shield);}
function iFir(){return!!(kjust('fire')||GP.fire);}
function iFireSec(){return!!(kjust('fireSec')||GP.fireSec);}
function iEnter(){return!!(jp('Enter')||jp('NumpadEnter')||GP.startj);}
function iPause(){return!!(kjust('pause')||GP.startj);}

// Static starfield
const STARS=(()=>{const a=[];for(let i=0;i<220;i++)a.push({x:Math.random()*W,y:Math.random()*H,r:.3+Math.random()*1.4,ph:Math.random()*Math.PI*2,ci:i%5});return a;})();
const SCOLS=['#ffffff','#aaaaff','#ffeebb','#aaffee','#ffaaaa'];
// Motion dust — screen-space parallax particles, drift opposite player velocity
const DUST=(()=>{const a=[];for(let i=0;i<140;i++)a.push({x:Math.random()*W,y:Math.random()*H,r:.4+Math.random()*1.6,depth:.15+Math.random()*.7});return a;})();

// Cave geometry — uses LV from gen.js, dseg/pip from util.js
function wHit(x,y,r,li){if(y<0)return false;const d=LV[li],t=d.terrain;for(let i=0;i<t.length-1;i++)if(dseg(x,y,t[i][0],t[i][1],t[i+1][0],t[i+1][1])<r)return true;if(!pip(x,y,t))return true;for(const o of d.obs){if(pip(x,y,o))return true;for(let i=0;i<o.length;i++){const j=(i+1)%o.length;if(dseg(x,y,o[i][0],o[i][1],o[j][0],o[j][1])<r)return true;}}return false;}

// Game state
let G={st:'title',bounty:0,credits:0,fr:0,owFr:0,lv:0,cleared:[false,false,false],hbCleared:false,hbState:null,slipgateActive:false,slipMsg:0,OW:null,ENC:null,CV:null,paused:false,pauseSel:0,baseSel:0,titleSel:0,optFrom:'title',optSel:0,sfxVol:10,musVol:10,ctrlSel:0,optCol:0,optListen:null,seed:0,cheatMode:false};
function addBounty(n){G.bounty+=n;}
const PLAYER_SHIP={maxHp:15,maxEnergy:100};
const ENERGY_PICKUP=38;
function pickupEnergy(s,x,y,pts,col){s.energy=Math.min(s.maxEnergy,s.energy+ENERGY_PICKUP);tone(660,.15,'sine',.08);boomAt(pts,x,y,col,8);}
function boomAt(pts,x,y,c,n=14){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.7+Math.random()*3;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:22+Math.random()*28,ml:50,c});}}
function updPts(pts,gy=0){for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=gy;p.l--;if(p.l<=0)pts.splice(i,1);}}
function mkShip(x,y){return{x,y,vx:0,vy:0,a:0,energy:PLAYER_SHIP.maxEnergy,maxEnergy:PLAYER_SHIP.maxEnergy,alive:true,inv:120,scd:0,scd2:0,shld:false,hp:PLAYER_SHIP.maxHp,maxHp:PLAYER_SHIP.maxHp,pulsesLeft:0,pulseTimer:0,pulsesLeft2:0,pulseTimer2:0};}
function castLaser(ox,oy,a,range,targets){const rdx=Math.sin(a),rdy=-Math.cos(a),ex=ox+rdx*range,ey=oy+rdy*range;let bestT=range,hitIdx=-1;for(let i=0;i<targets.length;i++){const tg=targets[i];if(dseg(tg.x,tg.y,ox,oy,ex,ey)<tg.r){const t=(tg.x-ox)*rdx+(tg.y-oy)*rdy;if(t>0&&t<bestT){bestT=t;hitIdx=i;}}}return{x2:ox+rdx*bestT,y2:oy+rdy*bestT,hitIdx};}
let playerWeapon=WEAPONS[0];
let secondaryWeapon=WEAPONS[2];

function owPos(b){const a=b.orbitA+G.owFr*b.orbitSpd;return{x:OW_W/2+Math.cos(a)*b.orbitR,y:OW_H/2+Math.sin(a)*b.orbitR};}

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
function initOW(energy,sx,sy){
  const bp=owPos(BASE);
  const px=sx??bp.x,py=sy??bp.y;
  G.OW={s:mkShip(px,py),en:[owEnemyPos(0,px,py),owEnemyPos(1,px,py),owEnemyPos(2,px,py)],fu:[],pts:[],nearP:-1,nearBase:false,nearAst:-1};
  G.OW.s.energy=energy??G.OW.s.maxEnergy;G.OW.s.inv=120;
  G.st='overworld';
}
function owKillShip(){
  const ow=G.OW,s=ow.s;if(!s.alive)return;
  s.alive=false;boomAt(ow.pts,s.x,s.y,'#fff',28);boomAt(ow.pts,s.x,s.y,'#fa0',16);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_ow';
  setTimeout(()=>{G.st='rebuild';},1800);
}
function doRebuild(){
  const bp=owPos(BASE);
  if(G.credits>=2500)G.credits-=2500;
  G.bounty=0;
  G.ENC=null;G.CV=null;
  if(!G.OW){initOW(100);return;}
  G.OW.s=mkShip(bp.x,bp.y);
  G.OW.s.inv=180;
  G.st='overworld';
}
function doJump(){
  const energy=G.OW.s.energy;
  G.seed=(Math.random()*0xFFFFFFFF)>>>0;
  G.cleared=[false,false,false];G.lvState={};G.hbCleared=false;G.hbState=null;
  G.bounty=0;G.slipgateActive=false;G.slipMsg=0;
  genWorld(G.seed);
  const sgp=owPos(SLIPGATE);
  initOW(energy,sgp.x,sgp.y);
  tone(300,.15,'sine',.07);setTimeout(()=>tone(500,.15,'sine',.07),160);setTimeout(()=>tone(800,.4,'sine',.07),330);
}
function owStartEnc(idx){
  const ow=G.OW,e=ow.en[idx],et=OET[e.t],ec=et.enc;
  const ens=[];
  if(ec.groups){
    const spawns=[];
    for(const grp of ec.groups){
      if(grp.chance!==undefined&&Math.random()>grp.chance)continue;
      spawns.push(grp);
    }
    const total=spawns.reduce((s,g)=>s+g.cnt,0);
    let ei=0;
    for(const sp of spawns){
      const gec=OET[sp.t].enc,initCd=Math.round(WEAPONS[gec.fire.wpn].cd*60);
      for(let i=0;i<sp.cnt;i++){
        const x=total===1?EW-160:EW-200+Math.cos((ei/total)*Math.PI*2)*60;
        const y=total===1?EH/2+(Math.random()*80-40):EH/2+Math.sin((ei/total)*Math.PI*2)*60;
        ens.push({x,y,vx:0,vy:0,a:Math.PI,hp:gec.hp,mhp:gec.hp,timer:initCd+ei*18,alive:true,t:sp.t,spin:0,pulsesLeft:0,pulseTimer:0});
        ei++;
      }
    }
  } else {
    const initCd=Math.round(WEAPONS[ec.fire.wpn].cd*60);
    if(ec.cnt===1){
      ens.push({x:EW-160,y:EH/2+(Math.random()*80-40),vx:0,vy:0,a:Math.PI,hp:ec.hp,mhp:ec.hp,timer:initCd,alive:true,t:e.t,spin:0,pulsesLeft:0,pulseTimer:0});
    } else {
      for(let i=0;i<ec.cnt;i++){const a=(i/ec.cnt)*Math.PI*2;ens.push({x:EW-200+Math.cos(a)*60,y:EH/2+Math.sin(a)*60,vx:0,vy:0,a:Math.PI,hp:ec.hp,mhp:ec.hp,timer:initCd+i*18,alive:true,t:e.t,spin:0,pulsesLeft:0,pulseTimer:0});}
    }
  }
  const rng=mkRNG(seedChild(G.seed,200+idx));
  const rocks=[];
  let rockCount=0;for(let i=0;i<8;i++)if(rng.fl(0,1)<.25)rockCount++;
  const spawnX=EW*.08,spawnY=EH/2,minSpawnDist=120;
  const tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  for(let i=0;i<rockCount;i++){
    let rx,ry,attempts=0;
    do{rx=rng.fl(60,EW-60);ry=rng.fl(60,EH-60);attempts++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&attempts<30);
    const tier=rng.int(0,2);const td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:rng.fl(-.55,.55),vy:rng.fl(-.55,.55),r:td.r[0]+rng.fl(0,td.r[1]),hp:td.hp,maxHp:td.hp,tier});
  }
  const encShip=mkShip(EW*.08,EH/2);encShip.energy=ow.s.energy;encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  const label=ec.groups?et.name+' ENCOUNTER':(ec.cnt>1?'SWARM ATTACK':et.name+' ENCOUNTER');
  G.ENC={owIdx:idx,et:e.t,label,
    s:encShip,en:ens,rocks,bul:[],ebu:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew:EW,eh:EH,cam:{x:0,y:Math.max(0,EH/2-H/2)}};
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
  const ens=[];
  const saucerEc=OET[0].enc,initCd=Math.round(WEAPONS[saucerEc.fire.wpn].cd*60);
  for(let i=0;i<3;i++){
    if(Math.random()<.35){
      const a=(i/3)*Math.PI*2;
      ens.push({x:EW-200+Math.cos(a)*60,y:EH/2+Math.sin(a)*60,vx:0,vy:0,a:Math.PI,hp:saucerEc.hp,mhp:saucerEc.hp,timer:initCd+i*18,alive:true,t:0,spin:0,pulsesLeft:0,pulseTimer:0});
    }
  }
  const encShip=mkShip(spawnX,spawnY);encShip.energy=ow.s.energy;encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  G.ENC={owIdx:null,isAst:true,et:0,label:'ASTEROID FIELD',
    s:encShip,en:ens,rocks,bul:[],ebu:[],fu:[],pts:[],lsb:[],introTimer:ens.length?70:0,cleared:!ens.length,
    ew:EW,eh:EH,cam:{x:0,y:Math.max(0,EH/2-H/2)}};
  G.st=ens.length?'enc_in':'encounter';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function startHBaseEnc(){
  const ow=G.OW,ew=EW*2,eh=EH*2,HEX_R=150,hx=ew/2,hy=eh/2;
  const hbs=G.hbState;
  const softpts=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3+Math.PI/6,d=HEX_R*Math.sqrt(3)/2;
    return{x:hx+Math.cos(a)*d,y:hy+Math.sin(a)*d,hp:1,alive:hbs?hbs.softpts[i]:true};
  });
  const initCd=Math.round(WEAPONS[0].cd*60);
  const turrets=Array.from({length:6},(_,i)=>{
    const a=i*Math.PI/3;
    return{x:hx+Math.cos(a)*HEX_R,y:hy+Math.sin(a)*HEX_R,a:a,timer:initCd+i*22,alive:hbs?hbs.turrets[i]:true};
  });
  const hexPoly=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return[hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R];});
  const encShip=mkShip(ew*.08,eh/2);encShip.energy=ow.s.energy;encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  G.ENC={owIdx:null,isHBase:true,et:0,label:'HOSTILE BASE',
    s:encShip,en:[],rocks:[],bul:[],ebu:[],fu:[],pts:[],lsb:[],introTimer:70,cleared:false,
    ew,eh,hbase:{HEX_R,hx,hy,softpts,turrets,hexPoly},
    cam:{x:Math.max(0,hx-W/2),y:Math.max(0,hy-H/2)}};
  G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function updOW(){
  G.owFr++;if(G.slipMsg>0)G.slipMsg--;const ow=G.OW;updPts(ow.pts);
  for(let i=ow.fu.length-1;i>=0;i--){const f=ow.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,OW_W);f.y=wrap(f.y+f.vy,OW_H);if(Math.hypot(ow.s.x-f.x,ow.s.y-f.y)<20&&ow.s.alive){pickupEnergy(ow.s,f.x,f.y,ow.pts,'#0f8');ow.fu.splice(i,1);}}
  const s=ow.s;if(!s.alive)return;
  s.a+=iRot()*(s.energy>0?.075:.0375);s.shld=false;
  if(iThr()){const thr=s.energy>0?.09:.01;s.vx+=Math.sin(s.a)*thr;s.vy-=Math.cos(s.a)*thr;if(s.energy>0)s.energy=Math.max(0,s.energy-.07);}
  {const sdx=OW_W/2-s.x,sdy=OW_H/2-s.y,sdist=Math.hypot(sdx,sdy)||1;
  const maxSpd=sdist<220?7:4.2;
  const sp=Math.hypot(s.vx,s.vy);if(sp>maxSpd){s.vx=s.vx/sp*maxSpd;s.vy=s.vy/sp*maxSpd;}}
  {const bz=600;
  if(s.x<bz&&s.vx<0)s.vx*=s.x/bz;
  if(s.x>OW_W-bz&&s.vx>0)s.vx*=(OW_W-s.x)/bz;
  if(s.y<bz&&s.vy<0)s.vy*=s.y/bz;
  if(s.y>OW_H-bz&&s.vy>0)s.vy*=(OW_H-s.y)/bz;}
  s.x=Math.max(0,Math.min(OW_W,s.x+s.vx));s.y=Math.max(0,Math.min(OW_H,s.y+s.vy));
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  {const sdx=OW_W/2-s.x,sdy=OW_H/2-s.y,sdist=Math.hypot(sdx,sdy)||1;
  if(sdist<22){owKillShip();return;}
  s.vx+=sdx*500/(sdist*sdist*sdist);s.vy+=sdy*500/(sdist*sdist*sdist);}
  const bp=owPos(BASE);ow.nearBase=Math.hypot(s.x-bp.x,s.y-bp.y)<BASE.r+28;
  if(iFir()&&ow.nearBase){G.credits+=G.bounty;G.bounty=0;G.baseSel=0;G.st='base';return;}
  ow.nearP=-1;
  for(let i=0;i<LV.length;i++){if(G.cleared[i])continue;const pp=owPos(PP[i]);if(Math.hypot(s.x-pp.x,s.y-pp.y)<LV[i].pr+28){ow.nearP=i;break;}}
  if(iFir()&&ow.nearP>=0){G.lv=ow.nearP;enterLv();return;}
  ow.nearAst=-1;
  for(let ai=0;ai<2;ai++){const ap=owPos(AB[ai]);if(Math.hypot(s.x-ap.x,s.y-ap.y)<AB[ai].r+28){ow.nearAst=ai;break;}}
  if(iFir()&&ow.nearAst>=0){startAstEnc();return;}
  ow.nearHBase=false;
  if(!G.hbCleared){const hbp=owPos(HBASE);if(Math.hypot(s.x-hbp.x,s.y-hbp.y)<HBASE.r+28)ow.nearHBase=true;}
  if(iFir()&&ow.nearHBase){startHBaseEnc();return;}
  {const sgp=owPos(SLIPGATE);ow.nearSlipgate=Math.hypot(s.x-sgp.x,s.y-sgp.y)<SLIPGATE.r+28;}
  if(iFir()&&ow.nearSlipgate){G.st='slipgate';return;}
  for(let i=0;i<ow.en.length;i++){
    const e=ow.en[i];if(!e.alive)continue;
    const et=OET[e.t];e.spin+=.04+e.t*.015;
    const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1;
    const ta=Math.atan2(dx,-dy);
    e.a+=angDiff(e.a,ta)*.07;
    e.vx+=Math.sin(e.a)*et.owSpd*.05;e.vy-=Math.cos(e.a)*et.owSpd*.05;
    e.vx*=.970;e.vy*=.970;const es=Math.hypot(e.vx,e.vy);if(es>et.owSpd){e.vx=e.vx/es*et.owSpd;e.vy=e.vy/es*et.owSpd;}
    e.x=wrap(e.x+e.vx,OW_W);e.y=wrap(e.y+e.vy,OW_H);
    if(e.flash>0)e.flash--;
    if(s.inv<=0&&dist<et.trigR){
      if(s.shld){e.vx-=(dx/dist)*3;e.vy-=(dy/dist)*3;e.flash=12;}
      else{owStartEnc(i);return;}
    }
  }
}

// ===================== ENCOUNTER =====================
function encKillShip(){
  const enc=G.ENC,s=enc.s;if(!s.alive)return;
  s.alive=false;boomAt(enc.pts,s.x,s.y,'#fff',28);boomAt(enc.pts,s.x,s.y,'#fa0',16);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_enc';
  setTimeout(()=>{G.st='rebuild';},1800);
}
function encWin(){
  const enc=G.ENC,ow=G.OW;
  if(enc.isHBase){G.hbCleared=true;G.hbState=null;}
  if(enc.owIdx!=null)ow.en[enc.owIdx].alive=false;
  ow.s.energy=enc.s.energy;
  ow.s.hp=enc.s.hp;ow.s.maxHp=enc.s.maxHp;
  ow.s.vx+=(Math.random()-.5)*1.2;ow.s.vy+=(Math.random()-.5)*1.2;
  ow.s.inv=80;
  G.ENC=null;G.st='overworld';
  tone(660,.12,'sine',.09);setTimeout(()=>tone(880,.25,'sine',.09),140);
}
function splitRock(enc,ri){
  const rk=enc.rocks[ri];
  enc.rocks.splice(ri,1);
  boomAt(enc.pts,rk.x,rk.y,'#889',rk.tier===2?14:8);
  tone(160+rk.tier*60,.2,'sawtooth',.09);
  if(rk.tier<2){
    for(let k=0;k<2;k++){
      const ang=Math.random()*Math.PI*2+k*Math.PI;
      const spd=.7+Math.random()*.9;
      const nt=rk.tier+1;
      enc.rocks.push({
        x:rk.x+Math.cos(ang)*rk.r*.5, y:rk.y+Math.sin(ang)*rk.r*.5,
        vx:rk.vx+Math.cos(ang)*spd, vy:rk.vy+Math.sin(ang)*spd,
        r:nt===1?17+Math.random()*5:9+Math.random()*4,
        hp:nt===1?9:3, maxHp:nt===1?9:3, tier:nt
      });
    }
  }
  if(Math.random()<.05){const a=Math.random()*Math.PI*2;enc.fu.push({x:rk.x,y:rk.y,vx:Math.cos(a)*1.0,vy:Math.sin(a)*1.0,timer:380});}
}
function updEnc(){
  const enc=G.ENC;if(enc.introTimer>0){enc.introTimer--;return;}
  updPts(enc.pts);for(let i=enc.lsb.length-1;i>=0;i--){if(--enc.lsb[i].l<=0)enc.lsb.splice(i,1);}
  const s=enc.s;if(!s.alive)return;
  const{ew,eh}=enc;
  for(let i=enc.fu.length-1;i>=0;i--){const f=enc.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,ew);f.y=wrap(f.y+f.vy,eh);if(Math.hypot(s.x-f.x,s.y-f.y)<18){pickupEnergy(s,f.x,f.y,enc.pts,'#0f8');enc.fu.splice(i,1);}}
  s.a+=iRot()*(s.energy>0?.065:.0325);s.shld=iShd(s.energy);
  if(s.shld)s.energy=Math.max(0,s.energy-.15);
  if(iThr()&&!s.shld){const thr=s.energy>0?.12:.013;s.vx+=Math.sin(s.a)*thr;s.vy-=Math.cos(s.a)*thr;if(s.energy>0)s.energy=Math.max(0,s.energy-.08);}
  const sp=Math.hypot(s.vx,s.vy);if(sp>5){s.vx=s.vx/sp*5;s.vy=s.vy/sp*5;}
  if(enc.cleared){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){encWin();return;}}
  else if(enc.isHBase){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){G.hbState={turrets:enc.hbase.turrets.map(t=>t.alive),softpts:enc.hbase.softpts.map(sp=>sp.alive)};const ow=G.OW;ow.s.energy=s.energy;ow.s.hp=s.hp;ow.s.maxHp=s.maxHp;ow.s.vx+=(Math.random()-.5)*1.5;ow.s.vy+=(Math.random()-.5)*1.5;ow.s.inv=80;G.ENC=null;G.st='overworld';return;}}
  else{s.x=wrap(s.x+s.vx,ew);s.y=wrap(s.y+s.vy,eh);}
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  enc.cam.x+=(Math.max(0,Math.min(ew-W,s.x-W*.5))-enc.cam.x)*.12;
  enc.cam.y+=(Math.max(0,Math.min(eh-H,s.y-H*.5))-enc.cam.y)*.12;
  for(const rk of enc.rocks){rk.x=wrap(rk.x+rk.vx,ew);rk.y=wrap(rk.y+rk.vy,eh);}
  for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(s.inv<=0&&Math.hypot(s.x-rk.x,s.y-rk.y)<rk.r+7){
    const spd=Math.hypot(s.vx,s.vy);
    const rd=Math.hypot(s.x-rk.x,s.y-rk.y)||1;const nx=(s.x-rk.x)/rd;const ny=(s.y-rk.y)/rd;
    const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.x+=nx*10;s.y+=ny*10;
    const dmg=Math.round((spd/5.5)*5);
    if(!s.shld&&dmg>0){s.hp=Math.max(0,s.hp-dmg);s.inv=40;tone(180,.15,'sawtooth',.12);}
    if(dmg>0){rk.hp-=dmg;boomAt(enc.pts,rk.x,rk.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);}
    if(s.hp<=0){encKillShip();return;}break;
  }}
  if(enc.isHBase){const{hexPoly,hx,hy}=enc.hbase;let hbHit=pip(s.x,s.y,hexPoly);if(!hbHit){for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;if(dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1])<7){hbHit=true;break;}}}if(hbHit){let best=Infinity,nx=0,ny=0;for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;const dist=dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1]);if(dist<best){best=dist;const dx=hexPoly[j][0]-hexPoly[i][0],dy=hexPoly[j][1]-hexPoly[i][1],len=Math.hypot(dx,dy)||1;nx=-dy/len;ny=dx/len;if(nx*(s.x-hx)+ny*(s.y-hy)<0){nx=-nx;ny=-ny;}}}const spd=Math.hypot(s.vx,s.vy);const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.x+=nx*10;s.y+=ny*10;const dmg=Math.round((spd/5.5)*5);if(!s.shld&&s.inv<=0&&dmg>0){s.hp=Math.max(0,s.hp-dmg);s.inv=40;tone(180,.15,'sawtooth',.12);}if(s.hp<=0){encKillShip();return;}}}
  {const wp=playerWeapon;
  if(wp.type==='laser'&&s.pulsesLeft>0&&--s.pulseTimer<=0){const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;const tgts=[];enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));enc.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:OET[e.t].enc.r,kind:'enemy',idx:i});});if(enc.isHBase){enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({x:t.x,y:t.y,r:10,kind:'turret',idx:i});});enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});}const res=castLaser(ox,oy,s.a,wp.range,tgts);enc.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:'#0cf'});tone(1200,.08,'sine',.05);if(res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='rock'){const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);if(rk.hp<=0)splitRock(enc,tg.idx);}else if(tg.kind==='enemy'){const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,OET[e.t].enc.col,3);if(e.hp<=0){e.alive=false;addBounty(OET[e.t].sc);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col,14);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col2,8);tone(200,.3,'sawtooth',.1);if(OET[e.t].energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}}else if(tg.kind==='turret'){const t=enc.hbase.turrets[tg.idx];t.alive=false;addBounty(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}else if(tg.kind==='softpt'){enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);}}s.pulsesLeft--;if(s.pulsesLeft>0)s.pulseTimer=wp.pulseCd;else s.scd=Math.round(wp.cd*60);}
  if(iFir()&&!s.shld&&!s.scd&&!s.pulsesLeft){if(wp.type==='laser'){s.pulsesLeft=wp.pulses;s.pulseTimer=1;}else{enc.bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life*wp.spd,dmg:wp.dmg});s.scd=Math.round(wp.cd*60);tone(900,.04,'square',.05);}}}
  {const wp=secondaryWeapon;
  if(wp.type==='laser'&&s.pulsesLeft2>0&&--s.pulseTimer2<=0){const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;const tgts=[];enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));enc.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:OET[e.t].enc.r,kind:'enemy',idx:i});});if(enc.isHBase){enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({x:t.x,y:t.y,r:10,kind:'turret',idx:i});});enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});}const res=castLaser(ox,oy,s.a,wp.range,tgts);enc.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:'#0cf'});tone(1200,.08,'sine',.05);if(res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='rock'){const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);if(rk.hp<=0)splitRock(enc,tg.idx);}else if(tg.kind==='enemy'){const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,OET[e.t].enc.col,3);if(e.hp<=0){e.alive=false;addBounty(OET[e.t].sc);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col,14);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col2,8);tone(200,.3,'sawtooth',.1);if(OET[e.t].energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}}else if(tg.kind==='turret'){const t=enc.hbase.turrets[tg.idx];t.alive=false;addBounty(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}else if(tg.kind==='softpt'){enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);}}s.pulsesLeft2--;if(s.pulsesLeft2>0)s.pulseTimer2=wp.pulseCd;else s.scd2=Math.round(wp.cd*60);}
  if(iFireSec()&&!s.shld&&!s.scd2&&!s.pulsesLeft2){if(wp.type==='laser'){s.pulsesLeft2=wp.pulses;s.pulseTimer2=1;}else{enc.bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life*wp.spd,dmg:wp.dmg});s.scd2=Math.round(wp.cd*60);tone(900,.04,'square',.05);}}}
  for(let i=enc.bul.length-1;i>=0;i--){
    const b=enc.bul[i];b.x=wrap(b.x+b.vx,ew);b.y=wrap(b.y+b.vy,eh);b.l-=Math.hypot(b.vx,b.vy);if(b.l<=0){enc.bul.splice(i,1);continue;}
    let hit=false;
    for(let ri=enc.rocks.length-1;ri>=0;ri--){
      const rk=enc.rocks[ri];
      if(Math.hypot(b.x-rk.x,b.y-rk.y)<rk.r){
        rk.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,'#778',4);
        if(rk.hp<=0)splitRock(enc,ri);
        hit=true;break;
      }
    }
    if(hit){enc.bul.splice(i,1);continue;}
    for(const e of enc.en){if(!e.alive)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<OET[e.t].enc.r){e.hp-=b.dmg;tone(400,.05,'square',.06);boomAt(enc.pts,b.x,b.y,OET[e.t].enc.col,5);if(e.hp<=0){e.alive=false;addBounty(OET[e.t].sc);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col,14);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col2,8);tone(200,.3,'sawtooth',.1);if(OET[e.t].energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}hit=true;break;}}
    if(hit){enc.bul.splice(i,1);continue;}
    if(!hit&&enc.isHBase){
      if(pip(b.x,b.y,enc.hbase.hexPoly)){boomAt(enc.pts,b.x,b.y,'#cc2200',4);enc.bul.splice(i,1);continue;}
      for(const t of enc.hbase.turrets){if(!t.alive)continue;if(Math.hypot(b.x-t.x,b.y-t.y)<10){t.alive=false;addBounty(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);enc.bul.splice(i,1);hit=true;break;}}
      if(!hit){for(const sp of enc.hbase.softpts){if(!sp.alive)continue;if(Math.hypot(b.x-sp.x,b.y-sp.y)<12){sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);enc.bul.splice(i,1);break;}}}
    }
  }
  const alive=enc.en.filter(e=>e.alive);
  if(alive.length===0&&!enc.cleared&&!enc.isHBase){enc.cleared=true;tone(880,.3,'sine',.07);}
  if(enc.isHBase&&!enc.cleared&&enc.hbase.softpts.every(sp=>!sp.alive)){enc.cleared=true;tone(880,.3,'sine',.07);}
  for(const e of alive){
    const ec=OET[e.t].enc;if(e.t!==2)e.spin+=.05+e.t*.02;
    const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
    if(e.t===0){e.a+=angDiff(e.a,ta)*.08;e.vx+=Math.sin(e.a)*ec.spd*.07;e.vy-=Math.cos(e.a)*ec.spd*.07;}
    else if(e.t===1){const orb=ta+Math.PI/2;e.a+=angDiff(e.a,ta)*.09;e.vx+=(dx/dist)*ec.spd*.05+(Math.cos(orb))*ec.spd*.04;e.vy+=(dy/dist)*ec.spd*.05+(Math.sin(orb))*ec.spd*.04;}
    else{e.a+=angDiff(e.a,ta)*.04;if(dist>140)e.vx+=Math.sin(e.a)*ec.spd*.06;else if(dist<80){e.vx-=(dx/dist)*.04;e.vy-=(dy/dist)*.04;}e.vy-=Math.cos(e.a)*ec.spd*.04*(dist>100?1:-1);}
    e.vx*=.975;e.vy*=.975;const es=Math.hypot(e.vx,e.vy);if(es>ec.spd){e.vx=e.vx/es*ec.spd;e.vy=e.vy/es*ec.spd;}
    e.x=wrap(e.x+e.vx,ew);e.y=wrap(e.y+e.vy,eh);
    for(const rk of enc.rocks){const rd=Math.hypot(e.x-rk.x,e.y-rk.y);if(rd<rk.r+16){e.vx+=(e.x-rk.x)/rd*.3;e.vy+=(e.y-rk.y)/rd*.3;}}
    {const fw=ec.fire,ewp=WEAPONS[fw.wpn];
    if(ewp.type==='laser'&&e.pulsesLeft>0&&--e.pulseTimer<=0){const ox=e.x+Math.sin(e.a)*fw.offset,oy=e.y-Math.cos(e.a)*fw.offset;const res=castLaser(ox,oy,e.a,ewp.range,[{x:s.x,y:s.y,r:12}]);enc.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:OET[e.t].enc.col});tone(550+e.t*80,.08,'sine',.04);if(res.hitIdx>=0&&!s.shld&&s.inv<=0){s.hp=Math.max(0,s.hp-ewp.dmg);s.inv=40;tone(380,.08,'square',.08);if(s.hp<=0){encKillShip();return;}}e.pulsesLeft--;if(e.pulsesLeft>0)e.pulseTimer=ewp.pulseCd;else e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);}
    else if(e.pulsesLeft===0&&--e.timer<=0){if(ewp.type==='laser'){e.pulsesLeft=ewp.pulses;e.pulseTimer=1;}else{e.timer=Math.round(ewp.cd*60)+Math.floor(Math.random()*40-20);const bas=fw.mode==='spin'?Array.from({length:fw.count},(_,k)=>e.spin+k*Math.PI*2/fw.count):Array.from({length:fw.count},(_,k)=>ta+(k-(fw.count-1)/2)*fw.spread);for(const ba of bas)enc.ebu.push({x:e.x+Math.sin(ba)*fw.offset,y:e.y-Math.cos(ba)*fw.offset,vx:Math.sin(ba)*ewp.spd,vy:-Math.cos(ba)*ewp.spd,l:ewp.life*ewp.spd});tone(550+e.t*80,.04,'square',.03);}}}
    if(s.inv<=0&&Math.hypot(e.x-s.x,e.y-s.y)<ec.r+9){
      if(s.shld){e.vx-=(dx/dist)*2;e.vy-=(dy/dist)*2;}
      else{s.hp=Math.max(0,s.hp-3);s.inv=50;tone(380,.1,'sawtooth',.1);if(s.hp<=0){encKillShip();return;}}
    }
  }
  if(enc.isHBase&&!enc.cleared){
    for(const t of enc.hbase.turrets){
      if(!t.alive)continue;
      t.a+=angDiff(t.a,Math.atan2(s.x-t.x,-(s.y-t.y)))*.04;
      if(--t.timer<=0){const ewp=WEAPONS[0];t.timer=100+Math.floor(Math.random()*40-20);const ba=t.a;enc.ebu.push({x:t.x+Math.sin(ba)*15,y:t.y-Math.cos(ba)*15,vx:Math.sin(ba)*ewp.spd,vy:-Math.cos(ba)*ewp.spd,l:ewp.life*ewp.spd});tone(550,.04,'square',.03);}
    }
  }
  for(let i=enc.ebu.length-1;i>=0;i--){
    const b=enc.ebu[i];b.x=wrap(b.x+b.vx,ew);b.y=wrap(b.y+b.vy,eh);b.l-=Math.hypot(b.vx,b.vy);if(b.l<=0){enc.ebu.splice(i,1);continue;}
    let rm=false;for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(Math.hypot(b.x-rk.x,b.y-rk.y)<rk.r){rk.hp--;boomAt(enc.pts,b.x,b.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);rm=true;break;}}if(rm){enc.ebu.splice(i,1);continue;}
    if(enc.isHBase&&pip(b.x,b.y,enc.hbase.hexPoly)){enc.ebu.splice(i,1);continue;}
    if(Math.hypot(b.x-s.x,b.y-s.y)<12){
      enc.ebu.splice(i,1);
      if(!s.shld&&s.inv<=0){s.hp=Math.max(0,s.hp-3);s.inv=40;tone(380,.08,'square',.08);if(s.hp<=0){encKillShip();return;}}
    }
  }
}

// ===================== CAVE LEVEL =====================
function wNormal(x,y,li){
  const d=LV[li];let best=Infinity,nx=0,ny=1;
  const t=d.terrain;
  for(let i=0;i<t.length-1;i++){
    const dist=dseg(x,y,t[i][0],t[i][1],t[i+1][0],t[i+1][1]);
    if(dist<best){
      best=dist;
      const dx=t[i+1][0]-t[i][0],dy=t[i+1][1]-t[i][1],len=Math.hypot(dx,dy)||1;
      nx=-dy/len;ny=dx/len;
      if(nx*(x-t[i][0])+ny*(y-t[i][1])<0){nx=-nx;ny=-ny;}
    }
  }
  for(const o of d.obs){
    const ocx=o.reduce((s,p)=>s+p[0],0)/o.length;
    const ocy=o.reduce((s,p)=>s+p[1],0)/o.length;
    for(let i=0;i<o.length;i++){
      const j=(i+1)%o.length;
      const dist=dseg(x,y,o[i][0],o[i][1],o[j][0],o[j][1]);
      if(dist<best){
        best=dist;
        const dx=o[j][0]-o[i][0],dy=o[j][1]-o[i][1],len=Math.hypot(dx,dy)||1;
        nx=-dy/len;ny=dx/len;
        if(nx*(x-ocx)+ny*(y-ocy)<0){nx=-nx;ny=-ny;}
      }
    }
  }
  return{nx,ny};
}
function cvBounce(s){
  const spd=Math.hypot(s.vx,s.vy);
  const{nx,ny}=wNormal(s.x,s.y,G.lv);
  const dot=s.vx*nx+s.vy*ny;
  if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}
  s.vx*=.55;s.vy*=.55;
  s.x+=nx*10;s.y+=ny*10;
  if(!s.shld&&s.inv<=0){
    const dmg=Math.round((spd/5.5)*5);
    if(dmg>0){s.hp=Math.max(0,s.hp-dmg);s.inv=30;tone(Math.max(60,200-spd*18),.12,'sawtooth',.1);}
  }
}
function enterLv(){
  const d=LV[G.lv],ow=G.OW,ls=G.lvState[G.lv];
  G.CV={d,s:{...mkShip(d.ent.x,d.ent.y),energy:Math.max(25,ow?ow.s.energy:PLAYER_SHIP.maxEnergy),
             hp:ow?ow.s.hp:PLAYER_SHIP.maxHp,maxHp:ow?ow.s.maxHp:PLAYER_SHIP.maxHp},
    en:d.en.map((e,i)=>({...e,alive:ls?ls.en[i]:true,timer:20+Math.floor(Math.random()*80)})),
    fu:d.fu.map((f,i)=>({...f,got:ls?ls.fu[i]:false})),
    rx:ls?{...d.rx,hp:ls.rx.hp,alive:ls.rx.alive}:{...d.rx,alive:true},
    bul:[],ebu:[],pts:[],lsb:[],rdone:false,esc:0,cam:{x:0,y:0}};
  G.st='play';
}
function cvKillShip(){
  const cv=G.CV,s=cv.s;if(!s.alive)return;
  s.alive=false;boomAt(cv.pts,s.x,s.y,'#fff',28);boomAt(cv.pts,s.x,s.y,'#fa0',18);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_cv';
  setTimeout(()=>{G.st='rebuild';},1800);
}
function updCV(){
  const cv=G.CV;updPts(cv.pts,.06);for(let i=cv.lsb.length-1;i>=0;i--){if(--cv.lsb[i].l<=0)cv.lsb.splice(i,1);}
  const s=cv.s,d=cv.d;if(!s.alive)return;
  s.a+=iRot()*(s.energy>0?.065:.0325);s.shld=iShd(s.energy);
  if(s.shld)s.energy=Math.max(0,s.energy-.17);
  if(iThr()&&!s.shld){const thr=s.energy>0?.13:.014;s.vx+=Math.sin(s.a)*thr;s.vy-=Math.cos(s.a)*thr;if(s.energy>0)s.energy=Math.max(0,s.energy-.09);}
  s.vy+=d.grav;s.vx*=.9985;s.vy*=.9985;const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx=s.vx/sp*5.5;s.vy=s.vy/sp*5.5;}
  s.x+=s.vx;s.y+=s.vy;
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  const wH=d.worldH||H;
  const tcy=Math.max(0,Math.min(wH-H,s.y-H*.45));
  cv.cam.y+=(tcy-cv.cam.y)*.12;
  if(s.y<0){
    if(G.st==='esc'){addBounty(1000);tone(660,.4,'sine',.1);G.cleared[G.lv]=true;delete G.lvState[G.lv];
      if(G.cleared.every(c=>c)){G.slipgateActive=true;G.slipMsg=360;}}
    else{G.lvState[G.lv]={en:cv.en.map(e=>e.alive),fu:cv.fu.map(f=>f.got),rx:{hp:cv.rx.hp,alive:cv.rx.alive}};}
    const pi=G.lv,pp=owPos(PP[pi]);initOW(s.energy,pp.x,Math.max(80,pp.y-LV[pi].pr-55));
    G.OW.s.hp=s.hp;G.OW.s.maxHp=s.maxHp;G.OW.s.vy=-1.2;return;
  }
  if(wHit(s.x,s.y,9,G.lv)){cvBounce(s);if(s.hp<=0){cvKillShip();return;}}
  for(const f of cv.fu){if(!f.got&&Math.hypot(s.x-f.x,s.y-f.y)<22){f.got=true;pickupEnergy(s,f.x,f.y,cv.pts,d.col);}}
  if(G.st==='esc'){cv.esc--;if(cv.esc<=0){cvKillShip();return;}}
  {const wp=playerWeapon;
  if(wp.type==='laser'&&s.pulsesLeft>0&&--s.pulseTimer<=0){const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;const tgts=[];cv.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(cv.rx.alive)tgts.push({x:cv.rx.x,y:cv.rx.y,r:18,kind:'reactor',idx:0});const res=castLaser(ox,oy,s.a,wp.range,tgts);cv.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:'#0cf'});tone(1200,.08,'sine',.05);if(res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=cv.en[tg.idx];e.alive=false;addBounty(250);boomAt(cv.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=cv.rx;rx.hp-=wp.dmg;addBounty(100);tone(350,.1,'square',.08);boomAt(cv.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;cv.rdone=true;cv.esc=1200;G.st='esc';addBounty(2000);boomAt(cv.pts,rx.x,rx.y,d.col,40);boomAt(cv.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}s.pulsesLeft--;if(s.pulsesLeft>0)s.pulseTimer=wp.pulseCd;else s.scd=Math.round(wp.cd*60);}
  if(iFir()&&!s.shld&&!s.scd&&!s.pulsesLeft){if(wp.type==='laser'){s.pulsesLeft=wp.pulses;s.pulseTimer=1;}else{cv.bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life*wp.spd,dmg:wp.dmg});s.scd=Math.round(wp.cd*60);tone(900,.04,'square',.05);}}}
  {const wp=secondaryWeapon;
  if(wp.type==='laser'&&s.pulsesLeft2>0&&--s.pulseTimer2<=0){const ox=s.x+Math.sin(s.a)*13,oy=s.y-Math.cos(s.a)*13;const tgts=[];cv.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(cv.rx.alive)tgts.push({x:cv.rx.x,y:cv.rx.y,r:18,kind:'reactor',idx:0});const res=castLaser(ox,oy,s.a,wp.range,tgts);cv.lsb.push({x1:ox,y1:oy,x2:res.x2,y2:res.y2,l:8,col:'#0cf'});tone(1200,.08,'sine',.05);if(res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=cv.en[tg.idx];e.alive=false;addBounty(250);boomAt(cv.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=cv.rx;rx.hp-=wp.dmg;addBounty(100);tone(350,.1,'square',.08);boomAt(cv.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;cv.rdone=true;cv.esc=1200;G.st='esc';addBounty(2000);boomAt(cv.pts,rx.x,rx.y,d.col,40);boomAt(cv.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}s.pulsesLeft2--;if(s.pulsesLeft2>0)s.pulseTimer2=wp.pulseCd;else s.scd2=Math.round(wp.cd*60);}
  if(iFireSec()&&!s.shld&&!s.scd2&&!s.pulsesLeft2){if(wp.type==='laser'){s.pulsesLeft2=wp.pulses;s.pulseTimer2=1;}else{cv.bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life*wp.spd,dmg:wp.dmg});s.scd2=Math.round(wp.cd*60);tone(900,.04,'square',.05);}}}
  for(let i=cv.bul.length-1;i>=0;i--){
    const b=cv.bul[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){cv.bul.splice(i,1);continue;}
    let rm=false;
    for(const e of cv.en){if(!e.alive)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<13){e.alive=false;addBounty(250);boomAt(cv.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);rm=true;break;}}
    if(rm){cv.bul.splice(i,1);continue;}
    const rx=cv.rx;if(rx.alive&&Math.hypot(b.x-rx.x,b.y-rx.y)<18){rx.hp--;addBounty(100);tone(350,.1,'square',.08);cv.bul.splice(i,1);if(rx.hp<=0){rx.alive=false;cv.rdone=true;cv.esc=1200;G.st='esc';addBounty(2000);boomAt(cv.pts,rx.x,rx.y,d.col,40);boomAt(cv.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}
  }
  for(const e of cv.en){
    if(!e.alive)continue;
    e.a+=angDiff(e.a,Math.atan2(s.x-e.x,-(s.y-e.y)))*.04;
    if(--e.timer<=0){const ewp=WEAPONS[0];e.timer=100+Math.floor(Math.random()*40-20);cv.ebu.push({x:e.x+Math.sin(e.a)*15,y:e.y-Math.cos(e.a)*15,vx:Math.sin(e.a)*ewp.spd,vy:-Math.cos(e.a)*ewp.spd,l:ewp.life*ewp.spd});}
  }
  for(let i=cv.ebu.length-1;i>=0;i--){
    const b=cv.ebu[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){cv.ebu.splice(i,1);continue;}
    if(Math.hypot(b.x-s.x,b.y-s.y)<12){
      cv.ebu.splice(i,1);
      if(!s.shld&&s.inv<=0){s.hp=Math.max(0,s.hp-3);s.inv=40;tone(380,.08,'square',.08);if(s.hp<=0){cvKillShip();return;}}
    }
  }
}

// ===================== DRAWING =====================
function drStars(scroll=0){
  cx.save();
  for(const s of STARS){cx.globalAlpha=.5+.3*Math.sin(s.ph+G.fr*.015);cx.fillStyle=SCOLS[s.ci];cx.beginPath();cx.arc((s.x+scroll)%W,s.y,s.r,0,Math.PI*2);cx.fill();}
  cx.globalAlpha=1;cx.restore();
}
function drDust(vx,vy){
  const spd=Math.sqrt(vx*vx+vy*vy);if(spd>6){const s=6/spd;vx*=s;vy*=s;}
  cx.save();
  for(const d of DUST){
    d.x=((d.x-vx*d.depth)%W+W)%W;
    d.y=((d.y-vy*d.depth)%H+H)%H;
    cx.globalAlpha=.12+d.depth*.2;
    const streak=spd*d.depth;
    if(streak>1){
      // draw a short streak in the direction the dust appears to trail
      cx.strokeStyle='#cce4ff';cx.lineWidth=d.r*.9;cx.lineCap='round';
      cx.beginPath();cx.moveTo(d.x,d.y);cx.lineTo(d.x+vx*d.depth*2.5,d.y+vy*d.depth*2.5);cx.stroke();
    } else {
      cx.fillStyle='#cce4ff';
      cx.beginPath();cx.arc(d.x,d.y,d.r,0,Math.PI*2);cx.fill();
    }
  }
  cx.globalAlpha=1;cx.restore();
}
function drPts(pts){for(const p of pts){cx.save();cx.globalAlpha=Math.max(0,p.l/p.ml);cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,1.5,0,Math.PI*2);cx.fill();cx.restore();}}
function drShip(x,y,a,shld,thr,energy,inv,fr){
  if(inv>0&&fr%4>=2)return;
  cx.save();cx.translate(x,y);cx.rotate(a);
  if(shld){cx.strokeStyle='rgba(100,200,255,.8)';cx.shadowColor='#8cf';cx.shadowBlur=18;cx.lineWidth=2;cx.beginPath();cx.arc(0,0,17,0,Math.PI*2);cx.stroke();}
  cx.strokeStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=8;cx.lineWidth=1.5;
  cx.beginPath();cx.moveTo(0,-10);cx.lineTo(-7,8);cx.lineTo(0,4);cx.lineTo(7,8);cx.closePath();cx.stroke();
  if(thr&&energy>0&&!shld){cx.strokeStyle='#fb0';cx.shadowColor='#fb0';cx.shadowBlur=12;cx.beginPath();cx.moveTo(-3,7);cx.lineTo(0,13+Math.random()*6);cx.lineTo(3,7);cx.stroke();}
  else if(thr&&energy<=0){cx.strokeStyle='#f22';cx.shadowColor='#f22';cx.shadowBlur=6;cx.beginPath();cx.moveTo(-1.5,7);cx.lineTo(0,9+Math.random()*2);cx.lineTo(1.5,7);cx.stroke();}
  cx.restore();
}
function drOWEnemy(e){
  const et=OET[e.t],ec=et.enc;
  cx.save();cx.translate(e.x,e.y);
  if(e.flash>0){cx.globalAlpha=e.flash%4<2?1:.3;}
  if(e.t===0){
    cx.strokeStyle=et.col;cx.shadowColor=et.col;cx.shadowBlur=10;cx.lineWidth=1.5;
    cx.beginPath();cx.ellipse(0,2,16,6,0,0,Math.PI*2);cx.stroke();
    cx.beginPath();cx.arc(0,-1,8,Math.PI,0);cx.stroke();
  } else if(e.t===1){
    cx.strokeStyle=et.col;cx.shadowColor=et.col;cx.shadowBlur=10;cx.lineWidth=1.5;
    for(let k=0;k<3;k++){const a=e.spin+k*Math.PI*2/3;cx.beginPath();cx.arc(Math.cos(a)*9,Math.sin(a)*9,5,0,Math.PI*2);cx.stroke();}
  } else {
    cx.strokeStyle=et.col;cx.shadowColor=et.col;cx.shadowBlur=12;cx.lineWidth=2;
    cx.rotate(e.a);
    cx.beginPath();cx.moveTo(0,-20);cx.lineTo(-14,8);cx.lineTo(-8,14);cx.lineTo(0,10);cx.lineTo(8,14);cx.lineTo(14,8);cx.closePath();cx.stroke();
    cx.beginPath();cx.moveTo(-14,8);cx.lineTo(-20,0);cx.moveTo(14,8);cx.lineTo(20,0);cx.stroke();
  }
  cx.globalAlpha=1;cx.restore();
}
function drEncEnemy(e){
  const et=OET[e.t].enc;cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
  cx.strokeStyle=et.col;cx.shadowColor=et.col;cx.shadowBlur=10;cx.lineWidth=1.5;
  if(e.t===0){cx.beginPath();cx.ellipse(0,2,13,5,0,0,Math.PI*2);cx.stroke();cx.beginPath();cx.arc(0,-1,7,Math.PI,0);cx.stroke();}
  else if(e.t===1){cx.beginPath();cx.moveTo(0,-et.r);cx.lineTo(-et.r*.86,et.r*.5);cx.lineTo(et.r*.86,et.r*.5);cx.closePath();cx.stroke();}
  else{cx.save();cx.rotate(e.a);cx.beginPath();cx.moveTo(0,-et.r);cx.lineTo(-et.r*.7,et.r*.4);cx.lineTo(-et.r*.4,et.r*.7);cx.lineTo(0,et.r*.5);cx.lineTo(et.r*.4,et.r*.7);cx.lineTo(et.r*.7,et.r*.4);cx.closePath();cx.stroke();cx.beginPath();cx.moveTo(-et.r*.7,et.r*.4);cx.lineTo(-et.r,0);cx.moveTo(et.r*.7,et.r*.4);cx.lineTo(et.r,0);cx.stroke();
  cx.restore();cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-et.r,-et.r-8,et.r*2,4);cx.fillStyle=et.col;cx.fillRect(-et.r,-et.r-8,et.r*2*(e.hp/e.mhp),4);cx.restore();}
  if(e.t!==2&&e.hp<e.mhp){cx.save();cx.rotate(-e.spin);cx.fillStyle='#333';cx.fillRect(-et.r,-et.r-8,et.r*2,4);cx.fillStyle=et.col;cx.fillRect(-et.r,-et.r-8,et.r*2*(e.hp/e.mhp),4);cx.restore();}
  cx.restore();
}
function drEnergy(x,y,col){cx.save();cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8;cx.lineWidth=1.5;cx.beginPath();cx.moveTo(x,y-9);cx.lineTo(x+7,y);cx.lineTo(x,y+9);cx.lineTo(x-7,y);cx.closePath();cx.stroke();cx.fillStyle=col;cx.font='bold 9px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText('🗲',x,y+3.5);cx.restore();}
function drGPI(){cx.save();cx.textAlign='right';cx.font='11px monospace';if(GP.connected){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6;cx.fillText('CTRL: '+GP.id.slice(0,22),W-6,H-8);}else{cx.fillStyle='#444';cx.shadowBlur=0;cx.fillText('NO CONTROLLER',W-6,H-8);}cx.restore();}
function drHUD(energy,maxEnergy=100,hp=15,maxHp=15){
  cx.save();cx.font='13px monospace';cx.fillStyle='#aaffcc';cx.shadowBlur=0;
  cx.textAlign='left';cx.fillText('BOUNTY '+G.bounty,8,18);
  cx.textAlign='center';cx.fillText('',W/2,18);
  cx.textAlign='right';
  const hf=Math.max(0,hp/maxHp);
  cx.fillText('HP '+hp,W-88,17);
  cx.strokeStyle='#aaffcc';cx.lineWidth=1;cx.strokeRect(W-82,6,70,11);
  cx.fillStyle=hf>.5?'#0f8':hf>.25?'#fa0':'#f40';cx.fillRect(W-81,7,hf*68,9);
  cx.fillStyle='#aaffcc';cx.fillText('ENERGY',W-88,32);
  cx.strokeRect(W-82,21,70,11);
  cx.fillStyle=energy>maxEnergy*.2?'#0f8':'#f40';cx.fillRect(W-81,22,energy/maxEnergy*68,9);
  cx.restore();drGPI();
}
function drBullet(x,y,col='#fff'){cx.save();cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=6;cx.beginPath();cx.arc(x,y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
function scanlines(){cx.save();cx.globalAlpha=.035;cx.fillStyle='#000';for(let y=0;y<H;y+=2)cx.fillRect(0,y,W,1);cx.restore();}

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
function drawSlipgateMenu(){
  drawOW();
  const active=G.slipgateActive;
  const col=active?'#cc99ff':'#aa99cc';
  cx.save();
  const pw=360,ph=200,px=W/2-pw/2,py=H/2-ph/2;
  cx.fillStyle='rgba(4,0,12,.92)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=18;cx.lineWidth=1.5;
  cx.strokeRect(px,py,pw,ph);
  cx.shadowBlur=12;cx.fillStyle=col;cx.font='bold 22px monospace';cx.textAlign='center';
  cx.fillText('SLIPGATE',W/2,py+40);
  if(active){
    cx.shadowBlur=0;cx.fillStyle='#cc99ff';cx.font='bold 15px monospace';
    cx.fillText('JUMP TO NEW SYSTEM',W/2,py+88);
    cx.fillStyle='#776688';cx.font='11px monospace';
    cx.fillText('A new star system awaits beyond the gate.',W/2,py+110);
    cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=8;cx.font='bold 12px monospace';
    cx.fillText('[ ENTER TO JUMP ]',W/2,py+142);
  }else{
    cx.shadowBlur=0;cx.fillStyle='#8877aa';cx.font='bold 15px monospace';
    cx.fillText('COMING SOON',W/2,py+88);
    cx.fillStyle='#554466';cx.font='11px monospace';
    cx.fillText('Clear all sectors to activate the slipgate.',W/2,py+112);
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('ESC TO LEAVE',W/2,py+ph-14);
  cx.restore();
}
function drawBaseMenu(){
  drawOW();
  const s=G.OW.s;
  const repairCost=(s.maxHp-s.hp)*100;
  const rechargeCost=Math.ceil((s.maxEnergy-s.energy)*10);
  const costs=[repairCost,rechargeCost];
  const maxed=[s.hp>=s.maxHp,s.energy>=s.maxEnergy];
  cx.save();
  cx.fillStyle='rgba(0,12,8,.92)';
  const pw=360,ph=220,px=W/2-pw/2,py=H/2-ph/2;
  cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=18;cx.lineWidth=1.5;
  cx.strokeRect(px,py,pw,ph);
  cx.shadowBlur=12;cx.fillStyle='#aaccff';cx.font='bold 22px monospace';cx.textAlign='center';
  cx.fillText('FRIENDLY BASE',W/2,py+36);
  cx.shadowBlur=0;cx.fillStyle='#aaffcc';cx.font='11px monospace';cx.textAlign='right';
  cx.fillText('CREDITS  '+G.credits,px+pw-10,py+18);
  const BITEMS=['REPAIR','RECHARGE','LEAVE'];
  cx.font='13px monospace';
  for(let i=0;i<BITEMS.length;i++){
    const iy=py+78+i*40;
    const sel=i===G.baseSel;
    const disabled=i<2&&(maxed[i]||G.credits<costs[i]);
    cx.fillStyle=sel?'#0f8':disabled?'#445':'#668';
    cx.shadowColor='#0f8';cx.shadowBlur=sel?10:0;
    cx.textAlign='left';
    cx.fillText((sel?'▶ ':'  ')+BITEMS[i],px+14,iy);
    if(i<2){
      if(maxed[i]){
        cx.fillStyle='#446';cx.shadowBlur=0;cx.textAlign='right';
        cx.fillText('FULL',px+pw-14,iy);
      }else{
        const canAfford=G.credits>=costs[i];
        cx.fillStyle=sel?(canAfford?'#aaffcc':'#f44'):'#446';
        cx.shadowBlur=0;cx.textAlign='right';
        cx.fillText(costs[i]+' CR',px+pw-14,iy);
      }
    }
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText('ESC TO LEAVE',W/2,py+ph-12);
  cx.restore();
}
function drawOW(){
  cx.fillStyle='#000008';cx.fillRect(0,0,W,H);drStars();
  const ow=G.OW,s=ow.s;
  const camX=Math.max(0,Math.min(OW_W-W,s.x-W/2));
  const camY=Math.max(0,Math.min(OW_H-H,s.y-H/2));
  drDust(camX-(ow.pcx??camX),camY-(ow.pcy??camY));ow.pcx=camX;ow.pcy=camY;
  cx.save();cx.translate(-camX,-camY);
  {cx.save();cx.lineWidth=1;cx.globalAlpha=.65;
  const arrowBodies=[['#aaccff',BASE.orbitR,BASE],...PP.map((b,i)=>[LV[i].pcol,b.orbitR,b]),...(G.hbCleared?[]:[[`#ff4444`,HBASE.orbitR,HBASE]]),['#aa99cc',SLIPGATE.orbitR,SLIPGATE]];
  cx.setLineDash([4,2]);
  for(const[col,r]of arrowBodies){
    cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=6;
    cx.beginPath();cx.arc(OW_W/2,OW_H/2,r,0,Math.PI*2);cx.stroke();
  }
  cx.strokeStyle='#998877';cx.shadowColor='#998877';cx.shadowBlur=6;
  cx.beginPath();cx.arc(OW_W/2,OW_H/2,AB[0].orbitR,0,Math.PI*2);cx.stroke();
  cx.setLineDash([]);
  const arrowSpd=0.00173,N=40,arrowGap=0.2;
  cx.font='14px monospace';cx.textAlign='center';cx.textBaseline='alphabetic';
  const _gm=cx.measureText('❯'),_gOff=(_gm.actualBoundingBoxAscent-_gm.actualBoundingBoxDescent)/2;
  for(const[col,r,b]of arrowBodies){
    const bodyA=b.orbitA+G.owFr*b.orbitSpd;
    cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=8;
    for(let i=0;i<N;i++){
      const phase=(G.fr*arrowSpd+i*Math.PI/N)%Math.PI;
      if(phase<arrowGap)continue;
      const fade=phase>Math.PI*.8?1-(phase-Math.PI*.8)/(Math.PI*.2):1;
      cx.globalAlpha=.49*fade;
      for(const dir of[1,-1]){
        const a=bodyA+Math.PI+dir*phase;
        const ax=OW_W/2+Math.cos(a)*r,ay=OW_H/2+Math.sin(a)*r;
        const rot=Math.atan2(dir*Math.cos(a),-dir*Math.sin(a));
        cx.save();cx.translate(ax,ay);cx.rotate(rot);cx.scale(1,2/3);
        cx.fillText('❯',0,_gOff);
        cx.restore();
      }
    }
    cx.globalAlpha=.49;
  }
  cx.restore();}
  {cx.save();cx.globalAlpha=.6;cx.strokeStyle='#776655';cx.lineWidth=0.8;cx.shadowColor='#554433';cx.shadowBlur=2;
  const abOrbitR=AB[0].orbitR,abSpd=AB[0].orbitSpd;
  for(const p of AB_BELT){
    const a=p.a+G.owFr*abSpd;
    const bx=OW_W/2+Math.cos(a)*(abOrbitR+p.dr),by=OW_H/2+Math.sin(a)*(abOrbitR+p.dr);
    cx.beginPath();
    for(let i=0;i<p.sides;i++){const pa=(i/p.sides)*Math.PI*2+p.rot;i?cx.lineTo(bx+Math.cos(pa)*p.rv,by+Math.sin(pa)*p.rv):cx.moveTo(bx+Math.cos(pa)*p.rv,by+Math.sin(pa)*p.rv);}
    cx.closePath();cx.stroke();
  }
  cx.restore();}
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
  for(const e of ow.en)if(e.alive)drOWEnemy(e);
  for(const f of ow.fu)drEnergy(f.x,f.y,'#0f8');
  drPts(ow.pts);
  drBase(ow.nearBase);
  drSlipgate(ow.nearSlipgate);
  if(s.alive)drShip(s.x,s.y,s.a,s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust),s.energy,s.inv,G.fr);
  cx.restore();
  drHUD(s.energy,s.maxEnergy,s.hp,s.maxHp);
  if(G.slipMsg>0){
    const alpha=Math.min(1,G.slipMsg/40);
    cx.save();cx.globalAlpha=alpha;
    cx.fillStyle='rgba(4,0,12,.82)';cx.fillRect(W/2-200,H/2-32,400,52);
    cx.strokeStyle='#cc99ff';cx.shadowColor='#cc99ff';cx.shadowBlur=14;cx.lineWidth=1;cx.strokeRect(W/2-200,H/2-32,400,52);
    cx.fillStyle='#cc99ff';cx.font='bold 14px monospace';cx.textAlign='center';cx.shadowBlur=10;
    cx.fillText('SLIPGATE ACTIVATED',W/2,H/2-8);
    cx.shadowBlur=0;cx.fillStyle='#9977bb';cx.font='11px monospace';
    cx.fillText('The slipgate is now open. Find it at the outer rim.',W/2,H/2+14);
    cx.restore();
  }
}

function drawEnc(){
  const enc=G.ENC,et=OET[enc.et];
  const camX=enc.cam?enc.cam.x:0,camY=enc.cam?enc.cam.y:0;
  cx.fillStyle='#030408';cx.fillRect(0,0,W,H);drStars();
  drDust(camX-(enc.pcx??camX),camY-(enc.pcy??camY));enc.pcx=camX;enc.pcy=camY;
  cx.save();cx.translate(-camX,-camY);
  const tierCol=['#667','#556','#445'];
  for(const rk of enc.rocks){
    cx.save();cx.strokeStyle=tierCol[rk.tier||0];cx.shadowColor='#334';cx.shadowBlur=rk.tier===0?6:3;cx.lineWidth=1.5;
    cx.beginPath();
    for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2,r2=rk.r*(1+.2*Math.sin(a*3+rk.r));i?cx.lineTo(rk.x+Math.cos(a)*r2,rk.y+Math.sin(a)*r2):cx.moveTo(rk.x+Math.cos(a)*r2,rk.y+Math.sin(a)*r2);}
    cx.closePath();cx.stroke();
    if(rk.hp<rk.maxHp){
      cx.fillStyle='#333';cx.fillRect(rk.x-rk.r,rk.y-rk.r-7,rk.r*2,4);
      cx.fillStyle='#99a';cx.fillRect(rk.x-rk.r,rk.y-rk.r-7,rk.r*2*(rk.hp/rk.maxHp),4);
    }
    cx.restore();
  }
  for(const e of enc.en)if(e.alive)drEncEnemy(e);
  if(enc.isHBase){
    const{HEX_R,hx,hy,softpts,turrets}=enc.hbase,pu=.5+.5*Math.sin(G.fr*.06);
    cx.save();cx.strokeStyle='#cc2200';cx.shadowColor='#cc2200';cx.shadowBlur=8+pu*8;cx.lineWidth=2;
    cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R):cx.moveTo(hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R);}cx.closePath();cx.stroke();cx.restore();
    for(const sp of softpts){
      cx.save();
      if(sp.alive){cx.strokeStyle='#ff8800';cx.shadowColor='#ff8800';cx.shadowBlur=8+pu*6;cx.lineWidth=1.5;}
      else{cx.strokeStyle='#442200';cx.shadowBlur=0;cx.lineWidth=1;}
      cx.beginPath();cx.arc(sp.x,sp.y,8,0,Math.PI*2);cx.stroke();cx.restore();
    }
    for(const t of turrets){
      if(!t.alive)continue;
      cx.save();cx.translate(t.x,t.y);
      cx.strokeStyle='#f44';cx.shadowColor='#f44';cx.shadowBlur=8;cx.lineWidth=1.5;
      cx.beginPath();cx.arc(0,0,8,0,Math.PI*2);cx.stroke();
      cx.rotate(t.a);cx.beginPath();cx.moveTo(0,-8);cx.lineTo(0,-18);cx.stroke();
      cx.restore();
    }
  }
  for(const f of enc.fu)drEnergy(f.x,f.y,'#0f8');
  for(const b of enc.bul)drBullet(b.x,b.y,'#fff');
  for(const b of enc.ebu)drBullet(b.x,b.y,et.enc.col);
  for(const lb of enc.lsb){const a=lb.l/8;cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=2;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=1;cx.shadowBlur=0;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.restore();}
  drPts(enc.pts);
  if(enc.s.alive)drShip(enc.s.x,enc.s.y,enc.s.a,enc.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust),enc.s.energy,enc.s.inv,G.fr);
  cx.restore();
  if(enc.introTimer>0){const a=Math.min(1,(70-enc.introTimer)/20);cx.save();cx.globalAlpha=a;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,H/2-36,W,72);cx.fillStyle=et.enc.col;cx.shadowColor=et.enc.col;cx.shadowBlur=20;cx.font='bold 32px monospace';cx.textAlign='center';cx.fillText(enc.label,W/2,H/2+4);cx.shadowBlur=0;cx.fillStyle='#668';cx.font='13px monospace';cx.fillText(enc.isAst&&!enc.en.length?'YOU MAY LEAVE AT ANY TIME':enc.isHBase?'DESTROY ALL SOFT POINTS TO ESCAPE':'DESTROY ALL ENEMIES TO ESCAPE',W/2,H/2+26);cx.globalAlpha=1;cx.restore();}
  const alive=enc.en.filter(e=>e.alive).length;
  cx.save();cx.font='13px monospace';cx.textAlign='center';
  if(enc.cleared){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6+5*Math.abs(Math.sin(G.fr*.08));cx.fillText('ALL CLEAR — LEAVE THE AREA',W/2,18);}
  else{cx.fillStyle=et.enc.col;cx.fillText(enc.isHBase?enc.label+' — '+enc.hbase.softpts.filter(sp=>sp.alive).length+' soft points remaining':enc.label+' — '+alive+' remaining',W/2,18);}
  cx.restore();
  drHUD(enc.s.energy,enc.s.maxEnergy,enc.s.hp,enc.s.maxHp);
}

function drawCV(){
  const cv=G.CV,d=cv.d,col=d.col;
  const camX=cv.cam?cv.cam.x:0,camY=cv.cam?cv.cam.y:0;
  cx.fillStyle=d.bg;cx.fillRect(0,0,W,H);
  cx.save();cx.translate(-camX,-camY);
  cx.fillStyle='#000';cx.beginPath();d.terrain.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();
  cx.fillStyle=d.bg;for(const o of d.obs){cx.beginPath();o.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();}
  cx.save();cx.shadowColor=col;cx.shadowBlur=10;cx.strokeStyle=col;cx.lineWidth=1.5;
  cx.beginPath();d.terrain.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.stroke();
  for(const o of d.obs){cx.beginPath();o.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.stroke();}
  cx.restore();
  for(const f of cv.fu)if(!f.got)drEnergy(f.x,f.y,col);
  const rx=cv.rx;cx.save();
  if(rx.alive){const pu=.5+.5*Math.sin(G.fr*.1);cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8+pu*12;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();cx.fillStyle=col;cx.font='bold 10px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText(rx.hp,rx.x,rx.y+4);}
  else{const pu=.5+.5*Math.sin(G.fr*.35);cx.strokeStyle='#f50';cx.shadowColor='#f50';cx.shadowBlur=10+pu*25;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+G.fr*.07;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();}
  cx.restore();
  for(const e of cv.en){if(!e.alive)continue;cx.save();cx.translate(e.x,e.y);cx.strokeStyle='#f44';cx.shadowColor='#f44';cx.shadowBlur=8;cx.lineWidth=1.5;cx.beginPath();cx.arc(0,0,8,0,Math.PI*2);cx.stroke();cx.rotate(e.a);cx.beginPath();cx.moveTo(0,-8);cx.lineTo(0,-18);cx.stroke();cx.restore();}
  for(const b of cv.bul){cx.save();cx.fillStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=6;cx.beginPath();cx.arc(b.x,b.y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
  for(const b of cv.ebu){cx.save();cx.fillStyle='#f66';cx.shadowColor='#f66';cx.shadowBlur=6;cx.beginPath();cx.arc(b.x,b.y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
  for(const lb of cv.lsb){const a=lb.l/8;cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=2;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=1;cx.shadowBlur=0;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.restore();}
  drPts(cv.pts);
  if(cv.s.alive)drShip(cv.s.x,cv.s.y,cv.s.a,cv.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust),cv.s.energy,cv.s.inv,G.fr);
  cx.restore();
  drHUD(cv.s.energy,cv.s.maxEnergy,cv.s.hp,cv.s.maxHp);
  cx.save();cx.font='13px monospace';cx.fillStyle=col;cx.textAlign='center';cx.fillText(d.name,W/2,18);cx.restore();
  if(G.st==='esc'){const sec=Math.ceil(cv.esc/60);cx.save();cx.fillStyle=sec<=3?'#f40':'#ff0';cx.shadowColor=cx.fillStyle;cx.shadowBlur=12;cx.font='bold 20px monospace';cx.textAlign='center';cx.fillText('REACTOR CRITICAL — ESCAPE NOW!',W/2,52);cx.font='bold 34px monospace';cx.fillText(sec+'s',W/2,84);cx.restore();}
  if(G.st==='dead_cv'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}
}

function drawTitle(){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#0f8';cx.shadowBlur=30;cx.fillStyle='#0f8';
  cx.font='bold 72px monospace';cx.fillText('PHANTOM',W/2,H/2-100);
  cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='14px monospace';
  cx.fillText('NAVIGATE THE STAR SYSTEM  ·  DESTROY REACTORS  ·  ESCAPE',W/2,H/2-55);
  const rows=[['A D / LS','ROTATE'],['W / RT','THRUST'],['J / LT','FIRE'],['I / LB·RB','SHIELD'],['Near a planet + FIRE','ENTER'],['',''],['Shoot cave REACTOR','START COUNTDOWN'],['Fly out top gap','ESCAPE']];
  cx.font='12px monospace';let ry=H/2-22;
  for(const[k,v]of rows){if(!k){ry+=10;continue;}cx.fillStyle='#557799';cx.textAlign='right';cx.fillText(k,W/2-6,ry);cx.fillStyle='#aaffcc';cx.textAlign='left';cx.fillText(v,W/2+10,ry);ry+=17;}
  const TITEMS=['PLAY GAME','OPTIONS'];
  cx.font='14px monospace';
  for(let i=0;i<TITEMS.length;i++){
    const iy=H-68+i*26;const sel=i===G.titleSel;
    if(sel){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=12;cx.fillText('▶ '+TITEMS[i],W/2,iy);}
    else{cx.fillStyle='#446';cx.shadowBlur=0;cx.fillText(TITEMS[i],W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#223';cx.font='10px monospace';cx.textAlign='left';
  cx.fillText('SEED  '+G.seed.toString(16).toUpperCase().padStart(8,'0'),8,H-8);
  cx.restore();drGPI();scanlines();
}

function drawScreen(title,sub,tc,prompt){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';cx.shadowColor=tc;cx.shadowBlur=24;cx.fillStyle=tc;
  cx.font='bold 52px monospace';cx.fillText(title,W/2,H/2-50);
  if(sub){cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='20px monospace';cx.fillText(sub,W/2,H/2+12);}
  if(Math.floor(G.fr/28)%2===0){cx.fillStyle='#668';cx.font='14px monospace';cx.fillText(prompt,W/2,H/2+65);}
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText('SEED  '+G.seed.toString(16).toUpperCase().padStart(8,'0'),W/2,H/2+95);
  cx.restore();drGPI();scanlines();
}
function drawRebuild(){
  const canAfford=G.credits>=2500;
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#f40';cx.shadowBlur=28;cx.fillStyle='#f40';
  cx.font='bold 46px monospace';cx.fillText('SHIP DESTROYED',W/2,H/2-96);
  cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='18px monospace';
  if(canAfford){
    cx.fillText('REBUILD COST: 2500 CREDITS',W/2,H/2-46);
    cx.fillStyle='#8df';cx.fillText('CREDITS: '+G.credits,W/2,H/2-20);
  } else {
    cx.fillStyle='#fd8';cx.font='16px monospace';
    cx.fillText('INSUFFICIENT FUNDS — CHARITABLE ASSISTANCE GRANTED',W/2,H/2-46);
    cx.fillStyle='#8df';cx.font='18px monospace';cx.fillText('CREDITS: '+G.credits,W/2,H/2-20);
  }
  cx.fillStyle='#f86';cx.font='16px monospace';cx.fillText('BOUNTY FORFEIT: '+G.bounty,W/2,H/2+10);
  if(Math.floor(G.fr/28)%2===0){cx.fillStyle='#668';cx.font='14px monospace';cx.fillText('ENTER OR START TO REBUILD',W/2,H/2+56);}
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('SEED  '+G.seed.toString(16).toUpperCase().padStart(8,'0'),W/2,H/2+86);
  cx.restore();drGPI();scanlines();
}

function pauseItems(){return G.cheatMode?['RESUME','OPTIONS','REPAIR SHIP','TELEPORT TO SLIPGATE','CLEAR ALL SECTORS','ADD 10K CREDITS','ZERO CREDITS','QUIT TO TITLE']:['RESUME','OPTIONS','QUIT TO TITLE'];}

function drawPause(){
  const PITEMS=pauseItems();
  const ph=G.cheatMode?408:240,pw=300,px=W/2-pw/2,py=H/2-ph/2;
  cx.save();
  cx.fillStyle='rgba(0,0,0,.75)';cx.fillRect(0,0,W,H);
  cx.strokeStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=20;cx.lineWidth=1.5;
  cx.fillStyle='rgba(0,12,8,.95)';cx.fillRect(px,py,pw,ph);
  cx.strokeRect(px,py,pw,ph);
  cx.shadowBlur=14;cx.fillStyle='#0f8';cx.font='bold 22px monospace';cx.textAlign='center';
  cx.fillText('PAUSED',W/2,py+38);
  if(G.cheatMode){cx.shadowBlur=6;cx.fillStyle='#ff8';cx.font='bold 10px monospace';cx.fillText('CHEAT MODE',W/2,py+54);cx.shadowBlur=0;}
  cx.font='13px monospace';
  for(let i=0;i<PITEMS.length;i++){
    const iy=py+76+i*36;
    const sel=i===G.pauseSel;
    const isCheat=G.cheatMode&&i>=2&&i<=6;
    if(sel){cx.fillStyle=isCheat?'#ffee44':'#0f8';cx.shadowColor=isCheat?'#ff8':'#0f8';cx.shadowBlur=10;cx.fillText('▶ '+PITEMS[i],W/2,iy);}
    else{cx.fillStyle=isCheat?'#665500':'#668';cx.shadowBlur=0;cx.fillText(PITEMS[i],W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#aaffcc';cx.font='12px monospace';
  cx.fillText('CREDITS  '+G.credits,W/2,py+ph-46);
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('ESC TO RESUME',W/2,py+ph-26);
  cx.fillStyle='#223';cx.font='10px monospace';
  cx.fillText('SEED  '+G.seed.toString(16).toUpperCase().padStart(8,'0'),W/2,py+ph-10);
  cx.restore();
}

function drawOptions(){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#0f8';cx.shadowBlur=20;cx.fillStyle='#0f8';
  cx.font='bold 28px monospace';cx.fillText('OPTIONS',W/2,70);
  cx.shadowBlur=0;cx.strokeStyle='#1a4a2a';cx.lineWidth=1;
  cx.beginPath();cx.moveTo(60,88);cx.lineTo(W-60,88);cx.stroke();
  const items=['SOUND EFFECTS','MUSIC','CONTROLS','CHEAT MODE'];
  const startY=130,rowH=80;
  for(let i=0;i<4;i++){
    const y=startY+i*rowH,sel=i===G.optSel;
    cx.textAlign='center';
    cx.fillStyle=sel?'#aaffcc':'#668';cx.shadowBlur=sel?4:0;cx.shadowColor='#0f8';
    cx.font='bold 13px monospace';
    cx.fillText((sel?'▶ ':'')+items[i],W/2,y);
    if(i===0||i===1){
      const vol=i===0?G.sfxVol:G.musVol;
      const slotW=22,gap=4,totalW=10*(slotW+gap)-gap;
      const slotX=W/2-totalW/2;
      for(let s=0;s<10;s++){
        const filled=s<vol;
        cx.fillStyle=filled?(sel?'#0f8':'#2a6a4a'):'#1a2a22';
        if(filled&&sel){cx.shadowColor='#0f8';cx.shadowBlur=6;}else{cx.shadowBlur=0;}
        cx.fillRect(slotX+s*(slotW+gap),y+14,slotW,12);
      }
      cx.shadowBlur=0;
      cx.fillStyle='#446';cx.font='11px monospace';cx.textAlign='center';
      cx.fillText(vol*10+'%',W/2,y+42);
    } else if(i===2){
      cx.fillStyle=sel?'#446':'#334';cx.font='11px monospace';cx.textAlign='center';
      cx.fillText(sel?'ENTER OR ► TO OPEN':'',W/2,y+18);
    } else {
      const on=G.cheatMode;
      cx.fillStyle=on?(sel?'#ff8':'#664'):(sel?'#446':'#334');
      cx.shadowColor=on?'#ff8':'#0f8';cx.shadowBlur=on&&sel?8:0;
      cx.font='bold 13px monospace';cx.textAlign='center';
      cx.fillText(on?'ON':'OFF',W/2,y+18);
      cx.shadowBlur=0;
    }
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText('↑↓ SELECT   ◄► ADJUST / OPEN   ESC BACK',W/2,H-18);
  cx.restore();drGPI();scanlines();
}

function drawControls(){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#0f8';cx.shadowBlur=20;cx.fillStyle='#0f8';
  cx.font='bold 28px monospace';cx.fillText('CONTROLS',W/2,44);
  cx.shadowBlur=0;cx.strokeStyle='#1a4a2a';cx.lineWidth=1;
  cx.beginPath();cx.moveTo(60,58);cx.lineTo(W-60,58);cx.stroke();
  const col0=160,col1=370,col2=580;
  cx.font='bold 11px monospace';cx.fillStyle='#446';
  cx.textAlign='left';cx.fillText('ACTION',col0,78);
  cx.textAlign='center';
  cx.fillStyle=G.optCol===0?'#0f8':'#446';cx.fillText('KEYBOARD',col1,78);
  cx.fillStyle=G.optCol===1?'#0f8':'#446';cx.fillText('GAMEPAD',col2,78);
  cx.beginPath();cx.moveTo(60,84);cx.lineTo(W-60,84);cx.strokeStyle='#1a4a2a';cx.stroke();
  cx.font='13px monospace';
  const rowH=36,startY=106;
  for(let i=0;i<ACT_DEFS.length;i++){
    const a=ACT_DEFS[i],y=startY+i*rowH,sel=i===G.ctrlSel;
    const listeningKey=sel&&G.optListen==='key',listeningBtn=sel&&G.optListen==='btn';
    if(sel){cx.fillStyle='rgba(0,255,136,.07)';cx.fillRect(55,y-18,W-110,rowH-4);}
    cx.textAlign='left';cx.fillStyle=sel?'#aaffcc':'#557';cx.shadowBlur=0;
    if(sel){cx.shadowColor='#0f8';cx.shadowBlur=4;}
    cx.fillText((sel?'▶ ':'')+a.label,col0,y);
    cx.textAlign='center';
    if(listeningKey){
      if(G.fr%30<15){cx.fillStyle='#ff0';cx.shadowColor='#ff0';cx.shadowBlur=10;cx.fillText('PRESS KEY...',col1,y);}
    } else {
      cx.fillStyle=sel&&G.optCol===0?'#0f8':'#668';
      cx.shadowColor='#0f8';cx.shadowBlur=sel&&G.optCol===0?6:0;
      cx.fillText('['+fmtKey(BND[a.id].key)+']',col1,y);
    }
    if(listeningBtn){
      if(G.fr%30<15){cx.fillStyle='#ff0';cx.shadowColor='#ff0';cx.shadowBlur=10;cx.fillText('PRESS BTN...',col2,y);}
    } else {
      cx.fillStyle=sel&&G.optCol===1?'#0f8':'#668';
      cx.shadowColor='#0f8';cx.shadowBlur=sel&&G.optCol===1?6:0;
      cx.fillText('['+fmtBtn(BND[a.id].btn)+']',col2,y);
    }
  }
  cx.shadowBlur=0;
  const ry=startY+ACT_DEFS.length*rowH+8,rsel=G.ctrlSel===ACT_DEFS.length;
  cx.beginPath();cx.moveTo(60,ry-24);cx.lineTo(W-60,ry-24);cx.strokeStyle='#1a4a2a';cx.stroke();
  cx.textAlign='center';
  cx.fillStyle=rsel?'#f84':'#446';cx.shadowColor='#f84';cx.shadowBlur=rsel?8:0;
  cx.font='bold 13px monospace';cx.fillText(rsel?'▶ RESET TO DEFAULTS':'RESET TO DEFAULTS',W/2,ry);
  cx.shadowBlur=0;
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('↑↓ SELECT ROW   ◄► SWITCH COLUMN   ENTER REMAP   ESC BACK',W/2,H-18);
  cx.restore();drGPI();scanlines();
}

// ===================== MAIN LOOP =====================
function update(){
  pollGP();
  const st=G.st;
  if(st==='options'){
    if(jp('ArrowUp')||jp('KeyW')||GP.menuUp)G.optSel=Math.max(0,G.optSel-1);
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.optSel=Math.min(3,G.optSel+1);
    if(G.optSel===0){
      if(jp('ArrowLeft')||GP.menuLeft){G.sfxVol=Math.max(0,G.sfxVol-1);tone(900,.04,'square',.05);}
      if(jp('ArrowRight')||GP.menuRight){G.sfxVol=Math.min(10,G.sfxVol+1);tone(900,.04,'square',.05);}
    } else if(G.optSel===1){
      if(jp('ArrowLeft')||GP.menuLeft)G.musVol=Math.max(0,G.musVol-1);
      if(jp('ArrowRight')||GP.menuRight)G.musVol=Math.min(10,G.musVol+1);
    } else if(G.optSel===2){
      if(iEnter()||jp('ArrowRight')||GP.thrustj||GP.menuRight){G.ctrlSel=0;G.optCol=0;G.optListen=null;G.st='controls';return;}
    } else if(G.optSel===3){
      if(iEnter()||jp('ArrowLeft')||jp('ArrowRight')||GP.menuLeft||GP.menuRight){G.cheatMode=!G.cheatMode;tone(G.cheatMode?1200:400,.08,'square',.05);}
    }
    if(iPause()){G.st=G.optFrom;if(G.optFrom!=='title')G.paused=true;}
    return;
  }
  if(st==='controls'){
    if(G.optListen){
      if(jp('Escape')||GP.startj){G.optListen=null;GP.startj=false;}
      return;
    }
    const nRows=ACT_DEFS.length+1;
    if(jp('ArrowUp')||jp('KeyW')||GP.menuUp)G.ctrlSel=Math.max(0,G.ctrlSel-1);
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.ctrlSel=Math.min(nRows-1,G.ctrlSel+1);
    if(jp('ArrowLeft')||GP.menuLeft)G.optCol=0;
    if(jp('ArrowRight')||GP.menuRight)G.optCol=1;
    if(iEnter()||jp('Space')||GP.thrustj){
      if(G.ctrlSel===ACT_DEFS.length){
        ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});saveBND();
      } else {
        G.optListen=G.optCol===0?'key':'btn';
      }
    }
    if(iPause()){G.st='options';G.optListen=null;}
    return;
  }
  if(st==='title'){
    if(jp('ArrowUp')||jp('KeyW')||GP.menuUp)G.titleSel=0;
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.titleSel=1;
    if(iEnter()){ia();if(G.titleSel===0){G.bounty=0;G.credits=0;G.cleared=[false,false,false];G.lvState={};G.hbCleared=false;G.hbState=null;G.slipgateActive=false;G.slipMsg=0;G.seed=(Math.random()*0xFFFFFFFF)>>>0;genWorld(G.seed);playerWeapon=WEAPONS[0];secondaryWeapon=WEAPONS[2];const _sgp=owPos(SLIPGATE);initOW(100,_sgp.x,_sgp.y);}else{G.optFrom='title';G.st='options';}}
    return;
  }
  if(st==='rebuild'){if(iEnter()){ia();doRebuild();}return;}
  if(st==='over'||st==='done'){if(iEnter()){ia();if(st==='over'){G.st='title';}else{G.bounty=0;G.credits=0;G.cleared=[false,false,false];G.lvState={};G.st='title';}}return;}
  if(st==='dead_ow'||st==='dead_enc'||st==='dead_cv')return;
  if(st==='base'){
    const s=G.OW.s;
    const repairCost=(s.maxHp-s.hp)*100;
    const rechargeCost=Math.ceil((s.maxEnergy-s.energy)*10);
    if(jp('ArrowUp')||jp('KeyW')||GP.menuUp)G.baseSel=Math.max(0,G.baseSel-1);
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.baseSel=Math.min(2,G.baseSel+1);
    if(iEnter()||iFir()){
      if(G.baseSel===0){
        if(s.hp>=s.maxHp||G.credits<repairCost)tone(80,.1,'square',.06);
        else{G.credits-=repairCost;s.hp=s.maxHp;tone(660,.2,'sine',.08);}
      }else if(G.baseSel===1){
        if(s.energy>=s.maxEnergy||G.credits<rechargeCost)tone(80,.1,'square',.06);
        else{G.credits-=rechargeCost;s.energy=s.maxEnergy;tone(660,.2,'sine',.08);}
      }else{G.st='overworld';}
    }
    if(iPause())G.st='overworld';
    return;
  }
  if(st==='slipgate'){
    if(G.slipgateActive&&(iEnter()||iFir())){ia();doJump();return;}
    if(iPause())G.st='overworld';
    return;
  }
  if(iPause()){
    if(G.paused){G.paused=false;}
    else{G.paused=true;G.pauseSel=0;}
    return;
  }
  if(G.paused){
    const PITEMS=pauseItems();
    if(jp('ArrowUp')||jp('KeyW')||GP.menuUp)G.pauseSel=Math.max(0,G.pauseSel-1);
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.pauseSel=Math.min(PITEMS.length-1,G.pauseSel+1);
    if(iEnter()||GP.thrustj){
      if(G.pauseSel===0){G.paused=false;}
      else if(G.pauseSel===1){G.optFrom=st;G.paused=false;G.st='options';}
      else if(G.cheatMode&&G.pauseSel===2){
        G.OW.s.hp=G.OW.s.maxHp;G.OW.s.energy=G.OW.s.maxEnergy;
        if(G.ENC){G.ENC.s.hp=G.ENC.s.maxHp;G.ENC.s.energy=G.ENC.s.maxEnergy;}
        tone(660,.2,'sine',.08);G.paused=false;
      }
      else if(G.cheatMode&&G.pauseSel===3){
        const sgp=owPos(SLIPGATE);G.OW.s.x=sgp.x;G.OW.s.y=sgp.y;G.OW.s.vx=0;G.OW.s.vy=0;
        if(G.ENC){G.ENC=null;G.CV=null;}G.st='overworld';G.paused=false;
      }
      else if(G.cheatMode&&G.pauseSel===4){
        G.cleared=[true,true,true];G.slipgateActive=true;G.slipMsg=360;
        if(G.ENC){G.ENC=null;G.CV=null;}G.st='overworld';G.paused=false;
      }
      else if(G.cheatMode&&G.pauseSel===5){G.credits+=10000;tone(880,.15,'sine',.07);G.paused=false;}
      else if(G.cheatMode&&G.pauseSel===6){G.credits=0;tone(220,.15,'sawtooth',.07);G.paused=false;}
      else if(G.pauseSel===PITEMS.length-1){G.paused=false;G.ENC=null;G.CV=null;G.st='title';}
    }
    return;
  }
  if(st==='overworld')updOW();
  else if(st==='enc_in'||st==='encounter'){if(st==='enc_in'&&G.ENC.introTimer>0){G.ENC.introTimer--;if(G.ENC.introTimer===0)G.st='encounter';}else updEnc();}
  else if(st==='play'||st==='esc')updCV();
}

function draw(){
  const st=G.st;
  if(st==='title')return drawTitle();
  if(st==='options')return drawOptions();
  if(st==='controls')return drawControls();
  if(st==='over')return drawScreen('GAME OVER','','#f40','ENTER OR START TO CONTINUE');
  if(st==='rebuild')return drawRebuild();
  if(st==='done')return drawScreen('SECTOR LIBERATED!','CREDITS  '+G.credits,'#fd0','ENTER OR START TO PLAY AGAIN');
  if(st==='base')return drawBaseMenu();
  if(st==='slipgate')return drawSlipgateMenu();
  if(st==='overworld'||st==='dead_ow'){drawOW();if(st==='dead_ow'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}}
  else if(st==='enc_in'||st==='encounter'||st==='dead_enc'){drawEnc();if(st==='dead_enc'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}}
  else drawCV();
  scanlines();
  if(G.paused)drawPause();
}

function loop(){update();draw();G.fr++;requestAnimationFrame(loop);}
G.seed=(Math.random()*0xFFFFFFFF)>>>0;genWorld(G.seed);
loop();
