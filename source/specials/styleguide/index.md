---
title: スタイルガイド
layout: page
---

# スタイルガイド

このブログの見た目の決まりと、その実物を並べたページです。

記事を書くときの記法は [記法ガイド](/specials/markdown/) が担います。

**このページの数字は手で書いていません。** 色の見本・16進数・コントラスト比、文字の大きさ・太さ・行間、間隔の刻みのどれも、実際にサイトを描いている値をそのまま出しています。片方だけ直したときにページが嘘をつかないようにするためです。

## 色

黒・灰色は値ではなく**役割**で選びます。段数は「読み手が区別できるか」で決めていて、区別できない差に2つの役割を割り当てないようにしています。以前は `#616161` と `#6e6e6e` が別の役として並んでいましたが、明度差 13/255 では見分けられず、どちらを使うかの判断ができなくなっていました。

### 文字（ink）は3段

3段とも白地でコントラスト比 4.5（WCAG AA）を満たします。`ink-faint` はその条件で置ける最も薄い値で、これより薄くしたいときは文字ではなく別の表現（余白・記号）に変えます。

| | 変数 | 値 | 白地との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-ink-strong"></span> | `ink-strong` | <span class="sg-hex sg-ink-strong"></span> | <span class="sg-ratio sg-ink-strong"></span> | 本文・見出し・リンク |
| <span class="sg-chip sg-ink-mute"></span> | `ink-mute` | <span class="sg-hex sg-ink-mute"></span> | <span class="sg-ratio sg-ink-mute"></span> | 本文に添える属性（日付・著者・タグ・件数・注記）と引用の地の文 |
| <span class="sg-chip sg-ink-faint"></span> | `ink-faint` | <span class="sg-hex sg-ink-faint"></span> | <span class="sg-ratio sg-ink-faint"></span> | 空表示・無効と、添えの中でさらに弱くする記号（パンくずの `>`・折りたたみの三角） |

白は段のひとつではなく地の色そのもので、役割を選ぶ余地がないため変数にしていません。

### 罫線（rule）は3段

罫線は「囲うための線」と「切るための線」で役割が違います。枠は形を作るので見え、区切りは読みの邪魔をしない濃さで足ります。ここの比は文字の読みやすさではなく**白地との差の強さ**を表す数字です。

| | 変数 | 値 | 白地との差 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-rule-base"></span> | `rule-base` | <span class="sg-hex sg-rule-base"></span> | <span class="sg-ratio sg-rule-base"></span> | 枠。カード・チップ・箱・画像枠 |
| <span class="sg-chip sg-rule-weak"></span> | `rule-weak` | <span class="sg-hex sg-rule-weak"></span> | <span class="sg-ratio sg-rule-weak"></span> | 区切り。見出しの下・リストの行間 |
| <span class="sg-chip sg-rule-strong"></span> | `rule-strong` | <span class="sg-hex sg-rule-strong"></span> | <span class="sg-ratio sg-rule-strong"></span> | focus / hover でひとつ強める |

見出しの下の罫線が薄いのは意図です。節の区切りは直前の空き（56px）が担っていて、線は「そこに境目がある」と気づかせる程度で足ります。読みやすさの指標ではないので濃くしません。

### 面（surface）は2段

面は白地との差だけで意味を出します。濃くすると上に載る文字のコントラストが動くため、白に近い2段に留めています。

| | 変数 | 値 | 白地との差 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-surface-tint"></span> | `surface-tint` | <span class="sg-hex sg-surface-tint"></span> | <span class="sg-ratio sg-surface-tint"></span> | 静止した面。チップ・タブ帯・表のヘッダ |
| <span class="sg-chip sg-surface-mute"></span> | `surface-mute` | <span class="sg-hex sg-surface-mute"></span> | <span class="sg-ratio sg-surface-mute"></span> | hover / focus の面と、空・無効の面・インラインコードの地 |

### リンクとブランド色

ネイビーは塗り面（フッター）とインタラクション（selection / hover / focus）専用で、**文字色には使いません**。本文の `ink-strong` との比が 1.63 しかなく、文字にすると黒と区別が付かないためです。クリムゾンはコンセプトブックの文法どおり、画面内で同時に1箇所だけの差し色に限定しています。

