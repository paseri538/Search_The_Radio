// sw.js (ファイル全体をこのコードで上書きしてください)

// キャッシュの名前を定義します。バージョンを更新すると古いキャッシュは自動的に削除されます。
const SW_VERSION = 'v20250925a'; // ★バージョンを新しいものに変更しました
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

// 1. Service Workerのインストール処理
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS);
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

  // ★★★ YouTubeサムネイルは「Cache First」戦略に変更 ★★★
  if (url.hostname.includes('i.ytimg.com')) {
    event.respondWith(cacheFirstStrategy(request));
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
  
  // 上記以外のアセット（フォントなど）は Stale-While-Revalidate を使う
  event.respondWith(staleWhileRevalidateStrategy(request));
});


// ===================================================
// ★★★ キャッシュ戦略の関数群 ★★★
// ===================================================

/**
 * Cache First 戦略 (オフライン表示を最優先)
 * 1. まずキャッシュにリソースがあるか確認します。
 * 2. あれば、即座にキャッシュから返します。
 * 3. なければ、ネットワークにリクエストし、取得したリソースをキャッシュに保存してから返します。
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network fetch failed and no cache for:', request.url, error);
    // オフラインでキャッシュにもない場合、空の応答を返す
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
}

/**
 * Stale-While-Revalidate 戦略 (表示速度を優先しつつ、裏側で更新)
 */
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

/**
 * Network First 戦略 (情報の鮮度を優先)
 */
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
    return await caches.match(request) || caches.match('/');
  }
}

// SKIP_WAITINGメッセージを受け取った際の処理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});