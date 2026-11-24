import { useSyncExternalStore } from 'react'

// Minimal hash router — keeps URLs deep-linkable and the site openable from disk.
const subscribe = cb => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
const getHash = () => location.hash || '#/'

export function parse(hash) {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, qs = ''] = raw.split('?')
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent)
  return { hash, route: parts[0] || 'home', parts, query: new URLSearchParams(qs), path: '/' + pathPart }
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parse(hash)
}

// Scroll memory: forward navigation goes to top, back/forward restores position.
const positions = new Map()
let pushed = false
export function navigate(h) {
  positions.set(getHash(), window.scrollY)
  pushed = true
  if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else location.hash = h
}
export function consumeNavIntent() { const p = pushed; pushed = false; return p }
export const savedScroll = h => positions.get(h)
window.addEventListener('scroll', () => { if (!pushed) positions.set(getHash(), window.scrollY) }, { passive: true })

export function Link({ to, onClick, children, ...rest }) {
  return (
    <a href={to} onClick={e => {
      onClick?.(e)
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault(); navigate(to)
    }} {...rest}>{children}</a>
  )
}
