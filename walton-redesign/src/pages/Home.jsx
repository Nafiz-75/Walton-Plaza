import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Pause, Play, BadgeCheck, Columns2, Wallet, Headphones, Snowflake, Tv, Wind, WashingMachine, MapPin, Sparkles, ShieldCheck, Truck, Zap } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, CAT_HINT, HERO_SCENES, PRODUCTS, P, pick, slug, money, FAQ } from '../lib/data'
import { useStore } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { useGsap } from '../lib/gsap'
import { AnimatedNumber, Item, Magnetic, PriceTag, ProductImage, Reveal, SectionHead, SplitText, Stagger, spotlight } from '../components/ui'
import ProductCard from '../components/ProductCard'
import Accordion from '../components/Accordion'

/* ---------------- Hero ---------------- */
function Hero() {
  const reduce = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(!reduce)
  const [hold, setHold] = useState(false)
  const scene = HERO_SCENES[idx]
  const p = pick(scene.cat)
  const next = () => setIdx(i => (i + 1) % HERO_SCENES.length)

  // pointer parallax
  const mx = useMotionValue(0), my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 120, damping: 20 }), sy = useSpring(my, { stiffness: 120, damping: 20 })
  const rotY = useTransform(sx, [-1, 1], [-9, 9]), rotX = useTransform(sy, [-1, 1], [7, -7])
  const imgX = useTransform(sx, [-1, 1], [-14, 14]), imgY = useTransform(sy, [-1, 1], [-10, 10])
  const orbX = useTransform(sx, [-1, 1], [30, -30]), orbY = useTransform(sy, [-1, 1], [20, -20])
  const orbXb = useTransform(orbX, v => -v)
  const chipX = useTransform(sx, [-1, 1], [18, -18])

  // scroll exit
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -60])
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.94])

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero-panel" style={{ scale: stageScale }}
        onPointerMove={e => { if (e.pointerType !== 'mouse' || reduce) return; const r = e.currentTarget.getBoundingClientRect(); mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1) }}
        onPointerLeave={() => { mx.set(0); my.set(0) }}>
        <motion.div className="orb orb-a" style={{ x: orbX, y: orbY }} aria-hidden="true" />
        <motion.div className="orb orb-b" style={{ x: orbXb, y: orbY }} aria-hidden="true" />
        <div className="hero-grid-lines" aria-hidden="true" />

        <motion.div className="hero-copy" style={{ y: copyY }}>
          <motion.span className="eyebrow pill-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Sparkles className="icon" /> Walton at every home
          </motion.span>
          <h1>
            <SplitText text="A little smarter." delay={0.15} />
            <br />
            <SplitText text="A lot more" delay={0.35} /> <SplitText className="grad" text="home." delay={0.5} />
          </h1>
          <motion.p className="hero-lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6, ease: ease.out }}>
            From the first cup of tea to the last movie of the night. Find technology that fits beautifully into your everyday.
          </motion.p>
          <motion.div className="row gap hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82, duration: 0.6, ease: ease.out }}>
            <Magnetic><Link className="btn light lg" to="#/shop">Explore products <ArrowRight className="icon arrow" /></Link></Magnetic>
            <Link className="textlink on-dark" to="#/finder">Find your fit <ArrowUpRight className="icon" /></Link>
          </motion.div>
          <motion.div className="hero-meta" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 1 } } }}>
            {[['Made here.', 'For life in Bangladesh'], ['Your choice.', 'Compare before you buy'], ['Here to help.', 'Customer care · 16267']].map(([a, b]) => (
              <motion.div key={a} variants={{ h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0 } }}><strong>{a}</strong><small>{b}</small></motion.div>
            ))}
          </motion.div>
        </motion.div>

        <div className="hero-stage" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
          <div className="stage-tabs">
            <div className="stage-tablist" role="tablist" aria-label="Featured scenes"
              onKeyDown={e => {
                const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return
                e.preventDefault(); const n = (idx + d + HERO_SCENES.length) % HERO_SCENES.length; setIdx(n)
                e.currentTarget.querySelectorAll('[role=tab]')[n]?.focus()
              }}>
              {HERO_SCENES.map((s, i) => (
                <button key={s.title} type="button" role="tab" aria-selected={idx === i} tabIndex={idx === i ? 0 : -1} onClick={() => { setIdx(i) }} className={idx === i ? 'on' : ''}>
                  {idx === i && <motion.span layoutId="herotab" className="tabpill" transition={spring.snappy} />}
                  <span className="tablabel">{s.title}</span>
                  {idx === i && playing && !hold && (
                    <motion.span key={idx} className="tabprogress" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 7, ease: 'linear' }} onAnimationComplete={next} />
                  )}
                </button>
              ))}
            </div>
            <button type="button" className="tabplay" onClick={() => setPlaying(v => !v)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
              {playing ? <Pause className="icon" /> : <Play className="icon" />}
            </button>
          </div>

          <div className="stage-art" style={{ perspective: 1000 }}>
            <div className="stage-ring" aria-hidden="true" />
            <motion.div className="stage-tilt" style={{ rotateX: rotX, rotateY: rotY }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={p.id} className="stage-product" style={{ x: imgX, y: imgY }}
                  initial={{ opacity: 0, scale: 0.86, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.06, y: -30, transition: { duration: 0.35 } }}
                  transition={{ duration: 0.8, ease: ease.out }}>
                  <ProductImage p={p} hd eager className="hero-img" />
                </motion.div>
              </AnimatePresence>
              <div className="stage-shadow" aria-hidden="true" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div key={'l' + idx} className="stage-chip top" style={{ x: chipX }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ delay: 0.25, ...spring.soft }}>
                <b>{scene.cat}</b><span>{scene.line}</span>
              </motion.div>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.div key={'b' + idx} className="stage-chip bottom" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ delay: 0.4, ...spring.soft }}>
                <Zap className="icon" /><span><b>{p.sub}</b>{CAT_HINT[p.category]}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="stage-foot">
            <div className="stage-name">
              <AnimatePresence mode="wait"><motion.span key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>{p.name}</motion.span></AnimatePresence>
              <small>{p.category}</small>
            </div>
            <div className="stage-price"><AnimatedNumber value={p.price || 0} format={v => money(v)} /><small>Listed price</small></div>
            <Magnetic strength={0.4}><Link className="iconbtn solid" to={`#/product/${p.id}`} aria-label={`View ${p.name}`}><ArrowRight className="icon" /></Link></Magnetic>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ---------------- Marquee ---------------- */
