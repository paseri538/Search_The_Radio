// ===== 新しいテーマ管理機能 (フローティングパネル版) =====
$(function() {
    const $toggleBtn = $('#theme-toggle-btn');
    const $panel = $('#floating-theme-panel');

    if ($toggleBtn.length === 0 || $panel.length === 0) {
        return;
    }

    const THEME_KEY = 'site_theme_v1';
    const allThemeClasses = 'dark-mode theme-pink theme-yellow theme-blue theme-red';

    // 1. テーマを適用する関数
    function applyTheme(themeName) {
        $('body').removeClass(allThemeClasses);

        let isDark = false;
        if (themeName === 'dark') {
            $('body').addClass('dark-mode');
            isDark = true;
        } else if (themeName && themeName !== 'light') {
            $('body').addClass('theme-' + themeName);
            if (['blue', 'red'].includes(themeName)) {
                isDark = true;
            }
        }

        // パネル内のアクティブボタンを更新
        $panel.find('.theme-btn').removeClass('active');
        $panel.find('.theme-btn[data-theme="' + themeName + '"]').addClass('active');

        try {
            localStorage.setItem(THEME_KEY, themeName);
        } catch (e) {
            console.error('Failed to save theme to localStorage.', e);
        }
    }

    // 2. トリガーボタンクリックでパネルの表示/非表示を切り替え
    $toggleBtn.on('click', function(e) {
        e.stopPropagation(); // ドキュメントへのクリックイベント伝播を停止
        $panel.toggleClass('show');
    });

    // 3. パネル内のテーマボタンクリックでテーマを適用し、パネルを閉じる
    $panel.on('click', '.theme-btn', function() {
        const theme = $(this).data('theme');
        if (theme) {
            applyTheme(theme);
        }
        $panel.removeClass('show');
    });
    
    // 4. パネルの外側をクリックしたらパネルを閉じる
    $(document).on('click', function(e) {
        if ($panel.hasClass('show') && !$toggleBtn.is(e.target) && $toggleBtn.has(e.target).length === 0) {
            $panel.removeClass('show');
        }
    });

    // 5. ページ読み込み時に保存されたテーマを適用
    try {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        applyTheme(savedTheme);
    } catch (e) {
        console.error('Failed to load theme from localStorage.', e);
        applyTheme('light');
    }
});

// --- Hard unlock: ensure page scroll is restored no matter what path was taken
window.__hardUnlockScroll = function __hardUnlockScroll(){
  try { window.__bodyLockCount = 0; } catch(e){}
  try { document.body.classList.remove('modal-open'); } catch(e){}
  try { document.body.classList.remove('scroll-lock'); } catch(e){}
  try {
    const top = document.body.style.top;
    document.body.style.top = '';
    if (top) { window.scrollTo(0, -parseInt(top,10) || 0); }
  } catch(e){}
};


// === Global, reference-counted body scroll locker ===
(function(){
  if (!window.__bodyLockCount) window.__bodyLockCount = 0;
  if (!window.__bodyLockScrollY) window.__bodyLockScrollY = 0;
  window.acquireBodyLock = function acquireBodyLock(){
    if (window.__bodyLockCount === 0){
      window.__bodyLockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.classList.add('modal-open');
      document.body.style.top = `-${window.__bodyLockScrollY}px`;
    }
    window.__bodyLockCount++;
  };
  window.releaseBodyLock = function releaseBodyLock(){
    window.__bodyLockCount = Math.max(0, (window.__bodyLockCount||0) - 1);
    if (window.__bodyLockCount === 0){
      document.body.classList.remove('modal-open');
      const top = document.body.style.top;
      document.body.style.top = '';
      try { window.scrollTo(0, top ? -parseInt(top,10) : 0); } catch(e) {}
    }
  };
})();

// ===================================================
// ★★★ データと状態管理（ここからが主な変更点）★★★
// ===================================================

// --- グローバル変数を定義 ---
let data = []; // episodes.json から読み込む
let CUSTOM_READINGS = {}; // readings.json と keywords.json から結合して作成
let READING_TO_LABEL = {}; // 読み仮名からの逆引きマップ

let selectedGuests = [];
let selectedCorners = [];
let selectedOthers = [];
let selectedYears = [];
let currentPage = 1;
const pageSize = 20;
let lastResults = [];
let clearAutocompleteSuggestions = () => {};
let isSearchTriggered = false;

// --- データ読み込み関数 ---
async function loadExternalData() {
    try {
        // 3つのJSONファイルを並行して非同期で取得
        const [episodesRes, readingsRes, keywordsRes] = await Promise.all([
            fetch('episodes.json'),
            fetch('readings.json'),
            fetch('keywords.json')
        ]);

        // 各レスポンスをJSONとして解析
        const episodesData = await episodesRes.json();
        const readingsData = await readingsRes.json();
        const keywordsData = await keywordsRes.json();

        // グローバル変数にデータを格納
        data = episodesData;
        CUSTOM_READINGS = { ...readingsData, ...keywordsData }; // 読みとキーワードを結合

        // 読み仮名からの逆引きマップを作成
        for (const kanji in CUSTOM_READINGS) {
            (CUSTOM_READINGS[kanji] || []).forEach(r => {
                READING_TO_LABEL[normalize(r)] = kanji;
            });
        }
        
        console.log("All data loaded successfully.");

    } catch (error) {
        console.error("Failed to load external data:", error);
        // エラー発生時の処理（例: ユーザーにエラーメッセージを表示）
        const resultsEl = document.getElementById('results');
        if(resultsEl) {
            resultsEl.innerHTML = '<li class="no-results">データの読み込みに失敗しました。<br>ページを再読み込みしてください。</li>';
        }
        // ローディング画面を非表示にする
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fadeout');
            setTimeout(() => loadingScreen.remove(), 1000);
        }
    }
}

// --- アプリケーション初期化関数 ---
async function initializeApp() {
    await loadExternalData();

    // データ読み込み後に実行したい処理をすべてここに記述
    
    // サムネイルのプリロード
    preloadThumbsFromData();

    // 検索・UI関連の初期化
    if (!applyStateFromURL({ replace: true })) {
        search();
    }
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // オートコンプリートの初期化
    initializeAutocomplete();
    
    console.log("Application initialized.");
}


// --- ここから下の関数群は変更なし（ただし、データに依存するものは initializeApp 内から呼び出す） ---

function preloadThumbsFromData() {
  try {
    const head = document.head || document.getElementsByTagName('head')[0];
    const seen = new Set();

    data.forEach((ep) => {
      if (!ep || !ep.link) return;
      let vid = null;
      try {
        const url = new URL(ep.link);
        vid = url.searchParams.get('v');
      } catch (_) {}
      if (!vid || seen.has(vid)) return;
      seen.add(vid);

      const l1 = document.createElement('link');
      l1.rel = 'preload';
      l1.as = 'image';
      l1.href = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
      l1.crossOrigin = 'anonymous';
      head.appendChild(l1);
    });
  } catch (e) {
    console.error('Thumbnail preload error:', e);
  }
}

const FAV_KEY = 'str_favs_v1';
let favorites = loadFavs();
let showFavoritesOnly = false;

function getVideoId(link) {
  const m = (link || '').match(/(?:v=|be\/)([\w-]{11})/);
  return m ? m[1] : link;
}
function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveFavs() { localStorage.setItem(FAV_KEY, JSON.stringify([...favorites])); }
function isFavorite(id) { return favorites.has(id); }
function toggleFavorite(id) { favorites.has(id) ? favorites.delete(id) : favorites.add(id); saveFavs(); }


    const guestColorMap = {
      "青山吉能": "#ff6496", "鈴代紗弓": "#fabe00", "水野朔": "#006ebe", "長谷川育美": "#e60046",
      "内田真礼": "#f09110", "千本木彩花": "#bbc3b8", "和多田美咲": "#a8eef4", "小岩井ことり": "#494386"
    };

    function formatTitle(title) {
    return title.replace(/\u3000/g, '<br>');
    }


    function getThumbnail(url) {
      const m = url.match(/[?&]v=([^&]+)/);
      return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
    }
    function getHashNumber(title) {
      const match = title.match(/#(\d+)/);
      return match ? `#${match[1]}` : title;
    }
    function toHiragana(str) {
      return str.replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60));
    }
    function normalize(s){
      return toHiragana(s.normalize("NFKC").toLowerCase().replace(/\s+/g,""));
    }

