/* ────────────────────────────────────────────────────────────
   🧰 جعبه‌ابزار سئو

   منبع داده: tools.json
   اگر صفحه را با سرور محلی باز کنید، tools.json از همان‌جا خوانده می‌شود.
   در غیر این صورت از data.js استفاده می‌شود.

   بعد از ویرایش tools.json، یک‌بار data.js را هم به‌روز کنید:
     python maintain.py sync
   ──────────────────────────────────────────────────────────── */

const FAV_KEY = 'seo-tools-favorites';
const THEME_KEY = 'seo-theme';
const STATS_KEY = 'seo-tools-stats';

// پاک‌سازی کلید قدیمی یادداشت‌ها (قابلیت حذف‌شده)
localStorage.removeItem('seo-tools-notes');

const SUN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3V21.5M2.5 12h2.2M19.3 12H21.5M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1 17.3 6.7M6.7 17.3 5.1 18.9"/></svg>';
const MOON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z"/></svg>';
const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.75 5.6 6.2.9-4.5 4.35 1.07 6.15L12 17.25 6.48 20.2l1.07-6.15L3.05 9.7l6.2-.9z"/></svg>';
const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/></svg>';

let CATS = {};
let TOOLS = [];
let DEFAULT_ICON = 'icons/default.png';
let activeCat = 'all';
let query = '';
let onlyFav = false;
let onlyFree = false;
let sortMode = 'default';

let favorites = new Set(safeParse(localStorage.getItem(FAV_KEY), []));
let stats = safeParse(localStorage.getItem(STATS_KEY), {});

const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
const empty = document.getElementById('empty');
const searchInput = document.getElementById('search');
const countEl = document.getElementById('count');
const themeBtn = document.getElementById('themeToggle');
const favFilterBtn = document.getElementById('favFilter');
const freeFilterBtn = document.getElementById('freeFilter');
const sortBox = document.getElementById('sortBox');
const sortBtn = document.getElementById('sortBtn');
const sortMenu = document.getElementById('sortMenu');
const sortLabel = document.getElementById('sortLabel');
const toastEl = document.getElementById('toast');
const toolbar = document.querySelector('.toolbar');

const SORT_LABELS = { default: 'ترتیب پیش‌فرض', alpha: 'الفبایی', used: 'پرکاربردترین' };

const faNum = n => n.toLocaleString('fa-IR');

function safeParse(raw, fallback) {
  try { return JSON.parse(raw) ?? fallback; }
  catch { return fallback; }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ─────────────── نرمال‌سازی فارسی برای جستجو ─────────────── */
const NORM_MAP = {
  'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ی',
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  '‌': ' ',   // نیم‌فاصله → فاصله تا «بک‌لینک» و «بک لینک» هر دو جور شوند
  '‏': ' ', '‎': ' ',
};
const NORM_RE = /[يىكةؤئأإآٱ‌‏‎]/g;
const norm = s => String(s ?? '').toLowerCase().replace(NORM_RE, c => NORM_MAP[c]);
const tokensOf = q => norm(q).split(/\s+/).filter(Boolean);

function hayOf(t) {
  return norm([
    t.name, t.desc, t.url, t.domain, CATS[t.cat],
    ...(t.iranian ? [CATS.iranian] : []),
    ...(t.tags || [])
  ].join(' '));
}

/* هایلایت عبارت جستجو بدون به‌هم ریختن طول رشته (نگاشت ۱:۱) */
function highlight(text, tokens) {
  if (!tokens.length) return esc(text);
  const n = norm(text);
  const marks = new Uint8Array(n.length);
  for (const tok of tokens) {
    let i = 0;
    while ((i = n.indexOf(tok, i)) !== -1) { marks.fill(1, i, i + tok.length); i += tok.length; }
  }
  let out = '', i = 0;
  while (i < text.length) {
    let j = i;
    if (marks[i]) { while (j < text.length && marks[j]) j++; out += `<mark>${esc(text.slice(i, j))}</mark>`; }
    else { while (j < text.length && !marks[j]) j++; out += esc(text.slice(i, j)); }
    i = j;
  }
  return out;
}

function applyData(data) {
  CATS = Object.fromEntries((data.cats || []).map(c => [c.id, c.label]));
  TOOLS = data.tools || [];
}

/* ─────────────── آیکون‌ها: فقط محلی، بدون درخواست خارجی ─────────────── */
function iconChain(t) {
  const key = t.icon || t.domain;
  return [...new Set([`icons/${key}.png`, DEFAULT_ICON])];
}

window.logoFallback = function (img) {
  const chain = JSON.parse(img.dataset.chain);
  const next = Number(img.dataset.step || 0) + 1;
  if (next < chain.length) {
    img.dataset.step = String(next);
    img.src = chain[next];
  } else {
    const box = img.parentElement;
    box.classList.add('letter');
    box.textContent = (img.dataset.name || '?').trim().charAt(0).toUpperCase();
  }
};

/* عضویت در دسته: دستهٔ «ایرانی» علاوه بر cat اصلی، پرچم iranian را هم در بر می‌گیرد */
function inCat(t, catId) {
  return t.cat === catId || (catId === 'iranian' && t.iranian === true);
}

function toolMatches(t, tokens) {
  if (onlyFav && !favorites.has(t.url)) return false;
  if (onlyFree && t.free !== true) return false;
  if (activeCat !== 'all' && !inCat(t, activeCat)) return false;
  if (!tokens.length) return true;
  const hay = hayOf(t);
  return tokens.every(w => hay.includes(w));
}

function readHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  activeCat = p.get('cat') || 'all';
  query = p.get('q') || '';
  onlyFav = p.get('fav') === '1';
  onlyFree = p.get('free') === '1';
  sortMode = ['default', 'alpha', 'used'].includes(p.get('sort')) ? p.get('sort') : 'default';
  searchInput.value = query;
  applySortUI();
}

