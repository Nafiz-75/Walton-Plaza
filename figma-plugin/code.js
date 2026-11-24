// Walton Plaza — Site Importer (Figma plugin, main thread)
// Rebuilds the captured website as native Figma layers: pages per device, Light + Dark rows,
// colour variables (Light/Dark modes), text styles, components + instances, and prototype links.
// Data arrives from ui.html one screen at a time so large files stay responsive.

figma.showUI(__html__, { width: 420, height: 560, themeColors: true })

const S = {
  opts: null, tokens: {}, images: {}, fonts: {}, fontFallback: {},
  vars: null, // { collection, light, dark, byName }
  cursor: new Map(), textStyles: [], pages: {}, frames: {}, masters: {}, pendingLinks: [], counts: { nodes: 0, screens: 0 }
}
const post = (type, extra) => figma.ui.postMessage(Object.assign({ type }, extra || {}))
const log = msg => post('log', { msg })

// ---------------- maths & paints ----------------
function inv(m) { // invert 2x3 affine [[a,b,c],[d,e,f]]
  const a = m[0][0], b = m[0][1], c = m[0][2], d = m[1][0], e = m[1][1], f = m[1][2]
  const det = a * e - b * d || 1e-9
  return [[e / det, -b / det, (b * f - c * e) / det], [-d / det, a / det, (c * d - a * f) / det]]
}
function rgb(c) { return { r: c[0], g: c[1], b: c[2] } }
function solid(c) { return { type: 'SOLID', color: rgb(c), opacity: c[3] === undefined ? 1 : c[3] } }
function gstops(st) { return st.map(s => ({ position: s.p, color: { r: s.c[0], g: s.c[1], b: s.c[2], a: s.c[3] } })) }
function linear(g, w, h, dx, dy) {
  dx = dx || 0; dy = dy || 0; w = Math.max(w, 0.01); h = Math.max(h, 0.01)
  const S0 = [(g.s[0] + dx) / w, (g.s[1] + dy) / h], vx = g.e[0] - g.s[0], vy = g.e[1] - g.s[1]
  const v = [vx / w, vy / h], u = [-vy / w, vx / h]
  const M = [[v[0], u[0], S0[0] - 0.5 * u[0]], [v[1], u[1], S0[1] - 0.5 * u[1]]]
  return { type: 'GRADIENT_LINEAR', gradientTransform: inv(M), gradientStops: gstops(g.st) }
}
function radial(g, w, h, type) {
  w = Math.max(w, 0.01); h = Math.max(h, 0.01)
  const rx = g.r ? g.r[0] : w / 2, ry = g.r ? g.r[1] : h / 2
  const M = [[2 * rx / w, 0, g.c[0] / w - rx / w], [0, 2 * ry / h, g.c[1] / h - ry / h]]
  return { type: type || 'GRADIENT_RADIAL', gradientTransform: inv(M), gradientStops: gstops(g.st) }
}
function paints(list, w, h) {
  const out = []
  for (const f of list || []) {
    if (f.t === 'S') out.push(bindColor(solid(f.c)))
    else if (f.t === 'L') out.push(linear(f, w, h))
    else if (f.t === 'R') out.push(radial(f, w, h))
    else if (f.t === 'A') out.push(radial(Object.assign({}, f, { r: [w / 2, h / 2] }), w, h, 'GRADIENT_ANGULAR'))
    else if (f.t === 'IMG' && S.images[f.src]) out.push({ type: 'IMAGE', imageHash: S.images[f.src], scaleMode: 'FILL' })
  }
  return out
}
function effects(list) {
  const out = []
  for (const e of list || []) {
    if (e.t === 'D' || e.t === 'I') {
      const fx = { type: e.t === 'D' ? 'DROP_SHADOW' : 'INNER_SHADOW', color: { r: e.c[0], g: e.c[1], b: e.c[2], a: e.c[3] }, offset: { x: e.x, y: e.y }, radius: Math.max(0, e.b), spread: e.s || 0, visible: true, blendMode: 'NORMAL' }
      if (e.t === 'D') fx.showShadowBehindNode = false // only valid on drop shadows
      out.push(fx)
    }
    else if (e.t === 'B') out.push({ type: 'BACKGROUND_BLUR', radius: e.b, visible: true })
    else if (e.t === 'LB') out.push({ type: 'LAYER_BLUR', radius: e.b, visible: true })
  }
  return out
}

// ---------------- variables (design tokens) ----------------
const key = c => c.slice(0, 3).map(v => Math.round(v * 255)).join(',') + ',' + Math.round((c[3] === undefined ? 1 : c[3]) * 100)
function setupVariables(tokens) {
  // Paid plans: one collection with Light + Dark modes. Starter plans allow one mode per collection,
  // so we fall back to two collections ("Walton · Light" / "Walton · Dark") — same tokens, same names.
  const names = Object.keys(tokens.light || {})
  const mk = (collection, mode, theme, byName, lookup) => {
    for (const n of names) {
      const v = figma.variables.createVariable('color/' + n, collection, 'COLOR')
      v.scopes = /ink|muted|ring/.test(n) ? ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] : ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL']
      const c = (tokens[theme] || tokens.light)[n]
      v.setValueForMode(mode, { r: c[0], g: c[1], b: c[2], a: c[3] })
      byName[n] = v; if (!lookup[key(c)]) lookup[key(c)] = v
    }
  }
  try {
    const col = figma.variables.createVariableCollection('Walton tokens')
    const light = col.modes[0].modeId; col.renameMode(light, 'Light')
    let dark = null
    try { dark = col.addMode('Dark') } catch (e) { dark = null }
    if (dark) {
      const byName = {}, lookup = { light: {}, dark: {} }
      for (const n of names) {
        const v = figma.variables.createVariable('color/' + n, col, 'COLOR')
        const L = tokens.light[n], D = (tokens.dark || {})[n] || L
        v.setValueForMode(light, { r: L[0], g: L[1], b: L[2], a: L[3] }); v.setValueForMode(dark, { r: D[0], g: D[1], b: D[2], a: D[3] })
        byName[n] = v; if (!lookup.light[key(L)]) lookup.light[key(L)] = v; if (!lookup.dark[key(D)]) lookup.dark[key(D)] = v
      }
      S.vars = { modes: true, collection: col, light, dark, byName: { light: byName, dark: byName }, lookup }
    } else {
      col.name = 'Walton · Light'
      const colD = figma.variables.createVariableCollection('Walton · Dark'); colD.renameMode(colD.modes[0].modeId, 'Dark')
      const bL = {}, bD = {}, lL = {}, lD = {}
      mk(col, light, 'light', bL, lL); mk(colD, colD.modes[0].modeId, 'dark', bD, lD)
      S.vars = { modes: false, byName: { light: bL, dark: bD }, lookup: { light: lL, dark: lD } }
      log('Your plan allows one variable mode per collection, so tokens were split into "Walton · Light" and "Walton · Dark".')
    }
  } catch (e) { log('Variables unavailable — colours stay as plain fills. (' + e.message + ')'); S.vars = null }
}
function setMode(node, theme) { if (S.vars && S.vars.modes) { try { node.setExplicitVariableModeForCollection(S.vars.collection, theme === 'dark' ? S.vars.dark : S.vars.light) } catch (e) { } } }
let THEME = 'light'
function bindColor(p) {
  if (!S.vars || p.type !== 'SOLID') return p
  const v = S.vars.lookup[THEME][key([p.color.r, p.color.g, p.color.b, p.opacity])]
  if (!v) return p
  try { return figma.variables.setBoundVariableForPaint(p, 'color', v) } catch (e) { return p }
}

