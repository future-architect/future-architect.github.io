---
title: "LambdaとGoを使ったサーバーレスWebAPI開発実践入門"
date: 2020/09/27 00:00:00
postid: ""
tag:
  - Go
  - AWS
  - サーバーレス
  - go-swagger
  - Terraform
  - 入門
category:
  - Programming
thumbnail: /images/20200927/thumbnail.png
author: 辻大志郎
lede: "こんにちは、TIGの辻です。業務アプリケーションのビジネスロジックをサーバーレスで実装することも増えてきました。[AWSサービストリガによるLambda関数起動]の記事にもあるようにAPI GatewayとLambda関数を組み合わせてHTTPサーバを提供することも容易にできます。バックエンドのWebAPIをLambda関数で動かすユースケースがよくあるパターンです。Lambda関数とアプリケーションロジックの実装は密結合になりやすいですが、HTTPサーバで動作するように実装して、Lambda関数として組み込むと、従来のHTTPサーバを実装するノウハウを活かしつつ、サーバレスで動作するバックエンドのWebAPIを構築できます。本記事ではGoを用いてサーバレスなWebAPIサーバをAWS上に1から構築するチュートリアルです。"
---
# はじめに

こんにちは、TIGの辻です。

業務アプリケーションのビジネスロジックをサーバーレスで実装することも増えてきました。[AWSサービストリガによるLambda関数起動](/articles/20200722/)の記事にもあるようにAPI GatewayとLambda関数を組み合わせてHTTPサーバを提供することも容易にできます。バックエンドのWebAPIをLambda関数で動かすユースケースがよくあるパターンです。Lambda関数とアプリケーションロジックの実装は密結合になりやすいですが、HTTPサーバで動作するように実装して、Lambda関数として組み込むと、従来のHTTPサーバを実装するノウハウを活かしつつ、サーバレスで動作するバックエンドのWebAPIを構築できます。

本記事ではGoを用いてサーバレスなWebAPIサーバをAWS上に1から構築するチュートリアルです。

go-swaggerに閉じた入門記事として、以下もおすすめです。

* [go-swaggerでhello world | フューチャー技術ブログ](/articles/20200824/)

# 概要

AWS上に構築するインフラはこんな感じです。シンプル。

<img src="/images/20200927/サーバーレスGo.png" loading="lazy">

最初に本チュートリアルで使用しているバージョンを記載します。以下のとおりです。

- 各種ソフトウェアバージョン

| #   | ソフトウェア/ライブラリ | バージョン |
| --- | ----------------------- | ---------- |
| 1   | AWS CLI                 | 2.0.48     |
| 2   | LocalStack              | 0.11.5     |
| 3   | Terraform               | 0.13.2     |

- Goの主要ライブラリのバージョン

| #   | ソフトウェア/ライブラリ | バージョン |
| --- | ----------------------- | ---------- |
| 1   | go-swagger/go-swagger   | 0.25.0     |
| 2   | guregu/dynamo           | 1.19.1     |

- LocalStackの起動

ローカル開発にはDockerを使ってLocalStackを動かしていきます。LocalStackはバージョン `0.11.0` からすべてのサービスに `4566` ポートを使います。`0.10.x` 以下のバージョンと使用するポートが異なるため、古いバージョンを利用している方は注意してください。

```
$ docker run -it -p 4566:4566 -e SERVICES=dynamodb -e DEFAULT_REGION=ap-northeast-1 localstack/localstack:0.11.5
```

- AWS CLIのインストール、設定

また、Lambda関数のデプロイなどに `aws` コマンドを使いますので、[AWS CLI バージョン 2 のインストール](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/install-cliv2.html)を参考にAWS CLIをインストールしましょう。使っているOSのインストール手順に従ってインストールしてください。

以下のように出力されれば成功です。(以下はWindowsの例)

```
$ aws --version
aws-cli/2.0.48 Python/3.7.7 Windows/10 exe/AMD64
```

CLIでAWSのリソースにアクセスできるように設定しておきましょう。デフォルトのプロファイルとして設定しています。必要に応じてプロファイル名を指定することができます。

```
$ aws configure
AWS Access Key ID [None]: access-key-ID
AWS Secret Access Key [None]: secret-access-key
Default region name [None]: ap-notrheast-1
Default output format [None]: json
```

テスト用にダミー用の `local` プロファイルも設定しておきましょう。

```
$ aws configure --profile local
AWS Access Key ID [None]: dummy
AWS Secret Access Key [None]: dummy
Default region name [None]: ap-notrheast-1
Default output format [None]: json
```

