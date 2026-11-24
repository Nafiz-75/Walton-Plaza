// Dry-run: executes ../code.js against a mock Figma API with the real captured data, end to end.
// Catches runtime errors across all screens before importing in Figma. Usage: node dryrun.mjs
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import zlib from 'zlib'
import { fileURLToPath } from 'url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const html = fs.readFileSync(path.join(HERE, '..', 'ui.html'), 'utf8')
const grab = id => JSON.parse(zlib.gunzipSync(Buffer.from(html.split(`<script id="${id}" type="application/octet-stream">`)[1].split('</script>')[0].trim(), 'base64')).toString())
const DATA = grab('payload'), IMAGES = grab('imagedata')

let ids = 0, created = 0
const RO = new Set(['children', 'parent', 'id', 'type', 'removed'])
class Node {
  constructor(type) { this.id = '1:' + (++ids); this.type = type; this.children = []; this.parent = null; this.name = type; this.x = 0; this.y = 0; this.width = 100; this.height = 100; this.fills = []; this.strokes = []; this.effects = []; this.reactions = []; this.removed = false; created++ }
  appendChild(c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.push(c) }
  insertChild(i, c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.splice(i, 0, c) }
  remove() { this.removed = true; if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1) }
  resize(w, h) { if (!(w > 0 && h > 0)) throw new Error('resize: invalid size ' + w + 'x' + h + ' on ' + this.name); this.width = w; this.height = h }
  resizeWithoutConstraints(w, h) { this.resize(w, h) }
  findOne(fn) { for (const c of this.children) { if (fn(c)) return c; const r = c.findOne(fn); if (r) return r } return null }
  findAll(fn) { const out = []; const w = n => { for (const c of n.children) { if (!fn || fn(c)) out.push(c); w(c) } }; w(this); return out }
  findAllWithCriteria(q) { return this.findAll(n => q.types.includes(n.type)) }
  async setReactionsAsync(r) { for (const x of r) for (const a of x.actions) if (a.type === 'NODE' && !a.destinationId) throw new Error('reaction without destination'); this.reactions = r }
  setExplicitVariableModeForCollection() { }
  async setTextStyleIdAsync(id) { this.textStyleId = id }
  createInstance() { const i = clone(this, 'INSTANCE'); i.mainComponent = this; return i }
  // --- auto layout rules, enforced like Figma ---
  get layoutMode() { return this._lm || 'NONE' } set layoutMode(v) { if (!['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'].includes(v)) throw new Error('bad layoutMode ' + v); this._lm = v }
  set layoutSizingHorizontal(v) { this._sz(v, 'h') } set layoutSizingVertical(v) { this._sz(v, 'v') }
  _sz(v, ax) {
    const al = this.parent && this.parent.layoutMode && this.parent.layoutMode !== 'NONE'
    if (v === 'FILL' && !al) throw new Error('in set_layoutSizing: FILL can only be set on children of auto-layout frames (' + this.name + ')')
    if (v === 'HUG' && !(this.type === 'TEXT' || this.type === 'INSTANCE' || this.type === 'COMPONENT' || (this.layoutMode && this.layoutMode !== 'NONE'))) throw new Error('HUG on non auto-layout ' + this.type + ' ' + this.name)
    if (!['FILL', 'HUG', 'FIXED'].includes(v)) throw new Error('bad sizing ' + v)
    this['_ls' + ax] = v
  }
  set layoutPositioning(v) { if (v === 'ABSOLUTE' && !(this.parent && this.parent.layoutMode && this.parent.layoutMode !== 'NONE')) throw new Error('ABSOLUTE requires auto-layout parent (' + this.name + ')'); this._lp = v } get layoutPositioning() { return this._lp || 'AUTO' }
  appendChildAt(node, r, c) { if (this.layoutMode !== 'GRID') throw new Error('appendChildAt on non-grid'); if (r >= this.gridRowCount || c >= this.gridColumnCount || r < 0 || c < 0) throw new Error('grid cell out of range ' + r + ',' + c); this.appendChild(node); node._cell = [r, c] }
  set gridRowSpan(v) { if (!(v >= 1)) throw new Error('bad span'); this._grs = v } set gridColumnSpan(v) { if (!(v >= 1)) throw new Error('bad span'); this._gcs = v }
  set numberOfFixedChildren(v) { if (v > this.children.length) throw new Error('too many fixed'); this._nfc = v } get numberOfFixedChildren() { return this._nfc || 0 }
  set maxWidth(v) { if (!(this.parent && this.parent.layoutMode !== 'NONE') && !(this.layoutMode !== 'NONE')) throw new Error('maxWidth needs auto layout'); this._mw = v }
  set vectorPaths(v) { if (!v[0] || !/^M /.test(v[0].data)) throw new Error('bad vector path'); this._vp = v }
  getStyledTextSegments() { return [] }
}
function clone(n, type) { const c = n.type === 'TEXT' ? new TextNode() : new Node(type || n.type); for (const k of Object.keys(n)) if (!RO.has(k) && k !== 'mainComponent') c[k] = Array.isArray(n[k]) && k !== 'children' ? n[k].slice() : n[k]; c.children = []; c.type = type || n.type; for (const ch of n.children) c.appendChild(clone(ch)); return c }
class TextNode extends Node {
  constructor() { super('TEXT'); this._chars = ''; this.fontName = { family: 'Inter', style: 'Regular' }; this.fontSize = 12; this.textAutoResize = 'WIDTH_AND_HEIGHT' } // Figma's default
  set characters(v) { if (!loaded.has(this.fontName.family + '|' + this.fontName.style)) throw new Error('Cannot write to node with unloaded font ' + JSON.stringify(this.fontName)); this._chars = v; this._ranges = null; this.width = Math.max(1, v.length * this.fontSize * 0.55) ; this.height = this.fontSize * 1.3 }
  get characters() { return this._chars }
  _chk(a, b, f) { if (b > this._chars.length || a < 0 || a >= b) throw new Error('bad range ' + a + '-' + b + ' len ' + this._chars.length); if (f && !loaded.has(f.family + '|' + f.style)) throw new Error('range font not loaded ' + JSON.stringify(f)) }
  setRangeFontName(a, b, f) { this._chk(a, b, f); this._rng('font', a, b, f) } setRangeFontSize(a, b, v) { this._chk(a, b); this._rng('size', a, b, v) } setRangeLineHeight(a, b) { this._chk(a, b) } setRangeLetterSpacing(a, b, v) { this._chk(a, b); this._rng('ls', a, b, v) } setRangeTextDecoration(a, b) { this._chk(a, b) } setRangeFills(a, b, f) { this._chk(a, b); if (!Array.isArray(f)) throw new Error('fills not array'); this._rng('fills', a, b, f) }
  getRangeFontName() { return this.fontName } getRangeAllFontNames() { return [this.fontName] }
  _rng(k, a, b, v) { (this._ranges = this._ranges || []).push([k, a, b, v]) }
}
const loaded = new Set()
const pages = []
const mkPage = () => { const p = new Node('PAGE'); p.flowStartingPoints = []; pages.push(p); return p }
const root = new Node('DOCUMENT'); root.appendChild(mkPage())
let current = root.children[0]
const vars = []
const figma = {
  root, get currentPage() { return current }, set currentPage(v) { throw new Error('Setting figma.currentPage is not supported') },
  async setCurrentPageAsync(p) { current = p },
  showUI() { }, ui: { postMessage(m) { onPost(m) }, onmessage: null },
  createPage() { if (process.env.STARTER && root.children.length >= 3) throw new Error('Starter plan: 3 pages per file'); const p = mkPage(); root.appendChild(p); return p },
  createFrame() { return new Node('FRAME') }, createRectangle() { return new Node('RECTANGLE') }, createText() { return new TextNode() },
  createSection() { return new Node('SECTION') }, createVector() { return new Node('VECTOR') },
  createNodeFromSvg(svg) { if (!/^<svg[\s>]/.test(svg.trim())) throw new Error('bad svg'); const f = new Node('FRAME'); f._svg = svg; const m = svg.match(/width="([\d.]+)"[^>]*height="([\d.]+)"/); if (m) { f.width = +m[1]; f.height = +m[2] } return f },
  createComponentFromNode(n) { const c = clone(n, 'COMPONENT'); const p = n.parent; const i = p.children.indexOf(n); n.remove(); p.insertChild(i, c); return c },
  combineAsVariants(list, parent) { const s = new Node('COMPONENT_SET'); parent.appendChild(s); list.forEach(c => s.appendChild(c)); return s },
  createTextStyle() { const s = { id: 'S:' + (++ids), name: '', fontName: null, fontSize: 0, lineHeight: { value: 0 } }; styles.push(s); return s },
  async getLocalTextStylesAsync() { return styles },
  async loadFontAsync(f) { if (!f || !f.family) throw new Error('bad font'); if (/Hind Siliguri/.test(f.family) && /ExtraBold/.test(f.style)) throw new Error('font not found'); loaded.add(f.family + '|' + f.style) },
  createImage(bytes) { if (!(bytes && bytes.length)) throw new Error('empty image'); const h = 'img' + (++ids); IMGS[h] = Buffer.from(bytes).toString('base64'); return { hash: h } },
  base64Decode(s) { return Buffer.from(s, 'base64') },
  variables: {
    createVariableCollection(name) { const c = { id: 'VC:' + (++ids), name, modes: [{ modeId: 'm' + (++ids), name: 'Mode 1' }], renameMode() { }, addMode() { throw new Error('in addMode: Limited to 1 modes only') }, remove() { } }; return c },
    createVariable(name, col, type) { const v = { id: 'V:' + (++ids), name, scopes: [], setValueForMode(m, val) { if (val.r > 1 || val.a === undefined) throw new Error('bad colour value') } }; vars.push(v); return v },
    setBoundVariableForPaint(p, f, v) { return Object.assign({}, p, { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } }) },
    async getLocalVariableCollectionsAsync() { return [] },
  },
  viewport: { scrollAndZoomIntoView() { } }, notify(m) { console.log('notify:', m) }, closePlugin() { },
}
const styles = []
const IMGS = {}
let resolveNext
function onPost(m) { if (m.type === 'error') { console.error('PLUGIN ERROR:', m.msg, '\n', m.stack); process.exit(1) } if (m.type === 'log') console.log('  log:', m.msg); if (resolveNext) resolveNext(m) }
const ctx = vm.createContext({ figma, __html__: '', console, Math, JSON, Object, Array, String, Number, Set, Map, Promise, Error, setTimeout, RegExp })
vm.runInContext(fs.readFileSync(path.join(HERE, '..', 'code.js'), 'utf8'), ctx)
const send = msg => new Promise(r => { resolveNext = r; figma.ui.onmessage(msg) })
const t0 = Date.now()
await send({ type: 'start', tokens: DATA.tokens, textSamples: DATA.textSamples })
await send({ type: 'images', list: IMAGES })
const order = DATA.index.slice().sort((a, b) => (a.device === b.device ? 0 : a.device === 'd' ? -1 : 1) || (a.theme === b.theme ? 0 : a.theme === 'light' ? -1 : 1))
for (const s of order) await send({ type: 'screen', data: DATA.screens[s.id] })
const done = await new Promise(r => { resolveNext = m => m.type === 'done' && r(m); figma.ui.onmessage({ type: 'finish' }) })
const all = root.findAll()
const count = t => all.filter(n => n.type === t).length
const withReactions = all.filter(n => n.reactions && n.reactions.length).length
console.log(`OK in ${((Date.now() - t0) / 1000).toFixed(1)}s — screens ${done.screens}, layers ${done.nodes}, pages ${root.children.map(p => p.name).join(' | ')}`)
console.log(`components ${count('COMPONENT')}, sets ${count('COMPONENT_SET')}, instances ${count('INSTANCE')}, text ${count('TEXT')}, prototype links ${withReactions}, variables ${vars.length}, text styles ${styles.length}`)
const fixed = all.filter(n => n.numberOfFixedChildren).length
console.log('screens with pinned layers:', fixed)
const byName = {}; for (const n of all.filter(n => n.type === 'COMPONENT' && n.parent && n.parent.type !== 'COMPONENT_SET')) { const k = n.name.split(' / ')[0]; byName[k] = (byName[k] || 0) + 1 }
console.log('masters by component:', JSON.stringify(byName)); console.log('add-button sets:', count('COMPONENT_SET'))
const sets = {}; for (const s of all.filter(n => n.type === 'COMPONENT_SET' && !/^Add button/.test(n.name))) sets[s.name] = (sets[s.name] || []).concat(s.children.length)
console.log('variant sets (per device·theme):', JSON.stringify(sets))
console.log('sample card variants:', all.find(n => n.type === 'COMPONENT_SET' && n.name === 'Product card').children.slice(0, 4).map(c => c.name).join(' | '))

// ---- optional: dump built screens (Figma node trees) for the visual preview ----
if (process.env.DUMP) {
  const want = new RegExp(process.env.DUMP)
  const ser = n => { const o = {}; for (const [k, v] of Object.entries(n)) { if (k === 'parent' || k === 'children' || k === 'mainComponent') continue; o[k] = v } o.width = n.width; o.height = n.height; o.layoutMode = n.layoutMode; o.layoutPositioning = n.layoutPositioning; o.ch = n.children.map(ser); return o }
  const frames = all.filter(n => n.type === 'FRAME' && n.parent && n.parent.type === 'SECTION' && want.test(n.name))
  const out = frames.map(f => ({ name: f.name, page: (function p(x) { while (x && x.type !== 'PAGE') x = x.parent; return x && x.name })(f), tree: ser(f) }))
  fs.writeFileSync(path.join(HERE, '..', 'data', 'preview-dump.json'), JSON.stringify({ frames: out, images: IMGS }))
  console.log('dumped', out.length, 'frames:', out.map(f => f.page.slice(-12) + ' / ' + f.name).join(', '))
}
