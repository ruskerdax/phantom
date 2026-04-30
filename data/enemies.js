'use strict';

// Enemy role/type IDs describe battlefield behavior and are used by fleet composition rolls.
// Enemy class IDs describe concrete hull classes; spawned enemies store the class ID in `t`.
// fire.mode: 'aim' = angles spread around target; 'spin' = angles evenly distributed from e.spin.
// ai.pursuit tunes long-range closing: lead predicts the player, offset/weave create lateral lanes,
// flipFrames controls lane changes, tangent adds side pressure, and thrust/turnMult/speed shape motion.
const ENEMY_TYPES = {
  DESTROYER: 'destroyer',
  CRUISER: 'cruiser',
  INTERCEPTOR: 'interceptor',
  FIGHTER: 'fighter',
  DRONE: 'drone',
  CARRIER: 'carrier',
  BATTLESHIP: 'battleship',
};

const ENEMY_CLASS_IDS = {
  MORRIGAN: 'morrigan',
  CALYPSO: 'calypso',
  LANCER: 'lancer',
  ARROW: 'arrow',
  SPARK: 'spark',
  ATLAS: 'atlas',
  ROBINSON: 'robinson',
};

function enemyHullDef(def) {
  return def.hull || {angle:'spin', boundsR:def.enc.r, parts:[{kind:'circle', x:0, y:0, r:def.enc.r}]};
}

function enemyHullAngle(e, def) {
  const mode=enemyHullDef(def).angle;
  if(mode==='flight')return flightAngle(e);
  if(mode==='combat')return combatFacingAngle(e);
  if(mode==='none')return 0;
  return e.spin||0;
}

function enemyHullScale(e, def) {
  return actorScale(e,def,enemyHullDef(def));
}

function enemyHullWorld(e, def=enemyDef(e.t)) {
  const h=enemyHullDef(def),scale=enemyHullScale(e,def);
  return {x:e.x, y:e.y, a:enemyHullAngle(e,def), scale, parts:h.parts, boundsR:(h.boundsR??def.enc.r)*scale};
}

function enemyCollisionRadius(e) {
  return enemyHullWorld(e).boundsR;
}

function enemyDisplayRadius(typeOrClass) {
  const def=enemyDisplayDef(typeOrClass),h=enemyHullDef(def),scale=actorScale(null,def,h);
  return (h.boundsR??def.enc.r)*scale;
}

function enemyPointHit(e, x, y, pad=0) {
  const h=enemyHullWorld(e);
  if(Math.hypot(x-e.x,y-e.y)>h.boundsR+pad)return false;
  return hullPointHit(h,x,y,pad);
}

function enemyCircleHit(e, x, y, r) {
  const h=enemyHullWorld(e);
  if(Math.hypot(x-e.x,y-e.y)>h.boundsR+r)return false;
  return hullCircleHit(h,x,y,r);
}

function enemyBeamTarget(e, idx) {
  const h=enemyHullWorld(e);
  return {x:e.x, y:e.y, r:h.boundsR, hull:h, beamPad:beamMotionPadding(e), kind:'enemy', idx};
}

function withEnemyBodyScale(def, e, drawFn) {
  return withActorBodyScale(e,def,enemyHullDef(def),drawFn);
}

function drawEnemyHull(def) {
  drawHullParts(enemyHullDef(def));
}

function drawEnemyHealthBar(e, col, offset=8, height=4) {
  const r=enemyCollisionRadius(e);
  cx.fillStyle='#333';cx.fillRect(-r,-r-offset,r*2,height);
  cx.fillStyle=col;cx.fillRect(-r,-r-offset,r*2*(e.hp/e.mhp),height);
}

