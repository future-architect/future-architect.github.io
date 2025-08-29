---
title: "PostgreSQL17リリース：to_regtypemod関数と型修飾子について"
date: 2024/10/23 00:00:01
postid: b
tag:
  - PostgreSQL
  - PostgreSQL17
  - SQL
category:
  - DB
thumbnail: /images/2024/20241023b/thumbnail.png
author:  山本竜玄
lede: "PostgreSQL 17ではバーフォーマンスの改善や、JSON周りなど大奥のアップデートが追加されていますが、その中でもデータ型文字列からデータ型の型修飾子を取得する関数to_regtypemodが新規に追加されました。"
---
## はじめに

[PostgreSQL17リリース記念連載](/articles/20241023a/)の1日目です。

Healthcare Innovation Group(HIG)所属の山本です。

先月の2024年9月、PostgreSQL 17がリリースされました。今回のリリースではバーフォーマンスの改善や、JSON周りなど大奥のアップデートが追加されていますが、その中でもデータ型文字列からデータ型の型修飾子(typemod)を取得する関数`to_regtypemod`が新規に追加されました。

本記事では、`to_regtypemod`の使用方法や従来の手法との比較を通じて、活用方法やその有用性、背景となる型修飾子自体について記載します。

## 0. サンプルデータ

本記事を下記にあたっての検証では、具体例などをイメージしやすくするために、以下のようにサンプルデータを作成しています。

```sql
-- データベースの作成
CREATE DATABASE healthcare_data;
```

```shell
-- 作成したデータベースに接続
\c healthcare_data;
```

```sql
-- カスタム型の定義
CREATE TYPE address_type AS (
    street VARCHAR(100),
    city VARCHAR(50),
    postal_code VARCHAR(10)
);

-- テーブルの作成
CREATE TABLE patient_records (
    patient_id VARCHAR(50),
    blood_sugar NUMERIC(5, 2),
    test_results NUMERIC(5, 2)[],
    address address_type
);

-- サンプルデータの挿入
INSERT INTO patient_records (patient_id, blood_sugar, test_results, address)
VALUES 
('P001', 98.76, ARRAY[95.5, 100.2], ('123 Main St', 'Tokyo', '100-0001')),
('P002', 110.45, ARRAY[105.1, 108.9], ('456 Oak St', 'Osaka', '530-0001')),
('P003', 92.35, ARRAY[90.5, 93.2], ('789 Pine St', 'Nagoya', '450-0001'));
```

作成後としては、以下のようになります。配列型、自作型などがあることがポイントです。

```
healthcare_data=# select * from patient_records ;
 patient_id | blood_sugar |  test_results   |             address
------------+-------------+-----------------+---------------------------------
 P001       |       98.76 | {95.50,100.20}  | ("123 Main St",Tokyo,100-0001)
 P002       |      110.45 | {105.10,108.90} | ("456 Oak St",Osaka,530-0001)
 P003       |       92.35 | {90.50,93.20}   | ("789 Pine St",Nagoya,450-0001)
(3 rows)
```


## 1.はじめに

この章では、サンプルデータで具体例を示しつつ、`to_regtypemod`それ自体や背景情報を説明します。

### 1.1 to_regtypemodとは？

https://pgpedia.info/t/to_regtypemod.html

(※執筆時点ではPostgreSQLの公式ドキュメントにないので、pgpediaを引用させていただいています)

`to_regtypemod`は、PostgreSQL 17で新たに追加されたシステム関数で、文字列で指定されたデータ型から型修飾子（typemod）を取得することができます。

例えば、VARCHAR(32)やNUMERIC(5, 2)のようなデータ型には、文字列の長さ(32の部分)や数値の精度(5の部分)・スケール(2の部分)が指定されています。to_regtypemodは、これらの修飾子を内部表現の形式で返す関数です。

### 1.2 基本的な使用方法

```
to_regtypemod(text) → integer
```

戻り値は以下の挙動となります。

