let isInputFocused = false;

/**
 * ===================================================
 * ★★★ データと状態管理 ★★★
 * ===================================================
 */
let data = [];
let CUSTOM_READINGS = {};
let READING_TO_LABEL = {};
let selectedGuests = [];
let selectedCorners = [];
let selectedOthers = [];
let selectedYears = [];
let currentPage = 1;
const pageSize = 20;
let lastResults = [];
let clearAutocompleteSuggestions = () => {};
let isSearchTriggered = false;
let luckyButtonData = {};
let historyData = [];

const FAV_KEY = 'str_favs_v1';
let favorites = loadFavs();
let showFavoritesOnly = false;
let isRestoringURL = false;

// Guest colors (for active filters)
const guestColorMap = {
  "青山吉能": "#ff6496", "鈴代紗弓": "#fabe00", "水野朔": "#006ebe", "長谷川育美": "#e60046",
  "内田真礼": "#f09110", "千本木彩花": "#bbc3b8", "和多田美咲": "#a8eef4", "小岩井ことり": "#494386"
};

/**
 * ===================================================
 * ★★★ ユーティリティ関数 ★★★
 * ===================================================
 */
const normalize = (s) => (s || '').normalize('NFKC').replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)).toLowerCase().replace(/\s+/g, '');
const stripTimeSuffix = (s) => (s || '').replace(/[＠@]\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/, '');
const getVideoId = (link) => (link || '').match(/(?:v=|be\/)([\w-]{11})/)?.[1] || null;
const getHashNumber = (title) => title.match(/#(\d+)/)?.[0] || title;
const getEpisodeNumber = (episode) => /^\d+$/.test(episode) ? parseInt(episode, 10) : (episode === "緊急" || episode === "特別編" ? -1 : -2);
const getThumbnailUrl = (link) => {
    const videoId = getVideoId(link);
    // ★ 変更点: hqdefault.jpg から mqdefault.jpg に変更して軽量化
    return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "";
};

function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { return new Set(); }
}
function saveFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...favorites])); } catch (e) { console.error("Failed to save favorites:", e); }
}
function isFavorite(id) { return id ? favorites.has(id) : false; }
function toggleFavorite(id) {
  if (!id) return;
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveFavs();
}

function debounce(fn, ms = 40) {
  let timerId;
  const debouncedFn = (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), ms);
  };
  debouncedFn.cancel = () => {
    clearTimeout(timerId);
  };
  return debouncedFn;
}

/**
 * ===================================================
 * ★★★ データ読み込みとアプリケーション初期化 ★★★
 * ===================================================
 */
async function loadExternalData() {
  try {
    const [episodesRes, readingsRes, keywordsRes, luckyButtonRes, historyRes] = await Promise.all([
      fetch('episodes.json'), fetch('readings.json'), fetch('keywords.json'),
      fetch('lucky-button.json'), fetch('history.json')
    ]);
    const episodesData = await episodesRes.json();
    const readingsData = await readingsRes.json();
    const keywordsData = await keywordsRes.json();
    luckyButtonData = await luckyButtonRes.json();
    historyData = await historyRes.json();

    data = episodesData.map(ep => {
      const keywordsWithoutTimestamp = (ep.keywords || []).map(stripTimeSuffix);
      const guestText = Array.isArray(ep.guest) ? ep.guest.join(" ") : ep.guest;
      const combined = [ep.title, guestText, keywordsWithoutTimestamp.join(" ")].join(" ");
      ep.searchText = normalize(combined);
      return ep;
    });

    CUSTOM_READINGS = { ...readingsData, ...keywordsData };
    for (const kanji in CUSTOM_READINGS) {
      (CUSTOM_READINGS[kanji] || []).forEach(r => {
        READING_TO_LABEL[normalize(r)] = kanji;
      });
    }
    console.log("All data loaded successfully.");
  } catch (error) {
    console.error("Failed to load external data:", error);
    const resultsEl = document.getElementById('results');
    if (resultsEl) {
      resultsEl.innerHTML = '<li class="no-results">データの読み込みに失敗しました。<br>ページを再読み込みしてください。</li>';
    }
  }
}

async function initializeApp() {
  await loadExternalData();
  preloadThumbsFromData();

  // フォント準備後（または失敗後）に最初の検索とUIセットアップを実行
  if (!applyStateFromURL({ replace: true })) {
    search(); // このsearch内で最初の fitGuestLines が呼ばれる
  }
  // ★★★ ここまでが変更点 ★★★

  setupEventListeners();
  initializeAutocomplete();
  setupThemeSwitcher();
  setupModals();
  setupShareButtons();
  setupRightClickModal();
  formatYearButtons();
  updateHeaderOffset();
  console.log("Application initialized.");
}

function preloadThumbsFromData() {
  try {
    const head = document.head;
    const seen = new Set();
    
    const preloadData = data;

    preloadData.forEach(ep => {
      const episodeFilename = ep.episode;
      if (!episodeFilename || seen.has(episodeFilename)) return;
      seen.add(episodeFilename);

      // ▼▼▼ ここから変更 (JPGのみプリロード) ▼▼▼
      const linkJpg = document.createElement('link');
      linkJpg.rel = 'preload';
      linkJpg.as = 'image';
      linkJpg.href = `thumbnails/${episodeFilename}.jpg`;
      head.appendChild(linkJpg);
      // ▲▲▲ ここまで変更 ▲▲▲
    });
  } catch (e) {
    console.error('Thumbnail preload error:', e);
  }
}

/**
 * ===================================================
 * ★★★ 検索とフィルタリング ★★★
 * ===================================================
 */
