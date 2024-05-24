---
title: "Go Tips連載6: Error wrappingされた各クラウドSDKの独自型エラーを扱う"
date: 2020/05/23 11:12:30
postid: ""
tag:
  - Go
  - GoTips連載
  - エラーハンドリング
category:
  - Programming
thumbnail: /images/20200523/thumbnail.png
author: 真野隼記
lede: "フューチャー社内には「Go相談室」というチャットルームがあり、そこでGoに関連する疑問を投げたら、大体1日くらいで強い人が解決してくれるという神対応が行われています。そこでAWSやGCPの独自エラーをError warppingされた時にどうやってハンドリングすればよいの？と聞いた時にやり取りした内容をまとめました。"
---

<img src="/images/20200523/top.png" loading="lazy">


[Go Tips連載](/tags/GoTips%E9%80%A3%E8%BC%89/)の第6弾です。

# はじめに

TIG DXユニットの真野です。先週の[この記事](/articles/20200519/)ぶりの投稿になります。

フューチャー社内には「Go相談室」というチャットルームがあり、そこでGoに関連する疑問を投げたら、大体1日くらいで強い人が解決してくれるという神対応が行われています。そこでAWSやGCPの独自エラーをError warppingされた時にどうやってハンドリングすればよいの？と聞いた時にやり取りした内容をまとめました。

# 背景

