---
title: "Kong API Gatewayを使ってResource Serverを保護する"
date: 2022/10/06 00:00:00
postid: a
tag:
  - OAuth
  - OIDC
  - APIGateway
  - JWT
  - Keycloak
category:
  - 認証認可
thumbnail: /images/2022/20221006a/thumbnail.png
author: 李光焄
lede: "API Gatewayのミドルウェア製品となるKongを使ってResource Serverを構築する方法について話します。"
---

こんにちは。TIGのLEEです。[認証認可連載](/articles/20221003a/)の3本目です。

前回はAWS API Gatewayを利用して、OIDC/OAuth2.0におけるResource ServerをCustom Authorizerで保護する記事を書いてました。

https://future-architect.github.io/articles/20210610a/

今回はAPI Gatewayのミドルウェア製品となるKongを使ってResource Serverを構築する方法について話します。

# Kong Gateway

<img src="/images/2022/20221006a/gateway_overview.png" alt="gateway_overview.png" width="1200" height="507" loading="lazy">

[Kong](https://github.com/Kong/kong)はOSSから始まったAPIサーバのトラフィックを管理するためのミドルウェアです。

nginxベースにLuaJITエンジンを使ってLuaスクリプトが組み込めるWebプラットフォームの[OpenResty](https://openresty.org)を採用し、Luaで書かれた様々なPlug-inをデフォルトで揃え、それを組み立てることでAPIGatewayの機能を実装しています。また、Luaスクリプトで新しいカスタムPlug-inを作りそれを組み込むことも可能です。

Enterprise版が登場してからはAPIGateway以外にも様々さサービスがありますが、今回はKong Gatewayにのみ注目して行きたいです。

## Kongの構造

構築の話になる前にかんたんにKongの構造を触れていきます。上の図のようにKongは基本的にConsumer/Route/Service/LoadBalancer(Upstream)の4つのレイヤリングが存在します。Kongで使う様々なPlug-inはこの4つのレイヤーのどこか、もしくはGlobalに組み込むこともできます。

- **Consumer**: Kongを実際利用するAPIClient(もしくはユーザ)を表すエンティティ
- **Route**: Requestのルールを定義するエンティティ
- **Service**: KongがProxyするBackendServiceを表すエンティティ
- **Upstream**: Backendの負荷分散やHealthCheckなどに使う仮想ホストのエンティティ

# Actors

構築にあたり、まずはOIDCの役者を揃えましょう。Front/Backで分離された認証認可設計のためには、少なくとも下記3つのActorが必要になります。

<img src="/images/2022/20221006a/kong-jwt.drawio.png" alt="kong-jwt.drawio.png" width="928" height="501" loading="lazy">

## [Keycloak](https://www.keycloak.org/) as OpenID Provider (Authorization Server)

https://www.keycloak.org/getting-started/getting-started-docker

中心となる認可サーバはOSSのKeycloakを使いましょう。ID管理、トークンや証明書の発行&管理、認証画面提供などの役割があります。
今回は上記リンク通り、Dockerを利用して構築します。Client設定は下記のVueの設定に従いましょう。
Keycloak構築はチュートリアル通りで問題ないので、詳細な実装方法は省略します。

## [Vue](https://vuejs.org/) as Relying Party (Client)

https://www.keycloak.org/securing-apps/vue

FrontendとなるClientはVueを使います。認証後トークンの保持&リフレッシュ、APIサーバへリクエストを送ったりします。
今回はVueを使いますが、[keycloak-js](https://www.npmjs.com/package/keycloak-js)さえ組み込めば、どのFrameworkでもかんたんにRelyingPartyを作ることができます。
Keycloak同様リンク通り実装すれば問題ないので、詳細は省略します。

## [Kong](https://konghq.com/) as Resource Server (API Server, Backend Service)

https://mockbin.org/

今回の保護対象となるResourceServerは、Gatewayとして前段に位置するKongと本丸となるBackend Service (API Server)に構成されます。Backend ServiceとしてはKongのチュートリアルで使われる[Mockbin](https://mockbin.org/)をそのまま使います。

# Kongの構築

https://docs.konghq.com/gateway/latest/install/

まずはKongをインストールします。Dockerなど便利なオプションもあるので好きな方法でインストールしましょう。
Kongは設定の保存先としてDBを使うのでPostgreSQLもインストールが必要です。

Kongはデフォルトで

- Port 8001：あらゆるエンティティ設定を行うのAdminAPI
- Port 8000：実際トラフィックをさばくProxy

に分かれています。

## Service & Routing

https://docs.konghq.com/gateway/latest/get-started/services-and-routes/

次にKongとBackendServiceとなるMockbinをつないで、KongのURLにアクセスするとMockbinのレスポンスが出るようにします。

```sh
curl -i -s -X POST http://localhost:8001/services \
  --data name=example_service \
  --data url='http://mockbin.org'
curl -i -X POST http://localhost:8001/services/example_service/routes \
  --data 'paths[]=/mock' \
  --data name=example_route
```

上記のように設定することでKongの`/mock`へのアクセスが、Mockbinの`/`にProxyされるようになります。

```sh
curl -X GET http://localhost:8000/mock/requests
```

そうすると上のようなCurlでMockbinのAPIパスである`/requests`のレスポンスが取得できます。

# APIを保護する

ここまで下準備が整ったところで、本題である認証機能実装に入ります。
ClientからのリクエストはBearerTokenとしてKeycloakが発行したJWTを乗せないと拒否するようにしたいので、トークンを検証するためにKong公式の[JWTプラグイン](https://docs.konghq.com/hub/kong-inc/jwt/)を使います。

```sh
curl -X POST http://localhost:8001/plugins -d "name=jwt"
curl -i http://localhost:8000/mock/requests # 401 Unauthorized
```

今回はJWTプラグインをGlobalに設定しますが、特定のServiceやRouteに限定して設定することも可能です。

## Consumer

次はConsumerの設定です。ConsumerはAPI Clientを表すエンティティですが、今回の場合は特定認可サーバ(Keycloak)に認証済みのユーザ全員を表すために予め設定するものになります。

```sh
curl -X POST http://localhost:8001/consumers -d "username=authorized_user"
```

## JWT Credential

最後にConsumerにJWTを検証するための公開鍵を設定することで、「この検証されたトークンのBearerはこのConsumerで間違いない」ということを認証させるための設定をします。

```sh
curl -X POST http://localhost:8001/consumers/authorized_user/jwt \
-H 'Content-Type: application/json' \
-d '{"key": "http://localhost:8080/realms/{REALM_NAME}",
     "algorithm": "RS256",
     "rsa_public_key": "-----BEGIN PUBLIC KEY-----\nMIIBI...QIDAQAB\n-----END PUBLIC KEY-----"}'
```

### `key`

JWTのペイロード`iss`と同じ値を設定します。
このAPIにアクセスできるユーザ(`authorized_user`)は、みんな同じ認可サーバ(`Issuer`)から発行されたトークンを持ってる(`Bearer`)ことを意味します。

JWTプラグインのデフォルト設定で`config.key_claim_name=iss`となるので、別のClaimの値にしたい場合(例えば`aud`か`azp`など)はAdminAPIの`/plugins/{jwt plug-in ID}`をPATCHなどして変更も可能です。

### `algorithm`

Keycloakでデフォルトで発行するAccessToken(JWT)のアルゴリズムである`RS256`を指定します。
注意するところは、もしこの設定のリクエストで下記の`rsa_public_key`のPEM形式が正しくない場合でも、このフィールドのエラーメッセージが出ます。

### `rsa_public_key`

Keycloakは同じRealmのユーザには同じ公開鍵でJWTを署名しているので、AdminConsoleの`Realm Settings > Keys`から`RS256`の公開鍵をPEM形式でセットします。
一般的にRS256のJWT検証に使われるJWKs Endpointの証明書(`x5c`)と違い、公開鍵であることに注意しましょう。

# 実際リクエストを送ってみる

普通アプリを作るならばここでClientであるVue上でKeycloakから取得したAccessToken(JWT)を`Authorization`ヘッダーに載せ、KongのAPIにアクセスするコードを書くことになります。
しかし、ここではKongの機能を確認するだけでいいので、Vueが保持するKeycloakのインスタンスをダンプさせAccessTokenを取得し、curlを使います。

<img src="/images/2022/20221006a/スクリーンショット_2022-10-06_4.38.57.png" alt="スクリーンショット_2022-10-06_4.38.57.png" width="1200" height="707" loading="lazy">

```sh
curl http://localhost:8000/mock/requests -H "Authorization: Bearer eyJhbGciOiJS..." | jq .
{
    ...
    "headers": {
        ...
        "authorization": "Bearer eyJhbGciOiJS...",
        "x-consumer-username": "authorized_user",
        "x-credential-identifier": "http://localhost:8080/realms/{REALM_NAME}",
        ...
    },
    ...
}
```

そうするとMockbinが受け取ったHeaderを上記のようなレスポンスとして返してくれます。

# 最後に

といった感じで簡単に触ってみましたが、いかがだったでしょうか。

今回は割愛しましたが、`exp`Claimで有効期限をチェックすることも可能ですし、設定の`config.key_claim_name`とプラグインを適用するRoute/Serviceを調整する機能を組み合わせることで認可機能を実装することも可能です。

個人的にはどのアカウントからのリクエストかわかるように、ペイロードの`sub`など一部のClaimを後ろにヘッダーとして流せる機能があったら良かったなとも思いましたが、例えば[こういったカスタムプラグイン](https://docs.konghq.com/hub/yesinteractive/kong-jwt2header/)を組み合わせることでなんとかなりそうです。