let isRestoringURL = false;

function readMulti(params, key) {
  const all = params.getAll(key);
  if (all.length === 1 && all[0].includes(',')) {
    return all[0].split(',').map(decodeURIComponent).filter(Boolean);
  }
  return all.map(decodeURIComponent).filter(Boolean);
}

function buildURLFromState({ method = 'push' } = {}) {
  if (isRestoringURL) return;
  const params = new URLSearchParams();

  const q = $("#searchBox").val().trim();
  if (q) params.set('q', q);

  selectedGuests.forEach(v => params.append('g', v));
  selectedCorners.forEach(v => params.append('c', v));
  selectedOthers.forEach(v => params.append('o', v));
  selectedYears.forEach(y => params.append('y', String(y)));

  const sort = $("#sortSelect").val();
  if (sort) params.set('sort', sort);

  if (showFavoritesOnly) params.set('fav', '1');
  if (currentPage > 1) params.set('p', String(currentPage));

  const qs = params.toString();
  const url = qs ? `?${qs}` : location.pathname;

  const state = {
    q, selectedGuests, selectedCorners, selectedOthers, selectedYears,
    sort, fav: showFavoritesOnly, p: currentPage
  };
  try {
    history[method === 'replace' ? 'replaceState' : 'pushState'](state, '', url);
  } catch {}
}

function applyStateFromURL({ replace = false } = {}) {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return false;

  isRestoringURL = true;

  const q = params.get('q') || '';
  $('#searchBox').val(q);

  selectedGuests = readMulti(params, 'g');
  selectedCorners = readMulti(params, 'c');
  selectedOthers  = readMulti(params, 'o');
  selectedYears   = readMulti(params, 'y').map(String);

  const sort = params.get('sort') || 'newest';
  $('#sortSelect').val(sort);

  showFavoritesOnly = params.get('fav') === '1';
  $('#favOnlyToggleBtn')
    .toggleClass('active', showFavoritesOnly)
    .attr('aria-pressed', showFavoritesOnly);
  document.body.classList.toggle('fav-only', showFavoritesOnly);

  updateGuestButtonStyles();
  updateCornerStyles();
  updateOtherStyles();
  updateYearStyles();

  const p = parseInt(params.get('p') || '1', 10);
  currentPage = Number.isFinite(p) && p > 0 ? p : 1;

  search({ gotoPage: currentPage });

  isRestoringURL = false;
  if (replace) buildURLFromState({ method: 'replace' });
  return true;
}

window.addEventListener('popstate', () => {
  applyStateFromURL({ replace: false });
});

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

function withTimeParam(url, seconds) {
  if (!seconds) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("t");
    u.searchParams.set("t", String(seconds));
    return u.toString();
  } catch {
    const cleaned = url.replace(/([?&])t=\d+s?(?=&|$)/, "$1").replace(/[?&]$/, "");
    return cleaned + (cleaned.includes("?") ? "&" : "?") + "t=" + seconds;
  }
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
    
function getEpisodeNumber(episode) {
  if (/^\d+$/.test(episode)) return parseInt(episode, 10);
  if (episode === "緊急" || episode === "特別編") return -1;
  return -2;
}
    
function updateActiveFilters() {
  const $area = $("#filtersBar");
  $area.empty();
  let tags = [];
  selectedGuests.forEach(g => {
    if (g === "結束バンド") {
        tags.push(`<button class="filter-tag" tabindex="0" aria-label="出演者フィルタ解除 ${g}" data-type="guest" data-value="${g}" style="background:linear-gradient(90deg, #fa01fa 0% 25%, #fdfe0f 25% 50%, #15f4f3 50% 75%, #f93e07 75% 100%);color:#222;border:none;"><i class="fa fa-user"></i> ${g} <i class="fa fa-xmark"></i></button>`);
      } else {
        tags.push(`<button class="filter-tag" tabindex="0" aria-label="出演者フィルタ解除 ${g}" data-type="guest" data-value="${g}" style="${guestColorMap[g] ? 'background:' + guestColorMap[g] + ';color:#222;' : ''}"><i class="fa fa-user"></i> ${g} <i class="fa fa-xmark"></i></button>`);
      }
  });
  selectedCorners.forEach(c => {
    tags.push(`<button class="filter-tag" tabindex="0" aria-label="コーナーフィルタ解除 ${c}" data-type="corner" data-value="${c}"><i class="fa fa-cubes"></i> ${c} <i class="fa fa-xmark"></i></button>`);
  });
  selectedOthers.forEach(o => {
    tags.push(`<button class="filter-tag" tabindex="0" aria-label="その他フィルタ解除 ${o}" data-type="other" data-value="${o}"><i class="fa fa-star"></i> ${o} <i class="fa fa-xmark"></i></button>`);
  });
  selectedYears.forEach(y => {
    tags.push(`<button class="filter-tag" tabindex="0" aria-label="年フィルタ解除 ${y}" data-type="year" data-value="${y}"><i class="fa fa-calendar"></i> ${y} <i class="fa fa-xmark"></i></button>`);
  });
  if ($("#searchBox").val().trim()) {
    tags.unshift(`<button class="filter-tag" tabindex="0" aria-label="キーワード解除" data-type="keyword" data-value=""><i class="fa fa-search"></i> "${$("#searchBox").val().trim()}" <i class="fa fa-xmark"></i></button>`);
  }
  $area.html(tags.join(""));
}

function renderPagination(totalCount) {
  const $area = $("#paginationArea");
  $area.empty();
  const totalPage = Math.ceil(totalCount / pageSize);
  if (totalPage <= 1) return;
  let html = "";
  for(let i=1;i<=totalPage;i++) {
    html += `<button class="page-btn${i===currentPage?' active':''}" data-page="${i}" tabindex="0" aria-label="ページ${i}">${i}</button>`;
  }
  $area.html(html);
}

function search(opts = {}) {
  // ▼ 目印を立て、検索候補をクリアする
  isSearchTriggered = true;
  clearAutocompleteSuggestions();

  // 目印を少し後に自動で下ろすタイマーを設定
  setTimeout(() => {
    isSearchTriggered = false;
  }, 100);

  let raw = $("#searchBox").val().trim();
  const sort = $("#sortSelect").val();
  let res = [...data];

  if (raw.length > 0) {
    const normalizedQuery = normalize(raw);
    const searchTerms = new Set([normalizedQuery]);

    for (const key in CUSTOM_READINGS) {
      const keyNorm = normalize(key);
      const readings = CUSTOM_READINGS[key].map(normalize);
      let isMatch = keyNorm.includes(normalizedQuery);
      if (!isMatch) {
        for (const reading of readings) {
          if (reading.includes(normalizedQuery)) {
            isMatch = true;
            break;
          }
        }
      }
      if (isMatch) {
        searchTerms.add(keyNorm);
        readings.forEach(r => searchTerms.add(r));
      }
    }

    const searchWords = [...searchTerms].filter(Boolean);
    res = res.filter(it => {
      const combined = [
        it.title,
        Array.isArray(it.guest) ? it.guest.join(" ") : it.guest,
        (it.keywords || []).join(" ")
      ].join(" ");
      const text = normalize(combined);
      return searchWords.some(word => text.includes(word));
    });
  }
  
  if (selectedGuests.length) {
    res = res.filter(it => {
        const guestArr = Array.isArray(it.guest) ? it.guest : (typeof it.guest === "string" ? [it.guest] : []);
        const hasKessoku = selectedGuests.includes("結束バンド");
        const hasOthers  = selectedGuests.includes("その他");
        const indivGuests = selectedGuests.filter(g => g !== "結束バンド" && g !== "その他");
        let match = false;
        if (indivGuests.length) {
        match = indivGuests.some(sel => guestArr.includes(sel));
        }
        if (hasKessoku) {
        const kessokuMembers = ["鈴代紗弓", "水野朔", "長谷川育美"];
        const isKessoku = kessokuMembers.every(m => guestArr.includes(m));
        match = match || isKessoku;
        }
        if (hasOthers) {
        const mainGuests = ["青山吉能","鈴代紗弓","水野朔","長谷川育美","内田真礼","千本木彩花","和多田美咲","小岩井ことり"];
        const isOther = guestArr.some(name => !mainGuests.includes(name));
        match = match || isOther;
        }
        return match;
    });
    }
  if (selectedOthers.length) res = res.filter(it => {
    const combined = [it.title, it.guest, (it.keywords || []).join(" ")].join(" ");
    const textNorm = normalize(combined);
    return selectedOthers.every(o => textNorm.includes(normalize(o)));
  });
  if (selectedCorners.length) res = res.filter(it => {
    const combinedNorm = normalize(it.title + " " + (it.keywords || []).join(" "));
    return selectedCorners.some(c => combinedNorm.includes(normalize(c)));
  });
  if (selectedYears.length) {
    res = res.filter(it => {
      let year = "";
      if (it.date) {
        year = String(it.date).slice(0,4);
      }
      return selectedYears.includes(String(year));
    });
  }
  
  if (showFavoritesOnly) {
    res = res.filter(it => isFavorite(getVideoId(it.link)));
  }
  
  if (sort === "newest") {
    res.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return getEpisodeNumber(b.episode) - getEpisodeNumber(a.episode);
    });
  } else if (sort === "oldest") {
    res.sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return getEpisodeNumber(a.episode) - getEpisodeNumber(b.episode);
    });
  } else if (sort === "longest" || sort === "shortest") {
    const toSec = s => {
      if (!s) return 0;
      const parts = s.split(":").map(Number);
      if (parts.length === 3) { return parts[0] * 3600 + parts[1] * 60 + parts[2]; }
      else if (parts.length === 2) { return parts[0] * 60 + parts[1]; }
      return Number(s) || 0;
    };
    res.sort((a, b) => {
      const da = toSec(a.duration);
      const db = toSec(b.duration);
      if (sort === "longest") return db - da;
      else return da - db;
    });
  }
  lastResults = res;
  $("#fixedResultsCount").text(`表示数：${res.length}件`);
  currentPage = opts.gotoPage || 1;
  if (!isRestoringURL) { buildURLFromState({ method: 'push' }); }

  renderResults(res, currentPage);
  fitGuestLines();
  window.addEventListener('resize', () => setTimeout(fitGuestLines, 30));
  window.addEventListener('orientationchange', () => setTimeout(fitGuestLines, 120));
  renderPagination(res.length);
  updateActiveFilters();
}

