'use strict';

let NEXT_ENC_ENEMY_ID = 1;

function mkEncEnemy(typeOrClass, x, y, timer) {
  const et=enemySpawnDef(typeOrClass),ec=et.enc;
  const wp=WEAPON_MAP[ec.fire.wpn];
  const energyMax=et.energyMax??ec.energyMax,energyRegenPerSec=et.energyRegenPerSec??ec.energyRegenPerSec;
  return {
    x, y, vx:0, vy:0, a:Math.PI, hp:ec.hp, mhp:ec.hp, alive:true, t:et.id, eid:NEXT_ENC_ENEMY_ID++, spin:0,
    weaponIds:[ec.fire.wpn],
    ...(Number.isFinite(energyMax)?{energyMax,energy:energyMax,energyRegenPerSec:energyRegenPerSec??0}:{}),
    weapons:[mkWeaponSlot({cd:timer ?? 0, ammo:ammoForMountedWeapon(wp)})]
  };
}

function enemyInitialCooldown(typeOrClass, stagger=0) {
  const ec=enemyDef(typeOrClass).enc,wp=WEAPON_MAP[ec.fire.wpn];
  return weaponCooldownFrames(wp)+stagger;
}

function enemyAimAngle(e, s, ew, eh, fw, ewp) {
  const d=wrapDelta(s.x,s.y,e.x,e.y,ew,eh);
  const direct=Math.atan2(d.dx,-d.dy);
  const lead=fw.lead??0;
  if(!(lead>0)) return direct;
  const dist=Math.hypot(d.dx,d.dy)||1;
  const leadSpeedA=effectiveLeadSpeed(ewp,e,direct);
  const framesA=Math.min(42,dist/leadSpeedA);
  const txA=s.x+(s.vx||0)*framesA*lead,tyA=s.y+(s.vy||0)*framesA*lead;
  const la=wrapDelta(txA,tyA,e.x,e.y,ew,eh);
  const aimA=Math.atan2(la.dx,-la.dy);
  const leadSpeedB=effectiveLeadSpeed(ewp,e,aimA);
  const framesB=Math.min(42,dist/leadSpeedB);
  const txB=s.x+(s.vx||0)*framesB*lead,tyB=s.y+(s.vy||0)*framesB*lead;
  const lb=wrapDelta(txB,tyB,e.x,e.y,ew,eh);
  return Math.atan2(lb.dx,-lb.dy);
}

function enemyCanStartFire(e, dist, aimAngle, fw, ewp) {
  const maxRange=weaponEffectiveRange(ewp);
  const minRange=fw.minRange??0;
  if(dist<minRange||dist>maxRange)return false;
  if(fw.passOnly&&e.pass!==0&&e.pass!==1)return false;
  const arc=fw.arc??Math.PI;
  return Math.abs(angDiff(e.a,aimAngle))<=arc;
}

function enemyRetryCooldown() {
  return 8 + Math.floor(Math.random() * 12);
}

function enemyWeaponShotCount(actor, slot, wp, requested = 1) {
  const count = Math.max(1, Math.floor(requested || 1));
  return weaponHasAmmo(wp) ? Math.min(count, currentAmmoForSlot(actor, slot) ?? 0) : count;
}

function enemyFireAngles(e, fw, aimAngle, shots) {
  if(fw.mode === 'spin') return Array.from({length:shots}, (_, k) => e.spin + k * Math.PI * 2 / shots);
  const spread = fw.spread || 0;
  return Array.from({length:shots}, (_, k) => aimAngle + (k - (shots - 1) / 2) * spread);
}

function encEnemyBeamTargets(enc, s) {
  const tgts = [];
  const hit = {source:{x:s.x, y:s.y}, kind:'beam'};
  if(shipShieldCanTakeHit(s, hit)) tgts.push({x:s.x, y:s.y, r:shipShieldHitRadius(s), kind:'shield'});
  tgts.push({x:s.x, y:s.y, r:shipHitRadius(s), kind:'ship'});
  for(let mi=0; mi<enc.mis.length; mi++) tgts.push({x:enc.mis[mi].x, y:enc.mis[mi].y, r:5, kind:'missile', idx:mi});
  return tgts;
}

