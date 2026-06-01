/* ═══════════════════════════════════════════════════
   main.js  —  앱 전체 로직
   ═══════════════════════════════════════════════════ */

// ── UTILS ─────────────────────────────────────────────
function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

function showToast(msg, isErr = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' error' : '');
  t.textContent = msg;
  document.getElementById('toast-wrap').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function confirmAction(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  const ov  = document.getElementById('confirm-overlay');
  const yes = document.getElementById('confirm-yes');
  const no  = document.getElementById('confirm-no');
  ov.classList.remove('hidden');
  yes.onclick = () => { ov.classList.add('hidden'); cb(); };
  no.onclick  = () => ov.classList.add('hidden');
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr() { return fmtDate(new Date()); }

function weekSunday(ds) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return fmtDate(d);
}

function fmtKor(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

function starsHTML(rating) {
  const r = parseFloat(rating) || 0;
  let h = '';
  for (let i = 1; i <= 5; i++) h += r >= i ? '★' : '☆';
  return h;
}

// ── NAV ───────────────────────────────────────────────
function switchTab(tab) {
  S.tab = tab;
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.ntab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.drawer-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  switch (tab) {
    case 'home':     renderCal(); renderHomeRight(); break;
    case 'diary':    renderDiaryMiniCal(); renderDiaryWeekGrid(); break;
    case 'project':  renderProjectGallery(); break;
    case 'language': renderLangBody(); break;
    case 'writing':  renderWritingGallery(); break;
    case 'stats':    renderStats(); break;
  }
}

function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

function initNav() {
  document.querySelectorAll('.ntab').forEach(b =>
    b.addEventListener('click', () => { closeDrawer(); switchTab(b.dataset.tab); })
  );
  document.querySelectorAll('.drawer-item').forEach(b =>
    b.addEventListener('click', () => { closeDrawer(); switchTab(b.dataset.tab); })
  );
  document.getElementById('hamburger').addEventListener('click', openDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('theme-btn').addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bjTheme', html.dataset.theme);
  });
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    showLoading();
    try { await loadData(); switchTab(S.tab); showToast('새로고침 완료'); }
    catch (e) { showToast('새로고침 실패', true); }
    finally  { hideLoading(); }
  });
}

// ── DATA LOAD ─────────────────────────────────────────
async function loadData() {
  await loadSheetMeta();
  const [
    todoRows, routineSetRows, routineRecRows,
    diaryRows, weeklyRows, calRows,
    projRows, taskRows, wordRows, duoRows,
    booksRows, moviesRows, dramasRows, webtoonRows,
  ] = await Promise.all([
    sheetsRead('투두'),       sheetsRead('루틴설정'), sheetsRead('루틴기록'),
    sheetsRead('하루일기'),   sheetsRead('주간계획'), sheetsRead('월간스케줄'),
    sheetsRead('프로젝트'),   sheetsRead('프로젝트태스크'),
    sheetsRead('단어장'),     sheetsRead('듀오링고'),
    sheetsRead('독서'),       sheetsRead('영화'),
    sheetsRead('드라마'),     sheetsRead('웹툰웹소설'),
  ]);

  const todos    = parseRows(todoRows, ['날짜', '항목', '타입', '완료']);
  S.todoDeep     = todos.filter(t => t.타입 === 'deep');
  S.todoNon      = todos.filter(t => t.타입 === 'non');
  S.routineSettings = parseRows(routineSetRows, ['루틴명', '순서', '타입']);
  S.routineRecords  = parseRows(routineRecRows, ['날짜', '루틴명', '완료', '값']);
  // diary: ['날짜', '점수', '_x', '내용'] — keep 4 cols for back-compat (col3 unused)
  S.diaryEntries    = parseRows(diaryRows, ['날짜', '점수', '_x', '내용']);
  S.weeklyGoals     = parseRows(weeklyRows, ['주시작일', '항목', '완료']);
  S.calEvents       = parseRows(calRows, ['날짜', '내용', '색상']);
  S.projects        = parseRows(projRows, ['ID', '제목', '설명', '색상', '시작일', '종료일', '상태', '브레인스토밍']);
  S.projTasks       = parseRows(taskRows, ['프로젝트ID', '제목', '내용', '완료', '데드라인', '비고']);
  // words: new columns include 한자, 발음, 예문해석
  S.words           = parseRows(wordRows, ['언어', '단어', '한자', '뜻', '발음', '예문', '예문해석', '태그']);
  S.duolingo        = parseRows(duoRows,  ['날짜', '언어', 'XP', '스트릭']);

  const wCols = ['제목', '서브', '별점', '날짜', '내용', '이미지'];
  S.writings = [
    ...parseRows(booksRows,   wCols).map(w => ({ ...w, _sheet: '독서',       _cat: '독서' })),
    ...parseRows(moviesRows,  wCols).map(w => ({ ...w, _sheet: '영화',       _cat: '영화' })),
    ...parseRows(dramasRows,  wCols).map(w => ({ ...w, _sheet: '드라마',     _cat: '드라마' })),
    ...parseRows(webtoonRows, wCols).map(w => ({ ...w, _sheet: '웹툰웹소설', _cat: '웹툰웹소설' })),
  ].sort((a, b) => b.날짜.localeCompare(a.날짜));

  if (S.routineSettings.length === 0) await initDefaultRoutines();
}

async function initDefaultRoutines() {
  for (let i = 0; i < CFG.DEFAULT_ROUTINES.length; i++) {
    const name = CFG.DEFAULT_ROUTINES[i];
    const type = name.includes('몸무게') ? 'weight' : name.includes('식단') ? 'meal' : 'checkbox';
    await sheetsAppend('루틴설정', [name, String(i + 1), type]);
  }
  const rows = await sheetsRead('루틴설정');
  S.routineSettings = parseRows(rows, ['루틴명', '순서', '타입']);
}

// ── HOME ──────────────────────────────────────────────
function renderTodayHero() {
  const el = document.getElementById('home-date-hero');
  if (!el) return;
  const d   = new Date(S.selDate + 'T00:00:00');
  const dow = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][d.getDay()];
  el.innerHTML = `<span class="hero-date">${d.getMonth()+1}월 ${d.getDate()}일</span><span class="hero-dow">${dow}</span>`;
}

function renderHomeRight() {
  renderTodayHero();
  renderWeeklyGoals();
  renderWeeklyGoals({ listId: 'diary-weekly-list', addId: 'diary-weekly-add',
    labelId: 'diary-week-range-label', sun: S.dWeekSun || weekSunday(S.selDate) });
  renderRoutines();
  renderTodos('deep');
  renderTodos('non');
}

// ── CALENDAR ──────────────────────────────────────────
function renderCal() {
  const y = S.calYear, m = S.calMonth;
  document.getElementById('cal-month-label').textContent = `${y}년 ${m+1}월`;

  const first    = new Date(y, m, 1);
  const last     = new Date(y, m+1, 0);
  const startDow = first.getDay();
  const today    = todayStr();
  const evtSet   = new Set(S.calEvents.map(e => e.날짜));

  let html = '';
  for (let i = 0; i < startDow; i++) html += '<div class="cal-cell"></div>';
  for (let d = 1; d <= last.getDate(); d++) {
    const ds = fmtDate(new Date(y, m, d));
    const isToday = ds === today;
    const isSel   = ds === S.selDate;
    html += `<div class="cal-cell${isToday?' today':''}${isSel?' selected':''}" data-date="${ds}">
      <span class="cal-day-num">${d}</span>
      ${evtSet.has(ds) ? '<i class="cal-dot"></i>' : ''}
    </div>`;
  }

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-cell[data-date]').forEach(c =>
    c.addEventListener('click', () => selectDate(c.dataset.date))
  );

  document.getElementById('cal-prev').onclick = () => {
    S.calMonth === 0 ? (S.calYear--, S.calMonth = 11) : S.calMonth--;
    renderCal();
  };
  document.getElementById('cal-next').onclick = () => {
    S.calMonth === 11 ? (S.calYear++, S.calMonth = 0) : S.calMonth++;
    renderCal();
  };
  renderCalEventPanel();
}

function selectDate(ds) {
  S.selDate = ds;
  const d = new Date(ds + 'T00:00:00');
  S.calYear = d.getFullYear(); S.calMonth = d.getMonth();
  renderCal();
  renderHomeRight();
}

function renderCalEventPanel() {
  const panel  = document.getElementById('cal-event-panel');
  const events = S.calEvents.filter(e => e.날짜 === S.selDate);
  let html = `<div class="cal-event-title">${fmtKor(S.selDate)} 일정</div>`;
  events.forEach(ev => {
    html += `<div class="cal-event-item" data-row="${ev._row}">
      <span class="cal-evt-dot" style="width:8px;height:8px;border-radius:50%;background:${ev.색상||'var(--accent)'};flex-shrink:0;display:inline-block"></span>
      <span class="cal-event-text">${ev.내용}</span>
      <button class="cal-event-del" data-row="${ev._row}">✕</button>
    </div>`;
  });
  html += `<div class="cal-event-add">
    <input class="cal-event-input" id="event-input" placeholder="+ 일정 입력 후 Enter">
    <input type="color" id="event-color" value="#5c3d2e" style="width:26px;height:24px;padding:0 2px;border:1px solid var(--border);border-radius:4px;cursor:pointer;flex-shrink:0">
  </div>`;
  panel.innerHTML = html;

  panel.querySelectorAll('.cal-event-del').forEach(b =>
    b.addEventListener('click', async () => {
      const row = +b.dataset.row;
      await sheetsDelete('월간스케줄', row);
      S.calEvents = S.calEvents.filter(e => e._row !== row);
      S.calEvents.forEach(e => { if (e._row > row) e._row--; });
      renderCal();
    })
  );

  let evtPending = false;
  document.getElementById('event-input').addEventListener('keydown', async e => {
    if (e.key !== 'Enter' || e.isComposing || evtPending) return;
    const val = e.target.value.trim();
    if (!val) return;
    evtPending = true;
    const color = document.getElementById('event-color').value;
    e.target.value = '';
    setTimeout(() => { e.target.value = ''; }, 0);
    await sheetsAppend('월간스케줄', [S.selDate, val, color]);
    const rows = await sheetsRead('월간스케줄');
    S.calEvents = parseRows(rows, ['날짜', '내용', '색상']);
    evtPending = false;
    renderCal();
    showToast('일정 추가됨');
  });
}

