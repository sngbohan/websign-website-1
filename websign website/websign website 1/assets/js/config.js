// Websign · Inhalte an einer Stelle
// Alles, was noch fehlt, steht hier als null. Solange ein Wert null ist, blendet die Website
// die zugehörige Stelle aus oder zeigt einen neutralen Ausweichtext. Nichts Unfertiges ist live sichtbar.
// Lokal zeigt http://127.0.0.1:4173/?dev alle offenen Stellen als orange Platzhalter in [eckigen Klammern].
// `node tools/check.mjs` listet auf, welche Pflichtangaben noch fehlen.

export const config = {
  site: {
    // Öffentliche Adresse mit Schrägstrich am Ende. Sie steht zusätzlich fest in index.html (canonical, og:url,
    // og:image, JSON-LD), sitemap.xml und robots.txt. Bei einem Domainwechsel alle Stellen anpassen;
    // tools/check.mjs meldet Abweichungen.
    url: 'https://sngbohan.github.io/websign-website-1/',
  },

  contact: {
    email: null,            // z. B. 'hallo@deine-domain.de' (Pflicht fürs Impressum)
    phone: null,            // z. B. '+49 30 1234567'
    bookingUrl: null,       // Termin-Link, z. B. eigene Kalender-Seite
    responseTime: null,     // nur die Dauer, sie steht hinter „innerhalb von“: z. B. 'zwei Werktagen' oder '24 Stunden'
    city: null,             // Ort des Studios ohne PLZ, z. B. 'Berlin'
  },

  legal: {
    owner: null,            // Zusatz hinter „Websign“ im Copyright, z. B. '· Max Mustermann' oder 'GmbH'
    name: null,             // vollständiger Name bzw. Firma mit Rechtsform (Pflicht)
    street: null,           // Straße und Hausnummer (Pflicht)
    city: null,             // PLZ und Ort (Pflicht)
    vatId: null,            // USt-IdNr., falls vorhanden
    responsible: null,      // inhaltlich verantwortlich nach § 18 Abs. 2 MStV: Name und Anschrift
    authority: null,        // zuständige Datenschutz-Aufsichtsbehörde, z. B. 'Berliner Beauftragte für Datenschutz und Informationsfreiheit'
    formProcessor: null,    // nur mit form.endpoint: Name und Anschrift des Formular-Dienstes
    // Hosting-Anbieter für die Datenschutzerklärung. Voreingestellt für GitHub Pages.
    hosting: 'GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA',
  },

  // Versand der Projektanfrage:
  // endpoint = Adresse eines Formular-Dienstes oder eigenen Skripts, das JSON per POST annimmt.
  // Bleibt endpoint null, öffnet sich das E-Mail-Programm des Besuchers mit der fertigen Anfrage
  // an contact.email.
  form: {
    endpoint: null,
  },

  // Preislogik des Konfigurators. Richtpreis = Projektart + Ausgangslage + Umfang + Extras.
  // Beträge in Euro ohne Tausenderpunkt. 0 bedeutet „inklusive“, null bedeutet „auf Anfrage“.
  // Steht bei keiner Projektart ein Preis, zeigt der Konfigurator keine Preise und verspricht den Richtpreis per E-Mail.
  pricing: {
    vatNote: null,          // z. B. 'Alle Preise zzgl. 19 % MwSt.' oder 'Kein Ausweis der Umsatzsteuer nach § 19 UStG.'
    types: {                // Startpreis je Projektart („ab …“)
      onepager: null,
      landingpage: null,
      unternehmen: null,
      shop: null,
      portfolio: null,
      blog: null,
    },
    base: {                 // Aufpreis je Ausgangslage
      neu: 0,
      relaunch: null,
    },
    scope: {                // Aufpreis je Umfang (entfällt bei One-Pager und Landingpage)
      kompakt: 0,
      mittel: null,
      gross: null,
    },
    extras: {               // Aufpreis je Extra
      motion: null,
      branding: null,
    },
  },

  // Beschriftung der Umfangsstufen (bei Bedarf anpassen)
  scopeLabels: {
    kompakt: 'Bis 5 Seiten',
    mittel: '6 bis 15 Seiten',
    gross: 'Mehr als 15 Seiten',
  },

  // Projekte für die Galerie. Leer = die Sektion „Projekte“ und ihre Links sind ausgeblendet.
  // Nur echte Projekte mit Freigabe des Kunden eintragen.
  // Beispiel: { name: 'Kundenname', meta: 'Branche · Leistung', image: 'assets/media/projekte/kunde-1120.jpg', alt: 'Was auf dem Bild zu sehen ist', url: 'arbeiten/kunde.html' }
  projects: [],
};

// Pflichtangaben nach § 5 DDG. Fehlt eine, zeigen Impressum und Datenschutz den Hinweis
// „Diese Angaben werden gerade ergänzt“ und tools/check.mjs schlägt fehl.
export const REQUIRED_LEGAL = ['legal.name', 'legal.street', 'legal.city', 'contact.email'];