const ENEMY_CLASSES = [
  {
    id: ENEMY_CLASS_IDS.MORRIGAN,
    className:'Morrigan', type:ENEMY_TYPES.DESTROYER, typeName:'Destroyer',
    name:'MORRIGAN-CLASS DESTROYER',
    col:'#ffaa33', col2:'#ff7700',
    sc:300, energy:true, spinRate:0,
    hull:{angle:'combat', boundsR:19, parts:[{kind:'poly', pts:[[0,-18],[-14,2],[-10,12],[10,12],[14,2]]}]},
    enc:{cnt:1, hp:7, spd:2.5, turn:.05, r:13, col:'#ffaa33', col2:'#ff7700',
      ai:{preferred:150, band:34, strafe:.018,
        pursuit:{lead:.25, offset:85, weave:.7, flipFrames:110, thrust:.052, turnMult:1}},
      fire:{wpn:'mass driver', mode:'aim', count:2, spread:.18, offset:16, minRange:70, maxRange:240, arc:.8}},
    drawEnc(e){
      const ec=this.enc,a=combatFacingAngle(e);
      cx.save();cx.translate(e.x,e.y);cx.rotate(a);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      withEnemyBodyScale(this,e,()=>{drawEnemyHull(this);cx.beginPath();cx.moveTo(-6,-6);cx.lineTo(-6,-14);cx.moveTo(0,-8);cx.lineTo(0,-16);cx.moveTo(6,-6);cx.lineTo(6,-14);cx.stroke();});
      if(e.hp<e.mhp){cx.save();cx.rotate(-a);drawEnemyHealthBar(e,ec.col);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_CLASS_IDS.CALYPSO,
    className:'Calypso', type:ENEMY_TYPES.CRUISER, typeName:'Cruiser',
    name:'CALYPSO-CLASS CRUISER',
    col:'#aaccff', col2:'#5588dd',
    sc:280, energy:true, spinRate:0,
    hull:{angle:'spin', boundsR:15, parts:[{kind:'rect', x:0, y:0, w:26, h:10.4}]},
    enc:{cnt:1, hp:12, spd:1.5, turn:.04, r:13, col:'#aaccff', col2:'#5588dd',
      ai:{preferred:330, band:48, strafe:.01,
        pursuit:{lead:.35, offset:140, weave:.45, flipFrames:170, thrust:.035, turnMult:.9, tangent:.012}},
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:16, minRange:210, maxRange:560, arc:.45}},
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      withEnemyBodyScale(this,e,()=>drawEnemyHull(this));
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);drawEnemyHealthBar(e,ec.col);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_CLASS_IDS.LANCER,
    className:'Lancer', type:ENEMY_TYPES.INTERCEPTOR, typeName:'Interceptor',
    name:'LANCER-CLASS INTERCEPTOR',
    col:'#ff66cc', col2:'#aa3399',
    sc:160, energy:false, spinRate:.05,
    hull:{angle:'spin', boundsR:11, parts:[{kind:'poly', pts:[[0,-9],[-7.2,5.4],[7.2,5.4]]}]},
    enc:{cnt:1, hp:2, spd:3.5, turn:.09, r:9, col:'#ff66cc', col2:'#aa3399',
      ai:{orbit:118, approach:150, tangential:.078, radial:.056,
        pursuit:{lead:.45, offset:105, weave:.9, flipFrames:80, thrust:.056, turnMult:1.05, tangent:.03}},
      fire:{wpn:'mass driver', mode:'aim', count:1, spread:0, offset:10, minRange:35, maxRange:180, arc:1.05}},
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      withEnemyBodyScale(this,e,()=>drawEnemyHull(this));
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);drawEnemyHealthBar(e,ec.col);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_CLASS_IDS.ARROW,
    className:'Arrow', type:ENEMY_TYPES.FIGHTER, typeName:'Fighter',
    name:'ARROW-CLASS FIGHTER',
    col:'#ffdd33', col2:'#ff8800',
    sc:160, energy:false, spinRate:0, scale:.7,
    hull:{angle:'flight', boundsR:16, parts:[{kind:'poly', pts:[[0,-12],[-4,-2],[-14,4],[-10,8],[-4,6],[0,10],[4,6],[10,8],[14,4],[4,-2]]}]},
    enc:{cnt:1, hp:2, spd:3.5, turn:.06, r:9, col:'#ffdd33', col2:'#ff8800',
      ai:{passRange:58, commitRange:170, flybyRange:125, resetRange:430, reengageRange:330, minExtendFrames:48, lead:.45, attackSpd:5.2, extendSpd:5.7, turnSpd:3.9, attackThrust:.13, extendThrust:.15, turnThrust:.04, avoidRange:210, passClearance:70, avoidThrust:.04,
        pursuit:{lead:.65, offset:150, weave:.55, flipFrames:140, thrust:.13, turnMult:1, speed:5.2}},
      fire:{wpn:'mass driver', mode:'aim', count:1, spread:0, offset:10, minRange:20, maxRange:155, arc:1.15, lead:.42, passOnly:true}},
    drawEnc(e){
      const ec=this.enc,a=flightAngle(e);
      cx.save();cx.translate(e.x,e.y);cx.rotate(a);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=10;cx.lineWidth=1.5;
      withEnemyBodyScale(this,e,()=>drawEnemyHull(this));
      if(e.hp<e.mhp){cx.save();cx.rotate(-a);drawEnemyHealthBar(e,ec.col);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_CLASS_IDS.SPARK,
    className:'Spark', type:ENEMY_TYPES.DRONE, typeName:'Drone',
    name:'SPARK-CLASS DRONE',
    col:'#88ffaa', col2:'#22aa55',
    sc:60, energy:false, spinRate:.1,
    hull:{angle:'spin', boundsR:8, parts:[{kind:'circle', x:0, y:0, r:5}]},
    enc:{cnt:1, hp:1, spd:2.0, turn:.12, r:7, col:'#88ffaa', col2:'#22aa55',
      ai:{orbit:86, approach:126, tangential:.09, radial:.065, jitter:.55,
        pursuit:{lead:.25, offset:75, weave:1, flipFrames:70, thrust:.065, turnMult:1.05, tangent:.035}},
      fire:{wpn:'mining laser', mode:'aim', count:1, spread:0, offset:8, minRange:10, maxRange:145, arc:1.45}},
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=8;cx.lineWidth=1.2;
      withEnemyBodyScale(this,e,()=>{drawEnemyHull(this);for(let k=0;k<3;k++){const a=k*Math.PI*2/3;cx.beginPath();cx.moveTo(Math.cos(a)*5,Math.sin(a)*5);cx.lineTo(Math.cos(a)*8,Math.sin(a)*8);cx.stroke();}});
      if(e.hp<e.mhp){cx.save();cx.rotate(-e.spin);drawEnemyHealthBar(e,ec.col,7,3);cx.restore();}
      cx.restore();
    }
  },
  {
    id: ENEMY_CLASS_IDS.ATLAS,
    className:'Atlas', type:ENEMY_TYPES.CARRIER, typeName:'Carrier',
    name:'ATLAS-CLASS CARRIER',
    col:'#ddccaa', col2:'#998866',
    sc:600, energy:true, spinRate:0,
    hull:{angle:'spin', boundsR:24, parts:[
      {kind:'rect', x:0, y:0, w:48, h:19.2},
      {kind:'poly', pts:[[0,-22],[-7,-16],[-7,16],[0,20],[7,16],[7,-16]]},
      {kind:'poly', pts:[[-7,-10],[-19,-4],[-19,10],[-7,14]]},
      {kind:'poly', pts:[[7,-10],[19,-4],[19,10],[7,14]]}
    ]},
    enc:{cnt:1, hp:48, spd:1.8, turn:.03, r:24, col:'#ddccaa', col2:'#998866',
      ai:{preferred:345, band:64, strafe:.006,
        pursuit:{lead:.2, offset:110, weave:.35, flipFrames:210, thrust:.028, turnMult:.85, tangent:.008}},
      fire:{wpn:'railgun', mode:'aim', count:1, spread:0, offset:28, minRange:0, maxRange:260, arc:.85},
      launch:{type:ENEMY_TYPES.DRONE, cd:360, maxActive:3, radius:38}},
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=12;cx.lineWidth=2;
      withEnemyBodyScale(this,e,()=>drawEnemyHull(this));
      cx.save();cx.rotate(-e.spin);
      drawEnemyHealthBar(e,ec.col);
      cx.restore();
      cx.restore();
    }
  },
  {
    id: ENEMY_CLASS_IDS.ROBINSON,
    className:'Robinson', type:ENEMY_TYPES.BATTLESHIP, typeName:'Battleship',
    name:'ROBINSON-CLASS BATTLESHIP',
    col:'#ff5544', col2:'#aa1100',
    sc:1000, energy:true, spinRate:0,
    hull:{angle:'spin', boundsR:29, parts:[
      {kind:'rect', x:0, y:0, w:26, h:26},
      {kind:'rect', x:-20.8, y:0, w:10.4, h:15.6},
      {kind:'rect', x:20.8, y:0, w:10.4, h:15.6}
    ]},
    enc:{cnt:1, hp:80, spd:1.4, turn:.03, r:26, col:'#ff5544', col2:'#aa1100',
      ai:{preferred:390, band:70, strafe:.004,
        pursuit:{lead:.3, offset:130, weave:.25, flipFrames:240, thrust:.021, turnMult:.8, tangent:.006}},
      fire:{wpn:'particle accelerator', mode:'aim', count:1, spread:0, offset:30, minRange:230, maxRange:425, arc:.32}},
    drawEnc(e){
      const ec=this.enc;
      cx.save();cx.translate(e.x,e.y);cx.rotate(e.spin);
      cx.strokeStyle=ec.col;cx.shadowColor=ec.col;cx.shadowBlur=14;cx.lineWidth=2;
      withEnemyBodyScale(this,e,()=>drawEnemyHull(this));
      cx.save();cx.rotate(-e.spin);
      drawEnemyHealthBar(e,ec.col);
      cx.restore();
      cx.restore();
    }
  }
];

