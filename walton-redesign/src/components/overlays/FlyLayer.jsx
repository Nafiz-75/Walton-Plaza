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


/* ---------- Fly-to-bag ---------- */
export function FlyLayer() {
  const { flights } = useUI()
  return (
    <div className="fly-layer" aria-hidden="true">
      <AnimatePresence>
        {flights.map(f => {
          const target = document.getElementById('cart-target')?.getBoundingClientRect()
          if (!target) return null
          const size = Math.min(f.rect.width, f.rect.height, 180)
          const sx = f.rect.left + f.rect.width / 2 - size / 2, sy = f.rect.top + f.rect.height / 2 - size / 2
          const tx = target.left + target.width / 2 - size / 2, ty = target.top + target.height / 2 - size / 2
          return (
            <motion.img key={f.id} src={f.src} className="fly" style={{ width: size, height: size, left: 0, top: 0 }}
              initial={{ x: sx, y: sy, scale: 1, opacity: 1 }}
              animate={{ x: [sx, (sx + tx) / 2, tx], y: [sy, Math.min(sy, ty) - 80, ty], scale: [1, 0.55, 0.12], opacity: [1, 1, 0.4] }}
              transition={{ duration: 0.75, ease: [0.5, 0, 0.2, 1], times: [0, 0.45, 1] }} exit={{ opacity: 0 }} />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
