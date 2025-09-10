---
title: "TinkerBoard 2S：AWS Greengrass v1をインストールする"
date: 2022/04/07 00:00:00
postid: a
tag:
  - AWS
  - 電子工作
category:
  - IoT
thumbnail: /images/2022/20220407a/thumbnail.png
author: 宮永崇史
lede: "ASUSが販売しているシングルボードコンピュータTinekr Board2SにAWS Greengrassの環境を構築したので記事にまとめました。
"
---
<img src="/images/2022/20220407a/tinker.png" alt="tinker.png" width="945" height="287" loading="lazy">

[電子工作/IoT連載](/articles/20220404a/) の4本目です

## はじめに

こんにちは、TIG所属の宮永です。

ASUSが販売しているシングルボードコンピュータTinekr Board2SにAWS Greengrassの環境を構築したので記事にまとめました。

シングルボードコンピュータと聞くと真っ先に思い浮かべるのはRaspberryPiでしょうか。私も初めて触ったシングルボードコンピュータはRaspberryPiでした。

マザーボードなどで有名なASUSが販売しているシングルボードコンピュータの性能はとても気になります。

ネット上でもTinker Board2Sの記事はRaspberryPiに比べると非常に少ないため、本記事の構成も前半はTinker Boardの初期セットアップ、後半をAWS Greengrassの環境構築との章立てとしています。

本記事がTinker Board2S購入検討をしている方の役にたてば幸いです。

## Tinker Board2Sとは

