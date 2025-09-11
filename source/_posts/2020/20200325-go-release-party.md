---
title: "Go1.14のRelease Partyに登壇しました🎉"
date: 2020/03/25 14:44:32
postid: ""
tag:
  - Go
  - Goリリースパーティ
  - 登壇レポート
category:
  - Programming
thumbnail: /images/2020/20200325/thumbnail.png
author: 辻大志郎
lede: "こんにちは。TIG の辻です。先日開催された Go 1.14 Release Party に TIG DX ユニットから渋川、辻が登壇しました。今回の Release Party は COVID-19 により初のオンラインでの開催になりました。見逃した方は youtube にアップロードされている動画: https://www.youtube.com/watch?v=IWyDR08pUU4&feature=youtu.be を見てみてください！"
---

## はじめに

こんにちは。TIG の辻です。先日開催された Go 1.14 Release Party に TIG DX ユニットから渋川、辻が登壇しました。今回の Release Party は COVID-19 により初のオンラインでの開催になりました。見逃した方は YouTube にアップロードされている[動画](https://www.youtube.com/watch?v=IWyDR08pUU4&feature=youtu.be)を見てみてください！

Go 1.14 のリリースノートは以下です。

- [Go 1.14 Release Notes](https://golang.org/doc/go1.14)

## 発表1: hash/maphash コードリーディング

<img src="/images/2020/20200325/3.png" class="img-middle-size" loading="lazy">

<img src="/images/2020/20200325/4.png" class="img-middle-size" loading="lazy">

辻さんのコメントにもある、社内のコードリーディングで紹介したGo 1.14で追加されたhash/maphashパッケージについて紹介しました。今回追加された唯一の新パッケージではあるものの、Hashインタフェースを使った使い方もすでにあるものですし、機能もGo内部で文字列やバイト列をハッシュのキーに使うときに使われていたアルゴリズムを公開したものなので、特に真新しさはありません。なので、よくある新パッケージの機能紹介というよりも、コードを読んでいて面白いと思ったところを紹介する、という発表にしました。

<br>

⏩hash/maphashコードリーディング
https://qiita.com/shibukawa/items/d483889731c34d3e5faa

<br>
<br>

もろもろ仕事の締め切りが忙しかったとかもあって、Qiitaのスライドでさっとまとめて資料を作りました。流れとしては、まずテストコードを見てAPIや使われ方を見て、その後内部実装を見ていく、という手順で説明しました。

## 発表2: context の話

<img src="/images/2020/20200325/1.png" class="img-middle-size" loading="lazy">

<img src="/images/2020/20200325/2.png" class="img-middle-size" loading="lazy">

辻からは Go1.14 の context についてお話しました。リリースノートには記載されていないのですが、Go1.14 の context パッケージは内部的な挙動が改善されています。

<script async class="speakerdeck-embed" data-id="25137172b466435089aaa8554307a9a0" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

裏話なのですが、たまたま Go1.14 の context に関する興味深いツイートを見かけ、調べた内容を Qiita の[Go1.14のcontextは何が変わるのか](https://qiita.com/tutuz/items/963a6118cec63a4cd2f3) という記事にしたところ、Release Party の運営チームから登壇依頼をいただきました。ありがとうございます！！(Go に限らず)技術的な改善や拡張があったときに、そもそもの問題の前提や背景を理解し、改善方針の議論を確認することで、新しい技術をより深く理解できると考えています。

## 質疑応答

オンライン上の開催もあって、質疑応答はTwitter上で気になることをツイートし、それに答えていく形式で行われました。辻への質問は Context は社内の Go のコードリーディング会でとりあげていたのもあり、コードリーディング会の取り組みに関する質問をいただきました。オンライン上でも回答したのですが、補足として [Goの標準ライブラリのコードリーディングのすすめ](/articles/20200310/) という記事も書きました。合わせて見てみてください。
