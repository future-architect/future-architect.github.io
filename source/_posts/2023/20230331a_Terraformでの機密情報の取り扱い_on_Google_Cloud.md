---
title: "Terraformでの機密情報の取り扱い on Google Cloud"
date: 2023/03/31 00:00:00
postid: a
tags:
  - GoogleCloud
  - 暗号
  - Terraform
  - Terraform1.4
categories:
  - IaC
series: "Terraform2023"
thumbnail: /images/2023/20230331a/thumbnail.png
author: 岸下優介
lede: "最近、Terraform内での機密情報の取り扱いについて触れることがあり、Terraformのv1.4のInteractive input for sensitive variables is now masked in the UI (#29520) についてのENHANCEMENTを取り上げつつ、Terraform環境上での機密情報の取り扱いについて.."
---

<img src="/images/2023/20230331a/mozillasops.png" alt="" width="711" height="411">

## はじめに

TIG岸下です。[Terraform連載](/articles/20230327a/)の5リソース目の記事です。

## Terraform v1.4 Release🎉

Terraformのv1.4が今月リリースされました。
https://github.com/hashicorp/terraform/releases/tag/v1.4.0

最近、Terraform内での機密情報の取り扱いについて触れることがあり、

> Interactive input for sensitive variables is now masked in the UI [(#29520)](https://github.com/hashicorp/terraform/issues/29520)

こちらのENHANCEMENTを取り上げつつ、Terraform環境上での機密情報の取り扱いについて記載します。

### sensitive指定されたvariableの取り扱い

plan/apply時にインタラクティブに入力を求めることができるvariableですが、以下のように`sensitive`フラグを指定できます。

```tf
resource "google_sql_user" "test_user" {
  project  = google_project.project_one.project_id
  name     = "test-user"
  instance = google_sql_database_instance.test_db.name
  host     = "%"
  password = var.db_password
}

variable "db_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
}
```

今回のリリースにて`sensitive=true`にされたvariableは、入力する際にターミナル上で表示されなくなりました。

```bash terminal
# これまで
$ terraform apply
var.db_password
  Database user password

  Enter a value:abcdefg

# Terraoform v1.4以降
$ terraform apply
var.db_password
  Database user password

  Enter a value:
```

これまでのsensitive機能はapply/plan結果やtfstateファイル内のマスキングのみでしたが、今回のリリースにて入力時にもマスキングされるようになった形です。

```sh plan/apply結果やtfstateが(sensitive value)でマスキングされる（これまでの機能）
Terraform will perform the following actions:

  # google_sql_user.photo_app will be created
  + resource "google_sql_user" "test_user" {
      + host                    = "%"
      + id                      = (known after apply)
      + instance                = "test-db"
      + name                    = "test-user"
      + password                = (sensitive value)
      + project                 = "xxx"
      + sql_server_user_details = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

## 実運用での機密情報の取り扱い

ただ、このインタラクティブマスキング機能はあまり日の目を見ないかもしれません...😢
（plan/apply時に毎回入力しないといけないのは面倒...）

実運用上では、**関係者のみに閲覧権限の与えられたプライベートリポジトリを前提**としてDBの認証情報やAPI key、証明書など共有リポジトリ上に置いておきたい機密情報があると思います。

その場合は、sopsを使って暗号化します。

### sops

sopsはmozillaが開発している暗号化ツールです。

https://github.com/mozilla/sops

YAML、JSON、ENV、INI、BINARYフォーマットに対応し、Google CLoud KMS、AWS KMS、Azure Key Vault、age、PGPにて利用することが可能です。

### sops-provider

また、Terraformではsopsのproviderを公開されており、こちらを利用することで暗号化されたファイルをplan/apply時に自動で復号化してくれます。
https://github.com/carlpett/terraform-provider-sops

また、復号化した内容も先ほど取り上げた`(sensitive value)`として自動でマスキングしてくれるので、安心して取り扱うことができます。
**※(sensitive value)として自動でマスキングしてくれる機能はTerraform v0.15以上での対応となります。**

### Cloud Key Management Service(Cloud KMS)

[Cloud Key Management Service（Cloud KMS）](https://cloud.google.com/kms/docs/key-management-service?hl=ja)はGoogle Cloudの鍵作成・管理サービスで、鍵を生成したり、既存の鍵をCloud KMSへインポートして管理できます。
また暗号化するための鍵をキーリングという形でグルーピングして管理できます。

今回はsopsの暗号化に利用する鍵にKMSの鍵を利用します。
また、暗号化・復号化には以下のIAMロールが必要となります。

- roles/cloudkms.cryptoKeyEncrypterDecrypter

```tf kms.tf
resource "google_kms_key_ring" "key_ring" {
  project  = google_project.project_one.project_id
  name     = "test-key-ring"
  location = "global"
}

resource "google_kms_crypto_key" "test_key" {
  name     = "test-key"
  key_ring = google_kms_key_ring.key_ring.id
  purpose  = "ENCRYPT_DECRYPT"
}

data "google_iam_policy" "encrypter_and_decrypter" {
  binding {
    role    = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
    members = ["user:xxx@test.com"]
  }
}

resource "google_kms_key_ring_iam_policy" "key_ring_iam" {
  key_ring_id = google_kms_key_ring.key_ring.id
  policy_data = data.google_iam_policy.encrypter_and_decrypter.policy_data
}
```

リソース作成後、テスト用のAPI key（test-apikey.json）を用意しておき、sopsにて暗号化を行います。

```json secrets/test-apikey.json
{
  "test":"aaa"
}
```

（sopsのインストールは公式のgoを利用した方法ではうまくいかず、[こちら](https://docs.technotim.live/posts/install-mozilla-sops/)を参考にバイナリからインストールしました）。

```sh sopsによる暗号化
sops --input-type json --encrypt --gcp-kms projects/<PROJECT_ID>/locations/global/keyRings/test-key-ring/cryptoKeys/test-key secrets/test-apikey.json > secrets/test-apikey_encrypted.json
```

今回、sops-providerを利用して自動で復号化を行うため、providerの追加を行います（terraform initを忘れずに）。

```tf versions.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
# sopsを追加
    sops = {
      source  = "carlpett/sops"
      version = "~> 0.7"
    }
  }
}
```

これで準備が整ったので、API Keyを使うCloud Functionを書いてみます。

```tf cloud_function.tf
resource "google_cloudfunctions_function" "test-fnc" {
  project     = google_project.project_one.project_id
  name        = "test-fnc"
  region      = "asia-northeast1"
  description = "test function"

  runtime      = "go119"
  timeout      = 120
  entry_point  = "TEST"
  trigger_http = true
  source_archive_bucket = google_storage_bucket.bucket.name
  source_archive_object = google_storage_bucket_object.archive.name

  environment_variables = {
    APIKEY = data.sops_file.api_key.data["test"]
  }
}