# インフラ構築

AWS上に構築するインフラはTerraformで使います。一時的な動作確認で使うリソースの場合GUIでポチポチリソースを作成しても問題ないですが、業務でインフラを構築する場合はAWS CloudFormationやTerraformを使うことが一般的です。GUIでポチポチする際に暗黙的に作成されるリソースもしっかり把握していきましょう。

Terraformに関しては

- [はじめてのTerraform 0.12 ～環境構築～](/articles/20190816/)
- [はじめてのTerraform 0.12 ～実践編～](/articles/20190816/)

の記事もあわせて見てみてください。その他にも技術ブログに[Terraform](/tags/Terraform/)に関する記事がたくさんあります。

またHashiCorp Learnのドキュメントも参考になります。

- [Serverless Applications with AWS Lambda and API Gateway](https://learn.hashicorp.com/tutorials/terraform/lambda-api-gateway)

Terraformは[Install Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli)を参考に2020年9月にリリースしたv0.13.2をインストールしておきます。v0.12.xでも問題ないです。

```
$ terraform -v
Terraform v0.13.2
```

今回はローカルPCから `terraform` コマンドを実行してAWSにリソースを作っていきます。

最終的なファイル構成は以下のようになります。

```
.
├── api_gateway_deployment.tf
├── api_gateway_integration.tf
├── api_gateway_method.tf
├── api_gateway_resource.tf
├── api_gateway_rest_api.tf
├── assume_role
│   └── Lambda.json
├── dummy_function.zip
├── dynamodb_table.tf
├── iam_policy.tf
├── iam_policy_document.tf
├── iam_role.tf
├── iam_role_policy_attachment.tf
├── Lambda_function.tf
├── Lambda_permission.tf
└── provider.tf
```

まずはプロバイダの設定をしておきます。

- provider.tf

```bash
provider "aws" {
  region = "ap-northeast-1"
  alias = "ap-northeast-1"
  version = ">= 3.7.0"
}
```

`provider.tf` を記述したら `terraform init` をしましょう。

```
$ terraform init
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching ">= 3.7.0"...
- Installing hashicorp/aws v3.7.0...
- Installed hashicorp/aws v3.7.0 (signed by HashiCorp)

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

続いてAPI GatewayとLambda関数を実装します。まずはLambda関数とAPI Gatewayで必要なIAMを記述します。API GatewayはLambda関数を呼び出す操作、Lambda関数ではCloudWatch Logsにログを書き込む操作、DynamoDBを操作するIAMを定義します。

- iam_policy_document.tf

```bash
data "aws_iam_policy_document" "example_api_policy" {
  statement {
    effect = "Allow"
    principals {
      type = "*"
      identifiers = [
      "*"]
    }
    actions = [
      "execute-api:Invoke"
    ]
    resources = [
      "arn:aws:execute-api:ap-northeast-1:*:*/*/*"
    ]
  }
}

data "aws_iam_policy_document" "example_lambda" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
    "arn:aws:logs:*:*:*"]
  }
}
```

上記のポリシードキュメントをIAMポリシーとして定義します。

- iam_policy.tf

```bash
resource "aws_iam_policy" "example_lambda" {
  name   = "example-lambda"
  policy = data.aws_iam_policy_document.example_lambda.json
}
```

IAMロールを定義します。

- iam_role.tf

```bash
resource "aws_iam_role" "example_lambda" {
  name               = "example-lambda"
  assume_role_policy = file("assume_role/lambda.json")
}
```

信頼ポリシーは以下のようになります。

- assume_role/lambda.json

```json
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
```

先程記述したIAMロールにIAMポリシーをアタッチします。

- iam_role_policy_attachment.tf

```bash
resource "aws_iam_role_policy_attachment" "example_api" {
  role       = aws_iam_role.example_lambda.name
  policy_arn = aws_iam_policy.example_lambda.arn
}
```

IAMの設定は以上で完了です。

続いてAPI GatewayのRESTのリソースを作っていきましょう。先程作成したIAMポリシードキュメントを使います。

- api_gateway_rest_api.tf

```bash
resource "aws_api_gateway_rest_api" "example_api" {
  name        = "example-api"
  description = "example serverless api"
  policy      = data.aws_iam_policy_document.example_api_policy.json
}
```

- api_gateway_resource.tf

```bash
resource "aws_api_gateway_resource" "example_api" {
  rest_api_id = aws_api_gateway_rest_api.example_api.id
  parent_id   = aws_api_gateway_rest_api.example_api.root_resource_id
  path_part   = "{proxy+}"
}
```

APIリクエストに対する認可はなしにします。必要な場合は `authorization` パラメータを用いて設定します。

- api_gateway_method.tf

```bash
resource "aws_api_gateway_method" "example_api_get" {
  authorization = "NONE"
  http_method   = "GET"
  resource_id   = aws_api_gateway_resource.example_api.id
  rest_api_id   = aws_api_gateway_rest_api.example_api.id
}

