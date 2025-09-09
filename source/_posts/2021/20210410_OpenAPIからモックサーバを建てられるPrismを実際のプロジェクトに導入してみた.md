---
title: "OpenAPIからモックサーバを建てられるPrismを実際のプロジェクトに導入してみた"
date: 2021/04/10 00:00:00
postid: ""
tag:
  - Swagger
  - OpenAPI
  - Vue.js
  - モック
category:
  - Frontend
thumbnail: /images/2021/20210410/thumbnail.png
author:  大岩潤矢
lede: "参加しているプロジェクトで、OpenAPI定義ファイルからモックサーバを建てることができるOSSツール「Prism」を導入することになりました。この記事では、Prism導入の手順や、躓いた点などを紹介します。"
---

こんにちは！ フューチャー22卒内定者の大岩と申します。現在は、TIG DXユニットでアルバイトとして従事しています。

## はじめに

私が参加しているプロジェクトで、**OpenAPI定義ファイルからモックサーバを建てることができるOSSツール「Prism」**を導入することになりました。この記事では、Prism導入の手順や、躓いた点などを紹介します。

## 導入の背景

現プロジェクトでは、フロントエンドにVue.jsを採用し、バックエンドはGo言語で書かれたAPIサーバ2台で構成されています。これまでフロントエンドの開発を行う際には、ローカルでAPIサーバとDBを立ち上げる必要があり、フロントエンドを少しだけ変更したいという場合でもかなりの手間が掛かっていました。そこで**モックサーバを構築し、画面の開発の際にはそこからデータを取得出来れば、フロントエンドの作業が格段に楽になる**と考えました。

バックエンドのAPIドキュメントは、OpenAPI(Swagger)形式で整備されています。そこで、このOpenAPI形式のファイルからモックサーバを建てることができる、Stoplight社のOSSツール「Prism」を採用しました。

## OpenAPI(Swagger)について

**OpenAPI**とは、API構造を記述する**インタフェース記述言語**です。yamlもしくはjsonで記述することで、綺麗なAPIドキュメントを作成できたり、この記事で紹介するようにモックサーバを建てることができます。

OpenAPIは、もともとはSwaggerという名前で開発が進められていました。2015年に、もともとの開発元であったSmartBear Softwareから、OpenAPI Initiativeへ移されると同時に `Swagger Specification` から `OpenAPI Specification` (以下OASと記載) という名前に変わりました。なお、現在でも「Swagger UI」や「Swagger Editor」などのOpenAPIドキュメントを整備するツール群は `Swagger` の名前が使われています。

このFuture Tech Blogでも、OpenAPIに関する記事が多く公開されています。詳細は[こちら](/tags/Swagger/)をご覧ください。

### Prismについて

Prismとは、API設計関係のツールを提供するStoplight社によって開発されている、**OSSのHTTPモックツール**です。OAS2.0およびOAS3.0に準拠したドキュメントから、自動的にモックサーバを構築できます。

今回使用したバージョンは、v4.1.2です。

https://github.com/stoplightio/prism

## 実際に導入してみる

### インストール方法

まずはPrismのパッケージをnpm経由で、プロジェクトの `devDependencies` に追加します。

```bash
npm install -D prism
```

あとは、`npx` で起動してみて、モックサーバが起動できていたら完了です。以下の例は、カレントディレクトリ内にある `swagger.yaml` ファイルを指定して、8080番ポートで起動する例です。

```bash
npx prism mock ./swagger.yaml -p 8080
```

