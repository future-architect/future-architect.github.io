---
title: "Future Tech Night(第5弾：AWS＆DataPlatform MaaSビジネス編)を開催しました"
date: 2020/12/28 00:00:00
postid: ""
tag:
  - AWS
  - データレイク
  - 登壇レポート
  - TechNight
category:
  - Programming
thumbnail: /images/20201228/thumbnail.png
author: 多賀聡一朗
lede: "こんにちは、TIGの山田、町田、多賀です。先日2020/11/25にオンラインにてFuture Tech Nightという社外勉強会を開催しました。今回は第5弾としてAWS＆DataPlatform を活用した、MaaSビジネスの最新事例を紹介しました"
---

## はじめに
こんにちは、TIGの山田、町田、多賀です。先日2020/11/25にオンラインにてFuture Tech Nightという社外勉強会を開催しました。今回は第5弾としてAWS＆DataPlatform を活用した、MaaSビジネスの最新事例を紹介しました。

* [Future Tech Night #1 ~メディア業界変革編～](https://future.connpass.com/event/177093/)
* [Future Tech Night #2 ～MaaS ビジネス編～](https://future.connpass.com/event/179387/)
* [Future Tech Night #3 ～船舶IoT Platform編～](https://future.connpass.com/event/185051/)
* [Future Tech Night #4 〜Go x AWS スマート工場編〜](https://future.connpass.com/event/188742/)
* [Future Tech Night #5 〜AWS＆DataPlatform MaaSビジネス編〜](https://future.connpass.com/event/195568/) ← 今回はここ

<img src="/images/20201228/74fb7c65c1ef518a159eb99b5105ef10.png" loading="lazy">


## 概要

勉強会は以下のような構成で行いました。

* FutureとTechnology Innovation Groupの紹介
* DataPlatform 構築と Tips 紹介
* DataPlatform 蓄積データの外部提供の仕組みの紹介

多賀からは、DataPlatform の構築方法と設計事例の共有と、 構築にあたって利用したシステム・サービスの Tips の紹介をしました。DataPlatform で必要な要素を分解し、責務を分けた設計事例をお話いたしました。Tips では、バッチ処理・AWS Glue・Airflow についてお話いたしました。
<img src="/images/20201228/image.png" loading="lazy">

町田からは、DataPlatformに蓄積されたデータを外部に提供する仕組みを構築するにあたっての検討内容を紹介しました。また、データ提供基盤であるGatewayアプリの全体像をお話しました。

<img src="/images/20201228/2020-12-25_153425.jpg" loading="lazy">


## 登壇者からコメント

町田: 本当はもっと細かい部分で、各要素の詳細や技術的な話をもっとしたかったのですが、諸事情によりかなりモヤっとした中身になってしまい、内容が薄く得るものが少なかったことは残念でした。

多賀: MaaS サービスを提供するにあたって肝となる、DataPlatform についてお話いたしました。発展途上の中、現状得られた知見をできる限り共有いたしました。少しでも持ち帰ってもらえるものがあったとしたら嬉しいです。

## 勉強会でいただいた質問

### Q. リアルタイムデータ連携のKinesisからLambdaって流れありますが、KinesisFirehoseではなく、Lambdaを挟んだのは何故か知りたいです。

発表時は Firehose の GAがまだだったためと回答いたしましたが、 GA が 2017/08/25 であることから誤りでした。 採用理由ですが、配置先の S3 Bucket と prefix を柔軟に切り替えたかったためが正でした。

### Q. Glueは、CloudWatchなどで定期実行でしょうか？

いえ、Airflow を利用して定期実行しております。

### Q. Glueの処理結果の正常・異常の監視はどのような方法で、何のステータスを見ていますか？

Airflow からジョブを起動しており、Airflow ジョブ内で正常・以上のステータスを判定し、エラーを検知する仕組みとしております。

### Q. Airflowについて質問です。StepFunctionsとAirflow比べた時のAirflowの優位性は何でしょうか？

Python でジョブを実装することができるため、 Python で実現できることがほぼ全て可能になります。 そのため、より柔軟なジョブ設定を行うことができます。

### Q. Redshiftの同時接続で問題は起きたことありますか？

当環境では、データ量・接続数共に少ない影響で、現状は発生したことはございません。

### Q. LambdaとAPIGateway、どこがどう辛かったんでしょうか。

ここでは詳細は語れない部分もありますが、Gateway処理を検討していった際に、単純な認証・認可のみのような制御だけではなく、他にもいろいろな制御が必要なことが判り、全て実装していくにはLambdaよりもECSでプロキシのようなアプリとして方が良さそうという判断となりました。

### Q. 同時アクセス時の結果整合性はどのように取られてますでしょうか？

ここでは利用量の制限チェックの話として捉えますと、利用量のチェックをする際にDynamoDBの値をチェックしますが、その値は、瞬間的に連続でアクセスした場合は、常に最新のものが取れるとは限りません。
ただし、最新の値が取れないことは、ここでは利用ユーザの不利益になることではない（むしろ逆）ため、良しとしています。

### Q. API Gateway を多用途に備えようとすると，遅延などの要求を満たすためにはDynamoDBインスタンスの要求スペックが上がっていくと想像しますが，想定以上にコストがかかったなどの苦労話はありますでしょうか

現状では、利用ユーザ・アクセスは少ないため苦労話は今のところは無いです。今後見えてくる課題にはなり得ると思っております。

### Q. サードパーティ製のGUIに優れたETL製品ではなく、Glue を採用した理由

S3 を中心としたデータレイク構築が要件としてあり、 AWS 製品を中心に比較検討を実施した経緯があったためです。他製品も高機能で優れた部分もあるかと思われますが、Glue はフルマネージドで分散処理ができる利便性があり優れたサービスであると考えています。

## まとめ

ご参加いただいた方々、ありがとうございました。
FutureではFuture Tech Nightの他にも様々なイベントを開催しております。今後も皆様のご参加をお待ちしております。
