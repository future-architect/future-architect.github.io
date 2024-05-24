---
title: "SQLのデータリネージツール、SQLLineageを試してみる"
date: 2021/09/28 00:00:00
postid: a
tag:
  - Python
  - データリネージュ
  - データガバナンス
  - SQL
category:
  - Programming
thumbnail: /images/20210928a/thumbnail.png
author: 真野隼記
lede: "TIG DXユニット真野です。Python連載の2本目です。データリネージという概念に興味をもったのと、それをサポートするためのPytnon製ツールがあったので触ってみます。データリネージとは.."
---
## はじめに

TIG DXユニット真野です。[Python連載](/articles/20210927b/)の2本目です。普段はPython触らないのですが、データリネージという概念に興味をもったのと、それをサポートするためのPytnon製ツールがあったので触ってみます。

## データリネージとは

<img src="/images/20210928a/データリネージ概念.png" alt="データリネージ概念.png" width="1200" height="503" loading="lazy">


DWHのようなデータ基盤を整える上で必要になってくる概念で、保持するデータの発生源や、どのシステムがどう加工して保存されたかと言った流れを追跡できるようにすることです。データのトレーサビリティとも言うかなと思います。追跡可能にすることで、異常データの追跡（要はどこのETL処理で考慮漏れがでたりバグっちゃったのか）や依存関係などを捉えることができます。何かしらの分析にそのデータを利用すべきかどうかの重要な材料になるのは間違いないでしょう。システム開発においての影響度調査などにも便利かもしれませんね。

以下のページなどが参考になるかと思います

