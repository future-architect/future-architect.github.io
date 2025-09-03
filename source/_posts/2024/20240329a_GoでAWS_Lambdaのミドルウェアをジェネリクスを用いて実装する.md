---
title: "GoでAWS Lambdaのミドルウェアをジェネリクスを用いて実装する"
date: 2024/03/29 00:00:00
postid: a
tag:
  - Go
  - Lambda
  - Decorator
category:
  - Programming
thumbnail: /images/2024/20240329a/thumbnail.png
author: 真野隼記
lede: "AWS SDK for Goを用いてAWS Lambdaを実装する際に、共通的に行いたいミドルウェア的な処理をデコレータで実装する方法を説明します"
---
## はじめに

TIG真野です。

AWS SDK for Goを用いてAWS Lambdaを実装する際に、共通的に行いたいミドルウェア的な処理をデコレータで実装する方法を説明します。内容的には `http.HandlerFunc` に対してミドルウェアを作るのとほぼ同義です。

## 前提知識

AWS SDK for GoでLambdaを実装するにあたり、[関数ハンドラは複数のシグネチャを許容](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-handler.html)して、そのうち引数に `context.Context` を取るのは以下の4パターンです。この記事では便宜的に1~4で採番してパターン名を入れています

```go
// No.1 プレーンパターン
func (context.Context) error
// No2 TInパターン
func (context.Context, TIn) error
// No3 TOutパターン
func (context.Context) (TOut, error)
// No4 TInToutパターン
func (context.Context, TIn) (TOut, error)
```

例えば、「No.1 プレーンパターン」は`main.go` から、 `plain` パッケージの `Handle()` 関数を呼び出すように実装します。そうすると、SDK側で任意のトリガーでLambdaを起動するようハンドリングしてくれます。この例では2ファイルに分割していますが、このような技術的な制約は無いです。後の説明の都合で最初から分離しています。

```go cmd/lambda/main.go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
    "github.com/myproject/myapp/plain"
)

func main() {
	lambda.Start(plain.Handle)
}
```

```go plain/handler.go
package plain

func Handle(ctx context.Context) error {
	// ...
	// アプリケーションのロジックなど
}
```

さきほど提示したLambda関数ハンドラに登場する `TIn`, `TOut` は any型でどのような型をとっても良いため、ジェネリクス以前はデコレータ的な共通的な処理を書くためには、リフレクションに頼るか、イベント種別ごとに個別に作成する必要がありました。後者もTOutの場合はうまく扱うことができず最終的にはリフレクションに頼っていたと思います。

[Go 1.18から入ったジェネリクス](/articles/20220209a/)を用いてリフレクション無しで、上記の関数ハンドラをデコレータの設計でラップした実装を考えます。

前提知識をもう少し細かく知りたい人は次の記事もお勧めです。

- TIn, TOutの挙動については[AWS Lambda×Goの開発Tips](/articles/20200326/) に言及があります
- AWS SDK for Goが守るべきシグネチャを違反していないかのチェックは、辻さんの[静的解析によるInvalidなAWS Lambda関数シグネチャの検知](/articles/20210603a/)で紹介する静的解析ツールで行えます
- デレコータについては[CSV処理における共通処理をDecoratorパターンで実現する](/articles/20221021a/)も言及があります

## 共通で行いたい処理をデコレータで扱うの意

例えば、次のような処理は機能横断的（ある機能の閉じず、サービス全体に統制を図って適用したい）に実現したいことが多いです。

- panicのキャプチャ
- errorがnilでない場合のエラーハンドリング
- 実行時間の遅延監視
- トランザクション管理

扱うLambdaの数が少なければあまり気にしなくても良いですが、チーム規模が増え、開発規模もLambda関数が数十程度になってくると何かしら統制を図りたくなってくるものです。

デコレータの処理イメージですが、次のようなイメージです。先ほどの `plain/handler.go` で実装した `Handle()` 関数が真ん中のビジネスロジックの部分で、外側を1つ以上の共通処理でラップするようなことを行います。

<img src="/images/2024/20240329a/godecorator.drawio.png" alt="godecorator.drawio.png" width="1030" height="459" loading="lazy">

次の章からは具体的に実装例を紹介していきます。

## No1. プレーンパターンのデコレータ実装

まず `func (context.Context) error` の共通処理を書きます。このケースはジェネリクスの利用無しで対応できます。

次のように `LambdaFunc` を型定義します。`LambdaFunc`を引数と戻り値にした`Do()` 関数を作ります。これがデコレーターの本体（エントリーポイント）です。

