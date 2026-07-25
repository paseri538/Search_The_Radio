let isInputFocused = false;

// リロードのたびにブラウザがスクロール位置を復元し、動的ビューポート(iOSのアドレスバー等)や
// 非同期描画とのズレで少しずつ下へずれていくのを防ぐ。常に先頭表示が正しいサイトなので
// 復元は手動管理にし、初期化時と読み込み完了時に先頭へ戻す。
if ('scrollRestoration' in history) {
  try { history.scrollRestoration = 'manual'; } catch (e) {}
}
const resetScrollTop = () => { try { window.scrollTo(0, 0); } catch (e) {} };
window.addEventListener('load', resetScrollTop);
window.addEventListener('pageshow', resetScrollTop); // BFキャッシュ復帰時も先頭へ

/**
 * ===================================================
 * ★★★ データと状態管理 ★★★
 * ===================================================
 */
let data = [];
let CUSTOM_READINGS = {};
let READING_TO_LABEL = {}; // 読み仮名から正規表記へのマップ
// ★性能: 検索のたびに全キーへ normalize() をかけ直さないよう、読み仮名辞書の
// 正規化済みインデックスを起動時に1回だけ構築してキャッシュする（低速端末対策）
let READINGS_INDEX = [];
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

/* ===================================================
 * タイムスタンプ機能（お気に入りの後継）
 * localStorage に { videoId: [{ t: 秒数, label: 文字列 }, ...] } を保存。
 * タイムスタンプが1件以上ある回を「お気に入り」として扱う。
 * =================================================== */
const TS_KEY = 'str_timestamps_v1';
const FAV_KEY = 'str_favs_v1'; // 旧お気に入りキー（初回移行にのみ使用）
// ブラウザに「このサイトのデータを自動削除しないで」と申告する（対応環境のみ・失敗しても無害）。
// 容量逼迫時の自動退避（eviction）からlocalStorageのタイムスタンプを守る。
// SafariのITP（7日間未訪問での削除）まで防げる保証はないため、あくまで補助的な保険。
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}
let timestamps = loadTimestamps();
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

// localStorageのデータは手動編集や拡張機能・過去バージョンの不具合で壊れている可能性が
// あるため、読み込み時に形を検証して正常なエントリだけを残す。
// （不正な1件のせいで一覧描画や検索がクラッシュするのを防ぐ）
function sanitizeTimestamps(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, arr] of Object.entries(raw)) {
    if (!Array.isArray(arr)) continue;
    const clean = arr
      .filter(e => e && typeof e === 'object')
      .map(e => ({
        t: (typeof e.t === 'number' && isFinite(e.t) && e.t >= 0) ? Math.floor(e.t) : null,
        label: typeof e.label === 'string' ? e.label.slice(0, 500) : ''
      }))
      .filter(e => e.t != null || e.label);
    if (clean.length) out[id] = clean;
  }
  return out;
}

