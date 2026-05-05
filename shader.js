'use strict';

const SHADER_GL_ATTRS = {
  alpha: false,
  depth: false,
  stencil: false,
  antialias: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
};

const SHADER_IDENTITY_MVP = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

const SHADER_QUAD = new Float32Array([
  -1, -1, 0, 0,
   1, -1, 1, 0,
  -1,  1, 0, 1,
   1,  1, 1, 1,
]);

const SHADER_UI_CAPTURE_INTERVAL_MS = 1000 / 15;
const SHADER_SVG_NS = 'http://www.w3.org/2000/svg';
const SHADER_XHTML_NS = 'http://www.w3.org/1999/xhtml';

const SHADER = {
  source: null,
  canvas: null,
  gl: null,
  version: 0,
  supported: false,
  renderer: '',
  status: 'not initialized',
  statusKind: 'info',
  compiled: null,
  compiledPresetId: null,
  sourceTexture: null,
  quadBuffer: null,
  targets: [],
  targetW: 0,
  targetH: 0,
  maxTextureSize: 0,
  failed: false,
  compositeCanvas: null,
  compositeCtx: null,
  uiCaptureCanvas: null,
  uiCaptureCtx: null,
  uiCaptureDirty: true,
  uiCapturePending: false,
  uiCaptureGeneration: 0,
  uiCaptureLastStartMs: -Infinity,
  uiCaptureLastSuccessMs: -Infinity,
  uiCaptureNextRetryMs: 0,
  uiCaptureReady: false,
  uiCaptureFailed: false,
  uiCaptureStatus: '',
  uiCaptureUseManual: false,
  cssUrlCache: new Map(),
  manualImageCache: new Map(),
};

let SHADER_CAPABILITY = null;

function shaderMobileLike() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  if (nav.userAgentData && nav.userAgentData.mobile) return true;
  const ua = String(nav.userAgent || '');
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return true;
  try {
    return (nav.maxTouchPoints || 0) > 1 && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  } catch(e) {
    return false;
  }
}

function shaderTryContext(canvas, failIfMajorPerformanceCaveat) {
  const attrs = {...SHADER_GL_ATTRS, failIfMajorPerformanceCaveat: !!failIfMajorPerformanceCaveat};
  let gl = null, version = 0;
  try {
    gl = canvas.getContext('webgl2', attrs);
    if (gl) version = 2;
  } catch(e) {}
  if (!gl) {
    try {
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (gl) version = 1;
    } catch(e) {}
  }
  return gl ? {gl, version} : null;
}

function shaderRendererInfo(gl) {
  if (!gl) return '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    return [vendor, renderer].filter(Boolean).join(' / ');
  } catch(e) {
    return '';
  }
}

function shaderCapabilityProbe() {
  if (SHADER_CAPABILITY) return SHADER_CAPABILITY;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const fast = shaderTryContext(canvas, true);
  const any = fast || shaderTryContext(canvas, false);
  const mobile = shaderMobileLike();
  SHADER_CAPABILITY = {
    available: !!any,
    fastAvailable: !!fast,
    defaultEnabled: !!fast && !mobile,
    mobile,
    version: any?.version || 0,
    renderer: shaderRendererInfo(any?.gl),
  };
  return SHADER_CAPABILITY;
}

function shaderPreferredDefaultEnabled() {
  return shaderCapabilityProbe().defaultEnabled;
}

function shaderSupported() {
  return !!(SHADER.supported || shaderCapabilityProbe().available);
}

function shaderStatusText() {
  if (!shaderSupported()) return 'webgl unavailable';
  const bits = [SHADER.status || 'ready'];
  const uiStatus = shaderUiStatusText();
  if (uiStatus) bits.push(uiStatus);
  const renderer = SHADER.renderer || shaderCapabilityProbe().renderer;
  if (renderer) bits.push(renderer.toLowerCase());
  return bits.join(' - ');
}

function shaderUiRoot() {
  if (typeof UI !== 'undefined' && UI.root) return UI.root;
  return typeof document !== 'undefined' ? document.getElementById('ui-root') : null;
}

function shaderUiHasScreens() {
  if (typeof uiHasScreens === 'function') return uiHasScreens();
  const root = shaderUiRoot();
  return !!(root && root.classList.contains('is-active'));
}

function shaderUiCaptureRequested() {
  return !!(
    typeof G !== 'undefined' &&
    G.shaderEnabled &&
    G.shaderUiEnabled !== false &&
    shaderUiHasScreens() &&
    shaderUiRoot()
  );
}

function shaderUiStatusText() {
  if (!shaderUiCaptureRequested()) return '';
  if (SHADER.uiCaptureFailed) return SHADER.uiCaptureStatus || 'ui capture fallback';
  return '';
}

