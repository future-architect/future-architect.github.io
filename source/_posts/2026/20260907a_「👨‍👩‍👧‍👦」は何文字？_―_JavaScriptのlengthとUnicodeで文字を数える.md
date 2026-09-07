---
title: "「👨‍👩‍👧‍👦」は何文字？ ― JavaScriptのlengthとUnicodeで文字を数える"
date: 2026/09/07 00:00:00
postid: a
tags:
  - JavaScript
  - Unicode
  - 文字列処理
categories:
  - Frontend
series: "夏休み自由研究2026"
thumbnail: /images/2026/20260907a/thumbnail.png
author: 永井優斗
lede: "JavaScriptの length は「👨‍👩‍👧‍👦」を11と数えます。UTF-8バイト・UTF-16コードユニット・コードポイント・書記素クラスタの4つの数え方で絵文字や結合文字を測り、「1文字」が何を指すのかを確かめます。"
---

<!-- textlint-disable no-japanese-only-inline-code -->

<img class="bordered" src="/images/2026/20260907a/thumbnail.png" alt="" width="300" height="200">

FVG＆CodeCamp兼務出向中の永井です。

[夏休み自由研究連載2026](https://future-architect.github.io/articles/20260827a/)の8本目記事となります。

次のものは、それぞれ何文字でしょうか？

> A / あ / プ / 😀 / 🇯🇵 / 👨‍💻 / 👨‍👩‍👧‍👦

だいたい全部「1文字」と答えたくなります。

```js
console.log("A".length) // 1
console.log("あ".length)         // 1
console.log("😀".length)         // 2
console.log("🇯🇵".length)       // 4
console.log("👨‍💻".length)      // 5
console.log("👨‍👩‍👧‍👦".length) // 11
```

最後の「家族」は、画面ではひとかたまりなのに 11。JavaScript が意外な数を返したように見えますが、仕様どおりに数えています。

## きっかけは、同じに見える「プ」

きっかけは、フロントエンドカンファレンス名古屋で聞いた wabi さんの発表「[見た目は同じなのに検索でヒットしない：ファイルアップロード実装の落とし穴と設計を考える](https://speakerdeck.com/wabi_1318/jian-tamu-hatong-zinanonijian-suo-dehitutosinai-huairuatupurodoshi-zhuang-noluo-tosixue-toshe-ji-wokao-eru)」でした。発表では、1つの文字に見える `プ` が、見た目は同じでもコンピュータの中では違う並びで保存されることがある、と紹介されていました。発表の主題は、こうした違いがファイル名の検索にどう影響するかと、どこで文字列をそろえるかという設計です。

この発表を聞いて、私は別の疑問を持ちました。見た目はどちらも「プ」なのに、中身は違う。では、コンピュータにとって「1文字」とは何なのでしょうか。この記事では、wabi さんも取り上げていた `プ` を出発点に、その問いを実験してみます。検索の一致や文字列をそろえる方法ではなく、「何を数えたときに1文字と言えるのか」を調べるのが今回の目的です。

## 4種類の「数え方」を用意する

ここから少し専門用語が出てきます。でも、最初に全部覚える必要はありません。大事なのは、**同じ文字列でも、何を数えるかで数字が変わる**ことです。

たとえば JavaScript の `"😀".length` は `2` でした。この `2` は、私たちが画面で見ている「顔が1つ」という数とは一致しません。JavaScriptの文字列を構成するUTF-16コードユニットを2つ数えた結果です。

標本は、直感と実装結果がずれやすく、実務で入力・検索・表示の場面に現れやすいものを選びました。今回は、次の4つの数え方で同じ標本を見比べます。

|数え方|ひとことで言うと|どんなときに見る？|
|---|---|---|
|UTF-8バイト数|送ったり保存したりするときの**データ量**|APIやファイルに「何バイトまで」という上限があるとき|
|UTF-16コードユニット数|JavaScriptが文字列を区切って数える**箱の数**|JavaScriptの `String#length` が返す数|
|Unicodeコードポイント数|文字を作る部品についた**Unicode上の番号の数**|「この文字列は、何の部品でできている？」と調べるとき|
|書記素クラスタ数|画面で人が**一文字らしく読むまとまり**|UIの「あと○文字」の表示や、文字単位の入力制限を検討するとき（カーソル移動・削除の挙動はUIコンポーネント側の実装にも依存します）|

「コードユニット」や「コードポイント」という言葉は、今は名前だけで大丈夫です。後の実験で、`😀` や `👨‍💻` を実際に分解しながら見ていきます。

書記素クラスタは、フォント上の幅や、どの端末でも同じ見た目になることを保証する単位ではありません。それでも「利用者には何文字に見えるか」に近い数え方として役立ちます。今回は JavaScript の `Intl.Segmenter` を使って数えます。

## 観察記録：だんだん様子がおかしくなる

### A と あは、まだ直感どおり

`A` は UTF-8 で1バイト、`あ` は3バイトです。保存するときのデータ量は違いますが、それ以外の数え方ではどちらも1です。ここでは、画面で見た「1文字」と、4種類の数え方がまだ仲よく一致しています。

### プは1個にも2個にもなる

これは先ほど紹介したwabiさんの発表でも取り上げられたものです。`プ` と `プ` は、多くの環境では同じように見えます。けれど中身を見ると、`プ` は1つの番号（`U+30D7`）で表される一方、 `プ` は、`フ`（`U+30D5`）と、半濁点だけを表す記号（`U+309A`）を2つ並べたものです。

そのため `プ` は、コードポイント数が2、JavaScriptの `length` も2、UTF-8では6バイトになります。それでも、画面では一文字らしく見えるので、書記素クラスタ数はどちらも1です。

同じように見える文字を、1つの番号で書く方法と「文字 + 印」で書く方法の両方を Unicode は認めています。この違いをそろえたいときに使うのが正規化です。`normalize("NFC")` の NFC は、正準等価な並びを可能な範囲で合成済み形式へそろえる正規化形式です。反対に NFD は、正準分解した形式へそろえる正規化形式です。たとえば `"プ".normalize("NFC") === "プ"` は `true` になります。今回は正規化そのものが主役ではありません。「同じに見えても、数え方によっては2つになる」ことを覚えておけば十分です。

同じ現象は `é` と `e + ◌́` でも起きます。前者は1コードポイント・2バイト、後者は2コードポイント・3バイトです。

### 😀で JavaScript の事情が見える

次は JavaScript の `length` です。`😀` は1つの顔に見えるのに、`"😀".length` は `2` になります。なぜなら JavaScript は、文字列を16ビットずつの小さな箱に分けて数えるからです。`😀` の番号は1つの箱には入りきらないため、2つの箱を使います。この組をサロゲートペアと呼びます。

絵文字だけの話ではありません。`𠮷`（`U+20BB7`）も同じ理由で、`length` は2、コードポイント数は1です。つまり `length` は「画面に何文字見えるか」ではなく、JavaScriptが使っている箱の数です。

`[...text].length` や `Array.from(text).length` を使うと、この2つ組は1つのコードポイントとして数えられるので、`😀` と `𠮷` では1を返します。

### 🇯🇵には「日本国旗」という単独のコードポイントがない

日本国旗の絵文字には、「日本国旗そのもの」を表す1つの番号はありません。J を表す記号（Regional Indicator Symbol Letter J、`U+1F1EF`）と P を表す記号（Regional Indicator Symbol Letter P、`U+1F1F5`）を並べて、日本を表しています。つまりコードポイントは2、JavaScriptの `length` は4、UTF-8では8バイトです。

それでも、対応している端末では2つの記号が1つの旗 `🇯🇵` として表示されます。書記素クラスタ数も1です。「国旗を1つ表示する」という見た目と、「記号を2つ持つ」という中身がここで分かれます。

### 👍🏻は「絵文字 + 肌色指定」

`👍🏻` も、中身は2つです。まず親指の絵文字があり、その後ろに肌の色を指定する記号が続きます。画面では1つの「肌色付きのいいね」に見えても、部品を数えれば2つあります。どちらの数も間違いではなく、何を数えたいかが違うだけです。

### 👨‍💻の見えない接着剤

`👨‍💻` の中身は、「男性」👨＋「見えない接着剤」＋「パソコン」💻の3つで構成されています。この見えない接着剤は ZWJ（Zero Width Joiner、`U+200D`）と呼ばれます。対応している端末では、ZWJが前後の絵文字をつなぎ、3つの部品を1つの「男性技術者」の絵文字として表示します。

`👩‍🚀`、虹の旗 `🏳️‍🌈`、キス `👩‍❤️‍💋‍👨` も同じ仲間です。虹の旗やキスには「絵文字として表示してほしい」と伝える見えない記号も入っています。キーキャップの `1️⃣` も、数字の `1` に2つの記号を足して作られます。一文字に見える絵文字の中には、このように複数の部品と表示のルールが隠れています。

### ラスボス：家族の絵文字で全部が重なる

最後は家族の絵文字です。`👨‍👩‍👧‍👦` は、4人の人物と3個の見えない接着剤でできています。部品は合計7個。JavaScriptの `length` は11、UTF-8では25バイトです。

しかし `Intl.Segmenter` で区切ると、これは1つの書記素クラスタになります（本記事のNode.js v20.16.0環境での結果です。実装が参照するUnicode/ICUのバージョンによって、新しい絵文字の分割結果は変わる可能性があります）。つまり、画面上の「一文字らしさ」を数えたいなら1です。ただし、書記素クラスタだけが唯一の正解ではありません。通信量の上限を守るなら25バイト、JavaScriptの添字を扱うなら11という数が必要です。目的が違えば、見るべき数も変わります。

## 「10文字以内」の10文字を実験する

次のバリデーションはよく見かけます。

```js
const value = "😀😀😀😀😀😀";

if (value.length > 10) {
  // 10文字を超えています
}
```

実際に測ると、6個の 😀 は `length === 12` なのでこの条件に引っかかります。一方でコードポイント数と書記素クラスタ数は6です。画面に「10文字以内」と出してこの実装を置くと、利用者は「まだ6文字なのに」と感じるかもしれません。JavaScript が間違っているのではなく、仕様の「10文字」と実装の「10 UTF-16コードユニット」が食い違っています。

UIでユーザーが読む個数を制限したいなら、意図をコードにも書いたほうがいいです。

```js
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
const graphemeCount = (text) => Array.from(segmenter.segment(text)).length;

if (graphemeCount(value) > 10) {
  // 画面上の1文字らしい単位で10個を超えています
}
```

ただし、これで全問題が解決するわけではありません。

- ユーザー名、SNS投稿、フォームの残り文字数は書記素クラスタが候補
- DBの制約は、その製品・照合順序・カラム定義が何を上限にするかを確認する
- SMSや外部API、ファイル、メッセージングの上限では、バイト数やプロトコル固有の単位を確認する
- JavaScript内部の切り出しや互換性のある既存仕様なら、UTF-16コードユニットが要件になることもある

大事なのは「文字数」というラベルで済ませず、仕様に単位を添えることです。たとえば「表示上の書記素クラスタで10個まで」「（外部APIの仕様がUTF-8バイト数で上限を定めている場合は）UTF-8エンコード後512バイトまで」のように書く。後から実装する人も、テストを書く人も、困りにくくなります。

文字数を数える方法を選ぶことは、ライブラリを選ぶ話ではありません。利用者に何を約束し、その約束をテスト可能な言葉にするか、という仕様設計の話です。先に単位を決めておけば、UI、フロントエンド、API、データベースのそれぞれで同じ約束を確認できます。

## おわりに：「1文字」は自然な言葉、曖昧な仕様

人間にとって「👨‍👩‍👧‍👦」は、まず1つの家族の記号です。コンピュータにとっては、25バイト、11 UTF-16コードユニット、7コードポイント、1書記素クラスタでした。どれも同じ文字列についての正しい観察です。

つまり「1文字」という言葉は人間には自然でも、コンピュータにとっては曖昧です。まずは自分が担当している入力欄をひとつ選び、表示文言が「10文字」なら、その「10文字」がどの単位（書記素クラスタか、UTF-16コードユニットか、バイト数か）を指しているのか確認してみると良いかもしれません。今度「10文字以内」という仕様を見たら、エンジニアは一度だけ立ち止まって、こう聞いてみてもよいかもしれません。

> ところで、その1文字って何ですか？

たぶん何それ？って言われますけど。

## 付録：検証コード

以下は記事内で使う分析関数です。`TextEncoder` で UTF-8 バイト列を得て、`String#length`、文字列イテレータ（`Array.from`）、`Intl.Segmenter` をそれぞれ別のものさしとして使います。Node.js 18 以降、または `Intl.Segmenter` 対応ブラウザで実行できます。

```js
const graphemeSegmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
const encoder = new TextEncoder();

function analyzeCharacter(label, text) {
  const codePoints = Array.from(text);
  const graphemes = Array.from(
    graphemeSegmenter.segment(text),
    ({ segment }) => segment,
  );

  return {
    label,
    display: text,
    utf8Bytes: encoder.encode(text).length,
    utf16Units: text.length,
    codePoints: codePoints.length,
    graphemes: graphemes.length,
    codePointList: codePoints
      .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`)
      .join(" "),
  };
}

