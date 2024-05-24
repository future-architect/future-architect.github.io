---
title: "Language Server Protocolを用いたVSCode拡張機能開発 (後編)"
date: 2022/11/25 00:00:00
postid: a
tag:
  - LSP
  - VSCode
  - TypeScript
  - SQL
  - フォーマッター
category:
  - Programming
thumbnail: /images/20221125a/thumbnail.png
author: 川渕皓太
lede: "こんにちは、Futureでアルバイトをしている川渕です。[前編]ではLSPを用いたVSCode拡張機能開発チュートリアルとサンプルコードの解説を行いました。後編では前編で解説した[lsp-sample]に機能を追加する方法について説明します。"
---
# はじめに

こんにちは、Futureでアルバイトをしている川渕です。

[前編](/articles/20221124a/)ではLSPを用いたVSCode拡張機能開発チュートリアルとサンプルコードの解説を行いました。

後編では前編で解説した[lsp-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample)に機能を追加する方法について説明します。


# 説明すること
* コードアクションで実行できる機能の追加方法
* フォーマット時に実行する機能の追加方法
* コマンドで実行できる機能の追加方法

# 説明しないこと
* 上記以外の機能の追加方法

# コードアクションで実行できる機能を追加
lsp-sampleでは全て大文字、かつ2文字以上の単語に対して警告を表示していました。その単語を小文字に自動修正するクイックフィックスを作成します。

## 実装 (server.ts)

server.tsに以下のimportを追加します。

```diff server.ts
import {
  /* 略 */
+ CodeAction,
+ TextEdit,
+ TextDocumentEdit,
+ CodeActionKind,
} from "vscode-languageserver/node";
```

`connection.onInitialize`の`result`を以下のように変更します。
```diff  server.ts
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
+     // コードアクション
+     codeActionProvider: true,
    },
  };
```


コードアクション時に呼び出されるメソッドである`onCodeAction()`を追加します。
```ts server.ts
connection.onCodeAction((params) => {
  const only: string | undefined =
    params.context.only != null && params.context.only.length > 0
      ? params.context.only[0]
      : undefined;

  // コードアクションの種類がクイックフィックスでない場合はアーリーリターン
  if (only !== CodeActionKind.QuickFix) {
    return;
  }

  // この拡張機能が生成した警告のみを対象とする
  // lsp-sampleで生成した警告の発行元は"ex"であるのでこれでフィルタリング
  const diagnostics = params.context.diagnostics.filter(
    (diag) => diag.source === "ex"
  );

  // uriからドキュメントを取得
  const textDocument = documents.get(params.textDocument.uri);
  if (textDocument == null || diagnostics.length === 0) {
    return [];
  }

  const codeActions: CodeAction[] = [];

  // 各警告に対して処理
  diagnostics.forEach((diag) => {
    const title = "Fix to lower case";
    // 警告範囲のテキスト、つまり大文字のみで構成された単語を取得
    const originalText = textDocument.getText(diag.range);
    // 警告範囲のテキストを小文字に変換したものに置換する処理の生成
    const edits = [TextEdit.replace(diag.range, originalText.toLowerCase())];
    const editPattern = {
      documentChanges: [
        TextDocumentEdit.create(
          { uri: textDocument.uri, version: textDocument.version },
          edits
        ),
      ],
    };
    // コードアクションを生成
    const fixAction = CodeAction.create(
      title,
      editPattern,
      CodeActionKind.QuickFix
    );
    // コードアクションと警告を関連付ける
    fixAction.diagnostics = [diag];
    codeActions.push(fixAction);
  });

  return codeActions;
});
```

## 動作確認
診断に「利用できるクイックフィックス」が追加されます。

<img src="/images/20221125a/codeAction.drawio.png" alt="codeAction.drawio.png" width="1200" height="230" loading="lazy">

クイックフィックスを実行するとその単語が小文字に自動で修正されます。

