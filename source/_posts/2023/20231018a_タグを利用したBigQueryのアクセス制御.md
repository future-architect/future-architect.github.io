---
title: "タグを利用したBigQueryのアクセス制御"
date: 2023/10/18 00:00:00
postid: a
tag:
  - BigQuery
  - IAM
  - GCP
  - アクセス制御
category:
  - Infrastructure
thumbnail: /images/20231018a/thumbnail.png
author: 岸下優介
lede: "BigQueryは完全マネージドな、ペタバイトスケールかつコスパのよいデータウェアハウスとして知られております。便利なツールである一方、BigQueryで取り扱うデータには個人情報が含まれていることもあり、適切なアクセス制御が望まれます。Resource Managerのタグ機能を利用して…"
---
## はじめに

BigQueryは完全マネージドな、ペタバイトスケールかつコスパのよいデータウェアハウスとして知られております。そのため、ほぼリアルタイムで膨大な量のデータを解析することを可能としております。

便利なツールである一方、BigQueryで取り扱うデータには個人情報が含まれていることもあり、適切なアクセス制御が望まれます。
本記事では、Resource Managerのタグ機能を利用して、Terraformによるアクセス制御の実装を紹介したいと思います。

## Resource Managerのタグとは

Google Cloudのリソースに対して、Key-Valueペアでタグを付与してIAMの条件に含めることができる機能です。

例えばBigQueryのデータセットであれば、Key:`environment`に対してValue:`dev`, `stg`, `prd`を用意したり、Key:`dataset_type`に対してValue:`non-pii`, `pii`（個人情報を含むか否か）を用意したりなど、データの種類に応じてタグを付与して、より詳細な条件でIAMを管理することができます。