function fitGuestLines() {
  document.querySelectorAll('.guest-one-line').forEach(el => {
    el.style.fontSize = '';
    const maxPx = parseFloat(getComputedStyle(el).fontSize) || 16;
    let size = maxPx;
    const isMobile = window.innerWidth <= 900;
    const minPx = isMobile ? 9 : 11;
    while (el.scrollWidth > el.clientWidth && size > minPx) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  });
}

function renderResults(arr, page = 1) {
  const ul = $("#results");
  ul.empty();

  if (!Array.isArray(arr) || arr.length === 0) {
    $("#results").html(
      `<li class="no-results">${
        showFavoritesOnly
          ? "お気に入りはありません。<br>★を押して登録してください。"
          : "ﾉ°(6ᯅ9) "
      }</li>`
    );
    return;
  }

  const startIdx = (page - 1) * pageSize, endIdx = page * pageSize;
  const qRaw = $("#searchBox").val().trim();
  const cornerTarget =
    Array.isArray(selectedCorners) && selectedCorners.length === 1
      ? selectedCorners[0]
      : null;

  arr.slice(startIdx, endIdx).forEach(it => {
    const thumb = getThumbnail(it.link);
    const hashOnly = getHashNumber(it.title);
    let hit = findHitTime(it, qRaw);
    if (!hit && cornerTarget) hit = findHitTime(it, cornerTarget);
    const finalLink = hit ? withTimeParam(it.link, hit.seconds) : it.link;
    let guestText = "";
    if (Array.isArray(it.guest)) guestText = "ゲスト：" + it.guest.join("、");
    else if (it.guest === "青山吉能") guestText = "パーソナリティ：青山吉能";
    else if (it.guest && it.guest !== "その他") guestText = `ゲスト：${it.guest}`;

    ul.append(`
      <li class="episode-item" role="link" tabindex="0">
        <a href="${finalLink}" target="_blank" rel="noopener"
           style="display:flex;gap:13px;text-decoration:none;color:inherit;align-items:center;min-width:0;">
          <div class="thumb-col">
            <img src="${thumb}" class="thumbnail" alt="サムネイル：${hashOnly}">
            ${hit ? `
              <div class="ts-buttons">
                <button class="ts-btn" data-url="${it.link}" data-ts="${hit.seconds}"
                        aria-label="${hit.label} から再生">${hit.label}</button>
              </div>` : ``}
          </div>
          <div style="min-width:0;">
            <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
              <h5 class="mb-1">
                ${hashOnly}${/\u3000/.test(it.title) ? "<br>" : ""}
                <span class="guest-one-line" aria-label="${guestText}">${guestText}</span>
              </h5>
            </div>
            <p class="episode-meta">公開日時：${it.date}<br>動画時間：${it.duration || "?"}</p>
          </div>
        </a>
      </li>
    `);
  });

  ul.off('click', '.ts-btn').on('click', '.ts-btn', function (e) {
    e.preventDefault(); e.stopPropagation();
    const sec = Number(this.dataset.ts) || 0;
    const base = this.dataset.url || '';
    window.open(withTimeParam(base, sec), '_blank', 'noopener');
  });

  $(document).off('keydown.__episodeopen').on('keydown.__episodeopen', '#results .episode-item', function(e){
    const key = e.key;
    if (key === 'Enter' || key === ' ') {
      const a = $(this).find('a').get(0);
      if (a) { a.click(); e.preventDefault(); }
    }
  });
  $('#results .episode-item').each(function () {
    if ($(this).find('.fav-btn').length) return;
    const link = $(this).find('a').attr('href') || '';
    const id = getVideoId(link);
    const active = isFavorite(id);
    $(this).append(
      `<button class="fav-btn ${active ? 'active' : ''}" data-id="${id}" aria-label="お気に入り" title="お気に入り">
         <i class="${active ? 'fa-solid' : 'fa-regular'} fa-star"></i>
       </button>`
    );
  });

  $('#results .episode-item').each(function(){
    const link2 = $(this).find('a').attr('href') || '';
    const id2 = getVideoId(link2);
    const active2 = isFavorite(id2);
    $(this).toggleClass('is-fav', !!active2);
  });
}

function resetFilters() {
  selectedGuests = [];
  selectedCorners = [];
  selectedOthers = [];
  selectedYears = [];
  updateGuestButtonStyles();
  updateCornerStyles();
  updateOtherStyles();
  updateYearStyles();
  search();
}

function resetSearch() {
  $("#searchBox").val("");
  $("#sortSelect").val("newest");
  if (typeof showFavoritesOnly !== "undefined" && showFavoritesOnly) {
    clearAllFavorites();
    showFavoritesOnly = false;
    document.body.classList.remove('fav-only');
    $("#favOnlyToggleBtn").removeClass("active").attr("aria-pressed","false");
  }
  $("#results .fav-btn.active").removeClass("active")
    .find("i").removeClass("fa-solid").addClass("fa-regular");
  resetFilters();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
}

function updateGuestButtonStyles() {
  $(".guest-button").each(function() {
    const guest = $(this).data("guest");
    if (selectedGuests.includes(guest)) {
      $(this).addClass('active').attr("aria-pressed","true");
    } else {
      $(this).removeClass('active').attr("aria-pressed","false");
    }
  });
}

function updateCornerStyles() {
  $(".btn-corner[data-corner]").each(function() {
    const corner = $(this).data("corner");
    if (selectedCorners.includes(corner)) $(this).addClass("active").attr("aria-pressed","true");
    else $(this).removeClass("active").attr("aria-pressed","false");
  });
}

function updateOtherStyles() {
  $("#otherButtonGroup .btn-corner").each(function() {
    const o=$(this).data("other");
    if (selectedOthers.includes(o)) $(this).addClass("active").attr("aria-pressed","true");
    else $(this).removeClass("active").attr("aria-pressed","false");
  });
}

function updateYearStyles() {
  $(".btn-year").each(function() {
    const year = String($(this).data("year"));
    if (selectedYears.includes(year)) $(this).addClass("active").attr("aria-pressed","true");
    else $(this).removeClass("active").attr("aria-pressed","false");
  });
}

