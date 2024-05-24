---
title: "仕事でPythonコンテナをデプロイする人向けのDockerfile (1): オールマイティ編"
date: 2020/05/13 08:56:40
postid: ""
tag:
  - Docker
  - Python
  - コンテナビルド
category:
  - Infrastructure
thumbnail: /images/20200513/thumbnail.png
author: 澁川喜規
lede: "Pythonで書かれたアプリケーションをDockerイメージにする堅い方法の紹介です。イメージサイズを少しでも削ろう！とかではなくて実用性重視の方向です。今回は第一弾ということで、Debianベースのイメージを使う方法を紹介します。"
---
Pythonで書かれたアプリケーションをDockerイメージにする堅い方法の紹介です。イメージサイズを少しでも削ろう！とかではなくて実用性重視の方向です。今回は第一弾ということで、Debianベースのイメージを使う方法を紹介します。

* 続編も公開されました。
  * https://future-architect.github.io/articles/20200514/

# Pythonのベースイメージ選び

イメージ作成にはベースイメージ選びからですが、基本的には次の2つかなと思います。Pythonバージョンは機械学習だと3.7がよく使われていると思いますが、5/8にTensorflowが3.8向けのwheelとセットで新バージョンを出したので、そろそろ3.8になっていきますかね。本記事も3.8にしますが、3.7でも動作します。

* python:3.x-buster
* python:3.x-slim-buster

イメージのOSには以下のような種類があります。

| 名前 | どんなもの？ |
|:-:|:-:|
| buster  | Debian 10で処理系とかいっぱいインストール済み  |
| buster-slim  | Debian 10で処理系なしの実行環境用 |
| stretch  | Debian 9で処理系入り  |
| stretch-slim  | Debian 9で処理系なしの実行環境用  |
| alpine  | 元はフロッピーで起動するファイルサイズ重視のディストリビューション |
| windowsservercore  | Windows。LinuxやmacOS上では動作しない  |

