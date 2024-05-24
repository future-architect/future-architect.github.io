---
title: "DynamoDB×Go連載#1 GoでDynamoDBでおなじみのguregu/dynamoを利用する"
date: 2020/02/25 10:32:43
postid: ""
tag:
  - Go
  - AWS
  - DynamoDB×Go
  - DynamoDB
category:
  - Programming
author: 村田靖拓
lede: "Go言語でWebサーバを実装していた際にDynamoDBを扱うライブラリとしてGregさんの https://github.com/guregu/dynamo を使っていました。当時Go初心者だった私は「go dynamo」とすぐさまGoogle先生に問い合わせ、「guregu/dynamoがオススメ」とのエントリーを多数発見しました。オブジェクトの取り回しが隠蔽化されていてとにかく実装が簡単だと記事にも書いてありましたし、私自身も実際そう感じました。"
---

# はじめに
こんにちは、村田です。Go言語でWebサーバを実装していた際にDynamoDBを扱うライブラリとしてGregさんの https://github.com/guregu/dynamo を使っていました。（2年ほど稼働していますが、特に問題も出ていません）

当時Go初心者だった私は「go dynamo」とすぐさまGoogle先生に問い合わせ、「guregu/dynamoがオススメ」とのエントリーを多数発見しました。オブジェクトの取り回しが隠蔽化されていてとにかく実装が簡単だと記事にも書いてありましたし、私自身も実際そう感じました。

すでにタイトルからお察しかと思いますが、本記事は連載第1回目です。時代の移ろいに合わせてDynamoDB×Go界隈の事情も刻一刻と変化しています。まずは私の利用していたSDK(guregu/dynamo)についてから本連載をスタートします。

# SDK(guregu/dynamo)を使ってDynamoDBへアクセスする

## ローカルの検証環境を準備

ソースコードに触る前にまずは環境の準備から。
DynamoDB LocalをDocker上で動かすのが楽なので今回はそちらを使います。

```bash DynamoDB-Localのインストール
$ docker pull amazon/dynamodb-local
$ docker run -d --name dynamodb -p 8000:8000 amazon/dynamodb-local
```

DynamoDB Localへのアクセスはaws cliを利用するのでそちらも準備します。アクセス時はEndpointのURLを引数で指定してあげる必要があります。

```bash AWSCLIのテスト_失敗
$ aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-1
Unable to locate credentials. You can configure credentials by running "aws configure".
```

怒られちゃいました...
FakeでもいいのでCredentialを指定しなければならないので `aws configure` を使って指定します。

```bash デフォルトのProfile作成
$ aws configure
AWS Access Key ID [None]: fake
AWS Secret Access Key [None]: fake
Default region name [None]: ap-northeast-1
Default output format [None]: json
```

...ということで気を取り直して、

```bash AWSCLIのテスト_成功
$ aws dynamodb list-tables --endpoint-url http://localhost:8000
{
    "TableNames": []
}
```

OKそうですね。あとはテーブルを作成したら準備OKです。
今回は以下のようなスキーマでテーブルを作成します。

* テーブル名
    * `MyFirstTable`
* HashKey
    * `MyHashKey` - `S`
* RangeKey
    * `MyRangeKey` - `N`

```bash DynamoDBテーブル作成
$ aws dynamodb create-table --endpoint-url http://localhost:8000 --table-name MyFirstTable --attribute-definitions AttributeName=MyHashKey,AttributeType=S AttributeName=MyRangeKey,AttributeType=N --key-schema AttributeName=MyHashKey,KeyType=HASH AttributeName=MyRangeKey,KeyType=RANGE --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1
{
    "TableDescription": {
        "TableArn": "arn:aws:dynamodb:ddblocal:000000000000:table/MyFirstTable",
        "AttributeDefinitions": [
            {
                "AttributeName": "MyHashKey",
                "AttributeType": "S"
            },
            {
                "AttributeName": "MyRangeKey",
                "AttributeType": "N"
            }
        ],
        "ProvisionedThroughput": {
            "NumberOfDecreasesToday": 0,
            "WriteCapacityUnits": 1,
            "LastIncreaseDateTime": 0.0,
            "ReadCapacityUnits": 1,
            "LastDecreaseDateTime": 0.0
        },
        "TableSizeBytes": 0,
        "TableName": "MyFirstTable",
        "TableStatus": "ACTIVE",
        "KeySchema": [
            {
                "KeyType": "HASH",
                "AttributeName": "MyHashKey"
            },
            {
                "KeyType": "RANGE",
                "AttributeName": "MyRangeKey"
            }
        ],
        "ItemCount": 0,
        "CreationDateTime": xxxxx
    }
}

```

ちなみにですが、DynamoDB Localの場合は設定したCapacity Unitは考慮されないので適当な値を設定しても問題ありません。

## ソースコード書いていきます
※ソースは全て https://github.com/mura123yasu/go-guregu-dynamo にアップしているので適宜参考にしてください。

### クライアントを準備
環境変数から諸々の値を取得するようにしつつ、クライアントを生成します。
テーブル名は先程作成した `MyFirstTable` を設定します。

