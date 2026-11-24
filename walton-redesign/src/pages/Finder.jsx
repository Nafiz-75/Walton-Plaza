import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X, Columns2, Plus, Search, Check, Info } from 'lucide-react'
import { Link, navigate, useRoute } from '../lib/router'
import { BUDGETS, CATEGORIES, COUNT, CAT_HINT, P, PRODUCTS, money, moneyPlain, pick, slug, search, isInverter, LIFE } from '../lib/data'
import { useStore } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, PageHead, ProductImage, Reveal, Stagger, Item } from '../components/ui'
import ProductCard, { AddButton } from '../components/ProductCard'


/* ================= Finder ================= */
export const STEPS = ['Your need', 'Your budget', 'Your style']

export function Finder() {
  const r = useRoute()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [cat, setCat] = useState(r.query.get('category') || '')
  const [max, setMax] = useState('')
  const [type, setType] = useState('')
  const pool = PRODUCTS.filter(p => (!cat || p.category === cat) && (!max || (p.price && p.price <= +max)))
  const types = [...new Set(PRODUCTS.filter(p => p.category === cat).map(p => p.sub))]
  const results = pool.filter(p => !type || p.sub === type)
  const go = n => { setDir(n > step ? 1 : -1); setStep(n) }
  const seeAll = () => {
    const qs = new URLSearchParams(); if (max) qs.set('max', max); if (type) qs.set('type', type)
    navigate(slug(cat) + (qs.toString() ? '?' + qs : ''))
  }
  const variants = { enter: d => ({ opacity: 0, x: d * 40 }), center: { opacity: 1, x: 0 }, exit: d => ({ opacity: 0, x: d * -40, transition: { duration: 0.15 } }) }

  return (
    <div className="wrap">
      <Breadcrumbs items={[['Product finder']]} />
      <PageHead eyebrow="Find your fit" title="A home is personal. Your choice should be," accent="too." photo={LIFE.bedroom.src} photoAlt={LIFE.bedroom.alt} position="62% center" text="Three quick questions. We’ll narrow the catalogue so you can compare the details." />
      <div className="finder">
        <ol className="finder-steps" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
              <button type="button" onClick={() => (i <= step || (i === 1 && cat) || (i === 2 && cat)) && go(i)} disabled={i > 0 && !cat} aria-current={i === step ? 'step' : undefined}>
                <span className="fs-dot">{i < step ? <Check className="icon" /> : i + 1}</span>{s}
              </button>
            </li>
          ))}
          <motion.span className="fs-bar" animate={{ scaleX: (step) / (STEPS.length - 1) }} transition={spring.soft} aria-hidden="true" />
        </ol>

        <div className="finder-stage">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: ease.out }}>
              {step === 0 && (
                <>
                  <h2 className="finder-q">What would make home better?</h2>
                  <div className="finder-cats">
                    {CATEGORIES.map(c => (
                      <motion.button key={c} type="button" className={'fc' + (cat === c ? ' on' : '')} aria-pressed={cat === c} whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
                        onClick={() => { setCat(c); setType(''); setTimeout(() => go(1), 220) }}>
                        <span className="fc-img"><ProductImage p={pick(c)} /></span>
                        <b>{c}</b><small>{CAT_HINT[c]}</small>
                        <AnimatePresence>{cat === c && <motion.span className="fc-check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.bouncy}><Check className="icon" /></motion.span>}</AnimatePresence>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <h2 className="finder-q">What’s your maximum budget?</h2>
                  <div className="chips big">
                    {[['', 'Show all budgets'], ...BUDGETS.map(b => [String(b), 'Up to ' + money(b)])].map(([v, l]) => {
                      const n = PRODUCTS.filter(p => p.category === cat && (!v || (p.price && p.price <= +v))).length
                      return (
                        <button key={v} type="button" className={'chip' + (max === v ? ' on' : '')} aria-pressed={max === v} disabled={!n} onClick={() => setMax(v)}>
                          {max === v && <motion.span layoutId="budgetpill" className="chip-pill" transition={spring.snappy} />}
                          <span className="chip-label">{l} <small>{n}</small></span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="finder-nav"><button type="button" className="btn outline" onClick={() => go(0)}><ArrowLeft className="icon" /> Back</button><button type="button" className="btn" onClick={() => go(2)}>Continue <ArrowRight className="icon arrow" /></button></div>
                </>
              )}
              {step === 2 && (
                <>
                  <h2 className="finder-q">Any particular kind?</h2>
                  <div className="chips big">
                    {['', ...types].map(t => {
                      const n = pool.filter(p => !t || p.sub === t).length
                      return (
                        <button key={t} type="button" className={'chip' + (type === t ? ' on' : '')} aria-pressed={type === t} disabled={!n} onClick={() => setType(t)}>
                          {type === t && <motion.span layoutId="typepill2" className="chip-pill" transition={spring.snappy} />}
                          <span className="chip-label">{t || 'Any type'} <small>{n}</small></span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="finder-nav"><button type="button" className="btn outline" onClick={() => go(1)}><ArrowLeft className="icon" /> Back</button></div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="small muted">No account needed. Results use product category, type and listed price; confirm dimensions, capacity and installation needs on the model page.</p>
      </div>

      {cat && (
        <section className="section finder-results">
          <div className="sectionhead">
            <div><span className="eyebrow">Your matches</span><h2><AnimatedNumber value={results.length} /> {results.length === 1 ? 'model fits' : 'models fit'}.</h2></div>
            <button type="button" className="btn" onClick={seeAll} disabled={!results.length}>See all in {cat} <ArrowRight className="icon arrow" /></button>
          </div>
          {results.length ? (
            <motion.div className="product-grid" layout>
              <AnimatePresence mode="popLayout">{results.slice(0, 8).map((p, i) => <ProductCard key={p.id} p={p} index={i} layout />)}</AnimatePresence>
            </motion.div>
          ) : <Empty title="Nothing in that range yet." text="Try a higher budget or any type." cta={null} />}
        </section>
      )}
    </div>
  )
}
