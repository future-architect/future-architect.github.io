---
title: "AWS Certified SysOps Administrator – Associate 合格体験記"
date: 2022/03/09 00:00:00
postid: a
tag:
  - AWS
  - SOA
  - 合格記
category:
  - Infrastructure
thumbnail: /images/2022/20220309a/thumbnail.png
author: 渡邉光
lede: "2019年新卒入社筋肉エンジニアの渡邉光です。AWS Certified SysOps Administrator – Associate (AWS SOA-C02) を受験してきました。無事合格できたので、Associate試験は3冠を達成することができました！"
---

<img src="/images/2022/20220309a/AWS-Certified_Sysops-Administrator_Associate_512x512.png" alt="" width="512" height="512">

お久しぶりです。2019年新卒入社筋肉エンジニアの渡邉光です。

前回の[AWS Certified Developer - Associate 合格体験記](https://future-architect.github.io/articles/20210906a/)から結構時間がたってしまいましたが、時間的に余裕が出てきたのでAWS Certified SysOps Administrator – Associate (AWS SOA-C02) を受験してきました。無事合格できたので、Associate試験は3冠を達成できました！

* AWS Certified Cloud Practitioner (AWS CLF)
* AWS Certified Solutions Architect – Associate (AWS SAA)
* AWS Certified Developer - Associate (AWS DVA)
* AWS Certified SysOps Administrator – Associate (AWS SOA-C02) ★NEW!

# AWS Certified SysOps Administrator – Associate (AWS SOA-C02)とは

AWS認定資格の1つで、AWSでのワークロードのデプロイ、管理、運用に関して問われる試験になっています。去年の7月27日にAWS SOAの試験形式が刷新されました。従来の択一選択問題、複数選択問題に加えて、**試験ラボ（マネジメントコンソール操作）** が追加されました。

試験ラボは、サンドボックス用のAWSアカウントを操作し表示されたシナリオ通りにマネジメントコンソールから設定を行っていく試験です。

試験ラボが追加になったことにより、試験時間も180分とかなりの長時間になっています。
※試験ガイドは[こちら](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-sysops-associate/AWS-Certified-SysOps-Administrator-Associate_Exam-Guide.pdf)で確認できます。

試験内容としては以下の分野について出題されます。

* モニタリング、ロギング、および修復
* 信頼性とビジネス継続性
* デプロイ、プロビジョニング、およびオートメーション
* セキュリティとコンプライアンス
* ネットワークとコンテンツ配信
* コストとパフォーマンスの最適化

具体的には、organizationsを利用したアカウント管理、cloudwatchでのメトリクス監視、cloudformationでのAWSリソースのデプロイ方法、aws cost exploer、aws budgetsでのコスト管理等、multi azでの高可用性について問われます。

# 学習方法

## 選択問題対策

### 学習サイト aws.koiwaclub.com

安定のkoiwaclubさんのサイトを使用して、選択問題の対策は行いました。koiwaclubさんの合格体験記にも記載があるように、#50~#95を中心に二周問題を解きました。試験当日もkoiwaclubさんで解いた問題と同じような意図の問題が多く出題されたためすらっと回答できたと思います。

## 試験ラボ対策

### AWS hands-on for Beginners

試験ラボでは与えられたシナリオ通りにマネジメントコンソールからの設定を行っていく必要があるので、AWSが公式で提供している[AWS hands-on for Beginners](https://aws.amazon.com/jp/aws-jp-introduction/aws-jp-webinar-hands-on/?trk=aws_blog)を利用して、普段なじみがないサービス等のキャッチアップやマネジメントコンソールの設定方法を学習していきました。AWS SOA-C02では、運用面でのサービスについて問われるため、運用系サービス代表のSystems Managerは以下のハンズオンを行い、サービスの概要とユースケース、設定方法等をキャッチアップしました。

[AWS Systems Managerを使ったサーバ管理はじめの一歩編](https://pages.awscloud.com/JAPAN-event-OE-Hands-on-for-Beginners-systems-manager-2022-reg-event.html?trk=aws_introduction_page)

高可用性についても問われるため、[スケーラブルウェブサイト構築編](https://pages.awscloud.com/event_JAPAN_Hands-on-for-Beginners-Scalable_LP.html?trk=aws_introduction_page)も行い、一般的な高可用性アーキテクチャについて学習しました。

# 受験結果と感想

合格ライン720点に対して777点と予想より低い点数となってしまいましたが、無事合格できました。

普段はterraformを使用してAWS環境構築を行っており、試験ラボのマネジメントコンソールから設定する形式に対応できるか不安だったので、試験範囲のサービスはマネジメントコンソールから設定できるようにAWS hands-on for Beginnersを利用したり、自分でアーキテクチャを考えてマネジメントコンソールから作成してみる等の対策を行いました。実際の試験ラボの結果も「コンピテンシーを満たしている」結果だったので、対策のおかげでハンズオンは余裕でした！

# 最後に

無事にAssociate三冠取得できたので、今後はprofessional試験に挑戦していこうと思います。

伊藤真彦さんが[AWS認定資格全冠された](/articles/20211112b/)のでAPN ALL AWS Certifications Engineersに表彰されます！ おめでとうございます！

私も伊藤さん目指して頑張ります！！