data "sops_file" "api_key" {
  source_file = "./secrets/test-apikey_encrypted.json"
}
```

terraform planを打ってみると、

```sh terminal
Terraform will perform the following actions:

  # google_cloudfunctions_function.test-fnc will be created
  + resource "google_cloudfunctions_function" "test-fnc" {
      + available_memory_mb           = 256
      + description                   = "test function"
      + docker_registry               = (known after apply)
      + entry_point                   = "TEST"
      + environment_variables         = {
          + "APIKEY" = (sensitive value)
        }
      + https_trigger_security_level  = (known after apply)
      + https_trigger_url             = (known after apply)
      + id                            = (known after apply)
      + ingress_settings              = "ALLOW_ALL"
      + max_instances                 = 0
      + name                          = "test-fnc"
      + project                       = "ksst-project-one"
      + region                        = "asia-northeast1"
      + runtime                       = "go119"
      + service_account_email         = (known after apply)
      + source_archive_bucket         = "go-test-function-bucket"
      + source_archive_object         = "test.zip"
      + timeout                       = 120
      + trigger_http                  = true
      + vpc_connector_egress_settings = (known after apply)
    }
```

`APIKEY`の箇所が`(sensitive value)`でマスキングされていることがわかります。

また、コンソールから復号化されたAPIKEYがちゃんと入っているかどうかも確認してみると、ちゃんと入ってますね🎊

<img src="/images/2023/20230331a/d02d879d-a94b-e788-ccc0-cffad344e32c.png" alt="" width="628" height="218" loading="lazy">

このようにCloud KMSを利用することで、機密情報を一々入力する必要がなくなり、更に機密情報の内容は追加した本人のみしか知らない状態でTerraform上の運用が可能になります。

ここでくれぐれも気を付けたいのが、**暗号化前のファイルをgitでpushしないようにしましょう**。暗号化はGitのリポジトリ内でやらないなどの運用ルール作りが大切です。

また、Google CloudのSDKが利用な環境であればSecret Managerを使うなど、**できる限りGitには機密情報をあげないようにして運用する工夫**は大切です。

明日は川口さんの[Terraform x GitOps](/articles/20230403a/)です。お楽しみに！
