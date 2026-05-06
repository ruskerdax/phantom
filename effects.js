'use strict';

const EFFECT_DEFS = [
  {
    id: 'screen-warp',
    label: 'screen warp',
    category: 'screen',
    defaultEnabled: true,
    description: 'Screen-space distortion effects from major weapon and world events.',
    defaultIntensity: 1,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    id: 'object-bloom',
    label: 'object bloom',
    category: 'object',
    defaultEnabled: true,
    description: 'Extra glow and bloom on selected gameplay objects.',
    defaultIntensity: 1,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    id: 'object-color',
    label: 'object color',
    category: 'object',
    defaultEnabled: true,
    description: 'Color adjustment and correction on selected gameplay objects.',
    defaultIntensity: 1,
    min: 0,
    max: 1,
    step: 0.05,
  },
];

const FX = {
  layers: {},
  ctx: {},
  w: 0,
  h: 0,
  frameActive: false,
  frameDirty: false,
  needsPresent: false,
  events: [],
};

const EFFECT_LAYER_KEYS = ['bloomSource', 'mask'];

function effectDefs() {
  return EFFECT_DEFS.map(def => ({...def}));
}

function effectDefById(id) {
  return EFFECT_DEFS.find(def => def.id === id) || null;
}

function effectDefaultSetting(def) {
  const out = {enabled: def.defaultEnabled !== false};
  if (Number.isFinite(def.defaultIntensity)) out.intensity = normalizeEffectIntensity(def, def.defaultIntensity);
  return out;
}

function normalizeEffectIntensity(def, value) {
  const fallback = Number.isFinite(def.defaultIntensity) ? def.defaultIntensity : 1;
  let n = Number(value);
  if (!Number.isFinite(n)) n = fallback;
  const min = Number.isFinite(def.min) ? def.min : 0;
  const max = Number.isFinite(def.max) ? def.max : 1;
  const step = Number.isFinite(def.step) && def.step > 0 ? def.step : 0;
  n = Math.max(min, Math.min(max, n));
  if (step > 0) n = min + Math.round((n - min) / step) * step;
  return Number(Math.max(min, Math.min(max, n)).toFixed(6));
}

function normalizeEffectSetting(def, raw) {
  const base = effectDefaultSetting(def);
  if (typeof raw === 'boolean') return {...base, enabled: raw};
  if (!raw || typeof raw !== 'object') return base;
  const out = {...base};
  if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
  if (Number.isFinite(def.defaultIntensity) || Number.isFinite(raw.intensity)) {
    out.intensity = normalizeEffectIntensity(def, raw.intensity);
  }
  return out;
}

function normalizeEffectSettings(data) {
  const src = data && typeof data === 'object' ? data : {};
  const out = {};
  for (const def of EFFECT_DEFS) out[def.id] = normalizeEffectSetting(def, src[def.id]);
  return out;
}

function effectSetting(id) {
  const def = effectDefById(id);
  if (!def) return null;
  if (typeof G !== 'undefined') {
    G.effectSettings = normalizeEffectSettings(G.effectSettings);
    return G.effectSettings[id];
  }
  return effectDefaultSetting(def);
}

function effectEnabled(id) {
  if (typeof G !== 'undefined' && G.effectsEnabled === false) return false;
  const setting = effectSetting(id);
  return !!setting?.enabled;
}

function setEffectsEnabled(enabled) {
  if (typeof G === 'undefined') return;
  G.effectsEnabled = !!enabled;
  G.effectSettings = normalizeEffectSettings(G.effectSettings);
  if (!G.effectsEnabled) {
    FX.events.length = 0;
    effectsResetFrame();
  }
}

function setEffectEnabled(id, enabled) {
  const def = effectDefById(id);
  if (!def || typeof G === 'undefined') return;
  G.effectSettings = normalizeEffectSettings(G.effectSettings);
  G.effectSettings[id].enabled = !!enabled;
  if (!enabled) {
    for (let i = FX.events.length - 1; i >= 0; i--) {
      if ((FX.events[i].payload?.effectId || FX.events[i].payload?.effect) === id) FX.events.splice(i, 1);
    }
    effectsResetFrame();
  }
}

function setEffectIntensity(id, value) {
  const def = effectDefById(id);
  if (!def || typeof G === 'undefined') return;
  G.effectSettings = normalizeEffectSettings(G.effectSettings);
  G.effectSettings[id].intensity = normalizeEffectIntensity(def, value);
}

