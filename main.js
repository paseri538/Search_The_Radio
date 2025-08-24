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

// --- Hard unlock: どんな状況でもスクロールを復元する安全装置 (最終版)
window.__hardUnlockScroll = function __hardUnlockScroll(){
  try { window.__bodyLockCount = 0; } catch(e){}
  document.body.style.paddingRight = '';
  document.body.classList.remove('body-scroll-locked');
  
  // 念のため、古いクラスが残っていても削除
  document.body.classList.remove('modal-open');
  document.body.classList.remove('scroll-lock');
};

// === Global, reference-counted body scroll locker (最終版 - 点滅しない方法) ===
(function(){
  if (!window.__bodyLockCount) window.__bodyLockCount = 0;
  
  window.acquireBodyLock = function acquireBodyLock(){
    if (window.__bodyLockCount === 0){
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.classList.add('body-scroll-locked');
    }
    window.__bodyLockCount++;
  };
  
  window.releaseBodyLock = function releaseBodyLock(){
    window.__bodyLockCount = Math.max(0, (window.__bodyLockCount||0) - 1);
    if (window.__bodyLockCount === 0){
      document.body.style.paddingRight = '';
      document.body.classList.remove('body-scroll-locked');
    }
  };
})();

// ===================================================
// ★★★ データと状態管理 ★★★
// ===================================================

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

async function loadExternalData() {
    try {
        const [episodesRes,readingsRes,keywordsRes,luckyButtonRes,historyRes] = await Promise.all([
            fetch('episodes.json'),
            fetch('readings.json'),
            fetch('keywords.json'),
            fetch('lucky-button.json'),
            fetch('history.json')
        ]);
        const episodesData = await episodesRes.json();
        const readingsData = await readingsRes.json();
        const keywordsData = await keywordsRes.json();
        luckyButtonData = await luckyButtonRes.json();
        historyData = await historyRes.json();

        data = episodesData;
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
        if(resultsEl) {
            resultsEl.innerHTML = '<li class="no-results">データの読み込みに失敗しました。<br>ページを再読み込みしてください。</li>';
        }
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fadeout');
            setTimeout(() => loadingScreen.remove(), 1000);
        }
    }
}

async function initializeApp() {
    await loadExternalData();
    preloadThumbsFromData();
    if (!applyStateFromURL({ replace: true })) {
        search();
    }
    setupEventListeners();
    initializeAutocomplete();
    console.log("Application initialized.");
}

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
const stripTimeSuffix = (s) => (s || '').replace(/[＠@]\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/,'');

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

function createPlaylist() {
    if (!showFavoritesOnly || !lastResults || lastResults.length === 0) {
        alert('プレイリストを作成するには、お気に入りが1件以上必要です。');
        return;
    }
    const videoIds = lastResults.map(item => getVideoId(item.link)).filter(Boolean);
    if (videoIds.length === 0) {
        alert('有効な動画IDが見つかりませんでした。');
        return;
    }
    const playlistUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
    window.open(playlistUrl, '_blank', 'noopener');
}

function updatePlaylistButtonVisibility() {
    const btn = document.getElementById('createPlaylistBtn');
    if (btn) {
        // お気に入り表示モードで、かつ結果が1件以上ある場合のみボタンを表示
        btn.hidden = !(showFavoritesOnly && lastResults && lastResults.length > 0);
    }
}


function search(opts = {}) {
  isSearchTriggered = true;
  clearAutocompleteSuggestions();
  setTimeout(() => {
    isSearchTriggered = false;
  }, 100);

  let raw = $("#searchBox").val().trim();
  const sort = $("#sortSelect").val();
  let res = [...data];

  if (normalize(raw).includes('いいね')) {
    rainGoodMarks();
  }
  
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
      const keywordsWithoutTimestamp = (it.keywords || []).map(kw => stripTimeSuffix(kw));
      const combined = [it.title, Array.isArray(it.guest) ? it.guest.join(" ") : it.guest, keywordsWithoutTimestamp.join(" ")].join(" ");
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
          const searchableText = guestArr.join(' ') + ' ' + (it.keywords || []).join(' ');
          match = indivGuests.some(sel => searchableText.includes(sel));
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
  setTimeout(fitGuestLines, 0);
  window.addEventListener('orientationchange', () => setTimeout(fitGuestLines, 120));
  renderPagination(res.length);
  updateActiveFilters();
  updatePlaylistButtonVisibility();
}

