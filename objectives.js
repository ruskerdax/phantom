'use strict';

const OBJECTIVE_TYPE_ORDER = Object.values(OBJECTIVE_TYPE_IDS);

function objectiveId(type, bodyId=null) {
  return bodyId == null ? type : `${bodyId}:${type}`;
}

function objectiveLabel(type, bodyId=null) {
  const def = OBJECTIVE_TYPE_MAP[type];
  if(!def) return type;
  const body = typeof bodyById === 'function' ? bodyById(bodyId) : null;
  const labelId = (body?.id || bodyId || '').toString().toUpperCase();
  return def.scope === 'planet' ? `${labelId} ${def.name}` : def.name;
}

function objectiveBodySortIndex(bodyId) {
  if(bodyId == null) return Number.MAX_SAFE_INTEGER;
  if(typeof bodyIndexFromId === 'function') {
    const idx = bodyIndexFromId(bodyId);
    if(Number.isInteger(idx) && idx >= 0) return idx;
  }
  return Number.MAX_SAFE_INTEGER - 1;
}

function objectiveSortKey(o) {
  const pi = objectiveBodySortIndex(o.bodyId);
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

function siteDataHasBuildingCategory(d, category) {
  return (d?.buildings || []).some(b => buildingDef(b)?.category === category);
}

function genObjectives(rng) {
  const out = [];
  for(let pi = 0; pi < LV.length; pi++) {
    const p = LV[pi];
    const bodyId = typeof bodyIdForPlanetIndex === 'function' ? bodyIdForPlanetIndex(pi) : `p${pi}`;
    if((p.sites || []).some(s => s.id === 'cave' || s.type === 'cave_connector')) {
      out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.CAVE_REACTOR, bodyId), type:OBJECTIVE_TYPE_IDS.CAVE_REACTOR, bodyId, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.CAVE_REACTOR, bodyId)});
    }
    if((p.sites || []).some(s => s.id === 'targets' || s.type === 'surface_targets') && siteDataHasBuilding(p.surface, BUILDING_CLASS_IDS.DISH)) {
      out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, bodyId), type:OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, bodyId, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.SURFACE_TARGETS, bodyId)});
    }
    if(siteDataHasBuildingCategory(p.surface, 'residence')) {
      out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.CIV_RESIDENCES, bodyId), type:OBJECTIVE_TYPE_IDS.CIV_RESIDENCES, bodyId, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.CIV_RESIDENCES, bodyId)});
    }
    if(siteDataHasBuildingCategory(p.surface, 'infrastructure')) {
      out.push({id:objectiveId(OBJECTIVE_TYPE_IDS.CIV_INFRASTRUCTURE, bodyId), type:OBJECTIVE_TYPE_IDS.CIV_INFRASTRUCTURE, bodyId, complete:false, label:objectiveLabel(OBJECTIVE_TYPE_IDS.CIV_INFRASTRUCTURE, bodyId)});
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
    const legacyBodyId = (saved?.planetIdx != null && typeof bodyIdForPlanetIndex === 'function') ? bodyIdForPlanetIndex(saved.planetIdx) : null;
    return {
      id:o.id,
      type:o.type,
      bodyId:o.bodyId,
      complete:!!saved?.complete,
      label:o.label || objectiveLabel(o.type, o.bodyId || legacyBodyId),
    };
  }));
}

function completedObjectiveCount() {
  return (G.objectives || []).filter(o => o.complete).length;
}

function bodyObjectives(bodyId) {
  return (G.objectives || []).filter(o => o.bodyId === bodyId);
}

function bodyObjectivesAllComplete(bodyId) {
  const list = bodyObjectives(bodyId);
  return list.length > 0 && list.every(o => o.complete);
}

function objectiveForPlanetType(bodyId, type) {
  return (G.objectives || []).find(o => o.bodyId === bodyId && o.type === type) || null;
}

function objectiveForSite(siteId, bodyId=activeBodyId()) {
  if(siteId === 'cave') return objectiveForPlanetType(bodyId, OBJECTIVE_TYPE_IDS.CAVE_REACTOR);
  if(siteId === 'targets') return objectiveForPlanetType(bodyId, OBJECTIVE_TYPE_IDS.SURFACE_TARGETS);
  return null;
}

function syncSlipgateFromObjectives() {
  const wasActive = !!G.slipgateActive;
  G.slipgateActive = completedObjectiveCount() >= (G.objectivesRequired || 0) || !!G.cheatSlipgateUnlocked;
  if(G.slipgateActive && !wasActive) G.slipMsg = Math.max(G.slipMsg || 0, 360);
}

function syncPlanetCleared(bodyId=activeBodyId()) {
  G.cleared = clearedForBodies(G.cleared);
  G.cleared[bodyId] = bodyObjectivesAllComplete(bodyId);
}

function syncAllPlanetCleared() {
  G.cleared = clearedForBodies(G.cleared);
  const bodies = typeof enterableBodies === 'function' && enterableBodies().length
    ? enterableBodies()
    : Array.from({length:LV.length},(_,i)=>({id:bodyIdForPlanetIndex(i)}));
  for(const b of bodies) syncPlanetCleared(b.id);
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

function completePlanetSite(siteId, bodyId=activeBodyId()) {
  const ps = bodyLevelState(bodyId);
  if(!ps.completedSites[siteId]) ps.completedSites[siteId] = true;
  const obj = objectiveForSite(siteId, bodyId);
  if(obj) {
    if(completeObjective(obj.id)) tone(880,.25,'sine',.08);
  } else {
    syncPlanetCleared(bodyId);
    syncSlipgateFromObjectives();
  }
  saveGame();
}

function currentSystemState() {
  return {
    objectives: (G.objectives || []).map(o => ({id:o.id, type:o.type, bodyId:o.bodyId, complete:!!o.complete, label:o.label})),
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
  if(layout === 'base-list-stub') return (G.objectives || []).map(o => ({label:o.label, complete:!!o.complete, type:o.type, bodyId:o.bodyId}));
  if(layout !== 'planet') return [];
  const bodyId = opts.bodyId || (opts.planetIdx != null && typeof bodyIdForPlanetIndex === 'function' ? bodyIdForPlanetIndex(opts.planetIdx) : null);
  if(!bodyId) return [];
  return (G.objectives || []).filter(o => o.bodyId === bodyId).map(o => ({label:o.label, complete:!!o.complete, type:o.type, bodyId:o.bodyId}));
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
