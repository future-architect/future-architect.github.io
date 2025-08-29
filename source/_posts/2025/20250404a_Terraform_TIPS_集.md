---
title: "Terraform TIPS 集"
date: 2025/04/04 00:00:00
postid: a
tag:
  - Terraform
  - Tips
category:
  - Programming
thumbnail: /images/2025/20250404a/thumbnail.png
author: 前原応光
lede: "Terraform を利用する中でこんな使い方があるのかってことを少しでも知ってもらえればと思い、TIPS 集を書いています。"
---

<img src="/images/2025/20250404a/terraform_tips.png" alt="" width="800" height="550">

# はじめに

TIG 前原です。[Terraform 連載2025](/articles/20250331a/)の4日目です。

Terraform を利用する中でこんな使い方があるのかってことを少しでも知ってもらえればと思い、TIPS 集を書いています。
既にご存知の方も多い内容かもしれないですが、ご了承ください。

# TIPS 内容

今回、ご紹介する内容を以下に記載します。

* 詳細ログ出力の取得方法
* プロバイダの確認コマンド
* Terraform 実行中にロックがかかった場合
* terraform plan -detailed-exitcode を使った差分チェック
* リソースのタイアウト時間の調整
* Terraform の並列実行

## 詳細ログ出力の取得方法

Terraform の挙動を細かく調査したいときに環境変数の設定をすることで、詳細なログを確認することができます。

```bash
export TF_LOG=DEBUG
```

Terraform apply をした時などにDEBUG レベルの詳細なログを確認することができます。
また、ログをファイルとして保存したい場合は、以下で可能です。

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
```

### ログレベルによる利用用途について

各ログレベルでの利用用途についてです。

* DEBUG: Terraform の内部処理を確認
* TRACE: プロバイダがクラウドのAPI に対して行ったリクエスト、レスポンスまで確認したい場合

## プロバイダの確認コマンド

現在、利用しているプロバイダのバージョンや参照元を確認できます。

```bash
$ terraform providers

Providers required by configuration:
.
├── provider[registry.terraform.io/hashicorp/google] 6.23.0
├── provider[registry.terraform.io/hashicorp/archive]
└── provider[registry.terraform.io/hashicorp/google-beta]

Providers required by state:

    provider[registry.terraform.io/hashicorp/archive]

    provider[registry.terraform.io/hashicorp/google]
```

## Terraform 実行中にロックがかかった場合

Terraform 実行中に異常終了するとバックエンド（S3 やGCS など）のState ファイルが`ロック`される時があります。
`terraform force-unlock`を利用することで、強制的にロックを解除することができます。

例えば、以下のように`terraform plan`を実行しましたが、ロックがかかっているメッセージが出てきます。

```bash
│ Error: Error acquiring the state lock
│
│ Error message: writing "gs://hoge/dev.tflock" failed: googleapi: Error 412: At least one of the
│ pre-conditions you specified did not hold., conditionNotMet
│ Lock Info:
│   ID:        1743715123443466
│   Path:      gs://hoge
│   Operation: OperationTypePlan
│   Who:       hoge
│   Version:   1.10.0
│   Created:   2025-04-03 21:18:43.090403 +0000 UTC
│   Info:
```

エラーで表示された`ID`を使い、ロックを解除します。

```bash
terraform force-unlock <ID>
```

本番環境などでロック解除を行う際は、他の作業者がTerraform を実行中でないことを必ず確認してください。誤ったロック解除はState ファイル破損や予期せぬトラブルにつながります。

## terraform plan -detailed-exitcode を使った差分チェック

Terraform をCI/CD 環境で利用しているときに`リソースの差分があるかどうか`を自動的に判定したいケースがあると思います。
その時に役立つオプションとして`terraform plan`コマンドの`-detailed-exitcode`です。

### `-detailed-exitcode`とは

通常、Terraform コマンドの`plan`コマンドは、終了コードとして以下を返します。

* 0（成功）: Terraform が正常に処理完了（差分があっても）
* 1（エラー）: Terraform に何らかのエラーを検知（構文エラーなど）

一方で、`-detailed-exitcode`を使用すると、Terraform の終了コードがより詳細になります。

* 0（差分なし）: Terraform によるリソース更新がない
* 1（エラー）: Terraform に何らかのエラーを検知（構文エラーなど）
* 2（差分あり）: Terraform によるリソース差分が発生し、変更が必要なとき

実際にターミナルで確認する場合のコマンドは以下です。

```bash
$ terraform plan -detailed-exitcode
echo $? # 終了コード確認
### 出力例
2
```

`-detailed-exitcode`をCI/CD のパイプラインに組み込むことで差分発生時のハンドリングが可能となります。
以下は GitHub Actions のサンプルで、Terraform Plan 実行後に差分が検出された場合（終了コードが2）のみ、terraform apply を実行する フローです。

```yaml
- name: Terraform Plan
  run: terraform plan -detailed-exitcode
  continue-on-error: true
  id: plan

- name: Terraform Apply
  if: steps.plan.outcome == 'failure' && steps.plan.exit-code == 2
  run: terraform apply -auto-approve
```

## リソースのタイムアウト時間の調整

Terraform でリソース作成、削除するときに何かしらの理由で処理が長くなる時があります。
そんな時に便利なのがTerraform の`timeouts`ブロックです。
これを利用することで想定以上の時間が経過している時に`処理失敗`としてエラーにできます。
例えば、以下のように設定することで最大40分まで待機し、処理がその時間内に完了しなければエラーとします。

```tf
resource "google_sql_database_instance" "example_db" {
  name             = "my-example-db"
  database_version = "POSTGRES_15"
  region           = "asia-northeast1"

  settings {
    tier = "db-n1-standard-4"
    disk_size = 1000

    backup_configuration {
      enabled = true
    }
  }

  # タイムアウトを明示的に調整
  timeouts {
    create = "40m" # 作成完了まで最大40分待機
    delete = "30m" # 削除完了まで最大30分待機
    update = "60m" # 更新完了まで最大60分待機
  }
}
```

* create: リソースの作成処理を待つ時間の最大値
* delete: リソース削除処理を待つ時間の最大値
* update: リソースの更新処理を待つ時間の最大値（必要に応じて設定）

## Terraform の並列実行

Terraform を使ってリソースを作成、更新などする際、リソース数が多いと適用に時間がかかることがあります。
そんな時にTerraform が持つ並列実行のオプション（-parallelism）を活用すると、実行速度の改善が可能です。
ユースケースとしては、大量のリソースを持つプロジェクトの初期構築時や、インフラ更新時間を短縮したい時に効果的です。

Terraform は、デフォルトで最大10リソースを並列（同時）に作成、更新します。

```bash
### 並列数を30に指定した場合
$ terraform plan --parallelism=30

### 環境変数でPlan の並列数を指定
$ export TF_CLI_ARGS_plan="--parallelism=30"

### 環境変数でApply の並列数を指定
$ export TF_CLI_ARGS_apply="--parallelism=30"
```

並列数を大きくすると高速になりますが、API のレートリミットに引っかかる可能性があるため、20-30程度から試すのがおすすめです。

# さいごに

様々なTerraform のTIPS を記載しました。

今回ご紹介したTIPSが少しでもお役に立てれば幸いです。
