---
title: "Cloud Build を知ってみよう"
date: 2021/03/15 00:00:00
postid: ""
tag:
  - GCP
  - CloudBuild
  - GitOps
  - DevOps
  - CI/CD
category:
  - DevOps
thumbnail: /images/20210315/thumbnail.png
author: 前原応光
lede: "こんにちは、ゆるふわエンジニアの前原です。本記事では、ビルド周りをよしなにやってくれるCloud Build について紹介したいと思います。"
---
# はじめに

こんにちは、ゆるふわエンジニアの前原です。

[GCP連載2021](/articles/20210307/)です！

本記事では、ビルド周りをよしなにやってくれるCloud Build について紹介したいと思います。

# CI/CD ツールの選択

CI/CD 環境作るときに何を使うか迷う時があると思うんですよね（これに限らずですが）

世の中には、たくさんのツールが溢れてます。

例えば、以下のようなものがあります。

* 自前で用意する系
    * GitLab（クラウド版もある）
    * Jenkins
* クラウド系
    * Cloud Build
    * CircleCI
    * Travis CI
    * Code Build
    * GitHub

要件や取り巻く環境によって選択は変わってくるかと思います。

とはいえ、GCP やAWS を利用している場合は、それらのサービスを利用した方が楽な面が多いです。

例えば、GCP を利用していてCircleCI などの他サービスを利用する場合は、サービスアカウントの発行や、キーの管理などが必要となります。個人的には、ノックアウト要件がない限りは、クラウドサービスに寄せて良いと思っています。

## Cloud Build とは

Cloud Build は、GCP が提供するビルドを行うサービスです。

様々なサービスからソースコードを取得し、ビルドを行い、アーティファクトを生成します。

# 構成について

以下の図のようにCloud Build は、ソース、ビルド、デプロイから構成されています。
ソースやデプロイは、例として記載しています。

<img src="/images/20210315/image.png" loading="lazy">



## ソース

例えば、ソースは、以下から選択することが可能です。

基本的にGitHub 連携が良いと思います。また、Cloud Source Repositories をメインのソース管理として利用することも可能ですが、機能面で劣るので利用ケースは少ないと思っています。

* GitHub（プルリクやPush をトリガに起動可能）
* Bitbucket + Cloud Source Repositories
* GitHub + Cloud Source Repositories

## ビルド

ビルドは、ユーザが自由にビルドステップを作成して実行することも可能ですし、Cloud Build やコミュニティが提供するビルドステップを利用することができます。

