import { Fragment, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useInView, useScroll, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sun, Moon } from 'lucide-react'
import logo from '../assets/brand/walton-wordmark.svg?raw' // official WALTON wordmark (waltonbd.com), colour follows the theme
import emblem from '../assets/brand/walton-emblem.svg' // official "W" emblem in Walton blue + red
import emblemWhite from '../assets/brand/walton-emblem-white.svg' // official white emblem for dark backgrounds
import { Link } from '../lib/router'
import { fadeUp, inView, stagger, spring } from '../lib/motion'
import { imgSrc, amount } from '../lib/data'
import { useStore } from '../lib/store'

export function Logo({ className = '' }) {
  return <span className={'logo ' + className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo.replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '') }} />
}

export function Emblem({ className = '' }) {
  return (
    <span className={'brand-emblem ' + className} aria-hidden="true">
      <img className="em-color" src={emblem} alt="" width="48" height="24" draggable="false" />
      <img className="em-white" src={emblemWhite} alt="" width="48" height="24" draggable="false" />
    </span>
  )
}

export function Brand({ light }) {
  return (
    <Link to="#/" className={'brand' + (light ? ' light' : '')} aria-label="Walton Plaza home">
      <Emblem /><Logo /><span className="brand-tag">PLAZA</span>
    </Link>
  )
}

/** Fades + rises children into view once. */
export function Reveal({ as = 'div', children, delay = 0, className, ...rest }) {
  const C = motion[as]
  return (
    <C className={className} {...inView} variants={{ hidden: fadeUp.hidden, show: { ...fadeUp.show, transition: { ...fadeUp.show.transition, delay } } }} {...rest}>
      {children}
    </C>
  )
}
export function Stagger({ as = 'div', each = 0.06, delay = 0, children, className, ...rest }) {
  const C = motion[as]
  return <C className={className} {...inView} variants={stagger(each, delay)} {...rest}>{children}</C>
}
export const Item = ({ as = 'div', children, ...rest }) => { const C = motion[as]; return <C variants={fadeUp} {...rest}>{children}</C> }

/** Splits a headline into words that rise from a mask. */
export function SplitText({ text, className, delay = 0, as = 'span' }) {
  const C = motion[as]
  const words = text.split(' ')
  return (
    <C className={className} initial="hidden" animate="show" variants={stagger(0.06, delay)}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split-mask" aria-hidden="true">
            <motion.span className="split-word" variants={{ hidden: { y: '110%' }, show: { y: '0%', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } }}>{w}</motion.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </C>
  )
}

/** Counts smoothly toward `value` whenever it changes (or when scrolled into view). */
export function AnimatedNumber({ value, format = v => Math.round(v).toLocaleString('en-IN'), onView = false, className }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const mv = useMotionValue(onView ? 0 : value)
  const s = useSpring(mv, { stiffness: 90, damping: 22, mass: 0.8 })
  const text = useTransform(s, format)
  useEffect(() => { if (!onView || seen) mv.set(value) }, [value, seen, onView, mv])
  return <motion.span ref={ref} className={'tnum ' + (className || '')}>{text}</motion.span>
}

/** Gently follows the cursor — fine pointers only. */
export function Magnetic({ children, strength = 0.28, className }) {
  const x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, spring.soft), sy = useSpring(y, spring.soft)
  return (
    <motion.span className={'magnetic ' + (className || '')} style={{ x: sx, y: sy }}
      onPointerMove={e => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength); y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => { x.set(0); y.set(0) }}>
      {children}
    </motion.span>
  )
}

/** Hand-drawn underline: draws itself once when it scrolls into view. */
export function Scribble({ className = '', delay = 0.2 }) {
  return (
    <svg className={'scribble ' + className} viewBox="0 0 240 22" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d="M3 15.5C48 7.8 104 5.2 157 6.6c27 .7 52 2.6 80 6.2" fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay, ease: [0.65, 0, 0.35, 1] }} />
    </svg>
  )
}

/** The handwritten accent: one word or phrase per heading, in Walton blue, underlined by hand.
 *  Plain inline text (the underline is a background that draws in), so it flows and wraps like the words around it.
 *  `swash` uses a real SVG stroke instead, for a headline line that stands on its own (the hero). */
export function Accent({ children, line = true, delay = 0.2, swash = false }) {
  if (swash) return <span className="accent swash">{children}{line && <Scribble delay={delay} />}</span>
  return (
    <motion.span className={'accent' + (line ? ' lined' : '')} initial={line ? { backgroundSize: '0% 0.24em' } : false}
      whileInView={line ? { backgroundSize: '100% 0.24em' } : undefined} viewport={{ once: true }} transition={{ duration: 0.9, delay, ease: [0.65, 0, 0.35, 1] }}>
      {children}
    </motion.span>
  )
}

/** Heading text with an optional handwritten accent at the end. */
export const Title = ({ title, accent }) => <>{title}{accent && <>{' '}<Accent>{accent}</Accent></>}</>

export function SectionHead({ eyebrow, icon: Icon, title, accent, text, link, label = 'Explore all' }) {
  return (
    <Stagger className="sectionhead">
      <div>
        {eyebrow && <Item as="span" className="eyebrow">{Icon && <Icon className="icon" />}{eyebrow}</Item>}
        <Item as="h2"><Title title={title} accent={accent} /></Item>
        {text && <Item as="p" className="lead">{text}</Item>}
      </div>
      {link && <Item><Link className="textlink" to={link}>{label} <ArrowRight className="icon arrow" /></Link></Item>}
    </Stagger>
  )
}

