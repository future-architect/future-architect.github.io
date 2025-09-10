---
title: "PostgreSQLで Goの flextime のような関数を作りテスト時間を差し替える"
date: 2022/10/18 00:00:00
postid: a
tag:
  - PostgreSQL
  - テスト
  - モック
  - time
category:
  - DB
thumbnail: /images/2022/20221018a/thumbnail.jpg
author: 真野隼記
lede: Songmuさんのflextimeにはずっとお世話になっています。素晴らしいライブラリですが、SQLを用いて結果を永続化するようなテストでの利用する時に冗長性を感じました。PostgreSQL関数 を作成して代用できないか考えてみました。
---

<img src="/images/2022/20221018a/safari-gb655953e6_640.jpg" alt="" width="640" height="426">

TIG 真野です。

Goで時刻モックライブラリである、Songmuさん開発の[flextime](https://github.com/Songmu/flextime)にはずっとお世話になっています。

素晴らしいライブラリですが、SQLを用いて結果を永続化するようなテストでの利用する時に冗長性を感じました。

例えばあるWeb APIやバッチ処理のテストとして、DB上のデータが想定通りに登録/更新されていることを調べたいときです。検証対象のカラムが例えば `created_at` 、`updated_at` だとします。通常は現在日時を登録する項目で、flextime で扱うのにうってつけです。ただし、これを固定化するには、Go側の `flextime` の値を外からSQLプレスホルダーで渡す必要があります。本来であれば、PostgreSQLであれば`current_timestamp` の関数で済むところを一々外から渡すのは面倒に感じます（仕方ないですが、これがなくなればGoもSQLのコードもスッキリするのにと思うこともしばしば）。

```go SQLバインド
package example

import (
	_ "embed"
	"fmt"

	"github.com/Songmu/flextime"
	"github.com/jmoiron/sqlx"
)

//go:embed update.sql
var updateSQL string

func UpdateAlreadyRead(tx *sqlx.Tx, userID string) (int, error) {
	now := flextime.Now() // 現在時刻取得

	row := tx.QueryRow(updateSQL, now, userID) -- updated_atのためにnowをバインドする

	var updateCnt int64
	if err := row.Scan(&updateCnt); err != nil {
		return 0, fmt.Errorf("update read status: %w", err)
	}

	return int(updateCnt), nil
}
```

```sql update.sql
WITH update_cnt AS (
    UPDATE notification
        SET read_status_typ = '2'
            , updated_at = $1 -- 要件上はcurrent_timestampで良いが、テスト観点でバインド項目化
            , revision = revision + 1
        WHERE user_id = $2
            AND read_status_typ = '0' -- 0:未読
        RETURNING 1)
SELECT count(*) as cnt
FROM update_cnt;
```

もちろん、`created_at`, `updated_at` などの項目を検証から除外すれば上記は気にしなくても良いですが、経験的には検証を外せば外すほど、そのテストの信頼性は落ちるのであまりしたくないです（しばしば、実は更新されていないことが後続フェーズで発覚して苦労します）。この辺は[mpywさんの書いている記事](https://zenn.dev/mpyw/articles/rdb-ids-and-timestamps-best-practices)のように、PostgreSQLのトリガーなどでカバーするチームも多いかと思いますが、いったんそのやり方は忘れるとします。

```go go-cmpでupdated_atをチェック対象外にする
func TestUpdateAlreadyRead(t *testing.T) {
	// 中略
	opts := cmpopts.IgnoreFields("updated_at") // 検証をスキップする項目を増やすと、テスト漏れになりやすい
	if diff := cmp.Diff(wantRecords, gotRecords, opts); diff != "" {
		t.Errorf("records mismatch (-want +got):\n%s", diff)
	}
```

当然、PostgreSQLのもとから用意されている組み込み関数には、flextimeのような時刻固定の仕組みはないです。

この例だと更新系なので1項目ですが、登録だとcreated_at分も合わせて2項目になります。また、SQLで抽出したGo側でゴリゴリ業務ロジックで組み立てて、またDBに書き戻すようなコードを書いていると、ここで書いた `now` を一々引き回す必要があり面倒です（引き回さないと、微妙に呼び出しタイミングで created_at, updated_at の値が変わって扱いにくくなります）。

## PostgreSQL関数 を作成して代用してみる

次のようなテーブルと関数を作成してみる提案です。次の `flex_time` テーブルと、 `flex_timestamp()` 関数を定義します。

```sql
-- テーブル定義
CREATE TABLE flex_time
(
    seq_num  BIGSERIAL,
    fix_time TIMESTAMPTZ
);

-- 関数定義
CREATE OR REPLACE FUNCTION flex_timestamp()
    RETURNS TIMESTAMPTZ AS
$$
BEGIN
    DECLARE
        flex_ts TIMESTAMPTZ := (SELECT fix_time
                                FROM flex_time
                                WHERE seq_num = (SELECT max(seq_num) FROM flex_time));
    BEGIN
        IF flex_ts IS NOT NULL
        THEN
            RETURN flex_ts;
        ELSE
            RETURN current_timestamp;
        END IF;
    END;
END;
$$ LANGUAGE PLPGSQL;
;
```

上記を作っておいて、、 `flex_timestamp()` を呼ぶと、何もしないと現在時刻を返します。

```sql
postgres=# SELECT flex_timestamp();
        flex_timestamp
------------------------------
 2022-10-08 22:50:28.52979+09
(1 row)

postgres=# SELECT flex_timestamp();
        flex_timestamp
-------------------------------
 2022-10-08 22:52:33.674613+09
(1 row)
```

テストで使用したい時間を登録します。

```sql 時刻を固定化
postgres=# INSERT INTO flex_time(fix_time) VALUES (TO_TIMESTAMP('2022-04-01 15:30:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT 0 1
```

そうすると時間が固定化されます。

```sql
postgres=# SELECT flex_timestamp();
     flex_timestamp
------------------------
 2022-04-01 15:30:00+09
(1 row)

postgres=# SELECT flex_timestamp();
     flex_timestamp
------------------------
 2022-04-01 15:30:00+09
(1 row)
```

当たり前ですが、`flex_time` テーブルのレコードを削除すれば、現在時刻を返します。

```sql
postgres=# TRUNCATE flex_time;
TRUNCATE TABLE

postgres=# SELECT flex_timestamp();
        flex_timestamp
-------------------------------
 2022-10-08 22:58:17.919548+09
(1 row)
```

これを用いれば、`current_timestamp` 関数とほぼ同等の使い方でSQLを書け、呼び出し元のコードもプレスホルダー文ちょっとすっきりすると思います。

使い終わったら `TRUNCATE` でキレイにしておくのがお作法になると思います。

## 利用イメージ

ここで最初の実装例に戻って適用してみます。

```diff Go側の差分
func UpdateAlreadyRead(tx *sqlx.Tx, userID string) (int, error) {
-	row := tx.QueryRow(updateSQL, now, userID)
+	row := tx.QueryRow(updateSQL, userID)

	var updateCnt int64
	if err := row.Scan(&updateCnt); err != nil {
		return 0, fmt.Errorf("update read status: %w", err)
	}

	return int(updateCnt), nil
}
```

```diff SQLの差分
WITH update_cnt AS (
    UPDATE notification
        SET read_status_typ = '2'
-            , updated_at = $1
+            , updated_at = flex_timestamp()
            , revision = revision + 1
        WHERE user_id = $1
            AND read_status_typ = '0' -- 未読
        RETURNING 1)
SELECT count(*) as cnt
FROM update_cnt;
```

テストでは、次のようにテスト時間を固定化したいタイミングで `flex_time` に登録します。終わったらTRUNCATEはチームでお約束を決めればよいと思います（通常は不要な気がしますが、一応消す例で書いてみました）。

```go _test.go
func TestUpdateAlreadyRead(t *testing.T) {
	// 中略

	_, err = tx.Exec("INSERT INTO flex_time (fix_time) VALUES (TO_TIMESTAMP('2022-10-11 10:10:10', 'YYYY-MM-DD HH24:MI:SS'));")
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_, err := tx.Exec("TRUNCATE TABLE flex_time")
		if err != nil {
			t.Error(err)
		}
	}()
```

ちょっとした違いですが、開発・レビューなどの観点で見落としになり得るポイントを1つでも減らせるのが大きいかなと思っています。

## Appendix

あまりないかもしれませんが、もしテストを並列に実行しかつ、固定化したい時間を変えたい場合は、コネクション単位で `application_name` を変え、その単位で設定するように関数を改修しても良いかもしれません（flex_timeだけ分ける意味があるかはさておき）

`application_name` というカラムを追加したバージョンです。

```sql
CREATE TABLE flex_time
(
    seq_num  BIGSERIAL,
    fix_time TIMESTAMPTZ,
    application_name VARCHAR(64)
);

CREATE OR REPLACE FUNCTION flex_timestamp()
    RETURNS TIMESTAMPTZ AS
$$
BEGIN
    DECLARE
        flex_ts TIMESTAMPTZ := (SELECT fix_time
                                FROM flex_time
                                WHERE seq_num = (SELECT max(seq_num) FROM flex_time WHERE application_name IS NULL));
        app_flex_ts TIMESTAMPTZ := (SELECT fix_time
                                FROM flex_time
                                WHERE seq_num = (SELECT max(seq_num) FROM flex_time WHERE application_name = current_setting('application_name')));
    BEGIN
        IF app_flex_ts is not null
             then return app_flex_ts;
        ELSIF flex_ts IS NOT NULL
        THEN
            RETURN flex_ts;
        ELSE
            RETURN current_timestamp;
        END IF;
    END;
END;
$$ LANGUAGE PLPGSQL;
;
```

これを用いると、グローバル設定と、アプリケーション固有のテスト時間で区別できます。どちらも設定されるとアプリケーション固有を優先です。

```sql
-- グローバル設定
postgres=# INSERT INTO flex_time (application_name, fix_time) VALUES (CURRENT_SETTING('APPLICATION_NAME'), TO_TIMESTAMP('2022-06-27 11:20:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT 0 1
postgres=# SELECT flex_timestamp();
     flex_timestamp
------------------------
 2022-06-27 11:20:00+09
(1 row)

-- アプリケーション単位
postgres=# INSERT INTO flex_time (application_name, fix_time) VALUES (CURRENT_SETTING('APPLICATION_NAME'), TO_TIMESTAMP('2022-06-27 11:20:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT 0 1

postgres=# SELECT flex_timestamp();
     flex_timestamp
------------------------
 2022-06-27 11:20:00+09
(1 row)
```

`application_name` ですが、次のようにコネクション接続時に指定できます（[参考](https://www.postgresql.jp/docs/9.2/libpq-connect.html)）

```
postgresql://user@localhost:5432/postgres?connect_timeout=10&application_name=myapp
```

ただ、こういった多段の設定はデータ削除が難しい（気軽に`flex_time` テーブルを `TRUNCATE` しにくくなる）ため、やるならapplication_nameは `NOT NULL` にした運用にしたほうが良いかもしれません。要件に応じて調整ですが、できる限り最初の実装のシンプルモデルの利用に留めるという、用法用量が良い塩梅かと感じます。

## 最後に

PostgreSQLに、何も指定がなければ `current_timestamp`を、何か設定されていればその値を返す`flex_timestamp`関数 を定義して、使ってはどうかという記事でした。

これを思いついたのはちょうどあるプロジェクトの開発ラッシュ終盤で、同僚の辻さんに「こんなん思いついたんですけど~」って声をかけたら、もう開発も終わりですから..と諭されたため導入に失敗しました。そのため、まだ本番稼働＆運用実績がゼロのアイデア状態です。機会があればこの仕組を使ってみたいと思います。先駆けてトライしてくださる方も大歓迎です。ぜひ感想をTwitterなどで教えてください。

この記事で公開したサンプルコードは以下にアップしておきました。

* https://github.com/ma91n/postgres-flextime

アイキャッチは<a href="https://pixabay.com/ja/users/fearscare-2010330/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=4043090">Patrick</a>による<a href="https://pixabay.com/ja//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=4043090">Pixabay</a>からの画像を利用させていただきました。
