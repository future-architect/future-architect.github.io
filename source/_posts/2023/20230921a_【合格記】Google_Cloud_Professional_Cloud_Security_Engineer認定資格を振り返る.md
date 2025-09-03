---
title: "【合格記】Google Cloud Professional Cloud Security Engineer認定資格を振り返る"
date: 2023/09/21 00:00:00
postid: a
tag:
  - GoogleCloud
  - PCSE
  - 合格記
  - Udemy
category:
  - Security
thumbnail: /images/2023/20230921a/thumbnail.png
author: 岸下優介
lede: "これまで組織全体のGoogle Cloudプロジェクトを包括的に見る業務に携わっており、主にIAMやネットワークを含むGoogle Cloud環境上の治安維持のような仕事を担ってきました。今回はその経験値を測るべくProfessional Cloud Security Engineer認定資格を受けてきました。"
---
<img src="/images/2023/20230921a/image.png" alt="" width="611" height="593" loading="lazy">

## はじめに

TIG 岸下です。

これまでのプロジェクトでは組織全体のGoogle Cloudプロジェクトを包括的に見る業務に携わっており、主にIAMやネットワークを含むGoogle Cloud環境上の治安維持のような仕事を担ってきました。今回はその経験値を測るべくProfessional Cloud Security Engineer認定資格を受けてきました。

無事に合格を果たすことができたので、本記事では学習内容などの過程を書いていこうと思います。

また本試験はGoogle Cloudパートナー企業向けのバウチャーを活用して受験しました。大変感謝しております！

Google Cloud 認定資格関連の過去記事：

- [【合格記】Google Cloud Professional Data Engineer認定資格を振り返る](/articles/20211013a/)
- [【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る](/articles/20220930a/)
- [Google Cloud Professional Cloud Architectの再認定に合格しました](/articles/20220411a/)
- [GCP Professional Cloud Network Engineer に合格しました](/articles/20200902/)
- [GCP Associate Cloud Engineer 合格記](/articles/20210625a/)

## 試験と出題範囲

[公式](https://cloud.google.com/learn/certification/cloud-security-engineer?hl=ja)の出題範囲と、実際に自分が受けた際の所感は以下になります。

### クラウド ソリューション環境内のアクセスの構成

- IAMによるサービスへのアクセス制御
  - 組織IAM・フォルダIAM・プロジェクトIAM・リソースIAMのすみわけ
  - 継承の理解
    - どの階層のIAMが適用されるのか？
- 組織ポリシーの理解
  - Service Account作成の制限やCloud Storage Bucketの公開制限など、プロジェクト全体のリソースを制御
- プロジェクトやフォルダの分け方のベストプラクティス
  - 例：部署ごとにフォルダ分けをして、その中にプロジェクトを作成するなど
    - [エンタープライズ企業のベスト プラクティス](https://cloud.google.com/docs/enterprise/best-practices-for-enterprise-organizations?hl=ja)
- Cloud Identityによるユーザー管理
  - グループを利用したユーザーの管理
  - Google Cloud Directory Syncを利用したADサーバーとGoogle Cloudの統合

### ネットワーク セキュリティの構成

- 以下のGoogle Cloudネットワークの[暗黙のFirewallルール](https://cloud.google.com/firewall/docs/firewalls?hl=ja#default_firewall_rules)は絶対に覚えておきましょう
  - **INGRESSは全て拒否**
  - **EGRESSは全て許可**
- Firewall全般
  - [Priority値の高低と優先度の関係](https://cloud.google.com/firewall/docs/firewalls?hl=ja#priority_order_for_firewall_rules)
  - ネットワークタグ・サービスアカウントを活用したFirewallルール
- VPC Peering/Cloud VPN/Cloud Interconnectの使い分け
  - Cloud InterconnectはさらにPartner/Dedicatedで用途が分かれる

### データ保護の確保

- [VPC Service Control](https://cloud.google.com/vpc-service-controls/docs/overview?hl=ja)によるデータ保護
  - プロジェクトに対して各種サービスのAPI実行を制限し、データの持ち出し・持ち込みを防ぐ
  - 拙著も参考にしてみて下さい：[VPC Service ControlでGoogle Cloud環境をガッチリ守る](https://future-architect.github.io/articles/20230119a/)
- Cloud DLP(Data Loss Prevention)の活用
  - 個人情報に対する適切な暗号化
  - 暗号化は復元する必要があるのか否かによって手法が変わる
    - 決定的暗号化 or 完全なマスキング

### クラウド ソリューション環境内のオペレーションの管理

- Cloud KMSを利用した暗号鍵の保管
  - [Envelop encryption](https://cloud.google.com/kms/docs/envelope-encryption?hl=ja)は勿論、それに関わる以下の用語は説明できるようにしておきましょう
    - CMEK
    - CSEK
    - DEK
    - KEK
  - どうやって暗号鍵を保管しておきたいのか？
- Secret Managerの活用
  - API keyなどはSecret Managerに保存しておきましょう

### コンプライアンスの確保

- 各種ログで何の情報が得られるのか？
  - Audit log
  - Data Access log
- Googleの`_Default`/`_Required`のログバケットとは？
  - [ログバケットの構成](https://cloud.google.com/logging/docs/buckets?hl=ja)
  - 保存期間や料金体系も異なる
- 監査ログの保管方法
  - 長期間保管したい場合はLog SinkとCloud Storageを活用してコストカット

## 受験までの過程

試験範囲の内容はある程度実務として経験済みだったので、勉強期間は約2週間ほどで済みました。
実務の経験として主に役立った内容は、

- IAMの基礎知識（継承など）
- IAMを最小権限に留める、IAMをグループで管理するなどのIAMのベストプラクティス
- 組織ポリシーいろいろ
- 組織・フォルダ・プロジェクトの分け方
- Google Cloudのネットワーク関連
  - Shared VPC
  - Cloud VPN
  - VPC Peering
  - Dedicated/Partner Interconnect
- Secret Mangerによる機密情報管理やCloud KMSによる暗号鍵管理
- Cloud Identityの利用

などが挙げられます。

### 利用した教材

最初に[模擬試験](https://docs.google.com/forms/d/e/1FAIpQLSf4ADmZr8WnDZjIK6dWvRTel2VmsP0fJtONy6UOFjWZHe-MpQ/viewform?hl=ja)をやってみたところある程度いけそうな感があったので、今回はUdemyの問題集のみ利用しました。

- [Google Professional Cloud Security Engineer | 模擬試験2023年版](https://www.udemy.com/course/google-professional-cloud-security-engineer-jp/learn/quiz/5813440/results?expanded=1040233892#reviews)

## まとめ

今回受験してみて、中身の仕組みをあまり理解していない状態で実務で使っていたんだなーと実感しました。特にCloud KMSはよく使っていましたが、[Envelop encryption](https://cloud.google.com/kms/docs/envelope-encryption?hl=ja)という言葉自体を知らずに使っていました。

本受験を通して、Google CloudのCloud Securityに関する網羅的な知見を得ることができたので、業務の振り返りとしてちょうどよかったです。

Google CloudのCloud Securityに取っ掛かりを得たい方、振り返りをしたい方はぜひ受けてみてください！

アイキャッチ画像は[Google Cloud Certification](https://cloud.google.com/learn/certification?hl=ja)から付与されたものになります。