function encEnemyHandleBeamHit(e, s, enc, ew, eh, wp, res, tor, tg) {
  const src = tor ? toroidalPointNear(res.x1, res.y1, s.x, s.y, ew, eh) : {x:res.x1, y:res.y1};
  const beamHit = {source:src, kind:'beam', weapon:wp};
  if(tg.kind === 'shield') {
    const ex = src.x + Math.sin(res.a) * wp.range, ey = src.y - Math.cos(res.a) * wp.range;
    const hit = applyShipBeamDamage(s, wp.dmg, {...beamHit, beamEnd:{x:ex, y:ey}});
    shipDamageTone(hit);
    if(s.hp <= 0) { encKillShip(); return true; }
  } else if(tg.kind === 'ship') {
    const hit = applyShipDamage(s, wp.dmg, beamHit);
    shipDamageTone(hit);
    if(s.hp <= 0) { encKillShip(); return true; }
  } else if(tg.kind === 'missile') {
    const m = enc.mis[tg.idx];
    m.hp -= wp.dmg;
    boomAt(enc.pts, res.x2, res.y2, m.col, 3);
    if(m.hp <= 0) {
      encExplodeMissile(enc, m, false);
      enc.mis.splice(tg.idx, 1);
      if(s.hp <= 0) { encKillShip(); return true; }
    }
  }
  return false;
}

function encEnemyWeaponContext(e, s, enc, ew, eh, ecDef, fw, wp, dist, aimAngle, tor) {
  const shots = enemyWeaponShotCount(e, 0, wp, fw.count || 1);
  const angles = enemyFireAngles(e, fw, aimAngle, shots);
  return {
    trace:'encounter',
    angle:aimAngle,
    angles,
    count:shots,
    ammoCost:shots,
    spread:fw.spread || 0,
    offset:fw.offset,
    cooldownFrames:weaponCooldownFrames(wp),
    retryCooldown:enemyRetryCooldown,
    projectileColor:ecDef.col,
    projectileTone:[550 + enemyTypeIndex(e.t) * 80, .04, 'square', .03],
    beamColor:ecDef.enc.col,
    beamTone:[550 + enemyTypeIndex(e.t) * 80, .08, 'sine', .04],
    bul:enc.ebu,
    mis:enc.emi,
    lsb:enc.lsb,
    walls:[],
    space:tor ? {toroidal:true, worldW:ew, worldH:eh} : null,
    tgts:()=>encEnemyBeamTargets(enc, s),
    onBeamHit:(tg, hitWp, res)=>encEnemyHandleBeamHit(e, s, enc, ew, eh, hitWp, res, tor, tg),
    blocked:()=>e.disengaging && e.disengageKind === 'permanent',
    canStartFire:()=>shots > 0 && enemyCanFireAnyWeapon(e) && enemyCanStartFire(e, dist, aimAngle, fw, wp),
    aimOnPress:wp.fireMode === 'beam',
  };
}

function enemyLaunchDrones(e, enc, ec, ew, eh) {
  const launch=ec.launch;
  if(!launch)return;
  if(e.launchTimer==null)e.launchTimer=120+Math.floor(Math.random()*90);
  if(--e.launchTimer>0)return;
  const active=enc.en.filter(o=>o.alive&&o.spawnParent===e.eid&&enemyDef(o.t).type===launch.type).length;
  if(active<(launch.maxActive??3)){
    const a=e.a+Math.PI+(Math.random()-.5)*1.2,r=launch.radius??ec.r+18;
    const childDef=enemySpawnDef(launch.type);
    const child=mkEncEnemy(childDef.id,wrap(e.x+Math.sin(a)*r,ew),wrap(e.y-Math.cos(a)*r,eh),enemyInitialCooldown(childDef.id,Math.floor(Math.random()*40)));
    child.spawnParent=e.eid;
    child.vx=e.vx+Math.sin(a)*.8;
    child.vy=e.vy-Math.cos(a)*.8;
    enc.en.push(child);
    tone(260,.08,'square',.04);
  }
  e.launchTimer=(launch.cd??360)+Math.floor(Math.random()*80-40);
}

