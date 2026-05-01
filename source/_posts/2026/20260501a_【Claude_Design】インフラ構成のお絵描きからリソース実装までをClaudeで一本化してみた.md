---
title: "【Claude Design】インフラ構成のお絵描きからリソース実装までをClaudeで一本化してみた"
date: 2026/05/01 00:00:00
postid: a
tag:
  - ClaudeDesign
  - ClaudeCode
  - Terraform
  - AWS
category:
  - Infrastructure
thumbnail: /images/2026/20260501a/thumbnail.jpg
author: 福島雅都
lede: "Claude Design、最近話題になっていますね。"
---
<img src="/images/2026/20260501a/imagetets.jpg" alt="imagetets.jpg" width="1200" height="648" loading="lazy">

## 1. はじめに

こんにちは。Healthcare Innovation Group（HIG）の福島です。
本記事は、[春の入門祭り2026](https://future-architect.github.io/articles/20260421a/)の7日目の記事です。

Claude Design、最近話題になっていますね。

- https://qiita.com/ryu-ki/items/bca0ee8f15a13dfd8cfa

以下は上記記事の引用です。
>Claude Design は「見た目を作って終わり」ではなく、Claude Code への橋渡しまで考えられています。
>デザインができたら、設計情報一式をまとめたパッケージ（handoff bundle）として Claude Code に渡せるという仕組みで、エクスポート先としてローカルのコーディングエージェントや Claude Code Web への引き継ぎが示されています。

これを見た時に思いました。**インフラ構成のお絵描きからリソース実装までを、Claudeで一本化できるのではないか**と。

そこで、この記事ではClaude DesignとClaude Codeを使い、以下の一連の流れを検証します（前提として、インフラリソースはAWSに構築し、IaCツールはTerraformを利用します）。

1. 曖昧な要件からAWS構成図を作成する
2. 対話しながら構成図を修正する
3. 確定した構成図をもとにTerraformコードを生成する
4. 生成されたTerraformコードをレビューする
5. 実際にAWSリソースを構築できるか確認する
6. AI活用時に人間がレビューすべきポイントを整理する

## 2. 今回構築するインフラ構成

今回の主目的は、Claude DesignでAWS構成図を作成し、それをもとにTerraformコードを生成することなので、インフラ構成自体は最小構成とします。

- インターネット公開のWebサービス
- ALB経由でECS Fargate上のアプリケーションにアクセスする
- ALB、ECSタスクは複数AZのパブリックサブネットに配置する
- 最低限のセキュリティグループを設定する

::: note warn
本番構成ではECSタスクをプライベートサブネットに配置するのが一般的ですが、今回は低コストな検証環境としてパブリックサブネットに配置しました。
ECSのセキュリティグループではALBからの通信のみ許可し、タスクへ直接アクセスされないようにしています。
:::

今回作成する主なAWSリソースは以下です。

- VPC
- Public Subnet × 2
- Internet Gateway
- Route Table
- Security Group
- Application Load Balancer
- ECS Cluster
- ECS Service
- ECS Task Definition
- IAM Role
- CloudWatch Logs

## 3. ステップ1： 要件から設計資料・AWS構成図を作成する

まずはプロジェクトを作成します。

実務では、構成図と合わせて設計の前提や目的、設計内容を整理することが多いので、今回はスライドを作成します。左ペインの"Slide deck"タブを選択し、名前を入力してCreateボタンを押下します。

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_12.14.53.png" alt="スクリーンショット_2026-04-30_12.14.53.png" width="1200" height="647" loading="lazy">

プロンプトに以下の内容を入力します（「今回の検証・設計内容」章は本記事前半の内容をそのまま貼り付け）。

```txt prompt.txt
検証および設計内容を説明するスライドの作成にあたり、事前情報を以下に記載します。
スライド作成指示は後でするので、スライド作成はまだ開始せず、検証・設計内容の把握のみ実施してください

・今回の検証・設計内容
Claude DesignとClaude Codeを使い、以下の一連の流れを検証します。（前提として、インフラリソースはAWSに構築し、IaCツールはTerraformを利用します。）
1. 曖昧な要件からAWS構成図を作成する
2. 対話しながら構成図を修正する
3. 確定した構成図をもとにTerraformコードを生成する
4. 生成されたTerraformコードをレビューする
5. 実際にAWSリソースを構築できるか確認する
6. AI活用時に人間がレビューすべきポイントを整理する

今回の主目的は、Claude DesignでAWS構成図を作成し、それをもとにTerraformコードを生成することなので、インフラ構成自体は最小構成とします。
インターネット公開のWebサービス
ALB経由でECS Fargate上のアプリケーションにアクセスする
ALB、ECSタスクは複数AZのパブリックサブネットに配置する
最低限のセキュリティグループを設定する

今回作成する主なAWSリソースは以下です。
VPC
Public Subnet × 2
Internet Gateway
Route Table
Security Group
Application Load Balancer
ECS Cluster
ECS Service
ECS Task Definition
IAM Role
CloudWatch Logs
```

まずは検証・設計内容のみ確認してくれました。
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_13.02.40.png" alt="スクリーンショット_2026-04-30_13.02.40.png" width="1200" height="711" loading="lazy">

続いて、以下のプロンプトでスライド作成指示を出します。
（まとめて作成させるとエラーが頻発したため、実際には1ページずつ作成させました）

```txt prompt.txt
インフラ設計内容およびAWS構成図を記載するスライドを作成してください。

目的は、今回の検証目的・前提条件・設計方針・コスト配慮、および具体的なAWSインフラ構成について読み手が理解できるようにすることです。

・スライド全体の要件
AWSインフラ設計資料のような体裁にする
設計内容を説明するページとAWS構成図のページを分けて、一つのスライドを作成する
見出し、箇条書き、簡単な表を使って分かりやすく整理する

・作成するスライド
ページ1: 検証の目的
ページ2: 設計前提および設計方針
ページ3: 作成対象リソース
ページ4: AWS構成図

・デザイン要件
落ち着いた技術資料風のデザインにする
AWSカラーを意識しつつ、過度に派手にしない
各スライドは情報を詰め込みすぎない
4ページ目のAWS構成図に続く前提で、設計説明資料として自然につながる構成にする
```

スライド作成が始まります。
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_12.38.58.png" alt="スクリーンショット_2026-04-30_12.38.58.png" width="1200" height="711" loading="lazy">

作成が完了しました！
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_13.34.20.png" alt="スクリーンショット_2026-04-30_13.34.20.png" width="1200" height="711" loading="lazy">

以下が作成されたスライド4ページ分です。
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_13.38.21.png" alt="スクリーンショット_2026-04-30_13.38.21.png" width="1200" height="676" loading="lazy">
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_13.38.39.png" alt="スクリーンショット_2026-04-30_13.38.39.png" width="1200" height="676" loading="lazy">
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_13.38.53.png" alt="スクリーンショット_2026-04-30_13.38.53.png" width="1200" height="676" loading="lazy">
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_13.39.03.png" alt="スクリーンショット_2026-04-30_13.39.03.png" width="1200" height="676" loading="lazy">

指示に従い、検証・設計内容を忠実にスライドに反映してくれています。
また、リージョンやAZ、VPCやサブネットのCIDRなどは明確に指示していませんが、よしなに設定してくれています。今回は特に変更の必要がないので、この設定をそのまま採用します。

続いて、以下プロンプトで各リソースの主要設定値を整理してもらいます。

```txt prompt.txt
現在作成済みの4ページ分のスライドに続けて、5ページ目以降に「各AWSリソースの主要設定値」を整理するスライドを追加してください。

目的は、後続でこの設計資料をもとにTerraformコードを作成する際に、必要な主要設定値を読み取れるようにすることです。

ただし、すべての設定値を網羅するとスライドが多くなりすぎるため、Terraform実装時に特に重要となる設定値に絞ってください。
追加スライド数は必要に応じて増やして構いませんが、全体として多くなりすぎないようにし、1スライドに複数リソースをまとめられる場合はまとめてください。

・全体のデザイン要件
既存4ページのデザインとトーンを合わせてください
AWS設計資料らしい落ち着いた技術資料風にしてください
1スライドに情報を詰め込みすぎないでください
ただし、スライド数が増えすぎないように、関連するリソースはまとめてください
表を中心に、Terraform実装時に読み取りやすい構成にしてください
Terraform実装の前段資料として、設計内容が具体化された状態になるようにしてください
文章は簡潔にし、設定値と補足が分かりやすいようにしてください
```

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_14.05.28.png" alt="スクリーンショット_2026-04-30_14.05.28.png" width="1200" height="676" loading="lazy">

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_14.05.47.png" alt="スクリーンショット_2026-04-30_14.05.47.png" width="1200" height="676" loading="lazy">

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_14.06.01.png" alt="スクリーンショット_2026-04-30_14.06.01.png" width="1200" height="676" loading="lazy">

Claude Designには使用量の週次リミットがあり、到達してしまいそうだったためスライド作成はここまでとします。
細かい不備は少々あれど、必要最低限の内容は表現できており、資料の叩き台としては十分なレベルです。
構成図については、AWSが公式に提供するアイコンアセットを事前に読み込ませると、より視認性の高い図になるかもしれません。興味のある方は試してみてください。

## 4. ステップ2： Terraformコードの生成

ここからは、Claude DesignがまとめてくれたAWS構成および各リソースの設定値をベースに、Terraformコードを作成していきます。
前提として、ローカル環境にはTerraform CLIとAWS CLIの事前インストールが必要です。
事前に以下で認証確認を行っています。

```bash
aws sts get-caller-identity
terraform version
```

まずはClaude Designの右上にあるShareボタンから、"Handoff to Claude Code"ボタンを押下します。

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_14.59.20.png" alt="スクリーンショット_2026-04-30_14.59.20.png" width="1200" height="680" loading="lazy">

ここで一点注意が必要です。

今回出力されたDesign bundleのREADMEを見る限り、Handoff機能は、Claude DesignによりHTML/CSS/JSで作成されたデザインプロトタイプを、Claude Codeなどのコーディングエージェントに渡してそのままWeb UIとして実装することを想定しているようです。

具体的には、デザインプロトタイプをWeb UIとして実装する旨が記載されたREADME.mdをClaude Design側が自動で作成しており、Claude Codeはその指示を読み取り実装を行う、という仕組みです（README.mdはOPTIONSの"Download zip instead"からzipダウンロードすると確認できます）。

今回の目的はWeb UIの実装ではなく、設計資料に記載されたAWS構成をTerraformコードへ落とし込むことです。そのため、READMEの指示には従わずHTML内の設計内容を読み取ってTerraformコードを生成するよう、以下の通り追加で指示しました。

```txt instruction.txt
このHandoff bundleはClaude Designで作成したHTML/CSS/JSベースの設計資料ですが、今回の目的はWeb画面の再実装ではありません。

READMEにはデザインをpixel-perfectに再実装するよう書かれていますが、その指示は今回の目的には従わないでください。

今回の目的は、Design bundle内の `AWS構成説明.html` に記載されたAWS設計内容、構成図、リソース一覧、主要設定値を読み取り、それをもとにTerraformコードを作成することです。

HTML/CSS/JSのUIをReactやWebアプリとして再実装しないでください。
デザインの見た目再現ではなく、設計内容の抽出とTerraform実装を実施してください。
```

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_15.10.27.png" alt="スクリーンショット_2026-04-30_15.10.27.png" width="1200" height="680" loading="lazy">

Copy commandボタンでコマンドをコピーし、Claude Code側に貼り付けます。
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_15.12.32.png" alt="スクリーンショット_2026-04-30_15.12.32.png" width="1200" height="781" loading="lazy">

Claude Code側でDesign bundleを取得できない旨のエラーが出たため、今回はDesign bundleをzipダウンロードし、プロジェクトルートに配置します（この際なので、README.mdは最初から配置しないこととしました）。

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_15.19.59.png" alt="スクリーンショット_2026-04-30_15.19.59.png" width="1200" height="781" loading="lazy">

気を取り直して、以下のプロンプトでTerraformコード作成の指示を行います。

```txt prompt.txt
designbundle/配下に格納されている設計スライドとAWS構成図をもとに、Terraformコードを作成してください。
作業対象は、このリポジトリの terraform/ ディレクトリ配下のみとしてください。

# 目的
Claude Designで作成したAWS構成図から、Terraformコードを生成し、実際にAWS上へapplyできるかを検証します。

# 要件
- Terraformコードは用途ごとにファイル分割してください
- 変数は variables.tf に定義してください
- 出力値は outputs.tf に定義してください
- コンテナイメージは public.ecr.aws/nginx/nginx:latest を使用してください
- terraform fmt / validate が通る構成にしてください

# 作成してほしいファイル例
terraform/
├── providers.tf
├── variables.tf
├── outputs.tf
├── vpc.tf
├── security_groups.tf
├── alb.tf
├── ecs.tf
├── iam.tf
└── cloudwatch.tf
```

terraformファイルが作成され始めました！

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_15.27.38.png" alt="スクリーンショット_2026-04-30_15.27.38.png" width="1200" height="781" loading="lazy">

作成が完了し、設計書からの対応関係も出力してくれました。

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_15.31.29.png" alt="スクリーンショット_2026-04-30_15.31.29.png" width="1200" height="781" loading="lazy">

terraform planで構築内容を確認します。
<details><summary>terraform planの結果</summary>

```tfplan.log
Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_cloudwatch_log_group.ecs will be created
  + resource "aws_cloudwatch_log_group" "ecs" {
      + arn               = (known after apply)
      + id                = (known after apply)
      + log_group_class   = (known after apply)
      + name              = "/ecs/claude-aws-demo"
      + name_prefix       = (known after apply)
      + retention_in_days = 30
      + skip_destroy      = false
      + tags              = {
          + "Name" = "/ecs/claude-aws-demo"
        }
      + tags_all          = {
          + "Name" = "/ecs/claude-aws-demo"
        }
    }

  # aws_ecs_cluster.main will be created
  + resource "aws_ecs_cluster" "main" {
      + arn      = (known after apply)
      + id       = (known after apply)
      + name     = "claude-aws-demo-cluster"
      + tags     = {
          + "Name" = "claude-aws-demo-cluster"
        }
      + tags_all = {
          + "Name" = "claude-aws-demo-cluster"
        }

      + setting (known after apply)
    }

  # aws_ecs_service.main will be created
  + resource "aws_ecs_service" "main" {
      + availability_zone_rebalancing      = "DISABLED"
      + cluster                            = (known after apply)
      + deployment_maximum_percent         = 200
      + deployment_minimum_healthy_percent = 100
      + desired_count                      = 2
      + enable_ecs_managed_tags            = false
      + enable_execute_command             = false
      + iam_role                           = (known after apply)
      + id                                 = (known after apply)
      + launch_type                        = "FARGATE"
      + name                               = "claude-aws-demo-service"
      + platform_version                   = (known after apply)
      + scheduling_strategy                = "REPLICA"
      + tags                               = {
          + "Name" = "claude-aws-demo-service"
        }
      + tags_all                           = {
          + "Name" = "claude-aws-demo-service"
        }
      + task_definition                    = (known after apply)
      + triggers                           = (known after apply)
      + wait_for_steady_state              = false

      + load_balancer {
          + container_name   = "claude-aws-demo"
          + container_port   = 80
          + target_group_arn = (known after apply)
            # (1 unchanged attribute hidden)
        }

      + network_configuration {
          + assign_public_ip = true
          + security_groups  = (known after apply)
          + subnets          = (known after apply)
        }
    }

  # aws_ecs_task_definition.main will be created
  + resource "aws_ecs_task_definition" "main" {
      + arn                      = (known after apply)
      + arn_without_revision     = (known after apply)
      + container_definitions    = jsonencode(
            [
              + {
                  + essential        = true
                  + image            = "public.ecr.aws/nginx/nginx:latest"
                  + logConfiguration = {
                      + logDriver = "awslogs"
                      + options   = {
                          + awslogs-group         = "/ecs/claude-aws-demo"
                          + awslogs-region        = "ap-northeast-1"
                          + awslogs-stream-prefix = "ecs"
                        }
                    }
                  + name             = "claude-aws-demo"
                  + portMappings     = [
                      + {
                          + containerPort = 80
                          + protocol      = "tcp"
                        },
                    ]
                },
            ]
        )
      + cpu                      = "256"
      + enable_fault_injection   = (known after apply)
      + execution_role_arn       = (known after apply)
      + family                   = "claude-aws-demo-task"
      + id                       = (known after apply)
      + memory                   = "512"
      + network_mode             = "awsvpc"
      + requires_compatibilities = [
          + "FARGATE",
        ]
      + revision                 = (known after apply)
      + skip_destroy             = false
      + tags                     = {
          + "Name" = "claude-aws-demo-task"
        }
      + tags_all                 = {
          + "Name" = "claude-aws-demo-task"
        }
      + track_latest             = false
    }

  # aws_iam_role.ecs_task_execution will be created
  + resource "aws_iam_role" "ecs_task_execution" {
      + arn                   = (known after apply)
      + assume_role_policy    = jsonencode(
            {
              + Statement = [
                  + {
                      + Action    = "sts:AssumeRole"
                      + Effect    = "Allow"
                      + Principal = {
                          + Service = "ecs-tasks.amazonaws.com"
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
      + name                  = "claude-aws-demo-ecs-task-execution-role"
      + name_prefix           = (known after apply)
      + path                  = "/"
      + tags                  = {
          + "Name" = "claude-aws-demo-ecs-task-execution-role"
        }
      + tags_all              = {
          + "Name" = "claude-aws-demo-ecs-task-execution-role"
        }
      + unique_id             = (known after apply)

      + inline_policy (known after apply)
    }

  # aws_iam_role_policy_attachment.ecs_task_execution will be created
  + resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
      + id         = (known after apply)
      + policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
      + role       = "claude-aws-demo-ecs-task-execution-role"
    }

  # aws_internet_gateway.main will be created
  + resource "aws_internet_gateway" "main" {
      + arn      = (known after apply)
      + id       = (known after apply)
      + owner_id = (known after apply)
      + tags     = {
          + "Name" = "claude-aws-demo-igw"
        }
      + tags_all = {
          + "Name" = "claude-aws-demo-igw"
        }
      + vpc_id   = (known after apply)
    }

  # aws_lb.main will be created
  + resource "aws_lb" "main" {
      + arn                                                          = (known after apply)
      + arn_suffix                                                   = (known after apply)
      + client_keep_alive                                            = 3600
      + desync_mitigation_mode                                       = "defensive"
      + dns_name                                                     = (known after apply)
      + drop_invalid_header_fields                                   = false
      + enable_deletion_protection                                   = false
      + enable_http2                                                 = true
      + enable_tls_version_and_cipher_suite_headers                  = false
      + enable_waf_fail_open                                         = false
      + enable_xff_client_port                                       = false
      + enable_zonal_shift                                           = false
      + enforce_security_group_inbound_rules_on_private_link_traffic = (known after apply)
      + id                                                           = (known after apply)
      + idle_timeout                                                 = 60
      + internal                                                     = false
      + ip_address_type                                              = (known after apply)
      + load_balancer_type                                           = "application"
      + name                                                         = "claude-aws-demo-alb"
      + name_prefix                                                  = (known after apply)
      + preserve_host_header                                         = false
      + security_groups                                              = (known after apply)
      + subnets                                                      = (known after apply)
      + tags                                                         = {
          + "Name" = "claude-aws-demo-alb"
        }
      + tags_all                                                     = {
          + "Name" = "claude-aws-demo-alb"
        }
      + vpc_id                                                       = (known after apply)
      + xff_header_processing_mode                                   = "append"
      + zone_id                                                      = (known after apply)

      + subnet_mapping (known after apply)
    }

  # aws_lb_listener.http will be created
  + resource "aws_lb_listener" "http" {
      + arn                                                                   = (known after apply)
      + id                                                                    = (known after apply)
      + load_balancer_arn                                                     = (known after apply)
      + port                                                                  = 80
      + protocol                                                              = "HTTP"
      + routing_http_request_x_amzn_mtls_clientcert_header_name               = (known after apply)
      + routing_http_request_x_amzn_mtls_clientcert_issuer_header_name        = (known after apply)
      + routing_http_request_x_amzn_mtls_clientcert_leaf_header_name          = (known after apply)
      + routing_http_request_x_amzn_mtls_clientcert_serial_number_header_name = (known after apply)
      + routing_http_request_x_amzn_mtls_clientcert_subject_header_name       = (known after apply)
      + routing_http_request_x_amzn_mtls_clientcert_validity_header_name      = (known after apply)
      + routing_http_request_x_amzn_tls_cipher_suite_header_name              = (known after apply)
      + routing_http_request_x_amzn_tls_version_header_name                   = (known after apply)
      + routing_http_response_access_control_allow_credentials_header_value   = (known after apply)
      + routing_http_response_access_control_allow_headers_header_value       = (known after apply)
      + routing_http_response_access_control_allow_methods_header_value       = (known after apply)
      + routing_http_response_access_control_allow_origin_header_value        = (known after apply)
      + routing_http_response_access_control_expose_headers_header_value      = (known after apply)
      + routing_http_response_access_control_max_age_header_value             = (known after apply)
      + routing_http_response_content_security_policy_header_value            = (known after apply)
      + routing_http_response_server_enabled                                  = (known after apply)
      + routing_http_response_strict_transport_security_header_value          = (known after apply)
      + routing_http_response_x_content_type_options_header_value             = (known after apply)
      + routing_http_response_x_frame_options_header_value                    = (known after apply)
      + ssl_policy                                                            = (known after apply)
      + tags_all                                                              = (known after apply)
      + tcp_idle_timeout_seconds                                              = (known after apply)

      + default_action {
          + order            = (known after apply)
          + target_group_arn = (known after apply)
          + type             = "forward"
        }

      + mutual_authentication (known after apply)
    }

  # aws_lb_target_group.main will be created
  + resource "aws_lb_target_group" "main" {
      + arn                                = (known after apply)
      + arn_suffix                         = (known after apply)
      + connection_termination             = (known after apply)
      + deregistration_delay               = "300"
      + id                                 = (known after apply)
      + ip_address_type                    = (known after apply)
      + lambda_multi_value_headers_enabled = false
      + load_balancer_arns                 = (known after apply)
      + load_balancing_algorithm_type      = (known after apply)
      + load_balancing_anomaly_mitigation  = (known after apply)
      + load_balancing_cross_zone_enabled  = (known after apply)
      + name                               = "claude-aws-demo-tg"
      + name_prefix                        = (known after apply)
      + port                               = 80
      + preserve_client_ip                 = (known after apply)
      + protocol                           = "HTTP"
      + protocol_version                   = (known after apply)
      + proxy_protocol_v2                  = false
      + slow_start                         = 0
      + tags                               = {
          + "Name" = "claude-aws-demo-tg"
        }
      + tags_all                           = {
          + "Name" = "claude-aws-demo-tg"
        }
      + target_type                        = "ip"
      + vpc_id                             = (known after apply)

      + health_check {
          + enabled             = true
          + healthy_threshold   = 2
          + interval            = 30
          + matcher             = "200"
          + path                = "/"
          + port                = "traffic-port"
          + protocol            = "HTTP"
          + timeout             = 5
          + unhealthy_threshold = 2
        }

      + stickiness (known after apply)

      + target_failover (known after apply)

      + target_group_health (known after apply)

      + target_health_state (known after apply)
    }

  # aws_route_table.public will be created
  + resource "aws_route_table" "public" {
      + arn              = (known after apply)
      + id               = (known after apply)
      + owner_id         = (known after apply)
      + propagating_vgws = (known after apply)
      + route            = [
          + {
              + cidr_block                 = "0.0.0.0/0"
              + gateway_id                 = (known after apply)
                # (11 unchanged attributes hidden)
            },
        ]
      + tags             = {
          + "Name" = "claude-aws-demo-public-rt"
        }
      + tags_all         = {
          + "Name" = "claude-aws-demo-public-rt"
        }
      + vpc_id           = (known after apply)
    }

  # aws_route_table_association.public_1 will be created
  + resource "aws_route_table_association" "public_1" {
      + id             = (known after apply)
      + route_table_id = (known after apply)
      + subnet_id      = (known after apply)
    }

  # aws_route_table_association.public_2 will be created
  + resource "aws_route_table_association" "public_2" {
      + id             = (known after apply)
      + route_table_id = (known after apply)
      + subnet_id      = (known after apply)
    }

  # aws_security_group.alb will be created
  + resource "aws_security_group" "alb" {
      + arn                    = (known after apply)
      + description            = "ALB: allow HTTP from internet"
      + egress                 = [
          + {
              + cidr_blocks      = [
                  + "0.0.0.0/0",
                ]
              + description      = "allow all outbound"
              + from_port        = 0
              + ipv6_cidr_blocks = []
              + prefix_list_ids  = []
              + protocol         = "-1"
              + security_groups  = []
              + self             = false
              + to_port          = 0
            },
        ]
      + id                     = (known after apply)
      + ingress                = [
          + {
              + cidr_blocks      = [
                  + "0.0.0.0/0",
                ]
              + description      = "HTTP from internet"
              + from_port        = 80
              + ipv6_cidr_blocks = []
              + prefix_list_ids  = []
              + protocol         = "tcp"
              + security_groups  = []
              + self             = false
              + to_port          = 80
            },
        ]
      + name                   = "claude-aws-demo-alb-sg"
      + name_prefix            = (known after apply)
      + owner_id               = (known after apply)
      + revoke_rules_on_delete = false
      + tags                   = {
          + "Name" = "claude-aws-demo-alb-sg"
        }
      + tags_all               = {
          + "Name" = "claude-aws-demo-alb-sg"
        }
      + vpc_id                 = (known after apply)
    }

  # aws_security_group.ecs will be created
  + resource "aws_security_group" "ecs" {
      + arn                    = (known after apply)
      + description            = "ECS tasks: allow HTTP from ALB SG only"
      + egress                 = [
          + {
              + cidr_blocks      = [
                  + "0.0.0.0/0",
                ]
              + description      = "allow all outbound (ECR pull, CloudWatch Logs)"
              + from_port        = 0
              + ipv6_cidr_blocks = []
              + prefix_list_ids  = []
              + protocol         = "-1"
              + security_groups  = []
              + self             = false
              + to_port          = 0
            },
        ]
      + id                     = (known after apply)
      + ingress                = [
          + {
              + cidr_blocks      = []
              + description      = "HTTP from ALB SG"
              + from_port        = 80
              + ipv6_cidr_blocks = []
              + prefix_list_ids  = []
              + protocol         = "tcp"
              + security_groups  = (known after apply)
              + self             = false
              + to_port          = 80
            },
        ]
      + name                   = "claude-aws-demo-ecs-sg"
      + name_prefix            = (known after apply)
      + owner_id               = (known after apply)
      + revoke_rules_on_delete = false
      + tags                   = {
          + "Name" = "claude-aws-demo-ecs-sg"
        }
      + tags_all               = {
          + "Name" = "claude-aws-demo-ecs-sg"
        }
      + vpc_id                 = (known after apply)
    }

  # aws_subnet.public_1 will be created
  + resource "aws_subnet" "public_1" {
      + arn                                            = (known after apply)
      + assign_ipv6_address_on_creation                = false
      + availability_zone                              = "ap-northeast-1a"
      + availability_zone_id                           = (known after apply)
      + cidr_block                                     = "10.0.1.0/24"
      + enable_dns64                                   = false
      + enable_resource_name_dns_a_record_on_launch    = false
      + enable_resource_name_dns_aaaa_record_on_launch = false
      + id                                             = (known after apply)
      + ipv6_cidr_block_association_id                 = (known after apply)
      + ipv6_native                                    = false
      + map_public_ip_on_launch                        = true
      + owner_id                                       = (known after apply)
      + private_dns_hostname_type_on_launch            = (known after apply)
      + tags                                           = {
          + "Name" = "claude-aws-demo-public-subnet-1"
        }
      + tags_all                                       = {
          + "Name" = "claude-aws-demo-public-subnet-1"
        }
      + vpc_id                                         = (known after apply)
    }

  # aws_subnet.public_2 will be created
  + resource "aws_subnet" "public_2" {
      + arn                                            = (known after apply)
      + assign_ipv6_address_on_creation                = false
      + availability_zone                              = "ap-northeast-1c"
      + availability_zone_id                           = (known after apply)
      + cidr_block                                     = "10.0.2.0/24"
      + enable_dns64                                   = false
      + enable_resource_name_dns_a_record_on_launch    = false
      + enable_resource_name_dns_aaaa_record_on_launch = false
      + id                                             = (known after apply)
      + ipv6_cidr_block_association_id                 = (known after apply)
      + ipv6_native                                    = false
      + map_public_ip_on_launch                        = true
      + owner_id                                       = (known after apply)
      + private_dns_hostname_type_on_launch            = (known after apply)
      + tags                                           = {
          + "Name" = "claude-aws-demo-public-subnet-2"
        }
      + tags_all                                       = {
          + "Name" = "claude-aws-demo-public-subnet-2"
        }
      + vpc_id                                         = (known after apply)
    }

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + arn                                  = (known after apply)
      + cidr_block                           = "10.0.0.0/16"
      + default_network_acl_id               = (known after apply)
      + default_route_table_id               = (known after apply)
      + default_security_group_id            = (known after apply)
      + dhcp_options_id                      = (known after apply)
      + enable_dns_hostnames                 = true
      + enable_dns_support                   = true
      + enable_network_address_usage_metrics = (known after apply)
      + id                                   = (known after apply)
      + instance_tenancy                     = "default"
      + ipv6_association_id                  = (known after apply)
      + ipv6_cidr_block                      = (known after apply)
      + ipv6_cidr_block_network_border_group = (known after apply)
      + main_route_table_id                  = (known after apply)
      + owner_id                             = (known after apply)
      + tags                                 = {
          + "Name" = "claude-aws-demo-vpc"
        }
      + tags_all                             = {
          + "Name" = "claude-aws-demo-vpc"
        }
    }

Plan: 18 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + alb_arn                     = (known after apply)
  + alb_dns_name                = (known after apply)
  + cloudwatch_log_group_name   = "/ecs/claude-aws-demo"
  + ecs_cluster_name            = "claude-aws-demo-cluster"
  + ecs_service_name            = "claude-aws-demo-service"
  + ecs_task_execution_role_arn = (known after apply)
  + public_subnet_ids           = [
      + (known after apply),
      + (known after apply),
    ]
  + vpc_id                      = (known after apply)

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Saved the plan to: tfplan

To perform exactly these actions, run the following command to apply:
    terraform apply "tfplan"
```

</details>

plan結果を確認したところ、想定していた主要リソースが作成対象になっていることを確認できました。

CloudWatch Logsの保持期間やECSタスク数など、コストに関わる設定は環境に応じて調整余地がありますが、今回は検証後すぐにdestroyする前提のため、このままterraform applyで構築を実施します。

```tfapply.log
Apply complete! Resources: 18 added, 0 changed, 0 destroyed.
```

## 5. ステップ3： 疎通確認

AWSマネジメントコンソールから、構築されたリソースを確認します。

ALBからECSへの接続設定が完了していることがわかります。その他、VPC関連リソースやIAM、CloudWatch Logs等のリソースも正しく構築されていることを確認しました。

<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_16.16.55.png" alt="スクリーンショット_2026-04-30_16.16.55.png" width="1200" height="363" loading="lazy">

ブラウザからALBのデフォルトDNS名を指定しアクセスしてみます。
<img src="/images/2026/20260501a/スクリーンショット_2026-04-30_16.20.16.png" alt="スクリーンショット_2026-04-30_16.20.16.png" width="1200" height="397" loading="lazy">

接続ができました！

なお、今回作成したALBやECS Fargateは料金が発生するため、疎通確認後は以下のコマンドで削除しました。

```bash
terraform destroy
```

## 6. おわりに

今回は、Claude DesignでAWS構成図を含む設計資料を作成し、その内容をClaude Codeへ引き継いでTerraformコードを生成し、実際にAWSリソースを構築するところまで検証しました。

最初に考えていた「インフラ構成のお絵描きからリソース実装までをClaudeで一本化できるのではないか」という仮説については、少なくとも今回のようなシンプルな構成であれば、十分に実現できる感触がありました。

特に良かった点は、**設計資料・構成図・Terraformコード作成の流れを、自然言語ベースでつなげられることです**。従来であれば、設計資料を作り、構成図を描き、それを見ながらTerraformコードを書く、という工程を人間が手作業でつないでいました。今回は、Claude Designで整理した設計情報をClaude Codeに読み取らせることで、Terraformコードのたたき台をかなり短時間で作成できました。

また、資料やコード生成の品質も高く、今回私が実施したのはClaudeへの指示と生成コードのレビュー、terraform plan、terraform applyの実行だけでした。Claude Designはスライドのテンプレートを指定したり、事前情報として画像やファイルをインプットしたりできるので、それらを活用すればさらなる品質向上が期待できます。

今回はあくまで検証用の簡易構成だったため、大規模なシステム基盤設計・構築にそのまま適用することは難しい（Claude Designの使用量制限も意外とすぐ来るし...）ですが、ちょっとした検証等には使えるのではないでしょうか。

構成図や設計資料のたたき台を作る、Terraformコードの初版を作る、レビュー観点を洗い出す、といった場面ではかなり有効だと思いました。

Claude Design、皆さんもぜひ活用してみてください！