function search(opts = {}) {
  isSearchTriggered = true;
  if (typeof clearAutocompleteSuggestions === 'function') clearAutocompleteSuggestions();
  setTimeout(() => { isSearchTriggered = false; }, 100);

  const searchBox = document.getElementById("searchBox");
  const sortSelect = document.getElementById("sortSelect");
  const raw = searchBox ? searchBox.value.trim() : ""; // ★ 修正: 検索キーワードを取得
  const sort = sortSelect ? sortSelect.value : "newest";

  let res = [...data];

  // 1. 「その他」フィルターが有効かを確認
  const isOtherFilterActive = selectedOthers.length > 0;

  // ★★★ ここからが変更点 ★★★
  // 1b. キーワードで「その他」が検索されているかを確認
  const normalizedRaw = normalize(raw);
  const isOtherKeywordSearch = (normalizedRaw === "そのた" || normalizedRaw === "その他");
  
  // 2. 「その他」フィルターが有効でなく、かつ「その他」キーワード検索でもない場合
  if (!isOtherFilterActive && !isOtherKeywordSearch) {
    // getEpisodeNumber は #付の数字、「緊急」「特別編」を -1 以上として判定します
    res = res.filter(it => getEpisodeNumber(it.episode) >= -1);
  }
  // ★★★ ここまでが変更点 ★★★

  if (normalize(raw).includes('いいね')) {
    rainGoodMarks();
  }

  // ★ 修正: ここから検索ロジックを変更します
  // ================================================

  // 3. キーワードが「数字 (スペース) 数字」のパターンかチェック
  //    (半角・全角スペース両方に対応)
  const rangeMatch = raw.match(/^(\d+)\s+(\d+)$/);

  if (rangeMatch) {
    // 3a. (A) パターンに一致した場合：エピソード番号の「範囲検索」を実行
    
    // 2つの数字を取得 (例: "1", "10")
    let num1 = parseInt(rangeMatch[1], 10);
    let num2 = parseInt(rangeMatch[2], 10);
    
    // ユーザーが "10 1" と入力しても "1 10" と同じになるよう、大小を自動判定
    const minNum = Math.min(num1, num2);
    const maxNum = Math.max(num1, num2);

    res = res.filter(it => {
      // getEpisodeNumber でエピソード番号を数値として取得
      const epNum = getEpisodeNumber(it.episode);
      // エピソード番号が指定された範囲内（例: 1～10）であれば true を返す
      return epNum >= minNum && epNum <= maxNum;
    });

  } else if (raw.length > 0) {
    // 3b. (B) パターンに一致しない場合：通常の「キーワード検索」を実行
    
    const normalizedQuery = normalize(raw);
        const searchTerms = new Set([normalizedQuery]);
        for (const key in CUSTOM_READINGS) {
            if (normalize(key).includes(normalizedQuery) || CUSTOM_READINGS[key].some(r => normalize(r).includes(normalizedQuery))) {
                searchTerms.add(normalize(key));
                CUSTOM_READINGS[key].forEach(r => searchTerms.add(normalize(r)));
            }
        }
        const searchWords = [...searchTerms].filter(Boolean);
        res = res.filter(it => searchWords.some(word => it.searchText.includes(word)));
  }
  // ================================================
  // ★ 修正はここまでです

  // Filters (これ以降は変更ありません)
  if (selectedGuests.length) {
      res = res.filter(it => {
          const guestArr = Array.isArray(it.guest) ? it.guest : (typeof it.guest === "string" ? [it.guest] : []);
          const hasKessoku = selectedGuests.includes("結束バンド");
          const hasOthers = selectedGuests.includes("その他");
          const indivGuests = selectedGuests.filter(g => g !== "結束バンド" && g !== "その他");
          
          let match = indivGuests.some(sel => it.searchText.includes(normalize(sel)));
          
          if (!match && hasKessoku) {
              match = ["鈴代紗弓", "水野朔", "長谷川育美"].every(m => guestArr.includes(m));
          }
          if (!match && hasOthers) {
              match = guestArr.some(name => !["青山吉能", "鈴代紗弓", "水野朔", "長谷川育美", "内田真礼", "千本木彩花", "和多田美咲", "小岩井ことり"].includes(name));
          }
          return match;
      });
  }
  if (selectedCorners.length) res = res.filter(it => selectedCorners.some(c => it.searchText.includes(normalize(c))));
  if (selectedOthers.length) res = res.filter(it => selectedOthers.some(o => it.searchText.includes(normalize(o))));
  if (selectedYears.length) res = res.filter(it => selectedYears.includes(String(it.date).slice(0, 4)));
  if (showFavoritesOnly) res = res.filter(it => isFavorite(getVideoId(it.link)));

  // Sorting
  const parseDate = (dateStr) => new Date((dateStr || '').replace(/\./g, '-'));

  if (sort === "newest") res.sort((a, b) => parseDate(b.date) - parseDate(a.date) || getEpisodeNumber(b.episode) - getEpisodeNumber(a.episode));
  else if (sort === "oldest") res.sort((a, b) => parseDate(a.date) - parseDate(b.date) || getEpisodeNumber(a.episode) - getEpisodeNumber(b.episode));
  else if (sort === "longest" || sort === "shortest") {
    const toSec = s => (s || "0:0").split(":").map(Number).reduce((acc, time) => 60 * acc + time, 0);
    res.sort((a, b) => sort === "longest" ? toSec(b.duration) - toSec(a.duration) : toSec(a.duration) - toSec(b.duration));
  }

  lastResults = res;
  document.getElementById('fixedResultsCount').innerHTML = `表示数：<span class="impact-number">${res.length}</span>件`;
  currentPage = opts.gotoPage || 1;
  if (!isRestoringURL) buildURLFromState({ method: 'push' });

  renderResults(res, currentPage);
  renderPagination(res.length);
  updateActiveFilters();
  updatePlaylistButtonVisibility();
}

function resetFilters() {
  selectedGuests = [];
  selectedCorners = [];
  selectedOthers = [];
  selectedYears = [];
  updateFilterButtonStyles();
  search();
}

function resetSearch() {
  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  if (searchBox) searchBox.value = "";
  searchBox.dispatchEvent(new Event('input'));
  if (sortSelect) sortSelect.value = "newest";

  if (showFavoritesOnly) {
    favorites.clear();
    saveFavs();
    showFavoritesOnly = false;
    document.body.classList.remove('fav-only');
    const favBtn = document.getElementById("favOnlyToggleBtn");
    if (favBtn) {
      favBtn.classList.remove("active");
      favBtn.setAttribute("aria-pressed", "false");
    }
    document.querySelectorAll("#results .fav-btn.active").forEach(btn => {
      btn.classList.remove("active");
      const icon = btn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-solid");
        icon.classList.add("fa-regular");
      }
    });
  }

  resetFilters();
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }

  // もしフィルターモーダルが開いていたら、閉じる処理を呼び出します。
  if (typeof window.toggleFilterDrawer === 'function') {
    window.toggleFilterDrawer(false);
  }
  document.getElementById('mainResetBtn')?.blur();
}

/**
 * ===================================================
 * ★★★ UIレンダリングと更新 ★★★
 * ===================================================
 */


/* 「公開年検索」ボタンの見た目を整形する関数*/
function formatYearButtons() {
  // classが "btn-year" のボタンをすべて取得します
  document.querySelectorAll('.btn-year').forEach(button => {
    // ボタンの data-year 属性から年 (例: "2022") を取得します
    const year = button.dataset.year;
    if (year) {
      // ボタンの中身を、Impactフォント用のspanで囲んだ数字だけに書き換えます
      button.innerHTML = `<span class="impact-number">${year}</span>`;
    }
  });
}

function renderResults(arr, page = 1) {
  const ul = document.getElementById("results");
  ul.innerHTML = "";

  if (!arr || arr.length === 0) {
    ul.innerHTML = `<li class="no-results"><div class="no-results-icon">表示できる回はありません。</div></li>`;
    return;
  }

  const startIdx = (page - 1) * pageSize;
  const endIdx = page * pageSize;
  const qRaw = document.getElementById('searchBox').value.trim();
  const cornerTarget = selectedCorners.length === 1 ? selectedCorners[0] : null;
  const isLuckyButtonSearch = (normalize(qRaw) === "らっきーぼたん" || selectedCorners.includes("ラッキーボタン"));

  const fragment = document.createDocumentFragment();

  arr.slice(startIdx, endIdx).forEach((it, index) => {
    const videoId = getVideoId(it.link); // ★お気に入り機能で使うため、この行は残します
    
    // ▼▼▼ ここから変更 (JPGのみ) ▼▼▼
    // episode の値をファイル名として使用
    const episodeFilename = it.episode;
    // サムネイル画像のパスをローカルに変更 (例: thumbnails/89.jpg)
    const thumbBaseUrl = `thumbnails/${episodeFilename}`;
    const thumbUrlJpg = `${thumbBaseUrl}.jpg`;
    // const thumbUrlWebp = `${thumbBaseUrl}.webp`; // WebPの行を削除
    // ▲▲▲ ここまで変更 ▲▲▲

    const hashOnly = getHashNumber(it.title);

    let hit = findHitTime(it, qRaw);
    if (!hit && selectedGuests.length > 0) {
        for(const guest of selectedGuests) {
            // ★★★↓ここから下を追加↓★★★
            // 「結束バンド」と「その他」はタイムスタンプ検索の対象から除外
            if (guest === "結束バンド" || guest === "その他") {
                continue;
            }
            // ★★★↑ここまで↑★★★
            hit = findHitTime(it, guest);
            if(hit) break;
        }
    }
    if (!hit && cornerTarget) {
      hit = findHitTime(it, cornerTarget);
    }
    const finalLink = hit ? withTimeParam(it.link, hit.seconds) : it.link;

// main.js に記述する新しいコード
let guestText = "";
// ★ここからが変更点です★
// episodeが「京まふ大作戦」または「CENTRALSTATION」の場合の特別処理
if (it.episode.startsWith("京まふ大作戦") || it.episode === "CENTRALSTATION") {
  
  // JSONからゲストリストを取得します (配列でなければ配列に変換)
  const guestList = Array.isArray(it.guest) ? it.guest : [it.guest].filter(Boolean);
  
  // Set を使って、「青山吉能」さんを先頭に追加しつつ、
  // JSON側で既に入力されていても重複しないようにします。
  const membersSet = new Set(["青山吉能", ...guestList]);
  
  // Set から配列に戻して、最終的な出演者リストを作成します
  const members = [...membersSet];
  
  // 「出演：」という接頭辞で表示します
  guestText = "出演：" + members.join("、");
}
// ★ここまでが変更点です★
else if (Array.isArray(it.guest)) {
  guestText = "ゲスト：" + it.guest.join("、");
} else if (it.guest === "青山吉能") {
  guestText = "パーソナリティ：青山吉能";
} else if (it.guest && it.guest !== "その他") {
  guestText = `ゲスト：${it.guest}`;
}

    if (isLuckyButtonSearch) {
      const episodeKey = it.episode === "02" && it.title.includes("京まふ") ? "京まふ" : it.episode;
      guestText = luckyButtonData[episodeKey] || guestText;
    }

    const li = document.createElement('li');
    li.className = 'episode-item';
    li.setAttribute('role', 'link');
    li.tabIndex = 0;
    li.style.setProperty('--i', index.toString());

    // ▼▼▼ li.innerHTML 内の <picture> と <source> を削除し、<img> のみに修正 ▼▼▼
    li.innerHTML = `
  <a href="${finalLink}" target="_blank" rel="noopener" style="display:flex;text-decoration:none;color:inherit;align-items:center;min-width:0;">
    <div class="thumb-col">
      <img src="${thumbUrlJpg}" class="thumbnail" alt="サムネイル：${hashOnly}" 
           decoding="async" 
           onload="this.classList.add('loaded')"
           onerror="this.onerror=null; this.src='./thumb-fallback.svg'; this.classList.add('loaded');">
      ${hit ? `<div class="ts-buttons"><button class="ts-btn" data-url="${it.link}" data-ts="${hit.seconds}" aria-label="${hit.label} から再生"><span class="impact-number">${hit.label}</span></button></div>` : ''}
    </div>
    <div style="min-width:0;">
      <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
        <h5 class="mb-1">
          ${
            hashOnly.startsWith('#')
              ? `<span class="impact-number">${hashOnly}</span>`
              : hashOnly.replace(/([A-Za-z0-9]+)/g, '<span class="impact-number">$1</span>')
          }${/\u3000/.test(it.title) ? "<br>" : " "}
          <span class="guest-one-line" aria-label="${guestText}" style="visibility: hidden;">${guestText}</span>
        </h5>
      </div>
      <p class="episode-meta">公開日時：<span class="impact-number">${it.date}</span><br>動画時間：${(it.duration ? `<span class="impact-number">${it.duration}</span>` : '?')}</p>
    </div>
  </a>
  <button class="fav-btn" data-id="${videoId}" aria-label="お気に入り" title="お気に入り"><i class="fa-regular fa-star"></i></button>
`;
    // ▲▲▲ ここまで変更 ▲▲▲
    
    if (isFavorite(videoId)) {
      const favBtn = li.querySelector('.fav-btn');
      li.classList.add('is-fav');
      favBtn.classList.add('active');
      favBtn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
    }
    fragment.appendChild(li);
  });

  ul.appendChild(fragment);

  requestAnimationFrame(() => {
    requestAnimationFrame(fitGuestLines);
  });
}

