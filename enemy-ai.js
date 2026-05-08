'use strict';

// AI behavior per enemy role/type. Movement steers by role; firing discipline lives in encounter-enemies.js.
function enemyVecToPlayer(e, s, ew, eh) {
  const d=wrapDelta(s.x,s.y,e.x,e.y,ew,eh);
  const dist=Math.hypot(d.dx,d.dy)||1;
  return {dx:d.dx, dy:d.dy, dist, nx:d.dx/dist, ny:d.dy/dist, ta:Math.atan2(d.dx,-d.dy)};
}

function enemyLeadAngle(e, s, ew, eh, scale, projectileSpeed) {
  const d=enemyVecToPlayer(e,s,ew,eh);
  const spd=projectileSpeed||6;
  const frames=Math.min(42, d.dist/spd);
  const tx=s.x+(s.vx||0)*frames*scale;
  const ty=s.y+(s.vy||0)*frames*scale;
  const ld=wrapDelta(tx,ty,e.x,e.y,ew,eh);
  return Math.atan2(ld.dx,-ld.dy);
}

function enemyLeadPoint(e, s, ew, eh, scale, projectileSpeed) {
  const d=enemyVecToPlayer(e,s,ew,eh);
  const spd=projectileSpeed||6;
  const frames=Math.min(42, d.dist/spd);
  return {x:s.x+(s.vx||0)*frames*scale, y:s.y+(s.vy||0)*frames*scale};
}

function enemyAIContext(e, ec, s, ew, eh) {
  const ai=ec.ai||{},fire=ec.fire||{},weapon=WEAPON_MAP[fire.wpn]||null;
  return {
    e, ec, s, ew, eh, ai, fire, weapon,
    projectileSpeed:weapon?.spd||7,
    baseTurn:ec.turn??.06,
    d:enemyVecToPlayer(e,s,ew,eh)
  };
}

function enemyTurnToward(e, angle, turn) {
  e.a+=angDiff(e.a,angle)*turn;
}

function enemyThrustForward(e, ec, amount) {
  e.vx+=Math.sin(e.a)*ec.spd*amount;
  e.vy-=Math.cos(e.a)*ec.spd*amount;
}

function enemyThrustVector(e, ec, x, y, amount) {
  e.vx+=x*ec.spd*amount;
  e.vy+=y*ec.spd*amount;
}

function enemySetSpeedLimit(e, speed) {
  if(Number.isFinite(speed)&&speed>0)e.speedLimit=speed;
}

// Conditional anti-kite boost: if a tagged enemy spends sustained time at long range
// from the player, lift its speed cap slightly above the player's so it can close.
// Clears once back in close-fight range (hysteresis prevents flapping at the edge).
// Raw strings (not ENEMY_TYPES.*) because data/enemies.js loads after this file.
const PURSUIT_BOOST_TYPES=new Set(['fighter','destroyer','interceptor']);
const PURSUIT_BOOST_SPEED=5.4;
const PURSUIT_BOOST_FAR=280;
const PURSUIT_BOOST_NEAR=170;
const PURSUIT_BOOST_ENGAGE_FRAMES=420;     // ~7s sustained at far range before boost engages
const PURSUIT_BOOST_MIN_ACTIVE_FRAMES=360; // ~6s minimum commit once engaged

