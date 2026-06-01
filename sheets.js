/* ═══════════════════════════════════════════════════
   sheets.js  —  Google Sheets & Drive API
   ═══════════════════════════════════════════════════ */

function authHeaders() {
  if (S.accessToken && Date.now() < S.tokenExpiry) {
    return { Authorization: 'Bearer ' + S.accessToken };
  }
  return null;
}

async function loadSheetMeta() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}?fields=sheets.properties&key=${CFG.API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('시트 메타 로드 실패');
  const d = await r.json();
  S.sheetGids = {};
  (d.sheets || []).forEach(s => {
    S.sheetGids[s.properties.title] = s.properties.sheetId;
  });
}

async function sheetsRead(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${CFG.API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  return d.values || [];
}

async function sheetsAppend(sheetName, row) {
  const h = authHeaders();
  if (!h) { showToast('로그인이 필요합니다', true); return null; }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  return r.json();
}

async function sheetsUpdate(sheetName, rowNum, row) {
  const h = authHeaders();
  if (!h) { showToast('로그인이 필요합니다', true); return null; }
  const range = `${sheetName}!A${rowNum}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  return r.json();
}

async function sheetsDelete(sheetName, rowNum) {
  const h = authHeaders();
  if (!h) { showToast('로그인이 필요합니다', true); return null; }
  if (!S.sheetGids) await loadSheetMeta();
  const gid = S.sheetGids[sheetName];
  if (gid === undefined) { showToast('시트를 찾을 수 없습니다: ' + sheetName, true); return null; }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}:batchUpdate`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId:    gid,
            dimension:  'ROWS',
            startIndex: rowNum - 1,
            endIndex:   rowNum,
          },
        },
      }],
    }),
  });
  return r.json();
}

function parseRows(rows, cols) {
  return (rows || []).slice(1).map((r, i) => {
    const obj = { _row: i + 2 };
    cols.forEach((c, j) => { obj[c] = r[j] !== undefined ? r[j] : ''; });
    return obj;
  });
}

async function uploadToDrive(file) {
  const h = authHeaders();
  if (!h) throw new Error('인증 토큰 없음');
  const meta = { name: file.name, parents: [CFG.FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', file);
  const uploadR = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', headers: h, body: form }
  );
  if (!uploadR.ok) throw new Error('Drive 업로드 실패');
  const { id } = await uploadR.json();
  await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
}
