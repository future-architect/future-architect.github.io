---
title: "Terraform で AWS SAM CLI を利用して、ローカルで Lambda のテストとデプロイを試してみた"
date: 2026/05/27 00:00:00
postid: a
tag:
  - Terraform
  - AWS
  - Lambda
  - SAM
  - テスト
category:
  - Infrastructure
thumbnail: /images/2026/20260527a/thumbnail.jpg
author: 香村真紀
lede: "AWS SAM CLI は Docker を使って Lambda 実行環境をローカルに再現するため、AWS へデプロイせずに関数の動作確認ができます。Terraform 構成のまま使える点が便利だったので、ローカルテストとデプロイの方法を紹介します。"
---

<img src="/images/2026/20260527a/top.jpg" alt="" width="800" height="446">

# はじめに

こんにちは、香村真紀です。本記事は [Terraform連載 2026](/articles/20260518a/) の掲載記事です。

AWS SAM CLI は Docker を使って Lambda 実行環境をローカルに再現するため、AWS へデプロイせずに関数の動作確認ができます。Terraform 構成のまま使える点が便利だったので、ローカルテストとデプロイの方法を紹介します。

# 前提条件

- AWS CLI v2.34.41
- Terraform v1.14.3
- Go v1.25.3
- Docker v29.1.3（`sam local` の実行に必要）
- AWS SAM CLI v1.161.0

# SAM でできること

