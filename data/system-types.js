'use strict';

const SYSTEM_ARCHETYPES = [
  {id:'compact_rocky', weight:0.50, hu:[5,10], gas:[0,1]},
  {id:'solar_like', weight:0.30, hu:[3,6], gas:[2,5]},
  {id:'giant_heavy', weight:0.20, hu:[1,3], gas:[4,8]},
];

const SYSTEM_ARCHETYPE_MAP = Object.fromEntries(SYSTEM_ARCHETYPES.map(a => [a.id, a]));
Object.assign(SYSTEM_ARCHETYPES, SYSTEM_ARCHETYPE_MAP);

function rollSystemArchetype(rng){
  const roll = rng.next();
  let acc = 0;
  for(const archetype of SYSTEM_ARCHETYPES){
    acc += archetype.weight;
    if(roll <= acc) return archetype;
  }
  return SYSTEM_ARCHETYPES[SYSTEM_ARCHETYPES.length - 1];
}

function assertSystemTypeRegistry(){
  const ids = new Set();
  let weightSum = 0;
  for(const archetype of SYSTEM_ARCHETYPES){
    if(ids.has(archetype.id)) throw new Error(`Duplicate system archetype id ${archetype.id}`);
    ids.add(archetype.id);
    weightSum += archetype.weight;

    for(const key of ['hu','gas']){
      const range = archetype[key];
      if(!Array.isArray(range) || range.length !== 2) throw new Error(`System archetype ${archetype.id} has invalid ${key} range`);
      if(!Number.isInteger(range[0]) || !Number.isInteger(range[1]) || range[0] > range[1]) throw new Error(`System archetype ${archetype.id} has invalid integer bounds for ${key}`);
    }
  }
  if(Math.abs(weightSum - 1) > 1e-9) throw new Error(`SYSTEM_ARCHETYPES weights must sum to 1, got ${weightSum}`);
}
assertSystemTypeRegistry();
