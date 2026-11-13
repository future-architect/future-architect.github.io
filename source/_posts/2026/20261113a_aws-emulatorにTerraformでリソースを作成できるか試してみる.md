---
title: "aws-emulatorにTerraformでリソースを作成できるか試してみる"
date: 2026/11/13 00:00:00
postid: a
tags:
  - AWS
  - AWSEmulator
  - Terraform
  - Lambda
  - GitHubActions
categories:
  - IaC
thumbnail: /images/2026/20261113a/thumbnail.png
author: 伊藤太斉
lede: "AWSから発表された aws-emulator に向けて、Terraform でVPCやLambdaを作成できるか、GitHub Actions のCIに組み込めるかを試しました。"
---
<img src="/images/2026/20261113a/top.png" alt="" width="1200" height="900">

*（https://aws.amazon.com/jp/products/developer-tools/emulator/ より引用）*

こんにちは。TIGの伊藤です。2026/11/11、AWSから`aws-emulator`というツールが発表されました。

https://aws.amazon.com/jp/products/developer-tools/emulator/

これまで、私はLocalStackを利用して、ローカルでTerraformを実行できる環境を作ったこともありますが、公式からエミュレーターが出るとなれば、過去LocalStackに向けて実行していたことが同様にできるのか気になり、今回試してみようと思いました。

## 検証環境

今回は私のローカルPC（Macbook M2 Air）とコンテナ環境はRancher Desktopで検証します。また、Terraformのバージョンについてはv1.17.2を利用します。バージョン管理自体はtfenvを利用しています。

## 初期設定

### エミュレーターのビルド

公式のドキュメントにはいくつかエミュレーターを利用する方式がありますが、片付けも楽ということで今回はDockerで環境を作っていきます。

