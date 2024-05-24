---
title: "フューチャーのSwagger（OpenAPI 2.0）規約の紹介"
date: 2023/07/25 00:00:00
postid: a
tag:
  - Swagger
  - OpenAPI
  - チーム開発
  - 設計
  - コーディング規約
category:
  - Programming
thumbnail: /images/20230725a/thumbnail.png
author: 真野隼記
lede: "フューチャーの有志メンバーでSwagger（OpenAPI Specification Version 2.0）のコーディング規約を作りました。"
---

<img src="/images/20230725a/top.png" alt="" width="409" height="11" loading="lazy">

## はじめに

フューチャーの有志メンバーでSwagger（OpenAPI Specification Version 2.0）のコーディング規約を作りました。多少の仕掛り部分はあるものの、ある程度見れるものになってきたので紹介させてください。

<img src="/images/20230725a/example.png" alt="" width="800" height="632" loading="lazy">

[OpenAPI Specification 2.0規約 | Future Enterprise Coding Standards](https://future-architect.github.io/coding-standards/documents/forOpenAPISpecification/OpenAPI_Specification_2.0.html)

※OpenAPI Specification バージョン3系の規約は2023年7月時点で鋭意作成中です。2系のみ先行して公開しました。2系は少し古いのでこれから開発する案件で利用するシーンは少ないかと思いますが、3系に生きる内容も多く含みますので参考にいただけるとです。

内容へのフィードバックは、[Issue](https://github.com/future-architect/coding-standards/issues)か[ツイッター](https://twitter.com/future_techblog)宛にメンションを入れてコメントを貰えると幸いです。

## Swagger（OpenAPI 2.0）とは

[本当に使ってよかったOpenAPI (Swagger) ツール](https://future-architect.github.io/articles/20191008/)から引用します。

Swaggerは、[OpenAPI仕様](https://swagger.io/specification/)（以下OAS）と言われる、REST APIを定義するための標準仕様にもとづいて構築された一連のオープンソースツールです。REST APIの設計、構築、文書化、および使用に役立つ機能を提供します。

提供されている主なツールは次のようなものがあります。

|       Name      |                     Description                    |
|:----------------|:---------------------------------------------------|
| [Swagger Editor](https://editor.swagger.io/)  | OASに則ったAPI仕様を書くためのエディタ             |
| [Swagger UI](https://swagger.io/tools/swagger-ui/)      | OASに則ったAPI仕様からドキュメントを生成するツール |
| [Swagger Codegen](https://swagger.io/tools/swagger-codegen/) | OASに則ったAPI仕様からコードを生成するツール       |

おそらく一般的にSwaggerと呼ばれるのはSwagger 2.0で、これは2014に公開された規約です。Swagger 2.0はOpenAPI 2.0と同義で、OpenAPI 3.0.0には2017年に、3.0.3は2020年に公開されています。

## なぜ作ったか

フューチャーは常に数十の開発プロジェクトが動いており、それぞれの案件内でちょっとした開発規約が作られることもあれば、暗黙的に遵守されるルールもあります。プロジェクトの大小も様々で数名から数百人規模に及ぶこともあり、新卒採用もキャリア採用も活発なので、フレッシュなメンバーも多くジョインしてくれます。

キャッチアップをしやすいように暗黙知を減らし明文化する意味でも、一定ラインの品質を守るためのガイドラインを作る文化があります（大なり小なりどこでもそうだと思いますが）。個人的にも隣のプロジェクトが同じ技術スタックを採用しているのに、マイナールール違いが続出すると辛いので、ベースラインは整えておきたい気持ちが強いです。

OpenAPI についても複数のサービスが稼働済みのプロジェクトで導入されており、標準化していこうよとたまたま2023年の3月に話があがり、知見があるシニアなメンバーや、単純に活動に興味があるジュニアなメンバーで、ナレッジをまとめて作成がスタートしました。

そのため、規約のポリシーとしてはすべての領域に適用するというのではなく、フューチャー社内で需要が大きそうなユースケース（サードパーティ向けに広く開発するWeb APIではなく、限られたクライアントやシステムと連携することや、スキーマファーストであることなど）をターゲットにしています。

## 規約の例

例えば、レスポンスボディの記載で用いる `schema` ですが、この規約では `$ref` での参照を必須としています。直接の記載もSwagger文法上は許容されますが揺れが発生しないようにという意図です。

```yaml
  # OK
  - name: body
    in: body
    required: true
    schema:
      $ref: "#/definitions/PutUserAccount"

  # NG
  - name: body
    in: body
    required: true
    type: object
    required: [user_name, account_type, register_at, point]
    properties:
      user_name:
        type: string
        ...
      account_type:
        type: string
        ...
```

ルールは非常に多く、HTTPメソッドの並び順、各名称のケース（camelCase, PascalCase, snake_case）、API互換性を保つためのパラメータの設定ルールなど多岐に渡ります。

## 今後について

OpenAPI 3系の規約は2023年内（か年明け）に公開を目指したいです。

同時に、この規約に沿ったリンターやフォーマッタも開発していきたいと思っています（むしろそれがメイン目的でもあります）。リンターを作るに当たっては、ルールIDのようなものを採番していく必要があるため、規約の文面も番号ベースに書き直していく可能性があります。

## まとめ

* [Swaggerの規約](https://future-architect.github.io/coding-standards/documents/forOpenAPISpecification/OpenAPI_Specification_2.0.html)を作って公開しました
* OpenAPI 3系に繋がる内容もあるので興味があればフィードバックお願いします
* 3系の規約も作っていくし、リンターやフォーマッターの開発も目指していきます