function enemyTickPursuitBoost(e, s, ew, eh, type) {
  if(!PURSUIT_BOOST_TYPES.has(type)){
    if(e.pursuitBoostActive)e.pursuitBoostActive=false;
    if(e.pursuitBoostFarTimer)e.pursuitBoostFarTimer=0;
    if(e.pursuitBoostActiveTimer)e.pursuitBoostActiveTimer=0;
    return;
  }
  const d=wrapDelta(s.x,s.y,e.x,e.y,ew,eh);
  const dist=Math.hypot(d.dx,d.dy);
  if(e.pursuitBoostActive){
    e.pursuitBoostActiveTimer=(e.pursuitBoostActiveTimer||0)+1;
    // Disengage only after minimum commit AND enemy has reached close range.
    if(e.pursuitBoostActiveTimer>=PURSUIT_BOOST_MIN_ACTIVE_FRAMES&&dist<=PURSUIT_BOOST_NEAR){
      e.pursuitBoostActive=false;
      e.pursuitBoostActiveTimer=0;
      e.pursuitBoostFarTimer=0;
    }
  }else{
    if(dist<=PURSUIT_BOOST_NEAR){
      e.pursuitBoostFarTimer=0;
    }else if(dist>=PURSUIT_BOOST_FAR){
      e.pursuitBoostFarTimer=(e.pursuitBoostFarTimer||0)+1;
      if(e.pursuitBoostFarTimer>=PURSUIT_BOOST_ENGAGE_FRAMES){
        e.pursuitBoostActive=true;
        e.pursuitBoostActiveTimer=0;
      }
    }
  }
}

function enemyApplySpeedLimit(e, fallback) {
  let speedLimit=Number.isFinite(e.speedLimit)&&e.speedLimit>0?e.speedLimit:fallback;
  if(e.pursuitBoostActive&&PURSUIT_BOOST_SPEED>speedLimit)speedLimit=PURSUIT_BOOST_SPEED;
  const es=Math.hypot(e.vx,e.vy);
  if(es>speedLimit){e.vx=e.vx/es*speedLimit;e.vy=e.vy/es*speedLimit;}
}

function enemyWeaponDefs(e) {
  const ids=Array.isArray(e?.weaponIds)?e.weaponIds:[];
  return ids.map(id=>WEAPON_MAP[id]||null);
}

function enemyWeaponUsable(e, slot, wp) {
  if(!wp)return false;
  if(weaponHasAmmo(wp)&&(currentAmmoForSlot(e,slot)??0)<=0)return false;
  if(wp.energyCost!==undefined&&e.energy!==undefined&&e.energy<wp.energyCost)return false;
  return true;
}

function enemyCanFireAnyWeapon(e) {
  return enemyWeaponDefs(e).some((wp,slot)=>enemyWeaponUsable(e,slot,wp));
}

function enemyCanRecover(e) {
  if(!(Number.isFinite(e?.energyMax)&&e.energyMax>0))return false;
  return enemyWeaponDefs(e).some(wp=>wp&&wp.energyCost!==undefined&&!weaponHasAmmo(wp));
}

function tickEnemyEnergy(e) {
  if(!(Number.isFinite(e?.energyMax)&&e.energyMax>0))return;
  const regen=Math.max(0,e.energyRegenPerSec||0)/60;
  if(!Number.isFinite(e.energy))e.energy=e.energyMax;
  e.energy=Math.min(e.energyMax,Math.max(0,e.energy+regen));
}

function consumeEnemyWeaponCosts(e, slot, wp, shots=1) {
  if(!enemyWeaponUsable(e,slot,wp))return false;
  if(wp.energyCost!==undefined&&e.energy!==undefined)e.energy=Math.max(0,e.energy-wp.energyCost);
  if(weaponHasAmmo(wp))consumeAmmo(e,slot,Math.max(1,shots));
  return true;
}

function enemyDisengageStart(e, kind, ctx={}) {
  if(e.disengageKind!==kind){
    e.disengageDirX=null;
    e.disengageDirY=null;
  }
  e.disengaging=true;
  e.disengageKind=kind;
  if(Number.isFinite(e.disengageDirX)&&Number.isFinite(e.disengageDirY))return;
  let dx=0,dy=-1;
  if(ctx.surface){
    dy=-1;
    dx=(Math.random()-.5)*.45;
  }else if(ctx.s){
    const d=ctx.deltaFromPlayer?ctx.deltaFromPlayer(e):{dx:e.x-ctx.s.x,dy:e.y-ctx.s.y};
    dx=d.dx;dy=d.dy;
  }
  const len=Math.hypot(dx,dy)||1;
  e.disengageDirX=dx/len;
  e.disengageDirY=dy/len;
  e.disengagePhase=Math.random()*Math.PI*2;
  e.disengageWeave=Math.random()<.5?-1:1;
}

