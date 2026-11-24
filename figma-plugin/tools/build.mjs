// Packs captured screens + images into ../ui.html (gzip+base64), ready for Figma's
// "Import plugin from manifest…". Run after capture.mjs and images.py.
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, '..', 'data')
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'))
const map = JSON.parse(fs.readFileSync(path.join(DATA, 'img', '_map.json'), 'utf8'))

const screens = {}, tokens = {}, combos = new Map()
for (const s of index) {
  const d = JSON.parse(fs.readFileSync(path.join(DATA, 'screens', s.id + '.json'), 'utf8'))
  if (!tokens[d.theme]) tokens[d.theme] = d.tokens
  delete d.tokens; delete d.images
  // v2: drop empty layers (e.g. the invisible fly-to-bag layer) anywhere in the tree
  const prune = n => { if (n.ch) n.ch = n.ch.filter(c => !(c.k === 'F' && !c.fills && !c.st && !c.fx && !c.comp && !c.link && !(c.ch && c.ch.length) && !c.poly)).map(prune); return n }
  prune(d.root)
  screens[s.id] = d
  const walk = n => { if (n.k === 'T' && !n.segs) { const k = [n.f.fam, n.f.st, n.f.sz, n.f.lh, n.f.ls].join('|'); const c = combos.get(k) || { n: 0, sample: { s: n.s, f: n.f } }; c.n++; combos.set(k, c) } (n.ch || []).forEach(walk) }
  walk(d.root)
}
// text styles: every type combination used at least 6 times across the site
const textSamples = [...combos.values()].filter(c => c.n >= 20).sort((a, b) => b.n - a.n).slice(0, 36).sort((a, b) => b.sample.f.sz - a.sample.f.sz).map(c => c.sample)

const payload = { index, screens, tokens, textSamples }
const gz = o => zlib.gzipSync(Buffer.from(JSON.stringify(o)), { level: 9 }).toString('base64')
const images = Object.entries(map).map(([src, file]) => ({ src, b64: fs.readFileSync(path.join(DATA, 'img', file)).toString('base64') }))

let html = fs.readFileSync(path.join(HERE, 'ui.template.html'), 'utf8')
html = html.replace('__PAYLOAD__', () => gz(payload)).replace('__IMAGES__', () => gz(images))
fs.writeFileSync(path.join(HERE, '..', 'ui.html'), html)
const mb = b => (b / 1048576).toFixed(1) + ' MB'
console.log(`ui.html ${mb(Buffer.byteLength(html))} · ${index.length} screens · ${images.length} images · ${textSamples.length} text styles · tokens: ${Object.keys(tokens).join('+')}`)
