'use strict';

// ── 定数 ──────────────────────────────────────────────
const PLAYER_DEFS = [
  { id: 'abe',      name: '阿部',   nickname: 'ゆきんこ',   color: '#E91E8C', avatar: '/avatars/abe.jpg'      },
  { id: 'hakoyama', name: '箱山',   nickname: 'ほたて',     color: '#00B4D8', avatar: '/avatars/hakoyama.jpg' },
  { id: 'miwa',     name: '三輪',   nickname: 'みわちゃん', color: '#06D6A0', avatar: '/avatars/miwa.png'     },
  { id: 'furuta',   name: '古田',   nickname: 'マリメッコ', color: '#FFB703', avatar: '/avatars/furuta.jpg'   },
  { id: 'guest',    name: 'ゲスト', nickname: 'ゲスト',     color: '#9CA3AF', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='40' fill='%239CA3AF'/%3E%3Ctext x='40' y='54' font-size='36' text-anchor='middle' fill='white' font-family='sans-serif'%3EG%3C/text%3E%3C/svg%3E" },
];

const RANK_ICONS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];

// rarity: 1=N 2=R 3=SR 4=SSR 5=UR 6=LR(レジェンド)
const PIC_INFO = [
  null,
  { title: 'まだ諦めてない精神は褒めたい',     rarity: 1 },
  { title: '次回に期待している',               rarity: 1 },
  { title: 'まあ悪くはないと思う…たぶん',     rarity: 2 },
  { title: 'これは才能の片鱗を感じる',         rarity: 2 },
  { title: 'ちょっと待って本当に上手い',       rarity: 3 },
  { title: '指が人間のものではない',           rarity: 3 },
  { title: '会社の星に認定します',             rarity: 4 },
  { title: '大坪さんに見せたいやつ',           rarity: 4 },
  { title: '伝説の誕生を目撃した',             rarity: 5 },
  { title: '神・ゲーム・タイピング',           rarity: 5 },
  { title: 'これは人類の限界を超えている',     rarity: 5 },
  { title: '次元が違う。もはや別の生き物',     rarity: 5 },
  { title: '殿堂入り。神話の域に達した',       rarity: 6 },
];

const RARITY_DEF = [
  null,
  { label: 'N',  color: '#9CA3AF', bg: '#f3f4f6' },
  { label: 'R',  color: '#22c55e', bg: '#f0fdf4' },
  { label: 'SR', color: '#3b82f6', bg: '#eff6ff' },
  { label: 'SSR',color: '#a855f7', bg: '#faf5ff' },
  { label: 'UR', color: '#f59e0b', bg: '#fffbeb' },
  { label: 'LR', color: '#ef4444', bg: '#fff1f2' }, // レジェンドレア
];

function starsHtml(rarity) {
  const def = RARITY_DEF[rarity] || RARITY_DEF[1];
  const starCount = Math.min(rarity, 5);
  const stars = `<span style="color:${def.color}">${'★'.repeat(starCount)}</span>` +
                `<span style="color:#d1d5db">${'☆'.repeat(Math.max(0, 5 - starCount))}</span>`;
  const badge = `<span class="rarity-badge" style="color:${def.color};border-color:${def.color};background:${def.bg}">${def.label}</span>`;
  return badge + ' ' + stars;
}

// ── 状態 ──────────────────────────────────────────────
let socket;
let myPlayer     = null;
let gameTexts    = [];
let currentIndex = 0;
let textResults  = [];
let currentText  = null;
let inputDone    = false;
let timerHandle  = null;
let timeLeft     = 60;
let startTime    = 0;
let leaderboard  = [];

// 入力状態（char-by-char）
let matchedEPos   = 0;   // 正しく入力済みの expected インデックス
let currentSeq    = '';  // chi/shi 等 multi-char sequence の途中入力
let totalKeys     = 0;   // 総キー押下数
let wrongKeys     = 0;   // ミス回数
let nPending      = false; // 「ん」の n が pending（nn か単 n か待ち）
let showingError  = false; // エラー表示中
let displayedInput = ''; // ユーザーが実際に打った文字列（表示用）
let missedKeyCount = {}; // ミスしたキーの集計 { char: count }

// ── キーボードレイアウト ──────────────────────────────
const KB_LAYOUT = [
  ['1','2','3','4','5','6','7','8','9','0','-','^','¥'],
  ['q','w','e','r','t','y','u','i','o','p','@','['],
  ['a','s','d','f','g','h','j','k','l',';',':',']'],
  ['SHIFT','z','x','c','v','b','n','m',',','.','/','_','SHIFT'],
];

