---
title: "Open API Specification 3.1と気になる仕様策定"
date: 2022/06/22 00:00:01
postid: b
tag:
  - OpenAPI
  - IDL
  - Swagger
category:
  - Infrastructure
thumbnail: /images/20220622b/thumbnail.png
author: 真野隼記
lede: "Open APIは2022.6.21時点では3.1.0が最新です。これまでリリースノートすらウォッチしていなかったので気になったことを調べてまとめました。"
---
# はじめに

TIG DXユニット真野です。[サービス間通信とIDL（インタフェース記述言語）](/articles/20220622a/)連載の1本目です。

Open APIは[go-swaggerを用いたWebアプリケーション開発Tips19選](/articles/20200630/)という記事を過去に書いたこともあり、バージョン2（Swagger）をよく使っていましたしまだ継続してそれらを用いた開発もしています。2022.6.21時点では3.1.0が最新です。これまでリリースノートすらウォッチしていなかったので気になったことを調べてまとめました。

## Open API Specificationとは

[Open API Specification](https://github.com/OAI/OpenAPI-Specification)（公式でもOASと略されます）は、HTTP APIのIDL（インターフェース記述言語）です。HTTP APIということで、いわゆるRESTishなAPIも含みます。エンドポイント（URLのパス）、パラメーター（リクエスト、レスポンスのヘッダ・ボディ）、認証フローなどを標準的に定義でき、そこからコードやAPIドキュメントを生成できて便利です。

今のコミュニティの方向性としてはJSONスキーマの最新Draftバージョンと互換性を保つように設計されています。

[OpenAPIInitiative](https://www.openapis.org/)という組織によって仕様策定が進められ、そこにはGoogle, Microsoft, Oracle, SAP, IBMなどそうそうたる顔ぶれが並んでいます。

なお、定義はYAMLやJSONで行います。


## v2 と v3 の違いについて

我々がよく見るOpen API Specificationのメジャーバージョンは2つあり、v2とv3 があります。2022年時点ですとOpen API Specificationに関連した利用したいツールの対応次第かと思いますが、version 3.0は2017.7.26リリースで5年ほど経過するのでv3を採用するチームが多いのではないでしょうか（3.1との差は次章以降で触れます）。

Version2と3はメジャーバージョンが変わったということで、記述の構成が変わっています。

<img src="/images/20220622b/v2とv3の違い.png" alt="v2とv3の違い" width="1131" height="792" loading="lazy">

※ 図は https://blog.stoplight.io/difference-between-open-v2-v3-v31 より

上図を見ると、v2からSecurityDefinicions、definitions、parameters、responses などがなくなりスッキリしていると思います。これはcomponentsに移動になったからで、これにより再利用性が高まるように設計されました。書いている内容自体はほぼ変わらないので、v2がわかればv3のお作法にもすぐ慣れると思います。

v2ですが以前はSwaggerと呼ばれていました。これがOpen API Specificationのフォーマットとして採用されたため、Swagger ≒ Open API Specification v2 との認識が広がっていると思われます。

ちなみにv1はどこ行った？って思ったんですが、[Swaggerのリビジョン履歴](https://swagger.io/specification/v2/)を見ると、Swagger自体が 1.0から2.0 まで上がっているため、Open API Specificationも2.0からスタートしたと思われます。


| Version | Date       | Notes                                      |
|---------|------------|--------------------------------------------|
| 2.0     | 2014-09-08 | Release of Swagger 2.0                     |
| 1.2     | 2014-03-14 | Initial release of the formal document.    |
| 1.1     | 2012-08-22 | Release of Swagger 1.1                     |
| 1.0     | 2011-08-10 | First release of the Swagger Specification |

Swaggerから Open API Specificationへの切り替えですが、 2015年にSwagger　APIプロジェクトを推進していたSmartBear社が、Linux Foundationに寄贈し、Open API Initiative立ち上げとなったそうです。[^1]

[^1]: https://japan.zdnet.com/article/35073148/ より


## v3.0、v3.1

2017年に3.0.0が出て、2021年2月に待望（？）の3.1.0が出ました。リリースノートは[こちら](https://github.com/OAI/OpenAPI-Specification/releases)。

| Version | Date       | Notes                                            |
|---------|------------|--------------------------------------------------|
| 3.1.0   | 2021-02-15 | Release of the OpenAPI Specification 3.1.0       |
| 3.0.3   | 2020-02-20 | Patch release of the OpenAPI Specification 3.0.3 |
| 3.0.2   | 2018-10-08 | Patch release of the OpenAPI Specification 3.0.2 |
| 3.0.1   | 2017-12-06 | Patch release of the OpenAPI Specification 3.0.1 |
| 3.0.0   | 2017-07-26 | Release of the OpenAPI Specification 3.0.0       |

3.0から3.1はマイナーリリースなので機能追加くらいかなと思っていましたが、けっこう大きな変更があり、4.0にしてはどうかといった議論もあったそうです。最終的にはセマンティックバージョニングの運用をやめることになったそうです[^2]。

[^2]: https://blog.stoplight.io/difference-between-open-v2-v3-v31 より

3.1はJSONスキーマ Draft 2019-09と互換性を持たせていて、JSONスキーマのキーワードを認識するようになったとのこと。私はJSONスキーマ自体をあまり触ったことがないのですが、バージョン毎の対応具合は次のようです。

* OpenAPIv2.0: JSONスキーマの拡張サブセット。JSONスキーマDraft 4との互換性が約80％になる分岐があった
* OpenAPIv3.0: JSONスキーマDraft 5との互換性が90％
* OpenAPIv3.1: JSONスキーマDraft 2019-09と互換性が100%

参考: https://blog.stoplight.io/openapi-json-schema

ちなみに、[3.1.0-rc1](https://github.com/OAI/OpenAPI-Specification/releases/tag/3.1.0-rc1) のリリースノートを見ると、Breaking changesに3点記載されてました。

* Server Variable's `enum` now MUST not be empty (changed from SHOULD).
* Server Variable's `default` now MUST exist in the `enum` values, if such values are defined (changed from SHOULD).
* `responses` are no longer required to be defined under the Operation Object.

他にも、`example` が非推奨になり代わりに `examples` を利用しようよとか、 `type: [string, integer]` みたいに複数の型を指定できるようになったとか、`nullable: true` が `type: [string, "null"]` と書くといった拡張・変更があります。


## 次期バージョンと気になったチケット

リポジトリを見ると[v3.1.1](https://github.com/OAI/OpenAPI-Specification/tree/v3.1.1-dev)と[v3.2.0](https://github.com/OAI/OpenAPI-Specification/tree/v3.2.0-dev) が推進のように見えます。[v3.2.0はマイルストーン](https://github.com/OAI/OpenAPI-Specification/milestone/12)が切られていて、3つのIssueが紐づいていました。また [Post 3.0のラベル](https://github.com/OAI/OpenAPI-Specification/labels/Post%203.0%20Proposal) もあります。

関連Issueを読んでいて面白かった部分を紹介します

### ①[Investigate possibility of removing the constraint that paths must start with "/" #2327](https://github.com/OAI/OpenAPI-Specification/issues/2327)

* パスが`/` 始まりである必要があるかですが、 [#2316](https://github.com/OAI/OpenAPI-Specification/issues/2316) を見ると、OPTIONSメソッドの場合は、`*` の指定も許容するようです。[RFC7231 4.7.3](https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.7)
* https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/OPTIONS#identifying_allowed_request_methods にもSyntaxでかかれれていました。
    * サーバー全体に対して指定するときに用いるようです

```
Syntax
OPTIONS /index.html HTTP/1.1
OPTIONS * HTTP/1.1
```

OPTIONS、CORSのプリフライトリクエストの時に利用されるイメージしかなかったので、ターゲットに `*` できるの知らなかったです。

### ②[Deprecate discriminator? #2143](https://github.com/OAI/OpenAPI-Specification/issues/2143)

discriminatorの廃止議論です。まずdiscriminatorがなにかという話ですが、3.0で追加された Open API Specification独自の機能で、スキーマを切り替えることができます。次が[OpenAPI 3.0ガイドに記載されたInheritance and Polymorphism](https://swagger.io/docs/specification/data-models/inheritance-and-polymorphism/) に記載された例です。レスポンスは `oneOf`によって`Object1`, `Object2`, `sysObject`の3種類が取りうるとしています。このとき、どのスキーマを選択するか `discriminator.propertyName` に記載された `objectType` によって決定することができるます。

```yml
components:
  responses:
    sampleObjectResponse:
      content:
        application/json:
          schema:
            oneOf:
              - $ref: '#/components/schemas/Object1'
              - $ref: '#/components/schemas/Object2'
              - $ref: 'sysObject.json#/sysObject'
            discriminator:
              propertyName: objectType
              mapping:
                obj1: '#/components/schemas/Object1'
                obj2: '#/components/schemas/Object2'
                system: 'sysObject.json#/sysObject'
  #…
  schemas:
    Object1:
      type: object
      required:
        - objectType
      properties:
        objectType:
          type: string
      #…
    Object2:
      type: object
      required:
        - objectType
      properties:
        objectType:
          type: string
      #…
```

例えば、無料ユーザーとプレミアムユーザーでレスポンス項目が微妙に変わる時に、明示的にできるといったメリットがありそうです。

こんなことできるんだ、凄い、良いよねって思いましたが、非推奨（Deprecate）の方向になっています。JSONスキーマとの互換性が理由のようです。互換性がないことでLinterなどの検証に難もあるようです。


### ③[Support for path parameters which can contain slashes #892](https://github.com/OAI/OpenAPI-Specification/issues/892)

パスパラメータにスラッシュ `/` を許容してほしいという要望です。背景としては

* `/resources/123`
* `/resources/123/action`
* `/resources/123/subresources/456`

のように、複数のサブリソースが紐づいている場合に、`/resources/{resourceRef+}` で一括してエンドポイントを定義したいと要望があるようです。Django、Flask、gin、echo、express.jsなど複数のプロダクトが `*` をサポートしているので追随してはどうかという意見もあります。

反対意見としては、他のどのIssueでも共通ですがエコシステムのツールチェーンが対応できるかが1つ要因としてあるそうです。例えば以下が区別できないため何かしらの優先度ベースのわかりやすいアルゴリズムが存在しない限りは難しいという立場です。（これに対しても多くの意見が寄せられています）

* `/{resourceRef+}`
* `/resources/{resourceRef+}`
* `/resources/{resourceRef+}/foo`
* `/resources/{resourceRef+}/foo/bar`
* `/foo{resourceRef+}`
* `/foo{resourceRef+}/bar`
* `/foo/bar/baz`

現状では、`/resources?path=foo/bar/baz` などとするか、個別定義していくかになるので少し大変なので要求が強いのはわかります。なるべく静的に定義したいという気持ちもわかります。仕様策定、、大変ですね。


## まとめ

Open API Specificationの概略と、3.1とそれ以降の議論について簡単に紹介しました。JSONスキーマとの互換性、エコシステムのツールチェーンなどバランスを取って仕様策定する苦悩も伺いしれました。今あるHTTP APIを記述するという用途であれば、すでにさほど困らないかと思いますが、今後の動向もIssueなどを引き続き見ていきたいと思います。

