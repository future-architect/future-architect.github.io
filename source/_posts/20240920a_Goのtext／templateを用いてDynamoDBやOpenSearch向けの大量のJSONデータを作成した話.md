---
title: "Goのtext/templateを用いてDynamoDBやOpenSearch向けの大量のJSONデータを作成した話"
date: 2024/09/20 00:00:00
postid: a
tag:
  - Go
  - OpenSearch
  - DynamoDB
category:
  - Programming
thumbnail: /images/20240920a/thumbnail.jpg
author: 大江聖太郎
lede: "システムの性能テストを実施する際、テスト用の大量データを投入することがあります。本番相当のデータを入れるために、数千万ないしは数億のデータが必要になる場合もあり、データ生成には一工夫を要します。"
---

<img src="/images/20240920a/top.jpg" alt="" width="659" height="300">

# はじめに

こんにちは、TIG所属の大江です。

性能テストを実施する際、テスト用の大量データを投入する場合があります。本番相当のデータを入れるために、数千万ないしは数億のデータが必要になる場合もあり、データ生成には一工夫を要です。

本記事では、大量データをDynamoDB／OpenSearch Serviceに投入した際、直面した壁と対応を紹介します。

# 投入方針

様々な方法を調査した結果、以下の方法で投入するのが、効率が良いという結論に至りました。

