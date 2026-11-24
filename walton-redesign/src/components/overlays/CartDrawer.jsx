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
import { Drawer } from './shared'
import { Stepper } from './Stepper'

export function CartDrawer({ onClose }) {
  const { cartEntries, subtotal, cartCount, dispatch, removeFromCart } = useStore()
  return (
    <Drawer onClose={onClose} label="Shopping bag">
      <div className="drawer-head">
        <div><span className="eyebrow">Your bag</span><h2>{cartCount ? <><AnimatedNumber value={cartCount} /> {cartCount === 1 ? 'item' : 'items'}</> : 'Nothing here yet'}</h2></div>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Close bag"><X className="icon" /></button>
      </div>
      <div className="drawer-body" data-lenis-prevent>
        {!cartEntries.length ? (
          <div className="drawer-empty">
            <motion.div className="empty-icon" initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy}><ShoppingBag /></motion.div>
            <p>A little room for something good. Explore the collection and add your favourites.</p>
            <Link className="btn" to="#/shop" onClick={onClose}>Explore products <ArrowRight className="icon arrow" /></Link>
          </div>
        ) : (
          <ul className="mini-cart">
            <AnimatePresence initial={false}>
              {cartEntries.map(({ p, qty }) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.25 } }} transition={spring.layout}>
                  <Link to={`#/product/${p.id}`} onClick={onClose} className="mini-thumb"><ProductImage p={p} /></Link>
                  <div className="mini-info">
                    <Link to={`#/product/${p.id}`} onClick={onClose}><b>{p.name}</b></Link>
                    <small>{p.sub}</small>
                    <div className="row between">
                      <Stepper value={qty} onChange={v => dispatch({ type: 'setQty', id: p.id, qty: v })} label={p.name} />
                      <span className="price sm tnum"><AnimatedNumber value={p.price * qty} format={v => money(v)} /></span>
                    </div>
                  </div>
                  <button type="button" className="iconbtn sm" onClick={() => removeFromCart(p)} aria-label={`Remove ${p.name}`}><Trash2 className="icon" /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      {cartEntries.length > 0 && (
        <div className="drawer-foot">
          <div className="row between"><span>Product subtotal</span><b className="price sm"><AnimatedNumber value={subtotal} format={v => money(v)} /></b></div>
          <p className="tiny muted">Delivery and installation confirmed by your Plaza. Interactive preview — no payment is taken.</p>
          <div className="row gap">
            <Link className="btn outline grow" to="#/cart" onClick={onClose}>View bag</Link>
            <Link className="btn grow" to="#/checkout" onClick={onClose}>Checkout <ArrowRight className="icon arrow" /></Link>
          </div>
        </div>
      )}
    </Drawer>
  )
}
