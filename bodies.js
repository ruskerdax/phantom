'use strict';

var BODIES = [];

const K_STAR_BASE = 500;
const K_STAR_WORLD_BASE = 6000;
const K_BODY_FACTOR = 0.02;

function bodyById(id){
  for(let i=0;i<BODIES.length;i++)if(BODIES[i].id === id)return BODIES[i];
  return null;
}

function bodyShortName(bodyId){
  const id = (bodyId ?? '').toString().trim().toLowerCase();
  if(!id) return 'hbase';
  if(id === 'hbase') return 'hbase';
  if(id === 'base') return 'base';
  if(id === 'slipgate') return 'slipgate';
  if(id === 'asteroid' || id === 'asteroid field' || id.startsWith('asteroid ')) return 'asteroid field';
  return id;
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

function hashBodyKey(str){
  let h=2166136261>>>0;
  for(let i=0;i<str.length;i++){
    h^=str.charCodeAt(i);
    h=Math.imul(h,16777619)>>>0;
  }
  return h>>>0;
}

function bodySurfaceCounts(body){
  const size=Math.max(1,Math.min(6,Math.round(body?.size||1)));
  const key=`${body?.id||'body'}|${body?.subtype||''}|${size}`;
  const rawSeed=hashBodyKey(key);
  const seed=typeof seedChild==='function'?seedChild(rawSeed,size):rawSeed;
  const rng=typeof mkRNG==='function'?mkRNG(seed):{int:(lo,hi)=>Math.floor((lo+hi)/2)};
  const nObs=rng.int(2+size,5+size);
  const nEn=rng.int(2+size,4+size);
  const nFu=rng.int(1+Math.floor(size/2),2+Math.floor(size/2));
  const rxHp=rng.int(24+size*10,48+size*14);
  return{nObs,nEn,nFu,rxHp};
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
