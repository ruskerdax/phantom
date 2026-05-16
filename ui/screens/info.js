'use strict';

// =============================================================================
// Info submenu (P4-03).
// Opened from pause (G.infoOpen). Lifetime totals readout. Encyclopedia
// content is a future expansion.
// =============================================================================

function makeInfoScreen() {
  const screen = new Screen({
    id: 'info',
    layout: 'modal',
    theme: 'default',
    title: 'info',
    footer: () => `${bindHint('confirm', 'back')}   ${bindHint('cancel', 'back')}`,
    onCancel: () => { G.infoOpen = false; },
  });

  screen.add(new SectionHeader({ label: 'lifetime' }));
  screen.add(new KeyValueRow({ label: 'enemies killed',     value: () => String(G.totals?.kills ?? 0) }));
  screen.add(new KeyValueRow({ label: 'systems visited',    value: () => String(G.totals?.systemsVisited ?? 0) }));
  screen.add(new KeyValueRow({ label: 'total stake earned', value: () => String(G.totals?.stakeEarned ?? 0) }));

  // TODO encyclopedia

  screen.add(new Button({ label: 'back', onConfirm: () => { G.infoOpen = false; } }));

  return screen;
}

registerScreen('info', makeInfoScreen);
