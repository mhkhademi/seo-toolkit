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
let onlyNoVpn = false;
let onlyRial = false;
let sortMode = 'default';

let favorites = new Set(safeParse(localStorage.getItem(FAV_KEY), []));
let stats = safeParse(localStorage.getItem(STATS_KEY), {});

const grid = document.getElementById('grid');
const catBox = document.getElementById('catBox');
const catBtn = document.getElementById('catBtn');
const catMenu = document.getElementById('catMenu');
const catLabel = document.getElementById('catLabel');
const empty = document.getElementById('empty');
const searchInput = document.getElementById('search');
const countEl = document.getElementById('count');
const themeBtn = document.getElementById('themeToggle');
const favFilterBtn = document.getElementById('favFilter');
const freeFilterBtn = document.getElementById('freeFilter');
const noVpnFilterBtn = document.getElementById('noVpnFilter');
const rialFilterBtn = document.getElementById('rialFilter');
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
  if (onlyNoVpn && t.no_vpn !== true) return false;
  if (onlyRial && t.payment !== 'rial' && !t.iranian) return false;
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
  onlyNoVpn = p.get('vpn') === '1';
  onlyRial = p.get('rial') === '1';
  sortMode = ['default', 'alpha', 'used'].includes(p.get('sort')) ? p.get('sort') : 'default';
  if (p.get('tab') === 'tools') switchMainTab('tools'); else if (p.get('tab') === 'directory') switchMainTab('directory');
  searchInput.value = query;
  applySortUI();
}

function writeHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (activeCat !== 'all') p.set('cat', activeCat); else p.delete('cat');
  if (query) p.set('q', query); else p.delete('q');
  if (onlyFav) p.set('fav', '1'); else p.delete('fav');
  if (onlyFree) p.set('free', '1'); else p.delete('free');
  if (onlyNoVpn) p.set('vpn', '1'); else p.delete('vpn');
  if (onlyRial) p.set('rial', '1'); else p.delete('rial');
  if (sortMode !== 'default') p.set('sort', sortMode); else p.delete('sort');
  const next = p.toString() ? '#' + p.toString() : location.pathname + location.search;
  if ((location.hash || location.pathname + location.search) !== next) {
    history.replaceState(null, '', next);
  }
}

function cardHTML(t, i, tokens) {
  const isFav = favorites.has(t.url);
  const isFeatured = Boolean(t.featured || t.sponsored);
  const catLabel = CATS[t.cat] || '';
  const chain = iconChain(t);
  const targetUrl = t.affiliate_url ? t.affiliate_url : t.url;

  let badges = '';
  if (isFeatured) {
    badges += `<span class="badge badge-sponsored" title="ابزار ویژه و پیشنهادی دایرکتوری">⭐ ویژه</span>`;
  }
  if (t.no_vpn) {
    badges += `<span class="badge badge-vpn" title="بدون نیاز به قندشکن">⚡ بدون VPN</span>`;
  }
  if (t.payment === 'rial' || t.iranian) {
    badges += `<span class="badge badge-rial" title="پشتیبانی از کارت‌های بانکی شتاب">💳 ریالی</span>`;
  }
  if (t.discount_code) {
    badges += `<button class="badge badge-discount copy-code" type="button" data-code="${esc(t.discount_code)}" title="کپی کد تخفیف">🎁 ${esc(t.discount_code)}</button>`;
  }
  if (t._userSubmitted) {
    badges += `<span class="badge badge-custom-user" title="این ابزار توسط شما پیشنهاد و ثبت شده است">🔖 پیشنهادی شما</span>`;
  }

  return `
  <article class="card ${isFav ? 'fav' : ''} ${isFeatured ? 'featured' : ''}" style="--c:${esc(t.color)}; animation-delay:${Math.min(i * 22, 400)}ms">
    <div class="card-actions">
      <button class="icon-mini copy" type="button" data-copy="${esc(targetUrl)}" title="کپی لینک" aria-label="کپی لینک">${COPY_SVG}</button>
      <button class="star ${isFav ? 'on' : ''}" type="button" data-url="${esc(t.url)}"
              title="${isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}"
              aria-label="علاقه‌مندی" aria-pressed="${isFav}">${STAR_SVG}</button>
    </div>
    <a class="card-main" href="${esc(targetUrl)}" target="_blank" rel="noopener noreferrer" data-open="${esc(t.url)}">
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
          ${badges}
        </div>
      </div>
    </a>
  </article>`;
}

function filteredList() {
  const tokens = tokensOf(query);
  const list = TOOLS.filter(t => toolMatches(t, tokens));
  const favFirst = (a, b) => Number(favorites.has(b.url)) - Number(favorites.has(a.url));
  const featuredFirst = (a, b) => Number(Boolean(b.featured || b.sponsored)) - Number(Boolean(a.featured || a.sponsored));
  if (sortMode === 'alpha') {
    list.sort((a, b) => favFirst(a, b) || featuredFirst(a, b) || a.name.localeCompare(b.name, 'fa'));
  } else if (sortMode === 'used') {
    list.sort((a, b) => favFirst(a, b) || featuredFirst(a, b) || (stats[b.url] || 0) - (stats[a.url] || 0));
  } else {
    list.sort((a, b) => favFirst(a, b) || featuredFirst(a, b));
  }
  return list;
}

function hasFilter() {
  return Boolean(query || activeCat !== 'all' || onlyFav || onlyFree || onlyNoVpn || onlyRial);
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
  noVpnFilterBtn?.classList.toggle('active', onlyNoVpn);
  noVpnFilterBtn?.setAttribute('aria-pressed', String(onlyNoVpn));
  rialFilterBtn?.classList.toggle('active', onlyRial);
  rialFilterBtn?.setAttribute('aria-pressed', String(onlyRial));
  writeHash();
}

