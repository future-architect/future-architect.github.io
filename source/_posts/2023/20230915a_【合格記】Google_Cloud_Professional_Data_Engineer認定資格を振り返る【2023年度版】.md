---
title: "【合格記】Google Cloud Professional Data Engineer認定資格を振り返る【2023年度版】"
date: 2023/09/15 00:00:00
postid: a
tag:
  - PDE
  - GoogleCloud
  - 合格記
  - Udemy
category:
  - DataEngineering
thumbnail: /images/2023/20230915a/thumbnail.png
author: 岸下優介
lede: "最近Data Engineeringを扱うプロジェクトへ異動したこともあり、Google CloudにおけるData Engineeringを網羅的に学びたく、Professional Data Engineer認定資格を受けてきました。"
---
<img src="/images/2023/20230915a/image.png" alt="" width="599" height="586" loading="lazy">

## はじめに

TIG 岸下です。

最近Data Engineeringを扱うプロジェクトへ異動したこともあり、Google CloudにおけるData Engineeringを網羅的に学びたく、Professional Data Engineer認定資格を受けてきました。結果として、無事に合格を果たすことができました。

本記事では学習内容などの過程を書いていこうと思います。

また本試験はGoogle Cloudパートナー企業向けのバウチャーを活用して受験しました。大変感謝しております！

過去記事：

- [【合格記】Google Cloud Professional Data Engineer認定資格を振り返る](https/articles/20211013a/)

Google Cloud 認定資格関連の過去記事：

- [【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る](/articles/20220930a/)
- [Google Cloud Professional Cloud Architectの再認定に合格しました](/articles/20220411a/)
- [GCP Professional Cloud Network Engineer に合格しました](/articles/20200902/)
- [GCP Associate Cloud Engineer 合格記](/articles/20210625a/)

## 試験と出題範囲

