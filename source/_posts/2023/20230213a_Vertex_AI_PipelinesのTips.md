---
title: "Vertex AI PipelinesのTips"
date: 2023/02/13 00:00:00
postid: a
tag:
  - VertexAI
  - GoogleCloud
  - MLOps
  - Tips
category:
  - DataScience
thumbnail: /images/2023/20230213a/thumbnail.png
author: 平野甫
lede: "Vertex AI Pipelinesを利用してみて分かったTipsについて、いくつかピックアップしてまとめました。なお、コードは全てPython・Kubeflowを用いた場合を記載しています。Vertex AI Pipelinesとは、GCP上でMLパイプライン機能を提供するサービスです。サーバーレス方式でMLワークフローをオーケストレートします。"
mathjax: true
---
# はじめに

こんにちは、フューチャーでアルバイトをしている平野です。今回は、Vertex AI Pipelinesを利用してみて分かったTipsについて、いくつかピックアップしてまとめました。なお、コードは全てPython・Kubeflowを用いた場合を記載しています。

# 前提知識

Vertex AI Pipelinesとは、GCP上でMLパイプライン機能を提供するサービスです。サーバーレス方式でMLワークフローをオーケストレートします。

基本的な使い方などについては様々なドキュメントがあるので今回は省略しますが、主には以下の公式ドキュメントを参考にしました。

