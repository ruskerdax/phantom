'use strict';

const SAVE_KEY = 'phantom_save';

function defaultSave() {
  return {
    credits: 0,
    stake: 0,
    licenses: ['kestrel', 'shield_std', 'mass driver', 'laser cannon'],
    loadout: {chassis:'kestrel', weapons:['mass driver','laser cannon'], aux:'shield_std'},
    cleared: [false, false, false],
    hbCleared: false,
    hbState: null,
    lvState: {},
    slipgateActive: false,
    seed: 0,
    visitedSeeds: [],
    tutorialDone: false,
    prevSeed: null,
    systemStates: {},
    needsRebuild: false,
    currentHp: null,
    currentEnergy: null,
    sfxVol: 10,
    musVol: 10,
    dynamicZoom: true,
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const def = defaultSave();
    if (!Array.isArray(d.licenses))          d.licenses = def.licenses;
    if (!d.loadout || typeof d.loadout !== 'object') d.loadout = {...def.loadout, weapons:[...def.loadout.weapons]};
    if (!Array.isArray(d.loadout.weapons))   d.loadout.weapons = [...def.loadout.weapons];
    if (typeof d.loadout.aux !== 'string')   d.loadout.aux = def.loadout.aux;
    if (typeof d.loadout.chassis !== 'string') d.loadout.chassis = def.loadout.chassis;
    if (!Array.isArray(d.visitedSeeds))      d.visitedSeeds = [];
    if (typeof d.tutorialDone !== 'boolean') d.tutorialDone = false;
    if (!('prevSeed' in d))                  d.prevSeed = null;
    if (!d.systemStates || typeof d.systemStates !== 'object') d.systemStates = {};
    if (typeof d.needsRebuild !== 'boolean') d.needsRebuild = false;
    if (!Array.isArray(d.cleared))           d.cleared = def.cleared;
    if (!d.lvState || typeof d.lvState !== 'object') d.lvState = {};
    if (typeof d.dynamicZoom !== 'boolean')  d.dynamicZoom = true;
    return d;
  } catch(e) { return null; }
}

function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e) {}
}

function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function buildSaveData() {
  const s = G.ENC?.s ?? G.site?.s ?? G.OW?.s;
  return {
    credits: G.credits,
    stake: G.stake,
    licenses: [...G.licenses],
    loadout: {chassis:G.loadout.chassis, weapons:[...G.loadout.weapons], aux:G.loadout.aux},
    cleared: [...G.cleared],
    hbCleared: G.hbCleared,
    hbState: G.hbState,
    lvState: G.lvState ?? {},
    slipgateActive: G.slipgateActive,
    seed: G.seed,
    visitedSeeds: [...G.visitedSeeds],
    tutorialDone: G.tutorialDone,
    prevSeed: G.prevSeed,
    systemStates: G.systemStates,
    needsRebuild: !!G.needsRebuild,
    currentHp: (s?.alive && s.hp > 0) ? s.hp : null,
    currentEnergy: (s?.alive && s.hp > 0) ? s.energy : null,
    sfxVol: G.sfxVol,
    musVol: G.musVol,
    dynamicZoom: G.dynamicZoom,
  };
}

function saveGame() { writeSave(buildSaveData()); }
function saveSettings() {
  const d = (G.OW||G.ENC||G.site) ? buildSaveData() : (loadSave() || defaultSave());
  d.sfxVol = G.sfxVol;
  d.musVol = G.musVol;
  d.dynamicZoom = G.dynamicZoom;
  writeSave(d);
}
