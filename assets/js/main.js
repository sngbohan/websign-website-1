// Websign · Seitenlogik: Inhalte aus config.js, Reveal, Navigation, Modals, Galerien, Szenen-Text.
// 3D, Glas, Konfigurator und die Bausteine motion/count/media werden nachgeladen, damit der erste Aufbau schlank bleibt.
import { config, REQUIRED_LEGAL } from './config.js';

window.__wsReady = true;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Entwicklungsmodus: nur lokal und nur mit ?dev. Dann bleiben alle offenen Stellen als orange Platzhalter sichtbar.
const local = /^(localhost|127\.0\.0\.1|\[::1\])?$|\.(localhost|test)$/.test(location.hostname);
const dev = local && new URLSearchParams(location.search).has('dev');
document.documentElement.classList.toggle('dev', dev);

// Ein Wert gilt als vorhanden, wenn er nicht leer ist. Listen brauchen einen Eintrag, Gruppen mindestens einen gefüllten Wert.
const present = (v) => v != null && v !== '' && v !== false && (Array.isArray(v) ? v.length > 0 : typeof v === 'object' ? Object.values(v).some(present) : true);
const get = (path) => {
  path = path.replace(/^config\./, '');
  if (path === 'legal.complete') return REQUIRED_LEGAL.every((p) => present(get(p)));
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), config);
};
// Mehrere Pfade (Leerzeichen) müssen alle erfüllt sein; „a|b“ heißt: einer von beiden reicht.
const has = (paths) => paths.trim().split(/[\s,]+/).every((p) => p.split('|').some((q) => present(get(q))));

// Messpunkt für spätere, einwilligungsbasierte Analyse: Es wird nichts gesendet, nur ein Ereignis ausgelöst.
export function track(name, detail = {}) {
  document.dispatchEvent(new CustomEvent('ws:track', { detail: { name, ...detail } }));
}

// ---------- data-requires: Was keine Daten hat, bleibt unsichtbar ----------
// data-requires="contact.email"       sichtbar, sobald alle genannten Werte in config.js stehen (CSS versteckt es bis dahin)
// data-requires="form.endpoint|contact.email"   sichtbar, sobald einer der beiden Werte steht
// data-requires-not="pricing.types"   Ausweichtext: sichtbar, solange einer der Werte fehlt
function applyRequires() {
  $$('[data-requires]').forEach((el) => {
    if (dev || has(el.dataset.requires)) el.setAttribute('data-ok', '');
    else el.hidden = true;
  });
  $$('[data-requires-not]').forEach((el) => { if (!dev && has(el.dataset.requiresNot)) el.hidden = true; });
}

// ---------- Inhalte aus config.js einsetzen ----------
function fillConfig() {
  $$('[data-config], [data-text]').forEach((el) => {
    const v = get(el.dataset.config || el.dataset.text);
    if (present(v) && typeof v !== 'object') el.textContent = v;
  });
  const c = config.contact;
  $$('[data-email-link]').forEach((a) => { if (c.email) a.href = `mailto:${c.email}`; else a.removeAttribute('href'); });
  $$('[data-tel-link]').forEach((a) => { if (c.phone) a.href = `tel:${c.phone.replace(/[^+\d]/g, '')}`; else a.removeAttribute('href'); });
  $$('[data-href]').forEach((a) => { const v = get(a.dataset.href); if (present(v)) a.href = v; else a.removeAttribute('href'); });

  // Strukturierte Daten: Kontakt nur ergänzen, wenn er in config.js steht
  const ld = $('script[data-ld]');
  if (ld) {
    try {
      const d = JSON.parse(ld.textContent);
      if (c.email) d.email = c.email;
      if (c.phone) d.telephone = c.phone;
      const m = /^(\d{5})\s+(.+)$/.exec(config.legal.city || '');
      if (config.legal.street && m) d.address = { '@type': 'PostalAddress', streetAddress: config.legal.street, postalCode: m[1], addressLocality: m[2], addressCountry: 'DE' };
      ld.textContent = JSON.stringify(d);
    } catch (err) { /* unverändert lassen */ }
  }

}

// ---------- Reveal: ein Standard für alle Sektionen ----------
function initReveal() {
  const groups = $$('[data-reveal]');
  groups.forEach((g) => $$('[data-reveal-item]', g).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 6))));
  if (reduced || !('IntersectionObserver' in window)) { groups.forEach((g) => g.classList.add('is-revealed')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add('is-revealed');
      io.unobserve(en.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  groups.forEach((g) => io.observe(g));
}

// ---------- Sichtbarkeit je Sektion melden ----------
function initSectionTracking() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { track('section-view', { section: en.target.dataset.section }); io.unobserve(en.target); }
  }, { threshold: 0.3 });
  $$('[data-section]').forEach((s) => io.observe(s));
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track('click', { id: el.dataset.track });
  });
}

