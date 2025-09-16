---
title: "Kubernates✖️MLflow✖️GCPで簡単にAIモデル公開"
date: 2025/07/01 00:00:00
postid: a
tag:
  - CNCF
  - MLflow
  - MLOps
  - GoogleCloud
  - Minikube
category:
  - DataScience
thumbnail: /images/2025/20250701a/thumbnail.png
author: 大前七奈
lede: "機械学習モデルを本番環境で運用する際、スケーラビリティや管理のしやすさは重要です。MLflowのFastAPIによるデプロイは手軽ですが、大規模運用には不向きな場合があります。本記事では、MLflowで管理されたモデルを、Kubernetes上で動作する高機能なMLモデルサービング基盤KServeにデプロイする方法を解説します。"
---
<img src="/images/2025/20250701a/image.png" alt="image.png" width="1200" height="449" loading="lazy">

こんにちは！Energy Transformation Groupの大前七奈です。

機械学習モデルを本番環境で運用する際、スケーラビリティや管理のしやすさは重要です。MLflowのFastAPIによるデプロイは手軽ですが、大規模運用には不向きな場合があります。

本記事では、MLflowで管理されたモデルを、Kubernetes上で動作する高機能なMLモデルサービング基盤KServeにデプロイする方法を解説します。ローカル環境でKubernetesを簡単に扱えるminikubeを用いた構築手順から、Google Kubernetes Engine (GKE) へのデプロイ、さらにはCI/CDへの応用まで、実践的なMLOpsの構築方法を詳しく紹介します。

# バージョン

本記事で利用を想定しているツールのバージョンは以下の通りです。

