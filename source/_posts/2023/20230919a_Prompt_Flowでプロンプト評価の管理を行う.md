---
title: "Prompt Flowでプロンプト評価の管理を行う"
date: 2023/09/19 00:00:00
postid: a
tag:
  - LLM
  - LLMOps
  - Azure
  - "Prompt Flow"
category:
  - DataScience
thumbnail: /images/20230919a/thumbnail.png
author: 板野竜也
lede: "AzureのPrompt Flowを使ってLLMに入力するプロンプト評価の管理を行います。プロンプト評価の管理を行いたい背景として..."
---
# はじめに

<div class="note warn" style="background: #fdf9e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

本記事は、プレビュー版のAzure Prompt Flowを扱っています。

操作画面等の内容は2023年9月13日現在の内容であることにご注意ください。

</div>

こんにちは、SAIG/MLOpsチームでアルバイトをしている板野です。

今回は、AzureのPrompt Flowを使ってLLMに入力するプロンプト評価の管理を行います。

プロンプト評価の管理を行いたい背景として、以下のような状況が考えられます。

* チーム内で我流のプロンプトがはびこっている
* プロンプト・出力・評価値をスプレッドシートに手入力するのが煩わしくなってきた
* 良いプロンプトとその評価結果が結びついておらず、「あのプロンプト良かったけどどこ行った？」となる

このような状況を改善するため、客観的・定量的なプロンプト評価を行い、管理していきたいところです。

すなわち、 **プロンプトの実験管理** が行いたいのです。

例えば、複数の評価指標を自動で算出し、以下のような表形式にして任意の評価指標に対してソートできればプロンプトの実験管理の効率が向上します。

| プロンプト | 評価指標A | 評価指標B | 評価指標C |
| - | - | - | - |
| プロンプト01 | 9.6 | 8.9 | 1 |
| プロンプト02 | 8.5 | 7.8 | 1 |
| プロンプト03 | 6.3 | 7.7 | 0 |

今回はこのような表を自動で得られるようにすることを目標とします。

LLMには、追加学習による精度の改善だけでなく、入力するプロンプトの改善による精度向上の余地があります。

今回は、通常の機械学習の実験管理とは異なり、LLM, プロンプトの2変数のうち、LLMを固定します。仮に精度が向上した場合、それが「LLMを改善したから」なのか「プロンプトを改善したから」なのかが分からなくなってしまうからです。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

本記事ではプロンプトという用語を「システムプロンプト」の意味で使っています。すなわち、（ユーザーからの）質問文は最終的にはプロンプトに含まれることにはなりますが、ここでは質問文をプロンプトとは別の要素として扱います。

</div>

# プロンプトの評価

## プロンプトの評価に必要なもの

以下の4つが全て揃えば大体どんな評価もできます。

最低限*印の項目があればそれなりの評価ができます。

* 質問文*
* LLMの回答*
* 理想の回答
* コンテキスト

## プロンプトの評価指標例

プロンプトの評価指標は、原則「プロジェクト・タスクによりけり」です。

ここでは評価指標を定めるための参考として、いくつか事例を集めたので以下にご紹介します。

### 事例①: Prompt Flowの組み込み評価指標

AzureのPrompt Flowにはいくつか組み込みの評価指標が用意されています。

このうちの大半はLLMが評価を下す仕組みとなっています。

<img src="/images/20230919a/Alt_text.png" alt="Alt_text" width="1200" height="540" loading="lazy">

