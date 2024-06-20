---
title: "個人的docker composeおすすめtips 9選"
date: 2024/06/20 00:00:00
postid: a
tag:
  - Docker
  - DockerCompose
  - Tips
category:
  - Infrastructure
thumbnail: /images/20240620a/thumbnail.jpg
author: 市川燿
lede: "docker composeを利用しているでしょうか？複数のdockerコンテナをまとめて立ち上げたり、環境変数を定義できたり便利ですよね。今回はある程度docker composeを利用している方向けに私が便利、便利そうと感じたdocker composeの機能を挙げてみました。"
---

<img src="/images/20240620a/20210117130925.jpg" alt="" height="800" width="384">

本記事は[「珠玉のアドベントカレンダー記事をリバイバル公開します」](/articles/20240617a/)企画のために、[以前Qiitaに投稿した記事](https://qiita.com/hichika/items/9b96634d471246359e66)を一部ブラッシュアップしたものになります。

## はじめに

みなさん、docker composeを利用しているでしょうか？

複数のdockerコンテナをまとめて立ち上げたり、環境変数を定義できたり便利ですよね。

この記事ではある程度docker composeを利用している方向けに私が便利、便利そうと感じたdocker composeの機能を挙げてみました。

## docker compose cli v2を利用

`docker-compose`ではなく [docker compose](https://matsuand.github.io/docs.docker.jp.onthefly/compose/cli-command/)コマンドも利用可能になっています。

Docker Desktopでは v3.4.0から利用可能で、基本的にはコマンドの互換性あります。

## ファイル監視による自動更新

docker compose 2.20.0から[Compose Watch](https://docs.docker.com/compose/file-watch/)の機能が利用できるようになりました。

ホットリロードのような機能で以下の3つのモードが用意されています。

|モード<br>(compose.yamlでの記載)|ファイル更新時の挙動|利用例|
|-|-|-|
|Sync<br>(sync)|ホスト側のファイル変更がコンテナ側に反映される|<ul><li>ホットリロード機能を内蔵しているサービス</li></ul>|
|Rebuild<br>(rebuild)|イメージをビルドしコンテナを入れ替える<br>(docker comopse up --build相当)|<ul><li>コンパイル後の言語</li><li>package.jsonの変更などイメージの再ビルドが必要な場合</li></ul>|
|Sync + Restart<br>(sync+restart)|ファイル変更を反映し、コンテナをリスタートする<br>(Sync + docker compose restart相当)|<ul><li>データベースのconfig変更</li><li>nginx.confの更新</li></ul>|

記載方法は以下のようになります。

```yaml compose.yaml
services:
  web:
    build: .
    command: npm start
    develop:
      watch:
        - action: sync
          path: ./web
          target: /src/web
          ignore:
            - node_modules/
        - action: rebuild
          path: package.json
```

## docker composeファイル名

docker composeではv2から `compose.yaml` が[推奨](https://docs.docker.com/compose/compose-application-model/#the-compose-file)されるように変更になっています。

現在ワークディレクトリの以下のファイルがデフォルトで利用可能です。

- compose.yaml
- compose.yml
- docker-compose.yml
- docker-compose.yaml

複数ファイルが存在した場合優先されるのは上記の順で適用されるようです。

Warnログが出力され、適用されたファイルを確認できます(composeはyamlが優先、docker-composeはymlが優先になってます)。

```shell
$ docker compose up
WARN[0000] Found multiple config files with supported names: /tmp/compose-sample/compose.yaml, /tmp/compose-sample/compose.yml, /tmp/compose-sample/docker-compose.yml, /tmp/compose-sample/docker-compose.yaml
WARN[0000] Using /tmp/compose-sample/compose.yaml
```

デフォルトのファイル名以外を利用したい場合、また別階層のファイルを指定したい場合には、`-f` オプションで指定可能です。

## Docker image名やコンテナ名のプレフィックスをディレクトリ名から変更する

通常は `${ディレクトリ名}_${サービス名}`でイメージが作成されます。
`compose.yaml` のトップレベルに [`name:` を記載することで変更](https://docs.docker.com/reference/cli/docker/compose/#use--p-to-specify-a-project-name)でき、`${name}_${サービス名}`にイメージ名を変更可能です。

```yaml compose.yaml
name: sample
services:
  ...(省略)...
```

また、以下の方法でも変更可能です。

環境変数`COMPOSE_PROJECT_NAME`でプロジェクト名を指定することにより`${プロジェクト名}_${サービス名}`にイメージ名を変更可能です。

- 例: `sample_${サービス名}`でイメージを作成したい場合
```bash .env
COMPOSE_PROJECT_NAME=sample
```

`--project ${プロジェクト名}`を指定することによりコマンドライン引数でも指定可能です。

```bash
docker compose build --project ${project名}
```

## ヘルスチェックの設定

Dockerfileでも指定できますが、[docker-compose.ymlでも指定可能](https://docs.docker.com/compose/compose-file/compose-file-v3/#healthcheck)です。

コンテナに対しコマンドを実行し終了コードなどによりヘルスチェックができます。

ヘルスチェックを利用することで依存関係の設定、サービス完了まで待機でサービスが `healthy`になるまで待機することが可能です。

```yaml compose.yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost"]
  interval: 1m30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## 依存関係の設定

以前はコンテナの依存関係しか指定できませんでしたが、docker compose2.1からサービスがhealthyになった後に起動する、正常終了したあとに実行するなど、より[高度な依存関係を定義できるようになりました](https://docs.docker.jp/compose/compose-file/compose-file-v2.html#depends-on)。

使用可能な条件は以下:

- service_started: 依存するサービス開始まで待機。(ステータスは問わない)
- service_healthy: 依存するサービスが `healthy`になるまで待機
- service_completed_successfully: 依存するサービスが正常終了するまで待機

```yaml compose.yaml
services:
  web:
    build: .
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
  redis:
    image: redis
  db:
    image: postgres
    healthcheck:
      test: "exit 0"
```

## サービス完了まで待機

`docker compose up`に`--wait`オプションを利用することで、ヘルスチェックが設定されたサービスが定常状態になるまで待機することが可能です(執筆時点では`--wait`オプションは[ドキュメントに記載されていません](https://docs.docker.jp/engine/reference/commandline/compose_up.html))。

以前はワンショットのサービスには `--wait`が効かないバグがありましたが[v2.7.0で修正](https://docs.docker.com/compose/release-notes/#270)されたようです。

また、待機タイムアウトを設定したい場合には `--wait-timeout (秒数)` で利用可能です。

## サービスをグループ化

[profiles](https://docs.docker.com/compose/profiles/)という機能を利用し、複数のサービスをまとめて起動・終了などをすることが可能です。

以前から`depends_on`で依存関係を指定することで依存したサービスをまとめて立ち上げることができていましたが、profilesによって依存関係がないサービスもまとめて立ち上げることが可能になりました。

```yaml compose.yaml
services:
  web:
    image: web

  mock-backend:
    image: backend
    profiles: ["dev"]
    depends_on:
      - db

  db:
    image: mysql
    profiles: ["dev"]

  phpmyadmin:
    image: phpmyadmin
    profiles: ["debug"]
    depends_on:
      - db
```

```bash
docker compose --profile dev up
```

## versionの廃止

`compose.yaml` のトップレベルの[versionの記載が不要](https://docs.docker.com/compose/compose-file/04-version-and-name/)になりました。
記載するとエラーが出るようになっています。

```shell
$ docker compose up
WARN[0000] /tmp/compose-sample/compose.yaml: `version` is obsolete
[+] Running 1/0
...(省略)...
```

<details><summary>警告が出るcompose.yamlサンプル</summary>

```yaml compose.yaml
version: "3" # この部分が不要
services:
  cpsyml:
    image: hello-world:latest
```
</details>

## おわりに

本記事により皆さまのdocker composeライフが少しでも豊かなものになれば幸いです。

よろしければ、他の[「珠玉のアドベントカレンダー記事をリバイバル公開します」](https://future-architect.github.io/articles/20240617a/)の記事もご覧ください。
