---
title: AWSサービストリガによるLambda起動
date: 2020/07/22 00:00:00
postid: ""
tag:
  - AWS
  - サーバーレス
  - LocalStack
  - Lambda
  - DynamoDB
  - Go
category:
  - Infrastructure
thumbnail: /images/20200722/thumbnail.png
author: 加部達郎
lede: "昨今様々なシステムで利用さているAWSのLambdaですが、サーバレスということもあり何かのイベントをトリガに関数を起動させる方法が一般的かと思います。LambdaはAWSの様々なサービスをトリガとして起動することが可能で、自分たちの利用しているAWSサービスと組み合わせて実装するることでその真価を発揮します。AWSに少し詳しい人であればLambdaをAWSのサービストリガで起動させる事ができることは知っていると思いますが、いざ実装するとなると具体的にどういった手順で、なんの設定が必要かというところがわからないという人もいるのではないでしょうか。"
---

[サーバレス連載企画](/articles/20200322/)の7回目です。

# はじめに
こんにちは。TIGのDXチームに所属している加部です。

昨今様々なシステムで利用さているAWSのLambdaですが、サーバレスということもあり何かのイベントをトリガに関数を起動させる方法が一般的かと思います。LambdaはAWSの様々なサービスをトリガとして起動することが可能で、自分たちの利用しているAWSサービスと組み合わせて実装するることでその真価を発揮します。

AWSに少し詳しい人であればLambdaをAWSのサービストリガで起動させる事ができることは知っていると思いますが、いざ実装するとなると具体的にどういった手順で、なんの設定が必要かというところがわからないという人もいるのではないでしょうか。Lambdaには起動型がいくつかあったり、トリガとなるサービスによって起動設定も異なってきます。私自身も業務で利用するまではいわゆる知識勢でした。

この記事ではAWSのローカルモック環境であるLocalStackを用いて、皆さんのローカル環境でも試せるよう各起動型の設定方法を追っていきます。

# Lambdaの起動型

まずはLambdaの起動型について見ていきましょう。Lambdaの起動型には同期、非同期、ストリームベースの3つがあります。

1. **同期**
    - イベントを処理する関数を待ってクライアントにレスポンスを返す
    - AWS側でのリトライ処理はなく実行は1回となる
    - 代表的なサービス
        - API Gateway
        - Cognito
        - Alexa
2. **非同期**
    - Lambdaは処理のためにイベントをキューに入れ、クライアントにすぐにレスポンスを返す
    - 呼び出しに失敗した場合は自動的に2回リトライが実施される
    - 代表的なサービス
        - CloudWatch Events
        - Cloud Watch Logs
        - Code Commit
        - S3
        - SNS
        - Kinesis Firehose
        etc...
3. **ストリームベース**
    - Lambdaサービスが連携元のストリームサービスをポーリングし、必要に応じてLambda関数を呼び出す
    - BatchSizeを指定することで、1回のLambda関数起動時のレコード取得数を指定する
    - Lambda関数が失敗すると、対象レコードの有効期限が切れるまでエラーが発生した関数をリトライする(リトライ回数は設定で指定可能)
    - 代表的なサービス
        - Kinesis Data Stream
        - Dynamo DB Stream

# 各起動型の設定方法

基本的な流れとしてはどの起動型も下記のような同じ流れになります。

1. Lambdaの作成
2. トリガとなるリソースの作成
3. Lambdaとトリガとなるリソースの紐付け

手順3のLambdaのトリガ設定が各起動型で変わってきます。それでは各起動型の設定方法を実践していきましょう。

## 事前準備

