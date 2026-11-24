// Runs INSIDE the page (injected by capture.mjs). Walks the rendered DOM and returns a compact,
// Figma-ready layer tree with absolute page coordinates. No framework knowledge needed: it reads
// computed styles, so whatever the browser paints is what Figma gets.
window.__waltonSerialize2 = function (opts) {
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
    const family = /jakarta/i.test(fam) ? 'Plus Jakarta Sans' : /caveat/i.test(fam) ? 'Caveat' : /hind/i.test(fam) ? 'Hind Siliguri' : /mono|courier/i.test(cs.fontFamily) ? 'Roboto Mono' : 'Plus Jakarta Sans'
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

  // =====================================================================
  // v2: layout-aware walk. Emits Figma auto-layout intent for every frame.
  // =====================================================================
  const INLINE = new Set(['inline', 'contents'])
  const isAbs = cs => cs.position === 'absolute' || cs.position === 'fixed'
  const visible = (el, cs) => !(cs.display === 'none' || (cs.visibility === 'hidden' && !el.children.length) || num(cs.opacity) < 0.02)
  // Probe whether the box hugs its content (measure with width:max-content / height:auto, then restore).
  function probe(el, r) {
    const save = el.getAttribute('style')
    el.style.setProperty('transition', 'none', 'important')
    el.style.setProperty('width', 'max-content', 'important'); el.style.setProperty('min-width', '0', 'important'); el.style.setProperty('flex', 'none', 'important')
    const w2 = el.getBoundingClientRect().width
    el.style.setProperty('width', r.w + 'px', 'important')
    el.style.setProperty('height', 'auto', 'important'); el.style.setProperty('min-height', '0', 'important')
    const h2 = el.getBoundingClientRect().height
    if (save === null) el.removeAttribute('style'); else el.setAttribute('style', save)
    return { hugW: Math.abs(w2 - r.w) < 1.5, hugH: Math.abs(h2 - r.h) < 1.5 }
  }
  // An element whose content is only text + inline elements becomes ONE text layer with styled ranges.
  function inlineOnly(el) {
    for (const c of el.childNodes) {
      if (c.nodeType === 3) continue
      if (c.nodeType !== 1) continue
      const cs = getComputedStyle(c)
      if (!visible(c, cs)) continue
      const cr = c.getBoundingClientRect()
      if (isAbs(cs) && cr.width <= 1.5 && cr.height <= 1.5) continue // .sr-only text for screen readers
      if (isAbs(cs) || c.tagName === 'svg' || c.tagName === 'IMG') return false
      const blockish = !INLINE.has(cs.display)
      // inline-block/inline-flex wrappers with no visuals (e.g. the word-by-word headline animation) are still just text
      if (blockish && !/^inline-(block|flex)$/.test(cs.display)) return false
      if (parseColor(cs.backgroundColor) || num(cs.paddingLeft) + num(cs.borderLeftWidth) > 0.5 || (blockish && cs.boxShadow !== 'none')) return false
      if (blockish && c.querySelector('svg, img')) return false
      if (!inlineOnly(c)) return false
    }
    return true
  }
  function richText(el, cs) {
    // segments in document order; whitespace collapsed like the browser; browser line breaks kept as soft breaks
    const segs = []; let prevTop = null, prevBot = null, text = ''
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      const pcs = getComputedStyle(n.parentElement)
      if (!visible(n.parentElement, pcs)) continue
      if (n.parentElement.closest('.sr-only')) continue
      const words = [...n.data.matchAll(/\S+/g)]
      if (!words.length) { if (/\s/.test(n.data) && text && !text.endsWith(' ')) { text += ' '; segs.push({ s: ' ', st: styleOf(pcs, n.parentElement) }) } continue }
      let chunk = /^\s/.test(n.data) && text && !text.endsWith(' ') && !text.endsWith('\u2028') ? ' ' : ''
      words.forEach((w, i) => {
        const rr = document.createRange(); rr.setStart(n, w.index); rr.setEnd(n, w.index + w[0].length)
        const rs = rr.getClientRects(); const top = rs.length ? Math.round(rs[0].top) : prevTop; const bot = rs.length ? rs[0].bottom : prevBot
        // a new line only when this word no longer overlaps the previous one vertically (smaller fonts sit lower on the same line)
        if (prevTop !== null && top > prevTop + 2 && top >= prevBot - 2) { chunk = chunk.replace(/ $/, ''); if (text.endsWith(' ') && !chunk) { text = text.slice(0, -1); const last = segs[segs.length - 1]; if (last) last.s = last.s.replace(/ $/, '') } chunk += '\u2028' }
        else if (i > 0) chunk += ' '
        chunk += w[0]; prevTop = top; prevBot = bot
      })
      if (/\s$/.test(n.data)) chunk += ' '
      let s = chunk
      if (pcs.textTransform === 'uppercase') s = s.toUpperCase(); else if (pcs.textTransform === 'lowercase') s = s.toLowerCase()
      text += s; segs.push({ s, st: styleOf(pcs, n.parentElement) })
    }
    // trim
    while (segs.length && !segs[0].s.trim()) segs.shift()
    if (segs.length) segs[0].s = segs[0].s.replace(/^\s+/, '')
    while (segs.length && !segs[segs.length - 1].s.trim()) segs.pop()
    if (segs.length) segs[segs.length - 1].s = segs[segs.length - 1].s.replace(/\s+$/, '')
    return segs
  }
  function styleOf(cs, el) {
    const f = fontOf(cs)
    const st = { fam: f.fam, st: f.st, sz: f.sz, lh: f.lh, ls: f.ls, u: f.u }
    const g = gradientTextFill(el)
    if (g && g.g.length && cs.color === 'rgba(0, 0, 0, 0)') st.gf = g
    else st.c = parseColor(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color) || [0, 0, 0, 0]
    return st
  }
  function textLeaf(el, cs, r, segs) {
    // merge equal-styled neighbours
    const m = []
    for (const sg of segs) { const last = m[m.length - 1]; if (last && JSON.stringify(last.st) === JSON.stringify(sg.st)) last.s += sg.s; else m.push({ s: sg.s, st: sg.st }) }
    const s = m.map(x => x.s).join('')
    if (!s.trim()) return null
    // the text's own painted box (inside the element's padding)
    const range = document.createRange(); range.selectNodeContents(el)
    const rects = [...range.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const q of rects) { x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom) }
    if (!rects.length) { x0 = r.x - scrollX; y0 = r.y - scrollY; x1 = x0 + r.w; y1 = y0 + r.h }
    let base = fontOf(cs)
    // line pitch from the real line boxes (split headlines, inline-blocks) — Figma text height = lines × line height
    if (rects.length > 1 && m.every(x => x.st.sz === m[0].st.sz)) {
      const sorted = rects.slice().sort((p, q) => p.top - q.top); const tops = []; let bottom = -Infinity
      for (const q of sorted) { if (q.top >= bottom - 2) { tops.push(q.top); bottom = q.bottom } else bottom = Math.max(bottom, q.bottom) }
      if (tops.length > 1) {
        const pitch = (tops[tops.length - 1] - tops[0]) / (tops.length - 1)
        if (pitch > base.sz * 0.7 && Math.abs(pitch - base.lh) > 0.75) { base = Object.assign({}, base, { lh: R(pitch) }); m.forEach(x => { x.st = Object.assign({}, x.st, { lh: R(pitch) }) }) }
      }
    }
    return { k: 'T', n: s.slice(0, 40), x: R(x0 + scrollX), y: R(y0 + scrollY), w: R(x1 - x0), h: R(y1 - y0), s, segs: m.length > 1 ? m : undefined, f: base, c: m[0].st.c, gf: m[0].st.gf, ml: s.includes('\u2028') ? 1 : 0, al: base.al }
  }

  // Rotation: CSS rotates without changing layout, but its bounding box grows. Read the element un-rotated
  // (keeping translate/scale), then rotate in Figma: absolute layers themselves, in-flow layers via their content.
  function walk2(el, parentCs) {
    let saved = null, ang = 0, absEl = false
    if (el.nodeType === 1 && el.style) {
      const c0 = getComputedStyle(el)
      const tm = c0.transform && c0.transform.match(/matrix\(([^)]+)\)/)
      const v = tm ? tm[1].split(',').map(Number) : null
      ang = (v ? Math.atan2(v[1], v[0]) * 180 / Math.PI : 0) + (c0.rotate && c0.rotate !== 'none' ? parseFloat(c0.rotate) : 0)
      if (Math.abs(ang) > 0.5) {
        absEl = isAbs(c0)
        saved = [el.style.transform, el.style.rotate, el.style.transition]
        el.style.transition = 'none'; el.style.rotate = 'none'
        el.style.transform = v ? `matrix(${Math.hypot(v[0], v[1])},0,0,${Math.hypot(v[2], v[3])},${v[4]},${v[5]})` : 'none'
      } else ang = 0
    }
    const res = walk2raw(el, parentCs)
    if (saved) {
      el.style.transform = saved[0]; el.style.rotate = saved[1]; el.style.transition = saved[2]
      for (const n of (Array.isArray(res) ? res : res ? [res] : [])) {
        if (absEl || !n.ch || !n.ch.length) n.rot = R((n.rot || 0) + ang)
        else n.ch.forEach(c => { c.rot = R((c.rot || 0) + ang) })
      }
    }
    return res
  }
  function walk2raw(el, parentCs) {
    if (/^(NOSCRIPT|SCRIPT|STYLE|TEMPLATE|LINK|META)$/.test(el.tagName)) return null
    const cs = getComputedStyle(el)
    if (cs.display === 'contents') { const out = []; for (const c of el.children) { const k = walk2(c, parentCs); if (k) out.push(...(Array.isArray(k) ? k : [k])) } return out.length ? out : null }
    if (!visible(el, cs)) return null
    const r = rectOf(el)
    if (r.w <= 1.5 && r.h <= 1.5 && (cs.overflow === 'hidden' || cs.clip !== 'auto')) return null // sr-only
    const tag = el.tagName, op = num(cs.opacity)
    if (tag === 'svg') {
      if (r.w < 1 || outside(r, el)) return null
      const clone = el.cloneNode(true); const color = cs.color
      clone.setAttribute('width', R(r.w)); clone.setAttribute('height', R(r.h))
      const fix = n => { for (const a of ['stroke', 'fill', 'stop-color']) { const v = n.getAttribute && n.getAttribute(a); if (v === 'currentColor') n.setAttribute(a, color) }; [...(n.children || [])].forEach(fix) }
      fix(clone)
      if (getComputedStyle(el).fill === 'rgb(0, 0, 0)' && !clone.getAttribute('fill')) clone.setAttribute('fill', 'none')
      if (/lucide/.test(el.getAttribute('class') || '') && cs.strokeWidth) clone.setAttribute('stroke-width', num(cs.strokeWidth))
      if (!clone.getAttribute('fill') && /logo/.test(el.parentElement?.className || '')) clone.setAttribute('fill', color)
      clone.querySelectorAll('style').forEach(s => s.remove())
      clone.querySelectorAll('path').forEach(p => { if (!p.getAttribute('fill') && /fill:currentColor/.test(el.innerHTML)) p.setAttribute('fill', color) })
      clone.removeAttribute('class'); clone.querySelectorAll('[class]').forEach(n => n.removeAttribute('class'))
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      return { _cs: cs, k: 'V', n: (el.getAttribute('class') || 'icon').split(' ').find(c => c.startsWith('lucide-'))?.slice(7) || 'vector', x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h), svg: clone.outerHTML, o: op < 1 ? R(op) : undefined, _cs: cs }
    }
    if (tag === 'IMG') {
      if (!el.naturalWidth || outside(r, el)) return null
      const src = el.getAttribute('src')
      // SVG logos (e.g. the official Walton emblem) go to Figma as real vectors, not photos
      if (/^data:image\/svg\+xml/.test(src)) {
        let svg = /^data:image\/svg\+xml;base64,/.test(src) ? atob(src.slice(src.indexOf(',') + 1)) : decodeURIComponent(src.slice(src.indexOf(',') + 1))
        svg = svg.replace(/<\?xml[^>]*>/, '').replace(/<svg\b/, `<svg width="${R(r.w)}" height="${R(r.h)}"`)
        return { k: 'V', n: el.closest('.brand-emblem') ? 'Walton emblem' : (el.alt || 'logo'), x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h), svg, o: op < 1 ? R(op) : undefined, _cs: cs }
      }
      images.add(src)
      const centred = /^(50% 50%|center)$/.test(cs.objectPosition.trim())
      const node = { k: 'I', n: el.alt || 'image', x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h), src, fit: cs.objectFit === 'cover' ? 'FILL' : 'FIT', _cs: cs }
      if (!centred && cs.objectFit === 'contain') node.fit = 'FIT_BOTTOM'
      if (cs.mixBlendMode !== 'normal') node.bm = cs.mixBlendMode.toUpperCase().replace('-', '_')
      if (op < 1) node.o = R(op)
      const rad = num(cs.borderTopLeftRadius); if (rad) node.r = [rad, num(cs.borderTopRightRadius), num(cs.borderBottomRightRadius), num(cs.borderBottomLeftRadius)]
      return node
    }
    const isForm = /^(INPUT|SELECT|TEXTAREA)$/.test(tag)
    // ---- visuals (same rules as v1) ----
    const fills = []; const bgc = parseColor(cs.backgroundColor); if (bgc) fills.push({ t: 'S', c: bgc })
    const clipText = cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text'
    if (!clipText && cs.backgroundImage !== 'none') fills.push(...gradients(cs.backgroundImage, r.w, r.h))
    const bw = [num(cs.borderTopWidth), num(cs.borderRightWidth), num(cs.borderBottomWidth), num(cs.borderLeftWidth)]
    const bcols = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(parseColor)
    const bsty = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle]
    const bi = bw.map((w, i) => w > 0 && bsty[i] !== 'none' && bcols[i] ? w : 0)
    const stroke = bi.some(Boolean) ? { c: bcols[bi.findIndex(Boolean)], w: bi, d: bsty[bi.findIndex(Boolean)] === 'dashed' ? 1 : 0 } : null
    const pct = (v, L) => v.endsWith('%') ? num(v) / 100 * L : num(v)
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(v => Math.min(pct(v.split(' ')[0], Math.min(r.w, r.h)), Math.min(r.w, r.h) / 2))
    const fx = shadows(cs.boxShadow)
    const bf = cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : cs.webkitBackdropFilter
    if (bf && bf !== 'none') { const m = bf.match(/blur\(([\d.]+)px\)/); if (m) fx.push({ t: 'B', b: num(m[1]) }) }
    const ds = cs.filter && cs.filter.match(/drop-shadow\((rgba?\([^)]*\))\s+([-\d.]+)px\s+([-\d.]+)px\s+([\d.]+)px\)/)
    let poly = null
    if (cs.clipPath && cs.clipPath.startsWith('polygon(')) { // e.g. the price tag notch
      poly = cs.clipPath.slice(8, -1).split(',').map(p => p.trim().split(/\s+/).map((v, i) => R(pct(v, i ? r.h : r.w))))
    }
    if (ds) fx.push({ t: 'D', c: parseColor(ds[1]), x: num(ds[2]), y: num(ds[3]), b: num(ds[4]), s: 0, shape: 1 })
    const scrollY = /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && tag !== 'BODY' && tag !== 'HTML'
    const scrollX = /auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && tag !== 'BODY' && tag !== 'HTML'
    const clip = (/hidden|clip/.test(cs.overflowX + cs.overflowY) || scrollX || scrollY) && tag !== 'BODY'
    const comp = el.dataset.figComp, link = el.dataset.figLink

    // ---- layout of this element ----
    const disp = cs.display
    const flex = /flex/.test(disp), grid = /grid/.test(disp)
    const pad = [num(cs.paddingTop) + bw[0], num(cs.paddingRight) + bw[1], num(cs.paddingBottom) + bw[2], num(cs.paddingLeft) + bw[3]]
    const node = { k: 'F', n: comp || nameOf(el), x: R(r.x), y: R(r.y), w: R(Math.max(r.w, 0.01)), h: R(Math.max(r.h, 0.01)), _cs: cs, _el: el }
    if (fills.length) node.fills = fills
    if (scrollX || scrollY) node.scroll = scrollX && scrollY ? 'BOTH' : scrollY ? 'VERTICAL' : 'HORIZONTAL'
    // CSS ring mask `radial-gradient(circle, transparent 58%, #000 59%)` → a real ring (gradient stroke, no fill)
    { const mk = cs.maskImage || cs.webkitMaskImage || ''; const m = /radial-gradient\(\s*circle[^%]*?(?:transparent|rgba\(0,\s*0,\s*0,\s*0\))\s+([\d.]+)%/.exec(mk)
      if (m && fills.length) node.ring = +m[1] / 100 }
    if (stroke) node.st = stroke
    if (rad.some(Boolean)) node.r = rad.map(R)
    if (fx.length) node.fx = fx
    if (poly) node.poly = poly
    if (op < 1) node.o = R(op)
    if (clip) node.clip = 1
    if (comp) node.comp = comp
    if (link) node.link = link
    if (cs.mixBlendMode !== 'normal') node.bm = cs.mixBlendMode.toUpperCase().replace('-', '_')
    if (cs.position === 'fixed') { node.fixed = (r.y - scrollY) > innerHeight / 2 ? 'bottom' : 'top' }
    if (cs.position === 'sticky') node.sticky = 1
    const z = num(cs.zIndex); if (z && cs.position !== 'static') node.z = z
    const rot = cs.rotate && cs.rotate !== 'none' ? num(cs.rotate) : 0
    const tm = cs.transform && cs.transform.match(/matrix\(([^)]+)\)/)
    const ang = tm ? Math.round(Math.atan2(+tm[1].split(',')[1], +tm[1].split(',')[0]) * 180 / Math.PI * 10) / 10 : 0
    if (rot || ang) node.rot = R(rot + ang)

    // form controls: v1 content, no layout
    if (isForm) { node.ch = formContent(el, cs, r); node.L = { m: 'N' }; return node }

    // ---- children ----
    let kids = []
    if (inlineOnly(el) && el.textContent.trim()) {
      const t = textLeaf(el, cs, r, richText(el, cs))
      if (t) {
        // a plain text container with no visuals collapses to the text itself
        if (cs.textOverflow === 'ellipsis' && /nowrap|pre/.test(cs.whiteSpace)) t.trunc = 1
        if (!fills.length && !stroke && !fx.length && !comp && !link && (!clip || t.trunc) && op >= 1 && !poly && !SEMANTIC.has(tag) && !pad.some(p => p > 0.5)) { t._cs = cs; t._el = el; t.box = { x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h) }; return t }
        kids.push(t)
      }
    } else {
      // text directly inside a block mixed with elements: each text node becomes its own text layer
      const cn = [...el.childNodes]
      for (let ci = 0; ci < cn.length; ci++) {
        const c = cn[ci]
        if (c.nodeType === 3 && c.data.trim()) {
          // neighbouring text nodes (JSX `Explore {name}`) form one run, keeping the space between them
          let last = c, data = c.data
          while (ci + 1 < cn.length && cn[ci + 1].nodeType === 3) { ci++; last = cn[ci]; data += last.data }
          const range = document.createRange(); range.setStart(c, 0); range.setEnd(last, last.data.length); const q = range.getBoundingClientRect()
          if (q.width < 0.5) continue
          const f = fontOf(cs); let s = data.replace(/\s+/g, ' ').trim(); if (cs.textTransform === 'uppercase') s = s.toUpperCase()
          kids.push({ k: 'T', n: s.slice(0, 40), x: R(q.left + scrollX), y: R(q.top + scrollY), w: R(q.width), h: R(q.height), s, f, c: parseColor(cs.color), al: f.al }) // bare text: no box rules of its own (min-height, max-width, position belong to the parent)
        } else if (c.nodeType === 1) {
          const k = walk2(c, cs); if (k) kids.push(...(Array.isArray(k) ? k : [k]))
        }
      }
    }
    // pure wrappers with no visuals and a single child pass the child through (keeps the tree shallow)
    const keepFrame = fills.length || stroke || fx.length || clip || comp || link || op < 1 || poly || SEMANTIC.has(tag) || isAbs(cs) || cs.position === 'sticky' || el === document.body || kids.length > 1 || flex || grid
      || pad.some(p => p > 0.5) // padding belongs to this box — folding it into the child would lose the inset
    if (!keepFrame) {
      if (!kids.length) return null
      if (kids.length === 1) { const k = kids[0]; if (!k.box && k.k === 'T') k.box = { x: R(r.x), y: R(r.y), w: R(r.w), h: R(r.h) }; k._wrapCs = k._wrapCs || cs; return k } // frames keep their own box
    }
    if (!kids.length && r.w < 0.5 && r.h < 0.5) return null
    if (outside(r, el) && !comp) return null

    // ---- auto layout intent ----
    const inflow = kids.filter(k => !(k._cs && isAbs(k._cs)) && !(k._wrapCs && isAbs(k._wrapCs)))
    const L = { m: 'N', pad: pad.map(R) }
    const ctop = r.y + pad[0], cleft = r.x + pad[3], cw = r.w - pad[1] - pad[3], ch = r.h - pad[0] - pad[2]
    const kb = k => k.box || k
    if (grid && inflow.length) {
      const cols = cs.gridTemplateColumns.split(' ').map(num).filter(v => v > 0), rows = cs.gridTemplateRows.split(' ').map(num).filter(v => v > 0)
      if (cols.length > 1) {
        L.m = 'G'; L.grid = { cols: cols.map(R), rows: rows.map(R), cg: R(num(cs.columnGap)), rg: R(num(cs.rowGap)), fr: /fr/.test(el.style.gridTemplateColumns) || true }
        // place each child by matching its box to track starts
        const cStart = []; let acc = cleft; cols.forEach(w => { cStart.push(acc); acc += w + num(cs.columnGap) })
        const rStart = []; acc = ctop; rows.forEach(h => { rStart.push(acc); acc += h + num(cs.rowGap) })
        // a row can never be shorter than an item that sits only in it (tracks measured mid-animation, etc.)
        {
          const near = (starts, v) => { let best = 0, d = Infinity; starts.forEach((q, i) => { if (Math.abs(q - v) < d) { d = Math.abs(q - v); best = i } }); return best }
          let grew = false
          for (const k of inflow) { const q = kb(k); const ri = near(rStart, q.y); if (q.y + q.h <= rStart[ri] + rows[ri] + 1.5) continue; const endRow = near(rStart.map((v, i) => v + rows[i]), q.y + q.h); if (endRow === ri || q.h > rows[ri] + 1.5 && endRow < ri + 1) { rows[ri] = Math.max(rows[ri], q.h); grew = true } }
          if (grew) { L.grid.rows = rows.map(R); rStart.length = 0; acc = ctop; rows.forEach(h => { rStart.push(acc); acc += h + num(cs.rowGap) }) }
        }
        const idx = (starts, v) => { let best = 0, d = Infinity; starts.forEach((s, i) => { if (Math.abs(s - v) < d) { d = Math.abs(s - v); best = i } }); return best }
        for (const k of inflow) {
          const b = kb(k); const c0 = idx(cStart, b.x), r0 = idx(rStart, b.y)
          const c1 = idx(cStart.map((s, i) => s + cols[i]), b.x + b.w), r1 = idx(rStart.map((s, i) => s + rows[i]), b.y + b.h)
          k.cell = { r: r0, c: c0, rs: Math.max(1, r1 - r0 + 1), cs: Math.max(1, c1 - c0 + 1) }
          const spanW = cStart[c1] + cols[c1] - cStart[c0], spanH = rStart[r1] + rows[r1] - rStart[r0]
          k.sz = { x: Math.abs(b.w - spanW) < 1.5 ? 'FILL' : 'FIXED', y: Math.abs(b.h - spanH) < 1.5 ? 'FILL' : 'FIXED' }
          // position inside the cell (margins / justify-self) → Figma's in-cell alignment
          const al = (lead, trail) => Math.abs(lead - trail) < 1.5 ? 'CENTER' : lead < trail ? 'MIN' : 'MAX'
          if (k.sz.x === 'FIXED') k.cell.ha = al(b.x - cStart[c0], cStart[c0] + spanW - (b.x + b.w))
          if (k.sz.y === 'FIXED') k.cell.va = al(b.y - rStart[r0], rStart[r0] + spanH - (b.y + b.h))
        }
      }
    }
    if (L.m === 'N' && inflow.length) {
      const row = (flex && !/column/.test(cs.flexDirection)) || disp === 'table-row'
      L.m = row ? 'H' : 'V'
      if (flex && cs.flexWrap === 'wrap') { L.wrap = 1; L.gap = R(num(row ? cs.columnGap : cs.rowGap)); L.cgap = R(num(row ? cs.rowGap : cs.columnGap)) }
      else {
        // real gaps from geometry (includes margins); uneven gaps become spacers
        const sorted = inflow.slice()
        const gaps = []
        for (let i = 1; i < sorted.length; i++) { const a = kb(sorted[i - 1]), b = kb(sorted[i]); gaps.push(row ? b.x - (a.x + a.w) : b.y - (a.y + a.h)) }
        // negative gaps (overlap from negative margins): shorten the earlier, non-clipping box by the overlap —
        // its content still paints past its edge, exactly like the site
        gaps.forEach((g, i) => {
          if (g > -0.5) return
          const prev = sorted[i]
          if (prev.k !== 'F' || prev.clip) return
          if (row) { prev.w = R(prev.w + g); if (prev.box) prev.box.w = R(prev.box.w + g); prev._fixX = 1 }
          else { prev.h = R(prev.h + g); if (prev.box) prev.box.h = R(prev.box.h + g); prev._fixY = 1 }
          gaps[i] = 0
        })
        const even = gaps.every(g => Math.abs(g - gaps[0]) < 1.5)
        L.gap = gaps.length ? R(Math.max(0, even ? gaps[0] : Math.min(...gaps.map(g => Math.max(0, g))))) : 0
        if (!even && !(flex && /space-/.test(cs.justifyContent))) {
          // a spacer sits between two auto-layout gaps, so it adds (extra - gap); extras smaller than the gap
          // can't be expressed that way → use gap 0 and give every gap its own exact spacer
          if (gaps.some(g => g - L.gap > 1.5 && g - L.gap < L.gap + 1.5)) L.gap = 0
          const out = []; sorted.forEach((k, i) => { if (i > 0) { const size = L.gap === 0 ? gaps[i - 1] : gaps[i - 1] - 2 * L.gap; if (size > 0.5) out.push({ k: 'S', n: 'spacer', [row ? 'w' : 'h']: R(size), x: 0, y: 0, sz: { x: row ? 'FIXED' : 'FILL', y: row ? 'FILL' : 'FIXED' } }) } out.push(k) })
          L.spaced = out
        } else if (!even && flex && /space-between/.test(cs.justifyContent) && sorted.length > 2) {
          // space-between with uneven gaps = an auto margin pushes some items (e.g. legal links to the right):
          // keep the CSS gap and put a flexible push spacer where the free space actually is
          const cg = num(row ? cs.columnGap : cs.rowGap) || 0
          const out = []; sorted.forEach((k, i) => { if (i > 0 && gaps[i - 1] > cg + 1.5) out.push({ k: 'S', n: 'push', [row ? 'w' : 'h']: 1, x: 0, y: 0, sz: { x: row ? 'FILL' : 'FIXED', y: row ? 'FIXED' : 'FILL' } }); out.push(k) })
          L.spaced = out; L.gap = R(cg); L.pushed = 1
        }
        // leading space (first child's margin) folds into padding
        if (sorted.length) { const f = kb(sorted[0]); const lead = row ? f.x - cleft : f.y - ctop; if (lead > 0.5 && !(flex && cs.justifyContent !== 'normal' && cs.justifyContent !== 'flex-start')) L.pad[row ? 3 : 0] = R(L.pad[row ? 3 : 0] + lead) }
      }
      const jc = cs.justifyContent
      // space-between only matters when there is free space; otherwise keep the real gap (Figma ignores the gap in space-between)
      let free = Infinity
      if (/space-/.test(jc) && inflow.length) { const bs = inflow.map(kb); free = (row ? cw : ch) - bs.reduce((t, q) => t + (row ? q.w : q.h), 0) - num(row ? cs.columnGap : cs.rowGap) * (bs.length - 1) }
      const spread = free > 1.5 && !L.pushed
      if (/space-/.test(jc) && !spread && !L.pushed) L.gap = R(num(row ? cs.columnGap : cs.rowGap) || L.gap || 0)
      delete L.pushed
      L.jc = /space-between/.test(jc) && spread ? 'SPACE_BETWEEN' : /center/.test(jc) ? 'CENTER' : /end/.test(jc) ? 'MAX' : 'MIN'
      if (row) { const ai = cs.alignItems; L.ai = /center/.test(ai) ? 'CENTER' : /end/.test(ai) ? 'MAX' : /baseline/.test(ai) ? 'BASELINE' : 'MIN'; L.stretch = /normal|stretch/.test(ai) }
      else {
        // column / block: align by majority of non-filling children
        const pos = inflow.map(k => { const b = kb(k); const l = b.x - cleft, rr = cleft + cw - (b.x + b.w); return Math.abs(l) < 1.5 && Math.abs(rr) < 1.5 ? 'F' : Math.abs(l) < 1.5 ? 'L' : Math.abs(rr) < 1.5 ? 'R' : Math.abs(l - rr) < 2 ? 'C' : l < rr ? 'L' : 'R' })
        const cnt = t => pos.filter(p => p === t).length
        L.ai = cnt('C') > cnt('L') && cnt('C') >= cnt('R') ? 'CENTER' : cnt('R') > cnt('L') ? 'MAX' : 'MIN'
        if (flex && /center/.test(cs.alignItems)) L.ai = 'CENTER'
      }
    }
    node.L = L
    // ---- child sizing in this layout ----
    for (const k of inflow) {
      if (k.sz) continue
      const b = kb(k), kcs = k._wrapCs || k._cs, kel = k._el
      const row = L.m === 'H'
      let sx = 'FIXED', sy = 'FIXED', hug = { hugW: false, hugH: false }
      if (k.k === 'T') { const lines = k.f && k.f.lh ? Math.round(k.h / k.f.lh) : 1; hug = { hugW: !k.ml && lines <= 1 && b.w <= k.w + 2, hugH: true } } // wrapped text keeps its width
      else if (kel && k.k === 'F') hug = probe(kel, b)
      if (row) {
        sx = kcs && num(kcs.flexGrow) > 0 ? 'FILL' : hug.hugW ? 'HUG' : 'FIXED'
        sy = L.stretch && Math.abs(b.h - ch) < 1.5 && !hug.hugH ? 'FILL' : hug.hugH ? 'HUG' : 'FIXED'
      } else {
        const fillW = Math.abs(b.w - cw) < 1.5 || [k._wrapCs, k._cs].some(c => c && /px$/.test(c.maxWidth) && Math.abs(b.w - num(c.maxWidth)) < 1.5)
        sx = fillW ? 'FILL' : hug.hugW ? 'HUG' : 'FIXED'
        sy = kcs && flex && num(kcs.flexGrow) > 0 ? 'FILL' : hug.hugH ? 'HUG' : 'FIXED'
      }
      if (kel && kcs && /hidden|clip|auto|scroll/.test(kcs.overflowY) && kel.scrollHeight > kel.clientHeight + 1) sy = 'FIXED'
      if (kel && kcs && /hidden|clip|auto|scroll/.test(kcs.overflowX) && kel.scrollWidth > kel.clientWidth + 1 && sx === 'HUG') sx = 'FIXED'
      if (disp === 'table-row') sx = k === inflow[inflow.length - 1] ? 'FILL' : 'FIXED'
      if (k._fixY) sy = 'FIXED'; if (k._fixX) sx = 'FIXED'
      // hugging must reproduce the measured size from the layers we actually export (hidden states are dropped)
      if (k.k === 'F' && k.L && (k.L.m === 'H' || k.L.m === 'V') && (sx === 'HUG' || sy === 'HUG')) {
        const ks = (k.ch || []).filter(c => !c.abs), p = k.L.pad || [0, 0, 0, 0]
        if (ks.length) {
          const along = k.L.m === 'H', g = (k.L.gap || 0) * (ks.length - 1)
          const W = along ? ks.reduce((t, c) => t + (c.box || c).w, 0) + g : Math.max(...ks.map(c => (c.box || c).w))
          const H = along ? Math.max(...ks.map(c => (c.box || c).h)) : ks.reduce((t, c) => t + (c.box || c).h, 0) + g
          if (sx === 'HUG' && Math.abs(W + p[1] + p[3] - b.w) > 1.5 && !k.L.wrap) sx = 'FIXED'
          if (sy === 'HUG' && Math.abs(H + p[0] + p[2] - b.h) > 1.5 && !k.L.wrap) sy = 'FIXED'
        }
      }
      k.sz = { x: sx, y: sy }
      const mwCs = [k._wrapCs, k._cs].find(c => c && /px$/.test(c.maxWidth)) // max-width may sit on the inner element of a folded wrapper
      if (mwCs && num(mwCs.maxWidth) > 0 && num(mwCs.maxWidth) < 4000) { const kcs = mwCs; k.sz.maxW = R(num(kcs.maxWidth)); if (Math.abs(b.w - num(kcs.maxWidth)) < 1.5 || sx === 'FILL') k.sz.x = 'FILL' }
      if (kcs && /px$/.test(kcs.minHeight) && num(kcs.minHeight) > 0) k.sz.minH = R(num(kcs.minHeight))
      if (kcs && kcs.marginLeft === 'auto' && row && kcs.marginRight !== 'auto') k.pushRight = 1
    }
    // absolute children: keep position, derive constraints from CSS insets
    for (const k of kids) {
      const kcs = k._wrapCs || k._cs
      if (!(kcs && isAbs(kcs))) continue
      k.abs = 1
      const has = p => kcs[p] !== 'auto'
      k.cons = { h: has('left') && has('right') ? 'STRETCH' : has('right') && !has('left') ? 'MAX' : 'MIN', v: has('top') && has('bottom') ? 'STRETCH' : has('bottom') && !has('top') ? 'MAX' : 'MIN' }
    }
    // paint order = CSS stacking: z<0 → plain content → positioned (z auto/0, DOM order) → z>0.
    // Figma paints by layer order, and in-flow layers must keep their layout order, so absolute
    // layers are slotted in just above the last in-flow layer that paints below them.
    const stackKey = k => {
      const c = (k._wrapCs && k._wrapCs.position !== 'static') ? k._wrapCs : (k._cs || k._wrapCs)
      if (!c) return [0, 0]
      const z = parseInt(c.zIndex, 10), pos = c.position !== 'static'
      if (pos && z < 0) return [-1, z]
      if (!pos) return [0, 0]
      return z > 0 ? [2, z] : [1, 0]
    }
    const le = (p, q) => p[0] < q[0] || (p[0] === q[0] && p[1] <= q[1])
    const flowSeq = (L.spaced || inflow).slice()
    const absKids = kids.filter(k => k.abs).map((k, i) => ({ k, key: stackKey(k), i }))
    absKids.sort((p, q) => (p.key[0] - q.key[0]) || (p.key[1] - q.key[1]) || (p.i - q.i))
    const out = flowSeq.map(k => ({ k, key: k.k === 'S' ? [0, 0] : stackKey(k) }))
    for (const a of absKids) {
      let at = 0
      for (let j = 0; j < out.length; j++) if (out[j].k.abs ? le(out[j].key, a.key) : le(out[j].key, a.key)) at = j + 1
      out.splice(at, 0, a)
    }
    node.ch = out.map(o => o.k)
    delete L.spaced
    return node
  }
  function strip(n) { if (!n) return n; delete n._cs; delete n._el; delete n._wrapCs; delete n._fixX; delete n._fixY; (n.ch || []).forEach(strip); return n }
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
  const bodyCs = getComputedStyle(document.body)
  const rootNode = walk2(document.body)
  const bg = parseColor(bodyCs.backgroundColor) || parseColor(getComputedStyle(document.documentElement).backgroundColor) || [1, 1, 1, 1]
  return { v: 2, tokens: tokens(), w: VW, h: clipToViewport ? innerHeight : VH, bg, top: clipToViewport ? scrollY : 0, root: strip(rootNode), images: [...images] }
}
