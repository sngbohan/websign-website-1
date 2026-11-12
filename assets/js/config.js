// Websign · Inhalte an einer Stelle
// Alles, was noch fehlt, steht hier als null. Solange ein Wert null ist, zeigt die Website
// an der Stelle einen orange markierten Platzhalter in [eckigen Klammern].
// Trage die echten Angaben ein, dann verschwinden die Platzhalter von selbst.

export const config = {
  contact: {
    email: null,            // z. B. 'hallo@deine-domain.de'
    phone: null,            // z. B. '+49 30 1234567'
  },

  legal: {
    owner: null,            // z. B. '· Max Mustermann' oder 'GmbH'
    name: null,             // vollständiger Name bzw. Firma für das Impressum
    street: null,
    city: null,             // PLZ und Ort
    vatId: null,            // USt-IdNr., falls vorhanden
    responsible: null,      // inhaltlich verantwortlich
    hosting: null,          // Hosting-Anbieter mit Anschrift (für die Datenschutzerklärung)
  },

  // Versand der Projektanfrage:
  // endpoint = Adresse eines Formular-Dienstes oder eigenen Skripts, das JSON per POST annimmt.
  // Bleibt endpoint null, öffnet sich das E-Mail-Programm des Besuchers mit der fertigen Anfrage
  // an contact.email.
  form: {
    endpoint: null,
  },

  // Preislogik des Konfigurators. Richtpreis = Projektart + Ausgangslage + Umfang + Extras.
  // Beträge in Euro ohne Tausenderpunkt. 0 bedeutet „inklusive“, null bedeutet „noch offen“.
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

  // Projekte für die Galerie. Leer = Platzhalterkarten.
  // Beispiel: { name: 'Kundenname', meta: 'Branche · Leistung', image: 'assets/img/projekte/kunde.jpg', alt: 'Was auf dem Bild zu sehen ist', url: 'https://…' }
  projects: [],
};
