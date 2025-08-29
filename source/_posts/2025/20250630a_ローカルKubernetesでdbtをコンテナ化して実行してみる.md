---
title: "ローカルKubernetesでdbtをコンテナ化して実行してみる"
date: 2025/06/30 00:00:00
postid: a
tag:
  - dbt
  - Docker
  - Kubernetes
category:
  - Infrastructure
thumbnail: /images/2025/20250630a/thumbnail.png
author: 片岡久人
lede: "データ変換ツール「dbt（data build tool）」をDockerコンテナ化し、Kubernetes上で実行する手順を紹介します。"
---

<img src="/images/2025/20250630a/top.png" alt="" width="446" height="162">

# はじめに

[CNCF連載](/articles/20250616a/)の6本目です、データ変換ツール「dbt（data build tool）」をDockerコンテナ化し、Kubernetes上で実行する手順を紹介します。

私がCNCFやKubernetesに関して触れたのは今回が初めてですが、Kubernetesの学習の一環として、実際に手を動かしながらクラウドネイティブ技術を体験してみたいという思いで取り組みました。

# 1. 今回の記事でやりたいこと

本記事では、以下のステップを通して、dbtモデルの準備から、それをコンテナにしてKubernetes上で動かすまでを体験します。

- dbtで作成したデータ変換モデルを、Dockerコンテナ化
- 作成したコンテナをKubernetesクラスタにデプロイ
- Kubernetes上でdbtを実行し、BigQueryにデータを書き込む

# 2. dbtのモデルを実装

- dbtプロジェクトの作成やモデル実装方法は、[dbt Core × BigQueryを使ったデータ変換をやってみた](/articles/20250515a/)こちらの記事などを参照してください。
- 本記事では下記のような構成になっていることを想定しています。

```sh
<your_repositry>/
├── dbt_trial/
│   ├── models/
│   ├── dbt_project.yml
│   └── profiles.yml
├── kubernetes/
│   └── dbt-run-cron-job.yml
└── Dockerfile
```

<details><summary>dbt_project.ymlの実装</summary>

```yaml
name: 'dbt_project'
version: '1.0.0'
profile: 'dbt_project'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:
  - "target"
  - "dbt_packages"

models:
  dbt_project:
    +persist_docs:
      relation: true
      columns: true
    +dbt-osmosis: "{model}.yml"
    work_dbt:
      +materialized: view
      +schema: work_dbt
```

</details>

<details><summary>profiles.ymlの実装</summary>

```yaml
dbt_trial:
  outputs:
    dev:
      dataset: dbt
      job_execution_timeout_seconds: 300
      job_retries: 1
      location: asia-northeast1
      method: oauth
      priority: interactive
      project: <your-project> # ★ここを自身のGCPプロジェクトに修正してください★
      threads: 1
      type: bigquery
  target: dev
```

</details>

# 3. dbtの実装をコンテナ化

