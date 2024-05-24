---
title: "Cloud Spannerのローカル開発環境をdocker-composeでサクッと立ち上げる"
date: 2021/03/23 00:00:00
postid: ""
tag:
  - Spanner
  - GCP
  - DockerCompose
  - エミュレータ
category:
  - Infrastructure
thumbnail: /images/20210323/thumbnail.png
author: 齋場俊太朗
lede: "Cloud Spannerのローカル開発環境をdocker-composeでサクッと立ち上げる手順を紹介します。Cloud Spannerを用いた開発を行う方、また興味あるから少し触ってみたいという方にもおすすめです。簡単にCloud Spanner について紹介させていただきます。"
---
# はじめに

こんにちは、TIGの齋場です。[GCP連載2021](/articles/20210307/)の第11弾です。

本記事では、Cloud Spannerのローカル開発環境をdocker-composeでサクッと立ち上げる手順を紹介します。Cloud Spannerを用いた開発を行う方、また興味あるから少し触ってみたいという方にもおすすめです。

# Cloud Spannerとは
簡単にCloud Spanner (以下「Spanner」と記載)について紹介させていただきます。

Spannerは、Google Cloudが提供する"強力な一貫性と水平方向の拡張性を兼ね備えた唯一のリレーショナルデータベースサービス" です。

以下公式ドキュメントの抜粋です。

> ・無制限のスケーリングによって、リレーショナル セマンティクスと SQL のすべてのメリットを享受
> ・任意のサイズで開始し、ニーズの拡大に応じて制限なしでスケーリング
> ・計画的ダウンタイムのない、オンラインでのスキーマ変更で高可用性を実現
> ・リージョンや大陸全体にわたる強整合性で高性能のトランザクションを提供
> ・自動シャーディングなどの機能により手動のタスクを排除し、イノベーションに注力

夢のようなデータベースサービスですね。でも、となるとやっぱりお高そう..料金は以下ような感じです。

#### １ノードあたりの料金（すべてのレプリケーションを含む）
| 構成             | リージョン             | $/時間 | $/月 (100%稼働) |
|------------------|------------------------|--------|-----------------|
| リージョン       | asia-northeast1 (東京) | 1.17   | 842.4           |
| マルチリージョン | asia1 (東京+大阪)      | 3.9    | 2808            |

最小構成のリージョン+1ノード構成でも、なかなかのコストが掛かりますね。