```go lambdamiddleware/lambda_middleware.go
package lambdamiddleware

import (
	"context"
	"runtime/debug"
	"time"

	"github.com/rs/zerolog/log"
)

// プレーンパターンのLambda関数をデコレートするための型定義
type LambdaFunc func(ctx context.Context) error

// デコレート処理の本体
func Do(fn LambdaFunc) LambdaFunc {
	return errCheck(fn)
}

// 共通処理の一例（ここではエラーハンドリング）。これもデコレータ
func errCheck(fn LambdaFunc) LambdaFunc {
	return func(ctx context.Context) error {
		defer func() { // パニックのキャプチャ
			if err := recover(); err != nil {
				log.Error().Msgf("panic catch: %v\n%v", err, string(debug.Stack()))
			}
		}()

		err := fn(ctx)
		if err != nil {
			log.Error().Msgf("%v", err) // 共通的なエラーハンドリング（ここではエラーログを出したい）
			return err
		}
		return nil
	}
}
```

`errCheck` では拡張したい共通処理を実装して、先ほどの `Do()` 内で `fn` に被せます。デコレートぽいですね。

さて、これをmain.goに適用すると、次のように下の `plain.Handle` を `lambdamiddleware.Do()` でラップしたような変更となります。

```diff cmd/lambda/main.go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
    "github.com/myproject/myapp/plain"
+   "github.com/myproject/myapp/lambdamiddleware"
)

func main() {
-	lambda.Start(plain.Handle)
+	lambda.Start(lambdamiddleware.Do(plain.Handle))
}
```

挙動としては `plain.Handle` が `lambdamiddleware.Do()` に渡され、 `errCheck()` で呼び出されます。 `errCheck()` は `func(ctx context.Context) error` という関数を返す、というところがポイントです。

この手の実装は慣れないと困惑する人もいそうですが、Goだと HTTP Middlewareを作るために、`http.HandlerFunc` で同様の設計をよく見かけます。

