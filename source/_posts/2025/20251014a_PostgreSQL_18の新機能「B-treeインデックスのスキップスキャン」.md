---
title: "PostgreSQL 18の新機能「B-treeインデックスのスキップスキャン」"
date: 2025/10/14 00:00:00
postid: a
tag:
  - PostgreSQL
  - 実行計画
  - PostgreSQL18
category:
  - DB
thumbnail: /images/2025/20251014a/thumbnail.jpg
author: 村田靖拓
lede: "「B-treeインデックスのスキップスキャン」機能が気になったので、機能の特徴を深堀りしつつ、実際の挙動を確認してみます。複合インデックス（複数の列で構成されるインデックス）の利用効率を劇的に向上させる新しいスキャン方法です。"
---

<img src="/images/2025/20251014a/top.jpg" alt="" width="800" height="664">

[PostgreSQL18連載](/articles/20251006a/)の6本目の記事です。

[PostgreSQL 18がリリース](https://www.postgresql.org/about/news/postgresql-18-released-3142/)されました。リリースされた機能のうち私は「B-treeインデックスのスキップスキャン」機能が気になったので、機能の特徴を深堀りしつつ、実際の挙動を確認してみます。

# B-treeインデックスのスキップスキャンとは

複合インデックス（複数の列で構成されるインデックス）の利用効率を劇的に向上させる新しいスキャン方法です。

## 従来の課題

PostgreSQLでは、例えば`(列A, 列B)`という順番で複合インデックスを作成した場合、これまではWHERE句に先頭の「列A」の条件がないと、インデックスを効率的に使えませんでした。

例えば、`WHERE 列B = 'hoge'`というクエリでは、せっかくの `(列A, 列B)` インデックスをうまく使えず、結果としてテーブル全体をスキャン（シーケンシャルスキャン）してしまう、あるいは、インデックスを使えたとしても「列A」の条件を指定していない分だけパフォーマンスが低下する原因となっていました。

これにより「列B」だけのインデックスを別途作成するケースもあり、ストレージの無駄やデータ更新時のコスト増につながっていました。

## 新機能による効果

スキップスキャン機能では、インデックスの先頭列（列A）がWHERE句になくてもPostgreSQLがインデックスの内部を「スキップ」しながら、2番目以降の列（列B）の条件に合うデータをより効率的なアルゴリズムで探し出してくれます。

## 機能の仕組み

1. まず、インデックスの先頭列（列A）にどのような値の種類があるかを把握
2. 次に、列Aの各値の「先頭」にジャンプ
3. そこから、2番目の列（列B）が条件に合致するかどうかをチェック

これを列Aの値の種類ぶんだけ繰り返すことで、インデックス全体を舐めるよりもはるかに効率的にデータを見つけ出すことができます。

公式ドキュメントでは、上記2,3における挙動が詳細に説明されています。
>スキップスキャンは、インデックス列のすべての可能な値に一致する動的な等価制約を内部的に生成することによって機能します

つまり上記の例であれば、列Bに対してのみ条件が指定されている場合でも列Aに対する条件を内部的に生成して動作することを意味します。

>例えば、(x, y)に対するインデックスがあり、クエリ条件がWHERE y = 7700である場合、B-treeインデックススキャンはスキップスキャン最適化を適用できる可能性があります。これは一般的に、クエリプランナが、テーブルで利用可能なインデックスを考慮した上で、Nのすべての可能な値（またはインデックスに実際に格納されているすべてのxの値）に対してWHERE x = N AND y = 7700という検索を繰り返すことが最も高速なアプローチであると予測する場合に発生します。

この仕組みは、インデックスの先頭列の値の種類が少ない（カーディナリティが低い）場合に特に高い効果を発揮します。 例えば、「性別」「注文ステータス」「都道府県」のように、値のバリエーションが限られている列が先頭にある複合インデックスで非常に有効だと言えます。

https://www.postgresql.org/docs/current/indexes-multicolumn.html

# 実際に検証してみる

さて、PostgreSQL 17と18を比較してどのようにクエリ応答性能が変化しているか比べてみます。

## 検証環境

* Windows11 Home
* WSL2(ubuntu)

## PostgreSQL 18 の場合

### 下準備

#### データベースの準備

まずはPostgreSQL18が動く環境を準備します。（今回はDockerを利用）

```sh
docker run --name pg18-handson -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres:18
```

コンテナの起動を確認。

```sh
$ docker ps
CONTAINER ID   IMAGE                        COMMAND                  CREATED         STATUS                     PORTS                                       NAMES
0806a36cb87c   postgres:18                  "docker-entrypoint.s…"   8 seconds ago   Up 7 seconds               0.0.0.0:5432->5432/tcp, :::5432->5432/tcp   pg18-handson
```

`psql`コマンドで入ってみると、、しっかりと動いてることが確認できたので次に進みます。

```sh
$ docker exec -it pg18-handson psql -U postgres
psql (18.0 (Debian 18.0-1.pgdg13+3))
Type "help" for help.

postgres=#
```

#### テーブルの作成と検証用データの投入

`orders`テーブルを作成し、100万件のデータを投入します。

```sql
CREATE TABLE orders (
  order_id       SERIAL PRIMARY KEY,
  order_status   TEXT NOT NULL, -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled' の5種類
  customer_id    INTEGER NOT NULL,
  order_date     TIMESTAMPTZ NOT NULL,
  order_details  TEXT
);

-- サンプルデータを100万件投入
INSERT INTO orders (order_status, customer_id, order_date, order_details)
SELECT
  -- 5種類のステータスをランダムに割り当て
  (ARRAY['pending', 'processing', 'shipped', 'delivered', 'cancelled'])[floor(random() * 5) + 1],
  -- 1万人の顧客IDをランダムに割り当て
  floor(random() * 10000) + 1,
  -- 過去1年間のランダムな日時
  NOW() - (random() * 365) * '1 day'::interval,
  'details...'
FROM
  generate_series(1, 1000000);
```

#### 複合インデックスの作成

スキップスキャンの効果を検証するため、カーディナリティの低い `order_status` を先頭にした複合インデックスを作成します。

```sql
CREATE INDEX idx_orders_status_customer ON orders (order_status, customer_id);
```

#### 統計情報の更新

クエリオプティマイザが正しい判断を下せるように、テーブルの統計情報を最新の状態にします。

```sql
ANALYZE orders;
```

### スキップスキャン機能の検証

では、ここから実際に機能の検証を行ってみます。

まずは複合インデックスの2番目の列である`customer_id`のみをwhere句に指定して検索してみます。

```sh
postgres=*# EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
                                                                 QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------
 Index Scan using idx_orders_status_customer on orders  (cost=0.42..418.60 rows=100 width=36) (actual time=0.052..0.250 rows=93.00 loops=1)
   Index Cond: (customer_id = 123)
   Index Searches: 11
   Buffers: shared hit=126
 Planning Time: 0.062 ms
 Execution Time: 0.276 ms
```

Index Scanが行われており、 `0.276ms`で応答しました。高速ですね。ただし、実行計画にはスキップスキャンを示す表記が登場しないため、厳密にはスキップスキャンを行ったか否かを判断できないのが悩ましいところです。今回のクエリは複合インデックスの2列目に対してのみ等価条件を指定しており、1列目データ群はカーディナリティが低いため、"おそらく"スキップスキャンが行われているだろうと考えられます。

次に、Seq Scanが採択された場合にどのような結果となるかも試してみます。

```sh
postgres=*# SET LOCAL enable_indexscan = off;
SET
postgres=*# SET LOCAL enable_bitmapscan = off;
SET
postgres=*# EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
                                                        QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..15164.33 rows=100 width=36) (actual time=0.363..18.606 rows=93.00 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   Buffers: shared hit=8946
   ->  Parallel Seq Scan on orders  (cost=0.00..14154.33 rows=42 width=36) (actual time=0.141..14.359 rows=31.00 loops=3)
         Filter: (customer_id = 123)
         Rows Removed by Filter: 333302
         Buffers: shared hit=8946
 Planning Time: 0.062 ms
 Execution Time: 18.625 ms
```

`18.625ms`で応答しており、Index Scanよりも大幅に遅い結果になりました。

## PostgreSQL 17 の場合

次は同様の検証をPostgreSQL 17にて実施してみます。

### 下準備

以下コマンドでコンテナを立ち上げた後は18の時と同じ手順でデータを投入していきます。

```sh
docker run --name pg17-handson -e POSTGRES_PASSWORD=mysecretpassword -p 5433:5432 -d postgres:17
```

データが揃ったところで実際に検索してみます。

>最も大きな変更点として、PostgreSQL 18からEXPLAIN ANALYZEを実行すると、バッファ使用量が自動的に表示されるようになりました。これまではBUFFERSオプションを明示的に指定する必要がありましたが、18からは標準で出力されます。

[先日の山本さんの記事](/articles/20251008a/)にて触れられてましたが、PostgreSQL 17時点では`EXPLAIN ANALYZE`のみではバッファ使用量が出力されないので、Buffersオプションを付けて実行します。

```sh
postgres=#  EXPLAIN (ANALYZE,BUFFERS) SELECT * FROM orders WHERE customer_id = 123;
                                                                QUERY PLAN
-------------------------------------------------------------------------------------------------------------------------------------------
 Index Scan using idx_orders_status_customer on orders  (cost=0.42..12020.71 rows=100 width=36) (actual time=0.015..2.206 rows=95 loops=1)
   Index Cond: (customer_id = 123)
   Buffers: shared hit=1120
 Planning:
   Buffers: shared hit=5
 Planning Time: 0.077 ms
 Execution Time: 2.220 ms
```

`2.220ms`で応答しました。

次に、Seq Scan時の応答性能を確認しておきます。

```sh
postgres=*# SET LOCAL enable_indexscan = off;
SET
postgres=*# SET LOCAL enable_bitmapscan = off;
SET
postgres=*# EXPLAIN (ANALYZE,BUFFERS) SELECT * FROM orders WHERE customer_id = 123;
                                                      QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..15162.33 rows=100 width=36) (actual time=0.269..18.116 rows=95 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   Buffers: shared hit=8944
   ->  Parallel Seq Scan on orders  (cost=0.00..14152.33 rows=42 width=36) (actual time=0.281..14.290 rows=32 loops=3)
         Filter: (customer_id = 123)
         Rows Removed by Filter: 333302
         Buffers: shared hit=8944
 Planning Time: 0.066 ms
 Execution Time: 18.132 ms
```

結果は`18.132ms`でした。試行回数は少ないですが、バージョン18と大きな乖離があるわけではないと考えられます。

## 結果の考察

改めてバージョン18および17で実施した検証結果をまとめると以下の通りです。

| Type | ver.18 | ver.17 |
|:-----------|-----------:|-----------:|
| Index Scan | 0.276 ms | 2.220 ms       |
| Seq Scan | 18.625 ms | 18.132 ms     |

Index Scan性能は約8倍の差がありますね。18単体の結果を見た時点ではスキップスキャンによって高速化してるのかが正直分かりづらかったですが、こうして17と比較するとスキップスキャンが機能していることが確認できます。

# まとめ

PostgreSQL 18で追加されたスキップスキャン機構により、Index Scan時のクエリ応答性能が向上しました。また、複合インデックスを有効活用できるシーンが増えたことにより、不要なインデックスを削除でき、ディスク容量を節約するとともに登録・更新時の性能の向上も期待できます。

この新機能の特徴をしっかりとおさえた上で、インデックス設計および性能検証を行っていきましょう。
