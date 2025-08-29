---
title: "FastAPI on Dockerがかなりシンプルになった(2025年版)"
date: 2025/06/02 00:00:00
postid: a
tag:
  - Docker
  - Python
  - FastAPI
category:
  - Programming
thumbnail: /images/2025/20250602a/thumbnail.png
author: 澁川喜規
lede: "5年ほど前にPythonのコンテナ化について2つの記事を書きましたがFastAPI側もDocker側もアップデートがあり、当時よりもかなりシンプルになってきたのを感じたので少し調べてまとめてみました。"
---

5 年ほど前に Python のコンテナ化について 2 つの記事を書きましたが FastAPI 側も Docker 側もアップデートがあり、当時よりもかなりシンプルになってきたのを感じたので少し調べてまとめてみました。

書き方の部分は別として Python におけるコンテナイメージ選択の考え方とかは 2020 年に書いたときとは変わっていませんので、適宜そちらを参照してください。

- [仕事で Python コンテナをデプロイする人向けの Dockerfile (1): オールマイティ編](/articles/20200513/)
- [仕事で Python コンテナをデプロイする人向けの Dockerfile (2): distroless 編](/articles/20200514/)

(1)の方からのアップデートとしては Debian のバージョンですね。stretch(9), buster(10)はすでに EOL です。その次に出た bullseye(11)は 2026 年 8 月で EOL です。今からなら bookworm(12)がおすすめです。

(2)の方のアップデートもほぼ同じで、Debian の新バージョンを使ったイメージが追加されています。それにともって Python のバージョンも新しくなっています。

- gcr.io/distroless/python3-debian11: Python 3.9.2
- gcr.io/distroless/python3-debian12: Python 3.11.2

Dockerfile の書き方自体のアップデートとしては以下に書いた内容がベースとなります。本エントリーでもちょくちょく Docker の説明はありますが、詳細はこちらも併読してもらえると良いかと思います。

- [2024 年版の Dockerfile の考え方＆書き方](/articles/20240726a/)

本エントリーでは Dockerfile を使った debian-slim, Chainguard, Distroless ベースのイメージ作成だけを取り上げます。コンテナ用のイメージについては次のページにまとめがあります。