// ---------------- fonts & text styles ----------------
async function loadFont(fam, st) {
  const k = fam + '|' + st
  if (S.fonts[k]) return S.fonts[k]
  const tries = [{ family: fam, style: st }, { family: fam, style: st === 'ExtraBold' ? 'Bold' : st === 'SemiBold' ? 'Medium' : 'Regular' }, { family: 'Inter', style: st === 'ExtraBold' ? 'Extra Bold' : st === 'SemiBold' ? 'Semi Bold' : st }, { family: 'Inter', style: 'Regular' }]
  for (const f of tries) { try { await figma.loadFontAsync(f); S.fonts[k] = f; if (f.family !== fam) log('Font ' + fam + ' ' + st + ' not available — using ' + f.family + ' ' + f.style); return f } catch (e) { } }
  return { family: 'Inter', style: 'Regular' }
}
function roleName(t) {
  const caps = t.s && t.s === t.s.toUpperCase() && /[A-Z]/.test(t.s) && t.f.ls > 0.5
  if (caps) return 'Label/Eyebrow ' + t.f.sz
  if (t.f.sz >= 48) return 'Display/' + t.f.sz + ' ' + t.f.st
  if (t.f.sz >= 26) return 'Heading/H2 ' + t.f.sz + ' ' + t.f.st
  if (t.f.sz >= 18) return 'Heading/H3 ' + t.f.sz + ' ' + t.f.st
  if (t.f.sz >= 15) return 'Body/Large ' + t.f.sz + ' ' + t.f.st
  if (t.f.sz >= 13) return 'Body/Default ' + t.f.sz + ' ' + t.f.st
  return 'Caption/' + t.f.sz + ' ' + t.f.st
}
const tsKey = f => [f.fam, f.st, f.sz, f.lh, f.ls].join('|')
async function setupTextStyles(samples) {
  const made = {}
  for (const smp of samples) {
    const k = tsKey(smp.f); if (made[k]) continue
    const font = await loadFont(smp.f.fam, smp.f.st)
    const st = figma.createTextStyle()
    let name = roleName(smp); let i = 2; while (Object.values(made).some(s => s.name === name)) name = roleName(smp) + ' · ' + i++
    st.name = name; st.fontName = font; st.fontSize = smp.f.sz
    st.lineHeight = { unit: 'PIXELS', value: smp.f.lh }; st.letterSpacing = { unit: 'PIXELS', value: smp.f.ls }
    made[k] = st
  }
  S.textStyleByKey = made
}

// ---------------- node builders (v2: real auto layout) ----------------
const isTextBox = m => m.k === 'F' && m.ch && m.ch.length === 1 && m.ch[0].k === 'T'
function sig(n) { // structural signature: instances are only used when the structure truly matches
  const g = v => Math.round(v)
  // the component's own outer size is set by its slot (grid cell / Fill), so it is not part of the identity
  const walk = (m, ox, oy) => m.k + (m.L ? m.L.m : '') + (m.k === 'T' ? '' : m.k === 'S' ? 'S' : '@' + g(m.x - ox) + ',' + g(m.y - oy) + (m === n || isTextBox(m) || (m.sz && (m.sz.x === 'HUG' || m.sz.x === 'FILL')) ? '' : ':' + g(m.w) + 'x' + g(m.h))) + (m.k === 'V' ? '#' + hash(m.svg) : '') + (m.comp && m !== n ? '<' + m.comp + '>' : '') + (m.ch ? '[' + m.ch.map(c => walk(c, m.x || 0, m.y || 0)).join(',') + ']' : '')
  return hash(walk(n, n.x, n.y))
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) }
const BN = /[\u0980-\u09FF]/
const AL = { LEFT: 'LEFT', CENTER: 'CENTER', RIGHT: 'RIGHT', JUSTIFIED: 'JUSTIFIED' }

