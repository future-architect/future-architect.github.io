---
title: スタイルガイド
description: "フューチャー技術ブログの見た目の決まりと、その実物を並べたページです。色・文字の大きさ・行間・間隔・形・部品の段階を、実際の値とコントラスト比つきで見られます。"
layout: page
career: true
---

# スタイルガイド

このブログの見た目の決まりと、その実物を並べたページです。

記事を書くときの記法は [記法ガイド](/specials/markdown/) が担います。

## 色

黒・灰色は値ではなく**役割**で選びます。段階の数は「読み手が区別できるか」で決めていて、区別できない差に2つの役割を割り当てません。目安は明度差で、13/255 ほどしか違わない2色は見分けられないので、同じ色と見なしてどちらかの段階に寄せます。

### 文字（ink）は3段階

3段階とも白背景でコントラスト比 4.5（WCAG AA）を満たします。`ink-faint` はその条件で置ける最も薄い値で、これより薄くしたいときは文字ではなく別の表現（余白・記号）に変えます。

| <span class="sr-only">見本</span> | 変数 | 値 | 白背景との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-ink-strong"></span> | `ink-strong` | <span class="sg-hex sg-ink-strong"></span> | <span class="sg-ratio sg-ink-strong"></span> | 本文・見出し・リンク |
| <span class="sg-chip sg-ink-mute"></span> | `ink-mute` | <span class="sg-hex sg-ink-mute"></span> | <span class="sg-ratio sg-ink-mute"></span> | 本文に添える補助情報（日付・著者・タグ・件数・注記）と引用の本文 |
| <span class="sg-chip sg-ink-faint"></span> | `ink-faint` | <span class="sg-hex sg-ink-faint"></span> | <span class="sg-ratio sg-ink-faint"></span> | 空表示・無効と、補助情報の中でさらに弱くするもの（パンくずの `>`・折りたたみの三角・統計の内訳と枠の名前） |

白はスケールの1段階ではなく背景の色そのもので、役割を選ぶ余地がありません。

### 罫線（rule）は3段階

罫線は「囲うための線」と「切るための線」で役割が違います。枠は形を作るので見え、区切りは読みの邪魔をしない濃さで足ります。ここの比は文字の読みやすさではなく**白背景との差の強さ**を表す数字です。

| <span class="sr-only">見本</span> | 変数 | 値 | 白背景との差 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-rule-base"></span> | `rule-base` | <span class="sg-hex sg-rule-base"></span> | <span class="sg-ratio sg-rule-base"></span> | 枠。カード・チップ・箱・画像枠と、塊の左に引くバー（引用・内訳） |
| <span class="sg-chip sg-rule-weak"></span> | `rule-weak` | <span class="sg-hex sg-rule-weak"></span> | <span class="sg-ratio sg-rule-weak"></span> | 区切り。見出しの下・リストの行間 |
| <span class="sg-chip sg-rule-strong"></span> | `rule-strong` | <span class="sg-hex sg-rule-strong"></span> | <span class="sg-ratio sg-rule-strong"></span> | 地を持たない部品の枠（チップ・表）と、focus / hover でひとつ強めるところ（タブの hover の下線もここ） |

見出しの下の罫線が薄いのは意図です。節の区切りは直前の空き（56px）が担っていて、線は「そこに境目がある」と気づかせる程度で足ります。読みやすさの指標ではないので濃くしません。

### 面（surface）は2段階

面は白背景との差だけで意味を出します。濃くすると上に載る文字のコントラストが動くため、白に近い2段階に留めています。

| <span class="sr-only">見本</span> | 変数 | 値 | 白背景との差 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-surface-tint"></span> | `surface-tint` | <span class="sg-hex sg-surface-tint"></span> | <span class="sg-ratio sg-surface-tint"></span> | 静止した面。表のヘッダ・本文末の帯・検索窓 |
| <span class="sg-chip sg-surface-mute"></span> | `surface-mute` | <span class="sg-hex sg-surface-mute"></span> | <span class="sg-ratio sg-surface-mute"></span> | hover / focus の面と、空・無効の面・インラインコードの背景 |

### 本文のリンクは下線を持つ。色は背景に合わせて替える

**色だけでリンクを名乗りません。** 色が見えない読者には、青い文字も紫の文字も隣の黒い文字とほぼ同じ濃さに見えます。白背景で AA を保ったまま本文の文字と 3:1 を作れる色は存在しないので、リンクであることは**下線**が示し、色はそれに添えます。静止して下線が付くのは本文・箇条書き・表のセルの中のリンクで、見出しのアンカーや記事への入口の中のリンクには付きません（カードと記事の行はカーソルを乗せたときだけタイトルに下線が出ます）。

リンクは**背景が濃くなるぶん暗い側へ振った段階**を持ちます。`link-blue` は白背景で AA を満たしますが、インラインコードの背景や note の色の付いた背景に乗ると下回るため、同系色のまま暗くした値に替えます。訪問済みは紫で、こちらは白背景でもコードの背景でも足ります。

