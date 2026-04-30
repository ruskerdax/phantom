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

function enemyApplySpeedLimit(e, fallback) {
  const speedLimit=Number.isFinite(e.speedLimit)&&e.speedLimit>0?e.speedLimit:fallback;
  const es=Math.hypot(e.vx,e.vy);
  if(es>speedLimit){e.vx=e.vx/es*speedLimit;e.vy=e.vy/es*speedLimit;}
}

function enemyRangeKeep(e, ec, s, ew, eh, opts) {
  const d=enemyVecToPlayer(e,s,ew,eh),ai=ec.ai||{};
  const preferred=opts.preferred??ai.preferred??220,band=opts.band??ai.band??40;
  enemyTurnToward(e,d.ta,ec.turn??opts.turn??.04);
  if(d.dist>preferred+band)enemyThrustForward(e,ec,opts.close??.045);
  else if(d.dist<preferred-band)enemyThrustVector(e,ec,-d.nx,-d.ny,opts.backoff??.05);
  else{
    const side=((e.orbitDir??=Math.random()<.5?-1:1));
    enemyThrustVector(e,ec,-d.ny*side,d.nx*side,opts.strafe??ai.strafe??.01);
  }
}

function enemyOrbit(e, ec, s, ew, eh, opts) {
  const d=enemyVecToPlayer(e,s,ew,eh),ai=ec.ai||{};
  const jitter=opts.jitter?Math.sin(G.fr*.13+(e.eid||0)*.73+e.spin*8)*opts.jitter:0;
  const aim=d.ta+jitter*.55;
  const orbit=opts.orbit??ai.orbit??110,approach=opts.approach??ai.approach??145;
  const dir=(e.orbitDir??=Math.random()<.5?-1:1);
  enemyTurnToward(e,aim,ec.turn??opts.turn??.1);
  if(d.dist>approach)enemyThrustVector(e,ec,d.nx,d.ny,opts.radial??ai.radial??.055);
  else{
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
      enemyRangeKeep(e,ec,s,ew,eh,{preferred:150,band:34,close:.055,backoff:.045,strafe:.018});
    }
  },
  cruiser: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(e,ec,s,ew,eh,{preferred:330,band:48,close:.036,backoff:.058,strafe:.01});
    }
  },
  interceptor: {
    update(e, ec, s, ew, eh) {
      enemyOrbit(e,ec,s,ew,eh,{orbit:118,approach:150,tangential:.078,radial:.056});
    }
  },
  fighter: {
    update(e, ec, s, ew, eh) {
      const d=enemyVecToPlayer(e,s,ew,eh),ai=ec.ai||{};
      const passRange=ai.passRange??58,commitRange=ai.commitRange??160,flybyRange=ai.flybyRange??125,resetRange=ai.resetRange??430,reengageRange=ai.reengageRange??330,minExtend=ai.minExtendFrames??48;
      const lead=ai.lead??.45,baseTurn=ec.turn??.06;
      if(e.pass==null){e.pass=0;e.passTimer=0;e.passNear=Infinity;}
      e.passTimer++;
      const projectileSpeed=WEAPON_MAP[ec.fire.wpn]?.spd||7;
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
        enemyTurnToward(e,attackAim,baseTurn);
        enemyThrustForward(e,ec,ai.attackThrust??.13);
        if(d.dist<(ai.avoidRange??170))enemyThrustVector(e,ec,-d.ny*(e.passSide??1),d.nx*(e.passSide??1),ai.avoidThrust??.025);
      }
      e.prevFighterDist=d.dist;
    }
  },
  drone: {
    update(e, ec, s, ew, eh) {
      enemyOrbit(e,ec,s,ew,eh,{orbit:86,approach:126,tangential:.09,radial:.065,jitter:ec.ai?.jitter??.55});
    }
  },
  carrier: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(e,ec,s,ew,eh,{preferred:345,band:64,close:.03,backoff:.052,strafe:.006});
    }
  },
  battleship: {
    update(e, ec, s, ew, eh) {
      enemyRangeKeep(e,ec,s,ew,eh,{preferred:390,band:70,close:.022,backoff:.04,strafe:.004});
    }
  }
};
