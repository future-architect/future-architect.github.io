---
title: "Terraformに入門して1ヶ月経ったので、初心者が気をつけるべきポイントを書いてみる"
date: 2023/04/06 00:00:00
postid: a
tag:
  - Terraform
  - 初心者向け
  - 入門
category:
  - Programming
thumbnail: /images/20230406a/thumbnail.png
author: 大岩潤矢
lede: "初心者がTerraformを扱う際に気をつけるべきポイントについて、自分が1ヶ月間みっちりTerraformを触った経験をもとに紹介したいと思います。"
---

<img src="/images/20230406a/top.png" alt="" width="500" height="286">

## はじめに

[Terraform連載2023](/articles/20230327a/) の8リソース目の記事は、Terraform初心者向けの記事です！

こんにちは、TIG DXユニット所属の大岩と申します。

去年の7月に新卒で入社し、新卒研修を終えた後、実際のプロジェクトに配属されました。このプロジェクトでは、Terraformを使ってAWSのインフラ構築を自動化する業務に携わりました。これまでTerraformはおろか、インフラもネットワークの知識もほとんど無い未経験の状態からのスタートです。日々インフラの知識を脳に叩き込み、それをコードの形でアウトプットしていく、なんとも目まぐるしい毎日を過ごしております。

当記事では、初心者がTerraformを扱う際に気をつけるべきポイントについて、自分が1ヶ月間みっちりTerraformを触った経験をもとに紹介します。

動作環境は以下のとおりです。

- Terraform v1.4.1
- terraform-provider-aws v4.60.0
- Windows 10 Pro 21H2(19044.2728)
- Ubuntu 20.04.6 LTS on WSL2

## 気をつけるべきポイント4選

1. 何よりまずは公式ドキュメントを読もう
2. `terraform` コマンドを使いこなそう
3. 効率よく書こう
4. これはバグ？と思ったらIssueを見に行こう

### 1. 何よりまずは公式ドキュメントを読もう

これはTerraformに限った話ではないのですが、 **まずは公式ドキュメントをしっかり読むこと** を挙げたいと思います。

Terraformの公式サイトには、プロパイダごとのドキュメントが非常に丁寧に記載されています。各 `resource` ごとにページが分けられており、使い方や各引数のリファレンス、実装例などが記載されています。

