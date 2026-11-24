// Websign · React-Insel: Karussell durch eine gekrümmte Linse (components/ui/3d-curved-carousel.tsx).
// Gebaut mit `npm run build` nach assets/js/curved-carousel.js; React teilt sie sich über einen gemeinsamen
// Chunk (assets/js/chunks/) mit den leuchtenden Karten, damit React nur einmal geladen wird.
//
// Markup in index.html:
//   <div data-lens-carousel data-label="Projekte" data-hint="Ziehen zum Blättern" data-height="88svh">
//     <script type="application/json">[{ "title": "…", "kicker": "…", "caption": "…", "image": "assets/media/…", "alt": "…" }]</script>
//     … statischer Ersatzinhalt (ohne JavaScript oder WebGL sichtbar) …
//   </div>
// Optional: data-background, data-ink, data-bend.
import { createRoot } from 'react-dom/client';
import CurvedLensCarousel, { type LensSlide } from '@/components/ui/3d-curved-carousel';

function readSlides(el: HTMLElement): LensSlide[] {
  const json = el.querySelector<HTMLScriptElement>('script[type="application/json"]');
  if (!json) return [];
  try {
    const data = JSON.parse(json.textContent || '[]');
    return Array.isArray(data) ? data.filter((s) => s && typeof s.title === 'string' && typeof s.image === 'string') : [];
  } catch {
    return [];
  }
}

export function mountLensCarousels(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-lens-carousel]').forEach((el) => {
    if (el.dataset.lensMounted) return;
    const slides = readSlides(el);
    if (!slides.length) return;
    el.dataset.lensMounted = '';
    const d = el.dataset;
    const bend = d.bend ? Number(d.bend) : undefined;
    createRoot(el).render(
      <CurvedLensCarousel
        slides={slides}
        label={d.label}
        hint={d.hint}
        height={d.height}
        background={d.background}
        ink={d.ink}
        bend={bend != null && Number.isFinite(bend) ? bend : undefined}
      />,
    );
  });
}