const BENEFITS = [[BadgeCheck, 'Real model details'], [Columns2, 'Side-by-side comparison'], [Wallet, 'See your budget clearly'], [Headphones, 'Walton customer care · 16267'], [ShieldCheck, 'Check warranty before you buy'], [Truck, 'Delivery confirmed by your Plaza'], [Sparkles, `${PRODUCTS.length} models to explore`]]
function Marquee() {
  const row = BENEFITS.map(([I, t], i) => <span key={i} className="mq-item"><I className="icon" />{t}</span>)
  return (
    <div className="marquee" aria-label="Why shop with Walton Plaza">
      <div className="mq-track" aria-hidden="true">{row}{row}</div>
      <ul className="sr-only">{BENEFITS.map(([, t]) => <li key={t}>{t}</li>)}</ul>
    </div>
  )
}

/* ---------------- Categories: solid aisle tiles ---------------- */
function Categories() {
  const ref = useRef(null)
  // photos drift slightly against the scroll so they feel placed in front of the tile
  useGsap(ref, (gsap, root) => {
    root.querySelectorAll('.bento-img').forEach((el, i) => {
      gsap.fromTo(el, { yPercent: 10 + (i % 3) * 3 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: el.closest('.bento-cell'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
    })
  })
  return (
    <section className="section" ref={ref}>
      <SectionHead eyebrow="A home for every need" title="What brings you here?" text="Find the right appliance, one everyday need at a time." link="#/shop" label="All categories" />
      <Stagger className="bento" each={0.05}>
        {CATEGORIES.map((c, i) => (
          <Item key={c} className={'bento-cell b' + i}>
            <Link to={slug(c)} className="bento-tile" {...spotlight}>
              <span className="bento-copy">
                <b>{c}</b>
                <small>{COUNT[c]} models · {CAT_HINT[c]}</small>
              </span>
              <span className="bento-img"><ProductImage p={pick(c)} hd={i < 2} /></span>
              <span className="bento-arrow" aria-hidden="true"><ArrowUpRight className="icon" /></span>
            </Link>
          </Item>
        ))}
      </Stagger>
    </section>
  )
}

/* ---------------- Featured tabs ---------------- */
function Featured() {
  const [cat, setCat] = useState('All')
  const list = cat === 'All' ? CATEGORIES.slice(0, 8).map(pick).filter(Boolean) : PRODUCTS.filter(p => p.category === cat).slice(0, 8)
  return (
    <section className="section">
      <SectionHead eyebrow="Meet your next favourite" title="Good things for your everyday." text="Explore the range. Compare the details. Make it yours." link="#/shop" label="Shop the range" />
      <div className="tabs" role="tablist" aria-label="Featured products">
        {['All', ...CATEGORIES.slice(0, 5)].map(c => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {cat === c && <motion.span layoutId="feattab" className="tabpill" transition={spring.snappy} />}
            <span className="tablabel">{c === 'All' ? 'For your home' : c}</span>
          </button>
        ))}
      </div>
      <motion.div className="product-grid" layout>
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((p, i) => <ProductCard key={p.id} p={p} index={i} layout />)}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

/* ---------------- A day at home (scroll-pinned horizontal story) ---------------- */
const DAY = [
  ['07:00', 'Morning ritual', 'The first cup of tea, the first blend of the day.', 'Kitchen appliances', 'acc98f09c2c1', 'warm'],
  ['09:30', 'Fresh food', 'Room for the whole week, kept just right.', 'Refrigerators', 'fc934d493c38', 'ice'],
  ['14:00', 'Cool afternoon', 'Comfort that quietly finds its level.', 'Air conditioners', '6af62ea3911a', 'mint'],
  ['17:30', 'Laundry, sorted', 'Wash and dry in one. More evening for you.', 'Washing machines', '9f797fcbb782', 'lilac'],
  ['20:30', 'Movie night', 'A bigger picture. A closer feeling.', 'Televisions', 'c6d5374847d3', 'night'],
  ['23:00', 'A gentle breeze', 'Quiet, efficient air for a restful night.', 'Fans', 'ef1f7e929560', 'dusk'],
]
function DayPanel({ d, i }) {
  const [time, title, text, cat, id, tone] = d
  const p = P(id) || pick(cat)
  return (
    <article className={'day-panel tone-' + tone}>
      <div className="day-copy">
        <span className="day-time tnum">{time}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        <Link className="textlink" to={slug(cat)}>Explore {cat.toLowerCase()} <ArrowRight className="icon arrow" /></Link>
      </div>
      <Link to={`#/product/${p.id}`} className="day-img" aria-label={p.name}><ProductImage p={p} hd /></Link>
      <span className="day-index tnum" aria-hidden="true">0{i + 1}</span>
    </article>
  )
}
const DayHead = ({ pin }) => (
  <div className="wrap day-head">
    <div><span className="eyebrow">A day at home</span><h2>From sunrise to lights out.</h2></div>
    <p className="lead">Every hour has its helper. {pin ? 'Keep scrolling to walk through the day.' : 'Swipe through the day.'}</p>
  </div>
)
function DayAtHome() {
  const reduce = useReducedMotion()
  const [pin, setPin] = useState(() => matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    const mq = matchMedia('(min-width: 900px)')
    const f = () => setPin(mq.matches); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  if (pin && !reduce) return <DayPinned />
  return (
    <section className="section day static">
      <DayHead />
      <div className="day-scroller" role="list">{DAY.map((d, i) => <div role="listitem" key={d[0]}><DayPanel d={d} i={i} /></div>)}</div>
    </section>
  )
}
function DayPinned() {
  const outer = useRef(null), bar = useRef(null)
  // GSAP pin + scrub: the section holds still while the day scrolls sideways, with the progress bar tracking the hour.
  useGsap(outer, (gsap, root) => {
    const track = root.querySelector('.day-track')
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80)
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: root, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: st => { if (bar.current) bar.current.style.transform = `scaleX(${st.progress})` },
      },
    })
  })
  return (
    <section className="day pinned" ref={outer}>
      <div className="day-sticky">
        <DayHead pin />
        <div className="day-track">{DAY.map((d, i) => <DayPanel key={d[0]} d={d} i={i} />)}</div>
        <div className="wrap"><div className="day-bar"><span ref={bar} /></div></div>
      </div>
    </section>
  )
}

