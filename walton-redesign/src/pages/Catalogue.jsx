import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup, useDragControls } from 'framer-motion'
import { SlidersHorizontal, X, Heart, SearchX, RotateCcw, ArrowDownWideNarrow, Share2, HeartHandshake } from 'lucide-react'
import { Link, useRoute } from '../lib/router'
import { BUDGETS, CATEGORIES, CAT_HINT, COUNT, PRODUCTS, P, money, slug, isInverter, search, LIFE } from '../lib/data'

const CAT_SCENE = { 'Refrigerators': LIFE.hero, 'Televisions': LIFE.living, 'Air conditioners': LIFE.bedroom, 'Washing machines': LIFE.laundry, 'Kitchen appliances': LIFE.kitchen, 'Home appliances': LIFE.reading }
import { useStore, useUI } from '../lib/store'
import { lockScroll } from '../lib/smooth'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, SplitText, Reveal, Scene } from '../components/ui'
import ProductCard from '../components/ProductCard'

const STEP = 24
const STOPS = [...BUDGETS, null] // null = any budget
const SORTS = [['default', 'Featured order'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['name', 'Model: A–Z'], ['new', 'New arrivals first']]

function Filters({ subs, f, set, base }) {
  const stopIdx = f.max ? Math.max(0, STOPS.indexOf(+f.max)) : STOPS.length - 1
  const pct = (stopIdx / (STOPS.length - 1)) * 100
  return (
    <div className="filters">
      <div className="f-group">
        <h2>Category</h2>
        <div className="f-cats">
          <Link to={'#/shop'} className={!base.category && base.mode === 'shop' ? 'on' : ''}>All categories <small>{PRODUCTS.length}</small></Link>
          {CATEGORIES.map(c => <Link key={c} to={slug(c)} className={base.category === c ? 'on' : ''}>{c} <small>{COUNT[c]}</small></Link>)}
        </div>
      </div>
      {subs.length > 1 && (
        <div className="f-group">
          <h2>Product type</h2>
          <div className="chips">
            {subs.map(([s, n]) => (
              <button key={s} type="button" className={'chip' + (f.type === s ? ' on' : '')} aria-pressed={f.type === s} onClick={() => set({ type: f.type === s ? '' : s })}>
                {f.type === s && <motion.span layoutId="typepill" className="chip-pill" transition={spring.snappy} />}
                <span className="chip-label">{s} <small>{n}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="f-group">
        <h2>Maximum budget <output className="f-out tnum">{f.max ? money(+f.max) : 'Any budget'}</output></h2>
        <div className="range" style={{ '--pct': pct + '%' }}>
          <input type="range" min="0" max={STOPS.length - 1} step="1" value={stopIdx} aria-label="Maximum budget" aria-valuetext={f.max ? money(+f.max) : 'Any budget'}
            onChange={e => { const v = STOPS[+e.target.value]; set({ max: v ? String(v) : '' }) }} />
        </div>
        <div className="range-scale tiny muted"><span>৳5k</span><span>৳1L</span><span>Any</span></div>
      </div>
      <div className="f-group">
        <h2>Quick picks</h2>
        <label className="switch"><input type="checkbox" checked={f.isnew === '1'} onChange={e => set({ isnew: e.target.checked ? '1' : '' })} /><span className="track"><motion.span className="thumb" layout transition={spring.snappy} /></span>New arrivals only</label>
        <label className="switch"><input type="checkbox" checked={f.inv === '1'} onChange={e => set({ inv: e.target.checked ? '1' : '' })} /><span className="track"><motion.span className="thumb" layout transition={spring.snappy} /></span>Inverter &amp; BLDC</label>
        <label className="switch"><input type="checkbox" checked={f.priced === '1'} onChange={e => set({ priced: e.target.checked ? '1' : '' })} /><span className="track"><motion.span className="thumb" layout transition={spring.snappy} /></span>Has a listed price</label>
      </div>
    </div>
  )
}

export default function Catalogue({ mode }) {
  const r = useRoute()
  const { state, dispatch } = useStore()
  const { toast } = useUI()
  // A shortlist opened from a shared link (#/wishlist?ids=a,b,c)
  const sharedIds = mode === 'wishlist' ? (r.query.get('ids') || '').split(',').filter(id => P(id)) : []
  const viewingShared = sharedIds.length > 0
  const category = mode === 'shop' ? r.parts[1] || '' : ''
  const q = mode === 'search' ? r.query.get('q') || '' : ''
  const base = { mode, category, q }

  const read = () => Object.fromEntries(['type', 'max', 'sort', 'isnew', 'inv', 'priced'].map(k => [k, r.query.get(k) || '']))
  const [f, setF] = useState(read)
  const [shown, setShown] = useState(STEP)
  const [sheet, setSheet] = useState(false)
  const drag = useDragControls()
  useEffect(() => { setF(read()); setShown(STEP) }, [r.path, q]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = patch => {
    const n = { ...f, ...patch }
    setF(n); setShown(STEP)
    const qs = new URLSearchParams(); if (q) qs.set('q', q)
    Object.entries(n).forEach(([k, v]) => v && qs.set(k, v))
    history.replaceState(null, '', '#' + r.path + (qs.toString() ? '?' + qs : '')) // shareable URL, no navigation
  }
  const reset = () => set({ type: '', max: '', sort: '', isnew: '', inv: '', priced: '' })

  const pool = useMemo(() => {
    let l = mode === 'search' ? search(q) : PRODUCTS
    if (category) l = l.filter(p => p.category === category)
    if (mode === 'wishlist') l = (viewingShared ? sharedIds : state.wish).map(P).filter(Boolean)
    return l
  }, [mode, q, category, state.wish, viewingShared, sharedIds.join()])
  const subs = useMemo(() => {
    const m = new Map(); pool.forEach(p => p.sub && m.set(p.sub, (m.get(p.sub) || 0) + 1))
    return [...m].sort((a, b) => b[1] - a[1])
  }, [pool])
  const list = useMemo(() => {
    let l = pool
    if (f.type) l = l.filter(p => p.sub === f.type)
    if (f.max) l = l.filter(p => p.price && p.price <= +f.max)
    if (f.isnew) l = l.filter(p => p.isNew)
    if (f.inv) l = l.filter(isInverter)
    if (f.priced) l = l.filter(p => p.price)
    const s = [...l]
    if (f.sort === 'low') s.sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
    if (f.sort === 'high') s.sort((a, b) => (b.price || 0) - (a.price || 0))
    if (f.sort === 'name') s.sort((a, b) => a.name.localeCompare(b.name))
    if (f.sort === 'new') s.sort((a, b) => b.isNew - a.isNew)
    return s
  }, [pool, f])

  // infinite load
  const sentinel = useRef(null)
  useEffect(() => {
    const el = sentinel.current; if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(s => Math.min(list.length, s + STEP)), { rootMargin: '600px' })
    io.observe(el); return () => io.disconnect()
  }, [list.length, shown])

  useEffect(() => { if (!sheet) return; lockScroll(true); return () => lockScroll(false) }, [sheet])

  const active = [
    f.type && ['type', f.type], f.max && ['max', 'Up to ' + money(+f.max)], f.isnew && ['isnew', 'New arrivals'], f.inv && ['inv', 'Inverter & BLDC'], f.priced && ['priced', 'Has a price'],
  ].filter(Boolean)

  const title = mode === 'wishlist' ? (viewingShared ? 'A shortlist shared with you.' : 'Saved for a little later.') : mode === 'search' ? (q ? `Results for “${q}”` : 'Search the collection') : category || 'Find your everyday upgrade.'
  const lead = mode === 'wishlist' ? (viewingShared ? 'Someone picked these models for you. Save them to your own list, or take this page to a Walton Plaza.' : 'Saved on this device. Share the list to show it at a Plaza or send it to family.') : mode === 'search' ? 'Refine the results with filters, or try another word.' : CAT_HINT[category] || 'Explore every collected model, from everyday essentials to your next big upgrade.'

  const scene = mode === 'shop' && CAT_SCENE[category]
  return (
    <div className="wrap">
      <Breadcrumbs items={[[mode === 'wishlist' ? 'Wishlist' : mode === 'search' ? 'Search' : category ? 'Shop' : 'All products', category ? '#/shop' : null], ...(category ? [[category]] : [])]} />
      <div className={scene ? 'pagehead-split cat-split' : undefined} key={title}>
      <header className="pagehead compact">
        <Reveal as="span" className="eyebrow">{mode === 'wishlist' ? 'Your wishlist' : 'The Walton collection'}</Reveal>
        <SplitText as="h1" text={title} />
        <Reveal as="p" className="lead" delay={0.12}>{lead}</Reveal>
        {mode === 'wishlist' && (viewingShared || state.wish.length > 0) && (
          <Reveal className="row gap list-actions" delay={0.2}>
            {viewingShared ? (
              <button type="button" className="btn" onClick={() => { const add = sharedIds.filter(id => !state.wish.includes(id)); add.forEach(id => dispatch({ type: 'wish', id })); toast(add.length ? `Saved ${add.length} ${add.length === 1 ? 'model' : 'models'} to your shortlist.` : 'All of these are already in your shortlist.', { label: 'View', href: '#/wishlist' }) }}>
                <HeartHandshake className="icon" /> Save all to my shortlist
              </button>
            ) : (
              <button type="button" className="btn soft" onClick={async () => {
                const url = location.href.split('#')[0] + '#/wishlist?ids=' + state.wish.join(',')
                try { if (navigator.share) { await navigator.share({ title: 'My Walton Plaza shortlist', text: `${state.wish.length} models I'm considering`, url }); return } } catch (e) { if (e && e.name === 'AbortError') return }
                try { await navigator.clipboard.writeText(url); toast('Link copied. Paste it in a message or show it at the Plaza.') } catch { toast('Copy this link: ' + url) }
              }}><Share2 className="icon" /> Share list</button>
            )}
          </Reveal>
        )}
      </header>
        {scene && <Scene className="pagehead-photo" src={scene.src} alt={scene.alt} eager drift={20} />}
      </div>

      <div className="catalog">
        <aside className="catalog-side" data-lenis-prevent><Filters subs={subs} f={f} set={set} base={base} /></aside>
        <div className="catalog-main">
          <div className="sortbar">
            <button type="button" className="btn outline small mobile-filter" onClick={() => setSheet(true)}><SlidersHorizontal className="icon" /> Filters {active.length > 0 && <span className="dotcount">{active.length}</span>}</button>
            <span className="result-count" aria-live="polite"><b><AnimatedNumber value={list.length} /></b> {list.length === 1 ? 'product' : 'products'}</span>
            <label className="sort"><ArrowDownWideNarrow className="icon" /><span className="sr-only">Sort by</span>
              <select value={f.sort || 'default'} onChange={e => set({ sort: e.target.value === 'default' ? '' : e.target.value })}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
          </div>
          <AnimatePresence initial={false}>
            {active.length > 0 && (
              <motion.div className="active-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="chips">
                  <AnimatePresence mode="popLayout">
                    {active.map(([k, l]) => (
                      <motion.button layout key={k} type="button" className="chip on removable" onClick={() => set({ [k]: '' })} aria-label={`Remove filter: ${l}`}
                        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={spring.snappy}>
                        <span className="chip-label">{l} <X className="icon" /></span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  <button type="button" className="textlink sm" onClick={reset}><RotateCcw className="icon" /> Clear all</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {list.length ? (
            <>
              <motion.div className="product-grid" layout>
                <AnimatePresence mode="popLayout" initial={false}>
                  {list.slice(0, shown).map((p, i) => <ProductCard key={p.id} p={p} index={i} layout />)}
                </AnimatePresence>
              </motion.div>
              {shown < list.length && (
                <div className="loadmore" ref={sentinel}>
                  <div className="lm-bar"><motion.span animate={{ scaleX: shown / list.length }} transition={spring.soft} /></div>
                  <p className="tiny muted">Showing {shown} of {list.length}</p>
                  <button type="button" className="btn outline" onClick={() => setShown(s => s + STEP)}>Show more</button>
                </div>
              )}
            </>
          ) : mode === 'wishlist' && !pool.length ? (
            <Empty icon={Heart} title="Nothing saved yet." text="Tap the heart on any product to keep it here for later." />
          ) : (
            <Empty icon={SearchX} title="No matches just yet." text="Try another search or loosen a filter or two." cta={null} />
          )}
          {!list.length && active.length > 0 && <div className="center"><button type="button" className="btn soft" onClick={reset}><RotateCcw className="icon" /> Reset filters</button></div>}
          <p className="tiny muted note">Prices are from the manufacturer catalogue. Confirm current Plaza price, stock and promotions before purchase.</p>
        </div>
      </div>

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="scrim" onClick={() => setSheet(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="drawer bottom filter-sheet" role="dialog" aria-modal="true" aria-label="Filters"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', transition: { duration: 0.22 } }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              drag="y" dragListener={false} dragControls={drag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && setSheet(false)}>
              <div className="drag-zone" onPointerDown={e => drag.start(e)}><div className="grabber" aria-hidden="true" />
              <div className="drawer-head"><h2>Refine your choices</h2><button type="button" className="iconbtn" onClick={() => setSheet(false)} aria-label="Close filters"><X className="icon" /></button></div></div>
              <div className="drawer-body" data-lenis-prevent><LayoutGroup id="sheet"><Filters subs={subs} f={f} set={set} base={base} /></LayoutGroup></div>
              <div className="drawer-foot row gap">
                <button type="button" className="btn outline grow" onClick={reset}>Reset</button>
                <button type="button" className="btn grow" onClick={() => setSheet(false)}>Show {list.length} products</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