async function makeText(n) {
  const t = figma.createText()
  const segs = n.segs || [{ s: n.s, st: { fam: n.f.fam, st: n.f.st, sz: n.f.sz, lh: n.f.lh, ls: n.f.ls, u: n.f.u, c: n.c, gf: n.gf } }]
  const first = await loadFont(segs[0].st.fam, segs[0].st.st)
  t.fontName = first
  t.characters = n.s
  t.fontSize = n.f.sz
  t.lineHeight = { unit: 'PIXELS', value: n.f.lh }
  if (n.f.ls) t.letterSpacing = { unit: 'PIXELS', value: n.f.ls }
  t.textAlignHorizontal = AL[n.al || n.f.al] || 'LEFT'
  if (n.trunc) { try { t.textTruncation = 'ENDING'; t.maxLines = 1 } catch (e) { } }
  await styleRuns(t, n, segs)
  const style = !n.segs && S.textStyleByKey && S.textStyleByKey[tsKey(n.f)]
  if (style && !BN.test(n.s)) { try { await t.setTextStyleIdAsync(style.id) } catch (e) { } }
  t.name = n.n || n.s.slice(0, 30)
  return t
}
// styled ranges (bold run inside a sentence, coloured price, ৳ in Hind Siliguri) — used on build and on instance overrides
async function styleRuns(t, n, segs) {
  let i = 0
  for (const sg of segs) {
    const a = i, b = i + sg.s.length; i = b
    if (b <= a) continue
    const st = sg.st
    const font = await loadFont(st.fam, st.st)
    t.setRangeFontName(a, b, font)
    t.setRangeFontSize(a, b, st.sz)
    t.setRangeLineHeight(a, b, { unit: 'PIXELS', value: st.lh })
    if (st.ls) t.setRangeLetterSpacing(a, b, { unit: 'PIXELS', value: st.ls })
    if (st.u) t.setRangeTextDecoration(a, b, 'UNDERLINE')
    if (st.gf) { const bx = st.gf.box; t.setRangeFills(a, b, st.gf.g.filter(g => g.t === 'L').map(g => linear(g, n.w, n.h, bx[0] - n.x, bx[1] - n.y))) }
    else if (st.c) t.setRangeFills(a, b, [bindColor(solid(st.c))])
  }
  // ৳ and Bangla digits use Hind Siliguri, like the site's font stack
  if (BN.test(n.s)) {
    for (let k = 0; k < n.s.length; k++) if (BN.test(n.s[k])) {
      const cur = t.getRangeFontName(k, k + 1)
      const st = cur && cur.style ? cur.style : 'Regular'
      t.setRangeFontName(k, k + 1, await loadFont('Hind Siliguri', /Extra|Black/.test(st) ? 'Bold' : /Semi/.test(st) ? 'SemiBold' : /Bold/.test(st) ? 'Bold' : /Medium/.test(st) ? 'Medium' : 'Regular'))
    }
  }
}
// SVGs that embed raster pieces (the official Walton emblem): rebuild them as positioned image layers,
// so the logo never depends on how Figma's SVG importer treats <image>.
function makeImageSvg(n) {
  const f = figma.createFrame(); f.name = n.n || 'logo'; f.fills = []; f.clipsContent = false
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h))
  const vb = (n.svg.match(/viewBox=["']([^"']+)["']/) || [])[1]
  const [, , vw, vh] = vb ? vb.split(/[ ,]+/).map(Number) : [0, 0, n.w, n.h]
  const sx = n.w / vw, sy = n.h / vh
  const re = /<image\b([^>]*)>/g; let m
  while ((m = re.exec(n.svg))) {
    const at = m[1], get = k => { const x = at.match(new RegExp(k + '=["\']([^"\']+)["\']')); return x ? x[1] : null }
    const href = get('xlink:href') || get('href'); if (!href || !/base64,/.test(href)) continue
    const w = +get('width'), h = +get('height')
    const t = (get('transform') || 'matrix(1 0 0 1 0 0)').match(/matrix\(([^)]+)\)/)
    const [a, , , d, e, ff] = t ? t[1].trim().split(/[ ,]+/).map(Number) : [1, 0, 0, 1, 0, 0]
    let hash; try { hash = figma.createImage(figma.base64Decode(href.split('base64,')[1].replace(/\s/g, ''))).hash } catch (err) { continue }
    const r = figma.createRectangle(); r.name = 'emblem piece'
    r.resize(Math.max(0.01, w * a * sx), Math.max(0.01, h * d * sy)); r.x = e * sx; r.y = ff * sy
    r.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }]
    f.appendChild(r)
  }
  if (n.o) f.opacity = n.o
  return f
}
function makeVector(n) {
  if (n.svg && n.svg.indexOf('<image') > -1) return makeImageSvg(n)
  let v
  try { v = figma.createNodeFromSvg(n.svg) } catch (e) { v = figma.createFrame(); v.fills = [] }
  v.name = n.n || 'icon'; v.fills = []
  try { if (Math.abs(v.width - n.w) > 0.5 || Math.abs(v.height - n.h) > 0.5) v.resize(Math.max(0.01, n.w), Math.max(0.01, n.h)) } catch (e) { }
  if (n.o) v.opacity = n.o
  return v
}
function makeImage(n) {
  const r = figma.createRectangle()
  r.name = n.n || 'image'
  r.resize(Math.max(0.01, n.w), Math.max(0.01, n.h))
  const h = S.images[n.src]
  r.fills = h ? [{ type: 'IMAGE', imageHash: h, scaleMode: n.fit === 'FILL' ? 'FILL' : 'FIT' }] : [{ type: 'SOLID', color: { r: 0.93, g: 0.94, b: 0.96 } }]
  if (n.r) { r.topLeftRadius = n.r[0]; r.topRightRadius = n.r[1]; r.bottomRightRadius = n.r[2]; r.bottomLeftRadius = n.r[3] }
  if (n.bm) { try { r.blendMode = n.bm } catch (e) { } }
  if (n.o) r.opacity = n.o
  return r
}
function styleFrame(f, n) {
  f.name = n.n || 'frame'
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h))
  f.fills = n.poly ? [] : paints(n.fills, n.w, n.h)
  let fxList = n.fx
  const ring = !n.st && (n.fx || []).find(e => e.t === 'I' && !e.x && !e.y && !e.b && e.s > 0) // CSS inset ring -> stroke
  if (ring) { n = Object.assign({}, n, { st: { c: ring.c, w: [ring.s, ring.s, ring.s, ring.s] } }); fxList = n.fx.filter(e => e !== ring) }
  if (n.st) {
    f.strokes = [bindColor(solid(n.st.c))]; f.strokeAlign = n.st.a || 'INSIDE'
    const w = n.st.w
    if (w[0] === w[1] && w[1] === w[2] && w[2] === w[3]) f.strokeWeight = w[0]
    else { f.strokeTopWeight = w[0]; f.strokeRightWeight = w[1]; f.strokeBottomWeight = w[2]; f.strokeLeftWeight = w[3] }
    if (n.st.d) f.dashPattern = [6, 4]
  }
  if (n.r) { f.topLeftRadius = n.r[0]; f.topRightRadius = n.r[1]; f.bottomRightRadius = n.r[2]; f.bottomLeftRadius = n.r[3] }
  if (n.ring) { f.strokes = f.fills; f.fills = []; f.strokeAlign = 'INSIDE'; f.strokeWeight = Math.max(1, Math.min(n.w, n.h) / 2 * (1 - n.ring)) }
  if (fxList && fxList.length && !n.poly) f.effects = effects(fxList.filter(e => !e.shape))
  if (n.o) f.opacity = n.o
  if (n.bm) { try { f.blendMode = n.bm } catch (e) { } }
  f.clipsContent = !!n.clip
  if (n.scroll) { try { f.overflowDirection = n.scroll } catch (e) { } } // scrolls inside prototypes, like the site's panel
}
// Apply this frame's own auto layout (before children are added).
function applyLayout(f, n) {
  const L = n.L
  if (!L || L.m === 'N') return
  const p = L.pad || [0, 0, 0, 0]
  if (L.m === 'G') {
    f.layoutMode = 'GRID'
    const g = L.grid
    f.gridRowCount = Math.max(1, g.rows.length); f.gridColumnCount = Math.max(1, g.cols.length)
    const equal = g.cols.every(c => Math.abs(c - g.cols[0]) < 1.5)
    f.gridColumnSizes = g.cols.map(c => equal ? { type: 'FLEX', value: 1 } : { type: 'FIXED', value: c })
    f.gridRowSizes = g.rows.map(r => ({ type: 'FIXED', value: r }))
    f.gridColumnGap = g.cg || 0; f.gridRowGap = g.rg || 0
  } else {
    f.layoutMode = L.m === 'H' ? 'HORIZONTAL' : 'VERTICAL'
    if (L.wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = L.cgap || 0 }
    f.itemSpacing = L.jc === 'SPACE_BETWEEN' ? 0 : (L.gap || 0)
    f.primaryAxisAlignItems = L.jc || 'MIN'
    f.counterAxisAlignItems = L.ai === 'BASELINE' && L.m === 'H' ? 'BASELINE' : (L.ai || 'MIN')
  }
  f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3]
  f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED'
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h))
}
// CSS rotates around the centre; Figma's rotation pivots on the top-left — keep the centre where the site has it.
function rotateAboutCenter(node, cssDeg, x, y) {
  const phi = -cssDeg * Math.PI / 180, co = Math.cos(phi), si = Math.sin(phi), w = node.width, h = node.height
  node.relativeTransform = [[co, si, x + w / 2 - (co * w / 2 + si * h / 2)], [-si, co, y + h / 2 - (-si * w / 2 + co * h / 2)]]
}
// Place a built node into its parent: grid cell, auto-layout flow or absolute layer.
function place(node, n, parent, parentData, ox, oy) {
  const PL = parentData && parentData.L ? parentData.L.m : 'N'
  if (PL === 'G' && !n.abs && n.cell) {
    try { parent.appendChildAt(node, Math.min(n.cell.r, parent.gridRowCount - 1), Math.min(n.cell.c, parent.gridColumnCount - 1)) } catch (e) { parent.appendChild(node) }
    try { if (n.cell.rs > 1) node.gridRowSpan = n.cell.rs; if (n.cell.cs > 1) node.gridColumnSpan = n.cell.cs } catch (e) { }
    const gz = n.sz || { x: 'FILL', y: 'FILL' }
    try { node.layoutSizingHorizontal = gz.x === 'FIXED' ? 'FIXED' : 'FILL' } catch (e) { }
    try { node.layoutSizingVertical = gz.y === 'FIXED' ? 'FIXED' : 'FILL' } catch (e) { }
    if (node.type === 'TEXT' && gz.x === 'FILL') node.textAutoResize = 'HEIGHT'
    try { if (n.cell.ha) node.gridChildHorizontalAlign = n.cell.ha; if (n.cell.va) node.gridChildVerticalAlign = n.cell.va } catch (e) { }
    if (n.rot) node.rotation = -n.rot
    return
  }
  parent.appendChild(node)
  if (PL === 'N' || !parentData || !parentData.L) { const at = node.type === 'TEXT' && n.box ? n.box : n; node.x = (at.x || 0) - ox; node.y = (at.y || 0) - oy; if (n.rot) rotateAboutCenter(node, n.rot, node.x, node.y); return }
  if (n.abs) {
    node.layoutPositioning = 'ABSOLUTE'
    const at = node.type === 'TEXT' && n.box ? n.box : n // a text layer is its line box, i.e. the element's box
    node.x = at.x - ox; node.y = at.y - oy
    if (n.cons) { try { node.constraints = { horizontal: n.cons.h === 'STRETCH' ? 'STRETCH' : n.cons.h, vertical: n.cons.v === 'STRETCH' ? 'STRETCH' : n.cons.v } } catch (e) { } }
    if (n.rot) rotateAboutCenter(node, n.rot, node.x, node.y)
    return
  }
  const sz = n.sz || { x: 'FIXED', y: 'FIXED' }
  const deferHug = node.type === 'FRAME' // frames hug only after their children are built (see applyHug)
  const canHug = node.type === 'TEXT' || node.type === 'INSTANCE'
  const sx = sz.x === 'HUG' && (deferHug || !canHug) ? 'FIXED' : sz.x, sy = sz.y === 'HUG' && (deferHug || !canHug) ? 'FIXED' : sz.y
  if (node.type === 'TEXT') {
    if (sx === 'FILL') { node.layoutSizingHorizontal = 'FILL'; node.textAutoResize = 'HEIGHT' }
    else if (sx === 'HUG') node.textAutoResize = 'WIDTH_AND_HEIGHT'
    else { node.textAutoResize = 'HEIGHT'; node.resize(Math.max(1, (n.box ? n.box.w : n.w) + (n.ml ? 6 : 1)), node.height) }
    if (sy === 'FILL') { try { node.layoutSizingVertical = 'FILL' } catch (e) { } }
  } else {
    try { node.layoutSizingHorizontal = sx } catch (e) { }
    try { node.layoutSizingVertical = sy } catch (e) { }
  }
  try { if (sz.maxW) node.maxWidth = sz.maxW; if (sz.minH) node.minHeight = sz.minH } catch (e) { }
  if (n.rot) node.rotation = -n.rot
}
function polyShape(f, n) { // clip-path polygon (price-tag notch) as a real vector behind the content
  const v = figma.createVector()
  const pts = n.poly
  v.vectorPaths = [{ windingRule: 'NONZERO', data: 'M ' + pts.map(p => p[0] + ' ' + p[1]).join(' L ') + ' Z' }]
  v.fills = paints(n.fills, n.w, n.h)
  const sh = (n.fx || []).filter(e => e.shape); if (sh.length) v.effects = effects(sh.map(e => Object.assign({}, e, { t: 'D' })))
  v.name = 'tag shape'
  f.insertChild(0, v)
  if (f.layoutMode && f.layoutMode !== 'NONE') v.layoutPositioning = 'ABSOLUTE'
  v.x = 0; v.y = 0
  try { v.constraints = { horizontal: 'SCALE', vertical: 'SCALE' } } catch (e) { }
}

