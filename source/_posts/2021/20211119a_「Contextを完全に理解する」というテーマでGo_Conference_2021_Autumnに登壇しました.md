---
title: "「Contextを完全に理解する」というテーマでGo Conference 2021 Autumnに登壇しました"
date: 2021/11/19 00:00:00
postid: a
tag:
  - Go
  - CodeReading
  - GoConference
  - 登壇レポート
  - カンファレンス
category:
  - Programming
thumbnail: /images/20211119a/thumbnail.png
author: 伊藤真彦
lede: "Go Conference 2021 Autumnに登壇させていただきました、リモート登壇です。contextはGoでアプリケーションを実装する上でお世話にならない方が少ないくらいのパッケージだと思います。"
---
TIGの伊藤真彦です

先日[Go Conference 2021 Autumn](https://gocon.jp/2021autumn/)に登壇させていただきました、リモート登壇です。

<img src="/images/20211119a/image.png" alt="image.png" width="100%" height="649" loading="lazy">

発表資料はこちらです。

<iframe src="//www.slideshare.net/slideshow/embed_code/key/4pZJNIRQud0Iy0" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/ssuserebd24d1/go-conference-2021-autumn" title="Go conference 2021 autumn" target="_blank">Go conference 2021 autumn</a> </strong> from <strong><a href="https://www.slideshare.net/ssuserebd24d1" target="_blank">masahiko ito</a></strong> </div>

# contextを発表資料に選定した意義

[context](https://github.com/golang/go/blob/master/src/context/context.go)はGoでアプリケーションを実装する上でお世話にならない方が少ないくらいのパッケージだと思います。

一方使いやすいインターフェースであるため、仕組みをよく分かっていなくてもとりあえず使っておけば機能は実装できます。そういったものを自分自身良く知りたい、学べるコンテンツを作りたい、というモチベーションがありました。

またcontextはgoのパッケージの中では極めてシンプルかつ少ない行数で完結したパッケージです。そしてGoをスマートに実装するテクニック、並行処理の実装方法が少ないコードに詰め込まれています。そのためコードリーディングのコンテンツに適しており、40分の枠内で全てのコードを紹介する事が出来ました。

contextの基礎的な利用方法も発表の前半に組み込むつもりでしたが、[zennの無料書籍](https://zenn.dev/hsaki/books/golang-context)が登場したため、発表はコードの読み取りとそこから得られる知見にフォーカスしました。

# contextのコードリーディングから得られる知見

600行以下のcontextを読むだけで、以下の内容が学べます。

* Interface
* struct(structにstructを埋め込むなど高度なテクニック)
* 型アサーション
* errorを拡張した独自のエラー型
* 並行処理(goroutine, channel, sync.Mutex, sync/atomic)
* internal/reflectlite(発表では流しました)
* 名前付き戻り値

これらにな馴染みが無い方は是非contextの実装を読み込んでみていただければと思います。

# 感想

勉強になる、contextを教材として採用したい、といった反響を頂けました、目的が達成できたという手ごたえを感じることができました。

今回のGo Conferenceは[remo](https://remo.co/)を使ったバーチャル会場が賑わっており、参加者同士のコミュニケーションも楽しむことができました。

また次回も参加できるよう精進します。