function writeHash() {
  const p = new URLSearchParams();
  if (activeCat !== 'all') p.set('cat', activeCat);
  if (query) p.set('q', query);
  if (onlyFav) p.set('fav', '1');
  if (onlyFree) p.set('free', '1');
  if (sortMode !== 'default') p.set('sort', sortMode);
  const next = p.toString() ? '#' + p.toString() : location.pathname + location.search;
  if ((location.hash || location.pathname + location.search) !== next) {
    history.replaceState(null, '', next);
  }
}

function cardHTML(t, i, tokens) {
  const isFav = favorites.has(t.url);
  const catLabel = CATS[t.cat] || '';
  const chain = iconChain(t);
  return `
  <article class="card ${isFav ? 'fav' : ''}" style="--c:${esc(t.color)}; animation-delay:${Math.min(i * 22, 400)}ms">
    <div class="card-actions">
      <button class="icon-mini copy" type="button" data-copy="${esc(t.url)}" title="کپی لینک" aria-label="کپی لینک">${COPY_SVG}</button>
      <button class="star ${isFav ? 'on' : ''}" type="button" data-url="${esc(t.url)}"
              title="${isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}"
              aria-label="علاقه‌مندی" aria-pressed="${isFav}">${STAR_SVG}</button>
    </div>
    <a class="card-main" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" data-open="${esc(t.url)}">
      <div class="logo">
        <img src="${esc(chain[0])}"
             data-chain='${esc(JSON.stringify(chain))}' data-name="${esc(t.name)}" data-step="0" alt=""
             loading="lazy" decoding="async" onerror="logoFallback(this)">
      </div>
      <div class="body">
        <h3>${highlight(t.name, tokens)}</h3>
        <p>${highlight(t.desc, tokens)}</p>
        <div class="meta">
          <span class="domain" dir="ltr">${esc(t.domain)}</span>
          ${catLabel ? `<span class="cat-pill">${esc(catLabel)}</span>` : ''}
          <span class="price ${t.free ? 'free' : 'paid'}">${t.free ? 'رایگان' : 'پولی'}</span>
        </div>
      </div>
    </a>
  </article>`;
}