// A frame hugs its content only AFTER its children exist (hugging first collapses it to nothing),
// and never on an axis where a child fills it — Figma resolves that by shrinking the child (letter-by-letter text).
function resolveSizing(n) {
  if (!n || n.k !== 'F') return n
  const kids = (n.ch || []).filter(c => !c.abs)
  if (n.sz && n.L && n.L.m !== 'N') {
    for (const ax of ['x', 'y']) if (n.sz[ax] === 'HUG' && kids.some(c => (c.sz && c.sz[ax] === 'FILL') || (n.L.m === 'G'))) n.sz[ax] = 'FIXED'
  }
  if (n.sz && (!n.L || n.L.m === 'N')) { if (n.sz.x === 'HUG') n.sz.x = 'FIXED'; if (n.sz.y === 'HUG') n.sz.y = 'FIXED' }
  ;(n.ch || []).forEach(resolveSizing)
  return n
}
function applyHug(node, n) {
  if (!n.sz || !n.L || n.L.m === 'N' || node.type !== 'FRAME') return
  try { if (n.sz.x === 'HUG') node.layoutSizingHorizontal = 'HUG' } catch (e) { }
  try { if (n.sz.y === 'HUG') node.layoutSizingVertical = 'HUG' } catch (e) { }
}

// ctx: { device, theme, screenKey, links: [], masterLinks: [] }
async function build(n, parent, parentData, ox, oy, ctx, inMaster) {
  if (!n) return null
  if (n.comp && !inMaster) return instanceOf(n, parent, parentData, ox, oy, ctx)
  let node
  if (n.k === 'T') node = await makeText(n)
  else if (n.k === 'V') node = makeVector(n)
  else if (n.k === 'I') node = makeImage(n)
  else if (n.k === 'S') { node = figma.createFrame(); node.name = 'spacer'; node.fills = []; node.resize(Math.max(0.01, n.w || 1), Math.max(0.01, n.h || 1)) }
  else { node = figma.createFrame(); styleFrame(node, n); applyLayout(node, n) }
  // margin-left:auto → a flexible spacer pushes this item to the end
  if (n.pushRight && parentData && parentData.L && parentData.L.m === 'H') { const sp = figma.createFrame(); sp.name = 'push'; sp.fills = []; sp.resize(1, 1); parent.appendChild(sp); try { sp.layoutSizingHorizontal = 'FILL' } catch (e) { } }
  place(node, n, parent, parentData, ox, oy)
  S.counts.nodes++
  if (n.link) ctx.links.push([node, n.link])
  if (n.k === 'F') {
    if (n.poly) polyShape(node, n)
    for (const c of n.ch || []) await build(c, node, n, n.x, n.y, ctx, inMaster)
    applyHug(node, n)
  }
  return node
}

