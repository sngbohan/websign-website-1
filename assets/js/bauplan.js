// Websign · Live-Bauplan im Konfigurator
// Jede Auswahl baut sichtbar mit: Die Projektart legt das Gerüst, die Ausgangslage schiebt bei einem Relaunch
// die bisherige Seite darunter, der Umfang stapelt weitere Seiten, Extras verändern Hero und Marke.
// Die Bühne ist reine Illustration (aria-hidden). Für Screenreader zählt die Zusammenfassung daneben;
// die Bildunterschrift sagt jeden Schritt zusätzlich in einem Satz an (aria-live).
// Preise kommen hier nicht vor: Sie stehen ausschließlich in config.js und werden vom Konfigurator gezeigt.

// Bausteine je Projektart: [Spalten von 6, Höhe in px, Beschriftung, Rolle]
const LAYOUTS = {
  onepager: [[6, 10, 'Navigation', 'nav'], [6, 50, 'Hero', 'hero'], [6, 18, 'Abschnitt'], [3, 26, 'Bild', 'img'], [3, 26, 'Text'], [6, 18, 'Abschnitt'], [6, 9, 'Footer', 'foot']],
  landingpage: [[6, 10, 'Logo', 'nav'], [6, 66, 'Hero · ein Ziel', 'hero'], [2, 24, 'Vorteil'], [2, 24, 'Vorteil'], [2, 24, 'Vorteil'], [6, 26, 'Formular', 'cta']],
  unternehmen: [[6, 10, 'Navigation', 'nav'], [6, 54, 'Hero', 'hero'], [2, 32, 'Leistung'], [2, 32, 'Leistung'], [2, 32, 'Leistung'], [4, 22, 'Team', 'img'], [2, 22, 'Kontakt', 'cta']],
  shop: [[6, 10, 'Navigation · Warenkorb', 'nav'], [6, 34, 'Kampagne', 'hero'], [2, 38, 'Produkt', 'img'], [2, 38, 'Produkt', 'img'], [2, 38, 'Produkt', 'img'], [2, 18, 'Produkt', 'img'], [2, 18, 'Produkt', 'img'], [2, 18, 'Produkt', 'img']],
  portfolio: [[6, 10, 'Navigation', 'nav'], [6, 30, 'Intro', 'hero'], [3, 48, 'Arbeit', 'img'], [3, 48, 'Arbeit', 'img'], [2, 26, 'Arbeit', 'img'], [2, 26, 'Arbeit', 'img'], [2, 26, 'Arbeit', 'img']],
  blog: [[6, 10, 'Navigation', 'nav'], [6, 52, 'Titelgeschichte', 'hero'], [6, 16, 'Artikel'], [6, 16, 'Artikel'], [6, 16, 'Artikel'], [6, 16, 'Artikel']],
};
const SHEETS = { kompakt: 2, mittel: 5, gross: 8 };
const SAY = {
  type: {
    onepager: 'One-Pager: eine Seite, eine Geschichte. Das Gerüst steht.',
    landingpage: 'Landingpage: alles läuft auf ein Ziel zu. Das Gerüst steht.',
    unternehmen: 'Unternehmenswebsite: Angebot, Team, Kontakt. Das Gerüst steht.',
    shop: 'Online-Shop: Kampagne oben, Produkte darunter. Das Gerüst steht.',
    portfolio: 'Portfolio: deine Arbeiten im Mittelpunkt. Das Gerüst steht.',
    blog: 'Blog & Magazin: Titelgeschichte und Artikel. Das Gerüst steht.',
  },
  base: { neu: 'Neue Website: Wir starten auf leerem Papier.', relaunch: 'Relaunch: Die bisherige Seite liegt darunter, die neue kommt obendrauf.' },
};

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

