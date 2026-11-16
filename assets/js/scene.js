// Websign · 3D-Bühne
// Ein WebGL-2-Kontext für die ganze Seite, ohne Bibliothek. Das Logo liegt als Distanzfeld vor
// (assets/3d/ws-field.bin); daraus entstehen Höhe, Kanten und Normalen direkt im Shader.
// Das Canvas wandert in die jeweils sichtbare Bühne. Gerendert wird nur, wenn sich etwas ändert.

const FIELD_URL = new URL('../3d/ws-field.bin', import.meta.url);
const BOX = { x0: 17.5, y0: 17.5, x1: 624, y1: 284 };   // Logo-Grenzen im Distanzfeld (px)
const FOV = (28 * Math.PI) / 180;
const CAM_D = 6;
const PUFF = 0.72;                                       // Wölbung: Höhe im Verhältnis zur halben Strichbreite

const FIELD_GLSL = `
uniform sampler2D uField;
// Bikubische B-Spline-Abtastung: d = Abstand zur Kontur, u = Ballon-Fläche, gu = Gradient von u
void field(vec2 p, out float d, out float u, out vec2 gu) {
  ivec2 sz = textureSize(uField, 0);
  vec2 ip = floor(p);
  vec2 f = p - ip;
  ivec2 i = ivec2(ip);
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 m = 1.0 - f;
  vec4 wx = vec4(m.x * m.x * m.x, 3.0 * f3.x - 6.0 * f2.x + 4.0, -3.0 * f3.x + 3.0 * f2.x + 3.0 * f.x + 1.0, f3.x) / 6.0;
  vec4 wy = vec4(m.y * m.y * m.y, 3.0 * f3.y - 6.0 * f2.y + 4.0, -3.0 * f3.y + 3.0 * f2.y + 3.0 * f.y + 1.0, f3.y) / 6.0;
  vec4 dx = vec4(-m.x * m.x, 3.0 * f2.x - 4.0 * f.x, -3.0 * f2.x + 2.0 * f.x + 1.0, f2.x) * 0.5;
  vec4 dy = vec4(-m.y * m.y, 3.0 * f2.y - 4.0 * f.y, -3.0 * f2.y + 2.0 * f.y + 1.0, f2.y) * 0.5;
  d = 0.0; u = 0.0; gu = vec2(0.0);
  for (int y = 0; y < 4; y++) {
    vec2 rv = vec2(0.0);
    float rd = 0.0;
    for (int x = 0; x < 4; x++) {
      vec2 t = texelFetch(uField, clamp(i + ivec2(x - 1, y - 1), ivec2(0), sz - 1), 0).rg;
      rv += wx[x] * t; rd += dx[x] * t.g;
    }
    d += wy[y] * rv.r; u += wy[y] * rv.g; gu.x += wy[y] * rd; gu.y += dy[y] * rv.g;
  }
}`;

