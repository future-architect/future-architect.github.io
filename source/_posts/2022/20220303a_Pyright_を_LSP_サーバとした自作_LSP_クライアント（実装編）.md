---
title: "Pyright を LSP サーバとした自作 LSP クライアント（実装編）"
date: 2022/03/03 00:00:00
postid: a
tag:
  - Python
  - LSP
  - Pyright
category:
  - Programming
thumbnail: /images/20220303a/thumbnail.png
author: 空閑康太
lede: "Pyright を LSP  サーバとした自作クライアントを実装しますが、その前に経緯について説明します。アルバイトの前は、Future のインターン Engineer Camp で Python のソースコード解析に取り組んでいました。当時は Python の AST モジュールを活用する方針で、それ以外は自前で解析を行っていました。アルバイトでも引き続き解析に取り組んでいますが、次第に型推論などの技術が必要になってきており、全てを自前で実装することは困難な状況です。そこで現在は、既存のツールを拡張する方針を取っています。ツールの候補としては、Mypy および Pyright が挙がりましたが..."
---

<img src="/images/20220303a/PyrightLarge.png" alt="" width="565" height="234">

# はじめに
こんにちは、Future でアルバイトをしている空閑と申します。本記事ではタイトルの通り、Pyright を LSP (Language Server Protocol) サーバとした自作クライアントを実装しますが、その前に経緯について説明します。本節では実装については触れません。

アルバイトの前は、Future のインターン Engineer Camp で Python のソースコード解析に取り組んでいました。そのときの様子は、[Engineer Camp2021: Python の AST モジュールを使ってクラス構造を可視化する](/articles/20211019a/) で触れています。当時は Python の AST モジュールを活用する方針で、それ以外は自前で解析を行っていました。アルバイトでも引き続き解析に取り組んでいますが、次第に型推論などの技術が必要になってきており、全てを自前で実装することは困難な状況です。そこで現在は、既存のツールを拡張する方針を取っています。

ツールの候補としては、Mypy および Pyright が挙がりましたが、検討の結果（[Mypy と Pyright の解析比較](/articles/20220301a/)）Pyright を拡張することにしています。Pyright は Pylance 上での実行を前提としているため、入力補完などで使う、型チェックにとどまらない情報を取得できることが理由の一つです。また、Pyright には LSP での実装が存在するため、これを利用することで、Pyright 本体の実装に手を加える必要がなく、システムを疎結合に保てます。