1. データ型に型修飾子がある場合、その**内部表現**が返される
2. 修飾子がない場合は-1返される
3. 存在しないデータ型が指定されたが、文法的に有効な場合はNULLを返す
4. 文法エラーがある場合はERRORを発生させる



### 1.3 サンプルデータによるto_regtypemodの検証

イメージしやすくするため、それぞれ実際に確認してみます。特に、「内部表現が返される」ということが引っかかりポイントな気がします。

#### VARCHARの例
```
healthcare_data=# SELECT to_regtypemod('varchar(50)');
 to_regtypemod
---------------
            54
(1 row)
```


このように内部表現の値で返されます。
この値は、`to_regtype`関数と`format_type`関数と併用することで、見てわかる直感的な表現となります。

```
healthcare_data=# WITH datatype AS (
  SELECT
    'varchar(50)' AS type
)
SELECT
  to_regtype(d.type),
  to_regtypemod(d.type),
  format_type(
    to_regtype(d.type),
    to_regtypemod(d.type)
  )
FROM
  datatype d;
    to_regtype     | to_regtypemod |      format_type
-------------------+---------------+-----------------------
 character varying |            54 | character varying(50)
(1 row)
```



#### NUMERIC型でのスケール指定

numeric型で、scale(小数点の右側の小数部分の桁数)が指定されている場合には以下のようになります。

```
healthcare_data=# SELECT to_regtypemod('numeric(5,2)');
 to_regtypemod
---------------
        327686
(1 row)

```

```
healthcare_data=# WITH datatype AS (
  SELECT 'numeric(5, 2)' AS type
)
SELECT format_type(
         to_regtype(d.type),
         to_regtypemod(d.type)
       )
  FROM datatype d;
 format_type
--------------
 numeric(5,2)
(1 row)

```

#### 配列型の場合

配列の場合にも、以下のように取得できています。

```
healthcare_data=# WITH datatype AS (
  SELECT 'numeric(5, 2)[]' AS type
)
SELECT format_type(
         to_regtype(d.type),
         to_regtypemod(d.type)
       )
  FROM datatype d;
 format_type
--------------
 numeric(5,2)[]
(1 row)

```

#### 修飾子が存在しない場合の例

次に、値が不正やない場合の挙動を確認しましょう。

修飾子が存在しない場合、以下のように`-1`が返されていますね。

```
healthcare_data=# SELECT to_regtypemod('numeric');
 to_regtypemod
---------------
            -1
(1 row)

```

#### カスタム型の場合

サンプルで定義した、カスタムの型を指定するとどうなるでしょうか？

```sql
-- 患者の住所情報を管理するためのカスタム型を定義
CREATE TYPE address_type AS (
    street VARCHAR(100),
    city VARCHAR(50),
    postal_code VARCHAR(10)
);
```

```
healthcare_data=# SELECT to_regtypemod('address_type');
 to_regtypemod
---------------
            -1
(1 row)

```

`-1`で返されてしまいました。カスタム型の定義の際に、修飾子を指定していないからですね。

PostgreSQL 17時点の型宣言では、カスタム型の中でも複合型(上記のように、複数フィールドを指定するもの)に型修飾子を付与する構文は存在しないので、同様のことをしたい場合にはトリガーを作成することになるのではないでしょうか？


#### 存在しない型の場合

存在しない型だが文法的に有効な場合には、以下のようにNULLが戻ります。

```
healthcare_data=# SELECT to_regtypemod('tekitounakata(200)');
 to_regtypemod
---------------

(1 row)

```

文法エラーでは、以下のようにエラーが発生します。
```
healthcare_data=# SELECT to_regtypemod('!');
ERROR:  syntax error at or near "!"
LINE 1: SELECT to_regtypemod('!');
        ^
CONTEXT:  invalid type name "!"

```

## 2. 型修飾子(typemod）とは？

ここまでで、
`to_regtypemod`を用いて、文字列で指定されたデータ型から型修飾子（typemod）を取得する簡単な事例を紹介してきました。