// ---------- Navigation: Farbe folgt der Sektion, Scrollspy, Menü ----------
function initNav() {
  const nav = $('[data-nav]');
  if (!nav) return;
  const themed = $$('main [data-theme], footer[data-theme]').filter((el) => el.matches('section, footer'));
  const links = $$('[data-scrollspy] a');
  const targets = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  let ticking = false;
  const update = () => {
    ticking = false;
    const probe = nav.offsetHeight / 2;
    let theme = 'dark';
    for (const s of themed) { const r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { theme = s.dataset.theme; break; } }
    if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
    const line = window.innerHeight * 0.4;
    let current = null;
    for (const t of targets) { const r = t.getBoundingClientRect(); if (r.top <= line && r.bottom > line) current = t; }
    links.forEach((a) => {
      const on = current && a.getAttribute('href') === `#${current.id}`;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  const menu = $('[data-menu]');
  const openBtn = $('[data-menu-open]');
  if (menu && openBtn && menu.showModal) {
    openBtn.addEventListener('click', () => menu.showModal());
    $('[data-menu-close]', menu).addEventListener('click', () => menu.close());
    $$('a', menu).forEach((a) => a.addEventListener('click', () => menu.close()));
  }
}

// ---------- Modals (natives dialog: Fokusfalle, Esc, Rückfokus) ----------
function initModals() {
  $$('[data-modal-open]').forEach((btn) => {
    const dlg = document.getElementById(btn.dataset.modalOpen);
    if (!dlg || !dlg.showModal) return;
    btn.addEventListener('click', () => { dlg.showModal(); track('modal-open', { id: dlg.id }); });
  });
  $$('dialog.modal').forEach((dlg) => {
    $$('[data-modal-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  });
}

// ---------- Scroll-Galerien: Pfeile für die Maus, Tastatur über die Liste ----------
function initGalleries() {
  $$('[data-gallery]').forEach((wrap) => {
    const list = $('.gallery', wrap);
    const prev = $('[data-gallery-prev]', wrap), next = $('[data-gallery-next]', wrap);
    if (!list || !prev || !next) return;
    const stepSize = () => { const first = list.firstElementChild; return first ? first.getBoundingClientRect().width + 20 : 300; };
    const sync = () => {
      prev.disabled = list.scrollLeft < 8;
      next.disabled = list.scrollLeft > list.scrollWidth - list.clientWidth - 8;
    };
    const go = (dir) => { list.scrollBy({ left: dir * stepSize(), behavior: reduced ? 'auto' : 'smooth' }); track('gallery', { dir }); };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    list.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  });
}

// ---------- Scroll-Szene: Text und Raster folgen dem Fortschritt ----------
function initScene() {
  const scene = $('[data-scene]');
  if (!scene) return;
  const beats = $$('[data-beat]', scene);
  const tablist = $('[data-scene-tabs]', scene);
  const tabs = tablist ? $$('.scene__tab', tablist) : [];
  const stage = $('[data-stage]', scene);
  const anchors = [0.12, 0.48, 0.94];
  if (tablist) {
    tablist.setAttribute('role', 'tablist');
    tabs.forEach((t) => t.setAttribute('role', 'tab'));
    beats.forEach((b, i) => { b.setAttribute('role', 'tabpanel'); if (tabs[i]) b.setAttribute('aria-labelledby', tabs[i].id); });
  }
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let activeIndex = -1, grid = -1, ticking = false;
  const progress = () => { const r = scene.getBoundingClientRect(); return clamp(-r.top / Math.max(r.height - window.innerHeight, 1), 0, 1); };
  const update = () => {
    ticking = false;
    const p = progress();
    const index = p < 0.31 ? 0 : p < 0.65 ? 1 : 2;
    if (index !== activeIndex) {
      activeIndex = index;
      beats.forEach((b, i) => b.classList.toggle('is-active', i === index));
      tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === index)); t.tabIndex = i === index ? 0 : -1; });
      track('scene-beat', { index });
    }
    const g = reduced ? (index === 1 ? 1 : 0) : Math.round((smooth(0.24, 0.32, p) - smooth(0.34, 0.46, p)) * 100) / 100;
    if (g !== grid && stage) { grid = g; stage.style.setProperty('--grid', g); }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
  const goTo = (i) => {
    const top = scene.getBoundingClientRect().top + window.scrollY;
    const total = scene.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + anchors[i] * total, behavior: reduced ? 'auto' : 'smooth' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => goTo(i));
    t.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const n = clamp(i + dir, 0, tabs.length - 1);
      tabs[n].focus({ preventScroll: true });
      goTo(n);
    });
  });
}

// ---------- Start ----------
applyRequires();
fillConfig();
initReveal();
initNav();
initModals();
initGalleries();
initScene();
initSectionTracking();

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
idle(() => {
  if ($('.lg')) import('./liquid-glass.js').then((m) => m.initLiquidGlass()).catch((err) => console.error('[Websign Glas]', err));
  if ($('[data-glass-hero]')) import('./glass-reveal.js').then((m) => m.initGlassReveal(track)).catch((err) => console.error('[Websign Glas-Logo]', err));
  if ($('[data-stage]')) import('./scene.js').then((m) => m.initScenes()).catch((err) => { document.documentElement.classList.add('no-webgl'); console.error('[Websign 3D]', err); });
  if ($('[data-folders]')) import('./glass-folder.js').then((m) => m.initFolders(config, track)).catch((err) => console.error('[Websign Projekte]', err));
  if ($('[data-config-form]')) import('./configurator.js').then((m) => m.initConfigurator(config, track)).catch((err) => console.error('[Websign Konfigurator]', err));
  if ($('[data-kf], [data-kf-preset]')) import('./motion.js').then((m) => m.initMotion()).catch((err) => console.error('[Websign Motion]', err));
  if ($('[data-count-to]')) import('./count.js').then((m) => m.initCount()).catch((err) => console.error('[Websign Zähler]', err));
  if ($('video[data-video]')) import('./media.js').then((m) => m.initMedia()).catch((err) => console.error('[Websign Video]', err));
});
