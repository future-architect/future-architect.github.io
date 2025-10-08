---
title: "PostgreSQL18でのEXPLAINの更新を見る、あわせてEXPLAINを振り返る"
date: 2025/10/08 00:00:00
postid: a
tag:
  - PostgreSQL
  - 実行計画
  - PostgreSQL18
category:
  - DB
thumbnail: /images/2025/20251008a/thumbnail.jpg
author: 山本竜玄
lede: "PostgreSQL 18の新機能と、あわせて基礎的な使い方まで記載します。"
---

<img src="/images/2025/20251008a/top.jpg" alt="" width="800" heihgt="664">

本記事は、[PostgreSQL18連載](/articles/20251006a/)の2本目の記事です。

## はじめに

こんにちは。山本竜玄です。

データベースのパフォーマンス問題に直面したとき、クエリが遅い原因の特定は難しい課題です。テーブルスキャンの方法、インデックスの利用状況、結合処理の手法など、データベース内部の動作を理解する必要があります。

PostgreSQLのEXPLAINは、こうした内部動作を可視化する強力なツールです。2025年9月にリリースされたPostgreSQL 18では、バッファ使用量の自動表示など、パフォーマンス分析をより手軽にする改善が加えられました。

この記事では、PostgreSQL 18の新機能と、あわせて基礎的な使い方まで記載します。既にEXPLAINを使ったことがある方は、「PostgreSQL 18でのEXPLAIN機能強化」セクション以外は適宜スキップください。

## PostgreSQL 18でのEXPLAIN機能強化

PostgreSQL 18では、EXPLAIN ANALYZEがより実用的になる改善が行われています。公式リリースノートによると、いくつかの重要な機能追加がありました。

### 1. バッファ使用量のデフォルト表示

最も大きな変更点として、PostgreSQL 18からEXPLAIN ANALYZEを実行すると、バッファ使用量が自動的に表示されるようになりました。これまではBUFFERSオプションを明示的に指定する必要がありましたが、18からは標準で出力されます。

```sql
EXPLAIN ANALYZE SELECT * FROM large_table WHERE id > 1000;
```

```plan
                                                   QUERY PLAN
-----------------------------------------------------------------------------------------------------------------
 Seq Scan on large_table  (cost=0.00..189.00 rows=9000 width=18) (actual time=0.052..0.797 rows=9000.00 loops=1)
   Filter: (id > 1000)
   Rows Removed by Filter: 1000
   Buffers: shared hit=64
 Planning:
   Buffers: shared hit=20
 Planning Time: 0.129 ms
 Execution Time: 1.116 ms
(8 rows)
```

このクエリを実行すると、`Buffers: shared hit=64`のように、ヒット数、読み込み数、ダーティ化したブロック数などが自動的に表示されます。I/O活動を把握する上で非常に重要な情報なので、デフォルトになったことで使いやすさが向上しています。

### 2. インデックスルックアップ回数の表示

PostgreSQL 18から、EXPLAIN ANALYZEで各インデックススキャンノードが実行したルックアップの回数が表示されるようになりました。

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42;
```

```
                                                            QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on orders  (cost=5.28..70.90 rows=129 width=18) (actual time=0.018..0.071 rows=129.00 loops=1)
   Recheck Cond: (customer_id = 42)
   Heap Blocks: exact=56
   Buffers: shared hit=58
   ->  Bitmap Index Scan on orders_customer_idx  (cost=0.00..5.25 rows=129 width=0) (actual time=0.008..0.008 rows=129.00 loops=1)
         Index Cond: (customer_id = 42)
         Index Searches: 1
         Buffers: shared hit=2
 Planning:
   Buffers: shared hit=36
 Planning Time: 0.128 ms
 Execution Time: 0.087 ms
(12 rows)
```

実行結果には `Index Searches: 1` のような行が追加され、インデックスを何回検索したかが明確になります。特にスキップスキャンが使われる場合、複数回の検索が行われることがあるので、この情報でインデックスの動作をより詳細に理解できます。

### 3. WAL buffers fullの追加

PostgreSQL 18から、WAL統計に新しい情報が追加されました。WALバッファがフルになった回数（buffers full）が表示されるようになり、WALバッファのサイズ調整が必要かどうかを判断できます。

```sql
EXPLAIN (ANALYZE, WAL, BUFFERS)
UPDATE wal_test SET data = md5(data);
```

```
 Update on wal_test  (cost=0.00..217.35 rows=0 width=0) (actual time=48.481..48.482 rows=0.00 loops=1)
   Buffers: shared hit=60412 dirtied=110 written=117
   WAL: records=30135 bytes=2413984 buffers full=268
   ->  Seq Scan on wal_test  (cost=0.00..217.35 rows=10668 width=38) (actual time=0.025..12.371 rows=10000.00 loops=1)
         Buffers: shared hit=84
 Execution Time: 48.626 ms
(6 rows)
```

`buffers full=268`は、WALバッファがフルになり、ディスクへの書き込みが発生した回数を示します。この値が大きい場合、wal_buffersパラメータを増やすことで性能が改善する可能性があります。

I/O統計やその他のWAL統計の詳細については、BUFFERSオプションおよびWALオプションセクションで解説します。

### 4. その他のEXPLAIN機能強化

PostgreSQL 18では、上記の主要な機能に加えて、特定のノードでの詳細情報も強化されています。

#### 小数点での行数表示

PostgreSQL 18から、1行未満の推定値も小数点で正確に表現されるようになりました。

例えば、Nested Loop Joinの内側でフィルタ条件により平均0.15行が返される場合、これまでは`rows=0`または`rows=1`と丸められていましたが、PostgreSQL 18では`rows=0.15`と正確に表示されます。

```
->  Index Scan using customers_pkey on customers c  (cost=0.27..0.35 rows=1 width=16) (actual time=0.001..0.001 rows=0.15 loops=438)
      Index Cond: (id = o.customer_id)
      Filter: (city = 'Tokyo'::text)
      Rows Removed by Filter: 1
```

これにより、確率の低いフィルタ条件での推定精度が向上し、プランナーがより正確なコスト計算を行えるようになりました。

#### ウィンドウ関数の引数詳細

ウィンドウ関数を使用する際に、より詳細な情報が表示されるようになりました。

```sql
EXPLAIN (ANALYZE, VERBOSE, BUFFERS)
SELECT
    category,
    product_name,
    amount,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY amount DESC) as rank,
    AVG(amount) OVER (PARTITION BY category) as avg_amount
