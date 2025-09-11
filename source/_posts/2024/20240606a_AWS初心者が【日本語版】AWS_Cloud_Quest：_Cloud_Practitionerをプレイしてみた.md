---
title: 'AWS初心者が【日本語版】AWS Cloud Quest: Cloud Practitionerをプレイしてみた'
date: 2024/06/06 00:00:00
postid: a
tag:
  - AWS
  - 初心者向け
  - Network
category:
  - Infrastructure
thumbnail: /images/2024/20240606a/thumbnail.png
author: 平井隆太
lede: AWS Cloud Questの魅力や使い方、そして実際にプレイしてみた感想をAWS初学者の目線でお伝えします。

---
# はじめに

みなさん初めまして。2023年10月に新卒でフューチャー株式会社に入社したCSIG/Vulsチーム所属の平井と申します。

**AWS Cloud Questの魅力や使い方、そして実際にプレイしてみた感想をAWS初学者の目線でお伝えします。**

EC2・RDSなどAWS主要サービスの機能・役割に対する知識はあるけど、より実用的な知識を学びたい方、ゲーム感覚で楽しく学びたい方は必見です！
（上記の知識がないという方はまず[こちら](https://aws.amazon.com/jp/blogs/news/2024-aws-beginner-learning/)を参考に学習を進めることをオススメします！）

::: note info
本記事ではAWS Cloud Quest: **Cloud Practitioner** に絞って解説を行います。
:::

# AWS Cloud Questとは

一言でいうと **実用的なAWS Cloud スキルを身につけることができるロールプレイングゲーム」** です。
もともと英語版でのみ展開されていましたが、2023年10月より「クラウドプラクティショナーロール」が日本語でプレイできるようになりました（[参考](https://aws.amazon.com/jp/blogs/news/aws-cloud-quest-jp-is-now-available/ "ゲームベースで学習できる「AWS Cloud Quest: Cloud Practitioner」が日本語で学習可能になりました")）

**しかも無料！（ここ大事）**

その他のロールは以下のようになっております。
<img src="/images/2024/20240606a/cq_jp_2-1024x313.png" alt="" width="1024" height="313" loading="lazy">

# 学習できるサービス内容

AWS Cloud Questでは以下の基礎的なサービスや概念について学ぶことができます。

* Amazon S3
* Amazon EC2
* AWS Pricing Calculator
* Amazon VPC
* Amazon DynamoDB
* Amazon RDS
* AWS IAM
* Amazon Elastic File System
* Amazon EC2 Auto Scaling
* ELB

またゲームの後半では、複数のサービスを組み合わせてソリューションの構築を行います。

それではさっそくAWS Cloud Questをプレイする準備に入っていきましょう。

# 事前準備

事前に準備することは**AWS Skill Builderへの登録**と**日本語の設定** です。

## AWS Skill Builderへの登録

まずAWS Cloud Questで検索し、[AWS Cloud Questのページ](https://aws.amazon.com/jp/training/digital/aws-cloud-quest/)へ飛びます。
「クラウドプラクティショナーを無料で試す」を押下します。

<img src="/images/2024/20240606a/image_(3).png" alt="" width="1200" height="557" loading="lazy">

[AWS training and certificationのAWS Cloud Quest: Cloud Practitioner](https://explore.skillbuilder.aws/learn/course/external/view/elearning/11458/aws-cloud-quest-cloud-practitioner)のページへ飛ぶので、「ENROLL」を押します。

<img src="/images/2024/20240606a/image_(4).png" alt="" width="1200" height="562" loading="lazy">

「ENROLL」を押すとアカウントの作成が求められるので、作成します（すでにAWSアカウントがある人はサインインでOK）

<img src="/images/2024/20240606a/image_(5).png" alt="" width="1140" height="582" loading="lazy">

アカウントの作成はこれで終わりです。

以下の画面で「START LEARNING NOW」を押し、遷移先で「START NOW」を押すとプレイ画面に移ります。

<img src="/images/2024/20240606a/32e49e84-1d04-3796-4082-4b1cb3acd90c.png" alt="" width="1200" height="600" loading="lazy">

## 日本語の設定

次に言語の設定に進んでいきます。
スタート画面に移ったら、右上の歯車マークから設定に移動します。
<img src="/images/2024/20240606a/77dad39e-61f3-8a26-fb0d-75cf46acd714.png" alt="" width="1200" height="596" loading="lazy">

設定画面に移ったら、「Language」を選択。
<img src="/images/2024/20240606a/ca1909bb-6f73-a9e9-fe72-7cc49e8278dc.png" alt="" width="1200" height="611" loading="lazy">

そのまま「日本語」を選択します。
<img src="/images/2024/20240606a/4ce1c615-1403-affc-1b94-a7bfcff1c364.png" alt="" width="1200" height="611" loading="lazy">

「日本語」を選択すると、確認をされますので「I Understand」を選択します。
<img src="/images/2024/20240606a/49f6de95-4fc4-f09d-53f5-fb4a644b1ae4.png" alt="" width="1200" height="612" loading="lazy">

するとゲームが再起動され、スタート画面に戻ります。

この段階で「ゲーム開始」が日本語になっていれば成功です。
（英語表記のまま変わらない場合は、一度設定画面に移動し、スタート画面に戻るを行うと反映されることがあります）。

<img src="/images/2024/20240606a/image_(10).png" alt="image_(10).png" width="1200" height="612" loading="lazy">

ここまできたら準備完了です！

それでは実際にプレイの流れについて説明していきます！

# プレイの流れ

AWS Cloud Questでは、街の中で困っている人達の課題をAWSのクラウドサービスを用いて解決していく中で、AWSクラウドの概念やセキュリティ、ユースケースやビジネスへの影響などについて学習することが出来ます。

実際にEC2のクエストを例に取って見ていきましょう。

## 街の人に話しかける

街中で困っている人に話しかけます。

<img src="/images/2024/20240606a/image_(11).png" alt="" width="1200" height="559" loading="lazy">

困っている人の課題を聞き出します。
今回の依頼ではどうやら**物理サーバーのハードディスクに障害が発生した**ようです。
<img src="/images/2024/20240606a/image_(12).png" alt="" width="1200" height="613" loading="lazy">

新たなハードドライブで代替すれば解決かと思いきや
**ハードドライブが届くのに48時間もかかってしまい、システムがすぐに復旧できない**。
<img src="/images/2024/20240606a/image_(18).png" alt="" width="1200" height="616" loading="lazy">

そこでソリューションとしてEC2を提案します。
<img src="/images/2024/20240606a/image_(20).png" alt="" width="1200" height="607" loading="lazy">

**EC2を使えば数分で仮想サーバーを立てることが可能である**と伝えます。
<img src="/images/2024/20240606a/image_(21).png" alt="" width="1200" height="612" loading="lazy">
ここでクエストの受注が完了します。

一旦ここまでの事象・課題・ソリューションを整理します。

| 事象 | 物理サーバーのハードディスクに障害が発生した。 |
| ---- | ---- |
| **課題** |代替用のハードドライブが届くまでに時間がかかり、**すぐにシステムが復旧できない。** |
| **ソリューション** | **仮想環境ですぐに立ち上げることができるEC2を導入する。** |

概要を把握したら、実際にサービスを使用して解決する段階に移っていきます。

## サービスを用いて解決

ここでは **「学習」「計画」「実践」「DIY」** のフェーズに分かれてソリューションの構築を行っていきます。

### 学習

図と動画でソリューションに用いるサービスの学習ができます。
動画ではEC2とは、EC2に関わるその他サービス、その構成例などを学ぶことが出来ます。

::: note info
情報量は結構多いですが、実践フェーズで用いる知識としては最低限で問題ないので完璧に理解しようとしなくても大丈夫です！
:::

<img src="/images/2024/20240606a/image.png" alt="" width="1200" height="596" loading="lazy">

### 計画

ソリューションの全体像を元に、実践フェーズとDIYフェーズの目標について事前に学びます。
<img src="/images/2024/20240606a/image_2.png" alt="" width="1200" height="586" loading="lazy">

### 実践

左下のステップを元に、実践を進めていきます。

「ラボを開始」を押すと環境がプロビジョニングされます。
その後「AWSコンソールを開く」を押すと、学習用のAWSアカウントからAWSコンソールに入ることができ、実際にサービスを構築できます。
<img src="/images/2024/20240606a/image_3.png" alt="" width="1116" height="565" loading="lazy">
その後はステップの指示に従い、サービスを構築していきます。
（ここでは詳細な構築の流れはスキップします。気になった方はぜひプレイしてみてください）。

### DIY

実践で得た知識をもとに、与えられた課題をクリアします。
EC2の場合は、「実践フェーズで起動したEC2インスタンスとは異なるアベイラビリティゾーンに、EC2インスタンスを起動しなさい」というものです。
<img src="/images/2024/20240606a/image_(15).png" alt="" width="1200" height="582" loading="lazy">

実践での操作の意味が分かっていれば難なくクリアできます。
ここまでがクエストをプレイする大まかな流れになります！

# プレイしてみて感じたこと

これまでの説明からも分かる通り、AWS初学者にとってはとても学びになるサービスです。
初学者目線で良いと思った点、気になった点をそれぞれ挙げさせていただきます。

## 良い点

* **AWS を実際にコンソール操作しながら無料で学べる**
  * AWS Cloud Questではラボ用のアカウントを用いることで、無料でサービスの構築が体験できます。
    これにより実務に近い環境で学習ができるため、知識はあるけど使ったことが無い...という人にはとてもオススメです。
* **実践フェーズの説明や注意書きが親切**
  * 初めてAWSコンソールを触る人でも誤った操作をしないように、ワンスクロール、ワンクリック丁寧に解説してくれています。
    これによりガイドに従っていればほとんどミスなくクリアできるでしょう。

::: note info
こんな感じで作業の順番が明記されています
<img src="/images/2024/20240606a/image_(17).png" alt="image_(17).png" width="1200" height="593" loading="lazy">
:::

* **DIYフェーズの課題がいい感じの難易度**
  * DIYフェーズでの課題は、実践フェーズの内容を理解していれば容易にクリアできる難易度だったので、「難しすぎて挫折してしまう...」なんてことが無かったのはとてもよかったです。

## 気になった点

* **ガイドの画像が日本語対応されていない**
  * AWSコンソールの作業画面は日本語対応されていますが、ガイドは英語のままになっています。
    そのため、操作する際に適宜読み替える必要があるという点は少し気になりました。
* **サービスの説明がわかりにくい**
  * 英語から日本語に対応したということもあり、サービスの説明が若干遠回しで分かりにくいと感じる部分が多かったです。
    そのため主要サービスの基礎知識がなんとなくわかってきたぞ、という方が実際の構築を学ぶツールとして用いるのが良いと思いました。

# まとめ

AWS初学者にとって、実際の構築の流れを体験できるというのはとても良い学びにつながると思いました。

今回はAWS Cloud Quest: Cloud Practitionerの説明でしたが、なんと2024年3月に **「AWS Cloud Quest: Solutions Architect」** も日本語対応されています（こちらは有料）。
（[参考](https://aws.amazon.com/jp/blogs/news/aws-cloud-quest-solutions-architect-jp-is-now-available/)）

気になった方はぜひプレイしていただき、共にAWSライフを歩んでいきましょう！
最後まで読んでいただきありがとうございました。
