let isInputFocused = false;


/**
 * ===================================================
 * ★★★ Mobile visual viewport variables ★★★
 * ===================================================
 * iPhone Safari のコンパクトタブ/下部アドレスバー表示時は、CSS の 100vh / 100dvh と
 * 実際に見えている VisualViewport がズレることがあるため、モーダル用の高さを JS から同期する。
 */
(function setupMobileVisualViewportVars() {
  const root = document.documentElement;
  let rafId = 0;

  const setPx = (name, value) => {
    const n = Number(value);
    root.style.setProperty(name, `${Math.max(0, Number.isFinite(n) ? n : 0)}px`);
  };

  const syncFavoriteSceneModalRows = (height) => {
    const modal = document.getElementById('favSceneModal');
    if (!modal) return;

    // CSSの @media(max-height) は iPhone Safari のコンパクトタブ時に
    // 実際の表示領域(VisualViewport)より大きいレイアウト高を参照することがある。
    // そのため、表示できるタイムスタンプ行数は JS 側で VisualViewport 基準に上書きする。
    const h = Math.max(0, Number(height) || 0);
    const rows = h <= 540 ? 2 : h <= 620 ? 3 : h <= 680 ? 4 : h <= 800 ? 5 : 7;
    modal.style.setProperty('--fav-scene-visible-rows-final', String(rows));
    modal.style.setProperty('--fav-scene-vv-height', `${Math.floor(h)}px`);
  };

  const update = () => {
    rafId = 0;
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    const width = vv ? vv.width : window.innerWidth;
    setPx('--app-vv-height', height);
    setPx('--app-vv-width', width);
    setPx('--app-vv-offset-top', vv ? vv.offsetTop : 0);
    setPx('--app-vv-offset-left', vv ? vv.offsetLeft : 0);
    syncFavoriteSceneModalRows(height);
  };

  const requestUpdate = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(requestUpdate, 80), { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', requestUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', requestUpdate, { passive: true });
  }
})();


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
let linksData = {}; // ★追加：リンクデータの格納先

const FAV_KEY = 'str_favs_v1';
const FAV_SCENES_KEY = 'str_fav_scenes_v1';
let favorites = loadFavs();
let favoriteScenes = loadFavoriteScenes();
let pendingFavoriteEpisode = null;
let showFavoritesOnly = false;
let isRestoringURL = false;
let postRenderFitRaf = 0;
let fitGuestLinesRetryTimer = 0;
let resetSearchRaf = 0;
let nextResultsAnimation = false;
let resultsAnimationCleanupTimer = 0;

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
function loadFavoriteScenes() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_SCENES_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}
function saveFavoriteScenes() {
  try { localStorage.setItem(FAV_SCENES_KEY, JSON.stringify(favoriteScenes)); }
  catch (e) { console.error('Failed to save favorite scenes:', e); }
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}
function parseTimestampInput(value) {
  const v = String(value || '').trim().replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
  if (!v) return null;
  if (/^\d+$/.test(v)) return Math.max(0, parseInt(v, 10));
  const parts = v.split(':').map(p => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.some(n => Number.isNaN(n)) || nums.slice(1).some(n => n > 59)) return null;
  return parts.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
}
function parseDurationToSeconds(value) {
  return parseTimestampInput(value);
}
function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
function fillSelectOptions(select, max, selectedValue) {
  if (!select) return;
  const safeMax = Math.max(0, Math.floor(Number(max) || 0));
  const selected = clampNumber(selectedValue, 0, safeMax);
  select.innerHTML = '';
  for (let i = 0; i <= safeMax; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i).padStart(2, '0');
    if (i === selected) option.selected = true;
    select.appendChild(option);
  }
}
function getFavoriteSceneEntry(videoId) {
  if (!videoId) return null;
  const entry = favoriteScenes[videoId];
  if (!entry || typeof entry !== 'object') return null;
  entry.timestamps = Array.isArray(entry.timestamps) ? entry.timestamps : [];
  return entry;
}

function hasFavoriteSceneTime(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function sortFavoriteScenesForDisplay(items = []) {
  return items.slice().sort((a, b) => {
    const ao = Number(a.order);
    const bo = Number(b.order);
    if (Number.isFinite(ao) && Number.isFinite(bo)) return ao - bo;
    if (Number.isFinite(ao) !== Number.isFinite(bo)) return Number.isFinite(ao) ? -1 : 1;

    const aHasTime = hasFavoriteSceneTime(a?.seconds);
    const bHasTime = hasFavoriteSceneTime(b?.seconds);
    if (aHasTime && bHasTime) return Number(a.seconds) - Number(b.seconds);
    if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
    const ac = a?.createdAt ? Date.parse(a.createdAt) : 0;
    const bc = b?.createdAt ? Date.parse(b.createdAt) : 0;
    return ac - bc;
  });
}


function getFavoriteSceneEntryForEpisode(item) {
  const videoId = getVideoId(item?.link);
  return videoId ? getFavoriteSceneEntry(videoId) : null;
}

// 一言メモ用の軽量読み仮名ヒント。
// 完全なAI読み取りではありませんが、よく使う言葉は辞書登録なしでも検索に拾いやすくします。
const MEMO_READING_HINTS = {
  '名言': ['めいげん', 'meigen'],
  '神': ['かみ', 'しん', 'kami'],
  '神回': ['かみかい', 'kamikai'],
  '神シーン': ['かみしーん', 'kamiscene'],
  '好き': ['すき', 'suki'],
  '一言': ['ひとこと', 'hitokoto'],
  '爆笑': ['ばくしょう', 'bakushou'],
  '面白い': ['おもしろい', 'omoshiroi'],
  '笑い': ['わらい', 'warai'],
  '泣ける': ['なける', 'nakeru'],
  '感動': ['かんどう', 'kandou'],
  '最高': ['さいこう', 'saikou'],
  'かわいい': ['可愛い', 'kawaii'],
  '可愛い': ['かわいい', 'kawaii'],
  'セリフ': ['台詞', 'せりふ', 'serifu'],
  '台詞': ['セリフ', 'せりふ', 'serifu'],
  '歌': ['うた', 'uta'],
  '曲': ['きょく', 'kyoku'],
  '告知': ['こくち', 'kokuchi'],
  '裏話': ['うらばなし', 'urabanashi'],
  '名シーン': ['めいしーん', 'meiscene'],
  'オチ': ['おち', 'ochi'],
  '伏線': ['ふくせん', 'fukusen'],
  '尊い': ['とうとい', 'toutoi']
};

function getMemoReadingHintValues(text) {
  const base = String(text || '');
  const normBase = normalize(base);
  const results = [];
  for (const [key, values] of Object.entries(MEMO_READING_HINTS)) {
    const normKey = normalize(key);
    const matched = base.includes(key) || (normKey && normBase.includes(normKey)) || values.some(v => normBase.includes(normalize(v)));
    if (matched) results.push(key, ...values);
  }
  return results;
}

function expandTextWithCustomReadings(text) {
  const base = String(text || '');
  if (!base) return '';
  const parts = [base, ...getMemoReadingHintValues(base)];
  try {
    const normBase = normalize(base);
    for (const [key, readings] of Object.entries(CUSTOM_READINGS || {})) {
      const values = Array.isArray(readings) ? readings : [];
      const normKey = normalize(key);
      const matched = normKey && (normBase.includes(normKey) || values.some(r => {
        const nr = normalize(r);
        return nr && normBase.includes(nr);
      }));
      if (matched) parts.push(key, ...values);
    }
  } catch (_) {}
  return parts.join(' ');
}

function buildSearchForms(value) {
  const expanded = expandTextWithCustomReadings(value);
  const forms = new Set();
  const add = (v) => {
    const raw = String(v || '').trim();
    if (!raw) return;
    const n = normalize(raw);
    const s = superNormalize(raw);
    const b = baseCharNormalize(s || n);
    [raw, n, s, b].filter(Boolean).forEach(x => forms.add(x));
    const roman = kanaToRomaji(n);
    if (roman && roman !== n) forms.add(roman);
  };
  add(value);
  add(expanded);
  String(expanded).split(/[\s、，。・/／|｜:：()（）［］【】「」『』!！?？]+/).forEach(add);
  return [...forms].filter(Boolean);
}

function buildFavoriteSceneSearchCandidates(scene, entry, item) {
  const chunks = [
    scene?.note || '',
    scene?.label || formatTimestamp(scene?.seconds),
    entry?.title || '',
    entry?.episode || '',
    item?.title || '',
    item?.episode || ''
  ];
  const candidates = new Set();
  chunks.forEach(chunk => buildSearchForms(chunk).forEach(v => candidates.add(v)));
  buildSearchForms(chunks.join(' ')).forEach(v => candidates.add(v));
  return [...candidates].filter(Boolean);
}

function buildFavoriteSceneSearchText(scene, entry, item) {
  return buildFavoriteSceneSearchCandidates(scene, entry, item).join(' ');
}

function looseSceneTextMatch(query, candidate) {
  const q = String(query || '').trim();
  const c = String(candidate || '').trim();
  if (!q || !c) return false;
  if (c.includes(q) || q.includes(c)) return true;
  if (q.length <= 1 || c.length <= 1) return false;

  const qb = baseCharNormalize(q);
  const cb = baseCharNormalize(c);
  if (qb && cb && (cb.includes(qb) || qb.includes(cb))) return true;

  // かな入力とローマ字入力の揺れを少し吸収
  const qr = kanaToRomaji(q);
  const cr = kanaToRomaji(c);
  if (qr && cr && qr !== q && cr !== c && (cr.includes(qr) || qr.includes(cr))) return true;

  // 短すぎる語は誤爆しやすいので、ゆるめ判定は3文字以上に限定
  if (Math.min(q.length, c.length) < 3) return false;

  const maxLen = Math.max(q.length, c.length);
  const dist = damerauLevenshtein(q, c);
  if (maxLen <= 5 && dist <= 1) return true;
  if (maxLen > 5 && dist <= 2) return true;

  const jw = jaroWinkler(q, c);
  if (jw >= 0.90) return true;

  const dice = diceCoefficient(q, c);
  if (dice >= 0.62) return true;

  return false;
}

function itemMatchesFavoriteSceneSearch(item, rawQuery, searchWords = []) {
  const entry = getFavoriteSceneEntryForEpisode(item);
  if (!entry || !Array.isArray(entry.timestamps) || entry.timestamps.length === 0) return false;
  const queryForms = new Set();
  buildSearchForms(rawQuery).forEach(v => queryForms.add(v));
  searchWords.forEach(w => buildSearchForms(w).forEach(v => queryForms.add(v)));
  if (queryForms.size === 0) return false;

  return entry.timestamps.some(scene => {
    const candidates = buildFavoriteSceneSearchCandidates(scene, entry, item);
    return candidates.some(candidate => [...queryForms].some(q => looseSceneTextMatch(q, candidate)));
  });
}

function findFavoriteSceneHitTime(item, rawQuery) {
  if (!rawQuery) return null;
  const entry = getFavoriteSceneEntryForEpisode(item);
  if (!entry || !Array.isArray(entry.timestamps) || entry.timestamps.length === 0) return null;

  const queryForms = buildSearchForms(rawQuery);
  const sorted = sortFavoriteScenesForDisplay(entry.timestamps).filter(scene => hasFavoriteSceneTime(scene.seconds));
  return sorted.find(scene => {
    const candidates = buildFavoriteSceneSearchCandidates(scene, entry, item);
    return candidates.some(candidate => queryForms.some(q => looseSceneTextMatch(q, candidate)));
  }) || null;
}
function syncFavoriteFromScenes(videoId) {
  if (!videoId) return;
  const entry = getFavoriteSceneEntry(videoId);
  if (entry && entry.timestamps.length > 0) favorites.add(videoId);
  saveFavs();
  saveFavoriteScenes();
}
function removeFavoriteCompletely(videoId) {
  if (!videoId) return;
  favorites.delete(videoId);
  delete favoriteScenes[videoId];
  saveFavs();
  saveFavoriteScenes();
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
    // ★追加: links.jsonの読み込みを追加 (無ければ空オブジェクト)
    const [episodesRes, readingsRes, keywordsRes, luckyButtonRes, historyRes, kwRes, linksRes] = await Promise.all([
      fetch('episodes.json'),
      fetch('readings.json'),
      fetch('keywords.json'),
      fetch('lucky-button.json'),
      fetch('history.json'),
      fetch('kessokuband_watasi.json'),
      // ★修正：ファイルがない場合（404エラーなど）でもサイト全体が壊れないように安全処理を追加
      fetch('links.json')
        .then(res => res.ok ? res : { json: () => ({}) })
        .catch(() => ({ json: () => ({}) }))
    ]);
    const episodesData = await episodesRes.json();
    const readingsData = await readingsRes.json();
    const keywordsData = await keywordsRes.json();
    luckyButtonData = await luckyButtonRes.json();
    historyData = await historyRes.json();
    kessokuWatasiData = await kwRes.json();
    linksData = await linksRes.json(); // ★変更

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

    const allChars = new Set();
    
    // エピソードデータから文字を抽出
    data.forEach(ep => {
      const text = (ep.title || '') + 
                   (Array.isArray(ep.guest) ? ep.guest.join('') : (ep.guest || '')) + 
                   (Array.isArray(ep.keywords) ? ep.keywords.join('') : '');
      for (const char of text) allChars.add(char);
    });
    
    // キーワードや読み仮名データから文字を抽出
    for (const key in CUSTOM_READINGS) {
      for (const char of key) allChars.add(char);
      CUSTOM_READINGS[key].forEach(v => {
        for (const char of v) allChars.add(char);
      });
    }

    // 抽出した全文字を結合
    const charStr = Array.from(allChars).join('');
    
    // 画面外に透明な要素として配置
    const hiddenFontDiv = document.createElement('div');
    hiddenFontDiv.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;font-family:fot-udkakugoc70-pro,fot-udkakugoc80-pro,sans-serif;';
    
    // 通常(400)と太字(700)の両方のウェイトを読み込ませる
    hiddenFontDiv.innerHTML = `
      <span style="font-weight:400">${charStr}</span>
      <span style="font-weight:700">${charStr}</span>
    `;
    document.body.appendChild(hiddenFontDiv);

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
    const preloadData = data.slice(0, 8); // 初期表示で必要な分だけ先読みし、全件preloadによる初期描画の重さを避ける

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
    res = res.filter(it => {
      const baseMatch = searchWords.some(word => it.searchText.includes(word));
      return baseMatch || itemMatchesFavoriteSceneSearch(it, raw, searchWords);
    });
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
  if (opts.animateResults === true || opts.animate === true) requestResultsCardAnimation();
  if (!isRestoringURL) buildURLFromState({ method: 'push' });

  renderResults(res, currentPage, rawQuery, suggestionWords);
  renderPagination(res.length);
  updateActiveFilters();
  updateFilterButtonStyles();
  updatePlaylistButtonVisibility();
}

function resetFilters({ runSearch = true } = {}) {
  selectedGuests = [];
  selectedCorners = [];
  selectedOthers = [];
  selectedYears = [];
  updateFilterButtonStyles();
  if (runSearch) search();
}

function resetSearch() {
  if (resetSearchRaf) return;
  resetSearchRaf = requestAnimationFrame(() => {
    resetSearchRaf = 0;
    resetSearchNow();
  });
}

function resetSearchNow() {
  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  const hadQuery = Boolean(searchBox && searchBox.value);
  const hadSort = Boolean(sortSelect && sortSelect.value !== "newest");
  const hadFilters = selectedGuests.length > 0 || selectedCorners.length > 0 || selectedOthers.length > 0 || selectedYears.length > 0;
  const hadFavOnly = showFavoritesOnly;
  const hadPage = currentPage !== 1;
  const shouldSearch = hadQuery || hadSort || hadFilters || hadFavOnly || hadPage;

  if (searchBox && hadQuery) {
    searchBox.value = "";
    searchBox.dispatchEvent(new Event('input'));
  } else {
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) clearSearchBtn.hidden = true;
    if (typeof clearAutocompleteSuggestions === 'function') clearAutocompleteSuggestions();
  }
  if (sortSelect) sortSelect.value = "newest";

  if (showFavoritesOnly) {
    // お気に入り一覧中の「リセット」は、お気に入り登録自体は消さず、
    // お気に入り一覧モードだけ解除する。
    showFavoritesOnly = false;
    document.body.classList.remove('fav-only');
    const favBtn = document.getElementById("favOnlyToggleBtn");
    if (favBtn) {
      favBtn.classList.remove("active");
      favBtn.setAttribute("aria-pressed", "false");
    }
  }

  resetFilters({ runSearch: false });
  currentPage = 1;
  if (shouldSearch) search({ gotoPage: 1, animateResults: true });
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
  search({ animateResults: true });
  
  // 画面トップへスクロール
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }
}

