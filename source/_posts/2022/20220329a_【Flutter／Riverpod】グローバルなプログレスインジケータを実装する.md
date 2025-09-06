---
title: "【Flutter/Riverpod】グローバルなプログレスインジケータを実装する"
date: 2022/03/29 00:00:00
postid: a
tag:
  - Flutter
  - 状態管理
category:
  - Mobile
thumbnail: /images/2022/20220329a/thumbnail.gif
author: 武田大輝
lede: "アプリケーションを開発していて、下記のようなプログレスインジケータを表示したいケースがあるかと思います。今回はこのようなインジケータをページ共通的に制御することを目的として、その実装方法を説明していきます。!"
---

[Dart/Flutter連載2022](/articles/20220315a/)の8日目、最後です。

## はじめに

アプリケーションを開発していて、下記のようなプログレスインジケータを表示したいケースがあるかと思います。
今回はこのようなインジケータをページ共通的に制御することを目的として、その実装方法を説明していきます。

<img src="/images/2022/20220329a/Flutter-Global-Loader-Demo.gif" alt="プログレスインジケータのデモ" width="1200" height="675" loading="lazy">

なお、アプリケーションによっては、ユーザの一切の操作を受け付けないオーバーレイインジケーター自体がそもそも好ましくないという意見もあると思いますが、インジケータのあるべきについては本記事の論点とはしません。

## 実現したいこと

* HTTP通信など時間のかかる非同期処理中にインジケータを表示する。
* インジケータの表示中はオーバーレイUIを用いて、画面操作を不可能とする。
* インジケータのUIおよび、表示・非表示のロジックは共通化し、各画面での実装コストを可能な限り下げる。
* インジケータの表示が二重に行われないよう制御する。

## 環境

今回は状態管理としてRiverpodを利用していますが、Riverpodを利用せずとも実装は可能です。

* Flutter 2.10.3
* flutter_riverpod 1.0.3

## UIの実装方針

インジケータの実装を調べると、下記ようなパターンで実装しているケースが多そうです。

### 1. Dialog Pattern

標準の`showDialog`メソッドを利用して、インジケータを表示するパターンです。
`showDialog`メソッド内部では`Navigator.push()`を用いてページをスタックしているため、インジケータを非表示にする場合は`Navigaror.pop()`を使います。

この方式はオーバーレイが自動で有効になるため、インジケータ部分のみを実装すればOKです。
今回インジケータには標準の`CircularProgressIndicator`を利用します。

```dart
class DialogPatternPage extends StatelessWidget {
  const DialogPatternPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dialog Pattern'),
      ),
      body: Center(
        child: ElevatedButton(
          child: const Text('Show Loader'),
          onPressed: () async {
            // Present the indicator.
            showDialog(
              context: context,
              builder: (context) {
                return const Center(
                  // Default Indicator.
                  // https://api.flutter.dev/flutter/material/CircularProgressIndicator-class.html
                  child: CircularProgressIndicator(),
                );
              },
            );
            try {
              // Asynchronous processing such as API calls.
              await Future.delayed(const Duration(seconds: 3));
            } finally {
              // Dismiss the indicator.
              Navigator.of(context).pop();
            }
          },
        ),
      ),
    );
  }
}
```

### 2. `Stack Widget` Pattern

`Stack Widget`を用いて、状態（ローディング中かどうか）の変化の場合にインジケータを表示するパターンです。
`Stateful Widget`としてピュアに実装すると下記のようなイメージになります。

```dart
class StackWidgetPatternPage extends StatefulWidget {
  const StackWidgetPatternPage({Key? key}) : super(key: key);

  @override
  State<StatefulWidget> createState() {
    return StackWidgetPatternPageState();
  }
}

class StackWidgetPatternPageState extends State<StackWidgetPatternPage> {
  bool isLoading = false;
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          appBar: AppBar(
            title: const Text('Stack Widget Pattern'),
          ),
          body: Center(
            child: ElevatedButton(
              child: const Text('Show Loader'),
              onPressed: () async {
                // Present the indicator.
                setState(() {
                  isLoading = true;
                });
                try {
                  // Asynchronous processing such as API calls.
                  await Future.delayed(const Duration(seconds: 3));
                } finally {
                  // Dismiss the indicator.
                  setState(() {
                    isLoading = false;
                  });
                }
              },
            ),
          ),
        ),
        // Stack.
        if (isLoading)
          const ColoredBox(
            color: Colors.black54,
            child: Center(
              // Default Indicator.
              // https://api.flutter.dev/flutter/material/CircularProgressIndicator-class.html
              child: CircularProgressIndicator(),
            ),
          )
      ],
    );
  }
}
```

### 3. Riverpod AsyncValue Pattern

