'use strict';

const SITE_BOUNDARY_STEP=14;
const SITE_BOUNDARY_SAMPLE=2.25;

function sitePointEmpty(d,x,y){
  if(y<0)return true;
  if(!pip(x,y,d.terrain))return false;
  for(const o of d.obs)if(pip(x,y,o))return false;
  return true;
}

function addSiteBoundaryChunks(segs,d,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(!len)return;
  const nx=-dy/len,ny=dx/len;
  const n=Math.max(1,Math.ceil(len/SITE_BOUNDARY_STEP));
  for(let k=0;k<n;k++){
    const t0=k/n,t1=(k+1)/n,tm=(t0+t1)/2;
    const mx=a[0]+dx*tm,my=a[1]+dy*tm;
    const e0=sitePointEmpty(d,mx+nx*SITE_BOUNDARY_SAMPLE,my+ny*SITE_BOUNDARY_SAMPLE);
    const e1=sitePointEmpty(d,mx-nx*SITE_BOUNDARY_SAMPLE,my-ny*SITE_BOUNDARY_SAMPLE);
    if(e0===e1)continue;
    segs.push([a[0]+dx*t0,a[1]+dy*t0,a[0]+dx*t1,a[1]+dy*t1]);
  }
}

function siteBoundarySegments(d){
  if(d._boundarySegs)return d._boundarySegs;
  const segs=[],t=d.terrain;
  for(let i=0;i<t.length-1;i++)addSiteBoundaryChunks(segs,d,t[i],t[i+1]);
  for(const o of d.obs){
    for(let i=0;i<o.length;i++)addSiteBoundaryChunks(segs,d,o[i],o[(i+1)%o.length]);
  }
  d._boundarySegs=segs;
  return segs;
}

function polyPath(poly,closed=true){
  poly.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));
  if(closed)cx.closePath();
}

// Site wall collision. The terrain and obstacles are treated as one solid mass, so
// intersecting shapes do not leave visible or physical seams.
function wHit(x,y,r,li){if(y<0)return false;const d=LV[li];for(const s of siteBoundarySegments(d))if(dseg(x,y,s[0],s[1],s[2],s[3])<r)return true;return !sitePointEmpty(d,x,y);}

// Detonate a site missile: applies expDmg to entities within expR + visual/audio.
// Player missile (isEnemy=false) damages turrets + reactor. Enemy missile (isEnemy=true) damages the player ship.
function siteExplodeMissile(site, m, isEnemy){
  const r=m.expR, d=m.expDmg, lvc=site.d.col;
  if(!isEnemy){
    for(const e of site.en){if(!e.alive)continue;
      if(Math.hypot(m.x-e.x,m.y-e.y)<r+13){e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,lvc,14);tone(220,.3,'sawtooth',.1);}
    }
    const rx=site.rx;
    if(rx.alive&&Math.hypot(m.x-rx.x,m.y-rx.y)<r+18){
      rx.hp-=d;addStake(100);tone(350,.1,'square',.08);boomAt(site.pts,rx.x,rx.y,lvc,4);
      if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,lvc,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}
    }
  } else {
    const ss=site.s;if(ss.alive&&Math.hypot(m.x-ss.x,m.y-ss.y)<r+9){
      const hit=applyShipDamage(ss,d,{source:{x:m.x,y:m.y},kind:'explosion',weapon:m});
      shipDamageTone(hit);
    }
  }
  boomAt(site.pts,m.x,m.y,'#ff8800',24);
  boomAt(site.pts,m.x,m.y,'#ffd',12);
  tone(120,.25,'sawtooth',.10);
}