/* ---------------- Promos with parallax ---------------- */
function Promo({ eyebrow, title, text, link, label, p, warm }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])
  const r = useTransform(scrollYProgress, [0, 1], [-3, 3])
  return (
    <Reveal as="article" className={'promo' + (warm ? ' warm' : '')} ref={ref}>
      <div className="promo-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h3>{title[0]}<br />{title[1]}</h3>
        <p>{text}</p>
        <Link className="textlink" to={link}>{label} <ArrowRight className="icon arrow" /></Link>
      </div>
      <motion.div className="promo-img" style={{ y, rotate: r }}><ProductImage p={p} hd /></motion.div>
    </Reveal>
  )
}

/* ---------------- Stats ---------------- */
function Stats() {
  const stats = [[PRODUCTS.length, 'models to explore', ''], [CATEGORIES.length, 'everyday categories', ''], [3, 'models side by side', 'Up to '], [16267, 'customer care line', '']]
  return (
    <Stagger className="stats">
      {stats.map(([n, l, pre]) => (
        <Item key={l} className="stat">
          <strong>{pre && <small>{pre}</small>}{n === 16267 ? <span className="tnum">16267</span> : <AnimatedNumber value={n} onView />}</strong>
          <span>{l}</span>
        </Item>
      ))}
    </Stagger>
  )
}

