'use strict';

// Keyboard
var K={},suppressFireUntilRelease=false;
document.addEventListener('keydown',e=>{
  if(G&&G.seedInputOpen)return;
  if(!K[e.code])ia();K[e.code]=true;if(!e.repeat)K[e.code+'j']=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Backspace','Delete','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyJ','KeyO','KeyX','KeyP'].includes(e.code))e.preventDefault();
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
function clearJust(code){if(code)K[code+'j']=false;}
function clearMenuJustPresses(){
  ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','Enter','NumpadEnter','Backspace','Delete'].forEach(clearJust);
  ACT_DEFS.forEach(a=>clearJust(BND[a.id]?.key));
  GP.menuUp=GP.menuDown=GP.menuLeft=GP.menuRight=GP.confirmj=GP.startj=false;
}
function suppressMenuInput(frames=6){ G.menuSuppressUntil = G.fr + frames; clearMenuJustPresses(); }
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
    cancel:  !!iBack(),
    clear:   !!iClear(),
  };
}

// Action bindings
var ACT_DEFS=[
  {id:'rotLeft', label:'ROTATE LEFT',  defKey:'KeyA',      defBtn:14},
  {id:'rotRight',label:'ROTATE RIGHT', defKey:'KeyD',      defBtn:15},
  {id:'thrust',  label:'THRUST',       defKey:'KeyW',      defBtn:7},
  {id:'reverse', label:'REVERSE',      defKey:'KeyS',      defBtn:6},
  {id:'strafeLeft', label:'STRAFE LEFT', defKey:'KeyQ',    defBtn:4},
  {id:'strafeRight',label:'STRAFE RIGHT',defKey:'KeyE',    defBtn:5},
  {id:'fire',    label:'FIRE',         defKey:'KeyJ',      defBtn:2},
  {id:'fireSec', label:'FIRE SECONDARY',defKey:'KeyO',     defBtn:3},
  {id:'shield',  label:'TOGGLE SHIELDS',defKey:'KeyX',     defBtn:11},
  {id:'pause',   label:'PAUSE',        defKey:'KeyP',      defBtn:9},
];
var BND={};ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});
const BND_VERSION=2,BND_VERSION_KEY='phantom_bnd_version';
try{
  const s=localStorage.getItem('phantom_bnd');
  if(s){
    const p=JSON.parse(s);
    Object.keys(p).forEach(k=>{if(BND[k])BND[k]=p[k];});
    if(BND.pause&&BND.pause.key==='Escape')BND.pause.key='KeyP';
    if(BND.shield&&BND.shield.key==='KeyI'&&BND.shield.btn===4)BND.shield={key:'KeyX',btn:11};
  }
  const v=parseInt(localStorage.getItem(BND_VERSION_KEY)||'0',10)||0;
  if(v<BND_VERSION){
    BND.thrust.btn=7;
    BND.reverse.btn=6;
    BND.strafeLeft.btn=4;
    BND.strafeRight.btn=5;
    saveBND();
  }
}catch(e){}
function saveBND(){try{localStorage.setItem('phantom_bnd',JSON.stringify(BND));localStorage.setItem(BND_VERSION_KEY,String(BND_VERSION));}catch(e){}}
function fmtKey(c){return({ArrowLeft:'◄ LEFT',ArrowRight:'► RIGHT',ArrowUp:'▲ UP',ArrowDown:'▼ DOWN',Space:'SPACE',ShiftLeft:'L-SHIFT',ShiftRight:'R-SHIFT',Enter:'ENTER',NumpadEnter:'NUM ENTER',Escape:'ESC',Backspace:'BACKSPACE',Delete:'DEL',KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyP:'P',KeyQ:'Q',KeyE:'E',KeyR:'R',KeyF:'F',KeyJ:'J',KeyI:'I',KeyZ:'Z',KeyX:'X',KeyC:'C',ControlLeft:'L-CTRL',AltLeft:'L-ALT',Tab:'TAB'})[c]||c.replace('Key','').replace('Digit','');}
function fmtBtn(i){const n=['A','B','X','Y','LB','RB','LT','RT','SEL','START','L3','R3','↑','↓','◄','►'];return n[i]!==undefined?n[i]:'BTN'+i;}

