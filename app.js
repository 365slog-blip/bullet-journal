/* ═══════════════════════════════════════════════════════
   BULLET JOURNAL  ·  app.js
   ═══════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────
const CFG = {
  PIN: '1009',
  SHEET_ID: '1er2FtemXqRnmzSP8el_WQ8J8Pc79H6qTrHloFMvkgwQ',
  FOLDER_ID: '11n_9t2Bp260SFqfkz7YoT3o6rRXAj7QG',
  API_KEY:   'AIzaSyBUtEVNLyx4LBp4L8mZixN8_3Io71haDlM',
  CLIENT_ID: '616148935874-0b5ssnkeg245jl2phfqovlfg28scbqq3.apps.googleusercontent.com',
  SCOPES:    'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
};

// ── STATE ────────────────────────────────────────────────
const S = {
  tab: 'home',
  accessToken: null,
  tokenExpiry: 0,
  sheetMeta: null,      // { sheetName: gid }
  selectedDate: today(),
  todoTag: '전체',
  reviewCat: '전체',
  reviewData: [],
  todoData: [],
  routineSettings: [],
  routineRecords: [],
  projectData: [],
  taskData: [],
  travelData: [],
  diaryData: [],
  wordData: [],
  duolingoData: [],
  projectStatus: '전체',
  projectView: 'grid',
  langSel: '일본어',
  langSubtab: 'words',
  diaryTab: 'daily',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  weeklyData: [],
  monthlyData: [],
  wordFilter: '전체',
  flashcardMode: false,
  flashcardIdx: 0,
  flashcardRevealed: false,
  grammarNotes: {},
  phraseNotes: {},
  tokenClient: null,
};

// ── UTILITIES ────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}
function fmtDateKr(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`;
}
function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function getWeekKey(dateStr) {
  const ws = getWeekStart(dateStr);
  return ws;
}
function stars(n, max=5) {
  return '★'.repeat(n) + '☆'.repeat(max - n);
}
function el(id) { return document.getElementById(id); }
function qs(sel, ctx=document) { return ctx.querySelector(sel); }
function qsa(sel, ctx=document) { return [...ctx.querySelectorAll(sel)]; }

function showToast(msg, type='') {
  const wrap = el('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' '+type : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}
function showLoading(v) { el('loading-overlay').classList.toggle('hidden', !v); }

function confirm(msg) {
  return new Promise(res => {
    el('confirm-msg').textContent = msg;
    el('confirm-overlay').classList.remove('hidden');
    const ok = el('confirm-yes');
    const no = el('confirm-no');
    const cleanup = () => {
      el('confirm-overlay').classList.add('hidden');
      ok.replaceWith(ok.cloneNode(true));
      no.replaceWith(no.cloneNode(true));
    };
    el('confirm-yes').addEventListener('click', () => { cleanup(); res(true); }, {once:true});
    el('confirm-no').addEventListener('click', () => { cleanup(); res(false); }, {once:true});
  });
}

function openModal(title, bodyHtml, footHtml='') {
  el('modal-title').textContent = title;
  el('modal-body').innerHTML = bodyHtml;
  el('modal-foot').innerHTML = footHtml;
  el('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  el('modal-overlay').classList.add('hidden');
  el('modal-body').innerHTML = '';
  el('modal-foot').innerHTML = '';
}

el('modal-close').addEventListener('click', closeModal);
el('modal-overlay').addEventListener('click', e => { if(e.target===el('modal-overlay')) closeModal(); });

// ── PIN SCREEN ────────────────────────────────────────────
let pinVal = '';
function initPinScreen() {
  qsa('.key-btn').forEach(btn => {
    if (btn.dataset.k !== undefined) {
      btn.addEventListener('click', () => addPin(btn.dataset.k));
    }
  });
  el('key-del').addEventListener('click', delPin);
  document.addEventListener('keydown', e => {
    if (!el('pin-screen').classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') addPin(e.key);
      if (e.key === 'Backspace') delPin();
    }
  });
}
function addPin(k) {
  if (pinVal.length >= 4) return;
  pinVal += k;
  updatePinDots();
  if (pinVal.length === 4) setTimeout(checkPin, 150);
}
function delPin() {
  pinVal = pinVal.slice(0, -1);
  updatePinDots();
  el('pin-hint').textContent = 'PIN을 입력하세요';
  el('pin-hint').classList.remove('err');
}
function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    el(`dot-${i}`).classList.toggle('filled', i < pinVal.length);
    el(`dot-${i}`).classList.remove('error');
  }
}
function checkPin() {
  if (pinVal === CFG.PIN) {
    el('pin-screen').classList.add('hidden');
    el('app').classList.remove('hidden');
    initApp();
    loadAllData();
  } else {
    for (let i = 0; i < 4; i++) el(`dot-${i}`).classList.add('error');
    el('pin-hint').textContent = '잘못된 PIN입니다';
    el('pin-hint').classList.add('err');
    setTimeout(() => { pinVal = ''; updatePinDots(); el('pin-hint').textContent = 'PIN을 입력하세요'; el('pin-hint').classList.remove('err'); }, 800);
  }
}

// ── GOOGLE AUTH ───────────────────────────────────────────
// 순서: Google 로그인 버튼 클릭 → OAuth → PIN 화면 → 앱

function setupGoogleAuth() {
  // GIS 라이브러리 로드 대기 후 tokenClient 초기화 (auth 트리거 안 함)
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(check);
        S.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CFG.CLIENT_ID,
          scope: CFG.SCOPES,
          callback: handleToken,
          // prompt는 requestAccessToken 호출 시 각각 지정
        });
        resolve(true);
      }
    }, 200);
    // 8초 내에 GIS 로드 안 되면 실패 처리
    setTimeout(() => { clearInterval(check); resolve(false); }, 8000);
  });
}

function startGoogleLogin() {
  // 버튼 클릭으로 호출 → 팝업 차단 없음
  if (!S.tokenClient) {
    showGoogleHint('Google API 로딩 중입니다. 잠시 후 다시 시도해주세요.', true);
    return;
  }
  showGoogleHint('로그인 중...', false);
  S.tokenClient.requestAccessToken({ prompt: 'select_account' });
}

function trySilentAuth() {
  // 이미 이 브라우저에서 승인된 계정이면 팝업 없이 토큰 획득
  if (!S.tokenClient) return;
  try {
    S.tokenClient.requestAccessToken({ prompt: 'none' });
  } catch(e) {
    // 무시 — 실패 시 사용자가 버튼 클릭
  }
}

function handleToken(resp) {
  if (resp.error) {
    // 'immediate_failed' 등 silent auth 실패는 버튼 화면 유지
    if (resp.error === 'immediate_failed' || resp.error === 'user_cancel') return;
    showGoogleHint('로그인에 실패했습니다. 다시 시도해주세요.', true);
    return;
  }
  S.accessToken = resp.access_token;
  S.tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000 - 60000;
  scheduleTokenRefresh(resp.expires_in || 3600);
  updateGoogleStatus(true);
  // Google 로그인 성공 → PIN 화면으로
  el('google-screen').classList.add('hidden');
  el('pin-screen').classList.remove('hidden');
  pinVal = '';
  updatePinDots();
  el('pin-hint').textContent = 'PIN을 입력하세요';
  el('pin-hint').classList.remove('err');
}

function scheduleTokenRefresh(expiresIn) {
  // 만료 5분 전 자동 갱신 (사용 중 끊김 방지)
  const delay = Math.max((expiresIn - 300) * 1000, 60000);
  setTimeout(() => {
    if (S.accessToken && S.tokenClient) {
      S.tokenClient.requestAccessToken({ prompt: 'none' });
    }
  }, delay);
}

function updateGoogleStatus(ok) {
  const dot = el('gsync-dot');
  dot.classList.toggle('ok', ok);
  dot.classList.toggle('fail', !ok);
  const statusEl = el('google-conn-status');
  const btnEl = el('google-conn-btn');
  if (statusEl) statusEl.textContent = ok ? '✓ Google 계정이 연결되어 있습니다' : 'Google 계정이 연결되지 않았습니다';
  if (btnEl) btnEl.style.display = ok ? 'none' : 'inline-block';
}

function showGoogleHint(msg, isErr) {
  const hint = el('google-hint');
  hint.textContent = msg;
  hint.classList.toggle('err', isErr);
}
function authHeaders() {
  if (S.accessToken && Date.now() < S.tokenExpiry) {
    return { 'Authorization': `Bearer ${S.accessToken}` };
  }
  return {};
}

// ── SHEETS API ────────────────────────────────────────────
async function sheetsRead(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${CFG.API_KEY}`;
  try {
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) return [];
    const d = await r.json();
    return d.values || [];
  } catch(e) { return []; }
}
async function sheetsAppend(sheetName, row) {
  if (!S.accessToken) { lsSave(sheetName, row); showToast('오프라인 임시 저장됨', ''); return null; }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const r = await fetch(url, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });
  return r.ok ? await r.json() : null;
}
async function sheetsUpdate(sheetName, rowNum, row) {
  if (!S.accessToken) return null;
  const range = `${sheetName}!A${rowNum}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });
  return r.ok;
}
async function sheetsDelete(sheetName, rowNum) {
  if (!S.accessToken) return;
  await loadSheetMeta();
  const gid = S.sheetMeta?.[sheetName];
  if (gid === undefined) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}:batchUpdate`;
  const r = await fetch(url, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: gid, dimension: 'ROWS', startIndex: rowNum-1, endIndex: rowNum } } }] })
  });
  return r.ok;
}
async function loadSheetMeta() {
  if (S.sheetMeta) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}?key=${CFG.API_KEY}`;
  try {
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) return;
    const d = await r.json();
    S.sheetMeta = {};
    (d.sheets || []).forEach(s => { S.sheetMeta[s.properties.title] = s.properties.sheetId; });
  } catch(e) {}
}

// parse rows (skip header, map columns)
function parseRows(rows, cols) {
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).map((r, i) => {
    const obj = { _row: i + 2 };
    cols.forEach((c, j) => { obj[c] = r[j] ?? ''; });
    return obj;
  });
}

// ── DRIVE API ─────────────────────────────────────────────
async function uploadToDrive(file) {
  if (!S.accessToken) { showToast('Google 연결 후 사진 업로드 가능', 'error'); return null; }
  showLoading(true);
  try {
    const meta = { name: file.name, parents: [CFG.FOLDER_ID] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', file);
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: authHeaders(), body: form
    });
    if (!r.ok) throw new Error('Upload failed');
    const d = await r.json();
    // make public
    await fetch(`https://www.googleapis.com/drive/v3/files/${d.id}/permissions`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
    return `https://drive.google.com/uc?id=${d.id}`;
  } catch(e) { showToast('업로드 실패: ' + e.message, 'error'); return null; }
  finally { showLoading(false); }
}

// ── localStorage fallback ─────────────────────────────────
function lsSave(key, data) {
  const arr = JSON.parse(localStorage.getItem('offline_' + key) || '[]');
  arr.push(data);
  localStorage.setItem('offline_' + key, JSON.stringify(arr));
}

// ── NAVIGATION ────────────────────────────────────────────
function initNav() {
  qsa('.bnav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  qsa('.snav-item').forEach(b => b.addEventListener('click', () => { switchTab(b.dataset.tab); closeSideNav(); }));
  qsa('.hc-more').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  el('hamburger').addEventListener('click', openSideNav);
  el('close-nav').addEventListener('click', closeSideNav);
  el('side-overlay').addEventListener('click', closeSideNav);
}
function switchTab(tab) {
  S.tab = tab;
  qsa('.tab-pane').forEach(p => p.classList.remove('active'));
  el('tab-' + tab)?.classList.add('active');
  qsa('.bnav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.snav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderTab(tab);
}
function openSideNav() {
  el('side-nav').classList.add('open');
  el('side-overlay').classList.add('show');
}
function closeSideNav() {
  el('side-nav').classList.remove('open');
  el('side-overlay').classList.remove('show');
}
function renderTab(tab) {
  switch(tab) {
    case 'home':     renderHome(); break;
    case 'todo':     renderTodo(); break;
    case 'review':   renderReview(); break;
    case 'language': renderLanguage(); break;
    case 'diary':    renderDiary(); break;
    case 'project':  renderProject(); break;
    case 'travel':   renderTravel(); break;
    case 'settings': renderSettings(); break;
  }
}

// ── LOAD ALL DATA ─────────────────────────────────────────
async function loadAllData() {
  showLoading(true);
  await loadSheetMeta();
  const [todos, routineSettings, routineRecords, books, movies, dramas, comics,
         diary, weekly, monthly, projects, tasks, travels, words, duolingo] = await Promise.all([
    sheetsRead('투두'), sheetsRead('루틴설정'), sheetsRead('루틴기록'),
    sheetsRead('독서'), sheetsRead('영화'), sheetsRead('드라마'), sheetsRead('웹툰웹소설'),
    sheetsRead('하루일기'), sheetsRead('주간계획'), sheetsRead('월간스케줄'),
    sheetsRead('프로젝트'), sheetsRead('프로젝트태스크'), sheetsRead('여행'),
    sheetsRead('단어장'), sheetsRead('듀오링고')
  ]);
  S.todoData = parseRows(todos, ['date','text','done','tag']);
  S.routineSettings = parseRows(routineSettings, ['name','type','order']);
  S.routineRecords = parseRows(routineRecords, ['date','name','done','value']);
  const bookParsed = parseRows(books, ['title','author','coverUrl','startDate','endDate','rating','review','status']).map(r=>({...r,_cat:'독서'}));
  const movieParsed = parseRows(movies, ['title','director','posterUrl','date','rating','review']).map(r=>({...r,_cat:'영화'}));
  const dramaParsed = parseRows(dramas, ['title','genre','posterUrl','rating','review','finished']).map(r=>({...r,_cat:'드라마'}));
  const comicParsed = parseRows(comics, ['title','genre','coverUrl','rating','review','finished']).map(r=>({...r,_cat:'웹툰웹소설'}));
  S.reviewData = [...bookParsed, ...movieParsed, ...dramaParsed, ...comicParsed];
  S.diaryData = parseRows(diary, ['date','content','weight','routines','condition','breakfast','lunch','dinner']);
  S.weeklyData = parseRows(weekly, ['week','goals','mon','tue','wed','thu','fri','sat','sun','review']);
  S.monthlyData = parseRows(monthly, ['date','title','memo']);
  S.projectData = parseRows(projects, ['name','status','startDate','deadline','desc','priority']);
  S.taskData = parseRows(tasks, ['projectName','task','status','deadline','memo']);
  S.travelData = parseRows(travels, ['title','startDate','endDate','location','content','mainImg','photo1','photo2','photo3','photo4','photo5']);
  S.wordData = parseRows(words, ['lang','word','reading','meaning','example','partOfSpeech','memorized','addedDate']);
  S.duolingoData = parseRows(duolingo, ['date','lang','xp','streak','memo']);
  S.grammarNotes = JSON.parse(localStorage.getItem('grammarNotes') || '{}');
  S.phraseNotes = JSON.parse(localStorage.getItem('phraseNotes') || '{}');
  showLoading(false);
  renderTab(S.tab);
}

// ═══════════════════════════════════════════════════════════
// HOME TAB
// ═══════════════════════════════════════════════════════════
function renderHome() {
  const now = new Date();
  const days = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  el('home-date-big').textContent = `${now.getMonth()+1}월 ${now.getDate()}일`;
  el('home-date-sub').textContent = `${now.getFullYear()}년 ${days[now.getDay()]}`;

  // Today's todos
  const todayTodos = S.todoData.filter(t => t.date === today() && t.done !== 'true');
  if (todayTodos.length === 0) {
    el('hc-todo-body').innerHTML = '<div class="empty-state" style="padding:8px">오늘 할 일이 없습니다 ✓</div>';
  } else {
    el('hc-todo-body').innerHTML = todayTodos.slice(0,4).map(t =>
      `<div style="font-size:.82rem;padding:3px 0;color:var(--text2)">• ${t.text}</div>`
    ).join('') + (todayTodos.length > 4 ? `<div style="font-size:.75rem;color:var(--text3)">+${todayTodos.length-4}개 더</div>` : '');
  }

  // Today's routines
  if (S.routineSettings.length === 0) {
    el('hc-routine-body').innerHTML = '<div style="font-size:.82rem;color:var(--text3)">루틴을 설정해주세요</div>';
  } else {
    const done = S.routineRecords.filter(r => r.date === today() && r.done === 'true').map(r => r.name);
    const total = S.routineSettings.length;
    const doneCount = done.length;
    el('hc-routine-body').innerHTML = `
      <div style="font-size:.82rem;color:var(--text2);margin-bottom:6px">${doneCount}/${total} 완료</div>
      <div style="height:6px;background:var(--bg3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${total?Math.round(doneCount/total*100):0}%;background:var(--accent);transition:width .5s;border-radius:4px"></div>
      </div>`;
  }

  // Recent diary
  const recentDiary = [...S.diaryData].sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (recentDiary) {
    el('hc-diary-body').innerHTML = `<div style="font-size:.78rem;color:var(--text3);margin-bottom:2px">${fmtDate(recentDiary.date)}</div><div style="font-size:.82rem;color:var(--text2)">${recentDiary.content.slice(0,60)}${recentDiary.content.length>60?'…':''}</div>`;
  } else {
    el('hc-diary-body').innerHTML = '<div style="font-size:.82rem;color:var(--text3)">아직 일기가 없습니다</div>';
  }

  // Active projects
  const active = S.projectData.filter(p => p.status === '진행중');
  if (active.length === 0) {
    el('hc-project-body').innerHTML = '<div style="font-size:.82rem;color:var(--text3)">진행 중인 프로젝트 없음</div>';
  } else {
    el('hc-project-body').innerHTML = active.slice(0,3).map(p =>
      `<div style="font-size:.82rem;color:var(--text2);padding:2px 0">• ${p.name}</div>`
    ).join('');
  }
}

// ═══════════════════════════════════════════════════════════
// TODO TAB
// ═══════════════════════════════════════════════════════════
function renderTodo() {
  renderDateStrip();
  renderWeeklyRef();
  renderTodoList();
  renderRoutineSection();
}

function renderDateStrip() {
  const strip = el('date-strip');
  const days = ['일','월','화','수','목','금','토'];
  strip.innerHTML = '';
  const base = new Date();
  base.setDate(base.getDate() - 7);
  for (let i = 0; i < 21; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const ds = d.toISOString().slice(0,10);
    const isToday = ds === today();
    const isSel = ds === S.selectedDate;
    const hasTodo = S.todoData.some(t => t.date === ds);
    const cell = document.createElement('div');
    cell.className = 'date-cell' + (isToday?' today':'') + (isSel?' selected':'') + (hasTodo?' has-todo':'');
    cell.innerHTML = `<span class="day-name">${days[d.getDay()]}</span><span class="day-num">${d.getDate()}</span>`;
    cell.addEventListener('click', () => { S.selectedDate = ds; renderTodo(); });
    strip.appendChild(cell);
    if (isToday && !isSel) cell.scrollIntoView({inline:'center',block:'nearest'});
  }
  // scroll selected into view
  const selCell = strip.querySelector('.selected');
  if (selCell) selCell.scrollIntoView({inline:'center',block:'nearest'});
}

function renderWeeklyRef() {
  const ws = getWeekKey(S.selectedDate);
  const weekPlan = S.weeklyData.find(w => w.week === ws);
  const block = el('weekly-ref-block');
  if (!weekPlan) { block.classList.remove('show'); return; }
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
  const dayLabels = ['월','화','수','목','금','토','일'];
  block.classList.add('show');
  block.innerHTML = `<div class="weekly-ref-title">이번 주 계획</div>
    <div class="weekly-ref-grid">
      ${dayLabels.map((l,i) => `<div><div class="wref-day">${l}</div><div class="wref-item">${weekPlan[dayKeys[i]]||''}</div></div>`).join('')}
    </div>`;
}

function renderTodoList() {
  const list = el('todo-list');
  let items = S.todoData.filter(t => t.date === S.selectedDate);
  if (S.todoTag !== '전체') items = items.filter(t => t.tag === S.todoTag);
  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>할 일이 없습니다</div>`;
    return;
  }
  list.innerHTML = items.map(t => `
    <div class="todo-item ${t.done==='true'?'done':''}" data-row="${t._row}">
      <input type="checkbox" class="todo-cb" ${t.done==='true'?'checked':''} data-row="${t._row}">
      <span class="todo-text">${escHtml(t.text)}</span>
      ${t.tag ? `<span class="todo-tag">${t.tag}</span>` : ''}
      <button class="todo-del" data-row="${t._row}">✕</button>
    </div>`).join('');

  list.querySelectorAll('.todo-cb').forEach(cb => cb.addEventListener('change', async () => {
    const row = +cb.dataset.row;
    const item = S.todoData.find(t => t._row === row);
    if (!item) return;
    item.done = cb.checked ? 'true' : 'false';
    cb.closest('.todo-item').classList.toggle('done', cb.checked);
    await sheetsUpdate('투두', row, [item.date, item.text, item.done, item.tag]);
    renderHome();
  }));
  list.querySelectorAll('.todo-del').forEach(btn => btn.addEventListener('click', async () => {
    const row = +btn.dataset.row;
    const ok = await confirm('할 일을 삭제하시겠습니까?');
    if (!ok) return;
    await sheetsDelete('투두', row);
    S.todoData = S.todoData.filter(t => t._row !== row);
    renderTodoList();
  }));
}

function initTodoEvents() {
  qsa('.tag-chip').forEach(c => c.addEventListener('click', () => {
    S.todoTag = c.dataset.tag;
    qsa('.tag-chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    renderTodoList();
  }));
  el('add-todo-btn').addEventListener('click', openAddTodoModal);
}

function openAddTodoModal() {
  openModal('할 일 추가', `
    <div class="form-group">
      <label class="form-label">내용</label>
      <input class="form-input" id="todo-text-inp" placeholder="할 일을 입력하세요" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">날짜</label>
      <input type="date" class="form-input" id="todo-date-inp" value="${S.selectedDate}">
    </div>
    <div class="form-group">
      <label class="form-label">태그</label>
      <select class="form-select" id="todo-tag-inp">
        <option value="">선택 없음</option>
        <option value="작업">작업</option>
        <option value="건강">건강</option>
        <option value="일상">일상</option>
        <option value="기타">기타</option>
      </select>
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="todo-save-btn">저장</button>`
  );
  el('todo-save-btn').addEventListener('click', saveTodo);
  el('todo-text-inp').addEventListener('keydown', e => { if(e.key==='Enter') saveTodo(); });
}

async function saveTodo() {
  const text = el('todo-text-inp').value.trim();
  const date = el('todo-date-inp').value;
  const tag = el('todo-tag-inp').value;
  if (!text) { showToast('내용을 입력하세요', 'error'); return; }
  showLoading(true);
  const row = [date, text, 'false', tag];
  const r = await sheetsAppend('투두', row);
  showLoading(false);
  if (r) {
    showToast('저장되었습니다', 'success');
    closeModal();
    const rows = await sheetsRead('투두');
    S.todoData = parseRows(rows, ['date','text','done','tag']);
    renderTodoList();
  } else {
    showToast('저장 실패', 'error');
  }
}

// ── ROUTINE SECTION ───────────────────────────────────────
function renderRoutineSection() {
  const btnRow = el('routine-btn-row');
  const extra = el('routine-extra');
  if (S.routineSettings.length === 0) {
    btnRow.innerHTML = '<div style="font-size:.82rem;color:var(--text3)">설정에서 루틴을 추가하세요</div>';
    extra.innerHTML = '';
    return;
  }
  const todayRecords = S.routineRecords.filter(r => r.date === S.selectedDate);
  const sorted = [...S.routineSettings].sort((a,b) => (+a.order||0)-(+b.order||0));
  btnRow.innerHTML = sorted.map(rtn => {
    const rec = todayRecords.find(r => r.name === rtn.name);
    const done = rec && rec.done === 'true';
    return `<button class="routine-btn ${done?'done':''}" data-name="${rtn.name}" data-type="${rtn.type}">${rtn.name}</button>`;
  }).join('');

  btnRow.querySelectorAll('.routine-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleRoutine(btn.dataset.name, btn.dataset.type, btn));
  });
}

async function toggleRoutine(name, type, btn) {
  const rec = S.routineRecords.find(r => r.date === S.selectedDate && r.name === name);
  if (type === 'weight' || type === 'diet') {
    showRoutineInput(name, type, rec);
    return;
  }
  const newDone = !(rec && rec.done === 'true');
  if (rec) {
    rec.done = newDone ? 'true' : 'false';
    await sheetsUpdate('루틴기록', rec._row, [rec.date, rec.name, rec.done, rec.value]);
  } else {
    const row = [S.selectedDate, name, newDone ? 'true' : 'false', ''];
    S.routineRecords.push({ _row: 99999, date: S.selectedDate, name, done: newDone?'true':'false', value: '' });
    await sheetsAppend('루틴기록', row);
    const rows = await sheetsRead('루틴기록');
    S.routineRecords = parseRows(rows, ['date','name','done','value']);
  }
  renderRoutineSection();
  renderHome();
}

function showRoutineInput(name, type, rec) {
  const extra = el('routine-extra');
  const existing = extra.querySelector(`[data-rname="${name}"]`);
  if (existing) { existing.remove(); return; }
  const div = document.createElement('div');
  div.className = 'routine-input-group';
  div.dataset.rname = name;
  if (type === 'weight') {
    div.innerHTML = `<div class="routine-input-label">${name} (kg)</div>
      <input type="number" class="form-input" id="ri-${name}" placeholder="몸무게 입력" value="${rec?.value||''}" step="0.1">
      <button class="btn-primary mt-8" style="margin-top:8px" id="ri-save-${name}">저장</button>`;
    extra.appendChild(div);
    el(`ri-save-${name}`).addEventListener('click', () => saveRoutineValue(name, el(`ri-${name}`).value, rec));
  } else if (type === 'diet') {
    div.innerHTML = `<div class="routine-input-label">식단</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <input class="form-input" id="ri-breakfast" placeholder="아침" value="${rec?.value?.split('|')[0]||''}">
        <input class="form-input" id="ri-lunch" placeholder="점심" value="${rec?.value?.split('|')[1]||''}">
        <input class="form-input" id="ri-dinner" placeholder="저녁" value="${rec?.value?.split('|')[2]||''}">
      </div>
      <button class="btn-primary" style="margin-top:8px" id="ri-save-${name}">저장</button>`;
    extra.appendChild(div);
    el(`ri-save-${name}`).addEventListener('click', () => {
      const v = [el('ri-breakfast').value, el('ri-lunch').value, el('ri-dinner').value].join('|');
      saveRoutineValue(name, v, rec);
    });
  }
}

async function saveRoutineValue(name, value, rec) {
  if (rec) {
    rec.done = 'true'; rec.value = value;
    await sheetsUpdate('루틴기록', rec._row, [rec.date, rec.name, rec.done, rec.value]);
  } else {
    await sheetsAppend('루틴기록', [S.selectedDate, name, 'true', value]);
    const rows = await sheetsRead('루틴기록');
    S.routineRecords = parseRows(rows, ['date','name','done','value']);
  }
  showToast('저장되었습니다', 'success');
  renderRoutineSection();
}

// ═══════════════════════════════════════════════════════════
// REVIEW TAB
// ═══════════════════════════════════════════════════════════
function renderReview() {
  let items = S.reviewData;
  if (S.reviewCat !== '전체') items = items.filter(r => r._cat === S.reviewCat);
  const gallery = el('review-gallery');
  if (items.length === 0) {
    gallery.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div>아직 기록이 없습니다</div>`;
    return;
  }
  gallery.innerHTML = items.map(item => {
    const imgUrl = item.coverUrl || item.posterUrl || '';
    const title = item.title;
    const rating = +item.rating || 0;
    return `<div class="review-card" data-row="${item._row}" data-cat="${item._cat}">
      ${imgUrl ? `<img class="review-card-img" src="${imgUrl}" alt="${escHtml(title)}" loading="lazy">` : `<div class="review-card-img-placeholder">${catIcon(item._cat)}</div>`}
      <div class="review-card-info">
        <div class="review-card-cat">${item._cat}</div>
        <div class="review-card-title">${escHtml(title)}</div>
        <div class="review-card-stars">${stars(rating)}</div>
      </div>
    </div>`;
  }).join('');
  gallery.querySelectorAll('.review-card').forEach(card => {
    card.addEventListener('click', () => openReviewDetail(card.dataset.row, card.dataset.cat));
  });
}

function catIcon(cat) {
  return {독서:'📖',영화:'🎬',드라마:'📺',웹툰웹소설:'💬'}[cat] || '📝';
}

function initReviewEvents() {
  qsa('.cat-chip').forEach(c => c.addEventListener('click', () => {
    S.reviewCat = c.dataset.cat;
    qsa('.cat-chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    renderReview();
  }));
  el('add-review-btn').addEventListener('click', openAddReviewModal);
}

function openReviewDetail(row, cat) {
  const item = S.reviewData.find(r => r._row === +row && r._cat === cat);
  if (!item) return;
  const imgUrl = item.coverUrl || item.posterUrl || '';
  let meta = '';
  if (cat === '독서') meta = `저자: ${item.author} | ${item.startDate ? item.startDate+'~'+item.endDate : ''} | ${item.status}`;
  if (cat === '영화') meta = `감독: ${item.director} | ${item.date}`;
  if (cat === '드라마' || cat === '웹툰웹소설') meta = `장르: ${item.genre} | ${item.finished==='true'?'완결':'미완결'}`;
  openModal(item.title, `
    ${imgUrl ? `<img src="${imgUrl}" class="detail-cover" alt="">` : ''}
    <div class="detail-meta">${meta}</div>
    <div class="review-card-stars" style="font-size:1.1rem;margin:8px 0">${stars(+item.rating||0)}</div>
    <div class="detail-review">${escHtml(item.review)}</div>`,
    `<button class="btn-secondary" onclick="closeModal()">닫기</button>
     <button class="btn-outline" onclick="openEditReview(${row},'${cat}')">수정</button>
     <button class="btn-danger" onclick="deleteReview(${row},'${cat}')">삭제</button>`
  );
}

async function deleteReview(row, cat) {
  const ok = await confirm('이 항목을 삭제하시겠습니까?');
  if (!ok) return;
  const sheet = catSheet(cat);
  await sheetsDelete(sheet, +row);
  S.reviewData = S.reviewData.filter(r => !(r._row===+row && r._cat===cat));
  closeModal(); renderReview();
  showToast('삭제되었습니다', 'success');
}

function catSheet(cat) {
  return {독서:'독서',영화:'영화',드라마:'드라마',웹툰웹소설:'웹툰웹소설'}[cat] || cat;
}

function openAddReviewModal(editItem=null) {
  const cat = editItem ? editItem._cat : (S.reviewCat === '전체' ? '독서' : S.reviewCat);
  const isEdit = !!editItem;
  const title = isEdit ? '평론 수정' : '새 평론';

  let formHtml = `
    <div class="form-group">
      <label class="form-label">카테고리</label>
      <select class="form-select" id="rv-cat">
        <option value="독서" ${cat==='독서'?'selected':''}>독서</option>
        <option value="영화" ${cat==='영화'?'selected':''}>영화</option>
        <option value="드라마" ${cat==='드라마'?'selected':''}>드라마</option>
        <option value="웹툰웹소설" ${cat==='웹툰웹소설'?'selected':''}>웹툰/웹소설</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">표지/포스터 URL</label>
      <input class="form-input" id="rv-img" placeholder="이미지 URL 또는 아래에서 업로드" value="${escHtml(editItem?.coverUrl||editItem?.posterUrl||'')}">
      <input type="file" id="rv-img-file" accept="image/*" style="margin-top:6px">
    </div>
    <div class="form-group">
      <label class="form-label">제목</label>
      <input class="form-input" id="rv-title" value="${escHtml(editItem?.title||'')}">
    </div>
    <div id="rv-extra-fields"></div>
    <div class="form-group">
      <label class="form-label">별점</label>
      <div class="star-rating" id="rv-stars">${[1,2,3,4,5].map(n=>`<span class="star ${(+editItem?.rating||0)>=n?'on':''}" data-n="${n}">★</span>`).join('')}</div>
      <input type="hidden" id="rv-rating" value="${editItem?.rating||'5'}">
    </div>
    <div class="form-group">
      <label class="form-label">감상</label>
      <textarea class="form-textarea" id="rv-review">${escHtml(editItem?.review||'')}</textarea>
    </div>`;

  openModal(title, formHtml,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="rv-save">저장</button>`
  );

  updateReviewExtraFields(cat, editItem);
  el('rv-cat').addEventListener('change', () => updateReviewExtraFields(el('rv-cat').value, null));
  initStarRating('rv-stars', 'rv-rating');
  el('rv-img-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadToDrive(file);
    if (url) el('rv-img').value = url;
  });
  el('rv-save').addEventListener('click', () => saveReview(isEdit ? editItem : null));
}

function openEditReview(row, cat) {
  const item = S.reviewData.find(r => r._row===+row && r._cat===cat);
  if (!item) return;
  closeModal();
  openAddReviewModal(item);
}

function updateReviewExtraFields(cat, item) {
  const div = el('rv-extra-fields');
  if (cat === '독서') {
    div.innerHTML = `
      <div class="form-group"><label class="form-label">저자</label><input class="form-input" id="rv-author" value="${escHtml(item?.author||'')}"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">시작날짜</label><input type="date" class="form-input" id="rv-start" value="${item?.startDate||''}"></div>
        <div class="form-group"><label class="form-label">완독날짜</label><input type="date" class="form-input" id="rv-end" value="${item?.endDate||''}"></div>
      </div>
      <div class="form-group"><label class="form-label">상태</label>
        <select class="form-select" id="rv-status">
          <option ${item?.status==='읽는중'?'selected':''}>읽는중</option>
          <option ${item?.status==='완독'?'selected':''}>완독</option>
          <option ${item?.status==='중단'?'selected':''}>중단</option>
        </select>
      </div>`;
  } else if (cat === '영화') {
    div.innerHTML = `
      <div class="form-group"><label class="form-label">감독</label><input class="form-input" id="rv-director" value="${escHtml(item?.director||'')}"></div>
      <div class="form-group"><label class="form-label">날짜</label><input type="date" class="form-input" id="rv-date" value="${item?.date||today()}"></div>`;
  } else if (cat === '드라마' || cat === '웹툰웹소설') {
    div.innerHTML = `
      <div class="form-group"><label class="form-label">장르</label><input class="form-input" id="rv-genre" value="${escHtml(item?.genre||'')}"></div>
      <div class="form-group"><label class="form-label">완결여부</label>
        <select class="form-select" id="rv-finished">
          <option value="false" ${item?.finished!=='true'?'selected':''}>미완결</option>
          <option value="true" ${item?.finished==='true'?'selected':''}>완결</option>
        </select>
      </div>`;
  }
}

async function saveReview(editItem) {
  const cat = el('rv-cat').value;
  const title = el('rv-title').value.trim();
  const imgUrl = el('rv-img').value.trim();
  const rating = el('rv-rating').value;
  const review = el('rv-review').value.trim();
  if (!title) { showToast('제목을 입력하세요', 'error'); return; }
  let row;
  const sheet = catSheet(cat);
  if (cat === '독서') {
    row = [title, el('rv-author')?.value||'', imgUrl, el('rv-start')?.value||'', el('rv-end')?.value||'', rating, review, el('rv-status')?.value||''];
  } else if (cat === '영화') {
    row = [title, el('rv-director')?.value||'', imgUrl, el('rv-date')?.value||today(), rating, review];
  } else {
    row = [title, el('rv-genre')?.value||'', imgUrl, rating, review, el('rv-finished')?.value||'false'];
  }
  showLoading(true);
  if (editItem) {
    await sheetsUpdate(sheet, editItem._row, row);
    showToast('수정되었습니다', 'success');
  } else {
    await sheetsAppend(sheet, row);
    showToast('저장되었습니다', 'success');
  }
  const rows = await sheetsRead(sheet);
  const cols = {독서:['title','author','coverUrl','startDate','endDate','rating','review','status'],영화:['title','director','posterUrl','date','rating','review'],드라마:['title','genre','posterUrl','rating','review','finished'],웹툰웹소설:['title','genre','coverUrl','rating','review','finished']}[cat];
  const parsed = parseRows(rows, cols).map(r=>({...r,_cat:cat}));
  S.reviewData = S.reviewData.filter(r => r._cat !== cat).concat(parsed);
  showLoading(false);
  closeModal(); renderReview();
}

function initStarRating(containerId, hiddenId) {
  const container = el(containerId);
  if (!container) return;
  container.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const n = +star.dataset.n;
      el(hiddenId).value = n;
      container.querySelectorAll('.star').forEach(s => s.classList.toggle('on', +s.dataset.n <= n));
    });
  });
}

// ═══════════════════════════════════════════════════════════
// LANGUAGE TAB
// ═══════════════════════════════════════════════════════════
function renderLanguage() {
  const body = el('lang-body');
  switch(S.langSubtab) {
    case 'words':    renderWords(body); break;
    case 'grammar':  renderNote(body, 'grammar'); break;
    case 'phrases':  renderNote(body, 'phrases'); break;
    case 'duolingo': renderDuolingo(body); break;
  }
}

function initLanguageEvents() {
  qsa('.lang-btn').forEach(b => b.addEventListener('click', () => {
    S.langSel = b.dataset.lang;
    qsa('.lang-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderLanguage();
  }));
  qsa('.subtab').forEach(b => b.addEventListener('click', () => {
    S.langSubtab = b.dataset.subtab;
    S.flashcardMode = false;
    qsa('.subtab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderLanguage();
  }));
}

function renderWords(container) {
  const words = S.wordData.filter(w => w.lang === S.langSel);
  const filtered = S.wordFilter === '못외운것만' ? words.filter(w => w.memorized !== 'true') : words;

  if (S.flashcardMode) {
    renderFlashcard(container, filtered); return;
  }

  container.innerHTML = `
    <div class="word-toolbar">
      <div class="word-filter-btns">
        <button class="tag-chip ${S.wordFilter==='전체'?'active':''}" onclick="setWordFilter('전체')">전체</button>
        <button class="tag-chip ${S.wordFilter==='못외운것만'?'active':''}" onclick="setWordFilter('못외운것만')">못외운것만</button>
      </div>
      <div class="word-actions">
        <button class="btn-sm" onclick="startFlashcard()">🃏 플래시카드</button>
        <button class="fab-sm" onclick="openAddWordModal()">+</button>
      </div>
    </div>
    ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-icon">📖</div>단어가 없습니다</div>` : `
    <div style="overflow-x:auto">
      <table class="word-table">
        <thead><tr><th>단어</th><th>읽는법</th><th>뜻</th><th>품사</th><th>상태</th><th></th></tr></thead>
        <tbody>${filtered.map(w => `
          <tr>
            <td><strong>${escHtml(w.word)}</strong></td>
            <td style="color:var(--text3)">${escHtml(w.reading)}</td>
            <td>${escHtml(w.meaning)}</td>
            <td style="color:var(--text3)">${escHtml(w.partOfSpeech)}</td>
            <td><span class="${w.memorized==='true'?'memorized-badge':'not-memorized'}" onclick="toggleMemorized(${w._row})" style="cursor:pointer">${w.memorized==='true'?'외움':'미암기'}</span></td>
            <td><button class="todo-del" onclick="deleteWord(${w._row})">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}`;
}

function setWordFilter(f) { S.wordFilter = f; renderLanguage(); }
function startFlashcard() { S.flashcardMode = true; S.flashcardIdx = 0; S.flashcardRevealed = false; renderLanguage(); }

function renderFlashcard(container, words) {
  if (words.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🃏</div>단어가 없습니다</div>
      <div style="text-align:center;margin-top:12px"><button class="btn-outline" onclick="stopFlashcard()">← 목록으로</button></div>`;
    return;
  }
  const idx = S.flashcardIdx % words.length;
  const w = words[idx];
  container.innerHTML = `
    <div class="flashcard-mode">
      <div style="color:var(--text3);font-size:.82rem">${idx+1} / ${words.length}</div>
      <div class="flashcard ${S.flashcardRevealed?'revealed':''}" id="flashcard-el">
        <div class="flashcard-word">${escHtml(w.word)}</div>
        <div class="flashcard-reading">${escHtml(w.reading)}</div>
        <div class="flashcard-meaning">${escHtml(w.meaning)}${w.example?`<div style="font-size:.8rem;color:var(--text3);margin-top:6px">${escHtml(w.example)}</div>`:''}</div>
        ${!S.flashcardRevealed ? '<div style="font-size:.75rem;color:var(--text3);margin-top:12px">클릭하면 뜻 표시</div>' : ''}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn-outline" onclick="prevCard()">← 이전</button>
        <button class="btn-primary" onclick="nextCard()">다음 →</button>
        <button class="btn-secondary" onclick="stopFlashcard()">목록으로</button>
      </div>
    </div>`;
  el('flashcard-el').addEventListener('click', () => { S.flashcardRevealed = !S.flashcardRevealed; renderLanguage(); });
}
function prevCard() { S.flashcardIdx = Math.max(0, S.flashcardIdx-1); S.flashcardRevealed=false; renderLanguage(); }
function nextCard() { S.flashcardIdx++; S.flashcardRevealed=false; renderLanguage(); }
function stopFlashcard() { S.flashcardMode=false; renderLanguage(); }

async function toggleMemorized(row) {
  const w = S.wordData.find(x => x._row===row);
  if (!w) return;
  w.memorized = w.memorized==='true'?'false':'true';
  await sheetsUpdate('단어장', row, [w.lang,w.word,w.reading,w.meaning,w.example,w.partOfSpeech,w.memorized,w.addedDate]);
  renderLanguage();
}

async function deleteWord(row) {
  const ok = await confirm('단어를 삭제하시겠습니까?');
  if (!ok) return;
  await sheetsDelete('단어장', row);
  S.wordData = S.wordData.filter(w => w._row !== row);
  renderLanguage();
}

function openAddWordModal() {
  openModal('단어 추가', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">단어</label><input class="form-input" id="wd-word" autofocus></div>
      <div class="form-group"><label class="form-label">읽는법</label><input class="form-input" id="wd-reading"></div>
    </div>
    <div class="form-group"><label class="form-label">뜻</label><input class="form-input" id="wd-meaning"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">품사</label>
        <select class="form-select" id="wd-pos">
          <option value="">-</option><option>명사</option><option>동사</option><option>형용사</option><option>부사</option><option>조사</option><option>접속사</option><option>기타</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">언어</label>
        <select class="form-select" id="wd-lang">
          <option ${S.langSel==='일본어'?'selected':''}>일본어</option>
          <option ${S.langSel==='영어'?'selected':''}>영어</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">예문</label><input class="form-input" id="wd-ex"></div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="wd-save">저장</button>`
  );
  el('wd-save').addEventListener('click', saveWord);
}

async function saveWord() {
  const word = el('wd-word').value.trim();
  const reading = el('wd-reading').value.trim();
  const meaning = el('wd-meaning').value.trim();
  if (!word || !meaning) { showToast('단어와 뜻을 입력하세요', 'error'); return; }
  const row = [el('wd-lang').value, word, reading, meaning, el('wd-ex').value, el('wd-pos').value, 'false', today()];
  showLoading(true);
  await sheetsAppend('단어장', row);
  const rows = await sheetsRead('단어장');
  S.wordData = parseRows(rows, ['lang','word','reading','meaning','example','partOfSpeech','memorized','addedDate']);
  showLoading(false);
  closeModal(); renderLanguage();
  showToast('저장되었습니다', 'success');
}

function renderNote(container, type) {
  const key = S.langSel + '_' + type;
  const notes = type==='grammar' ? S.grammarNotes : S.phraseNotes;
  const content = notes[key] || '';
  container.innerHTML = `
    <div class="note-editor">
      <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
        <button class="btn-primary" id="note-save-btn">저장</button>
      </div>
      <textarea class="form-textarea" id="note-textarea" style="min-height:400px" placeholder="${type==='grammar'?'문법 노트를 자유롭게 작성하세요...':'회화 표현을 자유롭게 작성하세요...'}">${escHtml(content)}</textarea>
    </div>`;
  el('note-save-btn').addEventListener('click', () => {
    const val = el('note-textarea').value;
    if (type==='grammar') { S.grammarNotes[key]=val; localStorage.setItem('grammarNotes',JSON.stringify(S.grammarNotes)); }
    else { S.phraseNotes[key]=val; localStorage.setItem('phraseNotes',JSON.stringify(S.phraseNotes)); }
    showToast('저장되었습니다', 'success');
  });
}

function renderDuolingo(container) {
  const data = S.duolingoData.filter(d => d.lang === S.langSel).sort((a,b)=>b.date.localeCompare(a.date));
  container.innerHTML = `
    <div class="duolingo-section">
      <div class="duolingo-head">
        <h4 style="font-size:.95rem;color:var(--text2)">듀오링고 기록</h4>
        <button class="fab-sm" onclick="openAddDuoModal()">+</button>
      </div>
      ${data.length===0 ? '<div class="empty-state"><div class="empty-icon">🦜</div>기록이 없습니다</div>' : `
      <div class="duolingo-log">
        ${data.map(d=>`<div class="duolingo-entry">
          <span class="duolingo-date">${fmtDate(d.date)}</span>
          <span class="duolingo-xp">+${d.xp} XP</span>
          <span class="duolingo-streak">🔥 ${d.streak}일</span>
          <span style="font-size:.8rem;color:var(--text3);flex:1">${escHtml(d.memo||'')}</span>
          <button class="todo-del" onclick="deleteDuolingo(${d._row})">✕</button>
        </div>`).join('')}
      </div>`}
    </div>`;
}

function openAddDuoModal() {
  openModal('듀오링고 기록 추가', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">날짜</label><input type="date" class="form-input" id="duo-date" value="${today()}"></div>
      <div class="form-group"><label class="form-label">언어</label>
        <select class="form-select" id="duo-lang">
          <option ${S.langSel==='일본어'?'selected':''}>일본어</option>
          <option ${S.langSel==='영어'?'selected':''}>영어</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">경험치 (XP)</label><input type="number" class="form-input" id="duo-xp" value="0"></div>
      <div class="form-group"><label class="form-label">연속일수</label><input type="number" class="form-input" id="duo-streak" value="0"></div>
    </div>
    <div class="form-group"><label class="form-label">메모</label><input class="form-input" id="duo-memo"></div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="duo-save">저장</button>`
  );
  el('duo-save').addEventListener('click', saveDuolingo);
}

async function saveDuolingo() {
  const row = [el('duo-date').value, el('duo-lang').value, el('duo-xp').value, el('duo-streak').value, el('duo-memo').value];
  showLoading(true);
  await sheetsAppend('듀오링고', row);
  const rows = await sheetsRead('듀오링고');
  S.duolingoData = parseRows(rows, ['date','lang','xp','streak','memo']);
  showLoading(false);
  closeModal(); renderLanguage();
  showToast('저장되었습니다', 'success');
}

async function deleteDuolingo(row) {
  const ok = await confirm('기록을 삭제하시겠습니까?');
  if (!ok) return;
  await sheetsDelete('듀오링고', row);
  S.duolingoData = S.duolingoData.filter(d => d._row !== row);
  renderLanguage();
}

// ═══════════════════════════════════════════════════════════
// DIARY TAB
// ═══════════════════════════════════════════════════════════
function renderDiary() {
  switch(S.diaryTab) {
    case 'daily':   renderDailyDiary(); break;
    case 'weekly':  renderWeeklyPlan(); break;
    case 'monthly': renderMonthlyCalendar(); break;
  }
}

function initDiaryEvents() {
  qsa('.dtab').forEach(b => b.addEventListener('click', () => {
    S.diaryTab = b.dataset.dtab;
    qsa('.dtab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderDiary();
  }));
}

function renderDailyDiary() {
  const body = el('diary-body');
  const diaryDate = S.selectedDate;
  const entry = S.diaryData.find(d => d.date === diaryDate) || {};
  const conditions = ['😊','😐','😔'];
  const routines = S.routineRecords.filter(r => r.date === diaryDate);
  const routineSummary = S.routineSettings.length > 0
    ? S.routineSettings.map(rs => {
        const rec = routines.find(r => r.name === rs.name);
        return `${rec?.done==='true'?'✓':'○'} ${rs.name}`;
      }).join('  ')
    : '루틴 없음';

  body.innerHTML = `
    <div class="daily-diary">
      <div class="diary-date-sel">
        <input type="date" class="form-input" id="diary-date-inp" value="${diaryDate}" style="flex:1">
        <button class="btn-sm" id="diary-go-btn">이동</button>
      </div>
      <div>
        <div class="form-label" style="margin-bottom:6px">컨디션</div>
        <div class="condition-row">
          ${conditions.map(c=>`<button class="condition-btn ${entry.condition===c?'active':''}" data-c="${c}">${c}</button>`).join('')}
        </div>
      </div>
      <div>
        <div class="form-label" style="margin-bottom:6px">오늘 하루</div>
        <textarea class="diary-textarea" id="diary-content" placeholder="오늘 하루를 기록하세요...">${escHtml(entry.content||'')}</textarea>
      </div>
      <div class="diary-routine-summary">
        <strong style="display:block;margin-bottom:4px;font-size:.8rem">루틴 달성</strong>
        ${routineSummary}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-primary" id="diary-save-btn">저장</button>
      </div>
    </div>`;

  let selCondition = entry.condition || '';
  body.querySelectorAll('.condition-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selCondition = btn.dataset.c;
      body.querySelectorAll('.condition-btn').forEach(b => b.classList.toggle('active', b.dataset.c===selCondition));
    });
  });
  el('diary-go-btn').addEventListener('click', () => {
    S.selectedDate = el('diary-date-inp').value;
    renderDailyDiary();
  });
  el('diary-save-btn').addEventListener('click', async () => {
    const content = el('diary-content').value;
    const row = [S.selectedDate, content, entry.weight||'', '', selCondition, '', '', ''];
    showLoading(true);
    if (entry._row) {
      await sheetsUpdate('하루일기', entry._row, row);
    } else {
      await sheetsAppend('하루일기', row);
    }
    const rows = await sheetsRead('하루일기');
    S.diaryData = parseRows(rows, ['date','content','weight','routines','condition','breakfast','lunch','dinner']);
    showLoading(false);
    showToast('저장되었습니다', 'success');
    renderHome();
  });
}

function renderWeeklyPlan() {
  const body = el('diary-body');
  const ws = getWeekKey(S.selectedDate);
  const entry = S.weeklyData.find(w => w.week === ws) || {};
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
  const dayLabels = ['월','화','수','목','금','토','일'];

  body.innerHTML = `
    <div class="weekly-plan">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <button class="btn-sm" id="wk-prev">←</button>
        <span style="font-size:.85rem;color:var(--text2);flex:1;text-align:center">${fmtDate(ws)} 주</span>
        <button class="btn-sm" id="wk-next">→</button>
      </div>
      <div class="form-group">
        <label class="form-label">이번 주 목표</label>
        <textarea class="form-textarea" id="wk-goals" style="min-height:60px">${escHtml(entry.goals||'')}</textarea>
      </div>
      <div>
        <div class="form-label" style="margin-bottom:6px">요일별 할 일</div>
        <div class="weekly-days-grid">
          ${dayLabels.map((l,i)=>`<div class="weekly-day-cell">
            <div class="weekly-day-label">${l}</div>
            <textarea class="weekly-day-input" id="wk-${dayKeys[i]}">${escHtml(entry[dayKeys[i]]||'')}</textarea>
          </div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">주간 회고</label>
        <textarea class="form-textarea" id="wk-review">${escHtml(entry.review||'')}</textarea>
      </div>
      <button class="btn-primary" id="wk-save">저장</button>
    </div>`;

  el('wk-prev').addEventListener('click', () => {
    const d = new Date(ws + 'T00:00:00'); d.setDate(d.getDate()-7);
    S.selectedDate = d.toISOString().slice(0,10); renderWeeklyPlan();
  });
  el('wk-next').addEventListener('click', () => {
    const d = new Date(ws + 'T00:00:00'); d.setDate(d.getDate()+7);
    S.selectedDate = d.toISOString().slice(0,10); renderWeeklyPlan();
  });
  el('wk-save').addEventListener('click', async () => {
    const row = [ws, el('wk-goals').value, ...dayKeys.map(k=>el('wk-'+k).value), el('wk-review').value];
    showLoading(true);
    if (entry._row) { await sheetsUpdate('주간계획', entry._row, row); }
    else { await sheetsAppend('주간계획', row); }
    const rows = await sheetsRead('주간계획');
    S.weeklyData = parseRows(rows, ['week','goals','mon','tue','wed','thu','fri','sat','sun','review']);
    showLoading(false);
    showToast('저장되었습니다', 'success');
    renderWeeklyRef();
  });
}

function renderMonthlyCalendar() {
  const body = el('diary-body');
  const year = S.calYear, month = S.calMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const dows = ['월','화','수','목','금','토','일'];
  const events = S.monthlyData.filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`));

  let cells = '';
  for (let i = 1; i < startDow; i++) cells += `<div class="cal-day other-month"></div>`;
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === today();
    const dayEvents = events.filter(e => e.date === ds);
    cells += `<div class="cal-day ${isToday?'today':''}" onclick="openMonthlyEvent('${ds}')">
      <div class="cal-day-num">${d}</div>
      ${dayEvents.map(e=>`<div class="cal-event">${escHtml(e.title)}</div>`).join('')}
    </div>`;
  }

  body.innerHTML = `
    <div class="monthly-calendar">
      <div class="cal-nav">
        <button class="btn-sm" onclick="changeCalMonth(-1)">←</button>
        <span class="cal-month">${year}년 ${month+1}월</span>
        <button class="btn-sm" onclick="changeCalMonth(1)">→</button>
      </div>
      <div class="cal-grid">
        ${dows.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
}

function changeCalMonth(delta) {
  S.calMonth += delta;
  if (S.calMonth < 0) { S.calMonth = 11; S.calYear--; }
  if (S.calMonth > 11) { S.calMonth = 0; S.calYear++; }
  renderMonthlyCalendar();
}

function openMonthlyEvent(date) {
  const events = S.monthlyData.filter(e => e.date === date);
  openModal(`${fmtDate(date)} 일정`, `
    ${events.map(e=>`<div style="background:var(--bg2);border-radius:var(--radius-sm);padding:10px;margin-bottom:8px">
      <div style="font-weight:500">${escHtml(e.title)}</div>
      ${e.memo?`<div style="font-size:.82rem;color:var(--text3);margin-top:4px">${escHtml(e.memo)}</div>`:''}
      <button class="todo-del" style="margin-top:4px" onclick="deleteMonthlyEvent(${e._row})">삭제</button>
    </div>`).join('')}
    <div class="divider"></div>
    <div class="form-group"><label class="form-label">일정 제목</label><input class="form-input" id="me-title"></div>
    <div class="form-group"><label class="form-label">메모</label><input class="form-input" id="me-memo"></div>`,
    `<button class="btn-secondary" onclick="closeModal()">닫기</button>
     <button class="btn-primary" id="me-add">추가</button>`
  );
  el('me-add').addEventListener('click', async () => {
    const title = el('me-title').value.trim();
    if (!title) return;
    await sheetsAppend('월간스케줄', [date, title, el('me-memo').value]);
    const rows = await sheetsRead('월간스케줄');
    S.monthlyData = parseRows(rows, ['date','title','memo']);
    closeModal(); renderMonthlyCalendar();
    showToast('저장되었습니다', 'success');
  });
}

async function deleteMonthlyEvent(row) {
  const ok = await confirm('일정을 삭제하시겠습니까?');
  if (!ok) return;
  await sheetsDelete('월간스케줄', row);
  S.monthlyData = S.monthlyData.filter(e => e._row !== row);
  closeModal(); renderMonthlyCalendar();
}

// ═══════════════════════════════════════════════════════════
// PROJECT TAB
// ═══════════════════════════════════════════════════════════
function renderProject() {
  const view = el('project-view');
  let projects = S.projectData;
  if (S.projectStatus !== '전체') projects = projects.filter(p => p.status === S.projectStatus);
  if (S.projectView === 'kanban') { renderKanban(view, projects); return; }

  if (projects.length === 0) {
    view.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂</div>프로젝트가 없습니다</div>`;
    return;
  }
  view.innerHTML = `<div class="project-grid">
    ${projects.map(p => {
      const tasks = S.taskData.filter(t => t.projectName === p.name);
      const done = tasks.filter(t => t.status === '완료').length;
      return `<div class="project-card" onclick="openProjectDetail(${p._row})">
        <div class="project-card-name">${escHtml(p.name)}</div>
        <div class="project-card-desc">${escHtml(p.desc)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span class="project-status-badge status-${p.status}">${p.status}</span>
          ${tasks.length>0?`<span style="font-size:.75rem;color:var(--text3)">${done}/${tasks.length}</span>`:''}
        </div>
        ${p.deadline?`<div class="project-dates">마감: ${fmtDate(p.deadline)}</div>`:''}
        ${p.priority?`<div class="project-priority">우선순위: ${p.priority}</div>`:''}
      </div>`;
    }).join('')}
  </div>`;
}

function renderKanban(view, projects) {
  const statuses = ['계획','진행중','완료','보류'];
  view.innerHTML = `<div class="kanban-board">
    ${statuses.map(st => {
      const cols = projects.filter(p => p.status === st);
      return `<div class="kanban-col">
        <div class="kanban-col-title">${st} (${cols.length})</div>
        <div class="kanban-items">
          ${cols.map(p=>`<div class="kanban-item" onclick="openProjectDetail(${p._row})">${escHtml(p.name)}</div>`).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function openProjectDetail(row) {
  const p = S.projectData.find(x => x._row === row);
  if (!p) return;
  const tasks = S.taskData.filter(t => t.projectName === p.name);
  openModal(p.name, `
    <div class="detail-meta">상태: <strong>${p.status}</strong>${p.deadline?` | 마감: ${fmtDate(p.deadline)}`:''}</div>
    ${p.desc?`<div class="detail-review">${escHtml(p.desc)}</div>`:''}
    <div class="divider"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <strong style="font-size:.88rem">태스크</strong>
      <button class="fab-sm" onclick="openAddTaskModal('${escHtml(p.name)}')">+</button>
    </div>
    <div class="task-list" id="task-list-modal">
      ${tasks.map(t=>`<div class="task-item">
        <input type="checkbox" class="task-cb" ${t.status==='완료'?'checked':''} onchange="toggleTask(${t._row},this)">
        <span class="task-text ${t.status==='완료'?'done':''}">${escHtml(t.task)}</span>
        ${t.deadline?`<span style="font-size:.72rem;color:var(--text3)">${fmtDate(t.deadline)}</span>`:''}
        <button class="todo-del" onclick="deleteTask(${t._row})">✕</button>
      </div>`).join('')}
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">닫기</button>
     <button class="btn-outline" onclick="openEditProject(${row})">수정</button>
     <button class="btn-danger" onclick="deleteProject(${row})">삭제</button>`
  );
}

function openAddTaskModal(projectName) {
  openModal('태스크 추가', `
    <div class="form-group"><label class="form-label">태스크</label><input class="form-input" id="task-text" autofocus></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">마감일</label><input type="date" class="form-input" id="task-deadline"></div>
      <div class="form-group"><label class="form-label">메모</label><input class="form-input" id="task-memo"></div>
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="task-save">저장</button>`
  );
  el('task-save').addEventListener('click', async () => {
    const text = el('task-text').value.trim();
    if (!text) return;
    const row = [projectName, text, '진행중', el('task-deadline').value, el('task-memo').value];
    await sheetsAppend('프로젝트태스크', row);
    const rows = await sheetsRead('프로젝트태스크');
    S.taskData = parseRows(rows, ['projectName','task','status','deadline','memo']);
    closeModal();
    const pRow = S.projectData.find(p => p.name === projectName);
    if (pRow) openProjectDetail(pRow._row);
    showToast('저장되었습니다', 'success');
  });
}

async function toggleTask(row, cb) {
  const t = S.taskData.find(x => x._row===row);
  if (!t) return;
  t.status = cb.checked ? '완료' : '진행중';
  cb.nextElementSibling.classList.toggle('done', cb.checked);
  await sheetsUpdate('프로젝트태스크', row, [t.projectName, t.task, t.status, t.deadline, t.memo]);
}

async function deleteTask(row) {
  const ok = await confirm('태스크를 삭제하시겠습니까?');
  if (!ok) return;
  const t = S.taskData.find(x => x._row===row);
  await sheetsDelete('프로젝트태스크', row);
  S.taskData = S.taskData.filter(x => x._row!==row);
  closeModal();
  const pRow = S.projectData.find(p => p.name === t?.projectName);
  if (pRow) openProjectDetail(pRow._row);
}

function initProjectEvents() {
  qsa('.status-chip').forEach(c => c.addEventListener('click', () => {
    S.projectStatus = c.dataset.st;
    qsa('.status-chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    renderProject();
  }));
  el('view-toggle').addEventListener('click', () => {
    S.projectView = S.projectView==='grid'?'kanban':'grid';
    el('view-toggle').textContent = S.projectView==='kanban'?'⊟ 그리드':'⊞ 칸반';
    renderProject();
  });
  el('add-project-btn').addEventListener('click', () => openProjectModal());
}

function openProjectModal(editItem=null) {
  const isEdit = !!editItem;
  openModal(isEdit?'프로젝트 수정':'새 프로젝트', `
    <div class="form-group"><label class="form-label">프로젝트명</label><input class="form-input" id="pj-name" value="${escHtml(editItem?.name||'')}" autofocus></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">상태</label>
        <select class="form-select" id="pj-status">
          ${['계획','진행중','완료','보류'].map(s=>`<option ${editItem?.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">우선순위</label>
        <select class="form-select" id="pj-priority">
          <option value="">-</option>
          ${['높음','보통','낮음'].map(s=>`<option ${editItem?.priority===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">시작일</label><input type="date" class="form-input" id="pj-start" value="${editItem?.startDate||today()}"></div>
      <div class="form-group"><label class="form-label">마감일</label><input type="date" class="form-input" id="pj-deadline" value="${editItem?.deadline||''}"></div>
    </div>
    <div class="form-group"><label class="form-label">설명</label><textarea class="form-textarea" id="pj-desc" style="min-height:80px">${escHtml(editItem?.desc||'')}</textarea></div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="pj-save">저장</button>`
  );
  el('pj-save').addEventListener('click', async () => {
    const name = el('pj-name').value.trim();
    if (!name) { showToast('프로젝트명을 입력하세요','error'); return; }
    const row = [name, el('pj-status').value, el('pj-start').value, el('pj-deadline').value, el('pj-desc').value, el('pj-priority').value];
    showLoading(true);
    if (isEdit) { await sheetsUpdate('프로젝트', editItem._row, row); }
    else { await sheetsAppend('프로젝트', row); }
    const rows = await sheetsRead('프로젝트');
    S.projectData = parseRows(rows, ['name','status','startDate','deadline','desc','priority']);
    showLoading(false);
    closeModal(); renderProject();
    showToast('저장되었습니다', 'success');
  });
}

function openEditProject(row) {
  const p = S.projectData.find(x => x._row===row);
  if (!p) return;
  closeModal();
  openProjectModal(p);
}

async function deleteProject(row) {
  const ok = await confirm('프로젝트를 삭제하시겠습니까?');
  if (!ok) return;
  await sheetsDelete('프로젝트', row);
  S.projectData = S.projectData.filter(p => p._row!==row);
  closeModal(); renderProject();
  showToast('삭제되었습니다', 'success');
}

// ═══════════════════════════════════════════════════════════
// TRAVEL TAB
// ═══════════════════════════════════════════════════════════
function renderTravel() {
  const gallery = el('travel-gallery');
  if (S.travelData.length === 0) {
    gallery.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">✈️</div>여행 기록이 없습니다</div>`;
    return;
  }
  gallery.innerHTML = S.travelData.map(t => `
    <div class="travel-card" onclick="openTravelDetail(${t._row})">
      ${t.mainImg ? `<img class="travel-card-img" src="${t.mainImg}" alt="${escHtml(t.title)}" loading="lazy">` : `<div class="travel-card-img-ph">🗺️</div>`}
      <div class="travel-card-info">
        <div class="travel-card-title">${escHtml(t.title)}</div>
        <div class="travel-card-loc">📍 ${escHtml(t.location)}</div>
        <div class="travel-card-date">${fmtDate(t.startDate)}${t.endDate&&t.endDate!==t.startDate?' ~ '+fmtDate(t.endDate):''}</div>
      </div>
    </div>`).join('');
}

function openTravelDetail(row) {
  const t = S.travelData.find(x => x._row===row);
  if (!t) return;
  const photos = [t.photo1,t.photo2,t.photo3,t.photo4,t.photo5].filter(Boolean);
  openModal(t.title, `
    ${t.mainImg?`<img src="${t.mainImg}" style="width:100%;border-radius:var(--radius-sm);margin-bottom:10px" alt="">`:''}
    <div class="detail-meta">📍 ${escHtml(t.location)}</div>
    <div class="detail-meta">${fmtDate(t.startDate)}${t.endDate&&t.endDate!==t.startDate?' ~ '+fmtDate(t.endDate):''}</div>
    <div class="detail-review">${escHtml(t.content)}</div>
    ${photos.length>0?`<div class="travel-photo-grid">${photos.map(p=>`<img src="${p}" alt="" loading="lazy">`).join('')}</div>`:''}`,
    `<button class="btn-secondary" onclick="closeModal()">닫기</button>
     <button class="btn-outline" onclick="openEditTravel(${row})">수정</button>
     <button class="btn-danger" onclick="deleteTravel(${row})">삭제</button>`
  );
}

function openEditTravel(row) {
  const t = S.travelData.find(x => x._row===row);
  closeModal();
  openTravelModal(t);
}

async function deleteTravel(row) {
  const ok = await confirm('여행 기록을 삭제하시겠습니까?');
  if (!ok) return;
  await sheetsDelete('여행', row);
  S.travelData = S.travelData.filter(t => t._row!==row);
  closeModal(); renderTravel();
  showToast('삭제되었습니다', 'success');
}

function initTravelEvents() {
  el('add-travel-btn').addEventListener('click', () => openTravelModal());
}

function openTravelModal(editItem=null) {
  const isEdit = !!editItem;
  openModal(isEdit?'여행 수정':'새 여행 기록', `
    <div class="form-group"><label class="form-label">제목</label><input class="form-input" id="tv-title" value="${escHtml(editItem?.title||'')}" autofocus></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">시작날짜</label><input type="date" class="form-input" id="tv-start" value="${editItem?.startDate||today()}"></div>
      <div class="form-group"><label class="form-label">종료날짜</label><input type="date" class="form-input" id="tv-end" value="${editItem?.endDate||''}"></div>
    </div>
    <div class="form-group"><label class="form-label">장소</label><input class="form-input" id="tv-loc" value="${escHtml(editItem?.location||'')}"></div>
    <div class="form-group">
      <label class="form-label">대표 이미지 URL</label>
      <input class="form-input" id="tv-mainimg" value="${editItem?.mainImg||''}" placeholder="이미지 URL">
      <input type="file" id="tv-mainimg-file" accept="image/*" style="margin-top:6px">
    </div>
    <div class="form-group"><label class="form-label">여행 기록</label><textarea class="form-textarea" id="tv-content">${escHtml(editItem?.content||'')}</textarea></div>
    <div class="form-group">
      <label class="form-label">추가 사진 (최대 5장) - URL</label>
      ${[1,2,3,4,5].map(i=>`<input class="form-input" id="tv-p${i}" value="${editItem?.[`photo${i}`]||''}" placeholder="사진 ${i} URL" style="margin-bottom:4px">`).join('')}
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="tv-save">저장</button>`
  );
  el('tv-mainimg-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadToDrive(file);
    if (url) el('tv-mainimg').value = url;
  });
  el('tv-save').addEventListener('click', async () => {
    const title = el('tv-title').value.trim();
    if (!title) { showToast('제목을 입력하세요','error'); return; }
    const row = [title, el('tv-start').value, el('tv-end').value, el('tv-loc').value,
      el('tv-content').value, el('tv-mainimg').value,
      el('tv-p1').value, el('tv-p2').value, el('tv-p3').value, el('tv-p4').value, el('tv-p5').value];
    showLoading(true);
    if (isEdit) { await sheetsUpdate('여행', editItem._row, row); }
    else { await sheetsAppend('여행', row); }
    const rows = await sheetsRead('여행');
    S.travelData = parseRows(rows, ['title','startDate','endDate','location','content','mainImg','photo1','photo2','photo3','photo4','photo5']);
    showLoading(false);
    closeModal(); renderTravel();
    showToast('저장되었습니다', 'success');
  });
}

// ═══════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════
function renderSettings() {
  renderRoutineMgmt();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  el('dark-mode-cb').checked = isDark;
}

function renderRoutineMgmt() {
  const list = el('routine-mgmt-list');
  if (S.routineSettings.length === 0) {
    list.innerHTML = '<div style="font-size:.82rem;color:var(--text3);padding:8px 0">루틴이 없습니다. 아래에서 추가하세요.</div>';
    return;
  }
  list.innerHTML = S.routineSettings.sort((a,b)=>(+a.order||0)-(+b.order||0)).map(r => `
    <div class="routine-mgmt-item">
      <span class="routine-mgmt-name">${escHtml(r.name)}</span>
      <span style="font-size:.72rem;color:var(--text3)">${r.type}</span>
      <button class="routine-mgmt-del" onclick="deleteRoutine(${r._row})">✕</button>
    </div>`).join('');
}

function initSettingsEvents() {
  el('dark-mode-cb').addEventListener('change', toggleTheme);
  el('add-routine-btn').addEventListener('click', openAddRoutineModal);
  // google-conn-btn 이벤트는 boot에서 등록 (중복 방지)
  el('theme-toggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
  el('dark-mode-cb').checked = !isDark;
}

function openAddRoutineModal() {
  openModal('루틴 추가', `
    <div class="form-group"><label class="form-label">루틴 이름</label><input class="form-input" id="rt-name" autofocus placeholder="예: 영양제, 물 2L"></div>
    <div class="form-group"><label class="form-label">타입</label>
      <select class="form-select" id="rt-type">
        <option value="checkbox">체크박스</option>
        <option value="weight">몸무게 (숫자 입력)</option>
        <option value="diet">식단 (아침/점심/저녁)</option>
      </select>
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn-primary" id="rt-save">저장</button>`
  );
  el('rt-save').addEventListener('click', async () => {
    const name = el('rt-name').value.trim();
    if (!name) { showToast('이름을 입력하세요','error'); return; }
    const order = S.routineSettings.length + 1;
    const row = [name, el('rt-type').value, order];
    showLoading(true);
    await sheetsAppend('루틴설정', row);
    const rows = await sheetsRead('루틴설정');
    S.routineSettings = parseRows(rows, ['name','type','order']);
    showLoading(false);
    closeModal();
    renderRoutineMgmt();
    showToast('저장되었습니다', 'success');
  });
}

async function deleteRoutine(row) {
  const ok = await confirm('루틴을 삭제하시겠습니까?');
  if (!ok) return;
  await sheetsDelete('루틴설정', row);
  S.routineSettings = S.routineSettings.filter(r => r._row!==row);
  renderRoutineMgmt();
  showToast('삭제되었습니다', 'success');
}

// ═══════════════════════════════════════════════════════════
// PULL TO REFRESH (mobile)
// ═══════════════════════════════════════════════════════════
function initPullToRefresh() {
  let startY = 0, pulling = false;
  const content = el('main-content');
  content.addEventListener('touchstart', e => {
    if (content.scrollTop === 0) { startY = e.touches[0].clientY; pulling = true; }
  }, {passive:true});
  content.addEventListener('touchend', e => {
    if (pulling && e.changedTouches[0].clientY - startY > 80) {
      showToast('새로고침 중...', '');
      loadAllData().then(() => showToast('업데이트 완료', 'success'));
    }
    pulling = false;
  }, {passive:true});
}

// ── HELPER ────────────────────────────────────────────────
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// expose globals needed by inline onclick handlers
window.closeModal = closeModal;
window.openEditReview = openEditReview;
window.deleteReview = deleteReview;
window.openEditProject = openEditProject;
window.deleteProject = deleteProject;
window.openAddTaskModal = openAddTaskModal;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.openTravelDetail = openTravelDetail;
window.openEditTravel = openEditTravel;
window.deleteTravel = deleteTravel;
window.openProjectDetail = openProjectDetail;
window.changeCalMonth = changeCalMonth;
window.openMonthlyEvent = openMonthlyEvent;
window.deleteMonthlyEvent = deleteMonthlyEvent;
window.deleteRoutine = deleteRoutine;
window.toggleMemorized = toggleMemorized;
window.deleteWord = deleteWord;
window.setWordFilter = setWordFilter;
window.startFlashcard = startFlashcard;
window.stopFlashcard = stopFlashcard;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.openAddWordModal = openAddWordModal;
window.openAddDuoModal = openAddDuoModal;
window.deleteDuolingo = deleteDuolingo;
window.openAddReviewModal = openAddReviewModal;

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
function initApp() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  initNav();
  initTodoEvents();
  initReviewEvents();
  initLanguageEvents();
  initDiaryEvents();
  initProjectEvents();
  initTravelEvents();
  initSettingsEvents();
  initPullToRefresh();

  renderTab('home');
  updateGoogleStatus(true); // Google 로그인을 통과했으므로 항상 연결됨
}

// ── BOOT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // 테마 먼저 적용
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // PIN 키패드 이벤트 등록
  initPinScreen();

  // GIS 라이브러리 로드 대기 및 tokenClient 초기화
  const ready = await setupGoogleAuth();

  if (!ready) {
    // GIS 로드 실패 (네트워크 문제 등)
    showGoogleHint('Google API 로드에 실패했습니다. 페이지를 새로고침해 주세요.', true);
    return;
  }

  // Google 로그인 버튼 이벤트 (버튼 클릭 → 팝업 차단 없음)
  el('google-login-btn').addEventListener('click', startGoogleLogin);

  // 설정 탭의 재연결 버튼도 동일하게 처리
  el('google-conn-btn').addEventListener('click', startGoogleLogin);

  // 이미 이 브라우저에서 승인된 계정이 있으면 자동 로그인 시도
  // 성공 시 handleToken이 호출되어 PIN 화면으로 자동 이동
  trySilentAuth();
});

// Register SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