比を取る背景が3種類あるので、下の表は**それぞれの背景に対する比**です。note は4色あるので、そのうち**いちばん厳しい背景との比**を載せています（AA を満たすかはそこで決まります）。

| <span class="sr-only">見本</span> | 変数 | 値 | 背景 | 背景との比 | 使うところ |
| --- | --- | --- | --- | --- | --- |
| <span class="sg-chip sg-link-blue"></span> | `link-blue` | <span class="sg-hex sg-link-blue"></span> | 白 | <span class="sg-ratio sg-link-blue"></span> | 読み物の中のリンク（`--a-color`） |
| <span class="sg-chip sg-link-visited"></span> | `link-visited` | <span class="sg-hex sg-link-visited"></span> | 白 | <span class="sg-ratio sg-link-visited"></span> | 訪問済み。インラインコードの中でも同じ値 |
| <span class="sg-chip-ground sg-chip-tint"><span class="sg-chip sg-link-on-tint"></span></span> | `link-on-tint` | <span class="sg-hex sg-link-on-tint"></span> | インラインコードの背景 | <span class="sg-ratio sg-link-on-tint"></span> | インラインコードの中のリンク |
| <span class="sg-chip-ground sg-chip-note"><span class="sg-chip sg-link-on-note"></span></span> | `link-on-note` | <span class="sg-hex sg-link-on-note"></span> | note の4色 | <span class="sg-ratio sg-link-on-note"></span> | note の中のリンク |
| <span class="sg-chip-ground sg-chip-note"><span class="sg-chip sg-link-on-note-visited"></span></span> | `link-on-note-visited` | <span class="sg-hex sg-link-on-note-visited"></span> | note の4色 | <span class="sg-ratio sg-link-on-note-visited"></span> | note の中の訪問済み |

**青は読み物の中のリンクの色です。** レイアウトの導線（「連載一覧へ」のような全件への行き先、パンくず、日付、著者名）には青を使わず、文字のスケールの `ink-mute` に置いて、反応で `ink-strong` に1段階濃くします。同じページで本文のリンクと導線が同じ青だと、どちらが読み物の続きなのかが見分けられません。

**全件への行き先には末尾に `>` を置きます。** 色を青から `ink-mute` に落としたぶん、静止した状態ではリンクだと分かる手がかりが色から消えます。文言（「◯◯一覧へ」）と記号の2つで行き先を名乗り、反応では下線が付きます。記号を使うのはこの導線だけで、装飾として他の場所には置きません。

大きさは置かれ方で決まります。**単独の行として置くとき**（サイドバー・記事末の連載ナビ）は「行として並ぶもの」のスケール、**カードの中に入るとき**（トップページの特集・著者紹介）は**そのカードの説明文と同じ大きさ**です。カードの中でいちばん弱い情報が、その上の説明より大きくなると、まとまりが崩れて見えます。箱によって説明文の大きさが違うので、導線の大きさも箱ごとに変わります。

### 選択されると色が消えるので、下線だけが残る

テキストを選択すると、ブラウザは選択範囲の文字も下線も**選択の文字色1色で塗り直します**。リンクの色は残りません。下線に色を指定しても残りません。**選択中にリンクを名乗れるのは下線だけ**で、ひとつ上の「色だけで名乗らない」がそのまま効いてきます。

<p class="specials-text">前の文 <span class="sg-selected">選択中のリンク</span> 後ろの文</p>

このとき、下線は**選択の帯に収まっていないと見えません**。帯からはみ出した線は背景と同じ色で描かれて消えます。帯の高さは行間で決まるので、いちばん低いのは行間の狭いところ——表のセルです。

そのため**本文のリンクの下線の位置は、見た目の好みではなくこの制約で決めています**（いま <span class="sg-underline-offset"></span>）。記事への入口にカーソルを乗せたときに出る下線も同じ位置です。

**ブラウザの描画に決められる値は、スケールに乗せずに理由を添えて置きます。** 間隔の4の倍数にも文字の大きさのスケールにも属さない値なので、理由が無いと根拠のない値に見えます。この種の値を増やすときは、まず本当に描画の制約なのか——好みで選べる値ではないのか——を確かめます。

### ブランド色

ネイビーは塗り面（フッター）とインタラクション（selection / hover / focus）専用で、**文字色には使いません**。本文の `ink-strong` との比が 1.63 しかなく、文字にすると黒と区別が付かないためです。例外は2つの形だけです。1つは**ネイビーの図形とひと組で読ませる小さな文字**で、タブに出る「← → で切り替え」は同時に出るフォーカスリングと同じ色にして1つの信号として読ませ、シェア数はボタンの丸と、著者名は頭文字の丸と1組に見せます。もう1つは、**文字がそのページの面そのものになっている 404 の数字**です。読み下す文章に混ざる文字には使いません。クリムゾンはコンセプトブックの文法どおり、画面内で同時に1箇所だけの差し色に限定しています。

