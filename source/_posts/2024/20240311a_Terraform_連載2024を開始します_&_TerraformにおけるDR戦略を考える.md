---
title: "Terraform連載2024を開始します & TerraformにおけるDR戦略を考える"
date: 2024/03/11 00:00:00
postid: a
tag:
  - Terraform
  - インデックス
  - DR
  - マルチリージョン
category:
  - DevOps
thumbnail: /images/2024/20240311a/thumbnail.png
author: 伊藤太斉
lede: "Terraform連載を開始します。"
---
<img src="/images/2024/20240311a/terraform.png" alt="" width="800" height="418" loading="lazy">

こんにちは。技術ブログ運営の伊藤です。
本日、3/11よりTerraform連載を開始します。

## 昨年の連載振り返りと今年の連載について

昨年はTerraform v1.4がリリースされたことをトリガーとして技術ブログでは初となるTerraform連載2023を開催しました。その時の募集形態は以下です。

> - v1.4のリリース内容
> - これまでTerraformを触ってきたノウハウ、Tips
> - エコシステムについての調査、学習

今年の連載については上記の中から1点目を除き、社内に募集をかけました。すると、募集開始後数日であっという間に10人強集まり、社内でも利用者が増えていること、ナレッジが蓄積されてきていることを感じています。

さて、目を世の中に向けてみて、どれくらいTerraformに対しての興味関心があるのかと思い、Google Trendsで調べたところ、以下のグラフとなりました。

<img src="/images/2024/20240311a/スクリーンショット_2024-03-11_0.02.27.png" alt="" width="1000" height="244" loading="lazy">
注) 青: Terraform, 赤: CloudFormation

Terraformとパブリッククラウドの中では利用比率が最も高い、AWSのCloudFormationとの比較ですが、大きく差が開いており、その興味関心度を伺うことができます。ちなみに、v1.0のリリースが2021年の夏頃でしたが、その半年後の2022年に入って以降が伸びているようです。

## 連載スケジュール

今回の連載は10人を超すメンバーでお送りします。まだテーマ未定のところもありますが、公開時までのお楽しみということでしばらくお待ちください。

また、テーマが決まっているものも変更になったり順番が前後する可能性もありますが、ご了承ください。

| 日付 | 投稿者 | テーマ |
| ---- | ---- | ------ |
| 3/11(月) | 伊藤太斉 | 本インデックス記事 & <br> TerraformにおけるDR戦略を考える |
| 3/12(火) | 真野隼記 | [hclwriteを用いたtfコード生成入門](/articles/20240312a/) |
| 3/13(水) | 森大作 | [Terraformにおける変数の制御について](/articles/20240313a/)|
| 3/14(木) | 原田達也 | [Stateを統合してみる](/articles/20240314a/)] |
| 3/15(金) | 岸下優介 | [サービスの多国展開を支えるTerraform構成](/articles/20240315a/) |
| 3/18(月) | 原木翔 | [cfn-guardを使ってTerraformをポリシーチェックしようとした話](/articles/20240318a/) |
| 3/21(木) | 前原応光 | [Terraform連載2024 テストとモックを使ってみる](/articles/20240321a/) |
| 3/25(月) | 真鍋優 | [Azure環境Terraform実行におけるリソースプロバイダーについて](/articles/20240325a/) |
| 3/26(火) | 棚井龍之介 | [Terraformの実装コードを、動かしながら読む](/articles/20240326a/) |
| 3/27(水) | 大岩潤矢 | [手動運用しているCloudflareをTerraformでInfrastructure as Codeする](/articles/20240327a/) |
| 3/28(木) | 小林弘樹 | [Terraformでのループ処理と条件分岐](/articles/20240328b/) |

-----

## Terraformで考えるマルチリージョン構成

Terraform、もといIaCのメリット、思想として謳われるものの中には可搬性、再利用性があります。再利用性を上げておくことで、同じ構成のインフラ、サービス群を一括して作成でき、手作業と比べた時の再現性、信頼度が大きくなることはいうまでもありません。