* [データ ウェアハウス用のデータリネージ システム - Google Cloud](https://cloud.google.com/architecture/architecture-concept-data-lineage-systems-in-a-data-warehouse?hl=ja)
* [BigQuery 向けにデータリネージ システムを構築 - Google Cloud](https://cloud.google.com/blog/ja/products/data-analytics/architecting-a-data-lineage-system-for-bigquery)

メタデータ管理というとベンダーごとに規格が乱立しそうですがオープンリネージという取り組みもあるようです。

* https://github.com/OpenLineage/OpenLineage

ちなみに、リネージという単語を自分は聞き覚えがありませんでしたが、以下のような出自とか血統を指すようです。

> リネージは、始祖を含む成員の構成が具体的にたどれる出自集団（＝多くは父系か母系だが現在ではその両方あ るいは任意の親族集団）のことをさします。出自（しゅつじ）とは「自分はなになに一族、なになに家の出身だ」という、親族の出身の出所を示す用語です。
> https://www.cscd.osaka-u.ac.jp/user/rosaldo/121110lineage_clan.html

積極的に使っていこうと思います。


## データリネージの分類

データリネージを構成するシステムは、アクティブかパッシブかで分類できるそうです。

* **アクティブ**: データパイプライン側がソース情報と変換情報をリネージ側に明示的に提供
* **パッシブ**: SQLの実行ログを解析しリネージ情報を登録する。それによりデータリネージの更新呼び出しをパイプラインに追加するなどの手間を削減する。

またデータの追跡と言っても、粒度で複数のレベルが定義されています。

* エンティティ（テーブル）レベル
* 列レベル
* 行レベル

このうち最も簡易的だと思う（それでも実践的です）テーブルレベルのデータリネージを行えそうなSQLLineageを触ってみます。


## SQLLineage

SQLLineageはデータリネージの中でも、SQLに特化したツールです。

* https://github.com/reata/sqllineage

READMEにも記載されている通り、pipでインストールできます。

```sh
# インストール
$ pip install sqllineage
```

### サンプル実行

実行は簡単です。`-g`オプションでグラフ表示されます。

```sh
# サンプルの実行
$ sqllineage -g -e "insert into db1.table1 select * from db2.table2"
 * SQLLineage Running on http://localhost:5000/?e=insert+into+db1.table1+select+%2A+from+db2.table2
```

コンソールに出力されたURLを開くと、次のような `db2.table2` から `db1.table1` にデータが流れていることが表示されます。素敵そう！


<img src="/images/20210928a/sqllineageのサンプル実行結果.png" alt="sqllineageのサンプル実行結果.png" width="1200" height="367" loading="lazy">

### 内部結合SQL

次に内部結合したSQLでどうなるか試してみます。

```sql join.sql
INSERT INTO table1 (name, text)
  SELECT
   'test'       AS name,
    t3.text     AS text
  FROM
   table2 t2
  INNER JOIN table3 t3 ON t2.id = t3.id
```

`-f`オプションでファイルを指定できます。

```sh
$ sqllineage -g -f join.sql
* SQLLineage Running on http://localhost:5000/?f=join.sql
```

<img src="/images/20210928a/内部結合SQLのグラフ表示.png" alt="内部結合SQLのグラフ表示.png" width="1200" height="359" loading="lazy">

table2, table3がtable1の入力になっていることがわかります。

### JOINを用いない結合SQL

私が最初に触ったRDBはOracleだったので、せっかくなのでOracleのJOINを利用しないSQLを試してみます。

```sql oracle.sql
INSERT INTO destination (emp_id, dept_id, dept_name)
select
  a.emp_id,b.dept_id,b.dept_name
from
  emp a,dept b
where
  a.dept_id = b.dept_id
;
```

```sh
$ sqllineage -g -f oracle.sql
 * SQLLineage Running on http://localhost:5000/?f=oracle.sql
```

この記法でも認識してくれるようです。凄い。

<img src="/images/20210928a/Oracle記法の結合も表示されている図.png" alt="Oracle記法の結合も表示されている図.png" width="1200" height="517" loading="lazy">


sqllineageは内部的には[andialbrecht/sqlparse](https://github.com/andialbrecht/sqlparse)を利用しているので、対応具合はそちらを見るのが良さそうです。例えば、[Oracle 11gのPivot/Unpivot](https://github.com/andialbrecht/sqlparse/issues/311)は2021.09.28時点だとまだ対応して無さそうなのがわかります。


### 1処理で複数のSQLが登場する場合

ここで個人的に気になったのは、1つのETLで複数のSQLが呼ばれる、多段になっているケースです。これはREADMEをちゃんと読めばちゃんと書かれています。`;`区切りで複数のSQLを記載すれば良いとのこと。

例えば、あるプログラムで2つのSQLが呼ばれているとします。その場合はカンマ区切りでSQLログを集約すれば良いです。

```sql multiple.sql
INSERT INTO tbl3 (name, text)
  SELECT
   'test'       AS name,
    t1.text     AS text
  FROM
   tbl1 t1
  INNER JOIN tbl2 t2 ON t1.id = t2.id
;
INSERT INTO tbl5 (name, text)
  SELECT
   'test'       AS name,
    t3.text     AS text
  FROM
   tbl3 t3
  INNER JOIN tbl4 t4 ON t3.id = t4.id
;
```

これをsqllineageの入力とします。

```sh
>sqllineage -g -f multiple.sql
 * SQLLineage Running on http://localhost:5000/?f=multiple.sql
```

結果は次のように、`;`で区切られた複数のSQLのフローをまとめて表示してくれます。

<img src="/images/20210928a/複数SQLの表示結果.png" alt="複数SQLの表示結果.png" width="1200" height="517" loading="lazy">

解析したい単位でSQLをまとめると、分析部分はsqllineageに頼れるということです。良い棲み分けだなと感じました。


## SQL結果セットをアプリ側で読み込み、インサートする場合

Webアプリケーションだとよくありそうな処理方式ですが、この場合の解析はSQLLineageでは難しそうです（調べきれませんでした）。

おそらくSQLLineageのスコープ外だと思われるので、別のツール([Marquez](https://marquezproject.github.io/marquez/)など)の検討を考えたほうが良いかなと思います。


## 列（カラム）レベルのデータリネージ

今の所、sqllineageは列レベルのデータリネージサポートは行わない方針のようです。理由は全てのSQLシステムに対応したメタデータサービスが存在しないためだそうです。実際のDBサーバにアクセスしないポリシーに感じられます。どういうことかと言うと、 `select *` とされるとこのSQLクエリだけ見てもカラムレベルのトレースが無理になるからです。

* https://sqllineage.readthedocs.io/en/latest/behind_the_scene/dos_and_donts.html

`select *` には対応しないけど、ちゃんとSQLに項目を書く前提で、カラムレベルも将来のバージョンでは考えているようなことも記載されていました。期待したいですね。


## まとめ

データリネージのパッシブなデータ収集に、SQLログを解析するという手法があります。SQLLineageを用いると簡単に解析結果を確認・可視化できるためオススメです。

データ基盤といったプラットフォーム開発者以外にも、複雑なSQLの構造を可視化したい人にも使えるかと思います。

SQLユーザの皆様のお役にたてば幸いです。

