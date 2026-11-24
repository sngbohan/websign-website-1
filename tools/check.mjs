#!/usr/bin/env node
// Websign · Prüfskript ohne Abhängigkeiten.   node tools/check.mjs
// Prüft alle HTML-Seiten und Assets gegen die festen Regeln des Projekts und endet mit Exit-Code 1 bei Fehlern.
//   1 Pflichtangaben in assets/js/config.js (Impressum)
//   2 Platzhalter: class="ph" nur innerhalb von data-requires-Blöcken, kein [PLATZHALTER]-Text
//   3 Bilder: alt, width und height an jedem <img>
//   4 Keine externen Adressen in src/href/CSS/JS (außer mailto:, tel:, eigener Adresse und Formular-Endpunkt)
//   5 Kein Browser-Speicher, keine Apple-Schriften, keine Reste der alten Typo-Skala
//   6 Adressen in canonical, og:*, JSON-LD, sitemap.xml und robots.txt passen zu config.site.url
//   7 Budgets (Briefing A6) und die Zahlen im Beweis-Block samt Fußnoten

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p).replaceAll('\\', '/');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const gz = (p) => gzipSync(readFileSync(join(ROOT, p)), { level: 9 }).length;
const raw = (p) => statSync(join(ROOT, p)).size;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// jsGzip: 60 → 75 KB am 21.11.2026 für Live-Bauplan und Bon, → 150 KB am selben Tag für die React-Insel (GlowCard, ~70 KB gzip).
// Bewusste Entscheidung, kein Freibrief:
// Konfigurator und Bauplan laden erst, wenn der Abschnitt näher kommt (main.js, near), und jede Datei bleibt so knapp wie möglich.
const BUDGET = { jsGzip: 150 * 1024, firstView: 350 * 1024, site: 6 * 1024 * 1024, og: 300 * 1024 };
const SKIP_DIRS = new Set(['.git', 'node_modules', '.claude']);
const NOT_DEPLOYED = /^(tools|docs|src|components|lib)\/|\.md$|^tokens\.json$|^\.git|^(package(-lock)?|tsconfig|components)\.json$|^tailwind\.config\.js$/;      // zählt nicht zum Seitengewicht
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'path', 'use', 'rect', 'circle']);
const URL_ATTRS = ['src', 'href', 'srcset', 'poster', 'action', 'data-src', 'data-src-s', 'data-src-l'];

