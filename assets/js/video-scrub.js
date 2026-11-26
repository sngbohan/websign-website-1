// Websign · Video-Szene „So könnte deine Website aussehen“ (Scroll spult das Video, die Seite steht so lange still)
// Nach der Komponente „scroll-locked-video-hero“ (21st.dev, Guglielmo Giannattasio), ohne React neu umgesetzt,
// damit sie ohne Build und ohne React-Download läuft. Die TSX-Fassung liegt in components/ui/scroll-locked-video-hero.tsx.
//
// <section data-scrub-video data-scrub-distance="3600">
//   <video data-src="assets/media/video/….mp4" poster="….jpg" muted playsinline preload="none" aria-hidden="true"></video>
//   … .vscrub__title, .vscrub__tagline, .vscrub__hint, .vscrub__bar …
// </section>
//
// Ablauf: Erreicht die Oberkante der Sektion beim Scrollen den Bildschirmrand, rastet sie dort ein. Mausrad, Touch und
// Pfeil-/Bildtasten spulen dann das Video vor und zurück, die Seite bewegt sich nicht. Ist das Video am Ende und man
// scrollt weiter, geht die Seite normal weiter; zurück am Anfang ebenso nach oben. Von unten kommend rastet sie wieder ein.
// Anders als das Original wird der Body nie fixiert: Gesperrt wird nur über preventDefault, solange die Sektion steht.
// Bildlaufleiste, Anker-Links, Tab und Pos1/Ende geben die Seite sofort frei.
// Ohne JavaScript, bei reduzierter Bewegung oder wenn das Video nicht lädt: Standbild mit Titel, nichts wird gesperrt.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);
const INTRO = 0.05;    // erster Teil des Wegs: Titel verschwindet, Video steht auf dem ersten Bild
const OUTRO = 0.07;    // letzter Teil: Video steht auf dem Schlussbild, der Schlusssatz erscheint
const PUSH = 160;      // so weit (px) muss man über das Ende hinaus weiterscrollen, bis die Seite freigegeben wird
const GRACE = 600;     // ms nach dem Einrasten, in denen Rest-Schwung der Seite zurückgesetzt statt als Freigabe gewertet wird
const KEYS = { ArrowDown: 1, ArrowUp: -1, PageDown: 2, PageUp: -2, ' ': 2 };

export function initVideoScrub(track = () => {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-scrub-video]').forEach((s) => setup(s, track));
}

