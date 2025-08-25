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
  if (!applyStateFromURL({ replace: true })) {
    search();
  }
  setupEventListeners();
  initializeAutocomplete();
  setupThemeSwitcher();
  setupModals();
  setupShareButtons();
  setupRightClickModal();
  updateHeaderOffset();
  console.log("Application initialized.");
}

function preloadThumbsFromData() {
  try {
    const head = document.head;
    const seen = new Set();
    data.forEach(ep => {
      const vid = getVideoId(ep.link);
      if (!vid || seen.has(vid)) return;
      seen.add(vid);
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      // ★ 変更点: こちらも mqdefault.jpg に合わせる
      link.href = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
      link.crossOrigin = 'anonymous';
      head.appendChild(link);
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

  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  const raw = searchBox ? searchBox.value.trim() : '';
  const sort = sortSelect ? sortSelect.value : 'newest';

  let res = [...data];

  if (normalize(raw).includes('いいね')) {
    rainGoodMarks();
  }

  // Keyword search
  if (raw.length > 0) {
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

  // Filters
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
  if (selectedOthers.length) res = res.filter(it => selectedOthers.every(o => it.searchText.includes(normalize(o))));
  if (selectedYears.length) res = res.filter(it => selectedYears.includes(String(it.date).slice(0, 4)));
  if (showFavoritesOnly) res = res.filter(it => isFavorite(getVideoId(it.link)));

  // Sorting
  if (sort === "newest") res.sort((a, b) => new Date(b.date) - new Date(a.date) || getEpisodeNumber(b.episode) - getEpisodeNumber(a.episode));
  else if (sort === "oldest") res.sort((a, b) => new Date(a.date) - new Date(b.date) || getEpisodeNumber(a.episode) - getEpisodeNumber(b.episode));
  else if (sort === "longest" || sort === "shortest") {
    const toSec = s => (s || "0:0").split(":").map(Number).reduce((acc, time) => 60 * acc + time, 0);
    res.sort((a, b) => sort === "longest" ? toSec(b.duration) - toSec(a.duration) : toSec(a.duration) - toSec(b.duration));
  }

  lastResults = res;
  document.getElementById('fixedResultsCount').textContent = `表示数：${res.length}件`;
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
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  document.getElementById('mainResetBtn')?.blur();
}

/**
 * ===================================================
 * ★★★ UIレンダリングと更新 ★★★
 * ===================================================
 */
function renderResults(arr, page = 1) {
  const ul = document.getElementById("results");
  ul.innerHTML = "";

  if (!arr || arr.length === 0) {
    ul.innerHTML = `<li class="no-results"><div class="no-results-icon">ﾉ°(6ᯅ9)</div></li>`;
    return;
  }

  const startIdx = (page - 1) * pageSize;
  const endIdx = page * pageSize;
  const qRaw = document.getElementById('searchBox').value.trim();
  const cornerTarget = selectedCorners.length === 1 ? selectedCorners[0] : null;
  const isLuckyButtonSearch = (normalize(qRaw) === "らっきーぼたん" || selectedCorners.includes("ラッキーボタン"));

  const fragment = document.createDocumentFragment();

  arr.slice(startIdx, endIdx).forEach((it, index) => {
    const videoId = getVideoId(it.link);
    const thumbUrl = getThumbnailUrl(it.link);
    const hashOnly = getHashNumber(it.title);

    let hit = findHitTime(it, qRaw);
    if (!hit && selectedGuests.length > 0) {
        for(const guest of selectedGuests) {
            hit = findHitTime(it, guest);
            if(hit) break;
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
      guestText = luckyButtonData[episodeKey] || guestText;
    }

    const li = document.createElement('li');
    li.className = 'episode-item';
    li.setAttribute('role', 'link');
    li.tabIndex = 0;
    li.style.setProperty('--i', index.toString());

    li.innerHTML = `
      <a href="${finalLink}" target="_blank" rel="noopener" style="display:flex;gap:13px;text-decoration:none;color:inherit;align-items:center;min-width:0;">
        <div class="thumb-col">
          <img src="${thumbUrl}" class="thumbnail" alt="サムネイル：${hashOnly}" loading="lazy">
          ${hit ? `<div class="ts-buttons"><button class="ts-btn" data-url="${it.link}" data-ts="${hit.seconds}" aria-label="${hit.label} から再生">${hit.label}</button></div>` : ''}
        </div>
        <div style="min-width:0;">
          <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
            <h5 class="mb-1">
              ${hashOnly}${/\u3000/.test(it.title) ? "<br>" : " "}
              <span class="guest-one-line" aria-label="${guestText}">${guestText}</span>
            </h5>
          </div>
          <p class="episode-meta">公開日時：${it.date}<br>動画時間：${it.duration || "?"}</p>
        </div>
      </a>
      <button class="fav-btn" data-id="${videoId}" aria-label="お気に入り" title="お気に入り"><i class="fa-regular fa-star"></i></button>
    `;
    
    if (isFavorite(videoId)) {
      const favBtn = li.querySelector('.fav-btn');
      li.classList.add('is-fav');
      favBtn.classList.add('active');
      favBtn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
    }
    fragment.appendChild(li);
  });

  ul.appendChild(fragment);
  setTimeout(fitGuestLines, 0);
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
    btn.textContent = i;
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
  selectedYears.forEach(y => html += `<button class="filter-tag" tabindex="0" aria-label="年フィルタ解除 ${y}" data-type="year" data-value="${y}"><i class="fa fa-calendar"></i> ${y} <i class="fa fa-xmark"></i></button>`);
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

function fitGuestLines() {
  const elements = Array.from(document.querySelectorAll('.guest-one-line'));
  if (elements.length === 0) return;

  // STEP 1: 最初にすべての計算情報をまとめて読み取る
  const measurements = elements.map(el => {
    el.style.fontSize = ''; // スタイルを一旦リセット
    return {
      el,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      maxPx: parseFloat(getComputedStyle(el).fontSize) || 16,
    };
  });

  // STEP 2: DOMに触らずに、新しいフォントサイズを計算する
  const newStyles = measurements.map(m => {
    const { el, clientWidth, scrollWidth, maxPx } = m;
    const minPx = 9;
    let size = maxPx;
    
    // scrollWidth が clientWidth を超えている場合のみ計算
    if (scrollWidth > clientWidth) {
      // 比率を使って最適なサイズを一発で計算（微調整ループをなくす）
      size = Math.max(minPx, maxPx * (clientWidth / scrollWidth) - 0.5);
    }
    
    return {
      el,
      size: Math.floor(size * 2) / 2 // 0.5px単位に丸める
    };
  });
  
  // STEP 3: 計算結果をまとめてDOMに書き込む
  requestAnimationFrame(() => {
    newStyles.forEach(({ el, size }) => {
      el.style.fontSize = `${size}px`;
    });
  });
}


function updatePlaylistButtonVisibility() {
    const btn = document.getElementById('createPlaylistBtn');
    if (btn) {
        btn.hidden = !(showFavoritesOnly && lastResults && lastResults.length > 0);
    }
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
        window.scrollTo({ top, behavior: 'smooth' });
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
    updateFilterButtonStyles();
    search();
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
}

/**
 * ===================================================
 * ★★★ その他のUI機能 ★★★
 * ===================================================
 */
(function scrollLockModule() {
  let lockCount = 0;
  window.acquireBodyLock = () => {
    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.classList.add('body-scroll-locked');
    }
    lockCount++;
  };
  window.releaseBodyLock = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.paddingRight = '';
      document.body.classList.remove('body-scroll-locked');
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
  const allThemeClasses = ['dark-mode', 'theme-pink', 'theme-yellow', 'theme-blue', 'theme-red'];

  const applyTheme = (themeName) => {
    document.body.classList.remove(...allThemeClasses);
    if (themeName === 'dark') document.body.classList.add('dark-mode');
    else if (themeName && themeName !== 'light') document.body.classList.add(`theme-${themeName}`);
    panel.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    panel.querySelector(`.theme-btn[data-theme="${themeName}"]`)?.classList.add('active');
    try { localStorage.setItem(THEME_KEY, themeName); } catch (e) {}
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
            // 既に開いている、または閉じるアニメーション中なら何もしない
            if (modal.classList.contains('show') || modal.classList.contains('closing')) return;
            
            // 閉じるアニメーションのクラスが残っていれば削除
            modal.classList.remove('closing');
            
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
  const text = 'さーち・ざ・らじお！ — ぼっち・ざ・らじお！専門検索エンジン #さーち・ざ・らじお';
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
        yEl.textContent = `${y}年`;
        fragment.appendChild(yEl);
      }
      const el = document.createElement('div');
      el.className = 'history-item';
      const dateParts = it.date ? it.date.split('-') : [];
      let dateText = '';
      if (dateParts.length === 3) dateText = `${parseInt(dateParts[1])}月${parseInt(dateParts[2])}日`;
      else if (dateParts.length === 2) dateText = `${parseInt(dateParts[1])}月`;
      
      el.innerHTML = `
        ${dateText ? `<div class="date">${dateText}</div>` : ''}
        <div class="label">${it.url ? `<a href="${it.url}" target="_blank" rel="noopener">${it.label}</a>` : it.label}</div>
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
    });

    window.addEventListener('load', () => {
        const runFit = () => sizerModule.fitAll();
        setTimeout(runFit, 100);
        setTimeout(runFit, 300);
        setTimeout(() => {
            runFit();
            document.body.classList.add('buttons-ready');
            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) {
                loadingScreen.classList.add("fadeout");
                loadingScreen.addEventListener('transitionend', () => loadingScreen.remove(), { once: true });
            }
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

        // ★変更点: 検索とフォーカスの処理をsetTimeoutで分離し、競合を防ぐ
        setTimeout(() => {
          search();
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
  
  const onKeyDown = (e) => {
    if (boxEl.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = (cursor + 1) % viewItems.length; render(viewItems); } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor - 1 + viewItems.length) % viewItems.length; render(viewItems); } 
    else if (e.key === 'Enter') { if (cursor >= 0) { e.preventDefault(); pick(cursor); } } 
    else if (e.key === 'Escape') { clear(); }
  };

  const debounce = (fn, ms=40) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  inputEl.addEventListener('input', debounce(onInput, 30));
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

// main.js の一番下など、分かりやすい場所に追加してください。

/**
 * ===================================================
 * ★★★ PWA/モバイル対応強化 ★★★
 * ===================================================
 */
(function enhanceMobileExperience() {
  // PWAモード（スタンドアロン表示）を検出してクラスを付与
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.documentElement.classList.add('is-standalone');
  }

  // モバイルブラウザの100vh問題を解決
  const setVh = () => {
    // ★変更点: 入力中はvhの更新をスキップして揺れを防ぐ
    if (isInputFocused) return;
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  setVh();
  window.addEventListener('resize', setVh, { passive: true });
  window.addEventListener('orientationchange', setVh, { passive: true });

  // ★追加: 入力欄のフォーカス状態を監視
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchBox');
    if (searchInput) {
      searchInput.addEventListener('focus', () => { isInputFocused = true; });
      searchInput.addEventListener('blur', () => {
        isInputFocused = false;
        // フォーカスが外れたらvhを再計算
        setTimeout(setVh, 100); 
      });
    }
  });
})();