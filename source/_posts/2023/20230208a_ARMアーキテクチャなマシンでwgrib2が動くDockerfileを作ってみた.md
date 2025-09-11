---
title: "ARMアーキテクチャなマシンでwgrib2が動くDockerfileを作ってみた"
date: 2023/02/08 00:00:00
postid: a
tag:
  - Mac
  - Ubuntu
  - Docker
category:
  - DevOps
thumbnail: /images/2023/20230208a/thumbnail.jpg
author: 矢野颯太
lede: "wgrib2がすぐ使えるDockerfileが欲しかったので、作成しました。M1 Macで動くようにARMアーキテクチャ向けに定義しました。"
---

<img src="/images/2023/20230208a/images.jpg" alt="" width="400" height="107">

こんにちは。フューチャーの矢野です。

wgrib2がすぐ使えるDockerfileが欲しかったので、作成しました。
M1 Macで動くようにARMアーキテクチャ向けに定義しました。

## 結論

* Dockerfileは下記の通りです
* マルチステージビルドをして、イメージを小さくします。2つ目の環境にmakeした実行ファイルを配置します
* configureのオプションにアーキテクチャを指定しています。x86でmakeするときにはconfigureのオプション書き換えなしでビルドできました

```Dockerfile
FROM arm64v8/ubuntu:22.04
WORKDIR /root/

RUN apt -y update \
&& apt -y upgrade \
&& apt -y install build-essential \
&& apt -y install gfortran \
&& apt -y install wget

# download latest wgrib2
RUN wget https://www.ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/wgrib2.tgz.v3.1.1 \
&& tar xvfz wgrib2.tgz.v3.1.1

# edit makefile
RUN cd grib2/ \
&& sed -i -e "s/#export CC=gcc/export CC=gcc/g" makefile \
&& sed -i -e "s/#export FC=gfortran/export FC=gfortran/g" makefile \
&& sed -i -e "860 s/.\/configure/.\/configure --build=arm/g" makefile \
&& sed -i -e "936 s/.\/configure/.\/configure --build=arm/g" makefile

# build
RUN cd grib2/ \
&& make


FROM arm64v8/ubuntu:22.04
WORKDIR /root/
RUN apt -y update \
&& apt -y upgrade \
&& apt -y install gfortran

COPY --from=0 /root/grib2/wgrib2/wgrib2 /usr/local/bin/wgrib2
ENTRYPOINT ["wgrib2"]
```

* Dockerfileの置いてあるディレクトリで下記を実行することでビルドされます。

```sh
 docker build -t wgrib2:latest .
```

## 概要

### wgrib2とは

アメリカ海洋気象庁(NOAA)が提供しているGRIB2を扱うことができるプログラムです。[提供ページ](https://www.cpc.ncep.noaa.gov/products/wesley/wgrib2/)

### GRIB2とは

世界気象機関WMOが定めるデータフォーマットです。
気象データなどの格子点形式のデータを扱う際に利用されます。

## 使い方

下記のような感じで実行するバージョンが表示されます。

```sh
docker run -v $(pwd):/root/ wgrib2:latest -version
```

ホストPCのディレクトリをマウントしているので、grib2ファイルを読み込ませたい場合などは下記のように実行すれば良いです。

```sh
docker run -v $(pwd):/root/ wgrib2:latest sample.grib2 -csv-
```

## 試しに使ってみる

緯度経度を指定したファイルを抽出後、csvとして出力、先頭の10行を標準出力してみます。

```sh
$ docker run -v $(pwd):/root/ wgrib2:latest -small_grib 130:135 30:35 small.grib Z__C_RJTD_20160620150000_MET_GPV_Ggis1km_Plfdc_Aper10min_FH0000-0300_grib2.bin

1:0:d=2016062015:var discipline=0 center=34 local_table=1 parmcat=1 parm=218:surface:anl:

$ docker run -v $(pwd):/root/ wgrib2:latest small.grib -csv small.csv

1:0:d=2016062015:var discipline=0 center=34 local_table=1 parmcat=1 parm=218:surface:anl:

$ head -n 10 small.csv

"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.006,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.019,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.031,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.044,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.056,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.069,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.081,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.094,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.106,30.0042,0
"2016-06-20 15:00:00","2016-06-20 15:00:00","var0_1_218","surface",130.119,30.0042,0
```

出力できていますね。

サンプルデータは[気象庁](https://www.data.jma.go.jp/developer/gpv_sample.html)から配布されている「大雨警報(浸水害)・洪水警報の危険度分布（統合版）」を使用しました。

## まとめ

wgrib2をインストールしたDockerfileを作成して、コマンドが実行できることを確認するところまでを書きました。

アーキテクチャによって設定内容が異なるため、x86向けには別のファイルを定義するか、マルチアーキテクチャに対応した書き方に対応していきたいと思います。
