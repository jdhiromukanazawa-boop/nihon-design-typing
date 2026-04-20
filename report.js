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

// Chatworkに投稿（[toall] を自動付与）
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
      body: `body=${encodeURIComponent('[toall]\n' + body)}`,
    });
    const json = await res.json();
    console.log(`[Report] 投稿完了 message_id=${json.message_id}`);
    return json;
  } catch (e) {
    console.error('[Report] エラー:', e.message);
    return null;
  }
}

// 約30%の確率でゲスト案内を返す
function maybeGuestTip() {
  if (Math.random() >= 0.3) return '';
  return '\n💡 先輩たちもぜひやってみてね。ゲストでプレイする時は「ゲスト」を選んでね。';
}

// 順位ラベル
function rankLabel(i) {
  return ['🥇','🥈','🥉'][i] || `${i + 1}位`;
}

const GAME_URL = 'https://nihon-design-typing.onrender.com/';

// ── 朝のレポート（8:00）+ 昨日の最終結果 ──────────────
async function morningReport(yesterdayResults) {
  let yesterdaySection;
  if (yesterdayResults && yesterdayResults.length > 0) {
    const lines = yesterdayResults.slice(0, 5).map((p, i) =>
      `${rankLabel(i)}　${p.nickname}（${p.name}）　${p.score}pt`
    );
    const winner = yesterdayResults[0];
    yesterdaySection = [
      '昨日の最終ランキング',
      ...lines,
      '',
      `昨日の優勝は ${winner.nickname}（${winner.name}）！${winner.score}pt 🏆`,
      '今日こそ王座を奪いに行こう！',
    ].join('\n');
  } else {
    yesterdaySection = '昨日のプレイ記録はありません。\n今日が初日！記録を作ろう！🏁';
  }

  const quote = randomQuote();
  const msg = [
    `[info][title]🌅 おはようございます！ ${todayJP()}[/title]`,
    yesterdaySection,
    '[hr]',
    `「${quote}」`,
    '[hr]',
    '今日も一日、楽しく成長しましょう！',
    '',
    `🎹 タイピング大会 随時開催中！`,
    `　→ ${GAME_URL}` + maybeGuestTip(),
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── 大会結果レポート（ゲーム終了後・または18:00定時）──
async function resultReport(scoreboard) {
  if (!scoreboard || scoreboard.length === 0) return;
  const lines = scoreboard.map((p, i) =>
    `${rankLabel(i)}　${p.nickname}（${p.name}）　${p.score}pt`
  );
  const winner = scoreboard[0];
  const msg = [
    `[info][title]🎹 タイピング大会 結果発表！[/title]`,
    ...lines,
    '',
    `本日の優勝は ${winner.nickname}（${winner.name}）！おめでとう！🎉`,
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── 中間速報（10:00・14:00）─────────────────────────
const RALLY_MESSAGES = [
  '🔥 まだまだ逆転できる！今すぐ打ち込んでランキングを塗り替えろ！',
  '⚡ 差はわずか！本気を出せば一気にトップへ行ける！',
  '💥 昨日の自分を超えるチャンス！スコアの更新を狙え！',
  '🎯 指が温まってきた今が勝負！ライバルを追い越せ！',
  '🚀 現在トップのスコアを超えたら伝説入り確定！挑戦しよう！',
  '😤 まだ諦めていない人が最後に笑う！もう一回！',
  '⏰ 時間はまだある！集中して打てば絶対に更新できる！',
];

async function intermediateReport(todayResults) {
  const rally = RALLY_MESSAGES[Math.floor(Math.random() * RALLY_MESSAGES.length)];
  let content;
  if (todayResults && todayResults.length > 0) {
    const lines = todayResults.slice(0, 5).map((p, i) =>
      `${rankLabel(i)}　${p.nickname}（${p.name}）　${p.score}pt`
    );
    content = ['現在のランキング：', ...lines].join('\n');
  } else {
    content = 'まだ誰も挑戦していません。\n最初のプレイヤーになろう！🏆';
  }
  const msg = [
    `[info][title]🎹 タイピング大会 中間速報！ ${todayJP()}[/title]`,
    content,
    '[hr]',
    rally,
    '',
    `▶ 今すぐプレイ → ${GAME_URL}` + maybeGuestTip(),
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── 夜のサマリー（18:00）─────────────────────────────
async function eveningReport(todayResults) {
  let content;
  if (todayResults && todayResults.length > 0) {
    const lines = todayResults.map((p, i) =>
      `${rankLabel(i)}　${p.nickname}（${p.name}）　${p.score}pt`
    );
    content = [
      '本日の大会結果：',
      ...lines,
    ].join('\n');
  } else {
    content = '本日はまだ大会が行われていません。\n明日もチャレンジしよう！💪';
  }

  const quote = randomQuote();
  const msg = [
    `[info][title]🌆 お疲れ様です！ ${todayJP()}[/title]`,
    content,
    '[hr]',
    `「${quote}」`,
    '[hr]',
    `🎹 まだ間に合う！ → ${GAME_URL}` + maybeGuestTip(),
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── 固定プレイヤー ハイスコア更新通知 ────────────────
async function personalBestNotify(entry, prevBest) {
  const isFirst = prevBest === null || prevBest === 0;
  const diff    = isFirst ? '' : `（+${entry.score - prevBest}pt 向上！）`;
  const prevLine = isFirst ? '初記録達成！' : `前の記録：${prevBest}pt`;
  const msg = [
    `[info][title]🔥 ハイスコア更新！ ${entry.nickname}（${entry.name}）[/title]`,
    `${entry.score}pt ${diff}`,
    prevLine,
    `WPM：${entry.avgWpm}　正確率：${entry.avgAccuracy}%`,
    '[hr]',
    `▶ あなたも挑戦 → ${GAME_URL}`,
    '[/info]',
  ].join('\n');
  await postMessage(msg);
}

// ── ランキング変動通知（リアルタイム）─────────────────
async function rankChangeNotify(type, entry, prev, totalCount) {
  let msg;
  if (type === 'first') {
    const prevLine = prev ? `（前の1位：${prev.nickname} ${prev.score}pt）` : '';
    msg = [
      `[info][title]🥇 ランキング1位が更新されました！[/title]`,
      `${entry.nickname}（${entry.name}）が ${entry.score}pt でトップに立った！`,
      prevLine,
      `現在 ${totalCount} 人が参戦中。王座を守れるか？`,
      '[hr]',
      `▶ 今すぐ挑戦 → ${GAME_URL}`,
      '[/info]',
    ].filter(Boolean).join('\n');
  } else {
    const prevLine = prev ? `（前の最下位：${prev.nickname} ${prev.score}pt）` : '';
    msg = [
      `[info][title]🔻 ランキング最下位が更新されました[/title]`,
      `${entry.nickname}（${entry.name}）が ${entry.score}pt で最下位に…`,
      prevLine,
      `全 ${totalCount} 人中 ${totalCount} 位。逆転を狙え！`,
      '[hr]',
      `▶ 今すぐリベンジ → ${GAME_URL}`,
      '[/info]',
    ].filter(Boolean).join('\n');
  }
  await postMessage(msg);
}

module.exports = { morningReport, intermediateReport, resultReport, eveningReport, personalBestNotify, rankChangeNotify, postMessage };
