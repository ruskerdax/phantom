'use strict';

// =============================================================================
// Options screen.
// Sliders, toggles, cycles, and a launcher into the controls screen + clear-data
// confirmation dialog.
// =============================================================================

function makeOptionsScreen() {
  const screen = new Screen({
    id: 'options',
    layout: 'fullscreen',
    theme: 'default',
    title: 'options',
    footer: () => `${UI_GLYPH_DOM.left}${UI_GLYPH_DOM.right} adjust   enter / ${pausePromptDOM('back')}`,
    onCancel: returnFromOptions,
  });

  screen.add(new Button({
    label: 'controls →',
    onConfirm: () => openControlsMenu(),
  }));
  screen.add(new Button({
    label: 'shader settings ->',
    disabled: !shaderSupported(),
    onConfirm: () => openShaderMenu(),
  }));
  screen.add(new Slider({
    label: 'sound effects',
    get: () => G.sfxVol,
    set: v => { G.sfxVol = v; tone(900, .04, 'square', .05); saveSettings(); },
  }));
  screen.add(new Slider({
    label: 'music',
    get: () => G.musVol,
    set: v => { G.musVol = v; saveSettings(); },
  }));
  screen.add(new Toggle({
    label: 'dynamic zoom',
    get: () => G.dynamicZoom !== false,
    set: v => { G.dynamicZoom = v; tone(v ? 1200 : 400, .08, 'square', .05); saveSettings(); },
  }));
  screen.add(new Cycle({
    label: 'visual fx',
    values: RENDER_QUALITY_VALUES,
    get: () => normalizeRenderQuality(G.renderQuality),
    set: v => { G.renderQuality = v; tone(v === 'full' ? 1200 : v === 'reduced' ? 800 : 400, .08, 'square', .05); saveSettings(); },
    format: v => (typeof v === 'string' ? v : v?.id || 'full'),
  }));
  screen.add(new Toggle({
    label: 'shaders',
    disabled: !shaderSupported(),
    get: () => !!G.shaderEnabled,
    set: v => { shaderSetEnabled(v); tone(v ? 1200 : 400, .08, 'square', .05); saveSettings(); },
  }));
  screen.add(new Toggle({
    label: 'cheat mode',
    get: () => !!G.cheatMode,
    set: v => { G.cheatMode = v; tone(v ? 1200 : 400, .08, 'square', .05); },
  }));
  screen.add(new Toggle({
    label: 'fullscreen',
    get: () => !!document.fullscreenElement,
    set: v => {
      if (v) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
      tone(v ? 1200 : 400, .08, 'square', .05);
    },
  }));
  screen.add(new Spacer({ size: 'sm' }));
  screen.add(new Button({
    label: 'clear game data',
    cls: 'danger-button',
    onConfirm: () => { G.clearDataSel = 0; },
  }));
  screen.add(new Spacer({ size: 'sm' }));
  screen.add(new Button({
    label: 'return',
    onConfirm: returnFromOptions,
  }));

  return screen;
}

registerScreen('options', makeOptionsScreen);
