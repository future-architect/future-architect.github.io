---
title: "PostgreSQL17リリース: 排他制約がパーティションの親テーブルに定義できるようになった"
date: 2024/11/06 00:00:00
postid: a
tag:
  - PostgreSQL
  - PostgreSQL17
  - 排他制約
  - パーティション
category:
  - DB
thumbnail: /images/2024/20241106a/thumbnail.png
author: 真野隼記
lede: "パーティションテーブルに対して宣言的に排他制約を設定できるようになったアップデートについて取り上げます。"
---

<img src="/images/2024/20241106a/top.png" alt="top.png" width="761" height="366" loading="lazy">

[PostgreSQL 17のリリース記念連載](/articles/20241023a/)の2本目です。

# はじめに

Technology Innovation Group真野です。

リリースノートの「E.1.3.2. Utility Commands」に記載がある、パーティションテーブルに対して宣言的に排他制約を設定できるようになったアップデートについて取り上げます。

>
> Allow exclusion constraints on partitioned tables (Paul A. Jungwirth) §
> As long as exclusion constraints compare partition key columns for equality, other columns can use exclusion constraint-specific comparisons.
>
> パーティショニングされたテーブルに排他制約を許可する（Paul A. Jungwirth）
> 排他制約がパーティションキー列に対して等価を比較する限り、他の列は排他制約特有の比較を使用できます。
> https://www.postgresql.org/docs/17/release-17.html#RELEASE-17-UTILITY

## 排他制約とは何か？

