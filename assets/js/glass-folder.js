// Websign · Projektordner aus Glas.
// Vanilla-Portierung der React-Komponente „Glass Folder Cards“: ohne React, ohne Abhängigkeiten.
//
// Jedes Projekt ist ein Ordner aus drei Ebenen: hinten eine Platte mit generiertem Kunstwerk
// (oder einem eigenen Bild), in der Mitte die Dateien des Projekts, vorne eine Glasscheibe,
// die alles dahinter weichzeichnet.
//   Ruhe    flach und geschlossen, die Dateien schauen gerade so heraus
//   Hover   die Scheibe kippt nach vorn, die Dateien heben sich ein Stück
//   Offen   Klick auf Scheibe oder Rückwand, Enter oder Leertaste: die Dateien fächern auf
//   Datei   Klick auf eine Datei öffnet sie groß in einer Dateiansicht (Pfeiltasten blättern)
// Esc oder ein Klick daneben schließt. Es ist immer nur ein Ordner offen.
//
// Das Kunstwerk wird im Browser berechnet (domain-warped noise, als Flüssigkeit schattiert),
// über mehrere Frames verteilt und erst gemalt, wenn die Sektion in die Nähe kommt.

// #region Kunstwerk
export const ART_PRESETS = {
  // Websign: Chrom über Blau, als Langzeitbelichtung
  chrom: { style: 'streak', colors: ['#0b1220', '#1a2742', '#284172', '#4766a0', '#c6d2e5', '#f5f7fb', '#8fa3c6'], scale: 0.7, warp: 1.5, angle: -0.62, gloss: 0.3, veins: 0 },
  // Websign: Marine und Eis, marmoriert
  navy: { style: 'marble', colors: ['#05070c', '#101a30', '#284172', '#0b0f1a', '#4766a0', '#9eb1d2', '#e6ecf6'], scale: 0.68, warp: 3.3, angle: -0.5, gloss: 0.55, veins: 0.5 },
  // Websign: hell, kühl, fast weiß
  eis: { style: 'streak', colors: ['#f5f7fb', '#c6d2e5', '#9eb1d2', '#e8edf5', '#4766a0', '#ffffff'], scale: 0.7, warp: 1.6, angle: 0.35, gloss: 0.25, veins: 0 },
  aurora: { style: 'streak', colors: ['#f4efe9', '#e9c2b8', '#c2433f', '#2a1e2a', '#22395e', '#6f97c2', '#e5edf4'], scale: 0.7, warp: 1.4, angle: -0.62, gloss: 0.18, veins: 0 },
  ember: { style: 'marble', colors: ['#07090c', '#16252c', '#3d5f68', '#1a1416', '#a3201a', '#ef4a2b', '#ff8a5c'], scale: 0.62, warp: 3.2, angle: -0.5, gloss: 0.55, veins: 0.6 },
  dusk: { style: 'marble', colors: ['#120c18', '#3e2850', '#8f6c9c', '#2b1a24', '#b3502f', '#eab08a', '#fbe7d2'], scale: 0.75, warp: 3.6, angle: 0.8, gloss: 0.5, veins: 0.5 },
  verdant: { style: 'marble', colors: ['#070b08', '#173024', '#4f7a5a', '#141812', '#a7843a', '#e9cf87', '#fbf3d6'], scale: 0.7, warp: 3.4, angle: 2.1, gloss: 0.5, veins: 0.5 },
};

function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// kleiner, schneller Zufall mit festem Startwert (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeFbm(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512);
  const p = [];
  for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; grad[i * 2] = Math.cos(a); grad[i * 2 + 1] = Math.sin(a); }
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const h00 = perm[X + perm[Y]] * 2, h10 = perm[X + 1 + perm[Y]] * 2;
    const h01 = perm[X + perm[Y + 1]] * 2, h11 = perm[X + 1 + perm[Y + 1]] * 2;
    const d00 = grad[h00] * xf + grad[h00 + 1] * yf;
    const d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
    const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
    const d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
  };
  return (x, y, octaves) => {
    let sum = 0, amp = 0.5;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y);
      const nx = 1.6 * x + 1.2 * y + 7.1;
      y = -1.2 * x + 1.6 * y + 3.3;
      x = nx;
      amp *= 0.5;
    }
    return sum;
  };
}

