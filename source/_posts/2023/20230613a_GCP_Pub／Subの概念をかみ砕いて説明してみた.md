---
title: "GCP Pub/Subの概念をかみ砕いて説明してみた"
date: 2023/06/13 00:00:00
postid: a
tag:
  - PubSub
  - GCP
  - 初心者向け
category:
  - Infrastructure
thumbnail: /images/20230613a/thumbnail.png
author: 添田瑛介
lede: "PubSubについて噛み砕いて説明していきます。今後PubSubを使用した開発をする方の助けになれればと思います。"
---
# はじめに

はじめまして。2023年1月キャリア入社の添田です。1月から参画させていただいているプロジェクトでGoogle Cloud PlatformのPubSub(以降PubSub)を使用した開発を行うことになり、苦戦した部分が多々ありました。そこで今回はPubSubについて噛み砕いて説明していきます。今後PubSubを使用した開発をする方の助けになれればと思います。

(Google Cloud Platform PubSubについての公式ドキュメントは[こちら](https://cloud.google.com/pubsub/docs/overview?hl=ja)です。)

# 目次

1. そもそもPubSubとは何か
2. PubSubを理解する上で重要な単語の解説
3. 実際の処理の流れの解説
4. PubSubを使用したユースケース考えてみた
5. まとめ
6. 最後に 

## 1. そもそもPubSubとは何か

PubSubとは、非同期型のメッセージングサービスです。つまり、異なるコンポーネントやアプリケーション間でデータを非同期的に送受信するためのシステムになります。

補足ですが、他のクラウドベンダーでも類似したメッセージングサービスが提供されています。選択するメッセージングサービスはその時の要件等に合わせて検討していきましょう。

* AWS
  * Amazon Simple Queue Service（Amazon SQS）
  * Amazon Kinesis Data Streams
* Azure
  * Azure Service Bus: Service Bus
  * Azure Event Grid: Event Grid

次にPubSubを理解する上で以下の重要な単語を解説していきます。

PubSub概念を理解をする上では少なくとも以下は必須の用語となるので各用語の解説後、図解でPubSubの実際の動きやユースケースを解説していきます。

* メッセージ
* publisher
* subscriber
* topic
* subscription
* 確認応答（Ack）

## 2. PubSubを理解する上で重要な単語の解説

1. **メッセージについて**
メッセージとは、異なるコンポーネントや、アプリケーションに対して送信するデータのことです。要は非同期的に処理させたいデータをメッセージとして作成します。最終的にpublishする際にはメッセージの形式をバイト配列にする必要があります。(publishに関しては後ほど解説します)
2. **publisherについて**
publisherとは、メッセージを送信する役割をもつアプリケーションのことを指します。publisherがメッセージを送信することをpublishする、と言います。
3. **subscriberについて**
subscriberとは、メッセージを受信する役割を持つアプリケーションのことを指します。つまり、publisherからpublish(送信)されたメッセージを受け取り、非同期的に受け取り、それに応じた処理を行うアプリケーションと言えます。
4. **topicについて**
topicとは、PubSubのコンポーネントでありメッセージの送信元であるpublisherと、メッセージの受信先であるsubscriberを結ぶ中継地点と言えます。つまり、publisherはsubscriberへ直接メッセージをpublishするのではなく、topicにメッセージをpublishしています。topicについては特に重要な概念となります。
5. **subscriptionについて**
subscriptionとはPubSubのコンポーネントでありtopicからのメッセージの受信先と言え、subscriptionからsubscriberへのメッセージの配信が行われます。また、topicからメッセージを受信するsubscriptionは必ずしも１つである必要はなく、複数のsubscriptionを作成し１つのメッセージに対し、複数のsubscriberにメッセージを一度に配信することで全く違う処理を同時に非同期的に行うことが可能です。
6. **確認応答（Ack）について**
subscriberがメッセージを正常に受け取ったらsubscriptionに対して正常にメッセージを受信したことを通知します。確認応答を受信すると正常にメッセージが受信されたと見なされ、そのメッセージはtopicから削除されます。また、subscriberがメッセージの処理に失敗した場合、Nack（Negative Acknowledgement）を通知することができます。Nackが通知された場合、再度メッセージの配信を行います。この辺りの詳細な設定もsubscriptionで決めることが可能です。

## 3. 実際の処理の流れの解説<a name="処理の流れの解説"></a>

<img src="/images/20230613a/pubsub_1.png" alt="pubsub" width="667" height="435" loading="lazy">

上図がPubSubの基本的な処理の流れになっています。

流れとしては以下のような流れとなります。

* 1. publisherがメッセージを作成、topicへpublishする
* 2. publishされたメッセージはMessageStorageへ格納される（MessageStorageについては説明していませんが、要はメッセージの一時保存場所のイメージです）
* 3. topicにpublishされたメッセージはsubscriptionの設定内容に応じてsubscriberへ配信されます。
* 4~5. subscriberがメッセージを正常に受信したことをsubscriptionへ通知します（Ackされる）

また、下図のような1対N・N対1のような使い方をすることも可能です。

例えば下図のpublisher Cから複数のsubscriberへメッセージを配信するユースケースは以下のようなシナリオが考えられると思います。

* ECサイトの注文管理システムの注文通知機能
    1. Publisher Cが注文データをメッセージとしてpublish
    2. PublishされたメッセージをTopic Cが受信
    3. Topic cがSubscription YCとSubscription ZCへメッセージを配信
    4. Subscriber YとSubscriber Zがメッセージを受信
    5. Subscriber Yはユーザへの注文確定のメール通知を行う・Subscriber Zは管理者ダッシュボードへの注文通知を表示する

上記はあくまでPubSubを用いた一例ですが、このように異なるサービスやシステム間での効率的な処理が可能になるのがPubSubの凄さだと思っています。

<img src="/images/20230613a/pubsub_2.png" alt="pubsub_2.png" width="727" height="418" loading="lazy">

## 4. PubSubを使用したユースケース考えてみた<a name="処理の流れの解説"></a>

用語の解説から実際の処理の流れの解説までできたところで、今度はユースケースを考えてみます。

例えば下図のような証券会社のシステムがあったとします。

このシステムは10年以上前に構築されたもので以下のような課題がありました。

* 課題①：各種取引商品データ更新の遅延
  * 10年前と比較して取引商品が増えたため、更新処理時間が増加していた。
* 課題②：システム依存度の高さ
  * 現行のシステムではデータプロパイダと直接的に連携していることにより、他のデータプロパイダの使用やシステムのアップグレードが非常に難しくなっていた。

<img src="/images/20230613a/pubsub_3.jpg" alt="pubsub_3.jpg" width="1170" height="721" loading="lazy">


下図のようにPubSubを導入することによってこれらの課題を解決することが可能です。（あくまで一例です）
* 課題①：各種取引商品データ更新の遅延
  * 現行のシステムでは大量のデータを１つのシステムが処理をしていたが、データをメッセージとして受け取り複数のsubscriberで並列的に処理をさせる（データを表示するsubscriber、データを登録するsubscriberなどで役割を分ける）ことで効率的に処理を行う。
* 課題②：システム依存度の高さ
  * PubSubを介することでデータプロパイダと証券会社システム間は疎結合な関係になることで他のデータプロパイダの使用やアップグレードが現行システムより容易になる。

<img src="/images/20230613a/pubsub_4.jpg" alt="pubsub_4.jpg" width="1170" height="918" loading="lazy">

# 5.まとめ

PubSubを理解するうえで必要な用語の解説からユースケースまで説明しました。

今回はPubSubの解説を、主にイベントドリブンなアーキテクチャで例えて解説しましたが、他にもリアルタイム分析や、マイクロサービスアーキテクチャの実現など様々な用途に使用することが可能です。

私は現在のプロジェクトで初めてPubSubを触りましたが、とても感動しました。

# 6.さいごに

今回はPubSubの基礎的な部分とユースケースの解説をさせていただきました。

Pull型配信やPush型配信、デッドレターキュー（DLQ）など、まだまだ解説できていない箇所がありますが、次回以降の投稿で解説していこうと思います。
