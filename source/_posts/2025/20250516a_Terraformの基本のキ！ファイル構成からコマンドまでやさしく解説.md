---
title: "Terraformの基本のキ！ファイル構成からコマンドまでやさしく解説"
date: 2025/05/16 00:00:00
postid: a
tag:
  - Terraform
  - 入門
  - 初心者向け
category:
  - Infrastructure
thumbnail: /images/2025/20250516a/thumbnail.png
author: 染矢幸子
lede: "IT未経験での入社だったため、インフラって何？というところから始まり、AWSやTerraformについてこの数か月間学んできました。"
---

<img src="/images/2025/20250516a/image.png" alt="" width="976" height="269" loading="lazy">

[春の入門祭り2025](/articles/20250413a/) 17本目の記事です。

# はじめに

はじめまして、TIG（Techonology Innovation Group）の染矢です。

2025 年 2 月から新卒として事業部に配属され、インフラ周りを担当しています。IT 未経験での入社だったため、インフラって何？ というところから始まり、AWS や Terraform についてこの数か月間学んできました。

未経験者がインフラ業務を数か月間経験し、最初の頃理解が難しかった点や、躓いた点をご紹介していきます。

# 1. Terraform ってなに

Infrastructure as Code (IaC) ツールの一種で、クラウドやオンプレミス環境のインフラリソースをコードで定義し、自動的にプロビジョニング、管理できるツールです。

プロビジョニングの詳しい記事:[【Terraform】プロビジョニングとはなんぞや？](/articles/20250403a/)

## 1.2 IaC を使う理由

マネージドコンソール等でポチポチとインフラを構築することも勿論できますが、laC を使うことで次のようなメリットがあります。

1. 変更管理が容易
1. 間違えても、最新の IaC を apply することで元の状態を復元できる
1. 対応漏れの検知や横展開調査がやりやすくなる

チームでの開発ではインフラの構成を全員が理解しているわけではないので、Git で履歴管理し可視化することが大切です。

また、セキュリティ的に甘い設定があったとしても、いつからいつまでの期間で甘い設定だったから影響範囲は～と特定がしやすくなります。

# 2. 全体像

## 2.1 ファイル構成

::: note info
構成に関してあくまでもわかりやすい構成図を描いています。開発環境によって異なることをご留意ください。
:::

基本的には `main.tf` を軸にインフラを構築していきます。
module 配下のディレクトリでリソースタイプ毎に分けていきます。

## 開発環境が一つの場合

```sh project1
project1
├── locals.tf
├── main.tf
├── output.tf
├── README.md
└── module
    ├── ec2
    │   ├── ec2_instance.tf
    │   └── variables.tf
    ├── s3
    │   ├── s3_bucket.tf
    │   └── variables.tf
    └── vpc
        ├── variables.tf
        └── vpc.tf

```

## 開発環境が複数の場合

検証環境や本番環境に分ける場合は下記のようなファイル構成を組むとわかりやすいです。

```sh project2
project2
├── env
│   ├── dev
│   │   ├── locals.tf
│   │   ├── main.tf
│   │   ├── output.tf
│   │   └── README.md
│   ├── prod
│   │   ├── locals.tf
│   │   ├── main.tf
│   │   ├── output.tf
│   │   └── README.md
│   └── stg
│       ├── locals.tf
│       ├── main.tf
│       ├── output.tf
│       └── README.md
└── module
    ├── ec2
    │   ├── ec2_instance.tf
    │   └── variables.tf
    ├── s3
    │   ├── s3_bucket.tf
    │   └── variables.tf
    └── vpc
        ├── variables.tf
        └── vpc.tf
```

公式のガイドライン、 [Standard Module Structure | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/language/modules/develop/structure) にもファイル構成についての記載があります。

## 2.2 モジュールの使い方

ここからはモジュールの使い方について説明していきます（基本的に複数の環境があることを想定しています）。

Terraform ではモジュールで作った各リソースを main に呼び出してインフラを構築していきます。そのため環境ごとに呼び出すモジュールを変えたり、リソースのパラメータの設定値を変更できます。

例えばモジュール EC2 の中に EC2 インスタンスのリソースを次の様に作成します。

```tf module/EC2/ec2_instance.tf
resource "aws_instance" "example" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
}
```

`var.ami_id` や `var.instance_type` ってなってますよね？

この var は ↓ の `variables.tf` で定義してますよという意味です。

```tf module/EC2/valicables.tf
variable "ami_id" {
  type        = string
  description = "A String of ami_id"
}
variable "instance_type" {
  type        = string
  description = "A String of instance_type"
}
```

