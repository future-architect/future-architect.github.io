---
title: "Cloud Functions+ GoでビッグデータETLするときのコツ"
date: 2022/05/12 00:00:00
postid: a
tag:
  - GCP
  - ETL
  - CloudFunctions
  - サーバーレス
category:
  - Programming
thumbnail: /images/20220512a/thumbnail.png
author: 鈴木崇史
lede: "Google Cloud上の大規模なシステムのとあるログがCloud Storageに溜まっており、それらをBigQueryにロードし、分析したい、ということがありました。このログは未加工のままBigQueryに読み込めるフォーマットではなく、いわゆるETL処理が必要でした。運用面を考慮し利用サービスを増やしたくない、ということで使い慣れたCloud Functionsを使うことにしました。"
---
# はじめに

Google Cloud上の大規模なシステムのとあるログがCloud Storageに溜まっており、それらをBigQueryにロードし、分析したい、ということがありました。このログは未加工のままBigQueryに読み込めるフォーマットではなく、いわゆるETL処理が必要でした。恒常的にいつでもデータ分析したいというわけではなく、必要な時に必要な分だけBigQueryにロードして分析したい、というユースケースなのでバッチETL処理です。

Google CloudでETL処理する場合Dataflowを採用することが一般的かと思いますが、開発言語でGoを使っていること（DataflowのプレビューではApache Beam SDK for Goが使えるようです）や、運用面を考慮すると利用サービスを増やしたくない、ということで使い慣れたCloud Functionsを使うことにしました。ログファイルが大規模なためCloud Functionsの限られたリソースで処理しきるためにちょっと考えることがあったので、ブログにします。

フューチャー技術ブログ内の類似記事としては次のようなものがあります。是非合わせてお読みください。

* [15分の壁を超えて。Lambda分散実行術](/articles/20210601a/)
* [Serverless連載6: AWSのStep FunctionsとLambdaでServelessなBatch処理を実現する](/articles/20200515/)

# 問題設定
Cloud Storageに大量かつ、大きいログファイルが存在していました。それを整形し、BigQueryにバッチ読み込みします。

ログのサイズ感は、
- ファイルサイズは数MiB ~ 数GiB程度で、上限がある。
- ファイル数は約 ~1000件/日
- データサイズは ~500GB/日

ログファイルは、改行区切りテキストデータです。