// Das Kunstwerk als Auftrag, der sich über mehrere Frames verteilen lässt.
function createArtJob(width, height, recipe, seed) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const colors = recipe.colors.length >= 2 ? recipe.colors : ['#111111', '#eeeeee'];
  const stops = colors.map((c, i) => ({ t: i / (colors.length - 1), c: hexToRgb(c) }));
  const scale = recipe.scale ?? 0.7, warp = recipe.warp ?? 3, gloss = recipe.gloss ?? 0.4, veins = recipe.veins ?? 0;
  const streak = recipe.style === 'streak';
  const fbm = makeFbm(seed * 977 + 13);
  const r = rng(seed + 1);
  const ox = r() * 50, oy = r() * 50;
  const angle = (recipe.angle ?? 0) + (r() - 0.5) * 0.5;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const m = Math.min(w, h);
  // Feld auf halber Auflösung (mit Rand), per Catmull-Rom hochgerechnet
  const gw = Math.ceil(w / 2) + 3, gh = Math.ceil(h / 2) + 3;
  const G = new Float32Array(gw * gh), GQ = new Float32Array(gw * gh);
  const F = new Float32Array(w * h), Q = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  let row = 0;

  const field = (gy) => {
    for (let gx = 0; gx < gw; gx++) {
      const u = ((gx - 1) * 2 - w / 2) / m;
      const v = ((gy - 1) * 2 - h / 2) / m;
      let px = (u * ca - v * sa) * scale;
      let py = (u * sa + v * ca) * scale;
      if (streak) { px *= 0.14; py *= 2.2; }
      px += ox; py += oy;
      const qx = fbm(px, py, 3);
      const qy = fbm(px + 5.2, py + 1.3, 3);
      const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3);
      const ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
      G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
      GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
    }
  };

  const upsample = () => {
    const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16;
    const T = new Float32Array(w * gh);
    for (let gy = 0; gy < gh; gy++) {
      const o = gy * gw;
      for (let x = 0; x < w; x++) {
        const c = (x >> 1) + 1;
        T[gy * w + x] = x & 1 ? cr(G[o + c - 1], G[o + c], G[o + c + 1], G[o + c + 2]) : G[o + c];
      }
    }
    for (let y = 0; y < h; y++) {
      const c = (y >> 1) + 1;
      for (let x = 0; x < w; x++) {
        F[y * w + x] = y & 1 ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x]) : T[c * w + x];
        const gx = (x >> 1) + 1;
        const q0 = GQ[c * gw + gx];
        const qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
        const q1 = y & 1 ? (x & 1 ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2 : GQ[(c + 1) * gw + gx]) : qx;
        Q[y * w + x] = (qx + q1) / 2;
      }
    }
  };

  const colorize = () => {
    const sample = [];
    const stride = Math.max(1, Math.floor(F.length / 4096));
    for (let i = 0; i < F.length; i += stride) sample.push(F[i]);
    sample.sort((a, b) => a - b);
    const lo = sample[Math.floor(sample.length * 0.02)];
    const hi = sample[Math.floor(sample.length * 0.98)];
    const k = 1 / (hi - lo || 1);
    const lx = -0.55, ly = -0.65, lz = 0.52;
    const slope = k * m * 0.012;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let t = (F[i] - lo) * k;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let j = 1;
        while (j < stops.length - 1 && stops[j].t < t) j++;
        const a = stops[j - 1], b = stops[j];
        let f = (t - a.t) / (b.t - a.t || 1);
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        f = f * f * (3 - 2 * f);
        const gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope;
        const gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
        const nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
        const spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255;
        const silk = 1 + 0.035 * Math.sin(t * 150 + Q[i] * 24);
        const vein = veins * Math.max(0, 1 - Math.abs(Q[i] - 0.42) * 14) * 0.6;
        const lit = (0.82 + 0.28 * nd) * silk * (1 - vein);
        pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
        pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
        pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
        pixels[i * 4 + 3] = 255;
      }
    }
  };

  const step = (rows) => {
    if (row >= gh) return true;
    const end = Math.min(gh, row + Math.max(1, rows));
    while (row < end) field(row++);
    if (row < gh) return false;
    upsample();
    colorize();
    return true;
  };

  return { width: w, height: h, pixels, step };
}