function updateDrawerTop() {
  const sbar = $(".sticky-search-area")[0];
  const drawer = $("#filterDrawer")[0];
  if (drawer && sbar) {
    const rect = sbar.getBoundingClientRect();
    const headerHeight = rect.height;
    drawer.style.position="fixed";drawer.style.left="0";drawer.style.right="0";drawer.style.margin="0 auto";drawer.style.transform="";
    drawer.style.top = "";
    const winHeight = window.innerHeight;
    const drawerHeight = drawer.offsetHeight || 340;
    if ((rect.top + headerHeight + 8 + drawerHeight) > (winHeight - 12)) {
      drawer.style.maxHeight = (winHeight - (rect.top + headerHeight + 20)) + "px";
    } else {
      drawer.style.maxHeight = "";
    }
  }
}

let filterDrawerOpen = false;
function toggleFilterDrawer(force) {
  if (force !== undefined) filterDrawerOpen = force;
  else filterDrawerOpen = !filterDrawerOpen;
  if (filterDrawerOpen) {
    updateDrawerTop();
    $("#filterDrawer")
      .css({
        left: "0",
        right: "0",
        margin: "0 auto",
        transform: "",
        display: "block"
      })
      .fadeIn(100);
    $("#drawerBackdrop").addClass("show");
    if (!document.body.classList.contains('modal-open')){
      window._filterScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      window.acquireBodyLock && window.acquireBodyLock();
      document.body.style.top = `-${window._filterScrollY}px`;
    }
    $("#filterToggleBtn").attr("aria-expanded", true).attr("aria-pressed", true);
  } else {
    $("#filterDrawer").fadeOut(90);
    $("#drawerBackdrop").removeClass("show");
    $("#filterToggleBtn").attr("aria-expanded", false).attr("aria-pressed", false);
    window.__hardUnlockScroll && window.__hardUnlockScroll();
    window.releaseBodyLock && window.releaseBodyLock();
    if (document.body.classList.contains('modal-open')){
      const top = document.body.style.top;
      window.releaseBodyLock && window.releaseBodyLock();
      document.body.style.top = '';
      if (top) { try { window.scrollTo(0, -parseInt(top, 10)); } catch(e){} }
    }
  }
}

// イベントリスナーをまとめる関数
function setupEventListeners() {
  $(".guest-button").on("click keypress", function(e) {
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      const name = $(this).data("guest");
      const idx = selectedGuests.indexOf(name);
      if (idx >= 0) selectedGuests.splice(idx, 1);
      else selectedGuests.push(name);
      updateGuestButtonStyles();
      search();
    }
  });
  $("#cornerButtonGroup").on("click keypress", ".btn-corner", function(e) {
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      const name = $(this).data("corner");
      if(!name) return;
      const idx = selectedCorners.indexOf(name);
      if (idx >= 0) selectedCorners.splice(idx,1);
      else selectedCorners.push(name);
      updateCornerStyles();
      search();
    }
  });
  $("#otherButtonGroup").on("click keypress", ".btn-corner", function(e) {
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      const name = $(this).data("other");
      if(!name) return;
      const idx = selectedOthers.indexOf(name);
      if (idx >= 0) selectedOthers.splice(idx,1);
      else selectedOthers.push(name);
      updateOtherStyles();
      search();
    }
  });
  $("#yearButtonGroup").on("click keypress", ".btn-year", function(e) {
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      const year = String($(this).data("year"));
      const idx = selectedYears.indexOf(year);
      if (idx >= 0) selectedYears.splice(idx, 1);
      else selectedYears.push(year);
      updateYearStyles();
      search();
    }
  });
  $("#filterToggleBtn").on("click keypress", function(e){
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      toggleFilterDrawer();
    }
  });
  $("#drawerBackdrop").on("click", ()=>toggleFilterDrawer(false));
  $(window).on("resize", updateDrawerTop);
  $("#paginationArea").on("click keypress", ".page-btn", function (e) {
    if (e.type === "click" || (e.type === "keypress" && (e.key === "Enter" || e.key === " "))) {
      const n = parseInt($(this).data("page"), 10) || 1;
      currentPage = n;
      search({ gotoPage: n });
      $("html,body").animate({ scrollTop: $(".main-content").offset().top - 24 }, 180);
    }
  });
  $("#filtersBar").on("click keypress", ".filter-tag", function(e) {
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      const type = $(this).data("type");
      let val = $(this).data("value");
      if (type === "guest") selectedGuests = selectedGuests.filter(g=>g!==val);
      else if (type === "corner") selectedCorners = selectedCorners.filter(c=>c!==val);
      else if (type === "other") selectedOthers = selectedOthers.filter(o=>o!==val);
      else if (type === "year") {
        selectedYears = selectedYears.filter(y=>String(y)!==String(val));
        updateYearStyles();
      }
      else if (type === "keyword") $("#searchBox").val("");
      updateGuestButtonStyles();
      updateCornerStyles();
      updateOtherStyles();
      search();
    }
  });
  $(".reset-btn").on("click keypress", function(e) {
    if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
      resetSearch();
    }
  });
  $(document).on("click", function(e){
    if(filterDrawerOpen && !$(e.target).closest("#filterDrawer,#filterToggleBtn").length){
      toggleFilterDrawer(false);
    }
  });
  window.addEventListener("scroll", updateDrawerTop);
  window.addEventListener("resize", updateDrawerTop);
  updateGuestButtonStyles();
  updateCornerStyles();
  updateOtherStyles();
  updateYearStyles();

  $('#results').on('click', '.fav-btn', function(e){
    e.preventDefault(); e.stopPropagation();
    const id = $(this).data('id');
    toggleFavorite(id);
    $(this).toggleClass('active')
            .find('i').toggleClass('fa-regular fa-solid');
    const $li = $(this).closest('.episode-item');
    const favNow = isFavorite(id);
    $li.toggleClass('is-fav', !!favNow);
    if (showFavoritesOnly) search({ gotoPage: currentPage || 1 });
  });

  $('#favOnlyToggleBtn').on('click', function(){
    showFavoritesOnly = !showFavoritesOnly;
    $(this).attr('aria-pressed', showFavoritesOnly)
            .toggleClass('active', showFavoritesOnly);
    document.body.classList.toggle('fav-only', showFavoritesOnly);
    search({ gotoPage: 1 });
  });

  $('#randomBtn').on('click', function(){
    const pool = (Array.isArray(lastResults) && lastResults.length) ? lastResults : data;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.open(pick.link, '_blank', 'noopener');
  });



}


// ページが読み込まれたらアプリケーションを初期化
document.addEventListener('DOMContentLoaded', initializeApp);


// 本番の dark-mode クラスが付いたらプレロード用を解除
document.documentElement.classList.remove('dark-preload');
document.documentElement.style.backgroundColor = "";

var early = document.getElementById("early-dark-style");
if (early) early.remove();

window.addEventListener('load', function() {
  setTimeout(function() {
    $("#loading-screen").addClass("fadeout");
    setTimeout(function() {
      $("#loading-screen").remove();
    }, 1000);
  }, 950);
});

document.addEventListener('DOMContentLoaded', () => {
  const aboutLink = document.getElementById('aboutSiteLink');
  const aboutModal = document.getElementById('aboutModal');
  const aboutModalContent = document.getElementById('aboutModalContent');
  const aboutCloseBtn = document.getElementById('aboutCloseBtn');

  if (!aboutLink || !aboutModal || !aboutModalContent || !aboutCloseBtn) {
    return;
  }

  let scrollY = 0;

  const lockScrollForAboutModal = () => {
    if (document.body.classList.contains('scroll-lock')) return;
    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('scroll-lock');
  };

  const openModal = () => {
    lockScrollForAboutModal();
    aboutModal.classList.add('show');
    aboutCloseBtn.focus();
  };

  const closeModal = () => {
    if (!aboutModal.classList.contains('show')) return;
    void aboutModal.offsetHeight;
    aboutModal.classList.remove('show');
    setTimeout(() => {
      if (typeof window.__hardUnlockScroll === 'function') {
        window.__hardUnlockScroll();
      }
    }, 250);
    aboutLink.focus();
  };

  aboutLink.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  aboutCloseBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
  aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) closeModal(); });
  aboutModalContent.addEventListener('click', (e) => { e.stopPropagation(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aboutModal.classList.contains('show')) closeModal();
  });
});


document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, {passive:false});