// ── ROUTINES ──────────────────────────────────────────
function renderRoutines() {
  const list      = document.getElementById('routine-list');
  const todayRecs = S.routineRecords.filter(r => r.날짜 === S.selDate);
  const sorted    = [...S.routineSettings].sort((a, b) => +a.순서 - +b.순서);

  list.innerHTML = sorted.map(rt => {
    const name     = rt.루틴명;
    const rec      = todayRecs.find(r => r.루틴명 === name);
    const done     = rec ? rec.완료 === 'TRUE' : false;
    const val      = rec ? (rec.값 || '') : '';
    const type     = rt.타입 || 'checkbox';
    const isWeight = type === 'weight';
    const isDiet   = type === 'meal';

    return `<div class="routine-item" data-name="${name}">
      <label class="routine-row" style="cursor:pointer">
        <input type="checkbox" class="routine-cb" data-name="${name}" ${done ? 'checked' : ''}>
        <span class="routine-label${done ? ' done' : ''}" style="font-size:.78rem;line-height:1.3">${name}</span>
      </label>
      ${(isWeight || isDiet) ? `
        <div class="routine-extra${done ? '' : ' hidden'}">
          <input class="${isWeight ? 'routine-val-input' : 'routine-val-input'}" type="${isWeight ? 'number' : 'text'}" data-name="${name}"
            placeholder="${isWeight ? '몸무게(kg)' : '식사 내용'}" value="${val}" style="font-size:.75rem">
        </div>` : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.routine-cb').forEach(cb =>
    cb.addEventListener('change', async () => {
      const name  = cb.dataset.name;
      const item  = cb.closest('.routine-item');
      const done  = cb.checked;
      item.querySelector('.routine-label').classList.toggle('done', done);
      const extra = item.querySelector('.routine-extra');
      if (extra) extra.classList.toggle('hidden', !done);
      await saveRoutineCheck(name, done, '');
    })
  );

  list.querySelectorAll('.routine-val-input').forEach(inp =>
    inp.addEventListener('change', async () => {
      const name = inp.dataset.name;
      const rec  = S.routineRecords.find(r => r.날짜 === S.selDate && r.루틴명 === name);
      if (rec) {
        rec.값 = inp.value;
        await sheetsUpdate('루틴기록', rec._row, [rec.날짜, rec.루틴명, rec.완료, inp.value]);
      }
    })
  );

  document.getElementById('routine-settings-btn').onclick = openRoutineModal;
}

async function saveRoutineCheck(name, done, value) {
  const today = S.selDate;
  const rec   = S.routineRecords.find(r => r.날짜 === today && r.루틴명 === name);
  if (rec) {
    rec.완료 = done ? 'TRUE' : 'FALSE';
    await sheetsUpdate('루틴기록', rec._row, [rec.날짜, rec.루틴명, rec.완료, rec.값 || value]);
  } else {
    await sheetsAppend('루틴기록', [today, name, done ? 'TRUE' : 'FALSE', value]);
    const rows = await sheetsRead('루틴기록');
    S.routineRecords = parseRows(rows, ['날짜', '루틴명', '완료', '값']);
  }
}

function openRoutineModal() {
  const modal = document.getElementById('routine-modal');
  modal.classList.remove('hidden');
  renderRoutineModal();
  document.getElementById('routine-modal-close').onclick = () => modal.classList.add('hidden');

  document.getElementById('routine-add-save').onclick = async () => {
    const nameEl = document.getElementById('routine-add-name');
    const typeEl = document.getElementById('routine-add-type');
    const name = nameEl.value.trim();
    if (!name) { showToast('루틴 이름을 입력하세요', true); return; }
    nameEl.value = '';
    const maxOrd = S.routineSettings.reduce((mx, r) => Math.max(mx, +r.순서), 0);
    await sheetsAppend('루틴설정', [name, String(maxOrd + 1), typeEl.value]);
    const rows = await sheetsRead('루틴설정');
    S.routineSettings = parseRows(rows, ['루틴명', '순서', '타입']);
    renderRoutineModal();
    renderRoutines();
    showToast('루틴 추가됨');
  };
}

function renderRoutineModal() {
  const body   = document.getElementById('routine-modal-body');
  const sorted = [...S.routineSettings].sort((a, b) => +a.순서 - +b.순서);
  const typeLabel = { checkbox: '체크', weight: '몸무게', meal: '식사' };

  if (!sorted.length) {
    body.innerHTML = '<p style="color:var(--text3);font-size:.82rem;padding:8px 0">루틴 없음</p>';
    return;
  }

  body.innerHTML = sorted.map(rt => `
    <div class="routine-mgmt-item" draggable="true" data-row="${rt._row}">
      <span class="drag-handle">⠿</span>
      <span class="routine-mgmt-name">${rt.루틴명}</span>
      <span class="routine-mgmt-type-badge">${typeLabel[rt.타입||'checkbox']||'체크'}</span>
      <button class="routine-mgmt-del" data-row="${rt._row}">✕</button>
    </div>
  `).join('');

  // drag reorder
  let dragSrc = null;
  body.querySelectorAll('.routine-mgmt-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragSrc = item; item.classList.add('dragging'); });
    item.addEventListener('dragend',   () => { item.classList.remove('dragging'); body.querySelectorAll('.routine-mgmt-item').forEach(i => i.classList.remove('drag-over')); });
    item.addEventListener('dragover',  e => { e.preventDefault(); if (item !== dragSrc) item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', async e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === item) return;
      item.classList.remove('drag-over');
      // reorder in sorted array
      const srcRow = +dragSrc.dataset.row;
      const tgtRow = +item.dataset.row;
      const srcIdx = sorted.findIndex(r => r._row === srcRow);
      const tgtIdx = sorted.findIndex(r => r._row === tgtRow);
      const [moved] = sorted.splice(srcIdx, 1);
      sorted.splice(tgtIdx, 0, moved);
      // update 순서 for all
      for (let i = 0; i < sorted.length; i++) {
        sorted[i].순서 = String(i + 1);
        await sheetsUpdate('루틴설정', sorted[i]._row, [sorted[i].루틴명, sorted[i].순서, sorted[i].타입||'checkbox']);
      }
      S.routineSettings = sorted;
      renderRoutineModal();
      renderRoutines();
    });
  });

  body.querySelectorAll('.routine-mgmt-del').forEach(b =>
    b.addEventListener('click', async () => {
      const row = +b.dataset.row;
      confirmAction('루틴을 삭제하시겠습니까?', async () => {
        await sheetsDelete('루틴설정', row);
        const rows = await sheetsRead('루틴설정');
        S.routineSettings = parseRows(rows, ['루틴명', '순서', '타입']);
        renderRoutineModal();
        renderRoutines();
        showToast('삭제됨');
      });
    })
  );
}

// ── WEEKLY GOALS (shared between Home and Diary) ───────
function renderWeeklyGoals(opts = {}) {
  const listId  = opts.listId  || 'weekly-list';
  const addId   = opts.addId   || 'weekly-add';
  const labelId = opts.labelId || 'week-range-label';
  const sun     = opts.sun     || weekSunday(S.selDate);

  const labelEl = document.getElementById(labelId);
  if (labelEl) {
    const sunD = new Date(sun + 'T00:00:00');
    const satD = new Date(sunD); satD.setDate(satD.getDate() + 6);
    labelEl.textContent = `${sunD.getMonth()+1}/${sunD.getDate()} – ${satD.getMonth()+1}/${satD.getDate()}`;
  }

  const goals = S.weeklyGoals.filter(g => g.주시작일 === sun);
  const list  = document.getElementById(listId);
  if (!list) return;

  list.innerHTML = goals.map(g => `
    <div class="inline-item${g.완료 === 'TRUE' ? ' done' : ''}">
      <input type="checkbox" class="inline-cb" data-row="${g._row}" ${g.완료 === 'TRUE' ? 'checked' : ''}>
      <span class="inline-text${g.완료 === 'TRUE' ? ' done' : ''}">${g.항목}</span>
      <button class="inline-del" data-row="${g._row}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.inline-cb').forEach(cb =>
    cb.addEventListener('change', async () => {
      const row  = +cb.dataset.row;
      const goal = S.weeklyGoals.find(g => g._row === row);
      if (!goal) return;
      goal.완료 = cb.checked ? 'TRUE' : 'FALSE';
      const item = cb.closest('.inline-item');
      item.classList.toggle('done', cb.checked);
      item.querySelector('.inline-text').classList.toggle('done', cb.checked);
      await sheetsUpdate('주간계획', row, [goal.주시작일, goal.항목, goal.완료]);
      // sync the other panel
      syncWeeklyGoals(listId);
    })
  );

  list.querySelectorAll('.inline-del').forEach(b =>
    b.addEventListener('click', async () => {
      const row = +b.dataset.row;
      await sheetsDelete('주간계획', row);
      S.weeklyGoals = S.weeklyGoals.filter(g => g._row !== row);
      S.weeklyGoals.forEach(g => { if (g._row > row) g._row--; });
      renderWeeklyGoals(opts);
      syncWeeklyGoals(listId);
    })
  );

  const inp = document.getElementById(addId);
  if (!inp) return;
  let wgPending = false;
  inp.onkeydown = async e => {
    if (e.key !== 'Enter' || e.isComposing || wgPending) return;
    const val = inp.value.trim();
    if (!val) return;
    wgPending = true;
    inp.value = '';
    setTimeout(() => { inp.value = ''; }, 0);
    await sheetsAppend('주간계획', [sun, val, 'FALSE']);
    const rows = await sheetsRead('주간계획');
    S.weeklyGoals = parseRows(rows, ['주시작일', '항목', '완료']);
    wgPending = false;
    renderWeeklyGoals(opts);
    syncWeeklyGoals(listId);
  };
}

function syncWeeklyGoals(callerListId) {
  // Re-render the other weekly goals panel
  if (callerListId === 'weekly-list') {
    renderWeeklyGoals({ listId: 'diary-weekly-list', addId: 'diary-weekly-add',
      labelId: 'diary-week-range-label', sun: S.dWeekSun || weekSunday(S.selDate) });
  } else {
    renderWeeklyGoals();
  }
}

// ── TODOS ─────────────────────────────────────────────
function renderTodos(type) {
  const listId = type === 'deep' ? 'todo-deep-list' : 'todo-non-list';
  const addId  = type === 'deep' ? 'todo-deep-add'  : 'todo-non-add';
  const arr    = type === 'deep' ? S.todoDeep : S.todoNon;
  const items  = arr.filter(t => t.날짜 === S.selDate);
  const list   = document.getElementById(listId);

  list.innerHTML = items.map(t => `
    <div class="inline-item${t.완료 === 'TRUE' ? ' done' : ''}">
      <input type="checkbox" class="inline-cb" data-row="${t._row}" ${t.완료 === 'TRUE' ? 'checked' : ''}>
      <span class="inline-text${t.완료 === 'TRUE' ? ' done' : ''}">${t.항목}</span>
      <button class="inline-del" data-row="${t._row}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.inline-cb').forEach(cb =>
    cb.addEventListener('change', async () => {
      const row  = +cb.dataset.row;
      const todo = arr.find(t => t._row === row);
      if (!todo) return;
      todo.완료 = cb.checked ? 'TRUE' : 'FALSE';
      const item = cb.closest('.inline-item');
      item.classList.toggle('done', cb.checked);
      item.querySelector('.inline-text').classList.toggle('done', cb.checked);
      await sheetsUpdate('투두', row, [todo.날짜, todo.항목, todo.타입, todo.완료]);
    })
  );

  list.querySelectorAll('.inline-del').forEach(b =>
    b.addEventListener('click', async () => {
      const row = +b.dataset.row;
      await sheetsDelete('투두', row);
      const rm = a => {
        const i = a.findIndex(t => t._row === row);
        if (i !== -1) a.splice(i, 1);
        a.forEach(t => { if (t._row > row) t._row--; });
      };
      rm(S.todoDeep); rm(S.todoNon);
      renderTodos(type);
    })
  );

  const inp = document.getElementById(addId);
  let tdPending = false;
  inp.onkeydown = async e => {
    if (e.key !== 'Enter' || e.isComposing || tdPending) return;
    const val = inp.value.trim();
    if (!val) return;
    tdPending = true;
    inp.value = '';
    setTimeout(() => { inp.value = ''; }, 0);
    await sheetsAppend('투두', [S.selDate, val, type, 'FALSE']);
    const rows = await sheetsRead('투두');
    const all  = parseRows(rows, ['날짜', '항목', '타입', '완료']);
    S.todoDeep = all.filter(t => t.타입 === 'deep');
    S.todoNon  = all.filter(t => t.타입 === 'non');
    tdPending = false;
    renderTodos(type);
  };
}

// ── DIARY ─────────────────────────────────────────────
function renderDiaryMiniCal() {
  const y = S.dCalYear, m = S.dCalMonth;
  document.getElementById('dcal-label').textContent = `${y}년 ${m+1}월`;

  const first     = new Date(y, m, 1);
  const last      = new Date(y, m+1, 0);
  const startDow  = first.getDay();
  const today     = todayStr();
  const entrySet  = new Set(S.diaryEntries.map(e => e.날짜));

  let html = '';
  for (let i = 0; i < startDow; i++) html += '<div class="diary-mini-cell other-month"></div>';
  for (let d = 1; d <= last.getDate(); d++) {
    const ds  = fmtDate(new Date(y, m, d));
    const sun = weekSunday(ds);
    const inSel = S.dWeekSun && sun === S.dWeekSun;
    html += `<div class="diary-mini-cell${ds===today?' today':''}${inSel?' in-sel-week':''}${entrySet.has(ds)?' has-entry':''}" data-date="${ds}" data-sun="${sun}">${d}</div>`;
  }

  const grid = document.getElementById('diary-mini-grid');
  grid.innerHTML = html;
  grid.querySelectorAll('.diary-mini-cell[data-date]').forEach(c =>
    c.addEventListener('click', () => {
      S.dWeekSun = c.dataset.sun;
      renderDiaryMiniCal();
      renderDiaryWeekGrid();
      // Update diary weekly goals for the new week
      renderWeeklyGoals({ listId: 'diary-weekly-list', addId: 'diary-weekly-add',
        labelId: 'diary-week-range-label', sun: S.dWeekSun });
    })
  );

  document.getElementById('dcal-prev').onclick = () => {
    S.dCalMonth === 0 ? (S.dCalYear--, S.dCalMonth = 11) : S.dCalMonth--;
    renderDiaryMiniCal();
  };
  document.getElementById('dcal-next').onclick = () => {
    S.dCalMonth === 11 ? (S.dCalYear++, S.dCalMonth = 0) : S.dCalMonth++;
    renderDiaryMiniCal();
  };

  // render diary weekly goals
  renderWeeklyGoals({ listId: 'diary-weekly-list', addId: 'diary-weekly-add',
    labelId: 'diary-week-range-label', sun: S.dWeekSun || weekSunday(S.selDate) });
}

function renderDiaryWeekGrid() {
  const grid = document.getElementById('diary-week-grid');
  if (!S.dWeekSun) {
    grid.innerHTML = '<p class="empty-state"><span class="empty-icon">📖</span><br>날짜를 선택하세요</p>';
    return;
  }

  const sun       = new Date(S.dWeekSun + 'T00:00:00');
  const dowLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const today     = todayStr();

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d   = new Date(sun); d.setDate(d.getDate() + i);
    const ds  = fmtDate(d);
    const ent = S.diaryEntries.find(e => e.날짜 === ds) || {};
    const score   = ent.점수  || '';
    const content = ent.내용  || '';
    const dateLabel = `${d.getMonth()+1}/${d.getDate()} (${dowLabels[i]})`;

    const scoreEmojis = {'':'- 점수 -','1':'😢 힘듦','2':'😕 별로','3':'😐 보통','4':'🙂 좋음','5':'😄 최고'};
    html += `<div class="diary-day-col${ds===today?' today':''}" data-date="${ds}">
      <div class="diary-day-head" style="margin-bottom:8px">
        <span style="font-size:.85rem;font-weight:600;color:var(--accent)">${dateLabel}</span>
      </div>
      <div class="diary-score-wrap">
        <select class="diary-score-sel" data-date="${ds}">
          ${Object.entries(scoreEmojis).map(([v,l])=>`<option value="${v}"${score===v?' selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <textarea class="diary-textarea" data-date="${ds}" placeholder="오늘 하루...">${content}</textarea>
    </div>`;
  }
  grid.innerHTML = html;

  const save = async ds => {
    const col   = grid.querySelector(`.diary-day-col[data-date="${ds}"]`);
    const score = (col.querySelector('.diary-score-sel') || col.querySelector('.diary-score-inp') || {value:''}).value;
    const text  = col.querySelector('.diary-textarea').value;
    const entry = S.diaryEntries.find(e => e.날짜 === ds);
    if (entry) {
      entry.점수 = score; entry.내용 = text;
      await sheetsUpdate('하루일기', entry._row, [ds, score, '', text]);
    } else {
      await sheetsAppend('하루일기', [ds, score, '', text]);
      const rows = await sheetsRead('하루일기');
      S.diaryEntries = parseRows(rows, ['날짜', '점수', '_x', '내용']);
      renderDiaryMiniCal();
    }
  };

  grid.querySelectorAll('.diary-textarea').forEach(ta => {
    let timer;
    ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => save(ta.dataset.date), 1500); });
  });
  grid.querySelectorAll('.diary-score-sel').forEach(sel =>
    sel.addEventListener('change', () => save(sel.dataset.date))
  );
}