function filteredList() {
  const tokens = tokensOf(query);
  const list = TOOLS.filter(t => toolMatches(t, tokens));
  const favFirst = (a, b) => Number(favorites.has(b.url)) - Number(favorites.has(a.url));
  if (sortMode === 'alpha') {
    list.sort((a, b) => favFirst(a, b) || a.name.localeCompare(b.name, 'fa'));
  } else if (sortMode === 'used') {
    list.sort((a, b) => favFirst(a, b) || (stats[b.url] || 0) - (stats[a.url] || 0));
  } else {
    list.sort(favFirst);   // sort پایدار است ⇒ ترتیب tools.json حفظ می‌شود
  }
  return list;
}

function hasFilter() {
  return Boolean(query || activeCat !== 'all' || onlyFav || onlyFree);
}

function render(withAnim = true) {
  const tokens = tokensOf(query);
  const list = filteredList();
  grid.classList.toggle('anim', withAnim);
  grid.innerHTML = list.map((t, i) => cardHTML(t, i, tokens)).join('');
  empty.hidden = list.length > 0;

  const total = TOOLS.length;
  countEl.textContent = hasFilter()
    ? `${faNum(list.length)} از ${faNum(total)} ابزار`
    : `${faNum(total)} ابزار`;

  favFilterBtn.classList.toggle('active', onlyFav);
  favFilterBtn.setAttribute('aria-pressed', String(onlyFav));
  freeFilterBtn.classList.toggle('active', onlyFree);
  freeFilterBtn.setAttribute('aria-pressed', String(onlyFree));
  writeHash();
}

function renderChips() {
  const counts = {};
  let visibleTotal = 0;
  TOOLS.forEach(t => {
    if (onlyFav && !favorites.has(t.url)) return;
    if (onlyFree && t.free !== true) return;
    visibleTotal++;
    counts[t.cat] = (counts[t.cat] || 0) + 1;
    if (t.iranian && t.cat !== 'iranian') counts.iranian = (counts.iranian || 0) + 1;
  });
  const items = [['all', 'همه', visibleTotal],
    ...Object.entries(CATS)
      .map(([k, label]) => [k, label, counts[k] || 0])
      .filter(([, , n]) => n > 0)];
  chips.innerHTML = items.map(([k, label, n]) =>
    `<button class="chip ${k === activeCat ? 'active' : ''}" type="button" data-cat="${k}">
       ${esc(label)}<span class="n">${faNum(n)}</span>
     </button>`).join('');
}

function rememberOpen(url) {
  stats[url] = (stats[url] || 0) + 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

let toastTimer;
function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1800);
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (btn) {
    btn.classList.add('ok');
    btn.innerHTML = CHECK_SVG;
    setTimeout(() => {
      btn.classList.remove('ok');
      btn.innerHTML = COPY_SVG;
    }, 1200);
  }
  toast('لینک کپی شد');
}

/* ─────────────── رویدادها ─────────────── */
chips.addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  activeCat = btn.dataset.cat;
  renderChips();
  render();
});

/* ─────────────── دراپ‌داون مرتب‌سازی ─────────────── */
function applySortUI() {
  sortLabel.textContent = SORT_LABELS[sortMode];
  sortMenu.querySelectorAll('[role="option"]').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.sort === sortMode)));
}

function openSortMenu(focusFirst = false) {
  sortMenu.hidden = false;
  sortBox.classList.add('open');
  sortBtn.setAttribute('aria-expanded', 'true');
  if (focusFirst) sortMenu.querySelector('[aria-selected="true"]')?.focus();
}
function closeSortMenu(refocus = false) {
  if (sortMenu.hidden) return;
  sortMenu.hidden = true;
  sortBox.classList.remove('open');
  sortBtn.setAttribute('aria-expanded', 'false');
  if (refocus) sortBtn.focus();
}

sortBtn.addEventListener('click', () => {
  sortMenu.hidden ? openSortMenu() : closeSortMenu();
});
sortMenu.addEventListener('click', e => {
  const opt = e.target.closest('[role="option"]');
  if (!opt) return;
  sortMode = opt.dataset.sort;
  applySortUI();
  closeSortMenu(true);
  render();
});
document.addEventListener('click', e => {
  if (!sortBox.contains(e.target)) closeSortMenu();
});
sortBtn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openSortMenu(true);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    openSortMenu(true);
  }
});
sortMenu.addEventListener('keydown', e => {
  const opts = [...sortMenu.querySelectorAll('[role="option"]')];
  const i = opts.indexOf(document.activeElement);
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSortMenu(true);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    opts[Math.min(i + 1, opts.length - 1)]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (i <= 0) closeSortMenu(true);
    else opts[i - 1]?.focus();
  }
});

