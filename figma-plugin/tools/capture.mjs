// Captures the built Walton Plaza site into Figma-ready JSON.
// Usage:  1) serve walton-redesign/dist on http://localhost:5181   2) node capture.mjs
// Output: ../data/screens/*.json and ../data/img/* (PNG/JPG, Figma cannot import WebP)
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.SITE || 'http://localhost:5181/'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = path.join(HERE, '..', 'data')
const SERIALIZE = fs.readFileSync(path.join(HERE, 'serialize2.js'), 'utf8') // v2: auto-layout aware
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true })

const PRODUCT = 'fc934d493c38'
const STATE = { cart: { [PRODUCT]: 1, c6d5374847d3: 1 }, wish: ['6af62ea3911a', '9f797fcbb782'], compare: [PRODUCT, '57f2efa046cb'], recent: ['c6d5374847d3', '9f797fcbb782', 'acc98f09c2c1'], recentSearches: ['inverter fridge'] }

// [key, route, label, options]
const PAGES = [
  ['home', '', 'Home'],
  ['shop', 'shop', 'Shop · All products'],
  ['category', 'shop/Televisions', 'Shop · Category'],
  ['search', 'search?q=inverter', 'Search results'],
  ['product', 'product/' + PRODUCT, 'Product detail'],
  ['compare', 'compare', 'Compare'],
  ['finder', 'finder', 'Product finder'],
  ['finance', 'finance', 'Payment planner'],
  ['wishlist', 'wishlist', 'Wishlist'],
  ['cart', 'cart', 'Shopping bag'],
  ['checkout', 'checkout', 'Checkout · 1 Details'],
  ['checkout-2', 'checkout', 'Checkout · 2 Review', { act: 'checkout2' }],
  ['checkout-3', 'checkout', 'Checkout · 3 Complete', { act: 'checkout3' }],
  ['support', 'support', 'Help & support'],
  ['stores', 'stores', 'Find a Plaza'],
  ['account', 'account', 'Your space'],
  ['about', 'about', 'About'],
  ['sources', 'sources', 'Catalogue sources'],
  ['privacy', 'privacy', 'Privacy'],
  ['404', 'not-a-page', 'Not found'],
]
// Overlay states: captured at viewport size, page underneath included.
const STATES = [
  ['state-search', '', 'Overlay · Search', { act: 'search' }],
  ['state-cart', '', 'Overlay · Bag drawer', { act: 'cart' }],
  ['state-quick', 'shop', 'Overlay · Quick view', { act: 'quick', device: 'd' }],
  ['state-mega', '', 'Overlay · All categories', { act: 'mega', device: 'd' }],
  ['state-menu', '', 'Overlay · Menu', { act: 'menu', device: 'm' }],
  ['state-filters', 'shop', 'Overlay · Filters', { act: 'filters', device: 'm' }],
]
// Desktop at 1920 (the user's screen size); mobile at 402 (iPhone 16 Pro / 17 width)
const DEVICES = { d: { width: 1920, height: 1080, deviceScaleFactor: 1 }, m: { width: 402, height: 874, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } }
const THEMES = ['light', 'dark']

