---
title: "Future Tech Night #15 ~GCPのサーバーレスサービスを利用したWebアプリの開発~"
date: 2021/09/10 00:00:00
postid: a
tag:
  - GCP
  - TechNight
  - 登壇レポート
category:
  - Infrastructure
thumbnail: /images/20210910a/thumbnail.png
author: 伊藤太斉
lede: "Future Tech Night #15への登壇レポートと、内容についての解説です。"
---
こんにちは。TIGの[伊藤太斉](https://twitter.com/kaedemalu)です。

[Future Tech Night #15](https://future.connpass.com/event/220822/)に登壇報告と、その時の解説になります。

## 登壇資料

今回の登壇資料はこちらになります。

<script async class="speakerdeck-embed" data-id="79065ba6f3824c0296baca7eac3ad1aa" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

## 技術選定
今回Webアプリの開発にあたり、アプリを載せるためのGCPのコンピューティングサービスの比較検討を行いました。GCPのコーンピューティングサービスにはいくつか種類があり、

- Compute Engine
- Container Optimized OS (in Compute Engine)
- Kubernetes Engine
- Cloud Run
- App Engine
- Cloud Functions

の5種類があります。今回は5つを1つに絞るにあたり、以下の制約と要件に合わせて絞っていきました。

- コンテナですでに開発されている
    - 別途GKEで稼働しているアプリの一部の切り出しのため、コンテナ化がすでにされている
- 大量のリクエストを捌く必要がない
    - インフラとしてスケールする必要はあるが、固定費として多くかけたくない
- インフラの管理を極力減らしたい

上記の条件で絞ったものの、App EngineとCloud Runが残りました。この2つをさらに絞るために、リッスンポートが任意にできるかどうかという制約に設けたところ、Cloud Runに決定しました（App Engineは8080ポートでしか受け付けることはできませんが、Cloud Runは任意のポートでリッスンさせることができます）。

これで、無事使うサービスがCloud Runに決定しましたので、インフラの概形が出来上がりました。
次からはいよいよ内部の設定などを行っていきます。

<img src="/images/20210910a/Untitled_Diagram.png" alt="Untitled_Diagram.png" width="1011" height="541" loading="lazy">

## Serverless NEGの利用
Cloud Runは独自でエンドポイントが生成され、それをCNAMEとしてドメインと紐づけることが可能ですが、Cloud Armorを使ったIPやパスのアクセス制御を行うにはCloud Load Balancingが必要不可欠です。とはいえ、Cloud Runに直接さし込むことはできないのでこんな時は[Serverless NEG（Network Endpoint Group）](https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts?hl=ja)を利用しましょう。
利用する、とはいっても難しい設定することはなく、

- 利用するCloud Runを指定したServerless NEGを作成する
- LBのバックエンドの設定に上記で作成したServerless NEGを指定する

の2ステップで利用できます。私も作成時は難しいのではないかと構えていましたが、すんなり作成できていい意味でびっくりしました。

## サーバーレスVPCコネクタ
今回、Cloud RunはVPC接続されたCloud SQLに繋ぎに行く必要があるため、Cloud Run自身も漏れず、VPCに接続しないといけません。このようなVPC内部にあるサービスに対して、サーバーレスサービスが接続したい場合には、[サーバーレスVPCコネクタ](https://cloud.google.com/vpc/docs/serverless-vpc-access?hl=ja)を利用します。

サーバーレスVPCコネクタを作成する時は

- `/28`のサブネットを準備する
- コネクタで稼働するインスタンススペックを決定する
- サーバーレスVPCコネクタを作成する

のステップで作成できます。こちらも特段はまったポイントはないですが、`/28`の範囲をもつCIDRを利用する必要があるので、準備が必要です（多すぎても少なすぎても使用不可になります）。

さて、ここまでで、以下の構成が出来上がりました。これで完成に見えましたが、ハマりどころもあったので次で説明します。

<img src="/images/20210910a/projects_(1).png" alt="projects_(1).png" width="1200" height="605" loading="lazy">

## ハマりどころ
### サービスアカウントの権限

Cloud Runは作成した時に「Cloud Runサービスエージェント」のロールが付与されたサービスアカウントが作成されます。形は`service-PROJECT_ID@serverless-robot-prod.iam.gserviceaccount.com`となります。このサービスアカウントはIAMのページからも「Google 提供のロール付与を含みます」にチェックを入れないと見えないものなので、とても見落としやすいサービスアカウントです。

このサービスアカウントに対して、サーバーレスVPCコネクタを作成したプロジェクトで「サーバーレスVPCアクセスユーザー」を付与してあげることが必要です。

### Cloud Runのエラー

Cloud Runではサービスがうまくデプロイ完了しない場合、
> Cloud Run error: Container failed to start. Failed to start and then listen on the port defined by the PORT environment variable. Logs for this revision might contain more information.

というエラーが吐き出されます。端的には「Cloud Runで利用するコンテナがPORTで指定したものでリッスンできない」がエラーですが、これを愚直に考えてしまったため、とても時間を削ってしまいました。ただ、このエラーは**結果的に**ポートをリッスンできなかっただけで、本来のエラーはもっと手前で起こっていることが多いです。

このエラーとともにCloud Loggingのエラー詳細も同時にリンクを得られるため、それを確認することで、本当に起こっている問題を知ることができるので、デプロイ失敗した時にはCloud Loggingを確認する必要があります。

## 最後に

今回はGCPのサーバーレスサービスを活用したWebアプリの開発例をお見せしました。

コンテナで開発する例が非常に増えてきており、そのコンテナを載せるサービスも増えてきており、技術選定がとても大事になっています。今回は特にコストを最小限に抑えるなどの理由でCloud Runを選択しましたが、エンジニアとしては新しいサービスを使うのはやはり楽しいですね。要件も満たしつつ、最大限楽しくなるようなサービス開発をこれからも続けたいと思いました。
