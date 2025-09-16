---
title: "grpc-gatewayでgRPCとREST両対応のサーバを作る"
date: 2022/06/24 00:00:00
postid: a
tag:
  - gRPC
  - WebAPI
  - IDL
  - ProtocolBuffers
category:
  - Programming
thumbnail: /images/2022/20220624a/thumbnail.png
author:  関靖秀
lede: "TIGの関です。[サービス間通信とIDL（インタフェース記述言語）連載]の3本目です。昨日に続き、gRPCネタです。この記事では次のネタを扱います。- gRPCの概観- gRPCとWebブラウザの関係性"
---
# はじめに

TIGの関です。[サービス間通信とIDL（インタフェース記述言語）連載](/articles/20220622a/)の3本目です。

昨日に続き、gRPCネタです。この記事では次のネタを扱います。

- gRPCの概観
- gRPCとブラウザの関係性
- grpc-gatewayとは何か？
- gRPCとその周辺ツールを使ったサーバ開発の流れ

# gRPC概観

gRPCは、HTTP2をベースにしたRPC（リモートプロシージャコール）フレームワークです。

テキストベースのJSONを用いた一般的なREST APIに対して、gRPCは高効率にデータのやりとりをできたり、双方向の通信ができたり、ストリーミングにも対応していたりといった特長があります。このため、gRPCは現状では主にバックエンドサーバ間の通信に利用されています。

## gRPCとProtocol Buffers

gRPCはProtocol Buffersのツールチェーンを活用すると便利であり、多くの場合下記の流れに沿ってプログラムを作ることになります。

1. Protocol BuffersというIDLを使ってRPCの定義をprotoファイルとして記述する。
1. 前述のprotoファイルをコンパイラ（protoc）+プラグインにかけてライブラリを生成する。
1. 生成されたライブラリに定義されている関数を使って、サーバ、クライアントを実装する。

コンパイラのprotocは、Protocol Buffersを解析して、その結果をコード生成用の別のプログラムに渡す役目をします。コード生成用のプログラムのことを"プラグイン"とよび、プラグインを使い分けることで様々な言語やツールに対応します。プラグインは`protoc-gen-{プラグイン種別}`という名前でPATHに配置しておけば、protocにオプションを渡すだけで利用できます。同じ解析結果を一度に複数のプラグインに渡すこともできます。

protocはC++で実装されていますが、各言語用プラグインは別の言語で実装でき、プラグインを自作することで関連ツールを作ることもできます。

## gRPCとブラウザの関係

ブラウザの持つ制約のため、2022年6月現在、gRPCはブラウザからの直接利用はできません。このため、ブラウザから利用するには何らかのプロトコル変換が必要になります。現状、次の2つの方法があります。

- gRPC Webに対応させる。
- 何らかの手段で、HTTP APIにマッピングする。

### gRPC Web

gRPC Webは大雑把にいうと、一部機能に制約をかけることでgRPCをブラウザからもアクセスできるようにしたプロトコルです。Content-Typeは`application/grpc-web`もしくは`application/grpc-web-text`になっています。実際に流れるデータフォーマットはProtocol BuffersやJSONなど複数のフォーマットに対応しているため、送信側が明示することになっています。

クライアント、つまりブラウザ側から利用するには、上述のprotocとgRPC Web用のプラグインを使って生成したクライアントライブラリを用います。

