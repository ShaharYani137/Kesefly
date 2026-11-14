"""Kesefly icon (brand v2, 2026-11-14): a gold "K" monogram whose upper arm is a rising
market arrow, with a small spark at the tip, on a teal-to-midnight gradient.

Usage: python scripts/make_icon.py assets/images

DESIGN DECISIONS (brand, not from HIG or M3):
  - Brand teal #0F7B6C (also the M3 seed color in src/ui/theme.ts), midnight #062A26, gold #F5C542.
  - Glyph sits inside the Android adaptive-icon 66% safe zone for the foreground layer.
"""
import sys
from PIL import Image, ImageDraw

OUT = sys.argv[1]
S = 1024
SS = 4  # supersample
W = S * SS

TEAL = (15, 123, 108)
MIDNIGHT = (6, 42, 38)
GOLD = (245, 197, 66)
GOLD_LIGHT = (255, 226, 140)
WHITE = (255, 255, 255)


def gradient(size):
    """Diagonal gradient, teal at top-left to midnight at bottom-right."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(0, size):
            t = min(1.0, (x * 0.35 + y * 0.65) / size)
            px[x, y] = tuple(int(TEAL[i] + (MIDNIGHT[i] - TEAL[i]) * t) for i in range(3))
    return img


def glyph(scale=1.0, color=GOLD, accent=GOLD_LIGHT):
    """K monogram on a transparent W x W canvas. scale 1.0 = glyph height 0.56 W."""
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    h = W * 0.56 * scale
    cx, cy = W * 0.5, W * 0.5
    top, bot = cy - h / 2, cy + h / 2
    left = cx - h * 0.42
    stem = h * 0.17  # stroke width
    c = (*color, 255)
    # Stem, rounded ends.
    d.rounded_rectangle([left, top, left + stem, bot], radius=stem / 2, fill=c)
    # Junction point on the stem.
    jx, jy = left + stem * 0.9, cy + h * 0.06
    # Lower leg: from junction down to bottom right.
    lx, ly = cx + h * 0.36, bot - stem / 2
    d.line([(jx, jy), (lx, ly)], fill=c, width=int(stem))
    d.ellipse([lx - stem / 2, ly - stem / 2, lx + stem / 2, ly + stem / 2], fill=c)
    # Upper arm as a rising chart line: junction -> dip -> tip (top right).
    p1 = (jx, jy)
    p2 = (cx + h * 0.02, cy - h * 0.12)
    p3 = (cx + h * 0.14, cy - h * 0.02)
    tip = (cx + h * 0.40, cy - h * 0.38)
    lw = int(stem * 0.78)
    d.line([p1, p2, p3, tip], fill=c, width=lw, joint='curve')
    for p in (p1, p2, p3):
        d.ellipse([p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2], fill=c)
    # Arrow head pointing up-right.
    a = h * 0.2
    d.polygon([(tip[0] + a * 0.42, tip[1] - a * 0.42), (tip[0] - a * 0.75, tip[1] - a * 0.2), (tip[0] + a * 0.2, tip[1] + a * 0.75)], fill=c)
    # Spark: a 4-point star above the arrow.
    sx, sy, r = tip[0] - h * 0.02, top - h * 0.02, h * 0.07
    q = r * 0.28
    d.polygon([(sx, sy - r), (sx + q, sy - q), (sx + r, sy), (sx + q, sy + q), (sx, sy + r), (sx - q, sy + q), (sx - r, sy), (sx - q, sy - q)], fill=(*accent, 255))
    return img


def down(img, size=S):
    return img.resize((size, size), Image.LANCZOS)


bg = gradient(S)
# Full icon (iOS / store): glyph on gradient. iOS masks the corners itself.
full = bg.convert('RGBA')
full.alpha_composite(down(glyph(1.0)))
full.convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive: background layer, foreground within the 66% safe zone, monochrome for themed icons.
bg.save(f'{OUT}/android-icon-background.png')
down(glyph(0.78)).save(f'{OUT}/android-icon-foreground.png')
down(glyph(0.78, WHITE, WHITE)).save(f'{OUT}/android-icon-monochrome.png')
# Splash: glyph only, transparent (background color set in app.json).
down(glyph(1.15)).save(f'{OUT}/splash-icon.png')
# Notification small icon: white silhouette, Android tints it.
down(glyph(1.25, WHITE, WHITE), 96).save(f'{OUT}/notification-icon.png')
# Favicon
full.convert('RGB').resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
# Previews (not shipped): adaptive icon masked as a circle, and the full icon.
prev = bg.convert('RGBA')
prev.alpha_composite(down(glyph(0.78)))
m = Image.new('L', (S, S), 0)
ImageDraw.Draw(m).ellipse([0, 0, S, S], fill=255)
out = Image.new('RGBA', (S, S), (255, 255, 255, 255))
out.paste(prev, (0, 0), m)
out.convert('RGB').resize((256, 256), Image.LANCZOS).save(f'{OUT}/preview-adaptive.png')
full.convert('RGB').resize((256, 256), Image.LANCZOS).save(f'{OUT}/preview-full.png')
print('ok')