| | 変数 | 値 | 白地との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-link-blue"></span> | `link-blue` | <span class="sg-hex sg-link-blue"></span> | <span class="sg-ratio sg-link-blue"></span> | リンク（`--a-color`） |
| <span class="sg-chip sg-brand-navy"></span> | `brand-navy` | <span class="sg-hex sg-brand-navy"></span> | <span class="sg-ratio sg-brand-navy"></span> | 塗り面とインタラクション。フッターの地・チップ・ページャの現在地・フォーカスの輪郭 |
| <span class="sg-chip sg-brand-gray"></span> | `brand-gray` | <span class="sg-hex sg-brand-gray"></span> | <span class="sg-ratio sg-brand-gray"></span> | 白地の上で面としてはっきり見せたいところ。小物には広げない |
| <span class="sg-chip sg-brand-crimson"></span> | `brand-crimson` | <span class="sg-hex sg-brand-crimson"></span> | <span class="sg-ratio sg-brand-crimson"></span> | 差し色。フッターの波・ランキング1位・フッターの hover |

ネイビーの比 16.34 は「白文字を載せられる濃さ」を、クリムゾンの 5.35 は「白文字で AA を満たす」ことを表します。どちらも**文字色としての比ではありません**。

### 暗い地の上は別の段

`ink` / `rule` / `surface` は白地の上で決めた値なので、ネイビー地では1つも使えません（`ink-strong` は 1.63 しか出ません）。白地に3段置いたのと同じ考え方で、暗地の上にも段を置いています。比はネイビー地に対する値です。

| | 変数 | 値 | ネイビー地との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip-ground"><span class="sg-chip sg-on-dark-strong"></span></span> | `on-dark-strong` | <span class="sg-hex sg-on-dark-strong"></span> | <span class="sg-ratio sg-on-dark-strong"></span> | 見出し・強調と、暗地でのフォーカスの輪郭 |
| <span class="sg-chip-ground"><span class="sg-chip sg-on-dark"></span></span> | `on-dark` | <span class="sg-hex sg-on-dark"></span> | <span class="sg-ratio sg-on-dark"></span> | リンク・本文 |
| <span class="sg-chip-ground"><span class="sg-chip sg-on-dark-mute"></span></span> | `on-dark-mute` | <span class="sg-hex sg-on-dark-mute"></span> | <span class="sg-ratio sg-on-dark-mute"></span> | 添えの情報 |
| <span class="sg-chip-ground"><span class="sg-chip sg-navy-raised"></span></span> | `navy-raised` | <span class="sg-hex sg-navy-raised"></span> | <span class="sg-ratio sg-navy-raised"></span> | 暗地の上の面 |
| <span class="sg-chip-ground"><span class="sg-chip sg-rule-on-dark"></span></span> | `rule-on-dark` | <span class="sg-hex sg-rule-on-dark"></span> | — | 暗地の上の線 |
| <span class="sg-chip-ground"><span class="sg-chip sg-crimson-on-dark"></span></span> | `crimson-on-dark` | <span class="sg-hex sg-crimson-on-dark"></span> | <span class="sg-ratio sg-crimson-on-dark"></span> | 暗地の上の差し色（線・記号） |

**面と線を同じ値にしません。** 明度だけ上げると彩度が残るので（地も `navy-raised` も彩度 81%）、1px にすると鮮やかな青の筋に見えます。線は白を薄く重ねた `rule-on-dark` を使うと、明るくなると同時に彩度が落ちて（50%）色味が引きます。`rule-on-dark` だけ比が空欄なのは、半透明で明度が確定しないためです。

**差し色は役で分けます。** `brand-crimson` は暗地で 3.06 しかなく線や記号として見えないので、そこには一段明るい `crimson-on-dark` を使います。逆に塗り面は `brand-crimson` のままです（白文字で 5.35。明るい方は 4.51 で余裕がありません）。暗地で「読める差し色」と「白文字を載せられる差し色」は同時に成立しません。

### トークンにない色

上の18個以外にトークンになっていない色は18箇所あり、**どれも役があって残しているもの**です。

