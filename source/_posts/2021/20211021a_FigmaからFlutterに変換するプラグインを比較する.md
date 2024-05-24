---
title: "FigmaからFlutterに変換するプラグインを比較する"
date: 2021/10/21 00:00:00
postid: a
tag:
  - Figma
  - Flutter
  - モバイルアプリ
  - 技術選定
category:
  - Programming
thumbnail: /images/20211021a/thumbnail.png
author: 越島亮介
lede: "フューチャーでは、FigmaやAdobe XDなどのデザインツールの利用が以前よりも少しづつ増えています。今回の題材はFigmaです。先月の「[Adobe XDからFlutterに変換する]プラグインがあるため、変換ツールの選択肢で迷うことはあまり無いのかなと思います。"
---

# はじめに

フューチャーでは、FigmaやAdobe XDなどのデザインツールの利用が以前よりも少しづつ増えています。今回の題材はFigmaです。

先月の「[Adobe XDからFlutterに変換する](https://future-architect.github.io/articles/20210915a/)」の記事では、Adobe XDで作成したデザインをFlutterコードに落とし込むためのTipsを渋川さんが紹介してくれました。XD→Flutterの変換は、[AdobeとGoogleが協力して開発している](https://blog.adobe.com/jp/publish/2020/09/25/cc-web-xd-flutter-plugin-now-available.html)プラグインがあるため、変換ツールの選択肢で迷うことはあまり無いのかなと思います。

それに対して、Figma→Flutterの変換は公式で開発 or 推奨されているツールが無く、様々な個人・企業が出しているツールからどれかを選択して利用する必要があります。この記事では、**Figma→Flutterの変換をサポートする主なツールを紹介し、実際にそれらを使ってFlutterコードを出力した結果の比較を行っていきます。**「Figmaからのコード生成って色々な方法があって何が良いのかよく分からん！」という人の参考になれば嬉しいです。

# Figma→Flutterを実現する方法

FigmaからFlutter用のdartコードを生成する方法は主に以下の2パターンが存在するようです。

1. Figmaのプラグインを使う方法
1. Figmaプラグインではない外部のサービスを利用する方法

それぞれを紹介していきます。

### Figmaのプラグインを使う方法

FigmaをFlutterに変換できると謳っているプラグインは複数存在していて、個人がメインで開発しているものから、企業が公開しているものまで様々です。ここでは、2021年10月時点のインストール数の上位4つを紹介します。
（[Figma Communityのページで検索する](https://www.figma.com/community/search?model_type=public_plugins&q=flutter)と、インストール数がもっと少ないものもいくつか出てきます。）

**① Figma to Code（HTML, Tailwind, Flutter, SwiftUI）**

<img src="/images/20211021a/Figma_to_Code.png" alt="Figmaからコード生成イメージ" width="1200" height="600" loading="lazy">

インストール数：28.5k
最終更新日：2021年3月9日

[Figma to Code (HTML, Tailwind, Flutter, SwiftUI](https://www.figma.com/community/plugin/842128343887142055/Figma-to-Code-(HTML%2C-Tailwind%2C-Flutter%2C-SwiftUI))は、Bernardo Ferrariという人が主に開発をしているプラグインで、ソースが[githubに公開](https://github.com/bernaferrari/FigmaToCode)されています。Figma→Flutter以外にもSwiftUI、tailwindcss、HTML5にも対応しているようですが、今回はFlutterの出力のみを試してみます。


**② Flutter Export**
<img src="/images/20211021a/thumbnail-1.png" alt="Flutter Exportアイコン" width="1200" height="600" loading="lazy">
インストール数：11.3k
最終更新日：2019年11月22日

[Flutter Export](https://www.figma.com/community/plugin/778755750523021654/Flutter-Export)は、とてもFlutterに変換できそうな名前が付いていますが、Figmaで作ったものをPNG画像で出力するだけのプラグインのようです。インストールして少し試してみましたが、上手く動かすことができませんでした。最終更新日も約2年前と古く、メンテもされていなそうなので、今回の**比較対象外**とします。
（インストール数が少し多い理由が謎です。）


**③ FigmaToFlutter**
<img src="/images/20211021a/thumbnail-2.png" alt="thumbnail-2.png" width="1200" height="600" loading="lazy">
インストール数：10.8k
最終更新日：2021年1月2日

[FigmaToFlutter](https://www.figma.com/community/plugin/844008530039534144/FigmaToFlutter)は、1つ目のFigma to Codeと同様に個人が開発しているプラグインで、使い方も非常に似ています。今回の**比較対象**とします。

**④ Assistant by Grida**
<img src="/images/20211021a/thumbnail-3.png" alt="Assistant by Gridaイメージ" width="1200" height="600" loading="lazy">
インストール数：4.7k
最終更新日：2021年8月25日

[Assistant by Grida](https://www.figma.com/community/plugin/896445082033423994/Assistant-by-Grida)は、以前はBridgedという名前だったプラグインです。

Gridaという組織が開発しているようですが、[Gridaのページ](https://www.grida.co/)を見てもGridaがどういう組織なのか（企業なのかどうかも）分からずでした。Gridaのページにはプラグインの[ドキュメント](https://www.grida.co/docs/getting-started)もありますが、空ページが多かったり、まだ発展途上な感が否めないですが、今回の**比較対象**とします。


### Figmaのプラグイン以外を使う方法

Figmaのプラグインを使う方法以外にも、Figmaからコードを生成する方法はあるようです。
以下2つを紹介します。


**⑤ Flutlab.io**
<img src="/images/20211021a/スクリーンショット_2021-10-08_14.29.55.png" alt="Flutlab.ioイメージ" width="1031" height="460" loading="lazy">

[FlutLab.io](https://flutlab.io/)は、Flutter用のオンラインIDE（総合開発環境）で、その中の機能としてFigma to Flutter Converterというものがあるようです。オンラインIDEは、セキュリティ等のポリシー上、実際のPJで利用できるかが不透明なため、今回は**比較対象外**とします。

**⑥ Bravo Studio**
<img src="/images/20211021a/スクリーンショット_2021-10-08_14.30.51.png" alt="Bravo Studioイメージ図" width="927" height="432" loading="lazy">

[Bravo Studio](https://www.bravostudio.app/)は、デザインツールで作成したデザインをノーコードでアプリに変換するサービスです。最終的にネイティブコードを出力できたり、APIを叩く等の機能性を持たせることができたりするようで面白そうです。
ただし、このツール自体の使い方のキャッチアップが割と必要そうな印象を受けた（コードを上手く出力するためにFigma側のLayerの命名を調整する必要がある等）のと、実際のPJで利用できるだけの自由度があるかが未知数だったので、今回は**比較対象外**とします。


### 今回の検証対象

様々なFigma→Flutterの実現方法を紹介してきましたが、今回の比較対象は以下の3つのFigmaプラグインとします。

- [Figma to Code (HTML, Tailwind, Flutter, SwiftUI](https://www.figma.com/community/plugin/842128343887142055/Figma-to-Code-(HTML%2C-Tailwind%2C-Flutter%2C-SwiftUI))
- [FigmaToFlutter](https://www.figma.com/community/plugin/844008530039534144/FigmaToFlutter)
- [Assistant by Grida](https://www.figma.com/community/plugin/896445082033423994/Assistant-by-Grida)

# Figma→Flutterを試して比較してみる

## 比較方法

### 比較で使うFigmaとエクスポートの粒度
今回は、Figma上で作った以下のログイン画面をFlutterのコードに変換できるかを試していきます。
<img src="/images/20211021a/スクリーンショット_2021-10-08_14.44.54.png" alt="スクリーンショット_2021-10-08_14.44.54.png" width="543" height="434" loading="lazy">
「[Adobe XDからFlutterに変換する](https://future-architect.github.io/articles/20210915a/)」の記事では、一つの画面を丸ごとエクスポートするのは、AdobeとGoogleが協力して開発しているプラグインであっても中々上手くいかないことが多く、要素ごとにエクスポートをして貼り付けていくことを推奨していました。

よって、今回のFigma→Flutterの検証では様々な粒度でのエクスポートを試していきます。具体的には下記の**①〜③**を試していきます。下図の**画面全体**は、OS側で描画するホームバー等もFigma上で表現してしまっていて、それらの要素を省くと**①ログインフォーム全体**との差分があまり無くなるので今回の検証では省略します。
<img src="/images/20211021a/スクリーンショット_2021-10-11_15.24.18.png" alt="スクリーンショット_2021-10-11_15.24.18.png" width="911" height="525" loading="lazy">

また**①〜③**のUIパーツ生成の検証に加え、画像の扱いについても比較検証を行いたいと思います。

### 比較で使うdartコード

Android Studioで新規のFlutterプロジェクトを作り、[生成されるデモアプリ](https://flutter.dev/docs/get-started/test-drive?tab=androidstudio)のScaffoldからheaderとbodyの中身を消した状態にして、body部分にプラグインが生成したdartコードをそのまま貼っていきます。ログインフォームが画面の中央部あたりに来るようにCenterウィジェットで囲っておきます。

```dart
class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
          child: //ここにコードを貼り付けていきます
          ),
    );
  }
}
```


## 比較結果

### 比較①　ログインフォーム全体の出力

|出力対象(Figma)|Figma to Code|FigmaToFlutter|Assistant by Grida|
|---|---|---|---|
|<img src="/images/20211021a/スクリーンショット_2021-10-11_13.47.58.png" alt="ログインフォーム" width="340" height="231" loading="lazy">| <img src="/images/20211021a/login_figma2code.png" alt="figma to code結果" width="357" height="698" loading="lazy"> |  <img src="/images/20211021a/login_figma2flutter.png" alt="figma to flutter" width="357" height="698" loading="lazy"> | <img src="/images/20211021a/login_assistantByGrida.png" alt="assistanbe by grid結果" width="357" height="698" loading="lazy"> |

ログインフォーム全体を出力対象として、各プラグインで出力した結果を上に示しています。
出力結果がプラグインによって全く異なるため、一つづつ見てきましょう。

まず、**Figma to Code**は、最も生成されたコードの質が高かったです。ContainerでそれぞれのUI要素の枠組みを作り、ColumnとRowで並べて、Sized Boxで要素間の隙間を作っていて、比較的可読性も高いコードになっていました。工事現場のような黄色と黒の線が出ているのは一番外側のContainerのheightが足りなく、中の要素がはみ出しているためです。これは、足りないheightの値を調整するだけで解消しました。
入力欄やボタンを判別することはできないようなので、生成されたコードはただの箱が並んでいるだけですが、生成結果をベースとしながら手直しをしていく前提で考えれば、割と実用的かなという印象です。

次の**FigmaToFlutter**は、エラーが出てしまいました。少し手直ししてエラーを解消すればいいというレベルじゃないくらいそもそものコードの中身が足りていなかったです。出力対象をもっとシンプルにして、何かが変わるかを見てみたいと思います。

最後の**Assistant by Grida**は、テキストしか出力されず、惜しい結果となりました。生成されたコードを見ても、テキスト以外の要素を出そうとした形跡は無かったです。こちらについても、出力対象をもっとシンプルにして、何が変わるかを見てみたいと思います。


### 比較②　ログインボタンのみの出力

|出力対象(Figma)|Figma to Code|FigmaToFlutter|Assistant by Grida|
|---|---|---|---|
|<img src="/images/20211021a/スクリーンショット_2021-10-11_14.00.39.png" alt="ログインボタン" width="338" height="154" loading="lazy">| <img src="/images/20211021a/button_figma2code.png" alt="figma to code結果" width="357" height="698" loading="lazy">| <img src="/images/20211021a/button_figma2flutter.png" alt="figma to flutter結果" width="357" height="698" loading="lazy"> | <img src="/images/20211021a/button_assistantByGrida.png" alt="Assistant by Grida結果" width="357" height="698" loading="lazy">    |

ログインのボタン（青いボタンとログインのテキスト）を出力対象として、各プラグインで出力した結果を上に示しています。出力結果を一つづつ見てきましょう。

まず、**Figma to Code**は、問題ない出力結果で、1つ目の検証で起こっていた「要素のはみ出し」現象も無くなりました。

次の**FigmaToFlutter**は、再びエラーが出てしまいました。FigmaToFlutterが生成するコードでは、Figma to Codeと異なり、Stackウィジェットが使われています。Stackウィジェットは要素を重ねるときに使うウィジェットなので、Figma上の要素の重なり方が出力結果に何かしら影響している可能性があります。（今回のケースの出力対象は「ログイン」というテキスト部分と青い角丸の四角部分を重ねて作っています。）よって、出力対象を更にシンプルにして、要素の重なりが全く無い場合どうなるかを見てみようと思います。

最後の**Assistant by Grida**は、一見何も表示されていないように見えますが、白い「ログイン」という字だけ表示されていて、背景と同化してしまっています。こちらについても生成コードがStackウィジェットを使っているので、Figma上の要素の重なりが無くなると出力品質が変わってくるかもしれません。



### 比較③　ログインボタンの箱のみの出力

|出力対象(Figma)|Figma to Code|FigmaToFlutter|Assistant by Grida|
|---|---|---|---|
|<img src="/images/20211021a/スクリーンショット_2021-10-11_14.05.06.png" alt="Figmaログインボックスのみ" width="338" height="73" loading="lazy"> | <img src="/images/20211021a/box_figma2code.png" alt="figma to code結果" width="357" height="698" loading="lazy"> | <img src="/images/20211021a/box_figma2flutter.png" alt="figma to flutter結果" width="357" height="698" loading="lazy"> | <img src="/images/20211021a/box_assistantByGrida.png" alt="assistant by grida結果" width="357" height="698" loading="lazy"> |

最後に、ログインのボタンの箱（青い角丸の四角）部分のみを出力対象として、各プラグインで出力した結果を上に示しています。

まず、**Figma to Code**は、問題ない出力結果でした。安定感があります。

次の**FigmaToFlutter**は、初めてエラーが出ず、出力結果としても問題ないものになりました。やはり、少しでも要素の重なりがあると上手く動いてくれない傾向があるようです。あまり実用的ではないですね。

最後の**Assistant by Grida**では、やっとテキスト以外の要素を出力することができましたが、角丸の表現ができておらず、サイズも正しくありません。


### 比較④　画像の扱い

|出力対象(Figma)|Figma to Code|FigmaToFlutter|Assistant by Grida|
|---|---|---|---|
|<img src="/images/20211021a/Logo.png" alt="ロゴ" width="1200" height="513" loading="lazy">|<img src="/images/20211021a/png_figma2code.png" alt="figma to code結果" width="357" height="698" loading="lazy"> |<img src="/images/20211021a/png_figma2flutter.png" alt="figma to flutter結果" width="357" height="698" loading="lazy"> | <img src="/images/20211021a/png_assistantByGrida.png" alt="assistant by grida結果" width="357" height="698" loading="lazy"> |
|<img src="/images/20211021a/SVGロゴ.png" alt="svgロゴ" width="74" height="67" loading="lazy">|<img src="/images/20211021a/svg_figma2code.png" alt="figma to code結果" width="357" height="698" loading="lazy"> |<img src="/images/20211021a/svg_figma2flutter.png" alt="figma to flutter結果" width="357" height="698" loading="lazy"> |<img src="/images/20211021a/svg_assistantByGrida.png" alt="assistant by grida結果" width="357" height="698" loading="lazy"> |

ラスター画像、ベクター画像をそれぞれ出力対象として、各プラグインで出力した結果を上に示しています。

まず、**Figma to Code**は、全ての画像をFlutterLogo()に差し替えてしまいます。画像を表示させる気がそもそも無さそうですね。

次の**FigmaToFlutter**は、画像の扱いが最も優れていました。ラスター画像の場合はAssetImageを使って表示をするコードが生成され、ベクター画像の場合は[flutter_svg](https://pub.dev/packages/flutter_svg)パッケージを使ったコードを生成してくれます。また、画像ファイル自体をプラグインの画面上でダウンロードもできるようになっていました。

最後の**Assistant by Grida**では、下記のようなImage.network()を使ったコードが生成されますが、"grida://"で始まるURLが上手く動作しません。

```dart
Image.network(
  "grida://assets-reservation/images/13902:10114",
  width: 315,
  height: 134,
);
```

### 比較結果まとめ

Figma→Flutterを実現するためのプラグインの比較を行ってきました。比較結果を以下の表に示します。

| # | プラグイン名       | 総合評価 | テキスト | シェイプ | ラスター画像 | ベクター画像 | 要素のネスト/重なり |
|---|--------------------|----------|----------|----------|--------------|--------------|---------------------|
| 1 | Figma to Code      | ◎        | ◎        | ◎        | ✕            | ✕            | ◎                   |
| 2 | FigmaToFlutter     | △        | ◯        | ◯        | ◎            | ◎            | ✕                   |
| 3 | Assistant by Grida | △        | ◯        | △        | ✕            | ✕            | ✕                   |

比較をした3つのプラグインをそれぞれ一言で表すと、

- **Figma to Code**は「安定感がある」
- **FigmaToFlutter**は「実用的ではないが今後に期待」
- **Assistant by Grida**は「ずっと惜しい」

という結果になりました。
実際の開発に導入するのであれば、**Figma to Code**以外は選択肢から外れるかな、という印象です。


# まとめ

今回紹介したプラグインとサービスのまとめ。

| # | 名称   | 種別  | 変換結果 | 備考 |
|---|---|---|---|---|
| 1 | Figma to Code      | プラグイン   | ◎        | 安定感が感じられる                                                                         |
| 2 | Flutter Export     | プラグイン   | ー       | Figmaで作ったものをPNG画像化するのみ                                                       |
| 3 | FigmaToFlutter     | プラグイン   | △        | 今後に期待                                                                                 |
| 4 | Assistant by Grida | プラグイン   | △        | ずっと惜しい                                                                               |
| 5 | Flutlab.io         | 外部サービス | ー       | オンライン上の変換であったためPJによっては利用できない可能性を考慮し、今回は検証をスキップ |
| 6 | Bravo Studio       | 外部サービス | ー       | Figma側の命名規則があるなどお作法があり今回は検証スキップ                                  |