function shaderSetUiEnabled(enabled) {
  G.shaderUiEnabled = !!enabled;
  shaderResetUiCapture();
  shaderApplyVisibility();
}

function shaderMarkUiDirty() {
  SHADER.uiCaptureDirty = true;
  if (!SHADER.uiCapturePending) SHADER.uiCaptureGeneration++;
}

function shaderResetUiCapture() {
  SHADER.uiCaptureGeneration++;
  SHADER.uiCaptureDirty = true;
  SHADER.uiCapturePending = false;
  SHADER.uiCaptureReady = false;
  SHADER.uiCaptureFailed = false;
  SHADER.uiCaptureStatus = '';
  SHADER.uiCaptureNextRetryMs = 0;
  shaderApplyVisibility();
}

function shaderEnsureCompositor(w, h) {
  if (!SHADER.compositeCanvas) {
    SHADER.compositeCanvas = document.createElement('canvas');
    SHADER.compositeCtx = SHADER.compositeCanvas.getContext('2d');
  }
  if (!SHADER.uiCaptureCanvas) {
    SHADER.uiCaptureCanvas = document.createElement('canvas');
    SHADER.uiCaptureCtx = SHADER.uiCaptureCanvas.getContext('2d');
  }
  for (const c of [SHADER.compositeCanvas, SHADER.uiCaptureCanvas]) {
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
  }
}

function shaderStripCssUrl(raw) {
  return String(raw || '').trim().replace(/^['"]|['"]$/g, '');
}

async function shaderUrlToDataUrl(raw) {
  const src = shaderStripCssUrl(raw);
  if (!src || src.startsWith('#')) return raw;
  if (/^data:/i.test(src)) return src;
  if (/^(blob|about):/i.test(src)) return '';
  let url = '';
  try { url = new URL(src, document.baseURI).href; } catch(e) { return ''; }
  if (SHADER.cssUrlCache.has(url)) return SHADER.cssUrlCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('css resource fetch failed');
    const blob = await res.blob();
    const data = await shaderBlobToDataUrl(blob);
    SHADER.cssUrlCache.set(url, data || '');
    return data || '';
  } catch(e) {
    SHADER.cssUrlCache.set(url, '');
    return '';
  }
}

async function shaderRewriteCssUrls(css) {
  const src = String(css || '');
  const matches = [...src.matchAll(/url\(([^)]+)\)/g)];
  if (!matches.length) return src;
  let out = '', last = 0;
  let missing = false;
  for (const m of matches) {
    out += src.slice(last, m.index);
    const data = await shaderUrlToDataUrl(m[1]);
    if (!data) missing = true;
    out += data ? 'url("' + data.replace(/"/g, '\\"') + '")' : 'url("")';
    last = m.index + m[0].length;
  }
  out += src.slice(last);
  if (missing && /^\s*@font-face\b/i.test(src)) return '';
  return out;
}

async function shaderCollectCssText() {
  const out = [];
  for (const sheet of Array.from(document.styleSheets || [])) {
    let rules = null;
    try { rules = sheet.cssRules; } catch(e) { rules = null; }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (rule && rule.cssText) out.push(await shaderRewriteCssUrls(rule.cssText));
    }
  }
  return out.join('\n');
}

function shaderCopyRootCssVars(target) {
  const cs = getComputedStyle(document.documentElement);
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (name.startsWith('--')) target.style.setProperty(name, cs.getPropertyValue(name));
  }
}

function shaderSyncFormState(srcRoot, cloneRoot) {
  const src = srcRoot.querySelectorAll('input, textarea, select');
  const dst = cloneRoot.querySelectorAll('input, textarea, select');
  for (let i = 0; i < src.length && i < dst.length; i++) {
    const a = src[i], b = dst[i];
    const tag = a.tagName.toLowerCase();
    if (tag === 'textarea') {
      b.textContent = a.value;
    } else if (tag === 'select') {
      const srcOpts = a.querySelectorAll('option');
      const dstOpts = b.querySelectorAll('option');
      for (let j = 0; j < srcOpts.length && j < dstOpts.length; j++) {
        dstOpts[j].toggleAttribute('selected', srcOpts[j].selected);
      }
    } else {
      b.setAttribute('value', a.value);
      if (a.checked) b.setAttribute('checked', 'checked');
      else b.removeAttribute('checked');
    }
  }
}

function shaderImageToDataUrl(img) {
  return new Promise(resolve => {
    try {
      if (!img || !img.complete || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) {
        resolve(null);
        return;
      }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const r = c.getContext('2d');
      r.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    } catch(e) {
      resolve(null);
    }
  });
}

function shaderBlobToDataUrl(blob) {
  return new Promise(resolve => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    } catch(e) {
      resolve(null);
    }
  });
}

