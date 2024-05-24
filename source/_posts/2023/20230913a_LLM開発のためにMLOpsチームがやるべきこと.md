---
title: "LLM開発のためにMLOpsチームがやるべきこと"
date: 2023/09/13 00:00:00
postid: a
tag:
  - LLM
  - MLOps
  - インターン
  - インターン2023
category:
  - DataScience
thumbnail: /images/20230913a/thumbnail.png
author: 平野甫
lede: "「LLM開発のためにMLOpsチームがやるべきこと」というテーマで、従来のMLOpsとの違い・ツール・構成例等について調査・整理しました。LLMとはLarge Launguage Model（大規模言語モデル）の略であり.."
---
## はじめに

こんにちは、SAIG/MLOpsチームでアルバイトをしている板野・平野です。

今回は「LLM開発のためにMLOpsチームがやるべきこと」というテーマで、従来のMLOpsとの違い・ツール・構成例等について調査・整理しました。

LLMとはLarge Launguage Model（大規模言語モデル）の略であり、ここでのLLM開発とは、「LLM自体の開発」および「LLMを活用したシステム開発」の両方を含むものとします。LLM開発のフローについては以前に[LLM開発のフロー](/articles/20230912a/)で詳細を説明しているので、ぜひ併せてご覧ください。

まず、MLOpsとは「機械学習モデルの実装から運用までを円滑に推進するための手法や考え方」のことです。AIの社会実装が増えるに伴い、MLOpsチームを設ける企業も増えてきました。また、最近ではLLMやその関連技術が急速に発達してきており、今後LLMを用いたアプリケーションが開発されていくと考えられます。

LLM自体やLLMを活用したシステムを開発していく場合、MLOpsチームからは「MLOpsチームは何をするべきか？」「既存のMLOpsの枠組みとの違いは？」といった疑問が生じます。

本記事ではこれらの疑問に答えられるよう、LLM自体やLLMを活用したシステムの開発の基本的な部分を踏まえてご説明します。

## 従来のMLOpsとの違い

まず、LLM開発の特徴を以下に整理します。

* パラメータ数が大きくて大規模（大量の計算リソースが必要）
* 汎用的なモデル
* 自然言語を扱う
* 生成AIである（出力が自然言語である）
* 人間による評価が必要
* モデルの能力を引き出すための工夫が必要

※従来のNLP開発の特徴も一部含む

特定のタスクに対応する小規模なモデルを学習＆デプロイするのみであれば既存のMLOpsで対応できましたが、上記の特徴に対応するため、MLOpsチームは新たに「LLMのためのMLOps（LLMOps）」を考えていく必要が出てきました。

## LLM開発の全体像

<img src="/images/20230913a/LLM_system_dev_flow.png" alt="LLM_system_dev_flow" width="960" height="344" loading="lazy">

