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

function activeSolidSiteData(li=G.lv){
  const d=G.site?.d;
  if(d&&(d.kind==='cave'||d.kind==='tunnel'))return d;
  const lv=LV[li];
  return lv?.cave||lv;
}

// Site wall collision. The terrain and obstacles are treated as one solid mass, so
// intersecting shapes do not leave visible or physical seams.
function wHit(x,y,r,li){if(y<0)return false;const d=activeSolidSiteData(li);for(const s of siteBoundarySegments(d))if(dseg(x,y,s[0],s[1],s[2],s[3])<r)return true;return !sitePointEmpty(d,x,y);}

// Detonate a site missile: applies expDmg to entities within expR + visual/audio.
// Player missile (isEnemy=false) damages turrets + reactor. Enemy missile (isEnemy=true) damages the player ship.
function siteExplodeMissile(site, m, isEnemy){
  const r=m.expR, d=m.expDmg, lvc=site.d.col;
  if(!isEnemy){
    for(const e of site.en){if(!e.alive)continue;
      if(Math.hypot(m.x-e.x,m.y-e.y)<r+13){e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,lvc,14);tone(220,.3,'sawtooth',.1);}
    }
    const rx=site.rx;
    if(rx?.alive&&Math.hypot(m.x-rx.x,m.y-rx.y)<r+18){
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
          if(rx?.alive&&Math.hypot(m.x-rx.x,m.y-rx.y)<18){
            rx.hp-=m.dmg;addStake(100);tone(350,.1,'square',.08);
            if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}
            det=true;
          }
        }
      } else if(s.alive){
        const hitOpts={source:{x:m.x,y:m.y},kind:'missile',weapon:m};
        if(Math.hypot(m.x-s.x,m.y-s.y)<shipShieldHitRadius(s)&&shipShieldCanTakeHit(s,hitOpts)){
          const shieldHit=applyShipShieldDamage(s,m.dmg,hitOpts);
          m.dmg=shieldHit.passthroughDamage;
          shipDamageTone({shieldDamage:shieldHit.shieldDamage,hullDamage:0});
          if(shieldHit.blocked||m.dmg<=0)det=true;
        }
        if(!det&&Math.hypot(m.x-s.x,m.y-s.y)<shipHitRadius(s)){
          const hit=applyShipDamage(s,m.dmg,hitOpts);
          shipDamageTone(hit);
          det=true;
        }
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
  const d=activeSolidSiteData(li);let best=Infinity,nx=0,ny=1;
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
function boolStateArray(arr,len,def){
  const out=Array.isArray(arr)?arr.slice(0,len):[];
  while(out.length<len)out.push(def);
  return out.map(v=>v!==false);
}
function gotStateArray(arr,len){
  const out=Array.isArray(arr)?arr.slice(0,len):[];
  while(out.length<len)out.push(false);
  return out.map(v=>!!v);
}
function defaultPlanetState(p){
  const completedSites={};
  for(const site of p.sites||[])completedSites[site.id]=false;
  return{
    completedSites,
    surface:{
      dishAlive:(p.surface?.dishes||[]).map(()=>true),
      enemyAlive:(p.surface?.en||[]).map(()=>true),
      fuGot:(p.surface?.fu||[]).map(()=>false),
    },
    tunnel:{enemyAlive:(p.tunnel?.en||[]).map(()=>true)},
    cave:{
      en:(p.cave?.en||[]).map(()=>true),
      fu:(p.cave?.fu||[]).map(()=>false),
      rx:p.cave?.rx?{hp:p.cave.rx.hp,alive:true}:{hp:0,alive:false},
    }
  };
}
function planetState(pi=G.lv){
  const p=LV[pi];
  let ps=G.lvState[pi];
  if(!ps||typeof ps!=='object')ps=defaultPlanetState(p);
  ps.completedSites=ps.completedSites&&typeof ps.completedSites==='object'?ps.completedSites:{};
  for(const site of p.sites||[])if(typeof ps.completedSites[site.id]!=='boolean')ps.completedSites[site.id]=false;
  ps.surface=ps.surface&&typeof ps.surface==='object'?ps.surface:{};
  ps.surface.dishAlive=boolStateArray(ps.surface.dishAlive,(p.surface?.dishes||[]).length,true);
  ps.surface.enemyAlive=boolStateArray(ps.surface.enemyAlive,(p.surface?.en||[]).length,true);
  ps.surface.fuGot=gotStateArray(ps.surface.fuGot,(p.surface?.fu||[]).length);
  ps.tunnel=ps.tunnel&&typeof ps.tunnel==='object'?ps.tunnel:{};
  ps.tunnel.enemyAlive=boolStateArray(ps.tunnel.enemyAlive,(p.tunnel?.en||[]).length,true);
  ps.cave=ps.cave&&typeof ps.cave==='object'?ps.cave:{};
  ps.cave.en=boolStateArray(ps.cave.en,(p.cave?.en||[]).length,true);
  ps.cave.fu=gotStateArray(ps.cave.fu,(p.cave?.fu||[]).length);
  if(!ps.cave.rx||typeof ps.cave.rx!=='object')ps.cave.rx=p.cave?.rx?{hp:p.cave.rx.hp,alive:true}:{hp:0,alive:false};
  G.lvState[pi]=ps;
  return ps;
}
function syncPlanetCleared(pi=G.lv){
  const p=LV[pi],ps=planetState(pi);
  G.cleared[pi]=(p.sites||[]).every(site=>!site.required||ps.completedSites[site.id]);
  if(G.cleared.every(c=>c)){G.slipgateActive=true;G.slipMsg=Math.max(G.slipMsg||0,360);}
}
function completePlanetSite(siteId,pi=G.lv){
  const ps=planetState(pi);
  if(!ps.completedSites[siteId]){
    ps.completedSites[siteId]=true;
    addStake(1500);
    tone(880,.25,'sine',.08);
  }
  syncPlanetCleared(pi);
  saveGame();
}
function siteShipAt(x,y,from=null){
  const src=from||G.OW?.s;
  const ship={...mkShip(x,y),hp:src?src.hp:activeChassisObj().maxHp,maxHp:src?src.maxHp:activeChassisObj().maxHp};
  if(src){copyShipEnergyState(src,ship);setShipEnergy(ship,Math.max(25,src.energy));copyShieldState(src,ship);}
  else fillShipEnergy(ship);
  ship.x=x;ship.y=y;
  return ship;
}
function saveActiveSiteState(){
  const site=G.site;if(!site)return;
  const ps=planetState(G.lv);
  if(site.mode==='surface'){
    ps.surface.dishAlive=site.dishes.map(d=>d.alive);
    ps.surface.enemyAlive=site.en.map(e=>e.alive);
    ps.surface.fuGot=site.fu.map(f=>f.got);
  }else if(site.mode==='tunnel'){
    ps.tunnel.enemyAlive=site.en.map(e=>e.alive);
  }else if(site.mode==='cave'){
    ps.cave.en=site.en.map(e=>e.alive);
    ps.cave.fu=site.fu.map(f=>f.got);
    ps.cave.rx={hp:site.rx.hp,alive:site.rx.alive};
  }
}
function returnPlanetToOverworld(){
  const site=G.site,s=site?.s;
  if(s){
    saveActiveSiteState();
    rechargeShieldFromEnergy(s,true);
  }
  const pi=G.lv,pp=owPos(PP[pi]);
  initOW(s?s.energy:loadoutBatteryCapacity(),pp.x,Math.max(80,pp.y-LV[pi].pr-55));
  if(s){copyShipEnergyState(s,G.OW.s);G.OW.s.hp=s.hp;G.OW.s.maxHp=s.maxHp;copyShieldState(s,G.OW.s);}
  G.site=null;
  recordLastLocation('planet',pi);
  returnToOverworld();
  saveGame();
}
function enterSurface(ship=null,opts={}){
  const p=LV[G.lv],d=p.surface,ps=planetState(G.lv);
  const x=wrap(opts.x??d.ent.x,d.worldW);
  const y=opts.y??Math.min(d.ent.y,surfaceYAt(d,x)-155);
  const s=ship||siteShipAt(x,y);
  s.x=x;s.y=y;if(opts.a!=null)s.a=opts.a;
  G.site={mode:'surface',planet:p,d,s,
    dishes:d.dishes.map((di,i)=>({...di,alive:ps.surface.dishAlive[i]})),
    en:d.en.map((e,i)=>({...e,alive:ps.surface.enemyAlive[i],timer:30+Math.floor(Math.random()*70),phase:Math.random()*Math.PI*2})),
    fu:d.fu.map((f,i)=>({...f,got:ps.surface.fuGot[i]})),
    bul:[],ebu:[],mis:[],emi:[],pts:[],lsb:[],cam:{x:x-W/2,y:0,z:1}};
  G.st='play';
  recordLastLocation('planet',G.lv);
  saveGame();
}
function enterTunnel(dir='down',ship=null){
  const p=LV[G.lv],d=p.tunnel,ps=planetState(G.lv);
  if(!d){enterSurface(ship);return;}
  const ent=dir==='up'?d.entBottom:d.entTop;
  const s=ship||siteShipAt(ent.x,ent.y);
  s.x=ent.x;s.y=ent.y;s.a=dir==='up'?0:Math.PI;s.vx*=.35;s.vy*=.35;
  G.site={mode:'tunnel',tunnelDir:dir,planet:p,d,s,
    en:d.en.map((e,i)=>({...e,alive:ps.tunnel.enemyAlive[i],timer:20+Math.floor(Math.random()*80)})),
    fu:[],rx:{alive:false,hp:0},bul:[],ebu:[],mis:[],emi:[],pts:[],lsb:[],rdone:false,esc:0,cam:{x:0,y:dir==='up'?Math.max(0,d.worldH-H):0,z:1}};
  G.st='play';
  saveGame();
}
function enterCaveFromTunnel(ship=null){
  const p=LV[G.lv],d=p.cave,ps=planetState(G.lv);
  const s=ship||siteShipAt(d.ent.x,d.ent.y);
  s.x=d.ent.x;s.y=d.ent.y;s.a=0;s.vx*=.3;s.vy*=.3;
  G.site={mode:'cave',planet:p,d,s,
    en:d.en.map((e,i)=>({...e,alive:ps.cave.en[i],timer:20+Math.floor(Math.random()*80)})),
    fu:d.fu.map((f,i)=>({...f,got:ps.cave.fu[i]})),
    rx:{...d.rx,hp:ps.cave.rx.hp,alive:ps.cave.rx.alive},
    bul:[],ebu:[],mis:[],emi:[],pts:[],lsb:[],rdone:false,esc:0,cam:{x:0,y:0,z:1}};
  G.st='play';
  saveGame();
}
function enterPlanet(){
  enterSurface();
}
function enterLv(){
  enterPlanet();
}
function siteKillShip(){
  const site=G.site;killShip(site.s,site.pts,'dead_site',18);
}
function updCaveSite(){
  const site=G.site;updPts(site.pts,.06);for(let i=site.lsb.length-1;i>=0;i--){if(--site.lsb[i].l<=0)site.lsb.splice(i,1);}
  const s=site.s,d=site.d;if(!s.alive)return;
  applyRotation(s, iRot(), s.energy<=0);
  if(iShieldToggle())toggleShipShield(s);
  tickShieldRecharge(s);
  const thrustIn=iThrustInput();
  if(thrustIn.activeAxes>0){
    applyShipThrust(s, thrustIn, s.energy<=0);
    drainEnergy(s, thrustEnergyDrainForMode('site')*thrustEnergyScale(thrustIn));
  }
  thrusterSound(thrustIn,'site',s.energy<=0);
  s.vy+=d.grav;s.vx*=.9985;s.vy*=.9985;const sp=Math.hypot(s.vx,s.vy);if(sp>5.5){s.vx=s.vx/sp*5.5;s.vy=s.vy/sp*5.5;}
  s.x+=s.vx;s.y+=s.vy;
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  const wH=d.worldH||H;
  site.cam=updateWorldCamera(site.cam,s.x,s.y,W,wH,cameraZoomTarget('site',s),.5,.45,dynZoomOn()?.12:1);
  if(s.y<0){
    saveActiveSiteState();
    if(site.mode==='tunnel'){
      const p=LV[G.lv],mouth=p.surface?.tunnel;
      enterSurface(s,{x:mouth?.x??p.surface.ent.x,y:(mouth?.y??surfaceYAt(p.surface,mouth?.x??p.surface.ent.x))-95,a:0});
    }else{
      if(site.mode==='cave'&&G.st==='esc')completePlanetSite('cave');
      G.st='play';
      enterTunnel('up',s);
    }
    return;
  }
  if(site.mode==='tunnel'&&site.tunnelDir==='down'&&s.y>wH-28){
    saveActiveSiteState();
    enterCaveFromTunnel(s);
    return;
  }
  if(wHit(s.x,s.y,9,G.lv)){siteBounce(s);if(s.hp<=0){siteKillShip();return;}}
  for(const f of site.fu){if(!f.got&&Math.hypot(s.x-f.x,s.y-f.y)<22){f.got=true;pickupEnergy(s,f.x,f.y,site.pts,d.col);}}
  if(G.st==='esc'){site.esc--;if(site.esc<=0){saveActiveSiteState();saveGame();siteKillShip();return;}}
  const walls=siteBoundarySegments(d);
  {const wp=wpSlot(0);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft>0&&wt.tick){const tgts=[];site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(site.rx?.alive)tgts.push({x:site.rx.x,y:site.rx.y,r:18,kind:'reactor',idx:0});const res=wt.tick(wp,s,0,tgts,site.lsb,walls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=site.en[tg.idx];e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=site.rx;rx.hp-=wp.dmg;addStake(100);tone(350,.1,'square',.08);boomAt(site.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}}
  if(s.misLeft>0&&wt.tick&&wp.wpnType==='missile launcher') wt.tick(wp,s,0,site.mis);
  if(iFir()&&!s.scd&&!s.pulsesLeft&&!s.misLeft) tryFire(wp,wt,s,0,site.bul);}}
  {const wp=wpSlot(1);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft2>0&&wt.tick){const tgts=[];site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:13,kind:'turret',idx:i});});if(site.rx?.alive)tgts.push({x:site.rx.x,y:site.rx.y,r:18,kind:'reactor',idx:0});const res=wt.tick(wp,s,1,tgts,site.lsb,walls);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='turret'){const e=site.en[tg.idx];e.alive=false;addStake(250);boomAt(site.pts,e.x,e.y,d.col,14);tone(220,.3,'sawtooth',.1);}else if(tg.kind==='reactor'){const rx=site.rx;rx.hp-=wp.dmg;addStake(100);tone(350,.1,'square',.08);boomAt(site.pts,res.x2,res.y2,d.col,4);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}}}
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
    const rx=site.rx;if(rx?.alive&&Math.hypot(b.x-rx.x,b.y-rx.y)<18){rx.hp--;addStake(100);tone(350,.1,'square',.08);site.bul.splice(i,1);if(rx.hp<=0){rx.alive=false;site.rdone=true;site.esc=1200;G.st='esc';addStake(2000);boomAt(site.pts,rx.x,rx.y,d.col,40);boomAt(site.pts,rx.x,rx.y,'#fff',20);tone(150,.8,'sawtooth',.18);}}
  }
  for(const e of site.en){if(e.alive)TURRET.update(e,site.ebu,s);}
  for(let i=site.ebu.length-1;i>=0;i--){
    const b=site.ebu[i];b.x+=b.vx;b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.x<0||b.x>W||b.y<0||b.y>(d.worldH||H)||wHit(b.x,b.y,4,G.lv)){site.ebu.splice(i,1);continue;}
    let rm=false;
    for(let mi=site.mis.length-1;mi>=0;mi--){const m=site.mis[mi];if(Math.hypot(b.x-m.x,b.y-m.y)<5){m.hp-=b.dmg;boomAt(site.pts,b.x,b.y,m.col,3);if(m.hp<=0){siteExplodeMissile(site,m,false);site.mis.splice(mi,1);if(s.hp<=0){siteKillShip();return;}}rm=true;break;}}
    if(rm){site.ebu.splice(i,1);continue;}
    const bHitOpts={source:{x:b.x,y:b.y},kind:'projectile',weapon:b};
    if(Math.hypot(b.x-s.x,b.y-s.y)<shipShieldHitRadius(s)&&shipShieldCanTakeHit(s,bHitOpts)){
      const shieldHit=applyShipShieldDamage(s,b.dmg,bHitOpts);
      b.dmg=shieldHit.passthroughDamage;
      shipDamageTone({shieldDamage:shieldHit.shieldDamage,hullDamage:0});
      if(shieldHit.blocked||b.dmg<=0){site.ebu.splice(i,1);continue;}
    }
    if(Math.hypot(b.x-s.x,b.y-s.y)<shipHitRadius(s)){
      site.ebu.splice(i,1);
      const hit=applyShipDamage(s,b.dmg,bHitOpts);
      shipDamageTone(hit);
      if(s.hp<=0){siteKillShip();return;}
    }
  }
  if(updSiteMissiles(site,site.mis,false)) return;
  if(updSiteMissiles(site,site.emi,true )) return;
  tickShipReactor(s);
}

