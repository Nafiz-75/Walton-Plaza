import Lenis from 'lenis'
import { ScrollTrigger } from './gsap'

// Inertial wheel scrolling on desktop only. Touch keeps native momentum; reduced motion keeps native scroll.
let lenis = null
let locks = 0
export function initSmooth() {
  if (lenis || matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return
  lenis = new Lenis({ duration: 1.05, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true, syncTouch: false })
  lenis.on('scroll', ScrollTrigger.update) // keep GSAP scroll effects in step with smooth scrolling
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
}
export function scrollTo(y, immediate = true) {
  if (lenis) lenis.scrollTo(y, { immediate, force: true })
  else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
}
export function lockScroll(on) {
  locks = Math.max(0, locks + (on ? 1 : -1))
  const locked = locks > 0
  document.documentElement.classList.toggle('scroll-locked', locked)
  if (lenis) locked ? lenis.stop() : lenis.start()
}