function renderCategories() {
  const counts = {};
  let visibleTotal = 0;
  TOOLS.forEach(t => {
    if (onlyFav && !favorites.has(t.url)) return;
    if (onlyFree && t.free !== true) return;
    if (onlyNoVpn && t.no_vpn !== true) return;
    if (onlyRial && t.payment !== 'rial' && !t.iranian) return;
    visibleTotal++;
    counts[t.cat] = (counts[t.cat] || 0) + 1;
    if (t.iranian && t.cat !== 'iranian') counts.iranian = (counts.iranian || 0) + 1;
  });

  const activeLabel = activeCat === 'all' ? 'همه دسته‌ها' : (CATS[activeCat] || 'دسته‌بندی');
  const activeCount = activeCat === 'all' ? visibleTotal : (counts[activeCat] || 0);
  catLabel.textContent = `${activeLabel} (${faNum(activeCount)})`;
  catBtn.classList.toggle('active', activeCat !== 'all');

  const items = [['all', 'همه ابزارها', visibleTotal],
    ...Object.entries(CATS)
      .map(([k, label]) => [k, label, counts[k] || 0])
      .filter(([, , n]) => n > 0)];

  catMenu.innerHTML = items.map(([k, label, n]) => `
    <button type="button" role="option" data-cat="${k}" aria-selected="${k === activeCat}">
      <span class="cat-opt-main">
        <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/></svg>
        <span class="cat-opt-title">${esc(label)}</span>
      </span>
      <span class="cat-count">${faNum(n)}</span>
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




/* ───────────────────────────── سیستم دراپ‌داون سفارشی سراسری (Custom Select) ───────────────────────────── */
function initCustomSelects(root = document) {
  const selects = root.querySelectorAll('select:not([data-custom-enhanced])');
  selects.forEach(selectEl => setupCustomSelect(selectEl));
}

function setupCustomSelect(selectEl) {
  if (!selectEl || selectEl.dataset.customEnhanced) return;
  selectEl.dataset.customEnhanced = 'true';
  selectEl.classList.add('enhanced-hidden');

  const box = document.createElement('div');
  box.className = 'custom-select-box';
  if (selectEl.id) box.dataset.selectId = selectEl.id;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const labelSpan = document.createElement('span');
  labelSpan.className = 'custom-select-label';

  const chevronSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevronSvg.setAttribute('class', 'custom-select-arrow');
  chevronSvg.setAttribute('viewBox', '0 0 24 24');
  chevronSvg.setAttribute('fill', 'none');
  chevronSvg.setAttribute('stroke', 'currentColor');
  chevronSvg.setAttribute('stroke-width', '2');
  chevronSvg.setAttribute('stroke-linecap', 'round');
  chevronSvg.setAttribute('stroke-linejoin', 'round');
  chevronSvg.setAttribute('aria-hidden', 'true');
  chevronSvg.innerHTML = '<path d="m6 9 6 6 6-6"/>';

  btn.appendChild(labelSpan);
  btn.appendChild(chevronSvg);
  box.appendChild(btn);

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  box.appendChild(menu);

  function syncUIFromSelect() {
    const curVal = selectEl.value;
    let foundLabel = '';
    const optionBtns = menu.querySelectorAll('[role="option"]');
    optionBtns.forEach(btnEl => {
      const isSel = btnEl.dataset.value === curVal;
      btnEl.setAttribute('aria-selected', String(isSel));
      if (isSel) {
        foundLabel = btnEl.querySelector('.custom-opt-text')?.textContent || '';
      }
    });
    if (!foundLabel && selectEl.options.length) {
      foundLabel = selectEl.options[selectEl.selectedIndex]?.textContent || selectEl.options[0]?.textContent || '';
    }
    labelSpan.textContent = foundLabel;
  }

  function renderOptions() {
    menu.innerHTML = '';
    Array.from(selectEl.options).forEach((opt, idx) => {
      const isSel = opt.value === selectEl.value || (!selectEl.value && idx === 0);
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.setAttribute('role', 'option');
      optBtn.dataset.value = opt.value;
      optBtn.setAttribute('aria-selected', String(isSel));

      optBtn.innerHTML = `
        <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/></svg>
        <span class="custom-opt-text">${escapeHtml(opt.textContent)}</span>
      `;

      optBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEl.value = opt.value;
        syncUIFromSelect();
        closeMenu(true);
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));
      });

      menu.appendChild(optBtn);
    });
    syncUIFromSelect();
  }

  function openMenu(focusSelected = false) {
    closeAllCustomSelects();
    if (typeof closeCatMenu === 'function') closeCatMenu();
    if (typeof closeSortMenu === 'function') closeSortMenu();

    // Check space below vs above
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 220 && rect.top > 220) {
      menu.style.top = 'auto';
      menu.style.bottom = 'calc(100% + 6px)';
    } else {
      menu.style.bottom = 'auto';
      menu.style.top = 'calc(100% + 6px)';
    }

    menu.hidden = false;
    box.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    if (focusSelected) {
      const sel = menu.querySelector('[aria-selected="true"]');
      if (sel) sel.focus();
    }
  }

  function closeMenu(refocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    box.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden ? openMenu() : closeMenu();
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(true);
    }
  });

  menu.addEventListener('keydown', (e) => {
    const opts = [...menu.querySelectorAll('[role="option"]')];
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      opts[Math.min(i + 1, opts.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i <= 0) closeMenu(true);
      else opts[i - 1]?.focus();
    }
  });

  selectEl.addEventListener('change', syncUIFromSelect);

  if (selectEl.form) {
    selectEl.form.addEventListener('reset', () => {
      setTimeout(syncUIFromSelect, 0);
    });
  }

  if (selectEl.id) {
    const lbl = document.querySelector(`label[for="${selectEl.id}"]`);
    if (lbl) {
      lbl.addEventListener('click', (e) => {
        e.preventDefault();
        btn.focus();
        openMenu(true);
      });
    }
  }

  renderOptions();
  selectEl.parentNode.insertBefore(box, selectEl.nextSibling);
  box.appendChild(selectEl);
}

function closeAllCustomSelects() {
  document.querySelectorAll('.custom-select-box.open').forEach(box => {
    box.classList.remove('open');
    const m = box.querySelector('.custom-select-menu');
    const b = box.querySelector('.custom-select-btn');
    if (m) m.hidden = true;
    if (b) b.setAttribute('aria-expanded', 'false');
  });
}

/* ─────────────── دراپ‌داون دسته‌بندی ─────────────── */
function openCatMenu(focusFirst = false) {
  closeSortMenu();
  closeAllCustomSelects();
  catMenu.hidden = false;
  catBox.classList.add('open');
  catBtn.setAttribute('aria-expanded', 'true');
  if (focusFirst) catMenu.querySelector('[aria-selected="true"]')?.focus();
}
function closeCatMenu(refocus = false) {
  if (catMenu.hidden) return;
  catMenu.hidden = true;
  catBox.classList.remove('open');
  catBtn.setAttribute('aria-expanded', 'false');
  if (refocus) catBtn.focus();
}

catBtn.addEventListener('click', () => {
  catMenu.hidden ? openCatMenu() : closeCatMenu();
});
catMenu.addEventListener('click', e => {
  const opt = e.target.closest('[role="option"]');
  if (!opt) return;
  activeCat = opt.dataset.cat;
  closeCatMenu(true);
  renderCategories();
  render();
});
document.addEventListener('click', e => {
  if (!catBox.contains(e.target)) closeCatMenu();
  if (!e.target.closest('.custom-select-box')) closeAllCustomSelects();
});
catBtn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openCatMenu(true);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    openCatMenu(true);
  }
});
catMenu.addEventListener('keydown', e => {
  const opts = [...catMenu.querySelectorAll('[role="option"]')];
  const i = opts.indexOf(document.activeElement);
  if (e.key === 'Escape') {
    e.preventDefault();
    closeCatMenu(true);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    opts[Math.min(i + 1, opts.length - 1)]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (i <= 0) closeCatMenu(true);
    else opts[i - 1]?.focus();
  }
});

/* ─────────────── دراپ‌داون مرتب‌سازی ─────────────── */
function applySortUI() {
  sortLabel.textContent = SORT_LABELS[sortMode];
  sortMenu.querySelectorAll('[role="option"]').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.sort === sortMode)));
}

function openSortMenu(focusFirst = false) {
  closeCatMenu();
  closeAllCustomSelects();
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
  const codeBtn = e.target.closest('.copy-code');
  if (codeBtn) {
    e.preventDefault();
    e.stopPropagation();
    copyText(codeBtn.dataset.code, codeBtn);
    toast(`کد تخفیف «${codeBtn.dataset.code}» کپی شد`);
    return;
  }
  const star = e.target.closest('.star');
  if (star) {
    e.preventDefault();
    const url = star.dataset.url;
    favorites.has(url) ? favorites.delete(url) : favorites.add(url);
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
    renderCategories();
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
  onlyNoVpn = false;
  onlyRial = false;
  sortMode = 'default';
  applySortUI();
  renderCategories(); render();
  searchInput.focus();
});

favFilterBtn.addEventListener('click', () => {
  onlyFav = !onlyFav;
  if (onlyFav && activeCat !== 'all' && !TOOLS.some(t => inCat(t, activeCat) && favorites.has(t.url))) {
    activeCat = 'all';
  }
  renderCategories();
  render();
});

freeFilterBtn.addEventListener('click', () => {
  onlyFree = !onlyFree;
  renderCategories();
  render();
});

noVpnFilterBtn?.addEventListener('click', () => {
  onlyNoVpn = !onlyNoVpn;
  renderCategories();
  render();
});

rialFilterBtn?.addEventListener('click', () => {
  onlyRial = !onlyRial;
  renderCategories();
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
  renderCategories(); render(false);
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
    const r = await fetch('data/tools.json', { cache: 'no-store' });
    if (r.ok) applyData(await r.json());
  } catch { /* file:// یا آفلاین: data/data.js */ }

  try {
    const r = await fetch('data/icons.json', { cache: 'no-store' });
    if (r.ok) {
      const pack = await r.json();
      if (pack.default) DEFAULT_ICON = pack.default;
    }
  } catch { /* بدون مانیفست آیکون: default.png */ }

  readHash();
  if (activeCat !== 'all' && !CATS[activeCat]) activeCat = 'all';
  renderCategories(); render();
}

boot();


/* ───────────────────────────── مدیریت تب‌ها و ابزارهای آنلاین ───────────────────────────── */
const tabDirBtn = document.getElementById('tabDirBtn');
const tabToolsBtn = document.getElementById('tabToolsBtn');
const directoryView = document.getElementById('directoryView');
const toolsView = document.getElementById('toolsView');
const footerShortcuts = document.getElementById('footerShortcuts');

function switchMainTab(tab) {
  const isTools = tab === 'tools';
  tabDirBtn?.classList.toggle('active', !isTools);
  tabDirBtn?.setAttribute('aria-selected', String(!isTools));
  tabToolsBtn?.classList.toggle('active', isTools);
  tabToolsBtn?.setAttribute('aria-selected', String(isTools));
  
  if (directoryView) directoryView.hidden = isTools;
  if (toolsView) toolsView.hidden = !isTools;
  if (footerShortcuts) footerShortcuts.hidden = isTools;

  // همگام‌سازی هش URL بدون پاک کردن سایر فیلترها و پارامترها
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (isTools) {
    p.set('tab', 'tools');
  } else {
    p.delete('tab');
    p.delete('tool');
  }
  const next = p.toString() ? '#' + p.toString() : location.pathname + location.search;
  if ((location.hash || location.pathname + location.search) !== next) {
    history.replaceState(null, '', next);
  }
}

tabDirBtn?.addEventListener('click', () => switchMainTab('directory'));
tabToolsBtn?.addEventListener('click', () => switchMainTab('tools'));

// کلیک روی برند/لوگوی هدر برای هدایت نرم به صفحه اصلی دایرکتوری (بدون رفرش شبکه)
document.querySelector('.brand')?.addEventListener('click', (e) => {
  e.preventDefault();
  switchMainTab('directory');
  if (activeCat !== 'all') {
    activeCat = 'all';
    applyCatUI();
    renderCategories();
  }
  if (query && searchInput) {
    searchInput.value = '';
    query = '';
  }
  onlyFav = false;
  onlyFree = false;
  onlyNoVpn = false;
  onlyRial = false;
  sortMode = 'default';
  applySortUI();
  render(false);
  if (location.hash) {
    history.pushState(null, '', location.pathname);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// بررسی تب اولیه در زمان بارگذاری از روی هش
function checkInitialTab() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (p.get('tab') === 'tools') {
    switchMainTab('tools');
    if (p.get('tool') === 'schema') {
      switchSubtool('schema');
    } else if (p.get('tool') === 'robots') {
      switchSubtool('robots');
    } else if (p.get('tool') === 'sitemap') {
      switchSubtool('sitemap');
    } else if (p.get('tool') === 'content') {
      switchSubtool('content');
    } else if (p.get('tool') === 'utm') {
      switchSubtool('utm');
    } else if (p.get('tool') === 'redirect') {
      switchSubtool('redirect');
    } else if (p.get('tool') === 'keyword-mixer') {
      switchSubtool('keyword-mixer');
    } else if (p.get('tool') === 'social') {
      switchSubtool('social');
    } else if (p.get('tool') === 'checklist') {
      switchSubtool('checklist');
    }
  }
}

/* ───────────────────────────── شبیه‌ساز نتایج گوگل (Google SERP Simulator) ───────────────────────────── */
const serpSiteName = document.getElementById('serpSiteName');
const serpUrl = document.getElementById('serpUrl');
const serpTitle = document.getElementById('serpTitle');
const serpDesc = document.getElementById('serpDesc');

const previewSiteName = document.getElementById('previewSiteName');
const previewBreadcrumb = document.getElementById('previewBreadcrumb');
const previewTitle = document.getElementById('previewTitle');
const previewDesc = document.getElementById('previewDesc');
const previewDate = document.getElementById('previewDate');

const titleCounter = document.getElementById('titleCounter');
const titleMeter = document.getElementById('titleMeter');
const titleHint = document.getElementById('titleHint');
const descCounter = document.getElementById('descCounter');
const descMeter = document.getElementById('descMeter');
const descHint = document.getElementById('descHint');
const htmlCodeOutput = document.getElementById('htmlCodeOutput');

const googleBox = document.getElementById('googleBox');
const desktopViewBtn = document.getElementById('desktopViewBtn');
const mobileViewBtn = document.getElementById('mobileViewBtn');
const serpSampleBtn = document.getElementById('serpSampleBtn');
const serpCopyCodeBtn = document.getElementById('serpCopyCodeBtn');
const copySnippetBtn = document.getElementById('copySnippetBtn');

// ایجاد کانواس مخفی برای سنجش دقیق پیکسل فونت گوگل
const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');
function getPixelWidth(text, font = '19px Vazirmatn, sans-serif') {
  if (!text) return 0;
  measureCtx.font = font;
  return Math.round(measureCtx.measureText(text).width);
}

// فرمت بردکرامب استاندارد گوگل از روی URL
function formatBreadcrumb(rawUrl) {
  if (!rawUrl) return 'https://example.com';
  try {
    let u = rawUrl.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    const parsed = new URL(u);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (!parts.length) return parsed.origin;
    return parsed.origin + ' › ' + parts.join(' › ');
  } catch {
    return rawUrl;
  }
}

function updateSerpSimulation() {
  if (!serpTitle || !previewTitle) return;

  const titleVal = serpTitle.value.trim() || 'عنوان صفحه خود را وارد کنید...';
  const descVal = serpDesc.value.trim() || 'توضیحات متای خود را وارد کنید تا پیش‌نمایش آن در نتایج سرچ گوگل رندر شود...';
  const siteVal = serpSiteName.value.trim() || 'نام سایت';
  const urlVal = serpUrl.value.trim() || 'https://example.com';

  // اندازه‌گیری پیکسل و کاراکتر
  const titleLen = serpTitle.value.length;
  const titlePx = getPixelWidth(serpTitle.value);
  const descLen = serpDesc.value.length;

  // ۱. آپدیت هدر سایت و آدرس
  previewSiteName.textContent = siteVal;
  previewBreadcrumb.textContent = formatBreadcrumb(urlVal);

  // ۲. مدیریت طول و برش عنوان در دسکتاپ (حدود ۵۸۰ پیکسل)
  titleCounter.textContent = `${faNum(titleLen)} از ۶۰ کاراکتر · ${faNum(titlePx)} پیکسل`;
  const titlePct = Math.min(Math.round((titlePx / 580) * 100), 100);
  titleMeter.style.width = `${titlePct}%`;

  if (titleLen === 0) {
    titleCounter.className = 'counter-badge';
    titleMeter.style.background = 'var(--muted)';
    titleHint.textContent = 'عنوان تگ Title تاثیرگذارترین فاکتور سئو داخلی و نرخ کلیک است.';
    previewTitle.textContent = titleVal;
  } else if (titlePx <= 580 && titleLen <= 60) {
    titleCounter.className = 'counter-badge ok';
    titleMeter.style.background = 'var(--ok)';
    titleHint.textContent = 'طول عنوان عالی است! بدون برش در نتایج گوگل دسکتاپ و موبایل نمایش داده می‌شود.';
    previewTitle.textContent = titleVal;
  } else if (titlePx <= 620) {
    titleCounter.className = 'counter-badge warn';
    titleMeter.style.background = '#fbbf24';
    titleHint.textContent = 'عنوان کمی طولانی است و ممکن است در برخی مانیتورها کلمات انتهایی بریده شوند.';
    previewTitle.textContent = titleVal;
  } else {
    titleCounter.className = 'counter-badge danger';
    titleMeter.style.background = '#f43f5e';
    titleHint.textContent = 'هشدار: عنوان بیش از حد مجاز گوگل است و در نتایج با سه نقطه (...) بریده می‌شود!';
    // شبیه‌سازی برش گوگل
    let truncated = titleVal;
    while (truncated.length > 5 && getPixelWidth(truncated + ' ...') > 580) {
      truncated = truncated.slice(0, -1).trim();
    }
    previewTitle.textContent = truncated + ' ...';
  }

  // ۳. مدیریت توضیحات متا (حدود ۱۶۰ کاراکتر)
  descCounter.textContent = `${faNum(descLen)} از ۱۶۰ کاراکتر`;
  const descPct = Math.min(Math.round((descLen / 160) * 100), 100);
  descMeter.style.width = `${descPct}%`;

  if (descLen === 0) {
    descCounter.className = 'counter-badge';
    descMeter.style.background = 'var(--muted)';
    descHint.textContent = 'یک خلاصه جذاب از صفحه بنویسید تا کاربر مشتاق کلیک شود.';
    previewDesc.textContent = descVal;
  } else if (descLen < 110) {
    descCounter.className = 'counter-badge warn';
    descMeter.style.background = '#fbbf24';
    descHint.textContent = 'توضیحات کمی کوتاه است؛ پیشنهاد می‌شود بین ۱۲۰ تا ۱۶۰ کاراکتر بنویسید.';
    previewDesc.textContent = descVal;
  } else if (descLen <= 160) {
    descCounter.className = 'counter-badge ok';
    descMeter.style.background = 'var(--ok)';
    descHint.textContent = 'طول توضیحات استاندارد و مناسب است.';
    previewDesc.textContent = descVal;
  } else {
    descCounter.className = 'counter-badge danger';
    descMeter.style.background = '#f43f5e';
    descHint.textContent = 'توضیحات طولانی‌تر از سقف استاندارد گوگل است و انتهای آن بریده خواهد شد.';
    previewDesc.textContent = descVal.slice(0, 156) + ' ...';
  }

  // ۴. تاریخ
  const dateRadio = document.querySelector('input[name="serpDate"]:checked');
  if (dateRadio && dateRadio.value === 'today') {
    previewDate.hidden = false;
    previewDate.textContent = new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }) + ' — ';
  } else {
    previewDate.hidden = true;
  }

  // ۵. تولید خروجی کدهای HTML
  const cleanTitle = (serpTitle.value || '').replace(/"/g, '&quot;');
  const cleanDesc = (serpDesc.value || '').replace(/"/g, '&quot;');
  const cleanUrl = serpUrl.value.trim();
  htmlCodeOutput.textContent = `<title>${cleanTitle}</title>\n<meta name="description" content="${cleanDesc}">\n<link rel="canonical" href="${cleanUrl}">`;
}

// گوش دادن به ورودی‌ها
[serpSiteName, serpUrl, serpTitle, serpDesc].forEach(el => {
  el?.addEventListener('input', updateSerpSimulation);
});
document.querySelectorAll('input[name="serpDate"]').forEach(el => {
  el.addEventListener('change', updateSerpSimulation);
});

// سوئیچ دسکتاپ و موبایل
desktopViewBtn?.addEventListener('click', () => {
  desktopViewBtn.classList.add('active');
  mobileViewBtn.classList.remove('active');
  googleBox.classList.remove('mobile');
  googleBox.classList.add('desktop');
});
mobileViewBtn?.addEventListener('click', () => {
  mobileViewBtn.classList.add('active');
  desktopViewBtn.classList.remove('active');
  googleBox.classList.remove('desktop');
  googleBox.classList.add('mobile');
});

// بارگذاری نمونه تستی آماده
serpSampleBtn?.addEventListener('click', () => {
  serpSiteName.value = 'جعبه‌ابزار سئو';
  serpUrl.value = 'https://seo.mhkhademi87.ir/tools/rankfind';
  serpTitle.value = 'رنک فایند چیست؟ بررسی امکانات، قیمت و رتبه‌یاب سئو';
  serpDesc.value = 'بررسی تخصصی ابزار ایرانی رنک فایند؛ رصد رتبه کلمات کلیدی، تحلیل کیورد گپ رقبا و شبیه‌ساز سرچ کنسول با کدهای تخفیف اختصاصی.';
  updateSerpSimulation();
  toast('نمونه آماده بارگذاری شد');
});

// کپی کدهای HTML
function copyHtmlSnippet() {
  const code = htmlCodeOutput.textContent;
  copyText(code);
  toast('تگ‌های متا HTML کپی شد');
}
serpCopyCodeBtn?.addEventListener('click', copyHtmlSnippet);
copySnippetBtn?.addEventListener('click', copyHtmlSnippet);




/* ───────────────────────────── ناوبری زیرابزارهای آنلاین سئو ───────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const subtabSerpBtn = document.getElementById('subtabSerpBtn');
const subtabSchemaBtn = document.getElementById('subtabSchemaBtn');
const subtabRobotsBtn = document.getElementById('subtabRobotsBtn');
const subtabSitemapBtn = document.getElementById('subtabSitemapBtn');
const subtabContentBtn = document.getElementById('subtabContentBtn');
const subtabUtmBtn = document.getElementById('subtabUtmBtn');
const subtoolSerp = document.getElementById('subtoolSerp');
const subtoolSchema = document.getElementById('subtoolSchema');
const subtoolRobots = document.getElementById('subtoolRobots');
const subtoolSitemap = document.getElementById('subtoolSitemap');
const subtoolContent = document.getElementById('subtoolContent');
const subtoolUtm = document.getElementById('subtoolUtm');
const subtabRedirectBtn = document.getElementById('subtabRedirectBtn');
const subtabKeywordMixerBtn = document.getElementById('subtabKeywordMixerBtn');
const subtabSocialBtn = document.getElementById('subtabSocialBtn');
const subtabChecklistBtn = document.getElementById('subtabChecklistBtn');
const subtoolRedirect = document.getElementById('subtoolRedirect');
const subtoolKeywordMixer = document.getElementById('subtoolKeywordMixer');
const subtoolSocial = document.getElementById('subtoolSocial');
const subtoolChecklist = document.getElementById('subtoolChecklist');

function switchSubtool(tool) {
  const isSerp = tool === 'serp';
  const isSchema = tool === 'schema';
  const isRobots = tool === 'robots';
  const isSitemap = tool === 'sitemap';
  const isContent = tool === 'content';
  const isUtm = tool === 'utm';
  const isRedirect = tool === 'redirect';
  const isKeywordMixer = tool === 'keyword-mixer';
  const isSocial = tool === 'social';
  const isChecklist = tool === 'checklist';

  subtabSerpBtn?.classList.toggle('active', isSerp);
  subtabSerpBtn?.setAttribute('aria-selected', String(isSerp));
  subtabSchemaBtn?.classList.toggle('active', isSchema);
  subtabSchemaBtn?.setAttribute('aria-selected', String(isSchema));
  subtabRobotsBtn?.classList.toggle('active', isRobots);
  subtabRobotsBtn?.setAttribute('aria-selected', String(isRobots));
  subtabSitemapBtn?.classList.toggle('active', isSitemap);
  subtabSitemapBtn?.setAttribute('aria-selected', String(isSitemap));
  subtabContentBtn?.classList.toggle('active', isContent);
  subtabContentBtn?.setAttribute('aria-selected', String(isContent));
  subtabUtmBtn?.classList.toggle('active', isUtm);
  subtabUtmBtn?.setAttribute('aria-selected', String(isUtm));
  subtabRedirectBtn?.classList.toggle('active', isRedirect);
  subtabRedirectBtn?.setAttribute('aria-selected', String(isRedirect));
  subtabKeywordMixerBtn?.classList.toggle('active', isKeywordMixer);
  subtabKeywordMixerBtn?.setAttribute('aria-selected', String(isKeywordMixer));
  subtabSocialBtn?.classList.toggle('active', isSocial);
  subtabSocialBtn?.setAttribute('aria-selected', String(isSocial));
  subtabChecklistBtn?.classList.toggle('active', isChecklist);
  subtabChecklistBtn?.setAttribute('aria-selected', String(isChecklist));

  if (subtoolSerp) subtoolSerp.hidden = !isSerp;
  if (subtoolSchema) subtoolSchema.hidden = !isSchema;
  if (subtoolRobots) subtoolRobots.hidden = !isRobots;
  if (subtoolSitemap) subtoolSitemap.hidden = !isSitemap;
  if (subtoolContent) subtoolContent.hidden = !isContent;
  if (subtoolUtm) subtoolUtm.hidden = !isUtm;
  if (subtoolRedirect) subtoolRedirect.hidden = !isRedirect;
  if (subtoolKeywordMixer) subtoolKeywordMixer.hidden = !isKeywordMixer;
  if (subtoolSocial) subtoolSocial.hidden = !isSocial;
  if (subtoolChecklist) subtoolChecklist.hidden = !isChecklist;

  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  p.set('tab', 'tools');
  p.set('tool', tool);
  history.replaceState(null, '', '#' + p.toString());

  if (isSchema && typeof renderSchemaForm === 'function') {
    renderSchemaForm();
  }
  if (isRobots && typeof renderRobotsRules === 'function') {
    renderRobotsRules();
  }
  if (isSitemap && typeof updateSitemapOutput === 'function') {
    updateSitemapOutput();
  }
  if (isContent && typeof updateContentAnalysis === 'function') {
    updateContentAnalysis();
  }
  if (isUtm && typeof updateUtmOutput === 'function') {
    updateUtmOutput();
  }
  if (isRedirect && typeof updateRedirectOutput === 'function') {
    updateRedirectOutput();
  }
  if (isKeywordMixer && typeof updateKeywordMixerOutput === 'function') {
    updateKeywordMixerOutput();
  }
  if (isSocial && typeof updateSocialPreview === 'function') {
    updateSocialPreview();
  }
  if (isChecklist && typeof renderChecklist === 'function') {
    renderChecklist();
  }
}

subtabSerpBtn?.addEventListener('click', () => switchSubtool('serp'));
subtabSchemaBtn?.addEventListener('click', () => switchSubtool('schema'));
subtabRobotsBtn?.addEventListener('click', () => switchSubtool('robots'));
subtabSitemapBtn?.addEventListener('click', () => switchSubtool('sitemap'));
subtabContentBtn?.addEventListener('click', () => switchSubtool('content'));
subtabUtmBtn?.addEventListener('click', () => switchSubtool('utm'));
subtabRedirectBtn?.addEventListener('click', () => switchSubtool('redirect'));
subtabKeywordMixerBtn?.addEventListener('click', () => switchSubtool('keyword-mixer'));
subtabSocialBtn?.addEventListener('click', () => switchSubtool('social'));
subtabChecklistBtn?.addEventListener('click', () => switchSubtool('checklist'));

/* ───────────────────────────── اسکیما ساز تعاملی JSON-LD (Schema Builder) ───────────────────────────── */
const schemaFieldsContainer = document.getElementById('schemaFieldsContainer');
const schemaCodeOutput = document.getElementById('schemaCodeOutput');
const schemaStats = document.getElementById('schemaStats');
const schemaSampleBtn = document.getElementById('schemaSampleBtn');
const schemaResetBtn = document.getElementById('schemaResetBtn');
const schemaCopyBtn = document.getElementById('schemaCopyBtn');
const schemaTestGoogleBtn = document.getElementById('schemaTestGoogleBtn');

let activeSchemaType = 'faq';

// دیتای فعلی فرم‌ها
const schemaStore = {
  faq: [
    { q: 'سئو چیست و چقدر زمان می‌برد تا به نتیجه برسد؟', a: 'سئو (بهینه‌سازی موتورهای جستجو) فرایندی بلندمدت است و معمولاً بین ۳ الی ۶ ماه زمان می‌برد تا نتایج آن در رتبه‌بندی کلمات کلیدی رقابتی نمایان شوند.' },
    { q: 'آیا استفاده از اسکیما مارک‌آپ در نتایج گوگل موثر است؟', a: 'بله، اسکیما با ایجاد نتایج ویژه (Rich Snippets) مانند پرسش و پاسخ، ستاره‌ها و اطلاعات تکمیلی، نرخ کلیک (CTR) کاربران را به طور چشمگیری افزایش می‌دهد.' }
  ],
  article: {
    subType: 'BlogPosting',
    headline: 'راهنمای جامع اسکیما مارک‌آپ و داده‌های ساختاریافته در ۲۰۲۶',
    description: 'چگونه با پیاده‌سازی اصولی کدهای ساختاریافته JSON-LD در وب‌سایت، در نتایج سرچ گوگل نتایج ویژه (Rich Results) به دست آوریم؟',
    url: 'https://seo.mhkhademi87.ir/blog/schema-markup-guide',
    image: 'https://seo.mhkhademi87.ir/assets/schema-guide.jpg',
    authorName: 'محمد حسین خادمی',
    authorType: 'Person',
    publisherName: 'جعبه‌ابزار سئو',
    publisherLogo: 'https://seo.mhkhademi87.ir/icon-192.png',
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0]
  },
  local: {
    subType: 'LocalBusiness',
    name: 'آژانس دیجیتال مارکتینگ و سئو نوین',
    url: 'https://example.com',
    telephone: '+982188776655',
    image: 'https://example.com/office.jpg',
    priceRange: '$$',
    street: 'خیابان ولیعصر، نرسیده به میدان ونک، برج نگین، طبقه ۵',
    city: 'تهران',
    region: 'تهران',
    postalCode: '1969712345',
    country: 'IR'
  },
  breadcrumb: [
    { name: 'صفحه اصلی', url: 'https://seo.mhkhademi87.ir' },
    { name: 'ابزارهای آنلاین سئو', url: 'https://seo.mhkhademi87.ir/#tab=tools' },
    { name: 'اسکیما ساز JSON-LD', url: 'https://seo.mhkhademi87.ir/#tab=tools&tool=schema' }
  ],
  howto: {
    name: 'نحوه ثبت نقشه سایت (Sitemap) در گوگل سرچ کنسول',
    description: 'آموزش گام‌به‌گام ارسال و ایندکس سریع آدرس صفحات سایت در سرچ کنسول گوگل.',
    totalTime: 'PT10M',
    steps: [
      { name: 'ورود به سرچ کنسول', text: 'وارد پنل مدیریت دامنه خود در گوگل سرچ کنسول شوید.' },
      { name: 'مراجعه به بخش Sitemaps', text: 'از منوی سمت چپ پنل روی گزینه Sitemaps کلیک کنید.' },
      { name: 'ارسال آدرس سایت‌مپ', text: 'در کادر Add a new sitemap عبارت sitemap.xml را تایپ کرده و Submit را بزنید.' }
    ]
  }
};

// رندر فرم بر اساس نوع اسکیما
function renderSchemaForm() {
  if (!schemaFieldsContainer) return;

  if (activeSchemaType === 'faq') {
    renderFaqForm();
  } else if (activeSchemaType === 'article') {
    renderArticleForm();
  } else if (activeSchemaType === 'local') {
    renderLocalForm();
  } else if (activeSchemaType === 'breadcrumb') {
    renderBreadcrumbForm();
  } else if (activeSchemaType === 'howto') {
    renderHowToForm();
  }

  initCustomSelects(schemaFieldsContainer);
  updateSchemaOutput();
}

// ۱. فرم FAQ
function renderFaqForm() {
  const items = schemaStore.faq;
  let html = '<div class="schema-items-list">';
  items.forEach((item, idx) => {
    html += `
      <div class="schema-item-card" data-idx="${idx}">
        <div class="schema-item-header">
          <span>پرسش و پاسخ شماره ${idx + 1}</span>
          ${items.length > 1 ? `<button type="button" class="schema-item-del-btn" onclick="deleteFaqItem(${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button>` : ''}
        </div>
        <div class="form-group">
          <label>متن پرسش (Question):</label>
          <input type="text" class="faq-q-input" value="${escapeHtml(item.q)}" placeholder="مثال: هزینه ارسال چقدر است؟" oninput="updateFaqItem(${idx}, 'q', this.value)">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>متن پاسخ (Accepted Answer):</label>
          <textarea rows="2" class="faq-a-input" placeholder="پاسخ کامل سوال را اینجا بنویسید..." oninput="updateFaqItem(${idx}, 'a', this.value)">${escapeHtml(item.a)}</textarea>
        </div>
      </div>
    `;
  });
  html += '</div>';
  html += `<button type="button" class="schema-add-item-btn" onclick="addFaqItem()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    افزودن پرسش جدید
  </button>`;

  schemaFieldsContainer.innerHTML = html;
}

window.updateFaqItem = function(idx, field, val) {
  if (schemaStore.faq[idx]) {
    schemaStore.faq[idx][field] = val;
    updateSchemaOutput();
  }
};
window.addFaqItem = function() {
  schemaStore.faq.push({ q: '', a: '' });
  renderFaqForm();
};
window.deleteFaqItem = function(idx) {
  if (schemaStore.faq.length > 1) {
    schemaStore.faq.splice(idx, 1);
    renderFaqForm();
  }
};

// ۲. فرم Article
function renderArticleForm() {
  const d = schemaStore.article;
  schemaFieldsContainer.innerHTML = `
    <div class="form-row">
      <div class="form-group flex-1">
        <label>نوع مقاله:</label>
        <select onchange="schemaStore.article.subType = this.value; updateSchemaOutput();">
          <option value="BlogPosting" ${d.subType === 'BlogPosting' ? 'selected' : ''}>BlogPosting (پست وبلاگ)</option>
          <option value="Article" ${d.subType === 'Article' ? 'selected' : ''}>Article (مقاله عمومی)</option>
          <option value="NewsArticle" ${d.subType === 'NewsArticle' ? 'selected' : ''}>NewsArticle (مقاله خبری)</option>
        </select>
      </div>
      <div class="form-group flex-1">
        <label>عنوان مقاله (Headline):</label>
        <input type="text" value="${escapeHtml(d.headline)}" placeholder="عنوان کامل مقاله..." oninput="schemaStore.article.headline = this.value; updateSchemaOutput();">
      </div>
    </div>
    <div class="form-group">
      <label>چکیده یا توضیح مختصر (Description):</label>
      <textarea rows="2" placeholder="توضیح خلاصه مقاله..." oninput="schemaStore.article.description = this.value; updateSchemaOutput();">${escapeHtml(d.description)}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>آدرس صفحه مقاله (URL):</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.url)}" placeholder="https://example.com/blog/article-slug" oninput="schemaStore.article.url = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>آدرس تصویر شاخص (Image URL):</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.image)}" placeholder="https://example.com/images/thumb.jpg" oninput="schemaStore.article.image = this.value; updateSchemaOutput();">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>نام نویسنده (Author):</label>
        <input type="text" value="${escapeHtml(d.authorName)}" placeholder="نام نویسنده..." oninput="schemaStore.article.authorName = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>نوع نویسنده:</label>
        <select onchange="schemaStore.article.authorType = this.value; updateSchemaOutput();">
          <option value="Person" ${d.authorType === 'Person' ? 'selected' : ''}>شخص حقیقی (Person)</option>
          <option value="Organization" ${d.authorType === 'Organization' ? 'selected' : ''}>شرکت یا رسانه (Organization)</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>نام ناشر / وبسایت (Publisher):</label>
        <input type="text" value="${escapeHtml(d.publisherName)}" placeholder="مثلاً: جعبه‌ابزار سئو" oninput="schemaStore.article.publisherName = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>آدرس لوگوی ناشر (Logo URL):</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.publisherLogo)}" placeholder="https://example.com/logo.png" oninput="schemaStore.article.publisherLogo = this.value; updateSchemaOutput();">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>تاریخ انتشار (Published):</label>
        <div class="date-input-group">
          <input type="date" value="${d.datePublished}" onchange="schemaStore.article.datePublished = this.value; updateSchemaOutput();">
          <button type="button" class="quick-today-btn" onclick="setArticleDate('published')">امروز</button>
        </div>
      </div>
      <div class="form-group flex-1">
        <label>تاریخ آخرین ویرایش (Modified):</label>
        <div class="date-input-group">
          <input type="date" value="${d.dateModified}" onchange="schemaStore.article.dateModified = this.value; updateSchemaOutput();">
          <button type="button" class="quick-today-btn" onclick="setArticleDate('modified')">امروز</button>
        </div>
      </div>
    </div>
  `;
}

window.setArticleDate = function(type) {
  const today = new Date().toISOString().split('T')[0];
  if (type === 'published') schemaStore.article.datePublished = today;
  if (type === 'modified') schemaStore.article.dateModified = today;
  renderArticleForm();
};

// ۳. فرم LocalBusiness
function renderLocalForm() {
  const d = schemaStore.local;
  schemaFieldsContainer.innerHTML = `
    <div class="form-row">
      <div class="form-group flex-1">
        <label>نوع کسب‌وکار:</label>
        <select onchange="schemaStore.local.subType = this.value; updateSchemaOutput();">
          <option value="LocalBusiness" ${d.subType === 'LocalBusiness' ? 'selected' : ''}>کسب‌وکار عمومی (LocalBusiness)</option>
          <option value="ProfessionalService" ${d.subType === 'ProfessionalService' ? 'selected' : ''}>خدمات حرفه‌ای / شرکتی (ProfessionalService)</option>
          <option value="Store" ${d.subType === 'Store' ? 'selected' : ''}>فروشگاه فیزیکی (Store)</option>
          <option value="Restaurant" ${d.subType === 'Restaurant' ? 'selected' : ''}>رستوران و کافه (Restaurant)</option>
          <option value="MedicalBusiness" ${d.subType === 'MedicalBusiness' ? 'selected' : ''}>پزشکی و سلامت (MedicalBusiness)</option>
        </select>
      </div>
      <div class="form-group flex-1">
        <label>نام کسب‌وکار یا برند:</label>
        <input type="text" value="${escapeHtml(d.name)}" placeholder="مثلاً: آژانس سئو نوین" oninput="schemaStore.local.name = this.value; updateSchemaOutput();">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>آدرس وبسایت (URL):</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.url)}" placeholder="https://example.com" oninput="schemaStore.local.url = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>شماره تلفن تماس:</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.telephone)}" placeholder="+982188776655" oninput="schemaStore.local.telephone = this.value; updateSchemaOutput();">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>آدرس تصویر یا لوگو:</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.image)}" placeholder="https://example.com/photo.jpg" oninput="schemaStore.local.image = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>رده قیمتی (Price Range):</label>
        <select onchange="schemaStore.local.priceRange = this.value; updateSchemaOutput();">
          <option value="$" ${d.priceRange === '$' ? 'selected' : ''}>$ (اقتصادی)</option>
          <option value="$$" ${d.priceRange === '$$' ? 'selected' : ''}>$$ (متوسط)</option>
          <option value="$$$" ${d.priceRange === '$$$' ? 'selected' : ''}>$$$ (لوکس / تخصصی)</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>آدرس دقیق (خیابان و پلاک):</label>
      <input type="text" value="${escapeHtml(d.street)}" placeholder="خیابان ولیعصر، پلاک ۱۰۰" oninput="schemaStore.local.street = this.value; updateSchemaOutput();">
    </div>
    <div class="form-row">
      <div class="form-group flex-1">
        <label>شهر:</label>
        <input type="text" value="${escapeHtml(d.city)}" placeholder="تهران" oninput="schemaStore.local.city = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>استان:</label>
        <input type="text" value="${escapeHtml(d.region)}" placeholder="تهران" oninput="schemaStore.local.region = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>کد پستی:</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.postalCode)}" placeholder="1969712345" oninput="schemaStore.local.postalCode = this.value; updateSchemaOutput();">
      </div>
    </div>
  `;
}

// ۴. فرم Breadcrumb
function renderBreadcrumbForm() {
  const items = schemaStore.breadcrumb;
  let html = '<div class="schema-items-list">';
  items.forEach((item, idx) => {
    html += `
      <div class="schema-item-card" data-idx="${idx}">
        <div class="schema-item-header">
          <span>سطح ${idx + 1} مسیر راهنما</span>
          ${items.length > 1 ? `<button type="button" class="schema-item-del-btn" onclick="deleteBreadcrumbItem(${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button>` : ''}
        </div>
        <div class="form-row">
          <div class="form-group flex-1" style="margin-bottom:0;">
            <label>عنوان صفحه (Name):</label>
            <input type="text" value="${escapeHtml(item.name)}" placeholder="مثلاً: وبلاگ" oninput="updateBreadcrumbItem(${idx}, 'name', this.value)">
          </div>
          <div class="form-group flex-1" style="margin-bottom:0;">
            <label>آدرس صفحه (URL):</label>
            <input type="text" dir="ltr" value="${escapeHtml(item.url)}" placeholder="https://example.com/blog" oninput="updateBreadcrumbItem(${idx}, 'url', this.value)">
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  html += `<button type="button" class="schema-add-item-btn" onclick="addBreadcrumbItem()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    افزودن سطح جدید به مسیر
  </button>`;

  schemaFieldsContainer.innerHTML = html;
}

