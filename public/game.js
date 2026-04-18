'use strict';

// ── 定数 ──────────────────────────────────────────────
const PLAYER_DEFS = [
  { id: 'abe',      name: '阿部',   nickname: 'ゆきんこ',   color: '#E91E8C', avatar: '/avatars/abe.jpg'      },
  { id: 'hakoyama', name: '箱山',   nickname: 'ほたて',     color: '#00B4D8', avatar: '/avatars/hakoyama.jpg' },
  { id: 'miwa',     name: '三輪',   nickname: 'みわちゃん', color: '#06D6A0', avatar: '/avatars/miwa.png'     },
  { id: 'furuta',   name: '古田',   nickname: 'マリメッコ', color: '#FFB703', avatar: '/avatars/furuta.jpg'   },
];

const RANK_ICONS = ['🥇','🥈','🥉','4️⃣'];
const MEMORY_PHOTOS = ['/avatars/memory1.jpg', '/avatars/memory2.jpg'];

// ── 状態 ──────────────────────────────────────────────
let socket;
let mySocketId  = null;
let myPlayer    = null;
let currentText = null;
let totalChars  = 0;
let startTime   = 0;
let finished    = false;
let timerInterval = null;
let timeLeft    = 60;
let lastTyped   = '';

// ── 起動 ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildLobby();
  socket = io();
  setupSocket();
  preloadImages();
});

function preloadImages() {
  [...PLAYER_DEFS.map(p => p.avatar), ...MEMORY_PHOTOS].forEach(src => {
    const img = new Image(); img.src = src;
  });
}

