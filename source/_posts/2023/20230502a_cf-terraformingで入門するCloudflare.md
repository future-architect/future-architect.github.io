---
title: "cf-terraformingで入門するCloudflare"
date: 2023/05/02 00:00:00
postid: a
tag:
  - Cloudflare
  - IaC
  - Terraform
category:
  - DevOps
thumbnail: /images/2023/20230502a/thumbnail.png
author: 伊藤太斉
lede: "cf-terraformingは、Cloudflareにて開発されているOSSで、その名前の通り、Cloudflare上のリソースをHCL化し、出力されたソースを利用してTerraformのState管理下にすることができるツールです"
---
こんにちは。TIGの伊藤太斉です。この記事は[春の入門連載2023](/articles/20230417a)の12(11)日目です。

先日、Cloudflareの勉強会に参加してきて、これまで名前しか知らなかったものが少し知ることができてとワクワクしている最近です。そして、春の入門連載に今年も参加しているので、せっかくならCloudflareを記事にしつつ、理解を深めていこうと思います。

いきなりCloudflareのサービスに入門するよりは、自分の分野であるTerraformからCloudflareに入門します。

Cloudflare Workersについては、小澤さんの[CDN 入門とエッジでのアプリケーション実行](/articles/20230427a)でも触れているので合わせてご覧になってください。

## CloudflareとTerraform

Terraformは言わずもがな、Infrastructure as Code(IaC)を実現するためのツールとして知られています。そして、CloudflareについてもTerraformのProviderをCloudflareで開発しており、他のパブリッククラウドやサービスと同じようにTerraformで管理できます。

https://github.com/cloudflare/terraform-provider-cloudflare

さて、このようにTerraform管理できることで、Cloudflareのリソースがどれだけあるか、どのように設定されているか見通しを良くできますが、一方で元々手動で作ってしまったリソースをTerraformの管理下とする場合、そもそも全量把握できているか、と不透明な状況になります。そこで、今回取り上げるcf-terraformingです。

## cf-terraformingによるIaC化

cf-terraformingは、Cloudflareにて開発されているOSSで、その名前の通り、Cloudflare上のリソースをHCL化し、出力されたソースを利用してTerraformのState管理下にできるツールです。利用準備も含めて、実際に見ていきましょう。

https://github.com/cloudflare/cf-terraforming

