#!/usr/bin/env python3
"""
build_seo.py — تولید خودکار بخش‌های سئو از tools.json
اجرا:  PYTHONUTF8=1 python build_seo.py
- JSON-LD از نوع ItemList را بین مارکرهای SEO:LD می‌نویسد
- lastmod در sitemap.xml را به تاریخ امروز به‌روز می‌کند
بعد از هر تغییر در tools.json (و بعد از maintain.py sync) اجرا کنید.
"""
import json, re, html, datetime, pathlib

SITE = "http://seo.mhkhademi87.ir/"   # بعد از فعال‌شدن HTTPS به https:// تغییر دهید
ROOT = pathlib.Path(__file__).parent

data = json.loads((ROOT / "tools.json").read_text(encoding="utf-8"))
cats = {c["id"]: c["label"] for c in data["cats"]}
tools = data["tools"]
esc = lambda s: html.escape(s, quote=True)

# ---------- JSON-LD ItemList ----------
ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "فهرست ابزارهای سئو، محتوا و تبلیغات",
    "inLanguage": "fa",
    "numberOfItems": len(tools),
    "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": t["name"],
         "url": t["url"], "description": t["desc"]}
        for i, t in enumerate(tools)
    ],
}
ld_html = ('<script type="application/ld+json">\n'
           + json.dumps(ld, ensure_ascii=False, indent=1).replace("</", "<\\/")
           + "\n</script>")

def inject(src, tag, body):
    pat = re.compile(rf"(<!-- SEO:{tag}:START -->)(.*?)(<!-- SEO:{tag}:END -->)", re.S)
    if not pat.search(src):
        raise SystemExit(f"مارکر SEO:{tag} در index.html پیدا نشد")
    return pat.sub(lambda m: f"{m.group(1)}\n{body}\n{m.group(3)}", src)

idx = ROOT / "index.html"
src = idx.read_text(encoding="utf-8")
src = inject(src, "LD", ld_html)
idx.write_text(src, encoding="utf-8")

# ---------- sitemap ----------
sm = ROOT / "sitemap.xml"
today = datetime.date.today().isoformat()
sm.write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f'  <url>\n    <loc>{SITE}</loc>\n    <lastmod>{today}</lastmod>\n'
    '    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n'
    '</urlset>\n', encoding="utf-8")

print(f"OK — {len(tools)} ابزار، {len(cats)} دسته | sitemap lastmod={today}")
