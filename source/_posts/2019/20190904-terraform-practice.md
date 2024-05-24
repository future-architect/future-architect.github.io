---
title: "Terraformのベストなプラクティスってなんだろうか"
date: 2019/09/03 15:20:52
postid: ""
tag:
  - Terraform
category:
  - Infrastructure
author: 木村拓海
lede: "入社以降ずっと触ってきたTerraformについての様々な流派を紹介し、各流派がどのようなパターンに向いているのか(はたまた不向きなのか)の個人的見解をまとめてみました。"
---
# はじめに

こんにちは、TIG DXユニット [^1]の木村です。

 [^1]: TIGとはTechnology Innovation Groupの略で、フューチャーの中でも特にIT技術に特化した部隊です。その中でもDXチームは特にデジタルトランスフォーメーションに関わる仕事を推進していくチームです。


入社以降ずっと触ってきたTerraformですが、巷ではWorkspace派だったり、module派だったり、ディレクトリ完全分離派だったり、様々な流派(プラクティス)が乱立しているのを目にします。私自身ベストな構成を模索していく中で辿り着いた結論は、ケースバイケースで全てのデザインパターンに対応できる万能なものは存在しないのかな (当たり障りないですね..)ということです。

そんなわけで、様々なTerraformの流派を紹介し、各流派がどのようなパターンに向いているのか(はたまた不向きなのか)の個人的見解をまとめてみました。

※本記事中のサンプルコードはすべて Terraform `0.12`、 provider `google cloud` で解説してます

# Terraformとは？

当社過去記事に解説があります。Terraformの概要や、0.12におけるシンタックス変更点や便利機能が詳細に記載されていますので、ぜひ併せてご覧ください。

* [はじめてのTerraform 0.12 ～環境構築～](/articles/20190816/)
* [はじめてのTerraform 0.12 ～実践編～](/articles/20190819/)


# 環境をどのように分けるか
開発環境、検証環境、本番環境といった環境間の構成やパラメータ差異をどのように扱うのがベストなのでしょうか。

以下の順番で各流派について説明していきます。

1. Workspace
2. Module
3. ディレクトリ分離


## 1. Workspace派
Terraform ver 0.10 から導入された機能で、同一Terraformソースに対して、Workspaceを切り替えることで環境が切替可能となります。

```bash
$ terraform workspace select {workspace名}
```

### メリット
* workspace名を変数のkey名に設定することで、環境依存の変数のみ切り出せるので可読性が高くなります。
* また、環境間でソースを共用するという性質上、特定環境のみへの設定抜け・漏れが発生しにくいです。

```bash
## 変数定義側
locals {
  instance_web = {
    production = {
      machine_type   = "n1-standard-4"
      bootdisk_size  = 500
    }
    staging = {
      machine_type   = "n1-standard-2"
      bootdisk_size  = 100
    }
  }
}

## 変数呼び出し側
resource "google_compute_instance" "web" {
  name         = "web-server"
  machine_type = local.instance_web[terraform.workspace][machine_type]
  boot_disk {
    source     = google_compute_disk.web.self_link
  }
  ...
}

resource "google_compute_disk" "web" {
  name  = "web-server"
  size  = local.instance_web[terraform.workspace][bootdisk_size]
  ...
}
```

### デメリット
* 環境間で構成差異が大きい場合は、差分を吸収するためのロジックを組み込む必要があり、かえって可読性が悪くなりメンテが大変になることがあります

以下の例は、本番環境のみに存在するリソースと検証環境のみに存在するリソースをcountを使って制御しています。見通しが悪いですね。

```bash 環境間で構成の差異が大きい場合の例
locals {
  instance_web = {
    production = {
      ...
    }
    staging = {
      ...
    }
  }
  instance_ap = {
    production = {
      count          = 1
      ...
    }
    staging = {
      count          = 0
      ...
    }
  }
  instance_proxy = {
    production = {
      count          = 0
      ...
    }
    staging = {
      count          = 1
      ...
    }
  }
}

resource "google_compute_instance" "web" {
  name         = "web-server"
  ...
}

resource "google_compute_instance" "ap" {
  count        = local.instance_ap[terraform.workspace][count]
//count        = "${terraform.workspace == "production" ? 1 : 0}" # こういう書き方もあるけどいずれにしろ可読性悪い
  name         = "ap-server"
  ...
}

resource "google_compute_instance" "proxy" {
  count        = local.instance_proxy[terraform.workspace][count]
  name         = "proxy-server"
  ...
}
```

### こんなケースにおすすめ
* 環境間で構成差異が少ない場合は、Workspaceの利用がおすすめです。
* また、リリースフローとして 本番と同等の環境での事前検証-> リリース判定 -> 本番環境構築 といった流れが義務付けられている場合は、 Workspaceを切り替えるだけなので、本番環境適用時のデグレ発生のリスクは減らせそうで精神衛生上良さそうです。


## 2. Module派
module自体は、複数リソースから構成されるサービス(たとえばLB)や特定リソースをテンプレ化する機能です。 `module`ディレクトリ内でテンプレ化するリソースを定義し、Moduleを呼び出す側( `production`, `staging` 等)で環境差異を制御できます。