# 開発環境どうするか
コストが高いので、開発環境用に気軽にインスタンスを立ち上げるのは難しそうです。
ということで、本記事ではGCPが公式で提供してくれている [Spanner エミュレータ](https://cloud.google.com/spanner/docs/emulator?hl=ja) を使って開発環境を立ち上げます！(エミューレータあってよかったありがとう!)

gcloud CLIとdockerイメージでの提供がありますが、今回はdocker-composeで利用する例を紹介します。
サンプルコードはこちら: [**tarosaiba/docker-compose-spanner**](https://github.com/tarosaiba/docker-compose-spanner)

以下2点工夫したポイントです。
* 通常、Spannerエミュレータ起動後にインスタンスの作成手順(`gcloud spanner instances create`)が必要になりますが、docker-compose立ち上げ時に自動でインスタンス作成されるようにしています
* DBの初期化処理(テーブル作成&データ投入)のために、事前に用意したDDL/DMLをdocker-compose立ち上げ時に自動で実行されるようにしています

ということで早速手順を紹介します。

# 要件
* docker >= 19.03.0+
* docker-compose >= 1.27.0+

# 手順
## クイックスタート
* リポジトリをクローン [https://github.com/tarosaiba/compose-spanner](https://github.com/tarosaiba/compose-spanner)
* ディレクトリに移動  `cd compoose-spanner`
* docker-compose起動 `docker-compose up -d`

手順は以上です!

## spanner-cliによるSpanner接続方法
さっそくcliで接続してみましょう。
※ インスタンス、データベースが作成されるまで十数秒待つ必要があります

```
$ docker-compose exec spanner-cli spanner-cli -p test-project -i test-instance -d test-database
Connected.
spanner>
```

接続できました！では、テーブルを確認してみましょう。

```bash
spanner> show tables;
+-------------------------+
| Tables_in_test-database |
+-------------------------+
| Singers                 |
| Albums                  |
+-------------------------+
2 rows in set (0.01 sec)

spanner> select * from Singers;
+----------+------------+----------+------------+
| SingerId | FirstName  | LastName | SingerInfo |
+----------+------------+----------+------------+
| 13       | Russell    | Morales  | NULL       |
| 15       | Dylan      | Shaw     | NULL       |
| 12       | Melissa    | Garcia   | NULL       |
| 14       | Jacqueline | Long     | NULL       |
+----------+------------+----------+------------+
4 rows in set (800.4us)
```

テーブルとデータも確認することができました。

## アプリケーションからの接続方法

開発するアプリケーションで `SPANNER_EMULATOR_HOST=localhost:9010` 設定すればOKです。各クライアントライブラリごとのサンプルは[こちらの公式ドキュメント](https://cloud.google.com/spanner/docs/emulator)を参照してください。


## エミュレータの制限事項と相違点

ここで注意点ですが、[公式ドキュメント](https://cloud.google.com/spanner/docs/emulator?hl=ja#limitations_and_differences)にある通りエミュレータは以下のような制限事項および、相違点があります。以下を理解して利用しましょう。

#### 制限事項

> * TLS/HTTPS、認証、IAM、権限、ロール。
> * PLAN または PROFILE クエリモード。 NORMAL のみがサポートされます。
> * 監査ログとモニタリング ツール。

#### 相違点
> * エミュレータのパフォーマンスとスケーラビリティは、本番環境サービスと同等ではありません。
> * 読み取り/書き込みトランザクションとスキーマ変更は、完了するまでデータベース全体を排他的にのみアクセスできるようにロックします。
> * パーティション化 DML とパーティション クエリはサポートされていますが、エミュレータはステートメントが分割可能かどうかは確認しません。つまり、パーティション化 DML またはパーティション クエリ ステートメントがエミュレータで実行される場合でも、本番環境ではパーティション化できないステートメント エラーにより失敗する可能性があります。


# 解説

ざっくりサンプルコードの解説をさせていただきます

### ファイル構成

<img src="/images/20210323/image.png" loading="lazy">

* **docker-compose.yaml** : docker-composeファイルです。これを立ち上げます
* **migrations** : DB初期化時に適用するDDL&DMLを配置します

### 利用しているDockerイメージ

| Docker Image                                  | 説明                                                                                                    | 用途                        |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------|-----------------------------|
| gcr.io/cloud-spanner-emulator/emulator        | GCP提供のSpannerエミュレータ[公式ドキュメント](https://cloud.google.com/spanner/docs/emulator)          | ・Spannerエミュレータ本体   |
| gcr.io/google.com/cloudsdktool/cloud-sdk:slim | GCP利用のためのツールとライブラリ[公式ドキュメント](https://cloud.google.com/sdk/docs/downloads-docker) | ・インスタンスの作成        |
| mercari/wrench                                | SpannerのSchemaマネジメントツール [Github](https://github.com/cloudspannerecosystem/wrench)             | ・テーブル作成 ・データ投入 |
| sjdaws/spanner-cli                            | SpannerのCLIツール [Github](https://github.com/cloudspannerecosystem/spanner-cli)                       | ・CLIアクセス               |

※`wrench` および、`spanner-cli` は [Cloud Spanner Ecosystem](https://github.com/cloudspannerecosystem)で公開されています
※MercariさんはSpannerのツールや知見を惜しみなく公開してくれており、非常に感謝です..!!

### コンテナ構成のイメージとdocker-compose.yamlの内容

<img src="/images/20210323/image_2.png" loading="lazy">

Spannerエミュレータ本体`spanner`とCLIアクセス用の`spanner-cli`は常駐プロセスとして起動し続け、それ以外のコンテナはコマンド実行後に正常終了します

```yaml
version: '3'
services:

    # Spanner
    spanner:
     image: gcr.io/cloud-spanner-emulator/emulator
     ports:
         - "9010:9010"
         - "9020:9020"

    # Init (Create Instance)
    gcloud-spanner-init:
      image: gcr.io/google.com/cloudsdktool/cloud-sdk:slim
      command: >
       bash -c 'gcloud config configurations create emulator &&
               gcloud config set auth/disable_credentials true &&
               gcloud config set project $${PROJECT_ID} &&
               gcloud config set api_endpoint_overrides/spanner $${SPANNER_EMULATOR_URL} &&
               gcloud config set auth/disable_credentials true &&
               gcloud spanner instances create $${INSTANCE_NAME} --config=emulator-config --description=Emulator --nodes=1'
      environment:
        PROJECT_ID: "test-project"
        SPANNER_EMULATOR_URL: "http://spanner:9020/"
        INSTANCE_NAME: "test-instance"
        DATABASE_NAME: "test-database"

    # DB Migration (Create Table)
    wrench-crearte:
      image: mercari/wrench
      command: "create --directory /ddl"
      environment:
        SPANNER_PROJECT_ID: "test-project"
        SPANNER_INSTANCE_ID: "test-instance"
        SPANNER_DATABASE_ID: "test-database"
        SPANNER_EMULATOR_HOST: "spanner:9010"
        SPANNER_EMULATOR_URL: "http://spanner:9020/"
      volumes:
        - ./migrations/ddl:/ddl
      restart: on-failure

    # DB Migration (Insert data)
    wrench-apply:
      image: mercari/wrench
      command: "apply --dml /dml/dml.sql"
      environment:
        SPANNER_PROJECT_ID: "test-project"
        SPANNER_INSTANCE_ID: "test-instance"
        SPANNER_DATABASE_ID: "test-database"
        SPANNER_EMULATOR_HOST: "spanner:9010"
        SPANNER_EMULATOR_URL: "http://spanner:9020/"
      volumes:
        - ./migrations/dml:/dml
      restart: on-failure

    # CLI
    spanner-cli:
      image: sjdaws/spanner-cli:latest
      environment:
        SPANNER_EMULATOR_HOST: "spanner:9010"
      command: ['sh', '-c', 'echo this container keep running && tail -f /dev/null']
```

以下、補足になります

* wrenchコンテナは`restart: on-failure`と設定しています
    - wrenchはSpannerインスタンス作成後に実行したいのですが、docker-composeの起動制御が複雑になるので、失敗→再起動→再実行 するようになっています
* spanner-cliコンテナは、`tail -f /dev/null` でコンテナ起動状態を保つようにしています
    - `docker-exec`でコマンドを実行するためです
    - ※spanner-cliは、go getでもローカルPCにインストール可能 (筆者はローカルにインストールするのが面倒だった)


# おわりに

SpannerはNewSQLと称されるだけあり MySQLやPostgresと比較すると情報も乏しいですが、日本でも採用事例は増えてきていて今後増々期待できるデータベースサービスかと思います！

今回は、Spannerのローカル開発環境を立ち上げる方法を紹介させていただきました。宣言的に定義することで、立ち上げの手順もシンプルにできていると思います。興味のある方はぜひ立ち上げて触ってみてください。