| <span class="sr-only">見本</span> | 変数 | 値 | 白背景との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip sg-brand-navy"></span> | `brand-navy` | <span class="sg-hex sg-brand-navy"></span> | <span class="sg-ratio sg-brand-navy"></span> | 塗り面とインタラクション。フッターの背景・チップ・ページャの現在地・フォーカスリング・テキスト選択の帯 |
| <span class="sg-chip sg-brand-gray"></span> | `brand-gray` | <span class="sg-hex sg-brand-gray"></span> | <span class="sg-ratio sg-brand-gray"></span> | 白背景の上で面としてはっきり見せたいところ。小さな部品には広げない |
| <span class="sg-chip sg-brand-crimson"></span> | `brand-crimson` | <span class="sg-hex sg-brand-crimson"></span> | <span class="sg-ratio sg-brand-crimson"></span> | 差し色。フッターの波・ランキング1位・フッターの hover |

ネイビーの比 16.34 は「白文字を載せられる濃さ」を、クリムゾンの 5.35 は「白文字で AA を満たす」ことを表します。どちらも**文字色としての比ではありません**。

### 暗い背景の上は別のスケール

`ink` / `rule` / `surface` は白背景の上で決めた値なので、ネイビー背景では1つも使えません（`ink-strong` は 1.63 しか出ません）。白背景に3段階置いたのと同じ考え方で、暗い背景の上にもスケールを置いています。比はネイビー背景に対する値です。

| <span class="sr-only">見本</span> | 変数 | 値 | ネイビー背景との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip-ground"><span class="sg-chip sg-on-dark-strong"></span></span> | `on-dark-strong` | <span class="sg-hex sg-on-dark-strong"></span> | <span class="sg-ratio sg-on-dark-strong"></span> | 見出し・強調と、暗い背景でのフォーカスリング |
| <span class="sg-chip-ground"><span class="sg-chip sg-on-dark"></span></span> | `on-dark` | <span class="sg-hex sg-on-dark"></span> | <span class="sg-ratio sg-on-dark"></span> | リンク・本文 |
| <span class="sg-chip-ground"><span class="sg-chip sg-on-dark-mute"></span></span> | `on-dark-mute` | <span class="sg-hex sg-on-dark-mute"></span> | <span class="sg-ratio sg-on-dark-mute"></span> | 補助情報 |
| <span class="sg-chip-ground"><span class="sg-chip sg-navy-raised"></span></span> | `navy-raised` | <span class="sg-hex sg-navy-raised"></span> | <span class="sg-ratio sg-navy-raised"></span> | 暗い背景の上の面 |
| <span class="sg-chip-ground"><span class="sg-chip sg-rule-on-dark"></span></span> | `rule-on-dark` | <span class="sg-hex sg-rule-on-dark"></span> | — | 暗い背景の上の線 |
| <span class="sg-chip-ground"><span class="sg-chip sg-crimson-on-dark"></span></span> | `crimson-on-dark` | <span class="sg-hex sg-crimson-on-dark"></span> | <span class="sg-ratio sg-crimson-on-dark"></span> | 暗い背景の上の差し色（線・記号） |

**面と線を同じ値にしません。** 明度だけ上げると彩度が残るので（背景も `navy-raised` も彩度 81%）、1px にすると鮮やかな青の筋に見えます。線は白を薄く重ねた `rule-on-dark` を使うと、明るくなると同時に彩度が落ちて（50%）色味が引きます。`rule-on-dark` だけ比が空欄なのは、半透明で明度が確定しないためです。

**差し色は役割で分けます。** `brand-crimson` は暗い背景で 3.06 しかなく線や記号として見えないので、そこには1段階明るい `crimson-on-dark` を使います。逆に塗り面は `brand-crimson` のままです（白文字で 5.35。明るい方は 4.51 で余裕がありません）。暗い背景で「読める差し色」と「白文字を載せられる差し色」は同時に成立しません。

### ダークモードのスケール

表示テーマは3つあります。**端末の設定に従う**のが既定で、ヘッダーのボタンで**明るい**・**暗い**を選べます。2つの切り替えにすると「端末は暗いがこのサイトは明るく読みたい」を表せず、そこから端末の設定へ戻る道も無くなるため、3つ持っています。

暗いほうのスケールは、明るいほうと**同じ役割の並び**を別の値で作ったものです。背景は色味を持たせず無彩色に寄せています。上の「暗い背景の上のスケール」はフッターのネイビー背景の上でだけ使うもので、彩度があるぶんページ全体の背景には重すぎます。

比はページの背景（`dark-surface-base`）に対する値です。

