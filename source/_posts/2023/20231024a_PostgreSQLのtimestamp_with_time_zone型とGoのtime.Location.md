---
title: "PostgreSQLのtimestamp with time zone型とGoのtime.Location"
date: 2023/10/24 00:00:00
postid: a
tag:
  - PostgreSQL
  - タイムゾーン
  - Go
  - jackc/pgx
  - time
category:
  - Programming
thumbnail: /images/2023/20231024a/thumbnail.png
author: 真野隼記
lede: "PostgreSQLには timestamp with time zone型が存在します。一見、タイムゾーン付きで日時データを保持してくれそうな名称ですが、そうではないよという話をさせてください。"
---
<img src="/images/2023/20231024a/postgresql_logo.png" alt="" width="610" height="280">

## はじめに

TIG真野です。育休明けです。

PostgreSQLには `timestamp with time zone`（`timestamptz`: 長いので以後こちらで表記します）型が存在します。一見、タイムゾーン付きで日時データを保持してくれそうな名称ですが、そうではないよという話をさせてください。

## timestampz の仕様

[PostgreSQLのドキュメント 8.5.1.3. タイムスタンプ](https://www.postgresql.jp/docs/15/datatype-datetime.html) には以下のような仕様が書かれています。

1. `timestampz`の内部に格納されている値は **UTC** である
2. 入力文字列にタイムゾーンが指定されていれば、そのタイムゾーンを元にUTCに変換され保持される
3. `timestampz`の値を取得すると、UTCから現行のタイムゾーンに変換されて表示される

1,2 は timestamp **with time zone** という名称から、書き込み時のタイムゾーンも保持していると勘違いしちゃいがちですが、実際はそうじゃないよと認識すればOKです。理解できました。

個人的には、3は少しややこしいかなと思います。現行のタイムゾーンとは、すなわちDBセッションで有効なタイムゾーンを用いられると考えられ、確かに`to_char()` で文字列化したときや、 `psql`など一部のクライアントツール（いわゆるテキストフォーマットでやり取りする場合）に対しては正しいです。一方で、`jackc/pgx` のドライバー経由でDBを利用するクライアントアプリの世界から見ると、これは適用されません（理由を先に書くと、バイナリフォーマットではタイムゾーン情報を送信しないからです）。

## timestampz を扱う際の留意事項

ということでGoで `jackc/pgx` を用いた時に `timestampz` 型のデータを扱う上で留意すべきことを言い換えてみます。

- `timestampz` カラムは、内部的には64bit整数で保持しており、どのタイムゾーンで書き込まれたかは残っていない
- `timestampz` カラムをSQLで `to_char()` で表示する場合はセッションのタイムゾーンが利用される
- セッションのタイムゾーンは、`jackc/pgx` がデフォルトで利用するバイナリフォーマットでは、クライアント側に送信されない（その代わり性能は高い）
- `timestampz` カラムをGoの `time.Time` にマッピングした場合に設定されるタイムゾーンは、書き込み時に用いたタイムゾーンでもなく、セッションで有効なタイムゾーンでもなく、`time.Time` パッケージのタイムゾーンの扱いに準拠する（※少なくても `jackc/pgx` を使う場合は）

DBサーバにも、Goアプリ側にもタイムゾーンがあり少し混乱しやすいポイントかなと思います。少なくても私は混乱しました。反省と繰り返し防止のため、何がどう作用するか内容を整理して残します。

## 環境構築

ここから、PostgreSQLに `timestampz` を含むテーブルを作成し、タイムゾーンを変えたいくつかのパターンで、Goでデータを書き込み・読み込みして挙動を確認していきます。

検証用のPostgreSQLはdocker compose経由で利用します。タイムゾーン `TZ` は `Asia/Tokyo` を指定しています。`TZ` を指定すると `postgresql.conf` に設定されシステムデフォルトのタイムゾーンとなります。

```yaml
version: '3.9'

services:
  db:
    image: postgres:16.0-bullseye
    container_name: pg
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: postgres
      TZ: "Asia/Tokyo"
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --locale=C"
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    command: postgres -c log_destination=stderr -c log_statement=all -c log_connections=on -c log_disconnections=on
volumes:
  pgdata:
```

起動します。

```sh
docker-compose up -d
```

クライアントツールはこの記事ではターミナルでログを残したかったので `psql` を用います（パスワードはブログ用に分かりやすさ優先で環境変数経由でラフに渡しています。本来は `~/.pgpass` などを利用すべきかもしれませんが、ここでは簡易さを優先しています）。

`psql` でセッションで有効なタイムゾーンを表示すると、 `Asia/Tokyo` であることがわかります。

```sh
$ PGPASSWORD=pass psql -h localhost -p 5432 -U postgres -c "select current_setting('timezone');"
 current_setting
-----------------
 Asia/Tokyo
(1 row)
```

## 検証用のテーブル作成

検証用にtimestamp with time zone（timestampz）型を含む `event` テーブルを用意します。

```sql schema.sql
CREATE TABLE event
(
    event_id varchar(4) PRIMARY KEY,
    event_at timestamptz NOT NULL
);
```

`psql` を用いてDDLを流します。

```sh
$ PGPASSWORD=pass psql -h localhost -p 5432 -U postgres -f schema.sql
CREATE TABLE
```

## Go経由でDB操作

Goのアプリ経由で、データの書き込み/読み込みを行ってみます。

### データ書き込み

Go経由で `event` テーブルに2レコード書き込みます。内容は以下です。

| イベントID | イベント時間 |
|-- | --- |
| 0001 | タイムゾーンなし（UTC）で現在日時|
| 0002 | JSTで現在日時 |

ドライバーは `jackc/pgx/v5` です。フューチャー技術ブログに関連記事がありますので、よければ参照ください。

- [lib/pq から jackc/pgx への移行](/articles/20210916a/)
- [GoとPoatgreSQLでCOPY](/articles/20210727a/)

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	ctx := context.Background()

	connURL := "postgres://postgres:pass@localhost:5432/postgres?sslmode=disable"
	conn, err := pgx.Connect(ctx, connURL)
	if err != nil {
		log.Fatalf("pgx connect: %v", err)
	}
	defer conn.Close(ctx)

	jstZone := time.FixedZone("Asia/Tokyo", 9*60*60)

	args := [][]any{
		{"0001", time.Now()},
		{"0002", time.Now().In(jstZone)},
	}

	copyCount, err := conn.CopyFrom(ctx, pgx.Identifier{"event"},
		[]string{"event_id", "event_at"}, pgx.CopyFromRows(args))

	if err != nil {
		log.Fatalf("copy exec: %v", err)
	}

	fmt.Printf("copy: %d\n", copyCount)

}
```

実行して以下のような実行結果が出れば登録できました。

```sh
>go run .
copy: 2
```

### データ読み込み

続いて読み込みです。Structを用意します。

```go model.go
package main

