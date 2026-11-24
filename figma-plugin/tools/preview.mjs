// Visual check: renders the Figma node trees the plugin builds (dumped by `DUMP=… node dryrun.mjs`)
// using Figma's auto-layout rules, so the result can be compared with the live website before importing.
// Usage: node preview.mjs   -> ../data/preview/<frame>.png
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer-core'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const { frames, images } = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'preview-dump.json'), 'utf8'))
const OUT = path.join(HERE, '..', 'data', 'preview'); fs.mkdirSync(OUT, { recursive: true })

const W = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, 'Semi Bold': 600, Bold: 700, ExtraBold: 800, 'Extra Bold': 800, Black: 900 }
const rgba = (c, o = 1) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${(c.a === undefined ? 1 : c.a) * o})`
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
function paint(p, w, h) {
  if (!p || p.visible === false) return null
  if (p.type === 'SOLID') return rgba(p.color, p.opacity === undefined ? 1 : p.opacity)
  if (p.type === 'IMAGE') return `url(data:image/png;base64,${images[p.imageHash] || ''}) center/${p.scaleMode === 'FIT' ? 'contain' : 'cover'} no-repeat`
  if (p.type === 'GRADIENT_ANGULAR') return `conic-gradient(${p.gradientStops.map(s => `${rgba(s.color)} ${(s.position * 100).toFixed(1)}%`).join(',')})`
  if (p.type && p.type.startsWith('GRADIENT')) {
    const st = p.gradientStops.map(s => `${rgba(s.color)} ${(s.position * 100).toFixed(1)}%`).join(',')
    const m = p.gradientTransform; const det = m[0][0] * m[1][1] - m[0][1] * m[1][0] || 1
    if (p.type === 'GRADIENT_LINEAR') { const vx = m[1][1] / det * w, vy = -m[1][0] / det * h; const ang = Math.atan2(vx, -vy) * 180 / Math.PI; return `linear-gradient(${ang.toFixed(1)}deg,${st})` }
    const sx = m[1][1] / det, sy = m[0][0] / det, cx = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det, cy = (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det
    return `radial-gradient(${(sx * w / 2).toFixed(1)}px ${(sy * h / 2).toFixed(1)}px at ${((cx + sx / 2) * w).toFixed(1)}px ${((cy + sy / 2) * h).toFixed(1)}px,${st})`
  }
  return null
}
const bg = (fills, w, h) => { const l = (fills || []).map(p => paint(p, w, h)).filter(Boolean).reverse(); return l.length ? `background:${l.map((v, i) => i === l.length - 1 && /^rgba/.test(v) ? `linear-gradient(${v},${v})` : v).join(',')};` : '' }
const JC = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' }
const AI = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' }

function render(n, parent) {
  const inAL = parent && parent.layoutMode && parent.layoutMode !== 'NONE'
  const abs = !parent || !inAL || n.layoutPositioning === 'ABSOLUTE'
  let css = abs ? `position:absolute;left:${n.x || 0}px;top:${n.y || 0}px;` : 'position:relative;flex-shrink:0;'
  const sh = n._lsh || 'FIXED', sv = n._lsv || 'FIXED'
  if (n.type === 'TEXT') {
    const font = n.fontName || {}, ar = n.textAutoResize || 'NONE'
    css += `font-family:'${font.family}';font-weight:${W[font.style] || 400};font-size:${n.fontSize}px;line-height:${n.lineHeight ? n.lineHeight.value + 'px' : 'normal'};letter-spacing:${n.letterSpacing ? n.letterSpacing.value + 'px' : 'normal'};text-align:${(n.textAlignHorizontal || 'LEFT').toLowerCase()};color:${(n.fills && n.fills[0] && n.fills[0].type === 'SOLID') ? rgba(n.fills[0].color, n.fills[0].opacity) : 'transparent'};`
    if (n.fills && n.fills[0] && n.fills[0].type && n.fills[0].type.startsWith('GRADIENT')) css += `background:${paint(n.fills[0], n.width, n.height)};-webkit-background-clip:text;color:transparent;`
    if (ar === 'WIDTH_AND_HEIGHT') css += 'white-space:pre;'
    else { css += n.textTruncation === 'ENDING' ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' : 'white-space:pre-wrap;'; if (sh === 'FILL' && !abs) css += (parent.layoutMode === 'HORIZONTAL' ? 'flex:1 1 0;min-width:0;' : 'align-self:stretch;'); else css += `width:${n.width}px;` }
    if (ar === 'NONE') css += `height:${n.height}px;overflow:hidden;`
    if (n.minHeight) css += `min-height:${n.minHeight}px;`
    if (n._cell && parent && parent.layoutMode === 'GRID') css += `grid-row:${n._cell[0] + 1} / span ${n._grs || 1};grid-column:${n._cell[1] + 1} / span ${n._gcs || 1};justify-self:stretch;align-self:${sv === 'FILL' ? 'stretch' : ({ MIN: 'start', CENTER: 'center', MAX: 'end' }[n.gridChildVerticalAlign] || 'start')};width:auto;`
    let txt = esc(n._chars || '').replace(/\u2028/g, '\n')
    if (n._ranges) { // styled runs (bold word, coloured price…)
      const chars = [...(n._chars || '')]; const marks = chars.map(() => ({}))
      for (const [k, a, b, v] of n._ranges) for (let i = a; i < b && i < marks.length; i++) marks[i][k] = v
      let html = '', cur = null, buf = ''
      const flush = () => { if (!buf) return; const m = cur || {}; const st = (m.font ? `font-family:'${m.font.family}';font-weight:${W[m.font.style] || 400};` : '') + (m.size ? `font-size:${m.size}px;line-height:1;` : '') + (m.fills && m.fills[0] && m.fills[0].type === 'SOLID' ? `color:${rgba(m.fills[0].color, m.fills[0].opacity)};` : m.fills && m.fills[0] && m.fills[0].gradientStops ? `background:linear-gradient(100deg,${m.fills[0].gradientStops.map(g => rgba(g.color) + ' ' + (g.position * 100) + '%').join(',')});-webkit-background-clip:text;color:transparent;` : ''); html += st ? `<span style="${st}">${esc(buf).replace(/\u2028/g, '\n')}</span>` : esc(buf).replace(/\u2028/g, '\n'); buf = '' }
      chars.forEach((ch, i) => { const key = JSON.stringify(marks[i]); if (cur === null || key !== JSON.stringify(cur)) { flush(); cur = marks[i] } buf += ch }); flush(); txt = html
    }
    return `<div style="${css}" data-t="${esc((n._chars || '').replace(/\u2028/g, ' ').slice(0, 60)).replace(/"/g, '&quot;')}">${txt}</div>`
  }
  // frames, instances, components, rectangles, vectors
  if (sh === 'FILL' && !abs) css += parent.layoutMode === 'HORIZONTAL' ? 'flex:1 1 0;min-width:0;' : parent.layoutMode === 'GRID' ? 'width:auto;' : n._mw ? 'width:100%;' : 'align-self:stretch;' // capped Fill follows the parent's alignment, like Figma
  else if (sh === 'HUG' && n.layoutMode && n.layoutMode !== 'NONE') css += 'width:max-content;'
  else css += `width:${n.width}px;`
  if (sv === 'FILL' && !abs) css += parent.layoutMode === 'VERTICAL' ? 'flex:1 1 0;min-height:0;' : parent.layoutMode === 'GRID' ? 'height:auto;' : 'align-self:stretch;'
  else if (sv === 'HUG' && n.layoutMode && n.layoutMode !== 'NONE') css += ''
  else css += `height:${n.height}px;`
  if (n._mw) css += `max-width:${n._mw}px;`
  if (n.minHeight) css += `min-height:${n.minHeight}px;`
  if (n._cell && parent && parent.layoutMode === 'GRID') css += `grid-row:${n._cell[0] + 1} / span ${n._grs || 1};grid-column:${n._cell[1] + 1} / span ${n._gcs || 1};`
  if (n._cell && parent && parent.layoutMode === 'GRID') { const A = { MIN: 'start', CENTER: 'center', MAX: 'end', AUTO: 'start' }; css += `justify-self:${sh === 'FILL' ? 'stretch' : A[n.gridChildHorizontalAlign || 'AUTO']};align-self:${sv === 'FILL' ? 'stretch' : A[n.gridChildVerticalAlign || 'AUTO']};` }
  css += bg(n.fills, n.width, n.height)
  const r = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].map(v => v || n.cornerRadius || 0)
  if (r.some(Boolean)) css += `border-radius:${r.map(v => v + 'px').join(' ')};`
  const shadows = []
  if (n.strokes && n.strokes.length && n.strokes[0].type === 'SOLID') { const c = rgba(n.strokes[0].color, n.strokes[0].opacity); const ws = n.strokeTopWeight !== undefined ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight] : [n.strokeWeight || 1, n.strokeWeight || 1, n.strokeWeight || 1, n.strokeWeight || 1]; if (ws[0] === ws[1] && ws[1] === ws[2] && ws[2] === ws[3]) shadows.push(`inset 0 0 0 ${ws[0]}px ${c}`); else { if (ws[0]) shadows.push(`inset 0 ${ws[0]}px 0 ${c}`); if (ws[2]) shadows.push(`inset 0 -${ws[2]}px 0 ${c}`); if (ws[3]) shadows.push(`inset ${ws[3]}px 0 0 ${c}`); if (ws[1]) shadows.push(`inset -${ws[1]}px 0 0 ${c}`) } }
  for (const e of n.effects || []) { if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') shadows.push(`${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${e.offset.x}px ${e.offset.y}px ${e.radius}px ${e.spread || 0}px ${rgba(e.color)}`); if (e.type === 'BACKGROUND_BLUR') css += `backdrop-filter:blur(${e.radius}px);`; if (e.type === 'LAYER_BLUR') css += `filter:blur(${e.radius}px);` }
  if (n.strokes && n.strokes[0] && n.strokes[0].type && n.strokes[0].type.startsWith('GRADIENT')) { const inner = Math.min(n.width, n.height) / 2 - (n.strokeWeight || 1); css += `background:${paint(n.strokes[0], n.width, n.height)};-webkit-mask:radial-gradient(circle closest-side, transparent ${inner}px, #000 ${inner + 0.5}px);` }
  if (shadows.length) css += `box-shadow:${shadows.join(',')};`
  if (n.opacity !== undefined && n.opacity < 1) css += `opacity:${n.opacity};`
  if (n.blendMode && n.blendMode !== 'NORMAL' && n.blendMode !== 'PASS_THROUGH') css += `mix-blend-mode:${n.blendMode.toLowerCase().replace('_', '-')};`
  if (n.clipsContent) css += 'overflow:hidden;'
  if (n.rotation) css += `transform:rotate(${-n.rotation}deg);`
  const lm = n.layoutMode
  if (lm === 'HORIZONTAL' || lm === 'VERTICAL') {
    css += `display:flex;flex-direction:${lm === 'HORIZONTAL' ? 'row' : 'column'};gap:${n.itemSpacing || 0}px;padding:${n.paddingTop || 0}px ${n.paddingRight || 0}px ${n.paddingBottom || 0}px ${n.paddingLeft || 0}px;justify-content:${JC[n.primaryAxisAlignItems] || 'flex-start'};align-items:${AI[n.counterAxisAlignItems] || 'flex-start'};box-sizing:border-box;`
    if (n.layoutWrap === 'WRAP') css += `flex-wrap:wrap;row-gap:${n.counterAxisSpacing || 0}px;`
  } else if (lm === 'GRID') {
    const cols = (n.gridColumnSizes || []).map(t => t.type === 'FLEX' ? (t.value || 1) + 'fr' : t.type === 'FIXED' ? t.value + 'px' : 'auto').join(' ')
    const rows = (n.gridRowSizes || []).map(t => t.type === 'FIXED' ? t.value + 'px' : t.type === 'FLEX' ? '1fr' : 'auto').join(' ')
    css += `display:grid;grid-template-columns:${cols};grid-template-rows:${rows};column-gap:${n.gridColumnGap || 0}px;row-gap:${n.gridRowGap || 0}px;padding:${n.paddingTop || 0}px ${n.paddingRight || 0}px ${n.paddingBottom || 0}px ${n.paddingLeft || 0}px;box-sizing:border-box;`
  }
  let inner = ''
  if (n._svg) inner = n._svg.replace(/<svg\b/, `<svg style="position:absolute;inset:0;width:100%;height:100%"`)
  if (n.type === 'VECTOR' && n._vp) inner = `<svg style="position:absolute;inset:0;overflow:visible" width="${n.width}" height="${n.height}"><path d="${n._vp[0].data}" fill="${(n.fills && n.fills[0] && n.fills[0].type === 'SOLID') ? rgba(n.fills[0].color) : '#ffd21f'}"/></svg>`
  // auto-layout children in order; absolute children rendered too (Figma keeps their x/y)
  const kids = (n.ch || []).map(c => render(c, n)).join('')
  return `<div style="${css}" data-name="${esc(n.name || '')}">${inner}${kids}</div>`
}