function buildKeyboard() {
  const container = document.getElementById('keyboardDisplay');
  container.innerHTML = '';
  for (const row of KB_LAYOUT) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    for (const key of row) {
      const el = document.createElement('div');
      if (key === 'SHIFT') {
        el.className = 'kb-key kb-shift';
        el.textContent = 'Shift';
      } else {
        el.className = 'kb-key';
        el.dataset.key = key;
        el.textContent = key === '-' ? '−' : /^[a-z]$/.test(key) ? key.toUpperCase() : key;
      }
      rowEl.appendChild(el);
    }
    container.appendChild(rowEl);
  }
  const spaceRow = document.createElement('div');
  spaceRow.className = 'kb-row';
  const spaceEl = document.createElement('div');
  spaceEl.className = 'kb-key kb-space';
  spaceEl.dataset.key = ' ';
  spaceEl.textContent = 'SPACE';
  spaceRow.appendChild(spaceEl);
  container.appendChild(spaceRow);
}

function getNextKey() {
  if (!currentText || inputDone) return null;
  const expected = currentText.input;
  if (matchedEPos >= expected.length) return null;
  if (currentSeq.length > 0) {
    const cands = romajiCandidates(expected, matchedEPos);
    for (const [, seq] of cands) {
      if (seq.startsWith(currentSeq)) return seq[currentSeq.length] || null;
    }
  }
  return expected[matchedEPos] || null;
}

function highlightNextKey() {
  document.querySelectorAll('.kb-key').forEach(k => k.classList.remove('kb-active'));
  const next = getNextKey();
  if (!next) return;
  const el = document.querySelector(`.kb-key[data-key="${next}"]`);
  if (el) el.classList.add('kb-active');
}

function flashKeyPress(ch) {
  const el = document.querySelector(`.kb-key[data-key="${ch}"]`);
  if (!el) return;
  el.classList.add('kb-pressed');
  setTimeout(() => el.classList.remove('kb-pressed'), 80);
}

// ── 起動 ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildLobby();
  buildKeyboard();
  setupSoundToggle();
  setupSpaceStart();
  setupGameScreenFocus();
  connectSocket();
  preloadImages();
});

// ゲーム画面をクリックしたら入力欄にフォーカス（ブラウザが自動フォーカスを
// ブロックした場合でもタイピングできるように）
function setupGameScreenFocus() {
  // クリックしても input にフォーカスしない（Windows IME 対策）
}

function preloadImages() {
  PLAYER_DEFS.forEach(p => { const i = new Image(); i.src = p.avatar; });
}

// ── Socket ────────────────────────────────────────────
function connectSocket() {
  socket = io();
  socket.on('leaderboardUpdate', records => {
    leaderboard = records;
    renderLeaderboard('lobbyLeaderboard', records);
    renderLeaderboard('resultLeaderboard', records);
  });
  socket.on('gameData', ({ texts }) => beginGame(texts));

  socket.on('scoreResult', ({ isNewBest, prevScore, newScore }) => {
    const el = document.getElementById('resultHighScore');
    if (!el) return;
    if (!isNewBest) { el.style.display = 'none'; return; }

    const prevRank = getRank(prevScore);
    const newRank  = getRank(newScore);
    const diff     = newScore - prevScore;

    let msg;
    if (prevScore === 0) {
      msg = `🏆 初記録達成！${newRank.label}！`;
    } else if (prevRank.label === newRank.label) {
      msg = `🔥 ハイスコア更新！+${diff}pt 向上！`;
    } else {
      msg = `🔥 ハイスコア更新！${prevRank.label} → ${newRank.label}！+${diff}pt 向上！`;
    }
    el.textContent = msg;
    el.style.display = 'block';
  });
}

// ── ロビー ────────────────────────────────────────────
function buildLobby() {
  const grid = document.getElementById('playerGrid');
  grid.innerHTML = '';
  PLAYER_DEFS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = `card-${p.id}`;
    card.innerHTML = `
      <div class="mine-badge">✓ 選択中</div>
      <img class="avatar-img" src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'">
      <div class="p-name">${p.name}</div>
      <div class="p-nick">${p.nickname}</div>
    `;
    card.addEventListener('click', () => selectPlayer(p.id));
    grid.appendChild(card);
  });

  document.getElementById('startBtn').addEventListener('click', requestStart);

  // ゲスト名入力 → ボタン有効/無効を動的切り替え
  document.getElementById('guestNameInput').addEventListener('input', () => {
    if (!myPlayer || myPlayer.id !== 'guest') return;
    const hasName = document.getElementById('guestNameInput').value.trim().length > 0;
    document.getElementById('startBtn').disabled = !hasName;
    document.getElementById('startHint').style.display = hasName ? 'block' : 'none';
  });
}