LocalStackを[こちら](https://github.com/localstack/localstack)からダウンロードしてください。LocalStack起動コマンド(macOSの場合)

```sh
TMPDIR=/private$TMPDIR docker-compose up -d
```

LocalStackの詳細については[こちらのブログ](/articles/20191115/)で解説しているので興味のある方は読んでみてください。

## 同期型

ではまず同期型の呼び出しから設定/実装方法を見ていきましょう。今回はよくあるAPI Gateway --> Lambdaという構成を参考に進めていきます。

<img src="/images/20200722/2020-07-17T17.05.46.png" loading="lazy">


それでは早速構築してきましょう。まずは、APIのレスポンスを返すLambdaを作成します。

```go テスト用コード
package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	q := request.QueryStringParameters
	name := q["name"]
	body := "hello " + name
	return events.APIGatewayProxyResponse{
		Body:       body,
		StatusCode: 200,
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
```

ソースをbuildして、zipで圧縮します。

```sh ビルド&zip圧縮
GOOS=linux GOARCH=amd64 go build -o ./main ./main.go
zip main.zip ./main
```

Lambdaをデプロイします。

```sh
aws lambda create-function \
  --endpoint-url=http://localhost:4574 \
  --function-name api-gateway-test \
  --runtime go1.x \
  --handler main \
  --zip-file fileb://main.zip \
  --role r1
```

Lambdaのデプロイが完了したらAPI GateAwayを作成します。

```sh
aws apigateway create-rest-api \
  --endpoint-url=http://localhost:4567 \
  --name 'API Gateway Test'
```
返ってきたidの値を後のコマンドで利用するので変数に入れておきます。

```sh
rest_api_id=******
```

API Gatewayを作成したらルートリソースの配下にAPIリソースを追加します
そのために、まずルートリソースのIDを確認しましょう。
rest-api-idには先のコマンドでレスポンスで返ってきたidを利用します。
ルートリソースのIDを確認

```sh
aws apigateway get-resources \
  --endpoint-url=http://localhost:4567 \
  --rest-api-id ${rest_api_id}
```

parent-idには一つ前のコマンドで返ってきたidの値を利用します。

```sh
aws apigateway create-resource \
  --endpoint-url=http://localhost:4567 \
  --rest-api-id ${rest_api_id} \
  --parent-id ****** \
  --path-part hello
```

作成したリソースに対するメソッドを作成します。

```sh
aws apigateway put-method \
  --endpoint-url=http://localhost:4567 \
  --rest-api-id ${rest_api_id} \
  --resource-id ****** \
  --http-method GET \
  --authorization-type "NONE"
```

ここまで設定できたらようやくAPI GatewayとLambdaの紐付けの設定になります。

```sh
aws apigateway put-integration \
  --endpoint-url=http://localhost:4567 \
  --rest-api-id ${rest_api_id} \
  --resource-id ****** \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method GET \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:api-gateway-test \
  --passthrough-behavior WHEN_NO_MATCH
```

最後にAPIをデプロイして完了です。

```sh
aws apigateway create-deployment \
  --endpoint-url=http://localhost:4567 \
  --rest-api-id ${rest_api_id} \
  --stage-name prod
```

curlコマンドで想定のレスポンスが返ってくるか確認しましょう。

```sh
$ curl -i http://localhost:4567/restapis/${rest_api_id}/prod/_user_request_/hello?name=lambda
hello lambda
```

## 非同期型

続いてS3とLambdaの連携です。API Gatewayに比べるとだいぶ設定が簡単です。S3にローカルPCからオブジェクトをコピーし、Lambdaが起動できることを確認していきます。

<img src="/images/20200722/2020-07-17T17.05.34.png" loading="lazy">


先程と同じようにまずはLambda関数のデプロイから実施していきます。
トリガの起動が確認できればよいので、Lambdaが起動したらメッセージが出力されるようなソースを用意します。
テスト用ソース

```go
package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, event events.S3Event) {
	fmt.Println("S3 trigger Lambda")
}
func main() {
	lambda.Start(handler)
}
```

テスト用ソースでLambdaを作成します。

```sh
aws lambda create-function \
  --endpoint-url=http://localhost:4574 \
  --function-name s3-trigger-test \
  --runtime go1.x \
  --handler main \
  --zip-file fileb://main.zip \
  --role r1
```

続いて今回のLambda起動となるS3バケットの作成です。

```sh
aws --endpoint-url=http://localhost:4572 s3 mb s3://test-bucket
make_bucket: test-bucket
```

続いて作成したS3に対してLambda起動の権限を追加します。

```sh
 aws lambda add-permission \
   --endpoint-url=http://localhost:4574 \
   --region us-east-1 \
   --function-name s3-trigger-test \
   --statement-id s3-put-event \
   --principal s3.amazonaws.com \
   --action "lambda:InvokeFunction" \
   --source-arn arn:aws:s3:::test-bucket
```

作成したS3バケットに対する操作の通知を設定します。

```sh
aws s3api put-bucket-notification-configuration \
  --endpoint-url=http://localhost:4572 \
  --bucket test-bucket \
  --notification-configuration file://s3test-event.json
```

設定Jsonファイル

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "",
      "Events": ["s3:ObjectCreated:*"]
    }
  ]
}
```

これでS3バケットに対するPUT操作でLambdaが起動する設定ができました。
試しにテキストファイルをS3にPUTしてみましょう。
オブジェクトPUT

```sh
aws s3 cp sample.txt s3://test-bucket \
  --endpoint-url=http://localhost:4572 \
  --profile localstack