// Update one site missile array. Returns true if the player ship was killed.
function updSiteMissiles(site, mis, isEnemy){
  const s=site.s,d=site.d,worldH=d.worldH||H;
  for(let i=mis.length-1;i>=0;i--){
    const m=mis[i];
    if(m.spd<m.maxSpd) m.spd=Math.min(m.maxSpd, m.spd+m.accel);
    m.vx=Math.sin(m.a)*m.spd;m.vy=-Math.cos(m.a)*m.spd;
    m.x+=m.vx;m.y+=m.vy;
    m.l--;
    if(--m.trailTimer<=0){
      m.trailTimer=2;
      const tx=m.x-Math.sin(m.a)*5, ty=m.y+Math.cos(m.a)*5;
      site.pts.push({x:tx,y:ty,vx:-Math.sin(m.a)*0.4+(Math.random()-.5)*.4,vy:Math.cos(m.a)*0.4+(Math.random()-.5)*.4,l:10+Math.random()*8,ml:18,c:'#fa0'});
    }
    let det=false;
    if(m.l<=0||m.x<0||m.x>W||m.y<0||m.y>worldH||wHit(m.x,m.y,4,G.lv)) det=true;
    if(!det){
      if(!isEnemy){
        for(const e of site.en){if(!e.alive)continue;
          if(Math.hypot(m.x-e.x,m.y-e.y)<13){e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);det=true;break;}
        }
        if(!det){
          const rx=site.rx;
          if(rx.alive&&Math.hypot(m.x-rx.x,m.y-rx.y)<18){
            rx.hp-=m.dmg;addStake(100);tone(350,.1,'square',.08);
            if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}
            det=true;
          }
        }
      } else if(s.alive&&Math.hypot(m.x-s.x,m.y-s.y)<12){
        const hit=applyShipDamage(s,m.dmg,{source:{x:m.x,y:m.y},kind:'missile',weapon:m});
        shipDamageTone(hit);
        det=true;
      }
    }
    if(det){
      siteExplodeMissile(site,m,isEnemy);
      mis.splice(i,1);
      if(s.hp<=0){siteKillShip();return true;}
    }
  }
  return false;
}

