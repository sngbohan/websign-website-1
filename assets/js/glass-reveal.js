// Websign · Glas-Enthüllung des Logos im Hero (Schleife).
// Ablauf wie in der Vorlage: Ein runder Tropfen landet mit stark vergrößertem Logo, breitet sich zur
// klaren Glaskachel aus, das Logo gleitet aus der Vergrößerung und liegt groß am Rand, wo die Kante es
// in Farbe bricht (vor allem in den Ecken oben rechts und unten links). Ein Lichtband zieht über die
// Scheibe, dann gibt das Glas das Logo frei, es wird etwas kleiner, steht kurz, blendet weich aus,
// und der nächste Tropfen fällt. Zusätzlich ist das Logo leicht geprägt (Fase, Lichtkante,
// Seitenwand, Schatten), damit es dreidimensional wirkt.
// Ein WebGL2-Durchgang, keine Abhängigkeiten. Ohne WebGL2 oder im Datensparmodus bleibt das SVG-Zeichen.
//
// Vanilla-Portierung der React-Komponente „Liquid Glass Logo Reveal“ (21st.dev); Shader und
// Feder-Zeitplan stammen aus zanwei/glass-icon-reveal (MIT-Lizenz): https://github.com/zanwei/glass-icon-reveal

// ---------------------------------------------------------------------------
// Einstellungen: das helle Preset der Vorlage mit den Werten der 21st-Demo (logoScale 0.6,
// finalScale 0.8, startZoom 2.3), dazu die Prägung (relief).
const SETTINGS = {
  logoScale: 0.6, finalScale: 0.8, logoOffset: [0, 0], iconPlate: false, keepPlate: false,
  opticalDepth: 1.1, dispersion: 1.7, colorBleed: 1.25, doubleBevel: 1, bevelWidth: 0.14, corner: 4.8,
  cornerPull: 2.1, cornerWidth: 2.2, cornerFocus: 0.58, edgeSmear: 2.85, stretch: 0, tilt: 0.35, bulge: 1,
  specular: 1, halo: 0, shadow: 1, ripple: 1,
  bounce: 0, response: 0.42, startSize: 0.2, startZoom: 2.3, glide: 2.3, present: 2.4, drift: 0.12, swell: 0.5, focus: 1,
  sheen: 1, lightTurn: 0.9,
  hold: 1, background: '#05070c', plateColor: '#ffffff', logoColor: '#c6d2e5',
  relief: 1,
};

const TEX = 1024;    // Größe der Logo-Textur
const BOX = 0.75;    // Anteil der Textur, den das Logo füllt (Rest: Platz fürs Distanzfeld)
const TAIL = 1.1;    // vom Loslassen des Glases bis alles ruht, Sekunden
const OUTRO = 0.5;   // Schleife: das Logo blendet weich aus, bevor der nächste Tropfen fällt
const endOf = (P) => P.present + TAIL;

const pause = () => new Promise((r) => setTimeout(r, 0));

// ---------------------------------------------------------------------------
// Logo → Distanzfeld (+ außen, − innen)
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Logo konnte nicht geladen werden'));
    img.src = src;
  });
}

