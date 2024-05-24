---
title: "GCP連載#6 Terraform Validatorを使って、GCPのセキュリティポリシーの自動チェックを行う"
date: 2020/02/13 10:26:28
postid: ""
tag:
  - GCP
  - Terraform
  - Policy-as-Code
category:
  - Infrastructure
author: 齋場俊太朗
lede: "Terraform Validatorを使って、組織のセキュリティポリシーの自動チェックを継続的に行う方法を紹介します。併せて、ポリシーをコードとして管理する方法も紹介します。Policy as code です。もちろんセキュリティポリシーのみだけではなく、命名規則やリージョン制限なども扱えます。"
---

[GCP連載](/articles/20200202/)の6回目です。今回は**Terraform Validatorを使って、組織のセキュリティポリシーの自動チェックを継続的に行う**方法を紹介します。併せて、ポリシーをコードとして管理する方法も紹介します。**Policy as code** です。もちろんセキュリティポリシーのみだけではなく、命名規則やリージョン制限なども扱えます。

# Infrastructure as code 理想と現実
Infrastructure as code (以下 IaC)、ここ最近大分一般的になってきました。弊社でも大半のプロジェクトは導入しています。3年前とかに導入するために一苦労していた時代が懐かしい..
IaCが当たり前になった今、インフラの構成管理はもう問題ないかというとそうではありません。**特にプロジェクト数がスケールする場合**、以下のような問題が発生してしまっているのではないでしょうか。

* 各チームに権限を委譲しインフラを管理してもらうが、組織のポリシーに反したリソースが作成されてしまう
* そもそも組織のポリシーが定義・明文化できていない
* できていても周知できない、周知できていても、守ってもらえない

例えば、"GCSのバケットを全世界に公開してしまっている" という誤った設定も本番環境にデプロイされてしまうかもしれません。

<img src="/images/20200213/photo_20200213_01.png" loading="lazy">

GCPだけではなく、多くのクラウド管理者が同じような悩みを抱えているかと思います。私もその一人です。各チームの開発者がクラウドインフラに熟知しているわけではありません。では、クラウド管理者がすべてソースコードをレビューすればよいか、いやいや、それも現実的ではない。

IaCがアプリケーション開発やっと同じ土俵に立った今、同じく **CI(継続的インテグレーション)** の仕組みが必要になってくるのは、自然の流れかと思います。terraform fmtがされているか、planが通るか、等の簡単なチェックをやっている人は多いと思いますが、それよりも高度なチェックを行う仕組みがなく私も方法を探しておりました。

