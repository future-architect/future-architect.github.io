---
title: "WAFとして go-swagger を選択してみた"
date: 2019/08/14 10:30:07
postid: ""
tag:
  - Go
  - Swagger
  - OpenAPI
  - go-swagger
  - 技術選定
category:
  - Programming
author: 多賀聡一朗
lede: "Go のWebアプリケーションフレームワークを検討した際に、 `go-swagger` が良いのではと思い、比較調査してみました。
結果、実際に選択し導入しています。"
---

こんにちは、TIG DXチーム [^1]の多賀です。
2019年7月にキャリア入社しました。

[^1]: Technology Innovation Groupの略で、フューチャーの中でも特にIT技術に特化した部隊です。その中でもDXチームは特にデジタルトランスフォーメーションに関わる仕事を推進していくチームです。

## 概要

Go のWebアプリケーションフレームワークを検討した際に、 `go-swagger` が良いのではと思い、比較調査してみました。

その結果、実際にPJへ導入しています。

## バージョン

| 名称 | バージョン |
| :-- | :-- |
| Go | 1.12.7 |
| [go-swagger](https://github.com/go-swagger/go-swagger) | v0.19.0 |
| [swaggo/swag](https://github.com/swaggo/swag) | v1.6.2 |
| [openapi-generator](https://github.com/OpenAPITools/openapi-generator) | 4.0.3 |
| [gin](https://github.com/gin-gonic/gin) | v1.4.0 |

## 開発物

以下の実装を行うとします。
Web API を作成して、Swagger でドキュメントを管理しましょうというよくある構成かと思います。

| 項目     | 内容    |
| -------- | ------- |
| 作成物   | Web API |
| 仕様定義 | Swagger |
| 言語     | Go      |
| 仕様変更 | 高頻度 |

## Go のフレームワークに求めるもの

この場合、フレームワークに対して何を求めるでしょうか。
私は以下を重要視していました。

### 重要視したこと

ドキュメントと実装の乖離をなくすことで、認識齟齬なく開発を行うこと

#### なぜ？

1. ドキュメントと実装のズレを解消するコストが高いため
  * Web API 開発をする中で最も困ることは **ドキュメントと実装がかけ離れること** です。ドキュメントととのずれによる、コミュニケーションを極力減らしたいと考えました
2. インターフェイスが頻繁に変わることが想定されたため
  * データ定義の部分が固く決まっていなかったため、データに引きずられて API 仕様の変更も頻繁に起きるだろうと思いました
3. インターフェイスのやり取りの物理的な距離が遠いため
  * 同一の会社内だけでなく会社間をまたいだ開発も想定されたため、コミュニケーションコストがより高くなると想定しました

## フレームワーク比較

ドキュメントと実装の整合性を重要視する考えのもと、下記 2 パターンの方式を検討しました。

1. ドキュメントからコードを生成
2. コードからドキュメントを生成

それぞれの方式についてサンプルを作りながら検討しました。
結果としては、**1 のパターンのほうが重要視した要件を満たす** と考えました。

### 1. ドキュメントからコードを生成

Swagger ファイルから Go のソースコードが生成できないかを考えました。
ライブラリとして、 [go-swagger](https://github.com/go-swagger/go-swagger) をあげています。

#### [go-swagger](https://github.com/go-swagger/go-swagger)

Swaggerファイルを入力にGoのコードを生成することができるツールです。
生成されるコードは、[go-openapi](https://github.com/go-openapi) で管理されているモジュールが利用されています。

#### サンプル

swagger.yml (一部抜粋)

```yml
paths:
  /data/{name}:
    post:
      operationId: dataId
      consumes:
        - application/json
      produces:
        - application/json
      parameters:
        - name: name
          in: path
          required: true
          description: データ名
          type: string
        - name: body
          in: body
          schema:
            $ref: "#/definitions/Sample"
      responses:
        "200":
          description: OK
          schema:
            $ref: "#/definitions/ApiResponse"
        "404":
          description: Data Not Found
        "500":
          description: Internal Server Error
```

生成コードを利用した handler

```go
func dataHandler(params operations.DataIDParams) middleware.Responder {
	// リクエスト
	// params にすべての情報が含まれている
	log.Println(params)
	log.Println(*params.Body)

	// ビジネスロジック層にリクエスト情報を渡す
	service := service.New()
	if err := service.Save(params.Body); err != nil {
		// エラーの場合
		// 500エラー返せる
		return operations.NewDataIDInternalServerError()
	}

	// レスポンス
	dummyResponse := &models.APIResponse{
		Message: "OK",
	}
	// 200 レスポンス
	return operations.NewDataIDOK().WithPayload(dummyResponse)
}
```

#### メリット

1. Swagger と実装が乖離することはない
  * Swagger から自動生成でリクエスト/レスポンスの struct を吐き出します。自動生成部分も CI で必ず生成して build するようにすれば、漏れることはないです。
2. go-swagger でリクエスト/レスポンスのオブジェクト型を 生成してくれるためロジックに集中できる
  *  リクエスト/レスポンスの型だけでなく、リクエストを受ける/レスポンスを返す実装も合わせて生成されます。そのため、実装者は生成されたコードから リクエストパラメータ struct を受け取る → レスポンス struct を生成 までを実装すればよいです

#### デメリット

1. Swagger の定義を手で書く必要がある
  * Swagger の yml 定義を手でメンテする必要がある点は、デメリットになるかと思います。

### 2. コードからドキュメントを生成

実装コードを正として、ドキュメント(Swagger ファイル)を出せないかを考えました。
現状対応しているライブラリとしては、[swaggo/swag](https://github.com/swaggo/swag) があげられました。

#### [swaggo/swag](https://github.com/swaggo/swag)

Go のソースコードを静的解析して、Swagger ドキュメントを生成してくれるツールです。
以下のフレームワークとの連携をサポートしています。

- [gin](https://github.com/gin-gonic/gin)
- [echo](https://github.com/labstack/echo)
- [buffalo](https://github.com/gobuffalo/buffalo)
- [net/http](https://golang.org/pkg/net/http/)

#### サンプル

gin を利用したパターンの handler サンプルコードです。
Swagger ファイルは自動生成されるため割愛します。

```go
// DataHandler godoc
// @Summary Show a account
// @Description get string by ID
// @ID dataId
// @Accept  json
// @Produce  json
// @Param name path string true "data name"
// @Param id body int true "id"
// @Param info body string false "info"
// @Success 200 {object} APIResponse
// @Failure 400 {object} APIResponse
// @Failure 500 {object} APIResponse
// @Router /data/{name} [post]
func DataHandler(c *gin.Context) {
	var params DataRequestParams
	if err := c.ShouldBindJSON(&params); err != nil {
    c.JSON(http.StatusBadRequest, &APIResponse{Message: "Error"})
		return
  }

	service := service.New()
	if err := service.Save(params.Body); err != nil {
    c.JSON(http.StatusInternalServerError, &APIResponse{Message: "Error"})
    return
  }

	res := APIResponse{Message: "OK"}
	c.JSON(http.StatusOK, &res)
}
```

#### メリット

1. コードが正になり、コードの修正がドキュメントに反映される
2. コードのコメントで Swagger の仕様定義を実施できる
3. Swagger ファイル生成時に、コードのコメントのバリデーションを一部実行してくれる
4. 有力フレームワークの機能をそのまま活用できる

#### デメリット

1. 仕様定義漏れを目見でチェックする必要がある
  * コメントの解析をベースに、Swagger 生成をしていますが、定義が漏れている場合にエラーになりませんでした。(パラメータの記載漏れ、レスポンスのステータスコード漏れ 等確認しました。) そのため、実装とコメントが乖離していないかは目見で確認しないといけませんでした。コメントの量も多く、目見での確認には漏れが出ることが想像されました。
2. コメント+実装ベースのため Swagger との連携度が低い


### 補足: コード生成系フレームワーク比較

実際、go-swagger 以外にも Swagger -> コード生成ツールは存在します。
ですが、[openapi-generator](https://github.com/OpenAPITools/openapi-generator) での生成コードは現状はまだ、運用に耐えるレベルではない考えます。

特に、Handlerとリクエスト/レスポンスの型定義がマッチされたコードが生成されない点が辛いです。
せっかくコード生成したのに、各 API ごとにドキュメントと見比べながらモデルを紐付けるのはいまいちだと思いました。
(生成コードが薄いことは良かったですが、紐付けを固くする選択をしました。)

比較表

| 対象 | 評価 | メリット | デメリット |
| :---------------------------- | :---- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| go-swagger | o | - リクエスト/レスポンスの型が定まる <br><br>- リクエストを受け取る/レスポンスを返す 部分を意識しなくて良い <br><br> - リクエストパラメータのバリデーションを自動で実行 <br><br>- 編集不要ファイルは DO NOT EDIT コメントがついている<br><br> - デフォルトで未実装エラーが出る Handler が登録される | - 自動生成だけでは API 受け付けられない (configure_xxx.go 内の修正が必須) <br><br>- Router 周りのコードが長い |
| openapi generator (net/http) | x |  - 生成コード量が少なく明瞭 | - 非編集ファイルが明確にされていない <br><br>- リクエスト/レスポンスの型定義が Handler に紐付いていない |
| openapi generator (gin) | x |  - 生成コード量が少なく明瞭 | - 非編集ファイルが明確にされていない <br><br>- リクエスト/レスポンスの型定義が Handler に紐付いていない |

#### openapi-generator サンプル (gin version)

<details><summary>サンプルコード</summary><div>
swagger.yml (一部抜粋)

```yml
paths:
  "/data/{name}":
    post:
      operationId: dataId
      parameters:
        - name: name
          in: path
          required: true
          description: データ名
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Sample"
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiResponse"
        "404":
          description: Data Not Found
        "500":
          description: Internal Server Error
```

handler

```go
// DataId -
func DataId(c *gin.Context) {
  c.JSON(http.StatusOK, gin.H{})
}
```

model

```go
type ApiResponse struct {
  Message string `json:"message,omitempty"`
}
```

(handler に model が紐付いていないことが伝わればよいかと思います)

</div></details>

## 所感

複数のフレームワークを比較検討してみました。

ドキュメントベースで開発して、コミュニケーションコストを下げたい目的があれば、`go-swagger` の利用はおすすめできると思います。
開発進めてみて知見が溜まってきたら、また公開していきます。
