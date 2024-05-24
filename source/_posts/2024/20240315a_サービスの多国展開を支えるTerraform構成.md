---
title: "サービスの多国展開を支えるTerraform構成"
date: 2024/03/15 00:00:00
postid: a
tag:
  - Terraform
  - マルチリージョン
  - 海外展開
category:
  - Infrastructure
thumbnail: /images/20240315a/thumbnail.png
author: 岸下優介
lede: "IaCを利用してインフラを構成することで、構築忘れや設定ミスといったイージーなミスが減らせるようになりました。とはいえ、展開していく範囲が増えれば増えるほどコードの量も増えていくので、このリソースはどこで作ったっけ…みたいなことが起きてしまいます。"
---
<img src="/images/20240315a/image.png" alt="" width="1088" height="542" loading="lazy">

[Terraform連載2024](/articles/20240311a/)の5日目です。

## はじめに

IaCを利用してインフラを構成することで、構築忘れや設定ミスといったイージーなミスが減らせるようになりました。とはいえ、展開していく範囲が増えれば増えるほどコードの量も増えていくので、このリソースはどこで作ったっけ…みたいなことが起きてしまいます。

現在の業務ではサービスの海外展開に携わっており、まさに多国展開絶賛実施中という状態です。その際、スペックは同じでもリージョンのみが異なるリソースを作成することが多々あり、環境の管理方法って大切だなーと実感しております。

そこで本記事では、Terraformを利用してシステムを他リージョンへロールアウトする場合のリソース管理・展開方法を3つ挙げてみました。もちろん、他にもたくさんあると思いますので、本記事が参考になると幸いです。

また、本連載の1日目でも伊藤さんがマルチリージョンによるDR（Disaster Recovery）戦略についての記事を書かれているので、こちらも参考にしてください。

参考：[TerraformにおけるDR戦略を考える](/articles/20240311a/)

## 仮定

以下のような前提で考えてみます。

- Google Cloudを利用
    - 他クラウドベンダーでも応用可能だと思います
- 各環境（Development/Staging/Production）毎でプロジェクトは同じになる
    - dev-app/stg-app/prd-appの様に3つのプロジェクトが存在します
- ほぼ同じシステムを他リージョンへロールアウトしていく
    - インスタンスのマシンスペックなど、リソース周りはカスタム可能にしたいと思います
- Terraformを実行するためのBastionサーバーが存在する
    - 各環境のBastionサーバーからTerraformをApplyすることになります
    - 各BastionサーバーでBackendバケットへのアクセスは既に認証済みとなっています

## 構成案①：ディレクトリ分けのみで管理する

以下のように環境、リージョン[^1]をそれぞれディレクトリ分けして管理します。

```
envs
├── modules
│   └── ...
├── development
│   ├── common
│   │   ├── backend.tf
│   │   ├── compute_network.tf
│   │   ├── project.tf
│   │   ├── variable.tf
│   │   └── versions.tf
│   ├── sydney
│   │   ├── backend.tf
│   │   ├── compute_subnetwork.tf
│   │   ├── data.tf
│   │   ├── compute_instance.tf
│   │   └── versions.tf
│   └── tokyo
├── production
│   ├── common
│   ├── ...
└── staging
    ├── common
    ├── ...
```

各環境の中にcommonとリージョン毎のディレクトリを持ちます。commonにはVPCやプロジェクトといった共通となるリソースを置き、リージョン毎に必要なリソースはリージョンディレクトリに配置します。
また、各ディレクトリでbackendを持ち、tfstateの管理を行う形となるため`terraform`コマンドは各ディレクトリに対して行う必要があります。

単純にディレクトリをコピペして展開していけるので、リージョンの追加があった場合でも共通リソースの展開であれば容易に実行できます。視覚的にもしっかり分かれているので、新規参画者などにも認知負荷が高くないです。

ただ、共通リソースを参照する場合は`data`として用意する必要があり、冗長な感じは否めません。

```sh terraform data.tf
data "google_project" "my_project" {
  project_id = "ksst-bastion"
}
```

## 構成案②：ディレクトリ分けとworkspaceを使って管理する

以下のように環境をそれぞれディレクトリ分けして管理します。

```
envs
├── modules
│   └── ...
├── development
│   ├── configs
│   │   ├── sydney.tfvars
│   │   └── tokyo.tfvars
│   ├── backend.tf
│   ├── compute_instance.tf
│   ├── compute_network.tf
│   ├── compute_subnetwork.tf
│   ├── storage_bucket.tf
│   ├── project.tf
│   ├── variables.tf
│   └── versions.tf
├── production
│   ├── configs
│   │   ├── ...
│   ├── backend.tf
│   ...
└── staging
    ├── configs
    │   ├── ...
    ├── backend.tf
    ...
```

先ほどとは異なり、各環境でbackendを1つとしてWorkspaceによってリージョンを区別していきます。

```sh
$ terraform workspace list
  default
* sydney
  tokyo
```

また、plan/apply時にtfvarsを利用することによって各環境ワンリソースで管理することが可能となります。

```sh
$ terraform plan -var-file config/sydney.tfvars
$ terraform plan -var-file config/sydney.tfvars
```

