'use strict';

// Surface enemy type IDs describe behavior. Class IDs describe concrete surface units.
// Spawned surface enemies store their class ID in `t`, matching encounter enemies.
const SURFACE_ENEMY_TYPES = {
  SKIMMER: 'skimmer',
  DIVER: 'diver',
};

const SURFACE_ENEMY_CLASS_IDS = {
  GLIDER: 'surface-glider',
  PIERCER: 'surface-piercer',
};

const SURFACE_ENEMY_CLASSES = [
  {
    id:SURFACE_ENEMY_CLASS_IDS.GLIDER,
    className:'Glider', type:SURFACE_ENEMY_TYPES.SKIMMER, typeName:'Skimmer',
    name:'GLIDER SURFACE SKIMMER',
    col:'#ffaa33', col2:'#ff7700', sc:220,
    hull:{angle:'flight', boundsR:11, parts:[{kind:'poly', pts:[[12,0],[3,-7],[-10,-5],[-12,5],[3,7]]}]},
    surf:{hp:2, r:11, spd:2.8, fire:{wpn:'mass driver', offset:13, arc:Math.PI, senseRange:460}},
    drawSurface(e){drawSurfaceHullEnemy(this,e);}
  },
  {
    id:SURFACE_ENEMY_CLASS_IDS.PIERCER,
    className:'Piercer', type:SURFACE_ENEMY_TYPES.DIVER, typeName:'Diver',
    name:'PIERCER SURFACE DIVER',
    col:'#ff66cc', col2:'#aa3399', sc:220,
    hull:{angle:'flight', boundsR:12, parts:[{kind:'poly', pts:[[0,-12],[-9,8],[0,4],[9,8]]}]},
    surf:{hp:2, r:12, spd:3.8, fire:{wpn:'mass driver', offset:13, arc:Math.PI, senseRange:460}},
    drawSurface(e){drawSurfaceHullEnemy(this,e);}
  },
];

const SURFACE_ENEMY_CLASS_MAP = Object.fromEntries(SURFACE_ENEMY_CLASSES.map(e => [e.id, e]));
const SURFACE_ENEMY_CLASSES_BY_TYPE = SURFACE_ENEMY_CLASSES.reduce((out, e) => {
  (out[e.type] ??= []).push(e);
  return out;
}, {});
Object.assign(SURFACE_ENEMY_CLASSES, SURFACE_ENEMY_CLASS_MAP);

function assertSurfaceEnemyRegistry() {
  const typeIds = new Set(Object.values(SURFACE_ENEMY_TYPES));
  const classIds = new Set(Object.values(SURFACE_ENEMY_CLASS_IDS));
  if(Object.keys(SURFACE_ENEMY_CLASS_MAP).length !== SURFACE_ENEMY_CLASSES.length) throw new Error('Duplicate surface enemy class id in SURFACE_ENEMY_CLASSES');
  for(const e of SURFACE_ENEMY_CLASSES) {
    if(!classIds.has(e.id)) throw new Error(`Surface enemy class ${e.id} is missing from SURFACE_ENEMY_CLASS_IDS`);
    if(!typeIds.has(e.type)) throw new Error(`Surface enemy class ${e.id} has unknown type ${e.type}`);
    if(!WEAPON_MAP[e.surf.fire.wpn]) throw new Error(`Surface enemy class ${e.id} references unknown weapon ${e.surf.fire.wpn}`);
  }
  for(const type of typeIds) if(!SURFACE_ENEMY_CLASSES_BY_TYPE[type]?.length) throw new Error(`Surface enemy type ${type} has no classes`);
}
assertSurfaceEnemyRegistry();

function surfaceEnemyClassForType(type) {
  const classes = SURFACE_ENEMY_CLASSES_BY_TYPE[type];
  if(!classes?.length) throw new Error(`Unknown surface enemy type: ${type}`);
  return classes[0];
}

function surfaceEnemyClassIdForType(type) {
  return surfaceEnemyClassForType(type).id;
}

function surfaceEnemySpawnDef(typeOrClass, rng = null) {
  if(SURFACE_ENEMY_CLASS_MAP[typeOrClass]) return SURFACE_ENEMY_CLASS_MAP[typeOrClass];
  const classes = SURFACE_ENEMY_CLASSES_BY_TYPE[typeOrClass];
  if(!classes?.length) throw new Error(`Unknown surface enemy type/class for spawn: ${typeOrClass}`);
  const roll = rng ? rng.int(0, classes.length - 1) : Math.floor(Math.random() * classes.length);
  return classes[roll];
}

function surfaceEnemyDef(enemyOrClass) {
  if(enemyOrClass && typeof enemyOrClass === 'object') {
    if(enemyOrClass.t) return surfaceEnemyDef(enemyOrClass.t);
    if(enemyOrClass.kind) return surfaceEnemyClassForType(enemyOrClass.kind);
  }
  const def = SURFACE_ENEMY_CLASS_MAP[enemyOrClass] || SURFACE_ENEMY_CLASSES_BY_TYPE[enemyOrClass]?.[0];
  if(!def) throw new Error(`Unknown surface enemy class: ${enemyOrClass}`);
  return def;
}

function surfaceEnemyDisplayDef(typeOrClass) {
  if(SURFACE_ENEMY_CLASS_MAP[typeOrClass]) return SURFACE_ENEMY_CLASS_MAP[typeOrClass];
  return surfaceEnemyClassForType(typeOrClass);
}

function surfaceEnemyRadius(e) {
  return surfaceEnemyDef(e).surf.r;
}

function surfaceEnemyColor(e) {
  return surfaceEnemyDef(e).col;
}

function surfaceEnemyHullAngle(e, def) {
  if(def.hull?.angle === 'combat') return e.a;
  if(def.hull?.angle === 'flight') return e.a;
  return 0;
}

function surfaceEnemyHullWorld(e, def = surfaceEnemyDef(e)) {
  const h = def.hull || {boundsR:def.surf.r, parts:[{kind:'circle', x:0, y:0, r:def.surf.r}]};
  return {x:e.x, y:e.y, a:surfaceEnemyHullAngle(e,def), scale:1, parts:h.parts, boundsR:h.boundsR ?? def.surf.r};
}

function surfaceEnemyBeamTarget(e, idx) {
  const h = surfaceEnemyHullWorld(e);
  return {x:e.x, y:e.y, r:h.boundsR, hull:h, beamPad:beamMotionPadding(e), kind:'enemy', idx};
}

function drawSurfaceHullEnemy(def, e) {
  const h = surfaceEnemyHullWorld(e, def);
  cx.save(); cx.translate(e.x, e.y); cx.rotate(h.a);
  cx.strokeStyle = def.col; cx.shadowColor = def.col; cx.shadowBlur = 8; cx.lineWidth = 1.5;
  drawHullParts(h);
  cx.restore();
}

function drawSurfaceEnemy(e) {
  const def = surfaceEnemyDef(e);
  def.drawSurface(e);
}
