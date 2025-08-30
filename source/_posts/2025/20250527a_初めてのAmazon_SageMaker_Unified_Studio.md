---
title: "初めてのAmazon SageMaker Unified Studio"
date: 2025/05/27 00:00:00
postid: a
tag:
  - AWS
  - SageMaker
  - データカタログ
  - データマネジメント
category:
  - DataEngineering
thumbnail: /images/2025/20250527a/thumbnail.png
author: 中神孝士
lede: "カタログ管理やデータ活用を行うツールとしてAmazon SageMaker Unified Studioの調査・検証を行ったので触ってみた所感やポイントなどつらつらとこの記事に書いていこうと思います。"
---

[春の入門祭り2025](/articles/20250413a/)の24本目の記事です。

# はじめに

こんにちは、TIG中神です。

カタログ管理やデータ活用ツールとしてAmazon SageMaker Unified Studioの調査・検証を行ったので触ってみた所感やポイントなどつらつらとまとめます。

# Amazon SageMaker Unified Studioとは？

みなさんAWSでSageMakerと聞くと何を想像するでしょうか？ おそらくAWSのSageMakerと聞くと機械学習のサービスを思い浮かべる方も多いかと思います（私も同じ認識でした）

実はAWSのデータマネジメント関連のサービスがSagemakerシリーズとして統合されることが[re:Invent2024で発表](https://aws.amazon.com/jp/blogs/news/healthcare-and-life-sciences-top-10-announcements-from-aws-reinvent-2024/)され、その中で中核を担うAmazon SageMaker Unified Studioが[2025年3月13日に一般提供](https://aws.amazon.com/jp/about-aws/whats-new/2025/03/amazon-sagemaker-unified-studio-generally-available/)されました。

公式のページのSageMakerの配下にはおなじみのRedshiftやGlueやAthenaなども記載されており、これらのデータを扱う既存のサービス群との連携を強化し、より利便性を高めていくのがAmazon SageMaker Unified Studioの役割になっていくと思います。

<img src="/images/2025/20250527a/{C20B3C58-89A7-4E12-AEBE-2D121A57B936}.png" alt="{C20B3C58-89A7-4E12-AEBE-2D121A57B936}.png" width="1200" height="783" loading="lazy">

引用：[Amazon SageMaker（機械学習モデルを大規模に構築、トレーニング、デプロイ）| AWS](https://aws.amazon.com/jp/sagemaker)

SageMaker Unified Studioでは以下の図のようにデータを活用していくための様々な機能が包含されています。

<img src="/images/2025/20250527a/{753A5134-D8F7-460C-9AA2-3120D57E90C8}.png" alt="{753A5134-D8F7-460C-9AA2-3120D57E90C8}.png" width="846" height="876" loading="lazy">

引用：[Amazon SageMaker（機械学習モデルを大規模に構築、トレーニング、デプロイ）| AWS](https://aws.amazon.com/jp/sagemaker)

- **Unified Studio**： データ分析とAIのツールを単一の開発環境として提供する機能
- **Lakehouse**： SageMaker Lakehouseを利用したS3やRedshift、および外部DWHと連携したデータアクセス機能
- **カタログ**： Amazon Datazoneを利用したデータのカタログ機能
- **SQL分析**： Amazon Redshiftを利用したSQL分析機能
- **データ処理**： Amazon AthenaやGlueを利用したデータ処理機能
- **モデル開発**： Amazon Sagemaker AIを利用したモデル開発機能
- **生成AIアプリケーション開発**： Amazon Bedrockを利用した生成AIアプリケーション開発機能

# 環境構築

これまで記載した内容を見るといろいろなサービスが関連していて環境準備がめんどくさそうだなと思われるかもしれませんが、動かすまでのステップはシンプルです（もちろんそれなりに深く使い込んでいく場合はハマりポイントが諸々あります。その辺は後述します）

1. マネジメントコンソールからAmazon SageMakerのサービスに移動してドメイン作成しましょう

   <img src="/images/2025/20250527a/image.png" alt="image.png" width="1200" height="440" loading="lazy">

2. とりあえず動かすだけであれば何も考えずに既存のVPCを使ってQuick Setupしちゃいましょう

   <img src="/images/2025/20250527a/image_2.png" alt="image.png" width="1200" height="546" loading="lazy">

3. 少し（数秒から数十秒）待てばドメインが作成されますね

   <img src="/images/2025/20250527a/image_3.png" alt="image.png" width="598" height="564" loading="lazy">

4. この後は統合スタジオからデータの活用に向けたSageMakerのセットアップをしていく事になります

   <img src="/images/2025/20250527a/{8B87197D-E9A8-48E1-9190-50A4BB050BBF}.png" alt="{8B87197D-E9A8-48E1-9190-50A4BB050BBF}.png" width="1200" height="611" loading="lazy">

   ここで1つポイントですがこのままでは統合スタジオにはログインできないので、ログイン前に先ほど作成したドメインよりユーザーの追加してください（SSOユーザー、IAMユーザー、SSOグループのいずれかが追加できます）

   <img src="/images/2025/20250527a/image_4.png" alt="image.png" width="1200" height="472" loading="lazy">

5. Good evening　これで統合スタジオにログインできるようになります

   あとはニーズに合わせて統合スタジオ上でリソースやオブジェクトを作成していって頂けるといいかと思います

   <img src="/images/2025/20250527a/image_5.png" alt="image.png" width="1200" height="585" loading="lazy">

# 基本的な使い方

この記事は初めてシリーズという事で個別の機能には触れませんが、上述した機能が使用できますので、必要に応じて機能を使っていって頂けるといいかと思います。

また、この製品の活用ポイントしては、いわゆるデータレイクに蓄積したデータをカタログ化してそのまま生成AIと連携させるなどデータ蓄積された状態からデータ活用に向けてシームレスに連携しやすくなるのがポイントではないかと思います。

SnowflakeやDatabricksなど外部のDWHにも対応しているので、データメッシュ構成の場合でも要件を満たす場合は利用が検討できるでしょう。

# 利用におけるハマりポイントや今後改善を期待するポイント

Amazon SageMaker Unified Studioにはデータ活用に関する様々な機能が実装されていますが2025年3月13日に一般提供されたばかりですのでハマりポイントや改善を期待したいポイントがあります（以下の記載内容は2025年5月23日時点の所感です）

- [マニュアル](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/what-is-sagemaker-unified-studio.html)の記載が乏しい部分がある（応用的な使い方をしようとするとマニュアルの記載内容では情報が足りない場合が多い）
  - カタログに登録したデータの公開/非公開によりどのように共有範囲が変わるのか？または挙動が変わるのか？
  - カタログに登録したデータの検索仕様など（何故これが検索結果にリストされるのかなど）
  - どこからどこまでがSagemakerの機能でどこからが別サービスの機能になるのか
  - 結構な頻度で定期的に実行される処理がSagemaker上にあるがそれが何なのか？
- Terraformに対応していない（使い込んでいくと結構細かい設定が増えていくのでIaC化できないとつらい）
- 統合スタジオのUIが玄人向き（利用者のスキルレベルに合わせて画面カスタマイズできるとよい）
- 外部DWHとの連携で一部想定と異なる挙動あり（仕様通りだと思うがそういう動きを期待している訳ではないという事がある）
- 想定通りの挙動となった場合のエラー切り分けや対処が難しい（事例や情報が少ないため）
- Amazon SageMaker Unified Studioからデータソースに対してクエリ実行できるが、外部のデータソースに対するレスポンスが悪い（コネクションを張った後、クエリ実行まで時間がかかるイメージ）
- AWSの他サービスとの連携が基本になるのでIAMロールの設計や権限管理が難しい（特にGlueと連携する場合はLake Formationの[ハイブリッドモード](https://docs.aws.amazon.com/ja_jp/lake-formation/latest/dg/hybrid-access-mode.html)を理解しないと想定通りのアクセスができない）

# まとめ

いかがでしたでしょうか？ まだ一般提供されたばかりで今後の改善や発展を期待しますが非常にポテンシャルのあるサービスだと思いますので今後も継続的にウォッチしていきたいと思います。

またAWS以外にも似たような機能カバレッジを持つクラウドサービスやSaaSがあるので競合製品の動向も気にしつつ最適なプロダクトを選定していければと思っています。
