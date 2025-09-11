---
title: "手動運用しているCloudflareをTerraformでInfrastructure as Codeする"
date: 2024/03/27 00:00:00
postid: a
tag:
  - Terraform
  - Cloudflare
  - IaC
  - tfstate
category:
  - DevOps
thumbnail: /images/2024/20240327a/thumbnail.png
author: 大岩潤矢
lede: "Cloudflareで管理しているドメインのDNS設定や、Cloudflare Pages等のサービスの設定を、Terraform管理に移行した際の手順等を、備忘録がてら記載します。"
---
## はじめに

この記事は、[Terraform連載2024](/articles/20240311a/)の10記事目です。

みなさんこんにちは。TIG所属の大岩潤矢( [@920OJ](https://x.com/920OJ) ) です。

本記事ではCloudflareで管理しているドメインのDNS設定やCloudflare Pages等のサービスの設定を、Terraform管理に移行した際の手順などを記載します。

## 背景

私は個人開発や自身のポートフォリオWebサイトの公開のために、 `920oj.net` というドメインを所持しています。このドメインはGoogle Domainsで取得し、ネームサーバを変更してCloudflare上でDNSレコードを管理しています。

また、自身の [ポートフォリオサイトWebサイト](https://920oj.net/) はCloudflare Pagesでホスティングしています。転送量無制限で月500ビルドまで無料というのはお財布に優しくありがたいです。

一方で、Webの管理画面からCloudflareでのドメイン管理や各種設定を変更する際、バージョン履歴を表示する機能がないため、一度変更してしまったものは元に戻すことができません。例えばDNS設定を更新する際、間違えた値に更新してしまった場合、元の値を記憶していない限りは戻せなくなってしまいます。[バージョニング機能](https://developers.cloudflare.com/version-management/)はあるものの、Enterpriseプランのみでしか使えないようです。

そこで利用したいと思い立ったのがTerraformです。CloudflareをTerrafromで構築し、そのコードをGit等で管理することにより、変更をバージョン管理できます。記事タイトルにある通り、「Infrastructure as Codeする」ということです。

一方でCloudflareはすでに利用中であるため、これまで手作業で実施してきた設定をTerraformへimportして管理することになります。

今回移行するものは、各ドメインのDNSレコードと、Cloudflare Pagesでホスティングしているプロジェクトの2つとします。

## CloudflareをTerraformで管理するための前準備

早速、既存リソースをTerraformで管理するための手順を紹介します。まずは下準備として、以下を実施します。

- tfstate管理用のR2バケットを作成
- APIトークンの発行
- 環境変数の設定

### Cloudflare R2へtfstate管理用のバケットを作成する

CloudflareにはR2というS3互換のストレージサービスがあり、tfstateはこのR2の中で管理する方針とします。R2でtfstateを管理する方法については、すでにこのテックブログで記事があるので、これを参考にします。

https://future-architect.github.io/articles/20231016a/

まずはCloudflareの管理画面にログインし、R2を選択→「Add R2 subscription to my account」を押下します。

<img src="/images/2024/20240327a/image.png" alt="Add R2 subscription to my accountをクリック" width="1200" height="615" loading="lazy">

「Create bucket」 を押下します。

<img src="/images/2024/20240327a/image_2.png" alt="Create bucketをクリック" width="965" height="405" loading="lazy">

バケット名を入力し、Locationは「Automatic」を選択します。最後に「Create bucket」を押下すれば、バケットが出来上がります。

<img src="/images/2024/20240327a/image_3.png" alt="oj-cf-tfstateというバケット名を入力" width="952" height="832" loading="lazy">

<img src="/images/2024/20240327a/image_4.png" alt="Automaticのチェックボックスを選択" width="1200" height="612" loading="lazy">

### APIトークンを発行する

CloudflareをTerraform管理、すなわちAPIで操作する場合、APIトークンの発行が必須です。

右上ユーザアイコンより「My Profile」を押下→左メニューからAPI Tokensを選び、「Create Token」を押下します。

<img src="/images/2024/20240327a/image_5.png" alt="Cretate Tokenをクリック" width="1200" height="615" loading="lazy">

Create Custom Tokenの「Get started」を押下します。

<img src="/images/2024/20240327a/image_6.png" alt="Get startedボタンをクリック" width="866" height="217" loading="lazy">

各種設定値を入力します。

- Token name: 任意の名前を入力
- Permissions: Terraform経由で操作するサービスを選び、それぞれEditの権限を指定する
  - どのサービスで何の権限が必要かは[ドキュメント](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)にまとまっているので参照のこと
- Account Resources: 自分が権限を持っているアカウント（メールアドレス）を選択可能。ここではAll accountsとしたが、複数のアカウントがある場合はここで絞っておくことが好ましい
- Zone Resources: アカウントの中のドメインを選択できる。ここではAll zonesとしたが、操作できるドメインを絞りたいときはここで指定する
- Client IP Address Filtering: 仮に操作されるIPアドレスが決まっている場合はここで指定する。何も入力しなければ、すべてのIPアドレスからアクセスを許容する
- すべて入力できたら「Continue to summary」を押下

<img src="/images/2024/20240327a/image_7.png" alt="" width="1200" height="764" loading="lazy">

<img src="/images/2024/20240327a/image_8.png" alt="" width="1136" height="784" loading="lazy">

設定内容が表示されるので、問題なければ「Create Token」を押下します。

<img src="/images/2024/20240327a/image_9.png" alt="Create Tokneをクリック" width="1155" height="561" loading="lazy">

APIトークンが表示されますが、このままではR2のAccess KeyおよびSecretが表示されないため、再度作り直します。このページでのコピーは不要です。

<img src="/images/2024/20240327a/image_10.png" alt="ima" width="1200" height="550" loading="lazy">

R2の管理ページを開き、右側メニューより「Manage R2 API Tokens」を選びます。

<img src="/images/2024/20240327a/image_11.png" alt="" width="1200" height="615" loading="lazy">

先ほど作成したトークンの「・・・」を押下し、「Roll」を選択。注意書きを読み、「Roll」を押下します。

<img src="/images/2024/20240327a/image_12.png" alt="" width="1200" height="404" loading="lazy">

<img src="/images/2024/20240327a/image_13.png" alt="" width="775" height="540" loading="lazy">

「API Token」「Access Key ID」「Secret Access Key」「R2のエンドポイント」が表示されるので、これらをすべてコピーしておきましょう。

<img src="/images/2024/20240327a/image_14.png" alt="" width="1200" height="680" loading="lazy">

### 環境変数の設定

ここからは操作するPCでの作業となります。まずはターミナルを開き、環境変数をセットします。

先ほどコピーしたAPIトークン等認証情報を、環境変数としてセットします。セットするキーと値は以下のとおりです。

| No. | 環境変数名 | 値 |
| --- | --- | --- |
| 1 | AWS_ACCOUNT_ID | CloudflareのアカウントID |
| 2 | AWS_ACCESS_KEY_ID | APIトークンで払い出したアクセスキーID |
| 3 | AWS_SECRET_ACCESS_KEY | APIトークンで払い出したシークレットアクセスキー |
| 4 | CLOUDFLARE_ACCOUNT_ID | CloudflareのアカウントID |
| 5 | CLOUDFLARE_API_TOKEN | アクセスキー、シークレットアクセスキーと共に払い出したトークン |

1、4については管理画面より確認できます。2、3、5については前項でコピーしたものをセットしましょう。

以下のようにシェルスクリプトにまとめて、 `source set-env.sh` のコマンドで設定できるようにすると楽です。

```bash set-env.sh
export AWS_ACCOUNT_ID=xxxxxxxxxxxxxxx
export AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx
export CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxx
export CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxx
```

## CloudflareをTerraform管理する

ここからが本題で、いよいよCloudflare上にあるリソースをTerraform管理にするため、インポート等の作業を実施していきます。

### ディレクトリ構成

任意の場所にCloudflareのTerraform管理用のディレクトリを作成します。これをgit管理とし、その配下のディレクトリ構造・ファイル構成は以下の形とします。

```
.
├── domains
│   └── 920oj-net
│       ├── local.tf
│       ├── record.tf
│       └── setup.tf
└── global
    └── pages
        └── 920oj-net
            ├── local.tf
            ├── pages_domain.tf
            ├── pages_project.tf
            └── setup.tf

5 directories, 7 files
```

ドメイン（ゾーン）管理は `domains/` 配下で実施し、利用するドメインごとにフォルダを切り、それぞれでtfstateを分ける形とします。

Cloudflare Pagesはアカウントでグローバルに管理するため、 `global/` 配下で管理し、 `pages` ディレクトリを切り、さらにプロジェクトごとにディレクトリを分ける形式とします。

### 各ディレクトリのセットアップ

Terraformのバージョン情報やプロパイダの設定、tfstateの配置場所等の初期設定に必要なファイルは、 `setup.tf` にまとめて、各ディレクトリに配置します。

`key` はディレクトリごとに分けておき、tfstateが分けられるようにします。自分は以下のようなルールで運用しています。

- ドメイン: `domains/ドメイン名.tfstate`
- Pages: `global/pages/プロジェクト名.tfstate`
- Workers: `global/workers/プロジェクト名.tfstate`

```tf setup.tf
terraform {
  # terraformのバージョン設定
  required_version = "~> 1.7.5"

  // cloudflareプロバイダを利用
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.26.0"
    }
  }

  # tfstateの保存先の設定。R2 Storageを使用する
  backend "s3" {
    endpoints = {
      s3 = "https://<アカウントID>.r2.cloudflarestorage.com"
    }
    bucket                      = "oj-cf-tfstate" # ここでバケット名を指定
    key                         = "domains/920oj-net.tfstate" # ディレクトリごとにキーを変更
    region                      = "us-east-1" # 任意の値でOK
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

provider "cloudflare" {}
```

backend の設定で、 `skip_credentials_validation` と `skip_requesting_account_id` 、 `skip_s3_checksum` の3つを `true` にする必要があります。

### ドメインのDNSレコードをimportする

Cloudflareのimportには、Terraform公式で用意されているimportコマンドを利用するほか、Cloudflareが独自に提供している [cf-terraforming](https://github.com/cloudflare/cf-terraforming) というツールを利用できます。

cf-terraformingについては、これまた伊藤さんが書かれている記事があるので、こちらも読んでみてください。

https://future-architect.github.io/articles/20230502a/

実際に現在の設定をimportしてみましょう。

#### generate

まずは現在の設定をTerraformの記述に落とし込んでくれる `generate` コマンドを試します。

```bash
cf-terraforming generate --resource-type "cloudflare_record" --zone "ゾーンID"
```

- `--resource-type` オプションで取得したいリソースを指定します。今回はDNS設定を取得してみるので、 `cloudflare_record` を指定します。
  - 取得できるリソース一覧はドキュメントに無かったので、[ソースコード](https://github.com/cloudflare/cf-terraforming/blob/master/internal/app/cf-terraforming/cmd/generate.go)を参照します。
- `--zone` オプションで取得したいzoneのIDを指定します。

実行してみたところ、以下のエラーが出ました。

```sh
FATA[0000] --account and --zone are mutually exclusive, support for both is deprecated
```

どうやら先程セットした環境変数 `CLOUDFLARE_ACCOUNT_ID` がセットされていると正常に動いてくれなさそうなので、一旦 `unset CLOUDFLARE_ACCOUNT_ID` コマンドで環境変数を外しておきます。

```sh
% cf-terraforming generate --resource-type "cloudflare_record" --zone "ゾーンID"
resource "cloudflare_record" "terraform_managed_resource_xxxxxxxxxxx" {
  name    = "920oj.net"
  proxied = true
  ttl     = 1
  type    = "CNAME"
  value   = "920oj-net.pages.dev"
  zone_id = "ゾーンID"
}

resource "cloudflare_record" "terraform_managed_resource_yyyyyyyyyyy" {
  name     = "920oj.net"
  priority = 10
  proxied  = false
  ttl      = 1
  type     = "MX"
  value    = "example.com"
  zone_id  = "ゾーンID"
}
```

問題なければ、先程のコマンドの末尾に `>> record.tf` をつけてファイルに書き出しましょう。

このままだとリソース名がランダムなものになっているので、わかりやすいように名前を変えると管理しやすいです。

- 例: ルートドメインのCNAMEレコード: `cname_root`
- 例: `hoge` という名前のAレコード: `a_hoge`

また、zone_idやルートドメイン名は何度か記述することになるので、local変数に定義しておくとミスが減ります。

```tf local.tf
locals {
  zone_id = "ゾーンID"
  root_domain = "920oj.net"
}
```

```tf record.tf
resource "cloudflare_record" "cname_root" {
  name    = local.root_domain
  proxied = true
  ttl     = 1
  type    = "CNAME"
  value   = "920oj-net.pages.dev"
  zone_id = local.zone_id
}

...以下略
```

#### import

このままでは新規追加した分がそのまま新規として認識されてしまうので、すでに作成されているリソースについてはimportしてtfstateへ反映させる必要があります。

importするためのコマンドはcf-terraformingを利用して出力できます。ただし今回はリソース名をわかりやすく変更したため、コマンドを修正します。

まずはcf-terraformingを利用してコマンドを出力してみましょう。

```sh
 % cf-terraforming import --resource-type "cloudflare_record" --zone "ゾーンID"
terraform import cloudflare_record.terraform_managed_resource_xxxxxxxxxx ゾーンID/xxxxxxxxxx
terraform import cloudflare_record.terraform_managed_resource_yyyyyyyyyy ゾーンID/yyyyyyyyyy
```

出力されたコマンドをもとに、リソース名を変更した上で、シェルスクリプトファイルとして保存します。

```sh import.sh
terraform import cloudflare_record.terraform_managed_resource_cname_root ゾーンID/xxxxxxxxxx
terraform import cloudflare_record.terraform_managed_resource_mx_root ゾーンID/yyyyyyyyyy
```

これを実行してみましょう。 Import successful! と表示されれば、インポート完了です。

```sh
 % ./import.sh
cloudflare_record.cname_root: Importing from ID "ゾーンID/xxxxxxxxxx"...
cloudflare_record.cname_root: Import prepared!
  Prepared cloudflare_record for import
cloudflare_record.cname_root: Refreshing state... [id=xxxxxxxxxxxxxxxxxxxxxx]

・・・中略・・・

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

ここで `terraform plan` を実行してみましょう。先ほどimportしたものが表示され、最後にNo chanegsと表示されれば、無事反映に成功しています。

```sh
 % terraform plan
cloudflare_record.cname_root: Refreshing state... [id=xxxxxxxxxxxxxxxxxxxxxx]
cloudflare_record.mx_root: Refreshing state... [id=xxxxxxxxxxxxxxxxxxxxxx]
・・・中略・・・

No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration and found no differences, so no changes are needed.
```

### Cloudflare Pagesのimport

続いてはCloudflare PagesをTerraform管理下となるよう設定します。

Pagesはドメイン（ゾーン）単位でなくアカウント単位での管理となるため、先ほどunsetした `CLOUDFLARE_ACCOUNT_ID` を再セットします。

また、Cloudflare Pagesはcf-terraformingが対応していないため、Terraform v1.5から追加されたImportブロックを利用してインポートします。

#### importブロックの作成

自分の場合、 `920oj.net` のドメインで、プロジェクト `920oj-net` を設定しています。これをインポートしてみましょう。

<img src="/images/2024/20240327a/image_15.png" alt="image.png" width="873" height="200" loading="lazy">

Cloudflare Pagesは、 `cloudflare_pages_domain` リソースと `cloudflarepages_project` リソースから構築されます。

まずは `import.tf` を作成し、importブロックを記載します。 `local.account_id` でアカウントIDが呼び出せるようにしています。

`cloudflare_pages_domain` のインポートでは、`to` にはimportする対象のリソース名を、 `id` には `<アカウントID>/<プロジェクト名>/<設定しているドメイン名>` を記載します。

`cloudflare_pages_project` のインポートでは、 `to` にはimportする対象のリソース名を、 `id` には `<アカウントID>/<プロジェクト名>` を記載します。

```tf import.tf
# cloudflare_pages_domain のインポート
import {
  to = cloudflare_pages_domain.domain-920oj-net  # 対象のリソース名
  id = "${local.account_id}/920oj-net/920oj.net" # ドメイン名
}

# cloudflare_pages_project のインポート
import {
  to = cloudflare_pages_project.project-920oj-net # 対象のリソース名
  id = "${local.account_id}/920oj-net"            # プロジェクト名
}
```

#### HCLコードの自動生成

この状態で `terraform plan -generate-config-out=generate.tf` コマンドを実行します。

```sh
% terraform plan -generate-config-out=generate.tf
cloudflare_pages_domain.domain-920oj-net: Preparing import... [id=xxxxxxxxxxxxxxx/920oj-net/920oj.net]
cloudflare_pages_project.project-920oj-net: Preparing import... [id=xxxxxxxxxxxxxxx/920oj-net]
cloudflare_pages_domain.domain-920oj-net: Refreshing state... [id=xxxxxxxxxxxxxxxxxxxxx]
cloudflare_pages_project.project-920oj-net: Refreshing state... [id=920oj-net]

Terraform will perform the following actions:

  # cloudflare_pages_domain.domain-920oj-net will be imported
    resource "cloudflare_pages_domain" "domain-920oj-net" {
        account_id   = "xxxxxxxxxxxxxxxxxxxxxxx"
        domain       = "920oj.net"
        id           = "xxxxxxxxxxxxxxxxxxxxxxx"
        project_name = "920oj-net"
        status       = "active"
    }

  # cloudflare_pages_project.project-920oj-net will be imported
  # (config will be generated)
    resource "cloudflare_pages_project" "project-920oj-net" {
        account_id        = "xxxxxxxxxxxxxxxxxxxxxxx"
        created_on        = "2023-03-18T15:44:28Z"
        domains           = [
            "920oj-net.pages.dev",
            "920oj.net",
        ]
        id                = "920oj-net"
        name              = "920oj-net"
        production_branch = "main"
        subdomain         = "920oj-net.pages.dev"

        build_config {
            build_caching   = false
            build_command   = "npm run build"
            destination_dir = "build"
        }

・・・中略

Plan: 2 to import, 0 to add, 0 to change, 0 to destroy.
```

設定値が読み取られ、出力されています。また、指定したファイル `generate.tf` に同様の設定値が記載されています！

内容が正しいか確認するのと、コメントを消したり、local変数に置き換えたりして体裁を整えましょう。また、ファイルもリソースごとに分けておきましょう。

```tf pages_domain.tf
resource "cloudflare_pages_domain" "domain-920oj-net" {
  account_id   = local.account_id
  domain       = "920oj.net"
  project_name = "920oj-net"
}
```

```tf generate.tf
resource "cloudflare_pages_project" "project-920oj-net" {
  account_id        = local.account_id
  name              = local.project_name
  production_branch = "main"
  build_config {
    build_caching       = false
    build_command       = "npm run build"
    destination_dir     = "build"
    root_dir            = null
    web_analytics_tag   = null
    web_analytics_token = null
  }
  deployment_configs {
    preview {
      always_use_latest_compatibility_date = false
      compatibility_date                   = "2023-03-18"
      compatibility_flags                  = []
      d1_databases                         = {}
      durable_object_namespaces            = {}
      environment_variables = {
        GTAG_ID      = "XXXXXXX"
        NODE_VERSION = "XXXXXXX"
      }
      fail_open     = true
      kv_namespaces = {}
      r2_buckets    = {}
      secrets       = null # sensitive
      usage_model   = "standard"
    }
    production {
      always_use_latest_compatibility_date = false
      compatibility_date                   = "2023-03-18"
      compatibility_flags                  = []
      d1_databases                         = {}
      durable_object_namespaces            = {}
      environment_variables = {
        GTAG_ID      = "XXXXXXXXXX"
        NODE_VERSION = "XXXXXXXXXX"
      }
      fail_open     = true
      kv_namespaces = {}
      r2_buckets    = {}
      secrets       = null # sensitive
      usage_model   = "standard"
    }
  }
  source {
    type = "github"
    config {
      deployments_enabled           = true
      owner                         = "920oj"
      pr_comments_enabled           = true
      preview_branch_excludes       = []
      preview_branch_includes       = ["*"]
      preview_deployment_setting    = "all"
      production_branch             = "main"
      production_deployment_enabled = true
      repo_name                     = "920oj-net"
    }
  }
}
```

#### importの実行

コードの記載は済んだので、tfstateへ取り込みましょう。

先ほどのimportブロックは残したままで、 `terraform plan` を実行します。 `Plan: 2 to import, 0 to add, 0 to change, 0 to destroy.` が出ていれば、インポートの準備ができていることがわかります。

次に、 `terraform apply` を実行します。差分がないことを確認して、yesとタイプしましょう。

```sh
Plan: 2 to import, 0 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

`Apply complete! Resources: 2 imported, 0 added, 0 changed, 0 destroyed.` が出たらOKです。

このあと `terraform plan` を実行してみて、差分が出ていなければ問題なしです。

先ほどインポートに利用したimport.tfは削除しても構いません。

```sh
 % terraform plan
cloudflare_pages_domain.domain-920oj-net: Refreshing state... [id=xxxxxxxxxx]
cloudflare_pages_project.project-920oj-net: Refreshing state... [id=xxxxxxxxxx]

No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration and found no differences, so no changes are needed.
```

これにて、Cloudflareで管理しているドメインのDNSレコードとCloudflare Pagesのリソースを、Terraformにて管理できるようになりました！

## おわりに

これでCloudflareを操作する際の不安が軽減できるようになり、自分の個人開発モチベも（わずかながら）高まった気がします。また、Terraformのエコシステムや本体の機能の充実さも改めて実感しました。

ぜひ皆さんもCloudflareをTerraform管理してみましょう！
