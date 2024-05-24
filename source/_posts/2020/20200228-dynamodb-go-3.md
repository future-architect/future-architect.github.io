---
title: "DynamoDB×Go#3 Go CDKでどこまでいける？機能を調べてみた"
date: 2020/02/28 10:13:26
postid: ""
tag:
  - Go
  - AWS
  - DynamoDB×Go
  - DynamoDB
  - GoCDK
  - バッチ処理
category:
  - Programming
thumbnail: /images/20200228/thumbnail.png
author: 真野隼記
lede: "DynamoDB×Go連載の第3弾目です。今までは AWS SDK Go やそれをラップしたguregu/dynamo について説明していましたが、 Go CDK（Go Cloud Development Kit） を用いたDynamoDB操作について説明します。"
---

<img src="/images/20200228/go-cdk-logo-gopherblue.png" class="img-middle-size" loading="lazy">

# はじめに

こんにちは、TIG DXユニット[真野](https://twitter.com/laqiiz)です。この技術ブログの運営もしています。

[DynamoDB×Go連載](/tags/DynamoDB%C3%97Go/)の第3弾目です。今までは `AWS SDK Go` やそれをラップした`guregu/dynamo` について説明していましたが、 **Go CDK（Go Cloud Development Kit）** を用いたDynamoDB操作について説明します。

# Go CDKとは？

> Go CDKは2018/07 に Google の Go チームが立ち上げたプロジェクトで、Go アプリケーションを各クラウド間でポータブルにすることを目指して、実装されています。

詳しくは [Go Cloud連載企画](/tags/GoCDK/) で全7回に渡って概要から各トピックについて説明しています。特に[第1回目](/articles/20191111/) の概要説明から読むことがオススメです。 DynamoDBを含むDocStoreについては[第3回目](/articles/20191113/)の記事を確認ください。

* Go CDK（公式）  https://gocloud.dev/
* [Go Cloud連載企画](/tags/GoCDK/)

※名称の揺れについてはGo CDKの方が正式名称ですが、ググラビリティが悪いかなと思い（特にAWS CDKと似ている）、連載版は古い呼び方であるGo Cloudを使わせてもらっていました。


# 記事の趣旨

ご存じの通り、DynamoDBはKVSと言われているものの、非常に多くの機能が存在します。KVSと名前だけ見ると、PK(Primary Key)に対してGet/Put/Deleteなどの基礎的なCRUD処理や、せいぜいそのBatch操作くらいしかできないイメージがありますよね。

しかし、実際のDynamoDBは遥かに高機能で **Global Secondary Index** や **Local Secondary Index** を用いたインデックスアクセスや、SortKeyを利用した範囲指定の**スキャン**、条件を指定した**クエリ**、**ConditionExpression** という用した既存レコードの有無といった条件付きの書き込み機能などが存在します。これらを組み合わせて[アトミックカウンターを作る参考記事](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.AtomicCounters) も公式からでていたり、条件付きではありますが[トランザクション](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/transaction-apis.html)を提供もしています。DynamoDBのクライアントアプリから直接操作することは少いでしょうが、DynamoDB StreamsやGlobal Tablesといった機能も便利ですよね。

一方で、Go CDKはこういったプロダクト固有の機能を隠蔽化・抽象化したAPIを提供するドライバなため、他のデータストアに切り替えたときでも利用可能なAPIしか提供しない設計になっています（はずです）。しかし、それは **DynamoDBの機能を100%使い切れないということと同義** なため、直感的にはリスクを避けるべくなるべくAWS公式のSDKを利用しようと考える方も多いのでは無いでしょうか？そういう短絡的な判断を避けるために、 **Go CDKが現時点でどこまで機能を網羅しているのか** 我々は知る必要があるでしょう。それがわかれば、この案件のユースケースではGo CDKの提供する機能で十分なため、Go CDKを利用しベンダーロックインのリスク低減を図ったり、Go CDKの提供する`memdocstore` といったモック機能を享受しようというより有意義な判断ができるはずです。

というわけで、どの程度DynamoDBの機能がGo CDKから利用できるのか調査していきます。なお、私はDynamoDBのプロフェッショナルではなくイチ開発者ですので色々漏れがあると思います。ぜひTwitterなどでフィードバックを頂ければと思います。


# 前提

なお、Go CDKは進化が早いため今回対応していないと判断したものも、実は記事の公開後に実装されている可能性があります。差分については [release-notes](https://github.com/google/go-cloud/releases) などから適時確認ください。

* 調査日: 2020/02/24
* Go 1.13.4
* Go CDK v0.19.0

# 調査結果

調査観点は以下としました。それぞれ○が一通りの機能が利用できる、△が一部利用可能、☓は機能提供がされていないということを示しています。

| # | Case                           | AWS SDK | Go CDK | Description |
|---|--------------------------------|-----------|-----------|-----------|
| 1 | 基本的なCRUD                   | ○     | ○          | 使いやすいAPIであるし、ハッシュキー、ソートキーともに利用できる       |
| 2 | バッチ処理のCRUD                | ○     | ○          | バッチ登録、バッチ検索など様々可能       |
| 3 | 条件付き書き込み                | ○     | △           | 楽観的ロックを用いたデータ操作が可能       |
| 4 | クエリ                          | ○    | ○           | WhereやOrderbyやLimitを実行できる        |


詳細を説明していきます。

# 実証コード

それぞれGoのコードベースで記載方法をまとめていきます。

第1回の記事同様 DynamoDB Local を利用してローカル環境を準備します。
https://future-architect.github.io/articles/20200225/


## 0. 事前準備

### SDKのセットアップ

セッション及びDynamoDBを操作するクライアントを生成します。

```go クライアントの生成
// Create session.
sess := session.Must(session.NewSessionWithOptions(session.Options{
	SharedConfigState: session.SharedConfigEnable,
}))

// Create DynamoDB client
db := dynamodb.New(sess, &aws.Config{Endpoint: aws.String("http://localhost:8000")})

// Open Collection via Go CDK
coll, err := awsdynamodb.OpenCollection(db, "MyFirstTable", "MyHashKey", "MyRangeKey", nil)
if err != nil {
	log.Fatal(err)
}
defer coll.Close()
```

オプションの `SharedConfigState` に `SharedConfigEnable` を設定することで `~/.aws/config` 内を参照してくれるようになります。

DynamoDB clientを生成するまでは、公式SDK通りの手順となります。最後にテーブル名、ハッシュキー、ソートキーを指定して `OpenCollection` を呼ぶことで、Go CDK経由でドキュメントのCRUD操作を行える用になります。

この時、**ハッシュキー** と **ソートキー** の両方を指定していますが、もしソートキーが無ければ空文字を指定すればOKです。

### レコードを表現する構造体の定義


```go 構造体定義
type Item struct {
	MyHashKey  string `docstore:"MyHashKey"`
	MyRangeKey int    `docstore:"MyRangeKey"`
	MyText     string `docstore:"MyText"`
}
```

`docstore` というというタグを利用することで、DynamoDBのキーを指定して構造体とマッピングすることができます。省略した場合は構造体のキー名がそのまま利用されます

ほぼ、AWS SDKと同じですね。


## 1. 基本的なCRUD

### Create

利用するメソッドは `Create` です。

```go Create処理
write := Item{MyHashKey: "00001", MyRangeKey: 1, MyText: "some text..."}
if err := coll.Create(ctx, &write); err != nil {
	log.Fatalf("create: %v", err)
}
```

直感的だと思います。

### Read

利用するメソッドは `Get`です。

```go Read処理
read := Item{MyHashKey: "00001", MyRangeKey: 1}
if err := coll.Get(ctx, &read); err != nil {
	log.Fatalf("get: %v", err)
}
fmt.Printf("got: %+v\n", read)
// => get: {MyHashKey:00001 MyRangeKey:1 MyText:some text...}
```

これも直感的です。

### Update

これはやや特殊です。`Update` を用いますが、更新する差分を `docstore.Mods` というmapに値をもたせます。

```go Update処理
updateKey := Item{MyHashKey: "00001", MyRangeKey: 1}
if err := coll.Update(ctx, &updateKey, docstore.Mods{"MyText":"update text"}); err != nil {
	log.Fatalf("update: %v", err)
}
// (補足) もう一度getすると以下のように書き換わっている
// {MyHashKey:00001 MyRangeKey:1 MyText:update text}
```

Go CDKのUpdateは `Patch` のような動きをするので注意が必要です。もし、ドキュメント全体を置換したい場合は後述する `Replace` を利用します。


`Update` は存在しないレコードに対して行うとエラーになります。

```go Update失敗
notFoundKey := Item{MyHashKey: "99999", MyRangeKey: 1}
if err := coll.Update(ctx, &notFoundKey, docstore.Mods{"MyText": "update text"}); err != nil {
	log.Fatalf("not found: %v", err)
}
// not found: docstore (code=FailedPrecondition):  ConditionalCheckFailedException: The conditional request failed
// status code: 400, request id: ab4aaa27-303a-4090-a457-94f42950d0bd
```

エラーメッセージから推測すると、Go CDKのUpdateはDynamoDBのConditional Expressionsを利用していることがわかりますね。

## Replace

項目全体を置き換える場合です。存在しない場合はエラーになります。

```go 置換処理
replace := Item{MyHashKey: "00001", MyRangeKey: 1, MyText: "replace"}
if err := coll.Replace(ctx, &replace); err != nil {
	log.Fatalf("replace: %v", err)
}
// (補足)もう一度getすると以下のように置換されている
// {MyHashKey:00001 MyRangeKey:1 MyText:replace}
```

簡単ですね。

もし、存在しない場合は `Create`, 存在する場合は `Replace` をしたい場合は `Put` を使うようです。今回はあまりにコードがそのままなので省略します。

### Delete

利用するメソッドは `Delete` です。

```go Delete処理
deleteKey := Item{MyHashKey: "00001", MyRangeKey: 1}
if err := coll.Delete(ctx, &deleteKey); err != nil {
	log.Fatalf("delete: %v", err)
}
// (補足)もう一度getすると、not foundになる
```

ここまでで一通りのCRUD操作ができることを確認できました。


## 2. バッチ処理のCRUD

大量データを扱う場合は、1件1件データを登録するのではなくバッチ登録を行いたいケースは多いのでは無いでしょうか？

この場合は `Actions` を用います。

```go バッチ登録
// Create
w1 := Item{MyHashKey: "00001", MyRangeKey: 1, MyText: "some text1..."}
w2 := Item{MyHashKey: "00001", MyRangeKey: 2, MyText: "some text2..."}
w3 := Item{MyHashKey: "00001", MyRangeKey: 3, MyText: "some text3..."}
if err := coll.Actions().Create(&w1).Create(&w2).Create(&w3).Do(ctx); err != nil {
	log.Fatalf("actions: %v", err)
}
// (補足) バッチ登録した結果をgetすると以下の値が確認できる
// got: {MyHashKey:00001 MyRangeKey:1 MyText:some text1...}
// got: {MyHashKey:00001 MyRangeKey:2 MyText:some text2...}
// got: {MyHashKey:00001 MyRangeKey:3 MyText:some text3...}
```

ActionsはCreateだけではなく、Get/Create/Replace/Put/Update/Delete の6つの操作を混在させて実行も可能です。

参考: https://godoc.org/gocloud.dev/docstore#hdr-Actions


今回は関数をチェーンで登録しましたが、Actionsで `ActionList` が取得できるので、もちろんforループと合わせて追加もできます。


## 3. 条件付き書き込み

Go CDKはドキュメントを読んだ限りは、条件付き書き込みはサポートされていないようです。しかし、Revisionsという機能があり、いわゆる楽観的ロックのような利用用途を公式でサポートされています。

* https://godoc.org/gocloud.dev/docstore#hdr-Revisions

内容は リビジョンフィールド (デフォルト: `DocstoreRevision`) を設定すると、このフィールドを用いてバージョンを確認し、` Put`、`Replace`、`Update`、`Delete` の操作を安全に行うことができます。

最初に定義した構造体にフィールドを追加します。

```go  リビジョンフィールドを追加した構造体
type Item struct {
	MyHashKey        string       `docstore:"MyHashKey"`
	MyRangeKey       int          `docstore:"MyRangeKey"`
	MyText           string       `docstore:"MyText"`
	DocstoreRevision interface{}
}
```

これを用いて、楽観的ロックを行ってロックが行われているか確認します。どちらも同じドキュメントにUpdateし続けて様子を見てみます。

```go 楽観的ロック検出テスト
func main() {
	// 別のgoroutineでも無限書き込み
	go UpdateLoop()
	// メインスレッドでも無限書き込み
	UpdateLoop()

	// => optimistic locking: docstore (code=FailedPrecondition):
	// ConditionalCheckFailedException: The conditional request failed
}

func UpdateLoop() {
	// (DynamoDB Clientを生成処理)

	for { // 無限にドキュメントを更新する処理
		read := Item{MyHashKey: "00001", MyRangeKey: 1}
		if err := coll.Get(ctx, &read); err != nil {
			log.Fatalf("get: %v", err)
		}
		if err := coll.Update(ctx, &read, docstore.Mods{"MyText": "update text: " + time.Now().String()}); err != nil {
			if gcerrors.Code(err) == gcerrors.FailedPrecondition {
				log.Fatalf("optimistic locking: %v", err)
			}
			log.Fatalf("update: %v", err)
		}
	}
}
```

すると、実行結果が `optimistic locking: docstore (code=FailedPrecondition): ConditionalCheckFailedException: The conditional request failed` が発生し、getしてupdateするまでの間に別のgoroutineが同じドキュメントを更新したことが検知できました。

DynamoDBのConditional Expressionsほど万能では無いですが、多くのユースケースはロックを実現したいことが多いと思うので、これで事足りるケースも多いのではないでしょうか？

ちなみに、Revisionフィールドですが、awscliでテーブルを検索すると、UUIDで実現されていました。最初はロック番号のような形式で実装されていると思ったので意外です

もし、更新回数などをアプリケーションとして持ちたい場合は、自分で属性を持つ必要があるのでご注意ください。

```bash
>aws dynamodb scan --endpoint-url http://localhost:8000 --table-name MyFirstTable
{
    "Items": [
        {
            "DocstoreRevision": {
                "S": "3e38649b-d82c-46ab-a0fe-621f98104f75"
            },
            "MyHashKey": {
                "S": "00001"
            },
            "MyText": {
                "S": "update text: 2020-02-28 09:45:27.725097 +0900 JST m=+0.090001301"
            },
            "MyRangeKey": {
                "N": "1"
            }
        }
    ],
    "Count": 1,
    "ScannedCount": 1,
    "ConsumedCapacity": null
}
```


## 4. クエリ

[Go Cloud#3 Go CloudのDocStoreを使う](/articles/20191113/) の記事で説明されているように、Go CDKはクエリもサポートされています。`Where()`、`OrderBy()`、`Limit()` で、 Whereの演算子は `=`, `>`, `<`, `>=`, `<=` の5種類です。ほとんどやりたいことはできるのではないでしょうか？



# まとめ

* 使ってみた感想としてGo CDKのDocStoreは非常にリッチな機能を持っており、ベーシックなAWS SDKと遜色なく利用できました。Condition Expressionsで複雑な条件を利用しないなど、限られたユースケースであればむしろ生産性が高まるのではないでしょうか
* Go CDKを用いればドライバ切り替えでmemstoreというモック切り替えも可能ですし、テスタビリティとしても有用です

機能上はGo CDKもかなりガンバっていると感じます。DynamoDBアクセスする際の有力な選択肢となりうるのではないでしょうか？ぜひ、私達のチームでも機を見て実戦投入してみてチャレンジしてみたいと思います。


-----
[DynamoDB×Go連載企画](/tags/DynamoDB%C3%97Go/)以外にも多くの連載企画があります。特にGo Cloud連載が今回のテーマに近いです。

* [Go Cloud 連載](/tags/GoCDK/)
* [GCP 連載](/articles/20200202/)
* [Auth0 連載](/tags/Auth0/)