- **note の4色** — 色相を持つ地。`code-bg()` がその地から一段濃いインラインコードの地を作ります
- **表彰・殿堂の淡金9箇所** — メダルは灰→銅→金、殿堂のカードは淡金。ブランド色は表彰に広げません
- **リンクの状態色5箇所** — visited と、インラインコードや note の中で地が濃くなるぶん暗くしたリンク色。役はありますがまだトークンになっていません

`ink` / `rule` / `surface` の**段の外にある色はありません**。以前は記事のメタ行が `#555`、畳みの三角が `#767676`、カテゴリの説明とページング情報が青みのあるグレー `#5f6d7b`、ツールチップの点線が `#bbb`、RSS アイコンの hover が純黒というように、段と 1〜17 しか違わない値が7箇所に散っていました。**差が見分けられないのに別の役として置かれていると、どちらを使うかの判断ができなくなります。**

## 文字

サイズは過去に「どこで最終値が決まるか追えない」ことが原因の不具合を2回出しているため、**1つの要素のサイズは1箇所でしか決めない**という規則にしています。幅によって変える場合もメディアクエリを重ねず `clamp()` で1行にまとめます。

### 大きさ

下の見本は実際のルールをそのまま借りて描いています。**記事タイトルと本文 h2 が同着になっていないか**は、この並びで確かめられます。

<div class="sg-type">
<div class="sg-type-label">記事タイトル・ページ見出し（<code>.article-title</code> / <code>.list-page</code> / <code>.article-entry h1</code>）</div>
<div class="sg-title">見出しはこの大きさで出ます</div>
<div class="sg-type-label">本文見出し h2（節の始まり。直前の空き 56px と罫線を持つ）</div>
<div class="sg-h2">見出しはこの大きさで出ます</div>
<div class="sg-type-label">本文見出し h3（直前の空き 32px）</div>
<div class="sg-h3">見出しはこの大きさで出ます</div>
<div class="sg-type-label">本文見出し h4（直前の空き 24px）</div>
<div class="sg-h4">見出しはこの大きさで出ます</div>
<div class="sg-type-label">本文見出し h5（本文と同じ大きさ。太字であることが見出しの印）</div>
<div class="sg-h5">見出しはこの大きさで出ます</div>
<div class="sg-type-label">本文見出し h6（最下層）</div>
<div class="sg-h6">見出しはこの大きさで出ます</div>
</div>

見出しの階層はサイズだけでなく、**サイズ・太さ・直前の空き・罫線**の4つで作ります。サイズだけで表そうとすると上下が詰まります。避けたいのは同着で、比を大きく取ること自体が目的ではありません。記事タイトルの下限を上げるとモバイルで字数が足りなくなるため、太さ（800 対 700）とページ先頭という位置、h2 側の空きと罫線が階層を支えています。

### 行間

段は3つだけです。1つの役に1つの値しか持ちません。下の見本は同じ大きさの文字を3つの段で組んだもので、差は行送りだけです。

<div class="sg-leading sg-leading-heading">
<div class="sg-leading-label">見出し<span class="sg-leading-value"></span></div>
<div class="sg-leading-lines">見出しは1〜2行で終わるので、行を追うための空きは要りません。長い記事タイトルが2行になったときに、上下の行が1つの塊として読める程度に留めます。</div>
</div>

<div class="sg-leading sg-leading-body">
<div class="sg-leading-label">読み下す文章<span class="sg-leading-value"></span></div>
<div class="sg-leading-lines">和文は仮想ボディいっぱいに字が入るので、欧文と同じ行送りでは行が貼り付いて見えます。段落を何行も読み下す場所は、目が次の行の頭へ戻れるところまで開けます。</div>
</div>

<div class="sg-leading sg-leading-row">
<div class="sg-leading-label">行として並ぶもの<span class="sg-leading-value"></span></div>
<div class="sg-leading-lines">一覧の1件・目次・チップ・タブは読み下す対象ではなく、目で拾う対象です。開けるほど帯が縦に伸びて、一度に見える件数が減ります。</div>
</div>

役の割り当ては次のとおりです。

