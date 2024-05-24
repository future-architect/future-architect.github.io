---
title: "AWS SDK for GoでDynamoDBの式を扱うヘルパーパッケージの使い方"
date: 2021/10/25 00:00:00
postid: a
tag:
  - AWS
  - DynamoDB
  - Go
  - 式
category:
  - Programming
thumbnail: /images/20211025a/thumbnail.png
author: 真野隼記
lede: "DynamoDBをGoで操作することにかけては、[DynamoDB×Go連載] に参加するくらい関心があるのですが、AWS SDK for Goの公式ライブラリに含まれる、ヘルパーパッケージについて存在を今までスルーしていました。使ってみると業務的には利用一択だと思ったので今後使っていくぞという覚書としてまとめます。"
---
<img src="/images/20211025a/top.png" alt="" width="1200" height="676">

by [Renée French](http://reneefrench.blogspot.com/)

## はじめに

TIG真野です。

DynamoDBをGoで操作することにかけては、[DynamoDB×Go連載](/tags/DynamoDB%C3%97Go/) に参加するくらい関心があるのですが、AWS SDK for Goの公式ライブラリに含まれる、ヘルパーパッケージについて存在を今までスルーしていました。使ってみると業務的には利用一択だと思ったので今後使っていくぞという覚書としてまとめます。


## DynamoDBの式をダイレクトに実装した例

私は公式のAWS SDK for Goの[dynamodbパッケージ](https://docs.aws.amazon.com/sdk-for-go/api/service/dynamodb/)を用いる時に、ドキュメントのExampleに書いてあるように、ちまちま `ExpressionAttributeNames`や`ExpressionAttributeValues`や`FilterExpression`や`ProjectionExpression`を指定していました。

どんな感じかと言うと次のような感じです。

```go Exampleに書いてあるような実装例
func ScanMusic() {

    db := dynamodb.New(session.Must(session.NewSession()))

    result, err := db.Scan(&dynamodb.ScanInput{
        ExpressionAttributeNames: map[string]*string{
            "#AT": aws.String("AlbumTitle"),
            "#ST": aws.String("SongTitle"),
        },
        ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
            ":a": {
                S: aws.String("No One You Know"),
            },
        },
        FilterExpression:     aws.String("Artist = :a"),
        ProjectionExpression: aws.String("#ST, #AT"),
        TableName:            aws.String("Music"),
    })
    if err != nil {
        // エラーハンドリング
    }

    var recs []Record
    if err := dynamodbattribute.UnmarshalListOfMaps(page.Items, &recs); err != nil {
        // エラーハンドリング
    }

}
```

これはこれで、DynamoDBのREST APIの仕様に詳しくなれるのと、AWS CLIを用いたDynamoDBアクセスする時と知識を流用できるので学びにはなるのですが、利用項目や条件が増えてくるとレビュー観点でツライですし、自分が実装するときも`ExpressionAttributeNames` が抜けていてエラーになるなど、生産性という意味では開発者側が試されているなと感じることが多かったです。

## ヘルパーパッケージの福音


業務でも様々な技術ブログでも DynamoDB SDK for Goを実装するときは上記のような設定をするコードをよく見ますが、実は公式に便利なヘルパーが用意されています。 `expression` パッケージです。式の組み立て全般をサポートしてくれるビルダーを提供してくれます。

* https://docs.aws.amazon.com/sdk-for-go/api/service/dynamodb/expression/


`expression`パッケージ を用いると、`ExpressionAttributeNames` や `ExpressionAttributeValues` や `FilterExpression` などのDynamoDBの式を型安全に構築することができます。例をあげます。

```go
func ScanMusic() {

	filt := expression.Name("Artist").Equal(expression.Value("No One You Know"))
	proj := expression.NamesList(expression.Name("SongTitle"), expression.Name("AlbumTitle"))
	expr, err := expression.NewBuilder().WithFilter(filt).WithProjection(proj).Build()
	if err != nil {
		// エラーハンドリング
	}

	db := dynamodb.New(session.Must(session.NewSession()))
	result, err := db.Scan(&dynamodb.ScanInput{
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		FilterExpression:          expr.Filter(),
		ProjectionExpression:      expr.Projection(),
		TableName:                 aws.String("Music"),
	})
	if err != nil {
		// エラーハンドリング
	}
}
```

`expression` パッケージを利用して、フィルター条件やプロジェクション式を構築しています。ややコードとしては長くなりましたが、`dynamodb.ScanInput` のフィールドがの設定が一律シンプル下したことがわかります。この勢いで `TableName` も `expr` から指定したい気もしますが、それはパッケージの担当外なようです。

サンプルコードだけ見ると、心理的なハードルが高く思えるかもしれませんが、そもそも元の実装にあるような、`ExpressionAttributeNames` や `ExpressionAttributeValues` や `FilterExpression` の記載方法を覚え、正しく使用することの方が大変です。 `expression` パッケージを用いると、何かしら指定が論理的に正しくない場合は、式のビルド時にエラーで検知することができるため、開発時のトラブルシュートにも役立つと思います。

AWS SDK for Goを生で用いてDynamoDBアクセスを行うのであれば、基本的には積極的に使っていくパッケージでしょう。


## 論理式

先程の例ではEqualでしたが、ドキュメントを見る通り、AND, OR, NotEqualや、LessThan, GreaterThan などなど、一通りの演算子が揃っています。選び放題・使い放題のガッツがあるパッケージです。

https://docs.aws.amazon.com/sdk-for-go/api/service/dynamodb/expression/

例えばフィルターで、Artistが Red, Green, Blue のどれかという条件を指定すると以下のようになります。

```go OR条件を指定した例
	filt := expression.Name("Artist").Equal(expression.Value("Red")).
		Or(expression.Name("Artist").Equal(expression.Value("Green"))).
		Or(expression.Name("Artist").Equal(expression.Value("Blue")))

	proj := expression.NamesList(expression.Name("SongTitle"), expression.Name("AlbumTitle"))

	expr, err := expression.NewBuilder().WithFilter(filt).WithProjection(proj).Build()
	if err != nil {
		// エラーハンドリング
	}
```

もちろんAND, ORをネスト化することもできます。`Artist` が `Blue` のときは `Year` が `2021` 年であると追加します。

```go ネストした条件
	filt := expression.Name("Artist").Equal(expression.Value("Red")).
		Or(expression.Name("Artist").Equal(expression.Value("Green"))).
		Or(expression.Name("Artist").Equal(expression.Value("Blue")).
			And(expression.Name("Year").Equal(expression.Value("2021"))),
		)
```

式で表現すると `Artist == Red || Artist == Green || (Artist == Blue && Year == 2021)` といった感じでしょうか。式が複雑になる場合はこういった擬似コードでコメントの補足を入れると良いかなと思います。


## ProjectionExpressionを指定するのが面倒問題

`expression`パッケージを利用していくと、Projectionの設定が面倒な場合があります。

```go 面倒な例
	filt := expression.Name("Artist").Equal(expression.Value("No One You Know"))

	proj := expression.NamesList(expression.Name("SongTitle"),
		 expression.Name("AlbumTitle"),
		 expression.Name("Rate"),
		 expression.Name("PublishedAt"),
		 expression.Name("Price"))  // やたら数が多くなるし項目追加時に見逃しやすい

	expr, err := expression.NewBuilder().WithFilter(filt).WithProjection(proj).Build()
	if err != nil {
		// エラーハンドリング
	}
```

この場合は自前で一工夫すると良いでしょう。ヘルパー関数をさらに作っても良いかもしれません。

```go
	filt := expression.Name("Artist").Equal(expression.Value("No One You Know"))

	var names []expression.NameBuilder
	for _, name := range []string{"SongTitle", "AlbumTitle", "Rate", "PublishedAt", "Price"} {
		names = append(names, expression.Name(name))
	}
	proj := expression.NamesList(names[0], names[1:]...)

	expr, err := expression.NewBuilder().WithFilter(filt).WithProjection(proj).Build()
	if err != nil {
		// エラーハンドリング
	}
```

このあたりを作り込みすぎると、独自DSLを作るような感じになるかと思いますが、愚直に書きすぎると表現の密度が下がりすぎて保守がツライ場合もあるので、バランスを見て取り入れて行くと良いかなと思います。


## クエリの場合

先程まではScanの例でしたが、Queryの場合はさらに `expression` が役立ちます。ハッシュキーにDeviceID、ソートキーにTimestampという典型的な時系列データを保持するDeviceLogというテーブルに対しての実装例です。

```go クエリの実装例
var db = dynamodb.New(session.Must(session.NewSession()))

func QueryTable(ctx context.Context, deviceID string, start, end time.Time) {

	keyCond := expression.Key("DeviceID").Equal(expression.Value(deviceID)).
		And(expression.Key("Timestamp").Between(
				expression.Value(start.Format(time.RFC3339)),
				expression.Value(end.Format(time.RFC3339))))

	filterCond := expression.Name("DeviceType").Equal(expression.Value("Normal")).
		And(expression.Name("CreatedYear").GreaterThan(expression.Value(2018)))

	expr, err := expression.NewBuilder().WithKeyCondition(keyCond).WithFilter(filterCond).Build()
	if err != nil {
		// エラーハンドリング
	}

	result, err := db.QueryWithContext(ctx, &dynamodb.QueryInput{
		KeyConditionExpression:    expr.KeyCondition(),
		ProjectionExpression:      expr.Projection(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		FilterExpression:          expr.Filter(),
		TableName:                 aws.String("DeviceLog"),
	})
	if err != nil {
		// エラーハンドリング
	}

}
```

あるデバイスに対して、開始～終了日時を指定し、さらに適当なフィルター条件も追加しました。クエリの場合は、`KeyConditionExpression`と `FilterExpression` の両方が設定できるため、`expression` パッケージを利用しない時は`ExpressionAttributeNames` と `ExpressionAttributeValues` の管理が煩雑になりがちでした。


## Update Expression

DynamoDBに対するUpdate式も、クエリと同様になかなかとっつき難かったです。`expression`パッケージを用いない場合は、通常の文字列なのでカンマの位置などかなり気をつけることが多いです。

```go 実装例
var db = dynamodb.New(session.Must(session.NewSession()))

func Update(ctx context.Context) {

	_, err := db.UpdateItemWithContext(ctx, &dynamodb.UpdateItemInput{
		TableName:        aws.String("Music"),
		Key: map[string]*dynamodb.AttributeValue{
			"Artist": {
				S: aws.String("Acme Band"),
			},
			"SongTitle": {
				S: aws.String("Happy Day"),
			},
		},
		ExpressionAttributeNames: map[string]*string{
			"#AT":  aws.String("AlbumTitle"),
			"#Y":   aws.String("Year"),
			"#REV": aws.String("Revision"),
			"#UPA": aws.String("UpdatedAt"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":t": {
				S: aws.String("Louder Than Ever"),
			},
			":y": {
				N: aws.String("2015"),
			},
			":inc": {
				N: aws.String("1"),
			},
			":upa": {
				S: aws.String(time.Now().UTC().Format(time.RFC3339)),
			},
		},
		UpdateExpression: aws.String("SET #Y = :y, #AT = :t, #UPA = :upa ADD #REV :inc"),
	})

	if err != nil {
		// エラーハンドリング
	}

}
```

これは `expression` パッケージを用いると次のようになります。

```go expressionを用いたUpdate
var db = dynamodb.New(session.Must(session.NewSession()))

func Update(ctx context.Context) {

	update := expression.Set(expression.Name("AlbumTitle"), expression.Value("Louder Than Ever")).
		Set(expression.Name("Year"), expression.Value("2015")).
		Set(expression.Name("UpdatedAt"), expression.Value(time.Now())).
		Add(expression.Name("Revision"), expression.Value(1))

	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		// エラーハンドリング
	}

	_, err := db.UpdateItemWithContext(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String("Music"),
		Key: map[string]*dynamodb.AttributeValue{
			"Artist": {
				S: aws.String("Acme Band"),
			},
			"SongTitle": {
				S: aws.String("Happy Day"),
			},
		},
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		UpdateExpression:          expr.Update(),
	})

	if err != nil {
		// エラーハンドリング
	}

}
```

式の構築部分が型セーフに実装できていることが分かると思います。

少し残念なのは、 `Key` の部分は `expr` から生成できないということでしょうか。ここだけはハッシュキー（とソートキー）をダイレクトに指定する必要があるので、レベル感がズレて勿体ない気がします。（KeyConditionのように指定したかったですね）


## まとめ

AWS SDK for Goの `dynamodb` パッケージを用いると時に必須とも言える、 `expression` パッケージの使い方について触れました。

`expression` パッケージを用いると、従来DynamoDBのAPI仕様を理解したフィールドや、文字列で式を設定する必要があった部分を、型安全に構築することができます。

いくつか残念なところはあるにしろ、メリットは計り知れないのでうまく活用していきたいですね。

