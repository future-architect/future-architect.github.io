---
title: "Vis Networkで階層グラフを可視化する"
date: 2021/03/03 00:00:00
postid: ""
tag:
  - 可視化
  - JavaScript
  - コアテク
  - 技術選定
  - 階層グラフ
category:
  - Frontend
thumbnail: /images/2021/20210303/thumbnail.png
author: 山田修路
lede: "業務で階層グラフを可視化する機会があったので、階層グラフの可視化について共有させていただこうと思います。グラフとは関係を抽象化したもので、線グラフや棒グラフなどのチャートとは異なる概念です。"
---

# はじめに

はじめまして、TIG コアテクノロジーユニットの山田です。

だいぶ前のことですが業務で階層グラフを可視化する機会があったので、**階層グラフの可視化方法** について共有させていただこうと思います。

> グラフとは関係を抽象化したもので、線グラフや棒グラフなどのチャートとは異なる概念です。グラフはノードとエッジで表現され、例えばSNSでのつながりを表すソーシャルグラフや関数の呼び出し関係を表すコールグラフなど様々な関係をグラフで表現できます。
> （詳細は[グラフ \(データ構造\) \- Wikipedia](https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%A9%E3%83%95_(%E3%83%87%E3%83%BC%E3%82%BF%E6%A7%8B%E9%80%A0))を御覧ください）

