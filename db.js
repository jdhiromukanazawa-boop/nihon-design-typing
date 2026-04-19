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

// テーブルが空なら texts.js の初期データを投入
async function initIfEmpty() {
  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if (count > 0) return;

  console.log('[DB] テーブルが空のため初期データを投入します...');
  const rows = TEXTS.map(t => ({
    display:  t.display,
    romaji:   t.romaji,
    input:    t.input,
    category: t.category,
    long:     t.long || false,
  }));
  const { error: insErr } = await supabase.from('questions').insert(rows);
  if (insErr) throw insErr;
  console.log(`[DB] ${rows.length}件 投入完了`);
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

module.exports = { supabase, getQuestions, addQuestion, updateQuestion, deleteQuestion, initIfEmpty, saveScore, getTopScores };
