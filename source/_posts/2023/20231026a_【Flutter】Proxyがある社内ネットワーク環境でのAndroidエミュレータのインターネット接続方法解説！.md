---
title: "【Flutter】Proxyがある社内ネットワーク環境でAndroidエミュレータからインターネットに接続する方法"
date: 2023/10/26 00:00:00
postid: a
tag:
  - Flutter
  - プロキシ
  - Android
  - エミュレータ
category:
  - Mobile
thumbnail: /images/2023/20231026a/thumbnail.png
author: 後藤田千里
lede: "プロキシが存在するネットワーク内で、Androidエミュレータからインターネット接続ができず、頭を悩ませたことはありませんか？"
---

## はじめに

こんにちは。思い出をショートムービーとして残すアプリ、[PostPix](https://postpix.jp/)を作っている後藤田です。

[PostPix](https://postpix.jp/)はFlutterで作っています。ぜひ、ダウンロードしてあなたの思い出をショートムービーにしてみてください！

<style>
.linkable_img:hover {opacity:0.5;}
</style>

<a  target="_blank" rel="noopener" class="linkable_img" title="PostPix | 旅行を通じた、ノスタルジックエクスペリエンスサービス" href="https://postpix.jp/" >
    <img src="/images/2023/20231026a/b6fc4438-8326-63c9-a373-1143d4d88207.png" alt="" width="1200" height="1067" loading="lazy">
</a>

## Androidエミュレータからプロキシサーバを超えてインターネットに出たい

プロキシが存在するネットワーク内で、Androidエミュレータからインターネット接続ができず、頭を悩ませたことはありませんか？

私たちは、この課題に対する解決策として、[middleproxy](https://github.com/ma91n/middleproxy/releases/tag/v0.0.3)（社内のエンジニアが作ってくれたツール）とFlutterの[native_flutter_proxy](https://pub.dev/packages/native_flutter_proxy)ライブラリを活用しています。

この記事ではそれらについて解説します。

最終的な構成は次のようになります。

<img src="/images/2023/20231026a/env.png" alt="" width="945" height="529" loading="lazy">

なお、開発環境はWindows。プロキシは認証つきで、独自の証明書を利用する前提とします。

## 1. Android仮想デバイスの作成

まずは、Android仮想デバイス（AVD）を作成します。今回は `Pixel_4_XL` を利用するとします。

```sh
%UserProfile%\AppData\Local\Android\sdk\emulator\emulator -writable-system -avd Pixel_4_XL_API_30
```

`%USERPROFILE%/.android`に `advancedFeatures.ini` を作成し、以下の2行を追加します。

```ini
Vulkan = off
GLDirectMem = on
```

## 2. adbのインストール

[Android Debug Bridge（adb）](https://source.android.com/docs/setup/build/adb?hl=ja)をインストールします。

必要に応じて、adbにPATHは通しておきます。

以下のように出力されればOKです。

```sh
> adb --version
Android Debug Bridge version 1.0.41
Version 33.0.3-8952118
Installed as C:\Program Files\platform-tools\adb.exe
```

## 3. CA証明書のエミュレータへの転送

プロキシが要求する証明書が `custom_ca.cer` であり、その証明書をDesktop直下に配備したとします。

これをホストPCから、Androidエミュレータ側の、 `/sdcard/Download` にパスに転送します。

```sh
$ cd %USERPROFILE%\Desktop
$ adb root
$ adb disable-verity
$ adb shell avbctl disable-verification
$ adb reboot
# reboot 後に待機
$ adb root
$ adb remount
$ adb push custom_ca.cer /sdcard/Download
```

## 4. 証明書の読み込み

エミュレータ上のAndroidを操作します。

`歯車マーク` > `Security` > `Advanced` > `Encryption & credentials` > `Install a certificate` > `CA certificate` > `Install anyway` > 上のハンバーガーメニューから `Android SDK build for x86 を選択` > `Download を開く`

...すると、先ほど追加した、`custom_ca.cer` があるので、クリックして読み込みます。

## 5. ローカルプロキシ起動

[middleproxy](https://github.com/ma91n/middleproxy/releases/tag/v0.0.3)から `middleproxy_0.0.3_Windows_i386.tar.gz` をダウンロード & 解凍（ご自身の環境に合わせてダウンロードしてください）します。

次のようにプロキシ情報を環境変数に設定して、起動します。

```sh 起動イメージ
set http_proxy=http://{username}:{password}@proxy.example.com:8000
set http_proxy_username={username}
set http_proxy_password={password}
middleproxy.exe #起動してもログは出ません。
```

## 6. エミュレータ上のプロキシ設定

`WiFiマークを長押し` > `AndroidWifi の歯車マーク` > `右上の鉛筆マーク` > `Advanced options` > `Proxy` > `Manual`

- Proxy hostname `10.0.2.2`
- Proxy port: `9000`

を入力して保存します。

補足ですが、 `10.0.2.2` はエミュレータ上のAndroidからみた、ホスト側のIPです。

## 7. アプリ側の設定をする

設定ファイルに以下のネットワーク・セキュリティ設定を加えます。

```xml AndroidManifest.xml
<application
   android:networkSecurityConfig="@xml/network_security_config"
```

`res/xml/network_security_config.xml` を作成し、次を追加します。

```xml res/xml/network_security_config.xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config xmlns:tools="http://schemas.android.com/tools">
    <debug-overrides>
        <trust-anchors>
            <certificates src="@raw/custom_ca"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

`res/raw` に `custom_ca.cer` を配備して参照できるようにします。

## 8. native_flutter_proxy

さて、やっとDartのコードです。`native_flutter_proxy` ライブラリの力を借りて、エミュレータ上のAndroidアプリからもインターネット接続を可能にします。

```dart main.dart
// Flutterのmain.dartや適当な初期化箇所に以下を追加
import 'package:native_flutter_proxy/custom_proxy.dart';
import 'package:native_flutter_proxy/native_proxy_reader.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  bool enabled = false;
  String? host;
  int? port;
  try {
    ProxySetting settings = await NativeProxyReader.proxySetting;
    enabled = settings.enabled;
    host = settings.host;
    port = settings.port;
  } catch (e) {
    print(e);
  }
  if (enabled && host != null) {
    final proxy = CustomProxy(ipAddress: host, port: port);
    proxy.enable();
    print("proxy enabled");
  }

  runApp(MyApp());
}
```

`native_flutter_proxy` ですが、エミュレータの端末に設定されたシステムのプロキシ設定を読み込み、インターネット接続を行えるようにしてくれます。

### ※それでもインターネット接続できない場合

1. Androidエミュレータ側のプロキシ設定を外してみる（direct）
2. localhost:9000 にmiddleproxyが起動しているか確認する（例： ホスト側のプロキシをproxy.example.com:8000 から、 localhost:9000 に変えてみて、ホスト側のブラウザが起動するか、もしくはcurlが通るか、確認してみる）

## （任意）AndroidエミュレータへのChromeインストール

ここは任意ですが、エミュレータAndroid上にChromeをインストールしておくと、疎通などで便利なことがあるので合わせて設定しておくことをオススメします。

[こちら](https://www.apkmirror.com/apk/google-inc/chrome/chrome-69-0-3497-86-release/chrome-browser-69-0-3497-86-3-android-apk-download/?redirected=thank_you_invalid_nonce)からapkをダウンロードし、エミュレータ画面にdrag & dropします。

## おわりに

本記事では、Flutterにおけるプロキシが存在するネットワーク環境での、Androidエミュレータのインターネット接続方法について紹介しました。

この手順を参考に、効果的にエミュレータを利用し、みなさんの開発に役立てれば幸いです。

最後にまた宣伝させてください！！  

[PostPix](https://postpix.jp/)であなたの思い出をショートムービーという新しい形で残してみませんか？？
[PostPix](https://postpix.jp/)はFlutterで作成しています。ぜひダウンロードのほどお願いします！

<a  target="_blank" rel="noopener"  class="linkable_img" title="PostPix | 旅行を通じた、ノスタルジックエクスペリエンスサービス" href="https://postpix.jp/">
    <img src="/images/2023/20231026a/PostPix2.png" alt="" width="1200" height="1067" loading="lazy">
</a>
