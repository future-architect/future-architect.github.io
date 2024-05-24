---
title: "スキーマファースト開発のためのOpenAPI（Swagger）設計規約"
date: 2020/04/09 10:38:04
postid: ""
tag:
  - OpenAPI
  - Swagger
  - Go
  - TypeScript
  - 設計
  - チーム開発
category:
  - Programming
thumbnail: /images/20200409/thumbnail.png
author: 亀井隆徳
lede: "みなさん、Swagger使ってますか？本記事では実際にSwaggerのスキーマ定義を設計していく上で取り決めた規約について書いてみたいと思います。"

---
はじめまして。TIG DXユニット [^1]の亀井です。

 [^1]: Technology Innovation Groupの略で、フューチャーの中でも特にIT技術に特化した部隊です。その中でもDXチームは特にデジタルトランスフォーメーションに関わる仕事を推進していくチームです。

# はじめに

<img src="/images/20200409/1.png" style="border:solid 1px #000000" loading="lazy">

みなさん、Swagger使ってますか？
Swaggerや周辺ツールについては [某先輩の記事](/articles/20191008/) にて丁寧に解説されていますので、
本記事では実際にSwaggerのスキーマ定義を設計していく上で取り決めた規約について書いてみたいと思います。

# 前提

私が在籍しているプロジェクトでは、REST APIは golang でフロントエンドを Vue.js + TypeScript で構築しています。
短期間・高品質での構築を実現するためにSwaggerを設計ドキュメントとしてだけではなく、コード自動生成やモックサーバーに活用させることで徹底したスキーマファーストな開発を行ってきました。

というわけで、今回は下記のツールを利用することを前提として規約を作成しています。