window.updateBreadcrumbItem = function(idx, field, val) {
  if (schemaStore.breadcrumb[idx]) {
    schemaStore.breadcrumb[idx][field] = val;
    updateSchemaOutput();
  }
};
window.addBreadcrumbItem = function() {
  schemaStore.breadcrumb.push({ name: '', url: '' });
  renderBreadcrumbForm();
};
window.deleteBreadcrumbItem = function(idx) {
  if (schemaStore.breadcrumb.length > 1) {
    schemaStore.breadcrumb.splice(idx, 1);
    renderBreadcrumbForm();
  }
};

// ۵. فرم HowTo
function renderHowToForm() {
  const d = schemaStore.howto;
  let html = `
    <div class="form-row">
      <div class="form-group flex-1">
        <label>عنوان آموزش (HowTo Name):</label>
        <input type="text" value="${escapeHtml(d.name)}" placeholder="مثال: نحوه ساخت سایت در ۵ گام" oninput="schemaStore.howto.name = this.value; updateSchemaOutput();">
      </div>
      <div class="form-group flex-1">
        <label>مدت زمان تخمینی (مثلاً PT15M برای ۱۵ دقیقه):</label>
        <input type="text" dir="ltr" value="${escapeHtml(d.totalTime)}" placeholder="PT15M" oninput="schemaStore.howto.totalTime = this.value; updateSchemaOutput();">
      </div>
    </div>
    <div class="form-group">
      <label>توضیح کوتاه آموزش (Description):</label>
      <textarea rows="2" placeholder="توضیح کلی درباره آنچه کاربر یاد می‌گیرد..." oninput="schemaStore.howto.description = this.value; updateSchemaOutput();">${escapeHtml(d.description)}</textarea>
    </div>
    <div class="schema-items-list">
  `;

  d.steps.forEach((step, idx) => {
    html += `
      <div class="schema-item-card" data-idx="${idx}">
        <div class="schema-item-header">
          <span>گام ${idx + 1} آموزش</span>
          ${d.steps.length > 1 ? `<button type="button" class="schema-item-del-btn" onclick="deleteHowToStep(${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button>` : ''}
        </div>
        <div class="form-group">
          <label>عنوان گام:</label>
          <input type="text" value="${escapeHtml(step.name)}" placeholder="مثلاً: انتخاب قالب مناسب" oninput="updateHowToStep(${idx}, 'name', this.value)">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>توضیحات این گام:</label>
          <textarea rows="2" placeholder="توضیحات کامل انجام این مرحله..." oninput="updateHowToStep(${idx}, 'text', this.value)">${escapeHtml(step.text)}</textarea>
        </div>
      </div>
    `;
  });

  html += '</div>';
  html += `<button type="button" class="schema-add-item-btn" onclick="addHowToStep()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    افزودن مرحله جدید به آموزش
  </button>`;

  schemaFieldsContainer.innerHTML = html;
}

window.updateHowToStep = function(idx, field, val) {
  if (schemaStore.howto.steps[idx]) {
    schemaStore.howto.steps[idx][field] = val;
    updateSchemaOutput();
  }
};
window.addHowToStep = function() {
  schemaStore.howto.steps.push({ name: '', text: '' });
  renderHowToForm();
};
window.deleteHowToStep = function(idx) {
  if (schemaStore.howto.steps.length > 1) {
    schemaStore.howto.steps.splice(idx, 1);
    renderHowToForm();
  }
};

// تولید آبجکت نهایی اسکیما بر اساس نوع
function buildSchemaObject() {
  if (activeSchemaType === 'faq') {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": schemaStore.faq.filter(f => f.q.trim() || f.a.trim()).map(f => ({
        "@type": "Question",
        "name": f.q.trim(),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a.trim()
        }
      }))
    };
  }

  if (activeSchemaType === 'article') {
    const d = schemaStore.article;
    const obj = {
      "@context": "https://schema.org",
      "@type": d.subType || "BlogPosting",
      "headline": d.headline.trim()
    };
    if (d.description.trim()) obj.description = d.description.trim();
    if (d.image.trim()) obj.image = d.image.trim();
    if (d.authorName.trim()) {
      obj.author = {
        "@type": d.authorType || "Person",
        "name": d.authorName.trim()
      };
    }
    if (d.publisherName.trim()) {
      obj.publisher = {
        "@type": "Organization",
        "name": d.publisherName.trim()
      };
      if (d.publisherLogo.trim()) {
        obj.publisher.logo = {
          "@type": "ImageObject",
          "url": d.publisherLogo.trim()
        };
      }
    }
    if (d.datePublished) obj.datePublished = d.datePublished;
    if (d.dateModified) obj.dateModified = d.dateModified;
    if (d.url.trim()) {
      obj.mainEntityOfPage = {
        "@type": "WebPage",
        "@id": d.url.trim()
      };
    }
    return obj;
  }

  if (activeSchemaType === 'local') {
    const d = schemaStore.local;
    const obj = {
      "@context": "https://schema.org",
      "@type": d.subType || "LocalBusiness",
      "name": d.name.trim()
    };
    if (d.image.trim()) obj.image = d.image.trim();
    if (d.telephone.trim()) obj.telephone = d.telephone.trim();
    if (d.url.trim()) obj.url = d.url.trim();
    if (d.priceRange) obj.priceRange = d.priceRange;
    if (d.street.trim() || d.city.trim() || d.region.trim()) {
      obj.address = {
        "@type": "PostalAddress",
        "streetAddress": d.street.trim(),
        "addressLocality": d.city.trim(),
        "addressRegion": d.region.trim(),
        "postalCode": d.postalCode.trim(),
        "addressCountry": d.country || "IR"
      };
    }
    return obj;
  }

  if (activeSchemaType === 'breadcrumb') {
    const validCrumbs = schemaStore.breadcrumb.filter(c => c.name.trim() || c.url.trim());
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": validCrumbs.map((c, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": c.name.trim(),
        "item": c.url.trim()
      }))
    };
  }

  if (activeSchemaType === 'howto') {
    const d = schemaStore.howto;
    const obj = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": d.name.trim()
    };
    if (d.description.trim()) obj.description = d.description.trim();
    if (d.totalTime.trim()) obj.totalTime = d.totalTime.trim();
    obj.step = d.steps.filter(s => s.name.trim() || s.text.trim()).map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.name.trim(),
      "text": s.text.trim()
    }));
    return obj;
  }

  return {};
}

// بروزرسانی جعبه پیش‌نمایش کد
function updateSchemaOutput() {
  if (!schemaCodeOutput) return;

  const schemaObj = buildSchemaObject();
  const jsonString = JSON.stringify(schemaObj, null, 2);
  const fullScript = `<script type="application/ld+json">\n${jsonString}\n</script>`;

  schemaCodeOutput.textContent = fullScript;

  // محاسبه آمار کاراکتر و حجم
  if (schemaStats) {
    const chars = fullScript.length;
    const bytes = new Blob([fullScript]).size;
    const sizeKb = (bytes / 1024).toFixed(1);
    schemaStats.textContent = `${chars.toLocaleString('fa-IR')} کاراکتر (${sizeKb} کیلوبایت) · ساختار معتبر JSON-LD`;
  }
}

// تغییر نوع اسکیما
document.querySelectorAll('input[name="schemaType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    activeSchemaType = e.target.value;
    renderSchemaForm();
  });
});

// دکمه کپی کد اسکیما
schemaCopyBtn?.addEventListener('click', () => {
  if (!schemaCodeOutput) return;
  copyText(schemaCodeOutput.textContent);
  toast('کد اسکیما JSON-LD کپی شد ✔');
});

// دکمه پاکسازی فرم
schemaResetBtn?.addEventListener('click', () => {
  if (activeSchemaType === 'faq') {
    schemaStore.faq = [{ q: '', a: '' }];
  } else if (activeSchemaType === 'article') {
    schemaStore.article = {
      subType: 'BlogPosting', headline: '', description: '', url: '', image: '',
      authorName: '', authorType: 'Person', publisherName: '', publisherLogo: '',
      datePublished: '', dateModified: ''
    };
  } else if (activeSchemaType === 'local') {
    schemaStore.local = {
      subType: 'LocalBusiness', name: '', url: '', telephone: '', image: '',
      priceRange: '$$', street: '', city: '', region: '', postalCode: '', country: 'IR'
    };
  } else if (activeSchemaType === 'breadcrumb') {
    schemaStore.breadcrumb = [{ name: '', url: '' }, { name: '', url: '' }];
  } else if (activeSchemaType === 'howto') {
    schemaStore.howto = { name: '', description: '', totalTime: '', steps: [{ name: '', text: '' }] };
  }
  renderSchemaForm();
  toast('فرم پاکسازی شد');
});

// دکمه نمونه آماده
schemaSampleBtn?.addEventListener('click', () => {
  if (activeSchemaType === 'faq') {
    schemaStore.faq = [
      { q: 'سئو چیست و چقدر زمان می‌برد تا به نتیجه برسد؟', a: 'سئو فرایندی تخصصی است و معمولاً بین ۳ الی ۶ ماه زمان نیاز دارد تا در رتبه‌های برتر عبارات پرجستجو به ثمر بنشیند.' },
      { q: 'آیا اسکیما به کسب رتبه اول در گوگل کمک می‌کند؟', a: 'اسکیما با ایجاد نتایج ستاره‌دار، سوالات بازشونده و تصاویر شاخص، نرخ کلیک (CTR) کاربران را افزایش می‌دهد و درک خزنده‌های هوش مصنوعی از سایت را ارتقا می‌بخشد.' },
      { q: 'کدهای اسکیما را در کجای سایت باید قرار دهیم؟', a: 'بهترین محل، قرار دادن کد در تگ <head> قالب یا استفاده از افزونه‌های معتبر سئو مانند Rank Math و Yoast SEO است.' }
    ];
  } else if (activeSchemaType === 'article') {
    schemaStore.article = {
      subType: 'BlogPosting',
      headline: 'راهنمای جامع سئو و داده‌های ساختاریافته در سال ۲۰۲۶',
      description: 'آموزش صفر تا صد نحوه کسب نتایج ویژه ریچ اسنیپت با کدهای استاندارد اسکیما در گوگل.',
      url: 'https://seo.mhkhademi87.ir/blog/schema-guide',
      image: 'https://seo.mhkhademi87.ir/assets/schema-cover.jpg',
      authorName: 'محمد حسین خادمی',
      authorType: 'Person',
      publisherName: 'جعبه‌ابزار سئو',
      publisherLogo: 'https://seo.mhkhademi87.ir/icon-192.png',
      datePublished: new Date().toISOString().split('T')[0],
      dateModified: new Date().toISOString().split('T')[0]
    };
  } else if (activeSchemaType === 'local') {
    schemaStore.local = {
      subType: 'ProfessionalService',
      name: 'آژانس دیجیتال مارکتینگ نوین',
      url: 'https://seo.mhkhademi87.ir',
      telephone: '+982188776655',
      image: 'https://seo.mhkhademi87.ir/assets/office.jpg',
      priceRange: '$$',
      street: 'خیابان ولیعصر، برج نگین، طبقه ۵',
      city: 'تهران',
      region: 'تهران',
      postalCode: '1969712345',
      country: 'IR'
    };
  } else if (activeSchemaType === 'breadcrumb') {
    schemaStore.breadcrumb = [
      { name: 'صفحه اصلی', url: 'https://seo.mhkhademi87.ir' },
      { name: 'ابزارهای آنلاین سئو', url: 'https://seo.mhkhademi87.ir/#tab=tools' },
      { name: 'اسکیما ساز JSON-LD', url: 'https://seo.mhkhademi87.ir/#tab=tools&tool=schema' }
    ];
  } else if (activeSchemaType === 'howto') {
    schemaStore.howto = {
      name: 'نحوه ثبت نقشه سایت در گوگل سرچ کنسول',
      description: 'آموزش گام‌به‌گام ارسال و ایندکس سریع آدرس صفحات سایت در سرچ کنسول گوگل.',
      totalTime: 'PT10M',
      steps: [
        { name: 'ورود به کنسول', text: 'وارد پنل دامنه خود در گوگل سرچ کنسول شوید.' },
        { name: 'بخش Sitemaps', text: 'از منوی سمت چپ روی گزینه Sitemaps کلیک فرمایید.' },
        { name: 'ارسال آدرس sitemap.xml', text: 'آدرس sitemap.xml را وارد نموده و Submit را بزنید.' }
      ]
    };
  }
  renderSchemaForm();
  toast('نمونه آماده بارگذاری شد');
});

// دکمه تست در ابزار رسمی گوگل (Rich Results Test)
schemaTestGoogleBtn?.addEventListener('click', () => {
  if (!schemaCodeOutput) return;
  copyText(schemaCodeOutput.textContent);
  toast('کد کپی شد! در تب CODE ابزار بازشده گوگل، آن را Paste کنید 🚀');
  window.open('https://search.google.com/test/rich-results', '_blank');
});



/* ───────────────────────────── سازنده Robots.txt و کنترل بات‌های AI ───────────────────────────── */
const robotsSitemap = document.getElementById('robotsSitemap');
const robotsUserAgent = document.getElementById('robotsUserAgent');
const robotsCrawlDelay = document.getElementById('robotsCrawlDelay');
const blockGptBot = document.getElementById('blockGptBot');
const blockClaudeBot = document.getElementById('blockClaudeBot');
const blockGoogleExtended = document.getElementById('blockGoogleExtended');
const blockCcBot = document.getElementById('blockCcBot');
const robotsRulesList = document.getElementById('robotsRulesList');
const robotsCodeOutput = document.getElementById('robotsCodeOutput');
const robotsStats = document.getElementById('robotsStats');
const addRobotsRuleBtn = document.getElementById('addRobotsRuleBtn');
const robotsCopyBtn = document.getElementById('robotsCopyBtn');
const robotsDownloadBtn = document.getElementById('robotsDownloadBtn');
const robotsWpBtn = document.getElementById('robotsWpBtn');
const robotsShopBtn = document.getElementById('robotsShopBtn');

let robotsRules = [
  { type: 'Disallow', path: '/wp-admin/' },
  { type: 'Allow', path: '/wp-admin/admin-ajax.php' }
];

function renderRobotsRules() {
  if (!robotsRulesList) return;

  let html = '';
  robotsRules.forEach((rule, idx) => {
    html += `
      <div class="schema-item-card" style="padding:12px;" data-rule-idx="${idx}">
        <div class="form-row" style="align-items:center;">
          <div style="width:170px; flex-shrink:0;">
            <select onchange="updateRobotsRule(${idx}, 'type', this.value)">
              <option value="Disallow" ${rule.type === 'Disallow' ? 'selected' : ''}>Disallow (مسدود)</option>
              <option value="Allow" ${rule.type === 'Allow' ? 'selected' : ''}>Allow (مجاز)</option>
            </select>
          </div>
          <div class="flex-1" style="min-width:0;">
            <input type="text" dir="ltr" value="${escapeHtml(rule.path)}" placeholder="/path/" oninput="updateRobotsRule(${idx}, 'path', this.value)" style="width:100%;">
          </div>
          <div style="flex-shrink:0;">
            <button type="button" class="schema-item-del-btn" onclick="deleteRobotsRule(${idx})" title="حذف مسیر">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  robotsRulesList.innerHTML = html;
  initCustomSelects(robotsRulesList);
  updateRobotsOutput();
}

window.updateRobotsRule = function(idx, field, val) {
  if (robotsRules[idx]) {
    robotsRules[idx][field] = val;
    updateRobotsOutput();
  }
};
window.deleteRobotsRule = function(idx) {
  robotsRules.splice(idx, 1);
  renderRobotsRules();
};

addRobotsRuleBtn?.addEventListener('click', () => {
  robotsRules.push({ type: 'Disallow', path: '/' });
  renderRobotsRules();
});

function updateRobotsOutput() {
  if (!robotsCodeOutput) return;

  const lines = [];

  // راهنما در ابتدای فایل
  lines.push('# robots.txt تولید شده با جعبه‌ابزار سئو (https://seo.mhkhademi87.ir)');
  lines.push('');

  // بخش قوانین عمومی ربات‌ها
  const ua = robotsUserAgent?.value || '*';
  lines.push(`User-agent: ${ua}`);

  if (robotsCrawlDelay && robotsCrawlDelay.value !== 'none') {
    lines.push(`Crawl-delay: ${robotsCrawlDelay.value}`);
  }

  // اضافه کردن مسیرها
  robotsRules.forEach(r => {
    const p = r.path.trim();
    if (p) {
      lines.push(`${r.type}: ${p}`);
    }
  });

  // مسدودسازی بات‌های هوش مصنوعی
  const aiBotsToBlock = [];
  if (blockGptBot?.checked) aiBotsToBlock.push({ name: 'GPTBot', label: 'OpenAI ChatGPT' });
  if (blockClaudeBot?.checked) aiBotsToBlock.push({ name: 'ClaudeBot', label: 'Anthropic Claude' });
  if (blockGoogleExtended?.checked) aiBotsToBlock.push({ name: 'Google-Extended', label: 'Google Gemini Training' });
  if (blockCcBot?.checked) aiBotsToBlock.push({ name: 'CCBot', label: 'Common Crawl' });

  if (aiBotsToBlock.length > 0) {
    lines.push('');
    lines.push('# مسدودسازی ربات‌های آموزش هوش مصنوعی (AI Scraping Blocker)');
    aiBotsToBlock.forEach(b => {
      lines.push(`User-agent: ${b.name} # ${b.label}`);
      lines.push('Disallow: /');
    });
  }

  // اضافه کردن نقشه سایت
  const sitemap = robotsSitemap?.value.trim();
  if (sitemap) {
    lines.push('');
    lines.push('# نقشه سایت');
    lines.push(`Sitemap: ${sitemap}`);
  }

  const result = lines.join('\n');
  robotsCodeOutput.textContent = result;

  if (robotsStats) {
    const lineCount = lines.filter(l => l.trim() && !l.startsWith('#')).length;
    const bytes = new Blob([result]).size;
    robotsStats.textContent = `${lineCount.toLocaleString('fa-IR')} دستور موثر (${bytes} بایت) · آماده قرارگیری در هاست`;
  }
}

// گوش دادن به تغییرات فیلدها
[robotsSitemap, robotsUserAgent, robotsCrawlDelay, blockGptBot, blockClaudeBot, blockGoogleExtended, blockCcBot].forEach(el => {
  el?.addEventListener('input', updateRobotsOutput);
  el?.addEventListener('change', updateRobotsOutput);
});

// دکمه کپی
robotsCopyBtn?.addEventListener('click', () => {
  if (!robotsCodeOutput) return;
  copyText(robotsCodeOutput.textContent);
  toast('محتوای فایل robots.txt کپی شد ✔');
});

// دکمه دانلود مستقیم
robotsDownloadBtn?.addEventListener('click', () => {
  if (!robotsCodeOutput) return;
  const content = robotsCodeOutput.textContent;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'robots.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast('فایل robots.txt دانلود شد 📥');
});

// قالب وردپرس
robotsWpBtn?.addEventListener('click', () => {
  robotsRules = [
    { type: 'Disallow', path: '/wp-admin/' },
    { type: 'Allow', path: '/wp-admin/admin-ajax.php' },
    { type: 'Disallow', path: '/wp-includes/' },
    { type: 'Disallow', path: '/xmlrpc.php' },
    { type: 'Disallow', path: '/trackback/' }
  ];
  renderRobotsRules();
  toast('قالب پیشنهادی وردپرس اعمال شد');
});

// قالب فروشگاهی (ووکامرس)
robotsShopBtn?.addEventListener('click', () => {
  robotsRules = [
    { type: 'Disallow', path: '/wp-admin/' },
    { type: 'Allow', path: '/wp-admin/admin-ajax.php' },
    { type: 'Disallow', path: '/cart/' },
    { type: 'Disallow', path: '/checkout/' },
    { type: 'Disallow', path: '/my-account/' },
    { type: 'Disallow', path: '/*?add-to-cart=*' },
    { type: 'Disallow', path: '/*?s=*' }
  ];
  renderRobotsRules();
  toast('قالب فروشگاهی (ووکامرس) اعمال شد');
});



/* ───────────────────────────── مودال ثبت و پیشنهاد ابزار جدید ───────────────────────────── */
const openSubmitModalBtn = document.getElementById('openSubmitModalBtn');
const closeSubmitModalBtn = document.getElementById('closeSubmitModalBtn');
const cancelSubmitModalBtn = document.getElementById('cancelSubmitModalBtn');
const submitToolModal = document.getElementById('submitToolModal');
const submitToolForm = document.getElementById('submitToolForm');
const submitSuccessBox = document.getElementById('submitSuccessBox');
const submittedJsonOutput = document.getElementById('submittedJsonOutput');
const copySubmittedJsonBtn = document.getElementById('copySubmittedJsonBtn');
const submitAnotherBtn = document.getElementById('submitAnotherBtn');

function loadUserSubmittedTools() {
  try {
    const raw = localStorage.getItem('user_submitted_tools');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(t => {
          t._userSubmitted = true;
          if (!SEO_DATA.tools.some(x => x.id === t.id || x.url === t.url)) {
            SEO_DATA.tools.unshift(t);
          }
        });
      }
    }
  } catch (err) {
    console.error('Error loading submitted tools:', err);
  }
}

function openSubmitModal() {
  if (!submitToolModal) return;
  submitToolForm.reset();
  submitToolForm.hidden = false;
  submitSuccessBox.hidden = true;
  submitToolModal.showModal();
}

function closeSubmitModal() {
  if (!submitToolModal) return;
  submitToolModal.close();
}

