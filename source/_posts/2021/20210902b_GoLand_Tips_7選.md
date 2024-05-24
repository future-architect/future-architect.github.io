---
title: "GoLand Tips 7選"
date: 2021/09/02 00:00:01
postid: b
tag:
  - Go
  - Goland
  - JetBrains
  - ショートカット
category:
  - Programming
thumbnail: /images/20210902b/thumbnail.gif
author: 山本雄樹
lede: "こんにちは、Futureの[Engineer Camp]にてインターン中の山本です。インターンではGo言語を使用したIoTプラットフォームのバックエンド開発に参加させていただいております。GoLandはGoでの開発に特化した統合開発環境で、最初からGoの開発に必要な機能はほとんど揃っています。そのため、インストール後すぐに使い始めることができるという利点があります。とはいえGoLandの全ての機能を使いこなすのは簡単ではなく、なんとなく、受動的に使っている方は多いのではないでしょうか。本記事ではそんな方に向けて、普遍的なGoLandの機能を紹介する内容となっています。読後に少しでもコードを書くのが楽になれば幸いです。"
---

こんにちは、Futureの[Engineer Camp](https://note.com/future_event/n/n76e7e7d4beef)にてインターン中の山本です。

インターンではGo言語を使用したIoTプラットフォームのバックエンド開発に参加させていただいております。

## はじめに
GoLandはGoでの開発に特化した統合開発環境で、最初からGoの開発に必要な機能はほとんど揃っています。そのため、インストール後すぐに使い始めることができるという利点があります。とはいえGoLandの全ての機能を使いこなすのは簡単ではなく、なんとなく、受動的に使っている方は多いのではないでしょうか。

本記事ではそんな方に向けて、普遍的なGoLandの機能を紹介する内容となっています。読後に少しでもコードを書くのが楽になれば幸いです。

https://www.jetbrains.com/ja-jp/go/

### Windowsなどの他のOSを使っている方へ
筆者が使用しているOSの関係上、記載するショートカットは全てmacOSのもののみとさせていただきます。

それぞれの機能については後から検索がしやすいようになるべく英語でも記載しておりますので、WindowsなどOSが異なる方は「GoLand 機能名』などで検索していただくと各環境ごとのキーが見つかるかと思います。

## 1. 関数の宣言にジャンプする （Go to declaration）
関数の実装を見たい時に便利な機能です。

`⌘ + B`もしくは`⌘ + Click`で関数や構造体などが宣言されているところへジャンプすることができます。

<img src="/images/20210902b/gif2.gif" alt="gif2.gif" width="600" height="258" loading="lazy">

#### 元の場所に戻る
`⌘ + [`で一つ前のタイミングでカーソルがあった位置へ戻ることができます。（連打も可能）


## 2. 検索する （Search Everywhere）
`Shift`を二回押すとSearch Everywhereウィンドウが開きます。

プロジェクト内のファイルやコード、GoLandのほとんどの機能はここから検索することで出てきます。ちなみに検索したい内容をあらかじめ選択しておくと検索窓に選択内容がコピーされます。

<img src="/images/20210902b/gif1.gif" alt="gif1.gif" width="600" height="267" loading="lazy">

Goではファイル名と構造体名などが似通うことはそれなりにあると思いますので、ALLの検索窓からではなく、TypesやFilesなどそれぞれの検索窓を開くためのショートカットを覚えておくのもよいかと思います。

- Search Types（構造体などを検索） : `⌘ + O`
- Search Files（ファイルを検索） : `Shift + ⌘ + O`
- Search Symbols（シンボルを検索） : `option + ⌘ + O`
- Search Actions（アクションを検索） : `Shift + ⌘ + A`


## 3. コード補完 （Postfix templatesなど）
Go言語ではエラー処理など何度も書く処理がありますが、これらをGolandで書く場合にはコード補完機能を使用すると便利です。

例えば、以下のようなコードを書きたい場合、

```go
    file, err := os.Open("example.txt")
    if err != nil {
        // エラー処理
    }
```

わざわざその通りにコーディングしなくとも、`err.nn`として`Enter`キーを押すとコードが生成されます。

<img src="/images/20210902b/gif8.gif" alt="gif8.gif" width="600" height="226" loading="lazy">

上で説明した`nn`以外にも`!=nil{return}`を生成する`.rr`や変数を作って受け取る`.var`などがあります。


## 4. Structをとりあえず埋める (Fill struct fields)
名前の通り、structのフィールドを全て初期値で埋めてくれる機能。これを使えば要素名が自動で入るし、もれなくstructの要素も入力できるので便利です。

`{}`の間で`option + Enter`を押して、出てきたものの中から`Fill all fields`を選んでください。

<img src="/images/20210902b/gif7.gif" alt="gif7.gif" width="600" height="305" loading="lazy">


## 6. ドキュメントを見る (Quick documentation)

関数名の上にカーソルを持ってきてホバーすると関数のドキュメントやドキュメントのURLが表示されます。マウスとか使いたくない時は`Shift+ F1`でドキュメントのページを開きます。
<img src="/images/20210902b/gif9.gif" alt="gif9.gif" width="600" height="272" loading="lazy">

## 7. タブの移動
`⌘ + Shift + [` , `⌘ + Shift + ]`でタブ間を移動できます。

<img src="/images/20210902b/gif10.gif" alt="gif10.gif" width="600" height="360" loading="lazy">

## さらに使いこなすために
### Key Promoter X

[Key Promoter X](https://plugins.jetbrains.com/plugin/9792-key-promoter-x/versions)とは、ショートカットが用意されている処理をショートカットを使用せずに実行するとポップアップでお知らせしてくれるプラグインです。使っていて邪魔になったことはほとんどないので入れておいて損はないと思います。
<img src="/images/20210902b/ファイル名" alt="ファイル名" width="801" height="283" loading="lazy">


### Learnで学ぼう

ここで紹介した機能以外にも便利な機能がGoLandにはあります。GoLandにはLearnというチュートリアルが用意されており、ここではGoLandの機能を手を動かしながら学べます。ぜひ触ってみてください。

Search everywhereウィンドウを立ち上げ（`Shift`2回）、”Learn”を検索すると出てきます。

<img src="/images/20210902b/ファイル名_2" alt="ファイル名" width="1200" height="707" loading="lazy">

### GoLand公式のショートカット一覧PDF

GoLand公式のショートカット一覧（2021年8月31日時点）は[こちら](https://resources.jetbrains.com/storage/products/goland/docs/GoLand_ReferenceCard.pdf?_ga=2.67005742.1086839534.1629960125-2126322136.1629764724&_gac=1.228962542.1629764744.Cj0KCQjwjo2JBhCRARIsAFG667XBuwyHmTLyp_IwNgak5Hq3Cotr-6yXLbN6ExY2MbPJimFeCR8J-YEaAkGDEALw_wcB)からご覧になることができます。
慣れていないうちはダウンロードするかブックマークしておくと便利だと思います。

# 参考文献など

* https://tech.gunosy.io/entry/goland-osusume-benri-features
* https://www.youtube.com/watch?v=BgKuKTPOEI8
* https://www.jetbrains.com/help/go/mastering-keyboard-shortcuts.html
