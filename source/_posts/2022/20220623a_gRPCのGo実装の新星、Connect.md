---
title: "gRPCのGo実装の新星、Connect"
date: 2022/06/23 00:00:00
postid: a
tag:
  - gRPC
  - IDL
  - Connect
  - Go
category:
  - Programming
thumbnail: /images/20220623a/thumbnail.jpg
author: 澁川喜規
lede: "6/1に公開されたばかりのgRPC関連のライブラリの[Connect]を紹介することにしました。"
---
<img src="/images/20220623a/スクリーンショット_2022-06-22_21.04.jpg" alt="スクリーンショット_2022-06-22_21.04.jpg" width="1200" height="405" loading="lazy">


[サービス間通信とIDL（インタフェース記述言語）連載](/articles/20220622a/)の2日目のエントリーです。

本当はGraphQLネイティブなデータベースの紹介をしようとしたのですが、紹介しようとしていたものがまだベータでクライアントライブラリが公開されていない（空っぽのリポジトリしかない）みたいな感じで試せなかったので、急遽2022/6/1に公開されたばかりのgRPC関連のライブラリの[Connect](https://connect.build/docs/introduction)を紹介することにしました。

Connectの開発元が公開したブログは次のサイトにあります。

* [Buf | Connect: A better gRPC](https://buf.build/blog/connect-a-better-grpc)

公式ドキュメントはこちらです。

* [Introduction | Connect](https://connect.build/docs/introduction)

なお、gRPCについての詳細はこのエントリーでは紹介しません。ちょうど、H.SakiさんがgRPCの詳しい紹介の記事を書いてくれているので、ぜひ、みなさんこちらを参照ください。

* [作ってわかる！ はじめてのgRPC](https://zenn.dev/hsaki/books/golang-grpc-starting)

Connectとは何者かというと、現時点では純正のgRPCのGoコードの別実装ということになります。あえて作ったのは既存の実装にいろいろ不満があるからということです。

* コメントを除いて100以上のパッケージで合計13万行ででかすぎる
* Go標準ではなく独自実装のHTTP/2実装を使っていて、Goの標準的なミドルウェアなどが使えない
* ウェブから使うにはプロキシが必要
* デバッグ大変
* セマンティックバージョニングを使ってない

Connectはこれに対して次のような特徴を備えたGoのgRPCサーバー/クライアントフレームワークとなっています。

* 数千行のコードで、基本的なところは１パッケージにまとまっている。生成されたコードも少ない
* net/httpのサーバー、クライアントともに、``http.Handler``、``http.Client``を利用しているため、サードパーティのライブラリを駆使しやすい
* gRPC、gRPC-Web、およびConnect独自のプロトコルの3つを最初からサポートしたサーバー、クライアントが作れる。プロキシは不要。Connect独自のプロトコルはREST APIになっていてcurlで簡単にテスト可能。もちろんgrpcurlも可能。
* 1.0が出たらセマンティックバージョニングに準拠して後方互換性をきちんと守っていく宣言。

Connectを開発したのは、Protobufからのコード生成やら、linterやら、いろいろやりやすくしてくれるツールである[buf](https://buf.build/)を開発したところです。Protobufを知り尽くしているところが作ったライブラリになります。

現時点では、というのは別の言語実装も行われている途中であるので、将来的にはGo以外の言語でも恩恵に授かれる模様です。

# チュートリアルを試してみた

ここにチュートリアルがあります。翻訳してもいいのですが、まあ簡単な英語だったのでそのままやっちゃいました。みなさんもぜひ。全部は紹介しないので、おっと思ったポイントだけ紹介します。

* [Getting started | Connect](https://connect.build/docs/go/getting-started)

コード生成はbufを使います。bufにconnect-goというプラグインを追加して生成します。

```yaml buf.gen.yaml
version: v1
plugins:
  - name: go
    out: gen
    opt: paths=source_relative
  - name: connect-go
    out: gen
    opt: paths=source_relative
```

生成されるファイルはこんな感じです。少ないですね。``greet.pb.go``は``protoc-gen-go``が生成するファイルで、Protobuf純正です。``greet.connect.go``がConnectのツールが生成するツールです。

```
├── gen
│   └── greet
│       └── v1
│           ├── greet.pb.go
│           └── greetv1connect
│               └── greet.connect.go
```

1つのメソッドを持ったサービスのコードはこのファイルで完結しています。この手のコード生成系のツールは超大量のソースコードを生成することがあって、品質の確認とか、本当にやりきれるの？と思って躊躇してしまうことが多かったのですが、これなら全然読み切れる量ですし、生成されるコードもわかりやすいかと思います。以下はコメントを抜いたコードです。半分はクライアントコードですね。

```go gen/greet/v1/greetv1connect/greet.connect.go
package greetv1connect

import (
	v1 "connecttest/gen/greet/v1"
	context "context"
	errors "errors"
	connect_go "github.com/bufbuild/connect-go"
	http "net/http"
	strings "strings"
)

const _ = connect_go.IsAtLeastVersion0_1_0

const (
	GreetServiceName = "greet.v1.GreetService"
)

type GreetServiceClient interface {
	Greet(context.Context, *connect_go.Request[v1.GreetRequest]) (*connect_go.Response[v1.GreetResponse], error)
}

func NewGreetServiceClient(httpClient connect_go.HTTPClient, baseURL string, opts ...connect_go.ClientOption) GreetServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	return &greetServiceClient{
		greet: connect_go.NewClient[v1.GreetRequest, v1.GreetResponse](
			httpClient,
			baseURL+"/greet.v1.GreetService/Greet",
			opts...,
		),
	}
}

type greetServiceClient struct {
	greet *connect_go.Client[v1.GreetRequest, v1.GreetResponse]
}

func (c *greetServiceClient) Greet(ctx context.Context, req *connect_go.Request[v1.GreetRequest]) (*connect_go.Response[v1.GreetResponse], error) {
	return c.greet.CallUnary(ctx, req)
}

type GreetServiceHandler interface {
	Greet(context.Context, *connect_go.Request[v1.GreetRequest]) (*connect_go.Response[v1.GreetResponse], error)
}

func NewGreetServiceHandler(svc GreetServiceHandler, opts ...connect_go.HandlerOption) (string, http.Handler) {
	mux := http.NewServeMux()
	mux.Handle("/greet.v1.GreetService/Greet", connect_go.NewUnaryHandler(
		"/greet.v1.GreetService/Greet",
		svc.Greet,
		opts...,
	))
	return "/greet.v1.GreetService/", mux
}

type UnimplementedGreetServiceHandler struct{}

func (UnimplementedGreetServiceHandler) Greet(context.Context, *connect_go.Request[v1.GreetRequest]) (*connect_go.Response[v1.GreetResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("greet.v1.GreetService.Greet is not implemented"))
}
```

で、このハンドラの枠組みに魂（実装）を込めて、ついでにサーバーまで起動してしまおうという欲張りなコードが次のコードです。サーバー実装はシンプルだし、``net/http``でHTTPサーバーを実装するのとコードの構造が大きく変わらないところが気に入りました。

```go /cmd/server/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	greetv1 "connecttest/gen/greet/v1"
	"connecttest/gen/greet/v1/greetv1connect"

	"github.com/bufbuild/connect-go"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type GreetServer struct{}

func (s *GreetServer) Greet(
	ctx context.Context,
	req *connect.Request[greetv1.GreetRequest],
) (*connect.Response[greetv1.GreetResponse], error) {
	log.Println("Request headers: ", req.Header())
	res := connect.NewResponse(&greetv1.GreetResponse{
		Greeting: fmt.Sprintf("Hello, %s!", req.Msg.Name),
	})
	res.Header().Set("Greet-Version", "v1")
	return res, nil
}

func main() {
	greeter := &GreetServer{}
	mux := http.NewServeMux()
	path, handler := greetv1connect.NewGreetServiceHandler(greeter)
	mux.Handle(path, handler)
	http.ListenAndServe(
		"localhost:8080",
		h2c.NewHandler(mux, &http2.Server{}),
	)
}
```

なお、このサーバーではh2cを使ってラップしていますが、これはTLSを使わないHTTP/2を実現するために使っているとのことです。それを除くと、ハンドラだけじゃなくてサーバー周辺もnet/httpのお作法に従っていて好感が持てます。

# それ以外の機能

ドキュメントによると、[独自シリアライズとか圧縮機能](https://connect.build/docs/go/serialization-and-compression)であったりとか、gRPCの特徴である[インターセプター](https://connect.build/docs/go/interceptors)とか、[ストリーミング](https://connect.build/docs/go/streaming)とか、いろいろな機能が提供されています。結構作り込んだgRPCのサービスであっても、Connectへの置き換えもいける気がします。

# まとめ

gRPCはずっと使いたいと思ってちょくちょく学んでいたものの、前述のように生成されるコードの量が多くて実践投入はしてきませんでした。ですが、ConnectベースならOpenAPI（結局コードジェネレータをいじり始めたりおおごとになりがち）よりもいいのでは？と思ったり。また、JSONで簡単にアクセスできるなら、フロントは通常のJavaScriptとかでもいいわけですしね。REST APIの開発の裏でConnectを使うのも楽しそうです。

なお、開発中のものとしては、TypeScript向けのコード生成のconnect-webやら、Express、Rails、Django、Laravelとかにも対応予定とのことで、楽しみですね。TypeScript向けが先行とのことです。connect-webでReactやらVueやらSvleteやらsolid.jsやらと一緒に使える日が楽しみですね。業務投入したいです。

ブログによると、今後、Go 1.19がリリースされたあとに、v1.0をリリース予定で、その後は後方互換性を守るぞ、と宣言されています。これはフューチャーとかみたいなITコンサルとかSIerさんにもうれしい宣言じゃないですかね。エンプラでのGo活用とセットで、これからすごく流行りそうな気がしています。

明日は関靖秀さんの[gPRC gateway](/articles/20220624a/)です。

