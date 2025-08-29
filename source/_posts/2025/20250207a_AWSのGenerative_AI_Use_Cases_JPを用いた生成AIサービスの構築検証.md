---
title: "AWSのGenerative AI Use Cases JPを用いた生成AIサービスの構築検証"
date: 2025/02/07 00:00:00
postid: a
tag:
  - AWS
  - MLOps
  - LLM
  - Bedrock
category:
  - Infrastructure
thumbnail: /images/2025/20250207a/thumbnail.png
author: 小川智也
lede: "AWSを用いた生成AIアプリケーションの実装として、Generative AI Use Cases JP についての検証を行いました。"
---

# はじめに

こんにちは、SAIG/MLOpsチームでアルバイトをしている小川です。

AWSを用いた生成AIアプリケーションの実装として、Generative AI Use Cases JP (略称:GenU)についての検証を行いました。

::: note warn
※担当チーム都合で、記事の公開が執筆次期から期間を空けてしまいました。
当時から変更がある可能性がある旨はご承知おきください。
:::

# 検証内容

生成AIを簡単に素早く使いたいという要望を実現するために検証を行いました。GenUにはCloudFormationを用いて実装する方法と、CDKを用いて実装する方法があり、これらの違いは以下のようになっています。

- CloudFormationは数クリックで簡単に構築しユースケースを体験したい方向け
- CDKはソースコードを確認してカスタマイズしたい方向け

本検証ではどれぐらい簡単に構築できるかが知りたいため、CloudFormationでの実装を選択しました。検証した内容は以下の通りです。

- GenUを用いるとどれだけ簡単に生成AIチャットアプリケーションを実装できるのか
- カスタマイズなし(CloudFormationのテンプレートから作成)で、どのような機能の実装が可能か
- カスタマイズをすれば(CDKを用いて作成)、どのような機能の実装が可能か

これらについて、[生成 AI 体験ワークショップ](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP)を参考にGenUの実装に取り組みました。

GenUについての詳しい情報は以下のリンクに記載されています。

