---
title: "HTTP検索条件、GETにするか？POSTにするか？"
date: 2021/05/18 00:00:00
postid: a
tag:
  - HTTP
  - Web
  - WebAPI
  - 設計
  - RFC
category:
  - Infrastructure
thumbnail: /images/2021/20210518a/thumbnail.jpg
author: 真野隼記
lede: "RESTfullとかRESTishな方針でWebAPIの横断検索を設計する際にチーム内で方針について議論したやり取りの備忘記事です。"
---
## はじめに

TIG DXユニット [^1]真野です。

 [^1]: Technology Innovation Group（TIG）は、「最先端、且つ先進的なテクノロジーのプロフェッショナル集団」「プロジェクト品質と生産性の向上」「自社サービス事業の立ち上げ」を主なミッションとする、技術部隊です。DXユニットとはデジタルトランスフォーメーションを推進するチームで、IoTやらMaaSなどのテクノロジーカットでビジネス転換を支援しています。

RESTfullとかRESTishな方針でWebA PIの横断検索を設計する際にチーム内で方針について議論したやり取りの備忘記事です。

注意としてB2C向けなWeb APIを提供するというよりは、主に企業間または企業内部で使われるようなAPIの設計のバイアスがあります。LSUDs（Large Set of Unknown Developers）かSSKDs（Small Set of Known Developers）で言えば、確実にSSKDs脳で記事が書かれています。

## REST API

