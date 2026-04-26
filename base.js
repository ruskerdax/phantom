'use strict';

// ===================== BASE / SHOP =====================
function shopItemsForTab(tab){
  if(tab===1)return CHASSIS;
  if(tab===2)return WEAPONS;
  if(tab===3)return AUX_ITEMS;
  return [];
}
function itemLicensePrice(item){return item.licensePrice??0;}
function itemBuildPrice(item){return item.buildPrice??0;}
function itemTypeLabel(item){
  if(CHASSIS.includes(item))return 'CHASSIS';
  if(AUX_ITEMS.includes(item))return 'AUX';
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
function drawBaseHeader(px,py,pw){
  cx.fillStyle='rgba(0,12,8,.95)';cx.fillRect(px,py,pw,360);
  cx.strokeStyle='#aaccff';cx.shadowColor='#aaccff';cx.shadowBlur=16;cx.lineWidth=1.5;
  cx.strokeRect(px,py,pw,360);cx.shadowBlur=0;
  cx.fillStyle='#aaccff';cx.font='bold 18px monospace';cx.textAlign='center';cx.shadowColor='#aaccff';cx.shadowBlur=10;
  cx.fillText('FRIENDLY BASE',W/2,py+24);cx.shadowBlur=0;
  cx.fillStyle='#aaffcc';cx.font='11px monospace';cx.textAlign='right';
  cx.fillText('CREDITS  '+G.credits,px+pw-12,py+24);
  // tabs
  const tabs=['SERVICES','CHASSIS','WEAPONS','AUX'];
  const tw=(pw-24)/4;
  for(let i=0;i<4;i++){
    const tx=px+12+i*tw,sel=i===G.baseTab;
    cx.strokeStyle=sel?'#0f8':'#335';cx.shadowColor='#0f8';cx.shadowBlur=sel?8:0;cx.lineWidth=1;
    cx.fillStyle=sel?'rgba(0,40,20,.9)':'rgba(0,15,8,.6)';
    cx.fillRect(tx,py+32,tw-2,22);
    cx.strokeRect(tx,py+32,tw-2,22);
    cx.fillStyle=sel?'#0f8':'#558';cx.font=sel?'bold 11px monospace':'11px monospace';
    cx.textAlign='center';cx.fillText(tabs[i],tx+tw/2-1,py+47);
  }
  cx.shadowBlur=0;
  cx.strokeStyle='#1a4a2a';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+8,py+57);cx.lineTo(px+pw-8,py+57);cx.stroke();
}

function drawBaseServices(){
  const{pw,ph,px,py}=basePanel();
  const s=G.OW.s;
  const repairCost=(s.maxHp-s.hp)*100,rechargeCost=Math.ceil((s.maxEnergy-s.energy)*10);
  const costs=[repairCost,rechargeCost],maxed=[s.hp>=s.maxHp,s.energy>=s.maxEnergy];
  const items=['REPAIR HULL','RECHARGE ENERGY'];
  cx.font='13px monospace';
  for(let i=0;i<2;i++){
    const iy=py+88+i*44,sel=i===G.baseSel;
    const disabled=maxed[i]||G.credits<costs[i];
    cx.fillStyle=sel?'#0f8':disabled?'#445':'#668';
    cx.shadowColor='#0f8';cx.shadowBlur=sel?8:0;
    cx.textAlign='left';cx.fillText((sel?'▶ ':'  ')+items[i],px+20,iy);
    if(maxed[i]){cx.fillStyle='#446';cx.shadowBlur=0;cx.textAlign='right';cx.fillText('FULL',px+pw-20,iy);}
    else{
      const canAfford=G.credits>=costs[i];
      cx.fillStyle=sel?(canAfford?'#aaffcc':'#f44'):'#446';cx.shadowBlur=0;cx.textAlign='right';
      cx.fillText(costs[i]+' CR',px+pw-20,iy);
    }
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText('ESC TO LEAVE',W/2,py+348);
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
    cx.fillText((isSel?'▶ ':'  ')+item.name,px+20,iy);
    cx.shadowBlur=0;cx.textAlign='right';
    if(eq){cx.fillStyle='#0a6';cx.fillText('★ EQUIPPED',px+pw-20,iy);}
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
    if(G.baseTab===1){const ch=item;detail=`HP ${ch.maxHp}  ENERGY ${ch.maxEnergy}  THR ${ch.thrMul}x${ch.reverse?' REV':''}  SLOTS: `+ch.slots.map(s=>s.type.toUpperCase()).join(' + ');}
    else if(G.baseTab===2){const wp=item;detail=`TYPE: ${wp.wpnType.toUpperCase()}  DMG ${wp.dmg}  CD ${wp.cd}s`+(wp.range?`  RANGE ${wp.range}`:'');}
    else if(G.baseTab===3){const ax=item;detail=`${ax.desc}  DRAIN ${ax.energyDrain}/frame`;}
    cx.fillText(detail,px+12,dy+6);
    if(item.desc&&G.baseTab!==3){cx.fillStyle='#446';cx.font='10px monospace';cx.fillText(item.desc,px+12,dy+20);}
    cx.fillStyle='#446';cx.font='10px monospace';cx.textAlign='right';
    if(!hasLicense(item.id))cx.fillText('BUILD: '+itemBuildPrice(item)+' CR  (after license)',px+pw-12,dy+6);
    else if(!isEquipped(item.id))cx.fillText('BUILD COST: '+itemBuildPrice(item)+' CR',px+pw-12,dy+6);
  }
  cx.shadowBlur=0;cx.fillStyle='#334';cx.font='11px monospace';cx.textAlign='center';
  cx.fillText('◄► SWITCH TAB   ENTER SELECT   ESC LEAVE',W/2,py+348);
}