- [builders.flesh: コンテナサイズ最小化のためのベースイメージ再考](https://aws.amazon.com/jp/builders-flash/202502/base-img-for-container-minimization/)

# FastAPI のアプリケーションを作る

まずはコンテナイメージに焼き込むアプリケーションを作ります。[以前の FastAPI 記事](/articles/20210611a/)では Poetry を使った環境構築を紹介しましたが、ここ数年で Rye、uv と出てきて、今では uv が覇権を取りそうですので、uv で作ってみます。ただ、ツールは変わっても基本的なメンタルモデルはあんまり変わらないですね。早くなんでもいいから標準に入ってほしい。

環境構築からパッケージのインストールまで一気に終わります。

```shell
$ mkdir pyapp
$ cd pyapp
$ uv init
$ uv add fastapi --extra standard
```

とりあえずファイルを作ります。

```py main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
async def read_root():
    return {"Hello": "World"}
```

次のコマンドを実行するとポート番号 8000 で開発モードで起動します。開発モードだとファイル変更を検知して自動再起動します。

```sh
uv run fastapi dev
```

起動するスクリプトとかも自動探索してくれますし、gunicorn で uvicorn ワーカーを使って起動（5 年前にブログに書いたやつ）とか、uvicorn コマンドで起動（FastAPI の本家の日本語訳はまだこれだった）とかではなく、`fastapi`コマンド一発で裏で uvicorn を使って非同期 IO を活用したモードで立ち上がります。Next.js とかそういうのと近い感触。

本番モードは dev の代わりに run を使います。自動探索ではなく明示的に初期スクリプトを指定したり、ポート番号を与えるのも良いでしょう。こちらの方が明示的になるし検索でひっかかるようになるので長期運用されるものに対してはこうする方が個人的には好きです。

```sh
uv run fastapi run main.py --port 8000
```

ブラウザでアクセスしてみて大丈夫だったら次に進みます。

<img src="/images/2025/20250602a/スクリーンショット_2025-05-17_18.41.44.png" alt="スクリーンショット_2025-05-17_18.41.44.png" width="686" height="336" loading="lazy">

# Docker 化

効率の良い Docker イメージ化にはマルチステージビルドが必要で、キャッシュのマウントやら何やら、というのは一度以上見かけたことがある方は多いでしょう。しかし、Docker の機能追加のおかげで、言語によってはマルチステージビルドは不要になりました。

## 基本な Python ベースのイメージの作成

`docker init`コマンドが追加され、よくコンテナと一緒に使われる言語であれば、Dockerfile が自動生成できます。Python もその対象の言語の 1 つですので、特別な要件がなければ書き方に頭を悩ませる必要はありません。以下の`Dockerfile`はこのコマンでほぼ一発で出力したものです。debian-slim ベースなのでサイズはそこそこ小さく、速度や性能は問題ないです。ウィザードの最後のコマンドとポートだけちょっと直したぐらい。

```Dockerfile Dockerfile
# syntax=docker/dockerfile:1
ARG PYTHON_VERSION=3.13.3
FROM python:${PYTHON_VERSION}-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt
USER appuser
COPY main.py main.py
EXPOSE 80
CMD ["fastapi", "run", "main.py", "--port", "80"]
```

これの実行前には requirements.txt の生成が必要です。uv は良いのですがライブラリ更新のたびに自動で出力してくれるオプションとかあったらなぁ、と画竜点睛感はありますが。

```shell
uv pip compile pyproject.toml > requirements.txt
```

この Dockerfile はマルチステージビルドではありません。新しい bind/cache マウントが入る前は次のような手順でやっていました。 requirements.txt やロックファイル、インストール用のツールはデプロイ用イメージにはいらないのでマルチステージビルドビルドで分離していたわけです。

1. requirements.txt やロックファイルを COPY する
2. インストール用のツールを入れる
3. インストールする(キャッシュが残る)
4. 別のデプロイ用イメージに必要なファイルをコピーする

しかし、この Dockerfile ではこれらが不要となっています。

- `python -m pip install`: uv を使えば開発用ツールは requirements.txt に入らないので標準ライブラリの範疇で十分
- `--mount=type=cache,target=/root/.cache/pip`: キャッシュはそもそもイメージに入らない
- `--mount=type=bind,source=requirements.txt,target=requirements.txt`: インストールだけに必要なファイルだがこれもビルド時にだけ存在し、イメージに入らない

最初から余計なものが入らない工夫をしているため、マルチステージビルド自体が不要です。Go とか Rust とか TypeScript の静的コンパイル言語だったりだとまだまだ必要ですが、そのまま実行するスクリプト言語だとかなりシンプルです。レイヤーキャッシュ芸とか&&でつながりまくった`RUN`は過去のものに。

RUN のマウント周りの引数、よくわからん、自分で書ける気がしない、と思われるかもしれませんが、心配する必要はありません。pip なり、apt なり、npm なり、ビルドでたくさん中間ファイルを撒き散らすコマンドごとに正解のオプションは調べれば出てきます。定型句です。

## Chainguard

以前も紹介した Distroless は Google のプロダクトですが、それをメインのビジネスとしているのが[Chainguard](https://www.chainguard.dev)です。無料だと latest のみが選べ、有償サービスに入るとバージョン固定ができる、という感じのようです。Chainguard ベースのイメージも Distroless 同様にシェルがないのでセキュリティに穴があってもそもそも稼働中のコンテナの中で悪さができない（ログインできない）から強い（アタックサーフェースが狭い）、というのが理屈です。なお、Python の標準ライブラリも、攻撃の足掛かりにされるようなビルドしたりインストールするためのものは省かれています。そのため`python -m pip`でインストールを行った標準的なやり方はでず、必然的にマルチステージビルドが必要になります。

Distroless は debug にするとシェル入りになる以外の選択肢がなく、イメージ作成には Debian ベースの標準の Python イメージを使いましたが、Chainguard はシェルなしの latest と、開発ツールやシェル、pip モジュールなどの開発用の標準ライブラリも揃っている latest-dev の 2 つがあり、どちらも Chainguard で揃えられます。なお、Chainguard の OS は Debian ではなく、[Wolfi](https://wolfi.dev)というもので、これも Chainguard がメンテナンスしています。apk コマンドがあるので Alipne 系な雰囲気ですが、musl ではなく readelf で見てみると libc を使ってそうなところも Python 的には良いですね。

Chainguard の[° ドキュメント](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/python/#step-2-creating-the-dockerfile-1)を見ると、venv を持ってきてそれを使っています。以前のエントリーでは Distroless はシェルがないので venv を使う方式は避けて無理やり site-packages に入れる方針でやりましたがバージョン番号固定の Dockerfile になってしまうのでこちらの方が良いですね。

```Dockerfile
# syntax=docker/dockerfile:1

# ビルド用イメージ
FROM cgr.dev/chainguard/python:latest-dev AS builder
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /opt/app
RUN python -m venv /opt/app/venv
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    /opt/app/venv/bin/pip install -r requirements.txt

# 実行用イメージ
FROM cgr.dev/chainguard/python:latest AS runner
WORKDIR /opt/app
ENV PYTHONUNBUFFERED=1
ENV PATH="/venv/bin:$PATH"
COPY --from=builder /opt/app/venv /venv
COPY main.py /opt/app/main.py
EXPOSE 80
ENTRYPOINT ["python", "/venv/bin/fastapi", "run", "main.py", "--port", "80"]
```

Chainguard のドキュメントだと古い COPY と RUN を組み合わせた書き方になっていますが、マルチステージビルドであったとしても、cache/bind マウントを活用する方がキャッシュ効率を上げつつ、キャッシュのために余計なパズルを組み立てる必要はないというメリットは得られます。

## Distroless

前回書いた Distroless のイメージ作成方法は site-packages を丸ごと持ってくるちょっと無理やりな方法で実現していました。Chainguard のやり方がスマートだったので、それと同様の venv を使った方式でやってみます。

なお、前回書き忘れましたが、`:debug`付きイメージはエントリポイントとしてシェル(busybox)を起動できます。Distroless の Python イメージは、本来シェルが指定される ENTRYPOINT に Python インタプリタが指定されているのでシェルを起動する場合はイメージ名の後ろにコマンドを書いてもダメで、`--entrypoint`引数でシェルを渡す必要があります。

```sh
docker run --rm -it --entrypoint=sh gcr.io/distroless/python3-debian12:debug
```

```Dockerfile
# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.11.2
ARG DISTROLESS=python3-debian12

# ビルド用イメージ
FROM python:${PYTHON_VERSION}-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt
# debianとdistrolessでPythonのフォルダが違うのでvenvの中のシンボリックリンクを修正
RUN rm /opt/app/venv/bin/python
RUN ln -s /usr/bin/python /opt/app/venv/bin/python

# 実行用イメージ
FROM gcr.io/distroless/${DISTROLESS}:debug AS runner
WORKDIR /opt/app
ENV PYTHONUNBUFFERED=1
ENV PATH="/venv/bin:$PATH"
COPY --from=builder /opt/app/venv /venv
COPY main.py /opt/app/main.py
EXPOSE 80
ENTRYPOINT ["python", "/venv/bin/fastapi", "run", "main.py", "--port", "80"]
```

Chainguard と違ってビルド用イメージと実行用イメージが違う関係で Python のパスが違っており、それにより venv フォルダ(中で Python インタプリタへのシンボリックリンクを持っている)をそのまま持ってきてもうまくいきませんのでちょっとリンクを貼り直す行が必要です。おかげで venv に詳しくなりました。

- [えんでぃの技術ブログ: venv が動作する仕組みを調べてみた](https://endy-tech.hatenablog.jp/entry/how_venv_works_in_python)

# まとめ

Docker の更新そのものは追っかけてましたが、それにより Python のイメージの作成がどう変わったのかというのは把握できていなかったので「なぜそうなっているのか」「今の時代どうすべきか」を調べながら書いてみました。また、FastAPI 自身もアップデートがあり、実行方法が簡単になっていた（簡単になりすぎて不安になった）ので、それも盛り込んでみました。
