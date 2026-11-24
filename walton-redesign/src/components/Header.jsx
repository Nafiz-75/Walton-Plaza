import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useSpring } from 'framer-motion'
import { Search, Heart, ShoppingBag, Columns2, UserRound, Menu, Sun, Moon, Monitor, ChevronDown, ArrowUpRight, ArrowRight, House, LayoutGrid, SlidersHorizontal, MapPin } from 'lucide-react'
import { Link, useRoute } from '../lib/router'
import { CATEGORIES, COUNT, pick, slug, CAT_HINT, PRODUCTS } from '../lib/data'
import { useStore, useUI } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { Brand, ProductImage, ThemeSwitch } from './ui'

const NAV = [
  ['Refrigerators', slug('Refrigerators')],
  ['Televisions', slug('Televisions')],
  ['Air conditioners', slug('Air conditioners')],
  ['Kitchen', slug('Kitchen appliances')],
  ['Find your fit', '#/finder'],
  ['Payment planner', '#/finance'],
]

function Badge({ n, label }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.span key={n} className="count" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring.bouncy}>
          <span className="sr-only">, </span>{n}<span className="sr-only"> {label}</span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}


export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 })
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />
}

export default function Header() {
  const { route, hash } = useRoute()
  const { state, cartCount } = useStore()
  const { setPanel } = useUI()
  const [scrolled, setScrolled] = useState(false)
  const [mega, setMega] = useState(false)
  const [hover, setHover] = useState(null)
  const { scrollY } = useScroll()
  const closeT = useRef()

  useMotionValueEvent(scrollY, 'change', y => {
    setScrolled(y > 12) // header stays pinned; only its shadow changes once the page scrolls
  })
  useEffect(() => { setMega(false) }, [hash])
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') setMega(false) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])

  const openMega = () => { clearTimeout(closeT.current); setMega(true) }
  const closeMega = () => { closeT.current = setTimeout(() => setMega(false), 140) }

  return (
    <>
      <section className="topbar" aria-label="Store information">
        <div className="wrap row between">
          <span>Walton at every home · <b>{PRODUCTS.length} models</b> to explore</span>
          <nav className="row utility" aria-label="Help">
            <Link to="#/stores">Find a Plaza</Link><Link to="#/support">Help &amp; support</Link><a href="tel:16267">Call 16267</a>
          </nav>
        </div>
      </section>
      <header className={'header' + (scrolled ? ' scrolled' : '')}>
        <div className="wrap mainhead">
          <Brand />
          <button type="button" className="searchtrigger" onClick={() => setPanel('search')}>
            <Search className="icon" aria-hidden="true" /><span>Search {PRODUCTS.length} products, models or categories</span><kbd aria-hidden="true">/</kbd>
          </button>
          <div className="headtools">
            <button type="button" className="iconbtn mobile-only" onClick={() => setPanel('search')} aria-label="Search"><Search className="icon" /></button>
            <ThemeSwitch />
            <Link to="#/compare" className="iconbtn desktop-only"><Columns2 className="icon" aria-hidden="true" /><span className="sr-only">Compare products</span><Badge n={state.compare.length} label="to compare" /></Link>
            <Link to="#/wishlist" className="iconbtn"><Heart className="icon" aria-hidden="true" /><span className="sr-only">Wishlist</span><Badge n={state.wish.length} label="saved" /></Link>
            <Link to="#/account" className="iconbtn desktop-only" aria-label="Your space"><UserRound className="icon" /></Link>
            <button type="button" id="cart-target" className="iconbtn cartbtn" onClick={() => setPanel('cart')} ><ShoppingBag className="icon" aria-hidden="true" /><span className="sr-only">Shopping bag</span><Badge n={cartCount} label="in bag" /></button>
            <button type="button" className="iconbtn mobile-only" onClick={() => setPanel('menu')} aria-label="Open menu"><Menu className="icon" /></button>
          </div>
        </div>
        <nav className="wrap navrow" aria-label="Main navigation" onPointerLeave={() => setHover(null)}>
          <button type="button" className={'navlink cats' + (mega ? ' open' : '')} aria-expanded={mega} aria-controls="mega"
            onClick={() => setMega(m => !m)} onPointerEnter={e => { if (e.pointerType === 'mouse') openMega(); setHover('cats') }} onPointerLeave={e => e.pointerType === 'mouse' && closeMega()}>
            {hover === 'cats' && <motion.span layoutId="navpill" className="navpill" transition={spring.snappy} />}
            <LayoutGrid className="icon" /> All categories <ChevronDown className="icon chev" />
          </button>
          {NAV.map(([label, to]) => {
            const active = hash.startsWith(to)
            return (
              <Link key={to} to={to} className={'navlink' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} onPointerEnter={() => setHover(to)} onFocus={() => setHover(to)}>
                {hover === to && <motion.span layoutId="navpill" className="navpill" transition={spring.snappy} />}
                {label}
              </Link>
            )
          })}
          <Link to="#/support" className="navlink right" onPointerEnter={() => setHover('help')}>
            {hover === 'help' && <motion.span layoutId="navpill" className="navpill" transition={spring.snappy} />}
            Here to help <ArrowUpRight className="icon" />
          </Link>
        </nav>
        <AnimatePresence>
          {mega && (
            <motion.div id="mega" className="mega" onPointerEnter={openMega} onPointerLeave={closeMega}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }} transition={{ duration: 0.3, ease: ease.out }}>
              <div className="wrap megagrid">
                <motion.div className="megacats" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.025 } } }}>
                  {CATEGORIES.map(c => (
                    <motion.div key={c} variants={{ h: { opacity: 0, y: 10 }, s: { opacity: 1, y: 0 } }}>
                      <Link to={slug(c)} className="megacat">
                        <span className="megathumb"><ProductImage p={pick(c)} /></span>
                        <span><b>{c}</b><small>{COUNT[c]} models · {CAT_HINT[c]}</small></span>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
                <Link to="#/finder" className="megapromo">
                  <span className="eyebrow">Not sure where to start?</span>
                  <b>Find your fit in three quick steps.</b>
                  <span className="textlink">Help me choose <ArrowRight className="icon arrow" /></span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}

const MOBILE = [['Home', '#/', House, 'home'], ['Shop', '#/shop', LayoutGrid, 'shop'], ['Find your fit', '#/finder', SlidersHorizontal, 'finder'], ['Plazas', '#/stores', MapPin, 'stores'], ['Account', '#/account', UserRound, 'account']]
export function MobileNav() {
  const { route } = useRoute()
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {MOBILE.map(([label, to, Icon, r]) => {
        const active = route === r
        return (
          <Link key={r} to={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            {active && <motion.span layoutId="mobpill" className="mobpill" transition={spring.snappy} />}
            <Icon className="icon" /><span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