/**
 * ===================================================
 * ★★★ UIレンダリングと更新 ★★★
 * ===================================================
 */


function requestResultsCardAnimation() {
  nextResultsAnimation = true;
}

function applyResultsCardAnimationState(resultsEl, shouldAnimate) {
  if (!resultsEl) return;
  if (resultsAnimationCleanupTimer) {
    clearTimeout(resultsAnimationCleanupTimer);
    resultsAnimationCleanupTimer = 0;
  }

  resultsEl.classList.remove('results-fade-in');
  if (!shouldAnimate) return;

  // 一度クラスを外してから次フレームで付与し、連続検索/リセットでも確実に再生する。
  requestAnimationFrame(() => {
    if (!resultsEl.isConnected) return;
    resultsEl.classList.add('results-fade-in');
    resultsAnimationCleanupTimer = window.setTimeout(() => {
      resultsEl.classList.remove('results-fade-in');
      resultsAnimationCleanupTimer = 0;
    }, 760);
  });
}

function formatYearButtons() {
  document.querySelectorAll('.btn-year').forEach(button => {
    const year = button.dataset.year;
    if (year) {
      button.innerHTML = `<span class="impact-number">${year}</span>`;
    }
  });
}

function schedulePostRenderTextFit() {
  if (postRenderFitRaf) cancelAnimationFrame(postRenderFitRaf);
  if (fitGuestLinesRetryTimer) {
    clearTimeout(fitGuestLinesRetryTimer);
    fitGuestLinesRetryTimer = 0;
  }
  postRenderFitRaf = requestAnimationFrame(() => {
    postRenderFitRaf = requestAnimationFrame(() => {
      postRenderFitRaf = 0;
      fitGuestLines();
      fitDymButtons();
    });
  });
}