そもそも、型修飾子（typemod）とはなんなのか、もう少し詳細に見ていきます。

### 2.1 型修飾子の概要

型修飾子（typemod）は、PostgreSQLのデータ型に追加の制約を付与するための仕組みです。

データ型そのものだけでは、例えばNUMERICを指定しても最大長までは許容されてしまうので、実際の用途に合わせたデータのサイズや精度、その他の具体的な制約を表現することができません。型修飾子は、これらの制約を定義するために用いられます。


実際にNUMERIC型を例に挙動を確認していきます。

https://www.postgresql.jp/document/16/html/datatype-numeric.html

NUMERIC型では、型修飾子としてprecisionとscaleを指定可能で、省略することも可能です。


```sql
-- サンプルテーブルの作成
CREATE TABLE sample_patient_info (
    patient_id SERIAL PRIMARY KEY,         
    age NUMERIC,                               -- 型修飾子を指定しない整数型
    heart_rate NUMERIC(3),                 -- 精度を指定した整数型（最大3桁）
    blood_pressure NUMERIC(5, 2)           -- 位取りを指定した整数型（最大5桁、小数点以下2桁）
);
```

ageには型修飾子を指定していないので、以下のように大きな数字を入れることができます。46億年なので、だいたい地球の誕生と同じくらいの年齢ですね。

```
healthcare_data=# INSERT INTO sample_patient_info (age, heart_rate, blood_pressure)
VALUES
(4600000000, 120, 120.75);
INSERT 0 1
```

heart_rateに、桁数以上の数字を指定してみると、以下のようにエラーとなります。

```
healthcare_data=# INSERT INTO sample_patient_info (age, heart_rate, blood_pressure)
VALUES
(120, 1200, 120.75);
ERROR:  numeric field overflow
DETAIL:  A field with precision 3, scale 0 must round to an absolute value less than 10^3.

```

一方で、位取りの桁数以上を指定した場合には、エラーとならずに数字が丸められます。

```
healthcare_data=# INSERT INTO sample_patient_info (age, heart_rate, blood_pressure)
VALUES
(120, 120, 120.759);
INSERT 0 1

healthcare_data=# select * from sample_patient_info;
 patient_id |       age        | heart_rate | blood_pressure
------------+------------------+------------+----------------
          1 |              120 |        120 |         120.76
(1 rows)

```

小数点の精度が問われないようなシステムであれば問題ないですが、例えば検査値など勝手に丸められると大事故になりかねません。

一般的なフロントエンド、バックエンド、DBのようなアプリケーション構成であれば画面部分でチェックすることも重要ですが、DBのマイグレーションや移行などでもこれらの観点は重要です。

この一端として、typemodについても意識する必要があると思います。

### 2.2 型修飾子の内部表現

せっかくのリリース連載なので、より内部的なデータや実装も眺めていきます。

前項までで登場している列ごとに定義した型修飾子の情報は、

PostgreSQLの`pg_attribute`テーブルの`atttypmod`カラム(int4, 32bit)などで管理されます。


このフィールドには、カラムごとの型修飾子の内部表現が整数として保存されています。このatttypmodを使って、カラムがどのような制約を持つかを確認できます。

サンプルデータのテーブルに確認すると、以下のようになっています。

```
healthcare_data=# SELECT attname, atttypid, atttypmod FROM pg_attribute WHERE attrelid = 'patient_records'::regclass;
   attname    | atttypid | atttypmod
--------------+----------+-----------
 tableoid     |       26 |        -1
 cmax         |       29 |        -1
 xmax         |       28 |        -1
 cmin         |       29 |        -1
 xmin         |       28 |        -1
 ctid         |       27 |        -1
 patient_id   |     1043 |        54
 blood_sugar  |     1700 |    327686
 test_results |     1231 |    327686
 address      |    16391 |        -1
(10 rows)

```

以下のようにしてto_regtypemodで取得した型修飾子と、同一の内部表現値ですね。
```
healthcare_data=# SELECT to_regtypemod('numeric(5,2)');
 to_regtypemod
---------------
        327686
(1 row)
```

