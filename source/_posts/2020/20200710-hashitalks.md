---
title: "HashiTalks: Japanに登壇しました"
date: 2020/07/10 10:19:54
postid: ""
tag:
  - Terraform
  - HashiTalks
  - GoogleCloud
  - 登壇レポート
category:
  - DevOps
thumbnail: /images/2020/20200710/thumbnail.png
author: 伊藤太斉
lede: "本記事の内容はHashiTalks: Japanに登壇したのでその時に話したことを書いていきます。大きめなイベントには初の登壇だったのでなかなかドキドキしましたが、なんとかやりきりました。"
---

<img src="/images/2020/20200710/top.png" loading="lazy">

## はじめに

こんにちは。TIG/DXユニットの[伊藤](https://twitter.com/kaedemalu)です。最近Terraformネタが多くなってきました。さて、本記事の内容はHashiTalks: Japanに登壇したのでその時に話したことを書いていきます。大きめなイベントには初の登壇だったのでなかなかドキドキしましたが、なんとかやりきりました。

## HashiTalks: Japanとは

[イベントページ](https://events.hashicorp.com/hashitalksjapan)から言葉を拝借すると、
> HashiTalksは、HashiCorpのツールやコミュニティに焦点を当てたユニークなユースケースやデモをコミュニティメンバーから共有する機会です。

といった感じで、コミュニティベースのイベントになっています。参加者は普段使っている時のナレッジから企業で実践している例などがあり、幅広い内容を取り扱っています。今回のタイムテーブルではTerraformがほどんどそ占めておりますが、中にはConsulとかVaultなどもありました。この辺のツールのちゃんと扱えるようにしたいですね。

## 何を発表したか

私自身は「Cloud MonitoringとTerraformの付き合い方」と題して、TerraformでCloud Monitoringのリソースを作成・管理するときのことをテーマにしました。スライドは以下になりますので、見ていただければと思います。ここからは話した内容のサマリになります。

<script async class="speakerdeck-embed" data-id="01797d2feb8b41359be8138a65170819" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

### 監視設定の大変さ

Terraformは各クラウドプロバイダーのリソースをコードで管理できるInfrastructure as Code(IaC)を実現するツールとして使われています。AWSのCloudFormation、GCPのDeployment Managerではなくクラウドに依存しないツールとしてマルチクラウド戦略を行うところではTerraformを採用されているのではないでしょうか？
基本的にクラウド(今回ではGCP)のリソースは全てTerraformで管理されていることが望ましく、それは監視ツールであるCloud Monitoringも例外ではありません。特に私が大変だと感じているのは特定のメトリクスを抽出するためのフィルターです。

```tf
resource "google_monitoring_alert_policy" "someone_alert_policy" {
  ....
  conditions {
    condition_threshold {
      aggregations {
	....
        filter = "metric.type=\"agent.googleapis.com/disk/percent_used\" resource.type=\"gce_instance\" metric.label.\"state\"=\"used\" metric.label.\"device\"=\"rootfs\" metadata.user_labels.\"name\"=\"sample-instance-1\""
        ....
      }
    }
  }
}
```

このように複数の条件を重ねて書くことはとても大変であるので、私はコード化にTerraformerを使っています。

### Terraformerの使いどころ

TerraformerはGCPに限らず、AWSなどのメジャークラウドに存在するリソースをコマンド1つでコードに落とせる便利なツールです。とても便利ではある反面、Terraformでのリソース名はわかりにくいものになっています。

```tf
resource "google_monitoring_alert_policy" "tfer--projects--project-name--alertPolicies--17320504" {
  ....
  conditions {
    condition_threshold {
      ....
    }
  }
}
```

基本的には`terraform state mv`コマンドを実行してリソース名を変更するかと思いますが、一通り作り切ってからこのコマンドを実行するのもそれなりに時間がかかります。私は、監視のTerraformのコードは特に再利用性が高いと思っており、それであれば雛形として最低限作成して、展開することで時間の節約になったり、コードの変更を最低限で抑えられると考えています。

### セキュリティに気をつけたい

Cloud Monitoringにはアラート設定をしたときに、その通知先をメールやSlackにできます。しかし、SlackのTokenやメールアドレス自体をコード上にハードコードすることは避けなければいけません。Tokenなどを守る方法としては

- tfvarsで逃す
- Vaultを使う
- Secret Manager

などがあるので、これらを使えばコードとして書かざるを得ない状況は回避できます。しかし、今回は「**コードにはしないけど、リソースとしてはある**」状態を目指してちょっと安全にTerraformでリソースを管理する方法を考えてみます。

```tf
resource "google_monitoring_alert_policy" "someone_alert_policy" {
 ....
  display_name = "use-80-percent-resource-disk"

  enabled               = "true"
  notification_channels = [
    google_monitoring_notification_channel.slack_channel_1.id, # チャンネルがコード化されている
    "projects/project-name/notificationChannels/0123456789",   # チャンネルがコード化されていない
  ]
  project               = "project-name"
}
```

上の`notification_channel`ではコード化している部分としていない部分を示しています。IDで書かれている部分では、チャンネル自体はコード化されていないが、アラートの通知先として指定しているので、「コードにはしないけど、リソースとしてはある」状態を達成できているのではないでしょうか。このようにコードにせず、クラウド側で担保することで少し安全にコードにできていると考えています。
しかし、これも将来的には先述した、VaultやSecret Managerを使うなどして管理することも視野に入れたいですね。

## まとめ

今回発表したことはTerraformとGCPを組み合わせて以来、ずっと直面している問題で、発表するに当たって、自分の中で1つの答えになったかなと思っています。Terraform Associateを取ったり、こういった登壇する挑戦で少しづつではありますが、自分の自信に繋がっているので、今後も発信は媒体に関係なく続けていきたいなと思います。

最後にこちらが話しているYouTubeになりますのでよければご覧ください。
[Cloud MonitoringとTerraformの付き合い方 - YouTube](https://www.youtube.com/watch?v=SiCCwE9a1iY&list=PL81sUbsFNc5aWJJrpaclnwARJAzf1-2bV&index=14&t=0s)
