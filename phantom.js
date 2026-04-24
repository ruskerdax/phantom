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
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.code))e.preventDefault();
  if(G&&G.optListen==='key'){
    const blocked=['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','Tab','Escape'];
    if(e.code==='Escape'){G.optListen=null;}
    else if(!blocked.includes(e.code)){BND[ACT_DEFS[G.optSel].id].key=e.code;saveBND();G.optListen=null;}
    e.preventDefault();
  }
},{passive:false});
document.addEventListener('keyup',e=>K[e.code]=false);
CV.addEventListener('click',()=>ia());
function jp(c){const v=K[c+'j'];K[c+'j']=false;return!!v;}

// Action bindings
const ACT_DEFS=[
  {id:'rotLeft', label:'ROTATE LEFT',  defKey:'ArrowLeft', defBtn:14},
  {id:'rotRight',label:'ROTATE RIGHT', defKey:'ArrowRight',defBtn:15},
  {id:'thrust',  label:'THRUST',       defKey:'ArrowUp',   defBtn:0},
  {id:'fire',    label:'FIRE',         defKey:'Space',     defBtn:2},
  {id:'shield',  label:'SHIELD',       defKey:'ShiftLeft', defBtn:4},
  {id:'pause',   label:'PAUSE',        defKey:'Escape',    defBtn:9},
];
let BND={};ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});
try{const s=localStorage.getItem('phantom_bnd');if(s){const p=JSON.parse(s);Object.keys(p).forEach(k=>{if(BND[k])BND[k]=p[k];});}}catch(e){}
function saveBND(){try{localStorage.setItem('phantom_bnd',JSON.stringify(BND));}catch(e){}}
function fmtKey(c){return({ArrowLeft:'◄ LEFT',ArrowRight:'► RIGHT',ArrowUp:'▲ UP',ArrowDown:'▼ DOWN',Space:'SPACE',ShiftLeft:'L-SHIFT',ShiftRight:'R-SHIFT',Enter:'ENTER',Escape:'ESC',KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyQ:'Q',KeyE:'E',KeyR:'R',KeyF:'F',KeyZ:'Z',KeyX:'X',KeyC:'C',ControlLeft:'L-CTRL',AltLeft:'L-ALT',Tab:'TAB'})[c]||c.replace('Key','').replace('Digit','');}
function fmtBtn(i){const n=['A','B','X','Y','LB','RB','LT','RT','SEL','START','L3','R3','↑','↓','◄','►'];return n[i]!==undefined?n[i]:'BTN'+i;}

// Gamepad
let GP={connected:false,id:'',axL:0,thrust:false,fire:false,shield:false,startj:false,menuUp:false,menuDown:false,menuLeft:false,menuRight:false,thrustj:false};
let _gfh=false,_gsh=false,_gmuh=false,_gmdh=false,_gmlh=false,_gmrh=false,_gtjh=false,_gprev=[];
window.addEventListener('gamepadconnected',e=>{GP.connected=true;GP.id=e.gamepad.id;ia();tone(660,.2,'sine',.08);});
window.addEventListener('gamepaddisconnected',()=>{GP.connected=false;GP.id='';});
function bpressed(bt,i){return!!(bt[i]&&(bt[i].pressed||bt[i].value>.3));}
function pollGP(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;
  for(const p of pads){if(p&&p.connected){gp=p;GP.connected=true;GP.id=p.id.slice(0,36);break;}}
  if(!gp){GP.axL=0;GP.thrust=false;GP.fire=false;GP.shield=false;GP.startj=false;GP.menuUp=false;GP.menuDown=false;GP.menuLeft=false;GP.menuRight=false;GP.thrustj=false;_gprev=[];return;}
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
function iEnter(){return!!(jp('Enter')||jp('NumpadEnter')||GP.startj);}
function iPause(){return!!(kjust('pause')||GP.startj);}

// Static starfield
const STARS=(()=>{const a=[];for(let i=0;i<220;i++)a.push({x:Math.random()*W,y:Math.random()*H,r:.3+Math.random()*1.4,ph:Math.random()*Math.PI*2,ci:i%5});return a;})();
const SCOLS=['#ffffff','#aaaaff','#ffeebb','#aaffee','#ffaaaa'];

// Cave geometry — uses LV from gen.js, dseg/pip from util.js
function wHit(x,y,r,li){if(y<0)return false;const d=LV[li],t=d.terrain;for(let i=0;i<t.length-1;i++)if(dseg(x,y,t[i][0],t[i][1],t[i+1][0],t[i+1][1])<r)return true;if(!pip(x,y,t))return true;for(const o of d.obs){if(pip(x,y,o))return true;for(let i=0;i<o.length;i++){const j=(i+1)%o.length;if(dseg(x,y,o[i][0],o[i][1],o[j][0],o[j][1])<r)return true;}}return false;}

// Game state
let G={st:'title',score:0,hi:0,fr:0,lv:0,cleared:[false,false,false],OW:null,ENC:null,CV:null,paused:false,pauseSel:0,titleSel:0,optFrom:'title',optSel:0,sfxVol:10,musVol:10,ctrlSel:0,optCol:0,optListen:null,seed:0};
function addSc(n){G.score+=n;if(G.score>G.hi)G.hi=G.score;}
const ENERGY_PICKUP=38;
function pickupEnergy(s,x,y,pts,col){s.energy=Math.min(100,s.energy+ENERGY_PICKUP);tone(660,.15,'sine',.08);boomAt(pts,x,y,col,8);}
function boomAt(pts,x,y,c,n=14){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.7+Math.random()*3;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:22+Math.random()*28,ml:50,c});}}
function updPts(pts,gy=0){for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=gy;p.l--;if(p.l<=0)pts.splice(i,1);}}
function mkShip(x,y){return{x,y,vx:0,vy:0,a:0,energy:100,alive:true,inv:120,scd:0,shld:false,hp:15,maxHp:15};}
let playerWeapon=WEAPONS[0];