/* ---------------- Finder band ---------------- */
function FinderBand() {
  return (
    <section className="section">
      <Reveal className="feature-band">
        <div className="fb-copy">
          <span className="eyebrow">Less searching. More living.</span>
          <h2>The right fit.<br />For your kind of home.</h2>
          <p>Start with what matters to you. Narrow the range by category and budget, then compare your favourites before you decide.</p>
          <Magnetic><Link className="btn light lg" to="#/finder">Help me choose <ArrowRight className="icon arrow" /></Link></Magnetic>
        </div>
        <Stagger className="fb-tiles" each={0.07}>
          {[[Snowflake, 'Refrigerators', 'Fresh possibilities'], [Tv, 'Televisions', 'Your next movie night'], [Wind, 'Air conditioners', 'Comfort comes home'], [WashingMachine, 'Washing machines', 'A little less laundry day']].map(([I, c, s]) => (
            <Item key={c}>
              <Link to={`#/finder?category=${encodeURIComponent(c)}`} className="fb-tile" {...spotlight}>
                <motion.span className="fb-icon" whileHover={{ rotate: -8, scale: 1.1 }} transition={spring.bouncy}><I className="icon" /></motion.span>
                <b>{c}</b><small>{s}</small><ArrowUpRight className="icon fb-arrow" />
              </Link>
            </Item>
          ))}
        </Stagger>
      </Reveal>
    </section>
  )
}

function Recently() {
  const { state } = useStore()
  const list = state.recent.map(P).filter(Boolean).slice(0, 4)
  if (!list.length) return null
  return (
    <section className="section">
      <SectionHead eyebrow="Pick up where you left off" title="Recently viewed." link="#/account" label="Your space" />
      <div className="product-grid">{list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
    </section>
  )
}

export default function Home() {
  const tv = P('ce27ef16ab49') || pick('Televisions'), kitchen = P('a499e75be6ca') || pick('Kitchen appliances')
  return (
    <>
      <div className="wrap"><Hero /></div>
      <Marquee />
      <div className="wrap">
        <Categories />
        <Featured />
      </div>
      <DayAtHome />
      <div className="wrap">
        <section className="section promos">
          <Promo eyebrow="Your front-row seat" title={['A bigger picture.', 'A closer feeling.']} text="Discover televisions for everything you love to watch." link={slug('Televisions')} label="Find your screen" p={tv} />
          <Promo eyebrow="Made for the daily ritual" title={['Little helpers.', 'Lovely possibilities.']} text="Make more of your time at home, one small helper at a time." link={slug('Home appliances')} label="Explore home appliances" p={kitchen} warm />
        </section>
        <Stats />
        <FinderBand />
        <Recently />
        <section className="section">
          <SectionHead eyebrow="Make yourself at home" title="Here for the whole journey." text="A considered purchase deserves thoughtful support." />
          <Stagger className="editorial">
            <Item className="ed-card" {...spotlight}>
              <Wallet className="icon ed-icon" /><span className="eyebrow">Plan before you decide</span>
              <h3>Your budget. A clearer picture.</h3>
              <p>Explore a payment estimate with your own deposit and plan charge. See the total, alongside the monthly amount.</p>
              <Link className="textlink" to="#/finance">Open payment planner <ArrowRight className="icon arrow" /></Link>
            </Item>
            <Item className="ed-card" {...spotlight}>
              <MapPin className="icon ed-icon" /><span className="eyebrow">Online to in person</span>
              <h3>See it. Feel it. Make it yours.</h3>
              <p>Shortlist your favourites here, then connect with Walton for product availability, installation and local assistance.</p>
              <Link className="textlink" to="#/stores">Find a Walton Plaza <ArrowRight className="icon arrow" /></Link>
            </Item>
          </Stagger>
        </section>
        <section className="section faq-home">
          <SectionHead eyebrow="Always within reach" title="Everyday questions. Helpful answers." link="#/support" label="Visit support" />
          <Reveal><Accordion items={FAQ.slice(0, 4)} initial="warranty" /></Reveal>
        </section>
      </div>
    </>
  )
}