// ---------------- components ----------------
async function masterFrame(n, ctx, area) {
  const f = figma.createFrame(); area.appendChild(f)
  styleFrame(f, n); applyLayout(f, n)
  // components keep the captured size but hug their content where the site does
  if (n.poly) polyShape(f, n)
  const tmp = { links: [] }
  for (const c of n.ch || []) await build(c, f, n, n.x, n.y, Object.assign({}, ctx, tmp), true)
  applyHug(f, n)
  return { f, links: tmp.links }
}
async function masterFor(n, ctx) {
  const id = ctx.device + '|' + ctx.theme + '|' + n.comp + '|' + sig(n)
  if (S.masters[id]) return S.masters[id]
  const area = componentArea(ctx)
  if (n.comp === 'Add button') return (S.masters[id] = await addButtonSet(n, ctx, area))
  const { f, links } = await masterFrame(n, ctx, area)
  const comp = figma.createComponentFromNode(f)
  if (ctx.theme === 'dark') setMode(comp, 'dark')
  const same = Object.keys(S.masters).filter(k => k.startsWith(ctx.device + '|' + ctx.theme + '|' + n.comp + '|')).length
  comp.name = n.comp + (same ? ' / Variant ' + (same + 1) : '')
  placeInArea(area, comp)
  S.masters[id] = { comp, links, data: n, device: ctx.device, theme: ctx.theme, name: n.comp }
  ctx.masterLinks.push(...links)
  return S.masters[id]
}
async function addButtonSet(n, ctx, area) {
  // Idle = captured button (auto layout); Added = the site's green confirmation state.
  const idle = figma.createComponentFromNode((await masterFrame(n, ctx, area)).f); idle.name = 'State=Idle'
  const added = figma.createComponentFromNode((await masterFrame(n, ctx, area)).f); added.name = 'State=Added'
  added.fills = [solid([15 / 255, 122 / 255, 85 / 255, 1])]
  const label = added.findOne(x => x.type === 'TEXT')
  const icon = added.findOne(x => x.type === 'FRAME' && x !== added && x.name !== 'add-stack' && x.parent === (label ? label.parent : added))
  if (label) { await figma.loadFontAsync(label.fontName); label.characters = 'Added'; label.fills = [solid([1, 1, 1, 1])] }
  if (icon) { try { const ck = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="' + icon.width + '" height="' + icon.height + '" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'); ck.name = 'check'; ck.fills = []; const p = icon.parent; p.insertChild(p.children.indexOf(icon), ck); icon.remove() } catch (e) { } }
  const set = figma.combineAsVariants([idle, added], area)
  if (ctx.theme === 'dark') setMode(set, 'dark')
  const idleLabel = idle.findOne(x => x.type === 'TEXT')
  set.name = 'Add button / ' + (idleLabel ? idleLabel.characters : 'Add') + (n.w > 200 ? ' · Large' : '')
  set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 16; set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 16
  set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'
  set.fills = []; set.strokes = [solid([0.59, 0.28, 1, 1])]; set.dashPattern = [6, 4]; set.cornerRadius = 8
  set.description = 'Tactile add-to-bag button. Click → Added (green), then back to Add after 1.8 s — same as the website.'
  placeInArea(area, set)
  try {
    await idle.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: added.id, navigation: 'CHANGE_TO', transition: { type: 'SMART_ANIMATE', easing: { type: 'EASE_OUT' }, duration: 0.25 }, resetInteractiveComponents: false }] }])
    await added.setReactionsAsync([{ trigger: { type: 'AFTER_TIMEOUT', timeout: 1.8 }, actions: [{ type: 'NODE', destinationId: idle.id, navigation: 'CHANGE_TO', transition: { type: 'SMART_ANIMATE', easing: { type: 'EASE_IN_AND_OUT' }, duration: 0.3 }, resetInteractiveComponents: false }] }])
  } catch (e) { log('Could not add Add-button interaction: ' + e.message) }
  return { comp: idle, links: [] }
}
async function instanceOf(n, parent, parentData, ox, oy, ctx) {
  const m = await masterFor(n, ctx)
  const inst = m.comp.createInstance()
  if (n.pushRight && parentData && parentData.L && parentData.L.m === 'H') { const sp = figma.createFrame(); sp.name = 'push'; sp.fills = []; sp.resize(1, 1); parent.appendChild(sp); try { sp.layoutSizingHorizontal = 'FILL' } catch (e) { } }
  place(inst, n, parent, parentData, ox, oy)
  S.counts.nodes++
  if (n.link) ctx.links.push([inst, n.link])
  await override(inst, n, ctx)
  return inst
}
// Walk instance + data in parallel: content overrides (text, colours, photos) and per-instance links.
async function override(node, n, ctx) {
  if (!node || !n) return
  if (n.k === 'T' && node.type === 'TEXT') {
    if (node.characters !== n.s) {
      try {
        const fonts = node.getRangeAllFontNames(0, node.characters.length); for (const f of fonts) await figma.loadFontAsync(f)
        node.characters = n.s
        if (n.segs || BN.test(n.s)) await styleRuns(node, n, n.segs || [{ s: n.s, st: { fam: n.f.fam, st: n.f.st, sz: n.f.sz, lh: n.f.lh, ls: n.f.ls, u: n.f.u, c: n.c, gf: n.gf } }])
      } catch (e) { log('Text override failed on ' + node.name + ': ' + e.message) }
    }
    const c = n.c || (n.segs && n.segs[0].st.c)
    if (c) { const cur = node.fills[0]; if (!cur || cur.type !== 'SOLID' || key([cur.color.r, cur.color.g, cur.color.b, cur.opacity]) !== key(c)) { try { node.fills = [bindColor(solid(c))] } catch (e) { } } }
    if (n.link) ctx.links.push([node, n.link])
    return
  }
  if (n.k === 'I' && node.type === 'RECTANGLE') { const h = S.images[n.src]; const cur = node.fills[0]; if (h && (!cur || cur.imageHash !== h)) node.fills = [{ type: 'IMAGE', imageHash: h, scaleMode: n.fit === 'FILL' ? 'FILL' : 'FIT' }]; return }
  if (n.k !== 'F') return
  if (node.type === 'INSTANCE' && node !== undefined && n.comp && n.comp !== 'Product card' && ctx.__inner) { if (n.link) ctx.links.push([node, n.link]); return }
  if (n.link) ctx.links.push([node, n.link])
  // per-instance colours (e.g. green "New arrival" badge vs white type tag, ticked compare box)
  if ((node.type === 'FRAME' || node.type === 'INSTANCE') && !n.poly && n.fills) {
    try { const want = paints(n.fills, n.w, n.h); if (fillSig(node.fills) !== fillSig(want)) node.fills = want } catch (e) { }
  }
  // skip the vector shape and push-spacers the builder inserted
  const kids = (node.children || []).filter(c => c.name !== 'tag shape' && c.name !== 'push')
  const data = n.ch || []
  for (let i = 0; i < Math.min(kids.length, data.length); i++) await override(kids[i], data[i], Object.assign({}, ctx, { __inner: true }))
}