Riverpodの[AsyncValue](https://riverpod.dev/ja/docs/providers/future_provider/)を利用して、ローディング状態をハンドリングするパターンです。
このパターンは基本的に各画面での制御が必要となるため、グローバルな制御には不向きであると判断し、割愛します。

### どちらを採用するか

ソースコードを見てわかる通り、1のDialog Patternが「命令的」にインジケータを表示しているのに対し、2の`Stack Widget` Patternは状態の変化に応じて「宣言的」にインジケータを表示しています。
Flutter自体が「宣言的UIのフレームワーク」と言われているように、ダイアログの表示も「宣言的」に行う[^1]方が筆者としては自然に感じます。

Dialog Patternの場合は、Navigatorに依存しており、ダイアログの非表示を`Navigator.pop()`で行わなければならない点が意図しない挙動を生む可能性があると考えています。なぜなら`Navigator.pop()`はスタックに積まれた一番上のページをpopしているだけであり、インジケータを閉じることを保証している訳ではないからです。

これが問題になる具体的なケースとして、ページA（/home/A）とページB（/home/A/B）のようにURLが階層階層構造を持つページが存在し、両方のページで初期化時にインジケータを表示しているようなケースが考えられます。
Flutterの仕様[^2]として、ディープリンクなどを介して直接ページBに到達したような場合でも、戻るボタンなどで親画面に戻れるよう上位階層のページAのビルドが同タイミングで実行されるため、ページBのローディング中に、ページAで（初期処理時にエラーが発生するなどして）何かしらのダイアログをNavigatorのスタックに新たに積むようなケースでは、ロード完了時に適切にインジケータが非表示にならないでしょう。

## ロジックの共通化

Riverpodを利用してインジケータ制御のための共通的なサービスをProviderとして提供します。
この辺りの実装はお好きなようにという感じですが、ポイントは下記の2点です。

* Futureオブジェクトをラップするメソッドを提供することで、非同期処理の開始と終了時にローディングの状態を変化させている。
* インジケータの2重表示を防止するため、内部的にはローディングが要求された回数をカウントしておき、最後の要求が終了して始めてローディング状態をfalseにしている。

```dart
final loadingServiceProvider =
    StateNotifierProvider<LoadingService, bool>((ref) {
  return LoadingService();
});

/// LoadingService represents interfaces to control the progress indicator.
class LoadingService extends StateNotifier<bool> {
  LoadingService() : super(false);

  int _count = 0;

  /// Wrap the a future completed value and show / hide the loader before and after processing.
  Future<T> wrap<T>(Future<T> future) async {
    _present();
    try {
      return await future;
    } finally {
      _dismiss();
    }
  }

  void _present() {
    _count = _count + 1;
    // Set the state to true.
    state = true;
  }

  void _dismiss() {
    _count = _count - 1;
    // Set the state to false only if all processing requiring a loader has been completed.
    if (_count == 0) {
      state = false;
    }
  }
}
```

## UIの共通化

先ほどの例でみたパターン2の`Stack Widget` Patternでは個々のページに`Stack Widget`を定義しなければなりませんでした。
これを共通化するためにMaterialApp ウィジェットの`builder`プロパティを利用することで、MaterialAppの配下かつ、Navigatorよりも上層に共通的にウィジェットを定義できます。

```dart
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Wrap the provide scope.
    return ProviderScope(
      child: MaterialApp(
        builder: (context, child) {
          return Stack(
            children: [
              if (child != null) child,
              // Indicator.
              Consumer(builder: (context, ref, child) {
                final isLoading = ref.watch(loadingServiceProvider);
                if (isLoading) {
                  return const ColoredBox(
                    color: Colors.black54,
                    child: Center(
                      // Default Indicator.
                      // https://api.flutter.dev/flutter/material/CircularProgressIndicator-class.html
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                return const SizedBox.shrink();
              }),
            ],
          );
        },
        home: const GlobalIndicatorDemoPage(),
      ),
    );
  }
}
```

## 個々のページの実装

最終的な個々のページの実装は下記のとおり、かなりすっきりとしたのではないでしょうか。

```dart
class GlobalIndicatorDemoPage extends StatelessWidget {
  const GlobalIndicatorDemoPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Global Indicator Demo'),
      ),
      body: Center(
        child: Consumer(builder: (context, ref, child) {
          return ElevatedButton(
            child: const Text('Show Loader'),
            onPressed: () async {
              ref.read(loadingServiceProvider.notifier).wrap(
                    Future.delayed(const Duration(seconds: 3)),
                  );
            },
          );
        }),
      ),
    );
  }
}
```

## おわりに

いかがでしたでしょうか。
全ての実装については下記のリポジトリで公開しています。
https://github.com/datake914/flutter_global_indicator_demo

インジケータの制御を共通化したいという想いから色々試行錯誤してこのような実装にたどり着きましたが、もっとスマートな方法があるよって方は是非コメントいただければと思います。

[^1]: Navigator2.0で宣言的なナビゲーションが可能になりましたが、ダイアログ表示は依然として命令的になります
[^2]: cf. https://github.com/flutter/flutter/issues/33566
