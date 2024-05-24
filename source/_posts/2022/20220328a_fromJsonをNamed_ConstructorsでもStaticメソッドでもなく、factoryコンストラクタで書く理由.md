---
title: "fromJsonをNamed ConstructorsでもStaticメソッドでもなく、factoryコンストラクタで書く理由"
date: 2022/03/28 00:00:00
postid: a
tag:
  - Flutter
  - Dart
  - コーディング規約
category:
  - Programming
thumbnail: /images/20220328a/thumbnail.png
author: 真野隼記
lede: "Dartはコンストラクタがたくさんパターンがありますが、公式ドキュメントはもとより、国内外の様々なブログ記事で使い分けが紹介されており、先人による高速道路が整理されていると実感できます。一方で、慣れてくると自然だと感じてきますが、Flutterサンプルコードにある fromJson がfactoryコンストラクタであることが、最初はピンと来ませんでした"
---

<img src="/images/20220328a/Dart_programming_language_logo.svg.png" alt="" width="1024" height="320">

# はじめに

TIG真野です。[Dart/Flutter連載2022](/articles/20220315a/)の7日目です。

Dartはコンストラクタがたくさんパターンがありますが、公式ドキュメントはもとより、国内外の様々なブログ記事で使い分けが紹介されており、先人による高速道路が整理されていると実感できます。