FROM sales
ORDER BY category, rank;
```

```
                                                               QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------------
 Incremental Sort  (cost=102.22..158.29 rows=1000 width=64) (actual time=1.589..2.132 rows=1000.00 loops=1)
   Output: category, product_name, amount, (row_number() OVER w1), (avg(amount) OVER w2)
   Sort Key: sales.category, (row_number() OVER w1)
   Presorted Key: sales.category
   Full-sort Groups: 3  Sort Method: quicksort  Average Memory: 29kB  Peak Memory: 29kB
   Pre-sorted Groups: 3  Sort Method: quicksort  Average Memory: 45kB  Peak Memory: 45kB
   Buffers: shared hit=12
   ->  WindowAgg  (cost=80.46..103.83 rows=1000 width=64) (actual time=1.199..1.821 rows=1000.00 loops=1)
         Output: category, product_name, amount, (row_number() OVER w1), avg(amount) OVER w2
         Window: w2 AS (PARTITION BY sales.category)
         Storage: Memory  Maximum Storage: 37kB
         Buffers: shared hit=9
         ->  WindowAgg  (cost=68.85..88.83 rows=1000 width=32) (actual time=0.958..1.313 rows=1000.00 loops=1)
               Output: category, amount, product_name, row_number() OVER w1
               Window: w1 AS (PARTITION BY sales.category ORDER BY sales.amount ROWS UNBOUNDED PRECEDING)
               Storage: Memory  Maximum Storage: 17kB
               Buffers: shared hit=9
               ->  Sort  (cost=68.83..71.33 rows=1000 width=24) (actual time=0.949..0.991 rows=1000.00 loops=1)
                     Output: category, amount, product_name
                     Sort Key: sales.category, sales.amount DESC
                     Sort Method: quicksort  Memory: 69kB
                     Buffers: shared hit=9
                     ->  Seq Scan on public.sales  (cost=0.00..19.00 rows=1000 width=24) (actual time=0.007..0.095 rows=1000.00 loops=1)
                           Output: category, amount, product_name
                           Buffers: shared hit=9
 Execution Time: 2.192 ms
(26 rows)
```

ウィンドウ関数の定義が`Window: w1 AS (PARTITION BY sales.category ORDER BY sales.amount ROWS UNBOUNDED PRECEDING)`のように詳細に表示されます。また、`Storage: Memory  Maximum Storage: 17kB`でメモリ使用量も確認できます。

これにより、複雑なウィンドウ関数を使用する場合でも、内部でどのように処理されているかが明確になりました。

#### メモリ/ディスク使用量の詳細表示

Window Aggregateノード、Materialノード、CTEノードで、メモリとディスク使用量の詳細が表示されるようになりました。上記のWindow Aggregateの例では、`Storage: Memory  Maximum Storage: 17kB`のように、メモリ内で処理が完結していることが分かります。

データ量が大きくメモリに収まらない場合、`Storage: Disk`のように表示され、ディスクにスピルしたことが明示されます。これにより、work_memの調整が必要かどうかを判断できます。

## EXPLAINの基礎知識

PostgreSQL 18での新機能を理解したところで、EXPLAINの基本から確認していきます。既に使ったことがある方も、改めて基礎を押さえることで、より深い理解につながります。

### 1. EXPLAINとは

EXPLAINは、PostgreSQLのクエリプランナーが生成する実行計画を表示するコマンドです。クエリの前にEXPLAINを付けるだけで、データベースがどのようにクエリを実行するつもりなのかが分かります。

実行計画は、テーブルのスキャン方法、インデックスの使用有無、複数テーブルの結合方法など、クエリ実行の戦略を示します。この情報を読み解くことで、パフォーマンスの問題を特定し、改善策を考えられます。

### 2. 基本的な構文

最もシンプルな使い方は、SELECT文の前にEXPLAINを付けるだけです。

```sql
EXPLAIN SELECT * FROM users WHERE age > 30;
```

```
                        QUERY PLAN
-----------------------------------------------------------
 Seq Scan on users  (cost=0.00..199.00 rows=8247 width=23)
   Filter: (age > 30)
(2 rows)
```

これだけで実行計画が表示されます。実際にクエリは実行されず、プランナーが予測した計画だけが返されます。

実際にクエリを実行して、実測値を含めた情報を得たい場合は、ANALYZEオプションを追加します。

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 30;
```

```
                                                QUERY PLAN
-----------------------------------------------------------------------------------------------------------
 Seq Scan on users  (cost=0.00..199.00 rows=8247 width=23) (actual time=0.006..1.146 rows=8247.00 loops=1)
   Filter: (age > 30)
   Rows Removed by Filter: 1753
   Buffers: shared hit=74
 Planning:
   Buffers: shared hit=63
 Planning Time: 0.438 ms
 Execution Time: 1.573 ms
(8 rows)
```

ANALYZEを使うと、推定値だけでなく実際の実行時間や処理行数が表示されるので、推定と実測のギャップを確認できます。PostgreSQL 18では、バッファ情報（`Buffers: shared hit=74`）も自動的に表示されます。

### 3. 実行計画の読み方

EXPLAINの出力は、慣れるまで複雑に見えます。基本的な見方を押さえておきましょう。

実行計画はツリー構造で表現されます。一番下にあるのがスキャンノードで、テーブルから実際にデータを読み取る部分です。その上に、結合やソート、集約などの処理ノードが積み重なっていきます。

```
QUERY PLAN
---------------------------------------------------------
Seq Scan on users  (cost=0.00..155.00 rows=10000 width=64)
  Filter: (age > 30)
```

この例では、usersテーブルに対してシーケンシャルスキャン（全行スキャン）が行われ、age > 30のフィルタ条件が適用されています。

#### コスト（cost）の意味

`cost=0.00..155.00` という部分は、そのノードの実行コストの推定値です。左側の数値が起動コスト、右側が総コストを表します。

- 起動コスト: 最初の行を返すまでにかかるコストです。ソート処理では、すべてのデータを読み込んでソートしてから最初の行を返すため、起動コストが高くなります
- 総コスト: そのノードがすべての処理を完了するまでのコストです。通常はこちらの値が重要になります

コストの単位は、ディスクページの読み取りを基準とした抽象的な値です。設定パラメータ seq_page_cost のデフォルト値が1.0で、他のコストパラメータはこれを基準に設定されています。

#### 行数推定（rows）

`rows=10000` は、そのノードが出力すると推定される行数です。プランナーがテーブルの統計情報を基に計算した値で、実際の行数とは異なることがあります。

この推定値が大きくずれていると、プランナーが最適でない実行計画を選択する原因になります。そのため、定期的にANALYZEコマンドで統計情報を更新することが重要です。

#### 処理幅（width）

`width=64` は、1行あたりの平均バイト数の推定値です。メモリ使用量の計算などに使われます。

### ノードの種類と役割

実行計画には様々な種類のノードが登場します。主要なものを理解しておくと、計画が読みやすくなります。

スキャンノードは、データを取得する部分です。Seq Scan（シーケンシャルスキャン）、Index Scan（インデックススキャン）、Bitmap Scan（ビットマップスキャン）などがあります。

- 結合ノード: 複数のテーブルを結合する処理を表します。Nested Loop、Hash Join、Merge Joinの3種類が主に使われます
- 集約ノード: GROUP BYやSUM、COUNTなどの集約処理を行います。HashAggregateやGroupAggregateといった種類があります。
- ソートノード: ORDER BYなどでデータをソートする処理です。メモリ内で完結する場合と、ディスクを使う場合で性能が大きく変わります。

これらの基本を押さえておくと、実行計画の全体像が見えてきます。

