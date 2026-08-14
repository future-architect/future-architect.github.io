---
title: "Japan Datadog User Group Meetup#20@札幌に登壇しました"
date: 2026/08/14 00:00:00
postid: a
tags:
  - 登壇レポート
  - Datadog
  - オブサーバビリティ
  - MCP
  - SRE
categories:
  - DevOps
thumbnail: /images/2026/20260814a/thumbnail.png
author: 棚井龍之介
lede: "Japan Datadog User Group Meetup#20@札幌で「AI時代のひとりSREのすすめ」というテーマで登壇しました。Datadog MCP Serverを軸に、運用もチーム連携もコンプラ対応もひとりで進められるようになった経緯を話しました。"
---
<img src="/images/2026/20260814a/top.png" alt="" width="660" height="374" loading="lazy">

## はじめに

こんにちは。Cyber Security Innovation Group所属、FutureVulsチームの棚井龍之介です。

2026年8月10日(月)開催の [Japan Datadog User Group Meetup#20@札幌](https://datadog-jp.connpass.com/event/389998/) に登壇しました。テーマは「Bits AI & Datadog MCP Server」で、さっぽろ大通ビアガーデンの時期に合わせた現地参加限定の回です。会場はクラスメソッド札幌オフィスでした。

前回の登壇で「活用事例はまた今度」という個人的な宿題を残していたので、今回はその回収です。フューチャーからの過去の登壇ブログもあわせてご覧ください。

- [Japan Datadog User Group Meetup#8@札幌に登壇しました](https://future-architect.github.io/articles/20250307a/)(棚井)
- [Japan Datadog User Group Meetup#14@福岡に登壇しました](https://future-architect.github.io/articles/20251128a/)(FutureVulsチーム 市川さん)

## 発表内容

私の発表タイトルは「**AI時代の"ひとりSRE"のすすめ～Datadog MCP Serverで運用もチーム連携もコンプラ対応も～**」です。Datadog MCP Serverを軸として、運用・チーム連携・コンプライアンス対応をひとりで進められるようになった経緯を話しました。

<img src="/images/2026/20260814a/スライド1.png" alt="" width="720" height="405" loading="lazy">

発表の冒頭で、ひとつ謎かけをしました。

> うちでいちばん Datadog を使っているメンバーは、Datadog の UI を、ほとんど操作していません。

<img src="/images/2026/20260814a/スライド2.png" alt="" width="720" height="405" loading="lazy">

### 「ひとり」の意味の変化

私は脆弱性管理SaaSの [FutureVuls](https://vuls.biz/) でSREとCSIRTを担当しています。これまで、ひとりSREは属人化やバス係数1のようなネガティブな文脈で語られてきました。この前提が、AIエージェントの実用化で変わったと私は考えています。AIはトークンの許す限り24時間365日動かせるため、個人で捌ける量が桁違いになり、守備範囲は自分の手が届く範囲から文脈を渡せる範囲へ広がりました。

<img class="bordered" src="/images/2026/20260814a/スライド4.png" alt="" width="720" height="405" loading="lazy">

### 転機と決断

Datadog導入の当初の目的は、率直に言えば調査工数の削減でした。ところが2026年3月、あるサプライチェーン攻撃について「うちは、影響を受けているか?」という調査を当日中に終わらせる経験をしました。ただ、当日の対応を振り返ると課題がありました。調査に必要な情報がどこにあるかは分かっていても、調査とデータの集約は人手に依存し、実際に調べられるメンバーも限られていました。これはもはやSPOF(単一障害点)なので、改善したいと考え始めました。

<img class="bordered" src="/images/2026/20260814a/スライド11.png" alt="" width="720" height="405" loading="lazy">

たまたま翌月、世界最大級の脆弱性サミットであるVulnCon 2026(米国)に「The CVE Blind Spot」というタイトルで登壇していました(詳細は [FutureVulsブログのレポート](https://www.vuls.biz/blog/vulncon-2026-speaked) にあります)。その会場で刺さったのが、次の一言です。

> トリアージは、検知ではなく、文脈集約の問題だ

<img class="bordered" src="/images/2026/20260814a/スライド13.png" alt="" width="720" height="405" loading="lazy">

この一言をきっかけに、「データの集約はDatadogへ、活用のインターフェースはMCP Serverへ」という方針を決めました。帰国後に進めたことは2つあります。ひとつは環境整備です。分散していたデータをDatadogに集約し、タグや命名をAIエージェントが読める形に整理して、DatadogやGitHub、ZendeskなどのMCP Server接続を整えました。もうひとつはセキュリティ強化で、インシデント対応の型化や外部認証の取得準備を進めました。ひとりで両方を回せたのは、調査や作業をClaude CodeなどのAIエージェントに任せられたからです。

### チームに定着した使い方

ほんの二、三ヶ月でDatadog MCP Serverをベースとした運用が定着しました。問い合わせ対応、開発前の壁打ち、PoCとCSの支援、環境キャッチアップ、パフォーマンス改善などです。発表では、このうち3つを紹介しました。

#### 問い合わせ対応が新規参画者の教材になった

Zendeskの問い合わせチケットを起点に、Claude Codeへ調査を依頼するようになりました。Claude CodeはDatadogやGitHubなどのMCP Serverへ並列に照会し、結果を集めて回答のドラフトと根拠まで作ります。参画直後のメンバーが問い合わせ対応で仕様を学ぶという運用スタイルもできました。MCP連携のフル活用により、問い合わせの総数が増えても少人数で回っています。

<img class="bordered" src="/images/2026/20260814a/スライド17.png" alt="" width="720" height="405" loading="lazy">

#### 作る前に、システム環境に聞く

開発の着手前に、AIエージェントへ現状を調べさせて設計の壁打ちができるようになりました。To-Be(ありたい姿)はリクエストやBacklogに日々集まってきます。一方のAs-Is(いまの姿)は、メトリクスやログが集約済みのDatadogにAIエージェント経由でいつでも聞けます。このTo-BeとAs-Isの差分が、そのまま設計レビューの材料にもなります。上級エンジニアでなければ意識しないメトリクスまで調べてくれますし、変更前後の状態も全てログに残ります。

<img class="bordered" src="/images/2026/20260814a/スライド18.png" alt="" width="720" height="405" loading="lazy">

#### エンジニア以外のメンバーもDatadogを使い始めた

RUM(Real User Monitoring)と自然言語の組み合わせで、契約単位やユーザ単位の機能利用状況を、非エンジニアのメンバーが自分で調べられるようになりました。PoC支援やCS活動の判断材料になり、セールスやCSのチームにも利用が広がり始めています。ダッシュボードに抵抗があったメンバーも、自然言語で欲しい情報へ届くようになりました。

<img class="bordered" src="/images/2026/20260814a/スライド19.png" alt="" width="720" height="405" loading="lazy">

### コンプライアンス対応(ISO 27001/27017)

ここまでは、環境整備の上で生まれた使い方の話でした。並行して進めていたセキュリティ強化でも成果があり、FutureVulsは2026年6月にISO/IEC 27001と27017を取得しました(詳細は [FutureVulsのセキュリティへの取り組み](https://www.vuls.biz/about/security) をご覧ください)。DatadogのCloud SecurityにあるCompliance機能を、現在地を測る計器として、ギャップ分析の起点や改善サイクルの参考指標に使いました。調べる道具が、証明を支える道具にもなりました。

<img class="bordered" src="/images/2026/20260814a/スライド20.png" alt="" width="720" height="405" loading="lazy">

### 種明かし

冒頭の謎かけに戻ります。

> うちでいちばん Datadog を使っているメンバーは、Datadog の UI を、ほとんど操作していません。

答えは、Datadogへの入口がUIからMCPに変わっていたからです。MCP対応が決め手となり、UI経験ゼロのメンバーを含むチーム全員がDatadogのデータを使うようになりました。一方で、新しい課題もあります。MCP経由の利用が中心になると、UIに触れる機会が減り、機能の全体像を知らないまま使う場面も出てきます。ここは今後、私からメンバーへのUIレクチャーで補っていく必要があります。

<img class="bordered" src="/images/2026/20260814a/スライド22.png" alt="" width="720" height="405" loading="lazy">

発表の最後に、ひとりSREを「全員が意識しなくても使える状態を作る人」と定義し直しました。まず、私がタグや命名、MCP接続をAIエージェントが読める形に整えます。すると、聞き方を共有するだけで、エンジニア以外のメンバーにも使い方が広がっていきます。さらに、私が想定していなかった使い方がチームに生まれて、次の整備のヒントとして還ってきます。この「整える、広がる、還ってくる」という循環は、意思決定の速いひとりだからこそ一気に回せます。

<img class="bordered" src="/images/2026/20260814a/スライド23.png" alt="" width="720" height="405" loading="lazy">

発表は、この3行で締めました。

> データをDatadogに集約し、MCPで誰でも使えるようにする。
> それにより、守備範囲はSREからセキュリティ、外部認証まで広がる。
> そして、Datadogを活用するメンバーが増えていく。

## 当日の様子

テーマの通り、Claudeの利用状況の監視、Bits Agent Builderの活用事例、DASH 2026のre:Capなど、Bits AIとMCP Serverの事例が並ぶ濃い回でした。セッション一覧は [connpassのイベントページ](https://datadog-jp.connpass.com/event/389998/) にあります。当日の雰囲気は、Xで #JDDUG を検索すると参加者の投稿から伝わります。

今回いちばんの収穫は、Datadogアンバサダーのようにフル活用しているユーザの意見を直接聞けたことです。Datadogでは次々と新しいサービスが追加されますが、自分のシステム環境ですぐに試せるとは限りません。だからこそ、すでに使い込んでいるユーザから使用感や勘所を聞き、気になった部分をその場で質問できる機会は貴重です。ユーザ同士だからこそ話せる、ネットには載せられないディープな情報が飛び交うのも、ユーザ会ならではの面白さです。

## Datadog認定プログラムのすすめ

種明かしで書いた通り、MCP経由の利用が広がるほど、UIや機能の全体像に触れる機会は減っていきます。ここで役立つのが [Datadogの認定プログラム](https://www.datadoghq.com/ja/certification/overview/) です。現在は次の5つがあります。

- Datadog Fundamentals:プラットフォーム利用の基礎。Agentの設定やトラブルシューティング、データの可視化など
- Log Management Fundamentals:ログの収集からパース、検索、分析まで
- APM and Distributed Tracing Fundamentals:アプリケーションの計装と分散トレーシング
- Datadog Cloud SIEM for AWS Fundamentals:AWS環境の脅威検知とインシデントレスポンス
- Datadog Database Monitoring Fundamentals:DBモニタリングの構成とパフォーマンス分析

ユーザ会の参加者には、この5資格を当たり前のようにコンプリートしている方が複数いて、刺激を受けました。試験のシラバスがDatadogの機能一覧を兼ねているので、MCP経由で使い始めたメンバーがUIを学ぶ順序の参考になります。うちのチームでも、それぞれの担当領域に近いFundamentalsから勧めるつもりです。

## おわりに

「活用事例はまた今度」という個人的な宿題を1年半越しに回収できました。運営の皆様、会場を提供いただいたクラスメソッド様、参加者の皆様、ありがとうございました。

次の宿題は、Bits AIも含めたその後の話でしょうか。今後とも、JDDUGコミュニティの皆様方、よろしくお願いします。
