# Fable-Briefing: Websign auf Apple-Niveau

> **So benutzt du dieses Dokument:** Gib Fable zuerst **Teil A** komplett als Kontext (oder das ganze Dokument). Danach jeweils **eine Phase aus Teil B** pro Arbeitsauftrag, nacheinander. Nach jeder Phase prüfst du mit **Teil C** und gibst erst dann die nächste Phase frei. Alles, was **du** liefern musst (Texte, Bilder, Preise, Rechtsdaten), steht in **Teil D**. Ohne diese Inhalte füllt Fable die Lücken mit gekennzeichneten Konzeptstudien, aber niemals mit erfundenen Kunden.

---

# TEIL A · Kontext und feste Regeln (immer mitgeben)

## A1. Wer wir sind und was das Ziel ist

Websign ist ein Studio für Webdesign, Branding und 3D/Motion aus Deutschland. Die Website ist unser **Aushängeschild**: Jeder potenzielle Kunde soll beim Durchscrollen spüren, dass wir auf dem handwerklichen Niveau von apple.com arbeiten, aber mit **eigener Identität**. Die Seite verkauft, indem sie selbst der Beweis ist.

**Referenz für Qualität und Dramaturgie (nicht für Optik):** `https://www.apple.com/macbook-pro/liquid-retina-xdr-display/`
Von Apple übernehmen wir **Prinzipien**: Kino-Hero, Sticky-Local-Nav mit Dauer-CTA, geführte Tour, Personalisierung, farbcodierte Stufen, große Zahlen als Bild, scroll-gekoppelte Szenen, Kaufhilfe-Karussell, Werte-Abschluss und Fußnoten für jede Behauptung.
Wir übernehmen **nicht**: Apples Texte, Bilder, Icons, Farben, Schriftgrößen-Skala, Produktnamen oder Layout 1:1.

## A2. Das bestehende Projekt (Ausgangslage)

Repository: `websign website 1/` (GitHub Pages, statisch, kein Build-Schritt)

```
index.html              Startseite, 11 Sektionen, deutsch, data-theme dark/light je Sektion
impressum.html          unvollständig
datenschutz.html        unvollständig
tokens.json             Design-Tokens (Quelle)
assets/css/tokens.css   CSS-Variablen: Typo-Rollen, Farben, Radien, Bewegung, 3 Breakpoints (L ≥1069, M 735–1068, S ≤734)
assets/css/site.css     Komponenten, nutzt NUR Tokens
assets/css/liquid-glass.css
assets/js/main.js       Reveal, Nav-Theme-Wechsel, Scrollspy, Modals, Galerien, Scroll-Szene, track()
assets/js/config.js     ALLE Inhalte/Preise/Kontakt zentral; null = Platzhalter
assets/js/configurator.js  Projekt-Konfigurator mit Richtpreis
assets/js/scene.js      eigener WebGL2-Renderer, Logo als Distanzfeld (assets/3d/ws-field.bin), ein Canvas wandert zwischen Bühnen (hero, services, viewer)
assets/js/liquid-glass.js  Glas-Button mit SVG-Displacement
```

**Stärken, die erhalten bleiben MÜSSEN:**
- Keine Drittanbieter, keine Cookies, kein localStorage → kein Cookie-Banner.
- Keine Frameworks/Bibliotheken. Vanilla JS als ES-Module, Lazy-Import pro Feature über `requestIdleCallback`.
- Progressive Enhancement: Die Seite ist ohne JS lesbar (`.no-js`) und ohne WebGL nutzbar (`.no-webgl`).
- Barrierefreiheit: native `<dialog>`, Skip-Link, Fokus sichtbar, 44-px-Ziele, `prefers-reduced-motion`/`-contrast`/`-reduced-transparency`, `forced-colors`, `aria-live` für dynamische Werte.
- Ein Reveal-Standard, ein `track()`-Ereignis (sendet nichts).
- Fußnoten mit Datum für jede messbare Behauptung.

## A3. Harte Regeln

1. **Keine erfundenen Kunden, Zitate, Logos oder Zahlen.** Fehlen echte Inhalte, baust du *Konzeptstudien* für fiktive Marken. Jede trägt sichtbar das Label „Konzeptstudie · kein Kundenprojekt“. Kundenstimmen werden nur gerendert, wenn sie in `config.js` stehen.
2. **Kein Platzhalter darf live sichtbar sein.** Jede Komponente, deren Daten in `config.js` `null` sind, wird ausgeblendet (`hidden`) oder zeigt einen sinnvollen Ausweichtext. Das alte System mit orangefarbenen `[PLATZHALTER]` bleibt nur im lokalen Entwicklungsmodus aktiv (`?dev` in der URL).
3. **Keine Apple-Assets, -Texte, -Icons, -Fonts.** Kein „SF Pro“ im Font-Stack. Keine Laptop-Mockups, die wie ein MacBook aussehen. Nutze neutrale, selbst gezeichnete Geräterahmen.
4. **Keine externen Requests.** Schriften, Videos und Bilder liegen im Repo. Formular-Endpoint ist die einzige Ausnahme, und nur wenn in `config.form.endpoint` gesetzt.
5. **Jede Behauptung auf der Seite ist wahr und nachmessbar.** Wenn du Dateigrößen, JS-Menge oder Ladezeiten nennst, miss sie nach deinen Änderungen neu und aktualisiere die Fußnoten mit Datum.
6. **Performance-Budget** (siehe A6) ist verbindlich.
7. **Deutsch, Du-Form, kurze Sätze, kein Marketing-Sprech.** Tonfall wie bestehende Texte („Erst verstehen. Dann verblüffen.“).
8. **Nach jeder Phase:** Die Seite funktioniert vollständig, besteht die Checkliste in Teil C und ist commit-fähig. Keine halbfertigen Zustände.

## A4. Neue visuelle Identität (Phase 1 setzt sie um, alle späteren Phasen nutzen sie)

**Schrift**
- Eine selbst gehostete Variable Font unter OFL-Lizenz, Format `woff2`, mit Subset auf Latin + Latin-Extended. Vorschlag: **Geist** (Display und Text in einem). Alternativen: *Inter* (mit `opsz`) oder *Manrope*.
- `font-display: swap`, `<link rel="preload" as="font" crossorigin>` nur für die eine Hauptdatei.
- Fallback-Stack mit `size-adjust`/`ascent-override`, damit beim Laden nichts springt (CLS ≈ 0).
- Gewichte: 400 (Text), 560 (UI), 680 (Headlines). Keine Synthese.