## EXPLAINのオプション徹底解説

EXPLAINには多くのオプションが用意されていて、必要な情報に応じて使い分けられます。各オプションの詳細を見ていきましょう。

### ANALYZE

ANALYZEオプションは、クエリを実際に実行し、実測値を含めた詳細な統計情報を表示します。

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE order_date = '2024-01-15';
```

実行結果には、推定値に加えて実際の実行時間（actual time）と実際の行数（actual rows）が表示されます。

```
Index Scan using orders_date_idx on orders  (cost=0.14..8.16 rows=1 width=26) (actual time=0.014..0.040 rows=150.00 loops=1)
   Index Cond: (order_date = '2024-01-15'::date)
   Index Searches: 1
   Buffers: shared hit=3
 Planning:
   Buffers: shared hit=91
 Planning Time: 0.462 ms
 Execution Time: 0.098 ms
(8 rows)
```

`actual time=0.014..0.040` は、実際にかかった時間をミリ秒で表しています。左側が最初の行を返すまでの時間、右側が全行を返すまでの時間です。

`rows=150.00` は実際に返された行数で、推定の `rows=1` と大きく異なる場合、統計情報の更新が必要です。

`loops=1` は、このノードが実行された回数です。ネストしたループの内側にあるノードは、複数回実行されることがあります。

注意点として、ANALYZEを使うとクエリが実際に実行されるため、INSERT、UPDATE、DELETEなどのデータ更新クエリでは、データが変更されてしまいます。そのような場合は、トランザクション内で実行してROLLBACKすることで、変更を元に戻せます。

```sql
BEGIN;
EXPLAIN ANALYZE UPDATE products SET stock = stock - 1 WHERE product_id = 123;
ROLLBACK;
```

### VERBOSE

VERBOSEオプションは、実行計画の追加情報を表示します。

```sql
EXPLAIN VERBOSE SELECT name, age FROM users WHERE city = 'Tokyo';
```

```
                            QUERY PLAN
------------------------------------------------------------------
 Seq Scan on public.users  (cost=0.00..199.00 rows=1697 width=13)
   Output: name, age
   Filter: (users.city = 'Tokyo'::text)
(3 rows)
```

通常のEXPLAINでは省略される情報が含まれます。各ノードの出力カラムリスト、テーブル名やカラム名のスキーマ修飾、式中の変数のテーブルエイリアスなどが表示されます。

実行計画の内部動作をより詳しく理解したい場合や、複雑なクエリのデバッグに役立ちます。

### BUFFERS

BUFFERSオプションは、バッファの使用状況を表示します。PostgreSQL 18では、EXPLAIN ANALYZEを使うと自動的にバッファ情報が含まれるようになりましたが、明示的に指定することもできます。

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM test_data WHERE value > 500;
```

```
                                                  QUERY PLAN
---------------------------------------------------------------------------------------------------------------
 Seq Scan on test_data  (cost=0.00..189.00 rows=5021 width=17) (actual time=0.122..2.451 rows=5013.00 loops=1)
   Filter: (value > 500)
   Rows Removed by Filter: 4987
   Buffers: shared read=64
 Planning:
   Buffers: shared hit=47 read=18 dirtied=4
 Planning Time: 0.491 ms
 Execution Time: 2.651 ms
(8 rows)
```

出力には、shared blocksとlocal blocks、temp blocksの統計が含まれます。

- shared blocks: 通常のテーブルやインデックスのデータです。`shared hit` はキャッシュから読み取った回数、`shared read` はディスクから読み取った回数を示します
- local blocks: 一時テーブルなど、セッション固有のデータを表します
- temp blocks: ソートやハッシュなどで使われる短期間のワーキングデータです

`shared hit` の割合が高いほど、データがキャッシュに載っていて高速に処理できています。`shared read` が多い場合、I/Oがボトルネックになっています。

track_io_timingパラメータを有効にすると、I/Oにかかった時間（ミリ秒）も表示されます。

```sql
SET track_io_timing = on;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM large_table WHERE id < 1000;
```

```
                                                              QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------
 Index Scan using large_table_pkey on large_table  (cost=0.29..38.07 rows=959 width=14) (actual time=0.022..0.183 rows=999.00 loops=1)
   Index Cond: (id < 1000)
   Index Searches: 1
   Buffers: shared hit=2 read=8
   I/O Timings: shared read=0.069
 Planning:
   Buffers: shared hit=59 read=9
   I/O Timings: shared read=0.133
 Planning Time: 0.452 ms
 Execution Time: 0.243 ms
(10 rows)
```

I/O待ち時間が可視化されることで、ディスクI/Oが実際のボトルネックかどうかを判断できます。ただし、track_io_timingはシステムコールのオーバーヘッドがあるため、環境によっては性能に影響します。pg_test_timingツールでオーバーヘッドを測定してから有効化することをおすすめします。

### WAL

WALオプションは、Write-Ahead Logの生成情報を表示します。ANALYZEと組み合わせて使います。

```sql
EXPLAIN (ANALYZE, WAL)
UPDATE products SET price = price * 1.05;
```

```
                                                   QUERY PLAN
----------------------------------------------------------------------------------------------------------------
 Update on products  (cost=0.00..2.50 rows=0 width=0) (actual time=0.522..0.523 rows=0.00 loops=1)
   Buffers: shared hit=411 dirtied=1 written=4
   WAL: records=240 bytes=17820
   ->  Seq Scan on products  (cost=0.00..2.50 rows=100 width=22) (actual time=0.011..0.044 rows=100.00 loops=1)
         Buffers: shared hit=1
 Planning:
   Buffers: shared hit=54
 Planning Time: 0.278 ms
 Execution Time: 0.691 ms
(9 rows)
```

WALレコード数、フルページイメージ数、生成されたWALのバイト数が表示されます。

PostgreSQL 18からは、WALバッファがフルになった回数も表示されるようになりました。

```sql
EXPLAIN (ANALYZE, WAL, BUFFERS)
UPDATE wal_test SET data = md5(data);
```

```
                                                      QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------
 Update on wal_test  (cost=0.00..217.35 rows=0 width=0) (actual time=48.481..48.482 rows=0.00 loops=1)
   Buffers: shared hit=60412 dirtied=110 written=117
   WAL: records=30135 bytes=2413984 buffers full=268
   ->  Seq Scan on wal_test  (cost=0.00..217.35 rows=10668 width=38) (actual time=0.025..12.371 rows=10000.00 loops=1)
         Buffers: shared hit=84
 Planning Time: 0.117 ms
 Execution Time: 48.626 ms
(7 rows)
```

`buffers full=268`は、WALバッファがフルになり、ディスクへの書き込みが発生した回数を示します。この値が大きい場合、wal_buffersパラメータを増やすことで性能が改善する可能性があります。

データ更新が多いワークロードでは、WAL生成量がI/Oの負荷に直結するため、この情報でボトルネックを特定できます。

### TIMING

TIMINGオプションは、各ノードの実行時間計測を制御します。デフォルトはTRUEですが、FALSEに設定することで計測オーバーヘッドを減らせます。