function selectPlayer(id) {
  if (myPlayer) {
    const prev = document.getElementById(`card-${myPlayer.id}`);
    prev.classList.remove('mine', 'mine-pop');
  }
  myPlayer = PLAYER_DEFS.find(p => p.id === id);
  const card = document.getElementById(`card-${id}`);
  card.classList.add('mine');
  // ポップアニメーションをトリガー
  card.classList.remove('mine-pop');
  void card.offsetWidth;
  card.classList.add('mine-pop');
  const guestWrap = document.getElementById('guestNameWrap');
  const btn = document.getElementById('startBtn');
  if (id === 'guest') {
    guestWrap.style.display = 'block';
    setTimeout(() => document.getElementById('guestNameInput').focus(), 50);
    // 名前が入力済みのときだけ有効
    const name = document.getElementById('guestNameInput').value.trim();
    btn.disabled = name.length === 0;
    document.getElementById('startHint').style.display = name.length === 0 ? 'none' : 'block';
  } else {
    guestWrap.style.display = 'none';
    btn.disabled = false;
    document.getElementById('startHint').style.display = 'block';
  }
}

function setupSpaceStart() {
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    if (!document.getElementById('screen-lobby').classList.contains('active')) return;
    // ゲスト名入力欄にフォーカス中はスペースでゲームを開始しない
    if (document.activeElement === document.getElementById('guestNameInput')) return;
    e.preventDefault();
    if (myPlayer) requestStart();
  });
}

function requestStart() {
  if (!myPlayer) return;
  ensureAudio();
  let guestName = null;
  if (myPlayer.id === 'guest') {
    guestName = document.getElementById('guestNameInput').value.trim();
    if (!guestName) return; // 名前未入力は弾く
    myPlayer = { ...myPlayer, nickname: guestName, name: guestName };
  }
  document.getElementById('startBtn').disabled = true;
  document.getElementById('startHint').style.display = 'none';
  // ゲスト名はstartGameで送信し、サーバーがセッションに保持する
  socket.emit('startGame', { playerId: myPlayer.id, guestName });
}

// ── カウントダウン ────────────────────────────────────
function runCountdown(cb) {
  showScreen('countdown');
  let n = 3;
  const el = document.getElementById('cdNum');
  const tick = () => {
    el.textContent = n > 0 ? n : 'GO!';
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    if (n === 0) { setTimeout(cb, 600); return; }
    n--;
    setTimeout(tick, 1000);
  };
  tick();
}

// ── ゲーム開始 ────────────────────────────────────────
function beginGame(texts) {
  gameTexts    = texts;
  currentIndex = 0;
  textResults  = [];
  runCountdown(() => {
    startBGM();
    showText(0);
  });
}

// ── テキスト表示 ──────────────────────────────────────
function showText(idx) {
  currentText = gameTexts[idx];
  inputDone   = false;
  timeLeft    = currentText.long ? 30 : 15;
  startTime   = Date.now();

  document.getElementById('roundNum').textContent      = idx + 1;
  document.getElementById('maxRound').textContent      = gameTexts.length;
  document.getElementById('catPill').textContent       = currentText.category;
  document.getElementById('displayText').textContent   = currentText.display;
  document.getElementById('displayRomaji').textContent = currentText.romaji || currentText.input;
  document.getElementById('accuracyLabel').textContent = '正確率 —';
  document.getElementById('wpmLabel').textContent      = '— WPM';
  document.getElementById('textResultFlash').style.display = 'none';

  matchedEPos   = 0;
  currentSeq    = '';
  totalKeys     = 0;
  wrongKeys     = 0;
  nPending      = false;
  showingError  = false;
  displayedInput = '';
  missedKeyCount = {};

  // hidden input は使わない（Windows IME 対策）
  document.addEventListener('keydown', onKeydown);

  renderCharPreview(0, false);
  highlightNextKey();
  buildProgressDots(idx, gameTexts.length);
  startTimer();
  showScreen('game');
}

// ── 柔軟ローマ字マッチング ────────────────────────────