function markUrl(d, vbW, vbH) {
  const s = TEX / Math.max(vbW, vbH);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${Math.round(vbW * s)}" height="${Math.round(vbH * s)}"><path fill="#ffffff" d="${d}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Zeichnet das Logo zentriert in die TEX × TEX-Fläche, beschnitten auf die sichtbaren Pixel.
function fitToTexture(img) {
  const sw = img.naturalWidth || TEX, sh = img.naturalHeight || TEX;
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = TEX;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  const s0 = Math.min(TEX / sw, TEX / sh);
  const dx0 = (TEX - sw * s0) / 2, dy0 = (TEX - sh * s0) / 2;
  tc.drawImage(img, dx0, dy0, sw * s0, sh * s0);
  const d = tc.getImageData(0, 0, TEX, TEX).data;
  let x0 = TEX, y0 = TEX, x1 = -1, y1 = -1;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    if (d[(y * TEX + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('Logo ist leer');
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const s = (TEX * BOX) / Math.max(bw, bh);
  const out = document.createElement('canvas');
  out.width = out.height = TEX;
  const oc = out.getContext('2d', { willReadFrequently: true });
  oc.imageSmoothingQuality = 'high';
  oc.drawImage(img, TEX / 2 - (x0 + bw / 2 - dx0) * s, TEX / 2 - (y0 + bh / 2 - dy0) * s, sw * s0 * s, sh * s0 * s);
  return out;
}

// Distanzfeld aus dem Alpha-Kanal (TinySDF-Verfahren), in kurze Aufgaben geteilt.
async function buildSdf(canvas) {
  const n = TEX * TEX;
  const alpha = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, TEX, TEX).data;
  const INF = 1e20;
  const outer = new Float64Array(n), inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i * 4 + 3] / 255;
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else { const dd = 0.5 - a; outer[i] = dd > 0 ? dd * dd : 0; inner[i] = dd < 0 ? dd * dd : 0; }
  }
  const f = new Float64Array(TEX), z = new Float64Array(TEX + 1), v = new Uint16Array(TEX);
  for (const grid of [outer, inner]) {
    for (let x = 0; x < TEX; x++) { edt1d(grid, x, TEX, f, v, z, INF); if ((x & 127) === 127) await pause(); }
    for (let y = 0; y < TEX; y++) { edt1d(grid, y * TEX, 1, f, v, z, INF); if ((y & 127) === 127) await pause(); }
  }
  const sdf = new Float32Array(n);
  for (let i = 0; i < n; i++) sdf[i] = (Math.sqrt(outer[i]) - Math.sqrt(inner[i])) / TEX;
  return sdf;
}

function edt1d(grid, offset, stride, f, v, z, INF) {
  v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < TEX; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do { const r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < TEX; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

// ---------------------------------------------------------------------------
// Shader: Glas-Optik unverändert aus der Vorlage. Neu ist nur logoAt (Prägung) und der Schatten
// unter dem freigegebenen Logo. Die Farbübernahme aus Bildern (originalColors) entfällt: Das Logo ist einfarbig.
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uCenter;      // Mitte der Kachel, Gerätepixel, GL-Koordinaten
uniform float uTile;       // Kachelgröße, Gerätepixel
uniform sampler2D uSdf;    // Distanzfeld, Textureinheiten, + außen
uniform float uBoxFrac;

uniform float uPlateScale;
uniform float uShapeN;
uniform float uCornerN;
uniform float uOptics;
uniform float uPlateAlpha;
uniform float uLogoHalf;
uniform vec2 uLogoOff;
uniform float uBold;
uniform float uBlur;
uniform float uFrost;
uniform float uDome;
uniform float uDrop;
uniform float uPinch;
uniform float uTilt;
uniform float uRim;
uniform float uHalo;
uniform float uShadow;
uniform float uGhost;
uniform float uRipR;
uniform float uRipA;
uniform float uBare;
uniform float uReach;
uniform float uCornerPull;
uniform float uStreak;
uniform float uWiden;
uniform float uSlab;
uniform float uEtaSpread;
uniform float uFocus;
uniform float uFocusK;
uniform float uFocusSplit;
uniform float uRimLine;
uniform float uCornerOn;
uniform float uDissolve;
uniform float uGlow;
uniform float uFaceDisp;
uniform float uVivid;

uniform float uDisp;
uniform float uDouble;
uniform float uBevelW;
uniform float uSpec;
uniform float uIconPlate;
uniform float uLightScene;
uniform float uLightGlass;
uniform float uKeep;
uniform float uSheen;
uniform float uSweep;
uniform float uLightAng;

uniform float uRelief;     // 0 = flach, 1 = geprägt

uniform vec3 uBg;
uniform vec3 uPlateCol;
uniform vec3 uLogoCol;
uniform vec3 uSideCol;     // Farbe der Seitenwand

float px;

vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

float sdfAt(vec2 q, float k) {
  vec2 uv = vec2(0.5 + (q.x - uLogoOff.x) * k, 0.5 - (q.y - uLogoOff.y) * k);
  return texture(uSdf, uv).r / k;
}

// Das Logo an der Stelle q (Kacheleinheiten): Farbe und Deckung.
// Geprägt: eine Fase am Rand fängt Licht von oben links, darunter liegt nach rechts unten versetzt
// die dunklere Seitenwand, so dass das Zeichen wie ein flacher Körper wirkt.
vec4 logoAt(vec2 q, float blur, float aa) {
  float L = uLogoHalf;
  float k = 0.5 * uBoxFrac / L;
  float d = sdfAt(q, k) - uBold * L;
  float w = 0.75 * aa + blur;
  float a = 1.0 - smoothstep(-w, w, d);
  vec3 c = uLogoCol;
  if (uRelief > 0.001) {
    float e = 0.004 * L;
    vec2 gD = vec2(sdfAt(q + vec2(e, 0.0), k) - uBold * L - d, sdfAt(q + vec2(0.0, e), k) - uBold * L - d) / e;
    float t = clamp(-d / (0.11 * L), 0.0, 1.0);
    float slope = 1.8 * (1.0 - t) * (1.0 - t) * uRelief;
    vec3 n = normalize(vec3(gD * slope, 1.0));
    vec3 Ld = normalize(vec3(-0.5, 0.62, 0.72));
    float diff = clamp(dot(n, Ld), 0.0, 1.0);
    float spec = pow(max(dot(n, normalize(Ld + vec3(0.0, 0.0, 1.0))), 0.0), 36.0);
    float sheenFace = 0.06 * (q.y - uLogoOff.y) / L;   // leichter Verlauf: oben heller
    vec3 face = c * (0.66 + 0.44 * diff + sheenFace) + vec3(0.5) * spec;
    face = mix(c, face, uRelief);
    // Seitenwand: der Körper reicht nach rechts unten hinter die Fläche
    vec2 dir = vec2(0.028, -0.040) * L * uRelief;
    float sd = min(min(sdfAt(q - dir * 0.34, k), sdfAt(q - dir * 0.67, k)), sdfAt(q - dir, k)) - uBold * L;
    float sideA = 1.0 - smoothstep(-w, w, sd);
    c = mix(uSideCol, clamp(face, 0.0, 1.0), a);
    a = max(a, sideA);
  }
  return vec4(c, a);
}

float shape(vec2 p, float scale, float n, out vec2 nOut, out float g, out vec2 dg) {
  vec2 pp = p / scale;
  vec2 a = max(abs(pp), vec2(1e-6));
  g = pow(pow(a.x, n) + pow(a.y, n), 1.0 / n);
  dg = sign(pp) * pow(a, vec2(n - 1.0)) * pow(max(g, 1e-6), 1.0 - n);
  float dgl = max(length(dg), 1e-6);
  nOut = dg / dgl;
  return (g - 1.0) / dgl * scale;
}

float contourRadius(vec2 p, float scale, float n) {
  vec2 a = max(abs(p / scale), vec2(1e-4));
  vec2 a1 = pow(a, vec2(n - 1.0));
  vec2 a2 = pow(a, vec2(n - 2.0));
  float k = (n - 1.0) * (a2.x * a1.y * a1.y + a2.y * a1.x * a1.x) / pow(max(dot(a1, a1), 1e-30), 1.5);
  return scale / max(k, 1e-3);
}

vec2 refractSample(float x, float bwF, float eta, float R, vec2 dirOut, vec2 p, float dome, float offMul) {
  float u = clamp(1.0 - x, 0.0, 0.995);
  float th = asin(u), thr = asin(u / eta);
  float z = uSlab + bwF * sqrt(1.0 - u * u);
  float off = offMul * z * tan(th - thr);
  off = off / (1.0 + off / (6.0 * R));
  return p - (dirOut * off + p * dome) * uOptics;
}

float gauss(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
float band(float x, float a, float b, float w) { return smoothstep(a - w, a, x) * (1.0 - smoothstep(b, b + w, x)); }

float bump(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
vec3 spectrum(float x) {
  return vec3(bump(x, 0.34, 0.2) + 0.08 * bump(x, 0.93, 0.05), bump(x, 0.58, 0.1), bump(x, 0.8, 0.11));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  px = 2.0 / uTile;
  vec2 p = (gl_FragCoord.xy - uCenter) * px;

  vec4 lg = logoAt(p, uBlur, px);
  // weicher Schatten unter dem freigegebenen Logo
  float L0 = uLogoHalf, k0 = 0.5 * uBoxFrac / L0;
  float shD = sdfAt(p - vec2(0.05, -0.075) * L0, k0);
  float shA = (1.0 - smoothstep(-0.06 * L0, 0.16 * L0, shD)) * uRelief * uBare;
  vec3 bgPlain = uBg * (1.0 - mix(0.10, 0.22, uLightScene) * shA);
  vec3 plain = mix(bgPlain, lg.rgb, lg.a * uBare);

  vec2 nOut, dg; float g;
  float sd = shape(p, uPlateScale, uShapeN, nOut, g, dg);
  float s = -sd;
  float bw = max(uBevelW, 0.004) * uPlateScale;
  float x = clamp(s / bw, 0.0, 1.0);
  float R = contourRadius(p, uPlateScale, uShapeN);
  vec2 pq = p * p;
  float diag = 4.0 * pq.x * pq.y / max((pq.x + pq.y) * (pq.x + pq.y), 1e-6);
  float tilt = mix(1.0 - uTilt, 1.0, smoothstep(-0.02, 0.02, p.x * p.y));
  float pinchPart = uPinch * min(g * g, 1.0) * diag * diag * tilt;
  float dome = uDome * (1.0 - min(g * g, 1.0)) + pinchPart;
  vec2 dirOut = normalize(mix(nOut, p / max(length(p), 1e-4), 0.2));
  float cornerness = max(smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y), smoothstep(0.15, 0.75, diag));
  float offMul = 1.0 + 0.4 * max(uCornerPull - 1.0, 0.0) * tilt * cornerness * uCornerOn;
  vec2 focus = sign(p) * (pow(0.5, 1.0 / uShapeN) - uFocus * 0.70710678) * uPlateScale;
  float focusW = tilt * cornerness * uOptics * uCornerOn;
  float bwF = max(uReach, 0.004) * (1.0 + uWiden * tilt * cornerness * uCornerOn);
  float xf = clamp(s / bwF, 0.0, 1.0);
  vec2 qc = refractSample(xf, bwF, 1.5, R, dirOut, p, dome, offMul);
  float foot = max(max(length(dFdx(qc)), length(dFdy(qc))), 0.25 * px);

  vec3 bg = uBg;
  vec3 lift = mix(uBg + vec3(0.06), mix(uBg, vec3(1.0), 0.55), uLightScene);
  if (uGhost > 0.001) {
    vec2 gn, gdg; float gg;
    float gsd = shape(p, 1.0, uCornerN, gn, gg, gdg);
    bg = mix(bg, lift, uGhost * 0.12 * (1.0 - smoothstep(-0.16, 0.14, gsd)));
    bg *= 1.0 - uGhost * 0.03 * uLightScene * exp(-max(gsd, 0.0) / 0.12) * step(0.0, gsd);
  }
  float outside = max(sd, 0.0);
  if (uRipA > 0.001) {
    float d0 = (uRipR - 1.0) * uPlateScale;
    float rx = (sd - d0) / 0.022;
    float ring = exp(-rx * rx);
    bg += uRipA * ring * (0.04 * (0.55 + 0.45 * dot(nOut, normalize(vec2(-0.5, 0.8))))) * mix(0.5, 1.0, uLightScene);
    bg -= uRipA * 0.016 * uLightScene * exp(-(rx - 1.6) * (rx - 1.6));
  }
  float shadowFall = max(sd, 0.0) / (0.9 * uPlateScale);
  bg *= 1.0 - uShadow * 0.03 * exp(-shadowFall * shadowFall) * step(0.0, sd);
  vec3 haloCol = mix(vec3(0.62, 0.69, 0.80), vec3(1.0), uLightScene);
  bg = mix(bg, haloCol, clamp(uHalo * (0.30 * exp(-outside / (0.025 * uPlateScale)) + 0.07 * exp(-outside / (0.12 * uPlateScale))), 0.0, 1.0) * step(0.0, sd));

  vec3 col = bg;
  float soft = px + uBlur * 0.8 + 0.06 * uDissolve * (1.0 - uKeep) * uPlateScale;
  if (sd < soft) {
    float y1 = 1.0 - x;
    const float K = 2.6;
    float base1 = max(1.0 - pow(y1, K), 1e-4);
    float db = min(pow(y1, K - 1.0) * pow(base1, 1.0 / K - 1.0), 25.0);
    float s1 = bw * 0.62;
    float w2 = bw * 0.22;
    float t2 = clamp((s - s1) / w2, -1.0, 1.0);
    float dh2 = uDouble * bw * 0.16;
    float dd = dh2 * 0.5 * cos(t2 * 1.5707963) * 1.5707963 / w2 * step(abs(t2), 0.999);
    vec2 gDome = -uDome * 2.0 * g * dg * step(g, 1.0);
    vec2 grad = -(db + dd) * nOut + gDome;

    vec3 back = mix(uBg, uPlateCol, uIconPlate);
    vec3 liftG = mix(back + vec3(0.06), mix(back, vec3(1.0), 0.55), uLightGlass);
    float rblur = uBlur + 0.05 * length(qc - p) + min(uGlow * uOptics * (1.0 - xf) * foot / px, 0.04);

    float cornerW = smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y);
    float streak = 0.35 * uStreak * bw * mix(0.15, 1.0, cornerW) * pow(1.0 - xf, 1.5) * uOptics;
    vec2 tangent = vec2(-nOut.y, nOut.x);
    vec3 acc = vec3(0.0), wsum = vec3(0.0);
    for (int i = 0; i < 20; i++) {
      float lam = (float(i) + 0.5) / 20.0;
      float c = uDisp * (1.0 - 2.0 * lam);
      vec2 along = tangent * (streak * 2.0 * (fract(float(i) * 0.618034 + 0.31) - 0.5));
      float cf = uDisp * (1.0 - 2.0 * lam) * (lam > 0.5 ? 1.0 : 0.5);
      vec2 sp = refractSample(xf, bwF, 1.5 + uEtaSpread * c, R, dirOut, p + along,
                              dome + pinchPart * 0.3 * c, offMul);
      vec2 focusL = focus - sign(p) * (0.70710678 * uFocusSplit * c * uPlateScale);
      float wFocus = pow(1.0 - xf, uFocusK) * smoothstep(0.0, uRimLine * (1.0 + 0.6 * c), xf);
      sp = mix(sp, mix(p + along, focusL, wFocus), focusW);
      float faceOnly = smoothstep(0.7, 1.0, xf) * uOptics;
      sp *= 1.0 + uFaceDisp * cf * faceOnly;
      vec4 l = logoAt(sp, rblur + 0.12 * streak + uFaceDisp * 0.5 * max(c, 0.0) * faceOnly, foot);
      vec3 w = spectrum(lam);
      acc += mix(back, l.rgb, l.a) * w;
      wsum += w;
    }
    vec3 trans = acc / wsum;
    float tl = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    trans = clamp(tl + (trans - tl) * (1.0 + uVivid * uOptics), 0.0, 1.0);
    float hazeLum = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    float hazeGate = mix(1.0 - smoothstep(0.25, 0.75, hazeLum), smoothstep(0.25, 0.75, hazeLum), uLightGlass);
    trans = mix(trans, liftG, uFrost * 0.45 * hazeGate);

    float glassAmt = pow(1.0 - uDissolve, 1.5);
    float lit = uSpec * glassAmt;
    vec3 rimCol = mix(vec3(0.80, 0.87, 0.97), vec3(1.0), uLightGlass);

    float sc = uPlateScale;
    float tLum = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    float lightOnly = smoothstep(0.35, 0.85, tLum);
    float hw = smoothstep(-0.85, 0.5, dot(nOut, rot(vec2(0.5, 0.866), uLightAng)));
    float tileBand = band(s, 0.016 * sc, 0.075 * sc, 0.022 * sc);
    float dropBand = (1.0 - smoothstep(0.06 * sc, 0.13 * sc, s)) * smoothstep(0.0, 0.004 * sc, s);
    float glow = mix(0.32 * tileBand, 0.75 * dropBand, uDrop) * lightOnly;
    float edgeLine = gauss(s, 0.005 * sc, 0.0045 * sc);
    float lip = gauss(s, 0.15 * sc, 0.007 * sc) * uDouble * (1.0 - uDrop);
    vec3 lightGlass = mix(trans, vec3(1.0), glow * glassAmt);
    lightGlass += (0.075 * hw * edgeLine + 0.06 * (0.4 + 0.6 * hw) * lip) * lit;
    lightGlass *= 1.0 - 0.05 * (1.0 - hw) * edgeLine * glassAmt * (1.0 - uDrop);
    lightGlass = mix(lightGlass, vec3(1.0), 0.55 * uDrop * glassAmt * edgeLine);

    vec3 Nl = normalize(vec3(-grad, 1.0));
    float edge = 1.0 - Nl.z;
    vec2 ldir = rot(normalize(vec2(-0.62, 0.78)), uLightAng);
    float side = dot(nOut, ldir);
    float fres = pow(edge, 1.5);
    vec3 rim = rimCol * fres * (0.35 + 0.65 * max(side, -side * 0.8)) * uRim * 0.65;
    vec3 Hv = normalize(normalize(vec3(-0.45, 0.6, 0.66)) + vec3(0.0, 0.0, 1.0));
    float spc = pow(max(dot(Nl, Hv), 0.0), 140.0) * 0.8 * smoothstep(0.0, 0.25, y1);
    vec3 darkGlass = trans * (1.0 - 0.25 * fres) + (rim + vec3(spc)) * lit;
    darkGlass = mix(darkGlass, rimCol, uDrop * 0.4 * uSpec * (1.0 - smoothstep(0.0, 0.1 * uPlateScale, s)));
    vec3 glass = mix(darkGlass, lightGlass, uLightGlass);

    float sweepD = dot(p / uPlateScale, normalize(vec2(0.8, 0.6))) - uSweep;
    float sheen = uSheen * glassAmt * exp(-sweepD * sweepD / 0.03) * (0.55 + 0.45 * (1.0 - x));
    glass = mix(glass, vec3(1.0), sheen * mix(0.22, 0.42, uLightGlass));

    float cov = clamp(0.5 - sd / soft, 0.0, 1.0);
    col = mix(bg, glass, cov);
  }

  vec3 outc = mix(plain, col, uPlateAlpha);
  outc += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(outc, 1.0);
}`;

// ---------------------------------------------------------------------------
// Federn und Zeitplan (aus der Vorlage)
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const smoother = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
function hexToRgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const v = parseInt(h.slice(0, 6), 16) || 0;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
function cssColorToHex(c) {
  const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(c || '');
  return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : null;
}
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function spring(t, response, damping) {
  if (t <= 0) return 0;
  const w = (2 * Math.PI) / response;
  if (damping >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}
const reachCache = new Map();
function timeToReach(level, response, damping) {
  const key = `${level}/${response}/${damping}`;
  let t = reachCache.get(key);
  if (t === undefined) {
    let lo = 0, hi = 3;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (spring(mid, response, damping) < level) lo = mid; else hi = mid; }
    reachCache.set(key, (t = hi));
  }
  return t;
}

// Alle Bewegung steckt hier, der Shader bekommt nur die Zahlen (unverändert aus der Vorlage).
function frameAt(T, P, outro = 0) {
  const tx = P.present;
  const keep = P.keepPlate ? 1 : 0;
  const damping = 1 - P.bounce;
  const grow = spring(T + 0.01, P.response, damping);
  const tl = timeToReach(0.85, P.response, damping) - 0.01;
  const tm = timeToReach(0.92, P.response, damping) - 0.01;
  const morph = spring(T - tm, 0.4, 1);
  const drop = 1 - smooth(0.05, 1, morph);
  const appear = smooth(0, 0.08, T);
  const drift = P.drift * spring(T - 0.3, 2.2, 1);
  const zoomIn = 0.25 * spring(T, 0.7, 1) + 0.75 * smoother(0, P.glide, T);
  const settle = spring(T - 0.5, 2.4, 1);
  const exit = spring(T - tx, 0.95, 1);
  const release = spring(T - tx - 0.05, 0.65, 1);
  const dome = 0.15 * P.bulge * (1 - smooth(0.4, 0.95, grow));
  const view = (1 + (P.startZoom - 1) * (1 - zoomIn)) * (1 - 0.045 * settle) * mix(1, P.finalScale, exit) * (1 - 0.06 * outro);
  const bandW = mix(P.bevelWidth, Math.max(P.bevelWidth, 0.4), drop);
  const plateScale = mix(P.startSize, 1, grow) * (1 + drift) * (1 + 0.14 * release * (1 - keep)) * (1 - keep * (0.03 * release + 0.06 * outro));
  const bg = hexToRgb(P.background);
  return {
    uPlateScale: plateScale,
    uShapeN: mix(2, P.corner, morph),
    uCornerN: P.corner,
    uOptics: 1 - smooth(0.55, 1, release),
    uPlateAlpha: keep ? appear * (1 - outro) : appear * (1 - smooth(0.45, 1, release)),
    uLogoHalf: P.logoScale * view,
    uLogoOff: [P.logoOffset[0] * view, P.logoOffset[1] * view],
    uKeep: keep,
    uSheen: P.sheen,
    uSweep: mix(-1.6, 1.6, smoother(0.9, tx - 0.1, T)),
    uLightAng: P.lightTurn * smoother(0.4, tx + 0.4, T),
    uBold: P.swell * 0.03 * (1 - zoomIn),
    uBlur: P.focus * 0.05 * (1 - smooth(0.3, 0.95, grow)) + 0.03 * outro,
    uFrost: P.focus * (1 - smooth(0.5, 0.95, grow)),
    uPinch: 0.38 * P.stretch * smooth(0.1, 0.9, morph) * smooth(0.75, 0.97, zoomIn),
    uTilt: P.tilt,
    uDome: dome,
    uDrop: drop,
    uRim: 1 + 0.8 * drop,
    uHalo: P.halo * (0.5 + 0.5 * drop) * (1 - keep * release),
    uShadow: Math.max(P.shadow * smooth(0.45, 0.8, grow) * (1 - smooth(0, 0.6, morph)), 0.8 * P.shadow * keep * release),
    uGhost: smooth(0, 0.03, T) * (1 - smooth(0.04, 0.08, T)),
    uRipR: 1 + 0.9 * Math.max(0, T - tl),
    uRipA: P.ripple * smooth(tl, tl + 0.06, T) * Math.exp(-Math.max(0, T - tl) / 0.6),
    uBare: (1 - keep) * smooth(tx - 0.25, tx, T) * (1 - outro),
    uReach: bandW * plateScale,
    uCornerPull: P.cornerPull,
    uStreak: P.edgeSmear,
    uWiden: P.cornerWidth,
    uSlab: 0.3 * P.opticalDepth,
    uEtaSpread: 0.06,
    uFocus: P.cornerFocus,
    uFocusK: 1.0,
    uFocusSplit: 0.056 * P.colorBleed,
    uRimLine: 0.09,
    uCornerOn: smooth(0.35, 1, morph),
    uGlow: 0.012 * P.colorBleed,
    uFaceDisp: 0.012 * P.dispersion,
    uVivid: 0.85,
    uDissolve: release,
    uDisp: P.dispersion,
    uDouble: P.doubleBevel,
    uBevelW: bandW * (1 - release),
    uSpec: P.specular,
    uIconPlate: P.iconPlate ? 1 : 0,
    uLightScene: luminance(bg) > 0.5 ? 1 : 0,
    uLightGlass: luminance(P.iconPlate ? hexToRgb(P.plateColor) : bg) > 0.5 ? 1 : 0,
    uRelief: P.relief,
    uBg: bg,
    uPlateCol: hexToRgb(P.plateColor),
    uLogoCol: hexToRgb(P.logoColor),
    uSideCol: hexToRgb(P.logoColor).map((v, i) => v * (luminance(bg) > 0.5 ? 0.42 : 0.38) + [0.0, 0.01, 0.04][i]),
  };
}

// ---------------------------------------------------------------------------
// Renderer
async function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  // Übersetzen im Hintergrund, wo der Browser es kann; Status erst abfragen, wenn es fertig ist
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (parallel) while (!gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) await new Promise((r) => setTimeout(r, 16));
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(prog, i); U[info.name] = gl.getUniformLocation(prog, info.name); }
  const sdfTex = gl.createTexture();
  gl.uniform1i(U.uSdf, 0);

  return {
    setLogo(sdf) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sdfTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, TEX, TEX, 0, gl.RED, gl.FLOAT, sdf);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    },
    render(fr, w, h, cx, cy, tilePx) {
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uCenter, cx, cy);
      gl.uniform1f(U.uTile, tilePx);
      gl.uniform1f(U.uBoxFrac, BOX);
      for (const k in fr) { const v = fr[k]; if (typeof v === 'number' && U[k]) gl.uniform1f(U[k], v); }
      gl.uniform3fv(U.uBg, fr.uBg);
      gl.uniform3fv(U.uPlateCol, fr.uPlateCol);
      gl.uniform3fv(U.uLogoCol, fr.uLogoCol);
      gl.uniform3fv(U.uSideCol, fr.uSideCol);
      gl.uniform2fv(U.uLogoOff, fr.uLogoOff);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

// ---------------------------------------------------------------------------
/**
 * Startet die Glas-Enthüllung in der Bühne [data-glass-hero]. Die Kachel sitzt mittig zwischen
 * Navigation und Hero-Text. Das SVG-Zeichen bleibt sichtbar, bis das Glas bereit ist, und kommt zurück,
 * falls der WebGL-Kontext verloren geht. Ein Klick auf die Kachel startet die Enthüllung neu.
 */
export async function initGlassReveal(track = () => {}) {
  const stage = document.querySelector('[data-glass-hero]');
  const mark = stage && stage.querySelector('.stage__mark');
  const path = document.querySelector('#ws-mark path');
  const symbol = document.getElementById('ws-mark');
  if (!stage || !mark || !path || !symbol) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Farben aus der Seite: Hintergrund des Hero, Logo in der Farbe des Standbilds
  const P = { ...SETTINGS };
  const section = stage.closest('section') || document.body;
  const bg = cssColorToHex(getComputedStyle(section).backgroundColor);
  if (bg) P.background = bg;
  const logoCol = cssColorToHex(getComputedStyle(mark).color);
  if (logoCol) P.logoColor = logoCol;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = await createRenderer(canvas); } catch (err) { console.error('[Websign Glas-Logo]', err); return; }
  if (!renderer) return;

  // Logo aus dem SVG-Symbol der Seite: eine Quelle für Standbild und Glas
  const [, , vbW, vbH] = (symbol.getAttribute('viewBox') || '0 0 608.5 268.5').split(/[\s,]+/).map(Number);
  try {
    const img = await loadImage(markUrl(path.getAttribute('d'), vbW, vbH));
    await pause();
    const tex = fitToTexture(img);
    await pause();
    renderer.setLogo(await buildSdf(tex));
  } catch (err) { console.error('[Websign Glas-Logo]', err); return; }

  const nav = document.querySelector('[data-nav]');
  const text = section.querySelector('.hero__content');
  const end = endOf(P);
  let time = reduceMotion ? 1.4 : 0;   // bei reduzierter Bewegung: ein Standbild mit Glas
  let playing = !reduceMotion, pauseLeft = 0, outro = 0;
  let started = false, visible = false, lost = false, dirty = true, raf = 0, last = 0;
  let geo = { w: 1, h: 1, cx: 0, cy: 0, tile: 1, rect: null };

  // Die Kachel füllt die Lücke zwischen Navigation und Text; links und rechts bleibt Luft.
  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const sr = stage.getBoundingClientRect();
    const cw = Math.max(1, sr.width), ch = Math.max(1, sr.height);
    const top = (nav ? nav.getBoundingClientRect().bottom : sr.top) + 20;
    // offsetTop statt getBoundingClientRect: der Text gleitet beim Laden noch herein (transform)
    const bottom = (text ? section.getBoundingClientRect().top + text.offsetTop : sr.bottom) - 28;
    const cy = (top + bottom) / 2;
    const tileCss = Math.max(140, Math.min(bottom - top, cw * 0.62, 460));
    const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    geo = { w, h, cx: (sr.width / 2) * dpr, cy: (sr.bottom - cy) * dpr, tile: tileCss * dpr,
      rect: { x0: sr.left + cw / 2 - tileCss / 2, x1: sr.left + cw / 2 + tileCss / 2, y0: cy - tileCss / 2, y1: cy + tileCss / 2 } };
    dirty = true;
  }

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (playing) {
      if (pauseLeft > 0) {
        // Pause der Schleife: fertiges Logo halten, dann weich ausblenden, dann neu beginnen
        pauseLeft -= dt;
        const was = outro;
        outro = clamp01(1 - pauseLeft / OUTRO);
        if (pauseLeft <= 0) { pauseLeft = 0; outro = 0; time = 0; }
        if (outro !== was || time === 0) dirty = true;
      } else {
        time += dt;
        if (time >= end) { time = end; pauseLeft = Math.max(0.05, P.hold) + OUTRO; }
        dirty = true;
      }
    }
    if (dirty && !lost) {
      renderer.render(frameAt(Math.min(time, end), P, outro), geo.w, geo.h, geo.cx, geo.cy, geo.tile);
      dirty = false;
    }
    if (visible && playing && !lost && !document.hidden) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  const kick = () => { if (!raf && visible && !lost && !document.hidden) raf = requestAnimationFrame(tick); };

  function start() {
    started = true;
    stage.appendChild(canvas);
    measure();
    requestAnimationFrame(() => stage.classList.add('is-live'));   // Standbild blendet aus, das Glas ein
    kick();
  }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !started) start();
    else if (visible) kick();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
  }).observe(stage);
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (started) { measure(); kick(); } }).observe(stage);
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });

  // Klick auf die Kachel: von vorn
  const onTile = (e) => { const r = geo.rect; return !!r && e.clientX >= r.x0 && e.clientX <= r.x1 && e.clientY >= r.y0 && e.clientY <= r.y1; };
  stage.addEventListener('pointermove', (e) => { stage.style.cursor = started && !lost && !reduceMotion && onTile(e) ? 'pointer' : ''; });
  stage.addEventListener('click', (e) => {
    if (!started || lost || reduceMotion || !onTile(e)) return;
    time = 0; playing = true; pauseLeft = 0; outro = 0; dirty = true; last = 0;
    track('hero-glass-replay');
    kick();
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    stage.classList.remove('is-live');   // das SVG-Zeichen übernimmt wieder
  });
}