**Typo-Skala (eigene, nicht Apples)**
Basis 17 px, Verhältnis ≈ 1,25 auf L. Rollen bleiben gleich benannt, damit `site.css` weiter funktioniert:

| Rolle | L | M | S | Zeilenhöhe | Tracking |
|---|---|---|---|---|---|
| `--statement` | 104 | 72 | 44 | 0,98 | -0,035em |
| `--hero` | 88 | 64 | 42 | 1,0 | -0,03em |
| `--headline-xl` | 68 | 52 | 38 | 1,04 | -0,025em |
| `--headline-l` | 54 | 44 | 32 | 1,08 | -0,02em |
| `--section` | 44 | 38 | 30 | 1,1 | -0,015em |
| `--headline-s` | 34 | 30 | 26 | 1,15 | -0,01em |
| `--card` | 26 | 23 | 21 | 1,2 | -0,005em |
| `--intro` | 22 | 20 | 18 | 1,4 | 0 |
| `--body` | 17 | 17 | 16 | 1,55 | 0 |
| `--body-s` | 14 | 14 | 14 | 1,45 | 0,005em |
| `--caption` | 12 | 12 | 12 | 1,35 | 0,01em |
| `--stat` | 72 | 56 | 44 | 1,0 | -0,03em |

Größen mit `clamp()` fließend zwischen den Breakpoints statt harter Sprünge.

**Farben**
- Graustufen leicht ins Blau gezogen, damit sie zur Marke passen und sich von Apples neutralem Grau unterscheiden:
  dunkel `--surface #05070c`, `--surface-alt #0d1119`, `--surface-raised #121826`, `--text-primary #eef2f8`, `--text-secondary #8d97a8`, `--line #253047`;
  hell `--surface #ffffff`, `--surface-alt #f3f5f9`, `--surface-raised #f8f9fc`, `--text-primary #0d1320`, `--text-secondary #5b6578`, `--line #d5dbe6`.
- Markenverlauf `--grad-brand: linear-gradient(100deg, #c6d2e5 0%, #7f9bd0 45%, #4766a0 75%, #284172 100%)`.
- **Ein** Akzent für Energie und Erfolg: `--accent: #7ce0c3` (Mint) mit `--grad-accent: linear-gradient(100deg, #b8f5e2, #5fd0b0)`. Er wird nur für Zahlen/Ergebnisse genutzt (wie Apples Grün für „more hours“).
- Paket-Verläufe (Phase 6): *Essenz* `#c6d2e5→#7f9bd0`, *Studio* `#9fb6ff→#4766a0`, *Signature* `#e2c9ff→#7a5cc7`.
- Alle Text/Hintergrund-Paare WCAG AA (4,5:1, große Schrift 3:1). Verlaufstext nur ab `--headline-s` und mit einfarbigem Fallback (`@supports not (background-clip:text)`). In `forced-colors` wird er zu `CanvasText`.

**Form und Bewegung**
- Radien: Karten 24 px, Kacheln 16 px, Formularfelder 12 px, Pillen voll rund.
- Eigene Easing-Signatur: `--ease-ws: cubic-bezier(.22,.8,.2,1)` (schnell an, weich aus) für Inhalte, `--ease-ws-ui: cubic-bezier(.3,.7,.2,1)` für UI.
- Dauer: micro 140 ms, ui 280 ms, text 560 ms, scene ist an den Scroll gekoppelt.
- Neues Grafikelement der Marke: das **„Tiefenraster“**. Feine Linien (1 px, `--line` mit 40 % Deckkraft), die in Szenen perspektivisch in die Tiefe kippen. Es greift das bestehende `.scene__grid` auf und wird zum wiedererkennbaren Motiv neben dem Logo.

## A5. Neue Seitenstruktur (Zielbild der Startseite)

```
 0  Globale Nav (bestehend, überarbeitet) + Lokale Sticky-Nav „Studio-Leiste“
 1  HERO · Kino-Intro mit Preisanker
 2  STUDIO-TOUR · „Lerne Websign kennen“ (Pillen links, Live-Demos rechts)
 3  WO STEHST DU? · Personalisierung → Bento-Raster
 4  ARBEITEN · Featured Case (Gerät mit scrollender Website) + Branchen-Tabs
 5  LEISTUNGEN-SZENE · 5 Kapitel statt 3, je eigenes Motiv (bestehende Szene erweitert)
 6  BEWEIS · Live gemessene Zahlen, hochzählend, mit Verlauf
 7  3D-VIEWER · „Fass ruhig an“ (bestehend, poliert)
 8  PAKETE · drei farbcodierte Stufen + „Pakete vergleichen“
 9  ABLAUF · Timeline mit Scroll-Fortschritt, Dauer und Ergebnis je Schritt
10  WARUM WEBSIGN · Karten-Karussell mit „+“-Modals
11  STIMMEN · nur wenn echte Daten vorhanden
12  KONFIGURATOR · bestehend, vorausfüllbar, + Termin-Alternative
13  FAQ · erweitert
14  WERTE · Datenschutz · Barrierefreiheit · Nachhaltigkeit
15  INDEX + FOOTER
```

Neue Unterseiten (Phase 8): `arbeiten/<slug>.html` (Case-Study-Vorlage), `studio.html`, `kontakt.html`.

## A6. Budgets und Qualitätsziele

| Messgröße | Ziel |
|---|---|
| Erstaufruf bis „Above the fold“ fertig (ohne Lazy-Medien) | ≤ 350 KB übertragen |
| JS gesamt (gzip) | ≤ 60 KB, jedes Feature als Lazy-Modul |
| Gesamte Seite inkl. aller Lazy-Medien | ≤ 6 MB |
| LCP (Mobil, 4G-Drosselung) | ≤ 2,0 s |
| CLS | ≤ 0,02 |
| INP | ≤ 150 ms |
| Lighthouse Performance / A11y / Best Practices / SEO | jeweils ≥ 98 |
| Bildrate bei Scroll-Szenen auf einem Mittelklasse-Handy | 60 fps, keine Layout-Arbeit im Scroll-Handler (nur `transform`/`opacity`/CSS-Variablen) |
| Barrierefreiheit | WCAG 2.2 AA, alles per Tastatur bedienbar, Screenreader-Reihenfolge = visuelle Reihenfolge |

## A7. Technische Bausteine, die du einmal baust und überall nutzt