[AWS 公式ドキュメント](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/what-is-sam-overview.html#what-is-sam-cli)

> AWS SAM CLI とは AWS CloudFormation テンプレートで使用する場合に最適です。Terraform などのサードパーティー製品とも連携します。
>
> - 新しいアプリケーションプロジェクトを迅速に初期化します
> - デプロイ用にアプリケーションを構築します
> - ローカルでのデバッグとテストを実行します
> - アプリケーションをデプロイします
> - CI/CD デプロイパイプラインを設定します
> - クラウド内のアプリケーションをモニタリングおよびトラブルシューティングします
> - 開発中にローカルの変更をクラウドに同期します

※ この記事では「ローカルでのデバッグとテスト」と「デプロイ」を中心に紹介します。

# AWS SAM CLI で Lambda 関数のプロジェクトを自動生成

AWS SAM（Serverless Application Model）を使って、Lambda 関数のサンプルプロジェクトを自動生成しました。

- テンプレート: Hello World（最もシンプルなもの）
- 言語: Go / provided.al2023

```sh
# AWS SAM CLI をインストール
brew install aws-sam-cli　

# 1. プロジェクト生成
sam init
# 2. ビルド
sam build
# 3. ローカルテスト
sam local invoke
# 4. AWS にデプロイ
sam deploy
```

```sh　生成されたファイル
➜  sam-app tree
.
├── Makefile
├── README.md
├── events
│   └── event.json
├── hello-world
│   ├── go.mod
│   ├── go.sum
│   ├── main.go
│   └── main_test.go
├── samconfig.toml
└── template.yaml
```

**各コマンドの解説**

1. `sam build`
Go バイナリをクロスコンパイルして、成果物を `.aws-sam/build/` に格納します。
2. `sam local invoke HelloWorldFunction`
Docker を使って自分の Mac 上に Lambda の実行環境を再現し、実際に関数を動かして確認します。

```json
{"statusCode": 200, "body": "{\"message\": \"hello world\"}"}
```

3. `sam deploy --guided`
実際の AWS 環境に以下のリソースを作成します。

| サービス | リソース名 | 役割 |
| --- | --- | --- |
| AWS Lambda | hello-world 関数 | 処理を担当 |
| API Gateway | ServerlessRestApi | HTTP エンドポイントを提供。外部からのリクエストを Lambda に渡す |
| IAM Role | sam-app-HelloWorldFunctionRole-... | Lambda が AWS サービスを使う際の権限設定 |
| S3 | aws-sam-cli-managed-default-... | デプロイ用のコードを一時的に保管するバケット |
| CloudFormation | スタック名: sam-app | 上記すべてのリソースをまとめて管理する仕組み |

```txt 作成された API エンドポイント（サンプル）
https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/Prod/hello/
```

## AWS リソースを削除する場合

```sh
cd sam-app
sam delete
```

| 削除されるもの | リソース名 |
| --- | --- |
| Lambda 関数 | sam-app-HelloWorldFunction-... |
| API Gateway | ServerlessRestApi |
| IAM Role | sam-app-HelloWorldFunctionRole-... |
| CloudFormation スタック | sam-app |

注意：S3 バケット（aws-sam-cli-managed-default-...）は削除するか確認されます。

# Terraform + SAM CLI 構成で作り直す

[AWS 公式ドキュメント](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/terraform-support.html)

## SAM 単体との構成比較

| ファイル / ディレクトリ | SAM 単体 | Terraform + SAM CLI |
| --- | --- | --- |
| `template.yaml` | ✅ 必要（手書き） | ❌ 不要（Terraform の `.tf` ファイルが代わり） |
| `samconfig.toml` | ✅ 必要 | ❌ 不要（`sam deploy` を使わないため） |

## 初期構成の方針

`sam init` は SAM 単体（`template.yaml` ベース）のプロジェクトを生成するためのコマンドなので、今回の構成では使いません。

**作るもの**:

- Lambda 関数（Go / provided.al2023）
- IAM ロール

**ローカルテスト（SAM CLI）**:

- `sam local invoke --hook-name terraform` で Lambda を直接呼ぶ

## Step 1：構成を考える

```sh
sam-tf-app/
├── functions/
│   └── hello/
│       ├── main.go
│       └── go.mod
├── events/
│   └── event.json
└── terraform/
    ├── provider.tf
    ├── main.tf
    └── iam.tf
```

## Step 2：Lambda のコードを書く

```sh
cd functions/hello
go mod init hello
go get github.com/aws/aws-lambda-go/lambda
```

```go
// main.go（初期版）
package main

import (
    "context"
    "github.com/aws/aws-lambda-go/lambda"
)

type Response struct {
    StatusCode int    `json:"statusCode"`
    Body       string `json:"body"`
}

func handler(ctx context.Context) (Response, error) {
    return Response{StatusCode: 200, Body: `{"message": "hello world"}`}, nil
}

func main() {
    lambda.Start(handler)
}
```

## Step 3：Terraform ファイルを書く

`provider.tf`（リージョン・プロバイダー設定）と `iam.tf`（Lambda 実行ロール）はこの記事では省略します。

ポイントになるのは `main.tf` です。

```hcl main.tf
locals {
  project_root    = abspath("${path.module}/..")
  lambda_src_path = "${local.project_root}/functions/hello"
  build_output    = "${local.project_root}/.build"
}

# ① Go のビルド（GOOS=linux が必須）
resource "null_resource" "build_hello" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      mkdir -p ${local.build_output}
      cd ${local.lambda_src_path} && \
      GOOS=linux GOARCH=amd64 go build -o ${local.build_output}/bootstrap .
      chmod +x ${local.build_output}/bootstrap
    EOT
  }
}

# ② デプロイ用に zip 化
data "archive_file" "hello" {
  type        = "zip"
  source_file = "${local.build_output}/bootstrap"
  output_path = "${local.build_output}/hello.zip"
  depends_on  = [null_resource.build_hello]
}

# ③ SAM CLI への案内板（これがないと sam local invoke が動かない）
resource "null_resource" "sam_metadata_aws_lambda_function_hello" {
  triggers = {
    resource_name        = "aws_lambda_function.hello"
    resource_type        = "ZIP_LAMBDA_FUNCTION"
    original_source_code = local.lambda_src_path
    built_output_path    = local.build_output
  }
  depends_on = [null_resource.build_hello]
}

# ④ Lambda 関数本体
resource "aws_lambda_function" "hello" {
  filename         = data.archive_file.hello.output_path
  function_name    = "hello-function"
  handler          = "bootstrap"
  runtime          = "provided.al2023"
  role             = aws_iam_role.lambda.arn
  source_code_hash = data.archive_file.hello.output_base64sha256
  depends_on       = [null_resource.build_hello]
}
```

③ の `null_resource.sam_metadata_aws_lambda_function_hello` が SAM CLI に Lambda の場所を伝える案内板です。これがないと `sam build --hook-name terraform` が Lambda を認識できません。

## Step 4：コマンドを実行

コマンドを実行する前に、`sam build --hook-name terraform` が何をしているかを理解しておくと動作のイメージがつかみやすくなります。

1. **Terraform でインフラを解析**
`terraform plan` を実行して Lambda 関数の情報（ソースの場所・ランタイム・アーキテクチャ等）を JSON として取得する
2. **SAM 用の内部テンプレートを生成**
JSON から `template.json` を作成し、SAM CLI が Lambda を認識できる形に変換する（`template.yaml` の代わり）
3. **Go バイナリをビルド**
   `GOOS=linux GOARCH=amd64 go build` で Lambda 実行環境（Linux/x86_64）向けにクロスコンパイルする
4. **バイナリを SAM のビルドディレクトリにコピー**
`.aws-sam/build/` に配置することで `sam local invoke` が使える状態にする

```sh
# 生成されるファイル
terraform/
├── .aws-sam-iacs/           # SAM CLI の中間ファイル（通常は触らない）
│   └── iacs_metadata/
│       ├── template.json    # Terraform から生成された内部テンプレート
│       └── Makefile
└── .aws-sam/
    └── build/
        ├── template.yaml                  # SAM CLI が読む内部テンプレート（自動生成）
        └── AwsLambdaFunctionHello.../
            └── bootstrap                  # クロスコンパイル済みバイナリ
```

SAM 単体の `sam build` との違いは以下の通りです。

| 比較項目 | SAM 単体の `sam build` | Terraform + `sam build --hook-name terraform` |
| --- | --- | --- |
| インフラ定義の読み込み元 | `template.yaml` | `main.tf` |
| 内部テンプレートの生成 | 不要（`template.yaml` がそのまま使われる） | ✅ 自動生成（`.aws-sam-iacs/iacs_metadata/template.json`） |
| ビルドコマンド | SAM が自動で実行 | `null_resource` の `provisioner "local-exec"` 経由で実行 |
| `sam_metadata` | 不要 | ✅ 必須（Lambda の場所を SAM CLI に伝える案内板） |
| `template.yaml` | ✅ 手書きが必要 | ❌ 不要 |
| ビルド成果物の格納先 | `.aws-sam/build/` | `.aws-sam/build/`（同じ） |
| ローカル実行コマンド | `sam local invoke 関数名` | `sam local invoke --hook-name terraform リソース名` |

### 実際のコマンド

```sh
# Go の依存解決（functions/hello/ で実行）
go mod tidy

# Terraform の初期化（terraform/ で実行）
terraform init

# ビルド（terraform/ で実行）
sam build --hook-name terraform --terraform-project-root-path ..

# ローカルテスト（terraform/ で実行）
sam local invoke --hook-name terraform aws_lambda_function.hello -e ../events/event.json

# AWS にデプロイ（terraform/ で実行）
terraform apply
```

### ローカルテストの実行例

`events/event.json`（`sam local invoke` に渡すイベント）：

```json
{
  "httpMethod": "GET",
  "path": "/hello",
  "queryStringParameters": null,
  "headers": {
    "Accept": "application/json",
    "Content-Type": "application/json"
  },
  "pathParameters": null,
  "requestContext": {
    "resourcePath": "/hello",
    "httpMethod": "GET",
    "stage": "stg"
  },
  "body": null,
  "isBase64Encoded": false
}
```

```sh
# terraform/ で実行
sam local invoke --hook-name terraform aws_lambda_function.hello -e ../events/event.json
```

```json
{"statusCode":200,"body":"{\"message\": \"hello world\"}"}
```

# API Gateway を追加する

## ファイル構成の更新

```sh
sam-tf-app/
├── functions/
│   └── hello/
│       ├── main.go        # API Gateway 対応に変更
│       └── go.mod
├── events/
│   └── event.json
└── terraform/
    ├── provider.tf
    ├── main.tf
    ├── iam.tf
    └── api_gateway.tf     # 追加
```

## main.go を API Gateway 対応に変更

API Gateway のリクエスト/レスポンス型を使うよう更新します。

```sh
go get github.com/aws/aws-lambda-go/events
```

```go
// main.go（API Gateway 対応版）
package main

import (
    "context"
    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Body:       `{"message": "hello world"}`,
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

## api_gateway.tf を作成

SAM 単体では `template.yaml` の `Events:` 数行で済む部分を、Terraform では明示的に書く必要があります。
全コードはこの記事では省略します。

主なリソースは以下の通りです。

| リソース | 役割 |
| --- | --- |
| `aws_api_gateway_rest_api` | API 本体 |
| `aws_api_gateway_resource` | `/hello` パスの定義 |
| `aws_api_gateway_method` | GET メソッドの定義 |
| `aws_api_gateway_integration` | Lambda との接続（AWS_PROXY 方式） |
| `aws_api_gateway_deployment` | API のデプロイ |
| `aws_api_gateway_stage` | ステージ（stg）の設定 |
| `aws_lambda_permission` | API Gateway が Lambda を呼ぶ権限 |

特に重要なのは `aws_lambda_permission` です。これがないと API Gateway から Lambda を呼び出せません。

```hcl
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.hello.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.hello.execution_arn}/*/*"
}
```

## ビルドとデプロイ

```sh
# terraform/ で実行
sam build --hook-name terraform --terraform-project-root-path ..
terraform apply

# エンドポイント確認
terraform output api_endpoint
# "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/stg/hello"

curl $(terraform output -raw api_endpoint)
# {"message": "hello world"}
```

## API Gateway のローカルテスト

`sam local start-api` を使うと、ローカルで API Gateway + Lambda の動作を確認できます。

```sh
# terraform/ で実行（Ctrl+C で停止）
sam local start-api --hook-name terraform
```

```sh
# 別ターミナルで
curl http://127.0.0.1:3000/hello
# {"message": "hello world"}
```

`sam local invoke` との違いは、`start-api` はサーバーを起動したままにするため、ブラウザや curl で何度でもリクエストを送れる点です。

## AWS リソースを削除する場合

```sh
# terraform/ で実行
terraform destroy
```

# さいごに

Terraform + AWS SAM CLI を使うことで、AWS へデプロイせずに Lambda の動作確認ができました。

コードを他のコードと同じリポジトリで一元管理できるようになり、EOL や脆弱性管理のフローにも乗せやすくなります。
Terraform で Lambda を管理している方の参考になれば幸いです。

## 参考リンク

- [AWS SAM CLI とは（公式）](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/what-is-sam-overview.html)
- [AWS SAM CLI Terraform サポート（公式）](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/terraform-support.html)
- [Terraform と連携させた AWS SAM CLI をローカルでのデバッグおよびテストに使用する方法（公式）](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/using-samcli-terraform.html)