`variables.tf` で定義してるって言ったのに、string と説明欄しかない！ ってなりますが、環境ごとに値を変えたい場合は実際に値を入れるのは main.tf になります。

```tf project2/dev/main.tf
module "EC2" {
source = "../../module/EC2"
  ami                         = "ami-✖✖✖✖✖✖✖✖✖"
  instance_type               = "t3.medium"
}
```

`main.tf` で実際の値を入れることで、各環境ごとにパラメーターを変更できます。

そのため流れは...

1. モジュール内でリソースを作成する
1. variables.tf で定義する
1. main.tf で値を入れる

...となります。

※ちなみに、`variables.tf` に書いた変数はモジュールを呼び出す際、 `main.tf` で定義をしないとエラーになります。

# 3. ブロックタイプ

Terraform には様々なブロックタイプがあります。

このうち主に使うブロックタイプについて解説していきます。

私は最初の頃 resource と data の違いがよくわかっていませんでした。🤔

## 3.1 resource

おそらく Terraform で一番触れるブロックタイプだと思います。

- **目的・役割**
  実際に作成・管理したいインフラストラクチャの構成要素 (例: EC2 インスタンス、S3 バケット、VPC など) を定義します。Terraform はこのブロックに基づいてリソースを計画し、適用 (作成、更新、削除) します。
- **リソースタイプ**
  プロバイダーが提供するリソースの種類（例えば、AWS の EC2 インスタンスなら aws_instance）
- **リソース名**
  Terraform の設定ファイル内でこのリソースを一意に識別するための名前。この名前を使って他の場所から参照するため、必ず一意のものにしましょう。

  ```tf 例
  resource "リソースタイプ" "リソース名" { ... }
  ```

## 3.2 data

**目的・役割**

Terraform の設定の外部にある既存のリソースの情報を読み込んで利用するために使います。Terraform は data ブロックで定義されたものを管理 (作成・変更・削除) しません。

```tf 例
data "データソースタイプ" "データソース名" {
  // データをフィルタリング引数
}
```

data ブロックについては、私が躓いた部分でもあるので次の１～ 2 のユースケースを元に詳しく解説します。

### ユースケース 1: AMI ID の取得

OS のイメージ（AMI）を取得します。filter で名前やタイプを検索でき、当てはまる AMI を取得できます。

```tf 例
data "aws_ami" "example" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["✖✖✖✖✖✖✖✖✖✖✖"] /名前でAMIをフィルタリング/
  }
}

resource "aws_instance" "web_server" {
  ami           = data.aws_ami.example.id
  instance_type = "t2.micro"
}
```

### ユースケース 2: IAM policy の簡潔化

IAM ポリシーは JSON 形式ですが、resource ブロック内で複雑なポリシーを JSON で直接記述・管理するのは難しいです。

また data ブロックにすることで可読性も期待できるため、何らかのポリシーを作成する際は、data ブロックに分けて作成することをお勧めします。

```tf 例
data "aws_iam_policy_document" "example_policy_document" {
  statement {
    actions   = ["s3:*"]
    resources = ["arn:aws:s3:::example-bucket"]
    effect    = "Allow"
  }
}

resource "aws_iam_policy" "example_policy" {
  name   = "ExamplePolicy"
  policy = data.aws_iam_policy_document.example_policy_document.json
}
```

## 3.3 variable

いわゆる変数ブロックです。

**目的・役割**

Terraform の設定を柔軟にするために、外部から値を注入したり、設定内で再利用可能な値を定義します。また同じ Terraform コードを異なる環境（検証、本番など）や異なる目的で利用する際に、変数値を変えるだけで対応できます。

基本的には下記のような形になります。

```tf 例
variable "変数名" {
  type        = <型>
  description = "<変数の説明>"
  default     = <デフォルト値>
}
```

## 3.4 output

**目的・役割**

Terraform が管理するリソースから得られる情報 (例: 作成された EC2 インスタンスの IP アドレス、S3 バケットの名前など) を、`terraform apply` の実行後に出力したり、他の Terraform 設定から参照できるようになります。

```tf 例
output "出力名" {
  value       = <出力したい値>
  description = "<出力の説明>"
  sensitive   = <true または false>
}
```

- **value**
  実際に出力される値を指定します。
  (例: `aws_instance.example.public_ip` `module.vpc.vpc_id`)
- **description**
  説明欄です。チームで開発する際は必須です。
- **sensitive**
  `true` に設定すると、`terraform apply` の出力や `terraform output` コマンドの通常表示では、実際の値の代わりに `<sensitive>` と表示されます。これにより、機密情報がターミナルログに表示されるのを防ぎます。デフォルトは `false` です。

# 4. Terraform コマンド

Terraform で書いたコードで実際にインフラを構築する際のコマンドについて解説します。