| <span class="sr-only">見本</span> | 変数 | 値 | 背景との比 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-ink-strong"></span></span> | `ink-strong` | <span class="sg-hex sg-dark-ink-strong"></span> | <span class="sg-ratio sg-dark-ink-strong"></span> | 本文・見出し・リンク |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-ink-mute"></span></span> | `ink-mute` | <span class="sg-hex sg-dark-ink-mute"></span> | <span class="sg-ratio sg-dark-ink-mute"></span> | 補助情報（日付・著者・タグ・件数・注記） |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-ink-faint"></span></span> | `ink-faint` | <span class="sg-hex sg-dark-ink-faint"></span> | <span class="sg-ratio sg-dark-ink-faint"></span> | 空表示・無効と、補助情報の中でさらに弱くする記号 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-rule-base"></span></span> | `rule-base` | <span class="sg-hex sg-dark-rule-base"></span> | <span class="sg-ratio sg-dark-rule-base"></span> | 枠。カード・チップ・箱・画像枠 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-rule-weak"></span></span> | `rule-weak` | <span class="sg-hex sg-dark-rule-weak"></span> | <span class="sg-ratio sg-dark-rule-weak"></span> | 区切り。見出しの下・リストの行間 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-rule-strong"></span></span> | `rule-strong` | <span class="sg-hex sg-dark-rule-strong"></span> | <span class="sg-ratio sg-dark-rule-strong"></span> | 地を持たない部品の枠と、focus / hover でひとつ強めるところ |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-surface-base"></span></span> | `surface-base` | <span class="sg-hex sg-dark-surface-base"></span> | <span class="sg-ratio sg-dark-surface-base"></span> | ページと部品の背景 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-surface-tint"></span></span> | `surface-tint` | <span class="sg-hex sg-dark-surface-tint"></span> | <span class="sg-ratio sg-dark-surface-tint"></span> | 静止した面 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-surface-mute"></span></span> | `surface-mute` | <span class="sg-hex sg-dark-surface-mute"></span> | <span class="sg-ratio sg-dark-surface-mute"></span> | 反応した面・インラインコードの背景 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-navy"></span></span> | `brand-navy` | <span class="sg-hex sg-dark-navy"></span> | <span class="sg-ratio sg-dark-navy"></span> | フッターの帯 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-selection"></span></span> | `selection-bg` | <span class="sg-hex sg-dark-selection"></span> | <span class="sg-ratio sg-dark-selection"></span> | テキスト選択の帯。文字は `surface-base` |

**`ink-faint` は明るいほうと同じく「AA を満たす最も薄い段階」です。** 上の表の比はページの背景に対する値ですが、実際にいちばん厳しいのはインラインコードの背景で、そこでも AA を満たす値にしています。これより薄くしません。

**ブランドのネイビーは、暗い背景では背景とほとんど見分けが付きません。** 面に使っても線に使っても消えるので、フッターの帯は1段階暗い値にして色味だけ残し、選択中のページ・選択中のタブの下線・共有ボタン・タグの hover・フォーカスリングは明るい線と明るい塗りに置き換えています。

**テキスト選択の帯は向きを逆にします。** 明るいほうは濃いネイビーの帯に白い文字ですが、暗い背景ではネイビーを中間まで明るくしても、帯として見える前に白い文字が AA を割ります。そこでネイビーを薄くした帯にして、文字を背景の色で描きます。色相はブランドのまま、彩度は半分に落としています（そのままだと蛍光の紫青になります）。無彩色の帯にすると反転表示のように見えて、ブランドの色味が消えます。コードブロックの背景は両方のテーマで暗いので、明るいほうでもこの帯を使います。

**同じコントラスト比でも、明るい面は暗い面より膨らんで見えます。** 白背景の濃い丸をそのまま反転すると暗い背景では浮きます。同じ強さを移すのではなく、その部品が担う役割から決めます。所在や反応の印は明るいまま、装飾は1段階落とします。

#### リンク

背景が3種類あるので、明るいほうと同じく分けて測ります。

| <span class="sr-only">見本</span> | 変数 | 値 | 比 | 背景 |
| --- | --- | --- | --- | --- |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-link-blue"></span></span> | `link-blue` | <span class="sg-hex sg-dark-link-blue"></span> | <span class="sg-ratio sg-dark-link-blue"></span> | ページの背景 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-link-visited"></span></span> | `link-visited` | <span class="sg-hex sg-dark-link-visited"></span> | <span class="sg-ratio sg-dark-link-visited"></span> | ページの背景（訪問済み） |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-link-on-tint"></span></span> | `link-on-tint` | <span class="sg-hex sg-dark-link-on-tint"></span> | <span class="sg-ratio sg-dark-link-on-tint"></span> | インラインコードの背景 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-link-on-note"></span></span> | `link-on-note` | <span class="sg-hex sg-dark-link-on-note"></span> | <span class="sg-ratio sg-dark-link-on-note"></span> | note の4色（いちばん厳しい背景） |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-link-on-note-visited"></span></span> | `link-on-note-visited` | <span class="sg-hex sg-dark-link-on-note-visited"></span> | <span class="sg-ratio sg-dark-link-on-note-visited"></span> | note の4色（訪問済み） |

#### 背景に色が付いた面

**背景だけ明るいまま残すと、中の文字がテーマ側に付いていって沈みます。** note の4色と表彰の淡い金は、背景ごと暗くしています。ページの背景との差は、面のスケールより1段階上に取っています。上の表の `surface-mute` と見比べると、帯として1つの塊に見える程度に離れているのが分かります。

