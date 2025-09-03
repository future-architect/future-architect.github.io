---
title: "【合格記】Google Cloud Professional Cloud DevOps Engineer認定資格を振り返る"
date: 2024/07/31 00:00:00
postid: a
tag:
  - GoogleCloud
  - 合格機
  - PCDE
category:
  - Infrastructure
thumbnail: /images/2024/20240731a/thumbnail.png
author: 岸下優介
lede: "Google Cloud認定資格全冠を目指すべく、Professional Cloud DevOps Engineer 認定資格（PCDE）を受けてきました。無事に合格することができたので、本記事ではざっくりとした所感を書いていきたいと思います。"
---
<img src="/images/2024/20240731a/image.png" alt="" width="537" height="560" loading="lazy">

## はじめに

Google Cloud認定資格全冠を目指すべく、Professional Cloud DevOps Engineer 認定資格（PCDE）を受けてきました。無事に合格できたので、本記事ではざっくりとした所感を書いていきたいと思います。

また本試験はGoogle Cloudパートナー企業向けのバウチャーを活用して受験しました。大変感謝しております！

Google Cloud 認定資格関連の過去記事：

- [【合格記】Professional Cloud Database Engineer認定資格を振り返る](/articles/20240730a/)
- [【合格記】Google Cloud Professional Developer認定資格を振り返る](/articles/20240117a/)
- [【合格体験記】Google Cloudの入門試験：Cloud Digital Leader](/articles/20231226a/)
- [【合格記】Google Cloud Professional Cloud Security Engineer認定資格を振り返る](/articles/20230921a/)
- [【合格記】Google Cloud Professional Data Engineer認定資格を振り返る](/articles/20211013a/)
- [【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る](/articles/20220930a/)
- [Google Cloud Professional Cloud Architectの再認定に合格しました](/articles/20220411a/)
- [GCP Professional Cloud Network Engineer に合格しました](/articles/20200902/)
- [GCP Associate Cloud Engineer 合格記](/articles/20210625a/)

## 試験と出題範囲

