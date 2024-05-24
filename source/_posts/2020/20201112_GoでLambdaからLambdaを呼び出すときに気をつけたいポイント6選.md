---
title: "GoでLambdaからLambdaを呼び出すときに気をつけたいポイント6選"
date: 2020/11/12 00:00:00
postid: ""
tag:
  - AWS
  - Go
  - Lambda
  - VPC
category:
  - Programming
thumbnail: /images/20201112/thumbnail.png
author: 辻大志郎
lede: "TIGの辻です。サーバーレスなアプリケーションを開発するときにAWS LambdaやCloud RunといったFaaSはとても重宝します。デプロイする関数のコードは1つの関数がモノリシックな大きな関数にならないように、小さな関数を組み合わせて実装するのが基本です。いくつかのユースケースでAWS LambdaからAWS Lambdaを同期的に呼び出したいケースがあったのですが、開発者が意識しておいたほうがいいようなハマりどころがいくつかありました。本記事ではGoで[AWS LambdaからAWS Lambdaを同期的に呼び出すとき]のハマりどころやTipsを紹介します。以下のような構成です"
---
# はじめに

TIGの辻です。サーバーレスなアプリケーションを開発するときにAWS LambdaやCloud RunといったFaaSはとても重宝します。デプロイする関数のコードは1つの関数がモノリシックな大きな関数にならないように、小さな関数を組み合わせて実装するのが基本です。いくつかのユースケースでAWS LambdaからAWS Lambdaを同期的に呼び出したいケースがあったのですが、開発者が意識しておいたほうがいいようなハマりどころがいくつかありました。

本記事ではGoで[AWS LambdaからAWS Lambdaを同期的に呼び出すとき](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/invocation-sync.html)のハマりどころやTipsを紹介します。以下のような構成です。

<img src="/images/20201112/LambdaからLambda.png" loading="lazy">

- ライブラリのバージョン

確認時のライブラリのバージョンは以下です。

| #   | ソフトウェア/ライブラリ | バージョン |
| --- | ----------------------- | ---------- |
| 1   | aws/aws-lambda-go       | 1.19.1     |
| 2   | aws/aws-sdk-go          | 1.35.7     |

またAWSのリージョンは、アジアパシフィック(東京) `ap-northeast-1` です。Lambda関数のランタイムは `Go 1.x` を使っています。

# ハマりどころ集

## 1. Lambda関数呼び出しのエラーハンドリング

Lambda関数を呼び出す `InvokeWithContext` ですが `InvokeWithContext` は呼び出し先のLambda関数が正常に呼び出された場合は、以下の戻り値の `error` は常に `nil` になります。

`func (c *Lambda) InvokeWithContext(ctx aws.Context, input *InvokeInput, opts ...request.Option) (*InvokeOutput, error)`

`InvokeInput` の関数名が間違っているなど、そもそも呼び出し先のLambda関数が呼び出せなかったときは `error` が `non-nil` になります。しかし、呼び出し先のLambda関数を呼び出せた場合は、呼び出し先の関数がエラーを返したどうかに関わらず、呼び出し元の戻り値の `error` は `nil` になります。Goは戻り値の `erorr` が `nil` かどうかでエラーをハンドリングするのが一般的です。しかし `InvokeWithContext` を使う場合のエラーハンドリングは、よくあるGoのエラーハンドリングの作法からは外れるので、注意が必要です。

`InvokeWithContext` をつかってLambda関数を呼び出す場合に、呼び出し先のLambda関数のエラーをハンドリングしたい場合、以下のような実装は間違っています。(呼び出し先のLambda関数では `errors.New("invoked err")` の `errorString` を返却するようにしています)

```go
	// Lambda関数呼び出し
	resp, err := lmd.InvokeWithContext(ctx, input)

	// 正常にLambda関数が呼び出せた場合は常にnilになります
	if err != nil {
		return fmt.Errorf("invoke lambda, function name = %s: %w", functionName, err)
	}
```