// ── ロビー構築 ────────────────────────────────────────
function buildLobby() {
  const grid = document.getElementById('playerGrid');
  PLAYER_DEFS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = `card-${p.id}`;
    card.innerHTML = `
      <span class="ready-pip">READY</span>
      <img class="avatar-img" src="${p.avatar}" alt="${p.name}" onerror="this.src='/avatars/fallback.png'">
      <div class="p-name">${p.name}</div>
      <div class="p-nick">${p.nickname}</div>
      <div class="card-actions">
        <button class="btn btn-success" id="readyBtn-${p.id}" onclick="toggleReady('${p.id}')">準備OK</button>
        <button class="btn btn-ghost"   onclick="leaveGame('${p.id}')">離席</button>
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.closest('.card-actions')) return;
      joinPlayer(p.id);
    });
    grid.appendChild(card);
  });
}

// ── Socket ────────────────────────────────────────────
function setupSocket() {
  socket.on('connect', () => { mySocketId = socket.id; });

  socket.on('joinSuccess', ({ player }) => {
    myPlayer = PLAYER_DEFS.find(p => p.id === player.id);
    const card = document.getElementById(`card-${player.id}`);
    if (card) card.classList.add('mine');
  });

  socket.on('joinError', msg => showModal(msg));

  socket.on('playerList', ({ players, status }) => updateLobbyUI(players, status));

  socket.on('countdown', ({ count }) => {
    showScreen('countdown');
    const el = document.getElementById('cdNum');
    el.textContent = count;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });

  socket.on('roundStart', ({ round, maxRounds, text }) => startRound(round, maxRounds, text));

  socket.on('progressUpdate', ({ playerId, chars }) => {
    const pct = totalChars ? Math.round(chars / totalChars * 100) : 0;
    setProgressUI(playerId, pct, chars >= totalChars);
  });

  socket.on('roundEnd', ({ round, maxRounds, results, scoreboard }) => {
    stopTimer();
    showRoundEnd(round, maxRounds, results, scoreboard);
  });

  socket.on('waitNextRound', () => {
    showScreen('lobby');
    myPlayer && setReadyState(myPlayer.id, false);
  });

  socket.on('gameEnd', ({ scoreboard }) => showGameOver(scoreboard));
  socket.on('chatworkSent', ({ success }) => {
    document.getElementById('chatworkMsg').textContent =
      success ? '✅ Chatworkに結果を投稿しました！' : '⚠️ Chatwork通知の送信に失敗しました';
  });
  socket.on('gameReset', () => { myPlayer = null; location.reload(); });
  socket.on('latejoin', ({ round, maxRounds, text, status, scores }) => {
    if (status === 'playing') startRound(round, maxRounds, text);
    renderScoreboard(scores);
  });
}

// ── ロビー操作 ────────────────────────────────────────
function joinPlayer(id) {
  const card = document.getElementById(`card-${id}`);
  if (card.classList.contains('taken')) return;
  if (myPlayer) return;
  socket.emit('join', { playerId: id });
}

function toggleReady(id) {
  if (!myPlayer || myPlayer.id !== id) return;
  socket.emit('toggleReady');
}

function leaveGame(id) {
  if (!myPlayer || myPlayer.id !== id) return;
  socket.disconnect();
  location.reload();
}

// ── ロビーUI ──────────────────────────────────────────
function updateLobbyUI(players, status) {
  PLAYER_DEFS.forEach(p => {
    const card = document.getElementById(`card-${p.id}`);
    card.classList.remove('taken','mine','ready-state');
  });

  const area = document.getElementById('joinedArea');
  area.innerHTML = '';

  if (!players.length) {
    area.innerHTML = '<p class="empty-hint">カードをクリックして参加してください</p>';
    return;
  }

  players.forEach(pl => {
    const def = PLAYER_DEFS.find(d => d.id === pl.id);
    const card = document.getElementById(`card-${pl.id}`);
    card.classList.add('taken');
    if (pl.socketId === mySocketId) {
      card.classList.add('mine');
      setReadyState(pl.id, pl.ready);
    }
    if (pl.ready) card.classList.add('ready-state');

    const chip = document.createElement('div');
    chip.className = 'joined-chip';
    chip.innerHTML = `
      <img class="chip-avatar" src="${def.avatar}" alt="${def.name}">
      <span>${pl.nickname}</span>
      ${pl.ready ? '<span class="chip-ready">✅</span>' : ''}
    `;
    area.appendChild(chip);
  });
}

function setReadyState(id, ready) {
  const btn = document.getElementById(`readyBtn-${id}`);
  if (!btn) return;
  btn.textContent = ready ? '準備中…' : '準備OK';
  btn.style.opacity = ready ? '.6' : '1';
}

// ── ラウンド開始 ──────────────────────────────────────
function startRound(round, maxRounds, text) {
  currentText = text;
  totalChars  = text.input.length;
  finished    = false;
  lastTyped   = '';
  startTime   = Date.now();
  timeLeft    = 60;

  document.getElementById('roundNum').textContent  = round;
  document.getElementById('maxRound').textContent  = maxRounds;
  document.getElementById('catPill').textContent   = text.category;
  document.getElementById('displayText').textContent = text.display;
  document.getElementById('accuracyLabel').textContent = '正確率 —';
  document.getElementById('wpmLabel').textContent      = '— WPM';

  const input = document.getElementById('typingInput');
  input.value = '';
  input.disabled = false;
  input.focus();

  renderCharPreview('');
  buildProgressBars();
  buildAvatarProgress();
  renderScoreboard([]);
  startTimer();
  showScreen('game');

  input.addEventListener('input', onInput);
}

// ── タイマー ──────────────────────────────────────────
function startTimer() {
  stopTimer();
  updateTimerDisplay(60);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(timeLeft);
    if (timeLeft <= 0) {
      stopTimer();
      if (!finished) forceComplete();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerDisplay(sec) {
  const el = document.getElementById('timerBox');
  el.textContent = sec;
  el.classList.toggle('danger', sec <= 10);
}

function forceComplete() {
  finished = true;
  const input = document.getElementById('typingInput');
  input.disabled = true;
  input.removeEventListener('input', onInput);
  socket.emit('complete', { accuracy: 0, time: 60000, wpm: 0 });
}

// ── 入力処理 ──────────────────────────────────────────
function onInput(e) {
  if (finished) return;
  const typed    = e.target.value;
  const expected = currentText.input;

  let correct = 0;
  for (let i = 0; i < typed.length && i < expected.length; i++) {
    if (typed[i] === expected[i]) correct++; else break;
  }

  lastTyped = typed;
  renderCharPreview(typed);

  // WPM・正確率
  const elapsed = (Date.now() - startTime) / 60000;
  const wpm     = elapsed > 0 ? Math.round((correct / 5) / elapsed) : 0;
  const acc     = typed.length > 0 ? Math.round(correct / typed.length * 100) : 100;
  document.getElementById('accuracyLabel').textContent = `正確率 ${acc}%`;
  document.getElementById('wpmLabel').textContent      = `${wpm} WPM`;

  socket.emit('progress', { chars: correct });
  updateMyProgress(correct);

  // 完了チェック
  if (typed === expected) {
    finished = true;
    stopTimer();
    input.disabled = true;
    input.removeEventListener('input', onInput);
    const time = Date.now() - startTime;
    socket.emit('complete', { accuracy: 100, time, wpm });
  }
}

// ── char preview (寿司打スタイル) ─────────────────────
function renderCharPreview(typed) {
  const expected = currentText.input;
  let html = '';
  for (let i = 0; i < expected.length; i++) {
    const ch = esc(expected[i]);
    if (i < typed.length) {
      html += typed[i] === expected[i]
        ? `<span class="ch-ok">${ch}</span>`
        : `<span class="ch-err">${ch}</span>`;
    } else if (i === typed.length) {
      html += `<span class="ch-cursor">${ch}</span>`;
    } else {
      html += `<span class="ch-rest">${ch}</span>`;
    }
  }
  document.getElementById('charPreview').innerHTML = html;
}

function esc(s) {
  return s === ' ' ? '&nbsp;' : s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── 進捗UI ────────────────────────────────────────────
function buildProgressBars() {
  const container = document.getElementById('progressAll');
  container.innerHTML = '';
  PLAYER_DEFS.forEach(p => {
    const row = document.createElement('div');
    row.className = 'prog-row';
    row.id = `prog-${p.id}`;
    row.innerHTML = `
      <img class="prog-avatar" src="${p.avatar}" alt="${p.nickname}">
      <div class="prog-track"><div class="prog-fill" id="pfill-${p.id}" style="background:${p.color}"></div></div>
      <div class="prog-pct" id="ppct-${p.id}">0%</div>
    `;
    container.appendChild(row);
  });
}

function buildAvatarProgress() {
  const container = document.getElementById('avatarProgress');
  container.innerHTML = '';
  PLAYER_DEFS.forEach(p => {
    const item = document.createElement('div');
    item.className = 'avatar-prog-item';
    item.id = `apitem-${p.id}`;
    item.innerHTML = `
      <img class="ap-avatar" src="${p.avatar}" alt="${p.nickname}" id="apavatar-${p.id}">
      <div class="ap-nick" style="color:${p.color}">${p.nickname}</div>
      <div class="ap-bar-track"><div class="ap-bar-fill" id="apfill-${p.id}" style="background:${p.color}"></div></div>
      <div class="ap-pct" id="appct-${p.id}">0%</div>
    `;
    container.appendChild(item);
  });
}

function updateMyProgress(chars) {
  if (!myPlayer) return;
  const pct = totalChars ? Math.round(chars / totalChars * 100) : 0;
  setProgressUI(myPlayer.id, pct, chars >= totalChars);
}

function setProgressUI(playerId, pct, done) {
  const fill  = document.getElementById(`pfill-${playerId}`);
  const ppct  = document.getElementById(`ppct-${playerId}`);
  const afill = document.getElementById(`apfill-${playerId}`);
  const apct  = document.getElementById(`appct-${playerId}`);
  const apitem= document.getElementById(`apitem-${playerId}`);
  const row   = document.getElementById(`prog-${playerId}`);

  if (fill)  fill.style.width  = pct + '%';
  if (ppct)  ppct.textContent  = pct + '%';
  if (afill) afill.style.width = pct + '%';
  if (apct)  apct.textContent  = pct + '%';
  if (done) {
    apitem && apitem.classList.add('done');
    row    && row.classList.add('prog-done');
  }
}

// ── スコアボード ──────────────────────────────────────
function renderScoreboard(players) {
  const sorted = [...players].sort((a,b) => b.score - a.score);
  const list   = document.getElementById('scoreList');
  if (!list) return;
  list.innerHTML = '';
  sorted.forEach((p, i) => {
    const def = PLAYER_DEFS.find(d => d.id === p.id) || p;
    const item = document.createElement('div');
    item.className = 'score-item';
    item.innerHTML = `
      <div class="score-rank">${RANK_ICONS[i]||i+1}</div>
      <img class="score-avatar" src="${def.avatar}" alt="${p.nickname}">
      <div class="score-info">
        <div class="score-nick">${p.nickname}</div>
        <div class="score-pts"><span>${p.score}</span>pt</div>
      </div>
    `;
    list.appendChild(item);
  });
}

// ── ラウンド結果 ──────────────────────────────────────
function showRoundEnd(round, maxRounds, results, scoreboard) {
  document.getElementById('resultRound').textContent = round;

  // podium top3
  const podium = document.getElementById('resultPodium');
  podium.innerHTML = '';
  const top3 = results.slice(0,3);
  // 2位→1位→3位の順で並べる (display order)
  const displayOrder = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;
  displayOrder.forEach((r, di) => {
    const realRank = results.indexOf(r) + 1;
    const def = PLAYER_DEFS.find(d => d.id === r.playerId) || r;
    const item = document.createElement('div');
    item.className = `podium-item rank-${realRank}`;
    item.innerHTML = `
      <div class="podium-icon">${RANK_ICONS[realRank-1]||''}</div>
      <img class="podium-avatar" src="${def.avatar}" alt="${r.nickname}">
      <div class="podium-nick" style="color:${def.color}">${r.nickname}</div>
      <div class="podium-pts">+${r.pointsEarned??0}pt</div>
      <div class="podium-block"></div>
    `;
    podium.appendChild(item);
  });

  // 4位以下リスト
  const mini = document.getElementById('resultList');
  mini.innerHTML = '';
  results.slice(3).forEach((r, i) => {
    const def = PLAYER_DEFS.find(d => d.id === r.playerId) || r;
    const item = document.createElement('div');
    item.className = 'rli';
    item.innerHTML = `
      <div class="rli-rank">${RANK_ICONS[3+i]||4+i}</div>
      <img class="rli-avatar" src="${def.avatar}" alt="${r.nickname}">
      <div class="rli-info">
        <div class="rli-name" style="color:${def.color}">${r.nickname}</div>
        <div class="rli-stat">${r.dnf ? 'タイムオーバー' : `正確率${r.accuracy}% / ${(r.time/1000).toFixed(1)}秒`}</div>
      </div>
      <div class="rli-pts">+${r.pointsEarned??0}pt</div>
    `;
    mini.appendChild(item);
  });

  const hint = document.getElementById('nextHint');
  hint.textContent = round >= maxRounds
    ? '全ラウンド終了！最終結果を確認中...'
    : '準備ができたら「準備OK」を押してください';

  renderScoreboard(scoreboard);
  showScreen('roundend');
}

// ── ゲーム終了 ────────────────────────────────────────
function showGameOver(scoreboard) {
  const sorted = [...scoreboard].sort((a,b) => b.score - a.score);

  // big podium top3
  const podium = document.getElementById('finalPodium');
  podium.innerHTML = '';
  const top3 = sorted.slice(0,3);
  const dOrder = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;
  dOrder.forEach(p => {
    const realRank = sorted.indexOf(p) + 1;
    const def = PLAYER_DEFS.find(d => d.id === p.id) || p;
    const item = document.createElement('div');
    item.className = `fp-item rank-${realRank}`;
    item.innerHTML = `
      <div class="fp-icon">${RANK_ICONS[realRank-1]||''}</div>
      <img class="fp-avatar" src="${def.avatar}" alt="${p.nickname}">
      <div class="fp-nick" style="color:${def.color}">${p.nickname}</div>
      <div class="fp-pts">${p.score}pt</div>
      <div class="fp-block"></div>
    `;
    podium.appendChild(item);
  });

  // full ranking list
  const ranking = document.getElementById('finalRanking');
  ranking.innerHTML = '';
  sorted.forEach((p, i) => {
    const def = PLAYER_DEFS.find(d => d.id === p.id) || p;
    const item = document.createElement('div');
    item.className = 'fr-item';
    item.innerHTML = `
      <div class="fr-rank">${RANK_ICONS[i]||i+1}</div>
      <img class="fr-avatar" src="${def.avatar}" alt="${p.nickname}">
      <div class="fr-info">
        <div class="fr-name" style="color:${def.color}">${p.nickname}</div>
        <div class="fr-nick">${def.name}</div>
      </div>
      <div class="fr-pts">${p.score}pt</div>
    `;
    ranking.appendChild(item);
  });

  document.getElementById('chatworkMsg').textContent = 'Chatworkに結果を送信中...';
  spawnConfetti();

  // 思い出の写真をランダムで背景にちらっと表示
  showMemoryPhoto();

  showScreen('gameover');
}

// ── 思い出の写真演出 ──────────────────────────────────
function showMemoryPhoto() {
  const wrap = document.getElementById('confettiCanvas');
  const src  = MEMORY_PHOTOS[Math.floor(Math.random() * MEMORY_PHOTOS.length)];
  const img  = document.createElement('img');
  img.src = src;
  img.style.cssText = `
    position:absolute; bottom:20px; right:24px;
    width:160px; height:160px; object-fit:cover;
    border-radius:12px; border:3px solid rgba(255,255,255,.2);
    opacity:0; animation:photoFadeIn 1s ease 1s both;
    box-shadow:0 8px 32px rgba(0,0,0,.5);
  `;
  const style = document.createElement('style');
  style.textContent = `@keyframes photoFadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:.85;transform:translateY(0)}}`;
  document.head.appendChild(style);
  wrap.appendChild(img);
}

// ── 紙吹雪 ────────────────────────────────────────────
function spawnConfetti() {
  const wrap   = document.getElementById('confettiCanvas');
  wrap.innerHTML = '';
  const colors = ['#c084fc','#f5c842','#06D6A0','#E91E8C','#00B4D8','#FFB703','#4ade80','#818cf8'];
  for (let i = 0; i < 100; i++) {
    const el = document.createElement('div');
    el.className = 'cf';
    el.style.cssText = `
      left:${Math.random()*100}vw;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*8}px;
      height:${10+Math.random()*12}px;
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${1.5+Math.random()*2.5}s;
      animation-delay:${Math.random()*2}s;
    `;
    wrap.appendChild(el);
  }
}

// ── 画面切替 ──────────────────────────────────────────
const SCREEN_MAP = { lobby:'screen-lobby', countdown:'screen-countdown', game:'screen-game', roundend:'screen-roundend', gameover:'screen-gameover' };
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(SCREEN_MAP[name]);
  if (el) el.classList.add('active');
}

// ── モーダル ──────────────────────────────────────────
function showModal(msg) {
  document.getElementById('modalText').textContent = msg;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
