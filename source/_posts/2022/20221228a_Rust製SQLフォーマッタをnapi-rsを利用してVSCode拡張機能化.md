---
title: "Rust製SQLフォーマッタをnapi-rsを利用してVSCode拡張機能化"
date: 2022/12/28 00:00:00
postid: a
tag:
  - Rust
  - TypeScript
  - VSCode
  - フォーマッター
  - コアテク
category:
  - Programming
thumbnail: /images/2022/20221228a/thumbnail.png
author: 川渕皓太
lede: "本記事ではRust製SQLフォーマッタであるuroborosql-fmtのVSCode拡張機能化した方法について説明します。"
---

<img src="/images/2022/20221228a/top.png" alt="" width="579" height="216">

# はじめに

こんにちは、Futureでアルバイトをしている川渕です。

アルバイトの前はFutureのインターンシップでRust製SQLフォーマッタであるuroborosql-fmtの作成を行っていました(その時の記事は[こちら](/articles/20220916b/))。

本記事ではそのフォーマッタをVSCodeの拡張機能化した方法について説明します。

# 説明すること

* napi-rsを使用してTypeScript(JavaScript)からRustのコードを呼び出せるようにする方法
* napi-rsにおけるクロスプラットフォームビルド方法
* VSCode拡張機能をパッケージ化する方法

<!--
* x86_64-pc-windows-gnuの環境でnapi-rsを使用する方法
-->

# 説明しないこと

* 本記事ではフォーマッタの仕様、実装方法について説明しません。詳細を知りたい方は以下の記事をご覧ください。
  * [Engineer Camp2022 RustでSQLフォーマッタ作成（前編） | フューチャー技術ブログ](/articles/20220916b/)
  * [Engineer Camp2022 RustでSQLフォーマッタ作成（後編） | フューチャー技術ブログ](/articles/20220916c/)
  * [tree-sitter文法入門 | フューチャー技術ブログ](/articles/20221215a/)
* LSPを用いた拡張機能作成方法の詳細についても本記事では説明しません。詳細を知りたい方は以下の記事をご覧ください。
  * [Language Server Protocolを用いたVSCode拡張機能開発 (前編) | フューチャー技術ブログ](/articles/20221124a/)
  * [Language Server Protocolを用いたVSCode拡張機能開発 (後編) | フューチャー技術ブログ](/articles/20221125a/)
* napi-rsで作成したNode.jsアドオンの公開方法
* 作成したVSCode拡張機能の公開方法

# 環境

* OS: Windows 10 Pro
* VSCode: 1.73.1
* Node.js: v16.17.1
* rustc: 1.64.0 (a55dd71d5 2022-09-19)
* npm: 8.15.0
* yarn: 1.22.19
* napi-rs/cli: 2.12.0
* vsce: 2.14.0

# 作成するVSCode拡張機能の仕様

作成するVSCode拡張機能の仕様は以下の通りです。

* [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)を利用する
* コマンドパレットで実行できる
* 範囲選択されている場合、その範囲のSQLをフォーマットする
* 範囲選択されていない場合、全体をフォーマットする

<img src="/images/2022/20221228a/format_extension.gif" alt="format_extension.gif" width="1200" height="675" loading="lazy">

# 処理の流れ

作成する拡張機能の処理の流れを説明します。

<img src="/images/2022/20221228a/df88766a-9fef-6408-5603-1c17bed7619c.png" alt="" width="1200" height="1190" loading="lazy">

処理の流れは以下のとおりです。

1. まずユーザがフォーマットしたいSQLを範囲選択し、コマンドを実行します。
1. コマンド実行をLanguage Serverのクライアントが検知し、サーバに選択範囲の情報を送信します。
1. サーバは選択範囲のSQLを取得します。取得したSQLを引数に与えてSQLフォーマッタを実行します。
1. SQLフォーマッタは引数として受け取ったSQLをフォーマットし、フォーマット済みSQLを返します。
1. フォーマット済みSQLを受け取ったサーバは選択範囲をフォーマット済みSQLに置き換えるようにクライアントに送信します。

SQLフォーマッタはRust、自作Language ServerはTypeScriptで書かれているため、直接SQLフォーマッタを呼び出すことができません。