// ── PROJECT ───────────────────────────────────────────
function renderProjectGallery() {
  document.getElementById('project-gallery-view').classList.remove('hidden');
  document.getElementById('project-detail-view').classList.add('hidden');

  const grid = document.getElementById('project-grid');
  grid.innerHTML = S.projects.length ? S.projects.map(p => `
    <div class="proj-card" data-row="${p._row}" style="border-top:4px solid ${p.색상||'var(--accent)'}">
      <div class="proj-card-name">${p.제목}</div>
      ${p.설명 ? `<p class="proj-card-sub">${p.설명}</p>` : ''}
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px">
        ${p.시작일 ? `<span style="font-size:.72rem;color:var(--text3)">${p.시작일}</span>` : ''}
        <span class="proj-status-badge proj-s-${p.상태||'진행중'}">${p.상태||'진행중'}</span>
      </div>
    </div>
  `).join('') : '<p class="empty-state"><span class="empty-icon">🗂</span><br>프로젝트가 없습니다</p>';

  grid.querySelectorAll('.proj-card').forEach(c =>
    c.addEventListener('click', () => {
      const proj = S.projects.find(p => p._row === +c.dataset.row);
      if (proj) openProjectDetail(proj);
    })
  );
  document.getElementById('add-project-btn').onclick = () => openProjectForm(null);
}

