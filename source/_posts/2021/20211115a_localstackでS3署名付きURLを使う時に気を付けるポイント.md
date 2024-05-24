---
title: "LocalStackでS3署名付きURLを使う時に気を付けるポイント"
date: 2021/11/15 00:00:00
postid: a
tag:
  - AWS
  - LocalStack
  - S3
  - 署名付きURL
  - CORS
category:
  - Infrastructure
thumbnail: /images/20211115a/thumbnail.png
author: 伊藤真彦
lede: "AWS S3を利用してファイルをアップロード、ダウンロードするフロントエンドアプリケーションの実装を行ったのですが、その際ハマったポイントがいくつかあったのでまとめます。AWSの機能をローカル環境で模擬するツールでお馴染みのLocalStackですが、AWS S3の機能も模擬できるようになっています。"
---

<img src="/images/20211115a/localstack-readme-header.png" alt="" width="675" height="271">

TIGの伊藤真彦です。

AWS S3を利用してファイルをアップロード、ダウンロードするフロントエンドアプリケーションの実装を行ったのですが、その際ハマったポイントがいくつかあったのでまとめます。

## LocalStackでS3を利用する

AWSの機能をローカル環境で模擬するツールでお馴染みのLocalStackですが、AWS S3の機能も模擬できるようになっています。

`docker-compose.yml`に設定を記述して、バックエンドAPIなど諸々のコンテナ群と一緒に利用するのが今日では一般的でしょうか。

```yml docker-compose.yml
version: "3"
services:
  localstack:
    image: localstack/localstack:0.11.3
    container_name: localstack
    ports:
      - 4566:4566
      - 8080:8080
    environment:
      - DEFAULT_REGION=ap-northeast-1
      - SERVICES=s3
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - /Users/naoya-otani/.localstack:/tmp/localstack/
```

環境変数`SERVICES`にs3が含まれていないと利用できない点にご注意ください。

localstackでS3が起用できるようになると、`localhost:4566`でS3を模擬した一連の機能が利用できるようになります。

例えば下記のコマンドでローカル環境にS3バケットを作成する事ができます。

```sh
aws --endpoint-url http://localhost:4566 s3api create-bucket --bucket local-test-backet --profile local
```

`--endpoint-url`、`--profile` といったオプションを利用する事が大事です。

## 署名付きURLとは

AWS S3には[署名付きURL](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)という機能が存在します。

> デフォルトでは、すべてのオブジェクトがプライベートです。オブジェクトの所有者のみがプライベートのオブジェクトにアクセスできます。ただし、オブジェクトの所有者はオプションで他ユーザーとオブジェクトを共有することができます。その場合は、署名付き URL を作成し、独自のセキュリティ証明書を使用して、オブジェクトをダウンロードするための期限付きの許可を相手に付与します。

この機能により、S3のセキュリティ設定を緩めることなく、外部WEBサイトやアプリケーションからS3バケットへのアクセスが可能になります。

**LocalStackでも署名付きURLを利用する事は可能ですが、いくつか独自の注意点があり、見落とすと上手く動かずに苦戦する事になります。**

## 署名の計算でエラーが発生する

サーバーサイドのAPIで署名付きURLを正しく払い出しているつもりでも`SignatureDoesNotMatch`というエラーが表示されることがあります。
これは署名付きURLが払いだすパラメータ`X-Amz-Signature`がS3が期待している内容と異なる場合に返されるエラーレスポンスです。

### CREDENTIALの不一致によるエラー

署名付きURLの署名の暗号計算には、AWS CLIの設定や環境変数でお馴染みの`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`が計算材料に利用されます。

LocalStackのS3では、`AWS_SECRET_ACCESS_KEY`、`AWS_SECRET_ACCESS_KEY`が明示されていない場合、これら2種の値は`test`になります。

