---
title: "LambdaをカスタムDockerランタイムで開発する方法"
date: 2021/09/14 00:00:00
postid: a
tag:
  - AWS
  - Lambda
  - サーバーレス
  - Docker
  - Oracle
  - Go
category:
  - Programming
thumbnail: /images/20210914a/thumbnail.png
author: 伊藤真彦
lede: "普段からAWS Lambdaにはお世話になっているのですが、初めてカスタムランタイムを動かす仕事が舞い込んできました。AWS Lambdaでは下記のランタイムがサポートされています。"
---

<img src="/images/20210914a/lambdadocker.png" alt="" width="1000" height="465" loading="lazy">

TIGの伊藤真彦です。

普段からAWS Lambdaにはお世話になっているのですが、初めてカスタムランタイムを動かす仕事が舞い込んできました。

# AWS Lambdaのカスタムランタイムとは

AWS Lambdaは2021.09.13時点で次のランタイムがサポートされています。

* Node.js
* Python
* Ruby
* Java
* Go
* .NET

2018年からDockerコンテナでカスタムランタイムを構築することが可能になりました。

Dockerコンテナを準備すれば上記以外の言語、実行バイナリなど自由なアプリケーションをAWS Lambdaで動かすことが可能ということになります。

今回私が作成したカスタムランタイムは、GoでOracle DBのクライアントライブラリを操作可能なカスタムLambdaランタイムです。

# GoでOracle DBに接続する