resource "aws_api_gateway_method" "example_api_post" {
  authorization = "NONE"
  http_method   = "POST"
  resource_id   = aws_api_gateway_resource.example_api.id
  rest_api_id   = aws_api_gateway_rest_api.example_api.id
}
```

Lambdaプロキシ統合のGETリクエストを実装する場合においても `integration_http_method` パラメータは `POST` と設定する必要があります。

- api_gateway_integration.tf

```bash
resource "aws_api_gateway_integration" "example_api_get" {
  rest_api_id             = aws_api_gateway_rest_api.example_api.id
  resource_id             = aws_api_gateway_method.example_api_get.resource_id
  http_method             = aws_api_gateway_method.example_api_get.http_method
  # "GET"ではなく"POST"にする必要がある
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.example_api.invoke_arn
}

resource "aws_api_gateway_integration" "example_api_post" {
  rest_api_id             = aws_api_gateway_rest_api.example_api.id
  resource_id             = aws_api_gateway_method.example_api_post.resource_id
  http_method             = aws_api_gateway_method.example_api_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.example_api.invoke_arn
}
```

- api_gateway_deployment.tf

```bash
resource "aws_api_gateway_deployment" "example_api" {
  depends_on = [
    aws_api_gateway_integration.example_api_get,
    aws_api_gateway_integration.example_api_post,
  ]
  rest_api_id       = aws_api_gateway_rest_api.example_api.id
  stage_name        = "test"
  stage_description = "test stage"
}
```

GETリクエストやPOSTリクエストを呼び出したときに起動するLambda関数のリソースを定義していないため、上記のtfファイルはエラーになります。Lambda関数のリソースを作ります。

Lambda関数はアプリケーション側からデプロイできるようにTerraform側ではLambda関数の初期構築時のみ使用するダミーのzipファイルを使って構築するのがおすすめです。

Lambdaの `handler` パラメータは、ビルドして生成した実行可能なファイル名と同じである必要があります。

- lambda_function.tf

```bash
resource "aws_lambda_function" "example_api" {
  filename      = "dummy_function.zip"
  function_name = "example-api"
  role          = aws_iam_role.example_lambda.arn
  handler       = "lambda"
  runtime       = "go1.x"

  memory_size = 128
  timeout     = 900
}
```

Lambda関数をAPI Gatewayから呼び出せるように明示的に許可します。

- lambda_permission.tf

```bash
resource "aws_lambda_permission" "example_apigateway_lambda" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.example_api.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.example_api.execution_arn}/*/*/*"
}
```

`dummy_function.zip` はビルド可能な適当な `main.go` を `dummy_function` に格納してzip化しておきます。ファイルが存在しないとエラーになります。

- dummy_function/main.go

```go
package main

import (
	"fmt"
)

func main() {
	fmt.Println("Hello world!")
}
```

API GatewayとLambda関数のリソースを作成する準備が整いました。`terraform plan` `terraform apply` をしてリソースを作成します。

```bash
$ terraform apply
...
(省略)
...
```

# Goのアプリケーション開発

WebAPI開発です。今回はサンプルアプリケーションなのでGETとPOSTだけ対応している以下の2つのパスを用意します。

| メソッド | パス        | 説明                                 |
| -------- | ----------- | ------------------------------------ |
| GET      | `/v1/users` | 登録されているユーザ一覧を返却します |
| POST     | `/v1/users` | ユーザを登録します                   |

それでは `go mod init` として開発を始めていきましょう。

```
$ go mod init example
```

## API定義

GoのWebアプリケーションフレームワークはEchoやGinやchiやgo-swaggerなどいろいろありますが、今回はgo-swaggerを用いることにします。どのWebアプリケーションフレームワークを使うかはGopherの間でも意見が分かれるところなので、使い慣れたWebアプリケーションフレームがあれば、それを使うのもよしです。上記のメソッドとパスをSwaggerで記述していきます。`swagger.yaml` にすると以下のようになります。ちなみにSwaggerの書き方・規約は[スキーマファースト開発のためのOpenAPI（Swagger）設計規約](/articles/20200409/) の記事がオススメです。

<details><summary>swagger.yaml</summary><div>

```yaml
swagger: "2.0"
info:
  version: "1.0.0"
  title: "Example app"
  description: "A Example app for serverless api"
