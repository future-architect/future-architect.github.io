---
title: "SQL開発者を幸せにする！？ Sublime Text 3でも使える uroboroSQL Formatter を公開しました"
date: 2017-02-28 12:00:00
postid: ""
tag:
  - SQL
  - uroboroSQL
  - コーディング規約
  - フォーマッター
category:
  - DB
thumbnail: /images/2017/20170227/thumbnail_20170227.png
author: 太田洋介
lede: "弊社謹製のSQLフォーマッターuroboroSQL formatterを公開しましたので、その紹介をさせていただきます。"
---


# はじめに

はじめまして、太田です。
今回、弊社謹製のSQLフォーマッター[**uroboroSQL formatter**](https://github.com/future-architect/uroboroSQL-formatter)を公開しましたので、その紹介をさせていただきます。
また、[弊社、星が昨年投稿した記事](/articles/20160902/)の中で[Javaのコーディング規約](/coding-standards/documents/forJava/Javaコーディング規約.html)を公開しましたが、今回その第2弾として、[SQLのコーディング規約（Oracle限定）](/coding-standards/documents/forSQL/SQLコーディング規約（Oracle）.html)も公開いたしましたので、こちらについても触れたいと思います。

<a href="https://github.com/future-architect/uroboroSQL-formatter">
<img src="/images/2017/20170227/photo_20170227_01.png" class="img-middle-size"  loading="lazy">
</a>

# 作成経緯

みなさんはどのようなSQLフォーマッターを利用されていますか？　色々あって悩みますよね。
中には、「実はSQLフォーマッターを使っていない」とか、「SQLフォーマッターを使っていても最終的には手で修正する」という開発フローをとっているチームも少なからず存在するのでは無いでしょうか？
というか弊社の開発チームは主に上記の2つです（でした）。

理由を簡単に言ってしまえば、「コーディング規約に合わない」からです。
「カンマ」や「AND・OR」を、「前にする or 後ろにする」「大文字にする or 小文字にする」などいろいろありますが、
一番困ったのは「コメントの扱い」です。自分調べですが、コメントが含まれると途端にフォーマットが崩れるフォーマッターが多い印象です。

コーディング規約としてコメントを書くことを強制しているというのもありますが、
弊社では[Doma2](http://doma.readthedocs.io/ja/stable/)のような2WaySQLテンプレートエンジンを利用していることもあり、
コメントがあることを前提にフォーマットしてほしいという要望がありました。

このため、弊社では~~興味本位で~~SQLフォーマッターを作成することになりました。

# **uroboroSQL formatter**利用方法

## SublimeTextプラグイン

SublimeText3のプラグインとして利用できます。

<img src="/images/2017/20170227/photo_20170227_02.png" loading="lazy">

導入は、
`Package Control`の`Install Package`から
**uroboroSQL Formatter**を検索しInstallを行ってください。

メニューバー→`Edit`→`SQL Format`で利用できます。

設定は下記のGitHubリポジトリのREADMEをご覧ください。

[Sublime-uroboroSQL-formatter](https://github.com/future-architect/Sublime-uroboroSQL-formatter)
[日本語Readme](https://github.com/future-architect/Sublime-uroboroSQL-formatter/blob/master/Readme.ja.md)

## コマンドライン実行

SQLファイルを指定してコマンドラインから実行できるツールも用意しています。
導入方法は下記のGitHubリポジトリのREADMEをご覧ください。

[uroboroSQL-formatter#exeファイルの実行](https://github.com/future-architect/uroboroSQL-formatter#exeファイルの実行)
[Latest release](https://github.com/future-architect/uroboroSQL-formatter/releases/latest)

# **uroboroSQL formatter**特徴

このSQLフォーマッターには以下のような特徴があります。

* Doma2とuroboroSQL(※)の2Way SQLに対応したフォーマット
* AS句のインデント揃え
* テーブル・カラム・条件式の行コメントのインデント揃え

※[uroboroSQL](https://github.com/future-architect/uroborosql)は2月末ごろOSS公開予定のSQL実行エンジンです。
SublimeText3のプラグインをDoma2で利用される場合は下記のように設定してください。

```json
{
    "uf_comment_syntax": "doma2", // "uroboroSQL" or "doma2"
}
```

## 参考：SQLのフォーマット例

### 1. プレーンなSELECT-SQLの例

* フォーマット前

    ```sql
    select
     name as name-- 都道府県名
    ,prefectural_capital as capital -- 県庁所在地
    from
     prefectures -- 都道府県
    where
     local_division_id = 3 -- 関東地方
    and name like '%東%' -- 都道府県名に"東"を含む
    ```

* [SQL Developer](http://www.oracle.com/technetwork/jp/developer-tools/sql-developer/downloads/index.html)によるフォーマット

    ```sql
    SELECT name AS name-- 都道府県名
      ,
      prefectural_capital AS capital -- 県庁所在地
    FROM prefectures                 -- 都道府県
    WHERE local_division_id = 3      -- 関東地方
    AND name LIKE '%東%'              -- 都道府県名に"東"を含む
    ```

* [A5:SQL Mk-2](http://a5m2.mmatsubara.com/)によるフォーマット

    ```sql
    select
      name as name                                    -- 都道府県名
      , prefectural_capital as capital                -- 県庁所在地
    from
      prefectures                                     -- 都道府県
    where
      local_division_id = 3                           -- 関東地方
      and name like '%東%'                            -- 都道府県名に"東"を含む
    ```

* **uroboroSQL formatter**によるフォーマット

    ```sql
    SELECT
        NAME                AS  NAME    -- 都道府県名
    ,   PREFECTURAL_CAPITAL AS  CAPITAL -- 県庁所在地
    FROM
        PREFECTURES -- 都道府県
    WHERE
        LOCAL_DIVISION_ID   =       3       -- 関東地方
    AND NAME                LIKE    '%東%' -- 都道府県名に"東"を含む
    ```

<br>

### 2. Domaライクな2Way SQLの例

* フォーマット前(SQLテンプレート)

    ```sql
    select *
    from emp
    where emp_id = /*empId*/123
    ```

* [SQL Developer](http://www.oracle.com/technetwork/jp/developer-tools/sql-developer/downloads/index.html)によるフォーマット

    ```sql
    SELECT * FROM emp WHERE emp_id = /*empId*/
      123
    ```

    崩れます。
    （[beta版](http://a5m2.mmatsubara.com/beta/)のSQL整形機能で2WeySQLの対応がされ、崩れは起こらなくなりました。詳しくは[追記](#2017-3-6追記)を参照ください）

* [A5:SQL Mk-2](http://a5m2.mmatsubara.com/)によるフォーマット

    ```sql
    select
      *
    from
      emp
    where
      emp_id = /*empId*/
      123
    ```

    崩れます。

* **uroboroSQL formatter**によるフォーマット

    ```sql
    SELECT
        *
    FROM
        EMP
    WHERE
        EMP_ID  =   /*empId*/123
    ```

    崩れません！

※[SQL Developer](http://www.oracle.com/technetwork/jp/developer-tools/sql-developer/downloads/index.html)も[A5:SQL Mk-2](http://a5m2.mmatsubara.com/)を機能不十分と言っているわけではありません。どちらも最高にクールで便利なツールです。どちらも大変お世話になっております。みなさんにとっても扱いやすく馴染みあるSQLフォーマット機能を持つツールかと思い、例として書かせていただいております。

# 弊社SQLコーディング規約について

弊社には独自のSQLのコーディング規約が存在し、長年受け継がれメンテナンスを続けています。
今回、このSQLコーディング規約を公開させていただくことになりました。

[SQLコーディング規約（Oracle）](/coding-standards/documents/forSQL/SQLコーディング規約（Oracle）.html)

**uroboroSQL formatter**もこの規約に準拠するよう作成しています。

本記事で、少しだけ紹介したいと思います。

## 論理名のコメント

テーブル及び、カラムには論理名（日本語）でコメントを書くという規約があります。
カラムやテーブル名書いた上にまた日本語で同じことコメントで書かせるのは無駄では？ と思われるでしょうが必要なことであると考えます。

Oracleの識別子の名前は30バイト以内という制限があります。
（[MySQLも64バイト以内](https://dev.mysql.com/doc/refman/5.6/ja/identifiers.html)、[PostgreSQLにもデフォルト63バイト以内](http://www.postgresql.jp/document/9.5/html/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)という制限があるようですね）

この制限の中で、膨大にある全てのテーブル名・カラム名で、確実に意味の伝わる識別子名を考えるのは至難の業です。
であれば、略語を考えるための規約を決めて運用するのが手っ取り早いです（わたしは出会ったことはありませんがテーブル名をTBL001-TBL100のように連番定義していくなんて話も聞いたことがあります）

仮にテーブル名を連番定義していく運用を行った場合には、コメントなしで作成されたSQLは読めたものではありません。もし新規参画した方であれば恐怖でしかないでしょう。
1テーブル参照のみのSQLであればテーブルのコメントを確認し、かろうじて解読できるかもしれませんが、サブクエリが現れた場合はどうでしょうか。いっそ匙を投げたくなるのではないでしょうか。
このため可読性を考慮し、論理名をコメントで書いてもらう必要があると考えています。

### **uroboroSQL formatter**の対応

uroboroSQL formatterはテーブル・カラム・条件式に書いた行コメントのインデントを揃えます。

* フォーマット前

    ```sql
    SELECT
     ID AS DATA_ID -- ID
    , CODE AS DATA_CODE -- コード
    , NAME AS DATA_NAME -- 名称
    , VALUE1 AS VAL1 -- 値１
    , VALUE2 AS VAL2 -- 値２
    , VALUE3 AS VAL3 -- 値３
    , VALUE4 AS VAL4 -- 値４
    , VALUE5 AS VAL5 -- 値５
    FROM
     TABLE01
    ```

* フォーマット後

    ```sql
    SELECT
        ID      AS  DATA_ID     -- ID
    ,   CODE    AS  DATA_CODE   -- コード
    ,   NAME    AS  DATA_NAME   -- 名称
    ,   VALUE1  AS  VAL1        -- 値１
    ,   VALUE2  AS  VAL2        -- 値２
    ,   VALUE3  AS  VAL3        -- 値３
    ,   VALUE4  AS  VAL4        -- 値４
    ,   VALUE5  AS  VAL5        -- 値５
    FROM
        TABLE01
    ```

## カンマ、AND・ORを前に配置

これに関しては賛否両論あると思います。個人的にはどちらでも構わないのですが、統一されていないことは悪でしょう。
なぜなら統一されていない場合には、リファクタリングでカラム順序や条件順序を入れ替えただけで苦しめられる可能性が高くなります。

今回"前"とした理由としては、リファクタリング等行う場合、後ろの方が入れ替えや追加が発生しやすいと考えるからです。

どういうことかと言いますと、SELECTを書く際、多くの場合、下記のようにKEYやメインの項目から記述すると考えています。下記の場合`ID`はリファクタリングや機能追加で動くことがほぼ無いので、カンマ配置の影響を受けません。

```sql
SELECT
    ID      -- ID
,   CODE    -- コード
,   NAME    -- 名称
,   VALUE1  -- 値１
,   VALUE2  -- 値２
,   VALUE3  -- 値３
,   VALUE4  -- 値４
--, VALUE5  -- 値５ ←追加が容易
FROM
    HOGE
```

後ろカンマの場合、`VALUE4`の次にカラムを追加しようとした際に`VALUE4`の行にカンマを追加しなければいけませんし、`VALUE4`自体の順序を変える場合もカンマを編集しなければいけません。

```sql
SELECT
    ID      , -- ID
    CODE    , -- コード
    NAME    , -- 名称
    VALUE1  , -- 値１
    VALUE2  , -- 値２
    VALUE3  , -- 値３
    VALUE4    -- 値４
--  VALUE5    -- 値５ ←追加したらVALUE4の後ろにカンマを書かないといけない
FROM
    HOGE
```

以上を考慮し、カンマの配置は"前"としています。

### カンマ位置はフォーマッターで編集するなら気にしなくていいのでは？

その通りです。通常は。
しかし今回の規約ではカンマの前か後ろに"行コメント"が立ちはだかっているのです。

コメントがある場合、後カンマで、前カンマのフォーマットをしてしまうと、下記のようになってしまいます。

* フォーマット前

    ```sql
    SELECT
        ID      , -- ID
        CODE      -- コード
    FROM
        HOGE
    ```

* フォーマット後（例）

    ```sql
    SELECT
      ID
      ,            -- ID
      CODE         -- コード
    FROM
      HOGE
    ```

とても残念な結果になりますね。
というのはフリです、ごめんなさい。今回作成した**uroboroSQL formatter**はカンマ・コメント入れ替えにも対応しています。
気にする必要はありません！

* フォーマット後（**uroboroSQL formatter**）

    ```sql
    SELECT
        ID      -- ID
    ,   CODE    -- コード
    FROM
        HOGE
    ```

# 今後

## [**uroboroSQL formatter**](https://github.com/future-architect/uroboroSQL-formatter)

現在、uroboroSQL formatterは前カンマやTab幅4によるインデントが固定であり、メインの機能としてもまだまだ足りませんし、提供方法もSublimeText3のプラグインのみとなってしまいました。
オプション対応、Eclipseプラグインや、ブラウザでのフォーマット機能などが追加したい機能や、改善したいことはたくさんあります。
今後もご期待ください。

## [SQLコーディング規約](/coding-standards/documents/forSQL/SQLコーディング規約（Oracle）.html)

今回、SQLのコーディング規約の公開もOracle版だけとなってしまいましたが、PostgreSQL・MySQL対応版も作成中です。
これらも近いうちに公開したいと考えています。

また今回のコーディング規約も、どんどん改善していきたいと思っていますので、
是非ともPullRequestいただければと思います。お待ちしております（Markdown書くだけです！）

---

# 追記

## 2017/3/6追記

本記事の公開に[A5:SQL Mk-2](http://a5m2.mmatsubara.com/)の作者の方に反応いただきまして、[beta版](http://a5m2.mmatsubara.com/beta/)のSQL整形機能にて以下の対応が行われました。

* よくある 2Way-SQLツールのコメント対応
* カンマやAND, OR の位置を式の前・後ろに移動するとき、行コメントとの位置関係を修正して整形

2WaySQLでのフォーマット崩れの問題、および「カンマ」や「AND・OR」の前後位置と行コメントの整合性の問題は
[A5:SQL Mk-2](http://a5m2.mmatsubara.com/)のSQL整形機能(2017/3/6現在beta版)でも解決できます！
（しかもこちらはカンマ・AND・ORの前後配置の設定などいろいろできます。我々も頑張らないといけませんね）

本記事では[A5:SQL Mk-2](http://a5m2.mmatsubara.com/)の機能についてSQL整形についてのみしか触れていませんが、
DB接続機能など様々な機能が豊富にそろっていますので、もし利用されたことのない方は是非一度お試しください！

---
参考
http://hidekatsu-izuno.hatenablog.com/entry/2015/12/07/233618
