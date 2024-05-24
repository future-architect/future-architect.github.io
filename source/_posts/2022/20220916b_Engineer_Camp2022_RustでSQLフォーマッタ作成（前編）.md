---
title: "Engineer Camp2022 RustでSQLフォーマッタ作成（前編）"
date: 2022/09/16 00:00:01
postid: b
tag:
  - SQL
  - インターン
  - インターン2022
  - フォーマッター
  - Rust
category:
  - Culture
thumbnail: /images/20220916b/thumbnail.gif
author: 川渕皓太
lede: "みなさん、こんにちは！Future Engineer Camp 2022に参加した川渕と齋藤です。今回のインターンではSQLフォーマッタをRustで作成しました。私達が取り組んだ内容を紹介します。SQLフォーマッタとはSQLを統一された体裁にフォーマットしてくれるツールです。体裁を統一することで他人が見ても読みやすいコードになり、生産性が向上します。"
---
# はじめに
みなさん、こんにちは！
Future Engineer Camp 2022に参加した川渕と齋藤です。
今回のインターンではSQLフォーマッタをRustで作成しました。私達が取り組んだ内容を紹介します。

# SQLフォーマッタとは
SQLフォーマッタとはSQLを統一された体裁にフォーマットしてくれるツールです。体裁を統一することで他人が見ても読みやすいコードになり、生産性が向上します。
<img src="/images/20220916b/demo1.gif" alt="" width="1200" height="675" loading="lazy">


以下の図のように、インデントなどが揃って読みやすくなっていることがわかります。

<img src="/images/20220916b/demo_indent.png" alt="" width="635" height="420" loading="lazy">

# 背景

フューチャーではすでにSQLフォーマッタを開発、利用しています。([記事](/articles/20170228/))
しかし、そのフォーマッタには以下の2点の問題点があります。

1. 厳密な構文解析を行わずにトークンベースで処理を行っているため、難しい処理がある（例: 括弧の処理、エイリアスの補完など）
1. Pythonで書かれているためVSCodeの拡張機能で動かすことが困難である

そこで、2020年のインターンシップにおいて、構文解析を利用したTypeScript製フォーマッタを作成しました([記事](/articles/20200919/))。
しかし、このフォーマッタは実行速度が非常に遅く、実用的ではありませんでした。遅くなっていた理由は、このフォーマッタはANTLRを用いて構文解析を行っており、ANTLRのSQLパーサとTypeScriptの相性が悪く、実行速度が遅かったためでした。


# 目的
今回のインターンシップの目標は2020年のインターンシップのリベンジとして、構文解析を用いた高速で動作するSQLフォーマッタを作成することでした。フォーマットしたSQLコードは[フューチャー株式会社が提供するSQLのコーディング規約](/coding-standards/documents/forSQL/)に従ったコードになっています。

# 作成したフォーマッタの処理の流れ

今回作成したフォーマッタの処理の流れを以下に示します。フォーマッタは、構文解析部分とフォーマット処理部分の2つに分かれています。まず、対象となるソースファイルに構文解析を行い、構文木(CST)を構築します。そして、構文木に基づいてフォーマット処理を行い、SQLを整形しています。

<img src="/images/20220916b/stream.png" alt="stream.png" width="960" height="228" loading="lazy">

