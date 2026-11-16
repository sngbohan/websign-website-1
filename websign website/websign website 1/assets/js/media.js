// Websign · Inline-Video
// <div class="media">
//   <video data-video muted playsinline loop preload="none" poster="…-960.avif" width="1920" height="1200" data-reset-on-exit>
//     <source data-src-s="…-960.webm" data-src-l="…-1920.webm" type="video/webm; codecs=av01.0.05M.08">
//     <source data-src-s="…-960.mp4"  data-src-l="…-1920.mp4"  type="video/mp4">
//   </video>
// </div>
// · Die Quellen stehen in data-src-s / data-src-l (oder data-src) und werden erst gesetzt, wenn das Video näher als
//   einen Viewport ist. Davor lädt nur das Poster.
// · Abspielen ab 50 % Sichtbarkeit, Pause beim Verlassen, mit data-reset-on-exit zurück auf Anfang.
// · Jedes Video, das länger als 5 Sekunden läuft (oder in Schleife), bekommt einen sichtbaren Pause-Knopf (WCAG 2.2.2).
//   Wer pausiert, bleibt pausiert: Das Video startet dann nicht von selbst neu.
// · Bei reduzierter Bewegung wird nichts geladen und nichts abgespielt. Es bleibt beim Poster.

const SVG_NS = 'http://www.w3.org/2000/svg';
const LABEL = { playing: 'Video pausieren', paused: 'Video abspielen' };

function icon(cls, d) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', cls);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

function setup(video, small) {
  if (video.__media) return;
  video.__media = true;
  video.muted = true; video.playsInline = true;
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const wrap = video.closest('.media') || video.parentElement;
  const state = { loaded: false, userPaused: false, visible: false };

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'media__toggle'; btn.hidden = true;
  btn.append(icon('media__pause', 'M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z'), icon('media__play', 'M4.5 2.3v11.4L13.5 8z'));
  const sync = () => { const s = video.paused ? 'paused' : 'playing'; btn.dataset.state = s; btn.setAttribute('aria-label', LABEL[s]); };
  const needsButton = () => { if (video.loop || !(video.duration <= 5)) btn.hidden = false; };
  wrap.append(btn);
  sync();

  const load = () => {
    if (state.loaded) return;
    state.loaded = true;
    const key = small.matches ? 'srcS' : 'srcL';
    const pick = (el) => el.dataset[key] || el.dataset.src || el.dataset.srcL || el.dataset.srcS;
    for (const s of video.querySelectorAll('source')) { const src = pick(s); if (src) s.src = src; }
    const own = pick(video);
    if (own) video.src = own;
    video.load();
  };
  const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };

  video.addEventListener('loadedmetadata', needsButton);
  video.addEventListener('durationchange', needsButton);
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  btn.addEventListener('click', () => {
    if (video.paused) { state.userPaused = false; play(); } else { state.userPaused = true; video.pause(); }
  });

  if (!('IntersectionObserver' in window)) { load(); btn.hidden = false; return; }
  const near = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { load(); near.disconnect(); }
  }, { rootMargin: '100% 0px' });
  near.observe(video);
  new IntersectionObserver((entries) => {
    for (const en of entries) {
      state.visible = en.intersectionRatio >= 0.5;
      if (state.visible) { load(); if (!state.userPaused) play(); }
      else if (!video.paused || video.currentTime > 0) {
        video.pause();
        if ('resetOnExit' in video.dataset) { try { video.currentTime = 0; } catch (err) { /* noch keine Daten */ } }
      }
    }
  }, { threshold: [0, 0.5] }).observe(video);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (state.visible && !state.userPaused) play();
  });
}

export function initMedia(root = document) {
  const small = matchMedia('(max-width: 734px)');
  root.querySelectorAll('video[data-video]').forEach((v) => setup(v, small));
}