import "time"

type Event struct {
	ID string
	At time.Time
}
```

読み込みのときは`pgx.Connect()` を使っていましたが、ここでは `pgx.ParseConfig()` を利用しています。後々別のオプションを利用するために差分を小さくする目的であり、気にしないでください。

```go main.go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	ctx := context.Background()

	connURL := "postgres://postgres:pass@localhost:5432/postgres?sslmode=disable"
	config, err := pgx.ParseConfig(connURL)
	if err != nil {
		log.Fatal(err)
	}

	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		log.Fatalf("pgx connect: %v", err)
	}
	defer conn.Close(ctx)

	rows, err := conn.Query(ctx, "select * from event")
	if err != nil {
		log.Fatalf("select query: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.At); err != nil {
			log.Fatalf("scan: %v", err)
		}
		fmt.Printf("%s %s\n", e.ID, e.At.Format(time.RFC3339))
	}

}
```

タイムゾーンをUTCにして実行します。timeパッケージのGoDocを見ると、`TZ` 環境変数があればUNIXシステムではそれを用いるとあるので、切り替えはこちらで行います。

> On Unix systems, Local consults the TZ environment variable to find the time zone to use.
> https://pkg.go.dev/time#Location

動かすと、 `0001`はUTC、 `0002` はJSTにしたtime.Timeの値をDBに登録したのですが、結果は **どちらもUTC**になっていることがわかります。

```sh
$ TZ=UTC go run .
0001 2023-10-21T12:04:20Z
0002 2023-10-21T12:04:20Z
```

OSがWindowsの場合は `TZ` 環境変数を読み込んでくれなかったので、tzutilコマンドで切り替えます。こちらも当然結果は同じく、2レコードとも、AtフィールドがUTCのタイムゾーンとなっていることが確認できます。

```sh
# UTCにタイムゾーン切り替え
$ tzutil /s "UTC"

