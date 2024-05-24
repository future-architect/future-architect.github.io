---
title: "Serverless連載2: AWS Lambda×Goの開発Tips"
date: 2020/03/26 14:24:00
postid: ""
tag:
  - Go
  - AWS
  - サーバーレス
  - Lambda
category:
  - Programming
author: 真野隼記
lede: "サーバレス連載の第2弾はLambdaアプリをGoで開発する中で調べた内容や、Tipsを紹介します。"
---

# はじめに

こんにちは、TIG/DXユニットの真野です。

[サーバレス連載](/articles/20200322/)の第2弾は、典型的なAWSサービスであるLambdaアプリをGoで開発する中で調べた内容や、Tipsを紹介します。

## Lambdaの利用コア数は？

結論⇨ ~~全ての場合で"2"でした。~~

(**2021/05/22追記**) アップデートがあり、最大6vCPUまで上限が上がりました。

* [AWS News Blog: New for AWS Lambda – Functions with Up to 10 GB of Memory and 6 vCPUs](https://aws.amazon.com/jp/blogs/aws/new-for-aws-lambda-functions-with-up-to-10-gb-of-memory-and-6-vcpus/)


**以下は2020.03時点の調査結果です。**

Goで開発する場合、少しでも性能を稼ぐためgoroutineを使う場面も多いと思います。特にバックエンドのデータストアがDynamoDBである場合は負荷を気にする必要がほぼ無いため、わたしはデータの書き込み部分を良く並列化することが多いです。

そういった場面で概算でどれくらい性能上がるのかな？と推測ができるよう、Lambda上で利用できるgoroutineの個数を調べました。メモリを128MB~3008MBを調整することで、裏のCPUやNW幅も増減する話も聞いたので、メモリサイズを変えて調べました。

Goで利用コア数を調べるには [NumCPU](https://golang.org/pkg/runtime/#NumCPU) を利用するそうです。これをLambdaのお作法に組み込みます。

Goにおける[Lambda関数の規約](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-handler.html)から、最も短いシグネチャは `func()` ということで、単に標準出力するだけのものを作成します。

```go 検証コード
package main

import (
	"fmt"
	"github.com/aws/aws-lambda-go/lambda"
	"runtime"
)

func main() {
	lambda.Start(func() { fmt.Println(runtime.NumCPU()) })
}
```

これを[公式の手順を参考に](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-package.html)にデプロイします。

起動トリガーは何でも良いですが、今回はKinesis Data Streamをマッピングさせ、AWS CLIで `aws kinesis --profile=my_lambda_test put-record --stream-name dev-test-lambda --partition-key 123456789 --data MTIzNDU=` など適当なデータを投入し実行します。

例えば、メモリを1024MB与えて、実際に起動すると以下のようなログがCloudWatchLogsに出力されます。メモリなど設定を変更するたびに、LogStreamが変わるのでご注意ください。

```
2020-03-26T03:10:39.194+09:00 START RequestId: 65078a85-9db0-45b0-bbf2-81a4eb19a08a Version: $LATEST
2020-03-26T03:10:39.195+09:00 2
2020-03-26T03:10:39.195+09:00 END RequestId: 65078a85-9db0-45b0-bbf2-81a4eb19a08a
2020-03-26T03:10:39.195+09:00 REPORT RequestId: 65078a85-9db0-45b0-bbf2-81a4eb19a08a Duration: 0.67 ms Billed Duration: 100 ms Memory Size: 1024 MB Max Memory Used: 34 MB Init Duration: 74.46 ms
```

実際に128MB, 512MB, 1024MB, 3008MBでLambdaを動かし、`runtime.NumCPU()` の値を取得すると以下の結果でした。

|Memory[MB]| NumCPU |
|----------|--------|
|128       | 2      |
|512       | 2      |
|1024      | 2      |
|3008      | 2      |

...全部2ですね。

もちろん、利用可能なCPU利用時間はメモリサイズによって変動すると思いますので、Concurrentにgoroutineを動かす場合は、メモリサイズを上げることは有効な対策になると思いますので、ユースケースに合わせてパラメータを検討しようと思います。

ちなみに、隣に座っている同僚が、つい最近メモリサイズごとの処理性能を計測していましたので大体どのくらいメモリを与えるとよいかの指標は近いうちに公開したいと思います。


## Lambdaの初期処理のポイント

[ドキュメント](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-handler.html#golang-handler-state) に記載している通り、Lambda関数外に変数を宣言できますし、init関数を用いる事もできます。Lambda関数は同時に1つしか動かないのでスレッドセーフを気にせずフィールドにおけるそうです。

init関数も良いですが、普通にmain関数内に初期処理を書いています。

```go main関数内でフィールドに初期化するコード
var kc *kinesis.Kinesis

func handle(ctx context.Context, e events.KinesisEvent) error {
	// kcを使った何かしらのロジック
}

func main() {
	kc = kinesis.New(/* 色々な初期化処理 */),
	lambda.Start(handle)
```

こうすると、Lambdaの実行時間を削減につながる≒課金額を減らせる可能性があるため、初期処理に寄せられるものはドンドン寄せたほうが良い使い方になります。


## Lambdaの関数タイプ

Lambdaの関数として以下の8パターンが利用できます。`TIn`, `TOut` はencoding/json 標準ライブラリと互換性のある（≒Marshal, Unmarshalができるの意だと思います）必要があります。

1. `func ()`
1. `func () error`
1. `func (TIn), error`
1. `func () (TOut, error)`
1. `func (context.Context) error`
1. `func (context.Context, TIn) error`
1. `func (context.Context) (TOut, error)`
1. `func (context.Context, TIn) (TOut, error)`

このとき、ApiGatewayEventであれば `TIn`や`TOut` があるのもわかりますが、KinesisEventの場合は`TIn`は意味がわかるものの、戻り値 `TOut`は何にも使われないはずなので、使ったらどうなるのか気になりました。仮にKinesisEventで`TOut` を用いるとエラーになるのでしょうか？

結論⇨ KinesisEventでも `TOut`はあってもなくても良い。

4の形式でLambdaを作成し起動してみます。`TOut`は何でも良いということで、適当にResponseというStructを作成します。main関数では引数なし・Responseの固定値を返します。

```go 4の形式のLambda
type Response struct {
	Payload string
}

func main() {
	lambda.Start(func() (Response, error) {
		return Response{Payload: "future"}, nil
	})
}
```

同じようにKinesisトリガーにし実行すると以下のようなログが出力されました。
特にResponseの内容は出力されませんし、エラーにもなっていませんでした。

```
2020-03-26T03:52:06.697+09:00 START RequestId: 27bc00f8-d7de-48d1-8c05-1f69c2c3ab07 Version: $LATEST
2020-03-26T03:52:06.698+09:00 END RequestId: 27bc00f8-d7de-48d1-8c05-1f69c2c3ab07
2020-03-26T03:52:06.698+09:00 REPORT RequestId: 27bc00f8-d7de-48d1-8c05-1f69c2c3ab07 Duration: 0.77 ms Billed Duration: 100 ms Memory Size: 3008 MB Max Memory U
```

ということで、Lambdaの起動トリガーとなるEvent種別とマッチしないような関数シグネチャを使っても問題ないということがわかりました。Responseが後続連携のSNSなどにうまく渡せると面白いかなと思いましたが、それは未検証です（パット見、Responseをどう取得できるか分からなかったため）

個人的な考えですが、LambdaのHandler関数をテストする時に、戻り値があると色々と検証が捗るため、Kinesis Triggerであっても戻り値 `TOut`は指定するようにしています。


## errorとLogging

これはLambdaに限らないかもですが、LambdaのHandler関数の中で、以下のようにログ出力とerror をreturnするコードがあり、重複してて嫌だなと思いつつ、気持ちを込めてダブルメンテしていました。そのまま errorをreturnするだけでLambdaサービス側でerrorの内容を出力してくれるのですが、 `ERROR` といった文字列などカスタマイズしたい場合は2度手間せざるおえなかったです。

↓の例では一箇所ですが、こういったハンドリングが複数あると見落としも怖いと思うこともありました。

```go よくあるerrorのreturnとlog出力
if err := Hoge(ctx, hogeInput); err != nil {
	log.Error().Msgf("put dynamoDB: %v %+v", err, models)
	return fmt.Errorf("put dynamoDB: %w %+v", err, models)
}
```

これの対応としてhttpのMiddlewareのような関数を宣言すると良いかもしれません。
`func (context.Context, TIn) error` パターンで作ってみています。

```go Middlewareライクな関数
type lambdaHandlerFunc func(ctx context.Context, ke events.KinesisEvent) error

func errLog(fn lambdaHandlerFunc) lambdaHandlerFunc  {
	return func(ctx context.Context, ke events.KinesisEvent) error {
		if err := fn(ctx, ke); err != nil {
			// ログなど横断的な処理を加える
			log.Error().Msgf("lambda err: %v", err)
			return err
		}
		return nil
	}
}
```

上記のようなerrLogという関数を、ロジックが実装された `handle` をWrapすると事前・事後の処理をうまくWrapすることができます。

```go 呼び出す場合
lambda.Start(errLog(handle))
```

この辺はガンバりすぎると一種のアプリケーションフレームワークのように進化を遂げて、いろいろな功罪を生みそうですが、機能をシンプルに保てる体制の見通しがあれば導入しても良いかなと最近考えています。

## return errorした場合の errorString null対応

以下のように任意のerrorをreturnしたときのCloudWatchLogs側のログ出力ですが...

```go エラー出力時
func main() {
	lambda.Start(func() error {
		return errors.New("BAD REQUEST")
	})
}
```

以下のように、 `BAD REQUEST` の後に `errorString null` というのが出力されます。

問題ないといえば無いですが、 `null` といわれると少し気持ち悪い気持ちがありました。

```log Lambdaの実行ログ
2020-03-26T10:02:58.888+09:00 START RequestId: 8f41435e-5caa-4feb-a1ea-d1f1d6d56811 Version: $LATEST
2020-03-26T10:02:58.888+09:00 BAD REQUEST: errorString null
2020-03-26T10:02:58.889+09:00 END RequestId: 8f41435e-5caa-4feb-a1ea-d1f1d6d56811
2020-03-26T10:02:58.889+09:00 REPORT RequestId: 8f41435e-5caa-4feb-a1ea-d1f1d6d56811 Duration: 1.03 ms Billed Duration: 100 ms Memory Size: 1024 MB Max Memory ...
```

この `null` の部分ですが、ドキュメントで探せなかったですが、内部のErrorを示すStructが持つフィールドを見たところ正体はStackTraceのようです。

設定の方法は、[コードを読んだ限り](https://github.com/aws/aws-lambda-go/blob/master/lambda/function.go#L33)通常の error を returnする形では設定できないようで（間違えていればご指摘ください）、panicを発生させると設定されるようです。

```go
func main() {
	lambda.Start(func() error {
		panic("BAD_REQUEST with panic")
	})
}
```

上記のLambdaを実行すると、以下のようなログが出力されます

```log
2020-03-26T10:15:05.546+09:00 START RequestId: 8f41435e-5caa-4feb-a1ea-d1f1d6d56811 Version: $LATEST
2020-03-26T10:15:05.547+09:00 BAD_REQUEST with panic: string
[
   {"path": "github.com/aws/aws-lambda-go@v1.15.0/lambda/function.go", "line": 36, label": "(*Function).Invoke.func1"},
   {"path": "runtime/panic.go", "line": 679,  "label": "gopanic"},
   {"path": "MyApplication/lambda.go", "line": 10, "label": "main.func1"},
   // 省略
]
2020-03-26T10:15:05.583+09:00 END RequestId: 8f41435e-5caa-4feb-a1ea-d1f1d6d56811
2020-03-26T10:15:05.583+09:00 REPORT RequestId: 8f41435e-5caa-4feb-a1ea-d1f1d6d56811	Duration: 36.24 ms	Billed Duration: 100 ms	Memory Size: 1024 MB	Max Memory Used: 34 MB	Init Duration: 66.10 ms
2020-03-26T10:15:05.583+09:00 BAD_REQUEST with panic string
```

panicということで予期せぬエラーの場合にはStackTraceを出してくれるのは助かりますね。

アプリケーションとしてpanicでエラーハンドリングすると、少々Lambda関数のUnitTestが難しくなりそうなので、なかなか導入する気にはなれないですが、どうしてもStackTraceを出したい場合などは検討してみても良いかもしれません。


# まとめ

* LambdaのGoから見た論理コア数⇨2固定
* Lambdaのコードは初期処理に寄せる
* 関数タイプは開発/テスト観点など好きなものを使って良い
* Lambda関数のパターンは決まっているのでmiddlewareを用意しても良いかも
* `errorString null`の`null`はStackTrace項目で、通常は `null` が入るで問題なし

[サーバレス連載](/articles/20200322/)の2本目でした。次は澁川さんの[Goでサーバーレス用の検索エンジンwatertowerを作ってみました
](/articles/20200327/)でした。
