---
title: "AWS Certified Associate 2資格 合格体験記 - DEAはRedshift、MLAはSageMaker"
date: 2026/09/08 00:00:00
postid: a
tags:
  - AWS
  - 合格記
categories:
  - Cloud
thumbnail: /images/2026/20260908a/thumbnail.png
author: 棚井龍之介
lede: "AWS認定のAssociateレベルで残っていたData EngineerとMachine Learning Engineerを受験し、どちらも一発合格しました。試験ガイドが示す主役はDEAがRedshift、MLAがSageMakerで、実務経験のない領域を演習問題2回分でどう補ったかをまとめます。"
---
<img src="/images/2026/20260908a/aws-dea-mla-2badges-diagonal.png" alt="" width="600" height="734">

## はじめに

Cyber Security Innovation Group、FutureVulsチームの棚井です。

2026年8月24日と8月31日に、データサイエンティストや機械学習エンジニアに向けたAssociateレベルの2資格を受験し、どちらも一発合格しました。

| 資格 | 受験日 | スコア |
| :-- | :-- | :-- |
| [AWS Certified Data Engineer - Associate (DEA-C01)](https://aws.amazon.com/jp/certification/certified-data-engineer-associate/) | 2026/08/24 | 773点 |
| [AWS Certified Machine Learning Engineer - Associate (MLA-C01)](https://aws.amazon.com/jp/certification/certified-machine-learning-engineer-associate/) | 2026/08/31 | 784点 |

どちらも100〜1,000点のスケールスコアで、合格ラインは720点です。

[前回のAssociate 3連戦](https://future-architect.github.io/articles/20260824a/) で書いたとおりAssociateは5つあり、残っていたこの2つに合格したことで、AWS全冠になりました。受験順序や費用を含めた全冠の話は別の記事にまとめるので、この記事は2試験の体験記に絞ります。

準備は、Udemyの演習問題を各試験2回分(2試験で計260問)解いたのみです。ただ、率直に言うとこの2つは苦手意識のある領域でした。データエンジニアリングも機械学習も普段の業務ではほとんど利用経験がなく、スコアが12試験のなかでは低めなのもその表れです。実務経験のない領域を演習問題でどう補ったか、1つのサンプルとして読んでもらえればと思います。

## 試験の概要

2試験とも受験条件は共通です。

| 項目 | 内容 |
| :-- | :-- |
| 試験時間 | 130分 |
| 問題数 | 65問(採点対象50問+採点対象外15問) |
| 受験料 | 150 USD |
| 合格ライン | 100〜1,000点のスケールスコアで720点 |

違うのは出題形式で、DEAが択一選択問題と複数選択問題の2種類のみなのに対し、MLAではこれに並べ替えと内容一致が加わります。どちらも [AI Practitioner](https://future-architect.github.io/articles/20260825a/) で経験済みの形式です。

### Data Engineer - Associate (DEA-C01)

データパイプラインの実装と運用を問う試験です。出題分野は次の4つです([試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-data-engineer-associate/AWS-Certified-Data-Engineer-Associate_Exam-Guide.pdf))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: データの取り込みと変換 | 34% |
| 第2分野: データストア管理 | 26% |
| 第3分野: データ運用とサポート | 22% |
| 第4分野: データセキュリティとガバナンス | 18% |

試験ガイドは、範囲外のジョブタスクとして「人工知能と機械学習 (AI/ML) のタスクを実行する」を明記しています。AI/MLは次のMLAの領分で、DEAはデータをためて、変換して、届けるまでが守備範囲です。

### Machine Learning Engineer - Associate (MLA-C01)

MLモデルの開発、デプロイ、運用を問う試験です。出題分野は次の4つです([試験ガイド](https://docs.aws.amazon.com/ja_jp/aws-certification/latest/machine-learning-engineer-associate-01/machine-learning-engineer-associate-01.html))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: 機械学習 (ML) のためのデータ準備 | 28% |
| 第2分野: ML モデルの開発 | 26% |
| 第3分野: ML ワークフローのデプロイとオーケストレーション | 22% |
| 第4分野: ML ソリューションのモニタリング、保守、セキュリティ | 24% |

なお、MLA-C01は更新が発表されており、次バージョンMLA-C02のベータ試験の登録が2026年9月1日に始まります。英語版MLA-C01の最終受験日は2026年9月28日で、日本語版はベータ期間中も引き続き受験できます([公式発表](https://aws.amazon.com/jp/blogs/news/updates-to-aws-certified-machine-learning-engineer-associate-mla-c02/))。これから受ける人は、移行スケジュールを確認してから予約するのをおすすめします。

## 学習方法

教材は今回も [syo @Cloud講師](https://www.udemy.com/user/kanekoriyou-2/) のUdemy演習問題集だけです。どちらもUdemyのサブスクリプションプランには含まれていない講座なので、2講座分を追加購入しました。解いた問題は正誤にかかわらず解説を読み、知識の穴を埋めていく使い方は、これまでの試験と同じです。

### Data Engineer - Associate: 演習問題2回分

<img src="/images/2026/20260908a/DEA.png" alt="" width="640" height="203" loading="lazy">

[AWS認定データエンジニア - アソシエイト（DEA-C01）模擬試験問題集 2026年版](https://www.udemy.com/course/aws-dea-practice/) を使いました。演習問題は4回分収録されていますが、2回分で切り上げました。

### Machine Learning Engineer - Associate: 演習問題2回分

<img src="/images/2026/20260908a/MLA.png" alt="" width="640" height="202" loading="lazy">

生成AI系資格の学習では埋まらない範囲を補強する目的で、[【図解付き詳細解説】AWS MLA-C01完全攻略問題集 | 構成図＆グラフ解説付き](https://www.udemy.com/course/aws-mla-practice/) を使いました。

## 試験を終えて

### DEAはRedshift、MLAはSageMaker

受験を終えた率直な感想がこの見出しで、試験ガイドを読み直すと、そのとおりのことが書いてあります。

DEA-C01のタスクステートメントには、フェデレーションクエリ、マテリアライズドビュー、Redshift Spectrum、ストアドプロシージャ、データ共有と、Redshiftの機能が分野をまたいで繰り返し登場します。分析カテゴリにはAthenaやEMR、Glueなどのサービスがずらりと並びますが、機能単位でここまで踏み込まれるのはRedshiftです。

MLA-C01は輪をかけて明快です。受験対象者からして「Amazon SageMaker をはじめとする AWS のサービスを利用した ML エンジニアリングの経験が 1 年以上ある方」で、タスクステートメントにはData WranglerからRole ManagerまでSageMakerの機能名が20種類近く出てきます。SageMakerをどれだけ細かく知っているかの試験です。

受験を決めたら試験ガイドでこの主役を確認し、そこを演習問題で固める。この2試験の対策は、それで足りると思います。

### 生成AI系資格の学習は、MLAにどこまで効いたか

7月に [Generative AI Developer - Professional (AIP-C01)](https://future-architect.github.io/articles/20260721a/)、8月に [AI Practitioner (AIF-C01)](https://future-architect.github.io/articles/20260825a/) と生成AI系の認定を取ってきたので、MLAはその貯金でいけるだろうと見込んでいました。結果は半分だけ正解でした。

効いたのはSageMakerの周辺知識です。AIP-C01の範囲内サービスにはSageMaker系の項目が10個含まれていて(SageMaker AIのほか、Clarify、Data Wrangler、Ground Truth、JumpStart、Model Monitor、Model Registry、Neoなど)、MLAの試験ガイドに登場する機能の一部は、AIP対策で一度通っていました。IaCやCI/CD、モニタリングといったMLOps寄りの考え方も共通です。

一方、SageMakerの組み込みアルゴリズムやスクリプトモード、自動モデルチューニング(AMT)、Feature Store、それに混同行列、F1スコア、RMSE、ROC-AUCといったモデル評価のメトリクスについては、生成AI系2資格の試験ガイドではAI Practitionerが一部の名前に触れる程度で、MLAのような踏み込みはありません。演習問題2回分は、実質この穴埋めに使いました。

ちなみにAIP-C01の認定ページは、AIPの受験前に取得しておくとメリットがある認定としてMLAを挙げています。上位レベルから受けてきた自分は、今回も順番が逆です。

## おわりに

これで保有するAWS認定は、Specialty 2つ、Professional 3つ、Associate 5つ、Foundational 2つの計12個になりました。2試験とも、スコアレポートの分野別評価は全分野で「コンピテンシーを満たしている」でした。

5月18日に [Security - Specialty](https://future-architect.github.io/articles/20260604a/) を受けたあと、全冠に向けて本格着手したのは7月1日からで、そこから2ヶ月で残りの11資格を受け切りました。どの順で受けて、いくらかかったのか、そしてこのAI時代になぜ資格試験に取り組んだのかは、次の記事にまとめます。