1. **`assets/js/motion.js` · Scroll-Keyframe-Engine (≈ 3 KB)**
   - Deklarativ: `data-kf='{"start":"a0t - 100vh","end":"a0b - 50vh","opacity":[0,1],"y":[40,0],"scale":[0.96,1]}'` oder vereinfacht `data-kf-preset="lift"`.
   - Ein einziger `scroll`-Listener (passive) plus `requestAnimationFrame`. Fortschritt 0…1 je Element. Ausgabe nur als CSS-Custom-Properties (`--p`, `--y`, `--o`, `--s`), die CSS in `transform`/`opacity` umsetzt.
   - Elemente werden per `IntersectionObserver` nur aktiv, solange sie nahe am Viewport sind.
   - Bei `prefers-reduced-motion` springt alles auf den Endzustand.
   - Progressive Enhancement: Wo `animation-timeline: view()` unterstützt wird, kann CSS das übernehmen (`@supports`), JS ist der Fallback.
2. **`assets/js/media.js` · Inline-Video-Controller**
   - `<video muted playsinline preload="none" poster="…avif">` mit `<source>` AV1/WebM und H.264/MP4 sowie Varianten je Breakpoint (`data-src-s`, `data-src-l`).
   - Lädt erst bei 1 Viewport Abstand, spielt bei ≥ 50 % Sichtbarkeit, pausiert beim Verlassen, setzt optional zurück (`data-reset-on-exit`).
   - **Sichtbarer Play/Pause-Knopf** an jedem Video, das länger als 5 s läuft (WCAG 2.2.2). Bei reduzierter Bewegung wird nur das Poster gezeigt.
3. **`assets/js/count.js` · Hochzählen**
   - `data-count-to="1.2" data-count-decimals="1" data-count-suffix=" s"`. Zählt einmal beim Einblenden (900 ms, `--ease-ws`), formatiert mit `Intl.NumberFormat('de-DE')`. Screenreader bekommen nur den Endwert (`aria-label`).
4. **Bild-Pipeline (Konvention, kein Build)**
   - Jedes Rasterbild als `<picture>` mit AVIF + WebP + JPG-Fallback, `srcset` 1x/2x, `width`/`height` gesetzt, `loading="lazy"` und `decoding="async"` außer beim LCP-Bild (`fetchpriority="high"`).
   - Ordner: `assets/media/<sektion>/<name>-<breite>.<format>`.
   - Ein Skript `tools/optimize-media.sh` (lokal, nutzt `ffmpeg` und `avifenc`/`cwebp`, falls installiert) erzeugt die Varianten. Es läuft nicht auf dem Server.
5. **`data-requires="config.pfad"`**: Ein Hilfsattribut in `main.js` blendet jedes Element aus, dessen Konfig-Wert fehlt. Damit werden Platzhalter live unmöglich.
6. **`tools/check.mjs`**: Ein Node-Skript ohne Abhängigkeiten. Es prüft alle `.html` auf `class="ph"` außerhalb von `data-requires`-Blöcken, auf fehlende `alt`, fehlende `width/height` an `<img>`, externe URLs in `src/href` (außer `mailto:`/`tel:`/Endpoint) und überschrittene Dateigrößen-Budgets. Es endet mit Exit-Code 1 bei Fehlern.

---

# TEIL B · Phasen (jeweils einzeln an Fable geben)

---

## PHASE 1 · Fundament: Vertrauen, Recht, Identität

**Ziel:** Nichts Unfertiges ist mehr sichtbar, die Seite hat ihre eigene Identität, und die technischen Bausteine aus A7 existieren.

**Aufgaben**
1. **Platzhalter-System umbauen**
   - In `main.js`: `data-requires` implementieren (A7.5). Der Entwicklungsmodus `?dev` zeigt weiterhin die orangefarbenen Platzhalter.
   - Konfigurator: Fehlt ein Preis, wird statt `[PREIS]` „auf Anfrage“ angezeigt. Fehlen *alle* Preise, wird der Richtpreis-Block durch den Satz „Deinen Richtpreis bekommst du innerhalb von [config.contact.responseTime] per E-Mail.“ ersetzt; bei fehlender `responseTime` heißt es „schnell“.
   - Projekt-Galerie: Bei leerer `config.projects` werden die Konzeptstudien aus Phase 4 gezeigt (bis dahin wird die Sektion ausgeblendet).
   - Footer: `[INHABER/RECHTSFORM]` mit `data-requires` versehen.
2. **Recht**
   - `impressum.html` und `datenschutz.html` vollständig aus `config.legal` befüllen (gleiches `data-config`-System). Struktur nach § 5 DDG bzw. DSGVO Art. 13: Anbieter, Anschrift, Kontakt, USt-IdNr. (falls vorhanden), inhaltlich Verantwortlicher (§ 18 Abs. 2 MStV), Hosting (GitHub Pages: Server-Logfiles), Formular-Verarbeitung, Betroffenenrechte, Beschwerderecht, keine Cookies.
   - Solange Pflichtfelder fehlen, erscheint auf diesen Seiten ein deutlicher Hinweis „Diese Angaben werden gerade ergänzt“ und `tools/check.mjs` schlägt fehl. **Rechtstexte schreibst du als Vorlage. Der Hinweis „vor Veröffentlichung rechtlich prüfen lassen“ steht als Kommentar im HTML.**
3. **Identität aus A4 umsetzen**
   - Font einbinden (`assets/fonts/`), `@font-face` mit metrischem Fallback.
   - `tokens.css` und `tokens.json` auf die neue Skala, Farben, Verläufe, Radien und Easing umstellen. Rollen-Namen bleiben, damit `site.css` nicht bricht. Prüfe danach jede Sektion visuell bei 1440, 1024, 768, 390 und 360 px.
   - Utility `.t-grad` (Markenverlauf) und `.t-grad-accent` mit Fallbacks.
   - Das Tiefenraster als wiederverwendbare Komponente `.depth-grid` (CSS, optional mit `--tilt` per JS).
4. **Bausteine A7.1–A7.4 und A7.6 anlegen** (zunächst ungenutzt, aber getestet auf einer versteckten Testseite `tools/playground.html`, die nicht verlinkt und per `robots.txt` ausgeschlossen ist).
5. **Kontakt und Formular**
   - `config.contact` um `phone`, `bookingUrl` (z. B. eigene Kalender-Seite), `responseTime` und `city` erweitern.
   - Formular: Ist `form.endpoint` gesetzt, wird per `fetch` POST JSON gesendet, mit Ladezustand, Erfolg und Fehler (bestehende Klassen). Ohne Endpoint bleibt der `mailto:`-Weg, aber mit sauber formatiertem Text.