| <span class="sr-only">見本</span> | 変数 | 値 | 背景との差 | 使うところ |
| --- | --- | --- | --- | --- |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-note-tip-bg"></span></span> | `note-tip-bg` | <span class="sg-hex sg-dark-note-tip-bg"></span> | <span class="sg-ratio sg-dark-note-tip-bg"></span> | note tip |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-note-info-bg"></span></span> | `note-info-bg` | <span class="sg-hex sg-dark-note-info-bg"></span> | <span class="sg-ratio sg-dark-note-info-bg"></span> | note info |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-note-warn-bg"></span></span> | `note-warn-bg` | <span class="sg-hex sg-dark-note-warn-bg"></span> | <span class="sg-ratio sg-dark-note-warn-bg"></span> | note warn |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-note-alert-bg"></span></span> | `note-alert-bg` | <span class="sg-hex sg-dark-note-alert-bg"></span> | <span class="sg-ratio sg-dark-note-alert-bg"></span> | note alert |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-award-card-from"></span></span> | `award-card-from` | <span class="sg-hex sg-dark-award-card-from"></span> | <span class="sg-ratio sg-dark-award-card-from"></span> | 殿堂カードのグラデーション（明るいほうの端） |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-award-card-to"></span></span> | `award-card-to` | <span class="sg-hex sg-dark-award-card-to"></span> | <span class="sg-ratio sg-dark-award-card-to"></span> | 同（暗いほうの端） |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-award-card-rule"></span></span> | `award-card-rule` | <span class="sg-hex sg-dark-award-card-rule"></span> | <span class="sg-ratio sg-dark-award-card-rule"></span> | 同・枠 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-award-gold-on-tint"></span></span> | `award-gold-on-tint` | <span class="sg-hex sg-dark-award-gold-on-tint"></span> | <span class="sg-ratio sg-dark-award-gold-on-tint"></span> | 淡い金の上の金 |
| <span class="sg-chip-ground-dark"><span class="sg-chip sg-dark-award-bronze"></span></span> | `award-bronze` | <span class="sg-hex sg-dark-award-bronze"></span> | <span class="sg-ratio sg-dark-award-bronze"></span> | 2回目のメダル |

**「背景より1段階濃い」は、暗い背景では「1段階明るい」になります。** note の中のインラインコードと表の見出しは、明るいほうでは背景から計算して1段階濃くしていますが、暗いほうは持ち上げる向きが逆になるので値を直接持っています。

### トークンにない色

上のスケールの外に残っている色は2種類で、**どちらも役割があって残しているもの**です。

- **note の4色** — 色相を持つ背景。中のインラインコードの背景は、その背景より1段階濃い同じ色になります
- **表彰・殿堂の淡金** — メダルは灰→銅→金、殿堂のカードは淡金。ブランド色は表彰に広げません

どちらもテーマで入れ替わります（上のダークモードのスケールを参照）。

`ink` / `rule` / `surface` の**スケールの外にある色はありません**。**段階と数しか違わない色を別の役割として置くと、どちらを使うかの判断ができなくなります。** 新しい色を入れるときは、まず近い段階との差を見て寄せられないかを確かめます。

## 文字

### 大きさ

**記事タイトルと本文 h2 が同着になっていないか**は、下の並びで確かめられます。

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

**部品の大きさは7つの段から選びます。** 値ではなく役で選べるように、段に名前が付いています。

<div class="sg-sizes">
<div class="sg-size sg-size-meta">
<div class="sg-size-label">添え・注記・件数・小ラベル<span class="sg-size-value"></span></div>
<div class="sg-size-sample">メタ行・パネルの説明・タグの件数。読者の行動を変えない数字と、部品の名前</div>
</div>
<div class="sg-size sg-size-base">
<div class="sg-size-label">土台<span class="sg-size-value"></span></div>
<div class="sg-size-sample">ページ全体の既定値。コードブロックの1行もこの大きさです</div>
</div>
<div class="sg-size sg-size-row">
<div class="sg-size-label">行として並ぶもの<span class="sg-size-value"></span></div>
<div class="sg-size-sample">ナビ・目次・パンくず・全件への導線。読み下す対象ではなく、目で拾う対象です</div>
</div>
<div class="sg-size sg-size-body">
<div class="sg-size-label">読み下す文章<span class="sg-size-value"></span></div>
<div class="sg-size-sample">記事本文・特設ページの本文・記事の概要文・カードの題。段落を何行も追う場所です</div>
</div>
<div class="sg-size sg-size-lead">
<div class="sg-size-label">サイト名・サイドバーの見出し<span class="sg-size-value"></span></div>
<div class="sg-size-sample">枠の名前</div>
</div>
<div class="sg-size sg-size-title">
<div class="sg-size-label">見出し・ロゴ<span class="sg-size-value"></span></div>
<div class="sg-size-sample">一覧カードの記事名</div>
</div>
<div class="sg-size sg-size-display">
<div class="sg-size-label">大見出し<span class="sg-size-value"></span></div>
<div class="sg-size-sample">節の始まり</div>
</div>
</div>

