import { lazy, Suspense, useEffect, useRef } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useRoute, consumeNavIntent, savedScroll } from './lib/router'
import { Providers } from './lib/store'
import { P } from './lib/data'
import { initSmooth, scrollTo } from './lib/smooth'
import { page } from './lib/motion'
import Header, { MobileNav, ScrollProgress } from './components/Header'
import Footer from './components/Footer'
import Overlays from './components/overlays'
import Home from './pages/Home'

// Every page except Home loads on demand, so the first visit only downloads what it shows.
const named = (load, name) => lazy(() => load().then(m => ({ default: m[name] || m.default })))
const Catalogue = named(() => import('./pages/Catalogue'), 'default')
const Product = named(() => import('./pages/Product'), 'default')
const Compare = named(() => import('./pages/Compare'), 'Compare')
const Finder = named(() => import('./pages/Finder'), 'Finder')
const Finance = named(() => import('./pages/Finance'), 'Finance')
const Cart = named(() => import('./pages/Cart'), 'Cart')
const Checkout = named(() => import('./pages/Checkout'), 'Checkout')
const Support = named(() => import('./pages/Support'), 'Support')
const Stores = named(() => import('./pages/Stores'), 'Stores')
const Account = named(() => import('./pages/Account'), 'Account')
const About = named(() => import('./pages/About'), 'About')
const Sources = named(() => import('./pages/Sources'), 'Sources')
const NotFound = named(() => import('./pages/NotFound'), 'NotFound')

/** Shown for the split second a page is downloading: the page's own shape, shimmering. */
function PageSkeleton() {
  return (
    <div className="wrap page-skeleton" aria-busy="true" aria-label="Loading page">
      <span className="sk sk-title" /><span className="sk sk-line" /><span className="sk sk-line short" />
      <div className="sk-grid">{[0, 1, 2, 3].map(i => <span key={i} className="sk sk-card" />)}</div>
    </div>
  )
}

function resolve(r) {
  const [a, b] = [r.parts[0], r.parts[1]]
  switch (r.route) {
    case 'home': return ['home', <Home />, 'A little smarter. A lot more home.']
    case 'shop': return ['shop', <Catalogue mode="shop" />, b || 'All products']
    case 'search': return ['search', <Catalogue mode="search" />, 'Search']
    case 'wishlist': return ['wishlist', <Catalogue mode="wishlist" />, 'Wishlist']
    case 'product': return ['product/' + b, <Product id={b} />, P(b)?.name || 'Product']
    case 'compare': return ['compare', <Compare />, 'Compare']
    case 'cart': return ['cart', <Cart />, 'Shopping bag']
    case 'checkout': return ['checkout', <Checkout />, 'Checkout']
    case 'finder': return ['finder', <Finder />, 'Product finder']
    case 'finance': return ['finance', <Finance />, 'Payment planner']
    case 'support': return ['support/' + (b || ''), <Support sub={b} />, 'Help & support']
    case 'stores': return ['stores', <Stores />, 'Find a Plaza']
    case 'account': return ['account', <Account />, 'Your space']
    case 'about': return ['about', <About />, 'About']
    case 'sources': return ['sources', <Sources />, 'Catalogue sources']
    case 'privacy': return ['privacy', <Sources privacy />, 'Privacy']
    default: return ['404' + a, <NotFound />, 'Not found']
  }
}

function Shell() {
  const r = useRoute()
  const [key, view, title] = resolve(r)
  const main = useRef(null)
  const prevKey = useRef(key)
  const pending = useRef(null)
  const first = useRef(true)

  useEffect(() => { initSmooth() }, [])
  useEffect(() => { document.title = `${title} | Walton Plaza` }, [title])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const forward = consumeNavIntent()
    const y = forward ? 0 : savedScroll(r.hash) || 0
    if (prevKey.current === key) { if (forward) scrollTo(0) } // same page, new params (e.g. category)
    else pending.current = y
    prevKey.current = key
  }, [r.hash]) // eslint-disable-line react-hooks/exhaustive-deps

  const onExitComplete = () => {
    if (pending.current !== null) { scrollTo(pending.current); pending.current = null }
    main.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <a className="skip btn" href="#main" onClick={e => { e.preventDefault(); main.current?.focus() }}>Skip to content</a>
      <ScrollProgress />
      <Header />
      <main id="main" ref={main} tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false} onExitComplete={onExitComplete}>
          <motion.div key={key} {...page}><Suspense fallback={<PageSkeleton />}>{view}</Suspense></motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileNav />
      <Overlays />
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      <Providers><Shell /></Providers>
    </MotionConfig>
  )
}
