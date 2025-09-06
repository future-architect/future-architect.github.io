---
title: "OpenAPIでOAuth認可周りのサーバサイドコード生成を比較"
date: 2024/08/29 00:00:00
postid: a
tag:
  - OpenAPI
  - OAuth
  - OIDC
  - Go
  - OpenSSL
  - OpenAPIGenerator
category:
  - 認証認可
thumbnail: /images/2024/20240829a/thumbnail.png
author: 真野隼記
lede: "夏といえばコード生成というわけで、HTTP API仕様を定義するOpenAPIの security schemes（認証認可を定義するための箇所）で、Bearer／OAuth2／OpenID Connect  認証を設定すると、各コードジェネレータはどういったコード生成をしてくれるかを調べました。"
---
[夏の自由研究連載2024](/articles/20240819a/) の5日目です。

# はじめに

TIG 真野です。

夏といえばコード生成というわけで、HTTP API仕様を定義するOpenAPIの **security schemes**（認証認可を定義するための箇所）で、Bearer／OAuth2／OpenID Connect (OIDC) 認証を設定すると、各コードジェネレータはどういったコード生成をしてくれるかを調べました。

なお、OpenAPIについては[OpenAPI Specification v3.0.3のコーディング規約を公開しました](https://future-architect.github.io/articles/20240702a/)の記事も参考ください。

この記事で利用した `openapi.yaml` や生成したサーバサイドのコードは以下のリポジトリにまとめています。

- https://github.com/ma91n/summer2024

## コード生成の対象

- Go言語のみ
- サーバサイドのみ（※クライアントコードは対象外）

## 比較ツール

Goコードを生成可能な以下のツールを対象にします。今どきはOpen API 3.0.3（3.1.0） を使うと思うので、3系に対応しているツールを選定しています。[フューチャー技術ブログではgo-swagger記事がいくつかありますが](https://future-architect.github.io/tags/go-swagger/)、go-swaggerは2系にしか対応していないので対象外としています。

1. [ogen](https://github.com/ogen-go/ogen) v1.3.0
1. [oapi-codegen](https://github.com/oapi-codegen/oapi-codegen) v2.2.0 `net/http` モード、`strict-server` モード
1. [openapi-generator](https://github.com/OpenAPITools/openapi-generator) v7.8.0 `gorilla/mux` ルーターモード

## 検証の構成やコードについて

構成ですが、クライアントを `curl` で、JWTトークンをGo製のCLIツールで作成し、OAuth 2.0でいう認可サーバを無くした状態で検証しています（※本来は、公開鍵を `/oauth2/jwks` や `jwks_uri` で指定されたURLから取得できるようにすべきですが、ハードコードで省略しています）。

<img src="/images/2024/20240829a/openapi.drawio_(2).png" alt="openapi.drawio_(2).png" width="1200" height="719" loading="lazy">

## 利用するJWTトークンについて

認可サーバやIdPを今回用意しないので、替わりに `openssl` で秘密鍵・公開鍵を作成します。秘密鍵でJWTを署名し、公開鍵で検証することを想定しているので、非対称鍵系署名アルゴリズムを選定します。

詳しくない領域なので間違っていたらご指摘いただきたいですが、[RS256は避けた方が良い](https://www.authlete.com/ja/resources/videos/20200422/03/) というAuthleteさんの話を読み、今回はES512を利用することにします。

```sh
# 秘密鍵を生成
openssl ecparam -name secp521r1 -genkey -noout -out ecprivatekey.pem

# 公開鍵を生成
openssl ec -in ecprivatekey.pem -pubout -out ecpubkey.pem
```

秘密鍵を利用してJWTトークンを生成します。iss、subなど属性は適当にしています。スコープ（`scp`）は検証に用いたい値です。

```go main.go
package main

import (
	_ "embed"

	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"

	"github.com/golang-jwt/jwt/v5"
)

//go:embed ecprivatekey.pem
var privateKey []byte

func main() {
	// 参考: https://stackoverflow.com/questions/21322182/how-to-store-ecdsa-private-key-in-go
	block, _ := pem.Decode(privateKey)

	ecPrivateKey, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		log.Fatal(err)
	}

	s, err := jwt.NewWithClaims(jwt.SigningMethodES512,
		jwt.MapClaims{
			"iss": "my-auth-server",
			"sub": "123",
			"scp": "read:hellos write:hellos",
		}).SignedString(ecPrivateKey)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(s)
}
```

実行するとJWTトークンが標準出力されます。これをAuthorizationヘッダーに利用します。

```sh
$ go run .
eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJteS1hdXRoLXNlcnZlciIsInNjcCI6InJlYWQ6aGVsbG9zIHdyaXRlOmhlbGxvcyIsInN1YiI6IjEyMyJ9.AM5-XwIJM0HBxHeaUt2SXU7fU8UXQhet6DfzP7i0JoTVLwbme36NZ-rG_8URqtUkQ2knvi7D3iydvCGgoDGdHm41Ae3aMDNG-yjwUiH7O9xJVLPly2EkwQC0GdsZU6ax-99t0ePDaeJaNf7k799hgxDQ3op9KCNTr8pDfvR2a6PkLvfQ
```

## openapi.yaml

`openapi.yaml` の security schemes は次のように記載しています。先述の通り、OAuth 2.0での認可サーバ、OIDCでのIdPは利用しない構成のため、authorizationUrlなどの値はすべてダミー値であり、検証には使われません。

```yaml openapi.yaml 抜粋
components:
  # ...省略...
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: 'Bearerトークン認可'
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: 'https://example.com/oauth2/authorize'
          tokenUrl: 'https://example.com/oauth2/token'
          refreshUrl: 'https://example.com/oauth2/refresh'
          scopes:
            'write:hellos': modify hello in your account
            'read:hellos': read hello in your account
      description: 'OAuth 2.0認可'
    OIDC:
      type: openIdConnect
      openIdConnectUrl: https://example.com/.well-known/openid-configuration
      description: 'OpenID Connect'
```

各エンドポイントは次のように定義します。認証なし・Bearer認証・OAuth2.0認証・OIDC認証の4パターンです。

```yaml openapi.yaml 抜粋
paths:
  '/hello':
    get:
      tags:
        - ping
      summary: hello👋
      operationId: hello
      responses:
        '200':
          $ref: '#/components/responses/Hello'
  '/hello-bearer':
    get:
      tags:
        - ping
      summary: hello bearer👋
      operationId: helloBearer
      responses:
        '200':
          $ref: '#/components/responses/Hello'
      security:
        - Bearer: []
  '/hello-oauth2':
    get:
      tags:
        - ping
      summary: hello oauth2👋
      operationId: helloOAuth2
      responses:
        '200':
          $ref: '#/components/responses/Hello'
      security:
        - OAuth2:
            - 'write:hellos'
            - 'read:hellos'
  '/hello-oidc':
    get:
      tags:
        - ping
      summary: hello openid connect👋
      operationId: helloOIDC
      responses:
        '200':
          $ref: '#/components/responses/Hello'
      security:
        - OIDC:
            - 'write:hellos'
            - 'read:hellos'
```

`openapi.yaml`の全体は https://github.com/ma91n/summer2024/blob/main/openapi.yaml を参照ください。

## 検証項目

この `openapi.yaml` を元にコード生成を行い、次の内容がどのように変化するか確認しました。

1. Bearer、OAuth2、OIDC の認証設定によって生成コードがどのように変わるか、変わらないのか
2. 生成された認証設定のコードを各フレームワークでどのように実装するか
3. OAuth2、OIDC でスコープ（`write:hellos` などの部分）がどう生成コードに影響を与えるか

## 結果サマリ

【凡例】 ✅️対応あり ✘対応なし

| Name | Bearer | OAuth2 | OIDC | Bearerトークン取得処理 | スコープ対応 | 所感 |
| -- | -- | --- | --- | -- | --| -|
| ogen  | ✅️ | ✅️ | ✘ | コード生成支援あり | コード生成支援あり| 後発だけあり最も洗練度が高い |
| oapi-codegen | ✅️ | ✅️ | ✅️ | 自前実装 | コード生成支援あり | 現時点でも自由度高く実装可能 |
| openapi-generator | ✘ | ✘ | ✘| 自前実装 | 自前実装 | 認可処理はサポート外なのが惜しい |

今回の検証における、おすすめ度は記載順で、`ogen` >= `oapi-codegen` > `openapi-generator` といった感覚です。別の角度では全く結果が変わることも想定されますので、あくまで判断材料の一部としての利用、認識いただければです。

## 1. ogen

セットアップです。

```sh
# インストール
go install -v github.com/ogen-go/ogen/cmd/ogen@v1.3.0

# コード生成
ogen --target api --clean openapi.yaml
```

そのまま実行すると以下のエラーが表示されます。`ogen` はサーバサイドコード生成だけど `OIDC` が未対応でした。

```sh openIdConnect未対応のメッセージ
$ ogen --target api --clean openapi.yaml
Feature "openIdConnect security" is not implemented yet.
```

回避としては同一改装に `ogen.yaml` を用意して次のスキップ設定を追加します（コマンドラインオプションに設定ファイルの指定は不要で、自動で読み込まれるようです）。

```yaml ogen.yaml
generator:
  ignore_not_implemented: ["openIdConnect security"]
```

`ogen.yaml` で何が指定できるかはドキュメントに記載が見当たらずでした。ご存知の方はX（旧Twitter）でコメントいただけると幸いです。

さて、`ogen`ですが各エンドポイントの実装詳細は [ogensample/hello_handler.go](https://github.com/ma91n/summer2024/blob/main/ogensample/hello_handler.go) を参照いただきたいですが、感覚で言うと生成コードはシンプルでわかりやすく、ハマるポイントは少ないです。

ただ認可側の実装はドキュメントの[Misc > Request lifecycle > security-handlers](https://ogen.dev/docs/misc/request_lifecycle/#security-handlers)に記載が少しある程度で少し推測が必要でした。

生成コードを読んでいった方が早いかもしれません。ドキュメントと生成コードを見比べていくと、`api/SecurityHandler` インタフェースを満たす必要があるとわかります。Bearer認証とOAuth2.0認証ごとに呼ばれる関数が異なる作りのようです。さらに同じ認証方式だけど、あるエンドポイントだけで挙動を変えたい場合は、`operationName` （`openapi.yaml` で定義した `operationId` が入っていました）を用いて拡張可能な作りです。親切！

```go 満たすべきインターフェース security_handler.go
type SecurityHandler interface { bn
	// Bearerトークン認可. operationNameにはhelloやhelloBearerなどoperationIdの値が入る
	HandleBearer(ctx context.Context, operationName string, t Bearer) (context.Context, error)

	// OAuth 2.0認可.
	HandleOAuth2(ctx context.Context, operationName string, t OAuth2) (context.Context, error)
}
```

ogenが生成した `Bearer` や `OAuth2` の構造体もシンプル。Tokenはリクエストヘッダの `Authorization: Bearer <token>` の `<token>` の値が入っています。`OAuth2` 側の`Scopes` は`openapi.yaml` 側で指定した値が入っています。

```go oas_schemas_gen.go
type Bearer struct {
	Token string
}

type OAuth2 struct {
	Token  string
	Scopes []string
}
```

これを満たすように `MySecurityHandler` を実装します。トークンのチェックはかなり端折った実装になっています。本来は発行者（`iss`）、アルゴリズム（`alg`）、用途（`aud`）、期限（`exp`）なども確認する必要があるでしょう。

```go security_handler.go
type UserClaim struct {
	jwt.RegisteredClaims
	Scope string `json:"scp"`
}

type MySecurityHandler struct{}

func (o MySecurityHandler) HandleBearer(ctx context.Context, operationName string, t api.Bearer) (context.Context, error) {
	return o.handleToken(ctx, t.Token, []string{})
}

func (o MySecurityHandler) HandleOAuth2(ctx context.Context, operationName string, t api.OAuth2) (context.Context, error) {
	return o.handleToken(ctx, t.Token, t.Scopes)
}

func (o MySecurityHandler) handleToken(ctx context.Context, jwtToken string, expectedClaims []string) (context.Context, error) {
	var userClaim UserClaim
	token, err := jwt.ParseWithClaims(jwtToken, &userClaim, func(token *jwt.Token) (any, error) {
		blockPub, _ := pem.Decode([]byte(jwtKey))
		return x509.ParsePKIXPublicKey(blockPub.Bytes)
	})
	if err != nil {
		return ctx, err
	}

	if !token.Valid {
		return ctx, errors.New("invalid token")
	}

	if err = checkTokenClaims(expectedClaims, userClaim); err != nil {
		return ctx, fmt.Errorf("token claims don't match: %w", err)
	}

  	// TODO その他、必要なチェックを実施

	return nil, nil
}

// checkTokenClaims はスコープのチェックを行う
func checkTokenClaims(expectedClaims []string, t UserClaim) error {
	// ...省略...
	return nil
}
```

上記の2つのハンドラーをmain.goで呼び出して完成です。

```go main.go
package main

import (
	"log"
	"net/http"

	"githu.com/ma91n/summer2024/ogensample/api"
)

func main() {
	srv, err := api.NewServer(&HelloHandler{}, MySecurityHandler{})
	if err != nil {
		log.Fatal(err)
	}

	if err := http.ListenAndServe(":8080", srv); err != nil {
		log.Fatal(err)
	}
}
```

`go run .` で実行すると、`8080` ポートで起動します。

`curl` で実行して動作確認します。

```sh
$ curl localhost:8080/hello
{"message":"hello"}

$ make curl-bearer
curl -H "Authorization: Bearer <トークン>" localhost:8080/hello-bearer
{"message":"hello"}

$ curl -H "Authorization: Bearer <トークン>" localhost:8080/hello-oauth2
{"message":"hello"}

$ curl -H "Authorization: Bearer <トークン>" localhost:8080/hello-oidc
{"message":"hello"}
```

あえて失敗させるケースでの挙動を見てみます

```sh
# Authorizationヘッダなしで動かすケース
$ curl localhost:8080/hello-bearer
{"error_message":"operation HelloBearer: security \"\": security requirement is not satisfied"}

# JWTのシグネチャを1文字書き換えたケース
$ curl -H "Authorization: Bearer <1文字シグネチャを書き換えた不正なトークン>" localhost:8080/hello-bearer
{"error_message":"operation HelloBearer: security \"Bearer\": token signature is invalid: crypto/ecdsa: verification error"}
```

詳細は割愛しますが、JWTトークンにユーザーIDなどが含まれており、各Handlerアプリ側で利用したい場合も、`ctx` に詰めて連携可能であり、使いやすインタフェース（フレームワーク）だと感じました。

ogenのサーバサイドコード生成について、まとめると次のような所感です。

- OIDCには対応していない
- Bearer、OAuth2といった種別ごとに一律、ミドルウェアのような形式で認可ロジックを実装する
- 各エンドポイント毎に挙動を変えたい場合は、引数のoperationIdの値を利用して切り替え可能
- Bearer、OAuth2で生成コードの差分はほぼ無いが、スコープフィールドだけが増える
- JWTトークンのパースや検証を自前で実装する
- JWTトークンの値を後続に引き渡したい場合は、 `context.Context` を経由する

## 2. oapi-codegen

`ogen`より先発だけあって、利用実績も多数な`oapi-codegen`ですが、[2024年5月](https://github.com/oapi-codegen/oapi-codegen/discussions/1605)にOrganizationが`deepmap`から`oapi-codegen` に変わったようです。

セットアップです。

```sh
# インストール
go install github.com/deepmap/oapi-codegen/v2/cmd/oapi-codegen@v2.2.0

# コード生成
oapi-codegen --config=config.yaml openapi.yaml
```

`oapi-codegen` は`Echo`、`Gin`、`net/http` などに沿ったコードを生成できますが、今回は `net/http` 向けで出力します。また、リクエスト／レスポンスを構造体にマッピングまで行ってくれる、`strict-server` モードを有効にします。これを踏まえ、先程のコード生成コマンドの引数で渡していた`config.yaml` を以下のように設定しました。

```yaml config.yaml
package: api
generate:
  std-http-server: true
  models: true
  strict-server: true
  embedded-spec: true
output: api/gen.go
```

各エンドポイントは `oapi-codegen` が生成した `api/gen.go` の `StrictServerInterface`インタフェースを実装する必要があります。全体像は [hello_handler.go](https://github.com/ma91n/summer2024/blob/main/oapicodegensample/hello_handler.go) を参照いただきたいですが、`ref` でオブエジェクト参照すると、`ogen`と比べ生成されたコードにネストが発生するところが、少しもどかしさを感じます。

```go hello_handler.go（抜粋）
type HelloServer struct{}

func (s HelloServer) Hello(_ context.Context, _ api.HelloRequestObject) (api.HelloResponseObject, error) {
	return api.Hello200JSONResponse{HelloJSONResponse: api.HelloJSONResponse{Message: ptr("hello")}}, nil
}

func (s HelloServer) HelloBearer(_ context.Context, _ api.HelloBearerRequestObject) (api.HelloBearerResponseObject, error) {
	return api.HelloBearer200JSONResponse{HelloJSONResponse: api.HelloJSONResponse{Message: ptr("hello")}}, nil
}

func (s HelloServer) HelloOAuth2(_ context.Context, _ api.HelloOAuth2RequestObject) (api.HelloOAuth2ResponseObject, error) {
	return api.HelloOAuth2200JSONResponse{HelloJSONResponse: api.HelloJSONResponse{Message: ptr("hello")}}, nil
}
```

認証部分は、ミドルウェアとして実装します。リポジトリ側に[examples](https://github.com/oapi-codegen/oapi-codegen/tree/main/examples/authenticated-api/stdhttp)実装があるため、それを参考にするとよいでしょう。[RAEDME](https://github.com/oapi-codegen/oapi-codegen?tab=readme-ov-file#implementing-security)の記載を見る限り、現状はミドルウェアで実装する必要があるが、将来的には[ファーストクラスサポート](https://github.com/oapi-codegen/oapi-codegen/issues/1524)していくよとあり、期待です。

サンプル実装を元に `main.go` を実装します。ミドルウェアですが、`nethttpmiddleware`という`oapi-codegen`が用意してくれたパッケージを利用します。

```go main.go
package main

// ...中略...

func main() {
	spec, err := api.GetSwagger()
	if err != nil {
		log.Fatalln("loading spec: ", err)
	}
	spec.Servers = nil

	// 認証処理はミドルウェアとして実装
	mw := nethttpmiddleware.OapiRequestValidatorWithOptions(spec,
		&nethttpmiddleware.Options{
			Options: openapi3filter.Options{
				AuthenticationFunc: NewAuthenticator(), // ★NewAuthenticatorは個別実装の部分
			},
		})

	strictHandler := api.NewStrictHandler(HelloServer{}, nil)
	h := api.HandlerFromMux(strictHandler, http.NewServeMux())

	s := &http.Server{
		Handler: mw(h),
		Addr:    "0.0.0.0:8080",
	}
	log.Fatal(s.ListenAndServe())
}
```

ミドルウェアの実体としては次のようなインタフェースを実装します。現時点ではセキュリティスキーマごちゃまぜですので、入力値でスイッチして切り替えます。`openapi3filter.AuthenticationInput` は`openapi.yaml` の解析結果や `http.Request` も取れるため、やろうと思えばすべて判定できます。

```go jwt_authenticator.go
func NewAuthenticator() openapi3filter.AuthenticationFunc {
	return func(ctx context.Context, input *openapi3filter.AuthenticationInput) error {
		securitySchemeName := input.SecuritySchemeName
		switch securitySchemeName {
		case "": // 認証なし
			return nil
		case "Bearer":
			return validateSecurityScheme(input)
		case "OAuth2":
			return validateSecurityScheme(input)
		case "OIDC":
			return validateSecurityScheme(input)
		default:
			panic("not supported security scheme " + securitySchemeName)
		}
	}
}

func validateSecurityScheme(input *openapi3filter.AuthenticationInput) error {
	jws, err := getJWSFromRequest(input.RequestValidationInput.Request)
	if err != nil {
		return fmt.Errorf("getting jws: %w", err)
	}

	var userClaim UserClaim
	token, err := jwt.ParseWithClaims(jws, &userClaim, func(token *jwt.Token) (any, error) {
		// 参考: https://stackoverflow.com/questions/21322182/how-to-store-ecdsa-private-key-in-go
		blockPub, _ := pem.Decode([]byte(jwtKey))
		return x509.ParsePKIXPublicKey(blockPub.Bytes)
	})
	if err != nil {
		return fmt.Errorf("validating JWS: %w", err)
	}

	// ...ここからはogen版と同様であるため省略...

	return nil
}
```

サーバを `go run .` で起動して、動作確認します。

```sh 成功ケース
$ curl localhost:8080/hello
{"message":"hello"}

$ make curl-bearer
curl -H "Authorization: Bearer <トークン>" localhost:8080/hello-bearer
{"message":"hello"}

$ curl -H "Authorization: Bearer <トークン>" localhost:8080/hello-oauth2
{"message":"hello"}

$ curl -H "Authorization: Bearer <トークン>" localhost:8080/hello-oidc
{"message":"hello"}
```

エラーメッセージはハンドリングがデフォルトのままなので、JSONではなく文字列が返ってきていますが、チェック自体はできていることがわかります。

```sh 失敗ケース
# Authorizationヘッダなしで動かすケース
$ curl localhost:8080/hello-bearer
security requirements failed: getting jws: authorization header is missing

# JWTのシグネチャを1文字書き換えたケース
$ curl -H "Authorization: Bearer <1文字シグネチャを書き換えた不正なトークン>" localhost:8080/hello-bearer
security requirements failed: validating JWS: token is malformed: could not JSON decode header: invalid character '\x13' looking for beginning of value
```

oapi-codegenのサーバサイドコード生成について、まとめると次のような所感です。

- `openapi.yaml` の定義上でオブジェクトを `$ref` 参照させると少しコードが冗長に見える（回避策の有無は未調査）
- Bearer、OAuth2、OIDCのチェックは現時点ではミドルウェアで実装し、コード生成上のサポートは弱い（将来的に解消する方向とREADMEに記載あり）
- ミドルウェアでは、判定に必要な情報はすべて取得できるため、該当のリクエストがBearer、OAuth2、OIDCのどれでチェックすべきか、operationIdを用いた各エンドポイント固有の挙動を追加するなど柔軟に開発できる自由度がある
- 試していないが、JWTトークンを解析した結果は `http.Request` を取得できるため `Request.WithContext()` を用いた `context.Context` 経由で各エンドポイント側に渡すことが可能だと考えられる
- JWTトークンのパースどころか、リクエストヘッダから取得するところまで自前開発が必要（とはいえ、大したコード量にはならない）
- 様々な出力モードがあるため、検索結果が別の設定モードの場合があり、見極め力が必要な場合がある

## 3. openapi-generator

最も有名なコード生成ツールである `openapi-generator` を試します。様々な言語に対応していますが、記事の趣旨からGo言語かつサーバサイドに絞って生成します。

セットアップです。

```sh
# インストール
npm install @openapitools/openapi-generator-cli -g

# コード生成
openapi-generator-cli version-manager set 7.8.0
```

各エンドポイントのコードは生成された`openapi/api_ping_service.go` のTODOを埋めて実装します。DO NOT EDITを手動で消しつつ、 `.openapi-generator-ignore` に上記のパスを追加することで、上書きされることを防ぐ必要があります。

```go openapi/api_ping_service.go（抜粋）
type PingAPIService struct {
}

func NewPingAPIService() *PingAPIService {
	return &PingAPIService{}
}

// Hello - hello👋
func (s *PingAPIService) Hello(_ context.Context) (ImplResponse, error) {
	return Response(http.StatusOK, Hello{Message: "Hello"}), nil
}

// HelloBearer - hello bearer👋
func (s *PingAPIService) HelloBearer(ctx context.Context) (ImplResponse, error) {
	return s.Hello(ctx)
}

// HelloOAuth2 - hello oauth2👋
func (s *PingAPIService) HelloOAuth2(ctx context.Context) (ImplResponse, error) {
	return s.Hello(ctx)
}

// HelloOIDC - hello openid connect👋
func (s *PingAPIService) HelloOIDC(ctx context.Context) (ImplResponse, error) {
	return s.Hello(ctx)
}
```

`openapi-generator` のGoサーバサイド生成ですが、**セキュリティスキーマには未対応** です。[generators/go-server.md](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/generators/go-server.md#security-feature) にもその旨が書かれています。コード生成上の支援は現時点では受けられません。

そのため、認証処理はミドルウェアで個別実装する必要があります。デフォルトでは GitHub.com/gorilla/mux が利用される（chiに切り替えも可能）ので、muxのミドルウェアを実装します。

ミドルウェアとして、そのリクエストが認証なし・Bearer・OAuth2.0・OIDCかどうかは自分で判定する必要があります。また、該当のリクエストがどのスコープを要求するかも自分でマッピングを準備する必要があります。

```go auth_middleware.go
func Authentication(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/hello":
			next.ServeHTTP(w, r)
		default: // URL＋HTTPメソッドごとに手動でマッピングするなどの必要がある
			if err := validateToken(r); err != nil {
				status := http.StatusUnauthorized
				_ = openapi.EncodeJSONResponse(map[string]any{"message": err.Error()}, &status, w)
				return
			}
			next.ServeHTTP(w, r)
		}
	})
}

func validateToken(r *http.Request) error {
	jws, err := getJWSFromRequest(r)
	if err != nil {
		return fmt.Errorf("getting jws: %w", err)
	}

	// ...ここからはoapi-codegenと同様なので省略...
 	// 認可スコープの引き渡しも自前でなんとかする必要がある

	return nil
}
```

マッピング情報を `oepnapi.yaml` とダブルメンテすることは実運用上、耐えられないチームが多いと思いますのでそのままでは利用できないという判断を下すことが多いかなと思います。そのため、Yusuke ItoさんのZennブック[【Go言語】OpenAPI Generatorを使いこなすスキーマ駆動開発](https://zenn.dev/ysk1to/books/248fad8cb34abe) にある通り、テンプレートがmustacheで書かれており、これを拡張して利用するといった取り組みが必要となるかと思います。

`openapi-generator` のサーバサイドコード生成について、まとめると次のような所感です。

- 記事には書いていなかったが、`.openapi-generator`、`.openapi-generator-ignore`、`openapitools.json`、`README.md` などGoのコード以外にもファイルが生成して初見は少し驚く
- 各エンドポイントの実装は迷うことが少ないが、ImplResponseのボディは `interface{}` であるため、型がふわっとしてしまって残念に感じた（回避方法の有無は未調査）
- 認可周りのコード生成上の支援が無く、使いこなすにはテンプレートをカスタマイズする勢いが必要そう
- Yusuke ItoさんのZennブック[【Go言語】OpenAPI Generatorを使いこなすスキーマ駆動開発]によれば、カスタマイズしたテンプレート実行には、Java環境（Mavenなど）が必要で、メンバーのスキルセット次第では障壁がある（FAT JAR提供とかあったらすいません）
- 調査すると、他の言語（Swiftなど）の結果が出てくるので、検索ワード力が必要かもしれない

## さいごに

OpenAPI 3系かつGoのサーバサイドコード生成に対応した `ogen`・`oapi-codegen`・`openapi-generator`について、Bearer・OAuth2.0・OIDC認可でどのようにコード生成が対応しているか試しました。現時点では `ogen` が後発だけあって一番垢抜けていて、`oapi-codegen`も十分に扱いやすい。`openapi-generator`は玄人向けだなと感じました。

コード生成上はサーバサイドに限ると、Bearer・OAuth2.0・OIDCで変化はほぼ無いため（大半はミドルウェア的に実装するだけ）であるため、サーバサイドの実装視点では `openapi.yaml` で細かく定義する意味はあまり無い（もちろんWeb APIの利用者視点では有意義な手がかりになるでしょうが）という結果でした。

近い将来では、これらコードジェネレータの領域は、ChatGPTとかclaude.aiに `openapi.yaml` を入力させてプロンプトエンジニアリングでコード生成させる方向でも広がっていくと良いかなと思っています。コード生成コマンド時のオプションや、設定ファイルなどで行う微調整的な機能は、生成AI側で行ってくれる未来...、来ると良いなぁ。