段の外にあるのは3つだけです。**記事タイトル**は幅で変わるので `clamp` で持ちます。**404 ページの数字**は1箇所でしか使わない一点ものです。**行き先の名前に添える総数**は、いちばん下の段でも名前と 1px しか違わず名前の一部に見えるので、段より小さく置きます。タグのチップの件数もこの総数と同じ役なので、同じ値です。

**見分けの付かない差に2つの役を割り当てません。** 新しい部品の大きさを決めるときは、まず近い段との差を見て寄せられないかを確かめます。1px 未満しか違わない2つの値は、読者には同じ大きさに見えます。

上の**本文見出し h2〜h6 は段の外**です。あちらは互いの比が階層を作る列なので、土台の大きさに追従する必要があります。

見出しの階層はサイズだけでなく、**サイズ・太さ・直前の空き・罫線**の4つで作ります。サイズだけで表そうとすると上下が詰まります。避けたいのは同着で、比を大きく取ること自体が目的ではありません。記事タイトルの下限を上げるとモバイルで字数が足りなくなるため、太さ（800 対 700）とページ先頭という位置、h2 側の空きと罫線が階層を支えています。

### 行間

段階は3つだけです。1つの役割に1つの値しか持ちません。下の見本は同じ大きさの文字を3つの段階で組んだもので、差は行送りだけです。

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

役割の割り当ては次のとおりです。

| 段階 | 使うところ |
| --- | --- |
| 見出し | 記事タイトル・ページ見出し・本文の h1〜h6・サイト名・カードとパネルの見出し |
| 読み下す文章 | 記事本文・特設ページの本文・note の中・フッターの説明 |
| 行として並ぶもの | 記事一覧・年別一覧・目次・パンくず・ページャ・タグのチップ・タブ・カードの説明・コードブロックの1行 |

アイコンや順位の丸のように**1行しか入らない小さな箱**では、`line-height` は行間ではなく箱の高さを決める値です。字を丸の中心に置くために 1 を使う場所があり、これは行間のスケールの外にあります。

### 太さ

段階は3つだけです。中間の段階（500 / 600）は置きません。フォント側に該当ウェイトがないとブラウザの合成太字になり、輪郭が濁ります。

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

段階を数え上げないのは、使う値が並びの間隔だけでも 4〜48px と幅広く、どこで打ち切る理由も無いからです。刻みを4pxに揃えておけば隣の段階が必ず 4px 差になり、5px と 6px のように**見分けの付かない差**が生まれません。色を3段階に絞ったのと狙いは同じで、迷う余地を減らすためです。

## 形と反応

### 角丸は3段階

小さな部品・箱・ピル（チップの形。円も同じ値）の3つだけで、中間の段階（3 / 5 / 6 / 10px）は置きません。段階が増えると「どれを使うか」の判断ができなくなります。

<div class="sg-shapes">
<span class="sg-shape sg-shape-small">小さな部品 4px</span>
<span class="sg-shape sg-shape-card">箱 8px</span>
<span class="sg-shape sg-shape-pill">ピル 999px</span>
</div>

小さな部品はチップ・サムネイル・操作部品、箱はカード・コードブロック・note・`details` です。

**チップは枠だけで作り、地を持ちません。** 地を敷いても白背景との差が 1.09 しか出ず、形を作っているのは枠の方だからです。そのぶん枠は `rule-base` ではなく `rule-strong` を使います（白背景との差が 1.36 から 1.61 になります）。

### 影は持たない

影は1段階も持ちません。**読み物を並べる場所では輪郭をなるべく作りません。** 記事へ送るカードは囲みを持たず、1件のまとまりは**外の空きが中の空きより十分大きいこと**が作ります。[連載一覧](/series/)や特設ページのパネルは、隣の列との間が 48px で、サムネイルと文字の間（12px）の4倍です。枠線を持つのは**強調のために枚数を絞った枠**（[トップページ](/)の「特集」）と、リンクプレビューだけです。タブも枠を持たず、切り替わる範囲は帯の下辺の線が示します。操作部品（検索窓・ドロップダウン）と、中身をまとめて囲む枠（統計・折りたたみ・年月のカード）はこの範囲の外です。枠がその部品の範囲そのものを作っているので、外すと境目が読めなくなります。

### hover は1部品1反応

同じ「押せる」の合図なので、速さは 0.05 秒の1つだけです。反応は待たせるものではないので短い側に寄せています。0.1 秒だと変化が半分進むのに 29ms かかり、カーソルを乗せて 20ms の時点でまだ3割しか動いていません。0.05 秒なら 15ms で7割動くので、ほぼ即時に見えます。

イージングは触りません。体感を決めているのは秒数だけで、20ms 時点の進捗は ease 30% 対 ease-out 31% とほぼ同じでした。

反応は入れ子のうち**外側だけ**が返します。

