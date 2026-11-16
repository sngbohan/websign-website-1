// Websign · Liquid Glass
// Macht aus jedem Element mit der Klasse .lg ein Glasstück:
// 1. Brechung: Eine Verschiebungskarte (abgerundetes Rechteck, nur der Rand lenkt ab) bricht den Hintergrund
//    wie eine Linse, mit leichter Farbsäumung. Läuft als SVG-Filter im backdrop-filter, nur in Chromium.
// 2. Licht: Die helle Kante und der Glanzfleck folgen dem Zeiger.
// 3. Druck: Beim Drücken bricht das Glas stärker.

const SVG_NS = 'http://www.w3.org/2000/svg';
const mapCache = new Map();
let uid = 0;

// Abgerundetes Rechteck als Karte: R = Verschiebung in x, G = in y, 128 = neutral
function displacementMap(w, h, radius, bezel) {
  const key = `${w}x${h}r${radius}b${bezel}`;
  if (mapCache.has(key)) return mapCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const r = Math.min(radius, w / 2, h / 2);
  const hx = w / 2 - r, hy = h / 2 - r;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2, py = y + 0.5 - h / 2;
      const qx = Math.abs(px) - hx, qy = Math.abs(py) - hy;
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const len = Math.hypot(ox, oy);
      const inside = r - (len + Math.min(Math.max(qx, qy), 0));   // Abstand zur Kante, innen positiv
      let nx = 0, ny = 0;                                          // Normale nach außen
      if (len > 0) { nx = (ox / len) * Math.sign(px); ny = (oy / len) * Math.sign(py); }
      else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
      const t = 1 - Math.min(Math.max(inside / bezel, 0), 1);      // 0 in der Mitte, 1 an der Kante
      const m = inside < 0 ? 0 : 1 - Math.pow(1 - t, 3);           // konvexe Kurve: Die Kante wirkt wie eine Linse
      const i = (y * w + x) * 4;
      img.data[i] = 128 - nx * m * 127;                            // Inhalt wird zur Mitte hin gezogen
      img.data[i + 1] = 128 - ny * m * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png');
  mapCache.set(key, url);
  return url;
}

const el = (name, attrs) => { const n = document.createElementNS(SVG_NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

// Filter: drei Verschiebungen mit leicht verschiedener Stärke, je ein Farbkanal, wieder zusammengesetzt
function buildFilter(defs, id) {
  const f = el('filter', { id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB', x: 0, y: 0 });
  const image = el('feImage', { result: 'map', x: 0, y: 0, preserveAspectRatio: 'none' });
  f.append(image);
  const maps = [];
  const channels = [['r', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
  for (const [name, matrix] of channels) {
    const d = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: `d${name}` });
    f.append(d, el('feColorMatrix', { in: `d${name}`, type: 'matrix', values: matrix, result: name }));
    maps.push(d);
  }
  f.append(el('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }), el('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }));
  defs.append(f);
  return { filter: f, image, maps };
}

export function initLiquidGlass(root = document) {
  const nodes = [...root.querySelectorAll('.lg')];
  if (!nodes.length) return;
  const html = document.documentElement;
  const ua = navigator.userAgent;
  const chromium = /Chrome\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua) && window.CSS && CSS.supports('backdrop-filter', 'blur(1px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const refract = chromium && !reducedTransparency;
  if (!refract) html.classList.add('lg-fallback');

  let defs = null;
  if (refract) {
    const svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    svg.style.position = 'absolute';
    defs = el('defs', {});
    svg.append(defs);
    document.body.append(svg);
  }

  const items = nodes.map((node) => {
    const layer = document.createElement('span'); layer.className = 'lg__refract'; layer.setAttribute('aria-hidden', 'true');
    const rim = document.createElement('span'); rim.className = 'lg__rim'; rim.setAttribute('aria-hidden', 'true');
    node.prepend(layer, rim);
    node.classList.add('is-refracting');
    const item = { node, layer, strength: Number(node.dataset.glassStrength) || 56, angle: 315, gx: 22, gy: 0, tAngle: 315, tgx: 22, tgy: 0, pressed: false };
    if (refract) {
      item.id = `liquid-glass-${++uid}`;
      Object.assign(item, buildFilter(defs, item.id));
      const filter = `url(#${item.id}) blur(calc(2px + 22px * var(--glass-tint))) saturate(1.6) brightness(1.05)`;
      layer.style.backdropFilter = filter;
    }
    return item;
  });

  // Karte in exakter Größe des Elements, bei jeder Größenänderung neu
  const size = (item) => {
    if (!refract) return;
    const w = Math.round(item.node.offsetWidth), h = Math.round(item.node.offsetHeight);
    if (!w || !h) return;
    const radius = parseFloat(getComputedStyle(item.node).borderTopLeftRadius) || 0;
    const bezel = Math.max(8, Math.round(Math.min(w, h) * 0.34));
    const url = displacementMap(w, h, radius, bezel);
    for (const [k, v] of [['width', w], ['height', h]]) { item.filter.setAttribute(k, v); item.image.setAttribute(k, v); }
    item.image.setAttribute('href', url);
    setScale(item);
  };
  const setScale = (item) => {
    if (!refract) return;
    const s = item.strength * (item.pressed ? 1.2 : 1);
    item.maps[0].setAttribute('scale', s + 4);   // Rot bricht etwas stärker,
    item.maps[1].setAttribute('scale', s);
    item.maps[2].setAttribute('scale', s - 4);   // Blau etwas schwächer: feiner Farbsaum an der Kante
  };
  if ('ResizeObserver' in window) { const ro = new ResizeObserver((entries) => entries.forEach((en) => size(items.find((i) => i.node === en.target)))); items.forEach((i) => ro.observe(i.node)); }
  items.forEach(size);

  // Druck: Glas wird „flüssiger“
  for (const item of items) {
    const set = (v) => () => { item.pressed = v; setScale(item); };
    item.node.addEventListener('pointerdown', set(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) item.node.addEventListener(ev, set(false));
  }

  // Licht folgt dem Zeiger, gedämpft
  if (reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let raf = 0;
  const tick = () => {
    raf = 0;
    let moving = false;
    for (const it of items) {
      let da = ((it.tAngle - it.angle + 540) % 360) - 180;
      it.angle += da * 0.12; it.gx += (it.tgx - it.gx) * 0.12; it.gy += (it.tgy - it.gy) * 0.12;
      if (Math.abs(da) > 0.1 || Math.abs(it.tgx - it.gx) > 0.1 || Math.abs(it.tgy - it.gy) > 0.1) moving = true;
      it.node.style.setProperty('--light-angle', `${it.angle.toFixed(1)}deg`);
      it.node.style.setProperty('--glow-x', `${it.gx.toFixed(1)}%`);
      it.node.style.setProperty('--glow-y', `${it.gy.toFixed(1)}%`);
    }
    if (moving) raf = requestAnimationFrame(tick);
  };
  addEventListener('pointermove', (e) => {
    for (const it of items) {
      const r = it.node.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      it.tAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;       // conic-gradient: 0° zeigt nach oben
      it.tgx = Math.min(Math.max(((e.clientX - r.left) / r.width) * 100, -20), 120);
      it.tgy = Math.min(Math.max(((e.clientY - r.top) / r.height) * 100, -40), 140);
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
}
