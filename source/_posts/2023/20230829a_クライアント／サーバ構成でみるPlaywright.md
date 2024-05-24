---
title: "クライアント/サーバ構成でみるPlaywright"
date: 2023/08/29 00:00:00
postid: a
tag:
  - Playwright
category:
  - Programming
thumbnail: /images/20230829a/thumbnail.png
author: 武田大輝
lede: "Playwrightはさまざまな言語でテストを記述することが可能です。このような他言語展開を可能にしているPlaywrightのアーキテクチャについて調べてみました。"
---

[Playwright連載](/articles/20230821a/)6日目です。

## はじめに

Playwrightはさまざまな言語でテストを記述することが可能です。

[公式ドキュメント](https://playwright.dev/docs/languages)を見ると [JavaScript/TypeScript](https://github.com/microsoft/playwright) をはじめとし、[Python](https://github.com/microsoft/playwright-python) / [Java](https://github.com/microsoft/playwright-java) / [.Net](https://github.com/microsoft/playwright-dotnet) がサポートされていることがわかります。
そのほかにも[Go](https://github.com/playwright-community/playwright-go)や[Ruby](https://github.com/YusukeIwaki/playwright-ruby-client)といった言語もサードパーティ製の実装によって利用することが可能です。

このように幅広い言語をサポートしているのは利用者としてとても嬉しいことです。

今回はこのような他言語展開を可能にしているPlaywrightのアーキテクチャについて調べました。

## 環境情報

本記事執筆時点のPlaywrightの最新バージョンはv1.37.1であり、本記事の内容及び参照しているドキュメントやソースコードは当該バージョンのものを前提としています。

## Playwright Architecture

通常のテストランナーを利用する場合、あまり意識することはないのですが、Playwrightはクライアント/サーバの構成で動作させることが可能です。

なぜ意識することがないかというと、通常のテストランナーにおいては明示的に指定をしない限りクライアントとサーバはプロセスとして分離せず、同一のプロセスで動作するためです。

クライアント/サーバ構成のイメージは下記の通りです。

<img src="/images/20230829a/Playwright_Architecture.drawio.png" alt="Playwright_Architecture" width="800" height="320" loading="lazy">

サーバ側はWebSocketまたは標準入出力の口をもち、クライアントからのリクエストに応じて各ブラウザに対しての操作を実行します。クライアント側はテストスクリプトに応じてサーバに対してリクエストを送信します。

図を見ればわかるとおり、クライアント側はPlaywrightが定めるリクエスト/レスポンスの形式に従ってWebSocket通信を行うことができればE2Eテストが実行なため、複数言語のサポートが容易となっています。

クライアント/サーバ構成のE2Eテストツールと聞くと[Selenium](https://www.selenium.dev/)が有名ですが、こちらも同じく複数の言語をサポートするよう設計されています。

ただし、PlaywrightはSeleniumよりも遥かに効率的かつ高速に動作するよう設計されており、通常のテストランナーにおいてクライアントとサーバを分離せずに実行できるような作りになっているのは良い点だと言えそうです。

## Playwright CLI

Playwright CLIの[ソースコード](https://github.com/microsoft/playwright/blob/v1.37.1/packages/playwright-core/src/cli/program.ts)を読むと、公開されていないCLIのコマンドがいくつかあります。その中でもサーバを起動するコマンドは下記の3つとなります。

* [run-driver](https://github.com/microsoft/playwright/blob/v1.37.1/packages/playwright-core/src/cli/program.ts#L249)
* [run-server](https://github.com/microsoft/playwright/blob/v1.37.1/packages/playwright-core/src/cli/program.ts#L255)
* [launch-server](https://github.com/microsoft/playwright/blob/v1.37.1/packages/playwright-core/src/cli/program.ts#L276)

簡単に違いを説明します。

### run-driver

標準入出力を通信経路とするPlaywright Serverを起動します。

内部実装は[このあたり](https://github.com/microsoft/playwright/blob/v1.37.1/packages/playwright-core/src/cli/driver.ts#L33)を見るとJSON形式のメッセージを標準入出力でやりとりしていることがわかります。

```sh
$ npx playwright run-driver -h
Usage: npx playwright run-driver [options]

Options:
  -h, --help  display help for command
```

### run-server

このコマンドはWebSocketを通信経路とするPlaywright Serverを起動します。

```sh
$ npx playwright run-server -h
Usage: npx playwright run-server [options]

Options:
  --port <port>               Server port
  --path <path>               Endpoint Path (default: "/")
  --max-clients <maxClients>  Maximum clients
  --mode <mode>               Server mode, either "default" or "extension"
  -h, --help                  display help for command
```

内部実装は[このあたり](https://github.com/microsoft/playwright/blob/v1.37.1/packages/playwright-core/src/remote/playwrightConnection.ts#L81)を見ると、JSON形式のメッセージをWebSocketでやりとりしていることがわかります。

### launch-server

このコマンドはWebSocketを通信経路するPlaywright Serverを起動します。
`run-server` との違いとして `run-server` コマンドは複数のブラウザに対応したサーバを起動するのに対し、本コマンドは単一のブラウザに対応したサーバを起動します。

コマンドのオプションを見てもわかる通りブラウザの指定が必須となっています。

```sh
$ npx playwright launch-server -h
Usage: npx playwright launch-server [options]

Options:
  --browser <browserName>         Browser name, one of "chromium", "firefox" or "webkit"
  --config <path-to-config-file>  JSON file with launchServer options
  -h, --help                      display help for command
```

### クライアント/サーバ構成でのテスト実行

`npm init playwright@latest`で作成した初期プロジェクトでテストを実行します。

#### サーバサイド

`run-server`コマンドを利用してPlaywright Serverを8008ポートで起動します。
なお、サーバ側のログを出力するため環境変数`DEBUG=pw:server`を指定します。

```sh
$ DEBUG=pw:server npx playwright run-server --port 8008
Listening on ws://127.0.0.1:8008/
```

#### クライアントサイド

`playwright.config.ts` を編集し、[connectOptions](https://playwright.dev/docs/api/class-testoptions#test-options-connect-options)に接続先となる`ws://localhost:8008/`を指定します。

```ts
export default defineConfig({
  // (省略)
  use: {
    connectOptions: {
      wsEndpoint: "ws://localhost:8008/",
    },
  },
});
```

テストを実行すると6ケースのテストがパスします。

```sh
$ npx playwright test
Running 6 tests using 4 workers
  6 passed (8.2s)
```

サーバ側のログを見ると6ケース（3ブラウザ * 2ケース）のテストのログが出力されていることがわかります。

<details><summary>ログを見る</summary>

```sh
  pw:server [1] serving connection: / +34s
  pw:server [2] serving connection: / +3ms
  pw:server [3] serving connection: / +2ms
  pw:server [1] engaged launch mode for "webkit" +12ms
  pw:server [4] serving connection: / +7ms
  pw:server [3] engaged launch mode for "chromium" +2ms
  pw:server [2] engaged launch mode for "webkit" +2ms
  pw:server [4] engaged launch mode for "chromium" +89ms
  pw:server [2] disconnected. error: undefined +3s
  pw:server [2] starting cleanup +1ms
  pw:server [2] finished cleanup +74ms
  pw:server [1] disconnected. error: undefined +147ms
  pw:server [1] starting cleanup +0ms
  pw:server [1] finished cleanup +56ms
  pw:server [5] serving connection: / +325ms
  pw:server [5] engaged launch mode for "firefox" +8ms
  pw:server [6] serving connection: / +259ms
  pw:server [6] engaged launch mode for "firefox" +14ms
  pw:server [6] disconnected. error: undefined +3s
  pw:server [6] starting cleanup +1ms
  pw:server [5] disconnected. error: undefined +622ms
  pw:server [5] starting cleanup +0ms
  pw:server [6] finished cleanup +234ms
  pw:server [5] finished cleanup +247ms
  pw:server [3] disconnected. error: undefined +37s
  pw:server [3] starting cleanup +1ms
  pw:server [3] finished cleanup +35ms
  pw:server [4] disconnected. error: undefined +22s
  pw:server [4] starting cleanup +0ms
  pw:server [4] finished cleanup +37ms
```

</details>

### 別言語のクライアントはどうなっているのか

各クライアントは実行時にPlaywrightのドライバをダウンロードし、`run driver`することでPlaywright Serverを立ち上げてテストを実行しているようです。

Playwrightのドライバは`https://playwright.azureedge.net/builds/driver/playwright-${version}-${platform}.zip`の形式でバージョンとプラットフォームを指定することでダウンロード可能です。
例. https://playwright.azureedge.net/builds/driver/playwright-1.37.1-mac.zip

例えば `playwright-python` を見てみると[このあたり](https://github.com/microsoft/playwright-python/blob/v1.37.0/setup.py#L45)でドライバをダウンロードし、[このあたり](https://github.com/microsoft/playwright-python/blob/v1.37.0/playwright/_impl/_transport.py#L123)で`run-driver`をサブプロセスで実行しています。

なおこのドライバは実行環境にNode.jsランタイムがなくとも実行可能なバイナリとして配布されているため、例えば `playwright-python` を利用してテストを実行する場合はPythonの実行環境さえあれば良ということになります。

## おわりに

普段使う分にはあまり意識することのないPlaywrightのアーキテクチャのお話でした。

本記事で説明している内容の多くが公式のドキュメントでは明文化されていないため、筆者もソースコードを追いながら理解した結果をまとめています。そのため将来的なバージョンアップにより本記事記載の内容が変更されることも十分にあり得ることをご了承いただけますと幸いです。

もし内容に不備や補足等ありましたらSNSや[こちら](https://github.com/future-architect/tech-blog/issues)でご意見いただけますと幸いです。