host: "localhost:18888"
basePath: "/v1"
schemes:
  - "http"
consumes:
  - "application/json"
produces:
  - "application/json"
postid: ""
tag:
  - name: user
    description: ユーザAPI
paths:
  /users:
    get:
      summary: ユーザ一覧取得
      operationId: getUsers
      responses:
        '200':
          description: Success
          schema:
            $ref: '#/definitions/users'
        '400':
          description: Bad Request
          schema:
            $ref: '#/definitions/Error'
        '500':
          description: Internal Server Error
          schema:
            $ref: '#/definitions/Error'
    post:
      summary: ユーザ登録
      operationId: postUsers
      parameters:
        - in: body
          name: postUsers
          required: true
          schema:
            $ref: '#/definitions/user'
          description: 登録するユーザ情報
      responses:
        '200':
          description: Success
          schema:
            $ref: '#/definitions/user'
        '400':
          description: Bad Request
          schema:
            $ref: '#/definitions/Error'
        '500':
          description: Internal Server Error
          schema:
            $ref: '#/definitions/Error'
definitions:
  users:
    title: users
    type: array
    description: ユーザ一覧
    items:
      $ref: '#/definitions/user'
  user:
    title: User
    type: object
    description: ユーザ
    properties:
      user_id:
        type: string
        x-omitempty: false
        description: ユーザID
      name:
        type: string
        x-omitempty: false
        description: ユーザ名
    required:
      - user_id
      - name
  Error:
    title: Error
    type: object
    description: エラー
    properties:
      message:
        type: string
        description: エラーメッセージ
```
</div></details>

`go-swagger` は[Installing](https://goswagger.io/install.html)を参考にインストールします。今回は2020/09/23現在の最新バージョンである `0.25.0` をインストールします。以下のように出力されていればOKです。

```bash
$ swagger version
version: v0.25.0
commit: f032690aab0634d97e2861a708d8fd9365ba77d2
```

## データストア

ユーザの情報を格納するDynamoDBのテーブル名は `users` としておきます。スキーマは以下です。

| 論理名   | 物理名    |     キー     |
| -------- | --------- | :----------: |
| ユーザID | user_id   | ハッシュキー |
| ユーザ名 | user_name |      -       |

ついでにTerraformを用いてAWS上にリソースを作成しましょう。キャパシティはオンデマンドモードにしておきます。

- dynamodb_table.tf

```bash
resource "aws_dynamodb_table" "example_users" {
  name         = "example-users"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }
}
```

Lambda関数の環境変数からDynamoDBのテーブル名を取得できるようにLambda関数の環境変数に追加しておきます。環境変数でDynamoDBのテーブル名を設定できるようにしておくと、ローカルでのテストする際にAWS上に構築するテーブル名と別の名前を指定でき、便利です。

- lambda_function.tf

```diff
resource "aws_lambda_function" "example_api" {
  filename      = "dummy_function.zip"
  function_name = "example-api"
  role          = aws_iam_role.example_lambda.arn
  handler       = "lambda"
  runtime       = "go1.x"

  memory_size = 128
  timeout     = 900

+  environment {
+    variables = {
+      DYNAMO_TABLE_USERS: aws_dynamodb_table.example_users.name
+    }
+  }
}
```

```diff
data "aws_iam_policy_document" "example_lambda_policy" {
+  statement {
+    effect = "Allow"
+    actions = [
+      "dynamodb:*"
+    ]
+    resources = [
+      "*"]
+  }
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:*:*:*"]
  }
}
```

新しいリソースを定義したら `terraform apply` しておきます。

## パッケージ構成

ちょっとしたLambda関数であれば `main.go` の1ファイルで良い場合もありますが、バックエンドのWebAPIを提供するとなるとそうはいかないでしょう。Goのパッケージ構成は悩みポイントの一つです。プロジェクトの規模や開発メンバのスキルセットなどにもよると思いますが、個人的にはフラットなパッケージ構成を導入することが多い気がします。[あなたのGoアプリ/ライブラリのパッケージ構成もっとシンプルでよくない？](/articles/20200528/)や[go-swaggerを用いたWebアプリケーション開発Tips19選](/articles/20200630/)の記事を参考にしてみてください。今回は以下のようなフラットパッケージとします。

```bash
.
├── Makefile                 # タスク定義
├── README.md
├── cmd/lambda/main.go       # Lambda関数を起動するmainファイル
├── db.go                    # DynamoDBの接続
├── gen                      # go-swaggerで自動生成するファイル
├── go.mod
├── go.sum
├── swagger.yaml             # swagger spec
├── testdata                 # テスト
├── user_handler.go          # ハンドラの実装
├── user_handler_db.go       # 永続化層へのアクセスファイル
└── user_handler_test.go     # ハンドラのテスト
```

以下のようにディレクトリを作っておきます。

```bash
$ mkdir -p %GOPATH%\src\github.com\d-tsuji\example
$ cd example
$ mkdir cmd\lambda gen testdata
```

## ビルド

ビルドなどのタスクはMakefileに記述しておきます。

- Makefile

```bash
.PHONY: deps
deps:
	go mod download
	go mod tidy

