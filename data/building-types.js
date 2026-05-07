'use strict';

const BUILDING_CLASS_IDS = {
  DISH: 'DISH',
  TOWER: 'TOWER',
  POWER_STATION: 'POWER_STATION',
  AIR_DEFENSE_BASE: 'AIR_DEFENSE_BASE',
};

const BUILDING_CLASSES = [
  {
    id:BUILDING_CLASS_IDS.DISH,
    name:'DISH',
    hp:30,
    footprint:{w:34,h:34},
    requiresFlat:false,
    requiresPower:false,
    indestructible:false,
    col:'#ffdd88',
    sc:500,
    drawSurface(b,site){drawDish(b,site);},
    onDestroyed(site,b){
      if(siteBuildings(site).filter(x => x.classId === BUILDING_CLASS_IDS.DISH).every(x => !x.alive)) {
        completePlanetSite(b.siteId || 'targets');
      }
    },
    placement:{contexts:['surface']},
  },
  {
    id:BUILDING_CLASS_IDS.TOWER,
    name:'TOWER',
    hp:100,
    footprint:{w:18,h:34},
    requiresFlat:true,
    requiresPower:false,
    indestructible:false,
    col:'#ff5555',
    sc:180,
    drawSurface(b,site){drawTower(b,site);},
    onDestroyed(site,b){
      const turret=site?.defenses?.[b.turretId];
      if(turret)turret.alive=false;
    },
    placement:{contexts:['surface']},
  },
  {
    id:BUILDING_CLASS_IDS.POWER_STATION,
    name:'POWER STATION',
    hp:50,
    footprint:{w:42,h:28},
    requiresFlat:true,
    requiresPower:false,
    indestructible:false,
    col:'#66ddff',
    sc:0,
    drawSurface(b,site){drawPowerStation(b,site);},
    placement:{contexts:['surface']},
  },
  {
    id:BUILDING_CLASS_IDS.AIR_DEFENSE_BASE,
    name:'AIR DEFENSE BASE',
    hp:500,
    footprint:{w:76,h:34},
    requiresFlat:true,
    requiresPower:false,
    indestructible:false,
    col:'#ff8844',
    sc:0,
    drawSurface(b,site){drawAirDefenseBase(b,site);},
    update(b,site){updateAirDefenseBase(b,site);},
    placement:{contexts:['surface']},
  },
];

const BUILDING_CLASS_MAP = Object.fromEntries(BUILDING_CLASSES.map(b => [b.id, b]));
Object.assign(BUILDING_CLASSES, BUILDING_CLASS_MAP);

function assertBuildingRegistry() {
  const classIds = new Set(Object.values(BUILDING_CLASS_IDS));
  if(Object.keys(BUILDING_CLASS_MAP).length !== BUILDING_CLASSES.length) throw new Error('Duplicate building class id in BUILDING_CLASSES');
  for(const b of BUILDING_CLASSES) {
    if(!classIds.has(b.id)) throw new Error(`Building class ${b.id} is missing from BUILDING_CLASS_IDS`);
    if(!b.footprint || !Number.isFinite(b.footprint.w) || !Number.isFinite(b.footprint.h)) throw new Error(`Building class ${b.id} has invalid footprint`);
    if(!b.placement?.contexts?.length) throw new Error(`Building class ${b.id} has no placement contexts`);
  }
}
assertBuildingRegistry();

function buildingDef(buildingOrClass) {
  if(buildingOrClass && typeof buildingOrClass === 'object') {
    if(buildingOrClass.classId) return buildingDef(buildingOrClass.classId);
  }
  const def = BUILDING_CLASS_MAP[buildingOrClass];
  if(!def) throw new Error(`Unknown building class: ${buildingOrClass}`);
  return def;
}
