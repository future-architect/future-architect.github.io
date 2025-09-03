---
title: "【合格記】Google Cloud Professional Cloud Database Engineer認定資格を振り返る"
date: 2024/07/30 00:00:00
postid: a
tag:
  - GoogleCloud
  - 合格記
  - PCDB
category:
  - DB
thumbnail: /images/2024/20240730a/thumbnail.png
author: 岸下優介
lede: "Google Cloud認定資格全冠を目指すべく、Professional Cloud Database Engineer Certification（PCDB）を受けてきました。無事に合格することができたので、本記事ではざっくりとした所感を書いていきたいと思います。"
---
<img src="/images/2024/20240730a/image.png" alt="png" width="544" height="543" loading="lazy">

## はじめに

Google Cloud認定資格全冠を目指すべく、Professional Cloud Database Engineer Certification（PCDB）を受けてきました。無事に合格できたので、ざっくりとした所感を書いていきます。

また本試験はGoogle Cloudパートナー企業向けのバウチャーを活用して受験しました。大変感謝しております！

Google Cloud 認定資格関連の過去記事：

- [【合格記】Google Cloud Professional Developer認定資格を振り返る](/articles/20240117a/)
- [【合格体験記】Google Cloudの入門試験：Cloud Digital Leader](/articles/20231226a/)
- [【合格記】Google Cloud Professional Cloud Security Engineer認定資格を振り返る](/articles/20230921a/)
- [【合格記】Google Cloud Professional Data Engineer認定資格を振り返る](/articles/20211013a/)
- [【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る](/articles/20220930a/)
- [Google Cloud Professional Cloud Architectの再認定に合格しました](/articles/20220411a/)
- [GCP Professional Cloud Network Engineer に合格しました](/articles/20200902/)
- [GCP Associate Cloud Engineer 合格記](/articles/20210625a/)

## 試験と出題範囲

