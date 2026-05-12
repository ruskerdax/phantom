'use strict';

var BODIES = [];

const K_STAR_BASE = 500;
const K_STAR_WORLD_BASE = 6000;
const K_BODY_FACTOR = 0.02;

function bodyById(id){
  for(let i=0;i<BODIES.length;i++)if(BODIES[i].id === id)return BODIES[i];
  return null;
}

function enterableBodies(){
  return BODIES.filter(b => b.kind === 'habitable' || b.kind === 'uninhabitable');
}

function planetsOf(parentId){
  return BODIES.filter(b => b.parentId === parentId);
}

function bodyChildren(id){
  return planetsOf(id);
}

function invalidateBodyOWPosCache(){
  for(const b of BODIES){
    b._cachedPos = null;
    b._cachedPosFr = -1;
  }
}

function bodyOWPos(body){
  if(!body)return{x:OW_W/2,y:OW_H/2};
  const fr = G?.owFr || 0;
  if(body._cachedPos && body._cachedPosFr === fr)return body._cachedPos;

  let out;
  if(body.parentId == null){
    out = {x:OW_W/2, y:OW_H/2};
  }else{
    const parent = bodyById(body.parentId);
    const p = parent ? bodyOWPos(parent) : {x:OW_W/2, y:OW_H/2};
    const orbit = body.orbit || {};
    const a = (orbit.a || 0) + fr * (orbit.spd || 0);
    const r = orbit.r || 0;
    out = {x:p.x + Math.cos(a) * r, y:p.y + Math.sin(a) * r};
  }

  body._cachedPos = out;
  body._cachedPosFr = fr;
  return out;
}

function bodyOWGravityVector(body, sx, sy){
  const p = bodyOWPos(body);
  const dx = p.x - sx;
  const dy = p.y - sy;
  const dist = Math.hypot(dx,dy) || 1;
  const K_STAR = K_STAR_BASE * (OW_W / K_STAR_WORLD_BASE);
  const K = body.kind === 'star' ? K_STAR : K_STAR * K_BODY_FACTOR * ((body.size * body.size) / 25);
  return {ax:dx * K / (dist * dist * dist), ay:dy * K / (dist * dist * dist)};
}
