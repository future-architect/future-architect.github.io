---
title: "静的解析によるInvalidなAWS Lambda関数シグネチャの検知"
date: 2021/06/03 00:00:00
postid: a
tag:
  - Go
  - Lambda
  - Linter
  - 静的解析
category:
  - Programming
thumbnail: /images/20210603a/thumbnail.jpg
author: 辻大志郎
lede: です。本記事では[AWS Lambda]の関数シグネチャを静的解析することで、より安全にAWS Lambdaを実装する方法を紹介します。"
---

<img src="/images/20210603a/business-4576778_640.jpg" alt="640" width="412" height="">

TIGの辻 ([@d_tutuz](https://twitter.com/d_tutuz))です。

本記事では[AWS Lambda](https://aws.amazon.com/jp/lambda/)の関数シグネチャを静的解析することで、より安全にAWS Lambdaを実装する方法を紹介します。

## はじめに

早速ですがAWS LambdaのアプリケーションをGoの[SDK](https://github.com/aws/aws-lambda-go/tree/v1.23.0)を用いて開発するときに、関数のハンドラは以下のシグネチャでなくてはなりません。

```go
func ()
func () error
func (TIn) error
func () (TOut, error)
func (context.Context) error
func (context.Context, TIn) error
func (context.Context) (TOut, error)
func (context.Context, TIn) (TOut, error)
```

関数を実行するときは [`lambda.Start`](https://pkg.go.dev/github.com/aws/aws-lambda-go@v1.23.0/lambda#Start) や [`lambda.StartWithContext`](https://pkg.go.dev/github.com/aws/aws-lambda-go@v1.23.0/lambda#StartHandlerWithContext) の引数として関数ハンドラを渡すことで、開発者が実装した関数ハンドラが実行されます。

以下はAWS LambdaをGoで実装するときの `main` パッケージの実装例です。

```go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(Handle)
}

func Handle(ctx context.Context) error {
	// ...
	// アプリケーションのロジックなど
}
```

### `interface{}` 型であるハンドラ

ところで `lambda.Start` 関数の引数であるハンドラは `interface{}` 型 [^3] です。

```go
func Start(handler interface{})
```

[^3]: Go1.18から導入予定の[型パラメータを使ったジェネリクス](https://go.googlesource.com/proposal/+/refs/heads/master/design/43651-type-parameters.md)が浸透すれば、今後引数の型の扱いは変わっていく可能性はあるでしょう。

`interface{}` 型として扱うため、以下の `HandleInvalid` のようにハンドラの関数シグネチャが、うっかり有効でないシグネチャになっていたとしてもビルド自体は成功します。有効でない関数シグネチャを引数に渡して実行するとどうなるのでしょうか？

```go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(HandleInvalid)
}

// ⚠️戻り値が int であるのは無効なシグネチャ⚠️
func HandleInvalid(ctx context.Context) int {
	// ...
	return 0
}
```

答えは "実行時エラー" になります。AWSのコンソールから実行すると以下のようなエラーメッセージが出力されます。

<img src="/images/20210603a/image.png" alt="実行時エラー表示" loading="lazy">

## 静的解析による関数シグネチャチェック

できることなら、有効でない関数シグネチャを早い段階で検知して、実行時エラーを防止したいですよね。

「静的解析」とはプログラムを実行せずにソースコードを解析することです。Goは静的解析のエコシステムが充実しており、静的解析でコードを検査して、不具合につながりそうなソースコードを検知することは一般的です。Go言語自体に備わっている `go vet` コマンドがありますし [^1]、サードパーティによるツールですとGoの典型的なエラー処理のミスを検知する [`errcheck`](https://github.com/kisielk/errcheck) や静的解析のツールセットである [`staticcheck`](https://staticcheck.io/) などがあります。

[^1]: `go vet` コマンドを知らなかったという方も、実は `go test` のときに `go vet` に含まれる一部の静的解析が実行されています。https://golang.org/pkg/cmd/go/internal/test/

### `unmarshal` モジュールによる静的解析

静的解析の例として `go vet` コマンドを用いてJSONをGoの型にマッピングするときの実装ミスを静的解析でチェックしてみましょう。Go公式のツールである `go vet` コマンドを実行したときに呼び出される `unmarshal` モジュールを使って検知できます。[^2] GoでJSONを型にマッピングするときは `json.Unmarshal` (あるいは `(Decoder).Decode`)を使います。`json.Unmarshal` に渡す第2引数はポインタである必要がありますが、ポインタになっていない場合に `go vet` コマンドを使うと、ポインタになっていないことを検知できます。

[^2]: https://golang.org/cmd/vet/ に含まれている `unmarshal` です。

```go
package main

import (
	"encoding/json"
	"log"
)

const jsonStr = `{"name":"gopher"}`

type User struct {
	Name string `json:"name"`
}

func main() {
	var u User
	// u はポインタ型 &u として渡す必要がある！
	if err := json.Unmarshal([]byte(jsonStr), u); err != nil {
		log.Fatal(err)
	}
}
```

このとき `$ go vet ./...` とすると以下のように出力されます。第2引数がポインタではないことを教えてくれます。

```
.\main.go:17:26: call of Unmarshal passes non-pointer as second argument
```

このように静的解析を行うことで、コードを実行せずに不具合につながるコードを早期に検知でき、品質向上に寄与します。

### 自作ツールでAWS Lambdaの関数シグネチャを静的解析

JSONのマッピングの実装ミスを静的解析で検知した要領で、AWS Lambdaにおけるハンドラの関数シグネチャも静的解析を行い、有効でない関数シグネチャを検知することを試みます。筆者が調べたところ、既存のツールとして公開されているものはなかったため自作しました。

- 静的解析ツールの自作

[`gostaticanalysis/skeleton`](https://github.com/gostaticanalysis/skeleton) を使うことで静的解析の雛形を生成でき、便利に静的解析ツールを作り始めることができます。また [`golang.org/x/tools/go/analysis`](https://pkg.go.dev/golang.org/x/tools/go/analysis) モジュールなどを用いて、構文解析の解析結果である抽象構文木やソースコードの型の情報など、静的解析に必要な情報を扱うことができ、静的解析したい独自のロジックを実装できます。

自作したAWS Lambdaの関数シグネチャを静的解析ツールは以下です。

<a href="https://github.com/d-tsuji/awslambdahandler">
<img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/d-tsuji/awslambdahandler.png" width="460px">
</a>

`d-tsuji/awslambdahandler` を使うと `Start` や `StartWithContext` の引数に渡す関数のシグネチャが正しくないコードを発見してくれます。

冒頭に紹介した、AWS Lambdaが実行時エラーになる以下のコードに対して、`awslambdahandler` で静的解析をしてみます。

```go main.go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(HandleInvalid)
}

// ⚠️戻り値が int であるのは無効なシグネチャ⚠️
func HandleInvalid(ctx context.Context) int {
	// ...
	return 0
}
```

- 静的解析の実施

`awslambdahandler` を実行すると、以下のように有効でない関数シグネチャとして検知できます。AWS Lambdaにデプロイして実行せずとも、実行時にエラーになる関数シグネチャを静的解析で検知できました。

```bash
$ go vet -vettool=`which awslambdahandler` main.go
# command-line-arguments
./main.go:10:14: lambda handler of "HandleInvalid" is invalid lambda signature, see https://pkg.go.dev/github.com/aws/aws-lambda-go/lambda#Start
```

- `awslambdahandler` のインストール

インストールは

```bash
go install github.com/d-tsuji/awslambdahandler/cmd/awslambdahandler@latest
```

などとして簡単にできます。CI環境に組み込めば、日々のチーム開発でより安全にAWS Lambdaを実装できます。ぜひ使ってみてください。

## まとめ

静的解析を実施することでバグにつながるコードを早い段階で検知できます。[`gostaticanalysis/skeleton`](https://github.com/gostaticanalysis/skeleton) や [`golang.org/x/tools/go/analysis`](https://pkg.go.dev/golang.org/x/tools/go/analysis) を用いることで便利に静的解析ツールを自作できます。`awslambdahandler` を用いることでAWS Lambdaの関数シグネチャを静的解析でき、より安全にAWS Lambdaを実装できるようになりました。

