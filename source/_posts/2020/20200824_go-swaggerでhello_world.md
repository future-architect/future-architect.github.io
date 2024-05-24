---
title: "go-swaggerでhello world"
date: 2020/08/24 00:00:00
postid: ""
tag:
  - Go
  - go-swagger
  - 入門
category:
  - Programming
thumbnail: /images/20200824/thumbnail.png
author: 伊藤真彦
lede: "go-swaggerの具体的な実装方法を紹介します。はじめにgo-swaggerのインストールを行います"
---

<img src="/images/20200824/top.png" class="img-small-size" loading="lazy">

The Gopher character is based on the Go mascot designed by [Renée French](http://reneefrench.blogspot.com/).


TIG DXチームの伊藤真彦です。
今回はgo-swaggerの具体的な実装方法を紹介します。

# 目次

* はじめに
* go-swaggerのインストール
* swagger.yamlを準備する
* ソースコードをビルドする
* 試しにサーバーを立ち上げてみる
* ハンドラを実装する
* ついにhello world完了

# はじめに

最近の私のメイン業務は[go-swagger](https://github.com/go-swagger/go-swagger)を用いたAPI開発です。
go-swaggerはOpenAPI(Swagger) からGoのコードを生成するライブラリです。
フューチャーでは複数案件での採用実績があり、この技術ブログでも[様々な記事](/tags/go-swagger/)が書かれています。

しかし、技術選定としての参考情報やtips集はあるものの、どのように実装していけばAPIが動くのかを理解するドキュメントは少なく、いざ実装となると学習コストがかかってしまいます。
そこで、今回はストーリーベースでの実装手順を説明します。

# go-swaggerのインストール
go-swaggerは開発環境にインストールして使用します。
下記コマンドでインストールできます。

```sh
go get -u github.com/go-swagger/go-swagger/cmd/swagger
```

その他にも様々なインストール方法があります。

* brew、apt、wget等のコマンドを経由してインストール
* ソースコード、バイナリファイルのダウンロード
* go installコマンドを経由したインストール
* dockerコンテナとしての実行

Dockerコンテナ以外は概ね開発環境のOSによる入手経路の違い程度の認識で差し支えないと思います。詳しくは[Installing](https://goswagger.io/install.html)を確認してください。

[リリースページ](https://github.com/go-swagger/go-swagger/releases/tag/v0.25.0)からお使いのOSに応じた実行ファイルをダウンロードしてインストールすることも可能です。

アプリケーションをコンテナイメージの上で実行する場合、公式のコンテナイメージを[マルチステージビルド](https://matsuand.github.io/docs.docker.jp.onthefly/develop/develop-images/multistage-build/)に用いる事も可能ですね、夢が広がります。
方法は様々ですが、インストール後にswaggerコマンドが利用可能になります。(コンテナ形式での導入を除く)

# swagger.yamlを準備する

OpenAPIの仕様に従ってアプリケーションが生成される以上、まずはAPIの仕様を定義するファイルが無いと始まりません。
まずは`swagger.yaml`を作成します。

`swagger.yaml`の書き方は[OpenAPI Specification](https://swagger.io/specification/)などに記載があります。
[スキーマファースト開発のためのOpenAPI（Swagger）設計規約](/articles/20200409/)もあわせてお読みください。
`swagger.yaml`の書き方についての詳細な説明は今回は省略します。

hello worldのためのサンプルとなる`swagger.yaml`はgo-swaggerのリポジトリに用意されています。
[tutorials/custom-server](https://github.com/go-swagger/go-swagger/blob/master/examples/tutorials/custom-server/swagger/swagger.yml)を例に説明します。

```yaml swagger.yaml
---
swagger: '2.0'
info:
  version: 1.0.0
  title: Greeting Server
paths:
  /hello:
    get:
      produces:
        - text/plain
      parameters:
        - name: name
          required: false
          type: string
          in: query
          description: defaults to World if not given
      operationId: getGreeting
      responses:
        200:
          description: returns a greeting
          schema:
              type: string
              description: contains the actual greeting as plain text
```

サンプルの中では特にシンプルな構成です。

```yaml
paths:
  /hello:
    get:
```

上記部分に記載の通り、`{host-name}/hello`にGETでアクセスする場合のリクエストパラメータ、レスポンスが定義されています。
レスポンスのフォーマットは`text/plain`。
URLのクエリパラメータに`name`を持たせることができる。
成功した場合のHTTPレスポンスステータスは`200 OK`。
レスポンスのbodyに単一の文字列が返ってくる。
...という事が`swagger.yaml`の内容から推測できます。

作成したファイルはOpenAPI Previewで確認することが可能です。[Chrome拡張](https://chrome.google.com/webstore/detail/openapi-preview/ijjbiodnicjakhbfkffnlbekpgnmmggo?hl=en-GB)、[vscode向けのプラグイン](https://marketplace.visualstudio.com/items?itemName=zoellner.openapi-preview)などで利用可能です。[editor.swagger.io](https://editor.swagger.io/)のようなウェブサイトとしても公開されています。
[vimプラグイン](https://github.com/xavierchow/vim-swagger-preview)もありますね...素晴らしい。

<img src="/images/20200824/open_api_preview.jpg" loading="lazy">


この`swagger.yaml`を元に実際にソースコードをビルドしてみましょう。

# ソースコードをビルドする

ディレクトリの構成は自由ですが、私のチームでは自動生成されたコードは`server/gen`に配置される構成をとっています。
下記のような構成でserver/genまでディレクトリを作成します。

```sh
.
├──swagger
| └─swagger.yaml
└──server
  └─gen
```

serverディレクトリに移動し、下記コマンドでソースコードをビルドします。

```sh
swagger generate server -a factory -A factory -t gen f ./swagger/swagger.yaml
```

オプションの詳細については[go-swaggerを用いたWebアプリケーション開発Tips19選](/articles/20200630/)のTips2をご覧ください。

今回は`--exclude-main`を使用せずに`main.go`も生成してもらいます。コマンドの実行に成功すると、`server/gen`配下に各種ファイルが生成されます。

# 試しにサーバーを立ち上げてみる

main.goを実行することでサーバーが起動します。

`server`ディレクトリ上で下記コマンドを実行します。

```sh
go run gen/cmd/factory-server/main.go --host 0.0.0.0 --port 3000
```

コマンド実行後にブラウザで`localhost:3000/hello`にアクセスしてみましょう。

<img src="/images/20200824/init.jpg" loading="lazy">

エラーが出ます、hello worldまではあと一歩ですが、まだやることがあります。

# ハンドラを実装する

自動生成したコードだけではAPIサーバは完成しません。

なぜならAPIが表示したいデータをどこから用意し、どのような形式でレスポンスに返すかは`swagger.yaml`への記載だけではカバーしきれないからです。例えばリクエストを元にデータベースから情報を取得、返却するAPIを構築するとします。

データベース層はRDSでしょうか、NoSQLでしょうか、クラウド上のマネージドDBでしょうか、はたまたオンプレミスでしょうか。取りうる可能性は無限大です。そのためデータベースへのアクセスやレスポンスデータの加工は自前で実装する必要があるわけですね。

今回は下記のようなファイルを用意します。

```go server/get_greeting_handler.go
package server

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/example-xxxxx/myapp-name/server/gen/restapi/factory"
)

func GetGreeting(p factory.GetGreetingParams) middleware.Responder {
	payload := *p.Name
	return factory.NewGetGreetingOK().WithPayload(payload)
}
```

※importするパスはご自身のgithubリポジトリになります。

```sh
.
├──swagger
| └─swagger.yaml
└──server
  ├─gen
  └─get_greeting_handler.go
```
今回は上記のようなディレクトリ構成で配置しました。

`GetGreetingParams`、`NewGetGreetingOK()`などが自動生成された関数、及び構造体です。`GetGreetingParams`はリクエストパラメータであり、`p.Name`でクエリパラメータの内容が取得できます。生成されたコードのお作法に則りハンドラを実装します。今回は受け取ったクエリパラメータをそのままレスポンスとして返してみます。このファイルの変数`payload`を任意の文字列にすると実際にレスポンスが変化します。

ファイルの用意ができたら実装したハンドラ関数をアプリケーションが実行するように設定します。実は自動生成したファイルの中には、手動での変更を認めないものと、認めるものが存在します。`server\gen\restapi\configure_factory.go`が手動での変更を許可するファイルです。書き換えても良いファイルは先頭行に`// This file is safe to edit. Once it exists it will not be overwritten`とコメントされています。

さてこのファイルの下記の部分を見てみましょう。

```go
if api.GetGreetingHandler == nil {
        api.GetGreetingHandler = factory.GetGreetingHandlerFunc(func(params factory.GetGreetingParams) middleware.Responder {
            return middleware.NotImplemented("operation factory.GetGreeting has not yet been implemented")
        })
}
```
api.GetGreetingHandlerがnilのままでは`not yet been implemented`と出力する設定になっています。
改めて先ほどのエラーを見てみましょう、細かい表示はともかく同じような内容のメッセージが出力されています。
<img src="/images/20200824/init_2.jpg" loading="lazy">


この部分を書き換えるか、ここより先に評価される行で下記のようにapi.GetGreetingHandlerを定義しましょう。

```go
api.GetGreetingHandler = factory.GetGreetingHandlerFunc(server.GetGreeting)
```

`configure_factory.go`のimport文の更新も必要です。

```go
import (
	"crypto/tls"
	"net/http"

	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime"

	+ "github.com/example-xxxxx/myapp-name/server"
	"github.com/example-xxxxx/myapp-name/server/gen/restapi/factory"
)
```

ここまで書けたら今度こそサーバーを起動して動かしてみましょう。

# ついにhello world完了

先ほど書いた内容と同じ手順でサーバーを立ち上げます。

```
go run gen/cmd/factory-server/main.go --host 0.0.0.0 --port 3000
```

ブラウザで`localhost:3000/hello?name=hello-go-swagger`にアクセスします。
<img src="/images/20200824/hello_go_swagger.jpg" loading="lazy">

期待したレスポンスが返ってきました。ちなみに記事の通りの`get_greeting_handler.go`では、nameが与えられていない場合のエラーハンドリングが実装されていないため、`?name=hello-go-swagger`をURLに含めないと500番台のエラーすら返せずに処理に失敗してしまいます。

実際には400番、500番のエラーも`swagger.yaml`に定義し、どのような場合にどのエラーを返すかをハンドラに実装していく必要があります。(どの程度不正なリクエストを許容するのかといった柔軟性も、ハンドラで要件に合わせ実装していく形になります。)

今回はhello world編ということでここまでになります、是非皆さんも実際に試してみてください。


# go-swaggerの関してはこちらの記事もおすすめです

* [LambdaとGoを使ったサーバーレスWebAPI開発実践入門](/articles/20200927/)
* [go-swaggerを用いたWebアプリケーション開発Tips19選](/articles/20200630/)
* [スキーマファースト開発のためのOpenAPI（Swagger）設計規約](/articles/20200409/)
* [WAFとして go-swagger を選択してみた](/articles/20190814/)