[Source](https://speakerdeck.com/nohanaga/azure-machine-learning-prompt-flow-ping-jia-metorikusujie-shuo?slide=8)

例えば、「以下に質問と回答の対を示します。回答は質問の内容に沿っているか10段階で評価してください」といったプロンプトを入力するとLLMが評価値を返してくれます。

LLMベースの評価は、プロンプト次第であらゆる評価結果を数値として出力してくれるでしょう。

しかし、LLMは確率モデルであるという特性上、同じ入力をすると必ず同じ評価値が返ってくる保証はありません。何度か同じ入力をして得られた評価値の統計（平均値や中央値など）を取ることで、多少はLLMのばらつきを抑えられる可能性があります。

[参考]

* [Azure Machine Learning Prompt flow 評価メトリクス解説](https://speakerdeck.com/nohanaga/azure-machine-learning-prompt-flow-ping-jia-metorikusujie-shuo)
* [Azure Machine Learning の Prompt flow の評価メトリクス紹介 ― ChatGPT どう評価する？](https://qiita.com/nohanaga/items/b68bf5a65142c5af7969)

### 事例②: Pythonのみで実装できる独自定義の評価指標

こちらの事例では、Prompt Flowを使ってPythonのみで実装できる評価指標を実装しています。

「決算書のPDFから必要なデータをJSON形式で抽出する」タスクに対し、以下の2つの評価指標を定めています。

* `correct_keys_percentage`: 正しく抽出できたキーの割合
* `correct_values_percentage`: 抽出したキーのうち、正しく抽出できた値の割合

[参考]

* [Prompt Flowでプロンプトを定量的に評価する](https://qiita.com/sakue_103/items/41d14e96a253a820bc0f)

# Prompt Flowでプロンプト評価の管理を行う

## 取り扱うタスク

今回は文書検索を伴う質疑応答タスクを扱います。

文書検索を伴う質疑応答用のフロー（標準フロー）は実装済みであるとします。文書検索を伴う質疑応答用のフローを作るには[こちらの記事](https://qiita.com/nohanaga/items/7c8b797f20ab8a3d5c92)が参考になりますので、ご参照ください。

どんな内容であれ、「質問文」に対する「LLMの回答」が得られる標準フローが作成できていればOKです。

この標準フローのプロンプトを評価するために、評価フローと呼ばれるフローを別途実装していきます。

## 評価指標

文書検索を伴う質疑応答フローの評価指標として以下の3点を定めます。

* (A)`consistency`: 質問の内容に沿った回答ができているか（1~10の整数値）
* (B)`easiness`: 簡単な表現で分かりやすいか（1~10の整数値）
* (C)`has_source`: ソースの参照を行っているか（2値）

(A)(B)は、先の事例①を参考にLLMベースの評価指標を作成します。

(C)については、先の事例②を参考にPythonのみで実装できるものを作成します。

## Prompt Flowでプロンプト評価の管理を行う

### ①評価フローを実装する

ここからは実際にPrompt Flowを使ってプロンプト自動評価の仕組みを実装していきます。

Prompt Flowでは標準フローではなく、評価フローと呼ばれるフローを実装していきます。

<img src="/images/20230919a/01.png" alt="" width="1200" height="346" loading="lazy">

今回実装した評価フローの概略です。

<img src="/images/20230919a/image.png" alt="" width="1200" height="725" loading="lazy">

以下、入出力および各要素について説明します。

#### 入力(inputs)

入力は以下のように設定します。値は任意の値でOKです。

`question`は質問文、`answer`はLLMの回答を表します。

<img src="/images/20230919a/image-2.png" alt="" width="1200" height="311" loading="lazy">

`line_number`と`variant_id`についてはAzureのドキュメントに以下のような記載がありました。

標準フローと違い評価フローは特殊なので、これらの入力もを用意する必要があるようです。

長くなるのでlineとvariantについての説明は省略しますが、詳細は以下のソースをご覧ください。

> 標準フローとは異なり、評価方法はテストされているフローの後で実行され、複数のバリアントが含まれる場合があります。\
 したがって、評価では、出力の生成元になったデータ サンプルやバリアントなど、一括テストで受け取ったフロー出力のソースを区別する必要があります。\
一括テストで使用できる評価方法を構築するには、line_number と variant_id(s) の 2 つの追加入力が必要です。

[Source](https://learn.microsoft.com/ja-jp/azure/machine-learning/prompt-flow/how-to-develop-an-evaluation-flow?view=azureml-api-2)

#### calc_consistency

LLMを使って「質問に対する回答の一貫性」を評価する部分です。`質問文`と`LLMの回答`を入力として受け取り、評価値を1から10の10段階で返します。

プロンプトの中では、いくつか例示(Few-shot Learning)をしています。

実装は以下画像の通りです。

<img src="/images/20230919a/image-3.png" alt="image" width="1200" height="822" loading="lazy">

<details><summary>プロンプト例</summary>

```text
system:
質問と回答の対を受け取り、質問の内容に沿った回答ができているかを10段階で評価してください。
評価の値が低いほど質問の内容に沿っていない回答であり、高いほど質問に沿った回答であるとする。
評価は必ず1,2,3,4,5,6,7,8,9,10のいずれかであること。

質問：明日の天気は？
回答：明日は晴れです。
評価：10

質問：日本の首都は？
回答：東京にはビルがたくさんあります。
評価：4

質問：今日の天気は？
回答：映画館でポップコーンが食べられます。
評価：1

user:
質問：{{question}}
回答：{{answer}}
評価：
```

</details>

#### calc_easiness

LLMを使って「回答の分かりやすさ」を評価する部分です。`質問文`と`LLMの回答`を入力として受け取り、評価値を1から10の10段階で返します。

実装は`calc_consistency`と同様です。

<img src="/images/20230919a/image_(1).png" alt="" width="1200" height="699" loading="lazy">

<details><summary>プロンプト例</summary>

```text
system:
質問と回答の対を受け取り、回答の分かりやすさを10段階で評価してください。
評価の値が低いほど分かりにくい難解な回答であり、高いほど分かりやすい回答であるとする。
評価は必ず1,2,3,4,5,6,7,8,9,10のいずれかであること。


質問：東京とは？
回答：日本の首都です。東京にはネオンに照らされた超高層ビルから歴史的な寺院まで、超現代的なものと伝統的なものが混在しています。
評価：3

質問：東京とは？
回答：東京は、江戸幕府の所在地であった江戸（えど）という都市が1868年9月（慶応4年7月）に名称変更されたものである。
評価：2

質問：東京とは？
回答：日本の首都です。たくさんのビルが立ち並んでいますが、昔のお寺などもたくさんあって面白い場所です。
評価：10

user:
質問：{{question}}
回答：{{answer}}
評価：
```

</details>

#### has_source

「回答がソース(文書)を参照できているか」を評価する部分です。`質問文`と`LLMの回答`を入力として受け取り、できていれば`1`, できていなければ`0`を返します。

アルゴリズムは非常に簡単で、回答に"source"という文字列が含まれていればソース参照できていると判定します。

以下のようにPythonコードのみで実装しています。

※手順解説のため、サンプルとして簡易なロジックを実装

<img src="/images/20230919a/image_(2).png" alt="" width="1200" height="466" loading="lazy">

<details><summary>コード例</summary>

```python
from promptflow import tool

@tool
def check_source(question: str, answer: str) -> str:

  # 'source'という文字列がanswerに含まれていれば1,含まれていなければ0を返す

  result = 0
  if 'source' in answer.lower():
    result = 1

  return result
```
</details>

#### line_process

`calc_consistency`, `calc_easiness`, `has_source`の各出力を集約し、1つの辞書型として出力するPythonコードです。

<img src="/images/20230919a/image_(3).png" alt="image_(3).png" width="1200" height="509" loading="lazy">

<details><summary>コード例</summary>

```python
from promptflow import tool

@tool
def line_process(consistency: str, easiness: str, has_source: str) -> str:

  result_dic = {}
  result_dic['consistency'] = int(consistency)
  result_dic['easiness'] = int(easiness)
  result_dic['has_source'] = int(has_source)

  return result_dic
```

</details>

#### aggregate_variants_results

Variant毎に結果を集約するPythonコードです。

今回はVariant機能を使っていませんが、評価フローでは、集約（Aggregation）を行うための特別なPythonコードを定義する必要があるので[公式ドキュメント(英語)](https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-develop-an-evaluation-flow?view=azureml-api-2#metrics-logging-and-aggregation-node)を参考に、以下のように実装しました。

<img src="/images/20230919a/image_(4).png" alt="" width="1200" height="862" loading="lazy">

<details><summary>コード例</summary>

```python
from typing import List
from promptflow import tool, log_metric
import numpy as np


@tool
def aggregate_variants_results(variant_ids: List[int], line_numbers: List[int], result_dics: List[dict]):

    # バリアント毎にlinesを集約する
    results_on_each_variant = {}

    for i in range(len(result_dics)):
        result_dic = result_dics[i]
        variant_id = variant_ids[i]
        if variant_id not in results_on_each_variant.keys():
            results_on_each_variant[variant_id] = []
        results_on_each_variant[variant_id].append(result_dic)


    # 各バリアントについてlinesを集約する
    for variant_id, result_dics in results_on_each_variant.items():

        avg_result_dic = {}
        for i in range(len(result_dics)):
            for score_name, score in result_dics[i].items():
                if score_name not in avg_result_dic:
                    avg_result_dic[score_name] = score
                else:
                    avg_result_dic[score_name] += score

        # 平均を取る
        for score_name, sum_score in avg_result_dic.items():
            avg_score = round((sum_score / len(result_dics)), 2)
            avg_result_dic [score_name] = avg_score

        # log_metricを呼び出す
        for score_name, avg_score in avg_result_dic.items():
            log_metric(score_name, avg_score, variant_id=variant_id)

        results_on_each_variant[variant_id] = avg_result_dic

    return results_on_each_variant
```

</details>

#### 出力(outputs)

出力は以下のように設定します。

<img src="/images/20230919a/image-4.png" alt="" width="1200" height="223" loading="lazy">

最後に右上の「保存」を押して評価フローの作成は完了です。

この時点で、「質問文」と「LLMの回答」を入力した際、`consistency`, `easiness`, `has_source`の3つの評価指標の値を出してくれる評価フローが出来上がりました。

### ②評価フローを実行する

それでは、実際に評価を行っていきます。

文書検索を伴う質疑応答用のフロー（標準フロー）の編集画面に入り、「一括テスト」を押します。

以下の画面では一括テストの設定を編集します。一括テストとは、複数の質問文を一括で受けつけて回答を出力してくれる機能です。

<img src="/images/20230919a/image-6.png" alt="image-6.png" width="1200" height="701" loading="lazy">

データは自分で以下のようなCSVファイルを作成し、アップロードします。\
下例のようにあらゆるケースの質問文を用意したり、同じ質問文を複数記載して結果（評価値）の平均をとってLLMによるばらつきに対処したりもできます。

```csv
question
北条政子って何をした人？
源頼朝って何をした人？
源義経って何をした人？
徳川家康って何をした人？
小泉純一郎って何をした人？
```

続いて、評価の設定を編集します。

評価方法の選択では、先程作成した評価フローを選択します。

評価入力マッピングの部分について、`question`のデータソースは`data.question`を選択します。これは一括テストの設定でアップロードしたCSVファイルのquestion列のデータに相当します。`answer`のデータソースは`output.answer`を選択します。これはLLMからの出力に相当します。

<img src="/images/20230919a/02.png" alt="" width="1200" height="710" loading="lazy">

「次へ」を押すとレビューの画面が出ますが、最終確認の画面なので問題なければ「送信」を押します。

別のプロンプトで実行したい場合は、プロンプトを変えて以上の操作を繰り返します。

フロー編集画面上部の「一括実行の表示」を押すと過去の実行が見られます。

<img src="/images/20230919a/image-8.png" alt="" width="473" height="74" loading="lazy">

過去の実行は以下のようにリスト化されています。

ここで、いくつかの実行をチェックボックスで選択し、「メトリックの比較」を押してみましょう。

<img src="/images/20230919a/03.png" alt="" width="1200" height="415" loading="lazy">

すると、以下のように各実行に対する評価指標を比較することができます。

もちろん、任意の評価指標についてソートすることもできます。

<img src="/images/20230919a/04.png" alt="" width="1200" height="268" loading="lazy">

以上で今回目標としていたことが達成できました。

### 補足

本来であればVariant機能を使って複数のプロンプトを一括で評価したいところです。

しかし、Variant機能を使って実行しようとしたところ、記事執筆当時(2023年9月13日)では下図のように列方向に展開されてしまい、結果の比較が行いにくいと感じました。

<img src="/images/20230919a/image-10.png" alt="image-10.png" width="1200" height="210" loading="lazy">

このため今回はVariant機能を使わず、プロンプトを変える毎に逐一実行する方法を取りました。

Prompt Flowのプレビュー版が終わり完成版が登場する頃には改善されているかもしれないので、今後に期待です。

# おわりに

本記事ではPrompt Flowでプロンプトの実験管理を行う方法をご紹介しました。

LLMの開発や運用に携わっている方々の参考となれば幸いです。
