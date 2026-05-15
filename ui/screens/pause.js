'use strict';

// =============================================================================
// Pause screen (02-b two-pane).
// Left: menu items — resume, system map, info, options, [cheats →],
//   quit to title. Right: ship readout body (06-b) inline with live energy %.
// onCancel resumes. The cheats item only shows when cheat mode is enabled.
// =============================================================================

function pauseFooterText() {
  return pausePromptDOM('to resume') + (G.cheatMode ? '   ·   seed ' + seedText(G.seed) : '');
}

function pausePromptDOM(action) { return bindHint('pause', action); }

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

  screen.add(new Button({ label: 'resume',        onConfirm: () => { G.paused = false; } }));
  screen.add(new Button({ label: 'system map',    onConfirm: () => { G.systemMapOpen = true; } }));
  screen.add(new Button({ label: 'info',          onConfirm: () => { G.infoOpen = true; } }));
  screen.add(new Button({ label: 'options',       onConfirm: () => { G.paused = false; openOptionsMenu(G.st); } }));
  if (G.cheatMode) {
    screen.add(new Button({ label: 'cheats →',    onConfirm: () => { G.cheatSub = true; } }));
  }
  screen.add(new Button({
    label: 'quit to title',
    onConfirm: () => { saveGame(); G.ENC = null; G.site = null; openTitleMenu(); },
  }));

  screen.populateBody = function() {
    if (!this._panelBody) return;
    this._panelBody.innerHTML = '';

    const panel = this._panelBody.parentElement;
    if (panel && panel.classList.contains('panel')) {
      panel.style.minWidth = '720px';
      panel.style.maxWidth = '960px';
    }

    const grid = document.createElement('div');
    grid.className = 'pause-grid';

    const menuEl = document.createElement('div');
    menuEl.className = 'pause-menu';

    const dashEl = document.createElement('div');
    dashEl.className = 'pause-dash';

    grid.appendChild(menuEl);
    grid.appendChild(dashEl);
    this._panelBody.appendChild(grid);

    for (const w of this.widgets) menuEl.appendChild(w.render());

    this._dashEl = dashEl;
    this._readoutRefs = populateShipReadoutBody(dashEl, { liveEnergy: true });
  };

  screen.tick = function() {
    if (this._footerEl && typeof this.footer === 'function') {
      const txt = this.footer();
      if (this._footerEl.textContent !== txt) {
        this._footerEl.textContent = txt || '';
        if (typeof shaderMarkUiDirty === 'function') shaderMarkUiDirty();
      }
    }
    for (const w of this.widgets) w.tick && w.tick();

    const row = this._readoutRefs?.energyRow;
    if (row) {
      row.refresh();
      const s = G.OW?.s;
      if (row._val) {
        const pct = (s && s.maxEnergy > 0) ? (100 * s.energy / s.maxEnergy) : 100;
        row._val.style.color = pct < 30 ? 'var(--accent-warn)' : '';
      }
    }
  };

  return screen;
}

registerScreen('pause', makePauseScreen);
