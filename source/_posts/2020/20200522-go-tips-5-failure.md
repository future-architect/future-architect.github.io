---
title: "Go Tips 連載5: エラーコードベースの例外ハンドリングの実装＋morikuni/failureサンプル"
date: 2020/05/22 00:14:52
postid: ""
tag:
  - Go
  - GoTips連載
  - 設計
  - エラーハンドリング
category:
  - Programming
thumbnail: /images/20200522/thumbnail.png
author: 多賀聡一朗
lede: "今回は、errors package を一部利用して、エラーコードベースのエラーハンドリング処理を実装しました。また、morikuni/failure を利用した実装への書き換えも試してみています。"
---

<img src="/images/20200522/top.png" loading="lazy">

# 概要

TIG DX所属の多賀です。最近は設計をしつつ Go も触れて引き続き楽しく仕事してます。

今回は、[errors](https://pkg.go.dev/errors?tab=doc) package を一部利用して、エラーコードベースのエラーハンドリング処理を実装しました。また、morikuni/failure を利用した実装への書き換えも試してみています。


# エラーコードベースの例外ハンドリングについて

前提としてGoで書かれた HTTP APIサーバーに対してのエラーハンドリングについて記載します。

**エラーコードベースの例外ハンドリング**についてですが、アプリケーションで発生するエラーを事前にラベリングしてコード化し、コードをもとにエラーハンドリングを実施することとします。発生時の運用対応や影響について、事前に一覧で整理することで、運用負荷を下げる意味があると考えています。(補足: Futureではメッセージコードと呼称することが多いですが、一般的な命名であるエラーコードで統一します)

以下のような形で整理しています。
実際は、エラーコード別に運用アクションも合わせて整理します。

エラーコード表 (例)

| エラーコード | エラー名 |
| :-- | :-- |
| XXX0001	 | クライアントエラー |
| XXX0002	 | DBコネクションエラー |
| XXX0003	 | 外部APIサーバーへのリクエストエラー |

エラーコードを利用した際に重要なことは、エラーコード外のエラーを発生させないことにあると考えています。エラーコード外のエラーが発生した際、何をどうしたらよいかが明文化されていないためです。エラーは、ログより発生を検知し対応するものとした際に、いかにアプリケーションから出力されるログに対して、適切にエラーコードを付与できるかが大事です。


# errors package を利用した実装例

アプリケーション側での、コンパイルレベルでの制約は難しくコードレビューでの担保もふくまれますが、以下のようにしてエラーを出力しています。

パッケージの構造としてはシンプルな以下のイメージです。

```sh
.
├── handler    # httpリクエストをハンドリングする層
├── service    # ビジネスロジック層
└── infra      # DBや外部API等の外部リソースへアクセスする層
```

## エラーコード別のエラーを定義

```go
package apperror

// AppError はエラーコードが付与されたエラーのinterface
type AppError interface {
	error
	Code() string
}

// 以下にエラーコード別にカスタムエラーを定義

type ClientError struct {
	Err error
}

func (e ClientError) Error() string {
	return "client error" + ": " + e.Err.Error()
}

func (e ClientError) Code() string {
	return "XXX0001"
}

func (e *ClientError) Unwrap() error {
	return e.Err
}
```

## handler 層に返却される error を必ずエラーコード対応Error型とする

各層のerror を wrappingして handler 層に返却します。ここは愚直にやらないといけないところです。(静的解析ツールを作ってチェックする機構を用意するほうがより良いですね。)

関数の戻り値の第2引数自体を `AppError` 型にすることも考えられますが、標準 error インターフェイスを尊重したほうが良いとのノウハウがあるので対応しませんでした。

参考: [初めてGolangで大規模Microservicesを作り得た教訓](https://www.slideshare.net/yuichi1004/golangtokyo-6-in-japanese?ref=https://golangtokyo.connpass.com/event/57168/presentation/)

```go
package service

type User struct {}

func (h User) Search(id string) (string, error) {
	// 処理...

	if err != nil {
		// err を wrap してエラー情報を追加する
		return "", apperror.ClientError{Err: fmt.Errorf("invalid id = %v: %w", id, err)}
	}

}
```

## エラーログを出力する箇所を集約

handler 層に集約させます。

```go
package handler

func UserHandleFunc(w http.ResponseWriter, r *http.Request) {
	app := service.User{}
	h, err := app.Search("id1")
	// err は 必ずエラーコード定義のエラー
	if err != nil {
		// エラーから共通のログを出力する関数を呼び出す
		errorLog(err)
		w.WriteHeader(500)
		return
	}
}

func errorLog(err error) {
	if e, ok := err.(apperror.AppError); ok {
		// エラーコードとメッセージをログに出力
		log.Printf("[%v] %v\n", e.Code(), e.Error())
	} else {
		// 予想外のエラー(実装ミス)
	}
}
```

上記の通りに実装することで、エラーコードにエラーを集約すること自体はできました。

ただ、独自エラーを定義して Wrapするところはもっと書きやすくできないか、検討の余地がありそうだと感じました。

# morikuni/failure を利用できないか?

morikuni/failure は morikuni さんが作成されたエラーハンドリング向けのライブラリです。errors package 存在前より開発されているライブラリです。

[https://github.com/morikuni/failure](https://github.com/morikuni/failure)

> Package failure provides an error represented as error code and extensible error interface with wrappers.

とのことなので、エラコードベースの利用にマッチしそうです。

以前の [Go Conference 2019 Spring にて発表されている資料](https://speakerdeck.com/morikuni/designing-errors) にて、failure と errors (当時は xerrors) の使い分けについて明確に説明されています。とてもわかりやすくて、しっくりきたことを覚えています。

<img src="/images/20200522/photo_20200522_01.png" style="border:solid 1px #000000" loading="lazy">

参考: [https://speakerdeck.com/morikuni/designing-errors?slide=33](https://speakerdeck.com/morikuni/designing-errors?slide=33)

## やってみた

morikuni/failure を利用して上記のコードを書き換えてみました。

### エラーコード別のエラーを定義

とてもシンプルですね。追加も簡単になりそうです。

```go
package apperror

import "github.com/morikuni/failure"

const (
	ClientError       failure.StringCode = "XXX0001"
	DBConnectionError failure.StringCode = "XXX0002"
	XXAPIRequestError failure.StringCode = "XXX0003"
)
```

### handler 層に返却される error を必ずエラーコードに対応させた独自エラーとする

morikuni/failure でも、エラーコードへの変換 ( `failure.Translate`  ) や エラーコードの Wrap ( `failure.Wrap` ) は可能です。
(ちなみに、failureで生成したエラーも errors package のインターフェイスを満たしています。)

```go
package service

import (
	"errors"

	"github.com/xxx/failure_sample/apperror"
	"github.com/morikuni/failure"
)

type User struct{}

func (h User) Search(id string) (string, error) {
	// 処理...

	if err != nil {
		// err を wrap してエラー情報を追加する
		return "", failure.Translate(err, apperror.ClientError, failure.Messagef("invalid id=%v", id))
	}

}
```


### エラーログを出力する箇所を集約

README の sample を参考にハンドリング処理を実装してみました。

```go
package handler

import (
	"log"
	"net/http"

	"github.com/xxx/failure_sample/apperror"
	"github.com/xxx/failure_sample/service"
	"github.com/morikuni/failure"
)

func UserHandleFunc(w http.ResponseWriter, r *http.Request) {
	app := service.User{}
	_, err := app.Search("id1")
	if err != nil {
		errorLog(err)
		w.WriteHeader(httpStatus(err))
		return
	}
	w.WriteHeader(http.StatusOK)
}

func errorLog(err error) {
	code, ok := failure.CodeOf(err)
	if !ok {
		log.Printf("unexpected error: %v\n", err)
		return
	}
	log.Printf("[%v] %v\n", code, err)
}

func httpStatus(err error) int {
	switch c, _ := failure.CodeOf(err); c {
	case apperror.ClientError:
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}
```

# 感想

エラーコードベースの例外ハンドリングのTipsについて記載しました。

failure を利用したほうがよりシンプルに書けて良いのではないかと感じています。
また、他のメリットとしては以下がありそうです。

- failureでWrapすることでスタックトレースが残る
- failureの便利関数を利用して Error のコンテキストを文字列以外の形式で作成できる

failureは実戦で使えてないので、次回チャレンジしてみたいです。

# 参考

- [Working with Errors in Go 1.13 - The Go Blog](https://blog.golang.org/go1.13-errors)
- [failure package · go.dev](https://pkg.go.dev/github.com/morikuni/failure?tab=doc)
- [エラー設計について / Designing Errors - Speaker Deck](https://speakerdeck.com/morikuni/designing-errors)
