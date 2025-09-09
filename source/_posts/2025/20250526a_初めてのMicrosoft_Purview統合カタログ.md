---
title: "初めてのMicrosoft Purview統合カタログ"
date: 2025/05/26 00:00:00
postid: a
tag:
  - Azure
  - データカタログ
  - データマネジメント
category:
  - DataEngineering
thumbnail: /images/2025/20250526a/thumbnail.png
author: 佐々木伸悟
lede: "データカタログを調査することになり、その一つとしてMicrosoft Purviewについて調査を行いました。その際に前もって知っていれば理解が早かったなと思ったことや触ってみて気になった箇所をまとめておきます。"
---

[春の入門祭り2025](/articles/20250413a/)の23本目の記事です。

# はじめに

はじめまして、佐々木です。

業務でデータカタログを調査することになり、その1つとしてMicrosoft Purviewについて調査しました。

その際に前もって知っていれば理解が早かったなと思ったことや触ってみて気になった箇所をまとめておきます。

# データカタログ とは

まず前提となるデータカタログについて説明します。

データカタログとは企業や組織のデータを一覧化し、可視化するツールです。テーブルのスキーマ情報といったテクニカルメタデータを自動収集したり、業務においてこのデータはどういった意味を表すかというビジネスメタデータを登録することで、検索性、可視性を高めて、組織のデータ利活用を促進させるためのものとなります。

現在においてはメタデータ管理やデータ探索の機能だけでなく、データライフサイクルを表すデータリネージのグラフ化機能、データの欠損値、整合性チェックを行うプロファイリングの機能、データ提供者・利用者間のコミュニケーションを行うワークフローの機能を持つことも多いです。

Collibra, Atlan, AlationといったSaaS、OpenMetadata, DataHubといったOSS製品もありますが、各クラウドベンダーもデータカタログに関連したサービスを出してます。

その中でAzureの提供するものがMicrosoft Purviewになります。

# Microsoft Purviewとは

Microsoft PurviewとはData Security, Data Governance, Risk & Complianceにおけるソリューションを統合したサービスです。

<img src="/images/2025/20250526a/image.png" alt="PurviewはData Security、Data Govenance、Rist & Complianceの機能を持つ" width="1001" height="582" loading="lazy">