```go クライアント生成
func main() {
	// クライアントの設定
	dynamoDbRegion := os.Getenv("AWS_REGION")
	disableSsl := false

	// DynamoDB Localを利用する場合はEndpointのURLを設定する
	dynamoDbEndpoint := os.Getenv("DYNAMO_ENDPOINT")
	if len(dynamoDbEndpoint) != 0 {
		disableSsl = true
	}

	// デフォルトでは東京リージョンを指定
	if len(dynamoDbRegion) == 0 {
		dynamoDbRegion = "ap-northeast-1"
	}

	db := dynamo.New(session.New(), &aws.Config{
		Region:     aws.String(dynamoDbRegion),
		Endpoint:   aws.String(dynamoDbEndpoint),
		DisableSSL: aws.Bool(disableSsl),
	})

	table := db.Table("MyFirstTable")
	// (以下略)
}
```

### 単純なCRUD
ここからはCRUD処理の実装を進めます。

#### Create
Createで利用するメソッドは `Put` です。

Put対象のitemを準備して渡すだけで簡単ですが1点注意事項があります。itemはPut先テーブルのKeyをすべて含むものでなければなりません。今回であれば `MyHashKey` と `MyRangeKey` です。

```go Create処理
func main() {
	// (略)

	// 単純なCRUD - Create
	item := Item{
		MyHashKey:  "MyHash",
		MyRangeKey: 1,
		MyText:     "My First Text",
	}

	if err := table.Put(item).Run(); err != nil {
		fmt.Printf("Failed to put item[%v]\n", err)
	}
	// (略)
}
```

#### Read
Readで利用するメソッドは `Get` です。他にも `Scan` も使えるので用途に合わせて色々試してみて下さい。

私達が実装したWebサーバでは、DynamoDBに対するアクセスはキーアクセスのみに限定していたため、Getの利用で事足りました。

```go Read処理
func main() {
	// (略)

	// 単純なCRUD - Read
	var readResult Item
	err = table.Get("MyHashKey", item.MyHashKey).Range("MyRangeKey", dynamo.Equal, item.MyRangeKey).One(&readResult)
	if err != nil {
		fmt.Printf("Failed to get item[%v]\n", err)
	}
	// (略)
}
```

#### Update
利用するメソッドは `Update` です。

少し余談にはなるのですが、Webサーバ実装時はUpdateは使いませんでした。常にPut処理を行っており、全体シーケンスを検討する中で冪等性を保つためにそのような設計にしていました。

```go Update処理
func main() {
	// (略)

	// 単純なCRUD - Update
	var updateResult Item
	err = table.Update("MyHashKey", item.MyHashKey).Range("MyRangeKey", item.MyRangeKey).Set("MyText", "My Second Text").Value(&updateResult)
	if err != nil {
		fmt.Printf("Failed to update item[%v]\n", err)
	}
	// (略)
}
```

#### Delete
利用するメソッドは `Delete` です。

Keyさえ指定していれば問題ないのは他メソッドと変わりません。

```go Delete処理
func main() {
	// (略)

	// 単純なCRUD - Delete
	err = table.Delete("MyHashKey", item.MyHashKey).Range("MyRangeKey", item.MyRangeKey).Run()
	if err != nil {
		fmt.Printf("Failed to delete item[%v]\n", err)
	}
	// (略)
}
```

### Conditional Check
これはもうゴリゴリに使い倒しました。以下の例はとてもシンプルなものですが、実際には `If("MyText = ?", "some word")` の部分に様々な条件を記載します。書き方は色々あるので必要に応じて確認してみてください。

```go ConditionalCheck処理
func main() {
	// (略)

	// Conditional Check
	err = table.Delete("MyHashKey", item.MyHashKey).Range("MyRangeKey", item.MyRangeKey).If("MyText = ?", "some word").Run()
	if err != nil {
		fmt.Printf("Failed to delete item with conditional check[%v]\n", err)
	}
	// (略)
}
```

要件を満たすためにほぼほぼマストで必要だったConditional Checkですが、しっかり設計しておかないと一番泣きを見ることになる部分になります。

例えば、開発当時ロックの機構をこのConditional Checkで実現しており、ロック取得者以外がレコードを更新できないようになど制御をかけていたのですが、一連のシーケンスの中で予期しない割り込みが発生すると永遠に更新できないレコードが登場し...もちろん設計ミスによるものですが、とても苦しみました。（原因究明の時間は非常に楽しかった記憶もありますが笑）

### 一連のソースを実行してみる

さて、紹介してきた一連の動作を最後に実行してみましょう。DynamoDB Localを使用する場合は環境変数にて `DYNAMO_ENDPOINT` だけ指定してRunするだけ。簡単ですね。

```sh 実行
$ git checkout https://github.com/mura123yasu/go-guregu-dynamo.git
$ export DYNAMO_ENDPOINT=http://localhost:8000
$ go run main.go
```

※ちなみにコミットしているソースはConditional CheckのUpdateだけが失敗しますが、想定通りなので問題ありません。

# 最後に
連載初日の記事はいかがだったでしょうか？レベル的には初学者の方に向けた内容だったかなと思います。「まずはGo言語でDynamoDBをつついてみたい」という方が本記事を通じて簡単にチャレンジできたら幸いです。

[DynamoDB×Go連載企画](/tags/DynamoDB%C3%97Go/) の1本目でした。次は武田さんの[AWS SDKによるDynamoDBの基本操作](/articles/20200227/)です。


DynamoDB×Go以外にも多くの連載企画があります。特にGo Cloud連載が今回のテーマに近いです。

* [Go Cloud 連載](/tags/GoCDK/)
* [Auth0 連載](/tags/Auth0/)