# Terraform Validator とは
これを実現するのが、今回紹介する **Terraform Validator** です。Terraform Validatorは、 **terraformがapplyされる前に、インフラのリソース設定が定義したポリシーに従っているかをチェックすることができるツール**です。GCPのオープンソースとして公開されています。 [GoogleCloudPlatform/terraform-validator](https://github.com/GoogleCloudPlatform/terraform-validator)

以下が概要の図です。

<img src="/images/20200213/photo_20200213_02.png" loading="lazy">


仕組みはごく単純です

* Policy をソースコード(yaml)として定義
* Terraformのplanの結果(json)を生成
* Terraform Validatorに読み込みさせ、チェック結果を出力

ポリシーに反したリソースがterraformで定義された場合、以下のように `Found Violations` と出力されます。 (以下のサンプルは、GCSのロケーションが許可されていないリージョンを利用している)

```bash
# Sample
$ terraform-validator validate --policy-path=${POLICY_PATH} ./terraform.tfplan.json
Found Violations:
Constraint allow_some_storage_location on resource //storage.googleapis.com/validator-trial: //storage.googleapis.com/validator-trial is in a disallowed location.
```

# ハンズオン
ではさっそく、実際に試してみます。**"GCSのロケーションに制限をかける"** シンプルなパターンで試してみます。以下のようにフォルダ構成を用意し、2つのファイルを作成しました。

* `storage_location.yaml` : (ポリシーを定義するコード)
* `main.tf` : (terraformのコード)

<img src="/images/20200213/photo_20200213_03.png" loading="lazy">


## Terraform Validator インストール

バイナリファイルがGCSで公開されているので、最新版をダウンロードし適当なパスに配置

```bash
$ gsutil ls -r gs://terraform-validator/releases
$ gsutil cp gs://terraform-validator/releases/2020-01-23/terraform-validator-linux-amd64 .
$ mv terraform-validator-linux-amd64 terraform-validator-linux-amd64
$ chmod 755 terraform-validator
```

## Policyを定義

PolicyをGit cloneし、`POLICY_PATH` を定義

```bash
$ git clone https://github.com/forseti-security/policy-library.git
$ export POLICY_PATH="/<your_work_space>/policy-library"
```

Sampleからファイルをコピーし、ポリシーを定義します。policies/constraints 配下に配置したファイルが有効化されます。今回はGCSのLocationに制限をかけます (**ap-northeast-1のみを許可する**)


```bash
$ cd /<your_work_space>/policy-library/policies/constraints
$ cp ../../samples/storage_location.yaml .
```

```yaml
apiVersion: constraints.gatekeeper.sh/v1alpha1
kind: GCPStorageLocationConstraintV1
metadata:
  name: allow_some_storage_location
spec:
  severity: high
  match:
    target: ["organization/*"]
  parameters:
    mode: "allowlist"
    locations:
    - asia-northeast1
    exemptions: []
```

## Terraform planの実行

main.tfは以下のように定義されています。`location="us-central1-a"` と設定しています
(その他 variable.tf, provider.tf等は省略)

```terraform
resource "google_storage_bucket" "validator_trial" {
      project       = <your project>
      name          = "validator-trial"
      force_destroy = false
      storage_class = "REGIONAL"
      location      = "us-central1-a"
}
```

planを実行 `--out=` optionを利用

```bash
$ terraform plan --out=terraform.tfplan
```

terraform.tfplanのバイナリをjsonへ変換

```bash
$ terraform show -json ./terraform.tfplan > ./terraform.tfplan.json
```

## Terraform Validatorの実行

これで準備は整いました。Terraform Validatorの実行を行います。

```bash
$ terraform-validator validate --policy-path=${POLICY_PATH} ./terraform.tfplan.json
Found Violations:
Constraint allow_some_storage_location on resource //storage.googleapis.com/validator-trial: //storage.googleapis.com/validator-trial is in a disallowed location.
```

Validationによりポリシー違反を検知しました！🚫

main.tf を修正して..

```diff
resource "google_storage_bucket" "validator_trial" {
      project       = <your project>
      name          = "validator-trial"
      force_destroy = false
      storage_class = "REGIONAL"
-     location      = "us-central1-a"
+     location      = "asia-northeast1"
}
```

再度実行してみると..

```bash
$ terraform-validator validate --policy-path=${POLICY_PATH} ./terraform.tfplan.json
No violations found
```

今度はValidationが成功しました！✅ 期待通りの動きをしてくれました。

# ポリシー定義 (Policy as code)
サンプルポリシーは、先ほど利用した [forseti-security/policy-library](https://github.com/forseti-security/policy-library/tree/master/samples) にあります。これらのyamlファイルを `POLICY_PATH` で定義した `/<your_work_space>/policy-library` の中の `policies/constraints/` 配下に配置すればOKです。Policy as codeが簡単に実現できます。
以下に、サンプルから一部をピックアップしてご紹介します。セキュリティポリシーを定義できるほかにも、リソースの命名規則の制限ができたりするのは地味に嬉しいですね。

#### ポリシー定義のサンプル
* 一般的な制限
    - リソースの命名規則(正規表現で指定)
    - Labelのアタッチの強制
    - リソースタイプの制限
* GCE
    - Public IPの無効化
    - NWのWhitelist指定
* Cloud SQL
    - Public IPの無効化
    - Maintenance Windownの制限
    - SSLの強制
* GKE
    - Private Clusterの強制
    - Dashboardの無効化
    - Node poolのAuto upgradeの強制
    - Node OSの指定
* BigQuery
    - Datasetのパブリック公開制限
* IAM
    - Service Accountへ付与するRoleの制限
    - Audit loggingの強制
* Network
    - Firewall ssh,rdp rule パブリック公開の禁止
* VPC Service Control
    - 有効化プロジェクトの指定

どのような制限をかけることができるかイメージできたでしょうか。実はこちらに用意されていないものでも、Custom Policyとして自身でポリシールールを記述することもできます。詳細は[こちら](https://github.com/forseti-security/policy-library/blob/master/docs/constraint_template_authoring.md)

# 実際の運用
実行方法とポリシーの定義方法が分かったところで、実際の運用方法についてです。
以下のように、TerraformのソースコードのPRに対して、Terraform Validatorを実行し、結果をPRにフィードバックさせるようにするのが良いと思います。Githubと連携が可能であれば、CloudBuildで以下のようにCIを回すのが簡単でよいです。

<img src="/images/20200213/photo_20200213_04.png" loading="lazy">

Cloud BuildのSteps イメージ

```yaml
---
steps:
- name: gcr.io/config-validator/terraform-validator
  entrypoint: terraform
  dir: your-terraform-folder
  args:
  - init
- name: gcr.io/config-validator/terraform-validator
  dir: your-terraform-folder
  entrypoint: terraform
  args:
  - plan
  - -out=terraform.tfplan
- name: gcr.io/config-validator/terraform-validator
  entrypoint: "/bin/bash"
  args: ['-c', 'terraform show -json terraform.tfplan > terraform.tfplan.json']
  dir: your-terraform-folder
- name: gcr.io/config-validator/terraform-validator
  dir: your-terraform-folder
  args:
  - validate
  - --policy-path=/<your_work_space>/policy-library
  - your-terraform-folder/terraform.tfplan.json
```

PR上でのフィードバックのイメージ
<img src="/images/20200213/photo_20200213_05.png" loading="lazy">


# 最後に
本記事ではあまり触れませんでしたが、実は、[Forseti](https://forsetisecurity.org/)というツールを用いてOngoingでの監視も可能です。こちらもGCPが公開しているオープンソースのツールです。これを用いれば、一元管理されたポリシーでTerraform経由ではない手作業によるポリシー違反の発生も検知することができます。

<img src="/images/20200213/photo_20200213_06.png" loading="lazy">


GCPのプロジェクト数がスケールする際に必ずぶち当たるであろうこの課題、私たちもTerraform Validatorを用いて解決しようと現在、試行錯誤中です。導入自体はシンプルにできるため、まずは簡単なポリシーのチェックから始めてみてはいかがでしょうか。

[GCP連載](/articles/20200202/)の6回目でした。次は加部さんの[GCPのData Transfer Serviceを使って簡単にS3からBigQueryにデータ転送をしてみる](/articles/20200214/)です。
