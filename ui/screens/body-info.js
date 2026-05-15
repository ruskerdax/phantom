'use strict';

// =============================================================================
// Body info screen (OVERWORLD U-01).
// Two modes:
//   'enter'   — popup before the player enters a site; BSP shows enter/back.
//   'inspect' — read-only popup from system map (P4-02); back returns to map.
// Reads G.bodyInfoCtx = {siteRef, mode} set by the caller before mount.
// Pauses the world in 'enter' mode; 'inspect' mode is already under pause.
// =============================================================================

function openBodyInfo(siteRef, mode) {
  const m = mode === 'inspect' ? 'inspect' : 'enter';
  G.bodyInfoCtx = { siteRef, mode: m };
  if (m === 'enter') G.paused = true;
}

function closeBodyInfo() {
  const ctx = G.bodyInfoCtx;
  G.bodyInfoCtx = null;
  if (ctx && ctx.mode === 'enter') G.paused = false;
}

function makeBodyInfoScreen() {
  const ctx = G.bodyInfoCtx || { mode: 'enter', siteRef: null };
  const mode = ctx.mode === 'inspect' ? 'inspect' : 'enter';
  const siteRef = ctx.siteRef || null;

  const screen = new Screen({
    id: 'body-info',
    layout: 'modal',
    theme: 'default',
    title: 'body info',
    footer: () => bindHint('cancel', 'back'),
    onCancel: closeBodyInfo,
  });

  const panel = new BodySummaryPanel({
    siteRef,
    layout: mode === 'enter' ? 'enter' : 'inspect',
  });

  // Route the back button inside BSP through the screen's close path so the
  // bodyInfoCtx trigger flag clears (otherwise uiSync would re-mount).
  panel._back = () => closeBodyInfo();
  const origEnter = panel._enter.bind(panel);
  panel._enter = () => {
    closeBodyInfo();
    origEnter();
  };

  if (mode === 'enter') {
    panel.focusable = true;
    screen.add(panel);
    screen.populateBody = function() {
      if (!this._panelBody) return;
      this._panelBody.innerHTML = '';
      this._panelBody.appendChild(panel.render());
    };
  } else {
    // 'inspect' mode: BSP is non-focusable display; a single back Button drives input.
    screen.add(new Button({ label: 'back', onConfirm: closeBodyInfo }));
    screen.populateBody = function() {
      if (!this._panelBody) return;
      this._panelBody.innerHTML = '';
      this._panelBody.appendChild(panel.render());
      for (const w of this.widgets) this._panelBody.appendChild(w.render());
    };
  }

  return screen;
}

registerScreen('body-info', makeBodyInfoScreen);