document.addEventListener('contextmenu', function(e) {
  if(window.innerWidth > 700) {
    e.preventDefault();
    document.getElementById('rcModal').style.display = 'flex';
  } else {
    e.preventDefault();
  }
});

const rcOk = document.getElementById('rcOk');
const rcClose = document.getElementById('rcClose');

const closeRc = () => { document.getElementById('rcModal').style.display = 'none'; };

if (rcOk) rcOk.onclick = closeRc;
if (rcClose) rcClose.onclick = closeRc;

document.getElementById('rcModal').addEventListener('click', function(e){
  if(e.target === this) this.style.display='none';
});

window.currentPage = 1;

window.addEventListener('DOMContentLoaded', function() {
  if (typeof currentPage !== "undefined") currentPage = 1;
  setTimeout(function() {
    window.scrollTo(0, 0);
    document.getElementById('mainContent')?.scrollIntoView({ behavior: 'auto' });
  }, 400);
});

let __scrollY = 0;
function lockScroll() {
  if (document.body.classList.contains('scroll-lock')) return;
  __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${__scrollY}px`;
  document.body.classList.add('scroll-lock');
}
function unlockScroll() {
  if (!document.body.classList.contains('scroll-lock')) return;
  document.body.classList.remove('scroll-lock');
  document.body.style.top = '';
  window.scrollTo(0, __scrollY);
}
function updateScrollLock(){ if (typeof window.updateScrollLock === 'function') return window.updateScrollLock(); }

$('#filterToggleBtn').on('click', function () {
  const currentlyOpen = $('#filterDrawer').is(':visible');
  if (currentlyOpen) {
    $('#filterDrawer').hide();
    $('#drawerBackdrop').removeClass('show');
  } else {
    $('#filterDrawer').show();
    $('#drawerBackdrop').addClass('show');
  }
  updateScrollLock();
});

$('#drawerBackdrop').on('click', function () {
  $('#filterDrawer').hide();
  $('#drawerBackdrop').removeClass('show');
  updateScrollLock();
});

(function () {
  const root = document.documentElement;
  function updateHeaderOffset() {
    const sticky = document.querySelector('.sticky-search-area');
    if (!sticky) return;
    const h = sticky.offsetHeight;
    root.style.setProperty('--header-offset', h  + 'px');
  }
  window.addEventListener('DOMContentLoaded', updateHeaderOffset);
  window.addEventListener('load', updateHeaderOffset);
  window.addEventListener('resize', () => setTimeout(updateHeaderOffset, 50));
  window.addEventListener('orientationchange', () => setTimeout(updateHeaderOffset, 120));
  const sticky = document.querySelector('.sticky-search-area');
  if (sticky && 'MutationObserver' in window) {
    const mo = new MutationObserver(() => setTimeout(updateHeaderOffset, 0));
    mo.observe(sticky, { childList: true, subtree: true, attributes: true });
  }
  window.__updateHeaderOffset = updateHeaderOffset;
})();

window.__updateHeaderOffset && window.__updateHeaderOffset();

(function () {
  if (window.__drawerPatched) return;
  window.__drawerPatched = true;

  let __scrollY = 0;
  function lockScroll() {
    if (document.body.classList.contains('scroll-lock')) return;
    __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${__scrollY}px`;
    document.body.classList.add('scroll-lock');
  }
  function unlockScroll() {
    if (!document.body.classList.contains('scroll-lock')) return;
    document.body.classList.remove('scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, __scrollY);
  }
  window.updateScrollLock = function updateScrollLock() {
    const isFilterOpen = $('#filterDrawer').is(':visible');
    const isAboutOpen  = $('#aboutModal').hasClass('show');
    (isFilterOpen || isAboutOpen) ? lockScroll() : unlockScroll();
  };
  function updateDrawerTop() {
    const sbar = document.querySelector('.sticky-search-area');
    const drawer = document.getElementById('filterDrawer');
    if (sbar && drawer) {
      const rect = sbar.getBoundingClientRect();
      drawer.style.position = 'fixed';
      drawer.style.left = '50%';
      drawer.style.transform = '';
      drawer.style.right = '';
      drawer.style.top = (rect.top + rect.height) + 'px';
    }
  }
  function openDrawer() {
    updateDrawerTop();
    $('#filterDrawer').show();
    $('#drawerBackdrop').addClass('show');
    $('#filterToggleBtn').attr({ 'aria-expanded': true, 'aria-pressed': true });
    updateScrollLock();
  }
  function closeDrawer() {
    window.__hardUnlockScroll && window.__hardUnlockScroll();
    $('#filterDrawer').hide();
    $('#drawerBackdrop').removeClass('show');
    $('#filterToggleBtn').attr({ 'aria-expanded': false, 'aria-pressed': false });
    updateScrollLock();
  }
  window.__openDrawer = openDrawer;
  window.__closeDrawer = closeDrawer;
  $('#filterToggleBtn').off('click keypress').on('click keypress', function (e) {
    if (e.type === 'click' || (e.type === 'keypress' && (e.key === 'Enter' || e.key === ' '))) {
      $('#filterDrawer').is(':visible') ? closeDrawer() : openDrawer();
    }
  });
  $('#drawerBackdrop').off('click').on('click', closeDrawer);
  $(document).off('click.__drawer').on('click.__drawer', function(e){
    if ($('#filterDrawer').is(':visible') && !$(e.target).closest('#filterDrawer,#filterToggleBtn').length) {
      closeDrawer();
    }
  });
  window.resetSearch = (function (orig) {
    return function () {
      const prev = isRestoringURL;
      isRestoringURL = true;
      if (typeof orig === "function") {
        orig();
      } else {
        if ($("#searchBox").length) $("#searchBox").val("");
        if ($("#sortSelect").length) $("#sortSelect").val("newest");
        if (window.showFavoritesOnly) {
          if (typeof clearAllFavorites === "function") clearAllFavorites();
          window.showFavoritesOnly = false;
          $("#favOnlyToggleBtn").removeClass("active").attr("aria-pressed", "false");
          $("#results .fav-btn.active").removeClass("active").find("i").removeClass("fa-solid").addClass("fa-regular");
        }
        if (typeof resetFilters === "function") resetFilters();
        else if (typeof search === "function") search();
      }
      currentPage = 1;
      isRestoringURL = prev;
      buildURLFromState({ method: 'replace' });
      if (typeof closeDrawer === "function") closeDrawer();
      if (typeof updateScrollLock === "function") updateScrollLock();
    };
  })(window.resetSearch);
  try {
    const ids = (Array.isArray(data)?data:[]).map(it => (it.link||"").match(/watch\\?v=([\\w-]{11})/)?.[1]).filter(Boolean);
    const seen = {};
    ids.forEach(id => { seen[id]=(seen[id]||0)+1; });
    Object.keys(seen).forEach(id => { if (seen[id] > 1) console.warn('[SearchTheRadio] Duplicate video id:', id, 'x'+seen[id]); });
  } catch(e){}
  updateScrollLock();
})();

(function(){
  const MAP = {
    newest : {full:'公開日時が新しい順', short:'公開日時が新しい順'},
    oldest : {full:'公開日時が古い順',   short:'公開日時が古い順'},
    longest: {full:'動画時間が長い順',   short:'動画時間が長い順'},
    shortest:{full:'動画時間が短い順',   short:'動画時間が短い順'}
  };
  function applySortLabels(){
    const sel = document.getElementById('sortSelect');
    if(!sel) return;
    const isSmall = window.matchMedia('(max-width:600px)').matches;
    Object.entries(MAP).forEach(([val,labels])=>{
      const opt = sel.querySelector(`option[value="${val}"]`);
      if(opt) opt.textContent = isSmall ? labels.short : labels.full;
    });
  }
  document.addEventListener('DOMContentLoaded', applySortLabels);
  document.addEventListener('DOMContentLoaded', () => {
    ['#filterToggleBtn','#favOnlyToggleBtn'].forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            btn.addEventListener('click', () => {
            const pressed = btn.getAttribute('aria-pressed') === 'true';
            btn.setAttribute('aria-pressed', String(!pressed));
            });
        });
    });
    ['#filterToggleBtn','#favOnlyToggleBtn','#randomBtn','.reset-btn'].forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            btn.addEventListener('mouseup', () => btn.classList.remove('active'));
            btn.addEventListener('blur', () => btn.classList.remove('active'));
        });
    });
    ['favOnlyToggleBtn', 'randomBtn'].forEach(id => {
        const el = document.getElementById(id);
        const sp = el && el.querySelector('span');
        if (sp) sp.textContent = sp.textContent.trim();
    });
    const filterBtn = document.getElementById('filterToggleBtn');
    if (filterBtn && !filterBtn.dataset.label) {
        filterBtn.dataset.label = 'フィルタ';
    }
  });
  window.addEventListener('resize', applySortLabels);
  window.addEventListener('orientationchange', applySortLabels);
})();

