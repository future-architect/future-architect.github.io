---
title: "Serverless連載5: CloudEventsのGo版SDKをいじってみる"
date: 2020/03/31 09:39:23
postid: ""
tag:
  - サーバーレス
  - Go
  - GoogleCloud
  - CloudFunctions
  - CNCF
category:
  - Programming
thumbnail: /images/2020/20200331/thumbnail.png
author: 村田靖拓
lede: "サーバレス連載企画の第5回はCloudEvents(https://cloudevents.io/)を取り上げたいと思います。CloudEventsとは様々存在するイベントを統一的に扱いたいとの思いから登場した統一仕様です。2019.10.24にCNCF(https://www.cncf.io/)のIncubatorプロジェクトに昇格したらしく、同時にv1.0のSpecificationがリリースされています。"
---

# はじめに

こんにちは、TIG所属の[村田](https://twitter.com/famipapamart)です。

サーバレス連載企画の第5回は[CloudEvents](https://cloudevents.io/)を取り上げたいと思います。

※本記事は2020.03.31時点の情報を元に執筆しています

# CloudEventsとは？

<img src="/images/2020/20200331/photo_20200331_01.png" loading="lazy">

[CloudEvents](https://cloudevents.io/)は様々存在するイベントを統一的に扱いたいとの思いから登場した統一仕様です。
2019.10.24に[CNCF](https://www.cncf.io/)のIncubatorプロジェクトに昇格したらしく、同時にv1.0のSpecificationがリリースされています。

私のチームで開催している勉強会でも取り上げたことがあり、以下はその時の資料です。
https://speakerdeck.com/mura123yasu/cloudevents

今回は実際に公開されているSDKを使って一連のイベントデータのやり取りを実現してみようと思うのですが、SDKはいくつかの言語で公開されています。
>CloudEvents provides SDKs for Go, JavaScript, Java, C#, Ruby, and Python

GitHubを見る限りではGoのSDKが一番開発進んでいるのかなと思ったのと個人的にGo書きたい思いが強いので、今回はGoのSDKを使っていきます。

# 環境とターゲット

| 項目                | バージョン等           |
|:-------------------|:---------------------|
| OS                 | macOS Mojave 10.14.6 |
| go                 | 1.14                 |
| Google Cloud SDK   | 286.0.0              |
| CloudEvents sdk-go | v1.1.2               |

今回は『CloudEvents仕様のメッセージをローカル端末からCloud Pub/Sub経由でCloud Functionsに渡し、個々の値を取り出しプログラムで扱える形にすること』を目的とします。

以下のような形を目指します。

<img src="/images/2020/20200331/d1.png" loading="lazy">

### SDKバージョンについての補足

現在v2は `work in progress` とのことで、今回は雰囲気を掴むためにLatest Releaseの `v1.1.2` のソースコードをいじってみます。

※v1のREADMEには `2020.03.27` を目処にv2リリースを目指すとの記載がありますが、いまも絶賛開発中と思われます。
>We will target ~2 months of development to release v2 of this SDK with an end date of March 27, 2020.

https://github.com/cloudevents/sdk-go/blob/master/README_v1.md

# やってみる

今回書いたソースコードはすべてGitHubにあげていますので必要に応じて参照して頂ければと思います。

* https://github.com/mura123yasu/cloudevents-go-helloworld
* https://github.com/mura123yasu/cloudevents-cloudpubsub-receiver

## まずは、シンプルにローカルで繋げる

まずはローカル端末内で完結する形で実装します。

<img src="/images/2020/20200331/d2.png" loading="lazy">

[公式のリポジトリ](https://github.com/cloudevents/sdk-go/tree/v1.1.2/cmd/samples)にしっかりサンプル実装があるので、それを参考にしつつ進めることができました。

まずはReceiver側の実装です。

```go Reveiver側の実装
package main

import (
	"context"
	"fmt"
	"log"

	cloudevents "github.com/cloudevents/sdk-go"
)

func Receive(event cloudevents.Event) {
	// do something with event.Context and event.Data (via event.DataAs(foo)
	fmt.Printf("Event received.\n====\n%s====\n", event)
}

func main() {
	c, err := cloudevents.NewDefaultClient()
	if err != nil {
		log.Fatalf("failed to create client, %v", err)
	}
	log.Fatal(c.StartReceiver(context.Background(), Receive))
}
```

実処理は `Receive` にて行われていますが、今回は受け取ったイベントを標準出力するのみです。

次にSender側の実装です。

```go Sender側の実装
package main

import (
	"context"

	cloudevents "github.com/cloudevents/sdk-go"
)

func main() {
	event := cloudevents.NewEvent()
	event.SetID("ABC-123")
	event.SetType("com.cloudevents.readme.sent")
	event.SetSource("somesource")
	event.SetData(map[string]string{"hello": "world"})

	t, err := cloudevents.NewHTTPTransport(
		cloudevents.WithTarget("http://localhost:8080/"),
		cloudevents.WithEncoding(cloudevents.HTTPBinaryV1),
	)
	if err != nil {
		log.Fatal("failed to create transport, " + err.Error())
	}

	c, err := cloudevents.NewClient(t)
	if err != nil {
		log.Fatal("unable to create cloudevent client: " + err.Error())
	}

	_, _, err = c.Send(context.Background(), event)
	if err != nil {
		log.Fatal("failed to send cloudevent: " + err.Error())
	}
}
```

`event.SetData` がいわゆるpayloadにあたるデータを詰め込んでいる箇所です。

Receiverを起動してSenderからメッセージを投げてみると...

```sh
$ go run main.go
Event received.
====
Validation: valid
Context Attributes,
  specversion: 1.0
  type: com.cloudevents.readme.sent
  source: somesource
  id: ABC-123
Extensions,
  traceparent: 00-5480757570b54984891dde6df8921bba-6a759fba2b9ee0eb-00
Data,
  {"hello":"world"}
====
```

ちゃんと届きました！ 簡単ですね。

## 次に、Cloud Pub/Sub経由の形に変えてみる

実際にはイベントデータの受け渡しはキューを経由するなどして非同期なやりとりになるかと思います。
というわけで、私が普段GCPを利用しているということもありGCPのCloud Pub/Subを経由する形で実装したいと思います。

<img src="/images/2020/20200331/d3.png" loading="lazy">

まずはReceiverの実装です。

```go Receiver側の実装(Pub/Sub)
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/client"
	cepubsub "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/pubsub"
	pscontext "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/pubsub/context"
	"github.com/kelseyhightower/envconfig"
)

type envConfig struct {
	ProjectID string `envconfig:"GOOGLE_CLOUD_PROJECT"`

	TopicID string `envconfig:"PUBSUB_TOPIC" default:"demo_cloudevents" required:"true"`

	SubscriptionID string `envconfig:"PUBSUB_SUBSCRIPTION" default:"demo_cloudevents_subscriber" required:"true"`
}

type Model struct {
	Sequence int    `json:"id"`
	Message  string `json:"message"`
}

func receive(ctx context.Context, event cloudevents.Event, resp *cloudevents.EventResponse) error {
	fmt.Printf("Event Context: %+v\n", event.Context)
	fmt.Printf("Transport Context: %+v\n", pscontext.TransportContextFrom(ctx))

	data := &Model{}
	if err := event.DataAs(data); err != nil {
		fmt.Printf("Got Data Error: %s\n", err.Error())
	}
	fmt.Printf("Data: %+v\n", data)

	fmt.Printf("----------------------------\n")
	return nil
}

func main() {
	ctx := context.Background()

	var env envConfig
	if err := envconfig.Process("", &env); err != nil {
		log.Fatalf("[ERROR] Failed to process env var: %s", err)
	}

	log.Printf("[INFO] ProjectID: %s", env.ProjectID)
	log.Printf("[INFO] TopicID: %s", env.TopicID)
	log.Printf("[INFO] SubscriptionID: %s", env.SubscriptionID)
	t, err := cepubsub.New(context.Background(),
		cepubsub.WithProjectID(env.ProjectID),
		cepubsub.WithSubscriptionID(env.SubscriptionID))
	if err != nil {
		log.Fatalf("failed to create pubsub transport, %s", err.Error())
	}

	c, err := client.New(t)
	if err != nil {
		log.Fatalf("failed to create client, %s", err.Error())
	}
	log.Println("Created client, listening...")

	if err := c.StartReceiver(ctx, receive); err != nil {
		log.Fatalf("failed to start pubsub receiver, %s", err.Error())
	}
}
```

GCPサービスへアクセスする都合上環境変数からの値の取得やその取り回しがありますが、大枠は先程の実装と同じです。
先程はクライアント作成時に `NewDefaultClient` を呼んでいましたが、今回はPub/Subを利用するため専用のtransportを作成してそれを引数に渡す形でクライアントを `New(transport)` しています。

ちょうど該当するソースコードは以下になります。

```go PubSub設定する部分
	t, err := cepubsub.New(context.Background(),
		cepubsub.WithProjectID(env.ProjectID),
		cepubsub.WithSubscriptionID(env.SubscriptionID))
	// ---中略---
	c, err := client.New(t)
```

次にSender側の実装です。

```go Sender側の実装(Pub/Sub)
package main

import (
	"context"
	"log"
	"os"

	cloudevents "github.com/cloudevents/sdk-go"
	cepubsub "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/pubsub"
	"github.com/kelseyhightower/envconfig"
)

type envConfig struct {
	ProjectID string `envconfig:"GOOGLE_CLOUD_PROJECT" required:"true"`
	TopicID   string `envconfig:"PUBSUB_TOPIC" default:"demo_cloudevents" required:"true"`
}

// Basic data struct.
type Model struct {
	Sequence int    `json:"id"`
	Message  string `json:"message"`
}

func main() {
	var env envConfig
	if err := envconfig.Process("", &env); err != nil {
		log.Fatalf("[ERROR] Failed to process env var: %s", err)
	}

	t, err := cepubsub.New(context.Background(),
		cepubsub.WithProjectID(env.ProjectID),
		cepubsub.WithTopicID(env.TopicID))
	if err != nil {
		log.Fatalf("failed to create pubsub transport, %s", err.Error())
	}
	c, err := cloudevents.NewClient(t, cloudevents.WithTimeNow(), cloudevents.WithUUIDs())
	if err != nil {
		log.Fatalf("failed to create client, %s", err.Error())
	}

	event := cloudevents.NewEvent(cloudevents.VersionV1)
	event.SetType("com.cloudevents.sample.sent")
	event.SetSource("github.com/cloudevents/sdk-go/cmd/samples/pubsub/sender/")
	_ = event.SetData(&Model{
		Sequence: 0,
		Message:  "HELLO",
	})

	_, _, err = c.Send(context.Background(), event)
	if err != nil {
		log.Fatalf("failed to send: %v", err)
	}
}
```

こちらも大枠は先程のパターンと変わりませんが、今回ひとつ先程のパターンと異なるのは、やりとりするデータの形式について明示的にstructを定義している点です。(念のため補足ですが、Pub/Subを利用するからそうしているというわけではありません。あくまで変化点という意味です。)

各々ファイルにそれぞれ `Model` を定義してしまっていますが、別ファイルで定義してReceiverとSenderの両方からimportする形で実装するのが望ましい形かなと思います。

では動かしてみましょう。
まずはCloud Pub/SubのTopicおよびSubscriptionを作成します。

```sh TopicとSubscriptionの作成
gcloud pubsub topics create <YOUR PUBSUB TOPIC>
gcloud pubsub subscriptions create <YOUR PUBSUB SUBSCRIPTION> --topic=<YOUR PUBSUB TOPIC>
```

次に、アプリケーションの実行に必要な環境変数を設定します。

```sh 環境変数設定
# required
export GOOGLE_APPLICATION_CREDENTIALS=<YOUR CREDENTIAL>
export GOOGLE_CLOUD_PROJECT=<YOUR GCP PROJECT>
# optional
export PUBSUB_TOPIC=<YOUR PUBSUB TOPIC> # default is "demo_cloudevents"
export PUBSUB_SUBSCRIPTION=<YOUR PUBSUB SUBSCRIPTION> # default is "demo_cloudevents_subscriber"
```

アプリケーションの認証情報については詳しくは[こちら](https://cloud.google.com/docs/authentication/production?hl=ja)を参照してください。

準備が整ったので動かします！

```sh 実行
$ go run main.go
# ---中略---
Event Context: Context Attributes,
  specversion: 1.0
  type: com.cloudevents.sample.sent
  source: github.com/cloudevents/sdk-go/cmd/samples/pubsub/sender/
  id: 89142958-bdb1-4fc9-979a-5c45f6590207
  time: 2020-03-30T16:25:40.473793Z
  datacontenttype: application/json
Extensions,
  traceparent: 00-a31200e4a4b2a5a0d41b5710b5f350bb-a348823d4ab87c62-00

Transport Context: Transport Context,
  ID: 1085540809479288
  PublishTime: 2020-03-30 16:25:41.358 +0000 UTC
  Project: xxxxxxx
  Subscription: demo_cloudevents_subscriber
  Method: pull

Data: &{Sequence:0 Message:HELLO}
----------------------------
```

期待通りにメッセージを受け取ることができました。
GCPコンソールからもメッセージがしっかりPub/Subに届いていたことが確認できます。

<img src="/images/2020/20200331/photo_20200331_02.png" class="img-small-size" loading="lazy">

成功です。

## 最後に、Cloud Pub/Subから先をCloud Functionsに切り替える

さて、Pub/SubキューはCloud Functionsに渡してあげたいと思うのは私だけでしょうか？（求ム、同志）。
というわけでラストは先程Cloud Pub/Subに到達したメッセージをCloud Functionsで受け取りたいと思います。

<img src="/images/2020/20200331/d4.png" loading="lazy">

先程までのReceiverをCluod Functions仕様に書き換えてあげます。また、さっきまでは受け取ったメッセージの中に含まれるpayloadをプログラム上で扱える形にまでparseしきってなかったのでそこも一緒にやりたいと思います。

ということで実装がこちら。

```go CloudFunction実装
package receiver

import (
	"context"
	"encoding/json"
	"fmt"

	"cloud.google.com/go/pubsub"
	cepubsub "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/pubsub"
)

// Model is published data struct.
type Model struct {
	Sequence int    `json:"id"`
	Message  string `json:"message"`
}

// Receiver parse payload to Model
func Receiver(ctx context.Context, msg *pubsub.Message) error {
	fmt.Printf("[INFO] message received: %v\n", msg)
	fmt.Printf("[INFO] message.Attributes: %s\n", msg.Attributes)
	fmt.Printf("[INFO] message.Data: %s\n", msg.Data)

	// convert pubsub.Message to cepubsub.Message
	var cemsg cepubsub.Message
	cemsg.Data = msg.Data
	cemsg.Attributes = msg.Attributes
	fmt.Printf("[INFO] CloudEventsVersion: %s\n", cemsg.CloudEventsVersion())

	// get data(type Model) from cepubsub.Message
	var data &Model
	json.Unmarshal([]byte(cemsg.Data), &data)
	fmt.Printf("[INFO] Model.Sequence: %d\n", data.Sequence)
	fmt.Printf("[INFO] Model.Message: %s\n", data.Message)

	return nil
}
```

Cloud Pub/Subの `Message` 型で受け取った電文を、CloudEventsの `Message` 型に変換し、データの中身を `Model` 型へ変換しています。これにより `Sequence` および `Message` という個々の値を扱える状態にできました。

### CloudEventsのメッセージの取り扱いについての考察

ReceiverとSenderで同一の `Model` を準備してデータをやりとりし合うこと自体は一般的な実装ですが、今回ひとつミソになるのは `pubsub.Message` ⇔ `cepubsub.Message` の変換だと思います。

※Cloud Pub/SubのMessageを `pubsub.Message` 、CloudEventsのMessageを `cepubsub.Message` と表現しています。(以下、同様)

CloudEventsのSDK上ではCloud Pub/Subとやりとりする際の `Message` を以下のように定義しています。

```go CloudEventsSDKのMessage定義
type Message struct {
	// Data is the actual data in the message.
	Data []byte

	// Attributes represents the key-value pairs the current message
	// is labelled with.
	Attributes map[string]string
}
```

https://github.com/cloudevents/sdk-go/blob/v1.1.2/pkg/cloudevents/transport/pubsub/message.go

つまり、CloudEventsの定義する `Event` データがCloud Pub/Subを通過する際には `pubsub.Message.Data` と `pubsub.Message.Attributes` に情報が集約されます。

実際にPub/Subから受け取った電文をそのまま標準出力したものを見てみると、以下のような形になっていました。

```log
&{
    [123 34 105 100 34 58 48 44 34 109 101 115 115 97 103 101 34 58 34 72 69 76 76 79 34 125]
    map[
        ce-datacontenttype:application/json
        ce-id:89142958-bdb1-4fc9-979a-5c45f6590207
        ce-source:github.com/cloudevents/sdk-go/cmd/samples/pubsub/sender/
        ce-specversion:1.0
        ce-time:2020-03-30T16:25:40.473793Z
        ce-traceparent:00-a31200e4a4b2a5a0d41b5710b5f350bb-a348823d4ab87c62-00
        ce-type:com.cloudevents.sample.sent
    ]
    0001-01-01 00:00:00 +0000 UTC {0 0 <nil>} <nil> 0 false <nil>
}
```

`pubsub.Message.Attributes` を標準出力したログでは以下のようにMap情報が確認できました。

```log
[INFO] message.Attributes: map[ce-datacontenttype:application/json ce-id:89142958-bdb1-4fc9-979a-5c45f6590207 ce-source:github.com/cloudevents/sdk-go/cmd/samples/pubsub/sender/ ce-specversion:1.0 ce-time:2020-03-30T16:25:40.473793Z ce-traceparent:00-a31200e4a4b2a5a0d41b5710b5f350bb-a348823d4ab87c62-00 ce-type:com.cloudevents.sample.sent]
```

また、 `pubsub.Message.Data` を標準出力したログでは以下のようにデータの中身が確認できました。

```log
[INFO] message.Data: {"id":0,"message":"HELLO"}
```

私は今回Cloud Pub/Subを利用しましたが、同様な形でCloudEventsが各イベント型の情報とのIFを定義してくれて、実装者はCloudEventsとのIFだけを気にすれば良くなっていくんだろうなと思います。

現在v2は絶賛開発中ですが、たとえば `pubsub.Message` ⇔ `cepubsub.Message` の変換をやってくれるutility的なものがSDKの中に登場するとすごく便利だろうなと思いました。

また、もう一点気になったポイントは以下のように実装されている `CloudEventsVersion` の存在です。

```go CloudEventsVersion
func (m Message) CloudEventsVersion() string {
	// Check as Binary encoding first.
	if m.Attributes != nil {
		// Binary v0.3:
		if s := m.Attributes[prefix+"specversion"]; s != "" {
			return s
		}
	}

	// Now check as Structured encoding.
	raw := make(map[string]json.RawMessage)
	if err := json.Unmarshal(m.Data, &raw); err != nil {
		return ""
	}

	// structured v0.3
	if v, ok := raw["specversion"]; ok {
		var version string
		if err := json.Unmarshal(v, &version); err != nil {
			return ""
		}
		return version
	}

	return ""
}
```

https://github.com/cloudevents/sdk-go/blob/v1.1.2/pkg/cloudevents/transport/pubsub/message.go

これは `cepubsub.Message` の `Attributes` の中から `specversion` を取り出しており、ちょうど以下の `ce-specversion:1.0` にあたる情報を取り出していることになります。

```log
    map[
        ce-datacontenttype:application/json
        ce-id:89142958-bdb1-4fc9-979a-5c45f6590207
        ce-source:github.com/cloudevents/sdk-go/cmd/samples/pubsub/sender/
        ce-specversion:1.0
        ce-time:2020-03-30T16:25:40.473793Z
        ce-traceparent:00-a31200e4a4b2a5a0d41b5710b5f350bb-a348823d4ab87c62-00
        ce-type:com.cloudevents.sample.sent
    ]
```

v1.1.2のSDKでは `specversion` のみの実装ですが、同様の形で `Attributes` からいわゆるメタデータを取り出して処理を行うかあるいは後続にイベントを伝播させるために再度なにかしらのオブジェクトに詰めるかといったことを行うことになるかなと思います。

### ということで動かしてみる

ちょこっと考察を挟みましたが、肝心のプログラム実行がまだでした。
まずはReceiver関数をCloud Functionsにデプロイします。

```sh CloudFunctionsのデプロイ
gcloud functions deploy <YOUR FUNCTION NAME> --project <YOUR GCP PROJECT> \
  --entry-point Receiver \
  --trigger-topic <YOUR PUBSUB TOPIC> \
  --runtime go113
```

Senderは同じものを利用するだけなので新しい準備は不要です。

というわけで実行してみると...

<img src="/images/2020/20200331/photo_20200331_03.png" loading="lazy">
Cloud Functionsのログにてメッセージが届いていることが確認できました！

無事に『CloudEvents仕様のメッセージをローカル端末からCloud Pub/Sub経由でCloud Functionsに渡し、個々の値を取り出しプログラムで扱える形にすること』という目的を達成できました。

# さいごに

今回は主にCloud Pub/Subにフォーカスする形でCloudEventsの実装について紹介させて頂きました。SDKは絶賛開発中なステータスですが、世に蔓延る様々なイベント形式に悩まされる実装者が幸せになれる未来が待っていると思うと非常に楽しみですし、CloudEventsの動向からますます目が離せませんね。

[サーバレス連載](/articles/20200322/)の5本目でした。次は[AWSのStep FunctionsとLambdaでServelessなBatch処理を実現する](/articles/20200515/)です。
