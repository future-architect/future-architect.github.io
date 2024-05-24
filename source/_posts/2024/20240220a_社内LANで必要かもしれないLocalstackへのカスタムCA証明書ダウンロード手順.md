---
title: "社内LANで必要かもしれないLocalstackへのカスタムCA証明書ダウンロード手順"
date: 2024/02/20 00:00:00
postid: a
tag:
  - LocalStack
  - OpenSSL
  - プロキシ
category:
  - Infrastructure
thumbnail: /images/20240220a/thumbnail.png
author: 真野隼記
lede: "2023年3月31日にリリースされたLocalStack v2.0.0から、LocalStackのイメージ構成に変更が入りました。"
---

<img src="/images/20240220a/localstack.png" alt="" width="800" height="400">

# はじめに

TIG 真野です。

2023年3月31日にリリースされたLocalStack [v2.0.0](https://github.com/localstack/localstack/releases/tag/v2.0.0)から、LocalStackのイメージ構成に変更が入りました。利用する環境によってはKinesis Data Streamsなど一部のサービスを利用するときにカスタムCA証明書をダウンロードする必要がありました（後述する通り、Kinesis Data Streamsに関しては現在のバージョンでは対応不要ですので安心ください）。

この記事では、DockerのマルチステージビルドでOpenSSLを使って証明書をダウンロードして、LocalStackのカスタムイメージを作成する流れをまとめます。

[#8782](https://github.com/localstack/localstack/issues/8782)のIssueを見つけて対応を考えている人や、`installation of kinesis-mock failed`といったエラーログが出ていて困っている場合、おそらくこの記事が参考になります。

ただし、少なくてもKinesis Data Streamsに関しては、`v2.3.0` からアップデートが入り本記事の対応が不要になりました。LocalStackのその他サービスでハマった場合にこの記事を確認いただくと良いかなと思います。エラーログでこの記事を見つけた方は、LocalStackのバージョンを上げることで解決することもあるようですので、まずバージョンアップを試してみることを推奨します。

## 背景

LocalStackは様々なAWSサービスをローカルやCI環境で再現してくれるエミュレータです。こういったサービスの難しいポイントの1つは、AWSのサービスや機能はどんどん増え豊富になっていくため、追随するためにはイメージサイズが肥大化しいくことでしょう。

そのため、v2.0.0からは起動時に一度だけ外部からサービスが必要とするパッケージ読み込みキャッシュ。それにより、開発者の利用しないサービスが依存するパッケージは元のイメージから取り除き、容量削減を狙う方式になりました。

少しばかり複雑な手順を踏んでいる気がしますが、イメージサイズと利用勝手のバランスを取った賢いやり方に思えます。CIで利用するユーザにとってはイメージのpull時間の節約、しいては費用削減となるため嬉しい施策出ると思います。

一方でこれにより、DynammoDBなどでは[色々と問題](https://github.com/localstack/localstack/pull/8194)が多かったらしく、利用頻度が高いサービス（Issueではトップ15と書かれていますが今のところは数種類）が再びプリインストールする方向にするよという話も出ていました。

v3.1.0では、Dockerfileを見る限り、DynamoDBとLambdaはプリインストール方式に戻っていました（DynamoDBは（多分）DynamoDB LocalのJAR増加で、47MB程度イメージサイズが増えたようです）。

```Dockerfile https://github.com/localstack/localstack/blob/v3.1.0/Dockerfile#L184-L191
# Install packages which should be shipped by default
RUN --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/var/lib/localstack/cache \
    source .venv/bin/activate && \
    python -m localstack.cli.lpm install \
      lambda-runtime \
      dynamodb-local && \
    chown -R localstack:localstack /usr/lib/localstack && \
    chmod -R 777 /usr/lib/localstack
```

Kinesis Data StreamsなどもDynamoDBと同じようにプリインストールできないかという要望も[#8300](https://github.com/localstack/localstack/issues/8300)で上げられましたが、やはりイメージサイズとのバランス問題で棄却されています。何かしらプリインストールしないと困るユースケースが無いと追加はされないような雰囲気があります。


## Installation of kinesis-mock failed

LocalStackでKinesis Data Streamsのストリームを作成しようとした場合に、`Installation of kinesis-mock failed` というエラーが出るケースについて話します。ログ内容としては次のようなものです。

```sh
localstack-1  | SERVICES variable is ignored if EAGER_SERVICE_LOADING=0.
localstack-1  |
localstack-1  | LocalStack version: 2.0.2
localstack-1  | LocalStack Docker container id: ed6628bad076
localstack-1  | LocalStack build date: 2023-04-17
localstack-1  | LocalStack build git hash: 6b436786
localstack-1  |
localstack-1  | 2024-02-18T08:40:45.683  WARN --- [-functhread3] hypercorn.error            : ASGI Framework Lifespan error, continuing without Lifespan support
localstack-1  | 2024-02-18T08:40:45.683  WARN --- [-functhread3] hypercorn.error            : ASGI Framework Lifespan error, continuing without Lifespan support
localstack-1  | 2024-02-18T08:40:45.695  INFO --- [-functhread3] hypercorn.error            : Running on https://0.0.0.0:4566 (CTRL + C to quit)
localstack-1  | 2024-02-18T08:40:45.695  INFO --- [-functhread3] hypercorn.error            : Running on https://0.0.0.0:4566 (CTRL + C to quit)
localstack-1  | Ready.
localstack-1  | 2024-02-18T08:40:51.233  INFO --- [   asgi_gw_0] l.s.k.kinesis_mock_server  : Creating kinesis backend for account 000000000000
localstack-1  | 2024-02-18T08:40:52.044 ERROR --- [   asgi_gw_0] l.aws.handlers.logging     : exception during call chain: Installation of kinesis-mock failed.
localstack-1  | 2024-02-18T08:40:52.050  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 500 (InternalError)
localstack-1  | 2024-02-18T08:40:52.779  INFO --- [   asgi_gw_0] l.s.k.kinesis_mock_server  : Creating kinesis backend for account 000000000000
localstack-1  | 2024-02-18T08:40:53.108 ERROR --- [   asgi_gw_0] l.aws.handlers.logging     : exception during call chain: Installation of kinesis-mock failed.
localstack-1  | 2024-02-18T08:40:53.113  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 500 (InternalError)
localstack-1  | 2024-02-18T08:40:54.306  INFO --- [   asgi_gw_0] l.s.k.kinesis_mock_server  : Creating kinesis backend for account 000000000000
localstack-1  | 2024-02-18T08:40:54.384 ERROR --- [   asgi_gw_0] l.aws.handlers.logging     : exception during call chain: Installation of kinesis-mock failed.
localstack-1  | 2024-02-18T08:40:54.387  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 500 (InternalError)
localstack-1  | 2024-02-18T08:40:55.627  INFO --- [   asgi_gw_0] l.s.k.kinesis_mock_server  : Creating kinesis backend for account 000000000000
localstack-1  | 2024-02-18T08:40:55.694 ERROR --- [   asgi_gw_0] l.aws.handlers.logging     : exception during call chain: Installation of kinesis-mock failed.
localstack-1  | 2024-02-18T08:40:55.697  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 500 (InternalError)
localstack-1  | 2024-02-18T08:41:01.931  INFO --- [   asgi_gw_0] l.s.k.kinesis_mock_server  : Creating kinesis backend for account 000000000000
localstack-1  | 2024-02-18T08:41:02.086 ERROR --- [   asgi_gw_0] l.aws.handlers.logging     : exception during call chain: Installation of kinesis-mock failed.
localstack-1  | 2024-02-18T08:41:02.089  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 500 (InternalError)
localstack-1  |
localstack-1  | An error occurred (InternalError) when calling the CreateStream operation (reached max retries: 4): exception while calling kinesis.CreateStream: Installation of kinesis-mock failed.
```

公式ドキュメント[Custom TLS certificates](https://docs.localstack.cloud/references/custom-tls-certificates/)にも触れられています。非標準の TLS 証明書を使用するプロキシサーバーを利用する場合に発生するようです。原因はプロキシ、慣れたものです。

ドキュメントにDockerfileを拡張して証明書をインストールする手順があり、[Installation of kinesis-mock failed in LocalStack](https://shihaowey.medium.com/installation-of-kinesis-mock-failed-in-localstack-8c4bcb8a3b20)の記事では、`https://api.github.com`のCA 証明書にアクセスして取得する例が書かれています。

しかし、チームメンバー全員にこの手順を行ってもらうのは手間ですし、証明書をGit管理にもしたくないでしょう。ファイルサーバやGoogle Driveのようなコラボレーションツール上にも、こういった手順は廃れがちであるため、あまり配備したくない場合が多いでしょう。

## Dockerfile上で対応する

サーバからTLS証明書をダウンロードするために、OpenSSLを利用します。

[Get SSL Certificate from Server (Site URL) – Export & Download](https://www.shellhacks.com/get-ssl-certificate-from-server-site-url-export-download/) という記事が参考になります。

さきほどの `https://api.github.com` から証明書を取得するのであれば次のようなコマンドです。

```shg
echo | openssl s_client -servername api.github.com -connect api.github.com:443 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > custom-ca.cer
```

取得した `custom-ca.cer` を公式ドキュメント通り、 `CURL_CA_BUNDLE`、 `REQUESTS_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS` の環境変数にセットしたイメージを作れば対応完了です。

Dockerfileのマルチステージビルドを利用すると次のようになると思います。

```Dockerfile localstack/Dockerfile
FROM alpine/openssl:3.1.3 AS build
RUN echo | openssl s_client -servername api.github.com -connect api.github.com:443 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > custom-ca.cer

FROM localstack/localstack:3.1.0
COPY --from=build custom-ca.cer /usr/local/share/ca-certificates/cert-bundle.crt
RUN update-ca-certificates
ENV CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

docker-compose経由で起動したいので、次のようなYAMLファイルを準備します。

```yaml docker-compose.yaml
version: "3.8"

services:
  localstack:
    build:
      context: .
      dockerfile: localstack/Dockerfile
    ports:
      - "127.0.0.1:4566:4566/tcp"
    environment:
      - SERVICES=kinesis
    volumes:
      - "${LOCALSTACK_VOLUME_DIR:-./volume}:/var/lib/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

`docker-compose up localstack` などで起動すると、Kinesis Data Streamsのリソース作成ができるようになっていると思います。3つのほどストリームを作成してみたときのログです。

```sh
localstack-1  |
localstack-1  | LocalStack version: 3.1.0
localstack-1  | LocalStack Docker container id: 16f65452edc8
localstack-1  | LocalStack build date: 2024-01-25
localstack-1  | LocalStack build git hash: d48ada8a
localstack-1  |
localstack-1  | 2024-02-17T06:13:47.737  INFO --- [-functhread4] hypercorn.error            : Running on https://0.0.0.0:4566 (CTRL + C to quit)
localstack-1  | 2024-02-17T06:13:47.737  INFO --- [-functhread4] hypercorn.error            : Running on https://0.0.0.0:4566 (CTRL + C to quit)
localstack-1  | Ready.
localstack-1  | 2024-02-17T06:13:48.375  INFO --- [   asgi_gw_0] l.s.k.kinesis_mock_server  : Creating kinesis backend for account 000000000000
localstack-1  | 2024-02-17T06:13:48.705  INFO --- [-functhread7] l.s.k.kinesis_mock_server  : [info] kinesis.mock.KinesisMockService$ 2024-02-17T06:13:48.695706Z contextId=6f22bed3-15b2-4a68-b292-f31016e5e8dc, cacheConfig={"awsAccountId":"000000000000","awsRegion":"us-east-1","createStreamDuration":{"length":500,"unit":"MILLISECONDS"},"deleteStreamDuratio
n":{"length":500,"unit":"MILLISECONDS"},"deregisterStreamConsumerDuration":{"length":500,"unit":"MILLISECONDS"},"initializeStreams":null,"logLevel":"INFO","mergeShardsDuration":{"length":500,"unit":"MILLISECONDS"},"onDemandStreamCountLimit":10,"persistConfig":{"fileName":"000000000000.json","interval":{"length":5,"unit":"SECONDS"},"loadIfExists":true,"pat
h":"../../../tmp/localstack/state/kinesis","shouldPersist":true},"registerStreamConsumerDuration":{"length":500,"unit":"MILLISECONDS"},"shardLimit":100,"splitShardDuration":{"length":500,"unit":"MILLISECONDS"},"startStreamEncryptionDuration":{"length":500,"unit":"MILLISECONDS"},"stopStreamEncryptionDuration":{"length":500,"unit":"MILLISECONDS"},"updateSha
rdCountDuration":{"length":500,"unit":"MILLISECONDS"}} Logging Cache Config
localstack-1  | 2024-02-17T06:13:48.828  INFO --- [-functhread7] l.s.k.kinesis_mock_server  : [info] kinesis.mock.KinesisMockService$ 2024-02-17T06:13:48.827840Z  Starting Kinesis TLS Mock Service on port 39987
localstack-1  | 2024-02-17T06:13:48.828  INFO --- [-functhread7] l.s.k.kinesis_mock_server  : [info] kinesis.mock.KinesisMockService$ 2024-02-17T06:13:48.828511Z  Starting Kinesis Plain Mock Service on port 41755
localstack-1  | 2024-02-17T06:13:48.836  INFO --- [-functhread7] l.s.k.kinesis_mock_server  : [info] kinesis.mock.KinesisMockService$ 2024-02-17T06:13:48.835677Z contextId=e05f1b29-e4a3-4bf7-a3d3-3861c68c7e95 Starting persist data loop
localstack-1  | 2024-02-17T06:13:49.026  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 200
localstack-1  | 2024-02-17T06:13:49.472  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 200
localstack-1  | 2024-02-17T06:13:49.936  INFO --- [   asgi_gw_0] localstack.request.aws     : AWS kinesis.CreateStream => 200
```

動的にパッケージを取得し、Kinesisのストリームが上手く作成されていることが分かります。

## LocalStack側でアップデートが入ったのか、Kinesis Data Streamsに対しては対応が不要になったようです

この記事を書くにあたり、元のエラーログを発生させようとしていて気がついたのですが、`v2.3.0` でアップデートが入ったようで、Kinesis Data Streamsについては対応が不要です。

- `v2.0.2` →✘ エラー発生
- `v2.1.0` →✘
- `v2.2.0` →✘
- `v2.3.0` →✅ 正常動作
- `v3.0.0` →✅
- `v3.1.0` →✅

おそらく、Kinesisのモックをバイナリからscala.js版に入れ替えた [Use scala.js for executable and docker image #531](https://github.com/etspaceman/kinesis-mock/pull/531) で解消されたのかなと予測しますが、詳細は未調査です。

## まとめ

LocalStack v2からイメージの構成が変わって、起動時に動的にパッケージをインストールするケースがあります。その場合にネットワーク環境によっては外部リソースの取得に失敗するため、CA証明書の設定が必要。OpenSSLで自動化すると楽になるかもしれない、という記事でした。

みんなハマっていないのかな？と思っていましたが、NGだった期間は `v2.0.0` が公開されたときから、`v2.3.0` が公開された `2023.3.31` ～ `2023.9.29` と半年足らずだったので、レアな経験だったのかもしれません。


