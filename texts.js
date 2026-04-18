// =====================================================
// 出題テキスト設定ファイル ─ 株式会社日本デザイン版
// =====================================================

const PLAYERS = [
  { id: 'abe',      name: '阿部',   nickname: 'ゆきんこ',   color: '#E91E8C' },
  { id: 'hakoyama', name: '箱山',   nickname: 'ほたて',     color: '#00B4D8' },
  { id: 'miwa',     name: '三輪',   nickname: 'みわちゃん', color: '#06D6A0' },
  { id: 'furuta',   name: '古田',   nickname: 'マリメッコ', color: '#FFB703' },
];

// ─── 出題テキスト ────────────────────────────────────
// display : 画面に表示するテキスト
// input   : タイピングする文字列（ローマ字）
// category: カテゴリ表示ラベル
// ─────────────────────────────────────────────────────
const TEXTS = [

  // ── ミッション ──────────────────────────────────────
  {
    display: '日本人の生き方・働き方をより幸せにし、日本をより良い国にする。',
    input:   'nihon jin no ikikata hatarakikata wo yori shiawase ni shi nihon wo yori yoi kuni ni suru',
    category: 'ミッション',
  },

  // ── ビジョン ────────────────────────────────────────
  {
    display: '誰もが生きたいと思う世界。誰もが行きたいと思う未来。',
    input:   'dare mo ga ikitai to omou sekai dare mo ga ikitai to omou mirai',
    category: 'ビジョン',
  },

  // ── バリュー ─────────────────────────────────────────
  {
    display: 'Life & Work ─ プライベートとビジネスの両方を満たす',
    input:   'Life and Work puraibeto to bijinesu no ryoho wo mitasu',
    category: 'バリュー',
  },
  {
    display: 'Human being ─ 自ら考えて働ける大人になる',
    input:   'Human being mizukara kangaete hatarakeru otona ni naru',
    category: 'バリュー',
  },
  {
    display: 'Improve everyday ─ 昨日より成長した自分になる',
    input:   'Improve everyday kino yori seichou shita jibun ni naru',
    category: 'バリュー',
  },
  {
    display: 'Effort & Reflect ─ 頑張りを認め合う文化',
    input:   'Effort and Reflect ganbari wo mitomeau bunka',
    category: 'バリュー',
  },
  {
    display: 'Appreciate each ─ 人間性を認め合う',
    input:   'Appreciate each ningensei wo mitomeau',
    category: 'バリュー',
  },
  {
    display: 'Be sustainable ─ 社会的価値を高める',
    input:   'Be sustainable shakaiteki kachi wo takameru',
    category: 'バリュー',
  },

  // ── 会社情報 ────────────────────────────────────────
  {
    display: '株式会社日本デザイン ─ 設立2013年2月18日',
    input:   'kabushiki kaisha nihon dezain setsuritu 2013 nen 2 gatsu 18 nichi',
    category: '会社情報',
  },
  {
    display: '代表取締役 大坪拓摩',
    input:   'daihyo torishimariyaku otsubo takuma',
    category: '会社情報',
  },
  {
    display: '先輩の現在は、後輩の将来',
    input:   'senpai no genzai wa kohai no shorai',
    category: '会社情報',
  },

  // ── 大坪社長の名言（癖つよ選抜） ──────────────────
  {
    display: '子供に選ばれる会社ではなく、大人に選ばれる会社',
    input:   'kodomo ni erabareru kaisha dewa naku otona ni erabareru kaisha',
    category: '社長の名言',
  },
  {
    display: '学生に選ばれる会社ではない。社長に選ばれる会社',
    input:   'gakusei ni erabareru kaisha dewa nai shacho ni erabareru kaisha',
    category: '社長の名言',
  },
  {
    display: '働く能力なしに生きる能力なし。',
    input:   'hataraku noryoku nashi ni ikiru noryoku nashi',
    category: '社長の名言',
  },
  {
    display: '生きる力は働く力から生まれる。',
    input:   'ikiru chikara wa hataraku chikara kara umareru',
    category: '社長の名言',
  },
  {
    display: '量より質よりスピードだよねぇ〜',
    input:   'ryo yori shitsu yori supiido da yo ne',
    category: '社長の名言',
  },
  {
    display: '結果出してから言わないとダサいよね',
    input:   'kekka dashite kara iwa nai to dasai yo ne',
    category: '社長の名言',
  },
  {
    display: '変人とか周りに言われないと、世の中変えれないよねぇ〜',
    input:   'henjin toka mawari ni iware nai to yononaka kaerenai yo ne',
    category: '社長の名言',
  },
  {
    display: '選ぶ権利って実はまだないんだけどね。',
    input:   'erabu kenri tte jitsu wa mada nai nda kedo ne',
    category: '社長の名言',
  },
  {
    display: '疲れた〜凡人だったらとっくに倒れてるよねぇ〜',
    input:   'tsukareta bonjin dattara tokku ni taoreteru yo ne',
    category: '社長の名言',
  },
  {
    display: '気付いても大抵の人はやらないからねぇ',
    input:   'kidzuite mo taitei no hito wa yaranai kara ne',
    category: '社長の名言',
  },
  {
    display: 'もう一回とかないからね',
    input:   'mou ikkai toka nai kara ne',
    category: '社長の名言',
  },
  {
    display: 'アホやね',
    input:   'aho ya ne',
    category: '社長の名言',
  },
  {
    display: '歯磨きは歯にいいっていうエビデンスひとつもないからね',
    input:   'hamigaki wa ha ni ii tte iu ebidensu hitotsu mo nai kara ne',
    category: '社長の名言',
  },
  {
    display: 'クズほどよく食べるからねぇ',
    input:   'kuzu hodo yoku taberu kara ne',
    category: '社長の名言',
  },
  {
    display: '底辺から俺も始まったからね。みんなができないはずがないんだけどね。',
    input:   'teihen kara ore mo hajimatta kara ne minna ga dekinai hazu ga nai nda kedo ne',
    category: '社長の名言',
  },
  {
    display: '大変って大きく変わるって書くからねぇ〜',
    input:   'taihen tte okiku kawaru tte kaku kara ne',
    category: '社長の名言',
  },

  // ── みわちゃんからひろむへ ───────────────────────────
  {
    display: 'ひろむさんが横にいると仕事もそれ以外のことも全部がんばろうって思う。',
    input:   'hiromunasan ga yoko ni iru to shigoto mo sore igai no koto mo zenbu ganbarou tte omou',
    category: 'みわ→ひろむ',
  },
  {
    display: 'ひろむさんと話をして自分の気持ちが前向きに変わって、取り組むことができる。',
    input:   'hiromunasan to hanashi wo shite jibun no kimochi ga maemuki ni kawatte torikumu koto ga dekiru',
    category: 'みわ→ひろむ',
  },
  {
    display: 'ひろむさんみたいな人になりたいので頑張ります。',
    input:   'hiromunasan mitai na hito ni naritai node ganbarimasu',
    category: 'みわ→ひろむ',
  },
  {
    display: 'こんな良い人っているんだっていつも思う。',
    input:   'konna yoi hito tte iru nda tte itsumo omou',
    category: 'みわ→ひろむ',
  },
  {
    display: 'ひろむさんが社長になるための道に必要な時間だったって思えるように、私も成長していきたい。',
    input:   'hiromunasan ga shacho ni naru tame no michi ni hitsuyou na jikan datta tte omoeru you ni watashi mo seichou shite ikitai',
    category: 'みわ→ひろむ',
  },
  {
    display: 'いつでもひろむさんは私の気持ちが前向きになるような話し方、接し方をしてくれる。',
    input:   'itsumo hiromunasan wa watashi no kimochi ga maemuki ni naru you na hanashikata sesshikata wo shite kureru',
    category: 'みわ→ひろむ',
  },
  {
    display: 'ひろむさんに何かをあげられるような人になりたいです。成長していきます。',
    input:   'hiromunasan ni nanika wo agerareru you na hito ni naritai desu seichou shite ikimasu',
    category: 'みわ→ひろむ',
  },
  {
    display: '一緒に成長していこうって言ってくださったこと、とても嬉しかったです。',
    input:   'issho ni seichou shite ikou tte itte kudasatta koto totemo ureshikatta desu',
    category: 'みわ→ひろむ',
  },

];

module.exports = { PLAYERS, TEXTS };
