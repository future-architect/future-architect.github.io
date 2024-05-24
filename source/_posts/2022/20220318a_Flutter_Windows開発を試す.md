---
title: "Flutter Windows開発を試す"
date: 2022/03/18 00:00:00
postid: a
tag:
  - Flutter
  - Windows
  - デスクトップアプリ
category:
  - Programming
thumbnail: /images/20220318a/thumbnail.png
author: 澁川喜規
lede: "FlutterのWindows対応が正式版になったので軽く試してみました。Flutterのいつものインストール手順でインストールします。"
---

[Dart/Flutter連載](/articles/20220315a/) の3本目です。

FlutterのWindows対応が正式版になったので軽く試してみました。

# インストール

Flutterのいつものインストール手順でインストールします。

* https://docs.flutter.dev/get-started/install

手順としては次の通り

* Flutterのサイトからstableのzipをダウンロード
* 適当なフォルダーに展開してflutter/binフォルダにパスを通す（今回は``%USERPROFILE%/flutter/bin``でアクセスするようにしました）
* ``flutter upgrade``で最新版にしてから、あとは``flutter doctor``でどんどん足りないコンポーネントを入れていく

他の環境と違うのは、Visual Studio（Codeじゃない方）が必要なことですね。インストーラを起動したらC++を使ったデスクトップ開発を選択してインストールします。

<img src="/images/20220318a/スクリーンショット_2022-03-06_092832.png" alt="スクリーンショット_2022-03-06_092832.png" width="1200" height="675" loading="lazy">

今回の検証ではなくてもよいのですが、IDEとしてはAndroid Studioが便利なのでそれも入れました。FlutterとDartのプラグインも入れます。全部緑色になると気持ち良いですね。

<img src="/images/20220318a/image.png" alt="Visual Studioインストール" width="1200" height="311" loading="lazy">

# Windowsデスクトップの有効化

CLI上でflutterコマンドを使って有効化します。

```sh
$ flutter config --enable-windows-desktop
Setting "enable-windows-desktop" value to "true".

You may need to restart any open editors for them to read new settings.
```

既存のプロジェクトでは次のコマンドでWindowsデスクトップのターゲットを追加できます。

```sh
> flutter create --platforms=windows .
Recreating project ....
:
All done!
In order to run your application, type:

  $ cd .
  $ flutter run

Your application code is in .\lib\main.dart.
```

# プロジェクトの作成とビルド

Android Studioでプロジェクトを作ります。New Flutter Pojectでプロジェクトを作成します。僕はターゲットの追加でLinuxとかmacOSも試しに追加してみたのでいろいろプラットフォームが多いですが、いくらつけてもAndroid Studio上で選択できるわけではありません。クロスコンパイルとかできると便利なんですけどね。

<img src="/images/20220318a/image_2.png" alt="Android Studioプロジェクト作成" width="862" height="660" loading="lazy">

プロジェクトができたら、上段から``Windows (Desktop)``を選んで実行すればWindowsのアプリがビルドされます。

<img src="/images/20220318a/image_3.png" alt="Windows (Desktop)の選択" width="462" height="203" loading="lazy">

サンプルにテキストフィールドだけ追加してみた感じのものがこちらです。何事もなく普通ですね。IMEも普通に使える。``flutter build windows``でプロダクションビルドをしてみました。

Qt(Widgets)だとランタイム入れて50MBぐらいになったと思うのですが、``build/Release/runner``だと21MBですね。フォントが1.5MB、アイコンが280KB、ランタイムが14MB、app.soというDartコードをビルドして作られたモジュールらしきものが4MB。ランチャーが75KB。zip圧縮すると8MBぐらいなので配布も楽勝ですね。Electronだと展開後は数100MB、圧縮しても1環境ごとに50MB（macOSのユニバーサルバイナリとかWindowsの32/64ビット両対応をやると2倍）なので1/10ぐらい。

```
$ du -h
1.9M    ./data/flutter_assets
6.5M    ./data
21M     .
```

<img src="/images/20220318a/image_4.png" alt="デモ画面" width="750" height="478" loading="lazy">