そこで、napi-rsというツールを使用して、TypeScriptからRustで書かれたSQLフォーマッタを呼び出せるようにしました。

# TypeScriptからRustの呼び出し

まずTypeScriptからRustを呼び出す方法として以下の3つの方法が考えられます。

| 方法 | 使用するツール | メリット | デメリット |
|--|--|--|--|
| Rustコードのwasm化 | rustc または wasm-pack | プラットフォームに依存しないため移植性が高い | C/C++を呼び出しているコードをビルドするのが難しい|
| RustコードのNode.jsアドオン化 | napi-rs | C/C++を呼び出しているコードでも比較的簡単にビルドできる | クロスプラットフォームビルドが必要 |
| Rustコードをビルドしたものをexecで呼び出す | rustc | 特別なツールを使わなくても可能 | クロスプラットフォームビルドが必要 <br>   綺麗な方法とは言えないため最後の手段 |

wasmとNode.jsアドオンの性能差は現時点では調査しましたがわかりませんでした。(もしわかる方がいれば教えてください)
しかし、移植性の観点からできる限りwasmのほうがNode.jsアドオンよりも良いという意見が多く見受けられました。

* [Performance: Rust and its relationship with Node.js](https://sprkl.dev/performance-rust-node-js/)
* [How do NAPI works compare to WASM, and what are the use cases suiting each one? : rust](https://www.reddit.com/r/rust/comments/xhg78i/how_do_napi_works_compare_to_wasm_and_what_are/)

しかし、SQLフォーマッタは内部的にCで書かれたコードを呼び出していることが要因でwasm化がうまくいかなかったため、今回はnapi-rsを用いてNode.jsアドオン化する方法を選択しました。

## Node-API

napi-rsについて紹介する前にNode-APIについて説明します。
Node-APIとはNode 8.0.0で導入されたツールで、C/C++コードをNode.jsのアドオン化するツールです。
Node-APIを使用することで、C/C++コードをJavaScriptで記述されたものと同様の方法で利用できるようになります。

## napi-rsとは

[napi-rs](https://napi.rs/)とはNode-APIをRustで使用できるようにしたものです。
例えば以下のようなRustコードをnapi-rsでビルドします。

```rust  example.rs
#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
  a + b + b
}
```

すると、Node.jsアドオンが生成され、JavaScriptからRustの関数を呼び出せるようになります。

```javascript  example.js
const { sum } = require("./index.js");
console.log(sum(3, 4));
// 7
```

::: note info
<p>ちなみに、Node-APIは元々の名称がN-APIだったのですが、しばしば「NAPI」と発音され、蔑称と間違われる可能性があるとの懸念から現在のNode-APIに名称を変更しました。そのため、napi-rsにおいても、"エヌエーピーアイ"と発音したほうが良さそうです。
</p>
<a href="https://codezine.jp/article/detail/14109">N-APIが「Node-API」へ名称変更、既存のコンパイル済みアドオンへの影響はナシ|CodeZine（コードジン）</a>
:::

## napi-rsの使い方

napi-rsの使い方を説明します。

::: note warn
<p>napi-rsではx86_64-pc-windows-gnuの環境はサポートされていないため、もしwindowsでgnu版rustを使っている方はmsvc版のRustを入れてください。
</p>
:::

### 1. CLIツールのインストール

yarnでnapi-rsのCLIツールをインストールします。
まずyarnをインストールします。以降もyarnが必要になるため、必ずインストールしてください。

```shell
npm install -g yarn
```

napi-rsのCLIツールをインストールします。

```shell
yarn global add @napi-rs/cli
```

インストールに成功すると`napi`コマンドが使えるようになります。

### 2. 新規プロジェクト作成

インストールしたCLIツールを使用して新規プロジェクトを作成します。
新規プロジェクトを作成したいディレクトリで以下のコマンドを実行します。

```shell
napi new
```

すると、以下の質問が表示されるので、順に回答してください。

```shell
# 任意のパッケージ名
? Package name: (The name filed in your package.json)

# ディレクトリ名
? Dir name

# サポートしたい実行環境
# publish時にここで選んだ実行環境がサポートされます
# デフォルト: x86_64-apple-darwin, x86_64-pc-windows-msvc, x86_64-unknown-linux-gnu
? Choose targets you want to support

# GitHub Actionsを有効にするか否か
? Enable github actions? (Y/n)
```

<!--
:::note warn

x86_64-pc-windows-gnuの環境はサポートされていないため、msvc版のRustを入れることを推奨します。
しかし、gnu版Rustの環境でも後述の操作をすればローカルでは試すことができます。
もしそのような環境で試したい方は、とりあえず「サポートしたい実行環境」はデフォルトのまま進めてください。
:::
-->

質問に回答すると指定したディレクトリ名のディレクトリが作成されます。
これでNode.js add-onを作るテンプレートが完成しました。

### 3. ビルドと実行

テンプレートの`src/lib.rs`に既にサンプルのRustコードが含まれています。関数sumは2つの引数の合計を返す関数です。

```rust  src/lib.rs
#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
  a + b
}
```

これをNode.jsアドオンへビルドして実行してみます。
まず先ほど作成したプロジェクトのルートディレクトリでビルドコマンドを実行します。

```shell
yarn build
```

ビルドに成功すると、プロジェクトのディレクトリ直下に`index.d.ts`、`index.js`、`<プロジェクト名>.<環境>.node`が作成されます。

`index.js`には環境に合ったnodeファイルを読み込んでくれる処理が書いています。そのため、`index.js`をimportすることで自動的に環境に合ったnodeファイルが読み込まれ、そこに含まれる関数を利用できるようになります。

以下のファイルをプロジェクトのディレクトリ直下に作成します。

```javascript test.js
const { sum } = require("./index.js");
console.log(sum(3, 4));
```

実行して"7"という出力が返ってきたら成功です。

```shell
node test.js
# 7
```

## SQLフォーマッタをJavaScriptから実行

プロジェクトのテンプレートを変更してSQLフォーマッタをJavaScriptから実行できるようにしてみます。

### 1. 新規プロジェクト作成

先述した方法で新規プロジェクトを作成しました。プロジェクト名はuroborosql-fmt-napiとしています。

### 2. `src/lib.rs`を変更し、ビルド

`src/lib.rs`を以下のように変更します。
SQLフォーマッタのクレート名は`uroborosql_fmt`で、`format_sql()`関数にSQL文を渡すとフォーマットされたSQLが返ってきます。

```rust src/lib.rs
#![deny(clippy::all)]

use uroborosql_fmt::format_sql;

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn runfmt(input: String) ->  String {
    format_sql(&input)
}
```

プロジェクトのルートディレクトリでビルドします。

```shell
yarn build
```

私の環境はwin32-x64-msvcであるため、`index.d.ts`、`index.ts`、`uroborosql-fmt-napi.win32-x64-msvc.node`が生成されました。

### 3. run.jsの作成、実行

プロジェクトのディレクトリ直下にrun.jsを作成します。変数targetにはフォーマットしたいSQL文を格納しています。

```javascript run.js
const { runfmt } = require("./index.js");

let target = `
SELECT
      Identifier as id, --ID
student_name          --              学生名
FROM
  japanese_student_table
AS JPN_STD --日本人学生
,       SUBJECT_TABLE AS SBJ  --科目
WHERE
  JPN_STD.sportId = (SELECT
         sportId   FROM
    Sport
                         WHERE
             Sport.sportname
    = 'baseball'
                    )   -- 野球をしている生徒
    AND
JPN_STD.ID  = SBJ.ID
AND SBJ.grade   >
            /*grade*/50     --成績が50点以上
`;
console.log(runfmt(target));
```

作成した`run.js`を実行します。

```shell
node run.js
```

出力結果は以下のようになりました。きちんとフォーマットされているため成功です。

```sql
SELECT
	IDENTIFIER		AS	ID				-- ID
,	STUDENT_NAME	AS	STUDENT_NAME	-- 学生名
FROM
	JAPANESE_STUDENT_TABLE	JPN_STD	-- 日本人学生
,	SUBJECT_TABLE			SBJ		-- 科目
WHERE
	JPN_STD.SPORTID	=	(
		SELECT
			SPORTID
		FROM
			SPORT
		WHERE
			SPORT.SPORTNAME	=	'BASEBALL'
	)								-- 野球をしている生徒
AND	JPN_STD.ID		=	SBJ.ID
AND	SBJ.GRADE		>	/*grade*/50	-- 成績が50点以上
```

## クロスプラットフォームビルド

現在はビルドした環境(win32-x64-msvc)でしか作成したNode.jsアドオンが動作しません。
そこでGitHub Actionsを使ってクロスプラットフォームビルドを行います。

### 0. CI.ymlの作成

もしnapi-rsプロジェクト作成時にGitHub Actionsを有効にしていなかった場合はこちらの作業を行ってください。

1. 適当なディレクトリで`napi new`
1. パッケージ名、ディレクトリ名は適当に入力
1. サポートしたい実行環境を選択
     (今回作成しているフォーマッタではできるだけ多くの環境をサポートしたかったため、で全ての実行環境を選択)
1. GitHub Actionsを有効にしてプロジェクトを作成
1. 完成したプロジェクト内の`.github`ディレクトリをコピーして現在作業中のプロジェクトにペースト

### 1. yarn.lockの作成

プロジェクトのルートディレクトリで以下のコマンドを実行します。

```sh
yarn install
```

yarn.lockが作成、または更新されれば成功です。

### 2. CI.ymlの編集、GitHub Actionsの実行

デフォルトではGitHubにpushするとGitHub Actionsが自動的に動いて以下の処理を行ってくれます。

1. 各環境に対応したNode.jsアドオンをビルド
1. npmパッケージのpublish

今回はnpmパッケージのpublishは行わないため、`.github/workflows/CI.yml`のpublish以下をすべてコメントアウトします。
publish方法を知りたい方は以下の記事が参考になると思います。

* [Rust + Node-APIでクロスプラットフォーム向けnpmパッケージを公開する - 別にしんどくないブログ](https://shisama.hatenablog.com/entry/2021/12/03/054437#napi-rs%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%9Fnpm-publish)

GitHub Actionsでビルドを行うと、13個の環境のうち11個の環境でビルドが失敗してしまいました。Rust製SQLフォーマッタが内部的にC/C++のコードを呼び出していることが原因の1つであると考えられます。そのため、通常のRustプロジェクトであればもう少し成功すると思います。
試行錯誤して`.github/workflows/CI.yml`を編集すると、最終的に13個中7個の環境でビルドが成功するようになりました。私が実施した変更を参考程度に示します。

#### `CI.yml`の変更1: 長いパスに対応

hostがWindows-latestである環境のbuildに以下の処理を追加しました。

```sh
git config --system core.longpaths true
```

#### `CI.yml`の変更2: yarn testの削除

targetが `i686-pc-windows-msvc` の場合のみビルド時に`yarn test`が走っています。本来は消すべきではないかもしれませんが、今回はテストコードを書いていないのでとりあえず削除しました。

#### `CI.yml`の変更3: aarch64-apple-darwinにおける一部処理の削除

targetがaarch64-apple-darwinの場合のビルド処理の上5行を削除しました。最終的にビルド処理は以下のようになりました。

```sh
yarn build --target aarch64-apple-darwin
strip -x *.node
```

### 3. 成果物のダウンロード

GitHub Actionsでビルドした各環境のNode.jsアドオンをダウンロードします。
GitHubのリポジトリ > Actions > 最新のワークフローに移動し、ページ最下部のArtifactsのファイルをすべてダウンロードします。
<img src="/images/2022/20221228a/image.png" alt="image.png" width="1200" height="392" loading="lazy">
各ファイルを解凍すると、各環境に合ったNode.jsアドオンが取得できます。

## nodeファイルをまとめて圧縮

1. 適当なディレクトリを作成
1. 対応したい環境のnodeファイルを全て置く
1. napi-rsプロジェクトの`index.d.ts`と`index.js`をコピーしてそのディレクトリにペースト
1. package.jsonを作成 (nameはパッケージ名)
   フォーマッタの名前がuroborosql-fmtであるため、パッケージ名はuroborosql-fmt-napiとしました。

    ```json: package.json
    {
      "name": "uroborosql-fmt-napi",
      "version": "0.0.0",
      "main": "index.js",
      "types": "index.d.ts",
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      }
    }
    ```

1. 以下のコマンドを実行して圧縮

    ```shell
    npm pack
    ```

1. `プロジェクト名-バージョン.tgz`ファイルが生成されれば成功

今回の例では`uroborosql-fmt-napi-0.0.0.tgz`というファイルが生成されました。

# 拡張機能の作成

※再掲
<img src="/images/2022/20221228a/df88766a-9fef-6408-5603-1c17bed7619c_2.png" alt="" width="1200" height="1190" loading="lazy">

TypeScriptからSQLフォーマッタを呼び出すことができるようになったので、次に拡張機能部分を作成します。
本記事では[microsoft/vscode-extension-samples/lsp-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample)をベースにして拡張機能を作成します。

LSPを用いた拡張機能作成方法の詳細を知りたい方は以下をご覧ください。本記事では簡単に解説します。

* [Language Server Protocolを用いたVSCode拡張機能開発 (前編) | フューチャー技術ブログ](/articles/20221124a/)
* [Language Server Protocolを用いたVSCode拡張機能開発 (後編) | フューチャー技術ブログ](/articles/20221125a/)

## 拡張機能の設定

`package.json`を変更して拡張機能の設定を変更します。

まず、VSCodeが起動されると拡張機能が有効になるようにします。

```json package.json
  "activationEvents": [
    "*"
  ],
```

コマンドパレットから「format sql」コマンドを実行できるように設定します。

```json package.json
  "contributes": {
    "commands": [
      {
        "command": "uroborosql-fmt.uroborosql-format",
        "title": "format sql"
      }
    ]
  }
```

## クライアント

`client/src/extension.ts`にクライアント側の処理を記述します。

`clientOptions`内の`documentSelector`を以下のように変更し、全ての形式のファイル、保存されていないUntitledなファイルを拡張機能の対象とします。

```ts client/src/extension.ts
    documentSelector: [
      { pattern: "**", scheme: "file" },
      { pattern: "**", scheme: "untitled" },
    ],
```

`uroborosql-fmt.uroborosql-format`コマンドが実行されたら`uroborosql-fmt.executeFormat`の実行情報とドキュメントのuri、version、選択範囲をサーバに送信する処理を記述します。

```ts client/src/extension.ts
  context.subscriptions.push(
    commands.registerCommand("uroborosql-fmt.uroborosql-format", async () => {
      const uri = window.activeTextEditor.document.uri;
      const version = window.activeTextEditor.document.version;
      const selections = window.activeTextEditor.selections;

      await client.sendRequest(ExecuteCommandRequest.type, {
        command: "uroborosql-fmt.executeFormat",
        arguments: [uri, version, selections],
      });
    })
  );
```

## サーバ

まず先程`npm pack`で取得した`uroborosql-fmt-napi-0.0.0.tgz`をserverディレクトリ内に置きます。
そして、`server/package.json`のdependenciesを以下のように変更します。

```diff package.json
  "dependencies": {
+   "uroborosql-fmt-napi": "file:uroborosql-fmt-napi-0.0.0.tgz",
    "vscode-languageserver": "^7.0.0",
    "vscode-languageserver-textdocument": "^1.0.4"
  }
```

これでRust製SQLフォーマッタをimportできるようになりました。

`server/src/server.ts`にサーバの処理を記述します。
まずフォーマットを実行する関数をimportします。

```ts server/src/server.ts
import { runfmt } from "uroborosql-fmt-napi";
```

コマンド実行時に選択範囲のテキストをフォーマットする処理を記述します。

```ts
// コマンド実行時に行う処理
connection.onExecuteCommand((params) => {
  if (
    params.command !== "uroborosql-fmt.executeFormat" ||
    params.arguments == null
  ) {
    return;
  }
  const uri = params.arguments[0].external;
  // uriからドキュメントを取得
  const textDocument = documents.get(uri);
  if (textDocument == null) {
    return;
  }
  // バージョン不一致の場合はアーリーリターン
  const version = params.arguments[1];
  if (textDocument.version !== version) {
    return;
  }

  const selections = params.arguments[2];
  const changes: TextEdit[] = [];

  // 全ての選択範囲に対して実行
  for (const selection of selections) {
    // テキストを取得
    const text = textDocument.getText(selection);
    if (text.length === 0) {
      continue;
    }

    // フォーマット
    changes.push(TextEdit.replace(selection, runfmt(text)));
  }

  // 選択されていない場合
  if (changes.length === 0) {
    // テキスト全体を取得
    const text = textDocument.getText();
    // フォーマット
    changes.push(
      TextEdit.replace(
        Range.create(
          Position.create(0, 0),
          textDocument.positionAt(text.length)
        ),
        runfmt(text)
      )
    );
  }

  // 変更を適用
  connection.workspace.applyEdit({
    documentChanges: [
      TextDocumentEdit.create(
        { uri: textDocument.uri, version: textDocument.version },
        changes
      ),
    ],
  });
});
```

## 動作確認

クライアントとサーバをコンパイルして実行してみます。

<img src="/images/2022/20221228a/formattest.gif" alt="formattest.gif" width="1200" height="675" loading="lazy">

ちゃんとフォーマットされることが確認できました🎉

# 拡張機能のパッケージ化

vsceというツールを使用してパッケージ化を行います。vsceとはVSCode拡張機能のパッケージ化、公開、管理を行うことができるCLIツールです。

::: note warn
<p>本記事では拡張機能の公開については説明しません。</p>
:::

## vsceのインストール

私の環境(Windows10)ではインストールに手順が必要だったので順に説明します。

### 1. Python3のインストール

Python3が必要なためインストールします。既にPython3が入っている方は次のステップに進んでください。

まず[こちら](https://www.python.org/downloads/)からインストーラをダウンロードします。

<img src="/images/2022/20221228a/image_2.png" alt="image.png" width="1200" height="522" loading="lazy">

ダウンロードしたファイルを開き、**一番下の「Add Python 3.x to PATH」にチェックを入れてください。**
「Install Now」をクリックしてインストールし、「Setup was Succesful」と表示されればインストール完了です。

### 2. node-gypのインストールと設定

[node-gyp](https://github.com/nodejs/node-gyp)とは、Node.js のネイティブアドオンモジュールをコンパイルするためのツールです。既に入っていて設定済みの方は次のステップに進んでください。

#### node-gypのインストール

まずnode-gypをインストールします。

```shell
npm install -g node-gyp
```

### 3. VisualStudioのビルドツールのインストール

次に[こちら](https://visualstudio.microsoft.com/ja/thank-you-downloading-visual-studio/?sku=BuildTools)からVisualStudioのビルドツールのインストーラをダウンロードします。
インストーラを起動して「C++によるデスクトップ開発」を選択して、**右側の「インストールの詳細」の中の「Windows 10 SDK」にチェックを入れて**右下のインストールをクリックします。(Windows11の方は「Windows 11 SDK」にチェックを入れてください。)

<img src="/images/2022/20221228a/image_3.png" alt="image.png" width="1200" height="635" loading="lazy">

### 4. npmの設定

以下を実行します。(2022の部分はダウンロードしたバージョンに合わせて適宜変更して下さい)

```shell
npm config set msvs_version 2022
```

### 5. vsceのインストール

以下を実行します。

```shell
npm install -g vsce
```

vsceコマンドが実行できるようになれば成功です。

## パッケージ化

先程作成した拡張機能のディレクトリで以下のコマンドを実行します。

```
vsce package
```

すると、`プロジェクト名-バージョン.vsix`というファイルが生成されます。今回の例では`uroborosql-fmt-1.0.0.vsix`というファイルが生成されました。

そして、以下のコマンドでインストールします。

```
code --install-extension .\uroborosql-fmt-1.0.0.vsix
```

無事インストールされ、フォーマッタが動くようになったので成功です 🎉

<img src="/images/2022/20221228a/image_4.png" alt="" width="1200" height="629" loading="lazy">

# まとめ

本記事ではRust製SQLフォーマッタをVSCode拡張機能化した方法を紹介しました。

# 参考文献

* [What is Node-API? · The Node-API Resource](https://nodejs.github.io/node-addon-examples/about/what/)
* [Rust + Node-APIでクロスプラットフォーム向けnpmパッケージを公開する - 別にしんどくないブログ](https://shisama.hatenablog.com/entry/2021/12/03/054437)
* [VSCodeの拡張を作ってパッケージ化する - Qiita](https://qiita.com/irico/items/fa60a7e077f4414f0eb6)
* [Publishing Extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