これを実行すると、**OpenAPIファイルに記載されている全てのエンドポイントのURLが一覧で表示**されます（ここでは、 [Swagger Petstore](https://petstore.swagger.io/) を実行した結果を掲載しています）

```bash
$ npx prism mock ./swagger.yaml -p 8080
[14:30:40] › [CLI] …  awaiting  Starting Prism…
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/pet
[14:30:40] › [CLI] ℹ  info      PUT        http://127.0.0.1:8080/pet
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/pet/findByStatus?status=sold,sold,sold,available,pending,pending,pending,pending,available,available,available,pending,pending,sold,available,available,pending,sold,available,pending
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/pet/findByTags?tags=quis,aperiam,velit,repudiandae,et,rem,accusantium,omnis,ut,eius,dolor,enim,nam,et,ipsam,velit,est,veritatis,nesciunt,possimus
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/pet/127
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/pet/128
[14:30:40] › [CLI] ℹ  info      DELETE     http://127.0.0.1:8080/pet/483
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/pet/641/uploadImage
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/store/inventory
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/store/order
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/store/order/10
[14:30:40] › [CLI] ℹ  info      DELETE     http://127.0.0.1:8080/store/order/963
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/user
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/user/createWithArray
[14:30:40] › [CLI] ℹ  info      POST       http://127.0.0.1:8080/user/createWithList
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/user/login?username=itaque&password=exercitationem
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/user/logout
[14:30:40] › [CLI] ℹ  info      GET        http://127.0.0.1:8080/user/quo
[14:30:40] › [CLI] ℹ  info      PUT        http://127.0.0.1:8080/user/fugiat
[14:30:40] › [CLI] ℹ  info      DELETE     http://127.0.0.1:8080/user/minima
[14:30:40] › [CLI] ▶  start     Prism is listening on http://127.0.0.1:8080
```

確かにこの表示されたURLにアクセスしてみると、モックデータが返却されるようです。

例として、 `GET /pet/{petId}` を見てみましょう。[Swagger Petstore](https://petstore.swagger.io/) のOpenAPI定義ファイルでは、以下のように記述されています。

```yaml
  /pet/{petId}:
    get:
      tags:
      - "pet"
      summary: "Find pet by ID"
      description: "Returns a single pet"
      operationId: "getPetById"
      produces:
      - "application/xml"
      - "application/json"
      parameters:
      - name: "petId"
        in: "path"
        description: "ID of pet to return"
        required: true
        type: "integer"
        format: "int64"
      responses:
        "200":
          description: "successful operation"
          schema:
            $ref: "#/definitions/Pet"
        "400":
          description: "Invalid ID supplied"
        "404":
          description: "Pet not found"
      security:
      - api_key: []
(中略)
definitions:
  Pet:
    type: "object"
    required:
    - "name"
    - "photoUrls"
    properties:
      id:
        type: "integer"
        format: "int64"
      category:
        $ref: "#/definitions/Category"
      name:
        type: "string"
        example: "doggie"
      photoUrls:
        type: "array"
        xml:
          name: "photoUrl"
          wrapped: true
        items:
          type: "string"
      tags:
        type: "array"
        xml:
          name: "tag"
          wrapped: true
        items:
          $ref: "#/definitions/Tag"
      status:
        type: "string"
        description: "pet status in the store"
        enum:
        - "available"
        - "pending"
        - "sold"
    xml:
      name: "Pet"
```

ここでは、 `name` というプロパティに `example` として `Doggie` という値が指定されています。では、モックサーバから返却される値を見てみます。

```json
{
   "id":0,
   "category":{
      "id":0,
      "name":"string"
   },
   "name":"doggie",
   "photoUrls":[
      "string"
   ],
   "tags":[
      {
         "id":0,
         "name":"string"
      }
   ],
   "status":"available"
}
```

ちゃんとexampleで指定した値が返ってきていることがわかります。exampleを指定していない部分は、 `0` や　`"string"` に固定されてしまうものの、正しい型で返ってきています。なお、モックサーバの起動時に `-d` オプションをつけることで、値をランダムに変更できます。

### `basePath` が反映されない

ここが詰まったポイントです。今回Prismを導入したプロジェクトではOAS2.0を使用しており、現行最新版のOAS3.0と比べると、仕様が異なる点があります。

OAS2.0では、エンドポイントのパスを以下のように設定します。

```yaml
host: "petstore.swagger.io"
basePath: "/v2"
schemes:
- "https"
```

OAS3.0では `basePath` が削除され、以下のように記述します。

```yaml
servers:
  - url: https://petstore.swagger.io/v2
    description: server description
```

`schemes`、 `host`、 `basePath` が `servers` という1つのプロパティにまとまったおかげで見やすくなりました。

Prismはv3からOAS3.0での書き方に準拠するようになり、 **OAS2.0のファイルを読み込ませると、`basePath`を読み取ってくれず、エンドポイントのパスに反映されません** 。つまり、 `https://petstore.swagger.io/v2/pets` というエンドポイントを定義していたとしても、Prismでは `https://petstore.swagger.io/pets` として認識してしまいます。

これではモックサーバとしての意味を為さないため、**エンドポイントのパスを変更する必要**があります。

#### Vue CLIのプロキシ機能で解決する

今回のフロントエンドで利用しているVue.jsは、Vue CLIを用いて環境構築されています。Vue CLIには、webpackの `DevServer` の機能が内包されており、ホットリロードなどを実現しています。この機能の1つに、 **APIサーバなど外部のサーバをプロキシして接続する機能**があります。

このプロキシ機能で、 `pathRewrite` というオプションを指定すると、**パスを上書き**できます。

実際に設定してみましょう。例えば、フロントエンドから `http://localhost:3000/api1/v1/` にリクエストを飛ばすと、 `http://localhost:8080/api1/v1/` に繋がるようになっている環境であるとします。

```javascript vue.config.js
module.exports = {
  devServer: {
    port: 3000,
    proxy: {
      '^/api1/': {
        target: 'http://localhost:8080/',
      },
      '^/api2/': {
        target: 'http://localhost:8081/',
      }
    }
  }
};
```

<img src="/images/2021/20210410/image.png" alt="通常の構成" loading="lazy">

このAPIサーバ `api1` と `api2` をモックサーバに置き換えたいとします。しかし、前述の通りPrismでは `/api1/v1` の部分を無視してしまうため、そのままではアクセスできません。そこで使うのが、 `pathRewrite` オプションです。

例えば以下の例では、 `NODE_ENV` に `design` という値が設定されている場合のみ、 `http://localhost:3000/api1/v1/` が `http://localhost:8080/` にプロキシされるように設定しています。

```javascript vue.config.js
module.exports = {
  devServer: {
    port: 3000,
    proxy: {
      '^/api1/': {
        target: 'http://localhost:8080/',
        pathRewrite:
          process.env.NODE_ENV === 'design' ? { '^/api1/v1/': '/' } : null
      },
      '^/api2/': {
        target: 'http://localhost:8081/',
        pathRewrite:
          process.env.NODE_ENV === 'design' ? { '^/api2/v1/': '/' } : null
      }
    }
  }
};
```

<img src="/images/2021/20210410/image_2.png" alt="MOCサーバを交えた構成" loading="lazy">

これで、実際に先ほどの手順でモックサーバを起動してみて、 `http://localhost:3000/api/v1/` にアクセスしレスポンスが返ってきたらOKです。

### npm scriptでコマンド一つで起動できるようにする

せっかくなので**コマンド一つで起動できるようにして、楽に開発がスタートできるように**しておきたいです。まずは、以下のパッケージをインストールします。

```bash
npm install -D cross-env concurrently
```

[cross-env](https://www.npmjs.com/package/cross-env) は、Windows環境下で `NODE_ENV` を指定すると正常にコマンドを実行できない問題があるため、**環境差異を解消**すべく導入しています。

[concurrently](https://www.npmjs.com/package/concurrently) は、**同時に複数のコマンドを実行できる**ようにします。今回はPrismによるモックサーバを2つ、vue-cliの開発サーバを1つ、合計3つのコマンドを同時実行させます。

インストールできたら、 `package.json` の `scripts` に追記します。ここでは、モックサーバの起動スクリプトを別に分けて、モックサーバを個別で起動できるようにもしています。

```json package.json
{
  scripts: {
    "design": "cross-env NODE_ENV=design concurrently \"npm run mock-1\" \"npm run mock-2\" \"vue-cli-service serve --mode design --open\"",
    "mock-1": "npx prism mock ./swagger1.yaml -p 8080",
    "mock-2": "npx prism mock ./swagger2.yaml -p 8081"
  }
}
```

あとは、

```bash
npm run design
```

を実行すれば、モックサーバが2つとVue CLIの開発サーバが立ち上がり、 `http://localhost:3000` で確認できるようになります。これで、簡単にフロントエンドを開発できるようになりました！ 🎉

## 補足: nginxを使ってプロキシする方法

今回のプロジェクトでは、Vue CLIを使っていたため、簡単にプロキシできました。しかし、中にはプロキシ機能をもたないものを利用しているケースもあると思います。

そこで、 `docker-compose` を用いて `nginx` と `prism` のコンテナを立てて、`nginx`にプロキシさせる方法を紹介します。

### docker-composeファイル

まず、`nginx` のコンテナに `nginx:alpine` のイメージを選択し、8080番ポートと8081番ポートを開け、volumesに設定ファイルを指定します。次に、それぞれのモックサーバのコンテナに `stoplight/prism:3` のイメージを選択し、volumesにOpenAPIファイルを指定します。

```yaml docker-compose.yaml
version: '3'
services:
  nginx:
    image: nginx:1.19-alpine
    ports:
      - 8080:8080
      - 8081:8081
    volumes:
      - ./default.conf:/etc/nginx/conf.d/default.conf
  api1-mock:
    image: stoplight/prism:4
    command: mock -h 0.0.0.0 /swagger.yaml
    volumes:
      - ./swagger1.yaml:/swagger.yaml
  api2-mock:
    image: stoplight/prism:4
    command: mock -h 0.0.0.0 /swagger.yaml
    volumes:
      - ./swagger2.yaml:/swagger.yaml
```

### nginx設定ファイル

nginx設定ファイルは、 `location` の部分にパスを書き、プロキシの設定を書くことで、**そのパス以降に来たリクエストをリバースプロキシできるようになります。この例では、 `0.0.0.0:8080/api1/v1` に来たアクセスを、 `api1-mock` コンテナの4010番ポートにプロキシするように設定しています。

```conf default.conf
server {
    listen       8080;
    server_name  0.0.0.0:8080;
    location /api1/v1/ {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://api1-mock:4010/;
    }
}

server {
    listen       8081;
    server_name  0.0.0.0:8081;
    location /api2/v1/ {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://api2-mock:4010/;
    }
}
```

あとは、docker-compose.yamlファイルがある場所で、以下のコマンドを実行すると、2つのモックサーバを同時に立ち上げることができます。

```bash
docker-compose -p (任意の名前) up -d
```

立ち上げた後に、 `http://localhost:8080/api1/v1/` にアクセスして、レスポンスが返ってきたらOKです。

## まとめ

Prismを使うことで、OpenAPIファイルさえ記述していれば簡単にモックサーバとして機能し、開発に効果的に組み込むことができます。ローカルにバックエンドサーバを立ち上げる手間が省けて、**開発体験を格段に向上**させることができました。

ぜひ皆さんも快適な開発環境構築のために、導入を検討してみてはいかがでしょうか。
