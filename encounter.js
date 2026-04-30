'use strict';

// ===================== ENCOUNTER =====================
function encToroidalActive(enc){return !!(enc&&!enc.isHBase&&!enc.cleared);}
function encDist(enc,ax,ay,bx,by){return encToroidalActive(enc)?toroidalDistance(ax,ay,bx,by,enc.ew,enc.eh):Math.hypot(ax-bx,ay-by);}
function encDelta(enc,ax,ay,bx,by){return encToroidalActive(enc)?wrapDelta(ax,ay,bx,by,enc.ew,enc.eh):{dx:ax-bx,dy:ay-by};}
function encPointNear(enc,x,y,refX,refY){return encToroidalActive(enc)?toroidalPointNear(x,y,refX,refY,enc.ew,enc.eh):{x,y};}
function updEncPts(enc){if(encToroidalActive(enc)){for(let i=enc.pts.length-1;i>=0;i--){const p=enc.pts[i];p.x=wrap(p.x+p.vx,enc.ew);p.y=wrap(p.y+p.vy,enc.eh);p.l--;if(p.l<=0)enc.pts.splice(i,1);}}else updPts(enc.pts);}
function clampEncCameraForExit(enc){enc.cam=updateWorldCamera(enc.cam,enc.s.x,enc.s.y,enc.ew,enc.eh,encounterZoomTarget(enc),.5,.5,1);}
function encKillShip(){
  const enc=G.ENC;killShip(enc.s,enc.pts,'dead_enc');
}
function encWin(){
  const enc=G.ENC,ow=G.OW;
  const keepVelocity=enc.fleetIdx!=null;
  rechargeShieldFromEnergy(enc.s,true);
  if(enc.isHBase){G.hbCleared=true;G.hbState=null;}
  if(enc.owIdx!=null)ow.en[enc.owIdx].alive=false;
  if(enc.fleetIdx!=null)ow.fleets[enc.fleetIdx].alive=false;
  copyShipEnergyState(enc.s,ow.s);
  ow.s.hp=enc.s.hp;ow.s.maxHp=enc.s.maxHp;
  copyShieldState(enc.s,ow.s);
  if(keepVelocity){ow.s.vx+=(Math.random()-.5)*1.2;ow.s.vy+=(Math.random()-.5)*1.2;}
  ow.s.inv=80;
  G.ENC=null;returnToOverworld({keepVelocity});
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
// Detonate a missile at its current position: applies expDmg to entities within expR + visual/audio.
// Caller is responsible for splicing the missile from its array. Player missile (isEnemy=false) damages
// rocks/enemies/turrets/softpts. Enemy missile (isEnemy=true) damages rocks + the player ship.
function encExplodeMissile(enc, m, isEnemy){
  const r=m.expR, d=m.expDmg;
  for(let ri=enc.rocks.length-1;ri>=0;ri--){
    const rk=enc.rocks[ri];
    if(encDist(enc,m.x,m.y,rk.x,rk.y)<r+rk.r){rk.hp-=d;boomAt(enc.pts,rk.x,rk.y,'#778',3);if(rk.hp<=0)splitRock(enc,ri);}
  }
  if(!isEnemy){
    for(const e of enc.en){if(!e.alive)continue;
      if(encDist(enc,m.x,m.y,e.x,e.y)<r+enemyDef(e.t).enc.r){
        e.hp-=d;boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,5);
        if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}
      }
    }
    if(enc.isHBase){
      for(const t of enc.hbase.turrets){if(!t.alive)continue;
        if(Math.hypot(m.x-t.x,m.y-t.y)<r+10){t.alive=false;addStake(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}
      }
      for(const sp of enc.hbase.softpts){if(!sp.alive)continue;
        if(Math.hypot(m.x-sp.x,m.y-sp.y)<r+12){sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);}
      }
    }
  } else {
    const ss=enc.s;if(ss.alive&&encDist(enc,m.x,m.y,ss.x,ss.y)<r+9){
      const hit=applyShipDamage(ss,d,{source:encPointNear(enc,m.x,m.y,ss.x,ss.y),kind:'explosion',weapon:m});
      shipDamageTone(hit);
    }
  }
  boomAt(enc.pts,m.x,m.y,'#ff8800',24);
  boomAt(enc.pts,m.x,m.y,'#ffd',12);
  tone(120,.25,'sawtooth',.10);
}

