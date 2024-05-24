---
title: "LocalStackに向けてTerraformを実行する"
date: 2020/11/13 00:00:00
postid: ""
tag:
  - LocalStack
  - AWS
  - Terraform
  - Docker
  - Go
  - DockerCompose
category:
  - Infrastructure
thumbnail: /images/20201113/thumbnail.png
author: 棚井龍之介
lede: "- ローカル環境に立ち上げた localstack に向けて、terraform plan/apply/destroy を実行するFutureの棚井龍之介ですTIGグループのDXユニットに所属しています"
---
# はじめに

フューチャーの棚井龍之介です。TIGグループのDXユニットに所属しています。

TerraformはLocalstackに対してもapplyできます。便利な方法なのに日本語のサイトが見当たらないので、技術ブログ化しました。

# この記事を読むとできるようになること

- ローカル環境に立ち上げた localstack に向けて、terraform plan/apply/destroy を実行できる

# LocalStackとTerraform

みなさんは、[Localstack](https://github.com/localstack/localstack) や [Terraform](https://www.terraform.io/) を使っていますか？

アプリのローカル環境テストとしてLocalstackを、インフラ構築にTerraformを用いる開発スタイルは、今やそう珍しいものではないと思います。

しかしながら、「ローカル環境のLocalStackに向けて、Terraformを打ち込むことができる」というのは、あまり知られていないようです。Googleで「localstack terraform」で検索しても、この方法を説明する日本語の入門記事は見つかりませんでした。docker-composeで立ち上げたlocalstackに向けて terraform apply を実行する方法が分かったら、開発環境の作り方や、E2Eテストの方法が広がると思いませんか？

以降の内容では、localstackの立ち上げ → terraform plan/apply実行 までを説明します。


# Localstackに向けて、Terraformを打つ
以下の流れで説明します。

0. 今回のディレクトリ構造
1. docker-composeでlocalstack立ち上げ
2. terraformファイルを編集
3. localstackにterraform plan/apply

また、作業では `docker-compose` と `terraform` と `awscli` を利用しますが、これらのコマンドは各自で用意済みの前提とします。

ローカル完結の作業であるため、各コマンドの実行環境が揃っていれば、**AWSアカウントの準備はもちろん不要**です。


参考までに、私が本ブログの執筆時に利用したバージョンはこちらです。

```bash
$ docker-compose --version
docker-compose version 1.27.4, build 40524192

$ terraform --version
Terraform v0.13.5

$ aws --version
aws-cli/1.18.166 Python/3.7.4 Darwin/19.6.0 botocore/1.19.6

$ sw_vers -productName
ProductName:	Mac OS X
```

## 1. 今回のディレクトリ構造

本記事は以下のディレクトリ構成での作業とします。

```bash
sandbox/
  ├ docker-compose.yml
  ├ main.tf
  ├ resources.tf
  ├ hello.go
  └ lambda.zip
```

各ファイルは `$ touch <filename>` などを利用して生成してください、Lambdaの中身にまでは踏み込まないので、lambda.zip は 以下の hello.go を build & zip化して生成お願いします

```go hello.go
package main

import (
    "fmt"
)

func main() {
    fmt.Println("hello, world")
}
```

build, zipコマンド

```bash
$ GOOS=linux GOARCH=amd64 go build -o hello
$ zip lambda.zip hello
```

以上で、作業前の準備は完了です。

## 2. docker-composeでLocalstack立ち上げ

docker-compose.ymlを編集して、Localstackの定義を追加します。

Localstackの定義は、本家サイトの記述を参照しています。
https://github.com/localstack/localstack/blob/master/docker-compose.yml

```yaml docker-compose.yml
version: '2.1'

services:
  localstack:
    container_name: "${LOCALSTACK_DOCKER_NAME-localstack_main}"
    image: localstack/localstack:0.12.1
    network_mode: bridge
    ports:
      - 127.0.0.1:4566:4566/tcp
    environment:
      - SERVICES=${SERVICES- }
      - DEBUG=${DEBUG- }
      - DATA_DIR=${DATA_DIR- }
      - LAMBDA_EXECUTOR=${LAMBDA_EXECUTOR- }
      - KINESIS_ERROR_PROBABILITY=${KINESIS_ERROR_PROBABILITY- }
      - DOCKER_HOST=unix:///var/run/docker.sock
      - HOST_TMP_FOLDER=${TMPDIR}
    volumes:
      - "${TMPDIR:-/tmp/localstack}:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

yamlファイルに追記完了したら、localstackを立ち上げます。
`$ docker-compose ps` で起動が確認できたら、localstack側の準備は完了です。

```bash
$ docker-compose -f docker-compose.yml up -d localstack
Creating localstack_main ... done

$ docker-compose ps
     Name               Command          State                                                        Ports
----------------------------------------------------------------------------------------------------------------------------------------------------------------
localstack_main   docker-entrypoint.sh   Up      127.0.0.1:4566->4566/tcp, 4567/tcp, 4568/tcp, 4569/tcp, 4570/tcp, 4571/tcp, 4572/tcp, 4573/tcp, 4574/tcp,
                                                 4575/tcp, 4576/tcp, 4577/tcp, 4578/tcp, 4579/tcp, 4580/tcp, 4581/tcp, 4582/tcp, 4583/tcp, 4584/tcp, 4585/tcp,
                                                 4586/tcp, 4587/tcp, 4588/tcp, 4589/tcp, 4590/tcp, 4591/tcp, 4592/tcp, 4593/tcp, 4594/tcp, 4595/tcp, 4596/tcp,
                                                 4597/tcp, 8080/tcp
```

## 3. Terraformファイルを編集
Terraform定義に、Localstackへplan,applyを打ち込むための設定を記入します。

```sh terraform main.tf
# backend
terraform {
  backend "local" {}
}

# provider
provider "aws" {
  region = "us-east-1"

  access_key = "mock_access_key"
  secret_key = "mock_secret_key"

  s3_force_path_style         = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    iam      = "http://localhost:4566"
    kinesis  = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    s3       = "http://localhost:4566"
  }
}
```

providerは `aws` ですが、以下4つの引数をtrueに設定することで、terraformの向き先をローカル環境のMockに設定できます。

- s3_force_path_style
- skip_credentials_validation
- skip_metadata_api_check
- skip_requesting_account_id

また、ローカル完結作業のため、以下の引数は自由な値を入力して問題ありません。

- region（実在するregionに限る）
- access_key
- secret_key


### endpointsについて

providerがawsの場合、各awsサービスのendpointsをカスタマイズ可能です。endpointsの向き先を調整することにより、ローカル完結のterraform環境が実現可能という訳です。

localstackは [2020-09-15リリース](https://github.com/localstack/localstack#announcements) から
> all services are now exposed via the edge service (port 4566) only

なので、endpointsのURLは全て `http://localhost:4566` になります。

