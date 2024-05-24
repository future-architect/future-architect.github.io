---
title: "GoとPoatgreSQLでCOPY"
date: 2021/07/27 00:00:00
postid: a
tag:
  - SQL
  - PostgreSQL
  - Go
  - jackc/pgx
category:
  - Programming
thumbnail: /images/20210727a/thumbnail.png
author: 澁川喜規
lede: "データベースでパフォーマンスが大きな問題になりがちなのが、バッチでのデータのインサートと、複雑なクエリーです。が、今回は後者は置いといて、前者のデータの取り込みについて扱います。データの挿入の高速化は最近、ちょびっと大事かなと思うところがあります。というのも..."
---
[GoのORマッパー連載](/articles/20210726a/)の2日目の記事です。

データベースでパフォーマンスが大きな問題になりがちなのが、バッチでのデータのインサートと、複雑なクエリーです。が、今回は後者は置いといて、前者のデータの取り込みについて扱います。データの挿入の高速化は最近、ちょびっと大事かなと思うところがあります。というのも、バッチ処理をクラウド上で実行するといろいろな制約が襲ってくるからです。

# クラウドサービスとバッチの時間制限

AWSのLambdaは15分（900秒）です。GCPのCloud Functionsは9分（540秒）。この時間で済むならスケジューラサービスと繋げて定時実行でLambdaとかで処理できれば運用はとても簡単です。もうちょっと厳しい制限だと、AWSのAPI Gatewayは30秒制限です。この時間内であれば、サーバーレスな管理画面からアップロードしてデータをバルクインサートみたいなことが簡単にできます。

他のサービスだとちょびっと長いのですが、GCPのCloud Runだと1時間、AWSのApp Runnerはまだそのような制限は発表されてませんが、同じぐらいになるかと思われます。なお、EC2とかを使えば時間制限はなくなりますが、ALBとか経由で実行するとドキュメントにはないが90分で切られるとかなんとか。

時間が厳しければ、通信時間を節約するためにあらかじめsigned URLを発行してS3にアップロードしてからそれを処理するみたいな方法もありますし、行ごとにqueueに入れてLambdaでファンアウトで処理するとかもありますが、登場人物が少なければデバッグも楽ですし、トラブルシュートもやりやすくなります。まあなんにせよ、制限はいたるところにあって、高速化すればよりシンプルな仕組みが選択できるようになり、運用は楽になりますし、コストまで安くなります。高速化は正義です。

# COPY FROM？

PostgreSQLには高速にファイルの読み込みを行うCOPY FROMがあると聞きました。知らなかったので調べてみました。

