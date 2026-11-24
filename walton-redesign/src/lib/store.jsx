import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { P } from './data'

const KEY = 'walton-plaza-v2'
const initial = { cart: {}, wish: [], compare: [], recent: [], theme: 'system', recentSearches: [] }

function load() {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v2) return { ...initial, ...v2 }
    const v1 = JSON.parse(localStorage.getItem('walton-concept-v1') || 'null') // carry over the old prototype's shortlist
    if (v1) return { ...initial, cart: v1.cart || {}, wish: v1.wish || [], compare: v1.compare || [] }
  } catch { /* storage unavailable */ }
  return initial
}

function reducer(s, a) {
  switch (a.type) {
    case 'add': return { ...s, cart: { ...s.cart, [a.id]: Math.min(99, (s.cart[a.id] || 0) + (a.qty || 1)) } }
    case 'setQty': return { ...s, cart: { ...s.cart, [a.id]: Math.max(1, Math.min(99, a.qty)) } }
    case 'remove': { const c = { ...s.cart }; delete c[a.id]; return { ...s, cart: c } }
    case 'restore': return { ...s, cart: { ...s.cart, [a.id]: a.qty } }
    case 'clearCart': return { ...s, cart: {} }
    case 'wish': return { ...s, wish: s.wish.includes(a.id) ? s.wish.filter(x => x !== a.id) : [a.id, ...s.wish] }
    case 'compare': return { ...s, compare: s.compare.includes(a.id) ? s.compare.filter(x => x !== a.id) : s.compare.length >= 3 ? s.compare : [...s.compare, a.id] }
    case 'clearCompare': return { ...s, compare: [] }
    case 'viewed': return { ...s, recent: [a.id, ...s.recent.filter(x => x !== a.id)].slice(0, 12) }
    case 'theme': return { ...s, theme: a.theme }
    case 'searched': return a.q ? { ...s, recentSearches: [a.q, ...s.recentSearches.filter(x => x.toLowerCase() !== a.q.toLowerCase())].slice(0, 5) } : s
    case 'clearAll': return { ...initial, theme: s.theme }
    default: return s
  }
}

const Store = createContext(null)
const UI = createContext(null)

export function Providers({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }, [state])

  // theme
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark = state.theme === 'dark' || (state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      root.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [state.theme])

  // UI layer
  const [toasts, setToasts] = useState([])
  const [panel, setPanel] = useState(null) // 'cart' | 'search' | 'menu' | null
  const [quick, setQuick] = useState(null)
  const [flights, setFlights] = useState([])
  const tid = useRef(0)

  const toast = useCallback((text, action) => {
    const id = ++tid.current
    setToasts(t => [...t.slice(-2), { id, text, action }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200)
  }, [])
  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])
  const fly = useCallback((src, rect) => {
    const id = ++tid.current
    setFlights(f => [...f, { id, src, rect }])
    setTimeout(() => setFlights(f => f.filter(x => x.id !== id)), 900)
  }, [])

  const ui = useMemo(() => ({ toasts, toast, dismiss, panel, setPanel, quick, setQuick, flights, fly }), [toasts, toast, dismiss, panel, quick, flights, fly])
  const store = useMemo(() => ({ state, dispatch }), [state])
  return <Store.Provider value={store}><UI.Provider value={ui}>{children}</UI.Provider></Store.Provider>
}

export const useUI = () => useContext(UI)
export function useStore() {
  const { state, dispatch } = useContext(Store)
  const ui = useContext(UI)
  return useMemo(() => {
    const cartCount = Object.values(state.cart).reduce((a, b) => a + b, 0)
    const cartEntries = Object.entries(state.cart).filter(([id]) => P(id)).map(([id, qty]) => ({ p: P(id), qty }))
    const subtotal = cartEntries.reduce((s, { p, qty }) => s + (p.price || 0) * qty, 0)
    return {
      state, dispatch, cartCount, cartEntries, subtotal,
      addToCart(p, qty = 1, sourceEl) {
        if (!p.price) return
        dispatch({ type: 'add', id: p.id, qty })
        const img = sourceEl?.closest('[data-card], .quickview')?.querySelector('img') || sourceEl?.ownerDocument.querySelector('[data-pdp-img]')
        if (img && !matchMedia('(prefers-reduced-motion: reduce)').matches) ui.fly(img.currentSrc || img.src, img.getBoundingClientRect())
        ui.toast(`${qty > 1 ? qty + ' × ' : ''}${p.name} added to your bag.`, { label: 'View bag', run: () => ui.setPanel('cart') })
      },
      removeFromCart(p) {
        const qty = state.cart[p.id]
        dispatch({ type: 'remove', id: p.id })
        ui.toast(`Removed ${p.name}.`, { label: 'Undo', run: () => dispatch({ type: 'restore', id: p.id, qty }) })
      },
      toggleWish(p) {
        const on = !state.wish.includes(p.id)
        dispatch({ type: 'wish', id: p.id })
        ui.toast(on ? 'Saved to your wishlist.' : 'Removed from your wishlist.', on ? { label: 'View', href: '#/wishlist' } : undefined)
      },
      toggleCompare(p) {
        if (!state.compare.includes(p.id) && state.compare.length >= 3) { ui.toast('You can compare up to 3 products. Remove one to add another.', { label: 'Compare', href: '#/compare' }); return }
        dispatch({ type: 'compare', id: p.id })
      },
    }
  }, [state, dispatch, ui])
}
