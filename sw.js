// キャッシュの名前を定義。バージョンを更新すると古いキャッシュは自動的に削除。
const SW_VERSION = '20260720f';
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

// サムネイル画像の一覧は episodes.json から動的に生成する。
// （エピソード追加時にこのファイルを手で更新する必要がない。
//   カードの画像パスも main.js が同じ `thumbnails/{episode}.jpg` 規則で組み立てている）
async function getThumbnailAssets() {
  try {
    const res = await fetch('episodes.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    const episodes = await res.json();
    const names = episodes.map(ep => ep && ep.episode).filter(Boolean);
    return [...new Set(names)].map(name => `thumbnails/${name}.jpg`);
  } catch (e) {
    console.warn('[SW] Failed to build thumbnail list from episodes.json:', e);
    return [];
  }
}

// 1. Service Workerのインストール処理
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    console.log('[SW] Caching core assets');
    await cache.addAll(CORE_ASSETS);

    const thumbs = await getThumbnailAssets();

    // サムネイルは内容が変わらないため、旧バージョンのキャッシュから使い回す。
    // （これがないとSW更新のたびに全サムネイル約8MBを再ダウンロードしてしまう）
    const oldKeys = (await caches.keys()).filter(key => key !== CACHE_NAME);
    for (const key of oldKeys) {
      const oldCache = await caches.open(key);
      for (const url of thumbs) {
        if (await cache.match(url)) continue;
        const oldRes = await oldCache.match(url);
        if (oldRes) await cache.put(url, oldRes);
      }
    }

    // 足りない分だけネットワークから個別に追加する。
    // （addAllは1件の404で全体が失敗しSWのインストール自体が壊れるため、
    //   画像が未配置の回があっても他のキャッシュは続行する）
    const missing = [];
    for (const url of thumbs) {
      if (!(await cache.match(url))) missing.push(url);
    }
    const results = await Promise.allSettled(missing.map(url => cache.add(url)));
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[SW] Thumbnails: ${thumbs.length - missing.length} reused, ${missing.length - failed} fetched, ${failed} failed`);
  })());
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