function clearAllFavorites(){
  if (typeof favorites !== "undefined" && favorites instanceof Set) {
    favorites = new Set();
    if (typeof saveFavs === "function") saveFavs();
    else if (typeof FAV_KEY !== "undefined") localStorage.setItem(FAV_KEY, "[]");
  } else if (typeof FAV_KEY !== "undefined") {
    localStorage.setItem(FAV_KEY, "[]");
  }
}

function initializeAutocomplete() {
  const $input = document.getElementById('searchBox');
  const $box   = document.getElementById('autocomplete');
  if (!$input || !$box) return;

  const toWide = (s)=> (s||'').normalize('NFKC');
  const toHiragana = (s)=> toWide(s).replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const normalize = (s)=> toHiragana(s).toLowerCase().replace(/\s+/g,'');
  const hasKanji = (s)=> /[\p{sc=Han}]/u.test(s||'');
  const stripTimeSuffix = (s) => (s || '').replace(/[＠@]\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/,'');

  const entriesByLabel = new Map();
  const ensureEntry = (label, type) => {
    if (!label) return null;
    
    // ★★★ここからが修正点★★★
    const baseLabel = stripTimeSuffix(label); // 元のキーワードからタイムスタンプを除去
    // ★★★ここまでが修正点★★★

    let e = entriesByLabel.get(baseLabel); // タイムスタンプなしのキーワードで候補を管理
    if (!e) {
      e = { label: baseLabel, type: type || 'キーワード', norms: new Set() };
      entriesByLabel.set(baseLabel, e);
    } else {
      if (e.type !== '出演者' && type === '出演者') e.type = '出演者';
    }
    
    e.norms.add(normalize(label)); // 元の文字列も検索対象に
    e.norms.add(normalize(baseLabel)); // タイムスタンプなしも検索対象に
    
    // ★★★ここからが修正点★★★
    const rs = CUSTOM_READINGS[baseLabel]; // タイムスタンプなしのキーワードで読み仮名を取得
    // ★★★ここまでが修正点★★★

    if (rs) rs.forEach(r => e.norms.add(normalize(r)));
    return e;
  };

  const keywordsSeen = new Set();
  for (const ep of data) {
    (ep.keywords || []).forEach(kw => {
      if (!kw || keywordsSeen.has(kw)) return;
      keywordsSeen.add(kw);
      ensureEntry(kw, 'キーワード');
    });
    const guests = Array.isArray(ep.guest) ? ep.guest : [ep.guest];
    guests.filter(Boolean).forEach(g => ensureEntry(g, '出演者'));
  }

  const entries = Array.from(entriesByLabel.values());
  let cursor = -1;
  let viewItems = [];
  let composing = false;

  const clear = () => {
    $box.innerHTML = '';
    $box.hidden = true;
    cursor = -1;
    viewItems = [];
  };

  clearAutocompleteSuggestions = clear;

  const render = (items) => {
    if (isSearchTriggered) return;
    viewItems = items;
    $box.innerHTML = '';
    $box.hidden = items.length === 0;
    const qRaw = $input.value.trim();
    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'autocomplete-item';
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', idx === cursor ? 'true' : 'false');
      const i = item.label.toLowerCase().indexOf(qRaw.toLowerCase());
      const html = (i >= 0)
        ? `${item.label.slice(0,i)}<span class="match">${item.label.slice(i, i+qRaw.length)}</span>${item.label.slice(i+qRaw.length)}`
        : item.label;
// ▼ アイコンを生成するロジックを追加
      let typeIcon = '';
      if (item.type === '出演者') {
        typeIcon = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
      } else if (item.type === 'キーワード') {
        typeIcon = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
      }
      
      el.innerHTML = `<span class="type">${typeIcon}</span><span class="label">${html}</span>`;
      // ▲ ここまで変更
        el.addEventListener('mousedown', (e) => { e.preventDefault(); pick(idx); });
      $box.appendChild(el);
    });
  };

  const pick = (index) => {
    const item = viewItems[index];
    if (!item) return;
    $input.value = item.fill ?? item.label;
    clear();
    if (typeof search === 'function') search();
  };

  const scoreEntry = (entry, normQ, raw) => {
    let prefix = false, part = false;
    for (const k of entry.norms) {
      if (!k) continue;
      if (k.startsWith(normQ)) { prefix = true; break; }
      if (!part && k.includes(normQ)) part = true;
    }
    if (!prefix && !part) return null;
    const preferKanji = !hasKanji(raw) && hasKanji(entry.label) ? 2 : 0;
    const typeBoost  = entry.type === '出演者' ? 1 : 0;
    const score = (prefix ? 4 : 0) + (part ? 1 : 0) + preferKanji + typeBoost;
    return score;
  };

  const onInput = () => {
    const raw = $input.value;
    const normQ = normalize(raw);
    if (!normQ) { clear(); return; }

    const scored = [];
    for (const e of entries) {
      const s = scoreEntry(e, normQ, raw);
      if (s != null) scored.push({ e, s });
      if (scored.length > 200) break;
    }
    scored.sort((a,b)=> b.s - a.s);
    
    const itemsRaw = scored.slice(0, 20).map(({ e }) => {
        let label = e.label;
        const nlabel = normalize(stripTimeSuffix(label));
        if (!hasKanji(label) && READING_TO_LABEL[nlabel]) {
            label = READING_TO_LABEL[nlabel];
        }
        const display = stripTimeSuffix(label);
        return { label: display, fill: display, type: e.type };
    }).filter(Boolean);

    const seen = new Set();
    const items = [];
    for (const it of itemsRaw) {
      if (seen.has(it.label)) continue;
      seen.add(it.label);
      items.push(it);
    }
    render(items.slice(0, 12));
  };

  const onKeyDown = (e) => {
    if ($box.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cursor = (cursor + 1) % viewItems.length;
      render(viewItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cursor = (cursor - 1 + viewItems.length) % viewItems.length;
      render(viewItems);
    } else if (e.key === 'Enter') {
      if (cursor >= 0) { e.preventDefault(); pick(cursor); }
    } else if (e.key === 'Escape') {
      clear();
    }
  };

  $input.addEventListener('compositionstart', ()=> composing = true);
  $input.addEventListener('compositionend', ()=> { composing = false; onInput(); });
  const debounce = (fn, ms=40) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  $input.addEventListener('input', debounce(onInput, 30));
  $input.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', (e) => {
    if (e.target === $input || $box.contains(e.target)) return;
    clear();
  });
}

