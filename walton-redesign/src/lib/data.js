import RAW from '../data/products.json'

export const PRODUCTS = RAW
const BY_ID = new Map(RAW.map(p => [p.id, p]))
export const P = id => BY_ID.get(id)

export const CATEGORY_ORDER = ['Refrigerators', 'Televisions', 'Air conditioners', 'Washing machines', 'Kitchen appliances', 'Home appliances', 'Fans', 'Computers', 'Mobile phones']
export const CATEGORIES = CATEGORY_ORDER.filter(c => RAW.some(p => p.category === c))
export const COUNT = Object.fromEntries(CATEGORIES.map(c => [c, RAW.filter(p => p.category === c).length]))

export const CAT_HINT = {
  'Refrigerators': 'Keep the good things fresh',
  'Televisions': 'Bring stories to life',
  'Air conditioners': 'Find your comfort zone',
  'Washing machines': 'Make room for life',
  'Kitchen appliances': 'More joy in every meal',
  'Home appliances': 'Little everyday helpers',
  'Fans': 'A breeze for every room',
  'Computers': 'Create. Work. Play.',
  'Mobile phones': 'Your world, connected',
}

// Hand-picked hero/feature models — the ones that ship with high-resolution photography.
const FEATURED = {
  'Refrigerators': 'fc934d493c38',
  'Televisions': 'c6d5374847d3',
  'Air conditioners': '6af62ea3911a',
  'Washing machines': '9f797fcbb782',
  'Kitchen appliances': 'acc98f09c2c1',
  'Home appliances': 'a499e75be6ca',
  'Fans': 'ef1f7e929560',
  'Computers': '50ad277e7e39',
}
export function pick(c) {
  if (FEATURED[c] && P(FEATURED[c])) return P(FEATURED[c])
  return RAW.find(p => p.category === c && p.price) || RAW.find(p => p.category === c)
}

export const imgSrc = (p, hd = false) => `./img/${p.id}${hd && p.hd ? '-hd' : ''}.webp`
export const slug = c => '#/shop/' + encodeURIComponent(c)

const fmt = new Intl.NumberFormat('en-IN')
export const amount = n => fmt.format(Math.round(n || 0))
export const money = n => (n || n === 0) && n !== null ? '৳' + fmt.format(Math.round(n)) : 'Price on request'
export const moneyPlain = n => '৳' + fmt.format(Math.round(n || 0))

export const isInverter = p => /inverter|bldc/i.test(p.name) || p.specs.some(([k, v]) => /technology|compressor/i.test(k) && /inverter|bldc/i.test(v))
export const techLabel = p => isInverter(p) ? 'Inverter technology' : (CAT_HINT[p.category] || 'Designed for everyday life')

// Up to `n` scannable highlights pulled from a model's spec sheet.
const HIGHLIGHT_KEYS = [/^(net|total) volume/i, /screen size|display size/i, /^(?!loading).*capacity/i, /technology/i, /compressor$/i, /resolution/i, /^type$/i, /refrigerant/i, /operating system/i, /power/i]
export function highlights(p, n = 4) {
  const out = []
  for (const re of HIGHLIGHT_KEYS) {
    const hit = p.specs.find(([k]) => re.test(k))
    if (hit && !out.some(o => o[0] === hit[0])) out.push([hit[0].replace(/\s*\(.*?\)/g, '').replace(/\/mm$/, ''), hit[1].replace(/\s*\(V\.\d+\).*$/, '').replace(/\s*\[.*$/, '')])
    if (out.length >= n) break
  }
  return out
}

export const BUDGETS = [5000, 10000, 25000, 50000, 75000, 100000, 200000]
export const MAX_PRICE = Math.max(...RAW.map(p => p.price || 0))

// Everyday words shoppers type → the words the catalogue uses.
const SYNONYMS = {
  fridge: ['refrigerator', 'freezer'], freezer: ['freezer', 'refrigerator'], deep: ['freezer'],
  tv: ['tv', 'television'], television: ['television', 'tv'], led: ['led', 'tv'], smart: ['smart', 'google', 'android'],
  ac: ['air conditioner', 'inverna', 'split'], aircon: ['air conditioner'], 'air-con': ['air conditioner'],
  washer: ['washing', 'washer'], washing: ['washing', 'washer'], laundry: ['washing'], dryer: ['dryer', 'washer'],
  phone: ['phone', 'mobile'], mobile: ['mobile', 'phone'], smartphone: ['smart phone', 'mobile'],
  laptop: ['laptop', 'computer'], pc: ['computer'], monitor: ['monitor', 'display', 'computer'],
  oven: ['oven', 'microwave'], microwave: ['microwave'], cooker: ['cooker'], stove: ['stove', 'induction', 'infrared'],
  blender: ['blender', 'juicer', 'mixer'], juicer: ['juicer', 'blender'], mixer: ['mixer', 'grinder', 'blender'],
  cooler: ['cooler'], heater: ['heater'], kettle: ['kettle'], iron: ['iron'], fan: ['fan'],
}
const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function matcher(term) {
  const forms = new Set([term, term.replace(/(es|s)$/, ''), ...(SYNONYMS[term] || []), ...(SYNONYMS[term.replace(/s$/, '')] || [])])
  const tests = [...forms].filter(Boolean).map(f => f.length <= 2 ? new RegExp('\\b' + esc(f) + '\\b') : { test: h => h.includes(f) })
  return h => tests.some(t => t.test(h))
}
export function search(q, limit = Infinity) {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const ms = terms.map(matcher)
  const scored = []
  for (const p of RAW) {
    const hay = (p.name + ' ' + p.category + ' ' + p.sub).toLowerCase()
    if (!ms.every(m => m(hay))) continue
    let s = 0
    terms.forEach((t, k) => { if (p.name.toLowerCase().startsWith(t)) s += 3; if (ms[k](p.category.toLowerCase())) s += 2; if (ms[k](p.sub.toLowerCase())) s += 1 })
    scored.push([s, p])
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1])
}

