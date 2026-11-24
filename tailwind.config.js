// Tailwind nur für die React-Inseln (src/, components/). Ohne Preflight: Die übrige Seite hat ihr eigenes CSS
// (assets/css/tokens.css, site.css), das Tailwind nicht zurücksetzen darf.
/** @type {import('tailwindcss').Config} */
export default {
  // Das Linsen-Karussell bringt sein eigenes CSS mit und nutzt kein Tailwind. Ohne Ausschluss würde Tailwind Wörter
  // aus dessen CSS-Text (hidden, block, transform …) als globale Klassen erzeugen.
  content: ['./components/ui/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', '!./components/ui/3d-curved-carousel.tsx', '!./src/curved-carousel.tsx'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
