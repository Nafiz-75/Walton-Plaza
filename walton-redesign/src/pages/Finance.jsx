import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X, Columns2, Plus, Search, Check, Info } from 'lucide-react'
import { Link, navigate, useRoute } from '../lib/router'
import { BUDGETS, CATEGORIES, COUNT, CAT_HINT, P, PRODUCTS, money, moneyPlain, pick, slug, search, isInverter } from '../lib/data'
import { useStore } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, PageHead, ProductImage, Reveal, Stagger, Item } from '../components/ui'
import ProductCard, { AddButton } from '../components/ProductCard'


/* ================= Finance ================= */
export function Finance() {
  const r = useRoute()
  const priced = useMemo(() => PRODUCTS.filter(p => p.price), [])
  const [pid, setPid] = useState(() => P(r.query.get('product'))?.id || pick('Refrigerators').id)
  const p = P(pid)
  const [downPct, setDownPct] = useState(20)
  const [months, setMonths] = useState(12)
  const [rate, setRate] = useState(0)
  const down = Math.round(p.price * downPct / 100), fin = p.price - down, fee = fin * rate / 100
  const monthly = (fin + fee) / months, total = p.price + fee
  const share = total ? [down / total, fin / total, fee / total] : [0, 0, 0]
  return (
    <div className="wrap">
      <Breadcrumbs items={[['Payment planner']]} />
      <PageHead eyebrow="Plan with clarity" title="A budget that feels like you." text="Explore the numbers before you decide. This is an illustrative budgeting calculator, not a Walton financing offer." />
      <div className="calc">
        <Reveal className="panel calc-form">
          <label className="field"><span>Choose a product</span>
            <select value={pid} onChange={e => setPid(e.target.value)}>
              {CATEGORIES.map(c => <optgroup key={c} label={c}>{priced.filter(x => x.category === c).map(x => <option key={x.id} value={x.id}>{x.name} · {money(x.price)}</option>)}</optgroup>)}
            </select>
          </label>
          <div className="calc-product">
            <AnimatePresence mode="popLayout"><motion.div key={p.id} className="cp-img" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring.soft}><ProductImage p={p} /></motion.div></AnimatePresence>
            <div><b>{p.name}</b><small>{p.category} · {money(p.price)}</small><Link className="textlink sm" to={`#/product/${p.id}`}>View product <ArrowRight className="icon arrow" /></Link></div>
          </div>
          <div className="field"><span>Down payment <output className="tnum">{downPct}% · {money(down)}</output></span>
            <div className="range" style={{ '--pct': downPct / 0.9 + '%' }}><input type="range" min="0" max="90" step="5" value={downPct} onChange={e => setDownPct(+e.target.value)} aria-label="Down payment percentage" aria-valuetext={`${downPct}%, ${money(down)}`} /></div>
          </div>
          <div className="field"><span>Number of months</span>
            <div className="segmented" role="radiogroup" aria-label="Number of months">
              {[3, 6, 9, 12, 18, 24].map(n => (
                <button key={n} type="button" role="radio" aria-checked={months === n} className={months === n ? 'on' : ''} onClick={() => setMonths(n)}>
                  {months === n && <motion.span layoutId="monthpill" className="seg-pill" transition={spring.snappy} />}<span>{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field"><span>Total plan charge <output className="tnum">{rate}% of financed amount</output></span>
            <div className="range" style={{ '--pct': rate / 0.3 + '%' }}><input type="range" min="0" max="30" step="0.5" value={rate} onChange={e => setRate(+e.target.value)} aria-label="Plan charge percentage" /></div>
            <small className="help">Enter the rate quoted by the seller or bank. The initial 0% is a calculator input, not a claim of available interest-free financing.</small>
          </div>
        </Reveal>
        <Reveal className="calc-result" delay={0.1}>
          <span className="eyebrow on-dark">Illustrative monthly amount</span>
          <div className="calc-big"><AnimatedNumber value={monthly} format={v => moneyPlain(v)} /><small> / month</small></div>
          <p>{months} monthly payments, plus your down payment.</p>
          <div className="calc-bar" aria-hidden="true">
            {share.map((s, i) => <motion.span key={i} className={'seg s' + i} animate={{ flexGrow: s }} transition={spring.soft} />)}
          </div>
          <div className="calc-legend"><span><i className="s0" />Down payment</span><span><i className="s1" />Financed</span><span><i className="s2" />Plan charge</span></div>
          <dl className="calc-rows">
            {[['Product price', p.price], ['Down payment', down], ['Financed amount', fin], ['Plan charge', fee], ['Total payable', total]].map(([l, n]) => (
              <div key={l} className={l === 'Total payable' ? 'total' : ''}><dt>{l}</dt><dd><AnimatedNumber value={n} format={v => moneyPlain(v)} /></dd></div>
            ))}
          </dl>
          <p className="tiny">Excludes delivery, installation and any additional bank or seller fees. Actual eligibility and terms require confirmation.</p>
        </Reveal>
      </div>
    </div>
  )
}
