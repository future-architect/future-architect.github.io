---
title: "100%型安全なgolangORM「ent」を使ってみた"
date: 2021/07/28 00:00:00
postid: a
tag:
  - Go
  - ORM
category:
  - Programming
thumbnail: /images/20210728a/thumbnail.png
author: 宮崎将太
lede: "golang ORM連載の2記事目となります。はじめまして、TIGの宮崎将太です。突然ですがみなさん、ORMは何を使用していますか？"
---
# はじめに

[golang ORM連載](/articles/20210726a/)の2記事目となります。TIGの宮崎将太です。

突然ですがみなさん、ORMは何を使用していますか？

golangだとGORMがデファクトスタンダードの位置を勝ち取りつつあり、当社でも特に理由がない限りはGORMを使用するケースが多い印象です。

今回は新たな可能性としてFacebook社謹製の[ent/ent](https://github.com/ent/ent)を検証します。個人的なORM経験としてはRuby on RailsのActiveRecordから始まり、当社謹製の[UroboroSQL](https://future-architect.github.io/uroborosql-doc/)というORMからGORMまで割と多めに触れているので、大体どのORMでも気になる機能を中心に作りながら検証します。


# entとは

<img src="/images/20210728a/ent_doc_top.png" alt="entドキュメントトップページ" width="1200" height="583" loading="lazy">

公式から引用してくると以下の通りとのこと。

* データベーススキーマをグラフ構造として簡単にモデル化
* スキーマをプログラムのGoコードとして定義
* コード生成に基づく静的型付け
* データベースクエリおよびグラフトラバーサルの記述が容易
* Goテンプレートを使用することで拡張やカスタマイズが容易

ジェネリクスの無いgolangの構造上、GORMは`interface{}`で無理やり頑張ることが多く、しばしば挙動がわかりにくく感じますが、entの場合はコード生成をして100%型安全になるよう設計されているのが特徴なよう。

この辺りの考え方はswaggerの自動生成とも似ていますね。仕様を知らなくて重大なバグを引き起こしがちなGORMから解放される選択肢としてはとても良さそうです。

# 作りながら検証してみる

## 前提
以下環境にて準備を始めます。

* OS: Mac Catalina
* golang: version 1.16.6
* PostgreSQL: 12.4

PostgreSQLはDocker containerをローカルに立てています。

## 環境準備
適当にworkspaceを作ります。

```sh
mkdir ent-sample
cd ent-sample
go mod init  ent-sample
```

### CLIインストール

前述した通り、entはコード生成ツールを備え付けているので、まずはCLIツールをインストールします。

```sh
go get entgo.io/ent/cmd/ent
```

※過去の記事を見ていると`entc`をインストールしているものもありますが、2021年7月の[公式チュートリアル](https://entgo.io/ja/docs/getting-started)を見ると`ent`と記載があるので名称が変更されたようです。

## DB接続

何はともあれDB接続からです。main関数を実装します。
※PostgreSQLドライバをインストールしていない場合は`go get github.com/lib/pq`で導入してください。

``` golang
package main

import (
	"fmt"
	"log"

	"entgo.io/ent/examples/start/ent"
	_ "github.com/lib/pq"
)

func main() {
	client, err := ent.Open("postgres", fmt.Sprintf("host=%s port=%s user=%s dbname=%s password=%s sslmode=disable",
		"localhost", "5432", "postgres", "postgres", "pass"))
	if err != nil {
		log.Fatalf("failed opening connection to postgres: %v", err)
	}
	defer client.Close()
	log.Print("ent sample done.")
}

```

実行してみます。

```sh
$ go run main.go
2021/07/27 09:47:21 ent sample done.
```

ここまでは特殊な記法はありませんね。
PostgreSQL以外のDB接続は[こちら](https://entgo.io/ja/docs/crud/#%E6%96%B0%E3%81%97%E3%81%84%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%88%E3%82%92%E4%BD%9C%E6%88%90%E3%81%99%E3%82%8B)を参考にしてください。

## DBテーブル&モデル定義

ここからがGORMにはないent独特な操作。
スキーマをDSLで定義します。Ruby on Railでいうところのmigrationファイルですね。
開発フローはざっと↓みたいな感じになります。

1. スキーマ定義雛形生成
1. スキーマ定義記述
1. `go generate`で物理定義とモデルを作成
1. DB反映やアプリ実装

今回はオーソドックスに会社と会社に属するユーザを定義してみます。

### スキーマ定義雛形生成

以下コマンドでスキーマ定義の雛形を生成します。

```sh
go run entgo.io/ent/cmd/ent init User Company
```

上記コマンドを実行すると以下の通り`ent`配下にディレクトリとファイルが自動生成されます。
schema配下のファイルを実装していくことでスキーマ定義を完成させていきます。

```sh
.
├── ent
│   ├── generate.go    # この段階ではほぼ空ファイル
│   └── schema
│       ├── company.go # スキーマ定義の雛形
│       └── user.go    # スキーマ定義の雛形
├── go.mod
├── go.sum
└── main.go
```

### スキーマ定義記述

`ent/schema`配下のファイルを記述していきます。

生成された雛形に`Fields`と`Edges`というメソッドが定義されており、これを拡張することでスキーマ定義が可能です。

`Fields`と`Edges`の他にもIndex、Hook、Mixin(共通スキーマ定義)、Annotation(スキーマのカスタム定義)、Policy(リソースアクセス定義)を記述することができ、ORMで欲しくなる機能は一通り揃えているようです。
※Configという定義もありますが、Annotationに置き換えられる予定のようで、2021年7月時点でdeprecatedになっています。

* Fields
    * テーブルカラムを定義します。
    * `ent.Field`型としてカラムを宣言し、その配列を返却することでカラム定義としています。
    * 型桁, `not null`, `default`, `unique`など、カラム属性は全て此処で定義します。
    * entではデフォルトでサロゲートキー構造を前提としており、何もしないと`ID`カラムがPKとして定義されます。カスタマイズの方法は[こちら](https://entgo.io/ja/docs/schema-fields#id%E3%83%95%E3%82%A3%E3%83%BC%E3%83%AB%E3%83%89)です。
    * ちょっと特殊ですが、各カラムはデフォルトで`not null`です。`nullable`として定義する場合は明示的に定義する必要があります。（`nullbale`に意味を持たせるべきという思想らしい。正しいと思いますがパッと見わかりにくい。。）
    * DBに反映した結果どんな型桁になるかは何もしないとentデフォルト定義に従います。もちろんカスタマイズは可能で、ちょっと触ってみた感じは感覚値とだいぶズレがあったので明示的に定義することをお勧めします。[こちら](https://entgo.io/ja/docs/schema-fields#%E3%83%87%E3%83%BC%E3%82%BF%E3%83%99%E3%83%BC%E3%82%B9%E5%9E%8B)を参照してください。
* Edges
    * あまり一般的な用語ではなくわかりにくいですが、つまりはリレーションの定義です。
    * `ent.Edge`型としてリレーションを宣言し、その配列を返却することでリレーション定義としています。

今回は以下のような構造を作ってみます。

* 会社テーブル
    * id: bigint auto increment pk
    * 名称: varchar(30) not null
* ユーザテーブル
    * id: bigint auto increment pk
    * 性:  varchar(30) not null
        * 無駄にindexを貼ってみます
    * 名:  varchar(30) not null
    * 歳:  int nullable
    * メルアド: varchar(30) nullable
    * 会社id: bigint not null
        * 会社との関連カラムです。データ投入が面倒なので外部参照キー制約は貼らないようにしてみます。


調整してみた結果のスキーマ定義が以下

```go
// schema/comapny.go
package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
)

// Company holds the schema definition for the Company entity.
type Company struct {
	ent.Schema
}

// Fields of the Company.
func (Company) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			SchemaType(map[string]string{
				dialect.Postgres: "varchar(30)",
			}),
	}
}

// Edges of the Company.
func (Company) Edges() []ent.Edge {
	return nil
}
```

```go
// schema/user.go
package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// User holds the schema definition for the User entity.
type User struct {
	ent.Schema
}

// Fields of the User.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("first_name").
			SchemaType(map[string]string{
				dialect.Postgres: "varchar(30)",
			}),
		field.String("last_name").
			SchemaType(map[string]string{
				dialect.Postgres: "varchar(30)",
			}),
		field.String("email").
			SchemaType(map[string]string{
				dialect.Postgres: "varchar(30)",
			}).
			Optional(),
		field.Int("age").
			SchemaType(map[string]string{
				dialect.Postgres: "int",
			}).
			Optional(),
		field.Int("company_id"),
	}
}

// Edges of the User.
func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("company", Company.Type).
			Unique().
			Field("company_id").
			Required(),
	}
}

func (User) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("first_name", "last_name"),
	}
}
```

克服できなかった点含め、苦戦したのが以下です。

* DB型桁の定義
    見ての通りですがほぼ全てのカラムに対して`SchemaType`を呼び出しています。
    というのも、デフォルトのDB型マッピングだと、桁を全く意識してくれない（string定義すると`varchar(n)`ではなく`varchar`になってしまう。）ので、自分で`varchar(n)`を定義するしかありませんでした。
    ここら辺はentにプロジェクトルールを合わせてしまった方が楽なのかもしれない。
* Edgeの定義
    手厚く[ドキュメント](https://entgo.io/ja/docs/schema-edges)が用意されているものの、個人的には理解しにくい部分が多々..
    ただの`hasMany`構造を定義したいだけなのですが、カラム名や`not null`定義の調整にかなり時間を食いました。
    後述しますが、[ガイド](https://entgo.io/ja/docs/schema-edges#required)の通りにしているものの、外部参照カラムが`not null`になってくれていません。

とはいえ99%くらいは意図した通りに定義ができたので、コード生成をやってみます。

### `go generate`で物理定義とモデルを作成

下記コマンドを実行してコード生成をしてみます。

```sh
go generate ./ent
```

するとent配下に大量にコードが生成されているはずです。
後述するCRUD操作関連のコードやmigration関連コードまで含まれるので、自動生成ファイル総数が多くなるようですね。

```zsh
$ tree ./ent
./ent
├── client.go
├── company
│   ├── company.go
│   └── where.go
├── company.go
├── company_create.go
├── company_delete.go
├── company_query.go
├── company_update.go
├── config.go
├── context.go
├── ent.go
├── enttest
│   └── enttest.go
├── generate.go
├── hook
│   └── hook.go
├── migrate
│   ├── migrate.go
│   └── schema.go
├── mutation.go
├── predicate
│   └── predicate.go
├── runtime
│   └── runtime.go
├── runtime.go
├── schema
│   ├── company.go
│   └── user.go
├── tx.go
├── user
│   ├── user.go
│   └── where.go
├── user.go
├── user_create.go
├── user_delete.go
├── user_query.go
└── user_update.go
```

特段エラーが起きていないので、テーブル定義を出力してみたいと思います。

### migration

entでは自動migrationの他、ddl出力もサポートしています。

今回は初のmigrationなので、まずはddl出力をさせて、DB定義を確認したいと思います。

main.goを以下の通り変更します。

```go
package main

import (
	"context"
	"ent-sample/ent"
	"ent-sample/ent/migrate"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	client, err := ent.Open("postgres", fmt.Sprintf("host=%s port=%s user=%s dbname=%s password=%s sslmode=disable",
		"localhost", "5432", "postgres", "postgres", "pass"))
	if err != nil {
		log.Fatalf("failed opening connection to postgres: %v", err)
	}
	defer client.Close()
	ctx := context.Background()
	// Dump migration changes to stdout.
	if err := client.Schema.WriteTo(ctx, os.Stdout, migrate.WithForeignKeys(false)); err != nil {
		log.Fatalf("failed printing schema changes: %v", err)
	}
	log.Print("ent sample done.")
}


```

`migrate.Schema`に対して`WriteTo`メソッドを呼び出していますが、この部分がddl出力命令です。

簡素化のために標準出力していますが、ファイル指定することも可能です。
また、外部参照キー制約はテストには不便なので、`WriteTo`メソッドのオプションに`migrate.WithForeignKeys(false)`を渡すことで出力offしています。

実行してddl出力してみます。

```zsh
$ go run main.go
BEGIN;
CREATE TABLE IF NOT EXISTS "companies"("id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL, "name" varchar(30) NOT NULL, PRIMARY KEY("id"));
CREATE TABLE IF NOT EXISTS "users"("id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL, "first_name" varchar(30) NOT NULL, "last_name" varchar(30) NOT NULL, "email" varchar(30) NULL, "age" int NULL, "company_id" bigint NULL, PRIMARY KEY("id"));
CREATE INDEX "user_first_name_last_name" ON "users"("first_name", "last_name");
COMMIT;
2021/07/27 22:20:09 ent sample done.
```

前述した外部参照カラムの`nullable`設定を除くとだいたい意図した通りのテーブル定義になっていますね。無駄に設定したindexも想定通り出力されています。

出力されたddlをそのまま実行しても良いですが、せっかくなのでDBへの直接反映をさせてみます。

main.goを変更して同じように実行してみます。

```golang
package main

import (
	"context"
	"ent-sample/ent"
	"ent-sample/ent/migrate"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	client, err := ent.Open("postgres", fmt.Sprintf("host=%s port=%s user=%s dbname=%s password=%s sslmode=disable",
		"localhost", "5432", "postgres", "postgres", "pass"))
	if err != nil {
		log.Fatalf("failed opening connection to postgres: %v", err)
	}
	defer client.Close()
	ctx := context.Background()
	if err := client.Schema.Create(ctx, migrate.WithForeignKeys(false)); err != nil {
		log.Fatalf("failed printing schema changes: %v", err)
	}
	log.Print("ent sample done.")
}
```

```sh
$ go run main.go
2021/07/27 23:17:22 ent sample done.
```

無事テーブル定義反映までできました。

migrationはフックも作成することができるので、実行タイミングで共通りソースを作ったり、定義の微修正をしたりと細かな調整はできそうです。
ドキュメントは[こちら](https://entgo.io/ja/docs/migrate#%E3%83%9E%E3%82%A4%E3%82%B0%E3%83%AC%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%83%95%E3%83%83%E3%82%AF)です。

## CRUD

DB定義とモデルの生成までできたのでCRUD操作を試してみます。

### Create

CRUD全般通して、DB操作実行はCRUDビルダーの構築を介して実施します。
以下は単純に会社と会社に属するユーザを作成するコードです。

```golang
package main

import (
	"context"
	"ent-sample/ent"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	client, err := ent.Open("postgres", fmt.Sprintf("host=%s port=%s user=%s dbname=%s password=%s sslmode=disable",
		"localhost", "5432", "postgres", "postgres", "12081208Kl"))
	if err != nil {
		log.Fatalf("failed opening connection to postgres: %v", err)
	}
	defer client.Close()
	ctx := context.Background()
	cmp, err := client.Debug().Company.
		Create().
		SetName("companyA").
		Save(ctx)
	if err != nil {
		log.Fatalf("failed create company: %v", err)
	}
	log.Printf("cmp: %+v", cmp)
	usr, err := client.Debug().User.
			Create().
			SetFirstName("first name").
			SetLastName("last name").
			SetAge(20).
			SetEmail("example@example.co.jp").
			SetCompany(cmp).
			Save(ctx)
	if err != nil {
		log.Fatalf("failed create user: %v", err)
	}
	log.Printf("user: %+v", usr)

	log.Print("ent sample done.")
}

```

```
$ go run crud/main.go
2021/07/28 08:42:07 driver.Tx(20461e97-29a3-4362-a077-1debb7aa7c96): started
2021/07/28 08:42:07 Tx(20461e97-29a3-4362-a077-1debb7aa7c96).Query: query=INSERT INTO "companies" ("name") VALUES ($1) RETURNING "id" args=[companyA]
2021/07/28 08:42:07 Tx(20461e97-29a3-4362-a077-1debb7aa7c96): committed
2021/07/28 08:42:07 cmp: Company(id=1, name=companyA)
2021/07/28 08:42:07 driver.Tx(2eac4d6e-ad32-4a71-ab73-dcc8e0a5121e): started
2021/07/28 08:42:07 Tx(2eac4d6e-ad32-4a71-ab73-dcc8e0a5121e).Query: query=INSERT INTO "users" ("first_name", "last_name", "email", "age", "company_id") VALUES ($1, $2, $3, $4, $5) RETURNING "id" args=[first name last name example@example.co.jp 20 3]
2021/07/28 08:42:07 Tx(2eac4d6e-ad32-4a71-ab73-dcc8e0a5121e): committed
2021/07/28 08:42:07 user: User(id=1, first_name=first name, last_name=last name, email=example@example.co.jp, age=20, company_id=1)
```

正常に登録ができました。`client.Debug()`でデバッグモードのentクライアントを取得することができ、そのクライアントを使用することで実行されたSQLが全てロギングされます。今回は明示的にトランザクションを張っていないので2回commitがされていますが、当然[1トランザクションでの実行](https://entgo.io/ja/docs/transactions)も可能です。

また、DB反映メソッドは`Save`となっていますが、これとは別に`SaveX`というAPIも存在し、こちらは実行エラーの場合に`panic`を起こすようです。

### Update

Updateの例は以下です。

以降、共通的なコードは割愛します。

```go
	cmp, err := client.Debug().Company.
		Update().
		SetName("companyB").
		Where(company.Name("companyA")).
		Save(ctx)
	if err != nil {
		log.Fatalf("failed create company: %v", err)
	}
	log.Printf("cmp: %+v", cmp)
	usr, err := client.Debug().User.
		Update().
		SetAge(10).
		Where(user.Age(20)).
		Save(ctx)
```

```sh
$ go run crud/main.go
2021/07/28 08:48:12 driver.Tx(cb434071-2b63-4cdc-9fa6-93947c08daa3): started
2021/07/28 08:48:12 Tx(cb434071-2b63-4cdc-9fa6-93947c08daa3).Exec: query=UPDATE "companies" SET "name" = $1 WHERE "companies"."name" = $2 args=[companyB companyA]
2021/07/28 08:48:12 Tx(cb434071-2b63-4cdc-9fa6-93947c08daa3): committed
2021/07/28 08:48:12 cmp: 1
2021/07/28 08:48:12 driver.Tx(2fabd7e4-54cf-4491-b285-716084262d7f): started
2021/07/28 08:48:12 Tx(2fabd7e4-54cf-4491-b285-716084262d7f).Exec: query=UPDATE "users" SET "age" = $1 WHERE "users"."age" = $2 args=[10 20]
2021/07/28 08:48:12 Tx(2fabd7e4-54cf-4491-b285-716084262d7f): committed
2021/07/28 08:48:12 user: 1
2021/07/28 08:48:12 ent sample done.
```

条件句に相当する構造体まで生成されており、流れるようにコーディングすることができます。
他にも`Or`やモデルを指定した条件指定も可能です。

### Read

以下、条件句を指定したQueryの例です。

```go
	usr, err := client.Debug().User.
		Query().
		Where(user.Age(20)).
		All(ctx)
```

```sh
$ go run crud/main.go
2021/07/28 08:54:39 driver.Query: query=SELECT DISTINCT "users"."id", "users"."first_name", "users"."last_name", "users"."email", "users"."age", "users"."company_id" FROM "users" WHERE "users"."age" = $1 args=[10]
2021/07/28 08:54:39 user: [User(id=1, first_name=first name, last_name=last name, email=example@example.co.jp, age=10, company_id=2)]
2021/07/28 08:54:39 ent sample done.
```

他にもリレーションを持つデータを全てselectしたり、特定のフィールドのみのselect、別構造体へのscanなど、一般的な機能は全て備わっています。

### Delete

deleteは以下の通りです。

```go
	usr, err := client.Debug().User.
		Delete().
		Where(user.Age(10)).
		Exec(ctx)
```

```sh
$ go run crud/main.go
2021/07/28 09:01:31 driver.Tx(b01c2345-9243-4012-9ebf-d913c360560a): started
2021/07/28 09:01:31 Tx(b01c2345-9243-4012-9ebf-d913c360560a).Exec: query=DELETE FROM "users" WHERE "users"."age" = $1 args=[10]
2021/07/28 09:01:31 Tx(b01c2345-9243-4012-9ebf-d913c360560a): committed
2021/07/28 09:01:31 user: 1
2021/07/28 09:01:31 ent sample done.
```

Updateと同じように条件指定可能です。

# 所感

一通り読み書きしてみて、慣れれば特に他のORMに劣るということはなさそうでした。（トランザクション、型カスタマイズ、ロギング、登録・更新フック、システムカラム等）

GORMを使っても結局DSLに近いモデル定義をすることになるので、比較して煩雑ということもなく、むしろ必然的にテーブル定義と整合性が取れるので、モデル定義が間違っているのではないかという不安からは解放されるように感じました。

ただし、リレーションの書き方は他のORMと同様で独特の難しさがあり、この辺はケースごとに検証が必要そうです。

また、生成templateカスタマイズができるみたいだけど、どこまでできるか？生成されるSQLあたりまで調整ができるものなのか、別の機会にそこだけ切り取って検証記事をあげられたらと思います。


明日は多賀さんの[GORM v1 と v2 のソースコードリーディングしてみた](/articles/20210729a/)です。