const ENEMY_CLASS_MAP = Object.fromEntries(ENEMY_CLASSES.map(e => [e.id, e]));
const ENEMY_CLASSES_BY_TYPE = ENEMY_CLASSES.reduce((out, e) => {
  (out[e.type] ??= []).push(e);
  return out;
}, {});
Object.assign(ENEMY_CLASSES, ENEMY_CLASS_MAP);

function assertEnemyRegistry() {
  const typeIds=new Set(Object.values(ENEMY_TYPES));
  const classIds=new Set(Object.values(ENEMY_CLASS_IDS));
  if(Object.keys(ENEMY_CLASS_MAP).length!==ENEMY_CLASSES.length)throw new Error('Duplicate enemy class id in ENEMY_CLASSES');
  for(const e of ENEMY_CLASSES){
    if(!classIds.has(e.id))throw new Error(`Enemy class ${e.id} is missing from ENEMY_CLASS_IDS`);
    if(!typeIds.has(e.type))throw new Error(`Enemy class ${e.id} has unknown type ${e.type}`);
    if(typeof ENEMY_AI!=='undefined'&&!ENEMY_AI[e.type])throw new Error(`Enemy type ${e.type} has no AI behavior`);
  }
  for(const type of typeIds)if(!ENEMY_CLASSES_BY_TYPE[type]?.length)throw new Error(`Enemy type ${type} has no classes`);
}
assertEnemyRegistry();

