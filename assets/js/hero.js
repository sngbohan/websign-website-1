// Websign · Hero: Der Rechner klappt auf, die Kamera schwenkt in die Dreiviertelansicht.
// Das Modell ist reines CSS (site.css, Abschnitt „Rechner als 3D-Modell“). Dieses Skript setzt pro Bild nur sechs
// Custom Properties am Modell: --lid, --yaw, --pitch, --persp, --bright, --slice. Animiert werden damit nur
// transform und opacity. Ohne dieses Skript und bei reduzierter Bewegung zeigt CSS direkt den Endzustand.

// ---------- Stellschrauben ----------
const T = {
  DURATION: 2000,          // ms · Dauer des Aufklappens beim Laden (einmal pro Seitenaufruf)
  SKIP_SPEED: 4,           // so viel schneller läuft der Rest, wenn während des Aufklappens gescrollt oder getippt wird
  // Phase A · Deckel öffnet im Seitenprofil
  A_END: 0.55,             // Anteil der Dauer, bis der Deckel offen ist
  LID_OPEN: 110,           // Grad · Endwinkel des Deckels
  LID_OVERSHOOT: 2,        // Grad · schwingt kurz über und federt zurück
  BRIGHT_FROM: 15,         // Grad · ab hier blendet das Display auf
  BRIGHT_FULL: 80,         // Grad · ab hier leuchtet es voll
  // Phase B · Kamera schwenkt vom Profil in die Dreiviertelansicht
  B_START: 0.5,            // beginnt kurz bevor der Deckel steht, damit die Bewegung nicht stockt
  B_END: 0.92,
  YAW_START: 90,           // Grad · 90 = exaktes Seitenprofil
  YAW_END: 25,             // Grad · Ansicht am Ende, seitlich
  PITCH_END: 16,           // Grad · Ansicht am Ende, von oben
  PERSP_START: 20000,      // px · sehr weit weg = Profil ohne Fluchtpunkt
  PERSP_END: 1900,         // px · Kameraabstand am Ende
  SLICE_OUT: [0.5, 0.66],  // in diesem Abschnitt blendet das Logo im Keil aus und das Display übernimmt
  // Mobil (bis 734 px): gleiche Bewegung, weniger Schwenk
  MOBILE: { YAW_END: 16, PITCH_END: 13, PERSP_END: 1500 },
  // Danach · beim Wegscrollen klappt der Deckel etwas zu, die Kamera dreht leicht weiter
  EXIT_LID: 38,            // Grad, um die der Deckel beim Verlassen des Heros schließt
  EXIT_YAW: 12,            // Grad
  EXIT_PITCH: 5,           // Grad
  // Zeiger: Das Gerät folgt der Maus wenige Grad
  POINTER_YAW: 3,
  POINTER_PITCH: 2,
  LERP: 0.1,               // Glättung für Scroll und Zeiger (Anteil pro Bild bei 60 fps)
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function initHero() {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const model = document.querySelector('.lp');
  if (!hero || !model) return;
  const done = () => root.classList.remove('hero-intro');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { done(); return; }                         // CSS zeigt den Endzustand

  const small = matchMedia('(max-width: 734px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const end = () => ({ ...T, ...(small.matches ? T.MOBILE : null) });
  const shared = (window.__wsHero = window.__wsHero || {});   // scene.js liest hier die Helligkeit für das 3D-Logo
  const style = model.style;
  const play = root.classList.contains('hero-intro');
  let p = play ? 0 : 1;                 // Fortschritt des Aufklappens, 0 … 1
  let speed = 1, last = 0, raf = 0;
  let exit = 0, exitTarget = 0;         // Anteil des Heros, der schon weggescrollt ist
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let heroH = hero.offsetHeight;

  function render() {
    const E = end();
    // Phase A: Deckel
    const a = clamp(p / E.A_END, 0, 1);
    const settle = Math.sin(clamp((p - E.A_END * 0.86) / (E.A_END * 0.5), 0, 1) * Math.PI);   // kurzes Überschwingen
    let lid = E.LID_OPEN * easeInOut(a) + E.LID_OVERSHOOT * settle;
    // Phase B: Kamera
    const b = easeInOut(clamp((p - E.B_START) / (E.B_END - E.B_START), 0, 1));
    let yaw = lerp(E.YAW_START, E.YAW_END, b);
    let pitch = lerp(0, E.PITCH_END, b);
    const persp = 1 / lerp(1 / E.PERSP_START, 1 / E.PERSP_END, b);      // Kehrwert, damit der Fluchtpunkt gleichmäßig näher kommt
    const slice = 1 - smooth(E.SLICE_OUT[0], E.SLICE_OUT[1], p);
    // Danach: Wegscrollen und Zeiger
    lid -= E.EXIT_LID * exit;
    yaw += -E.EXIT_YAW * exit + ptr.x * E.POINTER_YAW * b;
    pitch += E.EXIT_PITCH * exit - ptr.y * E.POINTER_PITCH * b;
    const bright = smooth(E.BRIGHT_FROM, E.BRIGHT_FULL, lid);
    style.setProperty('--lid', lid.toFixed(2));
    style.setProperty('--yaw', yaw.toFixed(2));
    style.setProperty('--pitch', pitch.toFixed(2));
    style.setProperty('--persp', `${Math.round(persp)}px`);
    style.setProperty('--bright', bright.toFixed(3));
    style.setProperty('--slice', slice.toFixed(3));
    shared.bright = bright * (1 - slice);
    if (shared.wake) shared.wake();
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    if (p < 1) p = Math.min(1, p + (dt / T.DURATION) * speed);
    const k = 1 - Math.pow(1 - T.LERP, dt / 16.67);
    exit += (exitTarget - exit) * k;
    ptr.x += (ptr.tx - ptr.x) * k;
    ptr.y += (ptr.ty - ptr.y) * k;
    render();
    const moving = p < 1 || Math.abs(exitTarget - exit) > 0.001 || Math.abs(ptr.tx - ptr.x) > 0.002 || Math.abs(ptr.ty - ptr.y) > 0.002;
    if (moving) raf = requestAnimationFrame(frame); else last = 0;
  }
  const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };

  const onScroll = () => {
    exitTarget = clamp(window.scrollY / Math.max(heroH, 1), 0, 1);
    if (p < 1 && window.scrollY > 8) speed = T.SKIP_SPEED;             // überspringen: Rest läuft schnell durch
    wake();
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { heroH = hero.offsetHeight; onScroll(); });
  addEventListener('keydown', () => { if (p < 1) speed = T.SKIP_SPEED; }, { once: true });
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  if (fine) {
    addEventListener('pointermove', (e) => {
      if (exitTarget >= 1) return;
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
      wake();
    }, { passive: true });
  }

  exit = exitTarget = clamp(window.scrollY / Math.max(heroH, 1), 0, 1);
  render();                 // erster Zustand als Inline-Werte …
  done();                   // … danach braucht es die Start-Klasse nicht mehr
  wake();
}
