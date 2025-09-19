---
title: "Kiro Meetup Japan #1で発表してきました"
date: 2025/09/19 00:00:00
postid: a
tag:
  - AIエージェント
  - 登壇レポート
category:
  - Programming
thumbnail: /images/2025/20250919a/thumbnail.png
author: 澁川喜規
lede: "Kiro Meetup Japan #1でKiroを使った開発体験について発表してきました。"
---

<img src="/images/2025/20250919a/kiro.png" alt="" width="500" height="231">

先日[Kiro Meetup Japan #1](https://findy.connpass.com/event/365956/)でKiroを使った開発体験について発表してきました。第一回ということで、ネタ被りとかないかドキドキしながら「普通のKiroの感想」を話ししてきたのですが、意外と被らなかったですね。オンライン・オフライン合計で応募人数が1200人を超えるような(実数はそこよりも下ですが)大人気ぶりでした。

<iframe class="slideshare-responsive" src="https://www.slideshare.net/slideshow/embed_code/key/1L2DrqwOGZwCpg?hostedIn=slideshare&page=upload" width="714" height="600" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"></iframe>

Kiroは生成AIエージェントを組み込んだ開発環境かつ、ワークフローやInstructionなどを頑張らなくても最初から使えるようにチューニングされているため、初めての人にもおすすめですよ、というお話をしてきました。

もちろん、「スイッチぽん」でご飯が炊ける炊飯器とは異なり、いくら自動とはいえ、いろいろなハンドリングは必要なわけで、完全お任せで欲しいソフトウェアがどんどんできるというものではなく、「生成AIエージェントを使って開発する」という新しいノウハウは必要となります。そのあたりの内容と、そのノウハウはまさに今みんながワイワイ検証したりして貯めているところなので、その話題に乗っていくのは楽しいよ、というのが発表の要旨です。

ちなみに、スライドにも書いていますが、発表をOKして準備し始めたぐらいにアカウントがロック？されて使えなくなり、Waiting Listには並んでいるのですが未だに利用の再開ができていません。

そんなこともあり、エージェント間でinstructionの設定(AGETNS.mdとかCLAUDE.mdみたいなやつ)、追加のinstruction、カスタムコマンドなどを[エージェント間で共有するツール](https://github.com/shibukawa/anyagent)を作ったりして、いろんなエージェントを切り替えられるようにしたりしています。クオータ使い切った系とかは結構発生しがちなので・・・日のリミット(Kiro)、週のリミット(Codex)とか月のリミット(Q Developer, GitHub Copilot)にヒットしたときや障害でつながりにくいときとかにさっと切り替えるというのが今は大事かなと。あるいは、今回はKiroがエラーで使えなくなって仕方なくQ Developerに切り替えて開発したとスライドにも書きましたが、得意な分野にあわせてツールを使い分ける未来もありですね。

使えたのは1月ほどでしたが、楽しい体験は得られたので、早くアカウント復活してほしいです。