| 部品 | 反応 | 実物 |
| --- | --- | --- |
| 記事への入口（カード・行） | タイトルに下線が付き、画像が1段階引く | [トップページ](/)の連載・特設パネルと「よく読まれている記事」 |
| ナビゲーションの行 | 面が付く | サイドバーのカテゴリ・タグ、ヘッダーのドロップダウン |
| 本文のリンク | 下線が1段階太くなる | このページの本文のリンク |
| そのほかの裸のリンク | 下線が付く | パンくず・日付・著者名 |
| チップ | 背景が1段階変わる | [タグ一覧](/tags/) |
| アイコンだけのリンク | 背景が1段階変わる（チップと同じ） | [記事ページ](/articles/20260804a/)のシェアボタン |

アイコンだけのリンクにチップと同じ反応を持たせるのは、**下線が引く相手を持たない**からです。絵柄に下線を引いても何も起きたように見えないので、丸い背景を持たせてそこを1段階変えます。

**下線と背景は同時に動きません。** 背景が変わる部品（ナビゲーションの行・チップ・アイコンだけのリンク）では下線を出さず、下線が付くのは背景を持たない部品です。本文のリンクのほか、パンくず・日付・著者名・カテゴリ名・タグクラウド・「すべての連載を見る」のような全件への導線、そして記事への入口のタイトルがこれにあたります。どちらか一方しか動かないので、部品ごとにどちらだったかを覚える必要がありません。

記事への入口が下線側なのは、**背景も囲みも持たないから**です。以前は中身の色を1段階落として返していましたが、その差は 1.62:1 しかなく、反応が起きたことを読み取れませんでした。状態は前後を並べて比べられないので、同時に見える2色の判別より大きい差が要ります。文字色を濃くする方向はもう無い（`ink-strong` が最も濃い段階）ため、色ではなく下線に替えています。

**カードでも行でも反応は同じです。** 記事一覧のカードと「よく読まれている記事」の行は、どちらもサムネイル・タイトル・年月の組で、同じ「記事1本への入口」です。形が違うだけで反応が変わると、読者からは同じものが場所によって別の動きをすることになります。当たる範囲は行のほうが広く、行のどこを押しても記事へ飛びますが、**反応は行き先を名乗るタイトルと画像に出します**。押せる範囲より反応が狭いぶんには、押しても何も起きないという裏切りは起きません。本文末の帯にある We're hiring も、カードの形の1行き先としてここに入ります。

**反応が出るのは、記事へ行くリンク——サムネイルとタイトル——を指している間だけです。** 記事一覧のカードには日付・著者・カテゴリ・シェアボタンという別の行き先も並んでいて、カードに乗っていること自体を合図にすると、そこを指している間もカードが「この記事へ行く」と名乗ってしまいます。カーソルの真下にあるのは別の行き先なので、両方が同時に名乗ると押した先が読めません。

**この線引きは、指している瞬間だけを止める形では引けません。** 別の行き先どうしの間には隙間があり、メタ情報の項目の間で 28px、シェアボタンの丸の間で 12px あります。そこで反応が戻ると、メタ情報の上を1回なぞるだけで6回以上ついたり消えたりして点滅に見えます。カードの中の余白は連続した1つの面ではなく、行き先と行き先の隙間なので、余白での反応は誘いとして働くより先にノイズになります。

背景で返すのは**ナビゲーションの行**です。サイドバーの軸やヘッダーのドロップダウンのように、メニューの項目が縦に並ぶ場所では、行の背景が変わるのが通り相場です。読み物の中に置いた記事の入口は、ここから外れます。

ヘッダーの帯の中だけは、下線も背景も動かさず文字色を1段階濃くします（帯から下がるドロップダウンの行は背景が変わります）。

フッターのリンクだけは例外で、下線が左から 0.25 秒で伸びます。読者がわざわざ辿り着いた先なので動きを持たせても認知負荷にならない、という判断です。**開閉・展開は反応ではなく状態の変化**なので、別の時間を持ちます。タブの切り替え、ドロップダウンと引き出しの開閉、検索窓の拡張、折りたたみの開閉がこれで、いずれも hover より長い側（0.12〜0.2 秒）に置きます。変わったことが読み取れるまで動きが続く必要があるからです。

### フォーカスリング

キーボードで辿っている場所の目印は、ネイビー 2px のフォーカスリング1つです。反応（hover）と所在（focus）は別の役割なので、**フォーカスリングに差し色を使いません**。

**リングは所在だけを示すので、反応は反応で別に返します。** 記事への入口・目次・年月のカードは、キーボードで行き先を名乗るリンクに来たときにも、カーソルを乗せたときと同じ反応（タイトルの下線・画像の引き・面）を出します。リングだけにするとキーボードで辿る読者だけが「押せばこの記事へ行く」という合図を受け取れません。ヘッダーの帯の中だけは例外で、64px の帯に下線を重ねると合図が2つになるためリングだけにしています。

