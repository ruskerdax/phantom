'use strict';

// ===================== BASE / SHOP =====================
function baseTabs(){return[
  {id:'services',label:'SERVICES'},
  {id:'chassis',label:'CHASSIS'},
  {id:'weapons',label:'WEAPONS'},
  {id:'shields',label:'SHIELDS'},
];}
function baseTabId(tab=G.baseTab){return baseTabs()[tab]?.id||'services';}
function shopItemsForTab(tab){
  const id=typeof tab==='string'?tab:baseTabId(tab);
  if(id==='chassis')return CHASSIS.filter(c=>c.buyable);
  if(id==='weapons')return WEAPONS.filter(w=>w.buyable);
  if(id==='shields')return SHIELDS.filter(s=>s.buyable);
  return [];
}
function itemLicensePrice(item){return item.licensePrice??0;}
function itemBuildPrice(item){return item.buildPrice??0;}
function itemTypeLabel(item){
  if(CHASSIS.includes(item))return 'CHASSIS';
  if(AUX_ITEMS.includes(item))return 'AUX';
  if(SHIELDS.includes(item))return 'SHIELD';
  const wp=WEAPONS.find(w=>w===item);
  if(wp)return wp.wpnType.toUpperCase();
  return '';
}
function itemStatusLabel(item){
  const owned=hasLicense(item.id),eq=isEquipped(item.id);
  if(eq)return'EQUIPPED';
  if(owned)return'LICENSED';
  return itemLicensePrice(item)===0?'FREE':'';
}

function basePanel(){
  const pw=530,ph=360,px=W/2-pw/2,py=H/2-ph/2;
  return{pw,ph,px,py};
}
function baseRepairCost(s){return Math.max(0,(s.maxHp-s.hp)*25);}
function drawBaseHeader(px,py,pw){
  drawMenuPanel(px,py,pw,360,{fill:'rgba(0,12,8,.95)',stroke:'#aaccff',glow:'#aaccff'});
  drawMenuTitle('FRIENDLY BASE',W/2,py+24,'#aaccff','bold 18px monospace',10);
  drawMenuTabs(baseTabs(),G.baseTab,px,py+32,pw);
  cx.shadowBlur=0;drawMenuDivider(px,py,pw,57);
}

