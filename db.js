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
  const { error } = await supabase
    .from('scores')
    .insert([{ player_id: playerId, name, nickname, color, score, avg_wpm: avgWpm, avg_accuracy: avgAccuracy }]);
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

module.exports = { supabase, getQuestions, addQuestion, updateQuestion, deleteQuestion, initIfEmpty, saveScore, getTopScores, getTodayScores };