[公式](https://cloud.google.com/certification/data-engineer?hl=ja)の出題範囲と、実際の試験内容の所感は以下になります。

### データ処理システムの設計

- データの前処理を行ううえでどのようなアーキテクチャ・サービスが推奨されるか？
  - ローコード・ノーコードで前処理したい
    - DataprepやData Fusion
  - Kubernetesを利用したオーケストレーションの活用
    - Cloud Composer
- データの受け口にキューイングシステムであるPubSubを構えておくのが鉄板
- データベースの用途は何なのか？ 取り扱うデータは？ 時系列？ トランザクション？
  - 用途によって、DBのサービスを選ぶ
  - Cloud SQL/Bigtable/Firestore/Spannerどれを選ぶべきか
- サーバーレスでSQL使いたい？ データウェアハウスを構築したい？
  - BigQuery使おう
- BigQueryとPubSubが優秀
  - 回答に困ったらとりあえずBigQueryかPubSubが入っている選択肢を選ぶというくらいにBigQueryとPubSubが強すぎる感（主観）
  - 特にBigQueryは別格感ありますね。実務でも使い倒されてます。

### 機械学習モデルの運用化

- モデルが過学習している場合はどうするか？
  - データを増やす
  - 正規化する
  - 学習パラメータを減らす
- 欠損値を含む場合はどうするか？
  - ノーコードで除去したい場合はDataprep
  - DataflowでBigQueryを前処理として組み込む手もある
- 機械学習モデルの学習処理を早く終わらせたい場合はどうするか？
  - GPUが使えるフレームワークであれば、GPU搭載インスタンスの利用
- クライアントが解決したい課題はどのモデルを使うべきか
  - 回帰問題/分類問題を理解しておく
- 機械学習モデルの運用方法
  - 学習の自動化
  - データセットの監視・管理

### ソリューションの品質の確保

- 適切なアラート設計
  - 何を指標としたアラートを設計すべきか？
- システムの可用性はどうあるべきか
  - ゾーナル/リージョナル/マルチリージョナル
  - レプリカの活用
- Dataflowなどにおける処理遅延に対するトラブルシューティング
  - 適切なノードのスケールアップ
- 法規制に対応するためのデータの置き方
  - 1プロジェクトにデータを集約させるデータレイクのような形をとっておく
- 適切なログの集約・保管
  - Log sinkやログバケットの活用
  - 検索性を高めたいのであればBigQueryへシンク

### データ処理システムの構築と運用化

- 複数のリソースからデータを参照したい場合のDB・ストレージの選択
- IAMを利用したデータのアクセス制限
  - プロジェクトレベルのIAM
  - データセットレベルのIAM
  - テーブルの列レベルのIAM
- Cloud DLPを利用した機密情報の保護
  - 暗号化した情報は復元できるようにしておく必要がある or Not?

## 受験までの過程

勉強期間は約1か月ほどで、主に以下2つの教材を利用しました。

- Google Cloud Skills Boost for Partners
  - [Create and Manage Cloud Resources](https://go.cloudplatformonline.com/ODA4LUdKVy0zMTQAAAGLnYP9oegPUvBCNvLo78WmEQiM_CnVxjPXmx9ZG9q4pL9Bk0xJ1_vowa60C6W4Qm_6JFo07i8=)
  - [Perform Foundational Data, ML and AI Tasks in Google Cloud](https://go.cloudplatformonline.com/ODA4LUdKVy0zMTQAAAGLnYP9oUG5zPOW9QIHqa1spOv9I4AzHhHRS34gabCSyuSdn6Aa3zIPRpEex1uthLSuBtNJiSM=)
  - [Engineer Data in Google Cloud](https://go.cloudplatformonline.com/ODA4LUdKVy0zMTQAAAGLnYP9oZY0kQV0dpn8ANn8j0ArOZiyxYzkn_yNbnbe_Av40gu0nqSxLYUw7WT_K-QYO8_De6I=)
- Udemy
  - [GCP : Google Cloud Professional Data Engineer Practice Tests](https://www.udemy.com/share/109eq23@8q8wUTalxAxhRgFfWbEgH1c3mbjL7aXRRw7dpbqd0PHnoLq-HnSq5UGeaHyEwA0e/)

### Google Cloud Skills Boost for Partners

こちらの教材は、Google CloudにおけるData Engineeringをハンズオン形式で構築しながら学ぶことができます。
例えば、

- CSV形式のデータセットに対して、欠損値や外れ値などをDataprepやDataFusionを利用してデータクレンジングを行う
- BigQueryを利用して前処理を施した後に、BigQuery MLを利用して機械学習モデルを構築する
- Cloud Dataflowを利用した機械学習パイプラインの構築

などを、実際のGoogle Cloud環境を利用して構築できます。
やはり、手を動かしながら学ぶ方法が一番頭に入ってくると思います。

#### Udemy

認定資格には実技試験はないので、やはり仕上げはUdemyの模擬試験で慣らします。

Udemyの模擬試験は色々あって迷うと思いますが、Google Cloudは日々アップデートされておりますので、できるだけ最新の情報が反映された模擬試験（教材が公開されて日が浅いもの）を利用したほうがよいです。

今回利用した模擬試験は英語試験用でしたが、DeepLなどの翻訳機を併用することで難なくこなすことができます。

模擬試験を2～3周やっておけば、自信をもって試験に臨むことができると思います。

## 終わりに

本試験はML Engineer認定資格と学習範囲が被っている部分もあり、自分にとってはサクサク学習を進めることができました。ただ、より込み入ったデータ処理の技術、特にCloud ComposerやDataproc周りの知識が浅く、そこの学習を重点的に行いました。これらの範囲は実務でも必要だったのでちょうどよかったです。

資格試験は目標が立てやすく、ラーニングパスも多く公開されており、学習のとっかかりには非常によいと思うので皆さんもぜひ受けてみてください。

アイキャッチ画像は[Google Cloud Certification](https://cloud.google.com/learn/certification?hl=ja)から付与されたものになります。