const recipeOf = (art) => (typeof art === 'string' ? ART_PRESETS[art] || ART_PRESETS.navy : art);

// Ein gemeinsamer Maler: Alle Ordner reihen ihre Bilder hier ein, die Schlange arbeitet höchstens 7 ms pro Frame.
const artCache = new Map();
const queue = [];
let pumping = false;

function pump() {
  if (pumping) return;
  pumping = true;
  const tick = () => {
    const until = performance.now() + 7;
    while (queue.length && performance.now() < until) {
      const head = queue[0];
      if (head.job.step(4)) {
        queue.shift();
        const c = document.createElement('canvas');
        c.width = head.job.width;
        c.height = head.job.height;
        c.getContext('2d')?.putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0);
        head.done(c);
      }
    }
    if (queue.length) requestAnimationFrame(tick);
    else pumping = false;
  };
  requestAnimationFrame(tick);
}

// Kleinere Priorität zuerst: Rückwände (0) vor den Dateien hinter dem Glas (1).
function paint(recipe, seed, w, h, priority) {
  const key = JSON.stringify([recipe, seed, w, h]);
  let p = artCache.get(key);
  if (!p) {
    p = new Promise((done) => {
      let at = queue.length;
      while (at > 1 && queue[at - 1].priority > priority) at--;
      queue.splice(at, 0, { job: createArtJob(w, h, recipe, seed), priority, done });
      pump();
    });
    artCache.set(key, p);
  }
  return p;
}
// #endregion

// ---------------------------------------------------------------------------
// Geometrie in Ordner-Einheiten: Die Bühne ist 340 × 272 groß und wird auf die Breite skaliert.
const W = 340, H = 272, HEADROOM = 54, FRONT_TOP = 74, FRONT_H = H - FRONT_TOP;
const SHEET_W = 272, SHEET_H = 184, MAX_VISIBLE = 4, MAX_WIDTH = 380;
const VIEW_W = 960, VIEW_H = 650;   // Kunstwerk in der Dateiansicht, gleiches Seitenverhältnis wie ein Blatt
const BACK_PATH = 'M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z';
const FRONT_PATH = `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${FRONT_H - 22}A22 22 0 0 1 318 ${FRONT_H}L22 ${FRONT_H}A22 22 0 0 1 0 ${FRONT_H - 22}Z`;
const SVG = 'http://www.w3.org/2000/svg';

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'style') Object.assign(node.style, v);
    else if (k === 'vars') for (const [n, val] of Object.entries(v)) node.style.setProperty(n, val);
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.filter(Boolean));
  return node;
}
function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

const dpr = () => Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const count = (n) => `${n} ${n === 1 ? 'Datei' : 'Dateien'}`;

// Zeichenfläche für ein Kunstwerk. Gemalt wird erst, wenn start() aufgerufen wird.
function artCanvas(art, seed, w, h, density, priority, className) {
  const c = el('canvas', { class: className, 'aria-hidden': 'true', style: { width: `${w}px`, height: `${h}px`, maxWidth: 'none' } });
  const start = () => paint(recipeOf(art), seed, Math.round(w * density), Math.round(h * density), priority).then((src) => {
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')?.drawImage(src, 0, 0);
    c.dataset.ready = '';
  });
  return { node: c, start };
}

let openFolder = null;   // es ist immer nur ein Ordner offen

// ---------------------------------------------------------------------------
// Dateiansicht: ein gemeinsames natives <dialog> (Fokusfalle, Esc, Rückfokus vom Browser).
let viewer = null;