```sql
EXPLAIN (ANALYZE, TIMING FALSE)
SELECT COUNT(*) FROM huge_table;
```

```
                                            QUERY PLAN
--------------------------------------------------------------------------------------------------
 Aggregate  (cost=18.50..18.51 rows=1 width=8) (actual rows=1.00 loops=1)
   Buffers: shared hit=6
   ->  Seq Scan on huge_table  (cost=0.00..16.00 rows=1000 width=0) (actual rows=1000.00 loops=1)
         Buffers: shared hit=6
 Planning:
   Buffers: shared hit=57 read=1
 Planning Time: 0.357 ms
 Execution Time: 0.148 ms
(8 rows)
```

時間計測にはシステムコールのオーバーヘッドがあり、プラットフォームによっては顕著に遅くなることがあります。行数だけ確認したい場合は、TIMINGをオフにすると良いでしょう。

クエリ全体の実行時間は、TIMINGをオフにしても必ず計測されます。

### COSTS

COSTSオプションは、コスト推定値の表示を制御します。デフォルトはTRUEです。

```sql
EXPLAIN (COSTS FALSE)
SELECT * FROM users WHERE age > 30;
```

```
      QUERY PLAN
----------------------
 Seq Scan on users
   Filter: (age > 30)
(2 rows)
```

コスト情報を省略することで、実行計画の構造だけをシンプルに確認できます。教育目的や、プレゼンテーション資料などで使うと見やすくなります。

### SETTINGS

SETTINGSオプションは、クエリ計画に影響を与える設定パラメータを表示します。

```sql
SET work_mem = '16MB';

EXPLAIN (SETTINGS)
SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id;
```

```
                               QUERY PLAN
-------------------------------------------------------------------------
 Hash Join  (cost=16.25..36.90 rows=1000 width=69)
   Hash Cond: (orders.customer_id = customers.id)
   ->  Seq Scan on orders  (cost=0.00..18.00 rows=1000 width=27)
   ->  Hash  (cost=10.00..10.00 rows=500 width=42)
         ->  Seq Scan on customers  (cost=0.00..10.00 rows=500 width=42)
 Settings: work_mem = '16MB'
(6 rows)
```

デフォルト値と異なる設定のみが表示されるため、なぜ特定の実行計画が選択されたのか理解する助けになります。

### FORMAT

FORMATオプションは、出力形式を指定します。TEXT、XML、JSON、YAMLの4種類から選べます。

```sql
EXPLAIN (FORMAT JSON)
SELECT * FROM products WHERE category = 'electronics';
```

```json
[
  {
    "Plan": {
      "Node Type": "Seq Scan",
      "Parallel Aware": false,
      "Async Capable": false,
      "Relation Name": "products",
      "Alias": "products",
      "Startup Cost": 0.00,
      "Total Cost": 3.25,
      "Plan Rows": 32,
      "Plan Width": 30,
      "Disabled": false,
      "Filter": "(category = 'electronics'::text)"
    }
  }
]
```

TEXT形式は人間が読みやすいデフォルトの形式です。

JSON形式は、プログラムで解析する場合に便利です。pgAdminなどのツールは、JSON形式を解析してグラフィカルな実行計画を表示します。

XML形式とYAML形式も、ツールでの自動処理に適しています。

### SUMMARY

SUMMARYオプションは、実行計画後のサマリー情報を制御します。

```sql
EXPLAIN (ANALYZE, SUMMARY)
SELECT * FROM large_table;
```

```
                                                      QUERY PLAN
----------------------------------------------------------------------------------------------------------------------
 Seq Scan on large_table  (cost=0.00..1541.00 rows=100000 width=14) (actual time=0.013..9.698 rows=100000.00 loops=1)
   Buffers: shared hit=6 read=535
 Planning:
   Buffers: shared hit=54 dirtied=1
 Planning Time: 0.236 ms
 Execution Time: 13.349 ms
(6 rows)
```

ANALYZEを使う場合はデフォルトでサマリーが表示されますが、明示的に制御することもできます。Planning TimeとExecution Timeの合計時間が確認できます。

### MEMORY

MEMORYオプションは、クエリ計画フェーズでのメモリ消費量を表示します。

```sql
EXPLAIN (MEMORY)
SELECT * FROM complex_view;
```

```
                         QUERY PLAN
-------------------------------------------------------------
 Seq Scan on users u  (cost=0.00..199.00 rows=9108 width=23)
   Filter: (age > 25)
 Planning:
   Memory: used=14kB  allocated=16kB
(4 rows)
```

プランナーが使用したメモリの正確な量と、アロケーションオーバーヘッドを含めた総メモリ量が表示されます。複雑なクエリのプランニングでメモリ不足が疑われる場合に有用です。

### SERIALIZE

SERIALIZEオプションは、PostgreSQL 17で追加されたオプションで、クエリ出力データのシリアライズコストを計測します。

```sql
EXPLAIN (ANALYZE, SERIALIZE TEXT)
SELECT * FROM large_table;
```

```
                                                  QUERY PLAN
---------------------------------------------------------------------------------------------------------------
 Seq Scan on large_table  (cost=0.00..189.00 rows=10000 width=18) (actual time=0.004..0.708 rows=10000.00 loops=1)
   Buffers: shared hit=64
 Planning Time: 0.012 ms
 Serialization: time=0.125 ms  output=400kB  format=text
 Execution Time: 1.045 ms
(5 rows)
```

データをテキストやバイナリ形式に変換する時間を計測します。通常の実行では含まれているが、EXPLAINでは省略されるコストを可視化できます。

SERIALIZE NONE（デフォルト）、SERIALIZE TEXT、SERIALIZE BINARYの3種類があります。

TOASTされた大きな値を持つカラムや、出力関数が重いデータ型を扱う場合、シリアライズがボトルネックになることがあります。

BUFFERSオプションと組み合わせると、シリアライズ時のバッファアクセスもカウントされます。

### GENERIC_PLAN

GENERIC_PLANオプションは、パラメータ化されたクエリの汎用プランを表示します。

```sql
EXPLAIN (GENERIC_PLAN)
SELECT * FROM orders WHERE customer_id = $1 AND order_date > $2;
```

```
                       QUERY PLAN
--------------------------------------------------------
 Seq Scan on orders  (cost=0.00..23.00 rows=1 width=27)
   Filter: ((order_date > $2) AND (customer_id = $1))
(2 rows)
```

プリペアドステートメントでは、パラメータの具体的な値に依存しない汎用プランと、特定の値に最適化されたカスタムプランの2種類があります。

GENERIC_PLANを使うと、パラメータに依存しない汎用プランが表示されるため、様々なパラメータ値でどのような計画が使われるか確認できます。

ANALYZEとは組み合わせられません。パラメータの型は、明示的にキャストすることで指定できます。

これらのオプションを適切に組み合わせることで、様々な視点から実行計画を分析できます。

## スキャンノードの詳細

実行計画の最も基本となるのが、テーブルからデータを読み取るスキャンノードです。PostgreSQLは複数のスキャン方法を持っていて、データ量や条件に応じて最適なものが選ばれます。