// Update one missile array (player or enemy). Returns true if the player ship was killed.
function updEncMissiles(enc, mis, isEnemy, ew, eh){
  const s=enc.s;
  for(let i=mis.length-1;i>=0;i--){
    const m=mis[i];
    if(m.spd<m.maxSpd) m.spd=Math.min(m.maxSpd, m.spd+m.accel);
    // Future: heat-seeking turn applied to m.a here when m.seek is true.
    m.vx=Math.sin(m.a)*m.spd;m.vy=-Math.cos(m.a)*m.spd;
    m.x=wrap(m.x+m.vx,ew);m.y=wrap(m.y+m.vy,eh);
    m.l--;
    if(--m.trailTimer<=0){
      m.trailTimer=2;
      const tx=m.x-Math.sin(m.a)*5, ty=m.y+Math.cos(m.a)*5;
      enc.pts.push({x:tx,y:ty,vx:-Math.sin(m.a)*0.4+(Math.random()-.5)*.4,vy:Math.cos(m.a)*0.4+(Math.random()-.5)*.4,l:10+Math.random()*8,ml:18,c:'#fa0'});
    }
    let det=false;
    if(m.l<=0) det=true;
    if(!det){
      for(let ri=enc.rocks.length-1;ri>=0;ri--){
        const rk=enc.rocks[ri];
        if(encDist(enc,m.x,m.y,rk.x,rk.y)<rk.r){
          rk.hp-=m.dmg;boomAt(enc.pts,m.x,m.y,'#778',4);
          if(rk.hp<=0)splitRock(enc,ri);
          det=true;break;
        }
      }
    }
    if(!det){
      if(!isEnemy){
        for(const e of enc.en){if(!e.alive)continue;
          if(encDist(enc,m.x,m.y,e.x,e.y)<enemyDef(e.t).enc.r){
            e.hp-=m.dmg;boomAt(enc.pts,m.x,m.y,enemyDef(e.t).enc.col,5);
            if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}
            det=true;break;
          }
        }
      } else if(s.alive){
        const src=encPointNear(enc,m.x,m.y,s.x,s.y),hitOpts={source:src,kind:'missile',weapon:m};
        if(encDist(enc,m.x,m.y,s.x,s.y)<shipShieldHitRadius(s)&&shipShieldCanTakeHit(s,hitOpts)){
          const shieldHit=applyShipShieldDamage(s,m.dmg,hitOpts);
          m.dmg=shieldHit.passthroughDamage;
          shipDamageTone({shieldDamage:shieldHit.shieldDamage,hullDamage:0});
          if(shieldHit.blocked||m.dmg<=0)det=true;
        }
        if(!det&&encDist(enc,m.x,m.y,s.x,s.y)<shipHitRadius(s)){
          const hit=applyShipDamage(s,m.dmg,hitOpts);
          shipDamageTone(hit);
          det=true;
        }
      }
    }
    if(!det&&enc.isHBase){
      if(pip(m.x,m.y,enc.hbase.hexPoly)) det=true;
      if(!det&&!isEnemy){
        for(const t of enc.hbase.turrets){if(!t.alive)continue;
          if(Math.hypot(m.x-t.x,m.y-t.y)<10){t.alive=false;addStake(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);det=true;break;}
        }
        if(!det) for(const sp of enc.hbase.softpts){if(!sp.alive)continue;
          if(Math.hypot(m.x-sp.x,m.y-sp.y)<12){sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);det=true;break;}
        }
      }
    }
    if(det){
      encExplodeMissile(enc,m,isEnemy);
      mis.splice(i,1);
      if(s.hp<=0){encKillShip();return true;}
    }
  }
  return false;
}

