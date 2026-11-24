# Walton Plaza — website redesign

A redesigned shopping site for Walton Plaza (Bangladeshi electronics & home appliances), built with **React 19 + Vite 7**, **Framer Motion**, **GSAP ScrollTrigger** and **Lenis** smooth scrolling.

Design: an editorial, human-centred look. Warm paper background, Walton blue for actions, a handwritten accent (Caveat) on one word per heading, and real lifestyle photography: each room photo has the actual Walton product photo placed into it, so names, prices and specs always come from the catalogue.

Features: home with a photographic hero (benefit callouts pinned to the product) and a scroll-pinned "day at home" story, full catalogue with filters and search, product pages, compare (up to 3), wishlist with shareable lists, bag and checkout preview, product finder, payment planner, store finder, light and dark themes, mobile layout with bottom navigation.

## Run it

```bash
cd walton-redesign
npm install
npm run dev          # local development server
npm run build        # dist/ — one self-contained index.html you can open from disk
npm run build:web    # dist-web/ — code-split build for hosting (e.g. GitHub Pages, Netlify)
```

Requires Node.js 18 or newer.

## Lifestyle photography

`walton-redesign/art/lifestyle/` holds the source rooms (generated, no products in them), clean product cutouts and the compositing script. `public/img/lifestyle/*.webp` is the result. To regenerate after changing a placement:

```bash
cd walton-redesign
bash art/lifestyle/render-all.sh     # needs Python with Pillow and numpy
```
