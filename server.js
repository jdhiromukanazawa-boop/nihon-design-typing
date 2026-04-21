require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { PLAYERS } = require('./texts');
const { getQuestions, addQuestion, updateQuestion, deleteQuestion, initIfEmpty, saveScore, deleteScoreById, getPlayerBest, getTopScores, getTodayScores, getYesterdayScores } = require('./db');
const report = require('./report');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public', { extensions: ['html'] }));
app.use(express.json());

const TEXTS_PER_GAME = 20;
const REPORT_START = new Date('2026-04-20T00:00:00+09:00');
const ADMIN_PASSWORD = 'kanazawa';

// 今日のスコア（毎日0時にリセット）
let dailyRecords = [];
// 問題キャッシュ
let questionsCache = [];

function reportEnabled() {
  return new Date() >= REPORT_START;
}

function pickTexts() {
  const short = questionsCache.filter(t => !t.long);
  const long  = questionsCache.filter(t => t.long);
  const result = [];
  const seen   = new Set();
  let attempts = 0;
  while (result.length < TEXTS_PER_GAME && attempts < 200) {
    attempts++;
    const useLong = Math.random() < 0.5 && long.length > 0;
    const pool = useLong ? long : short;
    if (pool.length === 0) continue;
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (!seen.has(t.input)) { seen.add(t.input); result.push(t); }
  }
  return result;
}

// ── 管理者ミドルウェア ────────────────────────────
function adminAuth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '認証失敗' });
  }
  next();
}