function enemyApplyDisengageMotion(e, ctx={}) {
  const dx=e.disengageDirX??0,dy=e.disengageDirY??-1;
  const px=-dy,py=dx;
  const wave=Math.sin((G.fr||0)*.075+(e.disengagePhase||0))*(e.disengageWeave||1);
  const accel=ctx.surface?.055:.045;
  e.vx+=(dx+px*wave*.32)*accel;
  e.vy+=(dy+py*wave*.32)*accel;
  e.a=Math.atan2(e.vx||dx,-(e.vy||dy));
}

function enemyOffscreen(e, ctx={}) {
  const cam=ctx.cam;
  if(!cam)return true;
  const z=cam.z||1,margin=(ctx.radius||e.r||24)+40;
  return e.x<cam.x-margin||e.x>cam.x+W/z+margin||e.y<cam.y-margin||e.y>cam.y+H/z+margin;
}

function enemyPastEncounterBoundary(e, ctx={}) {
  const r=ctx.radius||24,w=ctx.worldW||W,h=ctx.worldH||H;
  return e.x<-r||e.x>w+r||e.y<-r||e.y>h+r;
}

function enemyPastSurfaceBoundary(e, ctx={}) {
  const r=ctx.radius||24,top=(ctx.exitY??0)-r;
  return e.y<top;
}

function permanentDisengage(e, ctx={}) {
  enemyDisengageStart(e,'permanent',ctx);
  for(const w of e.weapons||[]){
    if(!w)continue;
    w.pulsesLeft=0;
    w.misLeft=0;
  }
  enemyApplyDisengageMotion(e,ctx);
  const past=ctx.surface?enemyPastSurfaceBoundary(e,ctx):enemyPastEncounterBoundary(e,ctx);
  if(past&&enemyOffscreen(e,ctx))e.alive=false;
}

function tempDisengage(e, ctx={}) {
  enemyDisengageStart(e,'temp',ctx);
  enemyApplyDisengageMotion(e,ctx);
  if(Number.isFinite(e.energyMax)&&e.energy>=e.energyMax*.2){
    e.disengaging=false;
    e.disengageKind=null;
  }
}

function enemyTickDisengage(e, ctx={}) {
  tickEnemyEnergy(e);
  if(e.disengaging&&e.disengageKind==='temp'&&Number.isFinite(e.energyMax)&&e.energy>=e.energyMax*.2){
    e.disengaging=false;
    e.disengageKind=null;
    return false;
  }
  if(!e.disengaging&&!enemyCanFireAnyWeapon(e)){
    if(enemyCanRecover(e))tempDisengage(e,ctx);
    else permanentDisengage(e,ctx);
    return true;
  }
  if(e.disengaging){
    if(e.disengageKind==='permanent')permanentDisengage(e,ctx);
    else tempDisengage(e,ctx);
    return true;
  }
  return false;
}

function enemySteerTowardPoint(ctx, x, y, opts={}) {
  const {e,ec,ew,eh}=ctx;
  const d=wrapDelta(x,y,e.x,e.y,ew,eh);
  const dist=Math.hypot(d.dx,d.dy)||1;
  enemyTurnToward(e,Math.atan2(d.dx,-d.dy),(opts.turn??ctx.baseTurn)*(opts.turnMult??1));
  if(opts.speed)enemySetSpeedLimit(e,opts.speed);
  if(opts.forward!==false)enemyThrustForward(e,ec,opts.thrust??.05);
  return {dx:d.dx,dy:d.dy,dist,nx:d.dx/dist,ny:d.dy/dist};
}

