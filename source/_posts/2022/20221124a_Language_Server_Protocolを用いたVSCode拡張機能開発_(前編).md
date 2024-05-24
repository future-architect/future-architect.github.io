---
title: "Language Server Protocolを用いたVSCode拡張機能開発 (前編)"
date: 2022/11/24 00:00:00
postid: a
tag:
  - LSP
  - VSCode
  - TypeScript
  - SQL
  - フォーマッター
category:
  - Programming
thumbnail: /images/20221124a/thumbnail.png
author: 川渕皓太
lede: "SQLフォーマッタをVSCodeの拡張機能にする作業を行っており、そのための方法を学んでいます。本記事ではLanguage Server Protocolを用いたVSCode拡張機能開発について説明します。。"
---
# はじめに

こんにちは、Futureでアルバイトをしている川渕です。アルバイトの前はFutureのインターンシップでRust製SQLフォーマッタの作成を行っていました(その時の記事は[こちら](/articles/20220916b/))。現在はそのSQLフォーマッタをVSCodeの拡張機能にする作業を行っており、そのための方法を学んでいます。

本記事ではLanguage Server Protocol(以下LSP)を用いたVSCode拡張機能開発について説明します。

前編ではLSPを用いたVSCodeの拡張機能開発チュートリアルと、チュートリアルに使用したサンプルコードの解説を行います。

[後編](/articles/20221125a/)ではサンプルコードに機能を追加する方法を説明します。

# Language Serverとは
Language Serverとは、自動補完、エラーチェック、型チェックなどの様々な言語機能をIDEに提供するものです。


# Language Server Protocol (LSP)とは