const VERT = `#version 300 es
precision highp float;
precision highp sampler2D;
layout(location = 0) in vec2 aP;
uniform mat4 uViewProj;
uniform mat3 uRot;
uniform vec3 uOffset;
uniform float uScale;
uniform vec3 uBox;
uniform float uPuff;
uniform float uInflate;
uniform float uSide;
out vec2 vP;
out vec3 vWorld;
out float vH;
${FIELD_GLSL}
void main() {
  float d; float u; vec2 gu;
  vec2 p = aP;
  field(p, d, u, gu);
  // Gitter zur Kontur hin verdichten: Dort steigt die Fläche am steilsten, dort braucht sie die meisten Punkte
  const float W = 6.0;
  float gl = length(gu);
  if (abs(d) < W && gl > 1e-4) {
    p -= (gu / gl) * (d - sign(d) * d * d / W);
    field(p, d, u, gu);
  }
  // Außerhalb der Kontur bleibt die Fläche flach: Vorder- und Rückseite treffen sich in einer Ebene
  float h = uPuff * sqrt(2.0 * max(u, 0.0)) * uInflate * uSide;
  vec3 local = vec3(p.x - uBox.x, uBox.y - p.y, h) / uBox.z;
  vec3 w = uRot * (local * uScale) + uOffset;
  vP = p;
  vWorld = w;
  vH = h * uSide;
  gl_Position = uViewProj * vec4(w, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vP;
in vec3 vWorld;
in float vH;
uniform mat3 uRot;
uniform vec3 uCam;
uniform float uPuff;
uniform float uInflate;
uniform float uSide;
uniform float uOutline;
uniform float uWire;
uniform float uSweep;
uniform vec3 uBox;
uniform float uFlat;
uniform float uMetal;
uniform float uRough;
uniform float uSpec;
uniform float uOpacity;
uniform vec3 uAlbedo;
uniform vec3 uTint;
uniform vec3 uFlatColor;
out vec4 outColor;
${FIELD_GLSL}

const vec3 BRAND = vec3(0.063, 0.133, 0.352);

// Weiche Lichtfläche (Softbox) in Richtung c mit halber Ausdehnung hs
float card(vec3 d, vec3 c, vec2 hs, float soft) {
  float dn = dot(d, c);
  if (dn <= 0.0) return 0.0;
  vec3 up = abs(c.y) > 0.92 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 u = normalize(cross(up, c));
  vec3 v = cross(c, u);
  vec2 p = abs(vec2(dot(d, u), dot(d, v)) / dn);
  vec2 q = 1.0 - smoothstep(hs - soft, hs + soft, p);
  return q.x * q.y;
}

// Prozedurales Studio: dunkler Raum, wenige Softboxen, ein markenblauer Kicker
vec3 env(vec3 d, float rough) {
  float s = 0.05 + rough * 0.6;
  vec3 c = vec3(0.010, 0.011, 0.016);
  c += vec3(0.030, 0.038, 0.060) * smoothstep(0.25, -0.9, d.y);
  c += vec3(0.020, 0.024, 0.034) * smoothstep(-0.2, 0.9, d.y);
  c += vec3(1.00, 1.00, 1.02) * 0.92 * card(d, normalize(vec3(0.0, 0.10, 1.0)), vec2(0.95, 0.40), s + 0.07);
  c += vec3(1.00, 0.99, 0.97) * 2.10 * card(d, normalize(vec3(0.0, 1.0, 0.22)), vec2(1.50, 0.42), s + 0.08);
  c += vec3(0.95, 0.97, 1.00) * 1.50 * card(d, normalize(vec3(-1.0, 0.18, 0.15)), vec2(0.32, 1.10), s + 0.05);
  c += BRAND * 5.0 * card(d, normalize(vec3(1.0, -0.12, 0.10)), vec2(0.42, 0.90), s + 0.08);
  c += vec3(0.80, 0.86, 1.00) * 0.90 * card(d, normalize(vec3(0.25, -1.0, 0.35)), vec2(1.20, 0.30), s + 0.10);
  c += vec3(1.0) * 1.20 * card(d, normalize(vec3(0.35, 0.30, -1.0)), vec2(1.10, 0.16), s + 0.04);
  c += vec3(0.92, 0.95, 1.00) * 1.25 * card(d, normalize(vec3(0.85, 0.05, -0.50)), vec2(0.70, 0.85), s + 0.25);
  c += vec3(0.92, 0.95, 1.00) * 0.90 * card(d, normalize(vec3(-0.85, 0.05, -0.50)), vec2(0.60, 0.85), s + 0.25);
  return c;
}

vec3 irradiance(vec3 n) {
  float top = max(dot(n, normalize(vec3(0.0, 1.0, 0.3))), 0.0);
  float front = max(n.z, 0.0);
  float side = max(dot(n, normalize(vec3(-1.0, 0.2, 0.3))), 0.0);
  return vec3(0.12) + vec3(0.85) * top + vec3(0.55) * front * front + vec3(0.30) * side + BRAND * 0.5 * max(n.x, 0.0);
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  float d; float u; vec2 gu;
  field(vP, d, u, gu);
  // Kantenglättung liegt ganz außerhalb der Kontur: An der Naht zwischen Vorder- und Rückseite bleibt alles deckend
  float aa = clamp(length(vec2(dFdx(d), dFdy(d))), 1e-4, 1.0);
  float a = clamp(d / aa + 1.0, 0.0, 1.0);
  // Naht schließen: Wo das Gitter die Kontur knapp verfehlt, zählt die eigene Seite der Fläche
  float ah = clamp(vH / max(fwidth(vH), 1e-5), 0.0, 1.0) * step(-1.0, d);
  a = max(a, ah);
  float ring = 1.0 - clamp((d - 3.2) / aa + 0.5, 0.0, 1.0);
  a *= mix(1.0, ring, uOutline);
  // Drahtgitter: Raster in der Fläche plus Höhenlinien der Wölbung. Eine Chrom-Welle (uSweep) überzieht es von links.
  float xs = (vP.x - uBox.x) / uBox.z * 0.5 + 0.5 + (vP.y - uBox.y) / uBox.z * 0.22;
  float solid = 1.0 - uWire * smoothstep(uSweep - 0.012, uSweep + 0.012, xs);
  vec2 gc = vP / 10.0;
  vec2 gl2 = abs(fract(gc - 0.5) - 0.5) / (fwidth(gc) * 1.25);
  float hh = sqrt(2.0 * max(u, 0.0)) / 6.5;
  float hl = abs(fract(hh - 0.5) - 0.5) / (fwidth(hh) * 1.25);
  float line = 1.0 - min(min(min(gl2.x, gl2.y), hl), 1.0);
  line = max(line, 1.0 - clamp((d - 1.6) / aa, 0.0, 1.0));
  float band = uWire * exp(-pow((xs - uSweep) / 0.018, 2.0));
  a *= mix(max(line * (uSide > 0.0 ? 1.0 : 0.32), band), 1.0, solid);
  if (a < 0.004) discard;
  // Der geglättete Saum außerhalb der Kontur tritt hinter jede echte Fläche zurück
  gl_FragDepth = d < 0.0 ? 0.99999 : gl_FragCoord.z;

  float zs = uPuff * sqrt(2.0 * max(u, 0.0));
  float k = uInflate * uPuff * uPuff;
  vec3 nl = normalize(vec3(-k * gu.x, k * gu.y, max(zs, 0.05)));
  nl.z *= uSide;
  vec3 n = normalize(uRot * nl);

  vec3 V = normalize(uCam - vWorld);
  // Hinter dem Horizont die Normale spiegeln: Die Farbe läuft an der Sichtkante stetig weiter
  float nv = dot(n, V);
  if (nv < 0.0) n -= 2.0 * nv * V;
  vec3 R = reflect(-V, n);
  float ndv = max(dot(n, V), 0.0);
  float fres = pow(1.0 - ndv, 5.0);

  // Zum Rand hin wird die Spiegelung weicher: Dort staucht sich die Umgebung auf wenige Pixel und würde flimmern
  float g3 = (1.0 - ndv) * (1.0 - ndv) * (1.0 - ndv);
  vec3 refl = env(R, uRough + 0.9 * g3);
  vec3 metal = refl * mix(uTint, vec3(1.0), fres);
  vec3 diel = uAlbedo * irradiance(n) + refl * (0.04 + 0.96 * fres) * uSpec;
  vec3 col = aces(mix(diel, metal, uMetal));
  col = pow(col, vec3(1.0 / 2.2));
  col = mix(col, uFlatColor, uFlat);
  col = mix(vec3(0.66, 0.76, 0.96), col, solid);
  col += band * vec3(0.75, 0.86, 1.0);
  outColor = vec4(col * a, a) * uOpacity;
}`;

