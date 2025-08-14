// --- sw.js --- 最小構成：即時更新＋ネットワーク優先（GitHub Pages向け）
const SW_VERSION = 'v-20250814-052226';

// 1) インストール後すぐ更新適用
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// 2) 取得方針：まずネットワーク、だめならキャッシュ（HTMLは常に最新優先）
self.addEventListener('fetch', (event) => {
  const req = event.request;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html', { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(SW_VERSION);
    const cached = await cache.match(req);
    const fetched = fetch(req).then(res => {
      if (res && res.status === 200 && res.type !== 'opaque') {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => null);

    return cached || fetched || fetch(req);
  })());
});

// 3) 新旧バージョンのキャッシュ整理
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