async function shaderFetchImageDataUrl(url) {
  try {
    if (!url || /^(data|blob):/i.test(url)) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!/^image\//i.test(blob.type) && !/svg/i.test(blob.type)) return null;
    return await shaderBlobToDataUrl(blob);
  } catch(e) {
    return null;
  }
}

async function shaderInlineCloneImages(srcRoot, cloneRoot) {
  const src = srcRoot.querySelectorAll('img');
  const dst = cloneRoot.querySelectorAll('img');
  for (let i = 0; i < src.length && i < dst.length; i++) {
    const url = src[i].currentSrc || src[i].src;
    const data = await shaderImageToDataUrl(src[i]) || await shaderFetchImageDataUrl(url);
    if (data) dst[i].setAttribute('src', data);
    else {
      dst[i].removeAttribute('src');
      dst[i].style.visibility = 'hidden';
    }
  }
}

async function shaderBuildUiCaptureSvg(root, w, h) {
  const cssW = typeof W === 'number' ? W : 800;
  const cssH = typeof H === 'number' ? H : 580;
  const clone = root.cloneNode(true);
  clone.setAttribute('xmlns', SHADER_XHTML_NS);
  clone.style.opacity = '1';
  clone.style.width = cssW + 'px';
  clone.style.height = cssH + 'px';
  clone.style.transform = 'none';
  clone.style.pointerEvents = 'auto';
  shaderCopyRootCssVars(clone);
  shaderSyncFormState(root, clone);
  await shaderInlineCloneImages(root, clone);

  const svg = document.createElementNS(SHADER_SVG_NS, 'svg');
  svg.setAttribute('xmlns', SHADER_SVG_NS);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.setAttribute('viewBox', '0 0 ' + cssW + ' ' + cssH);

  const style = document.createElementNS(SHADER_SVG_NS, 'style');
  style.textContent = await shaderCollectCssText();
  svg.appendChild(style);

  const fo = document.createElementNS(SHADER_SVG_NS, 'foreignObject');
  fo.setAttribute('x', '0');
  fo.setAttribute('y', '0');
  fo.setAttribute('width', String(cssW));
  fo.setAttribute('height', String(cssH));

  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', SHADER_XHTML_NS);
  wrapper.style.width = cssW + 'px';
  wrapper.style.height = cssH + 'px';
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'hidden';
  wrapper.appendChild(clone);
  fo.appendChild(wrapper);
  svg.appendChild(fo);

  return new XMLSerializer().serializeToString(svg);
}

function shaderFailUiCapture(message, generation) {
  if (generation !== SHADER.uiCaptureGeneration) return;
  SHADER.uiCapturePending = false;
  SHADER.uiCaptureReady = false;
  SHADER.uiCaptureFailed = true;
  SHADER.uiCaptureStatus = message || 'ui capture failed';
  SHADER.uiCaptureNextRetryMs = performance.now() + 1000;
  shaderApplyVisibility();
}

function shaderCaptureHasVisiblePixels(ctx, w, h) {
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    const step = Math.max(4, Math.floor(Math.min(w, h) / 80));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > 8) return true;
      }
    }
    return false;
  } catch(e) {
    throw new Error('ui capture tainted');
  }
}

function shaderCssPx(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function shaderCssVisibleColor(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (!s || s === 'transparent') return '';
  if (/rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(s)) return '';
  return s;
}

function shaderRectForElement(el, rootRect, w, h) {
  const r = el.getBoundingClientRect();
  const rw = rootRect.width || (typeof W === 'number' ? W : 800);
  const rh = rootRect.height || (typeof H === 'number' ? H : 580);
  return {
    x: (r.left - rootRect.left) * w / rw,
    y: (r.top - rootRect.top) * h / rh,
    w: r.width * w / rw,
    h: r.height * h / rh,
  };
}

function shaderParseShadow(shadow) {
  const s = String(shadow || '');
  if (!s || s === 'none') return null;
  const color = s.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}\b|[a-z]+\b/i)?.[0] || '';
  const nums = [...s.matchAll(/-?\d+(?:\.\d+)?px/g)].map(m => parseFloat(m[0]));
  return color ? {color, x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0} : null;
}

function shaderApplyCanvasShadow(ctx, shadow, scale) {
  if (!shadow) return;
  ctx.shadowColor = shadow.color;
  ctx.shadowOffsetX = shadow.x * scale;
  ctx.shadowOffsetY = shadow.y * scale;
  ctx.shadowBlur = shadow.blur * scale;
}

function shaderCanvasFont(cs) {
  return [
    cs.fontStyle || 'normal',
    cs.fontVariant || 'normal',
    cs.fontWeight || 'normal',
    cs.fontSize || '14px',
    cs.fontFamily || 'monospace',
  ].join(' ');
}

