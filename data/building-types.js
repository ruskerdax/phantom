'use strict';

const BUILDING_CLASS_IDS = {
  DISH: 'DISH',
  TOWER: 'TOWER',
  POWER_STATION: 'POWER_STATION',
  AIR_DEFENSE_BASE: 'AIR_DEFENSE_BASE',
  DRONE_FACTORY: 'DRONE_FACTORY',
  ORBITAL_GUN: 'ORBITAL_GUN',
  LASER_DEFENSE: 'LASER_DEFENSE',
  BUNGALOW: 'BUNGALOW',
  RANCH: 'RANCH',
  TOWNHOUSE: 'TOWNHOUSE',
  MANSION: 'MANSION',
  CONDO: 'CONDO',
  HIGH_RISE: 'HIGH_RISE',
  HOTEL: 'HOTEL',
  ARCOLOGY: 'ARCOLOGY',
  CROP_DOME: 'CROP_DOME',
  FARMHOUSE: 'FARMHOUSE',
  GOV: 'GOV',
  HOSPITAL: 'HOSPITAL',
  WAREHOUSE: 'WAREHOUSE',
  FACTORY: 'FACTORY',
  SPACEPORT: 'SPACEPORT',
  ENTERTAINMENT: 'ENTERTAINMENT',
};

const CIV_RESIDENCE_COL = '#88ff66';
const CIV_INFRA_COL = '#ffeeaa';

function _civObjectiveOnDestroyed(site, b) {
  const def = buildingDef(b);
  const surface = site?.planet?.surface;
  if(!surface || !def?.category) return;
  const total = def.category === 'residence' ? surface.civResidencePoints : surface.civInfraPoints;
  if(!total || total <= 0) return;
  let destroyed = 0;
  for(const x of siteBuildings(site)) {
    if(x.alive) continue;
    const xd = buildingDef(x);
    if(xd?.category === def.category) destroyed += xd.pts || 0;
  }
  if(destroyed * 2 < total) return;
  const bodyId = site?.bodyId || null;
  const type = def.category === 'residence' ? OBJECTIVE_TYPE_IDS.CIV_RESIDENCES : OBJECTIVE_TYPE_IDS.CIV_INFRASTRUCTURE;
  const obj = bodyId ? objectiveForPlanetType(bodyId, type) : null;
  if(obj && !obj.complete) completeObjective(obj.id);
}

