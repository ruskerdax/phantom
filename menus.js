'use strict';

// =============================================================================
// Legacy menus.js shim. The full canvas menu system has moved to the DOM
// widget layer in ui/. Only the cross-screen helpers shared by other files
// remain here.
//
// returnFromOptions — used by the Options DOM screen, dispatches back to the
// title screen or the previously-active gameplay state plus pause overlay.
// =============================================================================

function returnFromOptions() {
  if (G.optFrom === 'title') {
    openTitleMenu();
  } else {
    G.st = G.optFrom;
    openPauseMenu();
  }
}