BusterとかStretchという名前が見慣れない方もいるかもしれませんが、これはLinuxディストリビューションとしてシェアの大きな[Debianのコードネーム](https://www.debian.org/releases/index.en.html)です。

Debianバージョンが少し古いStretchの方がちょびっとサイズが小さかったりはしますが、まあ実用的にはサポートが長い方がいいですよね。slimを使ってGCCとかのコンパイラを自前でダウンロードしている記事とかもたまに見かける気がしますが、マルチステージビルドであれば、そんなにケチケチしなくていいのと、パッケージダウンロードは逐次処理なので遅く、処理系が入ったイメージのダウンロードの方が高速です。並列で処理されるし、一度イメージをダウンロードしてしまえば、なんどもビルドして試すときに効率が良いです。また、多くのケースでネイティブのライブラリも最初から入っており、ビルドでトラブルに遭遇することはかなり減るでしょう。

Pythonユーザーは基本的にAlpineを選んではいけません。いろいろネガが大きいからです。

* [AlpineはUbuntuよりも50%以上遅い](https://superuser.com/questions/1219609/why-is-the-alpine-docker-image-over-50-slower-than-the-ubuntu-image)
* [Alpineにするとビルド時間が50倍になる](https://pythonspeed.com/articles/alpine-docker-python/)

最初の項目。なぜ遅いかというと、Alpineのアプリが使うlibc(musl)のメモリ周りアロケートの実装が、性能よりもライブラリのサイズ重視のシンプルでPythonの使い方と合わなくて速度が出ないとのこと。これはアプリケーションの実装次第なのでjemallocを使っているRubyとかの人は関係ないでしょうし、PostgreSQLとかNginxはAlpine版でも速度は変わらないようです。性能が2倍違うということは、クラウドでアプリケーションを動かすときはメモリさえ許せば一つ下のインスタンスでいいわけで、お金にも利いてきますよね。

後者の速度の問題ですが、PyPIはLinux向けにはmanylinux1という形式でバイナリを提供しており、DebianでもRedHatでも高速にインストールできます。しかし、この形式はAlpineには対応していないため、C拡張を使うライブラリを使うと、Dockerイメージのビルド時間が伸びまくってしますわけです。

それでも、どうしても、PurePythonで処理速度はどうでも良い/お金がたくさんある、あるいはC拡張を使う場合でも人生を犠牲にしてでも、イメージサイズをどうしても減らしたいみたいな選ばれし者はAlpineを使う感じでしょうかね。

# Pythonのマルチステージビルド

マルチステージビルドで環境を作っていきます。

アプリケーションはDjangoのチュートリアルの最初の1ステップだけ作ったものをuwsgiを使ってデプロイすることを想定します。フォルダ＆ファイル構成はこんな感じ。

<img src="/images/20200513/1.png" alt="フォルダ＆ファイル構成" width="794" height="1178" loading="lazy" class="img-middle-size">


依存パッケージは今回はこれだけです。ただこのファイルは開発環境を設定するときに書くぐらいですね。あまり重要ではないです。

```text requirements.txt
django
uwsgi
```

実際にDockerの中で使うファイルはこちら。`pip install -r requirements.txt`で依存ライブラリと一緒にインストールした後に`pip freeze > requirements.lock`で作成します。あらかじめvenvで環境を分けて置くと、ノイズが混ざらないので良いです。

```text requirements.lock
asgiref==3.2.7
Django==3.0.5
pytz==2020.1
sqlparse==0.3.1
uWSGI==2.0.18
```

uwsgi用の設定はこちら。プロセス数とかスレッド数は適当に。

```ini deploy/uwsgi.ini
[uwsgi]
http = 0.0.0.0:8000
chdir = /opt/app/mysite
wsgi-file = mysite/wsgi.py
master = True
processes = 2
threads = 2
stats = 0.0.0.0:9191
uid = uwsgiusr
gid = uwsgiusr
```

Dockerfileはこうなりました。slimの方にはlibxml2などがないので追加します。PostgreSQLのライブラリのlibpq5はまあおまけです。大抵ウェブアプリケーション作るときはPostgreSQLかMySQLは使うでしょうし。もし、使うライブラリがpure python、もしくはC拡張でもwheelによるバイナリ配布をしているパッケージのみであれば、ビルド用イメージも3.8-slim-busterにできます。slimを使っていても、もしライブラリを追加した瞬間にGCCが必要になっても、イメージを3.8-busterに変えるだけなので、このマルチステージビルドの構成は崩さない方が良いでしょう。お仕事であれば問題回避の速度が大事ですからね。

```Dockerfile Dockerfile
# ここはビルド用のコンテナ
FROM python:3.8-buster as builder

WORKDIR /opt/app

COPY requirements.lock /opt/app
RUN pip3 install -r requirements.lock

# ここからは実行用コンテナの準備
FROM python:3.8-slim-buster as runner

COPY --from=builder /usr/local/lib/python3.8/site-packages /usr/local/lib/python3.8/site-packages
COPY --from=builder /usr/local/bin/uwsgi /usr/local/bin/uwsgi

RUN apt update \
  && apt install -y libpq5 libxml2 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false uwsgiusr
RUN mkdir -p /opt/app/src/logs/app_logs
RUN touch /opt/app/src/logs/server.log
RUN chown -R uwsgiusr /opt/app/src/logs

COPY deploy/uwsgi.ini /opt/app
COPY mysite /opt/app/mysite

USER uwsgiusr

EXPOSE 8000
CMD ["uwsgi", "--ini", "/opt/app/uwsgi.ini"]
```

```sh
$ docker build -t pytest .
$ docker run -it --rm -p "8000:8000" pytest
```

ブラウザでアクセスするとうまくいきました。

<img src="/images/20200513/2.png" alt="HelloWorldと表示されたブラウザ画面" width="1580" height="974" loading="lazy">


## Pythonでどうやってマルチステージビルドを実現するのか

ポイントとしては、pip installしてできたライブラリを一式コピーして実行用のコンテナに写してます。uwsgiは別の場所にインストールされるので、それも個別にコピーします。

```Dockerfile 今回使ったのはこちらの方法
COPY --from=builder /usr/local/lib/python3.8/site-packages /usr/local/lib/python3.8/site-packages
COPY --from=builder /usr/local/bin/uwsgi /usr/local/bin/uwsgi
```

実はこの書き方を紹介している記事等はほとんどありません。ネットでよく見るPythonのマルチステージビルドの方法は次の方法です。

```Dockerfile こっちの方がよく見る
COPY --from=builder /root/.cache /root/.cache
COPY /build/requirements.txt /opt/app
RUN pip3 install -r requirements.txt
```

この方法であれば、uwsgiのような別の場所に入る実行ファイルも自動で処理されるのできれいにうまくいくのですが、最終的なイメージに/root/.cacheのレイヤーが残ってしまいます。RUNによるレイヤーなら&&を駆使して削除できるのですが、これはCOPYで作られるレイヤーなので、今のDockerだけだとこの無駄は削除できないのですよね。

機械学習ライブラリもりもりなイメージだと、これだけで200MBぐらいの容量になったり（全体も1.2GBとかになりますが）。今のところsite-packages全部コピーの方法で問題はなさそうです。

# 実行時に必要なライブラリがないと言われたら

フルセットのbusterには開発者向けのライブラリ類も含めていろいろ入っているのでビルドが成功するも、slim側にライブラリがなくて実行時エラーになる可能性があります。実行時にライブラリがロードできないというエラーが出たら、[こちらのサイト](https://packages.debian.org/search?lang=ja&arch=amd64&mode=filename&searchon=contents&keywords=libxml2.so.2)にライブラリ名を入れて、それをインストールするのに必要なパッケージを探し、apt installの項目に追加してください。

<img src="/images/20200513/3.png" alt="Debianのパッケージ検索画面" width="2586" height="1610" loading="lazy">

Pythonだと関数の中でimportできます。名前空間を汚さないので、こちらの方が良いのかな、と思って僕も以前やっていましたが、ファイルのグローバルなところだけにimportがあると、ちょっとした実行すると必要なモジュールを全部読み込んでくれて、この手のロードエラーはすぐにわかります。関数内importはなるべく避けた方が良いでしょう（先日もそれで問題を見つけきれなかった）。

# まとめ

Pythonを仕事で使う人のための堅いイメージ作成について紹介しました。Alpineのような性能のネガもなく、イメージの作成の実行時間も少なく、残業時間が減らせる方法を選びました。次回は条件によっては使えないかもしれないのですが、使えたら効果抜群なdistroless/python3について紹介します。

**公開しました(2020/05/14)**

https://future-architect.github.io/articles/20200514/
