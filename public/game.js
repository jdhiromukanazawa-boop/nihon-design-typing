'use strict';

// ── 定数 ──────────────────────────────────────────────
const PLAYER_DEFS = [
  { id: 'abe',      name: '阿部',   nickname: 'ゆきんこ',   color: '#E91E8C', avatar: '/avatars/abe.jpg'      },
  { id: 'hakoyama', name: '箱山',   nickname: 'ほたて',     color: '#00B4D8', avatar: '/avatars/hakoyama.jpg' },
  { id: 'miwa',     name: '三輪',   nickname: 'みわちゃん', color: '#06D6A0', avatar: '/avatars/miwa.png'     },
  { id: 'furuta',   name: '古田',   nickname: 'マリメッコ', color: '#FFB703', avatar: '/avatars/furuta.jpg'   },
];

const RANK_ICONS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];

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

// ── 起動 ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildLobby();
  setupSoundToggle();
  setupSpaceStart();
  setupGameScreenFocus();
  connectSocket();
  preloadImages();
});

// ゲーム画面をクリックしたら入力欄にフォーカス（ブラウザが自動フォーカスを
// ブロックした場合でもタイピングできるように）
function setupGameScreenFocus() {
  document.getElementById('screen-game').addEventListener('click', () => {
    const input = document.getElementById('typingInput');
    if (!input.disabled) input.focus();
  });
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
      <img class="avatar-img" src="${p.avatar}" alt="${p.name}" onerror="this.src='/avatars/fallback.png'">
      <div class="p-name">${p.name}</div>
      <div class="p-nick">${p.nickname}</div>
    `;
    card.addEventListener('click', () => selectPlayer(p.id));
    grid.appendChild(card);
  });

  document.getElementById('startBtn').addEventListener('click', requestStart);
}

function selectPlayer(id) {
  if (myPlayer) {
    document.getElementById(`card-${myPlayer.id}`).classList.remove('mine');
  }
  myPlayer = PLAYER_DEFS.find(p => p.id === id);
  document.getElementById(`card-${id}`).classList.add('mine');
  const btn = document.getElementById('startBtn');
  btn.disabled = false;
  document.getElementById('startHint').style.display = 'block';
}

function setupSpaceStart() {
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    if (!document.getElementById('screen-lobby').classList.contains('active')) return;
    e.preventDefault();
    if (myPlayer) requestStart();
  });
}

function requestStart() {
  if (!myPlayer) return;
  ensureAudio();
  document.getElementById('startBtn').disabled = true;
  document.getElementById('startHint').style.display = 'none';
  socket.emit('startGame', { playerId: myPlayer.id });
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
  timeLeft    = currentText.long ? 60 : 30;
  startTime   = Date.now();

  document.getElementById('roundNum').textContent      = idx + 1;
  document.getElementById('maxRound').textContent      = gameTexts.length;
  document.getElementById('catPill').textContent       = currentText.category;
  document.getElementById('displayText').textContent   = currentText.display;
  document.getElementById('displayRomaji').textContent = currentText.romaji || currentText.input;
  document.getElementById('accuracyLabel').textContent = '正確率 —';
  document.getElementById('wpmLabel').textContent      = '— WPM';
  document.getElementById('textResultFlash').style.display = 'none';

  const input = document.getElementById('typingInput');
  input.value    = '';
  input.disabled = false;
  input.focus();
  requestAnimationFrame(() => input.focus()); // カウントダウン後のフォーカスブロック対策
  input.onkeydown = e => { if (e.key === ' ') e.preventDefault(); };
  input.oninput   = onInput;

  renderCharPreview('');
  buildProgressDots(idx, gameTexts.length);
  startTimer();
  showScreen('game');
}

// ── 柔軟ローマ字マッチング ────────────────────────────

function romajiCandidates(exp, pos) {
  const e3 = exp.slice(pos, pos + 3);
  const e2 = exp.slice(pos, pos + 2);
  const e1 = exp[pos];

  // 3文字パターン（長い方から先にチェック）
  const map3 = { chi:['chi','ti'], shi:['shi','si'], tsu:['tsu','tu'],
                 sha:['sha','sya'], shi:['shi','si'], shu:['shu','syu'], sho:['sho','syo'],
                 cha:['cha','tya'], chu:['chu','tyu'], cho:['cho','tyo'],
                 dzu:['dzu','du'] };
  if (map3[e3]) return map3[e3].map(t => [3, t]);

  // 2文字パターン
  const map2 = { fu:['fu','hu'], ji:['ji','zi'] };
  if (map2[e2]) return map2[e2].map(t => [2, t]);

  // 「ん」(n) の処理
  if (e1 === 'n') {
    const next = exp[pos + 1];
    // 次が子音（母音・n・y以外）か末尾 → n でも nn でも OK
    if (!next || !'aiueoyn'.includes(next)) {
      return [[1, 'n'], [1, 'nn']];
    }
    return [[1, 'n']];
  }

  return e1 ? [[1, e1]] : [];
}

function matchRomaji(expected, typed) {
  let ePos = 0, tPos = 0;
  while (ePos < expected.length && tPos < typed.length) {
    const cands = romajiCandidates(expected, ePos);
    let matched = false;
    for (const [eFwd, tSeq] of cands) {
      if (typed.slice(tPos).startsWith(tSeq)) {
        ePos += eFwd; tPos += tSeq.length;
        matched = true; break;
      }
    }
    if (!matched) return { ePos, tPos, error: true, done: false };
  }
  return { ePos, tPos, error: false, done: ePos >= expected.length };
}

// ── 入力処理 ──────────────────────────────────────────
function onInput(e) {
  if (inputDone) return;
  const typed    = e.target.value;
  const expected = currentText.input;

  playTypingSound();

  const { ePos, tPos, error, done } = matchRomaji(expected, typed);

  renderCharPreview(ePos, error);

  const elapsed = (Date.now() - startTime) / 60000;
  const wpm = elapsed > 0 ? Math.round((ePos / 5) / elapsed) : 0;
  const acc = typed.length > 0 ? Math.min(100, Math.round(ePos / typed.length * 100)) : 100;
  document.getElementById('accuracyLabel').textContent = `正確率 ${acc}%`;
  document.getElementById('wpmLabel').textContent      = `${wpm} WPM`;

  if (done) {
    const t    = Date.now() - startTime;
    const fwpm = Math.round((expected.length / 5) / (t / 60000));
    completeText(fwpm, 100, true);
  }
}

// ── テキスト完了 ──────────────────────────────────────
function completeText(wpm, acc, completed) {
  inputDone = true;
  stopTimer();
  const input = document.getElementById('typingInput');
  input.disabled = true;
  input.oninput  = null;

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

  socket.emit('submitScore', { playerId: myPlayer.id, score, avgWpm, avgAccuracy: avgAcc });
  showResult(score, avgWpm, avgAcc);
}

// ── スコアに応じたpic選択 ─────────────────────────────
function picForScore(score) {
  if (score >= 2000) return 10;
  if (score >= 1600) return 9;
  if (score >= 1200) return 8;
  if (score >= 900)  return 7;
  if (score >= 650)  return 6;
  if (score >= 450)  return 5;
  if (score >= 300)  return 4;
  if (score >= 180)  return 3;
  if (score >= 80)   return 2;
  return 1;
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
  picEl.src    = `/avatars/pic${picNum}.jpg`;
  picEl.alt    = `スコアキャラクター lv${picNum}`;

  renderLeaderboard('resultLeaderboard', leaderboard);
  spawnConfetti();
  showScreen('result');

  document.getElementById('replayBtn').onclick = () => {
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startHint').style.display = 'block';
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
    </div>
  `).join('');
}

// ── charプレビュー ────────────────────────────────────
function renderCharPreview(ePos, hasError) {
  const expected = currentText.input;
  let html = '';
  for (let i = 0; i < expected.length; i++) {
    const ch = escHtml(expected[i]);
    if (i < ePos) {
      html += `<span class="ch-ok">${ch}</span>`;
    } else if (i === ePos) {
      html += hasError
        ? `<span class="ch-err">${ch}</span>`
        : `<span class="ch-cursor">${ch}</span>`;
    } else {
      html += `<span class="ch-rest">${ch}</span>`;
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
