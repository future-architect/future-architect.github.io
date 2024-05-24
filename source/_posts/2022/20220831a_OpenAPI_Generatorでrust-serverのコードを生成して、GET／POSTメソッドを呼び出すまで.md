---
title: "OpenAPI Generatorでrust-serverのコードを生成して、GET/POSTメソッドを呼び出すまで"
date: 2022/08/31 00:00:00
postid: a
tag:
  - OpenAPIGenerator
  - Rust
category:
  - Programming
thumbnail: /images/20220831a/thumbnail.png
author: 中川旭
lede: "夏の自由研究ということで、趣味で作ったものを一部改変して記事化しました。コードのサンプルを以下のリポジトリに配置しました。記事には重要な部分を記載しているので、コード全体を見たい場合にはリポジトリを参照してください。"
---
<img src="/images/20220831a/beach-g4cba82d86_640.png" alt="" width="600" height="404">

TIG DXユニットの中川旭です。

夏の自由研究ということで、趣味で作ったものを一部改変して記事化しました。

## はじめに
コードのサンプルを以下のリポジトリに配置しました。
記事には重要な部分を記載しているので、コード全体を見たい場合にはリポジトリを参照してください。
https://github.com/modockey/openapi-rust

以下が使用できることを前提としています。
- rustup
- npm
- GNU make
- docker

手元の環境はUbuntu20.04LTS on WSL2です。

## YAMLファイルの記述

まずはYAMLファイルにAPIのスキーマを記述します。
同一PATH(/ip)にGET/POSTメソッドをそれぞれ用意しました。

内容は変化してしまう自宅のグローバルIPの管理のための機能です。
- GET: DBに登録された最新のグローバルIPアドレスを取得する
- POST: グローバルIPアドレスをDBに登録する。最新のものと同じ場合は確認時刻として記録し、異なる場合は新規登録する。

```yaml openapi.yaml
openapi: 3.0.3
info:
  description: "GET/POST IPv4 Address"
  version: "1.0.0"
  title: "openapi-rust"
tags:
  - name: "IP"
paths:
  /ip:
    get:
      responses:
        "200":
          description: "Get Global IPv4 address of the system"
          content:
            application/json:
              schema:
                type: object
                properties:
                  IPv4_address:
                    type: string
                    format: ipv4
                  checked_at:
                    type: string
                    format: date-time
        "500":
          description: "Internal Server Error"
    post:
      requestBody:
        description: "IPv4 address to register"
        content:
          application/json:
            schema:
              properties:
                IPv4_address:
                  type: string
                  format: ipv4
      responses:
        "200":
          description: "The new IPv4 address has been registered"
        "500":
          description: "Internal Server Error"
```

## コード生成

OpenAPI Generatorのリポジトリに使用方法が書いてあるので、好きな方法で使用しましょう。
https://github.com/OpenAPITools/openapi-generator#openapi-generator

いくつか方法がありますが、今回はNPMを使用してインストールしました。
npmを使用することができれば、以下のようにインストールするだけで使用可能です。
```bash
npm install @openapitools/openapi-generator-cli -g
```

さて、Makefileに以下のように記載しておきましょう。
```Makefile
generate:
	openapi-generator-cli generate \
    -i ./openapi.yaml \
    -g rust-server \
    -o .
```

この状態で`make generate` でコードを生成すると、もともと配置していた`Makefile`と`openapi.yaml`の他にたくさんのファイルが生成されます。
親切に、Markdownのドキュメントまで生成してくれていますね。

```bash
$ tree
.
├── Cargo.toml
├── Makefile
├── README.md
├── api
│   └── openapi.yaml
├── docs
│   ├── IpGet200Response.md
│   └── default_api.md
├── examples
│   ├── ca.pem
│   ├── client
│   │   └── main.rs
│   ├── server
│   │   ├── main.rs
│   │   └── server.rs
│   ├── server-chain.pem
│   └── server-key.pem
├── openapi.yaml
├── openapitools.json
└── src
    ├── client
    │   └── mod.rs
    ├── context.rs
    ├── header.rs
    ├── lib.rs
    ├── models.rs
    └── server
        └── mod.rs
```

## DBの準備
本体部分の前に、アクセス対象のDBの説明をしておきます。
今回はPostgreSQLをDockerで使用します。