| 段 | 使うところ |
| --- | --- |
| 見出し | 記事タイトル・ページ見出し・本文の h1〜h6・サイト名・カードとパネルの見出し |
| 読み下す文章 | 記事本文・特設ページの本文・note の中・フッターの説明 |
| 行として並ぶもの | 記事一覧・年別一覧・目次・パンくず・ページャ・タグのチップ・タブ・カードの説明・コードブロックの1行 |

**行間を書かないままにしません。** 指定が無いとブラウザやフォントの既定値が効き、環境によって行送りが変わります。実際、以前は本文見出しの h3・h5・h6 とパンくずが指定を持たず、フォント依存の値で描かれていました。

アイコンや順位の丸のように**1行しか入らない小さな箱**では、`line-height` は行間ではなく箱の高さを決める値です。字を丸の中心に置くために 1 を使う場所があり、これは行間の段の外にあります。

### 太さ

段は3つだけです。中間の段（500 / 600）は置きません。フォント側に該当ウェイトがないとブラウザの合成太字になり、輪郭が濁ります。

| 太さ | 使うところ |
| --- | --- |
| 400 | 本文と、**行として並ぶ記事名**（ランキング・関連記事・参照記事・連載ナビ・記事一覧） |
| 700 | 見出し全般と、カード・パネルの見出し |
| 800 | ページの主題（記事タイトル・ページ見出し） |

13〜14.3px の記事名を太らせると、隣のメタより先に帯全体が重くなります。行の中の主従は「**メタから太字を外す**」側で作ります。

## 間隔

**間隔は4の倍数だけを使います。** 上限は決めず、刻みだけを置いています。

<div class="sg-spaces">
<div class="sg-space-item sg-space-1"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-2"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-3"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-4"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-5"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-6"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-7"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-8"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-10"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
<div class="sg-space-item sg-space-12"><span class="sg-space-bar"></span><span class="sg-space-value"></span></div>
</div>

段を数え上げないのは、使う値が並びの間隔だけでも 4〜48px と幅広く、どこで打ち切る理由も無いからです。刻みを4pxに揃えておけば隣の段が必ず 4px 差になり、5px と 6px のように**見分けの付かない差**が生まれません。色を3段に絞ったのと狙いは同じで、迷う余地を減らすためです。

以前は 2 / 3 / 5 / 6 / 10 / 14 / 25px が混ざっていました。多くは「円の直径の半分」「チップの左パディングの分」のようにその場で計算した値で、隣の部品と揃える理由が無いまま1pxずつ違っていました。

## 形と反応

### 角丸は3段

小物・箱・ピル（と円）の3つだけで、中間の段（3 / 5 / 6 / 10px）は置きません。段が増えると「どれを使うか」の判断ができなくなります。

<div class="sg-shapes">
<span class="sg-shape sg-shape-small">小物 4px</span>
<span class="sg-shape sg-shape-card">箱 8px</span>
<span class="sg-shape sg-shape-pill">ピル 999px</span>
</div>

小物はチップ・サムネイル・操作部品、箱はカード・コードブロック・note・`details` です。

### 影は持たない

影は0段です。以前は静止と持ち上がりの2段がありましたが、カードと影の見せ方をやめて「輪郭はなるべく作らない」方針に寄せました。一覧の1件は囲みを持たず間隔だけで分け、**横に並んで箱でないと成立しない部品**（連載・特設パネル / We're hiring / タブ / リンクプレビュー）だけが枠線を持ちます。

**新しい影を足しません。** 1つ足すと「どこに影を使うか」の判断が戻ってきます。

### hover は1部品1反応

同じ「押せる」の合図なので、速さは 0.05 秒の1つだけです。反応は待たせるものではないので短い側に寄せています。0.1 秒だと変化が半分進むのに 29ms かかり、カーソルを乗せて 20ms の時点でまだ3割しか動いていません。0.05 秒なら 15ms で7割動くので、ほぼ即時に見えます。

イージングは触りません。体感を決めているのは秒数だけで、20ms 時点の進捗は ease 30% 対 ease-out 31% とほぼ同じでした。

反応は入れ子のうち**外側だけ**が返します。

