---
title: "GCPインスタンスを自動で停止させるツールの公開"
date: 2019/07/16 09:12:58
postid: ""
tag:
  - GCP
  - Kubernetes
category:
  - Infrastructure
author: 真野隼記
lede: "GCPのインスタンス（GCE, SQL, GKE）を自動で停止させるGoで書かれたツールをGitHubに公開しました。"
---
# はじめに

こんにちは、TIG DXユニットの真野です。2019年時点ではフューチャーに入社して9年目、主にバックエンド側の設計や開発をしています。

> TIG: Technology Innovation Groupの略で、フューチャーの中でも特にIT技術に特化した部隊です。
> DXユニット: TIGの中でも特にデジタルトランスフォーメーションに関わる仕事を推進していくチームです。

GCPのインスタンス（GCE, SQL, GKE）を自動で停止させるGoで書かれたツールをGitHubに公開しました。
https://github.com/future-architect/gcp-instance-scheduler

このツールの実装はアルバイト社員の[donkomura](https://qiita.com/donkomura)さんが主体的に開発を進めていただいました。
別の機会にdonkomuraさんにはアルバイトブログを書いてもらおうと思うので、工夫した点などはそこで述べてもらおうと思います。

このツールを用いてGCPを利用しない時間帯を上手く指定することで、クラウドの運用費用を節約できます。


# ツールの概要

`state-scheduler:true` というラベルがついた、GCE, SQL, GKEなどのインスタンスを停止します。
GKEの場合は、ノードプールを構成するインスタンスグループのサイズを0にすることで実現します。

定期的なシャットダウンを避けたい場合は、`state-scheduler:false`と指定すれば、対象から除外させることもできます。

構成は下図の通り、Pub/SubトリガーのCloud Functionとして動作します。

<img src="/images/20190713/photo_20190713_01.png" loading="lazy">

起動タイミングはCloud Schedulerで制御する構成です。
そのため、「0 21 * * *」のようにCRON形式でスケジュールを定義すれば、毎日21時に停止させることができます。

ちなみに、Cloud FunctionをHTTPトリガーにせずPub/Subを挟んでいる理由は、認証を挟みたかったためです。 [^1]

 [^1]: 参考: https://cloud.google.com/scheduler/docs/start-and-stop-compute-engine-instances-on-a-schedule


# デプロイ方法

ツールのデプロイ手順を1~3の順に説明します。


## 1. ラベルの設定

停止したいインスタンスのラベルに `state-scheduler:true` を設定する必要があります。
ラベルの設定はもちろん管理コンソールから手動で行っても良いですし、下記のようなgcloudコマンドでも設定できます。

```sh
# GCE
gcloud compute instances update <insntance-name> \
  --project <project-id> \
  --update-labels state-scheduler=true

# Cloud SQL (master must be running)
gcloud beta sql instances patch <insntance-name> \
  --project <project-id> \
  --update-labels state-scheduler=true

# GKE
gcloud container clusters update <cluster-name> \
  --project <project-id> \
  --zone <cluster-master-node-zone> \
  --update-labels state-scheduler=true
```


## 2. Cloud Functionのデプロイ

デプロイには [gcloud](https://cloud.google.com/sdk/gcloud/) が必要ですのでインストールしておきます。

```sh
# Download
git clone https://github.com/future-architect/gcp-instance-scheduler.git
cd gcp-instance-scheduler

# Deploy Cloud Function
gcloud functions deploy ReceiveEvent --project <project-id> \
  --runtime go111 \
  --trigger-topic instance-scheduler-event
```

## 3. Cloud Schedulerの設定

最後にスケジューラの設定を行います。

今回は仮に、「毎日21時」に停止することにします。タイムゾーンをUTCにしたい場合は適時書き換えください。

```sh
# Create Cloud Scheduler Job
gcloud beta scheduler jobs create pubsub shutdown-workday \
  --project <project-id> \
  --schedule '0 21 * * *' \
  --topic instance-scheduler-event \
  --message-body '{"command":"stop"}' \
  --time-zone 'Asia/Tokyo' \
  --description 'automatically stop instances'
```

以上で適用できました。
これで、毎日21時に指定したインスタンスのシャットダウンが行われます。

テキストでは長いですが、コマンド数として少ないので簡単に適用できると思います。


# こぼれ話（ツール設計について）

このGCP停止ツールの特徴として、Goの[GCP SDK](https://godoc.org/cloud.google.com/go)経由でインスタンスの制御を行っています。

これには理由があって、当初は、インフラ構築をTerraformで行っていたため、インスタンスのステータスを[override variables](https://www.terraform.io/docs/configuration/override.html)で上書いた上で、terraform applyによって停止させる想定でした。
この方式だと、既存のTerraform資産を活かしつつ手堅く実装できるんじゃないかという目論見です。

しかし、実は費用がかかっていたのはTerraform管理対象外である、サンドボックス的なDevelopment環境であったことが判明。
そこで方向転換し、Terraform定義が無い環境においても稼働できるように、GCPのAPIを直接呼び出すことによってシャットダウンすることにしました。

通常だとgcloudコマンドでガンバリそうですが、レポーティング機能やSlack連携機能が将来的に求められそうだったので、Goで開発することにしました。

結果として、個人的なプライベートの小さなGCP環境にでも簡単に適用できるので、これはこれで良かったなと思っています。


# 今後

まだまだ、稼働し始めたところで作りが甘いところがあり、継続的に改善していきます。
例えば、2019年7月時点では以下のような面を機能拡張していこうとなっています。

* 停止したインスタンスや、停止をスキップしたインスタンス数のSlackへの通知
* 停止処理の高速化（並列化）
* インスタンスの再起動機能の追加

今後も有益だと思われるツールはドンドン公開していこうと考えています。

この記事が少しでも皆さんの役にたてば幸いです。