function loadTimestamps() {
  try {
    const stored = localStorage.getItem(TS_KEY);
    if (stored) return sanitizeTimestamps(JSON.parse(stored));
    // 初回のみ: 旧お気に入りを「0:00 お気に入り」として引き継ぐ
    const oldFavs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    const migrated = {};
    if (Array.isArray(oldFavs)) {
      oldFavs.filter(id => typeof id === 'string').forEach(id => { migrated[id] = [{ t: 0, label: 'お気に入り' }]; });
    }
    if (Object.keys(migrated).length) localStorage.setItem(TS_KEY, JSON.stringify(migrated));
    return migrated;
  } catch { return {}; }
}
function saveTimestamps() {
  try { localStorage.setItem(TS_KEY, JSON.stringify(timestamps)); } catch (e) { console.error("Failed to save timestamps:", e); }
}
function getTimestamps(id) { return (id && timestamps[id]) ? timestamps[id] : []; }
function isFavorite(id) { return getTimestamps(id).length > 0; }
// 時間指定なし（t: null）のメモは末尾に並べる
function compareTs(a, b) {
  if (a.t == null && b.t == null) return 0;
  if (a.t == null) return 1;
  if (b.t == null) return -1;
  return a.t - b.t;
}
// 全件を置き換え（登録・編集の保存用）。保存は1回だけ行う。
function setTimestampsAll(id, entries) {
  if (!id) return;
  if (entries.length === 0) { delete timestamps[id]; }
  else { timestamps[id] = entries.slice().sort(compareTs); }
  saveTimestamps();
}
// "1:28:30" / "57:50" のような時間表記 → 秒数（不明なら null）
function durationToSec(str) {
  const m = (str || '').trim().match(/^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  return (m[1] ? parseInt(m[1], 10) * 3600 : 0) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
}
// 全エピソードのタイムスタンプ（＝お気に入り）を一括削除する
function clearAllTimestamps() {
  for (const key of Object.keys(timestamps)) delete timestamps[key];
  saveTimestamps();
}

function removeTimestamp(id, index) {
  if (!timestamps[id]) return;
  timestamps[id].splice(index, 1);
  if (timestamps[id].length === 0) delete timestamps[id];
  saveTimestamps();
}
// 秒数 → "3:00" / "1:03:00" 表記
function formatTs(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
// "3:00 好きなシーン" → { t: 180, label: "好きなシーン" } | null
function parseTsInput(raw) {
  const text = (raw || '').trim().replace(/[：]/g, ':').replace(/[　]/g, ' ');
  const m = text.match(/^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})(?:\s+(.*))?$/s);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const mm = parseInt(m[2], 10), ss = parseInt(m[3], 10);
  if (ss > 59 || (m[1] && mm > 59)) return null;
  const t = h * 3600 + mm * 60 + ss;
  const label = (m[4] || '').trim();
  return { t, label };
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
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
// ★性能: 一致フラグ配列を呼び出しごとに生成せず使い回す（結果は完全に同一）
let _jwM1 = new Uint8Array(0);
let _jwM2 = new Uint8Array(0);
function jaroWinkler(s1, s2) {
  let m = 0;
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1 === s2) return 1;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (_jwM1.length < s1.length) _jwM1 = new Uint8Array(s1.length);
  if (_jwM2.length < s2.length) _jwM2 = new Uint8Array(s2.length);
  _jwM1.fill(0, 0, s1.length);
  _jwM2.fill(0, 0, s2.length);
  const s1Matches = _jwM1;
  const s2Matches = _jwM2;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = 1;
      s2Matches[j] = 1;
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
// ★性能: 旧実装は呼び出しごとに2次元配列＋文字位置マップを生成しており、
// 「もしかして」計算（1検索で全コーパス語×最大2回呼ばれる）のGC負荷が
// 低速端末で支配的だった。使い回しのフラットInt32Arrayに変更。
// 漸化式・返り値は旧実装と完全に同一。
let _dlBuf = new Int32Array(0);
const _dlSd = new Map();
function damerauLevenshtein(source, target) {
  if (!source) return target ? target.length : 0;
  if (!target) return source.length;
  const n = source.length;
  const m = target.length;
  const C = m + 2; // 列数（フラット配列の行ストライド）
  if (_dlBuf.length < (n + 2) * C) _dlBuf = new Int32Array((n + 2) * C);
  const score = _dlBuf;
  const INF = n + m;
  score[0] = INF;
  for (let i = 0; i <= n; i++) { score[(i + 1) * C + 1] = i; score[(i + 1) * C] = INF; }
  for (let j = 0; j <= m; j++) { score[C + j + 1] = j; score[j + 1] = INF; }
  _dlSd.clear();
  for (let i = 0; i < n; i++) _dlSd.set(source[i], 0);
  for (let j = 0; j < m; j++) if (!_dlSd.has(target[j])) _dlSd.set(target[j], 0);
  for (let i = 1; i <= n; i++) {
    let DB = 0;
    for (let j = 1; j <= m; j++) {
      const i1 = _dlSd.get(target[j - 1]);
      const j1 = DB;
      let v;
      if (source[i - 1] === target[j - 1]) {
        v = score[i * C + j];
        DB = j;
      } else {
        const a = score[i * C + j], b = score[(i + 1) * C + j], c = score[i * C + j + 1];
        v = (a < b ? (a < c ? a : c) : (b < c ? b : c)) + 1;
      }
      const trans = score[i1 * C + j1] + (i - i1 - 1) + 1 + (j - j1 - 1);
      score[(i + 1) * C + (j + 1)] = v < trans ? v : trans;
    }
    _dlSd.set(source[i - 1], i);
  }
  return score[(n + 1) * C + (m + 1)];
}

// 6. ダイス係数 & ユニグラム
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

  if (!window.corpusIndex) return [];

  const candidatesMap = new Map();

  // クエリ側の文字集合は1回だけ作る（unigramSimilarityと同一の計算に使用）
  const qUniSet = new Set(normQuery.split(''));

  // ★性能: 単語ごとの superNormalize / baseCharNormalize は起動時に計算済みの
  // corpusIndex を参照する（毎回の検索で数千回の正規化処理が消える。結果は同一）
  for (const entry of window.corpusIndex) {
    const word = entry.w;
    const normTarget = entry.norm;
    const baseTarget = entry.base;

    let finalScore = 0;

    const jwScore = jaroWinkler(normQuery, normTarget) * 100;
    const len = Math.max(normQuery.length, normTarget.length);
    const subScore = getSubsequenceScore(normQuery, normTarget);
    // unigramSimilarity と同一の計算（(2×共通文字数)/(集合サイズ和)）を、
    // 事前計算済みの文字集合で行う（毎回2つのSetを生成しない）
    let uniInter = 0;
    qUniSet.forEach(ch => { if (entry.uniSet.has(ch)) uniInter++; });
    const uniScore = ((2 * uniInter) / (qUniSet.size + entry.uniSet.size)) * 100;
    let best = Math.max(jwScore, subScore, uniScore);

    // ★性能: 編集距離は「長さの差」以上になることが保証されるため、
    // その上限スコア (1-|Δ長|/len)*100 が既に他のスコア以下なら計算しても
    // 最終スコア(max)は変わらない → 計算自体を省略できる（結果は完全に同一）
    let dlScore = 0;
    const dlUb = (1 - Math.abs(normQuery.length - normTarget.length) / len) * 100;
    if (dlUb > best) {
      const dist = damerauLevenshtein(normQuery, normTarget);
      dlScore = Math.max(0, (1 - dist / len) * 100);
      if (dlScore > best) best = dlScore;
    }

    let baseScore = 0;
    if (baseQuery === baseTarget && baseQuery.length > 1) {
        baseScore = 95;
    } else {
        // 上と同じ理屈で、上限が既存スコア以下なら省略（maxの結果は不変）
        const baseUb = (1 - Math.abs(baseQuery.length - baseTarget.length) / len) * 100;
        if (baseUb > best) {
          const baseDist = damerauLevenshtein(baseQuery, baseTarget);
          baseScore = Math.max(0, (1 - baseDist / len) * 100);
        }
    }

    finalScore = Math.max(best, baseScore);

    if (isRomajiInput) {
       // ローマ字変換は必要になった時だけ行い、エントリにキャッシュする
       if (entry.roman == null) entry.roman = kanaToRomaji(normTarget);
       const romanJw = jaroWinkler(romanQuery, entry.roman) * 100;
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
    // 補助データ（読み仮名・キーワード・履歴など）は1つ欠けてもサイト全体を壊さず、
    // フォールバック値で続行する。episodes.json だけは必須なので失敗したらエラー表示。
    const safeFetchJson = (url, fallback) =>
      fetch(url).then(res => res.ok ? res.json() : fallback).catch(() => fallback);

    const [episodesRes, readingsData, keywordsData, luckyData, histData, kwData, lData] = await Promise.all([
      fetch('episodes.json'),
      safeFetchJson('readings.json', {}),
      safeFetchJson('keywords.json', {}),
      safeFetchJson('lucky-button.json', {}),
      safeFetchJson('history.json', []),
      safeFetchJson('kessokuband_watasi.json', {}),
      safeFetchJson('links.json', {})
    ]);
    if (!episodesRes.ok) throw new Error(`episodes.json: HTTP ${episodesRes.status}`);
    const episodesData = await episodesRes.json();
    if (!Array.isArray(episodesData)) throw new Error('episodes.json: 配列ではありません');
    luckyButtonData = (luckyData && typeof luckyData === 'object') ? luckyData : {};
    historyData = Array.isArray(histData) ? histData : [];
    kessokuWatasiData = (kwData && typeof kwData === 'object') ? kwData : {};
    linksData = (lData && typeof lData === 'object') ? lData : {};

    data = episodesData.map(ep => {
      const keywordsWithoutTimestamp = (ep.keywords || []).map(stripTimeSuffix);
      const guestText = Array.isArray(ep.guest) ? ep.guest.join(" ") : ep.guest;
      const combined = [ep.title, guestText, keywordsWithoutTimestamp.join(" ")].join(" ");
      ep.searchText = normalize(combined);
      // ★性能: 検索・お気に入り判定のたびに正規表現でIDを取り直さないよう1回だけ抽出
      ep.videoId = getVideoId(ep.link);
      // ★性能: 「キーワード@時刻」の解析と正規化も起動時に済ませる（findHitTime用）
      ep.kwTimes = (ep.keywords || []).map(parseKeywordTime).filter(Boolean)
        .map(p => ({ base: p.base, label: p.label, seconds: p.seconds, baseN: normalize(p.base) }));
      return ep;
    });

    CUSTOM_READINGS = {
      ...((readingsData && typeof readingsData === 'object') ? readingsData : {}),
      ...((keywordsData && typeof keywordsData === 'object') ? keywordsData : {})
    };
    for (const kanji in CUSTOM_READINGS) {
      (CUSTOM_READINGS[kanji] || []).forEach(r => {
        READING_TO_LABEL[normalize(r)] = kanji;
      });
    }

    // ★性能: getFilteredData が検索のたびに全キー・全読みへ normalize() をかけていたのを、
    // ここで1回だけ正規化してインデックス化する（結果は完全に同一）
    READINGS_INDEX = Object.entries(CUSTOM_READINGS).map(([key, readings]) => ({
      normKey: normalize(key),
      normReadings: (readings || []).map(r => normalize(r))
    }));

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

    // ★性能: findDidYouMean（もしかして候補）が検索のたびに全コーパス語へ
    // superNormalize / baseCharNormalize をかけ直していたのを、ここで1回だけ
    // 計算してキャッシュする。ローマ字形は初回必要時に遅延計算（roman: null）。
    window.corpusIndex = Array.from(window.searchCorpus, w => {
      const norm = superNormalize(w);
      // uniSet: ユニグラム類似度用の文字集合（毎検索でSetを作り直さないための事前計算）
      return { w, norm, base: baseCharNormalize(norm), roman: null, uniSet: new Set(norm.split('')) };
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

    // ---- フォントの明示プリロード（FOUT＝一瞬フォールバック表示 の防止） ----
    // データだけでなく、履歴・関連リンク・画面内の静的テキストまで全ての文字を集め、
    // document.fonts.load() で必要なサブセットを先に読み込む。読み込み完了までは
    // ローディング画面で隠すため（下記 __fontsReady を待つ）、どの文字も
    // 最初からAdobeフォントで表示され、一瞬だけ別フォントになる現象が起きない。
    let corpus = Array.from(allChars).join('');
    try {
      corpus += JSON.stringify(data) + JSON.stringify(historyData || '') + JSON.stringify(linksData || '');
      if (document.body) corpus += (document.body.textContent || '');
    } catch (e) {}
    const uniqueChars = Array.from(new Set(corpus)).join('');

    // 全文字ぶんのフォントを読み込む Promise。ローディング画面はこれ（＋上限時間）を待つ。
    // Adobe本文フォント(400/700)に加え、番号・日時に使う Impact Numbers も先読みする。
    const impactChars = '0123456789#:.／/・-〜~ ' + uniqueChars;
    window.__fontsReady = (async () => {
      try {
        if (document.fonts && document.fonts.load) {
          await Promise.all([
            document.fonts.load('400 1em fot-udkakugoc70-pro', uniqueChars),
            document.fonts.load('700 1em fot-udkakugoc80-pro', uniqueChars),
            document.fonts.load('1em "Impact Numbers"', impactChars),
          ]);
          await document.fonts.ready;
        }
      } catch (e) {}
    })();

    // 互換フォールバック: document.fonts 非対応環境では隠しdivでも読み込ませる
    if (!(document.fonts && document.fonts.load)) {
      const hiddenFontDiv = document.createElement('div');
      hiddenFontDiv.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;font-family:fot-udkakugoc70-pro,fot-udkakugoc80-pro,sans-serif;';
      hiddenFontDiv.innerHTML = `<span style="font-weight:400">${uniqueChars}</span><span style="font-weight:700">${uniqueChars}</span>`;
      document.body && document.body.appendChild(hiddenFontDiv);
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

  if (!applyStateFromURL({ replace: true })) {
    search();
  }

  setupEventListeners();
  initializeAutocomplete();
  setupThemeSwitcher();
  setupModals();
  // 「このサイトについて」にバージョンを表示（PWAの更新反映確認用）
  const verEl = document.getElementById('appVersionLabel');
  if (verEl && window.__APP_VERSION) verEl.textContent = 'ver.' + window.__APP_VERSION;
  setupShareButtons();
  setupRightClickModal();
  formatYearButtons();
  updateHeaderOffset();
  console.log("Application initialized.");
}

/* ★削除: preloadThumbsFromData()
 * 全サムネイル(約8MB)を起動直後に一括preloadしていたが、初回表示の帯域を圧迫し
 * モバイルの通信量も浪費するため廃止。カード画像はloading="lazy"で必要時に読み込み、
 * オフライン用の全件キャッシュはService Workerがバックグラウンドで1回だけ行う。 */

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
    // ★性能: 起動時に正規化済みの READINGS_INDEX を使う（挙動は従来と同一）
    for (const entry of READINGS_INDEX) {
        if (entry.normKey.includes(normalizedQuery) || entry.normReadings.some(r => r.includes(normalizedQuery))) {
            searchTerms.add(entry.normKey);
            entry.normReadings.forEach(r => searchTerms.add(r));
        }
    }
    const searchWords = [...searchTerms].filter(Boolean);
    // サイト側キーワードに加え、ユーザーが登録したタイムスタンプのメモも検索対象にする
    res = res.filter(it => searchWords.some(word => it.searchText.includes(word)) || matchesUserMemo(it, searchWords));
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
  if (showFavoritesOnly) res = res.filter(it => isFavorite(it.videoId));

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

  // イースターエッグ: getFilteredData内に置くと候補検証などで1回の検索中に
  // 何度も呼ばれ多重発火するため、検索の起点であるここで1回だけ判定する
  if (normalize(rawQuery).includes('いいね')) {
    rainGoodMarks();
  }

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

  // ページ番号は必ず結果の総ページ数の範囲内に収める
  // （URLの ?p= に過大な値が入っていても空ページにならない）
  const totalPage = Math.max(1, Math.ceil(res.length / pageSize));
  currentPage = Math.min(Math.max(1, opts.gotoPage || 1), totalPage);
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
  if (searchBox) {
    searchBox.value = "";
    searchBox.dispatchEvent(new Event('input'));
  }
  if (sortSelect) sortSelect.value = "newest";

  if (showFavoritesOnly) {
    // ★変更: 登録データ（タイムスタンプ）は消さず、絞り込みモードだけを解除する
    showFavoritesOnly = false;
    document.body.classList.remove('fav-only');
    const favBtn = document.getElementById("favOnlyToggleBtn");
    if (favBtn) {
      favBtn.classList.remove("active");
      favBtn.setAttribute("aria-pressed", "false");
    }
  }

  resetFilters();
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }

  if (typeof window.toggleFilterDrawer === 'function') {
    window.toggleFilterDrawer(false);
  }
  document.getElementById('mainResetBtn')?.blur();

  // ★追加: リセットボタンを押した際に、サイトの最新版がないかチェックする
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        // 更新があればダウンロードを開始し、完了次第 index.html 側でリロードされる
        reg.update();
      }
    });

    // ★強制反映: reg.update() は CDN（GitHub Pagesは約10分キャッシュ）から
    // 古い sw.js を掴んで「更新なし」と誤判定することがあり、PWAでは更新が
    // なかなか反映されなかった。毎回ユニークなクエリでCDNキャッシュを確実に
    // 回避して最新の sw.js を取得し、バージョンが現在と異なる時だけ
    // そのバージョン名のURLで再登録する（新しいURL＝確実に新SWとして
    // インストールされ、controllerchange経由でスプラッシュ付き自動リロードされる。
    // 再登録URLは新しいindex.htmlが登録するURLと同じ形式なので以後も一本化される）。
    fetch('/sw.js?nocache=' + Date.now(), { cache: 'no-store' })
      .then(res => res.ok ? res.text() : null)
      .then(txt => {
        if (!txt || !window.__APP_VERSION) return;
        const m = txt.match(/SW_VERSION\s*=\s*'([^']+)'/);
        if (m && m[1] && m[1] !== window.__APP_VERSION) {
          navigator.serviceWorker.register('/sw.js?' + m[1]);
        }
      })
      .catch(() => {}); // オフライン等は無視（通常のリセット動作は既に完了している）
  }
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
// カードの★アイコンと件数バッジをタイムスタンプ登録状況に同期する
function updateFavStar(li) {
  const favBtn = li.querySelector('.fav-btn');
  if (!favBtn) return;
  const count = getTimestamps(favBtn.dataset.id).length;
  const active = count > 0;
  li.classList.toggle('is-fav', active);
  favBtn.classList.toggle('active', active);
  const icon = favBtn.querySelector('i');
  icon.classList.toggle('fa-solid', active);
  icon.classList.toggle('fa-regular', !active);
  const badge = favBtn.querySelector('.fav-count');
  if (badge) {
    badge.textContent = count;
    badge.hidden = !active;
  }
}

// エピソードのゲスト/出演者テキスト（カードとタイムスタンプモーダルで共用）
function getEpisodeGuestText(it) {
  if (it.episode.startsWith("京まふ大作戦") || it.episode === "CENTRALSTATION") {
    const guestList = Array.isArray(it.guest) ? it.guest : [it.guest].filter(Boolean);
    const members = [...new Set(["青山吉能", ...guestList])];
    return "出演：" + members.join("、");
  }
  if (Array.isArray(it.guest)) return "ゲスト：" + it.guest.join("、");
  if (it.guest === "青山吉能") return "パーソナリティ：青山吉能";
  if (it.guest && it.guest !== "その他") return `ゲスト：${it.guest}`;
  return "";
}

