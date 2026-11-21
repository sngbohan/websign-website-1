// Websign · React-Insel: leuchtende Auswahlkarten im Konfigurator (GlowCard aus components/ui/spotlight-card.tsx).
// Gebaut mit `npm run build` nach assets/js/glow-cards.js; configurator.js lädt sie nur auf Geräten mit Maus nach.
// Die Radio- und Checkbox-Felder bleiben unangetastet (sie liegen neben .option__box): Formular, Bauplan und Bon
// arbeiten weiter wie bisher. React ersetzt nur den sichtbaren Inhalt der Karte.
import { createRoot } from 'react-dom/client';
import { GlowCard } from '@/components/ui/spotlight-card';

// Farbe der leuchtenden Ränder: 'chrome' (Silber wie das Chrom-Logo) oder 'websign' (Markenblau)
const GLOW: 'chrome' | 'websign' = 'chrome';

const CSS_HREF = new URL('../css/glow-cards.css', import.meta.url).href;

// Stylesheet erst laden, dann umbauen: sonst springen die Karten kurz ohne Rahmen
function loadCss(): Promise<void> {
  const existing = document.querySelector<HTMLLinkElement>('link[data-glow-css]');
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.dataset.glowCss = '';
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('glow-cards.css fehlt'));
    document.head.append(link);
  });
}

export async function mountGlowCards(scope: ParentNode): Promise<void> {
  await loadCss();
  scope.querySelectorAll<HTMLElement>('.option__box').forEach((box) => {
    if (box.classList.contains('option__box--glow')) return;
    // Eigenes, statisches Markup aus index.html (Name, Beschreibung, Preis aus config.js): kein Fremdinhalt
    const html = box.innerHTML;
    box.classList.add('option__box--glow');
    createRoot(box).render(
      <GlowCard customSize glowColor={GLOW} className={`option__glow option__glow--${GLOW}`}>
        <span className="option__inner" dangerouslySetInnerHTML={{ __html: html }} />
      </GlowCard>,
    );
  });
}
