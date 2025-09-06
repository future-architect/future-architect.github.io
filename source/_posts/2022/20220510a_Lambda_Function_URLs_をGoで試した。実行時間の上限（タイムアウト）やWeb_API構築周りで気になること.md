---
title: "Lambda Function URLs をGoでお試し。実行時間の上限（タイムアウト）やWeb API構築周りで気になること"
date: 2022/05/10 00:00:00
postid: a
tag:
  - Lambda
  - Go
  - サーバーレス
  - タイムアウト
category:
  - Programming
thumbnail: /images/2022/20220510a/thumbnail.png
author: 真野隼記
lede: "2022/04/06にGAになったと発表された、Lambda Function URLsは、AWS Lambdaに直接HTTPSエンドポイントを追加できるというもので、API Gateway（やALB）無しでWeb APIやサイトを構築できると話題になりました。"
---
# はじめに

TIG DXユニット真野です。2022/04/06にGAになったと発表された、Lambda Function URLsは、AWS Lambdaに直接HTTPSエンドポイントを追加できるというもので、API Gateway（やALB）無しでWeb APIやサイトを構築できると話題になりました。

* [Announcing AWS Lambda Function URLs: Built-in HTTPS Endpoints for Single-Function Microservices](https://aws.amazon.com/jp/blogs/aws/announcing-aws-lambda-function-urls-built-in-https-endpoints-for-single-function-microservices/)
  * [（4/14公開の日本語訳）AWS Lambda Function URLs の提供開始: 単一機能のマイクロサービス向けの組み込み HTTPS エンドポイント](https://aws.amazon.com/jp/blogs/news/announcing-aws-lambda-function-urls-built-in-https-endpoints-for-single-function-microservices/)

私も業務でAPI Gateway + Lambdaの組み合わせで稼働している事例があります。非常に安定稼働していますが、この組み合わせだとタイムアウトがAPI GatewayのLambda統合となるため上限が29秒[^1]です。Lambda Function URLs だとAPI Gatewayを経由しない分、Lambda側の15分[^2]になることが嬉しいなと思いました。Web APIでそんなに長時間動かすことって無いだろうと思いますよね。私もそう思っていましたが、Excelファイルアップロードによるバッチ登録や、Excel帳票ダウンロード機能の登場を予見できず目論見は崩れました。

[^1]: 2022.4.30時点でAPI Gatewayの統合のタイムアウトは最大29秒で上限緩和不可。 https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/limits.html
[^2]: 2022.4.30時点でLambda関数タイムアウトは最大15分で上限緩和不可。https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/gettingstarted-limits.html

さて、ドキュメントにはLambda Function URLsで個別のタイムアウト制約があるという記載がないため、制約は通常のLambdaと同様に15分が上限であることは自明な気がしますが、せっかくなので検証します。また、GoでJSONを返すWeb APIを構築するときにどういった使い方になるかコードベースで試します。

## タイムアウトについて

Lambdaについては「関数URLを有効化」し、cURLやブラウザなどで簡易的に疎通したかったので認証タイプは「NONE」を選択します。関数名は「my-function-url-lambda」とします。

<img src="/images/2022/20220510a/lambda_create_resource.png" alt="lambda_create_resource" width="1200" height="987" loading="lazy">

Lambda設定は、ランタイムを「Go 1.x」、ハンドラは適当に「lambda」にしています。Lambdaリソースのタイムアウトは「15分0秒」（最長）にします。

AWS LambdaをGoで動かすためには、ドキュメントにもあるように `github.com/aws/aws-lambda-go/lambda` パッケージを利用します。本来は不要ですが、動いているか心配になったので、tickerで1分ごとに標準出力しています。

```go
package main

import (
	"fmt"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
)

func HandleRequest() (string, error) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	start := time.Now()
	go func() {
		for {
			select {
			case t := <-ticker.C:
				term := t.Sub(start)
				fmt.Printf("Term %f[sec]", term.Seconds())
			}
		}
	}()
	<-make(chan bool) // チャネル受信待ちにして、無限にウェイトさせています
	return fmt.Sprintf("3年も一緒に暮らしたのに、猫がまったく懐かなくて悲しい"), nil
}

func main() {
	lambda.Start(HandleRequest)
}
```

デプロイは次のようなMakefileを作って行います（どのようなやり方でも良いと思います）

```Makefile
deploy:
	GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -buildid=" -trimpath -o bin/lambda_raw/lambda cmd/lambda_raw/main.go
	zip -j bin/lambda_raw/lambda.zip bin/lambda_raw/lambda
	aws lambda update-function-code --profile my_profile --region ap-northeast-1 --function-name my-function-url-lambda --zip-file fileb://bin/lambda_raw/lambda.zip
```

アクセスするURLは、関数URLという部分に表示されるので、ブラウザでクリックしてLambdaを実行します。

<img src="/images/2022/20220510a/Lambda定義.png" alt="Lambda定義" width="1200" height="381" loading="lazy">

15分待つと `Internal Server Error` がブラウザで表示されます。CloudWatch Logsで確認すると、以下のように約900秒（15分）起動したことが分かります。おお..!!  29秒の呪縛から開放されている!!

```log 実行結果
2022-05-05T00:34:58.224+09:00	START RequestId: 5203b933-276b-4abc-b1cb-8a92ffbfec06 Version: $LATEST
2022-05-05T00:35:59.228+09:00	Term 60.000960[sec]
2022-05-05T00:36:59.228+09:00	Term 120.001254[sec]
2022-05-05T00:37:59.228+09:00	Term 180.001482[sec]
2022-05-05T00:38:59.228+09:00	Term 240.000151[sec]
2022-05-05T00:39:59.229+09:00	Term 300.000145[sec]
2022-05-05T00:40:59.230+09:00	Term 360.000407[sec]
2022-05-05T00:41:59.231+09:00	Term 420.000769[sec]
2022-05-05T00:42:59.232+09:00	Term 480.001089[sec]
2022-05-05T00:43:59.285+09:00	Term 540.054274[sec]
2022-05-05T00:44:59.286+09:00	Term 600.054582[sec]
2022-05-05T00:45:59.288+09:00	Term 660.054826[sec]
2022-05-05T00:46:59.288+09:00	Term 720.055132[sec]
2022-05-05T00:47:59.290+09:00	Term 780.055406[sec]
2022-05-05T00:48:59.290+09:00	Term 840.055729[sec]
2022-05-05T00:49:58.245+09:00	END RequestId: 5203b933-276b-4abc-b1cb-8a92ffbfec06
2022-05-05T00:49:58.245+09:00	REPORT RequestId: 5203b933-276b-4abc-b1cb-8a92ffbfec06 Duration: 900011.38 ms Billed Duration: 900000 ms Memory Size: 512 MB Max Memory Used: 28 MB Init Duration: 90.72 ms
2022-05-05T00:49:58.245+09:00	2022-05-04T15:49:58.244Z 5203b933-276b-4abc-b1cb-8a92ffbfec06 Task timed out after 900.01 seconds
2022-05-05T00:49:58.455+09:00	START RequestId: 89b046b7-dc8d-4f68-be08-66a992f2e46e Version: $LATEST
```

これで、Lambda Function URLsは実行時間の面でかなり有用だと感じます。

## WAFの制御

API Gatewayのようなリッチな制御は行えなくても、セキュリティ要件でWAF設置が必須な場合があります。Lambda Function URLsは2022.5.5時点ではAWS WAFの設定は不可のようです。AWS WAFの設定画面をみても、現状はAPI Gateway, ALB, AppSyncの3つに限られています。

<img src="/images/2022/20220510a/WAF設定画面.png" alt="WAF設定画面" width="840" height="256" loading="lazy">

そのためブラウザアクセスを許容したいけど、検証用のエンドポイントは送信元IPを絞りたいとかも現状はできないです。スロットリング、カスタムドメイン名などとともに、これらの要件が必要な場合はAPI Gatewayを利用しましょうということです（InboundのSecurity Groupが設定できれば最高なんですが..）

## httpハンドラー対応

AWS Lambdaですが、aws-sdk for Goのお作法にそのまま従うとGoのhttpハンドラーと微妙に使い勝手が異なります。このギャップを吸収するために用いるのが `github.com/awslabs/aws-lambda-go-api-proxy` で、API Gatewayリクエストをnet/httpのhandlerの形式に変換してくれ、アプリコードとしてはnet/http、Gin、Echoの形式で実装すれば良くなります。

Lambda Function URLsでも使えるかなと試しました。

```go
package main

import (
	"io"
	"net/http"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "aws labs http adapter response!!")
	})

	lambda.Start(httpadapter.New(http.DefaultServeMux).ProxyWithContext)
}
```

動かしてみます。

```sh
$ curl https://ma5pnqdphjf6tvd5xxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/
aws labs http adapter response!!
```

そのまま、、、動きましたね。 API Gateway用のアダプターだと思いましたが、Lambda Function URLsでも動きます。

というのも、ドキュメントを見ると、Lambda Function URLsのリクエスト形式は **API Gatewayペイロードフォーマットv2.0と同じ** だからです。

> The request and response event formats follow the same schema as the Amazon API Gateway payload format version 2.0.
> https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html#urls-payloads

そのため、現在API Gateway + Lambda構成で開発しているアプリも、アプリコードとしてはそのまま Lambda Function URLsに移植できますし、同様に `awslabs/aws-lambda-go-api-proxy` を使っている場合もです。 `awslabs/aws-lambda-go-api-proxy` を使っていれば、ECSでもAPI Gateway Lambdaでも Lambda Function URLs でもコアなアプリコードは同じにできるので、非常に安心ですね（ECSはproxyなしで生のHTTPサーバを実行するイメージです）

**2022.10.6 追記**

[AWS lambda's function URL without API Gateway in Go - Stack Over Flow](https://stackoverflow.com/questions/72795881/aws-lambdas-function-url-without-api-gateway-in-go) にあるように、aws-sdk-for-go における apigateway-requestとlambda-function-urlsの構造体が異なるようで、上記の例だとリクエストパラメータはうまく渡るものの、URLのマッピングがすべて `/` になってしまうというフィードバックが社内のチームから報告を受けました。そのままadaptorをつかうのではなく、 `events.LambdaFunctionURLRequest` に載せ替える一手間がひつようかもしれません。

## まとめ

* Lambda Function URLsのタイムアウトは最長15分になり、API Gatewayを経由するときより伸びた
* AWS WAFはつけられないので、ブラウザ経由のアクセス制御は個別に実施する必要がある
* リクエストはAPI Gatewayペイロードフォーマットと同じなので、エコシステムをそのまま流用できる