function _drawOrbitalGunPlaceholder(b) {
  const pulse = .5 + .5 * Math.sin(G.fr * .06 + b.x * .01);
  cx.save();
  cx.translate(b.x, b.y);
  cx.strokeStyle = '#ff9966';
  cx.fillStyle = 'rgba(42,16,8,.9)';
  cx.shadowColor = '#ff9966';
  cx.shadowBlur = sb(8 + pulse * 9);
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.rect(-36, -10, 72, 24);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.rect(-20, -22, 30, 12);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-5, -22);
  cx.lineTo(23, -42);
  cx.lineTo(31, -36);
  cx.lineTo(4, -15);
  cx.closePath();
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(19, -39);
  cx.lineTo(34, -48);
  cx.stroke();
  cx.fillStyle = '#ff9966';
  cx.font = 'bold 8px MajorMonoDisplay, monospace';
  cx.textAlign = 'center';
  cx.shadowBlur = 0;
  cx.fillText(b.hp, 0, 6);
  cx.restore();
}

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
  {
    id:BUILDING_CLASS_IDS.DRONE_FACTORY,
    name:'DRONE FACTORY',
    hp:300,
    footprint:{w:64,h:32},
    requiresFlat:true,
    requiresPower:false,
    indestructible:false,
    col:'#66ffcc',
    sc:0,
    drawSurface(b,site){drawDroneFactory(b,site);},
    update(b,site){updateDroneFactory(b,site);},
    placement:{contexts:['surface']},
  },
  {
    id:BUILDING_CLASS_IDS.ORBITAL_GUN,
    name:'ORBITAL GUN',
    hp:500,
    footprint:{w:88,h:46},
    requiresFlat:true,
    requiresPower:false,
    indestructible:false,
    col:'#ff9966',
    sc:0,
    drawSurface(b){_drawOrbitalGunPlaceholder(b);},
    placement:{contexts:['surface']},
  },
  {
    id:BUILDING_CLASS_IDS.LASER_DEFENSE,
    name:'LASER DEFENSE',
    hp:1,
    footprint:{w:8,h:8},
    requiresFlat:false,
    requiresPower:true,
    indestructible:true,
    col:'#55e6ff',
    sc:0,
    drawTunnel(b,site,powered){drawLaserFence(b,site,powered);},
    placement:{contexts:['cave','tunnel']},
  },
  // ---- Civilian residences ----
  {id:BUILDING_CLASS_IDS.BUNGALOW,name:'BUNGALOW',hp:10,pts:2,category:'residence',footprint:{w:14,h:14},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:8,drawSurface(b){drawBungalow(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.RANCH,name:'RANCH',hp:20,pts:4,category:'residence',footprint:{w:22,h:14},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:14,drawSurface(b){drawRanch(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.TOWNHOUSE,name:'TOWNHOUSE',hp:30,pts:6,category:'residence',footprint:{w:18,h:24},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:22,drawSurface(b){drawTownhouse(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.MANSION,name:'MANSION',hp:40,pts:8,category:'residence',footprint:{w:32,h:22},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:30,drawSurface(b){drawMansion(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.CONDO,name:'CONDO',hp:50,pts:10,category:'residence',footprint:{w:22,h:34},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:38,drawSurface(b){drawCondo(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.HIGH_RISE,name:'HIGH RISE',hp:60,pts:12,category:'residence',footprint:{w:22,h:50},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:48,drawSurface(b){drawHighRise(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.HOTEL,name:'HOTEL',hp:80,pts:16,category:'residence',footprint:{w:54,h:34},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:64,drawSurface(b){drawHotel(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.ARCOLOGY,name:'ARCOLOGY',hp:160,pts:32,category:'residence',footprint:{w:68,h:90},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_RESIDENCE_COL,sc:120,drawSurface(b){drawArcology(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  // ---- Civilian infrastructure ----
  {id:BUILDING_CLASS_IDS.CROP_DOME,name:'CROP DOME',hp:10,pts:2,category:'infrastructure',footprint:{w:24,h:14},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:8,drawSurface(b){drawCropDome(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.FARMHOUSE,name:'FARMHOUSE',hp:20,pts:4,category:'infrastructure',footprint:{w:24,h:18},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:14,drawSurface(b){drawFarmhouse(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.GOV,name:'GOV',hp:30,pts:6,category:'infrastructure',footprint:{w:34,h:22},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:22,drawSurface(b){drawGov(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.HOSPITAL,name:'HOSPITAL',hp:40,pts:8,category:'infrastructure',footprint:{w:30,h:26},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:30,drawSurface(b){drawHospital(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.WAREHOUSE,name:'WAREHOUSE',hp:50,pts:10,category:'infrastructure',footprint:{w:46,h:24},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:38,drawSurface(b){drawWarehouse(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.FACTORY,name:'FACTORY',hp:60,pts:12,category:'infrastructure',footprint:{w:48,h:30},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:48,drawSurface(b){drawFactory(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.SPACEPORT,name:'SPACEPORT',hp:80,pts:16,category:'infrastructure',footprint:{w:58,h:32},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:64,drawSurface(b){drawSpaceport(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
  {id:BUILDING_CLASS_IDS.ENTERTAINMENT,name:'ENTERTAINMENT',hp:160,pts:32,category:'infrastructure',footprint:{w:64,h:42},requiresFlat:true,requiresPower:false,indestructible:false,col:CIV_INFRA_COL,sc:120,drawSurface(b){drawEntertainment(b);},onDestroyed:_civObjectiveOnDestroyed,placement:{contexts:['surface']}},
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
