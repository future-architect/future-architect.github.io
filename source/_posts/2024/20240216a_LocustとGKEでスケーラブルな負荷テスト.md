---
title: "LocustとGKEでスケーラブルな負荷テスト"
date: 2024/02/16 00:00:00
postid: a
tag:
  - GKE
  - GoogleCloud
  - 負荷テスト
category:
  - Infrastructure
thumbnail: /images/2024/20240216a/thumbnail.png
author: 岸下優介
lede: "負荷テストツールであるLocustとGKEを組み合わせて負荷テストを体感します。Kubernetesの柔軟なスケールアップ・ダウン能力によって、負荷の大きさを変えながらテストを行うことが可能となります。"
---
## はじめに

本記事では、負荷テストツールである[Locust](https://locust.io/)と[Google Kubernetes Engine(GKE)](https://cloud.google.com/kubernetes-engine?hl=ja)と組み合わせて負荷テストを体感します。Kubernetesの柔軟なスケールアップ・ダウン能力によって、負荷の大きさを変えながらテストを行うことが可能となります。

参考：[Google Kubernetes Engineを使用した負荷分散テスト](https://cloud.google.com/architecture/distributed-load-testing-using-gke?hl=ja)

## Locustとは

[Locust](https://locust.io/)はPythonベースで書かれたオープンソースの負荷テストツールとなります。
GitHub: https://github.com/locustio/locust

公式ページにも載っておりますが、特徴としては以下の3つになります。

- コードに基づいたユーザー挙動の定義
  - ダサいUIや膨れ上がったXMLは必要無し
  - コードのみのわかりやすい記述が可能
- 分散型でスケーラブル
  - 複数のマシンに分散された負荷テストの実行をサポート
  - 数百万の同時ユーザーによるシミュレーションが可能
- 歴戦の覇者（battle-tested）で実績がある
  - GoogleやMicrosoft、AWSといった多くのユーザー（会社）がLocustを支持
  - Battlefield[^1]の戦績確認用Webアプリ開発時に負荷テストとして利用されたため、本当の意味でbattle-tested🤣

## 構築

では早速、検証を行うための環境を構築していきます。必要なものは以下です。

- Google Cloud環境
  - GKE
  - AppEngine
  - Artifact Registry
- ローカル環境
  - gcloud
  - kubectl

インフラ側は全てTerraformを利用して構築しようと思います。
※ProjectやVPCの構築、gcloud、kubectlのインストールは割愛します。

### GKE

GKEのTerraformコードは量が多いため、以下のリポジトリに配置しました。
https://github.com/bigface0202/terraform-useful-modules/tree/main/google-cloud
また、GKEを利用した検証に関するTIPSになりますが、GKEは立ち上げるまでに約20分少々かかるため、一番最初にGKEを構築しておくと検証がスムーズになります。

### AppEngine

<details><summary>Terraform</summary>

```sh app_engine.tf
resource "google_app_engine_application" "app" {
  project     = google_project.project_one.project_id
  location_id = "asia-northeast1"
}
```

</details>

### Artifact Registry

<details><summary>Terraform</summary>

```sh artifact_registry.tf
resource "google_artifact_registry_repository" "my-repo" {
  project       = google_project.project_one.project_id
  location      = local.region
  repository_id = "my-repository"
  description   = "example docker repository"
  format        = "DOCKER"
}
```

</details>

### デプロイ

ここからはターミナルでの作業がメインとなるため、頻繁に利用する定数などを定義しておきます。適宜、自身で定義した内容に変更してください。

```shell terminal
export PROJECT=test-project
export REGION=asia-northeast1
export AR_REPO=my-repository
export LOCUST_IMAGE_NAME=locust-tasks
export LOCUST_IMAGE_TAG=latest
export SAMPLE_APP_TARGET=${PROJECT}.appspot.com
export GKE_CLUSTER_NAME=my-cluster
```

AppEngineにデプロイするアプリケーションはGoogle Cloudが提供するサンプルアプリを利用します。

```bash terminal
# Clone the repository
git clone https://github.com/GoogleCloudPlatform/distributed-load-testing-using-kubernetes
cd distributed-load-testing-using-kubernetes

# Deploy the application
gcloud app deploy sample-webapp/app.yaml --project=${PROJECT}
```

App Engineへのデプロイが完了後、表示されたURLへ移動すると以下のような画面が表示されます。

<img src="/images/2024/20240216a/image.png" alt="image.png" width="1084" height="283" loading="lazy">
<AppEngineの画面>

次にGKEにLocustと負荷テスト用のタスクをデプロイしたいので、まずはLocustのイメージをビルドします。
各エンドポイント`/login`と`/metrics`に対して、1:999の割合で呼び出すようなタスクが定義されております。詳細は以下を参照してください。
[docker-image/locust-tasks/tasks.py](https://github.com/GoogleCloudPlatform/distributed-load-testing-using-kubernetes/blob/HEAD/docker-image/locust-tasks/tasks.py)

```bash terminal
gcloud builds submit \
    --tag ${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPO}/${LOCUST_IMAGE_NAME}:${LOCUST_IMAGE_TAG} \
    docker-image
```

Cloud Buildを利用することでイメージのビルドとプッシュがgcloudコマンド1回でできるので便利ですね。
イメージがちゃんとビルドできているかどうかをコンソールから確認してみましょう。
<img src="/images/2024/20240216a/image_2.png" alt="image.png" width="1200" height="465" loading="lazy">

イメージのビルドができたのでデプロイしていきます。

```bash terminal
# Get cluster's credential
gcloud container clusters get-credentials ${GKE_CLUSTER} --region ${REGION} --project ${PROJECT}

# Check the connection
kubectl get nodes
# Expected output below
# NAME                                                  STATUS   ROLES    AGE    VERSION
# gke-test-gke-cluster-test-gke-node-po-2165d20a-gztn   Ready    <none>   6m6s   v1.27.3-gke.100
# gke-test-gke-cluster-test-gke-node-po-7c71f952-7tvz   Ready    <none>   6m4s   v1.27.3-gke.100
# gke-test-gke-cluster-test-gke-node-po-f80380d5-4209   Ready    <none>   6m5s   v1.27.3-gke.100

# Deploy Locust
envsubst < kubernetes-config/locust-master-controller.yaml.tpl | kubectl apply -f -
envsubst < kubernetes-config/locust-worker-controller.yaml.tpl | kubectl apply -f -
envsubst < kubernetes-config/locust-master-service.yaml.tpl | kubectl apply -f -

# Check the deployment
kubectl get pods
# Expected output below
# NAME                             READY   STATUS    RESTARTS   AGE
# locust-master-849c6b8799-j8hqt   1/1     Running   0          8m59s
# locust-worker-5466444784-8c474   1/1     Running   0          8m48s
# locust-worker-5466444784-b42l9   1/1     Running   0          8m53s
# locust-worker-5466444784-msw66   1/1     Running   0          8m45s
# locust-worker-5466444784-prrwg   1/1     Running   0          8m53s
# locust-worker-5466444784-rntx6   1/1     Running   0          8m53s
```

初めて`envsubst`コマンドを知ったのですが、ターミナル上で定義済みの環境変数を代入出来て便利ですね。
無事にLocustをデプロイできたので、ポートフォワードして画面に接続してみます。

```bash terminal
kubectl port-forward svc/locust-master-web -n default 8080:8089
# Expected output below
# Forwarding from 127.0.0.1:8080 -> 8089
# Forwarding from [::1]:8080 -> 8089
```

http://127.0.0.1:8080/
にアクセスして、以下の画面が表示されることを確認します。
<img src="/images/2024/20240216a/image_3.png" alt="image.png" width="1200" height="709" loading="lazy">

## 負荷テストしてみる

"Number of users"は負荷テストに利用するユーザーの同時接続数、"Spawn rate"は1秒当たりに何人のユーザーがリクエストを開始するかの数、Hostは接続先になります。
"Start swarming"を押すことでテストが開始されます。
以下の条件でテストを開始したときの画面が次のようになります。

- Number of users: 10
- Spawn rate: 1
<img src="/images/2024/20240216a/image_4.png" alt="image.png" width="1200" height="237" loading="lazy">

右上のSTATUSの部分では現在接続中のユーザー数（5 Users）が表示されており、10Usersまで増えていきます。RPSはRequest Per Secondで、秒間のリクエスト数を表しております。
また、各種タブを切り替えることでテストに関する情報を見ることができます。

- Statistics
  - Requestに対するレスポンスの統計情報
  - テストを行っているパスに対して個別にみることが可能
- Charts
  - RPSやレスポンスタイムの時系列情報をグラフで確認することが可能
- Failures
  - リクエストが失敗した場合に、どパスに対してどのMethod失敗したのか、エラーコードは何なのかを確認することが可能
- Exceptions
  - 例外発生時のTracebackを確認することが可能
- Current Ratio
  - Locustのイメージビルド時にPythonファイルで設定した各パスに対するリクエスト数の割合を確認することが可能
- Download Data
  - テスト結果をCSVやレポートとして出力可能
- Workers
  - 現在Locustを動作させているPodの数を確認可能

シンプルなUIの作りになっているため、直観的でわかりやすいです。
また、"Download Data"にてレポートを出力できるのですが、テスト結果に対して自動でサマリした状態で出力してくれるので非常に便利です。
<img src="/images/2024/20240216a/image_5.png" alt="image.png" width="1200" height="735" loading="lazy">
<img src="/images/2024/20240216a/image_6.png" alt="image.png" width="1200" height="897" loading="lazy">
<img src="/images/2024/20240216a/image_7.png" alt="image.png" width="1200" height="776" loading="lazy">

また、かなり大きめの負荷をかけたい場合は、Podの数を増やすことで対応可能です。Kubernetesならではですね。
Podを増やしたい場合は以下のコマンドで増やします。

```bash terminal
kubectl scale deployment/locust-worker --replicas=10
```

## まとめ

本記事では、GKEとLocustを利用した分散型の負荷テストをハンズオン形式で紹介させていただきました。

Locustはシンプルな作りになっているため、特別なキャッチアップも必要なくサクッと使うことができます。

もしアプリのローンチを計画している方は、ローンチ前にLocustを利用した負荷テストをやってみてはいかがでしょうか？

[^1]: https://www.ea.com/ja-jp/games/battlefield