// ===================== OVERWORLD =====================
function owEnemyPos(t){
  const a=Math.random()*Math.PI*2,d=240+Math.random()*180;
  return{t,x:Math.max(40,Math.min(W-40,W/2+Math.cos(a)*d)),y:Math.max(40,Math.min(H-40,H/2+Math.sin(a)*d)),vx:0,vy:0,a:0,alive:true,spin:0,flash:0};
}
function initOW(energy,sx,sy){
  G.OW={s:mkShip(sx??W/2,sy??280),en:[owEnemyPos(0),owEnemyPos(1),owEnemyPos(2)],fu:[],pts:[],nearP:-1};
  G.OW.s.energy=energy??100;G.OW.s.inv=120;
  G.st='overworld';
}
function owKillShip(){
  const ow=G.OW,s=ow.s;if(!s.alive)return;
  s.alive=false;boomAt(ow.pts,s.x,s.y,'#fff',28);boomAt(ow.pts,s.x,s.y,'#fa0',16);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_ow';
  setTimeout(()=>{G.st='over';},1800);
}
function owStartEnc(idx){
  const ow=G.OW,e=ow.en[idx],et=OET[e.t],ec=et.enc;
  const ens=[];
  if(ec.cnt===1){
    ens.push({x:EW-160,y:EH/2+(Math.random()*80-40),vx:0,vy:0,a:Math.PI,hp:ec.hp,mhp:ec.hp,timer:ec.fr,alive:true,t:e.t,spin:0});
  } else {
    for(let i=0;i<ec.cnt;i++){const a=(i/ec.cnt)*Math.PI*2;ens.push({x:EW-200+Math.cos(a)*60,y:EH/2+Math.sin(a)*60,vx:0,vy:0,a:Math.PI,hp:ec.hp,mhp:ec.hp,timer:ec.fr+i*18,alive:true,t:e.t,spin:0});}
  }
  const rng=mkRNG(seedChild(G.seed,200+idx));
  const rocks=[];
  const rockCount=rng.int(5,12);
  const spawnX=EW*.08,spawnY=EH/2,minSpawnDist=120;
  const tierDefs=[{r:[26,8],hp:18},{r:[17,5],hp:9},{r:[9,4],hp:3}];
  for(let i=0;i<rockCount;i++){
    let rx,ry,attempts=0;
    do{rx=rng.fl(60,EW-60);ry=rng.fl(60,EH-60);attempts++;}
    while(Math.hypot(rx-spawnX,ry-spawnY)<minSpawnDist&&attempts<30);
    const tier=rng.int(0,2);const td=tierDefs[tier];
    rocks.push({x:rx,y:ry,vx:rng.fl(-.55,.55),vy:rng.fl(-.55,.55),r:td.r[0]+rng.fl(0,td.r[1]),hp:td.hp,maxHp:td.hp,tier});
  }
  const encShip=mkShip(EW*.08,EH/2);encShip.energy=Math.max(30,ow.s.energy);encShip.inv=90;
  encShip.hp=ow.s.hp;encShip.maxHp=ow.s.maxHp;
  G.ENC={owIdx:idx,et:e.t,label:et.enc.cnt>1?'SWARM ATTACK':et.name+' ENCOUNTER',
    s:encShip,en:ens,rocks,bul:[],ebu:[],fu:[],pts:[],introTimer:70,cleared:false,
    cam:{x:0,y:Math.max(0,EH/2-H/2)}};
  G.st='enc_in';
  tone(180,.1,'square',.09);setTimeout(()=>tone(360,.2,'square',.09),120);setTimeout(()=>tone(540,.3,'square',.09),260);
}
function updOW(){
  const ow=G.OW;updPts(ow.pts);
  for(let i=ow.fu.length-1;i>=0;i--){const f=ow.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,W);f.y=wrap(f.y+f.vy,H);if(--f.timer<=0){ow.fu.splice(i,1);continue;}if(Math.hypot(ow.s.x-f.x,ow.s.y-f.y)<20&&ow.s.alive){pickupEnergy(ow.s,f.x,f.y,ow.pts,'#0f8');ow.fu.splice(i,1);}}
  const s=ow.s;if(!s.alive)return;
  s.a+=iRot()*.075;s.shld=false;
  if(iThr()&&s.energy>0){s.vx+=Math.sin(s.a)*.09;s.vy-=Math.cos(s.a)*.09;s.energy=Math.max(0,s.energy-.07);}
  const sp=Math.hypot(s.vx,s.vy);if(sp>4.2){s.vx=s.vx/sp*4.2;s.vy=s.vy/sp*4.2;}
  s.x=wrap(s.x+s.vx,W);s.y=wrap(s.y+s.vy,H);
  if(s.scd>0)s.scd--;if(s.inv>0)s.inv--;
  ow.nearP=-1;
  for(let i=0;i<LV.length;i++){if(G.cleared[i])continue;if(Math.hypot(s.x-PP[i].x,s.y-PP[i].y)<LV[i].pr+28){ow.nearP=i;break;}}
  if(iFir()&&ow.nearP>=0){G.lv=ow.nearP;enterLv();return;}
  for(let i=0;i<ow.en.length;i++){
    const e=ow.en[i];if(!e.alive)continue;
    const et=OET[e.t];e.spin+=.04+e.t*.015;
    const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1;
    const ta=Math.atan2(dx,-dy);
    e.a+=angDiff(e.a,ta)*.07;
    e.vx+=Math.sin(e.a)*et.owSpd*.05;e.vy-=Math.cos(e.a)*et.owSpd*.05;
    e.vx*=.970;e.vy*=.970;const es=Math.hypot(e.vx,e.vy);if(es>et.owSpd){e.vx=e.vx/es*et.owSpd;e.vy=e.vy/es*et.owSpd;}
    e.x=wrap(e.x+e.vx,W);e.y=wrap(e.y+e.vy,H);
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
  setTimeout(()=>{G.st='over';},1800);
}
function encWin(){
  const enc=G.ENC,et=OET[enc.et],ow=G.OW;
  ow.en[enc.owIdx].alive=false;
  ow.s.energy=Math.max(ow.s.energy,enc.s.energy);
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
  updPts(enc.pts);
  const s=enc.s;if(!s.alive)return;
  for(let i=enc.fu.length-1;i>=0;i--){const f=enc.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,EW);f.y=wrap(f.y+f.vy,EH);if(--f.timer<=0){enc.fu.splice(i,1);continue;}if(Math.hypot(s.x-f.x,s.y-f.y)<18){pickupEnergy(s,f.x,f.y,enc.pts,'#0f8');enc.fu.splice(i,1);}}
  s.a+=iRot()*.065;s.shld=iShd(s.energy);
  if(s.shld)s.energy=Math.max(0,s.energy-.15);
  if(iThr()&&s.energy>0&&!s.shld){s.vx+=Math.sin(s.a)*.12;s.vy-=Math.cos(s.a)*.12;s.energy=Math.max(0,s.energy-.08);}
  const sp=Math.hypot(s.vx,s.vy);if(sp>5){s.vx=s.vx/sp*5;s.vy=s.vy/sp*5;}
  if(enc.cleared){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>EW+30||s.y<-30||s.y>EH+30){encWin();return;}}else{s.x=wrap(s.x+s.vx,EW);s.y=wrap(s.y+s.vy,EH);}
  if(s.scd>0)s.scd--;if(s.inv>0)s.inv--;
  enc.cam.x+=(Math.max(0,Math.min(EW-W,s.x-W*.5))-enc.cam.x)*.12;
  enc.cam.y+=(Math.max(0,Math.min(EH-H,s.y-H*.5))-enc.cam.y)*.12;
  for(const rk of enc.rocks){rk.x=wrap(rk.x+rk.vx,EW);rk.y=wrap(rk.y+rk.vy,EH);}
  for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(s.inv<=0&&Math.hypot(s.x-rk.x,s.y-rk.y)<rk.r+7){
    const spd=Math.hypot(s.vx,s.vy);
    const rd=Math.hypot(s.x-rk.x,s.y-rk.y)||1;const nx=(s.x-rk.x)/rd;const ny=(s.y-rk.y)/rd;
    const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.x+=nx*10;s.y+=ny*10;
    const dmg=Math.round((spd/5.5)*5);
    if(!s.shld&&dmg>0){s.hp=Math.max(0,s.hp-dmg);s.inv=40;tone(180,.15,'sawtooth',.12);}
    if(dmg>0){rk.hp-=dmg;boomAt(enc.pts,rk.x,rk.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);}
    if(s.hp<=0){encKillShip();return;}break;
  }}
  if(iFir()&&!s.shld&&!s.scd){const wp=playerWeapon;enc.bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*wp.spd+s.vx*.3,vy:-Math.cos(s.a)*wp.spd+s.vy*.3,l:wp.life,dmg:wp.dmg});s.scd=wp.cd;tone(900,.04,'square',.05);}
  for(let i=enc.bul.length-1;i>=0;i--){
    const b=enc.bul[i];b.x=wrap(b.x+b.vx,EW);b.y=wrap(b.y+b.vy,EH);if(--b.l<=0){enc.bul.splice(i,1);continue;}
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
    for(const e of enc.en){if(!e.alive)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<OET[e.t].enc.r){e.hp-=b.dmg;tone(400,.05,'square',.06);boomAt(enc.pts,b.x,b.y,OET[e.t].enc.col,5);if(e.hp<=0){e.alive=false;addSc(OET[e.t].sc);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col,14);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col2,8);tone(200,.3,'sawtooth',.1);if(OET[e.t].energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}hit=true;break;}}
    if(hit)enc.bul.splice(i,1);
  }
  const alive=enc.en.filter(e=>e.alive);
  if(alive.length===0&&!enc.cleared){enc.cleared=true;tone(880,.3,'sine',.07);}
  for(const e of alive){
    const ec=OET[e.t].enc;if(e.t!==2)e.spin+=.05+e.t*.02;
    const dx=s.x-e.x,dy=s.y-e.y,dist=Math.hypot(dx,dy)||1,ta=Math.atan2(dx,-dy);
    if(e.t===0){e.a+=angDiff(e.a,ta)*.08;e.vx+=Math.sin(e.a)*ec.spd*.07;e.vy-=Math.cos(e.a)*ec.spd*.07;}
    else if(e.t===1){const orb=ta+Math.PI/2;e.a+=angDiff(e.a,ta)*.09;e.vx+=(dx/dist)*ec.spd*.05+(Math.cos(orb))*ec.spd*.04;e.vy+=(dy/dist)*ec.spd*.05+(Math.sin(orb))*ec.spd*.04;}
    else{e.a+=angDiff(e.a,ta)*.04;if(dist>140)e.vx+=Math.sin(e.a)*ec.spd*.06;else if(dist<80){e.vx-=(dx/dist)*.04;e.vy-=(dy/dist)*.04;}e.vy-=Math.cos(e.a)*ec.spd*.04*(dist>100?1:-1);}
    e.vx*=.975;e.vy*=.975;const es=Math.hypot(e.vx,e.vy);if(es>ec.spd){e.vx=e.vx/es*ec.spd;e.vy=e.vy/es*ec.spd;}
    e.x=wrap(e.x+e.vx,EW);e.y=wrap(e.y+e.vy,EH);
    for(const rk of enc.rocks){const rd=Math.hypot(e.x-rk.x,e.y-rk.y);if(rd<rk.r+16){e.vx+=(e.x-rk.x)/rd*.3;e.vy+=(e.y-rk.y)/rd*.3;}}
    if(--e.timer<=0){
      e.timer=ec.fr+Math.floor(Math.random()*40-20);
      if(e.t===1){for(let k=0;k<3;k++){const ba=e.spin+k*Math.PI*2/3;enc.ebu.push({x:e.x+Math.sin(ba)*10,y:e.y-Math.cos(ba)*10,vx:Math.sin(ba)*3.2,vy:-Math.cos(ba)*3.2,l:140});}}
      else if(e.t===2){for(let k=-1;k<=1;k++){const ba=ta+k*.2;enc.ebu.push({x:e.x+Math.sin(ba)*22,y:e.y-Math.cos(ba)*22,vx:Math.sin(ba)*3.8,vy:-Math.cos(ba)*3.8,l:160});}}
      else{enc.ebu.push({x:e.x+Math.sin(ta)*14,y:e.y-Math.cos(ta)*14,vx:Math.sin(ta)*4.5,vy:-Math.cos(ta)*4.5,l:150});}
      tone(550+e.t*80,.04,'square',.03);
    }
    if(s.inv<=0&&Math.hypot(e.x-s.x,e.y-s.y)<ec.r+9){
      if(s.shld){e.vx-=(dx/dist)*2;e.vy-=(dy/dist)*2;}
      else{s.hp=Math.max(0,s.hp-3);s.inv=50;tone(380,.1,'sawtooth',.1);if(s.hp<=0){encKillShip();return;}}
    }
  }
  for(let i=enc.ebu.length-1;i>=0;i--){
    const b=enc.ebu[i];b.x=wrap(b.x+b.vx,EW);b.y=wrap(b.y+b.vy,EH);if(--b.l<=0){enc.ebu.splice(i,1);continue;}
    let rm=false;for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(Math.hypot(b.x-rk.x,b.y-rk.y)<rk.r){rk.hp--;boomAt(enc.pts,b.x,b.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);rm=true;break;}}if(rm){enc.ebu.splice(i,1);continue;}
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
  const d=LV[G.lv],ow=G.OW;
  G.CV={d,s:{...mkShip(d.ent.x,d.ent.y),energy:Math.max(25,ow?ow.s.energy:100),
             hp:ow?ow.s.hp:15,maxHp:ow?ow.s.maxHp:15},
    en:d.en.map(e=>({...e,alive:true,timer:20+Math.floor(Math.random()*80)})),
    fu:d.fu.map(f=>({...f,got:false})),
    rx:{...d.rx,alive:true},bul:[],ebu:[],pts:[],rdone:false,esc:0,cam:{x:0,y:0}};
  G.st='play';
}
function cvKillShip(){
  const cv=G.CV,s=cv.s;if(!s.alive)return;
  s.alive=false;boomAt(cv.pts,s.x,s.y,'#fff',28);boomAt(cv.pts,s.x,s.y,'#fa0',18);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_cv';
  setTimeout(()=>{G.st='over';},1800);
}
function updCV(){
  const cv=G.CV;updPts(cv.pts,.06);
  const s=cv.s,d=cv.d;if(!s.alive)return;
  s.a+=iRot()*.065;s.shld=iShd(s.energy);
  if(s.shld)s.energy=Math.max(0,s.energy-.17);
  if(iThr()&&s.energy>0&&!s.shld){s.vx+=Math.sin(s.a)*.13;s.vy-=Math.cos(s.a)*.13;s.energy=Math.max(0,s.energy-.09);}
  s.vy+=d.grav;s.vx*=.9985;s.vy*=.9985;const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx=s.vx/sp*5.5;s.vy=s.vy/sp*5.5;}
  s.x+=s.vx;s.y+=s.vy;
  if(s.scd>0)s.scd--;if(s.inv>0)s.inv--;
  const wH=d.worldH||H;
  const tcy=Math.max(0,Math.min(wH-H,s.y-H*.45));
  cv.cam.y+=(tcy-cv.cam.y)*.12;
  if(s.y<0){
    if(G.st==='esc'){
      addSc(1000);tone(660,.4,'sine',.1);G.cleared[G.lv]=true;
      if(G.cleared.every(c=>c)){G.st='done';return;}
      const pi=G.lv;initOW(s.energy,PP[pi].x,Math.max(80,PP[pi].y-LV[pi].pr-55));
      G.OW.s.hp=s.hp;G.OW.s.maxHp=s.maxHp;G.OW.s.vy=-1.2;return;
    } else{s.y=4;s.vy=Math.abs(s.vy)*.5+.5;}return;
  }
  if(wHit(s.x,s.y,9,G.lv)){cvBounce(s);if(s.hp<=0){cvKillShip();return;}}
  for(const f of cv.fu){if(!f.got&&Math.hypot(s.x-f.x,s.y-f.y)<22){f.got=true;pickupEnergy(s,f.x,f.y,cv.pts,d.col);}}
  if(G.st==='esc'){cv.esc--;if(cv.esc<=0){cvKillShip();return;}}
  if(iFir()&&!s.shld&&!s.scd){cv.bul.push({x:s.x+Math.sin(s.a)*13,y:s.y-Math.cos(s.a)*13,vx:Math.sin(s.a)*7+s.vx*.3,vy:-Math.cos(s.a)*7+s.vy*.3,l:70});s.scd=12;tone(900,.04,'square',.05);}
  for(let i=cv.bul.length-1;i>=0;i--){
    const b=cv.bul[i];b.x+=b.vx;b.y+=b.vy;b.l--;
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){cv.bul.splice(i,1);continue;}
    let rm=false;
    for(const e of cv.en){if(!e.alive)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<13){e.alive=false;addSc(250);boomAt(cv.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);rm=true;break;}}
    if(rm){cv.bul.splice(i,1);continue;}
    const rx=cv.rx;if(rx.alive&&Math.hypot(b.x-rx.x,b.y-rx.y)<18){rx.hp--;addSc(100);tone(350,.1,'square',.08);cv.bul.splice(i,1);if(rx.hp<=0){rx.alive=false;cv.rdone=true;cv.esc=1200;G.st='esc';addSc(2000);boomAt(cv.pts,rx.x,rx.y,d.col,40);boomAt(cv.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}
  }
  for(const e of cv.en){
    if(!e.alive)continue;
    e.a+=angDiff(e.a,Math.atan2(s.x-e.x,-(s.y-e.y)))*.04;
    if(--e.timer<=0){e.timer=100+Math.floor(Math.random()*40-20);cv.ebu.push({x:e.x+Math.sin(e.a)*15,y:e.y-Math.cos(e.a)*15,vx:Math.sin(e.a)*3.5,vy:-Math.cos(e.a)*3.5,l:90});}
  }
  for(let i=cv.ebu.length-1;i>=0;i--){
    const b=cv.ebu[i];b.x+=b.vx;b.y+=b.vy;b.l--;
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
function drPts(pts){for(const p of pts){cx.save();cx.globalAlpha=Math.max(0,p.l/p.ml);cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,1.5,0,Math.PI*2);cx.fill();cx.restore();}}
function drShip(x,y,a,shld,thr,energy,inv,fr){
  if(inv>0&&fr%4>=2)return;
  cx.save();cx.translate(x,y);cx.rotate(a);
  if(shld){cx.strokeStyle='rgba(100,200,255,.8)';cx.shadowColor='#8cf';cx.shadowBlur=18;cx.lineWidth=2;cx.beginPath();cx.arc(0,0,17,0,Math.PI*2);cx.stroke();}
  cx.strokeStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=8;cx.lineWidth=1.5;
  cx.beginPath();cx.moveTo(0,-10);cx.lineTo(-7,8);cx.lineTo(0,4);cx.lineTo(7,8);cx.closePath();cx.stroke();
  if(thr&&energy>0&&!shld){cx.strokeStyle='#fb0';cx.shadowColor='#fb0';cx.shadowBlur=12;cx.beginPath();cx.moveTo(-3,7);cx.lineTo(0,13+Math.random()*6);cx.lineTo(3,7);cx.stroke();}
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
function drHUD(energy,hp=15,maxHp=15){
  cx.save();cx.font='13px monospace';cx.fillStyle='#aaffcc';cx.shadowBlur=0;
  cx.textAlign='left';cx.fillText('SCORE '+G.score,8,18);cx.fillText('HI '+G.hi,8,34);
  cx.textAlign='center';cx.fillText('',W/2,18);
  cx.textAlign='right';
  const hf=Math.max(0,hp/maxHp);
  cx.fillText('HP '+hp,W-88,17);
  cx.strokeStyle='#aaffcc';cx.lineWidth=1;cx.strokeRect(W-82,6,70,11);
  cx.fillStyle=hf>.5?'#0f8':hf>.25?'#fa0':'#f40';cx.fillRect(W-81,7,hf*68,9);
  cx.fillStyle='#aaffcc';cx.fillText('ENERGY',W-88,32);
  cx.strokeRect(W-82,21,70,11);
  cx.fillStyle=energy>20?'#0f8':'#f40';cx.fillRect(W-81,22,energy*.68,9);
  cx.restore();drGPI();
}
function drBullet(x,y,col='#fff'){cx.save();cx.fillStyle=col;cx.shadowColor=col;cx.shadowBlur=6;cx.beginPath();cx.arc(x,y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
function scanlines(){cx.save();cx.globalAlpha=.035;cx.fillStyle='#000';for(let y=0;y<H;y+=2)cx.fillRect(0,y,W,1);cx.restore();}

function drawOW(){
  cx.fillStyle='#000008';cx.fillRect(0,0,W,H);drStars();
  const ow=G.OW;
  for(let i=0;i<LV.length;i++){
    const p=PP[i],d=LV[i];
    if(G.cleared[i]){cx.save();cx.strokeStyle='#334';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();cx.fillStyle='#223';cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();cx.fillStyle='#446';cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText('CLEARED',p.x,p.y+3);cx.setLineDash([]);cx.restore();continue;}
    const pu=.5+.5*Math.sin(G.fr*.05+i);cx.save();cx.shadowColor=d.pcol;cx.shadowBlur=8+pu*14;
    cx.strokeStyle=d.pcol;cx.lineWidth=1.5;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.stroke();
    cx.fillStyle=d.bg;cx.beginPath();cx.arc(p.x,p.y,d.pr,0,Math.PI*2);cx.fill();
    cx.strokeStyle=d.col;cx.lineWidth=.8;cx.globalAlpha=.4;
    [[-8,-6,5],[7,4,7],[-4,9,4],[10,-8,3]].forEach(([cx2,cy,r])=>{cx.beginPath();cx.arc(p.x+cx2,p.y+cy,r,0,Math.PI*2);cx.stroke();});
    cx.globalAlpha=1;cx.fillStyle=d.col;cx.font='bold 10px monospace';cx.textAlign='center';cx.fillText(d.name,p.x,p.y-d.pr-8);cx.restore();
    if(ow.nearP===i){cx.save();cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.font='bold 12px monospace';cx.textAlign='center';cx.fillText('[ FIRE TO ENTER ]',p.x,p.y+d.pr+16);cx.restore();}
  }
  for(const e of ow.en)if(e.alive)drOWEnemy(e);
  for(const f of ow.fu)drEnergy(wrap(f.x,W),wrap(f.y,H),'#0f8');
  drPts(ow.pts);
  if(ow.s.alive)drShip(ow.s.x,ow.s.y,ow.s.a,ow.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust)&&ow.s.energy>0,ow.s.energy,ow.s.inv,G.fr);
  drHUD(ow.s.energy,ow.s.hp,ow.s.maxHp);
}

function drawEnc(){
  const enc=G.ENC,et=OET[enc.et];
  const camX=enc.cam?enc.cam.x:0,camY=enc.cam?enc.cam.y:0;
  cx.fillStyle='#030408';cx.fillRect(0,0,W,H);drStars();
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
  for(const f of enc.fu)drEnergy(f.x,f.y,'#0f8');
  for(const b of enc.bul)drBullet(b.x,b.y,'#fff');
  for(const b of enc.ebu)drBullet(b.x,b.y,et.enc.col);
  drPts(enc.pts);
  if(enc.s.alive)drShip(enc.s.x,enc.s.y,enc.s.a,enc.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust)&&enc.s.energy>0,enc.s.energy,enc.s.inv,G.fr);
  cx.restore();
  if(enc.introTimer>0){const a=Math.min(1,(70-enc.introTimer)/20);cx.save();cx.globalAlpha=a;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,H/2-36,W,72);cx.fillStyle=et.enc.col;cx.shadowColor=et.enc.col;cx.shadowBlur=20;cx.font='bold 32px monospace';cx.textAlign='center';cx.fillText(enc.label,W/2,H/2+4);cx.shadowBlur=0;cx.fillStyle='#668';cx.font='13px monospace';cx.fillText('DESTROY ALL ENEMIES TO ESCAPE',W/2,H/2+26);cx.globalAlpha=1;cx.restore();}
  const alive=enc.en.filter(e=>e.alive).length;
  cx.save();cx.font='13px monospace';cx.textAlign='center';
  if(enc.cleared){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6+5*Math.abs(Math.sin(G.fr*.08));cx.fillText('ALL CLEAR — LEAVE THE AREA',W/2,18);}
  else{cx.fillStyle=et.enc.col;cx.fillText(enc.label+' — '+alive+' remaining  ·  '+enc.rocks.length+' asteroids',W/2,18);}
  cx.restore();
  drHUD(enc.s.energy,enc.s.hp,enc.s.maxHp);
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
  drPts(cv.pts);
  if(cv.s.alive)drShip(cv.s.x,cv.s.y,cv.s.a,cv.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust)&&cv.s.energy>0,cv.s.energy,cv.s.inv,G.fr);
  cx.restore();
  drHUD(cv.s.energy,cv.s.hp,cv.s.maxHp);
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
  const rows=[['← → / LS','ROTATE'],['↑ / RT','THRUST'],['SPACE / X·LT','FIRE'],['SHIFT·S / LB·RB','SHIELD'],['Near a planet + FIRE','ENTER CAVE'],['',''],['Defeat enemies in space','TRIGGER ENCOUNTER'],['Destroy all in encounter','RETURN + ENERGY DROP'],['Shoot cave REACTOR','START COUNTDOWN'],['Fly out top gap','ESCAPE CAVE']];
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

function drawPause(){
  const PITEMS=['RESUME','OPTIONS','QUIT TO TITLE'];
  const pw=300,ph=200,px=W/2-pw/2,py=H/2-ph/2;
  cx.save();
  cx.fillStyle='rgba(0,0,0,.75)';cx.fillRect(0,0,W,H);
  cx.strokeStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=20;cx.lineWidth=1.5;
  cx.fillStyle='rgba(0,12,8,.95)';cx.fillRect(px,py,pw,ph);
  cx.strokeRect(px,py,pw,ph);
  cx.shadowBlur=14;cx.fillStyle='#0f8';cx.font='bold 22px monospace';cx.textAlign='center';
  cx.fillText('PAUSED',W/2,py+38);
  cx.shadowBlur=0;cx.font='13px monospace';
  for(let i=0;i<PITEMS.length;i++){
    const iy=py+80+i*36;
    const sel=i===G.pauseSel;
    if(sel){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=10;cx.fillText('▶ '+PITEMS[i],W/2,iy);}
    else{cx.fillStyle='#668';cx.shadowBlur=0;cx.fillText(PITEMS[i],W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';
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
  const items=['SOUND EFFECTS','MUSIC','CONTROLS'];
  const startY=160,rowH=90;
  for(let i=0;i<3;i++){
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
    } else {
      cx.fillStyle=sel?'#446':'#334';cx.font='11px monospace';cx.textAlign='center';
      cx.fillText(sel?'ENTER OR ► TO OPEN':'',W/2,y+18);
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
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.optSel=Math.min(2,G.optSel+1);
    if(G.optSel===0){
      if(jp('ArrowLeft')||GP.menuLeft){G.sfxVol=Math.max(0,G.sfxVol-1);tone(900,.04,'square',.05);}
      if(jp('ArrowRight')||GP.menuRight){G.sfxVol=Math.min(10,G.sfxVol+1);tone(900,.04,'square',.05);}
    } else if(G.optSel===1){
      if(jp('ArrowLeft')||GP.menuLeft)G.musVol=Math.max(0,G.musVol-1);
      if(jp('ArrowRight')||GP.menuRight)G.musVol=Math.min(10,G.musVol+1);
    } else if(G.optSel===2){
      if(iEnter()||jp('ArrowRight')||GP.thrustj||GP.menuRight){G.ctrlSel=0;G.optCol=0;G.optListen=null;G.st='controls';return;}
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
    if(iEnter()){ia();if(G.titleSel===0){G.score=0;G.cleared=[false,false,false];G.seed=(Math.random()*0xFFFFFFFF)>>>0;genWorld(G.seed);playerWeapon=WEAPONS[0];initOW(100);}else{G.optFrom='title';G.st='options';}}
    return;
  }
  if(st==='over'||st==='done'){if(iEnter()){ia();if(st==='over'){G.st='title';}else{G.score=0;G.cleared=[false,false,false];G.st='title';}}return;}
  if(st==='dead_ow'||st==='dead_enc'||st==='dead_cv')return;
  if(iPause()){
    if(G.paused){G.paused=false;}
    else{G.paused=true;G.pauseSel=0;}
    return;
  }
  if(G.paused){
    const PITEMS=['RESUME','OPTIONS','QUIT TO TITLE'];
    if(jp('ArrowUp')||jp('KeyW')||GP.menuUp)G.pauseSel=Math.max(0,G.pauseSel-1);
    if(jp('ArrowDown')||jp('KeyS')||GP.menuDown)G.pauseSel=Math.min(PITEMS.length-1,G.pauseSel+1);
    if(iEnter()||GP.thrustj){
      if(G.pauseSel===0){G.paused=false;}
      else if(G.pauseSel===1){G.optFrom=st;G.paused=false;G.st='options';}
      else if(G.pauseSel===2){G.paused=false;G.ENC=null;G.CV=null;G.st='title';}
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
  if(st==='over')return drawScreen('GAME OVER','SCORE  '+G.score,'#f40','ENTER OR START TO CONTINUE');
  if(st==='done')return drawScreen('SECTOR LIBERATED!','FINAL SCORE  '+G.score,'#fd0','ENTER OR START TO PLAY AGAIN');
  if(st==='overworld'||st==='dead_ow'){drawOW();if(st==='dead_ow'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}}
  else if(st==='enc_in'||st==='encounter'||st==='dead_enc'){drawEnc();if(st==='dead_enc'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}}
  else drawCV();
  scanlines();
  if(G.paused)drawPause();
}

function loop(){update();draw();G.fr++;requestAnimationFrame(loop);}
G.seed=(Math.random()*0xFFFFFFFF)>>>0;genWorld(G.seed);
loop();