function renderPagination(totalCount) {
  const area = document.getElementById("paginationArea");
  area.innerHTML = "";
  const totalPage = Math.ceil(totalCount / pageSize);
  if (totalPage <= 1) return;
  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= totalPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === currentPage ? ' active' : ''}`;
    btn.dataset.page = i;
    btn.tabIndex = 0;
    btn.setAttribute('aria-label', `ページ${i}`);
    btn.innerHTML = `<span class="impact-number">${i}</span>`;
    fragment.appendChild(btn);
  }
  area.appendChild(fragment);
}

function updateActiveFilters() {
  const area = document.getElementById("filtersBar");
  const searchBox = document.getElementById("searchBox");
  let html = '';
  if (searchBox.value.trim()) {
    html += `<button class="filter-tag" tabindex="0" aria-label="キーワード解除" data-type="keyword">
               <i class="fa fa-search"></i> "${searchBox.value.trim()}" <i class="fa fa-xmark"></i>
             </button>`;
  }
  selectedGuests.forEach(g => {
    const style = g === "結束バンド"
      ? `style="background:linear-gradient(90deg, #fa01fa 0 25%, #fdfe0f 25% 50%, #15f4f3 50% 75%, #f93e07 75% 100%);color:#222;border:none;"`
      : (guestColorMap[g] ? `style="background:${guestColorMap[g]};color:#222;"` : '');
    html += `<button class="filter-tag" tabindex="0" aria-label="出演者フィルタ解除 ${g}" data-type="guest" data-value="${g}" ${style}>
               <i class="fa fa-user"></i> ${g} <i class="fa fa-xmark"></i>
             </button>`;
  });
  selectedCorners.forEach(c => html += `<button class="filter-tag" tabindex="0" aria-label="コーナーフィルタ解除 ${c}" data-type="corner" data-value="${c}"><i class="fa fa-cubes"></i> ${c} <i class="fa fa-xmark"></i></button>`);
  selectedOthers.forEach(o => html += `<button class="filter-tag" tabindex="0" aria-label="その他フィルタ解除 ${o}" data-type="other" data-value="${o}"><i class="fa fa-star"></i> ${o} <i class="fa fa-xmark"></i></button>`);
  selectedYears.forEach(y => html += `<button class="filter-tag" tabindex="0" aria-label="年フィルタ解除 ${y}" data-type="year" data-value="${y}"><i class="fa fa-calendar"></i> <span class="impact-number">${y}</span> <i class="fa fa-xmark"></i></button>`);
  area.innerHTML = html;
}

function updateFilterButtonStyles() {
  document.querySelectorAll('.guest-button[data-guest]').forEach(btn => {
    const active = selectedGuests.includes(btn.dataset.guest);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.btn-corner[data-corner]').forEach(btn => {
    const active = selectedCorners.includes(btn.dataset.corner);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.btn-corner[data-other]').forEach(btn => {
    const active = selectedOthers.includes(btn.dataset.other);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.btn-year[data-year]').forEach(btn => {
    const active = selectedYears.includes(String(btn.dataset.year));
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

/* ======================================================================== */
/* ===== ゲスト名表示の最適化 (高効率な計算ロジックに更新) ===== */
/* ======================================================================== */
function fitGuestLines() {
  const guestLines = document.querySelectorAll('.guest-one-line');
  let needsRetry = false; // ★追加: リトライが必要かどうかのフラグ

  guestLines.forEach(line => {
    // 1. スタイルを初期状態に戻します
    line.style.fontSize = '';
    line.style.whiteSpace = 'normal';
    
    const parent = line.parentElement;
    if (!parent) {
      line.style.visibility = 'visible';
      return;
    }

    // 2. 親要素の幅を取得
    const parentWidth = parent.clientWidth;
    
    // 3. ★修正: 親の幅が100px以下の場合、レイアウト未完了とみなしリトライ
    if (parentWidth <= 100) { // 閾値を 50 から 100 に変更
      needsRetry = true; // ★追加: リトライフラグを立てる
      return; // この要素の処理を中断
    }

    // 4. 常に1行で表示するように設定
    line.style.whiteSpace = 'nowrap';
    const currentWidth = line.scrollWidth;
    
    // 5. 最小フォントサイズを9pxに設定
    const MIN_FONT_SIZE = 9;

    // 6. 親の幅よりテキストが長いかチェック
    if (currentWidth > parentWidth) {
      const originalSize = parseFloat(window.getComputedStyle(line).fontSize);
      let newSize = (parentWidth / currentWidth) * originalSize;

      // 7. 計算結果が9px未満でも、9pxを適用します。
      const finalSize = Math.max(newSize, MIN_FONT_SIZE);
      line.style.fontSize = finalSize + 'px';

      // ★★★ ここから修正 ★★★
      // 最小フォントサイズ(9px)でもはみ出す場合に、省略記号(...)クラスを付与
      if (finalSize === MIN_FONT_SIZE && line.scrollWidth > parentWidth) {
        line.classList.add('needs-ellipsis');
      } else {
        line.classList.remove('needs-ellipsis'); // はみ出さない場合はクラスを削除
      }
      // ★★★ ここまで ★★★

    } else {
      line.classList.remove('needs-ellipsis'); // はみ出さない場合はクラスを削除
    }
    
    // 8. 計算が完了したので、表示状態に戻します
    line.style.visibility = 'visible';
  });

  // 9. ★追加: リトライが必要な要素が1つでもあれば、100ms後に再実行
  if (needsRetry) {
    setTimeout(fitGuestLines, 100);
  }
}

function updatePlaylistButtonVisibility() {
    const btn = document.getElementById('createPlaylistBtn');
    const note = document.getElementById('playlistNote'); // ★ 注釈spanを取得
    if (btn && note) { // ★ noteもチェック
        const shouldShow = (lastResults && lastResults.length > 0);
        btn.hidden = !shouldShow;
        note.hidden = !shouldShow; // ★ 注釈の表示/非表示も連動
    }
}

function createPlaylist() {
    // 1. 既存のロジックで動画IDリストを取得 (変更なし)
    if (!lastResults || lastResults.length === 0) {
        alert('再生リストを作成するには、表示結果が1件以上必要です。');
        return;
    }
    const videoIds = lastResults.map(item => getVideoId(item.link)).filter(Boolean);
    if (videoIds.length === 0) {
        alert('有効な動画IDが見つかりませんでした。');
        return;
    }

    // ▼▼▼ ここからが修正箇所です ▼▼▼

    // 2. YouTubeアプリ用のURLスキームを作成 (https:// を youtube:// に変更)
    //    (これが機能すれば、アプリが直接起動します)
    const appUrl = `youtube://watch_videos?video_ids=${videoIds.join(',')}`;
    
    // 3. ブラウザ用のフォールバックURL (https://)
    //    (アプリ起動が失敗した場合に使います)
    const webUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;

    let timer;
    let appLaunched = false;

    // アプリが起動してPWAがバックグラウンドに回ったかを監視するリスナー
    const visibilityChangeHandler = () => {
        if (document.visibilityState === 'hidden') {
            // PWAが非表示になった = アプリが起動した
            appLaunched = true;
            if (timer) clearTimeout(timer); // タイムアウト処理をキャンセル
            document.removeEventListener('visibilitychange', visibilityChangeHandler);
        }
    };

    // 監視を開始
    document.addEventListener('visibilitychange', visibilityChangeHandler);

    // 4. アプリ起動を試みる (<a> タグを使用)
    const a_app = document.createElement('a');
    a_app.href = appUrl;
    a_app.style.display = 'none';
    document.body.appendChild(a_app);
    a_app.click(); // アプリ起動を試行
    document.body.removeChild(a_app);

    // 5. タイムアウトを設定 
    timer = setTimeout(() => {
        // リスナーを忘れずに削除
        document.removeEventListener('visibilitychange', visibilityChangeHandler);

        if (!appLaunched) {
            // タップしてもアプリが起動しなかった (PWAが非表示にならなかった)
            // = アプリがインストールされていない、またはURLスキームが無効だった場合
            
            // フォールバックとしてブラウザ（Safari）で開く
            const a_web = document.createElement('a');
            a_web.href = webUrl;
            a_web.target = '_blank'; // Safariで新しいタブとして開く
            a_web.rel = 'noopener noreferrer';
            a_web.style.display = 'none';
            document.body.appendChild(a_web);
            a_web.click();
            document.body.removeChild(a_web);
        }
        // appLaunched が true の場合は、既にアプリが起動しているので何もしません。
        
    }, 100); // 待機
    // ▲▲▲ 修正はここまでです ▲▲▲
}