function drawBaseServices(){
  const{pw,ph,px,py}=basePanel();
  const s=G.OW.s;
  syncShipEnergyProfile(s);
  const repairCost=baseRepairCost(s);
  const costs=[repairCost],maxed=[s.hp>=s.maxHp];
  const items=['REPAIR HULL'];
  cx.font='13px monospace';
  for(let i=0;i<items.length;i++){
    const iy=py+88+i*44,sel=i===G.baseSel;
    const disabled=maxed[i]||G.credits<costs[i];
    cx.fillStyle=sel?'#0f8':disabled?'#445':'#668';
    cx.shadowColor='#0f8';cx.shadowBlur=sel?8:0;
    cx.textAlign='left';cx.fillText((sel?UI_GLYPH.pointer+' ':'  ')+items[i],px+20,iy);
    if(maxed[i]){cx.fillStyle='#446';cx.shadowBlur=0;cx.textAlign='right';cx.fillText('FULL',px+pw-20,iy);}
    else{
      const canAfford=G.credits>=costs[i];
      cx.fillStyle=sel?(canAfford?'#aaffcc':'#f44'):'#446';cx.shadowBlur=0;cx.textAlign='right';
      cx.fillText(costs[i]+' CR',px+pw-20,iy);
    }
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  drawMenuFooter(UI_GLYPH.left+UI_GLYPH.right+' SWITCH TAB   ENTER SELECT   '+pausePrompt('TO LEAVE'),W/2,py+348);
}

function drawBaseShop(){
  const{pw,ph,px,py}=basePanel();
  const items=shopItemsForTab(G.baseTab);
  const sel=Math.min(G.shopSel,items.length-1);
  cx.font='12px monospace';
  for(let i=0;i<items.length;i++){
    const item=items[i],iy=py+78+i*34,isSel=i===sel;
    const owned=hasLicense(item.id),eq=isEquipped(item.id);
    cx.textAlign='left';
    cx.fillStyle=isSel?'#0f8':owned?'#668':'#446';
    cx.shadowColor='#0f8';cx.shadowBlur=isSel?8:0;
    cx.fillText((isSel?UI_GLYPH.pointer+' ':'  ')+item.name,px+20,iy);
    cx.shadowBlur=0;cx.textAlign='right';
    if(eq){cx.fillStyle='#0a6';cx.fillText(UI_GLYPH.star+' EQUIPPED',px+pw-20,iy);}
    else if(owned){cx.fillStyle='#446';cx.fillText('LICENSED',px+pw-20,iy);}
    else{
      const lp=itemLicensePrice(item);
      cx.fillStyle=G.credits>=lp?'#668':'#445';
      cx.fillText(lp===0?'FREE':lp+' CR',px+pw-20,iy);
    }
  }
  // detail panel
  if(items.length>0){
    const item=items[sel];
    const dy=py+78+items.length*34+6;
    cx.strokeStyle='#1a4a2a';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+8,dy-10);cx.lineTo(px+pw-8,dy-10);cx.stroke();
    cx.fillStyle='#669';cx.font='11px monospace';cx.textAlign='left';
    let detail='';
    const tabId=baseTabId();
    if(tabId==='chassis'){
      const ch=item;
      detail=chassisStatsText(ch);
    }
    else if(tabId==='weapons')detail=weaponStatsText(item);
    else if(tabId==='shields')detail=shieldStatsText(item);
    cx.fillText(detail,px+12,dy+6);
    if(item.desc){cx.fillStyle='#446';cx.font='10px monospace';cx.fillText(item.desc,px+12,dy+20);}
    cx.fillStyle='#446';cx.font='10px monospace';cx.textAlign='right';
    if(!hasLicense(item.id))cx.fillText('BUILD: '+itemBuildPrice(item)+' CR  (after license)',px+pw-12,dy+34);
    else if(!isEquipped(item.id))cx.fillText('BUILD COST: '+itemBuildPrice(item)+' CR',px+pw-12,dy+34);
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  drawMenuFooter(UI_GLYPH.left+UI_GLYPH.right+' SWITCH TAB   ENTER SELECT   '+pausePrompt('TO LEAVE'),W/2,py+348);
}

function drawShopAction(){
  const{pw,ph,px,py}=basePanel();
  if(baseTabId()==='services')drawBaseServices();else drawBaseShop();
  // overlay
  const ow2=260,oh=200,ox=W/2-ow2/2,oy=H/2-oh/2;
  cx.fillStyle='rgba(0,8,4,.97)';cx.fillRect(ox,oy,ow2,oh);
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=14;cx.lineWidth=1.5;cx.strokeRect(ox,oy,ow2,oh);cx.shadowBlur=0;
  const items=shopItemsForTab(G.baseTab);
  const item=items.find(it=>it.id===G.shopActionId);
  if(!item){G.shopActionId=null;return;}
  cx.fillStyle='#aaccff';cx.font='bold 13px monospace';cx.textAlign='center';cx.fillText(item.name,W/2,oy+26);
  const opts=shopActionOpts(item);
  for(let i=0;i<opts.length;i++){
    const sel=i===G.shopActionSel,opt=opts[i];
    drawMenuRow(opt.label,W/2,oy+62+i*36,sel,{disabled:opt.disabled,col:'#558',disabledCol:'#344'});
  }
  cx.shadowBlur=0;
}

function shopActionOpts(item){
  const owned=hasLicense(item.id),eq=isEquipped(item.id);
  const lp=itemLicensePrice(item),bp=itemBuildPrice(item);
  const ch=activeChassisObj();
  const opts=[];
  if(!owned){
    opts.push({label:`BUY LICENSE  ${lp===0?'FREE':lp+' CR'}`,act:'buy_license',disabled:lp>0&&G.credits<lp});
    // can we equip on this chassis?
    const canEquip=CHASSIS.includes(item)||AUX_ITEMS.includes(item)||SHIELDS.includes(item)||(WEAPONS.includes(item)&&compatibleSlots(item).length>0);
    if(canEquip)opts.push({label:`BUY + EQUIP  ${lp+bp===0?'FREE':(lp+bp)+' CR'}`,act:'buy_equip',disabled:G.credits<lp+bp});
  }else if(!eq){
    const canEquip=CHASSIS.includes(item)||AUX_ITEMS.includes(item)||SHIELDS.includes(item)||(WEAPONS.includes(item)&&compatibleSlots(item).length>0);
    if(canEquip){
      if(WEAPONS.includes(item)){
        const cslots=compatibleSlots(item);
        if(cslots.length===1){opts.push({label:`EQUIP SLOT ${cslots[0].i+1}  ${bp===0?'FREE':bp+' CR'}`,act:'equip_weapon',slotIdx:cslots[0].i,disabled:G.credits<bp});}
        else{for(const{i}of cslots)opts.push({label:`EQUIP ${UI_GLYPH.arrow} SLOT ${i+1}  ${bp===0?'FREE':bp+' CR'}`,act:'equip_weapon',slotIdx:i,disabled:G.credits<bp});}
      }else{opts.push({label:`EQUIP  ${bp===0?'FREE':bp+' CR'}`,act:'equip',disabled:G.credits<bp});}
    }else{opts.push({label:'NO COMPATIBLE SLOT',act:'none',disabled:true});}
  }else{opts.push({label:'ALREADY EQUIPPED',act:'none',disabled:true});}
  opts.push({label:'CANCEL',act:'cancel',disabled:false});
  return opts;
}

function drawEquipFlow(){
  drawOW();
  const ef=G.equipFlow,ch=CHASSIS.find(c=>c.id===ef.chassisId);
  const pw=500,ph=320,px=W/2-pw/2,py=H/2-ph/2;
  cx.save();
  cx.fillStyle='rgba(0,10,6,.97)';cx.fillRect(px,py,pw,ph);
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=14;cx.lineWidth=1.5;cx.strokeRect(px,py,pw,ph);cx.shadowBlur=0;
  cx.fillStyle='#aaccff';cx.font='bold 15px monospace';cx.textAlign='center';
  cx.fillText('CONFIGURE: '+ch.name,W/2,py+28);
  cx.fillStyle='#446';cx.font='11px monospace';
  cx.fillText('BUILD COST: '+ch.buildPrice+' CR   '+UI_GLYPH.left+UI_GLYPH.right+' CYCLE   ENTER CONFIRM   '+pausePrompt('TO CANCEL'),W/2,py+44);
  cx.strokeStyle='#1a4a2a';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+10,py+54);cx.lineTo(px+pw-10,py+54);cx.stroke();
  // weapon slots
  const rows=[];
  for(let i=0;i<ch.slots.length;i++)rows.push({label:`SLOT ${i+1} [${ch.slots[i].type.toUpperCase()}]`,kind:'weapon',idx:i});
  rows.push({label:'SHIELD SLOT',kind:'shield'});
  rows.push({label:ef.warnShown?'CONFIRM (NO WEAPONS '+UI_GLYPH.dash+' ARE YOU SURE?)':'CONFIRM',kind:'confirm'});
  rows.push({label:'CANCEL',kind:'cancel'});
  for(let r=0;r<rows.length;r++){
    const row=rows[r],ry=py+74+r*40,sel=r===ef.focus;
    cx.textAlign='left';
    cx.fillStyle=sel?'#0f8':'#558';cx.shadowColor='#0f8';cx.shadowBlur=sel?8:0;
    cx.font='12px monospace';
    cx.fillText(selectedPrefix(sel)+row.label,px+20,ry);
    cx.shadowBlur=0;cx.textAlign='right';
    if(row.kind==='weapon'){
      const wid=ef.slots[row.idx],wp=wid?WEAPONS.find(w=>w.id===wid):null;
      const opts=licensedWeaponsForSlot(ch.slots[row.idx]),label=wp?wp.id.toUpperCase():'(empty)';
      cx.fillStyle=wp?'#aaffcc':'#446';cx.fillText(arrowValue(label,opts.length>0),px+pw-20,ry);
    }else if(row.kind==='shield'){
      const sh=ef.shieldId?SHIELDS.find(s=>s.id===ef.shieldId):null;
      const opts=SHIELDS.filter(s=>hasLicense(s.id)),label=sh?sh.name:'(empty)';
      cx.fillStyle=sh?'#aaffcc':'#446';cx.fillText(arrowValue(label,opts.length>0),px+pw-20,ry);
    }
  }
  if(ef.warnShown){cx.fillStyle='#f84';cx.font='11px monospace';cx.textAlign='center';cx.fillText('WARNING: no weapons equipped!',W/2,py+ph-18);}
  cx.restore();
}

