---
title: "AWS初心者向けNW構築ハンズオン-Internal編-"
date: 2021/08/31 00:00:00
postid: a
tag:
  - AWS
  - Network
  - 初心者向け
  - VPC
  - トラブルシュート
  - ハンズオン
category:
  - Infrastructure
thumbnail: /images/2021/20210831a/thumbnail.png
author: 加藤周平
lede: "AWS初心者にとって、最初に躓きやすい部分がNWの構築かと思います。インスタンス立ててみたけど、これってどうやると他のノードと通信できるんだっけ？なんとなく通信できたけど、なんでだ？といった辺り、なんとなく有耶無耶なままにしていませんか。今回は2020年12月にローンチされたReachability Analyzerを利用して、AWS初心者向けのNW構築ハンズオン-Internal編-をやってみたいと思います。"
---
# はじめに

AWS初心者にとって、最初に躓きやすい部分がNWの構築かと思います。

インスタンス立ててみたけど、これってどうやると他のノードと通信できるんだっけ？ なんとなく通信できたけど、なんでだ？ といった辺り、なんとなく有耶無耶なままにしていませんか。

今回は2020年12月にローンチされたReachability Analyzerを利用して、AWS初心者向けのNW構築ハンズオン-Internal編-をやってみたいと思います。

参考：[新機能 – VPC Reachability Analyzer](https://aws.amazon.com/jp/blogs/news/new-vpc-insights-analyzes-reachability-and-visibility-in-vpcs/)

# 流れ

- 前準備
    1. VPCを２つ作成
    1. 各VPCにサブネットを作成
    1. 各VPC内にEC2を作成
- AWS Reachability Analyzerを利用しての疎通確認
  - #1 VPC Peeringが不足している
  - #2 Route Tableのルーティングが不足している
  - #3 Security Groupのインバウンドの許可設定が不足している
  - #4 振り返り

# 前準備

## 1. VPCを作成

VPCを2つ作成
<img src="/images/2021/20210831a/vpc_a.png" alt="vpc_a.png" width="1008" height="266" loading="lazy">
<img src="/images/2021/20210831a/vpc_b.png" alt="vpc_b.png" width="1019" height="270" loading="lazy">
参考：[Amazon VPC IPアドレス設計レシピ](https://dev.classmethod.jp/articles/vpc-cidr/)

## 2. 各VPCにサブネットを作成

各VPC（InternalA, B）に、それぞれサブネットを作成する
<img src="/images/2021/20210831a/subnet.png" alt="subnet.png" width="1200" height="83" loading="lazy">

## 3. 各VPCにEC2を作成

今しがた作成した各サブネットにEC2を立てます。
イメージはAmazon Linux2、インスタンスサイズはt2.microの無料利用枠にしています。
<img src="/images/2021/20210831a/ec2_a.png" alt="ec2_a.png" width="851" height="356" loading="lazy">
<img src="/images/2021/20210831a/ec2_b.png" alt="ec2_b.png" width="856" height="347" loading="lazy">

また、EC2作成のタイミングで、Security Groupも作成しています。
判別しやすいようNameのみ設定しており、ルールはデフォルトのままです。
<img src="/images/2021/20210831a/sg_a.png" alt="sg_a.png" width="660" height="362" loading="lazy">
<img src="/images/2021/20210831a/sg_b.png" alt="sg_b.png" width="623" height="366" loading="lazy">

# Reachability Analyzerを利用しての疎通確認

前準備は完了したので、ここからはReachability Analyzerを利用しながら疎通確認をしていきましょう。

VPCのメニューバーから選択利用できます。
<img src="/images/2021/20210831a/ra01.png" alt="ra01.png" width="423" height="121" loading="lazy">

`パスの作成と分析`からパスを作成します。
今回はInterna-AのEC2からInternal-BのEC2への疎通確認をします。
ポートはhttpsを意識して443としています。
<img src="/images/2021/20210831a/ra02.png" alt="ra02.png" width="1163" height="157" loading="lazy">

## #1 VPC Peeringが不足している

パスを作成すると同時に分析が実行されます。
分析が完了し、ステータスが`到達不可能`になっていることが確認できます。
詳細を見ていきましょう。
<img src="/images/2021/20210831a/ra03.png" alt="ra03.png" width="517" height="72" loading="lazy">

詳細を確認すると、VPC Peeringが接続できていないようです。
<img src="/images/2021/20210831a/ra04.png" alt="ra04.png" width="1169" height="526" loading="lazy">

VPC Peeringとは、異なるVPC間の通信を実現するためのサービスです。
参考：[VPCピアリングを作りながら学んでみた](https://dev.classmethod.jp/articles/handson-vpc-peering/)

VPCのコンソール画面からピアリング接続を設定します。
<img src="/images/2021/20210831a/vpc_peering_atob01.png" alt="vpc_peering_atob01.png" width="736" height="524" loading="lazy">

設定後、アクションメニューバーから承諾を行う必要がある点に注意です。
<img src="/images/2021/20210831a/vpc_peering_atob02.png" alt="vpc_peering_atob02.png" width="972" height="195" loading="lazy">

再度、分析してみましょう。

## #2 Route Tableのルーティングが不足している

分析結果が変わっています。3つ指摘があるようです。先に、1つ目と3つ目を見ていきます。
<img src="/images/2021/20210831a/ra05.png" alt="ra05.png" width="790" height="170" loading="lazy">

`rtb-026e0943b428a980d`とは、Internal A（VPC）に紐付いているルートテーブルです。
`pcx-032cb64744c1e754a`とは、先程作成したVPC Peeringのことです。
Internal AからVPC Peeringに対するルーティング設定が不足しているという指摘のようです。
ルーティングを設定しましょう。ターゲットを先のVPC Peeringに向けて、送信先のCIDRはInternal Bを指定します。

<img src="/images/2021/20210831a/vpc_a_rt.png" alt="vpc_a_rt.png" width="750" height="230" loading="lazy">

3つ目は反対に、Internal BからVPC Peeringに対するルーティング設定が不足しているという指摘です。同じ要領で設定をします。この時、送信先のCIDRはInternal Aを指定します。
<img src="/images/2021/20210831a/vpc_b_rt.png" alt="vpc_b_rt.png" width="742" height="187" loading="lazy">

再度、分析してみましょう。

## #3 Security Groupのインバウンドの許可設定が不足している

先の指摘がクリアになっています。いい感じです。
残りの指摘を見ると、Security Groupのingressルールが不足しているようです。
<img src="/images/2021/20210831a/ra06.png" alt="ra06.png" width="501" height="87" loading="lazy">

`03766d1ad9783c83b`とはInternal BのEC2にアタッチされているSecurity Groupのことです。
このSecurity GroupがInternal AのEC2からの通信を拒絶しているので、許可設定をします。

今回はhttps通信を想定して、443ポートでの疎通確認をしていました。
そのためSecurity Groupのインバウンドルールに443ポート、CIDR10.1.0.0/16からの通信を許可する設定を追加します。
<img src="/images/2021/20210831a/sg_b_inbound.png" alt="sg_b_inbound.png" width="1049" height="253" loading="lazy">

再度、分析してみましょう。

## #4 振り返り

通信に成功しました！
<img src="/images/2021/20210831a/ra07.png" alt="ra07.png" width="364" height="156" loading="lazy">

通信経路も視覚的に確認できます。
<img src="/images/2021/20210831a/ra08.png" alt="ra08.png" width="317" height="442" loading="lazy">

わかりやすく注釈をつけてみました。
<img src="/images/2021/20210831a/ra09.png" alt="ra09.png" width="440" height="435" loading="lazy">
黒字で記載している箇所は今回意識しなかった箇所です。

- EC2のENI：
  - EC2が通信を行うためのインタフェースです。ENIがないとEC２は通信を行うことができません。EC2を作成したタイミングで合わせて払い出されています。
- VPCのACL：
  - VPCの単位でNWの制御を行うためのサービスです。セキュリティグループ同様にセキュリティを高める目的で利用します。

参考：[AWSのネットワークインターフェース「ENI」とは](https://business.ntt-east.co.jp/content/cloudsolution/column-14.html)
参考：[Amazon VPCのネットワークACLについて](https://dev.classmethod.jp/articles/amazon-vpc-acl/)

なぜ、今回はInternal AのSecurity Groupの設定を操作せずに済んだのかというと、もともと外向きの通信が許可されていたためです。
<img src="/images/2021/20210831a/sg_a_outbound.png" alt="sg_a_outbound.png" width="1090" height="245" loading="lazy">

## まとめ

今回のNW構成を簡単に図化すると以下です。

Internal AのVPCにいるEC2からInternal BのVPCにいるEC２に向けて投げられた通信は、SecurityGroupを抜けて、VPCのRouteTableを利用して、VPCPeeringへと流れていきます。

VPC Peeringを抜けた通信はやがてInternal Bに到達し、Securituy Groupを抜けて対向のEC2へとたどり着きました。

<img src="/images/2021/20210831a/diagram.png" alt="diagram.png" width="1200" height="723" loading="lazy">
