'use strict';

// =============================================================================
// PHANTOM UI — input bridge.
//
// Glue between the existing keyboard/gamepad pipeline (menuInput / iPause /
// iEnter / etc.) and the new screen stack. main.js calls uiUpdateFrame() once
// per frame; if a screen is on the stack, it consumes input and the legacy
// updX functions are skipped for that frame.
//
// Each game state (G.st) used to map directly to a draw + update pair on the
// canvas; with DOM menus, those states map to a screen factory instead.
// uiSyncWithGameState() ensures the right screen is mounted whenever G.st (or
// G.paused) changes, so the rest of the game can treat the menu layer as
// declarative — set state, the right screen appears.
// =============================================================================

const UI_SCREEN_FACTORIES = {};   // populated by ui/screens/*.js via registerScreen()
let UI_LAST_KEY = '';

function registerScreen(key, factory) { UI_SCREEN_FACTORIES[key] = factory; }

// Compute the screen identity that should be mounted right now. Returns a
// string key (matched against UI_SCREEN_FACTORIES) or '' for "no screen".
function uiCurrentScreenKey() {
  if (G.seedInputOpen) return 'seed-input';
  if (G.paused) {
    if (G.cheatSub) return 'cheats';
    if (G.showShipConfig) return 'ship-config';
    if (G.clearDataSel !== undefined) return 'clear-data';
    return 'pause';
  }
  switch (G.st) {
    case 'title':       return 'title';
    case 'options':     return G.clearDataSel !== undefined ? 'clear-data' : 'options';
    case 'controls':    return 'controls';
    case 'rebuild':     return 'rebuild';
    case 'base':        return 'base';
    case 'slipgate':    return 'slipgate';
    case 'over':        return 'banner-game-over';
    case 'done':        return 'banner-sector-cleared';
    default:            return '';
  }
}

// Mount/unmount screens to match game state. Called every frame; cheap when
// the key hasn't changed.
function uiSyncWithGameState() {
  const key = uiCurrentScreenKey();
  if (key === UI_LAST_KEY) return;
  UI_LAST_KEY = key;
  uiClear();
  if (!key) return;
  const factory = UI_SCREEN_FACTORIES[key];
  if (factory) {
    const screen = factory();
    if (screen) uiPush(screen);
  }
}

// Force a refresh on the current screen (after a state change that doesn't
// swap screens — e.g. confirming a value).
function uiRefreshTop() {
  const top = uiTopScreen();
  if (top) top.refresh();
}

// Per-frame entry point called from main.js. Returns true if the UI consumed
// input (meaning gameplay/state-machine logic should be skipped).
function uiUpdateFrame() {
  uiSyncWithGameState();
  if (!uiHasScreens()) return false;
  uiTick();
  // Dialog overlays often need menuInput; the screen handler consumes it.
  const m = (typeof menuInput === 'function') ? menuInput() : null;
  if (m) uiHandleInput(m);
  return true;
}
