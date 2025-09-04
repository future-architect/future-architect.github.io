---
title: "Dataflow後編（Dataflowの事前準備からPub/Sub・BigQueryとの連携例まで）"
date: 2022/09/20 00:00:01
postid: b
tag:
  - Dataflow
  - GoogleCloud
  - インターン
  - インターン2022
  - BigQuery
category:
  - DataEngineering
thumbnail: /images/2022/20220920b/thumbnail.png
author: "平野甫"
lede: "Dataflowを使うための事前準備からパイプライン実行までの一連の流れについて説明します。次の手順で進めていきます。APIの有効化、IAMの設定、Apache Beam SDKのインストール..."
---

<img src="/images/2022/20220920b/dataflow_top2.png" alt="" width="1000" height="663">

# はじめに

はじめまして、フューチャーのインターン"Engineer Camp"に参加した平野と申します。
今回のインターンでは、Google Cloud Platform (GCP)のサービスとして提供されているDataflowについて調査し、その仕組みや使い方についてこの技術ブログにまとめることに取り組みました。

フューチャーのインターンについては[こちら](/tags/インターン/)をご覧ください！

今回の記事は前編・後編に分かれており

* 前編:
  * Dataflowの概要
  * Apache Beamの概要・内部的な仕組み
  * Apache Beamのコードの書き方
* 後編：
  * Dataflowを使う上での事前準備と基本的な使い方
  * GPUを使う上での事前準備と基本的な使い方
  * Pub/Sub・BigQueryとの連携例

という構成になっています。前編は[こちら](/articles/20220920a/)。

# Datflowの事前準備と基本的な使い方

Dataflowを使うための事前準備からパイプライン実行までの一連の流れについて説明します。以下の手順で進めます。

1. APIの有効化
2. IAMの設定
3. Apache Beam SDKのインストール
4. Cloud Storageバケットの作成
5. Dataflow上でパイプラインを実行

なお、以降の

