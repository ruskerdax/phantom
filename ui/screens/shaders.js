'use strict';

// =============================================================================
// Shader screen.
// Preset selection + generated parameter controls for curated GLSL presets.
// =============================================================================

function shaderParamDecimals(step) {
  const s = String(step);
  if (s.includes('e-')) return Math.min(6, parseInt(s.split('e-')[1], 10) || 2);
  const i = s.indexOf('.');
  return i >= 0 ? Math.min(6, s.length - i - 1) : 0;
}

function shaderParamFormat(def) {
  const places = shaderParamDecimals(def.step);
  return v => Number(v).toFixed(places);
}

function returnFromShaderMenu() {
  openOptionsMenu(G.optFrom);
}

function makeShadersScreen() {
  const screen = new Screen({
    id: 'shaders',
    layout: 'fullscreen',
    theme: 'default',
    title: 'shaders',
    footer: () => `${UI_GLYPH_DOM.left}${UI_GLYPH_DOM.right} adjust   ${pausePromptDOM('back')}`,
    onCancel: returnFromShaderMenu,
  });

  const status = screen.add(new TextRow({
    text: () => shaderStatusText(),
    size: 'sm',
    color: shaderSupported() ? 'var(--text-faint)' : 'var(--accent-danger)',
  }));

  screen.add(new Toggle({
    label: 'active',
    disabled: !shaderSupported(),
    get: () => !!G.shaderEnabled,
    set: v => { shaderSetEnabled(v); tone(v ? 1200 : 400, .08, 'square', .05); saveSettings(); },
  }));

  screen.add(new Toggle({
    label: 'shader ui',
    disabled: !shaderSupported(),
    get: () => G.shaderUiEnabled !== false,
    set: v => { shaderSetUiEnabled(v); tone(v ? 1000 : 360, .08, 'square', .05); saveSettings(); },
  }));

  screen.add(new Cycle({
    label: 'preset',
    values: SHADER_PRESET_VALUES,
    get: () => normalizeShaderPresetId(G.shaderPresetId),
    set: v => {
      shaderSetPreset(v);
      tone(900, .06, 'square', .04);
      saveSettings();
      if (typeof uiInvalidateScreen === 'function') uiInvalidateScreen();
    },
    format: v => (v && v.label) || String(v),
  }));

  const defs = shaderPresetParamDefs(normalizeShaderPresetId(G.shaderPresetId));
  if (defs.length) {
    screen.add(new Divider());
    for (const def of defs) {
      screen.add(new NumberStepper({
        label: def.label.toLowerCase(),
        min: def.min,
        max: def.max,
        step: def.step,
        get: () => shaderGetParamValue(def.id),
        set: v => {
          shaderSetParamValue(def.id, v);
          tone(760, .035, 'square', .025);
          saveSettings();
        },
        format: shaderParamFormat(def),
      }));
    }
  } else {
    screen.add(new TextRow({ text: 'no parameters', size: 'sm' }));
  }

  screen.add(new Divider());
  screen.add(new Button({
    label: 'reset parameters',
    cls: 'danger-button',
    onConfirm: () => {
      shaderResetCurrentParams();
      tone(420, .08, 'square', .05);
      saveSettings();
    },
  }));
  screen.add(new Button({
    label: 'return',
    onConfirm: returnFromShaderMenu,
  }));

  screen.tick = function() {
    if (status) status.setText(shaderStatusText());
    this.refresh();
  };

  screen.focusIdx = 1;
  return screen;
}

registerScreen('shaders', makeShadersScreen);
