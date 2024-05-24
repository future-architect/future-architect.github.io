---
title: "FlutterアプリをDeployGateで公開するためのいろいろ"
date: 2021/07/20 00:00:02
postid: b
tag:
  - Flutter
  - DeployGate
category:
  - Infrastructure
thumbnail: /images/20210721b/thumbnail.png
author: 澁川喜規
lede: "Flutterで環境を一度作ってしまえば、Android StudiからAndroidエミュレータ でもiOSシミュレータでもどんどん起動できるので、デバッグはとてもやりやすいです。ですが、Flutterで作るということはスマートフォン向けのアプリなので実機テストもしたいですよね？ 今回はDeployGateを使うことになったのですが、FlutterとDeployGateそのものずばりな情報が見つからなかったので、その情報をまとめます。"
---

Flutterで環境を一度作ってしまえば、Android StudiからAndroidエミュレータ でもiOSシミュレータでもどんどん起動できるので、デバッグはとてもやりやすいです。ですが、Flutterで作るということはスマートフォン向けのアプリなので実機テストもしたいですよね？ 今回はDeployGateを使うことになったのですが、FlutterとDeployGateそのものずばりな情報が見つからなかったので、その情報をまとめます。

出発点はこちらです。

```
$ flutter create dgsample
```

# まずはアプリの設定を修正

createで作成すると、Androidアプリのパッケージ名や、iOSアプリのバンドルIDが``com.example.dgsample``の形式でそこら中に埋め込まれます。ここでは所属する組織のドメイン名の入った重複しない名前にします。とりあえず、Find in Pathでデフォルトのパッケージ名が書かれているところを見つけ、新しい名前（ここでは``io.github.future_architect.dgsample``）に置き換えていきます。

表示するアプリ名はAndroidは``android/app/src/main/AndroidManifest.xml``を開き、application要素の属性を修正します。

```xml
<manifest
    xmlns:android="http://schemas.android.com/apk/res/android"
    package="io.github.future_architect.dgsample">
  <application
    android:label="DGサンプル">
   :
</manifest>
```

iOSは``ios/Runner/Info.plist``に次のタグのペアを書きます。

```xml
	<key>CFBundleDisplayName</key>
	<string>DGサンプル</string>
```

ついでに簡単にできるお化粧ということで、アイコンとスプラッシュスクリーンを変えます。

* [flutterでアプリアイコンをデフォルトから変更する方法](https://zenn.dev/kyo9bo/articles/196e949cc9dd3a)
* [【Flutter】スプラッシュ画面(Splash Screen)を一瞬で実装する](https://yaba-blog.com/flutter-splash-screen/)

適当に絵を描きました

<img src="/images/20210721b/スクリーンショット_2021-07-19_19.28.14.png" alt="適当な絵" loading="lazy">

pngファイルをエクスポートして、assetsフォルダ以下におき、アイコンとスプラッシュのそれぞれで同じ画像を参照するようにします。

```yaml pubspec.yaml
flutter_icons:
  android: true
  ios: true
  image_path: "assets/icon.png"

flutter_native_splash:
  image: "assets/icon.png"
  color: "fff8f0"
```

それぞれ、flutter-native-splashを使うのですが、同時に入れると依存ライブラリのバージョンがコンフリクトするので一つずつ行います。まずはアイコン生成で使うツールをdev_dependenciesに入れてコマンド実行。

```yaml pubspec.yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_launcher_icons: ^0.9.0
```

```bash
$ flutter pub run flutter_launcher_icons:main
```

次にスプラッシュ生成で使うツールをdev_dependenciesに入れてコマンド実行。

```yaml pubspec.yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_native_splash: ^1.2.0
```

```bash
$ flutte pub run flutter_native_splash:create
```

Android Studio上で実行すると、Androidエミュレータ上にインストールされるアイコンが変わりますし、起動画面も変わりました。

<img src="/images/20210721b/スクリーンショット_2021-07-19_19.22.27.png" alt="Androidエミュレータ上のアイコン" loading="lazy">

<img src="/images/20210721b/スクリーンショット_2021-07-19_19.24.19.png" alt="起動画面" loading="lazy">

# DeployGate用のSDKの追加

DeployGate用のSDKを入れると、ログやら何やらが見れるようになるとのことですので入れてみます。

ドキュメントは[こちら](https://docs.deploygate.com/docs/android-sdk)ですが、Flutter用になっていないので少し追加の解説を行います。依存を追加するbuild.gradleはandroid/app以下にあります。

```gradle android/app/build.gradle
dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
    implementation 'com.deploygate:sdk:4.1.0'
}
```

iOSのドキュメントは[こちら](https://docs.deploygate.com/docs/ios-sdk)です。

flutter build iosすると``ios/Podfile``が生成されるので、次の行を末尾に追加し、pod installコマンドを実行します。

```ruby ios/Podfile
pod "DeployGateSDK"
```

ソースコードを2箇所書き換えます。

```swift ios/Runner/Runner-Bridging-Header.h
#import "GeneratedPluginRegistrant.h"
// ↓この行
#import <DeployGateSDK/DeployGateSDK.h>
```

```swift ios/Runner/AppDelegate.swift
import UIKit
import Flutter

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // ここから
    DeployGateSDK
      .sharedInstance()
      .launchApplication(withAuthor: "my-group", key: "01234567890123456789")
    // ここまで
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

こちらで完了です。

# ビルド

ビルドはAndroidは一発なのですが、iOSの方はDeployGateが必要とするipaファイルをflutterコマンドだけでは作れません。一度ビルドした後に、xcodebuildコマンドを使って生成します。

お仕事用のは、pubspec.yamlのファイルをパースしつつ、もうちょっと細かいバリエーション違いをバージョンを変えてビルドしたり（flutterコマンドに``--build-number``オプションと``--build-name``オプションを使ってバージョンをそとから書き換える）、追加のファイルを環境ごとに入れ替えたりしたりちょっと複雑なことをしていたのでPythonで書いてましたが、今となってはシェルスクリプトでもmakeでもなんでもいい気はします。

iOSのビルドにはもろもろ署名とかが必要です。developer.apple.comでもろもろの登録作業を行ったり、``ios.Runner.xcworkspace``のSigning & Capabilitiesタブでユーザーや組織を選択したりしてください。

また、DeployGateのiOSにアプリの配布はAd Hocモードでの配布になるため、デバイスのUDIDを開発者サイトに登録しProvisioning ProfileにそのUDIDを登録したりします。

```py
import subprocess
import shutil
import os
import os.path


def build_android():
    print("building android...")
    subprocess.run(["flutter", "build", "apk", "--release"], check=True)
    shutil.move("build/app/outputs/flutter-apk/app-release.apk", f"android/dgsample.apk")
    print("\a")


def build_ios():
    print("building ios...")
    subprocess.run(["flutter", "build", "ios", "--release"], check=True)
    print("generating .xcarchive...")
    subprocess.run("xcodebuild -workspace Runner.xcworkspace -scheme Runner -sdk iphoneos -configuration Release archive -archivePath $PWD/build/Runner.xcarchive",
        shell=True, cwd=os.path.join(os.getcwd(), "ios"), check=True)
    print("generating .ipa...")
    subprocess.run("xcodebuild -allowProvisioningUpdates -exportArchive -archivePath $PWD/build/Runner.xcarchive -exportOptionsPlist exportOptions.plist -exportPath dgsample",
        shell=True, cwd=os.path.join(os.getcwd(), "ios"), check=True)
    print("\a")


if __name__ == "__main__":
    build_android()
    build_ios()
```

あとはこれらのビルド結果をDeployGateにあげれば大丈夫なはず！