export function initBauplan(root, config) {
  if (!root) return null;
  const stage = root.querySelector('[data-plan-stage]');
  const iso = root.querySelector('[data-plan-iso]');
  const page = root.querySelector('[data-plan-page]');
  const sheets = root.querySelector('[data-plan-sheets]');
  const caption = root.querySelector('[data-plan-caption]');
  const dockCaption = document.querySelector('[data-plan-dock-caption]');
  const timeTag = root.querySelector('[data-plan-time]');
  const viewBtn = root.querySelector('[data-plan-view]');
  const rails = [...document.querySelectorAll('[data-plan-rail]')];
  const counter = root.querySelector('[data-plan-count]');
  let last = null;

  root.hidden = false;
  // Mobile Leiste: sichtbar, solange die Formularschritte im Bild sind und die Bühne nicht
  const dock = document.querySelector('[data-plan-dock]');
  const form = document.querySelector('[data-config-form]');
  if (dock && form && 'IntersectionObserver' in window) {
    dock.hidden = false;
    const seen = { form: false, stage: false };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { seen[e.target === form ? 'form' : 'stage'] = e.isIntersecting; });
      dock.classList.toggle('is-on', seen.form && !seen.stage);
    }, { rootMargin: '-20% 0px -20% 0px' });
    io.observe(form); io.observe(stage);
  }

  // Mini-Bauplan in der mobilen Leiste: eine verkleinerte Kopie der Bühne; Tippen springt zur großen Bühne
  const mini = document.querySelector('[data-plan-mini]');
  const miniIn = document.querySelector('[data-plan-mini-in]');
  mini?.addEventListener('click', () => {
    const smooth = !document.documentElement.classList.contains('reduced-motion');
    root.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
  });
  function mirror(changed) {
    if (!miniIn) return;
    const copy = iso.cloneNode(true);
    copy.removeAttribute('data-plan-iso');
    copy.querySelectorAll('[data-plan-page], [data-plan-sheets]').forEach((n) => { n.removeAttribute('data-plan-page'); n.removeAttribute('data-plan-sheets'); });
    miniIn.replaceChildren(copy);
    if (changed) { mini.classList.remove('is-bump'); void mini.offsetWidth; mini.classList.add('is-bump'); }
  }

  viewBtn?.addEventListener('click', () => {
    const flat = viewBtn.getAttribute('aria-pressed') !== 'true';
    viewBtn.setAttribute('aria-pressed', String(flat));
    stage.classList.toggle('is-flat', flat);
  });

  function say(text) {
    if (!text) return;
    caption.textContent = text;
    if (dockCaption) dockCaption.textContent = text;
    caption.classList.remove('is-fresh'); void caption.offsetWidth; caption.classList.add('is-fresh');
  }

  function buildPage(type, motion) {
    page.textContent = '';
    page.dataset.type = type || '';
    if (!type) { page.append(el('span', 'plan__empty', 'Noch leer')); return; }
    const bar = el('span', 'plan__bar'); bar.append(el('i'), el('i'), el('i'));
    page.append(bar);
    const grid = el('span', 'plan__grid');
    LAYOUTS[type].forEach(([cols, h, label, role], i) => {
      const b = el('span', `plan__blk${role ? ` plan__blk--${role}` : ''}`);
      b.style.cssText = `--c:${cols};--h:${h}px;--d:${i * 55}ms`;
      b.append(el('em', '', role === 'hero' && motion ? `${label} · 3D` : label));
      if (role === 'hero') b.append(heroArt());
      grid.append(b);
    });
    page.append(grid);
  }

  function heroArt() {
    const art = el('span', 'plan__art');
    art.innerHTML = '<svg viewBox="0 0 608.5 268.5"><use href="#ws-mark"/></svg><i></i>';
    return art;
  }

  function buildSheets(n) {
    const have = sheets.children.length;
    for (let i = have; i < n; i++) { const s = el('span', 'plan__sheet'); s.style.setProperty('--i', i + 1); sheets.append(s); }
    for (let i = have - 1; i >= n; i--) sheets.children[i].remove();
    if (counter) counter.textContent = n ? `${n + 1} Ebenen` : '1 Ebene';
  }

  // ---------- Bauplan-Bon ----------
  // Erscheint, sobald alle fünf Schritte gewählt sind: Er „druckt“ aus dem Schlitz. Ändert sich danach etwas,
  // druckt er neu; fehlt wieder ein Schritt, zieht er sich zurück.
  const bon = document.querySelector('[data-bon]');
  const summary = bon?.closest('.summary');
  const bonRows = bon?.querySelector('[data-bon-rows]');
  const bonPaper = bon?.querySelector('[data-bon-paper]');
  let bonKey = '';
  let bonText = '';
  let retract = 0;
  const hash = (str) => [...str].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

  function printBon(s, money) {
    const key = [s.type, s.base, s.scope, ...s.extras, s.time].filter(Boolean).map((i) => `${i.name}=${i.value}`).join('&') + `|${money.total}`;
    if (key === bonKey) return;
    bonKey = key;
    const p = money.prices ? money.price : () => null;
    const fmt = (v, path) => (v == null ? (money.prices ? 'auf Anfrage' : '✓') : v === 0 ? 'inklusive' : path.startsWith('types.') ? `ab ${money.money.format(v)}` : `+ ${money.money.format(v)}`);
    const rows = [
      ['Projektart', s.type.dataset.label, `types.${s.type.value}`],
      ['Ausgangslage', s.base.dataset.label, `base.${s.base.value}`],
      ['Umfang', s.single ? 'Eine Seite' : `${s.scope.dataset.label} · ${config.scopeLabels[s.scope.value]}`, s.single ? null : `scope.${s.scope.value}`],
      ...s.extras.map((e) => [e === s.extras[0] ? 'Extras' : '', e.dataset.label, e.value === 'none' ? null : `extras.${e.value}`]),
      ['Zeitrahmen', s.time.dataset.label, null],
    ];
    bonRows.textContent = '';
    for (const [k, v, path] of rows) {
      const row = el('div', 'bon__row');
      row.append(el('dt', '', k), el('dd', '', v), el('span', 'bon__amt', path ? fmt(p(path), path) : ''));
      bonRows.append(row);
    }
    bon.classList.toggle('bon--noprice', !money.prices);
    const total = money.prices ? money.total : 'per E-Mail';
    bon.querySelector('[data-bon-total]').textContent = total;
    const no = `WS-${String(hash(key) % 10000).padStart(4, '0')}`;
    const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    bon.querySelector('[data-bon-no]').textContent = no;
    bon.querySelector('[data-bon-date]').textContent = date;
    // Strichcode aus der Bon-Nummer: nur Dekoration
    const code = bon.querySelector('[data-bon-code]');
    code.textContent = '';
    let h = hash(no + key);
    for (let i = 0; i < 46; i++) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const b = el('i'); b.style.width = `${1 + (h >>> 29) % 3}px`; code.append(b); }
    bonText = [`Websign · Bauplan-Bon ${no} · ${date}`, '', ...rows.map(([k, v, path]) => `${(k || '').padEnd(13)}${v}${path && money.prices ? ` (${fmt(p(path), path)})` : ''}`), '', `Richtpreis: ${total}`, 'Unverbindlich. Kein Angebot.'].join('\n');

    clearTimeout(retract);
    bon.hidden = false;
    bon.classList.remove('is-out');
    summary?.classList.add('is-printed');
    bonPaper.classList.remove('is-printing'); void bonPaper.offsetWidth; bonPaper.classList.add('is-printing');
  }

  function hideBon() {
    if (!bon || bon.hidden) return;
    bonKey = '';
    bon.classList.add('is-out');
    summary?.classList.remove('is-printed');
    retract = setTimeout(() => { bon.hidden = true; bon.classList.remove('is-out'); }, 360);
  }

  bon?.querySelector('[data-bon-copy]').addEventListener('click', async () => {
    // Erst die Zwischenablage-Schnittstelle; wo sie gesperrt ist (z. B. eingebettete Browser), ein verstecktes Textfeld
    const fallback = () => {
      const ta = el('textarea');
      ta.value = bonText; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.append(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    };
    let ok = false;
    try { await navigator.clipboard.writeText(bonText); ok = true; } catch { ok = fallback(); }
    say(ok ? 'Bauplan kopiert. Du kannst ihn überall einfügen.' : 'Kopieren hat nicht geklappt. Die Angaben stehen auch in der Zusammenfassung.');
  });

  function render(s, changed, money = {}) {
    const type = s.type?.value || null;
    const motion = s.extras.some((e) => e.value === 'motion');
    const branding = s.extras.some((e) => e.value === 'branding');
    const relaunch = s.base?.value === 'relaunch';

    if (!last || last.type !== type) {
      buildPage(type, motion);
      if (type) { page.classList.remove('is-drop'); void page.offsetWidth; page.classList.add('is-drop'); }
    } else if (last.motion !== motion) {
      const hero = page.querySelector('.plan__blk--hero');
      if (hero) { hero.querySelector('em').textContent = hero.querySelector('em').textContent.replace(/ · 3D$/, '') + (motion ? ' · 3D' : ''); hero.classList.remove('is-pulse'); void hero.offsetWidth; hero.classList.add('is-pulse'); }
    }
    iso.classList.toggle('has-type', !!type);
    iso.classList.toggle('has-motion', motion);
    iso.classList.toggle('has-brand', branding);
    iso.classList.toggle('has-ghost', relaunch);
    buildSheets(type && !s.single && s.scope ? SHEETS[s.scope.value] : 0);
    if (timeTag) { timeTag.hidden = !s.time; if (s.time) timeTag.querySelector('b').textContent = s.time.dataset.label; }

    // Schrittleiste: erledigt, aktuell, offen
    const keys = ['type', 'base', 'scope', 'extras', 'time'];
    const current = keys.find((k) => !s.done[k]);
    rails.forEach((rail) => rail.querySelectorAll('[data-rail]').forEach((li) => {
      const k = li.dataset.rail;
      li.classList.toggle('is-done', s.done[k]);
      li.classList.toggle('is-now', k === current);
      li.classList.toggle('is-skip', k === 'scope' && s.single);
    }));

    // Ein Satz zum letzten Schritt
    if (changed === 'undo') say('Rückgängig gemacht.');
    else if (changed) {
      const t = changed;
      if (t.name === 'type') say(SAY.type[t.value]);
      else if (t.name === 'base') say(SAY.base[t.value]);
      else if (t.name === 'scope') say(`${t.dataset.label}: ${config.scopeLabels[t.value]}, als Stapel hinter der Startseite.`);
      else if (t.name === 'extras') {
        if (t.value === 'none') say(t.checked ? 'Keine Extras: nur die Website, klar und schnell.' : 'Extras wieder offen.');
        else if (t.value === 'motion') say(t.checked ? '3D & Motion: Der Hero bekommt Tiefe.' : '3D & Motion entfernt.');
        else if (t.value === 'branding') say(t.checked ? 'Branding & Logo: Die Marke liegt bei.' : 'Branding & Logo entfernt.');
      } else if (t.name === 'time') say(`Zeitrahmen notiert: ${t.dataset.label}.`);
      if (keys.every((k) => s.done[k]) && t.name === 'time') say('Fertig geplant. Dein Bauplan-Bon ist gedruckt.');
    }
    last = { type, motion };
    mirror(changed);
    if (bon) { if (keys.every((k) => s.done[k])) printBon(s, money); else hideBon(); }
  }

  return { render };
}
