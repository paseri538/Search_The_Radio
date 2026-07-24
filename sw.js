// キャッシュの名前を定義。バージョンを更新すると古いキャッシュは自動的に削除。
const SW_VERSION = '20260724l';
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
  'kessokuband_watasi.json',
  'links.json',
  'logo.png',
  'logo.webp',
  'thumb-fallback.svg',
  'Impact.ttf',
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

    // ★変更: 不足分のネットワーク取得はインストール時には行わない。
    // 初回訪問時に約100枚を一斉ダウンロードすると、ページ本体の描画と
    // 帯域・CPUを奪い合ってローディングアニメーションがカクつくため、
    // ページ側が描画完了後に送る 'PRECACHE_THUMBS' メッセージで実行する。
    console.log('[SW] Install done (thumbnail fetch deferred until page settles)');
  })());
});

// 不足しているサムネイルをネットワークから取得してキャッシュする。
// ページ描画が落ち着いた頃（index.htmlが遅延送信するメッセージ）に呼ばれる。
async function precacheMissingThumbnails() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const thumbs = await getThumbnailAssets();
    const missing = [];
    for (const url of thumbs) {
      if (!(await cache.match(url))) missing.push(url);
    }
    if (missing.length === 0) return;
    // 帯域を占有しないよう4件ずつ順番に取得する。
    // （1件の404で全体を止めないため cache.add の失敗は無視して続行）
    let failed = 0;
    for (let i = 0; i < missing.length; i += 4) {
      const batch = missing.slice(i, i + 4).map(url => cache.add(url));
      const results = await Promise.allSettled(batch);
      failed += results.filter(r => r.status === 'rejected').length;
    }
    console.log(`[SW] Thumbnails: ${missing.length - failed} fetched, ${failed} failed`);
  } catch (e) {
    console.warn('[SW] Thumbnail precache failed:', e);
  }
}

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

  // GET以外（POST等）はキャッシュ対象外なので介入しない
  if (request.method !== 'GET') return;

  // http(s)以外（chrome-extension: 等）も介入しない
  if (!request.url.startsWith('http')) return;

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

  // ページのナビゲーションリクエスト (HTML) は「キャッシュ即時表示＋裏で更新」。
  // ★変更: 以前のNetwork Firstではネットワーク応答を待つ間ブラウザ既定の白画面が
  // 表示され、カラーテーマ設定時に「一瞬白くチラつく」原因になっていた。
  // キャッシュから即座に返すことでテーマ色を塗る早期スクリプトが最速で実行される。
  // （HTMLの更新は裏で取得してキャッシュに反映し、SW更新時はページ側の
  //   controllerchangeで自動リロードされるため、更新が届かなくなることはない）
  if (request.mode === 'navigate') {
    event.respondWith(appShellStrategy(request));
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
    // ネットワークエラー時: キャッシュも無い場合に undefined を respondWith に渡すと
    // TypeError になるため、必ず有効な Response を返す
    console.warn(`[SW] Fetch failed for ${request.url}; relying on cache.`, err);
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  });

  // キャッシュがあればそれを返し、裏でネットワークリクエストを実行
  // キャッシュがなければネットワークリクエストの結果を待つ
  return cachedResponse || fetchPromise;
}

// アプリシェル戦略（ナビゲーション用）:
// キャッシュ済みのトップページを即座に返して白画面をなくし、裏で最新版を取得して
// キャッシュを更新する。キャッシュが無い（初回訪問など）場合のみネットワークを待つ。
async function appShellStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  // ?q=... などクエリ付きURLでも同じアプリシェル(トップページ)を返す
  const cached = await cache.match('/') || await cache.match('index.html');

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put('/', networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  if (cached) return cached;

  const networkResponse = await fetchPromise;
  return networkResponse || new Response('オフラインのため読み込めませんでした。', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
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
    // ページ自体(navigate)のリクエストが失敗した場合、トップページを返す。
    // それも無い場合は undefined ではなく必ず有効な Response を返す（respondWithのTypeError防止）
    return cachedResponse
      || await caches.match('/')
      || new Response('オフラインのため読み込めませんでした。', {
           status: 503,
           statusText: 'Service Unavailable',
           headers: { 'Content-Type': 'text/plain; charset=utf-8' }
         });
  }
}


// ページからのメッセージ処理
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'PRECACHE_THUMBS') {
    // ページ描画が落ち着いた頃に呼ばれる、サムネイルの事前キャッシュ依頼
    event.waitUntil(precacheMissingThumbnails());
  }
});