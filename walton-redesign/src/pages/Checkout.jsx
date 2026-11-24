import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, ShoppingBag, Trash2, ShieldCheck, Truck, Lock, MapPin, Check } from 'lucide-react'
import { Link } from '../lib/router'
import { money } from '../lib/data'
import { useStore } from '../lib/store'
import { scrollTo } from '../lib/smooth'
import { spring, ease } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, PageHead, ProductImage } from '../components/ui'
import { Stepper } from '../components/overlays/Stepper'
import { Summary } from './Summary'

export const FIELDS = [
  ['name', 'Full name', 'text', 'name', v => v.trim().length >= 2 || 'Enter your full name (at least 2 letters).'],
  ['phone', 'Mobile number', 'tel', 'tel', v => /^[+0-9 ()-]{8,18}$/.test(v.trim()) || 'Enter a mobile number with 8–18 digits, e.g. 01XXXXXXXXX.'],
  ['address', 'Street address', 'textarea', 'street-address', v => v.trim().length >= 6 || 'Enter a street address so the Plaza can confirm coverage.'],
  ['city', 'City / district', 'text', 'address-level2', v => v.trim().length >= 2 || 'Enter your city or district.'],
]

export function Checkout() {
  const { cartEntries, subtotal, dispatch } = useStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', delivery: 'Home delivery', payment: 'Discuss cash payment' })
  const [touched, setTouched] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const summaryRef = useRef(null)
  const errors = Object.fromEntries(FIELDS.map(([k, , , , v]) => [k, v(form[k]) === true ? null : v(form[k])]))
  const invalid = FIELDS.filter(([k]) => errors[k])

  if (!cartEntries.length && step < 2) return (
    <div className="wrap"><Breadcrumbs items={[['Checkout']]} /><div className="section"><Empty icon={ShoppingBag} title="Your bag is empty." text="Add something you love, then come back to check out." /></div></div>
  )
  const go = n => { setStep(n); scrollTo(0, false) }
  const submit = e => {
    e.preventDefault()
    setTouched(Object.fromEntries(FIELDS.map(([k]) => [k, true])))
    if (invalid.length) { setShowSummary(true); setTimeout(() => summaryRef.current?.focus(), 30); return }
    setShowSummary(false); go(1)
  }

  return (
    <div className="wrap">
      <Breadcrumbs items={[['Bag', '#/cart'], ['Checkout']]} />
      <PageHead eyebrow="A considered purchase" title="Let’s bring it" accent="home." />
      <ol className="stepper" aria-label="Checkout progress">
        {['Your details', 'Review', 'Preview complete'].map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="fs-dot">{i < step ? <Check className="icon" /> : '0' + (i + 1)}</span>{s}
          </li>
        ))}
        <motion.span className="fs-bar" animate={{ scaleX: step / 2 }} transition={spring.soft} aria-hidden="true" />
      </ol>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" className="cart-layout" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30, transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease: ease.out }}>
            <form className="panel" onSubmit={submit} noValidate>
              <h2 className="h3">Delivery details</h2>
              <AnimatePresence>
                {showSummary && invalid.length > 0 && (
                  <motion.div ref={summaryRef} tabIndex={-1} className="error-summary" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <b>Please check {invalid.length} {invalid.length === 1 ? 'field' : 'fields'}:</b>
                    <ul>{invalid.map(([k, l]) => <li key={k}><a href={`#f-${k}`} onClick={e => { e.preventDefault(); document.getElementById('f-' + k)?.focus() }}>{l}</a></li>)}</ul>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="formgrid">
                {FIELDS.map(([k, label, type, ac]) => {
                  const err = touched[k] && errors[k]
                  const C = type === 'textarea' ? 'textarea' : 'input'
                  return (
                    <label key={k} className={'field' + (type === 'textarea' ? ' wide' : '') + (err ? ' invalid' : '') + (touched[k] && !errors[k] ? ' valid' : '')}>
                      <span>{label} <i aria-hidden="true">*</i></span>
                      <C id={'f-' + k} name={k} type={type === 'textarea' ? undefined : type} rows={type === 'textarea' ? 2 : undefined} autoComplete={ac} required value={form[k]}
                        aria-invalid={!!err} aria-describedby={err ? `e-${k}` : undefined}
                        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} onBlur={() => setTouched(t => ({ ...t, [k]: true }))} />
                      <AnimatePresence>{err && <motion.small id={`e-${k}`} className="field-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{err}</motion.small>}</AnimatePresence>
                    </label>
                  )
                })}
                <label className="field"><span>Delivery preference</span><select value={form.delivery} onChange={e => setForm(f => ({ ...f, delivery: e.target.value }))}><option>Home delivery</option><option>Discuss Plaza pickup</option></select></label>
                <label className="field"><span>Payment preference</span><select value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}><option>Discuss cash payment</option><option>Ask about card payment</option><option>Ask about instalments</option></select></label>
              </div>
              <div className="notice"><Lock className="icon" /> This is a local checkout demonstration. Your details stay in this page and are not sent to Walton.</div>
              <button className="btn lg" type="submit">Review preview order <ArrowRight className="icon arrow" /></button>
            </form>
            <Summary title="Order summary" />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="s1" className="cart-layout" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30, transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease: ease.out }}>
            <div className="panel">
              <h2 className="h3">Review your preview order</h2>
              <div className="review-grid">
                <div><span className="eyebrow sm">Deliver to</span><p><b>{form.name}</b><br />{form.address}<br />{form.city}<br />{form.phone}</p></div>
                <div><span className="eyebrow sm">Preferences</span><p>{form.delivery}<br />{form.payment}</p></div>
              </div>
              <ul className="review-items">{cartEntries.map(({ p, qty }) => <li key={p.id}><span className="ri-img"><ProductImage p={p} /></span><span>{p.name}<small>× {qty}</small></span><b className="tnum">{money(p.price * qty)}</b></li>)}</ul>
              <div className="notice">This preview will not place an order.</div>
              <div className="row gap">
                <button type="button" className="btn outline" onClick={() => go(0)}><ArrowLeft className="icon" /> Edit details</button>
                <button type="button" className="btn lg" onClick={() => { dispatch({ type: 'clearCart' }); go(2) }}>Complete preview <ArrowRight className="icon arrow" /></button>
              </div>
            </div>
            <Summary title="Order summary" />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="s2" className="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft}>
            <svg className="success-check" viewBox="0 0 80 80" aria-hidden="true">
              <motion.circle cx="40" cy="40" r="36" fill="none" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: ease.out }} />
              <motion.path d="M24 41l11 11 22-24" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.45, ease: ease.out }} />
            </svg>
            {Array.from({ length: 14 }, (_, i) => (
              <motion.i key={i} className="confetti" style={{ '--h': (i * 47) % 360 }} initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: 0, x: Math.cos(i / 14 * 6.28) * (120 + (i % 3) * 30), y: Math.sin(i / 14 * 6.28) * (90 + (i % 4) * 20) + 40, rotate: 220 }} transition={{ delay: 0.5, duration: 1.3, ease: ease.out }} aria-hidden="true" />
            ))}
            <h2>You’ve explored the full journey.</h2>
            <p>Your preview is complete. No order was placed and no payment was taken. Visit a Walton Plaza to confirm stock and bring it home.</p>
            <div className="row gap center">
              <Link className="btn lg" to="#/stores"><MapPin className="icon" /> Find a Plaza</Link>
              <Link className="btn outline lg" to="#/shop">Keep exploring</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
