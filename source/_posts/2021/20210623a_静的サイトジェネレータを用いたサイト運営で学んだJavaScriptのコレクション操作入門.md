---
title: "JavaScriptのコレクション操作入門"
date: 2021/06/23 00:00:00
postid: a
tag:
  - JavaScript
  - TechBlog
  - フロントエンド
category:
  - Programming
thumbnail: /images/20210623a/thumbnail.png
author: 真野隼記
lede: "この記事ではこのフューチャー技術ブログを機能拡張する過程で学んだコレクション操作で利用頻度が高い順にまとめます。ブログ運営（？）の保守運用な雰囲気が少しでも伝わればなと思います。"
---
# はじめに

<img src="/images/20210623a/JSアイコン.png" alt="JSアイコン" width="1200" height="630">


TIG DXユニット真野です。[フロントエンド連載](/articles/20210614a/)の7記事目です。

ここ数年はGo言語ばかり利用していたのですが、フューチャー技術ブログで利用している静的サイトジェネレータが[Hexo](https://hexo.io/)である関係上、テンプレートの編集や[カスタムスクリプト](https://github.com/future-architect/tech-blog/tree/master/scripts)作成のためにJavaScriptもよく利用するようになりました。

静的サイトジェネレータのカスタムスクリプトを書いたことがある方ならよく分かってくれると思いますが、ページ追加なんかの内容はフレームワーク側が用意してくれる[変数](https://hexo.io/docs/variables.html)のコレクション操作がほぼ大半です。この記事ではこのフューチャー技術ブログを機能拡張[^1]する過程で学んだコレクション操作で利用頻度が高い順にまとめます。ブログ運営（？）の保守運用な雰囲気が少しでも伝わればなと思います。

コレクションと言いながらほとんど Array です。元がJava出身者の自分からすると、配列はコレクションじゃなくて、List, Map, Listのイメージがありますが、JavaScriptだとArrayはリッチなインターフェースが一杯あるのでコレクションだと思ってます。

また、フロントエンド連載と言いながらNode.js（v16.3.0）を使ってCLIで動かしていますが、モダンブラウザでも動く内容かと思いますのでご了承を。


## Array.prototype.map()で記事のタグを抽出

> map() メソッドは、与えられた関数を配列のすべての要素に対して呼び出し、その結果からなる新しい配列を生成します。
> https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map

なんと言っても一番利用頻度が高いのは、ベーシックに入力を一律で射影してくれる便利なmapです。Javaな人もStrem APIに慣れているとすぐ馴染みますよね。

次の `articles` に対してmap操作を行います。

```js 入力データ
const articles = [
    {
        name:"Svelteに入門した",
        tags:["フロントエンド", "Svelte"],
        snsCount: 105,
    },
    {
        name:"どうしてHTML5が廃止されたのか",
        tags:["フロントエンド", "HTML"],
        snsCount: 15733
    },
    {
        name:"AWS内の通信がインターネットを経由しない今、VPC Endpointを利用する意味はあるのか？",
        tags:["AWS", "Network"],
        snsCount: 426
    },
    {
        name:"ES2021／ES2022を知ろう",
        tags:["フロントエンド", "JavaScript"],
        snsCount: 63
    }
 ];
```

サイト生成時にHexoが提供してくれるデータ構造も大体こういった形式です。

これに対し、 `articles` 内の **全タグを抽出したい** とします。

```js Array#mapを用いて全タグ抽出1
const tags = articles.map(a => a.tags).flat().sort();
console.log(tags);
// ['AWS','HTML','JavaScript','Network','Svelte','フロントエンド','フロントエンド','フロントエンド']
```

`map` 以外に出てきますが、tagsは配列であるため、[Array.flat()](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/flat)でサブ配列をフラット化しています。 [Array.sort()](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)は表示のわかりやすさのためソートしています。


## Array.prototype.flatMap()でより簡潔な実装

お気づきの方も多いかと思いますが、`map(a => a.tags).flat()` の部分は `flatMap` を使うとより簡潔に実装できます。

> **Array.prototype.flatMap()**: 最初にマッピング関数を使用してそれぞれの要素をマップした後、結果を新しい配列内にフラット化します
> https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap

```js flatMap良いよ
const tags = articles.flatMap(a => a.tags).sort();
console.log(tags);
// ['AWS','HTML','JavaScript','Network','Svelte','フロントエンド','フロントエンド','フロントエンド']
```

静的サイトジェネレータでは、`Front Matter` と呼ばれるファイル冒頭の3つのダッシュのライン2つの間のYAMLの断片で書かれた定義情報をよく利用するのですが、こちらで宣言された要素が配列になることも多く（例だと、tagとか共著ならauthorも）、flatMapは頻出します。

```yml FrontMatterの例
---
title: "フロントエンド連載2021"
date: 2021/06/14 00:00:00
postid: a
tag:
  - インデックス
  - フロントエンド
category:
  - Programming
thumbnail: /images/20210614a/thumbnail.jpg
author: 真野隼記
---
```

話をコードに戻します。実装は簡潔になりましたが、どちらも結果を見ると、同じタグが重複して出力されていて少し残念です。`distinct（unique）`化したいですが、標準では用意されていないので、少し工夫する必要があります。


## 重複排除

Arrayの重複排除ですが、`Set` を用いるのが一般的なようです。先程の `articles` の重複排除したタグ一覧だと、以下の構文で取得できます。

```js タグを重複排除して抽出
const uniqTags = [...new Set(articles.flatMap(a => a.tags))];
console.log(uniqTags);
// [ 'フロントエンド', 'Svelte', 'HTML', 'AWS', 'Network', 'JavaScript' ]
```

やや、見通しが悪いですが、 いったん Setに変換してから スプレッド構文（`...`）でArrayに戻す操作を行っています。`Array.from` とほぼ同等の処理です。Arrayに戻しているのは、今までの静的サイトジェネレータの実装上、Arrayに戻したほうが後続の取り回しが良かったため、この記事でも準拠している意図です。

今回はタグを例にしましたが、他にも記事のカテゴリ・著者など複数の要素で一意なリストが欲しくなるのでよく利用します。Hexoだとヘルパーの `unique()` が用意されているのであまりSetを用いた実装を利用することはないですが。


## Array.prototype.filter() で指定したタグを持つ記事を抽出

> **filter()**: 与えられた関数によって実装されたテストに合格したすべての配列からなる新しい配列を生成します。
> https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

さきほどの `articles` に対して、AWSタグを持っている記事のみを抽出したいとします。`filter` を用います。

配列の要素が持つタグは複数であるため、 `a.tags` を取り出し、 [includes](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) で要素を検索しています。`includes` は要素に含まれていれば `true` を返すため、`indexOf` を用いるより簡潔に実装できます。

```js
const awsArticles = articles.filter(a => a.tags.includes("AWS"));
console.log(awsArticles);
// [
//  {
//    name: 'AWS内の通信がインターネットを経由しない今、VPC Endpointを利用する意味はあるのか？',
//    tags: [ 'AWS', 'Network' ]
//  }
// ]
```

実際、Hexoのテンプレート上は、tagsはObjectの配列になっていてもう少しややこしいのですが、慣れればなんとかという感じです。


## タグの利用数カウント

利用されているタグの利用回数を表示させたい場合があります。2021.06.23時点のフューチャー技術ブログだと以下みたいに表示されていますね。

<img src="/images/20210623a/image.png" alt="タグの件数表示" loading="lazy">

これも `articles` に対して算出します。先程の指定したタグを持つ記事を抽出する処理を用いたヘルパー関数 `flatMap` を用いると楽です。

```js タグ利用数カウント
const countTag = targetTag => articles.filter(a => a.tags.includes(targetTag)).length;
const tagCounts = [...new Set(articles.flatMap(a => a.tags))].map(tag => ({tag:tag, count:countTag(tag)}));
console.log(tagCounts);
// [
//   { tag: 'フロントエンド', count: 3 },
//   { tag: 'Svelte', count: 1 },
//   { tag: 'HTML', count: 1 },
//   { tag: 'AWS', count: 1 },
//   { tag: 'Network', count: 1 },
//   { tag: 'JavaScript', count: 1 }
// ]
```

こういった処理は、実用上は静的サイトジェネレータのフレームワーク側で用意されたヘルパー関数を利用することが多いかもしれません。HexoだとHTMLまで生成してくれる[list_tags](https://hexo.io/docs/helpers.html#list-tags)があります。一方でちょっと表示項目をフィルターしたい要件を実現しようとすると、すぐにカスタムスクリプトを書くことになりますので、この手の処理に慣れておくと幸せかなと思います。



## Array.prototype.reduce() であるタグに紐づく総SNS数を取得

続いて、タグに紐づくSNSシェア数の合計値を取得したい場合の操作です。 SQLだと `sum` みたいな処理です。JavaScriptだと `reduce` を用います。

> **redulce()**: 配列の各要素に対して (引数で与えられた) reducer 関数を実行して、単一の出力値を生成します。
> https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

こちらもヘルパー関数 `sumTagSNS` を作っておくと便利です。redulceは集約処理です。`acc`が集約値で配列内の各反復に対してこの値を記録してくれます。`cur`が配列の反復処理における現在値で、今回は `acc + cur` で合算しています。

`sumTagSNS`さえ作っておけば、後はタグの一意なリスト駆動にして、先程のタグの利用数カウントと同じ構造で処理できます。

```js SNS数のトータル
const sumTagSNS = targetTag => articles.filter(a => a.tags.includes(targetTag))
                                       .map(a => a.snsCount)
                                       .reduce((acc, cur) => acc + cur);
const sums = [...new Set(articles.flatMap(a => a.tags))].map(tag => ({tag:tag, sumTagSNS(tag)}));
console.log(sums);
// [
//   { tag: 'フロントエンド', count: 15901 },
//   { tag: 'Svelte', count: 105 },
//   { tag: 'HTML', count: 15733 },
//   { tag: 'AWS', count: 426 },
//   { tag: 'Network', count: 426 },
//   { tag: 'JavaScript', count: 63 }
// ]
```

## Array.prototype.sort()で総SNS数の降順にソート

ブログ運営をしていると、あるいは人気の記事を表示させたい要件は割とすぐに出てくると思います。`sort` を用います。`compareFunction` が未指定だと文字列順でソートされますが、今回は `articles` の `snsCount` 順にソートするため、compareFunctionを指定します。

> arr.sort([compareFunction])
> **compareFunction**: ソート順を定義する関数を指定します。
> https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

アロー関数で表現した`(a, b) => b.snsCount - a.snsCount)` が `compareFunction(a, b)` の部分ですが、`compareFunction(a, b) > 0` の場合は `b` が先にくるように並び替えてくれます。

```js ソート
const popularArticles = articles.sort((a, b) => b.snsCount - a.snsCount);
console.log(popularArticles);
// [
//   {
//     name: 'どうしてHTML5が廃止されたのか',
//     tags: [ 'フロントエンド', 'HTML' ],
//     snsCount: 15733
//   },
//   {
//     name: 'AWS内の通信がインターネットを経由しない今、VPC Endpointを利用する意味はあるのか？',
//     tags: [ 'AWS', 'Network' ],
//     snsCount: 426
//   },
//   { name: 'Svelteに入門した', tags: [ 'フロントエンド', 'Svelte' ], snsCount: 105 },
//   {
//     name: 'ES2021／ES2022を知ろう',
//     tags: [ 'フロントエンド', 'JavaScript' ],
//     snsCount: 63
//   }
// ]
```

## Array.prototype.slice()で上位N件だけ取得したい

ソートした場合はおそらくセットで上位N件を取得することが多いと思います。
現在のフューチャー技術ブログは480件ほど記事が存在するのですが、条件によっては1件に満たない場合があるので、配列の添字指定で取得すると範囲外アクセスでundefinedになってしまうこともあります。

> **arr.slice([start[, end]])**
> **end** シーケンスの長さを超えた場合も、slice はシーケンスの最後 (arr.length) までを取り出します。
> https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/slice

`slice()` を使うと、ドキュメントに書いてあるとおり超過した場合は `arr.length` までと自動で調整してくれるので便利です。

```js 人気な上位2件
const popularArticles = articles.sort((a, b) => b.snsCount - a.snsCount).slice(0, 2);
console.log(popularArticles);
// [
//  {
//    name: 'どうしてHTML5が廃止されたのか',
//    tags: [ 'フロントエンド', 'HTML' ],
//    snsCount: 15733
//  },
//  {
//    name: 'AWS内の通信がインターネットを経由しない今、VPC Endpointを利用する意味はあるのか？',
//    tags: [ 'AWS', 'Network' ],
//    snsCount: 426
//  }
//]
```


## 記事中の最大SNS数を取得

現状の最大のSNS数（やPV数）などを取得したい場合があります。前述した `reduce` を用いても良いですが、スプレッド構文 (`...`) を用いるともう少し簡潔に書けます。

```js 記事中の最大件数を取得
const max = Math.max(...articles.map(a => a.snsCount))
console.log(max);
// 15733
```



# まとめ

2021.06.23時点のフューチャー技術ブログでよく実装する代表的なコレクション操作のパターンを紹介しました。

運営としてはちょっとした改善を繰り返し、継続することで、皆さまにとってより使いやすい有意義な媒体を目指しています。

何か機能実装のアイデアがあれば可能な限りお答えしますので、ツイッターアカウントなどでメッセージを頂ければです。




[^1]: 最近はこの辺のページを新設しました。https://future-architect.github.io/articles/ とか https://future-architect.github.io/authors/ とか https://future-architect.github.io/authors/%E7%9C%9F%E9%87%8E%E9%9A%BC%E8%A8%98/ とか

