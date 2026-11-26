"use client"

// Websign · Scroll-gesperrtes Video (nach „scroll-locked-video-hero“ von 21st.dev, Guglielmo Giannattasio).
// Die Seite nutzt derzeit die gleichwertige Fassung ohne React: assets/js/video-scrub.js (kein Build nötig).
// Diese Komponente ist für den Fall gedacht, dass die Szene später als React-Insel gebaut wird (src/ + npm run build).
// Sie rendert dasselbe Markup mit denselben Klassen wie index.html, die Gestaltung kommt aus assets/css/site.css (.vscrub).
//
// Änderungen gegenüber dem Original:
// · Die Seite wird nicht dauerhaft gesperrt, sondern nur, solange die Sektion den Bildschirm füllt. Am Ende geht es
//   weiter, am Anfang zurück; von unten kommend rastet sie wieder ein.
// · Kein position:fixed am Body (verschiebt sonst alle anderen Scroll-Effekte), nur preventDefault.
// · Tastatur (Pfeile, Bild auf/ab, Leertaste) spult mit; Tab, Pos1, Ende, Bildlaufleiste und Anker-Links geben frei.
// · Video und Schrift kommen von der eigenen Adresse, keine Systemschriften, kein Link zum Autor.

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

export interface ScrollLockedVideoHeroProps {
  videoSrc: string
  /** Standbild ohne JavaScript, bei reduzierter Bewegung oder wenn das Video nicht lädt */
  poster?: string
  title?: string
  tagline?: string
  scrollHint?: string
  /** Weg (px Mausrad/Touch), um das ganze Video zu spulen */
  scrubDistance?: number
  onTrack?: (state: "start" | "ende") => void
  className?: string
  style?: CSSProperties
}

const INTRO = 0.05
const OUTRO = 0.07
const PUSH = 160
const GRACE = 600
const KEYS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 2, PageUp: -2, " ": 2 }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (x: number) => x * x * (3 - 2 * x)

