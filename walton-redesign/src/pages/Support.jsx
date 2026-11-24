import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Headphones, Wrench, MapPin, Heart, Phone, ShoppingBag, Columns2, Compass, Trash2, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, FAQ, P, PRODUCTS, LIFE } from '../lib/data'
import { useStore } from '../lib/store'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, Item, PageHead, Reveal, SplitText, Stagger, spotlight } from '../components/ui'
import Accordion from '../components/Accordion'
import ProductCard from '../components/ProductCard'
import { ext } from './externalLinks'

export function Support({ sub }) {
  const cards = [
    [Headphones, 'Talk to Walton', 'Get help with availability, product questions and service.', 'tel:16267', 'Call 16267'],
    [Wrench, 'Request a service', 'Use Walton’s official service channel for installation, repairs or maintenance.', 'https://waltonbd.com/service-request', 'Open service request'],
    [MapPin, 'Find local help', 'Check the official directory for your nearest sales or service location.', 'https://waltonbd.com/sales-outlet', 'View official directory'],
  ]
  const items = FAQ.map(([k, q, a]) => [k, q, <>{a}{k === 'service' && <> <a className="textlink" href="https://waltonbd.com/csm-status" {...ext}>Open service status <ArrowUpRight className="icon" /></a></>}</>])
  return (
    <div className="wrap">
      <Breadcrumbs items={[['Help & support']]} />
      <PageHead eyebrow="A little help goes a long way" title="Here for your" accent="everyday." photo={LIFE.reading.src} photoAlt={LIFE.reading.alt} position="40% center" text="From choosing your appliance to caring for it. Find the right next step." />
      <Stagger className="supportgrid">
        {cards.map(([I, t, d, l, a]) => (
          <Item key={t} className="supportcard" {...spotlight}>
            <motion.span className="sc-icon" whileHover={{ rotate: -10, scale: 1.08 }} transition={spring.bouncy}><I className="icon" /></motion.span>
            <h2 className="h3">{t}</h2><p>{d}</p>
            <a className="textlink" href={l} {...(l.startsWith('https') ? ext : {})}>{a} <ArrowUpRight className="icon" /></a>
          </Item>
        ))}
      </Stagger>
      <section className="section faq">
        <Reveal as="h2">Before you bring it home.</Reveal>
        <Reveal><Accordion items={items} initial={sub || null} /></Reveal>
      </section>
    </div>
  )
}
