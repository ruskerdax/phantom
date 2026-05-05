'use strict';

const SHADER_DEFAULT_PRESET_ID = 'ntsc-consumer';

const SHADER_STOCK_SOURCE = `
#if defined(VERTEX)
attribute vec2 VertexCoord;
attribute vec2 TexCoord;
uniform mat4 MVPMatrix;
varying vec2 tex_coord;
void main() {
  gl_Position = MVPMatrix * vec4(VertexCoord, 0.0, 1.0);
  tex_coord = TexCoord;
}
#elif defined(FRAGMENT)
precision mediump float;
uniform sampler2D Texture;
varying vec2 tex_coord;
void main() {
  gl_FragColor = texture2D(Texture, tex_coord);
}
#endif
`;

// A compact GLSL approximation of ShaderGlass' ntsc-consumer target. It keeps
// the curated preset self-contained so PHANTOM still runs directly from file://.
const SHADER_NTSC_CONSUMER_SOURCE = `
#pragma parameter NTSC_ARTIFACT "signal bleed" 0.85 0.0 2.0 0.05
#pragma parameter NTSC_SCANLINE "scanline strength" 0.24 0.0 0.65 0.01
#pragma parameter NTSC_WARP "screen curve" 0.035 0.0 0.16 0.005
#pragma parameter NTSC_NOISE "video noise" 0.035 0.0 0.18 0.005
#pragma parameter NTSC_SATURATION "color saturation" 1.08 0.0 2.0 0.02
#pragma parameter NTSC_CONTRAST "contrast" 1.08 0.5 1.8 0.02
#pragma parameter NTSC_BRIGHTNESS "brightness" 0.02 -0.25 0.25 0.01
#pragma parameter NTSC_GAMMA "gamma" 1.02 0.65 1.65 0.01
#pragma parameter NTSC_CHROMA_SHIFT "chroma offset" 1.25 0.0 4.0 0.05
#pragma parameter NTSC_DOT_CRAWL "dot crawl" 0.55 0.0 1.5 0.05
#pragma parameter NTSC_VIGNETTE "vignette" 0.22 0.0 0.8 0.02
#pragma parameter NTSC_SHARPNESS "edge softness" 0.35 0.0 1.0 0.02

#if defined(VERTEX)
attribute vec2 VertexCoord;
attribute vec2 TexCoord;
uniform mat4 MVPMatrix;
varying vec2 tex_coord;
void main() {
  gl_Position = MVPMatrix * vec4(VertexCoord, 0.0, 1.0);
  tex_coord = TexCoord;
}
#elif defined(FRAGMENT)
precision mediump float;
uniform sampler2D Texture;
uniform vec4 TextureSize;
uniform vec4 OutputSize;
uniform float FrameCount;
uniform float NTSC_ARTIFACT;
uniform float NTSC_SCANLINE;
uniform float NTSC_WARP;
uniform float NTSC_NOISE;
uniform float NTSC_SATURATION;
uniform float NTSC_CONTRAST;
uniform float NTSC_BRIGHTNESS;
uniform float NTSC_GAMMA;
uniform float NTSC_CHROMA_SHIFT;
uniform float NTSC_DOT_CRAWL;
uniform float NTSC_VIGNETTE;
uniform float NTSC_SHARPNESS;
varying vec2 tex_coord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 curve(vec2 uv) {
  vec2 p = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  p += p * r2 * NTSC_WARP;
  return p * 0.5 + 0.5;
}

vec3 sampleRgb(vec2 uv) {
  return texture2D(Texture, uv).rgb;
}

void main() {
  vec2 uv = curve(tex_coord);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 px = TextureSize.zw;
  vec3 base = sampleRgb(uv);
  vec3 soft = (
    sampleRgb(uv + vec2(-2.0 * px.x, 0.0)) +
    sampleRgb(uv + vec2(-1.0 * px.x, 0.0)) * 2.0 +
    base * 3.0 +
    sampleRgb(uv + vec2( 1.0 * px.x, 0.0)) * 2.0 +
    sampleRgb(uv + vec2( 2.0 * px.x, 0.0))
  ) / 9.0;
  vec3 c = mix(base, soft, clamp(NTSC_SHARPNESS, 0.0, 1.0));

  float shift = NTSC_CHROMA_SHIFT * px.x;
  c.r = mix(c.r, texture2D(Texture, uv + vec2( shift, 0.0)).r, clamp(NTSC_ARTIFACT * 0.42, 0.0, 1.0));
  c.b = mix(c.b, texture2D(Texture, uv + vec2(-shift, 0.0)).b, clamp(NTSC_ARTIFACT * 0.42, 0.0, 1.0));

  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 chroma = c - vec3(luma);
  c = vec3(luma) + chroma * NTSC_SATURATION;

  float crawl = sin((uv.x * TextureSize.x * 1.7 + uv.y * 11.0 + FrameCount * 0.55) * 3.14159265);
  c += vec3(0.020, -0.006, -0.018) * crawl * NTSC_DOT_CRAWL * NTSC_ARTIFACT;

  float scan = 0.5 + 0.5 * sin(uv.y * TextureSize.y * 3.14159265);
  c *= 1.0 - NTSC_SCANLINE * scan;

  vec2 p = uv * 2.0 - 1.0;
  c *= 1.0 - NTSC_VIGNETTE * dot(p, p) * 0.45;

  float n = hash(uv * OutputSize.xy + vec2(FrameCount, FrameCount * 0.37)) - 0.5;
  c += n * NTSC_NOISE;

  c = (c - 0.5) * NTSC_CONTRAST + 0.5 + NTSC_BRIGHTNESS;
  c = pow(max(c, vec3(0.0)), vec3(1.0 / max(NTSC_GAMMA, 0.001)));
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
#endif
`;