※Terraform コマンドはカレントディレクトリ配下を全て実行します。

そのため複数の環境の内、1つを実行したい場合はその環境の階層に行きましょう。

下記の例で本番環境を作成・更新したい場合、project2/env/prod の階層に行きましょう。

```sh project2
project2
├── env
│   ├── dev
│   │   ├── locals.tf
│   │   ├── main.tf
│   │   ├── output.tf
│   │   └── README.md
│   ├── prod
│   │   ├── locals.tf
│   │   ├── main.tf
│   │   ├── output.tf
│   │   └── README.md
│   └── stg
│       ├── locals.tf
│       ├── main.tf
│       ├── output.tf
│       └── README.md
└── module
    ├── ec2
    │   ├── ec2_instance.tf
    │   └── variables.tf
    ├── s3
    │   ├── s3_bucket.tf
    │   └── variables.tf
    └── vpc
        ├── variables.tf
        └── vpc.tf
```

## 4.1 terraform init

1. **バックエンドの初期化**
   Terraform は、管理するインフラの状態を **状態ファイル（state file、通常は terraform.tfstate）** に保存します。
   init は状態ファイルを読み書きできるように準備します。

::: note info
状態ファイルとは？Terraform が管理するインフラストラクチャの現在の実際の状態を記録・追跡するための重要なファイル
:::

2. **プロバイダープラグインのダウンロード**
   Terraform は、さまざまなクラウドプロバイダー (AWS, Azure, GCP など) と連携するために「プロバイダープラグイン」を使用します。init は設定ファイル（provider ブロックや terraform ブロック内の required_providers）を元に、必要なプロバイダープラグインをダウンロードします。
3. **モジュールの取得**
   設定ファイル内で module ブロックを使って外部のモジュールを参照している場合、init はそれらのモジュールを指定されたソースからダウンロードまたはコピーします。
4. **依存関係ロックファイルの作成/更新**
   init を実行すると、`.terraform.lock.hcl` というファイルが作成または更新されます。
   このファイルには、選択されたプロバイダーの正確なバージョンとハッシュ値が記録されます。これにより、チームメンバー間で同じバージョンのプロバイダーを使用することが保証され、環境による意図しない挙動の違いを防ぎます。

## 4.2 terraform plan

1. **変更内容の予測**
   現在の Terraform 設定ファイルが示す「望ましい状態」と、現在のインフラの「実際の状態」を比較します。
2. **実行計画の表示**
   差分に基づいて、実行計画を生成します。
   変更の概要（例: Plan: 1 to add, 2 to change, 1 to destroy.）が表示されます。

## 4.3 terraform apply

実際にインフラが変わるコマンドです。慎重に使いましょう。

1. **変更の実行**
   Terraform は実行計画に従って、プロバイダープラグインを通じてクラウド API などを呼び出し、リソースの作成、更新、または削除します。
2. **状態ファイルの更新**
   全ての変更が完了すると、Terraform は状態ファイル (terraform.tfstate) を更新し、最新のインフラストラクチャの状態を反映します。[Terraform 101](/articles/20200624/) 記事に詳しく記載されているのでぜひ一読ください！

# 5. Terraform 勉強法

### 5.1 公式ドキュメント

Terraform は公式ドキュメントにリソースの作成方法や使い方が詳しく書いてあります。

リソースを作成する際は必ず[公式ドキュメント](https://registry.terraform.io/)を確認しましょう！

公式ドキュメントを見ても、英語だしパラメータが多くて読み飛ばしてしまいたくなりますが、最初の頃は時間をかけてでも、**一文ずつ理解**することが大切だと感じています。

また勉強する中で、下記の記事がとても分かりやすかったのでお勧めです。

[Terraform に入門して 1 ヶ月経ったので、初心者が気をつけるべきポイントを書いてみる](/articles/20230406a/)

## 5.2 おすすめ参考書

最後に私が Terraform を学ぶ上で役に立ったと思う参考書についてご紹介します。

「実践 Terraform AWS におけるシステム設計とベストプラクティス」は、AWS 環境前提でありますが、基本的に使うリソースの使い方を詳しく載せてくれています。

<a href="https://amzn.asia/d/8lAuoxf">
<img src="/images/2025/20250516a/image_2.png" alt="image.png" width="340" height="480" loading="lazy">

実践 Terraform 　 AWS におけるシステム設計とベストプラクティス (技術の泉シリーズ（NextPublishing）)
</a>

# おわりに

ここまで読んでいただきありがとうございました！

Terraform 超入門ということで、Terraform ってなに？ というところからご紹介をしていきました。

今後も初心者向けの記事を投稿していきたいと思います！