暗い背景（フッターとヘッダーの帯）ではネイビーが見えないので、`on-dark-strong` に替えます。白背景の入力欄のように背景が明るいまま暗い場所に置かれる部品は、色ではなく `outline-offset: -2px` で内側に逃がします。

## 状態

部品が「今どうなっているか」は、**新しい色を足さずに、すでにあるスケールの中で1つだけ動かして**表します。動かすのは太さか面のどちらか一方で、両方は動かしません。

### 現在地（active / current）

表し方は2通りあり、**その部品がクリックできる面（ヒットエリア）を持つかどうか**で決まります。文字だけが並ぶ帯では太字にし、ヒットエリアを持つ部品では面を塗ります。帯の中で面を塗ると現在地だけが浮き、ヒットエリアを持つ部品で太字にすると押せる範囲が変わらないので所在が読めません。

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
| ページャ | 現在のページだけネイビーの丸で塗る。省略の「…」は塗らない | [すべての記事](/articles/) の2ページ目 |
| タブ | 下線がネイビーになり、太字になる。塗りにすると中身より目立つ | [トップページ](/) |

現在地は**リンクにしません**。押しても同じ場所に来るリンクは、行き先を辿るときに空振りになります。目で見る読者・支援技術・機械の3方向に同じ違いを渡すため、太字と併せて `aria-current="page"` を付けます。

### 無効・空（disabled）

このサイトには押せなくなるボタンやフォームがありません。代わりに「まだ無い」「もう押せない」を表す形が3つあります。

| かたち | 表し方 | 実物 |
| --- | --- | --- |
| 中身が無い | 文字は `ink-faint`、面は `surface-mute`。枠と大きさは中身があるときと同じに保ち、場所だけ空けておく | [すべての記事](/articles/) の投稿が無い月、[連載一覧](/series/) のサムネイルが無い連載 |
| 押せない | リンクにせず、hover にも応えない。手の形のカーソルが出る部品では `cursor` を既定の矢印に戻す | [すべての記事](/articles/) の投稿が無い月、ページャの「…」 |
| 押す対象ではない補助情報 | 押せる部品の**外**に出す。シェア数はボタンの下に置き、押せる範囲と数字が別だと位置で示す | [記事ページ](/articles/20260804a/) のシェア数 |

**歯抜けを詰めません。** 投稿が無い月を一覧から落とすと、無いのか見落としなのかが読者に区別できません。同じ大きさの空き枠を置いて、無いことを見えるようにします。

`ink-faint` は白背景でコントラスト比 4.5 を満たす最も薄い文字色です。**これより薄くしません。** 「無効だから読めなくてよい」ではなく、無効な項目も何であるかは読める必要があります。

## 部品

### note

4色あり、背景は色相を持ちます。中のインラインコードの背景は、その背景より1段階濃い同じ色になります。4色でも表のヘッダでも同じ規則が効きます。書き方は[記法ガイド](/specials/markdown/)にあります。

::: note tip
`tip` の背景です。知っておくと得をすることに使います。
:::

::: note info
`info` の背景です。読み進めるうえで知っておいてほしいことに使います。
:::

::: note warn
`warn` の背景です。気をつけないと困ることに使います。
:::

::: note alert
`alert` の背景です。踏むと壊れることに使います。
:::

### 表

ヘッダに背景色（`surface-tint`）を敷き、本文行は白で揃えます。全セルの罫線が行を追う役割を果たしているので、縞は入れません。横に溢れる表は `.scroll` が受けます。

| 列 | 列 | 列 |
| --- | --- | --- |
| セル | セル | セル |
| セル | セル | セル |

### チップ

タグはピル型のチップで表します。枠だけで地を持たず、hover で背景がネイビーに変わります。右肩の件数は、サイドバーやヘッダーの一覧で名前に添える総数と同じ役なので、同じ大きさ・同じ `ink-faint` です。hover で地が反転する間だけ、反転後の文字色を継ぎます。実物は[タグ一覧](/tags/)にあります。

### 群のある一覧

行き先が多い一覧（タグ一覧の「すべてのタグ」は全件を並べます）は、頭文字や年で群に分け、左のラベルが群を名乗る行に並べます。群の範囲は空きではなく行の上下の罫線が示します。群が多いときは節の先頭に群への飛び先を1行置きます。実物は[タグ一覧](/tags/#alltags)と[著者一覧](/authors/#awards)にあります。

1件が数行にわたる一覧では、ラベルを行の左ではなく**群の上**に置きます。このときの群の範囲は罫線ではなく**空き**が示し、群の切れ目を件と件の空きのちょうど2倍にとります。ラベルは件より少しだけ字下げの外に出しますが、階層を作るのは空きの側なので強くは振りません。2列に並べるときは、行の高さを左右でそろえるグリッドではなく**多段組**にします。グリッドだと背の低い側の下に余りが出て、同じ群の中の空きが群の切れ目より広くなることがあり、空きが階層と逆のことを言い始めます。実物は[カテゴリ一覧](/categories/#categories)にあります。
