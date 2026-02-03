// キャッシュの名前を定義。バージョンを更新すると古いキャッシュは自動的に削除。
const SW_VERSION = '20260204a'; // ★バージョンを更新
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

// ここにローカルの全サムネイル画像のパス（.jpg のみ）を貼り付けます
const THUMBNAIL_ASSETS = [
  'thumbnails/96.jpg',
  'thumbnails/95.jpg',
  'thumbnails/94.jpg',
  'thumbnails/93.jpg',
  'thumbnails/92.jpg',
  'thumbnails/91.jpg',
  'thumbnails/90.jpg',
  'thumbnails/89.jpg',
  'thumbnails/88.jpg',
  'thumbnails/87.jpg',
  'thumbnails/京まふ大作戦2025.jpg',
  'thumbnails/86.jpg',
  'thumbnails/85.jpg',
  'thumbnails/84.jpg',
  'thumbnails/83.jpg',
  'thumbnails/82.jpg',
  'thumbnails/81.jpg',
  'thumbnails/80.jpg',
  'thumbnails/79.jpg',
  'thumbnails/78.jpg',
  'thumbnails/77.jpg',
  'thumbnails/76.jpg',
  'thumbnails/75.jpg',
  'thumbnails/CENTRALSTATION.jpg',
  'thumbnails/74.jpg',
  'thumbnails/73.jpg',
  'thumbnails/72.jpg',
  'thumbnails/緊急.jpg',
  'thumbnails/71.jpg',
  'thumbnails/70.jpg',
  'thumbnails/69.jpg',
  'thumbnails/68.jpg',
  'thumbnails/67.jpg',
  'thumbnails/66.jpg',
  'thumbnails/65.jpg',
  'thumbnails/64.jpg',
  'thumbnails/63.jpg',
  'thumbnails/62.jpg',
  'thumbnails/61.jpg',
  'thumbnails/60.jpg',
  'thumbnails/59.jpg',
  'thumbnails/58.jpg',
  'thumbnails/57.jpg',
  'thumbnails/56.jpg',
  'thumbnails/55.jpg',
  'thumbnails/54.jpg',
  'thumbnails/53.jpg',
  'thumbnails/52.jpg',
  'thumbnails/51.jpg',
  'thumbnails/50.jpg',
  'thumbnails/49.jpg',
  'thumbnails/48.jpg',
  'thumbnails/47.jpg',
  'thumbnails/46.jpg',
  'thumbnails/45.jpg',
  'thumbnails/44.jpg',
  'thumbnails/43.jpg',
  'thumbnails/42.jpg',
  'thumbnails/41.jpg',
  'thumbnails/40.jpg',
  'thumbnails/39.jpg',
  'thumbnails/38.jpg',
  'thumbnails/37.jpg',
  'thumbnails/36.jpg',
  'thumbnails/35.jpg',
  'thumbnails/34.jpg',
  'thumbnails/33.jpg',
  'thumbnails/32.jpg',
  'thumbnails/31.jpg',
  'thumbnails/30.jpg',
  'thumbnails/29.jpg',
  'thumbnails/28.jpg',
  'thumbnails/27.jpg',
  'thumbnails/26.jpg',
  'thumbnails/25.jpg',
  'thumbnails/24.jpg',
  'thumbnails/23.jpg',
  'thumbnails/22.jpg',
  'thumbnails/21.jpg',
  'thumbnails/20.jpg',
  'thumbnails/19.jpg',
  'thumbnails/18.jpg',
  'thumbnails/17.jpg',
  'thumbnails/16.jpg',
  'thumbnails/15.jpg',
  'thumbnails/14.jpg',
  'thumbnails/13.jpg',
  'thumbnails/12.jpg',
  'thumbnails/11.jpg',
  'thumbnails/10.jpg',
  'thumbnails/09.jpg',
  'thumbnails/08.jpg',
  'thumbnails/07.jpg',
  'thumbnails/06.jpg',
  'thumbnails/05.jpg',
  'thumbnails/04.jpg',
  'thumbnails/03.jpg',
  'thumbnails/02.jpg',
  'thumbnails/京まふ大作戦2022.jpg',
  'thumbnails/01.jpg'
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