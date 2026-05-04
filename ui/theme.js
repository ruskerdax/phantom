'use strict';

// =============================================================================
// PHANTOM UI THEME — JS mirror of theme.css custom properties.
// Read at startup and on theme changes; canvas HUD reads from THEME so menu
// (DOM) and HUD (canvas) stay in sync. To recolor everything, edit theme.css.
// =============================================================================

const THEME = {
  accent:      '#00ff88',
  accentSoft:  '#aaffcc',
  accentDim:   '#2a6a4a',
  accentDeep:  '#0a6',
  accentWarn:  '#ff8844',
  accentDanger:'#ff4040',
  accentCheat: '#ffee44',
  accentSlip:  '#cc99ff',
  bg:          '#000',
  panelBg:     'rgba(0,12,8,0.95)',
  scrim:       'rgba(0,0,0,0.78)',
  divider:     '#1a4a2a',
  text:        '#cce',
  textStrong:  '#aaffcc',
  textDim:     '#668',
  textFaint:   '#446',
  textFooter:  '#334',
  font:        'MajorMonoDisplay, monospace',
};

// Read CSS custom properties from :root and overwrite THEME so the canvas HUD
// always matches the live stylesheet. Called once at boot, after CSS loads.
function syncThemeFromCSS() {
  if (typeof document === 'undefined') return;
  const cs = getComputedStyle(document.documentElement);
  const map = {
    '--accent':        'accent',
    '--accent-soft':   'accentSoft',
    '--accent-dim':    'accentDim',
    '--accent-deep':   'accentDeep',
    '--accent-warn':   'accentWarn',
    '--accent-danger': 'accentDanger',
    '--accent-cheat':  'accentCheat',
    '--accent-slip':   'accentSlip',
    '--text':          'text',
    '--text-strong':   'textStrong',
    '--text-dim':      'textDim',
    '--text-faint':    'textFaint',
    '--text-footer':   'textFooter',
    '--divider':       'divider',
  };
  for (const [css, key] of Object.entries(map)) {
    const v = cs.getPropertyValue(css).trim();
    if (v) THEME[key] = v;
  }
}