参考）[Getting started with Docker](https://docs.aws.amazon.com/emulator/latest/userguide/getting-started-docker.html)

```dockerfile
FROM public.ecr.aws/amazonlinux/amazonlinux:2023-minimal
ADD https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/latest/aws-emulator-aarch64.rpm /tmp/aws-emulator.rpm
RUN rpm -i /tmp/aws-emulator.rpm && rm /tmp/aws-emulator.rpm \
    && mkdir -p /home/emulator && chown 1000 /home/emulator
USER 1000
ENV HOME=/home/emulator
EXPOSE 9297
ENTRYPOINT ["aws-emulator", "-b", "0.0.0.0"]
```

上記の公式のドキュメントをそのまま貼り付けるとx86_64版でインストールして、私が今回使っているApple SiliconのMacだとビルドに失敗するので、事前に当該箇所を`aarch64`に書き換えておきましょう。ビルドは以下のコマンドで実行できます。

```bash
docker build -t aws-emulator .
```

### 環境変数の設定

ビルドを終えたら、次はコマンドを実行する側の環境の設定です。[Pointing your AWS SDK at AWS Emulator](https://docs.aws.amazon.com/emulator/latest/userguide/point-sdk-to-emulator.html)に記載されているので、今回はMacなので、以下のコマンドを実行します。何回か流すことを想定して、`env`ファイルにまとめて実行しています。

```bash
export AWS_ENDPOINT_URL=https://127.0.0.1:9297
export AWS_SHARED_CREDENTIALS_FILE=~/.aws/emulator/9297/emulator_credentials
export AWS_CONFIG_FILE=~/.aws/emulator/9297/config
export AWS_CA_BUNDLE=~/.aws/emulator/9297/ca.pem
export AWS_EC2_METADATA_DISABLED=true
export AWS_DISABLE_HOST_PREFIX_INJECTION=true
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
```

環境変数の設定まで終えたら、以下のコマンドを実行して、エミュレーターの起動を確認しましょう。

```bash
curl --cacert ~/.aws/emulator/9297/ca.pem https://127.0.0.1:9297/__admin/health
```

`ok`と返ってきたら問題なく動いていることがわかります。念の為、`aws`コマンドも通るかSecurity Token Serviceのコマンドを利用してエミュレーターに向いているか確認しましょう。

```bash
aws sts get-caller-identity
```

以下のようにエミュレーターに向いていることが確認できました。

```json
{
    "UserId": "AIDAH5I7GEMO7ADXNFAZU",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:user/emulator"
}
```

次は実際にTerraformが動作することを確認しましょう。

## Terraformを使って操作する

### リソースが作成できるか

さて、CLIベースでの操作が通ることを確認できたので、Terraformで操作できるか確認してみましょう。今回、先述した環境変数の設定が効いている前提で進めるので、`provider`ブロックのみシンプルに記述します。

```tf
provider "aws" {}
```

もし明示的にTerraformのソースとして環境変数の内容を記述する場合は[AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)に記載のパラメーターやエンドポイントの指定（[`endpoints`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/custom-service-endpoints)ブロックの使用）もできます。

ここまで来て、`terraform init`コマンドを打ち、その後実際にソースを書きましょう。今は試しにVPCリソースを作ってみます。公式ドキュメントの[`aws_vpc`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc)を拝借します。

```tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

ここで、`terraform plan`コマンドを実行しようとしたところ、以下のようなエラーになりました。

```console
Planning failed. Terraform encountered an error while generating this plan.

╷
│ Error: open ~/.aws/emulator/9297/ca.pem: no such file or directory
│
│   with provider["registry.terraform.io/hashicorp/aws"],
│   on provider.tf line 1, in provider "aws":
│    1: provider "aws" {}
│
╵
```

これは私の環境がfishを使っていて、環境変数の`~/`が読み替えられていないことに起因していたので、環境変数で該当する箇所を`$HOME`に変更して回避をしました。このエラーを回避した後、改めて`terraform plan`コマンドを実行し、以下のPlan結果が出力されました。

```console
Terraform will perform the following actions:

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + arn                                  = (known after apply)
      + cidr_block                           = "10.0.0.0/16"
      + default_network_acl_id               = (known after apply)
      + default_route_table_id               = (known after apply)
      + default_security_group_id            = (known after apply)
      + dhcp_options_id                      = (known after apply)
      + enable_dns_hostnames                 = (known after apply)
      + enable_dns_support                   = true
      + enable_network_address_usage_metrics = (known after apply)
      + id                                   = (known after apply)
      + instance_tenancy                     = "default"
      + ipv6_association_id                  = (known after apply)
      + ipv6_cidr_block                      = (known after apply)
      + ipv6_cidr_block_network_border_group = (known after apply)
      + main_route_table_id                  = (known after apply)
      + owner_id                             = (known after apply)
      + region                               = "us-east-1"
      + tags_all                             = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

この後`terraform apply`コマンドを実行して、成功するところまで確認できました。

### Lambdaの作成と実行

ここでは、Lambdaの作成と実行まで通しでやってみます。今回利用したTerraformとPythonのソースコードは以下です。

```tf
data "archive_file" "python_function" {
  type        = "zip"
  source_file = "${path.module}/src/hello.py"
  output_path = "${path.module}/build/hello.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "hello-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "python_function" {
  function_name    = "hello"
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.13"
  handler          = "hello.handler"
  filename         = data.archive_file.python_function.output_path
  source_code_hash = data.archive_file.python_function.output_base64sha256
  timeout          = 10
}
```

```python hello.py
import json


def handler(event, context):
    name = event.get("name", "World")
    print(f"received event: {json.dumps(event)}")

    return {
        "statusCode": 200,
        "body": json.dumps({"message": f"Hello, {name}!", "input": event}),
    }
```

こちらも`terraform apply`コマンドを実行し、リソース作成できました。Lambdaについては、以下のコマンドを実行し、ステータスコードが200になることを確認できました。

```bash
aws lambda invoke --function-name hello --cli-binary-format raw-in-base64-out --payload '{"name":"Emulator"}' /dev/stdout
```

レスポンス

```json
{"statusCode": 200, "body": "{\"message\": \"Hello, Emulator!\", \"input\": {\"name\": \"Emulator\"}}"}
    "StatusCode": 200,
    "ExecutedVersion": "$LATEST"
}
```

簡易にリソースを作成するくらいであれば何ら問題なくTerraformを経由してリソースを作成できるようです。

## CIに組み込む

エミュレーターの説明にはAWSアカウントなしでCIを実行できること、というのがあり、Terraformで実際に適用先の環境をエミュレーターに向けてみようと思います。実際に動作の確認がYAMLは以下です。（長いので折りたたんでいます。）

<details><summary>実際のYAML</summary>

```yaml
name: terraform

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TF_IN_AUTOMATION: "true"
  TF_INPUT: "false"

jobs:
  terraform:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v5

      - name: Build aws-emulator image
        run: docker build -t aws-emulator .

      - name: Start aws-emulator
        run: |
          mkdir -p "$HOME/.aws/emulator"
          docker run -d --name aws-emulator \
            --user "$(id -u):$(id -g)" \
            -e HOME="$HOME" \
            -e EMULATOR_TELEMETRY=off \
            -v "$HOME/.aws/emulator:$HOME/.aws/emulator" \
            -p 127.0.0.1:9297:9297 \
            aws-emulator

          dir="$HOME/.aws/emulator/9297"
          for _ in $(seq 1 60); do
            if [ -f "$dir/ca.pem" ] && curl -sf --cacert "$dir/ca.pem" https://127.0.0.1:9297/__admin/health; then
              echo " -> emulator is healthy"
              break
            fi
            sleep 1
          done
          curl -sf --cacert "$dir/ca.pem" https://127.0.0.1:9297/__admin/health >/dev/null

          {
            echo "AWS_ENDPOINT_URL=https://127.0.0.1:9297"
            echo "AWS_SHARED_CREDENTIALS_FILE=$dir/emulator_credentials"
            echo "AWS_CONFIG_FILE=$dir/config"
            echo "AWS_CA_BUNDLE=$dir/ca.pem"
            echo "AWS_EC2_METADATA_DISABLED=true"
            echo "AWS_DISABLE_HOST_PREFIX_INJECTION=true"
            echo "AWS_REGION=us-east-1"
            echo "AWS_DEFAULT_REGION=us-east-1"
          } >> "$GITHUB_ENV"

      - name: Read Terraform version
        id: tfversion
        run: echo "version=$(cat .terraform-version)" >> "$GITHUB_OUTPUT"

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ steps.tfversion.outputs.version }}
          terraform_wrapper: false

      - name: terraform fmt
        run: terraform fmt -check -recursive

      - name: terraform init
        run: terraform init

      - name: terraform validate
        run: terraform validate

      - name: terraform plan
        run: |
          terraform plan -out=tfplan
          {
            echo '### terraform plan'
            echo '```'
            terraform show -no-color tfplan
            echo '```'
          } >> "$GITHUB_STEP_SUMMARY"

      - name: terraform apply
        run: terraform apply tfplan

      # A second plan after apply must be empty; exit code 2 means drift.
      - name: terraform plan (idempotency check)
        run: terraform plan -detailed-exitcode

      - name: Show emulator logs
        if: failure()
        run: docker logs aws-emulator
```

</details>

基本的にはローカルでDockerを利用して環境構築をしたこれまでの手順を踏襲して作成しており、`terraform apply`まで進むようになっています。1点、Dockerfileだけ、CPUのアーキテクチャで以下の差分を作っているので、CI用、ローカル動作用と分けることも必要かもしれません。

```diff
- ADD https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/latest/aws-emulator-aarch64.rpm /tmp/aws-emulator.rpm
- RUN rpm -i /tmp/aws-emulator.rpm && rm /tmp/aws-emulator.rpm \
-     && mkdir -p /home/emulator && chown 1000 /home/emulator
+ ARG TARGETARCH
+ RUN case "${TARGETARCH}" in \
+       amd64) arch=x86_64 ;; \
+       arm64) arch=aarch64 ;; \
+       *) echo "unsupported arch: ${TARGETARCH}" >&2; exit 1 ;; \
+     esac \
+   && rpm -i "https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/latest/aws-emulator-${arch}.rpm" \
+   && mkdir -p /home/emulator && chown 1000 /home/emulator
```

## まとめ

AWSに限らず、クラウド系のエミュレーターはこれまでもさまざまなものが出てきていましたが、AWSの公式として出てきたことが大きなポイントでは。公式がホストすることによって、より実際のサービスへの追従も期待できると考えています。今回はTerraformをメインでどこまでできるかをみてみましたが、今度はアプリケーションの視点で実際のサービスを立てて、どこまでエミュレートできるかみてみたいと思います。
