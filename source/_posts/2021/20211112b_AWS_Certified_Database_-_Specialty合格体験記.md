---
title: "AWS Certified Database - Specialty合格体験記"
date: 2021/11/12 00:00:01
postid: b
tag:
  - AWS
  - 合格記
  - DB
category:
  - Infrastructure
thumbnail: /images/20211112b/thumbnail.png
author: 伊藤真彦
lede: "TIGの伊藤真彦です。AWS Certified Database - Specialtyに合格しました。これにて2021年に受験できる11資格を全て制覇しました。来年SAP on AWS - 専門知識が登場する事が確定していますが、ひとまず完全制覇です。"
---

TIGの伊藤真彦です。
<img src="/images/20211112b/image.png" alt="image.png" width="512" height="512" loading="lazy">

AWS Certified Database - Specialtyに合格しました。

これにて2021年に受験できる11資格を全て制覇しました。
来年[SAP on AWS - 専門知識](https://aws.amazon.com/jp/certification/coming-soon/)が登場する事が確定していますが、ひとまず完全制覇です。

全試験の振り返りや思い出話は[Qiitaアドベントカレンダー](https://qiita.com/advent-calendar/2021/future)のネタにしようかなと思います、お楽しみに(宣伝)。

# AWS Certified Database - Specialtyとは

[AWS Certified Database - Specialty](https://aws.amazon.com/jp/certification/certified-database-specialty/)はその名の通りデータベースに関するテストです。

> この資格は、組織がクラウドイニシアチブを実装するための重要なスキルを持つ人材を特定して育成するのに役立ちます。AWS Certified Database - Specialty を取得すると、最適な AWS データベースソリューションを推奨、設計、維持するための専門知識が認定されます。

データベースに特化した試験ではありますが、基礎的な観点としては高可用性、安全性、費用対効果など各観点から考えたベストプラクティスや設計など、ソリューションアーキテクト等の基礎科目でお馴染みの傾向でした。
その他バックアップ、オンプレからの移行等において各サービスごとにどのような手法があるのかが微妙に異なる点をしっかり覚えていく点が重要です。
RDS for MySQL DBインスタンスのスナップショットをAurora MySQL DB クラスターとして復元できる点はこの試験のお陰で知りました。
こういった知識の引き出しが増えていくのがAWS資格試験を受けるモチベーションに繋がります。
少々寂しいですがデータベースエンジンレベルのパフォーマンスチューニング等はほぼ出題されません。

# 学習方法

私の記事では毎回出している[aws.koiwaclub.com](https://aws.koiwaclub.com/)は、執筆段階の2021年では試験問題が鋭意製作中であり、他のスペシャリティ資格と比べると半分程度の問題量が公開されています。
当然これだけでは不安なので[udemyの教材](https://www.udemy.com/course/aws-certified-database-specialty-practice-exams-dbs-c01/)を購入しました。
程よく出題傾向が被らず、かといってどちらもクオリティが高く良い対策になりました。

教材のおかげで6割程度は自信をもって解ける問題でした、専門知識は予習できなかった部分の体感難易度が高いのが苦しい所です。

出題傾向としては下記のような内容が出題されます。
当然データベースと名の付くものはほぼ全てが出題されます、Amazon Neptuneあたりは唯一の出番かもしれません。

#### データベースの知識

* Amazon Aurora
* Amazon DocumentDB (MongoDB 互換)
* Amazon DynamoDB
* Amazon DynamoDB Accelerator (DAX)
* Amazon ElastiCache
* Amazon Neptune
* Amazon Quantum Ledger Database (Amazon QLDB)
* Amazon RDS
* Amazon Redshift
* Amazon Timestream

#### データ移行

* AWS Database Migration Service (AWS DMS)
* AWS DataSync
* AWS Schema Conversion Tool
* AWS Snow ファミリー

#### セキュリティ、コンプライアンス:

* AWS CloudHSM
* AWS Directory Service
* AWS Identity and Access Management (IAM)
* AWS Key Management Service (AWS KMS)
* AWS Secrets Manager

#### その他基礎知識

* Amazon Simple Notification Service (Amazon SNS)
* Amazon Simple Queue Service (Amazon SQS)
* Amazon EC2
* Amazon Elastic Container Service (Amazon ECS)
* Amazon Elastic Kubernetes Service (Amazon EKS)
* Elastic Load Balancing
* AWS Lambda
* AWS Auto Scaling
* AWS CloudFormation
* AWS CloudTrail
* Amazon CloudWatch
* AWS Config
* AWS Trusted Advisor
* Amazon Elastic Block Store (Amazon EBS)
* Amazon S3

## 感想

Data Analytics - Specialtyよりは安全な難易度でしたが、個人的な都合で勉強時間1週間で試験に臨んだ結果、少々受かるか不安な状態でした。
こちらも一発合格できて良かったです。