.PHONY: build
build: deps
	GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -trimpath -o bin/lambda cmd/lambda/main.go

.PHONY: test
test:
	export DYNAMO_TABLE_USERS=local_users;\
	go test -race -v -count=1 ./

.PHONY: generate-server
generate-server:
	rm -rf ./gen/models ./gen/restapi/operations
	swagger generate server --exclude-main -f ./swagger.yaml -t gen

.PHONY: zip
zip: build
	zip -j bin/lambda.zip bin/lambda

.PHONY: deploy
deploy: zip
	aws lambda update-function-code --region ap-northeast-1 --function-name example-api --zip-file fileb://bin/lambda.zip
```

先程作成した `swagger.yml` のAPI定義を元に `make generate-server` で `go-swagger` でコードを生成します。

```bash
$ make generate-server
swagger generate server --exclude-main -f ./swagger.yaml -t gen
2020/09/15 22:17:26 validating spec C:\Users\dramt\go\src\github.com\d-tsuji\example\swagger.yaml

...

2020/09/15 22:17:27 executed template asset:serverDoc
2020/09/15 22:17:27 Generation completed!

For this generation to compile you need to have some packages in your GOPATH:

        * github.com/go-openapi/runtime
        * github.com/jessevdk/go-flags

You can get these now with: go get -u -f gen/...
```

`go-swagger` で生成したファイルでビルドに必要なモジュールを `go.mod` に追加します。

```bash
$ go get github.com/go-openapi/runtime
$ go get github.com/jessevdk/go-flags
```

## ハンドラ実装

準備が整ったので、ハンドラの実装をしていきましょう。

まずは `db.go` を実装してDynamoDBに接続します。ローカルでの開発の場合は `4566` ポートで起動しているLocalStackに接続します。DynamoDBのGoのクライアントライブラリは

- [`aws/aws-sdk-go`](https://github.com/aws/aws-sdk-go)
- [`guregu/dynamo`](https://github.com/guregu/dynamo)
- [`google/go-cloud`](https://github.com/google/go-cloud)

などがあります。個人的なおすすめは `guregu/dynamo` です。本チュートリアルでは `guregu/dynamo` を利用することにします。`guregu/dynamo` の使い方については「[DynamoDB×Go連載#1 GoでDynamoDBでおなじみのguregu/dynamoを利用する](/articles/20200225/)」の記事も見てみてください。

```bash
$ go get github.com/guregu/dynamo
```

- db.go

```go
package example

import (
	"log"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/guregu/dynamo"
)

var (
	gdb    *dynamo.DB
	region string

	usersTable string
)

func init() {
	region = os.Getenv("AWS_REGION")

	usersTable = os.Getenv("DYNAMO_TABLE_USERS")
	if usersTable == "" {
		log.Fatal("missing env variable: DYNAMO_TABLE_USERS")
	}

	gdb = dynamo.New(session.Must(session.NewSession(&aws.Config{
		Region: aws.String(region),
	})))
}
```

続いてハンドラの実装します。まずは以下の `GET` を扱うハンドラから実装していきます。

| メソッド | パス        | 説明                                 |
| -------- | ----------- | ------------------------------------ |
| GET      | `/v1/users` | 登録されているユーザ一覧を返却します |

DynamoDBから登録されているすべてのユーザを取得する処理を実装します。

DynamoDBとマッピングするモデルは以下です。

- dynamo_model.go

```go
package example

