# Analyse: Apple „MacBook Pro“ vs. Websign

**Verglichen:** `apple.com/macbook-pro/liquid-retina-xdr-display/` und `sngbohan.github.io/websign-website-1/` (Stand 14.11.2026)
**Methode:** Beide Seiten live im Browser bei 1440 × 900 px durchgescrollt und vermessen (DOM, Typografie, Medien, Netzwerk). Dazu der komplette Quellcode von Websign (`index.html`, `site.css`, `tokens.css`, alle JS-Module).

---

## 0. Das Wichtigste in fünf Sätzen

1. **Handwerklich ist eure Seite schon sehr gut.** Barrierefreiheit, Performance, sauberer Code und ein eigener WebGL-Renderer ohne Bibliotheken sind auf einem Niveau, das viele große Agenturen nicht erreichen.
2. **Apple gewinnt nicht durch Code, sondern durch Inhalt.** Die Apple-Seite hat 264 Bilder, 10 Videos und 15 Kapitel mit je eigenem Bildmotiv. Websign hat 0 Bilder, 0 Videos und ein einziges Motiv: das WS-Logo, das viermal vorkommt.
3. **Live stehen sichtbare Platzhalter.** `[PREIS]`, `[Kundenname]`, `[E-MAIL]`, `[RICHTPREIS]` und ein unvollständiges Impressum. Für ein Aushängeschild ist das der größte Vertrauenskiller, und das fehlende Impressum ist in Deutschland abmahnfähig.
4. **Eure Seite übernimmt Apples Design-Tokens fast 1:1.** Schriftgrößen (80/64/48/28/21/17 px), Farben (`#1d1d1f`, `#6e6e73`, `#f5f5f7`), 980-px-Radius und Easing-Kurven sind identisch. Eine Agentur muss aber zeigen, dass sie eine **eigene** Marke bauen kann. Ziel ist Apples Sorgfalt, nicht Apples Look.
5. **Es fehlt die Dramaturgie.** Apple führt durch eine Abfolge Kino-Hero → Produkt-Tour → Personalisierung → Beweise → Vergleich → Kaufhilfe → Werte. Websign hat gute Bausteine, aber keinen Spannungsbogen und keine Beweise in Form von echten Arbeiten.

---

## 1. Zahlen im direkten Vergleich

| Kennzahl | Apple | Websign | Bewertung |
|---|---|---|---|
| Seitenlänge (Desktop) | 27.783 px | 13.481 px | Apple erzählt doppelt so viel |
| Kapitel/Sektionen | 15 | 11 | ähnlich, aber Apple hat pro Kapitel mehrere Ebenen |
| Bilder | 264 | 0 (nur SVG-Logo) | **größte Lücke** |
| Videos | 10 (scroll-gesteuert, lazy) | 0 | **große Lücke** |
| Daten beim Durchscrollen | ≈ 2,4 MB | ≈ 33 KB | Websign gewinnt klar, als Beweis nutzbar |
| Eigene Webschrift | SF Pro Display (geladen) | nur `system-ui` | Websign sieht auf Windows/Android anders aus |
| Sticky Elemente | Lokale Produkt-Nav + 16 Pin-Elemente | 1 Scroll-Szene | Apple hat viel mehr Scroll-Choreografie |
| Interaktive Module | Produkt-Viewer, Upgrader, App-Tabs, Vergleich, Farbwahl, Modals, Film | 3D-Viewer, Konfigurator, Modals | Websign ist hier stark, aber kleiner |
| Verlaufstexte (Gradient) | ≈ 12 gezielte Einsätze, farbcodiert | 0 | einfache, wirkungsvolle Lücke |
| Platzhalter live | 0 | ≥ 15 | **kritisch** |

---

## 2. Was Websign heute schon besser macht (behalten!)

- **Barrierefreiheit:** Skip-Link, native `<dialog>`-Modals mit Fokusfalle, `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`, `forced-colors`, 44-px-Klickflächen und Fußnoten mit Rücksprung. Das ist vorbildlich.
- **Performance und Datenschutz:** 0 Cookies, 0 Drittanbieter, 20 KB JS (gzip). Das ist ein echtes Verkaufsargument, das Apple nicht hat.
- **Eigener WebGL-Renderer:** Distanzfeld-Logo mit prozeduralem Studio-Licht, ohne Three.js. Technisch beeindruckend.
- **Konfigurator mit Richtpreis:** Apple verkauft über „Buy“, ihr über den Konfigurator. Das ist euer stärkstes Conversion-Element.
- **Ehrliche Fußnoten:** Messbare Behauptungen mit Datum. Das ist die gleiche Technik wie bei Apple, nur noch transparenter.
- **Progressive Enhancement:** Die Seite funktioniert ohne JS und ohne WebGL.