```

非同期なのでLambdaが実行されたのかどうかはオブジェクトをPUTした時点ではわかりません。
Lambdaの実行を確認するために、CloudWatchLogを確認してLambdaの起動を確認しましょう。
まずはログストリームの特定をします。log-group-nameは「/aws/lambda/<Lambdaファンクション名>」となります。

```sh
aws logs describe-log-streams \
  --endpoint-url=http://localhost:4586 \
  --log-group-name=/aws/lambda/s3-trigger-test
```

上記コマンドを実行すると下記のようにロググループのログストリームが表示されます。

```json
{
    "logStreams": [
        {
            "firstEventTimestamp": 1585829767164,
            "lastEventTimestamp": 1585829767749,
            "creationTime": 1585829767942,
            "uploadSequenceToken": "1",
            "logStreamName": "+52222/12/12/[$LATEST]ec3fbc60",
            "lastIngestionTime": 1585829767947,
            "arn": "arn:aws:logs:us-east-1:0:log-group:/aws/lambda/s3-trigger-test:log-stream:+52222/12/12/[$LATEST]ec3fbc60",
            "storedBytes": 331
        }
    ]
}
```

ログストリーム名が確認できたら、ログストリームの中身を確認していきます。

```sh
aws logs get-log-events \
  --endpoint-url=http://localhost:4586 \
  --log-group-name=/aws/lambda/s3-trigger-test \
  --log-stream-name '+52222/12/12/[$LATEST]ec3fbc60'
```

ログを確認するとmessageが想定通りに表示されていますね。成功です。

```json
{
    "nextForwardToken": "f/00000000000000000000000000000000000000000000000000000003",
    "events": [
        {
            "ingestionTime": 1585829767947,
            "timestamp": 1585829767164,
            "message": "\u001b[32mSTART RequestId: 43bd5e82-0bfc-1c43-b8cf-085bc34c3d36 Version: $LATEST\u001b[0m"
        },
        {
            "ingestionTime": 1585829767947,
            "timestamp": 1585829767359,
            "message": "S3 trigger Lambda"
        },
        {
            "ingestionTime": 1585829767947,
            "timestamp": 1585829767554,
            "message": "\u001b[32mEND RequestId: 43bd5e82-0bfc-1c43-b8cf-085bc34c3d36\u001b[0m"
        },
        {
            "ingestionTime": 1585829767947,
            "timestamp": 1585829767749,
            "message": "\u001b[32mREPORT RequestId: 43bd5e82-0bfc-1c43-b8cf-085bc34c3d36\tInit Duration: 103.67 ms\tDuration: 2.44 ms\tBilled Duration: 100 ms\tMemory Size: 1536 MB\tMax Memory Used: 20 MB\t\u001b[0m"
        }
    ],
    "nextBackwardToken": "b/00000000000000000000000000000000000000000000000000000000"
}
```

## ストリームベース

最後はストリームベーズのLambda起動の設定です。ローカルPCからKinesisへメッセージをPUTしてLambdaを起動させましょう。

<img src="/images/20200722/2020-07-17T17.05.23.png" loading="lazy">

例によってテスト用のLambdaを作成します。
今回はPUTしたメッセージの内容がログに出力されるようなソースを用意します。

```go テスト用Lambdaコード
package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, kinesisEvent events.KinesisEvent) {
	for _, record := range kinesisEvent.Records {
		kinesisRecord := record.Kinesis
		dataBytes := kinesisRecord.Data
		dataText := string(dataBytes)

		fmt.Printf("%s Data = %s \n", record.EventName, dataText)
	}
}

