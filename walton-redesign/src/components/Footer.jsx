import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowUp, ArrowUpRight, Phone, PhoneCall, MapPin, BadgeCheck, Columns2, ShieldCheck, Truck } from 'lucide-react'
import { Link } from '../lib/router'
import { slug, PRODUCTS } from '../lib/data'
import { scrollTo } from '../lib/smooth'
import { Accent, Brand, Feature, Magnetic, Stagger, Item, ThemeSwitch } from './ui'

const COLS = [
  ['Find your next', [['Refrigerators & freezers', slug('Refrigerators')], ['Televisions', slug('Televisions')], ['Air conditioners', slug('Air conditioners')], ['Washing machines', slug('Washing machines')], ['Kitchen appliances', slug('Kitchen appliances')], ['All products', '#/shop']]],
  ['Make it yours', [['Product finder', '#/finder'], ['Compare products', '#/compare'], ['Your wishlist', '#/wishlist'], ['Payment planner', '#/finance'], ['Find a Plaza', '#/stores'], ['Your shopping bag', '#/cart']]],
  ['Always here to help', [['Support & service', '#/support'], ['Warranty guidance', '#/support/warranty'], ['Delivery & installation', '#/support/delivery'], ['About Walton', '#/about'], ['Catalogue sources', '#/sources']]],
]
// Honest service promises (nothing here claims stock, prices or delivery dates).
const PROMISES = [
  [BadgeCheck, 'Real model details', `${PRODUCTS.length} models with full specifications`],
  [Columns2, 'Compare before you buy', 'Up to three models, side by side'],
  [ShieldCheck, 'Warranty guidance', 'Check coverage for your exact model'],
  [Truck, 'Delivery via your Plaza', 'Confirm coverage and installation locally'],
]

export default function Footer() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['30%', '0%'])
  const o = useTransform(scrollYProgress, [0, 1], [0.2, 1])
  return (
    <footer className="footer" ref={ref}>
      <div className="wrap">
        <div className="footer-cta">
          <div className="fc-copy">
            <span className="eyebrow on-dark">Always within reach</span>
            <h2>Questions before you choose?<br />We’re one call <Accent>away.</Accent></h2>
            <p>Talk to Walton customer care about models, warranty or service, or visit a Plaza to see it in person.</p>
          </div>
          <div className="fc-actions">
            <Magnetic><a className="fc-call" href="tel:16267"><span className="fc-ico"><PhoneCall className="icon" /></span><span><small>Customer care</small><b>16267</b></span></a></Magnetic>
            <a className="fc-call ghost" href="tel:08000016267"><span className="fc-ico"><Phone className="icon" /></span><span><small>Toll-free</small><b>08000016267</b></span></a>
            <Link className="fc-link" to="#/stores"><MapPin className="icon" /> Find a Walton Plaza <ArrowUpRight className="icon arrow" /></Link>
          </div>
        </div>

        <Stagger className="promises" each={0.06}>
          {PROMISES.map(([I, t, s]) => (
            <Item key={t} className="promise"><Feature icon={I} title={t} text={s} /></Item>
          ))}
        </Stagger>

        <div className="footer-grid">
          <div className="footer-brand">
            <Brand light />
            <p>Technology for everyday life. Find your next appliance, compare it properly and make yourself at home.</p>
            <div className="footer-theme"><span>Appearance</span><ThemeSwitch /></div>
          </div>
          {COLS.map(([h, links]) => (
            <nav key={h} aria-label={h}><h2>{h}</h2>{links.map(([l, to]) => <Link key={to} to={to}><span>{l}</span><ArrowUpRight className="icon" aria-hidden="true" /></Link>)}</nav>
          ))}
        </div>
      </div>

      <motion.p className="footer-sign" style={{ y, opacity: o }} aria-hidden="true">Make yourself at home.</motion.p>

      <div className="wrap">
        <div className="footer-bottom">
          <span>© 2026 Walton Plaza redesign concept · Not an official store</span>
          <nav className="fb-legal" aria-label="Legal"><Link to="#/privacy">Privacy</Link><Link to="#/sources">Sources</Link><Link to="#/support">Help</Link></nav>
          <button type="button" className="totop" onClick={() => scrollTo(0, false)} aria-label="Back to top"><ArrowUp className="icon" /></button>
        </div>
      </div>
    </footer>
  )
}
