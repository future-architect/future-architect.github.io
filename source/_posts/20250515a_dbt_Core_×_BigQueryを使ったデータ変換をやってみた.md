---
title: "dbt Core × BigQueryを使ったデータ変換をやってみた"
date: 2025/05/15 00:00:00
postid: a
tag:
  - dbt
  - GCP
  - BigQuery
  - データ基盤
category:
  - Programming
thumbnail: /images/20250515a/thumbnail.png
author: 片岡久人
lede: "データ分析基盤の構築や運用において注目を集めているdbt  の入門記事です。dbtを活用して、データ変換の一連の手順を示すことで、これからdbtを試してみようと考えている方の導入を支援できれば幸いです。。"
---

<img src="/images/20250515a/top.png" alt="" width="446" height="162">

# はじめに

はじめまして、フューチャーアーキテクト、製造エネルギー事業部の片岡です。

データ分析基盤の構築や運用において注目を集めている dbt (data build tool) の入門記事です。dbt を活用して、データ変換の一連の手順を示すことで、これから dbt を試してみようと考えている方の導入を支援できれば幸いです。

# dbt とは

dbt (data build tool) は、dbt Labs, Inc. が提供するデータ変換ツールです。SQL をコンパイルして実行することで、データウェアハウスにテーブルやビューを作成できます。

dbt には以下の 2 種類のプロダクトがあります。

- dbt Cloud: Web ベースの UI を通じて、開発、テスト、スケジュール実行などを行うフルマネージドサービス
- dbt Core: コマンドラインを通じてインストール・管理するオープンソースツール

今回の記事では、dbt Core を利用します。

# やりたいこと

- dbt を利用して、BigQuery に登録したデータの変換処理を実現します
- 具体的には、下記のサンプルで用意した店舗の売上データを、dbt を利用して分析してみようと思います

| 店舗 ID | 商品 ID | 売上日   | 売上個数 | 売上金額 | 顧客 ID |
| ------- | ------- | -------- | -------- | -------- | ------- |
| 1       | 1       | 2023/1/1 | 10       | 1000     | 1       |
| 1       | 2       | 2023/1/1 | 5        | 500      | 2       |
| 1       | 3       | 2023/1/2 | 20       | 2000     | 3       |
| 2       | 1       | 2023/1/1 | 15       | 1500     | 4       |
| 2       | 2       | 2023/1/1 | 10       | 1000     | 1       |
| 2       | 3       | 2023/1/2 | 30       | 3000     | 5       |
| 3       | 1       | 2023/1/1 | 2        | 200      | 6       |
| 3       | 2       | 2023/1/2 | 12       | 1200     | 7       |
| 3       | 3       | 2023/1/2 | 50       | 5000     | 8       |

# 環境構築

まずは、dbt を利用するために環境構築をします。

