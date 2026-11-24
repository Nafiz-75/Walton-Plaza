# Composite a real product cutout into a lifestyle room photo with matched light + shadows.
import sys, json, numpy as np
from PIL import Image, ImageFilter, ImageEnhance
cfg = json.loads(sys.argv[1])
room = Image.open(cfg['room']).convert('RGB')
W = cfg.get('width', 1920); s = W / room.width
room = room.resize((W, round(room.height * s)), Image.LANCZOS)
prod = Image.open(cfg['product']).convert('RGBA')
if 'crop' in cfg: prod = prod.crop(cfg['crop'])
bb = prod.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox(); prod = prod.crop(bb)
h = round(cfg['height'] * s); w = round(prod.width * h / prod.height)
prod = prod.resize((w, h), Image.LANCZOS)
cx, by = round(cfg['cx'] * s), round(cfg['bottom'] * s)
x0, y0 = cx - w // 2, by - h
a = np.asarray(prod.getchannel('A')).astype(np.float32) / 255
a = np.where(a < 0.25, 0, np.clip((a - 0.25) / 0.6, 0, 1)) if cfg.get('clean', True) else a
out = np.asarray(room).astype(np.float32)
H, Wd = out.shape[:2]
def shade(mask, x, y, strength):
    m = np.zeros((H, Wd), np.float32); mh, mw = mask.shape
    ys, xs = max(0, y), max(0, x); ye, xe = min(H, y + mh), min(Wd, x + mw)
    m[ys:ye, xs:xe] = mask[ys - y:ye - y, xs - x:xe - x]
    return out * (1 - strength * m[..., None])
# 1) soft cast shadow on the back wall (light comes from the left -> shadow falls right)
PB = round(cfg.get('wallblur', 18) * s * 3)
pad = np.zeros((h + 2 * PB, w + 2 * PB), np.float32); pad[PB:PB + h, PB:PB + w] = a
sh = Image.fromarray((pad * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(cfg.get('wallblur', 18) * s))
out = shade(np.asarray(sh).astype(np.float32) / 255, x0 - PB + round(cfg.get('wallx', 26) * s), y0 - PB + round(6 * s), cfg.get('wall', 0.32))
# 2) contact / ambient-occlusion shadow on the floor
cw, ch = round(w * 1.1), max(6, round(h * 0.035))
M = round(24 * s); CW, CH = cw + 2 * M, ch * 3 + 2 * M
yy, xx = np.mgrid[0:CH, 0:CW]
ell = np.clip(1 - (((xx - CW / 2) / (cw / 2)) ** 2 + ((yy - CH / 2) / (ch / 2)) ** 2), 0, 1) ** 1.2
ell = np.asarray(Image.fromarray((ell * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, ch / 2)))).astype(np.float32) / 255
out = shade(ell, cx - CW // 2 + round(8 * s), by - CH // 2 - round(ch * 0.15), cfg.get('floor', 0.55))
# 3) grade the product: warm white balance, lower contrast, left-to-right light falloff
p = np.asarray(prod.convert('RGB')).astype(np.float32)
p = p * np.array(cfg.get('tint', [1.04, 0.99, 0.90]))
g_ = p.mean(axis=2, keepdims=True); p = g_ + (p - g_) * cfg.get("sat", 0.85)
p = (p - 128) * cfg.get('contrast', 0.9) + 128 + cfg.get('lift', -6)
grad = np.linspace(cfg.get('lightL', 1.06), cfg.get('lightR', 0.86), w)[None, :, None]
vgrad = np.linspace(1.0, cfg.get('lightB', 0.9), h)[:, None, None]
p = np.clip(p * grad * vgrad, 0, 255)
# 4) light wrap: let the room colour bleed into the edges a little
roomcut = out[max(0,y0):y0 + h, x0:x0 + w]
edge = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
wrap = np.clip(a - edge, 0, 1)[..., None] * 0.35
p = p * (1 - wrap) + roomcut * wrap
out[y0:y0 + h, x0:x0 + w] = out[y0:y0 + h, x0:x0 + w] * (1 - a[..., None]) + p * a[..., None]
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
img.save(cfg['out'], quality=cfg.get('q', 82), method=6)
print('saved', cfg['out'], img.size, 'product box', (x0, y0, w, h))