参考: [https://note.com/wandb_jp/n/n1aa6d77f33cf](https://note.com/wandb_jp/n/n1aa6d77f33cf)

ここでは、LLM開発の全体像を見ていくとともに、各段階において従来のMLOpsと異なる点をご説明していきます。

一般に、ML開発では「モデル開発」→「デプロイメント」→「インテグレーション」→「モニタリング」と進めていきます。LLM開発も同様の流れで開発していくことになるかと思います。

### 1. モデル開発

以前に[LLM開発のフロー]()で紹介した通り、LLM開発は大きく「モデルを用意する（学習）フェーズ」と「モデルの能力を引き出す（推論）フェーズ」に分けられます。モデル開発の段階は「モデルを用意する（学習）フェーズ」に相当します。

「モデルを用意する（学習）フェーズ」では、従来のML開発と同様、データ収集からモデル選定、様々なハイパーパラメータで実験・評価を行い、モデルを開発していきます。

モデルを用意する方法は大きく分けて

* ゼロからモデルを学習する
* 公開済みの基盤モデルから学習する
* プロプライエタリモデルを利用する

の3種類があります。詳細は[LLM開発のフロー](/articles/20230912a/)をご参照ください。

モデル開発の段階では、lossの監視やメタデータの保存、各実験のハイパーパラメータの管理などの従来のMLOpsと同様の実験管理を行う必要がありますが、それに加えLLM開発特有の管理も必要となってきます。

モデル開発の段階における従来のMLとLLMの違いとして、まずモデルが巨大であることがあります。そのため、様々な分散学習の手法を利用して効率的に学習を進めていく必要があります。

また、モデルの出力に対し確立された評価手法が存在しないこともあります。そのため現時点では、モデルの出力を人間が評価する必要もあります。したがって複数モデルの出力を効率的に評価・比較できるような仕組みを作る必要があります。

### 2. デプロイメント

このフェーズでは、開発したLLMをサービス側で使えるようにするためにAPIを実装し、モデルを公開します。

この段階でも、LLMの「モデルが巨大である」という特性から、従来のMLOps以上にリソース管理に注意を払う必要があります。

また、OpenAI等のAPI経由でLLMを利用する場合にはレイテンシやトークン数にも注意を払う必要があります。

### 3. インテグレーション

このフェーズは、[LLM開発のフロー](/articles/20230912a/)における「モデルの能力を引き出す（推論）フェーズ」に相当します。

「モデルの能力を引き出す（推論）フェーズ」では、モデル開発の段階で開発したモデルをプロンプトエンジニアリングにより対象タスクに特化させたり、外部データと統合することで学習段階ではモデルが得ていなかった知識を活用して回答を生成することができるようになります。こちらも詳細は[LLM開発のフロー]()をご参照ください。

また、サービスを提供するための周辺機能（フロントエンドのUIや外部データのデータベース等）を実装・テストし、サービスの提供を開始します。

この段階では、ベクトルデータベース等の構築に加え、サービス開始後の継続的な改善のため、入力プロンプト、チェーンの過程、モデルの出力等を監視できるシステムを構築する必要があります。

### 4. モニタリング

このフェーズでは、提供を開始したサービスが想定通り稼働しているかを監視し、問題があればサービスのアップデートを行う必要があります。

監視する項目はリソース使用率やデータ量、レイテンシ、モデルの入出力、入力トークン数など多岐にわたります。

## LLM開発の課題・検討事項

では、LLM開発に対してMLOpsチームはどのようなことをすれば良いのでしょうか？

MLOpsチームがやるべきことは、以下のような課題や検討事項を解決し、LLM開発を円滑に進めることです。

※課題の一部を羅列
### 1. モデル開発における課題・検討事項

| 課題 | やるべきこと | サービス・ツール候補 |
|----|--------|------------|
| LLMの学習では大規模なデータセットを扱う必要がある | 「大量なデータの保管」や「効率良いデータの取り出し」ができるデータ基盤を用意する | [\[1\] クラウド系データレイク](#1-%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89%E7%B3%BB%E3%83%87%E3%83%BC%E3%82%BF%E3%83%AC%E3%82%A4%E3%82%AF) |
| LLMの学習では大量のデータを集める必要がある | 「指示文・参考情報・理想の回答を人力で集めたデータセット」を効率良く収集する | [\[2\] Argilla](#2-argilla) |
| LLMの学習には大量の計算リソースが必要 | 学習時の膨大な計算コストに注意を払う（分散学習の基盤などを用意する） | [\[3\] クラウド学習基盤](#3-%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89%E5%AD%A6%E7%BF%92%E5%9F%BA%E7%9B%A4) |
| LLMの学習は大量の計算リソースを消費するため、必要以上の学習はコストを増加させる | 学習中に「どこで学習を終えるか」を判断するためにプロンプトに対する出力を適宜確認する | [\[4\] MLflow](#4-mlflow) <br>[\[5\] Weights & Biases](#5-weight--biases) <br>[\[6\] aim](#6-aim) |
| LLMの定量的評価は難しく、人間による評価が必要 | 複数の基盤モデルをファインチューニングする際、各モデルの出力を効率よく比較する | [\[4\] MLflow](#4-mlflow) <br>[\[5\] Weights & Biases](#5-weight--biases) <br>[\[6\] aim](#6-aim) |
| LLMは汎用的なモデルであるが故、学習時のタスクとダウンストリームのタスクが一致しない | 「学習の評価時に行うタスク」と「推論時に行うタスク」が異なり、推論フェーズで想定通りに動かないという事態を避ける | [\[2\] Argilla](#2-argilla) <br>[\[4\] MLflow](#4-mlflow) <br>[\[5\] Weights & Biases](#5-weight--biases) <br>[\[6\] aim](#6-aim) |
| LLMの出力は自然言語であり、評価が難しい | 評価指標を用意する（人間による評価基盤の構築等） | [\[7\] DeepSpeed Chat](#7-deepspeed-chat) <br>[\[8\] JGLUE](#8-jglue) <br>[\[9\] toxic-bert](#9-toxic-bert) <br>[\[10\] Moderation](#10-moderation) <br>[\[11\] Prompt Flow](#11-prompt-flow)|
| 形式的なプロンプト（タスクの説明や出力の形式など）を毎回入力するのは面倒 | プロンプトのテンプレートを作成・管理する | [\[20\] LangChain](#20-langchain) <br>[\[21\] LlamaIndex](#21-llamaindex) <br>[\[24\] Semantic Kernel](#24-semantic-kernel) |
| LLMはプロンプト次第で振る舞いが大きく変わってしまう | タスクに合わせてプロンプトを改良する。タスクが複数ある場合はそれぞれ独立で改良していく | [\[20\] LangChain](#20-langchain) <br>[\[21\] LlamaIndex](#21-llamaindex) |

### 2. デプロイメントにおける課題・検討事項
| 課題 | やるべきこと | サービス・ツール候補 |
|----|--------|------------|
| プロプライエタリモデル使用時特有のコスト管理が必要 | プロプライエタリモデル使用の際、コストマネジメントのため、入力トークン数を監視する | [\[12\] Datadog](#12-datadog) |
| プロプライエタリモデルの場合、レイテンシが発生してしまう | プロプライエタリモデル使用の際、サービス品質保証のため、レイテンシを監視する | [\[12\] Datadog](#12-datadog) |

### 3. インテグレーションにおける課題・検討事項
| 課題 | やるべきこと | サービス・ツール候補 |
|----|--------|------------|
| サービス開始前にテストを行う必要がある | チャット形式のUIを用意してLLMを試験的に試してみる | [\[13\] Dify](#13-dify) <br>[\[14\] Fixie](#14-fixie) <br>[\[15\] Playground](#15-playground) |
| LLMの能力を最大限引き出すために、外部データを活用する必要がある | 文書検索のためのベクトルデータベースを構築・運用する | [\[16\] Chroma](#16-chroma) <br>[\[17\] Elasticsearch](#17-elasticsearch) <br>[\[18\] Faiss](#18-faiss) <br>[\[19\] Pinecone](#19-pinecone) |
| LLMの能力を最大限引き出すために、外部データを活用する必要がある | 文書等をベクトルデータベースに保管する | [\[20\] LangChain](#20-langchain) <br>[\[21\] LlamaIndex](#21-llamaindex) <br>[\[22\] Cosmos DB](#22-cosmos-db) <br>[\[23\] Azure Cache for Redis](#23-azure-cache-for-redis) |
| LLMに会話の流れを理解させる必要がある | チャットの履歴を管理する | [\[20\] LangChain](#20-langchain) <br>[\[21\] LlamaIndex](#21-llamaindex) |

### 4. モニタリングにおける課題・検討事項
| 課題 | やるべきこと | サービス・ツール候補 |
|----|--------|------------|
| サービスの継続的な改善 | 過去のプロンプトを保持し、プロンプト改良に繋げる。苦手なプロンプトを見つけたらマークして保持 | [\[20\] LangChain](#20-langchain) <br>[\[21\] LlamaIndex](#21-llamaindex) |
| プロンプトインジェクションへの対策 | 不正な入力プロンプトを監視する | - |
| LLMが不適切な発言をしてしまう可能性がある | LLMの出力を定性的に評価・監視する（正確性、倫理性、バイアス、プライバシー等） | [\[9\] toxic-bert](#9-toxic-bert) <br>[\[10\] Moderation](#10-moderation) <br>[\[25\] Guardrails AI](#25-guardrails-ai) |

## 課題・検討事項をどう解決するか（ツール紹介）

LLMの急速な発達に伴い、上記の課題や検討事項を解決するのに役立つサービスやツールが沢山出てきています。一方で、LLMはまだ新しい技術のため、サービスやツールを使っても解決しない場合やそもそもツールが無い場合もあります。

このような課題はMLOpsチームが独自に工夫して解決していく必要があります。MLOpsチームは、活用できるサービスやツールは活用し、サービス・ツールが無い or 使えない場合の解決策を考えることに注力したいところです。

ここからは、MLOpsの効率的な推進に活用できそうなLLMのためのサービスやツールを紹介し、読者の皆様に役立つことを期待します。LLMのためのサービス・ツールは数多くありますが、以下に課題・検討事項に対応するサービス・ツールの候補を一部抜粋してまとめました。

その他にも多くのツールがあり、[こちら](https://github.com/tensorchord/Awesome-LLMOps)が参考になります。以下は表にまとめた各サービス・ツールの詳細です。やや無秩序な羅列となっていますがご紹介します。

### \[1\] クラウド系データレイク

AWSやAzure、GCPなどのクラウドサービスでは、「大量なデータの保管」と「効率良いデータの取り出し」が可能なサービスが提供されています。

* AWS
  * データレイク：[Amazon S3](https://aws.amazon.com/jp/s3/)
  * 検索サービス：[Amazon Kendra](https://aws.amazon.com/jp/kendra/)
* Azure
  * データレイク：[Azure Blob Storage](https://learn.microsoft.com/ja-jp/azure/storage/blobs/storage-blobs-introduction)
  * 検索サービス：[Azure Cognitive Search](https://learn.microsoft.com/ja-jp/azure/search/search-what-is-azure-search)
* GCP
  * データレイク：[Google Cloud Storage](https://cloud.google.com/storage?hl=ja)
  * 検索サービス：[Vertex AI Matching Engine](https://cloud.google.com/vertex-ai/docs/matching-engine/overview?hl=ja)

### \[2\] Argilla

[Argilla](https://docs.argilla.io/en/latest/)は、RLHF用に「人力で集めるデータの入力・出力の評価」を円滑にするための管理を行ってくれるプラットフォームです。\

例えば、人力で集めるデータとは、[こちら](https://huggingface.co/datasets/kunishou/databricks-dolly-15k-ja)にあるような指示文(instruction)、参考情報(input)、理想の回答(output)がセットになったものや、複数のLLMからの出力にランク付けをした結果等です。

このようなデータを収集する際、分かりやすいUIを提供し、集めたデータを管理してくれます。

<details>
<summary>詳細</summary>

<img src="/images/20230913a/image.png" alt="image" width="1200" height="672" loading="lazy">

</details>

### \[3\] クラウド学習基盤

AWSやGCPなどのクラウドサービスでは、LLM開発のための学習基盤が用意されています。

* AWS
    * Amazon SageMaker上でLLMの分散学習が可能です（[参考](https://aws.amazon.com/jp/blogs/news/training-large-language-models-on-amazon-sagemaker-best-practices/)）
* GCP
    * [T5X](https://t5x.readthedocs.io/en/latest/)とVertex AIを用いてLLMを学習させることができます（[参考](https://github.com/GoogleCloudPlatform/t5x-on-vertex-ai)）
* Azure
    * Azure Machine LearningでLLMの学習が可能です（[参考](https://learn.microsoft.com/ja-jp/azure/machine-learning/overview-what-is-azure-machine-learning)）。[Prompt Flow](https://learn.microsoft.com/ja-jp/azure/machine-learning/prompt-flow/get-started-prompt-flow)（後述）を利用することで、LLM自体の開発を含めたLLMを用いたサービスの開発を行うことができます

### \[4\] MLflow

[MLflow](https://mlflow.org/docs/latest/index.html)は、従来のMLOpsにおいても広く使われてきたツールですが、MLflowはバージョン2.3からLLMに対応し、
HuggingfaceのトランスフォーマーやLangChainのロギング機能が追加されました。

また、バージョン2.4からはLLMの評価のための機能も追加され、複数のモデルの入力、出力、中間結果を簡単に比較することができます。

<details>
<summary>参考</summary>

<img src="/images/20230913a/mlflow_3.png" alt="mlflow_3" width="1200" height="621" loading="lazy">

</details>

### \[5\] Weight & Biases

[Weight & Biases](https://wandb.ai/site/jp-home)も有名なMLOpsツールです。Weight & Biasesでは[W&B Prompts](https://docs.wandb.ai/guides/prompts)というツールが提供されています。

LangChainの処理の可視化、各実行における入出力、中間結果の比較、チェーン構造やパラメータの確認が簡単に行えます。

[YouTube動画](https://www.youtube.com/watch?v=gU6Ew-Rscw8)にて、W&B Promptsでどのようなことができるのかが分かりやすく紹介されているのでぜひご覧ください。

### \[6\] aim

[aim](https://aimstack.readthedocs.io/en/latest/)では、LLMの学習における各種パラメータやメトリクスのロギング、出力の確認、比較をすることができます。

LangChainの公式Docsに、[Aimを用いたLangChainのトラッキングの例](https://python.langchain.com/docs/ecosystem/integrations/aim_tracking)が記載されており、具体的な導入方法も分かりく紹介されています。加えて[MLflowと組み合わせて使うことも可能](https://github.com/aimhubio/aimlflow)なため、MLflowを現在使われている場合にも、導入を考えることができます。

<details>
<summary>参考</summary>

<img src="/images/20230913a/aim.gif" alt="aim" width="1200" height="675" loading="lazy">

引用元: [AimStack on Twitter](https://twitter.com/aimstackio/status/1653836833586024449)

</details>

### \[7\] DeepSpeed Chat

[DeepSpeed Chat](https://github.com/microsoft/DeepSpeed/blob/master/blogs/deepspeed-chat/japanese/README.md)は、人間のフィードバックによる強化学習（RLHF）に必要なパイプラインをサポートするツールです。

通常、RLHFには複雑なパイプラインが必要で、多大なコストと時間が掛かりますが、DeepSpeed Chatを利用すると以下のような恩恵が得られます。

* 簡単なコードで複雑なRLHFのパイプラインを実行できる
* ZeROやLoRAベースの多数のメモリ最適化技術を利用することで計算リソースを大幅に削減できる

<details>
<summary>詳細</summary>

<img src="/images/20230913a/image_2.png" alt="image" width="1200" height="675" loading="lazy">

</details>

### \[8\] JGLUE

[JGLUE](https://github.com/yahoojapan/JGLUE)は早稲田大学とYahoo! JAPAN研究所によって作成された日本語理解能力を測るためのベンチマークです。文章分類、文ペア分類、質疑応答のタスクの能力を測ることができ、そのためのデータセットも用意されています。

注意点として、JGLUEは一般的な日本語理解能力を測るためのベンチマークであるため、JGLUEのスコアが良いからと言って目的タスクの精度も良いとは言えません。JGLUEのスコアはあくまで参考程度とするべきでしょう。結局、現状では目的タスクの精度を測るには独自でテスト用データセットを作成する必要があるかと思います。

### \[9\] toxic-bert

[toxic-bert](https://huggingface.co/unitary/toxic-bert)はコメントの有害レベルの分類や有害なコメントの分類（どのような有害さを持っているか）が可能なモデルです。LLMの出力の監視に利用することができます。

複数言語で学習済みのモデルが公開されていますが、日本語での学習済みモデルはないようです。しかし、学習用のコードは公開されているため、データセットを用意すれば日本語に対応したモデルも作成することもできるでしょう。

### \[10\] Moderation

[Moderation](https://platform.openai.com/docs/guides/moderation)はOpenAIのAPIを利用する際に、入出力が[OpenAIの利用ポリシー](https://openai.com/policies/usage-policies)に反していないかを監視するために利用できるモデルです（それ以外の目的での利用は禁止されています）。

Moderationでは、ポリシーに反しているかのフラグ(True/False)に加えて、どのカテゴリー(sexual、hate、harassmentなど)で反しているか、各カテゴリーのスコアを返してくれます。

### \[11\] Prompt Flow

[Prompt Flow](https://learn.microsoft.com/ja-jp/azure/machine-learning/prompt-flow/get-started-prompt-flow)はLLMを用いたアプリケーションの作成・デバッグ・評価・デプロイを行うことができるツールです。作成したフローがグラフで可視化されているため、開発時にはどのようなフローになるのかを簡単に確認することができます。また、作成したフローは簡単に評価することができます。その後、デプロイまでをPrompt Flowで完結させることができます。

<details>
<summary>詳細</summary>

<img src="/images/20230913a/image_3.png" alt="image" width="1200" height="607" loading="lazy">

引用元: [プロンプト フローの概要 (プレビュー)](https://learn.microsoft.com/ja-jp/azure/machine-learning/prompt-flow/get-started-prompt-flow)

</details>

### \[12\] Datadog

[Datadog](https://docs.datadoghq.com/ja/)は、SaaS形式で利用できるモニタリングサービスです。

Datadogでは、OpenAI API利用時のトークンの総消費量、リクエストごとのトークンの平均総数、レスポンスタイム、APIのエラー率を監視することができます。

<details>
<summary>詳細</summary>

<img src="/images/20230913a/datadog_dashboard.png" alt="datadog_dashboard" width="1200" height="675" loading="lazy">

引用元: [Datadog](https://www.datadoghq.com/ja/solutions/openai/)

</details>

### \[13\] Dify

[Dify](https://docs.dify.ai/getting-started/intro-to-dify)はLLMを用いたアプリケーションを簡単に作成できるツールです。Difyではテキスト生成型と会話型のアプリケーションを作成することができます。

アプリケーションのタイプを決めた後は、プロンプトテンプレートを作成、データセットの読み込み、デバッグ、パラメータ調整等ができます。

また、アプリケーションの公開も行うことができます。

<details>
<summary>参考</summary>

<img src="/images/20230913a/Dify_table.png" alt="Dify_table" width="946" height="548" loading="lazy">

引用元: [Dify Docs -Creating An Application](https://docs.dify.ai/application/creating-an-application)

<img src="/images/20230913a/dify.gif" alt="dify.gif" width="800" height="495" loading="lazy">

引用元: [Dify.AI on Twitter](https://twitter.com/dify_ai/status/1691296036420243456)

</details>

### \[14\] Fixie

[Fixie](https://www.fixie.ai/)は、LLMを用いたアプリケーションを開発することができるプラットフォームです。

Fixieでは、agent registryに登録されているLLMを使用することができ、使用するLLMにはOpenAIなどのプロプライエタリモデルや独自にファインチューニングしたモデルなどを選ぶことができます。また、外部データとしてGitHub、Google Calendar、databaseなどを利用することができます。

開発したLLMを用いたアプリケーションを作成したい場合や、開発したLLMが期待通りの挙動を示すかどうかのテストなどに利用することができるかと思います。

### \[15\] Playground

[Playground](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/chatgpt-quickstart?tabs=command-line&pivots=programming-language-studio)は、Azure OpenAI Serviceで利用できる、モデルをインタラクティブに試すことが可能なサービスです。

チャット形式とcompletion形式でモデルを試すことができ、各種設定（システムメッセージ（モデルがどのように振舞うべきかを定義した文）や温度パラメータなど）もその場で変更することができます。

<details>
<summary>参考</summary>

<img src="/images/20230913a/Chat_playground.png" alt="Chat_playground" width="1200" height="644" loading="lazy">

引用元: [クイックスタート: Azure OpenAI Service で GPT-35-Turbo と GPT-4 を使い始める](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/chatgpt-quickstart?tabs=command-line&pivots=programming-language-studio#playground)

</details>

### \[16\] Chroma

LlamaIndex等で作成したIndexはどこかに保存しておいて、毎回作成するという手間は省きたいところです。

[Chroma](https://docs.trychroma.com/)はLlamaIndex等で作成したIndexの保存、活用を容易にするためのOSSのベクトルデータベースです。

LangChainやLlamaIndexとの連携をサポートしており（[参考](https://docs.trychroma.com/integrations)）、またデプロイ先としてAWSが利用できます（[参考](https://docs.trychroma.com/deployment)）。

### \[17\] Elasticsearch

[Elasticsearch](https://www.elastic.co/jp/elasticsearch/)はElastic社が提供する全文検索エンジンです。

大量のデータ量やリクエスト量であってもスケーラブルに分散処理が可能となっています。 バージョン8.0からはNLPを用いたセマンティック検索の機能も追加されました（[参考](https://www.elastic.co/jp/virtual-events/introduction-to-nlp-models-and-vector-search)）。

これにより、LLMを活用したシステムにおける外部データの保存先として利用することができます。

### \[18\] Faiss

[Faiss](https://github.com/facebookresearch/faiss)はMetaが作成したOSSのベクトル検索ライブラリです。

テキストのインデックスの作成、検索が可能となっています。

マルチGPUでの検索もサポートされており、高速に類似した文章を検索することができます。

### \[19\] Pinecone

[Pinecone](https://www.pinecone.io/)はフルマネージドなベクトルデータベースです。

商用のサービスとはなりますが、インデックスの作成、検索、保存・管理をこのサービス1つで完了させることができます。また、スケーリングにも対応しているため、大量のリクエストにも高速に対応することができます。

### \[20\] LangChain

LLMを拡張し様々なタスクに特化させるための代表的なOSSツールとして、[LangChain](https://docs.langchain.com/docs/)があります。

LangChainでは、LLMの呼び出しから、プロンプトの管理、外部データの活用、連続的なタスクの実行などが簡単に実装できます。

<details>
<summary>詳細</summary>
以下にLangChainで提供されている主要な機能を紹介します。

| 機能 | 説明 |
|----|----|
| Models | LangChainがサポートしている多くのモデルを同一インターフェースで扱える |
| Prompts | プロンプトの管理、最適化、シリアル化ができる |
| Memory | LLMとのやり取りを保存でき、またそれを用いてLLMに過去のやり取りを踏まえた回答を促すことができる |
| Indexes | LLMに外部データを踏まえた回答をさせるため、外部データのロードやクエリ、更新のためのインターフェースが用意されている |
| Chains | LLMに対して連続的に指示を出すことができる |
| Agents | LLMに次にすべきことの決定、実行、結果の観測を繰り返させ、高レベルの指示に応えさせることができる |
| Callbacks | Chainの過程を記録することができ、アプリケーションのデバッグ・評価をしやすくする |

</details>

### \[21\] LlamaIndex

[LlamaIndex](https://gpt-index.readthedocs.io/en/latest/index.html)は、大量の文書等から質問に関連する内容を抽出し、その内容に基づいてLLMに回答させるといったことができます。

この場合、まず大量の文書をベクトル化して保持しておきます。質問文が来たら、ベクトルとの類似度をもとに関連する文章を抽出し、

その内容をプロンプトに含めてLLMに回答させるという流れになります。

LlamaIndexを用いることで、

* 外部データの読み込み
* Indexの作成
* クエリで関連データを抽出

ができるようになります。

### \[22\] Cosmos DB

[Cosmos DB](https://learn.microsoft.com/ja-jp/azure/cosmos-db/introduction)は、チャット形式のLLMを用いたアプリケーションにおいて、会話履歴を保存する場合に使うことができます。 Cosmos DBはAzureのフルマネージドなNoSQLデータベースです。

[こちらの記事](https://qiita.com/nohanaga/items/18baccb843b4148e6a77#3-%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E5%B1%A5%E6%AD%B4%E3%81%AE%E6%A4%9C%E7%B4%A2azure-cache-for-redis)では、実際にCosmos DBを用いてチャットの履歴を保存する例が紹介されていますのでご参照ください。

### \[23\] Azure Cache for Redis

[Azure Cache for Redis](https://azure.microsoft.com/products/cache)も会話履歴を保存する際に利用することができます。通常はインメモリキャッシュとして使用することが想定されますが、データ永続化の機能を利用することでNoSQLのDBとしても利用することができます

（[参考](https://qiita.com/nohanaga/items/18baccb843b4148e6a77#3-%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E5%B1%A5%E6%AD%B4%E3%81%AE%E6%A4%9C%E7%B4%A2azure-cache-for-redis)）。

### \[24\] Semantic Kernel

[Semantic Kernel(SK)](https://github.com/microsoft/semantic-kernel)は、Microsoftが開発しているOSSのサービスで、LLMと従来のプログラミング言語を簡単に組み合わせることが可能で、LLMをアプリに統合することができます。

SKでは、LLMを特定のタスクを実行する関数(Semantic Function)として扱い、従来のプログラミング言語の関数(Native Function)と合わせて、「スキル」という枠組みで扱います。そして、これらのスキルをパイプライン化してまとめることが可能です。

さらにプランナーという機能では、登録されたスキルを使って自動でタスク実行のためのスキルの選択・実行順を考えてくれます。

### \[25\] Guardrails AI

[Guardrails AI](https://shreyar.github.io/guardrails/)はLLMの出力に対して、構造検証、型検証、品質検証を行うことができるPythonライブラリです。

Guardrails AIには以下のような出力検証機能があります。

* 生成されたテキストに偏りがないか、生成されたコードにバグがないかなどの意味的な検証を行う
* バリデーションが失敗した場合、修正アクション（LLMに再びプロンプトを入力する等）を実行する
* 構造や型（JSONなど）の検証を行う

## LLMシステム構成例

これまで、LLMに対するMLOpsチームの課題ややるべきことを中心に説明しました。ここからは、LLMの具体的なユースケースから理解を深めていただくことを目的として、LLMシステムの構成例を紹介していきます。

本章では、LLMシステムの構成例を「クラウドサービスに依存しない構成例」と「クラウドサービスを用いた構成例」に分けてご紹介します。

いずれの例も、社内文書やWeb上のドキュメント等をチャット形式で検索できるようなシステムの構成例です。

### クラウドサービスに依存しない構成例

以下はLLMを用いたチャットによる文書検索システムの構成例です。

特定のクラウドサービスに依存せず、可能な限りOSSで構成する際の構成案を考えてみました。

<img src="/images/20230913a/LLM構成例5.png" alt="LLM構成例5" width="921" height="416" loading="lazy">

* ①UI
  * ユーザーからの入力をチャット形式で受け付ける
  * チャット形式のインターフェースに[Text generation web UI](https://github.com/oobabooga/text-generation-webui)というツールを利用
  * あらゆるLLMに対応しているため、モデルの交換等がスムーズに行える
* ②前処理
  * プロンプトインジェクションという攻撃を防ぐ役割を持つ
  * プロンプトインジェクションとは、「LLMに対して特殊な質問をすることで、LLMが持つ機密情報や非公開データを不正に引き出す攻撃」を指す
  * ユーザーからの入力を何らかの形でフィルタリングする必要がありますが、確固たる手法は未だ無い
  * 現状、前処理部は概念として図示しているが、今後必要になってくると考えられる
  * この前処理部分は、プロンプト生成部にまとめても良い
* ③プロンプト生成
  * ここでは入力された質問からプロンプトを生成する
  * プロンプト生成のためのライブラリとして、[LangChain](https://github.com/hwchase17/langchain)や[LlamaIndex](https://github.com/jerryjliu/llama_index)が代表的
  * ライブラリを使うことで、「長い文章をベクトル化してプロンプトに含める」や「ベクトルDBから検索したい文章を抽出しプロンプトに含める」等の処理が実装できる
* ④ベクトルDB
  * ベクトルデータを扱えるデータベース
  * 社内文書など、様々なテキストデータをベクトル化し、得られたベクトルをデータベースに格納する
  * 検索する時は、検索したいキーワードのベクトルと類似のベクトルをデータベースから検索する
  * ベクトルDB・全文検索エンジンとして、[Chroma](https://github.com/chroma-core/chroma)や[Elasticsearch](https://www.elastic.co/jp/elasticsearch/)等が挙げられる
* ⑤LLM
  * 自力でファインチューニングしたモデルやプロプライエタリモデルを使用する
* ⑥後処理
  * LLMの出力の品質を保つために、出力に後処理を施す
  * [Guardrails AI](https://shreyar.github.io/guardrails/)というライブラリを使うと、生成されたテキストに偏りがないか、生成されたコードにバグがないかなどを検証することができる
  * この後処理部分は、プロンプト生成部にまとめても良い

### クラウドサービスを用いた構成例

上記の、クラウドサービスに依存しないチャットによる文書検索システムに似たものを三大クラウドサービス（Azure, AWS, GCP）で構成する場合は以下のようになります。

#### Azure

AzureにおけるLLMを活用したシステム開発の特徴は以下の通りです。

* [Azure OpenAI Service](https://azure.microsoft.com/ja-jp/products/cognitive-services/openai-service)により、OpenAIが提供しているGPT-4やGPt-3.5、Codex等が利用可能
* 文書検索には[Azure Cognitive Search](https://azure.microsoft.com/ja-jp/products/search)というサービスを使うことで、PDFやHTML,Microsoft Office形式など様々なデータソースから検索可能
* OpenAIのAPIと比べて、プライベートネットワーク、リージョンの可用性、責任あるAIコンテンツのフィルター処理などの機能が利用可能

※ただし、6/27現在、新規の利用者はモデルのファインチューニングを行うことができない点に注意が必要です。

<details>
<summary>構成図</summary>

<img src="/images/20230913a/azure_arch.png" alt="azure_arch" width="999" height="475" loading="lazy">

</details>

#### AWS

AWSにおけるLLMを活用したシステム開発の特徴は以下の通りです。

* AWS独自のLLMである[Amazon Titan](https://aws.amazon.com/jp/bedrock/titan/)やそれらをAPI経由で利用できる[Amazon Bedrock](https://aws.amazon.com/jp/bedrock/)を用いて開発が可能
* LangChainを実行するサーバーとしてLambdaを活用し、サーバーレスなシステムを構築可能
* 文書検索には[Amazon Kendra](https://aws.amazon.com/jp/kendra/)というサービスを使うことで、S3上のPDFやHTML,Microsoft Office形式など様々なデータソースから検索可能
* Amazon SageMakerと統合されており、複数モデルをテストするための実験や基盤モデルを大規模に管理するためのパイプライン等の機能が利用可能

<details>
<summary>構成図</summary>

<img src="/images/20230913a/AWS_arch.png" alt="AWS_arch" width="1200" height="835" loading="lazy">

</details>

#### GCP

GCPにおけるLLMを活用したシステム開発の特徴は以下の通りです。

* LLMのモデルには、[Model Garden](https://cloud.google.com/vertex-ai/docs/start/explore-models)にてGoogle製のLLMであるPaLM、Imagen、Codey、Chirp等が利用可能
* 文書検索（グラウンディング）には[Vertex AI Embeddings for Text](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings)と[Vertex AI Matching Engine](https://cloud.google.com/vertex-ai/docs/matching-engine/overview?hl=ja)を使うことで、外部のビジネスデータから所望の文書を検索可能
* [Generative AI Studio](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/generative-ai-studio)という開発環境が用意されており、プロンプトの設計/テスト、基盤モデルのファインチューニングができる

<details>
<summary>構成図</summary>

記事執筆現在（2023年6月14日）GCPにおける、LLMを含む構成例は見当たりませんでしたが、\
以下にグラウンディング（=LLMモデルがLLM外部のデータに接続すること）の構成の概略を示します。

<img src="/images/20230913a/GCP_arch.png" alt="GCP_arch" width="1200" height="676" loading="lazy">

引用元: [Google Cloud Japan ブログ](https://cloud.google.com/blog/ja/products/ai-machine-learning/how-to-use-grounding-for-your-llms-with-text-embeddings)

</details>

## おわりに

本記事では、「LLM開発のためにMLOpsチームがやるべきこと」というテーマでLLMのMLOpsに関連する部分を幅広くご紹介しました。

これからLLM開発を検討している方々やMLOpsに携わっている方々の参考となれば幸いです。

[【LLMOps】LLMの実験管理にTruLens-Evalを使ってみた](/articles/20230914a/)の記事も公開されました。合わせてご覧ください。

（2023年9月19日追記）関連して [Prompt Flowでプロンプト評価の管理を行う](/articles/20230919a/) という記事も公開しました。
