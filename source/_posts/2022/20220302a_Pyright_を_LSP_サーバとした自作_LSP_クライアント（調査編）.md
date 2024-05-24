---
title: "Pyright を LSP サーバとした自作 LSP クライアント（調査編）"
date: 2022/03/02 00:00:00
postid: a
tag:
  - Python
  - コアテク
  - 構文解析
  - LSP
  - Pyright
category:
  - Programming
thumbnail: /images/20220302a/thumbnail.png
author: 空閑康太
lede: "Language Server Protocol の理解として、Pyright を LSP サーバとした自作クライアントの作成を行いました。その際、Pyright に解析を行わせるための初期化方法がドキュメントには書かれていなかったので、VSCode 拡張用のクライアントをトレースして調査することにしました"
---
# はじめに

Language Server Protocol の理解として、Pyright を LSP サーバとした自作クライアントの作成を行いました（[Pyright を LSP サーバとした自作 LSP クライアント（実装編）](/articles/20220303a/)）。その際、Pyright に解析を行わせるための初期化方法がドキュメントには書かれていなかったので、VSCode 拡張用のクライアントをトレースして調査することにしました。

# 調査方法

Pyright のリポジトリには言語サーバ（[`packages/pyright`](https://github.com/microsoft/pyright/tree/main/packages/pyright)）だけでなく、VSCode 拡張用のクライアント（[`packages/vscode-pyright`](https://github.com/microsoft/pyright/tree/main/packages/vscode-pyright)）が存在します。今回はこの二つをデバッガで実行して調査します。

https://github.com/microsoft/pyright

## 1. インストール
https://github.com/microsoft/pyright/blob/main/docs/build-debug.md

ます、上の記事にしたがって Pyright をローカルでビルドします。
1. Node.js のインストール
2. `git clone https://github.com/microsoft/pyright.git && cd pyright`
3. `npm install`

また、拡張機能として Pyright および Pylance を導入している場合には無効にします。

## 2. デバッグ実行

Pyright を VSCode 拡張としてデバッグ実行します。VSCode のサイドバーから「実行とデバッグ」を選択し、プルダウンメニューから "Pyright extension" を選択、実行します。なお、実行時のオプションについてはプルダウンメニュー横の歯車、あるいは [`.vscode/launch.json`](https://github.com/microsoft/pyright/blob/main/.vscode/launch.json) から確認できます。

<img src="/images/20220302a/s.png" alt="VS Codeデバッグ実行" width="1200" height="656" loading="lazy">

実行すると、VSCode がもう一つ別のウィンドウで立ち上がります。上部に [拡張機能開発ホスト] と書かれていることを確認します。このウィンドウは現在実行している拡張機能が反映された VSCode になっています。
<img src="/images/20220302a/ss.png" alt="VSCode がもう一つ別のウィンドウ" width="1200" height="84" loading="lazy">

ブレークポイントが動作することを確認します。[`packages/vscode-pyright/src/extension.ts:206`](https://github.com/microsoft/pyright/blob/06e9f626f4388bc9b894daf4239a9e4a8e3ffb11/packages/vscode-pyright/src/extension.ts#L206) にはクライアントからサーバへ再起動を要求するメッセージ送信が実装されているので、ここにブレークポイントを置いてみます。[拡張機能開発ホスト] のウィンドウでコマンドパレットを開き、"Pyright: Restart Server" を実行すると、プログラムが一時停止しておりブレークポイントが機能していることを確認できます。

<img src="/images/20220302a/スクリーンショット_(8).png" alt="コマンドパレット" width="924" height="229" loading="lazy">

<img src="/images/20220302a/スクリーンショット_(10).png" alt="ブレークポイントが機能している" width="1200" height="499" loading="lazy">


## 3. デバッガのアタッチ
2 までの手順では、クライアントのみがデバッガで実行されます。しかし、メッセージを受信した後の処理はサーバ側で行われるため、調査のためにはこちらもデバッガで実行したくなります。[`extension.ts:66`](https://github.com/microsoft/pyright/blob/06e9f626f4388bc9b894daf4239a9e4a8e3ffb11/packages/vscode-pyright/src/extension.ts#L66) では、サーバがポート 6600 で建てられているので、ここにデバッガをアタッチします。
<img src="/images/20220302a/スクリーンショット_(12).png" alt="スクリーンショット_(12).png" width="1074" height="367" loading="lazy">

「実行とデバッグ」のプルダウンメニューに "Pyright attach server" があるのでこれを "Pyright extension" 実行後に実行すればよいです。[`.vscode/launch.json`](https://github.com/microsoft/pyright/blob/main/.vscode/launch.json) の `"port": 6600` が先ほど確認したポートと一致することに注意します。
<img src="/images/20220302a/スクリーンショット_(11).png" alt="スクリーンショット_(11).png" width="1200" height="546" loading="lazy">

[`pyright-internal/src/commands/restartServer.ts`](https://github.com/microsoft/pyright/blob/06e9f626f4388bc9b894daf4239a9e4a8e3ffb11/packages/pyright-internal/src/commands/restartServer.ts#L18) がサーバ側で再起動コマンドを扱う部分です。ブレークポイントを打って同様にメッセージを送信すると、一時停止することが確認できます。
<img src="/images/20220302a/スクリーンショット_(13).png" alt="デバッガをアタッチ" width="1200" height="586" loading="lazy">

アタッチできていない場合には、下の画像のように Unbound breakpoint となり一時停止しません。
<img src="/images/20220302a/スクリーンショット_(14).png" alt=".vscode/launch.json" width="909" height="224" loading="lazy">

# 調査内容
## 1. Initialize Request
[初期化関連の仕様](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#initialize)を見ると、メソッド `initialize` は送信する必要がありそうです。そこでまず次の二つを順に送信してみます。

> 1. `initialize` メソッド：サーバの初期化を要求
> 2. 適当な解析メソッド

すると、[`pyright-internal/src/commands/languageServerBase.ts:417`](https://github.com/microsoft/pyright/blob/844f7cb98987955dc617cd97b1372325e76a4530/packages/pyright-internal/src/languageServerBase.ts#L415) で停止してしまいました。`workspace.isInitialized` が `true` とならないことが原因です。

<img src="/images/20220302a/スクリーンショット_(15).png" alt="workspace.isInitialized" width="923" height="131" loading="lazy">

したがって、`initialize` メソッドの後に何か他のメソッドを送信する必要がありそうです。

> 1. `initialize` メソッド：サーバの初期化を要求
> 2. ???：ワークスペースを初期化
> 3. 適当な解析メソッド

## 2. DidChangeWorkspaceFolders Notification
調べると、`workspace.isInitialized` はメソッド [`updateSettingsForWorkspace`](https://github.com/microsoft/pyright/blob/844f7cb98987955dc617cd97b1372325e76a4530/packages/pyright-internal/src/languageServerBase.ts#L1265) が実行されて `true` となります。

<img src="/images/20220302a/スクリーンショット_(16).png" alt="DidChangeWorkspaceFolders Notification" width="967" height="384" loading="lazy">

このメソッドは [`onDidChangeWorkspaceFolders`](https://github.com/microsoft/pyright/blob/844f7cb98987955dc617cd97b1372325e76a4530/packages/pyright-internal/src/languageServerBase.ts#L581) で管理されているので、`workspace/didChangeWorkspaceFolders` を送信することで呼ばれます。

<img src="/images/20220302a/スクリーンショット_(18).png" alt="workspace/didChangeWorkspaceFolders" width="742" height="269" loading="lazy">

つまり、手順としては次のようになります。

> 1. `initialize` メソッド：サーバの初期化を要求
> 2. `workspace/didChangeWorkspaceFolders` メソッド：ワークスペースフォルダを変更
> 3. 適当な解析メソッド

ただし、`onDidChangeWorkspaceFolders` は特定の条件で有効化されることに注意します。

## 3. Initialized Notification
[`onDidChangeWorkspaceFolders`の前後](https://github.com/microsoft/pyright/blob/844f7cb98987955dc617cd97b1372325e76a4530/packages/pyright-internal/src/languageServerBase.ts#L579
) を確認すると、有効化には以下の二つの条件を満たす必要があります。

1. `initialized` メソッドの送信
2. `this.client.hasWorkspaceFoldersCapability = true`

1 は明らかに送信するだけです。[`initialized` メソッド](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#initialized) は サーバからの InitializeResult に対応するものなので、タイミングは InitializeResult を受け取った後、`workspace/didChangeWorkspaceFolders` メソッドを送信する前になります。2 はわかりにくいですが、[`initialize`メソッド](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#initialize) のオプションに `capabilities` があるのでここで登録します。つまり、初期化方法は全体で次のようになることがわかりました。

> 1. `initialize` メソッド：サーバの初期化を要求
>   a. `capabilities.workspace.workspaceFolders = true`：ワークスペースフォルダ機能を有効化
> 2. `initialized` メソッド：クライアント側の初期化が完了したことを通知
> 3. `workspace/didChangeWorkspaceFolders` メソッド：ワークスペースフォルダの変更を通知
> 4. 適当な解析メソッド

# まとめ

以上から、Pyright の初期化は下図のようにして行われることがわかりました。実装は[Pyright を LSP サーバとした自作 LSP クライアント（実装編）](/articles/20220303a/)で扱っていますので、合わせて読んでいただければと思います。

<img src="/images/20220302a/スクリーンショット_(19).PNG" alt="シーケンス図" width="807" height="529" loading="lazy">