// ===================== SITE LEVEL =====================
function wNormal(x,y,li){
  const d=LV[li];let best=Infinity,nx=0,ny=1;
  for(const s of siteBoundarySegments(d)){
    const dist=dseg(x,y,s[0],s[1],s[2],s[3]);
    if(dist<best){
      best=dist;
      const dx=s[2]-s[0],dy=s[3]-s[1],len=Math.hypot(dx,dy)||1;
      let tx=-dy/len,ty=dx/len;
      const mx=(s[0]+s[2])*.5,my=(s[1]+s[3])*.5;
      if(!sitePointEmpty(d,mx+tx*SITE_BOUNDARY_SAMPLE,my+ty*SITE_BOUNDARY_SAMPLE)){
        tx=-tx;ty=-ty;
      }
      nx=tx;ny=ty;
    }
  }
  return{nx,ny};
}
// Bounce the ship off a site wall. wNormal() returns the nearest wall's outward surface normal (nx,ny).
// dot<0 means the ship is moving into the wall; subtracting 1.9x that component reflects the velocity.
// All speed is then damped 45% and the ship is nudged clear of the surface to prevent re-collision.
function siteBounce(s){
  const spd=Math.hypot(s.vx,s.vy);
  const{nx,ny}=wNormal(s.x,s.y,G.lv);
  const dot=s.vx*nx+s.vy*ny;
  if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}
  s.vx*=.55;s.vy*=.55;s.va*=.55;
  s.x+=nx*10;s.y+=ny*10;
  const dmg=Math.round((spd/5.5)*5);
  if(dmg>0){const hit=applyShipDamage(s,dmg,{source:{x:s.x-nx*12,y:s.y-ny*12},kind:'collision'});shipDamageTone(hit,Math.max(60,200-spd*18),.12,'sawtooth',.1);}
}
function enterLv(){
  const d=LV[G.lv],ow=G.OW,ls=G.lvState[G.lv];
  const ship={...mkShip(d.ent.x,d.ent.y),energy:Math.max(25,ow?ow.s.energy:activeChassisObj().maxEnergy),
             hp:ow?ow.s.hp:activeChassisObj().maxHp,maxHp:ow?ow.s.maxHp:activeChassisObj().maxHp};
  if(ow)copyShieldState(ow.s,ship);
  G.site={d,s:ship,
    en:d.en.map((e,i)=>({...e,alive:ls?ls.en[i]:true,timer:20+Math.floor(Math.random()*80)})),
    fu:d.fu.map((f,i)=>({...f,got:ls?ls.fu[i]:false})),
    rx:ls?{...d.rx,hp:ls.rx.hp,alive:ls.rx.alive}:{...d.rx,alive:true},
    bul:[],ebu:[],mis:[],emi:[],pts:[],lsb:[],rdone:false,esc:0,cam:{x:0,y:0,z:1}};
  G.st='play';
  recordLastLocation('planet',G.lv);
  saveGame();
}
function siteKillShip(){
  const site=G.site;killShip(site.s,site.pts,'dead_site',18);
}
function updSite(){
  const site=G.site;updPts(site.pts,.06);for(let i=site.lsb.length-1;i>=0;i--){if(--site.lsb[i].l<=0)site.lsb.splice(i,1);}
  const s=site.s,d=site.d;if(!s.alive)return;
  applyRotation(s, iRot(), s.energy<=0);
  if(iShieldToggle())toggleShipShield(s);
  tickShieldRecharge(s);
  const thrustIn=iThrustInput();
  if(thrustIn.activeAxes>0){
    applyShipThrust(s, thrustIn, s.energy<=0);
    drainEnergy(s, THRUST_ENERGY_DRAIN.site*thrustEnergyScale(thrustIn));
  }
  s.vy+=d.grav;s.vx*=.9985;s.vy*=.9985;const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx=s.vx/sp*5.5;s.vy=s.vy/sp*5.5;}
  s.x+=s.vx;s.y+=s.vy;
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  const wH=d.worldH||H;
  site.cam=updateWorldCamera(site.cam,s.x,s.y,W,wH,cameraZoomTarget('site',s),.5,.45,dynZoomOn()?.12:1);
  if(s.y<0){
    if(G.st==='esc'){addStake(1000);tone(660,.4,'sine',.1);G.cleared[G.lv]=true;delete G.lvState[G.lv];
      if(G.cleared.every(c=>c)){G.slipgateActive=true;G.slipMsg=360;}saveGame();}
    else{G.lvState[G.lv]={en:site.en.map(e=>e.alive),fu:site.fu.map(f=>f.got),rx:{hp:site.rx.hp,alive:site.rx.alive}};}
    rechargeShieldFromEnergy(s,true);
    const pi=G.lv,pp=owPos(PP[pi]);initOW(s.energy,pp.x,Math.max(80,pp.y-LV[pi].pr-55));
    G.OW.s.hp=s.hp;G.OW.s.maxHp=s.maxHp;copyShieldState(s,G.OW.s);returnToOverworld();return;
  }
  if(wHit(s.x,s.y,9,G.lv)){siteBounce(s);if(s.hp<=0){siteKillShip();return;}}
  for(const f of site.fu){if(!f.got&&Math.hypot(s.x-f.x,s.y-f.y)<22){f.got=true;pickupEnergy(s,f.x,f.y,site.pts,d.col);}}
  if(G.st==='esc'){site.esc--;if(site.esc<=0){G.cleared[G.lv]=true;delete G.lvState[G.lv];if(G.cleared.every(c=>c)){G.slipgateActive=true;G.slipMsg=360;}saveGame();siteKillShip();return;}}
  const walls=siteBoundarySegments(d);
  {const wp=wpSlot(0);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft>0&&wt.tick){const tgts=[];site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(site.rx.alive)tgts.push({x:site.rx.x,y:site.rx.y,r:18,kind:'reactor',idx:0});const res=wt.tick(wp,s,0,tgts,site.lsb,walls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=site.en[tg.idx];e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=site.rx;rx.hp-=wp.dmg;addStake(100);tone(350,.1,'square',.08);boomAt(site.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}}
  if(s.misLeft>0&&wt.tick&&wp.wpnType==='missile launcher') wt.tick(wp,s,0,site.mis);
  if(iFir()&&!s.scd&&!s.pulsesLeft&&!s.misLeft) tryFire(wp,wt,s,0,site.bul);}}
  {const wp=wpSlot(1);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft2>0&&wt.tick){const tgts=[];site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(site.rx.alive)tgts.push({x:site.rx.x,y:site.rx.y,r:18,kind:'reactor',idx:0});const res=wt.tick(wp,s,1,tgts,site.lsb,walls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=site.en[tg.idx];e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=site.rx;rx.hp-=wp.dmg;addStake(100);tone(350,.1,'square',.08);boomAt(site.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}}
  if(s.misLeft2>0&&wt.tick&&wp.wpnType==='missile launcher') wt.tick(wp,s,1,site.mis);
  if(iFireSec()&&!s.scd2&&!s.pulsesLeft2&&!s.misLeft2) tryFire(wp,wt,s,1,site.bul);}}
  for(let i=site.bul.length-1;i>=0;i--){
    const b=site.bul[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){site.bul.splice(i,1);continue;}
    let rm=false;
    for(const e of site.en){if(!e.alive)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<13){e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);rm=true;break;}}
    if(rm){site.bul.splice(i,1);continue;}
    for(let mi=site.emi.length-1;mi>=0;mi--){const m=site.emi[mi];if(Math.hypot(b.x-m.x,b.y-m.y)<5){m.hp-=b.dmg;boomAt(site.pts,b.x,b.y,m.col,3);if(m.hp<=0){siteExplodeMissile(site,m,true);site.emi.splice(mi,1);if(s.hp<=0){siteKillShip();return;}}rm=true;break;}}
    if(rm){site.bul.splice(i,1);continue;}
    const rx=site.rx;if(rx.alive&&Math.hypot(b.x-rx.x,b.y-rx.y)<18){rx.hp--;addStake(100);tone(350,.1,'square',.08);site.bul.splice(i,1);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}
  }
  for(const e of site.en){if(e.alive)TURRET.update(e,site.ebu,s);}
  for(let i=site.ebu.length-1;i>=0;i--){
    const b=site.ebu[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){site.ebu.splice(i,1);continue;}
    let rm=false;
    for(let mi=site.mis.length-1;mi>=0;mi--){const m=site.mis[mi];if(Math.hypot(b.x-m.x,b.y-m.y)<5){m.hp-=b.dmg;boomAt(site.pts,b.x,b.y,m.col,3);if(m.hp<=0){siteExplodeMissile(site,m,false);site.mis.splice(mi,1);if(s.hp<=0){siteKillShip();return;}}rm=true;break;}}
    if(rm){site.ebu.splice(i,1);continue;}
    if(Math.hypot(b.x-s.x,b.y-s.y)<12){
      site.ebu.splice(i,1);
      const hit=applyShipDamage(s,b.dmg,{source:{x:b.x,y:b.y},kind:'projectile',weapon:b});
      shipDamageTone(hit);
      if(s.hp<=0){siteKillShip();return;}
    }
  }
  if(updSiteMissiles(site,site.mis,false)) return;
  if(updSiteMissiles(site,site.emi,true )) return;
}

