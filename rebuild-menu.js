'use strict';

function rebuildTotalCost(chassisId,shieldId){
  const ch=CHASSIS.find(c=>c.id===chassisId),sh=SHIELDS.find(s=>s.id===shieldId);
  return(ch?.buildPrice??0)+(sh?.buildPrice??0);
}
function licensedRebuildChassis(){return CHASSIS.filter(c=>hasLicense(c.id));}
function rebuildChassisItems(){return[...licensedRebuildChassis(),{id:'charity'},{id:'quit'}];}
function currentShieldForRebuild(){
  if(hasLicense(G.loadout.shield))return G.loadout.shield;
  return SHIELDS.find(s=>hasLicense(s.id))?.id??null;
}
function rebuildSlotsForChassis(ch){
  return ch.slots.map((sl,i)=>{
    const curWp=G.loadout.weapons[i];
    if(curWp&&hasLicense(curWp)){
      const wp=WEAPONS.find(w=>w.id===curWp);
      if(wp&&slotMatchesWeapon(sl,wp))return curWp;
    }
    return licensedWeaponsForSlot(sl)[0]?.id??null;
  });
}
function openRebuildConfig(ch){
  G.rebuildFlow.phase='config';
  G.rebuildFlow.chassisId=ch.id;
  G.rebuildFlow.slots=rebuildSlotsForChassis(ch);
  G.rebuildFlow.shieldId=currentShieldForRebuild();
  G.rebuildFlow.focus=0;
  G.rebuildFlow.warnShown=false;
}
function applyCharityRebuild(){
  const def=defaultSave();
  G.credits=0;G.stake=0;
  G.loadout={...def.loadout,weapons:[...def.loadout.weapons]};
  def.licenses.forEach(id=>{if(!G.licenses.includes(id))G.licenses.push(id);});
  G.rebuildFlow=null;doRebuildFinalize();
}
function finalizeRebuild(rf,ch){
  const totalCost=rebuildTotalCost(rf.chassisId,rf.shieldId);
  if(G.credits<totalCost){tone(80,.1,'square',.06);return false;}
  G.credits-=totalCost;
  const power=defaultPowerForChassisId(rf.chassisId);
  G.loadout.chassis=rf.chassisId;
  G.loadout.battery=power.battery;
  G.loadout.reactor=power.reactor;
  G.loadout.weapons=[...rf.slots];
  while(G.loadout.weapons.length<ch.slots.length)G.loadout.weapons.push(null);
  G.loadout.weapons=G.loadout.weapons.slice(0,ch.slots.length);
  G.loadout.shield=rf.shieldId;
  G.rebuildFlow=null;doRebuildFinalize();
  return true;
}

