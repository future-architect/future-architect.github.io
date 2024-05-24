---
title: "DynamoDB×Go連載#2 AWS SDKによるDynamoDBの基本操作"
date: 2020/02/27 08:25:12
postid: ""
tag:
  - Go
  - AWS
  - DynamoDB×Go
  - DynamoDB
category:
  - Programming
author: 武田大輝
lede: "DynamoDB×Go連載企画の第2弾の記事となります。本記事ではサードパーティ製のライブラリを利用せずaws-sdkを素で利用した場合のDynamoDBの基本操作について見ていきましょう。"
---

こんにちは。TIG DXユニット [^1]の武田です。

 [^1]: Technology Innovation Groupの略で、フューチャーの中でも特にIT技術に特化した部隊です。その中でもDXチームは特にデジタルトランスフォーメーションに関わる仕事を推進していくチームです。

## はじめに

[DynamoDB×Go連載企画](/tags/DynamoDB%C3%97Go/)第2弾の記事となります。
[DynamoDB×Go連載#1 GoでDynamoDBでおなじみのguregu/dynamoを利用する](/articles/20200225/) では [guregu/dynamo](https://github.com/guregu/dynamo) を利用したDynamoDBの基本操作をご紹介しました。

本記事ではサードパーティ製のライブラリを利用せずaws-sdkを素で利用した場合のDynamoDBの基本操作について見ていきましょう。
なお、公式のドキュメントは下記になりますので、より詳細な情報はこちらを参照してください。
https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/welcome.html

## 環境情報

* Go: 1.13.8
* aws-sdk-go: v1.29.10

## 検証環境の準備

第1回の記事同様 `DynamoDB Local` を利用してローカル環境を準備します。
https://future-architect.github.io/articles/20200225/

## 事前準備

### SDKのセットアップ

セッション及びDynamoDBを操作するクライアントを作成します。

```go クライアントの生成
	// Create session.
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))
	// Create DynamoDB client.
	db := dynamodb.New(sess, &aws.Config{Endpoint: aws.String("http://localhost:8000")})
```

オプションの `SharedConfigState` に `SharedConfigEnable` を設定することで `~/.aws/config` 内を参照してくれるようになります。

### レコードを表現する構造体の定義

```go 構造体定義
type Item struct {
	MyHashKey  string `dynamodbav:"MyHashKey"`
	MyRangeKey int    `dynamodbav:"MyRangeKey"`
	MyText     string `dynamodbav:"MyText"`
}
```

`dynamodbav` というタグを利用することで、DynamoDBのキーを指定して構造体とマッピングすることができます。
省略した場合は構造体のキー名がそのまま利用されます。

## 基本的なCRUD

### Create

利用するメソッドは `PutItem` です。

```go Create処理
	item := Item{
		MyHashKey:  "00001",
		MyRangeKey: 1,
		MyText:     "some text...",
	}
	// Convert item to dynamodb attribute.
	av, err := dynamodbattribute.MarshalMap(item)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	// Create an input.
	input := &dynamodb.PutItemInput{
		TableName: aws.String("MyFirstTable"),
		Item:      av,
	}
	// Execute.
	_, err = db.PutItem(input)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
```

`dynamodbattribute.MarshalMap` を利用して構造体を `dynamodb attribute` に変換する必要がある点がポイントです。

### Read

利用するメソッドは `GetItem` です。

```go Read処理
	// Create an input.
	input := &dynamodb.GetItemInput{
		TableName: aws.String("MyFirstTable"),
		Key: map[string]*dynamodb.AttributeValue{
			"MyHashKey": {
				S: aws.String("00001"),
			},
			"MyRangeKey": {
				N: aws.String("1"),
			},
		},
	}
	// Execute.
	result, err := db.GetItem(input)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	// Convert the dynamodb result to a struct.
	item := Item{}
	err = dynamodbattribute.UnmarshalMap(result.Item, &item)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	fmt.Println(item) // {00001 1 some text...}
```

`GetItemInput` を作成する際に、キー属性を指定する必要があります。
取得した結果は `dynamodbattribute.UnmarshalMap` を利用して任意の構造体にマッピングできます。

### Update

利用するメソッドは `UpdateItem` です。
どのキーをどの値に更新するかを指定する必要があるため、少しコードが複雑になります。

```go　Update処理
	// Create an expression for update.
	update := expression.UpdateBuilder{}.Set(expression.Name("MyText"), expression.Value("updated text"))
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	// Create an input.
	input := &dynamodb.UpdateItemInput{
		TableName: aws.String("MyFirstTable"),
		Key: map[string]*dynamodb.AttributeValue{
			"MyHashKey": {
				S: aws.String("00001"),
			},
			"MyRangeKey": {
				N: aws.String("1"),
			},
		},
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		UpdateExpression:          expr.Update(),
		ConditionExpression:       expr.Condition(),
		ReturnValues:              aws.String(dynamodb.ReturnValueAllNew),
	}
	// Execute.
	_, err = db.UpdateItem(input)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
```

`UpdateBuilder`, `ExpressionBuilder` を利用して、更新式を作成します。
`ConditionBuilder` を利用して更新条件を指定することもできます。

### Delete

利用するメソッドは `UpdateItem` です。

```go Delete処理
	// Create an input.
	input := &dynamodb.DeleteItemInput{
		TableName: aws.String("MyFirstTable"),
		Key: map[string]*dynamodb.AttributeValue{
			"MyHashKey": {
				S: aws.String("00001"),
			},
			"MyRangeKey": {
				N: aws.String("1"),
			},
		},
	}
	// Execute.
	_, err := db.DeleteItem(input)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
```

## guregu/dynamo との比較

コードを見てわかるとおり、aws-sdkを素で利用する方が筋力が必要になります。
ただし筆者はメンテナンス性を考慮し、極力サードパーティ性のライブラリには依存したくない（特にアプリのコアとなる部分は）という思いもあり、aws-sdkのみを利用する方針をとっています。

とはいえ `attribute` や `expression` を極力書きたくない、書かせたくないという思いもあり、
汎用的な処理については共通メソッドを構えるようにしていました。

例えばGETのイメージは下記の感じです。

```go 共通的なメソッド
func (repo *BaseRepository) get(req, res domain.Domain, consistent bool) error {
	key, err := repo.KeyAttributes(req)
	if err != nil {
		return errors.Wrap(err, "failed to get DynamoDB key attributes")
	}
	input := &dynamodb.GetItemInput{
		TableName:      repo.Table(),
		Key:            key,
		ConsistentRead: aws.Bool(consistent),
	}
	// Execute.
	output, err := repo.DB.GetItem(input)
	if err != nil {
		return errors.Wrapf(err, "failed to execute DynamoDB Get API to %s", *repo.Table())
	}
	if len(output.Item) == 0 {
		return exception.NewNotFoundError("")
	}
	if err = dynamodbattribute.UnmarshalMap(output.Item, &res); err != nil {
		return errors.Wrap(err, "failed to DynamoDB unmarshal")
	}
	return nil
}

// KeyAttributes returns a map of *dymanodb.AttributeValue that is dynamodb table key from the passed struct.
func (repo *BaseRepository) KeyAttributes(domain interface{}) (map[string]*dynamodb.AttributeValue, error) {
	return repo.attributes(domain, func(tag reflect.StructTag) bool {
		_, ok := tag.Lookup("dynamodbkey")
		return ok
	})
}

func (repo *BaseRepository) attributes(domain interface{}, condition func(tag reflect.StructTag) bool) (map[string]*dynamodb.AttributeValue, error) {
	rv := reflect.Indirect(reflect.ValueOf(domain))
	if rv.Kind() != reflect.Struct {
		return nil, errors.New("domain must be a struct")
	}
	// Create dynamodb attributes.
	attr, err := dynamodbattribute.MarshalMap(rv.Interface())
	if err != nil {
		return nil, err
	}
	// Delete attributes by condition.
	var deleteAttr func(rv reflect.Value)
	deleteAttr = func(rv reflect.Value) {
		for i, rt := 0, rv.Type(); i < rv.NumField(); i++ {
			if rv.Field(i).Kind() == reflect.Struct && rt.Field(i).Anonymous {
				deleteAttr(rv.Field(i))
				continue
			}
			name, tag := rt.Field(i).Name, rt.Field(i).Tag
			if !condition(tag) {
				if dynamodbav := tag.Get("dynamodbav"); dynamodbav != "" {
					delete(attr, strings.Split(dynamodbav, ",")[0])
				} else {
					delete(attr, name)
				}
			}
		}
	}
	deleteAttr(rv)
	return attr, nil
}
```

同様にUpdate, Create, Deleteも汎化することで、呼び出し元の実装は極めてシンプルにすることができてました。
もちろんより複雑なことをやろうとするとコードも煩雑になり、それこそ `dynamodb/guregu` 相当のものを再開発することになりかねません。
ある程度の制約を設けるなどしてDynamoDBの利用シーンをシンプルにできるのであるのであれば、筆者はaws-sdkのみの利用を推奨します。

## 最後に

第2段の記事はいかがだったでしょうか。
gureguなどサードパーティ製のライブラリの利用と迷っている方の参考になれば幸いです。

それでは、明日の投稿もお楽しみに。

[DynamoDB×Go連載企画](/tags/DynamoDB%C3%97Go/)以外にも多くの連載企画があります。特にGo Cloud連載が今回のテーマに近いです。

* [Go Cloud 連載](/tags/GoCDK/)
* [GCP 連載](/articles/20200202/)
* [Auth0 連載](/tags/Auth0/)
