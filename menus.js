'use strict';

function drawTitle(){
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#0f8';cx.shadowBlur=30;cx.fillStyle='#0f8';
  cx.font='bold 72px monospace';cx.fillText('PHANTOM',W/2,H/2-100);
  cx.shadowBlur=0;cx.fillStyle='#acd';cx.font='14px monospace';
  cx.fillText('NAVIGATE THE STAR SYSTEM  ·  DESTROY REACTORS  ·  ESCAPE',W/2,H/2-55);
  const rows=[['A D / LS','ROTATE'],['W / RT','THRUST'],['J / LT','FIRE'],['I / LB·RB','SHIELD'],['Near a planet + FIRE','ENTER'],['',''],['Shoot REACTOR','START COUNTDOWN'],['Fly out top gap','ESCAPE']];
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
function licensedWeaponsForSlot(slotType){return WEAPONS.filter(w=>w.wpnType===slotType+' gun'&&hasLicense(w.id));}
function rebuildTotalCost(chassisId,auxId){const ch=CHASSIS.find(c=>c.id===chassisId),ax=AUX_ITEMS.find(a=>a.id===auxId);return(ch?.buildPrice??0)+(ax?.buildPrice??0);}
function drawRebuild(){
  if(!G.rebuildFlow)G.rebuildFlow={phase:'chassis',sel:0};
  const rf=G.rebuildFlow;
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#f40';cx.shadowBlur=28;cx.fillStyle='#f40';
  cx.font='bold 46px monospace';cx.fillText('SHIP DESTROYED',W/2,90);cx.shadowBlur=0;
  if(rf.phase==='chassis')drawRebuildChassis(rf);else drawRebuildConfig(rf);
  cx.restore();drGPI();scanlines();
}
function drawRebuildChassis(rf){
  const lch=CHASSIS.filter(c=>hasLicense(c.id));
  const items=[...lch,'charity','quit'];
  const rh=34,ph=52+lch.length*rh+10+2*rh+26,pw=520,px=W/2-pw/2,py=Math.max(110,H/2-ph/2);
  cx.fillStyle='rgba(0,12,8,.97)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#f84';cx.shadowColor='#f84';cx.shadowBlur=14;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);cx.shadowBlur=0;
  cx.fillStyle='#f84';cx.font='bold 14px monospace';cx.textAlign='center';cx.shadowColor='#f84';cx.shadowBlur=8;
  cx.fillText('SELECT REPLACEMENT HULL',W/2,py+26);cx.shadowBlur=0;
  cx.strokeStyle='#3a1000';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+10,py+36);cx.lineTo(px+pw-10,py+36);cx.stroke();
  for(let i=0;i<items.length;i++){
    const item=items[i],isSel=i===rf.sel,iy=py+50+i*rh+(i>=lch.length?12:0);
    if(i===lch.length){cx.strokeStyle='#3a1000';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+20,iy-8);cx.lineTo(px+pw-20,iy-8);cx.stroke();}
    if(item==='charity'){
      cx.fillStyle=isSel?'#fd8':'#553';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='left';
      cx.fillText((isSel?'▶ ':'  ')+'CHARITY ASSISTANCE',px+14,iy);
      cx.fillStyle=isSel?'#aa8':'#442';cx.font='11px monospace';cx.textAlign='right';
      cx.fillText('FORFEIT ALL CREDITS & BOUNTY — DEFAULT SHIP FREE',px+pw-14,iy);
    }else if(item==='quit'){
      cx.fillStyle=isSel?'#f84':'#553';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='center';
      cx.fillText((isSel?'▶ ':'  ')+'QUIT TO TITLE',W/2,iy);
    }else{
      const ch=item,cost=ch.buildPrice;
      cx.fillStyle=isSel?'#0f8':'#446';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='left';
      cx.fillText((isSel?'▶ ':'  ')+ch.name,px+14,iy);
      cx.fillStyle=isSel?'#0a6':'#334';cx.font='11px monospace';cx.textAlign='right';
      cx.fillText('HP '+ch.maxHp+'  NRG '+ch.maxEnergy+'  THR '+ch.thrMul+'x'+(ch.reverse?' REV':'')+'  HULL: '+(cost===0?'FREE':cost+' CR'),px+pw-14,iy);
    }
  }
  cx.fillStyle='#8df';cx.font='13px monospace';cx.textAlign='center';
  cx.fillText('CREDITS: '+G.credits+'  BOUNTY: '+G.bounty,W/2,py+ph+18);
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('SEED  '+G.seed.toString(16).toUpperCase().padStart(8,'0'),W/2,py+ph+34);
}
function drawRebuildConfig(rf){
  const ch=CHASSIS.find(c=>c.id===rf.chassisId);if(!ch)return;
  const nRows=ch.slots.length+3,rh=36,pw=500,ph=52+nRows*rh+20,px=W/2-pw/2,py=Math.max(110,H/2-ph/2);
  cx.fillStyle='rgba(0,12,8,.97)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#f84';cx.shadowColor='#f84';cx.shadowBlur=14;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);cx.shadowBlur=0;
  cx.fillStyle='#f84';cx.font='bold 14px monospace';cx.textAlign='center';cx.shadowColor='#f84';cx.shadowBlur=8;
  cx.fillText('CONFIGURE: '+ch.name,W/2,py+26);cx.shadowBlur=0;
  cx.strokeStyle='#3a1000';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+10,py+36);cx.lineTo(px+pw-10,py+36);cx.stroke();
  for(let i=0;i<ch.slots.length;i++){
    const sl=ch.slots[i],wpId=rf.slots[i],wp=wpId?WEAPONS.find(w=>w.id===wpId):null;
    const isSel=rf.focus===i,iy=py+50+i*rh,opts=licensedWeaponsForSlot(sl.type);
    cx.fillStyle=isSel?'#0f8':'#446';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='left';
    cx.fillText((isSel?'▶ ':'  ')+'SLOT '+(i+1)+' ['+sl.type.toUpperCase()+']',px+14,iy);
    cx.fillStyle=isSel?'#0f8':(wp?'#668':'#444');cx.textAlign='right';
    cx.fillText((opts.length?'◄ ':' ')+(wp?wp.id.toUpperCase():'(empty)')+(opts.length?' ►':' '),px+pw-14,iy);
  }
  const auxRow=ch.slots.length,iy_aux=py+50+auxRow*rh,isSelAux=rf.focus===auxRow;
  const ax=rf.auxId?AUX_ITEMS.find(a=>a.id===rf.auxId):null,auxOpts=AUX_ITEMS.filter(a=>hasLicense(a.id));
  cx.fillStyle=isSelAux?'#0f8':'#446';cx.font=(isSelAux?'bold ':'')+'13px monospace';cx.textAlign='left';
  cx.fillText((isSelAux?'▶ ':'  ')+'AUX',px+14,iy_aux);
  cx.fillStyle=isSelAux?'#0f8':(ax?'#668':'#444');cx.textAlign='right';
  cx.fillText((auxOpts.length>1?'◄ ':' ')+(ax?ax.name:'(none)')+(auxOpts.length>1?' ►':' '),px+pw-14,iy_aux);
  const confirmRow=ch.slots.length+1,iy_conf=py+50+confirmRow*rh,isSelConf=rf.focus===confirmRow;
  const totalCost=rebuildTotalCost(rf.chassisId,rf.auxId),canAfford=G.credits>=totalCost;
  cx.fillStyle=isSelConf?(canAfford?'#0f8':'#f84'):'#446';cx.font=(isSelConf?'bold ':'')+'13px monospace';cx.textAlign='center';
  cx.fillText((isSelConf?'▶ ':'  ')+'REBUILD  '+(totalCost===0?'FREE':totalCost+' CR')+(canAfford?'':'  — INSUFFICIENT'),W/2,iy_conf);
  const backRow=ch.slots.length+2,iy_back=py+50+backRow*rh,isSelBack=rf.focus===backRow;
  cx.fillStyle=isSelBack?'#f84':'#446';cx.font=(isSelBack?'bold ':'')+'13px monospace';cx.textAlign='center';
  cx.fillText((isSelBack?'▶ ':'  ')+'BACK',W/2,iy_back);
  if(rf.warnShown){cx.fillStyle='#f84';cx.font='11px monospace';cx.textAlign='center';cx.fillText('WARNING: no weapons equipped!',W/2,py+ph-10);}
  cx.fillStyle=canAfford?'#8df':'#f84';cx.font='13px monospace';cx.textAlign='center';
  cx.fillText('CREDITS: '+G.credits+(totalCost>0?'   COST: '+totalCost+' CR':''),W/2,py+ph+18);
}
function updRebuild(){
  if(!G.rebuildFlow)G.rebuildFlow={phase:'chassis',sel:0};
  const rf=G.rebuildFlow;
  const m=menuInput({fireConfirms:false});
  const up=m.up,dn=m.down,lt=m.left,rt=m.right,ok=m.confirm,bk=m.cancel;
  if(rf.phase==='chassis'){
    const lch=CHASSIS.filter(c=>hasLicense(c.id)),nItems=lch.length+2;
    if(up)rf.sel=Math.max(0,rf.sel-1);
    if(dn)rf.sel=Math.min(nItems-1,rf.sel+1);
    if(ok){
      ia();
      if(rf.sel===nItems-1){G.rebuildFlow=null;G.paused=false;G.ENC=null;G.site=null;G.st='title';return;}
      if(rf.sel===nItems-2){
        const def=defaultSave();G.credits=0;G.bounty=0;
        G.loadout={...def.loadout,weapons:[...def.loadout.weapons]};
        def.licenses.forEach(id=>{if(!G.licenses.includes(id))G.licenses.push(id);});
        G.rebuildFlow=null;doRebuildFinalize();return;
      }
      const ch=lch[rf.sel];
      const auxId=hasLicense(G.loadout.aux)?G.loadout.aux:(AUX_ITEMS.find(a=>hasLicense(a.id))?.id??null);
      const slots=ch.slots.map((sl,i)=>{
        const curWp=G.loadout.weapons[i];
        if(curWp&&hasLicense(curWp)){const wp=WEAPONS.find(w=>w.id===curWp);if(wp&&slotMatchesWeapon(sl,wp))return curWp;}
        return licensedWeaponsForSlot(sl.type)[0]?.id??null;
      });
      rf.phase='config';rf.chassisId=ch.id;rf.slots=slots;rf.auxId=auxId;rf.focus=0;rf.warnShown=false;
    }
  }else{
    const ch=CHASSIS.find(c=>c.id===rf.chassisId),nRows=ch.slots.length+3;
    if(up)rf.focus=Math.max(0,rf.focus-1);
    if(dn)rf.focus=Math.min(nRows-1,rf.focus+1);
    const focus=rf.focus;
    if(focus<ch.slots.length){
      const sl=ch.slots[focus],opts=[null,...licensedWeaponsForSlot(sl.type)];
      const curIdx=Math.max(0,opts.findIndex(w=>(w?.id??null)===rf.slots[focus]));
      if(lt)rf.slots[focus]=opts[((curIdx-1)+opts.length)%opts.length]?.id??null;
      if(rt)rf.slots[focus]=opts[(curIdx+1)%opts.length]?.id??null;
    }else if(focus===ch.slots.length){
      const auxOpts=[null,...AUX_ITEMS.filter(a=>hasLicense(a.id))];
      const curIdx=Math.max(0,auxOpts.findIndex(a=>(a?.id??null)===rf.auxId));
      if(lt)rf.auxId=auxOpts[((curIdx-1)+auxOpts.length)%auxOpts.length]?.id??null;
      if(rt)rf.auxId=auxOpts[(curIdx+1)%auxOpts.length]?.id??null;
    }else if(focus===ch.slots.length+1){
      if(ok){
        ia();
        const hasWeapon=rf.slots.some(s=>s!==null);
        if(!hasWeapon&&!rf.warnShown){rf.warnShown=true;return;}
        const totalCost=rebuildTotalCost(rf.chassisId,rf.auxId);
        if(G.credits<totalCost){tone(80,.1,'square',.06);return;}
        G.credits-=totalCost;
        G.loadout.chassis=rf.chassisId;G.loadout.weapons=[...rf.slots];
        const wlen=ch.slots.length;while(G.loadout.weapons.length<wlen)G.loadout.weapons.push(null);
        G.loadout.weapons=G.loadout.weapons.slice(0,wlen);G.loadout.aux=rf.auxId;
        G.rebuildFlow=null;doRebuildFinalize();
      }
    }else if(ok||bk){rf.phase='chassis';}
    if(bk&&focus<ch.slots.length+2)rf.phase='chassis';
  }
}