（公式の環境構築ガイドは[こちら](https://docs.getdbt.com/docs/core/installation-overview)です）

## 前提条件

- Python 3.9 以上がインストールされていること
- Google Cloud のプロジェクトが作成されていること
- 今回は dbt に接続するプラットフォームとして、BigQuery を利用します

## dbt を install する

pip コマンドを用いて、dbt Core と BigQuery アダプターをインストールします。

```bash
python -m pip install dbt-core dbt-bigquery

## 下記のコマンドを実行し、versionが表示されればインストール成功
dbt --version
```

## dbt プロジェクトを作成する

`dbt init`コマンドを実行し、dbt プロジェクトフォルダを作成します。

今回は dbt_trial という名前のプロジェクトを作成します。

```bash
# dbt init <プロジェクト名>
dbt init dbt_trial

# dbtプロジェクト作成にあたり、下記のような設定をCLI上で実施します。
Which database would you like to use?
[1] bigquery
Enter a number: 1
[1] oauth
[2] service_account
Desired authentication method option (enter a number): 1
project (GCP project id): sample_project
dataset (the name of your dbt dataset): sample
threads (1 or more): 1
job_execution_timeout_seconds [300]: 300
[1] US
[2] EU
Desired location option (enter a number): 1
07:02:41  Profile dbt_trial written to C:\Users\<user名>\.dbt\profiles.yml using target's profile_template.yml and your supplied values. Run 'dbt debug' to validate the connection.

```

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>
補足: プロジェクト名やデータベースの設定は、環境に合わせて適切に選択してください。
</div>

## BigQuery に接続する

dbt プロジェクトが作成されると、`~/.dbt/`ディレクトリに profiles.yml が作成されます。このファイルに、dbt が BigQuery に接続するための認証情報などを記述します。

もし作成されていない場合は、`~/.dbt/`ディレクトリを作成し、下記のファイルをコピーしてください。

```yml profiles.yml
dbt_trial:
  outputs:
    dev:
      dataset: trial
      job_execution_timeout_seconds: 300
      job_retries: 1
      location: US
      method: oauth
      priority: interactive
      project: sample_project
      threads: 1
      type: bigquery
  target: dev
```

<div class="note warn" style="background: #fdf9e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>
注意: project にはご自身の GCP プロジェクト ID を、dataset には dbt でテーブルを作成する BigQuery のデータセット名を指定してください。location はデータセットのロケーションに合わせてください。
</div>

作成した dbt プロジェクトフォルダの直下で`dbt debug`コマンドを実行し、BigQuery への接続が正常に確立できるかを確認します。

```bash
dbt debug
# 接続に成功すると、以下のような出力が表示されます。
> Connection test: OK connection ok
```

## dbt のサンプルのモデルを作成してみる

作成した dbt プロジェクトには、初期状態ではシンプルなサンプルモデルが含まれています。以下のコマンドを実行して、このサンプルモデルが正常に実行できるか試してみましょう。

```bash
dbt run
```

以下のように、サンプルのモデルが BigQuery 上に作成されたら、dbt の基本的な環境構築は完了です！
<img src="/images/20250515a/image.png" alt="image.png" width="537" height="265" loading="lazy">

# dbt を利用してデータ変換を実行してみる。

環境構築ができたので、早速データ変換を実施してみようと思います。

- 本記事では、売り上げデータの分析として、日付ごとの売上の合計を取得してみようと思います。
- 実装にあたり、dbt にはレイヤという考え方があり、レイヤの作成方針のベストプラクティスに倣ってデータ変換処理を実装していきます。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>

dbt のレイヤの考え方

dbt におけるレイヤは、データの変換プロセスを整理し、管理しやすくするための重要な概念です。以下のようなレイヤ構成がベストプラクティスとされています。

- Staging レイヤ: データソースからロードされた生データに対して、データ型を整えたり、カラム名を分かりやすいように変更するなど、最低限の変換を行います。このレイヤのモデルは、通常、データソースの構造を反映した形になります
- Intermediate レイヤ : staging レイヤのデータを基に、複数のテーブルを結合したり、ビジネスロジックに基づいた集計や計算を行ったりするなど、より複雑な変換を行います。このレイヤは、分析に必要な基本的なデータセットを準備する役割を担います。
- Mart レイヤ: Staging・Intermediate レイヤで準備されたデータセットを、特定の分析目的やレポート作成に合わせてさらに集計・加工し、最終的な分析に利用しやすい形に整理します。例えば、日次の売上集計、顧客ごとの購買履歴などがこのレイヤに作成されます。

</div>

下記のような手順でデータ変換を実施していきます。

1. CSV で保存されている売上データを BigQuery に投入
1. staging レイヤのモデルを作成
1. mart レイヤにて日付ごとの売り上げを合計を取得するモデルを作成

## CSV で保存されている売上データを BigQuery に投入

こちらは、データ変換ではないのですが、データ変換のもとなるデータを BiqQuery に投入する手順となります。

以下の CSV ファイルを、dbt プロジェクト内の dbt_trial/seeds/ ディレクトリ配下にコピー&ペーストします。

<div class="note warn" style="background: #fdf9e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>
今回は sales.csv のみ利用します。
それ以外のデータはデータ分析用のサンプルデータとしてご利用ください。（生成 AI を利用して作成しております。）
</div>

<details><summary>sales.csv（店舗の売り上げデータ）</summary>

```csv sales.csv
store_id,item_id,sales_date,sales_quantity,sales_amount,customer_id
1,1,2023-01-01,10,1000,1
1,2,2023-01-01,5,500,2
1,3,2023-01-02,20,2000,3
2,1,2023-01-01,15,1500,4
2,2,2023-01-01,10,1000,1
2,3,2023-01-02,30,3000,5
3,1,2023-01-01,2,200,6
3,2,2023-01-02,12,1200,7
3,3,2023-01-02,50,5000,8
```

</details>

<details><summary>store.csv（店舗のマスタデータ）</summary>

```csv store.csv
store_id,store_name,address,latitude,longitude
1,渋谷店,〒150-0041 東京都渋谷区宇田川町21-1,35.662863,139.700983
2,新宿店,〒160-0022 東京都新宿区新宿3-15-1,35.689540,139.701351
3,池袋店,〒170-0004 東京都豊島区西池袋1-39-1,35.727756,139.700242
```

</details>

<details><summary>item.csv（商品のマスタデータ）</summary>

```csv item.csv
item_id,item_name,category,unit_price
1,Tシャツ,服飾,1000
2,パンツ,服飾,2000
3,スニーカー,靴,5000
4,シャンプー,日用品,500
5,洗剤,日用品,300
```

</details>

<details><summary>customer.csv（顧客のマスタデータ）</summary>

```csv customer.csv
customer_id,customer_name,address,gender,date_of_birth
1,山田太郎,〒100-0001 東京都千代田区千代田1-1-1,男,1990-01-01
2,田中花子,〒200-0002 東京都中野区中野1-1-1,女,1995-04-05
3,佐藤健,〒300-0003 東京都杉並区杉並1-1-1,男,2000-07-07
4,鈴木美咲,〒400-0004 東京都板橋区板橋1-1-1,女,2005-10-10
5,高橋一郎,〒500-0005 東京都練馬区練馬1-1-1,男,2010-01-12
6,伊藤真琴,〒600-0006 東京都足立区足立1-1-1,女,2015-02-14
7,中村俊介,〒700-0007 東京都葛飾区葛飾1-1-1,男,2020-03-16
8,橋本美咲,〒800-0008 東京都江戸川区江戸川1-1-1,女,2025-04-18
```

</details>

作成した dbt プロジェクトの直下で`dbt seed`コマンドを実行して、これらの CSV データを BigQuery に投入します。dbt は seeds ディレクトリ内の CSV ファイルを BigQuery のテーブルとしてロードします。

```bash
dbt seed
```

下記のようにテーブルが作成され、データがロードされていれば OK です。
<img src="/images/20250515a/image_2.png" alt="image.png" width="993" height="404" loading="lazy">

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>
補足：dbt seed コマンドは、dbt プロジェクトの seeds ディレクトリに配置された CSV ファイルを、データウェアハウス（ここでは BigQuery）にテーブルとしてロードするためのコマンドです。主に、分析に必要な参照テーブルや、頻繁には変更されない比較的小さなデータセットを管理するのに適しています。
</div>

## staging レイヤのモデルを作成する

- dbt_trial/models 直下に staging ディレクトリを作成します。
- 作成した staging ディレクトリ配下に、以下の 3 つのファイルを新規作成し、それぞれの内容をコピー&ペーストしてください。
- 本記事では、BigQuery に投入したデータソース（sales.csv）の内容を、そのまま staging レイヤのモデルとして利用します。

<details><summary>stg_sales.sql</summary>

```sql stg_sales.sql
{{ config(schema='staging') }}
with

source as (
    select * from {{ source('trial','sales') }}
),

renamed as (
    select
        store_id,
        item_id,
        sales_date,
        sales_quantity,
        sales_amount,
        customer_id
    from
        source
)

select * from renamed
```

</details>

<details><summary>stg_sales.sql</summary>

```yml _stg__models.yml
version: 2

models:
  - name: stg_sales
    dataset: staging
    description: "売上データ"
    columns:
      - name: store_id
        description: "店舗 ID"
        tests:
          - not_null
      - name: item_id
        description: "商品 ID"
        tests:
          - not_null
      - name: sales_date
        description: "売上日付"
        tests:
          - not_null
      - name: sales_quantity
        description: "売上個数"
        tests:
          - not_null
      - name: sales_amount
        description: "売上金額"
        tests:
          - not_null
      - name: customer_id
        description: "顧客 ID"
        tests:
          - not_null
```

</details>

<details><summary>_stg__sources.yml</summary>

```yml _stg__sources.yml
sources:
  - name: trial
    dataset: trial
    tables:
      - name: "sales"
        description: "システムXから連携されてきた売上マスタ"
```

</details>

`dbt run`コマンドを実行し、stg_sales を作成します。

```bash
dbt run --select "dbt_trial.staging.stg_sales"
```

下記のような View テーブルが作成されます。
<img src="/images/20250515a/image_3.png" alt="image.png" width="766" height="392" loading="lazy">

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>
stg_sales.sql などの SQL ファイルには、データの抽出、変換、ロード（ETL の T と L）のロジックを記述し、対応する YAML ファイル（_stgmodels.yml、_stgsources.yml）には、モデルのメタ情報（説明、カラム定義、テストなど）やデータソースの定義を記述します。
</div>

## mart レイヤのモデルを作成する

- 作成した dbt プロジェクトの models ディレクトリ内に、mart という名前のディレクトリを作成します。
- 作成した mart ディレクトリ配下に、以下の 2 つのファイルを新規作成し、それぞれの内容をコピー&ペーストしてください。
- mart_sales_amount_per_day では、stg_sales モデルを日付で集約し、日付毎の売り上げを取得するロジックを実装しています。

<details><summary>mart_sales_amount_per_day.sql</summary>

```sql mart_sales_amount_per_day.sql
{{ config(schema='mart') }}
with

sales as (select * from {{ ref('stg_sales') }}),


sales_amount_per_day as (
    select
        sales_date,
        sum(sales_amount) as sales_amount_per_day
    from
        sales
    group by
        sales_date
)

select * from sales_amount_per_day
```

</details>

<details><summary>_marts__models.yml</summary>

```yml _marts__models.yml
version: 2

models:
  - name: mart_sales_amount_per_day
    dataset: trial_mart
    description: mart_sales_amount_per_day
    columns:
      - name: sales_date
        description: "売上日付"
        tests:
          - unique
          - not_null
      - name: sales_amount_per_day
        description: "日毎の売上金額"
        tests:
          - not_null
```

</details>

dbt run コマンドを実行し、mart_sales_amount_per_day を作成する。

```bash
dbt run --select "dbt_trial.mart.mart_sales_amount_per_day"
```

下記のような View テーブルが作成されます。

<img src="/images/20250515a/image_4.png" alt="" width="778" height="264" loading="lazy">

View テーブルの中身を確認すると、日付毎に集約された売上金額の合計が取得できていることがわかります。

<img src="/images/20250515a/image_5.png" alt="" width="663" height="292" loading="lazy">

これにて、本記事でやりたいことが実現できました！

# まとめ

今回の記事では、dbt Core を用いた簡単なデータ変換処理実装の流れを記載しました。

- dbt の環境構築から BigQuery への接続
- CSV データの BigQuery への投入 (dbt seed)
- staging レイヤと mart レイヤのモデル作成 (dbt run)

dbt に入門しようとしている人にとって、dbt に関するイメージを具体的にする助けとなれば幸いです！