function surfaceNearX(d,x,refX){return wrapCoordNear(x,refX,d.worldW);}
function surfaceDist(d,ax,ay,bx,by){const nx=surfaceNearX(d,ax,bx);return Math.hypot(nx-bx,ay-by);}
function surfaceDelta(d,ax,ay,bx,by){const nx=surfaceNearX(d,ax,bx);return{dx:nx-bx,dy:ay-by};}
function surfaceGroundNormal(d,x){
  const x0=wrap(x-10,d.worldW),x1=wrap(x+10,d.worldW),y0=surfaceYAt(d,x0),y1=surfaceYAt(d,x1);
  let nx=y1-y0,ny=-20,len=Math.hypot(nx,ny)||1;
  return{nx:nx/len,ny:ny/len};
}
function updateSurfaceCamera(cam,s,d){
  if(!cam)cam={x:s.x-W/2,y:0,z:1};
  const targetZ=cameraZoomTarget('site',s);
  if(!Number.isFinite(cam.z)||cam.z<=0)cam.z=1;
  cam.z+=((targetZ||1)-cam.z)*(dynZoomOn()?.12:1);
  const viewW=W/cam.z,viewH=H/cam.z;
  const refX=(Number.isFinite(cam.x)?cam.x:s.x-viewW*.5)+viewW*.5;
  const tx=surfaceNearX(d,s.x,refX)-viewW*.5;
  const ground=surfaceYAt(d,s.x);
  const maxY=Math.max(0,d.worldH-viewH);
  const ty=Math.max(0,Math.min(maxY,ground-viewH*.74));
  cam.x+=(tx-cam.x)*(dynZoomOn()?.12:1);
  cam.y+=(ty-cam.y)*(dynZoomOn()?.12:1);
  cam.dustX=1;cam.dustY=1;
  return cam;
}
function surfaceBounce(site){
  const s=site.s,d=site.d,r=shipHitRadius(s),ground=surfaceYAt(d,s.x);
  if(s.y+r<=ground)return false;
  const spd=Math.hypot(s.vx,s.vy),n=surfaceGroundNormal(d,s.x);
  const dot=s.vx*n.nx+s.vy*n.ny;
  if(dot<0){s.vx-=dot*n.nx*1.85;s.vy-=dot*n.ny*1.85;}
  s.vx*=.58;s.vy*=.58;s.va*=.55;
  s.y=ground-r-2;s.x=wrap(s.x+n.nx*4,d.worldW);
  const dmg=Math.round((spd/5.3)*5);
  if(dmg>0){
    const hit=applyShipDamage(s,dmg,{source:{x:s.x-n.nx*12,y:s.y-n.ny*12},kind:'collision'});
    shipDamageTone(hit,Math.max(60,190-spd*18),.12,'sawtooth',.1);
  }
  return true;
}
function surfaceEnemyRadius(e){return e.kind==='turret'?10:e.kind==='diver'?12:11;}
function damageSurfaceEnemy(site,e,dmg,x=e.x,y=e.y){
  e.hp-=dmg;
  boomAt(site.pts,x,y,site.d.col,4);
  tone(360,.05,'square',.05);
  if(e.hp<=0){e.alive=false;addStake(e.kind==='turret'?180:220);boomAt(site.pts,e.x,e.y,site.d.col,14);tone(200,.25,'sawtooth',.08);}
}
function damageSurfaceDish(site,dish,dmg,x=dish.x,y=dish.y){
  dish.hp-=dmg;
  boomAt(site.pts,x,y,'#ffdd88',4);
  tone(350,.08,'square',.06);
  if(dish.hp<=0){
    dish.alive=false;addStake(500);
    boomAt(site.pts,dish.x,dish.y,'#ffdd88',22);boomAt(site.pts,dish.x,dish.y,'#fff',8);
    if(site.dishes.every(d=>!d.alive)){completePlanetSite('targets');}
  }
}
function surfaceBeamTargets(site){
  const tgts=[];
  site.dishes.forEach((d,i)=>{if(d.alive)tgts.push({x:d.x,y:d.y,r:17,kind:'dish',idx:i});});
  site.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:surfaceEnemyRadius(e),kind:'enemy',idx:i});});
  site.emi.forEach((m,i)=>tgts.push({x:m.x,y:m.y,r:5,kind:'missile',idx:i}));
  return tgts;
}
function surfaceHandleBeamHit(site,tg,wp,res){
  if(tg.kind==='dish')damageSurfaceDish(site,site.dishes[tg.idx],wp.dmg,res.x2,res.y2);
  else if(tg.kind==='enemy')damageSurfaceEnemy(site,site.en[tg.idx],wp.dmg,res.x2,res.y2);
  else if(tg.kind==='missile'){
    const m=site.emi[tg.idx];m.hp-=wp.dmg;boomAt(site.pts,res.x2,res.y2,m.col,3);
    if(m.hp<=0){surfaceExplodeMissile(site,m,true);site.emi.splice(tg.idx,1);}
  }
}
function surfaceExplodeMissile(site,m,isEnemy){
  const d=site.d,r=m.expR,dm=m.expDmg,s=site.s;
  if(!isEnemy){
    for(const dish of site.dishes)if(dish.alive&&surfaceDist(d,m.x,m.y,dish.x,dish.y)<r+18)damageSurfaceDish(site,dish,dm,m.x,m.y);
    for(const e of site.en)if(e.alive&&surfaceDist(d,m.x,m.y,e.x,e.y)<r+surfaceEnemyRadius(e))damageSurfaceEnemy(site,e,dm,m.x,m.y);
  }else if(s.alive&&surfaceDist(d,m.x,m.y,s.x,s.y)<r+shipHitRadius(s)){
    const src={x:surfaceNearX(d,m.x,s.x),y:m.y};
    const hit=applyShipDamage(s,dm,{source:src,kind:'explosion',weapon:m});shipDamageTone(hit);
  }
  boomAt(site.pts,m.x,m.y,'#ff8800',22);boomAt(site.pts,m.x,m.y,'#ffd',10);tone(120,.22,'sawtooth',.09);
}
function updSurfaceMissiles(site,mis,isEnemy){
  const d=site.d,s=site.s;
  for(let i=mis.length-1;i>=0;i--){
    const m=mis[i];
    if(m.spd<m.maxSpd)m.spd=Math.min(m.maxSpd,m.spd+m.accel);
    m.vx=Math.sin(m.a)*m.spd;m.vy=-Math.cos(m.a)*m.spd;
    m.x=wrap(m.x+m.vx,d.worldW);m.y+=m.vy;m.l--;
    if(--m.trailTimer<=0){m.trailTimer=2;site.pts.push({x:m.x-Math.sin(m.a)*5,y:m.y+Math.cos(m.a)*5,vx:-Math.sin(m.a)*.4,vy:Math.cos(m.a)*.4,l:12,ml:18,c:'#fa0'});}
    let det=m.l<=0||m.y<d.exitY-160||m.y>surfaceYAt(d,m.x)+18;
    if(!det&&!isEnemy){
      for(const dish of site.dishes){if(dish.alive&&surfaceDist(d,m.x,m.y,dish.x,dish.y)<17){damageSurfaceDish(site,dish,m.dmg,m.x,m.y);det=true;break;}}
      if(!det)for(const e of site.en){if(e.alive&&surfaceDist(d,m.x,m.y,e.x,e.y)<surfaceEnemyRadius(e)){damageSurfaceEnemy(site,e,m.dmg,m.x,m.y);det=true;break;}}
    }else if(!det&&s.alive&&surfaceDist(d,m.x,m.y,s.x,s.y)<shipHitRadius(s)){
      const src={x:surfaceNearX(d,m.x,s.x),y:m.y},hit=applyShipDamage(s,m.dmg,{source:src,kind:'missile',weapon:m});
      shipDamageTone(hit);det=true;
    }
    if(det){surfaceExplodeMissile(site,m,isEnemy);mis.splice(i,1);if(s.hp<=0){siteKillShip();return true;}}
  }
  return false;
}
function fireSurfaceEnemyBullet(site,e,spd=5.4,dmg=1){
  const d=site.d,s=site.s,delta=surfaceDelta(d,s.x,s.y,e.x,e.y),a=Math.atan2(delta.dx,-delta.dy);
  e.a=a;
  site.ebu.push({x:e.x+Math.sin(a)*13,y:e.y-Math.cos(a)*13,vx:Math.sin(a)*spd,vy:-Math.cos(a)*spd,l:72*spd,dmg,col:'#f66'});
  tone(520,.04,'square',.03);
}
function updSurfaceEnemy(site,e){
  if(!e.alive)return;
  const d=site.d,s=site.s,ground=surfaceYAt(d,e.x);
  if(e.kind==='turret'){
    e.y=ground-9;
    const delta=surfaceDelta(d,s.x,s.y,e.x,e.y);
    e.a+=angDiff(e.a,Math.atan2(delta.dx,-delta.dy))*.045;
    if(--e.timer<=0){e.timer=85+Math.floor(Math.random()*45);if(Math.hypot(delta.dx,delta.dy)<520)fireSurfaceEnemyBullet(site,e,5.6,1);}
    return;
  }
  const delta=surfaceDelta(d,s.x,s.y,e.x,e.y),dist=Math.hypot(delta.dx,delta.dy)||1;
  if(e.kind==='skimmer'){
    const targetY=surfaceYAt(d,e.x)-92+Math.sin(G.fr*.035+e.phase)*26;
    e.vx+=Math.sign(delta.dx||1)*.025;
    e.vy+=(targetY-e.y)*.006;
    if(dist<260)e.vx-=Math.sign(delta.dx||1)*.04;
  }else{
    const diving=dist<360&&s.y<ground-28;
    e.vx+=(delta.dx/dist)*(diving ? .075 : .028);
    e.vy+=(diving?delta.dy/dist:-.35)*.055;
    e.vy+=(surfaceYAt(d,e.x)-150-e.y)*.002;
  }
  e.vx*=.985;e.vy*=.985;
  const max=e.kind==='diver'?3.8:2.8,sp=Math.hypot(e.vx,e.vy);if(sp>max){e.vx=e.vx/sp*max;e.vy=e.vy/sp*max;}
  e.x=wrap(e.x+e.vx,d.worldW);e.y+=e.vy;
  const g2=surfaceYAt(d,e.x);
  if(e.y>g2-22){e.y=g2-22;e.vy=-Math.abs(e.vy)*.7;}
  if(e.y<35){e.y=35;e.vy=Math.abs(e.vy)*.5;}
  e.a=Math.atan2(e.vx,-e.vy||-.01);
  if(--e.timer<=0){e.timer=e.kind==='diver'?105:130;if(dist<460)fireSurfaceEnemyBullet(site,e,e.kind==='diver'?5.8:5.1,1);}
  if(surfaceDist(d,e.x,e.y,s.x,s.y)<surfaceEnemyRadius(e)+shipHitRadius(s)){
    const hit=applyShipDamage(s,2,{source:{x:surfaceNearX(d,e.x,s.x),y:e.y},kind:'collision'});
    shipDamageTone(hit,180,.12,'sawtooth',.1);
    e.vx-=delta.dx/dist*1.5;e.vy-=delta.dy/dist*1.5;
    if(s.hp<=0)siteKillShip();
  }
}
function updSurfaceProjectiles(site){
  const d=site.d,s=site.s;
  for(let i=site.bul.length-1;i>=0;i--){
    const b=site.bul[i];b.x=wrap(b.x+b.vx,d.worldW);b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    let rm=b.l<=0||b.y<d.exitY-160||b.y>surfaceYAt(d,b.x);
    if(!rm){for(const dish of site.dishes){if(dish.alive&&surfaceDist(d,b.x,b.y,dish.x,dish.y)<17){damageSurfaceDish(site,dish,b.dmg,b.x,b.y);rm=true;break;}}}
    if(!rm){for(const e of site.en){if(e.alive&&surfaceDist(d,b.x,b.y,e.x,e.y)<surfaceEnemyRadius(e)){damageSurfaceEnemy(site,e,b.dmg,b.x,b.y);rm=true;break;}}}
    if(!rm){for(let mi=site.emi.length-1;mi>=0;mi--){const m=site.emi[mi];if(surfaceDist(d,b.x,b.y,m.x,m.y)<5){m.hp-=b.dmg;boomAt(site.pts,b.x,b.y,m.col,3);if(m.hp<=0){surfaceExplodeMissile(site,m,true);site.emi.splice(mi,1);}rm=true;break;}}}
    if(rm)site.bul.splice(i,1);
  }
  for(let i=site.ebu.length-1;i>=0;i--){
    const b=site.ebu[i];b.x=wrap(b.x+b.vx,d.worldW);b.y+=b.vy;b.l-=Math.hypot(b.vx,b.vy);
    if(b.l<=0||b.y<d.exitY-160||b.y>surfaceYAt(d,b.x)){site.ebu.splice(i,1);continue;}
    let rm=false;
    for(let mi=site.mis.length-1;mi>=0;mi--){const m=site.mis[mi];if(surfaceDist(d,b.x,b.y,m.x,m.y)<5){m.hp-=b.dmg;boomAt(site.pts,b.x,b.y,m.col,3);if(m.hp<=0){surfaceExplodeMissile(site,m,false);site.mis.splice(mi,1);}rm=true;break;}}
    if(rm){site.ebu.splice(i,1);continue;}
    const src={x:surfaceNearX(d,b.x,s.x),y:b.y},opts={source:src,kind:'projectile',weapon:b};
    if(surfaceDist(d,b.x,b.y,s.x,s.y)<shipShieldHitRadius(s)&&shipShieldCanTakeHit(s,opts)){
      const sh=applyShipShieldDamage(s,b.dmg,opts);b.dmg=sh.passthroughDamage;shipDamageTone({shieldDamage:sh.shieldDamage,hullDamage:0});
      if(sh.blocked||b.dmg<=0){site.ebu.splice(i,1);continue;}
    }
    if(surfaceDist(d,b.x,b.y,s.x,s.y)<shipHitRadius(s)){
      site.ebu.splice(i,1);const hit=applyShipDamage(s,b.dmg,opts);shipDamageTone(hit);if(s.hp<=0){siteKillShip();return;}
    }
  }
}
function updSurface(){
  const site=G.site,d=site.d,s=site.s;
  updPts(site.pts,.03);
  for(let i=site.lsb.length-1;i>=0;i--)if(--site.lsb[i].l<=0)site.lsb.splice(i,1);
  if(!s.alive)return;
  applyRotation(s,iRot(),s.energy<=0);
  if(iShieldToggle())toggleShipShield(s);
  tickShieldRecharge(s);
  const thrustIn=iThrustInput();
  if(thrustIn.activeAxes>0){applyShipThrust(s,thrustIn,s.energy<=0);drainEnergy(s,thrustEnergyDrainForMode('site')*thrustEnergyScale(thrustIn));}
  thrusterSound(thrustIn,'site',s.energy<=0);
  s.vy+=d.grav;s.vx*=.9985;s.vy*=.9985;
  const sp=Math.hypot(s.vx,s.vy);if(sp>5.8){s.vx=s.vx/sp*5.8;s.vy=s.vy/sp*5.8;}
  s.x=wrap(s.x+s.vx,d.worldW);s.y+=s.vy;
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  site.cam=updateSurfaceCamera(site.cam,s,d);
  if(s.y<d.exitY){returnPlanetToOverworld();return;}
  surfaceBounce(site);if(s.hp<=0){siteKillShip();return;}
  for(const f of site.fu)if(!f.got&&surfaceDist(d,s.x,s.y,f.x,f.y)<22){f.got=true;pickupEnergy(s,surfaceNearX(d,f.x,s.x),f.y,site.pts,d.col);}
  if(d.tunnel&&!planetState(G.lv).completedSites[d.tunnel.siteId]){
    const tx=surfaceNearX(d,d.tunnel.x,s.x),ty=d.tunnel.y-38;
    if(Math.hypot(s.x-tx,s.y-ty)<34){saveActiveSiteState();enterTunnel('down',s);return;}
  }
  const beamSpace={toroidal:true,worldW:d.worldW,worldH:999999};
  {const wp=wpSlot(0);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft>0&&wt.tick){const tgts=surfaceBeamTargets(site),res=wt.tick(wp,s,0,tgts,site.lsb,[],beamSpace);if(res&&res.hitIdx>=0)surfaceHandleBeamHit(site,tgts[res.hitIdx],wp,res);}
  if(s.misLeft>0&&wt.tick&&wp.wpnType==='missile launcher')wt.tick(wp,s,0,site.mis);
  if(iFir()&&!s.scd&&!s.pulsesLeft&&!s.misLeft)tryFire(wp,wt,s,0,site.bul);}}
  {const wp=wpSlot(1);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft2>0&&wt.tick){const tgts=surfaceBeamTargets(site),res=wt.tick(wp,s,1,tgts,site.lsb,[],beamSpace);if(res&&res.hitIdx>=0)surfaceHandleBeamHit(site,tgts[res.hitIdx],wp,res);}
  if(s.misLeft2>0&&wt.tick&&wp.wpnType==='missile launcher')wt.tick(wp,s,1,site.mis);
  if(iFireSec()&&!s.scd2&&!s.pulsesLeft2&&!s.misLeft2)tryFire(wp,wt,s,1,site.bul);}}
  updSurfaceProjectiles(site);
  for(const e of site.en){updSurfaceEnemy(site,e);if(!s.alive)return;}
  if(updSurfaceMissiles(site,site.mis,false))return;
  if(updSurfaceMissiles(site,site.emi,true))return;
  tickShipReactor(s,'site');
}

