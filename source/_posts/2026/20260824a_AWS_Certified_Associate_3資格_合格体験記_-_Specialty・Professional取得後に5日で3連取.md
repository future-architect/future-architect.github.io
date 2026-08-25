---
title: "AWS Certified Associate 3資格 合格体験記 - Specialty・Professional取得後に5日で3連取"
date: 2026/08/24 00:00:00
postid: a
tags:
  - AWS
  - 合格記
categories:
  - Cloud
thumbnail: /images/2026/20260824a/thumbnail.png
author: 棚井龍之介
lede: "Specialty・Professionalの取得後に、AWS認定のAssociateレベル3資格を5日間で連続受験し、すべて一発合格しました。上位資格の学習でカバーできた範囲とできなかった範囲を、試験ごとの学習量とあわせて整理します。"
---
<img src="/images/2026/20260824a/aws-associate-3badges.png" alt="" width="600" height="561">

## はじめに

Cyber Security Innovation Group、FutureVulsチームの棚井です。

2026年7月30日から8月3日までの5日間で、AWS認定のAssociateレベル3資格を連続受験し、すべて一発合格しました。

| 資格 | 受験日 | スコア |
| :-- | :-- | :-- |
| [AWS Certified Solutions Architect - Associate (SAA-C03)](https://aws.amazon.com/jp/certification/certified-solutions-architect-associate/) | 2026/07/30 | 807点 |
| [AWS Certified CloudOps Engineer - Associate (SOA-C03)](https://aws.amazon.com/jp/certification/certified-cloudops-engineer-associate/) | 2026/08/01 | 817点 |
| [AWS Certified Developer - Associate (DVA-C02)](https://aws.amazon.com/jp/certification/certified-developer-associate/) | 2026/08/03 | 853点 |

いずれも100〜1,000点のスケールスコアで、合格ラインは720点です。

私は [Security - Specialty](https://future-architect.github.io/articles/20260604a/) を皮切りに、[Advanced Networking - Specialty](https://future-architect.github.io/articles/20260708a/)、[Generative AI Developer - Professional](https://future-architect.github.io/articles/20260721a/)、[Solutions Architect - Professional](https://future-architect.github.io/articles/20260813a/)、[DevOps Engineer - Professional](https://future-architect.github.io/articles/20260821a/) と、AWS認定を上位レベルから先に取得してきました。今回はその逆走で、5つあるAssociateのうち3つに合格しました。

準備はUdemyの演習問題を計3回分(SAA 1回分、CloudOps 2回分)解いたのみで、Developerは試験ガイドの確認だけで受験しました。

上位資格の取得後にAssociateを受けるとどうなるのか、1つのサンプルとして読んでもらえればと思います。

## 試験の概要

3試験とも出題形式と条件が共通です。

| 項目 | 内容 |
| :-- | :-- |
| 試験時間 | 130分 |
| 問題数 | 65問(採点対象50問+採点対象外15問) |
| 受験料 | 150 USD |
| 合格ライン | 100〜1,000点のスケールスコアで720点 |

各試験の位置づけと出題分野は以下のとおりです。

### Solutions Architect - Associate (SAA-C03)

AWS上でのアーキテクチャ設計を問う試験です。出題分野は次の4つです([試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: セキュアなアーキテクチャの設計 | 30% |
| 第2分野: 弾力性に優れたアーキテクチャの設計 | 26% |
| 第3分野: 高パフォーマンスなアーキテクチャの設計 | 24% |
| 第4分野: コストを最適化したアーキテクチャの設計 | 20% |

### CloudOps Engineer - Associate (SOA-C03)

クラウド運用を担う人向けの試験です。旧SysOps Administrator - Associateの後継にあたり、2025年9月のSOA-C03への更新にあわせて名称がCloudOps Engineerに変わりました。出題分野は次の5つです([試験ガイド](https://docs.aws.amazon.com/ja_jp/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: モニタリング、ログ記録、分析、修復、パフォーマンスの最適化 | 22% |
| 第2分野: 信頼性と事業の継続性 | 22% |
| 第3分野: デプロイ、プロビジョニング、オートメーション | 22% |
| 第4分野: セキュリティとコンプライアンス | 16% |
| 第5分野: ネットワークとコンテンツ配信 | 18% |

### Developer - Associate (DVA-C02)

AWS上でアプリケーションを開発する人向けの試験です。出題分野は次の4つです([試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-dev-associate/AWS-Certified-Developer-Associate_Exam-Guide.pdf))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: AWSのサービスによる開発 | 32% |
| 第2分野: セキュリティ | 26% |
| 第3分野: デプロイ | 24% |
| 第4分野: トラブルシューティングと最適化 | 18% |

## 学習方法

SpecialtyとProfessionalの学習で土台はできている前提で、今回は知識の穴を見つけて潰す作業だけに絞りました。教材は、これまでの試験でも使ってきた [syo @Cloud講師](https://www.udemy.com/user/kanekoriyou-2/) のUdemy演習問題集のみです。

### Solutions Architect - Associate: 演習問題1回分

<img class="bordered" src="/images/2026/20260824a/udemy_2.png" alt="" width="227" height="320" loading="lazy">

[【2026年最新】AWS SAA-C03完全攻略問題集｜詳細図解付きデータ分析範囲対応版](https://www.udemy.com/course/aws-saa-practice/) の演習問題を1回分(65問)解き、正誤にかかわらず解説を読んで、初見のサービス仕様を拾いました。出題範囲がSolutions Architect - Professionalと大きく重なるので、1回分で切り上げました。

### CloudOps Engineer - Associate: 演習問題2回分

<img class="bordered" src="/images/2026/20260824a/udemy_1.png" alt="" width="223" height="320" loading="lazy">

[【全出題範囲網羅+詳細解説】AWS SOA-C03日本語問題300問＋(Cloud Operations Engine)](https://www.udemy.com/course/aws-soa-practice/) を使いました。予定では1回分でしたが、解いてみると見覚えのない仕様がぽろぽろ出てきたので、もう1回分(計130問)を追加しました。

### Developer - Associate: 試験ガイドの確認のみ

<img src="/images/2026/20260824a/guide.png" alt="" width="320" height="211" loading="lazy">

教材は使っていません。API Gateway、Lambda、DynamoDBを多用していた時期があるので、試験ガイドの出題範囲だけ確認して、そのまま受けました。

## 試験を終えて

5日間で3試験を受けてみて、感じたことが2つあります。

### 上位資格の学習でカバーできない範囲

SpecialtyとProfessionalのすべてに合格済みなので、正直なところ「Associateはそのまま受かるだろう」と考えていました。しかし演習問題を解いてみると、個別サービスの細かい仕様を問う問題で手が止まるものが意外とありました。CloudOpsの演習問題を1回分から2回分に増やしたのは、これが理由です。

試験ガイドを見比べるとわかりますが、Professionalは複数サービスを組み合わせたシナリオでの設計判断が中心で、Associateは個々のサービスの機能や制約を正面から扱うタスクが並びます。上位資格の勉強で身につくのはサービスの組み合わせ方までで、個別サービスの仕様の細部は別途埋める必要がありました。

### 実務経験がある領域は教材なしでも戦える

一方のDeveloperは教材なしで受験しましたが、これまで受けてきたAWS認定8試験を通じた自己最高スコア(853点)でした。API Gateway + Lambda + DynamoDBの構成を日常的に触っていた時期があり、受験前に試験ガイドを読んだ時点で、この範囲なら実務経験でいけると踏んでいました。[Security - Specialtyの合格体験記](https://future-architect.github.io/articles/20260604a/) でも「実務経験のあるサービスは圧倒的に有利」と書きましたが、今回もまったく同じでした。

必要な勉強量は、試験ガイドの範囲を実務経験や上位資格の学習でどれだけカバーできているかで決まります。受験を決めたらまず試験ガイドを読み、カバーできていない部分を演習問題で潰す進め方が、上位資格取得後のAssociate受験にはちょうどいいと思います。

## おわりに

これで保有するAWS認定は、Specialty 2つ、Professional 3つ、Associate 3つの計8つになりました。3試験とも、スコアレポートの分野別評価は全分野で「コンピテンシーを満たしている」でした。

Associate 3連戦を振り返ると、上位資格に合格していても、勉強なしで受けるのは避けたほうがよいと分かりました。ただ、実務経験が試験ガイドの範囲と重なっている試験なら、教材なしでも戦えます。
