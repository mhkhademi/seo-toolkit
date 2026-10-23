# -*- coding: utf-8 -*-
"""
نگهداری جعبه‌ابزار سئو — یک اسکریپت، چند زیرفرمان:

    python maintain.py sync          ساخت data.js از روی tools.json + اعتبارسنجی داده
    python maintain.py icons         گزارش دامنه‌هایی که آیکون محلی ندارند
    python maintain.py links         تست سلامت همهٔ لینک‌ها (گزارش غیر۲۰۰ها)
    python maintain.py all           هر سه مورد بالا

نکته: اگر خروجی فارسی در کنسول ویندوز به‌هم ریخت، با PYTHONUTF8=1 اجرا کنید.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).parent
TOOLS = ROOT / "tools.json"
DATA_JS = ROOT / "data.js"
ICONS = ROOT / "icons"
REQUIRED = ("id", "name", "desc", "url", "domain", "cat", "color", "free")
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


# ───────────────────────────── sync ─────────────────────────────

def sync() -> int:
    cats, tools = read_tools()
    problems: list[str] = []
    cat_ids = {c["id"] for c in cats}

    seen_url: dict[str, str] = {}
    seen_id: dict[str, str] = {}
    for t in tools:
        label = t.get("name") or t.get("id") or "?"
        for key in REQUIRED:
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

    payload = {"cats": cats, "tools": tools}
    DATA_JS.write_text(
        "window.SEO_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    bump_asset_versions()

    print(f"data.js ساخته شد: {len(cats)} دسته، {len(tools)} ابزار")
    if problems:
        print(f"\n{len(problems)} هشدار:")
        for p in problems:
            print("  - " + p)
        return 1
    print("اعتبارسنجی: بدون ایراد ✔")
    return 0


# ───────────────────────────── cache busting ─────────────────────────────

def bump_asset_versions() -> None:
    """تزریق ?v=هش‌محتوا به ارجاعات استاتیک در index.html.

    هاست برای CSS/JS هدر max-age=۷روزه می‌فرستد؛ با تغییر هش، آدرس فایل
    عوض می‌شود و کش مرورگر کاربران بعد از هر تغییر می‌شکند.
    """
    idx = ROOT / "index.html"
    src = idx.read_text(encoding="utf-8")
    for name in ("style.css", "fonts.css", "script.js", "data.js"):
        path = ROOT / name
        if not path.exists():
            continue
        digest = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
        src = re.sub(rf"({re.escape(name)})(\?v=[a-f0-9]+)?([\"'])",
                     lambda m: f"{m.group(1)}?v={digest}{m.group(3)}", src)
    idx.write_text(src, encoding="utf-8")


# ───────────────────────────── icons ─────────────────────────────

def icons() -> int:
    _, tools = read_tools()
    missing = sorted(k for k in icon_keys(tools) if not (ICONS / f"{k}.png").exists())
    if missing:
        print("بدون آیکون محلی (در صفحه globe/حرف اول نمایش داده می‌شود):")
        for m in missing:
            print("  - " + m)
        print("\nبرای دانلود: python download_icons.py")
        return 1
    print(f"همهٔ {len(icon_keys(tools))} دامنه آیکون محلی دارند ✔")
    return 0


# ───────────────────────────── links ─────────────────────────────

def check_one(t: dict) -> tuple[int | str, str, str]:
    req = urllib.request.Request(t["url"], headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, t["name"], t["url"]
    except urllib.error.HTTPError as e:
        return e.code, t["name"], t["url"]
    except Exception as e:                                  # noqa: BLE001
        return f"ERR:{type(e).__name__}", t["name"], t["url"]


def links() -> int:
    _, tools = read_tools()
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(check_one, tools))
    bad = [r for r in results if r[0] != 200]
    print(f"{len(results) - len(bad)}/{len(results)} لینک سالم (HTTP 200)")
    for status, name, url in bad:
        hint = "  ← معمولاً ضدربات (Cloudflare)؛ در مرورگر بررسی کنید" if status == 403 else ""
        print(f"  {str(status):>5}  {name}  {url}{hint}")
    return 1 if any(r[0] not in (200, 403) for r in bad) else 0


def main() -> None:
    ap = argparse.ArgumentParser(description="نگهداری جعبه‌ابزار سئو")
    ap.add_argument("cmd", nargs="?", default="all",
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
