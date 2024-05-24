---
title: "Go Tips 連載7:【golangci-lint】lint issueを新たに作り出さないためのTips"
date: 2020/05/25 09:30:35
postid: ""
tag:
  - Go
  - GoTips連載
  - Linter
category:
  - Programming
thumbnail: /images/20200525/top.png
author: 佐藤尚至
lede: "今回はgolangci-lintを取り上げます。Goのコード品質のベースラインを上げる目的でgolngci-lintというlintアグリゲーターを利用されているかたも多いかと思います。コードベースがlint issueのないクリーンな状態に保たれていることが望ましいのですが、必ずしもそういった状態を維持できるとはかぎりません。"
---

<img src="/images/20200525/photo_20200525_01.png" loading="lazy">

[Go Tips連載](/tags/GoTips%E9%80%A3%E8%BC%89/)の第6弾です。

Gopherの佐藤です。今回は`golangci-lint`の軽めのGoTipsネタを取り上げます。

Goのコード品質のベースラインを上げる目的で[golangci-lint](https://golangci-lint.run/)というlintアグリゲーターを利用されているかたも多いかと思います。

コードベースがlint issue(Linterにより検出された問題)がないクリーンな状態に保たれていることが望ましいのですが、必ずしもそういった状態を維持できるとはかぎりません。

例えば以下のような場合、コードベースにlint issueが大量に存在している状態で、`golngci-lint`を利用していかなければなりません。

* 既にあるコードベースにgolangci-lintを新たに適用しようとした場合
* 何らかの理由でbaseブランチ(develop, master etc...)にlint issueが大量に混入してしまった場合

このような場合、いったんbaseブランチに存在しているlint issueを無視して開発を進め、あとでまとめてlint issueの改修を行うというのか定石かと思います。

さて、この暫定対応をしている最中でも、lint issueが混入し続ける可能性があります。既存の大量のlint issueに埋もれて、開発中に新たに生み出してしまったlint issueに気づきにくいためです。

そんなときは、以下のコマンドを打つことで、「baseブランチから作業ブランチ切った断面」の間で新たに生み出してしまってlint issueがないかのチェックができます。

```bash 新たに発生したlint-issueが無いかチェックする
golangci-lint run --new-from-rev=`git merge-base HEAD origin/develop` ./...
```

少しコマンドを解説します。
`git merge-base HEAD origin/develop` は今checkoutしているコミットとbaseブランチ(この場合はorigin/develop)との分岐点となるコミット(merge base)のcommit_idを教えてくれるコマンドです。

これを`golangci-lint`の`--new-from-rev=`オプションに渡してあげると、そのコミット断面から作業ブランチのHEADまでに新たに生み出してしまったlint issueのみがレポートされます。

PullRequestを出す前に、このコマンドでlint issueがないかのチェックをしてあげるとよいのではないかと思います！
