import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, ShoppingBag, Trash2, ShieldCheck, Truck, Lock, MapPin, Check } from 'lucide-react'
import { Link } from '../lib/router'
import { money } from '../lib/data'
import { useStore } from '../lib/store'
import { scrollTo } from '../lib/smooth'
import { spring, ease } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, PageHead, ProductImage } from '../components/ui'
import { Stepper } from '../components/overlays/Stepper'


export function Summary({ title = 'Your summary', children }) {
  const { cartEntries, subtotal, cartCount } = useStore()
  return (
    <aside className="summary">
      <h2 className="h3">{title}</h2>
      <ul className="sum-lines">
        {cartEntries.map(({ p, qty }) => <li key={p.id}><span>{p.name} <small>× {qty}</small></span><b className="tnum">{money(p.price * qty)}</b></li>)}
      </ul>
      <div className="row between"><span>Products ({cartCount})</span><b className="tnum"><AnimatedNumber value={subtotal} format={v => money(v)} /></b></div>
      <div className="row between muted"><span>Delivery &amp; installation</span><span>To be confirmed</span></div>
      <div className="row between total"><span>Product subtotal</span><span className="tnum"><AnimatedNumber value={subtotal} format={v => money(v)} /></span></div>
      {children}
      <div className="trust"><span><ShieldCheck className="icon" /> Warranty checked by model</span><span><Truck className="icon" /> Delivery confirmed by your Plaza</span></div>
    </aside>
  )
}
