'use strict';

// =============================================================================
// Clear-data confirmation dialog (red theme).
// Mounted whenever G.clearDataSel !== undefined (set from Options).
// =============================================================================

function makeClearDataScreen() {
  const screen = new Screen({
    id: 'clear-data',
    layout: 'modal',
    theme: 'danger',
    title: 'clear all game data?',
  });

  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'center-text muted';
    msg.style.padding = '6px 0 14px';
    msg.innerHTML = 'are you sure?<br>this will reset the game.';
    this._panelBody.appendChild(msg);
    for (const w of this.widgets) this._panelBody.appendChild(w.render());
  };

  screen.add(new ButtonPair({
    left:  { label: 'back',    onConfirm: () => { delete G.clearDataSel; } },
    right: { label: 'confirm', cls: 'danger', onConfirm: () => {
      resetSave();
      delete G.clearDataSel;
      openTitleMenu();
      tone(220, .3, 'sawtooth', .1);
    }},
    defaultSel: 0,
  }));

  screen.onCancel = () => { delete G.clearDataSel; };

  return screen;
}

registerScreen('clear-data', makeClearDataScreen);
