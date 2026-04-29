'use strict';

function drawTitle(){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#0f8';cx.shadowBlur=30;cx.fillStyle='#0f8';
  cx.font='bold 72px monospace';cx.fillText('PHANTOM',W/2,H/2-100);
  cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='14px monospace';
  cx.fillText('KILL PHRASE ACTIVATED, EXECUTE PHANTOM PROTOCOL',W/2,H/2-55);
  const rows=[[]];
  cx.font='12px monospace';let ry=H/2-22;
  for(const[k,v]of rows){if(!k){ry+=10;continue;}cx.fillStyle='#557799';cx.textAlign='right';cx.fillText(k,W/2-6,ry);cx.fillStyle='#aaffcc';cx.textAlign='left';cx.fillText(v,W/2+10,ry);ry+=17;}
  const TITEMS=titleItems();
  cx.font='14px monospace';
  for(let i=0;i<TITEMS.length;i++){
    const iy=H-68+i*26;const sel=i===G.titleSel;
    if(sel){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=12;cx.fillText(UI_GLYPH.pointer+' '+TITEMS[i].label,W/2,iy);}
    else{cx.fillStyle='#446';cx.shadowBlur=0;cx.fillText(TITEMS[i].label,W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#223';cx.font='10px monospace';cx.textAlign='left';
  cx.fillText('SEED  '+seedText(G.seed),8,H-8);
  cx.restore();drGPI();scanlines();
}

function drawScreen(title,sub,tc,prompt){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';cx.shadowColor=tc;cx.shadowBlur=24;cx.fillStyle=tc;
  cx.font='bold 52px monospace';cx.fillText(title,W/2,H/2-50);
  if(sub){cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='20px monospace';cx.fillText(sub,W/2,H/2+12);}
  if(Math.floor(G.fr/28)%2===0){cx.fillStyle='#668';cx.font='14px monospace';cx.fillText(prompt,W/2,H/2+65);}
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText('SEED  '+seedText(G.seed),W/2,H/2+95);
  cx.restore();drGPI();scanlines();
}
function titleItems(){return[
  {id:'play',label:'PLAY GAME'},
  {id:'options',label:'OPTIONS'},
];}
function optionItems(){return[
  {id:'controls',label:'CONTROLS'},
  {id:'sfx',label:'SOUND EFFECTS'},
  {id:'music',label:'MUSIC'},
  {id:'zoom',label:'DYNAMIC ZOOM'},
  {id:'render_quality',label:'VISUAL FX'},
  {id:'cheats',label:'CHEAT MODE'},
  {id:'fullscreen',label:'FULLSCREEN'},
  {id:'clear_data',label:'CLEAR GAME DATA'},
  {id:'return',label:'RETURN'},
];}
function pauseMenuItems(){return G.cheatMode?[
  {id:'resume',label:'RESUME'},
  {id:'ship_config',label:'SHIP CONFIG'},
  {id:'options',label:'OPTIONS'},
  {id:'cheats',label:'CHEATS '+UI_GLYPH.pointer},
  {id:'quit',label:'QUIT TO TITLE'},
]:[
  {id:'resume',label:'RESUME'},
  {id:'ship_config',label:'SHIP CONFIG'},
  {id:'options',label:'OPTIONS'},
  {id:'quit',label:'QUIT TO TITLE'},
];}
function cheatMenuItems(){return[
  {id:'repair',label:'REPAIR SHIP'},
  {id:'teleport_slipgate',label:'TELEPORT TO SLIPGATE'},
  {id:'jump_seed',label:'JUMP TO SEED'},
  {id:'clear_sectors',label:'CLEAR ALL SECTORS'},
  {id:'add_credits',label:'ADD 10K CREDITS'},
  {id:'zero_credits',label:'ZERO CREDITS'},
  {id:'invincibility',label:'INVINCIBILITY: '+(G.invincible?'ON':'OFF')},
  {id:'back',label:'BACK'},
];}
function pauseItems(){return pauseMenuItems().map(i=>i.label);}
function cheatItems(){return cheatMenuItems().map(i=>i.label);}

function drawShipConfig(){
  const ch=activeChassisObj(),ax=activeAuxObj();
  const pw=420,ph=280,px=W/2-pw/2,py=H/2-ph/2;
  cx.save();
  cx.fillStyle='rgba(0,0,0,.85)';cx.fillRect(0,0,W,H);
  cx.fillStyle='rgba(0,12,8,.97)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=16;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);cx.shadowBlur=0;
  cx.fillStyle='#0f8';cx.font='bold 16px monospace';cx.textAlign='center';cx.shadowColor='#0f8';cx.shadowBlur=8;
  cx.fillText('SHIP CONFIGURATION',W/2,py+28);cx.shadowBlur=0;
  cx.strokeStyle='#1a4a2a';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+10,py+38);cx.lineTo(px+pw-10,py+38);cx.stroke();
  const rows=[
    ['CHASSIS',ch.name+`  HP ${ch.maxHp}  NRG ${ch.maxEnergy}  FWD ${ch.thrust.fwd}`+(ch.thrust.rev>0?` REV ${ch.thrust.rev}`:'')],
    ['AUX',ax?ax.name:'(empty)'],
  ];
  activeChassisObj().slots.forEach((sl,i)=>{
    const wp=wpSlot(i);
    rows.push([`SLOT ${i+1} [${sl.type.toUpperCase()}]`,wp?wp.id.toUpperCase():'(empty)']);
  });
  rows.push(['','']);
  rows.push(['SYSTEMS VISITED',''+G.visitedSeeds.length]);
  cx.font='12px monospace';
  for(let r=0;r<rows.length;r++){
    const[label,val]=rows[r],ry=py+56+r*30;
    if(!label)continue;
    cx.fillStyle='#446';cx.textAlign='left';cx.fillText(label,px+20,ry);
    cx.fillStyle='#aaffcc';cx.textAlign='right';cx.fillText(val,px+pw-20,ry);
  }
  // Go Back button
  const btnW=120,btnH=26,btnX=W/2-btnW/2,btnY=py+ph-46;
  cx.fillStyle='rgba(0,60,20,.9)';cx.fillRect(btnX,btnY,btnW,btnH);
  cx.strokeStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=8;cx.lineWidth=1.2;cx.strokeRect(btnX,btnY,btnW,btnH);
  cx.fillStyle='#0f8';cx.font='bold 13px monospace';cx.textAlign='center';cx.shadowBlur=6;
  cx.fillText('◀  GO BACK',W/2,btnY+17);
  cx.shadowBlur=0;
  cx.restore();
}

function drawCheatSub(){
  const CITEMS=cheatMenuItems();
  const ph=380,pw=300,px=W/2-pw/2,py=H/2-ph/2;
  cx.save();
  cx.fillStyle='rgba(0,0,0,.75)';cx.fillRect(0,0,W,H);
  cx.fillStyle='rgba(12,10,0,.97)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#ff8';cx.shadowColor='#ff8';cx.shadowBlur=20;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
  cx.shadowBlur=14;cx.fillStyle='#ff8';cx.font='bold 22px monospace';cx.textAlign='center';
  cx.fillText('CHEATS',W/2,py+38);
  cx.shadowBlur=6;cx.font='bold 10px monospace';cx.fillText('CHEAT MODE',W/2,py+54);cx.shadowBlur=0;
  cx.font='13px monospace';
  for(let i=0;i<CITEMS.length;i++){
    const iy=py+76+i*36,sel=i===G.cheatSubSel,isBack=i===CITEMS.length-1;
    if(sel){cx.fillStyle=isBack?'#0f8':'#ffee44';cx.shadowColor=isBack?'#0f8':'#ff8';cx.shadowBlur=10;cx.fillText(UI_GLYPH.pointer+' '+CITEMS[i].label,W/2,iy);}
    else{cx.fillStyle=isBack?'#668':'#665500';cx.shadowBlur=0;cx.fillText(CITEMS[i].label,W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('ESC TO GO BACK',W/2,py+ph-20);
  cx.restore();
}

function drawPause(){
  if(G.showShipConfig&&G.paused)return drawShipConfig();
  if(G.cheatSub&&G.paused)return drawCheatSub();
  const PITEMS=pauseMenuItems();
  const ph=G.cheatMode?300:260,pw=300,px=W/2-pw/2,py=H/2-ph/2;
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
    const isCheat=G.cheatMode&&i===3;
    if(sel){cx.fillStyle=isCheat?'#ffee44':'#0f8';cx.shadowColor=isCheat?'#ff8':'#0f8';cx.shadowBlur=10;cx.fillText(UI_GLYPH.pointer+' '+PITEMS[i].label,W/2,iy);}
    else{cx.fillStyle=isCheat?'#665500':'#668';cx.shadowBlur=0;cx.fillText(PITEMS[i].label,W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#aaffcc';cx.font='12px monospace';
  cx.fillText('CREDITS  '+G.credits,W/2,py+ph-46);
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('ESC TO RESUME',W/2,py+ph-26);
  if(G.cheatMode){cx.fillStyle='#223';cx.font='10px monospace';
  cx.fillText('SEED  '+seedText(G.seed),W/2,py+ph-10);}
  cx.restore();
}

function showSeedInput(onConfirm){
  G.seedInputOpen=true;
  const overlay=document.getElementById('seed-overlay');
  const input=document.getElementById('seed-input');
  const form=document.getElementById('seed-form');
  const errDiv=document.getElementById('seed-error');
  const cancelBtn=document.getElementById('seed-cancel');
  input.value=G.customSeed!==null?G.customSeed.toString(16).toUpperCase().padStart(8,'0'):'';
  errDiv.textContent='';
  overlay.style.display='flex';
  setTimeout(()=>input.focus(),30);
  function close(){
    overlay.style.display='none';
    G.seedInputOpen=false;
    form.removeEventListener('submit',onSubmit);
    cancelBtn.removeEventListener('click',onCancel);
    document.removeEventListener('keydown',onEsc,true);
  }
  function onSubmit(e){
    e.preventDefault();
    const val=input.value.trim().toUpperCase();
    if(val===''){close();onConfirm(null);return;}
    if(!/^[0-9A-F]{1,8}$/.test(val)){errDiv.textContent='Enter up to 8 hex digits (0-9, A-F)';return;}
    close();onConfirm(parseInt(val,16)>>>0);
  }
  function onCancel(){close();}
  function onEsc(e){if(e.key==='Escape'){e.stopImmediatePropagation();close();}}
  form.addEventListener('submit',onSubmit);
  cancelBtn.addEventListener('click',onCancel);
  document.addEventListener('keydown',onEsc,true);
}
function drawOptions(){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#0f8';cx.shadowBlur=20;cx.fillStyle='#0f8';
  cx.font='bold 28px monospace';cx.fillText('OPTIONS',W/2,70);
  cx.shadowBlur=0;cx.strokeStyle='#1a4a2a';cx.lineWidth=1;
  cx.beginPath();cx.moveTo(60,88);cx.lineTo(W-60,88);cx.stroke();
  const items=optionItems();
  const startY=132,rowH=46;
  for(let i=0;i<items.length;i++){
    const y=startY+i*rowH-(i>=1?12:0),sel=i===G.optSel;
    const id=items[i].id;
    cx.textAlign='center';
    cx.fillStyle=sel?'#aaffcc':'#668';cx.shadowBlur=sel?4:0;cx.shadowColor='#0f8';
    cx.font='bold 13px monospace';
    cx.fillText(selectedPrefix(sel)+items[i].label,W/2,y);
    if(id==='sfx'||id==='music'){
      drawMenuVolumeBar(id==='sfx'?G.sfxVol:G.musVol,W/2,y+14,sel);
    } else if(id==='zoom'){
      drawMenuToggle(G.dynamicZoom,W/2,y+18,sel);
    } else if(id==='render_quality'){
      cx.fillStyle=sel?'#0f8':'#446';cx.shadowColor='#0f8';cx.shadowBlur=sel?6:0;
      cx.font='bold 13px monospace';cx.textAlign='center';
      cx.fillText(arrowValue(renderQualityLabel(G.renderQuality),sel),W/2,y+18);
    } else if(id==='cheats'){
      drawMenuToggle(G.cheatMode,W/2,y+18,sel,'#ff8');
    } else if(id==='fullscreen'){
      drawMenuToggle(G.fullscreen,W/2,y+18,sel);
    } else if(id==='clear_data'){
      cx.fillStyle=sel?'#f84':'#446';cx.shadowColor='#f84';cx.shadowBlur=sel?8:0;
      cx.font='bold 13px monospace';cx.textAlign='center';
      cx.fillText('',W/2,y+18);cx.shadowBlur=0;
    }
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText(UI_GLYPH.up+UI_GLYPH.down+' SELECT   '+UI_GLYPH.left+UI_GLYPH.right+' ADJUST / OPEN   ESC BACK',W/2,H-18);
  cx.restore();drGPI();scanlines();
}

function drawClearDataDialog(){
  const pw=480,ph=140,px=W/2-pw/2,py=H/2-ph/2;
  cx.save();
  cx.fillStyle='rgba(0,0,0,.85)';cx.fillRect(0,0,W,H);
  cx.fillStyle='rgba(0,12,8,.97)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#f84';cx.shadowColor='#f84';cx.shadowBlur=14;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);
  cx.shadowBlur=0;cx.fillStyle='#f84';cx.font='bold 14px monospace';cx.textAlign='center';
  cx.fillText('CLEAR ALL GAME DATA?',W/2,py+28);
  cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='12px monospace';
  cx.fillText('Are you sure?',W/2,py+56);
  cx.fillText('This will reset the game.',W/2,py+72);
  const btnW=100,btnH=24,btnGap=20;
  const btn1X=W/2-btnW-btnGap/2,btn2X=W/2+btnGap/2;
  const btnY=py+ph-42;
  const sel=G.clearDataSel;
  for(let b=0;b<2;b++){
    const bx=b===0?btn1X:btn2X;
    const label=b===0?'BACK':'CONFIRM';
    const isSel=b===sel;
    cx.fillStyle=isSel?'rgba(0,60,20,.9)':'rgba(0,30,10,.7)';
    cx.fillRect(bx,btnY,btnW,btnH);
    cx.strokeStyle=isSel?'#0f8':'#446';cx.shadowColor=isSel?'#0f8':'#000';cx.shadowBlur=isSel?8:0;cx.lineWidth=1.2;
    cx.strokeRect(bx,btnY,btnW,btnH);
    cx.fillStyle=isSel?'#0f8':'#668';cx.font='bold 11px monospace';cx.textAlign='center';
    cx.fillText(isSel?UI_GLYPH.pointer+' '+label:label,bx+btnW/2,btnY+16);
  }
  cx.shadowBlur=0;cx.restore();
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
    cx.fillText(selectedPrefix(sel)+a.label,col0,y);
    cx.textAlign='center';
    if(listeningKey){
      if(G.fr%30<15){cx.fillStyle='#ff0';cx.shadowColor='#ff0';cx.shadowBlur=10;cx.fillText('PRESS KEY...',col1,y);}
    } else {
      cx.fillStyle=sel&&G.optCol===0?'#0f8':'#668';
      cx.shadowColor='#0f8';cx.shadowBlur=sel&&G.optCol===0?6:0;
      cx.fillText(BND[a.id].key!=null?'['+fmtKey(BND[a.id].key)+']':'[--]',col1,y);
    }
    if(listeningBtn){
      if(G.fr%30<15){cx.fillStyle='#ff0';cx.shadowColor='#ff0';cx.shadowBlur=10;cx.fillText('PRESS BTN...',col2,y);}
    } else {
      cx.fillStyle=sel&&G.optCol===1?'#0f8':'#668';
      cx.shadowColor='#0f8';cx.shadowBlur=sel&&G.optCol===1?6:0;
      cx.fillText(BND[a.id].btn!=null?'['+fmtBtn(BND[a.id].btn)+']':'[--]',col2,y);
    }
  }
  cx.shadowBlur=0;
  const ry=startY+ACT_DEFS.length*rowH+8,retSel=G.ctrlSel===ACT_DEFS.length,rsel=G.ctrlSel===ACT_DEFS.length+1;
  cx.beginPath();cx.moveTo(60,ry-24);cx.lineTo(W-60,ry-24);cx.strokeStyle='#1a4a2a';cx.stroke();
  cx.textAlign='center';
  cx.fillStyle=retSel?'#0f8':'#668';cx.shadowColor='#0f8';cx.shadowBlur=retSel?8:0;
  cx.font='bold 13px monospace';cx.fillText(retSel?UI_GLYPH.pointer+' RETURN':'RETURN',W/2,ry);
  cx.fillStyle=rsel?'#f84':'#446';cx.shadowColor='#f84';cx.shadowBlur=rsel?8:0;
  cx.fillText(rsel?UI_GLYPH.pointer+' RESET TO DEFAULTS':'RESET TO DEFAULTS',W/2,ry+rowH);
  cx.shadowBlur=0;
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText(UI_GLYPH.up+UI_GLYPH.down+' SELECT ROW   '+UI_GLYPH.left+UI_GLYPH.right+' SWITCH COLUMN   ENTER REMAP   BKSP CLEAR   ESC BACK',W/2,H-18);
  cx.restore();drGPI();scanlines();
}

function returnFromOptions(){
  G.st=G.optFrom;
  if(G.optFrom==='title')G.titleSel=0;
  else{G.pauseSel=0;G.paused=true;}
}
function updTitleMenu(){
  const items=titleItems();
  const m=menuInput();
  G.titleSel=moveSelection(G.titleSel,items.length-1,m.up,m.down);
  if(!m.confirm)return;
  ia();
  const id=items[G.titleSel].id;
  if(id==='play')startFromSave();
  else if(id==='options'){G.optFrom='title';G.optSel=0;G.st='options';}
}
function updClearDataDialog(){
  const m=menuInput({fireConfirms:false});
  if(m.left)G.clearDataSel=0;
  if(m.right)G.clearDataSel=1;
  if(m.confirm){
    if(G.clearDataSel===1){
      resetSave();G.titleSel=0;G.st='title';G.paused=false;tone(220,.3,'sawtooth',.1);
    }
    delete G.clearDataSel;
  }
  if(m.cancel)delete G.clearDataSel;
}
function updOptionsMenu(){
  if(G.clearDataSel!==undefined){updClearDataDialog();return;}
  const items=optionItems();
  const m=menuInput();
  G.optSel=moveSelection(G.optSel,items.length-1,m.up,m.down);
  const item=items[G.optSel];
  if(item.id==='controls'){
    if(m.confirm||m.right){G.ctrlSel=0;G.optCol=0;G.optListen=null;G.st='controls';return;}
  }else if(item.id==='sfx'){
    if(m.left){G.sfxVol=Math.max(0,G.sfxVol-1);tone(900,.04,'square',.05);saveSettings();}
    if(m.right){G.sfxVol=Math.min(10,G.sfxVol+1);tone(900,.04,'square',.05);saveSettings();}
  }else if(item.id==='music'){
    if(m.left){G.musVol=Math.max(0,G.musVol-1);saveSettings();}
    if(m.right){G.musVol=Math.min(10,G.musVol+1);saveSettings();}
  }else if(item.id==='zoom'){
    if(m.confirm||m.left||m.right){G.dynamicZoom=!G.dynamicZoom;tone(G.dynamicZoom?1200:400,.08,'square',.05);saveSettings();}
  }else if(item.id==='render_quality'){
    if(m.confirm||m.left||m.right){
      G.renderQuality=cycleValue(RENDER_QUALITY_VALUES,normalizeRenderQuality(G.renderQuality),m.left?-1:1);
      tone(G.renderQuality==='full'?1200:G.renderQuality==='reduced'?800:400,.08,'square',.05);
      saveSettings();
    }
  }else if(item.id==='cheats'){
    if(m.confirm||m.left||m.right){G.cheatMode=!G.cheatMode;tone(G.cheatMode?1200:400,.08,'square',.05);}
  }else if(item.id==='fullscreen'){
    if(m.confirm||m.left||m.right){
      const willEnter=!document.fullscreenElement;
      if(willEnter)document.documentElement.requestFullscreen();
      else document.exitFullscreen();
      tone(willEnter?1200:400,.08,'square',.05);
    }
  }else if(item.id==='clear_data'){
    if(m.confirm)G.clearDataSel=0;
  }else if(item.id==='return'){
    if(m.confirm)returnFromOptions();
  }
  if(m.cancel)returnFromOptions();
}
function updControlsMenu(){
  if(G.optListen){
    if(jp('Escape')||GP.startj){G.optListen=null;GP.startj=false;}
    return;
  }
  const m=menuInput();
  const nRows=ACT_DEFS.length+2;
  G.ctrlSel=moveSelection(G.ctrlSel,nRows-1,m.up,m.down);
  if(m.left)G.optCol=0;
  if(m.right)G.optCol=1;
  const confirm=m.confirm&&!m.left&&!m.right;
  if(confirm){
    if(G.ctrlSel===ACT_DEFS.length){
      G.st='options';G.optListen=null;
    }else if(G.ctrlSel===ACT_DEFS.length+1){
      ACT_DEFS.forEach(a=>{BND[a.id]={key:a.defKey,btn:a.defBtn};});saveBND();
    }else{
      G.optListen=G.optCol===0?'key':'btn';
    }
  }
  if(m.clear&&G.ctrlSel<ACT_DEFS.length){
    const b=BND[ACT_DEFS[G.ctrlSel].id];
    if(G.optCol===0)b.key=null;else b.btn=null;
    saveBND();
  }
  if(m.cancel){G.st='options';G.optListen=null;}
}
function updCheatMenu(m){
  const items=cheatMenuItems();
  m=m||menuInput();
  G.cheatSubSel=moveSelection(G.cheatSubSel,items.length-1,m.up,m.down);
  if(!m.confirm)return;
  const id=items[G.cheatSubSel].id;
  if(id==='repair'){
    G.OW.s.hp=G.OW.s.maxHp;G.OW.s.energy=G.OW.s.maxEnergy;
    if(G.ENC){G.ENC.s.hp=G.ENC.s.maxHp;G.ENC.s.energy=G.ENC.s.maxEnergy;}
    tone(660,.2,'sine',.08);G.paused=false;G.cheatSub=false;
  }else if(id==='teleport_slipgate'){
    const sgp=owPos(SLIPGATE);G.OW.s.x=sgp.x;G.OW.s.y=sgp.y;G.ENC=null;G.site=null;returnToOverworld();G.paused=false;G.cheatSub=false;
  }else if(id==='jump_seed'){
    showSeedInput(v=>{if(v!=null){G.paused=false;G.cheatSub=false;jumpToSeed(v,null);}});
  }else if(id==='clear_sectors'){
    G.cleared=[true,true,true];G.slipgateActive=true;G.slipMsg=360;G.ENC=null;G.site=null;returnToOverworld();G.paused=false;G.cheatSub=false;
  }else if(id==='add_credits'){
    G.credits+=10000;tone(880,.15,'sine',.07);G.paused=false;G.cheatSub=false;
  }else if(id==='zero_credits'){
    G.credits=0;tone(220,.15,'sawtooth',.07);G.paused=false;G.cheatSub=false;
  }else if(id==='invincibility'){
    G.invincible=!G.invincible;tone(G.invincible?1200:400,.08,'square',.05);
  }else if(id==='back'){
    G.cheatSub=false;
  }
}
function updPauseMenu(st){
  const m=menuInput();
  if(G.showShipConfig&&m.confirm){G.showShipConfig=false;return;}
  if(G.cheatSub){updCheatMenu(m);return;}
  const items=pauseMenuItems();
  G.pauseSel=moveSelection(G.pauseSel,items.length-1,m.up,m.down);
  if(!m.confirm)return;
  const id=items[G.pauseSel].id;
  if(id==='resume')G.paused=false;
  else if(id==='ship_config')G.showShipConfig=true;
  else if(id==='options'){G.optFrom=st;G.optSel=0;G.paused=false;G.st='options';}
  else if(id==='cheats'){G.cheatSub=true;G.cheatSubSel=0;}
  else if(id==='quit'){saveGame();G.titleSel=0;G.paused=false;G.ENC=null;G.site=null;G.st='title';}
}
