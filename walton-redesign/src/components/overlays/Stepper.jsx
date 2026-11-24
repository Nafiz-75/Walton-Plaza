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


export function Stepper({ value, onChange, label = '' }) {
  return (
    <div className="stepper-ctl" role="group" aria-label={`Quantity ${label}`}>
      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={`Reduce quantity ${label}`}><Minus className="icon" /></motion.button>
      <span className="tnum" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={spring.snappy} style={{ display: 'inline-block' }}>{value}</motion.span>
        </AnimatePresence>
      </span>
      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => onChange(value + 1)} disabled={value >= 99} aria-label={`Increase quantity ${label}`}><Plus className="icon" /></motion.button>
    </div>
  )
}