/**
 * ===================================================
 * ★★★ URL状態管理 ★★★
 * ===================================================
 */
function buildURLFromState({ method = 'push' } = {}) {
  if (isRestoringURL) return;
  const params = new URLSearchParams();
  const q = document.getElementById('searchBox').value.trim();
  if (q) params.set('q', q);
  selectedGuests.forEach(v => params.append('g', v));
  selectedCorners.forEach(v => params.append('c', v));
  selectedOthers.forEach(v => params.append('o', v));
  selectedYears.forEach(y => params.append('y', String(y)));
  const sort = document.getElementById('sortSelect').value;
  if (sort !== 'newest') params.set('sort', sort);
  if (showFavoritesOnly) params.set('fav', '1');
  if (currentPage > 1) params.set('p', String(currentPage));
  const qs = params.toString();
  const url = qs ? `?${qs}` : location.pathname;
  const state = { q, selectedGuests, selectedCorners, selectedOthers, selectedYears, sort, fav: showFavoritesOnly, p: currentPage };
  try {
    history[method === 'replace' ? 'replaceState' : 'pushState'](state, '', url);
  } catch {}
}

function applyStateFromURL({ replace = false } = {}) {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return false;
  isRestoringURL = true;

  const readMulti = (key) => params.getAll(key).flatMap(v => v.includes(',') ? v.split(',') : v).map(decodeURIComponent).filter(Boolean);
  document.getElementById('searchBox').value = params.get('q') || '';
  selectedGuests = readMulti('g');
  selectedCorners = readMulti('c');
  selectedOthers = readMulti('o');
  selectedYears = readMulti('y').map(String);
  document.getElementById('sortSelect').value = params.get('sort') || 'newest';
  showFavoritesOnly = params.get('fav') === '1';
  const favBtn = document.getElementById('favOnlyToggleBtn');
  favBtn.classList.toggle('active', showFavoritesOnly);
  favBtn.setAttribute('aria-pressed', showFavoritesOnly);
  document.body.classList.toggle('fav-only', showFavoritesOnly);
  updateFilterButtonStyles();
  currentPage = parseInt(params.get('p') || '1', 10) || 1;

  search({ gotoPage: currentPage });
  isRestoringURL = false;
  if (replace) buildURLFromState({ method: 'replace' });
  return true;
}
/**
 * ===================================================
 * ★★★ ユーティリティ関数（追記） ★★★
 * ===================================================
 */
function scrollToResultsTop() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    // ヘッダーの高さを考慮して、結果リストの先頭にスクロール
    const top = mainContent.getBoundingClientRect().top + window.pageYOffset - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }
}

/**
 * ===================================================
 * ★★★ イベントリスナー設定 ★★★
 * ===================================================
 */
