'use strict';

// AI behavior per enemy type. Movement steers by role; firing discipline lives in encounter-enemies.js.
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

const ENEMY_TYPES = {
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
      const passRange=ai.passRange??72,resetRange=ai.resetRange??185;
      if(e.pass==null)e.pass=0;
      if(e.pass===0&&d.dist<passRange)e.pass=1;
      else if(e.pass===1&&d.dist>resetRange)e.pass=2;
      else if(e.pass===2&&Math.abs(angDiff(e.a,d.ta))<.32)e.pass=0;
      const aim=e.pass===0?enemyLeadAngle(e,s,ew,eh,ai.lead??.35,WEAPON_MAP[ec.fire.wpn]?.spd||7):d.ta;
      enemyTurnToward(e,aim,(ec.turn??.06)*(e.pass===1?.16:1));
      enemyThrustForward(e,ec,e.pass===2?.065:.085);
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