const errors = [], notes = [], passed = [];
const fail = (msg) => errors.push(msg);
const ok = (msg) => passed.push(msg);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name === '.DS_Store') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(rel(p));
  }
  return out;
}
const files = walk(ROOT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// ---------- config.js laden (als Daten-URL, damit Node kein package.json braucht) ----------
const { config, REQUIRED_LEGAL } = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(read('assets/js/config.js'))}`);
const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), config);
const present = (v) => v != null && v !== '' && v !== false && (Array.isArray(v) ? v.length > 0 : typeof v === 'object' ? Object.values(v).some(present) : true);
const siteUrl = config.site.url;

// ---------- 1 · Pflichtangaben ----------
const missingLegal = REQUIRED_LEGAL.filter((p) => !present(get(p)));
if (missingLegal.length) fail(`Pflichtangaben fehlen in assets/js/config.js: ${missingLegal.join(', ')}. Impressum und Datenschutz zeigen bis dahin „Diese Angaben werden gerade ergänzt“.`);
else ok('Pflichtangaben fürs Impressum stehen in config.js');
if (!/^https:\/\/.+\/$/.test(siteUrl || '')) fail('config.site.url muss mit https:// beginnen und mit / enden.');
const optional = {
  'contact.phone': 'zweiter Kontaktweg im Impressum empfohlen; Telefon bleibt ausgeblendet',
  'contact.responseTime': 'Antwortzeit wird nicht genannt, im Konfigurator steht „schnell“',
  'contact.bookingUrl': 'Termin-Link bleibt ausgeblendet',
  'contact.city': 'Ort des Studios wird nicht genannt',
  'legal.owner': 'Copyright-Zeile ohne Inhaber-Zusatz',
  'legal.vatId': 'Abschnitt Umsatzsteuer-ID bleibt ausgeblendet',
  'legal.responsible': 'Abschnitt „Inhaltlich verantwortlich“ bleibt ausgeblendet',
  'legal.authority': 'zuständige Aufsichtsbehörde wird nicht genannt',
  'form.endpoint': 'Anfragen öffnen das E-Mail-Programm (mailto)',
  'pricing.types': 'keine Preise: Preisschilder aus, Richtpreis „per E-Mail“',
  'pricing.vatNote': 'kein Hinweis netto/brutto',
  projects: 'Sektion „Projekte“ zeigt drei Beispiel-Ordner „Projekt 1–3“',
};
for (const [path, effect] of Object.entries(optional)) if (!present(get(path))) notes.push(`${path} ist leer → ${effect}`);
if (present(get('pricing.types'))) {
  const open = [];
  for (const group of ['types', 'base', 'scope', 'extras']) for (const [k, v] of Object.entries(config.pricing[group])) if (v == null) open.push(`pricing.${group}.${k}`);
  if (open.length) notes.push(`Preise ohne Wert zeigen „auf Anfrage“: ${open.join(', ')}`);
}

// ---------- HTML zerlegen ----------
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*(\/?)>/g;
function attrs(str) {
  const out = {};
  for (const m of str.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
const isExternal = (v) => /^(https?:)?\/\//i.test(v.trim());
const allowedUrl = (v) => v.startsWith(siteUrl) || (config.form.endpoint && v === config.form.endpoint);

function checkHtml(file) {
  const src = read(file);
  const line = (i) => src.slice(0, i).split('\n').length;
  const where = (i) => `${file}:${line(i)}`;
  const stack = [];                                   // { tag, requires, ph }
  const inRequires = () => stack.some((s) => s.requires);
  const inPh = () => stack.some((s) => s.ph);
  let last = 0, rawUntil = null, m;
  const text = (to) => {
    const t = src.slice(last, to);
    if (rawUntil || inPh()) return;
    const hit = /\[[A-ZÄÖÜ][^\]\n<]{2,60}\]/.exec(t);
    if (hit) fail(`${where(last + hit.index)} sichtbarer Platzhaltertext ${hit[0]} außerhalb von <mark class="ph">`);
  };
  while ((m = TAG.exec(src))) {
    if (rawUntil) {                                   // Inhalt von <script>/<style> überspringen
      if (m[1] && m[2].toLowerCase() === rawUntil) { rawUntil = null; stack.pop(); last = TAG.lastIndex; }
      continue;
    }
    text(m.index);
    last = TAG.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
    const a = attrs(m[3]);
    const cls = (a.class || '').split(/\s+/);
    if (cls.includes('ph') && !inRequires() && !('data-requires' in a)) fail(`${where(m.index)} class="ph" außerhalb eines data-requires-Blocks`);
    if (tag === 'img') {
      if (!('alt' in a)) fail(`${where(m.index)} <img> ohne alt`);
      if (!a.width || !a.height) fail(`${where(m.index)} <img> ohne width/height`);
    }
    for (const name of URL_ATTRS) {
      if (!(name in a)) continue;
      for (const part of name === 'srcset' ? a[name].split(',').map((s) => s.trim().split(/\s+/)[0]) : [a[name]]) {
        if (isExternal(part) && !allowedUrl(part)) fail(`${where(m.index)} externe Adresse in ${name}: ${part}`);
      }
    }
    if (tag === 'link' && a.rel === 'canonical' && !a.href.startsWith(siteUrl)) fail(`${where(m.index)} canonical passt nicht zu config.site.url (${siteUrl})`);
    if (tag === 'meta' && /^(og:url|og:image|twitter:image)$/.test(a.property || a.name || '') && !(a.content || '').startsWith(siteUrl)) fail(`${where(m.index)} ${a.property || a.name} passt nicht zu config.site.url (${siteUrl})`);
    if (tag === 'meta' && /^(og:image|twitter:image)$/.test(a.property || a.name || '')) {
      const local = (a.content || '').slice(siteUrl.length);
      if (!existsSync(join(ROOT, local))) fail(`${where(m.index)} ${a.property || a.name}: Datei ${local} fehlt`);
      else if (!/\.(jpe?g|png)$/i.test(local)) fail(`${where(m.index)} ${a.property || a.name} muss JPG oder PNG sein`);
    }
    if ((tag === 'link' || tag === 'script' || tag === 'img' || tag === 'source') && (a.href || a.src)) {
      const ref = (a.href || a.src || '').split(/[?#]/)[0];
      if (ref && !isExternal(ref) && !/^(mailto:|tel:|data:|#)/.test(ref) && a.rel !== 'canonical' && !existsSync(join(ROOT, dirname(file), ref))) fail(`${where(m.index)} verweist auf fehlende Datei: ${ref}`);
    }
    if (tag === 'script' || tag === 'style') {
      if (tag === 'script' && a.type === 'application/ld+json') {
        const end = src.indexOf('</script>', TAG.lastIndex);
        try {
          const data = JSON.parse(src.slice(TAG.lastIndex, end));
          for (const key of ['url', 'logo', 'image']) if (data[key] && !String(data[key]).startsWith(siteUrl)) fail(`${where(m.index)} JSON-LD ${key} passt nicht zu config.site.url`);
        } catch (err) { fail(`${where(m.index)} JSON-LD ist kein gültiges JSON`); }
      }
      rawUntil = tag;
    }
    if (!VOID.has(tag) && !m[4]) stack.push({ tag, requires: 'data-requires' in a, ph: cls.includes('ph') });
  }
  text(src.length);
  if (/SF Pro|-apple-system|BlinkMacSystemFont/.test(src)) fail(`${file} nennt eine Apple-Systemschrift`);
}
const before = errors.length;
htmlFiles.forEach(checkHtml);
if (errors.length === before) ok(`${htmlFiles.length} HTML-Seiten: Platzhalter, Bilder, Adressen und Verweise in Ordnung (${htmlFiles.join(', ')})`);

// ---------- 4 + 5 · CSS und JS ----------
const css = files.filter((f) => f.startsWith('assets/') && f.endsWith('.css'));
const js = files.filter((f) => f.startsWith('assets/js/') && f.endsWith('.js'));
const b2 = errors.length;
for (const f of css) {
  const s = read(f);
  for (const m of s.matchAll(/url\(\s*["']?([^"')]+)/g)) if (isExternal(m[1])) fail(`${f} lädt extern: ${m[1]}`);
  if (/@import/.test(s)) fail(`${f} nutzt @import`);
  if (/SF Pro|-apple-system|BlinkMacSystemFont/.test(s)) fail(`${f} nennt eine Apple-Systemschrift`);
}
// react.dev/errors: nur Text in Reacts Fehlermeldungen (gebündelt in glow-cards.js), es wird nichts abgerufen
const allowedLiteral = (u) => u.startsWith('http://www.w3.org/') || u.startsWith('https://react.dev/errors/') || u === siteUrl || u === config.form.endpoint || u === config.contact.bookingUrl;
for (const f of js) {
  const s = read(f);
  const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');    // ohne Kommentare
  for (const m of code.matchAll(/["'`](https?:\/\/[^"'`\s]+)/g)) if (!allowedLiteral(m[1])) fail(`${f} enthält eine externe Adresse: ${m[1]}`);
  if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(code) || /document\.cookie\s*=[^=]/.test(code)) fail(`${f} schreibt in den Browser-Speicher (Cookies, localStorage, sessionStorage oder IndexedDB)`);
}
if (errors.length === b2) ok(`${css.length} CSS- und ${js.length} JS-Dateien: keine externen Adressen, kein Browser-Speicher, keine Apple-Schriften`);

