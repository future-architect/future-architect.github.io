---
title: "uroborosql-fmtにおける2WaySQLフォーマット (前編: フォーマット方法編)"
date: 2024/10/18 00:00:00
postid: a
tag:
  - VSCode
  - フォーマッター
  - コアテク
  - 2WaySQL
  - Rust
category:
  - Programming
thumbnail: /images/2024/20241018a/thumbnail.png
author: 川渕皓太
lede: "uroborosql-fmtにおいて2WaySQLのフォーマットに対応した方法を説明していきます。"
---
# はじめに

2024年4月入社の川渕皓太です。

先日、当社では新しいSQLフォーマッタである[uroborosql-fmt](https://github.com/future-architect/uroborosql-fmt)をリリースしました。このツールは当社が公開している[PostgreSQL向けのSQLコーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html)に基づいてSQLをフォーマットするものです。

uroborosql-fmtの基本的な情報は以下の記事を参照してください。

- [新しいSQLフォーマッターであるuroboroSQL-fmtをリリースしました | フューチャー技術ブログ](/articles/20231120a/)

uroborosql-fmtは[uroborosql](https://future-architect.github.io/uroborosql-doc/)、[go-twowaysql](/articles/20210803a/)、[doma](https://doma.readthedocs.io/en/latest/)といった[2WaySQL](https://future-architect.github.io/uroborosql-doc/background/)に対応しています。

2WaySQLとはそのまま実行することもでき、アプリケーションで読み込んでバインドパラメータの指定などをして実行することも出来ます。このように2つの実行方法があることから2WaySQLと呼ばれます

```sql  分岐とバインドパラメータを含む2WaySQLの例 (uroborosql)
select
	*
from
	employee	emp
/*BEGIN*/
where
	emp.first_name	=	/*first_name*/'Bob'
/*IF SF.isNotEmpty(first_name)*/
and	emp.first_name	=	/*first_name*/'Bob'
/*END*/
/*IF SF.isNotEmpty(last_name)*/
and	emp.last_name	=	/*last_name*/'Smith'
/*END*/
/*END*/
;
```

本記事ではuroborosql-fmtにおいて2WaySQLのフォーマットに対応した方法を説明していきます。

# uroborosql-fmtのフォーマット方法概要

<img src="/images/2024/20241018a/process_flow.png" alt="process_flow.png" width="1200" height="286" loading="lazy">

1. [tree-sitter-sql](https://github.com/future-architect/tree-sitter-sql)で入力SQLをパースしてCSTを取得
1. 取得したCSTを解析して独自の木構造の構造体に変換
1. 変換した構造体から整形したSQLを生成して出力

# 課題点

<!--
2WaySQLとはそのまま実行することもでき、アプリケーションでパラメータを可変にしても実行できるSQLのことです。
-->

2WaySQLでは以下のように、特別なSQLコメントを使用してバインドパラメータや条件の指定ができます。

```sql  2WaySQLの例 (uroborosql)
select
	*
from
	employee	emp
where
/*IF SF.isNotEmpty(birth_date_from) and SF.isNotEmpty(birth_date_to)*/
	emp.birth_date	between	/*birth_date_from*/'1990-01-01'	and	/*birth_date_to*/'1999-12-31'
/*ELSE*/
	emp.birth_date	<	/*birth_date_to*/'1999-12-31'
/*END*/
;
```

このようなSQLは2WaySQLとしては正しいですが、通常のSQL構文としては不正（where句の内部の`and`が不足）であり、通常のSQLパーサではパースすることができません。そのため、先述した方法ではフォーマットが行えません。

解決方法として主に以下の二つが考えられます。

1. 入力SQLのIF文を解析して複数のSQLを生成し、それらのSQLをフォーマット後にマージする
2. 2WaySQLに対応したパーサを作成する

2WaySQLのIF文はどこに記述しても不正とはならず、文法ファイルが複雑になると考えたため、今回は**方法1の「入力SQLのIF文を解析して複数のSQLを生成し、それらのSQLをフォーマット後にマージする」** 案を採用しました。

# 2WaySQLをフォーマットする方法概要

<img src="/images/2024/20241018a/2way_sql.png" alt="2way_sql.png" width="1200" height="277" loading="lazy">

1. 入力SQLのIF文等の分岐を解析して生成されうるSQLを分岐網羅的に生成
1. 生成したすべてのSQLをフォーマット
1. フォーマット後のすべてのSQLをマージして出力

# 2WaySQLのフォーマット方法詳細

具体例として以下のようなSQLをフォーマットする場合を考えます。

```sql  入力2WaySQL
select
/*IF hoge*/
aaa
/*IF huga*/
,bbb
/*ELIF foo*/
,ccc
/*END*/
/*ELSE*/
ddd
/*END*/
from table1
```

## 1. 生成されうるSQLを分岐網羅的に生成

SQLを1行目から順にたどっていき、IF分岐を解析して以下のような木構造を作成します。

木構造を作成する際、ソースコード上で出現が早いほど左の子になるよう作成します。

この木構造の葉は生成されうるSQLを示しています。葉は分岐網羅を満たすように生成します。

<img src="/images/2024/20241018a/2WaySQL_for_blog.png" alt="2WaySQL_for_blog.png" width="660" height="777" loading="lazy">

## 2. 生成されたSQLのフォーマット

次に生成された木構造の葉をすべてフォーマットします。

単純なSQLのフォーマット方法は[こちらの記事](/articles/20220916c/)で詳細に説明しているため割愛します。

<img src="/images/2024/20241018a/2WaySQL_for_blog-フォーマット後.drawio_(1).png" alt="2WaySQL_for_blog-フォーマット後.drawio_(1).png" width="640" height="435" loading="lazy">

## 3. フォーマット後のSQLをマージ

木の深いところから順にマージしていき、最終的に木構造の根が全体の最終フォーマット結果になるようにします。

<img src="/images/2024/20241018a/2WaySQL_for_blog-マージ1.drawio.png" alt="2WaySQL_for_blog-マージ1.drawio.png" width="515" height="435" loading="lazy">

マージは以下の処理を行うことで実現します。

```txt
2つのSQLの各行を比較
    [一致する場合]
    1. 現在の行を描画
    2. continue

    [一致しない場合]
    1. 左の子から順に/*END*/の1行前まで描画
    2. /*END*/を描画
    3. continue
```

具体的に以下のマージを説明していきます。

<img src="/images/2024/20241018a/2WaySQL_for_blog-マージ2.drawio.png" alt="2WaySQL_for_blog-マージ2.drawio.png" width="287" height="315" loading="lazy">

1. 3行目まで一致するのでそのまま描画

    ```sql
    select
    /*IF hoge*/
    	aaa
    ```

2. 4行目は一致しない（左: `/*IF huga*/`、右: `/*ELIF foo*/`）ので、まず左の子から6行目の`/*END*/`の1行前まで描画

    ```sql
    select
    /*IF hoge*/
    	aaa
    /*IF huga*/
    ,	bbb
    ```

3. 右の子の6行目の`/*END*/`の1行前まで描画

    ```sql
    select
    /*IF hoge*/
    	aaa
    /*IF huga*/
    ,	bbb
    /*ELIF foo*/
    ,	ccc
    ```

4. `/*END*/`を描画

    ```sql
    select
    /*IF hoge*/
    	aaa
    /*IF huga*/
    ,	bbb
    /*ELIF foo*/
    ,	ccc
    /*END*/
    ```

5. 行の比較を再開。これ以降はすべて一致するのでそのまま描画
    ```sql
    select
    /*IF hoge*/
    	aaa
    /*IF huga*/
    ,	bbb
    /*ELIF foo*/
    ,	ccc
    /*END*/
    /*END*/
    from
    	table1
    ```

これで①のマージ処理が完了しました。

同様のマージ処理を②においても実行することで、最終的に以下のようなフォーマット結果が得られます。

```sql  最終的なフォーマット結果
select
/*IF hoge*/
	aaa
/*IF huga*/
,	bbb
/*ELIF foo*/
,	ccc
/*END*/
/*ELSE*/
	ddd
/*END*/
from
	table1
```

# さいごに

当社が作成したSQLフォーマッタであるuroborosql-fmtにおける2WaySQLのフォーマット方法を説明しました。

uroborosql-fmtは元のSQLを壊していないか検証するロジックを組み込んでいますが、万が一元のSQLが変更されている等の不具合があれば[issue](https://github.com/future-architect/uroborosql-fmt/issues)に起票してくださると幸いです。

元のSQLを壊していないか検証するロジックについては以下の記事で紹介していますので是非ご覧ください。

- [uroborosql-fmtにおける2WaySQLフォーマット (後編: 結果検証編)](/articles/20241021a/)

# 関連記事

- [新しいSQLフォーマッターであるuroboroSQL-fmtをリリースしました | フューチャー技術ブログ](/articles/20231120a/)
- [Engineer Camp2022 RustでSQLフォーマッタ作成（前編） | フューチャー技術ブログ](/articles/20220916b/)
- [Engineer Camp2022 RustでSQLフォーマッタ作成（後編） | フューチャー技術ブログ](/articles/20220916c/)
- [Language Server Protocolを用いたVSCode拡張機能開発 (前編) | フューチャー技術ブログ](/articles/20221124a/)
- [Language Server Protocolを用いたVSCode拡張機能開発 (後編) | フューチャー技術ブログ](/articles/20221125a/)
- [Rust製SQLフォーマッタをnapi-rsを利用してVSCode拡張機能化 | フューチャー技術ブログ](/articles/20221228a/)
- [C/C++を呼び出しているRustのWASM化 | フューチャー技術ブログ](/articles/20230605a/)
