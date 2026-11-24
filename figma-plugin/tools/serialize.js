// Runs INSIDE the page (injected by capture.mjs). Walks the rendered DOM and returns a compact,
// Figma-ready layer tree with absolute page coordinates. No framework knowledge needed: it reads
// computed styles, so whatever the browser paints is what Figma gets.
window.__waltonSerialize = function (opts) {
  const { clipToViewport = false, links = [], components = [] } = opts || {}
  const VW = document.documentElement.clientWidth
  const VH = clipToViewport ? innerHeight : Math.max(document.documentElement.scrollHeight, innerHeight)
  const images = new Set()
  const num = v => parseFloat(v) || 0
  const R = n => Math.round(n * 100) / 100

  // ---------- colours ----------
  function parseColor(s) {
    if (!s || s === 'transparent') return null
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    const a = p.length > 3 ? p[3] : 1
    if (a <= 0.001) return null
    return [p[0] / 255, p[1] / 255, p[2] / 255, R(a)]
  }
  function parseStop(s) { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? R(p[3]) : 1] }
  function splitTop(s) { // split by top-level commas
    const out = []; let d = 0, cur = ''
    for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = '' } else cur += ch }
    if (cur.trim()) out.push(cur.trim()); return out
  }
  function stops(parts, len) {
    const st = parts.map(p => {
      const cm = p.match(/rgba?\([^)]*\)/); const c = cm && parseStop(cm[0]); if (!c) return null
      const rest = p.replace(cm[0], '').trim().split(/\s+/).filter(Boolean)
      const pos = rest.map(v => v.endsWith('%') ? num(v) / 100 : v.endsWith('px') ? num(v) / (len || 1) : null).filter(v => v !== null)
      return { c, pos: pos.length ? pos[0] : null }
    }).filter(Boolean)
    if (!st.length) return []
    if (st[0].pos === null) st[0].pos = 0
    if (st[st.length - 1].pos === null) st[st.length - 1].pos = 1
    for (let i = 1; i < st.length - 1; i++) if (st[i].pos === null) { let j = i; while (st[j].pos === null) j++; const a = st[i - 1].pos, b = st[j].pos; for (let k = i; k < j; k++) st[k].pos = a + (b - a) * (k - i + 1) / (j - i + 1) }
    // transparent stops borrow their neighbour's colour (browsers interpolate premultiplied; Figma doesn't)
    st.forEach((s, i) => { if (s.c[3] === 0) { const nb = st.slice(i + 1).find(x => x.c[3] > 0) || st.slice(0, i).reverse().find(x => x.c[3] > 0); if (nb) s.c = [nb.c[0], nb.c[1], nb.c[2], 0] } })
    return st.map(s => ({ c: s.c, p: Math.max(0, Math.min(1, R(s.pos))) }))
  }
  function gradients(bgImage, w, h) {
    if (!bgImage || bgImage === 'none') return []
    const out = []
    for (const layer of splitTop(bgImage)) {
      let m
      if ((m = layer.match(/^(repeating-)?linear-gradient\((.*)\)$/s))) {
        const parts = splitTop(m[2]); let ang = 180
        if (/deg|turn|rad|^to /.test(parts[0])) {
          const a = parts.shift()
          if (a.startsWith('to ')) { const t = a.slice(3); ang = { top: 0, right: 90, bottom: 180, left: 270, 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 }[t] ?? 180 }
          else ang = a.endsWith('turn') ? num(a) * 360 : a.endsWith('rad') ? num(a) * 180 / Math.PI : num(a)
        }
        const th = ang * Math.PI / 180, L = Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th))
        const dx = Math.sin(th), dy = -Math.cos(th), cx = w / 2, cy = h / 2
        const st = stops(parts, L); if (st.length) out.push({ t: 'L', s: [R(cx - dx * L / 2), R(cy - dy * L / 2)], e: [R(cx + dx * L / 2), R(cy + dy * L / 2)], st })
      } else if ((m = layer.match(/^(repeating-)?radial-gradient\((.*)\)$/s))) {
        const parts = splitTop(m[2]); let cx = w / 2, cy = h / 2, rx = null, ry = null, circle = false
        if (!/rgba?\(/.test(parts[0])) {
          const d = parts.shift(); circle = /circle/.test(d)
          const at = d.split(' at ')
          if (at[1]) { const [px, py] = at[1].trim().split(/\s+/); const P = (v, L) => v === 'center' ? L / 2 : v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? L : v.endsWith('%') ? num(v) / 100 * L : num(v); cx = P(px, w); cy = P(py || 'center', h) }
          const sizes = (at[0] || '').match(/[\d.]+(px|%)/g)
          if (sizes) { rx = sizes[0].endsWith('%') ? num(sizes[0]) / 100 * w : num(sizes[0]); ry = sizes[1] ? (sizes[1].endsWith('%') ? num(sizes[1]) / 100 * h : num(sizes[1])) : rx; if (!sizes[1] && !circle && /ellipse/.test(d) === false) circle = true }
        }
        if (rx === null) { const fx = Math.max(cx, w - cx), fy = Math.max(cy, h - cy); if (circle) rx = ry = Math.hypot(fx, fy); else { rx = fx * Math.SQRT2; ry = fy * Math.SQRT2 } }
        const st = stops(parts, rx); if (st.length) out.push({ t: 'R', c: [R(cx), R(cy)], r: [R(rx), R(ry)], st })
      } else if ((m = layer.match(/^conic-gradient\((.*)\)$/s))) {
        const parts = splitTop(m[1]); if (!/rgba?\(/.test(parts[0])) parts.shift()
        const st = stops(parts, 1); if (st.length) out.push({ t: 'A', c: [w / 2, h / 2], st })
      } else if ((m = layer.match(/^url\("?(.*?)"?\)$/))) {
        out.push({ t: 'IMG', src: m[1] }); images.add(m[1])
      }
    }
    return out.reverse() // CSS: first layer on top; Figma: last fill on top
  }
  function shadows(s, isText) {
    if (!s || s === 'none') return []
    return splitTop(s).map(sh => {
      const cm = sh.match(/rgba?\([^)]*\)/); const c = cm && parseColor(cm[0]); if (!c) return null
      const rest = sh.replace(cm[0], '').trim(); const inset = /inset/.test(rest)
      const n = rest.replace('inset', '').trim().split(/\s+/).map(num)
      return { t: inset ? 'I' : 'D', c, x: n[0] || 0, y: n[1] || 0, b: n[2] || 0, s: isText ? 0 : (n[3] || 0) }
    }).filter(Boolean)
  }

  // ---------- helpers ----------
  const SEMANTIC = new Set(['HEADER', 'FOOTER', 'NAV', 'SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'FORM', 'A', 'BUTTON', 'LABEL', 'LI', 'UL', 'OL', 'TABLE', 'TR', 'TH', 'TD', 'THEAD', 'TBODY', 'DL'])
  const nameOf = el => {
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(x => !/^(on|done)$/.test(x)).slice(0, 2).join('.') : ''
    const label = el.getAttribute('aria-label')
    return (label && /^(A|BUTTON)$/.test(el.tagName) ? label : '') || (c ? c : el.tagName.toLowerCase())
  }
  function rectOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } }
  function outside(r, el) {
    const host = el && el.closest && el.closest('[data-fig-comp]') // parts of a component are always kept (clipping hides them, as in the browser)
    if (host && host !== el) return false
    return r.x + r.w < -1 || r.y + r.h < -1 + (clipToViewport ? scrollY : 0) || r.x > VW + 1 || r.y > (clipToViewport ? scrollY + VH : VH) + 1 }
  const WEIGHTS = { 100: 'ExtraLight', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'ExtraBold' }
  function fontOf(cs) {
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
    const family = /jakarta/i.test(fam) ? 'Plus Jakarta Sans' : /hind/i.test(fam) ? 'Hind Siliguri' : /mono|courier/i.test(cs.fontFamily) ? 'Roboto Mono' : 'Plus Jakarta Sans'
    const wt = Math.min(900, Math.max(100, Math.round(num(cs.fontWeight) / 100) * 100))
    const size = num(cs.fontSize)
    return { fam: family, st: WEIGHTS[wt], sz: R(size), lh: cs.lineHeight === 'normal' ? R(size * 1.25) : R(num(cs.lineHeight)), ls: cs.letterSpacing === 'normal' ? 0 : R(num(cs.letterSpacing)), al: cs.textAlign === 'center' ? 'CENTER' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'RIGHT' : 'LEFT', u: /underline/.test(cs.textDecorationLine) ? 1 : 0, it: cs.fontStyle === 'italic' ? 1 : 0 }
  }
  function gradientTextFill(el) { // background-clip:text on el or a close ancestor
    for (let e = el, i = 0; e && i < 3; e = e.parentElement, i++) {
      const cs = getComputedStyle(e)
      if ((cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') && cs.backgroundImage !== 'none') { const r = e.getBoundingClientRect(); return { g: gradients(cs.backgroundImage, r.width, r.height), box: [r.left + scrollX, r.top + scrollY, r.width, r.height] } }
    }
    return null
  }

  // Annotate interactive targets so the plugin can wire prototype reactions.
  for (const [sel, target] of links) document.querySelectorAll(sel).forEach(e => { if (!e.dataset.figLink) e.dataset.figLink = target === '@href' ? e.getAttribute('href') : target })
  for (const [sel, name] of components) document.querySelectorAll(sel).forEach(e => { e.dataset.figComp = name })

  function textNodes(el, cs, out) {
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue
      let s = n.data.replace(/\s+/g, ' ')
      if (!s.trim()) continue
      const range = document.createRange(); range.selectNodeContents(n)
      const rects = [...range.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5)
      if (!rects.length) continue
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const r of rects) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom) }
      const lines = new Set(rects.map(r => Math.round(r.top))).size
      s = s.trim()
      if (lines > 1) { // keep the browser's exact line breaks as soft breaks (U+2028), so Figma wraps the same way
        const words = [...n.data.matchAll(/\S+/g)]; let prevTop = null; const parts = []
        for (const w of words) { const rr = document.createRange(); rr.setStart(n, w.index); rr.setEnd(n, w.index + w[0].length); const rs = rr.getClientRects(); const top = rs.length ? Math.round(rs[0].top) : prevTop
          parts.push((prevTop !== null && top > prevTop + 2 ? ' ' : (parts.length ? ' ' : '')) + w[0]); prevTop = top }
        s = parts.join('')
      }
      if (cs.textTransform === 'uppercase') s = s.toUpperCase(); else if (cs.textTransform === 'lowercase') s = s.toLowerCase(); else if (cs.textTransform === 'capitalize') s = s.replace(/\b\w/g, c => c.toUpperCase())
      const f = fontOf(cs)
      const node = { k: 'T', n: s.slice(0, 40), x: R(x0 + scrollX), y: R(y0 + scrollY), w: R(x1 - x0), h: R(y1 - y0), s, f, ml: lines > 1 ? 1 : 0 }
      if (lines > 1) { // wrap inside the block's content box, as the browser did
        const pr = el.getBoundingClientRect(); const pl = num(cs.paddingLeft) + num(cs.borderLeftWidth), prr = num(cs.paddingRight) + num(cs.borderRightWidth)
        if (cs.display !== 'inline') { node.x = R(pr.left + pl + scrollX); node.w = R(pr.width - pl - prr) }
      }
      const g = gradientTextFill(el)
      if (g && g.g.length && (cs.color === 'rgba(0, 0, 0, 0)' || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)')) node.gf = g
      else { const c = parseColor(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color); if (!c) continue; node.c = c }
      const ts = shadows(cs.textShadow, true); if (ts.length) node.fx = ts
      out.push(node)
    }
  }

  function walk(el, inheritedOpacity) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' && !el.children.length) return []
    const op = num(cs.opacity)
    if (op < 0.02) return []
    const r = rectOf(el)
    const srOnly = r.w <= 1.5 && r.h <= 1.5 && (cs.overflow === 'hidden' || cs.clip !== 'auto')
    if (srOnly) return []
    if (el.getAttribute('aria-hidden') === 'true' && r.w < 1) return []
    const tag = el.tagName

    // leaf types
    if (tag === 'svg') {
      if (outside(r, el) || r.w < 1) return []
      const clone = el.cloneNode(true); const color = cs.color
      clone.setAttribute('width', R(r.w)); clone.setAttribute('height', R(r.h))
      if (!clone.getAttribute('viewBox') && el.viewBox?.baseVal?.width) clone.setAttribute('viewBox', `0 0 ${el.viewBox.baseVal.width} ${el.viewBox.baseVal.height}`)
      const sw = cs.strokeWidth
      const fix = n => { for (const a of ['stroke', 'fill', 'stop-color', 'color']) { const v = n.getAttribute && n.getAttribute(a); if (v === 'currentColor') n.setAttribute(a, color) } ; [...(n.children || [])].forEach(fix) }
      fix(clone)
      if (clone.getAttribute('stroke') && sw && sw !== '1px' && /lucide/.test(el.getAttribute('class') || '')) clone.setAttribute('stroke-width', num(sw))
      clone.removeAttribute('class'); clone.querySelectorAll('[class]').forEach(n => n.removeAttribute('class'))
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      return [{ k: 'V', n: (el.getAttribute('class') || 'icon').split(' ').find(c => c.startsWith('lucide-'))?.slice(7) || 'vector', x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h), svg: clone.outerHTML, o: op < 1 ? R(op) : undefined }]
    }
    if (tag === 'IMG') {
      if (outside(r, el) || !el.naturalWidth) return []
      const src = el.getAttribute('src'); images.add(src)
      let ix = r.x, iy = r.y, iw = r.w, ih = r.h
      const fit = cs.objectFit
      const centred = /^50% 50%$/.test(cs.objectPosition.trim()) || cs.objectPosition.trim() === 'center'
      if ((fit === 'contain' || fit === 'scale-down') && centred) { // same as Figma "Fit": keep the box, so instances can swap photos
        const node = { k: 'I', n: el.alt || 'image', x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h), src, fit: 'FIT' }
        if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') node.bm = cs.mixBlendMode.toUpperCase().replace('-', '_')
        if (op < 1) node.o = R(op)
        return [node]
      }
      if (fit === 'contain' || fit === 'scale-down') { // off-centre: compute the painted rect exactly
        const s = Math.min(r.w / el.naturalWidth, r.h / el.naturalHeight); iw = el.naturalWidth * s; ih = el.naturalHeight * s
        const [px, py] = cs.objectPosition.split(' ').map((v, i) => v.endsWith('%') ? num(v) / 100 : v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : 0.5)
        ix = r.x + (r.w - iw) * px; iy = r.y + (r.h - ih) * py
      }
      const node = { k: 'I', n: el.alt || 'image', x: R(ix), y: R(iy), w: R(iw), h: R(ih), src, fit: fit === 'cover' ? 'FILL' : 'FILL' }
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') node.bm = cs.mixBlendMode.toUpperCase().replace('-', '_')
      if (op < 1) node.o = R(op)
      const rad = num(cs.borderTopLeftRadius); if (rad) node.r = [rad, num(cs.borderTopRightRadius), num(cs.borderBottomRightRadius), num(cs.borderBottomLeftRadius)]
      return [node]
    }

    // container / box
    const isForm = /^(INPUT|SELECT|TEXTAREA)$/.test(tag)
    const fills = []
    const bgc = parseColor(cs.backgroundColor)
    if (bgc) fills.push({ t: 'S', c: bgc })
    const clipText = cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text'
    const tiles = []
    if (!clipText && cs.backgroundImage !== 'none') {
      const layers = splitTop(cs.backgroundImage), sizes = splitTop(cs.backgroundSize || 'auto')
      const keepLayers = []
      layers.forEach((layer, i) => {
        const sz = (sizes[i % sizes.length] || 'auto').trim().split(/\s+/)
        const tw = /px$/.test(sz[0]) ? num(sz[0]) : null, th = /px$/.test(sz[1] || sz[0]) ? num(sz[1] || sz[0]) : null
        if (tw && th && (tw < r.w - 1 || th < r.h - 1)) { // repeating tile → draw its lines
          const m = layer.match(/linear-gradient\((?:(\d+)deg,\s*)?(rgba?\([^)]*\))\s+([\d.]+)px/)
          if (m) tiles.push({ ang: +(m[1] || 180), c: parseStop(m[2]), t: num(m[3]), tw, th })
        } else keepLayers.push(layer)
      })
      fills.push(...gradients(keepLayers.join(', ') || 'none', r.w, r.h))
    }
    const bw = [num(cs.borderTopWidth), num(cs.borderRightWidth), num(cs.borderBottomWidth), num(cs.borderLeftWidth)]
    const bstyle = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle]
    const bcols = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(parseColor)
    let stroke = null
    const bi = bw.map((w, i) => w > 0 && bstyle[i] !== 'none' && bstyle[i] !== 'hidden' && bcols[i] ? w : 0)
    if (bi.some(Boolean)) { const ci = bi.findIndex(Boolean); stroke = { c: bcols[ci], w: bi, d: bstyle[ci] === 'dashed' ? 1 : 0 } }
    const pct = (v, L) => v.endsWith('%') ? num(v) / 100 * L : num(v)
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(v => Math.min(pct(v.split(' ')[0], Math.min(r.w, r.h)), Math.min(r.w, r.h) / 2))
    const fx = shadows(cs.boxShadow)
    const bf = cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : cs.webkitBackdropFilter
    if (bf && bf !== 'none') { const m = bf.match(/blur\(([\d.]+)px\)/); if (m) fx.push({ t: 'B', b: num(m[1]) }) }
    const fm = cs.filter && cs.filter.match(/blur\(([\d.]+)px\)/); if (fm) fx.push({ t: 'LB', b: num(fm[1]) })
    const clip = /hidden|clip/.test(cs.overflowX + cs.overflowY) && tag !== 'BODY' && tag !== 'HTML'
    const visual = fills.length || stroke || fx.length
    const comp = el.dataset.figComp, link = el.dataset.figLink
    const pos = cs.position
    const keep = visual || clip || comp || link || isForm || op < 1 || SEMANTIC.has(tag) || pos === 'fixed' || pos === 'sticky'

    let kids = []
    if (isForm) {
      kids = formContent(el, cs, r)
    } else {
      for (const t of tiles) { // grid / stripe patterns as crisp 1px layers
        const horiz = t.ang % 180 === 0, step = horiz ? t.th : t.tw, count = Math.floor((horiz ? r.h : r.w) / step) + 1
        if (count > 120 || !t.c) continue
        for (let i = 0; i < count; i++) kids.push({ k: 'F', n: horiz ? 'grid-line-h' : 'grid-line-v', x: R(horiz ? r.x : r.x + i * step), y: R(horiz ? r.y + i * step : r.y), w: horiz ? R(r.w) : t.t, h: horiz ? t.t : R(r.h), fills: [{ t: 'S', c: t.c }], z: -2 })
      }
      textNodes(el, cs, kids)
      for (const c of el.children) kids.push(...walk(c))
      // pseudo elements that paint a covering layer (e.g. pills, spotlights) — only when clearly visible
      for (const ps of ['::before', '::after']) {
        const p = getComputedStyle(el, ps)
        if (!p.content || p.content === 'none' || num(p.opacity) < 0.05 || p.display === 'none') continue
        const pf = []; const pc = parseColor(p.backgroundColor); if (pc) pf.push({ t: 'S', c: pc })
        pf.push(...gradients(p.backgroundImage, r.w, r.h))
        if (!pf.length || p.position !== 'absolute') continue
        if (!(p.top === '0px' && p.left === '0px' && p.right === '0px' && p.bottom === '0px') && !(p.inset === '0px')) continue
        kids.push({ k: 'F', n: ps.slice(2), x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h), fills: pf, o: num(p.opacity) < 1 ? R(num(p.opacity)) : undefined, r: rad.some(Boolean) ? rad.map(R) : undefined, z: num(p.zIndex) || (ps === '::before' ? -1 : 0) })
      }
    }
    // paint order: honour explicit z-index among positioned siblings
    kids.forEach((k, i) => { k._i = i })
    kids.sort((a, b) => ((a.z || 0) - (b.z || 0)) || a._i - b._i)
    kids.forEach(k => { delete k._i })

    if (!keep) return kids // flatten pure layout wrappers
    if (outside(r, el) && !kids.length) return []
    if (r.w < 0.5 && r.h < 0.5 && !kids.length) return []
    const node = { k: 'F', n: comp || nameOf(el), x: R(r.x), y: R(r.y), w: R(Math.max(r.w, 0.01)), h: R(Math.max(r.h, 0.01)) }
    if (fills.length) node.fills = fills
    if (stroke) node.st = stroke
    if (rad.some(Boolean)) node.r = rad.map(R)
    if (fx.length) node.fx = fx
    if (op < 1) node.o = R(op)
    if (clip) node.clip = 1
    if (comp) node.comp = comp
    if (link) node.link = link
    if (pos === 'fixed') { node.fixed = (r.y - scrollY) > innerHeight / 2 ? 'bottom' : 'top'; node.fb = R(innerHeight - (r.y - scrollY + r.h)) }
    if (pos === 'sticky') node.sticky = 1
    const z = num(cs.zIndex); if (z && pos !== 'static') node.z = z
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') node.bm = cs.mixBlendMode.toUpperCase().replace('-', '_')
    if (kids.length) node.ch = kids
    return [node]
  }

  function formContent(el, cs, r) {
    const out = []
    const padL = num(cs.paddingLeft) + num(cs.borderLeftWidth), padR = num(cs.paddingRight)
    const f = fontOf(cs)
    if (el.type === 'range') {
      const v = (num(el.value) - num(el.min || 0)) / ((num(el.max || 100) - num(el.min || 0)) || 1)
      const t = 24, x = r.x + v * (r.w - t)
      const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
      out.push({ k: 'F', n: 'thumb', x: R(x), y: R(r.y + r.h / 2 - t / 2), w: t, h: t, r: [t / 2, t / 2, t / 2, t / 2], fills: [{ t: 'S', c: [1, 1, 1, 1] }], st: { c: parseColor(brandRGB(brand)) || [0.14, 0.22, 0.77, 1], w: [2, 2, 2, 2], a: 'OUTSIDE' }, fx: [{ t: 'D', c: [13 / 255, 21 / 255, 51 / 255, 0.2], x: 0, y: 4, b: 10, s: 0 }] })
      return out
    }
    if (el.type === 'checkbox' || el.type === 'radio') return out
    let text = el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text || '' : el.value
    let color = cs.color
    if (!text && el.placeholder) { text = el.placeholder; color = getComputedStyle(el, '::placeholder').color }
    if (text) {
      const lh = f.lh
      const y = el.tagName === 'TEXTAREA' ? r.y + num(cs.paddingTop) + num(cs.borderTopWidth) : r.y + (r.h - lh) / 2
      out.push({ k: 'T', n: 'value', x: R(r.x + padL), y: R(y), w: R(r.w - padL - padR - (el.tagName === 'SELECT' ? 18 : 0)), h: lh, s: text, f: { ...f, al: 'LEFT' }, c: parseColor(color), ml: 0, trunc: 1 })
    }
    if (el.tagName === 'SELECT') {
      const c = cs.color
      out.push({ k: 'V', n: 'chevron-down', x: R(r.x + r.w - padR - 14), y: R(r.y + r.h / 2 - 7), w: 14, h: 14, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>` })
    }
    return out
  }
  function brandRGB(hex) { const m = hex.match(/^#([0-9a-f]{6})$/i); if (!m) return null; const n = parseInt(m[1], 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})` }

  // design tokens (CSS custom properties that hold colours), resolved for the current theme
  function tokens() {
    const names = new Set()
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules } catch (e) { continue }
      for (const ru of rules) if (ru.selectorText && /^:root/.test(ru.selectorText)) for (const prop of ru.style) if (prop.startsWith('--')) names.add(prop) }
    const probe = document.createElement('i'); document.body.appendChild(probe); const out = {}
    for (const nme of names) { const v = getComputedStyle(document.documentElement).getPropertyValue(nme).trim(); if (!v || /^(\d|var\(|cubic|calc|\")/.test(v) || /px|ms|\bs\b/.test(v) && !/rgb|#/.test(v)) continue
      const pr = document.createElement('i'); pr.style.cssText = 'transition:none!important;animation:none!important;position:absolute'; pr.style.color = v; if (!pr.style.color) continue; document.body.appendChild(pr); const c = parseColor(getComputedStyle(pr).color); pr.remove(); if (c) out[nme.slice(2)] = c }
    probe.remove(); return out
  }
  const root = document.body
  const bodyCs = getComputedStyle(root)
  const tree = walk(root)
  // page background
  const bg = parseColor(bodyCs.backgroundColor) || parseColor(getComputedStyle(document.documentElement).backgroundColor) || [1, 1, 1, 1]
  return { tokens: tokens(), w: VW, h: clipToViewport ? innerHeight : VH, bg, top: clipToViewport ? scrollY : 0, nodes: tree, images: [...images] }
}