function drawRebuild(){
  if(!G.rebuildFlow)G.rebuildFlow={phase:'chassis',sel:0};
  const rf=G.rebuildFlow;
  cx.fillStyle='#000';cx.fillRect(0,0,W,H);drStars();
  cx.save();cx.textAlign='center';
  cx.shadowColor='#f40';cx.shadowBlur=28;cx.fillStyle='#f40';
  cx.font='bold 46px monospace';cx.fillText('SHIP DESTROYED',W/2,90);cx.shadowBlur=0;
  if(rf.phase==='chassis')drawRebuildChassis(rf);else drawRebuildConfig(rf);
  cx.restore();drGPI();
}
function drawRebuildChassis(rf){
  const lch=licensedRebuildChassis(),items=rebuildChassisItems();
  const rh=34,ph=52+lch.length*rh+10+2*rh+26,pw=520,px=W/2-pw/2,py=Math.max(110,H/2-ph/2);
  drawMenuPanel(px,py,pw,ph,{fill:'rgba(0,12,8,.97)',stroke:'#f84',glow:'#f84',shadowBlur:14});
  drawMenuTitle('SELECT REPLACEMENT HULL',W/2,py+26,'#f84','bold 14px monospace',8);
  drawMenuDivider(px,py,pw,36,'#3a1000');
  for(let i=0;i<items.length;i++){
    const item=items[i],isSel=i===rf.sel,iy=py+50+i*rh+(i>=lch.length?12:0);
    if(i===lch.length)drawMenuDivider(px+10,py,pw-20,iy-py-8,'#3a1000');
    if(item.id==='charity'){
      cx.fillStyle=isSel?'#fd8':'#553';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='left';
      cx.fillText((isSel?UI_GLYPH.pointer+' ':'  ')+'CHARITY ASSISTANCE',px+14,iy);
      cx.fillStyle=isSel?'#aa8':'#442';cx.font='11px monospace';cx.textAlign='right';
      cx.fillText('FORFEIT ALL CREDITS & STAKE '+UI_GLYPH.dash+' DEFAULT SHIP FREE',px+pw-14,iy);
    }else if(item.id==='quit'){
      cx.fillStyle=isSel?'#f84':'#553';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='center';
      cx.fillText((isSel?UI_GLYPH.pointer+' ':'  ')+'QUIT TO TITLE',W/2,iy);
    }else{
      const ch=item,cost=ch.buildPrice;
      cx.fillStyle=isSel?'#0f8':'#446';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='left';
      cx.fillText((isSel?UI_GLYPH.pointer+' ':'  ')+ch.name,px+14,iy);
      cx.fillStyle=isSel?'#0a6':'#334';cx.font='11px monospace';cx.textAlign='right';
      cx.fillText(chassisStatsText(ch,{slots:false})+'  HULL: '+(cost===0?'FREE':cost+' CR'),px+pw-14,iy);
    }
  }
  cx.fillStyle='#8df';cx.font='13px monospace';cx.textAlign='center';
  cx.fillText('CREDITS: '+G.credits+'  STAKE: '+G.stake,W/2,py+ph+18);
  cx.fillStyle='#334';cx.font='11px monospace';
  cx.fillText('SEED  '+seedText(G.seed),W/2,py+ph+34);
}
function drawRebuildConfig(rf){
  const ch=CHASSIS.find(c=>c.id===rf.chassisId);if(!ch)return;
  const nRows=ch.slots.length+3,rh=36,pw=500,ph=52+nRows*rh+20,px=W/2-pw/2,py=Math.max(110,H/2-ph/2);
  drawMenuPanel(px,py,pw,ph,{fill:'rgba(0,12,8,.97)',stroke:'#f84',glow:'#f84',shadowBlur:14});
  drawMenuTitle('CONFIGURE: '+ch.name,W/2,py+26,'#f84','bold 14px monospace',8);
  drawMenuDivider(px,py,pw,36,'#3a1000');
  for(let i=0;i<ch.slots.length;i++){
    const sl=ch.slots[i],wpId=rf.slots[i],wp=wpId?WEAPONS.find(w=>w.id===wpId):null;
    const isSel=rf.focus===i,iy=py+50+i*rh,opts=licensedWeaponsForSlot(sl);
    cx.fillStyle=isSel?'#0f8':'#446';cx.font=(isSel?'bold ':'')+'13px monospace';cx.textAlign='left';
    cx.fillText((isSel?UI_GLYPH.pointer+' ':'  ')+'SLOT '+(i+1)+' ['+sl.type.toUpperCase()+']',px+14,iy);
    cx.fillStyle=isSel?'#0f8':(wp?'#668':'#444');cx.textAlign='right';
    cx.fillText(arrowValue(wp?wp.id.toUpperCase():'(empty)',opts.length>0),px+pw-14,iy);
  }
  const shieldRow=ch.slots.length,iy_shield=py+50+shieldRow*rh,isSelShield=rf.focus===shieldRow;
  const sh=rf.shieldId?SHIELDS.find(s=>s.id===rf.shieldId):null,shieldOpts=SHIELDS.filter(s=>hasLicense(s.id));
  cx.fillStyle=isSelShield?'#0f8':'#446';cx.font=(isSelShield?'bold ':'')+'13px monospace';cx.textAlign='left';
  cx.fillText((isSelShield?UI_GLYPH.pointer+' ':'  ')+'SHIELD',px+14,iy_shield);
  cx.fillStyle=isSelShield?'#0f8':(sh?'#668':'#444');cx.textAlign='right';
  cx.fillText(arrowValue(sh?sh.name:'(none)',shieldOpts.length>1),px+pw-14,iy_shield);
  const confirmRow=ch.slots.length+1,iy_conf=py+50+confirmRow*rh,isSelConf=rf.focus===confirmRow;
  const totalCost=rebuildTotalCost(rf.chassisId,rf.shieldId),canAfford=G.credits>=totalCost;
  cx.fillStyle=isSelConf?(canAfford?'#0f8':'#f84'):'#446';cx.font=(isSelConf?'bold ':'')+'13px monospace';cx.textAlign='center';
  cx.fillText((isSelConf?UI_GLYPH.pointer+' ':'  ')+'REBUILD  '+(totalCost===0?'FREE':totalCost+' CR')+(canAfford?'':'  '+UI_GLYPH.dash+' INSUFFICIENT'),W/2,iy_conf);
  const backRow=ch.slots.length+2,iy_back=py+50+backRow*rh,isSelBack=rf.focus===backRow;
  cx.fillStyle=isSelBack?'#f84':'#446';cx.font=(isSelBack?'bold ':'')+'13px monospace';cx.textAlign='center';
  cx.fillText((isSelBack?UI_GLYPH.pointer+' ':'  ')+'BACK',W/2,iy_back);
  if(rf.warnShown){cx.fillStyle='#f84';cx.font='11px monospace';cx.textAlign='center';cx.fillText('WARNING: no weapons equipped!',W/2,py+ph-10);}
  cx.fillStyle=canAfford?'#8df':'#f84';cx.font='13px monospace';cx.textAlign='center';
  cx.fillText('CREDITS: '+G.credits+(totalCost>0?'   COST: '+totalCost+' CR':''),W/2,py+ph+18);
}
function updRebuild(){
  if(!G.rebuildFlow)G.rebuildFlow={phase:'chassis',sel:0};
  const rf=G.rebuildFlow;
  const m=menuInput();
  const up=m.up,dn=m.down,lt=m.left,rt=m.right,ok=m.confirm,bk=m.cancel;
  if(rf.phase==='chassis'){
    const lch=licensedRebuildChassis(),items=rebuildChassisItems();
    rf.sel=moveSelection(rf.sel,items.length-1,up,dn);
    if(ok){
      ia();
      const item=items[rf.sel];
      if(item.id==='quit'){G.rebuildFlow=null;G.ENC=null;G.site=null;openTitleMenu();saveGame();return;}
      if(item.id==='charity'){applyCharityRebuild();return;}
      openRebuildConfig(item);
    }
  }else{
    const ch=CHASSIS.find(c=>c.id===rf.chassisId);if(!ch){rf.phase='chassis';return;}
    const nRows=ch.slots.length+3;
    rf.focus=moveSelection(rf.focus,nRows-1,up,dn);
    const focus=rf.focus;
    if(focus<ch.slots.length){
      const sl=ch.slots[focus],opts=[null,...licensedWeaponsForSlot(sl).map(w=>w.id)];
      if(lt)rf.slots[focus]=cycleValue(opts,rf.slots[focus],-1);
      if(rt)rf.slots[focus]=cycleValue(opts,rf.slots[focus],1);
    }else if(focus===ch.slots.length){
      const opts=[null,...SHIELDS.filter(s=>hasLicense(s.id)).map(s=>s.id)];
      if(lt)rf.shieldId=cycleValue(opts,rf.shieldId,-1);
      if(rt)rf.shieldId=cycleValue(opts,rf.shieldId,1);
    }else if(focus===ch.slots.length+1){
      if(ok){
        ia();
        const hasWeapon=rf.slots.some(s=>s!==null);
        if(!hasWeapon&&!rf.warnShown){rf.warnShown=true;return;}
        finalizeRebuild(rf,ch);
      }
    }else if(ok||bk){
      rf.phase='chassis';
    }
    if(bk&&focus<ch.slots.length+2)rf.phase='chassis';
  }
}
