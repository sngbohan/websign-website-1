// Websign · Scroll-Keyframes
// Deklarativ: data-kf='{"start":"a0t - 100vh","end":"a0t - 50vh","opacity":[0,1],"y":[40,0],"scale":[0.96,1]}'
// oder kurz:  data-kf-preset="lift" | "fade" | "zoom"
//
// start/end sind Scroll-Positionen. a0t / a0b / a0h = Oberkante / Unterkante / Höhe von Anker 0 (das Element selbst,
// oder die Elemente aus data-kf-anchors="#a, #b" → a0, a1). Einheiten: vh, vw, px, % (von a0h).
// Ausgabe: nur CSS-Custom-Properties (--p, --o, --x, --y, --s, --r, weitere Schlüssel als --name). CSS setzt sie in
// transform und opacity um (site.css). Ein Scroll-Listener, ein requestAnimationFrame, keine Layout-Arbeit pro Bild:
// Positionen werden nur beim Start, bei Größenänderung und nach dem Laden gemessen.

const PRESETS = {
  lift: { start: 'a0t - 100vh', end: 'a0t - 55vh', opacity: [0, 1], y: [40, 0] },
  fade: { start: 'a0t - 100vh', end: 'a0t - 60vh', opacity: [0, 1] },
  zoom: { start: 'a0t - 100vh', end: 'a0t - 50vh', opacity: [0, 1], scale: [0.96, 1] },
};
const VARS = { opacity: '--o', x: '--x', y: '--y', scale: '--s', rotate: '--r' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// cubic-bezier als Funktion (Newton-Verfahren); 'ws' ist die Easing-Signatur --ease-ws
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= (((ax * t + bx) * t + cx) * t - x) / d;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const EASES = { linear: (x) => x, ws: bezier(0.22, 0.8, 0.2, 1), ui: bezier(0.3, 0.7, 0.2, 1) };

// Position im Dokument ohne transform, damit eine laufende Bewegung die Messung nicht verfälscht
function box(el) {
  let top = 0;
  for (let n = el; n; n = n.offsetParent) top += n.offsetTop;
  return { top, bottom: top + el.offsetHeight, height: el.offsetHeight };
}

function resolve(expr, anchors, vw, vh) {
  let sum = 0, sign = 1;
  for (const tok of String(expr).trim().split(/\s+/)) {
    if (tok === '+' || tok === '-') { sign = tok === '-' ? -1 : 1; continue; }
    const a = /^a(\d+)([tbh])$/.exec(tok);
    let v;
    if (a) { const b = anchors[+a[1]] || anchors[0]; v = a[2] === 't' ? b.top : a[2] === 'b' ? b.bottom : b.height; }
    else { const n = parseFloat(tok) || 0; v = tok.endsWith('vh') ? (n * vh) / 100 : tok.endsWith('vw') ? (n * vw) / 100 : tok.endsWith('%') ? (n * anchors[0].height) / 100 : n; }
    sum += sign * v; sign = 1;
  }
  return sum;
}

export function initMotion(root = document) {
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssTimeline = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  const items = [];

  for (const el of root.querySelectorAll('[data-kf], [data-kf-preset]')) {
    if (el.__kf) continue;
    let def = null;
    if (el.dataset.kf) {
      try { def = JSON.parse(el.dataset.kf); } catch (err) { console.warn('[Websign Motion] data-kf ist kein gültiges JSON:', el); continue; }
    } else if (cssTimeline && !reduced) continue;              // Preset läuft als CSS-Scroll-Zeitleiste
    def = { ...(PRESETS[el.dataset.kfPreset] || {}), ...def };
    if (!def.start || !def.end) { console.warn('[Websign Motion] start/end fehlen:', el); continue; }
    const props = Object.keys(def).filter((k) => Array.isArray(def[k]) && def[k].length === 2).map((k) => ({ name: VARS[k] || `--${k}`, from: +def[k][0], to: +def[k][1] }));
    const anchorEls = (el.dataset.kfAnchors || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => document.querySelector(s)).filter(Boolean);
    const item = { el, def, props, anchorEls: anchorEls.length ? anchorEls : [el], ease: EASES[def.ease] || EASES.linear, start: 0, end: 1, p: -1, active: true };
    el.__kf = item;
    items.push(item);
  }
  if (!items.length) return { refresh() {} };

  const apply = (it, p) => {
    p = Math.round(p * 1000) / 1000;
    if (p === it.p) return;
    it.p = p;
    const e = it.ease(p), s = it.el.style;
    s.setProperty('--p', p);
    for (const pr of it.props) s.setProperty(pr.name, Math.round((pr.from + (pr.to - pr.from) * e) * 1000) / 1000);
  };

  // Weniger Bewegung gewünscht: alles steht sofort im Endzustand, kein Listener
  if (reduced) { items.forEach((it) => apply(it, 1)); return { refresh() {} }; }

  const measure = () => {
    const vw = html.clientWidth, vh = window.innerHeight;
    for (const it of items) {
      const anchors = it.anchorEls.map(box);
      it.start = resolve(it.def.start, anchors, vw, vh);
      it.end = resolve(it.def.end, anchors, vw, vh);
    }
  };
  let queued = false;
  const update = () => {
    queued = false;
    const y = window.scrollY;
    for (const it of items) if (it.active) apply(it, clamp((y - it.start) / (it.end - it.start || 1), 0, 1));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  const refresh = () => { measure(); items.forEach((it) => { it.p = -1; }); queue(); };

  // Nur Elemente nahe am Viewport rechnen mit. Beim Verlassen rasten sie am passenden Ende ein.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        for (const it of items) {
          if (it.anchorEls[0] !== en.target) continue;
          it.active = en.isIntersecting;
          if (!it.active) apply(it, window.scrollY >= it.end ? 1 : 0);
        }
      }
      queue();
    }, { rootMargin: '100% 0px' });
    new Set(items.map((it) => it.anchorEls[0])).forEach((el) => io.observe(el));
  }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', refresh);
  addEventListener('load', refresh);
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(document.body);
  refresh();
  return { refresh };
}