リソース使用量はかなり少ないですね。GPUはモバイルのRyzen 4900HSの内蔵GPUなのでそこまで強いわけじゃないですが、負荷はかなり小さいです。メモリ使用量もQt並み。そのうちソフトウェアの二酸化炭素排出量が・・・みたいな話になったらFlutterは良さそう。

<img src="/images/20220318a/image_5.png" alt="PCリソース利用量" width="1200" height="178" loading="lazy">

# ついでにLinuxのコードも見てみる

安定版になったのはWindowsだけですが、Linuxも興味本位で覗いてみました。ビルド設定ファイルを見ると、GTKを使っていているようですね。GLFWでOpenGLベースのものも選べると。GTKなのでUbuntuとかのLinuxデスクトップであればIME対応も問題なさそうです。

https://github.com/flutter/engine

```sh /main/shell/platform/linux/BUILD.gn
group("linux") {
  deps = [
    ":flutter_linux_gtk",
    ":publish_headers_linux",
  ]
  if (build_glfw_shell) {
    deps += [
      ":flutter_linux_glfw",
      "//flutter/shell/platform/glfw:publish_headers_glfw",
      "//flutter/shell/platform/glfw/client_wrapper:publish_wrapper_glfw",
    ]
  }
}
```

# ライブラリ対応