// ---------- kleine Mathe-Helfer ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function rotation(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch), cz = Math.cos(roll), sz = Math.sin(roll);
  // R = Rx(pitch) · Ry(yaw) · Rz(roll), spaltenweise
  const m00 = cy * cz, m01 = -cy * sz, m02 = sy;
  const m10 = sx * sy * cz + cx * sz, m11 = -sx * sy * sz + cx * cz, m12 = -sx * cy;
  const m20 = -cx * sy * cz + sx * sz, m21 = cx * sy * sz + sx * cz, m22 = cx * cy;
  return new Float32Array([m00, m10, m20, m01, m11, m21, m02, m12, m22]);
}

// ---------- Materialien ----------
const MATERIALS = {
  chrom:   { metal: 1, rough: 0.0,  spec: 1.0, albedo: [0.5, 0.5, 0.5],       tint: [0.95, 0.96, 0.98] },
  schwarz: { metal: 0, rough: 0.04, spec: 1.6, albedo: [0.012, 0.013, 0.016], tint: [1, 1, 1] },
  blau:    { metal: 1, rough: 0.10, spec: 1.0, albedo: [0.02, 0.05, 0.16],    tint: [0.20, 0.36, 0.78] },
  weiss:   { metal: 0, rough: 0.45, spec: 0.5, albedo: [0.86, 0.86, 0.88],    tint: [1, 1, 1] },
};
export const MATERIAL_NAMES = { chrom: 'Chrom', schwarz: 'Schwarz', blau: 'Blau', weiss: 'Weiß' };

