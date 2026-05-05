'use strict';

// =============================================================================
// Pause screen.
// Items: resume, ship config, options, [cheats →], quit to title.
// onCancel resumes. The cheats item only shows when cheat mode is enabled.
// =============================================================================

function pauseFooterText() {
  return pausePromptDOM('to resume') + (G.cheatMode ? '   ·   seed ' + seedText(G.seed) : '');
}

// DOM equivalent of pausePrompt() that doesn't depend on canvas.
function pausePromptDOM(action) {
  const hardBack = (typeof keyBoundToAction === 'function' && !keyBoundToAction('Backspace')) ? '/backspace' : '';
  return inputPromptLabel('pause') + hardBack + ' ' + action;
}

function makePauseScreen() {
  const screen = new Screen({
    id: 'pause',
    layout: 'modal',
    theme: 'default',
    title: 'paused',
    subtitle: G.cheatMode ? 'cheat mode' : '',
    footer: pauseFooterText,
    onCancel: () => { G.paused = false; },
  });

  screen.add(new Button({ label: 'resume',      onConfirm: () => { G.paused = false; } }));
  screen.add(new Button({ label: 'ship config', onConfirm: () => { G.showShipConfig = true; } }));
  screen.add(new Button({ label: 'options',     onConfirm: () => { G.paused = false; openOptionsMenu(G.st); } }));
  if (G.cheatMode) {
    screen.add(new Button({
      label: 'cheats →',
      onConfirm: () => { G.cheatSub = true; },
    }));
  }
  screen.add(new Button({
    label: 'quit to title',
    onConfirm: () => { saveGame(); G.ENC = null; G.site = null; openTitleMenu(); },
  }));

  return screen;
}

registerScreen('pause', makePauseScreen);
