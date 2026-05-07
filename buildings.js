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

function drawAirDefenseBase(base) {
  const pulse = .5 + .5 * Math.sin(G.fr * .07 + base.x * .01);
  cx.save();
  cx.translate(base.x, base.y);
  cx.strokeStyle = '#ff8844';
  cx.fillStyle = 'rgba(46,18,8,.88)';
  cx.shadowColor = '#ff8844';
  cx.shadowBlur = sb(6 + pulse * 7);
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.rect(-38, -8, 76, 24);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.rect(-23, -21, 46, 13);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-31, 16);
  cx.lineTo(-31, 22);
  cx.moveTo(31, 16);
  cx.lineTo(31, 22);
  cx.moveTo(-8, -21);
  cx.lineTo(-14, -29);
  cx.moveTo(8, -21);
  cx.lineTo(14, -29);
  cx.moveTo(-14, -29);
  cx.lineTo(14, -29);
  cx.stroke();
  cx.fillStyle = '#ff8844';
  cx.font = 'bold 8px MajorMonoDisplay, monospace';
  cx.textAlign = 'center';
  cx.shadowBlur = 0;
  cx.fillText(base.hp, 0, 6);
  cx.restore();
}

function _drawCivBox(b, col, w, h, detail) {
  cx.save();
  cx.translate(b.x, b.y);
  cx.strokeStyle = col;
  cx.fillStyle = col === CIV_INFRA_COL ? 'rgba(28,22,8,.86)' : 'rgba(8,22,10,.86)';
  cx.shadowColor = col;
  cx.shadowBlur = sb(3);
  cx.lineWidth = 1;
  cx.beginPath();
  cx.rect(-w/2, -h/2, w, h);
  cx.fill();
  cx.stroke();
  if(detail) detail();
  cx.restore();
}