/** A lifestyle photograph that drifts slightly against the scroll. Real products are photographed into each room. */
export function Scene({ src, alt, className = '', ratio, children, drift = 40, eager = false, position }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-drift, drift])
  return (
    <figure ref={ref} className={'scene ' + className} style={ratio ? { aspectRatio: ratio } : undefined}>
      <motion.img src={src} alt={alt} style={{ y, objectPosition: position }} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false"
        initial={{ scale: 1.06, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      {children}
    </figure>
  )
}

/** Icon + title + one line. Used for product benefits, trust promises and service notes. */
export function Feature({ icon: Icon, title, text, as = 'div', className = '', ...rest }) {
  const C = as
  return (
    <C className={'feature ' + className} {...rest}>
      <span className="feature-ico" aria-hidden="true"><Icon className="icon" /></span>
      <span className="feature-text"><b>{title}</b>{text && <small>{text}</small>}</span>
    </C>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="#/">Home</Link>
      {items.map(([label, to], i) => (
        <span key={i}><span aria-hidden="true" className="sep">{'  /  '}</span>{to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}</span>
      ))}
    </nav>
  )
}

export function PageHead({ eyebrow, icon: Icon, title, accent, text, children, photo, photoAlt = '', position }) {
  const head = (
    <header className={'pagehead' + (photo ? ' with-photo' : '')}>
      {eyebrow && <Reveal as="span" className="eyebrow">{Icon && <Icon className="icon" />}{eyebrow}</Reveal>}
      <h1><SplitText text={title} />{accent && <>{' '}<motion.span className="accent-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}><Accent delay={0.6}>{accent}</Accent></motion.span></>}</h1>
      {text && <Reveal as="p" className="lead" delay={0.15}>{text}</Reveal>}
      {children}
    </header>
  )
  if (!photo) return head
  return <div className="pagehead-split">{head}<Scene className="pagehead-photo" src={photo} alt={photoAlt} eager drift={24} position={position} /></div>
}

export function Empty({ icon: Icon, title, text, cta = ['Explore products', '#/shop'] }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft}>
      {Icon && <motion.div className="empty-icon" initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={spring.bouncy}><Icon /></motion.div>}
      <h2>{title}</h2>
      <p>{text}</p>
      {cta && <Link className="btn" to={cta[1]}>{cta[0]} <ArrowRight className="icon arrow" /></Link>}
    </motion.div>
  )
}

/** Product photo with a loading state: shimmers on itself until decoded, then fades in.
 *  Load state lives in React (not classList), so re-renders can never hide a loaded photo. */
export function ProductImage({ p, hd = false, eager = false, className = '', ...rest }) {
  const src = imgSrc(p, hd)
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const el = ref.current; setLoaded(!!(el && el.complete && el.naturalWidth)) }, [src])
  return <img ref={ref} className={'pimg ' + (loaded ? 'loaded ' : '') + className} src={src} alt={p.name} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false"
    onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} {...(eager ? { fetchPriority: 'high' } : {})} {...rest} />
}

/** Kept for API compatibility: the cursor glow was retired with the editorial redesign. */
export const spotlight = {}

/** Signature element: the yellow shelf price tag. Stamps into place once when it scrolls into view. */
export function PriceTag({ value, size = 'md', note, live = false, className = '' }) {
  if (!value) return <span className={'pricetag ask ' + size + ' ' + className}><span className="pt-hole" aria-hidden="true" /><span className="pt-amt">Price on request</span></span>
  return (
    <motion.span className={'pricetag ' + size + ' ' + className}
      initial={{ rotate: -12, scale: 1.18, opacity: 0 }} whileInView={{ rotate: -3, scale: 1, opacity: 1 }} viewport={{ once: true, margin: '0px 0px -6% 0px' }}
      transition={spring.bouncy}>
      <span className="pt-hole" aria-hidden="true" />
      <span className="pt-cur" aria-hidden="true">৳</span>
      <span className="pt-amt tnum">{live ? <AnimatedNumber value={value} format={v => amount(v)} /> : amount(value)}</span>
      <span className="sr-only">Taka</span>
      {note && <span className="pt-note">{note}</span>}
    </motion.span>
  )
}

/** Light / dark switch: a real switch (role=switch), knob slides, icon swaps. */
export function ThemeSwitch({ className = '' }) {
  const { state, dispatch } = useStore()
  const sysDark = typeof window !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = state.theme === 'dark' || (state.theme === 'system' && sysDark)
  return (
    <button type="button" role="switch" aria-checked={dark} className={'themeswitch' + (dark ? ' on' : '') + ' ' + className}
      onClick={() => dispatch({ type: 'theme', theme: dark ? 'light' : 'dark' })}>
      <span className="sr-only">Dark theme</span>
      <span className="ts-track" aria-hidden="true"><Sun className="ts-ico sun" /><Moon className="ts-ico moon" /></span>
      <motion.span className="ts-knob" aria-hidden="true" layout transition={spring.snappy}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={dark ? 'm' : 's'} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }} transition={spring.snappy} style={{ display: 'inline-flex' }}>
            {dark ? <Moon className="icon" /> : <Sun className="icon" />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  )
}
