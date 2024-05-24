---
title: "AWS利用時に read: connection reset by peer が出たときのリトライ検討"
date: 2021/10/26 00:00:00
postid: a
tag:
  - AWS
  - Network
  - リトライ
  - Go
  - トラブルシュート
  - Kinesis
  - TCP/IP
category:
  - Programming
thumbnail: /images/20211026a/thumbnail.png
author: 真野隼記
lede: "DynamoDBやKinesis Data Streamsなどを利用するサービスをそれなりの期間で稼働させているとポツポツ下記のようなエラーが発生することが分かりました。RequestError: send request failedcaused by: Post ...: read tcp 169.254.0.1:55638->3.113.218.4:443: read: connection reset by peer"
---
<img src="/images/20211026a/loop-button.png" alt="" title="febrian eka saputraによるPixabayからの画像" width="632" height="433">

## はじめに

TIG DXユニットの真野です。

DynamoDBやKinesis Data Streamsなどを利用するサービスをそれなりの期間で稼働させているとポツポツ下記のようなエラーが発生することが分かりました。

```sh エラーログ(改行を追加しています)
[MY-APP-ERROR-LOG] RequestError: send request failedcaused by:
  Post "https://kinesis.ap-northeast-1.amazonaws.com/":
    read tcp 169.254.0.1:55638->3.113.218.4:443:
      read: connection reset by peer
```

ここで疑問に思ったのは、少なくてもAWS SDK for Goを使っている限りは必要に応じてデフォルトでリトライをしてくれているはずです。下記のドキュメントでは通常は3回のリトライを実施してくれるとあります

