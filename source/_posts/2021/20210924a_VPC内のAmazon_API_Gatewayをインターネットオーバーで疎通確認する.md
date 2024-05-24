---
title: "VPC内のAmazon API Gatewayをインターネットオーバーで疎通確認する"
date: 2021/09/24 00:00:00
postid: a
tag:
  - AWS
  - APIGateway
  - Go
  - VPC
category:
  - Programming
thumbnail: /images/20210924a/thumbnail.png
author: 真野隼記
lede: " Gateway+Lambda という構成でWebAPI開発を行う際、ちょっと便利に使える疎通方法をまとめます。API GatewayですがPublicなエンドポイントがあれば `curl`コマンドや`Postman`を用いての動作検証も容易だと思います。"
---
# はじめに

TIG DXユニットの真野です。AWSのAPI Gateway+Lambda という構成でWebAPI開発を行う際、ちょっと便利に使える疎通方法をまとめます。

## 背景

API GatewayですがPublicなエンドポイントがあれば `curl`コマンドや`Postman`を用いての動作検証も容易だと思います。

一方でVPCエンドポイントを利用してプライベート APIとして構築されている場合は少し厄介です。そのセグメントにVPCなどで属することができればよいのですが、そのためだけに接続するのは煩わしい場面があります。踏み台サーバを作ってAWS Systems Manager(ssmコマンド）でログインするのも、開発環境でそこまでするのかという感覚がありました。また、AWS WAFなどで接続が絞られている時にはその条件を思い出す必要があり（覚えておけよって感じですが）、疎通確認すらちょっと面倒な場面があります。

## aws apigateway test-invoke-methodコマンドが便利

API Gatewayのマネジメントコンソールには動作確認用の[テスト呼び出し機能](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/how-to-test-method.html)が存在します。

<img src="/images/20210924a/image.png" alt="マネジメントコンソールのテスト呼び出し" width="1200" height="601" loading="lazy">

こちらと同等の機能がawscliにも提供されています。[api gateway test-invoke-method](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/apigateway/test-invoke-method.html)コマンドです。これを利用することでマネジメントコンソール上と同等のリクエストをコマンドラインから確認できます。

つまりプライベートに構築されたAPI Gatewayに対しても、適切な権限があれば疎通確認ができるということです。

実行例を載せます。レスポンスは少し大きなJSONだったので、`jq`コマンドでフィールドを、ステータスコード・応答ヘッダ・応答ボディに絞っています。profileやrest-api-id, resoruce-idは適時読み替えてください。

```sh test-invoke-methodの実行例
aws apigateway --profile <my_profile> test-invoke-method --rest-api-id <1234123412> --resource-id <3gapai> \
  --http-method PGET --path-with-query-string /v1/health |  jq '.status, .headers, .body'
200
{
  "Content-Type": "application/json",
  "Vary": "Accept-Encoding",
  "X-Amzn-Trace-Id": "Root=1-67891233-abcdef012345678912345678;Sampled=0"
}
"{\"message\":\"OK\"}\n"
```

--rest-api-id と --resource-idの取得方法は[Stackoverflowの回答](https://stackoverflow.com/questions/52446929/what-is-the-rest-api-id-and-resource-id-and-where-do-i-find-them)がシンプルでした。こちらを参考に取得すると良いかなと思います。


## API GatewayにLambdaオーソライザーが設定されている場合

API GatewayでLambdaオーソライザーが設定されている構成の場合があります。オーソライザー側についてはこのブログにも[AWS APIGateway Custom Authorizer入門](https://future-architect.github.io/articles/20210610a/)という記事がありますのでぜひ参照ください。

<img src="/images/20210924a/オーソライザー.png" alt="API Gatewayのカスタムオーソライザーの構成図" width="575" height="251" loading="lazy">

https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html

このときに、オーソライザー側で認可する場合に、後続に追加パラメータを設定する仕様で設計されていると少し考慮が必要です。というのも`aws apigateway test-invoke-method`はオーソライザー経由で実行するのではなく、直接API Gatewayにトリガーされたリソースを呼び出すからです。この場合は`aws apigateway test-invoke-method`に後続のLambdaなどが必要とする、必要なパラメータを`--headers`などで追加して呼び出すするようにしましょう。

ちなみおに、オーソライザー自体のテストもマネジメントコンソールから可能ですし、AWS CLIからも `apigateway test-invoke-authorizer`コマンドで可能です。

* https://docs.aws.amazon.com/cli/latest/reference/apigateway/test-invoke-authorizer.html

私が利用したことがないため、今回は説明を割愛します。


## AWS SDK for Goからテスト要求を呼び出してみる。

AWS SDK for Goを利用すればTest Invokeの呼び出しができます。

* https://docs.aws.amazon.com/sdk-for-go/api/service/apigateway/#APIGateway.TestInvokeMethod

実装例を簡単に記載します。

```go
package main

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/apigateway"
	"log"
	"net/http"
)

var apigw = apigateway.New(session.Must(session.NewSessionWithOptions(session.Options{
	Profile:           "my_profile", // TODO 書き換え
	SharedConfigState: session.SharedConfigEnable,
},
)))

func main() {

	params := &apigateway.TestInvokeMethodInput{
		RestApiId:           aws.String("1234123412"), // TODO 書き換え
		ResourceId:          aws.String("3gapai"),     // TODO 書き換え
		HttpMethod:          aws.String(http.MethodGet),
		PathWithQueryString: aws.String("/v1/health"),
	}

	req, resp := apigw.TestInvokeMethodRequest(params)
	if err := req.Send(); err != nil {
		log.Fatalf("test invoke: %v", err)
	}
	fmt.Printf("%d\n%v\n%v\n", *resp.Status, aws.StringValueMap(resp.Headers), *resp.Body)
}
```

これを実行すると、awscliコマンドで実行した結果と同等の応答を得られます。

```sh
>go run sample.go
200
map[Content-Type:application/json Vary:Accept-Encoding X-Amzn-Trace-Id:Root=1-67891233-abcdef012345678912345678;Sampled=0]
{"message":"OK"}
```

awscli側のapigateway test-invoke-methodに慣れておけば、インターフェースで悩むことはほぼ無いと思います。
取得結果のステータスコードや応答ボディなどは *int64や*string でポインタなので一瞬戸惑うくらいでしょうか。

## まとめ

プライベートなAPI Gatewayだと開発環境の疎通レベルでも検証が面倒だと思ったときには、`test-invoke-method`コマンドを利用する選択もあるよという記事でした。

当然、AWS SDKからも呼ぶことができますので、ちょっとした疎通テストを自動化するときにも利用できるかと思います。