function drawSite(){
  const site=G.site,d=site.d,col=d.col;
  const camX=site.cam?site.cam.x:0,camY=site.cam?site.cam.y:0;
  cx.fillStyle=d.bg;cx.fillRect(0,0,W,H);
  cx.save();applyWorldCamera(site.cam||{x:camX,y:camY,z:1});
  cx.fillStyle='#000';cx.beginPath();polyPath(d.terrain);cx.fill();
  cx.fillStyle=d.bg;for(const o of d.obs){cx.beginPath();polyPath(o);cx.fill();}
  cx.save();cx.shadowColor=col;cx.shadowBlur=10;cx.strokeStyle=col;cx.lineWidth=1.5;
  cx.beginPath();for(const s of siteBoundarySegments(d)){cx.moveTo(s[0],s[1]);cx.lineTo(s[2],s[3]);}cx.stroke();
  cx.restore();
  for(const f of site.fu)if(!f.got)drEnergy(f.x,f.y,col);
  const rx=site.rx;cx.save();
  if(rx.alive){const pu=.5+.5*Math.sin(G.fr*.1);cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8+pu*12;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();cx.fillStyle=col;cx.font='bold 10px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText(rx.hp,rx.x,rx.y+4);}
  else{const pu=.5+.5*Math.sin(G.fr*.35);cx.strokeStyle='#f50';cx.shadowColor='#f50';cx.shadowBlur=10+pu*25;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+G.fr*.07;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();}
  cx.restore();
  for(const e of site.en){if(e.alive)TURRET.draw(e);}
  for(const b of site.bul){cx.save();cx.fillStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=6;cx.beginPath();cx.arc(b.x,b.y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
  for(const b of site.ebu){cx.save();cx.fillStyle='#f66';cx.shadowColor='#f66';cx.shadowBlur=6;cx.beginPath();cx.arc(b.x,b.y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
  for(const m of site.mis)drMissile(m.x,m.y,m.a,m.type);
  for(const m of site.emi)drMissile(m.x,m.y,m.a,m.type);
  for(const lb of site.lsb){const a=lb.l/8,bw=lb.w||2;cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=bw;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=Math.max(1,bw/2);cx.shadowBlur=0;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.restore();}
  drPts(site.pts);
  if(site.s.alive)drShip(site.s.x,site.s.y,site.s.a,site.s,iThrustInput(),site.s.energy,site.s.inv,G.fr);
  if(site.s.alive)drAimCone(site.s);
  cx.restore();
  drHUD(site.s.energy,site.s.maxEnergy,site.s.hp,site.s.maxHp,site.s);
  cx.save();cx.font='13px monospace';cx.fillStyle=col;cx.textAlign='center';cx.fillText(d.name,W/2,18);cx.restore();
  if(G.st==='esc'){const sec=Math.ceil(site.esc/60);cx.save();cx.fillStyle=sec<=3?'#f40':'#ff0';cx.shadowColor=cx.fillStyle;cx.shadowBlur=12;cx.font='bold 20px monospace';cx.textAlign='center';cx.fillText('REACTOR CRITICAL — ESCAPE NOW!',W/2,52);cx.font='bold 34px monospace';cx.fillText(sec+'s',W/2,84);cx.restore();}
  if(G.st==='dead_site'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}
}