function iconBtn(icon, label) {
  return el('button', { type: 'button', class: 'icon-btn', 'aria-label': label },
    svg('svg', { 'aria-hidden': 'true' }, svg('use', { href: `#${icon}` })));
}

function getViewer(track) {
  if (viewer) return viewer;
  const dlg = el('dialog', { class: 'modal gf-viewer', 'data-theme': 'dark', 'aria-labelledby': 'gf-viewer-title' });
  if (!dlg.showModal) return null;
  const close = iconBtn('i-close', 'Schließen');
  close.classList.add('modal__close');
  const eyebrow = el('p', { class: 'modal__eyebrow' });
  const title = el('h2', { class: 't-headline-s', id: 'gf-viewer-title' });
  const frame = el('div', { class: 'gf-viewer__frame' });
  const meta = el('p', { class: 'gf-viewer__meta' });
  const link = el('a', { class: 'link link--chevron', rel: 'noopener', 'data-track': 'project-file-live', text: 'Website ansehen' });
  const prev = iconBtn('i-prev', 'Vorherige Datei');
  const next = iconBtn('i-next', 'Nächste Datei');
  const pos = el('p', { class: 'gf-viewer__pos', 'aria-live': 'polite' });
  const nav = el('div', { class: 'gf-viewer__nav' }, prev, pos, next);
  dlg.append(close, eyebrow, title, frame, el('div', { class: 'gf-viewer__foot' }, el('div', {}, meta, link), nav));
  document.body.append(dlg);

  let state = null;
  const show = (i) => {
    const { label, files, href } = state;
    state.index = (i + files.length) % files.length;
    const file = files[state.index];
    eyebrow.textContent = label;
    title.textContent = file.name;
    meta.textContent = file.meta || '';
    meta.hidden = !file.meta;
    const to = file.href || href;
    link.hidden = !to;
    if (to) link.href = to;
    pos.textContent = `${state.index + 1} von ${files.length}`;
    nav.hidden = files.length < 2;
    frame.textContent = '';
    frame.className = `gf-viewer__frame${file.image || file.art ? '' : ' gf-viewer__frame--paper'}`;
    if (file.image) {
      frame.append(el('img', { src: file.image, alt: file.alt || '', width: SHEET_W * 2, height: SHEET_H * 2, decoding: 'async' }));
    } else if (file.art) {
      // Sofort die kleine Fassung vergrößert zeigen, dann die große nachmalen
      const c = el('canvas', { 'aria-hidden': 'true', width: VIEW_W, height: VIEW_H });
      const small = state.sheets[state.index]?.querySelector('canvas[data-ready]');
      if (small) c.getContext('2d')?.drawImage(small, 0, 0, VIEW_W, VIEW_H);
      frame.append(c);
      paint(recipeOf(file.art), hashString(file.name || '') % 997, VIEW_W, VIEW_H, 0).then((src) => {
        if (c.isConnected) { c.getContext('2d')?.drawImage(src, 0, 0); c.dataset.ready = ''; }
      });
    } else {
      frame.append(el('span', { class: 'gf-viewer__page', 'aria-hidden': 'true' },
        ...[34, 92, 86, 96, 64, 0, 88, 94, 72, 0, 90, 58].map((w) => el('i', { style: { width: `${w}%` } }))));
    }
  };
  prev.addEventListener('click', () => show(state.index - 1));
  next.addEventListener('click', () => show(state.index + 1));
  close.addEventListener('click', () => dlg.close());
  // Fokus zurück auf die Datei, die geöffnet wurde (Safari fokussiert Buttons beim Klick nicht)
  dlg.addEventListener('close', () => state?.opener?.focus({ preventScroll: true }));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (!state || state.files.length < 2 || e.target.closest('a')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(state.index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(state.index + 1); }
  });
  viewer = {
    node: dlg,
    open(next, index) {
      state = { ...next, index };
      show(index);
      dlg.showModal();
      close.focus();
      track('project-file', { project: next.label, file: next.files[index].name });
    },
  };
  return viewer;
}

