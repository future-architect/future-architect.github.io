---
title: "AWS利用料金をSlackに円グラフ付きで投稿する"
date: 2021/10/15 00:00:00
postid: a
tag:
  - AWS
  - Slack
  - Go
  - 可視化
category:
  - Infrastructure
thumbnail: /images/20211015a/thumbnail.png
author: 中山楓太
lede: "AWSの利用料金をSlackに通知する仕組みを作成したので共有したいと思います。私が参加しているプロジェクトでは、毎月AWSにいくらかかっているのか、加えてそれぞれのサービスは全体のコストの内どのぐらいの割合を占めているのか知りたいという話があり、今回AWSから利用額を取得しSlackに通知する仕組みを作る流れとなりました。"
---
# はじめに
こんにちは、フューチャーにアルバイトとして参加中の中山です。

今日はアルバイトで参加しているプロジェクト内でAWSの利用料金をSlackに通知する仕組みを作成したので共有したいと思います。

私が参加しているプロジェクトでは、毎月AWSにいくらかかっているのか、加えてそれぞれのサービスは全体のコストの内どのぐらいの割合を占めているのか知りたいという話があり、今回AWSから利用額を取得しSlackに通知する仕組みを作る流れとなりました。

今回の記事では、実際に採用したAPIやサービスに加え、採用を検討したが実際には利用しなかったサービスなども交え、似たような仕組みを作ってみたいと思っている方に少しでも情報提供できればと考えています。

