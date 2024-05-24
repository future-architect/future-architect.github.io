---
title: "DynamoDBをS3へExportして、Glue+AthenaでSQLを実行する"
date: 2021/04/03 00:00:00
postid: ""
tag:
  - DynamoDB
  - S3
  - Glue
  - Athena
  - AWS
  - SQL
category:
  - Programming
thumbnail: /images/20210403/thumbnail.png
author: 棚井龍之介
lede: "DynamoDBを頻繁に利用しており、連日DynamoDBコンソール画面と睨めっこをしています。DynamoDBのコンソール画面は特定のデータをピンポイントで探すには優秀ですが、データ集計には全く向いていません。"
---
<img src="/images/20210403/Screen_Shot_2021-03-14_at_1.09.08.png" alt="チャットのやり取り" loading="lazy">

# はじめに

フューチャーの棚井龍之介です。

業務ではDynamoDBを利用しており、連日DynamoDBコンソール画面と睨めっこをしています。DynamoDBのコンソール画面は特定のデータをピンポイントで探すには優秀ですが、データ集計には全く向いていません。

そのため、統計調査や障害調査などによりデータ分析が必要になった場合、毎度awscliコマンドとbashコマンドのコラボレーションで試行錯誤しながら集計することになります。

DynamoDBでのデータ検索は原則「スキャンとクエリ」のみです。SQLのWHERE句に似たfilterという機能はありますが、テーブル同士のJOINや複雑な条件絞り込みは難しいため「SQLが打てれば一瞬で解決できるのに、どうしてこんな面倒なんだ。これが低レイテンシの代償なのか」と考えていました。

何度もデータ集計をして、「aws dynamodb xx yy zz ~~」の職人芸を繰り出すことや、一度きりの集計でしか使えないスクリプトを量産しているうちに、もっと楽で正確で作業コストの低い方法はないか？と思う機会が増えてきました。