ここでは、dbtプロジェクトをDockerコンテナとしてパッケージ化する手順を説明します。前提として、Docker Desktopがインストールされ、稼働していることをご確認ください。Docker DesktopでのKubernetesの利用方法については、[公式ドキュメント](https://docs.docker.com/desktop/kubernetes/)などを参考にしてください。

## 3.1 Dockerイメージを作成

dbtプロジェクトを含んだDockerイメージを作成します。dbt公式イメージ（ghcr.io/dbt-labs/dbt-bigquery）をベースにすることで、簡単に環境を構築できます。

### Dockerfileの例

```dockerfile
# dbt公式イメージを利用（BigQuery用）
# URL:https://github.com/dbt-labs/dbt-bigquery/pkgs/container/dbt-bigquery
FROM --platform=linux/amd64 ghcr.io/dbt-labs/dbt-bigquery:1.9.latest

WORKDIR /usr/app

# dbtプロジェクトをコンテナ内にコピー
COPY dbt_trial/ /usr/app/
```

## 3.2 コンテナのビルドコマンド

```bash
docker build -t dbt_trial .
```

- 上記コマンドで`dbt_trial`という名前のDockerイメージが作成されます。

# 4. コンテナ化したものをKubernetesでデプロイする

作成したdbtコンテナイメージをKubernetesクラスタにデプロイし、実行する準備をします。

## 4.1 CinfigMap作成

dbtの認証情報が含まれる profiles.yml をKubernetesのConfigMapとして登録します。これにより、機密情報をコンテナイメージに含めることなく、Kubernetesから安全にアプリケーションに提供できます。

```bash
# dbt_trial配下のprofiles.ymlをConfigMapとして追加
kubectl create configmap dbt-profiles --from-file=dbt_trial/profiles.yml

# 設定されたConfigMapの一覧を確認
kubectl get configmap

# ConfigMapの中身を確認できればOK
kubectl describe configmap dbt-provile
```

## 4.2 Kubernetesの設定ファイル（CronJob）を作成

dbtをKubernetes上で実行するための「Jobリソース」の設定ファイルを作成します。Jobリソースは、決められた処理を一度だけ、または定期的に実行するためのものです。今回は、定期実行ではなく手動で実行することを想定しているため、suspend: true（一時停止状態）に設定した「CronJobリソース」をテンプレート（ひな形）として利用します。

ファイル名は kubernetes/dbt-run-cron-job.yml とします。

### dbt-run-cron-job.yamlの例

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dbt-run-cron-job # CronJobリソースの名前
spec:
  schedule: "0 1 * * *"
  suspend: true  # 定期実行は不要であるためtrueにしています。
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: dbt-runner
            image: my-dbt-bigquery:latest
            imagePullPolicy: Never # ローカルイメージを使用するため、Neverに設定
            command: ["dbt", "run", "--profiles-dir", "/dbt"]
            volumeMounts:
            - name: dbt-profiles
              mountPath: /dbt/profiles.yml
              subPath: profiles.yml
            - name: gcloud-auth
              mountPath: /root/.config/gcloud
          volumes:
          - name: dbt-profiles
            configMap:
              name: dbt-profiles
          - name: gcloud-auth
            hostPath:
              path: /Users/<your_user_name>/.config/gcloud # ★ここを自身のPCのパスに修正してください★
          restartPolicy: Never
```

::: note info
BigQueryの認証方式について

上記の例では、ローカル開発環境での簡易性を考慮し、ホストPCの gcloud コマンドで設定された認証情報（OAuth）を hostPath ボリュームとしてコンテナにマウントしています。実運用環境のKubernetesクラスタでBigQueryと連携する場合は、GCPサービスアカウントキーをSecretとして安全にマウントしたり、Workload IdentityのようなKubernetesネイティブな認証方式を利用することが推奨されます。
:::

## 4.3 Kubernetesにデプロイするコマンド

作成したCronJob設定ファイルをKubernetesクラスタに適用します。

```bash
kubectl apply -f kubernetes/dbt-run-cron-job.yml

# 実行結果
cronjob.batch/dbt-run-cron-job created
```

これでKubernetesクラスタにCronJobリソースが登録されました。このCronJobは、dbtコマンドを実行するためのJobのテンプレートとして機能します。

## 4.4 デプロイが成功したか確認するコマンド

CronJobリソースが正しくデプロイされたかを確認します。

```bash
kubectl get cronjobs

# 実行結果
NAME               SCHEDULE    TIMEZONE   SUSPEND   ACTIVE   LAST SCHEDULE   AGE
dbt-run-cron-job   0 1 * * *   <none>     True      0        <none>          17s
```

# 5. Kubernetes上でdbtを実行する

デプロイされたCronJobをテンプレートとして利用し、dbtを実行するJobを作成します。

## 5.1 Jobを実行するコマンド

```bash
kubectl create job --from=cronjob/dbt-job dbt-job-run
```

## 5.2 実行が成功したか確認

```bash
kubectl get jobs

# 実行結果
NAME      STATUS     COMPLETIONS   DURATION   AGE
dbt-run   Complete   1/1           14s        16s
```

- Jobの COMPLETIONS が 1/1 や STATUS が Complete になっていれば、OKです。

## 5.3 実行結果の確認

```bash
kubectl logs job/dbt-run # applyで作成したJob名（例：dbt-run）に合わせてコマンドを修正してください。

# 実行結果
09:56:38  Running with dbt=1.9.0
09:56:38  Registered adapter: bigquery=1.9.0
09:56:38  Unable to do partial parsing because of a version mismatch
09:56:39  Found 4 models, 4 seeds, 13 data tests, 1 source, 487 macros
09:56:39
09:56:39  Concurrency: 1 threads (target='dev')
09:56:39
WARNING:google.auth._default:No project ID could be determined. Consider running `gcloud config set project` or setting the GOOGLE_CLOUD_PROJECT environment variable
09:56:42  1 of 4 START sql table model dbt.my_first_dbt_model ............................ [RUN]
09:56:44  1 of 4 OK created sql table model dbt.my_first_dbt_model ....................... [CREATE TABLE (2.0 rows, 0 processed) in 2.73s]
09:56:44  2 of 4 START sql view model dbt_staging.stg_sales .............................. [RUN]
09:56:45  2 of 4 OK created sql view model dbt_staging.stg_sales ......................... [CREATE VIEW (0 processed) in 0.79s]
09:56:45  3 of 4 START sql view model dbt.my_second_dbt_model ............................ [RUN]
09:56:46  3 of 4 OK created sql view model dbt.my_second_dbt_model ....................... [CREATE VIEW (0 processed) in 0.71s]
09:56:46  4 of 4 START sql view model dbt_mart.mart_sales_amount_per_day ................. [RUN]
09:56:47  4 of 4 OK created sql view model dbt_mart.mart_sales_amount_per_day ............ [CREATE VIEW (0 processed) in 0.84s]
09:56:47
09:56:47  Finished running 1 table model, 3 view models in 0 hours 0 minutes and 7.18 seconds (7.18s).
09:56:47
09:56:47  Completed successfully
09:56:47
09:56:47  Done. PASS=4 WARN=0 ERROR=0 SKIP=0 TOTAL=4
```

ログからdbtの実行が成功していることが確認できます。最後に、BigQueryのコンソールで実際にテーブルが作成されているかを確認しましょう。

# まとめ

dbtプロジェクトをDockerコンテナ化し、KubernetesのCronJobテンプレートを利用してJobとして実行する一連の手順をご紹介しました。

ローカル環境でも本番環境さながらのデータパイプライン構築が体験でき、ConfigMapによる設定ファイルの管理、Kubernetes Jobリソースの利用、ホストパスボリュームを用いた認証情報のマウントなど、Kubernetesの基本的な概念と実践的な使い方を学ぶことができました。

これを応用することで、CI/CDパイプラインへの組み込みや、クラウド環境のKubernetesクラスタへのデプロイなどの足掛かりができたので、挑戦していこうと思います。
