---
title: "PythonでCloud Operationsの機能を使ってみる"
date: 2021/03/11 00:00:00
postid: ""
tag:
  - GoogleCloud
  - Python
  - OpenCensus
  - OpenTelemetry
  - CloudOperations
  - CloudRun
  - PyCharm
category:
  - DevOps
thumbnail: /images/2021/20210311/thumbnail.png
author: 澁川喜規
lede: "DebuggerとProfilerを試してみます。本当は仕事で使っているGoでやってみようと思ったのですが、Debuggerのドキュメントをみたら、現時点でGoはまだ実験的サポートで..."
---

[GCP連載](/articles/20210307/)の第3回目はCloud Operationsの機能を試してみます。DebuggerとProfilerを試してみます。本当は仕事で使っているGoでやってみようと思ったのですが、Debuggerのドキュメントをみたら、現時点でGoはまだ実験的サポートで、Cloud Runは非対応、Goのバージョンも1.9以下という状況でしたので、サポートが手厚いPythonで試しました。

# gcloudコマンドの設定

まずGCPの環境で、gcloudコマンドを入れます。M1 macには入れていなかったので入れてみたのですが、[こちら](https://mager.co/posts/2021-01-21-gcloud-mac-m1/)に従ってやりました。普通のインストールでは途中でエラーになり、この紹介記事と同じく、最後にinstall.shを自分で叩く必要がありました。

プロジェクトIDは自分で入力する名前に何か数値が後ろについたようなやつです。プロジェクト一覧に出てくるserverless-12345のようなものがIDです。

```sh
# 初期化とプロジェクトの選択
$ gcloud auth login
$ gcloud config set project [プロジェクトID]
```

# プロジェクトを作る

Cloud Runで試しで動かすプロジェクトを作ってみます。Poetryを使ってFastAPIなプロジェクトを作ってみましょう。作ったアプリケーションはCloud Runで実行します。

```sh
# 一度だけやるPoetryのインストール
$ python -m pip install --user poetry
# .venvはIDEが探しやすいようにプロジェクトローカルに作って欲しい
$ poetry config virtualenvs.in-project true

# プロジェクトを作る(python-cloud-debugがプロジェクト名)
$ poetry new python-cloud-debug
$ cd python-cloud-debug
```

## 開発環境の設定

まず、ライブラリを追加します。なお、uvicornですが、最近になって、uvloopとhttptools、websocketといった依存ライブラリは明示的にインストールしないと実行時にエラーになるように変わったみたいです。

```sh
poetry add fastapi uvicorn uvloop httptools
```

ここで.venvフォルダができ、ライブラリ類はそこにインストールされます。処理系がそこをみてくれるように設定すれば、コード補完とかが効きます。PyCharmであれば設定で検索ウィンドウにvenvとタイプするとインタプリタ選択がでるので、追加してプロジェクトフォルダの.venv以下を設定します。

<img src="/images/2021/20210311/スクリーンショット_2021-03-05_21.29.31.png" loading="lazy">

VSCodeは特になにもしなくてもよさそうです。開くだけで.venvフォルダを認識してオープンしてくれました。

<img src="/images/2021/20210311/スクリーンショット_2021-03-05_21.45.41.png" loading="lazy">

## アプリケーションを作ってみる

FastAPIのサンプルを持ってきました。

```py python_cloud_debug/main.py
from typing import Optional
from fastapi import FastAPI


app = FastAPI()


@app.get("/")
def read_root():
    return {"hello": "world"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}

```

次のように実行するとローカルの８０００番ポートで起動します。ブラウザでlocalhost:8000にアクセスしたらJSONが表示ができることを確認します。

```sh
poetry run uvicorn python_cloud_debug.main:app --reload
```

## コンテナを作ってpushする

Dockerfileは以下の通りです。ちょびっと工夫したのは以下の2点

* 実行イメージでpip installするとイメージサイズが50MBぐらい違いますし、ネイティブコンパイルが必要なパッケージだと実行イメージにコンパイラを入れないといけないので、site-packagesをコピーする手法を選択
* Cloud Runの作法にはPORT環境変数でポートを変えよ、というものがあります。それをsh -cで実現しましたが、今度はCtrl+Cでシャットダウンが効かなかったので、execをつけたところうまくいきました（@moriyoshit さんに教えてもらいました）。

あとは、Python 3.7じゃないとうまくいかなかったので3.7にしています。

```Dockerfile Dockerfile
FROM python:3.7-buster as builder
WORKDIR /opt/app
RUN pip3 install poetry
COPY pyproject.toml poetry.lock /opt/app/
RUN poetry export -f requirements.txt > requirements.txt
RUN pip3 install -r requirements.txt

FROM python:3.7-slim-buster as runner
ENV PORT=8000
WORKDIR /opt/app/
COPY --from=builder /usr/local/lib/python3.7/site-packages /usr/local/lib/python3.7/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY python_cloud_debug /opt/app/
WORKDIR /opt/app/

ENV PYTHONUNBUFFERED=TRUE
CMD [ "/bin/sh", "-c", "exec /usr/local/bin/uvicorn --host 0.0.0.0 --port $PORT main:app" ]
```

ローカルでビルドしてうまく動くことを確認したらpushします。リポジトリに入れてクラウドビルドをする方法も最近は使えます。とりあえず手元で動かしてプッシュしてみます。M1 macの場合は--platform linux/amd64が必要です。

```sh
# ビルド
$ docker build --platform linux/amd64 -t gcr.io/[プロジェクトID]/[プロジェクト名]:latest .
# ローカルで実行
$ docker run --rm -it -p 8000:8000 gcr.io/[プロジェクトID]/[プロジェクト名]:latest
# push
$ docker push gcr.io/[プロジェクトID]/[プロジェクト名]:latest
```

これを使ってCloud Runに登録して実行してみても良いでしょう。アプリケーション名を入れて、このpushしたイメージ名を選択して外部公開してあげれば簡単に起動できます。それ以外にはリポジトリと連携してCloud Buildする方法も選べます。デバッガーではソースコードを別にpushしないといけないのでそっちの方がいいかも？

<img src="/images/2021/20210311/スクリーンショット_2021-03-06_9.38.35.png" loading="lazy">

# デバッガーを使ってみる

それでは本題のGCPのAPIを使ってみます。必要なライブラリを足しつつ、先程のコードの``app = FastAPI()``の前に次の内容を入れます。ローカルでは外部依存なく気軽にテストしたいので、poetryの依存に入れず、実行イメージの中でのみ追加して、LOCAL=trueという環境変数があればロードしないようにします。

pip3の行を次のように書き換えます。

```Dockerfile Dockerfile
RUN pip3 install poetry google-python-cloud-debugger
```

アプリへの追加はこれだけです。

```py python-cloud-debug/main.py
if "LOCAL" not in os.environ:
    try:
        import googleclouddebugger
        googleclouddebugger.enable(breakpoint_enable_canary=True)
    except (ValueError, NotImplementedError) as exc:
        print(exc)
```

これをビルドしてCloud Runを実行してみたらDebuggerの画面を開きます。まず開くと、ソースコードをアップロード白、と出てくるのでpython_cloud_debugフォルダを選択してアップしました。クラウドビルドだとこの手間なくできるみたいですね。

スナップショットを設定すると、その行が実行されたときにローカル変数やコールスタックが表示されます。またログポイントでログ出力を挟み込むこともできます。実行環境にそのまま差し込めるのは便利ですね。

<img src="/images/2021/20210311/スクリーンショット_2021-03-06_0.24.24.png" loading="lazy">

# プロファイラを使ってみる

せっかくなのでプロファイラも使ってみます。こちらはPythonであっても、Cloud Runはまだサポートされていません。ドキュメントにはグーグルのサービスではCompute Engine、GKE、GAEのみが対象となっています。ただ、自分でクレデンシャルを設定したらGCP外からも使えるとは書かれていて、[この手順](https://cloud.google.com/profiler/docs/profiling-external)を試して成功したのですが、やっていることはプロファイラのエージェントのロールを付与しているだけなので、Cloud Run実行のサービスアカウントにプロファイラエージェントのロールをつければいけます。

<img src="/images/2021/20210311/スクリーンショット_2021-03-06_12.51.21.png" loading="lazy">

先程のDockerfileにプロファイラのライブラリのインストールも追加します。また、先ほど作ったクレデンシャルのファイルも登録して、そのファイルのパスを環境変数に設定します。本当は環境変数でファイルの内容を渡して、Pythonコードでそれをまずファイルに落としてあげる、環境変数はCloud Runの設定に入れてDockerイメージに入れない、みたいなことをやった方がセキュアな気がしますが、手取り早くファイルを足してしまいます。

```Dockerfile Dockerfile
RUN pip3 install poetry google-python-cloud-debugger google-cloud-profiler
```

デバッガーの設定のところでプロファイラを開始する関数の呼び出しを追加します。

```py python-cloud-debug/main.py
if "LOCAL" not in os.environ:
    try:
        import googleclouddebugger
        import googlecloudprofiler
        googleclouddebugger.enable(breakpoint_enable_canary=True)
        googlecloudprofiler.start(
            service='python-cloud-debug',
            service_version='1.0.1',
            # 0-error, 1-warning, 2-info, 3-debug
            verbose=3,
        )
    except (ValueError, NotImplementedError) as exc:
        print(exc)
```

プロファイル画面をみてみたら、フレームグラフが出ました。ちょっとスリープを挟んでみても、自分で書いたコードのフレームが出てこないのですが、きっとCPUヘビーなコードが出てきたらすぐにわかるんじゃないですかね。すくなくとも、time.sleep()でも、asyncio.sleep()でも結果には出てきませんでした。

<img src="/images/2021/20210311/スクリーンショット_2021-03-06_10.41.02.png" loading="lazy">

CPU時間のグラフはこんな感じです。きっとプログラムがヘビーになったら活躍してくれるはず。

<img src="/images/2021/20210311/スクリーンショット_2021-03-06_10.26.38.png" loading="lazy">

# まとめ

StackdriverあらためCloud OperationsのDebuggerとProfilerを試してみました。Goサポートがまだだったり、Cloud Run対応がまだだったりとかはありますが、OpenCensus/OpenTelemetryなみに頑張らなくてもちょっとmainのところにコードを足すだけで本番環境の中身を覗いたりプロファイルが取れるのは面白いですね。そのうち、ローカルのデバッグよりもリモートの方が簡単、みたいになってくれそうな気がしました。

明日は村瀬さんの[Text To Speech](/articles/20210312/)です。
