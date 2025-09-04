---
title: "はじめてのStreamlit with Google Cloud"
date: 2025/04/22 00:00:00
postid: a
tag:
  - GoogleCloud
  - Streamlit
  - CloudRun
  - Python
  - 可視化
category:
  - DataEngineering
thumbnail: /images/2025/20250422a/thumbnail.png
author: 柴田健太
lede: "Streamlitは、Pythonを使って簡単にインタラクティブなWebアプリケーションとして共有できるライブラリで多くの採用実績があり、Snowflakeが買収したため今後の発展も期待できます。本記事では、Google CloudのVertex AI Workbenchを活用してStreamlitアプリを開発し、Google Cloud Runにデプロイするまでの手順を詳しく解説します。"
---

<img src="/images/2025/20250422a/top.png" alt="" width="800" height="502">

[春の入門祭り2025](/articles/20250413a/) 7日目です。こんにちは、製造・エネルギーサービス事業部の柴田です。
日本の製造業・エネルギー業をDXの力で元気にすることを目指しています。

企業でのDX推進においてPythonは多くの場面で活躍の場面があり、習得スキルとしても人気があります。

Streamlitは、Pythonを使って簡単にインタラクティブなWebアプリケーションとして共有できるライブラリで多くの採用実績があり、Snowflakeが買収したため今後の発展も期待できます。本記事では、Google CloudのVertex AI Workbenchを活用してStreamlitアプリを開発し、Google Cloud Runにデプロイするまでの手順を詳しく解説します。ローカル環境のセットアップは不要です。

# 前提条件

- Google Cloudアカウントを用意していること
- Google Cloud プロジェクトが作成済みであること

# 全体の流れ

- Webアプリを作成する
- DockerイメージをArtifact Registryにプッシュする
- Artifact RegistryにプッシュしたDockerイメージをCloud Runにデプロイする

# Webアプリの作成

## Google Cloud Notebooks インスタンスの作成

まずはStreamlitアプリを開発するためのGoogle Cloud Notebooksインスタンスを作成します

1. Vertex AI Workbench に移動
Google Cloud Consoleのナビゲーションメニューから「Vertex AI」>「Workbench」に移動します。見つからない場合は検索ウィンドウでVertex AIを検索して直接移動してくださいね

2. 新しいノートブックの作成
Viewで「インスタンス」を指定し、「新規作成」をクリックし、適切な環境を選択します

3. ノートブックを開く
インスタンスが作成され、準備が完了したら、「JupyterLab を開く」をクリックします

## Streamlit アプリの開発

JupyterLabが開いたら、新しいPythonファイルを作成し、Streamlitアプリのコードを記述します

1. 新しい Python ファイルの作成
   JupyterLabのランチャー（または「ファイル」>「新規」>「Python 3」）を開き、新しいIPython Notebookを作成します
2. Streamlit とその他のライブラリのインストール
   最初のセルに以下のコードを入力し、実行してStreamlitをインストールします

   ```bash
   !pip install streamlit
   ```

3. Streamlit アプリのコード記述
   新しいセルを作成し、Streamlitアプリのコードを記述します。ローカル環境の例と同じコードを使用できます。

   ```py
   import streamlit as st

   st.title("My First Streamlit App on Google Cloud Notebooks")
   st.write("Hello from Streamlit running on Google Cloud Notebooks!")

   name = st.text_input("Enter your name", "World")
   st.write(f"Hello, {name}!")
   ```

4. Python ファイルとして保存
  「ファイル」>「名前を付けて保存」を選択し、ファイル名を `app.py` として保存します

# Dockerイメージをプッシュ

## Dockerfile の作成

Google Cloud Runにデプロイするために、Dockerコンテナを作成します。JupyterLabのファイルブラウザで、`app.py` と同じディレクトリに `Dockerfile` という名前の新しいテキストファイルを作成し、以下の内容を記述します。

```dockerfile
FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# streamlitのデフォルトPORT番号
EXPOSE 8501

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

ENTRYPOINT ["streamlit", "run", "app.py", "--server.enableCORS=false", "--server.port=8501"]
```

### requirements.txt の作成

`app.py` と同じディレクトリに `requirements.txt` という名前の新しいテキストファイルを作成し、アプリに必要なPythonパッケージを記述します。今回はstreamlit以外を使用していないため以下でOKです。

```text
streamlit
```

## Docker イメージのビルドと Artifact Registry へのプッシュ

Cloud Notebooksインスタンス内でDockerイメージをビルドし、Artifact Registryにプッシュします。

### Artifact Registry API の有効化

まだ有効にしていない場合は、Google Cloud Console で Artifact Registry API を有効にします

### Artifact Registry リポジトリの作成

Google Cloud Console または `gcloud` コマンドを使用して、Docker イメージを保存する Artifact Registry リポジトリを作成します。リージョン（例: `asia-northeast1`）とリポジトリ形式（`Docker`）を指定します

```sh
gcloud artifacts repositories create <repository-name> \
  --repository-format docker \
  --location <your-gcp-region> \
```

