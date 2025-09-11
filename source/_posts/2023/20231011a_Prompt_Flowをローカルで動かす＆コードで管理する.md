---
title: "Prompt Flowをローカルで動かす＆コードで管理する"
date: 2023/10/11 00:00:00
postid: a
tag:
  - Prompt Flow
  - Azure
  - LLM
  - OpenAI
category:
  - DataScience
thumbnail: /images/2023/20231011a/thumbnail.png
author: 板野竜也
lede: "AzureのPrompt Flowをローカル環境で動かし、作成したフローをコードで管理する方法をご紹介します。"
---
## はじめに

こんにちは、SAIG/MLOpsチームでアルバイトをしている板野です。

AzureのPrompt Flowをローカル環境で動かし、作成したフローをコードで管理する方法をご紹介します。

Prompt Flowとは、Azure Machine Learning上の機能で、Azure OpenAIで提供されているLLMを利用したアプリケーション開発を円滑にするためのツールです。

実際にLLMアプリケーションを開発する場合、「プロンプトを入力して終わり」ではなく、ベクトル検索など複数の要素を組み合わせることもあります。このため、Prompt Flowでは処理のフローをDAG(有向非巡回グラフ)で可視化することで、開発効率が大きく向上します。

Prompt FlowはPython[ライブラリ](https://github.com/microsoft/promptflow)（2023/09/27時点ではMITライセンス）として提供されており、Azureのコンソール画面だけでなく、ローカル環境でも実行できます。

ローカルで実行できることには以下の利点があります。

* 特定のクラウドベンダーに依存しないので開発の選択肢が広がる
* フローをコードで管理できる
  * よくアップデートされるGUIの変化に戸惑う必要がない
  * コード編集の差分を記録できる

※本記事では、読者は「Azureのコンソール画面でのPrompt Flowの操作をしたことがある」という前提でご説明します。

## 事前準備

### 1. Pythonのインストール

Prompt Flowを動かすには、`Python 3.9`あるいは`Python 3.10`以上がインストールされている必要があります。

### 2. Prompt Flowライブラリのインストール

以下のコマンドで`promptflow`,`promptflow-tools`のライブラリをインストールします

```sh
pip install promptflow promptflow-tools
```

インストールが完了したら以下のコマンドでpromptflowのバージョンが出力されます

```Python
# (例) "0.1.0b5"
pf -v 
```

### 3. VSCode拡張機能をインストール

Prompt FlowのVSCode拡張機能をインストールします。

VSCodeの拡張機能にて「Prompt Flow」で検索すると出てきます。

<img src="/images/2023/20231011a/image.png" alt="Prompt Flow for VS Code" width="1200" height="560" loading="lazy">

VSCode拡張機能が無くてもPrompt Flow自体は動かせますが、フローの可視化機能があるので、VSCodeが使用できる場合は入れておきましょう。

本記事ではVSCode拡張機能がインストールされている前提で説明していきます。

## シンプルな標準フローを作成する

以下のコマンドで、最もシンプルな標準フローが作成できます。\
`my-simple-flow`の部分はお好きなフロー名に変更してください。

```sh
pf flow init --flow my-simple-flow
```

コマンドを実行したディレクトリの直下に`my-simple-flow`ディレクトリが自動生成されます。

中身は以下の通りです。

<img src="/images/2023/20231011a/image_2.png" alt="my-simple-flow, \pycache_, promptflow, flow.tools.json, .gitignore, data.jsonl, flow.dag.yaml, hello.jinja, hello.py, requirements.txt" width="432" height="330" loading="lazy">

* `__pycache__`: Pythonを実行する際に生成されるキャッシュディレクトリ（削除しても特に問題はない）
* `.promptflow/flow.tools.json`: flow.dag.yamlから参照されるToolsのメタデータ（修正する必要はない）
* `data.jsonl`: フローに入力するデータ
* `flow.dag.yaml`: 入出力・ノード・バリアント等を含むフローの全てを定義したファイル
* `.py, .jinja2等のファイル`: フロー内のツールが参照するコードスクリプト
* `requirements.txt`: フローの実行に必要なPythonパッケージのリスト

`flow.dag.yaml`ファイルの中身は以下の通りです。テキストベースなフロー定義データなので、直感では何をするフローか分かりにくいですね。

そこで赤枠の`Visual editor`を押してみます。

<img src="/images/2023/20231011a/コメント_2023-09-25_163948.png" alt="Visual editoor(Ctrl + k, v)" width="1156" height="1140" loading="lazy">

すると、Azureコンソールでお馴染みのGUIベースの編集画面が出てきます。

「入力されたテキストをシステムプロンプトに含めて出力する」という、LLMを使わない簡単なフローのようです。

<img src="/images/2023/20231011a/pic.png" alt="" width="1200" height="612" loading="lazy">

このVisual editorで編集した内容は、`flow.dag.yaml`のテキストデータに反映されるので、GUIベース及びテキストベースのどちらからでも編集可能です。

一度、フローを動かしてみます。

上図赤枠の部分に好きなテキスト（ここでは`Hello World!`）を入力し、`my-simple-flow`の親ディレクトリから以下のコマンドを打ちます。

```sh
pf flow test --flow my-simple-flow
```

すると、以下のようなコンソール出力が返ってきます。

<img src="/images/2023/20231011a/pic2.png" alt="output_prompt: Prompt: Write a simple Hello World! program that displays the greeting message when executed." width="1200" height="147" loading="lazy">

「入力されたテキストをシステムプロンプトに含めて出力する」というシンプルな標準フローが実行できました。

## LLM付きの標準フローを作成する

ここでは、入力された質問に対する応答をしてもらうフローを作っていきます。

前章で作成したフローの中にLLM（Prompt FlowではLLMツール/LLMノードと呼ぶ）を追加し、少し複雑になったフローです。

### 1. Connectionの設定

まずはConnection（接続）の設定を行います。

任意のディレクトリ上で、接続先を定義するYAMLファイルを作成します（ここでは`connection-azure-openai.yaml`という名前で作成）

YAMLファイルの中身は[公式Docs](https://microsoft.github.io/promptflow/how-to-guides/manage-connections.html)を参考に以下のように作ります。

```yaml
$schema: https://azuremlschemas.azureedge.net/promptflow/latest/AzureOpenAIConnection.schema.json
name: connection-azure-openai # 好きなコネクション名に設定可
type: azure_open_ai
api_key: <API_KEY> # Azure OpenAIリソースのAPIキー
api_base: <API_BASE> # Azure OpenAIリソースのベース（エンドポイントURL）
api_type: azure
api_version: 2023-07-01-preview # バージョンは変わる可能性あり
```

YAMLファイルが作成できたら、以下のコマンドでconnectionを追加します。

```sh
pf connection create -f <YAMLファイルのパス>
```

以下のように詳細が表示されればConnection（接続）の設定は完了です。

<img src="/images/2023/20231011a/pic3.png" alt="" width="1200" height="257" loading="lazy">

### 2. LLMツールの追加

続いて、LLMツールを追加していきます。`flow.dag.yaml`のVisual editorの画面から「+LLM」を押します。

<img src="/images/2023/20231011a/pic4.png" alt="+LLM" width="1200" height="436" loading="lazy">

上部に、LLMツールの名前入力が求められるので好きな名前を設定します（ここでは`llm_node`と設定）

<img src="/images/2023/20231011a/image_3.png" alt="llm_node" width="889" height="97" loading="lazy">

名前入力が完了すると、「new file」を選択します（`<LLMツール名>.jinja2`というファイルが新規生成されます）

<img src="/images/2023/20231011a/image_4.png" alt="new file" width="885" height="131" loading="lazy">

LLMツールが追加されました。connectionには先程設定した接続先が選択できるようになっています。

<img src="/images/2023/20231011a/pic5.png" alt="connection:connection-azure-openai api:chat deployment_name:***-gpt35-01 temperature:1 stop: max_tokens:" width="1200" height="266" loading="lazy">

### 3. フローの編集

入力された質問に対する応答をしてもらうフローを作っていきます。

Azureコンソールでは、1つの画面で全てのソースコードやプロンプトを直接編集できますが、ここではソースファイル毎に編集する必要があります。

フローの概略は以下の通りです。

`Inputs`でユーザーからの質問を受け取り、`system_prompt`でシステムプロンプトにユーザーの質問を埋め込み、`llm_node`でLLMにプロンプトを投げ、`echo_llm_output`でLLMからの回答を加工して`output`に出力します。

<img src="/images/2023/20231011a/image_5.png" alt="inputs -> system_prompt -> llm_node -> echo_llm_output -> outputs" width="1200" height="1266" loading="lazy">

<details><summary>flow.dag.yaml</summary>

```yaml
environment:
  python_requirements_txt: requirements.txt
inputs:
  question:
    type: string
    default: 東京はどこの国の都市？
outputs:
  output:
    type: string
    reference: ${echo_llm_output.output}
nodes:
- name: system_prompt
  type: prompt
  source:
    type: code
    path: system_prompt.jinja2
  inputs:
    question: ${inputs.question}
- name: echo_llm_output
  type: python
  source:
    type: code
    path: echo_llm_output.py
  inputs:
    input: ${llm_node.output}
- name: llm_node
  type: llm
  source:
    type: code
    path: llm_node.jinja2
  inputs:
    input_prompt: ${system_prompt.output}
    deployment_name: gpt35-01
    max_tokens: 256
  connection: connection-azure-openai
  api: chat
```

</details>

各ノードの詳細は以下の通りです。

#### Inputs&Outputs

<img src="/images/2023/20231011a/image_6.png" alt="question string 東京はどこの国の都市？" width="1200" height="333" loading="lazy">

#### system_prompt

<img src="/images/2023/20231011a/image_7.png" alt="${inputs.question}" width="1200" height="222" loading="lazy">

<details><summary>system_prompt.jinja2</summary>

```jinja2
system:
あなたは優秀なAIチャットボットです。ユーザーからの質問に答えて下さい。

user: 
{{question}} 

AI:
```

</details>

#### llm_node

<img src="/images/2023/20231011a/pic6.png" alt="" width="1200" height="309" loading="lazy">

<details><summary>llm_node.jinja2</summary>

```jinja2
{{input_prompt}}
```

</details>

#### echo_llm_output

<img src="/images/2023/20231011a/image_8.png" alt="" width="1200" height="218" loading="lazy">

<details><summary>echo_llm_output.py</summary>

```python
from promptflow import tool

@tool
def echo_llm_output(input: str) -> str:
    return "LLM出力: " + input
```

</details>

### 4. フローの実行

フローの編集が終わったら、先程と同様に以下のコマンドで実行します。

```sh
pf flow test --flow my-simple-flow
```

Outputsの欄に出力が表示されます。

<img src="/images/2023/20231011a/image_9.png" alt="" width="914" height="440" loading="lazy">

### 5. フローの一括実行

複数の入力を一括で実行することもできます。

まずは`flow.dag.yaml`ファイルを編集し、`default: 東京はどこの国の都市？`の行をコメントアウトします。

<details><summary>flow.dag.yaml（コメントアウト後）</summary>

```yaml
environment:
  python_requirements_txt: requirements.txt
inputs:
  question:
    type: string
    # default: 東京はどこの国の都市？
outputs:
  output:
    type: string
    reference: ${echo_llm_output.output}
nodes:
- name: system_prompt
  type: prompt
  source:
    type: code
    path: system_prompt.jinja2
  inputs:
    question: ${inputs.question}
- name: echo_llm_output
  type: python
  source:
    type: code
    path: echo_llm_output.py
  inputs:
    input: ${llm_node.output}
- name: llm_node
  type: llm
  source:
    type: code
    path: llm_node.jinja2
  inputs:
    input_prompt: ${system_prompt.output}
    deployment_name: gpt35-01
    max_tokens: 256
  connection: connection-azure-openai
  api: chat
```

</details>

次に、フローのディレクトリ内にあった`data.jsonl`を編集し、以下のような内容を記載します。

```json
{"question": "オーストラリアの首都は？"}
{"question": "アメリカの首都は？"}
{"question": "イギリスの首都は？"}
```

1行が1つの入力に相当します。質問文を変えたり行を追加したりしても大丈夫です。

最後に、フローの親ディレクトリから以下のコマンドを実行します（`my_run_001`の部分は任意）

```sh
pf run create --flow my-simple-flow --data ./my-simple-flow/data.jsonl --name my_run_001
```

以下のような出力が返ってくれば一括実行は成功です。

<img src="/images/2023/20231011a/7.png" alt="" width="1200" height="297" loading="lazy">

複数実行の結果はログとして記録されており、以下のコマンドでいつでも可視化できます。

```sh
pf run show-details --name my_run_001
```

<img src="/images/2023/20231011a/8.png" alt="" width="1007" height="312" loading="lazy">

## 作成したフローをコードで管理する

今回作成したファイル群は以下の通りです。

<img src="/images/2023/20231011a/image_10.png" alt="" width="472" height="368" loading="lazy">

これらはgitで管理できます。

予め`.gitignore`ファイルが含まれているため、余計なキャッシュ等を含まずプッシュできますが、connection情報が入ったYAMLファイルは後で作成したファイルなので、プッシュしてしまう恐れがあります。

該当ファイルを`.gitignore`に追記するなどして、十分注意してください。

## まとめ

本記事ではAzureのPrompt Flowをローカル環境で動かし、作成したフローをコードで管理する方法をご紹介しました。

LLMの開発や運用(LLMOps)に携わっている方々や、Prompt Flowを試している方々の参考となれば幸いです。