function romajiCandidates(exp, pos) {
  const e3 = exp.slice(pos, pos + 3);
  const e2 = exp.slice(pos, pos + 2);
  const e1 = exp[pos];

  // 3文字パターン
  const map3 = { chi:['chi','ti'], shi:['shi','si'], tsu:['tsu','tu'],
                 sha:['sha','sya'], shu:['shu','syu'], sho:['sho','syo'],
                 cha:['cha','tya'], chu:['chu','tyu'], cho:['cho','tyo'],
                 dzu:['dzu','du'] };
  if (map3[e3]) return map3[e3].map(t => [3, t]);

  // 2文字パターン（eFwd=2, 代替入力も含む）
  const map2 = {
    fu:['fu','hu'], ji:['ji','zi'],
    // じゃ行（ja/ju/jo/je → zya/zyu/zyo/zye でも入力可）
    ja:['ja','zya'], ju:['ju','zyu'], jo:['jo','zyo'], je:['je','zye'],
    // 小さいかな (le/xe = ぇ, la/xa = ぁ, etc.)
    le:['le','xe'], xe:['xe','le'],
    la:['la','xa'], xa:['xa','la'],
    li:['li','xi'], xi:['xi','li'],
    lu:['lu','xu'], xu:['xu','lu'],
    lo:['lo','xo'], xo:['xo','lo'],
  };
  if (map2[e2]) return map2[e2].map(t => [2, t]);

  // 「ん」(n) の処理：次が子音か末尾なら nn も OK
  if (e1 === 'n') {
    const next = exp[pos + 1];
    if (!next || !'aiueoyn'.includes(next)) {
      return [[1, 'n'], [2, 'nn']];
    }
    return [[1, 'n']];
  }

  return e1 ? [[1, e1]] : [];
}

// ── キーボード入力（char-by-char）────────────────────
function onKeydown(e) {
  // ゲーム画面が表示中のときだけ処理
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  if (inputDone) return;

  // Backspace/Delete は無効
  if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); return; }

  // 制御キーは無視
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === ' ') { e.preventDefault(); return; }

  e.preventDefault();
  processChar(e.key.toLowerCase());
}

function processChar(ch) {
  const expected = currentText.input;
  totalKeys++;

  // 「ん」の n が pending 中
  if (nPending) {
    nPending   = false;
    currentSeq = '';
    matchedEPos++; // n 確定（1文字前進）

    if (ch === 'n') {
      // nn の2文字目 → ん確定（nn として打った）
      displayedInput += 'nn';
      playTypingSound();
      flashKeyPress('n');
      if (matchedEPos >= expected.length) { _completeTyping(); return; }
      _updateDisplay();
      return;
    }
    // nn でなかった → n は単独で確定
    displayedInput += 'n';
    if (matchedEPos >= expected.length) { _completeTyping(); return; }
    _processCharAt(ch);
    return;
  }

  _processCharAt(ch);
}

function _processCharAt(ch) {
  const expected = currentText.input;
  if (matchedEPos >= expected.length) return;

  const cands = romajiCandidates(expected, matchedEPos);
  const testSeq = currentSeq + ch;

  // 「ん」n の ambiguity 処理（currentSeq が空の場合のみ）
  if (currentSeq === '' && ch === 'n' && cands.some(([, s]) => s === 'nn')) {
    nPending = true;
    showingError = false;
    playTypingSound();
    flashKeyPress(ch);
    _updateDisplay();
    return;
  }

  // 完全一致チェック
  let fullMatch = null;
  for (const [eFwd, tSeq] of cands) {
    if (tSeq === testSeq) { fullMatch = [eFwd, tSeq]; break; }
  }

  // prefix チェック（chi → c → ch → chi など）
  let isPrefix = false;
  if (!fullMatch) {
    for (const [, tSeq] of cands) {
      if (tSeq.startsWith(testSeq) && tSeq.length > testSeq.length) { isPrefix = true; break; }
    }
  }

  if (fullMatch) {
    playTypingSound();
    flashKeyPress(ch);
    displayedInput += testSeq; // 実際に打った文字を記録
    matchedEPos += fullMatch[0];
    currentSeq   = '';
    showingError  = false;
    _updateDisplay();
    if (matchedEPos >= expected.length) _completeTyping();
  } else if (isPrefix) {
    // 途中入力中（例: "c" for "chi"）→ エラーなし、位置は進まない
    playTypingSound();
    flashKeyPress(ch);
    currentSeq   = testSeq;
    showingError  = false;
    _updateDisplay();
  } else {
    // ミス
    wrongKeys++;
    showingError = true;
    const missChar = expected[matchedEPos];
    missedKeyCount[missChar] = (missedKeyCount[missChar] || 0) + 1;
    currentSeq = '';
    playErrorSound();
    triggerMissFlash();
    _updateDisplay();
  }
}

