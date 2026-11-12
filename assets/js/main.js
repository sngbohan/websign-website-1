// Websign · Seitenlogik: Platzhalter, Reveal, Navigation, Modals, Galerien, Szenen-Text.
// 3D und Konfigurator werden nachgeladen, damit der erste Aufbau schlank bleibt.
import { config } from './config.js';

window.__wsReady = true;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), config);

// Messpunkt für spätere, einwilligungsbasierte Analyse: Es wird nichts gesendet, nur ein Ereignis ausgelöst.
export function track(name, detail = {}) {
  document.dispatchEvent(new CustomEvent('ws:track', { detail: { name, ...detail } }));
}

// ---------- Platzhalter aus config.js füllen ----------
function fillConfig() {
  $$('[data-config]').forEach((el) => {
    const v = get(el.dataset.config);
    if (v != null && v !== '') el.textContent = v;
  });
  $$('[data-text]').forEach((el) => {
    const v = get(el.dataset.text);
    if (v != null && v !== '') el.textContent = v;
  });
  $$('[data-email-link]').forEach((a) => {
    if (config.contact.email) a.href = `mailto:${config.contact.email}`;
    else a.removeAttribute('href');
  });
  const list = $('[data-projects]');
  if (list && config.projects.length) {
    list.textContent = '';
    for (const p of config.projects) {
      const li = document.createElement('li');
      li.className = 'project';
      const media = document.createElement(p.url ? 'a' : 'div');
      media.className = 'project__media';
      if (p.url) { media.href = p.url; media.rel = 'noopener'; }
      const img = document.createElement('img');
      img.src = p.image; img.alt = p.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
      media.append(img);
      const h = document.createElement('h3'); h.className = 't-card'; h.textContent = p.name;
      const m = document.createElement('p'); m.textContent = p.meta || '';
      li.append(media, h, m);
      list.append(li);
    }
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
  if ($('[data-stage]')) import('./scene.js').then((m) => m.initScenes()).catch((err) => { document.documentElement.classList.add('no-webgl'); console.error('[Websign 3D]', err); });
  if ($('[data-config-form]')) import('./configurator.js').then((m) => m.initConfigurator(config, track)).catch((err) => console.error('[Websign Konfigurator]', err));
});