// Returns true if the player ship was killed (caller should return from updEnc).
function enemyUpdate(e, s, enc, ew, eh) {
  const ecDef=enemyDef(e.t),ec=ecDef.enc;
  const tor=encToroidalActive(enc);
  e.spin+=ecDef.spinRate;
  const ai=ENEMY_AI[ecDef.type];
  if(!ai)throw new Error(`Enemy type ${ecDef.type} has no AI behavior`);
  enemySetSpeedLimit(e,ec.spd);
  const disengaging=enemyTickDisengage(e,{
    s,worldW:ew,worldH:eh,cam:enc.cam,radius:enemyCollisionRadius(e),
    deltaFromPlayer:enemy=>tor?wrapDelta(enemy.x,enemy.y,s.x,s.y,ew,eh):{dx:enemy.x-s.x,dy:enemy.y-s.y}
  });
  if(!e.alive)return false;
  if(!disengaging)ai.update(e, ec, s, ew, eh);
  enemyTickPursuitBoost(e,s,ew,eh,ecDef.type);
  e.vx*=.975;e.vy*=.975;enemyApplySpeedLimit(e,ec.spd);
  if(e.disengaging&&e.disengageKind==='permanent'){e.x+=e.vx;e.y+=e.vy;}
  else {e.x=wrap(e.x+e.vx,ew);e.y=wrap(e.y+e.vy,eh);}
  for(const rk of enc.rocks){const d=tor?wrapDelta(e.x,e.y,rk.x,rk.y,ew,eh):{dx:e.x-rk.x,dy:e.y-rk.y},rd=Math.hypot(d.dx,d.dy)||1;if(rd<rk.r+16){e.vx+=(d.dx/rd)*.3;e.vy+=(d.dy/rd)*.3;}}
  for(const oe of enc.en){if(oe===e||!oe.alive)continue;const oec=enemyDef(oe.t).enc,d=tor?wrapDelta(e.x,e.y,oe.x,oe.y,ew,eh):{dx:e.x-oe.x,dy:e.y-oe.y},od=Math.hypot(d.dx,d.dy)||1;const minD=ec.r+oec.r;if(od<minD){const nx=d.dx/od,ny=d.dy/od;const push=(minD-od)/minD*.5;e.vx+=nx*push;e.vy+=ny*push;}}
  if(!e.disengaging)enemyLaunchDrones(e,enc,ec,ew,eh);
  if(e.disengaging&&e.disengageKind==='permanent'&&enemyPastEncounterBoundary(e,{worldW:ew,worldH:eh,radius:enemyCollisionRadius(e)})&&enemyOffscreen(e,{cam:enc.cam,radius:enemyCollisionRadius(e)})){
    e.alive=false;
    return false;
  }

  const {dx,dy}=wrapDelta(s.x,s.y,e.x,e.y,ew,eh),dist=Math.hypot(dx,dy)||1;
  const fw=ec.fire,ewp=WEAPON_MAP[fw.wpn],ta=enemyAimAngle(e,s,ew,eh,fw,ewp);
  if(runAiWeaponSlot(e,0,ewp,encEnemyWeaponContext(e,s,enc,ew,eh,ecDef,fw,ewp,dist,ta,tor))) return s.hp<=0;
  if(dist<ec.r+9){
    e.vx-=(dx/dist)*2;e.vy-=(dy/dist)*2;
  }
  return false;
}