[公式の出題範囲](https://cloud.google.com/learn/certification/cloud-database-engineer?hl=ja)と、実際に自分が受けた際の所感は以下になります。

### スケーラブルで可用性の高いクラウド データベース ソリューションを設計する

- [Google CloudのDBサービス](https://cloud.google.com/products/databases?hl=ja)とその特性を理解する
  - Relational DB
    - Cloud SQL
    - Spanner
    - AlloyDB
  - NoSQL
    - Firestore
    - Bigtable
  - インメモリ
    - Memorystore
  - その他
    - MongoDB Atlas
    - Google Cloud Partner Services
- シチュエーション別でDBサービスを選ぶ
  - オープンソースのDBサービスを利用したい場合は？
  - 99.99％の可用性を求められる場合は？
  - グローバル展開が予測されている場合は？
  - スケーリングは要る？ 要らない？
- DBを構成するデータの種別でサービスを選ぶ
  - トランザクションデータ
  - ストリーミングデータ
  - リアルタイム

### データ ソリューションを移行する

- [Database Migration Service](https://cloud.google.com/database-migration/docs/overview)マジ便利
  - 他クラウドのDBやオンプレからGoogle Cloudへの移行が容易に可能
  - ダウンタイムを最小限に抑えた移行を実現
  - サポートされているサービスは理解しておく
    - [Supported source and destination databases](https://cloud.google.com/database-migration/docs/supported-databases#mysql)
- Oracleは[Bare Metal Solution](https://cloud.google.com/bare-metal?hl=ja)を使う
  - 但し、最近のトレンドとしては[Oracle on Google Cloud](https://cloud.google.com/solutions/oracle?hl=ja)

### 複数のデータベース ソリューションにまたがるソリューションを管理する

- トラブルシューティング
  - [Query Insights](https://cloud.google.com/sql/docs/postgres/using-query-insights?hl=ja)を利用したクエリのパフォーマンス分析
  - ディスクの拡張
  - DBにホットスポットが発生したときの対策
- データベースのセキュリティ
  - [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/mysql/sql-proxy?hl=ja)を使う
  - IAMは最小権限の法則に従う
  - Private IPを利用し、VPC内で接続を完結させる
  - [VPC Service Controls](https://cloud.google.com/vpc-service-controls/docs/overview?hl=ja)を利用して接続経路を絞る

### Google Cloud にスケーラブルで可用性の高いデータベースをデプロイする

- ディザスタリカバリ戦略に沿った構成を組む
  - 復旧時間目標（RTO）
  - 普及時点目標（RPO）
- DBとの接続方法
  - [IAMで制御したい場合は？](https://cloud.google.com/sql/docs/postgres/iam-authentication?hl=ja)
  - [Cloud RunなどサーバレスとCloud SQLを接続する場合は？](https://cloud.google.com/sql/docs/sqlserver/connect-instance-cloud-functions?hl=ja)
- IaCツールを利用した開発環境の整備
  - Terraformなどを利用して一律のフォーマットでデプロイすることで構成のミスを防ぐ
- 高可用性を実現する構成
  - プライマリインスタンスとリードレプリカのzone構成
  - [フェイルオーバー時にリードレプリカをプライマリへ昇格させる](https://cloud.google.com/sql/docs/mysql/replication/cross-region-replicas?hl=ja)

### 全体的な所感

正直のところ、認定資格の中ではPCDBが最も容易な試験だったと感じました。理由としては、

- DBというサービスに絞っているため、他試験よりも出題されるサービスの範囲が狭い
- サービス毎で用途を明確にしているため、問題で提示されるシチュエーション（データ種別、可用性、サービスの展開先など）から判断し易い
- Google Cloudの知識が無くても、DBに関する見識があれば解けてしまう問題もちらほら存在する

などが挙げられると思います。
もし既にProfessional Cloud Architectを合格されていて、ある程度Google CloudのDBサービスの見識をお持ちの場合、次に受ける試験としてはPCDBが良いのではないかなと思いました。

ただし、現状では試験が**英語での受験**しか選択できないことが少々ネックかもしれません。

## 勉強方法

どの試験もそうですが、4～5択から正解を選ぶ選択式試験なので模擬試験などで場数をこなすことが大事だと思います。

- Google Cloud公式提供の[模擬試験](https://docs.google.com/forms/d/e/1FAIpQLSe55cAg8a3NzgV_QCJ2_F75NAyE44Z-XuVB6oPJXaWnI5UBIQ/viewform?hl=ja)を受験する
- Udemyなどのオンライン学習サービスで模擬試験を購入し勉強する
  - https://www.udemy.com/course/2024google-cloud-professional-cloud-database-engineer

正解の選択肢を暗記するというよりは、間違った問題に対してドキュメントを読むことが大切です。なぜその選択肢が正解なのかを理解することで他の問題にも応用できるようになっていきます。

> Cloud Database Engineer 試験を受験するには、Google Cloud データベース ソリューションの実務経験が 2 年以上あることが推奨されます。構築を開始するには、一部のプロダクトの Google Cloud の無料枠を最大で 1 か月間、無料でお試しいただけます。

[公式](https://cloud.google.com/learn/certification/cloud-database-engineer?hl=ja)にも記載されている通りGoogle Cloudでは無料枠があるので、場合によっては自分で実際に環境を構築して触ってみるとより理解が深まります。

自分もGoogle CloudのDB関連では以下の記事を執筆しておりますので、是非参考にしてみてください。

[VPC外からCloud SQL Auth Proxyを利用したPrivate IP Cloud SQLへの接続](https://future-architect.github.io/articles/20231019a/)

## まとめ

PCDBを受けた際の所感を記載させて頂きました。資格試験は目標を立てられるためモチベが維持しやすく、Google Cloud Professional認定資格に限っては合格後のグッズプレゼント特典もあるので、良い感じにニンジンを吊るされた状態で完走できて最高です。

またこれは個人的な感想ですが、**自分がPCDBを受験した問題の範囲**ではAlloyDBの問題が一問も無かったり、英語しか試験が用意されてなかったりと全体的にアップデートされていない感じがあります🫠
もしかするとそのうちアップデートが入るかもなので、もしこの記事を参考にされる場合は早めの受験をおススメします！