* [Cloud Build が提供するビルドステップ](https://github.com/GoogleCloudPlatform/cloud-builders)
* [コミュニティが提供するビルドステップ](https://github.com/GoogleCloudPlatform/cloud-builders-community)

ビルドの構成ファイルは、YAML またはJSON で記述することができます。

### ビルドステップ

ビルドステップは、Cloud Build に実行させたいアクションを定義します。
構成ファイル名は、デフォルト`cloudbuild.yaml`ですが、ビルドコマンド実行時にオプション`-config`で任意のファイル名を指定することも可能です。
以下にサンプルを記載します。

```yaml
steps:
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['set', 'image', 'deployment/mydepl', 'my-image=gcr.io/my-project/myimage']
  env:
  - 'CLOUDSDK_COMPUTE_ZONE=us-east4-b'
  - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/my-project-id/myimage', '.']
```

ざっくりですが、解説します。

* steps: ビルドステップの定義
* name: クラウドビルダーの指定（Docker..etc）
* args: ビルダーに渡す引数を指定
* env: 環境変数の指定

他のフィールドを知りたい場合は、[ビルド構成ファイルの構造](https://cloud.google.com/build/docs/build-config?hl=ja#structure_of_a_build_config_file)を参照してください。

### 高速ビルドの実現

Cloud Build は、キャッシュ機能を備えています。
ちなみに、AWS のCode Build にもローカルキャッシュ、S3 キャッシュがありますね。

Cloud Build は、高速にビルドするためにKaniko キャッシュの機能を備えています。
Kaniko を利用することで、2回目以降のビルドを高速に行うことができます。
[Kaniko](https://github.com/GoogleContainerTools/kaniko) は、コンテナイメージをビルドするGoogle のOSS です。

以下のようにビルド構成ファイルにKaniko を組み込むことができます。

```yaml
steps:
- name: 'gcr.io/kaniko-project/executor:latest'
  args:
  - --destination=gcr.io/$PROJECT_ID/image
  - --cache=true
  - --cache-ttl=XXh
```

* --cache=true: Kaniko キャッシュの有効化
* --cache-ttl=XXh: キャッシュの有効期間の設定

### Docker Hub のRate Limit の回避

ビルドする際に、Docker Hub のRate Limit に引っかかったことはありますか？

私は、AWS のCode Build を利用していた時に引っかかっていました。理由は、無料アカウントで利用していたため、IP アドレスに基づいて制限されていました。
Code Build が利用しているIP = 不特定多数の人が利用している結果、Rate Limit が発生していました。

結局、Code Build を[VPC 接続](https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/vpc-support.html)させ、NAT Gateway 経由でアクセスすることで回避しました。他にも有料 Docker Hub アカウントにする方法やECR を利用する方法もあります。

脱線してしまいましたが、Cloud Build は、VPC 接続させることはできないため、以下の２つが対応策となります。

* 有料のDocker Hub にアップグレード
* Container Registry への切り替え

#### 有料のDocker Hub にアップグレード

主なやることをザックリ記載すると以下です。

* Docker Hub アカウントのアップグレード対応
* Docker Hub にログインするための認証情報をSecret Manger に保存
* ビルド構成ファイルにDocker Hub へのログインステップを記述

#### Container Registry への切り替え

以下を参考にDocker Hub からContainer Registry に移行する必要があります。
個人的には、移行コストなどや運用コストを考えるとDocker Hub のアップグレードが良いと思ってます。

* [サードパーティ レジストリからのコンテナの移行](https://cloud.google.com/container-registry/docs/migrate-external-containers)

Rate Limit に困っている場合は、どちらがベストな対応かを検討し、導入してみてはいかがでしょうか。

## デプロイ

Cloud Build は、以下のサービスに対してデプロイを行うことができます。

* [GKE](https://cloud.google.com/build/docs/deploying-builds/deploy-gke?hl=ja)
* [Cloud Run](https://cloud.google.com/build/docs/deploying-builds/deploy-cloud-run?hl=ja)
* [App Engin](https://cloud.google.com/build/docs/deploying-builds/deploy-appengine?hl=ja)
* [Cloud Functions](https://cloud.google.com/build/docs/deploying-builds/deploy-functions?hl=ja)
* [Firebase](https://cloud.google.com/build/docs/deploying-builds/deploy-firebase?hl=ja)

## 構成パターン

ここではGKE へのデプロイをベースに以下の２つのパターンを例に紹介します。

* CIOps パターン
* GitOpsパターン

### CIOps パターン

Cloud Build のトリガは、GitHub トリガによる自動実行で行われます。

Cloud Build は、GitHub からソースを取得し、ビルドを実行し、コンテナイメージをContainer Registry にPush します。GKE をデプロイする際は、Cloud Build からkubectl でデプロイします。

<img src="/images/20210315/image_2.png" loading="lazy">


### GitOps パターン

CIOps と同様にビルドを実行し、Container Registry にコンテナイメージにPush するところは同様の流れです。アプリのリポジトリの変更を検知して、マニフェストリポジトリにプルリクを行います。

Argo CD は、ポーリングもしくはWebhook により、反映を行います。

<img src="/images/20210315/image_3.png" loading="lazy">

## さいごに

いかがでしたでしょうか？

Cloud Build を用いてどういった構成をとれるのかをイメージすることができたら幸いです。

明日は、松井さんによる [Firebaseで取得したログをBigQueryに連携してユーザー操作をトラッキングする](/articles/20210316/) です。