なお、Flutterのライブラリはマルチプラットフォーム対応はパッケージごとにだいぶ差がありますし、Windowsデスクトップ対応はその中でもかなり少ないです。例えば、人気のWebViewのパッケージの[webview_flutter](https://pub.dev/packages/webview_flutter)とか[flutter_inappwebview](https://pub.dev/packages/flutter_inappwebview)は非対応ですが、flutter.dev公式の[webview_flutter_platform_interface](https://pub.dev/packages/webview_flutter_platform_interface)なんかもでてきていて、ちょっとずつ使えるライブラリなんかも増えていくんじゃないかなと思います。

# 他のフレームワークとの比較

QtとかElectronだと、ウインドウとは独立して「アプリケーション」やら「メインプロセス」といったものがあり、ウインドウはその付属物という世界観となっています。DelphiとかWin32の直利用とかもみんなそうですね。なので1つのアプリケーションで多数のウィンドウを持つMDIみたいなのもあったりはしますが、Flutterは元々がモバイルの世界観なのか、アプリケーション==ウインドウというところはちょっと違うなという感じがありますが、それはまあそういうもんだな、という感じで受け入れられそうな気はします。

Visual Studioだけじゃなくて、QtみたいにWindows SDKも使えたり、クロスプラットフォームビルドもできたりするといいのになぁ、と思ったりはしますが、なにより、使いやすい言語で開発できて、クロスプラットフォームでAndroidやiOSにも展開できて、というのは魅力的です。類似のソリューションもいくつかありますが、バイナリも小さくメモリ使用量も少ないところがよさそうですね。[Tauri](https://tauri.studio/docs/about/intro)も面白そうですけどね。

ウェブサービスを開発しつつ、コンパニオンアプリをモバイルのついでにデスクトップ版も作るよ、というケースや、長時間動かしたあとの安定性とかはわかりませんがキオスク端末とかのWindows IoTみたいな長く使うOS環境で少ないメモリで動かすには良いかもしれません。

# タスクトレイ常駐型アプリを作ってみる

ほとんどのシステムがウェブブラウザをインタフェースとして利用するウェブアプリケーションという時代にあって、ローカルでアプリケーションをわざわざ作る理由というのは、単体アプリケーションとして使えるほうが便利というもの以外に、システムに統合される便利UIを追加で提供する、みたいな理由があります。例えば、Google Driveはデスクトップ版のツールを入れたりするとローカルとの同期を取ったりできますし、AdobeやJetBrainsはアプリケーションの更新をダウンロードするインタフェースとして常駐プログラムを提供していたりします。

Flutterは使用するリソースがマルチプラットフォームな環境の割には少なそうなので、この手の常駐アプリにはよさそうです。常駐アプリでリソースを食いまくるのはみんな嫌がりますしね。

まず、Flutterはアプリ＝ウインドウ＝アクティブなので、ウインドウ非表示のままアプリを実行し続けるということがデフォルトではできません。そこは、パッケージの[bitsdojo_window](https://pub.dev/documentation/bitsdojo_window/latest/)の力を借りる必要があります。また、システムトレイは[system_tray](https://pub.dev/packages/system_tray)を利用しました。こちらはシステムトレイにアイコンを表示しつつ、コンテキストメニューを表示したり、アイコンを動的に切り替えたりといったことができます。

今回はWindowsに特化して説明しますが、各ライブラリはmacOSやLinuxにも対応しています。そちらは紹介しませんので興味のある方はそれぞれのライブラリのドキュメントを参照してください。

まずライブラリを追加します。

```yaml pubspec.yaml
dependencies:
  system_tray: ^0.1.0
  bitsdojo_window: ^0.1.1+1
```

まずは、bitsdojo_window側からやっていきます。WindowsであればWindows用のmain.cppの先頭に次の2行を足します。これでデフォルトでウインドウが非表示になります。サンプルだとCUSTOM_FRAMEだかもつけていますが、これをするとウインドウタイトルが消えて終了が面倒なので消しました。

```cpp windows/runner/main.cpp
#include <bitsdojo_window_windows/bitsdojo_window_plugin.h>
auto bdw = bitsdojo_window_configure(BDW_HIDE_ON_STARTUP);
```

ウインドウが表示される際のサイズなどを設定します。サンプルだと最後にappWindow.show()をしていますが、常駐なのでそこの行は消しました。

```dart main.dart
import 'package:bitsdojo_window/bitsdojo_window.dart';

void main() {
  runApp(const MyApp());

  doWhenWindowReady(() {
    final initialSize = Size(600, 450);
    appWindow.minSize = initialSize;
    appWindow.size = initialSize;
    appWindow.alignment = Alignment.center;
  });
}
```

この後はappWindow経由でウインドウを消したり表示したりができます。

次にsystem_tray周りのコードを追加します。まずはimportを足します。

```dart main.dart
import 'package:system_tray/system_tray.dart';
```

ウインドウのステートのクラス、あるいはstatelessであればそのウィジェットそのものに以下のコードを足します。ここではコンテキストメニューは消していますが、サンプルにはコンテキストメニューの使い方もあります。ここはクリックされたらウインドウを表示しているだけですが、本来ならメインウインドウの閉じるが押されたらhide()する、表示時にアイコンをクリックしたらhide()するといったコードも必要でしょう（前者をどうやるかはまだ調べてません）。

```dart main.dart
  @overrideclass _MyHomePageState extends State<MyHomePage> {
  final SystemTray _systemTray = SystemTray(); // システムトレイ
  final AppWindow _appWindow = AppWindow();    // ウインドウ表示で使う

  // 中略

  void initState() {
    super.initState();
    initSystemTray();
  }

  Future<void> initSystemTray() async {
    String path = 'assets/idea.ico';

    await _systemTray.initSystemTray(
      title: "system tray",
      iconPath: path,
      toolTip: "How to use system tray with Flutter",
    );

    _systemTray.registerSystemTrayEventHandler((eventName) {
      if (eventName == "leftMouseDown") {
      } else if (eventName == "leftMouseUp") {
        _appWindow.show();
      }
    });
  }
```

アイコンはこちら↓のを使わせていただいております。Creative Commons By-SAです。いつも通り、pubspec.yamlにアセットとして追加します。

[Professions and jobs icons created by Yogi Aprelliyanto - Flaticon](https://www.flaticon.com/free-icons/professions-and-jobs)

ビルドして動かしてみると、以下のようにアイコンがトレイに表示され、クリックしたら表示されることがわかります。

<img src="/images/20220318a/image_6.png" alt="アイコン" width="229" height="104" loading="lazy">

うまく用途にあうニーズが見つけられればFlutterでやろう！というのは説得できそうな感じがします。使えるチャンスをうかがっていきたいですね。

