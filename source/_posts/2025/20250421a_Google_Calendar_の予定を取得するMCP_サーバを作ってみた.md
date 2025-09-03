---
title: "Googleカレンダーの予定を取得するMCP サーバを作ってみた"
date: 2025/04/21 00:00:00
postid: a
tag:
  - MCP
  - Claude
  - OAuth
  - Googleカレンダー
  - TypeScript
category:
  - DataScience
thumbnail: /images/2025/20250421a/thumbnail.png
author: 市川裕也
lede: "最近 MCP  への注目が急速に高まっていますよね。私も気になっていた人の一人だったのですが、そんな中「エンジニアはとりあえずMCPサーバを作ってみるとよい」というポストを見かけました。「じゃあ何か作ってみるか」と思い、Google Calendar の予定を取得するための MCP サーバを作ってみました。"
---
[春の入門祭り2025](/articles/20250413a/) 6日目です。

こんにちは、CSIGの市川です。普段は FutureVuls チームで開発・カスタマーサポートの業務をしています。

最近 MCP (Model Context Protocol) への注目が急速に高まっていますよね。

私も気になっていた人の一人だったのですが、そんな中「エンジニアはとりあえずMCPサーバを作ってみるとよい」というポストを見かけました。「じゃあ何か作ってみるか」と思い、Google Calendar の予定を取得するための MCP サーバを作ってみました。

# 本記事の目的

- MCP (Model Context Protocol) とは何か + MCP の嬉しさについての個人的な理解をまとめる
- Google Calendar の空き枠探しを題材に、自作 MCP サーバを MCP クライアントに繋ぐことによる嬉しさを体感する

# 本記事で扱う内容

- MCP の嬉しさについての所感のまとめ
- 自作したMCPサーバの簡単な紹介 (作成した `tools` と各 `tool` の目的)
- MCPサーバを自作する際のフローの体験
  - MCP Inspector を活用した動作テスト
  - Claude Desktop と自作したMCPサーバを繋いで、期待通りの挙動になることを確認する

# 本記事で扱わない内容

- MCP の仕様や、SDK の使用方法についての解説
- 作成したMCPサーバの各toolsの仕様についての詳しい説明

# MCPサーバを作ってみた所感

- 公式からSDKが出ているので、簡単にMCPサーバを自作できる。
- テストツールも公式から出ている。再現性を確認できるのが非常に嬉しい。
- MCPサーバを Claude Desktop に繋いで動かしてみることで、以下を確認できた。
  - AIエージェントは、タスクの分解と受け取った情報の整理を行ってくれる。
  - タスク分解の中で、必要だと判断した情報をMCPサーバ経由で取ってきてくれる。
  - どの tool からどの情報を取ってくるかの判断も、AIエージェントに任せることが可能。

# MCPについての説明

分かりやすくしっかりした説明については、既に様々なサイトで行われているので、そちらを見ていただければと思います。
例:

- [MCPに入門する/ Introduction to MCP - Speaker Deck](https://speakerdeck.com/shuntaka/introduction-to-mcp?slide=5)
- [TypeScript で MCP サーバーを実装し、Claude Desktop から利用する](https://azukiazusa.dev/blog/typescript-mcp-server/)

以下にMCPの概要の説明と、MCPの嬉しさについての個人的見解を記します。

MCPについてある程度知識のある方は飛ばしていただければです。

## MCPとは

MCP（Model Context Protocol） は、AIエージェントが外部システムと連携する方法を標準化するプロトコルです。

現状のAIエージェントは、プロンプトからタスクを分解したり、受け取った情報を整理したり思考を深めることは得意な一方で、外部と連携して正確な情報を取得することが苦手でした。MCP が登場したことで、この「外部との連携」を今までよりも行いやすくなりました。AIエージェントに「外付けUSBポート」が提供された、みたいなイメージです。

## 嬉しさ1: 正確な情報をコンテキストに含めることが可能になる

例えば、AIエージェントが「今日の天気データを参照したい」と依頼された場合、AIエージェントは実際の天気データにアクセスできないと正確な情報に基づいて回答することができません。

AIエージェントが天気情報を取得するAPIの呼び出しを要求し、MCPサーバがAPI呼び出しを実行し、AIエージェントがその結果を受け取ることで、AIエージェントは正確な情報に基づいて回答することができるようになります。

## 嬉しさ2: 標準化されたことで、複雑なワークフローを構築しやすくなった

個人的には、外部との連携方法が標準化されたことが、拡張性という側面においてかなり大きいと感じています。

MCP によって外部ツールを呼び出す方法が標準化されたため、MCPの規格に則ったツールであれば、どんなツールも同じようにAIエージェントにコンテキストを提供できます。

これにより、「まずカレンダーを取得して、次に旅行サイトを見に行って最適なプランを選択し、カレンダーにその予定を入れる」みたいな複数のツールを呼び出す複雑なワークフローを構築することがが今までよりも容易になりました。

## 嬉しさ3: 誰でも気軽に作り、AIに繋ぐことができる

SDKも提供されているため、MCPサーバの自作が気軽に行えるのも嬉しいです。

たとえば「AIエージェントからこの天気の情報を取得するAPIの呼び出しを行えるようになりたいな」と思った場合、API呼び出しを行うだけのMCPサーバを作ってAIエージェントに繋ぐだけで実現することができます。作って繋いでみるのが純粋に楽しいです。

という訳で、実際にMCPサーバを作っていきます。

## 今回作成したMCPサーバについて

タイトル通り、「Google Calendar で空き枠を探すための MCP」を作成してみました。

GitHub にコードもあげているので、気になる方はどうぞ。

https://github.com/menma-at-here/calendar-mcp-server

### 想定されるユースケースと、作成したMCPサーバの役割

まず、ユーザーは以下のような依頼を投げます。

<img src="/images/2025/20250421a/79fae2d7-f302-43cf-9ff1-24840eb0b69e.png" alt="" width="1200" height="557" loading="lazy">

この時、ユーザはAIエージェントが以下のようにタスクを分解してくれることを期待しています。

<img src="/images/2025/20250421a/image.png" alt="image.png" width="1200" height="448" loading="lazy">

さて、AIエージェントがユーザの思い通りタスクを分解してくれたとします。

この時、AIエージェントは単独だと以下を行うことができません。そのため、ユーザの依頼は失敗に終わってしまいます。

- 格納されているトークンが有効かを検証する
- Google Calendar API を叩くためのトークンを取得する
- カレンダーの予定を取得する

今回は、これらの操作をAIエージェント経由で行えるようにするための MCP サーバを作成しました。

### 作成した tools

TypeScript の SDK があったので、こちらを活用してMCPサーバを作成しました。

SDK があると、動くものを簡単に作ってみることができて非常に嬉しいですね。

https://github.com/modelcontextprotocol/typescript-sdk

MCPの機能としては、 `Resource`, `Prompt`, `tools` の3つが用意されていますが、今回は外部ツールと連携することができる `tools` を採用しました。

`tools` について、詳しくは[公式ドキュメント](https://modelcontextprotocol.io/docs/concepts/tools)をご覧ください。

作成した tool は以下の3つです。

- **`shouldGetToken`**
  - **目的**: トークンがサーバ内に格納されているか、トークンが有効かを判定する
  - **返り値**: トークンが有効かの boolean
- **`getAuthUrlAndStartServer`**
  - **目的**:
    - 認可を行うためのリンクを取得する
    - 認可を行った後のcallbackリンクで認可コードを受け取り、トークンと交換してトークンをMCPサーバ内に格納するためのサーバを別途立ち上げる
  - **返り値**: 認可を行うためのリンク
- **`getCalendarWithToken`**
  - **目的**: トークンを用いてカレンダーを取得する
  - **引数**: カレンダー取得期間
  - **返り値**: 取得期間内の予定一覧

::: note warn
Google Calendar から情報を取得することを目的としてMCPサーバを作成したため、　あまり凝った実装はしていません。例えば、リフレッシュトークンによるアクセストークン再発行処理は実装していません。また、認証・トークン情報もどこかのクラウドサービスに預ける形ではなく、ローカルに保存する形です。
:::

`index.ts` のコードのみ載せておきます。

細かい説明をし始めると長くなってしまうので、雰囲気だけ掴んでいただければ幸いです。

各 tool の中身については、GitHubリポジトリを見てみてください。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { upsetServerAndGetAuthUrl, shouldGetToken } from "./util/authorize";
import { z } from "zod";
import { getCalendarWithToken } from "./util/getThisWeek";

export const server = new McpServer({
  name: "calendar-mcp-server",
  version: "1.0.0"
});


server.tool(
  "shouldGetToken",
  "Check if the token should be obtained.",
  async () => {
    // 認可用の関数を呼び出してトークンが必要かどうかを確認
    const isShouldGetToken = shouldGetToken();
    return {
      content: [
        {
          type: "text",
          text: isShouldGetToken.toString(),
        },
      ],
    };
  }
)

server.tool(
  "getAuthUrlAndStartServer",
  "Get the authorization URL for Google Calendar API. \n\n" + "Start the server to listen for the callback, get authentication code, get access token from the code and save the token in this MCP.",
  async () => {
    const authUrl = upsetServerAndGetAuthUrl();
    return {
      content: [
        {
          type: "text",
          text: authUrl,
        },
      ],
    };
  }
)

server.tool(
  "getCalendarWithToken",
  "Get the calendar events for the current week.",
  {
    start: z.string().date().describe("Start date for the calendar events"),
    end: z.string().date().describe("End date for the calendar events"),
  },
  async ({start, end}) => {
    const events = await getCalendarWithToken(new Date(start), new Date(end));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(events),
        },
      ],
    };
  }
)

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("callendar MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

# 作成したMCPサーバを使ってみる

## MCPサーバのテスト

Claude Desktop にMCPサーバを繋ぐ前に、MCP サーバの tools が正常に機能するかのテストを `MCP Inspector` を用いて行いました。

`MCP Inspector` は、MCPが公式に提供しているブラウザベースのMCPサーバーテスト/デバッグツールです。
公式がテストツールを出してくれているの、非常にありがたいですね...！

https://github.com/modelcontextprotocol/inspector

プロジェクトのルートディレクトリ下で以下コマンドを打つことで、テスト用のサーバが起動されます。

```bash
% npx @modelcontextprotocol/inspector npx ts-node src/index.ts
Starting MCP inspector...
⚙️ Proxy server listening on port 6277
🔍 MCP Inspector is up and running at http://127.0.0.1:6274 🚀
```

指定されたリンク (`http://127.0.0.1:6274`) に飛ぶと、以下のようなページを開くことができます。

<img src="/images/2025/20250421a/image_2.png" alt="" width="1200" height="687" loading="lazy">

ここで、「Connect」を押すと、toolsの一覧が取得できます。

テストしたい tools をクリックする (下記画像①) ことで、テストのためのペインが右側に表示されます。

引数が必要なtoolsの場合は、引数の入力欄も表示されます。例えば `getCalendarWithToken` は、カレンダー取得の開始日と終了日を引数として受け取るので、適当な日付を入力 (下記画像②) して「Run Tool」をクリックします。

無事カレンダーの一覧が取得できることを確認できました！ (下記画像青枠)

<img src="/images/2025/20250421a/image_3.png" alt="image.png" width="1200" height="629" loading="lazy">

`MCP Inspector`を使用することで、特定の入力を入れた時に、想定している出力が返ってくるかをテストできます。

特定の入力に対する出力が一意に定まること、つまり**再現性**を確かめられる訳です。もちろん、テストコードを書けば自動テストを行うことも可能です。

この「テスト可能である」、つまり「再現性を確保できる」という特性は、従来のAIエージェントで実現することが非常に難しかった特性であり、それ故**MCPサーバの大きな嬉しさのひとつ**だと個人的には感じています。

## 実際にClaude DesktopにMCPを繋げてみる

各toolが正常に動くことを確認できたので、Claude Desktop に繋げてみます。
事前に以下のように `claude_desktop_config.json` を設定してあげる必要があります。

```json
{
    "mcpServers": {
        "calendar": {
          "command": "npx",
          "args": [
            "ts-node",
            "--project",
            "/path/to/mcp-calendar-sample/tsconfig.json",
            "/path/to/mcp-calendar-sample/src/index.ts"
          ]
        }
      }
}
```

Claude Desktop にMCPサーバを繋ぐ際の設定について、詳しくはこちらをご確認ください。

https://modelcontextprotocol.io/quickstart/user

サーバが正常に接続できると、トンカチマークがトーク画面に表示されます。
トンカチをクリックすると、使用することのできる tools や resources の一覧を見ることができます。

<img src="/images/2025/20250421a/image_4.png" alt="" width="1200" height="929" loading="lazy">

では、依頼を投げてみましょう。

<img src="/images/2025/20250421a/image_5.png" alt="" width="1200" height="793" loading="lazy">

Claude が以下のことを判断してくれました。

- Google Calendar からカレンダーを取得する必要がある
- まず認証・認可を行う必要がある
- 認証が必要かを確かめるため、 `shouldGetToken` のtoolを用いる

Claude が tool を用いることを判断すると、以下のようにツールの使用を許可するためのダイアログが出現します。

<img src="/images/2025/20250421a/image_6.png" alt="" width="1200" height="842" loading="lazy">

toolの使用を許可すると、 `shouldGetToken` を叩き、結果を受け取ります。
結果が `true` だったので、今度は `getAuthUrlAndStartServer` を実行しようとしてきます。期待通りです。

<img src="/images/2025/20250421a/image_7.png" alt="" width="1200" height="835" loading="lazy">

これも許可すると、認可のためのリンクを取得してきてくれるので、

<img src="/images/2025/20250421a/image_8.png" alt="" width="1200" height="672" loading="lazy">

認可します。(詳しい仕組みについてはリポジトリの中をご覧ください)

<img src="/images/2025/20250421a/image_9.png" alt="" width="636" height="444" loading="lazy">

認可後、カレンダーを取得してもらい、無事3時間以上の空き枠をリストアップしてもらうことができました！！

<img src="/images/2025/20250421a/image_10.png" alt="" width="753" height="888" loading="lazy">

### おわりに

MCPサーバを自作してAIエージェントに繋いでみることで、MCPサーバの嬉しさや仕組みについて理解を深めることができました。

記事を読んでくださった方も、是非簡単なMCPサーバを作成しAIエージェントに繋いでみてください。

なお、MCPサーバの設計や使い方、MCPサーバへの理解等についての疑問や齟齬がありましたら、じゃんじゃんご指摘いただけますと幸いです。