6. **Meta und Teilen**
   - `og:image` (1200 × 630, AVIF ist hier nicht erlaubt → PNG/JPG): Logo auf Markenverlauf mit Claim. Erzeuge es als statische Datei, z. B. durch ein Rendering des WebGL-Logos plus Typo, und speichere es als `assets/media/og/websign-og.jpg`.
   - `twitter:card`, `canonical`, JSON-LD `ProfessionalService` (Name, URL, Logo, areaServed DE, Kontakt nur wenn vorhanden), `robots.txt`, `sitemap.xml`, `site.webmanifest`, `apple-touch-icon` (180 px PNG).

**Akzeptanzkriterien**
- `node tools/check.mjs` läuft grün, *sofern* die Pflichtdaten in `config.js` stehen. Fehlen sie, listet das Skript genau diese Felder auf.
- Ohne `?dev` ist auf keiner Seite ein `[…]`-Platzhalter sichtbar.
- Auf Windows (Edge), Android (Chrome) und macOS (Safari) sieht die Typografie identisch aus.
- Kein einziger Token-Wert entspricht mehr Apples Original-Skala (Prüfung: Schriftgrößen 80/64/48/28/21 kommen in `tokens.css` nicht als L-Werte vor).

---

## PHASE 2 · Navigation und Kino-Hero

**Ziel:** Die ersten 2 Sekunden erzählen, wer wir sind, was es kostet und wo es losgeht.

### 2.1 Lokale Sticky-Nav „Studio-Leiste“
- Unter der globalen Nav (oder sie ersetzend, sobald gescrollt wird): links „Websign“ in 21 px/680, Mitte Ankerlinks *Übersicht · Arbeiten · Leistungen · Pakete · Ablauf*, rechts ein kleiner Pillen-Button „Projekt starten“ im Markenblau.
- Erscheint, sobald der Hero zu 70 % verlassen ist (gleitet mit 280 ms herein). Glas-Hintergrund mit Blur (bestehende `--glass`-Variablen). Theme folgt der Sektion (bestehende Logik in `initNav`).
- Mobile (≤ 734 px): Ankerlinks stecken in einem Aufklapper „Übersicht ▾“, der CTA bleibt sichtbar.
- Scrollspy markiert die aktive Sektion mit einer 2 px Unterstreichung, die per `transform` zwischen den Links gleitet.

### 2.2 Hero
**Layout (L):** Vollbild (`100svh`, min. 720 px), Hintergrund `--surface` dunkel. Zentrale Bühne für das 3D-Logo (bestehende `data-stage="hero"`). Unten links der Textblock, unten rechts die Preis-Pille.

- **Intro-Choreografie (nur einmal pro Seitenaufruf, ≤ 2,4 s, überspringbar per Scroll/Taste):**
  1. 0–600 ms: Das Tiefenraster zeichnet sich aus der Mitte nach außen (Linien wachsen per `scaleX`/`scaleY`).
  2. 300–1400 ms: Das 3D-Logo „bläst sich auf“: Der Shader-Uniform `uInflate` läuft von 0 auf 1. Dabei kippt das Logo mit einer Kamerafahrt von leicht unten nach frontal (`pitch` −0,35 → 0,16).
  3. 1100–1800 ms: Ein Lichtstreifen (Softbox im `env()`) wandert einmal über das Chrom, gesteuert über ein neues Uniform `uSweep` (existiert bereits im Fragment-Shader und wird dafür genutzt bzw. erweitert).
  4. 1400–2400 ms: Text erscheint gestaffelt (Eyebrow, Headline, Sub, CTA, Preis-Pille).
- **Text:**
  - Eyebrow: „Websign Studio“
  - Headline (Verlaufstext `.t-grad`): **„Websites mit Tiefe.“**
  - Sub: „Marke, Website und 3D aus einem Studio. Gebaut, um im Kopf zu bleiben.“
  - Link: „Showreel ansehen ▷“ → öffnet Modal mit Video (Phase 4 liefert das Video; bis dahin ist der Link per `data-requires="media.showreel"` ausgeblendet).
- **Preis-Pille unten rechts** (Glas, 24 px Radius): „Websites ab **{config.pricing.types.onepager} €**“ / zweite Zeile klein „Richtpreis in 60 Sekunden“ + Glas-Button „Projekt starten“. Fehlt der Preis, lautet die Zeile „Festpreis nach kurzem Gespräch“.
- **Scroll-Ausgang:** Beim Herausscrollen wird das Logo kleiner (scale 1 → 0,82), wandert leicht nach oben, und die Helligkeit des Lichtscheins nimmt ab (über `motion.js`).
- **Fallback ohne WebGL / ohne JS / reduzierte Bewegung:** Statt des flachen grauen SVG wird ein **vorgerendertes Standbild des Chrom-Logos** gezeigt (`<picture>`, AVIF/WebP, 2 Breiten). Erzeuge es, indem du den WebGL-Renderer in `tools/playground.html` im finalen Zustand rendern lässt und `canvas.toBlob()` speicherst. Das Bild ist gleichzeitig das LCP-Element und wird mit `fetchpriority="high"` geladen. Das Canvas blendet erst darüber ein, wenn das erste Frame fertig ist (bereits vorhandene `.is-live`-Logik).

**Mobile (S):** Logo oben (40 % Höhe), Text darunter zentriert, Preis-Pille volle Breite unten. Intro auf 1,6 s gekürzt.

**Akzeptanzkriterien**
- LCP ≤ 2,0 s (Mobil, 4G), auch wenn WebGL erst später startet.
- Ohne WebGL sieht der Hero hochwertig aus (Chrom-Standbild), nicht flach.
- Die Intro-Animation läuft bei `prefers-reduced-motion` nicht. Es erscheint sofort der Endzustand.
- Die Studio-Leiste ist per Tastatur erreichbar, der CTA hat einen sichtbaren Fokus.

---

## PHASE 3 · Studio-Tour „Lerne Websign kennen“ + Personalisierung

