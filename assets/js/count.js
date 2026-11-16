// Websign · Hochzählen
// <span data-count-to="1.2" data-count-decimals="1" data-count-suffix=" s">1,2 s</span>
// Im HTML steht der Endwert (so bleibt er ohne JavaScript lesbar). Beim ersten Einblenden zählt die Zahl einmal
// in 900 ms von data-count-from (Standard 0) zum Ziel, formatiert nach deutscher Schreibweise.
// Screenreader bekommen nur den Endwert: Die laufende Zahl ist aria-hidden, daneben steht der Endwert unsichtbar als Text.
// (Ein aria-label auf einem <span> ohne Rolle wird nicht zuverlässig vorgelesen, deshalb dieser Weg.)

const DURATION = 900;

// --ease-ws: cubic-bezier(0.22, 0.8, 0.2, 1)
function easeWs(x) {
  const cx = 0.66, bx = -0.72, ax = 1.06, cy = 2.4, by = -1.8, ay = 0.4;
  let t = x;
  for (let i = 0; i < 6; i++) {
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(d) < 1e-6) break;
    t -= (((ax * t + bx) * t + cx) * t - x) / d;
  }
  return ((ay * t + by) * t + cy) * t;
}

function setup(el) {
  const d = el.dataset;
  const decimals = Number(d.countDecimals) || 0;
  const fmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const text = (v) => `${d.countPrefix || ''}${fmt.format(v)}${d.countSuffix || ''}`;
  const visual = document.createElement('span');
  visual.className = 'count__value';
  visual.setAttribute('aria-hidden', 'true');
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  el.textContent = '';
  el.append(visual, spoken);
  const state = { el, visual, spoken, text, value: Number(d.countFrom) || 0, raf: 0 };
  el.__count = state;
  return state;
}

// Zählt zum neuen Wert. Auch für Live-Werte gedacht (z. B. Richtpreis): einfach erneut aufrufen.
export function countTo(el, to, { animate = true } = {}) {
  const st = el.__count || setup(el);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  cancelAnimationFrame(st.raf);
  st.spoken.textContent = st.text(to);
  const from = st.value;
  if (!animate || reduced || from === to) { st.value = to; st.visual.textContent = st.text(to); st.visual.style.minWidth = ''; return; }
  // Breite des Endwerts reservieren, damit daneben nichts wandert, solange die Ziffern wachsen
  st.visual.textContent = st.text(to);
  st.visual.style.minWidth = `${st.visual.getBoundingClientRect().width}px`;
  st.visual.textContent = st.text(from);
  let t0 = 0;
  const step = (now) => {
    if (!t0) t0 = now;
    const x = Math.min((now - t0) / DURATION, 1);
    st.value = from + (to - from) * easeWs(x);
    st.visual.textContent = st.text(x < 1 ? st.value : to);
    if (x < 1) st.raf = requestAnimationFrame(step);
    else { st.value = to; st.visual.style.minWidth = ''; }
  };
  st.raf = requestAnimationFrame(step);
}

export function initCount(root = document) {
  const els = [...root.querySelectorAll('[data-count-to]')].filter((el) => !el.__count);
  if (!els.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = (el) => Number(el.dataset.countTo) || 0;
  if (reduced || !('IntersectionObserver' in window)) { els.forEach((el) => countTo(el, target(el), { animate: false })); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      countTo(en.target, target(en.target));
    }
  }, { threshold: 0.6 });
  els.forEach((el) => {
    const st = setup(el);
    st.visual.textContent = st.text(st.value);        // Startwert, bis die Zahl ins Bild kommt
    st.spoken.textContent = st.text(target(el));
    io.observe(el);
  });
}