(function(){
  const $toggle = document.getElementById('historyToggle');
  const $body   = document.getElementById('historyBody');
  const $list   = document.getElementById('historyTimeline');
  if(!$toggle || !$body || !$list) return;

  const HISTORY = [
    { date: '2022-08-19', label: '番組配信決定', desc: '旧Twitterにて公式ラジオスタートの告知。', url: 'https://x.com/BTR_anime/status/1560280368384581632' },
    { date: '2022-09-07', label: '第1回配信開始', desc: '『ぼっち・ざ・らじお！』第1回がYoutubeと音泉にて配信開始。', url: 'https://x.com/BTR_anime/status/1567439907542499328' },
    { date: '2022-09-18', label: '番組公開収録 in 京まふ2022', desc: 'みやこめっせステージにて第2回の公開収録。', url: 'https://x.com/BTR_anime/status/1571365877211336707' },
    { date: '2022-12-01', label: 'フレッシュネスバーガー下北沢店コラボ開催', desc: 'ラジオでのアツいスパムバーガー話がきっかけになり、コラボが決定。<br>第1弾はスパムバーガー/スパムアボカドバーガーの販売延長と、店内にて番組宣伝ポスターの掲示が実施された。', url: 'https://x.com/Yopipi555/status/1597898760633610240' },
    { date: '2022-12-11', label: 'フレッシュネスバーガー下北沢店　青山吉能スパムバーガーお渡し会開催', desc: 'ぼっち応援キャンペーン第2弾として青山吉能がフレッシュネスバーガー下北沢店の1日店長に。先着100名様限定のレアイベント。', url: 'https://x.com/BTR_anime/status/1601789726217756672' },
    { date: '2023-03-19', label: '番組イベント開催', desc: '初の番組イベント。第1部：公開録音、第2部：後夜祭の2部制。<br>会場では「番組特製ボイスキーホルダー」が発売。<br>第2部の後夜祭で生まれた「青椒肉絲好きの博多弁エロ女上司(cv.長谷川育美)」が大きな反響を呼んだ。', url: 'https://x.com/onsenradio/status/1637405895683604480' },
    { date: '2023-03-29', label: '第8回『アニラジアワード』史上初の3冠受賞', desc: 'ぼっち・ざ・らじお！が『最優秀ラジオ大賞』『最優秀女性ラジオ賞』『大笑いラジオ賞』を受賞。', url: 'https://x.com/BTR_anime/status/1641067456625274881' },
    { date: '2023-04-26', label: '番組リニューアル', desc: '新コーナー「ぼっち予想テスト」「イキり懺悔室」や<br>「ぼっち・ざ・おーでぃしょん！」では新テーマ「青春」を募集。', url: 'https://x.com/BTR_anime/status/1651151378570682369' },
    { date: '2023-06-24', label: 'ぼっち・ざ・らじお！音泉祭りスペシャル', desc: '音泉祭り2023に青山吉能、鈴代紗弓が出演。', url: 'https://x.com/BTR_anime/status/1672559141800521729' },
    { date: '2023-08-01', label: '第1回Youtube100万再生突破', desc: '', url: 'https://x.com/BTR_anime/status/1686303096375513088' },
    { date: '2023-12-20', label: '第41回クリスマススペシャル', desc: '初の映像特別回。おしゃべりピンク爆誕。', url: 'https://x.com/onsenradio/status/1737399690579382638' },
    { date: '2024-04-24', label: '番組配信50回突破', desc: '', url: 'https://x.com/BTR_anime/status/1783088715356893504' },
    { date: '2024-12-25', label: '第68回クリスマススペシャル', desc: '初の映像生配信回。カラオケコーナーあり。', url: 'https://x.com/BTR_anime/status/1871935819327639585' },
    { date: '2025-01-15', label: '第69(ロック)回特別コーナー「ろっく！えぴそーど！」', desc: '破天荒＆カッコいいエピソードを青山吉能が「ロック」かどうか判定。', url: 'https://x.com/BTR_anime/status/1879455907379294412' },
    { date: '2025-02-15', label: '【緊急】ぼっち・ざ・らじお！【特別編】', desc: 'アニメ2期制作決定とともに公開された特別編。ゲストに斎藤圭一郎、山本ゆうすけ、けろりらを迎えた。(敬称略)', url: 'https://x.com/BTR_anime/status/1890732797804839239' },
    { date: '2025-04-09', label: '番組リニューアル', desc: '新コーナー「本日のテーマ」「結束バンドと私」が登場。<br>おまけコーナーも「ぼっち・ざ・らじお！アフタートーク」へリニューアル。', url: 'https://x.com/BTR_anime/status/1909896315141529882' },
    { date: '2025-09-07', label: 'ぼっち・ざ・らじお！番組3周年', desc: '', url: '' },
  ];

  const $modal = document.getElementById('historyModal');
  const $close = document.getElementById('historyCloseBtn');
  let _scrollY = 0;

  function openHistoryModal(){
    const overlay = document.getElementById('historyModal');
    if(!overlay) return;
    if (!$list?.dataset?.built && typeof buildTimeline === 'function') {
        buildTimeline(HISTORY);
        if (typeof setupYearObserver === 'function') setupYearObserver();
        if ($list) $list.dataset.built = '1';
    }
    overlay.hidden = false;
    overlay.classList.remove('closing');
    requestAnimationFrame(() => overlay.classList.add('show'));
    const sc = overlay.querySelector('.history-modal');
    if (sc) sc.scrollTop = 0;
    lockScroll();
    try{ $toggle?.setAttribute('aria-expanded','true'); }catch(_){}
  }

  function closeHistoryModal(){
    const overlay = document.getElementById('historyModal');
    if(!overlay || overlay.hidden) return;
    overlay.classList.add('closing');
    overlay.classList.remove('show');
    const done = () => {
        overlay.hidden = true;
        overlay.classList.remove('closing');
        overlay.removeEventListener('animationend', done);
        unlockScroll();
        try{ $toggle?.setAttribute('aria-expanded','false'); }catch(_){}
    };
    overlay.addEventListener('animationend', done);
    setTimeout(done, 260);
  }

  $('#historyCloseBtn').off('click').on('click', closeHistoryModal);
  $('#historyModal').off('click').on('click', function(e){
    if(e.target === this) closeHistoryModal();
  });
  $(document).off('keydown.__history').on('keydown.__history', function(e){
    if(e.key === 'Escape'){
        const overlay = document.getElementById('historyModal');
        if(overlay && !overlay.hidden) closeHistoryModal();
    }
  });
  $('#historyToggle').off('click').on('click', function(e){
    e.preventDefault(); e.stopPropagation();
    openHistoryModal();
  });

  function lockBodyScroll(){
    _scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    window.acquireBodyLock && window.acquireBodyLock();
    document.body.style.top = `-${_scrollY}px`;
  }
  function unlockBodyScroll(){
    window.releaseBodyLock && window.releaseBodyLock();
    const top = document.body.style.top;
    document.body.style.top = '';
    window.scrollTo(0, top ? -parseInt(top,10) : 0);
  }

  function buildTimeline(data){
    $list.innerHTML = '';
    const sorted = [...data].sort((a,b)=> (toDateKey(a.date) < toDateKey(b.date) ? -1 : 1));
    let currentYear = null;
    sorted.forEach(it=>{
      const y = (it.date || '').slice(0,4);
      if (y && y !== currentYear){
        currentYear = y;
        const yEl = document.createElement('div');
        yEl.className = 'history-year';
        yEl.textContent = `${y}年`;
        $list.appendChild(yEl);
      }
      const el = document.createElement('div');
      el.className = 'history-item';
      const dateText = fmtDate(it.date);
      el.innerHTML = `
        ${dateText ? `<div class="date">${dateText}</div>` : ''}
        <div class="label">${it.url ? `<a href="${it.url}" target="_blank" rel="noopener">${it.label}</a>` : it.label}</div>
        ${it.desc ? `<div class="desc">${it.desc}</div>` : ''}
      `;
      $list.appendChild(el);
    });
  }

  function toDateKey(s){
    if(!s) return '0000-00-00';
    const parts = s.split('-');
    const y = parts[0] || '0000';
    const m = parts[1] || '00';
    const d = parts[2] || '00';
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  function fmtDate(s){
    if(!s) return '';
    const parts = s.split('-');
    if (parts.length === 3) return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    if (parts.length === 2) return `${parseInt(parts[1])}月`;
    return '';
  }

  let yearObserver;
  function setupYearObserver(){
    const targets = [...$list.querySelectorAll('.history-year')];
    if (!targets.length) return;
    const rootEl = document.querySelector('.history-modal') || null;
    const io = new IntersectionObserver((entries)=>{
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const y = visible[0].target.textContent.replace('年','');
        setSubYear(y);
      }
    }, { root: rootEl, rootMargin: '-20% 0px -70% 0px', threshold: [0,1] });
    targets.forEach(t => io.observe(t));
    yearObserver = io;
    updateHeaderYear();
  }

  function updateHeaderYear(){
    const rootEl = document.querySelector('.history-modal');
    if(!rootEl) return;
    const rootTop = rootEl.getBoundingClientRect().top;
    const headerOffset = 56;
    let nearest = null, best = Infinity;
    [...$list.querySelectorAll('.history-year')].forEach(y=>{
      const rTop = y.getBoundingClientRect().top - rootTop - headerOffset;
      const score = Math.abs(rTop);
      if (score < best){ best = score; nearest = y; }
    });
    if (nearest){
      setSubYear(nearest.textContent.replace('年',''));
    }
  }

  function setSubYear(y){
    const sticky = document.getElementById('historyStickyYear');
    if (sticky) sticky.textContent = `${y}`;
  }

  window.addHistory = function(entry){
    HISTORY.push(entry);
    if ($list.dataset.built) { buildTimeline(HISTORY); setupYearObserver(); }
  };
})();