[PostgreSQL 9.0 で追加された](https://www.postgresql.jp/docs/9.6/release-9-0.html)機能で、複雑な条件が指定できる一意制約のようなものと理解すると良いかなと思います。

- https://www.postgresql.jp/docs/16/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION
- https://www.postgresql.jp/docs/16/sql-createtable.html#SQL-CREATETABLE-EXCLUDE

典型的なユースケースは会議室など限られたリソースの予約システムでしょう。

以下は会議室予約の、特定の部屋が同一時間帯に貸し出されないように、排他制約を付与した例です。 `EXCLUDE USING gist (...)` の部分が対象です。

```sql
-- btree_gistを利用するために、拡張を有効にする
-- https://www.postgresql.jp/docs/16/btree-gist.html
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 同一時間帯に、同一部屋を貸し出されないようにする例
CREATE TABLE reservations (
    id BIGSERIAL PRIMARY KEY,
    room_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    EXCLUDE USING GIST (
        room_id WITH =,
        tsrange(start_time, end_time) WITH &&
    )
);
```

`gist` はインデックス種別のことで、地理空間データや範囲型に対して効率が良いとされています。B-treeもEXCLUDE内で指定できるそうですが、一意制約以上に高速で動かないため意味がないとドキュメントにあります。

tsrangeは9.2から追加された[範囲型](https://www.postgresql.jp/document/16/html/rangetypes.html#RANGETYPES)です。重なり検出する[演算子](https://www.postgresql.jp/docs/16/functions-range.html) `&&` （=重なりがあることを示す）などと一緒に使います。

`room_id WITH =` で同じ部屋IDが等しいという条件と合わせて、特定の部屋が同一時間帯に存在しないことを制約として示しています。

他にも、PostGISを用いた地理系の処理で、ジオフェンシングのように特定の領域が重複しないような制約も排他制約で実現できます。このように時間（範囲）や空間の重複を弾くために存在するのが排他制約です。

## 国内でも使用実績がある？

わたしは排他制約自体を、リリースノートを読んでいて初めて存在を知ったのですが、2017時点でそーだいさんなど、多くの方々が便利さを伝えているので、おそらく実績も多数かなと思います。

- [PostgreSQLで排他制約がめっちゃ便利！！](https://soudai.hatenablog.com/entry/2017/04/16/152905)
- [Re: PostgreSQLで排他制約がめっちゃ便利！！](https://shogo82148.github.io/blog/2017/04/22/postgresql-exclusion-constraint/)

そーだいさんの記事だと、`tsrange` で直接カラム定義しており、こちらを利用するほうが一般的には良いでしょう。

```sql
CREATE TABLE schedule
(
    schedule_id SERIAL PRIMARY KEY NOT NULL,
    room_name TEXT NOT NULL,
    reservation_time tsrange NOT NULL,
    EXCLUDE USING GIST (reservation_time WITH &&)
);
```

## 16以前のバージョンでは、パーティションテーブルの親側に定義することはできなかった

16より前のバージョンは、以下のように `PARTITON BY` と `EXCLUDE USING` を同時に宣言できませんでした。

```sql
postgres=# select version();
                                                       version
---------------------------------------------------------------------------------------------------------------------
 PostgreSQL 16.4 (Debian 16.4-1.pgdg120+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit
(1 row)

-- パーティションテーブルで排他制約を宣言
postgres=# CREATE TABLE reservations (
    id BIGSERIAL NOT NULL,
    room_id INT NOT NULL,
    reservation_date date,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    CONSTRAINT reservations_pkey PRIMARY KEY (reservation_date, id),
    EXCLUDE USING GIST (
        reservation_date WITH =,
        room_id WITH =,
        tsrange(start_time, end_time) WITH &&
    )
) PARTITION BY RANGE (reservation_date);
ERROR:  exclusion constraints are not supported on partitioned tables
LINE 8:     EXCLUDE USING GIST (
```

`exclusion constraints are not supported on partitioned tables` とあるのがエラー部分です。

## 16以前の回避方法

16以前のバージョンでは、回避策として子テーブルそれぞれに排他制約を追加していく必要がありました。

以下が `reservations_20241101` などのパーティションを作成して、それに対して排他制約を個別に定義する例です。

```sql
CREATE TABLE reservations (
    id BIGSERIAL NOT NULL,
    room_id INT NOT NULL,
    reservation_date date,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    CONSTRAINT reservations_pkey PRIMARY KEY (reservation_date, id)
) PARTITION BY RANGE (reservation_date);

-- パーティションを作成
CREATE TABLE reservations_20241101 PARTITION OF reservations
FOR VALUES FROM ('2024-11-01') TO ('2024-11-02');

CREATE TABLE reservations_20241102 PARTITION OF reservations
FOR VALUES FROM ('2024-11-02') TO ('2024-11-03');

-- 排他制約をそれぞれの子パーティションテーブルに設定
ALTER TABLE reservations_20241101
ADD CONSTRAINT reservations_20241101_exclude EXCLUDE USING GIST (
    room_id WITH =,
    tsrange(start_time, end_time) WITH &&
);

ALTER TABLE reservations_20241102
ADD CONSTRAINT reservations_20241102_exclude EXCLUDE USING GIST (
    room_id WITH =,
    tsrange(start_time, end_time) WITH &&
);
```

テーブルの状態は以下です

```sh \d+結果
postgres=# \d+ reservations
                                                                Partitioned table "public.reservations"
      Column      |            Type             | Collation | Nullable |                 Default                  | Storage | Compression | Stats target | Description
------------------+-----------------------------+-----------+----------+------------------------------------------+---------+-------------+--------------+-------------
 id               | bigint                      |           | not null | nextval('reservations_id_seq'::regclass) | plain   |             |              |
 room_id          | integer                     |           | not null |                                          | plain   |             |              |
 reservation_date | date                        |           | not null |                                          | plain   |             |              |
 start_time       | timestamp without time zone |           | not null |                                          | plain   |             |              |
 end_time         | timestamp without time zone |           | not null |                                          | plain   |             |              |
Partition key: RANGE (reservation_date)
Indexes:
    "reservations_pkey" PRIMARY KEY, btree (reservation_date, id)
Partitions: reservations_20241101 FOR VALUES FROM ('2024-11-01') TO ('2024-11-02'),
            reservations_20241102 FOR VALUES FROM ('2024-11-02') TO ('2024-11-03')
````


実際にデータを登録してみます。

```sql psqlでの実行例
-- 正常に挿入されるデータ
postgres=# INSERT INTO reservations (room_id, reservation_date, start_time, end_time)
  VALUES (1, '2024-11-01', '2024-11-01 10:00:00', '2024-11-01 11:00:00');
INSERT 0 1
postgres=# INSERT INTO reservations (room_id, reservation_date, start_time, end_time)
  VALUES (1, '2024-11-02', '2024-11-02 11:00:00', '2024-11-02 12:00:00');
INSERT 0 1

-- 時間帯が重複しているため、エラーが発生するデータ
postgres=# INSERT INTO reservations (room_id, reservation_date, start_time, end_time)
  VALUES (1, '2024-11-01', '2024-11-01 10:30:00', '2024-11-01 11:30:00');
ERROR:  conflicting key value violates exclusion constraint "reservations_20241101_exclude"
DETAIL:  Key (room_id, tsrange(start_time, end_time))=(1, ["2024-11-01 10:30:00","2024-11-01 11:30:00")) conflicts with existing key (room_id, tsrange(start_time, end_time))=(1, ["2024-11-01 10:00:00","2024-11-01 11:00:00"))

-- テーブル状態を確認
postgres=# select * from reservations;
 id | room_id | reservation_date |     start_time      |      end_time
----+---------+------------------+---------------------+---------------------
  1 |       1 | 2024-11-01       | 2024-11-01 10:00:00 | 2024-11-01 11:00:00
  2 |       1 | 2024-11-02       | 2024-11-02 11:00:00 | 2024-11-02 12:00:00
(2 rows)
```

最後のINSERTだけが失敗して、整合性が保たれていることがわかります。

## PostgreSQL17からは、親テーブル側に宣言できるようになった

次のように、`CREATE TABLE` に `EXCLUDE USING` と`PARTITON BY` のどちらも指定できるようになりました。パーティションテーブル側それぞれに排他制約を指定しなくて済むので、より直感的になりました。

```sql
CREATE TABLE reservations (
    id BIGSERIAL NOT NULL,
    room_id INT NOT NULL,
    reservation_date date,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    CONSTRAINT reservations_pkey PRIMARY KEY (reservation_date, id),
    EXCLUDE USING GIST (
        reservation_date WITH =,
        room_id WITH =,
        tsrange(start_time, end_time) WITH &&
    )
) PARTITION BY RANGE (reservation_date);

-- パーティション作成
CREATE TABLE reservations_20241101 PARTITION OF reservations
FOR VALUES FROM ('2024-11-01') TO ('2024-11-02');

CREATE TABLE reservations_20241102 PARTITION OF reservations
FOR VALUES FROM ('2024-11-02') TO ('2024-11-03');
```

制約としては、必ずパーティションキー（今回だと `reservation_date`） をイコール条件で履いた制約の追加する必要があります。

テーブルの状態は以下です。親テーブル側にも排他制約の情報が追加されていますね。

```sh \d+結果
postgres=# \d+ reservations
                                                                Partitioned table "public.reservations"
      Column      |            Type             | Collation | Nullable |                 Default                  | Storage | Compression | Stats target | Description
------------------+-----------------------------+-----------+----------+------------------------------------------+---------+-------------+--------------+-------------
 id               | bigint                      |           | not null | nextval('reservations_id_seq'::regclass) | plain   |             |              |
 room_id          | integer                     |           | not null |                                          | plain   |             |              |
 reservation_date | date                        |           | not null |                                          | plain   |             |              |
 start_time       | timestamp without time zone |           | not null |                                          | plain   |             |              |
 end_time         | timestamp without time zone |           | not null |                                          | plain   |             |              |
Partition key: RANGE (reservation_date)
Indexes:
    "reservations_pkey" PRIMARY KEY, btree (reservation_date, id)
    "reservations_reservation_date_room_id_tsrange_excl" EXCLUDE USING gist (reservation_date WITH =, room_id WITH =, tsrange(start_time, end_time) WITH &&)
Partitions: reservations_20241101 FOR VALUES FROM ('2024-11-01') TO ('2024-11-02'),
            reservations_20241102 FOR VALUES FROM ('2024-11-02') TO ('2024-11-03')
```

さきほどと同様に、実際にデータを登録してみます。

```sql
-- 正常に挿入されるデータ
postgres=# INSERT INTO reservations (room_id, reservation_date, start_time, end_time)
  VALUES (1, '2024-11-01', '2024-11-01 10:00:00', '2024-11-01 11:00:00');
INSERT 0 1
postgres=# INSERT INTO reservations (room_id, reservation_date, start_time, end_time)
  VALUES (1, '2024-11-02', '2024-11-02 11:00:00', '2024-11-02 12:00:00');
INSERT 0 1

-- 時間帯が重複しているため、エラーが発生するデータ
postgres=# INSERT INTO reservations (room_id, reservation_date, start_time, end_time)
  VALUES (1, '2024-11-01', '2024-11-01 10:30:00', '2024-11-01 11:30:00');
ERROR:  conflicting key value violates exclusion constraint "reservations_20241101_reservation_date_room_id_tsrange_excl"
DETAIL:  Key (reservation_date, room_id, tsrange(start_time, end_time))=(2024-11-01, 1, ["2024-11-01 10:30:00","2024-11-01 11:30:00")) conflicts with existing key (reservation_date, room_id, tsrange(start_time, end_time))=(2024-11-01, 1, ["2024-11-01 10:00:00","2024-11-01 11:00:00")).

-- テーブル状態を確認
postgres=# select * from reservations;
 id | room_id | reservation_date |     start_time      |      end_time
----+---------+------------------+---------------------+---------------------
  1 |       1 | 2024-11-01       | 2024-11-01 10:00:00 | 2024-11-01 11:00:00
  2 |       1 | 2024-11-02       | 2024-11-02 11:00:00 | 2024-11-02 12:00:00
(2 rows)
```

動作も16時点と同様、最後のINSERTだけが失敗して、整合性が保たれていることがわかります。

めちゃくちゃ便利！

## まとめ

PostgreSQLの排他制約を試しました。17のアップデートで、パーティションテーブルでより排他制約を利用しやすくなりました。


