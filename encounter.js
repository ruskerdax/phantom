'use strict';

// ===================== ENCOUNTER =====================
function encKillShip(){
  const enc=G.ENC,s=enc.s;if(!s.alive)return;
  s.alive=false;boomAt(enc.pts,s.x,s.y,'#fff',28);boomAt(enc.pts,s.x,s.y,'#fa0',16);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_enc';saveGame();
  setTimeout(()=>{G.st='rebuild';},1800);
}
function encWin(){
  const enc=G.ENC,ow=G.OW;
  if(enc.isHBase){G.hbCleared=true;G.hbState=null;}
  if(enc.owIdx!=null)ow.en[enc.owIdx].alive=false;
  if(enc.fleetIdx!=null)ow.fleets[enc.fleetIdx].alive=false;
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
  applyRotation(s, iRot(), s.energy<=0);
  s.shld=iShd(s.energy);
  if(s.shld){const ax=activeAuxObj();s.energy=Math.max(0,s.energy-(ax?.energyDrain??0.15));}
  if(iThr()&&!s.shld){
    applyLinearThrust(s, 1, s.energy<=0);
    if(s.energy>0) s.energy=Math.max(0,s.energy-.04);
  }
  const sp=Math.hypot(s.vx,s.vy);if(sp>5){s.vx=s.vx/sp*5;s.vy=s.vy/sp*5;}
  if(enc.cleared){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){encWin();return;}}
  else if(enc.isHBase){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){G.hbState={turrets:enc.hbase.turrets.map(t=>t.alive),softpts:enc.hbase.softpts.map(sp=>sp.alive)};const ow=G.OW;ow.s.energy=s.energy;ow.s.hp=s.hp;ow.s.maxHp=s.maxHp;ow.s.vx+=(Math.random()-.5)*1.5;ow.s.vy+=(Math.random()-.5)*1.5;ow.s.inv=80;G.ENC=null;G.st='overworld';return;}}
  else{s.x=wrap(s.x+s.vx,ew);s.y=wrap(s.y+s.vy,eh);}
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  // Lerp the camera toward the player (clamped to world bounds). The 0.12 multiplier controls follow speed —
  // smaller values add more lag; 1.0 would snap instantly. Same pattern is used in the site level.
  enc.cam.x+=(Math.max(0,Math.min(ew-W,s.x-W*.5))-enc.cam.x)*.12;
  enc.cam.y+=(Math.max(0,Math.min(eh-H,s.y-H*.5))-enc.cam.y)*.12;
  for(const rk of enc.rocks){rk.x=wrap(rk.x+rk.vx,ew);rk.y=wrap(rk.y+rk.vy,eh);}
  for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(Math.hypot(s.x-rk.x,s.y-rk.y)<rk.r+7){
    const spd=Math.hypot(s.vx,s.vy);
    const rd=Math.hypot(s.x-rk.x,s.y-rk.y)||1;const nx=(s.x-rk.x)/rd;const ny=(s.y-rk.y)/rd;
    const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.va*=.55;s.x+=nx*10;s.y+=ny*10;
    const dmg=Math.round((spd/5.5)*5);
    if(!s.shld&&dmg>0&&!G.invincible){s.hp=Math.max(0,s.hp-dmg);tone(180,.15,'sawtooth',.12);}
    if(dmg>0){rk.hp-=dmg;boomAt(enc.pts,rk.x,rk.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);}
    if(s.hp<=0){encKillShip();return;}break;
  }}
  if(enc.isHBase){const{hexPoly,hx,hy}=enc.hbase;let hbHit=pip(s.x,s.y,hexPoly);if(!hbHit){for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;if(dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1])<7){hbHit=true;break;}}}if(hbHit){let best=Infinity,nx=0,ny=0;for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;const dist=dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1]);if(dist<best){best=dist;const dx=hexPoly[j][0]-hexPoly[i][0],dy=hexPoly[j][1]-hexPoly[i][1],len=Math.hypot(dx,dy)||1;nx=-dy/len;ny=dx/len;if(nx*(s.x-hx)+ny*(s.y-hy)<0){nx=-nx;ny=-ny;}}}const spd=Math.hypot(s.vx,s.vy);const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.va*=.55;s.x+=nx*10;s.y+=ny*10;const dmg=Math.round((spd/5.5)*5);if(!s.shld&&s.inv<=0&&dmg>0){s.hp=Math.max(0,s.hp-dmg);s.inv=40;tone(180,.15,'sawtooth',.12);}if(s.hp<=0){encKillShip();return;}}}
  const encWalls=enc.isHBase?enc.hbase.hexPoly.map((p,i,hp)=>{const j=(i+1)%hp.length;return[p[0],p[1],hp[j][0],hp[j][1]];}):[];
  {const wp=wpSlot(0);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft>0&&wt.tick){const tgts=[];enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));enc.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:OET[e.t].enc.r,kind:'enemy',idx:i});});if(enc.isHBase){enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({x:t.x,y:t.y,r:10,kind:'turret',idx:i});});enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});}const res=wt.tick(wp,s,0,tgts,enc.lsb,encWalls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='rock'){const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);if(rk.hp<=0)splitRock(enc,tg.idx);}else if(tg.kind==='enemy'){const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,OET[e.t].enc.col,3);if(e.hp<=0){e.alive=false;addBounty(OET[e.t].sc);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col,14);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col2,8);tone(200,.3,'sawtooth',.1);if(OET[e.t].energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}}else if(tg.kind==='turret'){const t=enc.hbase.turrets[tg.idx];t.alive=false;addBounty(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}else if(tg.kind==='softpt'){enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);}}}
  if(iFir()&&!s.shld&&!s.scd&&!s.pulsesLeft) tryFire(wp,wt,s,0,enc.bul);}}
  {const wp=wpSlot(1);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft2>0&&wt.tick){const tgts=[];enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));enc.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:OET[e.t].enc.r,kind:'enemy',idx:i});});if(enc.isHBase){enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({x:t.x,y:t.y,r:10,kind:'turret',idx:i});});enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});}const res=wt.tick(wp,s,1,tgts,enc.lsb,encWalls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='rock'){const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);if(rk.hp<=0)splitRock(enc,tg.idx);}else if(tg.kind==='enemy'){const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,OET[e.t].enc.col,3);if(e.hp<=0){e.alive=false;addBounty(OET[e.t].sc);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col,14);boomAt(enc.pts,e.x,e.y,OET[e.t].enc.col2,8);tone(200,.3,'sawtooth',.1);if(OET[e.t].energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}}else if(tg.kind==='turret'){const t=enc.hbase.turrets[tg.idx];t.alive=false;addBounty(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}else if(tg.kind==='softpt'){enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);}}}
  if(iFireSec()&&!s.shld&&!s.scd2&&!s.pulsesLeft2) tryFire(wp,wt,s,1,enc.bul);}}
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
  for(const e of alive){if(enemyUpdate(e,s,enc,ew,eh))return;}
  if(enc.isHBase&&!enc.cleared){
    for(const t of enc.hbase.turrets){if(t.alive)TURRET.update(t,enc.ebu,s);}
  }
  for(let i=enc.ebu.length-1;i>=0;i--){
    const b=enc.ebu[i];b.x=wrap(b.x+b.vx,ew);b.y=wrap(b.y+b.vy,eh);b.l-=Math.hypot(b.vx,b.vy);if(b.l<=0){enc.ebu.splice(i,1);continue;}
    let rm=false;for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(Math.hypot(b.x-rk.x,b.y-rk.y)<rk.r){rk.hp--;boomAt(enc.pts,b.x,b.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);rm=true;break;}}if(rm){enc.ebu.splice(i,1);continue;}
    if(enc.isHBase&&pip(b.x,b.y,enc.hbase.hexPoly)){enc.ebu.splice(i,1);continue;}
    if(Math.hypot(b.x-s.x,b.y-s.y)<12){
      enc.ebu.splice(i,1);
      if(!s.shld&&!G.invincible){s.hp=Math.max(0,s.hp-b.dmg);tone(380,.08,'square',.08);if(s.hp<=0){encKillShip();return;}}
    }
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
  for(const e of enc.en)if(e.alive)OET[e.t].drawEnc(e);
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
    for(const t of turrets){if(t.alive)TURRET.draw(t);}
  }
  for(const f of enc.fu)drEnergy(f.x,f.y,'#0f8');
  for(const b of enc.bul)drBullet(b.x,b.y,'#fff');
  for(const b of enc.ebu)drBullet(b.x,b.y,b.col);
  for(const lb of enc.lsb){const a=lb.l/8,bw=lb.w||2;cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=bw;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=Math.max(1,bw/2);cx.shadowBlur=0;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.restore();}
  drPts(enc.pts);
  if(enc.s.alive)drShip(enc.s.x,enc.s.y,enc.s.a,enc.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust),enc.s.energy,enc.s.inv,G.fr);
  if(enc.s.alive)drAimCone(enc.s);
  cx.restore();
  if(enc.introTimer>0){const a=Math.min(1,(70-enc.introTimer)/20);cx.save();cx.globalAlpha=a;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,H/2-36,W,72);cx.fillStyle=et.enc.col;cx.shadowColor=et.enc.col;cx.shadowBlur=20;cx.font='bold 32px monospace';cx.textAlign='center';cx.fillText(enc.label,W/2,H/2+4);cx.shadowBlur=0;cx.fillStyle='#668';cx.font='13px monospace';cx.fillText(enc.isAst&&!enc.en.length?'YOU MAY LEAVE AT ANY TIME':enc.isHBase?'DESTROY ALL SOFT POINTS TO ESCAPE':'DESTROY ALL ENEMIES TO ESCAPE',W/2,H/2+26);cx.globalAlpha=1;cx.restore();}
  const alive=enc.en.filter(e=>e.alive).length;
  cx.save();cx.font='13px monospace';cx.textAlign='center';
  if(enc.cleared){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6+5*Math.abs(Math.sin(G.fr*.08));cx.fillText('ALL CLEAR — LEAVE THE AREA',W/2,18);}
  else{cx.fillStyle=et.enc.col;cx.fillText(enc.isHBase?enc.label+' — '+enc.hbase.softpts.filter(sp=>sp.alive).length+' soft points remaining':enc.label+' — '+alive+' remaining',W/2,18);}
  cx.restore();
  drHUD(enc.s.energy,enc.s.maxEnergy,enc.s.hp,enc.s.maxHp);
}