### 3.1 Studio-Tour (Gegenstück zu Apples „Get to know MacBook Pro“)
**Aufbau (L):** Sektion dunkel, Höhe ≈ 100svh, Überschrift „Lerne Websign kennen.“ links oben, rechts oben Link „Showreel ansehen ▷“.
Links eine senkrechte Liste aus Pillen-Buttons (`role="tablist"`, `aria-orientation="vertical"`). Die aktive Pille klappt zu einer Karte (max. 320 px breit) mit 2 bis 3 Sätzen auf. Rechts eine große Bühne (16:10, Radius 24 px), die für jede Pille eine **Live-Demo im Browser** zeigt. Die Demos sind keine Videos, sondern HTML/CSS/Canvas. Sie werden erst geladen, wenn die Sektion nahe ist (`import('./tour.js')`).

| Pille | Kartentext (Kern) | Live-Demo rechts |
|---|---|---|
| **Strategie** | Wir fragen zuerst, was dein Angebot besonders macht. | Ein Satz baut sich Wort für Wort auf. Drei Kernbegriffe werden markiert und wandern als Etiketten in eine Struktur (Mindmap → Sitemap). |
| **Marke** | Logo, Farben, Schrift, Tonfall. | Das WS-Logo wird aus Konstruktionslinien gezeichnet (SVG `stroke-dashoffset`), danach erscheint eine Farbpalette mit Hex-Werten und eine Typo-Probe. |
| **Design** | Ein System, nicht einzelne Seiten. | Ein 12-Spalten-Raster blendet ein. Karten-Bausteine fliegen ein und rasten ein. Ein Umschalter „Desktop / Mobil“ ordnet sie live um (CSS-Grid-Animation per View Transitions, falls verfügbar). |
| **Entwicklung** | Wir programmieren selbst. | Ein Code-Ausschnitt (echter Code dieser Seite, z. B. aus `count.js`) tippt sich, daneben rendert das Ergebnis live. |
| **3D & Motion** | Bewegung, die erklärt. | Mini-Version des WebGL-Logos, die per Maus kippt (gleicher Renderer, zweite Bühne `data-stage="tour"`). |
| **Tempo** | Schnell auf jedem Gerät. | Live-Messung: Ladezeit dieser Seite aus `performance.getEntriesByType('navigation')`, übertragene KB und Anzahl Requests als Ringdiagramme, die sich füllen. |
| **Für alle** | Barrierefrei nach WCAG 2.2. | Kontrast-Demo: Ein Regler verändert Textfarbe und Hintergrund. Ein Badge zeigt live das Kontrastverhältnis und „AA bestanden / nicht bestanden“. |
| **Betreuung** | Nach dem Launch geht es weiter. | Eine kleine Zeitleiste „Launch → Einweisung → Wartung → Erweiterungen“ mit animierten Punkten. |

- Paddle-Navigation (◀ ▶) unter der Bühne. Pfeiltasten wechseln die Tabs. Automatischer Wechsel **nur** wenn der Nutzer nichts tut und die Sektion sichtbar ist, mit sichtbarem Pause-Knopf, alle 7 s.
- **Mobile:** Pillen werden zu einer horizontalen, scrollbaren Chipleiste über der Bühne. Die Karte steht unter der Bühne.
- `track('tour', {id})` bei jedem Wechsel.

### 3.2 „Wo stehst du heute?“ (Gegenstück zu Apples Upgrader)
**Aufbau:** Helle Sektion. Links die Headline „Es gab nie einen besseren Zeitpunkt für eine neue Website.“ Rechts ein natives `<select>` (gestylt) „Deine Ausgangslage“:
- Noch keine Website
- Baukasten-Seite (z. B. Wix, Jimdo, Squarespace)
- Website ist älter als 5 Jahre
- Website bringt keine Anfragen
- Online-Shop soll besser verkaufen

Darunter ein **Bento-Raster** (L: 3 × 2, unterschiedliche Kachelgrößen; M: 2 Spalten; S: 1 Spalte) mit 6 Kacheln, deren Inhalt je Auswahl wechselt (Crossfade 280 ms, `aria-live="polite"` am Container). Jede Kachel: kleines Icon (selbst gezeichnet, 1,5 px Linie), eine große Aussage, ein Satz Erklärung. Beispiel für „Baukasten-Seite“:
- „**Deine Marke, nicht ein Template.**“ (Verlaufstext)
- „**Bis zu 10× weniger Daten** als typische Baukasten-Seiten.“ (nur wenn du es mit echter Messung belegen kannst; sonst: „Kein Baukasten-Ballast.“)
- „Kein Cookie-Banner nötig.“
- „Du besitzt den Code.“
- „Barrierefrei nach BFSG.“
- „Ein Ansprechpartner statt Support-Ticket.“
Unter dem Raster: Button „Mit dieser Ausgangslage konfigurieren“ → springt zum Konfigurator und **wählt „Relaunch“ bzw. „Neue Website“ automatisch vor** (über ein Ereignis, das `configurator.js` empfängt).

Alle Texte für alle 5 Ausgangslagen stehen in `config.js` unter `situations`, damit sie ohne Code-Änderung angepasst werden können.

**Akzeptanzkriterien Phase 3**
- Beide Module funktionieren per Tastatur, mit Screenreader (Rollen, `aria-selected`, `aria-controls`) und ohne JS. Ohne JS werden alle Tour-Texte als Liste und das Bento für „Noch keine Website“ statisch angezeigt.
- Tour-JS ≤ 12 KB gzip, lazy geladen.
- Keine Demo erzeugt Layout-Shift außerhalb ihrer Bühne.

---

## PHASE 4 · Arbeiten: Featured Case, Branchen-Tabs, Showreel

### 4.1 Inhalte (zuerst klären)
- Wenn `config.projects` echte Projekte enthält: Diese nutzen.
- Sonst: **Drei Konzeptstudien** für fiktive Marken gestalten und *wirklich als Mini-Websites bauen* (je eine statische Seite unter `arbeiten/konzept-<slug>/index.html`, 1 Screen Hero + 2 Sektionen, eigene Farbwelt). Vorschlag:
  1. **„Kornblume“**, Bio-Bäckerei (Handwerk/lokal): warm, Papierstruktur, Serif-Headline.
  2. **„Nordlicht Physio“**, Praxis (Dienstleistung): ruhig, viel Weißraum, Online-Terminbutton.
  3. **„VOLTA“**, E-Bike-Marke (Premium/Produkt): dunkel, 3D-Rad mit dem eigenen Renderer (z. B. Torus-Distanzfeld), Farbwahl.
  Jede Studie trägt sichtbar „Konzeptstudie · kein Kundenprojekt“ und nennt ehrlich, was sie zeigen soll.
