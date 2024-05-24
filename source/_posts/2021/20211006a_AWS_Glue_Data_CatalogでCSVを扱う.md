---
title: "AWS Glue Data CatalogでCSVを扱う"
date: 2021/10/06 00:00:00
postid: a
tag:
  - Glue
  - Python
  - AWS
  - データカタログ
category:
  - Programming
thumbnail: /images/20211006a/thumbnail.png
author: 山田勇一
lede: "PySparkで予定しておりましたが、PySpark関連として、Glueを題材にさせていただきます。Glueといっても大きく下記の３種類、処理系をいれると4種類に分かれると思っていますが、それぞれ全く別のプロダクトという理解をしています。"
---
# はじめに

[Python連載](/articles/20210927b/)の5本目です。

当初テーマを[PySpark](https://databricks.com/jp/glossary/pyspark)で予定しておりましたが、そこから派生して、[AWS Glue](https://aws.amazon.com/jp/glue/)を題材にさせていただきます。

# AWS Glue Data Catalogについて

Glueといっても大きく下記の３種類、処理系をいれると4種類に分かれると思っていますが、それぞれ全く別のプロダクトという理解をしています。

- AWS Glue
    - Spark（実装はPython or scala）
    - python shell (Pythonのみ)
        - python shellを利用る場合、[1/16DPU](https://aws.amazon.com/jp/about-aws/whats-new/2019/01/introducing-python-shell-jobs-in-aws-glue/)で動かせるため、時間制約のないサーバレス処理としても優秀に思えます。
        - 料金は[こちら](https://aws.amazon.com/jp/glue/pricing/)をご覧ください
- AWS Glue Data Catalog
    - Hive MetaStore
- AWS Glue DataBrew

# CSVを利用する上での困りごと

### 1. crawlerが利用できない

AWSが推奨する[ベストプラクティス](https://docs.aws.amazon.com/ja_jp/athena/latest/ug/glue-best-practices.html)では、「crawlerを利用することでデータをCatalog化し、多様や処理系で利用できる」とされていますが、’”’ダブルクォーテーションで囲まれたフィールドを持つCSV（TSVも同様）の場合、正しく読み込まれず（※）、AWS上の[ドキュメント](https://docs.aws.amazon.com/ja_jp/athena/latest/ug/csv-serde.html)でも対応が必要とされています。

<img src="/images/20211006a/名称未設定ファイル.drawio_(3).png" alt="クローラが利用できないイメージ図" width="689" height="209" loading="lazy">

### 2. テーブルのデータ型を全てStringに設定する必要がある

crawlerを利用できないこともシステム運用上の困りごとになりますが、それ以上にデータ型に問題があります。

OpenCSVSerDeを利用したCatalogでは、データ型をStringに固定する必要があり、[Catalog](https://ja.wikipedia.org/wiki/%E3%82%AB%E3%82%BF%E3%83%AD%E3%82%B0)化のメリットが半減してしまいます。

# CSVへの対応方法

### 利用するCSVファイル

##### データ

```csv sample.csv
"ID","NAME","FLG","NUM","DATE","DATE TIME"
"1","あいうえお","1","100000000.00000000","2021-10-01","2021-10-01 18:00:13.271231"
"2","かきくけこ","0","100000000.00000000","2021-10-01","2021-10-02 19:01:13.271231"
"3","さしすせそ","1","100000000.00000000","2021-10-01","2021-10-03 20:30:13.271231"
```
##### crawlerで読み込んだ直後の状態

crawlerで読み込んだデータをAthenaより表示すると以下の状態となります。
データが欠損して表示されている事がわかります。
<img src="/images/20211006a/スクリーンショット_2021-10-05_8.44.32.png" alt="Athenaで表示したデータ欠損の様子" width="1200" height="198" loading="lazy">

同じく、Athenaのメニューより見たテーブル定義になります。
定義的には一見正しく見えますが、前述の通り正しく動かない状態になります。
<img src="/images/20211006a/スクリーンショット_2021-10-05_8.44.23.png" alt="Athenaのメニューより見たテーブル定義" width="519" height="261" loading="lazy">


### 対応方法１：OpenCSVSerDeを利用する

crawlerでCSVを読み込み、DDL化します。
このDDLを修正ます。

```sql ddl
CREATE EXTERNAL TABLE `sample`(
  `id` bigint,    -- 型をstringに変更
  `name` string,
  `flg` bigint,   -- 型をstringに変更
  `num` double,   -- 型をstringに変更
  `date` string,
  `date time` string)
PARTITIONED BY (
  `year` string,
  `month` string,
  `day` string)
-- DELIMITEDを削除し、OpenCSVSerdeに置き換えます。
ROW FORMAT DELIMITED       -- 削除
  FIELDS TERMINATED BY ',' -- 削除
-- ROW FORMAT SERDE
--   'org.apache.hadoop.hive.serde2.OpenCSVSerde'
-- WITH SERDEPROPERTIES (
--   'escapeChar'='\\',
--   'quoteChar'='\"',
--   'separatorChar'=',')
STORED AS INPUTFORMAT
  'org.apache.hadoop.mapred.TextInputFormat'
OUTPUTFORMAT
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION
  's3://sample/work/sample/'
TBLPROPERTIES (
  'CrawlerSchemaDeserializerVersion'='1.0',
  'CrawlerSchemaSerializerVersion'='1.0',
  'UPDATED_BY_CRAWLER'='sample',
  'areColumnsQuoted'='false',
  'averageRecordSize'='66',
  'classification'='csv',
  'columnsOrdered'='true',
  'compressionType'='none',
  'delimiter'=',',
  'objectCount'='1',
  'recordCount'='4',
  'sizeKey'='310',
  'skip.header.line.count'='1',
  'typeOfData'='file')
```

修正後、全てのデータが表示できるようになります。
ただし、全てはString型として認識されているため、データは文字列として扱う必要があります。
<img src="/images/20211006a/スクリーンショット_2021-10-05_9.05.19.png" alt="欠損がなくなったAthena実行結果" width="1200" height="196" loading="lazy">


---
### 対応方法２：crawlerのカスタム分類子（Grok）を利用する

正規表現を元にした、パーサーを自分で用意する形になります。
詳細は、AWSをの[公式](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/custom-classifier.html#classifier-builtin-patterns)を見るのが良いと思いますが、抜粋、要約すると、フィールド単位にマッピング定義を作る方法となります。

`%{PATTERN:field-name:data-type}`

- マッピング定義
  - PATTERN
  [Grokのデータ型](https://github.com/hpcugent/logstash-patterns/blob/master/files/grok-patterns)を指定します。
  - field-name:
  CSVのフィールドを指定します。
  - data-type:
  Catalogの[データ型](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/aws-glue-api-common.html)を指定します。


今回のCSVでは、以下の形となります。
[こちら](https://goodbyegangster.hatenablog.com/entry/2018/10/12/001644)がよく纏められており、見ながらやったのですが、どうしても読み込んでくれませんでした。。。

なお、構文チェックはWebで可能です。

- 構文チェック
  * [Grok Constructor](http://grokconstructor.appspot.com/do/match)
- Grokパターン
  * `"%{INT:ID:int}", "%{DOUBLE_BYTE:NAME:STRING}", "%{BASE16FLOAT:NUM:STRING}, "%{DATE:DATE:DATE}", "%{DATESTAMP:DATE TIME: TIMESTAMP}"`
- カスタムパターン
  * `DOUBLE_BYTE [^\x01-\x7E]*`
- 画面の入力例
  * <img src="/images/20211006a/スクリーンショット_2021-10-05_14.54.17.png" alt="Grok入力例" width="755" height="1120" loading="lazy">


### 対応方法３：CSVをparquestに変換して利用する

システムとの親和性が最も高いparquestに変換後、crawlerでCatalog化します。
parquestへの変換では、元データに何も手を入れない形にします。

```python sample-csv-to-parquest.py
import boto3
import pandas as pd
import io

s3 = boto3.resource('s3')

# read s3
csv = s3.Object('${バケット}', 'work/sample/sample.csv').get()['Body'].read().decode('utf-8')
f = io.StringIO(csv)

# convert parquet
pd.read_csv(f).to_parquet('/tmp/sample.parquet', compression='snappy')
# save s3
s3.meta.client.upload_file('/tmp/sample.parquet', '${バケット}', 'work/sample-parquest/sample.parquet')
```

この変換処理をワークフローでcrawlerとつなげます。
<img src="/images/20211006a/スクリーンショット_2021-10-05_18.54.29.png" alt="ワークフロー例" width="1200" height="364" loading="lazy">

全ての成功を確認後、Athenaからデータを見てると、余計な一手間がいらずデータを参照でき、データ型もCatalogの範囲内でハンドリングされています。
### 実行結果
<img src="/images/20211006a/スクリーンショット_2021-10-05_18.59.15.png" alt="実行結果" width="1200" height="395" loading="lazy">

### データプレビュー

<img src="/images/20211006a/スクリーンショット_2021-10-05_18.58.52.png" alt="データプレビュー" width="1200" height="209" loading="lazy">

### テーブル定義
<img src="/images/20211006a/スクリーンショット_2021-10-05_18.58.58.png" alt="テーブル定義" width="384" height="212" loading="lazy">

# まとめ

データ型を認識でき、手軽に実行できる`対応方法３：CSVをparquestに変換して利用する`を基本方針として考える形で良いと思いました。