type User struct {
	UserID   string `dynamo:"user_id,hash"`
	UserName string `dynamo:"user_name"`
}
```

テーブルから全アイテム取得するためにScanを行います。

- user_handler_db.go

```go
package example

import (
	"context"
	"errors"

	"github.com/guregu/dynamo"
)

func scanUsers(ctx context.Context) ([]User, error) {
	var resp []User
	table := gdb.Table(usersTable)
	if err := table.Scan().AllWithContext(ctx, &resp); err != nil {
		// 0件の場合も正常とします
		if errors.Is(err, dynamo.ErrNotFound) {
			return nil, nil
		}
		return resp, err
	}
	return resp, nil
}
```

続いて上記を使ったハンドラを実装します。

- user_handler.go

```go
package example

import (
	"fmt"

	"github.com/d-tsuji/example/gen/models"
	"github.com/d-tsuji/example/gen/restapi/operations"
	"github.com/go-openapi/runtime/middleware"
)

func GetUsers(p operations.GetUsersParams) middleware.Responder {
	ctx := p.HTTPRequest.Context()
	users, err := scanUsers(ctx)
	if err != nil {
		return operations.NewGetUsersInternalServerError().WithPayload(&models.Error{
			Message: fmt.Sprintf("scan users error: %v", err),
		})
	}
	var resp models.Users
	for _, u := range users {
		u := u
		resp = append(resp, &models.User{
			UserID: &u.UserID,
			Name:   &u.UserName,
		})
	}
	return operations.NewGetUsersOK().WithPayload(resp)
}
```

ハンドラのテストも実装しましょう。テスト時はDynamoDBの接続先をLocalStackに上書きして、テスト用の設定にします。パッケージ構成によっては接続先の値は関数の引数で渡す、などが必要になるでしょう。

単体テストは実装の詳細をテストしないように、粒度を粗めにしておきます。ハンドラのリクエストに対して想定するJSONのレスポンスが取得できているかどうか確認します。テストファイルは `want_get_users_1.json` `want_get_users_2.json` としておきます。

- user_handler_test.go

```go
package example

import (
	"context"
	"io/ioutil"
	"net/http/httptest"
	"testing"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/d-tsuji/example/gen/models"
	"github.com/d-tsuji/example/gen/restapi/operations"
	"github.com/go-openapi/runtime"
	"github.com/guregu/dynamo"
	"github.com/nsf/jsondiff"
)

func init() {
	dbEndpoint := "http://localhost:4566"
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		Profile:           "local",
		SharedConfigState: session.SharedConfigEnable,
		Config: aws.Config{
			Endpoint:   aws.String(dbEndpoint),
			DisableSSL: aws.Bool(true),
		},
	}))
	gdb = dynamo.New(sess)
}

func TestGetUsers(t *testing.T) {
	tests := []struct {
		name           string
		input          func(t *testing.T)
		wantStatusCode int
		want           string
	}{
		{
			name: "複数件のユーザの取得",
			input: func(t *testing.T) {
				err := gdb.CreateTable(usersTable, User{}).Provision(1, 1).RunWithContext(context.TODO())
				if err != nil {
					t.Errorf("dynamo create table %s: %v", usersTable, err)
				}
				inputUsers := []User{{UserID: "001", UserName: "gopher"}, {UserID: "002", UserName: "rubyist"}}
				for _, u := range inputUsers {
					if err := gdb.Table(usersTable).Put(u).RunWithContext(context.TODO()); err != nil {
						t.Errorf("dynamo input user %v: %v", u, err)
					}
				}
			},
			wantStatusCode: 200,
			want:           "./testdata/want_get_users_1.json",
		},
		{
			name: "ユーザ0件",
			input: func(t *testing.T) {
				err := gdb.CreateTable(usersTable, User{}).Provision(1, 1).RunWithContext(context.TODO())
				if err != nil {
					t.Errorf("dynamo create table %s: %v", usersTable, err)
				}
			},
			wantStatusCode: 200,
			want:           "./testdata/want_get_users_2.json",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.input(t)
			t.Cleanup(func() {
				if err := gdb.Table(usersTable).DeleteTable().RunWithContext(context.TODO()); err != nil {
					t.Fatalf("dynamo delete table %s: %v", usersTable, err)
				}
			})

			p := operations.NewGetUsersParams()
			p.HTTPRequest = httptest.NewRequest("GET", "/v1/users", nil)

			resp := GetUsers(p)

			w := httptest.NewRecorder()
			resp.WriteResponse(w, runtime.JSONProducer())

			want, err := ioutil.ReadFile(tt.want)
			if err != nil {
				t.Fatalf("want file read: %v", err)
			}

			if w.Result().StatusCode != tt.wantStatusCode {
				t.Errorf("status got %v, but want %v", w.Result().StatusCode, tt.wantStatusCode)
			}

			opt := jsondiff.DefaultConsoleOptions()
			if d, s := jsondiff.Compare(w.Body.Bytes(), want, &opt); d != jsondiff.FullMatch {
				t.Errorf("unmatch, got=%s, want=%s, diff=%s", string(w.Body.Bytes()), string(want), s)
			}
		})
	}
}
```

- testdata/want_get_users_1.json

```json
[
  {
    "user_id": "001",
    "name": "gopher"
  },
  {
    "user_id": "002",
    "name": "rubyist"
  }
]
```

- testdata/want_get_users_2.json

```json
[]
```

Goのテストを実行するとPASSすることがわかります。ハンドラの実装ができました。

```bash
$ make test
export DYNAMO_TABLE_USERS=local_users;\
        go test -race -v -count=1 ./