// Lifestyle photography: generated rooms with the real Walton product photo placed into each one.
// `id` is the product shown in the photo, so every caption and price comes from the catalogue.
export const LIFE = {
  hero: { src: './img/lifestyle/hero-kitchen.webp', id: 'fc934d493c38', alt: 'A woman holding a cup of tea in a sunlit kitchen beside a Walton WNR-6B0-GSRE-BD refrigerator' },
  kitchen: { src: './img/lifestyle/kitchen-counter.webp', id: 'acc98f09c2c1', alt: 'A Walton blender set on a wooden kitchen counter in morning light, beside sliced mango' },
  bedroom: { src: './img/lifestyle/bedroom-ac.webp', id: '6af62ea3911a', alt: 'A man reading in bed below a wall-mounted Walton inverter air conditioner' },
  laundry: { src: './img/lifestyle/laundry.webp', id: '9f797fcbb782', alt: 'A woman carrying folded laundry past a Walton washer and dryer' },
  living: { src: './img/lifestyle/living-tv.webp', id: 'c6d5374847d3', alt: 'A mother and daughter on the sofa watching a Walton 65-inch Google TV in the evening' },
  reading: { src: './img/lifestyle/reading-corner.webp', id: 'a499e75be6ca', alt: 'A grandfather reading the newspaper beside a Walton air cooler at dusk' },
  family: { src: './img/lifestyle/family.webp', alt: 'Three generations of a family sharing tea and laughing at home' },
}

export const HERO_SCENES = [
  { title: 'Fresh food', cat: 'Refrigerators', line: 'Room for the whole week.' },
  { title: 'Movie night', cat: 'Televisions', line: 'A bigger picture. A closer feeling.' },
  { title: 'Cool rooms', cat: 'Air conditioners', line: 'Comfort comes home.' },
  { title: 'Laundry day', cat: 'Washing machines', line: 'A little less laundry day.' },
]

export const FAQ = [
  ['warranty', 'How do I check the warranty?', 'Warranty coverage varies by model and component. Open the official product specifications from your chosen model page, then confirm the current written warranty and proof-of-purchase requirements with Walton.'],
  ['delivery', 'How do delivery and installation work?', 'Ask your selected Plaza to confirm delivery coverage, fees, installation requirements, appointment timing and any accessories needed. This concept does not promise a delivery date or a flat installation charge.'],
  ['price', 'Are these the final selling prices?', 'The prices shown were collected from Walton’s manufacturer catalogue. Plaza prices, promotions and availability may differ. Confirm the final quotation before making a purchase.'],
  ['service', 'Where can I track a service request?', 'Use Walton’s official Service Status page. You will need the details supplied when you created the service request.'],
  ['compare', 'Can I save and compare products?', 'Yes. Save products with the heart button or compare up to three models. Your shortlist and bag are kept in this browser when local storage is available.'],
  ['order', 'Can I place a real order here?', 'No. This is an independent interactive redesign. The checkout lets you explore the proposed flow; it does not collect payments, contact a seller or place an order.'],
]