function enemyClassForType(type) {
  const classes=ENEMY_CLASSES_BY_TYPE[type];
  if(!classes?.length)throw new Error(`Unknown enemy type: ${type}`);
  return classes[0];
}

function enemyClassIdForType(type) {
  return enemyClassForType(type).id;
}

function enemySpawnDef(typeOrClass) {
  if(ENEMY_CLASS_MAP[typeOrClass])return ENEMY_CLASS_MAP[typeOrClass];
  if(typeof typeOrClass==='number'&&ENEMY_CLASSES[typeOrClass])return ENEMY_CLASSES[typeOrClass];
  const classes=ENEMY_CLASSES_BY_TYPE[typeOrClass];
  if(!classes?.length)throw new Error(`Unknown enemy type/class for spawn: ${typeOrClass}`);
  return classes[Math.floor(Math.random()*classes.length)];
}

function enemyDef(classId) {
  const def=ENEMY_CLASS_MAP[classId] || (typeof classId==='number' ? ENEMY_CLASSES[classId] : null);
  if(!def)throw new Error(`Unknown enemy class: ${classId}`);
  return def;
}

function enemyDisplayDef(typeOrClass) {
  if(ENEMY_CLASS_MAP[typeOrClass])return ENEMY_CLASS_MAP[typeOrClass];
  if(typeof typeOrClass==='number'&&ENEMY_CLASSES[typeOrClass])return ENEMY_CLASSES[typeOrClass];
  return enemyClassForType(typeOrClass);
}

function enemyTypeIndex(typeOrClass) {
  return ENEMY_CLASSES.indexOf(enemyDisplayDef(typeOrClass));
}