// ★修正: renderResults (もっと見る機能 + 自動フォント調整)
function renderResults(arr, page = 1, originalQuery = null, suggestions = []) {
  const ul = document.getElementById("results");
  const shouldAnimateResults = nextResultsAnimation === true;
  nextResultsAnimation = false;

  // v13: 結果カードのフェードインは、親クラスの後付けではなく
  // 新しく生成した各カードに class を直接付ける。
  // これにより、スマホSafari/PWAでも「描画後に見えてしまってからクラス追加」にならず、
  // 検索・リセット・フィルター更新直後に確実にアニメーションする。
  if (resultsAnimationCleanupTimer) {
    clearTimeout(resultsAnimationCleanupTimer);
    resultsAnimationCleanupTimer = 0;
  }
  ul.classList.remove('results-fade-in');
  ul.innerHTML = "";

  const markResultEnter = (el, delayIndex = 0) => {
    if (!shouldAnimateResults || !el) return;
    el.classList.add('result-card-enter');
    el.style.setProperty('--result-anim-delay', `${Math.min(Math.max(0, delayIndex) * 18, 140)}ms`);
  };

  const cleanupResultEnter = () => {
    if (!shouldAnimateResults) return;
    resultsAnimationCleanupTimer = window.setTimeout(() => {
      if (ul && ul.isConnected) {
        ul.querySelectorAll('.result-card-enter').forEach(el => el.classList.remove('result-card-enter'));
      }
      resultsAnimationCleanupTimer = 0;
    }, 720);
  };

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
    markResultEnter(li, 0);
    li.style.gridColumn = "1 / -1"; 

    const limit = 5; 
    const showAll = suggestions.length <= limit;
    const firstBatch = suggestions.slice(0, limit);
    const hiddenBatch = suggestions.slice(limit);

    // ボタン生成用ヘルパー
    // ★修正: 初期状態を opacity: 0 (透明) に設定して、調整前のガタつきを隠す
    const createBtn = (word) => `
      <button class="dym-word-btn" style="margin: 4px; opacity: 0;" onclick="document.getElementById('searchBox').value='${word}'; search({ animateResults: true }); scrollToResultsTop();">
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
    const li = document.createElement('li');
    li.className = 'no-results';
    markResultEnter(li, 0);
    li.innerHTML = '<div class="no-results-content"><div class="no-results-icon"><i class="fa-solid fa-circle-exclamation"></i>一致する回が見つかりませんでした。</div></div>';
    ul.appendChild(li);
    cleanupResultEnter();
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
    const sceneHit = findFavoriteSceneHitTime(it, userQuery) || (suggestionQuery ? findFavoriteSceneHitTime(it, suggestionQuery) : null);
    const displayTimestamp = hit || sceneHit || null;
    const finalHit = hit || sceneHit;
    const finalLink = finalHit ? withTimeParam(it.link, finalHit.seconds) : it.link;

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
    li.style.setProperty('--result-anim-delay', `${Math.min(index * 18, 140)}ms`);
    markResultEnter(li, index);

    let photoBtnHtml = '';
    let hasPhotoBtn = false; // ★追加: リンクボタンの有無を判定するフラグ
    if (linksData[it.episode] && linksData[it.episode].length > 0) {
      hasPhotoBtn = true;    // ★追加
      photoBtnHtml = `<button class="photo-btn" data-ep="${it.episode}" aria-label="関連リンク集" title="関連リンク集"><i class="fa-solid fa-link"></i></button>`;
    }

    li.innerHTML = `
  <a href="${finalLink}" target="_blank" rel="noopener" style="display:flex;text-decoration:none;color:inherit;align-items:center;min-width:0;">
    <div class="thumb-col">
      <img src="${thumbUrlJpg}" class="thumbnail" alt="サムネイル：${hashOnly}" 
           decoding="async" loading="${index < 4 ? 'eager' : 'lazy'}" fetchpriority="${index < 4 ? 'auto' : 'low'}" 
           onload="this.classList.add('loaded')"
           onerror="this.onerror=null; this.src='./thumb-fallback.svg'; this.classList.add('loaded');">
      ${displayTimestamp ? `<div class="ts-buttons"><button class="ts-btn" data-url="${it.link}" data-ts="${displayTimestamp.seconds}" aria-label="${escapeHtml(displayTimestamp.label || formatTimestamp(displayTimestamp.seconds))} から再生"><span class="impact-number">${escapeHtml(displayTimestamp.label || formatTimestamp(displayTimestamp.seconds))}</span></button></div>` : ''}
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
      <div class="episode-meta ${hasPhotoBtn ? 'has-photo-btn' : ''}">
        <div class="meta-one-line" style="visibility: hidden;">公開日時：<span class="impact-number">${it.date}</span></div>
        <div class="meta-one-line" style="visibility: hidden;">動画時間：${(it.duration ? `<span class="impact-number">${it.duration}</span>` : '?')}</div>
      </div>
    </div>
  </a>
  ${photoBtnHtml}
  <button class="fav-btn"
          data-id="${videoId}"
          data-title="${escapeHtml(hashOnly)}"
          data-episode="${escapeHtml(it.episode)}"
          data-link="${escapeHtml(it.link)}"
          data-duration="${escapeHtml(it.duration || '')}"
          data-date="${escapeHtml(it.date || '')}"
          data-guest="${escapeHtml(guestText || '')}"
          data-thumbnail="${escapeHtml(thumbUrlJpg)}"
          data-default-ts="${finalHit ? finalHit.seconds : 0}"
          aria-label="お気に入りシーンを作成"
          title="お気に入りシーンを作成"><i class="fa-regular fa-star"></i></button>
`;
    
    if (isFavorite(videoId)) {
      const favBtn = li.querySelector('.fav-btn');
      li.classList.add('is-fav');
      favBtn.classList.add('active');
      favBtn.setAttribute('aria-label', 'お気に入りシーンを開く');
      favBtn.setAttribute('title', 'お気に入りシーンを開く');
      favBtn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
    }
    fragment.appendChild(li);
  });

  ul.appendChild(fragment);
  cleanupResultEnter();

  // ★修正: 描画後にボタンのサイズ調整を行う
  schedulePostRenderTextFit();
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

function getFilterSelectedButtonColors() {
  const body = document.body;
  if (!body) {
    return { bg: '#000000', text: '#ffffff', border: '#000000', ring: 'rgba(0, 0, 0, 0.16)' };
  }

  if (body.classList.contains('dark-mode')) {
    return { bg: '#ffffff', text: '#22272e', border: '#ffffff', ring: 'rgba(255, 255, 255, 0.30)' };
  }

  const themeTextMap = {
    'theme-pink': '#eb5b89',
    'theme-yellow': '#9a7400',
    'theme-blue': '#0063a9',
    'theme-red': '#cb003d',
    'theme-green': '#108a72'
  };
  for (const [themeClass, text] of Object.entries(themeTextMap)) {
    if (body.classList.contains(themeClass)) {
      return { bg: '#ffffff', text, border: '#ffffff', ring: 'rgba(255, 255, 255, 0.42)' };
    }
  }

  return { bg: '#000000', text: '#ffffff', border: '#000000', ring: 'rgba(0, 0, 0, 0.16)' };
}

function applyFilterSelectedButtonVisual(btn, active) {
  if (!btn) return;

  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', String(active));
  btn.toggleAttribute('data-filter-active', active);

  const forcedProps = [
    'background',
    'background-color',
    'color',
    '-webkit-text-fill-color',
    'border-color',
    'box-shadow',
    'text-shadow',
    'filter'
  ];

  if (!active) {
    forcedProps.forEach(prop => btn.style.removeProperty(prop));
    return;
  }

  const colors = getFilterSelectedButtonColors();
  // CSSの後段上書きやhover指定に負けないよう、選択中だけinline importantで固定する。
  btn.style.setProperty('background', colors.bg, 'important');
  btn.style.setProperty('background-color', colors.bg, 'important');
  btn.style.setProperty('color', colors.text, 'important');
  btn.style.setProperty('-webkit-text-fill-color', colors.text, 'important');
  btn.style.setProperty('border-color', colors.border, 'important');
  btn.style.setProperty('box-shadow', `0 0 0 2.5px ${colors.ring}`, 'important');
  btn.style.setProperty('text-shadow', 'none', 'important');
  btn.style.setProperty('filter', 'none', 'important');
}

function updateFilterButtonStyles() {
  document.querySelectorAll('.guest-button[data-guest]').forEach(btn => {
    applyFilterSelectedButtonVisual(btn, selectedGuests.includes(btn.dataset.guest));
  });
  document.querySelectorAll('.btn-corner[data-corner]').forEach(btn => {
    applyFilterSelectedButtonVisual(btn, selectedCorners.includes(btn.dataset.corner));
  });
  document.querySelectorAll('.btn-corner[data-other]').forEach(btn => {
    applyFilterSelectedButtonVisual(btn, selectedOthers.includes(btn.dataset.other));
  });
  document.querySelectorAll('.btn-year[data-year]').forEach(btn => {
    applyFilterSelectedButtonVisual(btn, selectedYears.includes(String(btn.dataset.year)));
  });
}

function fitGuestLines() {
  let needsRetry = false;
  const savingFavSceneModal = document.getElementById('favSceneModal')?.classList.contains('is-saving-scene');

  // --- 1. テキスト幅を計測して最適なサイズを計算する共通関数 ---
  const calculateSize = (line) => {
    line.style.removeProperty('font-size');
    line.style.whiteSpace = 'normal';
    
    const parent = line.parentElement;
    if (!parent) return null;

    const compStyle = window.getComputedStyle(parent);
    const paddingLeft = parseFloat(compStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(compStyle.paddingRight) || 0;
    const parentWidth = parent.clientWidth - paddingLeft - paddingRight;
    
    if (parentWidth <= 10) {
      needsRetry = true;
      return null;
    }

    line.style.whiteSpace = 'nowrap';
    const currentWidth = line.scrollWidth;
    const MIN_FONT_SIZE = 8.5;

    let finalSize = parseFloat(window.getComputedStyle(line).fontSize) || 12;
    if (currentWidth > parentWidth) {
      const originalSize = finalSize;
      let newSize = (parentWidth / currentWidth) * originalSize;
      finalSize = Math.max(newSize, MIN_FONT_SIZE);
    }
    return { finalSize, parentWidth, currentWidth, MIN_FONT_SIZE };
  };

  // --- 2. ゲスト名の処理（従来通り1行ごとに独立して計算・適用） ---
  const guestLines = document.querySelectorAll('.guest-one-line');
  guestLines.forEach(line => {
    if (savingFavSceneModal && line.closest('#favSceneEpisodeCard')) {
      line.style.visibility = 'visible';
      return;
    }
    const res = calculateSize(line);
    if (!res) {
      line.style.visibility = 'visible';
      return;
    }
    
    line.style.setProperty('font-size', res.finalSize + 'px', 'important');

    // ★微調整: 小数点以下の計算誤差を吸収するために +1 を追加
    if (res.finalSize === res.MIN_FONT_SIZE && line.scrollWidth > res.parentWidth + 1) {
      line.classList.add('needs-ellipsis');
    } else {
      line.classList.remove('needs-ellipsis');
    }
    line.style.visibility = 'visible';
  });

  // --- 3. メタ情報（公開日時・動画時間）の処理（2行のサイズを比較して小さい方に統一する） ---
  const metaContainers = document.querySelectorAll('.episode-meta');
  metaContainers.forEach(container => {
    const lines = container.querySelectorAll('.meta-one-line');
    if (savingFavSceneModal && container.closest('#favSceneEpisodeCard')) {
      lines.forEach(line => { line.style.visibility = 'visible'; });
      return;
    }
    if (lines.length === 0) return;

    let minSize = 999;
    const results = [];

    // まず親要素内のすべての行の理想サイズを計算
    lines.forEach(line => {
      const res = calculateSize(line);
      if (res) {
        results.push({ line, res });
        if (res.finalSize < minSize) {
          minSize = res.finalSize; // 一番小さいフォントサイズを記録
        }
      } else {
        line.style.visibility = 'visible';
      }
    });

    if (minSize === 999) return; // 計算できなかった場合はスキップ

    // 計算結果をもとに、同じ親要素内の2行を「一番小さいサイズ」に揃えて適用
    results.forEach(({ line, res }) => {
      line.style.setProperty('font-size', minSize + 'px', 'important');
      
      // ★微調整: 統一サイズ適用後、限界まで小さくしてもはみ出す場合は「...」を付与 (+1で誤差吸収)
      if (minSize === res.MIN_FONT_SIZE && line.scrollWidth > res.parentWidth + 1) {
        line.classList.add('needs-ellipsis');
      } else {
        line.classList.remove('needs-ellipsis');
      }
      line.style.visibility = 'visible';
    });
  });

  if (needsRetry) {
    if (fitGuestLinesRetryTimer) clearTimeout(fitGuestLinesRetryTimer);
    fitGuestLinesRetryTimer = setTimeout(() => {
      fitGuestLinesRetryTimer = 0;
      fitGuestLines();
    }, 100);
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
    if (`${location.pathname}${location.search}` === url) return;
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

    if (isOpening) {
      updateFilterButtonStyles();
      window.acquireBodyLock();
    } else {
      window.releaseBodyLock();
    }
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
    search({ gotoPage: 1, animateResults: true });
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
  // sortSelect の change は下側の1箇所に統一（二重検索・二重描画防止）

  const handleFilterClick = (e, collection, type) => {
      const btn = e.target.closest(`[data-${type}]`);
      if (!btn) return;
      const value = btn.dataset[type];
      const index = collection.indexOf(value);
      index > -1 ? collection.splice(index, 1) : collection.push(value);
      updateFilterButtonStyles();
      search({ animateResults: true });
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
      search({ gotoPage: currentPage, animateResults: true });
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
    search({ animateResults: true });
    scrollToResultsTop();
  });

  document.getElementById('results').addEventListener('click', e => {

    const homeBtn = e.target.closest('#favGoHomeBtn');
  if (homeBtn) {
    // ★変更: resetSearch() ではなく exitFavoritesMode() を呼ぶ
    exitFavoritesMode(); 
  }

    const target = e.target;
    
    // ★追加: フォトメモリンクボタンの処理
    const photoBtn = target.closest('.photo-btn');
    if (photoBtn) {
      e.preventDefault(); e.stopPropagation();
      const ep = photoBtn.dataset.ep;
      if (window.openPhotoModal) window.openPhotoModal(ep);
      return;
    }

    const favBtn = target.closest('.fav-btn');
    if (favBtn) {
      e.preventDefault(); e.stopPropagation();
      pendingFavoriteEpisode = {
        id: favBtn.dataset.id,
        title: favBtn.dataset.title || '',
        episode: favBtn.dataset.episode || '',
        link: favBtn.dataset.link || '',
        duration: favBtn.dataset.duration || '',
        date: favBtn.dataset.date || '',
        guest: favBtn.dataset.guest || '',
        thumbnail: favBtn.dataset.thumbnail || '',
        defaultTs: Number(favBtn.dataset.defaultTs || 0)
      };
      if (window.openFavoriteSceneModal) window.openFavoriteSceneModal(pendingFavoriteEpisode);
      return;
    }
    const tsBtn = target.closest('.ts-btn');
    if (tsBtn) {
      e.preventDefault(); e.stopPropagation();
      openPlaybackUrl(withTimeParam(tsBtn.dataset.url, Number(tsBtn.dataset.ts)));
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
    search({ animateResults: true });
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
      search({ animateResults: true });
      searchBoxForClear.focus();
    });

    toggleClearBtn();
  }

  const mainSearchBtn = document.getElementById('mainSearchBtn');
  if (mainSearchBtn) {
    mainSearchBtn.addEventListener('click', () => {
      search({ animateResults: true });
      scrollToResultsTop();
      mainSearchBtn.blur();
    });
  }
}

// ... (後略: その他のUI機能、テーマ設定、スクロールロック等は変更なし) ...

(function scrollLockModule() {
  let lockCount = 0;
  let isLocked = false;
  let lockedScrollY = 0;
  let lockedScrollX = 0;
  let originalHtmlStyle = null;
  let originalBodyStyle = null;
  let originalStickyPaddingRight = '';
  const htmlElement = document.documentElement;
  const bodyElement = document.body;
  const stickyHeader = document.querySelector('.sticky-search-area');

  const LOCK_UI_IDS = ['filterDrawer', 'aboutModal', 'historyModal', 'photoModal', 'favSceneModal'];

  const readCurrentScroll = () => ({
    x: window.pageXOffset || htmlElement.scrollLeft || bodyElement.scrollLeft || 0,
    y: window.pageYOffset || htmlElement.scrollTop || bodyElement.scrollTop || 0
  });

  const restoreScrollPosition = (x, y) => {
    const sx = Math.max(0, Number(x) || 0);
    const sy = Math.max(0, Number(y) || 0);
    const currentX = window.pageXOffset || htmlElement.scrollLeft || bodyElement.scrollLeft || 0;
    const currentY = window.pageYOffset || htmlElement.scrollTop || bodyElement.scrollTop || 0;
    if (Math.abs(currentX - sx) > 1 || Math.abs(currentY - sy) > 1) {
      try { window.scrollTo(sx, sy); } catch (_) {}
      requestAnimationFrame(() => {
        try { window.scrollTo(sx, sy); } catch (_) {}
      });
      window.setTimeout(() => {
        const yNow = window.pageYOffset || htmlElement.scrollTop || bodyElement.scrollTop || 0;
        if (Math.abs(yNow - sy) > 2) {
          try { window.scrollTo(sx, sy); } catch (_) {}
        }
      }, 90);
    }
  };

  const isLockUiActive = () => LOCK_UI_IDS.some(id => {
    const el = document.getElementById(id);
    if (!el) return false;
    if (id === 'filterDrawer') {
      return window.getComputedStyle(el).display !== 'none';
    }
    if (el.classList.contains('show') || el.classList.contains('closing')) return true;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });

  const isScrollableModalTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(
      '#favSceneModal .fav-scene-body, #photoModal .photo-body, #historyModal .history-body, #filterDrawer'
    ));
  };

  const preventBackgroundTouchMove = (event) => {
    if (!isLocked) return;
    if (isScrollableModalTarget(event.target)) return;
    event.preventDefault();
  };

  const restoreInlineStyles = () => {
    if (stickyHeader) stickyHeader.style.paddingRight = originalStickyPaddingRight || '';
    htmlElement.classList.remove('scroll-locked');
    bodyElement.classList.remove('body-scroll-locked');

    if (originalHtmlStyle) {
      htmlElement.style.overflow = originalHtmlStyle.overflow || '';
      htmlElement.style.overscrollBehavior = originalHtmlStyle.overscrollBehavior || '';
    } else {
      htmlElement.style.removeProperty('overflow');
      htmlElement.style.removeProperty('overscroll-behavior');
    }

    if (originalBodyStyle) {
      bodyElement.style.overflow = originalBodyStyle.overflow || '';
      bodyElement.style.touchAction = originalBodyStyle.touchAction || '';
    } else {
      bodyElement.style.removeProperty('overflow');
      bodyElement.style.removeProperty('touch-action');
    }

    originalHtmlStyle = null;
    originalBodyStyle = null;
  };

  const applyLock = () => {
    if (isLocked) return;
    const current = readCurrentScroll();
    lockedScrollX = current.x;
    lockedScrollY = current.y;
    originalHtmlStyle = {
      overflow: htmlElement.style.overflow,
      overscrollBehavior: htmlElement.style.overscrollBehavior
    };
    originalBodyStyle = {
      overflow: bodyElement.style.overflow,
      touchAction: bodyElement.style.touchAction
    };
    originalStickyPaddingRight = stickyHeader ? stickyHeader.style.paddingRight : '';

    const scrollbarWidth = Math.max(0, window.innerWidth - htmlElement.clientWidth);
    if (scrollbarWidth > 0 && stickyHeader) {
      stickyHeader.style.paddingRight = `${scrollbarWidth}px`;
    }

    // v11: body を position: fixed にしない。
    // iOS/PWAでは body fixed の付け外しが全画面再合成になり、モーダルを閉じた瞬間の白飛び/無描画の主因になる。
    // 背面スクロールは overflow + touchmove guard で止め、解除時だけ元の scrollY へ戻す。
    htmlElement.classList.add('scroll-locked');
    bodyElement.classList.add('body-scroll-locked');
    htmlElement.style.overflow = 'hidden';
    htmlElement.style.overscrollBehavior = 'none';
    bodyElement.style.overflow = 'hidden';
    bodyElement.style.touchAction = 'auto';
    isLocked = true;
  };

  const clearLock = ({ restore = true } = {}) => {
    const restoreX = lockedScrollX;
    const restoreY = lockedScrollY;
    restoreInlineStyles();
    isLocked = false;
    if (restore) restoreScrollPosition(restoreX, restoreY);
  };

  const syncLockToVisibleUi = () => {
    if (!isLockUiActive() && (isLocked || lockCount > 0 || htmlElement.classList.contains('scroll-locked') || bodyElement.classList.contains('body-scroll-locked'))) {
      lockCount = 0;
      clearLock({ restore: true });
    }
  };

  window.acquireBodyLock = () => {
    if (lockCount <= 0) {
      lockCount = 0;
      applyLock();
    }
    lockCount += 1;
    return lockCount;
  };

  window.releaseBodyLock = (options = {}) => {
    const restore = !(options && options.restore === false);
    if (lockCount <= 0) {
      lockCount = 0;
      requestAnimationFrame(syncLockToVisibleUi);
      return;
    }
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) clearLock({ restore });
    window.setTimeout(syncLockToVisibleUi, 90);
  };

  window.__hardUnlockScroll = () => {
    lockCount = 0;
    clearLock({ restore: true });
  };

  window.__syncBodyLockToUi = () => {
    requestAnimationFrame(syncLockToVisibleUi);
    window.setTimeout(syncLockToVisibleUi, 120);
    window.setTimeout(syncLockToVisibleUi, 320);
  };

  document.addEventListener('touchmove', preventBackgroundTouchMove, { passive: false });
  window.addEventListener('pageshow', () => window.__syncBodyLockToUi(), { passive: true });
  window.addEventListener('focus', () => window.__syncBodyLockToUi(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.__syncBodyLockToUi();
  }, { passive: true });
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

    // テーマ変更直後に、選択中フィルターボタンの反転色も同期する。
    if (typeof updateFilterButtonStyles === 'function') {
      requestAnimationFrame(updateFilterButtonStyles);
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


function buildFavoriteSceneList(videoId) {
  const list = document.getElementById('favSceneList');
  const empty = document.getElementById('favSceneEmpty');
  if (!list || !empty) return;
  const savedBox = list.closest('.fav-scene-saved');
  const entry = getFavoriteSceneEntry(videoId);
  const timestamps = entry ? sortFavoriteScenesForDisplay(entry.timestamps) : [];
  const hasTimestamps = timestamps.length > 0;

  list.innerHTML = timestamps.map((ts) => {
    const hasTime = hasFavoriteSceneTime(ts.seconds);
    const playUrl = hasTime ? withTimeParam(entry.link, ts.seconds) : (entry.link || '#');
    const label = hasTime ? (ts.label || formatTimestamp(ts.seconds)) : (ts.label || '??:??');
    const note = ts.note || 'お気に入りシーン';
    return `
      <li class="fav-scene-item" data-scene-id="${escapeHtml(ts.id)}" data-play-url="${escapeHtml(playUrl)}" role="link" tabindex="0" aria-label="${escapeHtml(label + ' ' + note + (hasTime ? ' から再生' : ' タイムスタンプ未指定'))}">
        <span class="fav-scene-time" aria-hidden="true">
          <i class="fa-brands fa-youtube" aria-hidden="true"></i>
          <span class="impact-number fav-scene-time-label${hasTime ? '' : ' is-unknown'}">${escapeHtml(label)}</span>
        </span>
        <span class="fav-scene-note"><span class="fav-scene-note-text">${escapeHtml(note)}</span></span>
        <span class="fav-scene-actions-inline" aria-hidden="false">
          <button type="button" class="fav-scene-delete" data-scene-id="${escapeHtml(ts.id)}" aria-label="このタイムスタンプを削除">
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          </button>
        </span>
      </li>
    `;
  }).join('');

  // 幅はCSSで制御する。
  // 以前ここで max-width:100%!important をJSから直接付けていたため、
  // CSSで「登録済みタイムスタンプ行だけ短くする」指定が効かなくなっていた。
  // 既存DOMに残っている可能性のあるインライン幅指定もここで解除する。
  if (savedBox) {
    savedBox.style.removeProperty('width');
    savedBox.style.removeProperty('max-width');
    savedBox.style.removeProperty('box-sizing');
  }
  list.style.removeProperty('width');
  list.style.removeProperty('max-width');
  list.style.removeProperty('box-sizing');
  list.querySelectorAll('.fav-scene-item').forEach(item => {
    item.style.removeProperty('width');
    item.style.removeProperty('max-width');
    item.style.removeProperty('box-sizing');
  });

  const sceneModal = document.getElementById('favSceneModal');
  const isEditing = sceneModal?.classList?.contains('is-editing') || savedBox?.classList?.contains('is-editing');
  const openEditorBtn = document.getElementById('favSceneOpenEditorBtn');

  empty.hidden = isEditing || hasTimestamps;
  empty.setAttribute('aria-hidden', (!isEditing && !hasTimestamps) ? 'false' : 'true');
  if (empty.hidden) empty.style.setProperty('display', 'none', 'important');
  else empty.style.removeProperty('display');

  list.hidden = isEditing || !hasTimestamps;
  list.setAttribute('aria-hidden', (!isEditing && hasTimestamps) ? 'false' : 'true');
  if (list.hidden) list.style.setProperty('display', 'none', 'important');
  else list.style.removeProperty('display');

  const savedHead = openEditorBtn?.closest('.fav-scene-saved-head');
  if (savedHead) {
    savedHead.hidden = Boolean(isEditing);
    savedHead.setAttribute('aria-hidden', isEditing ? 'true' : 'false');
    if (isEditing) savedHead.style.setProperty('display', 'none', 'important');
    else savedHead.style.removeProperty('display');
  }

  if (openEditorBtn) {
    const label = hasTimestamps ? 'タイムスタンプ編集' : 'タイムスタンプを追加';
    const iconClass = hasTimestamps ? 'fa-pen-to-square' : 'fa-plus';
    openEditorBtn.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i> <span class="fav-scene-open-editor-label">${label}</span>`;
    openEditorBtn.setAttribute('aria-label', label);
  }

  savedBox?.classList.toggle('has-timestamps', hasTimestamps);
  savedBox?.classList.toggle('is-empty', !hasTimestamps);
  savedBox?.classList.toggle('is-editing', Boolean(isEditing));

  const updateListScrollHint = () => updateFavoriteSceneListScrollHint({ measure: true });
  updateListScrollHint();
  requestAnimationFrame(updateListScrollHint);
  setTimeout(updateListScrollHint, 90);
  setTimeout(updateListScrollHint, 260);
}

