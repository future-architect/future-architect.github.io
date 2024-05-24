---
title: "GoでWebアプリ開発時にあるあるだったレビューコメント"
date: 2020/07/09 11:09:27
postid: ""
tag:
  - Go
  - コードレビュー
  - チーム開発
category:
  - Programming
thumbnail: /images/20200709/thumbnail.png
author: 真野隼記
lede: "最近Goで主にバックエンドのWebAPIや、AWS Lambdaで動くETLアプリ、たまにCLIツールを開発する時に、2回以上同じ指摘したコメントをまとめてます。Go言語特有ぽいところを中心にしています。レビュイーのスキルセットは.."
---

<img src="/images/20200709/photo_20200709_01.png" class="img-small-size" loading="lazy">

The Gopher character is based on the Go mascot designed by [Renée French](http://reneefrench.blogspot.com/).



# はじめに

TIG DXユニット [^1]の真野です。

 [^1]: TIG(Technology Innovation Group)というフューチャーグループのIT技術を良い感じに推進する部署と、その中にあるDXユニットという、デジタルトランスフォーメーションに関わる仕事を主に推進していくチームのことです。

コードレビューについては3,4年ほど前に、[コードレビューにおけるレビュアー側のアンチパターン](https://medium.com/@laqiiz/effdcc39da52) って記事を書いたりもしました。当時はレビュアーの伝え方って大事だよなって話をしてました。いつしかレビュイーからレビュアーに比重が変わることが増えてきました。相互レビューは当たり前にしていますがが、比較的こうしたらもっと良くなるんじゃないかな？と提案される回数より、自分が提案する回数の方が増えてくるタイミングってありますよね？

そういうわけで、最近Goで主にバックエンドのWebAPIや、AWS Lambdaで動くETLアプリ、たまにCLIツールを開発する時に、2回以上同じ指摘したコメントをまとめてます。Go言語特有ぽいところを中心にしています。


# レビュイーのスキルセット

新人さん（専攻は情報系であれば経済学部の人もいました）や、AtCoderJobs経由のアルバイトerの方。新人さんであればJavaは研修で学んでいたのと、アルバイトerの方はPython使いが多かったです。それぞれ全員Goを業務で使ったことがない人でした。何ならJavaやPythonでも業務利用は初めてレベルの人が対象でした。人数は覚えていませんが、のべ15名以上に対して何かしら開発で関わったと思います。


# ベースラインとしてのインプット情報

Goを初めて使うよってメンバーも多いので、インプット情報はまとめています。[Tour of Go](https://go-tour-jp.appspot.com/welcome/1)を1日くらいやってもらった後に、[Goのインストール]( https://golang.org/doc/install)を含めた環境構築をしてもらい、次の内容を適時読んでもらっています。最初のPullRequest時では必須ではなく、大体はある機能実装の2,3回目以降に読んだ方が良いかも？なタイミングでリンクを送ることが多いです。初心者にはあまりインプットに比重を寄せず、せっかくの業務でGoを書く機会なのでまずはアウトプットを出してもらいそれに対してフィードバックして育てようという考えです。

インプットは個人的なお勧め順に記載しています。Effective Goはそこそこ分量があるので、興味があるところだけザッと読むことが良いと思います。

* **[JavaプログラマーのためのGo言語入門](/articles/20200311/)**
  * 安心のフューチャー技術ブログ。翻訳本の出版ばりのクオリティーだと評判
  * 社内だと新人研修がJavaなので、新卒組には特に勧めています
* **[Goを学ぶときにつまずきやすいポイントFAQ](/articles/20190713/)**
  * 安心のフューチャー技術ブログ。読み応えたっぷりです
* **[Effective Go](https://golang.org/doc/effective_go.html)**
  * 日本語訳もあるけど、ちょっと古いのでそちらは参考にする程度にしたほうが良いかも
  * 量が多いので最初は気になるところだけ逆引き的に読んでいこう
  * 命名に関しては、micnncimさんの **[Go の命名規則](https://micnncim.com/post/2019/12/11/go-naming-conventions/)** 記事に目を通しておくと間違いないです
* **[Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)**
  * 日本語訳: https://qiita.com/knsh14/items/8b73b31822c109d4c497
* **[Go言語で幸せになれる10のテクニック - Qiita](https://qiita.com/ksato9700/items/6228d4eb6d5b282f82f6)**
  * (個人的にはReturn function callsが特にレビュー指摘がとても多い)
* **[Uber Style Guide](https://github.com/uber-go/guide)**
  * 日本語訳: https://github.com/knsh14/uber-style-guide-ja
* **[go-cloudのCoding Conventions](https://github.com/google/go-cloud/blob/master/internal/docs/design.md#coding-conventions)**
    * 短いですが、GoCDKというライブラリの規約が書いてありました

もし、利用しているWebApplicationFrameworkがgo-swaggerであれば

* [go-swaggerを用いたWebアプリケーション開発Tips19選](/articles/20200630/)

も軽く見てもらっています。

また、新しい言語を学ぶ際はいつもより多めにググると思いますが、以下の注意点を伝えています

* Go 1.12以前はgo modがなくてプロジェクト周りで古い情報があったりするので、go modじゃないglide/depなどのツールを紹介しているページは検索でひっかかっても読まないこと
* GOPATHについて説明しているページも古いから読まない


# コードレビューの位置づけ

レビューコメントですが、golangci-linterやその他Linterでカバーできる内容もあるかもしれません。静的解析で分かる範囲はなるべく自動化して、人間がやるべきところにもっとフォーカスを当てるべきだと思いますが、正直あまりここに力を割けてません。これ、Linterでデキるよってのがあれば教えて下さい。

ちなみに、golangci-lintの設定は、スピード重視で最低限にしています。

```bash:golangciの設定
golangci-lint run --tests --disable-all \
  --enable=goimports --enable=govet --enable=errcheck --enable=staticcheck
```

あまり力を割けてはいませんが、リソースのクローズ漏れなどの致命的な不具合以外の、文法よりのところはレビューで防ぐか、最悪は後でテックリードがリファクタリング修正コミットすれば良いという考えで、初心者Gopherにはユニットテストをガンバって欲しいという意図があります。とは言え、何度も同じようなレビューコメントをするのも大変なので、汎用性がありそうなのを今回まとめた次第です。Linterでいけるなら行きたいです。


# 💬 コードレビューでコメントしたこと

数が増えてきましたので、以下のように4つのカテゴリに分けました。

* 📦ライブラリの使い方
* ☁️クラウド環境を意識した実装
* ⚡一般的な内容
* 🧪単体テスト



## 📦ライブラリの使い方

### 1. なるべくXxxWithContextを使おう

特にHTTP要求やDB接続などで、利用するパッケージの関数に `context.Context` を指定できる、多分 `WithContext`がついか関数があると思います。なるべくそちらを利用するようにしましょう。キャンセル通知やTimeoutの伝播などを行えて無駄なリソースの実行を防ぐことができます。

```go
	// 💬 これでも良いが、context.Contextを使って欲しい
	resp, err := http.Get("http://example.com/")
	if err != nil {
		// handle error
	}

	// 🚀 context.Contextを渡す関数へ
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://example.com/", nil)
	if err != nil {
		// handle error
	}
	resp, err = http.DefaultClient.Do(req)
```

使い捨てのコードであれば最初のコードの方がシンプルなのでドンドン利用すると良いと思います。例えばnet/httpを用いてサーバサイドを実装した場合には、 `http.Request` からcontext.Contextを取得できるので、これを別の外部リソース（DBとか外部APIなど）へのアクセス時にも利用するため引き回します。

```go
func handler(w http.ResponseWriter, r *http.Request) {
	// このctxを引き回して用いる。別の関数に引き渡すときもこのctxを渡せるように定義しておく
	ctx := r.Context()
}
```

今回は外部へのHTTPリクエストでしたが、例えば[AWS S3](https://docs.aws.amazon.com/sdk-for-go/api/service/s3/#S3.GetObjectWithContext)でも、`GetObjec` より `GetObjectWithContext` を使おうとなります。AWSやGCPなどクラウド系のSDKはもちろん、3rd Party製のライブラリにもWithContext付きのAPIが用意されていることが多いので、ぜひ利用しましょう。

これを守ると、自分で定義する関数もcontext.Contextを引き回す設計になると思います。

```go DynamoDBへのcontext.Contextを引き回しての書き込み例
func writeToDB(ctx context.Context, v ExampleStruct) error {
	av, err := dynamodbattribute.MarshalMap(v)
	if err != nil {
		return fmt.Errorf("dynamodb attribute marshalling map: %w", err)
	}
	i := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String("<テーブル名>"),
	}
	if _, err = db.PutItemWithContext(ctx, i); err != nil {
		return fmt.Errorf("dynamodb put item: %w", err)
	}
	return nil
}
```



### 2. Factory関数があればそちらを優先しよう

`go-swagger` での生成コードでよくありましたが、ライブラリが`NewXxx`のファクトリ関数を用意している場合はそちらを利用しましょう。

```go
	// 💬 Structに自分で詰めても場合によっては良いが..
	params := &UplinkSecurityParams{
		Context:    ctx,
		HTTPClient: hc,
		UserID:     "userID",
	}

	// 🚀ファクトリー経由での生成したほうが固い
	params := user.NewGetUserParamsWithContext(ctx).
		WithHTTPClient(hc).
		WithXAPIKey("0123456789").
		WithUserID(userID)
```

理由は、ファクトリー内で初期値を設定していたり、将来的にそういった処理が差し込まれる可能性があるためです。用意されているのであればそちらをまず優先して使いましょう。ファクトリー関数があるかどうかは、GoDocを探すことが多いと思います。GoDocの探し方にもコツがあるので、[Go Tips連載4: GoDocの読み方](/articles/20200521/) の記事をチェックしてみると勉強になります。


### 3. 利用ライブラリがチェーンスタイルを提供していれば活用しよう

先ほどのgo-swagger以外のライブラリでもそうですが、チェーンスタイル（関数をドット区切りでつなげていく）なAPIを提供してくれているライブラリもあります。例えばGCPのSDKなどです。

```go
	// 💬 別に実装上問題ないですが..
	ts := compute.NewInstanceTemplatesService(s)
	tsf:= ts.List(projectID).Filter("properties.labels.scheduled=true")
	listInstances, err :=tsf.Do()
	if err != nil {
	// handle error
	}

	// 🚀 一時変数が無い分は可読性が高そうなので、他で流用しないならつなげて書いてもOK
	listInstances, err := compute.NewInstanceTemplatesService(s).
		List(projectID).
		Filter("properties.labels." + targetLabel + "=true").
		Do()
	if err != nil {
		// handle error
	}
```

1行にまとめるのか、複数行にするのかは好みなのでどちらでも良い気はします。ブログではスマホでも見やすいように改行しています。


### 4. SDKが出力するNotFoundを意味するerrorと、その他のエラーを区別してハンドリングする

Go入門時はどうしても、とにかく `if err:= fn(); err!= nil {return err}` するものだと教わるものかと思いますが、当然ながらerrorの値によってハンドリング内容を変更する場合もあります。例えば、あるerrorの場合はステータス404を返し、そうでない場合は500を返す場合などです。

例としてDynamoDBのUpdateItemをあげます。

```go DynamoDBのUpdateItemの例
var db dynamodb.New(session.Must(session.NewSession())

func handler(w http.ResponseWriter, r *http.Request) {
	// 中略
	out, err := db.UpdateItemWithContext(ctx, &dynamodb.UpdateItemInput{
	TableName: aws.String("<exmaple-table>"),
	ExpressionAttributeNames: map[string]*string{
		"#TYPE":       aws.String("user_type"),
		"#REVISION":   aws.String("revision"),
	},
	ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
		":type": {
			S: aws.String("有料会員"),
		},
		":incr": {
			N: aws.String("1"),
		},
	},
	Key: map[string]*dynamodb.AttributeValue{
		"user_id": {
			S: aws.String("<user-id>"),
		},
	},
	ConditionExpression: swag.String("attribute_exists(user_id)"),
	UpdateExpression: aws.String("SET #TYPE= :size ADD #REVISION :incr"),
	})
	if err != nil {
		// 💬 500 Server Internal Error をレスポンスで返す
	}
	// 省略
}
```

上記の`db.UpdateItemWithContext` を実行後の `err` ですが、もし一律`500 Server Internal Error` で返すと、おそらく意図と反する挙動になるかもしれません。理由は、指定したユーザIDが存在しない場合の考慮がないためです。もしユーザIDが存在しない場合に404を返す要件で合った場合はこの実装では満たせません。

もし、そういった要件の場合は、以下のような判定用のエラー関数を作成し、エラーハンドリングを修正すると良いかと思います。

```go ヘルパー関数を使った細かいハンドリング
func IsNotFoundErr(err error) bool {
	aerr, ok := err.(awserr.Error)
	if ok && aerr.Code() == dynamodb.ErrCodeConditionalCheckFailedException {
		return true
	}
	return false
}

func handler(w http.ResponseWriter, r *http.Request) {
	// 中略
	if err != nil {
		// 🚀 (当然だけど..)必要に応じてハンドリング
		if IsNotFoundErr(err) {
			// 404 NotFound
		} else {
			// 500 ServerInternalError
		}
	}
	// 省略
}
```

今利用しているSDKがどういうエラーを返すかは、[こういったドキュメントを探す](https://docs.aws.amazon.com/sdk-for-go/api/service/dynamodb/#DynamoDB.UpdateItem)か、コードを探すかになると思います。何にしろ、正常系以外のエラーパスのハンドリングはどうしても後回しになりがちですが、この辺はレビュアー視点でも抜け漏れガチなので、相互にチェックしあえると良いかなって思います。



### 5. 複数Itemを処理する場合、Batch登録APIの有無を確認しよう

これはどの言語でも共通する内容ですが、PostgreSQLへのinsertやDynamoDBへのPutItem、あるいは複数のキーを指定したGetなどはSDKやライブラリが用意しているBatch処理用のAPIを利用しましょう。1件1件は大したことがなくても、500件ほど積み重なると思いの外レイテンシに影響がデカイです。

また、Batch処理のAPIが合ったとしても、同時に書き込む件数は絞り込む必要が特にAWSやGCPには存在します。RDBであっても同時書き込み件数は1000件くらいに絞ったほうが良いでしょう。例えばAWS Kinesisへの書き込み例ですが、複数件の書き込みなので `putRecords`を利用します。大体が同時に書き込めるデータ容量やバッチ件数があるので、ググって上限を調べます。次のコードだと実は最大 5 MBの制限チェックはしていないのですが必要に応じてそういった閾値の判定を追加します。

```go Kinesisへのバッチ登録例(※ちょっとエラーハンドリング甘い書き方なので注意)
	var kc *kinesis.Kinesis
	var items []ExampleStruct
	// 中略

	entries := make([]*kinesis.PutRecordsRequestEntry, 0, len(items))
	for i, v:= range items {
		data, _:= json.Marshal(v)
		entries = append(entries, &kinesis.PutRecordsRequestEntry{
			Data:         data,
			PartitionKey: aws.String("<any partition key>"),
		})

		// KinesisのBatch上限件数が500なので分割する
		if len(entries) >= 500 || i == len(items) -1 {
			_, err := kc.PutRecordsWithContext(ctx, &kinesis.PutRecordsInput{
				Records:    records,
				StreamName: aws.String("<Kinesis Stream name>"),
			})
			if err != nil {
				return err
			}
			entries = entries[:0] // 成功したらクリア
		}
	}
```

今回は省略しましたが、この辺の最大件数が数百になるような閾値を含んだ単体テストは書きにくいので、500を `var kinesisPutSize = 500` といった形で変数に切り出すこともおそらく必要になってくると思います。この辺りはどこまでレビュー時にコメントするか、後から自分で直すかはその時の状況次第ですが、少ない件数では上手く動くけど、件数が増えるとスローダウンしたりエラーが発生するのは結構辛い事象なので、気をつけていきたい点ですね。

検索系も同様に大量件数に対する考慮が必要です。特に最大検索件数を指定し忘れることが多いので、SQLやDynamoDBにLimitの指定をし忘れないようにしましょう。特にSQLは意識しないとよく忘れるので、フレームワークレベルで横断的に設定しても良いかも知れません。

※ちなみに上記のコードは`putRecords`結果の `FailedRecordCount`が`0` であるかを確認していないので、そのままは利用しないで下さい。本当は`FailedRecordCount`が1件以上であれば、未処理だったレコードを再びputRecords対象に回す必要があります。[参考](https://docs.aws.amazon.com/sdk-for-go/api/service/kinesis/#Kinesis.PutRecords)。この辺のAWSのSDK周りのハマリどころの説明は長くなるので..今回は省略します。



## ☁️クラウド環境を意識した実装

### 6. 外部通信周りのリトライ

[AWS SDK for Goの場合は、APIコール時のリトライを意識して実装する必要は無い](https://dev.classmethod.jp/articles/retry-api-call-with-exponential-backoff-using-aws-sdk-go/)ということです。問題になるのは、他のWebAPIサーバにリクエストを送信するときでしょう。

Goは簡単にHTTPリクエストを送信できるのでそれ自体は良いことですが、特にクラウド環境で動いているリソースに対しては瞬断も想定してリトライロジックを入れたほうが良いでしょう。リトライもそこそこナレッジが合って、[エクスポネンシャルバックオフ](https://docs.aws.amazon.com/ja_jp/general/latest/gr/api-retries.html)であったり、ジッターを入れるなど、自前で実装するとややこしいのでGoだと外部ライブラリに頼ることがほとんどだと思います。

* [hashicorp/go-retryablehttp](https://github.com/hashicorp/go-retryablehttp)

などを利用すると良いかと思います。もし実行基盤がAWS Lambdaだとインフラレベルでリトライ回数を設定できるので、その場合は不要かもしれません。状況次第ですがレビュアー・レビュイーと相談して決めていました。

```go
	// 💬 カジュアルなWebAPIを呼び出し
	resp, err := http.Get("http://api.example.com/v1/users/" + userID)

	// 🚀 リトライまで考慮したい(hashicorp/go-retryablehttpを使った例)
	retryClient := retryablehttp.NewClient()
	retryClient.RetryMax = 2
	rc := retryClient.StandardClient()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://example.com/", nil)
	// 略
	resp, err := rc.Do(req)
```

1のWithContextの話と合わせて実装してみて下さい。ちなみに、もし外部API側がOpenAPI定義などを公開している場合は、そちらを利用した方が良いでしょう。もし、WebAPI定義の仕様が変わった場合に、再コード自動生成＋コンパイルで不整合を事前に検知できるかも知れないからです。


### 7. プロパティは環境変数に切り出し起動時にチェックする

データストアを始めとした外部リソースへのアクセス先など、多くのプロパティが業務システムの開発は出てくると思います。この時のホスト名、ポート番号、URLなどは環境変数などの外部から設定できるようにしましょう。

```go
// 💬 1stコミットだから良いよね？って感じの仮実装の気持ちが伝わりますが
const EXTERNAL_API_URL = "http://localhost:8001"
var client = NewClient(EXTERNAL_API_URL)

// 🚀 環境変数化はどのみち必要であるため早めに対応したい
var client external.Client
func init() {
	externalURL := os.Getenv("EXTERNAL_API_URL")
	if externalURL == "" {
		log.Fatal("EXTERNAL_API_URL is requiread environment variable")
	}
	client = NewExternalClient(externalURL )
}
```

また、環境変数化した場合は、その値がちゃんと設定されているか必須チェックなどは最低限行いましょう。Goだと[kelseyhightower/envconfig](https://github.com/kelseyhightower/envconfig) といった便利ライブラリもあるため、すでに導入済みであればそちらにフィールドを追加して、タグを設定すれば必須チェックくらいは行なえます。

環境変数を追加した場合は、READMEなどのドキュメントや、TerraformやCloudFormationなどインフラスコード側の更新も同期をとる必要があることが多いと思いますので、そういったものが存在しないかはレビュアー・レビュイーどちらも気をつけていったほうが良いと思います。


## ⚡一般的な内容

### 8. 再利用可能なgoroutineセーフな変数はフィールドに切り出す

`http.Client` などは`safe for concurrent use by multiple goroutines`(goroutineセーフだよ)と[GoDoc](https://golang.org/src/net/http/client.go) に記載されています。同じようにaws-sdk-for-goのDynamoDBのクライアントも`safe to use concurrently`だと[GoDoc](https://docs.aws.amazon.com/sdk-for-go/api/service/dynamodb/#DynamoDB)に記載されています。"Thread Safe"とか、"goroutine Safe"とか、"Concurrency Safe" とかで調べると見つけやすいと思います。この辺りをのクライアントを毎回生成せず、再利用できるものはフィールドに持たせようという指摘は比較的多いです。


```go
// 💬 毎回フィールドでDynamoDBクライアントを生成
func handler(w http.ResponseWriter, r *http.Request) {
    var db = dynamodb.New(session.Must(session.NewSession())

    // 中略
    out, err := db.UpdateItemWithContext(ctx, &dynamodb.GetItemInput{
    TableName: aws.String("<exmaple-table>"),
        Key: map[string]*dynamodb.AttributeValue{
            "user_id": {
                N: aws.String("1"),
            },
        },
    }
    // 中略
}

// 🚀 goroutine Safeなものはフィールドに置いて再利用
var db = dynamodb.New(session.Must(session.NewSession())

func handler(w http.ResponseWriter, r *http.Request) {
    // 中略
    out, err := db.UpdateItemWithContext(ctx, &dynamodb.GetItemInput{
    TableName: aws.String("<exmaple-table>"),
        Key: map[string]*dynamodb.AttributeValue{
            "user_id": {
                N: aws.String("1"),
            },
        },
    }
    // 中略
}
```


### 9. Structの初期化処理はまとめる

GoのネストしたStructの作成は親子同時に行えるので、一度に宣言したほうが構造が使い見やすい分お得だと思います。

```go
	// 💬 ネストしたStructの方を先に宣言してから、後で親側にセット
	args := []command.Arg{
		{"media_type", control.MediaType},
		{"live_streaming_enabled", fmt.Sprintf("%v", control.LiveStreamingEnabled)},
		{"device_id", deviceID},
	}
	req := &command.Command{
		Func: control.CommandType,
		Args: args,
	},

	// 🚀 これくらいであれば一度に宣言してしまう方が見やすい
	req := &command.Command{
	Func: control.CommandType,
	Args: []command.Arg{
		{"media_type", control.MediaType},
		{"live_streaming_enabled", fmt.Sprintf("%v", control.LiveStreamingEnabled)},
		{"device_id", deviceID},
	},
	}
```

他のWebAPIでネストしたJSONをPOSTする時によくこういったコードが生まれやすい気がします。やりすぎは禁物ですがコレくらいであればargsの一時変数代入を行わずreqを作成したいですね。


### 10. Structのフィールドを利用した判定ロジックを呼び出し元ではなくStruct側に寄せていく

Structがデータを出し入れするだけの用途になることはよくあると思います。Structからデータを取得してif/forなどで処理をしているロジックがあれば、それはレシーバ側に寄せることを検討してみると良いかなと思います。

```go
// 💬 センサーデータを表現するStructがあり、値の取得ロジックを利用側で実装しているイメージ
type SensorData struct {
	SensorType string
	ModelID string
	Value int64
}

func ReadValue(r SensorReading) int64 {
	if r.ModelID == "P0AUK100B" {
		return r.Value
	}

	if r.SensorType == "D001" {
		return r.Value * 1/100 // 何かしらの補正ロジック
	}
	return r.Value * 1/10 // 何かしらの補正ロジック
}

// 🚀 レシーバに実装する
func (r SensorData) ReadValue() int64 {
	if r.ModelID == "P0AUK100B" {
		return r.Value
	}

	if r.SensorType == "振動系" {
		return r.Value * 1/100 // 何かしらの補正ロジック
	}
	return r.Value * 1/10 // 何かしらの補正ロジック
}
```

上記のように寄せる意図は、単体テストを書きやすくなるというメリットが特にあると思います。後述するTableDrivenTestsにも繋げやすくなります。

```go Struct側に実装するとテストがしやすい
func TestReadValue(t *testing.T) {
	r := SensorReading{
		SensorType: "D001",
		ModelID:    "00CCK100W",
		Value:      12345,
	}

	if r.ReadValue() != 1234.5 {
		t.Fatal("want 123 but got ", r.ReadValue())
	}
}
```

また、ロジックが呼び出し側に散らばらず、自然とデータを保持するStructが扱う業務ドメインのモデルぽく成長するメリットもあります。レシーバに寄せた後も、`if r.ModelID == "P0AUK100B"` ってどういう意味だろうかとか（プロトタイプの製品コードのイメージ）、なんで `1/100` するんだとかは、定数に切ったり別の説明関数を切ったりすることで、自己説明的なコードになるし、さらに細かくテストもしやすくなるし、今後プロトタイプ判定処理を拡張しようとした時に見通しを立てやすくと思います。

```go
func (r SensorData) IsprototypeModel() bool {
	return r.ModelID == "P0AUK100B"
}

func (r SensorData) ReadValue() int64 {
	if r.IsprototypeModel() {
		return r.Value
	}
	// 中略
}
```

この話はDDDの話題とおそらく近くて好みが分かれそうなところですが、せっかくレシーバという機能がGoにあるのでドンドン使っていって、細かい粒度でテストを書いていこうよと話しています。


### 11. panicやlog.Fatalはmain関数でのみ利用し、その他の関数はreturn errする

Goのエラーハンドリングですが、よく言われるように、**main関数以外**で`panic`や`os.Exit(1)`や`log.Fatal`を行うのは原則禁止です。テストがしにくいといったことが理由です。

```go
// 💬アルバイト勢がよく書いていたコード。なぜかよく指摘した
func example() error {
	// 中略
	if err := anyWork() {
		panic(err)
	}
}

// 🚀returnして最終的なハンドリングはmain関数かそれに相当する上位の関数でハンドリングする
func example() error {
	// 中略
	if err := anyWork() {
		return err
	}
}
```

この辺りのお作法チックな指摘は、最初はしっくり来ない人が多いのか、業務でコードを書くのは初めてといった新卒さんやアルバイトerなメンバーによく指摘してる気がします。


### 12. デバック用の標準出力はレビュー時には削除し、必要であればloggerを用いる

`fmt.Println` が大量に書かれたコードのレビューをすると、試行錯誤の経緯が垣間見れるような気がして癒やされますよね。一方で、プロダクションコードにデバック用の標準出力は入れたくないので、消すかlogger経由にして欲しいと依頼するかGUIから消しちゃうことが多い気がします。

```go
	// 💬標準出力は辞めよう
	fmt.Println("■debug確認", v.Name)

	// 🚀レビュー時にはキレイキレイしておくか、どうしても必要ならlogger経由で出力する
	import	"github.com/rs/zerolog/log"

	log.Debug().Msgf("UserName: %s\n", v.Name)
```


### 13. errのスコープを小さくする工夫

ある関数がerrorのみを返す時にありがちなのですが、if文の中で関数を呼ばない方式だと、err1とerr2で変数名が被るので、連番方式になりがちです。この場合はよくerr2のreturn部分をerr1にするミスをおかしがちです。

```go
	// 💬 複数のerrがある場合は、連番方式になる（経験上）
	err1 := PostArticle(article)
	if err1 != nil {
		return err1
	}
	err2 := UpdateIndex(article)
	if err2 != nil {
		return err2 // ⚠️よくここが err1 になってしまいバグの原因に⚠️
	}

	// 🚀 errorのスコープをif文に閉じ込める
	if err := PostArticle(article); err != nil {
		return err
	}
	if err := UpdateIndex(article); err != nil {
		return err
	}
```

そのため、慣れるまで違和感が残りますが、if文の中でerrを宣言 & ハンドリングするようにします。
複数の値を返す関数の場合でも、なるべく err1, err2といった変数を作らないようにする方が、バグ🐞を埋め込む確率を下げることに繋がると思います。


### 14. return errについて

非常に細かい点ですが、高確率に突っ込むことが多いネタです。コードのとおりですがnilが自明な場合は、変数ではなくnilそのものの固定値を返したほうが、レビュー時の脳内メモリを減らせて助かるので、確認しながら書き換えています。

```go
	// 💬 複数のerrがある場合は、連番方式になる（経験上）
	resp, err := hoge()
	if err != nil {
		return nil, fmt.Errorf("context info: %w", err)
	}
	return resp, err // ⚠️ここのerrは必ずnilになるはず⚠️


	// 🚀 errorのスコープをif文に閉じ込める
	resp, err := hoge()
	if err != nil {
		return nil, fmt.Errorf("context info: %w", err)
	}
	return resp, nil // 自明であればnilにする
```

書き換え後のコードが前提になっている人は、最後のreturnでerrが残っているともしかしてnil以外の値が入るフローがあるのかと余計に考えてしまうそうです。



### 15. Return function callsでできるものは一時変数に代入しない

一時変数に格納して、そのままreturnするコードもありますが、関数をreturnから始めるのを恐れなくても良いと思います。変数textが無くなる分、ワーキングメモリが減ってレビューが楽になります。

```go
// 💬 一時変数への代入
func countTextLength(text string) int {
	text := utf8.RuneCountInString(text)
	return text
}

// 🚀 returnから開始することを恐れない
func countTextLength(text string) int {
	return utf8.RuneCountInString(text)
}
```

上記であればreturn firstを取る人も、`val, error := anyFunc()` みたいに多値を返す関数の場合、一時変数を準備する人が多いと思います。最初に紹介した、[Go言語で幸せになれる10のテクニック - Qiita](https://qiita.com/ksato9700/items/6228d4eb6d5b282f82f6)の記事に書いてあるとおり、Return function callsにするとスッキリします。

```go
// 💬 errチェックをしても、結局関数barの振る舞いは同じ
func bar(arg string) (*Example, error) {
	v, err := foo(arg)
	if err != nil {
		return nil, err
	}

	return v, nil
}

// 🚀 それであれば直接returnしちゃう
func bar(argstring) (*Example, error) {
	return foo(arg)
}
```

最後の `return foo(arg)` で良いじゃないかな？って提案は年に100回くらいしている気がします。コードも減るので、errorをWrapしない場合はこちらで省略できないか、注意すると良いんじゃないかと思います。


#### 16. コードコメント

コードのコメントについては、至言があるので引用します。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">コードには How<br>テストコードには What<br>コミットログには Why<br>コードコメントには Why not<br><br>を書こうという話をした</p>&mdash; Takuto Wada (@t_wada) <a href="https://twitter.com/t_wada/status/904916106153828352?ref_src=twsrc%5Etfw">September 5, 2017</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

これ以上は蛇足になりそうですが、、、あとはことAWS, GCPなどのサービスを利用する場合は、処理件数などの制約があるかと思いますので、そのリファレンスURLなどをコードに貼ることは有効だと思います。また、ライブラリの利用方法も特殊なものがあれば、GoDocのExampleコードのリンクを貼るのは有効です。[ソースコードのコメントに登場する URL の役割](https://ishiotks.hatenablog.com/entry/2019/02/02/143259)にもある通り、**無効になりにくい URL を使う** といったテクニックがあるので、リンク先の記事も確認してみて下さい

コードレビュー時には、正直自分が使ったことがないプロダクトにアクセスするコードの場合は、レビューがつらすぎるので、レビュイーに参考にしたURLを教えてもらったり、制約から来ているぽい数値の諸元を確認したりしています。この時、すでにコード上に参考URLが貼ってあれば、GitHub上のPullRequestのコメントで余計なやり取りが減らせるので、スピード感が増してお互い幸せかなと思っています。


## 🧪単体テスト

### 17. 単体テストの変数名

出身や育った環境の違い？で期待値と実際値を、`input/actual/expected`と呼んだり、`in/want/got`と呼んだりいくつかの文化圏があるようです。Goは `in/want/got`を採用することが多いようです。

```go
// 💬 正直、好みの世界だが..
cases := []struct {
	input        string
	expected     string
	expectedCode int
}{}


// 🚀 want。複数ある場合はwantCodeなどで区別する
cases := []struct {
	in       string
	want     string
	wantCode int
}{}
```

他にも入力値は `in` とすることが多そうです。次のTable Driven Testsではcaseと汎化されて、使う機会は少ないかも知れません。

### 18. Table Driven Tests

GoだとTable Driven Testsという、データを駆動にテストすることが推奨されています。

* https://github.com/golang/go/wiki/TableDrivenTests

このパターンになっていなくて、このパターンが導入できそうな場合、そっとTable Driven Testsっていうのがあってね、と声をかけることにしています。

```go
tests := []struct {
	// ...
}{}

for i, tt := range tests {
	t.Run(fmt.Sprintf("%d", i), func(t *testing.T) {
		got := TestFunction(tt.in)
		if got != tt.want {
			t.Errorf("failed for %v: got %v, want %v", tt.in, got, tt.want)
		}
	})
}
```

たとえ、テストパターンが1件でもTable Driven Testsで作成しておけば、後でケースを追加したいときも容易なので、基本的にこのスタイルでのテストを推奨しています。テスト駆動開発は自分たちのチームでは全員が取り組んでいないので、最初のPullRequestレビューではテストがない（！）事が多く、テストを書いてねってコメントすることも多いのも実はあります。（最終的には全て書くのですが）

テストに関してはbudougumi0617さんの[Goのtestを理解する in 2018 #go](https://budougumi0617.github.io/2018/08/19/go-testing2018/#table-driven-test)の記事にいつもお世話になっています。ありがとうございます。


# まとめ

独断と偏見による、コードレビューでよく指摘したことのまとめ記事でした。Goに入ればGoに従えっていうのはかなり浸透している気がしますが、ことライブラリの使い方や、AWSなどのクラウド上でアプリを動かす時といった観点での、こういったレビュー記事は観測した限りは比較的少なかったのでまとめました。

また、今回は省略した内容でよく指摘したのは、

* 「変数名や関数名やレシーバ名を短くしよう」
* 「Sliceのマージは`...`を使って`append`すると良いよ」
* 「関数の引数で同じ型が並んでいると省略できるよ」
* 「引数の並び順はcontext.Contextとか固い順にしようよ」
* 「引数の種類が多い場合はStructを作らない？」
* 「ファイルI/Oなどで一度に全部メモリに抱えず、1000件単位などでページングしながら処理しよう」

とか色々ありましたが、このへんは別の記事でもよく上げられていたので省略しました。

他にもライブラリの使い方や、クラウドで動かすアプリ開発で汎用的なネタが集まりましたら、ここに追記予定です。

Go案件も色々増えてきていますので、興味がある方はお気軽にリモート飲み会（お茶会）しましょう☕🍻。興味がある方はフューチャーぽいメンバーにDMください。

ここまで読んでいただいてありがとうございました。


