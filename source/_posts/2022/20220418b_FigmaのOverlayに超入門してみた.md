---
title: "FigmaのOverlayに超入門してみた"
date: 2022/04/18 00:00:01
postid: b
tag:
  - Figma
  - 入門
category:
  - Design
thumbnail: /images/20220418b/thumbnail.png
author: 真野隼記
lede: "春の入門連載の1日目です。この記事ではFigmaを使って簡単なログインページを作ります。よくネットで見る参考情報では、入力フォームのキーボード入力などインタラクション性にかけるものが多かったので、オーバーレイを利用して動きをつけてアプリイメージを湧きやすくするように工夫します。"
---
[春の入門連載](/articles/20220418a/) の1日目です。

# はじめに

[Figma](https://www.figma.com/) の入門記事です。Figmaとはデザインをブラウザ上で簡単に共同編集できることが特徴なUIデザインツールです。プレビュー実行すると作成したデザインがクリックなどのイベントで遷移させることができるので、WebサイトやPC・スマホアプリのワイヤーフレームやプロトタイプ作成で使われている場面をよく見ます。Figmaで[プレゼンテーション用のスライド](https://note.com/smartcamp_design/n/ncc0fb574f2d3)を作る人も噂では増えているようです。2022年3月16日に日本法人ができ国内でもさらに勢い増しそうな予感がします。

* [世界でデザインコラボレーションツールをリードする「Figma」が日本へ本格進出｜Figma Japan株式会社のプレスリリース](https://prtimes.jp/main/html/rd/p/000000001.000097201.html)

様々なデザインシステム[^1]もFigma上で公開されており、UIの生きた教材となっているようです。（私はまだ眺めていてすごいなーくらいですが）

[^1]: https://www.concentinc.jp/design_research/2021/04/designsystem/

* [勉強になったFigmaのデザインシステム8選｜東 莉緒／Rio Azuma｜note](https://note.com/rio310mink/n/n4ead8d789621)


この記事ではFigmaを使って簡単なログインページを作ります。よくネットで見る参考情報では、入力フォームのキーボード入力などインタラクション性にかけるものが多かったので、オーバーレイを利用して動きをつけてアプリイメージを湧きやすくするように工夫します。


# Figmaことはじめ

* [公式サイト](https://www.figma.com/)で、まずはログインします
* New design fileを選択して開きます

最初の使い方については[サクッと始めるウェブデザイン【Figma】](https://zenn.dev/umi_mori/books/d1ea181264ebb3) がチュートリアルとして楽でした。また、Figmaの使い方はYoutube動画に多く説明されており、むしろそちらの方が情報が多い印象です。

よりよいデザインで作る場合は、既存のFigma Resources（Figmaで利用できる素材）をうまく活用し、むしろ乗っかっていく方がてっとり早いと思いますが、今回は使い方を学ぶということでなるべく手動で作る領域を多めにとる方針とします。


# つくるもの

今回作るものですが、簡単なログインフォームを作ります。サンプルで引っかかるテキストの入力フォームがインタラクティブに動くものが無かったので、オーバーレイを利用し、スマートフォンのネイティブキーボードを表示させるインタラクションを作ります。少しでも動くとぐっとアプリのイメージが具体化されると思うからです。

<img src="/images/20220418b/ログイン概念.png" alt="ログイン概念.png" width="1200" height="982" loading="lazy">


# 流れ

New design fileで開くと、バナーからフレームを選択します。

<img src="/images/20220418b/フレーム選択.png" alt="フレーム選択.png" width="559" height="63" loading="lazy">

サイドバーにどういったテンプレートを作成するかプルダウンが表示されるので、iPhone 13 Pro Maxを選択します。

<img src="/images/20220418b/モバイルを選択.png" alt="モバイルを選択.png" width="494" height="266" loading="lazy">

オブジェクト挿入し、入力ボックスを作っていきます。


<img src="/images/20220418b/オブジェクト挿入.png" alt="オブジェクト挿入.png" width="573" height="180" loading="lazy">

Cornar radiusで少し端っこを丸くすると入力フォームぽくなります。

<img src="/images/20220418b/角丸.png" alt="角丸.png" width="356" height="271" loading="lazy">

テキストでラベル・入力のダミー値を設定します。固定値です。

<img src="/images/20220418b/テキスト入力.png" alt="テキスト入力.png" width="592" height="76" loading="lazy">

ログインボタンはCornar radiusを強めにするして色を塗りつぶすとそれっぽく見えます。同様にトップページも作っておき、2ページ並べて全体を見ると次のような状態を作ります。

<img src="/images/20220418b/全体モック.png" alt="全体モック.png" width="1200" height="599" loading="lazy">


# キーボードを追加

デフォルトだとキーボードを表示するような仕組みが無いため、素材をもとに作り込む必要があります。Figma上からCommunityが上げている素材を検索します。keyboardなどで検索すると、例えば以下のようなページが見つかると思います。

* https://www.figma.com/community/file/1029525540844129321

Duplicate ボタンを押すと、別タブでFigma編集画面が表示されます。

<img src="/images/20220418b/複製.png" alt="複製.png" width="1143" height="538" loading="lazy">

利用したいリソースをコピーして、編集中のデザインファイルに貼り付けます。

<img src="/images/20220418b/リソースをコピー.png" alt="リソースをコピー.png" width="1161" height="400" loading="lazy">

横幅を調整して合わせます（少しキーボタンが崩れますが、調整は割愛）。

<img src="/images/20220418b/キーボード貼り付け.png" alt="キーボード貼り付け.png" width="997" height="380" loading="lazy">


ここで入力フォームをクリック時にPrototype+Overrayでキーボードが立ち上がるようにします。

入力ボックスをクリック、PrototypeからInteractionsでOpen overlayを選択。

<img src="/images/20220418b/prototype.png" alt="prototype.png" width="926" height="506" loading="lazy">

先程追加した「キーボード」を選択します。Overlayでは、Bottom centerで被さる位置を画面下部にし、「Close when clicking outside」で外すようにします。AnimationではMove inを選び、進行方向を「↑」をクリックします。

<img src="/images/20220418b/Overlay設定.png" alt="Overlay設定.png" width="721" height="705" loading="lazy">

ログインボタンの遷移はもっとシンプルで、On tap時に Navigate to でトップページを選択します。

<img src="/images/20220418b/ログインボタンの遷移.png" alt="ログインボタンの遷移.png" width="791" height="439" loading="lazy">


# デモ

ナビゲーションバーの「▷」でプレゼンテーションモードで再生できます。

入力フォームを選択すると、キーボードがぬっと立ち上がるのがわかると思います。キーボード入力はできませんが、このレベルでもアプリの導線があたえる印象がガラッと変わってくると思います。

<img src="/images/20220418b/figma_demo.gif" alt="figma_demo.gif" width="1200" height="682" loading="lazy">


# まとめ

Figmaのオーバーレイの超入門記事でした。コミュニティのみなさんが共有してくださっている素材をうまく組み合わせるとちょっとした時間でワイヤーフレーム・プロトタイプの品質をぐっと向上させることができます。