openSubmitModalBtn?.addEventListener('click', openSubmitModal);
closeSubmitModalBtn?.addEventListener('click', closeSubmitModal);
cancelSubmitModalBtn?.addEventListener('click', closeSubmitModal);

// بستن مودال با کلیک روی پس‌زمینه
submitToolModal?.addEventListener('click', (e) => {
  const rect = submitToolModal.getBoundingClientRect();
  const isInDialog = (
    rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX && e.clientX <= rect.left + rect.width
  );
  if (!isInDialog) {
    closeSubmitModal();
  }
});

// ارسال فرم
submitToolForm?.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('subToolName').value.trim();
  const rawUrl = document.getElementById('subToolUrl').value.trim();
  const cat = document.getElementById('subToolCat').value;
  const payment = document.getElementById('subToolPayment').value;
  const desc = document.getElementById('subToolDesc').value.trim();
  const tagsStr = document.getElementById('subToolTags').value.trim();
  const email = document.getElementById('subToolEmail').value.trim();
  const iranian = document.getElementById('subToolIranian').checked;
  const noVpn = document.getElementById('subToolNoVpn').checked;

  if (!name || !rawUrl || !desc) {
    toast('لطفاً فیلدهای الزامی را تکمیل فرمایید');
    return;
  }

  let domain = '';
  try {
    domain = new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    domain = rawUrl.split('/')[0].replace(/^www\./, '');
  }

  const id = domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'tool-' + Date.now();
  const tags = tagsStr ? tagsStr.split(/[,،]+/).map(t => t.trim()).filter(Boolean) : [name];

  const newTool = {
    id: id,
    name: name,
    desc: desc,
    url: rawUrl,
    domain: domain,
    cat: cat,
    iranian: iranian,
    color: '#8b7cff',
    free: payment === 'free',
    no_vpn: noVpn,
    payment: payment,
    affiliate_url: '',
    discount_code: '',
    tags: tags,
    _userSubmitted: true,
    _submittedBy: email,
    _date: new Date().toISOString()
  };

  // ۱. ذخیره در لوکال‌استوریج
  try {
    let saved = JSON.parse(localStorage.getItem('user_submitted_tools') || '[]');
    saved = saved.filter(x => x.url !== newTool.url);
    saved.unshift(newTool);
    localStorage.setItem('user_submitted_tools', JSON.stringify(saved));
  } catch (err) {
    console.error(err);
  }

  // ۲. تزریق به دیتای زنده صفحه و رندر مجدد
  if (!SEO_DATA.tools.some(x => x.id === newTool.id || x.url === newTool.url)) {
    SEO_DATA.tools.unshift(newTool);
    render();
  }

  // ۳. نمایش باکس موفقیت و لینک گیت‌هاب
  const jsonCode = JSON.stringify(newTool, null, 2);
  submittedJsonOutput.textContent = jsonCode;

  submitToolForm.hidden = true;
  submitSuccessBox.hidden = false;
  toast('🎉 ابزار با موفقیت ثبت و به دایرکتوری اضافه شد!');
});

copySubmittedJsonBtn?.addEventListener('click', () => {
  if (submittedJsonOutput) {
    copyText(submittedJsonOutput.textContent);
    toast('مشخصات ابزار کپی شد ✔');
  }
});

submitAnotherBtn?.addEventListener('click', () => {
  submitToolForm.reset();
  submitToolForm.hidden = false;
  submitSuccessBox.hidden = true;
});

/* ───────────────────────────── مودال تبلیغات و اسپانسرینگ ───────────────────────────── */
const openSponsorModalBtn = document.getElementById('openSponsorModalBtn');
const closeSponsorModalBtn = document.getElementById('closeSponsorModalBtn');
const sponsorModal = document.getElementById('sponsorModal');
const copyContactEmailBtn = document.getElementById('copyContactEmailBtn');

function openSponsorModal() {
  if (!sponsorModal) return;
  sponsorModal.showModal();
}

function closeSponsorModal() {
  if (!sponsorModal) return;
  sponsorModal.close();
}

openSponsorModalBtn?.addEventListener('click', openSponsorModal);
closeSponsorModalBtn?.addEventListener('click', closeSponsorModal);

sponsorModal?.addEventListener('click', (e) => {
  const rect = sponsorModal.getBoundingClientRect();
  const isInDialog = (
    rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX && e.clientX <= rect.left + rect.width
  );
  if (!isInDialog) {
    closeSponsorModal();
  }
});

copyContactEmailBtn?.addEventListener('click', () => {
  const mail = 'mhkhademi87@gmail.com';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(mail).then(() => {
      toast('ایمیل تماس کپی شد: ' + mail);
    }).catch(() => {
      copyText(mail);
      toast('ایمیل تماس کپی شد: ' + mail);
    });
  } else {
    copyText(mail);
    toast('ایمیل تماس کپی شد: ' + mail);
  }
});



/* ───────────────────────────── سازنده نقشه سایت XML (Sitemap Generator) ───────────────────────────── */
const sitemapUrlsInput = document.getElementById('sitemapUrlsInput');
const sitemapLastmod = document.getElementById('sitemapLastmod');
const sitemapTodayBtn = document.getElementById('sitemapTodayBtn');
const sitemapFreq = document.getElementById('sitemapFreq');
const sitemapPriority = document.getElementById('sitemapPriority');
const sitemapAutoHome = document.getElementById('sitemapAutoHome');
const sitemapCodeOutput = document.getElementById('sitemapCodeOutput');
const sitemapStats = document.getElementById('sitemapStats');
const sitemapSampleBtn = document.getElementById('sitemapSampleBtn');
const sitemapResetBtn = document.getElementById('sitemapResetBtn');
const sitemapDownloadBtn = document.getElementById('sitemapDownloadBtn');
const sitemapCopyBtn = document.getElementById('sitemapCopyBtn');

// مقداردهی تاریخ امروز
if (sitemapLastmod) {
  sitemapLastmod.value = new Date().toISOString().split('T')[0];
}
sitemapTodayBtn?.addEventListener('click', () => {
  if (sitemapLastmod) {
    sitemapLastmod.value = new Date().toISOString().split('T')[0];
    updateSitemapOutput();
  }
});

