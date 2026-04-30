'use strict';

const SAVE_KEY = 'phantom_save_v2';
const SETTINGS_VERSION = 1;
const DEFAULT_VOLUME = 7;

function defaultSave() {
  const power = defaultPowerForChassisId('kestrel');
  return {
    credits: 0,
    stake: 0,
    licenses: ['kestrel', 'shield_std', 'mass driver', 'pulse laser'],
    loadout: {chassis:'kestrel', battery:power.battery, reactor:power.reactor, weapons:['mass driver','pulse laser'], aux:null, shield:'shield_std'},
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
    lastLocation: null,
    currentHp: null,
    currentEnergy: null,
    currentShieldHp: null,
    currentShieldRechargeProgress: 0,
    currentShieldDrainProgress: 0,
    currentShieldEnabled: true,
    currentShieldOffline: false,
    settingsVersion: SETTINGS_VERSION,
    sfxVol: DEFAULT_VOLUME,
    musVol: DEFAULT_VOLUME,
    dynamicZoom: true,
    renderQuality: 'full',
  };
}

function normalizeLastLocation(loc) {
  if (!loc || typeof loc !== 'object') return null;
  const kinds = ['base', 'slipgate', 'planet', 'asteroid', 'hbase'];
  if (!kinds.includes(loc.kind)) return null;
  if (typeof loc.seed !== 'number' || !Number.isFinite(loc.seed)) return null;
  const seed = loc.seed >>> 0;
  let index = null;
  if (loc.kind === 'planet' || loc.kind === 'asteroid') {
    if (typeof loc.index !== 'number' || !Number.isFinite(loc.index)) return null;
    index = Math.floor(loc.index);
    if (index < 0) return null;
  }
  return {seed, kind: loc.kind, index};
}

function isShieldId(id) {
  return typeof id === 'string' && SHIELDS.some(s => s.id === id);
}
function isBatteryId(id) {
  return typeof id === 'string' && BATTERIES.some(b => b.id === id);
}
function isReactorId(id) {
  return typeof id === 'string' && REACTORS.some(r => r.id === id);
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
    if (!('shield' in d.loadout))            d.loadout.shield = isShieldId(d.loadout.aux) ? d.loadout.aux : def.loadout.shield;
    else if (d.loadout.shield !== null && !isShieldId(d.loadout.shield)) d.loadout.shield = def.loadout.shield;
    if (isShieldId(d.loadout.aux))           d.loadout.aux = null;
    if (d.loadout.aux !== null && !AUX_ITEMS.some(a => a.id === d.loadout.aux)) d.loadout.aux = def.loadout.aux;
    if (typeof d.loadout.chassis !== 'string') d.loadout.chassis = def.loadout.chassis;
    const power = defaultPowerForChassisId(d.loadout.chassis);
    if (!isBatteryId(d.loadout.battery))     d.loadout.battery = isBatteryId(power.battery) ? power.battery : def.loadout.battery;
    if (!isReactorId(d.loadout.reactor))     d.loadout.reactor = isReactorId(power.reactor) ? power.reactor : def.loadout.reactor;
    d.licenses = d.licenses.map(id => id === 'laser cannon' ? 'pulse laser' : id);
    d.loadout.weapons = d.loadout.weapons.map(id => id === 'laser cannon' ? 'pulse laser' : id);
    d.licenses = [...new Set(d.licenses)];
    if (!Array.isArray(d.visitedSeeds))      d.visitedSeeds = [];
    if (typeof d.tutorialDone !== 'boolean') d.tutorialDone = false;
    if (!('prevSeed' in d))                  d.prevSeed = null;
    if (!d.systemStates || typeof d.systemStates !== 'object') d.systemStates = {};
    if (typeof d.needsRebuild !== 'boolean') d.needsRebuild = false;
    if (!Array.isArray(d.cleared))           d.cleared = def.cleared;
    if (!d.lvState || typeof d.lvState !== 'object') d.lvState = {};
    if (typeof d.dynamicZoom !== 'boolean')  d.dynamicZoom = true;
    if (!d.settingsVersion) {
      if (d.sfxVol === 10) d.sfxVol = DEFAULT_VOLUME;
      if (d.musVol === 10) d.musVol = DEFAULT_VOLUME;
    }
    if (!Number.isFinite(d.sfxVol)) d.sfxVol = DEFAULT_VOLUME;
    if (!Number.isFinite(d.musVol)) d.musVol = DEFAULT_VOLUME;
    d.sfxVol = Math.max(0, Math.min(10, Math.round(d.sfxVol)));
    d.musVol = Math.max(0, Math.min(10, Math.round(d.musVol)));
    d.settingsVersion = SETTINGS_VERSION;
    d.renderQuality = normalizeRenderQuality(d.renderQuality);
    d.lastLocation = normalizeLastLocation(d.lastLocation);
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
  if (typeof saveActiveSiteState === 'function') saveActiveSiteState();
  const s = G.ENC?.s ?? G.site?.s ?? G.OW?.s;
  if (s) syncShipEnergyProfile(s);
  const power = defaultPowerForChassisId(G.loadout.chassis);
  const fallbackPower = defaultPowerForChassisId('kestrel');
  const battery = isBatteryId(G.loadout.battery) ? G.loadout.battery : (isBatteryId(power.battery) ? power.battery : fallbackPower.battery);
  const reactor = isReactorId(G.loadout.reactor) ? G.loadout.reactor : (isReactorId(power.reactor) ? power.reactor : fallbackPower.reactor);
  return {
    credits: G.credits,
    stake: G.stake,
    licenses: [...G.licenses],
    loadout: {chassis:G.loadout.chassis, battery, reactor, weapons:[...G.loadout.weapons], aux:G.loadout.aux??null, shield:G.loadout.shield},
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
    lastLocation: normalizeLastLocation(G.lastLocation),
    currentHp: (s?.alive && s.hp > 0) ? s.hp : null,
    currentEnergy: (s?.alive && s.hp > 0) ? s.energy : null,
    currentShieldHp: (s?.alive && s.hp > 0 && s.shieldId) ? s.shieldHp : null,
    currentShieldRechargeProgress: (s?.alive && s.hp > 0 && s.shieldId) ? s.shieldRechargeProgress : 0,
    currentShieldDrainProgress: (s?.alive && s.hp > 0 && s.shieldId) ? s.shieldDrainProgress : 0,
    currentShieldEnabled: s?.shieldEnabled !== false,
    currentShieldOffline: !!s?.shieldOffline,
    settingsVersion: SETTINGS_VERSION,
    sfxVol: G.sfxVol,
    musVol: G.musVol,
    dynamicZoom: G.dynamicZoom,
    renderQuality: normalizeRenderQuality(G.renderQuality),
  };
}

function saveGame() { writeSave(buildSaveData()); }
function saveSettings() {
  const d = (G.OW||G.ENC||G.site) ? buildSaveData() : (loadSave() || defaultSave());
  d.sfxVol = G.sfxVol;
  d.musVol = G.musVol;
  d.dynamicZoom = G.dynamicZoom;
  d.renderQuality = normalizeRenderQuality(G.renderQuality);
  writeSave(d);
}