// Alte Typo-Skala: 80/64/48/28/21 dürfen nicht mehr als L-Wert (Obergrenze) einer Rolle vorkommen
const tokens = read('assets/css/tokens.css');
const oldSizes = [];
for (const m of tokens.matchAll(/--([\w-]+)-size:\s*(?:clamp\([^;]*,\s*(\d+(?:\.\d+)?)px\s*\)|(\d+(?:\.\d+)?)px)\s*;/g)) {
  const L = Number(m[2] ?? m[3]);
  if ([80, 64, 48, 28, 21].includes(L)) oldSizes.push(`--${m[1]}-size ${L}px`);
}
if (oldSizes.length) fail(`tokens.css enthält L-Werte der alten Skala: ${oldSizes.join(', ')}`); else ok('tokens.css: keine L-Werte der alten Skala (80/64/48/28/21)');

// ---------- 6 · sitemap.xml und robots.txt ----------
if (!existsSync(join(ROOT, 'sitemap.xml'))) fail('sitemap.xml fehlt');
else {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const bad = locs.filter((u) => !u.startsWith(siteUrl));
  const gone = locs.filter((u) => u.startsWith(siteUrl)).map((u) => u.slice(siteUrl.length) || 'index.html').filter((p) => !existsSync(join(ROOT, p.endsWith('/') ? `${p}index.html` : p)));
  if (!locs.length || bad.length) fail(`sitemap.xml passt nicht zu config.site.url: ${bad.join(', ') || 'keine Einträge'}`);
  else if (gone.length) fail(`sitemap.xml nennt Seiten, die es nicht gibt: ${gone.join(', ')}`);
  else ok(`sitemap.xml: ${locs.length} Adresse(n) unter ${siteUrl}`);
}
if (!existsSync(join(ROOT, 'robots.txt'))) fail('robots.txt fehlt');
else {
  const r = read('robots.txt');
  if (!r.includes(`Sitemap: ${siteUrl}sitemap.xml`)) fail('robots.txt: Sitemap-Zeile passt nicht zu config.site.url');
  else if (!/Disallow:\s*\S*\/tools\//.test(r)) fail('robots.txt schließt tools/ nicht aus');
  else ok('robots.txt: Sitemap stimmt, tools/ ist ausgeschlossen');
}
if (existsSync(join(ROOT, 'site.webmanifest'))) {
  try {
    const mf = JSON.parse(read('site.webmanifest'));
    const lost = (mf.icons || []).map((i) => i.src).filter((s) => !existsSync(join(ROOT, s)));
    if (lost.length) fail(`site.webmanifest nennt fehlende Icons: ${lost.join(', ')}`); else ok('site.webmanifest: gültig, alle Icons vorhanden');
  } catch (err) { fail('site.webmanifest ist kein gültiges JSON'); }
} else fail('site.webmanifest fehlt');

// ---------- 7 · Budgets und Messwerte ----------
// Welche Module lädt die Startseite? Statische Importe von main.js plus die dynamischen, deren Auslöser im HTML vorkommt.
const index = read('index.html');
const main = read('assets/js/main.js');
const pageJs = new Set(['assets/js/main.js']);
const lazyJs = new Set();   // lädt erst bei Annäherung (near): zählt zur Seite, nicht zum Erstaufruf
for (const m of main.matchAll(/^import .* from '\.\/([\w-]+\.js)'/gm)) pageJs.add(`assets/js/${m[1]}`);
// auch verzögert geladene: if ($('…')) near('…', () => import('./x.js'))
for (const m of main.matchAll(/if \(\$\('([^']+)'\)\) (?:near\('[^']+', \(\) => )?import\('\.\/([\w-]+\.js)'\)/g)) {
  const keys = [...m[1].matchAll(/\[([\w-]+)\]|\.([\w-]+)/g)].map((k) => k[1] || k[2]);
  const used = keys.some((k) => (k.startsWith('data-') ? index.includes(`${k}`) : new RegExp(`class="[^"]*\\b${k}\\b`).test(index)));
  if (used) pageJs.add(`assets/js/${m[2]}`);
  if (used && m[0].includes('near(')) lazyJs.add(`assets/js/${m[2]}`);
}
// Statische Importe der geladenen Module zählen mit (z. B. configurator.js → bauplan.js); Importe verzögerter Module sind selbst verzögert
for (const f of pageJs) for (const m of read(f).matchAll(/^import .* from '\.\/([\w-]+\.js)'/gm)) { pageJs.add(`assets/js/${m[1]}`); if (lazyJs.has(f)) lazyJs.add(`assets/js/${m[1]}`); }
// Dynamische Importe aus geladenen Modulen (z. B. configurator.js → glow-cards.js) laden später: Seite ja, Erstaufruf nein
for (const f of pageJs) for (const m of read(f).matchAll(/import\('\.\/([\w-]+\.js)'\)/g)) { const d = `assets/js/${m[1]}`; if (f !== 'assets/js/main.js') { pageJs.add(d); lazyJs.add(d); } }
// Gemeinsame Chunks der React-Inseln (esbuild --splitting, minifiziert: import{…}from"./chunks/x.js"): laden mit ihrem Modul
for (const f of pageJs) for (const m of read(f).matchAll(/from\s*["']\.\/(chunks\/[\w-]+\.js)["']/g)) { const c = `assets/js/${m[1]}`; pageJs.add(c); if (lazyJs.has(f)) lazyJs.add(c); }
const pageJsGzip = [...pageJs].reduce((n, f) => n + gz(f), 0);
const pageJsRaw = [...pageJs].reduce((n, f) => n + raw(f), 0);
const allJsGzip = js.reduce((n, f) => n + gz(f), 0);
const model = 'assets/3d/ws-field.bin';
const firstView = gz('index.html') + css.filter((f) => index.includes(f)).reduce((n, f) => n + gz(f), 0) + pageJsGzip - [...lazyJs].reduce((n, f) => n + gz(f), 0) + gz(model)
  + raw('assets/fonts/geist-latin.woff2') + gz('assets/img/favicon.svg');
const siteBytes = files.filter((f) => !NOT_DEPLOYED.test(f)).reduce((n, f) => n + raw(f), 0);
const budget = (label, value, max) => (value > max ? fail(`Budget überschritten · ${label}: ${kb(value)} (Grenze ${kb(max)})`) : ok(`Budget · ${label}: ${kb(value)} von ${kb(max)}`));
budget('JS gesamt, gzip (alle Module)', allJsGzip, BUDGET.jsGzip);
budget('Erstaufruf der Startseite (HTML, CSS, JS, 3D-Modell gzip; Schrift)', firstView, BUDGET.firstView);
budget('gesamte Website', siteBytes, BUDGET.site);
const ogFile = 'assets/media/og/websign-og.jpg';
if (existsSync(join(ROOT, ogFile))) budget('OG-Bild', raw(ogFile), BUDGET.og); else fail(`${ogFile} fehlt`);

// Die Zahlen im Beweis-Block und in den Fußnoten 3 und 4 müssen zu den Dateien passen
const stat = (label) => { const m = new RegExp(`${label}</dt>\\s*<dd class="stat__value">(\\d+)(?:&nbsp;| )KB`).exec(index); return m ? Number(m[1]) : null; };
const footRaw = (id) => { const m = new RegExp(`id="${id}"[\\s\\S]*?Unkomprimiert (\\d+)(?:&nbsp;| )KB`).exec(index); return m ? Number(m[1]) : null; };
const claims = [
  ['JavaScript gesamt (gzip)', stat('JavaScript gesamt'), Math.round(pageJsGzip / 1024)],
  ['JavaScript unkomprimiert (Fußnote 3)', footRaw('fn-3'), Math.round(pageJsRaw / 1024)],
  ['3D-Modell (gzip)', stat('3D-Modell'), Math.round(gz(model) / 1024)],
  ['3D-Modell unkomprimiert (Fußnote 4)', footRaw('fn-4'), Math.round(raw(model) / 1024)],
];
for (const [label, shown, real] of claims) {
  if (shown == null) notes.push(`Messwert „${label}“ steht nicht (mehr) in index.html und wird nicht geprüft`);
  else if (shown !== real) fail(`Messwert veraltet · ${label}: Seite nennt ${shown} KB, gemessen ${real} KB. Zahl und Datum der Fußnote aktualisieren.`);
  else ok(`Messwert stimmt · ${label}: ${real} KB (${[...pageJs].length} Module auf der Startseite)`.replace(/ \(\d+ Module auf der Startseite\)$/, label.startsWith('JavaScript gesamt') ? ` (${[...pageJs].map((f) => f.split('/').pop()).join(', ')})` : ''));
}

// ---------- Ausgabe ----------
console.log('Websign · Prüfung\n');
for (const p of passed) console.log(`  ✔ ${p}`);
if (notes.length) { console.log('\nHinweise (kein Fehler):'); for (const n of notes) console.log(`  · ${n}`); }
if (errors.length) {
  console.log(`\nFehler (${errors.length}):`);
  for (const e of errors) console.log(`  ✘ ${e}`);
  console.log('\nNicht bestanden.');
  process.exit(1);
}
console.log('\nAlles grün.');
