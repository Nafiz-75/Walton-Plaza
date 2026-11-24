// Shared motion tokens — one rhythm for the whole site.
export const ease = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1], in: [0.55, 0, 1, 0.45] }
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 },
  soft: { type: 'spring', stiffness: 260, damping: 30 },
  bouncy: { type: 'spring', stiffness: 420, damping: 18 },
  layout: { type: 'spring', stiffness: 380, damping: 36 },
}
export const dur = { fast: 0.16, base: 0.32, slow: 0.6 }

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ease.out } },
}
export const stagger = (each = 0.05, delay = 0) => ({ hidden: {}, show: { transition: { staggerChildren: each, delayChildren: delay } } })
export const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '0px 0px -12% 0px' } }

export const page = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: ease.out } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: ease.in } },
}