function setupEventListeners() {
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  const drawer = document.getElementById('filterDrawer');
  const backdrop = document.getElementById('drawerBackdrop');

  const toggleFilterDrawer = (forceOpen) => {
    const style = window.getComputedStyle(drawer);
    const isVisible = style.display !== 'none';
    const isOpening = forceOpen === true || (forceOpen !== false && !isVisible);

    drawer.style.display = isOpening ? 'block' : 'none';
    backdrop.classList.toggle('show', isOpening);
    filterToggleBtn.setAttribute('aria-expanded', String(isOpening));
    filterToggleBtn.setAttribute('aria-pressed', String(isOpening));

    if (isOpening) window.acquireBodyLock();
    else window.releaseBodyLock();
  };
  window.toggleFilterDrawer = toggleFilterDrawer;

  filterToggleBtn.addEventListener('click', () => toggleFilterDrawer());
  document.getElementById('drawerCloseBtn').addEventListener('click', () => toggleFilterDrawer(false));
  backdrop.addEventListener('click', () => toggleFilterDrawer(false));

  document.getElementById('favOnlyToggleBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    showFavoritesOnly = !showFavoritesOnly;
    btn.setAttribute('aria-pressed', String(showFavoritesOnly));
    btn.classList.toggle('active', showFavoritesOnly);
    document.body.classList.toggle('fav-only', showFavoritesOnly);
    search({ gotoPage: 1 });
  });

  document.getElementById('randomBtn').addEventListener('click', () => {
    const pool = (lastResults.length > 0) ? lastResults : data;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.open(pick.link, '_blank', 'noopener');
  });

  document.getElementById('mainResetBtn').addEventListener('click', resetSearch);
  document.getElementById('sortSelect').addEventListener('change', () => search());

  const handleFilterClick = (e, collection, type) => {
      const btn = e.target.closest(`[data-${type}]`);
      if (!btn) return;
      const value = btn.dataset[type];
      const index = collection.indexOf(value);
      index > -1 ? collection.splice(index, 1) : collection.push(value);
      updateFilterButtonStyles();
      search();
      scrollToResultsTop();
  };

  document.querySelector('.guest-button-group').addEventListener('click', e => handleFilterClick(e, selectedGuests, 'guest'));
  document.getElementById('cornerButtonGroup').addEventListener('click', e => handleFilterClick(e, selectedCorners, 'corner'));
  document.getElementById('otherButtonGroup').addEventListener('click', e => handleFilterClick(e, selectedOthers, 'other'));
  document.getElementById('yearButtonGroup').addEventListener('click', e => handleFilterClick(e, selectedYears, 'year'));

  document.getElementById('paginationArea').addEventListener('click', e => {
    const btn = e.target.closest('.page-btn');
    if (btn && !btn.classList.contains('active')) {
      currentPage = parseInt(btn.dataset.page, 10);
      search({ gotoPage: currentPage });
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const top = mainContent.getBoundingClientRect().top + window.pageYOffset - 24;
        window.scrollTo({ top, behavior: 'auto' });
      }
    }
  });

  document.getElementById('filtersBar').addEventListener('click', e => {
    const tag = e.target.closest('.filter-tag');
    if (!tag) return;
    const { type, value } = tag.dataset;
    if (type === 'keyword') document.getElementById('searchBox').value = '';
    else if (type === 'guest') selectedGuests = selectedGuests.filter(g => g !== value);
    else if (type === 'corner') selectedCorners = selectedCorners.filter(c => c !== value);
    else if (type === 'other') selectedOthers = selectedOthers.filter(o => o !== value);
    else if (type === 'year') selectedYears = selectedYears.filter(y => y !== String(value));
    searchBox.dispatchEvent(new Event('input'));
    updateFilterButtonStyles();
    search();
    scrollToResultsTop();
  });

  document.getElementById('results').addEventListener('click', e => {
    const target = e.target;
    const favBtn = target.closest('.fav-btn');
    if (favBtn) {
      e.preventDefault(); e.stopPropagation();
      const id = favBtn.dataset.id;
      toggleFavorite(id);
      favBtn.classList.toggle('active');
      favBtn.querySelector('i').classList.toggle('fa-regular');
      favBtn.querySelector('i').classList.toggle('fa-solid');
      favBtn.closest('.episode-item').classList.toggle('is-fav', isFavorite(id));
      if (showFavoritesOnly) search({ gotoPage: currentPage });
      return;
    }
    const tsBtn = target.closest('.ts-btn');
    if (tsBtn) {
      e.preventDefault(); e.stopPropagation();
      window.open(withTimeParam(tsBtn.dataset.url, Number(tsBtn.dataset.ts)), '_blank', 'noopener');
      return;
    }
  });

  document.getElementById('results').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('episode-item')) {
      const link = e.target.querySelector('a');
      if (link) {
        e.preventDefault();
        link.click();
      }
    }
  });

  document.getElementById('createPlaylistBtn').addEventListener('click', createPlaylist);
  window.addEventListener('popstate', () => applyStateFromURL({ replace: false }));
  // ★ 変更点: passive: true を追加してスクロール性能を向上
  window.addEventListener('orientationchange', () => setTimeout(fitGuestLines, 120), { passive: true });

  ['filterToggleBtn', 'favOnlyToggleBtn', 'randomBtn', 'mainResetBtn', 'historyToggle'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
          setTimeout(() => el.blur(), 0);
        }
      });
    }
  });

  // 画面のリサイズ時にも文字サイズを調整するようにイベントリスナーを追加
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    // リサイズ操作が終わった少し後に実行することで、処理の負荷を軽減します
    resizeTimer = setTimeout(fitGuestLines, 150);
  }, { passive: true });

  // 並び替えセレクトボックスが変更された時の処理
  document.getElementById('sortSelect').addEventListener('change', () => {
    search();
    scrollToResultsTop();
  });

  // ===================================================
  // ★★★ 検索ボックスのクリアボタン機能 ★★★
  // ===================================================
  const searchBoxForClear = document.getElementById('searchBox');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  if (searchBoxForClear && clearSearchBtn) {
    // ボタンの表示/非表示を切り替える関数
    const toggleClearBtn = () => {
      clearSearchBtn.hidden = !searchBoxForClear.value;
    };

    // 入力があるたびに、表示をチェック
    searchBoxForClear.addEventListener('input', toggleClearBtn);

    // ボタンがクリックされた時の処理
    clearSearchBtn.addEventListener('click', () => {
      searchBoxForClear.value = ''; // 入力欄を空にする
      toggleClearBtn(); // ボタンを非表示にする
      search(); // 検索を再実行して結果をリセット
      searchBoxForClear.focus(); // 続けて入力できるようフォーカスを戻す
    });

    // ページ読み込み時（URLから復元された場合など）にも一度チェック
    toggleClearBtn();
  }

  // ===================================================
  // ★★★ 検索ボックス内の検索ボタン機能 ★★★
  // ===================================================
  const mainSearchBtn = document.getElementById('mainSearchBtn');
  if (mainSearchBtn) {
    mainSearchBtn.addEventListener('click', () => {
      // 既存の検索関数とスクロール関数を呼び出すだけ
      search();
      scrollToResultsTop();
      mainSearchBtn.blur(); // クリック後にボタンのフォーカスを外す
    });
  }
}

/**
 * ===================================================
 * ★★★ その他のUI機能 ★★★
 * ===================================================
 */


(function scrollLockModule() {
  let lockCount = 0;
  const htmlElement = document.documentElement;
  const stickyHeader = document.querySelector('.sticky-search-area');

  window.acquireBodyLock = () => {
    if (lockCount === 0) {
      // スクロールバーの幅を計算
      const scrollbarWidth = window.innerWidth - htmlElement.clientWidth;
      
      // スクロールバーが消えることによるレイアウトのズレを防止
      if (scrollbarWidth > 0 && stickyHeader) {
        stickyHeader.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // ★★★ この行を追加 ★★★
      // html要素にクラスを付与してスクロールを禁止 (ナビゲーションバーを隠すトリガー)
      htmlElement.classList.add('scroll-locked');
    }
    lockCount++;
  };

  window.releaseBodyLock = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      // ズレ防止のpaddingを元に戻す
      if (stickyHeader) {
        stickyHeader.style.paddingRight = '';
      }
      
      // ★★★ この行を追加 ★★★
      // スクロール禁止を解除 (ナビゲーションバーを戻すトリガー)
      htmlElement.classList.remove('scroll-locked');
    }
  };
  
  window.__hardUnlockScroll = () => {
    lockCount = 0;
    window.releaseBodyLock();
  };
})();

function setupThemeSwitcher() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const panel = document.getElementById('floating-theme-panel');
  if (!toggleBtn || !panel) return;

  const THEME_KEY = 'site_theme_v1';
  const allThemeClasses = ['dark-mode', 'theme-pink', 'theme-yellow', 'theme-blue', 'theme-red', 'theme-green'];

  // パネルの表示状態を監視し、トリガーボタンのアクティブ状態を同期する
  // (PWA版のロジックをこちらにも適用)
  const observer = new MutationObserver(() => {
    const isActive = panel.classList.contains('show');
    toggleBtn.classList.toggle('is-active', isActive);
  });
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  
  // 初期状態を同期
  toggleBtn.classList.toggle('is-active', panel.classList.contains('show'));

  applyTheme = (themeName) => {
    document.body.classList.remove(...allThemeClasses);
    if (themeName === 'dark') document.body.classList.add('dark-mode');
    else if (themeName && themeName !== 'light') document.body.classList.add(`theme-${themeName}`);
    panel.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    panel.querySelector(`.theme-btn[data-theme="${themeName}"]`)?.classList.add('active');
    try { localStorage.setItem(THEME_KEY, themeName); } catch (e) {}

   // 背景が濃く、ステータスバーの文字を白にすべきテーマをリスト化します
    const isDarkStyleStatusBar = ['dark', 'pink', 'blue', 'red', 'green'].includes(themeName);
    const statusBar = document.getElementById('status-bar-style');
    const themeColorMeta = document.getElementById('theme-color-meta');
    
    // iOS PWAのステータスバーの文字色をテーマに応じて変更
    // (lightやyellow: 黒文字, それ以外: 白文字)
    if (statusBar) {
      statusBar.content = isDarkStyleStatusBar ? 'black-translucent' : 'default';
    }

    // Android PWAの上部バーの色をテーマに応じて変更
    if (themeColorMeta) {
      let color = '#f9fafe'; // lightテーマのデフォルト色
      switch (themeName) {
        case 'dark':   color = '#22272e'; break;
        case 'pink':   color = '#ff6496'; break;
        case 'yellow': color = '#fabe00'; break;
        case 'blue':   color = '#006ebe'; break;
        case 'red':    color = '#e60046'; break;
        case 'green':  color = '#13a286'; break;
      }
      themeColorMeta.content = color;
    }

    // ちらつき防止用のインラインスタイルを、常に現在のテーマと同期させます
    const earlyStyle = document.getElementById('early-theme-style');
    if (earlyStyle) {
      let bodyBg = '';
      switch (themeName) {
        case 'dark':   bodyBg = '#22272e'; break;
        case 'pink':   bodyBg = '#ff6496'; break;
        case 'yellow': bodyBg = '#fabe00'; break;
        case 'blue':   bodyBg = '#006ebe'; break;
        case 'red':    bodyBg = '#e60046'; break;
        case 'green':  bodyBg = '#13a286'; break;
      }

      // ライトテーマに戻す場合はスタイル指定を空にし、
      // それ以外のテーマでは背景色を!importantで上書きし続けます。
      if (bodyBg) {
        earlyStyle.textContent = 'html, body, #loading-screen { background-color: ' + bodyBg + ' !important; }';
      } else {
        earlyStyle.textContent = ''; // ライトテーマの場合はリセット
      }
    }
  };

  toggleBtn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('show'); });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('show') && !toggleBtn.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove('show');
    }
  });
  panel.addEventListener('click', e => {
    const themeBtn = e.target.closest('.theme-btn');
    if (themeBtn) {
      applyTheme(themeBtn.dataset.theme);
      panel.classList.remove('show');
    }
  });

  try { applyTheme(localStorage.getItem(THEME_KEY) || 'light'); } catch (e) { applyTheme('light'); }
}