function updEquipFlow(up,dn,lt,rt,ok,bk){
  const ef=G.equipFlow,ch=CHASSIS.find(c=>c.id===ef.chassisId);
  const nRows=ch.slots.length+3; // slots + shield + confirm + cancel
  ef.focus=moveSelection(ef.focus,nRows-1,up,dn);
  const row=ef.focus;
  if(row<ch.slots.length){
    // weapon slot: cycle compatible owned weapons + null
    if(lt||rt){
      const valid=[null,...licensedWeaponIdsForSlot(ch.slots[row])];
      const cur=valid.indexOf(ef.slots[row]);
      ef.slots[row]=valid[((cur+(rt?1:-1))+valid.length)%valid.length];
    }
  }else if(row===ch.slots.length){
    // shield slot
    if(lt||rt){
      const valid=[null,...SHIELDS.filter(s=>hasLicense(s.id)).map(s=>s.id)];
      const cur=valid.indexOf(ef.shieldId);
      ef.shieldId=valid[((cur+(rt?1:-1))+valid.length)%valid.length];
    }
  }else if(row===ch.slots.length+1&&ok){
    // confirm
    const hasWeapon=ef.slots.some(s=>s!==null);
    if(!hasWeapon&&!ef.warnShown){ef.warnShown=true;return;}
    // apply
    G.credits-=ef.buildPrice;
    G.loadout.chassis=ef.chassisId;
    G.loadout.weapons=[...ef.slots];
    G.loadout.shield=ef.shieldId;
    // resize weapons array to chassis slot count
    while(G.loadout.weapons.length<ch.slots.length)G.loadout.weapons.push(null);
    G.loadout.weapons=G.loadout.weapons.slice(0,ch.slots.length);
    // update ship stats in-flight
    const s=G.OW?.s;if(s){s.chassisId=ch.id;s.batteryId=ch.batteryId??null;s.reactorId=ch.reactorId??null;s.maxHp=ch.maxHp;s.hp=s.maxHp;fillShipEnergy(s);resetShipShield(s);}
    G.equipFlow=null;G.shopActionId=null;
    saveGame();tone(660,.2,'sine',.08);
  }else if(row===ch.slots.length+2&&ok){
    G.equipFlow=null;
  }
  if(bk)G.equipFlow=null;
}