function updSite(){
  const site=G.site;
  if(site?.mode==='surface')updSurface();
  else updCaveSite();
}

function drawCaveSite(){
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
  const rx=site.rx;
  if(rx&&Number.isFinite(rx.x)){
    cx.save();
    if(rx.alive){const pu=.5+.5*Math.sin(G.fr*.1);cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8+pu*12;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();cx.fillStyle=col;cx.font='bold 10px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText(rx.hp,rx.x,rx.y+4);}
    else{const pu=.5+.5*Math.sin(G.fr*.35);cx.strokeStyle='#f50';cx.shadowColor='#f50';cx.shadowBlur=10+pu*25;cx.lineWidth=2;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+G.fr*.07;i?cx.lineTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14):cx.moveTo(rx.x+Math.cos(a)*14,rx.y+Math.sin(a)*14);}cx.closePath();cx.stroke();}
    cx.restore();
  }
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
function drawSurfaceCopies(site,x,y,r,fn){
  const d=site.d,cam=site.cam||{x:0,y:0,z:1},z=cam.z||1,left=cam.x,right=cam.x+W/z;
  const k0=Math.ceil((left-r-x)/d.worldW),k1=Math.floor((right+r-x)/d.worldW);
  for(let k=k0;k<=k1;k++)fn(x+k*d.worldW,y,k);
}
function drawSurfaceSegmentCopies(site,x1,y1,x2,y2,pad,fn){
  const d=site.d,cam=site.cam||{x:0,y:0,z:1},z=cam.z||1,left=cam.x,right=cam.x+W/z;
  const minX=Math.min(x1,x2),maxX=Math.max(x1,x2);
  const k0=Math.ceil((left-pad-maxX)/d.worldW),k1=Math.floor((right+pad-minX)/d.worldW);
  for(let k=k0;k<=k1;k++){const ox=k*d.worldW;fn(x1+ox,y1,x2+ox,y2,k);}
}
function drawSurfaceGround(site,ox){
  const d=site.d,col=d.col;
  cx.fillStyle='#020504';
  cx.beginPath();cx.moveTo(ox,d.worldH+80);
  for(let i=0;i<d.terrain.length;i++){const p=d.terrain[i];cx.lineTo(ox+p[0],p[1]);}
  cx.lineTo(ox+d.worldW,d.worldH+80);cx.closePath();cx.fill();
  cx.save();cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8;cx.lineWidth=1.5;
  cx.beginPath();for(let i=0;i<d.terrain.length;i++){const p=d.terrain[i];i?cx.lineTo(ox+p[0],p[1]):cx.moveTo(ox+p[0],p[1]);}
  cx.stroke();cx.restore();
}
function drawDish(dish){
  const pu=.5+.5*Math.sin(G.fr*.09+dish.x*.01);
  cx.save();cx.translate(dish.x,dish.y);
  cx.strokeStyle='#ffdd88';cx.shadowColor='#ffdd88';cx.shadowBlur=7+pu*8;cx.lineWidth=1.5;
  cx.beginPath();cx.moveTo(-12,11);cx.lineTo(12,11);cx.moveTo(0,11);cx.lineTo(0,1);cx.stroke();
  cx.beginPath();cx.arc(0,0,13,Math.PI*.08,Math.PI*.92);cx.stroke();
  cx.beginPath();cx.moveTo(0,1);cx.lineTo(10,-8);cx.moveTo(0,1);cx.lineTo(-10,-8);cx.stroke();
  cx.fillStyle='#ffdd88';cx.font='bold 9px monospace';cx.textAlign='center';cx.shadowBlur=0;cx.fillText(dish.hp,0,5);
  cx.restore();
}
function drawSurfaceEnemy(e){
  cx.save();cx.translate(e.x,e.y);
  const col=e.kind==='turret'?'#f44':e.kind==='diver'?'#ff66cc':'#ffaa33';
  cx.strokeStyle=col;cx.shadowColor=col;cx.shadowBlur=8;cx.lineWidth=1.5;
  if(e.kind==='turret'){
    cx.beginPath();cx.arc(0,0,8,0,Math.PI*2);cx.stroke();
    cx.rotate(e.a);cx.beginPath();cx.moveTo(0,-7);cx.lineTo(0,-18);cx.stroke();
  }else if(e.kind==='skimmer'){
    cx.rotate(e.a);cx.beginPath();cx.moveTo(12,0);cx.lineTo(3,-7);cx.lineTo(-10,-5);cx.lineTo(-12,5);cx.lineTo(3,7);cx.closePath();cx.stroke();
  }else{
    cx.rotate(e.a);cx.beginPath();cx.moveTo(0,-12);cx.lineTo(-9,8);cx.lineTo(0,4);cx.lineTo(9,8);cx.closePath();cx.stroke();
  }
  cx.restore();
}
function drawTunnelMouth(tun,done){
  cx.save();cx.translate(tun.x,tun.y);
  cx.strokeStyle=done?'#335':'#00ccff';cx.shadowColor=cx.strokeStyle;cx.shadowBlur=done?0:10;cx.lineWidth=2;
  cx.beginPath();cx.arc(0,-4,27,Math.PI,Math.PI*2);cx.lineTo(27,8);cx.lineTo(-27,8);cx.closePath();cx.stroke();
  cx.fillStyle=done?'#223':'#001820';cx.globalAlpha=.65;cx.fill();cx.globalAlpha=1;
  cx.restore();
}
function drawSurfaceIndicators(site){
  if(G.st!=='play'||!site.s.alive)return;
  const d=site.d,cam=site.cam||{x:0,y:0,z:1},z=cam.z||1,centerX=cam.x+W/z*.5;
  const psx=(surfaceNearX(d,site.s.x,centerX)-cam.x)*z,psy=(site.s.y-cam.y)*z;
  const targets=[
    ...site.dishes.map(o=>({x:o.x,y:o.y,r:16,col:'#ffdd88',alive:o.alive})),
    ...site.en.map(o=>({x:o.x,y:o.y,r:surfaceEnemyRadius(o),col:o.kind==='diver'?'#ff66cc':o.kind==='turret'?'#f44':'#ffaa33',alive:o.alive})),
    ...site.fu.map(o=>({x:o.x,y:o.y,r:12,col:'#0f8',alive:!o.got,kind:'energy'})),
  ];
  if(d.tunnel&&!planetState(G.lv).completedSites[d.tunnel.siteId])targets.push({x:d.tunnel.x,y:d.tunnel.y-38,r:24,col:'#00ccff',alive:true});
  const inds=[];
  for(const t of targets){
    if(t.alive===false)continue;
    const wx=surfaceNearX(d,t.x,centerX),sx=(wx-cam.x)*z,sy=(t.y-cam.y)*z,r=(t.r||10)*z;
    if(sx+r>=0&&sx-r<=W&&sy+r>=0&&sy-r<=H)continue;
    const dx=sx-psx,dy=sy-psy,len=Math.hypot(dx,dy);if(len<=0)continue;
    const p=indicatorEdgePoint(psx,psy,dx,dy,22);
    inds.push({x:p.x,y:p.y,edge:p.edge,a:Math.atan2(dy,dx),col:t.col,kind:t.kind,scale:Math.max(.85,Math.min(1.35,(t.r||12)/13))});
  }
  drawOffscreenIndicators(inds);
}
function drawSurface(){
  const site=G.site,d=site.d,col=d.col,cam=site.cam||{x:0,y:0,z:1};
  cx.fillStyle=d.bg;cx.fillRect(0,0,W,H);
  drStars(-(cam.x||0)*.035);
  const dustV=dustVelocityForShip(site.s,cam);drDust(dustV.x,dustV.y);
  cx.save();applyWorldCamera(cam);
  const z=cam.z||1,left=cam.x,right=cam.x+W/z;
  const k0=Math.floor(left/d.worldW)-1,k1=Math.floor(right/d.worldW)+1;
  for(let k=k0;k<=k1;k++)drawSurfaceGround(site,k*d.worldW);
  const caveDone=d.tunnel?planetState(G.lv).completedSites[d.tunnel.siteId]:false;
  if(d.tunnel)drawSurfaceCopies(site,d.tunnel.x,d.tunnel.y,42,(x,y)=>drawTunnelMouth({...d.tunnel,x,y},caveDone));
  for(const f of site.fu)if(!f.got)drawSurfaceCopies(site,f.x,f.y,12,(x,y)=>drEnergy(x,y,'#0f8'));
  for(const dish of site.dishes)if(dish.alive)drawSurfaceCopies(site,dish.x,dish.y,22,(x,y)=>drawDish({...dish,x,y}));
  for(const e of site.en)if(e.alive)drawSurfaceCopies(site,e.x,e.y,22,(x,y)=>drawSurfaceEnemy({...e,x,y}));
  for(const b of site.bul)drawSurfaceCopies(site,b.x,b.y,5,(x,y)=>drBullet(x,y,'#fff'));
  for(const b of site.ebu)drawSurfaceCopies(site,b.x,b.y,5,(x,y)=>drBullet(x,y,b.col));
  for(const m of site.mis)drawSurfaceCopies(site,m.x,m.y,10,(x,y)=>drMissile(x,y,m.a,m.type));
  for(const m of site.emi)drawSurfaceCopies(site,m.x,m.y,10,(x,y)=>drMissile(x,y,m.a,m.type));
  for(const lb of site.lsb){const a=lb.l/8,bw=lb.w||2;drawSurfaceSegmentCopies(site,lb.x1,lb.y1,lb.x2,lb.y2,bw+12,(x1,y1,x2,y2)=>{cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=bw;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=Math.max(1,bw/2);cx.shadowBlur=0;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();cx.restore();});}
  for(const p of site.pts)drawSurfaceCopies(site,p.x,p.y,4,(x,y)=>{const a=Math.max(0,p.l/p.ml);cx.globalAlpha=a;cx.fillStyle=p.c;cx.beginPath();cx.arc(x,y,1.5,0,Math.PI*2);cx.fill();cx.globalAlpha=1;});
  if(site.s.alive)drawSurfaceCopies(site,site.s.x,site.s.y,26,(x,y)=>drShip(x,y,site.s.a,site.s,iThrustInput(),site.s.energy,site.s.inv,G.fr));
  if(site.s.alive)drawSurfaceCopies(site,site.s.x,site.s.y,CONE.outerR+8,(x,y)=>drAimCone({...site.s,x,y}));
  cx.restore();
  drawSurfaceIndicators(site);
  drHUD(site.s.energy,site.s.maxEnergy,site.s.hp,site.s.maxHp,site.s);
  const remaining=site.dishes.filter(d=>d.alive).length,ps=planetState(G.lv);
  cx.save();cx.font='13px monospace';cx.textAlign='center';cx.fillStyle=col;cx.fillText(d.name,W/2,18);
  cx.fillStyle=remaining?'#ffdd88':'#0f8';
  const caveTxt=d.tunnel?(ps.completedSites[d.tunnel.siteId]?'  CAVE COMPLETE':'  FIND CAVE ACCESS'):'';
  cx.fillText((site.dishes.length?`DISHES ${remaining}`:'SURFACE')+caveTxt,W/2,36);
  cx.restore();
  if(G.st==='dead_site'){cx.save();cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(0,0,W,H);cx.fillStyle='#f43';cx.shadowColor='#f43';cx.shadowBlur=14;cx.font='bold 26px monospace';cx.textAlign='center';cx.fillText('SHIP DESTROYED',W/2,H/2);cx.restore();}
}
function drawSite(){
  if(G.site?.mode==='surface')drawSurface();
  else drawCaveSite();
}
