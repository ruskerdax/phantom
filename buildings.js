'use strict';

function mkBuilding(classId, x, y, extra = {}) {
  const def = buildingDef(classId);
  return {
    classId:def.id,
    x,
    y,
    hp:def.hp,
    mhp:def.hp,
    alive:true,
    ...extra,
  };
}

function buildingHitBox(b) {
  const def = buildingDef(b);
  const fp = def.footprint;
  return {
    x0:b.x - fp.w / 2,
    y0:b.y - fp.h / 2,
    x1:b.x + fp.w / 2,
    y1:b.y + fp.h / 2,
  };
}

function pointInBuildingHitBox(b, x, y) {
  const hb = buildingHitBox(b);
  return x >= hb.x0 && x <= hb.x1 && y >= hb.y0 && y <= hb.y1;
}

function buildingTargetRadius(b) {
  const fp = buildingDef(b).footprint;
  return Math.max(fp.w, fp.h) / 2;
}

function damageBuilding(site, b, dmg, x = b.x, y = b.y) {
  if(!b?.alive) return false;
  const def = buildingDef(b);
  if(def.indestructible) return false;
  b.hp -= dmg;
  boomAt(site.pts, x, y, def.col, 4);
  tone(350, .08, 'square', .06);
  if(b.hp <= 0) {
    b.alive = false;
    addStake(def.sc || 0);
    boomAt(site.pts, b.x, b.y, def.col, 22);
    boomAt(site.pts, b.x, b.y, '#fff', 8);
    if(def.onDestroyed) def.onDestroyed(site, b);
  }
  return true;
}

function siteBuildings(site) {
  return site?.buildings || [];
}

function updateBuilding(site, b) {
  if(!b?.alive) return;
  const def = buildingDef(b);
  b.powered = buildingIsPowered(site, b);
  if(buildingRequiresPower(b, def) && !b.powered) return;
  if(def.update) def.update(b, site);
}

function drawBuildingSurface(b, site) {
  const def = buildingDef(b);
  b.powered = buildingIsPowered(site, b);
  if(def.drawSurface) def.drawSurface(b, site, b.powered);
}

function drawBuildingTunnel(b, site) {
  const def = buildingDef(b);
  b.powered = buildingIsPowered(site, b);
  if(def.drawTunnel) def.drawTunnel(b, site, b.powered);
}