function shaderDirectText(el) {
  let out = '';
  for (const n of Array.from(el.childNodes || [])) {
    if (n.nodeType === Node.TEXT_NODE) out += n.nodeValue || '';
  }
  return out.replace(/\s+/g, ' ').trim();
}

function shaderTransformText(text, cs) {
  if (cs.textTransform === 'uppercase') return text.toUpperCase();
  if (cs.textTransform === 'lowercase') return text.toLowerCase();
  if (cs.textTransform === 'capitalize') return text.replace(/\b\w/g, c => c.toUpperCase());
  return text;
}

function shaderDrawElementText(ctx, el, cs, rect, scale) {
  let text = shaderDirectText(el);
  if (!text) return;
  text = shaderTransformText(text, cs);
  const color = shaderCssVisibleColor(cs.color);
  if (!color) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, Math.max(1, rect.w), Math.max(1, rect.h));
  ctx.clip();
  ctx.font = shaderCanvasFont(cs);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left';
  shaderApplyCanvasShadow(ctx, shaderParseShadow(cs.textShadow), scale);

  const fs = shaderCssPx(cs.fontSize, 14) * scale;
  const x = ctx.textAlign === 'center' ? rect.x + rect.w / 2 : ctx.textAlign === 'right' ? rect.x + rect.w - 2 * scale : rect.x + 2 * scale;
  const y = rect.y + rect.h / 2 + fs * 0.04;
  ctx.fillText(text, x, y, Math.max(1, rect.w - 4 * scale));
  ctx.restore();
}

async function shaderManualImageFor(img) {
  const url = img.currentSrc || img.src;
  if (!url) return null;
  if (SHADER.manualImageCache.has(url)) return SHADER.manualImageCache.get(url);
  const data = await shaderImageToDataUrl(img) || await shaderFetchImageDataUrl(url);
  if (!data) {
    SHADER.manualImageCache.set(url, null);
    return null;
  }
  const loaded = await new Promise(resolve => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = data;
  });
  SHADER.manualImageCache.set(url, loaded);
  return loaded;
}

async function shaderPrepareManualImages(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(img => shaderManualImageFor(img)));
}

function shaderDrawElementBox(ctx, cs, rect, scale) {
  if (!(rect.w > 0 && rect.h > 0)) return;
  const bg = shaderCssVisibleColor(cs.backgroundColor);
  const bw = Math.max(
    shaderCssPx(cs.borderTopWidth),
    shaderCssPx(cs.borderRightWidth),
    shaderCssPx(cs.borderBottomWidth),
    shaderCssPx(cs.borderLeftWidth)
  ) * scale;
  const border = cs.borderStyle !== 'none' ? shaderCssVisibleColor(cs.borderTopColor) : '';
  const shadow = shaderParseShadow(cs.boxShadow);

  if (bg) {
    ctx.save();
    shaderApplyCanvasShadow(ctx, shadow, scale);
    ctx.fillStyle = bg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
  if (border && bw > 0) {
    ctx.save();
    shaderApplyCanvasShadow(ctx, shadow && !bg ? shadow : null, scale);
    ctx.strokeStyle = border;
    ctx.lineWidth = bw;
    ctx.strokeRect(rect.x + bw / 2, rect.y + bw / 2, Math.max(0, rect.w - bw), Math.max(0, rect.h - bw));
    ctx.restore();
  }
}

function shaderPaintDomElement(ctx, el, root, rootRect, w, h, parentAlpha) {
  if (!(el instanceof Element)) return;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return;
  const opacity = el === root ? 1 : shaderCssPx(cs.opacity, 1);
  const alpha = parentAlpha * opacity;
  if (alpha <= 0.001) return;

  const rect = shaderRectForElement(el, rootRect, w, h);
  if (rect.x > w || rect.y > h || rect.x + rect.w < 0 || rect.y + rect.h < 0) return;
  const scale = w / (typeof W === 'number' ? W : 800);

  ctx.save();
  ctx.globalAlpha *= opacity;
  shaderDrawElementBox(ctx, cs, rect, scale);

  if (el.tagName === 'IMG') {
    const img = SHADER.manualImageCache.get(el.currentSrc || el.src);
    if (img && rect.w > 0 && rect.h > 0) {
      try { ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h); } catch(e) {}
    } else if (el.alt) {
      ctx.save();
      const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#00ff88';
      ctx.font = 'bold ' + Math.max(18, rect.h * 0.42) + 'px ' + (cs.fontFamily || 'monospace');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = Math.max(1, 2 * scale);
      shaderApplyCanvasShadow(ctx, {color: accent, x: 0, y: 0, blur: 18}, scale);
      const label = shaderTransformText(el.alt, cs);
      ctx.strokeText(label, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w);
      ctx.restore();
    }
  } else {
    shaderDrawElementText(ctx, el, cs, rect, scale);
  }

  for (const child of Array.from(el.children || [])) {
    shaderPaintDomElement(ctx, child, root, rootRect, w, h, alpha);
  }
  ctx.restore();
}