console.log(analyzeCharacter("家族", "👨‍👩‍👧‍👦"));
```

### 実行環境と結果一覧

Node.js v20.16.0 で実行しました。結果は次のとおりです。表の「コードポイント数」は `[...text].length` と同じ数え方です。ただし、それを「人間が数える文字数」と呼べるとは限りません。ほかの環境で実行した場合、`Intl.Segmenter` が参照するUnicode/ICUのバージョンによっては、新しい絵文字の分割結果が異なる可能性があります。

|標本|表示|UTF-8 bytes|UTF-16 units|Code Points|Graphemes|
|---|---:|---:|---:|---:|---:|
|ASCII|A|1|1|1|1|
|ひらがな|あ|3|1|1|1|
|合成済みのプ|プ|3|1|1|1|
|フ + 結合半濁点|プ|6|2|2|1|
|合成済みのé|é|2|1|1|1|
|e + 結合アクセント|é|3|2|2|1|
|𠮷（補助平面の漢字）|𠮷|4|2|1|1|
|顔|😀|4|2|1|1|
|日本国旗|🇯🇵|8|4|2|1|
|肌色付きいいね|👍🏻|8|4|2|1|
|男性技術者|👨‍💻|11|5|3|1|
|女性宇宙飛行士|👩‍🚀|11|5|3|1|
|虹の旗|🏳️‍🌈|14|6|4|1|
|キス|👩‍❤️‍💋‍👨|27|11|8|1|
|家族|👨‍👩‍👧‍👦|25|11|7|1|
|キーキャップ 1|1️⃣|7|3|3|1|
|テキスト表示のハート|♥︎|6|2|2|1|
|絵文字表示のハート|♥️|6|2|2|1|

コードポイント列も実行時に確認しました。たとえば、`プ` は `U+30D7`、見た目がほぼ同じ `プ` は `U+30D5 U+309A`、家族は `U+1F468 U+200D U+1F469 U+200D U+1F467 U+200D U+1F466` です。6個の 😀 は `length === 12`、コードポイント数・書記素クラスタ数はともに 6 でした。

## 参考文献・参考URL

- wabi, [見た目は同じなのに検索でヒットしない：ファイルアップロード実装の落とし穴と設計を考える](https://speakerdeck.com/wabi_1318/jian-tamu-hatong-zinanonijian-suo-dehitutosinai-huairuatupurodoshi-zhuang-noluo-tosixue-toshe-ji-wokao-eru)（本記事の着想元です。検索・正規化設計を主題とする発表でした）
- Unicode Consortium, [UAX #29: Unicode Text Segmentation](https://unicode.org/reports/tr29/)（書記素クラスタの分割規則）
- Unicode Consortium, [UAX #15: Unicode Normalization Forms](https://unicode.org/reports/tr15/)（NFC/NFDなど）
- Unicode Consortium, [UTS #51: Unicode Emoji](https://unicode.org/reports/tr51/)（絵文字シーケンス、ZWJ、Variation Selectorなど）
- TC39, [ECMAScript Language Specification: String type](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type)（ECMAScript文字列とUTF-16コードユニット）
- MDN, [String: length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length)
- MDN, [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- MDN, [String.prototype.normalize()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