function updEnc(){
  const enc=G.ENC;if(enc.introTimer>0){enc.introTimer--;return;}
  updEncPts(enc);for(let i=enc.lsb.length-1;i>=0;i--){if(--enc.lsb[i].l<=0)enc.lsb.splice(i,1);}
  const s=enc.s;if(!s.alive)return;
  const{ew,eh}=enc;
  for(let i=enc.fu.length-1;i>=0;i--){const f=enc.fu[i];f.vx*=.97;f.vy*=.97;f.x=wrap(f.x+f.vx,ew);f.y=wrap(f.y+f.vy,eh);if(encDist(enc,s.x,s.y,f.x,f.y)<18){pickupEnergy(s,f.x,f.y,enc.pts,'#0f8');enc.fu.splice(i,1);}}
  applyRotation(s, iRotCombat(), s.energy<=0);
  if(iShieldToggle())toggleShipShield(s);
  tickShieldRecharge(s);
  const thrustIn=iThrustInput();
  if(thrustIn.activeAxes>0){
    applyShipThrust(s, thrustIn, s.energy<=0);
    drainEnergy(s, thrustEnergyDrainForMode('encounter')*thrustEnergyScale(thrustIn));
  }
  thrusterSound(thrustIn,'encounter',s.energy<=0);
  const sp=Math.hypot(s.vx,s.vy);if(sp>5){s.vx=s.vx/sp*5;s.vy=s.vy/sp*5;}
  if(enc.cleared){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){encWin();return;}}
  else if(enc.isHBase){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){G.hbState={turrets:enc.hbase.turrets.map(t=>t.alive),softpts:enc.hbase.softpts.map(sp=>sp.alive)};const ow=G.OW;rechargeShieldFromEnergy(s,true);copyShipEnergyState(s,ow.s);ow.s.hp=s.hp;ow.s.maxHp=s.maxHp;copyShieldState(s,ow.s);ow.s.inv=80;G.ENC=null;returnToOverworld();return;}}
  else{s.x=wrap(s.x+s.vx,ew);s.y=wrap(s.y+s.vy,eh);}
  if(s.scd>0)s.scd--;if(s.scd2>0)s.scd2--;if(s.inv>0)s.inv--;
  // Lerp the camera toward the player (clamped to world bounds). The 0.12 multiplier controls follow speed —
  // smaller values add more lag; 1.0 would snap instantly. Same pattern is used in the site level.
  enc.cam=encToroidalActive(enc)?updateToroidalWorldCamera(enc.cam,s.x,s.y,ew,eh,encounterZoomTarget(enc),.5,.5,dynZoomOn()?.12:1):updateWorldCamera(enc.cam,s.x,s.y,ew,eh,encounterZoomTarget(enc),.5,.5,dynZoomOn()?.12:1);
  for(const rk of enc.rocks){rk.x=wrap(rk.x+rk.vx,ew);rk.y=wrap(rk.y+rk.vy,eh);}
  for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(encDist(enc,s.x,s.y,rk.x,rk.y)<rk.r+7){
    const spd=Math.hypot(s.vx,s.vy);
    const delta=encDelta(enc,s.x,s.y,rk.x,rk.y);
    const rd=Math.hypot(delta.dx,delta.dy)||1;const nx=delta.dx/rd;const ny=delta.dy/rd;
    const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.va*=.55;s.x+=nx*10;s.y+=ny*10;if(encToroidalActive(enc)){s.x=wrap(s.x,ew);s.y=wrap(s.y,eh);}
    const dmg=Math.round((spd/5.5)*5);
    let hit=null;
    if(dmg>0){hit=applyShipDamage(s,dmg,{source:encPointNear(enc,rk.x,rk.y,s.x,s.y),kind:'collision'});shipDamageTone(hit,180,.15,'sawtooth',.12);}
    if(dmg>0&&!(hit?.shieldDamage>0)){rk.hp-=dmg;boomAt(enc.pts,rk.x,rk.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);}
    if(s.hp<=0){encKillShip();return;}break;
  }}
  if(enc.isHBase){const{hexPoly,hx,hy}=enc.hbase;let hbHit=pip(s.x,s.y,hexPoly);if(!hbHit){for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;if(dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1])<7){hbHit=true;break;}}}if(hbHit){let best=Infinity,nx=0,ny=0;for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;const dist=dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1]);if(dist<best){best=dist;const dx=hexPoly[j][0]-hexPoly[i][0],dy=hexPoly[j][1]-hexPoly[i][1],len=Math.hypot(dx,dy)||1;nx=-dy/len;ny=dx/len;if(nx*(s.x-hx)+ny*(s.y-hy)<0){nx=-nx;ny=-ny;}}}const spd=Math.hypot(s.vx,s.vy);const dot=s.vx*nx+s.vy*ny;if(dot<0){s.vx-=dot*nx*1.9;s.vy-=dot*ny*1.9;}s.vx*=.55;s.vy*=.55;s.va*=.55;s.x+=nx*10;s.y+=ny*10;const dmg=Math.round((spd/5.5)*5);if(s.inv<=0&&dmg>0){const hit=applyShipDamage(s,dmg,{source:{x:s.x-nx*12,y:s.y-ny*12},kind:'collision'});if(hit.hullDamage>0)s.inv=40;shipDamageTone(hit,180,.15,'sawtooth',.12);}if(s.hp<=0){encKillShip();return;}}}
  const encWalls=enc.isHBase?enc.hbase.hexPoly.map((p,i,hp)=>{const j=(i+1)%hp.length;return[p[0],p[1],hp[j][0],hp[j][1]];}):[];
  const beamSpace=encToroidalActive(enc)?{toroidal:true,worldW:ew,worldH:eh}:null;
  {const wp=wpSlot(0);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft>0&&wt.tick){const tgts=[];enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));enc.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:enemyDef(e.t).enc.r,beamPad:beamMotionPadding(e),kind:'enemy',idx:i});});enc.emi.forEach((m,i)=>tgts.push({x:m.x,y:m.y,r:5,kind:'missile',idx:i}));if(enc.isHBase){enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({x:t.x,y:t.y,r:10,kind:'turret',idx:i});});enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});}const res=wt.tick(wp,s,0,tgts,enc.lsb,encWalls,beamSpace);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='rock'){const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);if(rk.hp<=0)splitRock(enc,tg.idx);}else if(tg.kind==='enemy'){const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,enemyDef(e.t).enc.col,3);if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}}else if(tg.kind==='missile'){const m=enc.emi[tg.idx];m.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,m.col,3);if(m.hp<=0){encExplodeMissile(enc,m,true);enc.emi.splice(tg.idx,1);if(s.hp<=0){encKillShip();return;}}}else if(tg.kind==='turret'){const t=enc.hbase.turrets[tg.idx];t.alive=false;addStake(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}else if(tg.kind==='softpt'){enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);}}}
  if(s.misLeft>0&&wt.tick&&wp.wpnType==='missile launcher') wt.tick(wp,s,0,enc.mis);
  if(iFir()&&!s.scd&&!s.pulsesLeft&&!s.misLeft) tryFire(wp,wt,s,0,enc.bul);}}
  {const wp=wpSlot(1);if(wp){const wt=WEAPON_TYPES[wp.wpnType];
  if(s.pulsesLeft2>0&&wt.tick){const tgts=[];enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));enc.en.forEach((e,i)=>{if(e.alive)tgts.push({x:e.x,y:e.y,r:enemyDef(e.t).enc.r,beamPad:beamMotionPadding(e),kind:'enemy',idx:i});});enc.emi.forEach((m,i)=>tgts.push({x:m.x,y:m.y,r:5,kind:'missile',idx:i}));if(enc.isHBase){enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({x:t.x,y:t.y,r:10,kind:'turret',idx:i});});enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});}const res=wt.tick(wp,s,1,tgts,enc.lsb,encWalls,beamSpace);if(res&&res.hitIdx>=0){const tg=tgts[res.hitIdx];if(tg.kind==='rock'){const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);if(rk.hp<=0)splitRock(enc,tg.idx);}else if(tg.kind==='enemy'){const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,enemyDef(e.t).enc.col,3);if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}}else if(tg.kind==='missile'){const m=enc.emi[tg.idx];m.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,m.col,3);if(m.hp<=0){encExplodeMissile(enc,m,true);enc.emi.splice(tg.idx,1);if(s.hp<=0){encKillShip();return;}}}else if(tg.kind==='turret'){const t=enc.hbase.turrets[tg.idx];t.alive=false;addStake(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);}else if(tg.kind==='softpt'){enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);}}}
  if(s.misLeft2>0&&wt.tick&&wp.wpnType==='missile launcher') wt.tick(wp,s,1,enc.mis);
  if(iFireSec()&&!s.scd2&&!s.pulsesLeft2&&!s.misLeft2) tryFire(wp,wt,s,1,enc.bul);}}
  for(let i=enc.bul.length-1;i>=0;i--){
    const b=enc.bul[i];b.x=wrap(b.x+b.vx,ew);b.y=wrap(b.y+b.vy,eh);b.l-=Math.hypot(b.vx,b.vy);if(b.l<=0){enc.bul.splice(i,1);continue;}
    let hit=false;
    for(let ri=enc.rocks.length-1;ri>=0;ri--){
      const rk=enc.rocks[ri];
      if(encDist(enc,b.x,b.y,rk.x,rk.y)<rk.r){
        rk.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,'#778',4);
        if(rk.hp<=0)splitRock(enc,ri);
        hit=true;break;
      }
    }
    if(hit){enc.bul.splice(i,1);continue;}
    for(const e of enc.en){if(!e.alive)continue;if(encDist(enc,b.x,b.y,e.x,e.y)<enemyDef(e.t).enc.r){e.hp-=b.dmg;tone(400,.05,'square',.06);boomAt(enc.pts,b.x,b.y,enemyDef(e.t).enc.col,5);if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}hit=true;break;}}
    if(hit){enc.bul.splice(i,1);continue;}
    for(let mi=enc.emi.length-1;mi>=0;mi--){const m=enc.emi[mi];if(encDist(enc,b.x,b.y,m.x,m.y)<5){m.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,m.col,3);if(m.hp<=0){encExplodeMissile(enc,m,true);enc.emi.splice(mi,1);if(s.hp<=0){encKillShip();return;}}hit=true;break;}}
    if(hit){enc.bul.splice(i,1);continue;}
    if(!hit&&enc.isHBase){
      if(pip(b.x,b.y,enc.hbase.hexPoly)){boomAt(enc.pts,b.x,b.y,'#cc2200',4);enc.bul.splice(i,1);continue;}
      for(const t of enc.hbase.turrets){if(!t.alive)continue;if(Math.hypot(b.x-t.x,b.y-t.y)<10){t.alive=false;addStake(250);boomAt(enc.pts,t.x,t.y,'#f44',10);boomAt(enc.pts,t.x,t.y,'#ff8800',6);tone(300,.2,'sawtooth',.1);enc.bul.splice(i,1);hit=true;break;}}
      if(!hit){for(const sp of enc.hbase.softpts){if(!sp.alive)continue;if(Math.hypot(b.x-sp.x,b.y-sp.y)<12){sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);enc.bul.splice(i,1);break;}}}
    }
  }
  const alive=enc.en.filter(e=>e.alive);
  if(alive.length===0&&!enc.cleared&&!enc.isHBase){enc.cleared=true;clampEncCameraForExit(enc);tone(880,.3,'sine',.07);}
  if(enc.isHBase&&!enc.cleared&&enc.hbase.softpts.every(sp=>!sp.alive)){enc.cleared=true;tone(880,.3,'sine',.07);}
  for(const e of alive){if(enemyUpdate(e,s,enc,ew,eh))return;}
  if(enc.isHBase&&!enc.cleared){
    for(const t of enc.hbase.turrets){if(t.alive)TURRET.update(t,enc.ebu,s);}
  }
  for(let i=enc.ebu.length-1;i>=0;i--){
    const b=enc.ebu[i];b.x=wrap(b.x+b.vx,ew);b.y=wrap(b.y+b.vy,eh);b.l-=Math.hypot(b.vx,b.vy);if(b.l<=0){enc.ebu.splice(i,1);continue;}
    let rm=false;for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(encDist(enc,b.x,b.y,rk.x,rk.y)<rk.r){rk.hp--;boomAt(enc.pts,b.x,b.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);rm=true;break;}}if(rm){enc.ebu.splice(i,1);continue;}
    for(let mi=enc.mis.length-1;mi>=0;mi--){const m=enc.mis[mi];if(encDist(enc,b.x,b.y,m.x,m.y)<5){m.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,m.col,3);if(m.hp<=0){encExplodeMissile(enc,m,false);enc.mis.splice(mi,1);if(s.hp<=0){encKillShip();return;}}rm=true;break;}}
    if(rm){enc.ebu.splice(i,1);continue;}
    if(enc.isHBase&&pip(b.x,b.y,enc.hbase.hexPoly)){enc.ebu.splice(i,1);continue;}
    const bSrc=encPointNear(enc,b.x,b.y,s.x,s.y),bHitOpts={source:bSrc,kind:'projectile',weapon:b};
    if(encDist(enc,b.x,b.y,s.x,s.y)<shipShieldHitRadius(s)&&shipShieldCanTakeHit(s,bHitOpts)){
      const shieldHit=applyShipShieldDamage(s,b.dmg,bHitOpts);
      b.dmg=shieldHit.passthroughDamage;
      shipDamageTone({shieldDamage:shieldHit.shieldDamage,hullDamage:0});
      if(shieldHit.blocked||b.dmg<=0){enc.ebu.splice(i,1);continue;}
    }
    if(encDist(enc,b.x,b.y,s.x,s.y)<shipHitRadius(s)){
      enc.ebu.splice(i,1);
      const hit=applyShipDamage(s,b.dmg,bHitOpts);
      shipDamageTone(hit);
      if(s.hp<=0){encKillShip();return;}
    }
  }
  if(updEncMissiles(enc,enc.mis,false,ew,eh)) return;
  if(updEncMissiles(enc,enc.emi,true ,ew,eh)) return;
  tickShipReactor(s);
}