* [Retries and Timeouts | AWS SDK for Go V2](https://aws.github.io/aws-sdk-go-v2/docs/configuring-sdk/retries-timeouts/)

では、上記のようなエラーがでるということはリトライを使い果たしても失敗したのでしょうか？ そもそも `read: connection reset by peer` って正確には何だ？という状態だったので調べました。


## read: connection reset by peer とは

サーバ側から（今回だとKinesis Data Streamsのエンドポイントのサーバ）から `RST(Reset TCP)` パケット（正確言うとRSTフラグが1のパケット）が送られて来た時にハンドリングされたエラーメッセージです。これを送信された場合は、接続要求や通信状態が拒否されたものとみなし、通信をリセットして終了する必要があるとのことです。発生条件はサーバ側の処理能力を超えた場合などに発生しうるそうです。

* [RSTパケット（reset packet）とは - IT用語辞典 e-Words](https://e-words.jp/w/RST%E3%83%91%E3%82%B1%E3%83%83%E3%83%88.html)

発生箇所は色々考えられますが、 エラーメッセージに `read tcp xxxx` とある場合はリクエストを送信して、レスポンスを読み込もうとして（read tcpしようとして）発生したと推測できます。


つまり、今回のログで言うと `Post "https://kinesis.ap-northeast-1.amazonaws.com/"` のリクエストはサーバ側に届いたものの、レスポンスを受信するタイミングでTPCレイヤーで通信に失敗したと見なせると思います。（自信が無いので間違っていましたらご指摘下さい）


Go側ではRSTパッケージを送られたかどうかは、エラーの文字列に `connection reset by peer` が含まれているかどうかでも分かりますし、ガンバるのであれば、syscallパッケージで判定できそうです。

```go RST判定のサンプル実装
import (
	"net"
	"os"
	"syscall"
)

func IsRSTErr(err error) bool {
	if opErr, ok := err.(*net.OpError); ok {
		if sysErr, ok := opErr.Err.(*os.SyscallError); ok {
			return sysErr.Err == syscall.ECONNRESET
		}
	}
	return false
}
```

本題から少し逸れたので、リトライについて話を戻します。


## AWS SDK for Go側のリトライハンドリングについて

AWS SDK for Goのリトライ処理についてはカスタマイズ可能です。方法は辻さんが過去にブログを書いてくれています。

* [AWS SDK for Goのリトライアルゴリズムを差し替える方法 | フューチャー技術ブログ](/articles/20210218/)

デフォルトの仕組みは、DefaultRetryerの[ShouldRetry](https://github.com/aws/aws-sdk-go/blob/d8a5a9febe5602f134648c18e9f83546284cda35/aws/client/default_retryer.go#L131) で、どのようなエラーが発生した時に、**リトライすべきか否か** を判定しています。`ShoudRetry` をさらに追っていくと、`IsErrorRetryable` という関数からさらに [isErrConnectionReset](https://github.com/aws/aws-sdk-go/blob/d8a5a9febe5602f134648c18e9f83546284cda35/aws/request/retryer.go#L208) という関数があることに気が付きます。

[connection_reset_error.goに実装された関数isErrConnectionReset](https://github.com/aws/aws-sdk-go/blob/d8a5a9febe5602f134648c18e9f83546284cda35/aws/request/connection_reset_error.go#L7)を見ると、かなり興味深い実装です。

```go connection_reset_error.goから抜粋
func isErrConnectionReset(err error) bool {
	if strings.Contains(err.Error(), "read: connection reset") {
		return false
	}

	if strings.Contains(err.Error(), "use of closed network connection") ||
		strings.Contains(err.Error(), "connection reset") ||
		strings.Contains(err.Error(), "broken pipe") {
		return true
	}

	return false
}
```

なんと、`read: connection reset` が含まれている場合は、 **リトライを行わない** 判定になっていました。`read` が入っていない `connection reset` はリトライを行うとは対照的です。

コミットのハッシュ値からこのコードへの補足を探すと、簡潔に説明しているコメントが見つかります。

* https://github.com/aws/aws-sdk-go/pull/2926#issuecomment-553196888
* https://github.com/aws/aws-sdk-go/pull/2926#issuecomment-553637658

書いていることを整理しました。

* （今回で言うとKinesis）へのサービスへのリクエストの書き込みに成功/失敗について、SDK側は分からない
    * レスポンス読み取りに失敗しただけなので、リクエスト自体は成功した（Kinesisにデータはputできた）かもしれない
* とはいえ、失敗した可能性があるのであれば自動でリトライをしても良い気がするが...？
    * SDKとしては指定された操作が冪等であるか分からないので、デフォルトの挙動としては安全側に倒しリトライしない

...なるほど、理由が分かるとスッキリしますね。
`read`がない `connection reset` をリトライするのは、おそらく書き込み側（リクエストを送信する時）にエラーになったケースなので、その場合は処理が成功することはありえないので、リトライを行うということだったようです。


## その上で今回はリトライすべきかどうか

今回の構築したサービスの仕様だと、Kinesis Data Streamsをサブスクライブしているアプリは **冪等** であることを期待しているので、重複してputすることを許容し、そのままリトライさせることにします。（ていうかKinesisであればそもそもサービスとしてAt Least Onceなので、SDK側の判断で重複リトライしてもよいのでは..という気もしましたが、ダメなケースがあるのかな）。

リトライ方法ですが、先程のカスタムリトライの記事にあったとおり、DefaultRetryerを拡張して実装します。


## カスタムリトライの実装

aws/aws-sdk-go のリポジトリの [exampleフォルダ](https://github.com/aws/aws-sdk-go/tree/main/example/aws/request/customRetryer)にカスタムリトライのサンプルコードがあり参考にできます。

実装を見ると、500番台のエラーは常に **リトライしない** という拡張なようです。

```go custom_retryer.goから抜粋
type CustomRetryer struct {
	client.DefaultRetryer
}

func (r CustomRetryer) ShouldRetry(req *request.Request) bool {
	if req.HTTPResponse.StatusCode >= 500 {
		// Don't retry any 5xx status codes.
		return false
	}

	// Fallback to SDK's built in retry rules
	return r.DefaultRetryer.ShouldRetry(req)
}
```

今回私が実装したいのは、**read: connection reset** の時も **リトライを行いたい** ということなのでその条件のときに `return true` という、ほぼ同じ考えが適用できるステキなサンプルでした。

次に実装をあげますが、元のDefaultRetryerがtemporaryというインターフェースでスイッチしていた実装なのでそれを切り貼りしています。

```go read_connection_resetの時もリトライする
type CustomRetryer struct {
	client.DefaultRetryer
}

type temporary interface {
	Temporary() bool
}

func (r CustomRetryer) ShouldRetry(req *request.Request) bool {
	if isErrReadConnectionReset(req.Error); {
		return true
	}
	return r.DefaultRetryer.ShouldRetry(req)
}

func isErrReadConnectionReset(err error) bool {
	switch e := err.(type) {
	case awserr.Error:
		origErr := e.OrigErr()
		if origErr != nil {
			return isErrReadConnectionReset(origErr)
		}
	case temporary:
		if strings.Contains(err.Error(), "read: connection reset by peer") {
			return true
		}
	}
	return false
}
```

上記の実装だと、`read: connection reset`が発生した場合に規定の回数より多くリトライをしてしまうのでは？という懸念が浮かびましたが、ドキュメントを読むと最大リトライの配慮は別処理でなされるので問題ないようです。

> // Implementations may consider request attempt count when determining if a
> // request is retryable, but the SDK will use MaxRetries to limit the
> // number of attempts a request are made
> ShouldRetry(*Request) bool
> https://docs.aws.amazon.com/sdk-for-go/api/aws/request/#Retryer

それ以外の判定はDefaultRetryerに最終的な判断を移譲させます。


実装したカスタムリトライは aws sessionで設定できます。

```go
var kc = kinesis.New(session.Must(session.NewSession(&aws.Config{
			Retryer: CustomRetryer{},
		}),
	))
```

DefaultRetryer側の設定を変えたい場合は、埋め込んでいるためそのまま設定できます。

```go NumMaxRetriesを変更した例
var kc = kinesis.New(session.Must(
		session.NewSession(&aws.Config{
			Retryer: CustomRetryer{
				DefaultRetryer: client.DefaultRetryer{
					NumMaxRetries: client.DefaultRetryerMaxNumRetries,

					// その他のデフォルト値も必要であれば設定しておく
					MinRetryDelay:    client.DefaultRetryerMinRetryDelay,
					MinThrottleDelay: client.DefaultRetryerMinThrottleDelay,
					MaxRetryDelay:    client.DefaultRetryerMaxRetryDelay,
					MaxThrottleDelay: client.DefaultRetryerMaxThrottleDelay,
				},
			},
		}),
	))
```

既存のパッケージの機能をそのまま使えるのは安心感があると思います。こういう薄いラッパーが作りやすいのは嬉しい仕組みですね。

## errors.Is() で判定できるのでは？

私は試していませんが、 `syscall.ECONNRESET` を用いて判定もできるかと思います。先ほどのisErrReadConnectionReset()を少し書き換えます。

awserror.Error は `%w` で下のエラーをラップしていないため、 `OrigErr()` に対して判定するのがコツだと思われます。

```diff
func isErrReadConnectionReset(err error) bool {
	switch e := err.(type) {
	case awserr.Error:
		origErr := e.OrigErr()
		if origErr != nil {
			return isErrReadConnectionReset(origErr)
		}
	case temporary:
-		if strings.Contains(err.Error(), "read: connection reset by peer") {
+		if errors.Is(err, syscall.ECONNRESET) {
			return true
		}
	}
	return false
}
```


## さいごに

今まであまり深く気に留めていなかった `read: connection reset by peer` といったエラーに関しても、SDK実装者側の設計や配慮を抑え、アプリ開発に活かすと不明瞭な点が減り、より自信を持ったコードを書けるようになりました。

AWS SDK for GoはGitHub上でのやり取り含めてちゃんと運用されており、学びになります。ハマったときはコードの内部を追ってみるのもオススメだと思いました。

