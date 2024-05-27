---
title: "Cloudflare連載を始めます & WorkersにPythonをデプロイして動かしてみる"
date: 2024/05/27 00:00:00
postid: a
tag:
  - Cloudflare
  - Cloudflare Workers
  - Python
category:
  - Programming
thumbnail: /images/20240527a/thumbnail.jpg
author: 伊藤太斉
lede: "Cloudflareは、インターネット上で運営されている最大のネットワークの1つです。ユーザーは、Webサイトやサービスのセキュリティとパフォーマンスを向上させる目的でCloudflareサービスを利用しています。"
---
<img src="/images/20240527a/CF_logo_stacked_blktype.jpg" alt="" width="1200" height="405" loading="lazy">

ロゴは https://www.cloudflare.com/ja-jp/press-kit/ より引用

こんにちは。TIGの伊藤です。

Cloudflare連載の第1日目とインデックス記事です。

## Cloudflare連載を始めます

CDNやインターネットセキュリティを中心としたサービスプロバイダーであるCloudflareを題材とした連載を開催します。Cloudflareについては技術ブログではこれまで、個人の寄稿で数記事上がっていましたが、連載という形にするのは今回が初めてです。

## Cloudflareとは

Cloudflareは、[公式](https://www.cloudflare.com/ja-jp/learning/what-is-cloudflare/)では以下の様に書かれていました。

> Cloudflareは、インターネット上で運営されている最大のネットワークの1つです。ユーザーは、Webサイトやサービスのセキュリティとパフォーマンスを向上させる目的でCloudflareサービスを利用しています。

上記の様にCloudflare自体でもサービスを持ちつつ、既存のシステムのセキュリティ、パフォーマンスを向上することを目的としているサービス群です。
AWSなどのパブリッククラウドではリージョン、ゾーンという概念がありますが、Cloudflareでは全てエッジネットワークにて構築されており、ユーザが接続する時は一番近い接続点に繋ぎにいき、Cloudflareのサービス、その裏の他のクラウドに接続などをしています。

## 連載日程

今回は初めての連載ということもあり、5人が参加してくれました。内容は初めて触った系の記事もありますが、わずかながら社内の知見も公開されるようなので、ぜひ楽しみにお待ちください。

| 日付 | 寄稿者 | タイトル・ネタ |
| ---- | ----- | ---------- |
| 5/27 | 伊藤太斉 | WorkersにPythonをデプロイして動かしてみる |
| 5/28 | 真野隼記 | Cloudflare D1 を触ってみる |
| 5/29 | 宮崎将太 | Cloudflareにおけるアーキテクチャ選定 |
| 5/30 | 大岩潤矢 | Cloudflare R2とNextCloudで自分だけのクラウドストレージを作ろう |
| 5/31 | 小林弘樹 | Webサイトのメンテナンスイン/アウトを実装 |

※公開順、日程は変わる可能性がございますが、ご了承ください。

----

# Cloudflare WorkersでPythonを使いたい

今から約1ヶ月前、2024/04/02にCLoudflareのアナウンスより、Workersにオープンベータという形でPythonが利用できるようになりました。

https://blog.cloudflare.com/python-workers

本記事の結論をいきなり出しますが、PythonをWorkersで利用するにはオープンベータということもあり、まだまだ制限がありました。ただ、WorkersでPythonを使う、ということに対しては最低限であれば動くというのが分かりました。
個人的には、これまでWorkersのアーキテクチャからJavascriptのみをサポートしていたこともあり、ちょっととっつきづらい部分もありましたが、まだ自分に馴染みのあるPythonが使えるようになったことで言語選択の幅が出たことは喜ばしいことですね。
さて、早速動かせるところまでは動かしてみましょう。

## 必要なもの

事前準備は以下のコマンドで[wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)コマンドを利用できるようにしておきましょう。

```bash
npm install wrangler --save-dev
```

## コマンドを利用してWorkersにPythonをデプロイする

はじめにPythonのプロジェクトを作成しましょう。以下のコマンドから作成します。

```bash
npm create cloudflare@latest

In which directory do you want to create your application?
dir ./cf-python # 作成するディレクトリ名を記載

What type of application do you want to create?
type "Hello World" Worker (Python) # PythonのWorkersプロジェクトを作成

Do you want to use git for version control?
yes git # Gitのバージョンコントロールをするか

Do you want to deploy your application?
yes deploy via `npm run deploy` # Workersに初期プロジェクトをデプロイするか

# ここでブラウザ側で認証が走り、認証後デプロイされる
```

デプロイまで完了すると、以下の画面に遷移します。

<img src="/images/20240527a/スクリーンショット_2024-05-26_21.59.14.png" alt="スクリーンショット_2024-05-26_21.59.14.png" width="1200" height="775" loading="lazy">

この時デプロイされているソースコードは`./src/entry.py`に格納されています。

```py
from js import Response

async def on_fetch(request, env):
    return Response.new("Hello World!")
```

ここまででの作業でPythonのアプリケーションが動く様になったので、次はPythonのパッケージを入れて試してみます。

## Pythonのパッケージのサポート

2024/04/02時点でWorkersがサポートしているPythonのパッケージですが、公式の[Packages](https://developers.cloudflare.com/workers/languages/python/packages/)のページに記載があります。しかし、

> Python Workers are in open beta.
You can currently only use built-in packages in local development. Support for deploying packages with a `requirements.txt` file is coming soon.

と書いてある様にPythonの標準パッケージは使えるものの、外部のパッケージについては現時点ではデプロイできない状態です。実際に試してみましたが、エラーとなり、その文面にもまだサポートされていないことが書かれていました。

```requirements.txt
fastapi
```

```bash
# 実行コマンド
wrangler deploy
 ⛅️ wrangler 3.57.1
-------------------
▲ [WARNING] The entrypoint src/entry.py defines a Python worker, support for Python workers is currently experimental.


Attaching additional modules:
┌─────────┬────────────────────┬──────┐
│ Name    │ Type               │ Size │
├─────────┼────────────────────┼──────┤
│ fastapi │ python-requirement │      │
└─────────┴────────────────────┴──────┘
Total Upload: 0.06 KiB / gzip: 0.07 KiB

✘ [ERROR] A request to the Cloudflare API (/accounts/xxxxxxxxxxxxxxxx/workers/scripts/yyyyyyyyy) failed.

  You cannot yet deploy Python Workers that depend on packages defined in
  requirements.txt. Support for Python packages is coming soon. [code: 10021]

  If you think this is a bug, please open an issue at:
  https://github.com/cloudflare/workers-sdk/issues/new/choose
```

実際に色々動かしてみたかったところではありますが、ネイティブでもっと動かせる時が来たらさらに試してみようと思います。

## まとめ

Cloudflare連載のインデックス記事とWorkersでPythonがオープンベータで使えるようになったのでできるところまで試してみた記事でした。

私が他の記事を見てみた時の違いは、`npm create`コマンドを実行した時に、テンプレでPythonが選べる様になっていたので、わずかながらGAになる様に進んでいそうにも見えました。今後のリリースにも期待ですね！

本日からあと4記事ほど続くCloudflare連載ですが、ぜひ他の記事も読んでみてください！