function ensureFavoriteSceneListFade() {
  // v18: 白い帯のように見えていた独立オーバーレイは使わない。
  // スクロール可能ヒントは #favSceneList 自体の mask-image で表現する。
  // 既に旧コードで生成済みの要素があれば削除して、テーマCSSの上書き事故を防ぐ。
  const oldFade = document.getElementById('favSceneListFade');
  if (oldFade) oldFade.remove();
  return null;
}

let favoriteSceneListMeasureRaf = 0;
let favoriteSceneListStateRaf = 0;

function updateFavoriteSceneListScrollHint(options = {}) {
  const list = document.getElementById('favSceneList');
  if (!list) return;
  const modal = document.getElementById('favSceneModal');
  const savedBox = list.closest('.fav-scene-saved');
  const fade = ensureFavoriteSceneListFade();
  const hidden = list.hidden || list.getAttribute('aria-hidden') === 'true' || !modal || modal.hidden;

  const resetState = () => {
    list.classList.remove('is-scrollable', 'is-at-bottom', 'is-fixed-scroll-area');
    list.style.removeProperty('--fav-scene-stable-list-height');
    list.style.removeProperty('--fav-scene-fade-height');
    savedBox?.classList.remove('has-list-overflow', 'is-list-at-bottom');
    if (fade) {
      fade.hidden = true;
      fade.style.removeProperty('--fav-scene-list-fade-top');
      fade.style.removeProperty('--fav-scene-list-fade-height');
    }
  };

  if (hidden) {
    resetState();
    return;
  }

  const syncScrollState = () => {
    favoriteSceneListStateRaf = 0;
    const scrollable = list.scrollHeight > list.clientHeight + 2;
    const atBottom = !scrollable || (list.scrollTop + list.clientHeight >= list.scrollHeight - 3);
    list.classList.toggle('is-scrollable', scrollable);
    list.classList.toggle('is-at-bottom', atBottom);
    savedBox?.classList.toggle('has-list-overflow', scrollable);
    savedBox?.classList.toggle('is-list-at-bottom', atBottom);

    if (fade) {
      const fadeHeight = Math.min(24, Math.max(16, Math.floor(list.clientHeight * 0.11)));
      fade.style.setProperty('--fav-scene-list-fade-height', `${fadeHeight}px`);
      fade.style.setProperty('--fav-scene-list-fade-top', `${Math.max(0, list.offsetTop + list.clientHeight - fadeHeight)}px`);
      fade.hidden = !scrollable || atBottom;
    }
  };

  const requestState = () => {
    if (favoriteSceneListStateRaf) return;
    favoriteSceneListStateRaf = requestAnimationFrame(syncScrollState);
  };

  if (options.measure) {
    if (favoriteSceneListMeasureRaf) cancelAnimationFrame(favoriteSceneListMeasureRaf);
    favoriteSceneListMeasureRaf = requestAnimationFrame(() => {
      favoriteSceneListMeasureRaf = 0;
      const items = Array.from(list.querySelectorAll('.fav-scene-item'));
      // いったん自然なCSS計算へ戻してから測る。これにより、VisualViewportやフォント読み込みの途中値が
      // そのまま固定されて、登録数が多い時に一覧の縦幅が伸び縮みするのを防ぐ。
      list.classList.remove('is-fixed-scroll-area');
      list.style.removeProperty('--fav-scene-stable-list-height');
      void list.offsetHeight;

      if (items.length === 0) {
        resetState();
        return;
      }

      const style = window.getComputedStyle(list);
      const gap = Math.max(0, parseFloat(style.rowGap || style.gap || '0') || 0);
      const firstHeight = Math.max(1, Math.ceil(items[0].getBoundingClientRect().height || 54));
      const rowStep = firstHeight + gap;
      const naturalClientHeight = Math.max(0, Math.floor(list.clientHeight));
      const naturalScrollHeight = Math.max(0, Math.ceil(list.scrollHeight));
      const needsOwnScroll = naturalScrollHeight > naturalClientHeight + 2;

      if (needsOwnScroll) {
        // 表示領域を「完全な行数」へ丸める。スクロール中に半端な空白が出たり、
        // iOS Safari のツールバー変化で高さだけ再計算されるのを防ぐ。
        const rowsFromCurrentHeight = Math.floor((naturalClientHeight + gap + 1) / rowStep);
        const rowsFromViewport = Number(modal.style.getPropertyValue('--fav-scene-visible-rows-final')) || 0;
        const visibleRows = Math.max(2, Math.min(items.length - 1, 6, rowsFromCurrentHeight || rowsFromViewport || 4));
        const stableHeight = Math.round((firstHeight * visibleRows) + (gap * Math.max(0, visibleRows - 1)));
        list.style.setProperty('--fav-scene-stable-list-height', `${stableHeight}px`);
        list.classList.add('is-fixed-scroll-area');
      } else {
        list.classList.remove('is-fixed-scroll-area');
        list.style.removeProperty('--fav-scene-stable-list-height');
      }

      requestState();
    });
    return;
  }

  requestState();
}


function updateFavoriteButtonsFor(videoId) {
  const escapedId = (window.CSS && typeof CSS.escape === 'function') ? CSS.escape(videoId) : String(videoId).replace(/\"/g, '\\"');
  document.querySelectorAll(`.fav-btn[data-id="${escapedId}"]`).forEach(btn => {
    const active = isFavorite(videoId);
    btn.classList.toggle('active', active);
    const label = active ? 'お気に入りシーンを開く' : 'お気に入りシーンを作成';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-solid', active);
      icon.classList.toggle('fa-regular', !active);
    }
    btn.closest('.episode-item')?.classList.toggle('is-fav', active);
  });
}