function setupModals() {
    const setup = (modalId, openTriggerId, closeBtnId) => {
        const modal = document.getElementById(modalId);
        const modalContent = modal ? modal.querySelector('.modal-content, #aboutModalContent') : null;
        const openTrigger = document.getElementById(openTriggerId);
        const closeBtn = document.getElementById(closeBtnId);
        if (!modal || !openTrigger || !closeBtn || !modalContent) return { openModal: ()=>{}, closeModal: ()=>{} };

        let closeTimer = null;

        const openModal = () => {
            if (modal.classList.contains('show') || modal.classList.contains('closing')) return;

            // ★ここからが修正箇所です
            // アニメーションをリセットするために、一度クラスを確実に削除します
            modal.classList.remove('show');
            modal.classList.remove('closing');

            // ブラウザに上記の変更を強制的に認識させます（アニメーションリセットのおまじないです）
            void modal.offsetWidth;
            // ★ここまでが修正箇所です

            if (modalId === 'historyModal' && !modal.dataset.built) {
                buildTimeline(historyData);
                modal.dataset.built = 'true';
            }

            modal.hidden = false;

            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
            window.acquireBodyLock();
        };
        
        const closeModal = () => {
            if (!modal.classList.contains('show')) return;
        
            modal.classList.add('closing');
            modal.classList.remove('show');
        
            let isClosed = false;
        
            // 閉じる処理の本体
            const finishClose = () => {
                if (isClosed) return; // 処理が重複しないようにガード
                isClosed = true;
        
                modal.hidden = true;
                modal.classList.remove('closing');
        
                // 念のため、イベントリスナーを解除
                modal.removeEventListener('animationend', onAnimationEnd);
                
                window.releaseBodyLock();
            };
        
            // アニメーション完了を待つリスナー
            const onAnimationEnd = (e) => {
                // イベントの発生元がモーダル自身の場合のみ処理する
                if (e.target === modal) {
                    finishClose();
                }
            };
        
            modal.addEventListener('animationend', onAnimationEnd);
        
            // animationendが発火しない場合の安全策としてタイマーを設定
            setTimeout(finishClose, 300); // 300ミリ秒後に強制実行
        };
        openTrigger.addEventListener('click', e => { e.preventDefault(); openModal(); });
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
        
        return { openModal, closeModal };
    };

    const { closeModal: closeAbout } = setup('aboutModal', 'aboutSiteLink', 'aboutCloseBtn');
    const { closeModal: closeHistory } = setup('historyModal', 'historyToggle', 'historyCloseBtn');
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('aboutModal').classList.contains('show')) closeAbout();
            if (document.getElementById('historyModal').classList.contains('show')) closeHistory();
        }
    });
}


function setupShareButtons() {
  const shareUrl = 'https://searchtheradio.com/';
  const text = 'さーち・ざ・らじお！ - 「ぼっち・ざ・らじお！」非公式検索エンジン #さーち・ざ・らじお';
  const u = encodeURIComponent(shareUrl);
  const t = encodeURIComponent(text);
  document.getElementById('shareX').href = `https://x.com/intent/tweet?url=${u}&text=${t}`;
  document.getElementById('shareLINE').href = `https://social-plugins.line.me/lineit/share?url=${u}`;
  document.getElementById('shareFB').href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
}

function setupRightClickModal() {
  const rcModal = document.getElementById('rcModal');
  if (!rcModal) return;
  const closeRc = () => { rcModal.style.display = 'none'; };
  document.addEventListener('contextmenu', e => {
    if (window.innerWidth > 700) {
      e.preventDefault();
      rcModal.style.display = 'flex';
    }
  });
  document.getElementById('rcOk')?.addEventListener('click', closeRc);
  rcModal.addEventListener('click', e => { if (e.target === rcModal) closeRc(); });
}

function updateHeaderOffset() {
  const root = document.documentElement;
  const sticky = document.querySelector('.sticky-search-area');
  if (!sticky) return;
  const h = sticky.offsetHeight;
  root.style.setProperty('--header-height', h + 'px');
  root.style.setProperty('--header-offset', (h + 10) + 'px');
}
window.__updateHeaderOffset = updateHeaderOffset;

function parseKeywordTime(kw) {
  if (typeof kw !== "string") return null;
  const m = kw.match(/^(.*)@(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (!m) return null;
  const base = m[1].trim();
  const label = m[2];
  const parts = label.split(":").map(n => parseInt(n,10));
  const seconds = parts.length === 3
    ? parts[0]*3600 + parts[1]*60 + parts[2]
    : parts[0]*60 + parts[1];
  return { base, label, seconds };
}

function findHitTime(item, rawQuery) {
  if (!rawQuery) return null;
  const qn = normalize(rawQuery);
  if (!qn) return null;
  for (const kw of (item.keywords || [])) {
    const p = parseKeywordTime(kw);
    if (!p) continue;
    const baseN = normalize(p.base);
    if (baseN.includes(qn) || qn.includes(baseN)) {
      return p;
    }
  }
  return null;
}

function withTimeParam(url, seconds) {
  if (!seconds && seconds !== 0) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("t", String(seconds));
    return u.toString();
  } catch {
    const cleaned = url.replace(/([?&])t=\d+s?(?=&|$)/, "$1").replace(/[?&]$/, "");
    return cleaned + (cleaned.includes("?") ? "&" : "?") + "t=" + seconds;
  }
}

function buildTimeline(data) {
    const list = document.getElementById('historyTimeline');
    if(!list) return;
    list.innerHTML = '';
    const sorted = [...data].sort((a,b)=> (a.date < b.date ? -1 : 1));
    let currentYear = null;
    const fragment = document.createDocumentFragment();
    sorted.forEach(it=>{
      const y = (it.date || '').slice(0,4);
      if (y && y !== currentYear){
        currentYear = y;
        const yEl = document.createElement('div');
        yEl.className = 'history-year';
        yEl.innerHTML = `<span class="impact-number">${y}</span>`;
        fragment.appendChild(yEl);
      }
      const el = document.createElement('div');
      el.className = 'history-item';
      const dateParts = it.date ? it.date.split('-') : [];
      let dateText = '';
      if (dateParts.length === 3) {
        const month = String(parseInt(dateParts[1], 10)).padStart(2, '0');
        const day = String(parseInt(dateParts[2], 10)).padStart(2, '0');
        dateText = `${month}.${day}`;
      } else if (dateParts.length === 2) {
        dateText = `${String(parseInt(dateParts[1], 10)).padStart(2, '0')}月`;
      }
      
      // ラベル内の英数字をspanで囲む
      const formattedLabel = it.label.replace(/([A-Za-z0-9]+)/g, '<span class="impact-number">$1</span>');
      
      el.innerHTML = `
        ${dateText ? `<div class="date"><span class="impact-number">${dateText}</span></div>` : ''}
        <div class="label">${it.url ? `<a href="${it.url}" target="_blank" rel="noopener">${formattedLabel}</a>` : formattedLabel}</div>
        ${it.desc ? `<div class="desc">${it.desc}</div>` : ''}
      `;
      fragment.appendChild(el);
    });
    list.appendChild(fragment);
}



function rainGoodMarks() {
  const count = 30;
  for (let i = 0; i < count; i++) {
    const mark = document.createElement('span');
    mark.className = 'good-mark';
    mark.textContent = '👍';
    mark.style.left = Math.random() * 100 + 'vw';
    mark.style.animationDuration = (Math.random() * 2 + 3) + 's';
    mark.style.animationDelay = Math.random() * 2 + 's';
    mark.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
    mark.addEventListener('animationend', () => mark.remove(), { once: true });
    document.body.appendChild(mark);
  }
}

(function buttonFontSizeSizer() {
    const sizerModule = {
        targets: [],
        init: function() {
            this.targets = Array.from(document.querySelectorAll('#filterToggleBtn, #favOnlyToggleBtn, #randomBtn, .reset-btn'));
            window.addEventListener('orientationchange', this.fitAll.bind(this), { passive: true });
        },
        findOptimalFontSize: function(element, startSize = 15, minSize = 10.5) {
            element.style.fontSize = startSize + 'px';
            if (element.scrollWidth > element.clientWidth + 1) {
                const newSize = startSize - 0.5;
                return newSize >= minSize ? this.findOptimalFontSize(element, newSize, minSize) : minSize;
            }
            return startSize;
        },
        fitAll: function() {
            if (window.innerWidth > 991) {
                this.targets.forEach(el => el.style.fontSize = '');
                return;
            }
            const optimalSizes = this.targets.map(el => this.findOptimalFontSize(el));
            const finalSize = Math.min(...optimalSizes);
            this.targets.forEach(el => el.style.fontSize = finalSize + 'px');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        sizerModule.init();
        document.getElementById('filterToggleBtn')?.setAttribute('data-label', 'フィルタ');

        
        setTimeout(() => {
            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) {
                loadingScreen.classList.add("fadeout");
                loadingScreen.addEventListener('transitionend', () => loadingScreen.remove(), { once: true });
            }
        }, 1000);
    });

    window.addEventListener('load', () => {
        const runFit = () => sizerModule.fitAll();
        // ページの読み込みが完了したタイミングで、ボタンの文字サイズ調整などを実行
        setTimeout(runFit, 100);
        setTimeout(runFit, 300);
        setTimeout(() => {
            runFit();
            document.body.classList.add('buttons-ready');
        }, 750);
    });
})();

