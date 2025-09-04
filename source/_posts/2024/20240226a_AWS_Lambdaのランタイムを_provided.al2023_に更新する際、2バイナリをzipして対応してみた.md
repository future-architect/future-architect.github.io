---
title: "AWS Lambdaのランタイムを provided.al2023 に更新する際、2バイナリをzipして対応してみた"
date: 2024/02/26 00:00:00
postid: a
tag:
  - lambda
  - AWS
  - Makefile
  - バージョンアップ
category:
  - DevOps
thumbnail: /images/2024/20240226a/thumbnail.png
author: 真野隼記
lede: "2023年末にAWS Lambda界隈で話題だった「AWS LambdaのGo 1.xランタイムのサポートが2023年12月31日で終了する」への対応を、あまりネットに無い特殊なやり方を採用して行ったので、考え方や実施メモを残します。"
---
## はじめに

TIG真野です。

2023年末にAWS Lambda界隈で話題だった「AWS LambdaのGo 1.xランタイムのサポートが2023年12月31日で終了する」への対応を、あまりネットに無い特殊なやり方を採用して行ったので、考え方や実施メモを残します。

すでに大半のAWS LambdaのGoユーザの方は対応している時期かと思いますが、ご容赦ください。

## AWS LambdaのGo 1.xランタイムのサポート終了について

この影響で、AWS Lambdaにおいて `Go 1.x` のランタイムから `al2023` などに変更し、zipで固めるバイナリ名も `bootstrap` にする必要があります。

以下の記事が参考になります。

