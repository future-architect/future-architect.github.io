---
title: "New ReverseProxy Rewrite hook を動かしながら理解する"
date: 2023/01/31 00:00:00
postid: a
tag:
  - Go
  - Go1.20
  - リバースプロキシ
  - RFC
category:
  - Programming
thumbnail: /images/2023/20230131a/thumbnail.png
author: 棚井龍之介
lede: "- はじめに- 概要を確認- Proposal の内容と RFC の確認- 実際に動かしながら、Go1.19 と Go1.20 の違いを確認- まとめ"
---

<img src="/images/2023/20230131a/top.png" alt="" width="800" height="481">

# 目次

- はじめに
- 概要を確認
- Proposal の内容と RFC の確認
- 実際に動かしながら、Go1.19 と Go1.20 の違いを確認
- まとめ

# はじめに

こんにちは。
フューチャーアーキテクト株式会社、HR/新卒採用チームの棚井です。

略歴として、フューチャーに新卒入社、Technology Innovation Group で IT コンサルタントを 3 年、Global Design Group で新規事業開発を 1 年と担当し、現在は Human Resources（つまり HR）でバックオフィスの新卒採用業務を担当しております。

本記事は[Go 1.20 リリース連載](/articles/20230123a/) の 1 つです。
Go1.20 の **New ReverseProxy Rewrite hook** について解説していきます。

# 概要を確認

