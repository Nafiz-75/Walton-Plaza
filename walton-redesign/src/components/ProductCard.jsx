import { memo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Plus, Check, Eye, Phone } from 'lucide-react'
import { Link } from '../lib/router'
import { money, techLabel } from '../lib/data'
import { useStore, useUI } from '../lib/store'
import { spring } from '../lib/motion'
import { ProductImage, spotlight , PriceTag } from './ui'

export function HeartButton({ p, className = '' }) {
  const { state, toggleWish } = useStore()
  const on = state.wish.includes(p.id)
  const [burst, setBurst] = useState(0)
  return (
    <motion.button type="button" className={'iconbtn heart ' + (on ? 'on ' : '') + className} whileTap={{ scale: 0.85 }}
      aria-pressed={on} aria-label={`${on ? 'Remove from' : 'Save to'} wishlist: ${p.name}`}
      onClick={() => { if (!on) setBurst(b => b + 1); toggleWish(p) }}>
      <motion.span key={on ? 'on' : 'off'} initial={{ scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={spring.bouncy} className="heart-glyph">
        <Heart className="icon" fill={on ? 'currentColor' : 'none'} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && on && (
          <motion.span key={burst} className="burst" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <motion.i key={i} initial={{ x: 0, y: 0, scale: 1 }} animate={{ x: Math.cos(i / 8 * Math.PI * 2) * 22, y: Math.sin(i / 8 * Math.PI * 2) * 22, scale: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function AddButton({ p, qty = 1, className = 'btn small', label = 'Add' }) {
  const { addToCart } = useStore()
  const [done, setDone] = useState(false)
  const t = useRef()
  useEffect(() => () => clearTimeout(t.current), [])
  if (!p.price) return <a className={className + ' ghost'} href="tel:16267"><Phone className="icon" /> Enquire</a>
  // Tactile key adapted from 21st.dev "Add to Cart Button" (bidyut10): raised -> sinks on press ->
  // settles green. No fake loading delay: adding to the bag is instant here.
  return (
    <button type="button" className={className + ' addbtn' + (done ? ' done' : '')} data-phase={done ? 'added' : 'idle'} aria-label={`${label}: ${p.name}`}
      onClick={e => { addToCart(p, qty, e.currentTarget); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1800) }}>
      <span className="add-stack" aria-hidden="true">
        <span className="s-idle"><Plus className="icon" />{label}</span>
        <span className="s-done"><Check className="icon i-done" />Added</span>
      </span>
    </button>
  )
}

export function CompareToggle({ p, children = 'Compare' }) {
  const { state, toggleCompare } = useStore()
  const on = state.compare.includes(p.id)
  return (
    <label className={'compare-toggle' + (on ? ' on' : '')}>
      <input type="checkbox" checked={on} onChange={() => toggleCompare(p)} />
      <span className="box" aria-hidden="true"><motion.svg viewBox="0 0 16 16" initial={false} animate={{ opacity: on ? 1 : 0 }}><motion.path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 0.25 }} /></motion.svg></span>
      {children}
    </label>
  )
}

function ProductCard({ p, index = 0, layout = false }) {
  const { setQuick } = useUI()
  return (
    <motion.article className="card" data-card layout={layout ? 'position' : false}
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.05, layout: spring.layout }}
      {...spotlight}>
      <div className="card-top">
        <span className={'tag' + (p.isNew ? ' new' : '')}>{p.isNew ? 'New arrival' : p.sub || p.category}</span>
        <HeartButton p={p} />
      </div>
      <div className="card-media">
        <Link to={`#/product/${p.id}`} className="card-stage" aria-label={p.name} tabIndex={-1}>
          <motion.div layoutId={`img-${p.id}`} className="card-img" transition={spring.layout}><ProductImage p={p} /></motion.div>
        </Link>
        <button type="button" className="quick" onClick={() => setQuick(p.id)} aria-label={`Quick view: ${p.name}`}><Eye className="icon" /> Quick view</button>
      </div>
      <div className="card-body">
        <span className="eyebrow sm">{p.category}</span>
        <h3><Link to={`#/product/${p.id}`}>{p.name}</Link></h3>
        <p className="card-meta">{techLabel(p)}</p>
        <div className="card-price">
          <span className="price tnum">{money(p.price)}</span>
          {p.price ? <span className="tiny muted">Listed price</span> : <span className="tiny muted">Call 16267</span>}
        </div>
        <div className="card-actions">
          <CompareToggle p={p} />
          <AddButton p={p} />
        </div>
      </div>
    </motion.article>
  )
}
export default memo(ProductCard)