export default function ScrollLockedVideoHero({
  videoSrc,
  poster,
  title = "So könnte deine Website aussehen.",
  tagline = "Vom ersten Satz bis zum Launch.",
  scrollHint = "Scrollen",
  scrubDistance = 3600,
  onTrack,
  className,
  style,
}: ScrollLockedVideoHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const trackRef = useRef(onTrack)
  trackRef.current = onTrack
  const [live, setLive] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    setLive(true)

    let duration = 0, isReady = false, failed = false
    let target = 0, current = 0, raf = 0
    let locked = false, lockY = 0, lockedAt = 0, push = 0
    let touchY = 0, touching = false, lastGesture = -Infinity, anchorUntil = 0
    let prevTop: number | null = null
    let seeking = false, pendingTime: number | null = null, lastSeek = -1
    let listening = false, finished = false
    const now = () => performance.now()
    const track = (s: "start" | "ende") => trackRef.current?.(s)

    const timeFor = (p: number) => clamp((p - INTRO) / (1 - INTRO - OUTRO), 0, 1) * Math.max(0, duration - 0.05)
    function seekTo(t: number) {
      if (!isReady || Math.abs(t - lastSeek) < 0.004) return
      if (seeking) { pendingTime = t; return }
      seeking = true; lastSeek = t
      video!.currentTime = t
    }
    const onSeeked = () => {
      seeking = false
      if (pendingTime !== null) { const t = pendingTime; pendingTime = null; seekTo(t) }
    }
    const onReady = () => {
      if (isReady || !(video.duration > 0)) return
      duration = video.duration; isReady = true
      setReady(true)
      seekTo(timeFor(current))
    }
    const onError = () => {
      failed = true; release(); detach()
      cancelAnimationFrame(raf); raf = 0
      setLive(false); setReady(false)
      for (const el of [titleRef.current, taglineRef.current, veilRef.current, video]) el?.removeAttribute("style")
    }
    video.addEventListener("loadeddata", onReady)
    video.addEventListener("loadedmetadata", onReady)
    video.addEventListener("seeked", onSeeked)
    video.addEventListener("error", onError, true)
    video.preload = "auto"
    // Einmal komplett als Blob laden: spulbar auch ohne Range-Anfragen des Servers, rückwärts ohne Nachladen.
    let blobUrl: string | null = null
    let alive = true
    const useSrc = (src: string) => {
      if (!alive) return
      video.src = src
      video.load()
      // iOS lädt oft nichts, solange nichts abgespielt wurde: stumm anspielen und sofort anhalten.
      const p = video.play()
      if (p && p.then) p.then(() => { video.pause(); seekTo(timeFor(current)) }).catch(() => {})
    }
    fetch(videoSrc)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b) => { blobUrl = URL.createObjectURL(b); useSrc(blobUrl) })
      .catch(() => useSrc(videoSrc))

    function render() {
      if (failed) return
      seekTo(timeFor(current))
      const ti = smooth(1 - clamp(current / INTRO, 0, 1))
      const t = titleRef.current
      if (t) {
        t.style.opacity = ti.toFixed(3)
        t.style.transform = `translateY(${((1 - ti) * -24).toFixed(1)}px) scale(${(0.96 + ti * 0.04).toFixed(4)})`
        t.style.filter = ti > 0.999 ? "" : `blur(${((1 - ti) * 10).toFixed(2)}px)`
      }
      const to = smooth(clamp((current - (1 - OUTRO)) / OUTRO, 0, 1))
      if (veilRef.current) veilRef.current.style.opacity = Math.max(ti, to * 0.6).toFixed(3)
      const g = taglineRef.current
      if (g) {
        g.style.opacity = to.toFixed(3)
        g.style.transform = `translateY(${((1 - to) * 20).toFixed(1)}px) scale(${(0.97 + to * 0.03).toFixed(4)})`
        g.style.filter = to > 0.999 ? "" : `blur(${((1 - to) * 8).toFixed(2)}px)`
      }
      hintRef.current?.classList.toggle("is-gone", target > 0.002 || current > 0.002)
      if (barRef.current) barRef.current.style.transform = `scaleX(${current.toFixed(4)})`
      video!.style.transform = `scale(${(1 + current * 0.04).toFixed(4)})`
      if (current >= 1 && !finished) { finished = true; track("ende") }
    }
    function frame() {
      raf = 0
      current += (target - current) * 0.18
      if (Math.abs(target - current) < 0.0004) current = target
      render()
      if (current !== target) raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const jump = (v: number) => { target = current = v; push = 0; render() }

    const top = () => section.getBoundingClientRect().top
    const pageTop = () => top() + window.scrollY
    const scrollToY = (y: number) => window.scrollTo({ top: y, left: window.scrollX, behavior: "instant" as ScrollBehavior })

    function lock() {
      if (locked || failed || !isReady) return
      locked = true; lockedAt = now(); push = 0
      lockY = Math.round(pageTop())
      scrollToY(lockY)
      section!.classList.add("is-locked")
      if (target === 0) track("start")
    }
    function release() {
      if (!locked) return
      locked = false; push = 0
      section!.classList.remove("is-locked")
    }
    function shouldLock(dy: number) {
      if (!isReady || failed || locked) return false
      const t = top(), vh = window.innerHeight
      if (dy > 0 && target < 1) return t > 0 ? t - dy <= 0 : t > -vh * 0.5
      if (dy < 0 && target > 0) return t < 0 ? t - dy >= 0 : t < vh * 0.5
      return false
    }
    function wantsRelease(dy: number) {
      const atEnd = dy > 0 && target >= 1 && current > 0.995
      const atStart = dy < 0 && target <= 0 && current < 0.005
      if (!atEnd && !atStart) { push = 0; return false }
      push += Math.abs(dy)
      return push > PUSH
    }
    function scrub(dy: number) {
      target = clamp(target + dy / scrubDistance, 0, 1)
      kick()
    }
    // Spulstand passend zur Lage, solange nichts eingerastet ist (nach Anker-Sprung oder Bildlaufleiste)
    function normalize(t = top()) {
      if (locked || failed) return
      if (t > 2 && target > 0) jump(0)
      else if (t < -window.innerHeight * 0.25 && target < 1) jump(1)
    }
    function input(dy: number) {
      lastGesture = now()
      // Menü oder Modal offen (<dialog>): deren Inhalt soll scrollen, nicht das Video
      if (document.querySelector("dialog[open]")) { release(); return false }
      if (!dy) return locked
      normalize()
      if (!locked) {
        if (!shouldLock(dy)) return false
        lock()
        return true
      }
      if (wantsRelease(dy)) { release(); return false }
      scrub(dy)
      return true
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return
      const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      if (Math.abs(e.deltaX) > Math.abs(dy) && !locked) return
      if (input(dy) && e.cancelable) e.preventDefault()
    }
    const onTouchStart = (e: TouchEvent) => { if (e.touches.length === 1) { touchY = e.touches[0].clientY; touching = true } }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const y = e.touches[0].clientY, dy = (touchY - y) * 1.6
      touchY = y
      if (input(dy) && e.cancelable) e.preventDefault()
    }
    const onTouchEnd = () => { touching = false; lastGesture = now() }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|VIDEO|AUDIO)$/.test(el.tagName))) return
      if (document.querySelector("dialog[open]")) { release(); return }
      if (locked && (e.key === "Home" || e.key === "End" || e.key === "Tab")) { release(); return }
      let step = KEYS[e.key]
      if (!step) return
      if (e.key === " " && e.shiftKey) step = -2
      const dy = Math.abs(step) === 2 ? Math.sign(step) * window.innerHeight * 0.8 : step * 100
      lastGesture = now()
      if (!locked) { normalize(); return }
      if (wantsRelease(dy)) { release(); return }
      e.preventDefault()
      scrub(dy)
    }
    const onScroll = () => {
      const t = top()
      if (locked) {
        if (Math.abs(window.scrollY - lockY) > 1) {
          if (touching || now() - lockedAt < GRACE) scrollToY(lockY); else release()
        }
        prevTop = t
        return
      }
      const byUser = now() - lastGesture < 1200 && now() > anchorUntil
      if (prevTop !== null && byUser && isReady && !failed) {
        if (prevTop > 0 && t <= 0 && target < 1) lock()
        else if (prevTop < 0 && t >= 0 && target > 0) lock()
      }
      normalize(t)
      prevTop = t
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
      if (a) { anchorUntil = now() + 1500; release() }
    }
    const onResize = () => {
      if (!locked) return
      lockY = Math.round(pageTop())
      scrollToY(lockY)
    }
    const onHidden = () => { if (document.hidden) touching = false }

    function attach() {
      if (listening) return
      listening = true
      window.addEventListener("wheel", onWheel, { passive: false })
      window.addEventListener("touchstart", onTouchStart, { passive: true })
      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", onTouchEnd, { passive: true })
      window.addEventListener("touchcancel", onTouchEnd, { passive: true })
      window.addEventListener("keydown", onKey)
      window.addEventListener("scroll", onScroll, { passive: true })
      window.addEventListener("resize", onResize)
      document.addEventListener("click", onClick, true)
      document.addEventListener("visibilitychange", onHidden)
      prevTop = top()
      normalize(prevTop)
    }
    function detach() {
      if (!listening) return
      listening = false
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("visibilitychange", onHidden)
      prevTop = null
    }
    const settle = () => {
      const r = section.getBoundingClientRect()
      if (r.top >= window.innerHeight) jump(0)
      else if (r.bottom <= 0) jump(1)
    }
    let io: IntersectionObserver | null = null
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        const near = entries[entries.length - 1].isIntersecting
        if (near && !failed) attach()
        else if (!near && !locked) { detach(); settle() }
      }, { rootMargin: "60% 0px" })
      io.observe(section)
    } else attach()
    settle()
    render()

    return () => {
      alive = false
      io?.disconnect()
      detach()
      release()
      cancelAnimationFrame(raf)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      video.removeEventListener("loadeddata", onReady)
      video.removeEventListener("loadedmetadata", onReady)
      video.removeEventListener("seeked", onSeeked)
      video.removeEventListener("error", onError, true)
    }
  }, [videoSrc, scrubDistance])

  const cls = ["vscrub", live && "vscrub--live", live && ready && "is-ready", className].filter(Boolean).join(" ")
  return (
    <section ref={sectionRef} className={cls} style={style} data-theme="dark" aria-label={title}>
      <div className="vscrub__stage">
        <video ref={videoRef} poster={poster} width={1920} height={1080} muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />
      </div>
      <div ref={veilRef} className="vscrub__veil" aria-hidden="true" />
      <div ref={titleRef} className="vscrub__title">
        <h2 className="t-headline-xl">{title}</h2>
      </div>
      {tagline && (
        <div ref={taglineRef} className="vscrub__tagline" aria-hidden="true">
          <p className="t-subhead">{tagline}</p>
        </div>
      )}
      <div ref={hintRef} className="vscrub__hint" aria-hidden="true">
        <span>{scrollHint}</span>
        <svg viewBox="0 0 14 18" width="14" height="18"><path d="M7 1v16M2 12l5 5 5-5" /></svg>
      </div>
      <div className="vscrub__bar" aria-hidden="true"><i ref={barRef} /></div>
    </section>
  )
}
