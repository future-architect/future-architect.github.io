---
title: "Migrate for Anthos を基礎から学ぶ"
date: 2021/03/22 00:00:00
postid: ""
tag:
  - GCP
  - クラウドマイグレーション
  - Anthos
category:
  - Infrastructure
thumbnail: /images/20210322/thumbnail.png
author: 村田靖拓
lede: "前回は越島さんによる分かりやすい Anthos 概要紹介記事でしたが、今回も前回に続いての Anthos ネタです"
---

# はじめに
こんにちは、TIGの[村田](https://twitter.com/famipapamart)です。

[GCP連載2021](/articles/20210307/)の第10弾です。[前回](/articles/20210319/)は越島さんによる分かりやすい Anthos 概要紹介記事でしたが、今回も前回に続いての Anthos ネタです。

※本記事の情報は 2021.03.21 時点での情報であり、サービスの対応状況などは更新される可能性があります。

# 前説

さて、昨今 DX だとかなんだとか飛び交う単語は色々ありますが、個人的に思う今求められるポイントはズバリ「変更容易性」なんじゃないかなと日々思いながら仕事をしています。（もちろん他にも大切な要素はたくさんありますし、文脈によって優先すべきポイントが変わるのというのは前提で）

それこそいま世界で走っている様々なプロジェクトはこの変更容易性を意識した設計・実装になっている、あるいはそうなるように推進されているかなと思います。新規実装であればそれでよいです。でも既存システムの場合はどうでしょう？既存システムは必ずしも変更が容易な形で作られているとは限りません。でも2025年の崖なんて言葉もそろそろ浸透しつつある中、なんとかこのタイミングで将来を見据えたシステムにアップグレードしたいと思っている企業はたくさんあります。例えば既存システムをコンテナ基盤に移行したいという要望もその一つです。しかし先に述べたように既存システムをコンテナ基盤に移行したいと言っても簡単にはいかなかったりします。

そんな悩みを解決してくれそうなサービスが最近私の視界の端っこでチラチラとサイドステップしているので、今回は皆さんに紹介したいと思います。

# Migrate for Anthosとは
Migrate for Anthos とは Google Cloud が提供するサービスのひとつで、端的に言えば **仮想マシン上で動くアプリケーションをまるごとコンテナ化** してくれます。

より詳細に言えば、 VMware オンプレミス・AWS・Azure のいずれか、または GCP 上の Compute Engine に存在するワークロードを、 Google Kubernetes Engine（GKE）または Anthos 上で動作するコンテナに変換することができます。

# Migrate for Anthos の機能

## Migrate できるものとできないもの
まずは[互換性のある VM オペレーティングシステム](https://cloud.google.com/migrate/anthos/docs/compatible-os-versions)を公式サイトにて確認しておきましょう。Linux、Windows それぞれ対応している OS およびそのバージョンが記載されています。

Linux については GCP・AWS・Azure 上の VM インスタンスもしくは VMWare インスタンスが対象となっているのに対し、 Windows は GCE のみの対応でオンプレミスなどからの移行には現状対応していません。

## Migrate に必要なもの
Migrate for Anthos のコンポーネントを実行するためには GKE あるいは Anthos クラスタが必要です。

>You can use a Google Kubernetes Engine (GKE) or Anthos processing cluster **located in the Google Cloud or on-prem.**

[公式Doc](https://cloud.google.com/migrate/anthos/docs/setting-up-overview)では上記のように記載がありますが、 [Anthos clusters on AWS への移行](https://cloud.google.com/migrate/anthos/docs/migration-prerequisites-aws)もプレビュー状態ですが公開されているので、 Anthos clusters on ◯◯ に順次対応していくだろうと予測しています。

前項で対応している VM ソースプラットフォームについて言及しましたが、おそらくこの仕様に引っ張られる形で対応するプラットフォームが決まってるのではと思います。つまり、 Anthos clusters の展開に合わせて対応する移行元プラットフォームが増えていくと期待され、 昨年GAとなった Anthos clusters on bare metal まで対応が進んでいけば Migrate 対象の自由度は今後もっと上がっていくのではないかと妄想しています。

## Migrate の概要
Migrate プロセスは大きく分けて3つのプロセスに分かれます。

* 移行元の特定
* 移行処理クラスタの作成
* 移行したワークロードのデプロイ

各々について次項以降でそれぞれ説明していきます。

# Migrate に向けた準備の具体的なステップ

## 移行元の特定
ワークロードの移行元プラットフォームに応じて必要なものが変わってくるので、まずは移行元を確認することから始めます。

| 移行対象OS | 移行元 | 移行先 | 必要なもの |
| :---: | :---: | :---: | :---: |
| Linux / Windows | GCE | GKE / Anthos on Google Cloud | Migrate for Anthos |
| Linux | VMware / AWS/ Azure | GKE / Anthos on Google Cloud | Migrate for Compute Engine と Migrate for Anthos |
| Linux | VMware | Anthos clusters on VMware | Migrate for Anthos|
| Linux | AWS | Anthos clusters on AWS | Migrate for Anthos|
| Windows | GCE以外 | GKE / Anthos on ◯◯ | Migrate for Compute Engineを使って一旦GCE化 |


## ワークロードの Migrate 適正診断
Migrate のために必須というわけでは無いのですが、事前にワークロードのコンテナ移行に対する適合性をセルフ診断できるツールが提供されています。ツールは Linux 向けと Windows 向けでそれぞれ用意されていますが、現状はそれぞれの動作が微妙に異なるようです。

### Linux 向け診断ツール
Linux 向け診断ツールは以下の2フェーズに分かれています。

* 収集フェーズ
* 分析フェーズ

収集フェーズでは移行対象の VM に関する情報を収集し、分析フェーズでは収集した情報をもとに 0~10 の適合性スコアと詳細なレポートを出力してくれます。移行対象の VM がたくさんある場合は、収集ツールを各 VM で実行の上、すべての収集データを一括で分析することができます。

詳細なスコアの見方は[このページ](https://cloud.google.com/migrate/anthos/docs/linux-assessment-tool)に記載がありますが、例えばスコアが 0 の場合は Migrate には適合してないことになり、逆に 10 の場合は適合度が高いです。

※ちなみに、公式ドキュメントでは例えばスコアが 7~8 の場合に `手動での作業が若干必要になります` との記載がありましたが、これが移行前準備における手動作業を指すのか移行後の作業を指すのかが紐解ききれませんでした...分かる方いたらコメントくださいmm

### Windows 向け診断ツール
Windows 向けの診断ツールは Linux 向けに比べて簡素に結果を判定してくれます。診断後は、その VM が移行に適しているかどうかを示す zip ファイルが出力されるのですが、不適合な VM の場合はファイル名に `NOFIT` と表記され、適正のある VM の場合にはその文字列はありません。

## 移行処理クラスタの作成
Migrate for Anthos の実処理を行う GKE あるいは Anthos クラスタの設定を進めていきます。
<img src="/images/20210322/setting-up-workflow.png" loading="lazy">

※図は[こちらの公式Doc](https://cloud.google.com/migrate/anthos/docs/setting-up-overview)から拝借しました

基本は1本道ですが、1箇所だけフローに分岐があります。 Migrate for Compute Engine のセットアップをするかどうかです。

>VMware、AWS または Azure から移行する場合は、Migrate for Compute Engine コンポーネントを設定します

[公式Doc](https://cloud.google.com/migrate/anthos/docs/setting-up-overview)では上記のような記載があり、GCP以外の環境から移行したい場合には Migrate for Compute Engine のセットアップが必要だと分かります。ただ、これは文字通りワークロードを GCE へ Migrate したい場合に使うものであり、Migrate が各プラットフォームの Anthos clusters 内で完結する場合には設定不要です。

### 移行環境ごとの前提条件確認
OS および VM ソースプラットフォームがサポートされているものかどうか確認し、必要に応じて Migrate for Compute Engine を設定します。

また、 GCP 以外のプラットフォームにて処理クラスタを構築する場合（Anthos clusters for ◯◯ を使う場合）はクラスタの構成に関していくつかの条件があるので要確認です。 Anthos clusters と Google Cloud を繋ぐ [Connect](https://cloud.google.com/anthos/multicluster-management/connect/overview) のインストールは必須ではないですが、インストールしておけば移行時に Cloud Console のロギングおよびモニタリング機能を使うことができます。

### データリポジトリの準備
Migrate for Anthos は、移行に際して以下2種のデータリポジトリに対してデータ書き込みが発生します。

* Docker イメージファイルレジストリ
* 移行アーティファクトリポジトリ

Docker イメージファイルレジストリには、移行された Linux VM の情報が Docker イメージファイルとして Docker レジストリに書き込まれます。これは Windows VM のワークロードを移行する際には必要ありません。また、移行アーティファクトリポジトリには、移行されたワークロードをデプロイするための YAML ファイルなどが配置されます。

これらのデータリポジトリは、処理クラスタの作成プラットフォームに応じて変化します。

| プラットフォーム | Docker イメージファイルレジストリ | 移行アーティファクトリポジトリ |
| :---: | :---: | :---: |
| GKE/ Anthos on Google Cloud | デフォルトは GCR | デフォルトは GCS |
| Anthos clusters on VMware | GCR または任意の Docker レジストリを指定する | GCS または S3 を指定する |
| Anthos clusters on AWS | ECRを指定する | GCS または S3 を指定する |

各データリポジトリの実体の作成は後述の migctl コマンド経由で行うので、この段階では何を使うかのみ決めておけばOKです。

### Google サービス API の有効化とサービスアカウントの設定
Google Cloud のリソースへのアクセスが発生するパターンでの Migrate を実施する際には、 Google サービス API の有効化およびサービスアカウントの設定が必要です。

Google Cloud への Migrate を行う場合に有効化する Google サービス API は以下です。

* Service Management API
* Service Control API
* Cloud Resource Manager API
* Compute Engine API
* Kubernetes Engine API
* Google Container Registry API
* Cloud Build API

また、以下の場合には該当するサービスアカウントの作成も必要になります。

* データリポジトリにGCRあるいはGCSを利用する場合
    * Container Registry と Cloud Storage へのアクセスで使用するサービスアカウント
* 移行元ソースとしてGCEを利用する場合
    * Compute Engine へのアクセスで使用するサービスアカウント

### Migrate for Compute Engineの設定
先述の通りですが、Google Cloud 以外のプラットフォームから Google Cloud への Migrate を実施したい場合には、この Migrate for Compute Engine の設定が必要になります。このパートでは細かい設定手順は割愛しますが、[公式Doc](https://cloud.google.com/migrate/compute-engine/docs/4.11/getting-started)に従って Migrate for Compute Engine Manager のインストールを完了させます。

### 処理クラスタの作成
利用するプラットフォームごとに必要な設定が異なるので、移行要件に沿って適切な手順を選択します。どの手順を選んだとしても、必要な設定を組み込んだ GKE クラスタあるいは Anthos クラスタを作成する流れとなります。

#### Linux VM を移行する場合

* [処理クラスタとして **GKE または Anthos on Google Cloud** を使用する場合](https://cloud.google.com/migrate/anthos/docs/configuring-a-cluster)
* [処理クラスタとして **Anthos clusters on VMware** を使用する場合](https://cloud.google.com/migrate/anthos/docs/configuring-onprem-cluster)
* [処理クラスタとして **Anthos clusters on AWS** を使用する場合](https://cloud.google.com/migrate/anthos/docs/configuring-aws-cluster)

#### Windows VM を移行する場合

* [処理クラスタとして GKE クラスタを使用する場合](https://cloud.google.com/migrate/anthos/docs/configuring-win-cluster)

### Migrate for Anthos のインストール
migctl コマンドを使用して、作成済みの処理クラスタへ Migrate for Anthos コンポーネントをインストールします。

| プラットフォーム | migctl の実行方法 |
| :---: | :---: |
| GKE/ Anthos on Google Cloud | Cloud Shell で実行可能 |
| Anthos clusters on VMware | 管理ワークステーションにコマンドをインストールする |
| Anthos clusters on AWS | 管理ワークステーションにコマンドをインストールする |

#### migctl とは
migctl は Migrate for Anthos 移行環境の設定と管理を行うコマンドラインツールで、例えば以下のようなオペレーションを実行できます。

| コマンド | 説明 |
| :---: | :---: |
| artifacts-repo | アーティファクト リポジトリを構成する |
| docker-registry | Docker レジストリを構成する |
| doctor | Migrate for Anthos のデプロイ ステータスと関連する構成の確認 |
| migration | 移行オペレーション |
| setup | Migrate for Anthos のインストール / アンインストール |

#### migctl のインストール
GCP 外の環境の場合にはまず以下コマンドで管理ワークステーションに migctl コマンドをインストールします。

```sh
$ wget https://anthos-migrate-release.storage.googleapis.com/v1.6.2/linux/amd64/migctl
$ sudo cp migctl /usr/local/bin/
$ sudo chmod +x /usr/local/bin/migctl
$ . <(migctl completion bash)
```

GCP 環境では Cloud Shell にて migctl コマンドを実行可能なためこの手順はスキップできます。

#### Migrate fot Anthos コンポーネントのインストール
次に以下コマンドで処理クラスタにコンポーネントの実体をインストールします。

```sh
$ migctl setup install --<Your Target Platform>
```

`<Your Target Platform>` の部分は例えば AWS の場合は `gke-on-aws` となります。

インストール後には `doctor` コマンドでインストールの進捗状況を確認することができます。

```sh
$ migctl doctor
  [✓] Deployment
  [!] Docker registry
  [!] Artifacts repo
  [!] Source Status
```

**データリポジトリの準備** の章で記載しましたが、処理クラスタに応じてデータリポジトリを定義する必要があり、[手順](https://cloud.google.com/migrate/anthos/docs/data-repos)に沿ってデータリポジトリを migctl コマンド経由で作成していきます。

データリポジトリ設定後に期待される `doctor` コマンドの応答は以下です。

```sh
$ migctl doctor
  [✓] Deployment
  [✓] Docker registry
  [✓] Artifacts repo
  [!] Source Status
```

# ワークロードの Migration とデプロイ
※本章では Linux VM の移行を前提として記載を進めます。

## ワークロードの Migration
<img src="/images/20210322/image.png" loading="lazy">

※図は[こちらの公式Doc](https://cloud.google.com/migrate/anthos/docs/migrating-linux-vm-overview)から拝借しました

移行作業自体は migctl を順繰りに叩いていくことになりますが、大きくは上図に記載された5つのステップに分割されます。

* 移行元を追加する（Add a migration source）
* 移行を作成する（Create a migration）
* 移行計画をカスタマイズする（Customize the migration plan）
* 移行を実行する（Execute the migration）
* 移行をモニタリングする（Monitor the migration）

移行作業のゴールは、移行元から抽出したアプリケーションを元にアーティファクトを作成することです。具体的には以下の2つが実行されます。

* 抽出したワークロードから Docker イメージを作成し、 Docker イメージファイルレジストリ（ex.GCR）へコピーする
* デプロイする際に使用する構成ファイル（YAML ファイル）を作成し、移行アーティファクトリポジトリ（ex.GCS）へコピーする

一連の作業はひとつの `migration` プロセスとして管理され、 `migctl migration create` コマンドで作成されます。このコマンドの引数では例えばステートレスやステートフルなどの「移行対象のVMの性質」を指定することができ、それにより後に作成される構成ファイル（Kubernetes manifest）にてアプリを Deployment として定義するか Statefulset として定義するかが決定されることになります。

最終的に以下のようにアーティファクト生成の完了が確認できれば成功です。

```sh
$ migctl migration status my-migration

NAME            CURRENT-OPERATION       PROGRESS        STEP            STATUS    AGE
my-migration    GenerateArtifacts       [1/1]           ExtractImage    Completed 14m23s
```

作成されたアーティファクトは以下コマンドでダウンロードできます。

```
$ migctl migration get-artifacts my-migration
```

ダウンロードすると3種のファイルを取得できます。

* deployment_spec.yaml
* Dockerfile
* migration.yaml

migration.yaml は migctl 上で管理される `migration` の設定が保存されており、このファイルを見ることでどのような `migration` を作成したか確認することができます。 Dockerfile はイメージビルドに使用されたものです。 deployment_spec.yaml はデプロイ時に使用する manifest ファイルで、 `migration` の設定が反映された構成になっています。

## ワークロードのデプロイ
ここまで来ればデプロイまではあと一歩です。

デプロイ先のクラスタが Docker イメージファイルレジストリへの読み取りアクセス権を有していることを確認したら、以下コマンドでデプロイを実施します。

```sh
$ kubectl apply -f deployment_spec.yaml
```

ワークロードのデプロイ先は GKE もしくは Anthos なので、以降は通常の Kubernetes クラスタ上のアプリケーションと同様に kubectl コマンドを用いて操作・確認が可能となります。

# おわりに
さて、ここまで Migrate for Anthos を基礎から学んで来ましたが、おそらく皆さんもお気づきの通り後はもう実際にやってみるに尽きます。理論上どのようなプロセスで実施可能かは分かりましたが、移行元および移行先のプラットフォームごとに勝手が異なり、また、移行対象が Linux か Windows かでも手順および使用するツールが変わってきます。

公式に [クイックスタート](https://cloud.google.com/migrate/anthos/docs/quickstart) や [Qwiklabs](https://google.qwiklabs.com/focuses/10268?parent=catalog) が準備されているためまずはこれにチャレンジしてみようと思いますが、どちらも見た感じ GCE をソースとして GKE を処理クラスタとして使う構成のようです。この構成は数種類ある Migrate for Anthos の方式の中でも一番シンプルで簡単なものであり、例えば処理クラスタとして Anthos clusters on VMware を使用し、自前で Docker イメージファイルレジストリを登録するパターンなどはもっと複雑で、ネットワーク周りの問題など様々な躓きポイントがあるであろうことが容易に想像できます。。。ワクワクしますね！！

この記事が Migrate for Anthos に初めて触れる方のガイドラインになれば幸いです。

明日はついにGCP連載2021のラスト、齋場さんによる [Cloud Spannerのローカル開発環境をdocker-composeでサクッと立ち上げる](/articles/20210323/) 記事です。お楽しみに！