- Screenshots/Scroll-Videos dieser Seiten erzeugst du selbst (Headless-Browser, z. B. Playwright lokal; die Ergebnisdateien kommen ins Repo, das Tool nicht).

### 4.2 Featured Case (gepinnte Szene, ≈ 250vh)
- Ein selbst gezeichneter, neutraler **Geräterahmen** (Laptop *und* Smartphone, abgerundet, ohne Notch und ohne Apple-Merkmale) steht in der Mitte.
- Beim Scrollen: (1) Der Laptop fährt von unten ein und kippt von 12° auf 0° (CSS 3D `perspective`). (2) Im Display scrollt der Screenshot der Case-Website von oben nach unten (an den Scroll gekoppelt, `translateY` des Bildes). (3) Rechts daneben schiebt sich das Smartphone mit der mobilen Ansicht ins Bild. (4) Links erscheinen drei Ergebnis-Zahlen nacheinander (bei Konzeptstudien: Lighthouse-Werte und Seitengewicht, die echt gemessen sind).
- Darunter: Kundenname/Studie, Leistungen als Chips, Link „Case Study ansehen ›“.

### 4.3 Branchen-Tabs (Gegenstück zu Apples Apps-Sektion)
- Tabs: *Handwerk · Gastronomie · Praxis & Kanzlei · Start-up · Online-Shop · Lifestyle*. Nur Tabs mit Inhalt werden gezeigt.
- Je Tab: großes Bild (16:10) links, rechts Headline („Gefunden werden. Vertrauen wecken.“), 2 bis 3 Sätze typisches Problem → unsere Lösung, und eine Liste „Typische Bausteine: Online-Termin, Speisekarte, Bewertungen, Anfahrt …“.
- Inhalte aus `config.industries`.

### 4.4 Showreel
- 45 bis 60 s, ohne Ton oder mit optionalem Ton, Untertitel-Datei (`.vtt`).
- Inhalt: Bildschirmaufnahmen der eigenen Seite (Intro, Tour, 3D-Viewer), der Konzeptstudien und der Logo-Konstruktion. Exportiert als 1080p AV1 + H.264, ≤ 8 MB.
- Öffnet im bestehenden Modal-System (`<dialog>`), lädt erst beim Öffnen, Steuerung per nativen `controls`.
- Fable erstellt das **Drehbuch** (Szenenliste mit Sekunden) als `docs/showreel-drehbuch.md`. Die Aufnahme macht der Mensch oder ein lokales Playwright-Skript (`tools/record-showreel.mjs`).

**Akzeptanzkriterien Phase 4**
- Kein erfundener Kundenname. Konzeptstudien sind eindeutig gekennzeichnet.
- Die Featured-Case-Szene läuft auf einem Mittelklasse-Handy flüssig. Der Screenshot ist ein einzelnes, hohes AVIF (≤ 400 KB).
- Alle Bilder haben aussagekräftige `alt`-Texte.

---

## PHASE 5 · Leistungen-Szene, Beweis, 3D-Viewer

### 5.1 Leistungen-Szene erweitern (bestehende `.scene`)
Von 3 auf **5 Kapitel** (`height` von 360vh auf ≈ 560vh). Jedes Kapitel bekommt ein **eigenes** Motiv auf der Bühne rechts. Das Logo ist nur noch der rote Faden, der sich verwandelt:

| Kapitel | Headline | Bühne |
|---|---|---|
| 1 Marke | Erst die Marke. | Logo als reine Kontur, Konstruktionskreise und Hilfslinien zeichnen sich. |
| 2 Struktur | Dann die Struktur. | Tiefenraster klappt auf. Das Logo zerfällt in Raster-Kacheln (CSS-Grid aus 24 Zellen mit Logo-Ausschnitt als `background-position`). |
| 3 Tiefe | Dann die Tiefe. | Das WebGL-Logo bläst sich auf (bestehende Logik), mit Materialwechsel Chrom → Markenblau. |
| 4 Tempo | Dann das Tempo. | Logo wird flach und hell. Darunter läuft eine Ladebalken-Animation „0,8 s“ (echter Messwert aus dem Beweis-Modul). |
| 5 Für alle | Und zwar für alle. | Das Logo erscheint in drei Varianten nebeneinander: hoher Kontrast, Graustufen, große Schrift, als Hinweis auf Barrierefreiheit. |

- Die Tabs unten (bestehend) bekommen 5 Einträge und einen Fortschrittsbalken in der aktiven Pille.
- Übergänge über `motion.js`, Schwellwerte gleichmäßig (0,2 je Kapitel).

### 5.2 Beweis, live gemessen
- Headline: „Diese Seite ist der Beweis.“ Darunter: „Gemessen in deinem Browser, gerade eben.“
- Vier Zahlen (Verlaufstext `.t-grad-accent`, `count.js`):
  1. **Ladezeit** bis `domContentLoaded` dieses Aufrufs (aus der Navigation Timing API, in Sekunden, eine Nachkommastelle).
  2. **Übertragene Daten** bis jetzt (Summe `transferSize` aller Ressourcen, KB). Bei 0 (Cache) steht „aus dem Cache: 0 KB“.
  3. **Externe Dienste**: 0 (wird live geprüft: alle Ressourcen-URLs auf gleiche Origin. Wenn nicht 0, zeigt die Seite den echten Wert).
  4. **Cookies**: `document.cookie === '' ? 0 : n`.
- Darunter klein, statisch mit Fußnote: JS-Größe und 3D-Modell-Größe (nach Phase 5 neu messen!).
- Vergleich als horizontale Balken: „Diese Seite“ vs. „Median deutscher Websites“. Den Median nur mit Quelle und Datum zeigen (z. B. HTTP Archive Web Almanac, Seitengewicht Mobile). Wenn keine belastbare Quelle vorliegt, den Vergleich weglassen.

### 5.3 3D-Viewer polieren
- Zwei weitere Materialien: „Glas“ (Fresnel, leicht transparent, Brechung über Hintergrund-Gradient) und „Gold-Satin“ *oder* ein Material in Paketfarbe Signature.
- Umgebungs-Schalter „Studio / Tageslicht“ (zweite `env()`-Variante).
- Auf Touch-Geräten: sanfte Gyro-Neigung (DeviceOrientation) nur nach ausdrücklichem Tippen auf „Bewegungssensor nutzen“ (iOS-Erlaubnis), sonst aus.
- Hinweis unter dem Viewer: „Dein Produkt kann hier stehen. Wir bauen es als Echtzeit-Modell.“ + Link zum Konfigurator mit vorausgewähltem Extra „3D & Motion“.