(function robustScrollUnlock() {
    const modalIds = ['filterDrawer', 'aboutModal', 'historyModal'];
    const observerCallback = (mutationsList) => {
        for (const mutation of mutationsList) {
            const targetElement = mutation.target;
            const style = window.getComputedStyle(targetElement);
            if (style.display === 'none' || targetElement.hidden) {
                if (window.releaseBodyLock) {
                    window.releaseBodyLock();
                }
            }
        }
    };
    const observer = new MutationObserver(observerCallback);
    modalIds.forEach(id => {
        const modalElement = document.getElementById(id);
        if (modalElement) {
            observer.observe(modalElement, {
                attributes: true,
                attributeFilter: ['style', 'hidden']
            });
        }
    });
})();

// Autocomplete is already native JS, so we include it here.
function initializeAutocomplete() {
  const inputEl = document.getElementById('searchBox');
  const boxEl = document.getElementById('autocomplete');
  if (!inputEl || !boxEl) return;

  const hasKanji = (s) => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(s || '');
  const entriesByLabel = new Map();

  const ensureEntry = (label, type) => {
    if (!label) return;
    const baseLabel = stripTimeSuffix(label);
    let entry = entriesByLabel.get(baseLabel);
    if (!entry) {
      entry = { label: baseLabel, type: type || 'キーワード', norms: new Set() };
      entriesByLabel.set(baseLabel, entry);
    }
    entry.norms.add(normalize(baseLabel));
    if (CUSTOM_READINGS[baseLabel]) {
      CUSTOM_READINGS[baseLabel].forEach(r => entry.norms.add(normalize(r)));
    }
  };

  data.forEach(ep => {
    (ep.keywords || []).forEach(kw => ensureEntry(kw, 'キーワード'));
    (Array.isArray(ep.guest) ? ep.guest : [ep.guest]).filter(Boolean).forEach(g => ensureEntry(g, '出演者'));
  });

  const entries = Array.from(entriesByLabel.values());
  let cursor = -1;
  let viewItems = [];

  const clear = () => { boxEl.innerHTML = ''; boxEl.hidden = true; cursor = -1; viewItems = []; };
  clearAutocompleteSuggestions = clear;

  const render = (items) => {
    if (isSearchTriggered) return;
    viewItems = items;
    boxEl.innerHTML = '';
    boxEl.hidden = items.length === 0;
    const qRaw = inputEl.value.trim().toLowerCase();
    const fragment = document.createDocumentFragment();
    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'autocomplete-item';
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', idx === cursor);
      const i = item.label.toLowerCase().indexOf(qRaw);
      const html = (i >= 0)
        ? `${item.label.slice(0, i)}<span class="match">${item.label.slice(i, i + qRaw.length)}</span>${item.label.slice(i + qRaw.length)}`
        : item.label;
      const icon = item.type === '出演者' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-magnifying-glass"></i>';
      el.innerHTML = `<span class="type">${icon}</span><span class="label">${html}</span>`;
      el.addEventListener('mousedown', (e) => { e.preventDefault(); pick(idx); });
      fragment.appendChild(el);
    });
    boxEl.appendChild(fragment);
  };

 const pick = (index) => {
        if (!viewItems[index]) return;
        inputEl.value = viewItems[index].label;
        clear();

        
        setTimeout(() => {
          search();
          scrollToResultsTop(); 
          inputEl.focus();
          const len = inputEl.value.length;
          inputEl.setSelectionRange(len, len);
        }, 0);
      };

  const scoreEntry = (entry, normQ, raw) => {
    let prefix = false, part = false;
    for (const k of entry.norms) {
      if (k.startsWith(normQ)) { prefix = true; break; }
      if (!part && k.includes(normQ)) part = true;
    }
    if (!prefix && !part) return null;
    return (prefix ? 4 : 0) + (part ? 1 : 0) + (!hasKanji(raw) && hasKanji(entry.label) ? 2 : 0) + (entry.type === '出演者' ? 1 : 0);
  };

