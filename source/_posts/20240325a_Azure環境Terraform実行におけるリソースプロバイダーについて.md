---
title: "Azure環境Terraform実行におけるリソースプロバイダーについて"
date: 2024/03/25 00:00:00
postid: a
tag:
  - Terraform
  - Azure
category:
  - Infrastructure
thumbnail: /images/20240325a/thumbnail.png
author: 真鍋優
lede: "昨今のOpenAI需要によって、Azure環境の利用を本格的に始める方も多いかと思います。今回はAzure環境でTerraformを利用する際、裏で動いているリソースプロバイダーについてご紹介します。"
---
<img src="/images/20240325a/top.png" alt="" width="800" height="515">


[Terraform連載2024を](/articles/20240311a/) の8本目です。

# はじめに
こんにちは、SAIG(Strategic AI Group)の真鍋です。

昨今のOpenAI需要によって、Azure環境の利用を本格的に始める方も多いかと思います。

Azure環境でTerraformを利用する際、裏で動いているリソースプロバイダーについてご紹介します。

# Terraform実行時に踏んだエラー

利用中のAzure環境にて`terraform plan`を実行した際に、下記エラーが発生しました。

見やすいように改行等追加しています。

```shell
Original Error: Cannot register providers: 
Microsoft.ServiceBus,
Microsoft.DBforPostgreSQL,
(中略)...
Microsoft.TimeSeriesInsights.
Errors were:
Cannot register provider Microsoft.ServiceBus with Azure Resource Manager:
unexpected status 403 with error:
AuthorizationFailed:
The client 'xxx.xxx.xxx@exapmle.co.jp' with object id 'xxxxx-xxxx-xxxx-xxxx-xxxx'
does not have authorization to perform action 'Microsoft.ServiceBus/register/action'
over scope '/subscriptions/xxxx-xxxx-xxxx-xxxx' or the scope is invalid.
If access was recently granted, please refresh your credentials..
```

Terraformコード上はVMやStorage Account等、作成権限が確認できているリソースしか記載していませんでしたが、providerなるものを追加する際に権限不足で失敗したとのことです。

ちなみに利用するAzure環境は他チームから払い出された環境であり、Terraform実行時に認証した個人アカウントは権限が絞られています。

# リソースプロバイダーとは

今回遭遇したエラーのproviderはリソースプロバイダーといい、[Azure サービスのリソース プロバイダーとは何か](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/management/azure-services-resource-providers)に説明があります。

概要について抜粋します。

> リソース プロバイダーは、Azure サービスの機能を実現する REST 操作のコレクションです。 各リソース プロバイダーには、company-name.service-label という形式の名前空間があります。

例えばAzureストレージについては、`Microsoft.Storage`という名前空間で表現されます。

REST APIへリクエストを送信した際にAzureリソースマネージャーがそれを受け取りますが、実際の操作はリソースプロバイダーによって実施します。

下記ページが分かりやすくまとめられています。
[【図解】初心者向けリソースマネージャーとリソースプロバイダー](https://milestone-of-se.nesuke.com/sv-advanced/azure/resource-manager-provider/)

リソースプロバイダーは既定で登録されているものもありますが、手動で登録する場合や、Azureポータルにおいてリソースを作ることで自動登録される場合もあります。

今回のエラーは、Terraformプロバイダーの一つであるAzureRM利用時にリソースプロバイダーを登録しようとして発生しました。

# Terraform実行時におけるリソースプロバイダー

AzureにおけるTerraformプロバイダーとしては下記が用意されています。

* AzureRM
* AzureAD
* AzureDevops
* AzAPI
* AzureStack

今回はVMやStorage Account等を管理するため、AzureRMを利用していました。

[terraform-provider-azurerm/internal/resourceproviders](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/resourceproviders/required.go)のページによると、AzureRMでは複数のリソースプロバイダーを自動で登録するとのことです。

リソースプロバイダーの登録ですが、providerブロックに`skip_provider_registration = true`とすることで無効化できます。

あるいは環境変数`ARM_SKIP_PROVIDER_REGISTRATION`を設定することも可能とのことです。

```sh terraform
provider "azurerm" {
  skip_provider_registration = true
  features {}
}
```

[Azure Provider#skip_provider_registration](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs#skip_provider_registration)

# 解決法

今回発生したエラーの解決には下記1,2の方法が考えられます。

1. Terraform実行ユーザにリソースプロバイダー関連の権限を付与する
1. 事前に手動でリソースプロバイダーを登録し、Terraformのリソースプロバイダー登録を無効化する

1つ目の方法ですが、サブスクリプション全体に対するリソースごとの`company-name.service-label/register/action`等の権限を付与する形です。権限を付与し`terraform plan`を実行したタイミングでリソースプロバイダーが登録されます。

2つ目の方法は、手動でリソースプロバイダーを登録しておき、Terraform実行時には`skip_provider_registration`の記載や環境変数でリソースプロバイダー登録をスキップする方法です。手動でリソースプロバイダーを登録する場合は、Azureポータルのサブスクリプションからリソースプロバイダーを選択し、該当リソースプロバイダーを登録します。

私たちは、リソースプロバイダーの登録をより上位の管理者に依頼して実施するフローを作成した上で、2つ目の方法を採用しました。同一サブスクリプション内で複数チームがそれぞれTerraform実行するようなケースにおいて、利用可能なリソースを制限する場合等に採り得る方法なのかと思います。

# さいごに

これまで強い権限でTerraformを操作していたためリソースプロバイダーを意識することは無かったのですが、今回はチームの運用ポリシーとして権限が制限されていたため改めて調査しました。

リソースプロバイダーの登録を必要最低限にすることで、不要なリソースをサブスクリプション内で作成されないようにすることが可能です。リソースプロバイダー登録の権限を分離することで、より厳格にAzure環境を運用できます。

より良い運用方法について、今後も考えていきたいと思います。

また、今回の記事で扱ったリソースプロバイダーについての調査は、同チームの戸井田さんにご協力いただきました。ありがとうございました！
