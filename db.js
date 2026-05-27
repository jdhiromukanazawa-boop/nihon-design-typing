const { createClient } = require('@supabase/supabase-js');
const { TEXTS } = require('./texts');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

async function addQuestion({ display, romaji, category, long = false }) {
  const input = romaji.toLowerCase().replace(/ /g, '');
  const { data, error } = await supabase
    .from('questions')
    .insert([{ display, romaji, input, category, long }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateQuestion(id, { display, romaji, category, long = false }) {
  const input = romaji.toLowerCase().replace(/ /g, '');
  const { data, error } = await supabase
    .from('questions')
    .update({ display, romaji, input, category, long })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteQuestion(id) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// texts.js の内容を DB に同期（新規追加＋既存の romaji/category 修正）
async function initIfEmpty() {
  const existing = await getQuestions();

  if (existing.length === 0) {
    console.log('[DB] テーブルが空のため初期データを投入します...');
    const rows = TEXTS.map(t => ({
      display: t.display, romaji: t.romaji, input: t.input,
      category: t.category, long: t.long || false,
    }));
    const { error: insErr } = await supabase.from('questions').insert(rows);
    if (insErr) throw insErr;
    console.log(`[DB] ${rows.length}件 投入完了`);
    return;
  }

  // 既存データと texts.js を比較して差分を更新
  const existingMap = new Map(existing.map(q => [q.display, q]));
  let updated = 0, added = 0;
  for (const t of TEXTS) {
    const db = existingMap.get(t.display);
    if (!db) {
      await supabase.from('questions').insert([{
        display: t.display, romaji: t.romaji, input: t.input,
        category: t.category, long: t.long || false,
      }]);
      added++;
    } else if (db.romaji !== t.romaji || db.input !== t.input || db.category !== t.category || db.long !== (t.long || false)) {
      await supabase.from('questions').update({
        romaji: t.romaji, input: t.input, category: t.category, long: t.long || false,
      }).eq('id', db.id);
      updated++;
    }
  }
  if (updated > 0 || added > 0)
    console.log(`[DB] 同期完了: ${added}件追加, ${updated}件更新`);
}

async function saveScore({ playerId, name, nickname, color, score, avgWpm, avgAccuracy }) {
  const { data, error } = await supabase
    .from('scores')
    .insert([{ player_id: playerId, name, nickname, color, score, avg_wpm: avgWpm, avg_accuracy: avgAccuracy }])
    .select('id')
    .single();
  if (error) throw error;
  return data.id; // Supabase の行ID を返す
}

// キャラクターの歴代最高スコアを取得（新スコア保存前に呼ぶ）
async function getPlayerBest(playerId) {
  const { data, error } = await supabase
    .from('scores')
    .select('score')
    .eq('player_id', playerId)
    .order('score', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].score : null;
}

async function deleteScoreById(id) {
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function getTopScores(limit = 30) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(r => ({
    id:          r.id,
    playerId:    r.player_id,
    name:        r.name,
    nickname:    r.nickname,
    color:       r.color,
    score:       r.score,
    avgWpm:      r.avg_wpm,
    avgAccuracy: r.avg_accuracy,
    timestamp:   new Date(r.achieved_at).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
  }));
}

// JST の昨日分スコアを取得（朝のレポート用）
async function getYesterdayScores(limit = 30) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstToday = new Date(now.getTime() + jstOffset);
  jstToday.setUTCHours(0, 0, 0, 0);
  const todayStartUtc     = new Date(jstToday.getTime() - jstOffset);
  const yesterdayStartUtc = new Date(todayStartUtc.getTime() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .gte('achieved_at', yesterdayStartUtc.toISOString())
    .lt('achieved_at', todayStartUtc.toISOString())
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(r => ({
    playerId:    r.player_id,
    name:        r.name,
    nickname:    r.nickname,
    score:       r.score,
    avgWpm:      r.avg_wpm,
    avgAccuracy: r.avg_accuracy,
  }));
}

// JST の今日0時以降のスコアを取得（デプロイ後の復元用）
async function getTodayScores(limit = 30) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstToday = new Date(now.getTime() + jstOffset);
  jstToday.setUTCHours(0, 0, 0, 0);
  const todayStartUtc = new Date(jstToday.getTime() - jstOffset);

  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .gte('achieved_at', todayStartUtc.toISOString())
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data
    .filter(r => !(r.player_id === 'guest' && (!r.nickname || r.nickname === 'ゲスト')))
    .map(r => ({
      id:          r.id,
      playerId:    r.player_id,
      name:        r.name,
      nickname:    r.nickname,
      color:       r.color,
      score:       r.score,
      avgWpm:      r.avg_wpm,
      avgAccuracy: r.avg_accuracy,
      timestamp:   new Date(r.achieved_at).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    }));
}

// 指定期間のプレイヤー別ベストスコアTOP10を返す（週次・月次共通）
async function getBestScoresForPeriod(fromUtc, toUtc, limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .gte('achieved_at', fromUtc.toISOString())
    .lt('achieved_at', toUtc.toISOString())
    .order('score', { ascending: false })
    .limit(500); // 期間内を全取得して JS 側で集約
  if (error) throw error;

  // プレイヤー別に最高スコアだけ残す（named: player_id, guest: nickname で識別）
  const bestMap = new Map();
  for (const r of data) {
    const key = r.player_id === 'guest' ? `guest::${r.nickname}` : r.player_id;
    const existing = bestMap.get(key);
    if (!existing || r.score > existing.score) bestMap.set(key, r);
  }

  return [...bestMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => ({
      playerId:    r.player_id,
      name:        r.name,
      nickname:    r.nickname,
      score:       r.score,
      avgWpm:      r.avg_wpm,
      avgAccuracy: r.avg_accuracy,
    }));
}

// JST の今週月曜0時〜次の月曜0時の範囲でベストスコアTOP10
async function getWeeklyBestScores(limit = 10) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstNow = new Date(now.getTime() + jstOffset);
  // 月曜起点（getUTCDay: 0=Sun,1=Mon,...）
  const dayOfWeek = jstNow.getUTCDay(); // JST の曜日
  const daysFromMon = (dayOfWeek + 6) % 7;
  jstNow.setUTCHours(0, 0, 0, 0);
  const jstMonday = new Date(jstNow.getTime() - daysFromMon * 24 * 60 * 60 * 1000);
  const jstNextMon = new Date(jstMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fromUtc = new Date(jstMonday.getTime() - jstOffset);
  const toUtc   = new Date(jstNextMon.getTime() - jstOffset);
  return getBestScoresForPeriod(fromUtc, toUtc, limit);
}

// JST の今月1日0時〜来月1日0時の範囲でベストスコアTOP10
async function getMonthlyBestScores(limit = 10) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstNow = new Date(now.getTime() + jstOffset);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth(); // 0-indexed
  const jstMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const jstNextMonth  = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  const fromUtc = new Date(jstMonthStart.getTime() - jstOffset);
  const toUtc   = new Date(jstNextMonth.getTime() - jstOffset);
  return getBestScoresForPeriod(fromUtc, toUtc, limit);
}

// JST の先月1日0時〜今月1日0時の範囲でベストスコアTOP10（月初に先月分を集計）
async function getPrevMonthBestScores(limit = 10) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const jstNow = new Date(now.getTime() + jstOffset);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth(); // 0-indexed（今月）
  const jstPrevMonthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const jstThisMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const fromUtc = new Date(jstPrevMonthStart.getTime() - jstOffset);
  const toUtc   = new Date(jstThisMonthStart.getTime() - jstOffset);
  return getBestScoresForPeriod(fromUtc, toUtc, limit);
}

module.exports = { supabase, getQuestions, addQuestion, updateQuestion, deleteQuestion, initIfEmpty, saveScore, deleteScoreById, getPlayerBest, getTopScores, getTodayScores, getYesterdayScores, getWeeklyBestScores, getMonthlyBestScores, getPrevMonthBestScores };