ご覧の通り、typemodの表現には内部表現が用いられているので、よほどの職人でなければ目で見てどの型修飾子が付与されているのかの判定は難しいです。

この内部表現は、以下のようにformat_type関数を適応することで、値を内部表現から戻すことができます。


```
healthcare_data=# SELECT format_type(
         1700,
         327686
       )
;
 format_type
--------------
 numeric(5,2)
(1 row)

```


せっかくなので、format_type関数の内部実装までおって確認をしましょう。

format_typeについては、postgresリポジトリにおける以下のファイルで実装されています。

https://github.com/postgres/postgres/blob/master/src/backend/utils/adt/format_type.c#L390


```c
/*
 * Add typmod decoration to the basic type name
 */
static char *
printTypmod(const char *typname, int32 typmod, Oid typmodout)
{
	char	   *res;

	/* Shouldn't be called if typmod is -1 */
	Assert(typmod >= 0);

	if (typmodout == InvalidOid)
	{
		/* Default behavior: just print the integer typmod with parens */
		res = psprintf("%s(%d)", typname, (int) typmod);
	}
	else
	{
		/* Use the type-specific typmodout procedure */
		char	   *tmstr;

		tmstr = DatumGetCString(OidFunctionCall1(typmodout,
												 Int32GetDatum(typmod)));
		res = psprintf("%s%s", typname, tmstr);
	}

	return res;
}
```

上記は関連部分の抜粋ですが、

`typmodout`で指定されている関数を呼び出して、`typmod`からの文字列へ変換をしているようです。
この`typmodout`については、以下のように`pg_attribute`テーブルと`pg_type`テーブルを結合することで確認することができます。

今回は例として、atttypmod=327686のものを確認します。

```
healthcare_data=# WITH attribute_info AS (
  SELECT
    a.attname,
    a.atttypid,
    a.atttypmod,
    t.typname,
    t.typmodout -- pg_typeテーブルからtypmodout関数を取得
  FROM
    pg_attribute a
  JOIN
    pg_type t ON a.atttypid = t.oid
  WHERE
    a.attrelid = 'patient_records'::regclass
)
SELECT
  attname,
  atttypid,
  atttypmod,
  CASE
    WHEN atttypmod >= 0 THEN
      pg_catalog.format_type(atttypid, atttypmod) -- format_type関数でtypmodを表示
    ELSE
      'N/A' -- typmodがない場合は 'N/A' と表示
  END AS formatted_typemod,
  typmodout -- typmodout関数のOID
FROM
  attribute_info;
   attname    | atttypid | atttypmod |   formatted_typemod   |    typmodout
--------------+----------+-----------+-----------------------+------------------
 tableoid     |       26 |        -1 | N/A                   | -
 ctid         |       27 |        -1 | N/A                   | -
 xmin         |       28 |        -1 | N/A                   | -
 xmax         |       28 |        -1 | N/A                   | -
 cmin         |       29 |        -1 | N/A                   | -
 cmax         |       29 |        -1 | N/A                   | -
 patient_id   |     1043 |        54 | character varying(50) | varchartypmodout
 blood_sugar  |     1700 |    327686 | numeric(5,2)          | numerictypmodout
 test_results |     1231 |    327686 | numeric(5,2)[]        | numerictypmodout
 address      |    16391 |        -1 | N/A                   | -
(10 rows)

```


`typmodout`で指定されている関数のうち、確認対象としては`numerictypmodout`が呼び出される関数であることを確認できました。これは、以下の`numeric.c`で実装されています。

https://github.com/postgres/postgres/blob/master/src/backend/utils/adt/numeric.c#L1368

以下が関連箇所の抜粋です。