### Sequential Scan（シーケンシャルスキャン）

シーケンシャルスキャンは、テーブルの全行を先頭から順番に読み取る方法です。

```sql
EXPLAIN SELECT * FROM users;

Seq Scan on users  (cost=0.00..155.00 rows=10000 width=64)
```

インデックスを使わず、ディスク上のページを順番にスキャンします。全行を読み取る必要がある場合や、テーブルの大部分を読む場合は、シーケンシャルスキャンが最速になることが多いです。

ランダムアクセスよりも順次アクセスの方が、ディスクI/Oの効率が良いためです。特にSSDでは、シーケンシャルリードの速度が非常に高いので、小さなテーブルではインデックスよりも有利になります。

WHERE句でフィルタ条件がある場合、Filter行として表示されます。

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 30;
```

```
                                                QUERY PLAN
-----------------------------------------------------------------------------------------------------------
 Seq Scan on users  (cost=0.00..199.00 rows=8247 width=23) (actual time=0.254..2.636 rows=8247.00 loops=1)
   Filter: (age > 30)
   Rows Removed by Filter: 1753
   Buffers: shared read=74
 Planning:
   Buffers: shared hit=63
 Planning Time: 0.254 ms
 Execution Time: 3.000 ms
(8 rows)
```

フィルタはスキャン後に適用されるため、全行を読み取ってから条件に合う行だけを返します。`Rows Removed by Filter: 1753`は、フィルタで除外された行数を示しています。

### Index Scan（インデックススキャン）

インデックススキャンは、インデックスを使ってテーブルの行を検索します。

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE user_id = 123;
```

```
                                                         QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------
 Index Scan using users_user_id_idx on users  (cost=0.29..8.30 rows=1 width=27) (actual time=0.031..0.031 rows=1.00 loops=1)
   Index Cond: (user_id = 123)
   Index Searches: 1
   Buffers: shared hit=1 read=2
 Planning:
   Buffers: shared hit=87 read=1
 Planning Time: 0.399 ms
 Execution Time: 0.071 ms
(8 rows)
```

インデックスで該当する行の位置を特定し、テーブルから実際のデータを取得します。少数の行を取得する場合に効率的です。PostgreSQL 18では、`Index Searches: 1`のようにインデックスルックアップ回数が表示されます。

Index Condは、インデックスで直接評価できる条件です。インデックスのキーに対する条件がここに表示されます。

インデックスで絞り込めない追加の条件がある場合、Filter行としても表示されます。

```sql
EXPLAIN SELECT * FROM users WHERE user_id = 123 AND name = 'Alice';

Index Scan using users_pkey on users  (cost=0.29..8.31 rows=1 width=64)
  Index Cond: (user_id = 123)
  Filter: (name = 'Alice'::text)
```

ORDER BY句がインデックスの順序と一致する場合、ソート処理が不要になるため、インデックススキャンが選ばれやすくなります。

PostgreSQL 18では、Index Scans行にインデックスルックアップの回数が表示されるようになりました。

### Index Only Scan（インデックスオンリースキャン）

インデックスオンリースキャンは、必要なデータがすべてインデックスに含まれている場合に使われます。

```sql
EXPLAIN ANALYZE SELECT user_id FROM users WHERE user_id BETWEEN 100 AND 200;
```

```
                                                             QUERY PLAN
-------------------------------------------------------------------------------------------------------------------------------------
 Index Only Scan using users_user_id_idx on users  (cost=0.29..6.30 rows=101 width=4) (actual time=0.014..0.110 rows=101.00 loops=1)
   Index Cond: ((user_id >= 100) AND (user_id <= 200))
   Heap Fetches: 202
   Index Searches: 1
   Buffers: shared hit=206
 Planning:
   Buffers: shared hit=3
 Planning Time: 0.065 ms
 Execution Time: 0.122 ms
(9 rows)
```

テーブル本体にアクセスする必要がないため、通常のインデックススキャンよりも高速です。

PostgreSQLのMVCC（Multi-Version Concurrency Control）により、インデックスには可視性情報が含まれていません。そのため、行の可視性を確認するために、テーブルのVisibility Mapを参照します。

VACUUMを実行すると、Heap Fetchesが減少します。

```
-- VACUUM実行後
                                                              QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------
 Index Only Scan using users_user_id_idx on users  (cost=0.29..10.32 rows=102 width=4) (actual time=0.024..0.061 rows=101.00 loops=1)
   Index Cond: ((user_id >= 100) AND (user_id <= 200))
   Heap Fetches: 50
   Index Searches: 1
   Buffers: shared hit=5
 Planning:
   Buffers: shared hit=43
 Planning Time: 0.263 ms
 Execution Time: 0.112 ms
(9 rows)
```

Heap Fetchesは、Visibility Mapで確認できず、実際にテーブルにアクセスした行数です。この値が大きい場合、VACUUMでVisibility Mapを更新すると性能が向上します。

カバリングインデックス（必要なカラムをすべて含むインデックス）を作成することで、インデックスオンリースキャンを活用できます。

### Bitmap Scan（ビットマップスキャン）

ビットマップスキャンは、中程度の行数を取得する場合に使われる方式です。

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age BETWEEN 20 AND 30;
```

```
                                                           QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on users  (cost=26.22..199.47 rows=1750 width=27) (actual time=0.130..0.587 rows=1750.00 loops=1)
   Recheck Cond: ((age >= 20) AND (age <= 30))
   Heap Blocks: exact=75
   Buffers: shared hit=75 read=3
   ->  Bitmap Index Scan on users_age_idx  (cost=0.00..25.79 rows=1750 width=0) (actual time=0.091..0.091 rows=1750.00 loops=1)
         Index Cond: ((age >= 20) AND (age <= 30))
         Index Searches: 1
         Buffers: shared read=3
 Planning:
   Buffers: shared hit=101 read=1
 Planning Time: 0.504 ms
 Execution Time: 0.698 ms
(12 rows)
```

ビットマップスキャンは2段階で動作します。Bitmap Index Scanで条件に合う行の位置をビットマップに記録し、Bitmap Heap Scanでビットマップを使ってテーブルから行を取得します。

ビットマップに記録された位置は、物理的な順序でソートされます。これにより、テーブルへのアクセスが順序的になり、ランダムアクセスのコストを削減できます。

複数のインデックス条件がある場合、BitmapAndやBitmapOrノードで結合できます。

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 20 AND status = 'active';
```

```
                                                            QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on users  (cost=42.04..253.90 rows=3301 width=35) (actual time=0.099..0.634 rows=3302.00 loops=1)
   Recheck Cond: (status = 'active'::text)
   Filter: (age > 20)
   Rows Removed by Filter: 22
   Heap Blocks: exact=91
   Buffers: shared hit=95
   ->  Bitmap Index Scan on users_status_idx  (cost=0.00..41.21 rows=3324 width=0) (actual time=0.080..0.080 rows=3324.00 loops=1)
         Index Cond: (status = 'active'::text)
         Index Searches: 1
         Buffers: shared hit=4
 Planning:
   Buffers: shared hit=130
 Planning Time: 0.381 ms
 Execution Time: 0.772 ms
(14 rows)
```

