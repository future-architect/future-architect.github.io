---
title: "Testcontainersを用いてテスト実行前の docker compose up を無くし、Goで並列テストする"
date: 2024/04/09 00:00:00
postid: a
tag:
  - Testcontainers
  - テスト
  - Go
category:
  - Programming
thumbnail: /images/20240409a/thumbnail.png
author: 真野隼記
lede: "Testcontainers を用いて、単体テスト実行前に docker compose up -d 無しで、PostgreSQLにアクセスする単体テストを行う、入門記事です。"
---
[春の入門祭り2024](/articles/20240408a/)の1記事目です。

## はじめに

TIG真野です。

Testcontainers を用いて、単体テスト実行前に `docker compose up -d` 無しで、PostgreSQLにアクセスする単体テストを行う、入門記事です。

恩恵は次のような開発者体感の向上が個人的にあります。

- テストを実行するうえで、別プロセスのサービスを起動しておく必要があるといった前提条件を考えなくても済むため、テストを行うビジネスロジックに集中できる
    - `docker compose up -d` 打たないだけだが、テストに必要なコンテナを考慮しなくても済む
    - 停止し忘れて、別のリポジトリの開発するときに混乱しなくても済む
- 並列テストしやすくなるので、テストの実行速度が向上する
    - Goにおいて、複数のパッケージを同時にテストするとき、 `-p 1` で絞らずに済む

## Testcontainers とは

* https://testcontainers.com/

テストコード上で任意のコンテナを起動・停止できるドライバのようなライブラリです。Java, Go, Python, Rustなど様々な言語でをサポートしています。次はGoでredisを起動するコードです。Dockerfileで記載されていた内容を、Goの構造体に渡するとコンテナが起動しそうだということが分かると思います。

```go
container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
    ContainerRequest: testcontainers.ContainerRequest{
        Image:        "redis:5.0.3-alpine",
        ExposedPorts: []string{"6379/tcp"},
        WaitingFor:   wait.ForLog("Ready to accept connections"),
    },
    Started:          true,
})
```

TestcontainersのAPIとしてはDockerfileを読み込んで起動させることもできます。

