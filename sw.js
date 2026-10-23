/* ────────────────────────────────────────────────────────────
   service worker جعبه‌ابزار سئو — حالت آفلاین کامل

   استراتژی یکپارچه برای همهٔ درخواست‌های همان-_origin:
     network-first → پاسخ تازه در کش ذخیره می‌شود؛
     در قطعی/کندی، نسخهٔ کش‌شده سرو می‌شود.
   نتیجه: آنلاین همیشه به‌روز، آفلاین کامل کار می‌کند.
   ──────────────────────────────────────────────────────────── */

const VERSION = 'seo-toolbox-v3';
const CORE = [
  './',
  './index.html',
  './style.css',
  './fonts.css',
  './script.js',
  './data.js',
  './tools.json',
  './icons.json',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon.ico',
  './fonts/vazirmatn-var.woff2',
  './icons/default.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    try {
      const r = await fetch('./icons.json', { cache: 'no-store' });
      if (r.ok) {
        const pack = await r.json();
        await cache.addAll((pack.domains || []).map(d => `./icons/${d}.png`));
      }
    } catch { /* آیکون‌ها بعداً lazy کش می‌شوند */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== VERSION) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // منابع خارجی بدون کش

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // ناوبری همیشه تازه از شبکه؛ دارایی‌های ?v= هش‌دار از کش HTTP (heuristic) هم استفاده می‌کنند
      const fresh = await fetch(req, req.mode === 'navigate' ? { cache: 'no-store' } : undefined);
      if (fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch {
      const hit = (await cache.match(req))
        || (req.mode === 'navigate' && (await cache.match('./index.html')));
      return hit || Response.error();
    }
  })());
});