function _updateDisplay() {
  const elapsed = (Date.now() - startTime) / 60000;
  const wpm = elapsed > 0 ? Math.round((matchedEPos / 5) / elapsed) : 0;
  const acc = totalKeys > 0 ? Math.round((totalKeys - wrongKeys) / totalKeys * 100) : 100;
  document.getElementById('accuracyLabel').textContent = `正確率 ${acc}%`;
  document.getElementById('wpmLabel').textContent      = `${wpm} WPM`;
  renderCharPreview(matchedEPos, showingError);
  highlightNextKey();
}

function _completeTyping() {
  const t    = Date.now() - startTime;
  const fwpm = Math.round((currentText.input.length / 5) / (t / 60000));
  const acc  = totalKeys > 0 ? Math.round((totalKeys - wrongKeys) / totalKeys * 100) : 100;
  completeText(fwpm, acc, true);
}

// ── テキスト完了 ──────────────────────────────────────
function completeText(wpm, acc, completed) {
  inputDone = true;
  stopTimer();
  document.querySelectorAll('.kb-key').forEach(k => k.classList.remove('kb-active', 'kb-pressed'));
  document.removeEventListener('keydown', onKeydown);

  textResults.push({ wpm, acc, completed });

  const flash = document.getElementById('textResultFlash');
  flash.textContent = completed ? `✓ ${wpm} WPM` : '⏰ タイムオーバー';
  flash.className   = `text-result-flash ${completed ? 'flash-ok' : 'flash-timeout'}`;
  flash.style.display = 'block';

  setTimeout(() => {
    flash.style.display = 'none';
    if (currentIndex + 1 < gameTexts.length) {
      currentIndex++;
      showText(currentIndex);
    } else {
      finishGame();
    }
  }, 1300);
}

// ── タイマー ──────────────────────────────────────────
function startTimer() {
  stopTimer();
  updateTimerDisplay(timeLeft);
  timerHandle = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(timeLeft);
    if (timeLeft <= 0) { stopTimer(); completeText(0, 0, false); }
  }, 1000);
}

function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

function updateTimerDisplay(sec) {
  const el = document.getElementById('timerBox');
  el.textContent = sec;
  el.classList.toggle('danger', sec <= 10);
}

// ── ゲーム終了 ────────────────────────────────────────
function finishGame() {
  stopBGM();
  const done   = textResults.filter(r => r.completed);
  const total  = textResults.length;
  const avgWpm = done.length > 0 ? Math.round(done.reduce((s, r) => s + r.wpm, 0) / done.length) : 0;
  const avgAcc = done.length > 0 ? Math.round(done.reduce((s, r) => s + r.acc, 0) / done.length) : 0;
  const score  = done.reduce((s, r) => s + Math.floor(r.wpm * (r.acc / 100)), 0);

  socket.emit('submitScore', { playerId: myPlayer.id, nickname: myPlayer.nickname, score, avgWpm, avgAccuracy: avgAcc });
  showResult(score, avgWpm, avgAcc);
}