[LocalStackの実装](https://github.com/localstack/awscli-local/blob/53876fbb7dcc75868402cc5593ab36db87c4c66d/bin/awslocal#L113-L119)を見るとわかりやすいかもしれません。
`os.environ.get`で環境変数を参照し、無い場合のデフォルト値は`test`になっています。

ここで気を付けなければならないのは署名付きURLの発行を行うロジックで利用するAWS SDKの`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`が一致している必要があるということです。一般的にはバックエンドAPIの実装でS3を利用するSDKを利用するケースが多いと思います。

そこで参照している`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`がLocalStackで参照しているものと一致していないと署名の計算結果が一致せずに`SignatureDoesNotMatch`エラーが発生します。

特にこだわりが無ければローカル環境での環境変数`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、およびAWS CLIの`~/.aws/profile`で利用する`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`は`test`にしておくのが無難です。

もしくはdocker-compose.ymlに欠かさず`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`を明記しましょう。

```yml docker-compose.yml
version: "3"
services:
  localstack:
    image: localstack/localstack:0.11.3
    container_name: localstack
    ports:
      - 4566:4566
      - 8080:8080
    environment:
      - AWS_ACCESS_KEY_ID=id
      - AWS_SECRET_ACCESS_KEY=key
      - DEFAULT_REGION=ap-northeast-1
      - SERVICES=s3
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - /Users/naoya-otani/.localstack:/tmp/localstack/
```

署名付きURLは、発行するたびにS3に予約するためのアクセスを行っているわけではなく、理論上こうなるはず、という値を計算している、という仕組みです。

したがって対象のバケットが存在しなくてもURLは発行できますし、設定の違いにより誤った値を計算してURLを発行する事ができてしまいます。

上記の仕組みを覚えて置くとエラーの原因を考える際に役に立つと思います。

### 特殊記号によるエラー

`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`が正常に一致していても`SignatureDoesNotMatch`エラーが起きるパターンがあります。

それは、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、または予約するS3のパスに特殊記号が含まれている場合です。

同様の症状に苦しむ[issue](https://github.com/aws/aws-cli/issues/602#issuecomment-648952330)が存在しますが、2021年時点ではこの現象は解決できていません。

[公式ドキュメント](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-troubleshooting.html#tshoot-signature-does-not-match)にも記載されています。

> If your AWS secret key includes certain special characters, such as -, +, /, or %, some operating system variants process the string improperly and cause the secret key string to be interpreted incorrectly.
> If you process your access keys and secret keys using other tools or scripts, such as tools that build the credentials file on a new instance as part of its creation, those tools and scripts might have their own handling of special characters that causes them to be transformed into something that AWS no longer recognizes.
> The easy solution is to regenerate the secret key to get one that does not include the special character.
>
> AWSシークレットキーに-、+、/、％などの特定の特殊文字が含まれている場合、一部のオペレーティングシステムバリアントは文字列を不適切に処理し、シークレットキー文字列が誤って解釈される原因になります。
> 作成の一部として新しいインスタンスにクレデンシャルファイルを作成するツールなど、他のツールまたはスクリプトを使用してアクセスキーとシークレットキーを処理する場合、それらのツールとスクリプトは、特殊文字を独自に処理する可能性があります。 AWSが認識しなくなったものに変換されました。
> 簡単な解決策は、秘密鍵を再生成して、特殊文字を含まない鍵を取得することです。

最も不幸な例は自動で払い出された`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`にこのエラーを引き起こす値が含まれているケースです。問題のない値になるまで再発行する必要があります。

また、このエラーはアップロードしたいS3のパスに特殊記号がある場合でも同様の事象が発生します。

つまりURLでお馴染みの[%エンコーディング](https://ja.wikipedia.org/wiki/%E3%83%91%E3%83%BC%E3%82%BB%E3%83%B3%E3%83%88%E3%82%A8%E3%83%B3%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0)が必要な記号が対象パスに含まれている場合署名付きURLは使えなくなってしまいます。

例えば秒単位のアップロード時刻がバケットのフォルダ名に含まれている場合、`hh:mm:ss`の`:`が`%3A`に変換され署名計算が失敗します。
バケットのフォルダ構成の仕様変更が必要になるので結構厄介ですね。

## CORSの問題

払い出した署名付きURLが正常に利用できるようになっても、フロントエンドアプリケーションでそのURLを利用するとお馴染みCORSエラーによってファイルのアップロードができない事があります。

詳細なURLは省略していますが下記のようなエラーがブラウザのデバッグコンソールに表示されます。

```sh
Access to XMLHttpRequest at 'http://localhost:4566/local-test-bucket/test.txt' from origin 'localhost' has been blocked by CORS policy: Request header field access-control-allow-origin is not allowed by Access-Control-Allow-Headers in preflight response.
```

通常はS3のバケットポリシーでCORSを許可する必要がありますが、LocalStackの場合バケットポリシーを正しく設定してもこのエラーは解消されません。

LocalStackで参照する環境変数`EXTRA_CORS_ALLOWED_ORIGINS`、`EXTRA_CORS_ALLOWED_HEADERS`を適切に設定する。
または`DISABLE_CORS_CHECKS`を`1`にする必要があります。
この設定が効いていればバケットポリシーの設定は不要です。

```yml docker-compose.yml
version: "3"
services:
  localstack:
    image: localstack/localstack:0.11.3
    container_name: localstack
    ports:
      - 4566:4566
      - 8080:8080
    environment:
      - AWS_ACCESS_KEY_ID=id
      - AWS_SECRET_ACCESS_KEY=key
      - DEFAULT_REGION=ap-northeast-1
      - SERVICES=s3
      - DATA_DIR=/tmp/localstack/data
      - DISABLE_CORS_CHECKS=1
    volumes:
      - /Users/naoya-otani/.localstack:/tmp/localstack/
```

## まとめ

* LocalStack`SignatureDoesNotMatch`に悩まされる
* CORS設定もLocalStack独自のものがある

これらは[LocalStackのREADME](https://github.com/localstack/localstack/blob/master/README.md)をよく見ると書いてあります。

> NOTE: Please use test as Access key id and secret Access Key to make S3 presign url work. We have added presign url signature verification algorithm to validate the presign url and its expiration. You can configure credentials into the system environment using export command in the linux/Mac system. You also can add credentials in ~/.aws/credentials file directly.
> ## Security Configurations
> Please be aware that the following configurations may have severe security implications!
> ENABLE_CONFIG_UPDATES: Whether to enable dynamic configuration updates at runtime, see here (default: 0).
> DISABLE_CORS_CHECKS: Whether to disable all CSRF mitigations (default: 0).
> DISABLE_CUSTOM_CORS_S3: Whether to disable CORS override by S3 (default: 0).
> DISABLE_CUSTOM_CORS_APIGATEWAY: Whether to disable CORS override by apigateway (default: 0).
> EXTRA_CORS_ALLOWED_ORIGINS: Comma-separated list of origins that are allowed to communicate with localstack.
> EXTRA_CORS_ALLOWED_HEADERS: Comma-separated list of header names to be be added to Access-Control-Allow-Headers CORS header
> EXTRA_CORS_EXPOSE_HEADERS: Comma-separated list of header names to be be added to Access-Control-Expose-Headers CORS header

しかしLocalStack独自の癖である、という発想に至る前に一般的な方法を試そうとして時間を吸われてしまう事がよくあります。

こういうネタこそブログで発信する価値のあるものですね。
