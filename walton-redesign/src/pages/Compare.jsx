import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X, Columns2, Plus, Search, Check, Info } from 'lucide-react'
import { Link, navigate, useRoute } from '../lib/router'
import { BUDGETS, CATEGORIES, COUNT, CAT_HINT, P, PRODUCTS, money, moneyPlain, pick, slug, search, isInverter } from '../lib/data'
import { useStore } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, PageHead, ProductImage, Reveal, Stagger, Item } from '../components/ui'
import ProductCard, { AddButton } from '../components/ProductCard'


/* ================= Compare ================= */
export function AddSlot() {
  const { toggleCompare } = useStore()
  const [q, setQ] = useState('')
  const res = q.trim() ? search(q, 5) : []
  return (
    <div className="cmp-add">
      <div className="cmp-add-icon"><Plus className="icon" /></div>
      <label className="field slim"><span className="sr-only">Find a product to compare</span>
        <span className="input-icon"><Search className="icon" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Add a model…" /></span>
      </label>
      <AnimatePresence>
        {res.length > 0 && (
          <motion.ul className="cmp-suggest" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {res.map(p => <li key={p.id}><button type="button" onClick={() => { toggleCompare(p); setQ('') }}><ProductImage p={p} /><span>{p.name}<small>{money(p.price)}</small></span></button></li>)}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Compare() {
  const { state, toggleCompare } = useStore()
  const [diff, setDiff] = useState(false)
  const ps = state.compare.map(P).filter(Boolean)
  const rows = useMemo(() => {
    const base = [['Category', p => p.category], ['Product type', p => p.sub], ['Listed price', p => money(p.price)], ['Technology', p => isInverter(p) ? 'Inverter' : 'See official specifications']]
    const keys = []
    ps.forEach(p => p.specs.forEach(([k]) => !keys.includes(k) && keys.push(k)))
    const specRows = keys.map(k => [k, p => p.specs.find(s => s[0] === k)?.[1] || '—'])
    return [...base, ...specRows]
  }, [ps])
  const visible = diff ? rows.filter(([, fn]) => new Set(ps.map(fn)).size > 1) : rows
  return (
    <div className="wrap">
      <Breadcrumbs items={[['Compare']]} />
      <PageHead eyebrow="See the difference" title="Good choices, side by side." text="Compare up to three models. Add products with the Compare toggle, or search below." />
      {!ps.length ? (
        <div className="pad-b"><Empty icon={Columns2} title="Your comparison starts here." text="Choose a few favourites from the catalogue and tick Compare." /></div>
      ) : (
        <Reveal className="compare">
          <div className="cmp-toolbar">
            <label className="switch"><input type="checkbox" checked={diff} onChange={e => setDiff(e.target.checked)} /><span className="track"><motion.span className="thumb" layout transition={spring.snappy} /></span>Highlight differences only</label>
            <span className="tiny muted">{visible.length} of {rows.length} rows</span>
          </div>
          <div className="cmp-scroll" data-lenis-prevent>
            <table className="cmp-table" style={{ '--cols': ps.length + (ps.length < 3 ? 1 : 0) }}>
              <thead>
                <tr>
                  <th scope="col" className="cmp-corner">Your shortlist<small>{ps.length} of 3</small></th>
                  <AnimatePresence initial={false}>
                    {ps.map(p => (
                      <motion.th key={p.id} scope="col" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <div className="cmp-head">
                          <button type="button" className="iconbtn sm cmp-x" onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`}><X className="icon" /></button>
                          <Link to={`#/product/${p.id}`} className="cmp-img"><ProductImage p={p} /></Link>
                          <Link to={`#/product/${p.id}`}><b>{p.name}</b></Link>
                          <span className="price sm tnum">{money(p.price)}</span>
                          <AddButton p={p} />
                        </div>
                      </motion.th>
                    ))}
                  </AnimatePresence>
                  {ps.length < 3 && <th scope="col"><AddSlot /></th>}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visible.map(([label, fn]) => {
                    const vals = ps.map(fn), differs = new Set(vals).size > 1
                    return (
                      <motion.tr key={label} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={differs && ps.length > 1 ? 'differs' : ''}>
                        <th scope="row">{label}</th>
                        {vals.map((v, i) => <td key={ps[i].id}>{v}</td>)}
                        {ps.length < 3 && <td />}
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <p className="tiny muted note"><Info className="icon" /> Rows show what each model’s catalogue entry lists. A dash means the detail isn’t listed — check the official specification page.</p>
        </Reveal>
      )}
    </div>
  )
}