=== RUN   TestGetUsers
=== RUN   TestGetUsers/複数件のユーザの取得
=== RUN   TestGetUsers/ユーザ0件
--- PASS: TestGetUsers (0.39s)
    --- PASS: TestGetUsers/複数件のユーザの取得 (0.30s)
    --- PASS: TestGetUsers/ユーザ0件 (0.09s)
PASS
ok      github.com/d-tsuji/example      0.428s
```

POSTのハンドラも同様に実装・テストできますが、本チュートリアルでは省略します。本チュートリアルの内容はGitHubにコミットしてあるので、そちらを参照ください。

`go-swagger` はハンドラの実装とHTTPリクエストのパスのマッピングを自動生成したファイルの中に記述します。今回の場合は `configure_example_app.go` です。


```go
// This file is safe to edit. Once it exists it will not be overwritten

package restapi

// ...

func configureAPI(api *operations.ExampleAppAPI) http.Handler {
	// configure the api here
	api.ServeError = errors.ServeError

	// Set your custom logger if needed. Default one is log.Printf
	// Expected interface func(string, ...interface{})
	//
	// Example:
	// api.Logger = log.Printf

	api.JSONConsumer = runtime.JSONConsumer()

	api.JSONProducer = runtime.JSONProducer()

	// ==================================================================================
	// userハンドラ
	// 以下のように実装したハンドラをHTTPサーバに紐付けます。
	api.GetUsersHandler = operations.GetUsersHandlerFunc(example.GetUsers)
	api.PostUsersHandler = operations.PostUsersHandlerFunc(example.PostUsers)
	// ==================================================================================

	api.PreServerShutdown = func() {}

	api.ServerShutdown = func() {}

	return setupGlobalMiddleware(api.Serve(setupMiddlewares))
}

// ...
```

## Lambda関数インテグレーション

go-swaggerで実装したWebアプリケーションサーバをLambda関数として動かすようにします。GoのLambda関数として有効なシグネチャは以下の通りです。

```
- func ()
- func () error
- func (TIn), error
- func () (TOut, error)
- func (context.Context) error
- func (context.Context, TIn) error
- func (context.Context) (TOut, error)
- func (context.Context, TIn) (TOut, error)
```

`TIn` や `TOut` は `encoding/json` でエンコード・デコードできる型を指定できます。

Lambda関数はAPI Gatewayのリクエストをトリガーに起動します。Lambda関数のAPI Gatewayのリクエスト `events.APIGatewayProxyResponse` をGoのHTTPサーバで扱えるような `*http.Request` に変換する必要があります。

- [awslabs/aws-lambda-go-api-proxy](https://github.com/awslabs/aws-lambda-go-api-proxy)

を用いると簡単に変換することができます。もちろん `go-swagger` だけでなく主要なGoのWebアプリケーションフレームに対応しています。

- cmd/lambda/main.go

```go
package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/d-tsuji/example/gen/restapi"
	"github.com/d-tsuji/example/gen/restapi/operations"
	"github.com/go-openapi/loads"
)

var httpAdapter *httpadapter.HandlerAdapter