const fontsCss = fs.readFileSync(path.join(HERE, '..', '..', 'walton-redesign', 'src', 'styles', 'fonts.css'), 'utf8').replace(/url\(\.\.\/assets\/fonts\//g, 'url(file:///' + path.join(HERE, '..', '..', 'walton-redesign', 'src', 'assets', 'fonts').replace(/\\/g, '/') + '/')
const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files'] })
for (const [fi, f] of frames.entries()) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontsCss} *{box-sizing:border-box} body{margin:0}</style></head><body>${render(Object.assign({}, f.tree, { x: 0, y: 0 }), null).replace('position:absolute;left:0px;top:0px;', 'position:relative;')}</body></html>`
  const file = path.join(OUT, fi + '_' + f.name.replace(/[^\w]+/g, '_') + '.html'); fs.writeFileSync(file, html)
  const pg = await b.newPage(); await pg.setViewport({ width: Math.ceil(f.tree.width), height: 900 })
  await pg.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 400))
  const h = await pg.evaluate(() => document.body.firstElementChild.getBoundingClientRect().height)
  await pg.screenshot({ path: file.replace(/\.html$/, '.png'), clip: { x: 0, y: 0, width: Math.ceil(f.tree.width), height: Math.min(Math.ceil(h), 16000) }, captureBeyondViewport: true })
  console.log('preview', f.page, '/', f.name, Math.ceil(f.tree.width) + 'x' + Math.ceil(h)); await pg.close()
}
await b.close()