以下のように設定ファイルを作成しました。
```bash
.
├── Makefile
├── database
│   ├── Dockerfile
│   └── init
│       ├── ddl.sql
│       └── dml.sql
└─── docker-compose.yml
```

説明の都合上、テーブル定義とテストデータの内容だけ記載します。
他の部分は必要であればリポジトリを参照してください。

```sql ddl.sql
drop table if exists ipv4_history;

create table ipv4_history (
  id serial,
  ipv4_address varchar(15) not null,
  effective_flg boolean not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_checked_at timestamptz not null,
  PRIMARY KEY (id)
);
```

```sql dml.sql
truncate table ipv4_history;

insert into
  ipv4_history (
    id,
    ipv4_address,
    effective_flg,
    created_at,
    updated_at,
    last_checked_at
  )
values
  (
    1,
    '111.111.111.111',
    false,
    '2022-01-01 00:00:00Z',
    '2022-01-01 00:00:00Z',
    '2022-01-01 00:00:00Z'
  ),
  (
    2,
    '112.112.112.112',
    true,
    '2022-01-02 00:00:00Z',
    '2022-01-02 00:00:00Z',
    '2022-01-02 00:00:00Z'
  );
```

これにより以下コマンドでDBの起動とテストデータの準備を行うことができるようになりました。
```bash
make setup
```

## 生成されたコードの確認 & cargo run で動かせるようコードを移動