* [AWS SAMのGo言語Lambdaアプリケーションのランタイムを更新してみた | DevelopersIO](https://dev.classmethod.jp/articles/how-to-migrate-aws-sam-go-lambda-application/)
* [Migrating AWS Lambda functions from the Go1.x runtime to the custom runtime on Amazon Linux 2 | AWS Compute Blog](https://aws.amazon.com/jp/blogs/compute/migrating-aws-lambda-functions-from-the-go1-x-runtime-to-the-custom-runtime-on-amazon-linux-2/)

ちなみに、更新先は `provided.al2` と `provided.al2023` とで少し悩みましたが、より新しく保守期間も長い、`provided.al2023` を選択しています。作業を年末のギリギリまで引っ張ったメリットかもしれません。AWSのドキュメントも気がつけば `provided.al2023` 推しに変わっていました。

この更新作業の内容自体は通常、 `lambda`（今回のプロダクトで使っていたバイナリ名） を `bootstrap` という名称に変えて、TerraformのLambdaリソースの設定値を書き換えておしまいであるため、さほど難しく無いでしょう。

## 課題

しかし私が担当していたプロダクトでは、数十のLambdaが、Kinesis Data Streams、DynamoDB Streamsなどのイベント着火し、それもそれぞれが24/365で停止タイムがないというものです。

本来であればイベントソースマッピングを無効にし、その間にLambdaランタイムを更新し、イベントソースマッピング再び有効に戻すという手順が必要です。それをせず、直接アプリデプロイ or ランタイム更新すると、そのタイミングでリクエストが来た場合に処理が失敗し、データロストを誘発してしまいかねません。

しかし、上記の方法では以下の面倒臭さがありました。

* 前提として、鮮度が高くデータを処理する必要があり、disableにする時間をなるべく短くする必要がある
* disableしてからアプリ更新、またenableに戻すというような運用順書とその検証する必要がある
* そのような時間制約があるような神経質な作業を年末にやりたくないという、心理的なハードル（※年末に関しては、他の優先度タスクがあり移行作業を後ろ回しにした私の責任です）

## 対応方針

幸い、対象のLambdaリソースを一括デプロイするための、Makefileをテンプレートベースで生成するツールが整えられていたため、これを改修して、`make deploy-prod` するだけでLambdaランタイムのアップデートを行えるようにすることを目指しました。

今回思いついた手段ですが、 Go 1.x で動く`lambda` と `provided.al2023` で動く `bootstrap` という2種類のバイナリをzipで同梱するという方法を取ることにしました。

手はずとしては、次のとおりです。

1. 作業前は `lambda` とうバイナリだけで動く
2. 移行ステップ1で、`lambda`, `bootstrap` の2つのバイナリをデプロイする
    * このとき、ランタイムは `Go 1.x` のままである
    * 利用されるハンドラは `lambda` のままであり、 `bootstarp` は呼ばれない
3. 移行ステップ2で、ランタイムを `provided.al2023` に更新する
    * そのタイミングで利用されるハンドは `bootstrap` になり切り替わる
4. 移行ステップ3では、動作が問題なければ、利用しなくなった `lambda` というバイナリはなくして、 `bootstrap` のみのzipに絞る。これは後々の対応で問題ない

<img src="/images/2024/20240226a/lambda_runtime更新.drawio_(2).png" alt="lambda_runtime更新.drawio_(2).png" width="1200" height="1044" loading="lazy">

ポイントとして、zipに2つのバイナリを同梱しちゃっても、Lambdaとしては問題なく動く（zip時の50MBサイズ上限はありますが、利用するハンドラ以外のバイナリを渡しても問題ありませんでした）。それにより、Lambdaランタイム更新をコマンドで行っても、上モノのzipには新旧両方のランタイムで動くバイナリが存在するため、ダウンタイム無しで切り替え可能になったということです。

## デプロイスクリプト

今回は上記の方針を、Makefileで実施するようにしました。

ビルド、デプロイの流れは次のような流れです。

```Makefile 移行時の特殊対応版
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# build でlambda, bootstrapの2種類のバイナリを作成
build:
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -buildid=" -trimpath -o bin/lambda cmd/lambda/lambda.go
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -buildid=" -trimpath -tags lambda.norpc -o bin/bootstrap cmd/lambda/lambda.go

# zip で lambda, bootstrapを lambda.zip に同梱する
zip: build
	@touch -t 202401010000 bin/lambda bin/bootstrap
	@zip -j -q bin/lambda.zip bin/lambda bin/bootstrap

# deploy-prod では最初に lambda.zip でアプリ更新、その次にランタイムを更新する
# wait function-updated でアプリ更新を待たないとconfigurationが落ちるケースがある
deploy-prod: zip
	aws lambda --profile our_prod update-function-code --function-name prod-example-api \
      --zip-file fileb://bin/lambda.zip | jq -c '{FunctionName, Runtime, Handler, LastModified}'
	aws lambda --profile our_prod wait function-updated --function-name prod-example-api
	aws lambda --profile our_prod update-function-configuration --function-name prod-example-api \
      --runtime provided.al2023 --handler bootstrap | jq -c '{FunctionName, Runtime, Handler, LastModified}'
```

Makefile中のコメント通りですが、いくつか補足します。

* `build` ターゲット
  * `go build` で `lambda`, `bootstrap` の2種類のバイナリを作成します
  * `-tags lambda.norpc` は `provided.al2` などで動かす場合にビルドサイズを下げることができるオプションです。このオプションを無視して、 `go build` を1度だけ呼び出し、コピー＋リネームで対応しても良かったかもしれません
* `zip` ターゲット
  * 2バイナリを同梱し `lambda.zip` を作っています
  * `touch` でバイナリの最終更新日時を固定して、zipのコードハッシュが変化しないようにしています
* `deploy-prod` ターゲット
  * 1つ目の処理で、 `lambda.zip` をデプロイしています
  * 2つ目の処理でアップデート完了までwaitします
  * 3つ目の処理で、Lambdaランタイム更新とハンドラをbootstrapに更新しています
  * Lambdaランタイム更新のコマンドは、何度実行してもエラーにならないので、この形式のまま何度かアプリリリースしても問題ありません

上記の切り替えは1度だけ動かせば、Lambdaランタイムが切り替わるので、その後は次のように記述を戻してOKです。

```Makefile 移行時の特殊対応を取り除いた例
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

build:
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -buildid=" -trimpath -tags lambda.norpc -o bin/bootstrap cmd/lambda/lambda.go

zip: build
	@touch -t 202401010000 bin/bootstrap
	@zip -j -q bin/lambda.zip bin/bootstrap

deploy-prod: zip
	aws lambda --profile our_prod update-function-code --function-name prod-example-api \
      --zip-file fileb://bin/lambda.zip | jq -c '{FunctionName, LastModified}'
```

## 移行してみて

作業手順としては `make deploy-prod` を実行するだけ（※数十のLambdaリソースを一括デプロイするラッパーのようなツールがあったため）ですので、非常に楽でした。慣れた手順で、ダウンタイム無しで切り替えられるため安心感があり、この手順を採用して良かったと思いました。

なお本題ではないですが、Go 1.x からのランタイム切り替えに際して、次のコード書き換えが1点必要でした。

一部のコードで次のようにタイムゾーンを読み込んでいる処理がありました。

```go
jst, _ = time.LoadLocation("Asia/Tokyo")
```

これが次のようなエラーでてしまいました。

```json
{"level":"error",
 "time":"2023-12-26T09:54:01Z",
 "message":"panic catch: time: missing Location in call to Time.Ingoroutine （略）"
}
```

`provided.al2023` ですとタイムゾーン情報をファイルから取れないのですね。対応としては、利用しているタイムゾーンがJSTのみだったため、`jst := time.FixedZone("Asia/Tokyo", 9*60*60)` と単純に書き換えてしのぎました。

この事象がなぜ発生したかは本記事のテーマとは少し外れるため、詳細は [辻さんの記事](https://tutuz-tech.hatenablog.com/entry/2021/01/30/192956) などを参照ください。

それ以外、これといって課題は出ておらず安定しています。

## さいごに

切り替え作業ですが、慣れた手順をそのままで中身のみを拡張するような方式だと、作業中のプレッシャーが格段に減り手順書も作る必要がないほどでしたので非常に楽ができました。zipに2つのバイナリを同梱するのはトリッキーであり、あまり聞かないやり方な気がしますが、覚えておくと今後もなにかの役に立つかもしれません。

本当は`amd64` から `arm64` に切り替えたかったのですが、これについては持ち越し（今回の手順だと対応もできないです）となりました。その場合は、イベントマッピングを無効化するといった手順が必要そうで、少し大変だと感じています。良い切り替えアイデアは絶賛募集中です。