* `COPY`と`\COPY`がある。
* `COPY`はDBサーバーのローカルファイルとのやりとり（`COPY FROM`でテーブルへのローカルファイルからの読み込み、`COPY TO`でテーブルからのローカルファイルへの書き込み）ができる
* pg_dumpは内部で`COPY FROM/TO`を使っているらしい。`COPY FROM STDIN`とか`COPY TO STDOUT`を使ってローカルにファイルを転送している？
* `\COPY`はクライアント・サーバー間でも利用可能。INSERTを並べたSQLよりも11倍高速。INSERTをまとめて1つのトランザクションで処理するのと比べても3倍以上高速（[この記事](https://www.citusdata.com/blog/2017/11/08/faster-bulk-loading-in-postgresql-with-copy/)参照)

2種類あるけど特に使い分けとか考える必要はなさそうです。

# GoとCOPY

<img src="/images/20210727a/top.png" alt="" width="800" height="425" loading="lazy">

by [Renée French](http://reneefrench.blogspot.com/)


GoのPostgreSQLドライバには2種類あります。

* [github.com/lib/pq](https://pkg.go.dev/github.com/lib/pq)
* [github.com/jackc/pgx](https://pkg.go.dev/github.com/jackc/pgx/v4)

lib/pqとpgxは[pgxの方がパフォーマンスが良い](https://devandchill.com/posts/2020/05/go-lib/pq-or-pgx-which-performs-better/)ようですね。スター数はlib/pqの方が多いですが、pgxも少なくないです。

[lib/pq](https://pkg.go.dev/github.com/lib/pq#hdr-Bulk_imports)にもCopyを使ったバルクインポート機能がありますし、[pgxにもCOPYプロトコルサポート](https://pkg.go.dev/github.com/jackc/pgx/v4#hdr-Copy_Protocol)がありました。

実現方法はちょっと違っていて、pgxは`database/sql`の`Conn`を拡張した独自`Conn`型を持っており（`database/sql`のインタフェースの上位互換になっている）、その`Conn`に[CopyFrom()メソッド](https://pkg.go.dev/github.com/jackc/pgx/v4#Conn.CopyFrom)が生えています。lib/pqはPrepare/Execの[標準インタフェースを活用する実装](https://pkg.go.dev/github.com/lib/pq#hdr-Bulk_imports)になっていました。

ORマッパーの中にはConnを完全にラップして、裏のConnを見せないようなライブラリもあったりする（gormとか？）のでその場合はlib/pqを使うとか、状況によって使い分けできそうですね。まあ、そもそもバッチでデータ一括で入れるなら本番コードとアーキテクチャを合わせたりORマッパー使わなくてもいいと思うのでpgxをダイレクトに使う・・・とかでも良さそう。

# 試してみる（準備)

[鳥貴族のページのアレルギーの情報](https://www.torikizoku.co.jp/anshin/shouhin)のPDFをダウンロードしました。PythonとPoetryはインストール済みの前提で書きます。

```bash
$ poetry new conv-toriki
$ cd conv-toriki
$ poetry add tabula-py
```

スクリプトはこんな感じ

```py convert.py
import tabula

tabula.convert_into("toriki_allergie_21su.pdf", "output.csv", output_format="csv", pages=[2, 3, 4, 5])
```

実行します。CSVファイルができるのでヘッダー行とかは手で除去します（自動化できるのかもしれませんが）。

```bash
$ poetry run python convert.py
```

ついでにPostgreSQLもDockerで入れて、起動しておきます。

```bash
$ docker pull postgres:13.3
$ docker run -d --rm --name db -e POSTGRES_USER=pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=toriki -p 5432:5432 postgres:13.3
```

このコンテナのpsqlコマンドを起動してテーブルを作っておきます。

```bash
$ docker exec -it db psql -U pg -d toriki
psql (13.3 (Debian 13.3-1.pgdg100+1))
Type "help" for help.

toriki=# create table allergies (
toriki(#   id serial PRIMARY KEY,
toriki(#   category varchar(50) not null,
toriki(#   menu varchar(50) not null,
toriki(#   shrimp boolean,
toriki(#   crab boolean,
toriki(#   wheat boolean,
toriki(#   soba boolean,
toriki(#   eggs boolean,
toriki(#   milk boolean,
toriki(#   peanuts boolean,
toriki(#   walnuts boolean
toriki(# );
CREATE TABLE
```

# lib/pqでの利用例

CSVを読み込んでCopyで流し込むサンプルです。`CopyIn()`の引数は、1つめがテーブル名、2つ目以降がカラム名です。絵文字はエラー箇所がわかる目印で入れています（[log.SetFlag](https://future-architect.github.io/articles/20200527/)使うとサンプルがちょい長くなるので）。

`stmt.ExecContext()`で各行の内容をどんどん追加してあげて、最後に`stmt.Close()`で1つのリクエストで全行挿入ができました。内部実装追いかけてないですが、全部の内容がオンメモリにのっかるなら、数1000行ずつとかわけて実行した方が良いですかね。

```go
package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"io"
	"log"
	"os"
	"os/signal"

	_ "github.com/lib/pq"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	f, err := os.Open("../../output.csv")
	if err != nil {
		log.Fatal("🐙", err)
	}
	r := csv.NewReader(f)
	r.FieldsPerRecord = -1

	connStr := "host=localhost port=5432 user=pg password=pw dbname=toriki sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("🦑", err)
	}

	txn, err := db.Begin()
	if err != nil {
		log.Fatal("🐣", err)
	}
	stmt, err := txn.Prepare(pq.CopyIn("allergies",
	  "category", "menu",
	  "shrimp", "crab", "wheat", "soba", "eggs", "milk", "peanuts", "walnuts"))
	if err != nil {
		log.Fatal("🐵", err)
	}

	for {
		record, err := r.Read()
		log.Println(record, err)
		if err == io.EOF {
			break
		} else if err != nil {
			log.Fatal("🐍", err)
		}

		_, err = stmt.ExecContext(ctx,
			record[0], record[1], record[2] != "", record[3] != "", record[4] != "", record[5] != "", record[6] != "", record[7] != "", record[8] != "", record[9] != "")
	}

	_, err = stmt.ExecContext(ctx)
	if err != nil {
		log.Fatal("🐸", err)
	}
	err = stmt.Close()
	if err != nil {
		log.Fatal("🐶", err)
	}
	err = txn.Commit()
	if err != nil {
		log.Fatal("🐱", err)
	}
}
```

# pgxでの利用例

pgxは`pgx.CopyFromSource`インタフェースをアプリ側で用意する必要があります。スライスなどからこのインタフェースを生成する便利関数もありますが、あらかじめ[全部メモリに載っける](https://pkg.go.dev/github.com/jackc/pgx/v4#CopyFromRows)か、[行数がわかっているか](https://pkg.go.dev/github.com/jackc/pgx/v4#CopyFromSlice)でないと使えないので、超大規模なデータ投入には向かない気がしました。なので、今回はcsv.Readerをラップしたインタフェースを自作してみました。内部的にもバイナリプロトコルで逐次で流していそうなので、全部がメモリに載せないで処理できそうな気がします(要追加検証)。


```go
package main

import (
	"context"
	"encoding/csv"
	"io"
	"log"
	"os"
	"os/signal"

	"github.com/jackc/pgx/v4"
)

type copyFromSource struct {
	r *csv.Reader
	nextRow []interface{}
	err error
}

func (s *copyFromSource) Next() bool {
	s.nextRow = nil
	s.err = nil
	record, err := s.r.Read()
	if err == io.EOF {
		return false
	} else if err != nil {
		s.err = err
		return false
	}

	s.nextRow = []interface{}{
		record[0], record[1],
		record[2] != "", record[3] != "", record[4] != "", record[5] != "",
		record[6] != "", record[7] != "", record[8] != "", record[9] != "",
	}
	return true
}

func (s copyFromSource) Values() ([]interface{}, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.nextRow, nil
}

func (s copyFromSource) Err() error {
	return s.err
}

var _ pgx.CopyFromSource = &copyFromSource{}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	f, err := os.Open("../../output.csv")
	if err != nil {
		log.Fatal("🐙", err)
	}
	r := csv.NewReader(f)
	r.FieldsPerRecord = -1

	conn, err := pgx.Connect(context.Background(), "postgres://pg:pw@localhost:5432/toriki")
	if err != nil {
		log.Fatal("🦑", err)
	}

	txn, err := conn.Begin(ctx)
	if err != nil {
		log.Fatal("🐣", err)
	}
	_, err = txn.CopyFrom(ctx, pgx.Identifier{"allergies"}, []string{
		"category", "menu",
		"shrimp", "crab", "wheat", "soba", "eggs", "milk", "peanuts", "walnuts",
	  }, &copyFromSource{r: r})

	if err != nil {
		log.Fatal("🐬", err)
	}

	err = txn.Commit(ctx)
	if err != nil {
		log.Fatal("🐱", err)
	}
}
```

# まとめ

ふだんはRDBをあまり使わない（なんかNoSQLが多い）ので、ちょっとウォームアップがてら調べてコードを書きました。DB特有機能ですが、DB乗り換えるとしてもINSERTに戻すのも苦ではないし、効果が高いし、バッチ処理でバルクでデータを入れる用途ならありなんじゃないかなと思います。lib/pqでもpgxでもどちらでも使えるのでアプリケーションで選択しるライブラリの種類のよらず恩恵はありそうです。

これで、特定アレルゲンが入っている食品とか、入ってない食品が簡単に検索できるようになりました。メガ金麦マジかよ・・・

```sh
# select menu from allergies where wheat=true;
             menu
------------------------------
 もも貴族焼 たれ
 むね貴族焼 たれ
 つくね塩
 つくねたれ
 :
 ニラ玉鉄板焼
 ピリ辛こんにゃくの竜田揚
 メガ金麦(ビール系飲料)
(49 rows)
```

それはそうと、鳥貴族、アレルギー表が日本語だけじゃなくて英語版も用意されててすごいですね。あと、めちゃくちゃ良いのが小麦アレルギーの項目ごとの注釈。小麦がアレルギーだとしても発酵した醤油はOKな人はいるのですが、単に小麦だけ書かれると良いのか悪いのか迷うことがあります。で、厳しくNGにするとほとんどなにも外食できなくなってしまう。何度かアレルギーの持ちの人と一緒に外食するために店探しをしたりしましたが、これはかなり助かる情報です。他の外食業界の会社さんも真似して欲しい！


次は、宮崎さんの[100%型安全なgolangORM「ent」を使ってみた](/articles/20210728a/)です。
