---
title: "DockerでRUNをまとめた方が良いとは限らない"
date: 2021/01/21 00:00:00
postid: ""
tag:
  - Docker
  - コンテナビルド
category:
  - Programming
thumbnail: /images/20210121/thumbnail.png
author: 澁川喜規
lede: "ソフトウェアの世界では、ツールや言語の進歩があって、もはや古い知識になっているにも関わらず、古い知識がベストプラクティスと呼ばれて蔓延し続けている例があります。Dockerだと「RUNをまとめよう」というのがそうです。かつては..."
---
TIG/DXの渋川です。

ソフトウェアの世界では、ツールや言語の進歩があって、もはや古い知識になっているにも関わらず、古い知識がベストプラクティスと呼ばれて蔓延し続けている例があります。Dockerだと「RUNをまとめよう」というのがそうです。かつてはこれは常に行うべきプラクティスでしたが、現代だとそうじゃないケースもあり、デメリットもあります。

<img src="/images/20210121/Moby-logo.png" class="img-middle-size" loading="lazy">

> https://www.docker.com/company/newsroom/media-resources

# 1. ただファイルが増えるだけのケースであれば気にしなくていい

次の2つのファイルで実験してみます。ベースイメージに、10MBのファイルを作成するコマンドをふたつ並べたものです。

```Dockerfile
FROM debian:bullseye-slim

RUN dd if=/dev/zero of=dummy1 bs=1M count=10
RUN dd if=/dev/zero of=dummy2 bs=1M count=10
```

```Dockerfile
FROM debian:bullseye-slim

RUN dd if=/dev/zero of=dummy1 bs=1M count=10 \
    && dd if=/dev/zero of=dummy2 bs=1M count=10
```

結果を見てみると、サイズは同じです。「Aを足す」「Bを足す」というレイヤーと、「AとBを足す」というレイヤー、どちらであっても差はありません。

```
<none>        <none>        cc9f228f6862   5 seconds ago    89.1MB
<none>        <none>        1c3789ba70ca   11 seconds ago   89.1MB
```

# 2. ファイルの削除時にのみ影響があるが、必要なファイルだけを引っこ抜くなら違いはない

次の二つを比較してみましょう。2つファイルがあるが、1つは後から削除するというケースです。apt getしたあとに不要なファイルを消すとかそういうのでよく見かけますね。

```Dockerfile
FROM debian:bullseye-slim

RUN dd if=/dev/zero of=dummy1 bs=1M count=10
RUN dd if=/dev/zero of=dummy2 bs=1M count=10
RUN rm dummy1
```

```Dockerfile
FROM debian:bullseye-slim

RUN dd if=/dev/zero of=dummy1 bs=1M count=10 \
    && dd if=/dev/zero of=dummy2 bs=1M count=10 && rm dummy1
```

今度は違いが出ました。最初のRUNを混ぜない方法では、途中のレイヤーの状態としてはdummy1ファイルが存在しています。そのため、その分サイズが大きくなってしまうのです。

```
<none>        <none>        7594cc6c4f07   About a minute ago   89.1MB
<none>        <none>        1a6c1daf8eb5   About a minute ago   78.6MB
```

ここまでが昔の話。今の時代（といってももう4年前？）からはマルチステージビルドがあります。最終的に必要なファイルはdummy2だけですので、実行用イメージはビルド用イメージからそのファイルを持ってきます。

```Dockerfile
FROM debian:bullseye-slim as builder

RUN dd if=/dev/zero of=dummy1 bs=1M count=10
RUN dd if=/dev/zero of=dummy2 bs=1M count=10

FROM debian:bullseye-slim as runner

COPY --from=builder dummy2 .
```

RUNを連結してrmしたのと同じイメージサイズになりましたね。

```
<none>        <none>        5398e862d3db   2 seconds ago   78.6MB
```

もし、aptのパッケージになくてビルドを自前でやっている、オプションをチューニングしたビルドが必要みたいなケースでは``--prefix``で``/usr/local``とは別のところ、例えば``/opt/local``とかに``make install``をしておけば、最終イメージへのコピーはしやすく、マルチステージ化しやすいかと思います。

# まとめることのデメリット

1にも2にも、キャッシュが効かなくなってDockerの実行速度が落ちることです。連結したコマンドが途中で失敗したら、最初からやり直しです。

また、何かしらの原因で失敗したときに、&&で連結されたどのコマンドが原因で失敗したのかが一発では分からなくなります。&&を消して複数のRUNにして再実行し、デバッグが終わったらまた結合する・・・みたいになりがちです。

# まとめ

「あとから無駄ファイルを削除する」という場合には、その無駄ファイルを生成しているコマンドと連結すれば効果はありました。これはつまり、apt-get関連のコマンド群と、npm installなどのコマンド群を一緒に連結する意味はないということです。ファイル削除に意識して、「こことここはくっつけるべきだが、あとは効果がない」というのを吟味しましょう。

また、ファイル削除の場合でも、成果物だけ別のステージのイメージに転送してしまえば、無駄ファイルを削除する必要もありませんでした。なのでマルチステージビルドの最終的な成果物のイメージ以外ではRUNの連結は不要です。

マルチステージビルドの場合、実行に必要なファイル群の準備は別イメージ内で完了し、結果を実行イメージにコピーする使い方が一般的です。RUNはそのイメージ内部でyumとかapt-getで追加のライブラリなりツールをインストールする場合のみ使われるはずなので、&&の結合が登場するとしたらそこだけじゃないですかね。

なにもデメリットがなければ「シノゴの言わず結合せよ」でもいいとは思うんですが、デメリットもありますし、特に電力供給が逼迫しているというこの時期ですので、不要な結合をしてキャッシュを効かなくして消費電力を増やさないようにしたいものです。
