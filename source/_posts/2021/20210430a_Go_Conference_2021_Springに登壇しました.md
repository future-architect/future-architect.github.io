---
title: "Go Conference 2021 Springに登壇しました"
date: 2021/04/30 00:00:00
postid: a
tag:
  - Go
  - GoConference
  - 登壇レポート
  - TCP/IP
  - カンファレンス
category:
  - Programming
thumbnail: /images/20210430a/thumbnail.png
author: 辻大志郎
lede: "こんにちは、辻です。先日開催されました [Go Conference 2021 spring] にTIGから渋川、辻の計2名が登壇しました。Go Conference'20 in Autumnではオンラインとオフラインのハイブリッドな構成でしたが、今回はGo Conference史上初となるフルオンラインでの開催となりました。"
---
## はじめに

こんにちは、辻です。先日開催されました [Go Conference 2021 spring](https://gocon.jp/) にTIGから渋川、辻の計2名が登壇しました。

<img src="/images/20210430a/logo_text.png" alt="gopher忍者" width="1200" height="558" loading="lazy">

> The Gopher character is based on the Go mascot designed by Renée French.

[Go Conference'20 in Autumn](https://sendai.gocon.jp/)ではオンラインとオフラインのハイブリッドな構成でしたが、今回はGo Conference史上初となるフルオンラインでの開催となりました。今回のカンファレンスでは事前録画したビデオによる発表もサポートされていました。またオンラインでのリアルタイム登壇にあたって、リハーサルを始め手厚いサポートをいただき、安心して発表することができました。運営の皆様、ありがとうございました！

### 実務で役立つTCPクライアントの作り方

発表資料は以下です。

<script async class="speakerdeck-embed" data-id="340854fb6cf14990bfe4daa1d1c11efb" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

発表内容は、TCPクライアントを実装するときの考慮点をまとめたものです。普段HTTPなどを用いて通信するときはGoの標準ライブラリである `net/http` パッケージのAPIを使います。自前で `net` パッケージを使ってTCPクライアントを実装する必要はありません。しかし標準ライブラリではサポートされていないTCP上の独自のプロトコルで通信する必要がある場合や、通信したいプロトコルがOSSとして公開されているライブラリでは不足がある場合などは、自前でTCPクライアントを実装する必要があります。Go Conferenceの他のセッションでも、金融系のプロトコルである[ISO8583](https://ja.wikipedia.org/wiki/ISO_8583)をTCPで扱っている例が紹介されており、実は身近なところで独自のTCPクライアントが必要になるかもしれません。

Goでは `net` パッケージを使うと簡単にTCPクライアントを実装できますが、プロダクションレディなTCPクライアントに仕上げていくにはいくつか考慮点があります。

* タイムアウト
* コネクションプーリング
* エラーハンドリング
* リトライ

といったポイントを紹介しています。

セッションを見ていただいた皆様、twitterでコメントくださった皆様、ありがとうございました！

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">Goでソケットを直接触る機会、ありそうでなかなかないのでこういった知識の復習大事 <a href="https://twitter.com/hashtag/gocon?src=hash&amp;ref_src=twsrc%5Etfw">#gocon</a> <a href="https://twitter.com/hashtag/goconA?src=hash&amp;ref_src=twsrc%5Etfw">#goconA</a></p>&mdash; castaneai (@castanea) <a href="https://twitter.com/castanea/status/1385837483384995841?ref_src=twsrc%5Etfw">April 24, 2021</a></blockquote>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">コネクションプーリングしていてそのコネクションが悪くなっていることがあるって怖いね。<a href="https://twitter.com/hashtag/gocon?src=hash&amp;ref_src=twsrc%5Etfw">#gocon</a> <a href="https://twitter.com/hashtag/goconA?src=hash&amp;ref_src=twsrc%5Etfw">#goconA</a></p>&mdash; Kabo (@kabochapo) <a href="https://twitter.com/kabochapo/status/1385841331365310464?ref_src=twsrc%5Etfw">April 24, 2021</a></blockquote>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">TCP面白かったです！！！<a href="https://twitter.com/hashtag/gocon?src=hash&amp;ref_src=twsrc%5Etfw">#gocon</a> <a href="https://twitter.com/hashtag/goconA?src=hash&amp;ref_src=twsrc%5Etfw">#goconA</a></p>&mdash; luccafort (@luccafort) <a href="https://twitter.com/luccafort/status/1385841179648872452?ref_src=twsrc%5Etfw">April 24, 2021</a></blockquote>

<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

