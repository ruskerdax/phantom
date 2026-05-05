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
  const renderer = SHADER.renderer || shaderCapabilityProbe().renderer;
  if (renderer) bits.push(renderer.toLowerCase());
  return bits.join(' - ');
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
    shaderApplyVisibility();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    SHADER.supported = true;
    shaderInitBuffers();
    shaderLoadCurrentPreset();
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
  if (SHADER.canvas.width !== w) SHADER.canvas.width = w;
  if (SHADER.canvas.height !== h) SHADER.canvas.height = h;
  SHADER.canvas.style.width = W + 'px';
  SHADER.canvas.style.height = H + 'px';
  if (SHADER.targetW !== w || SHADER.targetH !== h) shaderReleaseTargets();
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
    shaderEnsureTargets(SHADER.compiled.passes.length, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    shaderSetTextureParams(SHADER.sourceTexture, SHADER.compiled.passes[0].filterLinear);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
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
  shaderApplyVisibility();
}

function shaderSetPreset(id) {
  G.shaderPresetId = normalizeShaderPresetId(id);
  if (G.shaderParams && !G.shaderParams[G.shaderPresetId]) G.shaderParams[G.shaderPresetId] = shaderDefaultParamValues(G.shaderPresetId);
  shaderLoadCurrentPreset();
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