const onInput = () => {
    const raw = inputEl.value;
    const normQ = normalize(raw);
    if (!normQ) { clear(); return; }
    

    // --- ここからが新しいロジック ---

    // 1. 入力がエピソード番号かどうかを判定
    // #を削除し、全角数字を半角に変換
    const episodeQuery = raw.replace('#', '').trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // 数字のみで構成されているかチェック
    if (/^\d+$/.test(episodeQuery)) {
      const episodeNumber = parseInt(episodeQuery, 10);
      
      // 該当するエピソードを検索
      const targetEpisode = data.find(ep => parseInt(ep.episode, 10) === episodeNumber);

      if (targetEpisode && targetEpisode.keywords && targetEpisode.keywords.length > 0) {
        // --- ここからが新しいロジック ---

        // 1. 除外対象となる出演者関連の "全" キーワードリストを作成
        const guestKeywordsToExclude = new Set();
        
        // サイトが知っている主要な出演者とその愛称をすべてリストに追加
        const mainGuests = Object.keys(guestColorMap);
        mainGuests.forEach(guestName => {
            guestKeywordsToExclude.add(guestName); // 本人名を追加
            // 辞書データ(readings.json)にあれば、関連キーワード(愛称など)もすべて追加
            if (CUSTOM_READINGS[guestName]) {
                CUSTOM_READINGS[guestName].forEach(alias => guestKeywordsToExclude.add(alias));
            }
        });

        // その回固有のゲストとその愛称もリストに追加
        const episodeGuests = Array.isArray(targetEpisode.guest) ? targetEpisode.guest : [targetEpisode.guest];
        episodeGuests.forEach(guestName => {
            if (guestName) {
                guestKeywordsToExclude.add(guestName); // 本人名を追加
                if (CUSTOM_READINGS[guestName]) {
                    CUSTOM_READINGS[guestName].forEach(alias => guestKeywordsToExclude.add(alias));
                }
            }
        });

        // 2. キーワードリストから、出演者関連のキーワードを完全に除外
        const filteredKeywords = targetEpisode.keywords.filter(kw => {
          const cleanKeyword = stripTimeSuffix(kw).trim();
          return !guestKeywordsToExclude.has(cleanKeyword);
        });

        // --- ここまでが新しいロジック ---
        
        // 3. 除外後のキーワードを候補として整形 (ここは変更なし)
        const keywordsAsEntries = filteredKeywords.map(kw => ({
          label: stripTimeSuffix(kw),
          type: `第${targetEpisode.episode}回`
        }));
        
        // 重複するキーワードを除去 (ここも変更なし)
        const seen = new Set();
        const uniqueEntries = keywordsAsEntries.filter(el => {
            const duplicate = seen.has(el.label);
            seen.add(el.label);
            return !duplicate;
        });

        render(uniqueEntries);
        return;
      }
    }

    // --- ここまでが新しいロジック ---

    // 3. 通常のキーワード検索ロジック (入力がエピソード番号でなかった場合)
    const scored = entries.map(e => ({ e, s: scoreEntry(e, normQ, raw) })).filter(item => item.s !== null);
    scored.sort((a, b) => b.s - a.s);
    
    const seen = new Set();
    const items = scored.slice(0, 20).map(({ e }) => {
      let label = e.label;
      const nlabel = normalize(label);
      if (!hasKanji(label) && READING_TO_LABEL[nlabel]) {
        label = READING_TO_LABEL[nlabel];
      }
      if (seen.has(label)) return null;
      seen.add(label);
      return { label: label, type: e.type };
    }).filter(Boolean);
    
    render(items.slice(0, 12));
  };
  
  const debouncedOnInput = debounce(onInput, 150); // ★先に定義する

  const onKeyDown = (e) => {
    // Enterキーが押された時の包括的な処理
    if (e.key === 'Enter') {
      // 日本語入力変換中（文字の下に線がある状態）のEnterは、
      // 検索ではなく文字の確定を優先するため、ここで処理を中断する
      if (e.isComposing) {
        return;
      }

      e.preventDefault();
      
      // 候補が選択されていれば、その候補を選択する
      if (!boxEl.hidden && cursor >= 0) {
        pick(cursor);
      } else {
        // そうでなければ、通常の検索を実行する
        
        // 1. これから実行される可能性のある「候補表示の予約」をキャンセル
        debouncedOnInput.cancel();
        
        // 2. 表示されている候補があれば、即座にクリア
        clear();
        
        // 3. 検索を実行
        search();
        scrollToResultsTop();
      }
      return; // Enterキーの処理はここで終了
    }

    // --- 以下はEnterキー以外のキー処理（変更なし） ---
    if (boxEl.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = (cursor + 1) % viewItems.length; render(viewItems); } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor - 1 + viewItems.length) % viewItems.length; render(viewItems); } 
    else if (e.key === 'Escape') { clear(); }
  };

  inputEl.addEventListener('input', debouncedOnInput); 
  inputEl.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', (e) => {
    if (e.target !== inputEl && !boxEl.contains(e.target)) clear();
  });
}

/**
 * ===================================================
 * ★★★ 初期化処理の実行 ★★★
 * ===================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  document.documentElement.classList.remove('dark-preload');

  
  document.getElementById("early-dark-style")?.remove();
  
  window.addEventListener('load', updateHeaderOffset);
  window.addEventListener('resize', () => setTimeout(updateHeaderOffset, 50));
  new MutationObserver(updateHeaderOffset).observe(document.querySelector('.sticky-search-area'), { childList: true, subtree: true, attributes: true });
});

/**
 * ===================================================
 * ★★★ PWA/モバイル対応強化 ★★★
 * ===================================================
 */
(function enhanceMobileExperience() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // PWAモード（スタンドアロン表示）を検出してクラスを付与
  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
    // DOMの準備が整ってからナビゲーションバーをセットアップ
    document.addEventListener('DOMContentLoaded', setupPwaBottomNav);
  }

  // モバイルブラウザの100vh問題を解決
  const setVh = () => {
    if (isInputFocused) return;
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  setVh();
  window.addEventListener('resize', setVh, { passive: true });
  window.addEventListener('orientationchange', setVh, { passive: true });

  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchBox');
    if (searchInput) {
      searchInput.addEventListener('focus', () => { isInputFocused = true; });
      searchInput.addEventListener('blur', () => {
        isInputFocused = false;
        setTimeout(setVh, 100);
      });
    }
  });

  /**
   * PWAモード専用の下部ナビゲーションバーをセットアップする関数
   */
  function setupPwaBottomNav() {
    // 1. ナビゲーションバーのコンテナを作成
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'pwa-bottom-nav';
    bottomNav.id = 'pwa-bottom-nav';

    // 2. 移動させたいボタンの情報を定義
    const buttonConfig = [
      { id: 'filterToggleBtn', label: 'フィルタ', icon: 'fa-solid fa-filter' },
      { id: 'favOnlyToggleBtn', label: 'お気に入り', icon: 'fa-solid fa-star' },
      // ★★★ ここからが変更点 (テーマボタン追加) ★★★
      { id: 'theme-toggle-btn', label: 'カラー', icon: 'fa-solid fa-palette' },
      // ★★★ ここまでが変更点 ★★★
      { id: 'randomBtn', label: 'ランダム', icon: 'fa-solid fa-shuffle' },
      { id: 'mainResetBtn', label: 'リセット', icon: 'fa-solid fa-rotate-left' }
    ];

    // 3. 設定に基づいて新しいボタンを生成し、ナビゲーションバーに追加
    buttonConfig.forEach(config => {
      const originalButton = document.getElementById(config.id);
      if (!originalButton) return;

      const newButton = document.createElement('button');
      newButton.className = 'pwa-bottom-nav-btn';
      newButton.id = `pwa-${config.id}`;
      newButton.innerHTML = `
        <i class="${config.icon}"></i>
        <span>${config.label}</span>
      `;

      // 新しいボタンがクリックされたら、元のボタンのクリックイベントを発火させる
      newButton.addEventListener('click', (e) => { // ★★★ (e) を追加 ★★★
        
        // ★★★ この行を追加 ★★★
        // このクリックがドキュメント全体に伝わって、
        // パネルを即座に閉じてしまうのを防ぎます。
        e.stopPropagation();

        originalButton.click();
      });

      // ★★★ ここからが変更点 (監視ロジックの分岐) ★★★

      // A) フィルタ、お気に入り、リセットボタンの場合
      if (config.id === 'filterToggleBtn' || config.id === 'favOnlyToggleBtn' || config.id === 'mainResetBtn') {
        
        // 元のボタンの状態（アクティブ/非アクティブ）を監視し、新しいボタンの見た目に反映させる
        const observer = new MutationObserver(() => {
          const isPressed = originalButton.getAttribute('aria-pressed') === 'true';
          const isExpanded = originalButton.getAttribute('aria-expanded') === 'true';
          newButton.classList.toggle('is-active', isPressed || isExpanded);
        });
        observer.observe(originalButton, { attributes: true, attributeFilter: ['aria-pressed', 'aria-expanded'] });
        
        // 初期状態を同期
        const isPressed = originalButton.getAttribute('aria-pressed') === 'true';
        const isExpanded = originalButton.getAttribute('aria-expanded') === 'true';
        newButton.classList.toggle('is-active', isPressed || isExpanded);
      
      // B) テーマ切替ボタンの場合
      } else if (config.id === 'theme-toggle-btn') {
        
        // テーマパネルの表示状態を監視する
        const themePanel = document.getElementById('floating-theme-panel');
        if (themePanel) {
          const observer = new MutationObserver(() => {
            const isActive = themePanel.classList.contains('show');
            newButton.classList.toggle('is-active', isActive);
          });
          observer.observe(themePanel, { attributes: true, attributeFilter: ['class'] });

          // 初期状態を同期
          newButton.classList.toggle('is-active', themePanel.classList.contains('show'));
        }
      }
      // ( 'randomBtn' はアクティブ状態を持たないので、監視は不要です )

      // ★★★ ここまでが変更点 ★★★

      bottomNav.appendChild(newButton);
    });

    // 4. 完成したナビゲーションバーをbodyの末尾に追加
    if (bottomNav.hasChildNodes()) {
      document.body.appendChild(bottomNav);
    }
  }
})();