const SHADER_PRESETS = [
  {
    id: 'stock',
    label: 'stock',
    glslp: `
shaders = "1"
shader0 = "stock.glsl"
filter_linear0 = false
`,
    files: {'stock.glsl': SHADER_STOCK_SOURCE},
  },
  {
    id: 'ntsc-consumer',
    label: 'ntsc consumer',
    glslp: `
shaders = "1"
shader0 = "ntsc-consumer.glsl"
filter_linear0 = true
`,
    files: {'ntsc-consumer.glsl': SHADER_NTSC_CONSUMER_SOURCE},
  },
];

const SHADER_PRESET_VALUES = SHADER_PRESETS.map(p => ({id: p.id, label: p.label}));

function shaderPresetById(id) {
  return SHADER_PRESETS.find(p => p.id === id) || null;
}

function normalizeShaderPresetId(id) {
  return shaderPresetById(id) ? id : SHADER_DEFAULT_PRESET_ID;
}

function shaderStripQuotes(v) {
  v = String(v ?? '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function shaderParsePresetText(text) {
  const out = {};
  String(text || '').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 0) return;
    const key = trimmed.slice(0, eq).trim();
    const val = shaderStripQuotes(trimmed.slice(eq + 1).trim());
    if (key) out[key] = val;
  });
  return out;
}

function shaderParsePresetPasses(preset) {
  const cfg = shaderParsePresetText(preset?.glslp || '');
  const count = Math.max(1, parseInt(cfg.shaders || cfg.shader_count || '1', 10) || 1);
  const passes = [];
  for (let i = 0; i < count; i++) {
    const path = cfg['shader' + i];
    if (!path) continue;
    passes.push({
      index: i,
      path,
      source: preset.files?.[path] || '',
      filterLinear: String(cfg['filter_linear' + i] || cfg['filter_linear'] || '').toLowerCase() === 'true',
    });
  }
  return {cfg, passes};
}

function shaderParseParameterDefs(source) {
  const defs = [];
  const re = /#pragma\s+parameter\s+([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]*)"\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)(?:\s+([-+0-9.eE]+))?/g;
  let m;
  while ((m = re.exec(String(source || '')))) {
    const initial = Number(m[3]), min = Number(m[4]), max = Number(m[5]), step = Number(m[6] ?? 0.01);
    if (![initial, min, max, step].every(Number.isFinite)) continue;
    defs.push({
      id: m[1],
      label: m[2],
      initial,
      min,
      max,
      step: step > 0 ? step : 0.01,
    });
  }
  return defs;
}

function shaderPresetParamDefs(id) {
  const preset = shaderPresetById(normalizeShaderPresetId(id));
  if (!preset) return [];
  const seen = new Set(), defs = [];
  for (const pass of shaderParsePresetPasses(preset).passes) {
    for (const def of shaderParseParameterDefs(pass.source)) {
      if (seen.has(def.id)) continue;
      seen.add(def.id);
      defs.push(def);
    }
  }
  return defs;
}

function shaderDefaultParamValues(id) {
  const preset = shaderPresetById(normalizeShaderPresetId(id));
  const cfg = shaderParsePresetPasses(preset).cfg || {};
  const out = {};
  for (const def of shaderPresetParamDefs(id)) {
    const override = Number(cfg[def.id]);
    const initial = Number.isFinite(override) ? override : def.initial;
    out[def.id] = normalizeShaderParamValue({...def, initial}, initial);
  }
  return out;
}

function normalizeShaderParamValue(def, value) {
  let n = Number(value);
  if (!Number.isFinite(n)) n = def.initial;
  n = Math.max(def.min, Math.min(def.max, n));
  if (def.step > 0) n = def.min + Math.round((n - def.min) / def.step) * def.step;
  return Number(Math.max(def.min, Math.min(def.max, n)).toFixed(6));
}

function normalizeShaderParamsForPreset(id, values = {}) {
  const out = {};
  const defaults = shaderDefaultParamValues(id);
  for (const def of shaderPresetParamDefs(id)) {
    out[def.id] = normalizeShaderParamValue({...def, initial: defaults[def.id]}, values[def.id]);
  }
  return out;
}

function normalizeShaderParams(data) {
  const out = {};
  const src = data && typeof data === 'object' ? data : {};
  for (const preset of SHADER_PRESETS) out[preset.id] = normalizeShaderParamsForPreset(preset.id, src[preset.id]);
  return out;
}