Diese Basis ist der Grund, warum das Apple-Niveau realistisch ist. Es fehlt nicht die Technik, es fehlen **Inhalt, Identität und Inszenierung**.

---

## 3. Wo Apple deutlich besser ist, Punkt für Punkt

### 3.1 Beweise statt Behauptungen (Show, don't tell)
**Apple:** Jede Behauptung hat ein Bild, ein Video oder eine Zahl. „Up to 24 hours“ steht als riesige Gradient-Zahl neben einem Foto von Menschen, die draußen arbeiten. Die Apps-Sektion zeigt echte Screenshots von Capture One, Logic, Cinema 4D.
**Websign:** Die Projekt-Galerie besteht live aus drei Platzhalterkarten. Für eine Agentur ist das Portfolio das Produkt. Ein Interessent, der hier keine Arbeiten sieht, geht.
**Konsequenz:** Ohne echte Projekte oder klar gekennzeichnete Konzeptstudien hilft keine Animation. Das ist Priorität 1.

### 3.2 Sichtbare Platzhalter und rechtliche Lücken
Live sichtbar: `[PREIS]` im Konfigurator (×13), `[RICHTPREIS]`, `[Hinweis netto/brutto]`, `[E-MAIL]`, `[INHABER/RECHTSFORM]`, `[Antwortzeit …]`, `[Kundenname]`, `[Branche · Leistung]`. Impressum und Datenschutz sind unvollständig.
**Risiko:** Vertrauensverlust und Abmahngefahr (Impressumspflicht nach § 5 DDG für geschäftsmäßige Angebote).
**Apple:** Kein einziger offener Wert. Jede Zahl hat eine Fußnote.

### 3.3 Visuelle Vielfalt: ein Motiv vs. fünfzehn Welten
**Apple:** Jedes Kapitel hat ein eigenes Leitbild: Chip-Render (Performance), Menschen draußen (Akku), App-Screenshots (Apps), Display-Makros (Display), Port-Icons (Konnektivität), Schloss/Touch ID (Sicherheit).
**Websign:** Hero = Logo. Leistungen-Szene = Logo. 3D-Viewer = Logo. Footer = Logo. Nach dem dritten Mal nutzt sich das Motiv ab.
**Ziel:** Jedes Kapitel bekommt ein eigenes Motiv, das die jeweilige Leistung *zeigt* (Typo-Raster, Farbsysteme, Wireframes, Device-Mockups mit echten Seiten, Live-Performance-Messung).

### 3.4 Hero: Kino vs. Stillleben
**Apple:** Vollflächiges Render-Video („M6“-Schriftzug, aus dem das MacBook aufklappt), Headline in Verlauf („Boost mode.“), Unterzeile, rechts unten eine Glas-Pille mit Preis und blauem „Buy“-Button. Darüber eine Werbe-Leiste. Alles in einem Viewport, sofort verständlich: *was, wie viel, wo kaufen*.
**Websign:** Großes Logo oben, Headline unten am Rand, CTA darunter. **In meinem Testbrowser lief kein WebGL 2.** Dann zeigt der Hero nur ein flaches, hellgraues SVG auf Schwarz. Das ist der erste Eindruck, den ein Teil der Besucher bekommt.
**Ziel:** Ein Intro, das in den ersten 2 Sekunden eine Geschichte erzählt, ein Preisanker („Websites ab … €“) direkt im Hero und ein vorgerendertes Standbild bzw. Video als hochwertiger Fallback statt des flachen SVG.

### 3.5 Lokale Navigation mit Dauer-CTA
**Apple:** Unter der globalen Nav klebt eine zweite Leiste: „MacBook Pro | Overview · Tech Specs · Compare · Switch from PC to Mac | [Buy]“. Der Kauf-Button ist auf jeder Scrollposition einen Klick entfernt.
**Websign:** Es gibt nur eine Nav-Leiste mit dem Glas-CTA. Das ist gut, aber es gibt keine Unterseiten, zu denen die Nav führen könnte.