function openProjectDetail(proj) {
  S.projCurrent = proj;
  document.getElementById('project-gallery-view').classList.add('hidden');
  document.getElementById('project-detail-view').classList.remove('hidden');
  renderProjectDetail();
  document.getElementById('project-back').onclick = renderProjectGallery;
  document.getElementById('proj-del-btn').onclick = () =>
    confirmAction(`"${proj.제목}"을 삭제하시겠습니까?`, async () => {
      await sheetsDelete('프로젝트', proj._row);
      S.projects = S.projects.filter(p => p._row !== proj._row);
      S.projects.forEach(p => { if (p._row > proj._row) p._row--; });
      renderProjectGallery();
      showToast('삭제됨');
    });
}

function renderProjectDetail() {
  const proj  = S.projCurrent;
  const tasks = S.projTasks.filter(t => t.프로젝트ID === proj.ID);
  const done  = tasks.filter(t => t.완료 === 'TRUE').length;
  const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  document.getElementById('project-detail-body').innerHTML = `
    <div style="border-left:5px solid ${proj.색상||'var(--accent)'};padding-left:14px;margin-bottom:18px">
      <h2 style="font-family:var(--font-b);font-size:1.3rem;color:var(--accent)">${proj.제목}</h2>
      ${proj.설명 ? `<p style="font-size:.85rem;color:var(--text2);margin-top:4px">${proj.설명}</p>` : ''}
      <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
        ${proj.시작일 ? `<span style="font-size:.75rem;color:var(--text3)">${proj.시작일}${proj.종료일?' ~ '+proj.종료일:''}</span>` : ''}
        <span class="proj-status-badge proj-s-${proj.상태||'진행중'}">${proj.상태||'진행중'}</span>
        <button class="btn-outline-sm" id="proj-edit-btn">수정</button>
      </div>
    </div>
    <div class="h-section" style="margin-bottom:14px">
      <div class="h-sec-head">
        <h3 class="h-sec-title">태스크 <span style="font-size:.75rem;font-weight:400;color:var(--text3)">${done}/${tasks.length} (${pct}%)</span></h3>
        <button class="btn-outline-sm" id="task-add-btn">+ 태스크</button>
      </div>
      <div class="progress-bar" style="margin-bottom:12px"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div id="proj-task-list"></div>
      <div id="task-form-area"></div>
    </div>
    <div class="h-section brainstorm-section">
      <div class="h-sec-head"><h3 class="h-sec-title">💡 브레인스토밍</h3></div>
      <textarea class="brainstorm-textarea" id="brainstorm-ta" placeholder="아이디어, 메모, 계획을 자유롭게 작성하세요...">${proj.브레인스토밍||''}</textarea>
    </div>
  `;

  document.getElementById('proj-edit-btn').onclick = () => openProjectForm(proj);
  document.getElementById('task-add-btn').onclick  = () => openTaskForm(proj);
  renderProjTasks(proj, tasks);

  const bsTa = document.getElementById('brainstorm-ta');
  let bsTimer;
  bsTa.addEventListener('input', () => {
    clearTimeout(bsTimer);
    bsTimer = setTimeout(async () => {
      proj.브레인스토밍 = bsTa.value;
      await sheetsUpdate('프로젝트', proj._row,
        [proj.ID, proj.제목, proj.설명, proj.색상, proj.시작일, proj.종료일, proj.상태, bsTa.value]);
    }, 1500);
  });
}

function renderProjTasks(proj, tasks) {
  const list = document.getElementById('proj-task-list');
  if (!list) return;

  list.innerHTML = tasks.map(t => `
    <div class="proj-task-card${t.완료==='TRUE'?' done-card':''}">
      <div class="proj-task-card-top">
        <input type="checkbox" class="inline-cb" data-row="${t._row}" ${t.완료==='TRUE'?'checked':''}>
        <span class="proj-task-title${t.완료==='TRUE'?' done':''}">${t.제목||t.내용||'(제목 없음)'}</span>
        ${t.데드라인 ? `<span class="proj-task-deadline">${t.데드라인}</span>` : ''}
        <button class="inline-del" data-row="${t._row}">✕</button>
      </div>
      ${(t.내용||t.비고) ? `<div class="proj-task-body">
        ${t.내용 ? `<p class="proj-task-content">${t.내용}</p>` : ''}
        ${t.비고 ? `<p class="proj-task-note">📌 ${t.비고}</p>` : ''}
      </div>` : ''}
    </div>
  `).join('') || '<p style="font-size:.82rem;color:var(--text3);padding:8px 0">태스크가 없습니다.</p>';

  list.querySelectorAll('.inline-cb').forEach(cb =>
    cb.addEventListener('change', async () => {
      const row  = +cb.dataset.row;
      const task = S.projTasks.find(t => t._row === row);
      if (!task) return;
      task.완료 = cb.checked ? 'TRUE' : 'FALSE';
      await sheetsUpdate('프로젝트태스크', row,
        [task.프로젝트ID, task.제목, task.내용, task.완료, task.데드라인, task.비고]);
      renderProjectDetail();
    })
  );

  list.querySelectorAll('.inline-del').forEach(b =>
    b.addEventListener('click', async () => {
      const row = +b.dataset.row;
      await sheetsDelete('프로젝트태스크', row);
      S.projTasks = S.projTasks.filter(t => t._row !== row);
      S.projTasks.forEach(t => { if (t._row > row) t._row--; });
      renderProjectDetail();
    })
  );
}

function openTaskForm(proj) {
  const area = document.getElementById('task-form-area');
  if (!area) return;
  area.innerHTML = `
    <div class="task-form">
      <input class="form-input" id="tf-title" placeholder="제목 *">
      <textarea class="form-input" id="tf-content" rows="2" placeholder="내용" style="resize:vertical"></textarea>
      <input type="date" class="form-input" id="tf-deadline" placeholder="데드라인">
      <input class="form-input" id="tf-note" placeholder="비고">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-outline" id="tf-cancel">취소</button>
        <button class="btn-primary" id="tf-save">저장</button>
      </div>
    </div>
  `;
  document.getElementById('tf-cancel').onclick = () => { area.innerHTML = ''; };
  let tfPending = false;
  document.getElementById('tf-save').onclick = async () => {
    if (tfPending) return;
    const title = document.getElementById('tf-title').value.trim();
    if (!title) { showToast('제목을 입력하세요', true); return; }
    tfPending = true;
    const row = [proj.ID, title,
      document.getElementById('tf-content').value,
      'FALSE',
      document.getElementById('tf-deadline').value,
      document.getElementById('tf-note').value,
    ];
    await sheetsAppend('프로젝트태스크', row);
    const rows = await sheetsRead('프로젝트태스크');
    S.projTasks = parseRows(rows, ['프로젝트ID', '제목', '내용', '완료', '데드라인', '비고']);
    tfPending = false;
    renderProjectDetail();
  };
}

