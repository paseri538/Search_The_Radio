let isInputFocused = false;

/**
 * ===================================================
 * ★★★ データと状態管理 ★★★
 * ===================================================
 */
let data = [];
let CUSTOM_READINGS = {};
let READING_TO_LABEL = {}; // 読み仮名から正規表記へのマップ
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
let kessokuWatasiData = {};
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
 * ★★★ 検索エンジン級アルゴリズム (God Tier) ★★★
 * ===================================================
 */

// 1. スーパーノーマライズ
function superNormalize(str) {
  if (!str) return "";
  return normalize(str)
    .replace(/[！-／：-＠［-｀｛-～、-〜”’・]/g, "") 
    .replace(/[!-/:-@[-`{-~]/g, "") 
    .replace(/\s+/g, "") 
    .replace(/ー/g, "")
    .replace(/[ぁぃぅぇぉっゃゅょゎ]/g, function(c) {
      var map = {'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ'};
      return map[c] || c;
    })
    .normalize('NFC');
}

// 2. 濁点無視用ノーマライズ
function baseCharNormalize(str) {
  return str.normalize('NFD').replace(/[\u3099\u309A]/g, '').normalize('NFC');
}

// 3. 高機能ローマ字変換
function kanaToRomaji(str) {
  const map = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
    'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
    'な':'na','ni':'ni','ぬ':'nu','ね':'ne','の':'no',
    'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
    'や':'ya','ゆ':'yu','よ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
    'わ':'wa','を':'o','ん':'n',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
    'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
    'きゃ':'kya','きゅ':'kyu','きょ':'kyo',
    'しゃ':'sha','しゅ':'shu','しょ':'sho',
    'ちゃ':'cha','ちゅ':'chu','ちょ':'cho',
    'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
    'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
    'みゃ':'mya','みゅ':'myu','みょ':'myo',
    'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
    'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
    'じゃ':'ja','じゅ':'ju','じょ':'jo',
    'びゃ':'bya','びゅ':'byu','びょ':'byo',
    'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
    'si':'shi', 'ti':'chi', 'tu':'tsu', 'hu':'fu', 'zi':'ji',
    'xtsu': 'tu'
  };
  
  let res = '';
  let i = 0;
  while (i < str.length) {
    if (i < str.length - 1) {
      const two = str.slice(i, i+2);
      if (map[two]) { res += map[two]; i += 2; continue; }
    }
    const one = str[i];
    if (one === 'つ' || one === 'っ') {
        if (i < str.length - 1) {
            const next = str[i+1];
            const nextRomaji = map[next] || kanaToRomaji(next);
            if (nextRomaji && nextRomaji.length > 0) {
                res += nextRomaji[0];
                i++;
                continue;
            }
        }
    }
    res += (map[one] || one);
    i++;
  }
  return res.replace(/si/g, 'shi').replace(/tu/g, 'tsu').replace(/zi/g, 'ji').replace(/hu/g, 'fu');
}

// 4. Jaro-Winkler距離
function jaroWinkler(s1, s2) {
  let m = 0;
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1 === s2) return 1;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      m++;
      break;
    }
  }

  if (m === 0) return 0;

  let k = 0;
  let t = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;

  let jaro = (m / s1.length + m / s2.length + (m - t) / m) / 3;
  let l = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) l++;
    else break;
  }
  return jaro + l * 0.1 * (1 - jaro);
}

// 5. Damerau-Levenshtein距離
function damerauLevenshtein(source, target) {
  if (!source) return target ? target.length : 0;
  if (!target) return source.length;
  const sourceLength = source.length;
  const targetLength = target.length;
  const score = Array(sourceLength + 2).fill(0).map(() => Array(targetLength + 2).fill(0));
  const INF = sourceLength + targetLength;
  score[0][0] = INF;
  for (let i = 0; i <= sourceLength; i++) { score[i + 1][1] = i; score[i + 1][0] = INF; }
  for (let j = 0; j <= targetLength; j++) { score[1][j + 1] = j; score[0][j + 1] = INF; }
  const sd = {};
  const combinedStr = source + target;
  for (let i = 0; i < combinedStr.length; i++) sd[combinedStr[i]] = 0;
  for (let i = 1; i <= sourceLength; i++) {
    let DB = 0;
    for (let j = 1; j <= targetLength; j++) {
      const i1 = sd[target[j - 1]];
      const j1 = DB;
      if (source[i - 1] === target[j - 1]) {
        score[i + 1][j + 1] = score[i][j];
        DB = j;
      } else {
        score[i + 1][j + 1] = Math.min(score[i][j], Math.min(score[i + 1][j], score[i][j + 1])) + 1;
      }
      score[i + 1][j + 1] = Math.min(score[i + 1][j + 1], score[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1));
    }
    sd[source[i - 1]] = i;
  }
  return score[sourceLength + 1][targetLength + 1];
}

// 6. ダイス係数 & ユニグラム
function getBigrams(str) {
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.slice(i, i + 2));
  }
  return bigrams;
}
function diceCoefficient(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;
  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;
  bg1.forEach(key => { if (bg2.has(key)) intersection++; });
  return (2 * intersection) / (bg1.size + bg2.size);
}
function unigramSimilarity(s1, s2) {
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  let intersection = 0;
  set1.forEach(char => { if(set2.has(char)) intersection++; });
  return (2 * intersection) / (set1.size + set2.size);
}

// 7. サブシーケンス判定
function getSubsequenceScore(query, target) {
  if (!query || !target) return 0;
  if (query[0] !== target[0]) return 0; 
  let qIdx = 0;
  let tIdx = 0;
  let consecutive = 0; 
  let totalBonus = 0; 
  while (qIdx < query.length && tIdx < target.length) {
    if (query[qIdx] === target[tIdx]) {
      qIdx++;
      consecutive++;
      if (consecutive > 1) totalBonus += 10; 
    } else {
      consecutive = 0;
    }
    tIdx++;
  }
  if (qIdx === query.length) {
    const ratio = query.length / target.length;
    return (50 + totalBonus) * ratio; 
  }
  return 0;
}

// ★修正: findDidYouMean (複数候補、部分一致、エイリアス解決対応、完全一致除外版)
function findDidYouMean(query) {
  if (!query || query.length < 2) return [];
  
  const normQuery = superNormalize(query);
  
  if (window.exactKeyNorms && window.exactKeyNorms.has(normQuery)) {
      return [];
  }

  const romanQuery = normalize(query).replace(/[^a-z]/g, ''); 
  const isRomajiInput = (romanQuery.length === normalize(query).length) && (romanQuery.length > 2);
  const baseQuery = baseCharNormalize(normQuery);

  if (!window.searchCorpus) return [];

  const candidatesMap = new Map();

  for (const word of window.searchCorpus) {
    const normTarget = superNormalize(word);
    const baseTarget = baseCharNormalize(normTarget);

    let finalScore = 0;

    const jwScore = jaroWinkler(normQuery, normTarget) * 100;
    const dist = damerauLevenshtein(normQuery, normTarget);
    const len = Math.max(normQuery.length, normTarget.length);
    const dlScore = Math.max(0, (1 - dist / len) * 100);
    const subScore = getSubsequenceScore(normQuery, normTarget);
    const uniScore = unigramSimilarity(normQuery, normTarget) * 100;

    let baseScore = 0;
    if (baseQuery === baseTarget && baseQuery.length > 1) {
        baseScore = 95;
    } else {
        const baseDist = damerauLevenshtein(baseQuery, baseTarget);
        baseScore = Math.max(0, (1 - baseDist / len) * 100);
    }

    finalScore = Math.max(jwScore, dlScore, subScore, uniScore, baseScore);

    if (isRomajiInput) {
       const romanTarget = kanaToRomaji(normTarget);
       const romanJw = jaroWinkler(romanQuery, romanTarget) * 100;
       if (romanJw > 85) finalScore = Math.max(finalScore, romanJw); 
    }

    const isSubstring = (normQuery.length >= 2 && normTarget.includes(normQuery)) || (normTarget.length >= 2 && normQuery.includes(normTarget));

    if (isSubstring) {
      finalScore = Math.max(finalScore, 98);
    } else {
      const lengthDiff = Math.abs(normQuery.length - normTarget.length);
      if (lengthDiff > 5) finalScore -= 20; 
      else if (lengthDiff > 3) finalScore -= 10;
    }

    if (finalScore > 80) {
       let labels = [];
       if (window.canonicalMap && window.canonicalMap[word]) {
           labels = Array.from(window.canonicalMap[word]);
       } else if (READING_TO_LABEL[word]) {
           labels = [READING_TO_LABEL[word]];
       } else {
           labels = [word];
       }

       labels.forEach(label => {
           if (superNormalize(label) === normQuery) return;
           const currentScore = candidatesMap.get(label) || 0;
           if (finalScore > currentScore) {
               candidatesMap.set(label, finalScore);
           }
       });
    }
  }

  return Array.from(candidatesMap.entries())
    .sort((a, b) => b[1] - a[1]) 
    .slice(0, 100) 
    .map(entry => entry[0]);
}


/**
 * ===================================================
 * ★★★ データ読み込みとアプリケーション初期化 ★★★
 * ===================================================
 */
async function loadExternalData() {
  try {
    const [episodesRes, readingsRes, keywordsRes, luckyButtonRes, historyRes, kwRes] = await Promise.all([
      fetch('episodes.json'),
      fetch('readings.json'),
      fetch('keywords.json'),
      fetch('lucky-button.json'),
      fetch('history.json'),
      fetch('kessokuband_watasi.json')
    ]);
    const episodesData = await episodesRes.json();
    const readingsData = await readingsRes.json();
    const keywordsData = await keywordsRes.json();
    luckyButtonData = await luckyButtonRes.json();
    historyData = await historyRes.json();
    kessokuWatasiData = await kwRes.json();

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

    window.searchCorpus = new Set();
    window.canonicalMap = {}; 
    window.exactKeyNorms = new Set(); 
    
    const addToCorpus = (word, label) => {
      if(!word) return;
      const norm = normalize(word);
      window.searchCorpus.add(norm);
      const roman = kanaToRomaji(norm);
      if (roman && roman !== norm) window.searchCorpus.add(roman);

      if (label) {
        if (!window.canonicalMap[norm]) {
            window.canonicalMap[norm] = new Set();
        }
        window.canonicalMap[norm].add(label);

        if (roman) {
            if (!window.canonicalMap[roman]) {
                window.canonicalMap[roman] = new Set();
            }
            window.canonicalMap[roman].add(label);
        }
      }
    };

    for (const [key, values] of Object.entries(CUSTOM_READINGS)) {
      addToCorpus(key, key); 
      values.forEach(v => addToCorpus(v, key)); 
      window.exactKeyNorms.add(superNormalize(key));
    }
    
    data.forEach(ep => {
      if (Array.isArray(ep.guest)) {
        ep.guest.forEach(g => addToCorpus(g, g));
      } else if (ep.guest && ep.guest !== "その他") {
        addToCorpus(ep.guest, ep.guest);
      }
      if (Array.isArray(ep.keywords)) {
        ep.keywords.forEach(k => {
          const cleanK = stripTimeSuffix(k);
          addToCorpus(cleanK, cleanK);
        });
      }
    });

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

      const linkJpg = document.createElement('link');
      linkJpg.rel = 'preload';
      linkJpg.as = 'image';
      linkJpg.href = `thumbnails/${episodeFilename}.jpg`;
      head.appendChild(linkJpg);
    });
  } catch (e) {
    console.error('Thumbnail preload error:', e);
  }
}

/**
 * ===================================================
 * ★★★ 検索とフィルタリング (コアロジック分離) ★★★
 * ===================================================
 */

function getFilteredData(query) {
  let res = [...data];
  
  const raw = query ? query.trim() : "";
  const normalizedRaw = normalize(raw);
  
  const isOtherFilterActive = selectedOthers.length > 0;
  const isOtherKeywordSearch = (normalizedRaw === "そのた" || normalizedRaw === "その他");
  if (!isOtherFilterActive && !isOtherKeywordSearch) {
    res = res.filter(it => getEpisodeNumber(it.episode) >= -1);
  }

  if (normalize(raw).includes('いいね')) {
    rainGoodMarks();
  }

  const rangeMatch = raw.match(/^(\d+)\s+(\d+)$/);
  if (rangeMatch) {
    let num1 = parseInt(rangeMatch[1], 10);
    let num2 = parseInt(rangeMatch[2], 10);
    const minNum = Math.min(num1, num2);
    const maxNum = Math.max(num1, num2);
    res = res.filter(it => {
      const epNum = getEpisodeNumber(it.episode);
      return epNum >= minNum && epNum <= maxNum;
    });
  } else if (raw.length > 0) {
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

  return res;
}

// ★修正: search関数
function search(opts = {}) {
  isSearchTriggered = true;
  if (typeof clearAutocompleteSuggestions === 'function') clearAutocompleteSuggestions();
  setTimeout(() => { isSearchTriggered = false; }, 100);

  const searchBox = document.getElementById("searchBox");
  const sortSelect = document.getElementById("sortSelect");
  const rawQuery = searchBox ? searchBox.value.trim() : "";
  const sort = sortSelect ? sortSelect.value : "newest";

  let res = getFilteredData(rawQuery);
  let suggestionWords = [];

  if (rawQuery.length > 0) {
     const suggestions = findDidYouMean(rawQuery);
     
     if (suggestions.length > 0) {
       const validSuggestions = suggestions.filter(word => getFilteredData(word).length > 0);

       if (validSuggestions.length > 0) {
         if (res.length === 0) {
           res = getFilteredData(validSuggestions[0]);
           suggestionWords = validSuggestions;
         } else {
           suggestionWords = validSuggestions;
         }
       }
     }
  }

  const parseDate = (dateStr) => new Date((dateStr || '').replace(/\./g, '-'));
  if (sort === "newest") res.sort((a, b) => parseDate(b.date) - parseDate(a.date) || getEpisodeNumber(b.episode) - getEpisodeNumber(a.episode));
  else if (sort === "oldest") res.sort((a, b) => parseDate(a.date) - parseDate(b.date) || getEpisodeNumber(a.episode) - getEpisodeNumber(b.episode));
  else if (sort === "longest" || sort === "shortest") {
    const toSec = s => (s || "0:0").split(":").map(Number).reduce((acc, time) => 60 * acc + time, 0);
    res.sort((a, b) => sort === "longest" ? toSec(b.duration) - toSec(a.duration) : toSec(a.duration) - toSec(b.duration));
  }

  lastResults = res;
  
  const countEl = document.getElementById('fixedResultsCount');
  countEl.innerHTML = `表示数：<span class="impact-number">${res.length}</span>件`;

  currentPage = opts.gotoPage || 1;
  if (!isRestoringURL) buildURLFromState({ method: 'push' });

  renderResults(res, currentPage, rawQuery, suggestionWords);
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

  if (typeof window.toggleFilterDrawer === 'function') {
    window.toggleFilterDrawer(false);
  }
  document.getElementById('mainResetBtn')?.blur();
}


/* =================================================== */
/* ★★★ 新規: 検索条件を残したままトップへ戻る ★★★ */
/* =================================================== */
function exitFavoritesMode() {
  // お気に入りフラグだけを下ろす
  showFavoritesOnly = false;
  document.body.classList.remove('fav-only');
  
  // お気に入りトグルボタンの見た目を戻す
  const favBtn = document.getElementById("favOnlyToggleBtn");
  if (favBtn) {
    favBtn.classList.remove("active");
    favBtn.setAttribute("aria-pressed", "false");
  }
  
  // 検索条件（キーワードや絞り込み）は消さずに再検索を実行
  search();
  
  // 画面トップへスクロール
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }
}

/**
 * ===================================================
 * ★★★ UIレンダリングと更新 ★★★
 * ===================================================
 */

function formatYearButtons() {
  document.querySelectorAll('.btn-year').forEach(button => {
    const year = button.dataset.year;
    if (year) {
      button.innerHTML = `<span class="impact-number">${year}</span>`;
    }
  });
}

// ★修正: renderResults (もっと見る機能 + 自動フォント調整)
function renderResults(arr, page = 1, originalQuery = null, suggestions = []) {
  const ul = document.getElementById("results");
  ul.innerHTML = "";

  if (showFavoritesOnly) {
    const liFav = document.createElement('li');
    liFav.className = 'favorites-title-header';
    liFav.style.gridColumn = "1 / -1";
    
    // ★タイトルとボタンをセットで表示
    liFav.innerHTML = `
      <div class="favorites-header-layout">
        <div class="favorites-title-inner">
          <span>★お気に入り★</span>
        </div>
        <button id="favGoHomeBtn" class="fav-home-btn">
          <i class="fa-solid fa-rotate-left"></i> トップへ戻る
        </button>
      </div>
    `;
    ul.appendChild(liFav);
  }

  if (suggestions && suggestions.length > 0 && originalQuery) {
    const li = document.createElement('li');
    li.className = 'did-you-mean-alert'; 
    li.style.gridColumn = "1 / -1"; 

    const limit = 5; 
    const showAll = suggestions.length <= limit;
    const firstBatch = suggestions.slice(0, limit);
    const hiddenBatch = suggestions.slice(limit);

    // ボタン生成用ヘルパー
    // ★修正: 初期状態を opacity: 0 (透明) に設定して、調整前のガタつきを隠す
    const createBtn = (word) => `
      <button class="dym-word-btn" style="margin: 4px; opacity: 0;" onclick="document.getElementById('searchBox').value='${word}'; search(); scrollToResultsTop();">
        ${word}
      </button>
    `;

    // 最初のボタンたち
    let buttonsHtml = firstBatch.map(createBtn).join('');

    // 隠れている分がある場合の「もっと見る」ボタンと隠しエリア
    if (!showAll) {
      // 「もっと見る」ボタン自体は調整不要なので opacity: 1 でOK（またはクラス指定に従う）
      buttonsHtml += `
        <button id="dymShowMoreBtn" class="dym-word-btn" style="margin: 4px; background: transparent; border: 1px dashed currentColor; opacity: 0.8;" onclick="document.getElementById('dymHiddenArea').style.display='inline'; this.style.display='none'; fitDymButtons();">
          <i class="fa-solid fa-plus"></i> 他${hiddenBatch.length}件
        </button>
        <span id="dymHiddenArea" style="display:none;">
          ${hiddenBatch.map(createBtn).join('')}
        </span>
      `;
    }

    li.innerHTML = `
      <div class="dym-alert-content">
        <div class="dym-alert-main">
          <span class="dym-prefix"><i class="fa-regular fa-lightbulb"></i> もしかして：</span>
          <div style="display:inline-block; text-align: center;">
            ${buttonsHtml}
          </div>
        </div>
      </div>
    `;
    ul.appendChild(li);
  }

  if (!arr || arr.length === 0) {
    let html = '<li class="no-results"><div class="no-results-content"><div class="no-results-icon"><i class="fa-solid fa-circle-exclamation"></i>一致する回が見つかりませんでした。</div>';
    html += '</div></li>';
    ul.innerHTML += html; // append to existing header (if any)
    return;
  }

  // 4. 結果リストの描画
  const startIdx = (page - 1) * pageSize;
  const endIdx = page * pageSize;
  
  // ★修正: ユーザーの入力(userQuery)とサジェスト(suggestionQuery)を分けて取得
  const userQuery = document.getElementById('searchBox').value.trim();
  const suggestionQuery = (suggestions.length > 0) ? suggestions[0] : null;

  // コーナー判定などにはサジェストがあればそちらを使う（既存ロジック維持）
  const highlightQuery = suggestionQuery || userQuery;
  
  const cornerTarget = selectedCorners.length === 1 ? selectedCorners[0] : null;

  const isLuckyButtonSearch = (normalize(highlightQuery) === "らっきーぼたん" || selectedCorners.includes("ラッキーボタン"));
  const isKessokuWatasiSearch = selectedCorners.includes("結束バンドと私") || normalize(highlightQuery) === normalize("結束バンドと私");

  const fragment = document.createDocumentFragment();

  arr.slice(startIdx, endIdx).forEach((it, index) => {
    const videoId = getVideoId(it.link);
    const episodeFilename = it.episode;
    const thumbBaseUrl = `thumbnails/${episodeFilename}`;
    const thumbUrlJpg = `${thumbBaseUrl}.jpg`;

    const hashOnly = getHashNumber(it.title);

    // ★修正: まずユーザーの入力そのものでタイムスタンプを探す
    let hit = findHitTime(it, userQuery);

    // ★修正: ヒットせず、もしサジェストがあるなら、そちらでも探す
    if (!hit && suggestionQuery) {
      hit = findHitTime(it, suggestionQuery);
    }
    if (!hit && selectedGuests.length > 0) {
        for(const guest of selectedGuests) {
            if (guest === "結束バンド" || guest === "その他") {
                continue;
            }
            hit = findHitTime(it, guest);
            if(hit) break;
        }
    }
    if (!hit && cornerTarget) {
      hit = findHitTime(it, cornerTarget);
    }
    const finalLink = hit ? withTimeParam(it.link, hit.seconds) : it.link;

    let guestText = "";
    if (it.episode.startsWith("京まふ大作戦") || it.episode === "CENTRALSTATION") {
      const guestList = Array.isArray(it.guest) ? it.guest : [it.guest].filter(Boolean);
      const membersSet = new Set(["青山吉能", ...guestList]);
      const members = [...membersSet];
      guestText = "出演：" + members.join("、");
    }
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

    else if (isKessokuWatasiSearch) {
      const episodeKey = it.episode === "02" && it.title.includes("京まふ") ? "京まふ" : it.episode;
      // データがあれば書き換え、なければ元のまま
      if (kessokuWatasiData[episodeKey]) {
        guestText = kessokuWatasiData[episodeKey];
      }
    }

    const li = document.createElement('li');
    li.className = 'episode-item';
    li.setAttribute('role', 'link');
    li.tabIndex = 0;
    li.style.setProperty('--i', index.toString());

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
    
    if (isFavorite(videoId)) {
      const favBtn = li.querySelector('.fav-btn');
      li.classList.add('is-fav');
      favBtn.classList.add('active');
      favBtn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
    }
    fragment.appendChild(li);
  });

  ul.appendChild(fragment);

  // ★修正: 描画後にボタンのサイズ調整を行う
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        fitGuestLines();
        fitDymButtons(); // ボタンサイズ調整を実行
    });
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

// ... (中略: updateActiveFilters, updateFilterButtonStyles などは変更なし) ...

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

function fitGuestLines() {
  const guestLines = document.querySelectorAll('.guest-one-line');
  let needsRetry = false;

  guestLines.forEach(line => {
    line.style.fontSize = '';
    line.style.whiteSpace = 'normal';
    
    const parent = line.parentElement;
    if (!parent) {
      line.style.visibility = 'visible';
      return;
    }

    const parentWidth = parent.clientWidth;
    
    if (parentWidth <= 100) {
      needsRetry = true;
      return;
    }

    line.style.whiteSpace = 'nowrap';
    const currentWidth = line.scrollWidth;
    
    const MIN_FONT_SIZE = 9;

    if (currentWidth > parentWidth) {
      const originalSize = parseFloat(window.getComputedStyle(line).fontSize);
      let newSize = (parentWidth / currentWidth) * originalSize;

      const finalSize = Math.max(newSize, MIN_FONT_SIZE);
      line.style.fontSize = finalSize + 'px';

      if (finalSize === MIN_FONT_SIZE && line.scrollWidth > parentWidth) {
        line.classList.add('needs-ellipsis');
      } else {
        line.classList.remove('needs-ellipsis');
      }

    } else {
      line.classList.remove('needs-ellipsis');
    }
    
    line.style.visibility = 'visible';
  });

  if (needsRetry) {
    setTimeout(fitGuestLines, 100);
  }
}

// ★修正: もしかしてボタンのサイズ調整関数 (透明化解除付き)
function fitDymButtons() {
  const buttons = document.querySelectorAll('.dym-word-btn');
  
  buttons.forEach(btn => {
    // もし「もっと見る」ボタンなど、すでに表示済みのものや特殊なボタンならスキップ
    if (btn.id === 'dymShowMoreBtn') return;

    // 1. スタイルをリセットして計測準備
    btn.style.fontSize = '';
    btn.style.whiteSpace = 'nowrap';
    btn.style.lineHeight = '';
    btn.style.wordBreak = '';
    btn.style.borderRadius = '99px'; 

    // 2. 計測: 中身(scrollWidth)が枠(clientWidth)より大きいか？
    if (btn.scrollWidth > btn.clientWidth) {
      
      const currentSize = parseFloat(window.getComputedStyle(btn).fontSize);
      // 比率計算
      let newSize = currentSize * (btn.clientWidth / btn.scrollWidth) * 0.95;
      const MIN_SIZE = 11; 

      if (newSize >= MIN_SIZE) {
        // A. フォント縮小だけで収まる場合
        btn.style.fontSize = `${newSize}px`;
      } else {
        // B. 縮小しても無理な場合 -> 改行モード
        btn.style.fontSize = '12px'; 
        btn.style.whiteSpace = 'normal'; 
        btn.style.lineHeight = '1.3';    
        btn.style.wordBreak = 'break-word'; 
        btn.style.overflowWrap = 'anywhere'; 
        
        btn.style.borderRadius = '12px'; 
        btn.style.padding = '6px 12px';
        btn.style.textAlign = 'center';
      }
    }

    // ★追加: 調整が終わったら不透明にして表示する
    btn.style.opacity = '1';
  });
}

function updatePlaylistButtonVisibility() {
    const btn = document.getElementById('createPlaylistBtn');
    if (btn) {
        const shouldShow = (lastResults && lastResults.length > 0);
        btn.hidden = !shouldShow;
    }
}

function createPlaylist() {
    if (!lastResults || lastResults.length === 0) {
        alert('再生リストを作成するには、表示結果が1件以上必要です。');
        return;
    }
    const videoIds = lastResults.map(item => getVideoId(item.link)).filter(Boolean);
    if (videoIds.length === 0) {
        alert('有効な動画IDが見つかりませんでした。');
        return;
    }

    const appUrl = `youtube://watch_videos?video_ids=${videoIds.join(',')}`;
    const webUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;

    let timer;
    let appLaunched = false;

    const visibilityChangeHandler = () => {
        if (document.visibilityState === 'hidden') {
            appLaunched = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', visibilityChangeHandler);
        }
    };

    document.addEventListener('visibilitychange', visibilityChangeHandler);

    const a_app = document.createElement('a');
    a_app.href = appUrl;
    a_app.style.display = 'none';
    document.body.appendChild(a_app);
    a_app.click();
    document.body.removeChild(a_app);

    timer = setTimeout(() => {
        document.removeEventListener('visibilitychange', visibilityChangeHandler);
        if (!appLaunched) {
            const a_web = document.createElement('a');
            a_web.href = webUrl;
            a_web.target = '_blank';
            a_web.rel = 'noopener noreferrer';
            a_web.style.display = 'none';
            document.body.appendChild(a_web);
            a_web.click();
            document.body.removeChild(a_web);
        }
    }, 100);
}

// ... (後略: URL状態管理、イベントリスナーなどは変更なし) ...

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

function scrollToResultsTop() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
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

    if (pick && pick.link) {
      const a = document.createElement('a');
      a.href = pick.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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

    const homeBtn = e.target.closest('#favGoHomeBtn');
  if (homeBtn) {
    // ★変更: resetSearch() ではなく exitFavoritesMode() を呼ぶ
    exitFavoritesMode(); 
  }

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

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        fitGuestLines();
        fitDymButtons(); // ★リサイズ時も調整を実行
    }, 150);
  }, { passive: true });

  document.getElementById('sortSelect').addEventListener('change', () => {
    search();
    scrollToResultsTop();
  });

  const searchBoxForClear = document.getElementById('searchBox');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  if (searchBoxForClear && clearSearchBtn) {
    const toggleClearBtn = () => {
      clearSearchBtn.hidden = !searchBoxForClear.value;
    };

    searchBoxForClear.addEventListener('input', toggleClearBtn);

    clearSearchBtn.addEventListener('click', () => {
      searchBoxForClear.value = '';
      toggleClearBtn();
      search();
      searchBoxForClear.focus();
    });

    toggleClearBtn();
  }

  const mainSearchBtn = document.getElementById('mainSearchBtn');
  if (mainSearchBtn) {
    mainSearchBtn.addEventListener('click', () => {
      search();
      scrollToResultsTop();
      mainSearchBtn.blur();
    });
  }
}

