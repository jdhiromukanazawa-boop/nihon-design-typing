require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const cron = require('node-cron');
const { PLAYERS, TEXTS } = require('./texts');
const report = require('./report');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// ─── ゲーム状態 ───────────────────────────────────────
const MAX_ROUNDS = 5;

let state = createInitialState();

function createInitialState() {
  return {
    status: 'lobby',       // lobby | countdown | playing | roundEnd | gameEnd
    players: {},           // socketId → { id, name, nickname, color, score, ready }
    round: 0,
    textQueue: shuffleTexts(),
    currentText: null,
    roundResults: [],      // 今ラウンドの完了順
    countdownTimer: null,
    roundTimer: null,
  };
}

function shuffleTexts() {
  return [...TEXTS].sort(() => Math.random() - 0.5);
}

// ─── Socket.io ────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`接続: ${socket.id}`);

  // ロビー参加
  socket.on('join', ({ playerId }) => {
    const playerDef = PLAYERS.find(p => p.id === playerId);
    if (!playerDef) return;

    // 同キャラが既に参加中なら弾く
    const alreadyJoined = Object.values(state.players).find(p => p.id === playerId);
    if (alreadyJoined) {
      socket.emit('joinError', 'そのキャラクターはすでに参加中です');
      return;
    }

    state.players[socket.id] = {
      ...playerDef,
      score: 0,
      ready: false,
      finished: false,
      progress: 0,
    };

    broadcastPlayerList();
    socket.emit('joinSuccess', { player: state.players[socket.id] });

    // ゲーム中に途中参加した場合、現在状態を送る
    if (state.status === 'playing' || state.status === 'roundEnd') {
      socket.emit('latejoin', {
        round: state.round,
        maxRounds: MAX_ROUNDS,
        text: state.currentText,
        status: state.status,
        scores: getScoreBoard(),
      });
    }
  });

  // 準備完了トグル
  socket.on('toggleReady', () => {
    if (!state.players[socket.id]) return;
    state.players[socket.id].ready = !state.players[socket.id].ready;
    broadcastPlayerList();
    checkAllReady();
  });

  // タイピング進捗
  socket.on('progress', ({ chars }) => {
    if (!state.players[socket.id]) return;
    state.players[socket.id].progress = chars;
    io.emit('progressUpdate', {
      socketId: socket.id,
      playerId: state.players[socket.id].id,
      chars,
    });
  });

  // ラウンド完了
  socket.on('complete', ({ accuracy, time }) => {
    if (!state.players[socket.id]) return;
    if (state.players[socket.id].finished) return;
    if (state.status !== 'playing') return;

    state.players[socket.id].finished = true;
    const rank = state.roundResults.length + 1;
    state.roundResults.push({
      socketId: socket.id,
      playerId: state.players[socket.id].id,
      name: state.players[socket.id].name,
      nickname: state.players[socket.id].nickname,
      color: state.players[socket.id].color,
      rank,
      accuracy: Math.round(accuracy),
      time: Math.round(time),
    });

    // 全員完了 or タイムアウト後に呼ばれる
    checkRoundComplete();
  });

  // 切断
  socket.on('disconnect', () => {
    console.log(`切断: ${socket.id}`);
    if (state.players[socket.id]) {
      delete state.players[socket.id];
      broadcastPlayerList();
    }
  });
});

// ─── ゲームロジック ───────────────────────────────────

function checkAllReady() {
  const players = Object.values(state.players);
  if (players.length < 1) return;
  if (players.length > 0 && players.every(p => p.ready) && state.status === 'lobby') {
    startCountdown();
  }
}

function startCountdown() {
  state.status = 'countdown';
  let count = 3;
  io.emit('countdown', { count });

  state.countdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      io.emit('countdown', { count });
    } else {
      clearInterval(state.countdownTimer);
      startRound();
    }
  }, 1000);
}

function startRound() {
  state.round++;
  state.status = 'playing';
  state.roundResults = [];

  // テキスト選択
  if (state.textQueue.length === 0) state.textQueue = shuffleTexts();
  state.currentText = state.textQueue.pop();

  // 全プレイヤーのラウンド状態リセット
  Object.values(state.players).forEach(p => {
    p.finished = false;
    p.progress = 0;
    p.ready = false;
  });

  io.emit('roundStart', {
    round: state.round,
    maxRounds: MAX_ROUNDS,
    text: state.currentText,
  });

  // 60秒タイムアウト
  state.roundTimer = setTimeout(() => {
    if (state.status === 'playing') endRound();
  }, 60000);
}

function checkRoundComplete() {
  const players = Object.values(state.players);
  if (players.length === 0) return;
  if (players.every(p => p.finished) && state.status === 'playing') {
    endRound();
  }
}