大量データをCloud Functionsで処理する場合、[メモリ上限やタイムアウト上限](https://cloud.google.com/functions/quotas?hl=ja)が制約になります。加えて[BigQueryの一日あたりのロードジョブ数や、一回当たりの読み込みデータサイズの上限などの割り当て](https://cloud.google.com/bigquery/quotas?hl=ja)も気にしなければなりません。



# Cloud FunctionsをファンアウトさせてETL処理
今回のETL処理の構成を説明していきます。

Cloud Storageからログファイルを取ってきて、テキスト加工する処理は、Cloud FunctionsとPub/Subを使ったファンアウト構成にしました。

<img src="/images/20220512a/CloudFunction_ETL.drawio_(1).png" alt="CloudFunction_ETL" width="616" height="301" loading="lazy">

- 左のCloud Functionsが、Cloud Storageに存在するログファイルのリストを1件ずつPub/Subにpublishします。
- 真ん中のCloud FunctionsはPub/Subをトリガーにして並行に起動させ、ログファイルをダウンロードして加工し、別のCloud Storageにアップロードします。Cloud Functionsの最大同時実行数までスケールさせることができ、同時に多くのログファイルを処理できます。

今回はログファイルのサイズに上限がある前提なので、ファイル分割処理はしなくて済んでます。


最近では、[Cloud Functions 第2世代](https://cloud.google.com/functions/docs/2nd-gen/overview)が発表され、より多くのメモリ（最大16GiB）、タイムアウト（イベントトリガーの場合10分）を設定できるようになりました。できることも広がりますね。

BigQueryへの読み込みはCloud Storageからのバッチ読み込みにしました。Cloud Functionsで並行でBigQueryに書き込むと、処理するファイル数=BigQueryロードジョブ数が多すぎて諸々のBigQueryの割り当てに引っかかる恐れがあったからです。

## 実用上の細かい作り込み
Pub/Subはデフォルトでは[at-least-once配信](https://cloud.google.com/pubsub/docs/subscriber?hl=eg#at-least-once-delivery)、つまりpublishされたデータが複数回配信される可能性があるのですが、今回のジョブは単純なファイル加工処理で冪等なのでOKです。

Cloud FunctionのETL処理の完了を、なんらかの方法で検知しなければならないという課題があります。[こちらのブログ](https://cloud.google.com/blog/ja/topics/developers-practitioners/celebrating-pi-day-cloud-functions)のように、並行実行されているジョブの完了や失敗を管理するテーブルを用意したり、[こちらのブログ](https://cloud.google.com/blog/ja/products/data-analytics/ingesting-data-into-bigquery-using-serverless-spark)のように失敗したジョブを別のPub/Subに公開する、などの方法があるかなと思います。




# Cloud Functinonsの中身のGo実装
Cloud FunctionsにはGoのソースをデプロイしました。並行で起動するCloud Functionsが、メモリを効率よく使いつつタイムアウト内に処理を終えるために考えたことを説明していきます。

## ログファイルは1行ずつ読み込む
ログファイルは改行区切りのテキストファイルなので、Cloud Storageから1行ずつ読み込んで加工し、1行ずつ書き込みます。これによってメモリにログファイル全量を展開せずに済みます。
Cloud Storageからの読み込み、書き込みに使う[storage.Reader, storage.Writer](https://pkg.go.dev/cloud.google.com/go/storage)はio.Reader, io.Writerを満たすので、ファイルへの読み書きと同じように扱えます。
```go
import (
	"bufio"
	"context"
	"fmt"

	"cloud.google.com/go/storage"
)

type PubSubMessage struct {
	Data []byte `json:"data"`
}

func PubSubEntryPoint(ctx context.Context, m PubSubMessage) error {
	logFilePath := string(m.Data) // Pub/Subからログファイルのパスがpushされてくる

	client, err := storage.NewClient(ctx)
	if err != nil {
		return err
	}
	defer client.Close()

	storageReader, err := client.Bucket(LogBucket).Object(logFilePath).NewReader(ctx)
	if err != nil {
		return err
	}

	storageWriter := client.Bucket(TmpBucket).Object(translatedLog).NewWriter(ctx)

	s := bufio.NewScanner(storageReader)
	for s.Scan() {
		line := s.Text() // 1行ずつ読み込む

        // なんらかの加工処理を行う

		fmt.Fprintln(storageWriter, line) // 1行ずつ書き込む
	}

	if err := storageWriter.Close(); err != nil {
		return err
	}
	return nil
}
```

## 文字列の加工は並行処理
読み込んだ行を処理するところは並行で書けます。[sync.errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)を使うと、groutineのエラーハンドリングがしやすいです。
goroutineの数だけメモリを使うのでgoroutineの同時実行数の上限を設定してあげます。これは実際のログの1行分のサイズと、Cloud Functionのメモリ消費量を計測してよしなに決めます。

```go
	s := bufio.NewScanner(storageReader)
	eg := errgroup.Group{}
	limit := make(chan struct{}, 5000) // 同時実行数に制限をかける
	for s.Scan() {
		line := s.Text() // 1行ずつ読み込む
		limit <- struct{}{}
		eg.Go(func() error {
			defer func() {
				<-limit
			}()
			translatedLine, err := translate(line) // なんらかの加工処理を行う
			if err != nil {
				return err
			}
			fmt.Fprintln(storageWriter, translatedLine) // 1行ずつ書き込む
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return err
	}

```


# おわりに
今回はCloud FunctionsでETL処理を実装しましたが、Dataflowや他のETL処理パターンも今後試していきたいです。
かなり大規模なシステムになると、データの規模も大きくなります。当たり前かもしれませんが、**クラウドでも無尽蔵にリソースを使えるわけではなく、諸々の制約、割り当てを気にしなければならないな**、、、ということを意識させられました。