const SCALARS = ['yaw', 'pitch', 'roll', 'scale', 'oy', 'inflate', 'flat', 'outline', 'wire', 'sweep', 'metal', 'rough', 'spec', 'opacity'];
const VECTORS = ['albedo', 'tint'];
const baseState = () => ({ yaw: 0, pitch: 0, roll: 0, scale: 1, oy: 0, inflate: 1, flat: 0, outline: 0, wire: 0, sweep: 2, opacity: 1, ...structuredClone(MATERIALS.chrom) });

export async function initScenes() {
  const root = document.documentElement;
  const stages = [...document.querySelectorAll('[data-stage]')].map((el) => ({ el, type: el.dataset.stage, mark: el.querySelector('.stage__mark'), area: 0 }));
  if (!stages.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = matchMedia('(max-width: 734px)').matches;
  if (navigator.connection && navigator.connection.saveData) { root.classList.add('no-webgl'); return; }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Das Websign Logo als 3D-Modell');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) { root.classList.add('no-webgl'); return; }

  // ----- Daten laden -----
  let buf;
  try {
    const res = await fetch(FIELD_URL);
    if (!res.ok) throw new Error(res.status);
    buf = await res.arrayBuffer();
  } catch (err) { root.classList.add('no-webgl'); return; }
  const head = new DataView(buf, 0, 24);
  const FW = head.getUint16(4, true), FH = head.getUint16(6, true);
  const ranges = [[head.getFloat32(8, true), head.getFloat32(12, true)], [head.getFloat32(16, true), head.getFloat32(20, true)]];
  const raw = new Uint16Array(buf, 24, FW * FH * 2);
  const fieldData = new Float32Array(FW * FH * 2);          // R = Abstand zur Kontur, G = Ballon-Fläche
  const q = new Uint16Array(FW * FH);
  for (let pl = 0; pl < 2; pl++) {
    const [lo, hi] = ranges[pl], off = pl * FW * FH;
    for (let y = 0, i = 0; y < FH; y++) for (let x = 0; x < FW; x++, i++) {
      // 2D-Prädiktor rückgängig machen (Uint16 rechnet von selbst modulo 65536)
      q[i] = raw[off + i] + (x ? q[i - 1] : 0) + (y ? q[i - FW] : 0) - (x && y ? q[i - FW - 1] : 0);
      fieldData[i * 2 + pl] = lo + (q[i] / 65535) * (hi - lo);
    }
  }

  // ----- Programm -----
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) { console.error('[Websign 3D]', err); root.classList.add('no-webgl'); return; }
  gl.useProgram(prog);
  const U = {};
  for (const name of ['uField', 'uViewProj', 'uRot', 'uOffset', 'uScale', 'uBox', 'uPuff', 'uInflate', 'uSide', 'uCam', 'uOutline', 'uWire', 'uSweep', 'uFlat', 'uMetal', 'uRough', 'uSpec', 'uOpacity', 'uAlbedo', 'uTint', 'uFlatColor']) {
    U[name] = gl.getUniformLocation(prog, name);
  }

  // ----- Distanzfeld als Textur -----
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, FW, FH, 0, gl.RG, gl.FLOAT, fieldData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uField, 0);

  // ----- Gitter: nur Zellen, die das Logo berühren -----
  const step = small ? 2.4 : 1.5;
  const pad = 2;
  const gx0 = BOX.x0 - pad, gy0 = BOX.y0 - pad;
  const nx = Math.ceil((BOX.x1 - BOX.x0 + 2 * pad) / step) + 1;
  const ny = Math.ceil((BOX.y1 - BOX.y0 + 2 * pad) / step) + 1;
  const pos = new Float32Array(nx * ny * 2);
  const dv = new Float32Array(nx * ny);
  const sample = (x, y) => {
    const xi = clamp(Math.floor(x), 0, FW - 2), yi = clamp(Math.floor(y), 0, FH - 2);
    const fx = clamp(x - xi, 0, 1), fy = clamp(y - yi, 0, 1), o = (yi * FW + xi) * 2, r = FW * 2;
    return (fieldData[o] * (1 - fx) + fieldData[o + 2] * fx) * (1 - fy) + (fieldData[o + r] * (1 - fx) + fieldData[o + r + 2] * fx) * fy;
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = gx0 + i * step, y = gy0 + j * step, o = j * nx + i;
    pos[o * 2] = x; pos[o * 2 + 1] = y; dv[o] = sample(x, y);
  }
  const idx = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1;
    if (Math.max(dv[a], dv[b], dv[c], dv[e]) > -1.2) idx.push(a, c, b, b, c, e);
  }
  const indexCount = idx.length;
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform3f(U.uBox, (BOX.x0 + BOX.x1) / 2, (BOX.y0 + BOX.y1) / 2, (BOX.x1 - BOX.x0) / 2);
  gl.uniform1f(U.uPuff, PUFF);
  gl.uniform3f(U.uCam, 0, 0, CAM_D);
  gl.uniform3f(U.uFlatColor, 0.961, 0.961, 0.969);

  // ----- Zustand -----
  const dprCap = small || !finePointer ? 1.5 : 2;
  let quality = 1;
  let active = null;
  let alive = true;
  let raf = 0, last = 0, slowFrames = 0, frames = 0;
  let cssW = 1, cssH = 1, fit = { w: 1, cx: 0, cy: 0 };
  const cur = baseState();
  const pointer = { x: 0, y: 0 };
  const intro = { start: 0, done: reduced };
  const viewer = { yaw: -0.45, pitch: 0.16, vy: 0, vp: 0, dragging: false, material: 'chrom', px: 0, py: 0 };
  const VIEW_HOME = { yaw: -0.45, pitch: 0.16 };
  const sceneEl = document.querySelector('[data-scene]');
  const heroEl = document.querySelector('.hero');

  const controllers = {
    hero(now) {
      const t = baseState();
      const p = heroEl ? clamp(window.scrollY / Math.max(heroEl.offsetHeight, 1), 0, 1) : 0;
      let e = 1;
      if (!intro.done) {
        if (!intro.start) intro.start = now;
        const x = clamp((now - intro.start) / 1900, 0, 1);
        e = 1 - Math.pow(1 - x, 3);
        if (x >= 1) intro.done = true;
      }
      t.yaw = -0.5 - 0.55 * p + (1 - e) * 1.3 + pointer.x * 0.16;
      t.pitch = 0.2 - 0.3 * p + (1 - e) * 0.25 - pointer.y * 0.1;
      t.roll = -0.03;
      t.scale = (0.9 + 0.1 * e) * (1 - 0.1 * p);
      t.opacity = e;
      return t;
    },
    services() {
      const t = baseState();
      let p = 0;
      if (sceneEl) {
        const r = sceneEl.getBoundingClientRect();
        p = clamp(-r.top / Math.max(r.height - window.innerHeight, 1), 0, 1);
      }
      if (reduced) p = p < 0.33 ? 0.1 : p < 0.66 ? 0.5 : 1;
      // 1 flaches Zeichen · 2 es löst sich in ein Drahtgitter auf, wölbt sich und dreht · 3 eine Chrom-Welle überzieht es
      t.wire = smooth(0.24, 0.34, p);
      t.flat = 1 - smooth(0.26, 0.36, p);
      t.inflate = 0.02 + 0.98 * smooth(0.30, 0.46, p);
      t.yaw = 0.6 * smooth(0.28, 0.44, p) - 1.15 * smooth(0.44, 0.96, p);
      t.pitch = 0.3 * smooth(0.28, 0.44, p) - 0.08 * smooth(0.6, 0.96, p);
      t.roll = -0.03 * smooth(0.6, 0.9, p);
      t.sweep = -0.5 + 2.3 * smooth(0.62, 0.86, p);
      return t;
    },
    viewer() {
      const t = baseState();
      Object.assign(t, structuredClone(MATERIALS[viewer.material]));
      t.yaw = viewer.yaw; t.pitch = viewer.pitch;
      t.scale = 0.92;
      return t;
    },
  };

  // ----- Größe und Einpassung: Das 3D-Logo sitzt genau dort, wo das Standbild sitzt -----
  function measure() {
    if (!active) return;
    const sr = active.el.getBoundingClientRect();
    cssW = Math.max(1, Math.round(sr.width)); cssH = Math.max(1, Math.round(sr.height));
    const mr = active.mark.getBoundingClientRect();
    fit = { w: mr.width, cx: mr.left + mr.width / 2 - sr.left, cy: mr.top + mr.height / 2 - sr.top };
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * quality;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const pxPerUnit = cssH / (2 * CAM_D * Math.tan(FOV / 2));
    const proj = perspective(FOV, cssW / cssH, 0.1, 40);
    // Kamera bei z = CAM_D: vp = P · Translation(0, 0, -CAM_D)
    const vp = new Float32Array(proj);
    vp[12] = proj[8] * -CAM_D + proj[12];
    vp[13] = proj[9] * -CAM_D + proj[13];
    vp[14] = proj[10] * -CAM_D + proj[14];
    vp[15] = proj[11] * -CAM_D + proj[15];
    gl.uniformMatrix4fv(U.uViewProj, false, vp);
    gl.uniformMatrix3fv(U.uRot, false, rotation(cur.yaw, cur.pitch, cur.roll));
    gl.uniform1f(U.uScale, (fit.w / 2 / pxPerUnit) * cur.scale);
    gl.uniform3f(U.uOffset, (fit.cx - cssW / 2) / pxPerUnit, -(fit.cy - cssH / 2) / pxPerUnit + cur.oy, 0);
    gl.uniform1f(U.uInflate, cur.inflate);
    gl.uniform1f(U.uOutline, cur.outline);
    gl.uniform1f(U.uWire, cur.wire);
    gl.uniform1f(U.uSweep, cur.sweep);
    gl.uniform1f(U.uFlat, cur.flat);
    gl.uniform1f(U.uMetal, cur.metal);
    gl.uniform1f(U.uRough, cur.rough);
    gl.uniform1f(U.uSpec, cur.spec);
    gl.uniform1f(U.uOpacity, cur.opacity);
    gl.uniform3fv(U.uAlbedo, cur.albedo);
    gl.uniform3fv(U.uTint, cur.tint);
    gl.uniform1f(U.uSide, -1); gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1f(U.uSide, 1); gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
  }

  function frame(now) {
    raf = 0;
    if (!alive || !active || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    // Adaptive Qualität: bleibt die Bildrate unter 50 fps, sinkt die Auflösung
    if (last && now - last > 21 && now - last < 200) slowFrames++;
    if (++frames >= 45) {
      if (slowFrames > 22 && quality > 0.55) { quality *= 0.8; measure(); }
      frames = 0; slowFrames = 0;
    }
    last = now;

    if (active.type === 'viewer' && !viewer.dragging && (Math.abs(viewer.vy) > 1e-4 || Math.abs(viewer.vp) > 1e-4)) {
      viewer.yaw = clamp(viewer.yaw + viewer.vy, -1.25, 1.25);
      viewer.pitch = clamp(viewer.pitch + viewer.vp, -0.6, 0.6);
      viewer.vy *= 0.92; viewer.vp *= 0.92;
    }
    const target = controllers[active.type](now);
    const k = reduced ? 1 : 1 - Math.pow(1 - 0.11, dt * 60);
    let delta = 0;
    for (const key of SCALARS) { const d = target[key] - cur[key]; cur[key] += d * k; delta = Math.max(delta, Math.abs(d)); }
    for (const key of VECTORS) for (let i = 0; i < 3; i++) { const d = target[key][i] - cur[key][i]; cur[key][i] += d * k; delta = Math.max(delta, Math.abs(d)); }
    draw();
    const moving = delta > 4e-4 || !intro.done || Math.abs(viewer.vy) > 1e-4 || Math.abs(viewer.vp) > 1e-4 || viewer.dragging;
    if (moving) wake(); else last = 0;
  }
  function wake() { if (!raf && alive && active && !document.hidden) raf = requestAnimationFrame(frame); }

  // ----- Bühne wechseln: Canvas wandert in die sichtbarste Bühne -----
  function activate(stage) {
    if (stage === active) return;
    if (active) active.el.classList.remove('is-live');
    active = stage;
    if (!stage) { canvas.remove(); return; }
    stage.el.appendChild(canvas);
    measure();
    Object.assign(cur, controllers[stage.type](performance.now()));
    if (stage.type === 'hero' && !intro.done) cur.opacity = 0;
    draw();
    requestAnimationFrame(() => { if (active === stage && alive) stage.el.classList.add('is-live'); });
    last = 0;
    wake();
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const s = stages.find((x) => x.el === en.target);
      s.area = en.isIntersecting ? en.intersectionRect.width * en.intersectionRect.height : 0;
      if (!en.isIntersecting && s.type === 'viewer') { viewer.yaw = VIEW_HOME.yaw; viewer.pitch = VIEW_HOME.pitch; viewer.vy = viewer.vp = 0; }
    }
    let best = null;
    for (const s of stages) if (s.area > 0 && (!best || s.area > best.area)) best = s;
    if (best) activate(best); else if (active) { active.el.classList.remove('is-live'); active = null; canvas.remove(); }
  }, { rootMargin: '15% 0px', threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] });
  stages.forEach((s) => io.observe(s.el));

  // ----- Ereignisse -----
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { measure(); wake(); });
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => { measure(); wake(); }); stages.forEach((s) => ro.observe(s.el)); }
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); alive = false; if (active) active.el.classList.remove('is-live'); root.classList.add('no-webgl'); });

  if (finePointer && !reduced) {
    addEventListener('pointermove', (e) => {
      if (!active || active.type !== 'hero') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      wake();
    }, { passive: true });
  }

  // ----- Viewer: ziehen, drehen, Material wechseln -----
  const vStage = stages.find((s) => s.type === 'viewer');
  if (vStage) {
    const el = vStage.el;
    const controls = el.querySelector('[data-viewer-controls]');
    const nameEl = el.querySelector('[data-material-name]');
    const touched = () => el.classList.add('has-interacted');
    el.addEventListener('pointerdown', (e) => {
      if (active !== vStage || (controls && controls.contains(e.target)) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      viewer.dragging = true; viewer.px = e.clientX; viewer.py = e.clientY; viewer.vy = viewer.vp = 0;
      el.classList.add('is-dragging');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ohne Capture weiter */ }
      touched(); wake();
    });
    el.addEventListener('pointermove', (e) => {
      if (!viewer.dragging) return;
      const dx = e.clientX - viewer.px, dy = e.clientY - viewer.py;
      viewer.px = e.clientX; viewer.py = e.clientY;
      viewer.vy = dx * 0.007; viewer.vp = dy * 0.005;
      viewer.yaw = clamp(viewer.yaw + viewer.vy, -1.25, 1.25);
      viewer.pitch = clamp(viewer.pitch + viewer.vp, -0.6, 0.6);
      wake();
    });
    const release = () => { if (!viewer.dragging) return; viewer.dragging = false; el.classList.remove('is-dragging'); if (reduced) viewer.vy = viewer.vp = 0; wake(); };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.querySelectorAll('input[name="material"]').forEach((input) => input.addEventListener('change', () => {
      viewer.material = input.value;
      if (nameEl) nameEl.textContent = MATERIAL_NAMES[input.value];
      touched(); wake();
    }));
    el.querySelectorAll('[data-rotate]').forEach((btn) => btn.addEventListener('click', () => {
      viewer.vy = viewer.vp = 0;
      viewer.yaw = clamp(viewer.yaw + Number(btn.dataset.rotate) * 0.4, -1.25, 1.25);
      touched(); wake();
    }));
    const reset = el.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', () => { viewer.yaw = VIEW_HOME.yaw; viewer.pitch = VIEW_HOME.pitch; viewer.vy = viewer.vp = 0; wake(); });
  }

  root.classList.add('webgl');
}