function openProjectForm(proj) {
  const isEdit = !!proj;
  const el = document.createElement('div');
  el.className = 'proj-form-overlay';
  el.innerHTML = `
    <div class="proj-form-modal">
      <div class="proj-form-head">
        <h3 style="font-family:var(--font-b)">${isEdit ? '프로젝트 수정' : '새 프로젝트'}</h3>
        <button class="icon-btn" id="pff-close">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;padding:16px 18px">
        <input class="form-input" id="pf-title" placeholder="제목 *" value="${isEdit ? proj.제목 : ''}">
        <textarea class="form-input" id="pf-desc" placeholder="설명" rows="2" style="resize:vertical">${isEdit ? (proj.설명||'') : ''}</textarea>
        <div style="display:flex;gap:12px;align-items:center">
          <label style="font-size:.78rem;color:var(--text3)">색상</label>
          <input type="color" id="pf-color" value="${isEdit ? (proj.색상||'#5c3d2e') : '#5c3d2e'}" style="width:40px;height:32px;border:1px solid var(--border);border-radius:6px;cursor:pointer">
        </div>
        <input type="date" class="form-input" id="pf-start" value="${isEdit ? (proj.시작일||'') : ''}">
        <input type="date" class="form-input" id="pf-end"   value="${isEdit ? (proj.종료일||'') : ''}">
        <select class="form-input" id="pf-status">
          ${['진행중','완료','보류'].map(s=>`<option${isEdit&&proj.상태===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <button class="btn-primary" id="pf-save">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#pff-close').onclick = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  el.querySelector('#pf-save').onclick = async () => {
    const title = document.getElementById('pf-title').value.trim();
    if (!title) { showToast('제목을 입력하세요', true); return; }
    const data = {
      ID: isEdit ? proj.ID : ('P' + Date.now()),
      제목: title,
      설명: document.getElementById('pf-desc').value,
      색상: document.getElementById('pf-color').value,
      시작일: document.getElementById('pf-start').value,
      종료일: document.getElementById('pf-end').value,
      상태: document.getElementById('pf-status').value,
      브레인스토밍: isEdit ? (proj.브레인스토밍||'') : '',
    };
    const row = [data.ID, data.제목, data.설명, data.색상, data.시작일, data.종료일, data.상태, data.브레인스토밍];
    if (isEdit) {
      await sheetsUpdate('프로젝트', proj._row, row);
      Object.assign(proj, data);
    } else {
      await sheetsAppend('프로젝트', row);
      const rows = await sheetsRead('프로젝트');
      S.projects = parseRows(rows, ['ID', '제목', '설명', '색상', '시작일', '종료일', '상태', '브레인스토밍']);
    }
    el.remove();
    isEdit ? renderProjectDetail() : renderProjectGallery();
    showToast(isEdit ? '수정됨' : '추가됨');
  };
}

// ── LANGUAGE ──────────────────────────────────────────
function initLangTab() {
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      S.lang = b.dataset.lang;
      S.langSub = 'words'; S.flashMode = false;
      document.querySelectorAll('.lstab').forEach(x => x.classList.remove('active'));
      document.querySelector('.lstab[data-sub="words"]').classList.add('active');
      renderLangBody();
    })
  );
  document.querySelectorAll('.lstab').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.lstab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      S.langSub = b.dataset.sub; S.flashMode = false;
      renderLangBody();
    })
  );
}

function renderLangBody() {
  const body = document.getElementById('lang-body');
  if (S.langSub === 'words')    renderWords(body);
  else if (S.langSub === 'grammar')  renderGrammar(body);
  else if (S.langSub === 'phrases')  renderPhrases(body);
  else if (S.langSub === 'duolingo') renderDuolingo(body);
}

function getWordsForLang() {
  return S.words.filter(w => w.언어 === S.lang);
}

function renderWords(body) {
  if (S.flashMode) { renderFlashCard(body); return; }

  body.innerHTML = `
    <div class="word-toolbar" style="flex-wrap:wrap;gap:8px">
      <input style="padding:6px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--text);width:140px" id="word-search" placeholder="단어/뜻 검색">
      <div class="filter-chips" id="word-tag-chips">
        <button class="filter-chip${!S.wordFilter||S.wordFilter==='all'?' active':''}" data-tag="all">전체</button>
        <button class="filter-chip${S.wordFilter==='알아요'?' active':''}" data-tag="알아요">알아요</button>
        <button class="filter-chip${S.wordFilter==='헷갈려요'?' active':''}" data-tag="헷갈려요">헷갈려요</button>
        <button class="filter-chip${S.wordFilter==='몰라요'?' active':''}" data-tag="몰라요">몰라요</button>
      </div>
      <div style="display:flex;gap:8px;margin-left:auto">
        <button class="btn-outline-sm" id="flash-btn">플래시카드</button>
        <button class="btn-primary" style="font-size:.82rem;padding:7px 14px" id="add-word-btn">+ 단어</button>
      </div>
    </div>
    <div class="word-table-wrap">
      <table class="word-table">
        <thead><tr><th>단어</th><th>한자</th><th>뜻</th><th>발음</th><th>예문</th><th>예문해석</th><th></th></tr></thead>
        <tbody id="word-tbody"></tbody>
      </table>
    </div>
    <div id="word-form-area"></div>
  `;

  document.getElementById('flash-btn').onclick = () => {
    S.flashMode = true; S.flashIdx = 0; S.flashFlipped = false; renderLangBody();
  };
  document.getElementById('add-word-btn').onclick = () => showWordForm(body, null);
  const searchEl = document.getElementById('word-search');
  searchEl.addEventListener('input', e => renderWordTable(body, e.target.value));

  document.getElementById('word-tag-chips').querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      S.wordFilter = btn.dataset.tag;
      document.querySelectorAll('#word-tag-chips .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWordTable(body, searchEl.value);
    });
  });

  renderWordTable(body, '');
}