ビットマップのメモリが不足すると、「lossy」モードになります。この場合、ビットマップはページ単位でしか情報を保持できず、Recheck Condでページ内の各行を再確認する必要があります。

### その他のスキャンタイプ

TID Scanは、行のタプルID（ctid）を直接指定して取得する方法です。内部的な処理や、システムカタログの特殊な操作で使われることがあります。

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE ctid = '(0,102)';
```

```
                                            QUERY PLAN
---------------------------------------------------------------------------------------------------
 Tid Scan on users  (cost=0.00..4.01 rows=1 width=35) (actual time=0.011..0.011 rows=1.00 loops=1)
   TID Cond: (ctid = '(0,102)'::tid)
   Buffers: shared hit=1
 Planning:
   Buffers: shared hit=116
 Planning Time: 0.496 ms
 Execution Time: 0.047 ms
(7 rows)
```

VALUES Scanは、VALUES句から直接データを生成します。

```sql
EXPLAIN ANALYZE SELECT * FROM (VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')) AS t(id, name);
```

```
                                                QUERY PLAN
-----------------------------------------------------------------------------------------------------------
 Values Scan on "*VALUES*"  (cost=0.00..0.04 rows=3 width=36) (actual time=0.014..0.015 rows=3.00 loops=1)
 Planning:
   Buffers: shared hit=3
 Planning Time: 0.097 ms
 Execution Time: 0.036 ms
(5 rows)
```

Function Scanは、セット返却関数からデータを取得します。

```sql
EXPLAIN ANALYZE SELECT * FROM generate_series(1, 100);
```

```
                                                     QUERY PLAN
---------------------------------------------------------------------------------------------------------------------
 Function Scan on generate_series  (cost=0.00..1.00 rows=100 width=4) (actual time=0.017..0.022 rows=100.00 loops=1)
 Planning Time: 0.045 ms
 Execution Time: 0.057 ms
(3 rows)
```

CTE Scanは、WITH句で定義されたCommon Table Expression（共通テーブル式）からデータを読み取ります。

```sql
EXPLAIN ANALYZE WITH active_users AS (
  SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE age > 30;
```

```
                                                             QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on users  (cost=41.90..253.76 rows=2742 width=35) (actual time=0.107..0.636 rows=2744.00 loops=1)
   Recheck Cond: (status = 'active'::text)
   Filter: (age > 30)
   Rows Removed by Filter: 580
   Heap Blocks: exact=91
   Buffers: shared hit=95
   ->  Bitmap Index Scan on users_status_idx  (cost=0.00..41.21 rows=3324 width=0) (actual time=0.088..0.088 rows=3324.00 loops=1)
         Index Cond: (status = 'active'::text)
         Index Searches: 1
         Buffers: shared hit=4
 Planning:
   Buffers: shared hit=133
 Planning Time: 0.403 ms
 Execution Time: 0.759 ms
(14 rows)
```

スキャン方法の選択は、テーブルサイズ、取得する行数の割合、インデックスの有無、統計情報などに基づいて、プランナーが自動的に判断します。

## 結合の実行計画

複数のテーブルを結合するクエリでは、結合方法の選択がパフォーマンスに大きく影響します。PostgreSQLには3つの主要な結合方式があります。

### Nested Loop Join（ネステッドループ結合）

ネステッドループ結合は、最もシンプルな方式です。

```sql
SET enable_hashjoin = off;
SET enable_mergejoin = off;

EXPLAIN ANALYZE SELECT c.name, COUNT(o.id), SUM(o.amount)
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.city = 'Tokyo'
GROUP BY c.name;
```

```
                                                                     QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------------------------------
 HashAggregate  (cost=198.56..199.44 rows=71 width=52) (actual time=1.263..1.280 rows=65.00 loops=1)
   Group Key: c.name
   Batches: 1  Memory Usage: 56kB
   Buffers: shared hit=1322
   ->  Nested Loop  (cost=0.28..197.49 rows=142 width=22) (actual time=0.050..1.179 rows=154.00 loops=1)
         Buffers: shared hit=1322
         ->  Seq Scan on orders o  (cost=0.00..18.00 rows=1000 width=14) (actual time=0.006..0.085 rows=1000.00 loops=1)
               Buffers: shared hit=8
         ->  Memoize  (cost=0.28..0.36 rows=1 width=16) (actual time=0.001..0.001 rows=0.15 loops=1000)
               Cache Key: o.customer_id
               Cache Mode: logical
               Hits: 562  Misses: 438  Evictions: 0  Overflows: 0  Memory Usage: 33kB
               Buffers: shared hit=1314
               ->  Index Scan using customers_pkey on customers c  (cost=0.27..0.35 rows=1 width=16) (actual time=0.001..0.001 rows=0.15 loops=438)
                     Index Cond: (id = o.customer_id)
                     Filter: (city = 'Tokyo'::text)
                     Rows Removed by Filter: 1
                     Index Searches: 438
                     Buffers: shared hit=1314
 Planning:
   Buffers: shared hit=195
 Planning Time: 0.503 ms
 Execution Time: 1.386 ms
(23 rows)
```

外側のテーブル（orders）から1行ずつ取得し、各行について内側のテーブル（customers）を検索します。内側は、外側の行数分だけ繰り返し実行されます。

上記の例では、ordersで1000行が取得され、各行についてcustomersがIndex Scanで検索されます（loops=1000）。Memoizeノードがキャッシュを提供し、重複するcustomer_idへのアクセスを高速化しています。

`rows=0.15`のように、PostgreSQL 18から行数が小数点で表示されるようになりました（詳細はセクション2-4参照）。

少数の行を結合する場合や、内側のテーブルにインデックスがある場合に効率的です。外側の行数が少ないほど、内側の繰り返し回数も減るため、高速になります。

### Hash Join（ハッシュ結合）

ハッシュ結合は、中規模から大規模のデータセットに適しています。

```sql
EXPLAIN ANALYZE SELECT c.name, COUNT(o.id), SUM(o.amount)
FROM orders o
JOIN customers c ON o.customer_id = c.id
GROUP BY c.name;
```

```
                                                           QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------
 HashAggregate  (cost=49.40..55.65 rows=500 width=52) (actual time=0.983..1.101 rows=438.00 loops=1)
   Group Key: c.name
   Batches: 1  Memory Usage: 321kB
   Buffers: shared hit=18
   ->  Hash Join  (cost=21.25..41.90 rows=1000 width=22) (actual time=0.213..0.538 rows=1000.00 loops=1)
         Hash Cond: (o.customer_id = c.id)
         Buffers: shared hit=18
         ->  Seq Scan on orders o  (cost=0.00..18.00 rows=1000 width=14) (actual time=0.007..0.091 rows=1000.00 loops=1)
               Buffers: shared hit=8
         ->  Hash  (cost=15.00..15.00 rows=500 width=16) (actual time=0.188..0.188 rows=500.00 loops=1)
               Buckets: 1024  Batches: 1  Memory Usage: 34kB
               Buffers: shared hit=10
               ->  Seq Scan on customers c  (cost=0.00..15.00 rows=500 width=16) (actual time=0.007..0.063 rows=500.00 loops=1)
                     Buffers: shared hit=10
 Planning:
   Buffers: shared hit=214
 Planning Time: 0.639 ms
 Execution Time: 1.255 ms
(18 rows)
```

内側（customers）のデータをメモリ上のハッシュテーブルに格納し、外側（orders）の各行に対してハッシュテーブルを検索します。

ハッシュテーブルの構築にはコストがかかりますが、構築後の検索は非常に高速です。両方のテーブルを1回ずつスキャンするだけで済むため、大量データの結合に向いています。

ハッシュテーブルがwork_memに収まらない場合、バッチ処理に分割されます。

```sql
Hash Join  (cost=200.00..1500.00 rows=10000 width=88)
  Hash Cond: (o.customer_id = c.id)
  -> Seq Scan on orders o  (cost=0.00..1000.00 rows=10000 width=44)
  -> Hash  (cost=150.00..150.00 rows=5000 width=44)
        Buckets: 8192  Batches: 4  Memory Usage: 245kB
        -> Seq Scan on customers c  (cost=0.00..150.00 rows=5000 width=44)
```

Batchesが1より大きい場合、一時ファイルが使われます。この場合、work_memを増やすことで性能が向上します。

PostgreSQL 18では、ハッシュ結合の性能とメモリ使用量が改善されています。

### Merge Join（マージ結合）

マージ結合は、両方のテーブルがソート済みの場合に効率的な方式です。

```sql
EXPLAIN ANALYZE SELECT c.name, COUNT(o.id), SUM(o.amount)
FROM orders o
JOIN customers c ON o.customer_id = c.id
GROUP BY c.name;
```

```
                                                                       QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------------------
 HashAggregate  (cost=905.06..967.56 rows=5000 width=53) (actual time=14.043..15.897 rows=4327.00 loops=1)
   Group Key: c.name
   Batches: 1  Memory Usage: 2193kB
   Buffers: shared hit=9823 read=19
   ->  Merge Join  (cost=0.57..830.06 rows=10000 width=23) (actual time=0.036..8.866 rows=10000.00 loops=1)
         Merge Cond: (o.customer_id = c.id)
         Buffers: shared hit=9823 read=19
         ->  Index Scan using orders_customer_idx on orders o  (cost=0.29..498.28 rows=10000 width=14) (actual time=0.019..4.794 rows=10000.00 loops=1)
               Index Searches: 1
               Buffers: shared hit=9756 read=19
         ->  Index Scan using customers_pkey on customers c  (cost=0.28..194.28 rows=5000 width=17) (actual time=0.014..1.251 rows=5000.00 loops=1)
               Index Searches: 1
               Buffers: shared hit=67
 Planning Time: 0.850 ms
 Execution Time: 16.550 ms
(17 rows)
```

両方のテーブルを結合キーの順にスキャンし、マージしながら結合します。ソート済みのデータを前提とするため、インデックススキャンを使うか、事前にソートが必要です。

ソート済みでない場合、Sortノードが追加されます。

```
                                                               QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------------
 Merge Join  (cost=828.67..891.62 rows=198 width=21) (actual time=2.418..2.497 rows=189.00 loops=1)
   Merge Cond: (c.id = o.customer_id)
   Buffers: shared hit=67
   ->  Index Scan using customers_pkey on customers c  (cost=0.28..11.02 rows=99 width=17) (actual time=0.004..0.021 rows=99.00 loops=1)
         Index Cond: (id < 100)
         Index Searches: 1
         Buffers: shared hit=3
   ->  Sort  (cost=828.39..853.39 rows=10000 width=4) (actual time=2.409..2.421 rows=190.00 loops=1)
         Sort Key: o.customer_id
         Sort Method: quicksort  Memory: 385kB
         Buffers: shared hit=64
         ->  Seq Scan on orders o  (cost=0.00..164.00 rows=10000 width=4) (actual time=0.013..0.880 rows=10000.00 loops=1)
               Buffers: shared hit=64
 Planning Time: 0.619 ms
 Execution Time: 2.609 ms
(17 rows)
```

### 結合方法の選択基準について

プランナーは、統計情報とコスト計算に基づいて、最適な結合方法を選択します。

外側のテーブルが非常に小さく、内側のテーブルにインデックスがある場合は、ネステッドループが選ばれやすいです。

中規模から大規模のデータで、等値結合（=）の場合は、ハッシュ結合が選ばれることが多いです。

両方のテーブルがソート済み、または結合キーにインデックスがある場合は、マージ結合が選ばれることがあります。

enable_nestloop、enable_hashjoin、enable_mergejoinパラメータで、各結合方式を一時的に無効化できます。これは主にデバッグや、プランナーの判断を理解するために使います。

```sql
SET enable_hashjoin = off;
EXPLAIN SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;
```

```
                                           QUERY PLAN
-------------------------------------------------------------------------------------------------
 Merge Join  (cost=0.57..830.06 rows=10000 width=67)
   Merge Cond: (o.customer_id = c.id)
   ->  Index Scan using orders_customer_idx on orders o  (cost=0.29..498.28 rows=10000 width=18)
   ->  Index Scan using customers_pkey on customers c  (cost=0.28..194.28 rows=5000 width=49)
(4 rows)
```

ハッシュ結合を無効化すると、マージ結合が選択されました。実行計画を見て、どの結合方式が選ばれたか確認し、必要に応じてインデックスの追加や統計情報の更新を検討すると良いでしょう。

## パフォーマンスチューニングの基本

EXPLAINの読み方を理解したところで、実際のパフォーマンスチューニングにどう活用するか基本的な例をあげて見ていきます。

### 1. 遅いクエリの特定方法

どのクエリが遅いのかを特定する必要があります。アプリケーションのログやPostgreSQLのスロークエリログから、実行時間が長いクエリをリストアップします。

log_min_duration_statementパラメータを設定することで、指定した時間以上かかったクエリをログに記録できます。

```sql
SET log_min_duration_statement = 1000;  -- 1秒以上のクエリをログに記録
```

pg_stat_statementsエクステンションを使うと、実行されたすべてのクエリの統計情報を収集できます。平均実行時間、総実行時間、実行回数などから、最適化すべきクエリを特定できます。

```sql
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

遅いクエリが特定できたら、EXPLAIN ANALYZEで実行計画を確認します。

### 2. インデックスの追加・改善

実行計画を見て、シーケンシャルスキャンが使われている場合、インデックスの追加を検討します。

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
```

```
                                                QUERY PLAN
----------------------------------------------------------------------------------------------------------
 Seq Scan on orders  (cost=0.00..1887.00 rows=99 width=18) (actual time=0.037..5.005 rows=104.00 loops=1)
   Filter: (customer_id = 123)
   Rows Removed by Filter: 99896
   Buffers: shared hit=637
 Planning:
   Buffers: shared hit=27 read=1
 Planning Time: 0.134 ms
 Execution Time: 5.025 ms
(8 rows)
```

この例では、10万行をスキャンして、99896行がフィルタで除外されています。customer_idにインデックスを作成すると改善できます。

```sql
CREATE INDEX orders_customer_idx ON orders(customer_id);

EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
```

```
                                                            QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on orders  (cost=5.06..269.41 rows=99 width=18) (actual time=0.049..0.118 rows=104.00 loops=1)
   Recheck Cond: (customer_id = 123)
   Heap Blocks: exact=93
   Buffers: shared hit=93 read=2
   ->  Bitmap Index Scan on orders_customer_idx  (cost=0.00..5.04 rows=99 width=0) (actual time=0.037..0.037 rows=104.00 loops=1)
         Index Cond: (customer_id = 123)
         Index Searches: 1
         Buffers: shared read=2
 Planning:
   Buffers: shared hit=49 read=2
 Planning Time: 0.240 ms
 Execution Time: 0.174 ms
(12 rows)
```

実行時間が5.025ミリ秒から0.174ミリ秒に大幅に改善されました。

複数のカラムで絞り込む場合、複合インデックスが有効なことがあります。

```sql
CREATE INDEX orders_customer_date_idx ON orders(customer_id, order_date);
```

ただし、インデックスはストレージと更新コストを消費するため、必要なものだけを作成することが大切です。

### 3. 統計情報の更新

実行計画の推定行数と実際の行数が大きく異なる場合、統計情報が古くなっています。

```sql
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics';
```

```
                                                QUERY PLAN
-----------------------------------------------------------------------------------------------------------
 Seq Scan on products  (cost=0.00..99.74 rows=8 width=356) (actual time=0.012..1.251 rows=5100.00 loops=1)
   Filter: (category = 'electronics'::text)
   Rows Removed by Filter: 4900
   Buffers: shared hit=79
 Planning:
   Buffers: shared hit=10 read=1
 Planning Time: 0.100 ms
 Execution Time: 1.460 ms
(8 rows)
```

推定が8行なのに実際は5100行返されています。この場合、ANALYZEコマンドで統計情報を更新します。

```sql
ANALYZE products;
```

定期的なVACUUMとANALYZEの実行は、プランナーが正確な実行計画を立てるために重要です。autovacuumが有効になっていれば、自動的に実行されますが、大量のデータ変更があった後は、手動で実行することも検討します。

default_statistics_targetパラメータで、統計情報の詳細度を調整できます。デフォルトは100ですが、特定のカラムで精度を上げたい場合、カラム単位で設定を増やせます。

```sql
ALTER TABLE products ALTER COLUMN category SET STATISTICS 1000;
ANALYZE products;
```

### 4. コスト設定の調整

プランナーのコスト計算は、いくつかのパラメータで制御されています。環境に合わせて調整することで、より適切な実行計画が選ばれます。

seq_page_costとrandom_page_costは、それぞれシーケンシャルアクセスとランダムアクセスのコストを表します。デフォルトではseq_page_cost=1.0、random_page_cost=4.0です。

SSDを使っている場合、ランダムアクセスのコストがHDDよりも低いため、random_page_costを下げることで、インデックススキャンが選ばれやすくなります。公式ドキュメントでは1.1が例示されています。
(https://www.postgresql.org/docs/18/runtime-config-query.html#GUC-RANDOM-PAGE-COST)

```sql
SET random_page_cost = 1.1;  -- SSD環境での調整例
```

effective_cache_sizeは、OSやPostgreSQLが使える総キャッシュサイズの推定値です。この値を適切に設定することで、インデックススキャンとシーケンシャルスキャンの選択精度が向上します。

```sql
SET effective_cache_size = '4GB';
```

work_memは、ソートやハッシュテーブルなどの作業用メモリです。複雑なクエリで一時ファイルへのスピルが発生している場合、work_memを増やすことで性能が改善します。

```sql
EXPLAIN ANALYZE SELECT * FROM large_table ORDER BY data;
```

```
                                                       QUERY PLAN
-------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=848.39..873.39 rows=10000 width=37) (actual time=10.893..11.284 rows=10000.00 loops=1)
   Sort Key: data
   Sort Method: quicksort  Memory: 931kB
   Buffers: shared hit=84
   ->  Seq Scan on large_table  (cost=0.00..184.00 rows=10000 width=37) (actual time=0.006..0.556 rows=10000.00 loops=1)
         Buffers: shared hit=84
 Planning:
   Buffers: shared hit=34 read=3
 Planning Time: 0.228 ms
 Execution Time: 11.588 ms
(10 rows)
```

この例では、Sort Methodがquicksortでメモリ内で完結していますが、データ量がさらに多い場合、Sort Methodがexternal mergeになり、Diskが使われます。work_memを増やすと、より大きなデータセットをメモリ内でソートできるようになります。

```sql
SET work_mem = '256MB';
```

ただし、work_memはクエリごと・ノードごとに割り当てられるため、値を大きくしすぎるとメモリ不足になるリスクがあります。

## まとめ

PostgreSQL 18では、EXPLAINが大幅に強化され、パフォーマンス分析がより容易になりました。

実際のパフォーマンスチューニングでは、EXPLAIN ANALYZEで実行計画を確認し、ボトルネックを特定することが第一歩です。適切なインデックスの追加、統計情報の更新、設定パラメータの調整などを組み合わせることで、大幅な性能改善が可能になります。

EXPLAINは、データベースのパフォーマンスを理解し、最適化する上で欠かせないツールです。PostgreSQL 18の強化された機能を活用して、より効率的なクエリチューニングを行っていきましょう。

## 参考文献

- PostgreSQL 18 Released! - https://www.postgresql.org/about/news/postgresql-18-released-3142/
- PostgreSQL 18 Release Notes - https://www.postgresql.org/docs/18/release-18.html
- EXPLAIN Documentation - https://www.postgresql.org/docs/current/sql-explain.html
- Using EXPLAIN - https://www.postgresql.org/docs/current/using-explain.html
- Performance Tips - https://www.postgresql.org/docs/current/performance-tips.html
- Run-time Statistics - https://www.postgresql.org/docs/current/runtime-config-statistics.html
- PostgreSQL 18 New Features - https://neon.com/postgresql/postgresql-18-new-features
- PostgreSQL 18 Enhanced EXPLAIN - https://neon.com/postgresql/postgresql-18/enhanced-explain
- What's New in PostgreSQL 18 - https://www.sqlpassion.at/archive/2025/09/29/whats-new-in-postgresql-18/
- Crunchy Data: Get Excited About Postgres 18 - https://www.crunchydata.com/blog/get-excited-about-postgres-18
- Going down the rabbit hole of Postgres 18 features - https://xata.io/blog/going-down-the-rabbit-hole-of-postgres-18-features
- Waiting for PostgreSQL 18 – Enable BUFFERS with EXPLAIN ANALYZE by default - https://www.depesz.com/2025/01/15/waiting-for-postgresql-18-enable-buffers-with-explain-analyze-by-default/

