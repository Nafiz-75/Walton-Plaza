import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Headphones, Wrench, MapPin, Heart, Phone, ShoppingBag, Columns2, Compass, Trash2, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, FAQ, P, PRODUCTS } from '../lib/data'
import { useStore } from '../lib/store'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, Item, PageHead, Reveal, SplitText, Stagger, spotlight } from '../components/ui'
import Accordion from '../components/Accordion'
import ProductCard from '../components/ProductCard'


export function Sources({ privacy }) {
  const { dispatch } = useStore()
  return (
    <div className="wrap">
      <Breadcrumbs items={[[privacy ? 'Privacy & prototype notes' : 'Catalogue sources']]} />
      <PageHead eyebrow="Clear by design" title={privacy ? 'Your data stays with you.' : 'Every model has a source.'} />
      <Reveal className="panel prose pad-b-sm">
        <h2 className="h3">{privacy ? 'How this prototype works' : 'Catalogue coverage'}</h2>
        <p>{privacy
          ? 'This HTML concept stores your wishlist, comparison, recently viewed list and bag in this browser’s local storage. Checkout details are used only to render a local preview and are not transmitted or persisted. External links open official websites with their own privacy policies.'
          : `This concept contains ${PRODUCTS.length} unique product records collected from accessible Walton manufacturer category pages on 21 October 2026. Images are matched to their corresponding models. Prices are manufacturer catalogue prices, not verified Plaza selling prices.`}</p>
        <p>Walton Plaza itself presented a persistent access-verification block. Exact Plaza stock, promotions, full catalogue parity, policies and store-specific details remain unverified. This is an independent design concept, not an official Walton service.</p>
        {privacy
          ? <button type="button" className="btn outline danger" onClick={() => { if (confirm('Clear your saved wishlist, comparison, recently viewed and bag on this device?')) dispatch({ type: 'clearAll' }) }}><Trash2 className="icon" /> Clear saved shortlist and bag</button>
          : <>
            <p className="small">Open any product page for its original source link.</p>
            <table className="specs"><tbody>{CATEGORIES.map(c => <tr key={c}><th scope="row">{c}</th><td>{COUNT[c]} models</td></tr>)}</tbody></table>
          </>}
      </Reveal>
    </div>
  )
}