function renderWordTable(body, search) {
  const tbody = document.getElementById('word-tbody');
  if (!tbody) return;
  let list = getWordsForLang();
  if (S.wordFilter && S.wordFilter !== 'all') {
    list = list.filter(w => w.태그 === S.wordFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(w => w.단어.toLowerCase().includes(q) || w.뜻.includes(q));
  }
  tbody.innerHTML = list.map(w => `
    <tr>
      <td><strong>${w.단어}</strong></td>
      <td style="color:var(--text3)">${w.한자||''}</td>
      <td>${w.뜻}</td>
      <td style="font-size:.75rem;color:var(--text2)">${w.발음||''}</td>
      <td style="font-size:.75rem;color:var(--text3)">${w.예문||''}</td>
      <td style="font-size:.75rem;color:var(--text3)">${w.예문해석||''}</td>
      <td style="white-space:nowrap">
        <button class="word-save-btn" data-row="${w._row}" style="background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--text2);padding:2px 6px;font-size:.72rem;margin-right:2px">✎</button>
        <button class="word-del-btn" data-row="${w._row}">✕</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">단어가 없습니다</td></tr>`;

  tbody.querySelectorAll('.word-del-btn').forEach(b =>
    b.addEventListener('click', async () => {
      const row = +b.dataset.row;
      confirmAction('단어를 삭제하시겠습니까?', async () => {
        await sheetsDelete('단어장', row);
        S.words = S.words.filter(w => w._row !== row);
        S.words.forEach(w => { if (w._row > row) w._row--; });
        renderWords(body);
      });
    })
  );
  tbody.querySelectorAll('.word-save-btn').forEach(b =>
    b.addEventListener('click', () => {
      const word = S.words.find(w => w._row === +b.dataset.row);
      if (word) showWordForm(body, word);
    })
  );
}

function showWordForm(body, word) {
  const isEdit = !!word;
  const area   = document.getElementById('word-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:14px;display:flex;flex-direction:column;gap:10px">
      <h4 style="font-size:.88rem;font-weight:600">${isEdit ? '단어 수정' : '단어 추가'}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label style="font-size:.72rem;color:var(--text3)">단어 *</label>
          <input class="form-input" id="wf-word" value="${isEdit?word.단어:''}"></div>
        <div><label style="font-size:.72rem;color:var(--text3)">한자</label>
          <input class="form-input" id="wf-kanji" value="${isEdit?(word.한자||''):''}"></div>
        <div><label style="font-size:.72rem;color:var(--text3)">뜻 *</label>
          <input class="form-input" id="wf-mean" value="${isEdit?word.뜻:''}"></div>
        <div><label style="font-size:.72rem;color:var(--text3)">발음</label>
          <input class="form-input" id="wf-pron" value="${isEdit?(word.발음||''):''}"></div>
      </div>
      <div><label style="font-size:.72rem;color:var(--text3)">예문</label>
        <input class="form-input" id="wf-ex" value="${isEdit?(word.예문||''):''}"></div>
      <div><label style="font-size:.72rem;color:var(--text3)">예문 해석</label>
        <input class="form-input" id="wf-exmean" value="${isEdit?(word.예문해석||''):''}"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-outline" id="wf-cancel">취소</button>
        <button class="btn-primary" id="wf-save">저장</button>
      </div>
    </div>
  `;
  document.getElementById('wf-cancel').onclick = () => { area.innerHTML = ''; };
  document.getElementById('wf-save').onclick = async () => {
    const w = document.getElementById('wf-word').value.trim();
    const m = document.getElementById('wf-mean').value.trim();
    if (!w || !m) { showToast('단어와 뜻을 입력하세요', true); return; }
    const tag = isEdit ? (word.태그 || '몰라요') : '몰라요';
    const row = [S.lang, w,
      document.getElementById('wf-kanji').value,
      m,
      document.getElementById('wf-pron').value,
      document.getElementById('wf-ex').value,
      document.getElementById('wf-exmean').value,
      tag,
    ];
    if (isEdit) {
      await sheetsUpdate('단어장', word._row, row);
      Object.assign(word, { 언어:S.lang, 단어:w, 한자:row[2], 뜻:m, 발음:row[4], 예문:row[5], 예문해석:row[6], 태그:tag });
    } else {
      await sheetsAppend('단어장', row);
      const rows = await sheetsRead('단어장');
      S.words = parseRows(rows, ['언어', '단어', '한자', '뜻', '발음', '예문', '예문해석', '태그']);
    }
    area.innerHTML = '';
    renderWords(body);
    showToast(isEdit ? '수정됨' : '단어 추가됨');
  };
}

function renderFlashCard(body) {
  const list = getWordsForLang();
  if (!list.length) {
    body.innerHTML = `<div class="flashcard-wrap">
      <p style="color:var(--text3)">단어가 없습니다.</p>
      <button class="btn-outline" id="fc-exit">목록으로</button>
    </div>`;
    document.getElementById('fc-exit').onclick = () => { S.flashMode = false; renderLangBody(); };
    return;
  }
  const cur = list[S.flashIdx % list.length];
  body.innerHTML = `
    <div class="flashcard-wrap">
      <div class="fc-count">${(S.flashIdx % list.length) + 1} / ${list.length}</div>
      <div class="flashcard${S.flashFlipped ? ' flipped' : ''}">
        <div class="fc-word">${cur.단어}</div>
        ${cur.한자 ? `<div class="fc-reading" style="font-size:1rem">${cur.한자}</div>` : ''}
        <div class="fc-meaning">
          ${cur.뜻}
          ${cur.발음 ? `<div class="fc-reading">[${cur.발음}]</div>` : ''}
          ${cur.예문 ? `<div class="fc-reading" style="font-size:.75rem;margin-top:8px;color:var(--text3)">${cur.예문}</div>` : ''}
          ${cur.예문해석 ? `<div class="fc-reading" style="font-size:.72rem;color:var(--text3)">${cur.예문해석}</div>` : ''}
        </div>
        <div class="fc-hint">탭하여 뒤집기</div>
      </div>
      <div class="fc-btns">
        <button class="btn-outline" id="fc-prev">◁ 이전</button>
        <button class="btn-outline" id="fc-flip">뒤집기</button>
        <button class="btn-outline" id="fc-next">다음 ▷</button>
      </div>
      ${S.flashFlipped ? `<div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button class="btn-outline-sm" id="fc-dontknow" style="color:var(--danger);border-color:var(--danger)">😅 몰라요</button>
        <button class="btn-outline-sm" id="fc-unsure" style="color:var(--warn);border-color:var(--warn)">🤔 헷갈려요</button>
        <button class="btn-outline-sm" id="fc-know" style="color:var(--success);border-color:var(--success)">😊 알아요</button>
      </div>` : ''}
      <button class="btn-outline-sm" style="margin-top:10px" id="fc-exit">목록으로</button>
    </div>
  `;
  const flip = () => { S.flashFlipped = !S.flashFlipped; renderFlashCard(body); };
  body.querySelector('.flashcard').addEventListener('click', flip);
  document.getElementById('fc-flip').onclick = flip;
  document.getElementById('fc-prev').onclick = () => {
    S.flashIdx = (S.flashIdx - 1 + list.length) % list.length;
    S.flashFlipped = false; renderFlashCard(body);
  };
  document.getElementById('fc-next').onclick = () => {
    S.flashIdx = (S.flashIdx + 1) % list.length;
    S.flashFlipped = false; renderFlashCard(body);
  };
  document.getElementById('fc-exit').onclick = () => { S.flashMode = false; renderLangBody(); };

  const setTag = async tag => {
    cur.태그 = tag;
    const row = [cur.언어, cur.단어, cur.한자, cur.뜻, cur.발음, cur.예문, cur.예문해석, tag];
    await sheetsUpdate('단어장', cur._row, row);
    showToast(`"${cur.단어}" → ${tag}`);
    S.flashIdx = (S.flashIdx + 1) % list.length;
    S.flashFlipped = false;
    renderFlashCard(body);
  };
  if (S.flashFlipped) {
    document.getElementById('fc-dontknow').onclick = () => setTag('몰라요');
    document.getElementById('fc-unsure').onclick   = () => setTag('헷갈려요');
    document.getElementById('fc-know').onclick     = () => setTag('알아요');
  }
}

function renderGrammar(body) {
  const key   = `grammar_${S.lang}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  body.innerHTML = `
    <div class="note-cards" id="grammar-cards"></div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-top:14px;display:flex;flex-direction:column;gap:10px">
      <h4 style="font-size:.85rem;font-weight:600">새 문법 노트 추가</h4>
      <input class="form-input" id="gr-title" placeholder="제목 *">
      <textarea class="form-input" id="gr-body" rows="4" placeholder="문법 설명, 예문 등" style="resize:vertical"></textarea>
      <button class="btn-primary" id="gr-save" style="align-self:flex-end">저장</button>
    </div>
  `;
  const cards = document.getElementById('grammar-cards');
  cards.innerHTML = items.map((it, i) => `
    <div class="note-card" data-i="${i}" style="cursor:pointer">
      <div class="note-card-top">${it.title}</div>
      <div class="note-card-body">${it.content}</div>
      <button class="word-del-btn" style="margin-top:8px;font-size:.72rem" data-i="${i}">삭제</button>
    </div>
  `).join('') || '<p style="color:var(--text3);font-size:.85rem;grid-column:1/-1">문법 노트가 없습니다.</p>';

  // Card click → popup
  cards.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('word-del-btn')) return;
      const i = +card.dataset.i;
      showGrammarPopup(items[i], i, key, items, body);
    });
  });

  cards.querySelectorAll('.word-del-btn').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      items.splice(+b.dataset.i, 1);
      localStorage.setItem(key, JSON.stringify(items));
      renderGrammar(body);
    })
  );

  document.getElementById('gr-save').onclick = () => {
    const title = document.getElementById('gr-title').value.trim();
    if (!title) { showToast('제목을 입력하세요', true); return; }
    items.push({ title, content: document.getElementById('gr-body').value });
    localStorage.setItem(key, JSON.stringify(items));
    renderGrammar(body);
    showToast('저장됨');
  };
}

function showGrammarPopup(item, idx, key, items, body) {
  const el = document.createElement('div');
  el.className = 'grammar-popup-overlay';
  const renderView = () => {
    el.querySelector('.grammar-popup-box').innerHTML = `
      <div class="grammar-popup-head">
        <h3>${item.title}</h3>
        <button class="icon-btn" id="gp-close">✕</button>
      </div>
      <div class="grammar-popup-body" style="white-space:pre-wrap">${item.content || '내용 없음'}</div>
      <div style="display:flex;gap:8px;padding:12px 18px;border-top:1px solid var(--border);justify-content:flex-end">
        <button class="btn-outline-sm" id="gp-edit">수정</button>
        <button class="btn-danger-sm" id="gp-delete">삭제</button>
      </div>
    `;
    el.querySelector('#gp-close').onclick = () => el.remove();
    el.querySelector('#gp-delete').onclick = () =>
      confirmAction('삭제하시겠습니까?', () => {
        items.splice(idx, 1);
        localStorage.setItem(key, JSON.stringify(items));
        el.remove();
        renderGrammar(body);
        showToast('삭제됨');
      });
    el.querySelector('#gp-edit').onclick = () => {
      el.querySelector('.grammar-popup-box').innerHTML = `
        <div class="grammar-popup-head">
          <h3>문법 노트 수정</h3>
          <button class="icon-btn" id="gp-close2">✕</button>
        </div>
        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
          <input class="form-input" id="gp-et" value="${item.title.replace(/"/g,'&quot;')}" placeholder="제목">
          <textarea class="form-input" id="gp-ec" rows="6" style="resize:vertical">${item.content||''}</textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn-outline" id="gp-ec-cancel">취소</button>
            <button class="btn-primary" id="gp-ec-save">저장</button>
          </div>
        </div>
      `;
      el.querySelector('#gp-close2').onclick = () => el.remove();
      el.querySelector('#gp-ec-cancel').onclick = renderView;
      el.querySelector('#gp-ec-save').onclick = () => {
        items[idx].title   = el.querySelector('#gp-et').value.trim() || item.title;
        items[idx].content = el.querySelector('#gp-ec').value;
        localStorage.setItem(key, JSON.stringify(items));
        el.remove();
        renderGrammar(body);
        showToast('수정됨');
      };
    };
  };
  el.innerHTML = '<div class="grammar-popup-box"></div>';
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  renderView();
}

function showPhrasePopup(item, idx, key, items, body) {
  const el = document.createElement('div');
  el.className = 'grammar-popup-overlay';
  const renderView = () => {
    el.querySelector('.grammar-popup-box').innerHTML = `
      <div class="grammar-popup-head">
        <h3>${item.expr}</h3>
        <button class="icon-btn" id="pp-close">✕</button>
      </div>
      <div style="padding:16px 18px">
        ${item.mean ? `<p style="font-size:.88rem;color:var(--text2);margin-bottom:8px">뜻: ${item.mean}</p>` : ''}
        ${item.ex ? `<p style="font-size:.82rem;color:var(--text3);line-height:1.6;white-space:pre-wrap">${item.ex}</p>` : ''}
      </div>
      <div style="display:flex;gap:8px;padding:12px 18px;border-top:1px solid var(--border);justify-content:flex-end">
        <button class="btn-outline-sm" id="pp-edit">수정</button>
        <button class="btn-danger-sm" id="pp-delete">삭제</button>
      </div>
    `;
    el.querySelector('#pp-close').onclick = () => el.remove();
    el.querySelector('#pp-delete').onclick = () =>
      confirmAction('삭제하시겠습니까?', () => {
        items.splice(idx, 1);
        localStorage.setItem(key, JSON.stringify(items));
        el.remove();
        renderPhrases(body);
        showToast('삭제됨');
      });
    el.querySelector('#pp-edit').onclick = () => {
      el.querySelector('.grammar-popup-box').innerHTML = `
        <div class="grammar-popup-head">
          <h3>회화표현 수정</h3>
          <button class="icon-btn" id="pp-close2">✕</button>
        </div>
        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
          <input class="form-input" id="pp-expr" value="${item.expr.replace(/"/g,'&quot;')}" placeholder="표현 *">
          <input class="form-input" id="pp-mean" value="${(item.mean||'').replace(/"/g,'&quot;')}" placeholder="뜻">
          <textarea class="form-input" id="pp-ex" rows="3" style="resize:vertical">${item.ex||''}</textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn-outline" id="pp-ec-cancel">취소</button>
            <button class="btn-primary" id="pp-ec-save">저장</button>
          </div>
        </div>
      `;
      el.querySelector('#pp-close2').onclick = () => el.remove();
      el.querySelector('#pp-ec-cancel').onclick = renderView;
      el.querySelector('#pp-ec-save').onclick = () => {
        items[idx].expr = el.querySelector('#pp-expr').value.trim() || item.expr;
        items[idx].mean = el.querySelector('#pp-mean').value;
        items[idx].ex   = el.querySelector('#pp-ex').value;
        localStorage.setItem(key, JSON.stringify(items));
        el.remove();
        renderPhrases(body);
        showToast('수정됨');
      };
    };
  };
  el.innerHTML = '<div class="grammar-popup-box"></div>';
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  renderView();
}