また、類似のツールとして[terraformer](https://github.com/GoogleCloudPlatform/terraformer)もあり、ソースの生成からStateの変更まで一括でできる点はメリットですが、Terraformのv1.x系のサポートがないため、importされたソースをアップデートする必要があります。

### 利用準備

はじめに環境構築をしましょう。今回はMac環境で進めていきます。前提としてHomebrewを利用できるようにしておきましょう。

```bash
# Terraformのインストール
$ brew tap hashicorp/tap
$ brew install hashicorp/tap/terraform

# cf-terraformingのインストール
$ brew tap cloudflare/cloudflare
$ brew install --cask cloudflare/cloudflare/cf-terraforming
```

CLIはこれで準備が完了したので、次にディレクトリ周りの準備です。
cf-terraformingを利用する際には事前にProviderが利用できる状態になっている必要があるので、以下のように任意のディレクトリを作成し、`provider.tf`を作成しておきましょう。

```bash
mkdir cloudflare-terraform
cd cloudflare-terraform
```

```tf
# provider.tf
provider "cloudflare" {}
```

上記のファイルを準備した上で、`terraform init`コマンドを実行しておきましょう。
また、環境変数周りの設定も必要になるので、

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_API_KEY`
- `CLOUDFLARE_EMAIL`
- `CLOUDFLARE_ACCOUNT_ID`

の4つを使える状態にしておきましょう。私の場合には、以下のように`env`ファイルに記述して、利用できるようにしました。

```sh
# env
export CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export CLOUDFLARE_API_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
export CLOUDFLARE_EMAIL=user@sample.com
export CLOUDFLARE_ACCOUNT_ID=00000000000000000000000000
```

これで、準備が整ったので、実際のリソースに対して実行しましょう。cf-terraformingには、`generate`と`import`の2つのコマンドがあります。ここからはそれぞれ使って、WorkersのKVを触ってみようと思います。名前は以下のように`SAMPLE_TF`としました。

<img src="/images/2023/20230502a/image.png" alt="image.png" width="825" height="502" loading="lazy">

### generate

まずは、`generate`コマンドを使ってみます。Workers KVはAccount単位で利用するリソースであることと、事前に環境変数を利用できるようにしてあるので、 以下のワンラインを入力すると、それに対応したTerraformのコードが出力されます。

```bash
$ cf-terraforming generate --resource-type "cloudflare_workers_kv_namespace"

resource "cloudflare_workers_kv_namespace" "terraform_managed_resource_xxxxxxxxxxxxxx" {
  account_id = "00000000000000000000000000"
  title      = "SAMPLE_TF"
}
```

上記で[cloudflare_workers_kv_namespace](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/workers_kv_namespace)に対応したリソースが作成されたことがわかりました。実際には、ファイルに記述して利用したいので、

```bash
cf-terraforming generate --resource-type "cloudflare_workers_kv_namespace" >> workers_kv_namespace.tf
```

のように利用するのが良さそうです。また、新規にWorkers KVを作成した場合(`SAMPLE_TF2`)とした場合には以下のような出力になるため、指定したTerraformのリソースに該当するリソースを全て出力してくれるようです。

### import

`cf-terraforming generate`コマンドで出力したHCLを利用してState管理下にしていきましょう。
コマンドは、先ほど実行した`generate`を`import`に変えた形で、実行します。

```bash
$ cf-terraforming import --resource-type "cloudflare_workers_kv_namespace"

terraform import cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx xxxxxxxxxxxxxx
```

このように`cf-terraforming import`コマンドでは「`terraform import`コマンドのワンライン」を出力してくれるようです。それでは、この出力されたコマンドを入力してみましょう。

```bash
$ terraform import cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx xxxxxxxxxxxxxx

cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx: Importing from ID "xxxxxxxxxxxxxx"...
╷
│ Error: invalid id ("xxxxxxxxxxxxxx") specified, should be in format "accountID/namespaceID"
│
│
╵
```

エラーになってしまいました。エラーの内容を読んでみると「`accountID/namespaceID`の形式でコマンドを実行してね」なので、上で入力したnamespaceIDの手前にaccountIDを差し込んで再度トライしたところ、成功しました。

```bash
$ terraform import cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx 00000000000000000000000000/xxxxxxxxxxxxxx

cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx: Importing from ID "00000000000000000000000000/xxxxxxxxxxxxxx"...
cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx: Import prepared!
  Prepared cloudflare_workers_kv_namespace for import
cloudflare_workers_kv_namespace.terraform_managed_resource_xxxxxxxxxxxxxx: Refreshing state... [id=xxxxxxxxxxxxxx]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

無事にTerraformのStateに取り込むことができました。`import`コマンドも実際にはそのまま使うのではなく、シェルスクリプトなどに格納した上で使っていくのが良いのかと思いました。

### その他

cf-terraformingは、公式の[Supported Resources](https://github.com/cloudflare/cf-terraforming#supported-resources)に記載があるように、Cloudflareの全てのリソースに対して対応しているわけではありません。ただ、Terraformの管理下としたい場合の選択肢としては、Terraformが元来機能として有している`terraform import`コマンドもあり、ほとんどカバーすることが可能です。

## まとめ

今回はcf-terraformingを通して、Cloudflareに触ってみました。generateコマンドでコードを生成し、importコマンドでStateの管理下にする、という流れでIaCへのハードルがすごく下がった印象でした。さまざまな言語を学ぶ時にはじめにぶつかる「どう書くんだっけ？」という疑問が減ることがこのツールの大きな意義と感じました。また、その他でも触れましたが、ツールとしてはまだ適用範囲(特に個人向けでサクッと使うリソース)がもっと広がるとより使いやすくなりそうです。

週明けの5/8は齊藤さんの [新人の時に出会いたかった本の紹介](/articles/20230508b/)です。