function renderResults(arr, page = 1, originalQuery = null, suggestions = []) {
  const ul = document.getElementById("results");
  ul.innerHTML = "";

  if (showFavoritesOnly) {
    const liFav = document.createElement('li');
    liFav.className = 'favorites-title-header';
    liFav.style.gridColumn = "1 / -1";
    
    // ★タイトルとボタンをセットで表示（お気に入りがある時だけ一括削除ボタンも出す）
    const hasFavorites = Object.keys(timestamps).length > 0;
    liFav.innerHTML = `
      <div class="favorites-header-layout">
        <div class="favorites-title-inner">
          <span>★お気に入り★</span>
        </div>
        <div class="fav-header-actions">
          <button id="favGoHomeBtn" class="fav-home-btn">
            <i class="fa-solid fa-rotate-left"></i> トップへ戻る
          </button>
          ${hasFavorites ? `
          <button id="favClearAllBtn" class="fav-clear-btn" aria-label="お気に入りをすべて削除">
            <i class="fa-solid fa-trash-can"></i> すべて削除
          </button>` : ''}
        </div>
        ${hasFavorites ? `
        <div id="favClearConfirm" class="ts-clear-confirm fav-clear-confirm" hidden role="alertdialog" aria-labelledby="favClearConfirmText">
          <p id="favClearConfirmText" class="ts-clear-confirm-text">すべてのお気に入りと登録済みタイムスタンプを削除します。<span class="ts-clear-confirm-q">よろしいですか？</span></p>
          <div class="ts-clear-confirm-actions">
            <button id="favClearCancelBtn" class="ts-clear-cancel-btn">キャンセル</button>
            <button id="favClearOkBtn" class="ts-clear-ok-btn"><i class="fa-solid fa-trash-can"></i><span>すべて削除</span></button>
          </div>
        </div>` : ''}
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
    // ★セキュリティ修正: インラインonclickへの文字列連結をやめ、data属性＋イベント委譲に変更
    //   （検索語に引用符やHTML特殊文字が含まれても壊れず、スクリプト注入もできない）
    const createBtn = (word) => `
      <button class="dym-word-btn" data-word="${escapeHtml(word)}" style="margin: 4px; opacity: 0;">
        ${escapeHtml(word)}
      </button>
    `;

    // 最初のボタンたち
    let buttonsHtml = firstBatch.map(createBtn).join('');

    // 隠れている分がある場合の「もっと見る」ボタンと隠しエリア
    if (!showAll) {
      // 「もっと見る」ボタン自体は調整不要なので opacity: 1 でOK（またはクラス指定に従う）
      buttonsHtml += `
        <button id="dymShowMoreBtn" class="dym-word-btn" style="margin: 4px; background: transparent; border: 1px dashed currentColor; opacity: 0.8;">
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
    const videoId = it.videoId;
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

    let guestText = getEpisodeGuestText(it);

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
           loading="lazy" decoding="async"
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
      <div class="episode-meta ${hasPhotoBtn ? 'has-photo-btn' : ''}">
        <div class="meta-one-line" style="visibility: hidden;">公開日時：<span class="impact-number">${it.date}</span></div>
        <div class="meta-one-line" style="visibility: hidden;">動画時間：${(it.duration ? `<span class="impact-number">${it.duration}</span>` : '?')}</div>
      </div>
    </div>
  </a>
  ${photoBtnHtml}
  <button class="fav-btn" data-id="${videoId}" data-link="${it.link}" data-title="${escapeHtml(hashOnly)}" data-duration="${it.duration || ''}" aria-label="タイムスタンプ" title="タイムスタンプ"><i class="fa-regular fa-star"></i><span class="fav-count" hidden></span></button>
`;
    
    updateFavStar(li);
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
  // 検索キーワードやフィルター値はURLパラメータ(?q= 等)経由でも入るため、必ずエスケープする
  if (searchBox.value.trim()) {
    html += `<button class="filter-tag" tabindex="0" aria-label="キーワード解除" data-type="keyword">
               <i class="fa fa-search"></i> "${escapeHtml(searchBox.value.trim())}" <i class="fa fa-xmark"></i>
             </button>`;
  }
  selectedGuests.forEach(g => {
    const style = g === "結束バンド"
      ? `style="background:linear-gradient(90deg, #fa01fa 0 25%, #fdfe0f 25% 50%, #15f4f3 50% 75%, #f93e07 75% 100%);color:#222;border:none;"`
      : (guestColorMap[g] ? `style="background:${guestColorMap[g]};color:#222;"` : '');
    html += `<button class="filter-tag" tabindex="0" aria-label="出演者フィルタ解除 ${escapeHtml(g)}" data-type="guest" data-value="${escapeHtml(g)}" ${style}>
               <i class="fa fa-user"></i> ${escapeHtml(g)} <i class="fa fa-xmark"></i>
             </button>`;
  });
  selectedCorners.forEach(c => html += `<button class="filter-tag" tabindex="0" aria-label="コーナーフィルタ解除 ${escapeHtml(c)}" data-type="corner" data-value="${escapeHtml(c)}"><i class="fa fa-cubes"></i> ${escapeHtml(c)} <i class="fa fa-xmark"></i></button>`);
  selectedOthers.forEach(o => html += `<button class="filter-tag" tabindex="0" aria-label="その他フィルタ解除 ${escapeHtml(o)}" data-type="other" data-value="${escapeHtml(o)}"><i class="fa fa-star"></i> ${escapeHtml(o)} <i class="fa fa-xmark"></i></button>`);
  selectedYears.forEach(y => html += `<button class="filter-tag" tabindex="0" aria-label="年フィルタ解除 ${escapeHtml(y)}" data-type="year" data-value="${escapeHtml(y)}"><i class="fa fa-calendar"></i> <span class="impact-number">${escapeHtml(y)}</span> <i class="fa fa-xmark"></i></button>`);
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
  let needsRetry = false;
  const MIN_FONT_SIZE = 8.5;

  // ★性能改善: 以前は1行ごとに「スタイル変更→幅計測」を繰り返していたため、
  // 20カード×3行の描画で100回超の強制リフローが発生し、ローディング中の
  // アニメーション（跳ねる球）が低速端末でカクつく主因になっていた。
  // 「全行リセット→全行計測→全行適用」の読み書き分離バッチに変更し、
  // 強制リフローを全体で数回に抑える。

  const guestLines = Array.from(document.querySelectorAll('.guest-one-line'));
  const metaContainers = Array.from(document.querySelectorAll('.episode-meta'));
  const metaGroups = metaContainers
    .map(c => Array.from(c.querySelectorAll('.meta-one-line')))
    .filter(lines => lines.length > 0);
  const allLines = guestLines.concat(metaGroups.flat());
  if (allLines.length === 0) return;

  // --- フェーズ1: 全行のスタイルを一括リセット（書き込みのみ） ---
  for (const line of allLines) {
    line.style.fontSize = '';
    line.style.whiteSpace = 'nowrap';
  }

  // --- フェーズ2: 全行まとめて計測（読み取りのみ＝強制リフローは実質1回） ---
  const measure = (line) => {
    const parent = line.parentElement;
    if (!parent) return null;
    const compStyle = window.getComputedStyle(parent);
    const parentWidth = parent.clientWidth
      - (parseFloat(compStyle.paddingLeft) || 0)
      - (parseFloat(compStyle.paddingRight) || 0);
    if (parentWidth <= 10) {
      // display:none で隠れている行（閉じたタイムスタンプモーダル内のエピソードカード等）は
      // 幅が永遠に0のままなので再試行対象にしない。これを再試行し続けると
      // 100ms間隔の無限リフローループになり、低速端末で常時カクつく原因になる。
      if (line.offsetParent !== null) needsRetry = true;
      return null;
    }
    const currentWidth = line.scrollWidth;
    let finalSize = parseFloat(window.getComputedStyle(line).fontSize) || 12;
    if (currentWidth > parentWidth) {
      finalSize = Math.max((parentWidth / currentWidth) * finalSize, MIN_FONT_SIZE);
    }
    return { finalSize, parentWidth };
  };
  const guestResults = guestLines.map(measure);
  const metaResults = metaGroups.map(lines => lines.map(measure));

  // --- フェーズ3: 計測結果を一括適用（書き込みのみ） ---
  // 適用サイズが最小値の行は、適用後のはみ出し確認（フェーズ4）の対象として記録する
  const ellipsisChecks = [];

  guestLines.forEach((line, i) => {
    const res = guestResults[i];
    if (!res) {
      line.style.whiteSpace = 'normal';
      line.style.visibility = 'visible';
      return;
    }
    line.style.fontSize = res.finalSize + 'px';
    if (res.finalSize === MIN_FONT_SIZE) {
      ellipsisChecks.push({ line, parentWidth: res.parentWidth });
    } else {
      line.classList.remove('needs-ellipsis');
      line.style.visibility = 'visible';
    }
  });

  metaGroups.forEach((lines, gi) => {
    const results = metaResults[gi];
    // 同じ親要素内の行は「一番小さいサイズ」に揃えて適用
    let minSize = 999;
    results.forEach(res => { if (res && res.finalSize < minSize) minSize = res.finalSize; });
    lines.forEach((line, li) => {
      const res = results[li];
      if (!res || minSize === 999) {
        if (!res) line.style.whiteSpace = 'normal';
        line.style.visibility = 'visible';
        return;
      }
      line.style.fontSize = minSize + 'px';
      if (minSize === MIN_FONT_SIZE) {
        ellipsisChecks.push({ line, parentWidth: res.parentWidth });
      } else {
        line.classList.remove('needs-ellipsis');
        line.style.visibility = 'visible';
      }
    });
  });

  // --- フェーズ4: 最小サイズ適用行のみ、はみ出しを再計測して「…」を付与 ---
  // （読み取り→書き込みの順にまとめ、リフローを1回に抑える）
  if (ellipsisChecks.length > 0) {
    const widths = ellipsisChecks.map(({ line }) => line.scrollWidth); // 読み取りのみ
    ellipsisChecks.forEach(({ line, parentWidth }, i) => {
      // ★微調整: 小数点以下の計算誤差を吸収するために +1 を追加
      line.classList.toggle('needs-ellipsis', widths[i] > parentWidth + 1);
      line.style.visibility = 'visible';
    });
  }

  // 保険: 万一の再試行も上限を設け、無限ループを構造的に不可能にする
  // （上限到達で諦めた場合もカウンタを戻す。戻さないと以後の呼び出しで再試行が永久に無効になる）
  if (needsRetry && (fitGuestLines._retries = (fitGuestLines._retries || 0) + 1) <= 30) {
    setTimeout(fitGuestLines, 100);
  } else {
    fitGuestLines._retries = 0;
  }
}

// 「！」「（）」など全角約物はグリフ内に余白を持つため、レイアウト上は中央でも
// 文字の実体（インク）が左右にずれて見える。Canvasで実描画範囲を計測し、
// ずれを打ち消す補正量(px)を返す。（正の値 = 右へ動かすべき）
let labelMeasureCtx = null;
let labelMeasureCanvas = null;
const inkBoundsCache = new Map();
const HANGING_TRAIL = /[！？。]$/;

// テキストを実際にオフスクリーンcanvasへ描き、ピクセルからインク（実描画）の左右端を測る。
// canvas.measureText().actualBoundingBox* は WebKit(iOS Safari) が末尾約物や字形の
// アキを正しく返さないため、実ピクセル走査に切り替えて全エンジンで同じ結果を得る。
// ラベルは固定なので (font+text) 単位でキャッシュし、初回のみ計測する。
function getInkBounds(text, font, fontSizePx) {
  const key = font + '|' + text;
  if (inkBoundsCache.has(key)) return inkBoundsCache.get(key);
  let result = null;
  try {
    if (!labelMeasureCtx) {
      labelMeasureCanvas = document.createElement('canvas');
      labelMeasureCtx = labelMeasureCanvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = labelMeasureCtx;
    ctx.font = font;
    const advance = ctx.measureText(text).width;
    const pad = Math.ceil(fontSizePx * 0.7) + 4; // 左右のはみ出し（イタリック等）を拾う余白
    const W = Math.ceil(advance) + pad * 2;
    const H = Math.ceil(fontSizePx * 1.8) + 4;
    labelMeasureCanvas.width = W;
    labelMeasureCanvas.height = H;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.clearRect(0, 0, W, H);
    ctx.fillText(text, pad, H / 2);
    const data = ctx.getImageData(0, 0, W, H).data;
    let minX = W, maxX = -1;
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        if (data[(y * W + x) * 4 + 3] > 24) { // alpha>24 を「インクあり」とみなす
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          break;
        }
      }
    }
    if (maxX >= 0) {
      // テキスト原点(x=pad)基準のインク左右端と送り幅
      result = { inkLeft: minX - pad, inkRight: maxX - pad + 1, advance };
    }
  } catch (_) { result = null; }
  inkBoundsCache.set(key, result);
  return result;
}

function getOpticalXOffset(text, font, fontSizePx) {
  const b = getInkBounds(text, font, fontSizePx);
  if (!b || !b.advance) return 0;
  const inkCenter = (b.inkLeft + b.inkRight) / 2;
  const boxCenter = b.advance / 2;
  let offset = boxCenter - inkCenter; // インクが左寄りなら正（右へ寄せる）
  // 末尾が全角約物（！？。）は字面が細く、インク中央に合わせても視覚的に右が空いて見える。
  // font-size 基準で少しだけ余分にぶら下げて見た目の重心を合わせる。
  if (HANGING_TRAIL.test(text) && fontSizePx) offset += fontSizePx * 0.06;
  return Math.max(-8, Math.min(8, offset)); // 異常値ガード
}

// フィルタボタンの長いラベルを、文字サイズは変えずに水平圧縮(scaleX)で収める。
// あわせて全ラベルをインク基準で光学センタリングする。
// レイアウトスラッシング（読み↔書きの交互）を避けるため、
// 「変形リセット→計測→変形適用」を3フェーズに分けてまとめて処理する。
function fitFilterButtons() {
  const BREATHING = 28; // 圧縮後も左右に14pxずつの余白が残るようにする
  const jobs = [];

  // フェーズ1: spanを用意し、全ボタンの変形を一括リセット（書き込みのみ）
  document.querySelectorAll('.guest-button, .btn-corner, .btn-year').forEach(btn => {
    let span = btn.querySelector('.btn-label-fit');
    if (!span) {
      if (btn.childElementCount > 0) return; // テキスト以外を含む想定外の構造はスキップ
      span = document.createElement('span');
      span.className = 'btn-label-fit';
      span.textContent = btn.textContent;
      btn.textContent = '';
      btn.appendChild(span);
    }
    span.style.transform = '';
    jobs.push({ btn, span });
  });

  // フェーズ2: 全ボタンをまとめて計測（読み取りのみ＝強制レイアウトは実質1回）
  for (const job of jobs) {
    const styles = window.getComputedStyle(job.btn);
    const spanStyles = window.getComputedStyle(job.span);
    job.avail = job.btn.clientWidth
      - (parseFloat(styles.paddingLeft) || 0)
      - (parseFloat(styles.paddingRight) || 0)
      - BREATHING;
    job.need = job.span.scrollWidth;
    job.font = `${spanStyles.fontWeight} ${spanStyles.fontSize} ${spanStyles.fontFamily}`;
    job.fontSizePx = parseFloat(spanStyles.fontSize) || 0;
  }

  // フェーズ3: 変形を一括適用（書き込みのみ。canvas計測はレイアウト非依存）
  for (const job of jobs) {
    if (job.avail <= 10) continue; // 非表示中（ドロワーが閉じている等）は何もしない
    const scale = job.need > job.avail ? job.avail / job.need : 1;
    const parts = [];
    // 光学補正量は圧縮前サイズで測っているため、scaleX圧縮ぶん(scale)を掛けて
    // 実際の描画サイズに合わせる（transformは translateX→scaleX の順で適用されるため、
    // インク中心を画面中央へ戻すのに必要な移動量は optX×scale になる）
    const optX = getOpticalXOffset(job.span.textContent, job.font, job.fontSizePx) * scale;
    if (Math.abs(optX) >= 0.5) parts.push(`translateX(${optX.toFixed(1)}px)`);
    if (scale < 1) parts.push(`scaleX(${scale.toFixed(3)})`);
    if (parts.length) job.span.style.transform = parts.join(' ');
  }
}

// ★修正: もしかしてボタンのサイズ調整関数 (透明化解除付き)
function fitDymButtons() {
  const buttons = document.querySelectorAll('.dym-word-btn');
  
  buttons.forEach(btn => {
    // もし「もっと見る」ボタンなど、すでに表示済みのものや特殊なボタンならスキップ
    if (btn.id === 'dymShowMoreBtn') return;

    // 1. スタイルをリセットして計測準備（改行モードで付与した分も含めて全て戻す）
    btn.style.fontSize = '';
    btn.style.whiteSpace = 'nowrap';
    btn.style.lineHeight = '';
    btn.style.wordBreak = '';
    btn.style.overflowWrap = '';
    btn.style.padding = '';
    btn.style.textAlign = '';
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
    const videoIds = lastResults.map(item => item.videoId).filter(Boolean);
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

// 「戻る/進む」でパラメータ無しのURLに戻った時に、画面も初期状態へ同期させる。
// （以前はapplyStateFromURLが何もせずfalseを返すだけで、直前の検索結果が残ったままだった）
function applyDefaultStateForPopstate() {
  isRestoringURL = true;
  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.value = '';
    searchBox.dispatchEvent(new Event('input')); // クリアボタン表示も同期
  }
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'newest';
  selectedGuests = [];
  selectedCorners = [];
  selectedOthers = [];
  selectedYears = [];
  showFavoritesOnly = false;
  const favBtn = document.getElementById('favOnlyToggleBtn');
  if (favBtn) {
    favBtn.classList.remove('active');
    favBtn.setAttribute('aria-pressed', 'false');
  }
  document.body.classList.remove('fav-only');
  updateFilterButtonStyles();
  search({ gotoPage: 1 });
  isRestoringURL = false;
}

function applyStateFromURL({ replace = false } = {}) {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return false;
  isRestoringURL = true;

  // URLSearchParamsが既にデコード済みの値を返すため、decodeURIComponentの二重適用はしない
  // （「100%」のような%を含む値でURIErrorになり復元全体が壊れるバグの修正）
  const readMulti = (key) => params.getAll(key).flatMap(v => v.includes(',') ? v.split(',') : v).map(v => v.trim()).filter(Boolean);
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
  currentPage = Math.max(1, parseInt(params.get('p') || '1', 10) || 1);

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

  let drawerCloseTimer = 0;
  const toggleFilterDrawer = (forceOpen) => {
    const style = window.getComputedStyle(drawer);
    // フェードアウト中(.closing)は「閉じている」扱いにする（連打時の判定ずれ防止）
    const isVisible = style.display !== 'none' && !drawer.classList.contains('closing');
    const isOpening = forceOpen === true || (forceOpen !== false && !isVisible);

    if (isOpening) {
      // フェードアウト途中で開き直された場合は closing を解除して即表示
      clearTimeout(drawerCloseTimer);
      drawer.classList.remove('closing');
      drawer.style.display = 'block';
    } else if (style.display !== 'none' && !drawer.classList.contains('closing')) {
      // 閉じる: 即 display:none にせず、フェードアウト(.closing)完了後に非表示へ
      drawer.classList.add('closing');
      drawerCloseTimer = setTimeout(() => {
        drawer.classList.remove('closing');
        drawer.style.display = 'none';
      }, 180); // CSSの fade-only-out 0.17s より少しだけ長く
    }
    backdrop.classList.toggle('show', isOpening);
    filterToggleBtn.setAttribute('aria-expanded', String(isOpening));
    filterToggleBtn.setAttribute('aria-pressed', String(isOpening));

    if (isOpening) window.acquireBodyLock();
    else window.releaseBodyLock();

    // ドロワーが開いて幅が確定してから、長いラベルの水平圧縮を計算する。
    // 低速端末でレイアウトやWebフォントの確定が2フレームに間に合わない場合に備え、
    // 少し遅らせた保険パスも走らせる（fitFilterButtonsは何度呼んでも同じ結果になる）。
    if (isOpening) {
      requestAnimationFrame(() => requestAnimationFrame(fitFilterButtons));
      setTimeout(fitFilterButtons, 350);
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
  // sortSelectのchangeリスナーは後方（scrollToResultsTop付き）の1箇所に集約
  // （以前はここでも登録していて1回の変更で検索が2回実行されていた）

  const handleFilterClick = (e, collection, type) => {
      const btn = e.target.closest(`[data-${type}]`);
      if (!btn) return;
      const value = btn.dataset[type];
      const index = collection.indexOf(value);
      const active = index === -1; // 押す前に無ければ今回ONにする
      active ? collection.push(value) : collection.splice(index, 1);
      // 変わったのは押したボタン1つだけなので、全ボタン走査せずここだけ更新する
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
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
    const searchBoxEl = document.getElementById('searchBox');
    if (type === 'keyword' && searchBoxEl) searchBoxEl.value = '';
    else if (type === 'guest') selectedGuests = selectedGuests.filter(g => g !== value);
    else if (type === 'corner') selectedCorners = selectedCorners.filter(c => c !== value);
    else if (type === 'other') selectedOthers = selectedOthers.filter(o => o !== value);
    else if (type === 'year') selectedYears = selectedYears.filter(y => y !== String(value));
    if (searchBoxEl) searchBoxEl.dispatchEvent(new Event('input'));
    updateFilterButtonStyles();
    search();
    scrollToResultsTop();
  });

  document.getElementById('results').addEventListener('click', e => {

    // 「もしかして」候補ボタン（インラインonclickの代替。data-word経由で安全に検索実行）
    const dymBtn = e.target.closest('.dym-word-btn');
    if (dymBtn) {
      if (dymBtn.id === 'dymShowMoreBtn') {
        const hiddenArea = document.getElementById('dymHiddenArea');
        if (hiddenArea) hiddenArea.style.display = 'inline';
        dymBtn.style.display = 'none';
        fitDymButtons();
      } else if (dymBtn.dataset.word) {
        window.applyDidYouMean(dymBtn.dataset.word);
      }
      return;
    }

    const homeBtn = e.target.closest('#favGoHomeBtn');
  if (homeBtn) {
    // ★変更: resetSearch() ではなく exitFavoritesMode() を呼ぶ
    exitFavoritesMode();
  }

    // お気に入り一括削除（サイト内確認パネル経由）
    if (e.target.closest('#favClearAllBtn')) {
      document.getElementById('favClearAllBtn').hidden = true;
      document.getElementById('favClearConfirm').hidden = false;
      return;
    }
    if (e.target.closest('#favClearCancelBtn')) {
      document.getElementById('favClearConfirm').hidden = true;
      document.getElementById('favClearAllBtn').hidden = false;
      return;
    }
    if (e.target.closest('#favClearOkBtn')) {
      clearAllTimestamps();
      search({ gotoPage: 1 }); // 再描画（お気に入り一覧は空になり、★やバッジも同期される）
      return;
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
      // ★変更: 即時トグルではなく、タイムスタンプ登録モーダルを開く
      if (window.openTsModal) {
        window.openTsModal(favBtn.dataset.id, favBtn.dataset.title, favBtn.dataset.link, favBtn.closest('.episode-item'), favBtn.dataset.duration);
      }
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
  window.addEventListener('popstate', () => {
    if (!applyStateFromURL({ replace: false })) applyDefaultStateForPopstate();
  });
  window.addEventListener('orientationchange', () => setTimeout(fitGuestLines, 120), { passive: true });

  // ★修正: Webフォント確定後に文字幅を再計測する。
  // 初回描画がフォント読込より先に走ると、幅の広い代替フォントで計測した縮小サイズが
  // 残ってゲスト名が小さくなったままになる。Typekit(webfontloader)のフォントは
  // document.fonts のイベントを発火しないことがあるため、webfontloaderが<html>に
  // 付与する wf-active / wf-inactive クラスを監視して確実に再計測する。
  {
    // フォント確定で描画が変わるため、代替フォントで測ったインク境界キャッシュは破棄して測り直す
    const refitAfterFonts = () => { inkBoundsCache.clear(); fitGuestLines(); fitDymButtons(); fitFilterButtons(); };
    const htmlEl = document.documentElement;
    const fontsSettled = () => htmlEl.classList.contains('wf-active') || htmlEl.classList.contains('wf-inactive');
    if (fontsSettled()) {
      refitAfterFonts();
    } else {
      const fontObserver = new MutationObserver(() => {
        if (fontsSettled()) {
          fontObserver.disconnect();
          refitAfterFonts();
          setTimeout(refitAfterFonts, 800); // 動的サブセットの遅れ分をもう一度
        }
      });
      fontObserver.observe(htmlEl, { attributes: true, attributeFilter: ['class'] });
    }
    // 補助: document.fonts のイベントが発火する環境ではそちらでも再計測
    if (document.fonts) {
      document.fonts.ready.then(refitAfterFonts);
      document.fonts.addEventListener('loadingdone', refitAfterFonts);
    }
  }

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
        fitFilterButtons();
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

  const applyTheme = (themeName, opts = {}) => {
    document.body.classList.remove(...allThemeClasses);
    if (themeName === 'dark') document.body.classList.add('dark-mode');
    else if (themeName && themeName !== 'light') document.body.classList.add(`theme-${themeName}`);
    panel.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    panel.querySelector(`.theme-btn[data-theme="${themeName}"]`)?.classList.add('active');
    try { localStorage.setItem(THEME_KEY, themeName); } catch (e) {}

    // カラーテーマは全て白文字ステータスバー（black-translucent）。黒文字はライトのみ。
    // （この値はiOSがホーム画面追加時にキャッシュするため実行中の変更は効かないが、
    //   時計の文字色は theme-color の明暗でiOSが動的に決めるので、リロードは行わない）
    const isDarkStyleStatusBar = ['dark', 'pink', 'yellow', 'blue', 'red', 'green'].includes(themeName);
    const statusBar = document.getElementById('status-bar-style');
    const themeColorMeta = document.getElementById('theme-color-meta');

    if (statusBar) {
      statusBar.content = isDarkStyleStatusBar ? 'black-translucent' : 'default';
    }

    if (themeColorMeta) {
      // iOSはtheme-colorの明るさでステータスバーの文字色(黒/白)を自動決定するため、
      // カラーテーマでは白文字判定になる濃色を渡す（index.html冒頭のスクリプトと同期）
      let color = '#f9fafe';
      switch (themeName) {
        case 'dark':   color = '#000000'; break;
        case 'pink':   color = '#8f3a55'; break;
        case 'yellow': color = '#8a6900'; break;
        case 'blue':   color = '#00477c'; break;
        case 'red':    color = '#8c002b'; break;
        case 'green':  color = '#0b5f4e'; break;
      }
      themeColorMeta.content = color;
    }

    let bodyBg = '';
    switch (themeName) {
      case 'dark':   bodyBg = '#000000'; break;
      case 'pink':   bodyBg = '#ff6496'; break;
      case 'yellow': bodyBg = '#fabe00'; break;
      case 'blue':   bodyBg = '#006ebe'; break;
      case 'red':    bodyBg = '#e60046'; break;
      case 'green':  bodyBg = '#13a286'; break;
    }

    const earlyStyle = document.getElementById('early-theme-style');
    if (earlyStyle) {
      earlyStyle.textContent = bodyBg
        ? 'html, body, #loading-screen { background-color: ' + bodyBg + ' !important; }'
        : '';
    }
    // html要素のインライン背景（初回チラつき防止用）もテーマ切替に追従させ、
    // カラーテーマ→ライトへ戻したときに古い色が残らないようにする。
    document.documentElement.style.backgroundColor = bodyBg || '#f9fafe';
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
      applyTheme(themeBtn.dataset.theme, { fromUser: true });
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

    // ★追加: タイムスタンプ登録モーダルのセットアップ
    const { openModal: openTs, closeModal: closeTs } = setup('tsModal', null, 'tsCloseBtn');
    let tsCtx = null; // { id, link, cardEl, durationSec, editing, wasFav }
    // iOSはキーボード表示時にスクロールロックを無視してページを動かすため、
    // モーダルを開いた時点の位置を記憶し、キーボード終了時に戻す
    let tsSavedScrollY = 0;
    const instantScrollTo = (y) => {
      // scroll-behavior: smooth の影響を受けず一瞬で移動する
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      html.style.scrollBehavior = prev;
    };
    const restoreTsScroll = () => {
      if (Math.abs(window.scrollY - tsSavedScrollY) > 1) {
        instantScrollTo(tsSavedScrollY);
      }
    };
    // 閉じた後の遅延スクロール復元は、iOSがキーボードを閉じる際に起こす不本意な
    // ページずれを元に戻すためのもの。ただしユーザーが自分でスクロールした場合は
    // その操作を尊重して復元を中止する（閉じた直後にスクロールすると戻される不具合の対策）。
    let tsRestoreTimers = [];
    const cancelTsScrollRestore = () => {
      tsRestoreTimers.forEach(clearTimeout);
      tsRestoreTimers = [];
      window.removeEventListener('wheel', onTsUserScroll);
      window.removeEventListener('touchstart', onTsUserScroll);
      window.removeEventListener('touchmove', onTsUserScroll);
      window.removeEventListener('keydown', onTsScrollKey);
    };
    function onTsUserScroll() {
      // body固定中（モーダル表示中のスマホ）はページ自体がスクロールできないため、
      // モーダル内のタップで復元を中止しない。中止するとキーボード終了時の
      // パン残留が残ったまま次のフォーカスが始まり、表示位置が経路でずれる。
      // （中止はモーダルを閉じた後にユーザーが自分でスクロールした場合の保護）
      if (document.body.classList.contains('ts-kb-lock')) return;
      cancelTsScrollRestore();
    }
    function onTsScrollKey(e) {
      // スクロール系キー操作もユーザー意思とみなす
      if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Spacebar'].includes(e.key)) cancelTsScrollRestore();
    }
    const scheduleTsScrollRestore = () => {
      cancelTsScrollRestore();
      // touchstart はスワイプ開始を即検知（閉じた直後にすぐ触っても取りこぼさない）
      window.addEventListener('wheel', onTsUserScroll, { passive: true });
      window.addEventListener('touchstart', onTsUserScroll, { passive: true });
      window.addEventListener('touchmove', onTsUserScroll, { passive: true });
      window.addEventListener('keydown', onTsScrollKey);
      tsRestoreTimers.push(setTimeout(restoreTsScroll, 150));
      tsRestoreTimers.push(setTimeout(() => { restoreTsScroll(); cancelTsScrollRestore(); }, 450));
    };

    // スマホ（ボトムシート表示）ではさらに強い固定を使う:
    // bodyをposition:fixedにすると、iOSが「入力欄を見せるため」に行う
    // ページスクロール自体が物理的に不可能になり、背景が一切動かなくなる。
    const lockTsBody = () => {
      if (document.body.classList.contains('ts-kb-lock')) return;
      if (!window.matchMedia('(max-width: 600px)').matches) return;
      document.body.style.top = `-${tsSavedScrollY}px`;
      document.body.classList.add('ts-kb-lock');
    };
    const unlockTsBody = () => {
      if (!document.body.classList.contains('ts-kb-lock')) return;
      document.body.classList.remove('ts-kb-lock');
      document.body.style.top = '';
      instantScrollTo(tsSavedScrollY); // 固定解除で0に飛ぶので即座に元の位置へ
    };

    const tsEls = () => ({
      input: document.getElementById('tsInput'),
      addArea: document.querySelector('#tsModal .ts-add-area'),
      addBtn: document.getElementById('tsAddBtn'),
      copyBtn: document.getElementById('tsCopyBtn'),
      cancelBtn: document.getElementById('tsCancelBtn'),
      listActions: document.getElementById('tsListActions'),
      clearAllBtn: document.getElementById('tsClearAllBtn'),
      list: document.getElementById('tsList'),
      error: document.getElementById('tsError'),
      footer: document.querySelector('#tsModal .ts-footer'),
    });

    // 複数行テキストを一括解析。エラー行は理由付きで返す。
    const parseTsLines = (text, durationSec) => {
      const entries = [], errors = [];
      const lines = text.split('\n');
      lines.forEach((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return; // 空行は無視
        const parsed = parseTsInput(line);
        if (!parsed) {
          // 時間表記で始まらない行は「時間指定なしのメモ」として登録する
          entries.push({ t: null, label: line });
        } else if (durationSec != null && parsed.t > durationSec) {
          errors.push({ line: i + 1, text: line, reason: `動画の長さ（${formatTs(durationSec)}）を超えています` });
        } else {
          entries.push(parsed);
        }
      });
      return { entries, errors };
    };

    const showTsError = (errors) => {
      const { error, input } = tsEls();
      const items = errors.slice(0, 4).map(e =>
        `<div class="ts-error-line"><i class="fa-solid fa-circle-exclamation"></i> ${errors.length > 1 || e.line > 1 ? `${e.line}行目: ` : ''}${e.reason}</div>`
      ).join('');
      const more = errors.length > 4 ? `<div class="ts-error-line">…他${errors.length - 4}件</div>` : '';
      error.innerHTML = items + more;
      error.hidden = false;
      input.classList.add('ts-input-error');
      setTimeout(() => input.classList.remove('ts-input-error'), 500);
      autosizeTsInput(); // エラーが入力欄とボタンの間に挟まり上限が縮むため再計算
    };

    const clearTsError = () => { const { error } = tsEls(); error.hidden = true; error.innerHTML = ''; };

    // テキストエリアの高さを内容に合わせる。上限はスマホでは約6行（152px）、
    // PC/iPad（601px以上）ではモーダルの空きスペース＝キャンセル/保存ボタンが
    // モーダル下端に達するまで。上限を超えた分は内部スクロールになる。
    // scrollHeight参照は強制リフローを起こすため、rAFで1フレーム1回に間引いて軽量化。
    const tsInputMaxHeight = () => {
      if (!window.matchMedia('(min-width: 601px)').matches) return 152;
      // .ts-body は flex:1 で高さが固定されているため、入力欄の高さに影響されず
      // 「ボタン・余白を除いた空きスペース」を安定して算出できる
      const body = document.querySelector('#tsModal .ts-body');
      const { addArea, error } = tsEls();
      const actions = addArea ? addArea.querySelector('.ts-actions') : null;
      if (!body || !actions) return 152;
      const bs = getComputedStyle(body);
      const gap = parseFloat(getComputedStyle(addArea).rowGap) || 0;
      let free = body.clientHeight
        - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom)
        - actions.offsetHeight - gap;
      // エラー表示は入力欄とボタンの間に挟まるため、その高さと区切りgapも差し引く
      if (error && !error.hidden) free -= error.offsetHeight + gap;
      return Math.max(152, free);
    };
    let autosizeRafId = 0;
    const applyTsAutosize = () => {
      const { input } = tsEls();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, tsInputMaxHeight()) + 'px';
    };
    const autosizeTsInput = () => {
      if (autosizeRafId) return;
      autosizeRafId = requestAnimationFrame(() => {
        autosizeRafId = 0;
        applyTsAutosize();
      });
    };

    const setEditingMode = (on) => {
      const { input, addArea, cancelBtn, copyBtn, listActions, list, footer } = tsEls();
      tsCtx.editing = on;
      // 入力欄と保存ボタンは「編集」をタップした時だけ表示する。
      // 通常時は一覧だけを見せて、登録・変更はすべて編集モード経由に一本化。
      addArea.hidden = !on;
      cancelBtn.hidden = !on;
      hideClearConfirm();
      // 編集中は入力欄に集中できるよう、登録済みリストと
      // 下部固定エリア（編集/すべて削除・ヒント文）ごと非表示にする
      listActions.hidden = on;
      list.hidden = on;
      footer.hidden = on;
      input.value = on ? tsEntriesToText(getTimestamps(tsCtx.id)) : '';
      copyBtn.disabled = !input.value.trim(); // 空の下書きはコピー不可
      autosizeTsInput();
      clearTsError();
      syncTsBodyScrollbar();
    };

    // スクロールバーが幅を取る環境（PC/iPad等）で、右paddingを実測のバー幅ぶん
    // 詰めて、固定表示のカード/フッターと左右位置を揃える。CSS側の
    // scrollbar-gutter: stable でバー領域は件数によらず常に確保されるため、
    // ここの補正値も件数で変化せず、リスト行の横幅は常に一定になる。
    // オーバーレイスクロールバー環境（バー幅0）では何もしない。
    let tsSbwRafId = 0;
    const syncTsBodyScrollbar = () => {
      if (tsSbwRafId) return;
      tsSbwRafId = requestAnimationFrame(() => {
        tsSbwRafId = 0;
        const body = document.querySelector('#tsModal .ts-body');
        if (!body) return;
        const sbw = body.offsetWidth - body.clientWidth; // 実際に占有しているバー幅
        body.style.paddingRight = sbw > 0 ? Math.max(8, 20 - sbw) + 'px' : '';
      });
    };
    window.addEventListener('resize', () => {
      syncTsBodyScrollbar();
      // PCでは入力欄の高さ上限がモーダルの空きスペース依存のため、編集中は再計算する
      if (tsCtx && tsCtx.editing) autosizeTsInput();
    });

    // 件数が多くても軽いように、リストは変更確定時に1回だけ組み立てる
    // すべて削除の確認パネル（ブラウザ標準confirmの代替）
    const hideClearConfirm = () => {
      const panel = document.getElementById('tsClearConfirm');
      if (panel && !panel.hidden) panel.hidden = true;
    };

    // 一覧のテキスト化（まとめて編集の下書き・コピー機能で共用。
    // 時間指定なしのメモはラベルのみで書き出し、再解析時も時間なしとして扱われる）
    const tsEntriesToText = (entries) =>
      entries.map(e => e.t == null ? e.label : `${formatTs(e.t)} ${e.label}`.trimEnd()).join('\n');

    const renderTsList = () => {
      const { list, listActions, clearAllBtn } = tsEls();
      const items = getTimestamps(tsCtx.id);
      hideClearConfirm(); // リストが変わったら確認パネルは一旦閉じる
      // 編集ボタンが登録の入口なので、0件でもボタン行は表示する（すべて削除だけ隠す）
      listActions.hidden = tsCtx.editing;
      clearAllBtn.hidden = items.length === 0;
      syncTsBodyScrollbar(); // 件数変化でスクロールバーの有無が変わるため毎回同期
      if (items.length === 0) {
        list.innerHTML = '<li class="ts-empty"><span class="ts-empty-main"><i class="fa-regular fa-clock"></i> まだ登録がありません</span><span class="ts-empty-sub">「編集」からタイムスタンプやメモを登録できます</span></li>';
        return;
      }
      // ★性能: 件数が多い時に new URL() を1件ごとに作らないよう、リンク生成を高速化
      const linkFor = makeTimeLinkBuilder(tsCtx.link);
      list.innerHTML = items.map((item, i) => {
        const noTime = item.t == null;
        const timeHtml = `<span class="ts-time"><i class="fa-solid fa-play"></i><span class="impact-number">${noTime ? '??:??' : formatTs(item.t)}</span></span>`;
        return `
        <li class="ts-item">
          <a class="ts-play" href="${linkFor(item.t)}" target="_blank" rel="noopener" aria-label="${noTime ? '動画を最初から再生' : `${formatTs(item.t)} から再生`}">
            ${timeHtml}
            <span class="ts-label">${item.label ? escapeHtml(item.label) : '<span class="ts-label-none">（メモなし）</span>'}</span>
          </a>
          <button class="ts-delete" data-index="${i}" aria-label="このタイムスタンプを削除" title="削除"><i class="fa-solid fa-trash-can"></i></button>
        </li>`;
      }).join('');
    };

    // 変更確定後の同期。全件再検索はお気に入り状態が変わった時だけに絞り、負荷を抑える。
    const syncAfterTsChange = () => {
      if (tsCtx.cardEl && tsCtx.cardEl.isConnected) updateFavStar(tsCtx.cardEl);
      const nowFav = isFavorite(tsCtx.id);
      if (showFavoritesOnly && nowFav !== tsCtx.wasFav) {
        search({ gotoPage: currentPage });
      }
      tsCtx.wasFav = nowFav;
    };

    window.openTsModal = (videoId, title, link, cardEl, duration) => {
      if (!videoId) return;
      tsSavedScrollY = window.scrollY;
      lockTsBody();
      tsCtx = { id: videoId, link, cardEl, durationSec: durationToSec(duration), editing: false, wasFav: isFavorite(videoId) };
      document.getElementById('tsModalTitle').innerHTML =
        `${title.trim().replace(/([#A-Za-z0-9:]+)/g, '<span class="impact-number">$1</span>')} タイムスタンプ`;

      // どの回への登録か一目で分かるよう、トップ画面と全く同じエピソードカードを表示する。
      // （renderResultsのカードと同一のクラス・構造を使い、同じCSSを適用させる。
      //   ★ボタン/リンクボタン等の操作系だけ除外）
      const epCard = document.getElementById('tsEpisodeCard');
      if (epCard) {
        const epItem = data.find(it => it.videoId === videoId);
        if (epItem) {
          const hashOnly = getHashNumber(epItem.title);
          const guestText = getEpisodeGuestText(epItem);
          epCard.innerHTML = `
  <li class="episode-item" style="--i:0;">
    <a href="${epItem.link}" target="_blank" rel="noopener" style="display:flex;text-decoration:none;color:inherit;align-items:center;min-width:0;">
      <div class="thumb-col">
        <img src="thumbnails/${epItem.episode}.jpg" class="thumbnail" alt="サムネイル：${hashOnly}"
             loading="lazy" decoding="async"
             onload="this.classList.add('loaded')"
             onerror="this.onerror=null; this.src='./thumb-fallback.svg'; this.classList.add('loaded');">
      </div>
      <div style="min-width:0;">
        <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
          <h5 class="mb-1">
            ${
              hashOnly.startsWith('#')
                ? `<span class="impact-number">${hashOnly}</span>`
                : hashOnly.replace(/([A-Za-z0-9]+)/g, '<span class="impact-number">$1</span>')
            }${/　/.test(epItem.title) ? "<br>" : " "}
            <span class="guest-one-line" aria-label="${guestText}" style="visibility: hidden;">${guestText}</span>
          </h5>
        </div>
        <div class="episode-meta">
          <div class="meta-one-line" style="visibility: hidden;">公開日時：<span class="impact-number">${epItem.date}</span></div>
          <div class="meta-one-line" style="visibility: hidden;">動画時間：${(epItem.duration ? `<span class="impact-number">${epItem.duration}</span>` : '?')}</div>
        </div>
      </div>
    </a>
  </li>`;
          epCard.hidden = false;
          // モーダル表示後に文字幅を計測（トップ画面と同じ縮小フィットを適用する）
          requestAnimationFrame(() => requestAnimationFrame(fitGuestLines));
        } else {
          epCard.hidden = true;
        }
      }
      setEditingMode(false);
      renderTsList();
      openTs();
    };

    const submitTs = () => {
      const { input } = tsEls();
      // 空のまま登録: 変更せず一覧に戻る（全削除は確認付きの「すべて削除」経由に限定し、誤消去を防ぐ）
      if (!input.value.trim()) { setEditingMode(false); endTypingModeNow(); return; }
      const { entries, errors } = parseTsLines(input.value, tsCtx.durationSec);
      if (errors.length > 0) { showTsError(errors); return; } // エラー時は入力を続けられるようフォーカス維持
      // 完全に同じ行（時間+メモ）が複数あっても1件にまとめる
      const seen = new Set();
      const unique = entries.filter(e => {
        const key = `${e.t}|${e.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTimestampsAll(tsCtx.id, unique); // 入力欄の内容で全置換（登録・編集とも同じ経路）
      setEditingMode(false);
      renderTsList();
      syncAfterTsChange();
      // 登録成功: キーボードを閉じ、待ち時間なしで結果の一覧を見せる
      endTypingModeNow();
    };

    document.getElementById('tsAddBtn').addEventListener('click', submitTs);
    document.getElementById('tsCancelBtn').addEventListener('click', () => {
      setEditingMode(false);
      endTypingModeNow(); // キャンセル時もキーボードを閉じて即座に一覧へ戻す
    });
    // 入力欄の内容（下書き）をコピー。編集直後の下書きは登録済み一覧そのものなので、
    // 「登録した一覧をコピーする」用途もこのボタン1つでまかなえる
    let tsCopyResetTimer = 0;
    document.getElementById('tsCopyBtn').addEventListener('click', async () => {
      const btn = document.getElementById('tsCopyBtn');
      const text = tsEls().input.value.trim();
      if (!text) return;
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (_) {
        // 非対応環境用: 画面外のreadonly要素で選択コピー（キーボードを出さない）
        const tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.setAttribute('readonly', '');
        tmp.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(tmp);
        tmp.select();
        try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
        tmp.remove();
      }
      if (!copied) return;
      // アイコンを一瞬チェックに変えてフィードバック
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      clearTimeout(tsCopyResetTimer);
      tsCopyResetTimer = setTimeout(() => {
        btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
      }, 1400);
    });
    document.getElementById('tsEditAllBtn').addEventListener('click', () => {
      setEditingMode(true);
      // 高さ調整はrAF待ちのため、フォーカス前に確定させる。未確定のままだと
      // iOSがキーボード表示時に計算するスクロール量が入力欄を直接タップした
      // 時と変わり、モーダルの表示位置が経路によってずれる。
      applyTsAutosize();
      tsEls().input.focus();
    });
    document.getElementById('tsClearAllBtn').addEventListener('click', () => {
      if (getTimestamps(tsCtx.id).length === 0) return;
      // サイト内の確認パネルを表示（コピー/すべて削除の行と入れ替え）
      tsEls().listActions.hidden = true;
      const panel = document.getElementById('tsClearConfirm');
      panel.hidden = false;
      panel.scrollIntoView({ block: 'nearest' });
    });
    document.getElementById('tsClearCancelBtn').addEventListener('click', () => {
      hideClearConfirm();
      tsEls().listActions.hidden = tsCtx.editing;
    });
    document.getElementById('tsClearOkBtn').addEventListener('click', () => {
      setTimestampsAll(tsCtx.id, []);
      renderTsList(); // 内部で確認パネルも閉じる
      syncAfterTsChange();
    });

    document.getElementById('tsInput').addEventListener('input', () => {
      clearTsError();
      autosizeTsInput();
      const { input, copyBtn } = tsEls();
      copyBtn.disabled = !input.value.trim();
    });
    document.getElementById('tsList').addEventListener('click', e => {
      const delBtn = e.target.closest('.ts-delete');
      if (delBtn) {
        e.preventDefault();
        removeTimestamp(tsCtx.id, Number(delBtn.dataset.index));
        renderTsList();
        syncAfterTsChange();
        if (tsCtx.editing) setEditingMode(true); // 編集中なら下書きも最新化
      }
    });

    /* キーボード対応（iOS Safari/PWA・Android共通の「コンポーズモード」方式）:
     * visualViewport等のビューポート計算による位置合わせは、実機iOSのパンや
     * offsetTop残留バグ等で不安定だったため全廃した。
     * 代わりに「入力中はシートを全画面化し、リスト・エピソードカードを畳んで
     * 入力欄を画面上部に置く」。入力欄と保存ボタンが常に画面上部にあるため、
     * キーボードがどう出ても（入力欄が6行まで伸びても）物理的に隠れない。
     * （Android等のresizes-content対応環境ではdvhが縮み、同じく自然に収まる） */
    const tsSheetEl = document.querySelector('#tsModal .ts-modal');
    const tsInputEl = document.getElementById('tsInput');
    let typingEndTimer = 0;
    // キーボード表示直後の位置補正: iOSは入力欄が隠れていなくてもページを不定量
    // パンすることがあり、その量はフォーカスの入り方（編集ボタン経由か、入力欄を
    // 直接タップか）で変わる。キーボードが出きった頃に基準位置（body固定中は
    // scrollY=0）へ戻し、どちらの経路でも同じ表示位置に揃える。
    let tsTypingFixTimers = [];
    const cancelTsTypingPanFix = () => {
      tsTypingFixTimers.forEach(clearTimeout);
      tsTypingFixTimers = [];
    };
    const scheduleTsTypingPanFix = () => {
      cancelTsTypingPanFix();
      [250, 600].forEach(ms => tsTypingFixTimers.push(setTimeout(() => {
        if (!tsSheetEl.classList.contains('ts-typing')) return; // 既に入力終了なら何もしない
        if (!document.body.classList.contains('ts-kb-lock')) return;
        if (window.scrollY !== 0) instantScrollTo(0);
      }, ms)));
    };
    const startTypingMode = () => {
      if (!window.matchMedia('(max-width: 600px)').matches) return; // ボトムシート時のみ
      clearTimeout(typingEndTimer);
      tsSheetEl.classList.add('ts-typing');
      scheduleTsTypingPanFix();
    };
    const endTypingMode = () => {
      clearTimeout(typingEndTimer);
      cancelTsTypingPanFix();
      // blur直後のタップ（登録ボタン等）がレイアウト変化で外れないよう少し待ってから戻す
      typingEndTimer = setTimeout(() => tsSheetEl.classList.remove('ts-typing'), 150);
    };
    // 登録・キャンセルの確定時用: 150msの猶予を待たずに即座に通常表示へ戻す。
    // （猶予中は入力欄もリストも全部隠れた状態になり、画面が一瞬白く見えるため）
    const endTypingModeNow = () => {
      tsInputEl.blur(); // iOSはボタンタップでblurしないため明示的に閉じる
      clearTimeout(typingEndTimer);
      cancelTsTypingPanFix();
      tsSheetEl.classList.remove('ts-typing');
    };
    tsInputEl.addEventListener('focus', startTypingMode);
    tsInputEl.addEventListener('blur', () => {
      endTypingMode();
      scheduleTsScrollRestore(); // 万一ページがずらされていても元へ（ユーザー操作時は中止）
    });
    // iOSはボタンや余白をタップしても入力欄のフォーカスが外れないため、
    // コンポーズモード中にシート内の入力欄以外へ触れたらキーボードを閉じる
    tsSheetEl.addEventListener('pointerdown', (e) => {
      if (!tsSheetEl.classList.contains('ts-typing')) return;
      if (e.target === tsInputEl || tsInputEl.contains(e.target)) return;
      // アクション行（キャンセル/コピー/保存）はここではblurしない。
      // pointerdownでblurするとキーボードが閉じてレイアウトが動き、指の下からボタンが
      // ずれてclickが外れる＝ボタンが押せない（iOS Safari）。keyboardはclickの各ハンドラ
      // （submitTs / キャンセル）が endTypingModeNow() で閉じるので取りこぼさない。
      if (e.target.closest('.ts-actions')) return;
      tsInputEl.blur();
    });
    // モーダルを閉じる操作時はキーボードも閉じ、body固定を解除して位置を戻す
    const resetTsKeyboard = () => {
      tsInputEl?.blur();
      clearTimeout(typingEndTimer);
      cancelTsTypingPanFix();
      tsSheetEl.classList.remove('ts-typing');
      unlockTsBody();
      // キーボードの閉じアニメーション後にも復元（ユーザーが自分でスクロールしたら中止）
      scheduleTsScrollRestore();
    };
    document.getElementById('tsCloseBtn').addEventListener('click', resetTsKeyboard);
    document.getElementById('tsModal').addEventListener('click', e => {
      if (e.target === e.currentTarget) resetTsKeyboard();
    });
    
    // グローバルから呼べるようにする
    window.openPhotoModal = (ep) => {
      const links = linksData[ep] || [];
      const body = document.getElementById('photoBody');

      // タイムスタンプモーダルと同様に「#107 関連リンク集」の形式でタイトルを表示する
      const titleEl = document.getElementById('photoModalTitle');
      if (titleEl) {
        const epItem = data.find(it => it.episode === ep);
        const hashOnly = epItem ? getHashNumber(epItem.title) : '';
        titleEl.innerHTML = hashOnly
          ? `${hashOnly.trim().replace(/([#A-Za-z0-9:]+)/g, '<span class="impact-number">$1</span>')} 関連リンク集`
          : '関連リンク集';
      }
      
      body.innerHTML = links.map(link => {
        const faIcon = link.platform === 'instagram' ? '<i class="fa-brands fa-instagram"></i>' : '<i class="fa-brands fa-x-twitter"></i>';
        // モーダルタイトルと同様に「#107」などの番号をImpactフォントで表示して統一感を出す
        const label = String(link.text).replace(/([#A-Za-z0-9:]+)/g, '<span class="impact-number">$1</span>');
        return `
          <a href="${link.url}" target="_blank" rel="noopener" class="photo-link-btn">
            <span class="photo-link-icon">${faIcon}</span>
            <span class="photo-link-text">${label}</span>
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
            if (document.getElementById('tsModal')?.classList.contains('show')) { resetTsKeyboard(); closeTs(); } // ★追加: タイムスタンプ
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
  // ★iOS対策: PWAの起動・復帰の一瞬、env(safe-area-inset-top)が異常値（0や過大値）を
  // 返すことがあり、そのタイミングで計測すると誤った余白が残り続けて
  // 「コンテンツがヘッダーに食い込む」「ヘッダー下に大きな空白ができる」原因になっていた。
  // 明らかに異常な値（画面の45%超）はその場では採用せず、少し後に再計測する。
  const cap = Math.max(240, window.innerHeight * 0.45);
  if (h > cap) {
    clearTimeout(updateHeaderOffset._retry);
    updateHeaderOffset._retry = setTimeout(updateHeaderOffset, 250);
    return; // 直前の正常値を維持したまま再計測を待つ
  }
  root.style.setProperty('--header-height', h + 'px');
  root.style.setProperty('--header-offset', (h + 10) + 'px');
}
window.__updateHeaderOffset = updateHeaderOffset;

// ★iOS対策: セーフエリア値が起動直後・バックグラウンド復帰直後に遅れて確定するため、
// その前後で複数回計測し直して正しい値に収束させる（計測は軽量なので負荷は無視できる）。
function settleHeaderOffset() {
  updateHeaderOffset();
  [300, 1000, 2500].forEach(ms => setTimeout(updateHeaderOffset, ms));
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') settleHeaderOffset();
});
window.addEventListener('pageshow', settleHeaderOffset);

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

// メモの正規化はキー入力のたびに全件で走るため、結果をエントリごとにキャッシュする。
// WeakMapなので保存・再読込でエントリが作り直されると自動的に破棄され、古い結果は残らない。
const tsNormCache = new WeakMap();
function tsNormLabel(e) {
  let v = tsNormCache.get(e);
  if (v === undefined) {
    v = normalize(e.label || '');
    tsNormCache.set(e, v);
  }
  return v;
}

// ユーザー登録タイムスタンプのメモが検索語のいずれかに部分一致するか
function matchesUserMemo(item, words) {
  const entries = getTimestamps(item.videoId);
  if (!entries.length) return false;
  return entries.some(e => {
    const ln = tsNormLabel(e);
    return ln && words.some(w => ln.includes(w));
  });
}

function findHitTime(item, rawQuery) {
  if (!rawQuery) return null;
  const qn = normalize(rawQuery);
  if (!qn) return null;
  // ★性能: キーワードの時刻解析と正規化は起動時計算済みの kwTimes を使う（結果は同一）
  for (const p of (item.kwTimes || [])) {
    if (p.baseN.includes(qn) || qn.includes(p.baseN)) {
      return p;
    }
  }
  // ユーザー登録タイムスタンプのメモにも一致すれば、その場面へジャンプできるようにする
  for (const e of getTimestamps(item.videoId)) {
    if (e.t == null) continue; // 時間なしメモはジャンプ先がないため対象外
    const ln = tsNormLabel(e);
    if (ln && (ln.includes(qn) || qn.includes(ln))) {
      return { base: e.label, label: formatTs(e.t), seconds: e.t };
    }
  }
  return null;
}

// ★性能: 同一動画URLへ t=秒 を差し替えたリンクを大量生成する時（タイムスタンプ一覧の
// 描画など）用の高速ビルダー。withTimeParam を2回だけ呼んで「秒数の前後の固定文字列」を
// 特定し、以後は文字列連結だけで同一の出力を作る。組み立て結果が withTimeParam と
// 一致するか自己検証し、万一一致しなければ従来の withTimeParam をそのまま使う。
function makeTimeLinkBuilder(url) {
  try {
    const a = withTimeParam(url, 1234567891);
    const b = withTimeParam(url, 9876543219);
    if (a.length === b.length) {
      let s = 0; while (s < a.length && a[s] === b[s]) s++;
      let e = 0; while (e < a.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
      const pre = a.slice(0, s), suf = e ? a.slice(a.length - e) : '';
      if (pre + '1234567891' + suf === a) {
        const fast = (sec) => {
          if (!sec && sec !== 0) return url; // withTimeParam と同じ「時間なしは元URL」の挙動
          return pre + (sec === 0 ? 1 : sec) + suf; // t=0→1 の変換も withTimeParam と同一
        };
        if (fast(42) === withTimeParam(url, 42) && fast(0) === withTimeParam(url, 0)) return fast;
      }
    }
  } catch (_) {}
  return (sec) => withTimeParam(url, sec);
}

function withTimeParam(url, seconds) {
  if (!seconds && seconds !== 0) return url;
  // t=0 はYouTube（特にアプリ）が「指定なし」とみなして続きから再生してしまうため、
  // 冒頭指定は t=1 として確実に頭から再生させる
  if (seconds === 0) seconds = 1;
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

      // リンクがある出来事は、リンクの当たり判定をカード全面に広げる（ストレッチリンク）。
      // 本物の<a>のままなので、ホバーでブラウザ左下にURLが表示され、
      // 中クリック/右クリックメニュー/キーボード操作もネイティブに動く。
      if (it.url) el.classList.add('has-link');

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
            let hidden = false;
            const hideLoadingScreen = () => {
                if (hidden) return;
                hidden = true;
                // ★下部ナビの表示解禁（起動中はCSSでvisibility:hiddenにしている）。
                // フェード開始と同時に解禁すれば、他のUIと一緒に自然に現れる。
                document.body.classList.add('app-ready');
                // ★修正: iOSはリロードや再起動時にスクロール位置を「遅れて」復元することが
                // あり（数百ms〜1秒後）、起動直後なのにページが途中までスクロールされた
                // 状態になることがあった。単発のリセットでは取りこぼすため、スプラッシュ
                // 解除後2秒間は監視し、ユーザーが操作していないのに位置がずれたら即座に
                // 先頭へ戻す。ユーザーが触れたら監視を止めて操作を尊重する。
                const instantTop = () => {
                    const html = document.documentElement;
                    const prev = html.style.scrollBehavior;
                    html.style.scrollBehavior = 'auto';
                    try { window.scrollTo(0, 0); } catch (e) {}
                    html.style.scrollBehavior = prev;
                };
                instantTop();
                let watchdogTimer = 0;
                const stopWatch = () => {
                    clearInterval(watchdogTimer);
                    window.removeEventListener('touchstart', stopWatch);
                    window.removeEventListener('wheel', stopWatch);
                    window.removeEventListener('keydown', stopWatch);
                };
                window.addEventListener('touchstart', stopWatch, { passive: true });
                window.addEventListener('wheel', stopWatch, { passive: true });
                window.addEventListener('keydown', stopWatch);
                watchdogTimer = setInterval(() => {
                    if (window.scrollY !== 0) instantTop();
                    // 起動直後はセーフエリア値の確定が遅れることがあるため、ヘッダー余白も監視して追従させる
                    if (window.__updateHeaderOffset) window.__updateHeaderOffset();
                }, 100);
                setTimeout(stopWatch, 2000);
                loadingScreen.classList.add("fadeout");
                loadingScreen.addEventListener('transitionend', () => loadingScreen.remove(), { once: true });
                setTimeout(() => loadingScreen.remove(), 700); // フェード(0.45s)完了後に確実に除去する保険
            };

            // エラーメッセージ(.no-results)が出た場合も「描画完了」とみなし、
            // データ読込失敗時にローディング画面が9秒間残り続けるのを防ぐ
            const cardsReady = () => !!document.querySelector('#results .fav-btn, #results .episode-item, #results .no-results');

            // フォントの全文字読み込み完了フラグ（__fontsReady はデータ読込後に生成される）
            let fontsDone = false;
            const hookFonts = () => {
                if (window.__fontsReady) { window.__fontsReady.then(() => { fontsDone = true; }); return true; }
                return false;
            };
            hookFonts();

            // ★起動時ちらつき対策: SWの更新チェック決着（index.html側で生成）も待つ。
            // 更新がある場合はローディング画面の下でリロードが行われ、UIが一瞬
            // 見えてから再読込される「ちらつき」が起きない。Promise自体に4秒の
            // 上限があるためオフラインでも起動は止まらない（下のSW_CAPは二重の保険）。
            let swDone = !window.__swUpdateSettled;
            if (window.__swUpdateSettled) window.__swUpdateSettled.then(() => { swDone = true; });

            // タイトル画面は「ほどよい表示時間(MIN_SHOW)」「データ(カード)描画完了」
            // 「フォントの全文字読み込み完了」を満たしたら消す。フォントまで待つことで、
            // どの文字も最初からAdobeフォントで表示され、一瞬だけフォールバックになるFOUTを防ぐ。
            // 低速回線で永遠に待たないよう FONT_CAP を上限にする。
            const MIN_SHOW = 1500;   // タイトル最低表示時間
            const FONT_CAP = 8000;   // フォントを待つ上限（超えたら諦めて表示）
            const SW_CAP = 4500;     // SW更新チェックを待つ上限（Promise側の4秒上限の保険）
            const tryHide = () => {
                const t = performance.now();
                if (!fontsDone) hookFonts();
                if (cardsReady() && t >= MIN_SHOW && (fontsDone || t >= FONT_CAP) && (swDone || t >= SW_CAP)) { hideLoadingScreen(); return; }
                requestAnimationFrame(tryHide);
            };
            tryHide();

            // 最終保険（データ取得やフォントが失敗しても必ず消す）
            setTimeout(hideLoadingScreen, 9000);
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
    const modalIds = ['filterDrawer', 'aboutModal', 'historyModal', 'photoModal', 'tsModal'];
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

  // ==========================================
  // 出演者と関連キーワードの紐付け
  // ==========================================
  const GUEST_RELATED_KEYWORDS = {
    "青山吉能": ["リスアニ！LIVE","大港開唱 MEGAPORT Festival","CENTRAL MUSIC & ENTERTAINMENT FESTIVAL","日清焼そばU.F.O.presents 後藤ひとり生誕記念LIVE","ワイちゃん","EAA","幼稚園","声優グランプリ","ChatGPT","ゆで卵","味噌汁","Re:Re:","二重敬語警察","たべっ子どうぶつ","お茶っ葉","自動車教習所","私の家の近所に住むヒーローへの道","心の夏バテ","心のpixiv","密着音声","熊本","運転免許","点鼻薬","口内炎ガール","慮ったの","はせみの膝","内見予約","電子音","泣いちゃった","匂わせ","おしゃべりピンク","キルミーのベイベー!","よぴえもん","よぴいく"],
    "鈴代紗弓": ["ｵﾓｼﾛｲｯ!","豚","他力本願寺","ハッピーイエロー","車庫入れの紗弓","ツートン","冷麺","3mm","UNITE","それは違う〜","鈴代ナス弓","paypay","なにが悪い","ツボ代紗弓","ボブ代紗弓","事後しちゃうわ通販","SHINY DAYS"],
    "水野朔": ["惑う星","Daydream café","ヒーリングブルー","愛してる","泣いちゃった","髪の毛ちょびっとしろしろ","ワイちゃん","ﾐｼﾞｭﾉｼｬｸﾃﾞｼｭ"],
    "長谷川育美": ["NHKWORLDJAPANMusicFestival","JAPAN JAM","リスアニ！LIVE","大港開唱 MEGAPORT Festival","CENTRAL MUSIC & ENTERTAINMENT FESTIVAL","日清焼そばU.F.O.presents 後藤ひとり生誕記念LIVE","パワフルレッド","友達が減りま〜す","青椒肉絲","雨降らんかな","ぬくもりの家具イクミ","偏見撲滅委員会","黒光りマッチョ育美","もっと固執してよ私に","成人の女なんだからさ。","アメイジング声優ズ","夢小説","匂わせ","Cagayake!GIRLS","Won(*3*)Chu KissMe!","はせみの膝","優しさで言ってない","エロ女上司","よぴいく","お前それ渋谷でできんのかよ"],
    // 他の出演者も同様に追加可能
  };

  for (const [guest, keywords] of Object.entries(GUEST_RELATED_KEYWORDS)) {
    const guestEntry = entriesByLabel.get(guest);
    if (guestEntry) {
      keywords.forEach(kw => {
        const kwEntry = entriesByLabel.get(kw);
        if (kwEntry) {
          guestEntry.norms.forEach(norm => kwEntry.norms.add(norm));
        }
      });
    }
  }

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
      // 候補ラベルにはユーザー登録メモ（自由入力）も含まれるため、必ずエスケープして挿入する
      const i = item.label.toLowerCase().indexOf(qRaw);
      const html = (i >= 0)
        ? `${escapeHtml(item.label.slice(0, i))}<span class="match">${escapeHtml(item.label.slice(i, i + qRaw.length))}</span>${escapeHtml(item.label.slice(i + qRaw.length))}`
        : escapeHtml(item.label);
      const icon = item.type === '出演者' ? '<i class="fa-solid fa-user"></i>'
        : item.type === 'メモ' ? '<i class="fa-solid fa-star memo-star"></i>'
        : '<i class="fa-solid fa-magnifying-glass"></i>';
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
    const items = scored.slice(0, 100).map(({ e }) => {
      let label = e.label;
      const nlabel = normalize(label);
      if (!hasKanji(label) && READING_TO_LABEL[nlabel]) {
        label = READING_TO_LABEL[nlabel];
      }
      if (seen.has(label)) return null;
      seen.add(label);
      return { label: label, type: e.type };
    }).filter(Boolean);

    // ユーザー登録タイムスタンプのメモも候補に出す（部分一致・★マークで区別）。
    // 登録内容は随時変わるため、固定のentriesではなく毎回その場で探す。
    const memoItems = [];
    const seenMemo = new Set();
    for (const id in timestamps) {
      for (const e of (timestamps[id] || [])) {
        const label = (e.label || '').trim();
        if (!label || seenMemo.has(label)) continue;
        if (!tsNormLabel(e).includes(normQ)) continue;
        seenMemo.add(label);
        memoItems.push({ label, type: 'メモ' });
        if (memoItems.length >= 20) break;
      }
      if (memoItems.length >= 20) break;
    }

    // 自分のメモを先頭に表示し、同名のサイト側キーワードは重複させない
    const merged = [...memoItems, ...items.filter(i => !seenMemo.has(i.label))];
    render(merged.slice(0, 100));
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

/* ===================================================
 * スプラッシュカバー（起動画面と同じ見た目の全面オーバーレイ）
 * 用途1: PWAがバックグラウンドへ移る瞬間に被せる。iOSはその瞬間の画面を
 *   スナップショットとして保存し次回起動時に一瞬表示するため、これを
 *   起動画面と同じ見た目にしておくと「前回のUI（下部ボタン等）が
 *   一瞬ちらついて見える」現象がなくなり、起動が常にスプラッシュから始まる。
 * 用途2: SW更新の自動リロード直前に被せ、リロードの明滅を隠して
 *   スプラッシュ→スプラッシュの連続に見せる。
 * =================================================== */
/* ★強化: iOSはバックグラウンド移行後すぐ描画を停止するため、visibilitychange内で
   要素生成や画像読込をしていると、スナップショット撮影までにカバーの描画が
   間に合わないことがある。カバーは起動時に1回だけ組み立ててDOMに置いておき
   （ロゴも先に読込・デコード済みにする）、表示はstyleの切替1発だけにする。 */
let __splashCoverEl = null;
// 端末の物理画面高さ（縦向き基準）。バックグラウンド移行中はビューポート値が
// 当てにならないため、カバーの寸法・ロゴ位置はこの値を基準にする。
function __deviceScreenHeight() {
  const isLandscape = window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
  const w = (window.screen && screen.width) || window.innerWidth || 0;
  const h = (window.screen && screen.height) || window.innerHeight || 0;
  return (isLandscape ? Math.min(w, h) : Math.max(w, h)) || window.innerHeight || 900;
}
function __buildSplashCover() {
  if (__splashCoverEl || !document.body) return;
  const d = document.createElement('div');
  d.id = 'splash-cover';
  const bg = document.documentElement.style.backgroundColor || '#f9fafe';
  // ★重要: inset:0（ビューポート追従）にすると、バックグラウンド移行中に
  // ビューポートが縮んだ瞬間のスナップショットで下部にbody背景が露出し、
  // 次回起動時に「下部が一瞬チラつく」原因になる。画面より大きい固定高さにして
  // どんなビューポート変動でも隙間ができないようにする（はみ出しは無害）。
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:' + bg + ';display:none;';
  const img = new Image();
  img.src = 'logo.png'; // SWキャッシュ済み。起動時に読み込んでおけば表示は即時
  img.alt = '';
  // ロゴは「画面の中央」（カバー箱の中央ではなく）に絶対配置する
  img.style.cssText = 'position:absolute;left:50%;top:0;transform:translate(-50%,-50%);width:330px;max-width:70vw;';
  d.appendChild(img);
  document.body.appendChild(d);
  __splashCoverEl = d;
}
window.__showSplashCover = function () {
  if (!__splashCoverEl) __buildSplashCover();
  if (!__splashCoverEl) return;
  const scrH = __deviceScreenHeight();
  __splashCoverEl.style.height = (scrH + 300) + 'px'; // 画面+300pxで変動を吸収
  const img = __splashCoverEl.querySelector('img');
  if (img) img.style.top = Math.round(scrH / 2) + 'px'; // 物理画面の中央に固定
  __splashCoverEl.style.display = 'block';
};
window.__hideSplashCover = function () {
  if (__splashCoverEl) __splashCoverEl.style.display = 'none';
};

(function enhanceMobileExperience() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
    document.addEventListener('DOMContentLoaded', () => {
      setupPwaBottomNav();
      // カバーを事前構築（ロゴの読込・デコードを済ませ、以後の表示をstyle切替1発にする）
      __buildSplashCover();
    });

    // 復帰時のカバー解除: 即時に外す。
    // ★変更: 以前はカラーテーマで最大0.5秒カバーを保持していたが、
    // 「復帰のたびに一瞬ロゴが表示される」という指摘を受けて即時解除に戻した。
    // （復帰アニメーション中にOSが表示するスナップショット由来の一瞬のロゴは、
    //   起動時ちらつき防止とのトレードオフで残る。帯や色ズレはver.rの
    //   起動中レイヤー同色化で防いでいるため、保持は不要になった）
    const releaseSplashCover = () => {
      window.__hideSplashCover();
    };

    // バックグラウンド移行時はスプラッシュカバーを被せてスナップショットを整える。
    // ブラウザ表示では行わない（タブ切替のプレビューが起動画面になってしまうため）。
    // pagehide でも被せる（iOSが visibilitychange を挟まず退避するケースの保険）。
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') window.__showSplashCover();
      else releaseSplashCover();
    });
    window.addEventListener('pagehide', window.__showSplashCover);
    window.addEventListener('pageshow', releaseSplashCover);
    // 保険: 復帰イベントの取りこぼしでカバーが残った場合も、操作で必ず外れる
    window.addEventListener('touchstart', window.__hideSplashCover, { passive: true });
  }

  const setVh = () => {
    if (isInputFocused) return;
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  setVh();
  window.addEventListener('resize', setVh, { passive: true });
  window.addEventListener('orientationchange', setVh, { passive: true });
  // ★修正: iOSのPWA起動直後はビューポート確定時にwindowのresizeが発火しないことがあり、
  // --vhが起動時の小さい値のまま残っていた（お気に入りが少ない時にフッターが浮く原因）。
  // visualViewportの変化でも再計測して確実に追従させる。
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVh, { passive: true });
  }

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
  const photoModal = document.getElementById('photoModal');
  const tsModal = document.getElementById('tsModal'); // ★追加: タイムスタンプ
  if ((filterDrawer && filterDrawer.style.display === 'block') || 
      (historyModal && historyModal.classList.contains('show')) ||
      (aboutModal && aboutModal.classList.contains('show')) ||
      (photoModal && photoModal.classList.contains('show')) ||
      (tsModal && tsModal.classList.contains('show'))) {
    return;
  }

  const totalPage = Math.ceil(lastResults.length / pageSize);
  if (totalPage <= 1) return; // 1ページしかない場合は何もしない

  if (e.key === 'ArrowRight') {
    // 次のページへ
    if (currentPage < totalPage) {
      e.preventDefault(); // デフォルトのスクロール動作を無効化
      search({ gotoPage: currentPage + 1 });
      scrollToResultsTop();
    }
  } else if (e.key === 'ArrowLeft') {
    // 前のページへ
    if (currentPage > 1) {
      e.preventDefault(); // デフォルトのスクロール動作を無効化
      search({ gotoPage: currentPage - 1 });
      scrollToResultsTop();
    }
  }
});