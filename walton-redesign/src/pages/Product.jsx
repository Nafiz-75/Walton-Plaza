import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BadgeCheck, Truck, Wallet, ChevronDown, ZoomIn, PackageSearch, Share2 } from 'lucide-react'
import { Link } from '../lib/router'
import { P, PRODUCTS, money, slug, highlights, techLabel, CAT_HINT, isInverter } from '../lib/data'
import { useStore, useUI } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, ProductImage, Reveal, SectionHead, Stagger, Item, PriceTag } from '../components/ui'
import ProductCard, { AddButton, CompareToggle, HeartButton } from '../components/ProductCard'
import { Stepper } from '../components/overlays/Stepper'

function Gallery({ p }) {
  const [zoom, setZoom] = useState(false)
  const ox = useMotionValue(50), oy = useMotionValue(50)
  const sx = useSpring(ox, { stiffness: 300, damping: 40 }), sy = useSpring(oy, { stiffness: 300, damping: 40 })
  const originX = useTransform(sx, v => v / 100), originY = useTransform(sy, v => v / 100)
  return (
    <div className="gallery-wrap">
      <motion.div className={'gallery' + (zoom ? ' zooming' : '')}
        onPointerEnter={e => e.pointerType === 'mouse' && setZoom(true)} onPointerLeave={() => { setZoom(false); ox.set(50); oy.set(50) }}
        onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); ox.set(((e.clientX - r.left) / r.width) * 100); oy.set(((e.clientY - r.top) / r.height) * 100) }}>
        <motion.div layoutId={`img-${p.id}`} className="gallery-img" transition={spring.layout}>
          <motion.div animate={{ scale: zoom ? 1.9 : 1 }} transition={{ duration: 0.45, ease: ease.out }} style={{ originX, originY, width: '100%', height: '100%' }}>
            <ProductImage p={p} hd eager data-pdp-img />
          </motion.div>
        </motion.div>
        <span className="gallery-hint"><ZoomIn className="icon" /> {p.hd ? 'High-resolution photo · hover to look closer' : 'Hover to look closer'}</span>
        {p.isNew && <span className="tag new floating">New arrival</span>}
      </motion.div>
    </div>
  )
}

