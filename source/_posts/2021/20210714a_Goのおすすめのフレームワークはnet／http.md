---
title: "Goのおすすめのフレームワークはnet/http"
date: 2021/07/14 00:00:00
postid: a
tag:
  - Go
  - 技術選定
categories:
  - Programming
thumbnail: /images/20210714a/thumbnail.png
author: 澁川喜規
lede: "僕としてはGoのおすすめのフレームワークを聞かれたら、標準ライブラリのnet/httpと答えるようにしています。というよりも、Goの他のフレームワークと呼ばれているものは、このnet/httpのラッパーでしかないからです。Goでアプリケーションを作成する場合のイメージは次の通り。"
---
僕としてはGoのおすすめのフレームワークを聞かれたら、標準ライブラリの``net/http``と答えるようにしています。というよりも、Goの他のフレームワークと呼ばれているものは、この``net/http``のラッパーでしかないからです。

Goでアプリケーションを作成する場合のイメージは次の通り。battery includedなアプローチは他の言語でもたまにありますが、ついてくる機能が今時のものが多くて、標準ライブラリで済むことが多いです。ウェブ開発についてもそんな感じです。

PythonとかRubyとかもそうですが、言語組み込みのウェブサーバー機能はテスト用で本番運用には機能が足りない、性能が足りない、ということから「プロダクションに耐えうるフレームワークを別に入れないと」と思う人も多いんじゃないかな、と思いますが、Goの場合は組み込みのサーバーで問題なかったりします。Node.jsに近いかも？世間にはテスト用のはずだったのにやたら性能が高いPHPの内蔵サーバー（ケンオールで有名な会社の社長の作らしい）なんてものもあったりもしますが・・・

<img src="/images/20210714a/library-rate.png" alt="アプリケーションにおけるコードの比率" loading="lazy">

# Goのウェブを語る上で重要な2つの型

Goのnet/httpでは2つのインタフェースを定義しています。

* ``http.HandlerFunc``
* ``http.Handler``

前者は、こういうやつ。

```go
func Hello(w http.ResponseWriter, *http.Request) {
}
```

開発者（フレームワークユーザー）がイベントハンドラを実装するときにイベントハンドラが持つべき型ですね。わかりやすいですね。

後者は構造体でも関数でもなんでもいいが、次のメソッドを持っているやつはレスポンスを受け取れるよ、というやつです。

```go
func (r Receiver) ServeHTTP(http.ResponseWriter, *http.Request) {
}
```

実は前者の関数も、``http.HandlerFunc(Hello)``とラップしてあげれば、上記のメソッドが生えて``http.Handler``になる、というのはあるんですが、Goになじみがある人でも、この感覚は持ちにくいところかな、とは思います。今回はこの話は忘れてしまってもいいです。

この``ServeHTTP()``メソッドが誰が持つかと言うと、標準ライブラリでは``http.ServeMux``、いわゆる「Router」というやつです。Goの標準ライブラリのサーバー``http.Server``は、この``ServeHTTP()``を持つもの（ようするに``http.Handler``）を1つ受け取って、受け取ったリクエストの実際の処理をこいつに委譲します。

通常は``http.ServeMux``などのRouterを渡します。これに``http.HandlerFunc``の実際のロジックを登録して、パスごとのロジックを書く、というのがシンプルな状態ですね。

<img src="/images/20210714a/interface.png" alt="HandlerFuncの動作イメージ" loading="lazy">

リクエストを受け取ってヘッダーを解析したり、HTTP/2対応だったり、TLSだったりの下回り部分は標準ライブラリで用がすみます。

