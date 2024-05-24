---
title: "GCP Professional Cloud Network Engineer に合格しました"
date: 2020/09/02 00:00:00
postid: ""
tag:
  - GCP
  - 合格記
  - Network
category:
  - Infrastructure
thumbnail: /images/20200902/thumbnail.png
author: 西田好孝
lede: "今回、GCP の `Professional Cloud Network Engineer` という資格に合格したので、その際の体験を記載しておきます。"
---

# はじめに

今回、GCP の `Professional Cloud Network Engineer` という資格に合格したので、その際の体験を記載しておきます。

<img src="/images/20200902/1_zRKo4d8TLjscKiHqgk6u5w.png" class="img-small-size" loading="lazy">

Cloud Architect の資格の体験記は[こちら](/articles/20190530/)

# Professional Cloud Network Engineer とは？

そもそも何の資格なのか、簡単に特性を記載しておきます。
公式サイトは[こちら](https://cloud.google.com/certification/cloud-network-engineer)。

* GCP のネットワークの知識を問う資格
* 英語のみ
* 日本人の取得者は記事の数からそこまで多くないと想定されます。

# 筆者の前提知識

おそらく自分はかなり前提知識がある状態でのスタートでした。簡単に書くと以下です。

* 実務経験
    * 前職で5年ほど、オンプレのネットワーク構築や技術検証をしていました。
        * パラメータは製品によってまちまちなので、そらでは言えないですが、設計は問題なくこなせるレベル
    * 現職では、GCP上でのアーキテクチャ設計などをネットワークの観点含めて実施しています。
* 保有資格
    * IPA ネットワークスペシャリスト
    * GCP `Professional Cloud Architect`
    * AWS `Solutions Architect Associate`
* 語学
    * 海外旅行程度なら困らないくらい。

# 出た問題

多かった順に書いていきます。

##### オンプレとの接続をどうするのが良いか？

* Interconnect/VPN などの接続方法で適しているのはどれか？
* Routing テーブルの交換
    * 特に BGP に対応していない場合ですね。
        * ポリシーベースとルートベースが選択できますが、どういう時にどっちを使うのか？

##### GKE Native Cluster を作る場合

* Native Cluster を作る際の CIDR 設計
* Private Native Cluster の作成方法

##### GCP のサービスをプライベートで接続する際のオプションは？

* GCP 内の VPC から Bigquery, GCS にプライベートに接続したい場合は、どうすればよいか？
    * 要するに[こちら](https://cloud.google.com/vpc/docs/configure-private-google-access)
* GCP 内の VPC から Cloud SQL にプライベートに接続したい場合は、どうすればよいのか？
    * 要するに[こちら](https://cloud.google.com/vpc/docs/configure-private-services-access)
* オンプレミスのサーバから、BigQuery, GCS にイントラネット経由で通信するためには？
    * 要するに[こちら](https://cloud.google.com/vpc/docs/configure-private-google-access-hybrid)
* これらを押さえておけば、大丈夫でしょう。実際の現場的には、最初の選択肢が主流とは思います。Cloud SQL のプライベート接続は、Firewallを書けないため、逆に脆弱だとすら思います。
    * [こちらの記事](/articles/20190820/) の `2-2` で詳しく触れられています。


##### セキュリティアプライアンスがある場合のルーティング

* 通常はセキュリティアプライアンスに向けて、特定の宛先だけをダイレクトに通信させたい場合はどうするか？
* 逆に、通常はDefault Internet Gateway に向けて、特定の通信だけをセキュリティアプライアンスに向けたい場合はどうするか？

##### CDN関連

* GCS Bucket を CDN で使いたい場合はどんな設定をすればよいか？

##### Load Balancer

* 予想よりも Network Load Balancer が多かった気がします。
    * インターネット経由で VOIP の通信を行うためには、どれが適切か？
        * 基本、音声系は NAT 超えが出来ないので（RTP内にもsrc IP/dst IP情報を持っているから、IP層だけ書き換えると通話が不可能になる）
* GCEで提供されているサービスをカナリーリリースするためにはどうするか？

##### Firewall

* deny のログを残したい場合はどうするか？

##### Cloud Armor

* Global LBで展開しているサービスがあり、特定の通信元からだけ入る様にする場合は、どう構成するか？

##### その他

* 通信が出来なくなった関連のトラシュー問題
* TCP Connection は 3Gbps が上限だが、そこまで出すためにはTCPのフロー制御に関連するパラメータを設定する必要がある。

# 何を勉強したか？

勉強した教材は以下です。

* qwiklabs
    * https://www.qwiklabs.com/quests/46
* 業務
    * GKE Native Cluster
    * VPN 全般
    * SharedVPC
    * VPC Service Controls + Restricted API
    * HTTP(s) LB + (GKE)NEG
* 模擬試験
    * https://googlecloud.4watcher365.dev/practice-exam/en-professional-cloud-network-engineer-exam-v20200227/
    * https://www.testpreptraining.com/google-professional-cloud-network-engineer-gcp-free-practice-test
    * 後は正規の模擬試験のみ
* 参考にしたサイト
    * https://googlecloud.4watcher365.dev/google-cloud/professional-cloud-network-engineer_info/

# どれくらいの期間勉強したか？

* 6月
    * 6月頭に `Professional Cloud Architect` に合格
    * そのまま、`Network Engineer` の正規の模擬試験を受ける
        * この段階で 7割程度
    * 6月は Qwiklabs を受講していた
        * https://www.qwiklabs.com/quests/46
* 7月
    * 前半は上記の模擬試験を解く。
    * 後半はさぼる。
* 8月
    * 前半に復習。
    * 8/19 に合格

# 体感的な正答率

* おそらく、9割くらいは行けたと思います。
    * 確実に合ってると自信があったのが8割。
    * 2択まで絞れているのが2割。（これも選択した理由を答えられるレベルには自信があります）
    * 全くわからないのは 0 でした。
* 個人的には、`Cloud Architect` の方が難しかったです。体感的な正答率も、`Cloud Architect` は『8割程度かな』くらいでした。

# その他

* でも英語は読むのはちょっと大変なので、実は15問/50問くらいのところでもうやめたくなりました。
* 時間配分的には、1:20 くらいで全部解いて、30分くらいで全部見直し、10分余る、くらいでした。
    * この所要時間は、`Cloud Architect` と同じくらいでした。（言語による違いは実際はありませんでした）

# 合格後の特典

やはりありました。`Cloud Architect` とは別なんですね。
<img src="/images/20200902/2020-08-22_220718.png" loading="lazy">