グラフの可視化ツールと言えば[Graphviz](https://graphviz.org/)が有名ですが、サーバ側にバイナリ入れてプロセス起動する形になってしまうのでWebアプリでの利用には少し不向きです。

Webアプリで利用しやすい、JavaScript製のライブラリの代表的なプロダクトは例えば以下があります。

|            | [vis\-network](https://github.com/visjs/vis-network) | [mxGraph](https://github.com/jsGraph/mxgraph) | [D3\.js](https://d3js.org/) | [mermaid](https://mermaid-js.github.io/mermaid/#/) |
| ---------- | ---------------------------------------------------- | --------------------------------------------- | --------------------------- | -------------------------------------------------- |
| 描画方式   | canvas                                               | SVG                                           | canvas / SVG                | SVG                                                |
| 特徴       | 高性能                                               | diagrams.net (旧 draw.io) で使われている      | 多機能                      | GitLabで標準利用可                                 |
| ライセンス | Apache License 2.0 / MIT License                     | Apache License 2.0                            | 修正BSDライセンス           | MIT License                                        |

この中で、本記事でははVis Networkを用いて階層グラフを表示する方法をご紹介します。

mxGraphについて[次の記事](/articles/20210304/)で紹介する予定ですのでお楽しみに。

## Vis Networkとは

vis.jsという可視化ライブラリに含まれるグラフ可視化ライブラリです。その中でもVis Networkはグラフの可視化に特化したライブラリで、[Vis Network Examples](https://visjs.github.io/vis-network/examples/)にあるように様々なグラフを描画できます。Vis Networkはcanvasに描画するため描画が高速で、パフォーマンスが要求される場面に有用です。 [^1]

# Vis Networkの使い方

Vis Networkでは表示するグラフの元となるノード、エッジ、オプションを定義する必要があります。

## ノード定義

下記のようにノードを定義できます。

```javascript
const nodes = new vis.DataSet([
  { id: 1, label: '1' },
  { id: 2, label: '2' },
  { id: 3, label: '3' },
  { id: 4, label: '4' },
  { id: 5, label: '5' },
  { id: 6, label: '6' },
  { id: 7, label: '7' },
  { id: 8, label: '8' },
  { id: 9, label: '9' },
  { id: 10, label: '10' },
  { id: 11, label: '11' },
  { id: 12, label: '12' },
]);
```

ノードに設定可能な属性一覧は[vis\.js \- Nodes documentation\.](https://visjs.github.io/vis-network/docs/network/nodes.html)をご参照ください。

## エッジ定義

`from`, `to`で指定したノードIDをつなぐエッジを作成します。

```javascript
const edges = new vis.DataSet([
  { from: 1, to: 3 },
  { from: 1, to: 2 },
  { from: 2, to: 4 },
  { from: 2, to: 5 },
  { from: 3, to: 6 },
  { from: 3, to: 8 },
  { from: 6, to: 7 },
  { from: 6, to: 9 },
  { from: 4, to: 10 },
  { from: 4, to: 11 },
  { from: 5, to: 12 },
]);
```

エッジに設定可能な属性一覧は[vis\.js \- Edges documentation\.](https://almende.github.io/vis/docs/network/edges.html)をご参照ください。

## オプション定義

階層グラフを表示する場合、layoutオプションを指定する必要があります。その際、下記のように`sortMethod: 'directed'`を指定することでグラフの形状から各ノードのレベルを自動計算してくれるので、ライトに可視化したい場合にはこのオプションを使用することをおすすめします。

```javascript
const options = {
    layout: {
        hierarchical: {
            sortMethod: 'directed'
        }
    }
};
```

オプションに設定可能な属性一覧は[vis\.js \- Network documentation\.](https://almende.github.io/vis/docs/network/)をご参照ください。

## 可視化

上記のノード定義、エッジ定義、オプション定義を元に可視化できます。実際に可視化した例です。

<img src="/images/2021/20210303/2021-01-19_14h29_14.png" loading="lazy">
ソースコードは [Edit fiddle \- JSFiddle \- Code Playground](https://jsfiddle.net/0bxLo6wt/) にて確認できます。

これだけでは寂しいので、少しグラフを加工していきましょう。

## ノードの形状

ノード定義にshape属性を追加することで、ノードにラベルを表示することが出来ます。なお、ここでは紹介しませんでしたが`shape: image`を指定することで任意の画像を表示することもできます。

```javascript
const nodes = new vis.DataSet([
  { id: 1, label: '1' },
  { id: 2, label: '2', shape: 'database' },
  { id: 3, label: '3', shape: 'box' },
  { id: 4, label: '4', shape: 'text' },
  { id: 5, label: '5', shape: 'triangle' },
  { id: 6, label: '6', shape: 'diamond' },
  { id: 7, label: '7', shape: 'dot' },
  { id: 8, label: '8', shape: 'star' },
  { id: 9, label: '9', shape: 'triangle' },
  { id: 10, label: '10', shape: 'triangleDown' },
  { id: 11, label: '11', shape: 'hexagon' },
  { id: 12, label: '12', shape: 'square' },
]);
```

<img src="/images/2021/20210303/2021-01-19_14h31_46.png" loading="lazy">
ソースコードは [Edit fiddle \- JSFiddle \- Code Playground](https://jsfiddle.net/3nkac917/) にて確認できます。

## tooltip

> tooltip（ツールチップ）とは、マウスオーバーした際に表示される枠内の補足説明などのことです。詳細は[こちら](https://ja.wikipedia.org/wiki/%E3%83%84%E3%83%BC%E3%83%AB%E3%83%81%E3%83%83%E3%83%97)の記事などを参考ください。

ノード定義にtitle属性を追加することでtooltipを表示することが出来ます。ドキュメントによるとHTMLを含む文字列を直接セット出来ると書かれていますが、XSS対策 [^2]のため9.0.0からできなくなっています。

tooltipでHTMLを表示したい場合は[Vis Network \| Other \| Popups](https://visjs.github.io/vis-network/examples/network/other/popups.html)のように HTML Element を直接セットする必要があります。

```javascript
const nodes = new vis.DataSet([
  { id: 1, label: '1', title: 'tooltip\ntest' },
  { id: 2, label: '2', shape: 'database' },
  { id: 3, label: '3', shape: 'box' },
  { id: 4, label: '4', shape: 'text' },
  { id: 5, label: '5', shape: 'triangle' },
  { id: 6, label: '6', shape: 'diamond' },
  { id: 7, label: '7', shape: 'dot' },
  { id: 8, label: '8', shape: 'star' },
  { id: 9, label: '9', shape: 'triangle' },
  { id: 10, label: '10', shape: 'triangleDown' },
  { id: 11, label: '11', shape: 'hexagon' },
  { id: 12, label: '12', shape: 'square' },
]);
```

<img src="/images/2021/20210303/2021-01-19_14h34_43.png" loading="lazy">
ソースコードは [Edit fiddle \- JSFiddle \- Code Playground](https://jsfiddle.net/rg50c2jh/) にて確認できます。

## イベント

`on`メソッドで指定したイベントを処理するCallbackを登録することが出来ます。
下記のサンプルではクリックしたノードの`color`属性を変更します。

<img src="/images/2021/20210303/ノードクリックイベント.gif" loading="lazy">
ソースコードは [Edit fiddle \- JSFiddle \- Code Playground](https://jsfiddle.net/hu2kts5y/) にて確認できます。

イベント一覧は [vis\.js \- Network documentation\.](https://almende.github.io/vis/docs/network/#Events) に記載されています。
イベント発生時に渡されるパラメータの中身を確認したり、実際にイベント発生させて試したい場合は [Vis Network \| Events \| Interaction events](https://visjs.github.io/vis-network/examples/network/events/interactionEvents.html) がおすすめです。

## dot言語からのインポート

Vis NetworkではGephiからエクスポートしたデータやdot言語をインポートできます。今回は私が先日Graphvizを用いて可視化したグラフ [^3]をVis Networkで表示してみます。

<img src="/images/2021/20210303/名称未設定2.png" loading="lazy">

ソースコードは [Edit fiddle \- JSFiddle \- Code Playground](https://jsfiddle.net/kon2cL8r/10/) にて確認できます。

Graphvizほど洗練されたレイアウトにはなりませんが、非常に簡単にdot言語をインポートできました。

※ 上記画像ではVis Networkのノードやエッジのラベルが読み取れない状態になっていますが、Canvas上で拡大することでラベルを読み取ることが出来ます

# 注意

開発中にバージョンアップしたときに何も表示されなくなる不具合 [^4]に遭遇したことがありました。このようなわかりやすい不具合ならまだいいですが、細かいところで挙動が変わってしまっている可能性もあるのでバージョンアップの際には十分な検証が必要かなと思います（どのソフトウェアにも言えることではありますが…）

# 課題

当初Vis Networkを使用していましたが、大きめの階層グラフを表示するとエッジの交差が非常に多くなってしまうことがわかりました。例えば下図はこれまでサンプルとして表示していたグラフにオレンジのエッジを一本追加しただけなのですが、エッジの交差が必要以上に多くなってしまっています。

<img src="/images/2021/20210303/2021-01-21_10h44_39.png" loading="lazy">

ソースコードは [Edit fiddle \- JSFiddle \- Code Playground](https://jsfiddle.net/2801wrud/2/) にて確認できます。

私の所属しているプロジェクトでは比較的大きな階層グラフを表示する必要があり、この課題を解消するためmxGraphに乗り換えました。mxGraphではこのようにエッジの交差を減らすことができます。

<img src="/images/2021/20210303/image_(4).png" loading="lazy">

次回の記事ではmxGraphをご紹介いたします。

* 続きの記事も[こちら](/articles/20210303/)に公開されました。併せて確認してもらえると嬉しいです！

階層グラフのレイアウト問題そのものに興味がある方は [階層グラフの可視化](http://www.orsj.or.jp/archive2/or63-1/or63_1_20.pdf) などを見ると楽しめるかなと思います。

# まとめ

vis.jsを使い、ライトに階層グラフを表示・加工出来ることがわかりました。残念ながら私達の用途には合いませんでしたが、適切なシーンで使用すればとても有用なライブラリだと思います。

コアテクノロジーユニットでは、現在チームメンバーを募集しています。興味がある方はお気軽に技術ブログTwitterや会社採用HPへ、連絡をお待ちしております。

https://www.future.co.jp/recruit/

 [^1]: フューチャー発のOSSであるCheetah Gridも高速に描画するためにcanvasを使用しています。興味がある方は[Vue\.jsで最速に始めるCheetah Grid \| フューチャー技術ブログ](/articles/20200901/)や[CheetahGrid\+Vue\.jsをエンプラで使ってみた \| フューチャー技術ブログ](/articles/20200924/)を御覧ください
 [^2]: [fix\(xss\)\!: don't set popup content via innerHTML by Thomaash · Pull Request \#1275 · visjs/vis\-network · GitHub](https://github.com/visjs/vis-network/pull/1275)
 [^3]: [Goでコールグラフを自作してみた \- Qiita](https://qiita.com/tanzaku/items/d21ce5c61505a8710fbe#%E8%A7%A3%E6%9E%90%E7%B5%90%E6%9E%9C-%E3%81%9D%E3%81%AE3%E3%82%A8%E3%83%B3%E3%83%89%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%81%AE%E3%83%8E%E3%83%BC%E3%83%89%E3%82%92%E8%BF%BD%E5%8A%A0)
 [^4]: [None of the examples work on 6\.2\.0? · Issue \#183 · visjs/vis\-network · GitHub](https://github.com/visjs/vis-network/issues/183)
