# -*- coding: utf-8 -*-
"""
دانلود و نرمال‌سازی آیکون همهٔ ابزارها در پوشهٔ icons/

هر آیکون به یک PNG مربعِ ۶۴×۶۴ با پس‌زمینهٔ شفاف تبدیل می‌شود تا:
  • نسبت ابعاد همیشه ۱ باشد (نوارایی روی لوگوهای غیرمربع مثل Looker Studio)
  • رزولوشن همه یکسان باشد (بین ۱۶ تا ۱۲۸ پیکسل نباشد)
  • فرمت ICO برای مرورگرها کدسازی نکند (مشکل image-size-responsive در Lighthouse)

خروجی: icons/<domain>.png برای همهٔ دامنه‌ها + icons/default.png برای fallback.
دامنه‌هایی که لوگوی واقعی‌شان دانلود نمی‌شود، آیکون ساخته‌شده می‌گیرند:
کاشی گرادیانی به رنگ همان ابزار + حرف اول نامش (make_letter_icon).
دیگر هیچ درخواستی به اینترنت در زمان اجرای صفحه زده نمی‌شود.

اجرا:
    python download_icons.py            # فقط موارد ناقص/نرمال‌نشده
    python download_icons.py --force    # دانلود مجدد همه
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import io
import pathlib
import sys
import urllib.error
import urllib.request

try:
    from PIL import Image, ImageDraw, ImageOps
except ImportError:
    sys.exit("Pillow نصب نیست.  pip install Pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "icons"
SIZE = 64                     # ۲ برابر اندازهٔ نمایش (۲۸px) برای صفحه‌های رتینا
TIMEOUT = 12
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "image/*,*/*;q=0.8",
}
SOURCE_EXTS = ("png", "jpg", "jpeg", "ico", "webp", "gif")
MIN_BYTES = 32                # کف معقول؛ آیکون‌های خیلی کوچک‌تر از این معمولاً خطای HTML هستند
DEFAULT_ICON = OUT / "default.png"
# فایل‌های غیرآیکون-ابزار که هرگز نباید حذف شوند (خروجی make_app_icons.py)
KEEP_FILES = {"default.png", "icon-192.png", "icon-512.png",
              "icon-maskable-512.png", "apple-touch-icon.png"}


# ───────────────────────────── کمکی‌ها ─────────────────────────────

def fetch(url: str, accept: str | None = None) -> bytes | None:
    """دریافت بایت‌ها؛ در خطا None برمی‌گرداند (بدون استثنا)."""
    headers = dict(HEADERS)
    if accept:
        headers["Accept"] = accept
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.read()
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, ValueError):
        return None


def looks_like_image(data: bytes) -> bool:
    """تشخیص با magic bytes؛ اگر پاسخ HTML باشد (صفحهٔ خطا) رد می‌شود."""
    if not data or len(data) < MIN_BYTES:
        return False
    if data[:8] in (b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a"):
        return True
    if data[:6] in (b"\xff\xd8\xff", b"RIFF") and data[8:12] == b"WEBP":
        return True
    if data[:4] == b"\x00\x00\x01\x00":          # ICO
        return True
    return False


def to_square_png(data: bytes, colors: int = 64) -> bytes | None:
    """تصویر را بدون کشیدگی/برش داخل مربع شفافِ SIZE جا می‌دهد و PNG برمی‌گرداند."""
    try:
        with Image.open(io.BytesIO(data)) as im:
            im = ImageOps.exif_transpose(im)
            # ICO چندفریمی است؛ Pillow به‌طور پیش‌فرض بزرگ‌ترین فریم را باز می‌کند
            im = im.convert("RGBA")
            canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
            fitted = ImageOps.contain(im, (SIZE, SIZE), Image.LANCZOS)
            canvas.paste(fitted, ((SIZE - fitted.width) // 2, (SIZE - fitted.height) // 2), fitted)
            # کم‌رنگ کردن پالت: حجم PNG را تقریباً نصف می‌کند، در این اندازه اصلاً دیده نمی‌شود
            quantized = canvas.quantize(colors=colors, method=Image.FASTOCTREE)
            buf = io.BytesIO()
            quantized.save(buf, "PNG", optimize=True)
            return buf.getvalue()
    except Exception:
        return None


def find_existing(domain: str) -> pathlib.Path | None:
    for ext in SOURCE_EXTS:
        p = OUT / f"{domain}.{ext}"
        if p.exists() and p.stat().st_size >= MIN_BYTES:
            return p
    return None


# ───────────────────────────── آیکون پیش‌فرض ─────────────────────────────

def rounded_mask(size: int, radius_ratio: float):
    """ماسک آلفا برای گوشه‌های گرد (با supersampling)."""
    s = size * 4
    m = Image.new("L", (s, s), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def write_default_icon() -> None:
    """آیکون خنثی برای دامنه‌هایی که لوگوی واقعی ندارند: کرهٔ زمین."""
    S = SIZE * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    cx = cy = S / 2
    r = S * 0.38
    ring = (148, 163, 184, 255)
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ring, width=int(S * 0.055))
    # خطوط طول و عرض جغرافیایی
    for w in (0.42, 0.42):
        rw = r * w
        dr.ellipse([cx - rw, cy - r, cx + rw, cy + r], outline=ring, width=int(S * 0.04))
    dr.line([cx - r, cy, cx + r, cy], fill=ring, width=int(S * 0.04))
    for f in (0.30, 0.68):
        dr.ellipse([cx - r, cy - r * f, cx + r, cy + r * f], outline=ring, width=int(S * 0.04))
    im.resize((SIZE, SIZE), Image.LANCZOS).save(DEFAULT_ICON, "PNG", optimize=True)


# ───────────────────────────── آیکون ساخته‌شده ─────────────────────────────

FONT_CANDIDATES = ("segoeui.ttf", "tahoma.ttf", "arial.ttf")   # هر سه گلیف فارسی دارند


def persian_font(size: int):
    """فونت واقعی برای کشیدن حرف فارسی؛ PIL با فونت پیش‌فرض فقط ASCII می‌کشد."""
    from PIL import ImageFont
    windir = pathlib.Path(__import__("os").environ.get("WINDIR", r"C:\Windows"))
    for name in FONT_CANDIDATES:
        p = windir / "Fonts" / name
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except Exception:                                   # noqa: BLE001
                continue
    return ImageFont.load_default()


def make_letter_icon(tool: dict, path: pathlib.Path) -> bool:
    """کاشی گرادیانی به رنگ خود ابزار + حرف اول نامش، برای دامنه‌های بدون لوگو."""
    S = SIZE * 4
    hexcolor = str(tool.get("color", "#8b7cff")).lstrip("#")
    try:
        rgb = tuple(int(hexcolor[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        rgb = (139, 124, 255)
    dark = tuple(max(0, c - 80) for c in rgb)

    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = im.load()
    span = (S - 1) * 2
    for y in range(S):
        for x in range(S):
            t = (x + y) / span
            px[x, y] = tuple(round(rgb[i] + (dark[i] - rgb[i]) * t) for i in range(3)) + (255,)

    ch = (tool.get("name") or "?").strip()[0]
    dr = ImageDraw.Draw(im)
    font = persian_font(int(S * 0.44))
    x0, y0, x1, y1 = dr.textbbox((0, 0), ch, font=font)
    dr.text(((S - (x1 - x0)) / 2 - x0, (S - (y1 - y0)) / 2 - y0),
            ch, font=font, fill=(255, 255, 255, 255))

    im.putalpha(rounded_mask(S, 0.24))
    im.resize((SIZE, SIZE), Image.LANCZOS).save(path, "PNG", optimize=True)
    return True


# ───────────────────────────── دانلود ─────────────────────────────

def apple_touch_url(domain: str) -> str | None:
    """آدرس لوگوی اصلی سایت از تگ apple-touch-icon در صفحهٔ اصلی (کیفیت بالاتر از favicon)."""
    html = fetch(f"https://{domain}/", accept="text/html")
    if not html:
        return None
    text = html[:400_000].decode("utf-8", "ignore")
    import re
    m = re.search(r'<link[^>]+rel=["\']apple-touch-icon["\'][^>]*>', text, re.I)
    if not m:
        m = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']apple-touch-icon["\']', text, re.I)
        href = m.group(1) if m else None
    else:
        href = re.search(r'href=["\']([^"\']+)["\']', m.group(0), re.I).group(1)
    if not href:
        return None
    return href if href.startswith("http") else f"https://{domain}/{href.lstrip('/')}"


def source_urls(domain: str) -> list[tuple[str, str]]:
    """(نشانی، برچسب) به ترتیب اولویت."""
    www = "www." + domain
    urls = [
        (f"https://www.google.com/s2/favicons?domain={domain}&sz=64", "google"),
        (f"https://icons.duckduckgo.com/ip3/{domain}.ico", "duckduckgo"),
        (f"https://{domain}/favicon.ico", "favicon.ico"),
    ]
    if domain != www:
        # خیلی از سایت‌‌ها فقط روی www سرو می‌کنند
        urls.append((f"https://{www}/favicon.ico", "favicon.ico (www)"))
    return urls


def globe_hash() -> str | None:
    data = fetch("https://www.google.com/s2/favicons?domain=this-domain-does-not-exist-9z8x7c6.com&sz=64")
    return hashlib.md5(data).hexdigest() if data else None


def grab(domain: str, gh: str | None, use_apple: bool) -> tuple[str, str, str]:
    """(domain, status, detail) با status در {ok, default, fail}"""
    if use_apple:
        url = apple_touch_url(domain)
        if url:
            data = fetch(url)
            if data and looks_like_image(data):
                png = to_square_png(data)
                if png:
                    (OUT / f"{domain}.png").write_bytes(png)
                    return domain, "ok", "apple-touch-icon"
    for url, label in source_urls(domain):
        data = fetch(url)
        if not data or not looks_like_image(data):
            continue
        # آیکون پیش‌فرض «کره» یعنی لوگوی واقعی وجود ندارد
        if label == "google" and gh and hashlib.md5(data).hexdigest() == gh:
            return domain, "default", "no real logo"
        png = to_square_png(data)
        if png:
            (OUT / f"{domain}.png").write_bytes(png)
            return domain, "ok", label
    return domain, "fail", "no source"


# ───────────────────────────── نرمال‌سازی ─────────────────────────────

def normalize_existing(domain: str, force: bool = False) -> bool:
    """تبدیل فایل موجود (ico/jpg/png/...) به PNG مربع. True اگر تغییر کرد."""
    target = OUT / f"{domain}.png"
    src = find_existing(domain)
    if not src:
        return False
    if src == target and not force:
        return False
    png = to_square_png(src.read_bytes())
    if not png:
        return False
    target.write_bytes(png)
    if src != target:
        src.unlink()                   # فایل قدیمی دیگر لازم نیست
    return True


def prune_stale() -> int:
    """حذف فایل‌هایی که دامنه‌شان در tools.json نیست."""
    domains = icon_keys(read_tools())
    removed = 0
    for p in OUT.iterdir():
        if p.name in KEEP_FILES:
            continue
        if p.stem not in domains:
            p.unlink()
            removed += 1
    return removed


def write_manifest(have: set[str]) -> None:
    """فهرست دامنه‌هایی که آیکون محلی دارند را در icons.json می‌نویسد."""
    import json
    payload = {"size": SIZE, "default": f"icons/default.png", "domains": sorted(have)}
    (DATA / "icons.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def local_icon_stems() -> set[str]:
    """نام فایل‌های آیکون ابزارها (بدون فایل‌های اپ مثل icon-192)."""
    return {p.stem for p in OUT.glob("*.png") if p.name not in KEEP_FILES}


def read_tools() -> list[dict]:
    import json
    data = json.loads((DATA / "tools.json").read_text(encoding="utf-8"))
    return data["tools"]


def icon_keys(tools: list[dict]) -> set[str]:
    """دامنهٔ هر ابزار + مقدار override فیلد اختیاری icon."""
    out = {t["domain"] for t in tools}
    out |= {t["icon"] for t in tools if t.get("icon")}
    return out


# ───────────────────────────── main ─────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="دانلود/نرمال‌سازی آیکون ابزارهای سئو")
    ap.add_argument("--force", action="store_true", help="دانلود مجدد همهٔ آیکون‌ها")
    ap.add_argument("--renormalize", action="store_true",
                    help="فقط پردازش مجدد آیکون‌های موجود (بدون دانلود)")
    ap.add_argument("--no-apple", action="store_true", help="استفاده نکردن از apple-touch-icon")
    ap.add_argument("--jobs", type=int, default=10)
    args = ap.parse_args()

    OUT.mkdir(exist_ok=True)
    write_default_icon()

    domains = sorted(icon_keys(read_tools()))
    todo, normalized = [], 0

    for d in domains:
        if args.renormalize:
            normalized += normalize_existing(d, force=True)
            continue
        target = OUT / f"{d}.png"
        if args.force:
            todo.append(d)
        elif target.exists():
            if target.stat().st_size < MIN_BYTES:
                todo.append(d)                      # فایل خراب/ناقص
        elif normalize_existing(d):
            normalized += 1
        else:
            todo.append(d)

    stale = prune_stale()
    print(f"{len(domains)} دامنه | {normalized} آیکون موجود نرمال شد | {stale} فایل اضافه حذف شد")
    if not todo:
        write_manifest(local_icon_stems())
        print("همهٔ آیکون‌ها آماده‌اند.")
        summarize(domains)
        return

    print(f"در حال دانلود {len(todo)} آیکون ...\n")
    gh = globe_hash()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as ex:
        results = list(ex.map(lambda d: grab(d, gh, not args.no_apple), todo))

    for d, status, detail in results:
        mark = {"ok": "ok  ", "default": "----", "fail": "FAIL"}[status]
        if status == "ok":
            kb = (OUT / f"{d}.png").stat().st_size // 1024
            print(f"  {mark} {d:34s} {kb or 1:>3}KB  ({detail})")

    def count(s): return sum(1 for _, st, _ in results if st == s)
    missing = [d for d, st, _ in results if st != "ok"]
    if missing:
        by_key = {}
        for t in read_tools():
            by_key.setdefault(t["domain"], t)
            if t.get("icon"):
                by_key.setdefault(t["icon"], t)
        print("\nساخت آیکون جایگزین برای دامنه‌های بدون لوگو:")
        for d in sorted(missing):
            tool = by_key.get(d, {"name": d, "color": "#8b7cff"})
            make_letter_icon(tool, OUT / f"{d}.png")
            print(f"  made {d:34s} (حرف اول «{(tool.get('name') or '?').strip()[0]}»)")
    write_manifest(local_icon_stems())

    print(f"\n{count('ok')} دانلود شد · {count('default')} بدون لوگو · {count('fail')} ناموفق")
    summarize(domains)


def summarize(domains: list[str]) -> None:
    files = [p for p in OUT.glob("*.png") if p.name not in KEEP_FILES]
    total = sum(p.stat().st_size for p in files)
    print(f"icons/: {len(files)} آیکون {SIZE}×{SIZE} · مجموع {total / 1024:.1f}KB")


if __name__ == "__main__":
    main()