function fillSig(list) {
  const r = v => Math.round((v || 0) * 100)
  return (list || []).filter(p => p.visible !== false).map(p => p.type + ':' + (p.color ? [r(p.color.r), r(p.color.g), r(p.color.b), r(p.opacity === undefined ? 1 : p.opacity)].join(',') : '') + (p.gradientStops ? p.gradientStops.map(g => [r(g.color.r), r(g.color.g), r(g.color.b), r(g.color.a)].join(',')).join('|') : '') + (p.imageHash || '')).join(';')
}

// ---------------- variant sets (premium organisation) ----------------
function flatData(n, out) { out.push(n); (n.ch || []).forEach(c => flatData(c, out)); return out }
function variantProps(m) {
  if (m.name !== 'Product card') return null
  const all = flatData(m.data, [])
  const txt = re => all.some(x => x.k === 'T' && re.test(x.s))
  const heart = all.find(x => x.k === 'V' && x.n === 'heart')
  return [
    ['Width', String(Math.round(m.data.w))],
    ['Badge', txt(/^new arrival$/i) ? 'New' : 'Type'],
    ['Saved', heart && /<path[^>]*fill="(?!none)/.test(heart.svg) ? 'Yes' : 'No'],
    ['Compare', all.some(x => x.k === 'V' && x.n === 'check') ? 'On' : 'Off'],
    ['Buy', txt(/^enquire$/i) ? 'Enquire' : 'Add'],
  ]
}
function relayoutArea(area) {
  let y = 120, w = 400
  for (const c of area.children) { c.x = 100; c.y = y; y += c.height + 100; w = Math.max(w, c.width + 200) }
  area.resizeWithoutConstraints(w, y + 40)
}
function organiseComponents() {
  const groups = {}
  for (const m of Object.values(S.masters)) if (m.name && m.name !== 'Add button' && m.comp.type === 'COMPONENT') (groups[m.device + '|' + m.theme + '|' + m.name] = groups[m.device + '|' + m.theme + '|' + m.name] || []).push(m)
  for (const [k, list] of Object.entries(groups)) {
    const [device, theme, name] = k.split('|')
    const area = S.frames['area|' + device + '|' + theme]
    if (list.length < 2) { list[0].comp.name = name; continue }
    const labels = list.map((m, i) => { const p = variantProps(m); return p ? p.map(([a, b]) => a + '=' + b).join(', ') : 'Variant=' + (i + 1) })
    const dup = new Set(labels).size !== labels.length
    list.forEach((m, i) => { m.comp.name = labels[i] + (dup ? ', Layout=' + (i + 1) : '') })
    try {
      const set = figma.combineAsVariants(list.map(m => m.comp), area)
      set.name = name
      set.layoutMode = 'HORIZONTAL'; set.layoutWrap = 'WRAP'; set.itemSpacing = 48; set.counterAxisSpacing = 48
      set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 48
      set.primaryAxisSizingMode = 'FIXED'; set.counterAxisSizingMode = 'AUTO'
      const widest = Math.max(...list.map(m => m.comp.width))
      set.resize(Math.min(Math.max(widest + 96, 1400), Math.max(widest + 96, device === 'd' ? 2600 : 1400)), set.height)
      set.fills = []; set.strokes = [solid([0.59, 0.28, 1, 1])]; set.dashPattern = [6, 4]; set.cornerRadius = 12
      if (theme === 'dark') setMode(set, 'dark')
      set.description = name === 'Product card' ? 'Product card — every state used on the site. Swap Badge / Saved / Compare / Buy in the right panel.' : name + ' — page-specific states captured from the site.'
    } catch (e) { log('Could not group ' + name + ': ' + e.message) }
  }
  for (const k of Object.keys(S.frames)) if (k.startsWith('area|')) relayoutArea(S.frames[k])
}

// ---------------- page layout ----------------
function componentArea(ctx) {
  const pg = S.pages[ctx.device]
  const k = 'area|' + ctx.device + '|' + ctx.theme
  if (S.frames[k]) return S.frames[k]
  const sec = figma.createSection(); pg.page.appendChild(sec)
  sec.name = 'Components · ' + (ctx.theme === 'light' ? 'Light' : 'Dark')
  sec.x = -2600; sec.y = ctx.theme === 'light' ? 0 : pg.rowY.dark || 20000
  sec.resizeWithoutConstraints(2400, 400)
  S.cursor.set(sec, 120)
  if (ctx.theme === 'dark') setMode(sec, 'dark')
  S.frames[k] = sec
  return sec
}
function placeInArea(area, node) {
  const y = S.cursor.get(area) || 120
  if (node.parent !== area) area.appendChild(node)
  node.x = 100; node.y = y
  S.cursor.set(area, y + node.height + 80)
  area.resizeWithoutConstraints(Math.max(area.width, node.width + 200), Math.max(area.height, y + node.height + 120))
}
function ensurePage(device) {
  if (S.pages[device]) return S.pages[device]
  const page = figma.createPage()
  page.name = device === 'd' ? '🖥  Desktop · 1920' : '📱 Mobile · 402'
  S.pages[device] = { page, x: { light: 0, dark: 0 }, rowY: { light: 0, dark: null }, maxH: { light: 0 }, sections: {} }
  return S.pages[device]
}
function rowSection(pg, theme) {
  if (pg.sections[theme]) return pg.sections[theme]
  const sec = figma.createSection(); pg.page.appendChild(sec)
  sec.name = theme === 'light' ? 'Light theme' : 'Dark theme'
  sec.x = 0; sec.y = theme === 'light' ? 0 : (pg.rowY.dark || 0)
  if (theme === 'dark') setMode(sec, 'dark')
  pg.sections[theme] = sec
  return sec
}

async function buildScreen(d) {
  THEME = d.theme
  const pg = ensurePage(d.device)
  if (d.theme === 'dark' && pg.rowY.dark === null) pg.rowY.dark = pg.maxH.light + 1200
  const sec = rowSection(pg, d.theme)
  const ctx = { device: d.device, theme: d.theme, screenKey: d.key, links: [], masterLinks: [] }
  // body → #root wrapper: the screen frame itself takes the page's layout
  let root = resolveSizing(d.root)
  while (root && root.ch && root.ch.length === 1 && root.ch[0].k === 'F' && !root.ch[0].comp && !root.ch[0].fills) root = root.ch[0]
  const frame = figma.createFrame()
  sec.appendChild(frame)
  frame.name = d.label
  frame.fills = [bindColor(solid(d.bg))]
  frame.clipsContent = true
  const rootData = Object.assign({}, root, { w: d.w, h: d.h, x: 0, y: d.top || 0 })
  applyLayout(frame, rootData)
  if (frame.layoutMode === 'NONE') { frame.layoutMode = 'VERTICAL'; frame.primaryAxisSizingMode = 'FIXED'; frame.counterAxisSizingMode = 'FIXED' }
  frame.resize(d.w, d.h)
  frame.x = 120 + pg.x[d.theme]; frame.y = 160
  pg.x[d.theme] += d.w + (d.device === 'd' ? 240 : 120)
  setMode(frame, d.theme)
  const pinned = []
  for (const n of root.ch || []) {
    const made = await build(n, frame, rootData, 0, d.top || 0, ctx, false)
    if (made && (n.sticky || n.fixed || n.comp === 'Topbar')) pinned.push({ made, n })
  }
  // Full pages grow with their content (responsive height); open states keep the viewport size.
  if (!d.state) { try { frame.primaryAxisSizingMode = 'AUTO' } catch (e) { } }
  // Pinned layers for prototype scrolling: top bar + header at the top, mobile nav / compare tray at the bottom.
  if (!d.state) {
    // Fixed layers must be absolute: the top bar + header become absolute (full-width, pinned to the top)
    // and a spacer of the same height keeps their place in the auto-layout flow, so nothing shifts.
    let fixedCount = 0
    for (const { made, n } of pinned) {
      if (!n.fixed) {
        const sp = figma.createFrame(); sp.name = (n.comp || n.n) + ' space'; sp.fills = []; sp.resize(d.w, Math.max(1, made.height))
        frame.insertChild(frame.children.indexOf(made), sp)
        try { sp.layoutSizingHorizontal = 'FILL'; sp.layoutSizingVertical = 'FIXED' } catch (e) { }
        made.layoutPositioning = 'ABSOLUTE'; made.x = 0; made.y = n.y - (d.top || 0)
        try { made.constraints = { horizontal: 'STRETCH', vertical: 'MIN' } } catch (e) { }
      }
      frame.appendChild(made); fixedCount++
    }
    try { frame.numberOfFixedChildren = fixedCount } catch (e) { log('Could not pin layers: ' + e.message) }
  }
  S.frames[d.device + '|' + d.theme + '|' + d.key] = frame
  S.pendingLinks.push({ device: d.device, theme: d.theme, key: d.key, links: ctx.links.concat(ctx.masterLinks) })
  pg.maxH[d.theme] = Math.max(pg.maxH[d.theme] || 0, frame.height + 320)
  sec.resizeWithoutConstraints(pg.x[d.theme] + 240, pg.maxH[d.theme])
  S.counts.screens++
}

// ---------------- prototype ----------------
function resolve(link, device, theme, key) {
  if (link === 'back') return 'BACK'
  if (link === 'theme') return device + '|' + (theme === 'light' ? 'dark' : 'light') + '|' + key
  if (link.startsWith('state:')) return device + '|' + theme + '|' + link.slice(6)
  const raw = link.replace(/^#\/?/, '').split('?')[0]
  const parts = raw.split('/').filter(Boolean)
  const map = { '': 'home', shop: parts[1] ? 'category' : 'shop', product: 'product', search: 'search', support: 'support', finder: 'finder', finance: 'finance', compare: 'compare', wishlist: 'wishlist', cart: 'cart', checkout: 'checkout', stores: 'stores', account: 'account', about: 'about', sources: 'sources', privacy: 'privacy' }
  const k = map[parts[0] || ''] || '404'
  return device + '|' + theme + '|' + k
}
async function wireLinks() {
  let ok = 0, fail = 0
  const done = new Set()
  for (const grp of S.pendingLinks) {
    for (const [node, link] of grp.links) {
      if (!node || node.removed || done.has(node.id)) continue
      const target = resolve(link, grp.device, grp.theme, grp.key)
      let action
      if (target === 'BACK') action = { type: 'BACK' }
      else {
        const dest = S.frames[target] || S.frames[target.replace(/\|[^|]+$/, '|404')]
        if (!dest) continue
        if (dest === node) continue
        action = { type: 'NODE', destinationId: dest.id, navigation: 'NAVIGATE', transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.3 }, resetScrollPosition: true }
      }
      try { await node.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [action] }]); ok++; done.add(node.id) } catch (e) { fail++ }
    }
  }
  for (const d of Object.keys(S.pages)) {
    const pg = S.pages[d]
    const pts = []
    for (const th of ['light', 'dark']) { const f = S.frames[d + '|' + th + '|home']; if (f) pts.push({ nodeId: f.id, name: (d === 'd' ? 'Desktop' : 'Mobile') + ' · ' + (th === 'light' ? 'Light' : 'Dark') }) }
    try { pg.page.flowStartingPoints = pts } catch (e) { }
  }
  log('Prototype: ' + ok + ' links wired' + (fail ? ', ' + fail + ' skipped' : ''))
}