[AWSプロパイダのドキュメント](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

#### Terraformのドキュメントはすべて英語

初心者にとって一番取っ付きにくく感じてしまう原因が言語の壁です。残念ながら、Terraform公式サイトのドキュメントはすべてが英語です。専門用語も多く、機械翻訳に通しても綺麗な日本語に翻訳してくれないため、読む気が削がれがちです。

ここはもう頑張って英語を読む、というのが解決策になってしまいます。今から紹介する「Note」をしっかり読むことは特に重要です。

#### Noteを見逃さない

Terraformのドキュメントには、至るところに黄背景の「Note」が記載されており、これを見逃すとエラーが発生したり、上手く構築できないことが多くありました。これは私の失敗談をもとに紹介します。

LambdaにアタッチするIAMロールを用意する際、自分が書いたJSONによるIAMポリシーと、AWSのマネージドポリシーである `AWSLambdaVPCAccessExecutionRole` ポリシーの両方をアタッチしたい場面がありました。そこで、以下のように記載しました。

```sh
resource "aws_iam_role" "lambda" {
  name                = "iam_role-lambda"
  assume_role_policy  = templatefile("./lambda_assume_role.json", {})
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"] # マネージドポリシーのアタッチ
}

resource "aws_iam_policy" "lambda" {
  name   = "iam_policy-lambda"
  policy = templatefile("./lambda.json", {}) # 自分で書いたカスタマー管理ポリシーを読み込む
}

resource "aws_iam_role_policy_attachment" "lambda" { # カスタマー管理ポリシーのアタッチ
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda.arn
}
```

Lambda側のリソースにIAMロールをアタッチして、 `terraform plan` および `terraform apply` を実施します。初回は正常に完了するように見えるのですが、再度 `terraform plan` をしてみます。

```sh
Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the
following symbols:
  ~ update in-place

Terraform will perform the following actions:

  # module.iam_role_lambda.aws_iam_role.lambda will be updated in-place
  ~ resource "aws_iam_role" "lambda" {
        id                    = "iam_role-lambda"
      ~ managed_policy_arns   = [
          - "arn:aws:iam::xxxxxxxxxxxx:policy/iam_policy-lambda",
            # (1 unchanged element hidden)
        ]
        name                  = "iam_role-lambda"
        tags                  = {}
        # (8 unchanged attributes hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

本来 `terraform apply` 直後に `terraform plan` を実行すると、変更差分無し（`No changes`）になるべきです。しかし、 `managed_policy_arns` から、アタッチしたカスタマー管理ポリシーが削除される変更が生じています。

このまま `terraform apply` を実行すると、たしかにAWSマネージドポリシーである `AWSLambdaVPCAccessExecutionRole` のみがアタッチされている状態となってしまいます。

<img src="/images/20230406a/image.png" alt="" width="1200" height="583" loading="lazy">


ここで公式ドキュメントの記述を見てみましょう。[aws_iam_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role)のページ冒頭に、黄色で「NOTE」が書かれているようです。

<img src="/images/20230406a/image_2.png" alt="" width="750" height="259" loading="lazy">

> NOTE:
> If you use this resource's managed_policy_arns argument or inline_policy configuration blocks, this resource will take over exclusive management of the role's respective policy types (e.g., both policy types if both arguments are used).
> These arguments are incompatible with other ways of managing a role's policies, such as aws_iam_policy_attachment, aws_iam_role_policy_attachment, and aws_iam_role_policy. If you attempt to manage a role's policies by multiple means, you will get resource cycling and/or errors.
> [引用元](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role#:~:text=If%20you%20use,and/or%20errors.)

DeepLに日本語訳してもらいます。

「このリソースの `managed_policy_arns` 引数または `inline_policy` 設定ブロックを使用すると、このリソースはロールのそれぞれのポリシータイプ（例えば、両方の引数を使用した場合は両方のポリシータイプ）の排他的管理を引き受けます。これらの引数は、`aws_iam_policy_attachment` 、`aws_iam_role_policy_attachment` 、`aws_iam_role_policy` といったロールのポリシーを管理する他の方法と互換性がありません。複数の手段でロールのポリシーを管理しようとすると、リソースの循環やエラーが発生します。」

確かに今回の例では、 `aws_iam_role` リソースの引数として `managed_policy_arns` を設定し `AWSLambdaVPCAccessExecutionRole` ポリシーをアタッチすると同時に、 `aws_iam_role_policy_attachment` リソースも記述し、カスタマー管理ポリシーをアタッチしようとしています。まさに、「**複数の手段でロールのポリシーを管理しようとすると、リソースの循環やエラーが発生します。**」という部分に該当します。

初回apply時は `aws_iam_role` リソースと `aws_iam_role_policy_attachment` リソースを両方とも作成するため、2つのポリシーが正常に紐付きます。しかし再度planを実施すると、今度は `aws_iam_role` リソースの `managed_policy_arns` を見てカスタマー管理ポリシーは不必要であると判定し、AWSマネージドポリシーのみになるよう修正を加えてしまいます。結果、想定していない変更が生じてしまいます。要するに、ロールのポリシーを管理する方法を1つに絞りなさい、という警告でした。

今回の場合は、 `AWSLambdaVPCAccessExecutionRole` をアタッチするのではなく、 `managed_policy_arns` を削除し、`AWSLambdaVPCAccessExecutionRole` の中身をカスタマー管理ポリシーの中に記載してしまうことで解決しました。解決するまでに色々なサイトを渡り歩き、1時間ほど無駄にしてしまいました。もっと早く気づいていれば……と後悔しました。

ポイント: **公式ドキュメントは英語でもしっかり読むべし。特にNOTEに気をつけろ！**

### 2. `terraform` コマンドを使いこなそう

`terraform` コマンドでよく使うのは、 `plan` 、 `apply` 、 `destroy` の3つだと思います。それぞれのコマンドには多数のオプションがあることをご存知でしょうか？ここでは、私が1ヶ月間の間に非常にお世話になったコマンド・オプションを3つピックアップして紹介します。

#### `terraform apply -target=(リソース名)`

https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting

`plan` 、 `apply` 、 `destroy` ともに、 `-target` オプションをつけると、指定したリソースのみを対象として各操作を実施できます。例えば、 `terraform apply -target=aws_s3_bucket.hoge` コマンドを実施することで、 `hoge` という名前のS3バケットのみをapplyできます。

複数のリソースを指定したい場合は、一つずつ `-target` 引数を追加するか、 `{}` の中にコンマ区切りで指定します。例えば、 `fuga` と `piyo` という名前のS3バケットのみをdestroyしたい場合は、このように記載します。

- `terraform destroy -target=aws_s3_bucket.fuga -target=aws_s3_bucket.piyo`
- `terraform destroy -target={aws_s3_bucket.fuga,aws_s3_bucket.piyo}`

このオプションは開発時に特定のリソースのみを作り直したり、引数を変更して試したいときなどに便利です。しかしTerraform公式では、 `target` オプションを通常のユースケースで用いることはおすすめしていません。

> Targeting individual resources can be useful for troubleshooting errors, but should not be part of your normal workflow.
> [引用元](https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting#:~:text=Targeting%20individual%20resources%20can%20be%20useful%20for%20troubleshooting%20errors%2C%20but%20should%20not%20be%20part%20of%20your%20normal%20workflow.)

また、Terraform連載3リソース目の宮永さんが、[tftarget](https://github.com/future-architect/tftarget/releases)というCLIツールを開発されています。このツールを使うことで、ターゲットの対象とするリソースをチェックを入れるように選択できるため、より簡単に・ミスなく指定できるようになります。こちらの記事もぜひご覧ください！

* [tftarget:Terraformターゲットを選択的に実行するためのGo製CLIツール](https://future-architect.github.io/articles/20230329a/)


#### `terraform apply -parallelism=(並列実行数)`

https://developer.hashicorp.com/terraform/cli/commands/apply#parallelism-n

リソースを構築する際の実行を並列にするオプションです。デフォルトは `10` のため、この数字を増やすことで、applyやdestroyの速度を上げる事ができます。とはいえ、apply完了までの時間はリソース同士の依存関係やリソースの構築時間にもよるので、よっぽど大量のリソースを構築する場合でなければ、そこまで恩恵は得られないと思います。

#### `terraform fmt -recursive`

https://developer.hashicorp.com/terraform/cli/commands/fmt#usage

`fmt` コマンドはその名の通り、記述のコード整形を行うコマンドですが、そのオプションに `-recursive` というものがあります。オプションなしではカレントディレクトリ内のファイルのみを対象としますが、 `-recursive` をつけることで、サブディレクトリも含め、再帰的にフォーマットを実行してくれます。

私の携わっていたプロジェクトでは、CI/CDにて `terraform fmt -recursive -check` を実施し、pushされたものが全ファイルフォーマットされていなければエラーとして弾くWorkflowを構築していました。複数人でTerraformを記載する際にコードの一貫性を担保するためにも、ぜひ導入しておきましょう。

（TerraformとDevOps・CI/CDに関しては、[Terraform連載6リソース目の川口さんの記事](https://future-architect.github.io/articles/20230403a/)や、[7リソース目の前原さんの記事](https://future-architect.github.io/articles/20230405a/)をご覧ください！）

ポイント: **terraformのコマンドは便利なオプションも知って、開発を効率よく進めよう！**

### 3. 効率よく書こう

Terraformの記法として、 `for_each` や `count` を利用して、複数のリソースを1回の記述で作成できます。

私がプロジェクトで初めて提出したPRは、「利用するサービス分のVPCエンドポイントを構築する」TerraformのPRでした。私は愚直にも一つ一つ丁寧に `aws_vpc_endpoint` リソースをサービス分作成しており、レビュアーである[ゆるふわエンジニア前原さん](https://future-architect.github.io/authors/%E5%89%8D%E5%8E%9F%E5%BF%9C%E5%85%89/)から「 `for_each` を使おうね！」と諭されてしまいました。

具体例を見てみましょう。今回は、S3とSecrets ManagerのVPC Endpointに接続するための、Interface型のVPC Endpointを構築します。

#### `for_each` を使わない例

```sh
resource "aws_vpc_endpoint" "s3" {
  vpc_id             = aws_vpc.api_service.id
  service_name       = "com.amazonaws.ap-northeast-1.s3"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = local.subnet_ids.private # local変数に記載
  security_group_ids = [
    aws_security_group.vpc_endpoint.id, # Security Groupの記載は割愛します
  ]
}

resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id             = aws_vpc.api_service.id
  service_name       = "com.amazonaws.ap-northeast-1.secretsmanager"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = local.subnet_ids.private # local変数に記載
  security_group_ids = [
    aws_security_group.vpc_endpoint.id, # Security Groupの記載は割愛します
  ]
}
```

確かに2つぐらいでしたらそこまで煩雑ではないのですが、10個・20個というレベルになると大分厳しいです。

#### `for_each` を使う例

まずは、Local変数(Local Value)に使うサービスを、 `map` の形式で列挙しておきます。Keyにはそのサービスの識別子となる文字列を、Valueにはサービス名を記載します。

```sh
locals {
  vpc_endpoints = {
    "s3"  = "com.amazonaws.ap-northeast-1.s3"
    "asm" = "com.amazonaws.ap-northeast-1.secretsmanager"
  }
}
```

これを `for_each` を使って展開します。KeyとValueは、それぞれ `each.key` と `each.value` で取得できます。ここでは、 `service_name` に、Valueとして格納したサービス名を指定したいため、 `each.value` を指定しています。

```sh
resource "aws_vpc_endpoint" "vpc_endpoints" {
  for_each = local.vpc_endpoints

  vpc_id             = aws_vpc.api_service.id
  service_name       = each.value
  vpc_endpoint_type  = "Interface"
  subnet_ids         = local.subnet_ids.private # local変数に記載
  security_group_ids = [
    aws_security_group.vpc_endpoint.id, # Security Groupの記載は割愛します
  ]
}
```

これまで2つリソースを記載していた部分が、1回の記述のみで済みました。このように、繰り返し同じものを作成する場合などは、Local変数に値を切り出して `for_each` を利用して効率よく記載することで、単純なミスや視認性の悪化を防ぐなどのメリットがあります。

ポイント: **エンジニアなら楽すべし！ `for_each` を使いこなそう！**

### 4. これはバグ？と思ったらIssueを見に行こう

Terraform本体や、各サービスのプロバイダーはOSSとして公開されています。日々世界中の有志の開発者たちによって、各種クラウド環境のアップデートへの追従や、コードの改善が繰り返されています。

移り変わりが激しい業界であるからこそ、最新仕様への追従の遅れや、バグを踏み抜いて動作しないという場面に多く出くわします。正しく書いたことは間違いないのに正常に動作しない、謎のエラーが出るときは、一度GitHub上のIssueページを覗いてみましょう。以下、自分の経験を記載します。

AWS Pinpointを構築するリソースを作成し、apply・動作確認が完了したため、destroyしました。すると、Pinpoint自体は削除されているものの、Terraformは以下のエラーが出て終了しました。

```sh
Error: deleting Pinpoint Application (xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx): %!s(<nil>)
```

普段は `%!s(<nil>)` の部分にエラーメッセージが表示されるはずですが、このメッセージでは `nil` と書かれています。Terraform自体はGolangで書かれているので、 `nil` はメッセージとなる文字列が正常に渡されなかったと推測できます。つまりこれはバグであると判断しました。

terraform-provider-aws のGitHubにアクセスし、Issueの検索から[「pinpoint nil」で検索します](https://github.com/hashicorp/terraform-provider-aws/issues?q=pinpoint+nil)。すると……ヒットしました！すでにCloseされていましたが、[「[Bug]: Unable to delete Application PinPoint, destroy command error」](https://github.com/hashicorp/terraform-provider-aws/issues/29341) というタイトルのIssueを発見しました。

<img src="/images/20230406a/image_3.png" alt="image.png" width="1200" height="664" loading="lazy">

一番下を見ると、[MergedとなっているPR](https://github.com/hashicorp/terraform-provider-aws/pull/30101)があることが分かります。

<img src="/images/20230406a/image_4.png" alt="image.png" width="1077" height="160" loading="lazy">

さらにその先には、`v4.60.0` で修正がリリースされるとの文言がありました。記事執筆時点で2週間前となっていますが、このバグを踏んで調べた時点ではまだ数日しか経っていない、修正したての出来事でした。

> This functionality has been released in v4.60.0 of the Terraform AWS Provider.

<img src="/images/20230406a/image_5.png" alt="" width="1155" height="298" loading="lazy">

すぐにterraform-provider-awsのバージョンをv4.60.0に上げ、`terraform init -upgrade` を実施し、apply・destroyを実施すると、今度はエラーを出さずに正常終了しました。

実はその前にも[Security Groupの削除中にプログラムがクラッシュするバグ](https://github.com/hashicorp/terraform-provider-aws/issues/29236)にあたり、その時もIssueを見つけ、バージョンアップで解決したことがありました。世界中の開発者がバグを報告し、リアルタイムに修正していく様子を見ることができるOSSの強みを自分の開発にも取り入れていけば、バグの解決のために数時間をネットサーフィンに費やす失態を無くすことができるでしょう。

また、もし起票されていないバグを発見したら、自分でIssueを起票しましょう！

ポイント: **バグを踏んだらまずIssueを見よ！世界中の開発者たちに感謝しつつ、最新情報をキャッチせよ！**

## おわりに

いかがだったでしょうか。ほとんどTerraformに限らない話だったかもしれませんが、この記事が少しでも私と同じTerraform初心者のお役に立つことができれば幸いです。
私もまだまだ勉強中の身であるので、間違ったことを言っているようでしたら、優しくご指摘ください！