// ── 管理者API ─────────────────────────────────────
app.get('/api/admin/questions', adminAuth, async (req, res) => {
  try {
    const questions = await getQuestions();
    res.json(questions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/questions', adminAuth, async (req, res) => {
  try {
    const { display, romaji, category, long } = req.body;
    if (!display || !romaji || !category) {
      return res.status(400).json({ error: 'display, romaji, category は必須です' });
    }
    const q = await addQuestion({ display, romaji, category, long: !!long });
    questionsCache = await getQuestions();
    res.json(q);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/questions/:id', adminAuth, async (req, res) => {
  try {
    const { display, romaji, category, long } = req.body;
    if (!display || !romaji || !category) {
      return res.status(400).json({ error: 'display, romaji, category は必須です' });
    }
    const q = await updateQuestion(req.params.id, { display, romaji, category, long: !!long });
    questionsCache = await getQuestions();
    res.json(q);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/questions/:id', adminAuth, async (req, res) => {
  try {
    await deleteQuestion(req.params.id);
    questionsCache = await getQuestions();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ランキング管理API
app.get('/api/admin/scores', adminAuth, (req, res) => {
  res.json(dailyRecords);
});

app.delete('/api/admin/scores/:idx', adminAuth, async (req, res) => {
  const idx = parseInt(req.params.idx);
  if (isNaN(idx) || idx < 0 || idx >= dailyRecords.length) {
    return res.status(400).json({ error: '無効なインデックス' });
  }
  const record = dailyRecords[idx];
  dailyRecords.splice(idx, 1);
  io.emit('leaderboardUpdate', dailyRecords);

  // Supabase からも削除
  if (record.id) {
    deleteScoreById(record.id).catch(e => console.error('[Score] DB削除エラー:', e.message));
  }
  res.json({ ok: true });
});

// ── Socket.IO ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`接続: ${socket.id}`);
  socket.emit('leaderboardUpdate', dailyRecords);

  socket.on('startGame', ({ playerId }) => {
    if (!PLAYERS.find(p => p.id === playerId)) return;
    socket.emit('gameData', { texts: pickTexts() });
  });

  socket.on('submitScore', async ({ playerId, nickname: clientNickname, score, avgWpm, avgAccuracy }) => {
    const playerDef = PLAYERS.find(p => p.id === playerId);
    if (!playerDef) return;

    // 保存前に歴代ベストを取得
    let prevBest = null;
    try { prevBest = await getPlayerBest(playerId); } catch (e) { /* 無視 */ }

    // ゲストは固有の名前が必須（デフォルト'ゲスト'・未入力は拒否）
    const customName = (clientNickname && clientNickname.trim() && clientNickname !== 'ゲスト')
      ? clientNickname.trim() : null;
    if (playerId === 'guest' && !customName) {
      console.warn('[Score] ゲストの名前未入力のためスキップ');
      return;
    }
    const nickname = (playerId === 'guest') ? customName : playerDef.nickname;
    const name     = (playerId === 'guest') ? customName : playerDef.name;

    const rounded = {
      playerId,
      name,
      nickname,
      color:       playerDef.color,
      score:       Math.round(score),
      avgWpm:      Math.round(avgWpm),
      avgAccuracy: Math.round(avgAccuracy),
      timestamp:   new Date().toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    };

    // Supabase に保存してIDを取得
    try {
      const dbId = await saveScore(rounded);
      rounded.id = dbId;
    } catch (e) {
      console.error('[Score] 保存エラー:', e.message);
    }

    // ハイスコア判定結果をクライアントに返す
    socket.emit('scoreResult', {
      isNewBest: prevBest === null || rounded.score > prevBest,
      prevScore: prevBest || 0,
      newScore:  rounded.score,
    });

    // 更新前の1位・最下位を記録
    const prevFirst = dailyRecords.length > 0 ? dailyRecords[0] : null;
    const prevLast  = dailyRecords.length > 0 ? dailyRecords[dailyRecords.length - 1] : null;

    dailyRecords.push(rounded);
    dailyRecords.sort((a, b) => b.score - a.score);
    if (dailyRecords.length > 30) dailyRecords = dailyRecords.slice(0, 30);
    io.emit('leaderboardUpdate', dailyRecords);
    console.log(`[Score] ${rounded.nickname} ${rounded.score}pt (${rounded.avgWpm}WPM / ${rounded.avgAccuracy}%)`);

    // 各種Chatwork通知（非同期・エラー無視）
    if (reportEnabled()) {
      const newFirst   = dailyRecords[0];
      const newLast    = dailyRecords[dailyRecords.length - 1];
      const isNewFirst = !prevFirst || newFirst.score > prevFirst.score;
      const isNewLast  = dailyRecords.length > 1 && newLast.score !== (prevLast ? prevLast.score : null) && newLast.playerId === rounded.playerId;
      const isNewBest  = prevBest === null || rounded.score > prevBest;

      // 固定4人のハイスコア更新通知
      if (isNewBest && playerId !== 'guest') {
        report.personalBestNotify(rounded, prevBest).catch(() => {});
      }
      // 1位・最下位変動通知（ハイスコア通知と重複しないよう else で）
      if (!isNewBest || playerId === 'guest') {
        if (isNewFirst) {
          report.rankChangeNotify('first', newFirst, prevFirst, dailyRecords.length).catch(() => {});
        } else if (isNewLast) {
          report.rankChangeNotify('last', newLast, prevLast, dailyRecords.length).catch(() => {});
        }
      }
    }
  });

  socket.on('disconnect', () => console.log(`切断: ${socket.id}`));
});

// 日次リセット（0:00 JST）
cron.schedule('0 0 * * *', () => {
  console.log('[Cron] 日次リセット');
  dailyRecords = [];
  io.emit('leaderboardUpdate', dailyRecords);
}, { timezone: 'Asia/Tokyo' });

// 朝のレポート（8:00 JST）+ 昨日の最終結果
cron.schedule('0 8 * * *', async () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 朝のレポート');
  try {
    const yesterday = await getYesterdayScores();
    await report.morningReport(yesterday);
  } catch (e) {
    console.error('[Cron] 朝のレポートエラー:', e.message);
  }
}, { timezone: 'Asia/Tokyo' });

// 中間速報（10:00 JST）
cron.schedule('0 10 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 中間速報 10:00');
  report.intermediateReport(dailyRecords);
}, { timezone: 'Asia/Tokyo' });

// 中間速報（14:00 JST）
cron.schedule('0 14 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 中間速報 14:00');
  report.intermediateReport(dailyRecords);
}, { timezone: 'Asia/Tokyo' });

// 夕方ランキング（18:00 JST）
cron.schedule('0 18 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 夕方レポート');
  report.eveningReport(dailyRecords);
}, { timezone: 'Asia/Tokyo' });

// ── 起動 ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initIfEmpty();
    questionsCache = await getQuestions();
    console.log(`[DB] ${questionsCache.length}件の問題を読み込みました`);
    dailyRecords = await getTodayScores();
    console.log(`[DB] 本日のスコア ${dailyRecords.length}件 を復元しました`);
  } catch (e) {
    console.error('[DB] 接続エラー:', e.message);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`\n🎹 日本デザイン タイピングゲーム`);
    console.log(`   http://localhost:${PORT} で起動中\n`);
  });
})();