呼び出し先のLambda関数でエラーが発生していても、呼び出し元の処理は正常終了しています。

<img src="/images/20201112/image.png" loading="lazy">

### 修正例

**`InvokeOutput` の `FunctionError` が `nil` かどうかで呼び出し先のLambda関数でエラーが発生したかチェックする**

```go
	// Lambda関数呼び出し
	resp, err := lmd.InvokeWithContext(ctx, input)
	log.Printf("invoke err: %v\n", err)
	if err != nil {
		return fmt.Errorf("invoke lambda, function name = %s: %w", functionName, err)
	}

	// resp変数のFunctionErrorがnilかどうかで呼び出し先のLambda関数でエラーが発生したかチェックします
	if resp.FunctionError != nil {
		return fmt.Errorf("invoke lambda response error, detail: %v: %v", string(resp.Payload), aws.StringValue(resp.FunctionError))
	}
```

`resp.FunctionError` を使ってエラーをチェックすれば、呼び出し先のLambda関数で発生したエラーをハンドリングできます。エラーの詳細は `resp.Payload` にJSONとして表現されています。今回の場合、呼び出し先のLambda関数で `errorString` のエラーが発生し、エラーの文字列として `"invoked err"` となっていることがわかります。

<img src="/images/20201112/image_2.png" loading="lazy">

## 2. Contextでは値を伝播できない

