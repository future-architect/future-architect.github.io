---
title: "TFLintを使ってみる（GCP×Terraform）"
date: 2021/12/23 00:00:00
postid: a
tag:
  - Terraform
  - GCP
  - TFLint
category:
  - Infrastructure
thumbnail: /images/20211223a/thumbnail.png
author: 川端一輝
featured: false
lede: "terraform validateやterraform planでは検知できないエラーを見つけるために、TFLintを利用してみました。例えば、インスタンスタイプの誤りや命名規約違反を検知できます。本記事では、インストールから利用方法までを記載しています。"
---

<img src="/images/20211223a/top.png" alt="" width="800" height="431">

# はじめに

`terraform validate`や`terraform plan`では検知できないエラーを見つけるために、TFLintを利用してみました。TFLintを用いれば、例えばインスタンスタイプの誤りや命名規約違反を検知できます。

本記事では、インストールから利用方法までを記載しています。

# TFLintとは？
いわゆるTerraformのためのLinter。JavaScriptでいうと、ESLintのようなものです。構文やパラメータがルールに違反していないかをチェックしてくれるツールです。

# 環境やバージョン

今回利用した環境です。

- Windows10
- [tflint v0.34.0](https://github.com/terraform-linters/tflint)
- [tflint-ruleset-google v0.15.0](https://github.com/terraform-linters/tflint-ruleset-google)
- [terraform v1.1.0](https://www.terraform.io/)
    - ※Terraformがなくてもtflintは動作するので、Terraformは必須ではない
- Google Cloud

# tflintをインストール

1. [tflint/releases](https://github.com/terraform-linters/tflint/releases)から`tflint_windows_amd64.zip`をダウンロード
2. `tflint_windows_amd64.zip`を解凍
3. `tflint.exe`をパスが通ってるところに配置
3. 以下を実行し、バージョン情報が出たら成功

```bash PowerShell
$ tflint --version

TFLint version 0.34.0
```

※他OSでのインストール手順は以下を参照ください。

* [tflint installation](https://github.com/terraform-linters/tflint#installation)


# .tflint.hclの作成

`.tflint.hcl` とは、Pluginをインストールするための設定ファイルです。

今回は、GCPの RuleSet Pluginをインストールする例を記載します。

- `.tflint.hcl`はホームディレクトリか、カレントディレクトリに配置する必要がある
    - 今回は、ホームディレクトリに配置とする

```js .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.15.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}
```

※参考
* [Configuring TFLint](https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md)
* [tflint-ruleset-google installation](https://github.com/terraform-linters/tflint-ruleset-google#installation)


# tflint --initの実施

`.tflint.hcl` を記載したあとに、Pluginをインストールするために、以下のコマンドを実行します。初回のみ実施で問題ないです。

```bash PowerShell
$ tflint --init
```

# tflintの動作確認をしてみる

1. `google_compute_instance`の`machine_type`に存在しないインスタンスタイプを記載してみます。

```js example.tf
resource "google_compute_instance" "gce_test" {
  project      = "testest"
  name         = "testtest-gce001"
  zone         = "asia-northeast1-a"
  # ここで存在しないインスタンスタイプを指定
  machine_type = "n2-standard-200"
  ...
}
```

2. tflintを実行してみる。そうするとエラーがでます

```bash PowerShell
$ tflint

1 issue(s) found:

Error: "n2-standard-200" is an invalid as machine type (google_compute_instance_invalid_machine_type)

  on main.tf line 6:
   6:   machine_type = "n2-standard-200"
```

# 応用：moduleも対象とする

Terraformにはmoduleと呼ばれるカスタムリソースを作る機能があります。詳しくは[Terraformerとしてコードを書いて思うこと](/articles/20211029a/)を参照ください。

これをTFLintでチェックするためには、[Module Inspection](https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/module-inspection.md)に記載がある通り、`.tflint.hcl`に`module = true`を追記するだけです。


```sh .tflint.hcl
# add
config {
  module = true
}

plugin "google" {
  enabled = true
  version = "0.15.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}
```

# 応用：ルールを有効化する

TFLintに多くのチェックルールが予め用意されています。どんなルールがあって、どれがデフォルトで有効になっているかは以下に記載があるので確認すると良いでしょう。

- [TFLint Rules](https://github.com/terraform-linters/tflint/blob/master/docs/rules/README.md)
- [TFLint Rules Google](https://github.com/terraform-linters/tflint-ruleset-google/blob/master/docs/rules/README.md)

今回は例として、「terraform_unused_declarations」を有効化してみます。内容としては、「使っていないlocalsを検知できる」というルールです。

チェックするために、 先程の `.tflint.hcl` に `terraform_unused_declarations`を追記します。

```sh .tflint.hcl
config {
  module = true
}

plugin "google" {
  enabled = true
  version = "0.15.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}

# add
rule terraform_unused_declarations {
   enabled = true
}
```

使っていないlocalsを宣言したtfファイルを追加します。

```js example-valiable.tf
locals {
  unused = "test"
}
```

これに対して、TFLint実行します。ルール違反を検知したことがわかります。どのファイルの何行目に違反があったか表示してくれていますね。

```bash PowerShell
$ tflint

1 issue(s) found:

Warning: local.unused is declared but not used (terraform_unused_declarations)

  on example-valiable.tf line 2:
 168:   unused = "test"

Reference: https://github.com/terraform-linters/tflint/blob/v0.34.0/docs/rules/terraform_unused_declarations.md
```

# 利用上の注意点

TFLintを使っていくなかで、注意しなければと思ったものをあげていきます。

## 1. Local Valuesは評価されない

[TFLint skips expressions that reference static local values #571](https://github.com/terraform-linters/tflint/issues/571)にも記載があります。以下のように不正なインスタンスタイプをlocalsで定義してもエラーにならないです。

```js example.tf
locals {
  machine_type = "n2-standard-200"
}

resource "google_compute_instance" "gce_test" {
  project      = "testest"
  name         = "testtest-gce001"
  zone         = "asia-northeast1-a"
  machine_type = local.machine_type
  ...
}
```

```bash tflintの実行
$ tflint
# ルール違反を検知できない
```

## 2. 利用しているTerraformのバージョンとTFLintを揃える必要がある

[Compatibility with Terraform](https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/compatibility.md)のドキュメントに記載がある通り、TFLintはTerraformを内蔵しています。そのため、利用しているTerraformのバージョンに合わせて、該当バージョンのTFLintを利用する必要がある

直近のバージョン対応表をあげます。

| Terraform | TFLint |
|:-:|:-:|
|v1.1.0   |v0.34.0   |
|v1.0.0   |v0.30.0~v0.33.2   |
|v0.15.0   |v0.27.0~v0.29.1    |
|v0.14.9   |v0.26.0   |
|v0.14.7   |v0.25.0   |

※参考

* [Version固定でTFLintをインストールする](https://dev.classmethod.jp/articles/install-tflint-with-fixed-version/)


## 3. Deep Checkingを利用する場合の注意事項

[Deep Checking](https://github.com/terraform-linters/tflint-ruleset-google/blob/master/docs/deep_checking.md)は、GCPのAPIを利用してより厳密なチェックを行うことができるオプションです。

以下のように`deep_check = true`を追加することで、Deep Checkingが有効になります。ただし、`serviceusage.googleapis.com`が有効になっている必要があります。つまり、PJ作成時(APIが有効になっていない状態)にtflintを実行するとエラーになってしまうのでご注意ください。

```sh .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.15.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
  # add
  deep_check = true
}
```

※Projectは、providerのprojectを参照している

```sh example.tf
provider "google" {
  project = "testtest"
}
```

# .tflint.hcl のサンプルを用意したので、TFLintを動かしてみよう

全ルールをenableにした`.tflint.hcl` をサンプルとして用意しました。全ルールとは以下に記載のあるルールです。

- [TFLint Rules](https://github.com/terraform-linters/tflint/blob/master/docs/rules/README.md)
- [TFLint Rules Google](https://github.com/terraform-linters/tflint-ruleset-google/blob/master/docs/rules/README.md)
    - ※Deep Checkingの`google_disabled_api`は除いています

```js .tflint.hcl
config {
  module = true
}

plugin "google" {
  enabled    = true
  version    = "0.15.0"
  source     = "github.com/terraform-linters/tflint-ruleset-google"
  deep_check = false
}

rule "terraform_comment_syntax" {
  enabled = true
}

rule "terraform_deprecated_index" {
  enabled = true
}

rule "terraform_deprecated_interpolation" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_module_pinned_source" {
  enabled = true
}

rule "terraform_module_version" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_required_providers" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_standard_module_structure" {
  enabled = true
}

rule "terraform_typed_variables" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_unused_required_providers" {
  enabled = true
}

rule "terraform_workspace_remote" {
  enabled = true
}

rule "google_composer_environment_invalid_machine_type" {
  enabled = true
}

rule "google_compute_instance_invalid_machine_type" {
  enabled = true
}

rule "google_compute_instance_template_invalid_machine_type" {
  enabled = true
}

rule "google_compute_reservation_invalid_machine_type" {
  enabled = true
}

rule "google_container_cluster_invalid_machine_type" {
  enabled = true
}

rule "google_container_node_pool_invalid_machine_type" {
  enabled = true
}

rule "google_dataflow_job_invalid_machine_type" {
  enabled = true
}

rule "google_project_iam_audit_config_invalid_member" {
  enabled = true
}

rule "google_project_iam_binding_invalid_member" {
  enabled = true
}

rule "google_project_iam_member_invalid_member" {
  enabled = true
}

rule "google_project_iam_policy_invalid_member" {
  enabled = true
}
```

実運用上は利用しないルールを、個別にdisableにし、検知結果に対して運用が回るように調整していくことが重要かなと思います。


# まとめ

TFLintを使うことで、`terraform validate`や`terraform plan`で検知できないエラーを見つけることができました。

RuleSetに限りがあるので全エラーを検知できるとまでいきませんが、TFLintを導入することで`terraform apply`で失敗するケースが減っていくと考えています。