* [Language tour | Dart の Constructorの章](https://dart.dev/guides/language/language-tour#constructors)
* [Dartのコンストラクタについて | DevelopersIO](https://dev.classmethod.jp/articles/about_dart_constructors/)
* [Dart のコンストラクタの基本 (できることまとめ) | Zenn](https://zenn.dev/kaleidot725/articles/2021-11-13-dart-constructor)

一方で、慣れてくると自然だと感じてきますが、[Flutterサンプルコードにある fromJson](https://docs.flutter.dev/cookbook/networking/fetch-data) がfactoryコンストラクタであることが、最初はピンと来ませんでした。なぜ、staticメソッドではダメか、Named Constructorじゃダメなんだっけと悩みました。

```dart 「Fetch data from the internet」に書いてあるサンプルコード
class Album {
  final int userId;
  final int id;
  final String title;

  const Album({
    required this.userId,
    required this.id,
    required this.title,
  });

  // 【疑問】なぜfactoryコンストラクタなんだっけ❓
  factory Album.fromJson(Map<String, dynamic> json) {
    return Album(
      userId: json['userId'],
      id: json['id'],
      title: json['title'],
    );
  }
}
```

こうした悩みはネットにもちらほら見かけますが、ドンピシャなものがなかったのでこの機会に説明します。

* https://stackoverflow.com/questions/63628741/flutter-when-should-the-factory-constructor-be-used
* https://medium.com/nerd-for-tech/named-constructor-vs-factory-constructor-in-dart-ba28250b2747
* [Flutter : factoryコンストラクタはどのような場面で使うべきか](https://teratail.com/questions/288071)


なお、JSONのシリアライズ・デシリアライズの細かい実装はいくつか流派がありますが、今回は[JSON and serialization](https://docs.flutter.dev/development/data-and-backend/json)でいう manual serialization で説明します（サンプルコードがそれだからです）。その他の実装手法については触れません。


## Static Methodで無い理由

Static Methodで実装した例です。呼び出され方は変わりませんし、ほぼstaticがついたくらいの変更でしょうか。（正確にはAlbumとfromJsonの間はドットからスペースに変わりましたが）

```dart Static Methodの例
  static Album fromJson(Map<String, dynamic> json) {
    return Album(
      userId: json['userId'],
      id: json['id'],
      title: json['title'],
    );
  }
```

[StackOverFlow](https://stackoverflow.com/questions/62014117/dart-named-constructor-vs-static-method-what-to-prefer)でもStatic MethodとNamed Constructorのどっちが良いのか？という似たような議論がありました。詳細はそれらに譲るとして、通常インスタンスを提供する目的であれば、コンストラクタで準備しておくほうがユーザーにとって自然でしょう。DartのLinterルールにも[prefer_constructors_over_static_methods](https://dart-lang.github.io/linter/lints/prefer_constructors_over_static_methods.html) とあり、あえて独自ルールを作ることも無いと思います。

というわけで、fromJsonをStatic Methodで実装することはまぁ無いよね、ということはすぐにわかりました。

では Named Constructorsにしなかったのはなぜでしょうか。


## Albumのフィールドが全てfinalであることをまず強調したい

まず前提について補足させてください。DartではJavaのようにコンストラクタの引数違いでオーバーライドができず、代わりに「コンストラクタ名.任意名称」という形で別名を付けて複数のインスタンス生成方法を提供していきます。これをNamed Constructorsと言います。

finalなフィールドの初期化ですが、次のようにNamed Constructorsで素直に実装するとコンパイルエラーになってしまいます。

```dart NamedConstructorsで書いた例
  Album.fromJson(Map<String, dynamic> json) {
    this.userId = json['userId'];
    this.id = json['id'];
    this.title = json['title'] ;
  }
// 'userId' can't be used as a setter because it's final. (ドキュメント)  Try finding a different setter, or
// making 'userId' non-final.
```

これを回避するためにはいくつかの手段があります。最もてっとり早く、IntelliJ IDEAあたりのIDEが勧めてくるのはfinalを外すことです。

ただ、これはしないことにします。fromJson()で生成するくらいなので、Read Onlyであることが大体のケースで期待されるからです。

finalを外す以外に、2つほどfinalなフィールドを初期化する実装方法が思いつきます。


### finalの初期化方法1: initializing formalを用いる

Albumの生成的コンストラクタ（generative constructor）は `this` キーワードで定義（[initializing formal](https://dart-lang.github.io/linter/lints/prefer_initializing_formals.html)）されています。念のための補足ですが、Albumの生成的コンストラクタは以下の部分です。

```dart Albumの生成的コンストラクタ
  const Album({
    required this.userId,
    required this.id,
    required this.title,
  });
```

これを利用するとNamed Constructorsからもフィールドを初期化できます。「:」はリダイレクトコンストラクタ（Redirect constructor）の定義で、thisは生成的コンストラクタを指します。ちょっとややこしいですが、Named Constructors→生成的コンストラクタへ引数をパスするようなイメージです。

```dart
  // OK 「:」で生成的コンストラクタへリダイレクトする
  Album.fromJson(Map<String, dynamic> json) : this(userId: json['userId'], id: json['id'], title: json['title']);

  // NG Java脳だとこんな感じで書けると思いましたがダメでした
  Album.fromJson(Map<String, dynamic> json) {
    this(userId: json['userId'], id: json['id'], title: json['title']);
  }
```

初見はなんだコレと思いましたが、慣れるとよくできていると思わなくもないです。



### finalの初期化方法2: Initializer list

コンストラクタの後に「:」を記載し、ここでフィールドに代入ができます。Initializer listと呼びます。Java経験者の方向けにはインスタンス初期化子みたいな感じといったほうが早いかもしれません。コンストラクタが動く前に動作するようで、finalなフィールドへの代入ができます。

```dart
  Album.fromJson(Map<String, dynamic> json)
      : userId = json['userId'],
        id = json['id'],
        title = json['title'];
```

さて、1,2の2つの手法を紹介しました。今回のAlbumのfromJson()では、Named Constructorsでも実装可能でした。ただ、ちょっと細かい手段を使わないとfinalフィールドの初期化ができないため、サンプルコード上はfactoryコンストラクタを採用したのかなと邪推します。flutter.dev にでてくるサンプルコードの中には、[2の手法で書いた例](https://docs.flutter.dev/development/data-and-backend/json#serializing-json-inside-model-classes) もあるので、正直どっちでも良いのかなと思います。


## factoryコンストラクタを使うメリット

A tour of the Dart languageの[factoryコンストラクタの章](https://dart.dev/guides/language/language-tour#factory-constructors)には以下のように書かれています。

> Use the factory keyword when implementing a constructor that doesn’t always create a new instance of its class. For example, a factory constructor might return an instance from a cache, or it might return an instance of a subtype.
> （意訳） factoryクラスのキャッシュから取得するなど新しいインスタンスを常に作成するとは限らない場合や、サブクラスインスタンスを返すときに利用する。

今回の Album.fromJson()はキャッシュするロジックを入れることは無いでしょう。一方で入力となるJSON（をパースした結果である、Map<String, dynamic>型のjson）に対して、入力チェックや特定の入力で固定値を返すといったことは十分ありえると思います。

```dart factoryコンストラクタにパースロジックを追記した例
  factory Album.fromJsonNest(Map<String, dynamic> json) {
    if (json["error"] != null) {
      throw Exception("json has error fields: ${json["error"]}");
    }
    if (json["userId"] == 99999) { // 特定のアカウントの場合はダミーデータを返す
      return const Album(
        userId: 99999,
        id: 99999,
        title: "テストデータ99999",
      );
    }

    return Album(
      userId: json['userId'],
      id: json['id'],
      title: json['title'],
    );
  }
```

他にも実装例には上げていませんがネストしたオブジェクトをパースしたり、あるJSONフィールドを1:N個に分割したい時、あるいはUTC→JSTに変換したいなど様々な処理が考えられます。もちろん、どこまでをコンストラクタ側で行うかは一考の余地があるとは思います。大事なのはfactoryを用いるとこの手の拡張ポイントを差し込むことができ、動的にインスタンスを生成できるということです。

これは全フィールドにfinalがつけられ、不変なインスタンスを初期化する時においては大きな差分でしょう。

これらの違いから、とりあえずHTTPレスポンスボディのJSONからインスタンスを生成するコードは、拡張性を考えてサンプルコード的にはfactoryで作っておくのも一手としてはありかなと思います。将来の拡張性を考えて予め備えておく考えは、個人的には余り好きでははないですが（意図が読めないので）、factoryに関してはコード量もほぼ変わらないので、そこに躓く人は少ないと思うからです。


## まとめ

* Album.fromJson()の例だと、リダイレクトやInitializer listを用いると Named Constructorでも実装でき、factoryコンストラクタと大差ないのでどっちでも良い
* JSON周りの取り扱いで、入力チェックや項目編集をコンストラクト無いで行うのであればfactoryコンストラクタを利用する必要がある（正確にはヘルパー関数を用いればNamed Constructorでも実装できなくも無い）
* [Fetch data from the internet](https://docs.flutter.dev/cookbook/networking/fetch-data)のドキュメントを参照する人が多そうなので、どっちでも良い場合に、どちらがいいか強いて選択するのであれば、factoryコンストラクタ側に寄せようかな、というレベル
    * 全てのWeb APIアクセスがフラットで簡単な構造のJSONであるならともかく、そうでないならfactoryに寄せるのもあり。とはいえ、寄せても寄せなくても呼び出され方は同じであるため、あえてルールを増やさなくても良いとは思います


他にもご意見があればいただきたくです。最後まで読んでいただきありがとうございました！