grid.addEventListener('click', e => {
  const star = e.target.closest('.star');
  if (star) {
    e.preventDefault();
    const url = star.dataset.url;
    favorites.has(url) ? favorites.delete(url) : favorites.add(url);
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
    renderChips();
    render(false);
    return;
  }
  const copy = e.target.closest('.copy');
  if (copy) {
    e.preventDefault();
    copyText(copy.dataset.copy, copy);
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) rememberOpen(open.dataset.open);
});

searchInput.addEventListener('input', () => {
  query = searchInput.value.trim();
  render();
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const first = grid.querySelector('a.card-main');
    if (first) {
      rememberOpen(first.href);
      window.open(first.href, '_blank', 'noopener');
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    const first = grid.querySelector('a.card-main');
    if (first) { e.preventDefault(); first.focus(); }
  }
});

/* ناوبری فلشی بین نتایج */
grid.addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const links = [...grid.querySelectorAll('a.card-main')];
  const i = links.indexOf(document.activeElement);
  if (i === -1) return;
  e.preventDefault();
  const next = links[i + (e.key === 'ArrowDown' ? 1 : -1)];
  if (next) next.focus();
  else if (e.key === 'ArrowUp') searchInput.focus();
  next?.scrollIntoView({ block: 'nearest' });
});

document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if ((e.key === '/' || ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))) && !typing) {
    e.preventDefault();
    closeSortMenu();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape') {
    if (!sortMenu.hidden) {
      closeSortMenu(true);
    } else if (document.activeElement === searchInput) {
      searchInput.value = ''; query = '';
      render();
      searchInput.blur();
    } else if (grid.contains(document.activeElement)) {
      searchInput.focus();
    }
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  searchInput.value = '';
  query = '';
  activeCat = 'all';
  onlyFav = false;
  onlyFree = false;
  sortMode = 'default';
  applySortUI();
  renderChips(); render();
  searchInput.focus();
});

favFilterBtn.addEventListener('click', () => {
  onlyFav = !onlyFav;
  if (onlyFav && activeCat !== 'all' && !TOOLS.some(t => inCat(t, activeCat) && favorites.has(t.url))) {
    activeCat = 'all';
  }
  renderChips();
  render();
});

freeFilterBtn.addEventListener('click', () => {
  onlyFree = !onlyFree;
  renderChips();
  render();
});

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  themeBtn.innerHTML = t === 'dark' ? SUN_SVG : MOON_SVG;
  themeBtn.title = t === 'dark' ? 'تم روشن' : 'تم تیره';
}
themeBtn.addEventListener('click', () =>
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
applyTheme(document.documentElement.dataset.theme || 'dark');

/* سایهٔ toolbar وقتی به بالا می‌چسبد */
const sentinel = document.getElementById('stickySentinel');
if (sentinel && 'IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => {
    toolbar.classList.toggle('stuck', !en.isIntersecting);
  }).observe(sentinel);
}

window.addEventListener('hashchange', () => {
  readHash();
  renderChips(); render(false);
});

/* ─────────────── PWA ─────────────── */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  });
}

async function boot() {
  applyData(window.SEO_DATA || { cats: [], tools: [] });
  try {
    const r = await fetch('tools.json', { cache: 'no-store' });
    if (r.ok) applyData(await r.json());
  } catch { /* file:// یا آفلاین: data.js */ }

  try {
    const r = await fetch('icons.json', { cache: 'no-store' });
    if (r.ok) {
      const pack = await r.json();
      if (pack.default) DEFAULT_ICON = pack.default;
    }
  } catch { /* بدون مانیفست آیکون: default.png */ }

  readHash();
  if (activeCat !== 'all' && !CATS[activeCat]) activeCat = 'all';
  renderChips(); render();
}

boot();