広く使われているため日本語記事も多数です。[実践RESTful HTTP - InfoQ](https://www.infoq.com/jp/articles/designing-restful-http-apps-roth/) や、[0からREST APIについて調べてみた](https://qiita.com/masato44gm/items/dffb8281536ad321fb08) など良さそうな記事が沢山でてくるの読むと良いでしょう。一般的な設計方法はやや古いですが[Web API: The Good Parts](https://www.oreilly.co.jp/books/9784873116860/)の書籍が短くまとまっているためサクッと目を通す人が多いかなと思います。

## 背景と論点

<img src="/images/2021/20210518a/choice-2692575_640.jpg" alt="アイキャッチ" title="Gerd AltmannによるPixabayからの画像" width="640" height="237" loading="lazy">

やりたいことの背景です。

* **Web APIで横断的な検索条件を指定したい**
  * アプリケーションドメインとしてネストを含む構造化が必要
    * JSONで指定できるようにしたい
* URLのクエリパラメータにすることも考えたが、検索条件だけURLエンコードにするのは特殊すぎるので避けたい
  * あと、最大URL長を超える可能性がゼロではないので避けておきたい
* 既存はRESTishなWeb APIであるため、ここだけgRPCとかGraphQLにするのは状況的に不可

このため、 **検索条件はリクエストボディにJSONで指定する** ことにします。リクエストボディにJSONをもたせること自体は、OpenAPIでも普通に記述できますし一般的でしょう。

その前提で論点として掲題にあるGET/POSTの議論がでてきました。それぞれの主張はです。

1. 実現したいことはデータ取得であるため、**WebのセマンティックスとしてHTTPのGETメソッドを利用** しリクエストボディを付けて指定すべき
2. **HTTP GETメソッドにリクエストボディをもたせるのは違和感がある**。POSTの方がまだ自然ではないか

この話が3年で3回くらい周囲で発生したのでまとめます。

## よくある議論の流れ

それぞれの主張について補足していきます。大体の会話の流れを楽しんで貰えればです。

### GETでリクエストボディを使うことの是非

まずは概念的なあるべき論。

* 検索（参照）の処理なのにPOSTメソッドを利用するのは分かりにくいのではないか？
* 例えば、ElasticsearchはGETメソッドにリクエストボディを指定している（POSTにフォールバックもしています）
  * Issueの[ここ](https://github.com/elastic/elasticsearch/issues/16024)でそれってどうなの？ っていう議論がある
  * GETにリクエストボディを置くこと自体は、実プロダクトでも事例がある
* GETにリクエストボディって、RFCに違反していない？
  * [RFC7231 Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content](https://tools.ietf.org/html/rfc7231)だと、明示的に違反とは書かれていなさそう。GET（とDELETE）でリクエストボディを含めると、実装によってはリクエストが拒否されるかもよという記述
  * 微妙な記述だが、GETにリクエストボディを指定することを禁じているというわけではなさそう

> A payload within a GET request message has no defined semantics;
> sending a payload body on a GET request might cause some existing implementations to reject the request.
> A payload within a DELETE request message has no defined semantics;
> sending a payload body on a DELETE request might cause some existing
> implementations to reject the request.

### 周辺ツールの対応状況

続いて実務的な話へ議論が進むことが多いです。

* そもそもGETにリクエストボディを指定するって、ツールが対応しているの？
  * curlは指定できる
    * `curl -X GET http://localhost:8000/search --data '{"q":"example"}'`
  * VS Codeの[Rest Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) の対応状況
    * 対応している
  * [Postman](https://chrome.google.com/webstore/detail/postman/fhbjgbiflinjbdggehcddcbncdddomop/related)では不可じゃないか？
    * 裏技があるかもしれないけど、GETのときはタブが無効化されていて指定できない
* OpenAPIで指定できるの？
  * OpenAPI Specification v2（Swagger）だと指定可能
    * 少なくてもgo-swaggerのコード生成は対応していそう
  * OpenAPI Specification v3だと仕様的に **不可**
    * `GET, DELETE and HEAD are no longer allowed to have request body because it does not have defined semantics as per RFC 7231.` と書かれている
    * https://swagger.io/docs/specification/describing-request-body/
* ライブラリ対応しているのか？
  * AxiosだとGETでBodyを送ってくれないようだ。[Issue](https://github.com/axios/axios/issues/787)にその話がある
    * フロントエンドがAxiosに依存していると厳しい..
* [GETメソッドでリクエストボディを指定してはいけない(Swift) - Qiita](https://qiita.com/uhooi/items/e82c8d294a8465a3e6f3)
  * iOSがクライアントにいるとマズイかも
* AWSのCloudFrontは[GETリクエストでリクエストボディを含むと403(Forbidden)を返す](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#RequestCustom-get-body)
  * `If a viewer GET request includes a body, CloudFront returns an HTTP status code 403 (Forbidden) to the viewer.` とドキュメントに書いています

概念的なあるべき論が落ち着いた後、GETにリクエストボディの設定は、OpenAPI v3でNGだったり、各種ライブラリで利用不可だったりで茨の道だという結論になりがちです。

私もあるべき論は置いておいて、業務ではPOSTメソッドで検索APIを設計する方向で舵を切るようになりました。

## FAQ

1. GET/POSTの両方用意したら良いのでは？
    * LSUDsとかOSSツールならそれの方が良い気がします
    * SSKDsだと、誤ってGET版を触って動かないんだけどなんで？ とか問い合わせを受けそうなので、利用者側の設計の余地を狭めるためにどっちか片方だけ（POSTだけ）の提供にしたいと思っています

## HTTP SEARCH メソッドの提案がある

2021/05/01時点ではDraftフェーズですが、何度かHTTP SEARCH メソッドの仕様検討があるようです。

簡単に言うと、GETのように参照（検索）の意味を持つSEARCHメソッドで、条件はPOSTのようにリクエストボディに記載できます

* https://tools.ietf.org/html/draft-snell-search-method-02
  * Expiresが2021/03/06なので、もう無効になっているので注意です。過去には00, 01版もあり定期的に検討されていそう
* あまり詳しくないですが、次はこちらのトラッカーで議論がされていそう
  * https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/?include_text=1

SEARCH自体はWebDAV（サーバー上のファイルを読み取りや編集をブラウザ上で行えるようにする仕組み）の[RFC5323](https://tools.ietf.org/html/rfc5323) で存在するので、互換性について検討中とのこと。SEARCHじゃなくてQUERYやFETCHなどにする話もあるらしいです。

* https://httptoolkit.tech/blog/http-search-method/

もし、本当にSEARCHが実現したとすると、この記事であるような議論が出ることもなくなると思いますので期待です。

**2021.11.25追記**

Queryメソッドについて記載がありましたので追記しました。

* [新しいHTTPメソッド、QUERYメソッドの仕様 - ASnoKaze blog](https://asnokaze.hatenablog.com/entry/2021/11/09/231858)

## 結論

* ネストを含む構造化した検索条件の指定は、POSTメソッドで設計しておくのが無難
* Webのセマンティクス的にはGETかもしれないが、エコシステム側が対応していないケースがあり、変なハマりを生む可能性があるので業務では避けたほうが無難
  * GETのフォールバック先でPOSTを用意する、ElasticSearchのようなパターンもありかもしれないが、特にSSKDsなWeb APIの場合はPOSTのみ準備することが良さそう
    * 保守対象のエンドポイントを少しでも減らすのと、下手にGETを用意してツールでハマる利用者もいるかもしれないので
* HTTP SEARCHメソッドの標準化に期待

## 参考

* https://stackoverflow.com/questions/978061/http-get-with-request-body
* https://dev.classmethod.jp/articles/cloudfront-return-403-for-get-method-with-message-body/
