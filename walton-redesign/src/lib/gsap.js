import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export { gsap, ScrollTrigger }

/** Scoped GSAP effects for a component. `setup(gsap, root)` only runs when motion is allowed; everything is reverted on unmount. */
export function useGsap(ref, setup, deps = []) {
  useLayoutEffect(() => {
    if (!ref.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => { setup(gsap, ref.current) })
    return () => mm.revert()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
