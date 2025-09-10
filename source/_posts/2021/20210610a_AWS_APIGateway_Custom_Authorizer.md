---
title: "AWS APIGateway Custom Authorizer入門"
date: 2021/06/10 00:00:00
postid: a
tag:
  - AWS
  - Lambda
  - APIGateway
  - JWT
category:
  - 認証認可
thumbnail: /images/2021/20210610a/thumbnail.png
author: 李光焄
lede: "今回は流行りの認証プロトコルであるOpenID ConnectとOAuth2.0におけるAuthorizerについて話そうと思います。AuthorizerとはAWS APIGatewayにある機能の一つで、外からAPIサーバに送られてくるリクエストを検証することにより、アクセスを制御する機能です。"
---
こんにちは。TIG/DXユニットのLEEです。フューチャーではここ数年、主に認証認可関係の設計や開発などを担当しております。

今回は流行りの認証プロトコルであるOpenID ConnectとOAuth2.0におけるAuthorizerについて話そうと思います。

# Authorizerとは

<img alt="カスタムオーソライザの動作フロー" src="/images/2021/20210610a/custom-auth-workflow.png" loading="lazy">

[Authorizer](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)とはAWS APIGatewayにある機能の1つで、外からAPIサーバに送られてくるリクエストを検証することにより、アクセスを制御する機能です。OAuth2.0のプロトコルにおいては、AuthorizerはJWTなどTokenを検証することで、APIサーバ、つまり `ResourceServer` を保護する役割を持っています。