具体、業務を前提としたITインフラ環境を考えたときに、社会インフラとして稼働しているサービスや、どんな状況であろうとも24時間365日稼働していないといけないサービス、企業があります。このような企業では災害対策環境として、地理的に大きく離れたエリアにDCを構えることで、ある1点で甚大な災害が発生してサービス断になったとしても、別のDCで継続することが可能になります(もちろん一定時間のサービス断は発生しますが、数日、数ヶ月単位になることはほぼないでしょう）。

この災害対策環境（この後はDR環境と記載します）については...

1. 本環境と100％同じ環境で常時稼働
2. 本環境→DR環境へ切り替え時に100％にする（一部はDRで常時稼働）
3. DRを一括して稼働（直前までDRでの稼働はなし）

...のいくつかのパターンが考えられます。昨今のクラウドインフラを鑑みると、コストメリット、移行の容易性を考えると2が妥当と考えられるケースが多いかと思います。事前にDR環境へ作成するリソースについても本環境と同等、同様のものを作ることは少なく、このハンドリングについてはTerraformの記載に依存するものがあります。本記事ではいくつかのパターンに分けつつ、今私自身が実践している方法について説明します。

## 前提

今回のTerraformの構成はモジュールを利用して説明します。採用理由はモジュールという形でパッキングしておくことで、特定の単位のリソースを一括して起動できることにあります。本環境とDR環境では基本的には同一のインフラができることが望ましいので、モジュールであれば任意の単位で横展開できることを考えています。

また、本環境のリージョンを東京（ap-northeast-1）、DR環境を大阪リージョン（ap-northeast-3)で構成することを前提とします。

### どの単位で分割するか

いくつか、分割する単位にも考える余地があるかと思います。これは、私自身が構築した所感ですが、1つのモジュールでDR環境まで表現することはせず、**本環境向けで構築をした上で、DRにも展開できる様に手を入れる**のが良いのではないかと考えています。これには

- Terraformの機能としてリソースの作成可否をハンドリングできること
- 1つのモジュールでDR環境まで表現するとモジュールが肥大化する

があげられます。前者についてはさらに3点に場合分けして説明しますが、後者については肥大化することで可読性や重複した表現でリソースの適用漏れなどヒューマンエラーの元になります。また、肥大化したとしても本環境、DR環境にフォーカスするのであればあまり大きな問題にはなりません。ただ、実際にはDR環境まで作らない環境（開発環境など）にも同じモジュールを適用する場合、DR向けとして定義したリソースのハンドリングが煩雑になることが容易に想像されます。いきなりDR環境も同じモジュールで構築する、というのは難しいですが、本環境向けのみに作成の上、少々のテコ入れをすることが望ましいです。

前者について、さらに場合分けすると...

- 本環境、DR環境に同等のリソースを作成する場合
- 本環境のパラメータ（リソース）を引用する形で作成する場合
- 本番のみに作成する場合
  - DRは有事の際に作成する前提

...の3つが挙げられます。これらについてさらに説明します。

### 本環境にもDR環境にも同等のリソースを作成する場合(純粋な複製)

まずは純粋な複製で済む場合です、ちょっと極端ですが、VPCのみをラップしているモジュールがあると仮定します。

```sh vpc.tf
# vpc.tf
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr_block
}

variable "vpc_cidr_block" {
  type = string
}
```

```sh main.tf
provider "aws" {
  region = "ap-northeast-1"
}

provider "aws" {
  region = "ap-northeast-3"
  alias  = "ap3"
}

module "vpc" {
  source = "任意のディレクトリ"

  vpc_cidr_block = "10.10.100.0/24"
}

module "vpc_dr" {
  source = "任意のディレクトリ"

  providers = {
    aws = aws.ap3
  }

  vpc_cidr_block = "10.10.101.0/24"
}
```

モジュールに、作成するリソースごと重複を許容できない場合には変数を切り出し、モジュールの呼び出し側で適切なパラメータを渡してあげるイメージになります。また、Providerがクラウドのエンドポイントをさし示しているので、モジュールごとエンドポイントの向く先も変わるでしょう。

### 本環境のパラメータ（リソース）を引用する形で作成する場合

これは本環境、DR環境両方で常時稼働させるパターンのもの、かつ、本環境のリソースを引用、および継承してDRを作る場合がここに当てはまります。そもそもDR環境で稼働させるものは何かと考えたとき、迅速な回復、喪失を避けて通りたいのはDBやバケットなどのストレージ系が当てはまるかと思います。その中でRDSを例とします。

