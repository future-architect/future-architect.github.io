---
title: "Class Widgets vs Functional Widgets"
date: 2022/03/16 00:00:00
postid: a
tag:
  - Flutter
  - 設計
category:
  - Programming
thumbnail: /images/20220316a/thumbnail.png
author: 武田大輝
lede: "FlutterでWidgetを開発するとき、Stateless WidgetやStateful Widgetを継承したクラスを作成することが一般的だと思います。一方でクラスを定義せずとも、Widgetを返却するFunctionを定義することで同様のことが実現できるのでは？と考えたことはないでしょうか。"
---

<img src="/images/20220316a/logo_lockup_flutter_horizontal.png" alt="" width="700" height="196">


## はじめに

[Dart/Flutter連載](https://future-architect.github.io/articles/20220315a/) の2本目です

FlutterでWidgetを開発するとき、Stateless WidgetやStateful Widgetを継承したクラスを作成することが一般的だと思います。一方でクラスを定義せずとも、Widgetを返却するFunctionを定義することで同様のことが実現できるのでは？と考えたことはないでしょうか。

本記事では前者をClass Widget, 後者をFunctional Widgetと称して以下説明をしていきます。

簡単なサンプルを示してみましょう。

### Class Widget

```dart
class SampleWidget extends StatelessWidget {
  const SampleWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('hello'),
    );
  }
}
```

### Functional Widget

```dart
Widget sampleWidget() {
  return Container(
    child: Text('hello'),
  );
}
```


恐らく多くの方がFunctional Widgetはあまり良くないと思っていると思いますが、その理由を明確に説明できるでしょうか。

本記事では、2つの違いや使い分けについて整理したいと思います。


## TL;DR

Flutterが公式に公開している動画でも本件について触れられており、パフォーマンス最適化や予期せぬバグの回避、テスタビリティ（本記事では割愛しています）という観点で Class Widgetの利用が推奨されています。


<iframe width="560" height="315" src="https://www.youtube.com/embed/IOyq-eTRhvo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## 2つの違い


冒頭のサンプルで記述したClass WidgetとFunctional Widgetをそれぞれ利用した場合、アプリケーションの見た目はどちらも変わりません。
２つの一番の違いは生成されるWidgetツリーの構造です。それぞれのWidgetツリーは次のようになります。

### Class Widget

```
ParentWidget
　　└─ SampleWidget
　　　　　　　　　　└─ Container
　　　　　　　　　　　　　　　　　　└─ Text
```

### Functional Widget

```
ParentWidget
　　└─ Container
　　　　　　　　　　└─ Text
```

Widgetツリーの構造は、FlutterがWidgetをリビルドする際の挙動に影響します。

Functional WidgetはClass Widgetに比べて、パフォーマンスが最適化されない可能性があり、また予期せぬバグが発生する可能性が高まります。

以下、具体的に説明していきましょう。

## 具体例

### リビルドの最適化

これは紹介した動画でも述べられている例になります。
下記のようにクリック時に状態を変更するようなボタンをFunctional Widgetとして切り出した場合を考えてみます。この場合、ボタンをクリックした場合には大元のWidget全体のリビルドが実行されてしまいます。

```dart
class BigUIElementState extends State<BigUIElement> {
  @override
  Widget build(BuildContext context) {
    // build method is rerun when the sample button is pressed.
    return Stack(
      children: [
        // Some widgets.
        ...,
        ...,
        sampleButton(),
      ],
    );
  }

  Widget sampleButton() {
    return ElevatedButton(
      onPressed: () {
        setState(() {
          // Update some states.
        });
      },
      child: const Text('Button'),
    );
  }
}
```

このボタンが変更する状態のスコープが限定的な場合（例えばいいねボタンの様にクリックによってボタン自身の色を変更するようなケース）は、Functional WidgetではなくStateful Widgetとして切り出した方がリビルドの範囲を限定できるため、パフォーマンスの面で優れています。

```dart
class BigUIElementState extends State<BigUIElement> {
  @override
  Widget build(BuildContext context) {
    // build method is NOT rerun when the sample button is pressed.
    return Stack(
      children: [
        // Some widgets.
        ...,
        ...,
        SampleButton(),
      ],
    );
  }
}

class SampleButton extends StatefulWidget {
  @override
  State<StatefulWidget> createState() {
   return SampleButtonState();
  }
}

class SampleButtonState extends State<SampleButton> {
  @override
  Widget build(BuildContext context) {
     return ElevatedButton(
      onPressed: () {
        setState(() {
          // Update some states.
        });
      },
      child: const Text('Button'),
    );
  }
}
```

ただこの例は、状態のスコープを最小化すべきというのが主要なポイントであって、Class WidgetとFunctional Widgetの本質的な違いの例としては少しズレているように筆者は感じてしまったので、もう一つリビルドの最適化に着目した例を示しましょう。

### リビルドの最適化 その２

先ほどの例は切り出すWidgetが状態を保持する前提でしたが、下記のように状態を持たないWidgetの場合はどうでしょうか。
Functional Widgetの場合は`ParentElement`の状態が変わるたびに`sampleWidget()`が呼び出され、内部で返却しているWidgetが都度再生成されることになります。

```dart
class ParentElementState extends State<ParentElement> {
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Some widgets.
        ...,
        ...,
        sampleWidget(),
      ],
    );
  }

  Widget sampleWidget() {
    // Run each time when the parent widget is rebuilt.
    return Container(
      child: const Text('hello'),
    );
  }
}
```

この場合も、Functional Widgetではなく Stateless Widgetとして切り出すことで、リビルドを最適化することができます。（const constructorが利用できることが前提となります。）
下記のようにStateless Widgetとして切り出した場合は`ParentElement`がリビルドされた場合でも`SampleWidget`のリビルドは実行されません。

```dart

class ParentElementState extends State<ParentElement> {
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Some widgets.
        ...,
        ...,
        const SampleWidget(),
      ],
    );
  }
}

class SampleWidget extends StatelessWidget {
  const SampleWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      child: const Text('hello'),
    );
  }
}

```

### 誤ったBuild Contextの参照

例えば `Builder` Widgetを使用するようなコードにおいて、Build Contextの1つに任意の別の名前（ここでは innerContext）を指定すると、下層のWidgetにて古いBuild Contextを参照することができてしまいます。

```dart
class ParentWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Builder(builder: (innerContext) {
      return sampleWidget(context);
    });
  }

  Widget sampleWidget(BuildContext context) {
    // This could be stale.
    Theme.of(context)...
    return Container(
      child: const Text('hello'),
    );
  }
}
```

Class Widgetとして切り出すことでこのような予期せぬバグを防ぐことができます。

```dart
class ParentWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Builder(builder: (innerContext) {
      return const SampleWidget();
    });
  }
}

class SampleWidget extends StatelessWidget {
  const SampleWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Theme.of(context)...
    return Container(
      child: const Text('hello'),
    );
  }
}
```

### Widget Keyによるリビルド制御

少し無理やりな例ですが、下記のようにボタンクリックによって、四角のコンテナが円形にアニメーションする例を考えてみましょう。
`circle()`メソッドと`square()`メソッドで返却されるWidgetはどちらも `Container` Widgetであるため、RuntimeTypeが同じであり、アニメーションがうまく機能しません。
https://dartpad.dev/?id=ab9ef6401c4687811ea59f44adfa8ee7

```dart
class ParentWidgetState extends State<ParentWidget> {
  bool showCircle = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // The animation does NOT work.
        AnimatedSwitcher(
          duration: const Duration(seconds: 1),
          child: showCircle ? circle() : square(),
        ),
        ElevatedButton(
          onPressed: () {
            setState(() {
              showCircle = !showCircle;
            });
          },
          child: const Text('Click'),
        )
      ],
    );
  }

  Widget square() {
    return Container(
      width: 50,
      height: 50,
      color: Colors.red,
    );
  }

  Widget circle() {
    return Container(
      width: 50,
      height: 50,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.red,
      ),
    );
  }
}
```

それぞれの `Container` WidgetにKeyを指定すればうまく機能します。
Widget Keyの詳細は割愛しますが、気になる方は下記の記事などを参考にすると良いでしょう。
https://qiita.com/kurun_pan/items/f91228cf5c793ec3f3cc


```dart
  Widget square() {
    return Container(
      key: UniqueKey(),
      width: 50,
      height: 50,
      color: Colors.red,
    );
  }

  Widget circle() {
    return Container(
      key: UniqueKey(),
      width: 50,
      height: 50,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.red,
      ),
    );
  }
}
```

このような予期せぬ不具合もClass Widgetとして切り出しておけば WidgetのKeyを意識せずとも未然に防ぐことが可能です。
https://dartpad.dev/?id=a69d57ea09802753676a46efc8390d15

```dart
class ParentWidgetState extends State<ParentWidget> {
  bool showCircle = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AnimatedSwitcher(
          duration: const Duration(seconds: 1),
          child: showCircle ? const Circle() : const Square(),
        ),
        ElevatedButton(
          onPressed: () {
            setState(() {
              showCircle = !showCircle;
            });
          },
          child: const Text('Click'),
        )
      ],
    );
  }
}

class Square extends StatelessWidget {
  const Square({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      color: Colors.red,
    );
  }
}

class Circle extends StatelessWidget {
  const Circle({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.red,
      ),
    );
  }
}
```

## 使い分け

ここまでみてきた通り、基本的には原則Class Widgetを利用する形が良いでしょう。

ただしFunctional Widgetそれ自体が問題を引き起こすものではなく、リファクタを目的としたプライベートなFunctional Widgetであれば、Functional Widgetの方がスマートに記述できるシーンがあると考えています。

下記のように、Widget自体が分岐によって切り替わるようなケースにおいて、`build`メソッド内が肥大化しているため、Switchのロジックを切り出したくなったとします。

```dart
class ParentWidget extends StatelessWidget {
  const ParentWidget({Key? key, required this.someType}) : super(key: key);

  final String someType;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Some widgets.
        ...,
        ...,
        () {
          switch (someType) {
            case 'A':
              return WidgetA();
            case 'B':
              return WidgetB();
            case 'C':
              return WidgetC();
            default:
              return const SizedBox.shrink();
          }
        }()
      ],
    );
  }
}
```

このような場合は、Class Widgetではなく Functional Widgetの方がより簡潔にかつ分かりやすく記述できるのではないでしょうか。

**Class Widget**

```dart
class ParentWidget extends StatelessWidget {
  const ParentWidget({Key? key, required this.someType}) : super(key: key);

  final String someType;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Some widgets.
        ...,
        ...,
        SwitchWidget(someType: someType),
      ],
    );
  }
}

class SwitchWidget extends StatelessWidget {
  const ParentWidget({Key? key, required this.someType}) : super(key: key);

  final String someType;

  @override
  Widget build(BuildContext context) {
    switch (someType) {
      case 'A':
        return WidgetA();
      case 'B':
        return WidgetB();
      case 'C':
        return WidgetC();
      default:
        return const SizedBox.shrink();
    }
  }
}
```

**Functional Widget**
```dart
class ParentWidget extends StatelessWidget {
  const ParentWidget({Key? key, required this.someType}) : super(key: key);

  final String someType;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Some widgets.
        ...,
        ...,
        _switchWidget(),
      ],
    );
  }

  Widget _switchWidget() {
    switch (someType) {
      case 'A':
        return WidgetA();
      case 'B':
        return WidgetB();
      case 'C':
        return WidgetC();
      default:
        return const SizedBox.shrink();
    }
  }
}
```

このようにSwitchや三項演算子などにより、既にClass Widgetとして定義されているWidgetを返却するためのロジックのみを切り出したいような場合（言い換えればFunuctional Widget自体が構造化されたWidgetを定義せず、Privateな関数として広く再利用されないような場合）は　Functional Widgetの利用を許容しても良い気がしています。


## おわりに

原則Class Widgetの利用が推奨されるべきであり、開発時のルールとしてFunctional Widgetは禁止にして問題ないと思います。
ただ最後に記述したとおり、Functional Widgetを使いたくなるようなシーンがいくつかあるような気がしており、（筆者もうまく明文化ができていないですが）そのようなケースが他にもあればコメントいただけますと幸いです。

## 参考記事

* https://stackoverflow.com/questions/53234825/what-is-the-difference-between-functions-and-classes-to-create-reusable-widgets