辻さんの[HTTP Middleware の作り方と使い方](https://tutuz-tech.hatenablog.com/entry/2020/03/23/220326) を始め、参考になる情報が沢山あります。

## No2. TInパターンのデコレータ実装

No1と異なり、`TIn` は任意の型なので、ジェネリクスが登場します。型定義でジェネリクスを用いる場合は、 `type LambdaTInFunc[TI any] func(ctx context.Context, e TI) error` といった順序で宣言します。構造は同じです。

```go lambdamiddleware/lambda_tin_middleware.go
package lambdamiddleware

import (
	"context"
	"runtime/debug"
	
	"github.com/rs/zerolog/log"
)

type LambdaTInFunc[TI any] func(ctx context.Context, e TI) error

func DoTin[TI any](fn LambdaTInFunc[TI]) LambdaTInFunc[TI] {
	return errLogTIn(fn)
}

func errLogTIn[TI any](fn LambdaTInFunc[TI]) LambdaTInFunc[TI] {
	return func(ctx context.Context, e TI) error {
		defer func() {
			if err := recover(); err != nil {
				log.Error().Msgf("panic catch: %v\n%v", err, string(debug.Stack()))
			}
		}()

		err := fn(ctx, e)
		if err != nil {
			log.Error().Msgf("%v", err)
			return err
		}
		return nil
	}
}
```

呼び出し方も、次のように同様です。先ほどと異なり、Handle()関数には、 `events.DynamoDBEvent` という引数がありますが、ジェネリクスを用いているためどのような型でも受け止めることができます。

```go cmd/tinlambda/main.go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
    "github.com/myproject/myapp/tin"
    "github.com/myproject/myapp/lambdamiddleware"
)

func main() {
	lambda.Start(lambdamiddleware.DoTin(tin.Handle))
}
```

```go tin/handler.go
func Handle(ctx context.Context, e events.DynamoDBEvent) error {
	// ...
	// アプリケーションのロジックなど
}
```

## No3. TOutパターンのデコレータ実装

TOutパターンもほぼ同じです。1点補足すると `var zero TO` で初期値を生成している部分でしょうか。これもerr が not nil である状態ですので、 `return tout, err` としても挙動として問題ないため、好みに近いところです。

```go lambdamiddleware/lambda_tout_middleware.go
package lambdamiddleware

import (
	"context"
	"runtime/debug"
	
	"github.com/rs/zerolog/log"
)

type LambdaTOutFunc[TO any] func(ctx context.Context) (TO, error)

func DoTout[TO any](fn LambdaTOutFunc[TO]) LambdaTOutFunc[TO] {
	return errLogTOut(fn)
}

func errLogTOut[TO any](fn LambdaTOutFunc[TO]) LambdaTOutFunc[TO] {
	return func(ctx context.Context) (TO, error) {
		defer func() {
			if err := recover(); err != nil {
				log.Error().Msgf("panic catch: %v\n%v", err, string(debug.Stack()))
			}
		}()

		tout, err := fn(ctx)
		if err != nil {
			log.Error().Msgf("%v", err)
			var zero TO // ゼロ値
			return zero, err
		}
		return tout, nil
	}
}
```

呼び出され型はNo2, No4と類似になるため、割愛します。

## No4. TInTOutパターンのデコレータ実装

Tin, TOutパターンの組み合わせです。構造は同じです。

```go lambdamiddleware/lambda_tintout_middleware.go
package lambdamiddleware

import (
	"context"
	"runtime/debug"
	
	"github.com/rs/zerolog/log"
)

type LambdaTInTOutFunc[TI, TO any] func(ctx context.Context, e TI) (TO, error)

func DoTinTout[TI, TO any](fn LambdaTInTOutFunc[TI, TO]) LambdaTInTOutFunc[TI, TO] {
	return errLogTInTOut(fn)
}

func errLogTInTOut[TI, TO any](fn LambdaTInTOutFunc[TI, TO]) LambdaTInTOutFunc[TI, TO] {
	return func(ctx context.Context, e TI) (TO, error) {
		defer func() {
			if err := recover(); err != nil {
				log.Error().Msgf("panic catch: %v\n%v", err, string(debug.Stack()))
			}
		}()

		tout, err := fn(ctx, e)
		if err != nil {
			log.Error().Msgf("%v", err)
			var zero TO
			return zero, err
		}
		return tout, nil
	}
}
```

呼び出し方も特筆すべきことは無いです。引数、戻り値ともに任意の型（この例ではCloudWatchEvent経由で起動し、独自定義の構造体を返す）を扱えていることに着目ください。

```go cmd/tintoutlambda/main.go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
    "github.com/myproject/myapp/tin"
    "github.com/myproject/myapp/lambdamiddleware"
)

func main() {
	lambda.Start(lambdatintoutmiddleware.DoTinTOut(tintout.Handle))
}
```

```go tintout/handler.go
func Handle(ctx context.Context, e events.CloudWatchEvent)(MyStruct, error) {
	// ...
	// アプリケーションのロジックなど
}
```

## 別の共通処理を追加したい

ミドルウェアを拡張したい場合も紹介します。

例えば、Lambdaのタイムアウト100ms前にエラーログを出したいとします。最後のTinTouに追加すると次のように `delayCheckTInTOut()` を追加し、`DoTinTout()` にそれを追加して呼び出すことで対応できます。

```diff
func DoTinTOut[TI, TO any](fn LambdaTInTOutFunc[TI, TO]) LambdaTInTOutFunc[TI, TO] {
-	return errLogTInTOut(fn)
+	return delayCheckTInTOut(errLogTInTOut(fn))
}

+func delayCheckTInTOut[TI, TO any](fn LambdaTInTOutFunc[TI, TO]) LambdaTInTOutFunc[TI, TO] {
+	return func(ctx context.Context, e TI) (TO, error) {
+		deadline, _ := ctx.Deadline()
+		deadlineTerm := time.Until(deadline.Add(-100 * time.Millisecond))
+
+		errTime := time.AfterFunc(deadlineTerm, func() {
+			log.Error().Msgf("job process time error: %s sec has passed", deadlineTerm.String())
+		})
+		defer errTime.Stop()
+
+		return fn(ctx, e)
+	}
+}
```

同様の処理を、`lambda_middleware.go`、`lambda_tin_middleware.go`、`lambda_tout_middleware.go` に追加すれば完成です。

呼び出し側の `cmd/tintoutlambda/main.go` などには影響せずに横断的な遅延チェックを行えます。

## シグネチャが異なるミドルウェアを呼び出してしまった場合

例えば、本来lambdatintoutmiddleware.DoTinTOut()を呼び出すべきはずが、誤って `lambdatintoutmiddleware.DoOut()` を呼び出してしまったとします。

この場合、コンパイルエラーにできます。

```diff cmd/tintoutlambda/main.go
func main() {
-	lambda.Start(lambdatintoutmiddleware.DoTinTOut(tintout.Handle))
+	lambda.Start(lambdatintoutmiddleware.DoOut(tintout.Handle)) // コンパイルエラー(Cannot infer TI)
}
```

リフレクションでゆるふわ対応していたときは、実行時で検知（あるいは静的解析でがんばるか）だったので、レビュー時なども安心感があります。

## 運用してみて

今の私のチームは数十のLambdaがあり、Lambdaを追加するたびに共通的な処理が行えているかレビューするのは大変でした。また、共通的な処理がLambdaによって微妙に進化し始めるなど危険な状態でした。それらは完全に解消し、コード数も減ってハッピーな状態です。

ミドルウェアの呼び出しの使い分けはさほど難しくもなく、コンパイルエラーで誤りにはすぐ気がつくことができるためか、チームメンバーからも特に問い合わせが無く、今のところ何か困ったことにはなっていません。

## まとめ

AWS Lambdaの関数ハンドラのミドルウェアを、http.HandlerFuncのようにして作ってみました。Lambda関数ハンドラのシグネチャは、http.HandlerFuncより窓口が広いので、ジェネリクスを用いるとスッキリするよという話でした。