function pauseItems(){return G.cheatMode?['RESUME','SHIP CONFIG','OPTIONS','CHEATS ▶','QUIT TO TITLE']:['RESUME','SHIP CONFIG','OPTIONS','QUIT TO TITLE'];}
function cheatItems(){return['REPAIR SHIP','TELEPORT TO SLIPGATE','JUMP TO SEED','CLEAR ALL SECTORS','ADD 10K CREDITS','ZERO CREDITS','INVINCIBILITY: '+(G.invincible?'ON':'OFF'),'BACK'];}

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
    ['CHASSIS',ch.name+`  HP ${ch.maxHp}  NRG ${ch.maxEnergy}  THR ${ch.thrMul}x`+(ch.reverse?' REV':'')],
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
  const CITEMS=cheatItems();
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
    if(sel){cx.fillStyle=isBack?'#0f8':'#ffee44';cx.shadowColor=isBack?'#0f8':'#ff8';cx.shadowBlur=10;cx.fillText('▶ '+CITEMS[i],W/2,iy);}
    else{cx.fillStyle=isBack?'#668':'#665500';cx.shadowBlur=0;cx.fillText(CITEMS[i],W/2,iy);}
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('ESC TO GO BACK',W/2,py+ph-20);
  cx.restore();
}

function drawPause(){
  if(G.showShipConfig&&G.paused)return drawShipConfig();
  if(G.cheatSub&&G.paused)return drawCheatSub();
  const PITEMS=pauseItems();
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
  const items=['SOUND EFFECTS','MUSIC','CONTROLS','CHEAT MODE','FULLSCREEN','RESET GAME'];
  const startY=110,rowH=52;
  for(let i=0;i<6;i++){
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
    } else if(i===3){
      const on=G.cheatMode;
      cx.fillStyle=on?(sel?'#ff8':'#664'):(sel?'#446':'#334');
      cx.shadowColor=on?'#ff8':'#0f8';cx.shadowBlur=on&&sel?8:0;
      cx.font='bold 13px monospace';cx.textAlign='center';
      cx.fillText(on?'ON':'OFF',W/2,y+18);
      cx.shadowBlur=0;
    } else if(i===4){
      const on=G.fullscreen;
      cx.fillStyle=on?(sel?'#0f8':'#2a6a4a'):(sel?'#446':'#334');
      cx.shadowColor='#0f8';cx.shadowBlur=on&&sel?8:0;
      cx.font='bold 13px monospace';cx.textAlign='center';
      cx.fillText(on?'ON':'OFF',W/2,y+18);
      cx.shadowBlur=0;
    } else {
      cx.fillStyle=sel?'#f84':'#446';cx.shadowColor='#f84';cx.shadowBlur=sel?8:0;
      cx.font='bold 12px monospace';cx.textAlign='center';
      cx.fillText(sel?'▶ CONFIRM RESET? ENTER TO ERASE SAVE':'ERASE ALL SAVE DATA',W/2,y+18);cx.shadowBlur=0;
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
  const ry=startY+ACT_DEFS.length*rowH+8,rsel=G.ctrlSel===ACT_DEFS.length;
  cx.beginPath();cx.moveTo(60,ry-24);cx.lineTo(W-60,ry-24);cx.strokeStyle='#1a4a2a';cx.stroke();
  cx.textAlign='center';
  cx.fillStyle=rsel?'#f84':'#446';cx.shadowColor='#f84';cx.shadowBlur=rsel?8:0;
  cx.font='bold 13px monospace';cx.fillText(rsel?'▶ RESET TO DEFAULTS':'RESET TO DEFAULTS',W/2,ry);
  cx.shadowBlur=0;
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('↑↓ SELECT ROW   ◄► SWITCH COLUMN   ENTER REMAP   BKSP CLEAR   ESC BACK',W/2,H-18);
  cx.restore();drGPI();scanlines();
}
