"""Kesefly icon: gold coin with a rising trend arrow and a small wing, on a deep green field."""
import sys, math
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
S = 1024
SS = 4  # supersample
W = S * SS

GREEN_TOP = (46, 125, 50)
GREEN_BOT = (20, 70, 32)
GOLD = (247, 197, 66)
GOLD_DARK = (214, 158, 30)
DARK = (22, 78, 36)
WHITE = (255, 255, 255)

def gradient(size):
    img = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(GREEN_TOP[i] + (GREEN_BOT[i] - GREEN_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)
    return img

def feather(w, h, angle, color):
    lay = Image.new('RGBA', (w * 3, w * 3), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    cx, cy = lay.width // 2, lay.height // 2
    d.ellipse([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], fill=color)
    return lay.rotate(angle, resample=Image.BICUBIC)

def glyph(scale=1.0, mono=False):
    """Glyph on transparent canvas W x W, centered, sized by scale (1.0 = coin diameter 0.5*W)."""
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = W * 0.54, W * 0.5
    r = W * 0.25 * scale
    gold = WHITE if mono else GOLD
    gold_dark = WHITE if mono else GOLD_DARK
    ink = (0, 0, 0, 0) if mono else DARK
    # wing: three feathers on the left of the coin
    fw = int(r * 0.42)
    for i, (dy, length, ang) in enumerate([(-0.45, 1.25, 28), (-0.05, 1.05, 14), (0.32, 0.85, 2)]):
        fl = feather(fw, int(r * length), 90 + ang, (*WHITE, 255))
        px = int(cx - r * 1.05 - fl.width / 2 + r * 0.1 * i)
        py = int(cy + r * dy - fl.height / 2)
        img.alpha_composite(fl, (px, py))
    d = ImageDraw.Draw(img)
    # coin
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*gold_dark, 255))
    ri = r * 0.86
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(*gold, 255))
    # rising trend arrow inside coin
    lw = int(r * 0.13)
    pts = [(-0.55, 0.38), (-0.18, 0.02), (0.08, 0.24), (0.5, -0.32)]
    pts = [(cx + x * r, cy + y * r) for x, y in pts]
    if mono:
        # cut the arrow out of the white coin
        mask = Image.new('L', (W, W), 0)
        md = ImageDraw.Draw(mask)
        md.line(pts, fill=255, width=lw, joint='curve')
        for p in pts:
            md.ellipse([p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2], fill=255)
        tip = pts[-1]
        ah = r * 0.34
        md.polygon([(tip[0] + ah * 0.35, tip[1] - ah * 0.35), (tip[0] - ah * 0.55, tip[1] - ah * 0.2), (tip[0] + ah * 0.2, tip[1] + ah * 0.55)], fill=255)
        a = img.split()[3]
        a = Image.composite(Image.new('L', (W, W), 0), a, mask)
        img.putalpha(a)
    else:
        d.line(pts, fill=(*ink, 255), width=lw, joint='curve')
        for p in pts:
            d.ellipse([p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2], fill=(*ink, 255))
        tip = pts[-1]
        ah = r * 0.34
        d.polygon([(tip[0] + ah * 0.35, tip[1] - ah * 0.35), (tip[0] - ah * 0.55, tip[1] - ah * 0.2), (tip[0] + ah * 0.2, tip[1] + ah * 0.55)], fill=(*ink, 255))
    return img

def down(img, size=S):
    return img.resize((size, size), Image.LANCZOS)

bg = gradient(S)
# Full icon (iOS / legacy / store): glyph at full size on gradient. iOS masks corners itself.
full = bg.convert('RGBA')
full.alpha_composite(down(glyph(1.15)))
full.convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive: background layer, foreground within the 66% safe zone.
bg.save(f'{OUT}/android-icon-background.png')
down(glyph(0.9)).save(f'{OUT}/android-icon-foreground.png')
down(glyph(0.9, mono=True)).save(f'{OUT}/android-icon-monochrome.png')
# Splash: glyph only, transparent (splash background color set in app.json).
down(glyph(1.3)).save(f'{OUT}/splash-icon.png')
# Favicon
full.convert('RGB').resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
# Preview: adaptive icon masked as a circle, as a launcher shows it.
prev = bg.convert('RGBA'); prev.alpha_composite(down(glyph(0.9)))
m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).ellipse([0, 0, S, S], fill=255)
out = Image.new('RGBA', (S, S), (255, 255, 255, 255)); out.paste(prev, (0, 0), m)
out.convert('RGB').resize((256, 256), Image.LANCZOS).save(f'{OUT}/preview-adaptive.png')
full.convert('RGB').resize((256, 256), Image.LANCZOS).save(f'{OUT}/preview-full.png')
print('ok')
