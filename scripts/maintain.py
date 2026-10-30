# -*- coding: utf-8 -*-
"""
نگهداری جعبه‌ابزار سئو — ابزار یکپارچه مدیریت داده، سئو، کش و آیکون‌ها:

    python scripts/maintain.py sync       همگام‌سازی کامل (data.js + JSON-LD + sitemap + کش)
    python scripts/maintain.py icons      گزارش دامنه‌های بدون آیکون محلی
    python scripts/maintain.py links      بررسی سلامت تمام لینک‌ها
    python scripts/maintain.py all        اجرای تمامی تست‌ها و بررسی‌ها
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# مسیر ریشه پروژه نسبت به پوشه scripts
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
TOOLS = DATA_DIR / "tools.json"
DATA_JS = DATA_DIR / "data.js"
ICONS = ROOT / "icons"
INDEX_HTML = ROOT / "index.html"
SITEMAP_XML = ROOT / "sitemap.xml"

SITE_URL = "https://seo.mhkhademi87.ir/"
REQUIRED_FIELDS = ("id", "name", "desc", "url", "domain", "cat", "color", "free")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "text/html,*/*;q=0.8",
}


def read_tools() -> tuple[list[dict], list[dict]]:
    data = json.loads(TOOLS.read_text(encoding="utf-8"))
    return data.get("cats", []), data.get("tools", [])


def icon_keys(tools: list[dict]) -> set[str]:
    """دامنهٔ اصلی هر ابزار + override های فیلد icon."""
    out = {t["domain"] for t in tools}
    out |= {t["icon"] for t in tools if t.get("icon")}
    return out


# ───────────────────────────── JSON-LD & Sitemap ─────────────────────────────

def build_seo(tools: list[dict]) -> None:
    """تولید خودکار JSON-LD در index.html و به‌روزرسانی تاریخ sitemap.xml."""
    # 1. ساخت اسکیما ItemList
    ld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "فهرست ابزارهای سئو، محتوا و تبلیغات",
        "inLanguage": "fa",
        "numberOfItems": len(tools),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": t["name"],
                "url": t["url"],
                "description": t["desc"]
            }
            for i, t in enumerate(tools)
        ],
    }
    ld_html = ('<script type="application/ld+json">\n'
               + json.dumps(ld, ensure_ascii=False, indent=1).replace("</", "<\\/")
               + "\n</script>")

    src = INDEX_HTML.read_text(encoding="utf-8")
    pat = re.compile(r"(<!-- SEO:LD:START -->)(.*?)(<!-- SEO:LD:END -->)", re.S)
    if pat.search(src):
        src = pat.sub(lambda m: f"{m.group(1)}\n{ld_html}\n{m.group(3)}", src)
        INDEX_HTML.write_text(src, encoding="utf-8")

    # 2. به‌روزرسانی sitemap.xml
    today = datetime.date.today().isoformat()
    SITEMAP_XML.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <url>\n    <loc>{SITE_URL}</loc>\n    <lastmod>{today}</lastmod>\n'
        '    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n'
        '</urlset>\n', encoding="utf-8")


# ───────────────────────────── Cache Busting ─────────────────────────────

def bump_asset_versions() -> None:
    """تزریق ?v=هش‌محتوا به ارجاعات استاتیک در index.html برای شکستن کش مرورگرها."""
    src = INDEX_HTML.read_text(encoding="utf-8")

    targets = [
        ("style.css", ROOT / "style.css"),
        ("script.js", ROOT / "script.js"),
        ("data/data.js", DATA_JS),
    ]

    for rel_name, path in targets:
        if not path.exists():
            continue
        digest = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
        # تطبیق ارجاع با پیشوند data/ یا بدون آن
        esc_name = re.escape(rel_name)
        src = re.sub(rf"({esc_name})(\?v=[a-f0-9]+)?([\"'])",
                     lambda m: f"{m.group(1)}?v={digest}{m.group(3)}", src)

    INDEX_HTML.write_text(src, encoding="utf-8")


# ───────────────────────────── Sync ─────────────────────────────

def sync() -> int:
    cats, tools = read_tools()
    problems: list[str] = []
    cat_ids = {c["id"] for c in cats}

    seen_url: dict[str, str] = {}
    seen_id: dict[str, str] = {}
    for t in tools:
        label = t.get("name") or t.get("id") or "?"
        for key in REQUIRED_FIELDS:
            if key not in t or t[key] in ("", None):
                problems.append(f"{label}: فیلد الزامی «{key}» خالی است")
        if t.get("cat") not in cat_ids:
            problems.append(f"{label}: دستهٔ نامعتبر «{t.get('cat')}»")
        if t["url"] in seen_url:
            problems.append(f"{label}: url تکراری با {seen_url[t['url']]}")
        seen_url.setdefault(t["url"], label)
        if t["id"] in seen_id:
            problems.append(f"{label}: id تکراری با {seen_id[t['id']]}")
        seen_id.setdefault(t["id"], label)
        if not (ICONS / f"{t['domain']}.png").exists():
            problems.append(f"{label}: آیکون محلی icons/{t['domain']}.png ندارد")

    # ساخت فایل data.js در پوشه data/
    payload = {"cats": cats, "tools": tools}
    DATA_JS.write_text(
        "window.SEO_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n",
        encoding="utf-8")

    # تولید اسکیما و نقشه سایت
    build_seo(tools)

    # به‌روزرسانی هش فایل‌ها
    bump_asset_versions()

    print(f"data/data.js و بخش‌های سئو ساخته شد: {len(cats)} دسته، {len(tools)} ابزار")
    if problems:
        print(f"\n{len(problems)} هشدار:")
        for p in problems:
            print("  - " + p)
        return 1
    print("اعتبارسنجی و سئو: بدون ایراد ✔")
    return 0


# ───────────────────────────── Icons Check ─────────────────────────────

def icons() -> int:
    _, tools = read_tools()
    missing = sorted(k for k in icon_keys(tools) if not (ICONS / f"{k}.png").exists())
    if missing:
        print("دامنه‌های فاقد آیکون محلی:")
        for m in missing:
            print("  - " + m)
        print("\nبرای دانلود آیکون‌ها: python scripts/download_icons.py")
        return 1
    print(f"همهٔ {len(icon_keys(tools))} دامنه آیکون محلی دارند ✔")
    return 0


# ───────────────────────────── Links Check ─────────────────────────────

def check_one(t: dict) -> tuple[int | str, str, str]:
    req = urllib.request.Request(t["url"], headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, t["name"], t["url"]
    except urllib.error.HTTPError as e:
        return e.code, t["name"], t["url"]
    except Exception as e:
        return f"ERR:{type(e).__name__}", t["name"], t["url"]


def links() -> int:
    _, tools = read_tools()
    print("در حال بررسی وضعیت سلامت لینک‌ها...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(check_one, tools))
    bad = [r for r in results if r[0] != 200]
    print(f"{len(results) - len(bad)}/{len(results)} لینک سالم (HTTP 200)")
    for status, name, url in bad:
        hint = "  ← احتمالاً محافظت کلودفلر/ضدروبوت" if status == 403 else ""
        print(f"  {str(status):>5}  {name}  {url}{hint}")
    return 1 if any(r[0] not in (200, 403) for r in bad) else 0


def main() -> None:
    ap = argparse.ArgumentParser(description="نگهداری و همگام‌سازی جعبه‌ابزار سئو")
    ap.add_argument("cmd", nargs="?", default="sync",
                    choices=["sync", "icons", "links", "all"])
    args = ap.parse_args()

    code = 0
    if args.cmd in ("sync", "all"):
        code |= sync()
    if args.cmd in ("icons", "all"):
        code |= icons()
    if args.cmd in ("links", "all"):
        code |= links()
    sys.exit(code)


if __name__ == "__main__":
    main()