function updateSitemapOutput() {
  if (!sitemapCodeOutput) return;

  const rawText = sitemapUrlsInput?.value || '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const lastmod = sitemapLastmod?.value || new Date().toISOString().split('T')[0];
  const freq = sitemapFreq?.value || 'weekly';
  const defaultPrio = sitemapPriority?.value || '0.8';
  const autoHome = sitemapAutoHome?.checked;

  const uniqueUrls = [];
  const seen = new Set();

  lines.forEach(line => {
    let u = line;
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://' + u;
    }
    try {
      const parsed = new URL(u);
      const cleanUrl = parsed.origin + parsed.pathname + parsed.search;
      if (!seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        uniqueUrls.push(cleanUrl);
      }
    } catch {
      if (!seen.has(u)) {
        seen.add(u);
        uniqueUrls.push(u);
      }
    }
  });

  const xmlLines = [];
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlLines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  uniqueUrls.forEach(urlStr => {
    let isHome = false;
    try {
      const p = new URL(urlStr);
      isHome = (p.pathname === '/' || p.pathname === '') && !p.search;
    } catch {
      isHome = false;
    }

    const priority = (autoHome && isHome) ? '1.0' : defaultPrio;
    const urlFreq = (autoHome && isHome) ? 'daily' : freq;

    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${escapeHtml(urlStr)}</loc>`);
    if (lastmod) {
      xmlLines.push(`    <lastmod>${lastmod}</lastmod>`);
    }
    xmlLines.push(`    <changefreq>${urlFreq}</changefreq>`);
    xmlLines.push(`    <priority>${priority}</priority>`);
    xmlLines.push('  </url>');
  });

  xmlLines.push('</urlset>');

  const result = xmlLines.join('\n');
  sitemapCodeOutput.textContent = result;

  if (sitemapStats) {
    const count = uniqueUrls.length;
    const bytes = new Blob([result]).size;
    const sizeKb = (bytes / 1024).toFixed(1);
    sitemapStats.textContent = `${count.toLocaleString('fa-IR')} صفحه (${sizeKb} کیلوبایت) · استاندارد sitemaps.org`;
  }
}

// گوش دادن به تغییرات فیلدهای سایت‌مپ
[sitemapUrlsInput, sitemapLastmod, sitemapFreq, sitemapPriority, sitemapAutoHome].forEach(el => {
  el?.addEventListener('input', updateSitemapOutput);
  el?.addEventListener('change', updateSitemapOutput);
});

// کپی کد XML
sitemapCopyBtn?.addEventListener('click', () => {
  if (!sitemapCodeOutput) return;
  copyText(sitemapCodeOutput.textContent);
  toast('کد نقشه سایت (XML) کپی شد ✔');
});

// دانلود sitemap.xml
sitemapDownloadBtn?.addEventListener('click', () => {
  if (!sitemapCodeOutput) return;
  const content = sitemapCodeOutput.textContent;
  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sitemap.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast('فایل sitemap.xml دانلود شد 📥');
});

// نمونه آماده
sitemapSampleBtn?.addEventListener('click', () => {
  if (sitemapUrlsInput) {
    sitemapUrlsInput.value = [
      'https://seo.mhkhademi87.ir/',
      'https://seo.mhkhademi87.ir/tools/rankfind',
      'https://seo.mhkhademi87.ir/tools/keywordchi',
      'https://seo.mhkhademi87.ir/tools/jetseo',
      'https://seo.mhkhademi87.ir/blog/seo-checklist',
      'https://seo.mhkhademi87.ir/about'
    ].join('\n');
    updateSitemapOutput();
    toast('نمونه آماده بارگذاری شد');
  }
});

// پاکسازی فرم
sitemapResetBtn?.addEventListener('click', () => {
  if (sitemapUrlsInput) {
    sitemapUrlsInput.value = '';
    updateSitemapOutput();
    toast('فرم پاکسازی شد');
  }
});

/* ───────────────────────────── آنالیزور و سئوی محتوا (Content & Keyword Analyzer) ───────────────────────────── */

const PERSIAN_STOP_WORDS = new Set([
  'از', 'به', 'در', 'با', 'که', 'این', 'آن', 'است', 'برای', 'شد', 'شده', 'بود', 'بودند',
  'می', 'نمی', 'را', 'تا', 'یا', 'و', 'هم', 'هر', 'بر', 'چه', 'چون', 'اگر', 'اما', 'ولی',
  'یکی', 'خود', 'همه', 'میان', 'پس', 'دیگر', 'خیلی', 'بعد', 'پیش', 'بین', 'چند', 'بیش',
  'کم', 'مثل', 'زیر', 'روی', 'اینها', 'آنها', 'ما', 'شما', 'من', 'تو', 'او', 'هست', 'نیست',
  'دارد', 'ندارد', 'کنند', 'کند', 'کرده', 'کرد', 'گفت', 'گوید', 'شود', 'شوند', 'توان',
  'تواند', 'توانند', 'اینکه', 'آنکه', 'درباره', 'علیه', 'طریق', 'جهت', 'توسط', 'نوع', 'مورد',
  'دلیل', 'علت', 'اثر', 'حتی', 'جایی', 'همیشه', 'هنوز', 'باز', 'فقط', 'تنها', 'بلکه', 'شاید',
  'زیرا', 'بنابراین', 'داشته', 'باشد', 'باشند', 'بوده', 'خواهند', 'خواهد', 'کرده‌اند', 'کرده‌است'
]);

const ENGLISH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'of', 'to', 'is', 'are', 'was', 'were', 'it', 'and',
  'or', 'for', 'with', 'as', 'by', 'that', 'this', 'from', 'be', 'have', 'has', 'not', 'but',
  'so', 'can', 'will', 'all', 'any', 'we', 'they', 'you', 'i', 'he', 'she', 'do', 'does'
]);

function isStopWord(word) {
  const w = word.toLowerCase().trim();
  return PERSIAN_STOP_WORDS.has(w) || ENGLISH_STOP_WORDS.has(w);
}

const contentTextInput = document.getElementById('contentText');
const contentKeywordsInput = document.getElementById('contentKeywords');
const contentIgnoreStopWords = document.getElementById('contentIgnoreStopWords');
const contentWordCounterBadge = document.getElementById('contentWordCounterBadge');

const statWords = document.getElementById('statWords');
const statUniqueWords = document.getElementById('statUniqueWords');
const statCharsWithSpace = document.getElementById('statCharsWithSpace');
const statCharsNoSpace = document.getElementById('statCharsNoSpace');
const statReadTime = document.getElementById('statReadTime');
const statSpeakTime = document.getElementById('statSpeakTime');
const statSentences = document.getElementById('statSentences');
const statParagraphs = document.getElementById('statParagraphs');
const statSeoScore = document.getElementById('statSeoScore');
const statSeoStatus = document.getElementById('statSeoStatus');

const targetKeywordsTableWrap = document.getElementById('targetKeywordsTableWrap');
const tfidfTableWrap = document.getElementById('tfidfTableWrap');
const ngramsTableWrap = document.getElementById('ngramsTableWrap');
const readabilityChecklistWrap = document.getElementById('readabilityChecklistWrap');

const contentSampleBtn = document.getElementById('contentSampleBtn');
const contentResetBtn = document.getElementById('contentResetBtn');
const contentCopyReportBtn = document.getElementById('contentCopyReportBtn');

let activeAnalysisTab = 'kw-density';
let activeNgramSize = 1;

// ثبت شنونده تب‌های تحلیل داخلی
const contentNavTabs = [
  { id: 'kw-density', btn: document.getElementById('tabKwDensity'), panel: document.getElementById('panelKwDensity') },
  { id: 'tfidf', btn: document.getElementById('tabTfIdf'), panel: document.getElementById('panelTfIdf') },
  { id: 'ngrams', btn: document.getElementById('tabNgrams'), panel: document.getElementById('panelNgrams') },
  { id: 'readability', btn: document.getElementById('tabReadability'), panel: document.getElementById('panelReadability') }
];

contentNavTabs.forEach(tab => {
  tab.btn?.addEventListener('click', () => {
    activeAnalysisTab = tab.id;
    contentNavTabs.forEach(t => {
      const active = t.id === tab.id;
      t.btn?.classList.toggle('active', active);
      if (t.panel) t.panel.hidden = !active;
    });
  });
});

document.querySelectorAll('.ngram-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ngram-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeNgramSize = parseInt(btn.dataset.ngram, 10) || 1;
    updateContentAnalysis();
  });
});

function normalizePersianText(str) {
  if (!str) return '';
  return str
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[‎‏]/g, '');
}

function extractWords(text) {
  if (!text) return [];
  const normalized = normalizePersianText(text);
  const matches = normalized.match(/[\p{L}\p{N}\u200c]+/gu);
  return matches ? matches.map(w => w.trim()).filter(Boolean) : [];
}

function formatReadingTime(wordsCount, wpm) {
  if (!wordsCount) return '۰ ثانیه';
  const totalSeconds = Math.ceil((wordsCount / wpm) * 60);
  if (totalSeconds < 60) {
    return `${totalSeconds.toLocaleString('fa-IR')} ثانیه`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs > 0
    ? `${mins.toLocaleString('fa-IR')} د و ${secs.toLocaleString('fa-IR')} ث`
    : `${mins.toLocaleString('fa-IR')} دقیقه`;
}

function updateContentAnalysis() {
  if (!contentTextInput) return;
  const rawText = contentTextInput.value;
  const words = extractWords(rawText);
  const wordsCount = words.length;

  if (contentWordCounterBadge) {
    contentWordCounterBadge.textContent = `${wordsCount.toLocaleString('fa-IR')} کلمه`;
  }

  // ۱. آمار پایه
  const uniqueWordsSet = new Set(words.map(w => w.toLowerCase()));
  const uniqueWordsCount = uniqueWordsSet.size;
  const charsWithSpaces = rawText.length;
  const charsNoSpaces = rawText.replace(/\s+/g, '').length;

  // جملات و پاراگراف‌ها
  const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const paragraphsCount = Math.max(rawText.trim() ? 1 : 0, paragraphs.length);
  const sentences = rawText.split(/[.?!؟۔\n]+/).map(s => s.trim()).filter(s => s.length > 2);
  const sentencesCount = Math.max(rawText.trim() ? 1 : 0, sentences.length);

  if (statWords) statWords.textContent = wordsCount.toLocaleString('fa-IR');
  if (statUniqueWords) statUniqueWords.textContent = `${uniqueWordsCount.toLocaleString('fa-IR')} کلمه یکتا`;
  if (statCharsWithSpace) statCharsWithSpace.textContent = charsWithSpaces.toLocaleString('fa-IR');
  if (statCharsNoSpace) statCharsNoSpace.textContent = `بدون فاصله: ${charsNoSpaces.toLocaleString('fa-IR')}`;
  if (statReadTime) statReadTime.textContent = formatReadingTime(wordsCount, 200);
  if (statSpeakTime) statSpeakTime.textContent = formatReadingTime(wordsCount, 130);
  if (statSentences) statSentences.textContent = `${sentencesCount.toLocaleString('fa-IR')} جمله`;
  if (statParagraphs) statParagraphs.textContent = `${paragraphsCount.toLocaleString('fa-IR')} پاراگراف`;

  // ۲. کلمات کلیدی هدف و چگالی
  const rawKwInput = (contentKeywordsInput?.value || '').trim();
  const targetKws = rawKwInput
    ? rawKwInput.split(/[,،\n]+/).map(k => k.trim()).filter(Boolean)
    : [];

  const kwStats = [];
  const normalizedText = normalizePersianText(rawText).toLowerCase();
  const first100Words = words.slice(0, 100).join(' ').toLowerCase();

  targetKws.forEach(kw => {
    const normKw = normalizePersianText(kw).toLowerCase();
    const escapedKw = normKw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/\s+/g, '[\\s\\u200c]+');
    let count = 0;
    try {
      const rx = new RegExp(escapedKw, 'gu');
      const matches = normalizedText.match(rx);
      count = matches ? matches.length : 0;
    } catch {
      count = 0;
    }

    const density = wordsCount > 0 ? ((count / wordsCount) * 100) : 0;
    const inFirst100 = first100Words.includes(normKw);

    let status = { text: 'ایده‌آل (طبیعی)', cls: 'ok', icon: '✔' };
    if (count === 0) {
      status = { text: 'استفاده نشده', cls: 'err', icon: '✕' };
    } else if (density < 0.8) {
      status = { text: 'کم (زیر ۱٪)', cls: 'info', icon: 'ℹ' };
    } else if (density <= 2.5) {
      status = { text: 'ایده‌آل (۱٪ - ۲.۵٪)', cls: 'ok', icon: '✔' };
    } else if (density <= 3.5) {
      status = { text: 'نسبتاً بالا (مرز هشدار)', cls: 'warn', icon: '⚠' };
    } else {
      status = { text: 'خطر کیورد استافینگ (>۳.۵٪)', cls: 'err', icon: '🚨' };
    }

    kwStats.push({ kw, count, density, inFirst100, status });
  });

  renderTargetKeywordsTable(kwStats, wordsCount);

  // ۳. محاسبه TF-IDF
  const ignoreStop = contentIgnoreStopWords ? contentIgnoreStopWords.checked : true;
  renderTfIdfTable(rawText, words, paragraphs, ignoreStop);

  // ۴. جدول N-Grams
  renderNgramsTable(words, ignoreStop);

  // ۵. چک‌لیست سئو و محاسبه نمره نهایی کیفیت محتوا
  renderReadabilityChecklist(wordsCount, sentencesCount, paragraphsCount, uniqueWordsCount, kwStats);
}

function renderTargetKeywordsTable(kwStats, wordsCount) {
  if (!targetKeywordsTableWrap) return;

  if (wordsCount === 0) {
    targetKeywordsTableWrap.innerHTML = '<div class="table-empty-notice">متن مقاله را وارد کنید تا چگالی و وضعیت کلمات کلیدی هدف محاسبه شود.</div>';
    return;
  }

  if (kwStats.length === 0) {
    targetKeywordsTableWrap.innerHTML = `
      <div class="table-empty-notice">
        <span>هنوز کلمه کلیدی هدفی وارد نکرده‌اید.</span><br>
        <span style="font-size:0.75rem; color:var(--muted); margin-top:4px; display:inline-block;">کلمات کلیدی اصلی و فرعی مقاله خود را در کادر بالا وارد کنید تا چگالی دقیق آن‌ها سنجیده شود.</span>
      </div>
    `;
    return;
  }

  let html = `
    <div class="content-table-responsive">
      <table class="content-table">
        <thead>
          <tr>
            <th>کلمه کلیدی هدف</th>
            <th>تعداد تکرار</th>
            <th>درصد چگالی (Density)</th>
            <th>حضور در ۱۰۰ کلمه اول</th>
            <th>ارزیابی سئو</th>
          </tr>
        </thead>
        <tbody>
  `;

  kwStats.forEach(item => {
    const barWidth = Math.min(100, Math.round(item.density * 25));
    html += `
      <tr>
        <td><b>${escapeHtml(item.kw)}</b></td>
        <td>${item.count.toLocaleString('fa-IR')} بار</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${item.density.toFixed(2)}%</span>
            <div class="bar-container">
              <div class="bar-fill" style="width:${barWidth}%;"></div>
            </div>
          </div>
        </td>
        <td>${item.inFirst100 ? '<span style="color:var(--ok); font-weight:600;">✔ بله</span>' : '<span style="color:var(--muted);">خیر</span>'}</td>
        <td><span class="status-badge ${item.status.cls}">${item.status.icon} ${item.status.text}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  targetKeywordsTableWrap.innerHTML = html;
}

function renderTfIdfTable(rawText, words, paragraphs, ignoreStop) {
  if (!tfidfTableWrap) return;

  if (words.length === 0) {
    tfidfTableWrap.innerHTML = '<div class="table-empty-notice">متن مقاله را وارد کنید تا شاخص TF-IDF کلمات محاسبه شود.</div>';
    return;
  }

  const docs = paragraphs.length >= 2 ? paragraphs : [rawText];
  const docTokens = docs.map(d => extractWords(d).map(w => w.toLowerCase()));
  const totalWords = words.length;

  const wordCounts = {};
  words.forEach(w => {
    const lw = w.toLowerCase();
    if (ignoreStop && (isStopWord(lw) || lw.length < 2 || /^\d+$/.test(lw))) return;
    wordCounts[lw] = (wordCounts[lw] || 0) + 1;
  });

  const N = docTokens.length;
  const tfidfScores = [];

  for (const [term, count] of Object.entries(wordCounts)) {
    const tf = count / totalWords;
    let df = 0;
    docTokens.forEach(dt => {
      if (dt.includes(term)) df++;
    });

    const idf = Math.log((N + 1) / (df + 1)) + 1;
    const score = tf * idf;
    tfidfScores.push({ term, count, tf, df, idf, score });
  }

  tfidfScores.sort((a, b) => b.score - a.score);
  const top15 = tfidfScores.slice(0, 15);

  if (top15.length === 0) {
    tfidfTableWrap.innerHTML = '<div class="table-empty-notice">کلمه مفهومی قابل ارزیابی یافت نشد (تمام کلمات در لیست کلمات توقف هستند).</div>';
    return;
  }

  const maxScore = top15[0]?.score || 1;

  let html = `
    <div class="content-table-responsive">
      <table class="content-table">
        <thead>
          <tr>
            <th>واژه / کلیدواژه</th>
            <th>تکرار در متن</th>
            <th>شاخص فراوانی (TF)</th>
            <th>شاخص تمایز (IDF)</th>
            <th>وزن معنایی (TF-IDF)</th>
          </tr>
        </thead>
        <tbody>
  `;

  top15.forEach(item => {
    const relPercent = Math.min(100, Math.round((item.score / maxScore) * 100));
    html += `
      <tr>
        <td><b>${escapeHtml(item.term)}</b></td>
        <td>${item.count.toLocaleString('fa-IR')} بار</td>
        <td>${(item.tf * 100).toFixed(2)}%</td>
        <td>${item.idf.toFixed(2)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:600; color:var(--accent); min-width:38px;">${(item.score * 100).toFixed(1)}</span>
            <div class="bar-container">
              <div class="bar-fill" style="width:${relPercent}%;"></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  tfidfTableWrap.innerHTML = html;
}

function renderNgramsTable(words, ignoreStop) {
  if (!ngramsTableWrap) return;

  if (!words || words.length === 0) {
    ngramsTableWrap.innerHTML = '<div class="table-empty-notice">متن مقاله را وارد کنید تا عبارات پرتکرار استخراج شوند.</div>';
    return;
  }

  const size = activeNgramSize;
  const ngrams = {};
  let totalNgrams = 0;

  for (let i = 0; i <= words.length - size; i++) {
    const chunk = words.slice(i, i + size);
    if (ignoreStop) {
      if (chunk.every(w => isStopWord(w))) continue;
      if (size === 1 && (isStopWord(chunk[0]) || chunk[0].length < 2 || /^\d+$/.test(chunk[0]))) continue;
    }
    const phrase = chunk.join(' ').toLowerCase();
    ngrams[phrase] = (ngrams[phrase] || 0) + 1;
    totalNgrams++;
  }

  const sorted = Object.entries(ngrams)
    .map(([phrase, count]) => ({ phrase, count, percent: totalNgrams > 0 ? (count / totalNgrams) * 100 : 0 }))
    .filter(item => item.count >= (size > 1 ? 1 : 2))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (sorted.length === 0) {
    ngramsTableWrap.innerHTML = '<div class="table-empty-notice">عبارت پرتکراری در این دسته یافت نشد.</div>';
    return;
  }

  const maxCount = sorted[0]?.count || 1;

  let html = `
    <div class="content-table-responsive">
      <table class="content-table">
        <thead>
          <tr>
            <th>عبارت (${size === 1 ? 'کلمه' : size + ' کلمه‌ای'})</th>
            <th>تعداد تکرار</th>
            <th>فرکانس نسبی</th>
            <th>توزیع</th>
          </tr>
        </thead>
        <tbody>
  `;

  sorted.forEach(item => {
    const barW = Math.min(100, Math.round((item.count / maxCount) * 100));
    html += `
      <tr>
        <td><b>${escapeHtml(item.phrase)}</b></td>
        <td>${item.count.toLocaleString('fa-IR')} بار</td>
        <td>${item.percent.toFixed(2)}%</td>
        <td>
          <div class="bar-container">
            <div class="bar-fill" style="width:${barW}%;"></div>
          </div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  ngramsTableWrap.innerHTML = html;
}

function renderReadabilityChecklist(wordsCount, sentencesCount, paragraphsCount, uniqueWordsCount, kwStats) {
  if (!readabilityChecklistWrap) return;

  if (wordsCount === 0) {
    readabilityChecklistWrap.innerHTML = '<div class="table-empty-notice">متن مقاله را وارد کنید تا چک‌لیست سئو و شاخص خوانایی تحلیل شود.</div>';
    if (statSeoScore) statSeoScore.textContent = '--';
    if (statSeoStatus) statSeoStatus.textContent = 'متن را وارد کنید';
    return;
  }

  const items = [];
  let score = 0;

  // ۱. طول محتوا
  if (wordsCount >= 600) {
    score += 25;
    items.push({ icon: '✅', title: 'طول مقاله بسیار مناسب و جامع', desc: `متن شامل ${wordsCount.toLocaleString('fa-IR')} کلمه است که بالاتر از حداقل استاندارد مقالات عمیق گوگل (۶۰۰+ کلمه) است.`, status: 'ok' });
  } else if (wordsCount >= 300) {
    score += 18;
    items.push({ icon: 'ℹ️', title: 'طول مقاله مناسب برای یادداشت کوتاه', desc: `مقاله دارای ${wordsCount.toLocaleString('fa-IR')} کلمه است. برای رتبه‌گیری در کلمات رقابتی، گسترش محتوا به بالای ۶۰۰ کلمه پیشنهاد می‌شود.`, status: 'info' });
  } else {
    score += 10;
    items.push({ icon: '⚠️', title: 'محتوای کوتاه (خطر Thin Content)', desc: `تعداد کلمات (${wordsCount.toLocaleString('fa-IR')}) کمتر از ۳۰۰ کلمه است. موتورهای جستجو به مقالات دارای توضیحات کافی رتبه بهتری می‌دهند.`, status: 'warn' });
  }

  // ۲. وضعیت کلمات کلیدی هدف
  if (kwStats.length > 0) {
    const idealKws = kwStats.filter(k => k.density >= 0.8 && k.density <= 2.8);
    const stuffedKws = kwStats.filter(k => k.density > 3.5);
    const zeroKws = kwStats.filter(k => k.count === 0);

    if (stuffedKws.length > 0) {
      score += 5;
      items.push({ icon: '🚨', title: 'هشدار جدی چگالی کلمات (Keyword Stuffing)', desc: `کلمه «${stuffedKws[0].kw}» با چگالی ${stuffedKws[0].density.toFixed(1)}% بیش از حد تکرار شده است. حتماً آن را با کلمات هم‌معنی جایگزین کنید.`, status: 'err' });
    } else if (idealKws.length > 0) {
      score += 25;
      items.push({ icon: '✅', title: 'چگالی کلمات کلیدی هدف کاملاً طبیعی و استاندارد', desc: `کلمات کلیدی شما با میانگین چگالی ایده‌آل (بین ۱٪ الی ۲.۵٪) در سراسر متن توزیع شده‌اند.`, status: 'ok' });
    } else if (zeroKws.length === kwStats.length) {
      score += 5;
      items.push({ icon: '❌', title: 'کلمات کلیدی در متن استفاده نشده‌اند', desc: 'کلمات کلیدی هدف مشخص‌شده، در داخل متن مقاله یافت نشدند.', status: 'err' });
    } else {
      score += 15;
      items.push({ icon: 'ℹ️', title: 'چگالی کلمات کلیدی اندکی پایین است', desc: 'تعداد تکرار کلمات کلیدی کمتر از ۱٪ است؛ در صورت امکان در پاراگراف‌های مرتبط آن را بگنجانید.', status: 'info' });
    }

    // ۳. حضور در ۱۰۰ کلمه اول
    const inHook = kwStats.some(k => k.inFirst100);
    if (inHook) {
      score += 15;
      items.push({ icon: '✅', title: 'استفاده از کلمه کلیدی در مقدمه (۱۰۰ کلمه اول)', desc: 'کلمه کلیدی هدف در پاراگراف ابتدایی مقاله قرار دارد که به درک سریع ربات‌های گوگل از موضوع مقاله کمک می‌کند.', status: 'ok' });
    } else {
      score += 5;
      items.push({ icon: '⚠️', title: 'عدم استفاده از کلمه کلیدی در مقدمه', desc: 'پیشنهاد می‌شود در ۱۰۰ کلمه ابتدایی مقاله، حداقل یک‌بار به کلمه کلیدی اصلی اشاره کنید.', status: 'warn' });
    }
  } else {
    score += 35;
    items.push({ icon: 'ℹ️', title: 'عدم تعیین کلمات کلیدی هدف', desc: 'برای دریافت تحلیل دقیق‌تر کیورد استافینگ و هوک مقدمه، کلمات کلیدی هدف را در فیلد بالا وارد کنید.', status: 'info' });
  }

  // ۴. میانگین طول جملات (خوانایی)
  const avgWordsPerSentence = sentencesCount > 0 ? (wordsCount / sentencesCount) : 0;
  if (avgWordsPerSentence <= 20) {
    score += 20;
    items.push({ icon: '✅', title: 'طول جملات مناسب و خوانایی بسیار روان', desc: `میانگین طول هر جمله ${avgWordsPerSentence.toFixed(1)} کلمه است که مطالعه متن را برای کاربر دلنشین و سریع می‌کند.`, status: 'ok' });
  } else if (avgWordsPerSentence <= 28) {
    score += 12;
    items.push({ icon: 'ℹ️', title: 'طول متوسط جملات', desc: `میانگین جملات (${avgWordsPerSentence.toFixed(1)} کلمه) اندکی طولانی است؛ شکستن جملات با نقطه به خوانایی کمک می‌کند.`, status: 'info' });
  } else {
    score += 5;
    items.push({ icon: '⚠️', title: 'جملات طولانی و سخت‌خوان', desc: `میانگین طول جملات ${avgWordsPerSentence.toFixed(1)} کلمه است. جملات طولانی در وب باعث خستگی مخاطب و افزایش بانس ریت می‌شود.`, status: 'warn' });
  }

  // ۵. تنوع لغوی (Lexical Richness)
  const lexicalRatio = wordsCount > 0 ? (uniqueWordsCount / wordsCount) : 0;
  if (lexicalRatio >= 0.40) {
    score += 15;
    items.push({ icon: '✅', title: 'دایره واژگان غنی و تنوع کلمات بالا', desc: `${(lexicalRatio * 100).toFixed(0)}% از کلمات مقاله یکتا هستند که نشان‌دهنده کیفیت نگارش و ارزش بالا برای الگوریتم‌های هوش مصنوعی گوگل است.`, status: 'ok' });
  } else {
    score += 8;
    items.push({ icon: 'ℹ️', title: 'تنوع کلمات در سطح متوسط', desc: 'نسبت واژگان یکتا کمتر از ۴۰٪ است؛ تنوع بیشتر عبارات هم‌معنی ارزش محتوایی متن را بالا می‌برد.', status: 'info' });
  }

  score = Math.min(100, Math.max(10, score));

  if (statSeoScore) {
    statSeoScore.textContent = `${score.toLocaleString('fa-IR')} / ۱۰۰`;
  }
  if (statSeoStatus) {
    if (score >= 80) {
      statSeoStatus.textContent = 'کیفیت بسیار عالی ✔';
      statSeoStatus.style.color = 'var(--ok)';
    } else if (score >= 60) {
      statSeoStatus.textContent = 'خوب، نیازمند بهبود جزئی ⚠';
      statSeoStatus.style.color = 'var(--warn)';
    } else {
      statSeoStatus.textContent = 'نیازمند بازبینی و بهبود ❌';
      statSeoStatus.style.color = '#ef4444';
    }
  }

  let html = '<div class="checklist-items-wrap">';
  items.forEach(it => {
    html += `
      <div class="checklist-item">
        <span class="checklist-icon">${it.icon}</span>
        <div class="checklist-content">
          <div class="checklist-title">${escapeHtml(it.title)}</div>
          <div class="checklist-desc">${escapeHtml(it.desc)}</div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  readabilityChecklistWrap.innerHTML = html;
}

[contentTextInput, contentKeywordsInput].forEach(el => {
  el?.addEventListener('input', updateContentAnalysis);
});
contentIgnoreStopWords?.addEventListener('change', updateContentAnalysis);

contentSampleBtn?.addEventListener('click', () => {
  if (contentTextInput && contentKeywordsInput) {
    contentKeywordsInput.value = 'سئو داخلی, تولید محتوا, بهینه‌سازی سایت';
    contentTextInput.value = `سئو داخلی و تولید محتوای باکیفیت، اساسی‌ترین گام برای کسب رتبه‌های برتر در موتورهای جستجو هستند. زمانی که یک وبمستر بهینه‌سازی سایت را آغاز می‌کند، هدف اصلی او درک نیاز کاربر و جلب اعتماد الگوریتم‌های گوگل است.

تولید محتوا نباید صرفاً با هدف تکرار مکانیکی کلمات انجام شود. استفاده افراطی از کلمات کلیدی، که در اصطلاح سئو به آن کیورد استافینگ (Keyword Stuffing) گفته می‌شود، نه تنها رتبه سایت را بهبود نمی‌دهد، بلکه می‌تواند جریمه‌های سنگین الگوریتم‌های هوش مصنوعی مانند رنک‌برین و مفید بودن محتوا را در پی داشته باشد.

برای موفقیت پایدار، ساختار مقاله باید شامل تیترهای منظم، پاراگراف‌های کوتاه و روان و دایره واژگان غنی باشد. رعایت چگالی متعادل کلمات کلیدی (بین ۱ الی ۲.۵ درصد) به موتورهای جستجو سیگنال می‌دهد که مقاله طبیعی و نوشته‌شده برای انسان است.

در نهایت، سئو داخلی یک فرآیند مستمر است. با آنالیز مداوم عملکرد صفحات، پایش زمان مطالعه کاربران و غنی‌سازی لینک‌سازی داخلی، وبسایت شما می‌تواند جایگاه خود را در صفحه اول نتایج جستجو تثبیت نماید.`;
    updateContentAnalysis();
    toast('مقاله نمونه سئو با موفقیت بارگذاری شد 📝');
  }
});

contentResetBtn?.addEventListener('click', () => {
  if (contentTextInput) contentTextInput.value = '';
  if (contentKeywordsInput) contentKeywordsInput.value = '';
  updateContentAnalysis();
  toast('محتوا پاکسازی شد');
});

contentCopyReportBtn?.addEventListener('click', () => {
  if (!contentTextInput || !contentTextInput.value.trim()) {
    toast('ابتدا متنی برای آنالیز وارد کنید');
    return;
  }
  const words = statWords?.textContent || '۰';
  const chars = statCharsWithSpace?.textContent || '۰';
  const readTime = statReadTime?.textContent || '۰';
  const score = statSeoScore?.textContent || '--';
  const scoreStatus = statSeoStatus?.textContent || '';
  const kws = contentKeywordsInput?.value.trim() || 'تعریف نشده';

  const report = [
    '📊 گزارش آنالیز محتوا و سئو (جعبه‌ابزار سئو)',
    '──────────────────────────',
    `📝 تعداد کلمات: ${words} کلمه`,
    `🔤 تعداد کاراکترها: ${chars}`,
    `⏱ زمان تقریبی مطالعه: ${readTime}`,
    `🎯 کلمات کلیدی هدف: ${kws}`,
    `⭐️ نمره سلامت سئو: ${score} (${scoreStatus})`,
    '──────────────────────────',
    'تولید شده با: جعبه‌ابزار آنلاین سئو'
  ].join('\n');

  copyText(report);
  toast('گزارش خلاصه سئو در کلیپ‌بورد کپی شد 📋');
});


/* ───────────────────────────── کتابخانه کلاینت‌ساید تولید QR Code ───────────────────────────── */
var qrcode=function(){function i(t,r){function a(t,r){g=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(l=4*u+17),e(0,0),e(l-7,0),e(0,l-7),i(),o(),v(t,r),7<=u&&h(t),null==n&&(n=w(u,f,c)),d(n,r)}var u=t,f=y[r],g=null,l=0,n=null,c=[],s={},e=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||l<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||l<=r+n||(g[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},o=function(){for(var t=8;t<l-8;t+=1)null==g[t][6]&&(g[t][6]=t%2==0);for(var r=8;r<l-8;r+=1)null==g[6][r]&&(g[6][r]=r%2==0)},i=function(){for(var t=B.getPatternPosition(u),r=0;r<t.length;r+=1)for(var e=0;e<t.length;e+=1){var n=t[r],o=t[e];if(null==g[n][o])for(var i=-2;i<=2;i+=1)for(var a=-2;a<=2;a+=1)g[n+i][o+a]=-2==i||2==i||-2==a||2==a||0==i&&0==a}},h=function(t){for(var r=B.getBCHTypeNumber(u),e=0;e<18;e+=1){var n=!t&&1==(r>>e&1);g[Math.floor(e/3)][e%3+l-8-3]=n}for(e=0;e<18;e+=1){n=!t&&1==(r>>e&1);g[e%3+l-8-3][Math.floor(e/3)]=n}},v=function(t,r){for(var e=f<<3|r,n=B.getBCHTypeInfo(e),o=0;o<15;o+=1){var i=!t&&1==(n>>o&1);o<6?g[o][8]=i:o<8?g[o+1][8]=i:g[l-15+o][8]=i}for(o=0;o<15;o+=1){i=!t&&1==(n>>o&1);o<8?g[8][l-o-1]=i:o<9?g[8][15-o-1+1]=i:g[8][15-o-1]=i}g[l-8][8]=!t},d=function(t,r){for(var e=-1,n=l-1,o=7,i=0,a=B.getMaskFunction(r),u=l-1;0<u;u-=2)for(6==u&&(u-=1);;){for(var f=0;f<2;f+=1)if(null==g[n][u-f]){var c=!1;i<t.length&&(c=1==(t[i]>>>o&1)),a(n,u-f)&&(c=!c),g[n][u-f]=c,-1==(o-=1)&&(i+=1,o=7)}if((n+=e)<0||l<=n){n-=e,e=-e;break}}},w=function(t,r,e){for(var n=b.getRSBlocks(t,r),o=M(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=C(i[u],l.getLength()-1).mod(l);a[u]=new Array(l.getLength()-1);for(g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=0<=s?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};s.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=x(t);break;case"Alphanumeric":e=m(t);break;case"Byte":e=L(t);break;case"Kanji":e=D(t);break;default:throw"mode:"+r}c.push(e),n=null},s.isDark=function(t,r){if(t<0||l<=t||r<0||l<=r)throw t+","+r;return g[t][r]},s.getModuleCount=function(){return l},s.make=function(){if(u<1){for(var t=1;t<40;t++){for(var r=b.getRSBlocks(t,f),e=M(),n=0;n<c.length;n++){var o=c[n];e.put(o.getMode(),4),e.put(o.getLength(),B.getLengthInBits(o.getMode(),t)),o.write(e)}var i=0;for(n=0;n<r.length;n++)i+=r[n].dataCount;if(e.getLengthInBits()<=8*i)break}u=t}a(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){a(!0,e);var n=B.getLostPoint(s);(0==e||n<t)&&(t=n,r=e)}return r}())},s.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<s.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<s.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=s.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},s.createSvgTag=function(t,r,e,n){var o={};"object"==typeof t&&(t=(o=t).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,f,c=s.getModuleCount()*t+2*r,g="";for(f="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",g+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',g+=o.scalable?"":' width="'+c+'px" height="'+c+'px"',g+=' viewBox="0 0 '+c+" "+c+'" ',g+=' preserveAspectRatio="xMinYMin meet"',g+=n.text||e.text?' role="img" aria-labelledby="'+p([n.id,e.id].join(" ").trim())+'"':"",g+=">",g+=n.text?'<title id="'+p(n.id)+'">'+p(n.text)+"</title>":"",g+=e.text?'<description id="'+p(e.id)+'">'+p(e.text)+"</description>":"",g+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',g+='<path d="',a=0;a<s.getModuleCount();a+=1)for(u=a*t+r,i=0;i<s.getModuleCount();i+=1)s.isDark(a,i)&&(g+="M"+(i*t+r)+","+u+f);return g+='" stroke="transparent" fill="black"/>',g+="</svg>"},s.createDataURL=function(o,t){o=o||2,t=void 0===t?4*o:t;var r=s.getModuleCount()*o+2*t,i=t,a=r-t;return I(r,r,function(t,r){if(i<=t&&t<a&&i<=r&&r<a){var e=Math.floor((t-i)/o),n=Math.floor((r-i)/o);return s.isDark(n,e)?0:1}return 1})},s.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=s.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=s.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=p(e),o+='"'),o+="/>"};var p=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return s.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*s.getModuleCount()+2*t,u=t,f=a-t,c={"██":"█","█ ":"▀"," █":"▄","  ":" "},g={"██":"▀","█ ":"▀"," █":" ","  ":" "},l="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<f&&u<=r&&r<f&&s.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<f&&u<=r+1&&r+1<f&&s.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",l+=t<1&&f<=r+1?g[i]:c[i];l+="\n"}return a%2&&0<t?l.substring(0,l.length-a-1)+Array(1+a).join("▀"):l.substring(0,l.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=s.getModuleCount()*t+2*r,u=r,f=a-r,c=Array(t+1).join("██"),g=Array(t+1).join("  "),l="",h="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),h="",n=0;n<a;n+=1)i=1,u<=n&&n<f&&u<=e&&e<f&&s.isDark(o,Math.floor((n-u)/t))&&(i=0),h+=i?c:g;for(o=0;o<t;o+=1)l+=h+"\n"}return l.substring(0,l.length-1)},s.renderTo2dContext=function(t,r){r=r||2;for(var e=s.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=s.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},s}i.stringToBytes=(i.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,i.createStringToBytes=function(u,f){var i=function(){function t(){var t=r.read();if(-1==t)throw"eof";return t}for(var r=S(u),e=0,n={};;){var o=r.read();if(-1==o)break;var i=t(),a=t()<<8|t();n[String.fromCharCode(o<<8|i)]=a,e+=1}if(e!=f)throw e+" != "+f;return n}(),a="?".charCodeAt(0);return function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);if(n<128)r.push(n);else{var o=i[t.charAt(e)];"number"==typeof o?(255&o)==o?r.push(o):(r.push(o>>>8),r.push(255&o)):r.push(a)}}return r}};var r,t,a=1,u=2,o=4,f=8,y={L:1,M:0,Q:3,H:2},e=0,n=1,c=2,g=3,l=4,h=5,s=6,v=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],(t={}).getBCHTypeInfo=function(t){for(var r=t<<10;0<=d(r)-d(1335);)r^=1335<<d(r)-d(1335);return 21522^(t<<10|r)},t.getBCHTypeNumber=function(t){for(var r=t<<12;0<=d(r)-d(7973);)r^=7973<<d(r)-d(7973);return t<<12|r},t.getPatternPosition=function(t){return r[t-1]},t.getMaskFunction=function(t){switch(t){case e:return function(t,r){return(t+r)%2==0};case n:return function(t,r){return t%2==0};case c:return function(t,r){return r%3==0};case g:return function(t,r){return(t+r)%3==0};case l:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case h:return function(t,r){return t*r%2+t*r%3==0};case s:return function(t,r){return(t*r%2+t*r%3)%2==0};case v:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},t.getErrorCorrectPolynomial=function(t){for(var r=C([1],0),e=0;e<t;e+=1)r=r.multiply(C([1,w.gexp(e)],0));return r},t.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case o:case f:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case o:return 16;case f:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case o:return 16;case f:return 12;default:throw"mode:"+t}}},t.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);5<i&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},t);function d(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r}var w=function(){for(var r=new Array(256),e=new Array(256),t=0;t<8;t+=1)r[t]=1<<t;for(t=8;t<256;t+=1)r[t]=r[t-4]^r[t-5]^r[t-6]^r[t-8];for(t=0;t<255;t+=1)e[r[t]]=t;var n={glog:function(t){if(t<1)throw"glog("+t+")";return e[t]},gexp:function(t){for(;t<0;)t+=255;for(;256<=t;)t-=255;return r[t]}};return n}();function C(n,o){if(void 0===n.length)throw n.length+"/"+o;var r=function(){for(var t=0;t<n.length&&0==n[t];)t+=1;for(var r=new Array(n.length-t+o),e=0;e<n.length-t;e+=1)r[e]=n[e+t];return r}(),i={getAt:function(t){return r[t]},getLength:function(){return r.length},multiply:function(t){for(var r=new Array(i.getLength()+t.getLength()-1),e=0;e<i.getLength();e+=1)for(var n=0;n<t.getLength();n+=1)r[e+n]^=w.gexp(w.glog(i.getAt(e))+w.glog(t.getAt(n)));return C(r,0)},mod:function(t){if(i.getLength()-t.getLength()<0)return i;for(var r=w.glog(i.getAt(0))-w.glog(t.getAt(0)),e=new Array(i.getLength()),n=0;n<i.getLength();n+=1)e[n]=i.getAt(n);for(n=0;n<t.getLength();n+=1)e[n]^=w.gexp(w.glog(t.getAt(n))+r);return C(e,0).mod(t)}};return i}function p(){var e=[],o={writeByte:function(t){e.push(255&t)},writeShort:function(t){o.writeByte(t),o.writeByte(t>>>8)},writeBytes:function(t,r,e){r=r||0,e=e||t.length;for(var n=0;n<e;n+=1)o.writeByte(t[n+r])},writeString:function(t){for(var r=0;r<t.length;r+=1)o.writeByte(t.charCodeAt(r))},toByteArray:function(){return e},toString:function(){var t="";t+="[";for(var r=0;r<e.length;r+=1)0<r&&(t+=","),t+=e[r];return t+="]"}};return o}var k,A,b=(k=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],(A={}).getRSBlocks=function(t,r){var e=function(t,r){switch(r){case y.L:return k[4*(t-1)+0];case y.M:return k[4*(t-1)+1];case y.Q:return k[4*(t-1)+2];case y.H:return k[4*(t-1)+3];default:return}}(t,r);if(void 0===e)throw"bad rs block @ typeNumber:"+t+"/errorCorrectionLevel:"+r;for(var n,o,i=e.length/3,a=[],u=0;u<i;u+=1)for(var f=e[3*u+0],c=e[3*u+1],g=e[3*u+2],l=0;l<f;l+=1)a.push((n=g,o=void 0,(o={}).totalCount=c,o.dataCount=n,o));return a},A),M=function(){var e=[],n=0,o={getBuffer:function(){return e},getAt:function(t){var r=Math.floor(t/8);return 1==(e[r]>>>7-t%8&1)},put:function(t,r){for(var e=0;e<r;e+=1)o.putBit(1==(t>>>r-e-1&1))},getLengthInBits:function(){return n},putBit:function(t){var r=Math.floor(n/8);e.length<=r&&e.push(0),t&&(e[r]|=128>>>n%8),n+=1}};return o},x=function(t){var r=a,n=t,e={getMode:function(){return r},getLength:function(t){return n.length},write:function(t){for(var r=n,e=0;e+2<r.length;)t.put(o(r.substring(e,e+3)),10),e+=3;e<r.length&&(r.length-e==1?t.put(o(r.substring(e,e+1)),4):r.length-e==2&&t.put(o(r.substring(e,e+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return e},m=function(t){var r=u,n=t,e={getMode:function(){return r},getLength:function(t){return n.length},write:function(t){for(var r=n,e=0;e+1<r.length;)t.put(45*o(r.charAt(e))+o(r.charAt(e+1)),11),e+=2;e<r.length&&t.put(o(r.charAt(e)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return e},L=function(t){var r=o,e=i.stringToBytes(t),n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=0;r<e.length;r+=1)t.put(e[r],8)}};return n},D=function(t){var r=f,e=i.stringToBytesFuncs.SJIS;if(!e)throw"sjis not supported.";!function(){var t=e("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=e(t),n={getMode:function(){return r},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return n},S=function(t){var e=t,n=0,o=0,i=0,r={read:function(){for(;i<8;){if(n>=e.length){if(0==i)return-1;throw"unexpected end of file./"+i}var t=e.charAt(n);if(n+=1,"="==t)return i=0,-1;t.match(/^\s$/)||(o=o<<6|a(t.charCodeAt(0)),i+=6)}var r=o>>>i-8&255;return i-=8,r}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return r},I=function(t,r,e){for(var n=function(t,r){var n=t,o=r,l=new Array(t*r),e={setPixel:function(t,r,e){l[r*n+t]=e},write:function(t){t.writeString("GIF87a"),t.writeShort(n),t.writeShort(o),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(n),t.writeShort(o),t.writeByte(0);var r=i(2);t.writeByte(2);for(var e=0;255<r.length-e;)t.writeByte(255),t.writeBytes(r,e,255),e+=255;t.writeByte(r.length-e),t.writeBytes(r,e,r.length-e),t.writeByte(0),t.writeString(";")}},i=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,o=h(),i=0;i<r;i+=1)o.add(String.fromCharCode(i));o.add(String.fromCharCode(r)),o.add(String.fromCharCode(e));var a=p(),u=function(t){var e=t,n=0,o=0,r={write:function(t,r){if(t>>>r!=0)throw"length over";for(;8<=n+r;)e.writeByte(255&(t<<n|o)),r-=8-n,t>>>=8-n,n=o=0;o|=t<<n,n+=r},flush:function(){0<n&&e.writeByte(o)}};return r}(a);u.write(r,n);var f=0,c=String.fromCharCode(l[f]);for(f+=1;f<l.length;){var g=String.fromCharCode(l[f]);f+=1,o.contains(c+g)?c+=g:(u.write(o.indexOf(c),n),o.size()<4095&&(o.size()==1<<n&&(n+=1),o.add(c+g)),c=g)}return u.write(o.indexOf(c),n),u.write(e,n),u.flush(),a.toByteArray()},h=function(){var r={},e=0,n={add:function(t){if(n.contains(t))throw"dup key:"+t;r[t]=e,e+=1},size:function(){return e},indexOf:function(t){return r[t]},contains:function(t){return void 0!==r[t]}};return n};return e}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=p();n.write(a);for(var u=function(){function e(t){a+=String.fromCharCode(r(63&t))}var n=0,o=0,i=0,a="",t={},r=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return t.writeByte=function(t){for(n=n<<8|255&t,o+=8,i+=1;6<=o;)e(n>>>o-6),o-=6},t.flush=function(){if(0<o&&(e(n<<6-o),o=n=0),i%3!=0)for(var t=3-i%3,r=0;r<t;r+=1)a+="="},t.toString=function(){return a},t}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return i}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||57344<=n?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}(function(){return qrcode});

/* ───────────────────────────── سازنده لینک‌های UTM و QR Code (UTM Builder) ───────────────────────────── */
const UTM_HISTORY_KEY = 'seo-utm-history';

const utmUrlInput = document.getElementById('utmUrl');
const utmSourceInput = document.getElementById('utmSource');
const utmMediumInput = document.getElementById('utmMedium');
const utmCampaignInput = document.getElementById('utmCampaign');
const utmTermInput = document.getElementById('utmTerm');
const utmContentInput = document.getElementById('utmContent');
const utmAutoLowercase = document.getElementById('utmAutoLowercase');
const utmReplaceSpaces = document.getElementById('utmReplaceSpaces');

const utmResultBox = document.getElementById('utmResultBox');
const utmCharCount = document.getElementById('utmCharCount');
const utmCopyBtn = document.getElementById('utmCopyBtn');
const utmTestLinkBtn = document.getElementById('utmTestLinkBtn');
const utmSampleBtn = document.getElementById('utmSampleBtn');
const utmResetBtn = document.getElementById('utmResetBtn');

const utmQrCanvas = document.getElementById('utmQrCanvas');
const utmDownloadQrBtn = document.getElementById('utmDownloadQrBtn');
const utmHistoryList = document.getElementById('utmHistoryList');
const utmClearHistoryBtn = document.getElementById('utmClearHistoryBtn');

function cleanUtmParam(val, isUrl = false) {
  if (!val) return '';
  let str = val.trim();
  if (isUrl) return str;

  if (utmReplaceSpaces && utmReplaceSpaces.checked) {
    str = str.replace(/\s+/g, '-');
  }
  if (utmAutoLowercase && utmAutoLowercase.checked) {
    str = str.toLowerCase();
  }
  return str;
}

function buildFinalUtmUrl() {
  const rawUrl = cleanUtmParam(utmUrlInput?.value || '', true);
  if (!rawUrl) return '';

  let finalUrl = rawUrl;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }

  const source = cleanUtmParam(utmSourceInput?.value || '');
  const medium = cleanUtmParam(utmMediumInput?.value || '');
  const campaign = cleanUtmParam(utmCampaignInput?.value || '');
  const term = cleanUtmParam(utmTermInput?.value || '');
  const content = cleanUtmParam(utmContentInput?.value || '');

  try {
    const urlObj = new URL(finalUrl);
    if (source) urlObj.searchParams.set('utm_source', source);
    if (medium) urlObj.searchParams.set('utm_medium', medium);
    if (campaign) urlObj.searchParams.set('utm_campaign', campaign);
    if (term) urlObj.searchParams.set('utm_term', term);
    if (content) urlObj.searchParams.set('utm_content', content);
    return urlObj.toString();
  } catch {
    // اگر ساختار URL موقتاً ناقص است، ترکیب دستی ایجاد شود
    const params = [];
    if (source) params.push(`utm_source=${encodeURIComponent(source)}`);
    if (medium) params.push(`utm_medium=${encodeURIComponent(medium)}`);
    if (campaign) params.push(`utm_campaign=${encodeURIComponent(campaign)}`);
    if (term) params.push(`utm_term=${encodeURIComponent(term)}`);
    if (content) params.push(`utm_content=${encodeURIComponent(content)}`);

    if (!params.length) return finalUrl;
    const separator = finalUrl.includes('?') ? '&' : '?';
    return finalUrl + separator + params.join('&');
  }
}

function renderQrOnCanvas(text) {
  if (!utmQrCanvas) return;
  const ctx = utmQrCanvas.getContext('2d');
  const size = 180;
  utmQrCanvas.width = size;
  utmQrCanvas.height = size;

  if (!text || typeof qrcode === 'undefined') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code پس از تکمیل فرم', size / 2, size / 2);
    return;
  }

  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const cellSize = size / count;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(Math.floor(c * cellSize), Math.floor(r * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }
  } catch (err) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('طول لینک برای QR زیاد است', size / 2, size / 2);
  }
}

function formatUtmUrlHtml(url) {
  if (!url) return '';
  const qIdx = url.indexOf('?');
  if (qIdx === -1) {
    return `<span class="utm-url-base">${esc(url)}</span>`;
  }
  const base = url.slice(0, qIdx);
  const query = url.slice(qIdx + 1);
  const parts = query.split('&').map(pair => {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      return `<span class="utm-param-sep">&amp;</span><span class="utm-param-key">${esc(pair)}</span>`;
    }
    const key = pair.slice(0, eqIdx);
    const val = pair.slice(eqIdx + 1);
    return `<span class="utm-param-sep">&amp;</span><span class="utm-param-key">${esc(key)}</span><span class="utm-param-eq">=</span><span class="utm-param-val">${esc(val)}</span>`;
  });
  let queryHtml = parts.join('');
  if (queryHtml.startsWith('<span class="utm-param-sep">&amp;</span>')) {
    queryHtml = '<span class="utm-param-sep">?</span>' + queryHtml.slice('<span class="utm-param-sep">&amp;</span>'.length);
  }
  return `<span class="utm-url-base">${esc(base)}</span>${queryHtml}`;
}

function updateUtmOutput() {
  if (!utmResultBox) return;
  const url = buildFinalUtmUrl();

  if (!url || (!utmSourceInput?.value && !utmMediumInput?.value && !utmCampaignInput?.value)) {
    utmResultBox.textContent = 'لطفاً آدرس سایت و فیلدهای ستاره‌دار مبدأ، رسانه و نام کمپین را پر کنید...';
    utmResultBox.classList.add('is-placeholder');
    if (utmCharCount) utmCharCount.textContent = '۰ کاراکتر';
    renderQrOnCanvas('');
    return;
  }

  utmResultBox.classList.remove('is-placeholder');
  utmResultBox.innerHTML = formatUtmUrlHtml(url);
  if (utmCharCount) {
    utmCharCount.textContent = `${url.length.toLocaleString('fa-IR')} کاراکتر`;
  }
  renderQrOnCanvas(url);
}

// ذخیره و مدیریت تاریخچه لینک‌ها
function saveUtmToHistory(url) {
  if (!url || url.length < 10) return;
  let history = safeParse(localStorage.getItem(UTM_HISTORY_KEY), []);
  history = history.filter(u => u !== url);
  history.unshift(url);
  if (history.length > 5) history = history.slice(0, 5);
  localStorage.setItem(UTM_HISTORY_KEY, JSON.stringify(history));
  renderUtmHistory();
}

function renderUtmHistory() {
  if (!utmHistoryList) return;
  const history = safeParse(localStorage.getItem(UTM_HISTORY_KEY), []);
  if (!history.length) {
    utmHistoryList.innerHTML = '<div style="font-size:0.75rem; color:var(--muted); text-align:center; padding:10px;">هنوز لینکی در این مرورگر ساخته نشده است.</div>';
    return;
  }

  let html = '';
  history.forEach(u => {
    html += `
      <div class="utm-history-item">
        <div class="utm-history-url" title="${escapeHtml(u)}">${escapeHtml(u)}</div>
        <button type="button" class="utm-history-copy-btn" onclick="copyText('${escapeHtml(u)}'); toast('لینک کپی شد ✔');">کپی</button>
      </div>
    `;
  });
  utmHistoryList.innerHTML = html;
}

// گوش دادن به ورودی‌ها
[utmUrlInput, utmSourceInput, utmMediumInput, utmCampaignInput, utmTermInput, utmContentInput].forEach(el => {
  el?.addEventListener('input', updateUtmOutput);
});
[utmAutoLowercase, utmReplaceSpaces].forEach(el => {
  el?.addEventListener('change', updateUtmOutput);
});

// پریست‌های سریع تبلیغاتی
document.querySelectorAll('.utm-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (utmSourceInput) utmSourceInput.value = btn.dataset.source || '';
    if (utmMediumInput) utmMediumInput.value = btn.dataset.medium || '';
    if (utmCampaignInput) utmCampaignInput.value = btn.dataset.campaign || '';
    if (!utmUrlInput?.value.trim()) {
      utmUrlInput.value = 'https://myshop.ir/special-offer';
    }
    updateUtmOutput();
    toast(`پریست «${btn.textContent.trim()}» اعمال شد ⚡`);
  });
});

// کپی لینک
utmCopyBtn?.addEventListener('click', () => {
  const url = buildFinalUtmUrl();
  if (!url || (!utmSourceInput?.value && !utmMediumInput?.value)) {
    toast('ابتدا اطلاعات کمپین را تکمیل کنید');
    return;
  }
  copyText(url);
  saveUtmToHistory(url);
  toast('لینک کامل کمپین کپی شد 📋');
});

// تست لینک
utmTestLinkBtn?.addEventListener('click', () => {
  const url = buildFinalUtmUrl();
  if (!url) {
    toast('ابتدا آدرس معتبری وارد کنید');
    return;
  }
  saveUtmToHistory(url);
  window.open(url, '_blank', 'noopener,noreferrer');
});

// دانلود تصویر QR Code به فرمت PNG با کیفیت بالا
utmDownloadQrBtn?.addEventListener('click', () => {
  if (!utmQrCanvas) return;
  const url = buildFinalUtmUrl();
  if (!url) {
    toast('ابتدا لینک کمپین را بسازید');
    return;
  }

  // ایجاد کنواس ۳۰۰ در ۳۰۰ با رزولوشن بالا برای دانلود
  const exportCanvas = document.createElement('canvas');
  const size = 320;
  exportCanvas.width = size;
  exportCanvas.height = size;
  const ctx = exportCanvas.getContext('2d');

  if (typeof qrcode !== 'undefined') {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    const cellSize = size / count;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(Math.floor(c * cellSize), Math.floor(r * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qrcode-${utmCampaignInput?.value.trim() || 'utm'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    saveUtmToHistory(url);
    toast('تصویر QR Code با کیفیت بالا دانلود شد 📥');
  }
});

// کمپین نمونه
utmSampleBtn?.addEventListener('click', () => {
  if (utmUrlInput && utmSourceInput && utmMediumInput && utmCampaignInput) {
    utmUrlInput.value = 'https://myshop.ir/products/smart-watch';
    utmSourceInput.value = 'yektanet';
    utmMediumInput.value = 'native';
    utmCampaignInput.value = 'norooz1405-special';
    if (utmTermInput) utmTermInput.value = 'smart-watch-discount';
    if (utmContentInput) utmContentInput.value = 'banner-top-blue';
    updateUtmOutput();
    toast('کمپین نمونه بارگذاری شد 🎯');
  }
});

// پاکسازی فرم
utmResetBtn?.addEventListener('click', () => {
  [utmUrlInput, utmSourceInput, utmMediumInput, utmCampaignInput, utmTermInput, utmContentInput].forEach(el => {
    if (el) el.value = '';
  });
  updateUtmOutput();
  toast('فرم پاکسازی شد');
});

// پاکسازی تاریخچه
utmClearHistoryBtn?.addEventListener('click', () => {
  localStorage.removeItem(UTM_HISTORY_KEY);
  renderUtmHistory();
  toast('تاریخچه کمپین‌ها پاک شد');
});


// ───────────────────────────── راه‌اندازی اولیه صفحه و ابزارها ─────────────────────────────
loadUserSubmittedTools();
initCustomSelects();
renderSchemaForm();
renderRobotsRules();
updateSitemapOutput();
updateSerpSimulation();
updateContentAnalysis();
updateUtmOutput();
renderUtmHistory();
checkInitialTab();

/* ───────────────────────────── سازنده ریدایرکت‌های ۳۰۱ و قوانین سرور (Redirect Generator) ───────────────────────────── */
const serverBtnApache = document.getElementById('serverBtnApache');
const serverBtnNginx = document.getElementById('serverBtnNginx');
const serverBtnCloudflare = document.getElementById('serverBtnCloudflare');

const redirForceHttps = document.getElementById('redirForceHttps');
const redirStripHtml = document.getElementById('redirStripHtml');
const redirWwwMode = document.getElementById('redirWwwMode');
const redirSlashMode = document.getElementById('redirSlashMode');
const redirDomain = document.getElementById('redirDomain');
const redirStatusCode = document.getElementById('redirStatusCode');
const redirUrlsInput = document.getElementById('redirUrlsInput');

const redirectCodeOutput = document.getElementById('redirectCodeOutput');
const redirOutputTitle = document.getElementById('redirOutputTitle');
const redirRulesCount = document.getElementById('redirRulesCount');
const redirGuideText = document.getElementById('redirGuideText');

const redirectCopyBtn = document.getElementById('redirectCopyBtn');
const redirectDownloadBtn = document.getElementById('redirectDownloadBtn');
const redirectSampleBtn = document.getElementById('redirectSampleBtn');
const redirectResetBtn = document.getElementById('redirectResetBtn');

let activeServerType = 'apache'; // 'apache' | 'nginx' | 'cloudflare'

function parseRedirectPairs(rawText) {
  if (!rawText) return [];
  const lines = rawText.split('\n');
  const pairs = [];
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    let parts = line.split(/\s*(?:->|,|\t|\s+)\s*/).filter(Boolean);
    if (parts.length >= 2) {
      let from = parts[0].trim();
      let to = parts[1].trim();
      pairs.push({ from, to });
    }
  }
  return pairs;
}

function generateApacheConfig(options) {
  const { forceHttps, stripHtml, wwwMode, slashMode, statusCode, pairs } = options;
  const lines = [
    '# ────────────────────────────────────────────────────────────',
    '# تنظیمات و ریدایرکت‌های سرور — تولیدشده با جعبه‌ابزار سئو',
    '# سرور: Apache / LiteSpeed (.htaccess)',
    '# ────────────────────────────────────────────────────────────',
    '',
    'RewriteEngine On',
    'RewriteBase /'
  ];
  let rulesCount = 0;

  if (forceHttps) {
    rulesCount++;
    lines.push(
      '',
      '# ۱. اجبار به پروتکل امن SSL (از HTTP به HTTPS)',
      'RewriteCond %{HTTPS} off',
      'RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]'
    );
  }

  if (wwwMode === 'non-www') {
    rulesCount++;
    lines.push(
      '',
      '# ۲. ریدایرکت نسخه www به بدون www (Canonical Domain)',
      'RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]',
      'RewriteRule ^(.*)$ https://%1/$1 [R=301,L]'
    );
  } else if (wwwMode === 'www') {
    rulesCount++;
    lines.push(
      '',
      '# ۲. ریدایرکت نسخه بدون www به با www',
      'RewriteCond %{HTTP_HOST} !^www\. [NC]',
      'RewriteRule ^(.*)$ https://www.%{HTTP_HOST}/$1 [R=301,L]'
    );
  }

  if (slashMode === 'remove') {
    rulesCount++;
    lines.push(
      '',
      '# ۳. حذف اسلش انتهای آدرس‌ها (Remove Trailing Slash)',
      'RewriteCond %{REQUEST_FILENAME} !-d',
      'RewriteRule ^(.*)/$ /$1 [L,R=301]'
    );
  } else if (slashMode === 'add') {
    rulesCount++;
    lines.push(
      '',
      '# ۳. افزودن اسلش به انتهای آدرس‌ها (Add Trailing Slash)',
      'RewriteCond %{REQUEST_FILENAME} !-f',
      'RewriteRule ^(.*[^/])$ /$1/ [L,R=301]'
    );
  }

  if (stripHtml) {
    rulesCount++;
    lines.push(
      '',
      '# ۴. حذف پسوند فایل‌ها (.html و .php) از آدرس‌ها',
      'RewriteCond %{THE_REQUEST} /([^.]+)\.(html|php) [NC]',
      'RewriteRule ^ /%1 [NC,L,R=301]'
    );
  }

  if (pairs.length > 0) {
    rulesCount += pairs.length;
    lines.push('', `# ۵. ریدایرکت صفحات (${statusCode})`);
    pairs.forEach(({ from, to }) => {
      let fromPath = from.startsWith('http') ? (new URL(from, 'http://localhost')).pathname : from;
      if (!fromPath.startsWith('/')) fromPath = '/' + fromPath;
      lines.push(`Redirect ${statusCode} ${fromPath} ${to}`);
    });
  }

  return { code: lines.join('\n'), rulesCount };
}

function generateNginxConfig(options) {
  const { forceHttps, stripHtml, wwwMode, slashMode, domain, statusCode, pairs } = options;
  const dom = domain || 'example.com';
  const lines = [
    '# ────────────────────────────────────────────────────────────',
    '# تنظیمات و ریدایرکت‌های سرور — تولیدشده با جعبه‌ابزار سئو',
    '# سرور: Nginx (nginx.conf)',
    '# ────────────────────────────────────────────────────────────',
    ''
  ];
  let rulesCount = 0;

  if (forceHttps) {
    rulesCount++;
    lines.push(
      '# ۱. هدایت تمام درخواست‌های پورت 80 به HTTPS',
      'server {',
      '    listen 80;',
      `    server_name ${dom} www.${dom};`,
      '    return 301 https://$host$request_uri;',
      '}',
      ''
    );
  }

  if (wwwMode === 'non-www') {
    rulesCount++;
    lines.push(
      '# ۲. ریدایرکت www به دامنه اصلی بدون www',
      'server {',
      '    listen 443 ssl http2;',
      `    server_name www.${dom};`,
      `    return 301 https://${dom}$request_uri;`,
      '}',
      ''
    );
  } else if (wwwMode === 'www') {
    rulesCount++;
    lines.push(
      '# ۲. ریدایرکت بدون www به دامنه با www',
      'server {',
      '    listen 443 ssl http2;',
      `    server_name ${dom};`,
      `    return 301 https://www.${dom}$request_uri;`,
      '}',
      ''
    );
  }

  lines.push(
    '# بلاک اصلی دامنه:',
    'server {',
    '    listen 443 ssl http2;',
    `    server_name ${wwwMode === 'www' ? 'www.' + dom : dom};`,
    '    root /var/www/html;'
  );

  if (slashMode === 'remove') {
    rulesCount++;
    lines.push('', '    # ۳. حذف اسلش پایانی', '    rewrite ^/(.*)/$ /$1 permanent;');
  } else if (slashMode === 'add') {
    rulesCount++;
    lines.push('', '    # ۳. افزودن اسلش پایانی', '    rewrite ^([^.\?]*[^/])$ $1/ permanent;');
  }

  if (stripHtml) {
    rulesCount++;
    lines.push(
      '',
      '    # ۴. حذف پسوند .html',
      '    if ($request_uri ~ ^/(.*)\.html$) {',
      '        return 301 /$1;',
      '    }'
    );
  }

  if (pairs.length > 0) {
    rulesCount += pairs.length;
    const flag = statusCode === '301' ? 'permanent' : 'redirect';
    lines.push('', `    # ۵. ریدایرکت اختصاصی صفحات (${statusCode})`);
    pairs.forEach(({ from, to }) => {
      let fromPath = from.startsWith('http') ? (new URL(from, 'http://localhost')).pathname : from;
      if (!fromPath.startsWith('/')) fromPath = '/' + fromPath;
      lines.push(`    rewrite ^${fromPath.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')}/?$ ${to} ${flag};`);
    });
  }

  lines.push('', '    location / {', '        try_files $uri $uri/ /index.php?$args;', '    }', '}');
  return { code: lines.join('\n'), rulesCount };
}

function generateCloudflareConfig(options) {
  const { statusCode, pairs, domain } = options;
  const lines = [
    '# ────────────────────────────────────────────────────────────',
    '# قوانین ریدایرکت کلودفلر / CDN — خروجی استاندارد CSV',
    '# در پنل کلودفلر: Rules > Redirect Rules > Bulk Redirects',
    '# ────────────────────────────────────────────────────────────',
    '# Source URL, Target URL, Status Code, Preserve Query, Subpath Matching'
  ];
  let rulesCount = pairs.length;
  const dom = domain ? `https://${domain}` : 'https://example.com';

  pairs.forEach(({ from, to }) => {
    let src = from.startsWith('http') ? from : dom + (from.startsWith('/') ? from : '/' + from);
    let dst = to.startsWith('http') ? to : dom + (to.startsWith('/') ? to : '/' + to);
    lines.push(`${src}, ${dst}, ${statusCode}, TRUE, FALSE`);
  });

  if (pairs.length === 0) {
    lines.push(`${dom}/old-page, ${dom}/new-page, ${statusCode}, TRUE, FALSE`);
    rulesCount = 1;
  }

  return { code: lines.join('\n'), rulesCount };
}

function updateRedirectOutput() {
  if (!redirectCodeOutput) return;

  const pairs = parseRedirectPairs(redirUrlsInput?.value || '');
  const options = {
    forceHttps: Boolean(redirForceHttps?.checked),
    stripHtml: Boolean(redirStripHtml?.checked),
    wwwMode: redirWwwMode?.value || 'none',
    slashMode: redirSlashMode?.value || 'none',
    domain: (redirDomain?.value || '').trim(),
    statusCode: redirStatusCode?.value || '301',
    pairs
  };

  let res;
  if (activeServerType === 'nginx') {
    res = generateNginxConfig(options);
    if (redirOutputTitle) redirOutputTitle.textContent = 'کد کانفیگ سرور Nginx (nginx.conf):';
    if (redirGuideText) redirGuideText.innerHTML = 'کدهای بالا را درون فایل کانفیگ دامنه (مثلاً <code>/etc/nginx/sites-available/default</code>) قرار داده و دستور <code>nginx -t && systemctl reload nginx</code> را اجرا کنید.';
  } else if (activeServerType === 'cloudflare') {
    res = generateCloudflareConfig(options);
    if (redirOutputTitle) redirOutputTitle.textContent = 'قوانین ریدایرکت کلودفلر (Cloudflare Bulk Redirects):';
    if (redirGuideText) redirGuideText.innerHTML = 'در پنل کلودفلر به مسیر <b>Rules > Redirect Rules</b> بروید یا از بخش <b>Bulk Redirects</b> فایل CSV قوانین را آپلود کنید.';
  } else {
    res = generateApacheConfig(options);
    if (redirOutputTitle) redirOutputTitle.textContent = 'کد فایل .htaccess (Apache / LiteSpeed):';
    if (redirGuideText) redirGuideText.innerHTML = 'فایل <code>.htaccess</code> را در ریشه هاست (پوشه <code>public_html</code>) قرار دهید یا خطوط بالا را به ابتدای فایل موجود اضافه نمایید.';
  }

  redirectCodeOutput.textContent = res.code;
  if (redirRulesCount) {
    redirRulesCount.textContent = `${res.rulesCount.toLocaleString('fa-IR')} قانون فعال`;
  }
}

function setServerType(server) {
  activeServerType = server;
  serverBtnApache?.classList.toggle('active', server === 'apache');
  serverBtnNginx?.classList.toggle('active', server === 'nginx');
  serverBtnCloudflare?.classList.toggle('active', server === 'cloudflare');
  updateRedirectOutput();
}

serverBtnApache?.addEventListener('click', () => setServerType('apache'));
serverBtnNginx?.addEventListener('click', () => setServerType('nginx'));
serverBtnCloudflare?.addEventListener('click', () => setServerType('cloudflare'));

[redirForceHttps, redirStripHtml, redirWwwMode, redirSlashMode, redirDomain, redirStatusCode, redirUrlsInput].forEach(el => {
  el?.addEventListener('input', updateRedirectOutput);
  el?.addEventListener('change', updateRedirectOutput);
});

redirectCopyBtn?.addEventListener('click', () => {
  if (redirectCodeOutput) {
    copyText(redirectCodeOutput.textContent);
    toast('کد کانفیگ سرور کپی شد ✔');
  }
});

redirectDownloadBtn?.addEventListener('click', () => {
  if (!redirectCodeOutput) return;
  const content = redirectCodeOutput.textContent;
  let filename = '.htaccess';
  let mime = 'text/plain;charset=utf-8';
  if (activeServerType === 'nginx') filename = 'nginx-redirects.conf';
  else if (activeServerType === 'cloudflare') {
    filename = 'cloudflare-redirects.csv';
    mime = 'text/csv;charset=utf-8';
  }
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`فایل ${filename} دانلود شد ✔`);
});

redirectSampleBtn?.addEventListener('click', () => {
  if (redirUrlsInput) {
    redirUrlsInput.value = '/old-tools /tools\n/sitemap /sitemap.xml\n/category/seo/old-post /blog/new-post\n/products/smart-watch-old /products/smart-watch';
  }
  if (redirForceHttps) redirForceHttps.checked = true;
  if (redirStripHtml) redirStripHtml.checked = true;
  if (redirWwwMode) redirWwwMode.value = 'non-www';
  if (redirSlashMode) redirSlashMode.value = 'remove';
  updateRedirectOutput();
  toast('تنظیمات نمونه ریدایرکت بارگذاری شد');
});

redirectResetBtn?.addEventListener('click', () => {
  if (redirUrlsInput) redirUrlsInput.value = '';
  if (redirForceHttps) redirForceHttps.checked = true;
  if (redirStripHtml) redirStripHtml.checked = false;
  if (redirWwwMode) redirWwwMode.value = 'none';
  if (redirSlashMode) redirSlashMode.value = 'none';
  updateRedirectOutput();
  toast('فرم ریدایرکت پاکسازی شد');
});


/* ───────────────────────────── ترکیب‌کننده کلمات کلیدی (Keyword Mixer) ───────────────────────────── */
const kwCol1 = document.getElementById('kwCol1');
const kwCol2 = document.getElementById('kwCol2');
const kwCol3 = document.getElementById('kwCol3');

const kwCount1 = document.getElementById('kwCount1');
const kwCount2 = document.getElementById('kwCount2');
const kwCount3 = document.getElementById('kwCount3');

const kwMatchBroad = document.getElementById('kwMatchBroad');
const kwMatchPhrase = document.getElementById('kwMatchPhrase');
const kwMatchExact = document.getElementById('kwMatchExact');
const kwMixPairs = document.getElementById('kwMixPairs');

const kwOutputText = document.getElementById('kwOutputText');
const kwTotalCount = document.getElementById('kwTotalCount');

const kwCopyBtn = document.getElementById('kwCopyBtn');
const kwCopyBtnBottom = document.getElementById('kwCopyBtnBottom');
const kwDownloadBtn = document.getElementById('kwDownloadBtn');
const kwDownloadBtnBottom = document.getElementById('kwDownloadBtnBottom');
const kwSampleBtn = document.getElementById('kwSampleBtn');
const kwResetBtn = document.getElementById('kwResetBtn');

function getLinesOfTextarea(ta) {
  if (!ta) return [];
  return ta.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function updateKeywordMixerOutput() {
  const l1 = getLinesOfTextarea(kwCol1);
  const l2 = getLinesOfTextarea(kwCol2);
  const l3 = getLinesOfTextarea(kwCol3);

  if (kwCount1) kwCount1.textContent = l1.length.toLocaleString('fa-IR');
  if (kwCount2) kwCount2.textContent = l2.length.toLocaleString('fa-IR');
  if (kwCount3) kwCount3.textContent = l3.length.toLocaleString('fa-IR');

  const matchBroad = Boolean(kwMatchBroad?.checked);
  const matchPhrase = Boolean(kwMatchPhrase?.checked);
  const matchExact = Boolean(kwMatchExact?.checked);
  const mixPairs = Boolean(kwMixPairs?.checked);

  if (l2.length === 0) {
    if (kwOutputText) kwOutputText.value = 'لطفاً حداقل ستون دوم (کلمات کلیدی اصلی) را پر کنید...';
    if (kwTotalCount) kwTotalCount.textContent = '۰ عبارت کلیدی';
    return;
  }

  const rawCombinations = new Set();
  const c1 = l1.length > 0 ? l1 : [''];
  const c3 = l3.length > 0 ? l3 : [''];

  c1.forEach(p1 => {
    l2.forEach(p2 => {
      c3.forEach(p3 => {
        const phrase = [p1, p2, p3].filter(Boolean).join(' ').trim();
        if (phrase) rawCombinations.add(phrase);
      });
    });
  });

  if (mixPairs) {
    if (l1.length > 0) {
      l1.forEach(p1 => {
        l2.forEach(p2 => {
          rawCombinations.add(`${p1} ${p2}`.trim());
        });
      });
    }
    if (l3.length > 0) {
      l2.forEach(p2 => {
        l3.forEach(p3 => {
          rawCombinations.add(`${p2} ${p3}`.trim());
        });
      });
    }
  }

  const anyMatch = matchBroad || matchPhrase || matchExact;
  const finalResults = [];

  rawCombinations.forEach(term => {
    if (matchBroad || !anyMatch) {
      finalResults.push(term);
    }
    if (matchPhrase) {
      finalResults.push(`"${term}"`);
    }
    if (matchExact) {
      finalResults.push(`[${term}]`);
    }
  });

  if (kwOutputText) {
    kwOutputText.value = finalResults.join('\n');
  }
  if (kwTotalCount) {
    kwTotalCount.textContent = `${finalResults.length.toLocaleString('fa-IR')} عبارت کلیدی`;
  }
}

[kwCol1, kwCol2, kwCol3].forEach(el => el?.addEventListener('input', updateKeywordMixerOutput));
[kwMatchBroad, kwMatchPhrase, kwMatchExact, kwMixPairs].forEach(el => el?.addEventListener('change', updateKeywordMixerOutput));

function copyKeywordOutput() {
  if (kwOutputText && kwOutputText.value) {
    copyText(kwOutputText.value);
    toast('تمام کلمات کلیدی کپی شدند ✔');
  }
}

function downloadKeywordOutput() {
  if (!kwOutputText || !kwOutputText.value) return;
  // Use UTF-8 BOM so Persian text opens properly in Windows Excel / Notepad
  const blob = new Blob(['\uFEFF' + kwOutputText.value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'keywords-mixed.txt';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('فایل keywords-mixed.txt دانلود شد ✔');
}

kwCopyBtn?.addEventListener('click', copyKeywordOutput);
kwCopyBtnBottom?.addEventListener('click', copyKeywordOutput);
kwDownloadBtn?.addEventListener('click', downloadKeywordOutput);
kwDownloadBtnBottom?.addEventListener('click', downloadKeywordOutput);

kwSampleBtn?.addEventListener('click', () => {
  if (kwCol1) kwCol1.value = 'خرید\nقیمت\nبهترین\nفروشگاه آنلاین\nلیست قیمت';
  if (kwCol2) kwCol2.value = 'گوشی موبایل\nلپ تاپ\nساعت هوشمند\nهدفون بلوتوثی';
  if (kwCol3) kwCol3.value = 'سامسونگ\nشیائومی\nاپل\nارزان\nبا گارانتی';
  if (kwMatchBroad) kwMatchBroad.checked = true;
  if (kwMatchPhrase) kwMatchPhrase.checked = true;
  if (kwMatchExact) kwMatchExact.checked = false;
  if (kwMixPairs) kwMixPairs.checked = true;
  updateKeywordMixerOutput();
  toast('کلمات نمونه بارگذاری و ترکیب شدند');
});

kwResetBtn?.addEventListener('click', () => {
  if (kwCol1) kwCol1.value = '';
  if (kwCol2) kwCol2.value = '';
  if (kwCol3) kwCol3.value = '';
  updateKeywordMixerOutput();
  toast('ستون‌های کلمات پاکسازی شدند');
});


/* ───────────────────────────── سیستم نصب هوشمند وب‌اپلیکیشن (PWA Install System) ───────────────────────────── */
let deferredPwaPrompt = null;
const installPwaBtn = document.getElementById('installPwaBtn');
const pwaBanner = document.getElementById('pwaBanner');
const pwaBannerInstallBtn = document.getElementById('pwaBannerInstallBtn');
const pwaBannerCloseBtn = document.getElementById('pwaBannerCloseBtn');
const pwaGuideModal = document.getElementById('pwaGuideModal');
const closePwaModalBtn = document.getElementById('closePwaModalBtn');
const pwaNativeBox = document.getElementById('pwaNativeBox');
const pwaModalInstallActionBtn = document.getElementById('pwaModalInstallActionBtn');
const reEnablePwaBannerBtn = document.getElementById('reEnablePwaBannerBtn');
const footerInstallBtn = document.getElementById('footerInstallBtn');

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// در صورتی که کاربر از قبل اپ را به صورت standalone نصب و باز کرده است، دکمه‌های نصب را مخفی می‌کنیم
if (isRunningStandalone()) {
  if (installPwaBtn) installPwaBtn.style.display = 'none';
  if (pwaBanner) pwaBanner.style.display = 'none';
  if (footerInstallBtn) footerInstallBtn.style.display = 'none';
}

function openPwaModal() {
  if (pwaGuideModal) {
    if (deferredPwaPrompt && pwaNativeBox) {
      pwaNativeBox.hidden = false;
      pwaNativeBox.style.display = 'block';
    } else if (pwaNativeBox) {
      pwaNativeBox.hidden = true;
      pwaNativeBox.style.display = 'none';
    }
    pwaGuideModal.showModal();
  } else {
    triggerPwaInstall();
  }
}

function closePwaModal() {
  pwaGuideModal?.close();
}

function hidePwaBanner() {
  if (pwaBanner) {
    pwaBanner.hidden = true;
    pwaBanner.style.display = 'none';
  }
  localStorage.setItem('seo-pwa-dismissed', '1');
}

function reEnablePwaBanner() {
  localStorage.removeItem('seo-pwa-dismissed');
  if (pwaBanner && !isRunningStandalone()) {
    pwaBanner.hidden = false;
    pwaBanner.style.display = 'flex';
  }
  closePwaModal();
  toast('اعلان نصب مجدداً در پایین صفحه فعال شد ✔');
}

async function triggerPwaInstall() {
  if (deferredPwaPrompt) {
    try {
      deferredPwaPrompt.prompt();
      const { outcome } = await deferredPwaPrompt.userChoice;
      if (outcome === 'accepted') {
        toast('اپلیکیشن جعبه‌ابزار سئو با موفقیت نصب شد! 🎉');
        if (installPwaBtn) installPwaBtn.style.display = 'none';
        hidePwaBanner();
        closePwaModal();
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    deferredPwaPrompt = null;
    return;
  }

  // اگر پرامپت خودکار در دسترس نبود، مودال راهنما باز شود
  openPwaModal();
}

// قرار دادن در شیء window برای دسترسی مستقیم onclick در HTML
window.openPwaModal = openPwaModal;
window.closePwaModal = closePwaModal;
window.hidePwaBanner = hidePwaBanner;
window.triggerPwaInstall = triggerPwaInstall;
window.reEnablePwaBanner = reEnablePwaBanner;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;

  if (pwaNativeBox) {
    pwaNativeBox.hidden = false;
    pwaNativeBox.style.display = 'block';
  }

  // نمایش بنر شناور اگر کاربر قبلاً آن را نبسته باشد
  const isDismissed = localStorage.getItem('seo-pwa-dismissed');
  if (!isDismissed && !isRunningStandalone() && pwaBanner) {
    pwaBanner.hidden = false;
    pwaBanner.style.display = 'flex';
  }
});

installPwaBtn?.addEventListener('click', openPwaModal);
footerInstallBtn?.addEventListener('click', openPwaModal);
pwaBannerInstallBtn?.addEventListener('click', triggerPwaInstall);
pwaBannerCloseBtn?.addEventListener('click', hidePwaBanner);
closePwaModalBtn?.addEventListener('click', closePwaModal);
pwaModalInstallActionBtn?.addEventListener('click', triggerPwaInstall);
reEnablePwaBannerBtn?.addEventListener('click', reEnablePwaBanner);

pwaGuideModal?.addEventListener('click', (e) => {
  if (e.target === pwaGuideModal) closePwaModal();
});

window.addEventListener('appinstalled', () => {
  if (installPwaBtn) installPwaBtn.style.display = 'none';
  if (footerInstallBtn) footerInstallBtn.style.display = 'none';
  hidePwaBanner();
  closePwaModal();
  deferredPwaPrompt = null;
  toast('جعبه‌ابزار سئو اکنون به عنوان اپلیکیشن مستقل نصب شد ✔');
});


/* ───────────────────────────── شبیه‌ساز و پیش‌نمایش شبکه‌های اجتماعی (Social Share Previewer) ───────────────────────────── */
const socialTitle = document.getElementById('socialTitle');
const socialTitleCount = document.getElementById('socialTitleCount');
const socialDesc = document.getElementById('socialDesc');
const socialDescCount = document.getElementById('socialDescCount');
const socialImage = document.getElementById('socialImage');
const socialUrl = document.getElementById('socialUrl');
const socialSiteName = document.getElementById('socialSiteName');
const socialType = document.getElementById('socialType');
const socialTwitterUser = document.getElementById('socialTwitterUser');

const socialCodeOutput = document.getElementById('socialCodeOutput');
const copySocialTagsBtn = document.getElementById('copySocialTagsBtn');
const socialCopyBtn = document.getElementById('socialCopyBtn');
const socialSampleBtn = document.getElementById('socialSampleBtn');
const socialResetBtn = document.getElementById('socialResetBtn');

// تب‌های انتخاب پلتفرم سوشال
const socTabTelegram = document.getElementById('socTabTelegram');
const socTabTwitter = document.getElementById('socTabTwitter');
const socTabWhatsapp = document.getElementById('socTabWhatsapp');
const socTabLinkedin = document.getElementById('socTabLinkedin');

// کارت‌های پیش‌نمایش پلتفرم‌ها
const socialPreviewTelegram = document.getElementById('socialPreviewTelegram');
const socialPreviewTwitter = document.getElementById('socialPreviewTwitter');
const socialPreviewWhatsapp = document.getElementById('socialPreviewWhatsapp');
const socialPreviewLinkedin = document.getElementById('socialPreviewLinkedin');

// المان‌های داخلی کارت تلگرام
const tgPreviewImg = document.getElementById('tgPreviewImg');
const tgPreviewSite = document.getElementById('tgPreviewSite');
const tgPreviewTitle = document.getElementById('tgPreviewTitle');
const tgPreviewDesc = document.getElementById('tgPreviewDesc');
const tgPreviewDomain = document.getElementById('tgPreviewDomain');

// المان‌های داخلی کارت توییتر
const twPreviewImg = document.getElementById('twPreviewImg');
const twPreviewDomain = document.getElementById('twPreviewDomain');
const twPreviewTitle = document.getElementById('twPreviewTitle');
const twPreviewDesc = document.getElementById('twPreviewDesc');

// المان‌های داخلی کارت واتساپ
const waPreviewImg = document.getElementById('waPreviewImg');
const waPreviewTitle = document.getElementById('waPreviewTitle');
const waPreviewDesc = document.getElementById('waPreviewDesc');
const waPreviewDomain = document.getElementById('waPreviewDomain');

// المان‌های داخلی کارت لینکدین
const liPreviewImg = document.getElementById('liPreviewImg');
const liPreviewTitle = document.getElementById('liPreviewTitle');
const liPreviewDomain = document.getElementById('liPreviewDomain');

let activeSocialPlatform = 'telegram';

function switchSocialPlatform(platform) {
  activeSocialPlatform = platform;
  const isTg = platform === 'telegram';
  const isTw = platform === 'twitter';
  const isWa = platform === 'whatsapp';
  const isLi = platform === 'linkedin';

  socTabTelegram?.classList.toggle('active', isTg);
  socTabTwitter?.classList.toggle('active', isTw);
  socTabWhatsapp?.classList.toggle('active', isWa);
  socTabLinkedin?.classList.toggle('active', isLi);

  if (socialPreviewTelegram) socialPreviewTelegram.hidden = !isTg;
  if (socialPreviewTwitter) socialPreviewTwitter.hidden = !isTw;
  if (socialPreviewWhatsapp) socialPreviewWhatsapp.hidden = !isWa;
  if (socialPreviewLinkedin) socialPreviewLinkedin.hidden = !isLi;
}

socTabTelegram?.addEventListener('click', () => switchSocialPlatform('telegram'));
socTabTwitter?.addEventListener('click', () => switchSocialPlatform('twitter'));
socTabWhatsapp?.addEventListener('click', () => switchSocialPlatform('whatsapp'));
socTabLinkedin?.addEventListener('click', () => switchSocialPlatform('linkedin'));

function extractDomain(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname || urlStr;
  } catch (e) {
    return urlStr.replace(/^https?:\/\//i, '').split('/')[0] || 'example.com';
  }
}

function updateSocialPreview() {
  const title = (socialTitle?.value || '').trim() || 'عنوان صفحه وبسایت';
  const desc = (socialDesc?.value || '').trim() || 'توضیحات مختصر درباره محتوای این صفحه برای نمایش در شبکه‌های اجتماعی...';
  const imgUrl = (socialImage?.value || '').trim() || 'icons/icon-512.png';
  const pageUrl = (socialUrl?.value || '').trim() || 'https://example.com';
  const siteName = (socialSiteName?.value || '').trim() || 'نام رسانه / برند';
  const type = socialType?.value || 'website';
  const twitterUser = (socialTwitterUser?.value || '').trim();
  const domain = extractDomain(pageUrl);

  // به‌روزرسانی شمارش کاراکترها
  if (socialTitleCount) socialTitleCount.textContent = `${title.length.toLocaleString('fa-IR')} کاراکتر`;
  if (socialDescCount) socialDescCount.textContent = `${desc.length.toLocaleString('fa-IR')} کاراکتر`;

  // ۱. تلگرام
  if (tgPreviewImg) tgPreviewImg.src = imgUrl;
  if (tgPreviewSite) tgPreviewSite.textContent = siteName;
  if (tgPreviewTitle) tgPreviewTitle.textContent = title;
  if (tgPreviewDesc) tgPreviewDesc.textContent = desc;
  if (tgPreviewDomain) tgPreviewDomain.textContent = domain;

  // ۲. توییتر / X
  if (twPreviewImg) twPreviewImg.src = imgUrl;
  if (twPreviewDomain) twPreviewDomain.textContent = domain;
  if (twPreviewTitle) twPreviewTitle.textContent = title;
  if (twPreviewDesc) twPreviewDesc.textContent = desc;

  // ۳. واتساپ
  if (waPreviewImg) waPreviewImg.src = imgUrl;
  if (waPreviewTitle) waPreviewTitle.textContent = title;
  if (waPreviewDesc) waPreviewDesc.textContent = desc;
  if (waPreviewDomain) waPreviewDomain.textContent = domain;

  // ۴. لینکدین
  if (liPreviewImg) liPreviewImg.src = imgUrl;
  if (liPreviewTitle) liPreviewTitle.textContent = title;
  if (liPreviewDomain) liPreviewDomain.textContent = `${domain} · مطالعه ۲ دقیقه`;

  // تولید متاتگ‌های استاندارد HTML
  const cleanTitle = escapeHtml(title);
  const cleanDesc = escapeHtml(desc);
  const cleanSiteName = escapeHtml(siteName);

  let tags = `<!-- تگ‌های Open Graph برای فیسبوک، تلگرام، واتساپ و لینکدین -->
`;
  tags += `<meta property="og:type" content="${type}">
`;
  tags += `<meta property="og:url" content="${pageUrl}">
`;
  tags += `<meta property="og:title" content="${cleanTitle}">
`;
  tags += `<meta property="og:description" content="${cleanDesc}">
`;
  tags += `<meta property="og:image" content="${imgUrl}">
`;
  tags += `<meta property="og:site_name" content="${cleanSiteName}">
`;
  tags += `<meta property="og:locale" content="fa_IR">

`;

  tags += `<!-- تگ‌های Twitter Cards برای توییتر / X -->
`;
  tags += `<meta name="twitter:card" content="summary_large_image">
`;
  tags += `<meta name="twitter:url" content="${pageUrl}">
`;
  tags += `<meta name="twitter:title" content="${cleanTitle}">
`;
  tags += `<meta name="twitter:description" content="${cleanDesc}">
`;
  tags += `<meta name="twitter:image" content="${imgUrl}">`;

  if (twitterUser) {
    const formattedUser = twitterUser.startsWith('@') ? twitterUser : '@' + twitterUser;
    tags += `
<meta name="twitter:site" content="${formattedUser}">`;
    tags += `
<meta name="twitter:creator" content="${formattedUser}">`;
  }

  if (socialCodeOutput) {
    socialCodeOutput.textContent = tags;
  }
}

[socialTitle, socialDesc, socialImage, socialUrl, socialSiteName, socialType, socialTwitterUser].forEach(el => {
  el?.addEventListener('input', updateSocialPreview);
  el?.addEventListener('change', updateSocialPreview);
});

function copySocialTags() {
  if (socialCodeOutput && socialCodeOutput.textContent) {
    copyText(socialCodeOutput.textContent);
    toast('تگ‌های Open Graph و Twitter Cards با موفقیت کپی شدند ✔');
  }
}

copySocialTagsBtn?.addEventListener('click', copySocialTags);
socialCopyBtn?.addEventListener('click', copySocialTags);

socialSampleBtn?.addEventListener('click', () => {
  if (socialTitle) socialTitle.value = 'راهنمای جامع سئو داخلی (On-Page SEO) در سال ۲۰۲۵';
  if (socialDesc) socialDesc.value = 'چگونه صفحات سایت خود را بر اساس آخرین الگوریتم‌های گوگل، فاکتورهای E-E-A-T و تجربه کاربری بهینه‌سازی کنیم؟ آموزش گام به گام همراه با چک‌لیست کاربردی.';
  if (socialImage) socialImage.value = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop';
  if (socialUrl) socialUrl.value = 'https://seo.mhkhademi87.ir/blog/on-page-seo-guide';
  if (socialSiteName) socialSiteName.value = 'جعبه‌ابزار سئو';
  if (socialType) socialType.value = 'article';
  if (socialTwitterUser) socialTwitterUser.value = '@mhkhademi';
  updateSocialPreview();
  toast('اطلاعات نمونه شبکه‌های اجتماعی بارگذاری شد ✔');
});

socialResetBtn?.addEventListener('click', () => {
  if (socialTitle) socialTitle.value = '';
  if (socialDesc) socialDesc.value = '';
  if (socialImage) socialImage.value = '';
  if (socialUrl) socialUrl.value = '';
  if (socialSiteName) socialSiteName.value = '';
  if (socialType) socialType.value = 'website';
  if (socialTwitterUser) socialTwitterUser.value = '';
  updateSocialPreview();
  toast('فیلدهای شبکه‌های اجتماعی پاکسازی شدند');
});


/* ───────────────────────────── چک‌لیست جامع ممیزی سئو (SEO Audit Checklist) ───────────────────────────── */
const checklistSectionsWrap = document.getElementById('checklistSectionsWrap');
const checklistCounter = document.getElementById('checklistCounter');
const checklistPct = document.getElementById('checklistPct');
const checklistProgressFill = document.getElementById('checklistProgressFill');
const checklistStatusBadge = document.getElementById('checklistStatusBadge');

const chkFilterAll = document.getElementById('chkFilterAll');
const chkFilterPending = document.getElementById('chkFilterPending');
const chkFilterDone = document.getElementById('chkFilterDone');

const checkSampleBtn = document.getElementById('checkSampleBtn');
const checkResetBtn = document.getElementById('checkResetBtn');
const checkPrintBtn = document.getElementById('checkPrintBtn');
const checkCopyReportBtn = document.getElementById('checkCopyReportBtn');

// ساختار ۲۴ فاکتور حیاتی ممیزی سئو در ۴ دسته‌بندی
const SEO_AUDIT_DATA = [
  {
    category: 'tech',
    title: 'سئو تکنیکال و زیرساخت (Technical SEO)',
    icon: '⚙️',
    items: [
      {
        id: 'tech_https',
        title: 'فعال‌سازی پروتکل امن HTTPS و ریدایرکت خودکار',
        desc: 'تمام ترافیک HTTP باید بدون ایجاد حلقه (Loop) به‌طور خودکار با کد ۳۰۱ به نسخه https:// منتقل شوند.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'tech_robots',
        title: 'تنظیم دقیق فایل Robots.txt و دسترسی به فایل‌های استاتیک',
        desc: 'اطمینان از اینکه فایل‌های CSS، JS و تصاویر حیاتی برای رندر گوگل‌بات مسدود نشده باشند.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'tech_sitemap',
        title: 'ساخت و معرفی نقشه سایت XML (Sitemap.xml)',
        desc: 'نقشه سایت معتبر بدون کدهای ۴۰۴ یا ریدایرکت، همراه با ثبت در سرچ کنسول گوگل.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'tech_canonical',
        title: 'درج تگ Rel="canonical" خودارجاع در تمام صفحات',
        desc: 'جلوگیری از خطای محتوای تکراری ناشی از پارامترهای UTM، اسلش پایانی، www یا بدون www.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'tech_404',
        title: 'طراحی صفحه خطای ۴۰۴ سفارشی با هدایت هوشمند',
        desc: 'صفحه ۴۰۴ با کد وضعیت واقعی HTTP 404 (نه Soft 404 با کد ۲۰۰) و راهنمایی کاربر به صفحات اصلی.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'tech_chains',
        title: 'بررسی و رفع ریدایرکت‌های زنجیره‌ای (Redirect Chains)',
        desc: 'هیچ آدرسی نباید بیش از یک مرحله ریدایرکت شود تا هدررفت بودجه خزش (Crawl Budget) رخ ندهد.',
        priority: 'important',
        priorityLabel: 'مهم'
      }
    ]
  },
  {
    category: 'onpage',
    title: 'سئو داخلی و بهینه‌سازی تگ‌ها (On-Page SEO)',
    icon: '📝',
    items: [
      {
        id: 'onpage_title',
        title: 'عنوان صفحه (Title Tag) اختصاصی با کلمه کلیدی اصلی',
        desc: 'طول بین ۴۰ تا ۶۰ کاراکتر، جذاب برای افزایش نرخ کلیک (CTR) و عدم تکرار در صفحات دیگر.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'onpage_h1',
        title: 'دقیقاً یک تگ H1 شاخص و مرتبط در هر صفحه',
        desc: 'هر صفحه باید یک سرتیتر سطح ۱ اختصاصی داشته باشد که کلمه کلیدی در ابتدای آن باشد.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'onpage_meta_desc',
        title: 'توضیحات متای جذاب و ترغیب‌کننده (Meta Description)',
        desc: 'طول بین ۱۲۰ تا ۱۵۵ کاراکتر همراه با کال تو اکشن (CTA) شفاف و کلمات مرتبط.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'onpage_headings',
        title: 'ساختار منطقی تیترها با ترتیب سلسله‌مراتبی (H2, H3, H4)',
        desc: 'رعایت نظم محتوایی و پرهیز از پرش سطوح تیتر (مثلاً رفتن مستقیم از H1 به H4).',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'onpage_img_alt',
        title: 'صفت Alt توصیفی و دقیق برای تمامی تصاویر',
        desc: 'متن جایگزین با توصیف واقعی تصویر برای ربات‌های گوگل و کاربران کم‌بینا بدون کیورد استافینگ.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'onpage_schema',
        title: 'پیاده‌سازی حداقل یک اسکیما ساختاریافته معتبر (JSON-LD)',
        desc: 'تگ‌های اسکیما مثل Organization، Article، Product، FAQ یا Breadcrumb برای ریچ اسنیپت گوگل.',
        priority: 'recommended',
        priorityLabel: 'پیشنهادی'
      }
    ]
  },
  {
    category: 'cwv',
    title: 'سرعت و تجربه کاربری (Core Web Vitals & UX)',
    icon: '⚡',
    items: [
      {
        id: 'cwv_lcp',
        title: 'بهینه‌سازی بزرگ‌ترین المان محتوا (LCP زیر ۲.۵ ثانیه)',
        desc: 'فشرده‌سازی تصاویر هیرو با فرمت WebP/AVIF و لود سریع اولین بخش‌های حیاتی صفحه.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'cwv_cls',
        title: 'جلوگیری از پرش ناگهانی المان‌ها (CLS زیر ۰.۱)',
        desc: 'تعیین قطعی ویژگی‌های width و height برای تمام تصاویر، بنرها و ویدیوها در CSS/HTML.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'cwv_inp',
        title: 'پاسخ‌دهی سریع کلیک‌ها و تعاملات (INP زیر ۲۰۰ میلی‌ثانیه)',
        desc: 'کاهش کدهای جاوااسکریپت سنگین در هنگام تعامل کاربر با دکمه‌ها و فرم‌ها.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'cwv_mobile',
        title: 'واکنش‌گرایی ۱۰۰٪ در موبایل (Mobile Friendly)',
        desc: 'اندازه مناسب فونت‌ها، عدم نیاز به اسکرول افقی و فاصله کافی بین تاچ‌تارگت‌ها و دکمه‌ها.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'cwv_cache',
        title: 'تنظیم هدرهای کش مرورگر و فشرده‌سازی Gzip/Brotli',
        desc: 'ارائه فایل‌های استاتیک با کش طولانی‌مدت (Cache-Control) و فشرده‌سازی در سطح سرور.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'cwv_fonts',
        title: 'بهینه‌سازی فونت‌ها با font-display: swap',
        desc: 'جلوگیری از پنهان ماندن متن‌ها در ثانیه‌های اول لود (FOIT) با استفاده از فونت‌های محلی یا ساب‌ست.',
        priority: 'recommended',
        priorityLabel: 'پیشنهادی'
      }
    ]
  },
  {
    category: 'index',
    title: 'ایندکس، کرال و آنالیتیکس (Index & Analytics)',
    icon: '📊',
    items: [
      {
        id: 'idx_gsc',
        title: 'احراز هویت و اتصال دامنه در Google Search Console',
        desc: 'ثبت متد DNS یا فایل HTML و بررسی منظم گزارش‌های Indexing و Coverage.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'idx_ga4',
        title: 'نصب و صحت‌سنجی گوگل آنالیتیکس ۴ (GA4)',
        desc: 'ثبت دقیق ایونت‌ها، نرخ تبدیل (Conversions) و ترافیک ارگانیک ورودی به سایت.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'idx_noindex',
        title: 'حذف تگ Noindex و هدر X-Robots پس از مرحله توسعه',
        desc: 'اطمینان از اینکه تگ‌های noindex دوره تستی و استیجینگ به محیط لایو منتقل نشده باشند.',
        priority: 'critical',
        priorityLabel: 'حیاتی'
      },
      {
        id: 'idx_og_tags',
        title: 'پیکربندی تگ‌های Open Graph و Twitter Cards',
        desc: 'نمایش چشم‌نواز عنوان، خلاصه و عکس اختصاصی هنگام ارسال لینک در تلگرام، توییتر و واتساپ.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'idx_internal_links',
        title: 'استراتژی لینک‌سازی داخلی با انکر تکست‌های غنی',
        desc: 'ارتباط منطقی بین صفحات مرتبط، مقالات و لندینگ‌ها برای توزیع پیج‌رنک و هدایت کاربر.',
        priority: 'important',
        priorityLabel: 'مهم'
      },
      {
        id: 'idx_favicon',
        title: 'بارگذاری فاوآیکون استاندارد برای نتایج سرچ گوگل',
        desc: 'فاوآیکون مربعی چندگانه (۱۶، ۳۲، ۱۹۲، ۵۱۲) تا در کنار نام سایت در SERP گوگل نمایش یابد.',
        priority: 'recommended',
        priorityLabel: 'پیشنهادی'
      }
    ]
  }
];

let checklistState = {};
let currentChecklistFilter = 'all';

function loadChecklistState() {
  try {
    const raw = localStorage.getItem('seo-audit-checklist-state');
    if (raw) {
      checklistState = JSON.parse(raw);
    }
  } catch (e) {
    checklistState = {};
  }
}

function saveChecklistState() {
  try {
    localStorage.setItem('seo-audit-checklist-state', JSON.stringify(checklistState));
  } catch (e) {}
}

function updateChecklistProgress() {
  let totalCount = 0;
  let doneCount = 0;

  SEO_AUDIT_DATA.forEach(sec => {
    sec.items.forEach(item => {
      totalCount++;
      if (checklistState[item.id]) {
        doneCount++;
      }
    });
  });

  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (checklistCounter) {
    checklistCounter.textContent = `${doneCount.toLocaleString('fa-IR')} از ${totalCount.toLocaleString('fa-IR')} مورد تکمیل شده`;
  }
  if (checklistPct) {
    checklistPct.textContent = `${pct.toLocaleString('fa-IR')}٪`;
  }
  if (checklistProgressFill) {
    checklistProgressFill.style.width = `${pct}%`;
  }

  if (checklistStatusBadge) {
    checklistStatusBadge.className = 'summary-status-badge';
    if (doneCount === 0) {
      checklistStatusBadge.textContent = 'آماده شروع ارزیابی';
    } else if (pct < 50) {
      checklistStatusBadge.textContent = 'نیاز به اقدام و اصلاحات';
      checklistStatusBadge.classList.add('medium');
    } else if (pct < 90) {
      checklistStatusBadge.textContent = 'وضعیت رو به بهبود و استاندارد';
      checklistStatusBadge.classList.add('good');
    } else if (pct < 100) {
      checklistStatusBadge.textContent = 'وضعیت بسیار مطلوب و پیشرفته';
      checklistStatusBadge.classList.add('good');
    } else {
      checklistStatusBadge.textContent = 'سئو ۱۰۰٪ آماده لانچ و بهینه‌سازی شده! 🚀';
      checklistStatusBadge.classList.add('good');
    }
  }

  // به‌روزرسانی شمارنده بخش‌ها
  SEO_AUDIT_DATA.forEach(sec => {
    const secDone = sec.items.filter(item => checklistState[item.id]).length;
    const secPill = document.getElementById(`sec_pill_${sec.category}`);
    if (secPill) {
      secPill.textContent = `${secDone.toLocaleString('fa-IR')} از ${sec.items.length.toLocaleString('fa-IR')}`;
    }
  });
}

function renderChecklist() {
  if (!checklistSectionsWrap) return;

  loadChecklistState();
  checklistSectionsWrap.innerHTML = '';

  SEO_AUDIT_DATA.forEach(sec => {
    const secCard = document.createElement('div');
    secCard.className = 'checklist-section-card';
    secCard.id = `sec_card_${sec.category}`;

    const secHeader = document.createElement('div');
    secHeader.className = 'checklist-section-header';
    secHeader.innerHTML = `
      <div class="sec-title-box">
        <span class="sec-icon">${sec.icon}</span>
        <h3 class="sec-title">${sec.title}</h3>
      </div>
      <span class="sec-progress-pill" id="sec_pill_${sec.category}">۰ از ۶</span>
    `;
    secCard.appendChild(secHeader);

    const itemsList = document.createElement('div');
    itemsList.className = 'sec-items-list';

    sec.items.forEach(item => {
      const isDone = !!checklistState[item.id];
      const isHidden = (currentChecklistFilter === 'pending' && isDone) ||
                       (currentChecklistFilter === 'done' && !isDone);

      const row = document.createElement('label');
      row.className = `checklist-row-item ${isDone ? 'done' : ''}`;
      row.dataset.itemId = item.id;
      if (isHidden) row.style.display = 'none';

      row.innerHTML = `
        <input type="checkbox" id="chk_${item.id}" ${isDone ? 'checked' : ''}>
        <div class="item-text-wrap">
          <div class="item-head-line">
            <span class="item-title">${item.title}</span>
            <span class="item-priority-badge ${item.priority}">${item.priorityLabel}</span>
          </div>
          <span class="item-desc">${item.desc}</span>
        </div>
      `;

      const chk = row.querySelector('input[type="checkbox"]');
      chk?.addEventListener('change', (e) => {
        checklistState[item.id] = chk.checked;
        saveChecklistState();
        row.classList.toggle('done', chk.checked);

        if (currentChecklistFilter === 'pending' && chk.checked) {
          row.style.display = 'none';
        } else if (currentChecklistFilter === 'done' && !chk.checked) {
          row.style.display = 'none';
        }

        updateChecklistProgress();
      });

      itemsList.appendChild(row);
    });

    secCard.appendChild(itemsList);
    checklistSectionsWrap.appendChild(secCard);
  });

  updateChecklistProgress();
}

function setChecklistFilter(filter) {
  currentChecklistFilter = filter;
  chkFilterAll?.classList.toggle('active', filter === 'all');
  chkFilterPending?.classList.toggle('active', filter === 'pending');
  chkFilterDone?.classList.toggle('active', filter === 'done');

  const rows = document.querySelectorAll('.checklist-row-item');
  rows.forEach(r => {
    const isDone = r.classList.contains('done');
    if (filter === 'all') {
      r.style.display = 'flex';
    } else if (filter === 'pending') {
      r.style.display = isDone ? 'none' : 'flex';
    } else if (filter === 'done') {
      r.style.display = isDone ? 'flex' : 'none';
    }
  });
}

chkFilterAll?.addEventListener('click', () => setChecklistFilter('all'));
chkFilterPending?.addEventListener('click', () => setChecklistFilter('pending'));
chkFilterDone?.addEventListener('click', () => setChecklistFilter('done'));

checkSampleBtn?.addEventListener('click', () => {
  // تیک زدن ۱۶ مورد کلیدی برای نمایش حالت نیمه‌تکمیل
  const sampleKeys = [
    'tech_https', 'tech_robots', 'tech_sitemap', 'tech_canonical', 'tech_404',
    'onpage_title', 'onpage_h1', 'onpage_meta_desc', 'onpage_headings',
    'cwv_lcp', 'cwv_cls', 'cwv_mobile', 'cwv_cache',
    'idx_gsc', 'idx_ga4', 'idx_noindex'
  ];
  checklistState = {};
  sampleKeys.forEach(k => checklistState[k] = true);
  saveChecklistState();
  renderChecklist();
  toast('چک‌لیست با نمونه پروژه سئو بارگذاری شد ✔');
});

checkResetBtn?.addEventListener('click', () => {
  checklistState = {};
  saveChecklistState();
  renderChecklist();
  toast('تمامی تیک‌های چک‌لیست سئو پاکسازی شدند.');
});

checkPrintBtn?.addEventListener('click', () => {
  window.print();
});

checkCopyReportBtn?.addEventListener('click', () => {
  let doneCount = 0;
  let totalCount = 0;
  let report = `📋 گزارش جامع ممیزی سئو (SEO Audit Report)
`;
  report += `📅 تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}
`;
  report += `────────────────────────────────────────

`;

  SEO_AUDIT_DATA.forEach(sec => {
    report += `${sec.icon} ${sec.title}:
`;
    sec.items.forEach(item => {
      totalCount++;
      const isDone = !!checklistState[item.id];
      if (isDone) doneCount++;
      const sign = isDone ? '[✔]' : '[ ]';
      report += `  ${sign} ${item.title} (${item.priorityLabel})
`;
    });
    report += `
`;
  });

  const pct = Math.round((doneCount / totalCount) * 100);
  report += `────────────────────────────────────────
`;
  report += `📊 امتیاز کل سئو: ${pct}٪ (${doneCount} از ${totalCount} فاکتور تکمیل‌شده)
`;
  report += `🌐 تولیدشده توسط: جعبه‌ابزار سئو (seo.mhkhademi87.ir)
`;

  copyText(report);
  toast('گزارش کامل متنی ممیزی سئو کپی شد ✔');
});

// مقداردهی اولیه پیش‌نمایش شبکه‌های اجتماعی و چک‌لیست
updateSocialPreview();
renderChecklist();
