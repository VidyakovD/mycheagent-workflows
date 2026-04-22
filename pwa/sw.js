// Bump версию при желании сбросить кэш всем юзерам одноразово.
// Для регулярных апдейтов версия не нужна — статика идёт через
// stale-while-revalidate: фоновое обновление на следующий визит.
const CACHE = 'zeus-v2';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // API-запросы — никогда не кэшировать
  if (url.includes('/webhook/')) return;

  // sw.js и manifest.json — network-first,
  // чтобы апдейты применялись максимально быстро
  if (/\/(sw\.js|manifest\.json)(\?|$)/.test(url)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML — network-first (без кэша сети, всегда свежее)
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Остальное (иконки, CSS, JS) — stale-while-revalidate:
  // мгновенно отдаём из кэша, параллельно обновляем в фоне.
  // На следующий визит юзер получит свежий ресурс.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
