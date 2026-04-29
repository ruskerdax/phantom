'use strict';

// Keyboard
var K={},suppressFireUntilRelease=false;
document.addEventListener('keydown',e=>{
  if(G&&G.seedInputOpen)return;
  if(!K[e.code])ia();K[e.code]=true;if(!e.repeat)K[e.code+'j']=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyI','KeyP'].includes(e.code))e.preventDefault();
  if(G&&G.optListen==='key'){
    const blocked=['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','Tab','Escape'];
    if(e.code==='Escape'){G.optListen=null;}
    else if(!blocked.includes(e.code)){BND[ACT_DEFS[G.ctrlSel].id].key=e.code;saveBND();G.optListen=null;}
    K[e.code+'j']=false;
    e.preventDefault();
  }
},{passive:false});
document.addEventListener('keyup',e=>K[e.code]=false);
document.getElementById('g').addEventListener('click',()=>ia());
// "Just pressed" — true only on the first frame a key goes down. The one-shot flag is set in keydown and
// consumed here, so menu navigation fires once per press rather than every frame while the key is held.
function jp(c){const v=K[c+'j'];K[c+'j']=false;return!!v;}

// ===================== MENU INPUT =====================
function isRebinding(){ return G.optListen==='key' || G.optListen==='btn'; }
function suppressMenuInput(frames=6){ G.menuSuppressUntil = G.fr + frames; }
function menuInputSuppressed(){ return G.fr < (G.menuSuppressUntil||0); }
function menuInput(opts){
  const o = opts || {};
  if(isRebinding() || menuInputSuppressed()){
    return {up:false,down:false,left:false,right:false,confirm:false,cancel:false,clear:false};
  }
  const fireConfirms = o.fireConfirms !== false;
  const enterConfirm = iEnter();
  const fireConfirm = fireConfirms && kjust('fire');
  if((enterConfirm||fireConfirm)&&kdown('fire'))suppressFireUntilRelease=true;
  return {
    up:    !!(jp('ArrowUp')    || jp('KeyW') || GP.menuUp),
    down:  !!(jp('ArrowDown')  || jp('KeyS') || GP.menuDown),
    left:  !!(jp('ArrowLeft')  || kjust('rotLeft')  || GP.menuLeft),
    right: !!(jp('ArrowRight') || kjust('rotRight') || GP.menuRight),
    confirm: !!(enterConfirm || fireConfirm),
    cancel:  !!iPause(),
    clear:   !!jp('Backspace'),
  };
}

// Action bindings
var ACT_DEFS=[
  {id:'rotLeft', label:'ROTATE LEFT',  defKey:'KeyA',      defBtn:14},
  {id:'rotRight',label:'ROTATE RIGHT', defKey:'KeyD',      defBtn:15},
  {id:'thrust',  label:'THRUST',       defKey:'KeyW',      defBtn:0},
  {id:'fire',    label:'FIRE',         defKey:'KeyJ',      defBtn:2},
  {id:'fireSec', label:'FIRE SECONDARY',defKey:'KeyO',     defBtn:3},
  {id:'shield',  label:'SHIELD',       defKey:'KeyI',      defBtn:4},
  {id:'pause',   label:'PAUSE',        defKey:'KeyP',      defBtn:9},
];
var BND={};ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});
try{const s=localStorage.getItem('phantom_bnd');if(s){const p=JSON.parse(s);Object.keys(p).forEach(k=>{if(BND[k])BND[k]=p[k];});if(BND.pause&&BND.pause.key==='Escape')BND.pause.key='KeyP';}}catch(e){}
function saveBND(){try{localStorage.setItem('phantom_bnd',JSON.stringify(BND));}catch(e){}}
function fmtKey(c){return({ArrowLeft:'◄ LEFT',ArrowRight:'► RIGHT',ArrowUp:'▲ UP',ArrowDown:'▼ DOWN',Space:'SPACE',ShiftLeft:'L-SHIFT',ShiftRight:'R-SHIFT',Enter:'ENTER',Escape:'ESC',KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyP:'P',KeyQ:'Q',KeyE:'E',KeyR:'R',KeyF:'F',KeyJ:'J',KeyI:'I',KeyZ:'Z',KeyX:'X',KeyC:'C',ControlLeft:'L-CTRL',AltLeft:'L-ALT',Tab:'TAB'})[c]||c.replace('Key','').replace('Digit','');}
function fmtBtn(i){const n=['A','B','X','Y','LB','RB','LT','RT','SEL','START','L3','R3','↑','↓','◄','►'];return n[i]!==undefined?n[i]:'BTN'+i;}