func main() {
	lambda.Start(handler)
}
```

3回目なのでデプロイのコマンドはは割愛します。いままでのコマンドと同じになります。Lambdaが作成できたら次はトリガ起動のもととなるKinesisStreamを作成します。

```sh KinesisStream作成
aws kinesis --endpoint-url=http://localhost:4568 create-stream --stream-name lambda-test --shard-count 1
```

必要なリソースが作成できたらKinesisとLambdaの紐付けの設定をします。

```sh イベントトリガの設定
aws lambda create-event-source-mapping \
  --endpoint-url=http://localhost:4574 \
  --event-source-arn arn:aws:kinesis:us-east-1:000000000000:stream/lambda-test  \
  --function-name kinesis-trigger-test
```

event source mappingの設定ではエラー時のレコード送信先をSQSに設定できたり、バッチ処理するレコードの数など色々なオプションを指定することができます。

それではKinesisにテストレコードをputしてみましょう。

```sh メッセージPUT
aws kinesis --endpoint-url=http://localhost:4568 put-record --stream-name lambda-test --partition-key 123 --data test
```

レコードをPUTした時点ではLambdaが起動したかわからないので、S3の時同様CloudWatchを確認しにいきます。

手順は先程と同じになります。
まずは、ログストリームの確認です。

```sh ログストリームの確認
aws logs describe-log-streams \
  --endpoint-url=http://localhost:4586 \
  --log-group-name=/aws/lambda/kinesis-trigger-test
```

ログストリームの確認ができたらログを確認します。

```sh らログを確認
aws logs get-log-events \
  --endpoint-url=http://localhost:4586 \
  --log-group-name /aws/lambda/kinesis-trigger-test \
  --log-stream-name '+52222/12/21/[$LATEST]8d33a723'
```

ログが確認できましたね。KinesisにPUTしたtestという文字列も返ってきています。

```json
{
    "nextForwardToken": "f/00000000000000000000000000000000000000000000000000000003",
    "events": [
        {
            "ingestionTime": 1585830597603,
            "timestamp": 1585830596901,
            "message": "\u001b[32mSTART RequestId: 38463daf-5f85-1220-65eb-9607f3f807fe Version: $LATEST\u001b[0m"
        },
        {
            "ingestionTime": 1585830597603,
            "timestamp": 1585830597075,
            "message": " Data = test "
        },
        {
            "ingestionTime": 1585830597603,
            "timestamp": 1585830597250,
            "message": "\u001b[32mEND RequestId: 38463daf-5f85-1220-65eb-9607f3f807fe\u001b[0m"
        },
        {
            "ingestionTime": 1585830597603,
            "timestamp": 1585830597425,
            "message": "\u001b[32mREPORT RequestId: 38463daf-5f85-1220-65eb-9607f3f807fe\tInit Duration: 54.77 ms\tDuration: 3.63 ms\tBilled Duration: 100 ms\tMemory Size: 1536 MB\tMax Memory Used: 21 MB\t\u001b[0m"
        }
    ],
    "nextBackwardToken": "b/00000000000000000000000000000000000000000000000000000000"
}
```

## 終わりに

長文ご付き合いありがとうございました。今回はLambdaの各起動型の中から代表的なリソースのイベントによるLambdaの起動設定をおさらいしてきました。

このあたりの設定に関しては知っていれば難しいことはないのですが、初見だと少し苦労する部分かなと思います。本記事ではCLIによる設定をしていきましたが、もちろんCloudFormationやTerraformなどのInfrastructure as Codeでも設定すべき内容は基本的に同じになります。

一度マスターしてしまえばどうということ無いことなので、ぜひ一度Localstackを利用して試しに実装してみてください。