// Handler handles API requests
func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if httpAdapter == nil {
		swaggerSpec, err := loads.Embedded(restapi.SwaggerJSON, restapi.FlatSwaggerJSON)
		if err != nil {
			log.Fatalln(err)
		}

		api := operations.NewExampleAppAPI(swaggerSpec)
		server := restapi.NewServer(api)
		server.ConfigureAPI()

		// see https://github.com/go-swagger/go-swagger/issues/962#issuecomment-478382896
		httpAdapter = httpadapter.New(server.GetHandler())
	}
	return httpAdapter.ProxyWithContext(ctx, req)
}

func main() {
	lambda.Start(Handler)
}
```

# ビルド/デプロイ

準備は整いました！Goのファイルをビルドしzip化してAWS Lambda関数にデプロイしましょう。デプロイのコマンドはMakefileにタスクとして記述していました。

- Makefile

```makefile
deploy: zip
	aws lambda update-function-code --region ap-northeast-1 --function-name example-api --zip-file fileb://bin/lambda.zip
```

それではビルドしてデプロイします。

```bash
$ make deploy
go mod download
go mod tidy
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o bin/lambda cmd/lambda/main.go
zip -j bin/lambda.zip bin/lambda
updating: lambda (deflated 67%)
aws lambda update-function-code --region ap-northeast-1 --function-name example-api --zip-file fileb://bin/lambda.zip
{
    "FunctionName": "example-api",
    "FunctionArn": "arn:aws:lambda:ap-northeast-1:123456789012:function:example-api",
    "Runtime": "go1.x",
    "Role": "arn:aws:iam::123456789012:role/example-lambda",
    "Handler": "lambda",
    "CodeSize": 5517317,
    "Description": "",
    "Timeout": 900,
    "MemorySize": 128,
    "LastModified": "2020-09-22T08:56:19.019+0000",
    "CodeSha256": "bV+3mzysyD5226diZpvjfpE+Qz6o5ZHT8y35fAB3I/M=",
    "Version": "$LATEST",
    "Environment": {
        "Variables": {
            "DYNAMO_TABLE_USERS": "example-users"
        }
    },
    "TracingConfig": {
        "Mode": "PassThrough"
    },
    "RevisionId": "26888c1b-bfa2-4e67-960e-3fd8212e29f2"
}
```

上記のように出力されていればデプロイは完了です。継続的なデプロイを実施したい場合はdevelopブランチなどにPRがマージされたタイミングで開発環境にLambda関数をデプロイするといった内容をGitHub ActionsやCircleCIの設定に組み込むとよいでしょう。

さてCLIでDynamoDBにデータをPutして、APIのレスポンスを確認してみましょう。

```bash
$ aws dynamodb put-item --table-name example-users --item '{"user_id": {"S": "001"}, "user_name": {"S": "Gopher"}}'
```

今回はお手軽にcurlでAPIにリクエストしてレスポンスを確認します。

```bash
$ curl -i https://${rest-api-id}.execute-api.ap-northeast-1.amazonaws.com/test/v1/users
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 36
Connection: keep-alive
Date: Mon, 21 Sep 2020 10:58:25 GMT
x-amzn-RequestId: 89f88ada-ea48-4a60-a8ef-2b58df4309d1
x-amz-apigw-id: TNoUxEJlNjMFdxg=
X-Amzn-Trace-Id: Root=1-5f688751-c31c0c580cbe0f64d179578a;Sampled=0
X-Cache: Miss from cloudfront
Via: 1.1 48bf5adc2925386f020a8608d1c7edbe.cloudfront.net (CloudFront)
X-Amz-Cf-Pop: NRT20-C3
X-Amz-Cf-Id: GfDUO8SfL5POKkIVFVs5L-hJ8KkjwLCLf22xZmNWFiVkIQaHR2H4oA==

[{"name":"Gopher","user_id":"001"}]
```

API Gatewayから想定通りのレスポンスが返ってきました！本チュートリアルでは `/v1/users` へのGETリクエストのサンプルだけでしたが、新しいAPI定義が必要な場合 `swagger.yaml` に追加して本チュートリアルのようにすすめていけば容易に拡張することができます。

チュートリアルのすべてのサンプルはGitHubの以下のリポジトリにおいてあります。

|   #   | 項目                        | リポジトリ                                                                                        |
| :---: | --------------------------- | ------------------------------------------------------------------------------------------------- |
|   1   | GoによるWebAPIの実装        | [d-tsuji/serverless-api-go-tutorial](https://github.com/d-tsuji/serverless-api-go-tutorial)       |
|   2   | Terraformによるインフラ実装 | [d-tsuji/serverless-api-infra-tutorial](https://github.com/d-tsuji/serverless-api-infra-tutorial) |

