---
title: "VSCode DevToolsによるWidget Buildタイムラインの確認"
date: 2022/03/17 00:00:00
postid: a
tag:
  - Flutter
  - VSCode
category:
  - Programming
thumbnail: /images/20220317a/thumbnail.png
author: 藤田春佳
lede: "VS CodeのDevToolsをを使用したWidget Buildの可視化についてご紹介します。Flutterアプリの開発では、Widgetのビルド単位を考えてコードを記述/改修すると思います。AndroidStudioのPerformance機能を使ってWidgetのリビルドを確認している例は見かけるのですが、VSCodeでの確認方法を見かけなかったため調べてみました。予想以上に高機能で、今回使わなかった機能も含めて活用どころがありそうです。"
---

# はじめに

こんにちは。TIGの藤田です。
[Dart/Flutter連載](/articles/20220315a/) の2日目として、VSCodeの[DevTools](https://docs.flutter.dev/development/tools/devtools/overview)を使用したWidget Buildの可視化についてご紹介します。

Flutterアプリの開発では、Widgetのビルド単位を考えてコードを記述/改修すると思います。
[AndroidStudioのPerformance機能](https://docs.flutter.dev/development/tools/android-studio#show-performance-data)を使ってWidgetのリビルドを確認している例は見かけるのですが、VSCodeでの確認方法を見かけなかったため調べてみました。予想以上に高機能で、今回使わなかった機能も含めて活用どころがありそうです。

# 内容
１. [VSCode Dart DevTools](#vscode-dart-devtools)
２. [Widget Buildをタイムラインで確認する](#widget-buildをタイムラインで確認する)
３. [実装のWidget Buildへの影響を確認](#実装のwidget-buildへの影響を確認)

# VSCode Dart DevTools
Flutter公式の[DevTools](https://docs.flutter.dev/development/tools/devtools/overview)は、VSCodeの[Dart Extension](https://marketplace.visualstudio.com/items?itemName=Dart-Code.dart-code), [Flutter Extension](https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter)のインストールと共にインストールされます。レイアウト構造を可視化/編集できる[Flutter Inspector](https://docs.flutter.dev/development/tools/devtools/inspector) がよく使われると思いますが、他にもCPUやメモリ、Networkの可視化など多機能です。今回は、[Performance view](https://docs.flutter.dev/development/tools/devtools/performance)機能を使ってWidget Buildをタイムラインで確認してみます。

# Widget Buildをタイムラインで確認する

1. devTools起動: [公式手順](https://docs.flutter.dev/development/tools/devtools/vscode)に従って、アプリの起動後にDevToolsを起動します。
2. DevToolsのPerformanceタブを開きます。
<img src="/images/20220317a/performance_tab.png" alt="performance_tab.png" width="1200" height="355" loading="lazy">
3. 「Enhance Tracing」から、Widget Builds, Layouts, PaintsをTrackするように設定します。
<img src="/images/20220317a/EnhanceTracing.png" alt="EnhanceTracing.png" width="797" height="262" loading="lazy">
4. アプリを実行すると、タイムラインにFrameごとの処理時間が表示されます（#１）。Frame Time(UI)は、Dart VM内でビルドされるLayer treeと描画コマンドを含む軽量オブジェクトの作成時間を表しています。これらオブジェクトがGPUに渡されることでレンダリングが行われ、その実行時間が、Frame Time(Raster)になります。
5. バーグラフをクリックすると、UIイベント, Raster(GPU)イベントそれぞれの内訳を確認することができます。UIイベントは、実装Dartコードを直接反映していて、Widgetレベルで実行イベントを確認できます。（#2）
6. Raster(GPU)イベント（#3）は、UIイベントから作成されます。アプリのパフォーマンスを考える上では、UIグラフに課題がなくても、GPUグラフに課題があることもあります。
7. 「Performance Overlay」ボタン（#4）をONにすると、アプリ画面に重ねる形で、UIグラフとGPUグラフを確認できます。

【補足】 公式ページに紹介される[パフォーマンス診断](https://docs.flutter.dev/perf/rendering/ui-performance#diagnosing-performance-problems)では、UIスレッドとGPUスレッドのプロファイルから実装に落とし込んで対処することを説明しており、実機を使用した[profile mode](https://docs.flutter.dev/testing/build-modes#profile)にて行うことを前提としています。今回はiOSシミュレータにて、DevToolsの使い方と、ソースコードがプロファイルに与える影響の確認方法を見てみたいと思います。

<img src="/images/20220317a/image.png" alt="image.png" width="963" height="749" loading="lazy">


# 実装のWidget Buildへの影響を確認

例として、アニメーションの実装方法によるWidget Buildパタンの違いをタイムラインで確認します。今回はiOSシミュレータ（iPhone 13）を使用しています。

１） 全体ビルド（アンチパタン）
bodyのアニメーションのためにsetState()することで、レイアウト全体をビルドしてしまっています。

```dart
import 'package:flutter/material.dart';

void main() => runApp(App());

class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Page(),
      checkerboardOffscreenLayers: true,
    );
  }
}

class Page extends StatefulWidget {
  @override
  PageState createState() => PageState();
}

class PageState extends State<Page> with TickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2));

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('test animation'),
      ),
      body: Center(
        child: Opacity(
          opacity: _controller.value,
          child: Image.asset('assets/dash.png'),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _controller
            ..reset()
            ..forward();
        },
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
```

画面はこのようになります。Overlayされたグラフの上段がRaster(GPU)スレッド, 下段がUIスレッドを表しています。16msおきに補助ラインが引かれていますが、[おおよそ16msを超えるFrameは描画されずにJankとなります](https://docs.flutter.dev/perf/rendering/ui-performance#interpreting-the-graphs)。UIスレッド側に多くのJankが見られることから、この実装には課題がありそうだと分かります。

<img src="/images/20220317a/83854e5c-c719-6331-6f55-ef03e48c3359.gif" alt="" width="560" height="2000" loading="lazy">

Frame実行時間のタイムラインを見ても、UIグラフに赤色のJank（slow frame）が多くなっています。
<img src="/images/20220317a/test1.png" alt="test1.png" width="1200" height="141" loading="lazy">

UIイベントの内訳を見てみましょう。連続する2Frameをクローズアップしていますが、アニメーションには関係のないAppBarやFloatingActionButtonも、Frame毎にビルドしてしまっていることが分かります。今回はビルド対象が小さいですが、対象が大きければ更にコストがかかりそうです。

<img src="/images/20220317a/test1_ui.png" alt="test1_ui.png" width="1200" height="457" loading="lazy">

GPUイベントも確認してみます。こちらは、赤いグラフが見られなかったことからも大きな課題はなさそうです。

<img src="/images/20220317a/test1_raster.png" alt="test1_raster.png" width="1200" height="339" loading="lazy">



２） コードの改善
Frame毎のビルド範囲をアニメーション部分に限定するには[AnimatedBuilder](https://api.flutter.dev/flutter/widgets/AnimatedBuilder-class.html)等を用いる方法があります。ただし今回のケースは、以下のように[Image](https://api.flutter.dev/flutter/widgets/Image-class.html) widgetを使用することで、Frame毎のビルドをなくすことができます。


```dart
import 'package:flutter/material.dart';

void main() => runApp(App());

class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Page(),
      checkerboardOffscreenLayers: true,
    );
  }
}

class Page extends StatefulWidget {
  @override
  PageState createState() => PageState();
}

class PageState extends State<Page> with TickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2));
  late final _animation = CurvedAnimation(parent: _controller, curve: Curves.easeIn);

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('test animation')),
      body: Center(
        child: Image.asset(
          'assets/dash.png',
          opacity: _animation,
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _controller
            ..reset()
            ..forward();
        },
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
```

アプリ画面は以下になります。下段UIスレッドから、Jankがほぼなくなりました。少し見にくいですが、各グラフに平均実行時間が表示されていて、GPUスレッドは5.4ms/frame, UIスレッドは7.9ms/frameとなっています。（改修前は、GPUスレッドが4.1ms/frame, UIスレッドが19.7ms/frameでした。）
<img src="/images/20220317a/5538b10a-158a-bd17-b27f-09f0f4c22222.gif" alt="" width="480" height="1000" loading="lazy">

Frame実行時間のタイムラインを見ても、UIグラフに赤色のJank（slow frame）が見られません。平均43FPSとなっており、改修前の28FPSより改善しています。
<img src="/images/20220317a/test4.png" alt="test4.png" width="1200" height="129" loading="lazy">

UIイベントの内訳を見てみると、Frame毎の「Build」処理自体がなくなっていることが分かります。
<img src="/images/20220317a/test4_ui.png" alt="test4_ui.png" width="1200" height="455" loading="lazy">

GPUイベントについては、画面Overlayグラフからもわかるように、改修前より少し実行時間が増えていますが、Jankは見られず課題はなさそうです。
<img src="/images/20220317a/test4_raster.png" alt="test4_raster.png" width="1200" height="320" loading="lazy">



# まとめ

- VSCodeのDevToolsを使って、Dart VM上のDartコード実行によるビルド（UIスレッド）と、GPU上のレンダリング(Rasterスレッド)のFrame毎の実行時間をタイムラインで可視化できます。
- Jank　Frameを１つの指標として、UIスレッド(Dartコード)の内訳を確認することで、実装コードの改善に利用できます。
- 効果的なパフォーマンス改善には、他の観点も必要となります。
    - I/O処理（IOスレッド）は、パフォーマンス上コストが高くUIスレッドやGPUスレッドをブロックするため、その考慮が必要。
    - CPUやメモリメトリクスの考慮（DevToolsのうち、今回取り上げていない機能）
    - 実機（ユーザーが使用し得る一番遅いデバイス）での確認
- パフォーマンス改善については、[公式ページ](https://docs.flutter.dev/perf)も参考に、今回紹介できなかった機能も活用していきたいところです。

# 参考リンク
- [Improving rendering performance](https://docs.flutter.dev/perf/rendering)
    - Flutter公式サイトにおける、レンダリングパフォーマンスのページ。

