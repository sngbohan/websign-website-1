// Tailwind nur für die React-Inseln (src/, components/). Ohne Preflight: Die übrige Seite hat ihr eigenes CSS
// (assets/css/tokens.css, site.css), das Tailwind nicht zurücksetzen darf.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./components/ui/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
