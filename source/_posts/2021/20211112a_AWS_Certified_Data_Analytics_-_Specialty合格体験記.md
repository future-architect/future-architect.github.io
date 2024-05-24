---
title: "AWS Certified Data Analytics - Specialty合格体験記"
date: 2021/11/12 00:00:00
postid: a
tag:
  - AWS
  - 合格記
  - データレイク
category:
  - Infrastructure
thumbnail: /images/20211112a/thumbnail.png
author: 伊藤真彦
lede: "TIGの伊藤真彦です。先日AWS Certified Data Analytics - Specialtyに合格しました。これで持っているAWS認定資格は10個になりました。"
---
TIGの伊藤真彦です。
<img src="/images/20211112a/image.png" alt="image.png" width="600" height="600" loading="lazy">

先日AWS Certified Data Analytics - Specialtyに合格しました。
これで持っているAWS認定資格は10個になりました。

## AWS Certified Data Analytics - Specialtyとは

[AWS Certified Data Analytics - Specialty](https://aws.amazon.com/jp/certification/certified-data-analytics-specialty/)は文字通りデータアナリティクスに特化した試験です。

> この資格は、組織がクラウドイニシアチブを実装するための重要なスキルを持つ人材を特定して育成するのに役立ちます。AWS Certified Data Analytics – Specialty を取得すると、AWS データレイクと分析サービスを利用して、データからインサイトを得るための専門知識を認定します。

平たく言うと、[AmazonEMR](https://aws.amazon.com/jp/emr/)や[AWS Glue](https://aws.amazon.com/jp/glue/?whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc)といったサービスの使い方や、ネイティブのApache Spark、Hiveについての知識が問われます。

## 学習方法
今回も[aws.koiwaclub.com](https://aws.koiwaclub.com/)で合格できました。

しかしこの試験に関しては情報の更新が激しい分野であることもあり、一切見覚えのない問題が多めに出題されました。具体的には2019年8月に一般公開された[AWS Lake Formation](https://aws.amazon.com/jp/lake-formation/?whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc)の情報が結構な頻度で出題されましたが、教材では取り上げられていませんでした。比較的新しい情報が既に問題に組み込まれているようです。

逆に言うとLake Formationまでキャッチアップできる教材であれば鮮度は高いという事になります。とはいえ教材のおかげで自信をもって解ける問題も10%以上は出題されました。

Amazon EMRはソリューションアーキテクトでも出題されるサービスであり、試験問題の難易度そのものも決して高くないはずですが、その上で詳細な知識、経験がないと手も足も出ない要素が多めです。どうにか合格できましたが、結果を見るまで受かった手ごたえはありませんでした。

全体感としては主に下記のカテゴリが出題されます。

#### データ分析

* AWS Lake Formation
* Amazon EMR
* AWS Glue
* Amazon Athena
* AWS Batch

#### データ収集
* Amazon Kinesis
* Amazon Managed Streaming for Apache Kafka
各ユースケースにおいてData StreamsとData Firehoseどちらが適切かを理解する事が特に重要です

#### データ活用
* Amazon QuickSight
* Amazon Elasticsearch Service

#### データ保管
* Amazon Redshift
* Amazon DynamoDB
* Amazon S3
* Amazon RDS

こちらもどのDBが適切か、はたまたS3を活用するのが適切かが様々なケースで問われます。

#### データ移行

* AWS Database Migration Service (AWS DMS)
* AWS Snowball

#### データアナリティクスにおける基礎知識

* Spark、Hive、Hadoop、HBaseなどApache製品への理解
* Jupyter Notebook、Kibana、Logstashなどデータ分析で用いる各種プロダクトの理解
* Parquet、ORCなどのデータ形式
* GZIP、SNAPPYなどデータ圧縮形式

## 感想

問題文そのものは読んでいて苦痛になるようなレベルの難易度のものは控えめで油断していたのですが、いざ本番を迎えると勘で解くような問題ばかりで焦りました。
無事に合格できてよかったです。

