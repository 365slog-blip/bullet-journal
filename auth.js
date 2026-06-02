/* ═══════════════════════════════════════════════════
   auth.js  —  구글 OAuth 리다이렉트 + PIN 인증
   ═══════════════════════════════════════════════════ */

// ── CONFIG ───────────────────────────────────────────
const CFG = {
  PIN:          '1009',
  SHEET_ID:     '1er2FtemXqRnmzSP8el_WQ8J8Pc79H6qTrHloFMvkgwQ',
  FOLDER_ID:    '11n_9t2Bp260SFqfkz7YoT3o6rRXAj7QG',
  API_KEY:      'AIzaSyBUtEVNLyx4LBp4L8mZixN8_3Io71haDlM',
  CLIENT_ID:    '616148935874-0b5ssnkeg245jl2phfqovlfg28scbqq3.apps.googleusercontent.com',
  SCOPES:       'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  REDIRECT_URI: 'https://365slog-blip.github.io/bullet-journal/',
  DEFAULT_ROUTINES: [
    '기상 후 햇빛쬐기',
    '화장실 후 몸무게 기록',
    '아침 식단 가벼운 단백질 섭취',
    'L-테아닌 & 밀크시슬',
    '홈트(빅시스) 1시간 후 샤워 + 마사지(괄사)',
    '점심 식단',
    '저녁 식단',
    '주 2회 반식육 20분 이상',
    '잠들기 30분~1시간 전 마그네슘 + 멜라토닌',
    '듀오링고',
    '물 2L 이상',
  ],
};

// ── GLOBAL STATE ─────────────────────────────────────
const S = {
  // auth
  accessToken: null,
  tokenExpiry:  0,
  sheetGids:    null,   // { sheetName: numericGid }
  // navigation
  tab:          'home',
  // home
  selDate:      null,   // set in main.js boot
  calYear:      new Date().getFullYear(),
  calMonth:     new Date().getMonth(),
  // diary
  dCalYear:     new Date().getFullYear(),
  dCalMonth:    new Date().getMonth(),
  dWeekSun:     null,   // Sunday of selected diary week
  // project
  projView:     'gallery', // 'gallery' | 'detail'
  projCurrent:  null,
  // language
  lang:         '일본어',
  langSub:      'words',
  wordFilter:   'all',
  flashMode:    false,
  flashIdx:     0,
  flashFlipped: false,
  // writing
  writingView:  'gallery', // 'gallery' | 'form' | 'detail'
  writingCat:   '전체',
  writingEdit:  null,
  writingCurrent: null,
  // stats
  statsYear:    new Date().getFullYear(),
  statsMonth:   new Date().getMonth(),
  // subs
  subsCat:      '전체',
  // data
  calEvents:       [],
  routineSettings: [],
  routineRecords:  [],
  weeklyGoals:     [],
  todoDeep:        [],
  todoNon:         [],
  diaryEntries:    [],
  projects:        [],
  projTasks:       [],
  words:           [],
  duolingo:        [],
  writings:        [],
  subs:            [],
};

// ── GOOGLE OAUTH (redirect implicit flow) ─────────────
function startGoogleLogin() {
  const params = new URLSearchParams({
    client_id:              CFG.CLIENT_ID,
    redirect_uri:           CFG.REDIRECT_URI,
    response_type:          'token',
    scope:                  CFG.SCOPES,
    include_granted_scopes: 'true',
    prompt:                 'select_account',
    state:                  'bj',
  });
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
}

function checkOAuthCallback() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return null;
  const p = new URLSearchParams(hash.slice(1));
  const token     = p.get('access_token');
  const expiresIn = +(p.get('expires_in') || '3600');
  window.history.replaceState({}, document.title, window.location.pathname);
  if (!token) return null;
  return { token, expiresIn };
}

function saveSession(token, expiresIn) {
  const expiry = Date.now() + expiresIn * 1000 - 60000;
  sessionStorage.setItem('bjToken',  token);
  sessionStorage.setItem('bjExpiry', String(expiry));
}

function loadSession() {
  const token  = sessionStorage.getItem('bjToken');
  const expiry = +(sessionStorage.getItem('bjExpiry') || '0');
  if (token && Date.now() < expiry) return { token, expiry };
  return null;
}

function applyToken(token, expiry) {
  S.accessToken = token;
  S.tokenExpiry  = expiry;
}

// ── PIN ───────────────────────────────────────────────
let _pin = '';

function initPin() {
  document.querySelectorAll('.pkey[data-k]').forEach(b =>
    b.addEventListener('click', () => _addPin(b.dataset.k))
  );
  document.getElementById('pkey-del').addEventListener('click', _delPin);
  document.addEventListener('keydown', e => {
    if (document.getElementById('screen-pin').classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9') _addPin(e.key);
    if (e.key === 'Backspace') _delPin();
  });
}

function _addPin(k) {
  if (_pin.length >= 4) return;
  _pin += k;
  _updateDots();
  if (_pin.length === 4) setTimeout(_checkPin, 150);
}
function _delPin() {
  _pin = _pin.slice(0, -1);
  _updateDots();
  _setPinMsg('PIN을 입력하세요', false);
}
function _updateDots() {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('pdot-' + i);
    d.classList.toggle('filled', i < _pin.length);
    d.classList.remove('error');
  }
}
function _checkPin() {
  if (_pin === CFG.PIN) {
    document.getElementById('screen-pin').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    if (typeof onPinSuccess === 'function') onPinSuccess();
  } else {
    for (let i = 0; i < 4; i++) document.getElementById('pdot-' + i).classList.add('error');
    _setPinMsg('잘못된 PIN입니다', true);
    setTimeout(() => { _pin = ''; _updateDots(); _setPinMsg('PIN을 입력하세요', false); }, 800);
  }
}
function _setPinMsg(msg, isErr) {
  const el = document.getElementById('pin-msg');
  el.textContent = msg;
  el.classList.toggle('err', isErr);
}

function showPinScreen() {
  document.getElementById('screen-google').classList.add('hidden');
  document.getElementById('screen-pin').classList.remove('hidden');
  _pin = '';
  _updateDots();
  _setPinMsg('PIN을 입력하세요', false);
}
