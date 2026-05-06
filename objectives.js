'use strict';

const OBJECTIVE_TYPE_ORDER = Object.values(OBJECTIVE_TYPE_IDS);

function objectiveId(type, planetIdx=null) {
  return planetIdx == null ? type : `${planetIdx}:${type}`;
}

function objectiveLabel(type, planetIdx=null) {
  const def = OBJECTIVE_TYPE_MAP[type];
  if(!def) return type;
  return def.scope === 'planet' ? `P${(planetIdx ?? 0) + 1} ${def.name}` : def.name;
}

function objectiveSortKey(o) {
  const pi = o.planetIdx == null ? Number.MAX_SAFE_INTEGER : o.planetIdx;
  const ti = OBJECTIVE_TYPE_ORDER.indexOf(o.type);
  return [pi, ti < 0 ? Number.MAX_SAFE_INTEGER : ti, o.id];
}

function sortObjectives(list) {
  return list.sort((a,b) => {
    const ak = objectiveSortKey(a), bk = objectiveSortKey(b);
    return ak[0] - bk[0] || ak[1] - bk[1] || String(ak[2]).localeCompare(String(bk[2]));
  });
}

function siteDataHasBuilding(d, classId) {
  return (d?.buildings || []).some(b => b.classId === classId);
}

function genObjectives(rng) {
  const out = [];
  for(let pi = 0; pi < LV.length; pi++) {
    const p = LV[pi];
    if((p.sites || []).some(s => s.id === 'cave' || s.type === 'cave_connector')) {
      out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.CAVE_REACTOR, pi), type:OBJECTIVE_TYPE_IDS.CAVE_REACTOR, planetIdx:pi, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.CAVE_REACTOR, pi)});
    }
    if((p.sites || []).some(s => s.id === 'targets' || s.type === 'surface_targets') && siteDataHasBuilding(p.surface, BUILDING_CLASS_IDS.DISH)) {
      out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, pi), type:OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, planetIdx:pi, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, pi)});
    }
  }
  if(HBASE) out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.HBASE), type:OBJECTIVE_TYPE_IDS.HBASE, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.HBASE)});
  G.objectives = sortObjectives(out);
  G.objectivesRequired = rng.int(1,2) + rng.int(1,2) + rng.int(1,2);
  syncDerivedObjectives();
  return G.objectives;
}

function normalizeObjectives(src, generated=G.objectives) {
  const savedById = new Map(Array.isArray(src) ? src.map(o => [o?.id, o]) : []);
  const base = Array.isArray(generated) ? generated : [];
  return sortObjectives(base.map(o => {
    const saved = savedById.get(o.id);
    return {
      id:o.id,
      type:o.type,
      planetIdx:o.planetIdx,
      complete:!!saved?.complete,
      label:o.label || objectiveLabel(o.type, o.planetIdx),
    };
  }));
}

function completedObjectiveCount() {
  return (G.objectives || []).filter(o => o.complete).length;
}

function objectiveForPlanetType(planetIdx, type) {
  return (G.objectives || []).find(o => o.planetIdx === planetIdx && o.type === type) || null;
}

function objectiveForSite(siteId, planetIdx=G.lv) {
  if(siteId === 'cave') return objectiveForPlanetType(planetIdx, OBJECTIVE_TYPE_IDS.CAVE_REACTOR);
  if(siteId === 'targets') return objectiveForPlanetType(planetIdx, OBJECTIVE_TYPE_IDS.SURFACE_TARGETS);
  return null;
}

function syncSlipgateFromObjectives() {
  const wasActive = !!G.slipgateActive;
  G.slipgateActive = completedObjectiveCount() >= (G.objectivesRequired || 0) || !!G.cheatSlipgateUnlocked;
  if(G.slipgateActive && !wasActive) G.slipMsg = Math.max(G.slipMsg || 0, 360);
}

function syncPlanetCleared(pi=G.lv) {
  if(G.cleared.length !== PP.length) G.cleared = clearedForPlanets(G.cleared);
  const planetObjectives = (G.objectives || []).filter(o => o.planetIdx === pi);
  G.cleared[pi] = planetObjectives.every(o => o.complete);
}