構文解析を行う部分は上述した[tree-sitter-sql](https://github.com/m-novikov/tree-sitter-sql)を使用し、フォーマット処理を行う部分は0から実装を行いました。
実装の詳細は後編で述べます。



# 機能紹介

インターン中に作成したフォーマッタの機能を紹介します。

### インデント揃え
このように、行の初めのインデントを揃えます。
```sql indent.sql
SELECT
	ID
FROM
	STUDENT STD
WHERE
	STD.ID		=	1
AND	STD.SPORTID	=	(
		SELECT
			ID
		FROM
			SPORT
		WHERE
			SPORT.NAME	=	'BASEBALL'
	)

```

### 縦揃え

このように、`AS`の位置や行末に現れるコメントが、各ブロックで縦揃えされます！

```sql align.sql
SELECT
    STD.ID      AS  STD_ID      -- 学籍番号
,   STD.NAME    AS  STD_NAME    -- 氏名
FROM
    STUDENT STD -- 学生
```

### エイリアス補完
[フューチャー株式会社が提供するSQLのコーディング規約](/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88Oracle%EF%BC%89.html#exists-%E5%8F%A5)ではエイリアスについて以下のように定められています。

> AS句
> トップレベルの SELECT 句には必ずAS句を記載し別名を付ける。
> 同一の名前であってもAS句を付与する。
> また、「AS」は省略可能であるが、省略はしないこと。

これに従って、SELECT句のカラムにはエイリアスを自動で付与し、「AS」がない場合は追加します。FROM句のエイリアスのASはPostgreSQL限定構文のため自動的に取り除きます。

before
```sql before.sql
SELECT
STD.ID STD_ID -- 学籍番号
,STD.GRADE  -- 成績
FROM
STUDENT AS STD -- 学生
```

after
```sql after.sql
SELECT
	STD.ID		AS	STD_ID	-- 学籍番号
,	STD.GRADE	AS	GRADE	-- 成績
FROM
    STUDENT STD -- 学生
```

以下のような疑問も私達のフォーマッタを使うことで解消されます！

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">SQLのSELECT句で別名にしたいときにas省力することで不備でることあるんでしたっけという疑問</p>&mdash; Junki Mano (@ma91n) <a href="https://twitter.com/ma91n/status/1570042335920287744?ref_src=twsrc%5Etfw">September 14, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">PostgreSQLの場合は、キーワードと一致しなければ問題ないと（Stackoverflow日本語版とかあるの感謝！）<a href="https://t.co/YcxA5moYQC">https://t.co/YcxA5moYQC</a></p>&mdash; Junki Mano (@ma91n) <a href="https://twitter.com/ma91n/status/1570043025556123655?ref_src=twsrc%5Etfw">September 14, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">フューチャーSQL規約だとasの省略ダメだった<a href="https://t.co/WuTcLmeGAB">https://t.co/WuTcLmeGAB</a></p>&mdash; Junki Mano (@ma91n) <a href="https://twitter.com/ma91n/status/1570043822742319106?ref_src=twsrc%5Etfw">September 14, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


### 冗長な括弧の除去

余分な括弧がある場合は自動的に取り除きます。

before
```sql before
SELECT A
from tb
WHERE
test0 = 0
or
(test1 = 1 and
(test2 = 2 and test3 = 3)
or (((test4 = 4 or test5 = 5))))
```

after
```sql after
SELECT
	A
FROM
	TB
WHERE
	TEST0	=	0
OR	(
		TEST1	=	1
	AND	(
			TEST2	=	2
		AND	TEST3	=	3
		)
	OR	(
			TEST4	=	4
		OR	TEST5	=	5
		)
	)

```
# 今後の課題
### 1. 利用しやすさの向上
現状はCLI上でしか動作しませんが、今後はVSCodeの拡張機能化、Web上で動作できるようにWebAssembly化をしたいと考えています。

### 2. 機能面の向上
現状は基本的なSQLの構文にしか対応していませんが、今後はその他の構文へも対応したいと考えています。

# インターンで苦労した点


特に苦労したのは、Rust言語で実装した点です。インターン開始時点では2人ともRust未経験だったため、実装では所有権などでコンパイルエラーになることも多くありました。ですが、先輩社員の方々のアドバイス等もあり、なんとかインターン期間内に実装することができました。

また、最初はRust言語だけでなくSQLについてもあまり詳しくなかったため、先を見通した設計ができておらず、機能の拡張に詰まっていました。そこで、2人で相談しながら設計を見直すことで、再設計から3日(!)で目標のSQLをフォーマットできるフォーマッタが完成しました。

# まとめ

今回、私たちはRust言語を用いてSQLフォーマッタを作成しました。現状では実用的なレベルとは言えませんが、実際に動作するフォーマッタを開発できたことは貴重な経験でした。今後は実用的なレベルのフォーマッタへの改良を行っていきたいと考えています。

前編では私たちが取り組んだ内容についてざっくりと説明していきました。[後編](/articles/20220916c/)ではフォーマッタ部分の実装についてより詳しく説明するので、ぜひそちらもご覧ください！