/**
 * Baut einen Ordner.
 * project: { name, meta?, url?, tone?: 'dark'|'light', art?: Preset|Rezept|'none', seed?, image?, labelPlacement?, files?: [{ name, meta?, art?, image?, alt?, href? }] }
 * opts: { label?: string (überschreibt name), delay?: number, track?: fn }
 */
export function createFolder(project, opts = {}) {
  const { delay = 0, track = () => {} } = opts;
  const files = (project.files || []).slice(0, MAX_VISIBLE);
  const tone = project.tone === 'light' ? 'light' : 'dark';
  const art = project.art ?? 'navy';
  const seed = project.seed ?? (hashString(project.name || '') % 97);
  const place = project.labelPlacement || 'bottom-left';
  const label = opts.label || project.name || 'Projekt';
  const meta = project.meta || count(files.length);
  const href = project.url || null;
  const pending = [];   // Kunstwerke, die erst gemalt werden, wenn der Ordner in die Nähe kommt
  const k0 = MAX_WIDTH / W;

  const root = el('div', { class: 'gf-root', 'data-tone': tone, 'data-place': place });
  const stage = el('div', { class: 'gf-stage' });
  const tilt = el('div', { class: 'gf-tilt' });

  // Rückwand
  const back = el('div', { class: 'gf-back', 'aria-hidden': 'true', style: { clipPath: `path('${BACK_PATH}')` } });
  if (project.image) {
    back.append(el('img', { class: 'gf-art', src: project.image, alt: '', width: W + 24, height: H + 24, loading: 'lazy', decoding: 'async', draggable: 'false' }));
  } else if (art !== 'none') {
    const a = artCanvas(art, seed, W + 24, H + 24, dpr() * k0, 0, 'gf-art');
    back.append(a.node);
    pending.push(a.start);
  }
  back.append(el('div', { class: 'gf-back-sheen' }));
  const backRim = svg('svg', { class: 'gf-rim gf-back-rim', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, svg('path', { d: BACK_PATH }));

  // Glasscheibe, unten angeschlagen
  const gid = `gf-rim-${Math.random().toString(36).slice(2, 9)}`;
  const front = el('div', { class: 'gf-front', style: { clipPath: `path('${FRONT_PATH}')` } });
  const frontRim = svg('svg', { class: 'gf-rim gf-front-rim', viewBox: `0 0 ${W} ${FRONT_H}`, 'aria-hidden': 'true' },
    svg('defs', {}, svg('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' },
      svg('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.95' }),
      svg('stop', { offset: '0.35', 'stop-color': '#fff', 'stop-opacity': '0.35' }),
      svg('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0.12' }))),
    svg('path', { d: FRONT_PATH, stroke: `url(#${gid})` }));
  const hit = el('button', { type: 'button', class: 'gf-hit', 'aria-expanded': 'false' });
  const title = el('span', { class: 'gf-title', text: label.replace(/^Projekt /, '') });   // auf dem Ordner nur die Nummer
  const metaEl = el('span', { class: 'gf-meta', text: meta });
  front.append(el('div', { class: 'gf-tint', 'aria-hidden': 'true' }), el('div', { class: 'gf-spec', 'aria-hidden': 'true' }), frontRim, hit, el('div', { class: 'gf-label' }, title, metaEl));

  // Mattes Websign-Zeichen auf dem freien Platz der Scheibe (Lage je nach Beschriftung, siehe CSS)
  front.append(svg('svg', { class: 'gf-logo', viewBox: '0 0 608.5 268.5', 'aria-hidden': 'true' }, svg('use', { href: '#ws-mark' })));

  // Dateien: im Tab-Ablauf nach dem Glas, auf dem Bildschirm dahinter. Die erste Datei liegt vorn.
  // Ein Klick auf eine Datei öffnet sie groß in der Dateiansicht.
  const list = el('div', { class: 'gf-files', role: 'list', 'aria-label': `Dateien zu ${label}` });
  const visible = files.slice().reverse();
  const sheets = [];
  visible.forEach((file, v) => {
    const slot = visible.length <= 1 ? 0 : (v / (visible.length - 1)) * 2 - 1;
    const jitter = rng(hashString(file.name || '') + v);
    const picture = !!(file.art || file.image);
    const index = visible.length - 1 - v;   // Position in project.files
    const sheet = el('button', {
      type: 'button',
      class: `gf-sheet${picture ? ' gf-sheet--art' : ''}`,
      'aria-label': `${file.name} ansehen`,
      'aria-haspopup': 'dialog',
      vars: {
        '--gf-slot': slot,
        '--gf-depth': visible.length - 1 - v,
        '--gf-jx': `${((jitter() - 0.5) * 10).toFixed(2)}px`,
        '--gf-jr': `${((jitter() - 0.5) * 3.2).toFixed(2)}deg`,
      },
      style: { zIndex: v + 1 },
    });
    if (file.image) {
      sheet.append(el('img', { class: 'gf-sheet-art', src: file.image, alt: file.alt || '', width: SHEET_W, height: SHEET_H, loading: 'lazy', decoding: 'async', draggable: 'false' }));
    } else if (file.art) {
      const a = artCanvas(file.art, hashString(file.name || '') % 997, SHEET_W, SHEET_H, Math.min(dpr() * k0, 1.25), 1, 'gf-sheet-art');
      sheet.append(a.node);
      pending.push(a.start);
    } else {
      sheet.append(el('span', { class: 'gf-lines', 'aria-hidden': 'true' }, ...[86, 92, 64, 88, 42].map((w) => el('i', { style: { width: `${w}%` } }))));
    }
    sheet.append(el('span', { class: 'gf-sheet-head' },
      el('span', { class: 'gf-sheet-name', text: file.name }),
      file.meta ? el('span', { class: 'gf-sheet-meta', text: file.meta }) : null));
    sheets[index] = sheet;
    sheet.addEventListener('click', () => {
      const v = getViewer(track);
      if (v) v.open({ label, files, href, sheets, opener: sheet }, index);
      else if (file.href || href) location.href = file.href || href;
    });
    list.append(el('div', { role: 'listitem', class: 'gf-sheet-slot' }, sheet));
  });

  // Taste: zur Live-Website
  let key = null;
  if (href) {
    key = el('a', { class: 'gf-key', href, rel: 'noopener', 'aria-label': `${label} live ansehen`, 'data-track': 'project-live' },
      svg('svg', { class: 'gf-glyph', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: 'M8 16L16 8M9.5 8H16v6.5' })));
  }

  tilt.append(el('div', { class: 'gf-shadow', 'aria-hidden': 'true' }), back, backRim, front, list);
  if (key) tilt.append(key);
  stage.append(tilt);
  root.append(stage);

  // ---- Größe: folgt der Spalte, höchstens MAX_WIDTH -------------------------
  const size = (width) => {
    const w = Math.max(220, Math.min(MAX_WIDTH, Math.floor(width)));
    const k = w / W;
    root.style.width = `${w}px`;
    root.style.height = `${(H + HEADROOM) * k}px`;
    stage.style.transform = `translateY(${HEADROOM * k}px) scale(${k})`;
  };

  // ---- Öffnen und Schließen -------------------------------------------------
  const setLabel = (open) => hit.setAttribute('aria-label', `${label}: Dateien ${open ? 'schließen' : 'zeigen'}, ${count(files.length)}`);
  // Solange die Dateiansicht offen ist, bleibt der Ordner offen: Esc und Klicks gehören dann dem Dialog.
  const viewing = () => !!viewer?.node.open;
  const onKey = (e) => { if (e.key === 'Escape' && !viewing()) { setOpen(false); hit.focus(); } };
  const onDown = (e) => { if (!viewing() && !root.contains(e.target)) setOpen(false); };
  function setOpen(open) {
    if (open === root.hasAttribute('data-open')) return;
    if (open && openFolder && openFolder !== api) openFolder.setOpen(false);
    root.toggleAttribute('data-open', open);
    hit.setAttribute('aria-expanded', String(open));
    list.toggleAttribute('inert', !open);
    setLabel(open);
    if (open) {
      openFolder = api;
      document.addEventListener('keydown', onKey);
      document.addEventListener('pointerdown', onDown);
      track('project-open', { project: label });
    } else {
      if (openFolder === api) openFolder = null;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    }
  }
  hit.addEventListener('click', () => setOpen(!root.hasAttribute('data-open')));
  // Auch die Rückwand mit dem Kunstwerk öffnet und schließt (für die Maus; die Tastatur nutzt die Scheibe)
  back.addEventListener('click', () => setOpen(!root.hasAttribute('data-open')));
  list.toggleAttribute('inert', true);
  setLabel(false);

  // ---- Licht und Parallaxe folgen dem Zeiger, ohne Layout -------------------
  let raf = 0, px = 0, py = 0;
  const write = () => { raf = 0; root.style.setProperty('--gf-px', px.toFixed(3)); root.style.setProperty('--gf-py', py.toFixed(3)); };
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = root.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * 2 - 1;
    py = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(write);
  });
  root.addEventListener('pointerleave', () => { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(write); });

  // ---- Auftritt und Malen ---------------------------------------------------
  let painted = false, entered = false;
  const near = () => { if (!painted) { painted = true; pending.forEach((fn) => fn()); } };
  const enter = () => { if (!entered) { entered = true; setTimeout(() => root.setAttribute('data-entered', ''), reduced() ? 0 : delay); } };

  const api = { node: root, size, setOpen, near, enter };
  return api;
}

