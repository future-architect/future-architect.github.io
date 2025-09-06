---
title: "PostgreSQL拡張機能のPLV8を使ってみた"
date: 2024/08/30 00:00:00
postid: a
tag:
  - PostgreSQL
  - JavaScript
  - TypeScript
  - Vite
category:
  - DB
thumbnail: /images/2024/20240830a/thumbnail.png
author: 岸本卓也
lede: "PostgreSQLで手続き型処理を実装することにがっつりと向き合うことがなかったため手続き型処理の実装言語はPL/pgSQL一択だと思いこんでいたのですが、実は複数の選択肢がありました。PL/pgSQL、PL/Tcl、PL/Perl、PL/Pythonや、サードパーティ提供も含めると多数の言語が使えるようです使えるようです。"
---
<img src="/images/2024/20240830a/plv8-eyecatch.png" alt="plv8-eyecatch.png" width="1200" height="437" loading="lazy">

# はじめに

こんにちは、TIGの岸本卓也です。[夏の自由研究連載2024](/articles/20240819a/) シリーズです。

これまでPostgreSQLで手続き型処理を実装することにがっつりと向き合うことがなかったため手続き型処理の実装言語はPL/pgSQL一択だと思いこんでいたのですが、実は複数の選択肢がありました。[PostgreSQL標準で提供されている選択肢](https://www.postgresql.jp/document/16/html/xplang.html)はPL/pgSQL、PL/Tcl、PL/Perl、PL/Pythonですが、サードパーティ提供も含めると[多数の言語が](https://wiki.postgresql.org/wiki/PL_Matrix)使えるます。

その中でもJavaScriptで実装できる[PLV8](https://plv8.github.io/)は手馴染みが良さそうで興味を惹かれたので試してみることにしました。

# DBの準備

適当にPostgreSQLデータベースとサンプルDBを作成しておきます。

## DBインスタンス

Amazon RDS for PostgreSQLを利用してPostgreSQL 16.3のデータベースを作成しました。大手のクラウドベンダーではマネージドサービスのDBでもPLV8に対応しています。

cf. クラウドベンダーのマネージドPostgreSQLデータベースにおける対応拡張機能

* [AWS: Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html)
* [Azure: Azure Database for PostgreSQL](https://learn.microsoft.com/ja-jp/azure/postgresql/flexible-server/concepts-extensions#extension-versions)
* [GCP: Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres/extensions?hl=ja#language-extensions)

PLV8拡張機能をインストールします。(cf. [Installing PLV8](https://plv8.github.io/#installing-plv8))

```sql
-- 利用可能な拡張機能を確認
select *
from pg_available_extensions
where name like 'pl%'
order by name;

-- PLV8拡張機能をインストール
create extension plv8;

-- インストールできたことを確認 その1
select *
from pg_extension
order by extname;

-- インストールできたことを確認 その2
select plv8_version();
```

## サンプルDB

今回は [PostgreSQL wiki](https://wiki.postgresql.org/wiki/Sample_Databases) に掲載されている [Pagila](https://github.com/devrimgunduz/pagila) を利用しました。

# DO ブロックでの実行

PLV8は `DO` による無名コードブロック実行にも対応しているため、手始めに DO ブロックで試してみます。

## 素朴なSQL実行の例

```sql
do $$
    // SQLを実行して結果を取得
    const inactives = plv8.execute(`
        select count(1)::integer as inactive_count
        from customer c
        where c.active = 0
    `)
    plv8.elog(NOTICE, `There is ${inactives[0].inactive_count} inactive members.`)
$$ language plv8;
```

実行結果は以下です。特に問題なく期待通りの結果が得られました。

```sh
pagila=> do $$
pagila$>     // SQLを実行して結果を取得
pagila$>     const inactives = plv8.execute(`
pagila$>         select count(1)::integer as inactive_count
pagila$>         from customer c
pagila$>         where c.active = 0
pagila$>     `)
pagila$>     plv8.elog(NOTICE, `There is ${inactives[0].inactive_count} inactive members.`)
pagila$> $$ language plv8;
NOTICE:  There is 15 inactive members.
DO
```

## SELECT 結果をカーソルで取得する例

`plv8.execute` ではSQL実行結果を一度に取得しますが、カーソルを使って逐次取得できます。カーソルで取得する方法を試してみます。

```sql
do $$
    let plan, cursor
    try {
        // プリペアド文を作成
        plan = plv8.prepare(`
            select c.customer_id, c.first_name
            from customer c
            where exists (
                select 1
                from rental r
                where c.customer_id = r.customer_id
                group by r.customer_id
                having count(1) > $1
            )
            order by c.customer_id
        `, ['integer'])

        // プリペアド文を実行してカーソルを取得
        cursor = plan.cursor([40])
        let customer
        // カーソルを使ってループ
        while (customer = cursor.fetch()) {
            plv8.elog(NOTICE, `id: ${customer.customer_id}, name: ${customer.first_name}`)
        }
    } finally {
        // カーソルとプリペアド文は解放が必要
        cursor?.close()
        plan?.free()
    }
$$ language plv8;
```

実行結果は以下です。こちらも特に問題なく期待通りの結果が得られました。

<details>
<summary>実行結果</summary>

```sh
pagila=> do $$
pagila$>     let plan, cursor
pagila$>     try {
pagila$>         // プリペアド文を作成
pagila$>         plan = plv8.prepare(`
pagila$>             select c.customer_id, c.first_name
pagila$>             from customer c
pagila$>             where exists (
pagila$>                 select 1
pagila$>                 from rental r
pagila$>                 where c.customer_id = r.customer_id
pagila$>                 group by r.customer_id
pagila$>                 having count(1) > $1
pagila$>             )
pagila$>             order by c.customer_id
pagila$>         `, ['integer'])
pagila$>
pagila$>         // プリペアド文を実行してカーソルを取得
pagila$>         cursor = plan.cursor([40])
pagila$>         let customer
pagila$>         // カーソルを使ってループ
pagila$>         while (customer = cursor.fetch()) {
pagila$>             plv8.elog(NOTICE, `id: ${customer.customer_id}, name: ${customer.first_name}`)
pagila$>         }
pagila$>     } finally {
pagila$>         // カーソルとプリペアド文は解放が必要
pagila$>         cursor?.close()
pagila$>         plan?.free()
pagila$>     }
pagila$> $$ language plv8;
NOTICE:  id: 75, name: TAMMY
NOTICE:  id: 144, name: CLARA
NOTICE:  id: 148, name: ELEANOR
NOTICE:  id: 236, name: MARCIA
NOTICE:  id: 526, name: KARL
DO
```

</details>

# 関数として作成して実行

## CREATE FUNCTION 文を手作成

カーソルで取得する例のSQLを関数にして実行してみます。DO ブロックの代わりに CREATE FUNCTION にするだけなので、ついでに閾値を関数の引数で渡すように変更してみます。

```sql
create function print_top_customers(frequency integer) returns void as $$
-- ---------- 処理はほぼ同じなため記載省略 ----------
$$ language plv8 stable;
```

<details>
<summary>実行結果</summary>

```sh
pagila=> create function print_top_customers(frequency integer) returns void as $$
pagila$>     let plan, cursor
pagila$>     try {
pagila$>         // プリペアド文を作成
pagila$>         plan = plv8.prepare(`
pagila$>             select c.customer_id, c.first_name
pagila$>             from customer c
pagila$>             where exists (
pagila$>                 select 1
pagila$>                 from rental r
pagila$>                 where c.customer_id = r.customer_id
pagila$>                 group by r.customer_id
pagila$>                 having count(1) > $1
pagila$>             )
pagila$>             order by c.customer_id
pagila$>         `, ['integer'])
pagila$>
pagila$>         // プリペアド文を実行してカーソルを取得
pagila$>         cursor = plan.cursor([frequency])
pagila$>         let customer
pagila$>         // カーソルを使ってループ
pagila$>         while (customer = cursor.fetch()) {
pagila$>             plv8.elog(NOTICE, `id: ${customer.customer_id}, name: ${customer.first_name}`)
pagila$>         }
pagila$>     } finally {
pagila$>         // カーソルとプリペアド文は解放が必要
pagila$>         cursor?.close()
pagila$>         plan?.free()
pagila$>     }
pagila$> $$ language plv8 stable;
CREATE FUNCTION
pagila=> select print_top_customers(40);
NOTICE:  id: 75, name: TAMMY
NOTICE:  id: 144, name: CLARA
NOTICE:  id: 148, name: ELEANOR
NOTICE:  id: 236, name: MARCIA
NOTICE:  id: 526, name: KARL
 print_top_customers
---------------------

(1 行)
```

</details></p>

DO ブロックでの実行と同じ結果が得られました。

## JavaScript実装をバンドルして CREATE FUNCTION SQL を生成

前の例では CREATE FUNCTION 文を手作成しました。そのSQLにおいて1行目と最終行以外はJSの実装です。であれば、JS部分は独立して開発して最後に CREATE FUNCTION 文を生成できれば色々捗りそうです。それをやってくれるツールである[PLV8ify](https://github.com/divyenduz/plv8ify)が公式ドキュメントで[紹介](https://plv8.github.io/#plv8ify)されていますので、ここからはPLV8ifyを使った関数の開発を試してみます。

### PLV8関数開発環境の構築

適当なNode.js環境をインストールしておきます。今回はv20.16.0のNode.jsを利用しました。

開発用のフォルダで以下のコマンドによりプロジェクトを作成し、利用するパッケージをインストールします。PLV8ifyによる変換は[TypeScriptしか対応していない](https://github.com/divyenduz/plv8ify#:~:text=Specify%20an%20input%20file%20path%20(only%20Typescript%20supported%20at%20the%20moment))のでTypeScriptの開発環境を整えています。

```sh
npm init -y
npm pkg set type=module
npm install -D eslint @eslint/js @stylistic/eslint-plugin @types/eslint__js typescript typescript-eslint plv8ify @types/plv8-internal vitest
npm pkg set scripts.test=vitest
npm install dayjs
```

上記でインストールされたパッケージのバージョンは以下の通り (`npm list --depth=0` の出力) です。

<details>
<summary>パッケージバージョン</summary>

```sh
+-- @eslint/js@9.9.1
+-- @stylistic/eslint-plugin@2.7.1
+-- @types/eslint__js@8.42.3
+-- @types/plv8-internal@3.1.2
+-- dayjs@1.11.13
+-- eslint@9.9.1
+-- plv8ify@0.0.59
+-- typescript-eslint@8.3.0
+-- typescript@5.5.4
`-- vitest@2.0.5
```

</details>

なお、 `plv8ify` は実際には上記でインストールされたバージョンそのものではなく、バグと思われる挙動や利便性向上をローカルで修正したものを使用しました。このため、ここより後の例ではTypeScriptで実装した関数に対して生成される CREATE FUNCTION 文の関数定義では関数名と引数名が snake_case 化されるようにしています。

### PLV8関数のTS実装例

前の手作成 CREATE FUNCTION の例をTS実装にし、ついでに検索結果をログではなく戻り値として返却するように変更したものがこちらです。

```ts fetch_top_customers.ts
/**
 * @plv8ify_param {integer} frequency
 * @plv8ify_return {setof record}
 * @plv8ify_volatility STABLE
 */
export function fetchTopCustomers(frequency: number): void {
  let plan!: PreparedPlan, cursor!: Cursor;
  try {
    plan = plv8.prepare(`
      select c.customer_id, c.first_name
      from customer c
      where exists (
        select 1
        from rental r
        where c.customer_id = r.customer_id
        group by r.customer_id
        having count(1) > $1
      )
      order by c.customer_id
    `, ['integer']);

    cursor = plan.cursor([frequency]);
    let customer: SQLRow;
    while ((customer = cursor.fetch())) {
      plv8.return_next({ id: customer.customer_id, name: customer.first_name });
    }
  }
  finally {
    cursor?.close();
    plan?.free();
  }
}
```

`plv8ify` で CREATE FUNCTION SQL を生成し、

```sh
npx plv8ify generate --input-file src/fetch_top_customers.ts
```

関数作成後にSQLを実行しました。

```sh
pagila=> \i plv8ify-dist/fetch_top_customers.plv8.sql
psql:plv8ify-dist/fetch_top_customers.plv8.sql:1: NOTICE:  function fetch_top_customers(pg_catalog.int4) does not exist, skipping
DROP FUNCTION
CREATE FUNCTION
pagila=> select * from fetch_top_customers(40) as (id integer, name varchar);
 id  |  name
-----+---------
  75 | TAMMY
 144 | CLARA
 148 | ELEANOR
 236 | MARCIA
 526 | KARL
(5 行)
```

手作成 CREATE FUNCTION の例と同じ結果が得られました。

### 実践的な例

より実践的な例としてPL/pgSQLの関数をPLV8関数に実装し直してみます。対象はサンプルDBにある `rewards_report` 関数です。ただし素の `rewards_report` 関数は `CURRENT_DATE` が使われていてテストしにくいため、 `CURRENT_DATE` 部分を引数で指定できるように変更した以下の関数を対象とします。

<details>
<summary>引数追加版 <code>rewards_report</code> 関数</summary>

```sql
CREATE FUNCTION public.rewards_report(min_monthly_purchases integer, min_dollar_amount_purchased numeric, today date) RETURNS SETOF public.customer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    last_month_start DATE;
    last_month_end DATE;
rr RECORD;
tmpSQL TEXT;
BEGIN

    /* Some sanity checks... */
    IF min_monthly_purchases = 0 THEN
        RAISE EXCEPTION 'Minimum monthly purchases parameter must be > 0';
    END IF;
    IF min_dollar_amount_purchased = 0.00 THEN
        RAISE EXCEPTION 'Minimum monthly dollar amount purchased parameter must be > $0.00';
    END IF;

    last_month_start := today - '3 month'::interval;
    last_month_start := to_date((extract(YEAR FROM last_month_start) || '-' || extract(MONTH FROM last_month_start) || '-01'),'YYYY-MM-DD');
    last_month_end := LAST_DAY(last_month_start);

    /*
    Create a temporary storage area for Customer IDs.
    */
    CREATE TEMPORARY TABLE tmpCustomer (customer_id INTEGER NOT NULL PRIMARY KEY);

    /*
    Find all customers meeting the monthly purchase requirements
    */

    tmpSQL := 'INSERT INTO tmpCustomer (customer_id)
        SELECT p.customer_id
        FROM payment AS p
        WHERE DATE(p.payment_date) BETWEEN '||quote_literal(last_month_start) ||' AND '|| quote_literal(last_month_end) || '
        GROUP BY customer_id
        HAVING SUM(p.amount) > '|| min_dollar_amount_purchased || '
        AND COUNT(customer_id) > ' ||min_monthly_purchases ;

    EXECUTE tmpSQL;

    /*
    Output ALL customer information of matching rewardees.
    Customize output as needed.
    */
    FOR rr IN EXECUTE 'SELECT c.* FROM tmpCustomer AS t INNER JOIN customer AS c ON t.customer_id = c.customer_id' LOOP
        RETURN NEXT rr;
    END LOOP;

    /* Clean up */
    tmpSQL := 'DROP TABLE tmpCustomer';
    EXECUTE tmpSQL;

RETURN;
END
$_$;
```

</details>

上記PL/pgSQL関数を以下のようにTS実装しました。

<details>
<summary>引数追加版 <code>rewards_report</code> のTS実装</summary>

```ts v8_rewards_report.ts
/**
 * @plv8ify_param {integer} minMonthlyPurchases
 * @plv8ify_param {numeric} minDollarAmountPurchased
 * @plv8ify_param {date} today
 * @plv8ify_return {setof public.customer}
 * @plv8ify_volatility VOLATILE
 */
export function v8RewardsReport(
  minMonthlyPurchases: number,
  minDollarAmountPurchased: number,
  today: Date,
): void {
  // Some sanity checks...
  if (minMonthlyPurchases === 0) {
    throw new Error('Minimum monthly purchases parameter must be > 0');
  }
  if (minDollarAmountPurchased === 0.00) {
    throw new Error('Minimum monthly dollar amount purchased parameter must be > $0.00');
  }

  const lastMonthStart = plv8.execute(`
    SELECT DATE_TRUNC('month', $1::timestamp - '3 month'::interval) AS val
  `, [today])[0].val;
  const lastMonthEnd = plv8.execute(`
    SELECT LAST_DAY($1) AS val
  `, [lastMonthStart])[0].val;

  // Create a temporary storage area for Customer IDs.
  plv8.execute(`
    CREATE TEMPORARY TABLE tmpCustomer (customer_id INTEGER NOT NULL PRIMARY KEY)
  `);

  // Find all customers meeting the monthly purchase requirements
  plv8.execute(`
    INSERT INTO tmpCustomer (customer_id)
    SELECT p.customer_id
    FROM payment AS p
    WHERE DATE(p.payment_date) BETWEEN $1 AND $2
    GROUP BY customer_id
    HAVING SUM(p.amount) > ${minDollarAmountPurchased}
    AND COUNT(customer_id) > ${minMonthlyPurchases}
  `, [lastMonthStart, lastMonthEnd]);

  // Output ALL customer information of matching rewardees.
  // Customize output as needed.
  let plan!: PreparedPlan, cursor!: Cursor;
  try {
    plan = plv8.prepare(`
      SELECT c.* FROM tmpCustomer AS t INNER JOIN customer AS c ON t.customer_id = c.customer_id
    `);
    cursor = plan.cursor();
    let customer: SQLRow;
    while ((customer = cursor.fetch())) {
      plv8.return_next(customer);
    }
  }
  finally {
    cursor?.close();
    plan?.free();
  }

  // Clean up
  plv8.execute('DROP TABLE tmpCustomer');
}
```

</details>

前の例と同様に CREATE FUNCTION SQL を生成し関数を作成してSQLを実行しました。

```sh
pagila=> select customer_id, first_name
pagila-> from v8_rewards_report(10, 40, '2022-06-22');
 customer_id | first_name
-------------+------------
         147 | JOANNE
         158 | VERONICA
         179 | DANA
         366 | BRANDON
         381 | BOBBY
         410 | CURTIS
         416 | JEFFERY
         526 | KARL
(8 行)


pagila=> select customer_id, first_name
pagila-> from rewards_report(10, 40, '2022-06-22');
 customer_id | first_name
-------------+------------
         147 | JOANNE
         158 | VERONICA
         179 | DANA
         366 | BRANDON
         381 | BOBBY
         410 | CURTIS
         416 | JEFFERY
         526 | KARL
(8 行)
```

PLV8版の関数でもPL/pgSQL版の関数と同じ結果が得られました。

### 外部ライブラリの利用

`rewards_report` 関数は `LAST_DAY` 関数を呼び出していますが、前の例では既存の関数をSQLで呼び出していました。PLV8関数からPLV8関数を呼び出す場合はSQL実行よりも簡単に[呼び出す手段がある](https://plv8.github.io/#-code-plv8-find_function-code-)ため、 `LAST_DAY` 関数もPLV8化してみます。この関数は日付を扱うため、日時を扱う外部ライブラリの利用も試してみます。今回はDay.jsを利用し、以下のようにTS実装しました。

```ts v8_last_day2.ts
import dayjs from 'dayjs';

/**
 * @plv8ify_param {timestamp with time zone} date
 * @plv8ify_return {date}
 */
export function v8LastDay2(
  date: Date,
): Date {
  return dayjs(date).endOf('month').toDate();
}
```

このTS実装から生成した CREATE FUNCTION SQL を確認すると、インポートしている `dayjs` はインライン化されることが分かります。

このPLV8関数版を使うように変更した `rewards_report` 関数のTS実装は以下です。 `LAST_DAY` 関数のPLV8化と同様にDay.jsを利用する変更を加えていますが、大部分は前掲の関数実装と同じなため差分だけ掲載します。

```diff
--- v8_rewards_report.ts        2024-08-29 13:01:54.774358100 +0900
+++ v8_rewards_report3.ts       2024-08-29 12:20:48.789519300 +0900
@@ -1,3 +1,7 @@
+import dayjs from 'dayjs';
+
+const lastDay = plv8.find_function('v8_last_day2');
+
 /**
  * @plv8ify_param {integer} minMonthlyPurchases
  * @plv8ify_param {numeric} minDollarAmountPurchased
@@ -5,7 +9,7 @@
  * @plv8ify_return {setof public.customer}
  * @plv8ify_volatility VOLATILE
  */
-export function v8RewardsReport(
+export function v8RewardsReport3(
   minMonthlyPurchases: number,
   minDollarAmountPurchased: number,
   today: Date,
@@ -18,12 +22,8 @@
     throw new Error('Minimum monthly dollar amount purchased parameter must be > $0.00');
   }

-  const lastMonthStart = plv8.execute(`
-    SELECT DATE_TRUNC('month', $1::timestamp - '3 month'::interval) AS val
-  `, [today])[0].val;
-  const lastMonthEnd = plv8.execute(`
-    SELECT LAST_DAY($1) AS val
-  `, [lastMonthStart])[0].val;
+  const lastMonthStart = dayjs(today).subtract(3, 'month').startOf('month');
+  const lastMonthEnd = lastDay(lastMonthStart);

   // Create a temporary storage area for Customer IDs.
   plv8.execute(`
```

このTS実装から生成した CREATE FUNCTION SQL を確認すると、 `v8_last_day2.ts` と同様に `dayjs` はインライン化されることが分かります。

これらの関数を作成してSQLを実行しました。

<details>
<summary>実行結果</summary>

```sh
pagila=> select customer_id, first_name
pagila-> from v8_rewards_report3(10, 40, '2022-06-22');
 customer_id | first_name
-------------+------------
         147 | JOANNE
         158 | VERONICA
         179 | DANA
         366 | BRANDON
         381 | BOBBY
         410 | CURTIS
         416 | JEFFERY
         526 | KARL
(8 行)
```

</details>

PL/pgSQL版の関数と同じ結果が得られました。

### Unit test

PostgreSQL関数を問題なくTS実装できることが確認できたので、次はTS実装のテストを試します。今回はテストフレームワークとモック作成にVitestを利用しました。シンプルな例として、サンプルDBにある `inventory_in_stock` 関数をPLV8化した以下のTS実装を使います。

```ts v8_inventory_in_stock.ts
/**
 * @plv8ify_param {integer} inventoryId
 */
export function v8InventoryInStock(
  inventoryId: number,
): boolean {
  // AN ITEM IS IN-STOCK IF THERE ARE EITHER NO ROWS IN THE rental TABLE
  // FOR THE ITEM OR ALL ROWS HAVE return_date POPULATED

  const rentals: number = plv8.execute(`
    SELECT count(*) AS val
    FROM rental
    WHERE inventory_id = ${inventoryId}
  `)[0].val;

  if (rentals === 0) {
    return true;
  }

  const out: number = plv8.execute(`
    SELECT COUNT(rental_id) AS val
    FROM inventory LEFT JOIN rental USING(inventory_id)
    WHERE inventory.inventory_id = ${inventoryId}
    AND rental.return_date IS NULL
  `)[0].val;

  return out <= 0;
}
```

CREATE FUNCTION SQL を生成し関数を作成してSQLを実行すると、PLV8版とPL/pgSQL版で同じ結果が得られます。

<details>
<summary>実行結果</summary>

```sh
pagila=> select
pagila->     iid,
pagila->     inventory_in_stock(iid) as in_stock,
pagila->     v8_inventory_in_stock(iid) as in_stock_v8
pagila-> from generate_series(1, 10) as iid;
 iid | in_stock | in_stock_v8
-----+----------+-------------
   1 | t        | t
   2 | t        | t
   3 | t        | t
   4 | t        | t
   5 | t        | t
   6 | f        | f
   7 | t        | t
   8 | t        | t
   9 | f        | f
  10 | t        | t
(10 行)
```

</details>

この `v8InventoryInStock` 関数をテストする以下のテストスクリプトを作成しました。このテストではグローバルな `plv8` オブジェクトはモックを作成してテストできるようにしました。

```js v8_inventory_in_stock.test.js
import { expect, test, vi } from 'vitest';
import { v8InventoryInStock } from './v8_inventory_in_stock';

test('貸出履歴ありだがすべて返却済みなら、在庫あり', () => {
  const plv8 = {
    execute: vi.fn(),
  };
  globalThis.plv8 = plv8;

  plv8.execute
    .mockReturnValueOnce(([{ val: 1 }]))
    .mockReturnValueOnce(([{ val: 0 }]));

  const inventoryId = 1;
  expect(v8InventoryInStock(inventoryId)).toBe(true);
  expect(plv8.execute)
    .toHaveBeenNthCalledWith(1, `
    SELECT count(*) AS val
    FROM rental
    WHERE inventory_id = ${inventoryId}
  `)
    .toHaveBeenNthCalledWith(2, `
    SELECT COUNT(rental_id) AS val
    FROM inventory LEFT JOIN rental USING(inventory_id)
    WHERE inventory.inventory_id = ${inventoryId}
    AND rental.return_date IS NULL
  `);
});
```

このテストを実行すると以下の通り成功することが確認できました。

```sh
 ✓ src/v8_inventory_in_stock.test.js (1)
   ✓ 貸出履歴ありだがすべて返却済みなら、在庫あり

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  12:22:59
   Duration  600ms (transform 151ms, setup 0ms, collect 123ms, tests 2ms, environment 0ms, prepare 146ms)
```

# まとめ

JavaScriptでPostgreSQLの手続き型処理を実装できる拡張機能PLV8を試した結果の感想は以下です。

* 良い点
  * Node.jsのエコシステム、各種ツールが使える。エディタ、Linter、ライブラリ、テスト、など
  * フロントエンドの開発スキルが流用できる。

* 懸念点
  * PLV8ifyの場合はインポートしたモジュールがPostgreSQL関数ごとにインライン化される。
    * 関数定義が肥大化しそう。
    * モジュールの変更時はそれに依存する関数を生成&作成し直す必要があるため、どのような単位でPostgreSQL関数化するかは要配慮と考えられる。
  * 今回試した範囲ではまったく性能的な懸念はなかったが、PL/pgSQLに対して性能的にどうなのかは分からない。
  * SQL実行やPostgreSQL組み込み関数の呼び出しはPL/pgSQLの方が簡単に書ける。

JavaScript (TypeScript) で開発できるというのは私は楽しく楽に実装できました。これは以下からくるものだと思います。

* エディタなどのJS開発支援機能による効率的な実装
* Linterに指摘してもらえる安心感
* テストしやすさからくる安心感

注意すべき点はありそうなものの十分実用できそうな印象です。いざとなればPL/pgSQLに切り替えるという選択肢も取れるので、チャンスがあれば実際のPJでも導入してみたいと思います。
