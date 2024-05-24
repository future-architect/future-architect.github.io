---
title: "AWS Certified Security - Specialty合格体験記"
date: 2021/09/21 00:00:00
postid: a
tag:
  - AWS
  - 合格記
category:
  - Infrastructure
thumbnail: /images/20210921a/thumbnail.png
author: 伊藤真彦
lede: "TIGの伊藤真彦です。先日AWS Certified Security - Specialtyに合格しました。今回も合格体験記を残しておきます。"
---
TIGの伊藤真彦です。

先日[AWS Certified Security - Specialty](https://aws.amazon.com/jp/certification/certified-security-specialty/?ch=sec&sec=rmg&d=1)に合格しました。
今回も合格体験記を残しておきます。

<img src="/images/20210921a/image.png" alt="合格ロゴ" width="300" height="300" loading="lazy">

# AWS Certified Security - Specialtyとは

暗号化や脆弱性対策、安全な通信の実現など、セキュリティに関するトピックを集めた試験です。

Solutions Architectをはじめ、各種試験にもセキュリティに関する問題は出題されます。

傾向としては、他の試験の問題からセキュリティ部分を抜き出したもののような印象を受けるものが半分以上ありました。逆に言うとこれを受験するとセキュリティに関してはSolutions Architect - Professional以上の知識が身につくと捉えても差し支えないでしょう。

なおフューチャーで開発している[Future Vuls](https://vuls.biz/)で扱うような意味合いでのセキュリティについては試験の守備範囲外で、あくまでもクラウドサービスの運用に関する試験になっています。

# 学習方法

まずは他の試験を受験して基礎を固めることを推奨します。

仮にAWSのサービスに関する知識が完全に無い状態で受験すると、何のセキュリティを何で守っているのか理解することが難しく学習に苦労すると思います。

私は基礎部分を学習済みのため[aws.koiwaclub.com](https://aws.koiwaclub.com/)だけで合格することができました。

下記の概要が一通り理解できるまでAWSの全体像を把握できていれば問題の内容自体が極めて難しいと感じる事はないと思います。

#### ネットワーキング

* NACL、セキュリティグループ
* NAT Gateway

#### 攻撃対策

* AWS WAF
* AWS Shield
* Amazon CloudFront

#### アクセス制御

* AWS IAM、 SCP
* Active Directory、 SSO
* Amazon Cognito

#### セキュリティ診断

* Amazon Inspector
* AWS Trusted Advisor
* AWS Config
* AWS Systems Manager
* Amazon GuardDuty
* AWS Artifact

#### ロギング

* VPC フローログ
* AWS CloudTrail
* Amazon CloudWatch Logs
* Amazon Athena

#### アラート、対応の自動化

* Amazon CloudWatch Events
* Amazon Simple Notification Service
* AWS Lambda

#### 暗号化

* AWS Key Management Service (KMS)
* AWS Secrets Manager
* AWS CloudHSM

Amazon S3はVPC Endpointやバケットポリシーの扱い、暗号化、ログ情報の保管場所などあらゆるトピックで出現します。

更にはAmazon MacieやAWS Security Hubといった比較的新しめのサービスもしっかりと出題されるようになっています。

学習の過程でDDOS攻撃やSQLインジェクション、ポートスキャン等、脆弱性やサイバー攻撃に関する概念のうち知名度の高いものは知っている前提で問題文が作成されます。脆弱性情報データベースに載っているマニアックな脆弱性については知らなくても一切問題ない程度の知識が要求されます。

各サービスの目的、違いを意識して概要を理解することが重要であり、全てを実際に運用できるほど熟知する必要はありませんが、それでもこうして並べてみるとそこそこの量になりました。

# 感想

基礎部分の試験を全て勉強済みの状態であるため簡単に感じる部分もありましたが、難易度としては申し分ないものでした。

AWS Security Hubなど新しめの情報のキャッチアップができたのが個人的には役に立ちました。

ここ数か月だけでも渡邉光さんの[AWS Certified Developer - Associate 合格体験記](/articles/20210906a/)に見られるように試験に合格する話を聞くようになりました、社内外問わずモチベーションを維持できるよう盛り上げていきたいですね。
