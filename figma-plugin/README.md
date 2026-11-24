# Walton Plaza — Figma Site Importer

A Figma plugin that rebuilds the whole Walton Plaza website, captured from the live build, as **editable, prototyped Figma screens**.

## Import it into Figma (once)

1. Open the **Figma desktop app** and open (or create) a design file.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick **`figma-plugin/manifest.json`** (this folder).
4. Run it from **Plugins → Development → Walton Plaza — Site Importer**.
5. Choose devices, themes and open states, then press **Import into this file**. A full import of 96 screens takes a few minutes.

> Keep `manifest.json`, `code.js` and `ui.html` together. `ui.html` (~7 MB) carries all screen data and product photos, so the plugin works offline.

## What you get

| Page | Contents |
|---|---|
| 📘 Cover | Title board |
| 🖥 Desktop · 1920 | **Light theme** row and **Dark theme** row: 20 pages plus 4 open states each. **Components** section on the left. |
| 📱 Mobile · 402 | Same structure at phone size (iPhone 16 Pro width), with the mobile menu and filter sheet states |
| 🎨 Design system | Colour tokens (bound variables) for Light and Dark, plus a type specimen of every text style |

**Screens:** Home, Shop, Category, Search results, Product detail, Compare, Product finder, Payment planner, Wishlist, Bag, Checkout steps 1–3, Help & support, Find a Plaza, Your space, About, Catalogue sources, Privacy, 404.
**Open states:** Search, Bag drawer, Quick view, Mega menu (desktop), Menu and Filters (mobile).

**Components:** Header, Footer, Mobile nav, Theme switch, Hero product card, Day story card, Product card (variant set: Width, Badge, Saved, Compare, Buy), Compare tray, and **Add button** as a component set (`State=Idle` / `State=Added`) with its click interaction.

**Variables:** colour tokens exactly as the site's CSS defines them.
- Paid Figma plans get one collection, `Walton tokens`, with **Light** and **Dark** modes.
- Starter plans allow only one mode per collection, so the plugin automatically creates `Walton · Light` and `Walton · Dark`.

**Text styles:** the most-used type settings on the site, named by role (Display, Heading, Body, Caption). Fonts: **Plus Jakarta Sans** (UI and headlines), **Caveat** (handwritten accents and the hero headline) and **Hind Siliguri** (৳ and Bangla). All are free Google fonts that Figma has built in.

## Prototype (press ▶ Present)

Flows start at **Desktop · Light**, **Desktop · Dark**, **Mobile · Light** and **Mobile · Dark**.
- Every nav link, product card, footer link and breadcrumb goes to its page.
- Search, bag, menu, "All categories", quick view and the mobile filters open their states. Close buttons go **back**.
- The **theme toggle** in the header jumps to the same screen in the other theme.
- Checkout: "Review preview order" → step 2 → step 3.
- **Add button** is an interactive component: click → green "Added" → back to "Add" after 1.8 s, as on the site.
- The **header stays pinned** while scrolling. The mobile bottom nav and compare tray stay fixed at the bottom.
- Set the prototype device to *Desktop* for the desktop page and *iPhone 14/15* for the mobile page.

## Auto layout & responsive screens (v2)

Everything is built with **auto layout**, translated from how the website actually lays itself out:

| Website (CSS) | Figma |
|---|---|
| `display:flex` row / column | Auto layout Horizontal / Vertical with the same gap, padding and alignment |
| `display:grid` (product grids, aisle tiles) | **Grid** auto layout: columns flex like `fr`, rows and spans kept |
| Normal block flow | Vertical auto layout; uneven margins become exact spacer layers |
| `margin-left:auto` | a Fill spacer that pushes the item to the end |
| `position:absolute` (badges, hearts, tags) | Absolute layers with constraints |
| `max-width` containers | Fill width with **Max width** (1360 on desktop), so wider frames stay centred |
| Content-sized buttons, chips, tags | **Hug** (measured in the browser, not guessed) |
| Inline text runs | One text layer with styled ranges, browser line breaks kept |

Each screen frame is a vertical auto layout with a fixed width and hug height, so you can **resize a screen** and its content reflows.

**Pinned navbar:** Figma can only fix layers that are absolutely positioned. The header is absolute, pinned to the top and stretched to full width, with a spacer of the same height holding their place in the flow. The mobile bottom nav and compare tray are pinned to the bottom.

## How it stays "same to same"

`tools/capture.mjs` drives headless Chrome through every page and state, and `tools/serialize.js` reads what the browser actually painted:
- exact boxes, colours, gradients, borders, per-corner radii, shadows and backdrop blur
- text, including the browser's own line breaks
- icons as real SVG vectors
- product photos, converted to PNG/JPG because Figma can't import WebP

CSS techniques without a direct Figma equivalent are translated:
- inset-shadow borders become inside strokes
- gradient text becomes gradient text fills
- repeating grid backgrounds become 1 px line layers
- transparent gradient stops keep their hue

## Regenerating after the site changes

```bash
# 1. build the site and serve it
cd walton-redesign && npm run build && cd dist && python -m http.server 5181
# 2. in another terminal
cd figma-plugin/tools
npm install            # first time only (puppeteer-core)
node capture.mjs       # ~15 min for all 96 screens; ONLY='^d-light-' node capture.mjs for a subset
python images.py       # WebP -> PNG/JPG (needs Pillow)
node build.mjs         # writes ../ui.html
```

Then re-run the plugin in a fresh Figma file.

## Files

```
manifest.json      Figma plugin manifest (import this)
code.js            builds layers, components, variables, styles, prototype
ui.html            plugin window + embedded data (generated by tools/build.mjs)
tools/             capture + build pipeline (serialize.js, capture.mjs, images.py, build.mjs, ui.template.html)
data/              captured screens (JSON) and converted images
```