function drawEnc(){
  const enc=G.ENC,et=enemyDisplayDef(enc.et);
  const camX=enc.cam?enc.cam.x:0,camY=enc.cam?enc.cam.y:0;
  cx.fillStyle='#030408';cx.fillRect(0,0,W,H);drStars();
  const dustV=dustVelocityForShip(enc.s,enc.cam);
  drDust(dustV.x,dustV.y);
  cx.save();applyWorldCamera(enc.cam||{x:camX,y:camY,z:1});
  const tierCol=['#667','#556','#445'];
  const tor=encToroidalActive(enc),cam=enc.cam||{x:camX,y:camY,z:1};
  const drawAt=(x,y,r,fn)=>tor?drawToroidalCopies(x,y,r,enc.ew,enc.eh,cam,fn):fn(x,y);
  const drawSeg=(x1,y1,x2,y2,pad,fn)=>tor?drawToroidalSegmentCopies(x1,y1,x2,y2,pad,enc.ew,enc.eh,cam,fn):fn(x1,y1,x2,y2);
  function drawRockAt(rk,x,y){
    cx.save();cx.strokeStyle=tierCol[rk.tier||0];cx.shadowColor='#334';cx.shadowBlur=rk.tier===0?6:3;cx.lineWidth=1.5;
    cx.beginPath();
    for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2,r2=rk.r*(1+.2*Math.sin(a*3+rk.r));i?cx.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2):cx.moveTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2);}
    cx.closePath();cx.stroke();
    if(rk.hp<rk.maxHp){
      cx.fillStyle='#333';cx.fillRect(x-rk.r,y-rk.r-7,rk.r*2,4);
      cx.fillStyle='#99a';cx.fillRect(x-rk.r,y-rk.r-7,rk.r*2*(rk.hp/rk.maxHp),4);
    }
    cx.restore();
  }
  for(const rk of enc.rocks)drawAt(rk.x,rk.y,rk.r+12,(x,y)=>drawRockAt(rk,x,y));
  for(const e of enc.en)if(e.alive)drawAt(e.x,e.y,(enemyDef(e.t).enc.r||12)+16,(x,y)=>enemyDef(e.t).drawEnc({...e,x,y}));
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
  for(const f of enc.fu)drawAt(f.x,f.y,12,(x,y)=>drEnergy(x,y,'#0f8'));
  for(const b of enc.bul)drawAt(b.x,b.y,5,(x,y)=>drBullet(x,y,'#fff'));
  for(const b of enc.ebu)drawAt(b.x,b.y,5,(x,y)=>drBullet(x,y,b.col));
  for(const m of enc.mis)drawAt(m.x,m.y,10,(x,y)=>drMissile(x,y,m.a,m.type));
  for(const m of enc.emi)drawAt(m.x,m.y,10,(x,y)=>drMissile(x,y,m.a,m.type));
  for(const lb of enc.lsb){const a=lb.l/8,bw=lb.w||2;drawSeg(lb.x1,lb.y1,lb.x2,lb.y2,bw+12,(x1,y1,x2,y2)=>{cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=10;cx.lineWidth=bw;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=Math.max(1,bw/2);cx.shadowBlur=0;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();cx.restore();});}
  for(const p of enc.pts)drawAt(p.x,p.y,4,(x,y)=>{let a=Math.max(0,p.l/p.ml);const step=renderProfile().particleAlphaStep;if(step>0)a=Math.ceil(a/step)*step;cx.globalAlpha=a;cx.fillStyle=p.c;cx.beginPath();cx.arc(x,y,1.5,0,Math.PI*2);cx.fill();cx.globalAlpha=1;});
  if(enc.s.alive)drawAt(enc.s.x,enc.s.y,24,(x,y)=>drShip(x,y,enc.s.a,enc.s,iThrustInput(),enc.s.energy,enc.s.inv,G.fr));
  if(enc.s.alive)drawAt(enc.s.x,enc.s.y,CONE.outerR+8,(x,y)=>drAimCone({...enc.s,x,y}));
  cx.restore();
  if(G.st==='encounter'&&enc.introTimer<=0&&enc.s.alive){
    drawOffscreenIndicators(collectOffscreenIndicators({
      cam:enc.cam||{x:camX,y:camY,z:1},player:enc.s,worldW:enc.ew,worldH:enc.eh,toroidal:tor,
      targets:[
        ...enc.en.map(e=>({x:e.x,y:e.y,r:enemyDef(e.t).enc.r,col:enemyDef(e.t).enc.col,alive:e.alive})),
        ...enc.fu.map(f=>({x:f.x,y:f.y,r:12,col:'#0f8',kind:'energy'}))
      ]
    }));
  }
  if(enc.introTimer>0){const a=Math.min(1,(70-enc.introTimer)/20);cx.save();cx.globalAlpha=a;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,H/2-36,W,72);cx.fillStyle=et.enc.col;cx.shadowColor=et.enc.col;cx.shadowBlur=20;cx.font='bold 32px monospace';cx.textAlign='center';cx.fillText(enc.label,W/2,H/2+4);cx.shadowBlur=0;cx.fillStyle='#668';cx.font='13px monospace';cx.fillText(enc.isAst&&!enc.en.length?'YOU MAY LEAVE AT ANY TIME':enc.isHBase?'DESTROY ALL SOFT POINTS TO ESCAPE':'DESTROY ALL ENEMIES TO ESCAPE',W/2,H/2+26);cx.globalAlpha=1;cx.restore();}
  const alive=enc.en.filter(e=>e.alive).length;
  cx.save();cx.font='13px monospace';cx.textAlign='center';
  if(enc.cleared){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=6+5*Math.abs(Math.sin(G.fr*.08));cx.fillText('ALL CLEAR — LEAVE THE AREA',W/2,18);}
  else{cx.fillStyle=et.enc.col;cx.fillText(enc.isHBase?enc.label+' — '+enc.hbase.softpts.filter(sp=>sp.alive).length+' soft points remaining':enc.label+' — '+alive+' remaining',W/2,18);}
  cx.restore();
  drHUD(enc.s.energy,enc.s.maxEnergy,enc.s.hp,enc.s.maxHp,enc.s);
}
