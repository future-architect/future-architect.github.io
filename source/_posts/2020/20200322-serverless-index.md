---
title: "Serverless連載を始めます（2020）"
date: 2020/03/22 09:56:50
postid: ""
tag:
  - サーバーレス
  - インデックス
category:
  - Programming
thumbnail: /images/2020/20200322/thumbnail.png
author: admin
lede: "AWSのLambdaに代表されるサーバレスアプリは実行時のみ稼働するため、サーバー稼働によるあらゆるコストから解放され、システム開発の工数を減らすことができます。例えば何らかのAPIを提供する場合でも、API GatewayとLambdaを組み合わせることで提供可能です。"
---

<img src="/images/2020/20200322/lightning-bolt-1203953_640.png" alt="" width="640" height="360" loading="lazy">

サーバレスをテーマにしたブログ連載を始めますので、そのご報告です。

## サーバレスとは

サーバレスを説明するためによく使われるのが以下の2つではないでしょうか？

🙅✗「サーバーがない?」
🙆◎「サーバーの存在を意識しない」

サーバの存在を意識しないというのは、サーバーのメンテナンスに人的リソースや労力を割くことが不要で、ビジネスにより価値を生み出す作業に集中できることです。そういった状態に限りなく近づけるアーキテクチャだとか、コンピューティングの考え方をサーバレスと呼ぶことが多いでしょう。

AWSやGCPのページでも簡潔に説明している記事がありますので適時参考にしていただければとい思います。

> * https://aws.amazon.com/jp/builders-flash/202003/awsgeek-serverless/
> * https://cloud.google.com/serverless/

## 投稿一覧

| No | 著者     | タイトル                                                          |
|----|----------|-------------------------------------------------------------------|
| 1  | 栗田真   | [SAMを使ったローカルテスト（Go編）](/articles/20200323/)                                 |
| 2  | 真野隼記 | [AWS Lambda×Goの開発Tips](/articles/20200326/)                                           |
| 3  | 澁川喜規 | [Goでサーバーレス用の検索エンジンwatertowerを作ってみました](/articles/20200327/)        |
| 4  | 佐藤尚至 | [Firebase CrashlyticsでAndroidアプリのエラーログをさくっと収集する](/articles/20200330/) |
| 5  | 村田靖拓 | [CloudEventsのGo版SDKをいじってみる](/articles/20200331/)                                |
| 6  | 真野隼記 | [AWSのStep FunctionsとLambdaでServelessなBatch処理を実現する](/articles/20200515/)       |
| 7  | 加部達郎 | [AWSサービストリガによるLambda起動](/articles/20200722/)                                 |
| 8  | 真野隼記 | [GoからAWS KinesisのAggregationFormatを利用する](/articles/20200727/)                    |

## 最後に

AWS LambdaやCloud Functionsは当たり前のように溶け込んで来ています。サーバレスの世界観自体は正しい進化の方向だと思いますので、個人的にはドンドン取り入れていこうと思います。
