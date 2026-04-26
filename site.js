'use strict';

// Site wall collision. pip() (point-in-polygon) returns false when the ship is outside the site boundary — that's a hit.
// dseg() measures distance to each wall segment to catch close-range overlap. LV from gen.js; dseg/pip from util.js.
function wHit(x,y,r,li){if(y<0)return false;const d=LV[li],t=d.terrain;for(let i=0;i<t.length-1;i++)if(dseg(x,y,t[i][0],t[i][1],t[i+1][0],t[i+1][1])<r)return true;if(!pip(x,y,t))return true;for(const o of d.obs){if(pip(x,y,o))return true;for(let i=0;i<o.length;i++){const j=(i+1)%o.length;if(dseg(x,y,o[i][0],o[i][1],o[j][0],o[j][1])<r)return true;}}return false;}

// ===================== SITE LEVEL =====================
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
// Bounce the ship off a site wall. wNormal() returns the nearest wall's outward surface normal (nx,ny).
// dot<0 means the ship is moving into the wall; subtracting 1.9x that component reflects the velocity.
// All speed is then damped 45% and the ship is nudged clear of the surface to prevent re-collision.
function siteBounce(s){
  const spd=Math.hypot(s.vx,s.vy);
  const{nx,ny}=wNormal(s.x,s.y,G.lv);
  const dot=s.vx*nx+s.vy*ny;
  if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}
  s.vx*=.55;s.vy*=.55;
  s.x+=nx*10;s.y+=ny*10;
  if(!s.shld&&!G.invincible){
    const dmg=Math.round((spd/5.5)*5);
    if(dmg>0){s.hp=Math.max(0,s.hp-dmg);tone(Math.max(60,200-spd*18),.12,'sawtooth',.1);}
  }
}
function enterLv(){
  const d=LV[G.lv],ow=G.OW,ls=G.lvState[G.lv];
  G.site={d,s:{...mkShip(d.ent.x,d.ent.y),energy:Math.max(25,ow?ow.s.energy:activeChassisObj().maxEnergy),
             hp:ow?ow.s.hp:activeChassisObj().maxHp,maxHp:ow?ow.s.maxHp:activeChassisObj().maxHp},
    en:d.en.map((e,i)=>({...e,alive:ls?ls.en[i]:true,timer:20+Math.floor(Math.random()*80)})),
    fu:d.fu.map((f,i)=>({...f,got:ls?ls.fu[i]:false})),
    rx:ls?{...d.rx,hp:ls.rx.hp,alive:ls.rx.alive}:{...d.rx,alive:true},
    bul:[],ebu:[],pts:[],lsb:[],rdone:false,esc:0,cam:{x:0,y:0}};
  G.st='play';
}
function siteKillShip(){
  const site=G.site,s=site.s;if(!s.alive)return;
  s.alive=false;boomAt(site.pts,s.x,s.y,'#fff',28);boomAt(site.pts,s.x,s.y,'#fa0',18);
  tone(200,.5,'sawtooth',.15);
  G.st='dead_site';saveGame();
  setTimeout(()=>{G.st='rebuild';},1800);
}
function updSite(){
  const site=G.site;updPts(site.pts,.06);for(let i=site.lsb.length-1;i>=0;i--){if(--site.lsb[i].l<=0)site.lsb.splice(i,1);}
  const s=site.s,d=site.d;if(!s.alive)return;
  s.a+=iRot()*(s.energy>0?.065:.0325);s.shld=iShd(s.energy);
  if(s.shld){const ax=activeAuxObj();s.energy=Math.max(0,s.energy-(ax?.energyDrain??0.17));}
  if(iThr()&&!s.shld){const tm=activeChassisObj().thrMul,thr=s.energy>0?.13*tm:.014;s.vx+=Math.sin(s.a)*thr;s.vy-=Math.cos(s.a)*thr;if(s.energy>0)s.energy=Math.max(0,s.energy-.045);}
  s.vy+=d.grav;s.vx*=.9985;s.vy*=.9985;const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx=s.vx/sp*5.5;s.vy=s.vy/sp*5.5;}
  s.x+=s.vx;s.y+=s.vy;
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  const wH=d.worldH||H;
  const tcy=Math.max(0,Math.min(wH-H,s.y-H*.45));
  site.cam.y+=(tcy-site.cam.y)*.12;
  if(s.y<0){
    if(G.st==='esc'){addBounty(1000);tone(660,.4,'sine',.1);G.cleared[G.lv]=true;delete G.lvState[G.lv];
      if(G.cleared.every(c=>c)){G.slipgateActive=true;G.slipMsg=360;}saveGame();}
    else{G.lvState[G.lv]={en:site.en.map(e=>e.alive),fu:site.fu.map(f=>f.got),rx:{hp:site.rx.hp,alive:site.rx.alive}};}
    const pi=G.lv,pp=owPos(PP[pi]);initOW(s.energy,pp.x,Math.max(80,pp.y-LV[pi].pr-55));
    G.OW.s.hp=s.hp;G.OW.s.maxHp=s.maxHp;G.OW.s.vy=-1.2;return;
  }
  if(wHit(s.x,s.y,9,G.lv)){siteBounce(s);if(s.hp<=0){siteKillShip();return;}}
  for(const f of site.fu){if(!f.got&&Math.hypot(s.x-f.x,s.y-f.y)<22){f.got=true;pickupEnergy(s,f.x,f.y,site.pts,d.col);}}
  if(G.st==='esc'){site.esc--;if(site.esc<=0){siteKillShip();return;}}
  const walls=[];for(let i=0;i<d.terrain.length-1;i++)walls.push([d.terrain[i][0],d.terrain[i][1],d.terrain[i+1][0],d.terrain[i+1][1]]);for(const o of d.obs){for(let i=0;i<o.length;i++){const j=(i+1)%o.length;walls.push([o[i][0],o[i][1],o[j][0],o[j][1]]);}}
  {const wp=wpSlot(0);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft>0&&wt.tick){const tgts=[];site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(site.rx.alive)tgts.push({x:site.rx.x,y:site.rx.y,r:18,kind:'reactor',idx:0});const res=wt.tick(wp,s,0,tgts,site.lsb,walls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=site.en[tg.idx];e.alive=false;addBounty(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=site.rx;rx.hp-=wp.dmg;addBounty(100);tone(350,.1,'square',.08);boomAt(site.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addBounty(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}}
  if(iFir()&&!s.shld&&!s.scd&&!s.pulsesLeft) tryFire(wp,wt,s,0,site.bul);}}
  {const wp=wpSlot(1);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft2>0&&wt.tick){const tgts=[];site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(site.rx.alive)tgts.push({x:site.rx.x,y:site.rx.y,r:18,kind:'reactor',idx:0});const res=wt.tick(wp,s,1,tgts,site.lsb,walls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=site.en[tg.idx];e.alive=false;addBounty(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=site.rx;rx.hp-=wp.dmg;addBounty(100);tone(350,.1,'square',.08);boomAt(site.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addBounty(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}}
  if(iFireSec()&&!s.shld&&!s.scd2&&!s.pulsesLeft2) tryFire(wp,wt,s,1,site.bul);}}
  for(let i=site.bul.length-1;i>=0;i--){
    const b=site.bul[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){site.bul.splice(i,1);continue;}
    let rm=false;
    for(const e of site.en){if(!e.alive)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<13){e.alive=false;addBounty(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);rm=true;break;}}
    if(rm){site.bul.splice(i,1);continue;}
    const rx=site.rx;if(rx.alive&&Math.hypot(b.x-rx.x,b.y-rx.y)<18){rx.hp--;addBounty(100);tone(350,.1,'square',.08);site.bul.splice(i,1);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addBounty(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}
  }
  for(const e of site.en){
    if(!e.alive)continue;
    e.a+=angDiff(e.a,Math.atan2(s.x-e.x,-(s.y-e.y)))*.04;
    if(--e.timer<=0){const ewp=WEAPONS[0];e.timer=100+Math.floor(Math.random()*40-20);site.ebu.push({x:e.x+Math.sin(e.a)*15,y:e.y-Math.cos(e.a)*15,vx:Math.sin(e.a)*ewp.spd,vy:-Math.cos(e.a)*ewp.spd,l:ewp.life*ewp.spd,dmg:ewp.dmg});}
  }
  for(let i=site.ebu.length-1;i>=0;i--){
    const b=site.ebu[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){site.ebu.splice(i,1);continue;}
    if(Math.hypot(b.x-s.x,b.y-s.y)<12){
      site.ebu.splice(i,1);
      if(!s.shld&&!G.invincible){s.hp=Math.max(0,s.hp-b.dmg);tone(380,.08,'square',.08);if(s.hp<=0){siteKillShip();return;}}
    }
  }
}

function drawSite(){
  const site=G.site,d=site.d,col=d.col;
  const camX=site.cam?site.cam.x:0,camY=site.cam?site.cam.y:0;
  cx.fillStyle=d.bg;cx.fillRect(0,0,W,H);
  cx.save();cx.translate(-camX,-camY);
  cx.fillStyle='#000';cx.beginPath();d.terrain.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();
  cx.fillStyle=d.bg;for(const o of d.obs){cx.beginPath();o.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();}
  cx.save();cx.shadowColor=col;cx.shadowBlur=10;cx.strokeStyle=col;cx.lineWidth=1.5;
  cx.beginPath();d.terrain.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.stroke();
  for(const o of d.obs){cx.beginPath();o.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.stroke();}
  cx.restore();
  for(const f of site.fu)if(!f.got)drEnergy(f.x,f.y,col);
  const rx=site.rx;cx.save();
  if(rx.alive){const pu=.5+.5*Math.sin(G.fr*.1);cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8+pu*12;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();cx.fillStyle=col;cx.font='bold 10px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText(rx.hp,rx.x,rx.y+4);}
  else{const pu=.5+.5*Math.sin(G.fr*.35);cx.strokeStyle='#f50';cx.shadowColor='#f50';cx.shadowBlur=10+pu*25;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+G.fr*.07;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();}
  cx.restore();
  for(const e of site.en){if(!e.alive)continue;cx.save();cx.translate(e.x,e.y);cx.strokeStyle='#f44';cx.shadowColor='#f44';cx.shadowBlur=8;cx.lineWidth=1.5;cx.beginPath();cx.arc(0,0,8,0,Math.PI*2);cx.stroke();cx.rotate(e.a);cx.beginPath();cx.moveTo(0,-8);cx.lineTo(0,-18);cx.stroke();cx.restore();}
  for(const b of site.bul){cx.save();cx.fillStyle='#fff';cx.shadowColor='#fff';cx.shadowBlur=6;cx.beginPath();cx.arc(b.x,b.y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
  for(const b of site.ebu){cx.save();cx.fillStyle='#f66';cx.shadowColor='#f66';cx.shadowBlur=6;cx.beginPath();cx.arc(b.x,b.y,2.5,0,Math.PI*2);cx.fill();cx.restore();}
  for(const lb of site.lsb){const a=lb.l/8;cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=2;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=1;cx.shadowBlur=0;cx.beginPath();cx.moveTo(lb.x1,lb.y1);cx.lineTo(lb.x2,lb.y2);cx.stroke();cx.restore();}
  drPts(site.pts);
  if(site.s.alive)drShip(site.s.x,site.s.y,site.s.a,site.s.shld,(K['ArrowUp']||K['KeyW']||GP.thrust),site.s.energy,site.s.inv,G.fr);
  cx.restore();
  drHUD(site.s.energy,site.s.maxEnergy,site.s.hp,site.s.maxHp);
  cx.save();cx.font='13px monospace';cx.fillStyle=col;cx.textAlign='center';cx.fillText(d.name,W/2,18);cx.restore();
  if(G.st==='esc'){const sec=Math.ceil(site.esc/60);cx.save();cx.fillStyle=sec<=3?'#f40':'#ff0';cx.shadowColor=cx.fillStyle;cx.shadowBlur=12;cx.font='bold 20px monospace';cx.textAlign='center';cx.fillText('REACTOR CRITICAL — ESCAPE NOW!',W/2,52);cx.font='bold 34px monospace';cx.fillText(sec+'s',W/2,84);cx.restore();}
  if(G.st==='dead_site'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}
}
