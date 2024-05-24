---
title: "Goのnet/httpパッケージに出てくるTemporary()がなにか調べた"
date: 2022/02/03 00:00:00
postid: a
tag:
  - ソースコードリーディング
  - Go
  - Go1.18
category:
  - Programming
thumbnail: /images/20220203a/thumbnail.png
author: 真野隼記
lede: "net/httpパッケージのコードを呼んでいると、Temporary() 関数だけをもった temporary インターフェースが登場します。HTTP周りでtemporaryと聞くと、 307 Temporary Redirect のステータスコードのことかと思いますが、ちょっと違いそうです。どういったものでどういった場合に出てくるのか、調べました。"
---
<img src="/images/20220203a/top.png" alt="" width="500" height="208" loading="lazy">

## はじめに

TIG真野です。net/httpパッケージには非常にお世話になっています。Goの net/httpの内部にはサーバー/クライアントの両方が含まれていますが、今回はクライアントサイドの話です。

[TCPレベルの接続エラーの調査](https://future-architect.github.io/articles/20211026a/)のために標準パッケージやサードパーティのライブラリのコードを読み込んでいくと、Temporary() 関数だけをもった temporary インターフェースが登場します。HTTP周りでtemporaryと聞くと、 307 Temporary Redirect のステータスコードのことかと思いますが、ちょっと違いそうです。どういったものでどういった場合に出てくるのか、調べました。

## Temporary()とは

Temporary()はnet/http パッケージなどのコードを見ていると出てくる関数です。プライベートなインターフェースがあちこちのパッケージや呼び出し元のライブラリでつくられています。

```go
type temporary interface {
	Temporary() bool
}
```

例えば次のhttpErrorはtemporaryインターフェースを満たし、常にtrueを返すように実装されています。

```go transport.go
type httpError struct {
	err     string
	timeout bool
}

func (e *httpError) Error() string   { return e.err }
func (e *httpError) Timeout() bool   { return e.timeout }
func (e *httpError) Temporary() bool { return true }  //  常に true を返しているが..？
```

netパッケージのOpErrorもtemporaryインターフェースを満たし、Temporary()関数にはロジックが結構が入っています。

```go net.go
func (e *OpError) Temporary() bool {
	// Treat ECONNRESET and ECONNABORTED as temporary errors when
	// they come from calling accept. See issue 6163.
	if e.Op == "accept" && isConnError(e.Err) {
		return true
	}

	if ne, ok := e.Err.(*os.SyscallError); ok {
		t, ok := ne.Err.(temporary)
		return ok && t.Temporary()
	}
	t, ok := e.Err.(temporary)
	return ok && t.Temporary()
}
```

AWS SDK for GoにもorigiErrがtemporaryインターフェース(Temporary() boolの関数)を満たしていて、かつTemporary()の結果がtrueの場合はリトライする、みたいな実装がよくあります。

```go retryer.go
// AWS SDK for Goのretyer.goの例
func shouldRetryError(origErr error) bool {
	switch err := origErr.(type) {
	// 中略
	case temporary:
		if netErr, ok := err.(*net.OpError); ok && netErr.Op == "dial" {
			return true
		}
		// If the error is temporary, we want to allow continuation of the
		// retry process
		return err.Temporary() || isErrConnectionReset(origErr) // Temporary()がtrueの場合はリトライするのはなぜ？
```

どういったルールでtrue/falseになって、どのように使われるべきなんでしょうか。


## Temporary() の使い方

go.devの[Error handling and Go](https://go.dev/blog/error-handling-and-go) にドンピシャな説明が書いてありました（本来はエラーハンドリングの説明ですが）。

```go net.go
package net

type Error interface {
    error
    Timeout() bool   // Is the error a timeout?
    Temporary() bool // Is the error temporary?
}
```

このerrorは、Temporary()を呼ぶことで、一時的なネットワークエラーと永続的なネットワークエラーを区別するために用意されたようです。例えばWebクローラーは、一時的なエラーが発生したときにスリープして再試行し、それ以外の場合はあきらめるといった使い方に利用できるとのこと。サンプルコードも付いていました。

```go
if nerr, ok := err.(net.Error); ok && nerr.Temporary() {
    time.Sleep(1e9)
    continue
}
if err != nil {
    log.Fatal(err)
}
```

ということで、Temporary() は日本語訳そのままで、一時的なエラー（リトライすると成功するかも）かどうかを区別するために用意されたものでした。例えばURLが無効であるとかクライアントサイドの指定の問題は、何回繰り返しても成功することは無いのでTemporary() はfalseを返すべきだということです。

例を探すとIPアドレスのパースに失敗したときに呼ばれるnetパッケージのParseErrorはTemporary()を常にfalseを返していました。

```go
// A ParseError is the error type of literal network address parsers.
type ParseError struct {
	Type string
	Text string
}
func (e *ParseError) Error() string { return "invalid " + e.Type + ": " + e.Text }
func (e *ParseError) Timeout() bool   { return false }
func (e *ParseError) Temporary() bool { return false }  // IPアドレスのパース失敗時は同じ値を何度繰り返しても成功することは無いので、毎回false
```

最初に説明したhttpErrorはクライアント側で指定した時間に対してタイムアウトしたときに利用されていたため、再試行で成功する可能性があるためtrueが返されるのだと思います。OpErrorはシステムコール側の処理でのエラーハンドリング結果に移譲していますが、ECONNRESET(connection reset by peer)やアボートされたときはリトライの余地がありと判定しtrueを返しています。


## もはや非推奨である

ここまでTemporary()について説明してきましたが、netパッケージのErrorでは（おそらく）Go 1.18からのように書かれます。Deprecated（非推奨）になります。

```go
// An Error represents a network error.
type Error interface {
	error
	Timeout() bool // Is the error a timeout?

	// Deprecated: Temporary errors are not well-defined.
	// Most "temporary" errors are timeouts, and the few exceptions are surprising.
	// Do not use this method.
	Temporary() bool
}
```

[net: deprecate Temporary error status #45729](https://github.com/golang/go/issues/32463)に理由が書かれています。 Timeout()はわかりやすいけど、Temporary()は何が一時的で何が永続的なのかの区別が明確じゃなく、本来別の表現で区別されるものもTemporary()として扱われてしまっているのでは無いかということ。Timeout()で区別がつけるものはそちらを使いましょうということかと思います。（これだとECONNRESET, ECONNABORTEDが表現できない気がしますが...）

ちなみに、[os: remove ErrTemporary in Go 1.13 #32463](https://github.com/golang/go/issues/32463) にあるように、 `os.ErrTemporary` は削除されたようです。


## Temporary()の判定方法

Temporary()の判定にはType Switchしたり、次のようなerrors.As()を使って判定することが多かったかと思います。

```go 繰り返されるボイラーコード
type temporary interface { Temporary() bool }
var terr temporary
if errors.As(err, &terr) && terr.Temporary() {
    // ...
}
```

この辺は標準パッケージ側でヘルパー関数を作ったら？という提案が[proposal: errors: add new function Temporary(error) bool](https://github.com/golang/go/issues/37250)出ています。期待ですねと言いたいところですが、Temporary() の立ち位置自体が先程説明したようにちょっと微妙であるため、その結果次第ですがおそらく追加されることは無さそうです。



## まとめ

* Temporary()は一時的なエラーであるかどうかを示し、リトライで成功する可能性がある場合にtrueを返す
* 例えば、タイムアウトやTCP通信でコネクションリセットなどを返されたときにtrueになる
* とは言え、Temporary()の使い分けのハッキリとした定義が難しく、位置づけがTimeout()と被ることもあり非推奨の方向で進んでいる

