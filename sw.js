// sw.js (Stale-While-Revalidate & Network First)

// キャッシュの名前を定義します。バージョンを更新すると古いキャッシュは自動的に削除されます。
const SW_VERSION = 'v20250823b'; // バージョンを更新
const CACHE_NAME = `radio-cache-${SW_VERSION}`;

// キャッシュするファイルのリスト
// ここに含めたファイルは、インストール時にキャッシュされ、オフラインでも利用可能になります。
const CORE_ASSETS = [
  '/',
  'index.html',
  'style.css',
  'main.js',
  'episodes.json',
  'readings.json',
  'keywords.json',
  'lucky-button.json',
  'logo.png',
  'favicon.ico',
  'site.webmanifest'
];

// 1. Service Workerのインストール処理
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  // skipWaiting() を呼び出し、古いService Workerを待たずに新しいものをすぐに有効化します。
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
  // 新しいService Workerが有効になったら、古いバージョンのキャッシュを削除します。
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    }).then(() => {
      // すべてのクライアント（タブ）の制御を即座に開始します。
      return self.clients.claim();
    })
  );
});

// 3. fetchイベントの処理（リクエストへの応答）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Stale-While-Revalidate戦略を適用するファイルの拡張子
  const staleWhileRevalidate = ['.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webmanifest'];
  const isSWR = staleWhileRevalidate.some(ext => url.pathname.endsWith(ext));
  
  // YouTubeサムネイルのリクエストか判定
  const isYoutubeThumb = url.hostname.includes('i.ytimg.com');

  if (isSWR || isYoutubeThumb) {
    // CSS, JS, JSON, 画像ファイルには Stale-While-Revalidate 戦略を使用
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else if (request.mode === 'navigate') {
    // ページのナビゲーションリクエスト (index.htmlなど) には Network First 戦略を使用
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Stale-While-Revalidate 戦略
 * 1. まずキャッシュから応答を試みます (高速表示のため)。
 * 2. キャッシュがあればそれを返し、同時にネットワークからリソースを再取得してキャッシュを更新します。
 * 3. キャッシュがなければ、ネットワークから取得し、キャッシュに保存して返します。
 */
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    // ネットワークから正常に取得できたら、キャッシュを更新
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  // キャッシュがあればそれを返し、裏側でネットワーク取得を実行。なければネットワーク取得を待つ。
  return cachedResponse || fetchPromise;
}

/**
 * Network First 戦略
 * 1. まずネットワークから応答を試みます (常に最新版を取得するため)。
 * 2. ネットワークから取得できれば、それを返します。
 * 3. ネットワークが利用できない場合（オフライン時など）は、キャッシュから応答を試みます。
 */
async function networkFirstStrategy(request) {
  try {
    // まずネットワークからの取得を試みる
    const networkResponse = await fetch(request);
    // 取得成功したらキャッシュも更新しておく
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // ネットワークエラー（オフラインなど）の場合はキャッシュから探す
    console.log('[SW] Network failed, falling back to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    // キャッシュにもなければ、オフライン用のページなどを返すことも可能
    return cachedResponse || caches.match('/'); 
  }
}

// SKIP_WAITINGメッセージを受け取った際の処理 (省略可能ですが推奨)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});