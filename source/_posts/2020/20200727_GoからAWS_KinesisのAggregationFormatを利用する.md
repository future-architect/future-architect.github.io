---
title: GoからAWS KinesisのAggregationFormatを利用する
date: 2020/07/27 00:00:00
postid: ""
tag:
  - AWS
  - Go
  - サーバーレス
  - Lambda
  - IoT
  - Kinesis
category:
  - Programming
thumbnail: /images/20200727/thumbnail.png
author: 真野隼記
lede: "[サーバレス連載企画]の8回目です。TIG DXユニットの真野です。ここ数年は産業向けのIoT（例えば工場IoTやモビリティIoT）を行っています。[工場をハックするための基本知識] の記事を書いた棚井さんと同じチームに所属しています。[サーバレス連載企画] の第8弾目として、Serverlessの代表格であるAWS LambdaでGoを用いてKinesisに対するKPL/KCL相当の処理についてまとめていきます。"
---
[サーバレス連載企画](/articles/20200322/)の8回目です。

# はじめに

TIG DXユニットの真野です。ここ数年は産業向けのIoT（例えば工場IoTやモビリティIoT）を行っています。[工場をハックするための基本知識](/articles/20191023/)や[PyConJP 2019に登壇しました](/articles/20200422/) の記事を書いた栗田さんや、[SORACOM USBドングルの自動接続](/articles/20191201/) の記事を書いた棚井さんと同じチームに所属しています。

[サーバレス連載企画](/articles/20200322/) の第8弾目として、Serverlessの代表格であるAWS LambdaでGoを用いてKinesisに対するKPL/KCL相当の処理についてまとめていきます。


# 背景

某IoTをテーマとした案件で、Kinesisを用いたストリーミングETLなパイプラインを構築するにあたって、下図のようにKinesisの後段はGoとLambdaを採用しました。Kinesisが多段になっているのは、Rawデータと加工済みデータを別システムで利用したかったためです。

<img src="/images/20200727/serverless-kinesis-aggregate-format.png" loading="lazy">

最初にKinesisにPublishするECSはJavaのKPL（Kinesis Producer Library）を用いており、当然Aggregation Format(後述します)を利用していますが、後続のGoアプリでレコードを **DeAggregation** する処理と、後続のKinesisへの再度レコードを **Aggregation** する方法があまり見当たらなかったので、実装例を残します。

このエントリーで記載しているコードは以下のリポジトリに記載しています。

https://github.com/laqiiz/go-kinesis-aggr-example

# Kineis Data Streamとは

> Amazon Kinesis Data Streams (KDS) は、大規模にスケーラブルで持続的なリアルタイムのデータストリーミングサービスです。(中略) 収集データはミリ秒で入手でき、リアルタイム分析をリアルタイムダッシュボードやリアルタイム異常検知、ダイナミックな価格設定などの事例に利用可能です。
> https://aws.amazon.com/jp/kinesis/data-streams/

簡単に言うとAWS上でPub-Subメッセージングを行えるサービスです。Kinesisの文脈ではデータを送信するPublish側をProducer、データを受信するSubscribe側をConsumerと呼びます。SQSとはメッセージを非同期に連携する部分は同じですが、Consumer側をN個配置できるところなどが異なります。


# Kinesis Record Aggregation & Deaggregation

KinesisにはRecord Aggregation（レコードの集約）といった考え方があります。

