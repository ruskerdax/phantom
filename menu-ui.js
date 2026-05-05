'use strict';

// =============================================================================
// Menu helpers retained from the legacy canvas UI layer.
//
// All canvas-drawing helpers (drawMenuPanel, drawMenuTitle, drawMenuTabs, etc.)
// have moved to the DOM widget layer in ui/. This file now only contains the
// pure data helpers still used by surviving game code:
//
//   UI_GLYPH         — glyph constants (also referenced by base.js label
//                      generation in shopActionOpts).
//   moveTabSelection — left/right tab selector (used by the base shop screen).
//   inputPromptLabel — turn an action id into a printable key/btn label,
//                      used inside footers across the new DOM screens.
//   seedText         — hex-format the world seed for display.
// =============================================================================

const UI_GLYPH = {
  pointer: '▶',
  left:    '◄',
  right:   '►',
  back:    '◀',
  up:      '↑',
  down:    '↓',
  star:    '★',
  dash:    '—',
  arrow:   '→',
};

function moveTabSelection(sel, tabs, left, right) {
  const max = (tabs?.length ?? 0) - 1;
  if (max < 0) return 0;
  if (left)  return sel <= 0 ? max : sel - 1;
  if (right) return sel >= max ? 0 : sel + 1;
  return Math.max(0, Math.min(max, sel));
}

function inputPromptLabel(id) {
  const b = BND?.[id];
  const labels = [];
  if (b?.key != null) labels.push(fmtKey(b.key));
  if (GP?.connected && b?.btn != null) labels.push(fmtBtn(b.btn));
  if (labels.length) return labels.join('/').toLowerCase();
  return (ACT_DEFS.find(a => a.id === id)?.label || id).toLowerCase();
}

function seedText(seed) { return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0'); }