```sh コマンド例
gcloud artifacts repositories create test-repository \
  --repository-format docker \
  --location asia-northeast1
```

このようにArtifact RegistryにDocker形式のリポジトリができていればOKです
<img src="/images/2025/20250422a/image.png" alt="" width="1200" height="69" loading="lazy">

#### Docker イメージのビルド

ターミナルで、`Dockerfile` があるディレクトリに移動し、以下のコマンドを実行して Docker イメージをビルドします。`<your-gcp-region>` と `<repository-name>`、`<image-name>` は適切に置き換えてください。

```sh
docker build -t <your-gcp-region>-docker.pkg.dev/<your-gcp-project-id>/<repository-name>/<image-name> .
```

```sh コマンド例
docker build -t asia-northeast1-docker.pkg.dev/sample-project/test-repository/myapp .
```

### Docker に Artifact Registry の認証を設定

以下のコマンドを実行して、Docker が Artifact Registry にプッシュできるように認証します。

```sh
gcloud auth configure-docker <hostname-list>
```

`hostname-list`は、認証ヘルパー構成に追加するリポジトリ ホスト名のカンマ区切りのリストで、Artifact Registryのホスト名はロケーションと紐付いているため、`<location>-docker.pkg.dev`という形になります

```sh コマンド例
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

### Docker イメージのプッシュ

ビルドした Docker イメージを Artifact Registry にプッシュします。先ほどビルドした際のタグを使用します。

```sh
docker push <your-gcp-region>-docker.pkg.dev/<your-gcp-project-id>/<repository-name>/<image-name>
```

```sh コマンド例
docker push asia-northeast1-docker.pkg.dev/grassroot-ck/test-repository/myapp
```

実行すると、このようにリポジトリ内にイメージがプッシュされます。

<img src="/images/2025/20250422a/image_2.png" alt="" width="533" height="318" loading="lazy">

# Google Cloud Run へのデプロイ

プッシュしたDockerイメージをGoogle Cloud Runにデプロイします。

## Cloud Run へのデプロイコマンド実行

ターミナルで以下のコマンドを実行します。`<your-gcp-project-id>` と `<your-gcp-region>` はご自身のGCPプロジェクトIDとリージョンに置き換えてください（例: `asia-northeast1`）

```sh
gcloud run deploy <app-name> \
--image gcr.io/<your-gcp-project-id>/<image-name> \
--platform managed \
--region <your-gcp-region> \
--port 8501 \
--allow-unauthenticated
```

<コマンドの説明>

- `gcloud run deploy <app-name>`: Cloud Runサービスの名前を指定します
- `--image gcr.io/<your-gcp-project-id>/<image-name>`: デプロイするDockerイメージを指定します
- `--platform managed`: フルマネージド環境にデプロイします
- `--region <your-gcp-region>`: デプロイするリージョンを指定します
- `--port 8501`: コンテナがリッスンするポートを指定します（Streamlitのデフォルトポート）
- `--allow-unauthenticated`: 認証なしでアクセスできるようにします（必要に応じて変更してください）

```sh コマンド例
gcloud run deploy myapp \
--image gcr.io/sample-project/myapp \
--platform managed \
--region asia-northeast1 \
--port 8501 \
--allow-unauthenticated
```

Cloud Runにデプロイされました。

<img src="/images/2025/20250422a/image_3.png" alt="" width="1200" height="77" loading="lazy">

## デプロイの確認

デプロイが完了すると、Cloud RunサービスへのURLが表示されます。このURLをブラウザで開くと、デプロイしたStreamlitアプリにアクセスできます。もしアクセスできなければセキュリティタブで、未認証の呼び出しを許可するように設定してください。

<img src="/images/2025/20250422a/image_4.png" alt="" width="993" height="508" loading="lazy">

このようなアノテーションツールも作成できます。Cloud上で動かすことでツールやデータを一括管理できるため、一歩進んだPythonの業務利用ができます。このツールではPlotlyと組み合わせて、ラベルを入力する度にインタラクティブに左下のグラフが更新されるようにしています。※Plotlyについては参考資料の記事を参考にしてください

<img src="/images/2025/20250422a/sample_tool.avif" width="1400" height="927" loading="lazy">

# まとめ

Google Cloud Notebooksを利用することで、ローカル環境をセットアップすることなく、GCP上でStreamlitアプリを開発からデプロイまで一貫して行うことができます。Cloud Runのサーバーレスな環境により、Streamlitアプリを簡単に公開し、共有できます。

もし、機密情報を用いるなどアクセス制限が必要な場合には追加の対応が必要ですので、注意してください。

この手順を参考に、ぜひGoogle Cloud Notebooksを活用してStreamlitアプリの開発とデプロイを試してみてください。

# 参考資料

- [Artifact Registry for Docker への認証を構成する](https://cloud.google.com/artifact-registry/docs/docker/authentication?hl=ja)
- [イメージを push および pull する](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling?hl=ja)
- [Plotly.pyによるデータ可視化のすすめ](https://future-architect.github.io/articles/20221116a/)