// ── MISS!! フラッシュ ─────────────────────────────────
function triggerMissFlash() {
  const el = document.getElementById('missFlash');
  if (!el) return;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// ── ランク判定 ────────────────────────────────────────
// { min, label, color } を降順で定義
const RANK_TABLE = [
  { min: 4000, label: 'SSS', color: '#ff6b35' },
  { min: 3000, label: 'SS',  color: '#f59e0b' },
  { min: 2300, label: 'S+',  color: '#fbbf24' },
  { min: 1700, label: 'S',   color: '#f59e0b' },
  { min: 1400, label: 'A+',  color: '#7c3aed' },
  { min: 1100, label: 'A',   color: '#7c3aed' },
  { min: 850,  label: 'A-',  color: '#9f67f5' },
  { min: 650,  label: 'B+',  color: '#06D6A0' },
  { min: 500,  label: 'B',   color: '#06D6A0' },
  { min: 370,  label: 'B-',  color: '#34d399' },
  { min: 250,  label: 'C',   color: '#00B4D8' },
  { min: 150,  label: 'D',   color: '#6b7280' },
  { min: 80,   label: 'E',   color: '#9CA3AF' },
  { min: 30,   label: 'F',   color: '#9CA3AF' },
  { min: 0,    label: 'Z',   color: '#ef4444' },
];

function getRank(score) {
  const idx = RANK_TABLE.findIndex(r => score >= r.min);
  const cur  = RANK_TABLE[idx];
  const prev = RANK_TABLE[idx - 1]; // 一つ上のランク（なければ最高位）
  return {
    label: cur.label + ' ランク',
    color: cur.color,
    next:  prev ? { label: prev.label + ' ランク', need: prev.min - score } : null,
  };
}

// ── 課題フィードバック ────────────────────────────────
function getFeedback(avgAcc, avgWpm) {
  const tips = [];

  // 最もミスの多いキー
  const entries = Object.entries(missedKeyCount).sort((a, b) => b[1] - a[1]);
  if (entries.length > 0 && entries[0][1] >= 2) {
    tips.push(`「${entries[0][0]}」キーのミスが多め`);
  }

  if (avgAcc < 80)       tips.push('正確性が課題！ゆっくり丁寧に打とう');
  else if (avgAcc < 90)  tips.push('正確性をもう少し上げるとスコアアップ');
  else if (avgAcc >= 97) tips.push('正確性は抜群！');

  if (avgWpm < 30)       tips.push('スピードを意識してみよう');
  else if (avgWpm >= 80) tips.push('スピードは十分！');

  if (tips.length === 0) tips.push('バランスが良い！この調子で！');

  return tips;
}

// ── スコアに応じたpic選択（ランダム要素あり）──────────
function picForScore(score) {
  // [min, max] の範囲からランダム選択（高スコアほど高レア帯）
  const [lo, hi] =
    score >= 3000 ? [11, 13] :
    score >= 2300 ? [10, 12] :
    score >= 1700 ? [ 8, 11] :
    score >= 1100 ? [ 6,  9] :
    score >= 700  ? [ 4,  7] :
    score >= 300  ? [ 2,  5] :
                    [ 1,  3];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ── 結果画面 ──────────────────────────────────────────
function showResult(score, avgWpm, avgAcc) {
  document.getElementById('resultAvatar').src         = myPlayer.avatar;
  document.getElementById('resultNickname').textContent = myPlayer.nickname;
  document.getElementById('resultScore').textContent  = score;
  document.getElementById('resultWpm').textContent    = avgWpm;
  document.getElementById('resultAccuracy').textContent = `${avgAcc}%`;

  const picNum = picForScore(score);
  const picEl  = document.getElementById('scorePic');
  const picExt = picNum === 13 ? 'png' : picNum >= 11 ? 'jpeg' : 'jpg';
  picEl.src    = `/avatars/pic${picNum}.${picExt}`;
  picEl.alt    = `スコアキャラクター lv${picNum}`;
  const info = PIC_INFO[picNum] || PIC_INFO[1];
  document.getElementById('picTitle').textContent = `「${info.title}」`;
  document.getElementById('picRarity').innerHTML = starsHtml(info.rarity);

  // ハイスコアバッジは scoreResult イベント到着まで非表示
  const hsBadge = document.getElementById('resultHighScore');
  if (hsBadge) hsBadge.style.display = 'none';

  const rank = getRank(score);
  const rankEl = document.getElementById('resultRank');
  rankEl.textContent = rank.label;
  rankEl.style.color = rank.color;

  const nextEl = document.getElementById('resultNextRank');
  if (nextEl) {
    if (rank.next) {
      nextEl.textContent = `🎯 次は ${rank.next.label} まであと ${rank.next.need} pt！`;
      nextEl.style.display = 'block';
    } else {
      nextEl.textContent = '👑 最高ランク達成！伝説入りおめでとう！';
      nextEl.style.display = 'block';
    }
  }

  const feedbackItems = getFeedback(avgAcc, avgWpm);
  document.getElementById('resultFeedback').innerHTML =
    feedbackItems.map(f => `<div class="fb-item">💡 ${f}</div>`).join('');

  renderLeaderboard('resultLeaderboard', leaderboard);
  spawnConfetti();
  showScreen('result');

  document.getElementById('replayBtn').onclick = () => {
    if (myPlayer && myPlayer.id === 'guest') {
      // ゲストは名前を毎回入力させる
      document.getElementById('guestNameInput').value = '';
      document.getElementById('startBtn').disabled = true;
      document.getElementById('startHint').style.display = 'none';
    } else {
      document.getElementById('startBtn').disabled = false;
      document.getElementById('startHint').style.display = 'block';
    }
    showScreen('lobby');
  };
}


// ── リーダーボード ────────────────────────────────────
function renderLeaderboard(containerId, records) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!records || !records.length) {
    el.innerHTML = '<div class="lb-empty">まだ記録がありません</div>';
    return;
  }
  el.innerHTML = records.map((r, i) => `
    <div class="lb-row${myPlayer && r.playerId === myPlayer.id ? ' lb-mine' : ''}">
      <span class="lb-rank">${RANK_ICONS[i] || i + 1}</span>
      <span class="lb-name" style="color:${r.color}">${r.nickname}</span>
      <span class="lb-score">${r.score}</span>
      <span class="lb-wpm">${r.avgWpm}</span>
      <span class="lb-acc">${r.avgAccuracy}%</span>
      <span class="lb-time">${r.timestamp}</span>
      <button class="lb-del" onclick="deleteScore(${i})" title="削除">✕</button>
    </div>
  `).join('');
}

