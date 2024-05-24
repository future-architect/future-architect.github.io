---
title: "AWS Lambdaの初期化処理と初期化タイミングの考慮不足によるはまりどころ"
date: 2022/06/07 00:00:00
postid: a
tag:
  - AWS
  - 失敗談
  - Lambda
  - TCP
category:
  - Programming
thumbnail: /images/20220607a/thumbnail.png
author: 辻大志郎
lede: "失敗談をテーマにした連載の5本目です。AWS Lambdaで、予約済同時実行数を1に制限して使っていたときに、初期化処理と初期化タイミングの考慮不足により、はまったことがありました。本記事ではLambdaの初期化処理についておさらいした後、はまったケースの事例や原因、対応した方法を紹介します。"
---
こんにちは、TIGの辻です。[失敗談をテーマにした連載](/articles/20220601a/)の5本目です。

AWS Lambda（以下Lambda）は様々なユースケースで利用できる、なにかと便利で強力なサービスです。本ブログでも以下のようにLambdaに関するたくさんの記事が投稿されています。

* [Lambda Function URLs をGoでお試し。実行時間の上限（タイムアウト）やWeb API構築周りで気になること](/articles/20220510a/)
* [Lambda×Go並列処理で100万回APIを呼び出す](/articles/20220516a/)
* [LambdaをカスタムDockerランタイムで開発する方法](/articles/20210914a/)

私もLambdaが好きで、Lambdaの実行時間制約以内で終了する処理であれば、初手の候補の一つとしてLambdaを考えます。

そんなLambdaですが、予約済同時実行数[^5]を1に制限して使っていたときに、初期化処理と初期化タイミングの考慮不足により、はまったことがありました。本記事ではLambdaの初期化処理についておさらいした後、はまったケースの事例や原因、対応した方法を紹介します。

[^5]: https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/configuration-concurrency.html

## Lambdaのライフサイクルと初期化処理

Lambda実行環境のライフサイクルは3つに分かれています。INITとINVOKEとSHUTDOWNです。

<img src="/images/20220607a/Overview-Successful-Invokes.png" alt="Overview-Successful-Invokes.png" width="1200" height="225" loading="lazy">

https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-runtime-environment.html より

INITフェーズでは、関数インスタンス（Lambda関数が実行される環境のこと）作成やハンドラ関数外に実装されている初期化処理が行われます。たとえばGoの場合、AWSのサンプルにある [^2] 以下のような `init()` の処理はINITフェーズで行われます。

[^2]: https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-handler.html

```go
package main

import (
        "log"
        "github.com/aws/aws-lambda-go/lambda"
        "github.com/aws/aws-sdk-go/aws/session"
        "github.com/aws/aws-sdk-go/service/s3"
        "github.com/aws/aws-sdk-go/aws"
)

var invokeCount = 0
var myObjects []*s3.Object
func init() {
        svc := s3.New(session.New())
        input := &s3.ListObjectsV2Input{
                Bucket: aws.String("examplebucket"),
        }
        result, _ := svc.ListObjectsV2(input)
        myObjects = result.Contents
}

func LambdaHandler() (int, error) {
        invokeCount = invokeCount + 1
        log.Print(myObjects)
        return invokeCount, nil
}

func main() {
        lambda.Start(LambdaHandler)
}
```

データベースとの接続などの、実行タイミングに依存しない処理を初期化処理として実施し、グローバル変数として再利用できるようにすることはパフォーマンスの観点から有効です。ハンドラの関数外に宣言されているグローバル変数は、Lambdaの関数インスタンスの一部として保存され、その後のリクエストで再利用されることがあるためです。[^3]

[^3]: https://aws.amazon.com/jp/lambda/faqs/

なお、上のサンプルで `LambdaHandler()` に該当するハンドラ関数内の処理はINVOKEフェーズで実行されます。

## はまりケース

はまりケースでもパフォーマンスを考慮して、TCP通信の確立をLambdaの初期化処理として実装していました。構成はざっくり以下のようなクライアントサーバモデルです。

* 対向システム（サーバ）
  * ある処理を受け付けるサーバがある。スケールアウトはしない
  * サーバ制約上、複数のクライアントから同時に接続することはできない
* Lambda（クライアント）
  * 対向システムとTCP通信して処理を行う
  * 同期呼び出しLambdaである
  * Lambdaは複数起動しても通信確立できないため、予約済同時実行数を1としていた
  * TCP通信するための変数はグローバル変数として宣言し、初期化処理で通信を確立するようにしていた

対向システムの制約と（詳細は割愛しますが）非機能要件上、Lambdaの予約済同時実行数を1で絞ることで、Lambdaが2つ以上同時実行されないようにしている、という点がトリッキーな感じです。[^7]

[^7]: 本ケースでは仕方がなく予約済同時実行数を1と設定しましたが、本来であればこうならないように設計を工夫したいところです。

このとき、ロングランテスト[^8]中に、稀に以下の問題となる事象を観測することがありました。

[^8]: https://e-words.jp/w/%E3%83%AD%E3%83%B3%E3%82%B0%E3%83%A9%E3%83%B3%E3%83%86%E3%82%B9%E3%83%88.html

* あるタイミングで一定時間Lambdaと対向システムのTCP接続が確立できず、処理が失敗する
* 対向システムのサーバは電源断などは起きておらず、通常通り通信できる状態であった
* 通信できなくなるLambda起動の前に、別の関数インスタンスによるTCP通信の初期化処理を行っているログがあった
* 先に通信を確立した関数インスタンスではハンドラ関数内の処理は行われていない

イメージ図は以下になります。

<img src="/images/20220607a/before.png" alt="対向システムが同時接続数が1" width="872" height="462" loading="lazy">

ログから原因は以下のように推測しています。

* Lambdaの予約済同時実行数は1としていたものの、AWS側での関数インスタンスの作成が必ずしも1つとなるわけではない
* なんらかの理由により、Lambdaの実行環境のライフサイクルを管理しているAWS側で関数インスタンスが作成された
* 関数インスタンス作成時にINITフェーズが起動し、意図しないタイミングでTCP通信の確立がなされたが、Lambdaのハンドラ関数は呼び出されなかった
* 先に作成されていた関数インスタンスでTCP接続が確立されていたため、後から作成した別の関数インスタンスではTCP通信を確立できず、実行に失敗した

## 対応

本ケースではTCP通信の確立は初期化処理ではなく、Lambdaハンドラ関数内で行うようにしました。意図しないタイミングで初期化処理が行われ、対向システムと通信が確立されることを防ぐためです。

結果として、この対応以降は同様のTCP通信が確立できなくなる事象は発生しておらず、期待した動作を得ることができました。

<img src="/images/20220607a/after.png" alt="毎回TCPコネクションをオープン・クローズする" width="872" height="462" loading="lazy">

## まとめ

予約済同時実行数を1で動かしていたケースで、Lambdaの初期化処理と初期化タイミングに関するはまった内容を紹介しました。予約済同時実行数を1とするケースはあまりないとは思いますが、このようにトリッキーな状況で動作する場合、特にLambdaの初期化処理と初期化タイミングに注意しましょう。[^6]

[^6]: その他、実行タイミングに依存するデータはLambdaのグローバル変数に保存するべきではない、というような一般的な注意ポイントもありますが、本記事では割愛します。詳細は https://aws.amazon.com/jp/blogs/news/operating-lambda-performance-optimization-part-2/ などを参照ください。

[失敗談連載2022](/articles/20220601a/)の次は、久保さんの[ユーザー要望で要件が増えてく〜アジャイル開発での落とし穴〜](/articles/20220608a/)です。
