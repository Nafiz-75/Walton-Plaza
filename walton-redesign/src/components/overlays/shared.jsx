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


/* ---------- shared: focus + scroll management for any overlay ---------- */
export function useOverlay(open, onClose, ref) {
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    lockScroll(true)
    const t = setTimeout(() => (ref.current?.querySelector('[data-autofocus]') || ref.current?.querySelector('button, a, input'))?.focus(), 40)
    const key = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && ref.current) { // simple focus trap
        const f = [...ref.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null)
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { clearTimeout(t); lockScroll(false); document.removeEventListener('keydown', key); prev?.focus?.({ preventScroll: true }) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
}

export const Scrim = ({ onClick }) => <motion.div className="scrim" onClick={onClick} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} />

/* ---------- Drawer primitive (right on desktop, bottom sheet on mobile) ---------- */
export function Drawer({ onClose, label, children, side = 'right', className = '' }) {
  const ref = useRef(null)
  const controls = useDragControls()
  useOverlay(true, onClose, ref)
  const mobile = typeof window !== 'undefined' && matchMedia('(max-width: 760px)').matches
  const from = side === 'left' ? { x: '-100%' } : mobile ? { y: '100%' } : { x: '100%' }
  return (
    <motion.aside ref={ref} className={`drawer ${side} ${className}`} role="dialog" aria-modal="true" aria-label={label}
      initial={from} animate={{ x: 0, y: 0 }} exit={{ ...from, transition: { duration: 0.24, ease: ease.in } }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}
      drag={mobile && side !== 'left' ? 'y' : false} dragListener={false} dragControls={controls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose() }}>
      {mobile && side !== 'left' && <div className="drag-zone" onPointerDown={e => controls.start(e)}><div className="grabber" aria-hidden="true" /></div>}
      {children}
    </motion.aside>
  )
}

/* ---------- Command search ---------- */
export const PAGES = [['Product finder', '#/finder', SlidersHorizontal], ['Compare products', '#/compare', Columns2], ['Payment planner', '#/finance', Wallet], ['Help & support', '#/support', Headphones]]

export const POPULAR = ['Inverter refrigerator', '4K Google TV', 'Inverter AC', 'Front load', 'Air fryer', 'BLDC fan']