;(function(){
  const x   = document.getElementById('shareX');
  const ln  = document.getElementById('shareLINE');
  const fb  = document.getElementById('shareFB');
  if(!x || !ln || !fb) return;
  const shareUrl = 'https://searchtheradio.com/';
  const text = 'さーち・ざ・らじお！ — ぼっち・ざ・らじお！専門検索エンジン #さーち・ざ・らじお';
  const u = encodeURIComponent(shareUrl);
  const t = encodeURIComponent(text);
  x.href  = `https://x.com/intent/tweet?url=${u}&text=${t}`;
  ln.href = `https://social-plugins.line.me/lineit/share?url=${u}`;
  fb.href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
})();

(function autoFitControlButtonsGroup(){
  const elFilter = document.getElementById('filterToggleBtn');
  const elFav    = document.getElementById('favOnlyToggleBtn');
  const elRand   = document.getElementById('randomBtn');
  const elReset  = document.querySelector('.reset-btn');
  if (!elFilter || !elFav || !elRand || !elReset) return;
  const targets = [elFilter, elFav, elRand, elReset];
  function neededFontSize(el, startPx=16, minPx=12){
    el.style.setProperty('--ctl-fs', startPx + 'px');
    for (let fs = startPx; fs >= minPx; fs--){
      el.style.setProperty('--ctl-fs', fs + 'px');
      if (el.scrollWidth <= el.clientWidth + 2) return fs;
    }
    return minPx;
  }
  function fitAll(){
    if (!window.matchMedia('(max-width: 768px)').matches){
      targets.forEach(el => el.style.removeProperty('--ctl-fs'));
      return;
    }
    const sizes = targets.map(el => neededFontSize(el, 16, 12));
    const groupFs = Math.min.apply(null, sizes);
    targets.forEach(el => el.style.setProperty('--ctl-fs', groupFs + 'px'));
    if (targets.some(el => el.scrollWidth > el.clientWidth + 2)){
      const s = Math.max(12, groupFs - 1);
      targets.forEach(el => el.style.setProperty('--ctl-fs', s + 'px'));
    }
  }
  window.addEventListener('load', fitAll, { passive:true });
  window.addEventListener('resize', fitAll, { passive:true });
  window.addEventListener('orientationchange', fitAll, { passive:true });
  setTimeout(fitAll, 120);
})();

(function(){
  const elFilter = document.getElementById('filterToggleBtn');
  const elFav    = document.getElementById('favOnlyToggleBtn');
  const elRand   = document.getElementById('randomBtn');
  const elReset  = document.querySelector('.reset-btn');
  if (!elFilter || !elFav || !elRand || !elReset) return;
  document.addEventListener('DOMContentLoaded', () => {
    ['#filterToggleBtn','#favOnlyToggleBtn'].forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            btn.addEventListener('click', () => {
            const pressed = btn.getAttribute('aria-pressed') === 'true';
            btn.setAttribute('aria-pressed', String(!pressed));
            });
        });
    });
    ['#filterToggleBtn','#favOnlyToggleBtn','#randomBtn','.reset-btn'].forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            btn.addEventListener('mouseup', () => btn.classList.remove('active'));
            btn.addEventListener('blur', () => btn.classList.remove('active'));
        });
    });
    [elFav, elRand].forEach(el => {
      const sp = el.querySelector('span'); if (sp) sp.textContent = sp.textContent.trim();
    });
    if (!elFilter.dataset.label) elFilter.dataset.label = 'フィルタ';
  });
  const targets = [elFilter, elFav, elRand, elReset];
  function neededFontSize(el, startPx=16, minPx=12){
    el.style.setProperty('--ctl-fs', startPx + 'px');
    for (let fs = startPx; fs >= minPx; fs--){
      el.style.setProperty('--ctl-fs', fs + 'px');
      if (el.scrollWidth <= el.clientWidth + 2) return fs;
    }
    return minPx;
  }
  function fitAll(){
    if (!window.matchMedia('(max-width: 768px)').matches){
      targets.forEach(el => el.style.removeProperty('--ctl-fs'));
      return;
    }
    const sizes = targets.map(el => neededFontSize(el, 16, 12));
    const groupFs = Math.min.apply(null, sizes);
    targets.forEach(el => el.style.setProperty('--ctl-fs', groupFs + 'px'));
    if (targets.some(el => el.scrollWidth > el.clientWidth + 2)){
      const s = Math.max(12, groupFs - 1);
      targets.forEach(el => el.style.setProperty('--ctl-fs', s + 'px'));
    }
  }
  window.addEventListener('load', fitAll, { passive:true });
  window.addEventListener('resize', fitAll, { passive:true });
  window.addEventListener('orientationchange', fitAll, { passive:true });
  setTimeout(fitAll, 120);
})();

['filterToggleBtn','favOnlyToggleBtn','randomBtn','resetBtn','historyToggle'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      setTimeout(() => el.blur(), 0);
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const sticky = document.querySelector('.sticky-search-area');
  if (sticky) {
    const h = sticky.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-offset', Math.ceil(h + 12) + 'px');
  }
  const drawer = document.getElementById('filterDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const toggleBtn = document.getElementById('filterToggleBtn');
  function openDrawer() {
    drawer.style.display = 'block';
    backdrop.classList.add('show');
    window.acquireBodyLock && window.acquireBodyLock();
    toggleBtn?.setAttribute('aria-expanded', 'true');
    toggleBtn?.setAttribute('aria-pressed', 'true');
  }
  function closeDrawer() {
    window.__hardUnlockScroll && window.__hardUnlockScroll();
    drawer.style.display = 'none';
    backdrop.classList.remove('show');
    window.releaseBodyLock && window.releaseBodyLock();
    toggleBtn?.setAttribute('aria-expanded', 'false');
    toggleBtn?.setAttribute('aria-pressed', 'false');
  }
  if (toggleBtn && drawer && backdrop) {
    backdrop.addEventListener('click', function(){ closeDrawer(); window.__hardUnlockScroll && window.__hardUnlockScroll(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeDrawer(); window.__hardUnlockScroll && window.__hardUnlockScroll(); }
    });
  }
  if (isStandalone) {
    let lastY = window.scrollY;
    let hideTimer = null;
    const floating = [document.getElementById('toTopBtn'), document.getElementById('darkModeBtn')].filter(Boolean);
    window.addEventListener('scroll', () => {
      const diff = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (diff > 8) {
        floating.forEach(el => el.style.opacity = '0');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => floating.forEach(el => el.style.opacity = ''), 120);
      }
    }, { passive: true });
  }
});

function extractVideoId(url) {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return m ? m[1] : null;
}
function buildThumbCandidates(videoId) {
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
  ];
}
function createThumbImg(youtubeUrl, altText = 'thumbnail') {
  const id = extractVideoId(youtubeUrl);
  const img = document.createElement('img');
  img.className = 'thumbnail';
  img.alt = altText;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  const list = id ? buildThumbCandidates(id) : [];
  let idx = 0;
  const tryNext = () => {
    if (idx < list.length) {
      img.src = list[idx++];
    } else {
      img.src = 'logo.png';
      img.classList.add('thumb-fallback');
    }
  };
  img.addEventListener('error', tryNext);
  tryNext();
  return img;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.endsWith('ytimg.com')) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith((async () => {
    try {
      const fresh = await fetch(event.request, { cache: 'no-store' });
      if (event.request.method === 'GET' && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw err;
    }
  })());
});

const preloadThumbnails = (episodes) => {
  episodes.forEach(ep => {
    try {
        const id = new URL(ep.link).searchParams.get("v");
        if(id) {
            const img = new Image();
            img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        }
    } catch(e) {
        console.warn('Invalid URL for thumbnail preload:', ep.link);
    }
  });
};

(function(){
  const drawer = document.getElementById('filterDrawer');
  if (!drawer || window.__drawerObserverSetup) return;
  window.__drawerObserverSetup = true;
  const obs = new MutationObserver(function(){
    const style = window.getComputedStyle(drawer);
    if (style.display === 'none' || !drawer.offsetParent){
      window.releaseBodyLock && window.releaseBodyLock();
    }
  });
  obs.observe(drawer, { attributes: true, attributeFilter: ['style', 'class'] });
})();