async function deleteScore(idx) {
  if (!confirm('このスコアを削除しますか？')) return;
  await fetch(`/api/admin/scores/${idx}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Password': 'kanazawa' },
  });
}

// ── charプレビュー ────────────────────────────────────
function renderCharPreview(ePos, hasError) {
  const expected = currentText.input;
  let html = '';

  // 1. 確定済み：ユーザーが実際に打った文字（緑）
  for (const ch of displayedInput) {
    html += `<span class="ch-ok">${escHtml(ch)}</span>`;
  }

  if (currentSeq.length > 0 && !hasError) {
    // 2a. 途中入力中 (e.g. "sy" for "sho"/"syo")
    for (const ch of currentSeq) {
      html += `<span class="ch-pending">${escHtml(ch)}</span>`;
    }
    // 2b. マッチ中の候補の残り部分
    const cands = romajiCandidates(expected, ePos);
    let remSeq = '';
    let seqLen = 0;
    for (const [eFwd, seq] of cands) {
      if (seq.startsWith(currentSeq)) { remSeq = seq.slice(currentSeq.length); seqLen = eFwd; break; }
    }
    if (remSeq.length > 0) {
      html += `<span class="ch-cursor">${escHtml(remSeq[0])}</span>`;
      for (let i = 1; i < remSeq.length; i++) html += `<span class="ch-rest">${escHtml(remSeq[i])}</span>`;
    }
    // 2c. 残りの expected
    for (const ch of expected.slice(ePos + seqLen)) {
      html += `<span class="ch-rest">${escHtml(ch)}</span>`;
    }

  } else if (nPending) {
    // 3. n pending：'n' を pending 色で表示
    html += `<span class="ch-pending">n</span>`;
    for (const ch of expected.slice(ePos + 1)) {
      html += `<span class="ch-rest">${escHtml(ch)}</span>`;
    }

  } else {
    // 4. 通常：カーソル位置 + 残り
    if (ePos < expected.length) {
      if (hasError) html += `<span class="ch-err">${escHtml(expected[ePos])}</span>`;
      else          html += `<span class="ch-cursor">${escHtml(expected[ePos])}</span>`;
    }
    for (const ch of expected.slice(ePos + 1)) {
      html += `<span class="ch-rest">${escHtml(ch)}</span>`;
    }
  }

  document.getElementById('charPreview').innerHTML = html;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── 進捗ドット ────────────────────────────────────────
function buildProgressDots(current, total) {
  const container = document.getElementById('progressDots');
  container.innerHTML = Array.from({ length: total }, (_, i) => {
    let cls = 'pdot';
    if (i < current)  cls += ' pdot-done';
    if (i === current) cls += ' pdot-active';
    return `<div class="${cls}"></div>`;
  }).join('');
}

// ── 画面切替 ──────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const MAP = { lobby: 'screen-lobby', countdown: 'screen-countdown', game: 'screen-game', result: 'screen-result' };
  const el = document.getElementById(MAP[name]);
  if (el) el.classList.add('active');
}

// ── 紙吹雪 ────────────────────────────────────────────
function spawnConfetti() {
  const wrap   = document.getElementById('confettiCanvas');
  wrap.innerHTML = '';
  const colors = ['#c084fc','#f5c842','#06D6A0','#E91E8C','#00B4D8','#FFB703','#4ade80','#818cf8'];
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div');
    el.className  = 'cf';
    el.style.cssText = `
      left:${Math.random() * 100}vw;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      width:${6 + Math.random() * 8}px; height:${10 + Math.random() * 12}px;
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      animation-duration:${1.5 + Math.random() * 2.5}s;
      animation-delay:${Math.random() * 2}s;
    `;
    wrap.appendChild(el);
  }
}

// ════════════════════════════════════════════════════
// AUDIO
// ════════════════════════════════════════════════════

let audioCtx    = null;
let soundEnabled = true;
let masterGain  = null;
let bgmTimer    = null;
let bgmMelIdx   = 0;
let bgmBassIdx  = 0;
let bgmMelNext  = 0;
let bgmBassNext = 0;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(audioCtx.destination);
}

function setupSoundToggle() {
  const btn = document.getElementById('soundToggle');
  btn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    if (masterGain) masterGain.gain.value = soundEnabled ? 1 : 0;
  });
}

// ── タイピング音 ──────────────────────────────────────
function playTypingSound() {
  if (!soundEnabled || !audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now  = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.value = 900 + Math.random() * 150;
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.05);
}

// ── エラー音 ──────────────────────────────────────────
function playErrorSound() {
  if (!soundEnabled || !audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now  = audioCtx.currentTime;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.15);
}

// ── BGM（疾走感） ─────────────────────────────────────
// BPM 165, 16分音符ベース
const _S  = 60 / 165 / 4;  // 16分音符 ≈ 0.091s
const _S2 = _S * 2;         // 8分音符
const _S4 = _S * 4;         // 4分音符

// 4小節ループメロディ（C-Am-F-G、疾走感のある上昇下降）
const MEL = [
  // 小節1: C（上昇スプリント）
  [523.25,_S],[659.25,_S],[783.99,_S],[659.25,_S],
  [880.00,_S],[783.99,_S],[659.25,_S],[523.25,_S],
  [659.25,_S],[783.99,_S],[880.00,_S],[659.25,_S],
  [880.00,_S2],           [880.00,_S2],
  // 小節2: Am（高音ゾーン）
  [880.00,_S],[987.77,_S],[1046.5,_S],[987.77,_S],
  [880.00,_S],[783.99,_S],[880.00,_S],[987.77,_S],
  [1046.5,_S2],           [987.77,_S],[880.00,_S],
  [783.99,_S2],           [0,     _S2],
  // 小節3: F（ドライビング）
  [698.46,_S],[880.00,_S],[1046.5,_S],[880.00,_S],
  [1046.5,_S],[880.00,_S],[698.46,_S],[880.00,_S],
  [880.00,_S],[1046.5,_S],[880.00,_S],[698.46,_S],
  [880.00,_S2],           [783.99,_S2],
  // 小節4: G→C（解放スプリント）
  [783.99,_S],[880.00,_S],[987.77,_S],[783.99,_S],
  [880.00,_S2],           [783.99,_S],[659.25,_S],
  [587.33,_S],[659.25,_S],[783.99,_S],[659.25,_S],
  [523.25,_S4],
];

// ベース: ルート+5度交互（8分音符）
const BASS = [
  [130.81,_S2],[196.00,_S2],[130.81,_S2],[196.00,_S2],  // C小節
  [130.81,_S2],[196.00,_S2],[130.81,_S2],[196.00,_S2],
  [110.00,_S2],[164.81,_S2],[110.00,_S2],[164.81,_S2],  // Am小節
  [110.00,_S2],[164.81,_S2],[110.00,_S2],[164.81,_S2],
  [87.31, _S2],[130.81,_S2],[87.31, _S2],[130.81,_S2],  // F小節
  [87.31, _S2],[130.81,_S2],[87.31, _S2],[130.81,_S2],
  [98.00, _S2],[146.83,_S2],[98.00, _S2],[146.83,_S2],  // G小節
  [98.00, _S2],[196.00,_S2],[98.00, _S2],[196.00,_S2],
];

let bgmHatNext = 0;

function startBGM() {
  if (!audioCtx) return;
  bgmMelIdx  = 0; bgmBassIdx  = 0;
  bgmMelNext = bgmBassNext = bgmHatNext = audioCtx.currentTime + 0.1;
  bgmTimer   = setInterval(_scheduleBGM, 50);
}

function stopBGM() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
}

function _scheduleBGM() {
  if (!audioCtx) return;
  const ahead = audioCtx.currentTime + 0.25;

  while (bgmMelNext < ahead) {
    const [f, d] = MEL[bgmMelIdx % MEL.length];
    if (f > 0) _bgmNote(f, d, 'triangle', bgmMelNext, 0.06);
    bgmMelNext += d; bgmMelIdx++;
  }
  while (bgmBassNext < ahead) {
    const [f, d] = BASS[bgmBassIdx % BASS.length];
    _bgmNote(f, d, 'sine', bgmBassNext, 0.09);
    bgmBassNext += d; bgmBassIdx++;
  }
  while (bgmHatNext < ahead) {
    _hihat(bgmHatNext);
    bgmHatNext += _S2;
  }
}

function _bgmNote(freq, dur, type, when, vol) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.85);
  osc.connect(gain); gain.connect(masterGain);
  osc.start(when); osc.stop(when + dur);
}

function _hihat(when) {
  const len = Math.floor(audioCtx.sampleRate * 0.022);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src  = audioCtx.createBufferSource();
  const hp   = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 8000;
  gain.gain.setValueAtTime(0.055, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.018);
  src.buffer = buf;
  src.connect(hp); hp.connect(gain); gain.connect(masterGain);
  src.start(when);
}