function effectsAnyEffectEnabled() {
  if (typeof G === 'undefined') return false;
  G.effectSettings = normalizeEffectSettings(G.effectSettings);
  return EFFECT_DEFS.some(def => G.effectSettings[def.id]?.enabled);
}

function effectsActive() {
  return !!(typeof G !== 'undefined' && G.effectsEnabled !== false && effectsAnyEffectEnabled());
}

function effectsEnsureLayer(key, w, h) {
  let layer = FX.layers[key];
  if (!layer) {
    layer = document.createElement('canvas');
    FX.layers[key] = layer;
    FX.ctx[key] = layer.getContext('2d');
  }
  if (layer.width !== w) layer.width = w;
  if (layer.height !== h) layer.height = h;
}

function effectsResize(sourceCanvas) {
  const w = sourceCanvas?.width || Math.round(W * CANVAS_PIXEL_RATIO);
  const h = sourceCanvas?.height || Math.round(H * CANVAS_PIXEL_RATIO);
  if (FX.w === w && FX.h === h && EFFECT_LAYER_KEYS.every(k => FX.layers[k])) return;
  FX.w = w;
  FX.h = h;
  for (const key of EFFECT_LAYER_KEYS) effectsEnsureLayer(key, w, h);
  effectsClearLayers();
}

function effectsClearLayers() {
  for (const key of EFFECT_LAYER_KEYS) {
    const ctx = FX.ctx[key];
    if (!ctx) continue;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, FX.w, FX.h);
    ctx.setTransform(CANVAS_PIXEL_RATIO, 0, 0, CANVAS_PIXEL_RATIO, 0, 0);
  }
  FX.frameDirty = false;
  FX.needsPresent = false;
}

function effectsResetFrame() {
  FX.frameActive = false;
  FX.frameDirty = false;
  FX.needsPresent = false;
  effectsClearLayers();
}

function effectsTick() {
  if (!effectsActive()) {
    FX.events.length = 0;
    return;
  }
  for (let i = FX.events.length - 1; i >= 0; i--) {
    const ev = FX.events[i];
    ev.age = (ev.age || 0) + 1;
    if (ev.duration != null && ev.age >= ev.duration) FX.events.splice(i, 1);
  }
}

function effectsEventsRequirePresent() {
  if (!effectsActive()) return false;
  for (const ev of FX.events) {
    const payload = ev.payload || {};
    const effectId = payload.effectId || payload.effect || null;
    if (payload.requiresPresent && (!effectId || effectEnabled(effectId))) return true;
  }
  return false;
}

function effectsBeginFrame(sourceCanvas = typeof CV !== 'undefined' ? CV : null) {
  FX.frameActive = false;
  if (!effectsActive()) {
    FX.frameDirty = false;
    FX.needsPresent = false;
    return;
  }
  effectsResize(sourceCanvas);
  effectsClearLayers();
  FX.needsPresent = effectsEventsRequirePresent();
  FX.frameActive = true;
}

function effectsEndFrame() {
  FX.frameActive = false;
}

function effectsLayer(name) {
  return FX.layers[name] || null;
}

function effectsLayerContext(name) {
  return FX.ctx[name] || null;
}

function effectsApplyDrawTransform(ctx, opts = {}) {
  if (opts.transform) {
    ctx.setTransform(opts.transform);
    return;
  }
  if (opts.space === 'screen') {
    ctx.setTransform(CANVAS_PIXEL_RATIO, 0, 0, CANVAS_PIXEL_RATIO, 0, 0);
    return;
  }
  if (opts.useCurrentTransform !== false && typeof cx !== 'undefined' && cx?.getTransform) {
    const t = cx.getTransform();
    ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
    return;
  }
  ctx.setTransform(CANVAS_PIXEL_RATIO, 0, 0, CANVAS_PIXEL_RATIO, 0, 0);
}

