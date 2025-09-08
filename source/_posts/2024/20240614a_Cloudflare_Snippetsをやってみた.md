---
title: "Cloudflare Snippetsをやってみた"
date: 2024/06/14 00:00:00
postid: a
tag:
  - Cloudflare
  - 外部寄稿
category:
  - Infrastructure
thumbnail: /images/2024/20240614a/thumbnail.png
author: 亀田治伸
lede: "Cloudflare Snippetsは新しいCloudflareのサービスであり2023年6月にクローズドアルファ版がリリースされ、2024 Develoer Weekでは無作為に抽出された5%のユーザーが利用可能になっていました。6月頭より全ユーザーが利用可能となったサービスです。"
---

こんにちは。Cloudflareの[亀田治伸](https://twitter.com/kameoncloud)です。

動画・音楽配信システム構築、決済代行事業者、AWSエバンジェリストを経て現職(Cloudflare)となります。得意領域は、認証、暗号、ネットワークを中心としたセキュリティ、 映像配信、開発手法に見る組織論、クラウドアーキテクチャ、プレゼンテーションなどです。

## はじめに

Cloudflare Snippetsは新しいCloudflareのサービスであり2023年6月にクローズドアルファ版がリリースされ、2024 Develoer Weekでは無作為に抽出された5％のユーザーが利用可能になっていました。6月頭より全ユーザーが利用可能となったサービスです。

https://blog.cloudflare.com/ja-jp/cloudflare-snippets-alpha-ja-jp

## Cloudflare Snippets とは

Cloudflare の CDN/WAF はルールという機能を提供しています。変換ルール、キャッシュルール、オリジンルール、コンフィグルール、リダイレクトルール等多くの機能が存在しており簡単にHTTPベース通信の挙動を制御させることができます。

SnippetsはCloudflare Workersのプラットフォームを流用することで、ルールとして新しくJavaScriptの断片（これをSnippetsと呼びます）を実行させることができるようになりました。

<img src="/images/2024/20240614a/abstract.png" alt="" width="1200" height="325" loading="lazy">

## Cloudflare Workers との違い

Cloudflare Workers はWeb Workershttps://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers という技術を活用しており通信にJavaScriptの処理を割り込ませることができます。

ただし専用ドメインが割り当てられるためアプリケーション、もしくはDNSでCNAMEやAレコードを設定する必要がある等の変更伴います。一方SnippetsはそのままCDN/WAFとして動作するのでより簡単に処理を割り込ませることができます。

また常に起動するWorkersと異なり、ルールエンジンと連携することで特定の条件に合致したときのみ起動、といった制御が可能です。

<img src="/images/2024/20240614a/2.png" alt="" width="1200" height="766" loading="lazy">

この性質により、1つ処理を1つのSnippetsとして分割しておくことで、1つの通信に複数のSnippetsを起動させる、ということも可能です。

また、Workersと異なり、最大実行時間は5msで最大メモリは2MB、パッケージの合計サイズは32KBと小さいのも特徴です。

## さっそくやってみる

ではやってみましょう。

- https://zenn.dev/kameoncloud/articles/6dec28de015f6f
- https://future-architect.github.io/articles/20230427a/

等を参考にCDN経由のサイトを立てます。

<img src="/images/2024/20240614a/3.png" alt="" width="370" height="165" loading="lazy">

マネジメントコンソールから`Rules`→`Snippets`をクリックします。
`Create a Snippet`をクリックします。

<img src="/images/2024/20240614a/4.png" alt="" width="1200" height="487" loading="lazy">

デフォルトで提供されるサンプルSnippetをそのままデプロイするため`Configure to add Snippet rule`をクリックします。
次にSnippet機能を制御するルールを作成します。

<img src="/images/2024/20240614a/5.png" alt="" width="1127" height="588" loading="lazy">

こうすることでクライアントが日本からの通信のみSnippetを起動させるということができます。
`Configure to create snippet`→`Save and deploy snippet`とボタンを押せば完了です。
サイトにアクセスすると以下のようにHeaderが付与されていれることがわかります。

<img src="/images/2024/20240614a/6.png" alt="" width="874" height="264" loading="lazy">
デフォルトコードは以下です。

```js snippet.js
// Enter Snippet code below

export default {
    async fetch(request) {
        const response = await fetch(request);

        // Clone the response so that it's no longer immutable
        const newResponse = new Response(response.body, response);

        // Add a custom header with a value
        newResponse.headers.append(
            "x-snippets-hello",
            "Hello from Cloudflare Snippets"
        );

        // Delete headers
        newResponse.headers.delete("x-header-to-delete");
        newResponse.headers.delete("x-header2-to-delete");

        // Adjust the value for an existing header
        newResponse.headers.set("x-header-to-change", "NewValue");
        return newResponse;
    },
};
```

## まとめ

いかがでしたでしょうか。

Cloudflareは他にもHTTPレイヤーを中心として様々な通信を処理する機能を提供しています。

https://zenn.dev/kameoncloud

でその機能を試してまとめているので興味のある方はぜひご覧ください。
