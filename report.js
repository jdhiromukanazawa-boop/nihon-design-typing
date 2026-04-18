/**
 * 日次Chatworkレポート
 * server.js から require して使います
 */
const fetch = require('node-fetch');

const TOKEN   = process.env.CHATWORK_API_TOKEN;
const ROOM_ID = process.env.CHATWORK_ROOM_ID;

// 大坪社長の癖つよ名言（朝の一言に使用）
const MORNING_QUOTES = [
  '量より質よりスピードだよねぇ〜 — 大坪社長',
  '結果出してから言わないとダサいよね — 大坪社長',
  'もう一回とかないからね — 大坪社長',
  'Improve everyday — 昨日より成長した自分になる',
  '働く能力なしに生きる能力なし。 — 大坪社長',
  '変人とか周りに言われないと、世の中変えれないよねぇ〜 — 大坪社長',
  '気付いても大抵の人はやらないからねぇ — 大坪社長',
  '生きる力は働く力から生まれる。 — 大坪社長',
  'Effort & Reflect — 頑張りを認め合う文化',
  '先輩の現在は、後輩の将来',
  'Be good — 人を支えて支えられる関係',
  '大変って大きく変わるって書くからねぇ〜 — 大坪社長',
  '誰もが生きたいと思う世界。誰もが行きたいと思う未来。',
  '日本人の生き方・働き方をより幸せにし、日本をより良い国にする。',
];

// 今日の日付（日本語）
function todayJP() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

// ランダム名言
function randomQuote() {
  return MORNING_QUOTES[Math.floor(Math.random() * MORNING_QUOTES.length)];
}

// Chatworkに投稿
async function postMessage(body) {
  if (!TOKEN || !ROOM_ID) {
    console.warn('[Report] 環境変数未設定');
    return null;
  }
  try {
    const res = await fetch(`https://api.chatwork.com/v2/rooms/${ROOM_ID}/messages`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `body=${encodeURIComponent(body)}`,
    });
    const json = await res.json();
    console.log(`[Report] 投稿完了 message_id=${json.message_id}`);
    return json;
  } catch (e) {
    console.error('[Report] エラー:', e.message);
    return null;
  }
}

// ── 朝のレポート（9:00）────────────────────────────────
async function morningReport() {
  const msg = [
    `[info][title]🌅 おはようございます！ ${todayJP()}[/title]`,
    `[qt]${randomQuote()}[/qt]`,
    '',
    '今日も一日、楽しく成長しましょう！',
    '',
    '🎹 [b]タイピング大会[/b] は随時開催中！',
    '　→ 社長の名言・会社理念を打ちながら競い合おう',
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── 大会結果レポート（ゲーム終了後・または18:00定時）──
async function resultReport(scoreboard) {
  if (!scoreboard || scoreboard.length === 0) return;
  const medal = ['🥇','🥈','🥉','4️⃣'];
  const lines = scoreboard.map((p, i) =>
    `${medal[i]||'　'} ${i+1}位　${p.nickname}（${p.name}）　${p.score}pt`
  );
  const winner = scoreboard[0];
  const msg = [
    `[info][title]🎹 タイピング大会 結果発表！[/title]`,
    ...lines,
    '',
    `本日の優勝は [b]${winner.nickname}（${winner.name}）[/b] ！おめでとう！🎉`,
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── 夜のサマリー（18:00）─────────────────────────────
async function eveningReport(todayResults) {
  let content;
  if (todayResults && todayResults.length > 0) {
    const medal = ['🥇','🥈','🥉','4️⃣'];
    const lines = todayResults.map((p, i) =>
      `${medal[i]||'　'} ${p.nickname}　${p.score}pt`
    );
    content = [
      '本日の大会結果：',
      ...lines,
    ].join('\n');
  } else {
    content = '本日はまだ大会が行われていません。\n明日もチャレンジしよう！💪';
  }

  const msg = [
    `[info][title]🌆 お疲れ様です！ ${todayJP()}[/title]`,
    content,
    '',
    `[qt]${randomQuote()}[/qt]`,
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

module.exports = { morningReport, resultReport, eveningReport, postMessage };
