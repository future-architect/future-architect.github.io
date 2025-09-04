---
title: "CloudWatch Logsサブスクリプションフィルター・SQSを用いたログ監視"
date: 2023/11/14 00:00:00
postid: a
tag:
  - ログ
  - 保守運用
  - AWS
  - CloudWatch
  - SQS
category:
  - DevOps
thumbnail: /images/2023/20231114a/thumbnail.png
author: 内田敦也
lede: "当チームでは、出力されたエラーや警告ログを適宜Backlogに起票することにより、いち早くエラーの対応ができるようにしております。CloudWatch LogsサブスクリプションフィルターとSQSを用いることにより、CloudWatchの特定のログをトリガーとして監視ジョブを立ち上げる仕様に改修しました。"
---
# はじめに

アルバイトとしてTIGに所属しております内田です。

当チームでは、従来はCloudWatch Logsに出力されたエラーや警告ログを数分毎にポーリング監視し、特定の文字列を検知することをトリガーにBacklogに起票することにより、いち早くエラーの対応ができるようにしていました。

しかし、監視対象のロググループなどは、そのログ監視ツールの環境変数に個別で設定する必要があり、デプロイするリソースが増えるたびにTerraform側の環境変数を追加するといった、同期を取る必要があり面倒でした。また、Backlog起票対象の文字列が存在しない場合もLambdaが着火し続けるため、コスト的にも問題がありました。

これをCloudWatch LogsサブスクリプションフィルターとSQSを用いることにより、課題だった環境変数の個別指定をなくすように仕様に改修しました。

この開発を通して得た、SQSとCloudWatchの連携についての知見を共有したいと思います。

# 構成

<img src="/images/2023/20231114a/fig.drawio.png" alt="fig.drawio.png" width="941" height="467" loading="lazy">

サブスクリプションフィルターで抽出されたログを、Lambda関数経由でSQSに挿入します。

Backlogに課題を追加するLambda関数は、一定時間おきにSQSに格納されているログを確認しに行き、全てのメッセージを読み込みます。

読み込んだメッセージは、所定のフォーマットに従ってBacklogに追加します。

### なぜSQSを経由させたのか？

サブスクリプションフィルターの機能だけをみると、わざわざSQSを経由する必要はないように思えます。

ところが、実際にSQSを使わないとログが出力される度に逐一Lambda関数が立ち上がり、Backlog APIのアクセス数が急劇に増えてしまう危険性があります。

また、ログの各行に対して課題が起票されるため、ログの量によってはとんでもない数の課題が増えてしまいます。今回のBacklogの起票方針としては、1エラー（警告）文字列に付き1件ではなく、同一のエラー（警告）コードであれば、1つだけチケットを起票し、内容はそのチケット内になるべく追記していきたいという要件のため、逐次起動ではミスマッチでした。

そこで、ログを一旦キューに保管し、ある程度時間が経った後に別のLambda関数に渡す設計にしています。

# CloudWatch Logsサブスクリプションフィルターの設定

当然ですが、ログが出力されたらなんでもかんでもBacklogに通知すればよいというものではありません。

状況にもよりますが、よくあるケースとしては、エラーや警告など対応が必要なものだけ通知したいケースが挙げられます。ここで、サブスクリプションフィルターにフィルターパターンを登録することにより、条件を満たしたログのみをトリガーにできます。

当プロジェクトでは、[zerolog](https://github.com/rs/zerolog)というロギングライブラリを用いてログを出力しているため、ログは以下のようなjson形式であることが保証されています。

```json
{"traceID": "xxx-xxx-xxx", "timestamp":"1970-01-01T00:00:00Z", "level": "info", "message":"Hello, world!"}
```

`level`の値が`warn`、`error`、`fatal`の何れかのものを対象とするにはフィルターパターンを以下のように設定します。

```sh
{$.level = %warn|error|fatal%}
```

正規表現を用いているため、状況によってより複雑な条件を指定することもできます。

送信先はSQSにプッシュするLambda関数に設定します。

# SQSのキューの種類

SQSには、「標準キュー」と「FIFOキュー」があり、違いは以下の通りです。

|# |標準キュー|FIFOキュー|
|--|--|---|
|順序性              |順序の保証なし|First In First Out|
|メッセージの配信回 数|1回以上（2回以上配信される場合も多い）|1回のみ|
|コスト             |USD 0.24~0.40 / 100万回|USD 0.35~0.50 / 100万回|

ここでは標準キューを採用しました。

ログの重複に関しては、コード内で重複を削除すれば良いです。また、ログには時間が含まれているため、これを用いることによりログの順序が分かります。

# メッセージを取得

AWS SDKで用意されている`ReceiveMessage`関数を用いればよいですが、1回あたり10件までしかメッセージを取得できないので、ループで回し続けます。

Simple Queue Serviceという名前をしていますが、キューからメッセージを取得してもメッセージはすぐには消えません。メッセージ保持期間が過ぎるまでは、キュー内にメッセージは残り続けます。従って、別途削除する処理が必要です。

削除するには、メッセージを取得した際にデータに含まれている`ReceiptHandle`を渡す必要があります。

以下は一連の処理をまとめたものです。

```go
sqs := sqs.New(session.Must(session.NewSession()))

var messages []*sqs.Message
for {
    res, err := sqs.ReceiveMessage(&sqs.ReceiveMessageInput{
        QueueUrl:            &queueUrl,
        MaxNumberOfMessages: aws.Int64(10),
        WaitTimeSeconds:     aws.Int64(0)
    })
    if err != nil {
		return err
	}

	if len(res.Messages) == 0 {
		break
	}
	messages = append(messages, res.Messages...)
}

for _, message := range messages {
    _, err := sqs.DeleteMessage(&sqs.DeleteMessageInput{
        QueueUrl:      &queueUrl,
        ReceiptHandle: &receiptHandle,
    })
    if err != nil {
        return err
    }
}
```

あとは、Backlog APIを用いて取得したデータを送信するだけです。

# さいごに

CloudWatch LogsサブスクリプションフィルターとSQSの連携について紹介いたしました。

SQSに関しては、別途データを削除する処理が必要な点が初見だとわかりにくいところだったので、その点も含めて参考になれば幸いです。