[公式の出題範囲](https://cloud.google.com/learn/certification/cloud-devops-engineer?hl=ja)と、実際に自分が受けた際の所感は以下になります。

### DevOps 向けに Google Cloud 組織をブートストラップする

- 再現性のあるインフラストラクチャ構築
  - [Deployment Manager](https://cloud.google.com/deployment-manager/docs?hl=ja)やTerraformなどのIaCツールを活用
- 組織内で統一されたポリシーの適用
  - [リソース階層とIAMの適用範囲](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy?hl=ja)への理解
    - フォルダを活用したプロジェクトの分離
  - [組織ポリシー](https://cloud.google.com/resource-manager/docs/organization-policy/overview?hl=ja)の活用
    - サービスアカウントのKey Fileを作成させたくない
    - 外部ドメインへのIAM付与を禁止したい
    - など
- ログの管理
  - [ログシンク](https://cloud.google.com/logging/docs/export/configure_export_v2?hl=ja)を活用した複数のPJを跨いだログ集約
  - ログの長期保管に向けたCloud Storageにおける[Storage Class](https://cloud.google.com/storage/docs/storage-classes?hl=ja)の選択

### サイト信頼性エンジニアリングのプラクティスをサービスに適用する

- ポストモーテムの導入
  - 失敗を繰り返さないインシデントレポート
  - 人を批判せずにシステムを批判する
  - しくじりを共有しやすい文化を醸成する
- Service Level Agreement(SLA)/Service Level Objective(SLO)/Service Level Indicator(SLI)の導入
  - カスタマー目線に立ったシステムモニタリングを導入する
  - [Golden Signals](https://cloud.google.com/blog/ja/products/management-tools/the-right-metrics-to-monitor-cloud-data-pipelines)の導入
  - [Cloud Monitoringを利用したSLOの設定](https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring?hl=ja)
  - エラーバジェットに基づいたリリース計画
- インシデント発生時の対応方法
  - ステークホルダーへの情報共有
  - インシデント対応を行うための各種ロール設定
    - Incident Commander
    - Operation Lead
    - Communication Lead
    - など
  - バージョンのロールバックを通じた原因の切り分け

### サービス パフォーマンスを最適化する

- パフォーマンスに影響を及ぼしている原因の探索
  - [Cloud Profiler](https://cloud.google.com/profiler/docs/about-profiler?hl=ja)を活用したアプリケーションのCPU・メモリ使用量などの可視化
  - [Cloud Trace](https://cloud.google.com/trace/docs/overview?hl=ja)を活用したリクエスト時間、レイテンシといった通信関連の問題解決
- Googleのサービスを活用
  - [Recommender API](https://cloud.google.com/recommender/docs/overview?hl=ja)を利用した推奨事項の適用
- サービスのキャパシティ計画とFinOps
  - プロジェクトや組織のクオータへの理解と[Cloud Quotas](https://cloud.google.com/docs/quotas?hl=ja)の活用
  - [確約利用割引](https://cloud.google.com/docs/cuds?hl=ja)を利用した費用の最適化

### サービスの CI / CD パイプラインを構築および実装する

- サービスのデリバリを自動化する
  - Cloud Buildを活用したパイプラインの実装
  - テスト方法への理解
    - ユニットテスト
    - 統合テスト
    - 受入テスト
    - スモークテスト
    - シャドーテスト
    - など
  - [Binary Authorization](https://cloud.google.com/binary-authorization/docs?hl=ja)を利用したイメージの信頼性担保
  - Artifact Registryにおける[脆弱性スキャン](https://cloud.google.com/artifact-registry/docs/analysis?hl=ja)
  - [Cloud KMS](https://cloud.google.com/kms/docs?hl=ja)を利用した暗号化
- APIのバージョニング
  - サードパーティの開発者を混乱させない[バージョニング戦略](https://cloud.google.com/endpoints/docs/openapi/versioning-an-api?hl=ja)を策定
    - 廃止する前に通知する
    - 移行期間を設ける
    - 下位互換性を用意しておく
    - など
- サービスのリリース
  - シチュエーションに応じた適切なリリース方法の選択
    - カナリア
    - ブルーグリーン
  - [Cloud Runにおけるロールバック、カナリーリリース、トラフィック移行](https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration?hl=ja)

### サービスのモニタリング戦略を実装する

- モニタリングへの理解
  - Cloud Monitoringの[カスタムダッシュボード](https://cloud.google.com/monitoring/charts/dashboards?hl=ja)構築
  - Compute Engineへ[Ops Agent](https://cloud.google.com/stackdriver/docs/solutions/agents/ops-agent?hl=ja)を導入しメトリクスを収集
  - 問題に対して見るべきメトリクスの選択
  - [Monitoring Query Language](https://cloud.google.com/monitoring/mql?hl=ja)を利用したログの探索やアラート設定
  - ネットワークモニタリングには[VPC Flow Logs](https://cloud.google.com/vpc/docs/flow-logs?hl=ja)の活用

### 全体的な所感

DevOpsということもあり、試験範囲となるGoogle Cloudのサービスはかなり多岐に及びます。その中でも特にGoogle Kubernetes Engine（GKE）・Cloud Runに関連した問題が多く、これらのサービスへの理解はマストとなりました。また、Googleが提唱するSite Reliability Engineering（SRE）も試験範囲に含まれており、そのベストプラクティスに関する知識が問われるため、過去に[SRE本](https://www.oreilly.co.jp/books/9784873117911/)を読んでおいてよかったなと思いました。SREの内容に関しては[Googleが無料で提供しているWebサイト](https://sre.google/sre-book/table-of-contents/)もあるので、こちらでも良さそうです。

全冠を目指す際の順番的にはProfessional Developer、Professional Cloud Security Engineerを取ってから本試験を受験すると、試験範囲的に被っている部分も多く勉強しやすいのかなと思いました。

## 勉強方法

どの試験もそうですが、4～5択から正解を選ぶ選択式試験なので模擬試験などで場数をこなすことが大事だと思います。

- Google Cloud公式提供の[模擬試験](https://docs.google.com/forms/d/e/1FAIpQLSeHlfS9VksepK1crk8WIWTJW_kR1Gti8uf3_w8mfqU1fBNDHw/viewform?hl=ja)を受験する
- Udemyなどのオンライン学習サービスで模擬試験を購入し勉強する
  - https://www.udemy.com/course/2023google-cloud-professional-devops-engineer

正解の選択肢を暗記するというよりは、間違った問題に対してドキュメントを読みことが大切です。なぜその選択肢が正解なのかを理解することで他の問題にも応用できるようになっていきます。

## まとめ

本記事ではPCDEを受けた際の所感を記載させて頂きました。Google CloudのProfessional認定資格では、合格特典が貰えるのでモチベが上がります。ただ、アパレル系特典は長袖しかないので今後は半袖が追加されることを期待しております🤞

<img src="/images/2024/20240731a/image_2.png" alt="" width="1200" height="598" loading="lazy">