[タグの作成と管理 - Google Cloud](https://cloud.google.com/resource-manager/docs/tags/tags-creating-and-managing?hl=ja#before_you_begin)

## KeyとValueを作ってみる

早速Terraformを書いていきます。

タグはOrganization配下での管理となります。まずはKeyを作ります。

```sh tags_tag_key.tf
resource "google_tags_tag_key" "env_key" {
  parent      = "organizations/${local.organization.id}"
  short_name  = "environment"
  description = "Environment key"
}
```

このKeyに対してValueを作ります。

```sh tags_tag_value.tf
resource "google_tags_tag_value" "dev_tag" {
  parent      = "tagKeys/${google_tags_tag_key.env_key.name}"
  short_name  = "dev"
  description = "Development tag"
}

resource "google_tags_tag_value" "stg_tag" {
  parent      = "tagKeys/${google_tags_tag_key.env_key.name}"
  short_name  = "stg"
  description = "Staging tag"
}

resource "google_tags_tag_value" "prd_tag" {
  parent      = "tagKeys/${google_tags_tag_key.env_key.name}"
  short_name  = "prd"
  description = "Production tag"
}
```

適用後、コンソールを見てみましょう。
<img src="/images/20231018a/71638260-a888-a69d-56d2-bcb92fb94825.png" alt="" width="1200" height="489" loading="lazy">

`environment`に対して、`dev`, `stg`, `prd`というKey-Valueペアが生成されました。

## BigQueryのDatasetにタグを付与する

今回生成したタグをBigQueryのDatasetに付与していきましょう。
まずは以下のデータセットを用意します。

```sh bigquery.tf
resource "google_bigquery_dataset" "dataset_dev" {
  project    = google_project.project.project_id
  dataset_id = "dataset_dev"
  location   = "asia-northeast1"
}

resource "google_bigquery_dataset" "dataset_stg" {
  project    = google_project.project.project_id
  dataset_id = "dataset_stg"
  location   = "asia-northeast1"
}

resource "google_bigquery_dataset" "dataset_prd" {
  project    = google_project.project.project_id
  dataset_id = "dataset_prd"
  location   = "asia-northeast1"
}
```

データセットへタグを付与する方法ですが、

- Terraform
- gcloudコマンド
- Google Cloudコンソール

の3つの方法が存在します。

### Terraformでタグを付与する

Terraformでは、`google_tags_location_tag_binding`を利用してタグを付与します。
※本リソースは、現時点（2023/10/15）ではGoogle Betaとなっております。

[Terraform公式 - google_tags_location_tag_binding](https://registry.terraform.io/providers/hashicorp/google-beta/latest/docs/resources/google_tags_location_tag_binding?source=post_page-----6ec09bc31ae--------------------------------)

```sh tags_location_tag_binding.tf
data "google_tags_tag_key" "env_key" {
  parent     = "organizations/${local.organization.id}"
  short_name = "environment"
}

data "google_tags_tag_value" "dev_tag" {
  parent     = "tagKeys/${data.google_tags_tag_key.env_key.name}"
  short_name = "dev"
}

data "google_tags_tag_value" "stg_tag" {
  parent     = "tagKeys/${data.google_tags_tag_key.env_key.name}"
  short_name = "stg"
}

data "google_tags_tag_value" "prd_tag" {
  parent     = "tagKeys/${data.google_tags_tag_key.env_key.name}"
  short_name = "prd"
}

resource "google_tags_location_tag_binding" "dev" {
  provider  = google-beta
  parent    = "//bigquery.googleapis.com/projects/${google_project.project_one.project_id}/datasets/${google_bigquery_dataset.dataset_dev.dataset_id}"
  tag_value = data.google_tags_tag_value.dev_tag.id
  location  = "asia-northeast1"
}

resource "google_tags_location_tag_binding" "stg" {
  provider  = google-beta
  parent    = "//bigquery.googleapis.com/projects/${google_project.project_one.project_id}/datasets/${google_bigquery_dataset.dataset_stg.dataset_id}"
  tag_value = data.google_tags_tag_value.stg_tag.id
  location  = "asia-northeast1"
}

resource "google_tags_location_tag_binding" "prd" {
  provider  = google-beta
  parent    = "//bigquery.googleapis.com/projects/${google_project.project_one.project_id}/datasets/${google_bigquery_dataset.dataset_prd.dataset_id}"
  tag_value = data.google_tags_tag_value.prd_tag.id
  location  = "asia-northeast1"
}
```


### gcloudコマンドでタグを付与する

以下のコマンドで付与することができます。

```bash terminal
gcloud alpha resource-manager tags bindings create \
    --tag-value=<ORGANIZATION_ID>/environment/dev \
    --parent=//bigquery.googleapis.com/projects/my_project/datasets/dataset_dev \
    --location=asia-northeast1
```

権限が不足している場合は、Organizationにて以下の権限が必要になります。

- roles/resourcemanager.tagUser

### コンソールでタグを付与する

BigQueryのページから、データセットをクリックすると以下のようなデータセット情報が表示されます。
この画面から詳細を編集に移動して下さい。

<img src="/images/20231018a/fe171bd5-fe90-8ef9-cb20-1eeb945b2560.png" alt="" width="1200" height="499" loading="lazy">

タグを追加を押すことで、所望のタグを付与することができます。

<img src="/images/20231018a/4358d88e-757f-d924-3c7f-a6a0a59ae98c.png" alt="" width="852" height="1222" loading="lazy">

付与されたタグは「タグ」の箇所に記載されるようになります。

<img src="/images/20231018a/a310bef6-a3e4-fa3f-713c-4118f1f30511.png" alt="" width="1200" height="492" loading="lazy">

## IAMを付与する

データセットにタグも付与できたので、最後にIAMを付与しましょう。
IAM条件も記載し、`dev`タグが一致するデータセットのみを閲覧許可します。

```sh project_iam_member.tf
resource "google_project_iam_member" "test_user" {
  project = google_project.project.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "user:test@xxx.com"
  condition {
    title       = "only-dev"
    expression  = "resource.matchTag(\"${local.organization.id}/environment\", \"dev\")"
    description = "Only view the dataset with tag of dev."
  }
}
```

適用後、BigQueryを見てみるとちゃんとdevのデータセットのみが見えていることがわかります。

<img src="/images/20231018a/aab47fe7-e64b-ad96-2772-2434b2a716fd.png" alt="" width="1200" height="616" loading="lazy">

## まとめ

本記事ではタグを利用したBigQueryデータセットのアクセス権限制御について紹介しました。

データセット1つ1つのアクセス制御を行うには、各データセットに対してIAM(roles/bigquery.dataViewerなど)を割り当てる必要があったのですが、データセットに付与されたタグでまとめてIAMを管理できると適切な粒度でアクセス制御ができ、タグで閲覧可能な範囲がまとめられるので管理も楽できるなーと思いました。

データのセキュリティを強固にするには、内部のメンバーに対してのデータアクセス制御も非常に重要となります。ぜひタグベースのIAM制御を試してみてはいかがでしょうか？