**Akzeptanzkriterien Phase 5**
- Alle Live-Werte sind echt, und es gibt einen Fallback-Text, wenn eine API fehlt.
- Die Szene rendert nur, wenn sie sichtbar ist (bestehende Logik bleibt).
- Die Fußnoten 3 und 4 sind mit neuen Messwerten und Datum aktualisiert.

---

## PHASE 6 · Pakete, Ablauf, Warum Websign

### 6.1 Pakete (Gegenstück zur Chip-Familie)
- Headline: „Drei Pakete. Ein Anspruch.“
- Drei Karten nebeneinander (S: horizontal scrollbar mit Snap). Jede Karte hat oben ein abstraktes Motiv: das Tiefenraster in der Paketfarbe, je Stufe dichter und tiefer.
  - **Essenz**: One-Pager/Landingpage, für Gründer & Lokale. Verlauf *Essenz*.
  - **Studio**: Unternehmenswebsite bis 15 Seiten + Mini-Branding. Verlauf *Studio*. Badge „Beliebt“ **nur**, wenn das stimmt.
  - **Signature**: Website + vollständiges Branding + 3D/Motion. Verlauf *Signature*.
- Je Karte: Name (Verlaufstext), eine Zeile Zielgruppe, „ab X €“ aus `config.pricing.packages` (oder „auf Anfrage“), 5 Häkchen-Punkte, Button „Mit Essenz starten“ → Konfigurator vorausgefüllt.
- Darunter „**Pakete vergleichen ›**“ öffnet ein Modal mit einer echten `<table>` (Spaltenköpfe sticky, mobil horizontal scrollbar, `scope`-Attribute). Zeilen: Seitenanzahl, Design-System, Branding, 3D, Barrierefreiheit, CMS, Einweisung, Wartung, Projektdauer.

### 6.2 Ablauf als Timeline
- Bestehende 5 Karten werden zu einer horizontalen Timeline (L) bzw. vertikalen (S). Eine Linie füllt sich mit dem Markenverlauf entsprechend dem Scrollfortschritt (`motion.js`).
- Je Schritt zusätzlich: **Dauer** („ca. 1 Woche“) und **Ergebnis** („Du bekommst: Sitemap + Moodboard“) aus `config.process`.

### 6.3 Warum Websign (Gegenstück zu „Why Apple is the best place to shop“)
- Horizontales Karten-Karussell (bestehende `.gallery`-Komponente), Karten 4:5, oben Text, unten Illustration (selbst gezeichnete Linien-Illustration in Markenfarben), unten rechts „+“ → Modal.
- Karten: *Festpreis nach Gespräch · Ein Ansprechpartner · Antwort in {responseTime} · Einweisung nach Launch · Wartung & Updates · Ohne Cookie-Banner · Barrierefrei nach BFSG · Du besitzt alles (Code, Dateien, Rechte)*.
- Jede Behauptung muss stimmen. Was nicht angeboten wird, wird weggelassen. Liste in `config.promises` zum An- und Abschalten.

---

## PHASE 7 · Stimmen, Konfigurator 2.0, FAQ, Werte, Footer

### 7.1 Stimmen
- Nur wenn `config.testimonials.length > 0`. Große Zitat-Karte (Zitat in `--headline-s`, Name, Rolle, Firma, optional Foto 1:1). Wechsel per Paddle. Keine Sterne-Grafiken ohne Quelle.

### 7.2 Konfigurator 2.0
- Fortschrittsanzeige oben (Schritt x von 6) als segmentierte Linie.
- Vorausfüllen per Ereignis (aus Personalisierung, Paketen, Viewer).
- Richtpreis zählt bei Änderung weich zum neuen Wert (`count.js`) und zeigt eine Spanne („3.900 – 4.600 €“), wenn `config.pricing.range` gesetzt ist.
- Zusammenfassung mobil als sticky Leiste unten („Richtpreis 3.900 € · Ansehen ▴“), die die Summary als Sheet öffnet.
- Alternative unter dem Absende-Button: „Lieber sprechen? **Termin wählen ›**“ (`config.contact.bookingUrl`) und „Anrufen ›“ (`tel:`), jeweils mit `data-requires`.
- Erfolgszustand: Ein ganzflächiger Moment im Formularbereich mit animiertem Häkchen (SVG-Stroke), Zusammenfassung zum Kopieren und „Was jetzt passiert“ in 3 Schritten.

### 7.3 FAQ erweitert
Zusätzliche Fragen: Wie lange dauert ein Projekt? Kann ich Inhalte selbst ändern? Was kostet Wartung? Wem gehört die Website? Was bedeutet barrierefrei nach BFSG für mich? Wo wird gehostet? Antworten aus `config.faq`. Zusätzlich JSON-LD `FAQPage`.

### 7.4 Werte (Gegenstück zu Apples Environment/Values)
Drei Kacheln: **Datenschutz** („Keine Tracker. Auf dieser Seite und auf Wunsch auf deiner.“), **Barrierefreiheit**, **Nachhaltigkeit** (geschätzter CO₂-Wert pro Seitenaufruf nur mit Methode und Quelle in der Fußnote, z. B. Sustainable-Web-Design-Modell; sonst weglassen).

### 7.5 Index + Footer
- Index: 4 Spalten (Entdecken · Arbeiten · Studio · Kontakt) mit allen Unterseiten.
- Footer: Fußnoten (bestehend), Breadcrumb, Rechtliches, Ort, „Diese Seite wurde von Websign gestaltet und programmiert.“

---

## PHASE 8 · Unterseiten, SEO, Domain, Abschluss

### 8.1 Case-Study-Vorlage `arbeiten/<slug>.html`
Aufbau nach Apple-Dramaturgie im Kleinen: Hero (Gerät mit Website, Kunde, Branche, Jahr) → Ausgangslage → Ziel → Lösung in 3 Kapiteln mit Bildern → Ergebnis in großen Zahlen (nur echte) → Stimme (falls vorhanden) → nächster Case → CTA. Alle Inhalte aus einer JSON-Datei `arbeiten/<slug>.json`, gerendert durch eine gemeinsame `case.js`. Ohne JS ist eine statische HTML-Fassung vorhanden. Fable erzeugt beim Anlegen einer Case beides.

### 8.2 `studio.html`
Wer steckt dahinter (Foto, Name, Rolle, 3 Sätze), Arbeitsweise, Werkzeuge, Standort/Region, Kontakt. Nur mit echten Angaben aus `config.studio`.

