import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Headphones, Wrench, MapPin, Heart, Phone, ShoppingBag, Columns2, Compass, Trash2, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, FAQ, P, PRODUCTS, LIFE } from '../lib/data'
import { useStore } from '../lib/store'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, Item, PageHead, Reveal, SplitText, Stagger, spotlight } from '../components/ui'
import Accordion from '../components/Accordion'
import ProductCard from '../components/ProductCard'


export function Account() {
  const { state, cartCount } = useStore()
  const recent = state.recent.map(P).filter(Boolean).slice(0, 4)
  const tiles = [
    [Heart, 'Saved products', state.wish.length, '#/wishlist'],
    [ShoppingBag, 'Shopping bag', cartCount, '#/cart'],
    [Columns2, 'Comparing', state.compare.length, '#/compare'],
    [Clock, 'Recently viewed', state.recent.length, null],
  ]
  return (
    <div className="wrap">
      <Breadcrumbs items={[['Your space']]} />
      <PageHead eyebrow="Make yourself at home" title="Your space. Your" accent="possibilities." photo={LIFE.laundry.src} photoAlt={LIFE.laundry.alt} text="Keep your favourites close and pick up where you left off." />
      <Stagger className="account-tiles">
        {tiles.map(([I, l, n, to]) => {
          const inner = <><I className="icon" /><strong><AnimatedNumber value={n} onView /></strong><span>{l}</span>{to && <ArrowRight className="icon arrow at-arrow" />}</>
          return <Item key={l}>{to ? <Link to={to} className="account-tile" {...spotlight}>{inner}</Link> : <div className="account-tile">{inner}</div>}</Item>
        })}
      </Stagger>
      {recent.length > 0 && (
        <section className="section">
          <div className="sectionhead"><div><span className="eyebrow">Pick up where you left off</span><h2>Recently viewed.</h2></div></div>
          <div className="product-grid">{recent.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
        </section>
      )}
      <Reveal className="notice pad-b-sm">Your shortlist is saved on this device. This design preview has no account login or server connection.</Reveal>
    </div>
  )
}