- [社内知識を活用した生成 AI チャットボットを構築したい | AWS](https://aws.amazon.com/jp/cdp/ai-chatapp/)
- [aws-samples/generative-ai-use-cases-jp: すぐに業務活用できるビジネスユースケース集付きの安全な生成AIアプリ実装](https://github.com/aws-samples/generative-ai-use-cases-jp)
- [生成AIユースケースを考え倒すためのGenerative AI Use Cases JP (GenU)の魅力と使い方 - Speaker Deck](https://speakerdeck.com/okamotoaws/sheng-cheng-aiyusukesuwokao-edao-sutamenogenerative-ai-use-cases-jp-genu-nomei-li-toshi-ifang)

# アプリケーションのアーキテクチャ

アプリケーションのアーキテクチャは下の画像のようになっていて、点線で囲まれている部分はオプションです。

- フロントエンドはReactが使われており、Amazon CloudFront、AmazonS3によって配信
- バックエンドはAmazon API Gateway、AWS Lambdaを使用し、サーバーレスのアーキテクチャ
- Amazon Cognitoによる認証機能がある
- 基本部分はフルサーバーレスのため従量課金となり、小さく始めやすいという利点がある
- 点線部分のRAG機能、検索エージェント機能、セキュリティ機能、モニタリング機能はオプションとしてデプロイすることが可能

<img src="/images/2025/20250207a/arch.drawio.png" alt="arch.drawio.png" width="899" height="582" loading="lazy">

▲ [GitHub - aws-samples/generative-ai-use-cases-jp: すぐに業務活用できるビジネスユースケース集付きの安全な生成AIアプリ実装](https://github.com/aws-samples/generative-ai-use-cases-jp)より引用

## CloudFormationを用いた際のアーキテクチャ

CloudFormationを使用して構築し、RAGを有効化すると、上図のデフォルトの構成に加えて、点線部分のAWS WAF、RAGチャット機能(Amazon Kendra、S3)が追加でデプロイされます。

# 実装手順

アプリケーションの実装のための手順は以下のようになっています。

1. モデルの有効化
2. WAF (Web Application Firewall)の作成
3. アプリケーションの作成
4. RAG用データの追加

以下、順番に手順を説明していきます。

## モデルの有効化

まずは、[Bedrockのモデルを有効化](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/setup/self-paced/enable-models)する必要があります。すでに有効化している場合はこの手順は不要です。

- Amazon Bedrock でテキスト生成モデル (Anthropic Claude 3/3.5)、テキスト埋め込みモデル (Amazon Titan Text Embeddings V2)、画像生成モデル (Stable Diffusion XL) を有効化
- 2024/12/18現在、東京リージョンでは画像生成モデルが有効化できなかったため、バージニア北部リージョン(us-east-1)で有効化

<img src="/images/2025/20250207a/コメント_2024-10-30_143519.png" alt="コメント_2024-10-30_143519.png" width="933" height="196" loading="lazy">

## WAFの作成

[WAFを作成](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/deploy-application/cloudformation/create-waf)の手順に従って作成しました。

- [このリンク](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?templateURL=https://ws-assets-prod-iad-r-iad-ed304a55c2ca1aee.s3.us-east-1.amazonaws.com/9748a536-3a71-4f0e-a6cd-ece16c0e3487/2024-09-26/WafStack.template.yaml&stackName=WafStack&param_AllowedIpV6AddressRanges=::/1,8000::/1&param_AllowedIpV4AddressRanges=0.0.0.0/1,128.0.0.0/1)を押すと、WAFのスタック作成画面に遷移
- WAFの作成は、バージニア北部リージョンで実施
- 作成画面のデフォルトでは全てのIPアドレスからのアクセスが許可されているので注意
- IPV6の部分は空欄でも作成可能
- S3へのアクセスやポリシー作成が必要になるため、その権限を持つIAMロールを追加

<img src="/images/2025/20250207a/コメント_2024-10-22_174121.png" alt="コメント_2024-10-22_174121.png" width="994" height="295" loading="lazy">

- スタックの作成を押すと、WAFが作成される

## アプリケーションの作成

[アプリの作成](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/deploy-application/cloudformation/create-application)の手順に従って作成しました。

- [このリンク](https://ap-northeast-1.console.aws.amazon.com/cloudformation/home?region=ap-northeast-1#/stacks/quickcreate?templateURL=https://ws-assets-prod-iad-r-nrt-2cb4b4649d0e0f94.s3.ap-northeast-1.amazonaws.com/9748a536-3a71-4f0e-a6cd-ece16c0e3487/2024-09-26/GenerativeAiUseCasesStack.template.yaml&stackName=GenerativeAiUseCasesStack&param_SelfSignUpEnabled=true&param_ImageGenerationModelIds=stability.stable-diffusion-xl-v1&param_AllowedIpV6AddressRanges=::/1,8000::/1&param_ModelIds=anthropic.claude-3-sonnet-20240229-v1:0,anthropic.claude-3-haiku-20240307-v1:0&param_RagEnabled=false&param_ModelRegion=us-west-2&param_AllowedIpV4AddressRanges=0.0.0.0/1,128.0.0.0/1)を押すとアプリケーションのスタック作成画面に遷移
- WAFと同様に全てのIPアドレスからのアクセスが許可されているので注意する
- 以下の画像のように設定し、WAFと同様のロールをつけて作成
- ImageGenerationModelIds, ModelIdsは[サポートしている基盤モデル](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/deploy-application/cloudformation/create-application#)に記載されているものから自分が有効化したものを選ぶ
- ModelRegionはモデルを有効化したリージョン(us-east-1)を入力
- RAGを有効化するときはRagEnabledをTrueにする

<img src="/images/2025/20250207a/コメント_2024-10-23_163437.png" alt="コメント_2024-10-23_163437.png" width="1066" height="562" loading="lazy">

- スタックの作成を押すと、アプリケーションが作成される

## RAG用データの追加

1. S3へのファイルアップロード
2. KendraとS3の連携

という手順で行われます。

### S3へのファイルアップロード

[S3へのアップロード](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/add-data/kendra/upload-to-s3)の手順に従って作業を進めました。このリンクにわかりやすい手順が紹介されているため、詳細な手順に関しては省略します。作成したアプリケーションには、Amazon Kendraと連携するためのgenerativeaiusecasesstack-ragdatasourcebucketからはじまるS3バケットが含まれます。このバケットの中の`docs/` というフォルダにデータを追加することで、RAGチャットが使用可能になります。例えば社内文書を活用したRAGを実装したい場合、`docs/` 以下に社内ドキュメントをアップロードすることで実装可能です。デフォルトでBedrockのドキュメントのpdfが`docs/` 配下に置かれています。

### KendraとS3の連携

Amazon Kendraに移動し、[KendraとS3の連携](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/add-data/kendra/integrate-with-kendra)の手順に従って作業を進めました。このリンクにわかりやすい手順が紹介されているため、詳細な手順に関しては省略します。Kendraには、generative-ai-use-cases-index という名前の Kendra インデックスが作成されており、先ほどのS3のデータソースと連携されています。現時点では先ほどアップロードしたオブジェクトはKendraインデックスと同期していないため、同期させる必要があります。Sync nowというボタンを押すことで同期が可能です。また、今回のように手動で同期させるのではなく、スケジュールを設定することで同期を自動化することもできます。
  
# 実装したアプリ画面

## CloudFormationで、RAGを有効化して実装した際の画面

<img src="/images/2025/20250207a/コメント_2024-10-23_170544.png" alt="コメント_2024-10-23_170544.png" width="1200" height="634" loading="lazy">

<img src="/images/2025/20250207a/コメント_2024-10-23_170425.png" alt="コメント_2024-10-23_170425.png" width="1200" height="626" loading="lazy">

## チャット(テキストのみ入力/画像とテキストを入力)

<img src="/images/2025/20250207a/コメント_2024-10-23_170932.png" alt="コメント_2024-10-23_170932.png" width="1200" height="629" loading="lazy">

<img src="/images/2025/20250207a/コメント_2024-10-23_170845.png" alt="コメント_2024-10-23_170845.png" width="1200" height="631" loading="lazy">

## RAG

サンプルとして提供されていたBedrockのドキュメントと、勤怠システムのドキュメントについての質問をすると、その内容と参照したpdfのページも出力してくれます。

<img src="/images/2025/20250207a/コメント_2024-10-23_173604.png" alt="コメント_2024-10-23_173604.png" width="1200" height="632" loading="lazy">

<img src="/images/2025/20250207a/コメント_2024-10-23_173626.png" alt="コメント_2024-10-23_173626.png" width="1200" height="632" loading="lazy">

## 翻訳

<img src="/images/2025/20250207a/コメント_2024-10-23_174033.png" alt="コメント_2024-10-23_174033.png" width="1200" height="631" loading="lazy">

## 校正

<img src="/images/2025/20250207a/コメント_2024-10-23_174055.png" alt="コメント_2024-10-23_174055.png" width="1200" height="627" loading="lazy">

## その他の機能、課題

ほかにも機能があり、[アプリケーションの確認](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/use-application/create-account)で、どのような機能が実装されているか詳しく紹介されています。

しかし、CloudFormationで作成したアプリケーションはCDKを用いて作成したアプリケーションのバージョンより古いという欠点があります(2024/12/18現在)。

そのため、AgentチャットというAPIと連携して様々なタスクを行う機能など、一部実装できない機能があります。Web検索の結果を用いたチャットはAgentチャット機能を用いて実装するため、CloudFormationを用いた場合はその実装をすることはできません。

また、このアプリケーションのリポジトリを確認すると継続的なアップデートが行われています。そのため、今後新しい機能が実装されることを考えると、CDKを用いて実装した方がより多くの機能を実装できます。

# CDKを使う場合の構築手順

CDKを使う場合のデプロイ手順が[リポジトリ](https://github.com/aws-samples/generative-ai-use-cases-jp?tab=readme-ov-file#%E3%83%87%E3%83%97%E3%83%AD%E3%82%A4)で紹介されています。リポジトリをクローンした後、[cdk.jsonの値を変更し、デフォルトではデプロイされないリソースを有効化](https://github.com/aws-samples/generative-ai-use-cases-jp/blob/main/docs/DEPLOY_OPTION.md#cdkjson-%E3%81%AE%E5%80%A4%E3%82%92%E5%A4%89%E6%9B%B4%E3%81%99%E3%82%8B%E6%96%B9%E6%B3%95)することで、カスタマイズが可能です。npmコマンドのインストールなどの環境構築が必要なため、CloudFormationよりは手間がかかるというデメリットもあります。

# 機能一覧

ここでは、CloudFormationを用いてGenUを構築してみる中でできること、できないことについて整理します。

## CloudFormationで構築したアプリケーションでできること

- 認証機能
- チャット機能(マルチモーダル)
- チャット履歴保存
- RAG(文書)
- 文章生成
- 要約
- 校正
- 翻訳
- Webコンテンツ抽出
- 画像生成機能

## CDKを用いるとできるが、CloudFormationで構築したアプリケーションでできないこと

- Agentチャット(Web検索を用いたRAGチャット)
- UI、ロゴの変更
- ユースケースの追加
- その他、リポジトリに追加されていく新機能の実装

以下のリンクで、Agentチャットについて詳しく紹介されています。検索エージェントに関しては、GenUがデフォルトで用意していますが、自作のエージェントの導入も可能で、Code Interpreter 機能を有効にしたエージェントも紹介されています。

https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/agents-for-amazon-bedrock

- Agentチャット(Web検索を用いたRAG)
  - [検索エージェントの作成](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/agents-for-amazon-bedrock/01-create-agents)
  - [Code Interpreter 機能を有効にしたエージェント](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/agents-for-amazon-bedrock/02-code-interpreter-agent)

<img src="/images/2025/20250207a/code-interpreter-demo-from-file.png" alt="code-interpreter-demo-from-file.png" width="1002" height="849" loading="lazy">

▲ [Code Interpreter 機能を有効にしたエージェント](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP/agents-for-amazon-bedrock/02-code-interpreter-agent)より引用

- UI、ロゴの変更
  - フロントエンドのコードを変更すれば自由に編集可能
- ユースケースの追加
  - [SQL生成のユースケースを追加](https://aws.amazon.com/jp/blogs/news/how-to-generative-ai-use-cases-jp/)
  - サイドバーにユースケースとして追加する際にフロントエンドのコードの変更も必要

# コスト

RAGチャットを有効化しないときのコストの試算では、月額合計料金：39.63 (USD)となっています。(詳細は以下のリンク)

- [生成 AI チャットボットを構築したい (社内データ連携なしの場合) | AWS](https://aws.amazon.com/jp/cdp/ai-chatbot/)

RAGチャット(Kendra)を有効化するときのコストの試算では、月額合計料金：941.99 (USD)となっています。(詳細は以下のリンク)

- [社内知識を活用した生成 AI チャットボットを構築したい | AWS](https://aws.amazon.com/jp/cdp/ai-chatapp/)

RAGチャット(Knowledge Bases)を有効化するときのコストの試算では、月額合計料金：285.69 (USD)となっています。(詳細は以下のリンク)

- [社内知識を活用した生成 AI チャットボットを構築したい (Knowledge Bases 版) | AWS](https://aws.amazon.com/jp/cdp/genai-chat-app/)

# まとめ

今回はGenUについて、CloudFormationでの構築がどれぐらい簡単に行えるのかに重点を置いて検証を行いました。検証を通して、CloudFormationを用いると数クリックで以下の機能を持つ生成AIチャットアプリケーションが簡単に構築できることがわかりました。

## 機能一覧

- 認証機能
- チャット機能(マルチモーダル)
- チャット履歴保存
- RAG(文書)
- 文章生成
- 要約
- 校正
- 翻訳
- Webコンテンツ抽出
- 画像生成機能

しかし、 CloudFormationを用いた場合は最新のリポジトリが反映されていないというデメリットがありました。また、今回はCDKを用いた場合の検証は行っていませんが、以下のようなメリット、デメリットがあると考えられます。

## CDKを用いた場合のメリット

- 最新のリポジトリが反映されている
- 2024/12/18現在、GenUのリポジトリは日々更新されており、新機能の実装が今後も期待される

## CDKを用いた場合のデメリット

- デプロイ手順がCloudFormationよりは手間がかかる

## 構築してみた感想

今回は[生成 AI 体験ワークショップ](https://catalog.workshops.aws/generative-ai-use-cases-jp/ja-JP)を参考にGenUをCloudFormationを用いて構築しました。数クリックで豊富な機能を持つチャットアプリケーションを構築できたため、非常に便利だと感じました。基本部分がサーバーレスのため、試しやすいということも魅力だと思います。また、Streaming Responseも実装されているため、ChatGPTやClaudeなどの他のチャットアプリケーションと比較しても使いづらさを感じませんでした。実際に複数の企業での[活用事例](https://github.com/aws-samples/generative-ai-use-cases-jp?tab=readme-ov-file#%E3%81%8A%E5%AE%A2%E6%A7%98%E4%BA%8B%E4%BE%8B)があり、導入することで業務効率化も期待できると思いました。

# 感想

今回、9か月間SAIG/MLOpsチームでアルバイトをさせていただきました。その間、主にチャットアプリケーションに関する業務を行ってきました。業務を通して、AIだけでなくそれを支えるインフラ技術の重要性について学ぶことができました。また、大学ではあまり触れないクラウドサービスを用いた構築検証など、非常に貴重な体験となりました。アルバイトで取り組む内容に関しても、社員の方々には自分の興味を考慮してタスクを割り当てていただき、楽しく業務に取り組むことができました。大学でAIの研究をしており、その応用に興味のあった自分にとっては非常に学びのある環境で働くことができました。また、技術以外に関しても、リモートで働いていたため、現状や質問したいことなどをうまく言語化する能力も身についたと思います。技術面に加えて、ソフトスキルに関しても非常に学びのある時間を過ごさせていただきました。ありがとうございました。