Go1.13から`fmt.Errorf` 関数に `%w`という[新しい構文が追加サポート](https://blog.golang.org/go1.13-errors)されたことは、ご存知の方が多いと思います。


利用方法は、`%w` (pkg/errorsの時と異なりコロンは不要だし末尾じゃなくてもOK) と一緒に `fmt.Errorf` を用いることで、コンテキストに合わせた情報をメッセージに追加できます。

```go %wを使った例
func main() {
    if err := AnyFunc(); err != nil {
        // 2009/11/10 23:00:00 main process: any func: strconv.Atoi: parsing "ABC": invalid syntax
        log.Fatalf("main process: %v", err)
    }
}

func AnyFunc() error {
    // 何かしらの処理
    if err != nil {
        return fmt.Errorf("any func: %w", err)
    }
    return nil
}
```

* [Go Playground] https://play.golang.org/p/C__gN90iyt7


また、error種別ごとに処理を分けたい場合で、Sentinel errorを判定する場合は、 errorsパッケージに追加された `errors.Is` でWrapの判定できます。逆に言うとWrapされている場合、今まで通りの `if err == ErrNotFound {` といった構文では判定できなくなるので、既存コードへの導入時は呼び出し元と合わせてリライトが必要です。

```go SentinelErrorをWrapしたときのハンドリング
var ErrNotFound = errors.New("not found")

func main() {
    if err := AnyFunc(); err != nil {
        if errors.Is(err, ErrNotFound) {
            // ErrorNotFound時のエラーハンドリング
        } else {
            // その他の場合のエラーハンドリング
        }
    }
}

func AnyFunc() error {
    // 何かしらの処理
    if err != nil {
        return fmt.Errorf("any func: %w", ErrNotFound) // Wrap
    }
    return nil
}
```

* [Go Playground] https://play.golang.org/p/R4KzOPVd_SA

この場合はシンプルで良いのですが、AWS SDK for GoなどのerrorをWrapした時に呼び出し側で判定をしたい時、どうすればよいのかが直接的な内容が見当たらなかったのでここにまとめておきたいと思います。


# Handling Errors in the AWS SDK for Go

[ドキュメント](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/handling-errors.html)を読むと例えば、AWSのErorrハンドリングは以下のように、`awserr.Error` というインターフェースで表現されており、一度errを型アサーションしてから内部的なエラーコードに応じてハンドリングすることになっています。

```go AWS-SDKの通常版エラーハンドリング
if err != nil {
    if aerr, ok := err.(awserr.Error); ok {
        switch aerr.Code() {
        case dynamodb.ErrCodeConditionalCheckFailedException:
            // エラーハンドリング
        case dynamodb.ErrCodeProvisionedThroughputExceededException:
            // エラーハンドリング
        default:
            // エラーハンドリング
        }
    } else {
        // エラーハンドリング
    }
}
```

これをWrapされたときは、呼び出し元で単純に型アサーションを行ってもうまく判定できません。

```go NGなケース
func AnyFunc() error {
    // 何かしらのAWS SDKを利用したコード
    if err != nil {
        return fmt.Errorf("aws operation: %w", err)
    }
}

func main() {
    if err := AnyFunc(); err != nil {
        if aerr, ok := err.(awserr.Error); ok { // 🆖型アサーションでは判定できない
            // AWS操作エラー特有のエラーハンドリング
        } else {
            // その他のエラーハンドリング
        }
    }
}
```

※Go Playgroundでサンプルを載せようと思いましたが、importでTimeoutになったので諦めました

# 対応方法

この `awserr.Error` を満たすerrorをWrapしたときはどうすべきかというと、 `errors.As` を用います。`errors.As` を代入用の変数とともに利用するとうまくいきます。

```go OKなコード
if err := AnyFunc(); err != nil {
    var aerr awserr.Error
    if ok := errors.As(err, &aerr); ok {
        switch aerr.Code() {
        case dynamodb.ErrCodeConditionalCheckFailedException:
            // 何かしらのエラーハンドリング
        case dynamodb.ErrCodeProvisionedThroughputExceededException:
            // 何かしらのエラーハンドリング
        default:
            // エラーハンドリング
        }
    } else {
        // その他のエラーハンドリング
    }
}
```

例として愚直にif分岐をすべて網羅するように書きましたが、早期returnを活用すると、よりネストが浅く見通しが良いコードにできると思います。


## GCP SDKの場合

しばしば[以下のエラーを返すことが多い](https://godoc.org/cloud.google.com/go/bigquery#hdr-Errors)とのことです。

https://godoc.org/google.golang.org/api/googleapi#Error

```go
if e, ok := err.(*googleapi.Error); ok {
    if e.Code == 409 { ... }
}
```

もしこれらのerrorをWrapする場合は、同様に `errors.As` で判定します。（実際は後述する各サービスごとに宣言されているSentinel errorで判断することが多いと思います）

```go
if err := AnyFunc(); err != nil {
    var gerr *googleapi.Error
    if ok := errors.As(err, &gerr); ok {
        switch gerr.Code() {
        case 409:
            // 何かしらのエラーハンドリング
        default:
            // 何かしらのエラーハンドリング
        }
    } else {
        // その他のエラーハンドリング
    }
}
```

一方で、[StorageなどはSentinel error](https://godoc.org/cloud.google.com/go/storage#pkg-variables)を返します。

```go StorageのSentinelError
var (
    // ErrBucketNotExist indicates that the bucket does not exist.
    ErrBucketNotExist = errors.New("storage: bucket doesn't exist")
    // ErrObjectNotExist indicates that the object does not exist.
    ErrObjectNotExist = errors.New("storage: object doesn't exist")
)
```

errorを返すAPIを利用してWrapした場合は `errors.Is` で判定します。

```go
// Storageに対して何かしらアクセスする処理
if err := AnyFunc(); err != nil {
    if ok := errors.Is(err, storage.ErrObjectNotExist); ok {
        // 何かしらのエラーハンドリング
    } else {
        // その他のエラーハンドリング
    }
}
```

どのAPIがどういったerrorを返しうるかは、各[GoDoc](https://godoc.org/cloud.google.com/go)に書いてありますので、個別のハンドリングが必要な場合は確認することになると思います。


# Stacktraceの出力について

https://play.golang.org/p/NAYR7XySCdW にサンプルコードを載せましたが、 `%w`構文を用いた`fmt`パッケージではStacktraceが出力されません。もし、Stacktraceが必要な場合は `fmt.Errorf`ではなく `xerrors.Errorf` を用いてWrapします。

シビアに性能が求められない、例えばBackendのWebAPIをGoで実装する場合は、 [xerrorsパッケージ](https://godoc.org/golang.org/x/xerrors)を利用した方が、2020/01/26 時点では良さそうです。

* xerrorsについては、そな太さんの [Goの新しいerrors パッケージ xerrors
](https://qiita.com/sonatard/items/9c9faf79ac03c20f4ae1) の記事がとても参考になりました


```go xerrorsを使った例
import (
	"fmt"
	"golang.org/x/xerrors"
)

func main() {
	if err := Func(); err != nil {
		fmt.Printf("stacktrace: %+v", err)
	}
}

func Func() error {
	if err := FuncInternal(); err != nil {
		return xerrors.Errorf("anyFunc %w - internal failed", err)
	}
	return nil
}

func FuncInternal() error {
	return xerrors.Errorf("any error")
}
```

* [Go Playground] https://play.golang.org/p/4xcqP7Ukt0H

これを実行するとStacktraceが出力されました。

```console Stacktrace出力例
stacktrace: anyFunc any error - internal failed:
    main.Func
        /tmp/sandbox921242282/prog.go:16
  - any error:
    main.FuncInternal
        /tmp/sandbox921242282/prog.go:22
```


ちなみに、xerrorsでWrapされたエラーでも、errors.Is, errors.Asで判定できました。（混在すると少し気持ち悪いですが）

* [Go Playground] https://play.golang.org/p/nfu_JXo6N_e



# まとめ

* Sentinel errorの場合は、`errors.Is` で、独自Error型を宣言している場合は、 `errors.As` を利用してハンドリングする
* Stacktrace情報が必要な場合は、xerrorsパッケージを利用する
* xerrorsでWrapしても `errors.Is`, `errors.As` で扱える