<img src="/images/20221125a/toLower.gif" alt="toLower.gif" width="1200" height="675" loading="lazy">



# フォーマット時に実行する機能を追加
フォーマットを実行すると`Formatting has been executed. (linecount: ${行数})`という文字列がファイルの先頭に挿入される機能を作成します。

## 実装 (server.ts)
server.tsに以下のimportを追加します。

```diff server.ts
import {
  /* 略 */
+ Position
} from "vscode-languageserver/node";
```

`connection.onInitialize`の`result`を以下のように変更します。

```diff  server.ts
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      // コードアクション
      codeActionProvider: true,
+     // フォーマット
+     documentFormattingProvider: true,
    },
  };
```

ドキュメントのフォーマット時に呼び出されるメソッドである`onDocumentFormatting()`を追加します。
```ts server.ts
connection.onDocumentFormatting((params) => {
  // uriからドキュメントを取得
  const textDocument = documents.get(params.textDocument.uri);
  if (textDocument == null) {
    return;
  }
  // ドキュメントの行数を取得
  const lineCount = textDocument.lineCount;
  // 挿入する文字列
  const insertText = `save successful!(lineCount: ${lineCount})\n`;

  return [TextEdit.insert(Position.create(0, 0), insertText)];
});
```

## 動作確認
フォーマットを実行するとFormatting has been executed. (linecount: ${行数})という文字列がファイルの先頭に挿入されるようになります。
<img src="/images/20221125a/format.gif" alt="format.gif" width="1200" height="675" loading="lazy">



# コマンドで実行できる機能を追加
コマンドを実行すると選択範囲が反転する機能を作成します。選択範囲がない場合はテキスト全体を反転するように設計します。

## 大まかな処理の流れ
今回実装する処理には、編集中のドキュメントの情報、エディタ上での選択範囲の情報が必要ですが、コマンド実行情報にはそのような情報がなく、サーバ側で取得することもできません。
そのため、クライアント側でコマンドを受け、必要な追加情報をサーバに送ることで実装します。
(「コマンドを実行した」という情報のみが必要な場合は追加情報を送る必要はありません。)

<img src="/images/20221125a/shori_(1).png" alt="" width="1200" height="223" loading="lazy">

GitHubに上がっているコードを参考にしたところ、2通りの実装方法を見つけたので両方紹介しようと思います。

参考にしたリポジトリ:

* 実装1: [vscode-eslint](https://github.com/microsoft/vscode-eslint) ([該当箇所](https://github.com/microsoft/vscode-eslint/blob/4b92c12af15d41f76417bde9571cb56f08ec3d0f/client/src/client.ts#L330-L347))
* 実装2: [lsp-user-input-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-user-input-sample) ([該当箇所](https://github.com/microsoft/vscode-extension-samples/blob/ddae6c0c9ff203b4ed6f6b43bfacdd0834215f83/lsp-user-input-sample/client/src/extension.ts#L23-L33))

両方のリポジトリにおいて該当箇所を[dbaeumerさん](https://github.com/dbaeumer)(VSCodeのLSPの中の人)という方が書いているので、どちらの実装方法も正しいと思います。(適切な使い分けについては調査しましたがわかりませんでした。もしわかる方がいたら教えてください。)


## package.jsonの変更
lsp-sample.reveseコマンドをコマンドパレットで実行できるようにします。この変更は2つの実装で共通です。

まず、package.jsonのactivationEventsフィールドに以下を追加し、lsp-sample.reverseコマンドが実行された場合も拡張機能が有効になるように変更します。

```diff  package.json
  "activationEvents": [
    "onLanguage:plaintext",
+   "onCommand:lsp-sample.reverse"
  ],
```

次に、contributesフィールドに以下を追加し、コマンドパレットからlsp-sample.reverseコマンドを実行できるようにします。
VSCode上ではtitleに入力した文字列がコマンド名として表示されます。

```diff  package.json
  "contributes": {
+   "commands": [
+     {
+       "command": "lsp-sample.reverse",
+       "title": "reverse text"
+     }
+   ],
```




## 実装1: クライアントでコマンドを送り直す実装
### 処理の流れ
実装1では以下のようにクライアントからサーバへコマンドを送り直すことで実装します。

1. ユーザがコマンドパレットでlsp-sample.reverseコマンドを実行する
1. クライアント側で実行を検知し、サーバにlsp-sample.executeReverseコマンドと以下の情報を送信する
    * アクティブなエディタが編集中のドキュメントのURI(識別子)
    * アクティブなエディタが編集中のドキュメントのバージョン
    * アクティブなエディタ上での選択範囲
1. lsp-sample.executeCommandを検知したサーバは、受け取った情報を基に選択範囲を反転する処理を実行する


### 実装 (extension.ts)
lsp-sample.reverseコマンドを受け取った際にlsp-sample.executeReverseコマンドと選択範囲などの情報をサーバに送信する処理を実装します。

まず以下のimportを追加します。

```diff  extension.ts
import {
  workspace,
  ExtensionContext,
+ window,
+ commands
} from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
+ ExecuteCommandRequest,
} from "vscode-languageclient/node";
```

拡張機能の起動時に実行される関数`activate()`の`client.start()`の直前に以下を追加します。
```ts  extension.ts
  // reverse実行時にserverにexecuteReverseコマンドを送信する
  context.subscriptions.push(
    commands.registerCommand("lsp-sample.reverse", async () => {
      const uri = window.activeTextEditor.document.uri;
      const version = window.activeTextEditor.document.version;
      const selections = window.activeTextEditor.selections;

      await client.sendRequest(ExecuteCommandRequest.type, {
        command: "lsp-sample.executeReverse",
        arguments: [uri, version, selections],
      });
    })
  );
```
この実装によって、クライアント側でlsp-sample.reverseが実行された際にサーバにlsp-sample.executeReverseコマンドと、uri、選択範囲を送信する処理が実現できました。

### 実装 (server.ts)
lsp-sample.executeReverseコマンドを受け取った際に引数情報を基に選択範囲を反転する処理を実装します。

まず以下のimportを追加します。

```diff server.ts
import {
  /* 略 */
+ Range
} from "vscode-languageserver/node";
```

コマンド実行時に呼び出されるメソッドである`onExecuteCommand()`を追加します。
ここで送信されたドキュメントと取得したドキュメントのバージョンが一致するかどうか確認することで、非同期処理中の変更による処理のズレを防いでいます。

```ts server.ts
// コマンド実行時に行う処理
connection.onExecuteCommand((params) => {
  // lsp-sample.executeReverseコマンドでない場合はアーリーリターン
  if (
    params.command !== "lsp-sample.executeReverse" ||
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

  // 選択範囲
  const selections = params.arguments[1];
  const changes: TextEdit[] = [];

  // 全ての選択範囲に対して実行
  for (const selection of selections) {
    // 選択範囲のテキストを取得
    const text = textDocument.getText(selection);
    if (text.length === 0) {
      continue;
    }
    // 反転
    const reversed = text.split("").reverse().join("");
    changes.push(TextEdit.replace(selection, reversed));
  }

  // 選択範囲がない場合はテキスト全体を反転
  if (changes.length === 0) {
    // テキスト全体を取得
    const text = textDocument.getText();
    // 反転
    const reversed = text.split("").reverse().join("");
    changes.push(
      TextEdit.replace(
        Range.create(
          Position.create(0, 0),
          textDocument.positionAt(text.length)
        ),
        reversed
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

## 実装2: middlewareを用いた実装

### 処理の流れ

実装2ではmiddlewareという機能を用いて、クライアント側でコマンド実行情報に情報を追加することで実装します。

1. ユーザがコマンドパレットでlsp-sample.reverseコマンドを実行する
1. クライアント側で以下の情報を追加する
    * アクティブなエディタが編集中のドキュメントのURI(識別子)
    * アクティブなエディタが編集中のドキュメントのバージョン
    * アクティブなエディタ上での選択範囲
1. lsp-sample.reverseコマンドを検知したサーバは受け取った情報を基に選択範囲を反転する処理を実行する

### 実装 (extension.ts)
まず以下のimportを追加します。

```diff  extension.ts
import {
  workspace,
  ExtensionContext,
+ window,
} from "vscode";
```
拡張機能の起動時に実行される関数`activate()`の`clientOptions`を以下のように変更します。

```diff  extension.ts
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: "file", language: "plaintext" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
+  middleware: {
+     executeCommand: async (command, args, next) => {
+       const uri = window.activeTextEditor.document.uri;
+       const version = window.activeTextEditor.document.version;
+       const selections = window.activeTextEditor.selections;
+
+       return next(command, [...args, uri, version, selections]);
+     },
+   },
  };
```

### 実装 (server.ts)
lsp-sample.executeReverseコマンドを受け取った際に引数情報を基に選択範囲を反転する処理を実装します。

まず以下のimportを追加します。

```diff server.ts
import {
  /* 略 */
+ Range
} from "vscode-languageserver/node";
```

connection.onInitializeのresultを以下のように変更し、サーバがlsp-sample.reverseの実行をサポートすることをクライアントに伝えます。

```diff  server.ts
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      // コードアクション
      codeActionProvider: true,
      // フォーマット
      documentFormattingProvider: true,
+     // コマンド
+     executeCommandProvider: {
+       commands: ["lsp-sample.reverse"],
+     },
    },
  };
```

コマンド実行時に呼び出されるメソッドである`onExecuteCommand()`を追加します。

```ts  server.ts
// コマンド実行時に行う処理
connection.onExecuteCommand((params) => {
  // lsp-sample.reverseコマンドでない場合はアーリーリターン
  if (
    params.command !== "lsp-sample.reverse" ||
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

  // 選択範囲
  const selections = params.arguments[1];
  const changes: TextEdit[] = [];

  // 全ての選択範囲に対して実行
  for (const selection of selections) {
    // 選択範囲のテキストを取得
    const text = textDocument.getText(selection);
    if (text.length === 0) {
      continue;
    }
    // 反転
    const reversed = text.split("").reverse().join("");
    changes.push(TextEdit.replace(selection, reversed));
  }

  // 選択範囲がない場合はテキスト全体を反転
  if (changes.length === 0) {
    // テキスト全体を取得
    const text = textDocument.getText();
    // 反転
    const reversed = text.split("").reverse().join("");
    changes.push(
      TextEdit.replace(
        Range.create(
          Position.create(0, 0),
          textDocument.positionAt(text.length)
        ),
        reversed
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
任意の範囲を選択肢、コマンドパレットでreverse textを実行すると、選択範囲が反転されます。また、範囲を選択していない場合はドキュメント全体が反転されます。
<img src="/images/20221125a/reverse.gif" alt="" width="1200" height="675" loading="lazy">

# まとめ
LSPを用いた拡張機能のサンプルコードに機能を追加する方法を解説しました。

LSPを用いたVSCodeの拡張機能の開発に関する日本語記事はまだまだ少ないので、この記事が少しでも開発の助けになれば幸いです。


# 参考文献
* [Language Server Protocol開発チュートリアル - Qiita](https://qiita.com/Ikuyadeu/items/98458f9ab760d09660ff)
* [Language Server Extension Guide | Visual Studio Code Extension API](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)
* [language server protocolについて (前編) - Qiita](https://qiita.com/atsushieno/items/ce31df9bd88e98eec5c4)
* [Pyright を LSP サーバとした自作 LSP クライアント（実装編） | フューチャー技術ブログ](https://future-architect.github.io/articles/20220303a/)
* [Pyright を LSP サーバとした自作 LSP クライアント（調査編） | フューチャー技術ブログ](https://future-architect.github.io/articles/20220302a/)


