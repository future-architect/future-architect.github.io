---
title: "AWS Certified Foundational 2資格 合格体験記 - 逆走する資格RTA"
date: 2026/08/25 00:00:00
postid: a
tags:
  - AWS
  - 合格記
categories:
  - Cloud
thumbnail: /images/2026/20260825a/thumbnail.png
author: 棚井龍之介
lede: "AWS認定のFoundationalレベル2資格に一発合格しました。上位レベルの学習でどこまで足りたかに加えて、8月に公開された認定の上位・下位関係のブログから、更新の仕組みと受験順によるバウチャーの効き方を整理します。"
---
<img src="/images/2026/20260825a/aws-foundational-2badges-diagonal.png" alt="" width="600" height="734">

## はじめに

FutureVulsチームの棚井です。

2026年8月5日と8月7日に、AWS認定のFoundationalレベル2資格を受験し、どちらも一発合格しました。

| 資格 | 受験日 | スコア |
| :-- | :-- | :-- |
| [AWS Certified Cloud Practitioner (CLF-C02)](https://aws.amazon.com/jp/certification/certified-cloud-practitioner/) | 2026/08/05 | 811点 |
| [AWS Certified AI Practitioner (AIF-C01)](https://aws.amazon.com/jp/certification/certified-ai-practitioner/) | 2026/08/07 | 793点 |

どちらも100〜1,000点のスケールスコアで、合格ラインは700点です。

7月30日から8月7日までの9日間で5試験を1日おきに受けており、上位から降りる逆走の資格RTAのようになってきたと思っています。試験自体も少し速さを意識して、90分の枠に対して30分ほどで解き終えました。Foundationalは1問の文章が短く、Professionalのような長いシナリオを読み解く問題がないので、時間が余る試験です。

これで保有するAWS認定は、Specialty 2つ、Professional 3つ、Associate 3つ、Foundational 2つの計10個です。ただし、これで打ち止めではありません。Associateはまだ2つ残っています。

## 試験の概要

2試験は出題形式以外の条件が共通です。

| 項目 | 内容 |
| :-- | :-- |
| 試験時間 | 90分 |
| 問題数 | 65問(採点対象50問+採点対象外15問) |
| 受験料 | 100 USD |
| 合格ライン | 100〜1,000点のスケールスコアで700点 |

想定する受験対象者も近く、CLF-C02は「AWSクラウドの設計、実装、オペレーションの経験が6か月以下」の人、AIF-C01は「AWSのAI/MLテクノロジーに最大6か月間携わった経験を持つ方」が対象です。

違うのは出題形式です。CLF-C02は択一選択問題と複数選択問題の2種類だけですが、AIF-C01にはこれに加えて並べ替え、内容一致、ケーススタディの3種類が含まれます。並べ替えと内容一致に部分点はなく、すべて正解して初めて得点になります。

### Cloud Practitioner (CLF-C02)

役職を問わず、AWSクラウドに関する総合的な理解を実証する試験です。出題分野は次の4つです([試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: クラウドのコンセプト | 24% |
| 第2分野: セキュリティとコンプライアンス | 30% |
| 第3分野: クラウドテクノロジーとサービス | 34% |
| 第4分野: 請求、料金、サポート | 12% |

### AI Practitioner (AIF-C01)

AI/MLと生成AIのテクノロジー、および関連するAWSのサービスとツールに関する知識を問う試験です。出題分野は次の5つです([試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf))。

| 分野 | 出題比率 |
| :-- | :-- |
| 第1分野: AIとMLの基礎 | 20% |
| 第2分野: 生成AIの基礎 | 24% |
| 第3分野: 基盤モデルの応用 | 28% |
| 第4分野: 責任あるAIに関するガイドライン | 14% |
| 第5分野: AIソリューションのセキュリティ、コンプライアンス、ガバナンス | 14% |

## 学習方法

対策の量は2試験で変えました。上位レベルの学習で範囲が重なっている分だけ省いた結果です。

### Cloud Practitioner: 試験ガイドの確認のみ

教材は使っていません。試験ガイドで出題範囲を確認し、そのまま受験しました。Specialty、Professional、Associateの学習と範囲が重なっていたためです。

### AI Practitioner: Skill BuilderのOfficial Pretestを1回

<img class="bordered" src="/images/2026/20260825a/skill_builder.png" alt="" width="320" height="199" loading="lazy">

[AWS Skill Builder](https://skillbuilder.aws/) の「Official Pretest: AWS Certified AI Practitioner (AIF-C01 - 日本語)」を1回解きました。目的は知識の抜け漏れの補強です。使った理由は単純で、Professional試験の対策で契約したサブスクリプションがまだ残っていたからです。

[DevOps Engineer - Professionalのとき](https://future-architect.github.io/articles/20260821a/) はOfficial Pretestを見送りましたが、今回は使いました。並べ替えや内容一致、ケーススタディを本番で初見にしないという意味でも、一度通しておく価値はあると思います。

## AWS認定の仕組み

Cloud Practitionerを受けた8月5日に、AWSから [AWS 認定の上位・下位関係を理解して効率的に認定を更新しましょう](https://aws.amazon.com/jp/blogs/news/aws-certification-hierarchy-recertification-guide/) が公開されました。ちょうど2試験の合間だったので、自分の状況と照らし合わせながら読めました。

### 上位・下位関係

<img src="/images/2026/20260825a/certification-hierarchy-map-1024x623.png" alt="" width="1024" height="623" loading="lazy">

*出典: [AWS 認定の上位・下位関係を理解して効率的に認定を更新しましょう](https://aws.amazon.com/jp/blogs/news/aws-certification-hierarchy-recertification-guide/)(Amazon Web Services ブログ)*

押さえておきたいのは次の3点です。

- Professional、Associate、Foundationalの3カテゴリには上位・下位関係があり、「上位カテゴリの認定を取得 (または更新) すると、その下位にあたる認定も自動的に更新されます」
- ただし自動更新は「その下位認定をすでに取得している場合に限ります」。失効した認定が後から復活することはありません
- Specialtyはこの関係の外です。「Professional を更新しても Specialty は更新されませんし、その逆も同様です」

AWS認定の有効期限は [3年](https://aws.amazon.com/jp/certification/recertification/) です。上から取ってきた自分の場合、Professionalに合格した時点で下位の認定を1つも持っていなかったので、この自動更新の恩恵はありませんでした。

ただ、次の更新では効いてきます。図の左端の系統なら、Solutions Architect - Professionalを更新すると、その下のSolutions Architect - AssociateとCloud Practitionerも一緒に更新されます。上から取ると期限を延ばす対象がないので、受験順にそのまま期限が並びます。自分の場合、階層の中ではProfessionalが最初に切れるので、そこから更新していけば下位もまとめて延びます。

なお、Specialtyは階層の外なので、個別の更新が必要です。

### 試験を受けない更新方法

更新の手段は試験だけではありません。AssociateとProfessionalには、Skill Builderのトレーニングで更新するオプションがあります。2026年6月30日公開の [【ベータ開始】AWS 認定を最新の状態に保つ新しい方法](https://aws.amazon.com/jp/blogs/news/a-new-way-to-keep-your-aws-certification-current/) で、オープンベータとして案内されています。Cloud Practitionerはベータの対象外ですが、[AWS Cloud Quest: Recertify Cloud Practitioner](https://explore.skillbuilder.aws/learn/courses/18074/aws-cloud-quest-recertify-cloud-practitioner-ri-ben-yu) を完了すれば試験なしで更新できます。レベルごとの選択肢は [再認定](https://aws.amazon.com/jp/certification/recertification/) のページにまとまっています。

### 50%オフバウチャーの使いどころ

先に挙げたAWSのブログ記事には、受験料の話も出てきます。認定に合格すると、次回以降の試験で使える50%オフのバウチャーコードが特典として付与されます。

自分はここまで10試験すべて一発合格しているので、定価で払ったのは最初の1試験だけです。2試験目以降は、前の試験の合格でもらったバウチャーを使い続けています。

この仕組みを踏まえると、一番効率が良いのは、最初にCloud Practitionerを受けて50%オフを獲得し、その先もすべて一発合格していく順番です。Cloud Practitionerの受験料は100 USDで、AI Practitionerと並んでAWS認定の最安です。定価で払う1回をここに当てておけば、あとに続くAssociateの150 USD、ProfessionalとSpecialtyの300 USDは、すべて半額で受けられます。

自分は逆に、300 USDのSecurity - Specialtyから始めました。定価の1回が一番高い試験に当たりましたが、Security - Specialtyは所属部署の資格補助の対象だったので、ここは助かりました。ただし、バウチャーの効率だけを見れば、最適ではない順番です。

## おわりに

[前回の記事](/articles/20260824a/) では、上位資格に合格していてもAssociateを勉強なしで受けるのは避けたほうがよいと書きました。今回のFoundationalは、Cloud Practitionerが試験ガイドの確認だけ、AI Practitionerが抜け漏れの補強にPretest 1回で足りました。

差は試験ガイドに出ています。CLF-C02の試験ガイドは、範囲外の職務としてコーディング、クラウドアーキテクチャの設計、トラブルシューティング、実装、負荷テストとパフォーマンステストを挙げています。個別サービスの仕様の細部を突いてくるAssociateと違い、Foundationalはサービスが何のためにあるかを広く浅く問う試験でした。上位レベルの学習範囲で足りたのは、これが理由だと思います。