async function shaderPaintUiCapture(root, w, h, generation) {
  if (generation !== SHADER.uiCaptureGeneration) return;
  shaderEnsureCompositor(w, h);
  await shaderPrepareManualImages(root);
  if (generation !== SHADER.uiCaptureGeneration) return;

  const ctx = SHADER.uiCaptureCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const rootRect = root.getBoundingClientRect();
  shaderPaintDomElement(ctx, root, root, rootRect, w, h, 1);
  if (!shaderCaptureHasVisiblePixels(ctx, w, h)) throw new Error('ui capture blank');

  SHADER.uiCapturePending = false;
  SHADER.uiCaptureReady = true;
  SHADER.uiCaptureFailed = false;
  SHADER.uiCaptureStatus = '';
  SHADER.uiCaptureLastSuccessMs = performance.now();
  shaderApplyVisibility();
}

function shaderFallbackToManualCapture(root, w, h, generation, _reason) {
  SHADER.uiCaptureUseManual = true;
  shaderPaintUiCapture(root, w, h, generation).catch(e => {
    shaderFailUiCapture(e?.message || 'ui capture failed', generation);
  });
}

function shaderStartUiCapture(now, w, h) {
  const root = shaderUiRoot();
  if (!root || !shaderUiCaptureRequested()) {
    SHADER.uiCaptureReady = false;
    SHADER.uiCaptureFailed = false;
    shaderApplyVisibility();
    return;
  }
  if (SHADER.uiCapturePending) return;
  if (SHADER.uiCaptureFailed && now < SHADER.uiCaptureNextRetryMs) return;
  if (SHADER.uiCaptureReady && now - SHADER.uiCaptureLastStartMs < SHADER_UI_CAPTURE_INTERVAL_MS) return;

  shaderEnsureCompositor(w, h);
  const generation = SHADER.uiCaptureGeneration;
  SHADER.uiCapturePending = true;
  SHADER.uiCaptureDirty = false;
  SHADER.uiCaptureFailed = false;
  SHADER.uiCaptureStatus = '';
  SHADER.uiCaptureLastStartMs = now;

  if (SHADER.uiCaptureUseManual) {
    shaderPaintUiCapture(root, w, h, generation).catch(e => {
      shaderFailUiCapture(e?.message || 'ui capture failed', generation);
    });
    return;
  }

  shaderBuildUiCaptureSvg(root, w, h).then(svgText => {
    if (generation !== SHADER.uiCaptureGeneration) return;
    const blob = new Blob([svgText], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const finish = () => { try { URL.revokeObjectURL(url); } catch(e) {} };
    img.onload = () => {
      try {
        if (generation !== SHADER.uiCaptureGeneration) { finish(); return; }
        shaderEnsureCompositor(w, h);
        const ctx = SHADER.uiCaptureCtx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        if (!shaderCaptureHasVisiblePixels(ctx, w, h)) throw new Error('ui capture blank');
        SHADER.uiCapturePending = false;
        SHADER.uiCaptureReady = true;
        SHADER.uiCaptureFailed = false;
        SHADER.uiCaptureLastSuccessMs = performance.now();
        finish();
        shaderApplyVisibility();
      } catch(e) {
        finish();
        shaderFallbackToManualCapture(root, w, h, generation, e?.message || 'ui capture failed');
      }
    };
    img.onerror = () => {
      finish();
      shaderFallbackToManualCapture(root, w, h, generation, 'ui capture svg failed');
    };
    img.src = url;
  }).catch(e => shaderFallbackToManualCapture(root, w, h, generation, e?.message || 'ui capture failed'));
}

function shaderCompositeFrameSource(source, w, h) {
  if (!shaderUiCaptureRequested()) {
    SHADER.uiCaptureReady = false;
    SHADER.uiCaptureFailed = false;
    shaderApplyVisibility();
    return source;
  }
  const now = performance.now();
  if (!SHADER.uiCaptureReady || SHADER.uiCaptureDirty || now - SHADER.uiCaptureLastSuccessMs >= SHADER_UI_CAPTURE_INTERVAL_MS) {
    shaderStartUiCapture(now, w, h);
  }
  if (!SHADER.uiCaptureReady) return source;
  shaderEnsureCompositor(w, h);
  const ctx = SHADER.compositeCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  ctx.drawImage(SHADER.uiCaptureCanvas, 0, 0, w, h);
  return SHADER.compositeCanvas;
}

function shaderInit(sourceCanvas) {
  if (SHADER.canvas) return shaderSupported();
  SHADER.source = sourceCanvas;
  const canvas = document.createElement('canvas');
  canvas.id = 'shader-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  sourceCanvas.parentNode.insertBefore(canvas, sourceCanvas.nextSibling);
  SHADER.canvas = canvas;

  const ctx = shaderTryContext(canvas, false);
  if (!ctx) {
    SHADER.status = 'webgl unavailable';
    SHADER.statusKind = 'error';
    SHADER.supported = false;
    shaderApplyVisibility();
    return false;
  }

  SHADER.gl = ctx.gl;
  SHADER.version = ctx.version;
  SHADER.supported = true;
  SHADER.renderer = shaderRendererInfo(ctx.gl);
  SHADER.maxTextureSize = ctx.gl.getParameter(ctx.gl.MAX_TEXTURE_SIZE) || 0;

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    SHADER.supported = false;
    SHADER.compiled = null;
    SHADER.status = 'webgl context lost';
    SHADER.statusKind = 'error';
    shaderResetUiCapture();
    shaderApplyVisibility();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    SHADER.supported = true;
    shaderInitBuffers();
    shaderLoadCurrentPreset();
    shaderResetUiCapture();
    shaderApplyVisibility();
  });

  shaderResize();
  shaderInitBuffers();
  shaderLoadCurrentPreset();
  shaderApplyVisibility();
  return true;
}

