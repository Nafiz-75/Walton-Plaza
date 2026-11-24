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


/* ---------- Compare tray ---------- */
export function CompareTray() {
  const { route } = useRoute()
  const { state, dispatch } = useStore()
  const items = state.compare.map(P).filter(Boolean)
  const show = items.length > 0 && route !== 'compare' && route !== 'checkout'
  return (
    <AnimatePresence>
      {show && (
        <motion.aside className="comparebar" aria-label="Comparison shortlist" initial={{ y: 120, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: 120, x: '-50%', opacity: 0 }} transition={spring.soft}>
          <div className="cb-slots">
            {[0, 1, 2].map(i => (
              <span key={i} className={'cb-slot' + (items[i] ? ' filled' : '')}>
                <AnimatePresence mode="popLayout">{items[i] && <motion.span key={items[i].id} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.bouncy}><ProductImage p={items[i]} /></motion.span>}</AnimatePresence>
              </span>
            ))}
          </div>
          <span className="cb-label"><b>{items.length} of 3</b> <span className="desktop-only">selected to compare</span></span>
          <Link className="btn small light" to="#/compare">Compare <ArrowRight className="icon arrow" /></Link>
          <button type="button" className="iconbtn sm" onClick={() => dispatch({ type: 'clearCompare' })} aria-label="Clear comparison"><X className="icon" /></button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
