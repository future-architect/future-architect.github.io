---
title: "GoにおけるAPIドキュメントベースのWeb API開発について登壇しました"
date: 2021/04/27 00:00:05
postid: c
tag:
  - Go
  - TechNight
  - 登壇レポート
  - OpenAPI
  - Swagger
category:
  - Programming
thumbnail: /images/20210427c/thumbnail.png
author: 多賀聡一朗
lede: "TIG 多賀です。2021/3/19 を開催しました。 私は、Goの Web API 開発にて、API ドキュメントベースで開発していることについて話しました。なお、その他の登壇者の資料は [こちら] に公開済みですので、興味があれば参照ください。"
---

<img src="/images/20210427c/top.png" loading="lazy">

## はじめに

TIG 多賀です。

2021/3/19(金)に [【増枠】Future Tech Night #7 〜フューチャーの開発事例と共に学べるGo勉強会〜 - connpass](https://future.connpass.com/event/206387/) を開催しました。 私は、Goの Web API 開発にて、API ドキュメントベースで開発していることについて話しました。
なお、その他の登壇者の資料は [こちら](https://future.connpass.com/event/206387/presentation/) に公開済みですので、興味があれば参照ください。

他の登壇者のレポートはこちらです。

* [Goのフラットパッケージについて登壇しました](/articles/20210427a/)
* [GoでDockerのAPIを叩いてみる](/articles/20210427b/)


## 発表内容

### API ドキュメントベースで Web API 開発 (go-swagger)

<iframe src="https://docs.google.com/presentation/d/1P1ntgrIZ_zYhlxQh8UjV1fBCIIObP-ZJPhm7Dn1yc04/embed?start=false&loop=false&delayms=3000" frameborder="0" width="100%" height="550" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>


ブログで Go の Open API 関連ツールについていくつか記事を書いており、そのまとめ的な内容と実際に案件で使ってみての感想について話しています。

参考記事

* [Go の Open API 3.0 のジェネレータ oapi-codegen を試してみた | フューチャー技術ブログ](/articles/20200701/)
* [go-swaggerを用いたWebアプリケーション開発Tips19選 | フューチャー技術ブログ](/articles/20200630/)
* [WAFとして go-swagger を選択してみた | フューチャー技術ブログ](/articles/20190814/)


### 質問内容

#### Q. Open API 3.0が使えないことで問題などは生じないのですか？

基本 Open API 2.0 で各種周辺ツール(他言語のクライアント生成、フロントエンドの表示等)の利用は問題なくできていました。Open API 2.0 と Open API 3.0 の変換ツール もありますので、ノックアウトになることはない認識です。

[Mermade Swagger 2.0 to OpenAPI 3.0.0 converter](https://mermade.org.uk/openapi-converter)

#### Q. go-swaggerを選ぶ際に、Open API 2.0でも良いと判断するためのポイントなどがあれば教えてください

Open API 3.0 を利用しなければならない要件が他にないかの確認かと思います。 Open API を利用する場合、ドキュメントを書いて終わりではなく、周辺ツールや他の言語と組み合わせて使うようになることが多い印象です。
その際に、他で利用するツールが全て Open API 3.0 必須 で変換コストがかかることで全体のスピード感を損なうのであれば、go-swagger ではなく Open API 3.0 系のツールの利用が良いかと考えています。


#### Q. go-swaggerがOpen API 3.0に対応することはありそうでしょうか?

go-swagger は Open API 3.0 へ対応されない模様です。
以下 issue で言及されていました。

https://github.com/go-swagger/go-swagger/issues/1122#issuecomment-323113089


#### Q. go-swagger のチームメンバーからの評判はどうですか？

そこまで悪くはないかなという印象です。
他言語経験者で Go 初心者の方が開発する際に、コード生成で Handler 周りが出力されるので、細かい部分で詰まることなく開発できていたのかなと思っています。
go-swagger コマンドを開発端末で実行できるように、開発環境をしっかり事前に整備する必要はありました。go-swagger コマンドがうまくインストールできない等の問題は起きて、対応したりしてました。(ちなみに、公式からバイナリ落としてもらうが一番簡単な解決策でした）

#### Q. WAF(Web Application Framework)よりもgo-swaggerのメリットが大きかったでしょうか？ 私ははechoとgo-swaggerで悩んで結局echoにしました。

前提として、go-swagger も WAF としての機能は備えている認識です。
他のブログ記事に、以下の通り記載があり、私自身も同じ理解です。

> go-swaggerがWAF(Webアプリケーションフレームワーク）というのは直感では理解しにくいですが、go-swaggerで生成したサーバサイドのコードは、実質的にechoやginのように多くの機能を持ちます。 例えば、URLのルーティング、入力Validation、クエリパラメータ、フォーム、リクエストヘッダ、リクエストボディなどの 入力modelへのバインディング、HTTPレスポンスコード別のmodelの作成や、Middlewareの設定専用の関数など多くをサポートしていますし、固有のビジネスロジックを書くルールもgo-swaggerの生成したコードによって決められています。

引用: [go-swaggerを用いたWebアプリケーション開発Tips19選 | フューチャー技術ブログ](/articles/20200630/)

あとは、考え方と優先度次第で決めることになるかと思います。

当発表では、「APIドキュメントファースト」ととして考えた結果、go-swagger を利用しているというスタンスになっています。ドキュメントと実装の乖離を防ぐというところに、重きを置いた選定を行い、実際に乖離しないメリットは享受できておりました。
他の WAF との比較はなんとも言えないですが、複数人でフロント・バックエンドを同時進行での開発であったことを考えるとメリットは大きかったかなと思います。

### 発表で話していないこと

* go-swagger 利用がベストの選択肢ではない
    * 今回の発表では、ドキュメントファーストを優先しての選定になっていますので、他の優先項目があればまた違う WAF の選定になったかと思います
    * 個人的な好み的には、生成コードが薄く、中身が読みやすいライブラリのほうが好みです ([go-chi/chi](https://github.com/go-chi/chi) とかですね)
    * ただ、ドキュメントが大事とは考えていて、他の WAF であまり考えられてなかったりするのが疑問だったりします。 Web API って使い手がいないと存在価値がないと思っていますので。
* go-swagger の生成コードは読める人がいたほうが良い
    * 細かい設定(タイムアウト等) を行う際に、生成コードを読んで設定することがありました。生成コードだからといって中身を知らないと思わぬ落とし穴にハマることがあるので、ご注意ください。


## 所感

案件でしっかり使った内容について、アウトプットできて良かったと思っています。

他の WAF を使っての開発案件もやって、利用後の比較もしてみたいですね。

発表をご視聴いただいた方、当記事を最後まで読んでいただいた方、ありがとうございます。