function setup(section, track) {
  if (section.__scrub) return;
  const video = section.querySelector('video[data-src]');
  if (!video) return;
  section.__scrub = true;

  const $ = (sel) => section.querySelector(sel);
  const title = $('.vscrub__title'), tagline = $('.vscrub__tagline'), hint = $('.vscrub__hint'), bar = $('.vscrub__bar i');
  const veil = $('.vscrub__veil');   // dunkelt das helle Video ab, solange Titel oder Schlusssatz darauf stehen
  const distance = Number(section.dataset.scrubDistance) || 3600;

  let duration = 0, ready = false, failed = false;
  let target = 0, current = 0, raf = 0;
  let locked = false, lockY = 0, lockedAt = 0, push = 0;
  let touchY = 0, touching = false, lastGesture = -Infinity, anchorUntil = 0, prevTop = null;
  let seeking = false, pendingTime = null, lastSeek = -1;
  let listening = false, finished = false;
  const now = () => performance.now();

  // ---------- Video laden ----------
  section.classList.add('vscrub--live');
  video.muted = true; video.playsInline = true; video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  // Das Standbild (poster) ist das erste Videobild: Es bleibt stehen, bis das Video geladen ist, der Wechsel ist unsichtbar.
  const poster = video.getAttribute('poster');
  video.preload = 'auto';
  // Das Video wird einmal komplett geladen und als Blob eingesetzt: So lässt es sich auf jedem Server spulen (auch ohne
  // Range-Anfragen, etwa tools/serve.py), und rückwärts spulen muss nichts nachladen. Klappt das nicht, direkt per src.
  const useSrc = (src) => {
    video.src = src;
    video.load();
    // iOS lädt oft keine Videodaten, solange nichts abgespielt wurde: einmal stumm anspielen und sofort anhalten.
    const p = video.play();
    if (p && p.then) p.then(() => { video.pause(); seekTo(timeFor(current)); }).catch(() => {}); else video.pause();
  };
  fetch(video.dataset.src)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((b) => useSrc(URL.createObjectURL(b)))
    .catch(() => useSrc(video.dataset.src));

  const onReady = () => {
    if (ready || !(video.duration > 0)) return;
    duration = video.duration; ready = true;
    section.classList.add('is-ready');
    seekTo(timeFor(current));
  };
  video.addEventListener('loadeddata', onReady);
  video.addEventListener('loadedmetadata', onReady);
  if (video.readyState >= 2) onReady();
  video.addEventListener('error', () => {           // Video fehlt oder Format nicht unterstützt: zurück zum Standbild
    failed = true; release(); detach();
    section.classList.remove('vscrub--live', 'is-ready', 'is-locked');
    if (poster) video.poster = poster;
    cancelAnimationFrame(raf); raf = 0;
    [title, tagline, veil, video].forEach((el) => el && el.removeAttribute('style'));
  }, true);

  video.addEventListener('seeked', () => {
    seeking = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; seekTo(t); }
  });
  function seekTo(t) {
    if (!ready || Math.abs(t - lastSeek) < 0.004) return;
    if (seeking) { pendingTime = t; return; }
    seeking = true; lastSeek = t;
    video.currentTime = t;
  }
  const timeFor = (p) => clamp((p - INTRO) / (1 - INTRO - OUTRO), 0, 1) * Math.max(0, duration - 0.05);

  // ---------- Darstellung ----------
  function render() {
    if (failed) return;
    seekTo(timeFor(current));
    const ti = smooth(1 - clamp(current / INTRO, 0, 1));
    if (title) {
      title.style.opacity = ti.toFixed(3);
      title.style.transform = `translateY(${((1 - ti) * -24).toFixed(1)}px) scale(${(0.96 + ti * 0.04).toFixed(4)})`;
      title.style.filter = ti > 0.999 ? '' : `blur(${((1 - ti) * 10).toFixed(2)}px)`;
    }
    const to = smooth(clamp((current - (1 - OUTRO)) / OUTRO, 0, 1));
    if (veil) veil.style.opacity = Math.max(ti, to * 0.6).toFixed(3);
    if (tagline) {
      tagline.style.opacity = to.toFixed(3);
      tagline.style.transform = `translateY(${((1 - to) * 20).toFixed(1)}px) scale(${(0.97 + to * 0.03).toFixed(4)})`;
      tagline.style.filter = to > 0.999 ? '' : `blur(${((1 - to) * 8).toFixed(2)}px)`;
    }
    if (hint) hint.classList.toggle('is-gone', target > 0.002 || current > 0.002);
    if (bar) bar.style.transform = `scaleX(${current.toFixed(4)})`;
    video.style.transform = `scale(${(1 + current * 0.04).toFixed(4)})`;
    if (current >= 1 && !finished) { finished = true; track('video-scrub', { state: 'ende' }); }
  }
  function frame() {
    raf = 0;
    current += (target - current) * 0.18;
    if (Math.abs(target - current) < 0.0004) current = target;
    render();
    if (current !== target) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const jump = (p) => { target = current = p; push = 0; render(); };

  // ---------- Einrasten und Freigeben ----------
  const top = () => section.getBoundingClientRect().top;
  const pageTop = () => top() + window.scrollY;
  const scrollToY = (y) => window.scrollTo({ top: y, left: window.scrollX, behavior: 'instant' });

  function lock() {
    if (locked || failed || !ready) return;
    locked = true; lockedAt = now(); push = 0;
    lockY = Math.round(pageTop());
    scrollToY(lockY);
    section.classList.add('is-locked');
    if (target === 0) track('video-scrub', { state: 'start' });
  }
  function release() {
    if (!locked) return;
    locked = false; push = 0;
    section.classList.remove('is-locked');
  }

  // Würde diese Bewegung (dy > 0 = nach unten) die Sektion erreichen oder steht sie schon fast an ihrem Platz?
  function shouldLock(dy) {
    if (!ready || failed || locked) return false;
    const t = top(), vh = window.innerHeight;
    if (dy > 0 && target < 1) return t > 0 ? t - dy <= 0 : t > -vh * 0.5;
    if (dy < 0 && target > 0) return t < 0 ? t - dy >= 0 : t < vh * 0.5;
    return false;
  }
  // Am Ende (oder Anfang) angekommen und weiter in dieselbe Richtung gedrückt: Seite freigeben.
  function wantsRelease(dy) {
    const atEnd = dy > 0 && target >= 1 && current > 0.995;
    const atStart = dy < 0 && target <= 0 && current < 0.005;
    if (!atEnd && !atStart) { push = 0; return false; }
    push += Math.abs(dy);
    return push > PUSH;
  }
  function scrub(dy) {
    target = clamp(target + dy / distance, 0, 1);
    kick();
  }

  // Spulstand passend zur Lage stellen, solange nichts eingerastet ist: Liegt die Sektion unter dem oberen Rand,
  // kommt man von oben und das Video gehört an den Anfang; ist sie deutlich nach oben weg, ans Ende.
  // Nötig nach Sprüngen (Anker-Link, Bildlaufleiste), bei denen die Sektion nie ganz außer Sicht war.
  function normalize(t = top()) {
    if (locked || failed) return;
    if (t > 2 && target > 0) jump(0);
    else if (t < -window.innerHeight * 0.25 && target < 1) jump(1);
  }

  // Gibt true zurück, wenn das Ereignis abgefangen werden soll.
  function input(dy) {
    lastGesture = now();
    // Menü oder Modal offen (alle sind <dialog>): Deren Inhalt soll scrollen, nicht das Video.
    if (document.querySelector('dialog[open]')) { release(); return false; }
    if (!dy) return locked;
    normalize();
    if (!locked) {
      if (!shouldLock(dy)) return false;
      lock();
      return true;
    }
    if (wantsRelease(dy)) { release(); return false; }
    scrub(dy);
    return true;
  }

  const onWheel = (e) => {
    if (e.ctrlKey || e.defaultPrevented) return;                     // Zoomen per Trackpad nicht anfassen
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (Math.abs(e.deltaX) > Math.abs(dy) && !locked) return;        // waagerechtes Wischen (z. B. Galerie) durchlassen
    if (input(dy) && e.cancelable) e.preventDefault();
  };
  const onTouchStart = (e) => { if (e.touches.length === 1) { touchY = e.touches[0].clientY; touching = true; } };
  const onTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    const y = e.touches[0].clientY, dy = (touchY - y) * 1.6;
    touchY = y;
    if (input(dy) && e.cancelable) e.preventDefault();
  };
  const onTouchEnd = () => { touching = false; lastGesture = now(); };
  const onKey = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|VIDEO|AUDIO)$/.test(el.tagName))) return;
    if (document.querySelector('dialog[open]')) { release(); return; }
    if (locked && (e.key === 'Home' || e.key === 'End' || e.key === 'Tab')) { release(); return; }
    let step = KEYS[e.key];
    if (!step) return;
    if (e.key === ' ' && e.shiftKey) step = -2;
    const dy = Math.abs(step) === 2 ? Math.sign(step) * window.innerHeight * 0.8 : step * 100;
    lastGesture = now();
    if (!locked) { normalize(); return; }                            // Einrasten beim Tastatur-Scrollen übernimmt onScroll
    if (wantsRelease(dy)) { release(); return; }
    e.preventDefault();
    scrub(dy);
  };
  const onScroll = () => {
    const t = top();
    if (locked) {
      if (Math.abs(window.scrollY - lockY) > 1) {
        // Rest-Schwung direkt nach dem Einrasten oder während der Finger liegt: zurücksetzen.
        // Später heißt es: Bildlaufleiste, Anker-Link oder Skript haben die Seite bewegt. Dann freigeben.
        if (touching || now() - lockedAt < GRACE) scrollToY(lockY); else release();
      }
      prevTop = t;
      return;
    }
    // Ohne Mausrad-Ereignis über die Sektion gescrollt (Tastatur, Touch-Schwung): beim Überqueren einrasten.
    const byUser = now() - lastGesture < 1200 && now() > anchorUntil;
    if (prevTop !== null && byUser && ready && !failed) {
      if (prevTop > 0 && t <= 0 && target < 1) lock();
      else if (prevTop < 0 && t >= 0 && target > 0) lock();
    }
    normalize(t);
    prevTop = t;
  };
  const onClick = (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) { anchorUntil = now() + 1500; release(); }
  };
  const onResize = () => {
    if (!locked) return;
    lockY = Math.round(pageTop());
    scrollToY(lockY);
  };
  const onHidden = () => { if (document.hidden) { touching = false; } };

  // Nicht-passive Listener bremsen das Scrollen der ganzen Seite. Deshalb hängen sie nur, solange die Sektion nah ist.
  function attach() {
    if (listening) return;
    listening = true;
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: false });
    addEventListener('touchend', onTouchEnd, { passive: true });
    addEventListener('touchcancel', onTouchEnd, { passive: true });
    addEventListener('keydown', onKey);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onHidden);
    prevTop = top();
    normalize(prevTop);
  }
  function detach() {
    if (!listening) return;
    listening = false;
    removeEventListener('wheel', onWheel);
    removeEventListener('touchstart', onTouchStart);
    removeEventListener('touchmove', onTouchMove);
    removeEventListener('touchend', onTouchEnd);
    removeEventListener('touchcancel', onTouchEnd);
    removeEventListener('keydown', onKey);
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onResize);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('visibilitychange', onHidden);
    prevTop = null;
  }

  // Weit weg: Listener ab und das Video auf die passende Seite stellen. Wer von unten kommt, sieht das Ende
  // und spult rückwärts; wer von oben kommt, beginnt am Anfang.
  const settle = () => {
    const r = section.getBoundingClientRect();
    if (r.top >= window.innerHeight) jump(0);
    else if (r.bottom <= 0) jump(1);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const near = entries[entries.length - 1].isIntersecting;
      if (near && !failed) attach();
      else if (!near && !locked) { detach(); settle(); }
    }, { rootMargin: '60% 0px' }).observe(section);
  } else attach();

  settle();
  render();
}
