---
title: "SQLフォーマッター uroborosql-fmt がNeovim/Eclipseなど各種エディタに対応 ― 言語サーバーとβ版リンターを公開しました🎉"
date: 2026/08/17 00:00:00
postid: a
tags:
  - フォーマッター
  - Linter
  - uroboroSQL
  - 2WaySQL
  - LSP
categories:
  - DB
thumbnail: /images/2026/20260817a/thumbnail.png
author: 仲泰志
lede: "SQLフォーマッター uroborosql-fmt の言語サーバーとβ版リンターをリリースしました。Neovim / Emacs / Eclipse など各種エディタでのセットアップ方法と、SQLコーディング規約に基づくリンターのルールを紹介します。"
---
## はじめに

<img src="/images/2026/20260817a/top.png" alt="" width="630" height="229" loading="lazy">

コアテクノロジーグループでアルバイトをしている仲です。

先日、SQL フォーマッターである [uroborosql-fmt](https://github.com/future-architect/uroborosql-fmt) の新たなアップデートとして、言語サーバーおよびβ版のリンター機能をリリースしました 🎉

uroborosql-fmt は、当社が公開している PostgreSQL 向けの [SQL コーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html)に基づいて SQL 文をフォーマットするツールです。これまでの歩みについては以下の過去記事で詳しく解説しています。

- [Pure Rustで生まれ変わったPostgreSQL公式構文準拠SQLフォーマッター「uroborosql\-fmt」をリリース🎉 \| フューチャー技術ブログ](https://future-architect.github.io/articles/20250929a/)

本記事では、言語サーバー提供の背景や利用方法、β 版リンターについてご紹介します！

## 言語サーバー開発の背景

uroborosql-fmt では、フォーマッターに加えて SQL 向けリンターの開発を進めています。

SQL における不具合や性能劣化は、性能試験や本番運用の段階で発覚して事後的な対応となることがしばしばあります。原因のひとつとしては、本番環境のように量や種類の豊富なデータを使ったテストの実施が開発時には難しいという構造的な問題があるでしょう。

一方で、インデックスが効かない書き方や NULL の扱いに起因する不具合など、SQL 文がもつ問題の一部は実行前にアンチパターンとして発見できることがあります。当社の [SQL コーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html)にはこのようなアンチパターンの回避を目的としたルールが多数含まれています。

現在開発を進めているリンターは、対象の SQL 文がこうしたルールに沿っているかを機械的にチェックするツールです。レビューや実行を待たずに開発中の SQL の問題を検出することで、不具合や性能劣化の未然防止につなげることを目的としています。

リンターの提供にあたっては、CI や AI エージェントから使いやすい CLI に加えて、エディタとの連携も実現したいと考えました。コード解析の結果をエディタへ通知する一般的な方法として LSP（Language Server Protocol）があります。今回はこの LSP に準拠した言語サーバーを開発・リリースしました。

## 言語サーバーの機能について

2026年7月現在、この言語サーバーは以下の機能を提供しています。

- Document Formatting: ファイル全体のフォーマット
- Document Range Formatting: 選択範囲のフォーマット
- Diagnostics (Linting): 構文エラーや規約違反のエディタ上警告
- Code Actions (QuickFix): リンター警告の表示制御

## エディタ別セットアップ例

主要なエディタでの利用方法についてご紹介します。

なお、リンター機能を有効にするには設定ファイル `.uroborosqllintrc.json` が必要です（後述の「設定と実行」を参照）。フォーマット機能は設定ファイルなしでも利用できます。

### VS Code

VS Code ではこれまでと変わらず [拡張機能](https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt)（v2.1.0 以降）から利用できます。
手動で言語サーバーをインストールする必要はありません。

また、VS Code 拡張限定の機能として、新たに `Format Selection as SQL` コマンドを提供しています。
SQL 以外のファイルに埋め込まれた SQL（たとえば TypeScript のテンプレートリテラル内の SQL）を選択してこのコマンドを実行すると、選択範囲を SQL としてフォーマットし、その範囲だけを置き換えます。
標準の LSP 機能ではなくカスタムメソッドを利用して実現しているため、VS Code 拡張でのみ利用できます。

### その他のエディタ

言語サーバーの提供により、uroborosql-fmt のフォーマット機能とリンターは LSP クライアントを持つ任意のエディタで利用できるようになりました。VS Code 以外のエディタで利用する場合は、まず言語サーバー本体をインストールします：

```sh
cargo install --git https://github.com/future-architect/uroborosql-fmt uroborosql-language-server
```

Rust の環境を用意したくない場合は、[GitHub Releases](https://github.com/future-architect/uroborosql-fmt/releases/tag/uroborosql-language-server-v1.0.1) から Linux / Windows / macOS 向けのビルド済みバイナリを直接ダウンロードしてご利用ください。

インストールしたバイナリは標準入出力で LSP 通信をするため、各エディタの LSP クライアントからコマンド名（`uroborosql-language-server`）を指定するだけで利用できます。

#### Neovim

Neovim 組み込み LSP クライアントの設定例です。

```lua
vim.api.nvim_create_autocmd("FileType", {
  pattern = "sql",
  callback = function(args)
    local root = vim.fs.root(args.buf, {
      ".uroborosqllintrc.json",
      ".uroborosqlfmtrc.json",
    }) or vim.uv.cwd()

    vim.lsp.start({
      name = "uroborosql-language-server",
      cmd = { "uroborosql-language-server" },
      root_dir = root,
    })
  end,
})
```

#### Emacs

Eglot を使用する場合の設定例です。

```elisp
(require 'eglot)

(add-to-list 'eglot-server-programs
             '(sql-mode . ("uroborosql-language-server")))

(add-hook 'sql-mode-hook #'eglot-ensure)

(setq eglot-autoshutdown t)
```

#### Eclipse

Eclipse では、Eclipse 公式の LSP クライアントである [LSP4E](https://projects.eclipse.org/projects/technology.lsp4e) を導入することで利用できます。LSP4E には設定を GUI から行う仕組みがあるため、プラグインを自作することなく言語サーバーを登録できます。

まず LSP4E をインストールします。`Help > Install New Software...` を開き、`Work with` に以下の更新サイトを入力します。

```text
https://download.eclipse.org/lsp4e/releases/latest/
```

一覧に表示される `Eclipse LSP4E` を選択してインストールし、Eclipse を再起動します。お使いの Eclipse パッケージにすでに LSP4E が含まれている場合、この手順は不要です。

続いて、以下の手順で言語サーバーを登録します。

1. SQL 用の content-type を用意する
    - `Preferences > General > Content Types` で、`*.sql` に関連付けられた content-type があるかを確認します。無い場合は `Text` の下に子の content-type を追加し、File associations に `*.sql` を登録します。content-type は `Text` の子孫である必要があります。
2. 言語サーバーの起動設定を作成する
    - `Run > External Tools > External Tools Configurations...` で `Program` の構成を新規作成し、Location にインストールした `uroborosql-language-server` の実行ファイルパスを指定します。引数は不要です。
3. content-type と起動設定を関連付ける
    - `Preferences > Language Servers` で `Add...` を選び、左側で手順 1 の content-type を、右側で手順 2 の起動設定を選択します。
4. SQL ファイルを Generic Editor で開く
    - 対象ファイルを右クリックし、`Open With > Generic Editor` を選択します。すでに別のエディタで開いている場合は、一度閉じてから開き直してください。

以上で、Problems ビューおよびエディタ上へのリンター警告の表示と、フォーマットが利用できるようになります。なお、リンターを有効にするにはプロジェクトのルートに `.uroborosqllintrc.json` を配置してください。

#### JetBrains 系 IDE

JetBrains 系 IDE では、Red Hat が提供している [LSP4IJ](https://plugins.jetbrains.com/plugin/23257-lsp4ij) プラグインを導入することで利用できます。

## SQL リンター（β版）のご紹介

今回のリリースに含まれる SQL リンター（`uroborosql-lint`）についても紹介します。
このリンターは、SQL コーディング規約に含まれるアンチパターン回避のルールに沿っているか等をチェックすることで、不具合や性能劣化の未然防止をめざすツールです。

<img src="/images/2026/20260817a/lint-language-server-demo.gif" alt="" width="640" height="360" loading="lazy">

*エディタ上でリンター警告が表示される様子*

現在は β 版のため、バグや仕様変更の可能性があります。

### 現時点のルール

現在は以下 7 つのルールを実装しています。

| ルール名 | 内容 |
| --- | --- |
| `no-distinct` | `DISTINCT` の使用を警告 |
| `no-wildcard-projection` | `SELECT *` などのワイルドカード利用を警告 |
| `no-not-in` | `NOT IN` の使用を警告 |
| `no-union-distinct` | `UNION DISTINCT`（暗黙の `UNION` を含む）を警告 |
| `no-function-on-column-in-join-or-where` | JOIN / WHERE 条件でのカラムへの関数適用を警告 |
| `too-large-in-list` | 要素数が多すぎる `IN` リストを警告 |
| `missing-two-way-sample` | 2WaySQL のバインドパラメータのサンプル値抜けを警告 |

ここではいくつかのルールについて紹介します。

#### `no-function-on-column-in-join-or-where`

`no-function-on-column-in-join-or-where` ルールは、JOIN や WHERE の条件でカラムに関数を適用している箇所を検出します。インデックスカラムへ関数を適用しているケースの検出を念頭に置いたルールです。（[コーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html#%E6%A4%9C%E7%B4%A2:~:text=%E3%82%A4%E3%83%B3%E3%83%87%E3%83%83%E3%82%AF%E3%82%B9%E3%82%AB%E3%83%A9%E3%83%A0%E3%81%AB%E9%96%A2%E6%95%B0%E3%82%92%E9%80%9A%E3%81%97%E3%81%9F%E5%80%A4%E3%81%AB%E5%AF%BE%E3%81%97%E3%81%A6%E6%9D%A1%E4%BB%B6%E6%8C%87%E5%AE%9A)）

```sql
-- NG: カラムに関数を適用しており、インデックスが効かない
SELECT id FROM orders WHERE to_char(created_at, 'YYYYMMDD') = '20260101';
--                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
--                          Functions in JOIN or WHERE conditions can prevent index usage; rewrite without wrapping the column. created_at (no-function-on-column-in-join-or-where)

-- OK: 定数のみに関数を適用する
SELECT id FROM orders WHERE created_at >= to_date('20260101', 'YYYYMMDD');
```

#### `no-not-in`

`no-not-in` ルールは、`NOT IN` の使用を検出します。`NOT IN` はサブクエリの結果に `NULL` が 1 つでも含まれると結果が 1 行も返らなくなるという落とし穴が知られています。代わりに `NOT EXISTS` の利用を促すルールです。（[コーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html#not-in-%E5%8F%A5)）

```sql
-- NG: orders.user_id に NULL が 1 件でもあると、このクエリは 1 行も返さない
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM orders);
--                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
--                            Avoid using NOT IN; prefer NOT EXISTS or other alternatives to handle NULL correctly. (no-not-in)

-- OK: NOT EXISTS なら NULL があっても意図どおりに動く
SELECT id FROM users
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE orders.user_id = users.id);
```

#### `missing-two-way-sample`

`missing-two-way-sample` ルールは、2WaySQL をターゲットとしている uroboroSQL ならではのルールです。

[2WaySQL](https://future-architect.github.io/uroborosql-doc/background/) とは、SQL クライアントツールでそのまま実行でき、プログラムからも実行できる形式の SQL 文のことです。

SQL 実行ライブラリ [uroboroSQL](https://future-architect.github.io/uroborosql-doc/) では、`/*user_id*/10` のようにコメント形式でバインドパラメータ（`/*user_id*/`）を指定し、直後に対応するサンプル値（`10`）を記述します。

プログラムから実行する際にはサンプル値が除去されてパラメータのバインドが行われる一方で、SQL クライアントツールから直接実行する際にはサンプル値がそのまま使われるため、どちらの方法でも実行できるという仕組みです。

このサンプル値が抜けていると SQL としての直接実行ができなくなってしまうため、本ルールはサンプル値が書かれていないバインドパラメータを検出し警告します。

```sql
-- NG: バインドパラメータ（/*user_id*/）に対応するサンプル値が欠けている
SELECT id FROM users WHERE id = /*user_id*/;
--                                        ^^
--                                        Sample value for bind parameter is missing. (missing-two-way-sample)

-- OK: バインドパラメータに対するサンプル値がある
SELECT id FROM users WHERE id = /*user_id*/10;
```

### 利用方法

リンターは CLI または言語サーバー経由（VS Code 拡張を含む）で利用できます。言語サーバー経由での利用は前述の「エディタ別セットアップ例」をご覧ください。

CLI は、CI や AI エージェントの hook に組み込んでチェックを自動化する用途におすすめです。以下では CLI での利用方法を紹介します。

#### インストール

Cargo でインストールできます：

```sh
cargo install --git https://github.com/future-architect/uroborosql-fmt uroborosql-lint-cli
```

Rust の環境を用意したくない場合は、[GitHub Releases](https://github.com/future-architect/uroborosql-fmt/releases/tag/uroborosql-lint-cli-v0.1.0) から Linux / Windows / macOS 向けのビルド済みバイナリを直接ダウンロードしてご利用ください。

#### 設定と実行

リンターの実行には設定ファイル `.uroborosqllintrc.json` が必要です（言語サーバー経由の場合も、このファイルがあるときのみリンターが有効になります）。`--init` でひな形を生成できます：

```sh
uroborosql-lint --init      # .uroborosqllintrc.json を生成
uroborosql-lint query.sql   # lint 実行
```

設定ファイルの書き方やディレクティブコメントによる警告の抑制、CLI のオプションなどの詳細は[ドキュメント](https://github.com/future-architect/uroborosql-fmt/blob/main/crates/uroborosql-lint/README.md)をご覧ください。

## 今後の展望

今後は安定版のリリースに向けてリンターの開発を進めていく予定です。

現在は SQL のテキストのみを利用するルールしか提供していませんが、今後はデータベースのカタログ情報を参照するルールを追加していく予定です。実際のインデックス定義やテーブル定義を踏まえた検出ができるようになれば、性能劣化の未然防止という目的にさらに近づけると考えています。

また、現状では限定的にしかサポートできていない 2WaySQL 対応の拡充を予定しています。

## さいごに

本記事では、uroborosql-fmt の言語サーバー提供と SQL リンター（β 版）についてご紹介しました。VS Code 以外のエディタをお使いの方も、ぜひ uroborosql-fmt を試してみてください。

不具合の報告や機能の要望など、[GitHub リポジトリ](https://github.com/future-architect/uroborosql-fmt)の Issue にてお気軽にお寄せください。
