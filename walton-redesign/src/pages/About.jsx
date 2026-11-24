import { ext } from './externalLinks'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Headphones, Wrench, MapPin, Heart, Phone, ShoppingBag, Columns2, Compass, Trash2, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, FAQ, P, PRODUCTS } from '../lib/data'
import { useStore } from '../lib/store'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, Item, PageHead, Reveal, SplitText, Stagger, spotlight } from '../components/ui'
import Accordion from '../components/Accordion'
import ProductCard from '../components/ProductCard'


export function About() {
  return (
    <div className="wrap">
      <Breadcrumbs items={[['About']]} />
      <section className="brand-story">
        <div className="orb orb-a" aria-hidden="true" /><div className="orb orb-b" aria-hidden="true" />
        <Reveal as="span" className="eyebrow on-dark">Walton at every home</Reveal>
        <SplitText as="h1" text="Everyday innovation. Closer to home." />
        <Reveal as="p" delay={0.2}>Walton’s product range brings together refrigerators, televisions, air conditioners, washing machines, home appliances and technology for daily life.</Reveal>
        <Reveal as="p" delay={0.3}>This redesign puts the product and the person choosing it first: clearer discovery, considered comparisons and helpful information at every step.</Reveal>
        <Reveal delay={0.4}><a className="btn light lg" href="https://waltonbd.com/about" {...ext}>Read Walton’s official story <ArrowUpRight className="icon" /></a></Reveal>
      </section>
      <Stagger className="editorial pad-b">
        <Item className="ed-card" {...spotlight}><span className="eyebrow">A thoughtful redesign</span><h2 className="h3">Confidence before conversion.</h2><p>Compare exact models and listed prices. See the source of the information. Know what to confirm before making a purchase.</p></Item>
        <Item className="ed-card" {...spotlight}><span className="eyebrow">A complete experience</span><h2 className="h3">Discovery to ownership.</h2><p>Find, shortlist and compare. Plan a budget. Get support from the official manufacturer when you need it.</p></Item>
      </Stagger>
    </div>
  )
}
