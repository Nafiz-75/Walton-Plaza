import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowUpRight, House, MonitorPlay, Snowflake, Zap, Factory, Layers, Headset, Wallet, MapPin, Tv, Wind, WashingMachine, Sun, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, CAT_HINT, LIFE, PRODUCTS, P, pick, slug, money, FAQ } from '../lib/data'
import { useStore } from '../lib/store'
import { spring, ease } from '../lib/motion'
import { useGsap } from '../lib/gsap'
import { Accent, AnimatedNumber, Feature, Item, Magnetic, ProductImage, Reveal, Scene, SectionHead, Stagger, Title } from '../components/ui'
import ProductCard from '../components/ProductCard'
import Accordion from '../components/Accordion'

/* ---------------- Hero ----------------
   One real photograph: the WNR-6B0-GSRE-BD placed into a sunlit kitchen. The three benefits are the
   model's own feature badges, each pinned to the part of the fridge it describes; sub-lines quote its spec sheet. */
const HERO_BENEFITS = [
  { icon: MonitorPlay, title: 'Multimedia Hub', text: '21.5″ FHD display on the door', x: 60.8, y: 33 },
  { icon: Snowflake, title: 'Metal & Duo Cooling', text: 'Freezer −14 to −24 °C · fridge 1 to 8 °C', x: 60.8, y: 51 },
  { icon: Zap, title: 'Inverter Technology', text: 'BLDC inverter compressor', x: 60.8, y: 69 },
]
const TRUST = [[Factory, 'Made here.', 'For life in Bangladesh'], [Layers, 'Your choice.', 'Compare before you buy'], [Headset, 'Here to help.', 'Customer care · 16267']]

function Hero() {
  const reduce = useReducedMotion()
  const p = P(LIFE.hero.id)
  const [active, setActive] = useState(null)
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 90])
  const copyY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -40])
  const line = { hidden: { y: '105%' }, show: i => ({ y: '0%', transition: { duration: 0.9, delay: 0.15 + i * 0.14, ease: ease.out } }) }
  const up = d => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.7, ease: ease.out } })

  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <div className="wrap hero-inner">
        <motion.div className="hero-copy" style={{ y: copyY }}>
          <motion.span className="eyebrow" {...up(0.05)}><House className="icon" /> Walton at every home</motion.span>
          <h1 id="hero-title" className="hero-title">
            <span className="sr-only">A little smarter. A lot more home.</span>
            {['A little smarter.', 'A lot more'].map((t, i) => (
              <span key={t} className="hl-mask" aria-hidden="true"><motion.span className="hl" custom={i} variants={line} initial="hidden" animate="show">{t}</motion.span></span>
            ))}
            <span className="hl-mask home" aria-hidden="true"><motion.span className="hl" custom={2} variants={line} initial="hidden" animate="show"><Accent swash delay={0.95}>home.</Accent></motion.span></span>
          </h1>
          <motion.p className="hero-lead" {...up(0.6)}>From the first cup of tea to the last movie of the night. Find technology that fits beautifully into your everyday.</motion.p>
          <motion.div className="hero-ctas" {...up(0.75)}>
            <Magnetic><Link className="btn lg" to="#/shop">Explore products <ArrowRight className="icon arrow" /></Link></Magnetic>
            <Link className="textlink" to="#/finder">Find your fit <ArrowUpRight className="icon" /></Link>
          </motion.div>
        </motion.div>
      </div>

      <div className="hero-media">
        <motion.div className="hero-stage" style={{ y: photoY }}>
          <motion.img src={LIFE.hero.src} alt={LIFE.hero.alt} fetchPriority="high" decoding="async" draggable="false"
            initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: ease.out }} />
          <span className="hero-fade" aria-hidden="true" />
          {HERO_BENEFITS.map((b, i) => (
            <motion.button key={b.title} type="button" className={'pin' + (active === i ? ' on' : '')} style={{ left: b.x + '%', top: b.y + '%' }}
              aria-label={`${b.title}: ${b.text}`} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.2 + i * 0.15, ...spring.bouncy }}>
              <span className="pin-dot" aria-hidden="true"><i /></span>
              <span className="pin-label"><Feature icon={b.icon} title={b.title} text={b.text} /></span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="hero-foot">
        <div className="wrap hero-foot-inner">
          <motion.aside className="hero-product" aria-label="Featured in the photo" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8, ease: ease.out }}>
            <ul className="hp-benefits">
              {HERO_BENEFITS.map((b, i) => (
                <li key={b.title} className={active === i ? 'on' : ''} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
                  <Feature icon={b.icon} title={b.title} text={b.text} />
                </li>
              ))}
            </ul>
            <Link to={`#/product/${p.id}`} className="hp-row">
              <span className="hp-thumb"><ProductImage p={p} /></span>
              <span className="hp-name"><b>{p.name}</b><small>{p.category}</small></span>
              <span className="hp-price"><b className="tnum">{money(p.price)}</b><small>Listed price</small></span>
              <span className="hp-go" aria-hidden="true"><ArrowRight className="icon" /></span>
            </Link>
          </motion.aside>
          <motion.ul className="hero-trust" aria-label="Why Walton Plaza" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 0.9 } } }}>
            {TRUST.map(([I, t, s]) => <motion.li key={t} variants={{ h: { opacity: 0, y: 10 }, s: { opacity: 1, y: 0 } }}><Feature icon={I} title={t} text={s} /></motion.li>)}
          </motion.ul>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Categories ---------------- */