function renderPhrases(body) {
  const key   = `phrases_${S.lang}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  body.innerHTML = `
    <div class="note-cards" id="phrase-cards"></div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-top:14px;display:flex;flex-direction:column;gap:10px">
      <input class="form-input" id="ph-expr" placeholder="표현 *">
      <input class="form-input" id="ph-mean" placeholder="뜻">
      <textarea class="form-input" id="ph-ex" rows="2" placeholder="예문" style="resize:vertical"></textarea>
      <button class="btn-primary" id="ph-save" style="align-self:flex-end">저장</button>
    </div>
  `;
  const cards = document.getElementById('phrase-cards');
  cards.innerHTML = items.map((it, i) => `
    <div class="note-card" data-i="${i}" style="cursor:pointer">
      <div class="note-card-top">${it.expr}</div>
      <div class="note-card-sub">${it.mean}</div>
      ${it.ex ? `<div class="note-card-body">${it.ex}</div>` : ''}
    </div>
  `).join('') || '<p style="color:var(--text3);font-size:.85rem;grid-column:1/-1">표현이 없습니다.</p>';

  cards.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const i = +card.dataset.i;
      showPhrasePopup(items[i], i, key, items, body);
    });
  });
  document.getElementById('ph-save').onclick = () => {
    const expr = document.getElementById('ph-expr').value.trim();
    if (!expr) { showToast('표현을 입력하세요', true); return; }
    items.push({ expr, mean: document.getElementById('ph-mean').value, ex: document.getElementById('ph-ex').value });
    localStorage.setItem(key, JSON.stringify(items));
    renderPhrases(body);
    showToast('저장됨');
  };
}

function renderDuolingo(body) {
  const list = [...S.duolingo].filter(d => d.언어 === S.lang).sort((a, b) => b.날짜.localeCompare(a.날짜));
  body.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:4px">
        <label style="font-size:.72rem;color:var(--text3)">날짜</label>
        <input type="date" class="form-input" id="duo-date" value="${todayStr()}" style="width:145px">
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <label style="font-size:.72rem;color:var(--text3)">XP</label>
        <input type="number" class="form-input" id="duo-xp" placeholder="0" min="0" style="width:75px">
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <label style="font-size:.72rem;color:var(--text3)">스트릭(일)</label>
        <input type="number" class="form-input" id="duo-streak" placeholder="0" min="0" style="width:80px">
      </div>
      <button class="btn-primary" id="duo-save">기록</button>
    </div>
    <div class="duo-table-wrap">
      <table class="duo-table">
        <thead><tr><th>날짜</th><th>XP</th><th>스트릭</th></tr></thead>
        <tbody>${list.map(d=>`<tr><td>${d.날짜}</td><td>⚡ ${d.XP}</td><td>🔥 ${d.스트릭}일</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--text3)">기록 없음</td></tr>'}</tbody>
      </table>
    </div>
  `;
  let duoPending = false;
  document.getElementById('duo-save').onclick = async () => {
    if (duoPending) return;
    const date   = document.getElementById('duo-date').value;
    const xp     = document.getElementById('duo-xp').value;
    const streak = document.getElementById('duo-streak').value;
    if (!date || !xp) { showToast('날짜와 XP를 입력하세요', true); return; }
    duoPending = true;
    const existing = S.duolingo.find(d => d.날짜 === date && d.언어 === S.lang);
    if (existing) {
      await sheetsUpdate('듀오링고', existing._row, [date, S.lang, xp, streak]);
      existing.XP = xp; existing.스트릭 = streak;
    } else {
      await sheetsAppend('듀오링고', [date, S.lang, xp, streak]);
      const rows = await sheetsRead('듀오링고');
      S.duolingo = parseRows(rows, ['날짜', '언어', 'XP', '스트릭']);
    }
    duoPending = false;
    renderDuolingo(body);
    showToast('기록됨');
  };
}

// ── WRITING ───────────────────────────────────────────
function renderWritingGallery() {
  document.getElementById('writing-gallery-view').classList.remove('hidden');
  document.getElementById('writing-form-view').classList.add('hidden');
  document.getElementById('writing-detail-view').classList.add('hidden');

  const list = S.writingCat === '전체' ? S.writings : S.writings.filter(w => w._cat === S.writingCat);
  document.querySelectorAll('#writing-cat-chips .cat-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === S.writingCat);
    c.onclick = () => { S.writingCat = c.dataset.cat; renderWritingGallery(); };
  });

  const grid = document.getElementById('writing-grid');
  grid.innerHTML = list.map(w => `
    <div class="writing-card" data-row="${w._row}" data-sheet="${w._sheet}">
      <div class="writing-cover">${w.이미지 ? `<img src="${w.이미지}" alt="">` : '📖'}</div>
      <div class="writing-card-info">
        <div class="writing-card-cat">${w._cat}</div>
        <div class="writing-card-title">${w.제목}${w.서브?` <span style="font-size:.72rem;color:var(--text3);font-weight:400">· ${w.서브}</span>`:''}</div>
        <div class="writing-card-stars">${starsHTML(w.별점)} <span style="font-size:.7rem;color:var(--text3)">${w.별점}</span></div>
        <div class="writing-card-date">${w.날짜}</div>
      </div>
    </div>
  `).join('') || '<p class="empty-state"><span class="empty-icon">✏️</span><br>아직 글이 없습니다</p>';

  grid.querySelectorAll('.writing-card').forEach(c =>
    c.addEventListener('click', () => {
      const w = S.writings.find(x => x._row === +c.dataset.row && x._sheet === c.dataset.sheet);
      if (w) openWritingDetail(w);
    })
  );
  document.getElementById('add-writing-btn').onclick = () => openWritingForm(null);
}

function openWritingForm(item) {
  document.getElementById('writing-gallery-view').classList.add('hidden');
  document.getElementById('writing-form-view').classList.remove('hidden');
  document.getElementById('writing-detail-view').classList.add('hidden');
  document.getElementById('writing-form-title').textContent = item ? '수정' : '새 글쓰기';
  document.getElementById('writing-form-back').onclick = renderWritingGallery;

  const cats     = ['독서', '영화', '드라마', '웹툰웹소설'];
  const subLabel = { 독서: '저자', 영화: '감독', 드라마: 'OTT', 웹툰웹소설: '플랫폼' };
  let selCat    = item ? item._cat : (S.writingCat !== '전체' ? S.writingCat : '독서');
  let selRating = item ? (parseFloat(item.별점) || 3) : 3;

  document.getElementById('writing-form-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">카테고리</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="wf-cats">
        ${cats.map(c=>`<button class="cat-chip${c===selCat?' active':''}" data-c="${c}">${c}</button>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">제목 *</label>
      <input class="form-input" id="wf-title" value="${item ? item.제목 : ''}">
    </div>
    <div class="form-group">
      <label class="form-label" id="wf-sub-lbl">${subLabel[selCat]}</label>
      <input class="form-input" id="wf-sub" value="${item ? (item.서브||'') : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">날짜</label>
      <input type="date" class="form-input" id="wf-date" value="${item ? item.날짜 : todayStr()}">
    </div>
    <div class="form-group">
      <label class="form-label">별점 <span id="wf-star-val">${selRating}</span>점</label>
      <input type="range" class="star-range" id="wf-rating" min="0.5" max="5" step="0.5" value="${selRating}">
      <div style="font-size:1.1rem;color:var(--accent);margin-top:4px" id="wf-stars-disp">${starsHTML(selRating)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">내용</label>
      <textarea class="form-textarea tall" id="wf-content">${item ? (item.내용||'') : ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">이미지</label>
      ${item && item.이미지 ? `<img src="${item.이미지}" style="width:80px;height:auto;border-radius:4px;margin-bottom:6px;display:block">` : ''}
      <input type="file" accept="image/*" id="wf-img">
    </div>
    <button class="btn-primary" id="wf-submit" style="width:100%">저장</button>
  `;

  document.getElementById('wf-cats').querySelectorAll('.cat-chip').forEach(b =>
    b.addEventListener('click', () => {
      selCat = b.dataset.c;
      document.querySelectorAll('#wf-cats .cat-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('wf-sub-lbl').textContent = subLabel[selCat];
    })
  );

  const rng = document.getElementById('wf-rating');
  rng.addEventListener('input', () => {
    selRating = +rng.value;
    document.getElementById('wf-star-val').textContent = selRating;
    document.getElementById('wf-stars-disp').textContent = starsHTML(selRating);
  });

  let wfPending = false;
  document.getElementById('wf-submit').onclick = async () => {
    if (wfPending) return;
    const title = document.getElementById('wf-title').value.trim();
    if (!title) { showToast('제목을 입력하세요', true); return; }
    wfPending = true;
    showLoading();
    let imgUrl = item ? (item.이미지||'') : '';
    const imgFile = document.getElementById('wf-img').files[0];
    if (imgFile) {
      try { imgUrl = await uploadToDrive(imgFile); }
      catch (e) { console.error(e); showToast('이미지 업로드 실패', true); }
    }
    const row = [title, document.getElementById('wf-sub').value, String(selRating),
      document.getElementById('wf-date').value, document.getElementById('wf-content').value, imgUrl];
    if (item) {
      await sheetsUpdate(item._sheet, item._row, row);
      Object.assign(item, { 제목:row[0], 서브:row[1], 별점:row[2], 날짜:row[3], 내용:row[4], 이미지:row[5] });
    } else {
      await sheetsAppend(selCat, row);
      const newRows = await sheetsRead(selCat);
      const parsed  = parseRows(newRows, ['제목','서브','별점','날짜','내용','이미지'])
        .map(w => ({ ...w, _sheet: selCat, _cat: selCat }));
      S.writings = [...S.writings.filter(w => w._cat !== selCat), ...parsed]
        .sort((a, b) => b.날짜.localeCompare(a.날짜));
    }
    wfPending = false;
    hideLoading();
    renderWritingGallery();
    showToast('저장됨');
  };
}

function openWritingDetail(item) {
  document.getElementById('writing-gallery-view').classList.add('hidden');
  document.getElementById('writing-form-view').classList.add('hidden');
  document.getElementById('writing-detail-view').classList.remove('hidden');
  document.getElementById('writing-detail-back').onclick   = renderWritingGallery;
  document.getElementById('writing-edit-btn').onclick      = () => openWritingForm(item);
  document.getElementById('writing-delete-btn').onclick    = () =>
    confirmAction(`"${item.제목}"을 삭제하시겠습니까?`, async () => {
      await sheetsDelete(item._sheet, item._row);
      S.writings = S.writings.filter(w => !(w._row===item._row && w._sheet===item._sheet));
      S.writings.filter(w => w._sheet===item._sheet && w._row>item._row).forEach(w => w._row--);
      renderWritingGallery();
      showToast('삭제됨');
    });

  document.getElementById('writing-detail-body').innerHTML = `
    <div class="writing-detail-wrap">
      ${item.이미지 ? `<img src="${item.이미지}" class="detail-cover-img">` : ''}
      <div>
        <span class="detail-status">${item._cat}</span>
        <h2 style="font-family:var(--font-b);font-size:1.4rem;margin:8px 0 4px">${item.제목}</h2>
        ${item.서브 ? `<p class="detail-meta-row">${item.서브}</p>` : ''}
        <div class="detail-stars">${starsHTML(item.별점)} <span style="font-size:.85rem;color:var(--text3)">${item.별점}</span></div>
        <p class="detail-meta-row">${item.날짜}</p>
      </div>
      ${item.내용 ? `<div class="detail-review">${item.내용.replace(/\n/g,'<br>')}</div>` : ''}
    </div>
  `;
}

// ── STATS ─────────────────────────────────────────────
function renderStats() {
  const y = S.statsYear, m = S.statsMonth;
  document.getElementById('stats-label').textContent = `${y}년 ${m+1}월`;

  document.getElementById('stats-prev').onclick = () => {
    m === 0 ? (S.statsYear--, S.statsMonth = 11) : S.statsMonth--;
    renderStats();
  };
  document.getElementById('stats-next').onclick = () => {
    m === 11 ? (S.statsYear++, S.statsMonth = 0) : S.statsMonth++;
    renderStats();
  };

  const ms   = `${y}-${String(m+1).padStart(2,'0')}`;
  const dim  = new Date(y, m+1, 0).getDate();
  const recs = S.routineRecords.filter(r => r.날짜.startsWith(ms));
  const wPts = recs.filter(r => (r.루틴명.includes('몸무게')||(S.routineSettings.find(s=>s.루틴명===r.루틴명)?.타입==='weight')) && r.값 && parseFloat(r.값));
  const writ = S.writings.filter(w => w.날짜.startsWith(ms));
  const duo  = S.duolingo.filter(d => d.날짜.startsWith(ms));
  const sorted = [...S.routineSettings].sort((a, b) => +a.순서 - +b.순서);

  // Build date array for the month
  const days = Array.from({length: dim}, (_, i) => {
    const d = i + 1;
    return `${ms}-${String(d).padStart(2,'0')}`;
  });

  const diaryCount   = S.diaryEntries.filter(e => e.날짜.startsWith(ms) && e.내용).length;
  const projDone     = S.projects.filter(p => p.상태 === '완료').length;
  const writingCount = writ.filter(w => w._cat==='영화'||w._cat==='드라마'||w._cat==='웹툰웹소설').length;

  document.getElementById('stats-body').innerHTML = `
    <div class="stats-top-grid">
      <div class="stats-section" style="margin-bottom:0">
        <div class="stats-section-title">루틴 달성 현황</div>
        ${sorted.map(rt => {
          const doneDays = new Set(recs.filter(r => r.루틴명===rt.루틴명 && r.완료==='TRUE').map(r => r.날짜));
          const cnt = doneDays.size;
          return `<div class="stat-grid-row">
            <span class="stat-grid-label">${rt.루틴명}</span>
            <div class="stat-day-grid">${days.map(ds =>
              `<div class="stat-day-box${doneDays.has(ds)?' done':''}" title="${+ds.split('-')[2]}일"></div>`
            ).join('')}</div><span class="stat-grid-count">${cnt}/${dim}</span>
          </div>`;
        }).join('') || '<p style="color:var(--text3);font-size:.82rem">루틴 없음</p>'}
      </div>
      <div class="stats-section" style="margin-bottom:0">
        <div class="stats-section-title">체중 변화</div>
        <div id="weight-chart-wrap"></div>
      </div>
    </div>
    <div class="stats-section">
      <div class="stats-section-title">이번 달 기록</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center">
        ${[
          ['독서',   writ.filter(w=>w._cat==='독서').length, '📚'],
          ['글쓰기', writingCount,                           '🎬'],
          ['일기',   diaryCount,                             '📓'],
          ['프로젝트완료', projDone,                          '🗂'],
          ['듀오링고', duo.length,                            '🦜'],
        ].map(([lbl,cnt,ico])=>
          `<div style="background:var(--bg2);border-radius:var(--radius);padding:12px 6px">
            <div style="font-size:1.4rem">${ico}</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--accent);margin:4px 0">${cnt}</div>
            <div style="font-size:.7rem;color:var(--text3)">${lbl}</div>
          </div>`
        ).join('')}
      </div>
    </div>
  `;

  const wrap = document.getElementById('weight-chart-wrap');
  if (!wPts.length) {
    wrap.innerHTML = '<p style="color:var(--text3);font-size:.82rem">체중 기록 없음</p>';
  } else {
    const pts = wPts.map(r => ({ day: +r.날짜.split('-')[2], val: parseFloat(r.값) }))
      .sort((a, b) => a.day - b.day);
    const W = 300, H = 100, P = 24;
    const minV = Math.min(...pts.map(p=>p.val)) - 0.5;
    const maxV = Math.max(...pts.map(p=>p.val)) + 0.5;
    const tx = d => P + (d-1) / (dim-1||1) * (W - P*2);
    const ty = v => H - P - (v-minV) / (maxV-minV||1) * (H - P*2);
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="weight-chart-svg">
      <polyline points="${pts.map(p=>`${tx(p.day)},${ty(p.val)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${pts.map(p=>`
        <circle cx="${tx(p.day)}" cy="${ty(p.val)}" r="3" fill="var(--accent)"/>
        <text x="${tx(p.day)}" y="${ty(p.val)-7}" font-size="8" text-anchor="middle" fill="var(--text)">${p.val}</text>
      `).join('')}
      <text x="${P}" y="${H-4}" font-size="8" fill="var(--text3)">1일</text>
      <text x="${W-P}" y="${H-4}" font-size="8" text-anchor="end" fill="var(--text3)">${dim}일</text>
    </svg>`;
  }
}

// ── BOOT ──────────────────────────────────────────────
function onPinSuccess() {
  showLoading();
  loadData()
    .then(() => {
      hideLoading();
      initNav();
      initLangTab();
      switchTab('home');
      showToast('환영합니다 ✦');
    })
    .catch(e => {
      hideLoading();
      console.error(e);
      showToast('데이터 로드 실패: ' + e.message, true);
    });
}

async function boot() {
  const savedTheme = localStorage.getItem('bjTheme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;

  S.selDate = todayStr();
  initPin();

  const cb = checkOAuthCallback();
  if (cb) {
    saveSession(cb.token, cb.expiresIn);
    applyToken(cb.token, Date.now() + cb.expiresIn * 1000 - 60000);
    showPinScreen();
    return;
  }

  const sess = loadSession();
  if (sess) {
    applyToken(sess.token, sess.expiry);
    showPinScreen();
    return;
  }

  document.getElementById('google-btn').addEventListener('click', startGoogleLogin);
}

document.addEventListener('DOMContentLoaded', boot);