function fitGuestLines() {
  document.querySelectorAll('.guest-one-line').forEach(el => {
    el.style.fontSize = ''; // スタイルを一旦リセット
    const maxPx = parseFloat(getComputedStyle(el).fontSize) || 16;
    let size = maxPx;
    const minPx = 9; // PC/スマホ共通で最小サイズを9pxに設定

    // 要素の幅に収まるまで、フォントサイズを少しずつ小さくする
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
    $("#results").html(`<li class="no-results"><div class="no-results-icon">ﾉ°(6ᯅ9)</div></li>`);
    return;
  }

  const startIdx = (page - 1) * pageSize, endIdx = page * pageSize;
  const qRaw = $("#searchBox").val().trim();
  const cornerTarget = Array.isArray(selectedCorners) && selectedCorners.length === 1 ? selectedCorners[0] : null;
  const isLuckyButtonSearch = (normalize(qRaw) === "らっきーぼたん" || (Array.isArray(selectedCorners) && selectedCorners.includes("ラッキーボタン")));

  arr.slice(startIdx, endIdx).forEach((it, index) => {
    const thumb = getThumbnail(it.link);
    const hashOnly = getHashNumber(it.title);
    let hit = findHitTime(it, qRaw);
    if (!hit && selectedGuests.length > 0) {
      for (const guestName of selectedGuests) {
        const guestHit = findHitTime(it, guestName);
        if (guestHit) {
          hit = guestHit;
          break;
        }
      }
    }
    if (!hit && cornerTarget) {
      hit = findHitTime(it, cornerTarget);
    }
    const finalLink = hit ? withTimeParam(it.link, hit.seconds) : it.link;
    let guestText = "";
    if (Array.isArray(it.guest)) guestText = "ゲスト：" + it.guest.join("、");
    else if (it.guest === "青山吉能") guestText = "パーソナリティ：青山吉能";
    else if (it.guest && it.guest !== "その他") guestText = `ゲスト：${it.guest}`;

    if (isLuckyButtonSearch) {
      const episodeKey = it.episode === "02" && it.title.includes("京まふ") ? "京まふ" : it.episode;
      const luckyPerson = luckyButtonData[episodeKey];
      if (luckyPerson) {
        guestText = luckyPerson;
      }
    }
    
    const animationStyle = `style="--i: ${index};"`;

    ul.append(`
      <li class="episode-item" role="link" tabindex="0" ${animationStyle}> 
        <a href="${finalLink}" target="_blank" rel="noopener" style="display:flex;gap:13px;text-decoration:none;color:inherit;align-items:center;min-width:0;">
          <div class="thumb-col">
            <img src="${thumb}" class="thumbnail" alt="サムネイル：${hashOnly}" loading="lazy">
            ${hit ? `<div class="ts-buttons"><button class="ts-btn" data-url="${it.link}" data-ts="${hit.seconds}" aria-label="${hit.label} から再生">${hit.label}</button></div>` : ``}
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
    $(this).append(`<button class="fav-btn ${active ? 'active' : ''}" data-id="${id}" aria-label="お気に入り" title="お気に入り"><i class="${active ? 'fa-solid' : 'fa-regular'} fa-star"></i></button>`);
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

// main.js の既存の resetSearch 関数をこちらに置き換えてください
function resetSearch() {
  $("#searchBox").val("");
  $("#sortSelect").val("newest");

  // 「お気に入りだけ表示」がオンの時にリセットされた場合
  if (showFavoritesOnly) {
    // 1. メモリとお使いのブラウザのストレージからお気に入り情報を全て削除
    favorites.clear();
    saveFavs();
    
    // 2. 「お気に入りだけ表示」モードを解除
    showFavoritesOnly = false;
    document.body.classList.remove('fav-only');
    $("#favOnlyToggleBtn").removeClass("active").attr("aria-pressed","false");
    
    // 3. 画面に表示されている各カードの★マークを非アクティブ状態に戻す
    $("#results .fav-btn.active")
      .removeClass("active")
      .find("i")
      .removeClass("fa-solid")
      .addClass("fa-regular");
  }

  // 4. キーワード以外のフィルター（出演者、コーナーなど）をリセットして再検索
  resetFilters();
  
  // 5. ページの一番上までスクロール
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  
  // 6. ボタンからフォーカスを外す
  const resetButton = document.getElementById('mainResetBtn');
  if (resetButton) resetButton.blur();
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

function setupEventListeners() {
  $('#filterToggleBtn').off('click').on('click', function() {
    const $drawer = $('#filterDrawer');
    const $backdrop = $('#drawerBackdrop');
    const isOpening = $drawer.is(':hidden');

    if (isOpening) {
      $drawer.show();
      $backdrop.addClass('show');
      $(this).attr({ 'aria-expanded': 'true', 'aria-pressed': 'true' });
      if (window.acquireBodyLock) window.acquireBodyLock();
    } else {
      $drawer.hide();
      $backdrop.removeClass('show');
      $(this).attr({ 'aria-expanded': 'false', 'aria-pressed': 'false' });
      if (window.releaseBodyLock) window.releaseBodyLock();
    }
  });
  
  $('#drawerCloseBtn').off('click').on('click', () => $('#filterToggleBtn').trigger('click'));
  $('#drawerBackdrop').off('click').on('click', () => {
    if ($('#filterDrawer').is(':visible')) {
      $('#filterToggleBtn').trigger('click');
    }
  });

  $('#favOnlyToggleBtn').off('click').on('click', function(){
    showFavoritesOnly = !showFavoritesOnly;
    $(this).attr('aria-pressed', showFavoritesOnly).toggleClass('active', showFavoritesOnly);
    document.body.classList.toggle('fav-only', showFavoritesOnly);
    search({ gotoPage: 1 });
  });

  $('#randomBtn').off('click').on('click', function(){
    const pool = (Array.isArray(lastResults) && lastResults.length) ? lastResults : data;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.open(pick.link, '_blank', 'noopener');
  });
  
  $('.reset-btn').off('click').on('click', function() {
    if (typeof resetSearch === 'function') {
      resetSearch();
    }
  });

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
  $('#results').on('click', '.fav-btn', function(e){
    e.preventDefault(); e.stopPropagation();
    const id = $(this).data('id');
    toggleFavorite(id);
    $(this).toggleClass('active').find('i').toggleClass('fa-regular fa-solid');
    const $li = $(this).closest('.episode-item');
    const favNow = isFavorite(id);
    $li.toggleClass('is-fav', !!favNow);
    if (showFavoritesOnly) search({ gotoPage: currentPage || 1 });
  });

  $('#createPlaylistBtn').off('click').on('click', createPlaylist);

  updateGuestButtonStyles();
  updateCornerStyles();
  updateOtherStyles();
  updateYearStyles();
}

document.addEventListener('DOMContentLoaded', initializeApp);

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
  if (!aboutLink || !aboutModal || !aboutModalContent || !aboutCloseBtn) return;

  const openModal = () => {
    if (typeof window.acquireBodyLock === 'function') window.acquireBodyLock();
    aboutModal.classList.add('show');
    aboutCloseBtn.focus();
  };

  const closeModal = () => {
    if (!aboutModal.classList.contains('show')) return;
    aboutModal.classList.remove('show');
    setTimeout(() => {
      if (typeof window.releaseBodyLock === 'function') window.releaseBodyLock();
    }, 200);
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

(function () {
  const root = document.documentElement;
  function updateHeaderOffset() {
    const sticky = document.querySelector('.sticky-search-area');
    if (!sticky) return;
    const h = sticky.offsetHeight;
    root.style.setProperty('--header-height', h + 'px');
    root.style.setProperty('--header-offset', (h + 10) + 'px');
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

function initializeAutocomplete() {
  const $input = document.getElementById('searchBox');
  const $box   = document.getElementById('autocomplete');
  if (!$input || !$box) return;

  const normalize = (s)=> (s||'').normalize('NFKC').replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)).toLowerCase().replace(/\s+/g,'');
  const hasKanji = (s)=> /[\p{sc=Han}]/u.test(s||'');

  const entriesByLabel = new Map();
  const ensureEntry = (label, type) => {
    if (!label) return null;
    const baseLabel = stripTimeSuffix(label); 
    let e = entriesByLabel.get(baseLabel);
    if (!e) {
      e = { label: baseLabel, type: type || 'キーワード', norms: new Set() };
      entriesByLabel.set(baseLabel, e);
    } else {
      if (e.type !== '出演者' && type === '出演者') e.type = '出演者';
    }
    e.norms.add(normalize(baseLabel)); 
    const rs = CUSTOM_READINGS[baseLabel];
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
      let typeIcon = '';
      if (item.type === '出演者') {
        typeIcon = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
      } else if (item.type === 'キーワード') {
        typeIcon = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
      }
      
      el.innerHTML = `<span class="type">${typeIcon}</span><span class="label">${html}</span>`;
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
        const nlabel = normalize(label);
        if (!hasKanji(label) && READING_TO_LABEL[nlabel]) {
            label = READING_TO_LABEL[nlabel];
        }
        return { label: label, fill: label, type: e.type };
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

  let composing = false;
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



  const $modal = document.getElementById('historyModal');
  const $close = document.getElementById('historyCloseBtn');

  function openHistoryModal(){
    const overlay = document.getElementById('historyModal');
    if(!overlay) return;
    if (!$list?.dataset?.built && typeof buildTimeline === 'function') {
        buildTimeline(historyData);
        if ($list) $list.dataset.built = '1';
    }
    overlay.hidden = false;
    overlay.classList.remove('closing');
    requestAnimationFrame(() => overlay.classList.add('show'));
    const sc = overlay.querySelector('.history-modal');
    if (sc) sc.scrollTop = 0;
    if (typeof window.acquireBodyLock === 'function') window.acquireBodyLock();
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
        if (typeof window.releaseBodyLock === 'function') window.releaseBodyLock();
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

['filterToggleBtn','favOnlyToggleBtn','randomBtn','resetBtn','historyToggle'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      setTimeout(() => el.blur(), 0);
    }
  });
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

function rainGoodMarks() {
  const count = 30;
  const container = document.body;
  for (let i = 0; i < count; i++) {
    const goodMark = document.createElement('span');
    goodMark.className = 'good-mark';
    goodMark.textContent = '👍';
    goodMark.style.left = Math.random() * 100 + 'vw';
    goodMark.style.animationDuration = (Math.random() * 2 + 3) + 's';
    goodMark.style.animationDelay = Math.random() * 2 + 's';
    goodMark.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
    goodMark.addEventListener('animationend', () => {
      goodMark.remove();
    });
    container.appendChild(goodMark);
  }
}




document.addEventListener('DOMContentLoaded', function() {
    const filterBtn = document.getElementById('filterToggleBtn');
    if (filterBtn) {
        filterBtn.setAttribute('data-label', 'フィルタ');
    }
});


// =================================================================
// ===== ボタンフォントサイズ調整 ＆ ローディング画面制御 (同期最終版) =====
// =================================================================
(function() {
    // --- ボタンフォントサイズの自動調整機能 ---
    const sizerModule = {
        targets: [],
        init: function() {
            this.targets = Array.from(document.querySelectorAll('#filterToggleBtn, #favOnlyToggleBtn, #randomBtn, .reset-btn'));
            if (this.targets.some(el => !el)) return;
            
            // 画面の向きが変わった時にも再計算を実行
            window.addEventListener('orientationchange', this.fitAll.bind(this), { passive: true });
        },
        findOptimalFontSize: function(element, startSize = 15, minSize = 10.5) {
            element.style.fontSize = startSize + 'px';
            if (element.scrollWidth > element.clientWidth + 1) { // 許容誤差を1pxに
                const newSize = startSize - 0.5;
                if (newSize >= minSize) return this.findOptimalFontSize(element, newSize, minSize);
                return minSize;
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

    // DOMが読み込まれたらサイザーを初期化
    document.addEventListener('DOMContentLoaded', () => sizerModule.init());

    // ページの全リソースが読み込まれたら実行
    window.addEventListener('load', function() {
        // 異なるタイミングで複数回、最終計算を実行
        setTimeout(() => sizerModule.fitAll(), 100);
        setTimeout(() => sizerModule.fitAll(), 300);

        // ★最終計算が完了してから、ローディング画面を消す処理を開始
        setTimeout(() => {
            sizerModule.fitAll(); // 最後のダメ押し計算
            document.body.classList.add('buttons-ready'); // CSSに表示準備完了を伝える

            // ローディング画面をフェードアウト
            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) {
                loadingScreen.classList.add("fadeout");
                setTimeout(() => {
                    if (loadingScreen) loadingScreen.remove();
                }, 1000);
            }
        }, 750); // 750ミリ秒待つことで、ほとんどの端末で描画が安定する
    });
})();

// ===== 堅牢なスクロールロック解除 (保険機能) =====
(function() {
    // 監視対象となるモーダル要素のIDリスト
    const modalIds = ['filterDrawer', 'aboutModal', 'historyModal'];

    // 監視する処理
    const observerCallback = (mutationsList, observer) => {
        for (const mutation of mutationsList) {
            // 監視対象のスタイルが変更されたか、またはhidden属性が変更された場合
            if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'hidden')) {
                const targetElement = mutation.target;
                const style = window.getComputedStyle(targetElement);

                // 要素が非表示になったと判断された場合
                if (style.display === 'none' || targetElement.hidden) {
                    // console.log(targetElement.id + ' is hidden, trying to release lock.');
                    if (window.releaseBodyLock) {
                        window.releaseBodyLock();
                    }
                }
            }
        }
    };

    // オブザーバーのインスタンスを作成
    const observer = new MutationObserver(observerCallback);

    // 各モーダル要素に対して監視を開始
    modalIds.forEach(id => {
        const modalElement = document.getElementById(id);
        if (modalElement) {
            observer.observe(modalElement, {
                attributes: true, // 属性の変更を監視
                attributeFilter: ['style', 'hidden'] // styleとhidden属性に限定
            });
        }
    });
})();