テストコードとの組み合わせは、[getting-started](https://testcontainers.com/getting-started/)にかかれていた図が分かりやすいです。

「Set Up」にてTestcontainers経由でコンテナを取り上げ、テストでそれら立ち上げたサービスにアクセスし、テスト終了後にコンテナを削除する、という流れです。

<img src="/images/20240409a/test-workflow.png" alt="test-workflow.png" width="820" height="326" loading="lazy">

テストコード上でコンテナを起動するという発想がない場合は、手動でコンテナを起動したり、テストスクリプト上（MakefileやTaskfile）に記載していたかと思いますが、単なる起動はともかく、コンテナの破棄を含めたライフサイクル管理は少し手間でした。また、よくありがちなミスは、コンテナは起動したけど、必要なリソースリソース（例えばRDBだとテーブル、S3だとバケットなど）の作成が終わっていないのに、テストが実行されてFailになってしまうというミスも私はやりがちです。

Testcontainersはそれらの負荷を低減してくれます。


## PostgreSQLを利用する

RDB（PostgreSQL）をテストで用いるときに、必要となるテーブルは作成されている前提が多いでしょう。例えば次のように schema ディレクトリ配下にCREATE文のSQLファイルが存在しているとします。

```sh
.
├── schema  # DDL
│   ├── create_m_xxx_xxx_1.sql
│   ├── create_m_xxx_xxx_2.sql
│   ├── ...
│   └── create_m_xxx_xxx_9.sql
│
├── app    # 各アプリ（パッケージ名をID管理する大人な管理をしているとします）
│   ├── bl01
│   |     ├── ...
|   |     └── handler_test.go # テストコード
│   ├── bl02
│   ├── bl03
│   └── ...
└── ...
```

PostgreSQLのオフィシャルイメージでは、[`/docker-entrypoint-initdb.d/` 配下にSQLファイルをコピーすると、起動時にSQLを実行してくれます](https://hub.docker.com/_/postgres#:~:text=and%20POSTGRES_DB.-,Initialization%20scripts,-If%20you%20would)。これをTestcontainersを用いてDDL実行済みのPostgreSQLを起動します。

## moduleの利用

Testcontainers にはDockerfileで指定できる内容を実現するAPIが揃っているため、自分なりに細かくチューニングしても良いかと思いますが、一般的には「モジュール」と呼ばれる、良い感じに実装されたヘルパー関数のようなパッケージを経由して利用することが多いようです。このモジュールの中には、各プロダクトのベンダーと提携して作られた公式と呼ばれるものもあり、クオリティが高く保たれているため、基本的にここにある＋利用したい言語で存在するのであればモジュール経由でTestcontainersを利用することを私も推奨します。低レベルのAPIの利用を最初は試していましたが、イマイチ上手く動かせなかったところを、モジュールを利用するとすぐに解消されたことが何度かありました。

* https://testcontainers.com/modules/

[PostgreSQLモジュール](https://testcontainers.com/modules/postgresql/)はGo対応もしていますのでそのまま利用できます。

今回は複数のテストコードでコンテナを呼び出したいので、ヘルパーとして `testonly/testcontainers.go` のファイルを作ります。

`/docker-entrypoint-initdb.d/` の起動スクリプトですが、PostgreSQLのモジュールでは、ディレクトリごとコピーはできないため、ファイルの一覧を取得して、 `postgres.WithInitScripts(scripts...)` で渡しています。

次のポイントとして、`testcontainers.WithWaitStrategy()` の部分ですが、これは起動スクリプトで作成したテーブルが存在するまでWaitさせるという指示です。他にもコンテナが起動するまでWaitするなど様々な指定ができますが、この例では `m_xxx_xxx_1 ` テーブルが存在するまで確認させるようにしています。これで、必要なテーブルが作成されないまま、テストで検証するアプリコードが動いてしまうことを防ぎます。

```go testcontainers.go
package testonly

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"testing"
	"time"

	"github.com/docker/go-connections/nat"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

type PostgresContainer struct {
	postgres.PostgresContainer
	ConnectionString string
}

func (c PostgresContainer) Down() {
	if err := c.Terminate(context.Background()); err != nil {
		log.Printf("Could not stop postgres: %s\n", err)
	}
}

func SetupDB(t *testing.T) *PostgresContainer {
	t.Helper()
	ctx := context.Background()

	entries, err := os.ReadDir("../../schema")
	if err != nil {
		t.Fatal(err)
	}

	scripts := make([]string, 0, len(entries))
	for _, e := range entries {
		scripts = append(scripts, "../../schema"+e.Name())
	}

	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:15.5"),
		postgres.WithInitScripts(scripts...),
		postgres.WithDatabase("postgres"),
		postgres.WithUsername("local"),
		postgres.WithPassword("pass"),
		testcontainers.WithWaitStrategy(
			wait.ForSQL("5432", "postgres", func(host string, port nat.Port) string {
				return fmt.Sprintf("postgres://local:pass@%s/postgres?sslmode=disable", net.JoinHostPort(host, port.Port()))
			}).WithQuery("select 1 from m_xxx_xxx_9 limit 1").WithPollInterval(1*time.Second).WithStartupTimeout(10*time.Second)),
	)
	if err != nil {
		log.Fatalf("postgres run container: %s", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}

	return &PostgresContainer{
		PostgresContainer: pgContainer,
		ConnectionString:  connStr,
	}
}
```

上記のようなヘルパー関数を、テストコードから呼び出します。

ポイントは、接続文字列を`pgContainer.ConnectionString` から取得しているところです。理由ですがTestcontainersを用いると、ホスト側で利用するポートはランダムに決定します。そのため5432で決め打ちではなく、TestcontainersのPostgreSQLモジュールが割り当てた値を利用する必要があります。

```go handler_test.go
func TestHandler_GetXxxXxx(t *testing.T) {
	pgContainer := testonly.SetupDB(t) // PostgreSQL起動
	t.Cleanup(pgContainer.Down)

	// この例ではjackc/pgx/v4 を利用してコネクション接続
	pool, err := pgxpool.Connect(context.Background(), pgContainer.ConnectionString)
	if err != nil {
		t.Fatalf("connect db for test ,dsn = %s: %v", dsn, err)
	}

	// 個別のテスト
 }
```

## Testcontainers を用いると Goのパッケージ構成は package by feature がマッチする？

Testcontainersを用いると、例えば bl01, bl02間で共通するDBテーブルが存在したとしても、利用するコンテナが別になるため、当たり前ですが、特段の工夫無しで並列にテストを動かせるようになります。モックの利用を無しにそれを簡単に行えるのは素敵だと感じます。

この恩恵を得やすくするためには、 `package by feature`、つまり機能ごとのパッケージで作っておくとよいでしょう。機能単位に並列でテストができ、機能単位ゆえそれなりにテスト実行時間がならされていると思うので、テスト実行時間の短縮が見込みやすいと考えられるためです。

逆に、`package by layer`、つまりDBアクセスするコントローラ層（controller, usecase, handlerなど）でパッケージを切って、その配下に `xxx_handler.go`, `yyy_handler.go` などをフラットに並べて配置をしない方が良いと思いました（`handler` パッケージの配下に、サブパッケージを作れば別ですが、それはしないとします）。この場合はRDBなどのリソースにアクセスするため、おそらく最も時間がかかるcontrollerのようなパッケージのテストを分割実行しにくいためです。これはテストポリシーとして、リポジトリのようなDB層単体のテストコードも書くといった、レイヤーごとにテストサイズMediumのテストを実行するケース（個人的に出会ったことがないですが、ライブラリなどはありえる？）には当てはまらないと思いますので、ここに書いていない前提が色々入った上での意見になっていると思います。

## 使ってみての所感

Testcontainers経由での起動ですが、DDLが20ファイルほどでだいたい3~5秒程度の起動時間がかかります。これをどう見るかですが、個人的には複数のパッケージを並列でテスト実行できるというメリットがあり、受け入れられると感じています。

DBのような外部プロセスのサービスを、全テストで共有していた場合は、同じテーブルを複数のテストで書き換え競合してテストが落ちることを回避するために、同時実行数を1に抑えるため、`go test` に `-p 1` オプションを加えていましたが、これを無くせるのは嬉しいです。

Testcontainersを利用する前は、ローカル実行用の、Dockerfile, compose.yaml とTestcontainersのコードとのダブルメンテが嫌だなと感じていましたが、上記の利便性が大きいのでいつの間にか素直に受け入れられています。Testcontainersにも[Dockerfileやcompose.yaml を利用するAPI](https://golang.testcontainers.org/features/build_from_dockerfile/)があるので、工夫すればダブルメンテ無しでメリットを享受することもできるかもしれませんが、私は未検証です。

また、テスト毎にコンテナを起動するメリットは、他のパッケージのテストが副作用を起こし、まれにテストが落ちるパターンのフレーキーテスト（Flaky Test：実行結果が不安定なテストのこと）を発生させにくくするメリットもあるかと思います。例えば、テスト実行前に、前提とするマスタデータが別のパッケージのテスト（特に自分以外の開発者の作業で行われた場合）で書き換えられていたりして、地味にハマるケースは回避できるでしょう。


## さいごに

Testcontainersを用いてPostgreSQLにアクセスするGoのテストの書き方を紹介しました。

今回は割愛しましたが、私は `docker compose up` にて手動で起動済みの場合は、Testcontainers経由で起動せず、起動中のコンテナをそのままテストで利用するといった実装を入れています。そうすると、テスト実行後のDBの状態を見たいときと、単にテストを動かしたいだけのケースを棲み分けができ、開発時の切り分けがとても便利になりました。

上記のようなややトリッキーな制御も、Testcontainersだと比較的容易に実現でき、名前の通りテストコードとの統合性は高いと感じます。今後は他の案件にも横展開していこうと思います。オススメです。

