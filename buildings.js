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

function drawPowerStation(station) {
  const pulse = .5 + .5 * Math.sin(G.fr * .12 + station.x * .02);
  cx.save();
  cx.translate(station.x, station.y);
  cx.strokeStyle = '#66ddff';
  cx.fillStyle = 'rgba(4,28,34,.88)';
  cx.shadowColor = '#66ddff';
  cx.shadowBlur = sb(8 + pulse * 8);
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.rect(-21, -12, 42, 24);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-14, 12);
  cx.lineTo(-14, 18);
  cx.moveTo(14, 12);
  cx.lineTo(14, 18);
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-4, -7);
  cx.lineTo(4, -7);
  cx.lineTo(-2, 0);
  cx.lineTo(5, 0);
  cx.lineTo(-5, 9);
  cx.lineTo(-1, 2);
  cx.lineTo(-7, 2);
  cx.closePath();
  cx.stroke();
  cx.fillStyle = '#66ddff';
  cx.font = 'bold 8px MajorMonoDisplay, monospace';
  cx.textAlign = 'center';
  cx.shadowBlur = 0;
  cx.fillText(station.hp, 0, 5);
  cx.restore();
}
