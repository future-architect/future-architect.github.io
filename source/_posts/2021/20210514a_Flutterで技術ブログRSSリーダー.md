---
title: "Flutterで技術ブログRSSリーダー"
date: 2021/05/14 00:00:01
postid: a
tag:
  - Flutter
category:
  - Mobile
thumbnail: /images/2021/20210514a/thumbnail.png
author: 真野隼記
lede: "FlutterでRSSを用いてフューチャー技術ブログリーダーを作ろうと思います。"
---
# はじめに

TIG DXユニット [^1]真野です。

[Dart/Flutter連載](/articles/20210510a/)の5日目です。昨日は鶴巻さんの[Flutterレイアウト入門](/articles/20210513b/)でした。

この記事ではFlutterでRSSを用いてフューチャー技術ブログリーダーを作ろうと思います。

## RSSとは

> RSS（RDF Site Summary/Rich Site Summary）はXMLを応用したデータ形式の一種で、Webサイト内の新着ページや更新ページのタイトルやURL、更新日時、要約などを一覧形式で記述することができる。
>
> - [IT用語辞典](https://e-words.jp/w/RSS%E3%83%95%E3%82%A3%E3%83%BC%E3%83%89.html)

新着記事などの把握のためにサイトが配信しているXMLファイルのことですね。フューチャー技術ブログでは[atom.xml](/atom.xml)を配信しています。

さきほどのatom.xmlのリンクを開いた人はほとんどいないと思いますが、`Atom 1.0` という一般的な形式で、記事数は `20件` を上限にして生成しています。本ブログは静的サイトジェネレータに[Hexo](https://hexo.io/)を使っていて、atom.xmlの生成にはメジャーそうだった[hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed)のデフォルトで出力しています。今の所この設定に運営の意思は働いていないので、要望/アドバイスがあればTwitterでコメント下さい。今回開発するリーダーではこれを入力に利用します。

## インプットを怠けてしまう

話は変わりますが、ITエンジニアにとってインプットを行わないと、`今までの知識や経験のみで判断することになり、新たな技術でより効率的なやり方を発想できなくなる` そうです。[究極のIT系最新技術情報収集用Slackチーム公開](https://qiita.com/kotakanbe@github/items/32cf4eb3de1741af26fb)の記事に書いてありました。インプット大事ですよね。

モヒカンSlackチームは良いものですが、ワークスペース設定の宿命でデータが消えてしまい悲しいです。そこで自分のペースで自由自在にインプトットできるツールを欲する人は意外と多いのではないでしょうか。

そのため個人的な様々な要求に耐えられるRSSリーダーを作ろうと思いました。今回は左右のスワイプでスキップ・既読の操作を行えると気持ちが良いと思ったので記事の表示＋スワイプ操作ができることまでを題材とします。

## 環境

[get-started/install](https://flutter.dev/docs/get-started/install) に従い構築します。

自分の環境では以下です。

```bash 環境情報
>flutter doctor
Doctor summary (to see all details, run flutter doctor -v):
[√] Flutter (Channel stable, 2.0.6, on Microsoft Windows [Version 10.0.19043.964], locale ja-JP)
[√] Android toolchain - develop for Android devices (Android SDK version 30.0.3)
[√] Chrome - develop for the web
[√] Android Studio
[√] IntelliJ IDEA Community Edition (version 2020.2)
[√] VS Code (version 1.56.0)
[√] Connected device (2 available)
```

わたしの開発はIntelliJで行っていますが、VSCodeでも十分開発できるそうです。

## ウィジェット開発

StatelessWidgetで作っていきます

`lib/main.dart` に実装します。

```dart main.dart
void main() => runApp(App());

class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        title: 'Future Tech Blog Reader',
        theme: ThemeData(
          primaryColor: Colors.white,
        ),
        home: TechBlog());
  }
}

class TechBlog extends StatefulWidget {
  @override
  _TechBlogState createState() => _TechBlogState();
}

class _TechBlogState extends State<TechBlog> {
  // 次から実装していきます。
}
```

次章から `_TechBlogState` にメインのロジックを詰めていきます。

## RSSフィードの取得

まずはatom.xmlを取得しないと始まらないので、ファイルをダウンロードします。

[http](https://pub.dev/packages/http)パッケージを利用します。`pubspec.yaml`に以下を追記します。

```yml pubspec.yaml
dependencies:
  http: ^0.13.3
```

Dartのコードでは以下のようにアクセスします。`response.body`で直接String型が取得できますが、利用している文字コードが不正なのか文字化けするので、`dart:convert` パッケージを用いて自前でUTF-8でデコードします。

```dart main.dart
import "dart:convert";

import 'package:http/http.dart' as http;

class _TechBlogState extends State<TechBlog> {
  @override
  void initState() {
    fetchFeed();
    setState(() {});
    super.initState();
  }

  void fetchFeed() async {
    final response = await http
        .get(Uri.parse('https://future-architect.github.io/atom.xml'));

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch atom.xml');
    }

    debugPrint(utf8.decode(response.bodyBytes))
  }
}
```

ここでXMLが問題なく表示できていれば、フィードの解析に進みます。

## RSSフィード解析

atom.xml パース用の[webfeed](https://pub.dev/packages/webfeed)と呼ばれるパッケージを利用します。 `_articles`のリストに結果を追加します。

```yml pubspec.yaml
dependencies:
  http: ^0.13.3
  webfeed: ^0.7.0
```

```dart
  final _articles = <AtomItem>[];

  void fetchFeed() async {
    // 中略
    final atomFeed = AtomFeed.parse(utf8.decode(response.bodyBytes));
    atomFeed.items!.forEach((item) => {_articles.add(item)});
  }
```

AtomFeed.parseで解析結果はドキュメントに書いてあるとおり、一通り必要な要素が入っています。必ずしも要素が入っているか保証されていないので、`String?` 型でした。

```dart atom_item.dart
class AtomItem {
  final String? id;
  final String? title;
  final DateTime? updated;

  final List<AtomPerson>? authors;
  final List<AtomLink>? links;
  final List<AtomCategory>? categories;
  final List<AtomPerson>? contributors;
  final AtomSource? source;
  final String? published;
  final String? content;
  final String? summary;
  final String? rights;
  final Media? media;
  // 略
}
```

ここの`id`が記事のURLになります。他には`title`、`published`のフィールドを利用します。

## リストの作成

先程取得した、_articleのリストをListViewに変換します。

```dart
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Future Tech Blog Reader'),
      ),
      body: ListView.builder(
        itemCount: _articles.length,
        itemBuilder: (context, index) {
            return ListTile(
              leading: Text(_articles[index].published.toString()),
              title: Text(_articles[index].title.toString()),
              onTap: () => {_launchURL(_articles[index].id.toString())},
          );
        },
      ),
    );
  }
```

URLを開くためには、`package:url_launcher/url_launcher.dart` パッケージを利用したヘルパー関数を用意すると良さそうです。

```dart
  void _launchURL(String _url) async => await canLaunch(_url)
      ? await launch(_url)
      : throw 'Could not launch $_url';
```

これでスワイプなしで、技術ブログの記事をひらけるようになりました。

Androidの場合はブラウザの起動に権限設定が必要です。

```xml AndroidManifest.xml
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES"/>
```

エミュレータで動かしてみるとこんな感じです。

<img src="/images/2021/20210514a/Animation.gif" alt="モバイルアプリで実行例" wight="469" height="842" loading="lazy">

## スワイプでリストを閉じる

次はスワイプで既読を管理する機能です。

需要が多いのか公式ドキュメントのCookbookに[実装例](https://flutter.dev/docs/cookbook/gestures/dismissible)が照会されています。

さきほどのitemBuilderを`Dismissible`ウィジェットで拡張します。

```dart
        itemBuilder: (context, index) {
          final item = _articles[index];
          return Dismissible(
            key: Key(item.title.toString()),
            onDismissed: (direction) {
              setState(() {
                _articles.removeAt(index);
              });
            },
            background: Container(color: Colors.red),
            secondaryBackground: Container(color: Colors.blue),
            child: ListTile(
              leading: Text(item.published.toString()),
              title: Text(item.title.toString()),
              onTap: () => {_launchURL(item.id.toString())},
            ),
          );
        },
```

`background` が右スワイプ時の色、`secondaryBackground`が左スワイプ時の色です。

`onDismissed` でスワイプ時のアクションを決められます。今回はスワイプされたらリストから除外するシンプルな実装をあげます。

動かしてみると以下のような使い勝手です。

<img src="/images/2021/20210514a/スワイプ.gif" alt="スワイプ動作イメージ" wight="469" height="842" loading="lazy">

気持ち良いですね...！！

デモ上はタイトルだけで判断して捨てていますが、本来はクリックして記事を一読してからスワイプするイメージです。

## 最後に

RSSを読み込んでスワイプで記事を管理できるシンプルなリーダーを作りました。

今回はフューチャー技術ブログのみを対象としましたが、他のお気に入りのサイトを追加したり、左右のスワイプごとに別の機能を付けたり（後で読むとか）、新着を通知させたり色々アイデアを実装させてお楽しみいただけると幸いです。

初めてのFlutterでしたが、大きなハマりもなくレイアウトをXMLではなく、コードで記載することは新鮮でした。

[Dart/Flutter連載](/articles/20210510a/)の5日目でした。次は越島さんの [FlutterでMONETマーケットプレイスAPIを使ってみた](/articles/20210517a/)です。

 [^1]: Technology Innovation Group（TIG）は、「最先端、且つ先進的なテクノロジーのプロフェッショナル集団」「プロジェクト品質と生産性の向上」「自社サービス事業の立ち上げ」を主なミッションとする、技術部隊です。DXユニットとはデジタルトランスフォーメーションを推進するチームで、IoTやらMaaSなどのテクノロジーカットでビジネス転換を行っています。