function drawBungalow(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 14, 10, () => {
    cx.beginPath();
    cx.moveTo(-8, -5); cx.lineTo(0, -10); cx.lineTo(8, -5);
    cx.stroke();
    cx.fillStyle = CIV_RESIDENCE_COL;
    cx.fillRect(-2, -1, 3, 4);
  });
}
function drawRanch(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 22, 10, () => {
    cx.beginPath();
    cx.moveTo(-12, -5); cx.lineTo(-6, -10); cx.lineTo(6, -10); cx.lineTo(12, -5);
    cx.stroke();
    cx.fillStyle = CIV_RESIDENCE_COL;
    cx.fillRect(-7, -2, 3, 3); cx.fillRect(-1, -2, 3, 3); cx.fillRect(5, -2, 2, 3);
  });
}
function drawTownhouse(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 18, 22, () => {
    cx.beginPath();
    cx.moveTo(-10, -11); cx.lineTo(0, -16); cx.lineTo(10, -11);
    cx.stroke();
    cx.fillStyle = CIV_RESIDENCE_COL;
    for(let r = 0; r < 2; r++)
      for(let c = 0; c < 2; c++)
        cx.fillRect(-6 + c*8, -8 + r*8, 3, 3);
  });
}
function drawMansion(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 32, 18, () => {
    cx.beginPath();
    cx.rect(-6, -16, 12, 7);
    cx.stroke();
    cx.fillStyle = CIV_RESIDENCE_COL;
    for(let i = 0; i < 5; i++) cx.fillRect(-13 + i*6, -4, 3, 4);
    cx.fillRect(-1, 2, 2, 7);
  });
}
function drawCondo(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 22, 34, () => {
    cx.fillStyle = CIV_RESIDENCE_COL;
    for(let r = 0; r < 5; r++)
      for(let c = 0; c < 3; c++)
        cx.fillRect(-9 + c*8, -14 + r*6, 3, 3);
  });
}
function drawHighRise(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 22, 50, () => {
    cx.fillStyle = CIV_RESIDENCE_COL;
    for(let r = 0; r < 8; r++)
      for(let c = 0; c < 3; c++)
        cx.fillRect(-9 + c*8, -22 + r*6, 3, 3);
    cx.beginPath();
    cx.moveTo(0, -25); cx.lineTo(0, -30);
    cx.stroke();
  });
}
function drawHotel(b) {
  _drawCivBox(b, CIV_RESIDENCE_COL, 54, 32, () => {
    cx.fillStyle = CIV_RESIDENCE_COL;
    for(let r = 0; r < 4; r++)
      for(let c = 0; c < 7; c++)
        cx.fillRect(-24 + c*8, -13 + r*7, 3, 3);
    cx.beginPath();
    cx.rect(-8, 9, 16, 7);
    cx.stroke();
  });
}
function drawArcology(b) {
  cx.save();
  cx.translate(b.x, b.y);
  const col = CIV_RESIDENCE_COL;
  cx.strokeStyle = col;
  cx.fillStyle = 'rgba(8,22,10,.86)';
  cx.shadowColor = col;
  cx.shadowBlur = sb(5);
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(-30, 45);
  cx.lineTo(-12, -5);
  cx.lineTo(-12, -25);
  cx.lineTo(12, -25);
  cx.lineTo(12, -5);
  cx.lineTo(30, 45);
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-22, 22); cx.lineTo(22, 22);
  cx.moveTo(-16, 5); cx.lineTo(16, 5);
  cx.stroke();
  cx.beginPath();
  cx.ellipse(0, -32, 18, 14, 0, 0, Math.PI*2);
  cx.fill();
  cx.stroke();
  cx.fillStyle = col;
  for(let i = 0; i < 5; i++) cx.fillRect(-12 + i*5, -34, 2, 2);
  cx.beginPath();
  cx.moveTo(0, -46); cx.lineTo(0, -52);
  cx.stroke();
  cx.restore();
}
function drawCropDome(b) {
  cx.save();
  cx.translate(b.x, b.y);
  cx.strokeStyle = CIV_INFRA_COL;
  cx.fillStyle = 'rgba(28,22,8,.86)';
  cx.shadowColor = CIV_INFRA_COL;
  cx.shadowBlur = sb(3);
  cx.lineWidth = 1;
  cx.beginPath();
  cx.arc(0, 5, 12, Math.PI, Math.PI*2);
  cx.lineTo(12, 7); cx.lineTo(-12, 7);
  cx.closePath();
  cx.fill(); cx.stroke();
  cx.beginPath();
  cx.moveTo(-9, 0); cx.lineTo(9, 0);
  cx.moveTo(0, -7); cx.lineTo(0, 7);
  cx.stroke();
  cx.restore();
}
function drawFarmhouse(b) {
  _drawCivBox(b, CIV_INFRA_COL, 14, 14, () => {
    cx.beginPath();
    cx.moveTo(-8, -7); cx.lineTo(0, -12); cx.lineTo(8, -7);
    cx.stroke();
    cx.beginPath();
    cx.rect(7, -4, 6, 11);
    cx.moveTo(7, -4); cx.lineTo(13, -4); cx.lineTo(10, -8); cx.closePath();
    cx.stroke();
  });
}
function drawGov(b) {
  _drawCivBox(b, CIV_INFRA_COL, 34, 18, () => {
    cx.beginPath();
    cx.moveTo(-18, -9); cx.lineTo(0, -16); cx.lineTo(18, -9);
    cx.stroke();
    cx.beginPath();
    for(let i = 0; i < 5; i++) {
      const x = -13 + i*6.5;
      cx.moveTo(x, -7); cx.lineTo(x, 8);
    }
    cx.stroke();
  });
}
function drawHospital(b) {
  _drawCivBox(b, CIV_INFRA_COL, 30, 24, () => {
    cx.fillStyle = CIV_INFRA_COL;
    cx.fillRect(-2, -8, 4, 12);
    cx.fillRect(-7, -3, 14, 4);
    for(let r = 0; r < 2; r++)
      for(let c = 0; c < 4; c++)
        cx.fillRect(-13 + c*4, 6 + r*4, 2, 2);
  });
}
function drawWarehouse(b) {
  _drawCivBox(b, CIV_INFRA_COL, 46, 22, () => {
    cx.beginPath();
    for(let i = 1; i < 5; i++) {
      const x = -23 + i*9.2;
      cx.moveTo(x, -11); cx.lineTo(x, 11);
    }
    cx.stroke();
    cx.fillStyle = CIV_INFRA_COL;
    cx.fillRect(-6, 4, 12, 7);
  });
}
function drawFactory(b) {
  _drawCivBox(b, CIV_INFRA_COL, 48, 22, () => {
    cx.beginPath();
    cx.rect(-22, -16, 7, 16);
    cx.rect(-12, -16, 7, 16);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(8, -11); cx.lineTo(8, -22); cx.lineTo(13, -22); cx.lineTo(13, -11);
    cx.stroke();
    cx.fillStyle = CIV_INFRA_COL;
    cx.fillRect(2, 2, 12, 8);
  });
}
function drawSpaceport(b) {
  _drawCivBox(b, CIV_INFRA_COL, 58, 24, () => {
    cx.beginPath();
    cx.moveTo(-29, -12); cx.lineTo(29, -12);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(15, -12); cx.lineTo(20, -28); cx.lineTo(25, -12);
    cx.closePath();
    cx.stroke();
    cx.fillStyle = CIV_INFRA_COL;
    cx.fillRect(-26, -8, 6, 6);
    cx.fillRect(-12, -8, 6, 6);
    cx.fillRect(2, -8, 6, 6);
    cx.beginPath();
    cx.moveTo(-25, -12); cx.lineTo(-23, -22);
    cx.stroke();
  });
}
function drawEntertainment(b) {
  _drawCivBox(b, CIV_INFRA_COL, 60, 32, () => {
    cx.beginPath();
    cx.arc(0, -16, 18, Math.PI*1.05, Math.PI*1.95);
    cx.stroke();
    cx.fillStyle = CIV_INFRA_COL;
    for(let i = 0; i < 6; i++) cx.fillRect(-22 + i*8, -2, 4, 4);
    cx.beginPath();
    cx.moveTo(-26, 14); cx.lineTo(26, 14);
    cx.stroke();
  });
}

function drawDroneFactory(factory) {
  const pulse = .5 + .5 * Math.sin(G.fr * .09 + factory.x * .015);
  cx.save();
  cx.translate(factory.x, factory.y);
  cx.strokeStyle = '#66ffcc';
  cx.fillStyle = 'rgba(6,36,30,.88)';
  cx.shadowColor = '#66ffcc';
  cx.shadowBlur = sb(6 + pulse * 8);
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.rect(-32, -8, 64, 24);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.rect(-19, -23, 38, 15);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-24, 16);
  cx.lineTo(-24, 22);
  cx.moveTo(24, 16);
  cx.lineTo(24, 22);
  cx.moveTo(-10, -15);
  cx.lineTo(0, -21);
  cx.lineTo(10, -15);
  cx.moveTo(-18, 2);
  cx.lineTo(18, 2);
  cx.stroke();
  cx.fillStyle = '#66ffcc';
  cx.font = 'bold 8px MajorMonoDisplay, monospace';
  cx.textAlign = 'center';
  cx.shadowBlur = 0;
  cx.fillText(factory.hp, 0, 7);
  cx.restore();
}