function effectsMark(layer, opts = {}, drawMaskFn = null) {
  if (!FX.frameActive || !effectsActive()) return false;
  const effectId = opts.effectId || opts.effect || null;
  if (effectId && !effectEnabled(effectId)) return false;
  const ctx = effectsLayerContext(layer);
  if (!ctx || typeof drawMaskFn !== 'function') return false;
  ctx.save();
  effectsApplyDrawTransform(ctx, opts);
  ctx.globalAlpha = Number.isFinite(opts.alpha) ? opts.alpha : 1;
  ctx.fillStyle = opts.fill || opts.color || '#fff';
  ctx.strokeStyle = opts.stroke || opts.color || '#fff';
  if (Number.isFinite(opts.lineWidth)) ctx.lineWidth = opts.lineWidth;
  drawMaskFn(ctx);
  ctx.restore();
  FX.frameDirty = true;
  FX.needsPresent = !!(FX.needsPresent || opts.requiresPresent);
  return true;
}

function effectsMarkCircle(layer, effectId, x, y, r, opts = {}) {
  return effectsMark(layer, {...opts, effectId}, ctx => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (opts.strokeOnly) ctx.stroke();
    else ctx.fill();
  });
}

function effectsMarkSegment(layer, effectId, x1, y1, x2, y2, width = 1, opts = {}) {
  return effectsMark(layer, {...opts, effectId, lineWidth: width}, ctx => {
    const oldCap = ctx.lineCap;
    ctx.lineCap = opts.lineCap || 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineCap = oldCap;
  });
}

function effectsMarkArc(layer, effectId, x, y, r, a0, a1, opts = {}) {
  return effectsMark(layer, {...opts, effectId}, ctx => {
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    if (opts.fill) ctx.fill();
    else ctx.stroke();
  });
}

function effectsMarkHull(layer, effectId, hull, opts = {}) {
  if (!hull) return false;
  return effectsMark(layer, {...opts, effectId}, ctx => {
    ctx.save();
    ctx.translate(hull.x || 0, hull.y || 0);
    ctx.rotate(hull.a || 0);
    const scale = Number.isFinite(hull.scale) && hull.scale > 0 ? hull.scale : 1;
    if (scale !== 1) ctx.scale(scale, scale);
    effectsDrawHullParts(ctx, hull.parts || [], opts);
    ctx.restore();
  });
}

function effectsDrawHullParts(ctx, parts, opts = {}) {
  for (const raw of parts) {
    const part = typeof hullLocalPart === 'function' ? hullLocalPart(raw) : raw;
    if (part.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(part.x || 0, part.y || 0, part.r || 0, 0, Math.PI * 2);
      opts.strokeOnly ? ctx.stroke() : ctx.fill();
    } else if (part.kind === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(part.x || 0, part.y || 0, part.rx || 0, part.ry || 0, 0, 0, Math.PI * 2);
      opts.strokeOnly ? ctx.stroke() : ctx.fill();
    } else if (part.kind === 'capsule') {
      const oldCap = ctx.lineCap, oldWidth = ctx.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(oldWidth, (part.r || 1) * 2);
      ctx.beginPath();
      ctx.moveTo(part.x1, part.y1);
      ctx.lineTo(part.x2, part.y2);
      ctx.stroke();
      ctx.lineCap = oldCap;
      ctx.lineWidth = oldWidth;
    } else if (part.kind === 'poly' && Array.isArray(part.pts)) {
      ctx.beginPath();
      for (let i = 0; i < part.pts.length; i++) {
        const p = part.pts[i];
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.closePath();
      opts.strokeOnly ? ctx.stroke() : ctx.fill();
    }
  }
}

function effectsMarkBeam(layer, effectId, beam, opts = {}) {
  if (!beam) return false;
  return effectsMarkSegment(layer, effectId, beam.x1, beam.y1, beam.x2, beam.y2, opts.width ?? beam.w ?? 2, opts);
}

function effectsEmit(kind, payload = {}) {
  if (!effectsActive()) return null;
  const effectId = payload.effectId || payload.effect || null;
  if (effectId && !effectEnabled(effectId)) return null;
  const ev = {
    kind,
    payload: {...payload},
    age: 0,
    duration: Number.isFinite(payload.duration) ? Math.max(0, Math.floor(payload.duration)) : null,
  };
  FX.events.push(ev);
  if (payload.requiresPresent) FX.needsPresent = true;
  return ev;
}

function effectsRequireShaderPresent() {
  return !!(effectsActive() && (FX.needsPresent || effectsEventsRequirePresent()));
}

function effectsBeforeShaderPasses(ctx) {
  return ctx?.inputTexture || null;
}