### 8.3 `kontakt.html`
Kurzformular (Name, E-Mail, Nachricht) + Termin + Telefon + Antwortzeit + Hinweis auf den Konfigurator.

### 8.4 SEO und Auslieferung
- Eigene Domain (z. B. `websign.de`, falls verfügbar) über `CNAME`-Datei in GitHub Pages. Danach `canonical`, `og:url`, `sitemap.xml` anpassen.
- Je Seite einzigartige `title`/`description`, `og:image`.
- Interne Verlinkung zwischen Leistungen, Cases und Paketen.
- `404.html` im Markenstil (Logo, das umkippt, und Link zur Startseite).

### 8.5 Abschluss-Audit
- `node tools/check.mjs` grün.
- Lighthouse (Mobil + Desktop) auf allen Seiten ≥ 98 in allen vier Kategorien. Ergebnis als `docs/audit-<datum>.md` mit Werten speichern.
- Alle Fußnoten neu gemessen und datiert.
- Test mit VoiceOver (macOS/iOS) und NVDA (Windows), Tastatur-Durchgang, 200 % Zoom, `forced-colors`, `prefers-reduced-motion`, ohne JS, ohne WebGL (`chrome://flags` oder `?nogl`-Schalter, den du einbaust).

---

# TEIL C · Prüf-Checkliste nach jeder Phase

**Inhalt und Ehrlichkeit**
- [ ] Kein `[…]`-Platzhalter ohne `?dev` sichtbar
- [ ] Keine erfundenen Kunden, Zitate oder Zahlen. Konzeptstudien sind gekennzeichnet.
- [ ] Jede Zahl hat eine Quelle/Fußnote mit Datum oder wird live gemessen.
- [ ] Keine Apple-Texte, -Bilder, -Icons, -Fonts, kein MacBook-ähnlicher Rahmen

**Gestaltung**
- [ ] Neue Typo-Skala, Farben und Verläufe überall, keine Reste alter Werte
- [ ] Jede Sektion hat ein eigenes Leitmotiv (nicht nur das Logo)
- [ ] Verlaufstext nur bei großen Headlines/Zahlen, mit Fallback
- [ ] Getestet bei 1440 / 1024 / 768 / 390 / 360 px, kein horizontales Scrollen

**Technik**
- [ ] Budgets aus A6 eingehalten (Netzwerk-Tab, Lighthouse)
- [ ] Keine externen Requests
- [ ] Neue Module lazy geladen, kein Fehler in der Konsole
- [ ] Ohne JS lesbar, ohne WebGL hochwertig (Standbilder)
- [ ] Scroll-Szenen: nur `transform`/`opacity`, 60 fps, keine Layout-Arbeit pro Frame

**Barrierefreiheit**
- [ ] Alles per Tastatur, Fokus immer sichtbar, logische Reihenfolge
- [ ] Rollen/ARIA bei Tabs, Karussells, Modals, Live-Werten
- [ ] Videos mit Pause-Knopf, Untertiteln beim Showreel
- [ ] `prefers-reduced-motion`: keine Intro-/Scroll-Animation, alles sofort sichtbar
- [ ] Kontrast AA auch in Verläufen (am hellsten Punkt gemessen)

---

# TEIL D · Was du (nicht Fable) liefern musst

| Was | Wofür | Ohne das … |
|---|---|---|
| **Rechtliche Angaben** (Name/Firma, Anschrift, E-Mail, ggf. USt-IdNr., Verantwortlicher) | Impressum, Datenschutz | darf die Seite nicht beworben werden |
| **E-Mail, Telefon, Antwortzeit, Ort** | Kontakt, Versprechen | werden Kontaktwege ausgeblendet |
| **Preise** je Projektart/Extra, ggf. Paketpreise, MwSt.-Hinweis | Konfigurator, Pakete, Hero | steht „auf Anfrage“ |
| **Formular-Endpoint** (z. B. eigener kleiner Serverdienst oder datenschutzkonformer Formulardienst in der EU) | Anfragen ohne Mailprogramm | öffnet sich das Mailprogramm |
| **Termin-Link** (z. B. eigene Kalender-Seite) | Termin-Alternative | ausgeblendet |
| **Echte Projekte**: Screenshots (Desktop 2880 px breit, Mobil 1170 px), Kurzbeschreibung, **schriftliche Freigabe des Kunden** | Arbeiten, Cases | zeigt Fable Konzeptstudien |
| **Kundenstimmen mit Freigabe** (Name, Rolle, Firma, Foto optional) | Stimmen | Sektion ausgeblendet |
| **Foto(s) von dir/dem Team**, 3 Sätze über dich | Studio-Seite | Studio-Seite ohne Gesicht oder ausgeblendet |
| **Showreel-Aufnahme** (nach Drehbuch von Fable) | Hero-Link, Tour | Link ausgeblendet |
| **Domain** | Professionalität, SEO | bleibt github.io |
| **Entscheidung Font** (Geist / Inter / Manrope) | Identität | Fable nimmt Geist |
| **Welche Versprechen stimmen wirklich** (Festpreis? Wartung? Einweisung?) | Warum-Websign-Karten | nur bestätigte Karten |

---

# TEIL E · Start-Prompt zum Kopieren

```
Du arbeitest im Repository „websign website 1“ (statische Website, GitHub Pages, Vanilla JS, keine Bibliotheken).
Lies zuerst vollständig: index.html, assets/css/tokens.css, assets/css/site.css, assets/js/*.js, tokens.json.
Lies dann das Dokument FABLE-BRIEFING.md, Teil A, komplett. Die Regeln in A3 sind nicht verhandelbar.

Setze jetzt NUR Phase 1 aus Teil B um.
- Arbeite in kleinen, nachvollziehbaren Commits (deutsche Commit-Messages).
- Ändere nichts, was in späteren Phasen beschrieben ist.
- Wenn dir Inhalte aus Teil D fehlen, nutze data-requires/Ausblenden und liste am Ende genau auf, welche Felder in config.js ich füllen muss.
- Prüfe am Ende alle Punkte aus Teil C und berichte jeden Punkt mit ✔ oder ✘ und Begründung.
- Miss Dateigrößen nach deinen Änderungen neu und aktualisiere die Fußnoten.
Frag nach, bevor du etwas tust, das eine Regel aus A3 berühren könnte.
```

Für jede weitere Phase denselben Prompt mit „Setze jetzt NUR Phase N um.“ verwenden.
