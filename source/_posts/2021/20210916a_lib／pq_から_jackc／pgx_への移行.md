---
title: "lib/pq から jackc/pgx への移行"
date: 2021/09/16 00:00:00
postid: a
tag:
  - PostgreSQL
  - Go
  - ORM
  - jackc/pgx
category:
  - Programming
thumbnail: /images/20210916a/thumbnail.png
author: 筒井悠平
lede: "GoのORマッパー連載、おまけ記事です。特に示し合わせた訳では無いのですが、RDBは全員がPostgreSQLを使っていましたね。さて、今回の連載記事のいくつかでも言及されていた、jackc/pgx について簡単に紹介します。"
---

<img src="/images/20210916a/top.png" alt="" width="1000" height="378" loading="lazy">

ライブリッツの筒井です。

[GoのORマッパー連載](/articles/20210726a/)、おまけ記事です。
特に示し合わせた訳では無いのですが、RDBは全員がPostgreSQLを使っていましたね。

さて、今回の連載記事のいくつかでも言及されていた、[jackc/pgx](https://github.com/jackc/pgx) について簡単に紹介します。

- [GoとPoatgreSQLでCOPY](/articles/20210727a/)
- [GORM v1 と v2 のソースコードリーディングしてみた](/articles/20210729a/)

GoでのPostgreSQLドライバは [lib/pq](https://github.com/lib/pq) が定番でしたが、現在その開発は消極的で今後機能が追加されることはめったに無いそうです。
https://github.com/lib/pq#status

一方 pgx は現在も活発に開発がなされており、GORM v2にも採用されています。

## 使い方の比較

lib/pq （およびdatabase/sql）と pgx の使い方を比較していきます。
pgxはドライバだけでなく database/sql 相当の機能も備えており、これ単体で使用することが可能です。

### 接続

`configureDatabase()` が lib/pq および database/sql、`configureDatabasePgx()` が pgx での書き方です。以後この命名に従います。

`pgx.Connect()` で取得可能な `pgx.Conn` にはコネクションプールは含まれておらずスレッドセーフでも無いため、
database/sql と同様の使い方をする場合には `pgxpool.Connect()` を使用することになります。

```go
var (
	pool *pgxpool.Pool
	db   *sql.DB
)

func configureDatabase() {
	var err error
	uri := "postgres://postgres:password@postgres/postgres?sslmode=disable"
	db, err = sql.Open("postgres", uri)
	if err != nil {
		panic(err)
	}
}

func configureDatabasePgx() {
	var err error
	uri := "postgres://postgres:password@postgres/postgres?sslmode=disable"
	pool, err = pgxpool.Connect(context.Background(), uri)
	if err != nil {
		panic(err)
	}
}
```

### SQL実行

pgx では、各関数がデフォルトでcontextを受けるようになっています。そのため、database/sql の `QueryContext()` と pgx の `Query()` が同等です。

その他、ExecやBeginTxなどについても同様の使い勝手となるため割愛します。

```go
func query() error {
	q := `select tablename, tableowner from pg_catalog.pg_tables where schemaname = 'public'`
	rows, err := db.QueryContext(context.TODO(), q)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		var owner string
		rows.Scan(&name, &owner)
		fmt.Printf("%s owned by %s\n", name, owner)
	}
	return nil
}

func queryPgx() error {
	q := `select tablename, tableowner from pg_catalog.pg_tables where schemaname = 'public'`
	rows, err := pool.Query(context.TODO(), q)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		var owner string
		rows.Scan(&name, &owner)
		fmt.Printf("%s owned by %s\n", name, owner)
	}
	return nil
}
```

pgx の場合は1行ごとにコールバック関数を呼び出す `QueryFunc()` が用意されています。`defer rows.Close()` や `for rows.Next() {}` といったSnippetが不要になります。

```go
func queryPgxEx() error {
	fmt.Println("========== queryPgxEx() ==========")
	q := `select tablename, tableowner from pg_catalog.pg_tables where schemaname = 'public'`
	var name string
	var owner string
	_, err := pool.QueryFunc(context.TODO(), q, []interface{}{}, []interface{}{&name, &owner}, func(qfr pgx.QueryFuncRow) error {
		fmt.Printf("%s owned by %s\n", name, owner)
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}
```

### エラーハンドリング

pgx では Go 1.13 で追加された `errors.As()` が使えるようになっています。

```go
func invalidQuery() error {
	fmt.Println("========== invalidQuery() ==========")
	q := `select 1 +`
	var v int
	err := db.QueryRowContext(context.TODO(), q).Scan(&v)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			return fmt.Errorf("pq error: %v %s", err.Code, err.Message)
		}
		return err
	}
	return nil
}

func invalidQueryPgx() error {
	fmt.Println("========== invalidQueryPgx() ==========")
	q := `select 1 +`
	var v int
	err := pool.QueryRow(context.TODO(), q).Scan(&v)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return fmt.Errorf("pgx error: %s %s", pgErr.Code, pgErr.Message)
		}
		return err
	}
	return nil
}
```

## pgx の便利機能をつかう

pgx にはLoggerを設定することが可能です。

次のコードは pgx に zerolog を設定する例です。コネクションプールの作成時に設定します。

実行したSQLや実行時間を構造化ログとして出力できるのはなかなか便利です。

zerologの他にもzap、log15などのAdapterが用意されているようです。
https://github.com/jackc/pgx/tree/v4.13.0/log

```go
func configureDatabasePgxWithConfig() {
	var err error
	uri := "postgres://postgres:password@postgres/postgres?sslmode=disable"
	cfg, err := pgxpool.ParseConfig(uri)
	if err != nil {
		panic(err)
	}
	cfg.ConnConfig.Logger = zerologadapter.NewLogger(log.With().Logger())
	cfg.ConnConfig.LogLevel = pgx.LogLevelDebug
	pool, err = pgxpool.ConnectConfig(context.TODO(), cfg)
	if err != nil {
		panic(err)
	}
}
```

また、複数のSQLをまとめて実行できるBatch機能が用意されています。
通信にかかるオーバーヘッドを削減することが出来ますが、使い所は限定的かもしれません。

Resultの順番は、Queueに入れた順番が保持されています。

```go
func batch() error {
	fmt.Println("========== batch() ==========")
	b := &pgx.Batch{}
	b.Queue("select 1, pg_sleep(1.5)")
	b.Queue("select 2, pg_sleep(1.0)")
	b.Queue("select 3, pg_sleep(0.5)")
	res := pool.SendBatch(context.TODO(), b)
	defer res.Close()
	v := make([]int, 3)
	for i := 0; i < b.Len(); i++ {
		err := res.QueryRow().Scan(&v[i], nil)
		if err != nil {
			return err
		}
	}
	fmt.Printf("Result: %v\n", v) // Result: [1 2 3]
	return nil
}
```

## pgx と database/sql をあわせてつかう

[sqlx](https://github.com/jmoiron/sqlx) や [SQLBoiler](https://github.com/volatiletech/sqlboiler) など、 database/sql に依存するライブラリを使用する場合、pgx のドライバ (https://pkg.go.dev/github.com/jackc/pgx/v4@v4.13.0/stdlib) のみを利用することが可能です。

この連載で紹介された [ent](https://github.com/ent/ent) でも使用可能です。
https://entgo.io/docs/sql-integration/#use-pgx-with-postgresql

使いたいのがsqlxであれば、pgxをサポートしている [scany](https://github.com/georgysavva/scany) への乗り換えもありかと思います。

単純にドライバをすげ替えるだけであれば、インポートするドライバとドライバ名を変更するだけです。

```diff
import (
	"database/sql"
-	_ "github.com/lib/pq"
+	_ "github.com/jackc/pgx/v4/stdlib"
)

var err error
uri := "postgres://postgres:password@postgres/postgres?sslmode=disable"
- db, err = sql.Open("postgres", uri)
+ db, err = sql.Open("pgx", uri)

```

`stdlib.RegisterConnConfig()` を使えば、Loggerなどを設定することも可能です。

```go
uri := "postgres://postgres:password@postgres/postgres?sslmode=disable"
cfg, _ := pgx.ParseConfig(uri)
cfg.Logger = zerologadapter.NewLogger(log.With().Logger())
connStr := stdlib.RegisterConnConfig(cfg)
db, _ = sql.Open("pgx", connStr)
```

また `sql.Conn.Raw()` を使うと、普段は `sql.DB` でコネクションを扱いつつ、CopyFrom など pgx の機能が使いたいときは `pgx.Conn` を使う、といった使い方が可能になります。

```go
conn, err := db.Conn(context.TODO())
if err != nil {
	// handle error
}
err := conn.Raw(func(driverConn interface{}) error {
	var c *pgx.Conn = driverConn.(*stdlib.Conn).Conn()
	c.CopyFrom(...)
	return nil
})
```

## おわりに

ここで紹介した以外にも、database/sql には無いたくさんの機能が sqlx では実装されています。
https://github.com/jackc/pgx#features

lib/pq から pgx への移行にかかる問題については、golang-migrate の[こちらのIssue](https://github.com/golang-migrate/migrate/issues/512)における議論がとても参考になります。
移行作業自体はとても簡単ですので、まずは試してみてはいかがでしょうか。