### 3.6 Geführte Produkt-Tour („Get to know MacBook Pro“)
**Apple:** Links eine senkrechte Liste aus Pillen (Sizes, Performance, Colors, Display, Connectivity, Camera, Mics, Durability). Ein Klick klappt die Pille zu einem Kurztext auf und rechts wechselt das große Bild/Video. Dazu Pfeil-Navigation und „Watch the film“.
**Websign:** Die „Im Detail“-Karten öffnen Modals mit Text. Es gibt keine visuelle Tour.
**Ziel:** Eine „Lerne Websign kennen“-Tour, in der jede Pille eine **Live-Demo im Browser** zeigt (z. B. Typografie-Raster, das sich aufbaut, Kontrast-Prüfung, Ladezeit-Messung). Das kann nur eine Agentur, und es ist der ideale Ersatz für Apples Produktfotos.

### 3.7 Personalisierung („There's never been a better time to upgrade“)
**Apple:** Dropdown „Select your current MacBook Pro“ → ein Bento-Raster aus 6 Kacheln mit konkreten Vorteilen *gegenüber deinem Gerät*.
**Websign:** Fehlt. Der Konfigurator fragt nach dem Projekt, aber nicht nach der Ausgangslage des Besuchers.
**Ziel:** „Wo stehst du heute?“ (keine Website / Baukasten-Seite / veraltete Website / Website ohne Anfragen) → passende Vorteile als Bento-Raster und Sprung in den vorausgefüllten Konfigurator.

### 3.8 Farbcodierte Stufen (Chip-Familie)
**Apple:** M6 = Türkis-Verlauf, M5 Pro = Blau, M5 Max = Violett. Jede Stufe hat eine Farbe, eine Zielgruppe, einen Vergleichswert. Der Kopf versteht die Hierarchie in einer Sekunde.
**Websign:** Keine Pakete, keine Stufen. Preise existieren nur verborgen im Konfigurator.
**Ziel:** Drei Pakete mit eigener Verlaufsfarbe aus der Websign-Markenpalette, „ab“-Preis, Zielgruppe und eine Vergleichstabelle.

### 3.9 Kategorien-Tabs mit echten Beispielen (Apps-Sektion)
**Apple:** 9 Tabs (Photo editing, Coding, STEM …), jeder mit Screenshot, Headline und konkreten Tool-Namen.
**Websign:** „Für wen wir arbeiten“ sind drei Textkarten ohne Bild.
**Ziel:** Branchen-Tabs (Handwerk, Gastronomie, Praxis & Kanzlei, Start-up, E-Commerce, Lifestyle) mit je einem Projekt oder einer Konzeptstudie, einem typischen Problem und einem messbaren Ergebnis.

### 3.10 Große Zahlen als Gestaltungselement
**Apple:** „24 hours“, „4 more hours“, „1600 nits“ mit Verlauf und Fußnote. Zahlen sind Bilder.
**Websign:** Die Stat-Box („0 Cookies“, „20 KB“) ist schon gut, aber statisch und monochrom.
**Ziel:** Zahlen mit Markenverlauf, Hochzählen beim Einblenden und **live im Browser des Besuchers gemessen** (Ladezeit, übertragene Bytes, Anzahl Anfragen über die Performance-API). Damit wird „Diese Seite ist der Beweis“ wirklich beweisbar und einzigartig.

### 3.11 Scroll-Choreografie
**Apple:** Ein Keyframe-System (`data-anim-keyframe`, `data-anim-scroll-group`, 26 animierte Gruppen) koppelt Deckkraft, Skalierung und Position an den Scrollfortschritt. Videos starten an Keyframes, werden beim Verlassen zurückgesetzt und je Breakpoint in eigener Auflösung geladen.
**Websign:** Ein Reveal-Standard (Fade-up) für alles und eine einzige Scroll-Szene mit drei Textwechseln. Das ist konsistent, aber auf Dauer gleichförmig.
**Ziel:** Ein kleines, eigenes Scroll-Keyframe-Modul (≈ 3 KB) und 3 bis 4 zusätzliche gepinnte Szenen mit je eigener Bewegungsidee.

### 3.12 Kaufhilfe und Kontaktwege („Why Apple is the best place to shop“)
**Apple:** Ein Karten-Karussell mit 8 Hilfsangeboten (Ratenzahlung, Trade In, Personal Setup, Live-Beratung …), jede Karte mit Bild und „+“-Modal.
**Websign:** Ein einziger Weg, nämlich Konfigurator → Formular. Da `form.endpoint` leer ist, öffnet sich das Mailprogramm. Es gibt keinen Termin-Link, kein Telefon und keine Antwortzeit.
**Ziel:** Ein Karussell „Warum mit Websign“ (Festpreis, ein Ansprechpartner, Antwort in X Stunden, Einweisung nach Launch, Wartung, ohne Cookie-Banner, barrierefrei nach BFSG) und mehrere Kontaktwege.

