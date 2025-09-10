---
title: "Future Tech Night #22 Flutter勉強会より：Flutterアプリのperformance測定と基本的な実装ポイント"
date: 2022/05/25 00:00:00
postid: a
tag:
  - Flutter
  - プロファイリング
  - 性能検証
  - 登壇レポート
category:
  - Mobile
thumbnail: /images/2022/20220525a/thumbnail.png
author: 藤田春佳
lede: "Flutterアプリのperformance測定と基本的な実装ポイントについてご紹介します。1.Performanceについて、2.DevToolsについて..."
---

## はじめに

こんにちは。TIGの藤田です。[Future Tech Night #22 Flutter勉強会](https://future.connpass.com/event/242858/)にてお話した「Flutterアプリのperformance測定と基本的な実装ポイント」についてご紹介します。

## コンテンツ

1. Performanceについて
2. DevToolsについて
3. レンダリングのプロファイリングデモ
4. メモリのプロファイリングデモ

## Performanceについて

複数の観点があります。Flutter GitHub リポジトリではPerformance issue を４カテゴリに分けて管理しています： [perf: speed](https://github.com/flutter/flutter/issues?q=is%3Aopen+label%3A%22perf%3A+speed%22+sort%3Aupdated-asc+), [perf: memory](https://github.com/flutter/flutter/issues?q=is%3Aopen+label%3A%22perf%3A+memory%22+sort%3Aupdated-asc+), [perf: app size](https://github.com/flutter/flutter/issues?q=is%3Aopen+label%3A%22perf%3A+app+size%22+sort%3Aupdated-asc+), [perf: energy](https://github.com/flutter/flutter/issues?q=is%3Aopen+label%3A%22perf%3A+energy%22+sort%3Aupdated-asc+).
"Speed"には、レンダリング速度、ファイルI/Oなども影響します。

## DevToolsについて

[公式ページ](https://docs.flutter.dev/development/tools/devtools/overview)でも紹介されるように、`Widget inspector`, CPU profiler, Memory view, Performance view, Network view, Logging view, Debug機能を持っています。勉強会では、Performance viewと、Memory viewを紹介しました。
<img src="/images/2022/20220525a/image.png" alt="DevToolsについて" width="1200" height="674" loading="lazy">

以前に技術ブログで紹介した[Performance viewの使い方](https://future-architect.github.io/articles/20220317a/)の振り返りにもなりましたが、勉強会では、さらに実装上の注意点をデモを交えてお話しました。
<img src="/images/2022/20220525a/image_2.png" alt="DevToolsによる性能測定(Performance View)" width="1200" height="676" loading="lazy">

<img src="/images/2022/20220525a/image_3.png" alt="Frameと処理時間" width="1200" height="675" loading="lazy">

レンダリングPerformanceについての実装上の注意の基本的な3点を紹介しました。3番目については、デモとコードを用いてお話しています。
<img src="/images/2022/20220525a/image_4.png" alt="レンダリングPerformance tips" width="1200" height="676" loading="lazy">

Memory viewの紹介もしています。機能は大きく分けると以下の2つで、１）Memory 使用量とイベントの時系列グラフ表示、２）Memory上のインスタンス分析（SnapShot時の分析と、trace分析の2種類）になります。
<img src="/images/2022/20220525a/image_5.png" alt="DevToolsによる性能測定 Memory View" width="1200" height="676" loading="lazy">

## レンダリングのプロファイリングデモ

レンダリングPerformance Tips「３）大きなGridやListは画面表示部のみをBuildする」の例をDevToolsの使い方と合わせて紹介しました。Animationを含む100個のウィジェットをスクロール表示するために、1つめはColumnとSingleChildScrollViewを使用、2つめはListView.builderを使用しています。

１）ColumnとSingleChildScrollViewを使用（アンチパターン）

```dart
import 'dart:math' as math;
import 'package:flutter/material.dart';

class SCScrollViewPage extends StatefulWidget {
  const SCScrollViewPage({Key? key}) : super(key: key);
  @override
  _SCScrollViewPageState createState() => _SCScrollViewPageState();
}

class _SCScrollViewPageState extends State<SCScrollViewPage> {
  static const _itemCount = 100;

  @override
  Widget build(BuildContext context) {
    var screenSize = MediaQuery.of(context).size;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SingleChildScrollView List'),
      ),
      body: Center(
        child: SizedBox(
          width: screenSize.width * 0.6,
          height: screenSize.width * 0.8,
          child: SingleChildScrollView(
            child: Column(
              children: <Widget>[
                for (int i = 0; i < _itemCount; i++) const Item(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class Item extends StatefulWidget {
  const Item({Key? key}) : super(key: key);
  @override
  State<Item> createState() => _ItemState();
}

class _ItemState extends State<Item> with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 10),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: AnimatedBuilder(
        animation: _controller,
        child: Image.asset('assets/images/dash.png', fit: BoxFit.fitHeight),
        builder: (_, Widget? child) {
          return Transform.rotate(
            angle: _controller.value * 2.0 * math.pi,
            child: child,
          );
        },
      ),
    );
  }
}
```

DevToolsのPerformance viewで確認すると、Frame毎に、画面に表示されないウィジェットもすべてBuildされてしまっています。
<img src="/images/2022/20220525a/build_100loop.gif" alt="DevToolsのPerformance viewで確認" width="1200" height="442" loading="lazy">

２）ListView.builderを使用
上の１）と同じItem ウィジェットを、ListView.builderを使用して表示すると、Frame毎に、画面に表示される数個のウィジェットのみがBuildされることが分かります。

```dart
import 'dart:math' as math;
import 'package:flutter/material.dart';

class LVBuilderPage extends StatefulWidget {
  const LVBuilderPage({Key? key}) : super(key: key);
  @override
  _LVBuilderPageState createState() => _LVBuilderPageState();
}

class _LVBuilderPageState extends State<LVBuilderPage> {
  static const _itemCount = 100;

  @override
  Widget build(BuildContext context) {
    var screenSize = MediaQuery.of(context).size;

    return Scaffold(
      appBar: AppBar(
        title: const Text('ListViewBuilder List'),
      ),
      body: Center(
        child: SizedBox(
          width: screenSize.width * 0.6,
          height: screenSize.width * 0.8,
          child: ListView.builder(
            itemCount: _itemCount,
            itemBuilder: (context, index) {
              return const Item();
            },
          ),
        ),
      ),
    );
  }
}
```

<img src="/images/2022/20220525a/build_listviewbuilder.gif" alt="DevToolsのPerformance viewで確認" width="1200" height="442" loading="lazy">

## メモリのプロファイリングデモ

[Flutter DevTools公式サイトのMemory view解説ページ](https://docs.flutter.dev/development/tools/devtools/memory)で紹介される[Case Study](https://github.com/flutter/devtools/tree/master/case_study/memory_leaks/images_1_null_safe)を利用して、Memory viewの簡単な説明をしました。Network経由でサイズの大きな画像を多数連続して読み込んで表示するデモアプリのMemory使用を可視化しています。

- メモリ使用状況を時系列にグラフで確認できます。ユーザイベント、Heapメモリ、Nativeメモリ、Garbage collection (GC)などが表示されています。
- メモリ使用のスパイク(40％以上)を検知してDevToolsが自動でSnapShotを取得（手動でも可能）して、その時のメモリ使用状況を分析できるようになっています。
- 以下ではImageCache PackageのObject数が急増していることを確認しています。

<img src="/images/2022/20220525a/memory_demo.gif" alt="メモリのプロファイリングデモ" width="1200" height="661" loading="lazy">

補足：正確なPerformance測定は実機を用いた「Profile mode」での測定を前提としていますが、勉強会デモでは画面表示のためシミュレータのdebug modeでの確認としています。

## Q&A

- Android studioでも同じようにPerformance測定できますか？
→ Android studioに、Flutter pluginをインストールすることでDevToolsも使用可能になります。参考：https://docs.flutter.dev/development/tools/devtools/android-studio
- 実業務での使用事例はありますか？
→ 現在のところは、開発プロセスに組み込んでの使用はしていませんが、課題発生時の原因究明に役立つと見込んでいます。

## おわりに

Performanceについても[Flutter stable release](https://docs.flutter.dev/development/tools/sdk/release-notes)で毎回向上していて更新が多く注目度の高い開発ポイントだと分かります。DevToolsをFlutterアプリのPerformance課題解決と品質向上に役立てたいところです。

## 参考リンク

- Flutter DevTools公式サイトのMemory view解説ページ
  - https://docs.flutter.dev/development/tools/devtools/memory
