---
title: "【合格記】Google Cloud Professional Developer認定資格を振り返る"
date: 2024/01/17 00:00:00
postid: a
tag:
  - GCP
  - Google Cloud
  - 合格記
category:
  - Infrastructure
thumbnail: /images/20240117a/thumbnail.png
author: 岸下優介
lede: "Developer力を試すべくProfessional Developer認定資格を受験し、無事に合格を果たすことができました。"
---
<img src="/images/20240117a/Professional_Level_Google_Meets_Background.png" alt="" width="1200" height="682" loading="lazy">


## はじめに

TIG岸下です。

Futureに中途で入社して今月で2年になります。2年前に初めてGoogle Cloudのプロジェクトに携わることになってから、ありがたいことに2年間Google Cloudに触れてきました。そこで、今回はDeveloper力を試すべくProfessional Developer認定資格を受験し、無事に合格を果たすことができました。

本記事では試験の特徴や学習内容、頻出しそうな項目について記していきたいと思います。

また本試験はGoogle Cloudパートナー企業向けのバウチャーを活用して受験しました。大変感謝しております！

Google Cloud 認定資格関連の過去記事：

[【合格体験記】Google Cloudの入門試験：Cloud Digital Leader](https://future-architect.github.io/articles/20231226a/)
[【合格記】Google Cloud Professional Cloud Security Engineer認定資格を振り返る ](https://future-architect.github.io/articles/20230921a/)
[【合格記】Google Cloud Professional Data Engineer認定資格を振り返る](https://future-architect.github.io/articles/20211013a/)
[【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る](https://future-architect.github.io/articles/20220930a/)
[Google Cloud Professional Cloud Architectの再認定に合格しました](https://future-architect.github.io/articles/20220411a/)
[GCP Professional Cloud Network Engineer に合格しました](https://future-architect.github.io/articles/20200902/)
[GCP Associate Cloud Engineer 合格記](https://future-architect.github.io/articles/20210625a/)

皆さんの協力のおかげで残りの合格記は
- Cloud Database Engineer
- Cloud DevOps Engineer
- Google Workspace Administrator

の3つのみとなり、非常に感慨深いです。

## 試験と出題範囲

[公式の出題範囲](https://cloud.google.com/learn/certification/cloud-developer?hl=ja)と、実際に自分が受けた際の所感は以下になります。

### スケーラビリティ、可用性、信頼性に優れたクラウドネイティブ アプリケーションの設計

- コンテナの基礎知識
    - アプリケーションのコンテナ化におけるベストプラクティス
- アーキ設計とサービスの使い分け
    - Cloud Run、Google Kubernetes Engine、App Engine、Managed Instance Groupなどアプリケーションのデプロイ環境
    - Cloud SQL、Spanner、Bigtable、Firebaseなどのデータベース環境
    - 内部通信のみを利用したいケース（限定公開のGoogleアクセスを利用するなど）
- GKE（Kubernetes）の基礎知識
    - Ingress、Service、Deployment、Podなどの役割、何を定義するのか
    - Workload Identityを利用したサービスアカウントとの紐づけ
    - Namespaceの使い分けにおけるベストプラクティス
    - Pod同士の通信方法
    - 水平スケーリングと垂直スケーリング
    - Istio（Google CloudマネージドであればAnthos Service Mesh）
- PubSubの基礎知識
    - トピックやサブスクリプションの置き方
    - トピックからPushされるのか、Pullするのか

### アプリケーションのデプロイ

- デプロイ方法の理解
    - カナリアリリース、Blue/Green、ローリングアップデートなど
- トラフィックの分割
    - サービスそのものの機能としての分割（Cloud Runなど）、Kubernetesの機能としての分割
- デプロイタイミングの制御
    - Cloud Buildを利用した自動化

### デプロイされたアプリケーションの管理

- Cloud Loggingへのログ出力
    - JSON形式による吐き出しの推奨
    - エラー標準出力を利用した連携
- Cloud Loggingの他サービスとの連携
    - ログルーターを利用したPubSub、BigQuery、Cloud Storageとの連携
    - Google Cloud外のサービスと連携するにはPubSubにルーティングしておくなど
- Cloud Monitoringを利用したアラートの設定
    - ログベースなのか、メトリクスベースなのか
- Cloud ProfilerやTraceを利用したエラーやサービス遅延の解明
- 権限回り
    - 最小権限の法則に従う
    - エラー内容から足りない権限のトラブルシューティング

### アプリケーションのビルドとテスト

- Cloud Buildを利用したイメージビルド
    - Cloud Source Repositoryとの連携による自動化
- Artifact Registryを利用したイメージの脆弱性チェック
    - Binary Authorization
- 単体テストのベストプラクティス
    - PubSubやCloud Runエミュレータを利用したローカルでのテスト

### Google Cloud サービスの統合

- オンプレとGoogle Cloudサービスの統合
    - Kubernetesクラスターの共存
- リフトアンドシフト
    - 業務影響を最小に抑えた移行戦略
    - データベースとして利用されているアプリケーションを考慮した移行

### 全体的な所感

やはりDeveloperということもあって、Google Cloudを利用したアプリケーション開発におけるベストプラクティスを問われる問題が多かったです。特に**Kubernetesの基礎知識、GKEやCloud Runなど、アプリケーションをデプロイするためのサービスへの基礎知識**は絶対に必要になります。
また、どの試験もあるあるな出題ですが、要求されるサービスがマネージドを希望しているのかどうか、可用性が重視されているのかなど、問いの文脈からサービスを選ぶ能力は必須です。
ただどの試験も4～5択なので、答えがわからなくても問いの文脈から消去法を使って選択肢を絞り込むことはできるので、サービスごとの違いを理解しておくと答えやすくなります。

## 受験までの過程

出題範囲の内容はほとんど実務で経験済みだったので、勉強期間は1週間ほどで済みました。試験への理解度を測るために、毎度おなじみのUdemyで問題集を購入し、各模擬試験セットを2周しておきました。

[詳解Google Professional Cloud Developer 模擬試験2024](https://www.udemy.com/course/google-professional-cloud-developer-2023/)

## まとめ

Google Cloudのサービスは多岐にわたるため数が多く、存在を知らないサービスが結構あります。
今回受験してみて、Cloud ProfilerやCloud Traceというサービスの存在や利用用途を知ることができました。特にデプロイされたアプリケーションの関数毎でリソースに対する使用割合を計測することができるCloud Profilerは今後使うことがでてきそうだなーと思いました。
また、デプロイ環境はほとんどのケースでまずCloud Runがファーストチョイスでいいのでは？ってくらいCloud Runは便利なサービスだと試験内容を復習する中で感じました。

[Cloud アーキテクチャセンター](https://cloud.google.com/architecture?hl=ja)をベースにした問題も多く、ここらへんのドキュメントを1つずつハンズオンでやっていくと、更に理解を深められそうです。
Developer力を試したい方は一度受けてみてはいかがでしょうか！

アイキャッチ画像は[Google Cloud Certification](https://sites.google.com/robertsonmarketing.com/digitalassetdownloadportal/digital-toolkit)から付与されたものになります。