各自でカスタマイズする場合は、terraform で apply 予定のリソース全てをendpoints定義に追加してください。利用可能なサービス一覧は、[こちら](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/custom-service-endpoints#available-endpoint-customizations) に掲載されています。


### 本記事でLocalstackに構築するもの

backendとproviderの定義は完了したので、次は各種リソースを追加しましょう。本記事では、サーバレス構成でよくある「Kinesisでデータを受けて、Lambdaで取得し、S3に永続化」のインフラ環境を、Terraformを使ってLocalstack内に構築します。

<img src="/images/20201113/Screen_Shot_2020-10-29_at_15.12.54.png" loading="lazy">

上記構成をterraform定義するのに必要なresourceはこちらです

- aws_kinesis_stream
- aws_lambda_event_source_mapping
- aws_lambda_function
- aws_iam_role
- aws_iam_policy
- aws_iam_role_policy_attachment
- aws_s3_bucket

Terraform自体の説明は本記事の目的ではないので、一気に追加します

```sh terraform resources.tf
resource "aws_kinesis_stream" "local_stream" {
  name             = "local-stream"
  shard_count      = 1
  retention_period = 168
}

resource "aws_lambda_event_source_mapping" "local_mapping" {
  event_source_arn                   = aws_kinesis_stream.local_stream.arn
  function_name                      = aws_lambda_function.local_lambda.arn
  starting_position                  = "LATEST"
  maximum_retry_attempts             = 1
  batch_size                         = 100
  maximum_batching_window_in_seconds = 5
}

resource "aws_lambda_function" "local_lambda" {
  filename      = "lambda.zip"
  function_name = "local-lambda"
  role          = aws_iam_role.local_role.arn
  handler       = "lambda"
  runtime       = "go1.x"
}

resource "aws_iam_role" "local_role" {
  name               = "local-role"
  assume_role_policy = <<EOF
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Action": "sts:AssumeRole",
			"Principal": {
				"Service": "lambda.amazonaws.com"
			},
			"Effect": "Allow",
			"Sid": ""
		}
	]
}
EOF
}

resource "aws_iam_policy" "local_policy" {
  name   = "local-iam-policy"
  policy = data.aws_iam_policy_document.local_policy_document.json
}

data "aws_iam_policy_document" "local_policy_document" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutBucketNotification",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["*"]
  }
  statement {
    effect = "Allow"
    actions = [
      "kinesis:DescribeStream",
      "kinesis:GetShardIterator",
      "kinesis:GetRecords"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy_attachment" "local_poilcy_attachment" {
  role       = aws_iam_role.local_role.name
  policy_arn = aws_iam_policy.local_policy.arn
}

resource "aws_s3_bucket" "local_archive" {
  bucket = "local-archive"
  versioning {
    enabled = true
  }
}
```

以上により、plan/apply の準備は完了です

## 3. Localstackにterraform plan/apply

### まずは terraform init から
新しいディレクトリでterraformを使う場合は、まずは `$ terraform init` して、backend と provider を設定します

```bash
$ terraform init

Initializing the backend...

Successfully configured the backend "local"! Terraform will automatically
use this backend unless the backend configuration changes.

Initializing provider plugins...
(略)

Terraform has been successfully initialized!
(略)
```

terraform init が完了しました。

## Localstackに向けて、terraform plan を実行
Terraformの実行準備が完了したので、`$ terraform plan` を実行します。

```bash
$ terraform plan
Refreshing Terraform state in-memory prior to plan...
The refreshed state will be used to calculate this plan, but will not be
persisted to local or remote state storage.

data.aws_iam_policy_document.local_policy_document: Refreshing state...

------------------------------------------------------------------------

An execution plan has been generated and is shown below.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

(略)

Plan: 7 to add, 0 to change, 0 to destroy.

------------------------------------------------------------------------

Note: You didn't specify an "-out" parameter to save this plan, so Terraform
can't guarantee that exactly these actions will be performed if
"terraform apply" is subsequently run.


```

planも正しく実行できました。

## Localstackに向けて、terraform apply を実行

`$ terraform apply`
（なるべく短いログでapply状況を載せたかったので、--auto-approve を利用しています）

```bash
$ terraform apply --auto-approve
data.aws_iam_policy_document.local_policy_document: Refreshing state...
aws_iam_policy.local_policy: Creating...
aws_kinesis_stream.local_stream: Creating...
aws_iam_role.local_role: Creating...
aws_s3_bucket.local_archive: Creating...
aws_iam_role.local_role: Creation complete after 0s [id=local-role]
aws_lambda_function.local_lambda: Creating...
aws_iam_policy.local_policy: Creation complete after 0s [id=arn:aws:iam::000000000000:policy/local-iam-policy]
aws_iam_role_policy_attachment.local_poilcy_attachment: Creating...
aws_iam_role_policy_attachment.local_poilcy_attachment: Creation complete after 0s [id=local-role-20201029145646394900000001]
aws_s3_bucket.local_archive: Creation complete after 1s [id=local-archive]
aws_lambda_function.local_lambda: Creation complete after 6s [id=local-lambda]
aws_kinesis_stream.local_stream: Still creating... [10s elapsed]
aws_kinesis_stream.local_stream: Still creating... [20s elapsed]
aws_kinesis_stream.local_stream: Still creating... [30s elapsed]
aws_kinesis_stream.local_stream: Creation complete after 30s [id=arn:aws:kinesis:us-east-1:000000000000:stream/local-stream]
aws_lambda_event_source_mapping.local_mapping: Creating...
aws_lambda_event_source_mapping.local_mapping: Creation complete after 0s [id=7029d656-c97d-4256-90bf-a3eb38c50e93]

Apply complete! Resources: 7 added, 0 changed, 0 destroyed.

The state of your infrastructure has been saved to the path
below. This state is required to modify and destroy your
infrastructure, so keep it safe. To inspect the complete state
use the `terraform show` command.

State path: terraform.tfstate
```

> Apply complete! Resources: 7 added, 0 changed, 0 destroyed.

apply成功です！

awscliを用いて、各リソースの追加を確認することもできます。

```bash
# S3
$ aws --endpoint-url http://localhost:4566 s3 ls
2020-10-29 14:51:17 local-archive

# Kinesis
$ aws --endpoint-url http://localhost:4566 kinesis list-streams
{
    "StreamNames": [
        "local-stream"
    ]
}

# Lambda
$ aws --endpoint-url http://localhost:4566 lambda list-functions
{
    "Functions": [
        {
            "FunctionName": "local-lambda",
            "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:local-lambda",
            "Runtime": "go1.x",
            "Role": "arn:aws:iam::000000000000:role/local-role",
            "Handler": "lambda",
            "CodeSize": 1035298,
            "Description": "",
            "Timeout": 3,
            "MemorySize": 128,
            "LastModified": "2020-10-29T14:56:46.405+0000",
            "CodeSha256": "0rECD6MUpCBF7jIrzT53RTSjH0D1iTBTUd6t+FfP7is=",
            "Version": "$LATEST",
            "VpcConfig": {},
            "TracingConfig": {
                "Mode": "PassThrough"
            },
            "RevisionId": "3fc0da3d-eb5e-471a-9d26-c0a7b3f98d90",
            "State": "Active",
            "LastUpdateStatus": "Successful"
        }
    ]
}
```

これで、ローカルに閉じた環境で、Terraformを好き放題使えますね！

## まとめ

本記事では、Localstackに向けてTerraformを実行する方法をご紹介しました。

この手法は何より **AWSアカウントなしで実行可能** なので、例えば...

- インフラ新規参入者向けのterraformコマンド練習環境として
- 社内規約でcredentialが発行できず、インフラタスクを振れないアルバイトさん向けの環境として
- 他人と絶対にconflictせず、好き勝手にdestroyできる自分だけの**無料の環境**として

も利用可能です。

ここまで読んでいただいた皆様も、色々なリソースをterraformコマンドでLocalstackに構築してみてください！


## 参照サイト
- [Terraform Registory Custom Service Endpoint Configuration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/custom-service-endpoints#available-endpoint-customizations)
- [Testing Infrastructure as Code on Localhost](https://www.hashicorp.com/resources/testing-infrastructure-as-code-on-localhost)
- [LocalStack + Terraform + CircleCI for Lambda without AWS](https://spin.atomicobject.com/2020/02/03/localstack-terraform-circleci/)

