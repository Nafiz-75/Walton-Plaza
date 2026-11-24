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
import { Drawer, PAGES } from './shared'

export function MenuSheet({ onClose }) {
  return (
    <Drawer onClose={onClose} label="Menu" side="left" className="menusheet">
      <div className="drawer-head"><Brand /><ThemeSwitch className="menu-switch" /><button type="button" className="iconbtn" onClick={onClose} aria-label="Close menu"><X className="icon" /></button></div>
      <div className="drawer-body" data-lenis-prevent>
        <p className="cmdk-label">Shop by category</p>
        <motion.ul className="menulist" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } } }}>
          {CATEGORIES.map(c => (
            <motion.li key={c} variants={{ h: { opacity: 0, x: -16 }, s: { opacity: 1, x: 0 } }}>
              <Link to={slug(c)} onClick={onClose}><span className="megathumb"><ProductImage p={pick(c)} /></span><span>{c}<small>{COUNT[c]} models</small></span><ChevronRight className="icon chev" /></Link>
            </motion.li>
          ))}
        </motion.ul>
        <p className="cmdk-label">Make it yours</p>
        <div className="cmdk-pages">
          {[...PAGES, ['Your wishlist', '#/wishlist', ArrowUpRight], ['About Walton', '#/about', ArrowUpRight]].map(([l, to, I]) => <Link key={to} to={to} onClick={onClose}><I className="icon" />{l}<ChevronRight className="icon chev" /></Link>)}
        </div>
        <a className="btn outline wide" href="tel:16267" style={{ marginTop: 24 }}>Customer care · 16267</a>
      </div>
    </Drawer>
  )
}