```c
Datum
numerictypmodout(PG_FUNCTION_ARGS)
{
	int32		typmod = PG_GETARG_INT32(0);
	char	   *res = (char *) palloc(64);

	if (is_valid_numeric_typmod(typmod))
		snprintf(res, 64, "(%d,%d)",
				 numeric_typmod_precision(typmod),
				 numeric_typmod_scale(typmod));
	else
		*res = '\0';

	PG_RETURN_CSTRING(res);
}
```

```c
/*
 * numeric_typmod_precision() -
 *
 *	Extract the precision from a numeric typmod --- see make_numeric_typmod().
 */
static inline int
numeric_typmod_precision(int32 typmod)
{
	return ((typmod - VARHDRSZ) >> 16) & 0xffff;
}

/*
 * numeric_typmod_scale() -
 *
 *	Extract the scale from a numeric typmod --- see make_numeric_typmod().
 *
 *	Note that the scale may be negative, so we must do sign extension when
 *	unpacking it.  We do this using the bit hack (x^1024)-1024, which sign
 *	extends an 11-bit two's complement number x.
 */
static inline int
numeric_typmod_scale(int32 typmod)
{
	return (((typmod - VARHDRSZ) & 0x7ff) ^ 1024) - 1024;
}
```

ようやく復元の処理にたどり着けましたね。VARHDRSZについては、データ全体のバイト数を表現しており、4バイトとなります。


まとめると、NUMERIC型と型修飾子で表現された`327686`とい
う値をbit表現に変換してヘッダーを引いた場合は、以下のようなイメージで復元をされます。


<img src="/images/2024/20241023b/image.png" alt="image.png" width="518" height="105" loading="lazy">

型修飾子と文字列の相互変換というものは、それぞれ対象としたい型ごとのビット表現を把握して実装する必要があるので、自作するのであればかなり手間になりそうということは伝わったのではないでしょうか？

`to_regtypemod`関数の追加より前では、実際にテーブルに追加して`pg_attribute`テーブルと`pg_type`から良い感じで取得すれば、文字列('numeric(5,2)'のようなもの)からの型修飾子の取得自体は可能です。

また、精度・位取り自体を取得したい場合にも正規表現などを工夫すれば不可能ではないです。

ですが、これらの作業はやりたいことのわりには手間がかかり、かつ不具合のリスクやアップデートへの対応力は高いとは言えないと思います。

これを文字列 -> `typemod`の形式に直接変換できるという意味で、`to_regtypemod`関数には大きな価値があると感じます。


## 3. 具体の活用事例を考える

`to_regtypemod`自体は文字列からtypemodを取得する関数であるため、外部システムやテストとのやりとりが最も活用される事例ではないかと思います。

実際にこの機能の追加の契機となっている、以下のメーリングリストでは、postgresの単体テストツールであるpgTAPでデータ型のアサーションが困難であったとのことで、機能のパッチを提案しています。

https://www.postgresql.org/message-id/DF2324CA-2673-4ABE-B382-26B5770B6AA3@justatheory.com


データベースのテスト実装などでもそうですし、あるいは他システムとのマイグレーションの事前検証(MySQL -> PostgreSQLとか)、スキーマ間の移行などにも役立つかもしれません。


## 4. まとめ

PostgreSQL 17で新規に追加された`to_regtypemod`関数では、文字列('numeric(5,2)'のようなもの)から型修飾子(typemod)を直接取得することができます。

従来の方法では、実際にデータベースに登録して`pg_attribute`テーブルと`pg_type`テーブルなどを組み合わせて取得するであったり、正規表現を工夫するなどの方法も考えられますが、いささか煩雑です。

医療や金融システムなど、型修飾子レベルで正確なデータ型管理が求められる分野で `to_regtypemod` を活用することで、データの整合性を高いレベルで維持しつつ、開発・運用の効率化を図ることができるのではないでしょうか？

## 参考文献
- https://pgpedia.info/t/to_regtypemod.html
- https://www.postgresql.jp/document/16/html/datatype-numeric.html
- https://github.com/postgres/postgres
- https://www.postgresql.org/message-id/DF2324CA-2673-4ABE-B382-26B5770B6AA3@justatheory.com