function setupFavoriteSceneModal() {
  const modal = document.getElementById('favSceneModal');
  const closeBtn = document.getElementById('favSceneCloseBtn');
  const form = document.getElementById('favSceneForm');
  const commentInput = document.getElementById('favSceneCommentInput');
  const episodeInlineEl = document.getElementById('favSceneEpisodeInline');
  const episodeCardEl = document.getElementById('favSceneEpisodeCard');
  const removeBtn = document.getElementById('favSceneRemoveBtn');
  const list = document.getElementById('favSceneList');
  const errorEl = document.getElementById('favSceneError');
  const savedHint = document.getElementById('favSceneSavedHint');
  const openEditorBtn = document.getElementById('favSceneOpenEditorBtn');
  const inlineCancelBtn = document.getElementById('favSceneInlineCancelBtn');
  const saveBtn = form ? form.querySelector('.fav-scene-save-btn') : null;
  if (!modal || !closeBtn || !form || !commentInput || !episodeInlineEl || !removeBtn || !list || !errorEl || !openEditorBtn) return { closeModal: () => {} };

  let currentDurationSeconds = null;
  let savedHintTimer = null;
  let saveCommitTimer = 0;
  let editingSceneId = null;
  let previouslyFocusedElement = null;

  const setSavedHint = (message, isSuccess = false) => {
    if (!savedHint) return;
    clearTimeout(savedHintTimer);
    savedHint.textContent = message;
    savedHint.hidden = !Boolean(message);
    savedHint.classList.toggle('is-success', isSuccess);
    if (isSuccess) {
      savedHintTimer = setTimeout(() => {
        savedHint.textContent = '';
        savedHint.classList.remove('is-success');
        savedHint.hidden = true;
      }, 1800);
    }
  };

  const setCommentError = (message, options = {}) => {
    const hasError = Boolean(message);
    if (options.html) errorEl.innerHTML = message || '';
    else errorEl.textContent = message || '';
    errorEl.hidden = !hasError;
    commentInput.classList.toggle('is-invalid', hasError);
    if (saveBtn) saveBtn.disabled = hasError;
  };

  const normalizeCommentText = (value, { keepLines = false } = {}) => {
    const normalized = String(value || '')
      .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
      .replace(/[：]/g, ':')
      .replace(/\r\n?/g, '\n');
    if (keepLines) {
      return normalized
        .split('\n')
        .map(line => line.replace(/[\t ]+/g, ' ').trim())
        .join('\n')
        .trim();
    }
    return normalized.replace(/\s+/g, ' ').trim();
  };

  const parseFavoriteSceneLine = (value, lineNumber = null) => {
    const normalizedRaw = String(value || '')
      .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
      .replace(/[：]/g, ':')
      .replace(/\r\n?/g, '\n')
      .trim();
    const raw = normalizedRaw.replace(/[\t ]+/g, ' ');
    const prefix = lineNumber ? `${lineNumber}行目：` : '';
    if (!raw) return { ok: false, error: `${prefix}時間とメモを入力してください。` };

    // YouTubeコメント風に、文中の m:ss / h:mm:ss を拾う。
    // 時間が無い行もメモとして保存できるようにし、表示は ??:?? にする。
    const match = raw.match(/(^|\s)(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?(?=\s|$)/);
    if (!match) {
      return {
        ok: true,
        seconds: null,
        label: '??:??',
        note: raw,
        raw: normalizedRaw,
        timeText: '',
        hasTime: false
      };
    }

    const hasHour = match[4] !== undefined;
    const h = hasHour ? Number(match[2]) : 0;
    const m = hasHour ? Number(match[3]) : Number(match[2]);
    const sec = hasHour ? Number(match[4]) : Number(match[3]);

    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(sec) || h < 0 || m < 0 || sec < 0) {
      return { ok: false, error: `${prefix}正しい時間を入力してください。` };
    }
    if (m > 59 || sec > 59) {
      return { ok: false, error: `${prefix}分・秒は<span class="impact-number fav-scene-error-number">59</span>以下で入力してください。`, html: true };
    }

    const seconds = h * 3600 + m * 60 + sec;
    if (Number.isFinite(currentDurationSeconds) && seconds > currentDurationSeconds) {
      const durationLabel = escapeHtml(formatTimestamp(currentDurationSeconds));
      return { ok: false, error: `${prefix}動画時間（<span class="impact-number fav-scene-error-duration">${durationLabel}</span>）を超えています。`, html: true };
    }

    const fullMatch = match[0];
    const note = raw.replace(fullMatch, ' ').replace(/\s{2,}/g, ' ').trim() || 'お気に入りシーン';
    return { ok: true, seconds, label: formatTimestamp(seconds), note, raw: normalizedRaw, timeText: fullMatch.trim(), hasTime: true };
  };

  const parseFavoriteSceneComment = (value) => parseFavoriteSceneLine(value);

  const parseFavoriteSceneCommentList = (value) => {
    const normalized = normalizeCommentText(value, { keepLines: true });
    if (!normalized) return { ok: false, error: '時間とメモを入力してください。' };
    const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return { ok: false, error: '時間とメモを入力してください。' };

    const scenes = [];
    const timedIndexMap = new Map();

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseFavoriteSceneLine(lines[i], i + 1);
      if (!parsed.ok) return parsed;
      parsed.inputOrder = i;

      const hasTime = hasFavoriteSceneTime(parsed.seconds);
      if (hasTime) {
        const key = Number(parsed.seconds);
        // 同じ時間が複数ある場合は最後の行を優先。ただし順番も最後の入力位置へ移す。
        if (timedIndexMap.has(key)) {
          const oldIndex = timedIndexMap.get(key);
          scenes.splice(oldIndex, 1);
          for (const [k, idx] of timedIndexMap.entries()) {
            if (idx > oldIndex) timedIndexMap.set(k, idx - 1);
          }
        }
        timedIndexMap.set(key, scenes.length);
        scenes.push(parsed);
      } else {
        // 時間なし行は「メモだけ」として全行登録する。
        scenes.push(parsed);
      }
    }

    return { ok: true, scenes };
  };

  const buildCommentEditorText = (videoId) => {
    const entry = getFavoriteSceneEntry(videoId);
    const timestamps = entry ? sortFavoriteScenesForDisplay(entry.timestamps) : [];
    return timestamps.map(scene => {
      const hasTime = hasFavoriteSceneTime(scene.seconds);
      const prefix = hasTime ? (scene.label || formatTimestamp(scene.seconds)) : '';
      return `${prefix} ${scene.note || 'お気に入りシーン'}`.trim();
    }).join('\n');
  };

  const validateComment = () => {
    const result = parseFavoriteSceneCommentList(commentInput.value);
    if (!result.ok) {
      setCommentError(result.error, { html: result.html });
      return false;
    }
    setCommentError('');
    return true;
  };

  const updateRemoveButtonVisibility = (forceHidden = false) => {
    if (!removeBtn) return;
    if (forceHidden) {
      removeBtn.hidden = true;
      removeBtn.setAttribute('aria-hidden', 'true');
      return;
    }

    const videoId = pendingFavoriteEpisode?.id;
    const entry = videoId ? getFavoriteSceneEntry(videoId) : null;
    const hasScenes = Boolean(entry && Array.isArray(entry.timestamps) && entry.timestamps.length > 0);
    const shouldShow = Boolean(videoId && (isFavorite(videoId) || hasScenes));

    removeBtn.hidden = !shouldShow;
    removeBtn.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  };

  const getFocusableElements = () => Array.from(modal.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => {
    if (el === modal || el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  });

  const focusFirstModalControl = () => {
    const focusables = getFocusableElements();
    const target = focusables[0] || modal;
    try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
  };

  const restorePreviousFocus = () => {
    const target = previouslyFocusedElement;
    previouslyFocusedElement = null;
    if (!target || !document.contains(target) || typeof target.focus !== 'function') return;
    // タッチ端末では閉じる直後の focus 復元がスクロール復元/再描画と競合しやすい。
    // PCのキーボード操作ではアクセシビリティのため従来通り復元する。
    const coarsePointer = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches;
    if (coarsePointer) return;
    try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
  };

  const getFavoriteModalContent = () => modal.querySelector('.fav-scene-modal');

  const clearClosingLayoutFreeze = () => {
    const modalContent = getFavoriteModalContent();
    modal.classList.remove('is-closing-stable');
    if (!modalContent) return;
    [
      'position', 'top', 'left', 'right', 'bottom', 'width', 'height',
      'max-height', 'margin', 'transform', 'overflow-y', 'overflow-x'
    ].forEach(prop => modalContent.style.removeProperty(prop));
  };

  const freezeClosingLayout = () => {
    const modalContent = getFavoriteModalContent();
    if (!modalContent || modal.hidden) return;
    const rect = modalContent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // iOS Safari/PWAでは、保存後のVisualViewport復帰中に閉じると
    // overlayの中央寄せが1フレームだけ再計算されてモーダルがズレることがある。
    // 閉じ始めた瞬間の見た目を固定してからフェードアウトさせる。
    modal.classList.add('is-closing-stable');
    modalContent.style.setProperty('position', 'fixed', 'important');
    modalContent.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
    modalContent.style.setProperty('left', `${Math.round(rect.left)}px`, 'important');
    modalContent.style.setProperty('right', 'auto', 'important');
    modalContent.style.setProperty('bottom', 'auto', 'important');
    modalContent.style.setProperty('width', `${Math.round(rect.width)}px`, 'important');
    modalContent.style.setProperty('height', `${Math.round(rect.height)}px`, 'important');
    modalContent.style.setProperty('max-height', `${Math.round(rect.height)}px`, 'important');
    modalContent.style.setProperty('margin', '0', 'important');
    modalContent.style.setProperty('transform', 'none', 'important');
    modalContent.style.setProperty('overflow-y', 'hidden', 'important');
    modalContent.style.setProperty('overflow-x', 'hidden', 'important');
  };

  const setSaveButtonMode = (isEditing) => {
    const editing = Boolean(isEditing);
    const savedBox = list?.closest('.fav-scene-saved');
    modal.classList.toggle('is-editing', editing);
    form.classList.toggle('is-editing', editing);
    savedBox?.classList.toggle('is-editing', editing);
    updateRemoveButtonVisibility(editing);

    if (editing) {
      list.hidden = true;
      list.setAttribute('aria-hidden', 'true');
      const empty = document.getElementById('favSceneEmpty');
      if (empty) {
        empty.hidden = true;
        empty.setAttribute('aria-hidden', 'true');
      }
    }

    if (!saveBtn) return;
    saveBtn.classList.toggle('is-editing', editing);
    saveBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> 保存';
  };

  const resetEditingState = () => {
    editingSceneId = null;
    setSaveButtonMode(false);
    list?.querySelectorAll('.fav-scene-item.is-editing').forEach(item => item.classList.remove('is-editing'));
  };

  const openEditor = () => {
    if (!pendingFavoriteEpisode?.id) return;
    resetEditingState();
    commentInput.value = buildCommentEditorText(pendingFavoriteEpisode.id);
    setSaveButtonMode(true);
    if (saveBtn) saveBtn.disabled = !commentInput.value.trim();
    setSavedHint('', false);
    setCommentError('');
    form.hidden = false;
    form.classList.add('show');
    openEditorBtn.hidden = true;
    // 編集中は登録済み一覧・空表示を隠し、入力欄だけ見せる
    buildFavoriteSceneList(pendingFavoriteEpisode.id);
    try { modal.focus({ preventScroll: true }); } catch (_) { modal.focus(); }
  };

  const closeEditor = (reset = true) => {
    if (form.hidden) {
      if (reset) resetEditingState();
      if (pendingFavoriteEpisode?.id) buildFavoriteSceneList(pendingFavoriteEpisode.id);
      return;
    }
    form.classList.remove('show');
    const finish = () => {
      form.hidden = true;
      commentInput.value = '';
      setCommentError('');
      openEditorBtn.hidden = false;
      if (reset) {
        resetEditingState();
        setSavedHint('', false);
      } else {
        setSaveButtonMode(false);
      }
      if (pendingFavoriteEpisode?.id) buildFavoriteSceneList(pendingFavoriteEpisode.id);
    };
    setTimeout(finish, 80);
  };

  const isSoftKeyboardLikelyOpen = () => {
    const vv = window.visualViewport;
    const layoutHeight = Math.max(
      Number(window.innerHeight) || 0,
      Number(document.documentElement.clientHeight) || 0
    );
    const visualHeight = vv ? Number(vv.height) || layoutHeight : layoutHeight;
    const offsetTop = vv ? Number(vv.offsetTop) || 0 : 0;
    const shrink = Math.max(0, layoutHeight - visualHeight - offsetTop);
    return shrink > 80 ||
      document.documentElement.classList.contains('vv-keyboard-open') ||
      modal.classList.contains('is-keyboard-open') ||
      (document.activeElement === commentInput && modal.classList.contains('is-comment-focused'));
  };

  const finishSavedSceneUiCommit = (videoId, { refreshResults = false } = {}) => {
    window.clearTimeout(saveCommitTimer);
    saveCommitTimer = 0;
    if (!modal || modal.hidden || pendingFavoriteEpisode?.id !== videoId) return;

    modal.classList.remove('is-saving-scene');
    form.classList.remove('show');
    form.hidden = true;
    commentInput.value = '';
    setCommentError('');
    openEditorBtn.hidden = false;
    resetEditingState();
    updateRemoveButtonVisibility(false);
    buildFavoriteSceneList(videoId);
    setSavedHint('保存しました。', true);

    list.querySelectorAll('.fav-scene-item').forEach(item => item.classList.add('is-new'));
    setTimeout(() => list.querySelectorAll('.fav-scene-item.is-new').forEach(item => item.classList.remove('is-new')), 900);

    updateFavoriteSceneListScrollHint({ measure: true });
    requestAnimationFrame(() => {
      updateFavoriteSceneListScrollHint({ measure: true });
      // iOSのキーボード閉じアニメーション直後はフォント計測が一瞬だけズレるため、
      // 保存完了の描画が落ち着いてから1回だけ計測し直す。
      setTimeout(() => {
        updateFavoriteSceneListScrollHint({ measure: true });
      }, 120);
    });

    if (refreshResults) {
      requestAnimationFrame(() => {
        window.setTimeout(() => search({ gotoPage: currentPage }), 0);
      });
    }
  };

  const scheduleSavedSceneUiCommit = (videoId, options = {}) => {
    window.clearTimeout(saveCommitTimer);
    modal.classList.add('is-saving-scene');
    if (saveBtn) saveBtn.disabled = true;

    // 先にキーボードを閉じ、visualViewportの復帰中は編集画面のDOM構造を維持する。
    // これにより、保存直後に「編集DOM→一覧DOM→キーボード閉じ」の順で再レイアウトされる一瞬のちらつきを防ぐ。
    try { commentInput.blur(); } catch (_) {}

    const startedAt = Date.now();
    const minWait = 0;
    const maxWait = 140;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const keyboardOpen = isSoftKeyboardLikelyOpen();
      if ((elapsed < minWait) || (keyboardOpen && elapsed < maxWait)) {
        saveCommitTimer = window.setTimeout(tick, 16);
        return;
      }
      requestAnimationFrame(() => finishSavedSceneUiCommit(videoId, options));
    };
    saveCommitTimer = window.setTimeout(tick, 0);
  };

  const startEditingScene = (sceneId) => {
    if (!pendingFavoriteEpisode?.id || !sceneId) return;
    const entry = getFavoriteSceneEntry(pendingFavoriteEpisode.id);
    const scene = entry?.timestamps?.find(ts => ts.id === sceneId);
    if (!scene) return;
    openEditor(scene);
  };

  const formatImpactInlineHtml = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const escaped = escapeHtml(raw);
    return raw.startsWith('#')
      ? `<span class="impact-number">${escaped}</span>`
      : escaped.replace(/([A-Za-z0-9]+)/g, '<span class="impact-number">$1</span>');
  };

  const getEpisodeInlineLabel = (episode) => {
    if (!episode || typeof episode !== 'object') return '';
    const candidates = [episode.title, episode.episode, episode.label];
    for (const candidate of candidates) {
      const raw = String(candidate || '').trim();
      if (!raw) continue;
      const hashMatch = raw.match(/#\s*[A-Za-z0-9-]+/);
      if (hashMatch) return hashMatch[0].replace(/#\s+/, '#');
      return raw;
    }
    return '';
  };

  const getModalThumbnailUrl = (episode) => {
    const explicit = String(episode?.thumbnail || '').trim();
    if (explicit) return explicit;
    const ep = String(episode?.episode || '').trim();
    return ep ? `thumbnails/${ep}.jpg` : './thumb-fallback.svg';
  };

  const renderFavoriteEpisodeCard = (episode) => {
    if (!episodeCardEl) return;
    // 元の .fav-scene-episode-card を残したまま、トップ画面カード寄せのクラスも付与する。
    // これを消してしまうと、後段CSSの幅・表示制御が一部効かず、
    // お気に入り一覧から開いた時に上部エピソードカードが見えないことがある。
    episodeCardEl.className = 'fav-scene-episode-card episode-item fav-scene-card-mirror';
    episodeCardEl.hidden = false;
    episodeCardEl.removeAttribute('aria-hidden');
    episodeCardEl.style.removeProperty('display');
    episodeCardEl.setAttribute('role', 'link');
    episodeCardEl.tabIndex = 0;

    const title = getEpisodeInlineLabel(episode) || episode?.title || '';
    const guest = String(episode?.guest || '').trim();
    const date = String(episode?.date || '').trim();
    const duration = String(episode?.duration || '').trim();
    const thumbUrl = getModalThumbnailUrl(episode);
    const link = String(episode?.link || '#').trim() || '#';
    const titleHtml = title.startsWith('#')
      ? `<span class="impact-number">${escapeHtml(title)}</span>`
      : escapeHtml(title).replace(/([A-Za-z0-9]+)/g, '<span class="impact-number">$1</span>');

    episodeCardEl.innerHTML = `
  <a href="${escapeHtml(link)}" target="_blank" rel="noopener" style="display:flex;text-decoration:none;color:inherit;align-items:center;min-width:0;">
    <div class="thumb-col">
      <img src="${escapeHtml(thumbUrl)}" class="thumbnail" alt="サムネイル：${escapeHtml(title)}"
           decoding="async" loading="eager" fetchpriority="high"
           onload="this.classList.add('loaded')"
           onerror="this.onerror=null; this.src='./thumb-fallback.svg'; this.classList.add('loaded');">
    </div>
    <div style="min-width:0;">
      <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
        <h5 class="mb-1">
          ${titleHtml}${/\u3000/.test(String(episode?.title || '')) ? "<br>" : " "}
          ${guest ? `<span class="guest-one-line" aria-label="${escapeHtml(guest)}" style="visibility: hidden;">${escapeHtml(guest)}</span>` : ''}
        </h5>
      </div>
      <div class="episode-meta fav-scene-card-meta">
        ${date ? `<div class="meta-one-line" style="visibility: hidden;">公開日時：<span class="impact-number">${escapeHtml(date)}</span></div>` : ''}
        ${duration ? `<div class="meta-one-line" style="visibility: hidden;">動画時間：<span class="impact-number">${escapeHtml(duration)}</span></div>` : ''}
      </div>
    </div>
  </a>
`;
    requestAnimationFrame(() => {
      // モーダル上部カードだけを表示状態へ戻す。
      // fitGuestLines() はトップ画面全カードを再計測するため、モーダル開閉時のカクつき原因になる。
      episodeCardEl.querySelectorAll('.guest-one-line, .meta-one-line').forEach(el => {
        el.style.visibility = 'visible';
      });
      updateFavoriteSceneListScrollHint();
    });
  };

  const openModal = (episode) => {
    clearClosingLayoutFreeze();
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pendingFavoriteEpisode = episode;
    const entry = getFavoriteSceneEntry(episode.id);
    currentDurationSeconds = parseDurationToSeconds(episode.duration);
    episodeInlineEl.innerHTML = '';
    if (episodeCardEl) {
      episodeCardEl.hidden = false;
      episodeCardEl.removeAttribute('aria-hidden');
      episodeCardEl.style.removeProperty('display');
    }
    renderFavoriteEpisodeCard(episode);
    commentInput.value = '';
    form.hidden = true;
    form.classList.remove('show');
    openEditorBtn.hidden = false;
    resetEditingState();
    setSavedHint('');
    updateRemoveButtonVisibility(false);
    buildFavoriteSceneList(episode.id);
    setCommentError('');
    closeEditor(false);
    try {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const rows = h <= 540 ? 2 : h <= 620 ? 3 : h <= 680 ? 4 : h <= 800 ? 5 : 7;
      modal.style.setProperty('--fav-scene-visible-rows-final', String(rows));
      modal.style.setProperty('--fav-scene-vv-height', `${Math.floor(h)}px`);
    } catch (_) {}
    window.acquireBodyLock?.();
    modal.hidden = false;
    modal.setAttribute('tabindex', '-1');
    try { modal.focus({ preventScroll: true }); } catch (_) { modal.focus(); }
    requestAnimationFrame(() => {
      modal.classList.add('show');
      updateFavoriteSceneListScrollHint({ measure: true });
      requestAnimationFrame(() => updateFavoriteSceneListScrollHint({ measure: true }));
      setTimeout(() => updateFavoriteSceneListScrollHint({ measure: true }), 180);
      if (document.fonts?.ready) document.fonts.ready.then(() => updateFavoriteSceneListScrollHint({ measure: true })).catch(() => {});
    });
  };

  let closeModalTimer = 0;
  const closeModal = () => {
    window.clearTimeout(saveCommitTimer);
    saveCommitTimer = 0;
    modal.classList.remove('is-saving-scene');

    // 保存直後のキーボード復帰/visualViewport同期が残っている状態で閉じると、
    // is-keyboard-open系クラスの付け外しとoverlay中央寄せが競合して1フレームだけズレる。
    // 閉じ始める前に現在の見た目を固定し、同期系クラスは即クリアする。
    freezeClosingLayout();
    modal.classList.remove('is-keyboard-open', 'is-vv-compact-keyboard', 'is-vv-tiny-keyboard', 'is-editor-focused', 'is-comment-focused');
    document.documentElement.classList.remove('vv-keyboard-open', 'vv-keyboard-compact', 'vv-keyboard-tiny');
    try { commentInput.blur(); } catch (_) {}

    const cleanupAfterClose = () => {
      modal.hidden = true;
      modal.classList.remove('closing', 'show', 'is-keyboard-open', 'is-vv-compact-keyboard', 'is-vv-tiny-keyboard', 'is-editor-focused', 'is-comment-focused');
      closeEditor(false);
      setCommentError('');
      resetEditingState();
      clearClosingLayoutFreeze();
      restorePreviousFocus();
      window.__syncBodyLockToUi?.();
    };

    // まれに二重発火で show が既に外れている場合も、見た目固定を解除して必ずロックを解放する。
    if (!modal.classList.contains('show')) {
      window.releaseBodyLock?.({ restore: false });
      cleanupAfterClose();
      return;
    }

    if (modal.classList.contains('closing')) return;
    modal.classList.remove('show');
    modal.classList.add('closing');
    window.clearTimeout(closeModalTimer);
    const finish = () => {
      closeModalTimer = 0;
      // body fixed方式ではないため、閉じる瞬間にscrollTo復元を走らせる必要はない。
      // ここでscrollToを挟むとiOS/PWAで背景が一瞬上下して見える。
      window.releaseBodyLock?.({ restore: false });
      cleanupAfterClose();
    };
    closeModalTimer = setTimeout(finish, 180);
  };

  commentInput.addEventListener('input', () => {
    const normalized = String(commentInput.value || '')
      .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
      .replace(/[：]/g, ':');
    if (commentInput.value !== normalized) commentInput.value = normalized;
    // 入力中は自由に書けるよう、保存時だけ形式チェックする
    setCommentError('');
    if (saveBtn) saveBtn.disabled = !commentInput.value.trim();
  });

  openEditorBtn.addEventListener('click', () => openEditor());

  inlineCancelBtn?.addEventListener('click', () => closeEditor(true));

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!pendingFavoriteEpisode || !pendingFavoriteEpisode.id) return;
    const parsed = parseFavoriteSceneCommentList(commentInput.value);
    if (!parsed.ok) {
      setCommentError(parsed.error, { html: parsed.html });
      return;
    }
    setCommentError('');
    const videoId = pendingFavoriteEpisode.id;
    const previousEntry = favoriteScenes[videoId] || getFavoriteSceneEntry(videoId) || { timestamps: [] };
    const previousBySeconds = new Map((previousEntry.timestamps || []).filter(ts => hasFavoriteSceneTime(ts.seconds)).map(ts => [Number(ts.seconds), ts]));

    const entry = {
      title: pendingFavoriteEpisode.title,
      episode: pendingFavoriteEpisode.episode,
      link: pendingFavoriteEpisode.link,
      duration: pendingFavoriteEpisode.duration,
      timestamps: []
    };

    entry.timestamps = sortFavoriteScenesForDisplay(parsed.scenes.map((parsedScene, index) => {
      const hasTime = hasFavoriteSceneTime(parsedScene.seconds);
      const old = hasTime ? previousBySeconds.get(Number(parsedScene.seconds)) : null;
      return {
        id: old?.id || `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        seconds: hasTime ? Number(parsedScene.seconds) : null,
        label: parsedScene.label || (hasTime ? formatTimestamp(parsedScene.seconds) : '??:??'),
        note: parsedScene.note,
        order: Number.isFinite(Number(parsedScene.inputOrder)) ? Number(parsedScene.inputOrder) : index,
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }));

    favoriteScenes[videoId] = entry;
    favorites.add(videoId);
    syncFavoriteFromScenes(videoId);
    updateFavoriteButtonsFor(videoId);
    scheduleSavedSceneUiCommit(videoId, { refreshResults: Boolean(showFavoritesOnly) });
  });

  list.addEventListener('click', e => {
    const del = e.target.closest('.fav-scene-delete');
    if (del) {
      if (!pendingFavoriteEpisode) return;
      e.preventDefault();
      e.stopPropagation();
      const videoId = pendingFavoriteEpisode.id;
      const entry = getFavoriteSceneEntry(videoId);
      if (!entry) return;
      const deletedSceneId = del.dataset.sceneId;
      entry.timestamps = entry.timestamps.filter(ts => ts.id !== deletedSceneId);
      if (editingSceneId === deletedSceneId) resetEditingState();
      if (entry.timestamps.length === 0) {
        removeFavoriteCompletely(videoId);
        updateRemoveButtonVisibility(false);
      } else {
        favoriteScenes[videoId] = entry;
        syncFavoriteFromScenes(videoId);
      }
      updateFavoriteButtonsFor(videoId);
      buildFavoriteSceneList(videoId);
      setSavedHint('', false);
      if (showFavoritesOnly) search({ gotoPage: currentPage });
      return;
    }

    const item = e.target.closest('.fav-scene-item');
    if (!item || !list.contains(item)) return;
    if (typeof e.clientX === 'number') {
      const rect = item.getBoundingClientRect();
      if (e.clientX > rect.right - 72) return;
    }
    const url = item.dataset.playUrl;
    if (url) openPlaybackUrl(url);
  });

  list.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.fav-scene-delete')) return;
    const item = e.target.closest('.fav-scene-item');
    if (!item || !list.contains(item)) return;
    e.preventDefault();
    const url = item.dataset.playUrl;
    if (url) openPlaybackUrl(url);
  });

  list.addEventListener('scroll', () => {
    updateFavoriteSceneListScrollHint();
  }, { passive: true });

  removeBtn.addEventListener('click', () => {
    if (!pendingFavoriteEpisode?.id) return;
    removeFavoriteCompletely(pendingFavoriteEpisode.id);
    updateFavoriteButtonsFor(pendingFavoriteEpisode.id);
    buildFavoriteSceneList(pendingFavoriteEpisode.id);
    updateRemoveButtonVisibility(false);
    if (showFavoritesOnly) search({ gotoPage: currentPage });
    closeModal();
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = getFocusableElements();
    if (focusables.length === 0) {
      e.preventDefault();
      try { modal.focus({ preventScroll: true }); } catch (_) { modal.focus(); }
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === modal || !modal.contains(active))) {
      e.preventDefault();
      try { last.focus({ preventScroll: true }); } catch (_) { last.focus(); }
      return;
    }
    if (!e.shiftKey && (active === last || active === modal || !modal.contains(active))) {
      e.preventDefault();
      try { first.focus({ preventScroll: true }); } catch (_) { first.focus(); }
    }
  });
  window.openFavoriteSceneModal = openModal;
  return { closeModal };
}

function setupModals() {
    const setup = (modalId, openTriggerId, closeBtnId) => {
        const modal = document.getElementById(modalId);
        const modalContent = modal ? modal.querySelector('.modal-content, #aboutModalContent') : null;
        const openTrigger = document.getElementById(openTriggerId);
        const closeBtn = document.getElementById(closeBtnId);
        if (!modal || !closeBtn || !modalContent) return { openModal: ()=>{}, closeModal: ()=>{} }; // openTriggerはnull許容に変更

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

            // ★追加: アニメーション開始前に一瞬だけ不可視状態で配置し、フォント計算を強制させる
            modal.style.display = 'flex';
            modal.style.opacity = '0';
            void modal.offsetWidth; // 強制リフロー（ここでフォントが適用される）

            requestAnimationFrame(() => {
                modal.style.display = ''; // インラインスタイルを消してCSSに任せる
                modal.style.opacity = '';
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
        
        if(openTrigger) {
            openTrigger.addEventListener('click', e => { e.preventDefault(); openModal(); });
        }
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
        
        return { openModal, closeModal };
    };

    const { closeModal: closeAbout } = setup('aboutModal', 'aboutSiteLink', 'aboutCloseBtn');
    const { closeModal: closeHistory } = setup('historyModal', 'historyToggle', 'historyCloseBtn');
    
    // ★追加: フォトメモリンク用モーダルのセットアップ
    const { openModal: openPhoto, closeModal: closePhoto } = setup('photoModal', null, 'photoCloseBtn');
    const { closeModal: closeFavoriteScene } = setupFavoriteSceneModal();
    
    // グローバルから呼べるようにする
    window.openPhotoModal = (ep) => {
      const links = linksData[ep] || [];
      const body = document.getElementById('photoBody');
      
      body.innerHTML = links.map(link => {
        const faIcon = link.platform === 'instagram' ? '<i class="fa-brands fa-instagram"></i>' : '<i class="fa-brands fa-x-twitter"></i>';
        return `
          <a href="${link.url}" target="_blank" rel="noopener" class="photo-link-btn">
            <span class="photo-link-icon">${faIcon}</span>
            <span class="photo-link-text">${link.text}</span>
          </a>
        `;
      }).join('');
      
      openPhoto();
    };
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('aboutModal')?.classList.contains('show')) closeAbout();
            if (document.getElementById('historyModal')?.classList.contains('show')) closeHistory();
            if (document.getElementById('photoModal')?.classList.contains('show')) closePhoto(); // ★追加
            if (document.getElementById('favSceneModal')?.classList.contains('show')) closeFavoriteScene();
        }
    });

    // ★追加: ひすとりーモーダルの内容を裏で事前に構築しておく（初回起動時のチラつき防止）
    const historyModal = document.getElementById('historyModal');
    if (historyModal && historyData && historyData.length > 0 && !historyModal.dataset.built) {
        buildTimeline(historyData);
        historyModal.dataset.built = 'true';
    }
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


function parseYouTubeStartSeconds(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Math.max(0, parseInt(raw, 10));
  if (/^\d+s$/.test(raw)) return Math.max(0, parseInt(raw, 10));
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return null;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  const total = h * 3600 + m * 60 + s;
  return Number.isFinite(total) ? Math.max(0, total) : null;
}

function getYouTubePlaybackInfo(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw, window.location.href);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') videoId = u.searchParams.get('v') || '';
      else if (u.pathname.startsWith('/shorts/')) videoId = u.pathname.split('/').filter(Boolean)[1] || '';
      else if (u.pathname.startsWith('/embed/')) videoId = u.pathname.split('/').filter(Boolean)[1] || '';
    }
    if (!/^[\w-]{11}$/.test(videoId)) return null;

    const start = parseYouTubeStartSeconds(u.searchParams.get('t')) ??
      parseYouTubeStartSeconds(u.searchParams.get('start')) ?? 0;
    const t = Math.max(0, Math.floor(start));
    const timeParam = t > 0 ? `&t=${t}s` : '';
    const encodedId = encodeURIComponent(videoId);
    return {
      videoId,
      seconds: t,
      webUrl: `https://www.youtube.com/watch?v=${encodedId}${timeParam}`,
      appUrl: `youtube://www.youtube.com/watch?v=${encodedId}${timeParam}`
    };
  } catch (_) {
    return null;
  }
}

function isStandalonePwaMode() {
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true ||
    document.documentElement.classList.contains('is-standalone')
  );
}

function isIOSFamilyDevice() {
  const ua = String(window.navigator.userAgent || '');
  const platform = String(window.navigator.platform || '');
  // iPadOS 13+ のSafariはMacとして名乗ることがあるため、タッチ点数も見る。
  return /iP(hone|ad|od)/.test(ua) || (platform === 'MacIntel' && Number(window.navigator.maxTouchPoints || 0) > 1);
}

function isIOSStandalonePwaMode() {
  return isStandalonePwaMode() && isIOSFamilyDevice();
}

function openPlaybackUrl(url) {
  const safeUrl = String(url || '').trim();
  if (!safeUrl || safeUrl === '#') return;

  const youtubeInfo = getYouTubePlaybackInfo(safeUrl);

  // iOS/iPadOS のPWA / ホーム画面アプリでは window.open(_blank) が白い空ページを残すことがある。
  // PC版PWAや通常ブラウザには影響させず、iOS/iPadOSのPWAだけYouTubeアプリへのdeep linkを優先する。
  if (youtubeInfo && isIOSStandalonePwaMode()) {
    let pageLeft = false;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener('pagehide', markLeft);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    const markLeft = () => {
      pageLeft = true;
      cleanup();
    };
    const onVisibilityChange = () => {
      if (document.hidden) markLeft();
    };

    window.addEventListener('pagehide', markLeft, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    try {
      window.location.href = youtubeInfo.appUrl;
    } catch (_) {
      cleanup();
      window.location.href = youtubeInfo.webUrl;
      return;
    }

    // YouTubeアプリが入っていない場合だけ、同じPWA内で通常URLへフォールバックする。
    // _blank は使わないため、謎の白ページは増えない。
    window.setTimeout(() => {
      cleanup();
      if (!pageLeft && !document.hidden) {
        window.location.href = youtubeInfo.webUrl;
      }
    }, 900);
    return;
  }

  const targetUrl = youtubeInfo ? youtubeInfo.webUrl : safeUrl;
  const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = targetUrl;
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
    search({ animateResults: true });
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
            // ★修正: 判定値を 991 から 1069 に変更
            if (window.innerWidth > 1069) {
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

        const loadingScreen = document.getElementById("loading-screen");
        if (loadingScreen) {
            // ローディング画面を消す共通関数（前回と同じく800ms待機）
            const hideLoadingScreen = () => {
                setTimeout(() => {
                    loadingScreen.classList.add("fadeout");
                    loadingScreen.addEventListener('transitionend', () => loadingScreen.remove(), { once: true });
                }, 800);
            };

            const htmlEl = document.documentElement;
            
            // 既にフォントの読み込みが完了している場合
            if (htmlEl.classList.contains('wf-active') || htmlEl.classList.contains('wf-inactive')) {
                hideLoadingScreen();
            } else {
                // まだ読み込み中の場合は完了の合図を監視
                const observer = new MutationObserver((mutations, obs) => {
                    if (htmlEl.classList.contains('wf-active') || htmlEl.classList.contains('wf-inactive')) {
                        obs.disconnect(); // 監視を終了
                        hideLoadingScreen();
                    }
                });
                observer.observe(htmlEl, { attributes: true, attributeFilter: ['class'] });
                
                // 通信エラー等に備えた保険（最大3秒で強制的に消す）
                setTimeout(() => {
                    observer.disconnect();
                    hideLoadingScreen();
                }, 3000);
            }
        }
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
    const modalIds = ['filterDrawer', 'aboutModal', 'historyModal', 'photoModal', 'favSceneModal'];
    let syncTimer = 0;
    const requestSync = () => {
        if (syncTimer) window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(() => {
            syncTimer = 0;
            window.__syncBodyLockToUi?.();
        }, 80);
    };
    const observer = new MutationObserver(requestSync);
    modalIds.forEach(id => {
        const modalElement = document.getElementById(id);
        if (modalElement) {
            observer.observe(modalElement, {
                attributes: true,
                attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
            });
        }
    });
    window.addEventListener('pageshow', requestSync, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(requestSync, 320), { passive: true });
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
    
    // ★修正: 先にDOMを追加してから表示を切り替える
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

    // ★追加: 中身を入れた後に表示状態を切り替え、フォント計算を強制
    boxEl.hidden = items.length === 0;
    if (!boxEl.hidden) {
        void boxEl.offsetHeight; // 強制リフロー
    }
  };

 const pick = (index) => {
        if (!viewItems[index]) return;
        inputEl.value = viewItems[index].label;
        clear();
        setTimeout(() => {
          search({ animateResults: true });
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
        search({ animateResults: true });
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

// キーボードの左右矢印キーでのページネーション操作
document.addEventListener('keydown', (e) => {
  // 検索ボックス等にフォーカスが当たっている場合はスキップ
  const activeEl = document.activeElement;
  if (activeEl && ['input', 'textarea', 'select'].includes(activeEl.tagName.toLowerCase())) {
    return;
  }

  // フィルタードロワーやモーダルが開いている場合はスキップ
  const filterDrawer = document.getElementById('filterDrawer');
  const historyModal = document.getElementById('historyModal');
  const aboutModal = document.getElementById('aboutModal');
  const photoModal = document.getElementById('photoModal'); // ★追加
  const favSceneModal = document.getElementById('favSceneModal');
  if ((filterDrawer && filterDrawer.style.display === 'block') || 
      (historyModal && historyModal.classList.contains('show')) ||
      (aboutModal && aboutModal.classList.contains('show')) ||
      (photoModal && photoModal.classList.contains('show')) ||
      (favSceneModal && favSceneModal.classList.contains('show'))) { // ★追加
    return;
  }

  const totalPage = Math.ceil(lastResults.length / pageSize);
  if (totalPage <= 1) return; // 1ページしかない場合は何もしない

  if (e.key === 'ArrowRight') {
    // 次のページへ
    if (currentPage < totalPage) {
      e.preventDefault(); // デフォルトのスクロール動作を無効化
      search({ gotoPage: currentPage + 1, animateResults: true });
      scrollToResultsTop();
    }
  } else if (e.key === 'ArrowLeft') {
    // 前のページへ
    if (currentPage > 1) {
      e.preventDefault(); // デフォルトのスクロール動作を無効化
      search({ gotoPage: currentPage - 1, animateResults: true });
      scrollToResultsTop();
    }
  }
});

/**
 * ===================================================
 * ★★★ Favorite scene modal keyboard viewport fix v84 ★★★
 * ===================================================
 * iOS Safari ではソフトキーボード表示時に fixed 要素の基準になる
 * layout viewport と、実際に見えている visualViewport がズレる。
 * 編集欄にフォーカスしている間だけ VisualViewport にモーダルを追従させ、
 * キーボード直上に自然に吸着させるための状態クラスとCSS変数を同期する。
 */
(function setupFavoriteSceneKeyboardViewportFix() {
  const root = document.documentElement;
  let rafId = 0;
  let revealTimer = 0;
  let delayedSyncTimers = [];
  let stableViewportHeight = Math.max(
    Number(window.innerHeight) || 0,
    Number(document.documentElement.clientHeight) || 0,
    Number(window.visualViewport?.height) || 0
  );

  const px = (value) => `${Math.max(0, Math.floor(Number(value) || 0))}px`;
  const getModal = () => document.getElementById('favSceneModal');
  const isEditableTarget = (el) => {
    if (!el) return false;
    const tag = String(el.tagName || '').toUpperCase();
    return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || el.isContentEditable;
  };

  const revealEditorActions = (modal) => {
    if (!modal || !modal.classList.contains('is-editing')) return;
    const scroller = modal.querySelector('.fav-scene-body');
    const actions = modal.querySelector('.fav-scene-save-btn');
    const cancel = modal.querySelector('#favSceneInlineCancelBtn');
    if (!scroller || !actions || !cancel) return;

    const vv = window.visualViewport;
    const visualBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const modalContent = modal.querySelector('.fav-scene-modal');
    const modalBottom = modalContent ? modalContent.getBoundingClientRect().bottom : visualBottom;
    const scrollerBottom = scroller.getBoundingClientRect().bottom;
    const safeBottom = Math.min(visualBottom, modalBottom, scrollerBottom) - 18;
    const actionBottom = Math.max(
      actions.getBoundingClientRect().bottom,
      cancel.getBoundingClientRect().bottom
    );
    const overflow = actionBottom - safeBottom;
    if (overflow <= 0) return;
    scroller.scrollTop += Math.ceil(overflow + 8);
  };

  const requestRevealEditorActions = (modal) => {
    window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => revealEditorActions(modal || getModal()), 90);
  };

  // v98: iOSキーボード表示時に flex/max-height の組み合わせでモーダル本文だけが
  // VisualViewportいっぱいに伸び、保存/キャンセル下に空白が出る問題への対策。
  // CSSだけでは iOS Safari の再計算タイミングに負けるため、編集中・入力欄フォーカス中だけ
  // 実際に見えている要素の高さを測り、モーダルと本文の高さを明示固定する。
  const parsePx = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  const outerHeight = (el) => {
    if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true') return 0;
    const rect = el.getBoundingClientRect();
    if (!rect.height) return 0;
    const st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return 0;
    return rect.height + parsePx(st.marginTop) + parsePx(st.marginBottom);
  };

  const clearCompactEditorHeight = (modal) => {
    if (!modal) return;
    const modalContent = modal.querySelector('.fav-scene-modal');
    const body = modal.querySelector('.fav-scene-body');
    [modalContent, body].forEach(el => {
      if (!el) return;
      el.style.removeProperty('height');
      el.style.removeProperty('max-height');
      el.style.removeProperty('overflow-y');
      el.style.removeProperty('overflow-x');
    });
  };

  const applyCompactEditorHeight = (modal, visualHeight) => {
    if (!modal || !modal.classList.contains('is-editing')) {
      clearCompactEditorHeight(modal);
      return;
    }

    const modalContent = modal.querySelector('.fav-scene-modal');
    const topbar = modal.querySelector('.fav-scene-topbar');
    const body = modal.querySelector('.fav-scene-body');
    const episodeCard = modal.querySelector('#favSceneEpisodeCard');
    const savedBox = modal.querySelector('.fav-scene-saved');
    const form = modal.querySelector('#favSceneForm:not([hidden])');
    if (!modalContent || !topbar || !body || !savedBox || !form) {
      clearCompactEditorHeight(modal);
      return;
    }

    const bodyStyle = window.getComputedStyle(body);
    const savedStyle = window.getComputedStyle(savedBox);
    const topbarHeight = outerHeight(topbar);
    const bodyPadding = parsePx(bodyStyle.paddingTop) + parsePx(bodyStyle.paddingBottom);
    const savedPadding = parsePx(savedStyle.paddingTop) + parsePx(savedStyle.paddingBottom);

    // body/savedBox は過去CSSで flex:1 になっている場合があるため、
    // それらの clientHeight / scrollHeight は使わず、実際に見える子要素だけを合算する。
    const bodyContentHeight = Math.ceil(
      bodyPadding +
      outerHeight(episodeCard) +
      savedPadding +
      outerHeight(form)
    );

    const safeMax = Math.max(260, Math.floor((Number(visualHeight) || window.innerHeight || 0) - 6));
    const bodyMax = Math.max(140, safeMax - Math.ceil(topbarHeight));
    const finalBodyHeight = Math.min(bodyContentHeight, bodyMax);
    const finalModalHeight = Math.min(safeMax, Math.ceil(topbarHeight) + finalBodyHeight);

    if (!Number.isFinite(finalBodyHeight) || !Number.isFinite(finalModalHeight) || finalBodyHeight <= 0 || finalModalHeight <= 0) {
      clearCompactEditorHeight(modal);
      return;
    }

    modalContent.style.setProperty('height', px(finalModalHeight), 'important');
    modalContent.style.setProperty('max-height', px(safeMax), 'important');
    modalContent.style.setProperty('overflow-y', 'hidden', 'important');
    modalContent.style.setProperty('overflow-x', 'hidden', 'important');

    body.style.setProperty('height', px(finalBodyHeight), 'important');
    body.style.setProperty('max-height', px(bodyMax), 'important');
    body.style.setProperty('overflow-y', bodyContentHeight > bodyMax + 1 ? 'auto' : 'hidden', 'important');
    body.style.setProperty('overflow-x', 'hidden', 'important');
  };

  const sync = () => {
    rafId = 0;
    const modal = getModal();
    const vv = window.visualViewport;
    const layoutHeight = Math.max(
      Number(window.innerHeight) || 0,
      Number(document.documentElement.clientHeight) || 0
    );
    const visualHeight = vv ? vv.height : layoutHeight;
    const visualWidth = vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 0);
    const offsetTop = vv ? vv.offsetTop : 0;
    const offsetLeft = vv ? vv.offsetLeft : 0;
    const keyboardHeight = Math.max(0, layoutHeight - visualHeight - offsetTop);
    const active = document.activeElement;
    const modalIsOpen = Boolean(modal && !modal.hidden && modal.classList.contains('show'));
    if (modal && (modal.hidden || modal.classList.contains('closing') || modal.classList.contains('is-closing-stable') || !modalIsOpen)) {
      clearCompactEditorHeight(modal);
      modal.classList.remove('is-editor-focused', 'is-comment-focused', 'is-keyboard-open', 'is-vv-compact-keyboard', 'is-vv-tiny-keyboard');
      root.classList.remove('vv-keyboard-open', 'vv-keyboard-compact', 'vv-keyboard-tiny');
      root.style.setProperty('--app-keyboard-height', '0px');
      return;
    }
    const focusedInModal = Boolean(modal && active && modal.contains(active) && isEditableTarget(active));
    const commentFocused = Boolean(modal && active && active.id === 'favSceneCommentInput');
    const mobileViewport = visualWidth <= 779 || window.matchMedia?.('(max-width: 779px)')?.matches;
    if (!focusedInModal) {
      stableViewportHeight = Math.max(stableViewportHeight, layoutHeight, visualHeight + offsetTop);
    }
    const shrinkFromStable = Math.max(0, stableViewportHeight - visualHeight - offsetTop);
    // v97: モバイル幅というだけで keyboard-open 扱いにすると、iOS が入力欄を自動スクロールした瞬間に
    // モーダル本文だけが余った高さまで伸び、保存/キャンセル下に大きな空白が出ることがある。
    // 実際に VisualViewport が縮んだ時だけ keyboard-open にし、フォーカス中の見た目調整は is-comment-focused で行う。
    const keyboardOpen = modalIsOpen && focusedInModal && (keyboardHeight > 80 || shrinkFromStable > 80);
    const compactKeyboard = keyboardOpen && visualHeight <= 560;
    const tinyKeyboard = keyboardOpen && visualHeight <= 480;

    root.style.setProperty('--app-vv-height', px(visualHeight));
    root.style.setProperty('--app-vv-width', px(visualWidth));
    root.style.setProperty('--app-vv-offset-top', px(offsetTop));
    root.style.setProperty('--app-vv-offset-left', px(offsetLeft));
    root.style.setProperty('--app-keyboard-height', px(keyboardHeight));

    root.classList.toggle('vv-keyboard-open', keyboardOpen);
    root.classList.toggle('vv-keyboard-compact', compactKeyboard);
    root.classList.toggle('vv-keyboard-tiny', tinyKeyboard);

    if (modal) {
      modal.classList.toggle('is-editor-focused', focusedInModal);
      modal.classList.toggle('is-comment-focused', commentFocused);
      modal.classList.toggle('is-keyboard-open', keyboardOpen);
      modal.classList.toggle('is-vv-compact-keyboard', compactKeyboard);
      modal.classList.toggle('is-vv-tiny-keyboard', tinyKeyboard);
      if (keyboardOpen || commentFocused) {
        // v99: 入力中も「入力前のモーダル形状」を保つため、
        // v98 の inline height 固定は使わない。iOS の入力補助スクロール後に
        // height/max-height が残ると、保存・キャンセル下の余白が再発する。
        clearCompactEditorHeight(modal);
      } else {
        clearCompactEditorHeight(modal);
      }
    }
  };

  const requestSync = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(sync);
  };

  const delayedSync = () => {
    const modal = getModal();
    if (modal && (modal.hidden || modal.classList.contains('closing') || modal.classList.contains('is-closing-stable'))) return;
    // 入力のたびに複数のsetTimeoutを積み増すと、低性能端末で重くなる。
    // 常に最新の同期予約だけ残す。
    delayedSyncTimers.forEach(timerId => window.clearTimeout(timerId));
    delayedSyncTimers = [];
    requestSync();
    [80, 220, 420, 700].forEach(delay => {
      delayedSyncTimers.push(window.setTimeout(requestSync, delay));
    });
  };

  document.addEventListener('focusin', (event) => {
    const modal = getModal();
    if (modal && modal.contains(event.target)) delayedSync();
  }, true);

  document.addEventListener('focusout', (event) => {
    const modal = getModal();
    if (modal && modal.contains(event.target)) delayedSync();
  }, true);

  window.addEventListener('resize', requestSync, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(requestSync, 120), { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', requestSync, { passive: true });
    window.visualViewport.addEventListener('scroll', requestSync, { passive: true });
  }

  // Bootstrapや自前アニメーションの後に show クラスが付くため、クリック/タップ後も少し遅らせて同期する。
  document.addEventListener('click', (event) => {
    const modal = getModal();
    if (modal && modal.contains(event.target)) delayedSync();
  }, true);

  document.addEventListener('input', (event) => {
    const modal = getModal();
    if (modal && event.target && event.target.id === 'favSceneCommentInput') delayedSync();
  }, true);

  sync();
})();
