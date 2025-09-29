---
title: "Pure Rustで生まれ変わったPostgreSQL公式構文準拠SQLフォーマッター「uroborosql-fmt」をリリース🎉"
date: 2025/09/29 00:00:00
postid: a
tag:
  - フォーマッター
  - uroboroSQL
  - Rust
  - WebAssembly
category:
  - DB
thumbnail: /images/2025/20250929a/thumbnail.png
author: 川渕皓太
lede: "roborosql-fmtの新バージョンv1.0.0をリリースしました。当社のSQLフォーマッター開発の歩みと課題の変遷について紹介します"
---
# はじめに

<img src="/images/2025/20250929a/top.png" alt="" width="630" height="229" loading="lazy">

コアテクノロジーグループの川渕です。

先日、uroborosql-fmtの新バージョンv1.0.0をリリースしました 🎉

このツールは当社が公開している[PostgreSQL向けのSQLコーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html)に基づき、SQL文をフォーマットするツールです。

現在、以下の3種類の方法でご利用いただけます。

- [ブラウザツール](https://future-architect.github.io/uroborosql-fmt/ja)
- [VSCode拡張](https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt)
- [CLIツール](https://github.com/future-architect/uroborosql-fmt/blob/main/crates/uroborosql-fmt-cli/README.md)

詳しい利用方法は[利用方法の章](#利用方法)で説明しています。

※ uroborosql-fmtのライセンスはBUSLですが、競合会社含め開発環境での利用は自由ですのでお気軽にご使用ください

また、今回のアップデートについては、以下のシリーズ記事でも詳しく解説しています。

- 新パーサーの技術詳細: (近日公開予定！)
- パーサーの置き換え戦略: (近日公開予定！)

# 当社のSQLフォーマッター開発の歩みと課題の変遷

当社ではこれまでにもSQLフォーマッターを開発・公開してきました。

それらのフォーマッターにはそれぞれ課題がありましたが、今回の新バージョンではこれまでの課題を**全て克服**しています。

| 年       | 名前                                  | 特徴                                                                                                                                                                                                                                                                                                                                     | 課題                                                                                                                                                                        | 関連ブログ                                                                                                                                                                      |
| :------- | :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2017** | **uroboroSQL formatter**              | ・Pythonで開発<br>・トークンベースで解析（パースなし）                                                                                                                                                                                                                                                                                   | ・lexerベースのため複数RDB構文対応といった自由度は高い反面、複雑な構文はサポートが困難 (postgresql以外のRDBを使う方は未だお薦めできます)<br>・PythonのためVSCode拡張化やwasm化が難しい                                                                      | ・[SQL開発者を幸せにする！？ Sublime Text 3でも使える uroboroSQL Formatter を公開しました &#124; フューチャー技術ブログ](/articles/20170228/) |
| **2020** | **ANTLR+TypeScript版SQLフォーマッター** | ・TypeScriptで開発（VSCode拡張化が容易）<br>・ANTLR4のパース結果を利用                                                                                                                                                                                                                                                                   | ・ANTLR4のパーサーが非常に低速なことにより、フォーマッター全体の動作が低速                                                                                                      | ・[Engineer Camp2020でSQLフォーマッターを開発しました &#124; フューチャー技術ブログ](/articles/20200919/)                                       |
| **2022** | **uroborosql-fmt v0.1.0**             | ・Rustで開発（wasm化やVSCode拡張化が可能）<br>・`tree-sitter-sql`のパース結果を利用しており高速                                                                                                                                                                                                                            | ・`tree-sitter-sql`の文法が不完全で、PostgreSQLの追従・修正コストがかかる<br>・文法を増やすとバイナリサイズが大きくなる<br>・`tree-sitter-sql`のC言語依存によりwasm化が複雑 | ・[新しいSQLフォーマッターであるuroboroSQL-fmtをリリースしました &#124; フューチャー技術ブログ](/articles/20231120a/)                         |
| **2025** | **uroborosql-fmt v1.0.0**             | ・Rustで開発（wasm化やVSCode拡張化が可能）<br>・公式PostgreSQL文法に準拠したパーサー([postgresql-cst-parser](https://github.com/future-architect/postgresql-cst-parser))のパース結果を利用しているため、**文法の追従コストが低い**<br>・postgresql-cst-parserは十分に高速であり、**パーサー自体も高速**<br>・Pure Rustであるため、**wasm化が容易** |                                                                                                                                                                             |                                                                                                                                                                                 |

# パーサー移行の背景とメリット

uroborosql-fmt v0.1.0ではパーサーとして [tree-sitter-sql](https://github.com/future-architect/tree-sitter-sql)を利用していましたが、開発を進めるにつれて以下3点の課題が判明しました。

- サポートされている文法が少なく、grammarの改善に工数がかかる
  - v0.1.0における新規構文サポートでは、フォーマットプロセスの改善に加えてパースプロセスの改善(grammarの改善)が必要であり、新規構文サポートに工数がかかっていた
- 対応文法を増やすとパーサーのサイズが大きくなり、結果的にフォーマッターのバイナリサイズも大きくなる
  - フォーク元tree-sitter-sqlでは、PRを全てマージすると83MBになるらしい… ([参考issue](https://github.com/m-novikov/tree-sitter-sql/issues/59))
- tree-sitterは内部的にC言語を利用しているため、wasmにコンパイルする際にwasm-bindgenが利用できず、wasmへのコンパイルが複雑化していた
  - 関連ブログ: [C/C++を呼び出しているRustのWASM化 | フューチャー技術ブログ](https://future-architect.github.io/articles/20230605a/)

これらの課題に対応するため、当社の山田がPostgreSQLの公式のパーサーをRustに移植した**postgresql-cst-parser**を作成しました。uroborosql-fmt v1.0.0ではそのパーサーを利用するようにしています。

- [future-architect/postgresql-cst-parser - GitHub](https://github.com/future-architect/postgresql-cst-parser)

パーサーの変更により、v0.1.0でのパーサー起因の課題が全て解消されました。

- 公式パーサーから移植しているので、パーサー自体は全てのPostgreSQL文法に対応している
- 公式の構文定義ファイルからRust製パーサーを自動生成しているため、文法の追従が容易
- 全てのPostgreSQL文法に対応しているにも関わらず、バイナリサイズが約6MBとコンパクト
- Pure Rust (C言語を含まない) であるため、wasm-bindgenを用いてwasmにコンパイルすることができる

この変更によって、新規構文サポートのためのパースプロセスの改善工数は**ゼロ**になり、フォーマットプロセスの改善のみで新規構文をサポートできるようになりました :tada:

<img src="/images/2025/20250929a/image.png" alt="image.png" width="1070" height="456" loading="lazy">

パーサーの動作は以下のデモページから確認することができます。

- [PostgreSQL CST Parser](https://tanzaku.github.io/postgresql-cst-parser/)

<a href="https://tanzaku.github.io/postgresql-cst-parser/">
<img src="/images/2025/20250929a/image_2.png" alt="image.png" width="1200" height="750" loading="lazy">
</a>

新パーサーの詳細については後日ブログで公開する予定です。

# 利用方法

現在以下の3種類の方法で利用することができます。

1. ブラウザツール
1. VSCode拡張
1. CLIツール

## 1. ブラウザツール

[デモページ](https://future-architect.github.io/uroborosql-fmt/ja.html)からブラウザ上で試すことができます。使い方の詳細はデモページをご覧ください。

<a href="https://future-architect.github.io/uroborosql-fmt/ja.html" target="_blank">
<img src="/images/2025/20250929a/image_3.png" alt="image.png" width="1200" height="750" loading="lazy">
</a>

## 2. VSCode拡張

1. [uroborosql-fmtの拡張機能](https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt)をインストールしてください
1. settings.jsonに以下の設定を入れてください

    ```json settings.json
    {
      "[sql]": {
        "editor.defaultFormatter": "Future.uroborosql-fmt"
      }
    }
    ```

1. SQLファイルを開き、コマンドパレットから`Format Document`か、`format sql`を実行してください
`format sql`では選択範囲のフォーマットをサポートしています

<img src="/images/2025/20250929a/image_4.png" alt="image.png" width="1200" height="705" loading="lazy">

## 3. CLIツール

1. Rustをインストールしてください。([インストール方法](https://www.rust-lang.org/ja/tools/install))
1. 以下を実行してください

    ```sh
    cargo install --git https://github.com/future-architect/uroborosql-fmt
    ```

1. 以下のようなコマンドでuroborosql-fmtを実行できるようになります (オプションの詳細は[CLIツールのREADME](https://github.com/future-architect/uroborosql-fmt/blob/main/crates/uroborosql-fmt-cli/README.md)をご覧ください)

    ```sh
    uroborosql-fmt-cli --write target.sql
    ```

# 今後の展望

今後は対応構文の拡張とLinter機能の開発を行う予定です。

Linter機能は具体的に、以下のような警告・エラーをVSCode上で表示する機能を想定しています。

- 大きすぎるIN句はパフォーマンスに影響を与える可能性があるため警告 ([コーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html#in-%E5%8F%A5-1))
- 存在しないカラム・テーブルを参照している場合はエラー
- NullableなカラムをINNER JOINしている場合は警告

# 最後に

まだまだ開発途上であり、フォーマットできない構文も多くあります。
不具合や要望等ございましたらお気軽に以下リポジトリまでissueやPRを頂ければと思います。

- [future-architect/uroborosql-fmt - GitHub](https://github.com/future-architect/uroborosql-fmt)

後日postgresql-cst-parser開発の話、パーサー移行に伴うフォーマッター移行作業の話の2本の記事を公開予定です。お楽しみに！
