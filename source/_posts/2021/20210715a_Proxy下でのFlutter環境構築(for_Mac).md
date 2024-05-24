---
title: "Proxy下でのFlutter環境構築(for Mac)"
date: 2021/07/15 00:00:00
postid: a
tag:
  - Flutter
  - Proxy
  - 環境構築
category:
  - Programming
thumbnail: /images/20210715a/thumbnail.png
author: 斎藤賢太
lede: "以前、当ブログで連載が行われたFlutterですが、先日業務のためにFlutterの環境構築をしようとしたところ、いくつかの障壁がありました。当記事ではProxyがある環境下でMac上にFlutterの環境構築について、ダウンロードから仮想デバイス上での公式デモアプリ（Android）実行まで紹介いたします。"
---
TIG DXユニットでアルバイトをしている齋藤です。

以前、当ブログで[連載](/articles/20210510a/)が行われたFlutterですが、先日業務のためにFlutterの環境構築をしようとしたところ、いくつかの障壁がありました。

当記事ではProxyがある環境下でMac上にFlutterの環境構築について、ダウンロードから仮想デバイス上での公式デモアプリ（Android）実行まで紹介いたします。iOSアプリに関しては今回は説明いたしません。

## 環境

* マシン: MacBook Pro (2020, Intel CPU)
* ネットワーク: 社外への通信はHTTP Proxyの経由が必要