OSSのAPIGatewayであるKongを触ったことがある方ならば、[JWT Plugin](https://docs.konghq.com/hub/kong-inc/jwt/)とほぼ同じ立ち位置のものと思って構いません。

# なぜ使うのか

SinglePageApplicationやモバイルアプリなど、ClientになるFront-endがサーバと分離されたシステム構成の場合、`Client (RelyingParty)` と `APIサーバ (ResourceServer)` を両方セキュアにする必要があります。

`RelyingParty` の場合、KeycloakやAuth0など認証基盤が提供するライブラリや、OIDCに準拠したライブラリを使えば割と簡単にセキュアにすることが可能です。

一方、`ResourceServer` にはAuthorizerを実装する必要があります。Authorizerはサーバの内部のMiddleware層などに実装することも可能ですが、複数のAPIサーバが存在してて、1つのAPIGatewayでEndpointを集中管理する場合にAuthorizerをLambdaとして一本実装することにより、開発やデプロイなどにメリットをもたらすことができます。

この度はそのAuthorizerを実装するにあたって、いくつか考慮すべきポイントについて触れて行こうと思います。

# Authorizer設定

## タイプ

今回はCognitoではなく、KeycloakやAuth0など外部の認証基盤を想定しています。
AuthorizerをLambda関数で実装することにより、認証認可制御をもっと自由にカスタムできます。

## Lambdaイベントペイロード

Lambda関数の引数となるEventの入力値には2パターン存在します。

- **Tokenタイプ**は簡単にTokenとmethodArnのみが取得可能で、Tokenを検証しその(JWTならば)PayloadとmethodArnのパスを対照するなどで認可を制御することが可能になります。
- **Requestタイプ**はAPIGatewayのプロキシ統合のリクエストと同じものを引数として受けられます。TokenとmethodArnはもちろん、他のHeaderやクエリ文字列、Bodyなどすべてのリクエストの中身が取得できるため、もう少し自由な認可要件が必要なときに使うこともできます。

## トークンの検証

Tokenの中身を検証する前に正規表現により簡単にチェックできます。一般的にTokenとしてJWTを使う場合は`^Bearer [-_0-9a-zA-Z.]+$`のように設定します。
この正規表現にマッチしない場合、AuthorizerはLambdaまでリクエストを送らず401を返します。

## 認可のキャッシュ

AuthorizerはAPIリクエストが送られるとき毎回必ずTokenを検証するので、その負荷を減らすためにキャッシングも可能です。
しかし、この機能には大きな問題があり、キャシングの単位がTokenそのものではなく、Tokenのソースであるヘッダー名(`Authorization`など)になっています。あるユーザが一度認可したあとならば、他のユーザがそのキャッシュを使い回すことができてしまうため、基本無効にするしかないと思います。

# Lambdaの実装

Lambda実装の流れは大きく分けて

1. まず、Tokenを検証し**認証**する
2. 検証したTokenのPayloadとアクセスしようとするリソースの情報(methodArnなど)を対照し**認可**する

の2つの段階になるかと思います。

## 入出力

Goで実装する場合メインハンドラー関数は以下のような形になります。

```go
func Handle(e events.APIGatewayCustomAuthorizerRequest) (*events.APIGatewayCustomAuthorizerResponse, error) {
    // Tokenタイプイベントペイロード
}

func Handle(e events.APIGatewayCustomAuthorizerRequestTypeRequest) (*events.APIGatewayCustomAuthorizerResponse, error) {
    // Requestタイプイベントペイロード
}
```

[aws-lambda-go](https://github.com/aws/aws-lambda-go)には、すでにCustomAuthorizerのための入出力構造体が用意されているため大変便利です。
出力の戻り値としてはAWS IAMのようなAWSPolicyDocumentを使い返します(詳細後述)。

### 出力パターン

Lambda関数の出力(戻り値)により、以下のようにAPIに送られてきたリクエストを制御できます。

|出力パターン|動作|HTTP Status|Response Body|
|-|-|-|-|
|Policy：Allow|アクセス許可|後続のAPIレスポンスによる|後続のAPIレスポンスによる|
|Policy：Deny|認可失敗|403 Forbidden|`{"message": "User is not authorized to access this resource with an explicit deny"}`|
|Error：Unauthorized|認証失敗|401 Unauthorized|`{"message": "Unauthorized"}`|
|その他のError|エラー|500 Internal Server Error|`{"message": "Internal Server Error"}`|

*特記事項として、エラーを返すにしてもエラーメッセージを`Unauthorized` (大文字`U`に注意)にすることにより401を返すことができます。*

## Authentication

認可制御のために前提として、まずは認証が必要になります。一般的にはJWTを検証することになり、JWTのライブラリを使えば簡単ですが、検証のための**公開鍵取得方法**には2パターンがあるかと思われます。

### 静的に公開鍵を保持する

公開鍵をLambdaの環境変数やDynamoDB、S3などを使い静的に保持する方法です。
実装は簡単で構造もシンプルですが、鍵のローテションをどうするか考える必要が将来的に出てきます。

### 公開鍵を動的に取得する

認証基盤が公開している公開鍵エンドポイントから鍵を取得する方法です。
公開鍵エンドポイントは一般的に認証基盤側が[JSON Web Key(JWK)](https://openid-foundation-japan.github.io/rfc7517.ja.html)により定義し、以下のような形で公開しています。

- [Keycloak証明書エンドポイント](https://keycloak-documentation.openstandia.jp/master/ja_JP/securing_apps/index.html#_certificate_endpoint)
- [Auth0 JSON Web Key Sets](https://auth0.com/docs/tokens/json-web-tokens/json-web-key-sets)

この方法は鍵のローテションを気にせずに済みますが、APIリクエストのたびに認証基盤への外部リクエストが発生するので、遅延・負荷を軽減するための効率的なキャッシング戦略を立てる必要があります。

## Authorization

APIリクエストのToken検証が完了し認証ができたら、次はそのユーザーがリクエストしたエンドポイントにアクセス可能かをチェックする認可処理が必要になります。

認可、アクセスコントロールはJWTのClaimsの値に入っているユーザの属性やロールとAPIエンドポイントのパスなどを対照することにより制御することが可能です。

ロジックについては認証基盤の設定やそのシステムの固有の考え方などによりRole-BasedAccessControl、Attribute-BasedAccessControlなど、様々なやり方があります。こういったロジックは自由度の高い領域なのでここでは参考程度にKeycloakやAuth0などで想定しているアクセスコントロールについてのリンクだけを貼っておきます。

- [Keycloak Authorization Services Guide](https://keycloak-documentation.openstandia.jp/master/ja_JP/authorization_services/)
- [Auth0 Authorization](https://auth0.com/docs/authorization)

### 認可の出力

認可ロジックによりユーザのアクセス可否が決まったら、Authorizerは以下のようなJSONで認可処理が完了したことをAPIGatewayに返します。

```json
{
  "principalId": "yyyyyyyy", // The principal user identification associated with the token sent by the client.
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "execute-api:Invoke",
        "Effect": "Allow|Deny",
        "Resource": "arn:aws:execute-api:{regionId}:{accountId}:{apiId}/{stage}/{httpVerb}/[{resource}/[{child-resources}]]"
      }
    ]
  },
  "context": {
    "stringKey": "value",
    "numberKey": "1",
    "booleanKey": "true"
  },
  "usageIdentifierKey": "{api-key}" // Optional
}
```

#### Policy Document

IAMのものと同じ形式で、アクセスを許可するか拒否するかを明示的に表現します。

AuthorizerはAPIGateway上で動くものなので`"Action": "execute-api:Invoke"`は固定になります。
`Resource`はLambda関数の引数で受けた`methodArn`をそのまま返すで問題ありません。

#### Principal ID

APIリクエストしたユーザが誰なのかを表現します。リクエストしたユーザを一意に識別するための値であり、実際のAPIロジックを決める後続のLambda関数などに渡すことができ、ユーザによるレスポンスの出し分けなどを可能にします。

一般的にはJWTの[`sub` (Subject) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2)をそのまま使うことになります。

#### Authorizer Context

Principal IDと同じように後続のLambda関数などに渡すことができる任意の値です(Principal IDもContextの一部)。APIのレスポンスを出し分けするために必要な任意の情報をkey-value形式でセットすることが可能です。一見Mapオブジェクトにも見えますが、ValueとしてはNumber・String・BooleanのみでObjectやArrayなどの入れ子構造は使えません。

# 最後に

Authorizerの実装、最初はわからないことだらけで難しく感じるかもしれませんが、単機能の関数であるため、一度実装してしまったらテンプレートのように様々なAPIに使い回すことも可能かと思います。

以下は自分が実装の際に一番参考になったサンプルコードのリンクを置いて締めたいと思います。

- [Amazon API Gateway - Custom Authorizer Blueprints for AWS Lambda](https://github.com/awslabs/aws-apigateway-lambda-authorizer-blueprints)
- [AWS Lambda for Go - Authorizer Sample Function](https://github.com/aws/aws-lambda-go/blob/master/events/README_ApiGatewayCustomAuthorizer.md)
- [Auth0 Backend/API Go: Authorization](https://auth0.com/docs/quickstart/backend/golang/01-authorization)