const LINKS = [
  ['a[href^="#/"]', '@href'],
  ['.searchtrigger', 'state:state-search'], ['button[aria-label="Search"]', 'state:state-search'],
  ['#cart-target', 'state:state-cart'],
  ['button[aria-label="Open menu"]', 'state:state-menu'],
  ['button.navlink.cats', 'state:state-mega'],
  ['.themeswitch', 'theme'],
  ['.quick', 'state:state-quick'],
  ['.mobile-filter', 'state:state-filters'],
  ['button[aria-label^="Close"]', 'back'], ['.scrim', 'back'],
  ['form.panel button[type="submit"]', 'state:checkout-2'],
]
const COMPONENTS = [
  ['.brand', 'Walton logo'], ['header.header', 'Header'], ['footer.footer', 'Footer'], ['.mobile-nav', 'Mobile nav'],
  ['.card[data-card]', 'Product card'], ['.hero-product', 'Hero product card'], ['.day-panel', 'Day story card'], ['.comparebar', 'Compare tray'], ['.addbtn', 'Add button'], ['.themeswitch', 'Theme switch'],
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function act(pg, a) {
  const click = async sel => { // first *visible* match (desktop and mobile hide different controls)
    const ok = await pg.waitForFunction(s => [...document.querySelectorAll(s)].some(e => e.offsetParent && e.getBoundingClientRect().width), { timeout: 8000 }, sel).catch(() => null)
    if (!ok) throw new Error('No visible ' + sel)
    await pg.evaluate(s => [...document.querySelectorAll(s)].find(e => e.offsetParent && e.getBoundingClientRect().width).click(), sel); await sleep(900) }
  if (a === 'search') await click('.searchtrigger, button[aria-label="Search"]:not(.searchtrigger)')
  if (a === 'cart') await click('#cart-target')
  if (a === 'menu') await click('button[aria-label="Open menu"]')
  if (a === 'mega') await click('button.navlink.cats')
  if (a === 'quick') await click('.card .quick')
  if (a === 'filters') await click('.mobile-filter')
  if (a === 'checkout2' || a === 'checkout3') {
    await pg.evaluate(() => {
      const set = (sel, v) => { const e = document.querySelector(sel); if (!e) return; const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }
      set('[name=name]', 'Nusrat Jahan'); set('[name=phone]', '01712 345678'); set('[name=address]', 'House 12, Road 5, Dhanmondi'); set('[name=city]', 'Dhaka')
    })
    await sleep(200); await click('form.panel button[type="submit"]'); await sleep(500)
    if (a === 'checkout3') { await pg.evaluate(() => [...document.querySelectorAll('button')].find(b => /Complete preview/.test(b.textContent))?.click()); await sleep(1200) }
  }
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: true })
const index = []
const allImages = new Set()
for (const [dk, vp] of Object.entries(DEVICES)) for (const theme of THEMES) {
  const pg = await b.newPage(); await pg.setViewport(vp)
  await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  // keep the catalogue at its first 24 items (infinite loading would otherwise fire while we reveal the page)
  await pg.evaluateOnNewDocument(() => { const IO = window.IntersectionObserver; window.IntersectionObserver = class extends IO { observe(t) { if (t.classList && t.classList.contains('loadmore')) return; super.observe(t) } } })
  pg.on('pageerror', e => console.log('  pageerror', String(e).slice(0, 120)))
  await pg.goto(BASE, { waitUntil: 'networkidle0' })
  await pg.evaluate((s, t) => localStorage.setItem('walton-plaza-v2', JSON.stringify({ ...s, theme: t })), STATE, theme)
  for (const [key, route, label, o = {}] of [...PAGES, ...STATES]) {
    if (o.device && o.device !== dk) continue
    if (process.env.ONLY && !new RegExp(process.env.ONLY).test(`${dk}-${theme}-${key}`)) continue
    if ((key === 'checkout-2' || key === 'checkout-3' || key === 'checkout') ) await pg.evaluate((s, t) => localStorage.setItem('walton-plaza-v2', JSON.stringify({ ...s, theme: t })), STATE, theme)
    await pg.goto(BASE + '#/' + route, { waitUntil: 'networkidle0' }); await pg.reload({ waitUntil: 'networkidle0' })
    await sleep(500)
    const isState = key.startsWith('state-')
    if (!isState) { // reveal every in-view animation and lazy image, then return to the top
      await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } scrollTo(0, 0) })
      await sleep(1800) // let staggered reveal / layout animations settle
    }
    if (o.act) await act(pg, o.act)
    await pg.evaluate(async () => { await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 3000) }))) })
    await pg.evaluate(() => scrollTo(0, 0)); await sleep(400)
    // scroll-linked decoration (footer wordmark): use its resting state so every page shares one Footer
    await pg.evaluate(() => document.querySelectorAll('.footer-sign').forEach(e => { e.style.transform = 'none'; e.style.opacity = '1' }))
    await pg.evaluate(SERIALIZE)
    const data = await pg.evaluate((links, comps, clip) => window.__waltonSerialize2({ links, components: comps, clipToViewport: clip }), LINKS, COMPONENTS, isState)
    data.images.forEach(i => allImages.add(i))
    const id = `${dk}-${theme}-${key}`
    fs.writeFileSync(path.join(OUT, 'screens', id + '.json'), JSON.stringify({ id, key, route, label, device: dk, theme, state: isState, ...data }))
    index.push({ id, key, route, label, device: dk, theme, state: isState })
    console.log(id, data.w + 'x' + data.h, (JSON.stringify(data).length / 1024).toFixed(0) + 'KB')
  }
  await pg.close()
}
await b.close()
// rebuild index & image list from every screen on disk (so partial re-captures merge cleanly)
const order = id => { const [dv, th, ...k] = id.split('-'); const key = k.join('-'); const all = [...PAGES, ...STATES].map(p => p[0]); return (dv === 'd' ? 0 : 1e4) + (th === 'light' ? 0 : 1e3) + all.indexOf(key) }
const ids = fs.readdirSync(path.join(OUT, 'screens')).map(f => f.replace(/\.json$/, '')).sort((a, c) => order(a) - order(c))
const fullIndex = [], imgs = new Set()
for (const id of ids) { const d = JSON.parse(fs.readFileSync(path.join(OUT, 'screens', id + '.json'), 'utf8')); fullIndex.push({ id, key: d.key, route: d.route, label: d.label, device: d.device, theme: d.theme, state: d.state }); d.images.forEach(i => imgs.add(i)) }
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(fullIndex, null, 1))
fs.writeFileSync(path.join(OUT, 'images.json'), JSON.stringify([...imgs]))
console.log('screens', fullIndex.length, 'images', imgs.size)
