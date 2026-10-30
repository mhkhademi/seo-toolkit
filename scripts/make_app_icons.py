# -*- coding: utf-8 -*-
"""
ساخت آیکون‌های اپلیکیشن (PWA) و فاوآیکون از طرح گرادیانی جعبه‌ابزار.

خروجی در پوشهٔ icons/ :
    icon-192.png          آیکون استاندارد PWA
    icon-512.png          آیکون بزرگ PWA
    icon-maskable-512.png آیکون maskable (ناحیهٔ امن ۸۰٪)
    apple-touch-icon.png  آیکون iOS (۱۸۰، بدون شفافیت و بدون گردی گوشه)
    favicon.ico           چند اندازه برای تب مرورگر
و favicon.svg در ریشهٔ پروژه.

اجرا:  python make_app_icons.py
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"

ACCENT_A = (139, 124, 255)      # --accent   بنفش
ACCENT_B = (34, 211, 238)       # --accent-2 فیروزه‌ای
SS = 4                          # supersampling برای لبه‌های نرم


def gradient(size: int) -> Image.Image:
    """گرادیان مورب از بنفش به فیروزه‌ای (در رنگ فضای sRGB)."""
    small = Image.new("RGB", (64, 64))
    px = small.load()
    span = 63 * 2
    for y in range(64):
        for x in range(64):
            t = (x + y) / span
            px[x, y] = tuple(round(ACCENT_A[i] + (ACCENT_B[i] - ACCENT_A[i]) * t) for i in range(3))
    return small.resize((size, size), Image.LANCZOS).convert("RGBA")


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    s = size * SS
    m = Image.new("L", (s, s), 0)
    r = int(s * radius_ratio)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def magnifier(size: int, scale: float = 1.0, offset: tuple[float, float] = (0.0, 0.0)) -> Image.Image:
    """آیکون ذره‌بین (جستجو) به رنگ سفید با نوک گرد."""
    s = size * SS
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = s * scale
    dx, dy = offset[0] * s, offset[1] * s
    ring_r, ring_w = 0.205 * k, 0.062 * k
    cx = cy = 0.44 * k + dx + dy
    d.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
              outline=(255, 255, 255, 255), width=int(ring_w))
    # دستهٔ ذره‌بین
    a = (cx + ring_r * 0.72, cy + ring_r * 0.72)
    b = (cx + ring_r * 1.72, cy + ring_r * 1.72)
    handle_w = int(ring_w * 1.25)
    d.line([a, b], fill=(255, 255, 255, 255), width=handle_w)
    for pt in (a, b):                       # نوک گرد
        r = handle_w / 2
        d.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=(255, 255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)


def build(size: int, radius_ratio: float, glyph_scale: float, glyph_offset=(0, 0)) -> Image.Image:
    """آیکون گرد با گرادیان + ذره‌بین."""
    base = gradient(size)
    glyph = magnifier(size, glyph_scale, glyph_offset)
    base.alpha_composite(glyph)
    base.putalpha(rounded_mask(size, radius_ratio))
    return base


def main() -> None:
    OUT.mkdir(exist_ok=True)

    # آیکون‌های گرد PWA
    build(192, 0.22, 1.0).save(OUT / "icon-192.png", optimize=True)
    build(512, 0.22, 1.0).save(OUT / "icon-512.png", optimize=True)

    # maskable: ناحیهٔ امن ۸۰٪ ⇒ گرافیک کوچک‌تر و پس‌زمینهٔ تمام‌صفحه
    maskable = gradient(512)
    maskable.alpha_composite(magnifier(512, 0.68, (0.04, 0.04)))
    maskable.save(OUT / "icon-maskable-512.png", optimize=True)

    # iOS: بدون شفافیت و بدون گردی گوشه (سیستم خودش گرد می‌کند)
    ios = gradient(180)
    ios.alpha_composite(magnifier(180, 1.0))
    ios.convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)

    # فاوآیکون چنداندازه‌ای
    fav = build(64, 0.22, 1.0)
    fav.save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    # نسخهٔ برداری (تیز در هر اندازه)
    (ROOT / "favicon.svg").write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="جعبه‌ابزار سئو">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8b7cff"/><stop offset="1" stop-color="#22d3ee"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round">
    <circle cx="28.2" cy="28.2" r="13.1"/><path d="M37.7 37.7 47 47"/>
  </g>
</svg>
""", encoding="utf-8")

    print("ساخته شد:")
    for p in ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
              "icons/apple-touch-icon.png", "favicon.ico", "favicon.svg"]:
        print(f"  {p:32s} {(ROOT / p).stat().st_size / 1024:.1f}KB")


if __name__ == "__main__":
    main()