### 3.13 Vertrauen und Werte
**Apple:** Umwelt (recycelt, erneuerbare Energie), Privacy, Accessibility, jeweils als eigene Kachel am Ende.
**Websign:** Datenschutz wird als Zahl gezeigt, aber es gibt keine Menschen, keinen Ort, kein Team, keine Kundenstimmen, keine Logos und keine Garantie.
**Ziel:** Studio-Seite mit Gesicht, echte Stimmen (nur mit Freigabe), Werte-Block.

### 3.14 Eigene Markenidentität statt Apple-Kopie
Gemessen in `tokens.css`: Die Typo-Skala, die Grautöne, die Radien und die Easing-Kurven entsprechen Apples Werten. Kunden mit Design-Auge (genau eure Premium-Zielgruppe) erkennen das sofort als „Apple-Template“. Das untergräbt die Kernbotschaft „Wir geben deiner Marke ein eigenes Gesicht“.
**Ziel:**
- Eigene, selbst gehostete Variable Font (OFL-Lizenz, z. B. *Geist*, *Inter Display* oder *Manrope*). So bleibt „0 externe Dienste“ wahr und die Seite sieht auf allen Systemen gleich aus.
- Eine eigene Typo-Skala (z. B. Verhältnis 1,25 statt Apples Stufen).
- Ein Markenverlauf aus euren eigenen Logo-Farben (`--brand-ice #c6d2e5` → `--brand-blue #4766a0` → `--brand-navy #284172`) plus *eine* Akzentfarbe.
- Eigene Easing-Signatur.

### 3.15 Responsive Medien
**Apple:** Eigene Bild- und Videodateien je Breakpoint (small/medium/large), Retina-Varianten und Lazy Loading per Keyframe.
**Websign:** Bisher keine Medien, also auch keine Pipeline. Sobald Bilder und Videos dazukommen, braucht es eine (AVIF/WebP, `srcset`, Poster, `preload="none"`).

### 3.16 Auffindbarkeit und Teilen
- Kein `og:image`: Beim Teilen auf WhatsApp oder LinkedIn erscheint kein Vorschaubild. Für eine Agentur ist das peinlich.
- Kein JSON-LD (Organization / ProfessionalService), keine `sitemap.xml`, kein `canonical`.
- Die Adresse `sngbohan.github.io/websign-website-1/` wirkt nicht professionell. Es braucht eine eigene Domain.

### 3.17 Informationsarchitektur
**Apple:** Eine Produktseite ist Teil eines Systems (Tech Specs, Compare, Buy, Switch).
**Websign:** Es gibt nur eine Seite. Es fehlen Case-Study-Seiten (Tiefgang und SEO), eine Studio-/Über-uns-Seite, eine Leistungsseite je Service und eine Kontakt-/Terminseite.

---

## 4. Priorisierung

| Prio | Maßnahme | Wirkung | Aufwand |
|---|---|---|---|
| **P0** | Alle Platzhalter füllen oder Sektion ausblenden, Impressum/Datenschutz komplett, Formular-Endpoint | Vertrauen, Rechtssicherheit | klein |
| **P0** | Echte Projekte oder als solche gekennzeichnete Konzeptstudien | Kernbeweis einer Agentur | mittel (Inhalte) |
| **P1** | Eigene Identität (Font, Skala, Verlauf, Akzent) | Glaubwürdigkeit | mittel |
| **P1** | Kino-Hero mit Preisanker + hochwertiger Fallback | erster Eindruck | mittel |
| **P1** | Lokale Sticky-Nav mit Dauer-CTA | Conversion | klein |
| **P2** | Studio-Tour mit Live-Demos | „Wow“ und Kompetenz | groß |
| **P2** | „Wo stehst du heute?“-Personalisierung | Relevanz, Conversion | mittel |
| **P2** | Pakete mit Farbcode + Vergleich | Preisklarheit | mittel |
| **P2** | Live-Performance-Beweis mit hochzählenden Zahlen | Alleinstellung | klein |
| **P3** | Branchen-Tabs, Warum-Websign-Karussell, Werte, Stimmen | Tiefe, Vertrauen | mittel |
| **P3** | Case-Study-Unterseiten, Studio-Seite, SEO, Domain, OG-Bild | Reichweite | mittel |

Die Umsetzung steht Schritt für Schritt in **`FABLE-BRIEFING.md`**.