## AWS News Blog からの福音
[New – Export Amazon DynamoDB Table Data to Your Data Lake in Amazon S3, No Code Writing Required](https://aws.amazon.com/jp/blogs/aws/new-export-amazon-dynamodb-table-data-to-data-lake-amazon-s3/)

なんと、DynamoDBのテーブルデータを、追加コードなしでパッとS3に出力できるようになりました！
PipelineやGlueを利用したS3出力ならば以前から可能でしたが、より低コストでDynamoDB → S3へのデータ出力が可能となりました。

「S3にExportできる →　GlueのデータカタログとAthenaのクエリ機能により、サーバレス環境でSQLを実行できる」の連想ゲームなので、動作検証も兼ねて早速試してみました。

# 本記事の流れ
DynamoDBのデータにSQLを実行するため、本記事では以下の流れで説明します。

1. [DynamoDBを準備](#1dynamodbを準備)
2. [Export先のS3を準備](#2export先のs3を準備)
3. [Exportを実行](#3exportを実行)
4. [GlueのCrawlerを実行](#4glueのcrawlerを実行)
5. [AthenaでSQLを実行](#5athenaでsqlを実行)


## 1.DynamoDBを準備
Export S3の機能は新しいコンソール画面上でのみ可能なので、古いUIを利用している場合は「新しいコンソールを試す」を選択してください。
<img src="/images/20210403/1.png" alt="AWS管理コンソール" loading="lazy">

今回の動作検証用に、以下の設定でDynamoDBテーブルを作成します。
- テーブル名: test-s3export-and-query
- パーティションキー: id(String)
<img src="/images/20210403/3.png" alt="DynamoDBテーブル作成" loading="lazy">

動作検証用に、サンプルデータを15件投入します。

```json
{"id":{"S":"00001"},"age":{"N":"20"},"pc":{"S":"windows"},"mobile":{"S":"android"}}
{"id":{"S":"00002"},"age":{"N":"25"},"pc":{"S":"windows"},"mobile":{"S":"android"}}
{"id":{"S":"00003"},"age":{"N":"30"},"pc":{"S":"windows"},"mobile":{"S":"android"}}
{"id":{"S":"00004"},"age":{"N":"35"},"pc":{"S":"windows"},"mobile":{"S":"android"}}
{"id":{"S":"00005"},"age":{"N":"40"},"pc":{"S":"windows"},"mobile":{"S":"android"}}
{"id":{"S":"00006"},"age":{"N":"45"},"pc":{"S":"windows"},"mobile":{"S":"android"}}
{"id":{"S":"00007"},"age":{"N":"20"},"pc":{"S":"windows"},"mobile":{"S":"ios"}}
{"id":{"S":"00008"},"age":{"N":"25"},"pc":{"S":"windows"},"mobile":{"S":"ios"}}
{"id":{"S":"00009"},"age":{"N":"30"},"pc":{"S":"windows"},"mobile":{"S":"ios"}}
{"id":{"S":"00010"},"age":{"N":"20"},"pc":{"S":"mac"},"mobile":{"S":"ios"}}
{"id":{"S":"00011"},"age":{"N":"25"},"pc":{"S":"mac"},"mobile":{"S":"ios"}}
{"id":{"S":"00012"},"age":{"N":"30"},"pc":{"S":"mac"},"mobile":{"S":"ios"}}
{"id":{"S":"00013"},"age":{"N":"35"},"pc":{"S":"mac"},"mobile":{"S":"ios"}}
{"id":{"S":"00014"},"age":{"N":"40"},"pc":{"S":"mac"},"mobile":{"S":"android"}}
{"id":{"S":"00015"},"age":{"N":"45"},"pc":{"S":"mac"},"mobile":{"S":"android"}}
```

投入結果をコンソール画面で確認します。
15件とも正しく格納されています。

<img src="/images/20210403/4.png" alt="15件のプレビュー" loading="lazy">


## 2.Export先のS3を準備

データ出力先のS3を作成します。
今回は test-dynamodb-export-20210315 のバケット名で作成しました。
<img src="/images/20210403/5.png" alt="データ出力先の設定" loading="lazy">


## 3.Exportを実行
テーブルのExportでは、DynamoDBの読み込みキャパシティーユニットが消費されません。よってDBのパフォーマンスには影響を与えずにデータを出力できます。ただし、Export実行のタイミングとトランザクションのタイミングが重なった場合、出力項目が最新のテーブルとはズレが生じる可能性があります。本機能は「DynamoDBの特定の断面をS3にExportすることが目的」なため、リアルタイムなデータ分析には適していない点にご注意ください。

DynamoDBのコンソール画面上から、Export S3を実行します。
「ストリームとエクスポート」から「S3へのエクスポート」を選択
<img src="/images/20210403/6.png" alt="S3へのエクスポート" loading="lazy">

Export S3の実行には Point-in-Time Recovery の設定が必要なため、画面の指示に従い有効化します。
出力先のS3を選択したら、「エクスポート」を実行します。
<img src="/images/20210403/6-2.png" alt="エクスポートの実行" loading="lazy">

コンソール画面上でExportの進行状況が見れます。
データ数にもよりますが、出力は5分程度で完了します。
<img src="/images/20210403/7.png" alt="出力先" loading="lazy">

Export完了後に出力先S3を確認すると、DyanmoDBデータ本体以外にも複数ファイルが確認できます。
各ファイルの意味はこちらです

| オブジェクト          	| 説明                                                           	|
|-----------------------	|----------------------------------------------------------------	|
| _started              	| ターゲットs3パスへの疎通確認に利用されたもの。削除して問題ない 	|
| data/                 	| 出力したデータ本体。テーブル項目がgz形式に圧縮されて出力される 	|
| manifest-files.json   	| Exportされたファイルの情報が記載される                         	|
| manifest-files.md5    	| manifest-files.jsonのチェックサムファイル                      	|
| manifest-summary.json 	| Exportジョブの概要情報が記載される                             	|
| manifest-summary.md5  	| manifest-summary.jsonのチェックサムファイル                    	|

<img src="/images/20210403/8.png" alt="実行結果" loading="lazy">

dataパス配下に、ExportしたDynamoDBテーブルデータがgz形式で格納されています。

<img src="/images/20210403/9.png" alt="dataパス配下" loading="lazy">

以上で、DynamoDBのExport S3は完了しました。

コンソール画面をいくつか操作するだけで、DynamoDB→S3へのデータ出力が完了です。

## 4.GlueのCrawlerを実行

Athenaでのクエリ実行には、事前のテーブル定義が必要です。
各項目ごとに手動追加することも可能ですが、作業簡略化のために今回はGlueのCrawler機能をを利用します。

まずは、Glueデータカタログの「データベース」→「データベースの追加」を選択し、Crawler結果を格納するデータベースを追加してください。

今回は test_dynamodb_export の名前でデータベースを追加しました。

<img src="/images/20210403/10.png" alt="AWS Glueカタログのデータベース追加" loading="lazy">

続いて、「テーブル」→「テーブルの追加」→「クローラを使用してテーブルを追加」を選択します。

<img src="/images/20210403/11.png" alt="クローラを使用してテーブルを追加" loading="lazy">

今回のクローラでは、以下の設定とします。

- 名前: test-dynamodb-export
- インクルードパス: s3パス(DynamoDBデータのExport先のパス, ~/data/ までを指定する)
- スケジュール: オンデマンド
- データベース: test_dynamodb_export
- テーブルに追加されたプレフィックス: users_ ("プレフィックスでの指定文字列+data"が、テーブル名となる)

<img src="/images/20210403/12.png" alt="クローラ設定" loading="lazy">

クローラの実行をオンデマンドに設定したため、「クローラ」→「test-dynamodb-export(今回追加したクローラ名)」→「クローラの実行」により、テーブル定義を追加します。

<img src="/images/20210403/13.png" alt="クローラの実行" loading="lazy">

1,2分程度でクローラ実行が完了します。
以上により、DynamoDBのデータをS3に格納して「クエリが実行できる状態」になりました。


## 5.AthenaでSQLを実行

Athenコンソール画面での「データベース」で「test_dynamodb_export(今回追加したデータベース)」を選択し、テーブルに「users_data」が表示されることを確認します。

Glue Crawlerにより項目定義は完了しているため、あとはSQLを実行するのみです。

<img src="/images/20210403/15.png" alt="Athenaのクエリエディタ" loading="lazy">

まずは SELECT してみましょう。
DynamoDBの出力項目をGlue Crawlerでテーブル定義した場合、各項目は「**Item.(項目名).(データ型)**」で指定できます。

```sql
SELECT Item.id.S AS id,
         Item.age.N AS age,
         Item.mobile.S AS mobile,
         Item.pc.S AS pc
FROM test_dynamodb_export.users_data
ORDER BY  Item.id.S
```

<img src="/images/20210403/17.png" alt="SQL結果" loading="lazy">

DynamoDBをSELECTできましたね。
SQLっぽく、いくつか条件を追加してみます。

```sql
SELECT Item.id.S AS "35歳以下のiOSユーザ",
         Item.age.N AS "年齢"
FROM test_dynamodb_export.users_data
WHERE Item.age.N <= '30'
        AND Item.mobile.S = 'ios'
ORDER BY  Item.age.N, Item.id.S
```
<img src="/images/20210403/18.png" loading="lazy">

テーブルのJOINも、もちろんできます。

```sql
SELECT count(1) AS "15×15=225"
FROM test_dynamodb_export.users_data, test_dynamodb_export.users_data
```
<img src="/images/20210403/19.png" loading="lazy">

今回の記事では1テーブルしか作成していませんが、各テーブルごとに **Export S3 + Glue Crawler** を実施すれば、DynamoDBテーブル同士のJOINが可能となります。

# まとめ
DynamoDBのS3 Export機能が搭載されたことにより、データ集計コストが下がりました。既存のGlueとAthenaを利用することで、「SQL分析に手間がかかる」というDynamoDBの弱点が一部解消されたと考えています。今回の構成ではリアルタイムなデータ分析は不可能ですが、過去データを特定の断面で集計するには十分です。

みなさんもDynamoDB集計に疲弊されていたら、是非とも `DynamoDB Export S3` を使ってみてください！

## 参照サイト
- [New – Export Amazon DynamoDB Table Data to Your Data Lake in Amazon S3, No Code Writing Required](https://aws.amazon.com/jp/blogs/aws/new-export-amazon-dynamodb-table-data-to-data-lake-amazon-s3/)
- [Exporting DynamoDB table data to Amazon S3](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DataExport.html)
- [【新機能】Amazon DynamoDB Table を S3 に Export して Amazon Athena でクエリを実行する](https://dev.classmethod.jp/articles/dynamodb-table-export-service/)


