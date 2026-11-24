import { ext } from './externalLinks'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Headphones, Wrench, MapPin, Heart, Phone, ShoppingBag, Columns2, Compass, Trash2, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, FAQ, P, PRODUCTS, LIFE } from '../lib/data'
import { useStore } from '../lib/store'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, Item, PageHead, Reveal, SplitText, Stagger, spotlight } from '../components/ui'
import Accordion from '../components/Accordion'
import ProductCard from '../components/ProductCard'


export function Stores() {
  return (
    <div className="wrap">
      <Breadcrumbs items={[['Find a Plaza']]} />
      <PageHead eyebrow="Closer to home" title="See your shortlist" accent="in person." photo={LIFE.living.src} photoAlt={LIFE.living.alt} text="Connect with a Walton Plaza to confirm stock, explore your payment options and get help choosing." />
      <Stagger className="editorial pad-b">
        <Item className="ed-card navy" {...spotlight}>
          <MapPin className="icon ed-icon" />
          <h2 className="h3">Find a sales or service location.</h2>
          <p>Use Walton’s official directory for current location details. Store addresses and opening hours are not invented in this concept.</p>
          <a className="btn light" href="https://waltonbd.com/sales-outlet" {...ext}>Open official directory <ArrowUpRight className="icon" /></a>
        </Item>
        <Item className="ed-card" {...spotlight}>
          <Heart className="icon ed-icon" />
          <h2 className="h3">Take your favourites with you.</h2>
          <p>Your saved products make it easier to discuss exact model numbers, prices and installation requirements in store.</p>
          <div className="row gap wrap-row">
            <Link className="btn soft" to="#/wishlist">Open my wishlist <ArrowRight className="icon arrow" /></Link>
            <a className="btn outline" href="tel:16267"><Phone className="icon" /> Ask customer care · 16267</a>
          </div>
        </Item>
      </Stagger>
    </div>
  )
}
