"""Convert the site's WebP product photos to PNG/JPG (Figma's image API does not accept WebP).
Usage: python images.py <site_dist_dir>   (reads ../data/images.json, writes ../data/img/)"""
import json, os, sys
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
dist = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', '..', 'walton-redesign', 'dist')
out = os.path.join(here, '..', 'data', 'img')
os.makedirs(out, exist_ok=True)
srcs = json.load(open(os.path.join(here, '..', 'data', 'images.json'), encoding='utf8'))
manifest = {}
for src in srcs:
    if src.startswith('data:'): continue  # inline SVG logos are sent to Figma as vectors
    path = os.path.normpath(os.path.join(dist, src.lstrip('./')))
    if not os.path.exists(path):
        print('missing', src); continue
    im = Image.open(path)
    # lifestyle photos fill the 1920 hero and full-width story panels; product photos are 2x their largest on-screen size
    limit = 1920 if '/lifestyle/' in src else 1100 if '-hd' in src else 700
    if max(im.size) > limit:
        s = limit / max(im.size); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    base = os.path.splitext(os.path.basename(src))[0]
    has_alpha = im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250
    if has_alpha:
        name = base + '.png'; im.save(os.path.join(out, name), optimize=True)
    else:
        name = base + '.jpg'; im.convert('RGB').save(os.path.join(out, name), quality=86, optimize=True, progressive=True)
    manifest[src] = name
json.dump(manifest, open(os.path.join(out, '_map.json'), 'w'), indent=1)
print('converted', len(manifest), 'images')