New ReverseProxy Rewrite hook はコアライブラリー（httputil）への機能追加です。
Release Note では[こちら](https://tip.golang.org/doc/go1.20#reverseproxy_rewrite)、Proposal は[こちら](https://github.com/golang/go/issues/50580)から確認できます。

リリースノートを見ると、英文で以下のような記載があります。

> **New ReverseProxy Rewrite hook**
> The httputil.ReverseProxy forwarding proxy includes a new Rewrite hook function, superseding the previous Director hook.
>
> The Rewrite hook accepts a ProxyRequest parameter, which includes both the inbound request received by the proxy and the outbound request that it will send. Unlike Director hooks, which only operate on the outbound request, this permits Rewrite hooks to avoid certain scenarios where a malicious inbound request may cause headers added by the hook to be removed before forwarding. See issue [#50580](https://github.com/golang/go/issues/50580).
>
> The ProxyRequest.SetURL method routes the outbound request to a provided destination and supersedes the NewSingleHostReverseProxy function. Unlike NewSingleHostReverseProxy, SetURL also sets the Host header of the outbound request.
>
> The ProxyRequest.SetXForwarded method sets the X-Forwarded-For, X-Forwarded-Host, and X-Forwarded-Proto headers of the outbound request. When using a Rewrite, these headers are not added by default.
>
> An example of a Rewrite hook using these features is:
>
> ```go
> proxyHandler := &httputil.ReverseProxy{
>    Rewrite: func(r *httputil.ProxyRequest) {
>     r.SetURL(outboundURL) // Forward request to outboundURL.
>     r.SetXForwarded()     // Set X-Forwarded-* headers.
>    r.Out.Header.Set("X-Additional-Header", "header set by the proxy")
>   },
> }
> ```
>
> ReverseProxy no longer adds a User-Agent header to forwarded requests when the incoming request does not have one.

リリースノートでの説明について、[Go1.20 の実コード](https://github.com/golang/go/blob/release-branch.go1.20/src/net/http/httputil/reverseproxy.go)と照らし合わせながら私なりに日本語訳しますと、

- httputil パッケージの ReverseProxy に、Rewrite hook を追加します。
  - Rewrite が提供する機能は、Director に取って代わる（supersede する）ものです。
  - この機能より、プロキシサーバーにて付与した "hop-by-hop" ヘッダーが、意図せずに削除されてしまう問題（[issue](https://github.com/golang/go/issues/50580)）に対応できるようになります。
- Rewrite が受け取る構造体として ProxyRequest も追加します。
  - ProxyRequest.SetURL が提供する機能は、NewSingleHostReverseProxy に取って代わるものです。
  - アウトバウンドリクエストのホストヘッダを設定します。

という感じでしょうか。

私自身が Go でリバースプロキシを立てた経験に疎く、1.19 から 1.20 への変更箇所がどのようなものなのか？ をイメージできなかったので、テストコード側の利用例を見たところ、httptest.NewServer の引数に http.Handler として渡す中身が NewSingleHostReverseProxy（Director 型）から func(r \*httputil.ProxyRequest) {...} （Rewrite 型）に変わっていました。

それぞれのコードについて、Go1.20は[release-branch.go1.20](https://github.com/golang/go/blob/release-branch.go1.20/src/net/http/httputil/example_test.go#L96-L128)を、Go1.19は[release-branch.go1.19](https://github.com/golang/go/blob/release-branch.go1.19/src/net/http/httputil/example_test.go#L96-L123)を参照しています。また、Go1.20とGo1.19のコード差分について、Go1.20 は「+」 1.19は「-」の diff で表現します。

```diff
package httputil

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

func ExampleReverseProxy() {
	backendServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "this call was relayed by the reverse proxy")
	}))
	defer backendServer.Close()

	rpURL, err := url.Parse(backendServer.URL)
	if err != nil {
		log.Fatal(err)
	}
+	frontendProxy := httptest.NewServer(&httputil.ReverseProxy{
+		Rewrite: func(r *httputil.ProxyRequest) {
+			r.SetXForwarded()
+			r.SetURL(rpURL)
+		},
+	})
-	frontendProxy := httptest.NewServer(httputil.NewSingleHostReverseProxy(rpURL))
	defer frontendProxy.Close()

	resp, err := http.Get(frontendProxy.URL)
	if err != nil {
		log.Fatal(err)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s", b)

	// Output:
	// this call was relayed by the reverse proxy
}
```

どちらのコードも実行してみると、プロキシ経由でのレスポンスが出力されます。

```bash
$ go run main.go
this call was relayed by the reverse proxy
```

リリースノートでの説明が「取って代わる（supersede する）機能」になっていることに対応して、利用例のコードも当然 Go1.20 スタイルにアップデートされているようです。

概要の確認はここまでとして、この Rewrite hook について「それで、何が嬉しいの？」の疑問を解消するために、Proposal の内容と照らし合わせながら説明していきます。

# Proposal の内容と RFC の確認

Proposal は [net/http/httputil: ReverseProxy can remove headers added by Director #50580](https://github.com/golang/go/issues/50580) です。

issue では 2 つの RFC（RFC 2616, section 13.5.11、RFC 7230, section 6.1）に言及されています。
RFC のリンクを貼ってもらえているので、ちょっとだけ内容を確認してみます。

まず、RFC 2616, section 13.5.1 End-to-end and Hop-by-hop Headers の内容を見ていくと、以下のような記述があります。
[RFC 2616, section 13.5.1](https://datatracker.ietf.org/doc/html/rfc2616#section-13.5.1)

> キャッシュプロキシと非キャッシュプロキシの動作を定義する目的のため、HTTP ヘッダーを「end-to-end」と「hop-by-hop」という 2 つのカテゴリに分類します。end-to-end はリクエストまたはレスポンスの最終的な受信者にまで送信されるヘッダーで、hop-by-hop はプロキシやキャッシュを通過しないヘッダーです。
> RFC にて言及された hop-by-hop に該当するヘッダーは以下です。
>
> - Connection
> - Keep-Alive
> - Proxy-Authenticate
> - Proxy-Authorization
> - TE
> - Trailers
> - Transfer-Encoding
> - Upgrade
>
> 上記以外で HTTP/1.1 にて定義されたヘッダーは end-to-end 側に含まれます。

ちなみに、issue 内では

> RFC 2616, section 13.5.1 specified a list of hop-by-hop headers which HTTP proxies should not forward.
> RFC 2616 セクション 13.5.1 は、プロキシサーバがフォワーディングすべきでない hop-by-hop ヘッダーのリストを定義している

と説明されています。

次に、 RFC 7230, section 6.1 Connection については、issue にて
[RFC 7230, section 6.1](https://datatracker.ietf.org/doc/html/rfc7230#section-6.1)

> RFC 7230, section 6.1 replaces the hardcoded list of hop-by-hop headers with the ability for the originator of a request to specify the hop-by-hop headers in the "Connection" header.
> RFC7230 セクション 6.1 では、リクエストの送信元が、ハードコードされた hop-by-hop ヘッダーのリストを、Connection ヘッダーで指定した hop-by-hop ヘッダーのリストに置き換えている。

との説明があります。

ざっくりと要約すると、RFC 2616,section 13.5.1 にて hop-by-hop ヘッダーに該当する項目が定義されて、RFC 7230, section 6.1 にてクライアントと通信するサーバーとの hop-by-hop な情報については Connection ヘッダーを利用することになった、ということです。

このような RFC にて定義された「hop-by-hop ヘッダーを通過させない仕様」や「Connection ヘッダー情報のハンドリング仕様」への対応実装は、[この部分](https://github.com/golang/go/blob/release-branch.go1.20/src/net/http/httputil/reverseproxy.go#L289-L543)で確認できます。

# 実際に動かしながら、Go1.19 と Go1.20 の違いを確認

[example_test.go](https://wgithub.com/golang/go/blob/release-branch.go1.20/src/net/http/httputil/example_test.go)のコードを加工しながら、Go1.20 と Go1.19 での挙動の違いを見ていきます。

Go1.20 側のコードでは、新しく追加された `Rewrite` を呼び出しています。
Go1.19 には `Rewrite` がないため、代わりに `Director` を利用します。

```diff
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
)

func main() {
	backendServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dump, err := httputil.DumpRequest(r, false)
		if err != nil {
			fmt.Fprintln(w, err)
		}
		fmt.Fprintln(w, string(dump))
	}))
	defer backendServer.Close()

	rpURL, err := url.Parse(backendServer.URL)
	if err != nil {
		log.Fatal(err)
	}
+	frontendProxy := httptest.NewServer(&httputil.ReverseProxy{
+		Rewrite: func(r *httputil.ProxyRequest) {
+			r.SetURL(rpURL)
+		},
+	})
-	frontendProxy := httptest.NewServer(&httputil.ReverseProxy{
-		Director: func(r *http.Request) {
-			r.URL = rpURL
-		},
-	})
	defer frontendProxy.Close()

	resp, err := http.Get(frontendProxy.URL)
	if err != nil {
		log.Fatal(err)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s", b)
}
```

この状態で動かしてみると、Go1.20 と Go1.19 では、それぞれ以下の出力が得られます。

```bash
$ go run main.go

# Go1.20
GET / HTTP/1.1
Host: 127.0.0.1:39973
Accept-Encoding: gzip
User-Agent: Go-http-client/1.1

# Go1.19
GET / HTTP/1.1
Host: 127.0.0.1:39259
Accept-Encoding: gzip
User-Agent: Go-http-client/1.1
X-Forwarded-For: 127.0.0.1
```

Go1.19 には `X-Forwarded-For` が自動追加されていますが、Go1.20 には追加されていないことがわかります。

リリースノートにて

> The ProxyRequest.SetXForwarded method sets the X-Forwarded-For, X-Forwarded-Host, and X-Forwarded-Proto headers of the outbound request. When using a Rewrite, these headers are not added by default.

と記載があるとおり、`Rewrite` を使う場合には、ProxyRequest.SetXForwarded を呼び出すことで `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto` の 3 つのヘッダーが追加されるようです。Director では `X-Forwarded-For` だけだったため、残りの 2 つも同時に追加したいという提案は[こちらの issue](https://github.com/golang/go/issues/50465)で会話されています。

```diff
func main() {
	...
	frontendProxy := httptest.NewServer(&httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(rpURL)
+			r.SetXForwarded()
		},
	})
	...
}
```

上記のように、ProxyRequest.SetXForwarded を追加して再度実行すると、バックエンドに到達するリクエスト内のヘッダーが 3 つ増えていることがわかります。

```bash
$ go run main.go

# Go1.20
GET / HTTP/1.1
Host: 127.0.0.1:46465
Accept-Encoding: gzip
User-Agent: Go-http-client/1.1
X-Forwarded-For: 127.0.0.1
X-Forwarded-Host: 127.0.0.1:44977
X-Forwarded-Proto: http
```

RFC 2616 では「hop-by-hop ヘッダーの削除」が定義されているので、次はこの動作確認として以下のコードを動かしてみます。
処理内部で新たにリクエストを作成して、ヘッダーに「Connection: Keep-Alive」を追加しています。

```golang
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
)

func main() {
	backendServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dump, err := httputil.DumpRequest(r, false)
		if err != nil {
			fmt.Fprintln(w, err)
		}
		fmt.Fprintln(w, string(dump))
	}))
	defer backendServer.Close()

	rpURL, err := url.Parse(backendServer.URL)
	if err != nil {
		log.Fatal(err)
	}
	frontendProxy := httptest.NewServer(&httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(rpURL)
			r.SetXForwarded()
		},
	})
	defer frontendProxy.Close()

	// create request
	req, err := http.NewRequest(http.MethodGet, frontendProxy.URL, nil)
	if err != nil {
		log.Fatal(err)
	}

	// add connection header
	req.Header.Set("Connection", "keep-alive")

	// check request content
	dump, err := httputil.DumpRequest(req, false)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(string(dump))

	resp, err := new(http.Client).Do(req)
	if err != nil {
		log.Fatal(err)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s", b)
}
```

こちらも、Go1.20 と Go1.19 のそれぞれで動かしてみると、どちらのバージョンにおいても、リクエスト生成直後に付与したヘッダー「Connection: Keep-Alive」が、プロキシサーバーを経由したのちに RFC の定義通りに削除されていることがわかります。

```bash
$ go run main.go

# Go1.20
GET / HTTP/1.1
Host: 127.0.0.1:45977
Connection: Keep-Alive

GET / HTTP/1.1
Host: 127.0.0.1:32815
Accept-Encoding: gzip
User-Agent: Go-http-client/1.1
X-Forwarded-For: 127.0.0.1
X-Forwarded-Host: 127.0.0.1:44977
X-Forwarded-Proto: http

# Go1.19
GET / HTTP/1.1
Host: 127.0.0.1:43403
Connection: keep-alive

GET / HTTP/1.1
Host: 127.0.0.1:43403
Accept-Encoding: gzip
User-Agent: Go-http-client/1.1
X-Forwarded-For: 127.0.0.1
```

こまで来てやっと、Proposal タイトルの「ReverseProxy can remove headers added by Director」について説明できます。
Proposal で提起された問題箇所を引用すると

> For example, if an inbound request contains a Connection: forwarded header, then any Forwarded header added by the Director will not be sent to the backend. This is probably surprising; under some circumstances, it may be a security vulnerability.
> 例えば、もしインバウンドリクエストが「Connection: forwarded」のヘッダーを保持している場合、Director により追加された Forwarded ヘッダーは、バックエンド側に送信されません。これはおそらく驚くべきことであり、ある状況下においてはセキュリティ上の脆弱性かもしれません。

とあります。
この現象を再現するために、以下のコードを Go1.19 環境にて動かしてみます。

```go
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
)

func main() {
	backendServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dump, err := httputil.DumpRequest(r, false)
		if err != nil {
			fmt.Fprintln(w, err)
		}
		fmt.Fprintln(w, string(dump))
	}))
	defer backendServer.Close()

	rpURL, err := url.Parse(backendServer.URL)
	if err != nil {
		log.Fatal(err)
	}
	frontendProxy := httptest.NewServer(&httputil.ReverseProxy{
		Director: func(r *http.Request) {
			r.URL = rpURL
			r.Header.Set("X-Forwarded-Proto", "http")
		},
	})
	defer frontendProxy.Close()

	// define request
	req, err := http.NewRequest(http.MethodGet, frontendProxy.URL, nil)
	if err != nil {
		log.Fatal(err)
	}

	// add connection:forwarded header
	req.Header.Set("Connection", "X-Forwarded-Proto")

	// check request content
	dump, err := httputil.DumpRequest(req, false)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(string(dump))

	resp, err := new(http.Client).Do(req)
	if err != nil {
		log.Fatal(err)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s", b)
}
```

インバウンドリクエストのヘッダーに「Connection: X-Forwarded-Proto」を付与して、Director にて「X-Forwarded-Proto: http」を追加しています。
この状態で実行すると、以下の出力が得られます。

```sh
$ go run main.go
# Go1.19

GET / HTTP/1.1
Host: 127.0.0.1:46127
Connection: X-Forwarded-Proto

GET / HTTP/1.1
Host: 127.0.0.1:46127
Accept-Encoding: gzip
User-Agent: Go-http-client/1.1
X-Forwarded-For: 127.0.0.1
```

出力内容から、Director で追加した「X-Forwarded-Proto: http」がバックエンドまで到達していないことがわかります。

Go1.20 で追加された Rewrite hook はこの問題に対応するもので、先に見ましたように [ProxyRequest.SetXForwarded](https://pkg.go.dev/net/http/httputil@master#ProxyRequest.SetXForwarded) を利用して 3 つの Forwarded ヘッダー（The X-Forwarded-For、X-Forwarded-Host、X-Forwarded-Proto）を追加することで「Director で追加した X-Forwarded- ヘッダーが削除されてしまう現象」対応しています。

# まとめ

- プロキシサーバーのリクエストルーティングで、これまで Director を使っていたところは、これからは Rewrite を使おう
- Rwrite に渡す ProxyRequest にて SetXForwarded を呼ぶことで、プロキシサーバーの情報 X-Forwarded-For,Host,Proto を自動追加してくれて便利

次は今泉さんの[vetのアップデート](/articles/20230202a/)です。