$ go run .
0001 2023-10-21T12:04:20Z
0002 2023-10-21T12:04:20Z

# もとに戻す（JSTの場合）
$ tzutil /s "Tokyo Standard Time"
```

今度はタイムゾーンをJSTに登録すると2レコードともJSTのタイムゾーンになることが確認できます（Windows側の実行例は割愛します）。

```sh
$ $ TZ=Asia/Tokyo go run .
0001 2023-10-21T21:04:20+09:00
0002 2023-10-21T21:04:20+09:00
```

つまり、最初に書いた挙動をすることがわかります。

- timestampz カラムをGoのアプリで読み取りする時は、**Go側のタイムゾーン設定に依存**する（環境変数 `TZ` や端末のタイムゾーンなど、time.Timeパッケージの仕様の値が用いられる）
- DBのセッションで有効になっているタイムゾーンが、Goアプリの time.Time のタイムゾーンで利用されるわけでもない
- まして、書き込み時に利用したタイムゾーンが使われるわけでもない

## 接続URLにタイムゾーンを設定すると？

ドライバーによっては、DBを接続時にタイムゾーンを渡せるものもあります（例えばPostgreSQLのJDBCドライバーも `-Duser.timezone=Asian/Tokyo` で渡せるようです）。`pgx` の場合は次のような `RuntimeParams` を利用することで、セッションのタイムゾーンを変更できます。

例としてシンガポールのタイムゾーンを指定して結果がどう変わるか確認します。念のためセッションのタイムゾーンが本当に変わった確認するため、SELECT句に `current_setting('timezone')` を追加もしています。

```diff
type Event struct {
	ID string
	At time.Time
+	TZ string
}

func main() {
	ctx := context.Background()

	connURL := "postgres://postgres:pass@localhost:5432/postgres?sslmode=disable"
	config, err := pgx.ParseConfig(connURL)
	if err != nil {
		log.Fatal(err)
	}
+	config.RuntimeParams["timezone"] = "Asia/Singapore"

	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		log.Fatalf("pgx connect: %v", err)
	}
	defer conn.Close(ctx)

