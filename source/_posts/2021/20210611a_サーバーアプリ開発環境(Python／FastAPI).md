---
title: "サーバーアプリ開発環境(Python／FastAPI)"
date: 2021/06/11 00:00:00
postid: a
tag:
  - Docker
  - VSCode
  - Python
category:
  - Programming
thumbnail: /images/20210611a/thumbnail.png
author: 澁川喜規
lede: "Pythonでお仕事する前提で、現在のところで自分が最適と考えるチーム開発のための環境整備についてまとめてみました。今までももろもろ散発的に記事に書いたりしていたのですが、Poetryで環境を作ってみたのと、過去のもろもろの情報がまとまったものが個人的にも欲しかったのでまとめました。"
---

Pythonでお仕事する前提で、現在のところで自分が最適と考えるチーム開発のための環境整備についてまとめてみました。今までももろもろ散発的に記事に書いたりしていたのですが、Poetryで環境を作ってみたのと、過去のもろもろの情報がまとまったものが個人的にも欲しかったのでまとめました。前提としては次の通りです。

* パッケージ管理や開発環境整備でPoetryを使う
* 今時はコードフォーマッター、静的チェックは当たり前ですよね？
* コマンドでテスト実行、コードチェックとか実行とかができる（CI/CD等を考えて）
* VSCodeでもコマンドで実行しているのと同じコードチェックが可能(ここコンフリクトすると困る）
* デプロイはDockerイメージ
* コンテナのデプロイ環境でコンテナに割り当てられたCPU能力を比較的引き出せて、スケールさせたら線形にパフォーマンスアップできるようなasyncioを前提とした環境構築

Pythonのasyncio周りで[@aodag](https://twitter.com/aodag)と[@moriyoshit](https://twitter.com/moriyoshit)にアドバイスをいただきました。

# Poetryのインストール（1回で良い）

https://python-poetry.org/docs/

```bash
$ curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python -
```

```powershell
(Invoke-WebRequest -Uri https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py -UseBasicParsing).Content | python -
```

ホームの.poetry/bin以下にコマンドが作成される。ここにパスを通すか、どうせpoetryコマンドだけなのでこれのシンボリックリンクをパスの通っているところに作る。

# プロジェクト作成

プロジェクトフォルダはコマンドで一緒に作られるので、フォルダをおきたい親フォルダでコマンドを実行

```bash
$ poetry new sample-server
```

これでsample-serverフォルダが作られて、その中に設定ファイル一式がつくられる。

ここで必要なライブラリのインストールとかしてもいいがその前にやっておくと良いことがある。venv環境をプロジェクトの中に作ると、VSCodeとかで仮想環境を上手く扱ってくれるのでこの設定をやっておくと良い。プロジェクトファイル内にpoetry.tomlというファイルが作られる。これをコミットしておけば、プロジェクト全員が同じフォルダ構成になるため、プロジェクトの平準化がしやすい。

```bash
$ cd sample-server
$ poetry config virtualenvs.path ".venv" --local
$ poetry config virtualenvs.in-project true --local
```

ここで仮想環境を有効にして、必要なライブラリをインストール。

```bash
$ poetry install
```

デフォルトでpytestが入っており、これでテストができる。

```bash
$ poetry run pytest
```

# ツールのインストール

Poetryの標準テンプレートでpytest入りますが、linter (flake8, mypy)とフォーマッター (black)を入れていきます。

これからぼちぼち設定をいじったりもするので、最初にVSCodeの設定をします。poetry installで作られた.venv環境を参照するようにします。

```json .vscode/settings.json
{
  "python.pythonPath": "${workspaceRoot}/.venv/bin/python"
}
```

これでエディタを開いて、Pythonバージョンに('.venv' :venv)とかかれていれば成功です。

フォーマッターはblack、linterはflake8とmypyを入れます。またVSCodeのターミナルを起動すると自動で.venv環境に入ってくれるようになります。

```bash
$ poetry add --dev mypy black flake8
```

ツールの実行はまとめて行いたい、みたいなことがありますが、poetryにはツールランチャーの機能はないので、taskipyを入れます。

```bash
$ poetry add taskipy
```

https://tech.515hikaru.net/post/2020-02-25-poetry-scripts/

次のように定義することで、コマンド名とかを覚えなくても良いようにします。

```toml pyproject.toml
[tool.taskipy.tasks]
test = { cmd = "pytest tests", help = "runs all unit tests" }
pr_test = "task lint"
fmt = { cmd = "black tests example_server", help = "format code" }
lint = { cmd = "task lint_black && task lint_flake8 && task lint_mypy", help = "exec lint" }
lint_flake8 = "flake8 --max-line-length=88 tests example_server"
lint_mypy = "mypy tests example_server"
lint_black = "black --check tests example_server"
```

次の名前で開発タスクが行えるようになります。

* `poetry run task test`: テストの実行(lintも行う)
* `poetry run task fmt`: スタイルの修正
* `poetry run task lint`: lintの実行(flake8, mypy, blackの差分チェック)
* `poetry run task --list`: タスク一覧表示

VSCodeの方も、これらの設定に合わせます。

linterはコード入力の中でリアルタイムで適用してチェックされるようになるし、保存時にblackでフォーマットされるようになります。テストはテスト関数の関数定義の行の前に出てくるRun Testボタンでもできますし、コマンドパレットでRun All Testでも実行できるようになります。

```json .vscode/settings.json
{
  "python.pythonPath": "${workspaceRoot}/.venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.flake8Enabled": true,
  "python.linting.flake8Args": ["--max-line-length", "88"],
  "python.linting.mypyEnabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests"],
  "python.testing.unittestEnabled": false,
  "python.testing.nosetestsEnabled": false,
  "editor.formatOnSave": true
}
```

無視するファイルも登録しておきます。

``` .gitignore
__pycache__
.venv
.pytest_cache
.mypy_cache
```

これで一通り設定完了です。.vscode/settings.jsonを含めて各種ファイルを全部リポジトリに入れておけば、チェックアウトしたユーザーは``poetry install``を実行すれば環境が整います。

# サーバーの開発

必要なライブラリをインストールします。今回はasyncio対応ということで[FastAPI](https://fastapi.tiangolo.com/)を選びました。[Starlette](https://www.starlette.io/)でもいいと思います。

```bash
$ poetry add fastapi uvicorn gunicorn
```

Poetryが作ったコード用のフォルダの中にmain.pyファイルを作り、FastAPIのサンプルコードを貼り付けます。

```py example_server/main.py
from typing import Optional

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}
```

テストサーバー起動をpoetryコマンドから行えるように、タスク定義を追加しておきます。

```toml pyproject.toml
[tool.taskipy.tasks]
start = { cmd = "uvicorn example_server.main:app --reload", help = "launch test server" }
```

これで次のコマンドで8000ポートで開発サーバーが起動するようになります。ファイルを変更すると自動リロードします。

```bash
$ poetry run task start
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [49000] using statreload
INFO:     Started server process [49003]
INFO:     Waiting for application startup.
INFO:     Application startup complete.```
```

これでどんどんコードを書いてブラウザで動かして・・・というのはできるのですが、デバッグもしたいですよね？VSCodeの設定ファイルを作っておいておきます。

```json .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["example_server.main:app"],
      "jinja": true
    }
  ]
}
```

これを作っておくと、Run and DebugアイコンをクリックしたときにRUNのところに表示されますので、▷ボタンを押すとデバッガーでアプリが起動します。あとはブレークポイントを置いたりステップ実行したり、変数をみたり、自由自在です。

<img src="/images/20210611a/スクリーンショット_2021-06-11_12.35.24.png" alt="デバッガーでアプリの起動" loading="lazy">

# サーバーのDocker化

Dockerのイメージにするところまで作っておきましょう。まずはビルド時に不要なファイルを設定する.dockerignoreファイルを作ります。

``` .dockerignore
__pycache__
.venv
.pytest_cache
.mypy_cache
.vscode
```

次にDockerfileです。ウェブサーバーはデータベースのライブラリが必要になったりすることを考えてDebianベースで作っています。Distrolessだとバイナリパッケージ追加がちょっと厳しいかもというのと、Pythonバージョンが3.7とちょっと古いので・・・バイナリパッケージの問題や型チェックで新しい書き方を使わなくても構わない場合はDistrolessが良いと思います。

Gunicornの起動ではアクセスログをコンソールに流すようにしています。ログドライバーが取得して収集しやすくなるので、ローカルファイルに置くのではなくて、出力するのがコンテナ時代やり方ですね。

```Dockerfile Dockerfile
# ここはビルド用のコンテナ
FROM python:3.9-slim-buster as builder

