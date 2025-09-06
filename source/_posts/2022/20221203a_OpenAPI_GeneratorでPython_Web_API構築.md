---
title: "OpenAPI GeneratorでPython Web API構築"
date: 2022/12/03 00:00:00
postid: a
tag:
  - Swagger
  - WebAPI
  - Python
  - OpenAPIGenerator
category:
  - Programming
thumbnail: /images/2022/20221203a/thumbnail.png
author: 村上知優
lede: "PythonでWebAPIを構築しました。その際にOpenAPI Generatorが便利だったのでご共有します。"
---

<img src="/images/2022/20221203a/top.png" alt="" width="941" height="481">

この記事は[Python Advent Calendar 2022](https://qiita.com/advent-calendar/2022/python) カレンダー2の3日目です。昨日はtttakehさんの[じゃんけん画像を分類してみた](https://zenn.dev/takeguchi/articles/672ff3b34753a7)でした。

# はじめに

こんにちは。TIG DXユニットの村上です！

さて、私の所属しているプロジェクトではバックエンドシステムに主にGo言語を用いており、Go言語によるWeb APIを構築しています。

例えば[LambdaとGoを使ったサーバーレスWebAPI開発実践入門](/articles/20200927/)など、Future Tech Blogには多くのノウハウが投稿されていますので是非ご覧になっていただければと思います。

今回はGo言語ではなくPythonでWeb APIを構築しました。その際にOpenAPI Generatorが便利だったのでご共有します。

# OpenAPI Generator

[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)はAPIリクエストやレスポンスの内容を定義し、それを元にプログラムを自動生成するツールです。

API定義ファイルの書き方の例と、そこからコードを自動生成する方法をご紹介します。

## API定義ファイル

今回のファイル名は`openapi.yaml`とします。
以下のようにリクエストパラメータやレスポンスを定義します。

```yaml
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Stock API
servers:
  - url: http://localhost:3003
tags:
  - name: stockPrice
    description: 株価取得
paths:
  /v1/sc/{security_cd}/stockPrice:
    get:
      summary: 株価取得
      operationId: stockPrice
      description: 現在の株価を取得する
      tags:
        - stockPrice
      parameters:
        - name: security_cd
          in: path
          description: 証券コードを指定する
          required: true
          schema:
            type: string
          example: "4722"
      responses:
        "200":
          description: success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/StockPrice"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "404":
          description: Not Found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        default:
          description: "その他予期せぬエラー"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
components:
  schemas:
    StockPrice:
      properties:
        price:
          type: number
          format: double
          description: 現在の株価
          example: 1741
        open:
          type: number
          format: double
          description: 始値
          example: 1715
        high:
          type: number
          description: 高値
          example: 1762
        low:
          type: number
          description: 安値
          example: 1704
        volume:
          type: number
          description: 出来高
          example: 221400
    Error:
      properties:
        message:
          type: string
          description: エラーメッセージ
        field:
          type: string
          description: エラー種別
    OK:
      properties:
        message:
          type: string
```

`operationId`で指定した部分が自動生成コードに関数名として反映されます。

## コードの自動生成

生成方法はいくつかありますが、今回はdockerを使って自動生成します。
サーバ側、クライアント側どちらを生成するかはgeneratorのコマンドライン引数によって決まります。
例えばサーバ側をPython、クライアント側をGolangで生成する場合、以下のようになります。

```bash
サーバ側
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate -i /local/openapi.yaml -g python-flask -o /local

クライアント側
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate -i /local/openapi.yaml -g go -o /local
```

上記コマンドオプションの`-g`がgeneratorの指定になります。
generatorに指定できる引数は以下のコマンドで確認できます。

```bash
docker run --rm openapitools/openapi-generator-cli list
```

また、生成されるパッケージ名はデフォルトで`openapi_server`となりますが、以下のようにパッケージ名を明示的に指定することもできます。

```bash
docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate -i /local/openapi.yaml -g python-flask -o /local --package-name test_package
```

Pythonのimportパスにも関わってくるため、プロジェクトに沿った名前にすると良いと思います。

## 自動生成されたファイル

自動生成されたサーバ側のディレクトリ及びその内部のファイルを見ていきたいと思います。
上記の`openapi.yaml`からは以下の内容が出力されました。

```bash
.
├── Dockerfile
├── README.md
├── git_push.sh
├── openapi_server
│   ├── __init__.py
│   ├── __main__.py
│   ├── controllers
│   │   ├── __init__.py
│   │   ├── security_controller_.py
│   │   └── stock_price_controller.py
│   ├── encoder.py
│   ├── models
│   │   ├── __init__.py
│   │   ├── base_model_.py
│   │   ├── error.py
│   │   ├── ok.py
│   │   └── stock_price.py
│   ├── openapi
│   │   └── openapi.yaml
│   ├── test
│   │   ├── __init__.py
│   │   └── test_stock_price_controller.py
│   ├── typing_utils.py
│   └── util.py
├── requirements.txt
├── setup.py
├── test-requirements.txt
└── tox.ini
```

テスト用のファイルまで自動生成してくれます。
そのままこのディレクトリをプロジェクトディレクトリにできるレベルです。

### openapi_server

APIの本体は`openapi_server`になります。この中の`controllers`にAPIの中身を実装していくことになります。

個人的にはcontrollersのファイルにはエラーラッピングやDB接続などの前処理だけを書き、具体的なロジックは別ディレクトリに実装するのが良いと思います。これによってAPIが増えた時にcontrollersの中身が複雑になるのを避けることができます。

例えば以下のように`core`ディレクトリを作成し、さらにその中にAPIエンドポイントごとにディレクトリを用意します。

```bash
├── controllers
│   ├── __init__.py
│   ├── security_controller_.py
│   └── stock_price_controller.py
├── core
│   └── stock_price
│       ├── db.py
│       ├── handler.py
│       └── model.py
```

`handler.py`や`model.py`に具体的なロジックを実装し、`stock_price_controller.py`からそれを参照します。

`openapi`ディレクトリには`openapi.yaml`という生成元ファイルと同じ名前のファイルが生成されています。

中身も一見すると生成元と全く同じように見えますが、よく見ると`x-openapi-router-controller`という項目が増えています。

これはAPIへのルーティング設定で、そのAPIがコールされた際にどのファイルが呼び出されるかが定義されています。

```yaml
paths:
  /v1/sc/{security_cd}/stockPrice:
    get:
      description: 現在の株価を取得する
      operationId: stock_price
      parameters:
      - description: 証券コードを指定する
        example: "4722"
        explode: false
        in: path
        name: security_cd
        required: true
        schema:
          type: string
        style: simple
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StockPrice'
          description: success
        "400":
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
          description: Bad Request
        "404":
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
          description: Not Found
        "500":
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
          description: Internal Server Error
        default:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
          description: その他予期せぬエラー
      summary: 株価取得
      tags:
      - stockPrice
      x-openapi-router-controller: openapi_server.controllers.stock_price_controller
```

上記の場合、`/v1/sc/{security_cd}/stockPrice`がコールされた時、`openapi_server/controllers/stock_price_controller.py`の`stock_price関数`が呼び出されることになります。

### .openapi-generator-ignore

このファイルには自動生成時に上書きを禁止するディレクトリやファイルを指定します。

例えば`controllers`や`test`のファイルは自動生成を行うたびに中身が初期化されてしまうため、ここに追記します。

ちなみに手動で新規作成したファイルはそのまま残るため、ここに追加する必要はありません。

```
openapi_server/controllers/*
openapi_server/test/*
```

### Dockerfile

このDockerfileを使うことで、ローカルに簡単にwebサーバを立てることができます。

```bash
docker build -t openapi_server .
docker run -p 8080:8080 openapi_server
```

疎通確認をするとAPIのルーティングがしっかりと行われており、返り値が返却されることが分かると思います。

```bash
$ curl http://localhost:8080/v1/sc/4722/stockPrice
"do some magic!"
```

# おわりに

Python自体が動的型付け言語なだけあってプログラミング時に型を常に気にする必要があり、結構精神を擦り減らすと思います。

OpenAPI Generatorは型ヒントも付与してくれるため、なるべくコードを自動生成することで型に関する開発コスト削減にもつながると思います。

自動生成コードを使えば結果的にAPIの具体的なロジックだけ実装すれば良いレベルになりますので、採用するメリットは大きいと感じました。

明日は、fujineさんの[2022年にお世話になったオライリーのPython書籍5冊](https://qiita.com/fujine/items/58b4616d7f50c462d62f)です。