生成されたコードをどう使えばいいのか、`README.md`を確認してみると以下の記載があります。
```markdown README.md
### Running the example server
To run the server, follow these simple steps:

cargo run --example server
```
[公式ドキュメント](https://doc.rust-lang.org/cargo/reference/cargo-targets.html#examples)に記載があるように、このコマンドでは`./examples/server/main.rs`が実行されます。

ということで、`./example/`配下のコードを`./src`配下にコピーします。
`server.rs`は名前が`server`ディレクトリと衝突するので名前を変更しておきましょう。今回は`api.rs`とします。

これに合わせ、`main.rs`のmod宣言と使用部分を以下のように変更します。
```rust ./src/main.rs
mod api;
```
```rust ./src/main.rs
api::create(addr, matches.is_present("https")).await;
```

この状態で`cargo run`をすると以下のようなエラーになります。`cargo add`で追加しましょう。
```
error[E0433]: failed to resolve: use of undeclared crate or module `tokio`
```

自分の場合はエラーログから必要だった以下のcrateを追加しました。
```bash
cargo add tokio clap env_logger tokio_openssl
```

改めて`cargo run`で実行すると、`localhost:8080`にサーバーが立ちます。

サーバーを立てて以下のようにcurlでGETをしてみると
```bash
curl localhost:8080/ip
```
処理が実装されていないため以下のレスポンスが返ってきます。
```
An internal error occurred
```

では、実装していきましょう。

## 実装

今回は`./src`に`db.rs`,`usecase.rs`を新規作成します。さらに、先ほど`./examples/server/server.rs`をコピーして作成した`api.rs`にも追記します。
それぞれに記載する内容は以下とします。
- `db.rs`(新規): DBとのIO、`src/db/`には`db.rs`から呼び出すORM用のファイルを配置する
- `usecase.rs`(新規): DBとのIOを呼び出すロジック
- `api.rs`(追記): リクエストのハンドリング

```
└── src
    ├── api.rs
    ├── client
    ├── context.rs
    ├── db
    │   ├── model
    │   │   └── schema.rs
    │   └── model.rs
    ├── db.rs
    ├── header.rs
    ├── lib.rs
    ├── main.rs
    ├── models.rs
    ├── usecase.rs
    └── server
```

#### db.rsの実装
今回はRustのORMとしてメジャーなDieselを使用するため、`cargo add`をします。
DieselでPostgresSQLと日時を扱いたいので`--features "postgres chrono"`を引数としています。

```bash
cargo add diesel --no-default-features --features "postgres chrono"
```

また、設定のためにdiesel_cliをinstallします。
```bash
cargo install diesel_cli
```

diesel_cliを使用して`db.go`から参照するスキーマを作成します。
.envファイルに環境変数をセットして、print-schemaを実行しましょう。
```bash
DATABASE_URL=postgres://postgres:postgres@localhost/postgres > .env
diesel print-schema > ./src/db/model/schema.rs
```

指定したファイルにschemaが出力されます。
```rust src/db/model/schema.rs
table! {
    ipv4_history (id) {
        id -> Int4,
        ipv4_address -> Varchar,
        effective_flg -> Bool,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        last_checked_at -> Timestamptz,
    }
}
```

SELECTやINSERTをマップする構造体を定義します。
```rust src/db/model.rs
use chrono::{DateTime, Utc};

pub mod schema;
use schema::ipv4_history;

#[allow(dead_code)]
#[derive(Clone, Queryable)]
pub struct Ipv4Record {
    pub id: i32,
    pub ipv4_address: String,
    effective_flg: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    pub last_checked_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[table_name = "ipv4_history"]
pub struct NewIpV4Record {
    pub ipv4_address: String,
    pub effective_flg: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_checked_at: DateTime<Utc>,
}

```

DBを扱う際に使用する便利なメソッドをいくつか用意します。
```rust src/db.rs
use chrono::Utc;

use diesel::prelude::*;
use diesel::{insert_into, update};

pub mod model;
use model::schema::ipv4_history::dsl::*;
use model::{Ipv4Record, NewIpV4Record};

use dotenv::dotenv;
use std::env;

pub fn establish_connection() -> PgConnection {
    if cfg!(test) | cfg!(debug_assertions) {
        dotenv().ok();
    }

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url).expect(&format!("Error connecting to {}", database_url))
}

pub fn get_effective_records(conn: &PgConnection) -> Vec<Ipv4Record> {
    let ipv4_effective = ipv4_history
        .filter(effective_flg.eq(true))
        .load::<Ipv4Record>(conn)
        .expect("Error loading ipv4_history");
    return ipv4_effective;
}

pub fn insert_record(conn: &PgConnection, address: &str) -> Ipv4Record {
    let now = Utc::now();
    let new_ipv4_record = NewIpV4Record {
        ipv4_address: address.to_string(),
        effective_flg: true,
        created_at: now,
        updated_at: now,
        last_checked_at: now,
    };
    insert_into(ipv4_history)
        .values(new_ipv4_record)
        .get_result(conn)
        .expect("Error saving record")
}

pub fn disable_record(conn: &PgConnection, target_id: &i32) -> Ipv4Record {
    update(ipv4_history.find(target_id))
        .set((effective_flg.eq(false), updated_at.eq(Utc::now())))
        .get_result::<Ipv4Record>(conn)
        .expect(&format!("Error Update Record {}", target_id))
}

pub fn update_last_checked_at(conn: &PgConnection, target_id: &i32) -> Ipv4Record {
    let now = Utc::now();
    update(ipv4_history.find(target_id))
        .set((last_checked_at.eq(now), updated_at.eq(now)))
        .get_result::<Ipv4Record>(conn)
        .expect(&format!("Error Update Record {}", target_id))
}

```

#### usecase.rsの実装
GET、POSTメソッドで呼び出すロジックを記載しています。ここから`db.rs`にある関数を呼び出します。
```rust ./src/usecase.rs
use crate::db;
use db::*;

pub fn get_effective_ipv4_record() -> Result<db::model::Ipv4Record, String> {
    let conn = establish_connection();
    let effective_records = get_effective_records(&conn);

    if effective_records.len() == 0 {
        return Err("IPv4 record not found".into());
    }

    if effective_records.len() > 1 {
        return Err("Too many IPv4 records have been found".into());
    }

    return Ok(effective_records[0].clone());
}

pub fn post_ip4_address(ipv4_address: &str) -> Result<(), String> {
    let conn = establish_connection();
    let effective_records = get_effective_records(&conn);

    if effective_records.len() == 0 {
        insert_record(&conn, ipv4_address);
        return Ok(());
    }

    if effective_records.len() > 1 {
        return Err("Too many IPv4 records have been found".into());
    }

    if ipv4_address == effective_records[0].ipv4_address {
        update_last_checked_at(&conn, &effective_records[0].id);
        return Ok(());
    }

    disable_record(&conn, &effective_records[0].id);
    insert_record(&conn, ipv4_address);
    Ok(())
}
```

#### api.rsの実装
リクエストをハンドリングする部分です。
※ファイル上部には生成されたコードがあるため、自分で記述したファイル下部のみ記載しています。
```rust src/db.rs
use openapi_client::server::MakeService;
use openapi_client::IpGetResponse::GetGlobalIPv;
use openapi_client::IpPostResponse::*;
use openapi_client::{Api, IpGetResponse, IpPostResponse};
use std::error::Error;
use swagger::ApiError;

use crate::db;
use crate::db::model::schema::ipv4_history::ipv4_address;
use crate::usecase;
use usecase::*;

use models::IpGet200Response;

#[async_trait]
impl<C> Api<C> for Server<C>
where
    C: Has<XSpanIdString> + Send + Sync,
{
    async fn ip_get(&self, context: &C) -> Result<IpGetResponse, ApiError> {
        let context = context.clone();
        info!("get_ip() - X-Span-ID: {:?}", context.get().0.clone());
        match get_effective_ipv4_record() {
            Ok(ipv4_record) => Ok(GetGlobalIPv(IpGet200Response {
                ipv4_address: Some(ipv4_record.ipv4_address.to_string()),
                checked_at: Some(ipv4_record.last_checked_at),
            })),
            Err(e) => Err(ApiError(e.into())),
        }
    }

    async fn ip_post(
        &self,
        ip_get_request: Option<models::IpGetRequest>,
        context: &C,
    ) -> Result<IpPostResponse, ApiError> {
        let context = context.clone();
        info!(
            "ip_post({:?}) - X-Span-ID: {:?}",
            ip_get_request,
            context.get().0.clone()
        );

        if let Some(request) = ip_get_request && let Some(address)=request.ipv4_address && is_ipv4(&address){
            match post_ip4_address(&address) {
                Ok(()) => Ok(TheNewIPv {}),
                Err(e) => Err(ApiError(e.into())),
            }
        } else {
                Ok(BadRequest)
        }
    }
}

use regex::Regex;

 fn is_ipv4(text: &str) -> bool {
    let re = Regex::new(
        r"^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$",
    ).unwrap();
    re.is_match(text)
}
```


#### ビルド
上記実装をして`cargo build`をすると不足しているcrateがあるはずです。以下のように追加します。
```bash
cargo add dotenv regex
```

## curlで動作テスト
さて、DBを立ち上げた状態でAPIサーバーを起動しましょう。

```bash
cargo run
```

動作確認はcurlで行います。

GETメソッドで最新のレコードが取得できていることがわかります。

```bash
$ curl -X GET localhost:8080/ip -i
HTTP/1.1 200 OK
x-span-id: 8a278ac0-a84f-4643-b29b-22ae83be9d6c
content-type: application/json
content-length: 70
date: Sun, 28 Aug 2022 18:12:27 GMT

{"IPv4_address":"112.112.112.112","checked_at":"2022-01-02T00:00:00Z"}%
```

POSTメソッドのパラメータとして登録内容を渡すと、新規レコードが登録されます。
その後GETメソッドを呼び出すと登録されたことが確認できます。

```bash
$ curl -X POST localhost:8080/ip -H "Content-Type: application/json" -d '{"IPv4_address":"1.1.1.1"}' -i
HTTP/1.1 200 OK
x-span-id: 72fb2d42-c968-4e6a-bf54-73cf0b592e07
content-length: 0
date: Sun, 28 Aug 2022 18:18:02 GMT

$ curl -X GET localhost:8080/ip -i
HTTP/1.1 200 OK
x-span-id: 42879369-eda0-4cdf-927c-853db2548efe
content-type: application/json
content-length: 69
date: Sun, 28 Aug 2022 18:19:40 GMT

{"IPv4_address":"1.1.1.1","checked_at":"2022-08-28T18:18:02.385752Z"}%
```

## おわりに
Rustのコンパイラは本当に優秀で、的確にたくさん叱ってくれます。
言語仕様も洗練されており、曖昧なところや危険なところはそれを明示する必要があるような仕組みになっています。
こういった点を楽しめる人にとってRustはきっと最高の言語です。案外ハマるかもしれないので、みなさんぜひ書いてみてください！

アイキャッチ画像は<a href="https://pixabay.com/ja/users/ricinator-3282802/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1777966">Ricarda Mölck</a>による<a href="https://pixabay.com/ja//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1777966">Pixabay</a>を利用させていただきました。