function Categories() {
  return (
    <section className="section">
      <SectionHead eyebrow="A home for every need" title="What brings you" accent="here?" text="Find the right appliance, one everyday need at a time." link="#/shop" label="All categories" />
      <Stagger className="bento" each={0.05}>
        {CATEGORIES.map((c, i) => (
          <Item key={c} className={'bento-cell b' + i}>
            <Link to={slug(c)} className="bento-tile">
              <span className="bento-copy"><b>{c}</b><small>{COUNT[c]} models · {CAT_HINT[c]}</small></span>
              <span className="bento-img"><ProductImage p={pick(c)} hd={i < 2} /></span>
              <span className="bento-arrow" aria-hidden="true"><ArrowUpRight className="icon" /></span>
            </Link>
          </Item>
        ))}
      </Stagger>
    </section>
  )
}

/* ---------------- A day at home: six real rooms, six real products ---------------- */
const DAY = [
  ['07:00', 'Morning ritual', 'The first cup of tea, the first blend of the day.', 'kitchen', Sun],
  ['09:30', 'Fresh food', 'Room for the whole week, kept just right.', 'hero', Snowflake],
  ['14:00', 'Cool afternoon', 'Comfort that quietly finds its level.', 'bedroom', Wind],
  ['17:30', 'Laundry, sorted', 'Wash and dry in one. More evening for you.', 'laundry', WashingMachine],
  ['20:30', 'Movie night', 'A bigger picture. A closer feeling.', 'living', Tv],
  ['22:00', 'A gentle breeze', 'Quiet, easy cooling for the reading hour.', 'reading', Clock],
]
function DayPanel({ d }) {
  const [time, title, text, key, Icon] = d
  const s = LIFE[key], p = P(s.id)
  return (
    <article className="day-panel">
      <img src={s.src} alt={s.alt} loading="lazy" decoding="async" draggable="false" />
      <span className="day-shade" aria-hidden="true" />
      <div className="day-copy">
        <span className="day-time tnum"><Icon className="icon" />{time}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <Link to={`#/product/${p.id}`} className="day-product">
        <span className="dp-thumb"><ProductImage p={p} /></span>
        <span className="dp-text"><b>{p.name}</b><small>{p.category} · <span className="tnum">{money(p.price)}</span></small></span>
        <ArrowUpRight className="icon" aria-hidden="true" />
      </Link>
    </article>
  )
}
const DayHead = ({ pin }) => (
  <div className="wrap day-head">
    <div><span className="eyebrow"><Sun className="icon" />A day at home</span><h2>From sunrise to <Accent>lights out.</Accent></h2></div>
    <p className="lead">Every hour has its helper, photographed where it lives. {pin ? 'Keep scrolling to walk through the day.' : 'Swipe through the day.'}</p>
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
      <div className="day-scroller" role="list">{DAY.map(d => <div role="listitem" key={d[0]}><DayPanel d={d} /></div>)}</div>
    </section>
  )
}
function DayPinned() {
  const outer = useRef(null), bar = useRef(null)
  // GSAP pin + scrub: the section holds still while the day scrolls sideways; each photo eases in from a slight zoom.
  useGsap(outer, (gsap, root) => {
    const track = root.querySelector('.day-track')
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80)
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: root, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: st => { if (bar.current) bar.current.style.transform = `scaleX(${st.progress})` },
      },
    })
    root.querySelectorAll('.day-panel img').forEach(img => {
      gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'center center', scrub: true } })
    })
  })
  return (
    <section className="day pinned" ref={outer}>
      <div className="day-sticky">
        <DayHead pin />
        <div className="day-track">{DAY.map(d => <DayPanel key={d[0]} d={d} />)}</div>
        <div className="wrap"><div className="day-bar"><span ref={bar} /></div></div>
      </div>
    </section>
  )
}