GoでOracle DBを利用する方法を検討した結果[mattn/go-oci8](https://github.com/mattn/go-oci8)を利用することがメジャーな手法であることがわかりました。

[mattn/go-oci8](https://github.com/mattn/go-oci8)を利用する際は`go get github.com/mattn/go-oci8`コマンドを実行して必要な機能をインストールする必要がありますが、前提として[Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client/downloads.html)、C/C++コンパイラをインストールし、設定ファイルと環境変数を整備する必要があります。

上記前提があるため、AWS LambdaデフォルトのGoランタイムではGoのコードそのものは完璧に書いてあっても動作しません。

そこで、各種依存パッケージを準備済みのDockerコンテナを準備することにしました。

# AWS Lambdaで動作するコンテナを作成する

理論上どんなコンテナでもAWS Lambdaの上で動かすことが可能です。

しかし、最終的な成果物はLambdaランタイムとして動くことが可能な仕様を満たしている必要があります。

アプリケーションがAWS Lambdaのsdkを利用し、HTTPリクエストに応答する仕様を満たすように作られているのと同じように、コンテナには規定の環境変数が存在することなど、コンテナとしての要求仕様が存在します。

これら前提を満たすDockerfileをフルスクラッチで書き起こし、アップデートに追従するのは現実的ではありません。ベースイメージに[amazon/aws-lambda-provided](https://hub.docker.com/r/amazon/aws-lambda-provided)を利用すると安心して前提条件を満たすことができます。

このベースイメージに必要なライブラリ、今回はOracleクライアント一式と設定ファイルを用意します。

`go get github.com/mattn/go-oci8`コマンドの実行、および[mattn/go-oci8](https://github.com/mattn/go-oci8)を利用したコードをビルドし、ビルドされたコードを実行するためには、Oracleクライアントと設定ファイル一式がいずれのタイミングでも必要になるため、マルチステージビルドは行わず、Oracleクライアントの準備を整えた後にGoをインストールし、実行バイナリのビルドが終わったらGoを削除するという仕組みを整えました。

```Dockerfile Dockerfile
FROM amazon/aws-lambda-provided:al2

# set env vars
ENV NLS_LANG=Japanese_Japan.AL32UTF8
ENV PATH=$PATH:$HOME/bin:/usr/lib/oracle/21.3/client64/bin
ENV LD_LIBRARY_PATH=/usr/local/instantclient_21_3:$LD_LIBRARY_PATH
ENV PKG_CONFIG_PATH=/usr/local/instantclient_21_3
ENV GO111MODULE=on

# install Oracle libraries
RUN yum -y install wget tar gzip unzip pkgconfig gcc libaio
RUN wget https://download.oracle.com/otn_software/linux/instantclient/213000/instantclient-basic-linux.x64-21.3.0.0.0.zip && \
    wget https://download.oracle.com/otn_software/linux/instantclient/213000/instantclient-sqlplus-linux.x64-21.3.0.0.0.zip && \
    wget https://download.oracle.com/otn_software/linux/instantclient/213000/instantclient-sdk-linux.x64-21.3.0.0.0.zip
RUN unzip instantclient-basic-linux.x64-21.3.0.0.0.zip -d /usr/local && \
    unzip instantclient-sqlplus-linux.x64-21.3.0.0.0.zip -d /usr/local && \
    unzip instantclient-sdk-linux.x64-21.3.0.0.0.zip -d /usr/local
RUN rm instantclient-basic-linux.x64-21.3.0.0.0.zip && \
    rm instantclient-sqlplus-linux.x64-21.3.0.0.0.zip && \
    rm instantclient-sdk-linux.x64-21.3.0.0.0.zip

# install golang to build
# NOTE: マルチステージビルドを使うとOracleクライアントをビルダーと実行コンテナ両方に入れる必要があるためあえて同じコンテナにGoをインストールする
RUN wget https://dl.google.com/go/go1.16.7.linux-amd64.tar.gz
RUN ls -l
RUN tar -C /usr/local -xzf go1.16.7.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# build go binary
COPY {作りたいGoアプリケーションのファイル一式} /go/src/{アプリケーション名}
COPY oci8.pc /usr/local/instantclient_21_3/oci8.pc
WORKDIR /go/src/{ビルドコマンドを実行したい場所}
RUN go mod download
RUN pkg-config --cflags oci8
RUN go get github.com/mattn/go-oci8
RUN GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -buildid=" -trimpath -o /lambda ./cmd/lambda/lambda.go

# cleanup
RUN rm -rf /usr/local/go && \
    rm -rf /go && \
    yum -y remove wget tar gzip unzip pkgconfig

WORKDIR /
ENTRYPOINT [ "/lambda" ]
```

参考までに、`oci8.pc`の設定内容は下記の内容です。

```sh oci8.pc
prefix=/usr/local/instantclient_21_3/
libdir=${prefix}
includedir=${prefix}/sdk/include/

Name: oci8
Description: Oracle Instant Client
Version: 21.3
Libs: -L${libdir} -lclntsh
Libs.private:
Cflags: -I${includedir}
```

# 作成したコンテナをAWS Lambdaで利用する

## DockerをLambdaで動かすアーキテクチャ

GoやPythonなど、提供されているランタイムでは、ソースコードや、ビルドしたバイナリををLambdaリソースにアップロードする形でデプロイを行いました。

Dockerカスタムランタイムの場合は、コンテナイメージ自体はECRにpushし、AWS Lambdaにはそのコンテナイメージのarnを設定する、という仕組みに変わります。

ECR + Lambdaという構成になる、という概要だけでも覚えておくといざ実装するときに助けになると思います。

## コンテナイメージをECRにPushする

実際にコンテナイメージをpushし、AWS Lambdaで実行する方法を説明します。
まずはECRリポジトリを用意します。

CLIで構築する場合は下記のコマンドでリポジトリを作成します。

```deploy.sh
aws ecr create-repository --repository-name myapp
```

terraformで記載することも可能です。

```sh ecr_repository.tf
resource "aws_ecr_repository" "myapp" {
  name                 = "${terraform.workspace}-myapp"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
```

リポジトリが用意できたら、コンテナをビルドし、pushします。

```sh deploy.sh
docker build -t myapp:latest
docker tag mayapp:latest ${AWS_ACCOUNT}.dkr.ecr.ap-northeast-1.amazonaws.com/myapp:latest
aws ecr get-login-password --profile myprofile | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com
docker push ${AWS_ACCOUNT}.dkr.ecr.ap-northeast-1.amazonaws.com/myapp:latest
```

続いてLambdaリソースを構築します。

```sh deploy.sh
aws lambda create-function \
     --function-name myapp  \
     --package-type Image \
     --code ImageUri=${ACCOUNTID}.dkr.ecr.${REGION}.amazonaws.com/myapp:latest \
     --role ${ROLE_ARN}
```

terraformではこのように書くことができます。(vpcの設定など一部省略しています)
`${data.aws_caller_identity.current.account_id}`で自分のAWSアカウントIDを取得できるのがミソですね。

```sh lambda_function.tf
resource "aws_lambda_function" "myapp" {
  package_type  = "Image"
  image_uri     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.ap-northeast-1.amazonaws.com/${terraform.workspace}-myapp:latest"
  function_name = "${terraform.workspace}-myapp"
  role          = aws_iam_role.lambda_role.arn
  memory_size   = 512
  timeout       = 900
}
```

コンテナイメージを更新した際に気をつけるポイントですが、`latest`タグのコンテナイメージを更新しても、すぐにLambda関数の挙動には反映されません。一晩寝かしても古いイメージが参照されていました。

全く同じ`image-uri`のまま更新コマンドを実行することで即時反映できます。

```sh update.sh
aws lambda update-function-code --profile myprofile --function-name myapp --image-uri ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/myapp:latest
```

コンテナイメージのタグやダイジェストをコンテナイメージの内容を更新する度に厳密に管理する事も可能ですが、今のところ常に`latest`での運用に落ち着いています。

## コンテナイメージをローカル環境でデバッグする

AWS Lambdaで動く要件を満たしたコンテナが作成されているかをローカル環境で確認することは可能です。逆に作成したアプリケーションコンテナ単体では動作しません。

[Lambda Runtime Interface Emulator](https://aws.amazon.com/jp/blogs/news/new-for-aws-lambda-container-image-support/)との組み合わせでコンテナを起動することでローカル環境でのデバッグが可能になります。

RIEは下記のコマンドでインストールできます。

```sh
mkdir -p ~/.aws-lambda-rie && curl -Lo ~/.aws-lambda-rie/aws-lambda-rie \
https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie \
&& chmod +x ~/.aws-lambda-rie/aws-lambda-rie
```

インストール完了後、下記のコマンドで、RIE経由でビルドしたコンテナを起動します。
実際に試してみた環境では(2021年9月時点)`Dockerfile`で`ENTORYPOINT`が明記されている場合も、コマンドで`ENTORYPOINT`に相当する部分を指定する必要がありました。

```sh
docker run -v ~/.aws-lambda-rie:/aws-lambda --entrypoint /aws-lambda/aws-lambda-rie -p 9000:8080 myapp:latest /lambda
```

このコンテナを起動した状態で、curlコマンドを実行してlocalhostで起動されたLambdaエンドポイントを叩く形でコンテナに組み込んだアプリケーションを実行します。

```sh
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
```

curlコマンド実行時に想定通りにアプリケーションが動けばコンテナイメージそのものは問題なく出来上がっていることになります。


# まとめ

* AWS LambdaではカスタムDockerコンテナを起動することができる
* aws-lambda-providedをベースイメージにするのがオススメ
* ECR + Lambdaの組み合わせで構築、運用する
* ローカル環境でデバッグすることも可能

どうしてもカスタムランタイムでないと困る状況になる事はそう頻繁にある事ではないため、若干参考情報が少ないかなと感じました。

参考になれば幸いです。