// Gamepad
var GP={connected:false,id:'',axL:0,rotDigital:0,thrust:false,fire:false,fireSec:false,shield:false,startj:false,menuUp:false,menuDown:false,menuLeft:false,menuRight:false,thrustj:false};
let _gsh=false,_gmuh=false,_gmdh=false,_gmlh=false,_gmrh=false,_gtjh=false,_gprev=[];
const GP_AXIS_DEADZONE=.18;
const GP_ROT_AXIS_CURVE=1.4;
const DIGITAL_ROT_RAMP_FRAMES=36;
const DIGITAL_ROT_RAMP_CURVE=1.55;
let _rotDigitalDir=0,_rotDigitalFrames=0,_rotDigitalFrame=-1;
window.addEventListener('gamepadconnected',e=>{GP.connected=true;GP.id=e.gamepad.id;ia();tone(660,.2,'sine',.08);});
window.addEventListener('gamepaddisconnected',()=>{GP.connected=false;GP.id='';});
function bpressed(bt,i){return!!(bt[i]&&(bt[i].pressed||bt[i].value>.3));}
function shapeGPAxis(v,dead=GP_AXIS_DEADZONE,curve=GP_ROT_AXIS_CURVE){
  if(!Number.isFinite(v))return 0;
  const mag=Math.abs(v);
  if(mag<=dead)return 0;
  const norm=Math.min(1,(mag-dead)/(1-dead));
  return Math.sign(v)*Math.pow(norm,curve);
}
function pollGP(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;
  for(const p of pads){if(p&&p.connected){gp=p;GP.connected=true;GP.id=p.id.slice(0,36);break;}}
  if(!gp){GP.axL=0;GP.rotDigital=0;GP.thrust=false;GP.fire=false;GP.fireSec=false;GP.shield=false;GP.startj=false;GP.menuUp=false;GP.menuDown=false;GP.menuLeft=false;GP.menuRight=false;GP.thrustj=false;_gprev=[];return;}
  const ax=gp.axes,bt=gp.buttons,dead=GP_AXIS_DEADZONE;
  if(G&&G.optListen==='btn'){
    for(let i=0;i<bt.length;i++){
      if(bpressed(bt,i)&&!_gprev[i]){BND[ACT_DEFS[G.ctrlSel].id].btn=i;saveBND();G.optListen=null;_gsh=true;_gmuh=true;_gmdh=true;_gmlh=true;_gmrh=true;_gtjh=true;break;}
    }
  }
  _gprev=bt.map(b=>!!(b&&(b.pressed||b.value>.3)));
  const rawLx=ax[0]||0;
  const lx=shapeGPAxis(rawLx,dead);
  const ly=ax[1]||0;
  const dL=bpressed(bt,BND.rotLeft.btn),dR=bpressed(bt,BND.rotRight.btn);
  GP.rotDigital=dL?-1:dR?1:0;
  GP.axL=lx;
  const dU=bpressed(bt,12),rt=bt[7]?bt[7].value||+bt[7].pressed:0;
  const thrBtn=bpressed(bt,BND.thrust.btn);
  GP.thrust=rt>.3||dU||thrBtn;
  GP.shield=bpressed(bt,BND.shield.btn);
  GP.fire=bpressed(bt,BND.fire.btn);
  GP.fireSec=bpressed(bt,BND.fireSec.btn);
  const sn=bpressed(bt,BND.pause.btn);GP.startj=sn&&!_gsh;_gsh=sn;
  const mu=dU||(ly<-.5);GP.menuUp=mu&&!_gmuh;_gmuh=mu;
  const dD=bpressed(bt,13);
  const md=dD||(ly>.5);GP.menuDown=md&&!_gmdh;_gmdh=md;
  const ml=dL||(rawLx<-.5);GP.menuLeft=ml&&!_gmlh;_gmlh=ml;
  const mr=dR||(rawLx>.5);GP.menuRight=mr&&!_gmrh;_gmrh=mr;
  const tj=thrBtn;GP.thrustj=tj&&!_gtjh;_gtjh=tj;
}
function kdown(id){return!!K[BND[id].key];}
function kjust(id){return jp(BND[id].key);}
function digitalRotInput(dir){
  if(dir===0){
    _rotDigitalDir=0;_rotDigitalFrames=0;_rotDigitalFrame=typeof G!=='undefined'?G.fr:-1;
    return 0;
  }
  const fr=typeof G!=='undefined'?G.fr:_rotDigitalFrame+1;
  if(dir!==_rotDigitalDir){_rotDigitalDir=dir;_rotDigitalFrames=0;}
  if(fr!==_rotDigitalFrame){
    _rotDigitalFrames=Math.min(DIGITAL_ROT_RAMP_FRAMES,_rotDigitalFrames+1);
    _rotDigitalFrame=fr;
  }
  const t=Math.min(1,_rotDigitalFrames/DIGITAL_ROT_RAMP_FRAMES);
  return dir*Math.pow(t,DIGITAL_ROT_RAMP_CURVE);
}
function iRot(){
  const digital=kdown('rotLeft')?-1:kdown('rotRight')?1:GP.rotDigital;
  if(digital&&typeof G!=='undefined'&&G.st==='overworld'){
    digitalRotInput(0);
    return digital;
  }
  if(digital)return digitalRotInput(digital);
  digitalRotInput(0);
  return GP.axL;
}
function iThr(){return!!(kdown('thrust')||GP.thrust);}
function iShd(f){const ax=activeAuxObj();return !!(ax&&ax.effect==='shield'&&f>0&&(kdown('shield')||GP.shield));}
function iFir(){
  if(suppressFireUntilRelease){
    if(!kdown('fire')&&!GP.fire)suppressFireUntilRelease=false;
    else return false;
  }
  return!!(kdown('fire')||GP.fire);
}
function iFireSec(){return!!(kdown('fireSec')||GP.fireSec);}
function iEnter(){return!!(jp('Enter')||jp('NumpadEnter')||GP.thrustj);}
function iPause(){return!!(kjust('pause')||GP.startj);}