/**
 * Füllt die Projekt-Sektion. Ohne Projekte in config.js erscheinen drei Beispiel-Ordner.
 * Solange config.showProjectNames nicht true ist, heißen die Ordner „Projekt 1“, „Projekt 2“ …
 */
export function initFolders(config, track = () => {}) {
  const listEl = document.querySelector('[data-folders]');
  if (!listEl) return;
  const real = Array.isArray(config.projects) && config.projects.length > 0;
  const projects = real ? config.projects : PLACEHOLDERS;
  const named = real && config.showProjectNames === true;
  listEl.textContent = '';
  const folders = projects.map((p, i) => {
    const f = createFolder(p, { label: named ? null : `Projekt ${String(i + 1).padStart(3, '0')}`, delay: (i % 3) * 140, track });
    listEl.append(el('li', { class: 'folders__item' }, f.node));
    return f;
  });

  const fit = () => folders.forEach((f) => f.size(f.node.parentElement.clientWidth));
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(listEl);
  else addEventListener('resize', fit);

  if (!('IntersectionObserver' in window)) { folders.forEach((f) => { f.near(); f.enter(); }); return; }
  // Malen beginnt kurz bevor die Sektion erscheint, der Auftritt erst im Bild
  const nearIo = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    nearIo.disconnect();
    folders.forEach((f) => f.near());
  }, { rootMargin: '900px 0px' });
  nearIo.observe(listEl);
  const enterIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const f = folders.find((x) => x.node === e.target);
      if (f) { f.near(); f.enter(); }
      enterIo.unobserve(e.target);
    }
  }, { threshold: 0.25 });
  folders.forEach((f) => enterIo.observe(f.node));
}

// Beispiel-Ordner, bis echte Projekte in config.js stehen
const PLACEHOLDERS = [
  { art: 'navy', seed: 7, tone: 'dark',
    files: [{ name: 'Website', meta: 'Desktop', art: 'eis' }, { name: 'Mobil', meta: 'Responsive', art: 'chrom' }, { name: 'Konzept', meta: 'PDF' }] },
  { art: 'chrom', seed: 3, tone: 'light', labelPlacement: 'top-left',
    files: [{ name: 'Logo', meta: 'SVG', art: 'navy' }, { name: 'Farben & Schrift', meta: 'Regelwerk' }, { name: 'Website', meta: 'Desktop', art: 'dusk' }] },
  { art: 'ember', seed: 11, tone: 'dark', labelPlacement: 'top-right',
    files: [{ name: '3D-Modell', meta: 'Echtzeit', art: 'verdant' }, { name: 'Scroll-Szene', meta: 'Motion', art: 'aurora' }, { name: 'Storyboard', meta: 'PDF' }] },
];