function shaderResize() {
  if (!SHADER.canvas || !SHADER.source) return;
  const w = SHADER.source.width || Math.round(W * CANVAS_PIXEL_RATIO);
  const h = SHADER.source.height || Math.round(H * CANVAS_PIXEL_RATIO);
  const sizeChanged = SHADER.canvas.width !== w || SHADER.canvas.height !== h;
  if (SHADER.canvas.width !== w) SHADER.canvas.width = w;
  if (SHADER.canvas.height !== h) SHADER.canvas.height = h;
  SHADER.canvas.style.width = W + 'px';
  SHADER.canvas.style.height = H + 'px';
  if (SHADER.targetW !== w || SHADER.targetH !== h) shaderReleaseTargets();
  if (sizeChanged) shaderResetUiCapture();
}

function shaderInitBuffers() {
  const gl = SHADER.gl;
  if (!gl) return;
  if (SHADER.quadBuffer) gl.deleteBuffer(SHADER.quadBuffer);
  SHADER.quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, SHADER.quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, SHADER_QUAD, gl.STATIC_DRAW);
  if (!SHADER.sourceTexture) SHADER.sourceTexture = gl.createTexture();
}

function shaderWithDefine(source, define) {
  const src = String(source || '');
  const m = src.match(/^\s*#version[^\n]*(?:\n|$)/);
  if (!m) return '#define ' + define + ' 1\n' + src;
  return m[0] + '#define ' + define + ' 1\n' + src.slice(m[0].length);
}

function shaderCompileOne(gl, type, source, label) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown compile error';
    gl.deleteShader(shader);
    throw new Error(label + ': ' + log);
  }
  return shader;
}

function shaderCompileProgram(gl, source, params, label) {
  const vs = shaderCompileOne(gl, gl.VERTEX_SHADER, shaderWithDefine(source, 'VERTEX'), label + ' vertex');
  const fs = shaderCompileOne(gl, gl.FRAGMENT_SHADER, shaderWithDefine(source, 'FRAGMENT'), label + ' fragment');
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'unknown link error';
    gl.deleteProgram(program);
    throw new Error(label + ': ' + log);
  }
  const uniforms = {};
  ['Texture', 'TextureSize', 'InputSize', 'OutputSize', 'OriginalSize', 'FrameCount', 'MVPMatrix'].forEach(name => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });
  const paramUniforms = {};
  for (const def of params) paramUniforms[def.id] = gl.getUniformLocation(program, def.id);
  return {
    program,
    vertexLoc: gl.getAttribLocation(program, 'VertexCoord'),
    texLoc: gl.getAttribLocation(program, 'TexCoord'),
    uniforms,
    paramUniforms,
  };
}

function shaderCompilePreset(id) {
  const gl = SHADER.gl;
  const preset = shaderPresetById(normalizeShaderPresetId(id));
  if (!gl || !preset) throw new Error('shader preset missing');
  const parsed = shaderParsePresetPasses(preset);
  if (!parsed.passes.length) throw new Error('shader preset has no passes');
  const params = shaderPresetParamDefs(preset.id);
  const passes = parsed.passes.map(pass => ({
    ...pass,
    ...shaderCompileProgram(gl, pass.source, params, pass.path),
  }));
  return {id: preset.id, label: preset.label, params, passes};
}

function shaderDeleteCompiled(compiled) {
  const gl = SHADER.gl;
  if (!gl || !compiled) return;
  for (const pass of compiled.passes || []) {
    try { gl.deleteProgram(pass.program); } catch(e) {}
  }
}

