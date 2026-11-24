import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Search, ArrowRight, ShoppingBag, Minus, Plus, Trash2, CornerDownLeft, Clock, LayoutGrid, Columns2, SlidersHorizontal, Wallet, Headphones, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link, navigate, useRoute } from '../../lib/router'
import { CATEGORIES, COUNT, P, money, pick, search, slug, highlights, techLabel, PRODUCTS } from '../../lib/data'
import { useStore, useUI } from '../../lib/store'
import { lockScroll } from '../../lib/smooth'
import { spring, ease } from '../../lib/motion'
import { AnimatedNumber, Brand, ProductImage, ThemeSwitch, PriceTag } from '../ui'
import { AddButton, CompareToggle, HeartButton } from '../ProductCard'
import { useOverlay } from './shared'

/* ---------- Quick view (shares the card image via layoutId) ---------- */
export function QuickView({ id, onClose }) {
  const ref = useRef(null)
  const p = P(id)
  useOverlay(true, onClose, ref)
  if (!p) return null
  const hl = highlights(p)
  return (
    <div className="modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div ref={ref} className="quickview" role="dialog" aria-modal="true" aria-label={`Quick view: ${p.name}`}
        initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } }} transition={spring.soft}>
        <button type="button" className="iconbtn close" onClick={onClose} aria-label="Close quick view"><X className="icon" /></button>
        <div className="qv-stage">
          <motion.div layoutId={`img-${p.id}`} className="qv-img" transition={spring.layout}><ProductImage p={p} hd eager /></motion.div>
        </div>
        <div className="qv-copy" data-lenis-prevent>
          <span className="eyebrow">{p.sub || p.category}</span>
          <h2>{p.name}</h2>
          <p className="muted">{techLabel(p)}</p>
          <div className="price lg tnum">{money(p.price)}</div>
          <p className="tiny muted">Manufacturer listed price · confirm Plaza price and availability</p>
          {hl.length > 0 && <ul className="hl-list">{hl.map(([k, v]) => <li key={k}><small>{k}</small><b>{v}</b></li>)}</ul>}
          <div className="row gap wrap-row">
            <AddButton p={p} className="btn" label="Add to bag" />
            <HeartButton p={p} className="outlined" />
            <CompareToggle p={p}>Add to compare</CompareToggle>
          </div>
          <Link className="textlink" to={`#/product/${p.id}`} onClick={onClose}>See full details <ArrowRight className="icon arrow" /></Link>
        </div>
      </motion.div>
    </div>
  )
}