function drawShopAction(){
  const{pw,ph,px,py}=basePanel();
  if(G.baseTab===0)drawBaseServices();else drawBaseShop();
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
    const disabled=opt.disabled;
    cx.fillStyle=sel?(disabled?'#844':'#0f8'):disabled?'#344':'#558';
    cx.shadowColor='#0f8';cx.shadowBlur=sel&&!disabled?8:0;
    cx.font='13px monospace';cx.textAlign='center';
    cx.fillText((sel?'▶ ':'')+opt.label,W/2,oy+62+i*36);
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
    const canEquip=CHASSIS.includes(item)||AUX_ITEMS.includes(item)||(WEAPONS.includes(item)&&compatibleSlots(item).length>0);
    if(canEquip)opts.push({label:`BUY + EQUIP  ${lp+bp===0?'FREE':(lp+bp)+' CR'}`,act:'buy_equip',disabled:G.credits<lp+bp});
  }else if(!eq){
    const canEquip=CHASSIS.includes(item)||AUX_ITEMS.includes(item)||(WEAPONS.includes(item)&&compatibleSlots(item).length>0);
    if(canEquip){
      if(WEAPONS.includes(item)){
        const cslots=compatibleSlots(item);
        if(cslots.length===1){opts.push({label:`EQUIP SLOT ${cslots[0].i+1}  ${bp===0?'FREE':bp+' CR'}`,act:'equip_weapon',slotIdx:cslots[0].i,disabled:G.credits<bp});}
        else{for(const{i}of cslots)opts.push({label:`EQUIP → SLOT ${i+1}  ${bp===0?'FREE':bp+' CR'}`,act:'equip_weapon',slotIdx:i,disabled:G.credits<bp});}
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
  cx.fillText('BUILD COST: '+ch.buildPrice+' CR   ◄► CYCLE   ENTER CONFIRM   ESC CANCEL',W/2,py+44);
  cx.strokeStyle='#1a4a2a';cx.lineWidth=1;cx.beginPath();cx.moveTo(px+10,py+54);cx.lineTo(px+pw-10,py+54);cx.stroke();
  // weapon slots
  const rows=[];
  for(let i=0;i<ch.slots.length;i++)rows.push({label:`SLOT ${i+1} [${ch.slots[i].type.toUpperCase()}]`,kind:'weapon',idx:i});
  rows.push({label:'AUX SLOT',kind:'aux'});
  rows.push({label:ef.warnShown?'CONFIRM (NO WEAPONS — ARE YOU SURE?)':'CONFIRM',kind:'confirm'});
  rows.push({label:'CANCEL',kind:'cancel'});
  for(let r=0;r<rows.length;r++){
    const row=rows[r],ry=py+74+r*40,sel=r===ef.focus;
    cx.textAlign='left';
    cx.fillStyle=sel?'#0f8':'#558';cx.shadowColor='#0f8';cx.shadowBlur=sel?8:0;
    cx.font='12px monospace';
    cx.fillText((sel?'▶ ':'')+row.label,px+20,ry);
    cx.shadowBlur=0;cx.textAlign='right';
    if(row.kind==='weapon'){
      const wid=ef.slots[row.idx],wp=wid?WEAPONS.find(w=>w.id===wid):null;
      cx.fillStyle=wp?'#aaffcc':'#446';cx.fillText(wp?wp.id.toUpperCase():'(empty)',px+pw-20,ry);
    }else if(row.kind==='aux'){
      const ax=ef.auxId?AUX_ITEMS.find(a=>a.id===ef.auxId):null;
      cx.fillStyle=ax?'#aaffcc':'#446';cx.fillText(ax?ax.name:'(empty)',px+pw-20,ry);
    }
  }
  if(ef.warnShown){cx.fillStyle='#f84';cx.font='11px monospace';cx.textAlign='center';cx.fillText('WARNING: no weapons equipped!',W/2,py+ph-18);}
  cx.restore();
}

function updEquipFlow(up,dn,lt,rt,ok,bk){
  const ef=G.equipFlow,ch=CHASSIS.find(c=>c.id===ef.chassisId);
  const nRows=ch.slots.length+3; // slots + aux + confirm + cancel
  if(up)ef.focus=Math.max(0,ef.focus-1);
  if(dn)ef.focus=Math.min(nRows-1,ef.focus+1);
  const row=ef.focus;
  if(row<ch.slots.length){
    // weapon slot — cycle compatible owned weapons + null
    if(lt||rt){
      const slotType=ch.slots[row].type;
      const valid=[null,...WEAPONS.filter(w=>w.wpnType===slotType+' gun'&&hasLicense(w.id)).map(w=>w.id)];
      const cur=valid.indexOf(ef.slots[row]);
      ef.slots[row]=valid[((cur+(rt?1:-1))+valid.length)%valid.length];
    }
  }else if(row===ch.slots.length){
    // aux slot
    if(lt||rt){
      const valid=[null,...AUX_ITEMS.filter(a=>hasLicense(a.id)).map(a=>a.id)];
      const cur=valid.indexOf(ef.auxId);
      ef.auxId=valid[((cur+(rt?1:-1))+valid.length)%valid.length];
    }
  }else if(row===ch.slots.length+1&&ok){
    // confirm
    const hasWeapon=ef.slots.some(s=>s!==null);
    if(!hasWeapon&&!ef.warnShown){ef.warnShown=true;return;}
    // apply
    G.credits-=ef.buildPrice;
    G.loadout.chassis=ef.chassisId;
    G.loadout.weapons=[...ef.slots];
    G.loadout.aux=ef.auxId;
    // resize weapons array to chassis slot count
    while(G.loadout.weapons.length<ch.slots.length)G.loadout.weapons.push(null);
    G.loadout.weapons=G.loadout.weapons.slice(0,ch.slots.length);
    // update ship stats in-flight
    const s=G.OW?.s;if(s){s.maxHp=ch.maxHp;s.maxEnergy=ch.maxEnergy;s.hp=s.maxHp;s.energy=s.maxEnergy;}
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
    // For aux/weapon: pay total now.
    if(opt.act==='buy_equip'){
      if(G.credits<lp){tone(80,.1,'square',.06);return;}
      G.credits-=lp;if(!hasLicense(item.id))G.licenses.push(item.id);
    }
    if(CHASSIS.includes(item)){
      if(G.credits<bp){tone(80,.1,'square',.06);if(opt.act==='buy_equip')saveGame();return;}
      G.equipFlow={chassisId:item.id,slots:item.slots.map(()=>null),auxId:G.loadout.aux,focus:0,buildPrice:bp,warnShown:false};
      G.shopActionId=null;
    }else if(AUX_ITEMS.includes(item)){
      if(G.credits<bp){tone(80,.1,'square',.06);if(opt.act==='buy_equip')saveGame();return;}
      G.credits-=bp;G.loadout.aux=item.id;tone(660,.15,'sine',.08);G.shopActionId=null;saveGame();
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
  const m=menuInput({fireConfirms:true});
  const up=m.up,dn=m.down,lt=m.left,rt=m.right,ok=m.confirm,bk=m.cancel;
  if(G.equipFlow){updEquipFlow(up,dn,lt,rt,ok,bk);return;}
  if(G.shopActionId!==null){
    const items=shopItemsForTab(G.baseTab);
    const item=items.find(it=>it.id===G.shopActionId);
    if(item){
      const opts=shopActionOpts(item);
      if(up)G.shopActionSel=Math.max(0,G.shopActionSel-1);
      if(dn)G.shopActionSel=Math.min(opts.length-1,G.shopActionSel+1);
      if(ok)execShopAction(opts[G.shopActionSel]);
    }else{G.shopActionId=null;}
    if(bk)G.shopActionId=null;
    return;
  }
  if(lt){G.baseTab=Math.max(0,G.baseTab-1);G.shopSel=0;G.baseSel=0;}
  if(rt){G.baseTab=Math.min(3,G.baseTab+1);G.shopSel=0;G.baseSel=0;}
  if(G.baseTab===0){
    if(up)G.baseSel=Math.max(0,G.baseSel-1);
    if(dn)G.baseSel=Math.min(1,G.baseSel+1);
    if(ok){
      const s=G.OW.s;
      if(G.baseSel===0){const cost=(s.maxHp-s.hp)*100;if(s.hp>=s.maxHp||G.credits<cost)tone(80,.1,'square',.06);else{G.credits-=cost;s.hp=s.maxHp;tone(660,.2,'sine',.08);saveGame();}}
      else{const cost=Math.ceil((s.maxEnergy-s.energy)*10);if(s.energy>=s.maxEnergy||G.credits<cost)tone(80,.1,'square',.06);else{G.credits-=cost;s.energy=s.maxEnergy;tone(660,.2,'sine',.08);saveGame();}}
    }
  }else{
    const items=shopItemsForTab(G.baseTab);
    if(up)G.shopSel=Math.max(0,G.shopSel-1);
    if(dn)G.shopSel=Math.min(Math.max(0,items.length-1),G.shopSel+1);
    if(ok&&items.length>0)openShopAction(items[G.shopSel]);
  }
  if(bk){G.st='overworld';saveGame();}
}

function drawBaseMenu(){
  drawOW();
  if(G.equipFlow){drawEquipFlow();return;}
  const{pw,ph,px,py}=basePanel();
  cx.save();
  drawBaseHeader(px,py,pw);
  if(G.shopActionId!==null)drawShopAction();
  else if(G.baseTab===0)drawBaseServices();
  else drawBaseShop();
  cx.restore();
}