```hcl モジュール利用時のディレクトリ構成例
├── module
│   ├── gce
│   │   ├── main.tf
│   │   ├── output.tf
│   │   └── variables.tf
│   └── iam
│   └── ...
├── production
│   ├── main.tf
│   └── variable.tf
└── staging
    ├── main.tf
    └── variable.tf
```

### メリット
* 複数resourceから構成されるサービス(LB等)をテンプレ化することでmodule利用側のソースは簡潔になります

以下の例はGCEをmodule化した例です。instance、internal ip、diskといった個別リソースをひとつのmoduleとして定義することで、モジュール呼び出し側は、リソース間の依存関係やパラメータ以外の固定値を意識しなくてよいのは嬉しいですね。

```bash module/gce/main.tf(モジュール定義側)
resource "google_compute_address" "template" {
  name = "${var.name}-internal"

  address_type = "INTERNAL"
  address      = "var.internal_ip"
  ...
}

resource "google_compute_instance" "template" {
  name         = "${var.name}"
  machine_type = var.machine_type

  boot_disk {
    source     = google_compute_disk.template.self_link
  }

  network_interface {
    network_ip    = google_compute_address.template.address
    access_config = {}
  }
  ...
}

resource "google_compute_disk" "template" {
  name  = "${var.name}"

  type  = "pd-ssd"
  size  = var.bootdisk_size
  image = centos-cloud/centos-7"
  ...
}
```

```bash production/main.tf(モジュール呼び出し側)
module "gce_web" {
  source = "../module/gce"

  name         = "web"
  internal_ip  = "10.xx.xx.xx"
  machine_type = "n1-standard-4"
  boot_disk    = "500"
}
```

また、 [Terraform Module Registry](https://registry.terraform.io/)でHashiCorp社公認のmoduleが公開されており、これらを使うことができます。


### デメリット

* moduleを定義する際に、どこまでmoduleを汎化(変数化)させるかを決めるのが難しいです。moduleへの変更は、 そのmoduleを利用するすべての呼び出し元へ影響を与えます。安易にmoudle内に固定値を設定しておくと、後ほどその値がパラメータ(変数)となった際の手当てが大変です。とはいえ、何でもかんでも汎化すると、moduleを利用する旨味がなくなってしまいます。
* 設定方法が複雑で、Terraform初心者には運用が難しいです。初心者含む不特定多数のメンバーがterraformを触る機会がある場合や、運用担当者のスキルレベルを考慮した際に導入が難しい場合があるかもしれません。

### こんなケースにおすすめ
* moduleは、Terraformにある程度精通したメンバーが運用する前提で利用されることになるかと思います。
* また、リソースの利用にあたり、共通化された規約や思想が前提としてある場合は、moduleを利用することで、固定化された部分を運用側に意識させず、ガバナンスを効かせることができます。



## 3. 環境毎にディレクトリで分離派
環境毎に完全にディレクトリを分離し、個別にTerraformソースを用意する(Workspaceもmoduleも一切利用しない)流派です。

```hcl 完全分離派のディレクトリ構成例
├── production
│   ├── backend.tf
│   ├── compute_address.tf
│   ├── compute_firewall.tf
│   ├── compute_instance.tf
│   ├── project.tf
│   ├── variable.tf
│   └── ...
└── staging
    ├── backend.tf
    ├── compute_address.tf
    ├── compute_firewall.tf
    ├── compute_instance.tf
    ├── project.tf
    ├── variable.tf
    └── ...
```

### メリット

* 各環境の構成が各ディレクトリ内で完結しているため、最も直感的で理解しやすくTerraformに精通していないメンバーに易しい構成です。
* Terraformソースが環境毎に独立しているため(Workspace派のデメリットで紹介したような)環境間の差異を意識する必要がありません。

### デメリット

* 全ての環境へ同じ変更を加えたい場合、各ディレクトリ配下のtfソースに変更を加える必要があり、2度手間3度手間になるうえに、特定環境への変更に抜け漏れが生じる可能性があります。
* 環境間の差異を把握するのが難しく見通しが悪いです。

### こんなケースにおすすめ

* 環境間で構成の差異が大きいケースは、環境間の差異を吸収するロジックを組み込む必要がない本構成が使えます。
* デメリットで上げたような特定環境への変更漏れ等のリスクはありますが、Terraform初心者や運用担当者のスキルレベルによっては最もシンプルな本構成が、運用負荷が低く、運用しやすいかもしれません。


# おわりに
今回は、各機能を独立して利用した場合のシンプルでベーシックな流派を紹介しましたが、moduleとWorkspaceを組み合わせる(環境依存の変数をWorkspaceで切り替える)流派なども存在します。最後のディレクトリ完全分離パターンは、個人的には利用したくないパターンですが、Terraform初心者でも運用可能な点でいうと、一概に否定はできないのかなと思っています。

本記事が、Terraformを利用する上での参考になれば幸いです。

