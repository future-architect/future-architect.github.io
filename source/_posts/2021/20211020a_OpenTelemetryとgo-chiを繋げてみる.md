---
title: "OpenTelemetryとgo-chiを繋げてみる"
date: 2021/10/20 00:00:00
postid: a
tag:
  - OpenTelemetry
  - go-chi
  - Go
  - CNCF
category:
  - Programming
thumbnail: /images/20211020a/thumbnail.png
author: 澁川喜規
lede: "OpenTelemetryのGoのTraceがstableになり、1.0がリリースされました。最初の1.0宣言からはだいぶ時間がかかりましたが、Go/Javaなどさまざまな言語の開発が同時進行で、共通のプロトコルも決めて、なおかつさまざまな拡張のAPIを提供して、さらにその拡張も現時点で300以上も提供されているあたり..."
---
OpenTelemetryのGoのTraceがstableになり、1.0がリリースされました。最初の1.0宣言からはだいぶ時間がかかりましたが、Go/Javaなどさまざまな言語の開発が同時進行で、共通のプロトコルも決めて、なおかつさまざまな拡張のAPIを提供して、さらに[その拡張も現時点で300以上も提供されている](https://opentelemetry.io/registry/)あたり、かなり巨大な風呂敷をどかーんと広げたような感じがします。

| 日時 | できごと |
|:-:|:-|
| 2021/02/17  | [OpenTelemetryのTracingの仕様が1.0に](https://medium.com/opentelemetry/opentelemetry-specification-v1-0-0-tracing-edition-72dd08936978)  |
| 2021/02/26  | [.NET実装が1.0に](https://medium.com/opentelemetry/opentelemetry-net-reaches-v1-0-e7c5e975fd44)  |
| 2021/03/06 | [Java実装が1.0に](https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/tag/v1.0.0)
| 2021/03/27  | [Python実装が1.0に](https://medium.com/opentelemetry/announcing-opentelemetry-python-1-0-4e097562b8e0) |
| 2021/09/20  | [C++実装が1.0に](https://github.com/open-telemetry/opentelemetry-cpp/releases/tag/v1.0.0)  |
| 2021/09/21  | [Go実装が1.0に](https://github.com/open-telemetry/opentelemetry-go/releases/tag/v1.0.0) |
| 2021/09/27  | [OpenTelemetry CollectorがGA](https://medium.com/opentelemetry/opentelemetry-collector-achieves-tracing-stability-milestone-80e34cadbbf5)  |
| 2021/10/01 | [JavaScript実装が1.0に](https://github.com/open-telemetry/opentelemetry-js/releases/tag/stable%2Fv1.0.0) |
| 2021/10/01 | [Ruby実装が1.0に](https://github.com/open-telemetry/opentelemetry-ruby/releases/tag/opentelemetry-sdk%2Fv1.0.0) |

PHP/Rust/Swift/Erlangあたりはコミットチャンス？

# 2年前からアップデートされていると感じたポイント

OpenTelemtryと、その前身のOpenCensusについてはこのブログでも取り上げました。

* [OpenCensus(OpenTelemetry)とは | フューチャー技術ブログ](/articles/20190604/)

基本的な考え方は前回紹介したものと変わっていませんが、2年前からいくつか変わったかも？と思ったところをピックアップするとこんなところですかね。

* OpenTelemetryはOpenTelemetry専用のエージェント（ログ中継サービス）の活用も最初から視野に入っており、エージェント向けのエクスポーターも提供されている（OpenCensusにもあったがバージョンが最終版でも0.1.11で安定版ではなかった）。
* stdoutロガーが一級市民扱い？
* トレース、メトリックスという2種類の機能のほかに、Fluentdのようなアプリケーションのログ機能も開発中

今までは、エクスポーターを明示的にアプリケーションが設定する使い方がメインでした。エージェントを使うということは、アプリケーションは最終的なログ収集基盤について知る必要がなくなり、システムを疎結合にできます。

stdoutは地味でデバッグ用途っぽさが前のOpenCensusにはありましたが、stdoutロガーはコンテナとの相性が抜群です。ログを受けとって流す先をカスタマイズできるようにするために、コンテナ内部にエージェントの接続先設定を変更するロジックを仕込む必要はありません。コンテナの外から色々できます。認証とかを気にする必要もありません。クラウドサービスだと、ログドライバーの選択だけで良くなりますね。

で、stdoutに出すとなると、トレース以外の情報とかと混ざってしまいがちなので、アプリケーションログ出力とかも一緒に出せる仕組みが整備されるといいな、というところでアプリケーションログ機能もOpenTelemetryが備えるのはうれしいですね。ただ出すだけではなくて、[トレースとリンクできるようにトレースIDを持つ](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md#trace-context-fields)ことが検討されてるようですね。実装は[Go製のFluentd的なStanza](https://github.com/observIQ/stanza)をベースにするとかなんとか。

# OpenTelemetryは分散しない人にも注目

OpenTelemtryはその名の通り「テレメトリー」のためのソフトウェア群です。テレメトリーは一般用語です。次の解説がわかりやすいです。

* [環境技術解説: テレメトリー（環境展望台)](https://tenbou.nies.go.jp/science/description/detail.php?id=87)

分散システムのすべてにsshしてログファイルをtailするとかはナンセンスですし、野生動物のトラッキング的に遠隔で情報収集する仕組みですが、そうじゃない人にも、何の情報をどう出すか、の指標にまで踏み込もうとしている点は個人的に注目ポイントです。

例えば、ウェブサービスのエンドポイントやデータベース接続でどんな情報を出すのか、といった情報がまとまっています。小規模のアプリケーションを作る人にも参考になるでしょう。

* [トレースのログ出力内容](https://github.com/open-telemetry/opentelemetry-specification/tree/main/specification/trace/semantic_conventions)

ログのエラーレベルについても[ガイドライン](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md#severity-fields
)が作られています。まだまだログの実装自体は行われていませんが、このあたり、言語やロギングライブラリによっても指標はバラバラでした。エラーレベル自体はそこまでブレることはないですが（CRITICALとかがあったりなかったりはあるが）、どういうキーですか？（LEVEL？SEVERITY？)とかも違っていました。そのため、ログ収集基盤を作った時に何をエラーとして通知するかは毎回手作りしていたと思いますが、指標が決まってくるとデフォルトでいい感じに動くようになってくるでしょう。ということで、各言語の次世代ロギングライブラリを作ってOSS界隈で名前を売りたい会社は今がチャンスと言えます。

以前、[Future Tech Nightでローカルで動くログビューア](https://future-architect.github.io/articles/20210427b/)を試しに作って発表しました。これも構造化ロギングを前提としたものですが、アプリケーションログ出力が平準化されるなら、少ない設定でいい感じに動くビューアーとかも開発しやすくなりますね。

# OpenTelemetryの始め方

アプリケーションに組み込む方法を紹介します。スタートするにはまずOpenTelemetryのサイトのRegisteryを見ると良さそうです。生のAPIを叩いてもいいのですが、アプリケーションの特定のミドルウェアやフレームワークとのインタフェースがinstrumentationとして提供されています。アプリケーション側のトレース情報を取り出す便利ライブラリがいくつもあります。

<img src="/images/20211020a/スクリーンショット_2021-10-02_11.52.04.png" alt="スクリーンショット_2021-10-02_11.52.04.png" width="1200" height="725" loading="lazy">

ここに対応したいプラグインが登録されていれば、そのサンプルコードを参考にするのが簡単です。例えば、gorilla/muxを使っていれば、[gorilla/mux用のinstrumentation](https://github.com/open-telemetry/opentelemetry-go-contrib/tree/main/instrumentation/github.com/gorilla/mux)があるので[このサンプルの通り](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/main/instrumentation/github.com/gorilla/mux/otelmux/example/server.go#L44)にアプリケーションに組み込めばいいので簡単ですね。gorilla/muxのミドルウェアとして実装されています。初期設定はありますが、実質一行です。

```go
r.Use(otelmux.Middleware("my-server"))
```

ただ、これでは１つのスパンが作られるだけなので、内部でスパンを作ったりしたい場合は`context.Context`の内部に格納された情報をもとに新しいスパンを作るAPIがあるのでそれを使います。[サンプルの中にもあります](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/main/instrumentation/github.com/gorilla/mux/otelmux/example/server.go#L71-L72
)ね。

```go
_, span := tracer.Start(ctx, "getUser", oteltrace.WithAttributes(attribute.String("id", id)))
defer span.End()
```

このサンプルもstdoutエクスポーターがが最初から設定されているので、まずはこの状態で動かしてみて、欲しい情報が出ているか確認します。確認できたら、エクスポーター側も変更して、実際の出力先へのインタフェースを追加していきます。GCPとか、OSSのJaegerとかZipkinとかもありますし、SaaSのSplunkとかNew Relicとかありますね。

AWSはコレクター向けのものがあるので、アプリのエクスポーターとしてはコレクターを選択してコレクターの設定をするとX-Rayに出せるようです。

# go-chiと繋ぐ

で、ここを見るとお気に入りのgo-chiがありません。go-chiに繋いでみます。gorilla/muxもgo-chiも、ミドルウェアとしては言語標準的なインタフェースを共有しているため、gorilla/muxが使えないか試してみましたが、スパン名がUnknownとなってしまいます。

というのも、インタフェースは同じであっても、[gorilla/mux](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/main/instrumentation/github.com/gorilla/mux/otelmux/mux.go#L120-L130)のエクスポーターは、contextに入っているgorilla/mux専用のデータにアクセスしてパス情報をとってきているからです。

では標準ライブラリの[net/http向けのエクスポータ](https://github.com/open-telemetry/opentelemetry-go-contrib/tree/main/instrumentation/net/http)が使えるかというと、これもそのままでは使えません。net/httpのエクスポータはスパン名をミドルウェア作成時に固定値（ここでは``"Hello"``)で渡す必要があります。

```go
otelHandler := otelhttp.NewHandler(http.HandlerFunc(helloHandler), "Hello")

http.Handle("/hello", otelHandler)
```

エンドポイントごとに別の名前を設定したい場合は、これをベースにchiのミドルウェアを作るとしたら（net/httpのexporterラッパー)次のようにエンドポイントごとに設定が必要ですし、URLのパスとスパン名と同じような名前を二度書かないといけないのはクールじゃないですね。

```go
// net/httpを使うとイマイチ
r := chi.NewRouter()
r.With(otel("hello").Get("/hello", helloHandler)
r.With(otel("bye").Get("/bye", byeHandler)
:
```

高機能なRouterと繋ぐには新しいinstrumentationを実装する必要があることがわかりました。ただ、インタフェースも含めてgorilla/muxのものがほぼ近いのでこれを改造すれば良さそうです。gorilla/muxから情報をもらってくるところを書き換えれば良さそうです。

```go
// 変更前
route := mux.CurrentRoute(r)
if route != nil {
	var err error
	spanName, err = route.GetPathTemplate()
	if err != nil {
		spanName, err = route.GetPathRegexp()
		if err != nil {
			spanName = ""
		}
	}
}
routeStr := spanName

// 変更後
c := chi.RouteContext(r.Context())
spanName := c.RoutePattern()
```

これで完璧じゃん、と思ったが、spanNameが空文字にしかなりません。30分ぐらい悩んだところ、ミドルウェアから次のhttp.Hanlderの処理が終わった後にしか[正しい情報が返ってこないというissue](https://github.com/go-chi/chi/issues/270)を発見。gorilla/muxのinstrumentationのミドルウェアの実装は、スパン作成時にattributeを設定していますが、APIを見るとあとからも設定できそうです。

```go
// 本ロジックを処理
tw.handler.ServeHTTP(rrw.writer, r2)
// 終わってからchiのAPIを使っていろいろ情報を収集してspanの名前とか属性を変更
c := chi.RouteContext(r.Context())
spanName := c.RoutePattern()
span.SetName(spanName)
span.SetAttributes(semconv.HTTPServerAttributesFromHTTPRequest(tw.service, spanName, r)...)
```

これでchiでもOpenTelemetryと繋がりました！ gorilla/muxのと同じように、1行``Use``を書くだけで全部のロジックにトレース出力が差し込めます。

```go
// 1行で全エンドポイントにパスをスパン名としたトレースログ出力ができるように
r.Use(otelchi.Middleware("hello-world"))
```

動く実装は次のところに置いておきます。

https://gitlab.com/osaki-lab/otelchi

# まとめ

OpenTelemetryの概要と、個人的に気になっているアップデートの方向性、実際にアプリに組み込む方法、go-chiに繋いでみる方法などを紹介しました。

OpenTelemetryは単に便利なライブラリというだけでなく新しいエコシステムを作る土台となるものです。いろいろ作りたくなりますね。

本記事を書くにあたって[@ymotongpoo氏](https://twitter.com/ymotongpoo)と[@katzchang](https://twitter.com/katzchang)氏にアドバイスをいただきました。ありがとうございました。

# 参考

* [OpenTelemetry公式サイト](https://opentelemetry.io/)
* [OpenTelemetry仕様リポジトリ](https://github.com/open-telemetry/opentelemetry-specification)
* [OpenTelemetryドキュメント日本語化プロジェクト](https://github.com/open-telemetry/docs-ja)

