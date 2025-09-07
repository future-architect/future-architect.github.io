---
title: "Future Tech Night #19 CodePipelineを用いたECS on EC2でのBlue/Greenデプロイメント"
date: 2022/03/14 00:00:00
postid: a
tag:
  - 登壇レポート
  - TechNight
  - AWS
  - ECS
  - リリース
category:
  - DevOps
thumbnail: /images/2022/20220314a/thumbnail.png
author: 渡邉光
lede: "2022年1月28日にFuture Tech Night #19 AWS CodePipelineと新聞向けCMS構築事例を開催しました。こちらの勉強会で「CodePipelineを用いたECS on EC2でのBlue/Greenデプロイメント」というテーマで発表させていただきました。"
---
<img src="/images/2022/20220314a/top.png" alt="" width="800" height="449">

# はじめに

2019年新卒入社筋肉エンジニアの渡邉光です。

2022年1月28日に[Future Tech Night #19 AWS CodePipelineと新聞向けCMS構築事例](https://future.connpass.com/event/236138/)を開催しました。こちらの勉強会で「**CodePipelineを用いたECS on EC2でのBlue/Greenデプロイメント**」というテーマで発表させていただきました。

# 発表の概要

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/d674a2342857499185e80b1ceb1f46da" title="CodePipelineを用いたECS on EC2でのBlue/Greenデプロイメント" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 560px; height: 314px;" data-ratio="1.78343949044586"></iframe>

発表の経緯として所属プロジェクトでECS on EC2を採用していたこと、パイプライン構築時にはまったことや知見を共有できるのではないかと考えて本テーマについて発表しました。

内容としては、そもそもBlue/Greenデプロイメントってどんなデプロイ方法なのか、ECSでのデプロイ方法の種類、Blue/Greenデプロイメント中のALBやECSタスクがどのような挙動をするのかを図解して解説させていただきました。また、構築した際にはまった点や、実際にパイプラインを実行した時にマネジメントコンソール上でどのように見えるかや、操作方法等を説明させていただきました。

以下が、パイプライン構築時にはまったことやTips等の抜粋です。

- ECS on EC2でAWSVPCモードを使用する場合は、タスクごとにENIがアタッチされるため、インスタンスタイプによっては許容されているENI数を超えてしまい、タスクが立ち上がらないことがあります。その対策としてAWSVPC Trunking制限緩和申請を行うことでインスタンスで許容されるENI数の上限を大幅に引き上げることができます。
- CodeBuild実行時にDocker HubからイメージをPullする構成になっていると「error pulling image configuration: toomanyrequests:Too Many Requests」とrate-limitエラーになってしまうので、ECR Publicを使用してイメージをpullするようにしました。
- CapacityProviderの設定を入れている場合、CodeDeployで使用する「appspec.yml」に「CapacityProviderStrategy」の設定を記載しないと、Blue/Greenデプロイが完了した際に構築時に設定したはずの「CapacityProviderStrategy」の設定が消えてしまい、タスクがAZに分散されず偏る事象が発生しました。
- Blue/Greenデプロイが、サービスのAutoScalingをサポートしていないため、CodeDeployのイベントフックを利用してデプロイ前後にサービスのAutoScalingの停止と再開を実行するLambdaを実行する必要があります。

# 感想

所属プロジェクト内での勉強会に登壇して発表することはありましたが、社外イベントでの勉強会に登壇することは初めてだったので、とても良い経験になりました。勉強会登壇に向けて再びECS、Codeシリーズのインプットをしたり、資料にアプトプットする段階で理解が深まったりしたので勉強会登壇して本当に良かったです。

後日先輩社員から少し話すのが早かったかなとフィードバックを頂いたので、次発表する機会があれば落ち着いてゆっくりプレゼンできるようにしておきます！（笑）

改めて当発表をご視聴いただいた方、そしてここまで当記事を読んでくださった方ありがとうございました。

次のイベントに関する情報は、フューチャーの[connpass](https://future.connpass.com/)で確認できます。ぜひご参加ください！
