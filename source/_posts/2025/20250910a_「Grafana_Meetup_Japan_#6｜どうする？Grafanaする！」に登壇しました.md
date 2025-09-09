---
title: "「Grafana Meetup Japan #6｜どうする？Grafanaする！」に登壇しました"
date: 2025/09/10 00:00:00
postid: a
tag:
  - Grafana
  - Grafana Alloy
  - 登壇レポート
category:
  - DevOps
thumbnail: /images/2025/20250910a/thumbnail.png
author: 伊藤太斉
lede: "9/2に開催された「Grafana Meetup Japan #6｜どうする？Grafanaする！」にGrafana Alloyのconfig運用というテーマでLT登壇してきたので、参加レポートも含めて記事にします。"
---

こんにちは。TIGの伊藤です。

9/2に開催された「[Grafana Meetup Japan #6｜どうする？Grafanaする！](https://grafana-meetup-japan.connpass.com/event/362953/)」にLTで登壇してきたので、参加レポートも含めて記事にします。当日の[YouTube](https://www.youtube.com/watch?v=IQnWiOQHoM8)もアーカイブ公開されているのでそちらと合わせて読んでいただけると幸いです。

<img src="/images/2025/20250910a/gfarana_meetup_6.png" alt="gfarana_meetup_6.png" width="660" height="371" loading="lazy">

## 自身のLT: Grafana Alloyのconfig運用

今回、私が登壇したネタになります。資料は以下です。

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/2d59638e59f04898857ce369ed20ba87" title="Grafana Meetup Japan Vol. 6" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

### Grafana Alloyの利用経緯

私が今所属しているチームでは、従来EC2で動かしていたアプリケーションをECS on Fargateで稼働するようにリアーキを実施しました。また、合わせて利用していた監視やジョブについても再選定の対象とし、コンテナとの相性、今後の展開性も含めてGrafanaを利用しました。

その時、コンテナから様々なメトリクスデータを収集する時に利用するツールとしてGrafanaと合わせてAlloyを選定しました。

### Alloyの導入の時に考えたこと

AlloyはHCL(HashiCorp Configuration Language)に近い記法で書くことができ、個人的には馴染みが良かったのですが、実際の環境や運用を考えてみると

- アプリケーション
  - Java
  - Go
  - ミドルウェア
- 稼働環境
  - EC2(VM)
  - ECS on Fargate(コンテナ)
- 環境面
  - 本番
  - ステージング
  - 開発

と様々な要因で統合は厳しいと判断しました。

しかし、なるべく省力化を図るために、以下の2つを検討し、実践しました。

### 環境変数で吸収

Alloyには`sys.env`という形で環境変数の値を取得できるライブラリがあります。

- https://grafana.com/docs/alloy/latest/reference/stdlib/sys/

このライブラリを以下の形で使うと、環境変数の値が取得でき、例示している (`LOKI_PUSH_URL`に向けて)ような収集したデータのプッシュ先を変えることができます。

```hcl
loki.write "loki_destination" {
  endpoint {
    url = sys.env("LOKI_PUSH_URL")
  }
}
```

### 起動時にファイルを取得する方法

環境変数で環境面に対応することはできましたが、もう一つ、Alloyが収集する対象のアプリ、ミドルに対しての適用です。

様々なログのパス、メトリクスのパスなどはどうしても環境変数で吸収することは難しいので、ファイルごと分離を行い、Alloyコンテナが起動する時にファイルを取得する形式としました。

<img src="/images/2025/20250910a/Grafana_Meetup_Vol.6.png" alt="Grafana_Meetup_Vol.6.png" width="960" height="540" loading="lazy">

この2つの方法を織り込むことで、複数の環境面、複数の収集対象に適用することができました。

### いただいた質問

当日、質問を募集するslidoにていただいた質問について、当日で回答できなかったので、こちらで回答します。

*Q. Alloyを運用していて、パフォーマンスの問題はありましたか？Otelのcollectorだと、必要なパッケージだけ入れてビルドする、という運用ですが、Alloyはデフォルトで全部盛りと聞いていて、ナレッジあればお願いいたします*
A. 全部盛りであると理解しています。私のチームでも実際にAlloyからMimir、Lokiへ転送しているため、このほかGrafanaのスタックに対しても使えます。

*Q. Alloyは1つのコンテナでメトリクスとログ全て送信していますか？それとも用途によってコンテナを分けていますか？*
A. 今回は1つのコンテナで全てメトリクスもログも収集、送信しています。

*Q. Remotecfgを使っていないという認識で合っていますか？もし使わなかった理由などあればご享受頂けば幸いです。*
A. [`remotecfg`](https://grafana.com/docs/alloy/latest/reference/config-blocks/remotecfg/)は知らなかったです。ドキュメントを見てみたのですが、その過程として[`remote.s3`](https://grafana.com/docs/alloy/latest/reference/components/remote/remote.s3/)というコンポーネントがあるらしく、これを使うと以下のように書けそうです（未検証のため確認が必要です）。

```hcl
remote.s3 "external_config" {
  path = "s3://bucket-name/alloy/config.alloy"
}
```

他にもアクセスキーなどについても設定できそうでした。今回のユースケースであればFargateにタスクロールがついているので、そちらで賄えるのではないかと考えています。

## そのほかのセッション、LT

### Grafanaスタックをフル活用したオブザーバビリティ基盤の紹介

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/46fd2892cc3d48d08e8244c86c4799cb" title="Grafanaスタックをフル活用したオブザーバビリティ基盤の紹介" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

今回のメインセッションであるGO株式会社のQuentinさんによるセッションでした。

GOでは100を超えるマイクロサービスをAWS、およびGoogle Cloud上のKubernetes基盤で稼働させており、これを「Kenos」と呼称しているそうです。

この大きなクラスターを稼働させる上でオブザーバビリティがより重要になってきていましたが、SaaS監視ツールの料金高騰や問い合わせ対応時にツールが分散している煩雑さから、Grafanaのスタックを徐々に自前で導入しています。

規模感は日々ログがTBオーダー、メトリクスやトレースでもGBオーダーと、私も自前で構築をしているものの桁が違いすぎて非常に驚いたこともありますし、さらにその規模を安定して運用されているところが興味深かったです。個人的に改めて納得したポイントではありますが、同じツールでも自前で運用するか、SaaSで展開するかは扱っているデータサイズにも依存していると思いました。ただ、Grafana Cloudもあるので、ある程度運用負荷が高いなどがあれば切り替えることができるのもGrafanaの良さだと感じました。

また、Grafanaの自前運用での振り返りとして話されていたのは、初期の設定の躓きであったり、運用の安定性などについて自身でも気をつけたいところでした。例えば、Grafanaでの障害切り分けをする際に、Grafana自体が過負荷になりサービスダウンしてしまうといったことがあったようで、ここはGrafana自体のチューニングであったり、Loki, Mimirまで含めて設定を洗っておこうと思います。

そのほかの話については以下のブログにも公開されており、見返してみると私もだいぶお世話になったブログでした。

- [LGTM！オブザーバビリティ基盤第1話](https://techblog.goinc.jp/entry/2023/09/12/090000)
- [Grafana Lokiでログを検索 | オブザーバビリティ基盤第2話](https://techblog.goinc.jp/entry/2023/11/17/090000)
- [Grafana LokiのLogQLを理解する](https://techblog.goinc.jp/entry/2024/12/05/183855)

### Grafanaをリバプロ配下で動かすときにやること ~ Grafana Liveってなんだ ~

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/bc80afab6a944b4c9f52e43b0d0633ff" title="【Grafana Meetup Japan #6】Grafanaをリバプロ配下で動かすときにやること ~ Grafana Liveってなんだ ~" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

Grafanaがサクサク、ヌルヌル動く秘密の部分を解説してくれるセッションでした。Grafanaにはストリーミングの機能があり、ここではWebSocketを使っていますが、これをNginxなどのリバースプロキシ経由でどう使うか、使えるようにするか解説されました。
私自身は過去、複数の環境を束ねているNginx越しでGrafanaを触ろうとして方式を変えた記憶があったので、改めてトライしてみようと思いました。

### Grafana MCPサーバーによるAIエージェント経由でのGrafanaダッシュボード動的生成

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/37c7b077d940478a91b28eb3b7180532" title="Grafana MCPサーバーによるAIエージェント経由でのGrafanaダッシュボード動的生成" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

Grafana MCPサーバを実際に使って利用できるダッシュボードを作成するセッションでした。今回はClaudeに対して自然言語で入力、対話を続けていき、最後は

OSS版でも対応している限りMCPサーバは使えるようですので、また試したいものが増えてしまいました。

## イベント中の小話

今回ははGrafana Labsの方もいらっしゃったのですが、なんとついに立ち上がった日本法人の入社初日だったらしく、日本のGrafanaのコミュニティが大きく変わりそうな予感がしました。そんなタイミングであることはもちろん知らなかったのですが、LTをここでできたのは個人的には良かったなと思いました。

## まとめ

今回はLTという形で登壇をしつつイベントに参加しましたが、課題を持って、感じてイベントに参加するとイベント後の懇親会も含めてより有意義になることを改めて感じたので、ちゃんと話題としても持っていこうと思いました。

また、今回は実際にto C向けサービスを運用している立場の声を聞くことができたので、よりどう活かそうか、取り込もうかと考えられたことも大きかったので、自身で取り組んでいる構成も見直そうと思います。

今後の日本におけるGrafanaのコミュニティがより盛り上がるように微力ながら頑張っていけたらと思います。

## 参考

- [Grafana Alloyを使って、EKSクラスタ外部のサーバからメトリクス取得を試してみた](/articles/20250825b/)
