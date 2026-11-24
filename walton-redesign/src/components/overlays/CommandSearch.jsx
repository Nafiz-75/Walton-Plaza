import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Search, ArrowRight, ShoppingBag, Minus, Plus, Trash2, CornerDownLeft, Clock, LayoutGrid, Columns2, SlidersHorizontal, Wallet, Headphones, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link, navigate, useRoute } from '../../lib/router'
import { CATEGORIES, COUNT, P, money, pick, search, slug, highlights, techLabel, PRODUCTS } from '../../lib/data'
import { useStore, useUI } from '../../lib/store'
import { lockScroll } from '../../lib/smooth'
import { spring, ease } from '../../lib/motion'
import { AnimatedNumber, Brand, ProductImage, ThemeSwitch } from '../ui'
import { AddButton, CompareToggle, HeartButton } from '../ProductCard'
import { PAGES } from './shared'
import { POPULAR } from './shared'
import { useOverlay } from './shared'

export function CommandSearch({ onClose }) {
  const ref = useRef(null)
  const { state, dispatch } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  useOverlay(true, onClose, ref)

  const results = useMemo(() => {
    if (!q.trim()) return []
    const cats = CATEGORIES.filter(c => c.toLowerCase().includes(q.toLowerCase().trim())).map(c => ({ kind: 'cat', c, to: slug(c) }))
    const prods = search(q, 7).map(p => ({ kind: 'prod', p, to: `#/product/${p.id}` }))
    return [...cats, ...prods]
  }, [q])
  const total = q.trim() ? search(q).length : 0
  useEffect(() => setSel(0), [q])

  const go = to => { dispatch({ type: 'searched', q: q.trim() }); onClose(); navigate(to) }
  const submit = () => results[sel] ? go(results[sel].to) : q.trim() && go('#/search?q=' + encodeURIComponent(q.trim()))

  return (
    <motion.div ref={ref} className="cmdk" role="dialog" aria-modal="true" aria-label="Search the catalogue"
      initial={{ opacity: 0, y: -16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }} transition={spring.soft}>
      <form className="cmdk-input" onSubmit={e => { e.preventDefault(); submit() }}>
        <Search className="icon" />
        <input data-autofocus value={q} onChange={e => setQ(e.target.value)} placeholder="Try “inverter fridge” or “65 inch”" aria-label="Search products" role="combobox" aria-expanded={results.length > 0} aria-controls="cmdk-list" aria-activedescendant={results[sel] ? `cmdk-${sel}` : undefined}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(results.length - 1, s + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
          }} />
        <button type="button" className="kbd-btn" onClick={onClose} aria-label="Close search">Esc</button>
      </form>
      <div className="cmdk-body" data-lenis-prevent>
        {!q.trim() ? (
          <div className="cmdk-empty">
            {state.recentSearches.length > 0 && <>
              <p className="cmdk-label">Recent</p>
              <div className="chips">{state.recentSearches.map(s => <button key={s} type="button" className="chip" onClick={() => setQ(s)}><Clock className="icon" />{s}</button>)}</div>
            </>}
            <p className="cmdk-label">Popular right now</p>
            <div className="chips">{POPULAR.map(s => <button key={s} type="button" className="chip" onClick={() => setQ(s.replace(/ (refrigerator|AC)$/, '').replace('Inverter', 'inverter'))}>{s}</button>)}</div>
            <p className="cmdk-label">Browse by category</p>
            <div className="cmdk-cats">{CATEGORIES.map(c => <Link key={c} to={slug(c)} onClick={onClose} className="cmdk-cat"><ProductImage p={pick(c)} /><span>{c}<small>{COUNT[c]}</small></span></Link>)}</div>
            <p className="cmdk-label">Shortcuts</p>
            <div className="cmdk-pages">{PAGES.map(([l, to, I]) => <Link key={to} to={to} onClick={onClose}><I className="icon" />{l}<ChevronRight className="icon chev" /></Link>)}</div>
          </div>
        ) : results.length ? (
          <ul id="cmdk-list" role="listbox" className="cmdk-list">
            {results.map((r, i) => (
              <motion.li key={r.kind + (r.c || r.p.id)} id={`cmdk-${i}`} role="option" aria-selected={sel === i} layout="position"
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02, duration: 0.2 }}
                onPointerEnter={() => setSel(i)} onClick={() => go(r.to)} className={sel === i ? 'sel' : ''}>
                {sel === i && <motion.span layoutId="cmdksel" className="cmdk-sel" transition={spring.snappy} />}
                {r.kind === 'cat'
                  ? <><span className="cmdk-thumb cat"><LayoutGrid className="icon" /></span><span className="cmdk-text"><b>{r.c}</b><small>Category · {COUNT[r.c]} models</small></span></>
                  : <><span className="cmdk-thumb"><ProductImage p={r.p} /></span><span className="cmdk-text"><b>{r.p.name}</b><small>{r.p.category} · {r.p.sub}</small></span><span className="cmdk-price tnum">{money(r.p.price)}</span></>}
                <CornerDownLeft className="icon enter" />
              </motion.li>
            ))}
            {total > 7 && <li role="option" aria-selected={false} className="cmdk-all" onClick={() => go('#/search?q=' + encodeURIComponent(q.trim()))}>See all {total} results for “{q.trim()}” <ArrowRight className="icon" /></li>}
          </ul>
        ) : (
          <div className="cmdk-none"><b>No matches for “{q}”.</b><p>Try a model number, a category or a simpler word like “fridge”.</p></div>
        )}
      </div>
      <div className="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>
    </motion.div>
  )
}