WORKDIR /opt/app

RUN pip3 install poetry
COPY poetry.lock pyproject.toml poetry.toml ./
RUN poetry install --no-dev

# ここからは実行用コンテナの準備
FROM python:3.9-slim-buster as runner

RUN useradd -r -s /bin/false uvicornuser
WORKDIR /opt/app
COPY --from=builder /opt/app/.venv /opt/app/.venv
COPY example_server ./example_server
USER uvicornuser

EXPOSE 8000
CMD ["/opt/app/.venv/bin/gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "--capture-output", "--log-level", "warning", "--access-logfile", "-", "--bind", ":8000", "example_server.main:app"]
```

各DB接続ライブラリのasyncioサポートと必要なパッケージの組み合わせは次の通りです。

* [SQLAlchemy](https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html)
    * PostgreSQL: [asyncpg](https://pypi.org/project/asyncpg/)
* [databases](https://pypi.org/project/databases/)
    * PostgreSQL: [asyncpg](https://pypi.org/project/asyncpg/)
    * MySQL: [aiomysql](https://pypi.org/project/aiomysql/)
    * SQLite: https://pypi.org/project/aiosqlite/

上記のライブラリ群を使う限り、ビルドイメージはslimで大丈夫ですし、追加のパッケージインストールも不要です。asyncpgはCythonで作られていますが、manylinux1なバイナリが提供されているのでDebian系のイメージを使う限りはCコンパイラは不要（slimなイメージのままで大丈夫）です。また、同期接続な[PyMySQL](https://pypi.org/project/PyMySQL/)もpure pythonなのでそのままで大丈夫です。型チェックの書き方さえPython3.7でよければDistroless化も簡単です。

PostgreSQLで、同期接続の[psycopg2](https://pypi.org/project/psycopg2/)を使う場合にlibpq5（とlibxml2)が必要となりますし、Cコンパイラも必要になるので、ビルドイメージをslimじゃないものにして、次のコードを実行イメージのFROMのところに入れておきます。ビルドイメージのslimじゃないbusterイメージには最初からlibpq5-devとかも入っているので追加インストールは実行イメージ側だけで大丈夫です。

```Docker Dockerfile
# ここはビルド用のコンテナ
FROM python:3.9-buster as builder
:

# ここからは実行用コンテナの準備
FROM python:3.9-slim-buster as runner
RUN apt-get update \
  && apt-get install -y libpq5 libxml2 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
:
```

実行はいつもの通りです。

```bash
$ docker build -t sample-server .
$ docker run --rm -it -p 8000:8000 sample-server
```

# Pythonネタで過去に書いた記事です

* [2021年版Pythonの型ヒントの書き方 (for Python 3.9)](/articles/20201223/)
* [仕事でPythonコンテナをデプロイする人向けのDockerfile (1): オールマイティ編](/articles/20200513/)
* [仕事でPythonコンテナをデプロイする人向けのDockerfile (2): distroless編](/articles/20200514/)
* [「2020年代のコンテナ時代のPythonアーキテクチャ&デプロイ」というテーマでPyCon.jp 2020で発表してきました](/articles/20200910/)
* [Python 3.7とVisual Studio Codeで型チェックが捗る内作Pythonアプリケーション開発環境の構築](https://qiita.com/shibukawa/items/1650724daf117fad6ccd)