問題は、LSP クライアントをエディタ（主に VSCode）以外で実装するサンプルがほとんどないことです。解析ツールはコマンドラインで動作するようにしたいため、エディタ依存の機能は使えません。[LSP の仕様](https://microsoft.github.io/language-server-protocol/specifications/specification-current/)は公開されているものの、詳細な手順については記載がありません。特に Pyright における初期化の手順は、実際の実装を追う必要があり苦戦しました。次節以降では、初期化の手順を含めた自作 LSP クライアントの実装方法を紹介します。

# 自作 LSP クライアントの作成

## 仕様
- 解析対象：Python
- LSP サーバ：Pyright
- LSP クライアント：CLI（Node.js, TypeScript）
- 目標
    - サーバ・クライアント間のメッセージ送受信
    - メッセージによる簡単な解析結果の取得

## 最低限実装が必要なメッセージ
1. [Initialize Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#initialize)：サーバの初期化を要求
2. [Initialized Notification](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#initialized)：クライアント側の初期化が完了したことを通知
3. [DidChangeWorkspaceFolders Notification](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#workspace_didChangeWorkspaceFolders)：ワークスペースフォルダの変更を通知

詳しくは [Pyright を LSP サーバとした自作 LSP クライアント（調査編）](/articles/20220302a/)を参照してください。


# 実装
## サーバ起動・メッセージ受信
LSP サーバのパスを指定し、子プロセスで起動します。Pyright のリポジトリをクローンした場合、サーバのパスは `pyright/packages/pyright/langserver.index.js` です。Pyright は実行時引数で通信方法を指定できます。`--node-ipc`、`--stdio`、`--socket={number}` から選ぶことができますが、今回は `--node-ipc` を採用します。

接続を確立するために [`vscode-jsonrpc`](https://www.npmjs.com/package/vscode-jsonrpc) の `createMessageConnection` を使います。`vscode-jsonrpc` はメッセージプロトコルのライブラリで、今後もたびたび出てきます。`setup(connection)` ではメッセージハンドラを定義します。最初なのでとりあえず、`notification` と `error` メッセージが来た時に内容を出力することにします。

```typescript client.ts
import * as child_process from 'child_process';
import * as path from 'path';
import * as rpc from 'vscode-jsonrpc/node';

function setup(connection: rpc.MessageConnection) {
    connection.onUnhandledNotification((e) => {
        console.log('notification', e);
    });
    connection.onError((e) => {
        console.log('error', e);
    });
}

export function main() {
    const modulePath = path.resolve('/path/to/langserver.index.js');
    const childProcess = child_process.fork(modulePath, ['--node-ipc']);
    const connection = rpc.createMessageConnection(
        new rpc.IPCMessageReader(childProcess),
        new rpc.IPCMessageWriter(childProcess)
    );
    setup(connection);
    connection.listen();
}
main();
```

以上のコードを実際に実行すると、サーバが起動したことを通知するメッセージを `window/logMessage` メソッドで受信できます。

```js
{
    jsonrpc: '2.0',
    method: 'window/logMessage',
    params: {type: 3, message: 'Pyright language server 1.1.182 starting'}
}
```

## Initialize Request
今はまだ起動してメッセージを受信するだけのプログラムなので、今度はメッセージを送信してみます。仕様では最初に Initialize Request を送ることになっているので、これを実装します。サーバにリクエストを送る場合には `connection.sendRequest(type, params)` を使います。`type` はメソッドの種類、`params` はメソッド固有のパラメタになります。これらの型定義は [`vscode-languageserver-protocol`](https://www.npmjs.com/package/vscode-languageserver-protocol) にあるので、適当に参照します。

`InitializeParams` にはいくつかのプロパティがありますが、最低限実装すべきは次の 4 つです。

1. `processId`（サーバの親プロセスの ID）
2. `rootUri`（解析したいワークスペースのルート URI、適当でよいです）
3. `capabilities`（クライアントが実装している機能、無いので空）
4. `workspaceFolders`（解析したいワークスペースのフォルダ、とりあえず空）

```ts client.ts
import ...
import * as url from 'url';
import * as lsp from 'vscode-languageserver-protocol';

class InitializeParams implements lsp.InitializeParams {
    processId: number;
    rootUri: string;
    capabilities: lsp.ClientCapabilities;
    workspaceFolders: lsp.WorkspaceFolder[] | null;
    constructor() {
        this.processId = process.pid;
        this.rootUri = url.pathToFileURL(path.resolve('./')).toString();
        this.capabilities = {};
        this.workspaceFolders = null;
    }
}

function setup(connection: rpc.MessageConnection) {
    ...
}

export async function main() {
    ...
    connection.listen();
    const initializeResult = await connection.sendRequest(lsp.InitializeRequest.type, new InitializeParams());
    console.log('initialize', initializeResult);
}
main();
```

Initialize Request が正しく送れていると、Initialize Result が返ってきます。こちらにも `capabilities` が含まれていますが、これはサーバ側で実装されている機能の一覧になります。

```js
{
    capabilities: {
        textDocumentSync: 2,
        definitionProvider: {…},
        declarationProvider: {…},
        referencesProvider: {…},
        …
    }
}
```

## Initialized Notification
次は Initialize Result を受けて、クライアント側の初期化が終わったことを通知するために Initialized Notification を送信します。サーバに通知を送る場合には `connection.sendNotification(type, params)` を使います。`InitializedParams` は空のオブジェクトなので実装はしないで `{}` を直接入力することにします。

```typescript client.ts
import ...

class InitializeParams implements lsp.InitializeParams {
    ...
}

function setup(connection: rpc.MessageConnection) {
    ...
}

export async function main() {
    ...
    const initializeResult = await connection.sendRequest(lsp.InitializeRequest.type, new InitializeParams());
    console.log('initialize', initializeResult);
    connection.sendNotification(lsp.InitializedNotification.type, {});
}
main();
```

Initialized Notification を送ると、`client/registerCapability` メソッドのメッセージが送られてきます。これはサーバがクライアントに対して機能追加を要求するメッセージになります。今はまだ、このメソッドに対するハンドラを定義していないので、ハンドラを定義して受信できるようにします。

```typescript client.ts
import ...

class InitializeParams implements lsp.InitializeParams {
    ...
}

function setup(connection: rpc.MessageConnection) {
    ...
    connection.onRequest(lsp.RegistrationRequest.type, (e) => {
        console.log('client/registerCapability', e);
    });
}

export async function main() {
    ...
}
main();
```

すると、以下のような内容のメッセージを受信したことがわかります。次はこのメソッドを実装します。

```js
{
    id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    method: 'workspace/didChangeWorkspaceFolders',
    registerOptions: {}
}
```


## DidChangeWorkspaceFolders Notification
ワークスペースフォルダを変更するメソッドを実装します。これを実行することで、解析対象のフォルダを変更することができます。`InitializeParams` 同様に `DidChangeWorkspaceFoldersParams` を実装します。プロパティは多いですが、単にワークスペースとして認識するフォルダの追加と削除を行っているだけです。また、DidChangeWorkspaceFolders Notification はデフォルトではサーバ側から認識されないため、`InitializeParams.capabilities` にワークスペース機能があることを記載します。詳細は、[Pyright を LSP サーバとした自作 LSP クライアント（調査編）](/articles/20220302a/)で解説しています。

```ts client.ts
import ...

class InitializeParams implements lsp.InitializeParams {
    ...
    constructor() {
        this.capabilities = { workspace: { workspaceFolders: true } };
    }
}

class WorkspaceFoldersChangeEvent implements lsp.WorkspaceFoldersChangeEvent {
    constructor(public added: lsp.WorkspaceFolder[], public removed: lsp.WorkspaceFolder[]) {}
}

class WorkspaceFolder implements lsp.WorkspaceFolder {
    constructor(public uri: string, public name: string) {}
}

class DidChangeWorkspaceFoldersParams implements lsp.DidChangeWorkspaceFoldersParams {
    event: WorkspaceFoldersChangeEvent;
    constructor(added: lsp.WorkspaceFolder[], removed: lsp.WorkspaceFolder[]) {
        this.event = new WorkspaceFoldersChangeEvent(added, removed);
    }
}

function setup(connection: rpc.MessageConnection) {
    ...
    connection.onRequest(lsp.RegistrationRequest.type, (e) => {
        console.log('client/registerCapability', e);
        connection.sendNotification(
            lsp.DidChangeWorkspaceFoldersNotification.type,
            new DidChangeWorkspaceFoldersParams(
                [new WorkspaceFolder(url.pathToFileURL(path.resolve('./')).toString(), 'dev')],
                []
            )
        );
    });
}

export async function main() {
    ...
}
main();
```

実装が上手くいっていれば、DidChangeWorkspaceFolders Notification を送信したタイミングで、`window/logMessage` メソッドのメッセージが大量に受信できると思います。主に解析対象のファイルや、仮想環境の情報を通知してくれています。

```
Assuming Python platform Windows
Searching for source files
Auto-excluding \path\to\.venv
Auto-excluding \path\to\myvenv
Found {number} source files
```

## 解析メッセージ
以上で、解析に必要な初期化メッセージをすべて実装したことになり、ここから先は自由にメッセージを送信できます。今回は最近のエディタでよく見かける、[Hover Request](https://microsoft.github.io/language-server-protocol/specification#textDocument_hover) を送信してみます。[FastAPI](https://fastapi.tiangolo.com/ja/) を使用した以下のファイルを対象にします。

```py main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
async def hello():
    return {"message": "hello world!"}
```

今までと同様に、`HoverParams` を実装し適切な引数でメッセージを送信します。今回はテストなので、引数は手動で設定します。`Position.create(2, 6)` は 0-based で行数と文字数を指定しており、3 行目の 7 文字目、`FastAPI()` にカーソル位置があることを示しています。

```typescript client.ts
class HoverParams implements lsp.HoverParams {
    constructor(public textDocument: lsp.TextDocumentIdentifier, public position: lsp.Position) {}
}

connection.sendRequest(
    lsp.HoverRequest.type,
    new HoverParams(
        lsp.TextDocumentIdentifier.create(url.pathToFileURL(path.resolve('./main.py')).toString()),
        lsp.Position.create(2, 6)
    )
).then((e) => {
    console.log(e);
});
```

実行すると以下のようなメッセージが受信でき、カーソルを合わせた時のような情報が得られました。

```js
{
    contents: {
        kind: 'plaintext'
        value: '(class) FastAPI(*, debug: bool = False, routes: List[BaseRoute] | None = None, title: str = "FastAPI", description: str = "", version: str = "0.1.0", openapi_url: str | None = "/openapi.json", openapi_tags: List[Dict[str, Any]] | None = None, servers: List[Dict[str, str | Any]] | None = None, dependencies: Sequence[Depends] | None = None, default_response_class: Type[Response] = Default(JSONResponse), docs_url: str | None = "/docs", redoc_url: str | None = "/redoc", swagger_ui_oauth2_redirect_u…one = None, on_startup: Sequence[() -> Any] | None = None, on_shutdown: Sequence[() -> Any] | None = None, terms_of_service: str | None = None, contact: Dict[str, str | Any] | None = None, license_info: Dict[str, str | Any] | None = None, openapi_prefix: str = "", root_path: str = "", root_path_in_servers: bool = True, responses: Dict[int | str, Dict[str, Any]] | None = None, callbacks: List[BaseRoute] | None = None, deprecated: bool | None = None, include_in_schema: bool = True, **extra: Any)'
    }
    range: {
        end: {line: 2, character: 13}
        start: {line: 2, character: 6}
    }
}
```

## 全体の実装

<details>
  <summary>長いので折り畳み</summary>
  <div>

```js client.ts
import * as child_process from 'child_process';
import * as path from 'path';
import * as url from 'url';
import * as rpc from 'vscode-jsonrpc/node';
import * as lsp from 'vscode-languageserver-protocol';

class InitializeParams implements lsp.InitializeParams {
    processId: number;
    rootUri: string;
    capabilities: lsp.ClientCapabilities;
    workspaceFolders: lsp.WorkspaceFolder[] | null;
    constructor() {
        this.processId = process.pid;
        this.rootUri = url.pathToFileURL(path.resolve('./')).toString();
        this.capabilities = { workspace: { workspaceFolders: true } };
        this.workspaceFolders = null;
    }
}

class WorkspaceFoldersChangeEvent implements lsp.WorkspaceFoldersChangeEvent {
    constructor(public added: lsp.WorkspaceFolder[], public removed: lsp.WorkspaceFolder[]) {}
}

class WorkspaceFolder implements lsp.WorkspaceFolder {
    constructor(public uri: string, public name: string) {}
}

class DidChangeWorkspaceFoldersParams implements lsp.DidChangeWorkspaceFoldersParams {
    event: WorkspaceFoldersChangeEvent;
    constructor(added: lsp.WorkspaceFolder[], removed: lsp.WorkspaceFolder[]) {
        this.event = new WorkspaceFoldersChangeEvent(added, removed);
    }
}

class HoverParams implements lsp.HoverParams {
    constructor(public textDocument: lsp.TextDocumentIdentifier, public position: lsp.Position) {}
}

function setup(connection: rpc.MessageConnection) {
    connection.onUnhandledNotification((e) => {
        console.log('notification', e);
    });
    connection.onError((e) => {
        console.log('error', e);
    });
    connection.onNotification(lsp.LogMessageNotification.type, (e) => {
        console.info(e.message);
    });
    connection.onRequest(lsp.RegistrationRequest.type, (e) => {
        console.log('client/registerCapability', e);
        connection.sendNotification(
            lsp.DidChangeWorkspaceFoldersNotification.type,
            new DidChangeWorkspaceFoldersParams(
                [new WorkspaceFolder(url.pathToFileURL(path.resolve('./')).toString(), 'dev')],
                []
            )
        );
        connection
            .sendRequest(
                lsp.HoverRequest.type,
                new HoverParams(
                    lsp.TextDocumentIdentifier.create(url.pathToFileURL(path.resolve('./main.py')).toString()),
                    lsp.Position.create(2, 6)
                )
            )
            .then((e) => {
                console.log(e);
            });
    });
}

export async function main() {
    const modulePath = path.resolve('./packages/cli-pyright/langserver.index.js');
    const childProcess = child_process.fork(modulePath, ['--node-ipc']);
    const connection = rpc.createMessageConnection(
        new rpc.IPCMessageReader(childProcess),
        new rpc.IPCMessageWriter(childProcess)
    );
    setup(connection);
    connection.listen();
    const initializeResult = await connection.sendRequest(lsp.InitializeRequest.type, new InitializeParams());
    console.log('initialize', initializeResult);
    connection.sendNotification(lsp.InitializedNotification.type, {});
}
main();
```
</div>
</details>

# 感想
今回は、自作の LSP クライアントを実装しました。機能としては不十分ですが、遊ぶ分には楽しめると思います。本来の目的は既存のメッセージを組み合わせての解析なのですが、実際のところかなり面倒です…。LSP が解析目的のプロトコルではないので当然ですが。現在は Pyright 内部をいじることも検討しているので、LSP サーバ側の実装についても今後機会があれば紹介したいと思います。

# 参考

* https://microsoft.github.io/language-server-protocol/
* https://docs.microsoft.com/en-us/visualstudio/extensibility/language-server-protocol?view=vs-2022
* https://qiita.com/atsushieno/items/ce31df9bd88e98eec5c4
* https://qiita.com/Ladicle/items/e666e3fb9fae9d807969
* https://zenn.dev/takl/books/0fe11c6e177223
* https://github.com/tennashi/lsp_spec_ja