* [go-swagger](https://github.com/go-swagger/go-swagger): Goアプリケーションのハンドラ、リクエスト/レスポンスのドメインモデル、バリデーションフレームワーク [^2]
* [openapi-generator/typescript-axios](https://github.com/OpenAPITools/openapi-generator): フロントエンドのHTTPクライアント、リクエスト/レスポンスのインターフェイス
* [Prism](https://stoplight.io/open-source/prism): フロントエンド開発時に利用するモックサーバー

 [^2]: go-swaggerについては [WAFとして go-swagger を選択してみた](/articles/20190814/) で詳しく紹介されています。

# 設計規約


## バージョン

* [OpenAPI v2](https://swagger.io/docs/specification/2-0/basic-structure/)
    * 前述の`go-swagger`が3系に対応されていないため2系を利用

## paths

### tags

* 必須
* 1URIで１つのタグのみ定義する
* リソース名を単数形で記載する
* キャメルケース

```yaml
# good
postid: ""
tag:
  - product # GoアプリケーションのhandlerやTypeScriptのclassの単位となる

# bad
postid: ""
tag:
  - products

# bad
postid: ""
tag:
  - user
  - product
```

### operationId

* 必須
* `${HTTPメソッド}${機能物理名}`を記載する
* キャメルケース

```yaml

# GET /products
operationId: getProducts
# GET /products/:product_id
operationId: getProductByProductId
# POST /products
operationId: postProducts
# PUT /products/:product_id
operationId: putProduct
# DELETE /product/:product_id
operationId: deleteProduct
```

### summary

* 必須
* `${機能ID} ${機能論理名}`で定義する

```yaml
summary: XXX-0001 商品参照
```

### security

* 必須
* 認証の要否で以下のように定義する

```yaml
# 認証なし
security: []

# 認証あり
security:
  - isAuthorized: []
```

* 参考: securityDefinitions

```yaml
# OAuth認証
securityDefinitions:
  isAuthorized:
    type: oauth2
    flow: accessCode
    authorizationUrl: 'https://example.com/authorize'
    tokenUrl: 'https://example.com/.well-known/jwks.json'
```

### description

* 必須
* APIの機能概要を記載する。

```yaml
description: IDを指定して商品情報を取得する。
```

### parameters

#### GET/DELETE API の場合

* in:          PATHパラメータ`in: path`またはクエリパラメータ`in: query`のみ利用可能
* description: 必須
* name:        物理名を定義する
    * 命名規約
        * スネークケース
        * 原則略語は禁止
        * `type: array`の場合、`xxx_list`や`xxx_array`はNGとする
        * `type: boolean`の場合、`is_xxx`や`has_xxx`で定義し`xxx_flag`は非推奨とする
```yaml
# good
- in: path
  name: product_id
  type: string
  description: プロダクトID
  required: true
- in: query
  name: product_types
  type: array
  description: プロダクト種別
- in: query
  name: is_defective
  type: boolean
  description: 不良品フラグ

# bad
- in: path
  name: productId # キャメルケースはNG
  type: string
  description: プロダクトID
  required: false # 不要
- in: query
  name: product_type_list # xxx_listはNG
  type: array
  description: プロダクト種別
- in: query
  name: defective_flag # trueとfalseがどちらの状態を示すのか不明瞭であるため非推奨
  type: boolean
  description: 不良品フラグ
```

#### POST/PUT API の場合

* in:       リクエストボディ`in: body`のみ利用可能
* name:     全て`name: body`とする
* required: リクエストボディが必須でない場合を除いて`required: true`を定義する
* schema:   リクエストモデルを`type: object`で定義する
```yaml
# good
parameters:
  - in: body
    name: body
    required: true
    schema:
      $ref: '#/definitions/postProductsRequest'

# bad
parameters:
  - in: body
    name: postProductsBody
    required: false # 不要
    schema:
      type: object # TypeScriptのInterfaceの自動生成時に型が適切に定義されない
      properties:
        product_name:
          type: string
```

#### バリデーション

* 必須
    * required: 必須パラメータのみ`required: true`を定義する
    * default: 必須でないパラメータでもデフォルト値がある場合は定義する
* 型
    * type: 必須
        * 文字列：string
        * 数値：number
        * 整数値：integer
        * ブール値：boolean
        * 配列：array
        * オブジェクト：object
    * `type: array`の場合、配列要素`items`のtypeも必須
    * `type: null`は原則として利用しない
    * 複数のタイプを定義しない
* 桁
    * 文字列
        * 最大桁数：`maxLength`
        * 最小桁数：`minLength`
    * 数値または整数値
        * 最大値（境界値を含む）：`maximum`
        * 最小値（境界値を含む）：`maximum`
        * 境界値を含まない場合のみ`exclusiveMinimum: true`または`exclusiveMaximum: true`を定義
    * 配列:
        * 最大要素数：`maxItems`
        * 最小要素数：`minItems`
        * `required: true`の場合は原則として`minItems: 1`を定義する
* 区分値
    * `enum`必須
    * `description`に区分値の論理名を記載する
    ```yaml
      # ex. enum
      name: gender
      type: string
      enum:
        - '00'
        - '01'
        - '02'
      description: |
        性別
          00: 不明
          01: 男
          02: 女
    ```
* 日付/日時/時刻
    * 日付
        * ISO8601拡張形式（YYYY-MM-DD）とする
        * example: `2020-01-31`
        * name: 接尾辞`_date`
        * type: `string`
        * format: `date`
        ```yaml
        created_date:
            type: string
            example: '2020-01-31'
            format: date
        ```
    * 日時
        * タイムゾーン指定子付きISO8601形式とする
        * 秒精度（YYYY-MM-DDThh:mm:ss+TZD）の場合
            * example: `2020-01-31T23:59:59+09:00`
            * name: 接尾辞`_date_time`
            * type: `string`
            * format: `date-time`
            ```yaml
            created_date_time:
                type: string
                example: '2020-01-31T23:59:59+09:00'
                format: date-time
            ```
        * ミリ秒精度（YYYY-MM-DDThh:mm:ss.sss+TZD）の場合
            * example: `2020-01-31T23:59:59.000+09:00`
            * name: 接尾辞`_date_time`
            * type: `string`
            * pattern: 必須
            ```yaml
            created_date_time:
                type: string
                example: '2020-01-31T23:59:59.000+09:00'
                pattern: '^((?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9][0-9][0-9])[+|-]([0-9][0-9]:[0-9][0-9])$'`
            ```
    * 時刻
        * ISO8601形式（hh:mm）とする
        * example: `23:59`
        * name: 接尾辞`_time`
        * type: string
        * pattern: 必須
        ```yaml
        created_time:
            type: string
            example: 23:59
            pattern: '^(2[0-3]|[01][0-9]):([0-5][0-9])$'
        ```
* その他
    * 正規表現で表現できる文字列は`pattern`を利用して定義すること

## responses

### GET APIの場合

* description
    * 必須
    * HTTPステータスコードのメッセージを記載すること
* schema
    * HTTPステータス：200の場合
        * `type: object`でレスポンスモデルを定義する
        * required: 必須で返る項目を定義する
        * 再利用可能なモデルを`definitions`配下に定義する
            * 複合的なモデルを定義する場合は`allOf`を利用する
    ```yaml
    # good
    getProductsResponse:
      allOf:
        - type: object
          properties:
            products:
              type: array
              items:
                $ref: "#/definitions/product"
            required:
              - products
        - $ref: "#/definitions/pagination"
    # bad
    getProductsResponse:
      type: array # TypeScriptのInterfaceが適切に定義されません
      items:
        product:
          type: object
            properties:
              product_id:
                type: string
                # required: true を定義しないとundefined許容の変数となり不要なType Guardが必要になる
              product_name:
                type: string
    ```
    * HTTPステータスコード：400系または500系の場合
        * 共通で定義されたレスポンスモデルを利用すること
* examples
    * ステータスコード：200の場合のみ`application/json`という命名で必須
    * 必須項目は必ず値を記載すること
```yaml
200:
  description: OK
  schema:
    $ref: '#/definitions/getProductsResponse'
  examples:
    application/json: # Mockサーバのレスポンスになるためフロントエンド開発者も編集する
      products:
        - product_name: Example Product
          create_date: '2020-01-01'
400:
  description: Bad Request
  schema:
    $ref: '#/definitions/ErrorResponse'
500:
  description: Internal Server Error
  schema:
    $ref: '#/definitions/ErrorResponse'
```

### POST/PUT/DELETE APIの場合

* description
    * 必須
    * HTTPステータスコードのメッセージを記載すること
* schema
    * 原則不要
    * 必要な場合は`type: object`でレスポンスモデルを定義する
* examples
    * schemaを定義した場合のみ記載する
    * ステータスコード：200の場合のみ`application/json`という命名で必須
    * 必須項目は必ず値を記載すること

## models

### リクエストモデル

* URI単位で1モデルを定義する
* 命名規約
    * キャメルケース
    * `postXxxxRequest`または`putXxxxRequest`
```yaml
# POST /products
postProductRequest:
  type: object
  properties:
    proeuct_name:
      type: string
  required:
    - product_name

# PUT /products/:product_id
putProductRequest:
  type: object
  properties:
    proeuct_id:
      type: string
    proeuct_name:
      type: string
  required:
    - product_id
```

### レスポンスモデル

* URI単位で1モデルを定義する
* リソースモデルをそのまま利用できる場合は不要
* 命名規約
    * キャメルケース
    * `getXxxxResponse`
```yaml
# GET /products
getProductResponse:
  type: object
  properties:
    proeucts:
      type: array
      items:
        $refs: "#/definitions/product"

# GET /products/:product_id
responses:
  200:
    description: OK
      schema:
        $ref: "#/definitions/product" # リソースモデルをそのまま利用する場合は不要
```

### リソースモデル

* リソースや共通で利用するエンティティの単位で単数形で定義する
* 命名規約
    * キャメルケース
```yaml
pagination:
  type: object
  properties:
    total_counts:
      type: integer
    offset:
      type: integer
    limit:
      type: integer
  required:
    - total_counts
    - offset
    - limit
```

## HTTPステータス

* 原則として[RFC 7231](https://tools.ietf.org/html/rfc7231#section-6)で定義されているレスポンスステータスコードを利用します
* 以下、設計者が特に意識すべきものを抜粋して記載します。

### 共通

* バリデーションエラー：`400 Bad Request`
* 業務エラー：`400 Bad Request`
* 認証エラー：`401 Unauthorized`
* 認可エラー：`403 Forbidden`
* システムエラー：`500 Internal Server Error`

### GET

* 正常系：`200 OK`
* 検索系APIで結果0件：`200 OK`
* キー検索系APIで対象リソースが存在しないエラー：`404 Not Found`

### POST

* 正常系（同期）：`201 Created`
* 正常系（非同期）：`202 Accepted`
* 一意制約違反エラー：`409 Conflict`
* 親リソースが存在しないエラー：`404 Not Found`

### PUT

* 正常系（同期）：`200 OK`
* 正常系（非同期）：`202 Accepted`
* 対象リソースが存在しないエラー：`404 Not Found`

### DELETE

* 正常系：`204 No Content`
* 対象リソースが存在しないエラー：`404 Not Found`

# さいごに

今回はSwaggerやREST APIの設計に慣れてないメンバーを含む複数人で設計していくことを踏まえて、Swaggerに精通している方には自明な内容を含めやや細かめに規約を設定してみました。

結果として品質の高いスキーマ定義でコードを自動生成することでテスト工数も削減できますし、TypeScriptの恩恵をしっかり享受できました。

よいソースコードを書くために正しく美しいスキーマ定義を設計しましょう。