| 部品 | 反応 | 実物 |
| --- | --- | --- |
| カード | 中身が一段引く | [トップページ](/)の連載・特設パネル |
| 行 | 面が付く | [トップページ](/)の「よく読まれている記事」 |
| リンク | 下線が付く | このページの本文のリンク |
| チップ | 地が一段変わる | [タグ一覧](/tags/) |
| アイコンだけのリンク | 地が一段変わる（チップと同じ） | [記事ページ](/articles/20260804a/)のシェアボタン |

アイコンだけのリンクにチップと同じ反応を持たせるのは、**下線が引く相手を持たない**からです。絵柄に下線を引いても何も起きたように見えないので、丸い地を持たせてそこを一段変えます。

フッターのリンクだけは例外で、下線が左から 0.25 秒で伸びます。読者がわざわざ辿り着いた先なので動きを持たせても認知負荷にならない、という判断です。タブの切り替え（0.18 秒）と `details` の開閉は反応ではなく状態の変化なので、それぞれ別の時間を持ちます。

### フォーカスの輪郭

キーボードで辿っている場所の目印は、ネイビー 2px の輪郭1つです。反応（hover）と所在（focus）は別の役なので、**輪郭に差し色を使いません**。

暗い地（フッターとヘッダーの帯）ではネイビーが見えないので、`on-dark-strong` に替えます。白地の入力欄のように地が明るいまま暗い場所に置かれる部品は、色ではなく `outline-offset: -2px` で内側に逃がします。

## 状態

部品が「今どうなっているか」は、**新しい色を足さずに、すでにある段の中で1つだけ動かして**表します。動かすのは太さか面のどちらか一方で、両方は動かしません。

### 現在地（active / current）

表し方は2通りあり、**その部品が押す面を持つかどうか**で決まります。文字だけが並ぶ帯では太字にし、丸や箱の的を持つ部品では面を塗ります。帯の中で面を塗ると現在地だけが浮き、的を持つ部品で太字にすると押せる範囲が変わらないので所在が読めません。

<div class="sg-state">
<div class="sg-state-row">
<span class="sg-state-item"><span class="sg-crumb">リンク</span><span class="sg-state-label">素</span></span>
<span class="sg-state-item"><span class="sg-crumb sg-crumb-hover">hover 中のリンク</span><span class="sg-state-label">下線</span></span>
<span class="sg-state-item"><span class="sg-crumb sg-crumb-current">現在地</span><span class="sg-state-label">太字</span></span>
</div>
</div>

パンくずの帯がこの形です。3つが同じ色のまま**素・下線・太字**で見分けられます。**色は動かしません。** 14px の帯の中で色と太さを同時に動かすと、現在地だけが黒く浮いて見えます。

| 部品 | 表し方 | 実物 |
| --- | --- | --- |
| パンくず | 太字 | [すべての記事](/articles/) の2ページ目 |
| サイドバーのカテゴリ | 太字 | [Programming カテゴリ](/categories/Programming/) |
| ページャ | 現在のページだけネイビーの丸で塗る。省略の「…」は塗らない | [すべての記事](/articles/) の2ページ目 |
| タブ | 本体と同じ白地になり、上辺にネイビーの線が1本入る。塗りにすると中身より目立つ | [トップページ](/) |

現在地は**リンクにしません**。押しても同じ場所に来るリンクは、行き先を辿るときに空振りになります。目で見る読者・支援技術・機械の3方向に同じ違いを渡すため、太字と併せて `aria-current="page"` を付けます。

### 無効・空（disabled）

このサイトには押せなくなるボタンやフォームがありません。代わりに「まだ無い」「もう押せない」を表す形が3つあります。

| かたち | 表し方 | 実物 |
| --- | --- | --- |
| 中身が無い | 文字は `ink-faint`、面は `surface-mute`。枠と大きさは中身があるときと同じに保ち、場所だけ空けておく | [すべての記事](/articles/) の投稿が無い月、[連載一覧](/series/) のサムネイルが無い連載 |
| 押せない | リンクにせず、hover にも応えない。手の形のカーソルが出る部品では `cursor` を既定の矢印に戻す | [すべての記事](/articles/) の投稿が無い月、ページャの「…」 |
| 押す対象ではない添え | 押せる部品の**外**に出す。シェア数はボタンの下に置き、押せる範囲と数字が別だと位置で示す | [記事ページ](/articles/20260804a/) のシェア数 |

