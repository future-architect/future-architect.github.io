---
title: "tree-sitter文法入門"
date: 2022/12/15 00:00:00
postid: a
tag:
  - tree-sitter
  - SQL
  - 構文解析
  - フォーマッター
category:
  - Infrastructure
thumbnail: /images/20221215a/thumbnail.png
author: 齋藤俊哉
lede: "フューチャーでアルバイトをしている齋藤ですインターン中に作成していたSQLフォーマッタをPostgreSQLの構文に対応させる作業に取り組んでいます。"
---

<img src="/images/20221215a/tree-sitter-small.png" alt="" width="400" height="400">

こちらは[PostgreSQL Advent Calendar 2022](https://qiita.com/advent-calendar/2022/postgresql) カレンダー2枚目・15日目の投稿となります。
前回は、[@hmatsu47](https://qiita.com/hmatsu47)さんの[Supabase で TCE（透過的列暗号化）を軽く試してみた](https://qiita.com/hmatsu47/items/8de48e81a660eabe4bf0)でした。

# はじめに

こんにちは、フューチャーでアルバイトをしている齋藤です。以前は同社のインターンでSQLフォーマッタを作成していました([記事](/articles/20220916b/))。現在はインターン中に作成していたSQLフォーマッタをPostgreSQLの構文に対応させる作業に取り組んでいます。

このフォーマッタではSQLパーサにtree-sitter-sqlを利用していますが、対応していない構文がいくつか存在します。本記事では、未対応の構文であるBETWEEN述語を例に、tree-sitterの構文拡張の手順を紹介します。開発中のSQLフォーマッタはOSS公開予定ですので、ぜひ仲間を増やしたいという思いから記事にしました。

また、現在作成中のフォーマッタのVSCode拡張機能化にも取り組んでいます。ぜひそちらも併せてご覧ください！

VSCode拡張機能化に関する記事:
1. [Language Server Protocolを用いたVSCode拡張機能開発 \(前編\) \| フューチャー技術ブログ](/articles/20221124a/)
2. [Language Server Protocolを用いたVSCode拡張機能開発 \(後編\) \| フューチャー技術ブログ](/articles/20221125a/)

# アウトライン

本記事のアウトラインは以下の通りです。

1. tree-sitter、tree-sitter-sqlについて
2. tree-sitterの構文拡張用の環境構築
3. 構文木を出力するプログラムの実装
4. 構文についての説明
5. BETWEEN述語の規則を追加

# tree-sitter

[tree-sitter](https://tree-sitter.github.io/tree-sitter/)は文法からパーサ(構文解析器)を自動生成するパーサジェネレータツールであり、生成されたパーサで構文解析を行うライブラリでもあります。特徴として、一般的なパーサライブラリでは抽象構文木(AST)を構築するのに対し、tree-sitterで生成されたパーサは具象構文木(CST)を構築するという点があげられます。CSTについては[インターンの記事](/articles/20220916c/#:~:text=AST%E3%81%8C%E6%84%8F%E5%91%B3%E3%81%AE%E3%81%AA%E3%81%84%E6%83%85%E5%A0%B1(%E4%BE%8B%3A%20%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%82%84%E5%A4%9A%E9%87%8D%E6%8B%AC%E5%BC%A7%E3%81%AA%E3%81%A9)%E3%82%92%E4%BF%9D%E6%8C%81%E3%81%97%E3%81%AA%E3%81%84%E3%81%AE%E3%81%AB%E5%AF%BE%E3%81%97%E3%81%A6%E3%80%81CST%E3%81%AF%E3%81%9D%E3%81%AE%E3%82%88%E3%81%86%E3%81%AA%E6%83%85%E5%A0%B1%E3%82%82%E4%BF%9D%E6%8C%81%E3%81%97%E3%81%BE%E3%81%99%E3%80%82)で取り上げています。

構築されるCSTにはコメントトークンも含まれてるため、シンタックスハイライトに用いられているようです。
参考:
* [Vimのすゝめ改 \- Tree\-sitter について \| 株式会社創夢 — SOUM/misc](https://www.soum.co.jp/misc/vim-advanced/6/)
* [EmacsでTree\-sitterを利用してシンタックスハイライトできるようにする](https://zenn.dev/hyakt/articles/6ff892c2edbabb)

# tree-sitter-sql

[tree-sitter-sql](https://github.com/m-novikov/tree-sitter-sql)はtree-sitter用に書かれたSQLの文法とその文法によって生成されたパーサライブラリです。SQLの中でも、PostgreSQLにフォーカスしていたようです。インターンで作成したフォーマッタは、このライブラリによる構文解析結果をもちいてSQLのフォーマットを行っています。

しかし、BETWEEN述語や`UNION`、`INTERSECT`などの結合演算など、基本的な構文であるにもかかわらず、対応していない構文が存在します。本記事では、その中でもBETWEEN述語に対応させるための構文拡張を行います。

# 環境構築

まず、tree-sitterの構文拡張のために行った環境構築について説明します。

### tree-sitter-cliのインストール

tree-sitterでパーサを生成するために、tree-sitter-cliをインストールします(参考[Tree-sitter | Creating Parser](https://tree-sitter.github.io/tree-sitter/creating-parsers#getting-started))。また、tree-sitterによるパーサを開発するためには、Node.jsとCコンパイラが必要です。今回使用したバージョンは以下の通りです。

|tools|バージョン|
|---|---|
|node|16.17.1|
|gcc |12.2.0 |
|tree-sitter|0.20.7|

### tree-sitter-sqlのインストール

[tree-sitter-sql](https://github.com/m-novikov/tree-sitter-sql)をcloneします。tree-sitter用のSQL構文はいくつかありますが、今回は最もスター数が多いものを選択しました。

```console
$ git clone https://github.com/m-novikov/tree-sitter-sql.git
```

`git clone`を行うと、以下のようなエラーが発生する場合があります。

```console
error: unable to create file [filepath]: Filename too long
```

これはファイル名が長すぎることが問題であるようなので、以下の設定を行うことで解決します。

```console gitの設定
$ git config --global core.longpaths true
```

`git clone` したtree-sitter-sqlのルートディレクトリで、`tree-sitter test` コマンドでテストが動作したら環境構築終了です。

```console
$ cd ./tree-sitter-sql
$ tree-sitter test
```

### 構文解析例

実際にパースしてみましょう。以下のファイルを用意します。

```sql exapmles/simple.sql
SELECT
    ID
FROM
    STUDENT
```

`tree-sitter parse`コマンドで、ソースファイルをパースすることができます。

```Clojure
$ tree-sitter parse ./exapmles/simple.sql
(source_file [0, 0] - [3, 11]
  (select_statement [0, 0] - [3, 11]
    (select_clause [0, 0] - [1, 6]
      (select_clause_body [1, 4] - [1, 6]
        (identifier [1, 4] - [1, 6])))
    (from_clause [2, 0] - [3, 11]
      (identifier [3, 4] - [3, 11]))))
```

# CSTの出力について

上述した`tree-sitter parse`により出力される結果では、ノードのラベルのみ表示されており、識別子やキーワードなどが表示されません。そこで、パース結果からCSTを出力する処理を自作しました。

言語にはRustを使用します。

### 準備

`tree-sitter-sql`の結果を利用してCSTを出力するためのプロジェクトを作成します。

```console
cargo new print-cst
```

`Cargo.toml`に次の依存関係を追加します。

```toml print-cst/Cargo.toml
[dependencies]
tree-sitter = "~0.20.3"
tree-sitter-sql = {path = "{tree-sitter-sqlのパス}"}
```

また、Github上のtree-sitter-sqlが使用しているtree-sitterのバージョンが古い(2022年11月22日現在)ため、tree-sitter-cliとtree-sitterのバージョン不整合が生じる可能性があります。バージョン不整合が生じるとき、後述するプログラムを実行すると以下のような実行時エラーが発生します。

```console
thread 'main' panicked at 'called `Result::unwrap()` on an `Err` value: LanguageError { version: 14 }', src\lib.rs:16:35
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

この場合、tree-sitter-sqlの`Cargo.toml`も修正する必要があります。

```toml tree-sitter-sql/Cargo.toml
[dependencies]
tree-sitter = "~0.20.3"
```

### 実装

`main.rs`に次のように実装しました。

```rust main.rs
use std::fs::read_to_string;

use tree_sitter::TreeCursor;

fn main() {
    let language = tree_sitter_sql::language();
    let mut parser = tree_sitter::Parser::new();
    parser.set_language(language).unwrap();
    let src_file = std::env::args().nth(1).expect("arguments error");
    let src = read_to_string(&src_file).unwrap();

    let tree = parser.parse(&src, None).unwrap();
    if tree.root_node().has_error() {
        println!("error");
    } else {
        let mut cursor = tree.walk();

        visit(&mut cursor, 0, &src);
    }
}

const UNIT: usize = 2;

fn visit(cursor: &mut TreeCursor, depth: usize, src: &str) {
    // インデント
    (0..(depth * UNIT)).for_each(|_| print!(" "));

    print!("{}", cursor.node().kind());

    // 子供がいないかつ、キーワードでない場合、対応する文字列を表示
    if cursor.node().child_count() == 0 && cursor.node().kind().chars().any(|c| c.is_lowercase()) {
        print!(" \"{}\"", cursor.node().utf8_text(src.as_bytes()).unwrap());
    }
    println!(
        " [{}-{}]",
        cursor.node().start_position(),
        cursor.node().end_position()
    );

    // 子供を走査
    if cursor.goto_first_child() {
        visit(cursor, depth + 1, src);
        while cursor.goto_next_sibling() {
            visit(cursor, depth + 1, src);
        }
        cursor.goto_parent();
    }
}
```
### 実行例

作成したプログラムを用いて、実際にCSTを表示してみましょう。

```sql exapmles/simple.sql
SELECT
    ID
FROM
    STUDENT
```

```Clojure
$ cargo run ./examples/simple.sql
source_file [(0, 0)-(1, 12)]
  select_statement [(0, 0)-(0, 9)]
    select_clause [(0, 0)-(0, 6)]
      SELECT [(0, 0)-(0, 6)]
      select_clause_body [(0, 7)-(0, 9)]
        identifier "ID" [(0, 7)-(0, 9)]
    from_clause [(1, 0)-(1, 4)]
      FROM [(1, 0)-(1, 4)]
      identifier "STUDENT" [(1, 5)-(1, 12)]
```

ノードに対応する文字列とキーワードを出力することができました。

# 構文例

次に、tree-sitter用の構文について簡単に紹介します。

tree-sitter では文法を `grammar.js` に記述します。clone した tree-sitter-sql のルートディレクトリにある `grammar.js`を編集していきます。ここではDSL([ドメイン固有言語](https://ja.wikipedia.org/wiki/%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E5%9B%BA%E6%9C%89%E8%A8%80%E8%AA%9E))について細かくは説明しないので、詳しく知りたい方は[tree-sitterのドキュメント](https://tree-sitter.github.io/tree-sitter/creating-parsers#the-grammar-dsl)を参照してください。

### 規則

例えば、tree-sitter-sql で WHERE句は以下のように記述されています([where_clauseの定義](https://github.com/m-novikov/tree-sitter-sql/blob/218b672499729ef71e4d66a949e4a1614488aeaa/grammar.js#L909))。

```js WHERE句の規則
where_clause: $ => seq(kw("WHERE"), $._expression)
```

`seq`はtree-sitterの文法のDSLの一つで、複数の規則を連結することができます。上の例では、`kw("WHERE")`のあとに`$._expression`が現れることを示しています。

`kw`関数はtree-sitter-sqlの`grammar.js`で定義されている関数で、キーワード(`k`ey`w`ord)が大文字か小文字であるかを考慮しなくするなどの処理を行います。パース時には、`where`や`WHERE`というキーワードとマッチします([kw関数の定義](https://github.com/m-novikov/tree-sitter-sql/blob/218b672499729ef71e4d66a949e4a1614488aeaa/grammar.js#L29))。


### アンダースコアから始まる規則

規則名の先頭の文字をアンダースコアから始めることで、生成されるCSTにノードとして出現させないように設定することができます([ドキュメント](https://tree-sitter.github.io/tree-sitter/creating-parsers#hiding-rules))。例えば、算術演算や識別子、リテラルなどの式は`_expression`という名前で以下のように定義されています。

```js 式に対応する規則
 _expression: $ =>
      choice(
        $.string,
        $.TRUE,
        $.FALSE,
        $.NULL,
        $._identifier,
        $.number,
        $.unary_expression,
        // 一部省略
      ),
```

`choice`はtree-sitterのDSLで、引数のうちいずれか1つとマッチすることを意味しています。つまり、この規則は、文字列や`TRUE`、`FALSE`など各式に対応した規則を呼び出し、いずれか一つとマッチすることになります。つまり、ソースファイル中に式が現れるたびに`_expression`が呼び出されています。これがCST上に現れると、例えば`1+2-3`という式のパース結果が以下のようになってしまいます。

```Clojure
(_expression
  (binary_expression
    (_expression
      (binary_expression
        (_expression
          (number "1"))
        ("+")
        (_expression
          (number "2")))
    ("-")
    (_expression
      (number "3"))))
```

アンダースコアから始めることで、CST上に現れないように設定でき、以下のようにシンプルな木にすることができます。

```Clojure
(binary_expression
  (binary_expression
    (number "1")
    ("+")
    (number "2"))
  ("-")
  (number "3))
```


### 優先度、結合性

ここで詳細は述べませんが、tree-sitterは明示しない場合、曖昧な文法を扱うことができません([参考](https://tree-sitter.github.io/tree-sitter/creating-parsers#the-grammar-dsl:~:text=conflicts%20%2D%20an%20array,dynamic%20precedence.))。

例えば、以下のような論理式を考えてみます。

```sql
NOT X AND Y OR Z
```

この式はどのように解釈されるでしょうか？`NOT (X AND (Y OR Z))`や`(NOT X) AND (Y OR Z)`、`((NOT X) AND Y) OR Z`など、複数通りに解釈できてしまうと思います。このように、複数通りの解釈ができてしまうような文法を曖昧な文法といい、そのままではパースできません。

これは、優先度・結合性を文法に記述することで対処できます。tree-sitter-sqlでは優先度をJavascriptの定数として以下のように定義しています。

```js
const PREC = {
  primary: 8,
  unary: 7,             // 単項演算子
  exp: 6,               // 累乗
  multiplicative: 5,    // 乗除算
  additive: 4,          // 加減算
  comparative: 3,       // 比較演算子
  and: 2,               // AND
  or: 1,                // OR
};
```

これを用いて、論理式に優先度・結合性を加えて記述した規則は次のようになります。
```js
    boolean_expression: $ =>
      choice(
        prec.left(PREC.unary, seq(kw("NOT"), $._expression)), // 優先度7
        prec.left(PREC.and, seq($._expression, kw("AND"), $._expression)),  // 優先度2
        prec.left(PREC.or, seq($._expression, kw("OR"), $._expression)), // 優先度1
      ),
```

優先度は、`NOT > AND > OR`になっています。優先度が高いものほど優先して結合されるため、上述の論理式をtree-sitter-sqlでパースすると、`((NOT X) AND Y) OR Z`と解釈されます。なお、`prec.left`は左結合であることを意味しています。

### extras

ファイルのどこに現れてもよい規則をextrasで記述することができます。
これを使って、コメントや空白、改行を簡単に記述することができます([コメント、空白の定義](https://github.com/m-novikov/tree-sitter-sql/blob/218b672499729ef71e4d66a949e4a1614488aeaa/grammar.js#L75))が、CST上では直感的でない場所位置に現れる場合もあります([インターンの記事後編](https://future-architect.github.io/articles/20220916c/#:~:text=%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%81%AE%E6%83%85%E5%A0%B1%E3%81%AFCST%E4%B8%8A%E3%81%AB%E4%BF%9D%E6%8C%81%E3%81%95%E3%82%8C%E3%81%BE%E3%81%99%E3%81%8C%E3%80%81%E7%9B%B4%E6%84%9F%E7%9A%84%E3%81%A7%E3%81%AA%E3%81%84%E4%BD%8D%E7%BD%AE%E3%81%AB%E7%8F%BE%E3%82%8C%E3%81%A6%E3%81%97%E3%81%BE%E3%81%86%E5%A0%B4%E5%90%88%E3%81%8C%E3%81%82%E3%82%8A%E3%81%BE%E3%81%99%E3%80%82)参照)。



# BETWEEN述語への対応

現状のtree-sitter-sqlを使用して、`BETWEEN`を含むSQLをパースできるか確認してみましょう。以下のようなファイルを用意します。

```sql examples/between.sql
SELECT
    ID
FROM
    STUDENT
WHERE
    GRADE   BETWEEN 80  AND 100
AND ID      BETWEEN 0   AND 100
```

```Clojure
$ tree-sitter parse .\examples\between.sql
(source_file [0, 0] - [7, 0]
  (select_statement [0, 0] - [6, 31]
    (select_clause [0, 0] - [1, 6]
      (select_clause_body [1, 4] - [1, 6]
        (identifier [1, 4] - [1, 6])))
    (from_clause [2, 0] - [3, 11]
      (identifier [3, 4] - [3, 11]))
    (where_clause [4, 0] - [6, 31]
      (boolean_expression [5, 4] - [6, 31]
        (boolean_expression [5, 4] - [6, 6]
          (boolean_expression [5, 4] - [5, 31]
            (identifier [5, 4] - [5, 9])
            (ERROR [5, 12] - [5, 22])
            (number [5, 28] - [5, 31]))
          (identifier [6, 4] - [6, 6]))
        (ERROR [6, 12] - [6, 21])
        (number [6, 28] - [6, 31])))))
.\examples\between.sql  0 ms    (ERROR [5, 12] - [5, 22])
```

構文エラーが発生し、WHERE句内のBETWEEN述語には対応していないことがわかります。[grammar.jsを見てみるとBETWEENというキーワードはWINDOW関数のFRAME句にしか想定していない](https://github.com/m-novikov/tree-sitter-sql/blob/218b672499729ef71e4d66a949e4a1614488aeaa/grammar.js#L1071)ため、BETWEENがERRORノードと扱われているようです。

### 規則の追加

BETWEEN述語に対応する規則がそもそも存在していないことがわかったため、文法を拡張することで対応していきます。

BETWEEN述語は次のような構文になっています。[PostgreSQLのドキュメント](https://www.postgresql.jp/document/14/html/functions-comparison.html)では構文について詳しく書かれていなかったので、[Oracle SQLのドキュメント](https://docs.oracle.com/cd/E57425_01/121/SQLRF/conditions012.htm#sthref1111)を参考にしました。

```sql BETWEEN述語の構文
(expression) (NOT)? BETWEEN (expression) AND (expression)
```

なお、`(NOT)?` は正規表現で使われる `?` と同じ意味で、 `NOT` が0回または1回現れることを表現しています。tree-sitterの構文では、`optional`というDSLで表現されます。

率直にDSLに直すと、次のような規則が書けます。

```js 率直に書いたBETWEENの規則
    between_and_expression: $ =>
      seq($._expression, optional(kw("NOT")), kw("BETWEEN"),
          $._expression, kw("AND"), $._expression)
```

この規則をSQLの式に対応する規則`_expression`に追加します。

```diff _expressionへの追加
    _expression: $ =>
      choice(
        $.string,
        $.TRUE,
        $.FALSE,
        // 省略
+       $.between_and_expression,
      ),
```

これでBETWEEN述語の規則を追加することができました。拡張した文法をもとにパーサを生成してみましょう。以下のコマンドを実行します。

```sh
$ tree-sitter generate
Unresolved conflict for symbol sequence:

  'grant_statement_token4'  _expression  'create_trigger_statement_token1'  _expression  •  'cte_token2'  …

Possible interpretations:

  1:  'grant_statement_token4'  (boolean_expression  _expression  'create_trigger_statement_token1'  _expression)  •  'cte_token2'  …
                                                            (precedence: 1, associativity: Left)
  2:  'grant_statement_token4'  _expression  'create_trigger_statement_token1'  (between_and_expression  _expression  •  'cte_token2'  'frame_clause_token1'  _expression  'frame_clause_token2'  _expression)
  3:  'grant_statement_token4'  _expression  'create_trigger_statement_token1'  (in_expression  _expression  •  'cte_token2'  'create_function_parameter_token1'  tuple)                                        (precedence: 3, associativity: Left)

Possible resolutions:

  1:  Specify a higher precedence in `in_expression` and `between_and_expression` than in the other rules.
  2:  Specify a higher precedence in `boolean_expression` than in the other rules.
  3:  Add a conflict for these rules: `in_expression`, `between_and_expression`, `boolean_expression`
```

エラーが発生してしまい、パーサが生成できませんでした。これは、上述した規則では優先度を記述していないため、文法が曖昧になってしまっていることが原因です。例えば、`X BETWEEN Y AND Z AND W`の`AND`がBETWEEN述語のものなのか、論理式のものなのかをパーサが自動で判別することができません。つまり、`X BETWEEN (Y AND Z) AND W`や`(X BETWEEN Y AND Z) AND W`など、複数の解釈ができてしまいます。

そこで、優先度と結合性を追加します。

```javascript 優先度と結合性を追加したBETWEENの規則
    between_and_expression: $ =>
      prec.left(
        PREC.comparative,
        seq($._expression, optional(kw("NOT")), kw("BETWEEN"),
            $._expression, kw("AND"), $._expression)
      ),
```

`prec.left`は左結合であることを示し、`PREC.comparative`で比較演算子と同じ優先度であることを指定しています。比較演算子は`AND`よりも高い優先度であるため、`X BETWEEN Y AND Z AND W`は`(X BETWEEN Y AND Z) AND W`と解釈されます。

### 動作確認

次のファイルをパースしてみましょう。

```sql examples/between.sql
SELECT
    ID
FROM
    STUDENT
WHERE
    GRADE   BETWEEN 80  AND 100
AND ID      BETWEEN 0   AND 100
```

以下のコマンドでパーサを生成します。

```console
$ tree-sitter generate
```

先ほど作成した `print-cst`を用いて、パース結果を出力します。

```Clojure
$ cd [print-cstのパス]
$ cargo run ./examples/between.sql
source_file [(0, 0)-(6, 31)]
  select_statement [(0, 0)-(1, 6)]
    select_clause [(0, 0)-(0, 6)]
      SELECT [(0, 0)-(0, 6)]
      select_clause_body [(1, 4)-(1, 6)]
        identifier "ID" [(1, 4)-(1, 6)]
    from_clause [(2, 0)-(2, 4)]
      FROM [(2, 0)-(2, 4)]
      identifier "STUDENT" [(3, 4)-(3, 11)]
    where_clause [(4, 0)-(4, 5)]
      WHERE [(4, 0)-(4, 5)]
      boolean_expression [(5, 4)-(5, 31)]
        between_and_expression [(5, 4)-(5, 9)]
          identifier "GRADE" [(5, 4)-(5, 9)]
          BETWEEN [(5, 12)-(5, 19)]
          number "80" [(5, 20)-(5, 22)]
          AND [(5, 24)-(5, 27)]
          number "100" [(5, 28)-(5, 31)]
        AND [(6, 0)-(6, 3)]
        between_and_expression [(6, 4)-(6, 6)]
          identifier "ID" [(6, 4)-(6, 6)]
          BETWEEN [(6, 12)-(6, 19)]
          number "0" [(6, 20)-(6, 21)]
          AND [(6, 24)-(6, 27)]
          number "100" [(6, 28)-(6, 31)]
```

これで`BETWEEN`を含むSQLがパースできるようになりました！

### テストの追加

最後に、今回追加したBETWEEN述語の拡張を`tree-sitter test`([Tree\-sitter｜Creating Parsers](https://tree-sitter.github.io/tree-sitter/creating-parsers#command-test))でテストできるようにしましょう。

`test/corpus/between.txt`を作成して、以下のように記述します。

```sql test/corpus/between.txt
=======================================
BETWEEN predicates
=======================================

SELECT
    ID
FROM
    STUDENT
WHERE
    GRADE   BETWEEN 80  AND 100
AND ID      BETWEEN 0   AND 100

---------------------------------------

(source_file
  (select_statement
    (select_clause
      (select_clause_body
        (identifier)))
    (from_clause
      (identifier))
    (where_clause
      (boolean_expression
        (between_and_expression
          (identifier)
          (number)
          (number))
        (between_and_expression
          (identifier)
          (number)
          (number))))))
```

* `=`で囲まれた行にテスト名を書きます
* 次に、入力として与えるソースコードを記述し、下に`---`を記述します
* 最後に期待する結果をS式で記述します

`tree-sitter test`でテストを行います。`-f`フラグを加えることで、特定のテストのみを実行することができます。

```sh
$ tree-sitter test -f 'BETWEEN predicates'
  between:
    ✓ BETWEEN predicates
  create:
  delete:
  insert:
  select:
  statements:
  update:
syntax highlighting:
  ✓ builtin.sql (49 assertions)
  ✓ function.sql (16 assertions)
  ✓ insert.sql (6 assertions)
  ✓ keywords.sql (9 assertions)
  ✓ punctuation.sql (2 assertions)
  ✓ select.sql (43 assertions)
  ✓ statements.sql (25 assertions)
  ✓ table.sql (33 assertions)
  ✓ type.sql (5 assertions)
  ✓ update.sql (10 assertions)
```

# まとめ

本記事では、tree-sitter-sqlでBETWEEN述語を扱えるように構文拡張を行いました。tree-sitter用のSQL構文はまだまだ未完成なので、皆さんも一緒によりよいパーサを作ってみませんか？