-	rows, err := conn.Query(ctx, "select * from event")
+	rows, err := conn.Query(ctx, "select *, current_setting('timezone') as tz from event")
	if err != nil {
		log.Fatalf("select query: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e Event
-		if err := rows.Scan(&e.ID, &e.At); err != nil {
+		if err := rows.Scan(&e.ID, &e.At, &e.TZ); err != nil {
			log.Fatalf("scan: %v", err)
		}
-		fmt.Printf("%s %s %s\n", e.ID, e.At.Format(time.RFC3339), e.TZ)
+		fmt.Printf("%s %s %s\n", e.ID, e.At.Format(time.RFC3339))
	}

}
```

実行します。

```
$ TZ=UTC go run .
0001 2023-10-21T12:04:20Z Asia/Singapore
0002 2023-10-21T12:04:20Z Asia/Singapore
```

セッションのタイムゾーンが `Asia/Singapore` に変わったものの、time.Timeに設定されるタイムゾーンはUTCのまま（time.Timeの仕様で `TZ=UTC` に設定されたタイムゾーンが利用される）であることが分かります。

接続時のパラメータで指定するタイムゾーンをいい感じに `time.Time` に設定してほしかったかもしれませんが、残念ながらそのような挙動ではないです。

## Goの設定として

`timestampz`型を扱う上で、time.TimeのタイムゾーンはDB側とは別に設定する必要があるという話をしました。
アプリ内で色々なタイムゾーンが混在すると不具合や、ログで表示される時刻などが乱れることで運用コストも増えてしまうので、通常はアプリ内である設定値に統一した方が良いでしょう。

一律的にGo側のタイムゾーンを変更するには、さきほどの `TZ` の環境変数を用いるといった手法の他に、以下のように直接ハードコードするという手もあります。

```go
func init() {
    time.Local = time.FixedZone("Asia/Tokyo", 9*60*60)
}
```

ただ、上記の手法だとtutuzさんの[GoでJSTのタイムゾーンを扱う方法](https://tutuz-tech.hatenablog.com/entry/2021/01/30/192956)の記事にあるように、DATA RACEする可能性があるようです。回避するためにブランクimportなどの措置も面倒なので万能の解では無いですが、お手軽ではあります（私もよく利用してしまいます）。

個別対応になるため設定し忘れが怖いですが、プロジェクトルールとして `time.In()` を設定するという決めにするというのもあります。

```go
var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

func main() {
	// ...(中略)...
	for _, e := range events {
		fmt.Printf("%s %s\n", e.ID, e.At.In(jst)) // Inでタイムゾーンを指定する
	}
```

書き込み時はともかく、読込み時もタイムゾーンを指定しないとならないのは、少し釈然としないところもありますが、忘れないようにしましょう。

## FAQ

よく思いつきそうな疑問について、まとめます。

### DBセッションで用いるタイムゾーンってどう決まるの？

bisqueさんの[PostgreSQLのTimeZoneを理解する](https://zenn.dev/team_zenn/articles/postgresql-timestamp) が詳しいのでそちらも参照ください。

この記事で簡単にざっくり説明しますと、次の優先度で決まります。

1. `SET TIMEZONE TO 'xxx'` で指定された値
1. コネクション接続時に指定された値
1. postgresql.confに書かれたデフォルト値

### `psql` などのSQLクライアントとして用いると、DB側のタイムゾーンを利用しているようですが？

確かに、`psql` は `select current_setting('timezone');` で表示されるタイムゾーンによって、`timestampz` の表示が変わります。他にも、`psqledit`、`DataGrip`でも同様の挙動でした。

```sql
postgres=# select current_setting('timezone');
 current_setting
-----------------
 Asia/Tokyo
(1 row)

postgres=# select * from event;
 event_id |           event_at
----------+-------------------------------
 0001     | 2023-10-21 21:04:20.445974+09
 0002     | 2023-10-21 21:04:20.445974+09
(2 rows)

postgres=# set timezone to 'UTC';
SET
postgres=# select * from event;
 event_id |           event_at
----------+-------------------------------
 0001     | 2023-10-21 12:04:20.445974+00
 0002     | 2023-10-21 12:04:20.445974+00
(2 rows)
```

`psql` およびその利用ライブラリである `libpq` の仕様に私は詳しくないですが、おそらく `libpq` はPostgreのDBサーバとのやり取りを、バイナリフォーマットではなく、テキストフォーマットを利用しています。テキストプロトコルの場合は。DBサーバ側がセッションのタイムゾーンの値を元に`timestampz` 型の表示を変えて、その値をクライアントである `psql` に送信するため、直感的な動作をします。

ちなみに、`libpq` は `PGTZ` という環境変数で、タイムゾーンを変更できます（[SET timezone TO ...と等価である](https://www.postgresql.jp/docs/15/libpq-envars.html#:~:text=PGTZ%E3%81%AF%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%E3%81%AE%E6%99%82%E9%96%93%E5%B8%AF%E3%82%92%E8%A8%AD%E5%AE%9A%E3%81%97%E3%81%BE%E3%81%99%E3%80%82%20(SET%20timezone%20TO%20...%E3%81%A8%E7%AD%89%E4%BE%A1%E3%81%A7%E3%81%99%E3%80%82)) とありますが、DB側のログにはSET timezone To ... が出てこなかったので、接続時に指定していると思われます）。

環境変数`PGTZ`でのタイムゾーンを`UTC`にした、`psql` コマンドを利用する例です。

```sh
$ PGTZ=UTC PGPASSWORD=pass psql -h localhost -p 5432 -U postgres -c 'select * from event;'
 event_id |           event_at
----------+-------------------------------
 0001     | 2023-10-21 12:04:20.445974+00
 0002     | 2023-10-21 12:04:20.445974+00
(2 rows)
```

ちなみに、DBeaver 23.2.2 では、`set timezone to 'UTC'` などをしても `timestampz` カラムを表示する際に利用するタイムゾーンに変わりはありませんでした（`+0900` のまま）。DBeaverはローカルのタイムゾーンを利用するため、もしローカル端末のタイムゾーンと、DBのタイムゾーンが異なる場合は、`dbeaver.ini` に `-Duser.timezone=xxx` を追加して、タイムゾーンを一致させる必要があるようです。

### `timestampz` だけPostgreSQLのDBサーバからテキストフォーマットで受け取れば、セッションのタイムゾーン付きで受信できるため、それを元に time.Time にタイムゾーンを指定すればよいでは？

同じことを思ったのですが、[Scanning of timestamp without time zone forces UTC #924](https://github.com/jackc/pgx/issues/924#issuecomment-770910226) を読んだところ、いくつか課題があるようです。

- PostgreSQL側で持つタイムゾーンと、クライアント側で持つタイムゾーンに互換性があるとは限らない
- 夏時間のため単純にテキストから時刻に変換すると、壊れる可能性がある

これらの理由のため、対応は難しいようです。PRコントリビュートチャンスかと思いましたが、やはり簡単ではないですね…。

### DB接続時のセッションで有効なタイムゾーンってGoアプリの場合、どこに影響するの？

セッションのタイムゾーンを、DBから取得した`timestampz`の列データを`time.Time`に適用してくれないなら、どこに影響するのかという疑問ですよね。

最もわかりやすい影響しそうな箇所は、「文字列」↔ `timestampz` にSQL 側で変換を行う場合でしょう。

具体例をあげると、SQL側で以下のような `timestampz` の項目を `to_char` で文字列に変換する場合には、セッションで有効なタイムゾーンが利用されます（この例だと `Asia/Tokyo` を利用していますね）。

```sh
$ PGPASSWORD=pass psql -h localhost -p 5432 -U postgres \
  -c "select event_id, to_char(event_at, 'YYYY-MM-DD HH24:MI:SS') from event;"
 event_id |       to_char
----------+---------------------
 0001     | 2023-10-21 21:04:20
 0002     | 2023-10-21 21:04:20
(2 rows)
```

同様にGo側から日時情報を文字列で渡し、SQL側でパースして`timestampz`カラムに登録するような処理フローを行うと影響を受けるでしょう。

そのため、DBデフォルトのタイムゾーンや、DB接続時に指定するタイムゾーンは、Goアプリケーション側で利用するタイムゾーンと合わせることは必ず行うべきだと思います。`to_date()` や `to_char()` を将来に渡って必ず用いないという保証はないと思うからです。

### DB接続セッションのタイムゾーン値を利用してクエリ結果を time.Time 型のフィールドにマッピングするときに自動で設定する実装をしたい

pgxにも同じような旨のIssueである、[How do you set the timezone connection variable? #520](https://github.com/jackc/pgx/issues/520) が上がっていますが、少なくてもpgxにはそのような機能は無いようです。あまり探していませんがそういったライブラリが無いような気がします（みんな、 `TZ` で指定するか、 `time.Local` に設定している？）。pgxは拡張性が高いパッケージなので、下回りを操作すれば実現できるかもしれませんが、私は試していません。こうやれば良いよと言うのがあればぜひ教えてください。

`select current_setting('TIMEZONE')` で取得したタイムゾーンを、`time.In()` に設定して欲しい気持ちはよくわかります。

### go-sql-driver/MySQL みたいな loc=Asia%2FTokyo" オプションは無いの？

自信がなくなってきましたが、少なくても `jackc/pgx` については、私が探した範囲では見つけられませんでした。

## まとめ

- `timestamp with time zone`(`timestampz`) 型はUTCでデータを保持する
- セッションで利用されるタイムゾーン（DBデフォルトのタイムゾーンや接続文字列で指定した値など）は、少なくても `pgx` を利用する限りにおいては利用されず、 `time.Location` のタイムゾーンが設定される。別のタイムゾーンにしたい場合は、一般的には環境変数`TZ`を用いるか、`time.Location` の値を書き換えるか、個別に `time.In()` でタイムゾーンを書き換える必要がある
- 通常は、DB側のタイムゾーンと、Goアプリ側の `time.Time` が利用するタイムゾーンを一致させておくと良い

## 参考

- https://www.postgresql.jp/docs/15/datatype-datetime.html
- https://scientre.hateblo.jp/entry/20150407/datetime_with_time_zone
- https://anakage.com/blog/how-to-setup-time-zone-in-windows-system/
- https://tutuz-tech.hatenablog.com/entry/2021/01/30/192956
- https://github.com/jackc/pgx/issues/520
- https://stackoverflow.com/questions/72771272/how-to-setup-pgx-to-get-utc-values-from-db
- https://www.postgresql.org/docs/current/protocol-overview.html#PROTOCOL-FORMAT-CODES
