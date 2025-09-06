---
title: CORSのプリフライトリクエスト（OPTIONメソッド）はAPI Keyの認証なしでOKにしておかないと失敗する話
date: 2020/07/17 00:00:00
postid: ""
tag:
  - Go
  - Web
  - HTTP
  - トラブルシュート
  - CORS
  - WAF
category:
  - Infrastructure
thumbnail: /images/2020/20200717/thumbnail.png
author: 真野隼記
lede: こんにちは、TIG DXユニットの真野です。この技術ブログの運営や、ここ数年は産業向けのIoT（例えば工場IoTやモビリティIoT）を行っています。本エントリーのネタを書くキッカケになったのは、[GCP連載#7 GCPのData Transfer Serviceを使って簡単にS3からBigQueryにデータ転送をしてみる]多芸な加部さんと某IoTな案件のバックエンドの接続テストをしているときに気がついたネタです。
---
# はじめに

こんにちは、TIG DXユニットの真野です。この技術ブログの運営や、ここ数年は産業向けのIoT（例えば工場IoTやモビリティIoT）を行っています。本エントリーのネタを書くキッカケになったのは、[GCP連載#7 GCPのData Transfer Serviceを使って簡単にS3からBigQueryにデータ転送をしてみる](/articles/20200214/)の記事を書いたり、最近は[アイコン作成にまで手を伸ばしている](/articles/20200204/)多芸な加部さんと某IoTな案件のバックエンドの接続テストをしているときに気がついたネタです。

# 記事の概要

記事の内容ですが、[Real World HTTP 第2版はなぜ1.5倍になったのか | Future Tech Blog](/articles/20200421/) で触れられている、以下のCORS周りについて書いていきます。

> **会社のチャットで、CORSのプリフライトリクエスト（OPTIONメソッド）は認証なしでOKにしておかないとCORSのやりとりが失敗する** というのを見て、なるほどぉ、と思ったりもあります。

上記でフンフンそうだよね、って理解された方は本記事の対象レベルを超えているので、生暖かく続きを御覧ください。これだけだとちょっとどういうことがわからいよ！ って人向けに説明していきます。

# CORSとは

CORSとは **オリジン間リソース共有**（Cross-Origin Resource Sharing）の略で、HTTP ヘッダーを使用して、あるオリジンで動作しているウェブアプリケーションに、異なるオリジンにある選択されたリソースへのアクセス権を与えるようブラウザーに指示するための仕組みです。

* (参考)https://developer.mozilla.org/ja/docs/Web/HTTP/CORS

最近はSPAな画面をブラウザで構築することが当たり前になってきていて、バックエンドの通信はJSON形式のWeb API経由で通信することが多いと思いますが、最初のページを取得した **オリジン**  (≒ドメイン＋プロトコル＋ポート番号) と、Web APIのオリジンが異なると、適切な設定なしでは以下のようなエラーメッセージがブラウザに表示されて上手く通信できません。

`'Access-Control-Allo-Origin' header is present on the requested resource.` といったメッセージをブラウザのデベロッパーツールのコンソールで一度は見かけた人も多いのではないでしょうか？

<img src="/images/2020/20200717/thumbnail.png" loading="lazy">

# CORSのプリフライトリクエストについて

もし、Web APIのリクエストに `x-api-key` のようなフィールドを用いて認証を行っている場合は、CORSの仕様では実際のHTTPリクエストを行う前に、 **プリフライトリクエスト** という、 **OPTIONS** メソッドでサーバに要求が行われます。

<img src="/images/2020/20200717/preflight_correct.png" loading="lazy">

[オリジン間リソース共有 (CORS)](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS#Preflighted_requests) から引用

上図ですが、OPTIONSメソッドには、`Origin`、`Access-Control-Request-Method`、`Access-Control-Request-Headers` のリクエストヘッダが含まれ（1番上の矢印）、それに対してサーバ側が`Access-Control-Allow-Origin`にリクエストされたオリジンの値、`Access-Control-Allow-Methods`に先ほどのメソッドを含めた値、`Access-Control-Allow-Headers`に先ほど要求が合ったヘッダの名称を含めてレスポンスする必要があります（2番目の矢印）。上記の条件を満たせば、ブラウザは通常のメインのリクエストをサーバに要求します（3,4番目の矢印）

CORSに対しては、上記のmozillaの記事や、tomoyukilabsさんのQiitaにある[CORSまとめ](https://qiita.com/tomoyukilabs/items/81698edd5812ff6acb34)も網羅的でオススメです。CORSは必ずプリフライトリクエストが飛ぶのではなく、条件によっては「単純リクエスト」と呼ばれる簡易的な認証を行う場合もあるなど細かい仕様は学びがあります。そもそもなんでCORSという決まり事があるかというと、[同一オリジンポリシー](https://developer.mozilla.org/ja/docs/Web/Security/Same-origin_policy)があって、なぜ同一オリジンポリシーが存在するかというと、ユーザーの情報を他サイトに漏れてしまわないようにといったセキュリティ上の理由が上げられます。

# GoでのCORS設定例

GoでCORSの設定をする際は、自前で上記のリクエストヘッダに対応した、レスポンスヘッダを設定すれば良く、net/httpのミドルウェア実装できそうです。というかすでにそういったライブラリが存在します。

* echoだと公式ドキュメントから[リンク](https://echo.labstack.com/middleware/cors)があります
* go-swaggerだと[FAQ](https://github.com/go-swagger/go-swagger/blob/master/docs/faq/faq_documenting.md#how-to-use-swagger-ui-cors) に記載があり、[rs/cors](https://github.com/rs/cors) のライブラリを使った例が記載されてします

```go go-swaggerの実装例
import (
	"github.com/rs/cors"
	"net/http"
)

// go-swaggerの生成先次第だが、configure_xxx.goに実装するならこんな感じ
func setupGlobalMiddleware(h http.Handler) http.Handler {
	myCORS := cors.AllowAll() // 実装例として全OKにしています
	return myCORS.Handler(h)
}
```

`cors.AllowAll()` で、全オリジンを許可、全メソッドを許可、全ヘッダを許可、クレデンシャルはNGになります。今回は社内LAN内で利用されるシステムですが、それでもオリジン、利用するメソッドなど絞り込めるのあれば設定した方が固いとは思います。

さて、これでCORSに関してのサーバサイドの設定はオシマイ、後はフロントエンドからの接続を待つだけ。

...

...

...**🔥🔥そう思っていましたが、上手く動かないという報告😱が上がりました🔥🔥🔥**

# 🔥状況

ブラウザを見ると、確かに`'Access-Control-Allo-Origin' header is present on the requested resource.`のエラーメッセージが表示されていました。明らかにCORS周りが原因です。プリフライトリクエストに対してサーバサイドが想定したレスポンスをしていないと思われます。一方で、ローカルや開発環境でのテストでは問題なくブラウザと疎通が取れている。curlコマンドでも動いてもいました。

```bash curlでも疎通確認した例
# curlで確認した例。OriginヘッダやAccess-Control-Request-Methodヘッダ付きで想定通りか確認
curl -H "Origin:http://example.com" -H "Access-Control-Request-Method:GET" -X OPTIONS -k --dump-header - https://<dev.api.example.com>/v1/health
HTTP/1.1 200 Connection Established
Proxy-Agent: IWSS
Date: Wed, 12 Feb 2020 03:01:20 GMT
HTTP/1.1 200 OK
Date: Wed, 12 Feb 2020 03:01:21 GMT
Content-Length: 0
Connection: keep-alive
Access-Control-Allow-Methods: GET
Access-Control-Allow-Origin: *
Vary: Origin
Vary: Access-Control-Request-Method
Vary: Access-Control-Request-Headers
```

# 切り分け

Chromeブラウザだけかもしれませんが、プリフライトリクエストはデベロッパーツール上からは省略されていて分かりにくいです。これは `chrome://flags/#out-of-blink-cors` で`Out of blink CORS` を Disableにすれば表示できます。

<img src="/images/2020/20200717/image.png" loading="lazy">

また、脳内でブラウザの気持ちになることができるのであれば、先ほどのcurlで適切なリクエストヘッダを付与することでサーバサイドが想定通りか確認できます。

# 原因

上記で色々切り分けていくと、原因はアプリケーションコード側ではなく、**WAF**(ウェブアプリケーションファイアウォール)側にありました。今回の構成は以下のように、連携先のフロントエンド側ごとにAPI Keyを発行して、それをWAFで認証する仕組みでした。私が確認したのは開発環境であり、プロダクションやステージングとは環境差異があったようです。

<img src="/images/2020/20200717/CORSとWAFブログ用.png" loading="lazy">

APIキーは `x-api-key:aZ12kXCqGrZ9QTnqDtid1P6j2J7luB3v`のようなイメージでリクエストヘッダに付与するルールで、これが付与されていないとWAF側でブロックします（403 Forbiddenを返します）。

<img src="/images/2020/20200717/cors_sequence.png" loading="lazy">

プリフライトリクエストをWAFがブロックすのは想定外で、考慮が漏れていました。分かったときは「なるほど！」とちょっと大きな声を上げました。WAFの設定はどちらかと言えばインフラ側のメンバーが設定したのでお互いの考慮が漏れやすいポイントでもあった気がします。

# 解決策

（1）WAF側のルールを変えるか、（2）ブラウザ側でプリフライトリクエスト時にAPI Keyを渡すように設定変更するかを考えました。しかし（2）ですが、XMLHttpRequestでプリフライトするときに任意のリクエストヘッダが追加できるか調べたところ、以下の回答にある通り仕様として不可でした。そのため、（1）のWAF側のルールを変更することになります。

https://stackoverflow.com/questions/58547499/is-it-possible-to-add-a-request-header-to-a-cors-preflight-request

## WAFのルール変更

以下のようにプリフライトリクエストに対応するため、OPTIONSメソッド**も**許可するようにします。

WAFの変更後のルール：

1. Request Heaerに x-api-key が指定の文字列から開始している
2. OPTIONメソッドである
3. 1または2を満たす場合に許可する

今回、WAFはAWS WAFを利用していたので、2のプリフライトリクエストかどうかのチェックは `String and regex match conditions`のフィルターで、HTTP Methodを選択できるため、`Match type`を `Exactly matches`を選択し、Value to matchに `OPTIONS` を設定します。

<img src="/images/2020/20200717/image.png" loading="lazy">

あとは、web ACLに先ほど作成したPreflight-request-checkのルールをAPI Keyのルールに追加し、`Default action`に`Block all requests that don't match any rules` を選択すれば、API Key認証を残しつつ、しかしプリフライトリクエストを受け付けることができます。

この対応で無事Web APIをブラウザが利用できました！

<img src="/images/2020/20200717/68747470733a2f2.png" loading="lazy">

# まとめ

最後までお付き合いいただき、ありがとうございます。ちょっとしたネタでしたが、少しでもReal World HTTPなドタバタが伝わったら幸いです。

* もしCORS周りで問題が起こったら、ブラウザの設定でプリフライトリクエストも表示すると調査が捗る
* リクエストヘッダを利用したAPI Key認証を行う場合、全てのHTTPメソッドを対象にするのではなく、OPTIONSは通しておく
* WAFで上記の認証を行う場合は、そういった除外設定ができるか確認しておく
