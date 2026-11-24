// Automatic placement check: every text layer in the plugin's output vs the same text on the website.
// Usage: node layoutdiff.mjs <preview index> <screen id>   e.g. node layoutdiff.mjs 0 d-light-home
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer-core'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const [idx, id, tol = 4] = process.argv.slice(2)
const OUT = path.join(HERE, '..', 'data', 'preview')
const file = fs.readdirSync(OUT).filter(f => f.startsWith(idx + '_') && f.endsWith('.html')).sort((p, q) => fs.statSync(path.join(OUT, q)).mtimeMs - fs.statSync(path.join(OUT, p)).mtimeMs)[0] // newest render
const screen = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'screens', id + '.json'), 'utf8'))
const site = []; const walk = (n, inComp) => { if (n.k === 'T') site.push({ s: n.s.replace(/\u2028/g, ' ').slice(0, 60), x: n.box && !n.abs ? n.box.x : n.x, y: n.box && !n.abs ? n.box.y : n.y, w: n.box && !n.abs ? n.box.w : n.w, h: n.box && !n.abs ? n.box.h : n.h }); (n.ch || []).forEach(c => walk(c)) }; walk(screen.root)
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files'] })
const pg = await b.newPage(); await pg.setViewport({ width: screen.w, height: 900 })
await pg.goto('file:///' + path.join(OUT, file).replace(/\\/g, '/'), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 300))
const fig = await pg.evaluate(() => [...document.querySelectorAll('[data-t]')].map(e => { const r = e.getBoundingClientRect(); return { s: e.dataset.t, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } }))
await b.close()
// match texts in order of appearance (same string can repeat)
const used = new Set(); let ok = 0; const bad = []
for (const t of site) {
  let best = null, bd = Infinity
  fig.forEach((f, i) => { if (used.has(i) || f.s !== t.s) return; const d = Math.hypot(f.x - t.x, f.y - t.y); if (d < bd) { bd = d; best = i } })
  if (best === null) { bad.push(['MISSING', t.s, Math.round(t.x), Math.round(t.y)]); continue }
  used.add(best); const f = fig[best]
  // text alignment inside a wider box can shift x without being wrong — compare the nearer edge
  const dx = Math.min(Math.abs(f.x - t.x), Math.abs((f.x + f.w) - (t.x + t.w)), Math.abs((f.x + f.w / 2) - (t.x + t.w / 2))), dy = Math.abs((f.y + f.h / 2) - (t.y + t.h / 2)) // line boxes vs glyph boxes share their centre
  if (dx > tol || dy > tol) bad.push([`dx ${Math.round(f.x - t.x)} dy ${Math.round((f.y + f.h / 2) - (t.y + t.h / 2))}`, t.s.slice(0, 40), Math.round(t.x), Math.round(t.y)]); else ok++
}
console.log(`${id}: ${ok}/${site.length} texts within ${tol}px`)
bad.slice(0, +(process.env.SHOW || 25)).forEach(b => console.log('  ', b.join(' | ')))