[Vertex AI のドキュメント](https://cloud.google.com/vertex-ai/docs?hl=ja)
公式のドキュメントです。Vertex AIの概要、チュートリアル、コードサンプルなどがまとめられています。

[Kubeflowのドキュメント](https://www.kubeflow.org/docs/)
Vertex AI Pipelinesを使う際に参照することになる、Kubeflowの公式ドキュメントです。こちらもKubeflowの概要からコンポーネントの作成・パイプラインの実行、サンプルなどがまとめてあります。

## 関連用語

[MLOps on GCP 入門 〜Vertex AI Pipelines 実践〜](https://recruit.gmo.jp/engineer/jisedai/blog/vertex-ai-pipelines-intro/)で分かりやすく解説されていたため、参考にさせていただきました。

* パイプライン
機械学習の一連の処理をカプセル化したものです。Pythonで定義します。前処理やモデル学習、エンドポイントへのデプロイなどの1つ1つの処理（コンポーネント）の実行順序を記述します。パイプラインを定義する関数には`@pipeline`デコレータを付けます。パイプラインの内部には「精度がある値を超えたらデプロイする」などの条件分岐を含ませることも可能です。
* コンポーネント
パイプラインで実行する1つ1つの処理のことを指します。例えば、preprocess -> train -> deployを実行するパイプラインの場合、「preprocess」「train」「deploy」がコンポーネントです。コンポーネントを定義する関数には`@component`デコレータを付けます。コンポーネントの実装には以下の3つが存在します。
**コンポーネントの実装パターン**
  * （1） GCR に push されている**Docker image**を使う  （詳細は[自前のDocker imageを使って実装するには？](#自前のdocker-imageを使って実装するには)）。
    GCRにpushされているimageのURIを引数として与えることで処理を行う関数が用意されています。
  * （2） パイプラインのソースコードに**関数ベース**で書く （詳細は[事前のDocker imageの準備なしでPythonスクリプトのみで実装には？](#事前のdocker-imageの準備なしでpythonスクリプトのみで実装には)）。
    dockerのimageを使わずPythonベースで好きな処理を書くことができるため、簡単な処理を試したい場合などに向いています。
  * （3） **Google Cloudパイプラインコンポーネント**を使う
    よく利用される処理についてはGoogle側がすでに用意してくれているため、事前に関数一発で呼び出して実行してくれるものになっています。

<img src="/images/2023/20230213a/pipeline_example.png" alt="pipeline_example.png" width="960" height="540" loading="lazy">

### 参考

* [MLOps on GCP 入門 〜Vertex AI Pipelines 実践〜](https://recruit.gmo.jp/engineer/jisedai/blog/vertex-ai-pipelines-intro/)

# Tips

## 【基本】パイプラインを実装するには？

おさらいとしてパイプラインの実装方法から始めます。ここではコンポーネントを実装する方法の内、以下２つを紹介します。

（1） 自前のDocker imageを使って実装
（2） 事前のDocker imageの準備なしでPythonスクリプトのみで実装

### （1） 自前のDocker imageを使って実装するには？

#### 1. コンポーネントの作成

**コンテナ（Dockerfile+src）とコンポーネント定義yamlを用意する**

こちらの方法では、コンポーネントごとにDocker imageを用意して、そのDocker imageにコンポーネントの処理の内容を記述したPythonスクリプトを含ませることでコンポーネントを作成します。この方法は、利用するDocker imageのDockerfileやコンポーネントの各種設定を記述したyamlファイルを用意する必要がありますが、ローカルで動かしていたPythonスクリプトをそのままコンポーネント化できます。Docker imageでコンポーネントを作成するために必要なファイルは以下の3つになります。

* Pythonスクリプト：コンポーネントの処理の内容を記述する。
* Dockerfile：Pythonスクリプトの実行に必要なパッケージをインストールする。Pythonスクリプトのコピーも。
* yamlファイル：コンポーネントの入出力、使用するDocker image、Pythonスクリプト実行の際の引数の設定などを記述する。

それぞれのファイルの記述例を以下に示します。
Pythonスクリプトの記述例

```python main.py
import argparse  # 必要なパッケージのインポート
import pandas as pd


def run(csv_path: str, ...) -> None:
    # コンポーネントの処理を記述
    df = pd.read_csv(csv_path)
    ...


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Print text')
    parser.add_argument('--csv_path', type=str)
    ...
    args = parser.parse_args()

    run(**vars(args))
```

Dockerfileの記述例

```Dockerfile Dockerfile
FROM python:3.8-slim
WORKDIR /root

# 必要なパッケージのインストール
RUN pip install pandas

# srcファイルのコピー
COPY . .

ENTRYPOINT ["python", "main.py"]
```

yamlファイルの記述例

```yaml foo.yaml
name: foo
description: bar

inputs:
  - {name: src_csv, type: String, description: 'Path to csv file'}
  ...

implementation:
  container:
    image: gcr.io/<GCP_PROJECT_ID>/<IMAGE_NAME>:latest
    command: [python, main.py]
    args: [
      --csv_path, {inputValue: src_csv},
      ...
    ]
```

#### 2. パイプラインの作成

**Pythonでパイプラインを定義する（コンポーネントの依存関係定義など）**

コンポーネントの作成が終わったら、続いてそれらのコンポーネントをつなげてパイプラインを作成します。

パイプラインを定義した関数には`@pipeline`デコレータを付けます。引数にはパイプラインの名前、説明、`pipeline_root`を指定できます。`pipeline_root`にCloud Storageのバケットを指定することで、指定したバケットに各処理で生成されるアーティファクトを保持しておくことができます。

また、パイプラインをコンパイルするには`compiler.Compiler().compile`関数を使用します。引数にはコンパイルする関数、コンパイル結果を出力するjsonファイルのパスを渡します。

パイプラインの定義、コンパイルを行うPythonスクリプトの例は以下の通りです。

```python
from kfp.v2 import compiler, components, dsl


@dsl.pipeline(name='vertex-ai-pipelines-sample',  # パイプラインを定義する関数には@pipelineデコレータを付ける。
              description='Vertex AI Piplines sample',
              pipeline_root=ROOT_BUCKET)  # pipeline_rootにGCSのバケットを指定すると、指定したバケットに各処理で生成されるアーティファクトを保持できる
def pipeline(input: str, ...) -> None:
    foo_op = components.load_component_from_file(  # 「Docker imageでコンポーネント作成」で作ったyamlファイルを渡す。
        'foo.yaml')
    foo_task = foo_op(src_csv=input, ...)
    ...

compiler.Compiler().compile(pipeline_func=pipeline,
                            package_path='pipeline.json')

```

パイプラインを定義したファイルを実行すると、パイプライン実行時に必要なjsonファイルが`compiler.Compiler().compile()`の`package_path`に指定したパス（上記の例では`pipeline.json`）に生成されます。

### （2） 事前のDocker imageの準備なしでPythonスクリプトのみで実装には？

Vertex AI Pipelinesでは、コンポーネントの処理内容をPythonの関数として記述することでPythonスクリプトのみでコンポーネントを作成できます。その一方で関数の定義の仕方には若干の癖があります。コンポーネントの関数はstandaloneである必要があり、以下の要件を満たす必要があります。

* 関数の外で定義された関数や変数を含まない
* 関数内で必要なパッケージ・モジュールは関数内でimportする
* 関数の入出力の型を明記する

この方法でのコンポーネントの作成例を以下に示します。

```python
from kfp.v2 import dsl


@dsl.component(base_image='python:3.8',  # 関数を実行するベースイメージを指定
               packages_to_install=["numpy", ...])  # 必要なパッケージをここで指定、バージョンの指定も可能
def add() -> None:
    import numpy as np  # 必要なパッケージ・モジュールは関数内でimportする

    a = np.array([1, 2, 3])
    b = np.array([4, 5, 6])

    c = a + b

    print(c)
```

コンポーネントを定義する関数には`@component`デコレータを付け、`base_image`引数でコンポーネントを実行するコンテナイメージを指定、`packages_to_install`引数にリストで必要なパッケージを指定します。また、`create_component_from_func`で関数をラップすることでもコンポーネント化できます（この場合は`@component`デコレータは必要ありません）。`create_component_from_func`の引数にも`base_image`、`packages_to_install`があるので、そちらでコンテナイメージ、必要なパッケージを指定できます。

コンポーネントの作成が終わったら、続いてそれらのコンポーネントをつなげてパイプラインを作成します。

パイプラインの定義、コンパイルを行うPythonスクリプトの例は以下の通りです。

```python
from kfp.v2 import compiler, dsl


@dsl.pipeline(name='vertex-ai-pipelines-sample',
              description='Vertex AI Piplines sample',
              pipeline_root=ROOT_BUCKET)
def pipeline() -> None:
    foo_task = foo(input=...)  # コンポーネントの関数に@compoentデコレータを付けた場合

    # コンポーネントの関数に@compoentデコレータを付けなかった場合
    bar_op = components.create_component_from_func(
        func=bar,
        base_image="python:3.8",
        packages_to_install=["numpy>=1.22.1", ...]
    )
    bar_task = bar_op(input=...)

    ...

compiler.Compiler().compile(pipeline_func=pipeline,
                            package_path='pipeline.json')

```

### 参考

* [Vertex Pipelinesによる機械学習パイプラインの実行](https://zenn.dev/dhirooka/articles/71a5fc473baefb)
* [Building Python function-based components](https://www.kubeflow.org/docs/components/pipelines/v1/sdk/python-function-components/)

## コンポーネントの依存関係を制御するには？

（1）パイプラインの実行順序は基本的にはコンポーネントの入出力の関係から自動的に決定されます。

例えば、以下のようなパイプラインの場合、`add_op`→`mul_op`→`print_op`の順に実行されます。

```python
from kfp.v2 import dsl, compiler
import google.cloud.aiplatform as aip

@dsl.component(base_image="python:3.8")
def add_op(a:int, b:int) -> int:
    return a + b


@dsl.component(base_image="python:3.8")
def mul_op(a:int, b:int) -> int:
    return a * b


@dsl.component(base_image="python:3.8")
def print_op(a:int):
    print("result = {}".format(a))


@dsl.pipeline(name="dependancy-check")
def pipeline(a:int, b:int, c:int):
    add_task = add_op(a, b)
    mul_task = mul_op(add_task.output, c) # mul_opはadd_opの出力が必要
    print_op(mul_task.output) # print_opはmul_opの出力が必要


if __name__ == "__main__":
    compiler.Compiler().compile(pipeline_func=pipeline, package_path='pipeline.json')

    job = aip.PipelineJob(
        display_name="dependancy-check",
        template_path="pipeline.json",
        location="asia-northeast1",
        parameter_values={"a": 1, "b": 2, "c": 3}
    )

    job.run()
```

<img src="/images/2023/20230213a/dependancy.png" alt="dependancy.png" width="413" height="408" loading="lazy">

（2）パイプラインの実行順序を明示的に制御したい場合には、`ContainerOp.after`関数を使うことで可能です。

```Python
@dsl.pipeline(name='dependancy-check')
def pipeline() -> None:
    component1_task = component1()
    component2_task = component2()
    component3_task = component3()

    component2_task.after(component1_task)
    component3_task.after(component2_task)
```

上のようなコードの場合、以下の図のようなパイプラインとなります。
<img src="/images/2023/20230213a/dependancy1.png" alt="dependancy1.png" width="396" height="376" loading="lazy">

また、`after`関数は複数のコンポーネントを受け取ることもできます。

```python
@dsl.pipeline(name='dependancy-check')
def pipeline() -> None:
    component1_task = component1()
    component2_task = component2()
    component3_task = component3()

    component3_task.after(component1_task, component2_task)
```

この場合、以下のようなパイプラインとなります。

<img src="/images/2023/20230213a/dependancy2.png" alt="dependancy2.png" width="792" height="246" loading="lazy">

### 参考

* [Explicitly dependent tasks](https://www.kubeflow.org/docs/components/pipelines/v2/author-a-pipeline/tasks/#explicitly-dependent-tasks)
* [ジョブの実行順序を指定する](https://qiita.com/f6wbl6/items/ef2603bf47a47ffd63ac#%E3%82%B8%E3%83%A7%E3%83%96%E3%81%AE%E5%AE%9F%E8%A1%8C%E9%A0%86%E5%BA%8F%E3%82%92%E6%8C%87%E5%AE%9A%E3%81%99%E3%82%8B)

## パイプラインを起動するには？

パイプラインの起動方法としては、GUIから起動する方法とPythonスクリプトやノートブックから起動する方法があります。GUIから起動する方法については以下の参考の`コンソール`をご確認ください。

Pythonスクリプトから起動する場合は、以下のようなスクリプトを作成し、実行することでパイプラインを起動できます。ノートブック（Vertex AI Workbenchなど）の場合は、以下のコードを最後のセルで実行することで起動できます。

```python
import google.cloud.aiplatform as aip
from kfp.v2 import compiler, components, dsl


@dsl.pipeline(name='vertex-ai-pipelines-sample',
              description='Vertex AI Piplines sample',
              pipeline_root=ROOT_BUCKET)
def pipeline() -> None:
    # パイプラインを定義
    foo_task = foo(input=...)
    bar_task = bar_op(input=...)
...

# パイプラインをコンパイル
compiler.Compiler().compile(pipeline_func=pipeline,
                            package_path='pipeline.json')

job = aip.PipelineJob(
    display_name="vertex-ai-pipelines-sample",
    template_path="pipeline.json",  # パイプラインをコンパイルした際のpackage_pathを渡す
    location="asia-northeast1"
)

job.submit()
```

`job.submit()`のほかに`job.run()`も利用でき、両者の違いは、`submit()`はジョブを投げ終わると終了、`run()`はジョブを投げた後、パイプラインの状態を定期的に表示してくれます。

### 参考

* [パイプラインを実行する](https://cloud.google.com/vertex-ai/docs/pipelines/run-pipeline?hl=ja#console)

## 各コンポーネントに指定したスペックを割り当てるには？

マシンタイプを指定しない場合にはデフォルトで`e2-standard-4`（4コアのCPUと16GBのメモリ）が利用されます。コンポーネントのマシンタイプを指定するには、`set_cpu_limit`、`set_memory_limit`、`add_node_selector_constraint`、`set_gpu_limit`を利用します。マシンタイプを指定するとVertex AI Pipelines側が指定されたスペックに最も近いマシンを自動で割り当てます。

```python
from kfp.v2 import dsl
@dsl.pipeline(name='custom-container-pipeline')
def pipeline():
    preprocess_task = preprocess_op().set_cpu_limit("16").set_memory_limit("20")
    train_task = train_op(preprocess_task.output).add_node_selector_constraint("cloud.google.com/gke-accelerator", "NVIDIA_TESLA_A100").set_gpu_limit(4)
```

また、`CustomJob.jobSpec.workerPoolSpecs`から指定することもできます。

```python
from kfp.v2 import compiler, components, dsl


@dsl.pipeline(name='vertex-pipelines-sample',
              description='Vertex Piplines sample',
              pipeline_root=ROOT_BUCKET)
def pipeline(learning_rate: float = 0.1, max_depth: int = 10) -> None:
    foo_op = components.load_component_from_file('path/to/component.yaml')
    foo_task = foo_op(input=...)
    foo_task.custom_job_spec = {  # custom_job_specでジョブ実行の詳細を設定できる
        "display_name": display_name,
        "job_spec": {
            "worker_pool_specs": [
                {
                    "machine_spec": {
                        "machine_type": "n1-standard-4",
                        "accelerator_type": aiplatform.gapic.AcceleratorType.NVIDIA_TESLA_K80,
                        "accelerator_count": 1,
                    },
                    "replica_count": 1,
                    "container_spec": {
                        "image_uri": container_image_uri,
                        "command": [],
                        "args": [],
                    },
                }
            ]
        }
    }
```

### 参考

* [パイプライン ステップのマシンタイプを指定する](https://cloud.google.com/vertex-ai/docs/pipelines/machine-types?hl=ja)
* [カスタム トレーニング用のコンピューティング リソースを構成する](https://cloud.google.com/vertex-ai/docs/training/configure-compute?hl=ja#create_custom_job_machine_types-python)

## 実行結果のキャッシュを利用するには？

Vertex AI Pipelinesでは、パイプライン全体、タスク単位でキャッシュを利用するかどうかを選択できます。パイプライン全体でキャッシュを利用する場合には、コンパイルしたパイプラインを実行する際に`enable_caching`を`True`にすることでキャッシュを利用できます。なお、`enable_caching`はデフォルトで`True`となっているのでむしろキャッシュを利用したくない場合に`False`にすることになると思います。

```python
pl = PipelineJob(
    display_name="My first pipeline",

    # Whether or not to enable caching
    # True = enable the current run to use caching results from previous runs
    # False = disable the current run's use of caching results from previous runs
    # None = defer to cache option for each pipeline component in the pipeline definition
    enable_caching=False,

    # Local or Cloud Storage path to a compiled pipeline definition
    template_path="pipeline.json",

    # Cloud Storage path to act as the pipeline root
    pipeline_root=pipeline_root,
)
```

タスク単位でキャッシュを利用する場合は、`<task_name>.set_caching_options(True)`で利用できます。

```python
@dsl.pipeline(
    name='vertex-ai-pipelines-sample',
    description='Vertex AI Piplines sample',
    pipeline_root=ROOT_BUCKET
)
def pipeline() -> None:
    foo_op = components.load_component_from_file('path/to/component.yaml')
    foo_task = foo_op(input=...)
    foo_task.set_caching_options(True)

    ...
```

キャッシュが利用されたかどうかは、パイプラインのGUIから確認できます。キャッシュが利用されている場合にはコンポーネントの右に以下のような矢印マークが付きます。また、ノード情報からもキャッシュ済みかを確認できます。

<img src="/images/2023/20230213a/cached.png" alt="cached.png" width="380" height="127" loading="lazy">

<img src="/images/2023/20230213a/component_detail_cached.png" alt="component_detail_cached.png" width="641" height="317" loading="lazy">

### 参考

* [実行キャッシュの構成](https://cloud.google.com/vertex-ai/docs/pipelines/configure-caching?hl=ja)

## パイプラインを定期実行するには？

パイプラインの定期実行はCloud Schedulerを利用することで可能です。

パイプラインの定期実行までの流れは以下のようになります。

1. コンパイルしたパイプラインjsonファイルをGoogle Cloud Storageにアップロード
以下のコマンドでローカルのファイルをバケットにアップロードします。

```sh
gsutil cp <ローカルファイルまでのパス> gs://<BUCKET_NAME>/<ファイル名>
```

2. HTTPリクエストに応じてパイプラインを実行するPythonスクリプトの作成
Cloud FunctionsでHTTPリクエストが送信された場合にパイプラインを実行するコードを作成します。
以下がPythonスクリプトの例です。HTTPリクエストのbodyに、実行するパイプラインのjsonファイルまでのパス、パイプラインに渡すパラメータが含まれているという想定です。

```python
import json
from google.cloud import aiplatform

PROJECT_ID = 'your-project-id'         # <---CHANGE THIS
REGION = 'your-region'                 # <---CHANGE THIS
PIPELINE_ROOT = 'your-cloud-storage-pipeline-root'   # <---CHANGE THIS

def process_request(request):
   """Processes the incoming HTTP request.

   Args:
     request (flask.Request): HTTP request object.

   Returns:
     The response text or any set of values that can be turned into a Response
     object using `make_response
     <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>`.
   """

   # decode http request payload and translate into JSON object
   request_str = request.data.decode('utf-8')
   request_json = json.loads(request_str)

   pipeline_spec_uri = request_json['pipeline_spec_uri']
   parameter_values = request_json['parameter_values']

   aiplatform.init(
       project=PROJECT_ID,
       location=REGION,
   )

   job = aiplatform.PipelineJob(
       display_name=f'hello-world-cloud-function-pipeline',
       template_path=pipeline_spec_uri,
       pipeline_root=PIPELINE_ROOT,
       enable_caching=False,
       parameter_values=parameter_values
   )

   job.submit()
   return "Job submitted"
```

以下はHTTPリクエストのbodyの内容です。Cloud Schedulerジョブを作成する際に以下の内容を含むjsonファイルを使用します。

```json
 {
   "pipeline_spec_uri": "<path-to-your-compiled-pipeline>",
   "parameter_values": {
     "greet_name": "<any-greet-string>"
   }
 }
```

3. Cloud Functionsの関数をデプロイ
続いて、HTTPトリガーを使用して関数をデプロイします。
上で作成したPythonスクリプトを含むディレクトリで以下のコマンドを実行します。

```sh
gcloud functions deploy python-http-function \
    --gen2 \
    --runtime=python37 \
    --region=asia-northeast1 \
    --source=. \
    --entry-point=process_request \
    --trigger-http
```

4. Cloud Schedulerジョブを作成
最後に以下のコマンドでCloud Schedulerジョブを作成します。以下の例では毎日の朝9時にパイプラインが実行されます。

```sh
gcloud scheduler jobs create http run-pipeline \
    --schedule="0 9 * * *"
    --uri=<PATH_TO_PIPELINE_JSON> \
    --http-method=post \
    --message-body-from-file=<PATH_TO_HTTP_REQUEST_JSON> \
    --time-zone=Asia/Tokyo
```

### 参考

* [Cloud Scheduler でパイプライン実行をスケジュールする](https://cloud.google.com/vertex-ai/docs/pipelines/schedule-cloud-scheduler?hl=ja)
* [Google Cloud CLI を使用して Cloud Functions（第 2 世代）の関数を作成してデプロイする](https://cloud.google.com/functions/docs/create-deploy-gcloud?hl=ja#functions-prepare-environment-python)
* [cron ジョブを作成して構成する](https://cloud.google.com/scheduler/docs/creating?hl=ja#gcloud_2)
* [gcloud コマンドライン リファレンス](https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http?hl=ja)

## 引数を渡すには？

ユーザ→パイプライン、コンポーネント→コンポーネント

パイプライン実行時に引数を渡すには、`aiplatform.PipelineJob`の`parameter_values`を指定することで可能です。辞書型で変数名と値のペアで渡すことができます。あとは`argparse`などを利用すれば、コマンドライン引数からパイプラインのパラメータを入力できます。

```python
import argparse
from kfp.v2 import dsl, compiler
import google.cloud.aiplatform as aip


parser = argparse.ArgumentParser()

parser.add_argument("-a", type=int)
parser.add_argument("-b", type=int)
parser.add_argument("-c", type=int)

@dsl.component(base_image="python:3.8")
def add_op(a: int, b: int) -> int:
    return a + b


@dsl.component(base_image="python:3.8")
def mul_op(a: int, b: int) -> int:
    return a * b


@dsl.component(base_image="python:3.8")
def print_op(a: int):
    print("result = {}".format(a))


@dsl.pipeline(name="pipeline-arg-sample")
def pipeline(a: int, b: int, c: int):
    add_task = add_op(a, b)
    mul_task = mul_op(add_task.output, c)
    print_op(mul_task.output)


if __name__ == "__main__":
    args = parser.parse_args()

    compiler.Compiler().compile(pipeline_func=pipeline, package_path='pipeline.json')

    job = aip.PipelineJob(
        display_name="pipeline-arg-sample",
        template_path="pipeline.json",
        location="asia-northeast1",
        parameter_values={"a": args.a, "b": args.b, "c": args.c},
        enable_caching=False
    )

    job.run()
```

コンポーネント間でのデータの受け渡しは、渡すデータが単一データか複数データかで異なります。
単一データの受け渡しの場合、以下のようになります。

```python
from kfp.v2 import dsl


@dsl.component(base_image='python:3.8')
def add(a: int, b: int) -> int:
    c = a + b
    return c

@dsl.component(base_image='python:3.8')
def print_result(a: int) -> None:
    print(a)


@dsl.pipeline(name='vertex-pipelines-sample',
              description='Vertex Piplines sample',
              pipeline_root=ROOT_BUCKET)
def pipeline(a: int = 1, b: int = 2) -> None:
    add_task = add(a, b)
    print_task = print_result(add_task.output)
```

単一データの場合、関数の出力は`<task_name>.output`で渡すことができます。

一方、複数データの受け渡しの場合は、以下のようになります。

```python
from typing import NamedTuple
from kfp.v2 import dsl


@dsl.component(base_image='python:3.8')
def max_min(a: list) -> NamedTuple('Outputs', [('max', int), ('min', int)]):
    max = max(a)
    min = min(a)
    return (max, min)

@dsl.component(base_image='python:3.8')
def print_result(max: int, min: int) -> None:
    print("max: {}, min: {}".format(max, min))


@dsl.pipeline(name='vertex-pipelines-sample',
              description='Vertex Piplines sample',
              pipeline_root=ROOT_BUCKET)
def pipeline(a: list = [1, 2, 3]) -> None:
    max_min_task = max_min(a)
    print_task = print_result(max_min_task.outputs['max'], max_min_task.outputs['min'])
```

複数データを出力する場合は、`NamedTuple`を用いて属性名を指定して出力し、それらを受け取る際には`<task_name>.outputs['<key>']`で各データを指定します。

### 参考

* [Understanding how data is passed between components](https://www.kubeflow.org/docs/components/pipelines/v1/sdk/python-function-components/#understanding-how-data-is-passed-between-components)
* [Kubeflow Pipelinesにおけるコンポーネント間のデータ受け取り方・渡し方まとめ - その1](https://qiita.com/f6wbl6/items/f668368222983f7f8f46)
* [Kubeflow Pipelinesにおけるコンポーネント間のデータ受け取り方・渡し方まとめ - その2](https://qiita.com/f6wbl6/items/9080670c21bb35c37c0c)

## パラメータ・中間データ・モデルを管理するには？

### 入力パラメータの保存

パイプラインを定義した関数の入力が自動で保存されます。例えばパイプラインを以下のような関数とした場合、`learning_rate`と`max_depth`が「パイプライン実行分析」の「実行パラメータ」や、パイプライン比較の「パラメータ」として表示されます。

また、これらのパラメータはパイプラインのリランの際に、別の値を入力してパイプラインを実行できます。**リランの際にはこれらのパラメータしか変更できないため、変更の可能性があるパラメータはすべてパイプラインの関数の引数としておくことをおすすめします。**

```python
@dsl.pipeline(name='train LightGBM')
def pipeline(learning_rate: float = 0.1, max_depth: int = 10) -> None:
    ...
```

<img src="/images/2023/20230213a/param.png" alt="param.png" width="647" height="220" loading="lazy">

### データセット、モデル、指標の保存

データを保存するには、コンポーネントの関数の引数に`Output[<type>]`もしくは`OutputPath("<type>")`型の引数を作ることで可能です。`<type>`には`Dataset`、`Model`、`Metrics`、`Execution`が指定できます。

```python
from kfp.v2 import dsl
from kfp.v2.dsl import OutputPath


@dsl.component(base_image='python:3.8')
def train(..., model: Output[Model], ...) -> None:
    ...
    model_dir = Path(artifact.path)
    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_dir / 'model.joblib')
    ...
```

また、Dockerベースの場合には、コンポーネントの仕様を定義したyamlファイルの`outputs`に記述することでできます。

```yaml
name: train
...
outputs:
  - {name: model, type: Model, description: 'trained model'}
```

指標については、以下のように`log_metric(<name>, <value>)`を使うことで、のちの比較において「指標」として見ることができます。

```python
from kfp.v2 import dsl
from kfp.v2.dsl import Input, Dataset, Model, Output, Metrics


@dsl.component(
    base_image="python:3.8", packages_to_install=[...]
)
def evaluate(dataset: Input[Dataset], model: Input[Model], metrics: Output[Metrics]) -> None:
    ...
    metrics.log_metric("accuracy", (acc * 100.0))
    metrics.log_metric("framework", "Scikit Learn")
```

<img src="/images/2023/20230213a/metrics.png" alt="metrics.png" width="612" height="156" loading="lazy">
→各データについて、後から確認したくなった場合、Vertex AI Pipelinesでは、どのようなパイプラインの中で生成されたのかをGUIで見ることができます。
<img src="/images/2023/20230213a/data_lineage_modified.png" alt="data_lineage_modified.png" width="1200" height="382" loading="lazy">

## ログを確認するには？

ログはパイプラインのコンポーネントごとに見ることができます。

Vertex AI Pipelinesのコンソールからログを見たいパイプラインを選択し、表示されるパイプラインのグラフからコンポーネントを選択することで、画面下部にコンポーネントのログが表示されます。

ログは標準出力、標準エラー出力に出力されたものがログに表示されます。

## 処理時間・起動時間（Pythonスクリプト・Docker image）を確認するには？

パイプラインの処理時間や開始時刻、終了時刻はパイプライン一覧のページから確認できます。
<img src="/images/2023/20230213a/time.png" alt="time.png" width="1200" height="306" loading="lazy">
また、パイプラインの詳細のページからは各コンポーネントの処理時間、開始時刻、終了時刻を確認できます。
<img src="/images/2023/20230213a/time_component.png" alt="time_component.png" width="515" height="468" loading="lazy">

## パイプラインのグループ分け・実行結果を比較するには？

Vertex AI Pipelinesでは、パイプライン実行で生じる様々なデータ（入力パラメータ、データセット、モデル、指標、etc）を保存でき、後でそれらを確認したり、複数のパイプラインを比較したりできます。データの保存については[パラメータ・中間データ・モデルを管理するには？](#パラメータ中間データモデルを管理するには)をご覧ください。

### パイプラインのグルーピング

パイプラインをのちの比較のためにグルーピングしておきたい場合には、Vertex AI Experimentsが便利です。Vertex AI Experimentsではexperimentを作成してそこにパイプラインを登録できます。experimentの作成は以下のようにしてできます。

```python
import google.cloud.aiplatform as aip


if __name__ == "__main__":
    aip.init(
        experiment="<experiment_name>",
        experiment_description="<experiment_description>",
        project="<project_id>",
        location="<region>",
    )
```

パイプライン実行時に以下のように作成したexperimentを指定することでパイプラインをexperimentに登録できます。

```python
import google.cloud.aiplatform as aip


if __name__ == "__main__":
    job = aip.PipelineJob(
        display_name="<display_name>",
        template_path="path/to/pipeline.json",
        location="<region>"
    )

    job.submit(experiment="<experiment_name>")
```

experimentはサイドバーの「テスト」から見ることができます。

<img src="/images/2023/20230213a/experiment.png" alt="experiment.png" width="752" height="318" loading="lazy">

### パイプラインの比較

パイプラインを比較する方法はVertex AI PipelinesのGUIから行う方法と、Vertex AI Experimentsから行う方法の2種類あります。

Vertex AI PipelinesのGUIから行う場合は、パイプライン一覧のページから比較したいパイプラインを選択後、比較を押すことで以下の図のような比較が可能です。
<img src="/images/2023/20230213a/compare_pipelines_modified.png" alt="compare_pipelines_modified.png" width="1200" height="408" loading="lazy">
Vertex AI Experimentsから行う場合は、サイドバーの「テスト」から見たいexperimentを選ぶと、以下のように比較ができます。
<img src="/images/2023/20230213a/experiment_2.png" alt="experiment.png" width="752" height="318" loading="lazy">
<img src="/images/2023/20230213a/compare_pipelines_in_vertex_ai_experiments.png" alt="compare_pipelines_in_vertex_ai_experiments.png" width="1200" height="258" loading="lazy">
また、Pythonスクリプトでターミナル上から比較することも可能です。以下のスクリプトを実行することで対象のexperiment内のパイプラインを比較できます。

```python
import google.cloud.aiplatform as aip


def get_experiments_data_frame_sample(
    experiment: str,
    project: str,
    location: str,
):
    aip.init(experiment=experiment, project=project, location=location)

    experiments_df = aip.get_experiment_df()

    return experiments_df


if __name__ == "__main__":
    df = get_experiments_data_frame_sample(
        experiment="<experiment_name>",
        project="<project_id>",
        location="<region>"
    )

    print(df)
```

以下が実行結果です。
<img src="/images/2023/20230213a/compare_pipelines_in_terminal.png" alt="compare_pipelines_in_terminal.png" width="1200" height="49" loading="lazy">

## Vertex AI Pipelinesを利用するコストは？

Vertex AI Pipelinesでは、パイプライン実行ごとに0.03ドルかかります（執筆時点）

加えて、コンポーネントによって使用されるCompute Engineリソースやデータの保存に使用されるGoogle Cloudリソースに対しても課金されます。

例として、リージョンに`asia-northeast1`、コンポーネントのマシンタイプに`n1-standard-4`を指定してパイプラインを1時間実行した場合は

$$(パイプライン実行料金)+(n1-standard-4の1時間当たりの料金) \times 1=$0.03+$0.2806=$0.3106$$

かかる計算になります。
料金の詳細については、以下の参考のリンク先をご参照ください。

### 参考

[Vertex AI Pipelinesの料金](https://cloud.google.com/vertex-ai/pricing?hl=ja#pipelines)

## 起動時間の目安は？

環境や実行するパイプラインによって起動時間は変わると思いますが、参考までに以下のような簡単なパイプラインで確認してみたところ、約1分後に`print`の内容がログに表示されました。

```python
import google.cloud.aiplatform as aip
from kfp.v2 import dsl, compiler
import datetime

@dsl.component(base_image="python:3.8")
def check_startuptime():
    import datetime

    print(datetime.datetime.now())


@dsl.pipeline(name='check-startuptime')
def pipeline():
    check_startuptime()

if __name__ == "__main__":
    compiler.Compiler().compile(pipeline_func=pipeline, package_path='pipeline.json')
    job = aip.PipelineJob(
        display_name="check-startuptime",
        template_path="pipeline.json",
        location="asia-northeast1"
    )

    print(datetime.datetime.now())  # 2023-01-17 07:09:54.927736
    job.submit()
```

ログ
<img src="/images/2023/20230213a/startuptime.png" alt="startuptime.png" width="686" height="42" loading="lazy">

## ディレクトリ構成はどうすればよい？

コンポーネント関連のファイルは、例えば以下のような構成が記載されています。

```sh
components/<component group>/<component name>/

    src/*            # コンポーネントのソースファイル
    tests/*          # コンポーネントをテストするためのファイル
    run_tests.sh     # テストを走らせるためのshellスクリプト
    README.md        # 複数ファイルで構成される場合は、docsというディレクトリを作ってそこで管理

    Dockerfile       # コンポーネントのImageを作るためのDockerfile
    build_image.sh   # docker buildとdocker pushを行うためのshellスクリプト

    component.yaml   # コンポーネントの仕様を定義したyamlファイル
```

実際にこの構成で管理された[公式のサンプルコード](https://github.com/kubeflow/pipelines/tree/master/components/contrib/sample/keras/train_classifier)がありましたので、詳細はそちらをご参照ください。

### 参考

* [Organizing the component files](https://www.kubeflow.org/docs/components/pipelines/v1/sdk/component-development/#organizing-the-component-files)

## テストはどうすればよい？

[kubeflowの公式のサンプル](https://github.com/kubeflow/pipelines/tree/6ee767769d8b8daa61379be6511e7375f8de0a55/samples/test)では、`unittest`を用いたテストの例がありました。

### 参考

* [Vertex Pipelines コードを管理するためのベスト プラクティス](https://cloud.google.com/blog/ja/topics/developers-practitioners/best-practices-managing-vertex-pipelines-code)
* [Writing tests](https://www.kubeflow.org/docs/components/pipelines/v1/sdk/best-practices/#writing-tests)

## パイプライン実行のためのサービスアカウントは？

Vertex AI Pipelines関連のサービスアカウントは、パイプライン実行の際に指定できるサービスアカウントと、パイプライン実行時に各種リソースにアクセスするためにGoogle側が作成するService agents（`gcp-sa-aiplatform-cc.iam.gserviceaccount.com`と`gcp-sa-aiplatform.iam.gserviceaccount.com`）の計3つが存在します。

1つめのパイプライン実行時のサービスアカウントを指定しない場合、Compute Engineのデフォルトのサービスアカウントを使用してパイプラインを実行します。

Compute Engineのデフォルトのサービスアカウントには、**プロジェクト編集者**のロールがデフォルトで付与されています。そのため、公式のガイドではきめ細かい権限を持つサービスアカウントの作成に関する項目があります。

`gcp-sa-aiplatform-cc.iam.gserviceaccount.com`と`gcp-sa-aiplatform.iam.gserviceaccount.com`はVertex AIを利用し始めた段階でGoogle側が自動で作成してくれるため、利用者側が事前に作成する必要はありません。また、パイプライン実行時に指定する必要もありません。

`gcp-sa-aiplatform-cc.iam.gserviceaccount.com`はカスタムトレーニングコードを実行する際に利用され、`gcp-sa-aiplatform.iam.gserviceaccount.com`はVertex AI全般の機能を動作させるために利用されるようです。これら2つのアカウントが持つロールについては[こちら](https://cloud.google.com/iam/docs/understanding-roles#service-agents-roles)をご参照ください。

### 参考

* [きめ細かい権限を持つサービス アカウントを構成する](https://cloud.google.com/vertex-ai/docs/pipelines/configure-project#service-account)
* [Service agents](https://cloud.google.com/iam/docs/service-agents)
* [IAM によるアクセス制御](https://cloud.google.com/vertex-ai/docs/general/access-control#service-agents)

## 気を付けるべきクォータ制限は？

Vertex AI Pipelinesでは、パイプラインジョブの同時実行数やタスクの並列実行数に上限が存在します。また、1つのパイプラインジョブで実行できるタスク数、入出力にも上限があります。
|  項目  |  値  |
| ---- | ---- |
|  パイプライン タスクの並列実行  |  600  |
|  同時実行パイプライン ジョブ  |  300  |
|  ジョブあたりのパイプライン タスクの数  |  10,000  |
|  パイプライン**タスク**あたりの入力アーティファクトと出力アーティファクト  |  100  |
|  パイプライン**ジョブ**あたりの入力アーティファクトと出力アーティファクト  |  10,000  |

### 参考

* [割り当てと上限](https://cloud.google.com/vertex-ai/docs/quotas?hl=ja#vertex-ai-pipelines)

## おわりに

Vertex AI Pipelinesを利用するにあたって気になりそうなことをまとめました。皆様の一助となれば幸いです。