* [Dataflowの使用例（GPUなしver.）](#dataflowの使用例gpuなしver)
* [DataflowでGPUを使う際の事前準備と基本的な使い方](#dataflowでgpuを使う際の事前準備と基本的な使い方)
* [Dataflowの使用例（GPUありver.）](#dataflowの使用例gpuありver)
* [他のGCPサービスとの連携とストリーミング処理](#他のgcpサービスとの連携とストリーミング処理)

では、ここで説明する[APIの有効化](#apiの有効化)、[IAMの設定](#iamの設定)、[Cloud Storageバケットの作成](#cloud-storageバケットの作成)ができている前提で話を進めています。

## APIの有効化

Compute Engine API, Dataflow API, Cloud Storage APIとその他必要な（連携させたい）APIを有効化します。APIの有効化はコンソール画面上部にある検索窓から有効化したいAPIを検索すれば簡単に有効化できます。

## IAMの設定

APIを有効化するとIAMに**Compute Engine default service account**という名前のアカウントが追加されているはずです。
Dataflowを利用するにはそのサービスアカウントに**Dataflowワーカー**、**Dataflow管理者**、**Storageオブジェクト管理者**のロールを追加して保存します。以下の画像のようになっていればOKです。
<img src="/images/2022/20220920b/IAM_setting.png" alt="IAM_setting.png" width="1200" height="164" loading="lazy">
なお、ロールを付与するには、**resourcemanager.projects.setIamPolicy**の権限を持っている必要があります。持っていない場合はプロジェクトの管理者に権限を付与してもらうか、サービスアカウントへのロールの付与を代わりにやってもらってください。

## Apache Beam SDKのインストール

続いて、ローカル環境（今回はCloud Shell）にApache Beam SDKをインストールします。2022/08/30現在、Apache Beam SDKでサポートされているPythonのバージョンは3.8までです。一方、Cloud ShellにデフォルトでインストールされているPythonのバージョンは3.9ですので、pyenv等を用いてPython3.8を実行する仮想環境を作成してください。その後、作成した仮想環境にApache Beamをインストールします。Dataflow(GCP)上で実行するには追加パッケージをインストールする必要があるので、以下のコマンドでインストールしてください。

```bash
pip3 install apache-beam[gcp]
```

## Cloud Storageバケットの作成

Dataflowでパイプライン処理を行う場合、一時ファイルや出力ファイルを保存するためにCloud Storageのバケットを作成する必要があります。
バケットの作成はコンソール画面から作成する方法とPythonから作成する方法があります。
コンソール画面からは以下のように作成できます。
<img src="/images/2022/20220920b/make_bucket_new.gif" alt="make_bucket_new.gif" width="1200" height="665" loading="lazy">

Pythonからバケットを作成する際は以下のコードを参考にしてください（`pip3 install google-cloud-storage`が必要です）。

```python
from google.cloud import storage


def make_bucket(project_name, bucket_name, region):
    client = storage.Client(project_name)
    bucket = storage.Bucket(client)
    bucket.name = bucket_name
    if not bucket.exists():
        client.create_bucket(bucket, location=region)
```

## Dataflow上でパイプラインを実行

続いて、Dataflow上でパイプラインを実行していきます。Dataflow上でパイプラインを実行するにはいくつかのオプションを指定する必要があります（主にGCP関連）。ここでは、それらのオプションの説明とオプションの渡し方について説明します。
Dataflowでパイプラインを実行するためには以下のようなオプションを指定する必要があります。
|オプション名|説明|
|:----:|:----|
|runner|Dataflowで動かす場合には`DataflowRunner`を指定。ローカルで動かす場合には`DirectRunner`。|
|project|プロジェクトID。指定しないとエラーが返ってくる。|
|job_name|実行するジョブの名前。Dataflowのジョブのところにジョブの一覧が表示されるが、その際にどのジョブかを見分ける際に使える。指定しなければ勝手に名前をつけてくれるが、パッと見で判断しづらい。|
|temp_location|一時ファイルを保存するためのGCSのパス（`gs://`からスタートするパス）。指定しなければstaging_locationのパスが使用される。|
|staging_location|ローカルファイルをステージングするためのGCSのパス。指定しなければtemp_locationのパスが使用される。temp_locationかstaging_locationのどちらかは指定しなければならない。|
|region|Dataflowジョブをデプロイするリージョンエンドポイント。デフォルトでは`us-central1`。|

ここでは動かすのに必要な（とりあえずこのへんを渡しておけば動く）オプションを紹介していますので、その他のオプションについては[公式ドキュメント](https://cloud.google.com/dataflow/docs/guides/setting-pipeline-options#setting-other-cloud-dataflow-pipeline-options)を参照してください。

実行する際には以下のように`--<オプション名> 値`の形式で指定することでオプションを渡すことができます。

```bash
python {ソースコードまでのpath} \
--runner "DataflowRunner" \
--project "{プロジェクトID}" \
--job_name "{ジョブの名前}" \
--temp_location "gs://{バケットの名前}/temp" \
--region "asia-northeast1"
```

# Dataflowの使用例（GPUなしver.）

ここでは、scikit-learnのモデルの推論をDataflow上で行う例を扱っていきます。今回はIrisデータセットで学習したモデルの重みパラメータ(`SVC_iris.pkl2`)が既に手元にあるという想定で、そのモデルの推論（学習時と同じIrisデータセットを使用）をDataflow上で行っていきます。以下のような手順で進めていきます。

1. ソースコードの準備
2. Cloud ShellでPythonの環境構築
3. パイプラインの実行

なお、[APIの有効化](#apiの有効化)、[IAMの設定](#iamの設定)、[Cloud Storageバケットの作成](#cloud-storageバケットの作成)がお済みでない方はまずそちらから始めてください。

## ソースコードの準備

今回実行したいソースコード(ファイル名:`runinference_sklearn.py`)です。モデルの重みパラメータまでのパスは`{ソースコードがあるディレクトリ}/models/sklearn_models/SVC_iris.pkl2`です。

```python runinference_sklearn.py
import logging

import apache_beam as beam
from apache_beam.ml.inference import RunInference
from apache_beam.ml.inference.sklearn_inference import ModelFileType, SklearnModelHandlerNumpy
from apache_beam.options.pipeline_options import PipelineOptions
from google.cloud import storage
from sklearn.datasets import load_iris


def upload_model_to_gcs(local_model_path, gcs_model_path, project_name, bucket_name):
    client = storage.Client(project_name)
    bucket = storage.Bucket(client)
    bucket.name = bucket_name
    blob = bucket.blob(gcs_model_path)
    blob.upload_from_filename(local_model_path)


if __name__ == "__main__":
    # パイプラインオプションの設定
    pipeline_options = PipelineOptions()
    options_dict = pipeline_options.display_data()

    # Irisデータの準備
    data = load_iris()
    numpy_data = data.data

    # モデルのアップロード
    upload_model_to_gcs(
        local_model_path="./models/sklearn_models/SVC_iris.pkl2",
        gcs_model_path="models/sklearn_models/SVC_iris.pkl2",
        project_name=options_dict["project"],
        bucket_name=options_dict["bucket_name"]
    )

    # ハンドラーの設定
    model_uri = "gs://{}/models/sklearn_models/SVC_iris.pkl2".format(options_dict["bucket_name"])
    model_file_type = ModelFileType.JOBLIB
    model_handler = SklearnModelHandlerNumpy(model_uri=model_uri, model_file_type=model_file_type)

    # パイプライン実行
    logging.getLogger().setLevel(logging.INFO)
    with beam.Pipeline(options=pipeline_options) as p:
        input = p | "read" >> beam.Create(numpy_data)

        prediction = (
            input
            | RunInference(model_handler)
            | beam.io.WriteToText(options_dict["output_executable_path"], shard_name_template="")
        )
```

## Cloud ShellでPythonの環境構築

次にCloud ShellのPython環境を構築していきます。
まず、Python 3.8の環境を準備します。ターミナル上で

```bash
pyenv install 3.8.13
```

を実行し、Python 3.8をインストールします。その後、

```bash
pyenv virtualenv 3.8.13 dataflow
pyenv activate dataflow
```

を実行してPython 3.8.13がインストールされた仮想環境（ここでは`dataflow`）をアクティベートします。
続いて、必要なパッケージをインストールしていきます。

```bash
pip3 install apache-beam[gcp] google-gcloud-storage
pip3 install scikit-learn
```

## パイプラインの実行

必要なパッケージのインストールが終わったら、最後にパイプラインを実行していきます。以下のコマンドを実行するとDataflow上でパイプライン処理が動き始めます。`{プロジェクトID}`、`{ジョブの名前}`、`{バケットの名前}`は適宜変更してください。

```bash
python runinference_sklearn.py \
--runner "DataflowRunner" \
--project "{プロジェクトID}" \
--job_name "{ジョブの名前}" \
--temp_location "gs://{バケットの名前}/temp/" \
--staging_location "gs://{バケットの名前}/stage/" \
--region "asia-northeast1" \
--bucket_name "{バケットの名前}" \
--output "gs://{バケットの名前}/output.txt"
```

## 結果

推論結果はCloud Storageのバケットの`output.txt`に出力されます。今回の例では以下のような結果が得られました。

```text output.txt
PredictionResult(example=array([5.1, 3.4, 1.5, 0.2]), inference=0)
PredictionResult(example=array([5. , 3.4, 1.6, 0.4]), inference=0)
PredictionResult(example=array([7.6, 3. , 6.6, 2.1]), inference=2)
PredictionResult(example=array([5.9, 3. , 4.2, 1.5]), inference=1)
PredictionResult(example=array([5.7, 3.8, 1.7, 0.3]), inference=0)
PredictionResult(example=array([5.7, 4.4, 1.5, 0.4]), inference=0)
PredictionResult(example=array([6.9, 3.1, 5.4, 2.1]), inference=2)
PredictionResult(example=array([6.2, 2.2, 4.5, 1.5]), inference=1)
PredictionResult(example=array([5.2, 4.1, 1.5, 0.1]), inference=0)
...
```

# DataflowでGPUを使う際の事前準備と基本的な使い方

DataflowでGPUを使用したい場合（例えば機械学習モデルの推論など）には、Dockerと組み合わせることでGPUを使用できます。
基本的な流れは[Datflowの事前準備と基本的な使い方](#datflowの事前準備と基本的な使い方)と同じです。違いはDockerイメージの準備とパイプラインに追加で渡すオプションが増えることくらいです。ここでは

1. Dockerイメージの準備
2. GPU使用時のオプション

について説明します。なお、[APIの有効化](#apiの有効化)、[IAMの設定](#iamの設定)、[Cloud Storageバケットの作成](#cloud-storageバケットの作成)がお済みでない方はまずそちらから始めてください。

## Dockerイメージの準備

DataflowでGPUを使用するには、Apache Beamが扱える、かつ、必要なGPUライブラリが入ったDockerイメージを用意する必要があります。ありがたいことに[PyTorch用の最小イメージ](https://github.com/GoogleCloudPlatform/python-docs-samples/tree/main/dataflow/gpu-examples/pytorch-minimal)や[TensorFlow用の最小イメージ](https://github.com/GoogleCloudPlatform/python-docs-samples/tree/main/dataflow/gpu-examples/tensorflow-minimal)のためのsampleが既に用意されているので、特に理由がなければこちらを利用するのが楽かと思います。

PyTorchを使用する場合には[PyTorch用の最小イメージ](https://github.com/GoogleCloudPlatform/python-docs-samples/tree/main/dataflow/gpu-examples/pytorch-minimal)からファイルをダウンロード後、

```bash
gcloud builds submit --config build.yaml
```

で、DockerイメージをContainer Registryに保存します（デフォルトでのイメージ名は`samples/dataflow/pytorch-gpu:latest`）。

なお、私の環境では、Pythonのバージョンが3.8ではパイプライン実行の際にエラー（`TypeError: code() takes at most 15 arguments (16 given)`）が発生してしまっていたため、Pythonのバージョンを3.7に落としました。具体的には以下のように変更することでエラーは発生しなくなりました。

* pyenvでPython 3.7の環境を用意
    ターミナル上で

    ```bash
    pyenv install 3.7.13
    ```

    を実行し、Python 3.7をインストールします。その後、

    ```bash
    pyenv virtualenv 3.7.13 dataflow_gpu
    pyenv activate dataflow_gpu
    ```

    を実行してPython 3.7.13がインストールされた仮想環境（ここでは`dataflow_gpu`）をアクティベートします。
    続いて、Apache Beamをインストールしていきます。

    ```bash
    pip3 install apache-beam[gcp]
    ```

* Dockerfileを以下のように変更

    ```Dockerfile:Dockerfile
    FROM pytorch/pytorch:1.9.1-cuda11.1-cudnn8-runtime

    WORKDIR /pipeline

    COPY requirements.txt .
    COPY *.py ./

    RUN apt-get update \
        && apt-get install -y --no-install-recommends g++ \
        && apt-get install -y curl \  # この行を追加
            python3.7 \  # この行を追加
            python3-distutils \  # この行を追加
        && rm -rf /var/lib/apt/lists/* \
        # Install the pipeline requirements and check that there are no conflicts.
        # Since the image already has all the dependencies installed,
        # there's no need to run with the --requirements_file option.
        && pip install --no-cache-dir --upgrade pip \
        && pip install --no-cache-dir -r requirements.txt \
        && pip check

    # Set the entrypoint to Apache Beam SDK worker launcher.
    COPY --from=apache/beam_python3.8_sdk:2.38.0 /opt/apache/beam /opt/apache/beam
    ENTRYPOINT [ "/opt/apache/beam/boot" ]
    ```

## GPU使用時のオプション

DataflowでGPUを使用する際には、実行時に以下のようなオプションを追加で指定する必要があります。

|オプション名|説明|
|:----|:----|
|sdk_container_image|使用するコンテナイメージの名前。|
|disk_size_gb|各ワーカー VM のブートディスクのサイズ|
|experiments|Dataflow Runner v2を使用するかやGPUのタイプ・個数、Nvidiaドライバをインストールするかを指定する際に使用。具体的な使い方は下の例を参照。|

`experiments`オプションに関しては次のように指定します。下の例のように複数個に分けて指定してもOKです。

```bash
--experiments "worker_accelerator=type:nvidia-tesla-t4;count:1;install-nvidia-driver" \
--experiments "use_runner_v2"
```

# Dataflowの使用例（GPUありver.）

ここでは、PyTorchのモデルの推論をDataflow上で行う例を扱っていきます。今回はMNISTデータセットで学習したモデルの重みパラメータ(`mnist_epoch_10.pth`)が既に手元にあるという想定で、そのモデルの推論（MNISTのテスト用データセットを使用）をDataflow上で行っていきます。以下のような手順で進めていきます。

1. ソースコードの準備
2. Dockerコンテナイメージの作成
3. Cloud ShellでPythonの環境構築
4. パイプラインの実行

なお、[APIの有効化](#apiの有効化)、[IAMの設定](#iamの設定)、[Cloud Storageバケットの作成](#cloud-storageバケットの作成)がお済みでない方はまずそちらから始めてください。

## ソースコードの準備

今回実行したいソースコード(ファイル名:`runinference_pytorch.py`)です。

```python runinference_pytorch.py
import logging

import apache_beam as beam
from apache_beam.ml.inference.base import RunInference
from apache_beam.ml.inference.pytorch_inference import PytorchModelHandlerTensor
from apache_beam.options.pipeline_options import PipelineOptions
from google.cloud import storage
from torchvision import datasets, transforms

from pytorch_MNIST import MNIST_Model


def upload_model_to_gcs(local_model_path, gcs_model_path, project_name, bucket_name):
    client = storage.Client(project_name)
    bucket = storage.Bucket(client)
    bucket.name = bucket_name
    blob = bucket.blob(gcs_model_path)
    blob.upload_from_filename(local_model_path)


if __name__ == "__main__":
    # パイプラインオプションの設定
    pipeline_options = PipelineOptions()
    options_dict = pipeline_options.display_data()

    # データセットの準備
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307), (0.3081), inplace=True)
    ])
    test_dataset = datasets.MNIST(
        root="./data/",
        train=False,
        transform=transform,
        download=True
    )

    # モデルのアップロード
    upload_model_to_gcs(
        local_model_path="./models/pytorch_models/mnist_epoch_10.pth",
        gcs_model_path="models/pytorch_models/mnist_epoch_10.pth",
        project_name=options_dict["project"],
        bucket_name=options_dict["bucket_name"]
    )

    # ハンドラーの設定
    model_handler = PytorchModelHandlerTensor(
        state_dict_path="gs://{}/models/pytorch_models/mnist_epoch_10.pth".format(options_dict["bucket_name"]),
        model_class=MNIST_Model,
        model_params={},
        device="GPU"
    )

    # パイプライン実行
    logging.getLogger().setLevel(logging.INFO)
    with beam.Pipeline(options=pipeline_options) as p:
        data = p | "read" >> beam.Create(test_dataset)
        test = (
            data
            | "extract image" >> beam.Map(lambda x: x[0])
            | "inference" >> RunInference(model_handler)
            | beam.io.WriteToText(options_dict["output_executable_path"], shard_name_template="")
        )

```

モデルの構造を定義したコード(ファイル名:`pytorch_MNIST.py`)です。

```python pytorch_MNIST.py
from torch import nn


class MNIST_Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.feature = nn.Sequential(
            nn.Conv2d(1, 3, 3, padding=1),
            nn.MaxPool2d(2, 2),
            nn.ReLU(True),
            nn.Conv2d(3, 3, 3, padding=1),
            nn.MaxPool2d(2, 2),
            nn.ReLU(True)
        )
        self.classifier = nn.Sequential(
            nn.Linear(147, 128),
            nn.ReLU(True),
            nn.Linear(128, 10)
        )

    def forward(self, x):
        x = self.feature(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x
```

これらのソースコードはCloud Shellの同一のディレクトリに置いてください。また、モデルの重みパラメータまでのパスは`{ソースコードがあるディレクトリ}/models/pytorch_models/mnist_epoch_10.pth`です。

## Dockerコンテナイメージの作成

続いて、Dockerイメージを準備していきます。[PyTorch用の最小イメージ](https://github.com/GoogleCloudPlatform/python-docs-samples/tree/main/dataflow/gpu-examples/pytorch-minimal)からファイルをダウンロード後、それらのファイルをソースコードと同一のディレクトリに置きます。続いてDockerfileを以下のように変更します。

```Dockerfile Dockerfile
FROM pytorch/pytorch:1.9.1-cuda11.1-cudnn8-runtime

WORKDIR /pipeline

COPY requirements.txt .
COPY *.py ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ \
    && apt-get install -y curl \  # この行を追加
        python3.7 \  # この行を追加
        python3-distutils \  # この行を追加
    && rm -rf /var/lib/apt/lists/* \
    # Install the pipeline requirements and check that there are no conflicts.
    # Since the image already has all the dependencies installed,
    # there's no need to run with the --requirements_file option.
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip check

# Set the entrypoint to Apache Beam SDK worker launcher.
COPY --from=apache/beam_python3.8_sdk:2.38.0 /opt/apache/beam /opt/apache/beam
ENTRYPOINT [ "/opt/apache/beam/boot" ]
```

その後、コンテナイメージをContainer Registryに保存するために以下のコマンドを実行します。

```bash
gcloud builds submit --config build.yaml
```

コンテナイメージ名は`samples/dataflow/pytorch-gpu:latest`で保存されます。

## Cloud ShellでPythonの環境構築

次にCloud ShellのPython環境を構築していきます。
まず、Python 3.7の環境を準備します。ターミナル上で

```bash
pyenv install 3.7.13
```

を実行し、Python 3.7をインストールします。その後、

```bash
pyenv virtualenv 3.7.13 dataflow_gpu
pyenv activate dataflow_gpu
```

を実行してPython 3.7.13がインストールされた仮想環境（ここでは`dataflow_gpu`）をアクティベートします。
続いて、必要なパッケージをインストールしていきます。

```bash
pip3 install apache-beam[gcp] google-gcloud-storage
pip3 install torch torchvision
```

## パイプラインの実行

必要なパッケージのインストールが終わったら、最後にパイプラインを実行していきます。
以下のコマンドを実行するとDataflow上でパイプライン処理が動き始めます。`{プロジェクトID}`、`{ジョブの名前}`、`{バケットの名前}`は適宜変更してください。

```bash
python runinference_pytorch.py \
--runner "DataflowRunner" \
--project "{プロジェクトID}" \
--job_name "{ジョブの名前}" \
--temp_location "gs://{バケットの名前}/temp/" \
--staging_location "gs://{バケットの名前}/stage/" \
--region "asia-northeast1" \
--bucket_name "{バケットの名前}" \
--output "gs://{バケットの名前}/output.txt" \
--sdk_container_image "gcr.io/{プロジェクトID}/samples/dataflow/pytorch-gpu:latest" \
--disk_size_gb 50 \
--experiments "worker_accelerator=type:nvidia-tesla-t4;count:1;install-nvidia-driver" \
--experiments "use_runner_v2"
```

## 結果

推論結果はCloud Storageのバケットの`output.txt`に出力されます。今回の例では以下のような結果が得られました。

```text output.txt
tensor([ -8.2468,  -2.1803,  -9.8459,   1.3747,   2.4845,  -5.6996, -18.9429,
          3.0085,  -5.7692,  12.0357], requires_grad=True)
tensor([ -5.9876, -14.5651,  -7.3873,   8.2820,  -6.1497,   1.6121, -18.5136,
         -9.5785,   1.7698,  12.8093], requires_grad=True)
tensor([  9.2505,  -1.7219,  -2.7147,  -3.9045, -10.8319,  -1.9610,   2.5355,
         -8.6489,  -3.3169,  -6.9540], requires_grad=True)
tensor([-8.1391, -0.9647, -6.3984,  2.4964, -0.9498,  1.4407, -8.2989, -3.1957,
         2.5867,  2.6507], requires_grad=True)
tensor([-7.6571, -2.4950, -5.2014, -1.6730, 10.1947, -7.5948, -9.2541,  0.5039,
        -2.6531,  7.1487], requires_grad=True)
tensor([ -5.8362,  12.8431,  -4.1835,  -8.8176,  -6.0804, -10.7981,  -6.2982,
         -0.1830,  -1.4379,  -4.4298], requires_grad=True)
tensor([-4.6527, -7.1966, -8.8277, -7.4921,  6.7380, -4.9899, -0.2908, -4.7030,
         2.0198,  2.2414], requires_grad=True)
tensor([-9.9818, -9.7239, -4.4335, -2.8926,  7.8835,  1.4599, -1.7376, -6.2337,
        -0.9638, -0.7414], requires_grad=True)
tensor([ -3.8291,  -2.5081,  16.6454,   6.6208,  -7.5311, -10.9999, -13.9144,
         -5.1685,   2.5498,  -7.2168], requires_grad=True)
...
```

# 他のGCPサービスとの連携とストリーミング処理

最後に、Pub/Subからリアルタイムにデータを取得→Dataflowでデータ処理→結果をBigQueryに書き出す例を紹介します。
今回はIrisデータセットの各サンプルを10秒間隔でPub/SubにPublishし、[Dataflowの使用例（GPUなしver.）](#dataflowの使用例gpuなしver)で行ったscikit-learnモデルを用いた推論をストリーミング処理でDataflow上で行い、その結果をBigQueryに書き出します。今回もIrisデータセットで学習したモデルの重みパラメータ(`SVC_iris.pkl2`)が既に手元にあるという想定で、以下のような手順で進めていきます。

1. ソースコードの準備
2. Pub/Sub・BigQueryの準備
3. パイプラインの実行

なお、[APIの有効化](#apiの有効化)、[IAMの設定](#iamの設定)、[Cloud Storageバケットの作成](#cloud-storageバケットの作成)がお済みでない方はまずそちらから始めてください。

## ソースコードの準備

今回実行したいソースコード(ファイル名:`predict_iris_dataflow_pubsub2bq.py`)です。
モデルの重みパラメータまでのパスは`{ソースコードがあるディレクトリ}/models/sklearn_models/SVC_iris.pkl2`です。

```python predict_iris_dataflow_pubsub2bq.py
import json
import logging

import apache_beam as beam
from apache_beam.ml.inference import RunInference
from apache_beam.ml.inference.sklearn_inference import ModelFileType, SklearnModelHandlerNumpy
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions
from google.cloud import storage


def upload_model_to_gcs(local_model_path, gcs_model_path, project_name, bucket_name):
    client = storage.Client(project_name)
    bucket = storage.Bucket(client)
    bucket.name = bucket_name
    blob = bucket.blob(gcs_model_path)
    blob.upload_from_filename(local_model_path)


if __name__ == "__main__":
    # パイプラインオプションの設定
    options = PipelineOptions()
    options_dict = options.display_data()
    options.view_as(StandardOptions).runner = "DataflowRunner"
    options.view_as(StandardOptions).streaming = True

    # モデルのアップロード
    upload_model_to_gcs(
        local_model_path="./models/sklearn_models/SVC_iris.pkl2",
        gcs_model_path="models/sklearn_models/SVC_iris.pkl2",
        project_name=options_dict["project"],
        bucket_name=options_dict["bucket_name"]
    )

    # ハンドラーの設定
    model_uri = "gs://{}/models/sklearn_models/SVC_iris.pkl2".format(options_dict["bucket_name"])
    model_file_type = ModelFileType.JOBLIB
    model_handler = SklearnModelHandlerNumpy(model_uri=model_uri, model_file_type=model_file_type)

    topic = "projects/{}/topics/{}".format(options_dict["project"], options_dict["topic_name"])

    # パイプライン実行
    logging.getLogger().setLevel(logging.INFO)
    with beam.Pipeline(options=options) as p:
        raw_data = (
            p
            | "ReadFromPub/Sub" >> beam.io.ReadFromPubSub(topic)
            | "Decode" >> beam.Map(lambda x: x.decode())
            | "StrToDict" >> beam.Map(json.loads)
        )

        inference = (
            raw_data
            | "ExtractFeature" >> beam.Map(lambda x: x["feature"])
            | "RunInference" >> RunInference(model_handler)
        )

        write2bq = (
            inference
            | "ConvertToBigQueryFormat" >> beam.Map(lambda x: {
                "input": {
                    "sepal_length": x[0][0],
                    "sepal_width": x[0][1],
                    "petal_length": x[0][2],
                    "petal_width": x[0][3]
                },
                "predict": x[1].item()
            })
            | "WriteToBigQuery" >> beam.io.WriteToBigQuery(table=options_dict["table_name"], dataset=options_dict["dataset_name"])
        )
```

また、Irisデータセットの各サンプルを10秒間隔でPub/SubにPublishにするためのコード（ファイル名:`publish_iris_local2pubsub.py`）です。

```python publish_iris_local2pubsub.py
import argparse
import json
import time

from google.cloud import pubsub
from sklearn.datasets import load_iris

parser = argparse.ArgumentParser()
parser.add_argument("--project", required=True)
parser.add_argument("--topic_name", required=True)

args = parser.parse_args()

if __name__ == "__main__":
    data = load_iris()
    feature = data.data
    target = data.target

    publisher = pubsub.PublisherClient()
    topic_path = publisher.topic_path(args.project, args.topic_name)

    for i, (f, t) in enumerate(zip(feature, target)):
        f_t_dict = {"id": i, "feature": f.tolist(), "target": t.item()}
        message = json.dumps(f_t_dict)
        print(message)
        b_message = message.encode()
        publisher.publish(topic_path, b_message)
        time.sleep(10)
```

## Pub/Sub・BigQueryの準備

まず、Pub/Subのトピック作成から始めていきます。Pub/Subのページ上部にある「トピックを作成」から、トピックIDを設定してトピックを作成します。そのほかの設定に関しては今回はデフォルトのままで大丈夫です。
<img src="/images/2022/20220920b/make_topic.png" alt="make_topic.png" width="1200" height="691" loading="lazy">

続いて、BigQueryのデータセット・テーブルの作成に入ります。BigQueryのデータセット・テーブルは以下のようにして作成できます。
<img src="/images/2022/20220920b/make_dataset.gif" alt="make_dataset.gif" width="1200" height="675" loading="lazy">

なお、今回使用しているスキーマは以下の通りです。

```json
[
    {
        "name": "input",
        "type": "RECORD",
        "mode": "NULLABLE",
        "fields": [
            {
                "name": "sepal_length",
                "type": "FLOAT",
                "mode": "NULLABLE"
            },
            {
                "name": "sepal_width",
                "type": "FLOAT",
                "mode": "NULLABLE"
            },
            {
                "name": "petal_length",
                "type": "FLOAT",
                "mode": "NULLABLE"
            },
            {
                "name": "petal_width",
                "type": "FLOAT",
                "mode": "NULLABLE"
            }
        ]
    },
    {
        "name": "predict",
        "type": "INTEGER",
        "mode": "NULLABLE"
    }
]
```

## パイプラインの実行

続いて、パイプラインの実行に移ります。以下のコマンドを実行するとパイプラインが動き始めます。`{プロジェクトID}`、`{ジョブの名前}`、`{バケットの名前}`、`{テーブルの名前}`、`{データセットの名前}`、`{トピックの名前}`は適宜変更してください。今回はRunnerおよびストリーミング処理のオプションはコード内で記述しているためコマンドライン引数から渡す必要はありません。ストリーミング処理をコマンドラインから有効化したい場合は、`--streaming`を加えるとできます。

```bash
python predict_iris_dataflow_pubsub2bq.py \
--project "{プロジェクトID}" \
--job_name "{ジョブの名前}" \
--temp_location "gs://{バケットの名前}/temp/" \
--staging_location "gs://{バケットの名前}/stage/" \
--region "asia-northeast1" \
--bucket_name "{バケットの名前}" \
--table_name "{テーブルの名前}" \
--dataset_name "{データセットの名前}" \
--topic_name "{トピックの名前}"
```

これでパイプラインが実行されます。

パイプラインのジョブが動き始めたら、以下のコマンドで、Irisデータセットの各サンプルをPublishしていきます。なお、PythonファイルからPub/SubにPublishする際にはサービスアカウントキー作成する必要があります。`IAMと管理→サービスアカウント`からサービスアカウントキーを含むjsonファイルを作成し

```bash
export GOOGLE_APPLICATION_CREDENTIALS="{jsonファイルまでのpath}"
```

で、PythonファイルからPub/SubにPublishできるようになります。それが終わったら

```bash
python publish_iris_local2pubsub.py \
--project "{プロジェクトID}" \
--topic_name "{トピックの名前}"
```

を実行して、Pub/Subに10秒間隔でデータを送ります。

## 結果

BigQueryの画面からクエリを実行して結果を確認します。クエリは下図の赤枠の部分を順にクリックして
<img src="/images/2022/20220920b/make_query.png" alt="make_query.png" width="702" height="486" loading="lazy">

開いたエディタに

```SQL
SELECT * FROM `{プロジェクトID}.{データセットの名前}.{テーブルの名前}` LIMIT 1000
```

を入力して実行します。

今回の例では以下のような結果が得られました。
<img src="/images/2022/20220920b/pubsub2bq_result.png" alt="pubsub2bq_result" width="1164" height="822" loading="lazy">

# 最後に

今回のインターンで扱わせていただいたDataflowは、なかなか個人で扱う機会がない一方で、ビジネスの場面ではとても需要のあるサービスです。そのようなものを扱う機会を頂けたことは今回のインターンに参加してよかったと思えることの１つです。また、私は今まで技術ブログを書いた経験がなかったため、今回のインターンで、学んだことを言語化しまとめることの難しさを知ることができました。

そのほかにも、インターンではSAIG（フューチャーのAIチーム）の進捗報告会に参加させていただき、さまざまなプロジェクトの存在、各プロジェクトの進め方、各プロジェクトの難しさなど実際の仕事の現場を体験できました。また、インターンのイベントの一環である社員の方にインタビューをさせていただき、そこでは専門分野の勉強の進め方、AIのトレンドのキャッチアップのやり方を教えていただきました。

今回のインターンでは本当に多くのことを学ばせていただきました。受け入れ先プロジェクトの方々やフューチャーHRの皆さん、本当にありがとうございました！

# 参考

* [Apache Beam (Dataflow) 実践入門【Python】](https://qiita.com/esakik/items/3c5c18d4a645db7a8634)
* [How Beam executes a pipeline (公式ドキュメント)](https://beam.apache.org/documentation/runtime/model/)
* [Python を使用して Dataflow パイプラインを作成する](https://cloud.google.com/dataflow/docs/quickstarts/create-pipeline-python)
* [GPUの使用](https://cloud.google.com/dataflow/docs/guides/using-gpus)

アイキャッチは<a href="https://pixabay.com/ja/users/paulbr75-2938186/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=2471293">Paul Brennan</a>による<a href="https://pixabay.com/ja//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=2471293">Pixabay</a>からの画像です。
