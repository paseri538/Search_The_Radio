// キャッシュの名前を定義。バージョンを更新すると古いキャッシュは自動的に削除。
const SW_VERSION = '20260718a';
const CACHE_NAME = `radio-cache-${SW_VERSION}`;


// キャッシュするファイルのリスト
const CORE_ASSETS = [
  '/',
  'index.html',
  'style.css',
  'main.js',
  'episodes.json',
  'readings.json',
  'keywords.json',
  'lucky-button.json',
  'history.json',
  'logo.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'site.webmanifest',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

// サムネイル画像（#01〜#107 の連番 + 特別回）。連番はループで生成する。
const SPECIAL_THUMBS = ['京まふ大作戦2025', 'CENTRALSTATION', '緊急', '京まふ大作戦2022'];
const THUMBNAIL_ASSETS = [
  ...Array.from({ length: 107 }, (_, i) => `thumbnails/${String(i + 1).padStart(2, '0')}.jpg`),
  ...SPECIAL_THUMBS.map(name => `thumbnails/${name}.jpg`)
];

// インストール時にキャッシュする全アセット
const PRECACHE_ASSETS = [...CORE_ASSETS, ...THUMBNAIL_ASSETS];



// 1. Service Workerのインストール処理
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// 2. Service Workerの有効化処理
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. ネットワークリクエストへの介入処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // JSONデータファイルは「Network First」
  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // CSS, JS, manifestなどは「Stale-While-Revalidate」
  const swrExtensions = ['.css', '.js', '.webmanifest'];
  if (swrExtensions.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(staleWhileRevalidateStrategy(request));
    return;
  }

  // ページのナビゲーションリクエスト (HTML) は「Network First」
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // 上記以外のアセット（フォント、ローカル画像など）は Stale-While-Revalidate を使う
  event.respondWith(staleWhileRevalidateStrategy(request));
});


// ===================================================
// ★★★ キャッシュ戦略の関数群 ★★★
// ===================================================

// Stale-While-Revalidate 戦略 (Cache First戦略は不要になったので削除してOKです)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(err => {
    // ネットワークエラーが発生した場合のフォールバック
    console.warn(`[SW] Fetch failed for ${request.url}; relying on cache.`, err);
  });

  // キャッシュがあればそれを返し、裏でネットワークリクエストを実行
  // キャッシュがなければネットワークリクエストの結果を待つ
  return cachedResponse || fetchPromise;
}

// Network First 戦略 (変更なし)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, falling back to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    // ページ自体(navigate)のリクエストが失敗した場合、トップページを返す
    return cachedResponse || await caches.match('/');
  }
}


// SKIP_WAITINGメッセージを受け取った際の処理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});