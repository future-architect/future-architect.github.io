---
title: "Go Conference 2021 Autumn にGoの静的解析で登壇しました"
date: 2021/11/22 00:00:00
postid: a
tag:
  - Go
  - GoConference
  - 登壇レポート
  - 静的解析
  - カンファレンス
category:
  - Programming
thumbnail: /images/20211122a/thumbnail.png
author: 辻大志郎
lede: "Go Conference Online 2021 Autumnに登壇しました。Go Conference Autumn には2019年にも登壇しているので、2年ぶり2度目の出場になります。2019年はGoの特徴である並行処理に焦点を当てた、Goによる並列のシミュレーテッドアニーニングの実装、というマニアックな内容でしたが、今回はGoの静的解析、という身近なテーマで登壇しました。"
---
こんにちは、TIGの辻です。渋川、伊藤と同じく [Go Conference Online 2021 Autumn](https://gocon.jp/2021autumn/) に登壇しました。Go Conference Autumn には2019年にも登壇しているので、2年ぶり2度目の出場になります。

2019年はGoの特徴である並行処理に焦点を当てた、[Goによる並列のシミュレーテッドアニーニングの実装](/articles/20191120/)、というマニアックな内容でしたが、今回はGoの静的解析、という身近なテーマで登壇しました。

<img src="/images/20211122a/image.png" alt="image.png" width="1200" height="619">


スライドは以下です。

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/02845f0d6f7d43fc8a2b12b6da677c94" title="Starting static analysis with Go" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 560px; height: 314px;" data-ratio="1.78343949044586"></iframe>

静的解析というと、聞いたことはある。実際 [`golangci-lint`](https://github.com/golangci/golangci-lint) にはめちゃくちゃお世話になっている。ただ、自分でアドホックな静的解析のモジュールを自作するとなると、めちゃくちゃハードル高いんじゃないの？と思う方が多いと思います。しかし、そんなことはありません。本発表では実際に私がはじめて静的解析のモジュールを自作した経験から、静的解析のモジュールを作るのはハードル高くないよ、ということをお伝えしたくて登壇しました。

以下は、静的解析のモジュールを作って、現場で活用できるようになったよ、という記事です。
https://future-architect.github.io/articles/20210603a/

カンファレンスでお伝えしたかったことは以下の2点です。

- Goが提供している順標準ライブラリ(https://pkg.go.dev/golang.org/x/tools/go/analysis)を使おう！
- Goが提供している静的解析のモジュールのコードを参考にしよう！

加えて、静的解析のモジュールを実際に実装するときには、エコシステムのライブラリ( [gostaticanalysis/skeleton](https://github.com/gostaticanalysis/skeleton) など)を使うと、より効率的に開発ができます。今回は時間の関係上割愛しましたが、このあたりのTipsもどこかでお話しできれば、と思います。

今回の発表が静的解析をはじめるみなさんの参考になれば嬉しいです。
