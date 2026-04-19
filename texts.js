// =====================================================
// 出題テキスト ─ 株式会社日本デザイン版
// display : 画面上部に表示する日本語テキスト
// romaji  : 読み仮名（スペースあり・表示用）
// input   : タイプする文字列（romaji からスペース除去、自動生成）
// long    : true → 50% 確率で出る長文
// ※ 伸ばし棒「ー」は romaji で「-」と表記→ハイフンキーでタイプ
// =====================================================

const PLAYERS = [
  { id: 'abe',      name: '阿部',   nickname: 'ゆきんこ',   color: '#E91E8C' },
  { id: 'hakoyama', name: '箱山',   nickname: 'ほたて',     color: '#00B4D8' },
  { id: 'miwa',     name: '三輪',   nickname: 'みわちゃん', color: '#06D6A0' },
  { id: 'furuta',   name: '古田',   nickname: 'マリメッコ', color: '#FFB703' },
  { id: 'guest',    name: 'ゲスト', nickname: 'ゲスト',     color: '#9CA3AF' },
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

  // ── 会社名・代表 ──────────────────────────────────
  T('日本デザイン',         'nihon dezain',                  '会社名'),
  T('株式会社日本デザイン', 'kabushiki gaisha nihon dezain', '会社名'),
  T('大坪拓摩',             'otsubo takuma',                 '代表'),

  // ── バリュー ──────────────────────────────────────
  T('Life and Work',    'life and work',     'バリュー'),
  T('Be good',          'be good',           'バリュー'),
  T('Human being',      'human being',       'バリュー'),
  T('Improve everyday', 'improve everyday',  'バリュー'),
  T('Effort and Reflect','effort and reflect','バリュー'),
  T('Appreciate each',  'appreciate each',   'バリュー'),
  T('Purposeful',       'purposeful',        'バリュー'),
  T('Be sustainable',   'be sustainable',    'バリュー'),

  // ── 社長の名言（短め）────────────────────────────
  T('アホやね',                         'aho ya ne',                               '社長の名言'),
  T('順調？',                           'junchou',                                 '社長の名言'),
  T('もう一回とかない',                 'mou ikkai toka nai',                      '社長の名言'),
  T('量より質よりスピード',             'ryou yori shitsu yori supi-do',           '社長の名言'),
  T('選ぶ権利はまだない',               'erabu kenri ha mada nai',                 '社長の名言'),
  T('大変って大きく変わる',             'taihen tte okiku kawaru',                 '社長の名言'),
  T('気付いても大抵やらない',           'kizuite mo taitei yaranai',               '社長の名言'),
  T('先輩の現在は後輩の将来',           'senpai no genzai ha kouhai no shourai',   '社長の名言'),
  T('結果出してから言わないとダサい',   'kekka dashite kara iwa naito dasai',      '社長の名言'),
  T('疲れた凡人ならとっくに倒れてる',   'tsukareta bonjin nara tokkuni taoreteru', '社長の名言'),
  T('変人と言われないと世の中変えれない','henjin to iwarenai to yononaka kaerenai','社長の名言'),
  T('生きる力は働く力から',             'ikiru chikara ha hataraku chikara kara',  '社長の名言'),
  T('親はたいてい害でしかない',         'oya ha taitei gai de shika nai',          '社長の名言'),
  T('簡単な算数なのよ',                 'kantan na sansuu na no yo',               '社長の名言'),
  T('クズほどよく食べる',               'kuzu hodo yoku taberu',                   '社長の名言'),
  T('日頃の積み重ね',                   'higoro no tsumikasane',                   '社長の名言'),
  T('普通しないよね',                   'futsuu shi nai yo ne',                    '社長の名言'),
  T('みんな不思議だよね',               'minna fushigi da yo ne',                  '社長の名言'),
  T('難しいこと言ってない',             'muzukashii koto itte nai',                '社長の名言'),
  T('呑気だよねみんなほんと',           'nonki da yo ne minna honto',              '社長の名言'),
  T('本気じゃないって見ればわかる',     'honki ja nai tte mireba wakaru',          '社長の名言'),
  T('言ったこと守れない人が多い',       'itta koto mamorenai hito ga ooi',         '社長の名言'),
  T('読んでないんだろうね',             'yonde nai n darou ne',                    '社長の名言'),
  T('楽な方にみんな行く',               'raku na hou ni minna iku',                '社長の名言'),
  T('生きる強さは働く能力に依存する',   'ikiru tsuyosa ha hataraku nouryoku ni izon suru', '社長の名言'),
  T('誰もが誰かのギブを受けている',     'dare mo ga dare ka no gibu wo ukete iru',  '社長の名言'),
  T('そのギブを自分で止めないこと',     'sono gibu wo jibun de tome nai koto',      '社長の名言'),
  T('強いやつは正しい',                 'tsuyoi yatsu ha tadashii',                 '社長の名言'),
  T('優しい奴が偉い',                   'yasashii yatsu ga erai',                   '社長の名言'),
  T('情熱と冷静の間にベストがある',     'jounetsu to reisei no aida ni besuto ga aru', '社長の名言'),
  T('従わせるのではなく従われる',       'shitagawaseru no de ha naku shitagawareru','社長の名言'),
  T('心が強い奴に心を任せる',           'kokoro ga tsuyoi yatsu ni kokoro wo makaseru', '社長の名言'),

  // ── 長文（long: true）────────────────────────────
  T('日本人の生き方・働き方をより幸せにする',
    'nihon jin no ikikata hatarakikata wo yori shiawase ni suru',
    'ミッション', true),

  T('誰もが生きたいと思う世界 誰もが行きたいと思う未来',
    'dare mo ga ikitai to omou sekai dare mo ga ikitai to omou mirai',
    'ビジョン', true),

  T('働く能力なしに生きる能力なし 生きる力は働く力から生まれる',
    'hataraku nouryoku nashi ni ikiru nouryoku nashi ikiru chikara ha hataraku chikara kara umareru',
    '社長の名言', true),

  T('底辺から俺も始まったからね みんなができないはずがない',
    'teihen kara ore mo hajimatta kara ne minna ga dekinai hazu ga nai',
    '社長の名言', true),

  T('知識だけ取り入れて満足しちゃうからね',
    'chishiki dake toriirete manzoku shichau kara ne',
    '社長の名言', true),

  T('寝ないで文化祭のステージ作ってたからね',
    'nenaide bunkasai no sute-ji tsukutteta kara ne',
    '社長の名言', true),

  T('歯磨きは歯にいいっていうエビデンスひとつもないからね',
    'hamigaki ha ha ni ii tte iu ebidensu hitotsu mo nai kara ne',
    '社長の名言', true),

  T('やりたいとか冗談でも面白くないよね',
    'yaritai toka joudan demo omoshirokunai yo ne',
    '社長の名言', true),

  T('論文とか社会人になってから書かないよね',
    'ronbun toka shakaijin ni natte kara kakanai yo ne',
    '社長の名言', true),


  T('どこまでいきたいかっていう話だよね',
    'doko made ikitai ka tte iu hanashi da yo ne',
    '社長の名言', true),

  T('自分の顔面殴りまくったよね その時は',
    'jibun no ganmen naguri makutta yo ne sono toki ha',
    '社長の名言', true),

  T('子供に選ばれる会社ではなく、大人に選ばれる会社',
    'kodomo ni erabareru kaisha de ha naku otona ni erabareru kaisha',
    '社長の名言', true),

  T('ストレスを感じたとき、ストレスを減らそうと思ってはならない',
    'sutoresu wo kanjita toki sutoresu wo herasou to omotte ha naranai',
    '社長の名言', true),

  T('このギブを貰ったままだとテイカーになってしまう',
    'kono gibu wo moratta mama dato teika- ni natte shimau',
    '社長の名言', true),

  T('どうしたらできるかを考えるのが大人',
    'dou shitara dekiru ka wo kangaeru no ga otona',
    '社長の名言', true),

  T('高め合うパートナーでない限り、そのパートナーは必ずあなたの足を引っ張る',
    'takame au pa-tona- de nai kagiri sono pa-tona- ha kanarazu anata no ashi wo hipparu',
    '社長の名言', true),

  // ── みわちゃんからひろむさんへ ──────────────────
  T('ひろむさんが一緒に成長していこうって言ってくださったこと、とても嬉しかったです',
    'hiromu san ga issho ni seichou shite ikou tte itte kudasatta koto totemo ureshikatta desu',
    '感謝のメッセージ', true),

  T('でもひろむさんみたいな人になりたいので頑張ります',
    'demo hiromu san mitaina hito ni naritai no de ganbarimasu',
    '感謝のメッセージ', true),

  T('ひろむさんと話すと仕事とかそれ以外のことも全部頑張ろうって思う',
    'hiromu san to hanasu to shigoto toka sore igai no koto mo zenbu ganbarou tte omou',
    '感謝のメッセージ', true),

  T('ひろむさんと話して自分の気持ちが前向きに変わって、取り組むことができる',
    'hiromu san to hanashite jibun no kimochi ga maemuki ni kawatte torikumu koto ga dekiru',
    '感謝のメッセージ', true),

  T('いつもひろむさんは気持ちが前向きになるような話し方、接し方をしてくれる',
    'itsumo hiromu san ha kimochi ga maemuki ni naru you na hanashikata sesshikata wo shite kureru',
    '感謝のメッセージ', true),

  T('ひろむさんと話したかっこいい人になれるようがんばります',
    'hiromu san to hanashita kakkoii hito ni nareru you ganbarimasu',
    '感謝のメッセージ', true),

  T('ひろむさんに何かをあげれるような人になりたいです',
    'hiromu san ni nanika wo agereru you na hito ni naritai desu',
    '感謝のメッセージ', true),

  T('こんな良い人っているんだって思う',
    'konna ii hito tte iru n da tte omou',
    '感謝のメッセージ', true),

  T('私が！私が！私が！',
    'watashi ga watashi ga watashi ga',
    '社員キーワード'),
  T('有限会社阿部製麺所',
    'yuugen gaisha abe seimenjo',
    '社員キーワード'),
  T('剣道14年',
    'kendou juuyon nen',
    '社員キーワード'),
  T('ホタテとミスドの二刀流',
    'hotate to misudo no nitouryuu',
    '社員キーワード'),
  T('ワンモア！モアイズ',
    'wan moa moa izu',
    '社員キーワード'),
  T('人生はシャンパンタワー',
    'jinsei ha shanpan tawa-',
    '社員キーワード'),
  T('アルパカ',
    'arupaka',
    '社員キーワード'),

  // ── 大坪さんカルタより（追加分）────────────────────
  T('2度目とかなかったからね みんな幸せだよねぇ',
    'nidome toka nakatta kara ne minna shiawase da yo ne',
    '社長の名言', true),

  T('まあ どうなりたいかだよねぇ',
    'maa dou naritai ka da yo ne',
    '社長の名言'),

  T('目先の感謝とか ありがたいけどねぇ',
    'mesaki no kansha toka arigatai kedo ne',
    '社長の名言'),
];

module.exports = { PLAYERS, TEXTS };