GoではContextという、APIやプロセス間で、処理のデッドラインを設定やリクエストスコープ内に閉じた値を伝播する機能があります。Contextを用いて値を伝播するときは[context.WithValue](https://golang.org/pkg/context/#WithValue)を使って、キーとバリューのセットでコンテキストに値を格納します。

<details><summary>WithContextを利用する実装例</summary><div>

通常Contextのキーは衝突を防ぐためにパッケージ内で非公開のキーとにしておき、Contextに値をセットしたり、Contextから値を取得したりする関数を用意することが一般的です。

```go
package main

import (
	"context"
	"errors"
	"fmt"
)

var (
	readerKey = struct{}{}
)

type Reader struct {
	Message string
	//...
}

func RetrieveReader(ctx context.Context) (Reader, error) {
	r, ok := ctx.Value(readerKey).(Reader)
	if !ok {
		return Reader{}, errors.New("not found Reader in the context")
	}
	return r, nil
}

func SetReader(ctx context.Context, r Reader) context.Context {
	return context.WithValue(ctx, readerKey, r)
}

// ===================================================

func main() {
	ctx := context.Background()

	// コンテキストに値を格納
	r := Reader{Message: "hello context with value!"}
	ctx = SetReader(ctx, r)

	// 別の処理を呼び出し
	hoge(ctx)
}

func hoge(ctx context.Context) {
	r, error := RetrieveReader(ctx)
	if error != nil {
		// コンテキストに値が含まれなかったときの処理
	}
	fmt.Println(r)
	// Output: {hello context with value!}
}
```

</div></details>

AWSが提供しているGoのSDK [`aws-sdk-go`](https://github.com/aws/aws-sdk-go) では、Lambda関数を呼び出すために以下の3つのAPIが提供されています。(※DeprecatedになっているAPIは除きます。)

- `func (c *Lambda) Invoke(input *InvokeInput) (*InvokeOutput, error)`
- `func (c *Lambda) InvokeRequest(input *InvokeInput) (req *request.Request, output *InvokeOutput)`
- `func (c *Lambda) InvokeWithContext(ctx aws.Context, input *InvokeInput, opts ...request.Option) (*InvokeOutput, error)`

`InvokeWithContext` は `Context` を引数に受け取るため、`context.WithValue` でセットした値を呼び出し先のLambda関数に伝播できるのでは？と思うかもしれません。しかし、呼び出し元で `Context` に `context.WithValue` でセットしても値は呼び出し先のLambda関数に伝播されません。なぜなら `InvokeWithContext` における `Context` はリクエストのキャンセルするためのもので、値を伝播するためのものではないからです。

### 解決策

**`InvokeInput` 型の `Payload` フィールドを使う**

`InvokeWithContext` を使ってLambdaを呼び出すときに、Inputの情報として `InvokeInput` を引数にセットします。`InvokeInput` は以下のような構造体です。

```go
type InvokeInput struct {
	ClientContext *string `location:"header" locationName:"X-Amz-Client-Context" type:"string"`
	FunctionName *string `location:"uri" locationName:"FunctionName" min:"1" type:"string" required:"true"`
	InvocationType *string `location:"header" locationName:"X-Amz-Invocation-Type" type:"string" enum:"InvocationType"`
	LogType *string `location:"header" locationName:"X-Amz-Log-Type" type:"string" enum:"LogType"`
	Payload []byte `type:"blob" sensitive:"true"`
	Qualifier *string `location:"querystring" locationName:"Qualifier" min:"1" type:"string"`
}
```

`Payload` フィールドにJSONエンコードしたバイト配列をセットすることで呼び出し先のLambda関数に値を伝播することができます。以下のようにして呼び出し先のLambda関数に値を渡すことができます。

```go
	// 呼び出し先のLambdaに渡したい値
	r := Reader{Message: "hello world!"}
	// JSONにエンコード
	b, _ := json.Marshal(r)

	// Lambda関数呼び出しのInput設定
	functionName := "invoked"
	input := &lambda.InvokeInput{
		FunctionName:   aws.String(functionName),
		InvocationType: aws.String(lambda.InvocationTypeRequestResponse),
		// PayloadにJSONエンコードされた値をセット
		Payload:        b,
	}

	// Lambda関数呼び出し
	resp, err := lmd.InvokeWithContext(ctx, input)
```

<details><summary>呼び出し側のLambda関数実装例</summary><div>

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	mainlambda "github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
)

var (
	lmd *lambda.Lambda
)
func init() {
	lmd = lambda.New(session.Must(session.NewSession(&aws.Config{})))
	log.SetPrefix("[DEBUG] ")
}

func main() {
	// Lambda関数の実行
	mainlambda.Start(Handler)
}

func Handler(ctx context.Context) error {
	log.Println("hello caller lambda!")

	// 呼び出し先のLambdaに渡したい値
	r := model.Reader{Message: "hello world!"}
	// JSONにエンコード
	b, _ := json.Marshal(r)

	// Lambda関数呼び出しのInput設定
	functionName := "invoked"
	input := &lambda.InvokeInput{
		FunctionName:   aws.String(functionName),
		InvocationType: aws.String(lambda.InvocationTypeRequestResponse),
		Payload:        b,
	}

	// Lambda関数呼び出し
	resp, err := lmd.InvokeWithContext(ctx, input)
	if err != nil {
		return fmt.Errorf("invoke lambda, function name = %s: %w", functionName, err)
	}

	// 呼び出し先のLambdaからのレスポンス
	log.Printf("resp.StatusCode: %v\n", aws.Int64Value(resp.StatusCode))
	log.Printf("resp.FunctionError: %v\n", aws.StringValue(resp.FunctionError))
	log.Printf("resp.Payload: %v\n", string(resp.Payload))

	return nil
}
```

- model.go

```go
package model

type Reader struct {
	Message string `json:"message"`
	// ...
}
```

</div></details>

呼び出される側のLambda関数では、呼び出し時のペイロードはハンドラの引数として受け取ることができます。

```go
// ハンドラの第2引数として呼び出し元のペイロードと同じ構造体を含める
func Handler(ctx context.Context, r model.Reader) error {
	log.Printf("hello invoked lambda!, model.Reader=%#v\n", r)
	return nil
}
```

<details><summary>呼び出される側のLambda関数実装例</summary><div>

```go
package main

import (
	"caller/model"
	"context"
	"log"
	"os"

	mainlambda "github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
)

var (
	lmd *lambda.Lambda
)

func init() {
	region := os.Getenv("AWS_REGION")
	lmd = lambda.New(session.Must(session.NewSession(&aws.Config{
		Region: aws.String(region),
	})))
	log.SetPrefix("[DEBUG] ")
}

func main() {
	// Lambda関数の実行
	mainlambda.Start(Handler)
}

// ハンドラの第2引数として呼び出し元のペイロードと同じ構造体を含める
func Handler(ctx context.Context, r model.Reader) error {
	log.Printf("hello invoked lambda!, model.Reader=%#v\n", r)
	return nil
}
```

</div></details>

- 実行結果(呼び出し元)

実行するとLambda関数を呼び出したレスポンスが返ってきます。この場合は正常に実行されたことがわかります。なお、今回は呼び出し先のLambda関数にはレスポンスを設定していないため、呼び出し元のLambda関数の `resp.Payload` が `null` になっていますが、レスポンスを呼び出し元に渡すこともできます。

```bash
[DEBUG] 2020/10/11 03:05:17 hello caller lambda!
[DEBUG] 2020/10/11 03:05:17 resp.StatusCode: 200
[DEBUG] 2020/10/11 03:05:17 resp.FunctionError: <nil>
[DEBUG] 2020/10/11 03:05:17 resp.Payload: null
```

- 実行結果(呼び出し先)

またCloudwatch Logsの呼び出されたLambda関数のログを見るとLambda関数が呼び出されていることがわかります。また呼び出し時にセットされたペイロードが引数の値として含まれていることがわかります。

```bash
[DEBUG] 2020/10/11 03:05:17 hello invoked lambda!, model.Reader=model.Reader{Message:"hello world!"}
```

## 3. VPC LambdaからVPC LambdaはInternalな通信では呼び出せない

Transit Gatewayなどを使ってオンプレとクラウドを接続する場合など、いくつかのユースケースでLambda関数をVPC Lambdaとして配置したい場合があります。VPC内にあるLambda関数から(VPC Lambda・非VPC Lambda問わず)別のLambda関数を呼び出す場合には~~Internalの通信で呼び出せないことに注意が必要です。(2020/10/13現在)~~ VPC Endpointを使ってInternalな通信で呼び出せるようになりました。

以下のようにLambda関数をVPC内に配置する場合です。サブネットはプライベートサブネットとします。(なお通常VPC Lambda関数は可用性の観点から複数のサブネットに配置します)

<img src="/images/20201112/LambdaからLambda-VPCLambda.png" loading="lazy">

### VPCエンドポイントがなかった従来の場合

同じVPCに含まれるLambda関数であるため、インターネットを経由せずにInternalな通信でLambda関数からLambda関数を呼び出せることを期待しますが、できません。`InvokeWithContext` で呼び出すと以下のようになります。

<img src="/images/20201112/image_3.png" loading="lazy">

ログには以下のように出力されており、Lambda関数自体の呼び出しに失敗しています。

```bash
[DEBUG] 2020/10/11 12:21:35 hello caller lambda!
[DEBUG] 2020/10/11 12:23:35 invoke err: RequestError: send request failed
caused by: Post "https://lambda.ap-northeast-1.amazonaws.com/2015-03-31/functions/invoked/invocations": dial tcp 3.112.8.132:443: i/o timeout
invoke lambda, function name = invoked: RequestError: send request failed
caused by: Post "https://lambda.ap-northeast-1.amazonaws.com/2015-03-31/functions/invoked/invocations": dial tcp 3.112.8.132:443: i/o timeout: wrapError
```

AWSのサービスをSDKで呼び出す場合は、リクエストのエンドポイントは各サービスで提供されているエンドポイントを使用します。Lambdaの場合は [AWS Lambda エンドポイントとクォータ](https://docs.aws.amazon.com/ja_jp/general/latest/gr/lambda-service.html) にあるように、`lambda.ap-northeast-1.amazonaws.com` となります(リージョンが `ap-northeast-1` の場合)。ログからも `lambda.ap-northeast-1.amazonaws.com` となっていることがわかります。VPC LambdaからVPC Lambdaを呼び出す場合においても、サービスが提供しているエンドポイントを経由する必要があるため、SDKでLambda関数を呼び出す場合はインターネットへ抜けるネットワーク経路が必要になります。

### VPCエンドポイントを使う場合

2020/10/20に公開されたブログにあるように、Lambda関数をVPCエンドポイント経由で呼び出せるようになりました。東京リージョン(`ap-northeast-1`)にも対応しています。待望のアップデートです。

https://aws.amazon.com/jp/blogs/aws/new-use-aws-privatelink-to-access-aws-lambda-over-private-aws-network/

- 構築手順

VPCエンドポイントを作成します。

<img src="/images/20201112/image_4.png" loading="lazy">

VPCエンドポイントの作成が完了すると、DNS名が払い出されます。払い出されたDNS名に対してリクエストするように実装します。

<img src="/images/20201112/image_5.png" loading="lazy">

以下のようにLambda関数を呼び出すためのクライアントのConfigにエンドポイントをVPCエンドポイントから払い出されたDNS名を指定します。

```diff
func init() {
	lmd = lambda.New(session.Must(session.NewSession(&aws.Config{
+		Endpoint: aws.String("vpce-08dbf550d5e0a2b01-bcnnllkp.lambda.ap-northeast-1.vpce.amazonaws.com"),
	})))
	log.SetPrefix("[DEBUG] ")
}
```

再度ビルドしてLambda関数をデプロイします。Lambda関数を実行すると、Lambda関数呼び出しが成功するようになりました。

<img src="/images/20201112/image_6.png" loading="lazy">

従来は以下の解決策に記載しているような

- NAT Gatewayを構築してインターネットへのアウトバウントの経路を確保する
- VPC Endpointを備えたPrivateなAPI Gatewayを経由してVPC Lambdaを呼び出す
- PrivateなALBを経由してVPC Lambdaを呼び出す

といった回避策が必要でした。NAT Gatewayが構築できないインフラ構成の場合、どうしても複雑な構成を取らざるを得ませんでした。今回VPC EndpointがLambda関数に対応したことで、プライベートなネットワーク環境内でLambda関数を使うユースケースも増えていくのではないかと思います。

### ~~解決策~~

~~**プライベートなサブネットからインターネットに抜ける経路を構築する**~~

~~SDKでLambda関数を呼び出すためにはプライベートサブネットからインターネットに抜ける経路が必要であるため、プライベートサブネットにNAT Gatewayを構築します。また、パブリックサブネットやInternet Gatewayを構築、各種セキュリティグループやルートテーブルの設定を実施する必要があります。~~

~~その他の解決策としては、VPC Endpointを備えたPrivateなAPI Gatewayを経由してVPC Lambdaを呼び出す方法や、PrivateなALBを経由してVPC Lambdaを呼び出す方法などが考えられます。このような方法の場合はVPCにInternet Gatewayを備えていなくても、間接的にVPC Lambdaを呼び出せる、というメリットがあります。インフラ構成によっては十分有用な方法です。~~

2020/10/20現在、VPCエンドポイントがLambdaに対応したため、VPCエンドポイントを使う場合、上記の解決先は不要になりました。

## 4. デフォルトでは同期呼び出し

Lambda関数の呼び出しは2種類あります。1つは呼び出しのレスポンスを待つ同期型、もう一つは呼び出し時は即座に呼び出し元がレスポンスが返し、後で処理が実行される非同期型です。`InvokeWithContext` を使ってLambda関数を呼び出す場合はデフォルトだと同期型として呼び出します。呼び出し先のLambda関数が重い処理でレスポンスを返すまでに時間がかかる場合は非同期型を選択する場合もあるでしょう。呼び出し方法の選択は `InvokeInput` の `InvocationType` フィールドを用いて指定します。同期型の場合は `lambda.InvocationTypeRequestResponse` (`RequestResponse` の文字列)で非同期型の場合は `lambda.InvocationTypeEvent` (`Event`)となります。

以下のようにすると非同期としてLambda関数を呼び出します。

```go
	functionName := "invoked"
	input := &lambda.InvokeInput{
		FunctionName:   aws.String(functionName),
		// 非同期型として呼び出すためにInvocationTypeにEventを設定します。
		InvocationType: aws.String(lambda.InvocationTypeEvent),
		Payload:        b,
	}
```

## 5. 呼び出し先のLambdaの同時実行数以上の同期呼び出しは即座にエラーが返る

Lambda関数は「[同時実行数](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/configuration-concurrency.html)」という設定を使って、同時に実行できるLambda関数に制約を付与することができます。非同期型の呼び出しの場合は、呼び出し元には成功のステータスが返されます。Lambda関数はキューイング後、遅延して実行されます。しかし、同期型として呼び出す場合、同時実行数以上の数を呼び出した場合は即座に呼び出し元に [`TooManyRequestsException`](https://pkg.go.dev/github.com/aws/aws-sdk-go@v1.35.7/service/lambda#TooManyRequestsException) のエラーが返ってきます。

<img src="/images/20201112/image_7.png" loading="lazy">

ログには以下のように出力されます。

```bash
[DEBUG] 2020/10/11 13:01:21 hello caller lambda!
[DEBUG] 2020/10/11 13:01:27 invoke err: TooManyRequestsException: Rate Exceeded.
{
  RespMetadata: {
    StatusCode: 429,
    RequestID: "11b45c8e-3e59-4ab7-8acb-80e1bfa5931f"
  },
  Message_: "Rate Exceeded.",
  Reason: "ReservedFunctionConcurrentInvocationLimitExceeded",
  Type: "User"
}
invoke lambda, function name = invoked: TooManyRequestsException: Rate Exceeded.
{
  RespMetadata: {
    StatusCode: 429,
    RequestID: "11b45c8e-3e59-4ab7-8acb-80e1bfa5931f"
  },
  Message_: "Rate Exceeded.",
  Reason: "ReservedFunctionConcurrentInvocationLimitExceeded",
  Type: "User"
}: wrapError
null
```

呼び出し先のLambda関数からのレスポンスが必要な場合は同期型として呼び出すことになりますが、即座にエラーになる点は注意が必要です。

## 6. 呼び出し先のLambdaに設定されている環境変数は使える

APIでLambda関数を呼び出した場合、呼び出し先の環境変数が使えなくなるのでは？と思う方もいるかもしれませんが、実は環境変数もちゃんとセットされます。

呼び出し先のLambda関数のハンドラは以下のようにしておきます。

```go
func Handler(ctx context.Context) error {
	log.Println("hello invoked lambda!")

	// InvokeWithContextで呼び出された場合でも環境変数はセットされる
	logLevel := os.Getenv("LOG_LEVEL")
	log.Printf("logLevel: %s\n", logLevel)

	return nil
}
```

またLambda関数に以下のように環境変数 `LOG_LEVEL` を設定しておきます。

<img src="/images/20201112/image_8.png" loading="lazy">

`InvokeWithContext` を使って呼び出し元のLambda関数から呼び出し先の関数を呼び出したときのログ出力は以下です。

```bash
[DEBUG] 2020/10/11 13:28:08 hello invoked lambda!
[DEBUG] 2020/10/11 13:28:08 logLevel: INFO
```

想定通り環境変数から設定される変数 `logLevel` の値がセットされていることがわかります。

# まとめ

GoでLambda関数からLambda関数を同期的に呼び出すときのハマりどころやTipsを紹介しました。ドキュメントを隅々まで注意深く読んでいないと、はまりがちなポイントだと思いますので、きっと皆さんの役に立つのではないかなと思います。