function endRound() {
  if (state.roundTimer) clearTimeout(state.roundTimer);
  state.status = 'roundEnd';

  // 未完了のプレイヤーを末尾に追加
  const finishedIds = state.roundResults.map(r => r.socketId);
  Object.entries(state.players).forEach(([sid, p]) => {
    if (!finishedIds.includes(sid)) {
      state.roundResults.push({
        socketId: sid,
        playerId: p.id,
        name: p.name,
        nickname: p.nickname,
        color: p.color,
        rank: state.roundResults.length + 1,
        accuracy: 0,
        time: 60000,
        dnf: true,
      });
    }
  });

  // スコア加算（1位:4pt 2位:3pt 3位:2pt 4位:1pt）
  const rankPts = [4, 3, 2, 1];
  state.roundResults.forEach((r, i) => {
    if (!r.dnf) {
      const bonus = Math.round(r.accuracy / 20); // 正確さボーナス（最大5pt）
      const pts = (rankPts[i] || 0) + bonus;
      if (state.players[r.socketId]) {
        state.players[r.socketId].score += pts;
        r.pointsEarned = pts;
      }
    } else {
      r.pointsEarned = 0;
    }
  });

  io.emit('roundEnd', {
    round: state.round,
    maxRounds: MAX_ROUNDS,
    results: state.roundResults,
    scoreboard: getScoreBoard(),
  });

  // 最終ラウンド後はゲーム終了
  setTimeout(() => {
    if (state.round >= MAX_ROUNDS) {
      endGame();
    } else {
      // 次ラウンド準備
      state.status = 'lobby';
      Object.values(state.players).forEach(p => { p.ready = false; });
      broadcastPlayerList();
      io.emit('waitNextRound');
    }
  }, 5000);
}

function endGame() {
  state.status = 'gameEnd';
  const final = getScoreBoard();
  io.emit('gameEnd', { scoreboard: final });
  postToChatwork(final);
  if (reportEnabled()) report.resultReport(final);
  setTimeout(resetGame, 30000);
}

function resetGame() {
  state = createInitialState();
  io.emit('gameReset');
}

function getScoreBoard() {
  return Object.values(state.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

function broadcastPlayerList() {
  io.emit('playerList', {
    players: Object.entries(state.players).map(([sid, p]) => ({
      socketId: sid,
      ...p,
    })),
    status: state.status,
  });
}

// ─── Chatwork通知 ─────────────────────────────────────
async function postToChatwork(scoreboard) {
  const token = process.env.CHATWORK_API_TOKEN;
  const roomId = process.env.CHATWORK_ROOM_ID;

  if (!token || !roomId) {
    console.log('[Chatwork] 環境変数未設定のためスキップ');
    return;
  }

  const medal = ['🥇', '🥈', '🥉', '4️⃣'];
  const lines = scoreboard.map((p, i) =>
    `${medal[i] || '　'} ${p.rank}位　${p.nickname}（${p.name}）　${p.score}pt`
  );

  const message = [
    '[info][title]🎹 日本デザイン タイピング大会 結果発表！[/title]',
    ...lines,
    '',
    `おめでとう！ ${scoreboard[0].nickname}（${scoreboard[0].name}）の優勝です！🎉`,
    '[/info]',
  ].join('\n');

  try {
    const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `body=${encodeURIComponent(message)}`,
    });
    const json = await res.json();
    console.log('[Chatwork] 送信完了:', json);
    io.emit('chatworkSent', { success: true });
  } catch (e) {
    console.error('[Chatwork] エラー:', e.message);
    io.emit('chatworkSent', { success: false });
  }
}

// ─── 定時Chatworkレポート（4/21以降） ────────────────
// 通知開始日: 2026-04-21
const REPORT_START = new Date('2026-04-21T00:00:00+09:00');

function reportEnabled() {
  return new Date() >= REPORT_START;
}

// 毎朝9:00（JST） 朝の一言レポート
cron.schedule('0 9 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 朝のレポート送信');
  report.morningReport();
}, { timezone: 'Asia/Tokyo' });

// 毎夕18:00（JST） 夜のサマリーレポート
cron.schedule('0 18 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 夕方のレポート送信');
  const todayScores = Object.values(state.players).length > 0
    ? getScoreBoard()
    : [];
  report.eveningReport(todayScores);
}, { timezone: 'Asia/Tokyo' });

// ─── サーバー起動 ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎹 日本デザイン タイピングゲーム`);
  console.log(`   http://localhost:${PORT} で起動中`);
  console.log(`   Chatworkレポート開始日: 2026-04-21（毎朝9:00・毎夕18:00）\n`);
});
