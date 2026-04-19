require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { PLAYERS } = require('./texts');
const { getQuestions, addQuestion, deleteQuestion, initIfEmpty, saveScore, getTopScores } = require('./db');
const report = require('./report');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const TEXTS_PER_GAME = 20;
const REPORT_START = new Date('2026-04-21T00:00:00+09:00');
const ADMIN_PASSWORD = 'kanazawa';

// 永続スコアキャッシュ（Supabase から取得）
let scoresCache = [];
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

// ── Socket.IO ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`接続: ${socket.id}`);
  socket.emit('leaderboardUpdate', scoresCache);

  socket.on('startGame', ({ playerId }) => {
    if (!PLAYERS.find(p => p.id === playerId)) return;
    socket.emit('gameData', { texts: pickTexts() });
  });

  socket.on('submitScore', async ({ playerId, score, avgWpm, avgAccuracy }) => {
    const playerDef = PLAYERS.find(p => p.id === playerId);
    if (!playerDef) return;

    const rounded = {
      playerId,
      name:        playerDef.name,
      nickname:    playerDef.nickname,
      color:       playerDef.color,
      score:       Math.round(score),
      avgWpm:      Math.round(avgWpm),
      avgAccuracy: Math.round(avgAccuracy),
    };

    try {
      await saveScore(rounded);
      scoresCache = await getTopScores();
      io.emit('leaderboardUpdate', scoresCache);
      console.log(`[Score] ${rounded.nickname} ${rounded.score}pt (${rounded.avgWpm}WPM / ${rounded.avgAccuracy}%)`);
    } catch (e) {
      console.error('[Score] 保存エラー:', e.message);
    }
  });

  socket.on('disconnect', () => console.log(`切断: ${socket.id}`));
});

// 朝の一言（9:00 JST）
cron.schedule('0 9 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 朝のレポート');
  report.morningReport();
}, { timezone: 'Asia/Tokyo' });

// 夕方ランキング（18:00 JST）
cron.schedule('0 18 * * *', () => {
  if (!reportEnabled()) return;
  console.log('[Cron] 夕方レポート');
  report.eveningReport(scoresCache);
}, { timezone: 'Asia/Tokyo' });

// ── 起動 ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initIfEmpty();
    questionsCache = await getQuestions();
    console.log(`[DB] ${questionsCache.length}件の問題を読み込みました`);
    scoresCache = await getTopScores();
    console.log(`[DB] ${scoresCache.length}件のスコアを読み込みました`);
  } catch (e) {
    console.error('[DB] 接続エラー:', e.message);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`\n🎹 日本デザイン タイピングゲーム`);
    console.log(`   http://localhost:${PORT} で起動中\n`);
  });
})();
