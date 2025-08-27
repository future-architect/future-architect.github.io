---
title: "MSの生成AIサンプルアプリ（Chat with your data - Solution accelerator）コード確認"
date: 2024/08/22 00:00:00
postid: a
tag:
  - LLM
  - Azure
  - Python
category:
  - DataScience
thumbnail: /images/20240822a/thumbnail.png
author: 山田勇一
lede: "LLMが流行って久しいですが、MS、AWS、Googleクラウドベンダ各社が自社のマネージドを利用したサンプルアプリを公開し始めているので、中の実装を見つつリファレンスとしての考え方を確認しようと思い形にしてみました。"
---
## 1. はじめに

LLMが流行って久しいですが、MS、AWS、Googleクラウドベンダー各社が自社のマネージドを利用したサンプルアプリを公開し始めているので、中の実装を見つつリファレンスとしての考え方を確認するための記事です。

次のサンプルコードを見ていきます。

- [Chat with your data - Solution accelerator](https://learn.microsoft.com/ja-jp/samples/azure-samples/chat-with-your-data-solution-accelerator/chat-with-your-data-solution-accelerator/)

## 2. 全体概要

公式に簡易的なアーキ図ありますが、もう少し具体的にリソースの関係を追ったものです。

とてもオーソドックスな構成だと思いましたし、拡張もしやすい印象を受けています。
（間違っていたら指摘していただけると嬉しいです）

<img src="/images/20240822a/azure-sample-Azureリソース・アーキ図_(2).png" alt="azure-sample-Azureリソース・アーキ図_(2).png" width="1081" height="702" loading="lazy">

## 3. 構成

トップにMakefileが存在するため `make help` で「何ができて」「動くのか」予想もできます。

```bash make help結果
help                    💬 This help message :)
ci                      🚀 Continuous Integration (called by Github Actions)
lint                    🧹 Lint the code
build-frontend          🏗️ Build the Frontend webapp
python-test             🧪 Run Python unit + functional tests
unittest                🧪 Run the unit tests
unittest-frontend       🧪 Unit test the Frontend webapp
functionaltest          🧪 Run the functional tests
uitest                  🧪 Run the ui tests in headless mode
docker-compose-up       🐳 Run the docker-compose file
azd-login               🔑 Login to Azure with azd and a SPN
deploy                  🚀 Deploy everything to Azure
destroy                 🧨 Destroy everything in Azure
```

- パッケージ構成
全て掲載すると雑音になるので、要素別にトップレベルのみに絞っています

  ```sh
  .
  ├── code
  │   ├── backend   # Functionsと管理画面のソースコード
  │   │   ├── batch # Functionsコード
  │   │   │   └── utilities # 管理画面とFunctionsの共有処理
  │   │   │      　　...
  │   │   └── pages # 管理画面
  │   ├── frontend  # chat画面のソースコード/react + Typescript
  │   │   ├── public
  │   │   └── src
  │   │      　　...
  │   └── tests  # backendのテストコード
  │       ...
  ├── data       # RAGに利用できるフリー素材
  │   ...
  ├── docker     # ローカル環境
  ├── docs       # ドキュメントフォルダ/readme
  │   ...
  ├── extensions # Teamsと繋ぐためのAzure BotServiceのコード
  │   ...
  ├── infra      # Azure Bicepのコード
  │   ...
  ├── scripts    # frontとinfraのbuildスクリプト
  └── tests      # frontのe2eのテスト
  ```

- 拡張を検討するとき、確認した方が良いと思った起点となるソースコード

  |#|コード(or パス)|役割|
  | ---- | ---- | ---- |
  |（1）|code/backend/batch/get_conversation_response.py|画面からChatの質問を受けて、Azure OpenAIを呼び出しているFunction(get_conversation_response)|
  |（2）|code/backend/batch/batch_push_results.py|ベクトルデータを作っているFunction(batch_push_results)|
  |（3）|code/backend/pages|管理画面|
  |（4）|code/backend/batch/utilities|共通処理|

## 4. 詳細

### 4.1. get_conversation_response

生成AIのオーケストレーターを管理画面より切り替えらえるようになっています。

具体的に処理の分岐は `code/backend/batch/utilities/orchestrator/strategies.py` で行われています。

選択肢としては以下の4つです。

- openai_function
- langchain
- semantic_kernel
- prompt_flow

Tool Callingの実装も入っているので、ハンズオンとしては学ぶところが多い印象でした。

### 4.2. batch_push_results

4ステップでsearchServiceにindexを作っており、ドキュメントタイプ（`pdf, txt, url, md, html, docx, jpg, png`）でembeddingの設定を変えられます。

実装の詳細は `code/backend/batch/utilities/helpers/embedders/push_embedder.py` から追うと良いと思います。

#### 4.2.1. ドキュメント解析(管理画面の`loading_strategy`の設定)

ドキュメントをChunkするため、構造化しています。解析方式として、layout、read、web、docxの4種類で解析方法を分けています。

具体的に処理の分岐は `code/backend/batch/utilities/document_loading/strategies.py` で行われています。

|管理画面の設定値|実装|
| ---- | ---- |
|layout|recognizer|
|read|recognizer|
|web|langchain|
|docx|Python-docx|

#### 4.2.2. 分割(管理画面の`chunking_strategy`の設定)

構造化したドキュメントを分割している処理です。`1.`で構造化した方法によって、切り替える必要がありそうです。
具体的に処理の分岐は `code/backend/batch/utilities/document_chunking/strategies.py` で行われています。

|管理画面の設定値|実装|
| ---- | ---- |
|layout|langchain.text_splitte|
|page|langchain.text_splitte|
|fixd_size_orverlap|langchain.text_splitte|
|paragraph|実装なし|

#### 4.2.3. embedding

OpenAIのClient経由で[ベクトル化](https://github.com/openai/openai-openapi/blob/423e672461b3d17f9829711e4a858e777252f077/openapi.yaml#L1071)しています。
実装は `code/backend/batch/utilities/helpers/llm_helper.py#generate_embeddings` から確認できます。

#### 4.2.4. index create

searchServiceにindexを作ります。あまり特筆すべきところはないと思います。

### 4.3. 管理画面（WebApp）

ページ単位に４ファイルのみなので、読みやすいと思います。

管理画面から設定できる各種設定は、`storage_account`に保存され、バックエンド処理はこの設定ファイルを読み込んで処理を分岐しています。

### 4.4. 共通処理全般

処理が汎化されており、sampleと言いつつこれを育てて欲しい意図が汲み取れました。

実際テストもちゃんと整備されているので、完全に０から構築するのであれば、こちらをforkしてプロジェクトを開始すると良いと思いました。

## 5. 所感

ハンズオンレベルの私とはしては、初期でここまで動くソースを自由に使えるのは普通に嬉しいです。クラウドベンダーもそれだけ自社のサービスを使って欲しいんだなと感じることができました。