- [minikube](https://minikube.sigs.k8s.io/docs/): v1.36.0
- [mlflow](https://mlflow.org/docs/latest/ml/): v3.1.1
- [kserve](https://github.com/kserve/kserve): v0.13.0

# なぜFastAPIでなく、Kubernates?

MLflowの公式サイトでも以下のように書かれています。

>MLflow provides an easy-to-use interface for deploying models within a FastAPI-based inference server. You can deploy the same inference server to a Kubernetes cluster by containerizing it using the mlflow models build-docker command. However, this approach may not be scalable and could be unsuitable for production use cases. FastAPI is not designed for high performance and scale (why?), and also manually managing multiple instances of inference servers is backbreaking.

端的にいうと、**MLflowのFastAPIによるモデルデプロイは手軽ですが、本番環境には不向きです。FastAPIは大規模な利用を想定しておらず、スケーラビリティやサーバー管理に課題があるためです。**

# minikubeとKubernatesの関係

Kubernates (k8s) は、コンテナ化されたアプリケーションのデプロイ、スケーリング、管理を自動化するためのオープンソースプラットフォームです。本番環境で広く使われていますが、学習や開発のために手元で動かすには、セットアップが複雑です。

そこで登場するのが minikube です。minikubeは、自分のPC（Windows, macOS, Linux）上に、仮想的に単一ノードのKubernatesクラスタを簡単に構築できるツールです。Kubernatesの機能を学習したり、アプリケーションをデプロイしてテストしたりするのに最適です。つまり、<strong>「minikubeは、Kubernatesを手軽に試すためのローカル環境構築ツール」</strong>だと理解すると分かりやすいでしょう。

# スケーラブルにモデル公開できるのがKserve

KServeはKubernetes上で動作する、本番環境向けの高度なMLモデルサービング基盤です。サーバーレスでの自動スケールやカナリアリリースといった機能を提供し、単純なデプロイ方法では難しい拡張性や安定性を実現します。

前項で話したMLflowの標準デプロイ機能は本番の大規模な負荷には向いていませんので、そこで、MLflowでバージョン管理されたモデルを、本番のサービング基盤としてKServeにデプロイするという連携が極めて有効です。これにより、開発・管理はMLflow、本番運用はKServeと、両者の強みを活かした堅牢なMLOpsを構築できます。

以下は本番環境のGKEにデプロイしたあとの利用されるイメージです。

<img src="/images/2025/20250701a/image_2.png" alt="image.png" width="720" height="431" loading="lazy">

# 構築手順(MacOS版)

## 1. PCにツールをインストール

```sh install.sh
brew install minikube  # クラスタ構築用
brew install kubectl  # Kubernates操作用
```

## 2. pipでmlflowをインストール

```sh install.sh
pip install mlflow
```

## 3. ベストモデルの訓練後、MLserverでローカルテスト

GCPで訓練する場合、直接にステップ５へ飛ばしていただいてOKです。

```sh serve.sh
# ローカルのPort1234で推論サーバーを立ち上げる
mlflow models serve -m models:/{my_model_id} -p 1234 --enable-mlserver

# テスト
curl -X POST -H "Content-Type:application/json" --data '{"inputs": [[14.23, 1.71, 2.43, 15.6, 127.0, 2.8, 3.06, 0.28, 2.29, 5.64, 1.04, 3.92, 1065.0]]}' http://127.0.0.1:1234/invocations

{"predictions": [-0.03416275504140387]}
```

## 3. ローカルクラスタにkserveをインストール

```sh
minikube start
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.13.0/kserve.yaml
```

::: note warn
注意

公式サイトではkindを利用してインストールすることをすすめしていますが、今回minikube上で動かすには、minikubeの作法に合わせた手順（例えば、minikubeのDockerデーモンを利用してイメージをビルドする、またはyamlで構築するなど）に読み替える必要がありました。
:::

## 4. ローカルDockerとminikubeでテストデプロイ

KServeにモデルをデプロイするための定義ファイル（マニフェスト）を用意します。以下がDockerを利用したときの書き方となります。

```yaml inferenceservice.yaml（ローカルDocker用）
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "my-model"
  namespace: "mlflow-kserve-test"
spec:
  predictor:
    containers:
      - name: "my-model"
        image: "{docker_user_name}/my-model"
        ports:
          - containerPort: 8080
            protocol: TCP
        env:
          - name: PROTOCOL
            value: "v2"
```

以下のコマンドでデプロイできます。

```sh deploy_docker.sh
# イメージをビルド、Dockerにプッシュする
mlflow models build-docker -m models:/{my_model_id} -n my-model --enable-mlserver
docker push my-model

# kubectlの接続先を確認
kubectl config current-context
> minikube

# ローカルminikubeで定義ファイルを適用する
kubectl create namespace mlflow-kserve-test
kubectl apply -f inferenceservice.yaml -n mlflow-kserve-test

# エンドポイントのURLを確認
kubectl get inferenceservice mlflow-model -n mlflow-kserve-test
```

## 5. GCSにアップロード、Google Kubernate Engine(GKE)へデプロイ

CLI経由してGKEにも直接にデプロイできます。Kserve定義ファイルの書き方は少々先のものと異なります。

```yaml inferenceservice.yaml（GCP用）
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "my-model"
  namespace: "mlflow-kserve-test"
spec:
  predictor:
    model:
      modelFormat:
        name: mlflow
      protocolVersion: v2
      storageUri: "gs://{gcp_project_id}-models/artifacts"
```

定義ファイルを用意できましたら、必要なモデルArtifactをGcloud Storageにアップロードし、デプロイします。GKEがGCSからモデルをダウンロードして推論サーバーを構築してくれます。

```sh deploy_gke.sh
# MLflowで生成されたモデルartifactsをGCSにアップロード
gsutil cp -r models/{model_id} gs://{gcp_project_id}_mlflow_models/

# GKEクラスタを作成
gcloud container clusters create my-model
> Creating cluster my-model in asia-northeast1-a... Cluster is being configured...⠏

# Kserveをインストールする
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.13.0/kserve.yaml

# kubectlの接続先を確認
kubectl config current-context
> gke_research-426801_asia-northeast1-a_my-model

# GKEで定義ファイルを適用する
kubectl create namespace mlflow-kserve-test
kubectl apply -f inferenceservice.yaml -n mlflow-kserve-test

# エンドポイントのURLを確認
kubectl get inferenceservice mlflow-model -n mlflow-kserve-test
```

::: note info
もし、gke-gcloud-auth-pluginがないと怒られたら、```gcloud components install gke-gcloud-auth-plugin```でインストールしましょう。それでも怒られたら、gcloud sdkのパスが通っていない可能性あるので、```export PATH="/path/to/google-cloud-sdk/bin:$PATH"```でパスを通してあげましょう。
:::

以上がデプロイの流れとなりました！

さらなる発展として、```deploy_gke.sh```のbashスクリプトを、GitHub actionsに組み込めば、リポジトリに新しいモデルがプッシュされたら、自動でGCSにアップロードされ、KServeにデプロイされます。これは、MLOpsにおけるCI/CD（継続的インテグレーション/継続的デリバリー）の基本的な流れです。

# あとがき

前職(メーカのデータサイエンティスト)の経験上、モデルのバージョン管理やデプロイ管理が非常に煩雑な印象でしたが、記事を通じてMLflowのモデル管理ダッシュボードの便利さ・kubernateへのデプロイドの手軽さなどMLOps周りのエコシステムをしっかり体感できて感動しました。

また、現在主にデータ基盤構築プロジェクトのアーキテクトとしてつとめていますが、データを使ってモデルを構築したあとのMlOpsを触る機会がなく、今回記事を書かせてもらうのを機に、触りたかったGKEを触れてとても大満足でした。今回の記事は、書き手にとってブログ記事を書く価値と意義を改めて体感できた一本です。

# 番外編

## 番外編１：minikubeとkind：なにか違うの？

kind (Kubernetes IN Docker) もminikubeと同様にローカルでKubernatesクラスタを構築するツールですが、いくつかの違いがあります。

|特徴|minikube  |kind|
|---|---|---|
|主な用途|開発、学習、Kubernatesの機能を試す  |CI/CDパイプラインでのテスト、マルチノードクラスタのシミュレーション  |
|仕組み|仮想マシン（Hyper-V, VirtualBoxなど）またはDockerコンテナ上にクラスタを構築  |各ノードをDockerコンテナとして実行  |
|手軽さ|ダッシュボードやIngressなどのアドオンが豊富で、コマンド一つで有効化できるため、初心者にも扱いやすい  |よりKubernatesのコアな機能に近く、設定の自由度が高い。CI環境での利用実績が豊富  |

## 番外編２：kubeflowとMLflow：なにか違うの？

どちらもMLOps（機械学習基盤）のための強力なツールですが、スコープと目的が異なります。

||MLflow|kubeflow|
|---|---|---|
|用途|「機械学習のライフサイクル管理」に特化したツール|「Kubernates上でMLワークフローを構築・実行するための総合プラットフォーム」|
|機能|「実験の追跡（Tracking）」「モデルのパッケージング（Projects）」「モデルの管理・共有（Models）」「モデルのデプロイ」|データの準備、モデルのトレーニング、パイプラインの構築、モデルのサービングまで|
|特徴|特定のプラットフォームに依存せず、軽量で導入しやすいのが特徴です。個人や小規模チームでの実験管理から始めるのに最適|MLflowをコンポーネントとして内包することも可能です。大規模でスケーラブルな本番環境をKubernatesで構築する場合に適する|

一言でいうと、MLflowが「実験とモデル」の管理ツールであるのに対し、Kubeflowは「ML全体のワークフロー」をKubernates上で動かすための基盤です。 今回の構成では、Kubernates上でモデルをサービングする部分にKServeを使い、モデル管理の部分でMLflowの思想を取り入れています。

# 参考記事

- [Develop ML model with MLflow and deploy to Kubernetes | MLflow](https://mlflow.org/docs/latest/ml/deployment/deploy-model-to-kubernetes/tutorial#step-6-test-model-serving-locally)
- [Kubeflow: How to Install and Launch Kubeflow on your Local Machine | Towards Data Science](https://towardsdatascience.com/kubeflow-how-to-install-and-launch-kubeflow-on-your-local-machine-e0d7b4f7508f/)
- [TensorFlow Extended、Vertex AI Pipelines、Cloud Build を使用した MLOps のアーキテクチャ](https://cloud.google.com/architecture/architecture-for-mlops-using-tfx-kubeflow-pipelines-and-cloud-build)
- [Kserve | GKE AI Labs](https://gke-ai-labs.dev/docs/tutorials/inference-servers/kserve/)
