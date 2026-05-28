---
title: "moto に Terraform を打ち込み、基本的なイベント駆動の構成を動かしてみた"
date: 2026/05/28 00:00:00
postid: a
tag:
  - Terraform
  - moto
  - モック
category:
  - Infrastructure
thumbnail: /images/2026/20260528a/thumbnail.png
author: 市川裕也
lede: "Terraform を打ち込むことができる AWS エミュレータの「moto」を紹介します。"
---
# はじめに

こんにちは。 CSIG の市川です。

[Terraform連載](/articles/20260518a/)ということで、Terraform を打ち込むことができる AWS エミュレータの「moto」を紹介します。

ローカルや CI 上で AWS・ Terraform のテストをしたいときのエミュレータとして、これまでは LocalStack が採用されるケースが多かったかと思います。

ただ 2026 年 3 月に Community Edition が廃止され、統合イメージへの移行と認証トークンの必須化が行われました。その後フィードバックを受けて非商用限定の Hobby プランも用意されましたが、いずれにせよ「アカウント登録 + 認証トークン」が必要になっています。 (参考: https://www.localstack.cloud/pricing#Tab%201)
「ローカルで気軽に使いたい」「CI 上で認証なしで使いたい」というユースケースに対しては、以前ほど手軽ではなくなりました。

そこで、認証も登録もいらない代替を探していて見つけたのが [moto](https://github.com/getmoto/moto) です。
(他にも、 [floci](https://floci.io/) や [kumo](https://github.com/sivchari/kumo) といったエミュレータもありましたが、今回の記事ではスコープ外とさせていただきます)

この記事では、moto に対して Terraform を打ち込み、さらに「S3 → SQS → コンテナ」というイベント駆動の構成が動くところまでをローカルで検証します。

# この記事を読むとできるようになること

- `docker compose up` で立ち上げた moto に対して、Terraform で AWS リソースを作成できる
- S3 → SQS → ECS サービス という典型的なイベント駆動構成が moto 上で動くかどうか、自分の目で確かめられる
- moto で「どこまで再現できて、どこからは無理か」が判断できるようになる

# moto とは

[moto](https://github.com/getmoto/moto) はもともと Python の [boto3](https://github.com/boto/boto3) 用のユニットテスト向け mock ライブラリです。

なのですが、 moto には「サーバーモード」というモードも用意されています(使い方については、 [サーバーモードのドキュメント](https://docs.getmoto.org/en/latest/docs/server_mode.html#example-usage)を参考にしてください)。

サーバーモードは、Docker コンテナとして起動でき、起動すると HTTP で AWS API を受け付けるエンドポイントが立ち上がります。サーバーモードに対しては、Terraform を実行したり aws-cli を叩くことができます。

今回はこのサーバーモードを使います。対応サービスの一覧は公式の [Implementation Coverage](https://docs.getmoto.org/en/latest/docs/services/index.html) に記載されています。S3 / SQS / IAM / ECS / CloudWatch Logs / DynamoDB / Lambda など、よく使うサービスが幅広くカバーされています。

# moto と LocalStack の使い分け

ざっくり並べるとこんな印象です。

|                          | moto                                                 | LocalStack                                                 |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------------------------- |
| アカウント登録           | **不要**                                             | 必要（無料の Hobby プランでも認証トークン要）              |
| セットアップ             | `docker run motoserver/moto`                         | イメージ pull + トークン設定                               |
| 商用利用                 | 制限なし                                             | 有料プラン必須                                             |
| サービス間連携の再現度   | S3 → SQS など基本的な連携は再現可。Lambda の自動起動や Cognito の Custom Auth Flow といった連携は基本不可 | 広め。Lambda 自動起動など、moto では不可な連携も一部対応   |
| 対応サービス数 / カバレッジ | 主要 AWS サービスを幅広くカバー。すべて無料 | 無料の Hobby は約 30 サービス。RDS・Athena・Glue などデータ / 分析系は有料プラン限定 |

「Lambda が SQS から自動で起動する」「Cognito の状態遷移を再現する」みたいなことをしたい場合は LocalStack（有料機能を含めて）を使用する必要がありますが、「API レスポンスと、ごく一部の副作用さえあれば良い」という用途であれば、 moto で十分なケースが多そうです。

# 今回検証すること

この記事では 2 つのことを試します。

- **試したいこと（1）**：Terraform を moto に打ち込めるか
- **試したいこと（2）**：S3 → SQS → ECS サービス のイベント駆動が moto 上で動くか（副作用ありのフローも再現できるか）

普段業務でよく使っている構成を参考に、以下のような構成図のインフラリソースを作成します。

```sh
put JSON --> [S3] --event--> [SQS] --ポーリング--> [ECS サービス 相当のコンテナ] --> ログ出力
```

<img src="/images/2026/20260528a/image.png" alt="image.png" width="666" height="180" loading="lazy">

- コンテナ : SQS をポーリングし、メッセージから S3 のキーを取り出してログ出力するコンテナ

動作検証を行ったリポジトリは [moto-terraform](https://github.com/yy-at-here/moto-terraform) に上げているので、興味がある方はご参照ください。

# 準備: moto のサーバーモードを立ち上げる

`docker-compose.yml` で `motoserver/moto` を起動します。

```yaml
services:
  moto:
    image: motoserver/moto:latest
    ports:
      - "5050:5000"
```

この段階で `s3 ls` コマンドを叩くと、空文字列が返ってくることが確認できます。

```bash
% docker compose up -d moto
% aws --endpoint-url http://localhost:5050 s3 ls

%
```

# 試したいこと（1） : Terraform を moto に打ち込む

ここからが本題のひとつめです。
Terraform の provider が向く先を moto に切り替えていきます。

## Terraform に moto を打ち込むための設定

以下のような `main.tf` を使用する想定とします。

```tf
# terraform/main.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.env
      ManagedBy   = "terraform"
    }
  }
}
```

Terraform には、`*_override.tf` というファイル名で書いたリソース定義が、同名のリソースをマージで上書きしてくれる機構があります（[Override Files](https://developer.hashicorp.com/terraform/language/files/override)）。

moto を向くための設定を `override.tf` に切り出すことで、 `main.tf` を編集することなく、moto に向く設定に上書きできます。

```tf
# terraform/override.tf
variable "use_moto" {
  default = true
}

provider "aws" {
  region                      = "ap-northeast-2"
  access_key                  = "testing"
  secret_key                  = "testing"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3             = "http://localhost:5050"
    sqs            = "http://localhost:5050"
    ecs            = "http://localhost:5050"
    iam            = "http://localhost:5050"
    ec2            = "http://localhost:5050"
    ecr            = "http://localhost:5050"
    sts            = "http://localhost:5050"
    cloudwatchlogs = "http://localhost:5050"
  }
}
```

特記事項は以下のとおり:

- ローカル完結なので `access_key` / `secret_key` / `region` は任意の文字列で可。
- 以下を参考に、 `skip_~~` 系を true に設定しました。
  - [Non-Python SDK’s / Server Mode / Example Usage](https://docs.getmoto.org/en/latest/docs/server_mode.html#example-usage)
- ローカルだと S3 の `s3_use_path_style` を有効にしておく必要があります。これを設定しないと、ローカルでの名前解決が正しく行われません。本題から逸れるので、理由はトグルの中に入れておきます。気になる方は以下のトグルをご参照ください。

<details><summary>s3_use_path_style = true が必要な理由:</summary>

**▪️ 2 つのアクセス URL 形式**

`s3_use_path_style` とは、S3 の URL の組み立て方を「パススタイル」に強制する設定です。
S3 へのアクセス URL には2つの形式があります。

| 形式                        | URL の例                                   |
| --------------------------- | ------------------------------------------ |
| 仮想ホスト形式 (デフォルト) | https://my-bucket.s3.amazonaws.com/key.txt |
| パススタイル形式            | https://s3.amazonaws.com/my-bucket/key.txt |

仮想ホスト形式はバケット名がサブドメインに入りますが、パススタイルはパスの一部として入ります。

**▪️ なぜ moto では true が必要か**

moto は http://localhost:5050 の単一エンドポイントで動いています。仮想ホスト形式を使うと、AWS SDK は以下のような URL を組み立てようとします。

```sh
http://my-bucket.localhost:5050/key.txt
```

これは、

- my-bucket.localhost という名前解決ができない (DNS に存在しない)
- moto サーバーは localhost:5050 でしか listen していない

ため、接続できずに失敗します。

s3_use_path_style = true にすると、以下のような URL になります。

```sh
http://localhost:5050/my-bucket/key.txt
```

これなら moto サーバーに正しく届きます。

</details>

### 作成するリソース (一部抜粋)

S3 バケットと SQS キューを、以下の設定で作成します。

```tf S3
resource "aws_s3_bucket" "main" {
  bucket        = "${var.env}-json-bucket"
  force_destroy = true
}

resource "aws_s3_bucket_notification" "to_sqs" {
  bucket = aws_s3_bucket.main.id

  queue {
    queue_arn     = aws_sqs_queue.main.arn
    events        = ["s3:ObjectCreated:*"]
    filter_suffix = ".json"
  }
}
```


```tf SQS
resource "aws_sqs_queue" "main" {
  name                       = "${var.env}-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
}

resource "aws_sqs_queue_policy" "allow_s3" {
  queue_url = aws_sqs_queue.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.main.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_s3_bucket.main.arn
          }
        }
      }
    ]
  })
}
```

## Terraform コマンドが実行できることを確認する

ここまで揃ったら、あとは Terraform コマンドを叩くだけです。

```bash
% cd terraform
% terraform init
% terraform apply -auto-approve
...
Apply complete! Resources: 17 added, 0 changed, 0 destroyed.
```

apply が通ることを確認できました。

リソースが作成されたかも確認してみます。
`--endpoint-url` で moto を向ければ、AWS CLI からリソースが見えます。
Terraform で定義した通りに S3 バケットと SQS キューが作られていることが確認できました。

```bash
% aws --endpoint-url http://localhost:5050 s3 ls
2026-04-07 22:30:11 moto-test-json-bucket

% aws --endpoint-url http://localhost:5050 --region ap-northeast-2 sqs list-queues
QueueUrls:
- http://localhost:5050/123456789012/moto-test-queue
```

# 試したいこと（2） : S3 → SQS → コンテナ のイベント駆動を動かす

次は副作用ありのフローを試します。
S3 にオブジェクトが作成されたら自動的に SQS にイベント通知が飛び、それを ECS サービスが拾って後段で処理する、という構成を moto 上で動かします。

<img src="/images/2026/20260528a/image_2.png" alt="image.png" width="666" height="180" loading="lazy">

[S3 のドキュメント](https://docs.getmoto.org/en/latest/docs/services/s3.html) には「ObjectCreated された際の SQS への通知をサポートしている」旨の記載があるため、 Put 時の SQS への通知も飛んでくれるはずです。
これを、実際に動かして検証してみます。

> The configuration can be persisted, but at the moment we only send notifications to the following targets:
>
> - AWSLambda
> - SNS
> - SQS
> - EventBridge
>
> For the following events:
>
> - s3:ObjectCreated:CompleteMultipartUpload
> - s3:ObjectCreated:Copy
> - s3:ObjectCreated:Post
> - s3:ObjectCreated:Put
> - s3:ObjectDeleted
> - s3:ObjectRestore:Post

## S3 → SQS の通知設定

Terraform で、以下のような S3 イベント通知を設定します。

```tf
# terraform/s3.tf
resource "aws_s3_bucket" "main" {
  bucket        = "${var.env}-json-bucket"
  force_destroy = true
}

resource "aws_s3_bucket_notification" "to_sqs" {
  bucket = aws_s3_bucket.main.id

  queue {
    queue_arn     = aws_sqs_queue.main.arn
    events        = ["s3:ObjectCreated:*"]
    filter_suffix = ".json"
  }
}
```

「`.json` で終わるオブジェクトが作られたら SQS にイベントを送る」だけのシンプルな設定です。
これがちゃんと moto 上で副作用として発火するのかが、ここでの検証ポイントになります。

## ポーリング用のコンテナを起動する

今回は `docker-compose.yml` でコンテナを作成し、このコンテナを ECS サービスの代わりとしました。

```yaml
services:
  moto:
    image: motoserver/moto:latest
    ports:
      - "5050:5000"

  task2:
    build: ./apps/task2
    depends_on:
      - moto
    restart: unless-stopped
    environment:
      - AWS_ENDPOINT_URL=http://moto:5000
      - AWS_ACCESS_KEY_ID=testing
      ...
```

::: note warn
moto の ECS は API のレスポンスを返すだけで、実際にコンテナを起動してくれるものではありません。
したがって、 ECS サービスやタスクを模したい場合は、 moto の外側で動かす必要があります。

最初は、上記のコンテナも ECS のエミュレータ上で動かせたら嬉しいと考えていたのですが、上記の制約より、普通のコンテナとして動かす方針で検証を進めました。
:::

### 動かしてみる

初期状態のキュー内のメッセージは当然 0 個です。

```bash
% aws --endpoint-url http://localhost:5050 sqs get-queue-attributes \
  --queue-url http://localhost:5050/123456789012/moto-test-queue \
  --attribute-names ApproximateNumberOfMessages \
  --region ap-northeast-2
Attributes:
  ApproximateNumberOfMessages: '0'
```

この状態でS3 に JSON を put してみます。

```bash
% S3_KEY="data/$(date +%Y%m%d-%H%M%S).json"
% echo '{"hello": "world!"}' | aws --endpoint-url http://localhost:5050 s3 cp - \
  "s3://moto-test-json-bucket/${S3_KEY}" \
  --region ap-northeast-2
```

その後ふたたびキュー内のメッセージ数を見てみると、1 個になっていることが分かります。

```bash
% aws --endpoint-url http://localhost:5050 sqs get-queue-attributes \
  --queue-url http://localhost:5050/123456789012/moto-test-queue \
  --attribute-names ApproximateNumberOfMessages \
  --region ap-northeast-2
Attributes:
  ApproximateNumberOfMessages: '1'
```

ドキュメント通り、S3 イベントが発火し、キューにメッセージがプッシュされたのを確認できました。

さらに、キューからメッセージをポーリングして、ポーリングした JSON をログ出力するコンテナを立ち上げます。
すると、立ち上げたコンテナで以下のようなログが出力されました。

```bash
moto-terraform-ecs-task2-1  | 2026/05/24 06:26:22 queue URL: http://moto:5000/123456789012/moto-test-queue
moto-terraform-ecs-task2-1  | 2026/05/24 06:26:22 start polling SQS...
moto-terraform-ecs-task2-1  | 2026/05/24 06:26:41 skipping message: no records in S3 event (skipping non-S3 message)
moto-terraform-ecs-task2-1  | 2026/05/24 06:36:15 fetching s3://moto-test-json-bucket/data/20260524-153609.json
moto-terraform-ecs-task2-1  | 2026/05/24 06:36:15 received JSON: {"hello": "world!"}
```

無事、 S3 → put event → SQS → コンテナでポーリング の流れが動くことを確認できました。

# moto を使用する際の制約

ここまで動いたとはいえ、moto は実 AWS の完全な置き換えではありません。今回検証して見えた範囲だと、以下のような制約があります。

- **状態遷移系は再現対象外**
  moto は Lambda 関数自体は Docker コンテナで実行できますが、他サービスのトリガー機構の中で Lambda が呼び出されるフローは実装が限定的です。たとえば Cognito の Custom Auth Flow (認証チャレンジを Lambda で進める仕組み) は moto の Cognito 側にトリガー発火実装が無く動きません。
- **副作用ありの動作は限定的**
  S3 → SQS は動きますが、たとえば SQS → Lambda の自動起動は moto では発火しません。

「ECS タスクの実体まで含めた E2E が要る」であったり、「Lambda の自動実行で繋がる pipeline を試したい」となると、LocalStack（場合によっては有料機能）や実 AWS が必要になります。逆に「API レスポンスの整合性」と「S3 → SQS のような限定的な副作用」さえあれば十分、というケースなら moto はかなり気軽に使えます。

どのような API および副作用が実装されているかはドキュメントにかなり詳しくまとまっているので、テストしたい AWS・Terraform 操作を満たす API が moto に実装されているかを確認してから moto の採用を決定するのが良いと思います。

# まとめ

この記事では moto に対して Terraform を打ち込み、S3 → SQS → ECS サービス (相当のコンテナ) というイベント駆動の構成をローカル完結で動かしてみました。

moto を使用する場合、 ECS タスクの実コンテナ起動や Lambda の自動実行といった「実体を伴う動作」の再現に限界はあります。
一方で、認証も不要で `docker compose up` だけで立ち上がる軽さは大きな利点です。今回は CI 上での検証は行なっていませんが、「CI 上で、 Terraform コマンドが正しいかのチェックや、簡単な AWS 処理のテストをしたい」といったニーズに一致しているように感じました。

LocalStack の Community Edition 廃止以降、「無料で気軽に AWS をエミュレートしたい」というニーズに対する現実的な選択肢として、moto は十分検討に値する印象でした。

無料で認証なしで使えるので、皆さんもぜひ気軽に触ってみてください。