引用: [Microsoft Purview の詳細](https://learn.microsoft.com/ja-jp/purview/purview)

あくまでも一例になりますが、それぞれ下記のような機能を持ちます。

- **Data Security**
  - 情報保護: データ分類、暗号化、アクセス制限
  - データ損失防止: データ持ち出しの防止
- **Data Governance**
  - データマップ: データソースのスキャン、可視化
  - データカタログ: データの検索、発見、理解
  - データ品質: データの完全性、整合性の評価、レポート
- **Risk & Compliance**
  - 監査: アクティビティログの記録、不正の検出
  - コミュニケーションコンプライアンス: Outlook、Teamsなどのコミュニケーション内容の監視

PurviewにおいてデータカタログはData Governanceの1つのソリューションとして位置付けられており、データマップを作り、それを利用してデータカタログを作ることができます。

Purviewを調べる際、最初に「[5分でわかるMicrosoft Purview](https://www.youtube.com/watch?v=IlzkHxkzo1M)」というYouTube動画を見て1回もデータカタログに関する話が出てこなくて困惑しました。しかしPurviewの全体像を理解することで腑に落ちました。

下の画像はPurviewポータルにおけるソリューション一覧ですが、データカタログは「データガバナンス」の1機能となっていることが理解できると思います。

<img src="/images/2025/20250526a/image_2.png" alt="image.png" width="1200" height="866" loading="lazy">

料金体系も最初見た時はわからなかったのですが、ここまで理解すると、データカタログに関するものは、「データのガバナンス」タブを見れば良いとわかります。

<img src="/images/2025/20250526a/image_3.png" alt="image.png" width="1200" height="904" loading="lazy">

引用: [価格 - Azure Purview | Microsoft Azure](https://azure.microsoft.com/ja-jp/pricing/details/purview/)

# Azure のデータカタログの歴史

Microsoft Purviewのデータカタログを調べると、Azure Purviewという名前が見受けられます（上記で記載した料金のリンクもタイトルタグがAzure Purviewになっています）。

インターネットを漁ってみると、Azureの提供するデータカタログ製品は下記のような変遷をたどっているようです。

- Azure Data Catalog
- Azure Purview
  - Azure Data Catalog Gen 2として作られるも新名称に
- Microsoft Purview
  - Microsoft 365 コンプライアンスと統合
  - 旧ポータル。公式ドキュメントにおける「クラシック」
- Microsoft Purview
  - 新ポータル

<img src="/images/2025/20250526a/image_4.png" alt="image.png" width="1200" height="822" loading="lazy">

Azure PurviewがGAされたのは2021年となっており、ここ数年でも提供サービスや課金体系も大きく変わっていて進化が早いサービスとなります。

よって古い記事は参考程度に見るのが良さそうです。

また検索から入ってくるとクラシックに関する記載だったということもよくあるので、注意が必要です。

# 触ってみて気になったこと

## 機能の改廃

Purviewは進化途中のサービスであり、機能の入れ替えも行われています。

例えば新ポータルにおける統合カタログでは下記の機能がクラシックとして扱われ、後方互換のために残されているように見えます。

- 用語集
- ビジネス資産
- 資産の種類
- マネージド属性

<img src="/images/2025/20250526a/image_5.png" alt="image.png" width="888" height="525" loading="lazy">

ここの「用語集」は、その左のメニューにある「エンタープライズ用語集」と異なるものです。クラシックの「用語集」はデータ資産（テーブル、ファイルなど）とそのカラムに設定するものである一方、「エンタープライズ用語集」はデータ製品（データセットなど）に付与するものとなります。

今後このクラシックの機能がどうなるかはわかりませんが、使用していた機能が非推奨となる、廃止されるといったことはこれからも起きることが予想されます。

## マネージド属性における制限

先の章で言及したマネージド属性も気になる点がありました。

マネージド属性とはデータ資産に付与できるいわゆるビジネスメタデータであり、key-valueの形式で情報を持つことができます。またバリューの持てる型（テキスト、日付）などを定義でき、必須項目かどうかを設定が可能です。

ただし下記のような制限事項があります。

- キー名に日本語を使用できない
- 関連づける資産の種類（AWS S3 バケット、Azure Blob Storageなど）でマネージド属性を変えることは出来るが、同一の種類の資産では同一のマネージド属性となる
  - 例えばAチームのS3バケットに対してはデータオーナーは必須としたいが、Bチームでは必須としたくないなど
- データ製品に対しては設定できない
- 属性グループの作成時にのみ必須項目とでき、あとから追加で必須に変更できない

ドキュメントにも一部記載がありますが、実際の運用に載せる際には考慮が必要になりそうです。

- [Microsoft Purview データ マップのマネージド属性 | Microsoft Learn](https://learn.microsoft.com/ja-jp/purview/legacy/how-to-managed-attributes#known-limitations)

## ロールが複雑

Purviewの中でもPurviewソリューションレベルのロール、データマップのドメイン・コレクションレベルのロール、統合カタログのガバナンスドメインレベルのロールと様々なロールがあり、かなり柔軟に権限を設定できます。

設定可能箇所が多いため各チームで必要な権限を明確にし、必要な権限のみを与えるよう設計を丁寧に行う必要があると思いました。

# まとめ

Microsoft Purviewにおけるデータカタログについて概要と歴史、また気になったことを説明してきました。

具体的な機能についてはあまり記載できませんでしたが、長くなってしまうため他の記事の紹介に留めておこうと思います。

データカタログを触ってみた記事。旧ポータルだが、イメージはわかると思います。

- [Microsoft Purviewのデータカタログ・データリネージ機能を検証してみる | Azure導入支援デスク](https://cloud.sojitz-ti.com/blog/microsoft-purview/)

新しいPurviewにおけるData Governanceを説明するスライド。詳細機能も記載されており参考になりました。

- [Microsoft Purview Data Governance について - Speaker Deck](https://speakerdeck.com/ryomaru0825/microsoft-purview-data-governance-nituite)

ではでは。

# 参考資料

- [Microsoft Purview の詳細 | Microsoft Learn](https://learn.microsoft.com/ja-jp/purview/purview()
- [Azure 統合カタログ (ADC) Gen 2、Azure Information Protection、Microsoft Purview (旧称 Azure Purview) はどのように関連していますか? | Microsoft Purview データ ガバナンス ソリューションについてよく寄せられる質問 | Microsoft Learn](https://learn.microsoft.com/ja-jp/purview/data-governance-faq#azure---------adc--gen-2-azure-information-protection-microsoft-purview-----azure-purview-----------------)
