// =====================================================
// 出題テキスト ─ 株式会社日本デザイン版
// display : 画面上部に表示する日本語テキスト（漢字OK）
// romaji  : 読み仮名/ローマ字（スペースあり・読み用）
// input   : タイピングする文字列（romaji からスペース除去、自動生成）
// long    : true → 低確率（20%）でしか出ない長文
// =====================================================

const PLAYERS = [
  { id: 'abe',      name: '阿部',   nickname: 'ゆきんこ',   color: '#E91E8C' },
  { id: 'hakoyama', name: '箱山',   nickname: 'ほたて',     color: '#00B4D8' },
  { id: 'miwa',     name: '三輪',   nickname: 'みわちゃん', color: '#06D6A0' },
  { id: 'furuta',   name: '古田',   nickname: 'マリメッコ', color: '#FFB703' },
];

function T(display, romaji, category, long = false) {
  return {
    display,
    romaji,
    input: romaji.toLowerCase().replace(/ /g, ''),
    category,
    long,
  };
}

const TEXTS = [

  // ── 会社名・メンバー ──────────────────────────────
  T('日本デザイン',             'nihon dezain',                  '会社名'),
  T('株式会社日本デザイン',     'kabushiki gaisha nihon dezain', '会社名'),
  T('大坪拓摩',                 'otsubo takuma',                 '代表'),
  T('阿部（ゆきんこ）',         'yukinko abe',                   '先輩名'),
  T('箱山（ほたて）',           'hotate hakoyama',               '先輩名'),
  T('三輪（みわちゃん）',       'miwachan miwa',                 '先輩名'),
  T('古田（マリメッコ）',       'marimekko furuta',              '先輩名'),
  T('金澤（ひろむ）',           'hiromu kanazawa',               '先輩名'),

  // ── バリュー ──────────────────────────────────────
  T('Life and Work',            'life and work',                 'バリュー'),
  T('Be good',                  'be good',                       'バリュー'),
  T('Human being',              'human being',                   'バリュー'),
  T('Improve everyday',         'improve everyday',              'バリュー'),
  T('Effort and Reflect',       'effort and reflect',            'バリュー'),
  T('Appreciate each',          'appreciate each',               'バリュー'),
  T('Purposeful',               'purposeful',                    'バリュー'),
  T('Be sustainable',           'be sustainable',                'バリュー'),

  // ── 社長の名言（短め）────────────────────────────
  T('アホやね',                         'aho ya ne',                              '社長の名言'),
  T('もう一回とかない',                 'mou ikkai toka nai',                     '社長の名言'),
  T('量より質よりスピード',             'ryo yori shitsu yori supiido',           '社長の名言'),
  T('選ぶ権利はまだない',               'erabu kenri wa mada nai',               '社長の名言'),
  T('大変って大きく変わる',             'taihen tte okiku kawaru',               '社長の名言'),
  T('気付いても大抵やらない',           'kidzuite mo taitei yaranai',            '社長の名言'),
  T('先輩の現在は後輩の将来',           'senpai no genzai wa kohai no shorai',   '社長の名言'),
  T('結果出してから言わないとダサい',   'kekka dashite kara iwa naito dasai',    '社長の名言'),
  T('疲れた凡人ならとっくに倒れてる',   'tsukareta bonjin nara taoreteru',       '社長の名言'),
  T('変人と言われないと世の中変えれない', 'henjin to iwarenai to yononaka kaerenai', '社長の名言'),
  T('生きる力は働く力から',             'ikiru chikara wa hataraku chikara kara', '社長の名言'),

  // ── みわ→ひろむ（短め）───────────────────────────
  T('ひろむさんみたいな人になりたい',       'hiromunasan mitai ni naritai',           'みわ→ひろむ'),
  T('こんないい人っているんだ',             'konna ii hito tte iru nda',              'みわ→ひろむ'),
  T('一緒に成長していこう',                 'issho ni seichou shite ikou',            'みわ→ひろむ'),
  T('前向きになる話し方',                   'maemuki ni naru hanashikata',            'みわ→ひろむ'),
  T('ひろむさんが横にいると頑張ろうと思う', 'hiromunasan ga yoko ni iru to ganbarou', 'みわ→ひろむ'),

  // ── 長文（long: true → たまにしか出ない）────────
  T('日本人の生き方・働き方をより幸せにする',
    'nihon jin no ikikata hatarakikata wo yori shiawase ni suru',
    'ミッション', true),
  T('誰もが生きたいと思う世界 誰もが行きたいと思う未来',
    'dare mo ga ikitai to omou sekai dare mo ga ikitai to omou mirai',
    'ビジョン', true),
  T('ひろむさんはいつも私の気持ちが前向きになるような話し方をしてくれる',
    'hiromunasan wa itsumo kimochi ga maemuki ni naru you na hanashikata wo shite kureru',
    'みわ→ひろむ', true),
  T('ひろむさんが社長になるために私も成長していきたい',
    'hiromunasan ga shacho ni naru tame ni watashi mo seichou shite ikitai',
    'みわ→ひろむ', true),
  T('働く能力なしに生きる能力なし 生きる力は働く力から生まれる',
    'hataraku noryoku nashi ni ikiru noryoku nashi ikiru chikara wa hataraku chikara kara',
    '社長の名言', true),
];

module.exports = { PLAYERS, TEXTS };
