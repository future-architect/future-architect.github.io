---
title: "Azure Event Hubs の EventProcessorClientを利用した Consumer 実装"
date: 2021/01/29 00:00:00
postid: ""
tag:
  - Azure
  - Java
category:
  - Infrastructure
thumbnail: /images/2021/20210129/thumbnail.png
author: 多賀聡一朗
lede: "Azure が提供されている Event Hubs の Consumer 処理実装の EventProcessorClient について調査する機会があったため、整理した内容を公開いたします。EventHubs_logo.png> Azure アーキテクチャ アイコン"
---
## 概要

Azure が提供されている Event Hubs の Consumer 処理実装の EventProcessorClient について調査する機会があったため、整理した内容を公開いたします。

<img src="/images/2021/20210129/EventHubs_logo.png" class="img-small-size" loading="lazy">

> [Azure アーキテクチャ アイコン](https://docs.microsoft.com/ja-jp/azure/architecture/icons/) からの画像

## バージョン

実装言語は Java を想定しています。

- azure-sdk-for-java
 	- com.azure:azure-messaging-eventhubs:5.3.1
 	- com.azure:azure-messaging-eventhubs-checkpointstore-blob:1.3.1

## Event Hubs とは

Azure が提供している、大規模データを貯めて配信することが可能な Pub/Sub モデルのマネージドサービスです。

[Azure Event Hubs とは - ビッグ データ インジェスト サービス - Azure Event Hubs | Microsoft Docs](https://docs.microsoft.com/ja-jp/azure/event-hubs/event-hubs-about)

Publisher からメッセージを受けて、 Subscriber(Consumer) へ配信する役割をします。
Event Hubs 構成としては、以下階層構造となっています。

```
namespace
└── event hub
	└── partition
```

まず namespace を作成し、作成したnamespace 内にevent hub を作成、作成したevent hub 内は partition 分割されています。

partition 数は `1 - 32` の間で指定します。

Publisher は namespace と  event hub を指定して、メッセージを送信し、Subscriber も同様にして、メッセージを受信します。

## Offset 管理

Pub/Sub 系のサービスの、Consumer 実装を行う際に、メッセージをどこまで取得したかを管理すること(= offset 管理) が重要になります。
(アプリが突然止まったり、デプロイで停止したりと継続して取れ続けるとは限らないかなと思います。)
Event Hubs では offset は `Consumer group` の `partition` 単位で管理されます。

### Consumer group

Consumer group とは、複数の Consumer をまとめて扱う単位で、Event Hubs 側の設定で作成できます。Consumer group を設定する目的としては、複数の用途別にメッセージ取得をすることがあります。

例えば、メール配信用とSlack配信用で同一 Event Hub から別々に受信処理をしたい場合は、Consumer group Mail と Consumer group Slack と分けて作成することで実現できます。その際、offset 管理を別々に実施しないとメッセージが欠けたり重複したりしてしまいます。

そのため、offset の管理単位として Consumer group が利用されています。
<img src="/images/2021/20210129/azure_eventhubs_consumer_group.png" loading="lazy">

> [Azure アーキテクチャ アイコン-コンシューマーグループ](https://docs.microsoft.com/ja-jp/azure/event-hubs/event-hubs-features#consumer-groups) からの画像

## EventProcessorClient

Consumber group 別の offset 管理を行う実装として、 `EventProcessorClient` が一部 Azure SDK( [azure-messaging-eventhubs](https://github.com/Azure/azure-sdk-for-java/tree/master/sdk/eventhubs/azure-messaging-eventhubs) )にて提供されています。こちらを利用することで、offset 管理をした上で漏れなくメッセージ取得処理を行うことができます。また他のメリットとして、複数台の Consumer 間で負荷を分散して、メッセージを重複することなく、取得する機能も持っています。処理のスケールのため Consumer の台数を増やしたいケースでは、Consumer 間で同じメッセージを取得しないような仕組みづくりが大変ですが、SDK側でよしなにやってくれて便利です。

ちなみに、旧版の`EventProcessorHost` (`azure-eventhubs` )でも同様のことができますが、他 API との実装の一貫性のために新版への移行が推奨されています。([参考](https://github.com/Azure/azure-sdk-for-java/blob/master/sdk/servicebus/azure-messaging-servicebus/migration-guide.md#migration-benefits))

実際の動きとしては、各 Consumer ごとに partition を自動で割り当ててメッセージ取得処理をします。Consumer は 1 つ以上の partition を保持できます。また、Consumer の増減にも対応し自動で再割り振りをしてくれます。注意点として、Consumer と partition が 1対n 対応する都合上、 Consumer と partition が同一数までしかスケールアウトせず、同一数以上に Consumer を増やしても、増やした Consumer はメッセージ受信処理をしません。

### どういった実装になっているのか？

実装としては、 ownership と checkpoint の2つの考え方を利用しています。

ownership は、各 Consumer がどの partition を担当するかを決める役割を担います。checkpoint は、 partition ごとにどの offset までメッセージを取得したかを保存する役割を担います。

Azure SDK (Java) で提供されている実装は、Blob Storage のメタデータを保存先として利用した実装になっています。

[azure-sdk-for-java/BlobCheckpointStore.java at master · Azure/azure-sdk-for-java](https://github.com/Azure/azure-sdk-for-java/blob/master/sdk/eventhubs/azure-messaging-eventhubs-checkpointstore-blob/src/main/java/com/azure/messaging/eventhubs/checkpointstore/blob/BlobCheckpointStore.java)

Blob Storage への Blob の配置先は以下の通りで、partition_id ごとに Blob が作成されます。

```sh
# ownership
az://${Blob名}/${namespace}/${event hub}/${consumer group}/ownership/${partition_id}

# checkpoint
az://${Blob名}/${namespace}/${event hub}/${consumer group}/checkpoint/${partition_id}
```

ownership の担当者ID、 checkpoint の offset値 は Blob のメタデータとして管理されています。

Azure SDK 内で、メタデータ値を参照/更新することで、複数台のConsumer 間で連携して処理を行うことができるようになっています。Azure SDK 側で提供されている処理は Blob Storage を利用していますが、 `Checkpointstore` interface として切り出されているため、他の Storage (S3, GCS, インメモリ) でも実装することは可能です。
[azure-sdk-for-java/CheckpointStore.java at master · Azure/azure-sdk-for-java](https://github.com/Azure/azure-sdk-for-java/blob/master/sdk/eventhubs/azure-messaging-eventhubs/src/main/java/com/azure/messaging/eventhubs/CheckpointStore.java)

#### 対応SDK

- .NET Core
- Java
- Python
- JavaScript

#### Java 実装サンプル

サンプルの実装を記載します。その他、公式でサンプル実装が提供されています。

```java
var eventProcessorClientBuilder = new EventProcessorClientBuilder()
        .connectionString("${Connection String}")
        .checkpointStore(new XXXCheckpointStore())
        .consumerGroup("${consumer group名}")
        .processEvent(eventContext -> {
            // メッセージ取得 成功処理

            log.info("partition={}, sequence number={}, offset={}, body:={}",
                    eventContext.getPartitionContext().getPartitionId(),
                    eventContext.getEventData().getSequenceNumber(),
                    eventContext.getEventData().getOffset(),
                    eventContext.getEventData().getBodyAsString());

            // 10 件に 1回 checkpoint を更新
            if (eventContext.getEventData().getSequenceNumber() % 10 == 0) {
                eventContext.updateCheckpoint();
            }

        }).processError(errorContext -> {
            // メッセージ取得 失敗処理

            log.error("namespace={}, eventhubName={}, consumerGroup={}, partitionId={}",
                    errorContext.getPartitionContext().getFullyQualifiedNamespace(),
                    errorContext.getPartitionContext().getEventHubName(),
                    errorContext.getPartitionContext().getConsumerGroup(),
                    errorContext.getPartitionContext().getPartitionId(),
                    errorContext.getThrowable());
        });

var eventProcessorClient = eventProcessorClientBuilder.buildEventProcessorClient();
// 別スレッドで client が起動
eventProcessorClient.start();
// client を停止
eventProcessorClient.stop();
```

- [azure-messaging-eventhubs](https://github.com/Azure/azure-sdk-for-java/tree/master/sdk/eventhubs/azure-messaging-eventhubs/src/samples/java/com/azure/messaging/eventhubs)
- [azure-messaging-eventhubs-checkpointstore-blob](https://github.com/Azure/azure-sdk-for-java/tree/master/sdk/eventhubs/azure-messaging-eventhubs-checkpointstore-blob/src/samples/java/com/azure/messaging/eventhubs/checkpointstore/blob)

## その他

その他、調査した結果を記載します。

## Apache Kafka との関係

Event Hubs の実装は、 **Kafka ではない** とドキュメントに記載されています。

(用途が似ており、実態はマネージド Kafka だと勘違いしてました。)

https://docs.microsoft.com/ja-jp/azure/event-hubs/apache-kafka-frequently-asked-questions

ただ、Kafka API との互換性があるため、Pub/Sub の実装は Kafka のソースコードを利用できます。

## 接続プロトコル

複数のプロトコル(AMQP, Kafka, HTTPS)に対応していますが、Azure SDKを利用する場合は、AMQP を利用しています。

AMQP 利用時は、ポート 5671 と 5672 を開く必要があります。

参考: [Azure Service Bus と Event Hubs における AMQP 1.0 プロトコル ガイド - Azure Service Bus | Microsoft Docs](https://docs.microsoft.com/ja-jp/azure/service-bus-messaging/service-bus-amqp-protocol-guide)

## 認証・認可方式

Azure Active Directory 利用と 共有アクセス署名-SAS(Shared Access Signatures) 利用の 2パターンを使用可能です。
Connection String を払い出して接続する方式は、SAS 利用のパターンの理解です。

```
Endpoint=sb://<namespace>/;SharedAccessKeyName=<KeyName>;SharedAccessKey=<KeyValue>;EntityPath=<event hub>
```

参考: [接続文字列を取得する - Azure Event Hubs - Azure Event Hubs | Microsoft Docs](https://docs.microsoft.com/ja-jp/azure/event-hubs/event-hubs-get-connection-string)

## 所感

Azure Event Hubs の EventProcessorClient について紹介いたしました。
Azure 系は、他クラウドサービスと比べ情報があまり調べても出てこないので、実装と公式ドキュメントをどれだけ見れるかで理解度が変わってくるなぁという印象でした。また他のサービスも触ってみたいです。

## 参考

- [複数のインスタンス間でパーティション負荷のバランスを取る - Azure Event Hubs - Azure Event Hubs | Microsoft Docs](https://docs.microsoft.com/ja-jp/azure/event-hubs/event-processor-balance-partition-load)
- [Azure Service Bus と Event Hubs における AMQP 1.0 プロトコル ガイド - Azure Service Bus | Microsoft Docs](https://docs.microsoft.com/ja-jp/azure/service-bus-messaging/service-bus-amqp-protocol-guide?toc=https%3A%2F%2Fdocs.microsoft.com%2Fja-jp%2Fazure%2Fevent-hubs%2Ftoc.json&bc=https%3A%2F%2Fdocs.microsoft.com%2Fja-jp%2Fazure%2Fbread%2Ftoc.json)
