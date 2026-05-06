'use strict';

const OBJECTIVE_TYPE_IDS = {
  CAVE_REACTOR: 'cave_reactor',
  SURFACE_TARGETS: 'surface_targets',
  CIV_RESIDENCES: 'civ_residences',
  CIV_INFRASTRUCTURE: 'civ_infrastructure',
  HBASE: 'hbase',
};

const OBJECTIVE_TYPES = [
  {id:OBJECTIVE_TYPE_IDS.CAVE_REACTOR, scope:'planet', name:'REACTOR DESTROYED'},
  {id:OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, scope:'planet', name:'SURFACE TARGETS'},
  {id:OBJECTIVE_TYPE_IDS.CIV_RESIDENCES, scope:'planet', name:'RESIDENCES'},
  {id:OBJECTIVE_TYPE_IDS.CIV_INFRASTRUCTURE, scope:'planet', name:'INFRASTRUCTURE'},
  {id:OBJECTIVE_TYPE_IDS.HBASE, scope:'system', name:'HOSTILE BASE'},
];

const OBJECTIVE_TYPE_MAP = Object.fromEntries(OBJECTIVE_TYPES.map(o => [o.id, o]));
Object.assign(OBJECTIVE_TYPES, OBJECTIVE_TYPE_MAP);

function assertObjectiveRegistry() {
  const ids = new Set(Object.values(OBJECTIVE_TYPE_IDS));
  if(Object.keys(OBJECTIVE_TYPE_MAP).length !== OBJECTIVE_TYPES.length) throw new Error('Duplicate objective type id in OBJECTIVE_TYPES');
  for(const o of OBJECTIVE_TYPES) {
    if(!ids.has(o.id)) throw new Error(`Objective type ${o.id} is missing from OBJECTIVE_TYPE_IDS`);
    if(o.scope !== 'planet' && o.scope !== 'system') throw new Error(`Objective type ${o.id} has unknown scope ${o.scope}`);
  }
}
assertObjectiveRegistry();