// Extra pages (cover, design system). Figma's free Starter plan allows only 3 pages per file, so if a new
// page can't be created they share one page (Desktop and Mobile always keep their own pages).
function extraPage(name) {
  try { const p = figma.createPage(); p.name = name; return { page: p, x0: 0 } }
  catch (e) {
    const used = new Set(Object.values(S.pages).map(x => x.page))
    let p = S.sharedPage || figma.root.children.find(pg => !used.has(pg)) || figma.root.children[0]
    if (!S.sharedPage) { S.sharedPage = p; p.name = '📘 Cover & design system'; log('Your Figma plan limits pages per file, so the cover and design system share one page. Desktop and Mobile keep their own pages.') }
    const right = p.children.reduce((m, c) => Math.max(m, c.x + c.width), 0)
    return { page: p, x0: p.children.length ? right + 400 : 0 }
  }
}

// ---------------- design system page ----------------
async function designSystemPage(tokens, samples) {
  const { page, x0 } = extraPage('🎨 Design system')
  await figma.setCurrentPageAsync(page)
  const title = await loadFont('Plus Jakarta Sans', 'ExtraBold'), body = await loadFont('Plus Jakarta Sans', 'Medium')
  const txt = (s, f, size, x, y, parent, color) => { const t = figma.createText(); t.fontName = f; t.characters = s; t.fontSize = size; t.fills = [solid(color || [0.05, 0.08, 0.2, 1])]; parent.appendChild(t); t.x = x; t.y = y; return t }
  const board = figma.createFrame(); page.appendChild(board); board.x = x0; board.name = 'Colour tokens'; board.resize(1520, 200); board.fills = [solid([0.96, 0.97, 0.99, 1])]; board.cornerRadius = 24
  txt('Colour tokens', title, 40, 60, 48, board)
  txt(S.vars && S.vars.modes ? 'Variables with Light and Dark modes. Every screen is bound to these.' : 'Variables (Light and Dark collections). Every screen is bound to these.', body, 16, 60, 104, board, [0.3, 0.35, 0.5, 1])
  const names = Object.keys(tokens.light || {})
  let i = 0
  for (const th of ['light', 'dark']) {
    const row = figma.createFrame(); board.appendChild(row); row.name = th === 'light' ? 'Light' : 'Dark'
    row.fills = [solid(th === 'light' ? [1, 1, 1, 1] : [0.024, 0.04, 0.1, 1])]; row.cornerRadius = 16
    row.x = 60; row.y = 160 + i * 460; row.resize(1400, 420)
    setMode(row, th)
    txt(th === 'light' ? 'Light' : 'Dark', title, 20, 28, 24, row, th === 'light' ? [0.05, 0.08, 0.2, 1] : [0.93, 0.94, 1, 1])
    names.forEach((n, j) => {
      const c = tokens[th][n]; const x = 28 + (j % 9) * 150, y = 70 + Math.floor(j / 9) * 115
      const sw = figma.createRectangle(); row.appendChild(sw); sw.resize(132, 64); sw.cornerRadius = 12; sw.x = x; sw.y = y
      let p = solid(c); const vv = S.vars && S.vars.byName[th][n]; if (vv) { try { p = figma.variables.setBoundVariableForPaint(p, 'color', vv) } catch (e) { } }
      sw.fills = [p]; sw.strokes = [solid([0.5, 0.55, 0.7, 0.35])]; sw.strokeWeight = 1; sw.name = n
      txt(n, body, 11, x, y + 70, row, th === 'light' ? [0.15, 0.2, 0.35, 1] : [0.8, 0.83, 0.95, 1])
    })
    i++
  }
  board.resize(1520, 160 + 2 * 460 + 40)
  // type specimen
  const tb = figma.createFrame(); page.appendChild(tb); tb.name = 'Typography'; tb.x = x0 + 1620; tb.fills = [solid([1, 1, 1, 1])]; tb.cornerRadius = 24
  txt('Typography', title, 40, 60, 48, tb)
  txt('Plus Jakarta Sans (UI) · Caveat (handwritten accents) · Hind Siliguri (৳ and Bangla). Text styles below are applied across every screen.', body, 16, 60, 104, tb, [0.3, 0.35, 0.5, 1])
  let y = 170
  const styles = (figma.getLocalTextStylesAsync ? await figma.getLocalTextStylesAsync() : figma.getLocalTextStyles()).slice().sort((a, b) => b.fontSize - a.fontSize)
  for (const st of styles) {
    await figma.loadFontAsync(st.fontName)
    const lab = txt(st.name + '  ·  ' + st.fontName.style + ' ' + st.fontSize + '/' + Math.round(st.lineHeight.value || 0), body, 12, 60, y, tb, [0.4, 0.45, 0.6, 1])
    const t = figma.createText(); t.fontName = st.fontName; t.characters = st.fontSize > 40 ? 'A little smarter.' : 'Find technology that fits your everyday.'
    tb.appendChild(t); await t.setTextStyleIdAsync(st.id); t.fills = [solid([0.05, 0.08, 0.2, 1])]; t.x = 60; t.y = y + 20
    y += 20 + t.height + 28
  }
  tb.resize(1200, y + 40)
  return page
}