function shaderLoadCurrentPreset() {
  const gl = SHADER.gl;
  if (!gl || !shaderSupported()) return false;
  const id = normalizeShaderPresetId(typeof G !== 'undefined' ? G.shaderPresetId : SHADER_DEFAULT_PRESET_ID);
  shaderDeleteCompiled(SHADER.compiled);
  SHADER.compiled = null;
  SHADER.compiledPresetId = null;
  SHADER.failed = false;
  try {
    SHADER.compiled = shaderCompilePreset(id);
    SHADER.compiledPresetId = id;
    SHADER.status = 'ready';
    SHADER.statusKind = 'ok';
    return true;
  } catch(e) {
    if (id !== 'stock') {
      try {
        SHADER.compiled = shaderCompilePreset('stock');
        SHADER.compiledPresetId = 'stock';
        SHADER.status = 'preset failed, using stock';
        SHADER.statusKind = 'warn';
        try { console.warn('Shader preset failed:', e); } catch(_) {}
        return true;
      } catch(e2) {
        e = e2;
      }
    }
    SHADER.status = 'shader compile failed';
    SHADER.statusKind = 'error';
    SHADER.failed = true;
    try { console.warn('Shader compile failed:', e); } catch(_) {}
    return false;
  } finally {
    shaderReleaseTargets();
  }
}

function shaderSetTextureParams(texture, linear) {
  const gl = SHADER.gl;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
}

function shaderCreateTarget(w, h) {
  const gl = SHADER.gl;
  const texture = gl.createTexture();
  shaderSetTextureParams(texture, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('shader framebuffer incomplete');
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {texture, fbo};
}

function shaderReleaseTargets() {
  const gl = SHADER.gl;
  if (!gl) return;
  for (const t of SHADER.targets) {
    try { gl.deleteFramebuffer(t.fbo); } catch(e) {}
    try { gl.deleteTexture(t.texture); } catch(e) {}
  }
  SHADER.targets = [];
  SHADER.targetW = 0;
  SHADER.targetH = 0;
}

function shaderEnsureTargets(passCount, w, h) {
  if (SHADER.targetW === w && SHADER.targetH === h && SHADER.targets.length === Math.max(0, passCount - 1)) return;
  shaderReleaseTargets();
  for (let i = 0; i < passCount - 1; i++) SHADER.targets.push(shaderCreateTarget(w, h));
  SHADER.targetW = w;
  SHADER.targetH = h;
}

function shaderCurrentParamValues() {
  const id = normalizeShaderPresetId(typeof G !== 'undefined' ? G.shaderPresetId : SHADER_DEFAULT_PRESET_ID);
  const values = typeof G !== 'undefined' ? G.shaderParams?.[id] : null;
  return normalizeShaderParamsForPreset(id, values);
}

function shaderBindQuad(pass) {
  const gl = SHADER.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, SHADER.quadBuffer);
  if (pass.vertexLoc >= 0) {
    gl.enableVertexAttribArray(pass.vertexLoc);
    gl.vertexAttribPointer(pass.vertexLoc, 2, gl.FLOAT, false, 16, 0);
  }
  if (pass.texLoc >= 0) {
    gl.enableVertexAttribArray(pass.texLoc);
    gl.vertexAttribPointer(pass.texLoc, 2, gl.FLOAT, false, 16, 8);
  }
}

function shaderSetUniforms(pass, inputW, inputH, outputW, outputH, sourceW, sourceH, params) {
  const gl = SHADER.gl, u = pass.uniforms;
  if (u.Texture) gl.uniform1i(u.Texture, 0);
  if (u.TextureSize) gl.uniform4f(u.TextureSize, inputW, inputH, 1 / inputW, 1 / inputH);
  if (u.InputSize) gl.uniform4f(u.InputSize, sourceW, sourceH, 1 / sourceW, 1 / sourceH);
  if (u.OutputSize) gl.uniform4f(u.OutputSize, outputW, outputH, 1 / outputW, 1 / outputH);
  if (u.OriginalSize) gl.uniform4f(u.OriginalSize, sourceW, sourceH, 1 / sourceW, 1 / sourceH);
  if (u.FrameCount) gl.uniform1f(u.FrameCount, typeof G !== 'undefined' ? G.fr : 0);
  if (u.MVPMatrix) gl.uniformMatrix4fv(u.MVPMatrix, false, SHADER_IDENTITY_MVP);
  for (const def of pass ? SHADER.compiled.params : []) {
    const loc = pass.paramUniforms[def.id];
    if (loc) gl.uniform1f(loc, params[def.id] ?? def.initial);
  }
}