// Gamepad
var GP={connected:false,id:'',axL:0,rotDigital:0,thrust:false,reverse:false,strafeLeft:false,strafeRight:false,fire:false,fireSec:false,shield:false,shieldj:false,startj:false,menuUp:false,menuDown:false,menuLeft:false,menuRight:false,confirmj:false};
let _gsh=false,_gshield=false,_gmuh=false,_gmdh=false,_gmlh=false,_gmrh=false,_gconfirm=false,_gprev=[];
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
  if(!gp){GP.axL=0;GP.rotDigital=0;GP.thrust=false;GP.reverse=false;GP.strafeLeft=false;GP.strafeRight=false;GP.fire=false;GP.fireSec=false;GP.shield=false;GP.shieldj=false;GP.startj=false;GP.menuUp=false;GP.menuDown=false;GP.menuLeft=false;GP.menuRight=false;GP.confirmj=false;_gprev=[];return;}
  const ax=gp.axes,bt=gp.buttons,dead=GP_AXIS_DEADZONE;
  if(G&&G.optListen==='btn'){
    for(let i=0;i<bt.length;i++){
      if(bpressed(bt,i)&&!_gprev[i]){BND[ACT_DEFS[G.ctrlSel].id].btn=i;saveBND();G.optListen=null;_gsh=true;_gmuh=true;_gmdh=true;_gmlh=true;_gmrh=true;_gconfirm=true;break;}
    }
  }
  _gprev=bt.map(b=>!!(b&&(b.pressed||b.value>.3)));
  const rawLx=ax[0]||0;
  const lx=shapeGPAxis(rawLx,dead);
  const ly=ax[1]||0;
  const dL=bpressed(bt,BND.rotLeft.btn),dR=bpressed(bt,BND.rotRight.btn);
  GP.rotDigital=dL?-1:dR?1:0;
  GP.axL=lx;
  const dU=bpressed(bt,12);
  GP.thrust=bpressed(bt,BND.thrust.btn);
  GP.reverse=bpressed(bt,BND.reverse.btn);
  GP.strafeLeft=bpressed(bt,BND.strafeLeft.btn);
  GP.strafeRight=bpressed(bt,BND.strafeRight.btn);
  const sh=bpressed(bt,BND.shield.btn);GP.shield=sh;GP.shieldj=sh&&!_gshield;_gshield=sh;
  GP.fire=bpressed(bt,BND.fire.btn);
  GP.fireSec=bpressed(bt,BND.fireSec.btn);
  const sn=bpressed(bt,BND.pause.btn);GP.startj=sn&&!_gsh;_gsh=sn;
  const mu=dU||(ly<-.5);GP.menuUp=mu&&!_gmuh;_gmuh=mu;
  const dD=bpressed(bt,13);
  const md=dD||(ly>.5);GP.menuDown=md&&!_gmdh;_gmdh=md;
  const ml=dL||(rawLx<-.5);GP.menuLeft=ml&&!_gmlh;_gmlh=ml;
  const mr=dR||(rawLx>.5);GP.menuRight=mr&&!_gmrh;_gmrh=mr;
  const conf=bpressed(bt,0);GP.confirmj=conf&&!_gconfirm;_gconfirm=conf;
}
function kdown(id){return!!K[BND[id].key];}
function kjust(id){return jp(BND[id].key);}
function keyBoundToAction(code){return ACT_DEFS.some(a=>BND[a.id]?.key===code);}
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
  const instantDigital=typeof G!=='undefined'&&(G.st==='overworld'||G.st==='play'||G.st==='esc');
  if(digital&&instantDigital){
    digitalRotInput(0);
    return digital;
  }
  if(digital)return digitalRotInput(digital);
  digitalRotInput(0);
  return GP.axL;
}
function iThrustInput(){
  const forward=!!(kdown('thrust')||GP.thrust);
  const reverse=!!(kdown('reverse')||GP.reverse);
  const left=!!(kdown('strafeLeft')||GP.strafeLeft);
  const right=!!(kdown('strafeRight')||GP.strafeRight);
  const linear=(forward?1:0)-(reverse?1:0);
  const strafe=(right?1:0)-(left?1:0);
  return {
    linear,strafe,
    forward:linear>0,
    reverse:linear<0,
    strafeLeft:strafe<0,
    strafeRight:strafe>0,
    activeAxes:(linear!==0?1:0)+(strafe!==0?1:0),
  };
}
function iShieldToggle(){return!!(kjust('shield')||GP.shieldj);}
function iFir(){
  if(suppressFireUntilRelease){
    if(!kdown('fire')&&!GP.fire)suppressFireUntilRelease=false;
    else return false;
  }
  return!!(kdown('fire')||GP.fire);
}
function iFireSec(){return!!(kdown('fireSec')||GP.fireSec);}
function iEnter(){return!!(jp('Enter')||jp('NumpadEnter')||GP.confirmj);}
function iPause(){return!!(kjust('pause')||GP.startj);}
function iBack(){return!!(iPause()||(!keyBoundToAction('Backspace')&&jp('Backspace')));}
function iClear(){return!!(!keyBoundToAction('Delete')&&jp('Delete'));}