```sh db_instance.tf
resource "aws_db_instance" "postgres" {
  ...
  db_name                  = var.db_primary_arn == null ? "default" : null
  engine                   = "postgres"
  username                 = var.db_primary_arn == null ? "admin" : null
  password                 = var.db_primary_arn == null ? "admin" : null
  publicly_accessible      = false
  backup_retention_period  = 7
  backup_window            = "20:00-20:30"
  maintenance_window       = "mon:06:00-mon:06:30"
  port                     = 5432
  replicate_source_db      = var.db_primary_arn
  ...

  tags = {
    Name  = "prod-db"
  }
}

variable "db_primary_arn" {
  type    = string
  default = null
}

output "db_arn" {
  value = aws_db_instance.postgres.arn
}
```

```sh main.tf
provider "aws" {
  region = "ap-northeast-1"
}

provider "aws" {
  region = "ap-northeast-3"
  alias  = "ap3"
}

module "db" {
  source = "任意のディレクトリ"
}

module "db_dr" {
  source = "任意のディレクトリ"

  providers = {
    aws = aws.ap3
  }

  db_primary_arn = module.db.db_arn
}
```

ポイントだと考えているのは...

- プライマリ（本環境）のインスタンスについては通常のパラメータを入れること
- 環境ごと入れるパラメータ、nullにするパラメータをハンドリングすること

...だと考えています。変数として`db_primary_arn`を書き出し、この変数に値が入っているかどうかを判定することで、プライマリのインスタンスになるか、DR向けのレプリカインスタンスかを判定して作成することが可能になります。

三項演算子を多く使っていることはもう少し改善ポイントですが、少ない変数でリソースのハンドリングができることで、使いやすさを意識しています。そして、`default = null`にしておくことで、不要な変数を定義を回避しています。

### DR環境では構築しないリソース

コストの観点から、DRでは構築せず、有事の際に作成するリソースもあり得るでしょう。その際にはcountやfor_eachといったTerraformにおけるループ構文を用いてハンドリングしています。例ではEC2インスタンスを記載しています。

```sh instance.tf
resource "aws_instance" "instance" {
  count = length(var.instance_ip_address)
  ...
  vpc_security_group_ids  = [....]
  private_ip              = var.instance_ip_address[count.index]
  ...
}

variable "instance_ip_address" {
  type    = list(string)
  default = []
}
```

```sh main.tf
provider "aws" {
  region = "ap-northeast-1"
}

provider "aws" {
  region = "ap-northeast-3"
  alias  = "ap3"
}

module "instance" {
  source = "任意のディレクトリ"

  instance_ip_address = ["xx.xx.xx.xx", "yy.yy.yy.yy"]
}

module "instance_dr" {
  source = "任意のディレクトリ"

  providers = {
    aws = aws.ap3
  }
}
```

`instance_ip_address`の配列に対して、IPがあればその分だけリソースを作成し、空の配列（デフォルト値）が入ったときは`count = 0`になるので作成されないことになります。

## まとめ

Terraformを使ったマルチリージョン構築は、IaC自体のメリットを最大限かせるものだと考えています。その中で再利用性、可搬性を意識していくと、私はここまでに記載したような方法でそれなりにスマートに実装ができたと思います。

途中にも記載しましが、まずは本環境向けの構築を中心におこない、その上でDR環境に向けて何を切り出さないといけないか、微修正を重ねながら実装していくことが1つの方法でしょう。
本記事以外の構成も気になるので、ぜひリアクションいただけると幸いです。

最後になりますが、今日から約10記事、Terraformのネタが続きますので、この連載や技術ブログにこれまで上がっているTerraformの記事もぜひご覧ください。

- [2023年 Terraform連載](/articles/20230327a/)
- [Terraformタグの記事](/tags/Terraform/)

## 参考

本記事では触れていませんが、1つのモジュールに対して2つのリージョンに投げる場合（CloudFrontとALB）の構成の場合には、`configuration_aliases`を使うことで対応できます。
(`configuration_aliases`の使い方は「[かゆいところに手が届く、Terraformの書き方 (configuration_aliasesの使い方)](https://qiita.com/kaedemalu/items/d148c86f901f654f2930)」を参照ください。)