※ Apple Siliconを搭載したMacでは、[Developing with Flutter on Apple Silicon](https://github.com/flutter/flutter/wiki/Developing-with-Flutter-on-Apple-Silicon) を参考にする必要があるようです。

## Flutterのインストール、flutter doctor
基本的にはFlutter公式の[Install](https://flutter.dev/docs/get-started/install)に沿ってインストールを進めていきます。

予め、`flutter pub get`で必要になるProxyに関する設定を行います。.zshrc等に設定を追記します。

```sh
# 認証なしの場合
export http_proxy=http://proxy.example.com:8000
export https_proxy=$http_proxy
export HTTP_PROXY=$http_proxy
export HTTPS_PROXY=$http_proxy
export NO_PROXY=localhost,127.0.0.1
export no_proxy=$NO_PROXY

# 認証付きの場合(※)
export http_proxy=http://username:password@proxy.example.com:8000
# 以下同じ
```

(※)なお、記号ありパスワードの場合、flutter pub getではURLエンコードせずにそのまま記載するとうまくいくようです。
`HTTP_PROXY="http://username:password%26@proxy.example.co.jp:8000"` ではなく、 `HTTP_PROXY="http://username:password&@proxy.example.co.jp:8000"` で設定します。

続いてFlutter公式から`flutter_macos_<version_name>-stable.zip`をダウンロードします。
そして、次のコマンドを実行していきます。Flutterのインストール先は`~/develop`として説明します。

```sh
cd ~/development
unzip ~/Downloads/flutter_macos_<version_name>-stable.zip

export PATH="$PATH:`pwd`/flutter/bin"

# Flutter doctor実行。Android StudioやXCode以外がパスしていればOK
flutter doctor
```

ちなみに、Flutterの一部のコマンドでは`flutter doctor -v`のように`-v`オプションを付けることで、詳細なログが表示されます。上手くいかないときは`-v`オプションをつけると、失敗の原因が見つかりやすくなります。

## Android Studioのインストール

IDEのAndroid Studioの設定を行います。Android Studioが未インストールならば、[Android Studio のインストール](https://developer.android.com/studio/install?hl=ja) に沿ってインストールします。

続いて起動画面で「Configure」→「Plugins」を選択して開き、Flutterを検索し、Flutter Pluginをインストールします。同時にDart Pluginもインストールされます。

次にJavaのSDKをAndroid SDKが対応しているJDK 1.8.0に変更します。最新のJDKを使おうとすると、`flutter doctor --android-licenses`のときに実行時エラーになると思います。

JDK 1.8.0がなければインストールします。そして、次の設定を.zshrc等に追加します。

```sh
export JAVA_HOME=`/usr/libexec/java_home -v 1.8`
```

再度、`flutter doctor`を実行します。すると、android licenseの認証が求められるため、`flutter doctor --android-licenses`を実行します。

何回か同意を求められるので`y`を入力し、同意します。

最後に再度`flutter doctor`を実行し、XCode以外は正常であることを確認します。iOSアプリを開発しない場合、XCodeは不要です。

## プロジェクト作成
Flutterのプロジェクトを作成します。このとき、Android Studioの`New Project`から作成しようとすると、Android StudioでProxyの設定をしていても上手くいきません。そのため、terminalでプロジェクトを作成したいディレクトリに移動し、`flutter create <project_name>`を実行してプロジェクトを作成します。

続いてターミナルでプロジェクトのディレクトリまで移動し、`flutter pub get`を実行します（Android Studioからは上手く動作しない）。これで必要なパッケージが導入されます。

次にAndroidアプリを実行する仮想デバイスを起動します。画面上部の`<no device selected>`からプルダウンして`Open Android Emulator: Pixel 3A API 30 x86`などを選択します。最初からAndroid Emulatorが一つはインストールされていると思います。選択すると仮想デバイスが起動されます。

続いて、仮想デバイス選択の右の欄でエントリーポイントが`main.dart`になっていることを確認します。最後にさらに右にある再生ボタンの形をした「Run」をクリックします。

このとき、以下のようなProxy関連のエラーが発生することがあります。

```sh
Exception in thread "main" java.io.IOException: Unable to tunnel through proxy. Proxy returns "HTTP/1.1 407 Proxy Authentication Required"
```

これは途中`gradlew assembleDebug`を実行するときのエラーなので、gradleでのProxy設定を行います。`~/.gradle/gradle.properties`において

```gradle
systemProp.http.proxyHost=http://proxy.example.com
systemProp.http.proxyPort=8000
systemProp.http.proxyUser=username
systemProp.http.proxyPassword=password
systemProp.https.proxyHost=http://proxy.example.com
systemProp.https.proxyPort=8000
systemProp.https.proxyUser=username
systemProp.https.proxyPassword=password
```

を記述します。記号はURLエンコードなどをせず、そのまま入力します(`?`などはそのまま入力してOK)。

加えて、証明書エラーが出ることもあります。

```sh
A problem occurred configuring root project 'android'.
> Could not resolve all artifacts for configuration ':classpath'.
   > Could not resolve com.android.tools.build:gradle:4.1.0.
     Required by:
         project :
      > Could not resolve com.android.tools.build:gradle:4.1.0.
         > Could not get resource 'https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/4.1.0/gradle-4.1.0.pom'.
            > Could not GET 'https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/4.1.0/gradle-4.1.0.pom'.
               > PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target
```

この場合はJavaのルート証明書一覧にdl.google.comの証明書を追加することで解決できます。

* まず https://dl.google.com/dl/android/ に移動します。404が表示されますが問題ありません。
* 続いて、以下の手順で証明書を入手します。ブラウザにGoogle Chromeを使用する場合で説明します。
    * URL横の鍵マークをクリックし、「証明書」をクリックします。
    * 一番上の証明書をクリックし、表示された証明書アイコンをデスクトップにドラッグ&ドロップします。
        * `~/Desktop/Digital\ Arts\ Inc.\ CA.cer`が作成される。
* keytoolを用いて、証明書を追加します。
  * 例：`keytool -import -alias certificationdisitalartsinc -keystore ~/Library/Application\ Support/Google/AndroidStudio4.2/ssl/caerts -file ~/Desktop/Digital\ Arts\ Inc.\ CA.cer`

以上の問題が解決され、正常に動作すれば環境構築完了です。以下のようにカウントアップアプリが起動し、操作できると思います。

<img alt="flutter_demo_launch" src="/images/20210715a/flutter_demo_launch.png" width="500" height="894" loading="lazy">


## まとめ

Proxyがある環境下でMac上にFlutterの環境構築について紹介いたしました。Proxy環境下での環境構築は厄介なことになりがちですが、適切な設定を行い、素敵な開発ライフを送っていただければと思います。