function Details({ p }) {
  const [tab, setTab] = useState('specs')
  const [all, setAll] = useState(false)
  const rows = [['Model', p.name], ['Category', p.category], ['Product type', p.sub], ...p.specs]
  const visible = all ? rows : rows.slice(0, 10)
  const TABS = [['specs', 'Product details'], ['care', 'Care & support'], ['delivery', 'Delivery']]
  return (
    <section className="details">
      <div className="detail-tabs" role="tablist" aria-label="Product information">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="detail-panel" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}{tab === k && <motion.span layoutId="detailline" className="tabline" transition={spring.snappy} />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} id="detail-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="detail-panel"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }} transition={{ duration: 0.3, ease: ease.out }}>
          {tab === 'specs' ? (
            <>
              <table className="specs"><tbody>
                {visible.map(([k, v], i) => <motion.tr key={k + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.015 }}><th scope="row">{k}</th><td>{v}</td></motion.tr>)}
              </tbody></table>
              {rows.length > 10 && (
                <button type="button" className="btn soft small" onClick={() => setAll(a => !a)} aria-expanded={all}>
                  {all ? 'Show fewer specifications' : `Show all ${rows.length} specifications`}
                  <motion.span animate={{ rotate: all ? 180 : 0 }} style={{ display: 'inline-flex' }}><ChevronDown className="icon" /></motion.span>
                </button>
              )}
              {p.specs.length === 0 && <p className="muted">Detailed specifications for this model are on Walton’s official product page.</p>}
              <p><a className="textlink" href={p.url} target="_blank" rel="noopener noreferrer">View full official specifications <ArrowUpRight className="icon" /></a></p>
              <p className="tiny muted">Specifications and imagery belong to this exact model. Warranty, regional availability and current selling price should be confirmed with Walton.</p>
            </>
          ) : (
            <div className="detail-copy">
              <h3>{tab === 'care' ? 'Care that keeps things running.' : 'A little planning makes a difference.'}</h3>
              <p>{tab === 'care' ? 'Check the model’s official user manual and warranty terms. Contact Walton customer care for installation, repairs and model-specific guidance.' : 'Confirm your delivery address, access route, product dimensions, installation needs and all charges with the seller before purchase.'}</p>
              <Link className="btn soft" to={tab === 'care' ? '#/support/warranty' : '#/support/delivery'}>Get support <ArrowRight className="icon arrow" /></Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function Carousel({ items }) {
  const ref = useRef(null), inner = useRef(null)
  const [w, setW] = useState(0)
  const moved = useRef(false)
  useEffect(() => {
    const m = () => ref.current && inner.current && setW(Math.max(0, inner.current.scrollWidth - ref.current.offsetWidth))
    m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m)
  }, [items.length])
  return (
    <div className="carousel" ref={ref}>
      <motion.div className="carousel-track" ref={inner} drag={w > 0 ? 'x' : false} dragConstraints={{ left: -w, right: 0 }} dragElastic={0.08} dragTransition={{ power: 0.25, timeConstant: 260 }}
        onPointerDown={() => { moved.current = false }} onDragStart={() => { moved.current = true }}
        onClickCapture={e => { if (moved.current) { e.preventDefault(); e.stopPropagation() } }}>
        {items.map((p, i) => <div className="carousel-cell" key={p.id}><ProductCard p={p} index={i} /></div>)}
      </motion.div>
    </div>
  )
}

export default function Product({ id }) {
  const p = P(id)
  const { dispatch } = useStore()
  const { toast } = useUI()
  const [qty, setQty] = useState(1)
  const [showBar, setShowBar] = useState(false)
  const buyRef = useRef(null)
  useEffect(() => { if (p) dispatch({ type: 'viewed', id: p.id }); setQty(1) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = buyRef.current; if (!el) return
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el); return () => io.disconnect()
  }, [id])
  if (!p) return <div className="wrap section"><Empty icon={PackageSearch} title="Product not found." text="Explore the catalogue to find your model." /></div>

  const hl = highlights(p, 4)
  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id && (x.sub === p.sub || true)).sort((a, b) => (b.sub === p.sub) - (a.sub === p.sub)).slice(0, 10)
  const monthly = p.price ? Math.round(p.price / 12) : 0
  const share = async () => {
    const url = location.href
    try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); toast('Link copied to clipboard.') } } catch { /* cancelled */ }
  }

  return (
    <div className="wrap">
      <Breadcrumbs items={[[p.category, slug(p.category)], [p.name]]} />
      <section className="pdp">
        <Gallery p={p} />
        <div className="pdp-copy">
          <Stagger each={0.06}>
            <Item as="span" className="eyebrow">{p.sub || p.category}</Item>
            <Item as="h1">{p.name}</Item>
            <Item as="p" className="lead">{CAT_HINT[p.category] || 'Discover your next everyday essential.'}{isInverter(p) ? ' · Inverter technology' : ''}</Item>
            {hl.length > 0 && (
              <Item as="ul" className="hl-list">
                {hl.map(([k, v]) => <li key={k}><small>{k}</small><b>{v}</b></li>)}
              </Item>
            )}
            <Item className="pdp-price">
              <span className="price xl tnum"><AnimatedNumber value={(p.price || 0) * qty} format={v => p.price ? money(v) : 'Price on request'} /></span>
              <span className="tiny muted">{qty > 1 ? `${qty} × ${money(p.price)} · ` : ''}Manufacturer listed price · Plaza price and availability to be confirmed</span>
            </Item>
            <Item className="pdp-actions" ref={buyRef}>
              {p.price ? <Stepper value={qty} onChange={setQty} label={p.name} /> : null}
              <AddButton p={p} qty={qty} className="btn lg grow" label="Add to bag" />
              <HeartButton p={p} className="outlined lg" />
              <button type="button" className="iconbtn outlined lg" onClick={share} aria-label="Share this product"><Share2 className="icon" /></button>
            </Item>
            <Item><CompareToggle p={p}>Add to comparison</CompareToggle></Item>
            <Item className="pdp-notes">
              <div className="pdp-note"><BadgeCheck className="icon" /><div><b>Get the full picture</b><span>Check model-specific specifications and warranty before buying.</span></div></div>
              <div className="pdp-note"><Truck className="icon" /><div><b>Delivery &amp; installation</b><span>Confirm coverage, charges and installation requirements with your Plaza.</span></div></div>
              {p.price > 0 && <Link className="pdp-note link" to={`#/finance?product=${p.id}`}><Wallet className="icon" /><div><b>About {money(monthly)}/month over 12 months</b><span>Illustrative, before any plan charge. Open the payment planner <ArrowRight className="icon arrow" /></span></div></Link>}
            </Item>
          </Stagger>
        </div>
      </section>

      <Reveal><Details p={p} /></Reveal>

      {related.length > 0 && (
        <section className="section">
          <SectionHead eyebrow="Keep exploring" title="A few more possibilities." text="Drag to browse similar models." link={slug(p.category)} label="View category" />
          <Carousel items={related} />
        </section>
      )}

      <AnimatePresence>
        {showBar && (
          <motion.div className="buybar" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={spring.soft}>
            <div className="buybar-img"><ProductImage p={p} /></div>
            <div className="buybar-text"><b>{p.name}</b><span className="tnum">{money(p.price)}</span></div>
            <AddButton p={p} qty={qty} className="btn" label="Add to bag" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