function shaderApplyVisibility() {
  if (!SHADER.source || !SHADER.canvas) return;
  const active = !!(typeof G !== 'undefined' && G.shaderEnabled && SHADER.supported && SHADER.compiled && !SHADER.failed);
  SHADER.source.style.visibility = active ? 'hidden' : 'visible';
  SHADER.canvas.style.display = active ? 'block' : 'none';
  const uiRoot = shaderUiRoot();
  if (uiRoot) uiRoot.style.opacity = active && shaderUiCaptureRequested() && SHADER.uiCaptureReady ? '0' : '';
}

function shaderPresentFrame() {
  if (!SHADER.source || !SHADER.canvas) return;
  if (!(typeof G !== 'undefined' && G.shaderEnabled)) {
    shaderApplyVisibility();
    return;
  }
  if (!SHADER.supported) {
    shaderApplyVisibility();
    return;
  }
  if (!SHADER.compiled || SHADER.compiledPresetId !== normalizeShaderPresetId(G.shaderPresetId)) {
    shaderLoadCurrentPreset();
  }
  if (!SHADER.compiled || SHADER.failed) {
    shaderApplyVisibility();
    return;
  }

  const gl = SHADER.gl, source = SHADER.source;
  const w = source.width, h = source.height;
  if (!(w > 0 && h > 0)) return;
  if (SHADER.maxTextureSize && (w > SHADER.maxTextureSize || h > SHADER.maxTextureSize)) {
    SHADER.status = 'shader texture too large';
    SHADER.statusKind = 'error';
    SHADER.failed = true;
    shaderApplyVisibility();
    return;
  }

  try {
    const frameSource = shaderCompositeFrameSource(source, w, h);
    shaderEnsureTargets(SHADER.compiled.passes.length, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    shaderSetTextureParams(SHADER.sourceTexture, SHADER.compiled.passes[0].filterLinear);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frameSource);
    } catch(e) {
      if (frameSource === source) throw e;
      SHADER.uiCaptureUseManual = true;
      shaderResetUiCapture();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    let inputTexture = SHADER.sourceTexture;
    const params = shaderCurrentParamValues();
    for (let i = 0; i < SHADER.compiled.passes.length; i++) {
      const pass = SHADER.compiled.passes[i];
      const finalPass = i === SHADER.compiled.passes.length - 1;
      gl.bindFramebuffer(gl.FRAMEBUFFER, finalPass ? null : SHADER.targets[i].fbo);
      gl.viewport(0, 0, w, h);
      gl.useProgram(pass.program);
      shaderBindQuad(pass);
      shaderSetTextureParams(inputTexture, pass.filterLinear);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
      shaderSetUniforms(pass, w, h, w, h, w, h, params);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!finalPass) inputTexture = SHADER.targets[i].texture;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    SHADER.failed = false;
    if (SHADER.statusKind !== 'warn') {
      SHADER.status = 'ready';
      SHADER.statusKind = 'ok';
    }
  } catch(e) {
    SHADER.status = 'shader runtime failed';
    SHADER.statusKind = 'error';
    SHADER.failed = true;
    try { console.warn('Shader runtime failed:', e); } catch(_) {}
  }
  shaderApplyVisibility();
}

function shaderSetEnabled(enabled) {
  G.shaderEnabled = !!enabled && shaderSupported();
  if (G.shaderEnabled && (!SHADER.compiled || SHADER.failed)) shaderLoadCurrentPreset();
  shaderResetUiCapture();
  shaderApplyVisibility();
}

function shaderSetPreset(id) {
  G.shaderPresetId = normalizeShaderPresetId(id);
  if (G.shaderParams && !G.shaderParams[G.shaderPresetId]) G.shaderParams[G.shaderPresetId] = shaderDefaultParamValues(G.shaderPresetId);
  shaderLoadCurrentPreset();
  shaderResetUiCapture();
  shaderApplyVisibility();
}

function shaderSetParamValue(paramId, value) {
  const id = normalizeShaderPresetId(G.shaderPresetId);
  const def = shaderPresetParamDefs(id).find(p => p.id === paramId);
  if (!def) return;
  if (!G.shaderParams || typeof G.shaderParams !== 'object') G.shaderParams = {};
  if (!G.shaderParams[id] || typeof G.shaderParams[id] !== 'object') G.shaderParams[id] = {};
  G.shaderParams[id][paramId] = normalizeShaderParamValue(def, value);
}

function shaderGetParamValue(paramId) {
  const id = normalizeShaderPresetId(G.shaderPresetId);
  const def = shaderPresetParamDefs(id).find(p => p.id === paramId);
  if (!def) return 0;
  return normalizeShaderParamValue(def, G.shaderParams?.[id]?.[paramId]);
}

function shaderResetCurrentParams() {
  const id = normalizeShaderPresetId(G.shaderPresetId);
  if (!G.shaderParams || typeof G.shaderParams !== 'object') G.shaderParams = {};
  G.shaderParams[id] = shaderDefaultParamValues(id);
}
