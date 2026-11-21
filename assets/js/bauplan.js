// Websign · Live-Bauplan, Mini-Bauplan (mobil) und Bauplan-Bon zum Konfigurator.
// Bühne und Bon sind Illustration (aria-hidden); lesbar bleiben die Zusammenfassung und der Satz in [data-plan-caption].
// Beträge nur aus config.js (über configurator.js), nie geschätzt.

// Bausteine je Projektart: „Spalten von 6:Höhe:Beschriftung:Rolle“, mit „*n“ wiederholt
const LAYOUTS = {
  onepager: '6:10:Navigation:nav|6:50:Hero:hero|6:18:Abschnitt|3:26:Bild:img|3:26:Text|6:18:Abschnitt|6:9:Footer:foot',
  landingpage: '6:10:Logo:nav|6:66:Hero · ein Ziel:hero|2:24:Vorteil*3|6:26:Formular:cta',
  unternehmen: '6:10:Navigation:nav|6:54:Hero:hero|2:32:Leistung*3|4:22:Team:img|2:22:Kontakt:cta',
  shop: '6:10:Navigation · Warenkorb:nav|6:34:Kampagne:hero|2:38:Produkt:img*3|2:18:Produkt:img*3',
  portfolio: '6:10:Navigation:nav|6:30:Intro:hero|3:48:Arbeit:img*2|2:26:Arbeit:img*3',
  blog: '6:10:Navigation:nav|6:52:Titelgeschichte:hero|6:16:Artikel*4',
};
const SHEETS = { kompakt: 2, mittel: 5, gross: 8 };
const KEYS = ['type', 'base', 'scope', 'extras', 'time'];
const SAY = {
  onepager: 'One-Pager: eine Seite, eine Geschichte.',
  landingpage: 'Landingpage: alles läuft auf ein Ziel zu.',
  unternehmen: 'Unternehmenswebsite: Angebot, Team, Kontakt.',
  shop: 'Online-Shop: Kampagne oben, Produkte darunter.',
  portfolio: 'Portfolio: deine Arbeiten im Mittelpunkt.',
  blog: 'Blog & Magazin: Titelgeschichte und Artikel.',
  neu: 'Neue Website: Wir starten auf leerem Papier.',
  relaunch: 'Relaunch: Die bisherige Seite liegt darunter, die neue kommt obendrauf.',
  none: ['Keine Extras: nur die Website, klar und schnell.', 'Extras wieder offen.'],
  motion: ['3D & Motion: Der Hero bekommt Tiefe.', '3D & Motion entfernt.'],
  branding: ['Branding & Logo: Die Marke liegt bei.', 'Branding & Logo entfernt.'],
};

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
// Startet eine CSS-Animation neu
const replay = (n, cls) => { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); };
const hash = (str) => [...str].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

