---
title: "Future Tech Night #12～Serverless x Goの可能性～で発表しました"
date: 2021/07/13 00:00:00
postid: a
tag:
  - 登壇レポート
  - AWS
  - サーバーレス
  - TechNight
category:
  - Infrastructure
thumbnail: /images/20210713a/thumbnail.png
author: 伊藤真彦
lede: "2021/6/25（金）にFuture Tech Night #12～Goで始めるサーバレスファーストという選択肢～を開催しました。私はサーバレスの概要から実際に業務でサーバレスアーキテクチャを行っての経験談をお話ししました。"
---
<img src="/images/20210713a/top.png" alt="" width="600" height="281" loading="lazy">

TIGの伊藤真彦です。

2021/6/25（金）に[Future Tech Night #12～Goで始めるサーバレスファーストという選択肢～](https://future.connpass.com/event/216081/)を開催しました。

私はサーバレスの概要から実際に業務でサーバレスアーキテクチャを行っての経験談をお話ししました。

# 発表内容

資料は[こちら](https://www.slideshare.net/ssuserebd24d1/future-tech-night-12go)です。

<iframe src="//www.slideshare.net/slideshow/embed_code/key/4cJRNedlyqb6RY" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/ssuserebd24d1/future-tech-night-12go" title="Future tech night #12～goで始めるサーバレスファーストという選択肢～" target="_blank">Future tech night #12～goで始めるサーバレスファーストという選択肢～</a> </strong> from <strong><a href="https://www.slideshare.net/ssuserebd24d1" target="_blank">masahiko ito</a></strong> </div>

下記の流れで発表しました。

1. 自己紹介
2. サーバーレスとは
3. 何故Goなのか
4. 開発業務のイメージ
5. 業務でサーバレスを採用すると

# 発表の概要

### サーバーレスとは

サーバレスの概要から説明しました。

サーバレスという言葉にするとついついLambdaに特化した内容になりますが、定義としてはAWS FargateやAmazon S3など、幅広いサービスがサーバレスの枠に収まります、感覚的にはマネージドサービスという言葉の方がしっくりくるかもしれません。
これらマネージドサービスを含めたアーキテクチャ例を実例として発表しました。

### 何故Goなのか

ランタイムのバージョンアップに伴い、旧バージョンがLambdaで利用不能になる懸念や、言語仕様の破壊的な変更に対する不安の少なさ。

Lambdaの課金体系がms単位に変更されたことを踏まえた実行速度の有利性について説明しました。最後の決め手にはGoへの愛も存在するという内容が中々好評でした、やはり愛は大切ですね。

### 開発業務のイメージ

LambdaでGoアプリケーションを開発する際の業務イメージを説明しました。

AWS Lambdaは馴染みのある方も多いと思ったので、GCP Cloud Functionsバージョンもオマケに説明しました。

実際に触ってみると、同じような機能を開発する場合でもクラウドサービスによって開発手法が大きく異なる事がわかります。

[静的解析によるInvalidなAWS Lambda関数シグネチャの検知](https://future-architect.github.io/articles/20210603a/)など細かいtipsを随時技術ブログにアップしている事も宣伝させていただきました。

### 業務でサーバレスを採用すると

私が現在所属しているチームではサービスの殆どをマネージドサービスで動かし、本番環境に119個ものLambda関数が展開されている構成です。

その状況での所感や、実際のコスト事情などを発表しました。

実体験としてお得にクラウドサービスを利用できている証明になったと感じています。

# 感想

今回はイベント後に、座談会という体裁で参加いただいた方とコミュニケーションを取ることができました。日頃お世話になっているOSS開発者の方に直接お礼を言う事も出来たのが嬉しい誤算でした。引き続き、参加者の皆さんと交流できる場としてもイベントを盛り上げていければと考えています。

次回のイベント情報は[connpass](https://future.connpass.com/)で確認できます。

ぜひ遊びに来てください。

