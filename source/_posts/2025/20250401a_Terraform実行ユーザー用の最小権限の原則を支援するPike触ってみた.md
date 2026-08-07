---
title: "Terraform実行ユーザー用の最小権限の原則を支援するPike触ってみた"
date: 2025/04/01 00:00:00
postid: a
tags:
  - Terraform
  - AWS
  - アクセス制御
categories:
  - DevOps
series: "Terraform連載2025"
thumbnail: /images/2025/20250401a/thumbnail.png
author: 真野隼記
lede: "Pikeを触ってみた記事です。"
---
# はじめに

TIG 真野です。[Terraform連載2025](/articles/20250331a/)の2日目です。

Pikeを触ってみた記事です。

## Pikeとは

[Pike](https://github.com/JamesWoolfenden/pike) は James Woolfendenさんによって開発されたTerraformのコードを静的解析し、その `terraform apply` に必要な最小権限の原則に則ったIAMポリシーを生成するツールです。直接 `.tf` のコードをスキャンするというところが、良さそうと思ったポイントです。

Terraformを用いてインフラ構築する際には、強めの権限（本来は不要であるサービスの作成権限など）を付与して行うことが多いと思います。そのため、万が一のセキュリティ事故や誤操作で思いがけない結果に繋がる懸念がありました。しかし、最小権限の原則を忠実に守ろうとすると難易度・対応コストが高くなるため、ある程度割り切った運用を採用することが多いように思えます（もちろん、開発時は大きめを許容するが、サービスがある程度枯れてきたら権限範囲を小さくするといった運用は今までもよく行われてきたと思います）。

個人的にも、`terraform apply` に必要な権限を、インフラのリソース種別が追加する事に調査・ポリシーに追加する運用な流石に厳しいなと感じていたので、こうした支援ツールが福音に聞こえました。

さっそく触ってみます。

## インストール

[README](https://github.com/JamesWoolfenden/pike?tab=readme-ov-file#install) に環境別の手順があります。私はGo言語環境があったので、以下でインストールします。

```bash
$ go install github.com/jameswoolfenden/pike@v0.3.47

$ pike -h
NAME:
   pike - Generate IAM policy from your IAC code

USAGE:
   pike [global options] command [command options]

VERSION:
   9.9.9

AUTHOR:
   James Woolfenden <james.woolfenden@gmail.com>

COMMANDS:
   apply, a    Create a policy and use it to instantiate the IAC
   compare, c  policy comparison of deployed versus IAC
   inspect, x  policy comparison of environment versus IAC
   invoke, i   Triggers a gitHub action specified with the workflow flag
   make, m     make the policy/role required for this IAC to deploy
   parse, p    Triggers a gitHub action specified with the workflow flag
   pull, l     Clones remote repo and scans it using pike
   readme, r   Looks in dir for a README.md and updates it with the Policy required to build the code
   remote, o   Create/Update the Policy and set credentials/secret for Github Action
   scan, s     scan a directory for IAM code
   version, v  Outputs the application version
   watch, w    Waits for policy update
   help, h     Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help
   --version, -v  print the version
```

pike経由で直接、IAMポリシーを直接AWS上にデプロイできるなど多くのコマンドがありますが、今回は `scan` だけ用います。

## 対象リソースの準備

以下のような API Gateway + Lambda + DynamoDB（図にはないですがCloudWatchメトリクスやアラーム）を含んだリソースを持つTerraformコードを用意します。なお、図はinframapで生成したものを簡単に加筆したものです。

<img src="/images/2025/20250401a/{28A12EA6-0F25-4E2C-8FDB-4BDCE8FC54AF}.png" alt="{28A12EA6-0F25-4E2C-8FDB-4BDCE8FC54AF}.png" width="491" height="560" loading="lazy">

<details><summary>main.tf</summary>

```bash main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # バージョンは適宜調整してください
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

variable "resource_prefix" {
  description = "Prefix for all created resources"
  type        = string
  default     = "pile-test"
}

resource "aws_dynamodb_table" "data_table" {
  name           = "${var.resource_prefix}-data-table"
  billing_mode   = "PAY_PER_REQUEST" # オンデマンドキャパシティ
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S" # String
  }
}

resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.resource_prefix}-lambda-exec-role"

  # Lambdaサービスがこのロールを引き受けることを許可
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Lambda用IAMポリシー (CloudWatch Logs & DynamoDBアクセス)
resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.resource_prefix}-lambda-policy"
  description = "Policy for Lambda to access CloudWatch Logs and DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # CloudWatch Logsへの書き込み権限
        Action = [
          "logs:CreateLogGroup", # Lambda初回実行時に必要
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:ap-northeast-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.resource_prefix}-function:*"
      },
      {
        # DynamoDBテーブルへの基本的なCRUD操作権限
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query", # 必要に応じて追加
          "dynamodb:Scan"   # 必要に応じて追加 (最小権限的には非推奨な場合が多い)
        ]
        Effect   = "Allow"
        # 作成した特定のDynamoDBテーブルARNを指定
        Resource = aws_dynamodb_table.data_table.arn
      }
    ]
  })
}

# ロールにポリシーをアタッチ
resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# 現在のアカウントIDを取得するために使用
data "aws_caller_identity" "current" {}

data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/${var.resource_prefix}-lambda.zip"
  source {
    content = <<-EOT
import json
import os
import boto3
import uuid
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        # API Gateway v2 HTTP API (payload format v2.0)
        if 'body' in event:
            body = json.loads(event.get('body', '{}'))
        else: # Direct invocation or other event sources
             body = event

        item_id = body.get('id', str(uuid.uuid4())) # IDがなければ生成
        content = body.get('content', 'Default content')

        response = table.put_item(
            Item={
                'id': item_id,
                'content': content
            }
        )

        logger.info(f"Successfully put item: {item_id}")

        return {
            'statusCode': 200,
            'headers': { 'Content-Type': 'application/json' },
            'body': json.dumps({
                'message': 'Item processed successfully!',
                'itemId': item_id,
                'dynamoResponse': response
            })
        }
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': { 'Content-Type': 'application/json' },
            'body': json.dumps({'error': str(e)})
        }

EOT
    filename = "lambda_function.py"
  }
}

# Lambda関数リソース
resource "aws_lambda_function" "api_handler" {
  function_name    = "${var.resource_prefix}-function"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11" # 必要に応じて変更
  role             = aws_iam_role.lambda_exec_role.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # DynamoDBテーブル名を環境変数として渡す
  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.data_table.name
    }
  }

  # CloudWatch Logs グループ名は自動生成される (/aws/lambda/<function_name>)
  # ログの保持期間などを設定したい場合は aws_cloudwatch_log_group を別途定義

  # ファイルが変更されたら再デプロイするために必要
  depends_on = [
    data.archive_file.lambda_zip,
    aws_iam_role_policy_attachment.lambda_attach,
    aws_dynamodb_table.data_table
  ]
}

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.resource_prefix}-http-api"
  protocol_type = "HTTP"
  target        = aws_lambda_function.api_handler.invoke_arn # デフォルトルート用
}

# Lambda統合
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY" # Lambdaプロキシ統合
  integration_uri  = aws_lambda_function.api_handler.invoke_arn
  payload_format_version = "2.0" # Lambda関数のevent形式
}

# ルート設定 (例: POST /items)
resource "aws_apigatewayv2_route" "post_items" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /items" # HTTPメソッドとパス
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# デフォルトステージ ($default) - 自動デプロイ有効
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "default" # デフォルトステージ名
  auto_deploy = true

}

# API GatewayがLambdaを呼び出すための権限
resource "aws_lambda_permission" "api_gw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"

  # 呼び出し元API Gatewayを特定するARN
  source_arn = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
  alarm_name          = "${var.resource_prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1" # 1期間で評価
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60" # 60秒
  statistic           = "Sum"
  threshold           = "0" # エラーが0より大きい場合 (つまり1回でも発生したら)
  alarm_description   = "Alarm when ${var.resource_prefix}-function lambda function has errors"

  dimensions = {
    FunctionName = aws_lambda_function.api_handler.function_name
  }
}

output "api_endpoint" {
  description = "The invoke URL for the API Gateway stage"
  value       = aws_apigatewayv2_stage.default_stage.invoke_url
}

output "lambda_function_name" {
  description = "Name of the created Lambda function"
  value       = aws_lambda_function.api_handler.function_name
}

output "dynamodb_table_name" {
  description = "Name of the created DynamoDB table"
  value       = aws_dynamodb_table.data_table.name
}
```

</details>

## Pikeの実行

同一ディレクトリ上で、pikeコマンドを実行します。応答速度は一瞬でした。早い。

```bash
$ pike scan -output json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "apigateway:DELETE",
                "apigateway:GET",
                "apigateway:PATCH",
                "apigateway:POST",
                "apigateway:PUT"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "cloudwatch:DeleteAlarms",
                "cloudwatch:DescribeAlarms",
                "cloudwatch:ListTagsForResource",
                "cloudwatch:PutMetricAlarm"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": [
                "dynamodb:CreateTable",
                "dynamodb:DeleteTable",
                "dynamodb:DescribeContinuousBackups",
                "dynamodb:DescribeTable",
                "dynamodb:DescribeTimeToLive",
                "dynamodb:ListTagsOfResource",
                "dynamodb:UpdateTable",
                "dynamodb:UpdateTimeToLive"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Sid": "VisualEditor3",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeAccountAttributes",
                "ec2:DescribeNetworkInterfaces"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Sid": "VisualEditor4",
            "Effect": "Allow",
            "Action": [
                "iam:AttachRolePolicy",
                "iam:CreatePolicy",
                "iam:CreateRole",
                "iam:DeletePolicy",
                "iam:DeleteRole",
                "iam:DetachRolePolicy",
                "iam:GetPolicy",
                "iam:GetPolicyVersion",
                "iam:GetRole",
                "iam:ListAttachedRolePolicies",
                "iam:ListInstanceProfilesForRole",
                "iam:ListPolicyVersions",
                "iam:ListRolePolicies",
                "iam:PassRole"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Sid": "VisualEditor5",
            "Effect": "Allow",
            "Action": [
                "lambda:AddPermission",
                "lambda:CreateFunction",
                "lambda:DeleteFunction",
                "lambda:GetFunction",
                "lambda:GetFunctionCodeSigningConfig",
                "lambda:GetPolicy",
                "lambda:ListVersionsByFunction",
                "lambda:RemovePermission"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

権限の概要は以下です。

|         サービス          |            アクセスレベル                                     |            リソース         |            リクエストの条件          |
|---------------------------|---------------------------------------------------------------|-----------------------------|--------------------------------------|
|         API Gateway       |         フル: 読み取り, 書き込み                              |         すべてのリソース    |         None                         |
|         API Gateway V2    |         フルアクセス                                          |         すべてのリソース    |         None                         |
|         CloudWatch        |         制限あり: リスト, 読み取り, 書き込み                  |         すべてのリソース    |         None                         |
|         DynamoDB          |         制限あり: 読み取り, 書き込み                          |         すべてのリソース    |         None                         |
|         EC2               |         制限あり: リスト                                      |         すべてのリソース    |         None                         |
|         IAM               |         制限あり: リスト, 許可の管理, 読み取り,   書き込み    |         すべてのリソース    |         None                         |
|         Lambda            |         制限あり: リスト, 許可の管理, 読み取り,   書き込み    |         すべてのリソース    |         None                         |

一見すると大きな分類レベルの違和感がないものの、細かい点が気になります。Pikeとしては基本的にリソースは全て `*` になるようです。

早速、このJSONを用いてIAMポリシーを作成 ⇛ それをアタッチしたIAMロール作成 ⇛ スイッチロールして利用 ⇛ `terraform apply` します。

```bash
$ terraform apply
（...中略...）

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_apigatewayv2_api.http_api will be created
  + resource "aws_apigatewayv2_api" "http_api" {
      + api_endpoint                 = (known after apply)
      + api_key_selection_expression = "$request.header.x-api-key"
      + arn                          = (known after apply)
      + execution_arn                = (known after apply)
      + id                           = (known after apply)
      + name                         = "pile-test-http-api"
      + protocol_type                = "HTTP"
      + route_selection_expression   = "$request.method $request.path"
      + tags_all                     = (known after apply)
      + target                       = (known after apply)
    }

  # aws_apigatewayv2_integration.lambda_integration will be created
  + resource "aws_apigatewayv2_integration" "lambda_integration" {
      + api_id                                    = (known after apply)
      + connection_type                           = "INTERNET"
      + id                                        = (known after apply)
      + integration_response_selection_expression = (known after apply)
      + integration_type                          = "AWS_PROXY"
      + integration_uri                           = (known after apply)
      + payload_format_version                    = "2.0"
      + timeout_milliseconds                      = (known after apply)
    }

  # aws_apigatewayv2_route.post_items will be created
  + resource "aws_apigatewayv2_route" "post_items" {
      + api_id             = (known after apply)
      + api_key_required   = false
      + authorization_type = "NONE"
      + id                 = (known after apply)
      + route_key          = "POST /items"
      + target             = (known after apply)
    }

  # aws_apigatewayv2_stage.default_stage will be created
  + resource "aws_apigatewayv2_stage" "default_stage" {
      + api_id        = (known after apply)
      + arn           = (known after apply)
      + auto_deploy   = true
      + deployment_id = (known after apply)
      + execution_arn = (known after apply)
      + id            = (known after apply)
      + invoke_url    = (known after apply)
      + name          = "default"
      + tags_all      = (known after apply)
    }

  # aws_cloudwatch_metric_alarm.lambda_error_alarm will be created
  + resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
      + actions_enabled                       = true
      + alarm_description                     = "Alarm when pile-test-function lambda function has errors"
      + alarm_name                            = "pile-test-lambda-errors"
      + arn                                   = (known after apply)
      + comparison_operator                   = "GreaterThanThreshold"
      + dimensions                            = {
          + "FunctionName" = "pile-test-function"
        }
      + evaluate_low_sample_count_percentiles = (known after apply)
      + evaluation_periods                    = 1
      + id                                    = (known after apply)
      + metric_name                           = "Errors"
      + namespace                             = "AWS/Lambda"
      + period                                = 60
      + statistic                             = "Sum"
      + tags_all                              = (known after apply)
      + threshold                             = 0
      + treat_missing_data                    = "missing"
    }

  # aws_dynamodb_table.data_table will be created
  + resource "aws_dynamodb_table" "data_table" {
      + arn              = (known after apply)
      + billing_mode     = "PAY_PER_REQUEST"
      + hash_key         = "id"
      + id               = (known after apply)
      + name             = "pile-test-data-table"
      + read_capacity    = (known after apply)
      + stream_arn       = (known after apply)
      + stream_label     = (known after apply)
      + stream_view_type = (known after apply)
      + tags_all         = (known after apply)
      + write_capacity   = (known after apply)

      + attribute {
          + name = "id"
          + type = "S"
        }
    }

  # aws_iam_policy.lambda_policy will be created
  + resource "aws_iam_policy" "lambda_policy" {
      + arn              = (known after apply)
      + attachment_count = (known after apply)
      + description      = "Policy for Lambda to access CloudWatch Logs and DynamoDB table"
      + id               = (known after apply)
      + name             = "pile-test-lambda-policy"
      + name_prefix      = (known after apply)
      + path             = "/"
      + policy           = (known after apply)
      + policy_id        = (known after apply)
      + tags_all         = (known after apply)
    }

  # aws_iam_role.lambda_exec_role will be created
  + resource "aws_iam_role" "lambda_exec_role" {
      + arn                   = (known after apply)
      + assume_role_policy    = jsonencode(
            {
              + Statement = [
                  + {
                      + Action    = "sts:AssumeRole"
                      + Effect    = "Allow"
                      + Principal = {
                          + Service = "lambda.amazonaws.com"
                        }
                    },
                ]
              + Version   = "2012-10-17"
            }
        )
      + create_date           = (known after apply)
      + force_detach_policies = false
      + id                    = (known after apply)
      + managed_policy_arns   = (known after apply)
      + max_session_duration  = 3600
      + name                  = "pile-test-lambda-exec-role"
      + name_prefix           = (known after apply)
      + path                  = "/"
      + tags_all              = (known after apply)
      + unique_id             = (known after apply)
    }

  # aws_iam_role_policy_attachment.lambda_attach will be created
  + resource "aws_iam_role_policy_attachment" "lambda_attach" {
      + id         = (known after apply)
      + policy_arn = (known after apply)
      + role       = "pile-test-lambda-exec-role"
    }

  # aws_lambda_function.api_handler will be created
  + resource "aws_lambda_function" "api_handler" {
      + architectures                  = (known after apply)
      + arn                            = (known after apply)
      + code_sha256                    = (known after apply)
      + filename                       = "./pile-test-lambda.zip"
      + function_name                  = "pile-test-function"
      + handler                        = "lambda_function.lambda_handler"
      + id                             = (known after apply)
      + invoke_arn                     = (known after apply)
      + last_modified                  = (known after apply)
      + memory_size                    = 128
      + package_type                   = "Zip"
      + publish                        = false
      + qualified_arn                  = (known after apply)
      + qualified_invoke_arn           = (known after apply)
      + reserved_concurrent_executions = -1
      + role                           = (known after apply)
      + runtime                        = "python3.11"
      + signing_job_arn                = (known after apply)
      + signing_profile_version_arn    = (known after apply)
      + skip_destroy                   = false
      + source_code_hash               = "HDyCH2iLAujNxtRIhBNof46Cgb8qWglR5YUSMov/PNg="
      + source_code_size               = (known after apply)
      + tags_all                       = (known after apply)
      + timeout                        = 3
      + version                        = (known after apply)

      + environment {
          + variables = {
              + "DYNAMODB_TABLE" = "pile-test-data-table"
            }
        }
    }

  # aws_lambda_permission.api_gw_invoke will be created
  + resource "aws_lambda_permission" "api_gw_invoke" {
      + action              = "lambda:InvokeFunction"
      + function_name       = "pile-test-function"
      + id                  = (known after apply)
      + principal           = "apigateway.amazonaws.com"
      + source_arn          = (known after apply)
      + statement_id        = "AllowAPIGatewayInvoke"
      + statement_id_prefix = (known after apply)
    }

Plan: 11 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + api_endpoint         = (known after apply)
  + dynamodb_table_name  = "pile-test-data-table"
  + lambda_function_name = "pile-test-function"

（...中略...）

Apply complete! Resources: 11 added, 0 changed, 0 destroyed.

Outputs:

api_endpoint = "https://kiuv38oj5f.execute-api.ap-northeast-1.amazonaws.com/default"
dynamodb_table_name = "pile-test-data-table"
lambda_function_name = "pile-test-function"
```

まさかの一発成功でした🎉🎉🎉

## 本当に最小権限になっているか？権限を外してみる

作成するLambdaはVPC外で動作する定義になっています。そのため以下のEC2のネットワークインターフェースの権限は不要に見えましたので、外してみます。

以下をポリシーから削除。

- `ec2:DescribeAccountAttributes`
- `ec2:DescribeNetworkInterfaces`

一度、`terraform destory` してから再実行すると、やはり成功します。

```bash
$ terraform apply
（...中略...）

Apply complete! Resources: 11 added, 0 changed, 0 destroyed.

Outputs:

api_endpoint = "https://j85kfvousg.execute-api.ap-northeast-1.amazonaws.com/default"
dynamodb_table_name = "pile-test-data-table"
lambda_function_name = "pile-test-function"
```

完全に厳格なツールという訳では無いようです。

## Pikeには絶対に無視されるであろうリソースを追加してみる

以下のように、`local-exec` 経由でS3バケットを作成してみるコードを追加します。

```tf main.tf
# ...中略 ...

locals {
  bucket_name = "pike-${random_string.bucket_suffix.result}"
}

resource "terraform_data" "s3_bucket_via_cli" {
  input = {
    bucket_name = local.bucket_name
  }

  provisioner "local-exec" {
    command = <<EOT
      aws s3api create-bucket \
        --bucket ${self.input.bucket_name} \
        --create-bucket-configuration LocationConstraint=ap-northeast-1
    EOT
    interpreter = ["bash", "-c"]
    on_failure = fail
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<EOT
      aws s3api delete-bucket \
        --bucket ${self.input.bucket_name}
    EOT
    interpreter = ["bash", "-c"]
  }
}

output "bucket_name_created_via_local_exec" {
  description = "Name of the S3 bucket presumably created via local-exec"
  value       = local.bucket_name
}
```

pikeコマンドを実行しますが、先ほどと差分は無しです（`local-exec` の実行コマンドをパースするわけがないので当たり前ですが）。

そのため、当たり前ですが `terraform apply` はS3実行権限が不足しているため失敗します。

```bash
$ terraform apply
(...中略...)

-/+ destroy and then create replacement

Terraform will perform the following actions:

  # terraform_data.s3_bucket_via_cli is tainted, so must be replaced
-/+ resource "terraform_data" "s3_bucket_via_cli" {
      ~ id     = "210e249d-8405-3ed9-1506-1ff4fe12dc68" -> (known after apply)
      ~ output = {
          - bucket_name = "pike-p7niqibd"
        } -> (known after apply)
        # (1 unchanged attribute hidden)
    }

Plan: 1 to add, 0 to change, 1 to destroy.

(...中略...)
terraform_data.s3_bucket_via_cli: Still creating... [10s elapsed]
terraform_data.s3_bucket_via_cli: Still creating... [20s elapsed]
terraform_data.s3_bucket_via_cli: Still creating... [30s elapsed]

terraform_data.s3_bucket_via_cli (local-exec): An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:iam::123456789012:user/xxx.xxxxx is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::123456789012:role/my-pike-role
╷
│ Error: local-exec provisioner error
│
│   with terraform_data.s3_bucket_via_cli,
│   on main.tf line 275, in resource "terraform_data" "s3_bucket_via_cli":
│  275:   provisioner "local-exec" {
│
│ Error running command '      aws s3api create-bucket \
│         --bucket pike-p7niqibd \
│         --create-bucket-configuration LocationConstraint=ap-northeast-1 \
│         --profile pike
│ ': exit status 254. Output:
│ An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:iam::123456789012:user/xxx.xxxxx is not authorized to perform: sts:AssumeRole on resource:
│ arn:aws:iam::123456789012:role/my-pike-role
│
╵
```

## 使ってみての所感

簡易的な構成であれば、割と成功確立が高い可能性のかもしれない、と好意的に印象を持ちました。

しかし、[Terraformの便利ツールを使ってみよう(第一回)〜Pike編〜](https://qiita.com/ec2_on_aws/items/45eb4d06e2642158c776) のような構成だと、何度か手動で権限を追加してやっと成功した、といった例もあるので、まずは自分たちの構成で素振りすると良いかもしれません（別のリージョンなどでapplyができるかといった具合でしょうか）。

まず、Pikeを使うようなモチベーションがあるという時点で、それなりの規模だと思うのでおそらく手動でメンテナンスが必要になってくるんだろうなという印象です。

他にもいくつか感想です。

- 当たり前ですが、 local-exec などを経由して作成するリソースについては対応していません
- 今回は試していませんが、 Terraformモジュール 経由もちゃんとスキャンするようなログが出ていました
- 基本的にはリソースタイプに対するアクション（`ec2:RunInstances`など）に基づいていて、リソース名を制限したより細かい粒度では生成しないようです。これは予め理解して利用すると良いかなと思います（まぁ、これは許容しても良い気がします）
- Terraform実行に必要な権限の一覧が出ると、どのようなサービスを利用しているかざっと分かるので、キャッチアップには良いかもなとは思いました（これは構成図をちゃんとメンテナンスした方が良いとは思いますが）

## さいごに

Pikeを使ってみました。シンプルなTerraformコードでも微妙に不要な権限がついてたりしましたが、概ね想定通りの権限のみのポリシーを生成してくれました。

構成によっては、手動で追記しないと動かないというパターンもあるようなので、完全な自動化をめざすというよりは、手動で修正・レビューを含めたワークフローを作る必要があると思います。

実行速度はかなり高速で、インストールも簡単なので、まずはTerraformディレクトリで実行してみてお試ししやすいツールだと思いました。