この``ServeMux``は他の``http.Handler``も子供にできるのでネストできます。一部のパスを別のRouterに渡せます。このインタフェースを提供している静的ファイル配信の[http.FileServer](https://golang.org/pkg/net/http/#FileServer)とか[http.RedirectHandler](https://golang.org/pkg/net/http/#RedirectHandler)とか柔軟に組み合わせられます。

<img src="/images/20210714a/nested-servemux-ページ3.png" alt="ネストしたルーター" loading="lazy">


最近のウェブのフレームワークは、ミドルウェアという機構を用意していたりします。リクエストを事前に解釈し、エラー処理をまとめて行ったり、認証チェックをしたり・・・図には書きにくいのですが、これも、``http.Handler``として振る舞い、受け取ったリクエストの処理結果を次の``http.Handler``に渡すラッパーという実装になります。標準ライブラリの[http.TimeoutHandler](https://golang.org/pkg/net/http/#TimeoutHandler)もこれですね。

<img src="/images/20210714a/middleware.png" alt="ミドルウェア" loading="lazy">

``net/http/httptest``といったテスト用パッケージも、``http.Handler``を受け取るローカルテスト用サーバーがいたりします。　猫も杓子も``http.Handler``です。

# 他のフレームワークはどうか？

まず、[Gorilla](https://www.gorillatoolkit.org/)と[chi](https://github.com/go-chi/chi)は、http.ServeMuxの置き換えて使うRouterを提供しています。置き換えなので、``http.Handler``を実装していますし、``http.HandlerFunc``も``http.Handler``も登録できます。サンプルを見てみるとお分かりのように、``http.Server``を使って、各ライブラリのRouterを起動するコードになっています。

ハンドラの形式がちょっと特殊っぽい[echo](https://echo.labstack.com/)はというと、[内部では``http.Server``を使っています](https://github.com/labstack/echo/blob/f20820c0030a0d8c8aa20f63996092faa329fe03/echo.go#L82)。また、[``http.Handler``インタフェースは実装](https://pkg.go.dev/github.com/labstack/echo/v4#Echo.ServeHTTP)しているし、標準ライブラリの``http.Handler``を[ラップしてechoの中に持ち込むこともできる](https://pkg.go.dev/github.com/labstack/echo/v4#WrapHandler)ので、やろうと思えば標準のサーバーの下の一部だけをEchoにしたり、他のライブラリのハンドラをぶら下げることもできます。

Ginも同様に、[``http.Server``の上に構築されています](https://github.com/gin-gonic/gin/blob/v1.7.2/gin.go#L336)し、それ自身が[``http.Handler``インタフェースを満たしていますし](https://pkg.go.dev/github.com/gin-gonic/gin#Engine.ServeHTTP)、[``http.HandlerFunc``などのラッパー](https://pkg.go.dev/github.com/gin-gonic/gin#WrapF)で標準形式のハンドラーもかけます。

この``http.Handler``は他の言語でいうWSGI/Rackとかのような、重要なインタフェースであることがお分かりいただけると思いますし、その上で標準のサーバーが利用上もスタンダードとなっていることがわかるでしょう。

一方で、違いとなっているのが、パスパラメータの切り出しだったり（標準ライブラリでは面倒）、各種ミドルウェアが最初からたくさんついてくるとかの差だったりします。echoは独自のインタフェースのミドルウェアですが、Gorillaはミドルウェアも他のフレームワークから利用できます。

# 例外はあるのか？

おそらく、[fasthttp](https://github.com/valyala/fasthttp)はnet/httpをラップしてないサーバーなんじゃないかと思います。

* https://github.com/valyala/fasthttp

fasthttpはnet/httpではなし得ないパフォーマンスを発揮するためにつくられたサーバーです。``http.Request``はハンドラーに渡ってくるときには、ヘッダーは完全にパースされて``map[string][]string``に格納されます。一方、fasthttpは不要なパースは避けるために、内部は文字列ですらなく、バイト列で情報を持っています。ヘッダー周りも[このありさま](https://github.com/valyala/fasthttp/blob/v1.28.0/header.go#L56-L86)です。


なお、最近[Tech Empower](https://www.techempower.com/benchmarks/#section=data-r20&hw=ph&test=fortune&l=zijocf-sf)でブイブイ言わせている次のライブラリはみんなこのfasthttpの上に構築されているようです。

* [atreugo](https://github.com/savsgio/atreugo)
* [fiber](https://github.com/gofiber/fiber)
* [gearbox](https://github.com/gogearbox/gearbox)

こんな感じで特別な事情があれば別実装はありえます。が、ちょっとエクストリームな選択肢ではあると思います。

# まとめ

Goでウェブのフレームワークを学ぶ場合、多少の機能差はあれど、どれも言語標準の共通の基盤の上に作られており、自由に組み合わせができることがわかります。``net/http``がある意味メタフレームワークとなっています。

``net/http``を単独でそのまま使おうとすると、標準の``http.ServeMux``ではちょっとRouterとして機能が少ないな、とかあります。HTML生成を``html/template``でやろうとしても、他の言語で慣れた記法とちょっと違って面食らって手が動きにくいということもあります。その場合にはchiとか、Go版[mustache](https://github.com/hoisie/mustache)など、いくつかを好きなサードパーティのライブラリに置き換える方法もあります。

echoやGinでもGorillaでもなんでも使っても問題ありません。どれも``net/http``の兄弟です。こいつらの方が、ミドルウェアなどはたくさんリリースしているので、他の言語ユーザーには親しみやすいかもしれません。これをフレームワークと呼ぶかどうか、便利なライブラリ集と見るかはあなた次第です。


