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


/* ---------- Toasts ---------- */
export function Toasts() {
  const { toasts, dismiss, setPanel } = useUI()
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }} transition={spring.snappy}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5} onDragEnd={(_, i) => Math.abs(i.offset.x) > 80 && dismiss(t.id)}>
            <span className="toast-dot" aria-hidden="true" />
            <span className="toast-text">{t.text}</span>
            {t.action && (t.action.href
              ? <Link to={t.action.href} className="toast-action" onClick={() => dismiss(t.id)}>{t.action.label}</Link>
              : <button type="button" className="toast-action" onClick={() => { t.action.run(); dismiss(t.id) }}>{t.action.label}</button>)}
            <button type="button" className="toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><X className="icon" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
