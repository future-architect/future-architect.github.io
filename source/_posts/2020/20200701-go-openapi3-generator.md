---
title: "Go の Open API 3.0 のジェネレータ oapi-codegen を試してみた"
date: 2020/07/01 09:40:40
postid: ""
tag:
  - Go
  - OpenAPI
  - Swagger
  - go-swagger
category:
  - Programming
thumbnail: /images/20200701/thumbnail.png
author: 多賀聡一朗
lede: "go-swagger は Swagger 2.0 にのみ対応しており、OpenAPI 3.0 系が使えない問題がありました。最新に追従していく上でも Open API 3.0 系に寄せていきたいと考えていたので、なにか使えるツールはないか探したところ、以下を見つけました。 https://github.com/deepmap/oapi-codegen 使えるかどうか実際に動かして試してみます。"
---

<img src="/images/20200701/top.png" class="img-middle-size" loading="lazy">

The Gopher character is based on the Go mascot designed by [Renée French](http://reneefrench.blogspot.com/).


## 概要

TIG DXチーム所属の多賀です。最近はフロントのコードを書いたりすることも増えましたが、引き続き Go も触っています。
Go で OpenAPI(Swagger) からコード生成する際には、 go-swagger をよく利用しています。
go-swagger については他記事でもまとめられています。

- [go-swaggerを用いたWebアプリケーション開発Tips19選](/articles/20200630/)
- [WAFとして go-swagger を選択してみた](/articles/20190814/)

ただ、 go-swagger は Swagger 2.0 にのみ対応しており、OpenAPI 3.0 系が使えない問題がありました。最新に追従していく上でも Open API 3.0 系に寄せていきたいと考えていたので、なにか使えるツールはないか探したところ、以下を見つけました。

https://github.com/deepmap/oapi-codegen

使えるかどうか実際に動かして試してみます。

ざっと見た感じは、以下の模様です。

- Open API 3.0 の定義から Go のソースコードを生成できる
- echo, chi の形式でServerソースが出力できる
- Go の interface で Open API の仕様が定義され interfaceを満たすように実装していく


## 調査

実際に OpenAPI 定義からコードを出力してみます。

ライブラリ側で OpenAPI定義のサンプルが用意されていたためそのまま利用してみます。
https://github.com/deepmap/oapi-codegen/blob/master/examples/petstore-expanded/petstore-expanded.yaml

ざっくり以下のAPI が定義されています。

```
GET /pets
POST /pets
GET /pets/{id}
DELETE /pets/{id}
```

上記を `openapi.yml` としてダウンロードしました。


とりあえず、コード生成を実行してみます。


```sh
# コマンドインストール
go get github.com/deepmap/oapi-codegen/cmd/oapi-codegen@v1.3.8

# Go コード生成
oapi-codegen openapi.yml > openapi.gen.go
```

こちらで Goのコードが1ファイルに生成されました。
生成項目としては以下4点です。

- 型定義
- http client
- http server
- OpenAPI spec

実際に利用する際は、必要な分だけ生成・管理したいかなと思います。
生成コードとはいえ、1ファイルにまとまっていると少々読みづらかったりもします。
コマンドのパラメータで制御できるようでしたので、それぞれ別にコード生成し中身を確認していきます。
(生成コードは長くなるため一部抜粋しています。)

#### 型定義

- OpenAPI の `components` から struct を生成
- リクエスト Bodyの定義も同様に生成

`コマンド`

```sh
oapi-codegen -generate "types" -package openapi openapi.yml > ./openapi/types.gen.go
```

`生成コード`

```go
// NewPet defines model for NewPet.
type NewPet struct {
	Age  *int    `json:"age,omitempty"`
	Kind *string `json:"kind,omitempty"`

	// Name of the pet
	Name string `json:"name"`

	// Type of the pet
	Tag *string `json:"tag,omitempty"`
}

```

#### http client

- API仕様が interface として出力
- 2種類の interface が定義
    - ClientInterface
        - API実行の結果 http.Response が返却される
    - ClientWithResponsesInterface
        - API実行の結果の Response Body を parse して struct へ詰めてくれる
            - Body を []byte 形式で保持するためメモリ効率はいまいち
- 上記 interface を実装した struct も合わせて生成済
    - 生成された Client を利用するだけで良い


`コマンド`

```sh
oapi-codegen -generate "client" -package openapi openapi.yml > ./openapi/client.gen.go
```

`生成コード`

```go
// The interface specification for the client above.
type ClientInterface interface {
	// FindPets request
	FindPets(ctx context.Context, params *FindPetsParams) (*http.Response, error)

	// AddPet request  with any body
	AddPetWithBody(ctx context.Context, contentType string, body io.Reader) (*http.Response, error)

	AddPet(ctx context.Context, body AddPetJSONRequestBody) (*http.Response, error)

	// DeletePet request
	DeletePet(ctx context.Context, id int64) (*http.Response, error)

	// FindPetById request
	FindPetById(ctx context.Context, id int64) (*http.Response, error)
}

// Client which conforms to the OpenAPI3 specification for this service.
type Client struct {
	// The endpoint of the server conforming to this interface, with scheme,
	// https://api.deepmap.com for example.
	Server string

	// Doer for performing requests, typically a *http.Client with any
	// customized settings, such as certificate chains.
	Client HttpRequestDoer

	// A callback for modifying requests which are generated before sending over
	// the network.
	RequestEditor RequestEditorFn
}

func (c *Client) FindPets(ctx context.Context, params *FindPetsParams) (*http.Response, error) {
	req, err := NewFindPetsRequest(c.Server, params)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(ctx)
	if c.RequestEditor != nil {
		err = c.RequestEditor(ctx, req)
		if err != nil {
			return nil, err
		}
	}
	return c.Client.Do(req)
}
```

利用コード

```go
c := openapi.NewClient("http://localhost:8888")
params := openapi.FindPetsParams{Tags: []string{"dog"}}
// http.Response として返却
res, err := c.FindPets(context.Background(),  params)
```

#### http server

- API仕様が interface として定義
- interface を実装する形で Server側のコードを実装していく

`コマンド`

```sh
oapi-codegen -generate "server" -package openapi openapi.yml > ./openapi/server.gen.go
```

`生成コード`

```go
// ServerInterface represents all server handlers.
type ServerInterface interface {
	// Returns all pets
	// (GET /pets)
	FindPets(ctx echo.Context, params FindPetsParams) error
	// Creates a new pet
	// (POST /pets)
	AddPet(ctx echo.Context) error
	// Deletes a pet by ID
	// (DELETE /pets/{id})
	DeletePet(ctx echo.Context, id int64) error
	// Returns a pet by ID
	// (GET /pets/{id})
	FindPetById(ctx echo.Context, id int64) error
}

// ServerInterfaceWrapper converts echo contexts to parameters.
type ServerInterfaceWrapper struct {
	Handler ServerInterface
}

// FindPets converts echo context to params.
func (w *ServerInterfaceWrapper) FindPets(ctx echo.Context) error {
	var err error

	// Parameter object where we will unmarshal all parameters from the context
	var params FindPetsParams
	// ------------- Required query parameter "tags" -------------

	err = runtime.BindQueryParameter("form", true, true, "tags", ctx.QueryParams(), &params.Tags)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Invalid format for parameter tags: %s", err))
	}

	// ------------- Optional query parameter "limit" -------------

	err = runtime.BindQueryParameter("form", true, false, "limit", ctx.QueryParams(), &params.Limit)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Invalid format for parameter limit: %s", err))
	}

	// Invoke the callback with all the unmarshalled arguments
	err = w.Handler.FindPets(ctx, params)
	return err
}
```

`利用コード`

```go
// ServerInterface を実装するような struct を定義

type petHandler struct {
}

func (si petHandler) FindPets(ctx echo.Context, params FindPetsParams) error {
	// GET /pets の処理記載
}

func (si petHandler) AddPet(ctx echo.Context) error {
	b := NewPet{}
	// リクエスト Body は echo の APIを利用
	ctx.Bind(&b)

	// POST /pets の処理記載
}

func (si petHandler) DeletePet(ctx echo.Context, id int64) error {
	// DELETE /pets/{id} の処理記載
}

func (si petHandler) FindPetById(ctx echo.Context, id int64) error {
	// GET /pets/{id} の処理記載
}

func main() {
	e := echo.New()
	handler := petHandler{}
	// 定義した struct を登録
	openapi.RegisterHandlers(e, handler)
	e.Logger.Fatal(e.Start(fmt.Sprintf("0.0.0.0:%d", *port)))
}
```

[chi](https://github.com/go-chi/chi) 形式でも出力できます。

```sh

# server (chi)
oapi-codegen -generate "chi-server" openapi.yml > openapi_chi_server.gen.go
```


#### OpenAPI spec

- base64形式で `openapi.yaml` を保持

`コマンド`

```sh
oapi-codegen -generate "spec" -package openapi openapi.yml > ./openapi/spec.gen.go
```

`生成コード`

```go

// Base64 encoded, gzipped, json marshaled Swagger object
var swaggerSpec = []string{

	"H4sIAAAAAAAC/+RWTW/jNhD9K8S0R1XSJosedGp2nQIGiiRotqfAB0YcyWzFj5CjOEKg/16QlJ3Y0iZY",
	"tCha9GST4pBv3nsz5DPURlmjUZOH6hl8vUXF499L54wLf6wzFh1JjNO1ERh+BfraSUvSaKjSYha/ZdAY",
	...
	}
```


## レビュー

良さそうな点と気になる点をまとめました。

### 良さそうなところ

- 生成コードが薄めで良い
    - go-swagger は生成コードが重厚かつintefaceで分離されて実装が追いづらい点が気になっていた
    - echo/chi の APIが直接触れる
- echoやchi などの選択も結構好み
- tag指定して出力すると依存のある定義のみが出力される
    - `oapi-codegen -include-tags pet -generate "server" openapi.yml`
- クエリパラメータが struct へ Bindされる
- パラメータのバリデーションに対応
    - デフォルトだとリクエストボディはバリデーションされない (読まれないため)
    - Echo だと middleware をいれれば Body のバリデーションエラーも見れる
        - `middleware.OapiRequestValidator(swagger)`
        - OpenAPI の spec が必要


### 気になるところ

- 拡張タグは動かなそう
    - `x-XXX` 系は動作しない
- 生成 struct の型定義に違和感
    - required が 基本型 で optional が pointer 型
    - Go のコードでよく見る定義と逆なので注意が必要
- **レスポンス定義は Bind されない**
    - 実装者がレスポンスの struct を間違えないようにする必要がある
    - (個人的には一番いまいちかなと感じた点です。生成コード上仕方なさそうでしたが..)
- 1 interface で Open API の定義が出力される
    - include-tags を利用してタグ別に出力はうまく動作しない
        - Server interface の実装が1つでないといけないため (echo/chiに登録できない)
    - 特定の tag のみ実装するケースでの利用可能
- 同一 package に押し込める必要あり
    - server, client コードは types に依存している
- echo と chi だと若干 echo 側のほうがリクエストの Bind が良い
    - echo だと生成 Handler の引数にリクエストパラメータの struct が定義される
    - chi だと context から取得する必要あり
        - 生成コードで ctx から取り出すヘルパー関数あり

### 利用するとしたら..?

- echoでの出力を選択
    - リクエストパラメータのバインドがしっかりされるため
    - middleware 利用だがリクエストボディのバリデーションチェックもできて良い
- 出力は同一パッケージでファイルを分けて管理
    - サーバー
        - server, types, spec
    - クライアント
        - client, types
- 生成コード用の パッケージ (ディレクトリ) を切る
    - 各生成コードに依存があるため
- 各API のレスポンス定義の命名を統一する
    - レスポンス Body の Bindがされないため
    - `${operationId}Res` or `${operationId}Response`

## 所感

ざっとコード生成を試して、コード側の確認をしてみました。
結構利用できそうだなというのが全体的な感想で、OpenAPI3.0系の制約がある場合は、oapi-codegen を実際に利用してみたいです。
