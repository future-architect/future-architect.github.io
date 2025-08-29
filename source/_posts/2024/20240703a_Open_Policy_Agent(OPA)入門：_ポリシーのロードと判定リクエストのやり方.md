---
title: "Open Policy Agent(OPA)入門: ポリシーのロードと判定リクエストのやり方"
date: 2024/07/03 00:00:00
postid: a
tag:
  - OpenPolicyAgent
  - Go
  - Rego
category:
  - Programming
thumbnail: /images/2024/20240703a/thumbnail.png
author: 関靖秀
lede: "Open Policy Agentを実際にどうやって判定をリクエストするのかやポリシーの管理方法についてはまとまった情報が少なかったため、こちらにまとめようと思いました。"
---
# はじめに

こんにちは、関です。

業務で[Open Policy Agent(OPA)](https://www.openpolicyagent.org)に触れる機会があり、公式ドキュメントや関連記事を呼んだのですが、ユースケースやPolicyの記述方法についての説明に比べて、実際にどうやって判定をリクエストするのかやポリシーの管理方法について情報が少なかったため、こちらにまとめます。

# OPAとは？

Open Policy Agent（OPA, オーパと発音）は汎用PolicyEngineで、統一された方法でポリシーによる判定をすることが可能になります。

OPAが担うのは、あくまでポリシーによる意思決定部分で、その決定を適用するのは、OPAに意思決定を依頼する別のソフトウェアなどが行う必要があります。

## そもそもPolicyとは？

ポリシーとは組織の長期的な成功に重要なソフトウェアの振る舞いを支配する一連のルールのことです。

このルールには法的な要請や、技術的な要請、ミスの再発防止などのための重要なナレッジを含みます。もっとも初歩的な形のポリシーは、書かれたものを手運用で適用していたり、組織の文化や暗黙知になります。アプリのロジックや、デプロイ時に静的に設定されることもあります。ソフトウェアサービスそのものにハードコードされていることも多いです。

## Policy as Code

ポリシーをコードとして表現することで、管理、自動化を可能にする考え方です。

ソフトウェア開発のベストプラクティスである、バージョン管理、自動テスト、自動デプロイといった恩恵をポリシーの管理にも適用できます。OPAはRegoという記述言語を用いてポリシーを記述できます。

## Policy decoupling

ポリシーの管理をソフトウェアそのものから分離することをPolicy decouplingと呼びます。これにより、ソフトウェサービスのポリシーを、コンパイルやデプロイなしで変更できるようになります。つまり、ポリシーのデプロイとサービスのデプロイが分離されます。これに伴い、ビジネス要求の変化への適応がしやすくなり、違反の検知能力、ポリシーへの準拠や一貫性の向上、ヒューマンエラーの緩和が実現します。

これは特に、ポリシーに責任を持つ者とソフトウェアサービスの運用・開発者が異なった場合に有効でしょう。例えば、全社横断的に信頼性に責任を負うSREやセキュリティの責任者が、各サービスの言語で書かれたポリシーを全て把握し、変更、適用をするのは非現実的です。ポリシーをOPAで管理できるなら、責任者の持つ権限による適切な管理が実現されるでしょう。

また、OSSなど、ソフトウェアの開発元がポリシーを管理する組織と異なる場合にもうまく機能します。

OPAは、ポリシー管理を必要とするソフトウェアとは別プロセスとしても動作できるので、Policy decouplingを実現できます。

# OPAによるポリシー判定

## 概念的なモデル

ここまでは、ポリシーを主体に、OPAができることを述べてきました。ここでは、OPAによるポリシー判定の流れを概念的に説明します。図にすると以下のようになります。

<img src="/images/2024/20240703a/overview.drawio.png" alt="overview.drawio.png" width="522" height="333" loading="lazy">

OPAは判定リクエストを受け付ける前に、インメモリにPolicyとDataをロードします。Policyは判定に使われるルール群、Dataはポリシーの判定に使われるリクエスト間で共通するデータです。ロードのやり方は別で説明します。Queryは判定リクエストです。この中には、JSONの値（input）と、レスポンスとして受け取りたい項目の指定が含まれています。レスポンスとして受け取りたい項目を指定することで、どのPolicyで評価するかが決まります。Queryを受け取ったOPAは、inputとDataを、レスポンスを構成するために必要なポリシーで評価し、その結果であるDecisionをJSONとして返却します。

## OPAの配布形態と評価をリクエストする際のインタフェース

OPAは、以下の3種類の形態で配布されています。

- コマンドラインツール
- コンテナイメージ
- Goライブラリ

また、OPAに評価を依頼するための主要なインタフェースは以下になります。

- CLI
- HTTP API
- OPA側のプラグイン(著名なものだと、Envoy向けのgRPCサーバ)
- Goライブラリが提供する関数

他にもwasmも使えるようですが、あまり詳しくないので割愛します。

何かしらのツールやサービスが必要とする意思決定をOPAに委譲する際には、配布形態とこれらのインタフェースの組み合わせを考える必要があります。

例えば、REST APIの認可判定で利用する場合は、サイドカーコンテナとしてOPAコンテナを起動し、HTTP APIを使ってリクエストすれば良いでしょう。

Terraformと統合する際には、[Terraform planの実行結果をJSONに変換してコマンドラインから判定を行う方法](https://www.openpolicyagent.org/docs/latest/terraform/)で紹介されているようにコマンドラインツールを用います。

ツール側にプラグインが用意されていて、OPAにリクエストする部分を自前実装しなくて済むようになっていることもあるので、そのツールにプラグインやアドオンが存在しないか確認すると良いです。例を挙げると、DockerやKafkaなどです。[Docker](https://www.openpolicyagent.org/docs/latest/docker-authorization/)にあるようにDockerは、`openpolicyagent/opa-docker-authz-v2`というプラグインを、[Kafka](https://www.openpolicyagent.org/docs/latest/kafka-authorization/)にあるようにKafkaは`Open Policy Agent plugin for Kafka authorization`というプラグインを使います。

プロキシであるEnvoyは少し特殊で、Envoy側が規定するgRPCを使った認可APIを、OPA側が提供するような構成になっています。詳細は、[External Authorization](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ext_authz_filter#external-authorization)を参照してください。

他にも、Goライブラリを使って自作ツールを作り、CI上で利用する方法も取れます。以前当社のブログに載せられた[Policy as Code を実現する Open Policy Agent に憧れて。ポリシーコードでAPI仕様をLintする](https://future-architect.github.io/articles/20200930/)はこの方法を使っています。

# 動作例

[how-to-use-opa](https://github.com/sayshu-7s/how-to-use-opa)に動作例として使えるコードを配置しています。必要に応じて動かしてもらえたらと思います。

## 題材

ここで、ユーザがリソースにアクセスする際の認可を題材にして、OPAに認可判定をリクエストする方法を見てみましょう。

Queryとして、以下のJSONを想定します。

```json
{
    "user": "Alice",
    "resourceId": "resourceA"
}
```

Dataとして、ユーザごとにアクセス可能なresourceIDが存在するとします。

```json
{
    "Alice": ["resourceA"],
    "Bob": ["resourceB"]
}
```

アクセスが許可されるのは、Queryに含まれるuserがアクセス可能なresourceIdであるときのみです。Aliceは、"resourceA"に対するアクセスが可能なので、期待する結果はtrueです。

他の入力と出力の例は以下です。

例1: Aliceが、resourceBにアクセス -> false

```json
{
    "user": "Alice",
    "resourceId": "resourceB"
}
```

例2: Bobが、resourceBにアクセス -> true

```json
{
    "user": "Bob",
    "resourceId": "resourceB"
}
```

## ポリシーとDataの作成、バンドルの準備

まずはポリシーとDataを作成します。ポリシーは[Rego](https://www.openpolicyagent.org/docs/latest/policy-language/)という言語を用います。

多くの場合、ポリシーとDataは`opa build`コマンドを使って、Bundleというアーカイブファイルにまとめられるので、この記事でもBundleを用意することにします。その際、ソースファイルの入っているディレクトリ構成を適切に設計しておく必要があります。特に、ポリシーであるRegoファイルからDataへアクセス方法はディレクトリ構成に依存しており、同じ構成でもbuildコマンドの対象ディレクトリの指定方法を間違えただけで意図した動作をしてくれなくなるので注意が必要です。RegoやBundleについての詳しい解説はここではせず、いつか別記事として書こうと思います。

ここでは、一旦以下のような構成にします。dataは別ディレクトリにしたりとディレクトリ構成には複数の候補がありますが、シンプルさを求めるならこの構成が理解しやすいです。

```txt
policies/
└── example/
    ├── policy.rego
    └── user_resource.json
```

```json user_resource.json
{
  "user_resource": {
    "Alice": ["resourceA"],
    "Bob": ["resourceB"]
  }
}
```

policyの中で利用しやすいように、いきなりオブジェクトを作るのではなく、ファイル名と同じキーを置いた後に目的のオブジェクトを配置しています。このようにすることで、ポリシーファイル中で`data.example.user_resource`のようにしてアクセス可能になります。

```sh policy.rego
package example

import rego.v1

default allow := false

allow if {
    # input.resourceIdが, 辞書からuserをキー取り出した配列の中に含まれていればtrueに評価される.
    input.resourceId in data.example.user_resource[input.user]
}
```

判定リクエストが送られた時、OPAはinputの中にクエリ毎のデータを格納します。input.resourceIdが、先ほどのuser_resourceで管理しているユーザ毎に認可するresourceIdのリストに含まれているかを判定しています。

Bundleを作るには、`opa build`コマンドを使います。以下のコマンドで、bundle.tar.gzとしてBundleが生成されます。

```sh
opa build -o bundle.tar.gz ./policies 
```

## 呼び出し方

少々厄介なことに、OPAは呼び出し方によって渡すJSONのフォーマット、出力のフォーマットが異なります。ここでは各呼び出し方と、出力のフォーマットを見ていきます。

### CLI

CLIで呼び出して即時に結果を受け取るには、`opa exec`コマンドを使う方法と、開発時の動作確認などで便利な`opa eval`コマンドを使う方法があります。

#### opa execコマンドによる呼び出し

入力データを以下のように作ります。

```json input_cli.json
{
  "user": "Alice",
  "resourceId": "resourceA"
}
```

以下のコマンドを呼び出すと、OPAが判定リクエストを処理して結果を返却します。

```sh
opa exec --decision "/example/allow" -b ./bundle.tar.gz  input_cli.json
```

`--decision`オプションでレスポンスとして受け取りたい項目を指定しています。上で作成したpolicy.regoは、`example` packageに属しており、そのうちの`allow`の値を取得したいため、`/example/allow`と指定しています。`-b`オプションでは利用するバンドルを指定し、続いて判定に使う1つ以上のJSONファイルを渡します。

出力結果

```json
{
  "result": [
    {
      "path": "input_cli.json",
      "result": true
    }
  ]
}
```

出力結果はJSONで、`.result`キーに入っています。この中には、呼び出し時に渡したinputのファイルとresultが配列として入ります。

ちなみに、`/example/allow`ではなく、`example`の中身全体を受け取りたい項目として指定することもできます。

```sh
opa exec --decision "/example" -b ./bundle.tar.gz  input_cli.json
```

出力結果

```json
{
  "result": [
    {
      "path": "input_cli.json",
      "result": {
        "allow": true,
        "user_resource": {
          "Alice": [
            "resourceA"
          ],
          "Bob": [
            "resourceB"
          ]
        }
      }
    }
  ]
}
```

`input_cli.json`に対するresultは、辞書隣、`allow`の他に、`user_resource.json`由来の`user_resource`というキーも含まれていることがわかります。

#### opa evalコマンドによる呼び出し

`opa eval`コマンドはより簡易的に使えるコマンドで、`opa exec`コマンドと同じような呼び出し方ができます。ただし、引数の指定方法は異なっており、特にレスポンスの項目指定の方法は、Regoファイル中でデータを参照するときと同じ方式を使う必要があります。以下は、`opa exec`の最初に実行したコマンドと同じ意味を持つコマンドです。

```sh
opa eval -d bundle.tar.gz -i input_cli.json "data.example.allow"
```

出力結果も少し形が変わり、以下のようになります。

```sh
{
  "result": [
    {
      "expressions": [
        {
          "value": true,
          "text": "data.example.allow",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ]
    }
  ]
}
```

`opa eval`コマンドは、bundleの作成をしなくてもビルド対象ディレクトリを直接指定すれば実行できます。このため、開発時の動作確認やちょっとしたお試しで便利です。

```sh
opa eval -d ./policies -i input_cli.json "data.example.allow"
```

## HTTP API

### サーバの起動方法

#### `opa run`コマンドによる起動

`opa run --server`コマンドを使うことで、OPAをHTTP APIとして起動できます。`-b`オプションで利用対象のBundleを指定できます。

```sh
# デフォルトで、0.0.0.0:8181 で公開される。
opa run --server --bundle bundle.tar.gz
# 短縮型
opa run -s -b bundle.tar.gz

# 公開ポートの指定は以下のようにする。
opa run --addr :8080 --server --bundle bundle.tar.gz
# 短縮型
opa run -a :8080 -s -b bundle.tar.gz
```

#### コンテナイメージによる起動

OPAはコンテナイメージとしても配布されています。以下のコマンドで、`opa run --server`コマンドと同等のサーバを起動できます。

```sh
docker run --rm -p 8181:8181 -v ${PWD}/bundle.tar.gz:/bundle.tar.gz openpolicyagent/opa run --server --addr :8181 --bundle /bundle.tar.gz
```

### curlコマンドによる呼び出し例

curlコマンドで、HTTP APIを使った判定リクエストをしてみます。リクエストはPOSTで投げます。CLIからの利用とフォーマットが異なることに注意が必要です。

```json input_api.json
{
  "input": {
    "user": "Alice",
    "resourceId": "resourceA"
  }
}
```

判定リクエストは以下のように投げます。見て分かる通り、レスポンスとして受け取りたい項目は、HTTP APIのパスとして表現されています。今回の場合、`example` packageの`allow`という項目を受け取りたいので、`/v1/data/example/allow`にアクセスしています。

```sh
curl -vX POST -H 'Content-Type: application/json' -d @input-api.json  http://localhost:8181/v1/data/example/allow 
```

レスポンスは以下のようになります。

```json
< HTTP/1.1 200 OK
< Content-Type: application/json
< Vary: Accept-Encoding
< Date: Fri, 21 Jun 2024 03:06:59 GMT
< Content-Length: 16
<
{"result":true}
```

## Goライブラリ

Goのライブラリは2種類あって、高レベルAPIを提供する`sdk`パッケージと低レベルAPIを提供する`rego`パッケージがあります。多くの場合は`sdk`パッケージが有用とされていますが、Bundleやポリシーの読み出し方が限定的だったりと、そこまで使いやすい印象はありませんでした。多くの場合、CLIやHTTP APIで事足りると思うので、詳細は省きます。以下、参考URLです。

- sdk パッケージ(高レベルAPI)
  - [Integrating with the Go SDK](https://www.openpolicyagent.org/docs/latest/integration/#integrating-with-the-go-sdk)
  - [公式ドキュメント](https://pkg.go.dev/github.com/open-policy-agent/opa/sdk)
- rego パッケージ(低レベルAPI)
  - [Integrating with the Go API](https://www.openpolicyagent.org/docs/latest/integration/#integrating-with-the-go-api)
  - [公式ドキュメント](https://pkg.go.dev/github.com/open-policy-agent/opa@v0.65.0/rego)

# PolicyとDataのロード方法

ここまで、ロード済みのポリシーを使った判定リクエストの方法を見てきました。ここでは、ポリシーのロード方法について見ていきます。ポリシーの主要なロード方法は以下の3つです。

- コマンドライン引数による直接指定
- Bundleサーバからのダウンロード
- REST APIによるポリシー・Dataの作成

## コマンドライン引数による直接指定

これまで利用してきた方法がこれになります。追加で述べることはありません。

## Bundleサーバからのダウンロード

Bundleを管理する中で最もポピュラーな方法が、Bundleを配布するWebサーバを作成し、そこからダウンロードする方法です。この方法の利点は、アプリ+OPAのデプロイとポリシーのデプロイが分離され、ポリシーのみを更新できることです。Webサーバの機能としては,[Bundle Service API](https://www.openpolicyagent.org/docs/latest/management-bundles/#bundle-service-api)が指定する方式でBundleファイルを提供できれば問題なく、nginxはもちろんのこと、Amazon S3, Google Cloud Storage, Azure Blob Storageといったオブジェクトストレージにも対応しています。詳細は[Bundles](https://www.openpolicyagent.org/docs/latest/management-bundles/)を参照してください。

ここでは、nginxにバンドルを配置してダウンロードする方法について触れたいと思います。

以下のdocker-compose.yamlで起動したコンテナを題材にしたいと思います。このファイルは[こちら](https://www.openpolicyagent.org/docs/latest/http-api-authorization/#2-bootstrap-the-tutorial-environment-using-docker-compose)を参考に、改修を加えて作成しています。

```yaml
version: "3"
services:
  opa:
    image: openpolicyagent/opa:latest
    ports:
      - 8181:8181
    # WARNING: OPA is NOT running with an authorization policy configured. This
    # means that clients can read and write policies in OPA. If you are
    # deploying OPA in an insecure environment, be sure to configure
    # authentication and authorization on the daemon. See the Security page for
    # details: https://www.openpolicyagent.org/docs/security.html.
    command:
      - "run"
      - "--server"
      - "--config-file"
      - "config.yaml"
      - "--log-format=json-pretty"
    volumes:
      - ./config/config.yaml:/config.yaml
    depends_on:
      - bundle_server
  bundle_server:
    image: nginx:1.20.0-alpine
    volumes:
      - ./bundle.tar.gz:/usr/share/nginx/html/bundles/bundle.tar.gz
```

opaコンテナは以下のconfig.yamlを読み込んでいます。
config.yaml

```yaml
services:
  nginx:
    url: http://bundle_server

bundles:
  nginx:
    service: nginx
    resource: "bundles/bundle.tar.gz"

```

`.services`は、OPAのコントロールプレーンのエンドポイントを表している項目です。Bundleサーバ以外にも、Status APIなどがこの項目を使います。各サービスにアクセスする際に必要な認証に関する設定なども環境変数を利用しながら実施できます。`.bundles`が文字通りBundleの管理先を表していて、`service`でダウンロード先のserviceを指定します。今の場合、nginxを選択しています。また`resource`でダウンロードするBundleを指定しています。

コンテナを起動すると、以下のようなログが出力されるので、Bundleをnginxからダウンロードしていることがわかります。

```txt
opa_1            | {
opa_1            |   "level": "info",
opa_1            |   "msg": "Bundle loaded and activated successfully. Etag updated to \"6673f589-186\".",
opa_1            |   "name": "nginx",
opa_1            |   "plugin": "bundle",
opa_1            |   "time": "2024-06-24T06:13:32Z"
opa_1            | }
```

こちらについても、[how-to-use-opa](https://github.com/sayshu-7s/how-to-use-opa)に入れていますので、お試しいただけたらと思います。

## REST APIによるポリシー・Dataの作成

[Policy API](https://www.openpolicyagent.org/docs/latest/rest-api/#policy-api)を使うことで、ポリシーを動的にCRUDできます。また、[Data API](https://www.openpolicyagent.org/docs/latest/rest-api/#data-api)を使うことで、DataをCRUDできます。Data APIは、判定リクエストを送る際に利用するAPIと共通です。普通のREST APIで、特に難しくないので詳細は公式ドキュメントを見てもらえたらと思います。

# 終わりに

OPAの入門編ということで、簡単なユースケースを題材にして、OPAに判定リクエストを行う方法と、ポリシーやDataをロードする方法についてまとめました。この記事が誰かの役に立てば幸いです。