**歯抜けを詰めません。** 投稿が無い月を一覧から落とすと、無いのか見落としなのかが読者に区別できません。同じ大きさの空き枠を置いて、無いことを見えるようにします。

`ink-faint` は白地でコントラスト比 4.5 を満たす最も薄い文字色です。**これより薄くしません。** 「無効だから読めなくてよい」ではなく、無効な項目も何であるかは読める必要があります。

## 部品

同じ見た目のものは同じ部品を使います。新しいクラスを足す前にここを探してください。呼び出し元の多い順です。

| 部品 | 呼び出し元 | 役 | 実物 |
| --- | --- | --- | --- |
| `_partial/section-heading` | 19 | 節見出しの共通形。アンカー付き | [タグ一覧](/tags/) |
| `_partial/breadcrumb` | 17 | パンくず。道筋だけを出し、現在地は h1 に任せる | [カテゴリ一覧](/categories/) |
| `_partial/svg-icon` | 15 | インラインSVGアイコン。絵柄の辞書を1箇所で持つ | [カテゴリ一覧](/categories/) |
| `_partial/sidebar` | 12 | サイドバー。目次・カテゴリ・枠の出し分けを持つ | [記事ページ](/articles/20260804a/) |
| `_partial/category-icon` | 8 | カテゴリ名からアイコンを引く | [カテゴリ一覧](/categories/) |
| `_partial/post-panel-grid` | 5 | 記事の3列カード | [HACK TO THE FUTURE](/specials/httf/) |
| `_partial/pagination-info` | 4 | 「N件中 M〜K件」 | [すべての記事](/articles/) の2ページ目 |
| `_partial/tab-hint` | 4 | タブが矢印キーで切り替えられることを名乗る | [トップページ](/) |
| `_partial/award-medal` | 3 | 表彰のメダル | [著者一覧](/authors/) |

クラスで共有しているものは次のとおりです。

| クラス | 役 | 実物 |
| --- | --- | --- |
| `summary-panel` / `summary` | ページ冒頭の統計 | [カテゴリ一覧](/categories/) |
| `article-card` / `panel-*` | 一覧の1件とパネルの中身 | [トップページ](/) |
| `series-panels` | パネルの3列グリッド | [連載一覧](/series/) |
| `tag-list` / `tag-list-link` | タグのチップ | [タグ一覧](/tags/) |
| `tabs` / `tab_item` / `tab_content` | CSS だけのタブ。radio をフォーカス対象にする | [トップページ](/) |
| `scroll` / `cell-list` / `cell-nowrap` / `cell-mark` | 表の受け皿とセル | [アドベントカレンダー](/specials/advent-calendar/) |
| `sr-only` | 目で見えないが読み上げられる文 | 外部リンクの「（外部サイト）」 |
| `more-link` | 枠の下の「すべての◯◯を見る」 | [トップページ](/) |
| `specials-text` | 特設ページの地の文（`.article-entry` の外で本文サイズを出す） | [HACK TO THE FUTURE](/specials/httf/) |

### note

4色あり、地は色相を持ちます。中のインラインコードの地は `code-bg()` が「地より一段濃い同じ色」として作るので、4色でも表のヘッダでも同じ規則が効きます。書き方は[記法ガイド](/specials/markdown/)にあります。

::: note tip
`tip` の地です。知っておくと得をすることに使います。
:::

::: note info
`info` の地です。読み進めるうえで知っておいてほしいことに使います。
:::

::: note warn
`warn` の地です。気をつけないと困ることに使います。
:::

::: note alert
`alert` の地です。踏むと壊れることに使います。
:::

### 表

ヘッダに地色（`surface-tint`）を敷き、本文行は白で揃えます。全セルの罫線が行を追う役を果たしているので、縞は入れません。横に溢れる表は `.scroll` が受けます。

| 列 | 列 | 列 |
| --- | --- | --- |
| セル | セル | セル |
| セル | セル | セル |

### チップ

タグは静止時は `surface-tint` の地で、hover でネイビーに変わります。件数は文字ではなく添えなので `ink-mute` です。実物は[タグ一覧](/tags/)にあります。
