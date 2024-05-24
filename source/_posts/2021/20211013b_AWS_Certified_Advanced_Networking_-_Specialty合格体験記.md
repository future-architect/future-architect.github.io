---
title: "AWS Certified Advanced Networking - Specialty合格体験記"
date: 2021/10/13 00:00:01
postid: b
tag:
  - AWS
  - 合格記
  - Network
category:
  - Infrastructure
thumbnail: /images/20211013b/thumbnail.png
author: 伊藤真彦
lede: "TIGの伊藤真彦です。来たる11月13日に[Go Conference 2021 Autumn]に、技術ブログでもお馴染みの澁川さん、辻さんと共に登壇させていただくことになりました。楽しい発表になるように頑張ります。宣伝を挟みましたが、AWS Certified Advanced Networking - Specialtyに合格しましたので、今回も合格体験記を書きます。"
---
TIGの伊藤真彦です。

来たる11月13日に[Go Conference 2021 Autumn](https://gocon.jp/2021autumn/)に、技術ブログでもお馴染みの澁川さん、辻さんと共に登壇させていただくことになりました。

楽しい発表になるように頑張ります。

宣伝を挟みましたが、AWS Certified Advanced Networking - Specialtyに合格しましたので、今回も合格体験記を書きます。

# AWS Certified Advanced Networking - Specialtyとは

<img src="/images/20211013b/image.png" alt="合格バッチ" width="600" height="600" loading="lazy">


その名の通り高度なネットワーク知識に特化した試験です。
オンプレミスとのハイブリッドクラウド、Direct Connect接続、複数社のVPCの合体技といった様々な前提条件ありきのセキュアな通信、ベストプラクティスの知識が求められます。

AWS Certified Security - Specialtyと比べると、他の試験では出題されない要素が多めです。
前提条件が複雑なため、問題の要点を読み解く難易度はいくつかSolutions Architect - Professionalに匹敵する問題があります。
簡単な問題もこの試験でのみ出てくるものが多く、覚えればすぐに解けるものの、見覚えが無いと手も足も出ないような問題が出題される傾向がありました。

# 学習方法

今回も[aws.koiwaclub.com](https://aws.koiwaclub.com/)で合格できました。
あまりにも初見の情報が多く、また初見の場合一切推測できないものが多いため保険としてudemyの教材も買ってみましたが、終わってみた所感としては必要なかったかなと感じました。

下記の内容を一通り理解する必要があります。

#### 複雑なネットワーキング

* AWS Direct Connect(様々な前提条件、観点での設問が沢山出ます)
* VPN
* VPCピアリング
* AWS Transit Gateway

#### セキュアな通信

* AWS WAF
* 侵入防止システム (IPS)
* DDoS 保護
* VPCフローログ

#### グローバル、低遅延なネットワーキング

* Amazon Route 53
* Amazon CloudFront
* Lambda@Edge

#### ハイパフォーマンスコンピューティング

分散処理基板等の用途でEC2インスタンスを利用する際の下記のような前提知識が出題されます。

* プレイスメントグループ
* 拡張ネットワーキング
* ジャンボフレーム
* Elastic Network Interface
* HVM AMI

#### その他基礎知識

* パブリックサブネット、プライベートサブネット
* NACL、セキュリティグループ
* インターネットゲートウェイ、NATゲートウェイ
* ALB、CLB、NLBなどロードバランサーの使い分け
* CIDR、サブネット、IPアドレスなどの基礎知識
* Wireshark、SquidなどAWSに限らないネットワーク関連のツールの知識

例えばEC2インスタンスのセキュリティグループの設定で169.254.169.254、ポート80番のアウトバウンドが塞がっているとインスタンスのメタデータにアクセスできず、IAMロールの取得に失敗する事などマニアックな問題が数多く出題されます。

参考: https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/WindowsGuide/instancedata-data-retrieval.html

# 感想

一通り頭に詰め終わってからの本番は一時間かからない程度で済みましたが、初見の段階では問題の意味を理解する事すらできず、学習の辛さはトップレベルでした。

一発で合格できて良かったです。