function enemyPursue(ctx, opts={}) {
  const {e,ec,s,ai}=ctx,d=ctx.d;
  const cfg={...(ai.pursuit||{}),...opts};
  const flipFrames=cfg.flipFrames??120;
  if(e.pursuitDir==null)e.pursuitDir=Math.random()<.5?-1:1;
  if(e.pursuitFlipAt==null)e.pursuitFlipAt=G.fr+Math.floor(flipFrames*(.75+Math.random()*.5));
  if(flipFrames>0&&G.fr>=e.pursuitFlipAt){
    e.pursuitDir*=-1;
    e.pursuitFlipAt=G.fr+Math.floor(flipFrames*(.75+Math.random()*.5));
  }
  const frames=Math.min(cfg.maxLeadFrames??50,d.dist/(cfg.projectileSpeed||ctx.projectileSpeed||7));
  const tx=s.x+(s.vx||0)*frames*(cfg.lead??.25);
  const ty=s.y+(s.vy||0)*frames*(cfg.lead??.25);
  const ld=wrapDelta(tx,ty,e.x,e.y,ctx.ew,ctx.eh);
  const ldist=Math.hypot(ld.dx,ld.dy)||1;
  const weave=Math.sin(G.fr*(cfg.weaveRate??.035)+(e.eid||0)*.77+e.spin*5)*(cfg.weave??.5);
  const lateral=(cfg.offset??90)*(e.pursuitDir+weave*.45);
  const px=-ld.dy/ldist,py=ld.dx/ldist;
  if(cfg.tangent)enemyThrustVector(e,ec,-d.ny*e.pursuitDir,d.nx*e.pursuitDir,cfg.tangent);
  return enemySteerTowardPoint(ctx,tx+px*lateral,ty+py*lateral,{
    turnMult:cfg.turnMult??1,
    thrust:cfg.thrust??.05,
    speed:cfg.speed
  });
}

function enemyRangeKeep(ctx, opts) {
  const {e,ec,ai,d}=ctx;
  const preferred=opts.preferred??ai.preferred??220,band=opts.band??ai.band??40;
  if(d.dist>preferred+band)enemyPursue(ctx,{thrust:opts.close??.045});
  else if(d.dist<preferred-band){
    enemyTurnToward(e,d.ta,opts.turn??ec.turn??.04);
    enemyThrustVector(e,ec,-d.nx,-d.ny,opts.backoff??.05);
  }
  else{
    enemyTurnToward(e,d.ta,opts.turn??ec.turn??.04);
    const side=((e.orbitDir??=Math.random()<.5?-1:1));
    enemyThrustVector(e,ec,-d.ny*side,d.nx*side,opts.strafe??ai.strafe??.01);
  }
}

function enemyOrbit(ctx, opts) {
  const {e,ec,ai,d}=ctx;
  const jitter=opts.jitter?Math.sin(G.fr*.13+(e.eid||0)*.73+e.spin*8)*opts.jitter:0;
  const aim=d.ta+jitter*.55;
  const orbit=opts.orbit??ai.orbit??110,approach=opts.approach??ai.approach??145;
  const dir=(e.orbitDir??=Math.random()<.5?-1:1);
  if(d.dist>approach)enemyPursue(ctx,{thrust:opts.radial??ai.radial??.055});
  else{
    enemyTurnToward(e,aim,opts.turn??ec.turn??.1);
    const radial=(d.dist-orbit)/orbit;
    enemyThrustVector(e,ec,-d.ny*dir,d.nx*dir,opts.tangential??ai.tangential??.075);
    enemyThrustVector(e,ec,d.nx,d.ny,Math.max(-.045,Math.min(.045,radial*.035)));
  }
}

function enemyFighterAttackAim(e, ec, s, ew, eh, ai, lead, projectileSpeed) {
  const target=enemyLeadPoint(e,s,ew,eh,lead,projectileSpeed);
  const d=wrapDelta(target.x,target.y,e.x,e.y,ew,eh);
  const dist=Math.hypot(d.dx,d.dy)||1;
  const clearance=ai.passClearance??((typeof shipHitRadius==='function'?shipHitRadius(s):12)+ec.r+22);
  const side=(e.passSide??=Math.random()<.5?-1:1);
  const offset=clearance*Math.max(0,Math.min(1,(ai.avoidRange??170)/dist));
  const tx=target.x+(-d.dy/dist)*side*offset,ty=target.y+(d.dx/dist)*side*offset;
  const od=wrapDelta(tx,ty,e.x,e.y,ew,eh);
  return Math.atan2(od.dx,-od.dy);
}