```sh terraform storage_bucket.tf
resource "google_storage_bucket" "bucket" {
  project       = google_project.my_project.project_id
  name          = "${var.region_short}-bucket-test"
  location      = var.region
  force_destroy = true
}
```

Terraform Workspaceは機能として存在するものの、開発環境を区別するのには非推奨[^2]など、中々使いどころの難しい存在でしたがリージョンを区別するのには使えそうです。この構成であれば、他リージョン展開時に新しい`tfvars`ファイルを作成するだけでよいので、ロールアウト時の作業が激減します。

ただ、新しいリソース・変数を定義する場合には全`tfvars`ファイルに値の追加が必要なので注意が必要です。

ちょっとした亜種ですが、Workspace名をそのまま変数として持ってきてリソースに適用することも可能です。
**※この場合は、Workspace名に`asia-northeast1`や`australia-southeast1`を使う必要があります。**

```sh storage_bucket.tf
resource "google_storage_bucket" "bucket" {
...
  location      = terraform.workspace
}
```

## 構成案③：ワンリソースにしてtfvarsで管理する

以下のようなディレクトリ構成で管理します。

```
envs
├── modules
│   └── ...
├── configs
│   ├── development
│   │   ├── sydney.tfvars
│   │   └── tokyo.tfvars
│   ├── production
│   │   ├── sydney.tfvars
│   │   └── tokyo.tfvars
│   └── staging
│       ├── sydney.tfvars
│       └── tokyo.tfvars
├── backend.tf
├── compute_instance.tf
├── compute_network.tf
├── compute_subnetwork.tf
├── data.tf
├── project.tf
├── storage_bucket.tf
├── variable.tf
├── versions.tf
└── terraform_init.sh
```

各種リソースはワンリソースとして、Plan/Apply時に各`tfvars`ファイルで変数を渡す形となります。
環境やリージョンを変更する場合のbackendの変更はどうするのか？という部分ですが、`terraform_init.sh`というbashスクリプトを介して、各環境ごとでbackendを構成し直します。

```sh terraform_init.sh
#!/bin/bash
usage () {
  echo "Usage: $0 [option ...] [arg ...]"
  cat <<"EOM"
Options:
  -h: Show this help
  -c: city: Specify region's city name 
  -e: environment: Specify enviroment
EOM
  exit 1
}

while getopts c:e:o:a option ; do
  case $option in
    c)
      city=$OPTARG
      echo "City of region: $city"
      ;;
    e)
      env=$OPTARG
      echo "Environment: $env"
      ;;
    h | \?)
      echo "-h or invalid option is used (OPTIND: $OPTIND)"
      usage
      ;;
  esac
done

# Create backend.tf
cat <<EOF > backend.tf
terraform {
  backend "gcs" {
    bucket = "${env}-multi-region-rollout-tfstate"
    prefix = "${city}/state"
  }
}
EOF

# Initialize terraform's backend
terraform init -reconfigure
```

そのため、リージョン毎のbackend変更に関しては都度スクリプトを実行する運用でカバーしていく形となります。

以下の記事で紹介されているようにplan/applyなどTerraformのコマンドもラッピングすることで、Terraformの操作を全てシェルスクリプト経由にしてしまったほうが誤ったbackendでのplan/applyが起きないかもしれません。
参考：[Terraformでmoduleを使わずに複数環境を構築する](https://zenn.dev/smartround_dev/articles/5e20fa7223f0fd)

## まとめ

上記3つの方法をまとめると以下のようになります。

| 案 | リージョン展開方法 |リージョン毎の運用 | 新しいリソースの追加方法 | 認知負荷 |
| ---- | ---- | ---- | ---- | ---- |
| ①ディレクトリ分けのみ | ディレクトリを追加 | ディレクトリ毎でApply | 各環境・リージョンでファイル追加 | 低 |
| ②ディレクトリ分けとworkspace | 各環境でtfvarsとWorkspaceを追加 | Workspace毎でApply | 各環境でファイル追加 | 中 |
| ③ワンリソースにしてtfvars | 各環境でtfvarsを追加 | シェルスクリプトを実行してからApply | 1ファイル追加 | 高 |

展開するリージョンの数が少なければ①が楽そうですが、どんどん増えていくのであれば②と③のどちらかな気がします。

実務上では参画当初から③の方法で運用を回しており、CIでデプロイの自動化をしている部分もあるのでシェルスクリプトの実行に関してはそこまで負担に感じておりません。ただ、個人的には②のやり方がよりシンプルになるので好みです。

本記事ではインフラの多国展開時におけるTerraformの管理方法を紹介してみました。これらが正解というわけではなく、運用を回していく中で強み・弱みが見えてくると思いますので、せひチームに適した形を探してみてください。

アイキャッチ画像のアイコンは以下から引用させて頂いております。
[HashiCorp Brand](https://www.hashicorp.com/brand)
[Google Cloud - アーキテクチャ図用のプロダクト アイコン](https://cloud.google.com/icons?hl=ja)

[^1]: リージョン名を都市・州名で表していますが、正式名称のasia-northeast1とかでも良いです。
[^2]: https://developer.hashicorp.com/terraform/cli/workspaces#when-not-to-use-multiple-workspaces