function openShopAction(item){
  G.shopActionId=item.id;
  G.shopActionSel=0;
}

function execShopAction(opt){
  const items=shopItemsForTab(G.baseTab);
  const item=items.find(it=>it.id===G.shopActionId);
  if(!item||opt.disabled)return;
  if(opt.act==='cancel'){G.shopActionId=null;return;}
  if(opt.act==='none')return;
  const lp=itemLicensePrice(item),bp=itemBuildPrice(item);
  if(opt.act==='buy_license'){
    if(G.credits<lp&&lp>0){tone(80,.1,'square',.06);return;}
    G.credits-=lp;if(!hasLicense(item.id))G.licenses.push(item.id);
    tone(660,.15,'sine',.08);G.shopActionId=null;saveGame();
  }else if(opt.act==='buy_equip'||opt.act==='equip'){
    // For chassis: pay license now (non-refundable), build cost deducted on confirm.
    // For equipment/weapon: pay total now.
    if(opt.act==='buy_equip'){
      if(G.credits<lp){tone(80,.1,'square',.06);return;}
      G.credits-=lp;if(!hasLicense(item.id))G.licenses.push(item.id);
    }
    if(CHASSIS.includes(item)){
      if(G.credits<bp){tone(80,.1,'square',.06);if(opt.act==='buy_equip')saveGame();return;}
      G.equipFlow={chassisId:item.id,slots:item.slots.map(()=>null),shieldId:G.loadout.shield,focus:0,buildPrice:bp,warnShown:false};
      G.shopActionId=null;
    }else if(AUX_ITEMS.includes(item)){
      if(G.credits<bp){tone(80,.1,'square',.06);if(opt.act==='buy_equip')saveGame();return;}
      G.credits-=bp;G.loadout.aux=item.id;tone(660,.15,'sine',.08);G.shopActionId=null;saveGame();
    }else if(SHIELDS.includes(item)){
      if(G.credits<bp){tone(80,.1,'square',.06);if(opt.act==='buy_equip')saveGame();return;}
      G.credits-=bp;G.loadout.shield=item.id;resetShipShield(G.OW?.s);tone(660,.15,'sine',.08);G.shopActionId=null;saveGame();
    }
  }else if(opt.act==='equip_weapon'){
    if(G.credits<bp){tone(80,.1,'square',.06);return;}
    G.credits-=bp;
    const slots=G.loadout.weapons;
    while(slots.length<=opt.slotIdx)slots.push(null);
    slots[opt.slotIdx]=item.id;
    tone(660,.15,'sine',.08);G.shopActionId=null;saveGame();
  }
}