function syncAllPlanetCleared() {
  G.cleared = clearedForPlanets(G.cleared);
  for(let pi = 0; pi < PP.length; pi++) syncPlanetCleared(pi);
}

function syncDerivedObjectives() {
  syncAllPlanetCleared();
  const hb = (G.objectives || []).find(o => o.type === OBJECTIVE_TYPE_IDS.HBASE);
  if(hb?.complete) G.hbCleared = true;
  syncSlipgateFromObjectives();
}

function completeObjective(id) {
  const obj = (G.objectives || []).find(o => o.id === id);
  if(!obj || obj.complete) return false;
  obj.complete = true;
  addStake(250);
  if(obj.type === OBJECTIVE_TYPE_IDS.HBASE) G.hbCleared = true;
  syncDerivedObjectives();
  return true;
}

function completePlanetSite(siteId, pi=G.lv) {
  const ps = planetState(pi);
  if(!ps.completedSites[siteId]) ps.completedSites[siteId] = true;
  const obj = objectiveForSite(siteId, pi);
  if(obj) {
    if(completeObjective(obj.id)) tone(880,.25,'sine',.08);
  } else {
    syncPlanetCleared(pi);
    syncSlipgateFromObjectives();
  }
  saveGame();
}

function currentSystemState() {
  return {
    objectives: (G.objectives || []).map(o => ({id:o.id, type:o.type, planetIdx:o.planetIdx, complete:!!o.complete, label:o.label})),
    objectivesRequired: G.objectivesRequired,
    cheatSlipgateUnlocked: !!G.cheatSlipgateUnlocked,
    hbCleared: G.hbCleared,
    hbState: G.hbState,
    lvState: G.lvState,
  };
}

function applySystemObjectiveState(src={}) {
  G.objectives = normalizeObjectives(src.objectives, G.objectives);
  G.objectivesRequired = Number.isFinite(src.objectivesRequired) && src.objectivesRequired >= 3 && src.objectivesRequired <= 6 ? Math.round(src.objectivesRequired) : G.objectivesRequired;
  G.cheatSlipgateUnlocked = !!src.cheatSlipgateUnlocked;
  G.hbCleared = !!src.hbCleared || !!(G.objectives || []).find(o => o.type === OBJECTIVE_TYPE_IDS.HBASE && o.complete);
  G.hbState = src.hbState ?? null;
  G.lvState = src.lvState ?? {};
  syncDerivedObjectives();
}

function objectivePanelRows(opts={}) {
  const layout = opts.layout || 'planet';
  if(layout === 'base-list-stub') return (G.objectives || []).map(o => ({label:o.label, complete:!!o.complete, type:o.type, planetIdx:o.planetIdx}));
  if(layout !== 'planet') return [];
  if(opts.planetIdx == null || !LV[opts.planetIdx]) return [];
  return (G.objectives || []).filter(o => o.planetIdx === opts.planetIdx).map(o => ({label:o.label, complete:!!o.complete, type:o.type, planetIdx:o.planetIdx}));
}

function drawObjectivesPanel(opts={}) {
  const rows = objectivePanelRows(opts);
  if(opts.layout === 'base-list-stub') return rows;
  if(!rows.length) return rows;
  const x = opts.x ?? 8, y = opts.y ?? 52, rowH = 15;
  cx.save();
  cx.font = '11px MajorMonoDisplay, monospace';
  const w = Math.max(150, ...rows.map(r => cx.measureText(r.label).width + 28));
  const h = rows.length * rowH + 12;
  cx.fillStyle = 'rgba(0,12,10,.62)';
  cx.fillRect(x - 5, y - 12, w, h);
  cx.strokeStyle = '#2a6';
  cx.lineWidth = 1;
  cx.strokeRect(x - 5, y - 12, w, h);
  for(let i = 0; i < rows.length; i++) {
    const r = rows[i], yy = y + i * rowH;
    cx.fillStyle = r.complete ? '#0f8' : '#668';
    cx.fillText(r.complete ? '\u2713' : '-', x, yy);
    cx.fillStyle = r.complete ? '#aaffcc' : '#88a';
    cx.fillText(r.label, x + 18, yy);
  }
  cx.restore();
  return rows;
}