背景としてKDSへメッセージをProduceするときの課金単位は、[25KBをしきい値とした書き込み数で課金](https://aws.amazon.com/jp/kinesis/data-streams/faqs/)されます。25KBより小さくても同じ料金が課金されるため、レコードのサイズが小さい場合はメッセージを集約することが有効です。同時に、小さくて細かいメッセージを1つのメッセージに集約することで、HTTP リクエスト分のオーバーヘッドが無くせるのでスループットを上げる効果も期待できます。

```doc 集約イメージ
record 0 --|
record 1   |        [ Aggregation ]
    ...    |--> Amazon Kinesis record -->  PutRecords Request
    ...    |
record A --|
```


AWSでこの25KB以下のメッセージを集約するフォーマットは、**KPL Aggregated Record Format**と呼ぶそうです。仕様は以下に記載されていました。

https://github.com/awslabs/amazon-kinesis-producer/blob/master/aggregation-format.md

概要だけまとめると以下のフォーマットです。

* 先頭に4バイトのマジックナンバーは`0xF3 0x89 0x9A 0xC2` がつく
* プロトコルバッファ（proto2）を利用したバイナリフォーマット
* 最後に16バイトのMD5チェックサム

```
0               4                  N          N+15
+---+---+---+---+==================+---+...+---+
|  MAGIC NUMBER | PROTOBUF MESSAGE |    MD5    |
+---+---+---+---+==================+---+...+---+
```

`PROTOBUF MESSAGE` 部分は以下の定義です。Proto を知らない人に補足すると `repeated` はJSONでいう配列を示す宣言です。`AggregatedRecord` でKinesisのパーティションキーを複数宣言するのが特徴的ですね。もし、複数のレコードが同じパーティションキーを指定するとすると、効率よくシリアライズができそうです。

```protobuf
message AggregatedRecord {
  repeated string partition_key_table     = 1;
  repeated string explicit_hash_key_table = 2;
  repeated Record records                 = 3;
}

// SubMessage
message Tag {
  required string key   = 1;
  optional string value = 2;
}

message Record {
  required uint64 partition_key_index     = 1;
  optional uint64 explicit_hash_key_index = 2;
  required bytes  data                    = 3;
  repeated Tag    tags                    = 4;
}
```

細かく説明しましたが、KPL Aggregated Record Formatの構造を知らなくても既存のライブラリを活用すれば利用可能ですのでご安心ください。


## Record Aggregation と PutRecordsの区別

ちょっとややこしいのが、 Kinesisには複数RECORDを一度のリクエストで登録する[PutRecords](https://aws.amazon.com/jp/blogs/aws/kinesis-update-putrecords-api/)というAPIがありますが、 Record Aggregationはそれとは異なります（別の概念なので共存できます）。PutRecordsはあくまで複数のRECORDを1度のリクエストに束ねるものであって、Aggregated Formatは複数メッセージを1メッセージに集約する点が違いです。PutRecordsはHTTP Requestの発行を抑えられる分スループットの向上が期待できる点は、Aggregated Formatと同じですが、メッセージ数は変化ないので料金は同じです。当然別物なのでAggregated FormatのメッセージをPutRecordsもできます。


# 実施方法

[AWS SDK for Go](https://aws.amazon.com/jp/sdk-for-go/) でKinesisに対するProduce/Consumeはできますが、標準ではAggregation/DeAggregationはできません。そのため以下のライブラリを利用します。

* **Aggregation**:  [a8m/kinesis-producer](https://github.com/a8m/kinesis-producer)
* **DeAggregation**: [awslabs/kinesis-aggregation](https://github.com/awslabs/kinesis-aggregation)

DeAggregationに関してはAWSLabのリポジトリを利用できるのでちょっと安心できますね。利用方法は簡単かと言われると？でしたのでここに利用方法を残していきます。


# 利用方法

それぞれのライブラリの利用手順を説明していきます。このエントリーで記載しているコードは以下のリポジトリに記載しています。

https://github.com/laqiiz/go-kinesis-aggr-example


## Aggregate（a8m/kinesis-producer）


最初にコードのサンプルを載せます。

```go 集約側の実装例
import (
	"os"
	"github.com/a8m/kinesis-producer"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/kinesis"
	"golang.org/x/sync/errgroup"
)

var kc = kinesis.New(session.Must(session.NewSession()))

func handle(e events.KinesisEvent) error {
	fmt.Println("【Start Aggregation Lambda】", len(e.Records))

	var pr = producer.New(&producer.Config{
		StreamName: os.Getenv("KINESIS_STREAM"),
		Client:     kc,
	})

	eg := errgroup.Group{}

	pr.Start() // Producer用のgoroutine起動
	eg.Go(func() error {
		for r := range pr.NotifyFailures() {
			return r
		}
		return nil
	})

	for _, r := range e.Records {
		// TODO 取得したレコードに対する何かしらの処理。ここでは単純に集約して終わり
		if err := pr.Put(r.Kinesis.Data, r.Kinesis.PartitionKey); err != nil {
			return err
		}
	}
	pr.Stop() // 送信中のレコードのflushと、Producer goroutineの停止

	return eg.Wait()
}
```

フィールドで初期化しているのが、Kinesis Producerのクライアントです。`handle`関数内部がややこしいですが、最初にRecord Aggregation用のProducerを生成し、`pr.Start()` で内部で用いるgoroutineを起動、その後にProducerが出すかも知れないerrorを検知するための `goroutine` を `errgroup` を利用して起動させます。ちょっとややこしいですが、これを最初に行わないと、エラーを取りこぼす可能性があります。ProducerはStopしたあとにStartしてもchannelを内部でcloseしていたりするので上手く動きませんでした。

`Producer` に対するPut処理ですが、今回はLambdaだということと、他のデータストアへの書き込みもしないこともあり同期的に行っています。

最後に `pr.Stop()` を呼びgoroutineを停止させて、同時に処理中レコードをflushさせます。これを呼び忘れるとFlushされる間隔より前にLambda関数が停止してしまい、エラーは発生しないけどKinesisに送信されていないことが発生する恐れがあります。`pr.Stop` は **errgroupの待受より前に** 呼び出したいので、`defer` は利用していません。

これをGoでLambdaを利用するときのお作法通りにmain関数から呼び出せば完了です。

```go
func main() {
	lambda.Start(handle)
}
```

これでGoでLambdaでもKinesisへRecord Aggregationが行えます。


## DeAggregate(awslabs/kinesis-aggregation])

awslabs/kinesis-aggregationを利用します。この時、Lambdaの引数として渡される `events.KinesisEvent` の型と、deaggregatorが求める方が異なるため、自分で型の詰め替え作業が必要です（最初のループ分の部分）。そこが最大の山場で、それさえできてしまえば`deagg.DeaggregateRecords`を呼び出して、レコードの集約解除が行われます。

```go 集約解除側の実装例
import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/kinesis"
	deagg "github.com/awslabs/kinesis-aggregation/go/deaggregator"
)

func handle(e events.KinesisEvent) error {
	fmt.Println("【Start DeAggregation Lambda】", len(e.Records))

	krs := make([]*kinesis.Record, 0, len(e.Records))

	for _, r := range e.Records {
		krs = append(krs, &kinesis.Record{
			ApproximateArrivalTimestamp: aws.Time(r.Kinesis.ApproximateArrivalTimestamp.UTC()),
			Data:                        r.Kinesis.Data,
			EncryptionType:              &r.Kinesis.EncryptionType,
			PartitionKey:                &r.Kinesis.EncryptionType,
			SequenceNumber:              &r.Kinesis.SequenceNumber,
		})
	}

	dars, err := deagg.DeaggregateRecords(krs)
	if err != nil {
		return err
	}

	for _, r := range dars {
		// TODO de-aggregation後レコードに対する処理
		fmt.Println("input", string(r.Data))
	}
	return nil
}
```

これをGoでLambdaを利用するときのお作法通りにmain関数から呼び出せば完了です。

```go
func main() {
	lambda.Start(handle)
}
```

レコード集約の解除処理は、ことKinesisトリガーのLambdaに対しては常に実装しておいても良い気がします。
理由ですが、`deagg.DeaggregateRecords` が集約済み**ではない** レコードに対して実行してもerrorが発生しないためと、最初は集約レコードじゃない入力だったとしても、途中で集約レコードに切り替わったときに急に動かなくなることを防ぐことも出来るからです。（疎通の1件は通ったけど、結合テストで複数レコードを連携しだすと急に落ちた、みたいなことも回避できます）。特にJavaクライアントがKPLを利用している場合は、集約あり/集約無しはあまり意識しないことが多く、事前のすり合わせでは集約しないと行っていたものの、いざ結合テストをする場合に、集約済みメッセージを連携してきたこともありました。


# 動作検証

下図のような環境を構築して動かしてみます。デプロイ方法はリポジトリのREADMEを参考ください。

<img src="/images/20200727/abstract.png" loading="lazy">



最初のKinesisにはawscli経由で3件データを投入します。

```bash テストデータ
aws kinesis --profile my_profile put-record --stream-name aggregate --partition-key 123 --data MTIzNDU2Nzg5MA==
aws kinesis --profile my_profile put-record --stream-name aggregate --partition-key 124 --data MTIzNDU2Nzg5MA==
aws kinesis --profile my_profile put-record --stream-name aggregate --partition-key 125 --data MTIzNDU2Nzg5MA==
```

そうすると、1つ目のLambdaが起動されます。3つのレコードを受け取り、`flushing records reason=drain, records=%!s(int=1)` にある通り、3件が1レコードに集約されて次のKinesisにProduceされました。タイミングによっては1件だったり2件だったりしますが、2件以上であれば動作確認はできます。

```log
2020-05-16T16:59:25.659+09:00 START RequestId: da2b6674-a147-4804-9e6c-5d78f633e426 Version: $LATEST
2020-05-16T16:59:25.664+09:00 【Start Aggregation Lambda】 3
2020-05-16T16:59:25.664+09:00 2020/05/16 07:59:25 starting producer stream=aggregate-test
2020-05-16T16:59:25.664+09:00 2020/05/16 07:59:25 stopping producer backlog=%!s(int=0)
2020-05-16T16:59:25.664+09:00 2020/05/16 07:59:25 backlog drained
2020-05-16T16:59:25.664+09:00 2020/05/16 07:59:25 flushing records reason=drain, records=%!s(int=1)
2020-05-16T16:59:25.690+09:00 2020/05/16 07:59:25 stopped producer
2020-05-16T16:59:25.690+09:00 END RequestId: da2b6674-a147-4804-9e6c-5d78f633e426
```

2つ目のLambdaは、集約されたレコードを1件受け取り、集約解除した結果3つのメッセージを標準出力しています。ダミーで送信したデータの中身は全て同じなので3行同じ内容が表示されています。

```log
2020-05-16T17:01:36.865+09:00 START RequestId: 5f7eb56c-a83c-42c3-927d-0e2703528c6b Version: $LATEST
2020-05-16T17:01:36.870+09:00 【Start DeAggregation Lambda】 1
2020-05-16T17:01:36.870+09:00 input 1234567890
2020-05-16T17:01:36.870+09:00 input 1234567890
2020-05-16T17:01:36.870+09:00 input 1234567890
2020-05-16T17:01:36.870+09:00 END RequestId: 5f7eb56c-a83c-42c3-927d-0e2703528c6b
```

簡単ではありますがAggregation/DeAggregationの動作確認が取れました。

# まとめ

* KPL Aggregated Record Formatを利用することで、Kinesisの利用料金を下げることができる
* GoでLambdaでも、KPL/KCL相当の集約・集約解除は実装できる
* 特にDeAggregateする処理は、後々の予期せぬ連携に備えて防御的に実装しておくと良い

# 参考

* A deep-dive into lessons learned using Amazon Kinesis Streams at scale
  * https://read.acloud.guru/deep-dive-into-aws-kinesis-at-scale-2e131ffcfa08
* KPL の主要なコンセプト
    * https://docs.aws.amazon.com/ja_jp/streams/latest/dev/kinesis-kpl-concepts.html
* KPL Aggregated Record Format
    * https://github.com/awslabs/amazon-kinesis-producer/blob/master/aggregation-format.md