// ... (後略: その他のUI機能、テーマ設定、スクロールロック等は変更なし) ...

(function scrollLockModule() {
  let lockCount = 0;
  const htmlElement = document.documentElement;
  const stickyHeader = document.querySelector('.sticky-search-area');

  window.acquireBodyLock = () => {
    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - htmlElement.clientWidth;
      
      if (scrollbarWidth > 0 && stickyHeader) {
        stickyHeader.style.paddingRight = `${scrollbarWidth}px`;
      }
      htmlElement.classList.add('scroll-locked');
    }
    lockCount++;
  };

  window.releaseBodyLock = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      if (stickyHeader) {
        stickyHeader.style.paddingRight = '';
      }
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

  const observer = new MutationObserver(() => {
    const isActive = panel.classList.contains('show');
    toggleBtn.classList.toggle('is-active', isActive);
  });
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  
  toggleBtn.classList.toggle('is-active', panel.classList.contains('show'));

  applyTheme = (themeName) => {
    document.body.classList.remove(...allThemeClasses);
    if (themeName === 'dark') document.body.classList.add('dark-mode');
    else if (themeName && themeName !== 'light') document.body.classList.add(`theme-${themeName}`);
    panel.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    panel.querySelector(`.theme-btn[data-theme="${themeName}"]`)?.classList.add('active');
    try { localStorage.setItem(THEME_KEY, themeName); } catch (e) {}

    const isDarkStyleStatusBar = ['dark', 'pink', 'blue', 'red', 'green'].includes(themeName);
    const statusBar = document.getElementById('status-bar-style');
    const themeColorMeta = document.getElementById('theme-color-meta');
    
    if (statusBar) {
      statusBar.content = isDarkStyleStatusBar ? 'black-translucent' : 'default';
    }

    if (themeColorMeta) {
      let color = '#f9fafe';
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

      if (bodyBg) {
        earlyStyle.textContent = 'html, body, #loading-screen { background-color: ' + bodyBg + ' !important; }';
      } else {
        earlyStyle.textContent = '';
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

        const openModal = () => {
            if (modal.classList.contains('show') || modal.classList.contains('closing')) return;

            modal.classList.remove('show');
            modal.classList.remove('closing');
            void modal.offsetWidth;

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
        
            const finishClose = () => {
                if (isClosed) return;
                isClosed = true;
        
                modal.hidden = true;
                modal.classList.remove('closing');
                modal.removeEventListener('animationend', onAnimationEnd);
                
                window.releaseBodyLock();
            };
        
            const onAnimationEnd = (e) => {
                if (e.target === modal) {
                    finishClose();
                }
            };
        
            modal.addEventListener('animationend', onAnimationEnd);
            setTimeout(finishClose, 300);
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

// Global function for "Did You Mean"
window.applyDidYouMean = function(word) {
  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.value = word;
    search();
    scrollToResultsTop();
  }
};

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

    // load（画像全読み込み）を待たずに、DOM構築後すぐに調整を開始する
    const activateButtons = () => {
        const runFit = () => sizerModule.fitAll();
        
        // 念のため数回リトライしてサイズを合わせる
        runFit();
        setTimeout(runFit, 100);
        setTimeout(runFit, 300);
        
        // ボタンを表示状態にするクラスを付与
        // 少しだけ待つのは、フォント読み込みによるガタつきを一瞬隠すため
        setTimeout(() => {
            document.body.classList.add('buttons-ready');
            // 表示後にもう一度だけ念押しの調整
            setTimeout(runFit, 200); 
        }, 100); 
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activateButtons);
    } else {
        activateButtons();
    }
    
    // 念のため window.load でも再調整だけ走らせる（表示はすでにされている）
    window.addEventListener('load', () => {
        sizerModule.fitAll();
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
    
    const episodeQuery = raw.replace('#', '').trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    if (/^\d+$/.test(episodeQuery)) {
      const episodeNumber = parseInt(episodeQuery, 10);
      const targetEpisode = data.find(ep => parseInt(ep.episode, 10) === episodeNumber);

      if (targetEpisode && targetEpisode.keywords && targetEpisode.keywords.length > 0) {
        const guestKeywordsToExclude = new Set();
        const mainGuests = Object.keys(guestColorMap);
        mainGuests.forEach(guestName => {
            guestKeywordsToExclude.add(guestName);
            if (CUSTOM_READINGS[guestName]) {
                CUSTOM_READINGS[guestName].forEach(alias => guestKeywordsToExclude.add(alias));
            }
        });

        const episodeGuests = Array.isArray(targetEpisode.guest) ? targetEpisode.guest : [targetEpisode.guest];
        episodeGuests.forEach(guestName => {
            if (guestName) {
                guestKeywordsToExclude.add(guestName);
                if (CUSTOM_READINGS[guestName]) {
                    CUSTOM_READINGS[guestName].forEach(alias => guestKeywordsToExclude.add(alias));
                }
            }
        });

        const filteredKeywords = targetEpisode.keywords.filter(kw => {
          const cleanKeyword = stripTimeSuffix(kw).trim();
          return !guestKeywordsToExclude.has(cleanKeyword);
        });

        const keywordsAsEntries = filteredKeywords.map(kw => ({
          label: stripTimeSuffix(kw),
          type: `第${targetEpisode.episode}回`
        }));
        
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
  
  const debouncedOnInput = debounce(onInput, 150);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.isComposing) {
        return;
      }
      e.preventDefault();
      
      if (!boxEl.hidden && cursor >= 0) {
        pick(cursor);
      } else {
        debouncedOnInput.cancel();
        clear();
        search();
        scrollToResultsTop();
      }
      return;
    }

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

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  document.documentElement.classList.remove('dark-preload');
  document.getElementById("early-dark-style")?.remove();
  
  window.addEventListener('load', updateHeaderOffset);
  window.addEventListener('resize', () => setTimeout(updateHeaderOffset, 50));
  new MutationObserver(updateHeaderOffset).observe(document.querySelector('.sticky-search-area'), { childList: true, subtree: true, attributes: true });
});

(function enhanceMobileExperience() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
    document.addEventListener('DOMContentLoaded', setupPwaBottomNav);
  }

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

  function setupPwaBottomNav() {
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'pwa-bottom-nav';
    bottomNav.id = 'pwa-bottom-nav';

    const buttonConfig = [
      { id: 'filterToggleBtn', label: 'フィルタ', icon: 'fa-solid fa-filter' },
      { id: 'favOnlyToggleBtn', label: 'お気に入り', icon: 'fa-solid fa-star' },
      { id: 'theme-toggle-btn', label: 'カラー', icon: 'fa-solid fa-palette' },
      { id: 'randomBtn', label: 'ランダム', icon: 'fa-solid fa-shuffle' },
      { id: 'mainResetBtn', label: 'リセット', icon: 'fa-solid fa-rotate-left' }
    ];

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

      newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        originalButton.click();
      });

      if (config.id === 'filterToggleBtn' || config.id === 'favOnlyToggleBtn' || config.id === 'mainResetBtn') {
        const observer = new MutationObserver(() => {
          const isPressed = originalButton.getAttribute('aria-pressed') === 'true';
          const isExpanded = originalButton.getAttribute('aria-expanded') === 'true';
          newButton.classList.toggle('is-active', isPressed || isExpanded);
        });
        observer.observe(originalButton, { attributes: true, attributeFilter: ['aria-pressed', 'aria-expanded'] });
        
        const isPressed = originalButton.getAttribute('aria-pressed') === 'true';
        const isExpanded = originalButton.getAttribute('aria-expanded') === 'true';
        newButton.classList.toggle('is-active', isPressed || isExpanded);
      
      } else if (config.id === 'theme-toggle-btn') {
        const themePanel = document.getElementById('floating-theme-panel');
        if (themePanel) {
          const observer = new MutationObserver(() => {
            const isActive = themePanel.classList.contains('show');
            newButton.classList.toggle('is-active', isActive);
          });
          observer.observe(themePanel, { attributes: true, attributeFilter: ['class'] });
          newButton.classList.toggle('is-active', themePanel.classList.contains('show'));
        }
      }

      bottomNav.appendChild(newButton);
    });

    if (bottomNav.hasChildNodes()) {
      document.body.appendChild(bottomNav);
    }
  }
})();