function updBase(){
  const m=menuInput();
  const up=m.up,dn=m.down,lt=m.left,rt=m.right,ok=m.confirm,bk=m.cancel;
  if(G.equipFlow){updEquipFlow(up,dn,lt,rt,ok,bk);return;}
  if(G.shopActionId!==null){
    const items=shopItemsForTab(G.baseTab);
    const item=items.find(it=>it.id===G.shopActionId);
    if(item){
      const opts=shopActionOpts(item);
      G.shopActionSel=moveSelection(G.shopActionSel,opts.length-1,up,dn);
      if(ok)execShopAction(opts[G.shopActionSel]);
    }else{G.shopActionId=null;}
    if(bk)G.shopActionId=null;
    return;
  }
  if(lt||rt){G.baseTab=moveTabSelection(G.baseTab,baseTabs(),lt,rt);G.shopSel=0;G.baseSel=0;}
  if(baseTabId()==='services'){
    G.baseSel=moveSelection(G.baseSel,0,up,dn);
    if(ok){
      const s=G.OW.s;
      if(G.baseSel===0){const cost=baseRepairCost(s);if(s.hp>=s.maxHp||G.credits<cost)tone(80,.1,'square',.06);else{G.credits-=cost;s.hp=s.maxHp;tone(660,.2,'sine',.08);saveGame();}}
    }
  }else{
    const items=shopItemsForTab(G.baseTab);
    G.shopSel=moveSelection(G.shopSel,Math.max(0,items.length-1),up,dn);
    if(ok&&items.length>0)openShopAction(items[G.shopSel]);
  }
  if(bk){returnToOverworld();saveGame();}
}

function drawBaseMenu(){
  drawOW();
  if(G.equipFlow){drawEquipFlow();return;}
  const{pw,ph,px,py}=basePanel();
  cx.save();
  drawBaseHeader(px,py,pw);
  if(G.shopActionId!==null)drawShopAction();
  else if(baseTabId()==='services')drawBaseServices();
  else drawBaseShop();
  cx.restore();
}
