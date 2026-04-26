'use strict';

const SAVE_KEY = 'phantom_save';

function defaultSave() {
  return {
    credits: 0,
    bounty: 0,
    licenses: ['kestrel', 'shield_std', 'mass driver', 'laser cannon'],
    loadout: {chassis:'kestrel', weapons:['mass driver','laser cannon'], aux:'shield_std'},
    cleared: [false, false, false],
    hbCleared: false,
    hbState: null,
    lvState: {},
    slipgateActive: false,
    seed: 0,
    visitedSeeds: [],
    currentHp: null,
    currentEnergy: null,
    sfxVol: 10,
    musVol: 10,
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
    if (!Array.isArray(d.cleared))           d.cleared = def.cleared;
    if (!d.lvState || typeof d.lvState !== 'object') d.lvState = {};
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
    bounty: G.bounty,
    licenses: [...G.licenses],
    loadout: {chassis:G.loadout.chassis, weapons:[...G.loadout.weapons], aux:G.loadout.aux},
    cleared: [...G.cleared],
    hbCleared: G.hbCleared,
    hbState: G.hbState,
    lvState: G.lvState ?? {},
    slipgateActive: G.slipgateActive,
    seed: G.seed,
    visitedSeeds: [...G.visitedSeeds],
    currentHp: s?.hp ?? null,
    currentEnergy: s?.energy ?? null,
    sfxVol: G.sfxVol,
    musVol: G.musVol,
  };
}

function saveGame() { writeSave(buildSaveData()); }
