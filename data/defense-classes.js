'use strict';

// Defense type IDs describe stationary combat behavior. Class IDs describe concrete emplacements.
const DEFENSE_TYPES = {
  TURRET: 'turret',
};

const DEFENSE_CLASS_IDS = {
  CAVE_TURRET: 'cave-turret',
  HBASE_TURRET: 'hbase-turret',
  SURFACE_SENTINEL: 'surface-sentinel',
};

const DEFENSE_CLASSES = [
  {
    id:DEFENSE_CLASS_IDS.CAVE_TURRET,
    className:'Cave Turret', type:DEFENSE_TYPES.TURRET, typeName:'Turret',
    name:'CAVE TURRET',
    col:'#f44', col2:'#ff8800', sc:250,
    hull:{angle:'combat', boundsR:13, parts:[{kind:'circle', x:0, y:0, r:8}]},
    defense:{hp:10, r:13, turn:.04, fire:{wpn:'mass driver', offset:15, arc:Math.PI}},
  },
  {
    id:DEFENSE_CLASS_IDS.HBASE_TURRET,
    className:'Hostile Base Turret', type:DEFENSE_TYPES.TURRET, typeName:'Turret',
    name:'HOSTILE BASE TURRET',
    col:'#f44', col2:'#ff8800', sc:250,
    hull:{angle:'combat', boundsR:10, parts:[{kind:'circle', x:0, y:0, r:8}]},
    defense:{hp:10, r:10, turn:.04, fire:{wpn:'mass driver', offset:15, arc:Math.PI}},
  },
  {
    id:DEFENSE_CLASS_IDS.SURFACE_SENTINEL,
    className:'Sentinel', type:DEFENSE_TYPES.TURRET, typeName:'Turret',
    name:'SENTINEL SURFACE TURRET',
    col:'#f44', col2:'#ff8800', sc:180,
    hull:{angle:'combat', boundsR:10, parts:[{kind:'circle', x:0, y:0, r:8}]},
    defense:{hp:20, r:10, groundOffset:9, turn:.045, fire:{wpn:'railgun', offset:13, arc:Math.PI, senseRange:520, cdJitter:45}},
  },
];

const DEFENSE_CLASS_MAP = Object.fromEntries(DEFENSE_CLASSES.map(d => [d.id, d]));
const DEFENSE_CLASSES_BY_TYPE = DEFENSE_CLASSES.reduce((out, d) => {
  (out[d.type] ??= []).push(d);
  return out;
}, {});
Object.assign(DEFENSE_CLASSES, DEFENSE_CLASS_MAP);

function assertDefenseRegistry() {
  const typeIds = new Set(Object.values(DEFENSE_TYPES));
  const classIds = new Set(Object.values(DEFENSE_CLASS_IDS));
  if(Object.keys(DEFENSE_CLASS_MAP).length !== DEFENSE_CLASSES.length) throw new Error('Duplicate defense class id in DEFENSE_CLASSES');
  for(const d of DEFENSE_CLASSES) {
    if(!classIds.has(d.id)) throw new Error(`Defense class ${d.id} is missing from DEFENSE_CLASS_IDS`);
    if(!typeIds.has(d.type)) throw new Error(`Defense class ${d.id} has unknown type ${d.type}`);
    if(!WEAPON_MAP[d.defense.fire.wpn]) throw new Error(`Defense class ${d.id} references unknown weapon ${d.defense.fire.wpn}`);
  }
  for(const type of typeIds) if(!DEFENSE_CLASSES_BY_TYPE[type]?.length) throw new Error(`Defense type ${type} has no classes`);
}
assertDefenseRegistry();

function defenseClassForType(type) {
  const classes = DEFENSE_CLASSES_BY_TYPE[type];
  if(!classes?.length) throw new Error(`Unknown defense type: ${type}`);
  return classes[0];
}

function defenseSpawnDef(typeOrClass, rng = null) {
  if(DEFENSE_CLASS_MAP[typeOrClass]) return DEFENSE_CLASS_MAP[typeOrClass];
  const classes = DEFENSE_CLASSES_BY_TYPE[typeOrClass];
  if(!classes?.length) throw new Error(`Unknown defense type/class for spawn: ${typeOrClass}`);
  const roll = rng ? rng.int(0, classes.length - 1) : Math.floor(Math.random() * classes.length);
  return classes[roll];
}

function defenseDef(defenseOrClass) {
  if(defenseOrClass && typeof defenseOrClass === 'object') {
    if(defenseOrClass.t) return defenseDef(defenseOrClass.t);
  }
  const def = DEFENSE_CLASS_MAP[defenseOrClass] || DEFENSE_CLASSES_BY_TYPE[defenseOrClass]?.[0];
  if(!def) throw new Error(`Unknown defense class: ${defenseOrClass}`);
  return def;
}

function defenseRadius(d) {
  return defenseDef(d).defense.r;
}

function defenseColor(d) {
  return defenseDef(d).col;
}

function defenseHullAngle(d, def) {
  if(def.hull?.angle === 'combat') return d.a;
  return 0;
}

function defenseHullWorld(d, def = defenseDef(d)) {
  const h = def.hull || {boundsR:def.defense.r, parts:[{kind:'circle', x:0, y:0, r:def.defense.r}]};
  return {x:d.x, y:d.y, a:defenseHullAngle(d,def), scale:1, parts:h.parts, boundsR:h.boundsR ?? def.defense.r};
}

function defenseBeamTarget(d, idx, kind = 'defense') {
  const h = defenseHullWorld(d);
  return {x:d.x, y:d.y, r:h.boundsR, hull:h, beamPad:beamMotionPadding(d), kind, idx};
}