- DynamoDB: [S3インポート機能](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/S3DataImport.HowItWorks.html)
- OpenSearch: [Bulk API](https://opensearch.org/docs/latest/api-reference/document-apis/bulk/)

これらの方法で投入するには、入力データをJSONファイル形式である必要があります。

また、対象システムでは数種のユニークIDを各項目に割り振る必要がありました。

そこで、Goの[text/template](https://pkg.go.dev/text/template)パッケージを使いることにしました。

以下、生成スクリプトでデータ生成した際に直面した課題と解決策を紹介します。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>

※実際に使ったコードではOpenSearch用、DynamoDB用のJSONファイルを作成しましたが、記事の簡略化のためにOpenSearch用のもののみ記載いたします。また実際には1億5千万件のデータを生成しましたが、スクリプト実行時の軽量化のために、本記事のコード上では1万件で処理時間の計測をしています。

</div>

# ダミーデータ生成スクリプト

まず1万件でどの程度の性能になるか計測します。

## 愚直な実装

ユニークなIDの採番として`rx/xid`を用います。テンプレートはシンプルに留めており、おそらく大体の方がこのような実装から始めると思います。

```go main.go
package main

import (
	"fmt"
	"log"
	"os"
	"text/template"
	"time"

	"github.com/rs/xid"
)

type Data struct {
	ItemID    string
	HistoryID string
}

func main() {
	start := time.Now()

	if _, err := os.Create("output/index.json"); err != nil {
		// エラーハンドリング
	}

	outputFile, err := os.OpenFile("output/index.json", os.O_APPEND|os.O_WRONLY, 0666)
	if err != nil {
		// エラーハンドリング
	}
	defer outputFile.Close()

	tpl, err := template.ParseFiles("templates/index.tmpl")
	if err != nil {
		// エラーハンドリング
	}

	dataNum := 10000
	for range dataNum {
		data := Data{ItemID: xid.New().String(), HistoryID: xid.New().String()}
		if err = tpl.Execute(outputFile, data); err != nil {
		// エラーハンドリング
		}
	}

	// 処理時間測定用
	fmt.Printf("処理時間: %s\n", time.Since(start))
}
```

```json templates/index.tmpl
{ "index": { "_index": "indexname" } }
{ "itemId": "{{.ItemId}}", "historyId": "{{.HistoryId}}"}
```

```json output/index.json（生成されたファイル）
{ "index": { "_index": "indexname" } }
{ "itemId": "crgn6i7m4csl5s5c6td0", "historyId": "crgn6i7m4csl5s5c6tdg"}
{ "index": { "_index": "indexname" } }
{ "itemId": "crgn6i7m4csl5s5c6te0", "historyId": "crgn6i7m4csl5s5c6teg"}
{ "index": { "_index": "indexname" } }
{ "itemId": "crgn6i7m4csl5s5c6tf0", "historyId": "crgn6i7m4csl5s5c6tfg"}
…以降1万行繰り返し…
```

```txt
処理時間: 241.1586ms
```

こちらの方法だと1万行に0.25秒で処理を終えることができ、1億5千万件のデータ生成を約1時間で終えられます[^1]。
[^1]: 実際の業務に使用したデータは1データにつきさらに多数の項目を保持するため、さらに時間がかかります

## text/template実装

少しトリッキーな実装ですが、text/templateパッケージのrangeを用いて、テンプレート側でループを回した方が高速かも？と疑問に思ったので試してみます。

rangeはテンプレートに配列を渡し、テンプレート側で受け取った配列データを回してテキストを生成するものです。

```go main.go
// ... 中略 ...

func main() {
	start := time.Now()

	dataNum := 10000

	if _, err := os.Create("output/index.json"); err != nil {
		// エラーハンドリング
	}

	itemIds := make([]string, 0, dataNum)
	historyIds := make([]string, 0, dataNum)
	for range dataNum {
		itemIds = append(itemIds, xid.New().String())
		historyIds = append(historyIds, xid.New().String())
	}
	data := Data{ItemIds: itemIds, HistoryIds: historyIds}

	tpl, err := template.ParseFiles("templates/index.tmpl")
	if err != nil {
		// エラーハンドリング
	}
	outputFile, err := os.OpenFile("output/index.json", os.O_APPEND|os.O_WRONLY, 0666)
	if err != nil {
		// エラーハンドリング
	}
	defer outputFile.Close()

	if err = tpl.Execute(outputFile, data); err != nil {
		// エラーハンドリング
	}

	// 処理時間測定用
	fmt.Printf("処理時間: %s\n", time.Since(start))
}
```

```tpl templates/index.tmpl
{{range $i, $v := $.ItemIds -}}
{ "index": { "_index": "indexname" } }
{ "itemId": "{{index $.ItemIds $i}}", "historyId": "{{index $.HistoryIds $i}}" }
{{end -}}
```

```txt
処理時間: 277.9832ms
```

実行時間は1つ目の愚直な実装版と大差は無く、text/template版が少し遅いかも？という内容でした。どちらも1億5千万件のデータ生成を約1時間で終えられそうだと分かったため、せっかくですのでtext/templateのrangeを使ったコードを採用します。

## 想定外の問題

しかしいざ1億5千万件を生成しようとした際、想定外の問題が生じてしまいました...。それはローカルPCの容量不足です🔥。

1万件でも数GBにも上るテキストファイルが生成されます。1億5千万件のデータでは数TBにのぼり、とてもローカルPCで保存できませんでした。

そこで、Lambda関数を非同期で数万件ずつ複数実行し、そこからS3に直接アップロードする方法を取りました。

### ローカルの容量不足への対応として、AWS Lambda上で動かす

Lambdaの処理の流れとしては以下です。

1.エフェメラルストレージにファイルを生成する
2.生成されたファイルをs3に上げる
3.エフェメラルストレージからファイルを削除する[^2]
[^2]:削除しないとLambdaがウォームスタートした際、前回実行時に作成したファイルが残ってしまっていたため

```go main.go
package main

import (
	"fmt"
	"log"
	"os"
	"text/template"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/rs/xid"
)

type Data struct {
	ItemIDs    []string
	HistoryIDs []string
}

func handler() error {

	// 処理時間測定用
	start := time.Now()

	dataNum := 10000
	itemIds := make([]string, 0, dataNum)
	historyIds := make([]string, 0, dataNum)
	for range dataNum {
		itemIds = append(itemIds, xid.New().String())
		historyIds = append(historyIds, xid.New().String())
	}
	data := Data{ItemIDs: itemIds, HistoryIDs: historyIds}

	tpl, err := template.ParseFiles("templates/opensearch-templates/index.tmpl")
	if err != nil {
		// エラーハンドリング
	}
	outputFile, err := os.OpenFile("output/index.json", os.O_APPEND|os.O_WRONLY, 0666)
	if err != nil {
		// エラーハンドリング
	}
	defer outputFile.Close()

	err = tpl.Execute(outputFile, data)
	if err != nil {
		// エラーハンドリング
	}

	// S3アップロード
	s3Client := s3.New(session.Must(session.NewSession()))

	_, err = s3Client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String("bucketName"),
		Key:    aws.String("objectKey"),
		Body:   outputFile,
	})
	if err != nil {
		// エラーハンドリング
	}

	// アップロードが成功したので、ローカルファイルを削除する
	err = os.Remove(outputFile.Name())
	if err != nil {
		// エラーハンドリング
	}

	// 処理時間測定用
	fmt.Printf("処理時間: %s\n", time.Since(start))
	return nil
}

func main() {
	lambda.Start(handler)
}
```

こちらのLambdaを非同期で実行し、それぞれのLambdaで分割してテストデータファイルを生成することで、無事必要なテストデータを得ることが出来ました。

# データ投入

最後に、S3に生成されたデータをOpenSearch、DynamoDBにそれぞれ投入します。

DynamoDBはコンソールよりS3バケットの対象ディレクトリを指定してインポートします。

OpenSearchに対しては以下のようなシェルを回してBulk APIを実行し、データを投入しました。

```sh bulk_insert.sh
#!/bin/bash
export OPENSEARCH_ENDPOINT=openSearchEndpoint
export OPENSEARCH_USERNAME=username
export OPENSEARCH_PASSWORD=password
export S3_BUCKET=bucketname
export INDEX=indexname
export LOCAL_DIRECTORY=/tmp  # S3から取得したjsonファイルのローカルへの一時保存場所

# S3からファイル名の配列を取得
filenames=$(aws s3 ls s3://${S3_BUCKET}/tmp/created_opensearch_json/${INDEX}/ --recursive | awk '{print $4}')

# ファイルを一つずつ取得してローカルに保存、その後/_bulkコマンドを使って投入
for filename in ${filenames}
do
  echo "Processing File: " ${filename}
  # ファイルをローカルに一時保存
  aws s3 cp s3://${S3_BUCKET}/${filename} ${LOCAL_DIRECTORY}/${filename}
  # /_bulkコマンドによる投入
  curl -u ${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD} -XPOST -H 'Content-Type: application/json' ${OPENSEARCH_ENDPOINT}/_bulk --data-binary @${LOCAL_DIRECTORY}/${filename}
  # ファイルの削除
  rm ${LOCAL_DIRECTORY}/${filename}
done
```

無事1億5千万件のテストデータを投入することができました！

# まとめ

大量のデータを作る、入れるというのはテストの準備段階ですが、意外と骨の折れることの多い作業です。

そんなときの一助になれれば幸いです。