gRPCサーバ側をgRPC Webに対応させるには、プロトコル変換を行うリバースプロキシを配置するか、同一コードでgRPC Webにも対応するサーバを作成するかのどちらかです。リバースプロキシとしてはenvoyとnginxが候補になりますが、envoyが人気のようです。昨日紹介された[Connect](https://connect.build/docs/introduction/)はプロキシなしでgRPCとgRPC Webに両対応するコードを生成するプラグインになります。

### HTTP APIへのマッピング

HTTP APIにマッピングする方法はさらに2つに分けられ、RPC定義からルールベースで自動マッピングする方法と自力でマッピングする方法とがあります。

昨日紹介されたConnectの独自プロトコルはルールベースのマッピングです。HTTPのPOSTメソッドのみ利用し、Unary RPCであればContent-Typeが`application/json`であるため、気軽に試せます。

一方で、自力でマッピングする方法としては、"grpc-gateway"があります。protoファイルや設定ファイルにどのようにマッピングをするか記述しておき、grpc-gatewayのプラグインを使ってライブラリを生成、それを使ってリバースプロキシとして動作するプログラムを作ります。ルールベースの方法に比べるとPOST以外のメソッドにも対応するなど柔軟にマッピングでき、OpenAPIのv2に対応して仕様書を出力することもできます。このため、既存のOpen API系のツールやノウハウを活用できます。

細かい制御を行わないのであれば、実際にプログラマが書くのは関数呼出程度で、大半の苦労はどのようにマッピングするか設計するところにあります。

この記事ではgrpc-gatewayを取り扱います。

# grpc-gatewayとその使い方

## grpc-gatewayとは？

前述の通り、protoファイルに記述されたgRPCのRPC定義をHTTP APIにマッピングするためのprotocのプラグインです。

次の図のように、protoファイルよりproxy用のコードを生成し、それを利用したリバースプロキシを実装することで、gRPCサーバにREST APIとしてのインタフェースを設けることが可能です。

<img src="/images/2022/20220624a/image.png" alt="image.png" width="1200" height="813" loading="lazy">

※図は [公式リポジトリ](https://github.com/grpc-ecosystem/grpc-gateway) より引用

また、公式に次のような記述があり、安定性を売りにしているようです。
>We use the gRPC-Gateway to serve millions of API requests per day, and have been since 2018 and through all of that, we have never had any issues with it.
>
>- William Mill, Ad Hoc

HTTP APIへのマッピングにはprotoファイルにマッピングのためのオプションを記述していく方法と、protoファイルとは別に追加の設定ファイルを作る方法があります。この記事で取り扱うのは、protoファイルにオプションを記述する方法です。

ちなみにですが、実はルールベースの自動マッピングもできるようです。

## grpc-gatewayの利用時に参考になるサイト

### grpc-gateway公式

以下はgrpc-gatewayの公式サイトです。

- [公式リポジトリ](https://github.com/grpc-ecosystem/grpc-gateway)
- [公式ドキュメント](https://grpc-ecosystem.github.io/grpc-gateway/)

### Google API

grpc-gatewayの利用有無を問わず、gRPCを使ったシステムを作る際に参考にできるものとして、Google APIがあります。

gRPCの設計について述べた書籍や記事はREST APIに比べると少ないですが、設計ガイドも公開されており、参考にできます。また、このガイドに沿って作られた大量のprotoファイルが公開されてます。これは、設計サンプルとして活用できます。grpc-gatewayで利用するマッピングはGoogle APIと同じものを利用するので、マッピングの具体例としても利用できます。

以下はGoogle APIの公式サイトです。

- [Google API公式リポジトリ](https://github.com/googleapis/googleapis)
- [API設計ガイド](https://cloud.google.com/apis/design?hl=ja)

## grpc-gatewayを使った開発の流れ

### リポジトリ

[grpc-gateway-example](https://github.com/sayshu-7s/grpc-gateway-example/tree/v0.0.0)として公開しました。

このリポジトリに含まれるプログラムが大まかにどんな動きをするのか軽く紹介しておきます。
このリポジトリはDockerさえインストールしていれば、gRPCとgrpc-gatewayの動きを体験できます。

protoファイルからserviceの部分を抜き出したのがこれです。
ExampleMessageというシンプルなデータをGet, Create, Delete, BatchGetできます。
BatchGetだけはstreamにしてますが、他は全てUnary RPCです。

```java
// API for grpc-gateway trial.
service ExampleApi {
  // Gets a single message.
  rpc GetMessage(GetMessageRequest) returns (ExampleMessage) {
    option (google.api.http) = {
      get: "/example-messages/{id}"
    };
  }

  // Gets multiple Messages.
  rpc BatchGetMessages(BatchGetMessagesRequest)
      returns (stream BatchGetMessagesResponse) {
    option (google.api.http) = {
      post: "/example-messages:batchGet"
      body: "*"
    };
  }

  // Creates a new message.
  rpc CreateMessage(CreateMessageRequest) returns (ExampleMessage) {
    option (google.api.http) = {
      post: "/example-messages"
      body: "*"
    };
  }

  // Deletes a message.
  rpc DeleteMessage(DeleteMessageRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/example-message/{id}"
    };
  }
}
```

まずは、ビルドと起動を行います。
Makefileにショートカットを記述してあるので、makeが入っているなら使うと楽です。ないならMakefileの中身を見るとコマンドが書いてあります。

```sh
# docker-composeを使ったビルドとコンテナ起動を行う.
make build
make up
```

docker-composeでコンテナを起動すると、次の4つのコンテナが立ち上がります。

- コンパイラやデバッグツールを実行するための開発用コンテナ
- grpcサーバ
- swagger-uiでAPI仕様を閲覧するためのWebサーバ
- grpc-gatewayを使ったリバースプロキシサーバ

gRPCはバイナリプロトコルなので必要なツールが多くなる傾向があります。また、コード生成を行う関係で、バージョン差分などが発生するとコードレビューの際に面倒です。ツール群をインストールした開発用コンテナを作ると便利です。Dockerfileにインストール手順を記載することで、ツールのインストール方法の参考例としても使え、リポ外でいろいろ試したりする際にも重宝します。
このリポジトリの開発用コンテナには、下記のツール群を入れてあります。

- コンパイラ: protoc
- プラグイン類
  - protoc-gen-go
  - protoc-gengo-grpc
  - protoc-gen-grpc-gateway
  - protoc-gen-openapiv2
- お試し用gRPCクライアント: evans

まずは、grpcとして動作することを見るために開発用コンテナに入りevansでgrpcサーバにアクセスしてみましょう。
次のショートカットで開発用コンテナ内で対話的シェルを使えます。

```sh
# docker-compose execでdevコンテナ内で対話的シェルを使う.
make dev
```

次に、evansを使ってサーバとやりとりしてみましょう。evansは対話的なクライアントとして利用でき、それには次のコマンドを使います。

```sh
evans --host grpc-server --port 50051 --path proto,include example/example.proto
```

ホスト名grpc-serverのポート50051で動作するgrpcサーバに接続します。protoファイルを指定することで、それに記述されたRPC定義のクライアントとして動作します。--パスオプションに指定しているのはprotoファイルが含まれるディレクトリです。このリポジトリでは独自定義のものを`proto`ディレクトリに、サードパーティからコピーしてきたものを`include`ディレクトリに配置しています。

コマンドを打つと次のような表示がされます。
<img src="/images/2022/20220624a/image_2.png" alt="Evans more expressive universal gRPC client" width="1200" height="334" loading="lazy">

`call`と打つと補完候補が表示され、タブキーで選択できます。試しにGetしてみましょう。id=1はプログラムにハードコードしているのでCreateしなくても取れます。

<img src="/images/2022/20220624a/image_3.png" alt="call GetMessage" width="1200" height="334" loading="lazy">

リクエストのidフィールドに設定する値をプロンプトで聞かれるので、1を入力しエンターを押下します。

<img src="/images/2022/20220624a/image_4.png" alt="id (TYPE_INT64) => 1 {...}" width="1200" height="334" loading="lazy">

返ってきましたね。ちなみに存在しない値を入力すると次のようなエラーになります。

<img src="/images/2022/20220624a/image_5.png" alt="command call: rpc error: code = NotFound desc = Not Found" width="1200" height="334" loading="lazy">

次にREST APIを見てみましょう。

ブラウザから`http://localhost:8080/docs`にアクセスします。すると次のようにswagger-uiで仕様の確認ができます。上のprotoファイルの記述からコメントを抜き出して反映されているのがわかるでしょう。

<img src="/images/2022/20220624a/image_6.png" alt="Swagger example/example.proto Excample Api" width="1200" height="1033" loading="lazy">

このページはdocker-compose.ymlの中では`docs-server`コンテナがホストしていますが、ブラウザからのリクエストは`gateway-server`コンテナ経由でアクセスしています。このようにしたのは`gateway-server`コンテナをリバースプロキシとして扱うことで、同一オリジンにして、swagger-ui上から試せるようにしたかったからです。

さて、POSTでExampleMessageを作ってみます。swagger-ui上で値を入力できます。

<img src="/images/2022/20220624a/image_7.png" alt="body Edit value" width="1200" height="1033" loading="lazy">

Executeすると、レスポンスが返ってきて、これもui上で確認できます。

<img src="/images/2022/20220624a/image_8.png" alt="Response" width="1200" height="1033" loading="lazy">

Evansから見てみましょう。
<img src="/images/2022/20220624a/image_9.png" alt="call GetMessageによるJSON結果" width="1200" height="334" loading="lazy">

先ほどエラーだった値を入力して返却されており、ちゃんと反映されてますね。REST APIで作成したリソースがgRPCでも取得でき、同一サーバで動いていることがわかります。

### コードの解説

さて、コードとその作成方法の解説に入ります。

### 構成

構成は↓のようになっています。

```txt
.
├── Dockerfile
├── Makefile
├── README.md
├── cmd
│   ├── gateway
│   │   └── main.go
│   └── server
│       └── main.go
├── docker-compose.yml
├── gen
│   ├── go
│   │   └── example
│   │       ├── example.pb.go
│   │       ├── example.pb.gw.go
│   │       └── example_grpc.pb.go
│   └── openapiv2
│       └── apidocs.swagger.json
├── go.mod
├── go.sum
├── include
│   └── google
│       └── api
│           ├── annotations.proto
│           ├── field_behavior.proto
│           ├── http.proto
│           └── http_body.proto
├── proto
│   └── example
│       └── example.proto
├── server
│   └── server.go
└── tools
    └── gen.sh
```

protoディレクトリにはserverがホストするRPCの定義が書かれたprotoファイルが格納されています。このprotoファイルを元にして、protocとそのプラグインでgen配下にコードを生成します。このリポジトリでは、goのファイルとOpenAPI v2のAPI仕様を生成します。
includeディレクトリにもprotoファイルがありますが、これは外部のリポジトリからコピーしてきたものです。ひとまず、grpc-gatewayを使ったmappingに必要なものを導入しています。

genに生成されたライブラリを使って、serverディレクトリに実際の処理を実装するserver本体を実装します。詳しくは後述します。

cmdにあるserver, gatewayはそれぞれgRPCサーバとgatewayのエントリーポイントです。gatewayの実装でやることはあまりないので、main.goに全て書きました。

### 実装の流れ

#### protoファイルの作成

まずは、protoファイルを作ります。このリポジトリでは、protoディレクトリ配下に自信が提供するRPCを定義したprotoファイルを格納しています。先ほど記載したものを再掲です。

Getメソッドを例にして解説します。

```java
// API for grpc-gateway trial.
service ExampleApi {
  // Gets a single message.
  rpc GetMessage(GetMessageRequest) returns (ExampleMessage) {
    option (google.api.http) = {
      get: "/example-messages/{id}"
    };
  }
  // 省略
}
// The request for ExampleApi.GetMessage.
message GetMessageRequest {
  // The id of the message.
  int64 id = 1;
}
// An ExampleMessage for ExampleApi.
message ExampleMessage {
  // The id of the message.
  int64 id = 1;

  // The string type example field of the message.
  string example_field = 2;
}
```

GetMessageメソッドは、GetMessageRequestを受け取り、単一ExampleMessageを返却するRPCです。optionとして書かれているのがHTTPマッピングです。この場合、`/example-messages/{id}`のGETメソッドにマッピングします。パスパラメータの{id}は、GetMessageRequestのidフィールドのことです。例えば、`/example-messages/3`にGETでアクセスすると、idフィールドが3にセットされたGetMessageRequestでRPCをコールしたことになります。レスポンスはExampleMessageをそのままJSON化したものになります。

実はProtocol Buffersは[JSONへのマッピング方法](https://developers.google.com/protocol-buffers/docs/proto3#json)がLanguage Guideに規定されており、JSON化はそれに従って行われます。このため、HTTPマッピングが必要なのは、エンドポイントの設計とリクエストの各フィールドをパスパラメータ、HTTPボディ、クエリパラメータのどこに入れるのかが大半です。

#### コードの生成

さて、protoファイルを作ったら次はprotocとプラグインを使ったコード生成です。tools/gen.shを実行すれば生成できるようにしています。が実コマンドは下記の感じになります。

```sh
  find 'proto' -name '*.proto' -print0 \
    | xargs -0 protoc -I 'proto' -I 'include' \
    --go_out='gen/go' \
    --go_opt=module='github.com/sayshu-7s/grpc-gateway-example/gen/go' \
    --go-grpc_out='gen/go' \
    --go-grpc_opt=module='github.com/sayshu-7s/grpc-gateway-example/gen/go' \
    --grpc-gateway_out='gen/go' \
    --grpc-gateway_opt=module='github.com/sayshu-7s/grpc-gateway-example/gen/go' \
    --openapiv2_out='gen/openapiv2' \
    --openapiv2_opt=allow_merge=true
```

このコマンドでは、protoファイルがprotoディレクトリとincludeディレクトリに入っているものとして、protoディレクトリ配下の拡張子がprotoになっているファイルを対象にprotocを実行します。

このコマンドでは、protocの解析結果を、`protoc-gen-go`, `protoc-gen-go-grpc`, `protoc-gen-grpc-gateway`, `protoc-gen-openapiv2`の4つのプラグインに渡しています。

具体例を用いてオプションの意味を説明します。`protoc-gen-go`使いたい場合、protoc-genを除いたgoのついたオプションをprotocに渡します。`--go_out`が出力先を表し、`--go_opt`がprotoc-gen-goに対するオプションの指定です。同様に、protoc-gen-grpc-gatewayというプラグインを使う場合は、`--grpc-gateway_out`で出力先を指定し、`--grpc-gateway_opt`でオプションを指定します。

プラグインに対して指定できるオプションはプラグインにより異なりますが、各言語用のプラグインはProtocol Buffersの公式リファレンスにあります。Goだと[Go Generated Code](https://developers.google.com/protocol-buffers/docs/reference/go-generated#invocation)にあります。

protocと一緒についてくるプラグイン以外は、必要に応じてインストールが必要です。上記4つとも全てインストールが必要で、その方法はDockerfileに記載されています。

#### サーバの実装

コードを作ったら次はサーバ実装です。基本的な流れは、コード生成先のpackageで、`UnimplementedExampleApi`みたいな構造体があるので、これを埋め込んだ構造体を↓のように作ります。この埋め込みは前方互換性を担保するためにMustで行う必要があります。

```go
type ExampleAPIServer struct {
    nextID int64 // Createメソッドで使うフィールド
	msgs   map[int64]*example.ExampleMessage // インメモリでExampleMessageを保存する先のマップ
	example.UnimplementedExampleApiServer
}
```

また、生成先packageに、`ExampleApiServer`のようなサーバのインタフェースがあるので、これを実装します。
Getメソッドだけ示すと↓のようになります。

```go
func (s ExampleAPIServer) GetMessage(ctx context.Context, r *example.GetMessageRequest) (*example.ExampleMessage, error) {
	msg, ok := s.msgs[r.GetId()]
	if !ok {
		return nil, status.Error(codes.NotFound, codes.NotFound.String())
	}
	return msg, nil
}
```

フィールドにアクセスするときはGetterを使います。こうするとnil関連のpanicが起こらなくなり、直接アクセスするより堅牢なプログラムを作れます。

エラーを返却するときには、`google.golang.org/grpc/status`で定義された`status.Error`系の関数を使います。上記の例だと、NotFoundというHTTPの404相当のコードを返却していることになります。詳しくは、公式の[Error handling](https://www.grpc.io/docs/guides/error/)や[gRPC Errors - A handy guide to gRPC errors.](https://github.com/avinassh/grpc-errors)や[クイックガイド](https://avi.im/grpc-errors/)を参照してください。

最後に、main関数でインスタンス化して起動します。

```go
package main

import (
	"log"
	"net"

	"github.com/sayshu-7s/grpc-gateway-example/gen/go/example"
	"github.com/sayshu-7s/grpc-gateway-example/server"
	"google.golang.org/grpc"
)

func main() {
	// Serveメソッドを持つ構造体. これのServeメソッドを呼ぶとRPCサーバがListenした状態になる.
	srv := grpc.NewServer()
	// ↓が先ほど実装したserver. 担当するリクエストを実際に処理する構造体.
	api, err := server.NewExampleAPIServer()
	if err != nil {
		log.Fatal("failed to new ExampleAPIServer")
	}

	// protoファイルのserviceごとに登録用の関数が生成されているので、これを使って登録する.
	// この実装例ではこれ1つだが, protoファイルに複数serviceを作ったらその分登録する必要がある。
	example.RegisterExampleApiServer(srv, api)

	// 普通のnet.Lisnerを作って
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen(tcp, :50051)")
	}
	// Serveメソッドに渡す.
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("err has occured while serving: %v", err)
	}
}
```

`*grpc.Server`型には、グレースフルシャットダウン用の`GracefulStop`メソッドや強制停止用の`Stop`メソッドもあるので、必要に応じて呼び出しましょう。

さて、ここまでで、gRPCサーバが実装できました。

#### gatewayの実装

次は、gatewayの実装です。こちらは、一度作れば追加作業はあまりないです。

前述のように、gRPCサーバへのリバースプロキシとしても、swagger-uiをホストするコンテナへのリバースプロキシとしても動作するようにしています。マッピング自体は自動生成されたコード内で行われるため、docsの部分を除くと関数呼び出し程度しかやっていません。

```go
package main

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/sayshu-7s/grpc-gateway-example/gen/go/example"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const grpcServerAddress = "grpc-server:50051"
const docsServerAddress = "http://docs-server:8080"

func main() {
	// gateway用のhttp.Handler
	grpcGateway := runtime.NewServeMux()
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}
	// Handlerに, アドレス指定でアップストリームgRPCサーバの場所を教える.
	// このHandlerはリクエストを受け取ったらgRPCのリクエストに詰め替えてサーバとやり取りする.
	if err := example.RegisterExampleApiHandlerFromEndpoint(context.Background(), grpcGateway, grpcServerAddress, opts); err != nil {
		log.Fatal("failed to register grpc-server")
	}

	// ↓はswager-uiをブラウザから使えるようにするためのリバースプロキシ.
	docsURL, err := url.Parse(docsServerAddress)
	if err != nil {
		log.Fatalf("failed to parse docsServerAddress=%v", docsServerAddress)
	}
	docsProxy := httputil.NewSingleHostReverseProxy(docsURL)

	// 両者をマージして共用できるようにする.
	mux := http.NewServeMux()
	mux.Handle("/docs/", docsProxy)
	mux.Handle("/", grpcGateway)

	// HandlerができたのであとはListenするだけ.
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal("err")
	}
}
```

gatewayは基本的にhttpパッケージのHanlderになっているので、このように機能追加なども比較的簡単に行えます。

gRPCサーバもgatewayも、起点となるServerやServMuxを生成し、それらに実際の処理を行う構造体やエンドポイントを"登録"するような流れであることがわかるでしょう。

# 補足: streamはどのような扱いになるのか？

grpcは双方向のストリーム処理をサポートします。grpc-gatewayではサポートされるのでしょうか？ また、されるとしたらどのようにサポートされるのでしょうか？

[公式リポジトリ](https://github.com/grpc-ecosystem/grpc-gateway#features)によれば、双方向通信はサポートせず、streamはnewline-delimited JSON（NDJSON）にマッピングするとあります。

試してみましょう。ExampleApi.BatchGetメソッドがstream APIになっています。サーバからのレスポンスのみストリームになります。

次のリクエストをcurlで叩きます（※swagger-uiでは「JSONをパースできなかった」というエラーが出るのでcurlでやります）。

```sh
curl -v -X POST "http://localhost:8080/example-messages:batchGet" -H "Content-Type: application/json" -d "{ \"ids\": [ \"1\", \"2\", \"3\" ]}"
```

すると次のようなレスポンスが返ってきます。

```sh
< HTTP/1.1 200 OK
< Content-Type: application/json
< Grpc-Metadata-Content-Type: application/grpc
< Date: Thu, 23 Jun 2022 17:39:33 GMT
< Transfer-Encoding: chunked
<
{"result":{"found":{"id":"1","exampleField":"example"}}}
{"result":{"found":{"id":"2","exampleField":"example2"}}}
{"result":{"missing":"3"}}
```

`Transfer-Encoding: chunked`とあるように、レスポンス内容が確定する前からチャンクでデータを流していることがわかります。
少し気になるのは`Content-Type: application/json`となっていることです。NDJSONのMIME Typeは`application/x-ndjson`のはずなので、これは不正な気がします。まだ調べてないですが、なんらか対処が必要かもしれません。

# まとめ

grpcについての概観をみた後、grpc-gatewayを使ってgRPC, REST APIの両方に対応するサーバを実装する流れを説明しました。gRPCに加えてProtocol Buffers関連の知識も必要なので最初は少し大変かもしれませんが、高効率で双方向通信をサポートしていることは魅力的な特長です。REST APIに比べるとやや敷居が高いgRPCですが、大まかな流れはそこまで複雑ではなかったのではないでしょうか。自分も学習しつつ開発を進めているところです。

余談ですが、gRPCは最初のデプロイに苦労する印象があります。ローカルで開発進めて、DBやら別のサービスやらにあれこれ結合してインターセプタやらなんやらを大量に組み込んだ後、ドカンとデプロイしようとすると、何が悪いのかわからないまま疎通すらできずに時間が溶けていきます。機能がほとんどないHello World的状態で早めにデプロイのパイプラインを作り、少しずつ育てていくのがおすすめです。

また、gRPC WebとConnectについてはまだ使ったことがないので、どこかで試してみたいなと思っています。

次は原木さんの[スキーマのバージョン管理](/articles/20220629a/)です。
