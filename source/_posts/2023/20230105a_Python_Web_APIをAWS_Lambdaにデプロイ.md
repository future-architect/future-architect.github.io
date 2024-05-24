---
title: "Python Web APIをAWS Lambdaにデプロイ"
date: 2023/01/05 00:00:00
postid: a
tag:
  - WebAPI
  - AWS
  - Docker
category:
  - Programming
thumbnail: /images/20230105a/thumbnail.png
author: 村上知優
lede: "この記事はフューチャー Advent Calendar 2022の14日目の記事です。PythonのWeb APIをLambdaにデプロイする方法について解説します。"
---
この記事は[フューチャー Advent Calendar 2022](https://qiita.com/advent-calendar/2022/future)の14日目の記事です。


# はじめに

こんにちは。TIG DXユニットの村上です。

PythonのWeb APIをLambdaにデプロイする方法について解説します。

PythonでWeb APIを構築する方法は[OpenAPI GeneratorでPython Web API構築](/articles/20221203a/)をご覧ください。

本記事ではPython Web APIのアプリ実装は完成している前提で、下図の流れでデプロイする手順を解説します。

<img src="/images/20230105a/image.png" alt="PythonアプリをDockerコンテナイメージビルド→ECR→Lambdaにデプロイする" width="778" height="495" loading="lazy">


# Lambda起動用のモジュール

Lambdaでは起点となる関数とAPI Responseを返すreturn命令が必要になります。
これらを満たすモジュールを実装します。

```python lambda.py
import awsgi
import connexion
from openapi_server import encoder


def lambda_handler(event, context):
    app = connexion.App(__name__, specification_dir="./openapi/")
    app.app.json_encoder = encoder.JSONEncoder
    app.add_api(
        "openapi.yaml",
        arguments={"title": "Stock API"},
    )
    return awsgi.response(app, event, context)
```

`lambda_handler`をLambda起動用関数に設定することで、APIを機能させることができます。

# デプロイする方法

Lambdaにソースコードをデプロイする方法は2種類あります。
1. ソースコードとその依存ライブラリをZIPにアーカイブしてアップロードする
2. ECRのコンテナイメージをアップロードする

Pythonのソースコードをアップロードする場合は2番のECRからアップロードする方法をお勧めします。
というのも最近のPythonライブラリは容量が大きく、例えばPandasだけでも約50MBあります。
ZIPアップロード方式の場合は解凍前50MB、解凍後250MBまでという制限があるため、依存ライブラリの数とサイズによってはこの制限に引っ掛かり、アップロードできません。
一方でECR方式の場合はイメージサイズが10GBまでOKなのでかなり違いがあることが分かると思います。

その他詳しい制限については以下をご覧ください。

https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/gettingstarted-limits.html

本記事ではECRからデプロイする方法を解説します。

# デプロイ用Dockerfileの作成

デプロイ用のDockerfileには依存ライブラリとLambda起動用のランタイムのインストールが必要になります。
Pythonのパッケージ管理には[Poetry](https://python-poetry.org/)を使っている場合を想定し、Dockerfileを以下のように実装します。

```dockerfile Dockerfile
ARG FUNCTION_DIR="/usr/src/app"

FROM python:3.7.13

ARG FUNCTION_DIR

RUN mkdir -p ${FUNCTION_DIR}
WORKDIR ${FUNCTION_DIR}

RUN apt-get install gcc g++ libc-dev

RUN pip install poetry

COPY pyproject.toml poetry.lock ./

RUN poetry export -f requirements.txt > requirements.txt

RUN pip uninstall poetry --yes

RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --target ${FUNCTION_DIR} awslambdaric

COPY ./ ${FUNCTION_DIR}

ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric" ]

CMD [ "openapi_server/lambda.lambda_handler" ]
```

poetryはその性質上docker内に仮想環境を構築する必要がありますが、それは面倒なのでpipで依存ライブラリをインストールします。
注意点として、poetryとそれ以外のライブラリはpipの依存関係チェックでエラーになる可能性があります。poetryで出力された`requirements.txt`に記述されたライブラリはpoetryによって依存関係の整合性が保証されていますが、その依存関係にpoetry自身は存在しません。このdocker内ではpipによってpoetryとそれら以外のライブラリがはじめて依存関係チェックの対象となるため、エラーになる可能性があります。よってpoetryは`requirements.txt`を出力したら速やかに削除します。
また、Lambdaで起動するためには[awslambdaric](https://github.com/aws/aws-lambda-python-runtime-interface-client)というランタイムが必要なため、合わせてインストールします。

# AWS CLIからデプロイする

上記のDockerfileをビルドします。
proxy環境の場合はそのままではdocker内で各パッケージのインストールが行えないため、`--build-arg`にプロキシを設定する必要があります。

```bash
$ docker build \
    -f ./Dockerfile \
	-t "<AWSアカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>:latest" \
	--build-arg https_proxy=${https_proxy} \
	../.
```

ビルドができたらECRにプッシュします。

```bash
$ docker push <AWSアカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>:latest
```

プッシュが完了したらECRからLambdaにアップロードします。

```bash
$ aws lambda update-function-code --function-name <Lambda名> \
	--image-uri <AWSアカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>:latest
```

# おわりに

最後までお読みいただきありがとうございました！

Lambdaにコンテナイメージをアップロードする方法は制限が緩く使いやすい反面、ランタイムが必要だったり、ECRのリポジトリを用意しないといけなかったりと、少し手間がかかります。
本記事が参考になれば幸いです。

明日はtutuzさんの[技術記事執筆のススメ](https://qiita.com/tutuz/items/a2db0a78e5977b3d942b)です！