const ENEMY_AI = {
  destroyer: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(enemyAIContext(e,ec,s,ew,eh),{preferred:150,band:34,close:.055,backoff:.045,strafe:.018});
    }
  },
  cruiser: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(enemyAIContext(e,ec,s,ew,eh),{preferred:330,band:48,close:.036,backoff:.058,strafe:.01});
    }
  },
  interceptor: {
    update(e, ec, s, ew, eh) {
      enemyOrbit(enemyAIContext(e,ec,s,ew,eh),{orbit:118,approach:150,tangential:.078,radial:.056});
    }
  },
  fighter: {
    update(e, ec, s, ew, eh) {
      const ctx=enemyAIContext(e,ec,s,ew,eh),d=ctx.d,ai=ctx.ai;
      const passRange=ai.passRange??58,commitRange=ai.commitRange??160,flybyRange=ai.flybyRange??125,resetRange=ai.resetRange??430,reengageRange=ai.reengageRange??330,minExtend=ai.minExtendFrames??48;
      const lead=ai.lead??.45,baseTurn=ctx.baseTurn;
      if(e.pass==null){e.pass=0;e.passTimer=0;e.passNear=Infinity;}
      e.passTimer++;
      const projectileSpeed=ctx.projectileSpeed;
      const attackAim=enemyFighterAttackAim(e,ec,s,ew,eh,ai,lead,projectileSpeed);
      if(e.pass===0){
        e.passNear=Math.min(e.passNear,d.dist);
        const crossed=d.dist<passRange||(e.prevFighterDist!=null&&d.dist>e.prevFighterDist+8&&e.passNear<flybyRange);
        if(d.dist<commitRange||crossed){e.pass=1;e.passTimer=0;e.passA=attackAim;}
      }else if(e.pass===1){
        if(d.dist>resetRange&&e.passTimer>minExtend){e.pass=2;e.passTimer=0;}
      }else if(e.pass===2&&d.dist>reengageRange&&Math.abs(angDiff(e.a,attackAim))<.24){
        e.pass=0;e.passTimer=0;e.passNear=d.dist;
      }
      if(e.pass===1){
        enemySetSpeedLimit(e,ai.extendSpd??5.7);
        enemyTurnToward(e,e.passA??e.a,baseTurn*(ai.extendTurn??.035));
        enemyThrustForward(e,ec,ai.extendThrust??.15);
      }else if(e.pass===2){
        enemySetSpeedLimit(e,ai.turnSpd??3.9);
        enemyTurnToward(e,attackAim,baseTurn*(ai.turnMult??1.45));
        enemyThrustForward(e,ec,ai.turnThrust??.04);
      }else{
        enemySetSpeedLimit(e,ai.attackSpd??5.2);
        if(d.dist>commitRange)enemyPursue(ctx,{thrust:ai.attackThrust??.13,speed:ai.attackSpd??5.2});
        else{
          enemyTurnToward(e,attackAim,baseTurn);
          enemyThrustForward(e,ec,ai.attackThrust??.13);
          if(d.dist<(ai.avoidRange??170))enemyThrustVector(e,ec,-d.ny*(e.passSide??1),d.nx*(e.passSide??1),ai.avoidThrust??.025);
        }
      }
      e.prevFighterDist=d.dist;
    }
  },
  drone: {
    update(e, ec, s, ew, eh) {
      enemyOrbit(enemyAIContext(e,ec,s,ew,eh),{orbit:86,approach:126,tangential:.09,radial:.065,jitter:ec.ai?.jitter??.55});
    }
  },
  carrier: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(enemyAIContext(e,ec,s,ew,eh),{preferred:345,band:64,close:.03,backoff:.052,strafe:.006});
    }
  },
  battleship: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(enemyAIContext(e,ec,s,ew,eh),{preferred:390,band:70,close:.022,backoff:.04,strafe:.004});
    }
  }
};