/* ---------------- Featured tabs ---------------- */
function Featured() {
  const [cat, setCat] = useState('All')
  const list = cat === 'All' ? CATEGORIES.slice(0, 8).map(pick).filter(Boolean) : PRODUCTS.filter(p => p.category === cat).slice(0, 8)
  return (
    <section className="section">
      <SectionHead eyebrow="Meet your next favourite" title="Good things for your" accent="everyday." text="Explore the range. Compare the details. Make it yours." link="#/shop" label="Shop the range" />
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

/* ---------------- Family story ---------------- */
function FamilyStory() {
  return (
    <section className="section story">
      <Scene className="story-photo" src={LIFE.family.src} alt={LIFE.family.alt} ratio="3 / 2" />
      <Reveal className="story-copy">
        <span className="eyebrow"><House className="icon" />Made for life in Bangladesh</span>
        <h2>Technology that fits the way we <Accent>live.</Accent></h2>
        <p className="lead">Big families, long evenings, hot afternoons and early mornings. Walton builds for the homes it knows best, and every model here comes with its full specification sheet.</p>
        <div className="row gap wrap-row">
          <Link className="btn outline" to="#/about">Our approach <ArrowRight className="icon arrow" /></Link>
          <Link className="textlink" to="#/stores">See it at a Plaza <ArrowUpRight className="icon" /></Link>
        </div>
      </Reveal>
    </section>
  )
}

/* ---------------- Stats ---------------- */
function Stats() {
  const stats = [[PRODUCTS.length, 'models to explore'], [CATEGORIES.length, 'everyday categories'], [3, 'models side by side'], [16267, 'customer care line']]
  return (
    <Stagger className="stats">
      {stats.map(([n, l]) => (
        <Item key={l} className="stat">
          <strong>{n === 16267 ? <span className="tnum">16267</span> : <AnimatedNumber value={n} onView />}</strong>
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
          <h2>The right fit. For your kind of <Accent>home.</Accent></h2>
          <p>Start with what matters to you. Narrow the range by category and budget, then compare your favourites before you decide.</p>
          <Magnetic><Link className="btn lg" to="#/finder">Help me choose <ArrowRight className="icon arrow" /></Link></Magnetic>
        </div>
        <Stagger className="fb-tiles" each={0.07}>
          {[[Snowflake, 'Refrigerators', 'Fresh possibilities'], [Tv, 'Televisions', 'Your next movie night'], [Wind, 'Air conditioners', 'Comfort comes home'], [WashingMachine, 'Washing machines', 'A little less laundry day']].map(([I, c, s]) => (
            <Item key={c}>
              <Link to={`#/finder?category=${encodeURIComponent(c)}`} className="fb-tile">
                <Feature icon={I} title={c} text={s} />
                <ArrowUpRight className="icon fb-arrow" aria-hidden="true" />
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
      <SectionHead eyebrow="Pick up where you left off" title="Recently" accent="viewed." link="#/account" label="Your space" />
      <div className="product-grid">{list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <div className="wrap"><Categories /></div>
      <DayAtHome />
      <div className="wrap">
        <Featured />
        <FamilyStory />
        <Stats />
        <FinderBand />
        <Recently />
        <section className="section">
          <SectionHead eyebrow="Make yourself at home" title="Here for the whole" accent="journey." text="A considered purchase deserves thoughtful support." />
          <Stagger className="editorial">
            <Item className="ed-card">
              <Feature icon={Wallet} title="Plan before you decide" />
              <h3>Your budget. A clearer picture.</h3>
              <p>Explore a payment estimate with your own deposit and plan charge. See the total, alongside the monthly amount.</p>
              <Link className="textlink" to="#/finance">Open payment planner <ArrowRight className="icon arrow" /></Link>
            </Item>
            <Item className="ed-card">
              <Feature icon={MapPin} title="Online to in person" />
              <h3>See it. Feel it. Make it yours.</h3>
              <p>Shortlist your favourites here, then connect with Walton for product availability, installation and local assistance.</p>
              <Link className="textlink" to="#/stores">Find a Walton Plaza <ArrowRight className="icon arrow" /></Link>
            </Item>
          </Stagger>
        </section>
        <section className="section faq-home">
          <SectionHead eyebrow="Always within reach" title="Everyday questions. Helpful" accent="answers." link="#/support" label="Visit support" />
          <Reveal><Accordion items={FAQ.slice(0, 4)} initial="warranty" /></Reveal>
        </section>
      </div>
    </>
  )
}