ASUSが販売するArmベースのシングルボードコンピュータです。
商品についての公式ページは[こちら](https://tinker-board.asus.com/jp/product/tinker-board-2s.html)です。
まずは外観から観察します。

### 外観

一際目を惹くのはでっかいヒートシンクですね。😳
このヒートシンクは付属品です。

<img src="/images/2022/20220407a/tinker.JPG" alt="外観" width="1200" height="676" loading="lazy">

手前にピンヘッダーが40個確認できます。着色してあるため非常に便利です。
RaspberryPiだと上から1つずつ数えていかなければ行けないのでこの仕様はとてもありがたいですね。

外部インタフェースを見ていきます。
<img src="/images/2022/20220407a/usb.JPG" alt="外部インターフェース" width="1200" height="676" loading="lazy">

3.2USB Gen1 Type-Aが3つ、3.2USB Gen1 Type-Cが１つ付属しています。有線LANも接続できるようになっています。

<img src="/images/2022/20220407a/DSC_0559.JPG" alt="USB周り" width="1200" height="676" loading="lazy">
側面です。一番左にあるのは電源端子その隣がHDMI端子です。
HDMIの横にMIDI DSI(Mobile Industry Processor Interface Display Serial Interface)も確認できます。
こちらの端子はディスプレイモジュールを扱う際に使用します。

<img src="/images/2022/20220407a/DSC_0560.JPG" alt="HDMI" width="1200" height="676" loading="lazy">

最後に前面(背面？ )です。
手前に見えている端子はMIPI CSI(Mobile Industry Processor Interfa Camera Serial Interface)です。こちらの端子はカメラモジュールを取り付ける際に使用します。

その右側には小さいですがLEDが3つついています。
左から電源用LEDランプ、ディスクアクティビティLEDランプ、プログラマブルLEDです。
外観の観察もほどほどにOSのインストールをします。

### OSインストール

Tinker Boardは専用のOSが[公式ページ](https://tinker-board.asus.com/jp/download-list.html?product=tinker-board-2s)で配布されています。
まずはOSをデスクトップPCにダウンロードします。
筆者のデスクトップ環境はUbuntu22.04ですのでセットアップもそれに準じたものとなっています。
以下Ubuntu22.04がインストールされた母艦PCをデスクトップPCと呼称しています。

デバイスをUSB経由でPCに接続しデスクトップPCでの正常に認識されているかを確認します。
`lsusb`で接続デバイスを確認できます。

**Tinker Board接続前**

```bash
❯❯❯ lsusb
Bus 004 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 003 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 031: ID 08bb:27c4 Texas Instruments PCM2704C stereo audio DAC
Bus 001 Device 005: ID 05e3:0608 Genesys Logic, Inc. Hub
Bus 001 Device 003: ID 0b05:1939 ASUSTek Computer, Inc. AURA LED Controller
Bus 001 Device 043: ID 0d8c:016c C-Media Electronics, Inc.
Bus 001 Device 042: ID 2be8:0001  USB 2.0 Hub [Safe]
Bus 001 Device 041: ID 046d:c52b Logitech, Inc. Unifying Receiver
Bus 001 Device 040: ID 1a40:0101 Terminus Technology Inc. Hub
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

**Tinker Board接続後**

```diff
❯❯❯ lsusb
Bus 004 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 003 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 031: ID 08bb:27c4 Texas Instruments PCM2704C stereo audio DAC
Bus 001 Device 005: ID 05e3:0608 Genesys Logic, Inc. Hub
Bus 001 Device 003: ID 0b05:1939 ASUSTek Computer, Inc. AURA LED Controller
+Bus 001 Device 047: ID 0b05:7820 ASUSTek Computer, Inc. USB download gadget
Bus 001 Device 043: ID 0d8c:016c C-Media Electronics, Inc. USB download gadget
Bus 001 Device 042: ID 2be8:0001  USB 2.0 Hub [Safe]
Bus 001 Device 041: ID 046d:c52b Logitech, Inc. Unifying Receiver
Bus 001 Device 040: ID 1a40:0101 Terminus Technology Inc. Hub
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

デバイスが1つ増えていますね。

書き込みは[Ethcer](https://www.balena.io/etcher/)を使用します。
デバイスを認識した状態でOSイメージをTinkerOSで選択します
私の場合はこのタイミングで書き込み先も自動的にTinkerBoardが登録されました。

<img src="/images/2022/20220407a/image.png" alt="Ethcer" width="890" height="579" loading="lazy">

書き込まれるのを待つだけです。

<img src="/images/2022/20220407a/image_2.png" alt="Ethcer書き込み中" width="801" height="503" loading="lazy">

イメージの書き込みが完了したら再度電源を入れます。
起動するとリブートが始まり、以下の画面が立ち上がります。
<img src="/images/2022/20220407a/Screenshot_from_2022-02-04_22-29-32.png" alt="起動画面" width="1200" height="676" loading="lazy">

有線LANを接続した状態で引き続きセットアップを行います。

SSH接続します。
ログイン名linaroとなっているので

```bash
ssh linaro@<IPaddress>
```

で接続ができます。Passwordを要求されるのでlinaroと入力すると接続ができます。
AWS Greengrassの環境構築はssh接続できれば問題ありませんので、Tinker Boardの初期セットアップは以上で完了とします。

## AWS Greengrassのインストール

AWS Greengrassは2022年4月現在v1とv2の２つあります。
今回はCPU　ARM64 【AArch64】環境でdockerを使用したかったためv1の環境構築を行います。
v2では　ARM64 【AArch64】のdocker環境はサポートされていないようです。

なお、以下の環境構築ではTinker Board上にdocker及び、docker-composeがインストールされていることを想定しています。

環境構築は以下の公式の開発者ガイドに沿って行います。
https://docs.aws.amazon.com/ja_jp/greengrass/v1/developerguide/what-is-gg.html

### Greengrassのグループ作成

まずはAWS Greengrassのグループを作成します。
デフォルトの設定でグループを作成します。
AWS IoTコンソール画面左のタブから「クラシック＞グループ」を選択します.
画面遷移後「グループを作成」を選択すると下図のようになるので「デフォルト作成を使用」を選択します。

<img src="/images/2022/20220407a/image_3.png" alt="Greengrassのグループ作成" width="241" height="107" loading="lazy">

<img src="/images/2022/20220407a/image_4.png" alt="Greengrassのグループ作成のグループ名" width="879" height="620" loading="lazy">
適当にグループ名をつけて「次へ」を選択します。

<img src="/images/2022/20220407a/image_5.png" alt="Greengrassのグループ作成のグループ名" width="878" height="481" loading="lazy">
こちらも同様にして「次へ」を選択します。
<img src="/images/2022/20220407a/image_6.png" alt="次へ" width="867" height="477" loading="lazy">

グループの作成が完了すると証明書が発行されます。
この証明書は後ほど使用するためデスクトップPCにダウンロードしておきます。

<img src="/images/2022/20220407a/image_7.png" alt="証明書の発行" width="910" height="859" loading="lazy">

次に先程発行した証明書を使用してGreengrassコンテナを起動します。
必要なDockerfileなどは[こちら](https://docs.aws.amazon.com/ja_jp/greengrass/v1/developerguide/what-is-gg.html?icmpid=docs_gg_mktg#gg-docker-download)からダウンロードできます。

私はバージョン1.10を使用しました。
<img src="/images/2022/20220407a/image_8.png" alt="バージョン1.10" width="1197" height="181" loading="lazy">

ダウンロードした圧縮ファイルはデスクトップPCからTinker Boardに転送します。
以下のコマンドTinker Boardのhomeに転送できます。

```bash
scp -r aws-greengrass-docker-1.11.0.tar.gz linaro@<IPaddress>:~/
```

先程ダウンロードした証明書も転送してしまいましょう。

```bash
scp -r xxxxxx-setup.tar.gz linaro@<IPaddress>:~/
```

それではsshでTinker Boardに接続してコンテナを起動します。

sshで接続します。

```bash
ssh linaro@<IPaddress>
```

ディレクトリ構成ですが私はhome直下にgreengrassというディレクトリを作成し、そこに先程の2つのファイルを格納しました。
下記のような構成です。

```bash
linaro@linaro-alip:~/greengrass$ tree
.
├── xxxxxxx-setup.tar.gz
└── aws-greengrass-docker-1.11.0.tar.gz
```

まずはaws-greengrass-docker-1.11.0.tar.gzを同一ディレクトリに解凍します。

```bash
tar -zxvf aws-greengrass-docker-1.11.0.tar.gz
```

次に証明書の圧縮ファイルを解凍したフォルダの中に解凍します。

```
tar -xzvf xxxxxxx-setup.tar.gz -C aws-greengrass-docker-1.11.0/
```

この状態でディレクトリ構成は以下のようになります。
certsとconfigは証明書の圧縮ファイルを解凍して生成されたものです。
本記事で解説している方法は解凍ファイル中のREADME.mdに全て記載されています。
RaspberryPiを使用される方はarmv7l についての環境構築方法も記載されているため、ぜひご覧になってください。

```bash
linaro@linaro-alip:~/greengrass/aws-greengrass-docker-1.11.0$ ls
Dockerfile                          config
Dockerfile.alpine-aarch64           deployment
Dockerfile.alpine-aarch64.template  docker-compose.alpine-aarch64.yml
Dockerfile.alpine-armv7l            docker-compose.alpine-armv7l.yml
Dockerfile.alpine-armv7l.template   docker-compose.alpine-x86-64.yml
Dockerfile.alpine-x86_64            docker-compose.yml
Dockerfile.alpine-x86_64.template   greengrass-entrypoint.sh
README.md                           greengrass-license-v1.pdf
certs
```

### コンテナの起動

開発ガイドにはLinuxをコアデバイスとするときに以下のコマンドを入力するように記載されていますので、それに従います。

```bash
echo 1 > /proc/sys/fs/protected_hardlinks
echo 1 > /proc/sys/fs/protected_symlinks
```

また、`/etc/sysctl.conf`に以下の記載をした後に`sudo sysctl -p`を端末に入力します。

```bash
net.ipv4.ip_forward = 1
```

それでは用意されているdocekr-composeからイメージをビルドします。
docker-compose.ymlはCPUアーキテクチャ毎に用意されているので使用するプラットフォームに合わせてファイルを指定します。

```bash
sudo docker-compose -f docker-compose.alpine-aarch64.yml build
```

ビルドが終了したら、コンテナを起動します。
コンテナの起動の前にルート証明書が必要なのでcertsディレクトに移動して以下のコマンドを入力します。

```bash
sudo wget -O root.ca.pem https://www.amazontrust.com/repository/AmazonRootCA1.pem
```

certs配下にroot.ca.pemがダウンロードされていることを確認してください。

```bash
linaro@linaro-alip:~/greengrass/aws-greengrass-docker-1.11.0/certs$ tree
.
├── xxxxxxxxxx.cert.pem
├── xxxxxxxxxx.private.key
├── xxxxxxxxxx.public.key
└── root.ca.pem
```

ここまでできたらコンテナを起動します。

```bash
sudo docker-compose -f docker-compose.alpine-aarch64.yml up
```

起動しました🎉

<img src="/images/2022/20220407a/image_9.png" alt="起動画面" width="1167" height="167" loading="lazy">

### Lambda関数の準備

次にマネジメントコンソールからLambda関数をコンテナに向けてデプロイします。

Lambda関数を作成するのに必要なGreengrassのPython SDKは[ここから](https://github.com/aws/aws-greengrass-core-sdk-python/)ダウンロードできます。

[開発者ガイド](https://docs.aws.amazon.com/ja_jp/greengrass/v1/developerguide/create-lambda.html)に記載の通り
Helloフォルダにgreengrasssdkをコピーしてzipファイルに圧縮します。
[ここから](https://github.com/aws/aws-greengrass-core-sdk-python/)ダウンロードしたファイルのexamplesにHelloフォルダがあるので以下の構成で
圧縮ファイルを作成します。

```
~/Downloads/aws-greengrass-core-sdk-python-master/examples/HelloWorld
❯❯❯ tree
.
├── greengrasssdk
│   ├── IoTDataPlane.py
│   ├── Lambda.py
│   ├── SecretsManager.py
│   ├── __init__.py
│   ├── client.py
│   ├── stream_manager
│   │   ├── __init__.py
│   │   ├── data
│   │   │   └── __init__.py
│   │   ├── exceptions.py
│   │   ├── streammanagerclient.py
│   │   ├── util.py
│   │   └── utilinternal.py
│   └── utils
│       ├── __init__.py
│       └── testing.py
└── greengrassHelloWorld.py
```

圧縮コマンドは以下の通りです。

```bash
zip -r hello_world_python_lambda.zip greengrasssdk greengrassHelloWorld.py
```

それでは、AWSクラウド上にLambdda関数をデプロイします。
マネジメントコンソールで適当な名前をつけてLambda関数を作成します。

<img src="/images/2022/20220407a/image_10.png" alt="Lambdaデプロイ" width="1200" height="450" loading="lazy">

先程のzipファイルを直接アップロードしてハンドラの名前を編集します。

<img src="/images/2022/20220407a/image_11.png" alt="Lambdaのハンドラ設定" width="774" height="639" loading="lazy">

開発者ガイドに沿ってバージョンとエイリアスも設定します。

<img src="/images/2022/20220407a/image_12.png" alt="Lambdaのエイリアス" width="813" height="369" loading="lazy">

クラウド上へのLambda関数のデプロイが完了したらコンテナに向けてコードの更新を行います。
Greengrassのグループから「Lambdaの追加」を選択します。

<img src="/images/2022/20220407a/image_13.png" alt="Lambda追加" width="930" height="806" loading="lazy">

すでにLambda関数はデプロイしていますので「既存のLambdaの使用」を選択します。

<img src="/images/2022/20220407a/image_14.png" alt="既存のLambdaの使用ボタン" width="906" height="456" loading="lazy">

関数を追加したらLambdaの設定画面に移動して
「タイムアウト」とLambdaの「ライフサイクル」を下記のように設定します。
他の設定はデフォルトのままで「更新」を選択します。

<img src="/images/2022/20220407a/image_15.png" alt="Lambdaの実行時の設定画面" width="923" height="741" loading="lazy">

グループの設定画面に戻り「最初のサブスクリプションの追加」を選択します。

<img src="/images/2022/20220407a/image_16.png" alt="Greengrassの最初のサブスクリプションの追加" width="920" height="605" loading="lazy">

「サブスクリプションの作成」画面ではメッセージの送信元(ソース)と受信先（ターゲット）を選択します。
AWS IoTではMQTTをPub/Subできます。
以前RaspberryPiとAWS IoT CoreでPub/Subした記事をいかにまとめていますのでよろしければご覧になってください。

[GoでMQTT!!　～温湿度マイスターbotの作成～(前編)](https://future-architect.github.io/articles/20210929a/)
[GoでMQTT!!　～温湿度マイスターbotの作成～(後編)](https://future-architect.github.io/articles/20210930a/)

トピックのフィルターに「hello/world」と入力して「次へ」を選択します。

<img src="/images/2022/20220407a/image_17.png" alt="image.png" width="936" height="567" loading="lazy">

それではコアデバイスにLambda関数をデプロイします。
作成したHelloWorldグループ画面で「アクション＞デプロイ」を選択します。
デプロイする前にコアデバイスでGreengrassが起動していることを再度確認しましょう。

<img src="/images/2022/20220407a/image_18.png" alt="トピックのフィルタリング" width="931" height="476" loading="lazy">

「自動検出」を選択するとデプロイが開始します。

<img src="/images/2022/20220407a/image_19.png" alt="自動検出" width="924" height="476" loading="lazy">

デプロイが正常に終了するとステータスが緑色になります。

<img src="/images/2022/20220407a/image_20.png" alt="ステータス" width="904" height="480" loading="lazy">

## 動作確認

AWS IoTのマネジメントコンソールの「テスト＞MQTTテストクライアント」からトピックをサブスクライブします。

<img src="/images/2022/20220407a/image_21.png" alt="動作確認" width="244" height="103" loading="lazy">

トピックのフィルターはhello/worldとして、各種設定を以下のようにします。

<img src="/images/2022/20220407a/image_22.png" alt="トピックの設定" width="899" height="548" loading="lazy">

サブスクライブを選択すると、MQTTの受信が始まります。

コアデバイスが正常に動作していると下図のようにコアデバイスから設定したメッセージが届きます🎉

<img src="/images/2022/20220407a/image_23.png" alt="MQTT受信" width="1200" height="556" loading="lazy">

コアデバイスのLambda関数はクラウド上から関数を更新、グループの設定から再デプロイを行うことでいつでも更新できます。とても便利ですね。

今回はTinker BoardにGreengrassの環境を構築して終わりましたが、次回はエッジデバイスでの加工処理なども行いたいと思います。
最後までお付き合いいただきありがとうございました。