[LSP](https://microsoft.github.io/language-server-protocol/)とは2016年6月にMicrosoftが発表したプロトコルで、IDEとLanguage Server間の通信を標準化するものです。

LSPがない場合は各IDEに対応した言語、仕様で言語サーバを実装しなければならず、非常に労力がかかってしまいます。しかし、LSPを使用することで1つの言語サーバを複数のIDEで利用できるようになり、実装言語の制約も無くなります。

つまり、LSPを用いて開発した拡張機能はVSCodeだけでなく、VimやEmacsなどでも使用できます。

<img src="/images/20221124a/lsp-languages-editors.png" alt="lsp-languages-editors.png" width="1162" height="538" loading="lazy">


# 本記事で説明すること
* LSPを用いたVSCodeの拡張機能開発チュートリアル
* チュートリアルコードの解説

# 本記事で説明しないこと
* VSCode以外で使用する方法
* 拡張機能の公開方法

# LSPチュートリアル
まずVSCodeの公式で配布されている[LSPのサンプルコード](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample)を動かしてみます。

### 1. サンプルリポジトリのダウンロード
まず適当なディレクトリで以下のコマンドを実行してVSCode拡張機能サンプルリポジトリをダウンロードします。
```shell
git clone https://github.com/microsoft/vscode-extension-samples.git
```

### 2. 必要なパッケージのインストール
次にnpmを用いて必要なパッケージをインストールします。
1. まず先程ダウンロードしたリポジトリ内のlsp-sampleディレクトリをvscodeで開く
1. Ctrl+@(macOSの場合は^+@)でターミナルを開き、以下を実行する
```shell
npm install
```

### 3. コンパイルと実行

1. Ctrl+Shift+Bでクライアントとサーバをコンパイル
1. Ctrl+Shift+Dで「実行とデバッグ」を開き、Launch Clientを選択する
<img src="/images/20221124a/image.png" alt="" width="1200" height="650" loading="lazy">
1. <font color="MediumSeaGreen">▷</font>をクリックする
1. 新たにVSCodeのウィンドウが開くのでそのVSCode上で適当なテキストファイルを作成
1. テキストファイルで以下の機能が確認できれば完了
    * jと入力すると補完の候補としてJavaScriptが表示される
	<img src="/images/20221124a/image_2.png" alt="" width="682" height="84" loading="lazy">
    * tと入力すると補完の候補としてTypeScriptが表示される
	<img src="/images/20221124a/image_3.png" alt="" width="676" height="74" loading="lazy">
    * 全て大文字、かつ長さが2以上の単語には警告が表示される<br>
	<img src="/images/20221124a/image_4.png" alt="" width="491" height="202" loading="lazy">


### 4. サーバのデバッグ
1. Launch Clientしている状態で「実行とデバッグ」のAttach to Serverを選択
1. <font color="MediumSeaGreen">▷</font>をクリック
<img src="/images/20221124a/image_5.png" alt="" width="1200" height="650" loading="lazy">
1. サーバのブレークポイントが効くようになる
<img src="/images/20221124a/image_6.png" alt="" width="1200" height="650" loading="lazy">


# サンプルコードの解説
先程実行したlsp-sampleの実装について詳しく解説します。

## ファイル構成
ファイル構成は以下の通りです。
extension.tsにクライアントサイドの処理、server.tsにサーバサイドの処理を記述しています。

```sh
.
├── client  # クライアントサイド
│   ├── src
│   │   ├── test # テストコード
│   │   └── extension.ts # クライアントサイドの実装
├── package.json # パッケージ情報
└── server # サーバサイド
    └── src
        └── server.ts # サーバサイドの実装
```

## pakcage.json
クライアントの機能について記述しています。詳しい情報は以下に記載されています。
* [Extension Manifest | Visual Studio Code Extension API](https://code.visualstudio.com/api/references/extension-manifest)

この中から一部のフィールドを説明します。

### name
拡張機能の名前で、今回のサンプルコードではlsp-sampleとなっています。
マーケットプレースでの表示名はdisplayNameで別に設定できます。

### publisher

拡張機能を公開する際に使用するフィールドです。
[vsce](https://github.com/microsoft/vscode-vsce)というVSCode拡張機能用コマンドラインツールで作成したpublisherIDをこのフィールドに入力します。

拡張機能の公開方法は以下に記載されています。

* [Publishing Extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

### categories

拡張機能のカテゴリを入力します。

<details>
<summary>許容するカテゴリ一覧</summary>

* Programming Languages
* Snippets
* Linters
* Themes
* Debuggers
* Formatters
* Keymaps
* SCM Providers
* Other
* Extension Packs
* Language Packs
* Data Science
* Machine Learning
* Visualization
* Notebooks
* Education
* Testing
</details>



### activateEvents
activateEventsに記述したイベントが発生すると、拡張機能が有効になります。
lsp-sampleでのactivateEventsは以下のようになっています。

[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/package.json#L19-L21)

```json package.json
"activationEvents": [
    "onLanguage:plaintext"
]
```

これは、「プレーンテキスト(.txtなど)を開く」というイベントが発生すると拡張機能が有効になることを表しています。
他にもコマンド実行イベントやデバッグイベントなどを登録できます。詳しい情報は以下に記載されています。

* [Activation Events | Visual Studio Code Extension API](https://code.visualstudio.com/api/references/activation-events)

### contributes

拡張機能の機能についての情報を記述します。
詳しい情報は以下に記載されています。

* [Contribution Points | Visual Studio Code Extension API](https://code.visualstudio.com/api/references/contribution-points)

## extension.ts

extension.tsにはクライアント側の処理を記述します。

### 拡張機能の起動時の処理

拡張機能の起動時に関数`activate()`が実行されます。

`activate()`内では接続先のサーバ、クライアントの設定、クライアントの起動処理を行います。

[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/client/src/extension.ts#L18-L58)

```ts extension.ts
export function activate(context: ExtensionContext) {
	// サーバはnodeで実装されているものを使用
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// サーバのデバッグオプション
	// --inspect=6009: VSCodeがサーバにアタッチできるようにサーバをNodeのインスペクタモードで実行
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// デバッグモードで拡張機能を実行するとデバッグオプションが使用される
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// クライアントのオプション
	const clientOptions: LanguageClientOptions = {
        // プレーンテキストのファイルに機能を提供
		documentSelector: [{ scheme: 'file', language: 'plaintext' }],
        // ワークスペース上のクライアント設定が変更された場合にサーバに通知
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// クライアントを作成
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// クライアントを起動 (同時にサーバも起動する)
	client.start();
}
```

ちなみに、lsp-sampleではUntitledなファイル(新規作成した保存されていないファイル)には対応していませんが、`clientOptions`の`documentSelector`を以下のように変更することで対応できます。

```diff extension.js
	// クライアントのオプション
	const clientOptions: LanguageClientOptions = {
        // プレーンテキストのファイルに機能を提供
        documentSelector: [
          { scheme: "file", language: "plaintext" },
+         { scheme: "untitled", language: "plaintext" },
        ],
        // ワークスペース上のクライアント設定が変更された場合にサーバに通知
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};
```

<img src="/images/20221124a/untitled.drawio.png" alt="untitled.drawio.png" width="1200" height="215" loading="lazy">

### 拡張機能の終了時の処理

拡張機能の終了時に関数`deactive()`が実行されます。

lsp-sampleでは関数`deactive()`にクライアントを終了する処理を記述しています。
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/client/src/extension.ts#L60-L65)

```ts extension.ts
export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
```

## server.ts
server.tsにはサーバ側の処理を記述します。

### サーバの接続を作成
サーバの接続を作成し、その接続を監視することで拡張機能を提供します。

* サーバの接続の作成
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L26)

```ts server.ts
const connection = createConnection(ProposedFeatures.all);
```

* 接続の監視
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L229-L230)

```ts server.ts
connection.listen();
```

### ドキュメントマネージャの作成
ドキュメントマネージャとはサーバとクライアントのドキュメントを同期するものです。
ドキュメントマネージャを作成し、ドキュメントの監視を行います。


* ドキュメントマネージャの作成
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L29)

```ts server.ts
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
```
* ドキュメントマネージャの監視
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L227)

```ts server.ts
documents.listen(connection);
```

ドキュメントマネージャはドキュメントを開くイベント、閉じるイベント、変更イベントを検知します。



### 初期化
最初のリクエスト受信時に実行されます。ここでサーバの設定を初期化します。

[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L35-L69)

```ts server.ts
connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	/*
        中略 (クライアントの設定を取得)
    */

    const result: InitializeResult = {
        // サーバの機能
        capabilities: {
            // テキストドキュメントの同期方法の設定
            // 今回は最初に開いたときのみドキュメント全体を読み込み、その後は差分更新が送信されるように設定している
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // クライアントにこのサーバは補完に対応していることを伝える
            completionProvider: {
                resolveProvider: true
            }
        }
    };
    // クライアントがワークスペースに対応している場合
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
			},
		};
	}
	return result;
});
```

### 警告表示機能の実装
lsp-sampleではテキストドキュメントの変更時に全て大文字で、かつ長さが2以上の単語を特定し、その箇所に警告を表示します。
この機能の実装方法について説明します。

テキストドキュメントが変更、または初めて開かれた場合にこのメソッドが呼び出されます。

[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L131-L135)

```ts server.ts
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});
```
このメソッド内で呼び出している関数`validateTextDocument`の処理は以下の通りです。

[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L137-L182)

```ts server.ts
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// ドキュメントの設定を取得
	const settings = await getDocumentSettings(textDocument.uri);

	// 長さが2以上の全て大文字の単語に対して診断を発行する
	const text = textDocument.getText();
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
            // 診断の強さ。今回は警告。
			severity: DiagnosticSeverity.Warning,
            // 診断の範囲。今回は該当の単語の開始位置から終了位置までを範囲としている。
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length),
			},
            // 診断のメッセージ
			message: `${m[0]} is all uppercase.`,
            // 診断がどこから発行されたかを示す文字列
			source: 'ex',
		};
        // クライアントが診断の関連情報を受け取るように設定している場合、関連情報を付与する。
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range),
					},
					message: 'Spelling matters',
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range),
					},
					message: 'Particularly for names',
				},
			];
		}
		diagnostics.push(diagnostic);
	}

	// 診断を表示する
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
```
診断メッセージ、診断の発行元、関連情報は以下のように表示されます。
<img src="/images/20221124a/warning.drawio.png" alt="warning.drawio.png" width="644" height="268" loading="lazy">


### 補完機能の実装

lsp-sampleでは"TypeScript"、"JavaScript"という2つの単語の補完を提供します。

補完は`connection`の`onCompletion`メソッドで提供します。
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L189-L208)

```ts server.ts
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1,
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2,
			},
		];
	}
);
```

また、`onCompletionResolve`メソッドに各補完が選択された場合に表示する情報を記述しています。
[GitHub](https://github.com/microsoft/vscode-extension-samples/blob/fdd3bb95ce8e38ffe58fc9158797239fdf5017f1/lsp-sample/server/src/server.ts#L210-L223)

```ts server.ts
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data === 1) {
        // "TypeScript"が選択された場合
		item.detail = 'TypeScript details';
		item.documentation = 'TypeScript documentation';
	} else if (item.data === 2) {
        // "JavaScript"が選択された場合
		item.detail = 'JavaScript details';
		item.documentation = 'JavaScript documentation';
	}
	return item;
});
```
補完、追加情報は以下のように表示されます。
<img src="/images/20221124a/hokan.drawio_(1).png" alt="" width="816" height="205" loading="lazy">


# まとめ
LSPを用いたVSCodeの拡張機能開発チュートリアルとチュートリアルコードの解説を行いました。

[後編](/articles/20221125a/) ではlsp-sampleに機能を追加する方法を説明しています。

# 参考文献

* [Language Server Protocol開発チュートリアル - Qiita](https://qiita.com/Ikuyadeu/items/98458f9ab760d09660ff)
* [Language Server Extension Guide | Visual Studio Code Extension API](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)
* [language server protocolについて (前編) - Qiita](https://qiita.com/atsushieno/items/ce31df9bd88e98eec5c4)
* [Pyright を LSP サーバとした自作 LSP クライアント（実装編） | フューチャー技術ブログ](https://future-architect.github.io/articles/20220303a/)
* [Pyright を LSP サーバとした自作 LSP クライアント（調査編） | フューチャー技術ブログ](https://future-architect.github.io/articles/20220302a/)