async function cover(meta) {
  const { page, x0 } = extraPage('📘 Cover')
  await figma.setCurrentPageAsync(page)
  const f = figma.createFrame(); page.appendChild(f); f.name = 'Cover'; f.resize(1920, 1080); f.x = x0
  f.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0.7, 0.7, -0.2], [-0.7, 0.7, 0.5]], gradientStops: [{ position: 0, color: { r: 0.04, g: 0.07, b: 0.25, a: 1 } }, { position: 1, color: { r: 0.14, g: 0.22, b: 0.77, a: 1 } }] }]
  const t1 = await loadFont('Plus Jakarta Sans', 'ExtraBold'), t2 = await loadFont('Plus Jakarta Sans', 'Medium')
  const tx = (s, font, size, y, op) => { const t = figma.createText(); t.fontName = font; t.characters = s; t.fontSize = size; t.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: op || 1 }]; t.letterSpacing = { unit: 'PERCENT', value: size > 60 ? -4 : 0 }; f.appendChild(t); t.x = 140; t.y = y; return t }
  tx('WALTON PLAZA', t1, 22, 160, 0.7)
  tx('A little smarter.\nA lot more home.', t1, 120, 230)
  tx('Website redesign · imported from the live build · ' + meta.screens + ' screens · Desktop & Mobile · Light & Dark', t2, 26, 620, 0.8)
  tx('Desktop and Mobile each have their own page (Light + Dark rows).  Press ▶ Present on a flow (Desktop · Light) to click through the prototype.', t2, 22, 670, 0.6)
}

// ---------------- message loop ----------------
figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'start') {
      S.opts = msg.opts; S.tokens = msg.tokens
      post('progress', { label: 'Loading fonts…' })
      for (const fam of ['Plus Jakarta Sans', 'Hind Siliguri', 'Caveat']) for (const st of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold']) await loadFont(fam, st)
      post('progress', { label: 'Creating colour variables & text styles…' })
      setupVariables(msg.tokens)
      await setupTextStyles(msg.textSamples || [])
      post('ready-images')
    } else if (msg.type === 'images') {
      for (const im of msg.list) { try { S.images[im.src] = figma.createImage(figma.base64Decode(im.b64)).hash } catch (e) { log('Image failed: ' + im.src) } }
      post('ready-screens')
    } else if (msg.type === 'screen') {
      const d = msg.data
      const pg = ensurePage(d.device)
      if (figma.currentPage !== pg.page) await figma.setCurrentPageAsync(pg.page)
      await buildScreen(d)
      post('screen-done', { id: d.id })
    } else if (msg.type === 'finish') {
      post('progress', { label: 'Organising components into variant sets…' })
      organiseComponents()
      post('progress', { label: 'Wiring prototype links…' })
      await wireLinks()
      post('progress', { label: 'Design system page…' })
      await designSystemPage(S.tokens, [])
      await cover({ screens: S.counts.screens })
      // order pages: Cover, Desktop, Mobile, Design system
      const order = [figma.root.children.find(p => p.name.indexOf('Cover') > -1), S.pages.d && S.pages.d.page, S.pages.m && S.pages.m.page, figma.root.children.find(p => p.name.indexOf('Design system') > -1)].filter(Boolean).filter((p, k, arr) => arr.indexOf(p) === k) // shared page appears once
      order.forEach((p, i) => figma.root.insertChild(i, p))
      const first = S.pages.d ? S.pages.d.page : S.pages.m.page
      await figma.setCurrentPageAsync(first)
      figma.viewport.scrollAndZoomIntoView(first.children.filter(c => c.type === 'SECTION'))
      post('done', { screens: S.counts.screens, nodes: S.counts.nodes })
      figma.notify('Walton Plaza imported: ' + S.counts.screens + ' screens, ' + S.counts.nodes + ' layers.')
    } else if (msg.type === 'close') figma.closePlugin()
  } catch (e) {
    post('error', { msg: (e && e.message) || String(e), stack: e && e.stack })
  }
}
