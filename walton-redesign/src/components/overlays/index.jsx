import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Search, ArrowRight, ShoppingBag, Minus, Plus, Trash2, CornerDownLeft, Clock, LayoutGrid, Columns2, SlidersHorizontal, Wallet, Headphones, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link, navigate, useRoute } from '../../lib/router'
import { CATEGORIES, COUNT, P, money, pick, search, slug, highlights, techLabel, PRODUCTS } from '../../lib/data'
import { useStore, useUI } from '../../lib/store'
import { lockScroll } from '../../lib/smooth'
import { spring, ease } from '../../lib/motion'
import { AnimatedNumber, Brand, ProductImage, ThemeSwitch } from '../ui'
import { AddButton, CompareToggle, HeartButton } from '../ProductCard'
import { CartDrawer } from './CartDrawer'
import { CommandSearch } from './CommandSearch'
import { CompareTray } from './CompareTray'
import { FlyLayer } from './FlyLayer'
import { MenuSheet } from './MenuSheet'
import { QuickView } from './QuickView'
import { Scrim } from './shared'
import { Toasts } from './Toasts'

export function Overlays() {
  const { panel, setPanel, quick, setQuick } = useUI()
  // Close popups when the PAGE changes — not when filters/sort update the query string in place.
  const { path } = useRoute()
  useEffect(() => { setPanel(null); setQuick(null) }, [path]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = e => {
      // only text entry counts as typing (a ticked checkbox or a slider must not block the / shortcut)
      const a = document.activeElement
      const typing = !!a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable || (a.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset'].includes(a.type)))
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); setPanel('search') }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [setPanel])
  const close = () => setPanel(null)
  return (
    <>
      <AnimatePresence>
        {(panel || quick) && <Scrim key="scrim" onClick={() => { close(); setQuick(null) }} />}
        {panel === 'search' && <div key="s" className="cmdk-wrap" onClick={e => e.target === e.currentTarget && close()}><CommandSearch onClose={close} /></div>}
        {panel === 'cart' && <CartDrawer key="c" onClose={close} />}
        {panel === 'menu' && <MenuSheet key="m" onClose={close} />}
        {quick && <QuickView key={'q' + quick} id={quick} onClose={() => setQuick(null)} />}
      </AnimatePresence>
      <CompareTray />
      <Toasts />
      <FlyLayer />
    </>
  )
}
export default Overlays