export function initBauplan(root, config) {
  if (!root) return null;
  const q = (s) => $(s, root);
  const stage = q('[data-plan-stage]'), iso = q('[data-plan-iso]'), page = q('[data-plan-page]'), sheets = q('[data-plan-sheets]');
  const caption = q('[data-plan-caption]'), timeTag = q('[data-plan-time]'), counter = q('[data-plan-count]'), viewBtn = q('[data-plan-view]');
  const dock = $('[data-plan-dock]'), dockCaption = $('[data-plan-dock-caption]'), mini = $('[data-plan-mini]'), miniIn = $('[data-plan-mini-in]');
  const rails = document.querySelectorAll('[data-plan-rail] [data-rail]');
  const bon = $('[data-bon]'), summary = bon?.closest('.summary');
  let last = null, bonKey = '', bonText = '', retract = 0;
  root.hidden = false;

  // Mobile Leiste: sichtbar, solange die Formularschritte im Bild sind und die Bühne nicht
  const form = $('[data-config-form]');
  if (dock && form && 'IntersectionObserver' in window) {
    dock.hidden = false;
    const seen = {};
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { seen[e.target === form ? 'form' : 'stage'] = e.isIntersecting; });
      dock.classList.toggle('is-on', !!seen.form && !seen.stage);
    }, { rootMargin: '-20% 0px' });
    io.observe(form); io.observe(stage);
  }
  mini?.addEventListener('click', () => root.scrollIntoView({ behavior: document.documentElement.classList.contains('reduced-motion') ? 'auto' : 'smooth', block: 'center' }));
  viewBtn?.addEventListener('click', () => {
    const flat = viewBtn.getAttribute('aria-pressed') !== 'true';
    viewBtn.setAttribute('aria-pressed', String(flat));
    stage.classList.toggle('is-flat', flat);
  });

  function say(text) {
    if (!text) return;
    caption.textContent = text;
    if (dockCaption) dockCaption.textContent = text;
    replay(caption, 'is-fresh');
  }

  function buildPage(type, motion) {
    page.textContent = '';
    if (!type) { page.append(el('span', 'plan__empty', 'Noch leer')); return; }
    const bar = el('span', 'plan__bar'); bar.append(el('i'), el('i'), el('i'));
    const grid = el('span', 'plan__grid');
    let i = 0;
    for (const spec of LAYOUTS[type].split('|')) {
      const [def, n = 1] = spec.split('*');
      const [cols, h, label, role] = def.split(':');
      for (let k = 0; k < n; k++) {
        const b = el('span', role ? `plan__blk plan__blk--${role}` : 'plan__blk');
        b.style.cssText = `--c:${cols};--h:${h}px;--d:${i++ * 55}ms`;
        b.append(el('em', '', role === 'hero' && motion ? `${label} · 3D` : label));
        if (role === 'hero') { const art = el('span', 'plan__art'); art.innerHTML = '<svg viewBox="0 0 608.5 268.5"><use href="#ws-mark"/></svg><i></i>'; b.append(art); }
        grid.append(b);
      }
    }
    page.append(bar, grid);
  }

  function buildSheets(n) {
    while (sheets.children.length < n) { const s = el('span', 'plan__sheet'); s.style.setProperty('--i', sheets.children.length + 1); sheets.append(s); }
    while (sheets.children.length > n) sheets.lastChild.remove();
    if (counter) counter.textContent = n ? `${n + 1} Ebenen` : '1 Ebene';
  }

  // Mini-Bauplan: verkleinerte Kopie der Bühne
  function mirror(changed) {
    if (!miniIn) return;
    const copy = iso.cloneNode(true);
    copy.querySelectorAll('[data-plan-page], [data-plan-sheets]').forEach((n) => n.removeAttribute(n.hasAttribute('data-plan-page') ? 'data-plan-page' : 'data-plan-sheets'));
    copy.removeAttribute('data-plan-iso');
    miniIn.replaceChildren(copy);
    if (changed) replay(mini, 'is-bump');
  }

  // Bauplan-Bon: druckt, sobald alle Schritte gewählt sind; Änderungen drucken neu, ein fehlender Schritt zieht ihn zurück
  function printBon(s, m) {
    const key = [s.type, s.base, s.scope, ...s.extras, s.time].filter(Boolean).map((i) => `${i.name}=${i.value}`).join('&') + m.total;
    if (key === bonKey) return;
    bonKey = key;
    const amt = (path) => {
      if (!path || !m.prices) return '';
      const v = m.price(path);
      return v == null ? 'auf Anfrage' : v === 0 ? 'inklusive' : `${path.startsWith('types.') ? 'ab' : '+'} ${m.money.format(v)}`;
    };
    const lbl = (i) => i.dataset.label;
    const rows = [
      ['Projektart', lbl(s.type), `types.${s.type.value}`],
      ['Ausgangslage', lbl(s.base), `base.${s.base.value}`],
      ['Umfang', s.single ? 'Eine Seite' : `${lbl(s.scope)} · ${config.scopeLabels[s.scope.value]}`, !s.single && `scope.${s.scope.value}`],
      ...s.extras.map((e, i) => [i ? '' : 'Extras', lbl(e), e.value !== 'none' && `extras.${e.value}`]),
      ['Zeitrahmen', lbl(s.time)],
    ].map(([k, v, path]) => [k, v, amt(path)]);
    $('[data-bon-rows]', bon).replaceChildren(...rows.map(([k, v, a]) => { const r = el('div', 'bon__row'); r.append(el('dt', '', k), el('dd', '', v), el('span', 'bon__amt', a)); return r; }));
    bon.classList.toggle('bon--noprice', !m.prices);
    const total = m.prices ? m.total : 'per E-Mail';
    const no = `WS-${String(hash(key) % 10000).padStart(4, '0')}`;
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    $('[data-bon-total]', bon).textContent = total;
    $('[data-bon-no]', bon).textContent = no;
    $('[data-bon-date]', bon).textContent = date;
    // Strichcode: Dekoration aus der Bon-Nummer
    let h = hash(no + key);
    $('[data-bon-code]', bon).replaceChildren(...Array.from({ length: 46 }, () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const b = el('i'); b.style.width = `${1 + (h >>> 29) % 3}px`; return b; }));
    bonText = [`Websign · Bauplan-Bon ${no} · ${date}`, '', ...rows.map(([k, v, a]) => `${k.padEnd(13)}${v}${a ? ` (${a})` : ''}`), '', `Richtpreis: ${total}`, 'Unverbindlich. Kein Angebot.'].join('\n');
    clearTimeout(retract);
    bon.hidden = false;
    bon.classList.remove('is-out');
    summary?.classList.add('is-printed');
    replay($('[data-bon-paper]', bon), 'is-printing');
  }

  function hideBon() {
    if (!bon || bon.hidden) return;
    bonKey = '';
    bon.classList.add('is-out');
    summary?.classList.remove('is-printed');
    retract = setTimeout(() => { bon.hidden = true; bon.classList.remove('is-out'); }, 360);
  }

  // Kopieren: Zwischenablage, sonst (z. B. in eingebetteten Browsern) über ein verstecktes Textfeld
  $('[data-bon-copy]', bon || document)?.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(bonText); ok = true; } catch {
      const ta = el('textarea');
      ta.value = bonText; ta.readOnly = true; ta.style.cssText = 'position:fixed;top:0;opacity:0';
      document.body.append(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { /* bleibt false */ }
      ta.remove();
    }
    say(ok ? 'Bauplan kopiert. Du kannst ihn überall einfügen.' : 'Kopieren hat nicht geklappt. Die Angaben stehen auch in der Zusammenfassung.');
  });

  function render(s, changed, money = {}) {
    const type = s.type?.value || null;
    const has = (v) => s.extras.some((e) => e.value === v);
    const motion = has('motion');
    if (!last || last.type !== type) buildPage(type, motion);
    else if (last.motion !== motion) {
      const hero = $('.plan__blk--hero', page);
      if (hero) { const em = $('em', hero); em.textContent = em.textContent.replace(/ · 3D$/, '') + (motion ? ' · 3D' : ''); replay(hero, 'is-pulse'); }
    }
    iso.classList.toggle('has-type', !!type);
    iso.classList.toggle('has-motion', motion);
    iso.classList.toggle('has-brand', has('branding'));
    iso.classList.toggle('has-ghost', s.base?.value === 'relaunch');
    buildSheets(type && !s.single && s.scope ? SHEETS[s.scope.value] : 0);
    if (timeTag) { timeTag.hidden = !s.time; if (s.time) $('b', timeTag).textContent = s.time.dataset.label; }

    // Schrittleiste: erledigt, aktuell, übersprungen
    const current = KEYS.find((k) => !s.done[k]);
    rails.forEach((li) => {
      const k = li.dataset.rail;
      li.classList.toggle('is-done', s.done[k]);
      li.classList.toggle('is-now', k === current);
      li.classList.toggle('is-skip', k === 'scope' && s.single);
    });

    // Ein Satz zum letzten Schritt
    const done = !current;
    if (changed === 'undo') say('Rückgängig gemacht.');
    else if (changed) {
      const { name, value, checked, dataset } = changed;
      if (done && name === 'time') say('Fertig geplant. Dein Bauplan-Bon ist gedruckt.');
      else if (name === 'type') say(`${SAY[value]} Das Gerüst steht.`);
      else if (name === 'base') say(SAY[value]);
      else if (name === 'scope') say(`${dataset.label}: ${config.scopeLabels[value]}, als Stapel hinter der Startseite.`);
      else if (name === 'extras') say(SAY[value]?.[checked ? 0 : 1]);
      else if (name === 'time') say(`Zeitrahmen notiert: ${dataset.label}.`);
    }
    last = { type, motion };
    mirror(changed);
    if (bon) { if (done) printBon(s, money); else hideBon(); }
  }

  return { render };
}