参考：[今回のソースコード](https://github.com/furiko/aws-cost-notify-to-slack)

# システム概要
それでは実際にどのような仕組みで動いているか説明します。

図のように、

1. CloudWatchにより定時起動でLambdaを呼び出す
2. GetCostAndUsageAPIを用いて先月分の利用料金を取得し、[go-chart](https://github.com/wcharczuk/go-chart)を用いて円グラフ化
3. SlackにWebhookとfiles.uploadを用いて通知

という仕組みになっています。Cloudwatchでは毎月1日にLambdaが起動するように設定しています。所属しているプロジェクトではGo言語を採用しているため、go-chartを採用してグラフを作成しています。

Webhookは、各サービスの利用料金を箇条書きで通知するために利用しており、files.uploadは円グラフをアップロードするために利用しています。

<img src="/images/20211015a/cost-explorer.drawio.png" alt="cost-explorer.drawio.png" width="570" height="352" loading="lazy">

## 投稿例

Slackに実際に投稿されるものは、各サービスの利用料金を箇条書きにしたものとデータを元に作成された円グラフの2点です。以下に例を示します。
箇条書きの方は都合上、Othersという項目を追加していますが、実際にはAPIから返ってきた値を全てそのまま載せています。

### AWS利用料金箇条書き

```
Monthly Report
AWS Account: 111111111111
Start: 2021-08-01, End: 2021-08-31
Total Cost: $1000
Amazon DynamoDB: 500.00(50)%
AWS Lambda: 200.00(20)%
Amazon Kinesis: 150.00(15)%
Others: 100.00(10)%
Tax: 50.00(5)%
```

### 利用料金円グラフ
<img src="/images/20211015a/output.png" alt="output.png" width="512" height="512" loading="lazy">

## GetCostAndUsage API
[AWS Cost Explorer](https://aws.amazon.com/jp/aws-cost-management/aws-cost-explorer/)が提供するAPIで、指定した期間のアカウントに紐づくAWSの利用料金を取得することができます。パラメータの指定方法など詳細は、[ドキュメント](https://docs.aws.amazon.com/ja_jp/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html)を参照ください。

ここでは、1ヶ月分のAWS各サービスの利用料金を取得する場合のGo言語の場合のサンプルを載せておきます。
注意点として、このAPIは`us-east-1`でのみ提供されるのでLambdaを`ap-northeast-1`などにデプロイしている場合でもAPIを呼び出す際には必ず`us-east-1`を指定する必要があります。

```go
granularity := "MONTHLY"
metrics := []string{"BlendedCost"}

svc := costexplorer.New(session.Must(session.NewSession(&aws.Config{
    Region: aws.String("us-east-1"), // GetCostAndUsageAPIはus-east-1のみで提供
})))

result, err := svc.GetCostAndUsage(&costexplorer.GetCostAndUsageInput{
    TimePeriod: &costexplorer.DateInterval{ // 取得したい期間を指定
        Start: aws.String(start),
        End:   aws.String(end),
    },
    Granularity: aws.String(granularity),
    GroupBy: []*costexplorer.GroupDefinition{
        {
            Type: aws.String("DIMENSION"),
            Key:  aws.String("SERVICE"),
        },
    },
    Metrics: aws.StringSlice(metrics),
})
```

GoSDKの[ドキュメント](https://docs.aws.amazon.com/sdk-for-go/api/service/costexplorer/)も必要な場合は参照ください。

## 円グラフ作成
GetCostAndUsageAPIで取得できたAWS各サービスごとの利用料金を用いて円グラフを作成します。今回はGo言語で実装したいという条件があったので、[go-chart](https://github.com/wcharczuk/go-chart)を用いて作成しました。基本的には[サンプル](https://github.com/wcharczuk/go-chart/blob/master/examples/pie_chart/main.go)のコード参考にし、全体に占める割合が少ないサービスはOthersとしてまとめました。また、今回はLambda上で画像を生成し、Slackに送信している関係上、一度pngファイルに書き出すなどせず、バッファに画像データを書き込んで送信する形をとりました。

```go
var values []chart.Value
others := chart.Value{
    Label: "Others",
    Value: 0.0,
}

// グラフデータの作成
for _, v := range results {
    // 全体に占める割合が1.0%未満のサービスはOthersにまとめる
    if v.Ratio < 1.0 {
        others.Value += v.Cost
        continue
    }
    values = append(values, chart.Value{
        Value: v.Cost,
        Label: v.Name,
    })
}
values = append(values, others)

// グラフの作成
pie := chart.PieChart{
    Width:  512,
    Height: 512,
    Values: values,
}

// バッファに画像データを書き込む
buffer := bytes.NewBuffer([]byte{})
err := pie.Render(chart.PNG, buffer)
```

### GetMetricsWidgetImage API

はじめ、円グラフを作成しようと探していた際に[GetMetricsWidgetImage](https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/APIReference/API_GetMetricWidgetImage.html)というAPIを知りました。このAPIを利用して前日との利用料の差額を出している記事なども見つけましたが、このAPIは利用料金の円グラフ化はできるのですが、**対象となるデータはCloudWatchで監視できるリソースのみ**であり、GetCostAndUsageAPIで取得できる全てのデータを対象とすることはできなかったため採用を見送りました。

私自身、初めはグラフ作成に必要なデータを送れば円グラフを作成して返してくれるAPIだと思っていたのですが、上述の通り、Cloudwatchの監視メトリクスをグラフ化するためのAPIであり、汎用的にグラフ作成に用いるAPIではありませんでした。

## Slack連携
次に、上記で取得した各サービスの利用料金と円グラフをSlackに連携する方法について紹介します。
開発当初Webhookを用いてテキストのみをSlack連携していたところに円グラフを後から追加したため、今回のサービスではWebhookとfiles.uploadの両方を用いていますが、Bot Tokenに適切なScopeの設定をすることで自作のSlackApp1つで、テキストの投稿・円グラフのアップロードの両方を実現可能かと思います。

### Webhook
Slackに対して通知する代表的な手段として[Incoming Webhook](https://slack.com/intl/ja-jp/help/articles/115005265063-Slack-%E3%81%A7%E3%81%AE-Incoming-Webhook-%E3%81%AE%E5%88%A9%E7%94%A8)があります。今回のシステムではこちらを利用して、各サービスごとの使用量を箇条書きで通知しています。

```go
endpoint := SLACKENDPOINT

body := struct {
    Text string `json:"text"`
}{
    Text: fmt.Sprintf("*Monthly Report*\n %v", cost),
}

jsonString, err := json.Marshal(body)
if err != nil {
    return err
}

req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(jsonString))
if err != nil {
    return err
}
req.Header.Set("Content-Type", "application/json")

_, err = http.DefaultClient.Do(req)
```

### files.upload
Webhookではファイル自体のアップロードはできないため、files.uploadを用いてLambda内で生成した円グラフの画像をSlackにアップロードしています。

```go
api := slack.New(SLACKAPITOKEN)

_, err := api.UploadFile(
    slack.FileUploadParameters{
        Reader:   b,
        Filename: "output.png",
        Channels: []string{SLACKCHANNEL},
    })
```

# まとめ
AWSのAPIを用いて月々の使用量を取得し、Slackに通知する仕組みの紹介をしてきました。

円グラフを作成して各サービスの割合を出し、各サービスのコスト比重を見返すことは今後のAWS利用の効率化などの考察の一助となると思いますので、興味がある方はぜひこの機会にSlackでAWS利用料金をチェックする仕組みを組んでみてください。

最後に今回のサービスで利用しているコードの全文を載せておきます。最後まで読んでいただきありがとうございました。

## コード全文

全文：[今回のソースコード](https://github.com/furiko/aws-cost-notify-to-slack)

**環境変数** について
４つ利用しています。実行前に事前に準備をお願いします。

* SLACK_ENDPOINT: Webhookの投稿先URLです
* SLACK_API_TOKEN: files.uploadで用いるToken文字列です
* SLACK_CHANNEL: Slackの投稿先チャンネルです
* AWS_ACCOUNT: Slackに投稿される箇条書き文字列の冒頭にある`AWS Account:`に付与する値です

Lambdaで実行する場合は各自事前にLambdaの準備とコードのデプロイをお願いします。

Lambdaではなくローカル環境で実行する場合は、main関数内の`lambda.Start(Handle)`を`Handle(context.Background())`に書き換えて実行してください。また、`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`は各自設定をお願いします。


