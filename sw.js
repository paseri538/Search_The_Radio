// sw.js (ファイル全体をこのコードで上書きしてください)

// キャッシュの名前を定義します。バージョンを更新すると古いキャッシュは自動的に削除されます。
const SW_VERSION = 'v20251022c'; // ★バージョンを更新
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

// 【重要】ここに、生成した全サムネイルのURLリストを貼り付けます
const THUMBNAIL_ASSETS = [
'https://i.ytimg.com/vi/ndtWywEP1NQ/mqdefault.jpg',
'https://i.ytimg.com/vi/t6GPhBCRh8s/mqdefault.jpg',
'https://i.ytimg.com/vi/q4hfV8moFiI/mqdefault.jpg',
'https://i.ytimg.com/vi/AuLI_rwkx9Y/mqdefault.jpg',
'https://i.ytimg.com/vi/aZjDfJ_CSn0/mqdefault.jpg',
'https://i.ytimg.com/vi/4l77d67EiPc/mqdefault.jpg',
'https://i.ytimg.com/vi/LcPFWQ5JdoU/mqdefault.jpg',
'https://i.ytimg.com/vi/IdEStksoFaM/mqdefault.jpg',
'https://i.ytimg.com/vi/FA7BqhR_AkQ/mqdefault.jpg',
'https://i.ytimg.com/vi/saAS_RHRhDI/mqdefault.jpg',
'https://i.ytimg.com/vi/QHmGJKLGJs4/mqdefault.jpg',
'https://i.ytimg.com/vi/sZ0ElkxOwkY/mqdefault.jpg',
'https://i.ytimg.com/vi/uJy5FqDPumk/mqdefault.jpg',
'https://i.ytimg.com/vi/8tnv8TFsyTs/mqdefault.jpg',
'https://i.ytimg.com/vi/yA90NiAGuF8/mqdefault.jpg',

'https://i.ytimg.com/vi/mnAzbaVC8Vw/mqdefault.jpg',

'https://i.ytimg.com/vi/hHfpdyDFN6U/mqdefault.jpg',
'https://i.ytimg.com/vi/IaN7fW-RJPo/mqdefault.jpg',
'https://i.ytimg.com/vi/oLdNIIz3qWw/mqdefault.jpg',
'https://i.ytimg.com/vi/P0ifdqZm8wo/mqdefault.jpg',
'https://i.ytimg.com/vi/16fCDsC2Aks/mqdefault.jpg',
'https://i.ytimg.com/vi/_x5aMdhpeW8/mqdefault.jpg',
'https://i.ytimg.com/vi/_U9gzTHBSNo/mqdefault.jpg',
'https://i.ytimg.com/vi/xcJYrnd1lmM/mqdefault.jpg',
'https://i.ytimg.com/vi/Z1Jp0XgIjhY/mqdefault.jpg',
'https://i.ytimg.com/vi/VOa30rMc_A8/mqdefault.jpg',
'https://i.ytimg.com/vi/vEZPauFTld0/mqdefault.jpg',
'https://i.ytimg.com/vi/SlqA0WLMIJY/mqdefault.jpg',
'https://i.ytimg.com/vi/qGlRPIDpQpQ/mqdefault.jpg',
'https://i.ytimg.com/vi/Auf-ShZED9A/mqdefault.jpg',
'https://i.ytimg.com/vi/w0v3hA1u_lw/mqdefault.jpg',
'https://i.ytimg.com/vi/fTtmFkt7dh8/mqdefault.jpg',
'https://i.ytimg.com/vi/uUlbEGKij0k/mqdefault.jpg',
'https://i.ytimg.com/vi/aJS3Gn27ecQ/mqdefault.jpg',
'https://i.ytimg.com/vi/zNSZqWpbCjg/mqdefault.jpg',
'https://i.ytimg.com/vi/jWQZeh5QBEA/mqdefault.jpg',
'https://i.ytimg.com/vi/UH2tnm8-zFg/mqdefault.jpg',
'https://i.ytimg.com/vi/D6h2j9TK95U/mqdefault.jpg',
'https://i.ytimg.com/vi/7yENoBuBn6k/mqdefault.jpg',
'https://i.ytimg.com/vi/35i46aXGr_U/mqdefault.jpg',
'https://i.ytimg.com/vi/bJNWOULhxFA/mqdefault.jpg',
'https://i.ytimg.com/vi/e2ZTylMTA9A/mqdefault.jpg',
'https://i.ytimg.com/vi/JxVrbUUC8uk/mqdefault.jpg',
'https://i.ytimg.com/vi/F_ydWMhlg9s/mqdefault.jpg',
'https://i.ytimg.com/vi/nSO14XAm2GI/mqdefault.jpg',
'https://i.ytimg.com/vi/ZHabLKrF-Aw/mqdefault.jpg',
'https://i.ytimg.com/vi/0nHtK3Zokmg/mqdefault.jpg',
'https://i.ytimg.com/vi/EoW2sRMJeYs/mqdefault.jpg',
'https://i.ytimg.com/vi/eBa39x7Y-wU/mqdefault.jpg',
'https://i.ytimg.com/vi/QOt1T9L3pwU/mqdefault.jpg',
'https://i.ytimg.com/vi/QYL0t78oGTY/mqdefault.jpg',
'https://i.ytimg.com/vi/FHYxRO_3_VE/mqdefault.jpg',
'https://i.ytimg.com/vi/Ej1RFoHLtdg/mqdefault.jpg',
'https://i.ytimg.com/vi/mmHhbqnSoWs/mqdefault.jpg',
'https://i.ytimg.com/vi/uB_S_JdKmkM/mqdefault.jpg',
'https://i.ytimg.com/vi/gkgQkrTc0qU/mqdefault.jpg',
'https://i.ytimg.com/vi/NQx1S6RyK38/mqdefault.jpg',
'https://i.ytimg.com/vi/ghFq5nTxOwQ/mqdefault.jpg',
'https://i.ytimg.com/vi/OL8SskfX6eA/mqdefault.jpg',
'https://i.ytimg.com/vi/0TiPEETSxUo/mqdefault.jpg',
'https://i.ytimg.com/vi/Fv_9fQ3PFRY/mqdefault.jpg',
'https://i.ytimg.com/vi/JmSomKpSL-M/mqdefault.jpg',
'https://i.ytimg.com/vi/Xg1ozrPAwDI/mqdefault.jpg',
'https://i.ytimg.com/vi/_SUn0OWQo2k/mqdefault.jpg',
'https://i.ytimg.com/vi/HqKaV7V4L7A/mqdefault.jpg',
'https://i.ytimg.com/vi/L8mHUOlAw64/mqdefault.jpg',
'https://i.ytimg.com/vi/WsfRhqaLO_k/mqdefault.jpg',
'https://i.ytimg.com/vi/efXr9X648so/mqdefault.jpg',
'https://i.ytimg.com/vi/_8-sk4OwB78/mqdefault.jpg',
'https://i.ytimg.com/vi/mwJeACqV2Oc/mqdefault.jpg',
'https://i.ytimg.com/vi/kUbnGEpkT6E/mqdefault.jpg',
'https://i.ytimg.com/vi/VN95H7KjuL0/mqdefault.jpg',
'https://i.ytimg.com/vi/cAx6-HQejSI/mqdefault.jpg',
'https://i.ytimg.com/vi/VN5u1Jc3H5I/mqdefault.jpg',
'https://i.ytimg.com/vi/YTAG14wJsc0/mqdefault.jpg',
'https://i.ytimg.com/vi/bCNwtnv-3Qk/mqdefault.jpg',
'https://i.ytimg.com/vi/Xz8iTj-5Ndw/mqdefault.jpg',
'https://i.ytimg.com/vi/SonCPSaBlKA/mqdefault.jpg',
'https://i.ytimg.com/vi/8zIajtpgosA/mqdefault.jpg',
'https://i.ytimg.com/vi/yqHK0r7qhvk/mqdefault.jpg',
'https://i.ytimg.com/vi/gzKy7Y10h4g/mqdefault.jpg',
'https://i.ytimg.com/vi/-bgKWbqNyN0/mqdefault.jpg',
'https://i.ytimg.com/vi/OKHnZk0o9lM/mqdefault.jpg',
'https://i.ytimg.com/vi/0Vz-WHfPrI4/mqdefault.jpg',
'https://i.ytimg.com/vi/JQ_xgtun1kQ/mqdefault.jpg',
'https://i.ytimg.com/vi/f18K3nc2wAw/mqdefault.jpg',
'https://i.ytimg.com/vi/4hcPzIW8MfE/mqdefault.jpg',
'https://i.ytimg.com/vi/ieCOGEOXxr8/mqdefault.jpg',
'https://i.ytimg.com/vi/4c_DVoq-9oU/mqdefault.jpg',
'https://i.ytimg.com/vi/kct8627dspo/mqdefault.jpg',
'https://i.ytimg.com/vi/EDay9btUsKw/mqdefault.jpg',
'https://i.ytimg.com/vi/__P57MTTjyw/mqdefault.jpg',
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

  // ★★★ YouTubeサムネイルは「Stale-While-Revalidate」戦略に変更 ★★★
  if (url.hostname.includes('i.ytimg.com')) {
    event.respondWith(staleWhileRevalidateStrategy(request)); // ← ここを変更！
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