---
title: スタイルガイド
layout: page
---

# スタイルガイド

このブログの見た目の決まりと、その実物を並べたページです。**同じ役の見た目が2つに割れていないか**を1画面で確かめるために置いています。

決まりの正はリポジトリの [CLAUDE.md](https://github.com/future-architect/future-architect.github.io/blob/main/CLAUDE.md) で、このページはそれを目で確かめる場所です。記事を書くときの記法は [記法ガイド](/specials/markdown/) が担います。

**このページに数字を手で書いていません。** 色の見本・16進数・コントラスト比は `themes/future/css-src/_variables.styl` の変数から、文字の大きさと太さは実際のルールから出しています。変数を変えればこのページの表示もそのまま変わるので、書き写した値が古くなって嘘をつくことがありません。

## 色

黒・灰色は値ではなく**役割**で選びます。段数は「読み手が区別できるか」で決めていて、区別できない差に2つの役割を割り当てないようにしています。以前は `#616161` と `#6e6e6e` が別の役として並んでいましたが、明度差 13/255 では見分けられず、どちらを使うかの判断ができなくなっていました。

### 文字（ink）は3段

3段とも白地でコントラスト比 4.5（WCAG AA）を満たします。`ink-faint` はその条件で置ける最も薄い値で、これより薄くしたいときは文字ではなく別の表現（余白・記号）に変えます。

| | 変数 | 値 | 白地との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-ink-strong"></span> | `ink-strong` | <span class="sg-hex sg-ink-strong"></span> | <span class="sg-ratio sg-ink-strong"></span> | 本文・見出し・リンク |
| <span class="sg-chip sg-ink-mute"></span> | `ink-mute` | <span class="sg-hex sg-ink-mute"></span> | <span class="sg-ratio sg-ink-mute"></span> | 本文に添える属性（日付・著者・タグ・件数・注記）と引用の地の文 |
| <span class="sg-chip sg-ink-faint"></span> | `ink-faint` | <span class="sg-hex sg-ink-faint"></span> | <span class="sg-ratio sg-ink-faint"></span> | 空表示・無効 |

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

上の18個以外にも、`theme-styles.styl` には変数になっていない色が残っています。役があって残しているものと、まだ整理できていないものが混ざっています。

- **役があるもの** — note の4色（色相を持つ地。`code-bg()` がその地から一段濃いインラインコードの地を作る）、表彰・殿堂の淡金、visited リンク、インラインコードの中のリンク色（詳細度の都合で2ファイルに書いている）
- **整理できていないもの** — `--main-font-color`（`summary` の hover の1箇所だけ。`ink` の3段の外にある値）と、`.category-index-desc` / `.pagination-info` の青みのあるグレー（コメントには「メタと同じ従属情報のグレー」と書いてあるのに `ink-mute` ではない）

## 文字

サイズは過去に「どこで最終値が決まるか追えない」ことが原因の不具合を2回出しているため、**1つの要素のサイズは1箇所でしか決めない**という規則にしています。幅によって変える場合もメディアクエリを重ねず `clamp()` で1行にまとめます。

### 大きさ

下の見本は実際のルールをそのまま借りて描いています。**記事タイトルと本文 h2 が同着になっていないか**は、この並びで確かめられます。

<div class="sg-type">
<p class="sg-type-label">記事タイトル・ページ見出し（<code>.article-title</code> / <code>.list-page</code> / <code>.article-entry h1</code>）</p>
<div class="sg-title">見出しはこの大きさで出ます</div>
<p class="sg-type-label">本文見出し h2（節の始まり。直前の空き 56px と罫線を持つ）</p>
<div class="sg-h2">見出しはこの大きさで出ます</div>
<p class="sg-type-label">本文見出し h3（直前の空き 32px）</p>
<div class="sg-h3">見出しはこの大きさで出ます</div>
<p class="sg-type-label">本文見出し h4（直前の空き 24px）</p>
<div class="sg-h4">見出しはこの大きさで出ます</div>
<p class="sg-type-label">本文見出し h5（本文と同じ大きさ。太字であることが見出しの印）</p>
<div class="sg-h5">見出しはこの大きさで出ます</div>
<p class="sg-type-label">本文見出し h6（最下層）</p>
<div class="sg-h6">見出しはこの大きさで出ます</div>
</div>

見出しの階層はサイズだけでなく、**サイズ・太さ・直前の空き・罫線**の4つで作ります。サイズだけで表そうとすると上下が詰まります。避けたいのは同着で、比を大きく取ること自体が目的ではありません。記事タイトルの下限を上げるとモバイルで字数が足りなくなるため、太さ（800 対 700）とページ先頭という位置、h2 側の空きと罫線が階層を支えています。

本文（`p` / `li` / `summary`）・目次・パンくず・脚注・コードブロックの大きさは CLAUDE.md の表が持ちます。

### 太さ

段は3つだけです。中間の段（500 / 600）は置きません。フォント側に該当ウェイトがないとブラウザの合成太字になり、輪郭が濁ります。

| 太さ | 使うところ |
| --- | --- |
| 400 | 本文と、**行として並ぶ記事名**（ランキング・関連記事・参照記事・連載ナビ・記事一覧） |
| 700 | 見出し全般と、カード・パネルの見出し |
| 800 | ページの主題（記事タイトル・ページ見出し） |

13〜14.3px の記事名を太らせると、隣のメタより先に帯全体が重くなります。行の中の主従は「**メタから太字を外す**」側で作ります。

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

フッターのリンクだけは例外で、下線が左から 0.25 秒で伸びます。読者がわざわざ辿り着いた先なので動きを持たせても認知負荷にならない、という判断です。タブの切り替え（0.18 秒）と `details` の開閉は反応ではなく状態の変化なので、それぞれ別の時間を持ちます。

### フォーカスの輪郭

キーボードで辿っている場所の目印は、ネイビー 2px の輪郭1つです。反応（hover）と所在（focus）は別の役なので、**輪郭に差し色を使いません**。

暗い地（フッターとヘッダーの帯）ではネイビーが見えないので、`on-dark-strong` に替えます。白地の入力欄のように地が明るいまま暗い場所に置かれる部品は、色ではなく `outline-offset: -2px` で内側に逃がします。

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
