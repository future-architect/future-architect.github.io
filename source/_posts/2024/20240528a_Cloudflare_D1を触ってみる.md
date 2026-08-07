---
title: "Cloudflare D1を触ってみる"
date: 2024/05/28 00:00:00
postid: a
tags:
  - Cloudflare
  - SQLite
categories:
  - DB
series: "Cloudflare"
thumbnail: /images/2024/20240528a/thumbnail.png
author: 真野隼記
lede: "Cloudflare D1を触ってみました。"
---

<img src="/images/2024/20240528a/image.png" alt="" width="1200" height="404" loading="lazy">

[Cloudflare連載](/articles/20240527a/)の2日目です。

## はじめに

TIG真野です。発表当初に（そのポテンシャルや将来性が）ヤバいと噂されたCloudflare D1を触ってみた記事です。

## Cloudflare D1とは

[D1](https://developers.cloudflare.com/d1/)はSQLiteをベースに構築された、CloudflareのドキュメントによるとサーバレスSQLデータベースです。エッジロケーションでRDBが動く、SQLLiteはファイルベースなのでレプリケーションに適正ありありでは？ と評判になったことは記憶に新しいです。

そんなD1は、[2022年](https://blog.cloudflare.com/ja-jp/introducing-d1-ja-jp)に発表され、この記事が公開される少し前の[2024年4月](https://blog.cloudflare.com/making-full-stack-easier-d1-ga-hyperdrive-queues-ja-jp)にGA（Generally Available）となりました。

機能はSQLLite互換性のあるD1クライアントAPIが提供されたり、Time Travelというバックアップで30日以内の任意の時点に復元できます。[非同期読み取りレプリケーションのサポート](https://blog.cloudflare.com/building-d1-a-global-database-ja-jp)も発表されました。

## D1の主な制約

2024.5月時点で主な制約は以下です。上限緩和申請のGoogleフォームも設置されていますので、理由があれば緩和可能かもしれません。

- DBのデータサイズ: 10GBまで
- テーブルの列数: 100まで
- ワーカー呼び出しあたりのクエリ数(非バンドル): 1000
  - 1ワーカーあたり、クエリが1000回までしか呼べない（呼ぶ必要があるかというのもありますが）
- SQL最大長: 100KBまで
  - あんまり長いSQLは書けない
  - データ移行などはバルクデータのインポートのAPIがあるのでそちらを使えそう
- テーブルの行サイズ: 1KBまで
  - けっこう、、厳しいですね...!!
- クエリあたりの最大バインドパラメータ数: 100
  - 例えば、INSERT文で用いるプレスホルダーの数の上限に相当
    - 最大列数と整合しているといえばそうですが..
- SQLクエリの実行時間: 30秒まで

（参考）https://developers.cloudflare.com/d1/platform/limits/

D1はRDBとはいえ、**現時点では** AWSやGoogle Cloud上で動いている複雑なビジネスロジックを置き換え実行することに適している訳では無さそうです（ロードマップ上はデータ上限を広げていき、[エンタープライズのニーズにも対応していくとのことです](https://trends.codecamp.jp/blogs/media/news284#list3)）。

## 投入データ作成

D1に登録する対象を、この技術ブログのメタデータにしようと思います。2024年時点ではHexoという静的サイトジェネレータを利用しており、キャッシュとして `db.json` というファイルが存在しているので、これを元にスキーマ、登録用のINSERT文を作成します。

まずはスキーマ（DDL）です。タグやカテゴリはID切っているのに、著者（author）は正規化していないですが、これはdb.jsonのレイアウトをそのままなぞっているからです。

```sql schema.sql
-- 記事
CREATE TABLE post IF NOT EXISTS post (
    post_id TEXT PRIMARY KEY,
    title TEXT,
    post_date DATETIME,
    postid TEXT,
    author TEXT,
    lede TEXT
);

-- 記事カテゴリ
CREATE TABLE IF NOT EXISTS post_category (
    post_id TEXT,
    category_id TEXT,
	PRIMARY KEY (post_id, category_id)
);

-- 記事タグ
CREATE TABLE IF NOT EXISTS post_tag (
    post_id TEXT,
    tag_id TEXT,
	PRIMARY KEY (post_id, tag_id)
);

-- タグ
CREATE TABLE IF NOT EXISTS tag (
    tag_id TEXT PRIMARY KEY,
    tag_name TEXT
);

-- カテゴリ
CREATE TABLE category IF NOT EXISTS category (
    category_id TEXT PRIMARY KEY,
    category_name TEXT
);
```

入力データはjqを用いてデータを抽出します。1件ずつ抜粋すると以下のようなデータが入っています。

```sh
# post
cat db.json |  jq '.models.Post[] | {post_id: ._id, title: .title, date: .date, postid: .postid, author: .author, lede: .lede, }'
{
  "post_id": "clwohbp3b0000peh80ex8d1he",
  "title": "Cloudflare連載を始めます & WorkersにPythonをデプロイして動かしてみる",
  "date": "2024-05-26T15:00:00.000Z",
  "postid": "a",
  "author": "伊藤太斉",
  "lede": "Cloudflareは、インターネット上で運営されている最大のネットワークの1つです。ユーザーは、Webサイトやサービスのセキュリティとパフォーマンスを向上させる目的でCloudflareサービスを利用しています。"
}
...

# post_category
cat db.json |  jq '.models.PostCategory[] | {post_id: .post_id, category_id: .category_id}'
{
  "post_id": "clwohbp3b0000peh80ex8d1he",
  "category_id": "clsu10mxe001s3zh8hpzfdge2"
}
...

# post_tag
cat db.json |  jq '.models.PostTag[] | {post_id: .post_id, tag_id: .tag_id}'
{
  "post_id": "clwohbp3b0000peh80ex8d1he",
  "tag_id": "clsu10n0300fd3zh82oj5gt28"
}
...

# カテゴリ
cat db.json |  jq '.models.Category[] | {category_id: ._id, category_name: .name}'
{
  "category_id": "clsu10mxe001s3zh8hpzfdge2",
  "category_name": "Programming"
}
...

# タグ
cat db.json |  jq '.models.Tag[] | {tag_id: ._id, tag_name: .name}'
{
  "tag_id": "clwohbp3p0001peh80lrc8o61",
  "tag_name": "CloudflareWorkers"
}
...
```

これをINSERT文に変換したものを、さきほどのschema.sqlに追記します。

本筋ではないため詳細は割愛しますが、変換作業はプロンプト力が不足していたので、[Convert JSON Array to Insert SQL](https://tableconvert.com/json-to-sql)というWebツールを利用して、先ほどのjqコマンドの出力結果をJSON配列に書き換えて生成しました。

## データ確認

[D1チュートリアル](https://developers.cloudflare.com/d1/get-started/)に従いデータを投入します。

```sh
$ npx wrangler d1 execute dev-d1-futuretechblog --local --file=./schema.sql
Proxy environment variables detected. We'll use your proxy for fetch requests.

 ⛅️ wrangler 3.57.2
-------------------
🌀 Executing on local database dev-d1-futuretechblog (x-x-x-x-x) from .wrangler/state/v3/d1:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
```

postテーブルの件数を確認すると 1089件と、今の記事件数と一致します。

```sh
$ npx wrangler d1 execute dev-d1-futuretechblog --local --command="SELECT count(*) FROM post"
Proxy environment variables detected. We'll use your proxy for fetch requests.
 ⛅️ wrangler 3.57.2
-------------------
🌀 Executing on local database dev-d1-futuretechblog (x-x-x-x-x) from .wrangler/state/v3/d1:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
┌──────────┐
│ count(*) │
├──────────┤
│ 1089     │
└──────────┘
```

## index.ts の作成

DBの中身を簡単に画面の表示させます。GETパラメータでauthorで絞り込めるようにします。

```ts
import renderHtml from "./renderHtml.js";

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request, env): Promise<Response> {
	  const urlSearchParams = new URL(request.url).searchParams
	  const param1 = urlSearchParams.get('author')

	  const { results } = await env.DB.prepare("SELECT * FROM post WHERE author = ?")
		.bind(param1)
		.all();
	  return new Response(
		renderHtml(JSON.stringify(results, null, 2)),
		{
		  headers: {
			"content-type": "text/html"
		  }
		}
	  );

	},
} satisfies ExportedHandler<Env>;
```

```ts
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/templates/populated-worker/src/renderHtml.js
function renderHtml(content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>D1</title>
        <link rel="stylesheet" type="text/css" href="https://templates.cloudflareintegrations.com/styles.css">
      </head>

      <body>
        <header>
          <h1>\u{1F389} D1 検索結果</h1>
        </header>
        <main>
          <pre><code><span style="color: #0E838F">&gt; </span>${content}</code></pre>
        </main>
      </body>
    </html>
`;
}
__name(renderHtml, "renderHtml");
export {
  renderHtml as default
};
```

開発サーバを起動させて、[b] open a browser でブラウザでアクセスします。

```sh
npx wrangler dev
```

値が取得できています。

<img src="/images/2024/20240528a/image.png" alt="image.png" width="1200" height="643" loading="lazy">

## デプロイ

ローカルで動作検証が済んだとして、デプロイします。出力内容はローカル版と特に違いは無いです。

```sh
$ npx wrangler d1 execute dev-d1-futuretechblog --remote --file=./schema.sql
Proxy environment variables detected. We'll use your proxy for fetch requests.
 ⛅️ wrangler 3.57.2
-------------------
✔ ⚠️ This process may take some time, during which your D1 database will be unavailable to serve queries.
  Ok to proceed? … yes
🌀 Executing on remote database dev-d1-futuretechblog (xxxx-xxxx-xxxx-xxxx-xxxxxxxx):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
Note: if the execution fails to complete, your DB will return to its original state and you can safely retry.
├ 🌀 Uploading xxxx-xxxx-xxxx-xxxx-xxxxxxxx.xxxx.sql
│ 🌀 Uploading complete.
│

🌀 Starting import...
🌀 Processed 7043 queries.
🚣 Executed 7043 queries in 0.18 seconds (5 rows read, 14081 rows written)
   Database is currently at bookmark 00000001-00000000-00000000-xxxx.
┌────────────────────────┬───────────┬──────────────┬───────────────────┐
│ Total queries executed │ Rows read │ Rows written │ Databas size (MB) │
├────────────────────────┼───────────┼──────────────┼───────────────────┤
│ 7043                   │ 5         │ 14081        │ 1.31              │
└────────────────────────┴───────────┴──────────────┴───────────────────┘

$ npx wrangler d1 execute dev-d1-futuretechblog --remote --command="SELECT count(*) FROM post"
Proxy environment variables detected. We'll use your proxy for fetch requests.
 ⛅️ wrangler 3.57.2
-------------------
🌀 Executing on remote database dev-d1-futuretechblog (x-x-x-x-x):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 1 commands in 0.2655ms
┌──────────┐
│ count(*) │
├──────────┤
│ 1089     │
└──────────┘

$ npx wrangler deploy
```

## 開発について

DB検索ですが、コンソール上からもSQLを実行できて地味に便利だと思いました。

補完が効かないのと、ワンラインな入力ボックスですが、簡単なデータ調査程度であれば十分使えそうです。

<img src="/images/2024/20240528a/image_2.png" alt="image.png" width="1200" height="740" loading="lazy">

## さいごに

Cloudflare D1を使ってみました。

登録データとしてフューチャー技術ブログの情報を投入してみました。

一番大きなテーブルでも4000件弱だったため、性能検証的にはまだイマイチですが、特段検索が遅いと感じなかったので、業務実践できる場所を検討して行こうと思います。

```sql
> select count(*) from post_tag
count(*)
3845
```
