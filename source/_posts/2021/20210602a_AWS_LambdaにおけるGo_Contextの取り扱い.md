---
title: "AWS LambdaにおけるGo Contextの取り扱い"
date: 2021/06/02 00:00:00
postid: a
tag:
  - Go
  - Lambda
category:
  - Programming
thumbnail: /images/20210602a/thumbnail.png
author: 伊藤真彦
lede: "サーバーレス連載の3記事目ですTIGの伊藤真彦です。GoでLambdaにデプロイするコードを書くにあたり、aws-lambda-goを利用できます。その際のtips紹介記事です。"
---

[サーバーレス連載](/articles/20210531a/)の3記事目です

TIGの伊藤真彦です。

GoでLambdaにデプロイするコードを書くにあたり、[aws-lambda-go](https://github.com/aws/aws-lambda-go)を利用できます。
その際のtips紹介記事です。

# AWS LambdaにおけるGo Contextの取り扱い

<img src="/images/20210602a/lambda-39473.png" alt="" title="Clker-Free-Vector-ImagesによるPixabayからの画像" width="300" height="310" loading="lazy">

```go main.go
package main

import (
	"github.com/aws/aws-lambda-go/lambda"
)

func hello() (string, error) {
	return "Hello ƛ!", nil
}

func main() {
	// Make the handler available for Remote Procedure Call by AWS Lambda
	lambda.Start(hello)
}
```

[aws-lambda-go](https://github.com/aws/aws-lambda-go)ライブラリのREADMEに記載の通り、importして利用可能になった`aws-lambda-go/lambda`の`Start`関数の引数に、アプリケーションコードを記載した関数を渡す形で、
実行するための土台としてのアレコレを抽象化して、アプリケーションコードに注力することが可能になっています。

`lambda.Start(func)`に渡せる引数`func`は`interface`型になっており、下記の複数種類の形式の関数を渡すことが可能になっています。

```go
func ()
func () error
func (TIn), error
func () (TOut, error)
func (context.Context) error
func (context.Context, TIn) error
func (context.Context) (TOut, error)
func (context.Context, TIn) (TOut, error)
```

引数として`context.Context`型を受け取るシグネチャの関数を用いることで、後続処理でcontextを受け取ることが可能です。

## LambdaContext型を利用する

contextというと後続のライブラリに受け渡すか、自前の実装によってタイムアウト等を管理するような用途が想定されます。
公式ドキュメントのサンプル実装は[こちら](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-context.html)です。
「context の呼び出し情報へのアクセス」の章に記載があるように、`lambda.Start(func)`で実装した関数が受け取る`context.Context`には、あらかじめいくつかの値が入っています。
これらの値をやり取りするために、aws-lambda-goには[lambdacontextパッケージ](https://github.com/aws/aws-lambda-go/blob/master/lambdacontext/context.go)が用意されています。
これにより、`LambdaContext`構造体を用いることが可能です。

```go
// LambdaContext is the set of metadata that is passed for every Invoke.
type LambdaContext struct {
	AwsRequestID       string
	InvokedFunctionArn string
	Identity           CognitoIdentity
	ClientContext      ClientContext
}
```

この構造体は、フィールド名の通り`AwsLambda`が実行された際の情報を持たせることが可能です。

## context.ContextからLambdaContext構造体を復元する

```go
// FromContext returns the LambdaContext value stored in ctx, if any.
func FromContext(ctx context.Context) (*LambdaContext, bool) {
	lc, ok := ctx.Value(contextKey).(*LambdaContext)
	return lc, ok
}
```

`LambdaContext`構造体は、`context.Context`を引数に取り、`LambdaContext`構造体を返す関数`FromContext`でデータを生成できます。
`FromContext`を用いたサンプルコードを書いてみました。

```go main.go
package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-lambda-go/lambdacontext"
)

func helloWithContext(ctx context.Context) (string, error) {
	lc, ok := lambdacontext.FromContext(ctx)
	if ok {
		log.Printf("aws_request_id: %v", lc.AwsRequestID)
	}
	return "Hello ƛ!", nil
}

func main() {
	// Make the handler available for Remote Procedure Call by AWS Lambda
	lambda.Start(helloWithContext)
}
```

このような方法で、受け取ったcontextからライブラリがcontextに含めた情報を取得することが可能です。
実際の運用としては、ログ出力の際にprefixに`AwsRequestID`を出力するように開発しておき、`Amazon CloudWatch Logs`に送信されたログから、同一リクエストにおける一連のログ出力を抽出する際に役立てたりしています。

lambdaで開発したAPIの認証認可に`Amazon Cognito`を利用している場合は、`LambdaContext`構造体から`CognitoIdentityID`、`CognitoIdentityPoolID`を取得することができるようになっています。
新しい`context`に`LambdaContext`構造体の情報を詰める`func NewContext(parent context.Context, lc *LambdaContext)`も用意されています。
このような公式から提供されているユーティリティを見落とさず使いこなしていきたいですね。

なお、Goの実装でLambdaを起動する際に`context`に任意の値を保持して、リクエストのペイロードとして活用するような使い方はできません。
詳しくは過去記事[GoでLambdaからLambdaを呼び出すときに気をつけたいポイント6選](https://future-architect.github.io/articles/20201112/)をご確認ください。
このようなGoでの実装経験、ハマりどころは[Serverless連載2: AWS Lambda×Goの開発Tips](https://future-architect.github.io/articles/20200326/)など、[昨年の連載](https://future-architect.github.io/tags/Serverless%E9%80%A3%E8%BC%89/)でも様々な記事が執筆されています。

この機会に合わせてお読みいただければ幸いです。

# まとめ

* AWS lambdaをgoで実装する際にcontext.Contextを受け取るコードを実装できる
* contextにはリクエストID等の情報が含まれている
* contextの情報を扱うためのパッケージが用意されている
