---
title: "Artifact Registry利用料金の最適化方針と対応手順"
date: 2026/05/19 00:00:00
postid: a
tag:
  - Terraform
  - GoogleCloud
  - ArtifactRegistry
category:
  - Infrastructure
thumbnail: /images/2026/20260519a/thumbnail.png
author: 大江悠斗
lede: "初めてArtifact Registryに触れたのでその内容について紹介させてください。Artifact RegistryとはGoogle Cloud環境で開発の成果物を一元管理・保管するサービスです。主に以下の3つの特徴があります。"
---

[Terraform連載2026](/articles/20260518a/) の2本目です。

# はじめに

2024年新卒入社の製造エネルギーグループの大江悠斗です。

初めてArtifact Registryに触れたのでその内容について紹介させてください。

# Artifact Registryとは

Artifact RegistryとはGoogle Cloud環境で開発の成果物を一元管理・保管するサービスです。

主に以下の3つの特徴があります。

* **多様なフォーマットの統合管理**
Artifact RegistryはDockerイメージだけでなく、Node.js、Python、Java、OSパッケージなどのあらゆる成果物を1つの場所で統合して管理できます。
* **CI/CDパイプラインとのシームレスな連携**
GitHub ActionsやCloud BuildなどのCI/CDと連携して、「自動でビルドされArtifact Registryに保存」「そこからCloud Runなどの実行環境へ自動デプロイされる」という高速で自動化された開発サイクルを簡単に構築できます。
* **強固なセキュリティとサプライチェーンの保護**
単なるファイルの保管庫ではなく、セキュリティを担保する機能が組み込まれています。
  * **脆弱性スキャン**
  保存されたコンテナイメージに対して、自動でスキャンを行い、既知の脆弱性が無いかをチェックします。
  * **厳密なアクセス制限**
  IAMを使って細かい権限管理が可能です。

# 背景と課題

Google Cloud環境でCloud Run、Cloud Functionsやdbtなどを利用していると、デプロイのたびにArtifact Registryへ新しいコンテナイメージが自動保存されます。

しかし、Artifact Registryのデフォルト設定では古いイメージが自動削除されません。そのため、放置しておくとストレージ容量が右肩上がりに増加し、利用料金が増大してしまうという課題がありました。

このコストを最適化するため、不要な旧世代イメージを自動削除する **クリーンアップポリシー** を導入することにしました。

# 仕様理解に苦労した点

ここが今回、私が一番苦戦した点です。

当初、私は「保持したい世代数」を指定すれば、それ以外は自動で消えるものだと思い「保持ポリシー（KEEP）」のみを設定していました。しかし、公式ドキュメントの[削除ポリシーを作成する](https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy?hl=ja#delete)にも記載がある通り、「保持ポリシー」を設定しただけでは、削除処理は実行されません。

Artifact Registryのクリーンアップポリシーは、以下の2つをセットで適用する必要があります。

* **KEEP ポリシー**: 最新のN世代など、消したくないものを **「保護」** する
* **DELETE ポリシー**: 条件に合致するものを **「削除」** する

つまり、 **「KEEPで守られていないものを、DELETEで消す」** という2段階の論理構成になっていることに気づかず、「設定を入れたのにイメージが全く消えない……」と頭を抱えることになりました。

<img src="/images/2026/20260519a/Gemini_Generated_Image_.png" alt="Gemini_Generated_Image_.png" width="1200" height="603" loading="lazy">

# 参考：環境ごとの設計方針

参考までに、今回の導入に当たってはコストとリスクのバランスを考慮し、以下の方針で環境ごとに保持世代数を使い分けました。

* **開発環境**: コスト最小化を優先し最新バージョンのみ保持
* **本番環境**: 障害発生時などに確実な復旧ができるよう安全性を確保

このように何でもかんでも削除するのではなく、「万が一の時、環境ごとにどこまで戻せるべきか」というビジネス継続性の視点をもって設定をしました。

# Terraformによる実装例

汎用的な Terraform コードの例を紹介します 。ポイントは、保持したい条件（KEEP）と、それ以外を削除する条件（DELETE）の両方を定義することです。

```tf
resource "google_artifact_registry_repository" "example_repo" {
  project       = "your-project-id" # プロジェクトIDは環境に合わせて変更してください
  location      = "asia-northeast1" # ロケーションを指定してください
  repository_id = "example-repo"
  format        = "DOCKER"

  # ★重要: 意図しない削除を防ぐため、初回適用時は true (ドライラン) を推奨
  cleanup_policy_dry_run = true

  # ポリシー1: 世代数保持 (KEEP)
  # 最新の5世代を保護対象とする例
  cleanup_policies {
    id     = "keep-latest-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  # ポリシー2: 削除 (DELETE)
  # KEEPで保護されていない、すべてのタグ状態（ANY）のイメージを削除対象とする
  cleanup_policies {
    id     = "delete-old-versions"
    action = "DELETE"
    condition {
      tag_state = "ANY"
    }
  }
}
```

※本記事のコードはTerraform `v1.1.0` 以上、Google Cloud Provider `v6.4.0` にて動作確認しています。


# 導入時の注意点

設定を反映させる際、以下の点に注意するとスムーズです。

* **ドライランの活用**: `cleanup_policy_dry_run = true` に設定すると、実際の削除は行われず、Cloud Logging に削除対象の候補が出力される
* **反映タイミング**: 設定後、即座に削除が始まるわけではなく、Google Cloud のバックグラウンド処理により最大24時間程度かかる場合がある
* **権限**: ログで削除対象を確認するには、プライベート ログ閲覧者 (`roles/logging.privateLogViewer`) 権限などが必要になる場合がある

ログエクスプローラーで以下のクエリを実行すると、削除候補のイメージ一覧を確認できます。

```properties
protoPayload.serviceName="artifactregistry.googleapis.com"
protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.BatchDeleteVersions"
```

※ドライランの挙動はデータアクセス監査ログとして出力されます。事前にArtifact Registry APIのログ取得を有効にしておく必要があります。

# さいごに

今回は Artifact Registry のコスト最適化について紹介しました。

単純な「保持設定」だけでは削除が行われないという仕様は、初見では少し分かりにくいポイントかもしれません。仕組みを理解してしまえば Terraform で一括管理できる便利な機能ですので、コスト増に悩んでいる方はぜひ試してみてください。

この記事が、同じように「イメージが消えない！」と悩む方の助けになれば幸いです。

# 参考リンク

- [Artifact Registry のクリーンアップ ポリシーの管理](https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy?hl=ja)
