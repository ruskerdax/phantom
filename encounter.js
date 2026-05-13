'use strict';

// ===================== ENCOUNTER =====================
function encToroidalActive(enc){return !!(enc&&!enc.isHBase&&!enc.cleared);}
function encDist(enc,ax,ay,bx,by){return encToroidalActive(enc)?toroidalDistance(ax,ay,bx,by,enc.ew,enc.eh):Math.hypot(ax-bx,ay-by);}
function encDelta(enc,ax,ay,bx,by){return encToroidalActive(enc)?wrapDelta(ax,ay,bx,by,enc.ew,enc.eh):{dx:ax-bx,dy:ay-by};}
function encPointNear(enc,x,y,refX,refY){return encToroidalActive(enc)?toroidalPointNear(x,y,refX,refY,enc.ew,enc.eh):{x,y};}
function encEnemySegmentHit(enc,e,x1,y1,x2,y2,pad=0){
  const p={px:x1,py:y1,x:x2,y:y2};
  const segOpts=encProjectileNearOpts(enc);
  const seg=projectileSegmentNearTarget(p,e.x,e.y,segOpts);
  const ep=encPointNear(enc,e.x,e.y,seg.x1,seg.y1);
  return projectileHitTest(p,{shape:'hull',x:ep.x,y:ep.y,hull:enemyHullWorld({...e,x:ep.x,y:ep.y}),pad},segOpts).hit;
}
function encSegmentNear(enc,x1,y1,x2,y2,refX,refY){
  if(!encToroidalActive(enc))return{x1,y1,x2,y2};
  const p1=toroidalPointNear(x1,y1,refX,refY,enc.ew,enc.eh);
  return{x1:p1.x,y1:p1.y,x2:wrapCoordNear(x2,p1.x,enc.ew),y2:wrapCoordNear(y2,p1.y,enc.eh)};
}
function encProjectileNearOpts(enc){
  return{segmentNear:(seg,tx,ty)=>encSegmentNear(enc,seg.x1,seg.y1,seg.x2,seg.y2,tx,ty)};
}
function encSegmentCircleHit(enc,p,cx2,cy2,r){
  return projectileHitTest(p,{shape:'circle',x:cx2,y:cy2,r},encProjectileNearOpts(enc)).hit;
}
function encDefenseSegmentHit(enc,p,t,pad=0){
  const segOpts=encProjectileNearOpts(enc);
  const seg=projectileSegmentNearTarget(p,t.x,t.y,segOpts);
  const tp=encPointNear(enc,t.x,t.y,seg.x1,seg.y1);
  return projectileHitTest(p,{shape:'hull',x:tp.x,y:tp.y,hull:defenseHullWorld({...t,x:tp.x,y:tp.y}),pad},segOpts).hit;
}
function updEncPts(enc){if(encToroidalActive(enc)){for(let i=enc.pts.length-1;i>=0;i--){const p=enc.pts[i];p.x=wrap(p.x+p.vx,enc.ew);p.y=wrap(p.y+p.vy,enc.eh);p.l--;if(p.l<=0)enc.pts.splice(i,1);}}else updPts(enc.pts);}
function clampEncCameraForExit(enc){enc.cam=updateWorldCamera(enc.cam,enc.s.x,enc.s.y,enc.ew,enc.eh,encounterZoomTarget(enc),.5,.5,1);}
function encKillShip(){
  const enc=G.ENC;killShip(enc.s,enc.pts,'dead_enc');
  G.absAimTarget=null;
}
function encBeamTargets(enc){
  const tgts=[];
  enc.rocks.forEach((rk,i)=>tgts.push({x:rk.x,y:rk.y,r:rk.r,kind:'rock',idx:i}));
  enc.en.forEach((e,i)=>{if(e.alive)tgts.push(enemyBeamTarget(e,i));});
  enc.emi.forEach((m,i)=>tgts.push({x:m.x,y:m.y,r:5,kind:'missile',idx:i}));
  if(enc.isHBase){
    enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push(defenseBeamTarget(t,i,'defense'));});
    enc.hbase.softpts.forEach((sp,i)=>{if(sp.alive)tgts.push({x:sp.x,y:sp.y,r:12,kind:'softpt',idx:i});});
  }
  return tgts;
}
function encLockTargets(enc){
  const tgts=[];
  enc.en.forEach((e,i)=>{if(e.alive)tgts.push({id:'enc-enemy:'+(e.eid ?? i),x:e.x,y:e.y,r:enemyCollisionRadius(e)||12,kind:'enemy',idx:i,entity:e,alive:true});});
  if(enc.isHBase){
    enc.hbase.turrets.forEach((t,i)=>{if(t.alive)tgts.push({id:'enc-turret:'+i,x:t.x,y:t.y,r:defenseRadius(t),kind:'turret',idx:i,entity:t,alive:true});});
  }
  return tgts;
}
function encStickyTarget(enc, st){
  if(st.kind==='enemy')return enc.en.find(e=>e.alive&&targetIdForSticky(e,'enemy')===st.id)||null;
  if(st.kind==='turret'&&enc.isHBase)return enc.hbase.turrets.find(t=>t.alive&&targetIdForSticky(t,'turret')===st.id)||null;
  return null;
}
function encStickyFlash(enc,m){
  boomAt(enc.pts,m.x,m.y,'#f22',2);
}
function encHandleBeamHit(enc,tg,wp,res){
  if(tg.kind==='rock'){
    const rk=enc.rocks[tg.idx];rk.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,'#778',3);
    if(rk.hp<=0)splitRock(enc,tg.idx);
  }else if(tg.kind==='enemy'){
    const e=enc.en[tg.idx];e.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,enemyDef(e.t).enc.col,3);
    if(e.hp<=0){
      e.alive=false;addStake(enemyDef(e.t).sc);
      boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);
      tone(200,.3,'sawtooth',.1);
      if(enemyDef(e.t).energy&&Math.random()<.75){
        for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}
      }
    }
  }else if(tg.kind==='missile'){
    const m=enc.emi[tg.idx];m.hp-=wp.dmg;boomAt(enc.pts,res.x2,res.y2,m.col,3);
    if(m.hp<=0){finishStickyMissile(m);encExplodeMissile(enc,m,true);enc.emi.splice(tg.idx,1);}
  }else if(tg.kind==='defense'){
    damageDefense(enc,enc.hbase.turrets[tg.idx],wp.dmg,res.x2,res.y2);
  }else if(tg.kind==='softpt'){
    enc.hbase.softpts[tg.idx].alive=false;boomAt(enc.pts,res.x2,res.y2,'#ff8800',10);tone(350,.15,'square',.08);
  }
}
function encRicochetRockHit(enc,b){
  for(const rk of enc.rocks){
    const p=encPointNear(enc,b.x,b.y,rk.x,rk.y),dx=p.x-rk.x,dy=p.y-rk.y,dist=Math.hypot(dx,dy);
    if(dist<rk.r+(b.r||0)){
      let nx,ny;
      if(dist>0){nx=dx/dist;ny=dy/dist;}
      else {const sp=Math.hypot(b.vx||0,b.vy||0)||1;nx=-(b.vx||0)/sp;ny=-(b.vy||0)/sp;}
      return {x:rk.x+nx*rk.r,y:rk.y+ny*rk.r,nx,ny};
    }
  }
  return null;
}
function encPlayerBulletStep(enc,b,{rocks=true}={}){
  if(rocks){
    for(let ri=enc.rocks.length-1;ri>=0;ri--){
      const rk=enc.rocks[ri];
      if(encSegmentCircleHit(enc,b,rk.x,rk.y,rk.r)){
        rk.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,'#778',4);
        if(rk.hp<=0)splitRock(enc,ri);
        return true;
      }
    }
  }
  for(const e of enc.en){if(!e.alive)continue;if(encEnemySegmentHit(enc,e,b.px??b.x,b.py??b.y,b.x,b.y,1)){e.hp-=b.dmg;tone(400,.05,'square',.06);boomAt(enc.pts,b.x,b.y,enemyDef(e.t).enc.col,5);if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}return true;}}
  for(let mi=enc.emi.length-1;mi>=0;mi--){const m=enc.emi[mi];if(encSegmentCircleHit(enc,b,m.x,m.y,5)){m.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,m.col,3);if(m.hp<=0){finishStickyMissile(m);encExplodeMissile(enc,m,true);enc.emi.splice(mi,1);}return true;}}
  if(enc.isHBase){
    if(pip(b.x,b.y,enc.hbase.hexPoly)){boomAt(enc.pts,b.x,b.y,'#cc2200',4);return true;}
    for(const t of enc.hbase.turrets){if(!t.alive)continue;if(encDefenseSegmentHit(enc,b,t,1)){damageDefense(enc,t,b.dmg,b.x,b.y);return true;}}
    for(const sp of enc.hbase.softpts){if(!sp.alive)continue;if(encSegmentCircleHit(enc,b,sp.x,sp.y,12)){sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);return true;}}
  }
  return false;
}
function encEnemyBulletStep(enc,b,s,{rocks=true}={}){
  if(rocks){
    for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(encSegmentCircleHit(enc,b,rk.x,rk.y,rk.r)){rk.hp-=10;boomAt(enc.pts,b.x,b.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);return true;}}
  }
  for(let mi=enc.mis.length-1;mi>=0;mi--){const m=enc.mis[mi];if(encSegmentCircleHit(enc,b,m.x,m.y,5)){m.hp-=b.dmg;boomAt(enc.pts,b.x,b.y,m.col,3);if(m.hp<=0){finishStickyMissile(m);encExplodeMissile(enc,m,false);enc.mis.splice(mi,1);}return true;}}
  if(enc.isHBase&&pip(b.x,b.y,enc.hbase.hexPoly))return true;
  const shipHit=applyProjectileDamageToShip(s,b,{...encProjectileNearOpts(enc),targetX:s.x,targetY:s.y,kind:'projectile',weapon:b,damage:b.dmg});
  if(shipHit.shieldHit?.shieldDamage>0){
    b.dmg=shipHit.remainingDamage;
    shipDamageTone({shieldDamage:shipHit.shieldHit.shieldDamage,hullDamage:0});
    if(shipHit.consumed)return true;
  }
  if(shipHit.hullHit){
    b.dmg=shipHit.remainingDamage;
    shipDamageTone(shipHit.hullHit);
    return true;
  }
  return shipHit.consumed;
}
function stepEncounterProjectile(enc,b,ew,eh,onStep){
  if(b.ricochetProjectile){
    return stepRicochetBullet(b,{wrapX:ew,wrapY:eh,worldW:ew,worldH:eh,maxStep:4,terrainFirst:true,terrainHit:bb=>encRicochetRockHit(enc,bb),onProjectileStep:onStep});
  }
  return stepBullet(b,ew,eh,4,onStep);
}
function encWin(){
  const enc=G.ENC,ow=G.OW;
  const keepVelocity=enc.fleetIdx!=null;
  rechargeShieldFromEnergy(enc.s,true);
  if(enc.isHBase){G.hbState=null;completeObjective(objectiveId(OBJECTIVE_TYPE_IDS.HBASE));}
  if(enc.fleetIdx!=null)ow.fleets[enc.fleetIdx].alive=false;
  refillAmmoForLoadout(enc.s,{skipMagazines:true});
  refillMagsForLoadout(enc.s);
  copyShipEnergyState(enc.s,ow.s);
  ow.s.hp=enc.s.hp;ow.s.maxHp=enc.s.maxHp;
  copyShieldState(enc.s,ow.s);
  copyAmmoStateForLoadout(enc.s,ow.s);
  copyMagStateForLoadout(enc.s,ow.s);
  if(keepVelocity){ow.s.vx+=(Math.random()-.5)*1.2;ow.s.vy+=(Math.random()-.5)*1.2;}
  ow.s.inv=80;
  G.ENC=null;G.absAimTarget=null;returnToOverworld({keepVelocity});
  saveGame();
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
        hp:nt===1?90:30, maxHp:nt===1?90:30, tier:nt
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
    if(explosionHitTest(m.x,m.y,r,{shape:'circle',x:rk.x,y:rk.y,r:rk.r},{distance:encDist(enc,m.x,m.y,rk.x,rk.y)}).hit){rk.hp-=d;boomAt(enc.pts,rk.x,rk.y,'#778',3);if(rk.hp<=0)splitRock(enc,ri);}
  }
  if(!isEnemy){
    for(const e of enc.en){if(!e.alive)continue;
      const ep=encPointNear(enc,e.x,e.y,m.x,m.y);
      if(explosionHitTest(m.x,m.y,r,{shape:'hull',hull:enemyHullWorld({...e,x:ep.x,y:ep.y})}).hit){
        e.hp-=d;boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,5);
        if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}
      }
    }
    if(enc.isHBase){
      for(const t of enc.hbase.turrets){if(!t.alive)continue;
        const mp=encPointNear(enc,m.x,m.y,t.x,t.y);
        if(explosionHitTest(mp.x,mp.y,r,{shape:'hull',hull:defenseHullWorld(t)}).hit)damageDefense(enc,t,d,m.x,m.y);
      }
      for(const sp of enc.hbase.softpts){if(!sp.alive)continue;
        if(explosionHitTest(m.x,m.y,r,{shape:'circle',x:sp.x,y:sp.y,r:12},{distance:encDist(enc,m.x,m.y,sp.x,sp.y)}).hit){sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);}
      }
    }
  } else {
    const ss=enc.s,src=encPointNear(enc,m.x,m.y,ss.x,ss.y);
    const blast=explosionHitTest(m.x,m.y,r,{shape:'ship',ship:ss},{source:src,kind:'explosion',weapon:m,distance:encDist(enc,m.x,m.y,ss.x,ss.y)});
    if(ss?.alive&&blast.hit){
      const hit=applyShipDamage(ss,d,blast.hitOpts);
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
    let det=false;
    const sticky = !!m.stickyMissile;
    m.px=m.x;m.py=m.y;
    if(sticky){
      const state=tickStickyMissileState(m,{stickyTarget:st=>encStickyTarget(enc,st),flash:mm=>encStickyFlash(enc,mm)});
      if(state.expired){finishStickyMissile(m);mis.splice(i,1);continue;}
      det=state.detonate;
      if(!det&&!state.stuck){
        accelerateMissileVector(m,0);
        m.x=wrap(m.x+(m.vx||0),ew);m.y=wrap(m.y+(m.vy||0),eh);
        if(!m.hasStuck)m.l--;
      }
    }else{
      if(m.spd<m.maxSpd) m.spd=Math.min(m.maxSpd, m.spd+m.accel);
      if(m.seek) heatSeekTurn(m, {
        seekTargets:()=>encLockTargets(enc),
        seekDelta:(_m,t)=>encDelta(enc,t.x,t.y,_m.x,_m.y)
      }, {kinds:m.seekTargetKinds||['enemy']});
      m.propVx = Math.sin(m.a) * m.spd;
      m.propVy = -Math.cos(m.a) * m.spd;
      setMissileWorldVelocity(m);
      m.x=wrap(m.x+m.vx,ew);m.y=wrap(m.y+m.vy,eh);
      m.l--;
      if(m.l<=0) det=true;
    }
    if(--m.trailTimer<=0){
      m.trailTimer=2;
      const tx=m.x-Math.sin(m.a)*5, ty=m.y+Math.cos(m.a)*5;
      enc.pts.push({x:tx,y:ty,vx:-Math.sin(m.a)*0.4+(Math.random()-.5)*.4,vy:Math.cos(m.a)*0.4+(Math.random()-.5)*.4,l:10+Math.random()*8,ml:18,c:'#fa0'});
    }
    if(!det){
      for(let ri=enc.rocks.length-1;ri>=0;ri--){
        const rk=enc.rocks[ri];
        if(encSegmentCircleHit(enc,m,rk.x,rk.y,rk.r)){
          if(sticky){stickMissileToTerrain(m,m.x,m.y);}
          else{
            rk.hp-=m.dmg;boomAt(enc.pts,m.x,m.y,'#778',4);
            if(rk.hp<=0)splitRock(enc,ri);
            det=true;
          }
          break;
        }
      }
    }
    if(!det){
      if(!isEnemy){
        for(const e of enc.en){if(!e.alive)continue;
          if(encEnemySegmentHit(enc,e,m.px,m.py,m.x,m.y,1)){
            if(sticky){stickProjectile(m,e,'enemy');tone(220,.06,'square',.05);}
            else{
              e.hp-=m.dmg;boomAt(enc.pts,m.x,m.y,enemyDef(e.t).enc.col,5);
              if(e.hp<=0){e.alive=false;addStake(enemyDef(e.t).sc);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col,14);boomAt(enc.pts,e.x,e.y,enemyDef(e.t).enc.col2,8);tone(200,.3,'sawtooth',.1);if(enemyDef(e.t).energy&&Math.random()<.75){for(let k=0;k<2;k++){const a2=Math.random()*Math.PI*2;enc.fu.push({x:e.x,y:e.y,vx:Math.cos(a2)*1.2,vy:Math.sin(a2)*1.2,timer:380});}}}
              det=true;
            }
            break;
          }
        }
      } else if(s.alive){
        const shipHit=applyProjectileDamageToShip(s,m,{...encProjectileNearOpts(enc),targetX:s.x,targetY:s.y,kind:'missile',weapon:m,damage:m.dmg});
        if(shipHit.shieldHit?.shieldDamage>0){
          m.dmg=shipHit.remainingDamage;
          shipDamageTone({shieldDamage:shipHit.shieldHit.shieldDamage,hullDamage:0});
        }
        if(shipHit.hullHit){
          m.dmg=shipHit.remainingDamage;
          shipDamageTone(shipHit.hullHit);
        }
        det=shipHit.consumed||!!shipHit.hullHit;
      }
    }
    if(!det&&enc.isHBase){
      if(pip(m.x,m.y,enc.hbase.hexPoly)){if(sticky)stickMissileToTerrain(m,m.x,m.y);else det=true;}
      if(!det&&!isEnemy){
        for(const t of enc.hbase.turrets){if(!t.alive)continue;
          if(encDefenseSegmentHit(enc,m,t,1)){
            if(sticky){stickProjectile(m,t,'turret');tone(220,.06,'square',.05);}
            else{damageDefense(enc,t,m.dmg,m.x,m.y);det=true;}
            break;
          }
        }
        if(!det) for(const sp of enc.hbase.softpts){if(!sp.alive)continue;
          if(encSegmentCircleHit(enc,m,sp.x,sp.y,12)){
            if(sticky)stickMissileToTerrain(m,m.x,m.y);
            else{sp.alive=false;boomAt(enc.pts,sp.x,sp.y,'#ff8800',10);tone(350,.15,'square',.08);det=true;}
            break;
          }
        }
      }
    }
    if(det){
      finishStickyMissile(m);
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
  applyShipSteering(s, s.energy<=0, true);
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
  else if(enc.isHBase){s.x+=s.vx;s.y+=s.vy;if(s.x<-30||s.x>ew+30||s.y<-30||s.y>eh+30){G.hbState={turrets:enc.hbase.turrets.map(t=>t.alive),softpts:enc.hbase.softpts.map(sp=>sp.alive)};const ow=G.OW;rechargeShieldFromEnergy(s,true);copyShipEnergyState(s,ow.s);ow.s.hp=s.hp;ow.s.maxHp=s.maxHp;copyShieldState(s,ow.s);copyAmmoStateForLoadout(s,ow.s);copyMagStateForLoadout(s,ow.s);ow.s.inv=80;G.ENC=null;returnToOverworld();return;}}
  else{s.x=wrap(s.x+s.vx,ew);s.y=wrap(s.y+s.vy,eh);}
  tickWeaponCooldowns(s);if(s.inv>0)s.inv--;
  // Lerp the camera toward the player (clamped to world bounds). The 0.12 multiplier controls follow speed —
  // smaller values add more lag; 1.0 would snap instantly. Same pattern is used in the site level.
  enc.cam=encToroidalActive(enc)?updateToroidalWorldCamera(enc.cam,s.x,s.y,ew,eh,encounterZoomTarget(enc),.5,.5,dynZoomOn()?.12:1):updateWorldCamera(enc.cam,s.x,s.y,ew,eh,encounterZoomTarget(enc),.5,.5,dynZoomOn()?.12:1);
  for(const rk of enc.rocks){rk.x=wrap(rk.x+rk.vx,ew);rk.y=wrap(rk.y+rk.vy,eh);}
  for(let ri=enc.rocks.length-1;ri>=0;ri--){const rk=enc.rocks[ri];if(encDist(enc,s.x,s.y,rk.x,rk.y)<rk.r+7){
    const delta=encDelta(enc,s.x,s.y,rk.x,rk.y);
    const rd=Math.hypot(delta.dx,delta.dy)||1;const nx=delta.dx/rd;const ny=delta.dy/rd;
    s.x+=nx*10;s.y+=ny*10;
    if(encToroidalActive(enc)){s.x=wrap(s.x,ew);s.y=wrap(s.y,eh);}
    const{dmg,hit}=applyShipBounce(s,nx,ny,encPointNear(enc,rk.x,rk.y,s.x,s.y));
    if(dmg>0&&!(hit?.shieldDamage>0)){rk.hp-=dmg;boomAt(enc.pts,rk.x,rk.y,'#778',4);if(rk.hp<=0)splitRock(enc,ri);}
    if(s.hp<=0){encKillShip();return;}break;
  }}
  if(enc.isHBase){const{hexPoly,hx,hy}=enc.hbase;let hbHit=pip(s.x,s.y,hexPoly);if(!hbHit){for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;if(dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1])<7){hbHit=true;break;}}}if(hbHit){let best=Infinity,nx=0,ny=0;for(let i=0;i<hexPoly.length;i++){const j=(i+1)%hexPoly.length;const dist=dseg(s.x,s.y,hexPoly[i][0],hexPoly[i][1],hexPoly[j][0],hexPoly[j][1]);if(dist<best){best=dist;const dx=hexPoly[j][0]-hexPoly[i][0],dy=hexPoly[j][1]-hexPoly[i][1],len=Math.hypot(dx,dy)||1;nx=-dy/len;ny=dx/len;if(nx*(s.x-hx)+ny*(s.y-hy)<0){nx=-nx;ny=-ny;}}}s.x+=nx*10;s.y+=ny*10;const{hit}=applyShipBounce(s,nx,ny,{x:s.x-nx*12,y:s.y-ny*12},{skipDamage:s.inv>0});if(hit?.hullDamage>0)s.inv=40;if(s.hp<=0){encKillShip();return;}}}
  const encWalls=enc.isHBase?enc.hbase.hexPoly.map((p,i,hp)=>{const j=(i+1)%hp.length;return[p[0],p[1],hp[j][0],hp[j][1]];}):[];
  const beamSpace=encToroidalActive(enc)?{toroidal:true,worldW:ew,worldH:eh}:null;
  const encCtx={
    tgts:()=>encBeamTargets(enc),walls:encWalls,space:beamSpace,lsb:enc.lsb,mis:enc.mis,bul:enc.bul,
    lockTargets:()=>encLockTargets(enc),
    lockDelta:(ship,t)=>encDelta(enc,t.x,t.y,ship.x,ship.y),
    onBeamHit:(tg,wp,res)=>encHandleBeamHit(enc,tg,wp,res)
  };
  runPlayerWeaponSlot(s,0,encCtx);if(s.hp<=0){encKillShip();return;}
  runPlayerWeaponSlot(s,1,encCtx);if(s.hp<=0){encKillShip();return;}
  for(let i=enc.bul.length-1;i>=0;i--){
    const b=enc.bul[i];
    const consumed=stepEncounterProjectile(enc,b,ew,eh,()=>encPlayerBulletStep(enc,b,{rocks:!b.ricochetProjectile}));
    if(consumed&&!finishConsumedProjectile(b,enc.bul))enc.bul.splice(i,1);
    if(s.hp<=0){encKillShip();return;}
  }
  const alive=enc.en.filter(e=>e.alive);
  if(alive.length===0&&!enc.cleared&&!enc.isHBase){enc.cleared=true;clampEncCameraForExit(enc);tone(880,.3,'sine',.07);}
  if(enc.isHBase&&!enc.cleared&&enc.hbase.softpts.every(sp=>!sp.alive)){
    enc.cleared=true;
    completeObjective(objectiveId(OBJECTIVE_TYPE_IDS.HBASE));
    tone(880,.3,'sine',.07);
  }
  for(const e of alive){if(enemyUpdate(e,s,enc,ew,eh))return;}
  if(enc.isHBase&&!enc.cleared){
    for(const t of enc.hbase.turrets)updateDefense(enc,t);
  }
  for(let i=enc.ebu.length-1;i>=0;i--){
    const b=enc.ebu[i];
    const consumed=stepEncounterProjectile(enc,b,ew,eh,()=>encEnemyBulletStep(enc,b,s,{rocks:!b.ricochetProjectile}));
    if(consumed&&!finishConsumedProjectile(b,enc.ebu))enc.ebu.splice(i,1);
    if(s.hp<=0){encKillShip();return;}
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
  drDust(dustV.x,dustV.y,enc.cam);
  cx.save();applyWorldCamera(enc.cam||{x:camX,y:camY,z:1});
  const tierCol=['#667','#556','#445'];
  const tor=encToroidalActive(enc),cam=enc.cam||{x:camX,y:camY,z:1};
  const drawAt=(x,y,r,fn)=>tor?drawToroidalCopies(x,y,r,enc.ew,enc.eh,cam,fn):fn(x,y);
  const drawSeg=(x1,y1,x2,y2,pad,fn)=>tor?drawToroidalSegmentCopies(x1,y1,x2,y2,pad,enc.ew,enc.eh,cam,fn):fn(x1,y1,x2,y2);
  function drawRockAt(rk,x,y){
    cx.save();cx.strokeStyle=tierCol[rk.tier||0];cx.shadowColor='#334';cx.shadowBlur=sb(rk.tier===0?6:3);cx.lineWidth=1.5;
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
  for(const e of enc.en)if(e.alive)drawAt(e.x,e.y,(enemyCollisionRadius(e)||12)+16,(x,y)=>enemyDef(e.t).drawEnc({...e,x,y}));
  if(enc.isHBase){
    const{HEX_R,hx,hy,softpts,turrets}=enc.hbase,pu=.5+.5*Math.sin(G.fr*.06);
    cx.save();cx.strokeStyle='#cc2200';cx.shadowColor='#cc2200';cx.shadowBlur=sb(8+pu*8);cx.lineWidth=2;
    cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;i?cx.lineTo(hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R):cx.moveTo(hx+Math.cos(a)*HEX_R,hy+Math.sin(a)*HEX_R);}cx.closePath();cx.stroke();cx.restore();
    for(const sp of softpts){
      cx.save();
      if(sp.alive){cx.strokeStyle='#ff8800';cx.shadowColor='#ff8800';cx.shadowBlur=sb(8+pu*6);cx.lineWidth=1.5;}
      else{cx.strokeStyle='#442200';cx.shadowBlur=0;cx.lineWidth=1;}
      cx.beginPath();cx.arc(sp.x,sp.y,8,0,Math.PI*2);cx.stroke();cx.restore();
    }
    for(const t of turrets){if(t.alive)drawDefense(t);}
  }
  if(enc.s.alive){
    const lockCtx={lockTargets:()=>encLockTargets(enc)};
    for(let slot=0;slot<2;slot++){
      const target=lockedTargetEntity(enc.s,slot,lockCtx);
      if(target)drawAt(target.x,target.y,target.r+10,(x,y)=>drawTargetLockSquare({...target,x,y}));
    }
  }
  for(const f of enc.fu)drawAt(f.x,f.y,12,(x,y)=>drEnergy(x,y,'#0f8'));
  for(const b of enc.bul)drawAt(b.x,b.y,8,(x,y)=>{const wp=WEAPON_MAP[b.wpId];if(wp?.drawProjectile)wp.drawProjectile({...b,x,y});else drBullet(x,y,'#fff');});
  for(const b of enc.ebu)drawAt(b.x,b.y,8,(x,y)=>{const wp=WEAPON_MAP[b.wpId];if(wp?.drawProjectile)wp.drawProjectile({...b,x,y});else drBullet(x,y,b.col);});
  for(const m of enc.mis)drawAt(m.x,m.y,10,(x,y)=>drMissile(x,y,m.a,m.type));
  for(const m of enc.emi)drawAt(m.x,m.y,10,(x,y)=>drMissile(x,y,m.a,m.type));
  for(const lb of enc.lsb){const a=lb.l/8,bw=lb.w||2;drawSeg(lb.x1,lb.y1,lb.x2,lb.y2,bw+12,(x1,y1,x2,y2)=>{cx.save();cx.globalAlpha=a;cx.strokeStyle=lb.col;cx.shadowColor=lb.col;cx.shadowBlur=sb(10);cx.lineWidth=bw;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();cx.globalAlpha=a*.6;cx.strokeStyle='#fff';cx.lineWidth=Math.max(1,bw/2);cx.shadowBlur=0;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke();cx.restore();});}
  for(const p of enc.pts)drawAt(p.x,p.y,4,(x,y)=>{let a=Math.max(0,p.l/p.ml);const step=renderProfile().particleAlphaStep;if(step>0)a=Math.ceil(a/step)*step;cx.globalAlpha=a;cx.fillStyle=p.c;cx.beginPath();cx.arc(x,y,1.5,0,Math.PI*2);cx.fill();cx.globalAlpha=1;});
  if(enc.s.alive)drawAt(enc.s.x,enc.s.y,24,(x,y)=>drShip(x,y,enc.s.a,enc.s,iThrustInput(),enc.s.energy,enc.s.inv,G.fr));
  if(enc.s.alive)drawAt(enc.s.x,enc.s.y,CONE.outerR+8,(x,y)=>drAimCone({...enc.s,x,y}));
  cx.restore();
  if(G.st==='encounter'&&enc.introTimer<=0&&enc.s.alive){
    drawOffscreenIndicators(collectOffscreenIndicators({
      cam:enc.cam||{x:camX,y:camY,z:1},player:enc.s,worldW:enc.ew,worldH:enc.eh,toroidal:tor,
      targets:[
        ...enc.en.map(e=>({x:e.x,y:e.y,r:enemyCollisionRadius(e),col:enemyDef(e.t).enc.col,alive:e.alive})),
        ...enc.fu.map(f=>({x:f.x,y:f.y,r:12,col:'#0f8',kind:'energy'}))
      ]
    }));
  }
  if(enc.introTimer>0){const a=Math.min(1,(70-enc.introTimer)/20);cx.save();cx.globalAlpha=a;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,H/2-36,W,72);cx.fillStyle=et.enc.col;cx.shadowColor=et.enc.col;cx.shadowBlur=sb(20);cx.font='bold 32px MajorMonoDisplay, monospace';cx.textAlign='center';cx.fillText((enc.label||'').toLowerCase(),W/2,H/2+4);cx.shadowBlur=0;cx.fillStyle='#668';cx.font='13px MajorMonoDisplay, monospace';cx.fillText(enc.isAst&&!enc.en.length?'you may leave at any time':enc.isHBase?'destroy all soft points to escape':'destroy all enemies to escape',W/2,H/2+26);cx.globalAlpha=1;cx.restore();}
  const alive=enc.en.filter(e=>e.alive).length;
  cx.save();cx.font='13px MajorMonoDisplay, monospace';cx.textAlign='center';
  if(enc.cleared){cx.fillStyle='#0f8';cx.shadowColor='#0f8';cx.shadowBlur=sb(6+5*Math.abs(Math.sin(G.fr*.08)));cx.fillText('all clear — leave the area',W/2,18);}
  else{const lbl=(enc.label||'').toLowerCase();cx.fillStyle=et.enc.col;cx.fillText(enc.isHBase?lbl+' — '+enc.hbase.softpts.filter(sp=>sp.alive).length+' soft points remaining':lbl+' — '+alive+' remaining',W/2,18);}
  cx.restore();
  drHUD(enc.s.energy,enc.s.maxEnergy,enc.s.hp,enc.s.maxHp,enc.s);
}
