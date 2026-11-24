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
import { Summary } from './Summary'

export function Cart() {
  const { cartEntries, dispatch, removeFromCart } = useStore()
  return (
    <div className="wrap">
      <Breadcrumbs items={[['Shopping bag']]} />
      <PageHead eyebrow="One step closer to home" title="Your shopping" accent="bag." text={cartEntries.length ? 'Review your choices and plan what comes next.' : 'Your next everyday upgrade is waiting.'} />
      {!cartEntries.length ? (
        <div className="pad-b"><Empty icon={ShoppingBag} title="A little room for something good." text="Explore the collection and add your favourites." /></div>
      ) : (
        <div className="cart-layout">
          <div>
            <ul className="cart-list">
              <AnimatePresence initial={false}>
                {cartEntries.map(({ p, qty }) => (
                  <motion.li key={p.id} className="cart-row" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60, transition: { duration: 0.22 } }} transition={spring.layout}>
                    <Link to={`#/product/${p.id}`} className="cart-img"><ProductImage p={p} /></Link>
                    <div className="cart-info">
                      <span className="eyebrow sm">{p.category}</span>
                      <h2 className="h3"><Link to={`#/product/${p.id}`}>{p.name}</Link></h2>
                      <small className="muted">{p.sub} · {money(p.price)} each</small>
                      <div className="row gap">
                        <Stepper value={qty} onChange={v => dispatch({ type: 'setQty', id: p.id, qty: v })} label={p.name} />
                        <button type="button" className="textlink sm danger" onClick={() => removeFromCart(p)}><Trash2 className="icon" /> Remove</button>
                      </div>
                    </div>
                    <div className="price tnum"><AnimatedNumber value={p.price * qty} format={v => money(v)} /></div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <Link className="textlink" to="#/shop"><ArrowLeft className="icon" /> Continue exploring</Link>
          </div>
          <Summary>
            <Link className="btn lg wide" to="#/checkout">Continue to checkout <ArrowRight className="icon arrow" /></Link>
            <p className="tiny muted">Interactive design preview. No payment will be taken and no real order will be placed.</p>
          </Summary>
        </div>
      )}
    </div>
  )
}
