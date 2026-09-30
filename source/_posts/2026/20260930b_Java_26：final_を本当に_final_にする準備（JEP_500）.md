---
title: "Java 26：final を本当に final にする準備（JEP 500）"
date: 2026/09/30 00:00:01
postid: b
tags:
  - Java26
  - JEP
  - リフレクション
categories:
  - Programming
series: "Java27リリース"
thumbnail: /images/2026/20260930b/thumbnail.jpg
author: 武田大輝
lede: "Java 26 で入った JEP 500 により、リフレクションで final フィールドを書き換えると警告が出るようになりました。背景の Integrity by Default、警告と例外の違い、Gson・Jackson での挙動、対処方法を整理します。"
---
<img src="/images/2026/20260930b/top.jpg" alt="" width="600" height="395">

## はじめに

[Java連載2026](/articles/20260930a/) の1本目です。

Java 27 は 2026年9月15日にリリースされました。この記事では Java 27 本体に入った JEP ではなく、半年前の Java 26 で入った [JEP 500: Prepare to Make Final Mean Final](https://openjdk.org/jeps/500) を取り上げます。直訳すると「final が final を意味するようにする準備」です。final は「変更できない」を表す修飾子だったはずで、それをあらためて final にするとはどういうことでしょうか。

このテーマを選んだ理由は、この JEP が我々のアプリケーションコードにも直接関係することが多いからです。private final なフィールドをリフレクションで差し替えるテストは、今もよく残っています。Spring の `ReflectionTestUtils.setField` や、それを自作したユーティリティです。生成 AI にテストを書かせても、この形は出てきます。そのコードが Java 26 以降では警告を出すようになりました。

## final は final ではなかった

例として、次のコードを実行します。名前を持つだけのクラスと、それをリフレクションで書き換える main です。

```java
import java.lang.reflect.Field;

class Person {
  private final String name;

  Person(String name) {
    this.name = name;
  }

  @Override
  public String toString() {
    return "Person{name='" + name + "'}";
  }
}

void main() throws Exception {
  Person p = new Person("Alice");
  Field f = Person.class.getDeclaredField("name");
  f.setAccessible(true);
  f.set(p, "Bob");
  IO.println(p);
}
```

Java 25 までは、警告が出ません。

```text
Person{name='Bob'}
```

final と書いたフィールドが Bob に書き換わっています。同じコードを Java 27 で実行すると次のようになります。

```text
WARNING: Final field name in class FieldSetDemo$Person has been mutated reflectively by class FieldSetDemo in unnamed module @ca263c2 (file:/path/to/FieldSetDemo.java)
WARNING: Use --enable-final-field-mutation=ALL-UNNAMED to avoid a warning
WARNING: Mutating final fields will be blocked in a future release unless final field mutation is enabled
Person{name='Bob'}
```

Java 27 でも書き換えは成功しています。ただし、将来のリリースではブロックされると予告されました。

setAccessible(true) を経由した final フィールドの書き換えは、2004年の JDK 5 から許されてきました。20年もの間、final は「通常の Java コードからは変更できない」という意味でしかなかったわけです。

なぜそんな穴が開いていたのでしょうか。理由はシリアライズです。ObjectInputStream は、Serializable なクラスのオブジェクトをストリームから復元するとき、コンストラクタを通さずにフィールドへ値を書き込む必要があります。final フィールドもその対象です。この用途のために開けた穴が、誰からでも使える形で公開されました。DI コンテナ、モックライブラリ、JSON ライブラリがそこを通って final フィールドをセットするようになり、今日に至ります。

## なぜ今になってブロックするのか

JEP 500 は、OpenJDK が「Integrity by Default」と呼ぶ一連の取り組みの一部です。わかりやすく言うと、言語や JVM が保証しているはずの前提を、ライブラリが抜け道から破れる状態をなくしていく方針を指します。Java 21 の JEP 451 はエージェントの動的ロードに警告を付け、Java 23 と 24 の JEP 471 と JEP 498 は `sun.misc.Unsafe` のメモリアクセスを非推奨にして警告を付け、Java 24 の JEP 472 は JNI の利用に同じ扱いをしました。どれもアプローチは同じです。まずデフォルトで警告し、数リリース後にデフォルトで拒否し、明示的なフラグでだけ許す。JEP 500 は、これを final フィールドに適用した一段階目です。

リフレクションによる final の変更をブロックする動機は2つあります。

1つは、コードを読む側の推論です。final と書かれたフィールドを見た開発者は、コンストラクタを抜けた後は値が変わらないと考えて読みます。クラスパス上のどこかのライブラリが書き換えられる状態では、その前提は「たぶん変わらない」でしかありません。Java メモリモデルが final フィールドに与えている安全な公開の保証も、構築後に書き換えないことが前提です。

もう1つは JVM の最適化です。JIT コンパイラは、変わらないと確信できる値を定数としてコンパイル結果に埋め込めます（定数畳み込み）。HotSpot は現在、static final や record のフィールドは信頼していますが、record 以外の final なインスタンスフィールドは信頼していません。Field.set で書き換えられうるからです。書き換えがデフォルトで拒否されれば、この制限を外せます。

record のフィールドは、Java 16 で正式導入された時点からリフレクションでも書き換えられませんでした。JEP 500 は、通常のクラスの final フィールドを record と同じような扱いにするための変更です。

## 何が警告され、何が例外なのか

final フィールドなら何でも警告が出るわけではありません。警告すら出ずに、以前から例外になる対象もあります。Java 27 で試した結果を表にまとめます。

| 書き換える対象のフィールド                    | Java 27 での挙動                                          |
| --------------------------------------------- | --------------------------------------------------------- |
| final なインスタンスフィールド（record 以外） | 警告：書き換えは成功する（将来は IllegalAccessException） |
| record のフィールド                           | 例外：IllegalAccessException                              |
| final な static フィールド                    | 例外：IllegalAccessException                              |

書き換えの方法は、Core Reflection の Field.set でも MethodHandles.Lookup.unreflectSetter でも扱いが同じです。後者は警告の文言が「has been unreflected for mutation」に変わり、書き換えた時点ではなくメソッドハンドルを取得した時点で出ます。

警告は書き換えた側のモジュールごとに一度だけ出ます。書き換える先のフィールドが違っても、書き換える側のクラスが違っても、同じモジュールからなら二度目以降は表示されません。

この挙動は `java` コマンドの `--illegal-final-field-mutation` オプションで切り替えられます。

- `warn`: デフォルト。書き換えは成功し、モジュールごとに一度警告する
- `debug`: 毎回警告し、スタックトレースも付ける
- `deny`: IllegalAccessException を投げる（将来のデフォルト）
- `allow`: 警告などを出さず許可する（将来削除されるオプション）

## 警告がでるのは自分のコードとは限らない

表示される警告は、自分で書いたリフレクションから出るとは限りません。多くの場合はフレームワークやライブラリといった別の場所から来ます。

さきほどの Person クラスを Gson 2.14.0 で JSON から復元してみます。

```java
void main() {
  Person p = new Gson().fromJson("{\"name\":\"Alice\"}", Person.class);
}
```

```text
WARNING: Final field name in class GsonDemo$Person has been mutated reflectively by class com.google.gson.internal.bind.ReflectiveTypeAdapterFactory$2 in unnamed module @e73f9ac (file:/path/to/gson.jar)
```

書き換えたのは Gson の内部クラスです。Jackson 2.22.2 も同じです。引数なしコンストラクタとゲッタを持ち、セッタと @JsonCreator のどちらも持たないクラスなら、やはり警告が出ます。自分のコードに Field や setAccessible は一文字も出てきません。

`--illegal-final-field-mutation=deny` を付けると、両方とも復元に失敗します。Jackson は `unnamed module is not allowed to mutate final fields` と原因を書いた JsonMappingException を投げますが、Gson は `Unexpected IllegalAccessException occurred` と、ReflectionAccessFilter の設定を疑うメッセージを出します。ライブラリ側がまだこの例外を想定していないと、原因にたどり着くまでに一手間かかります。

Jackson は3系で方針を変えました。`tools.jackson.core:jackson-databind:3.2.2` で同じクラスを復元すると、警告は出ません。MapperFeature.ALLOW_FINAL_FIELDS_AS_MUTATORS のデフォルトが false になり、final フィールドへ書き込まなくなったからです。ただし FAIL_ON_UNKNOWN_PROPERTIES のデフォルトも false です。例外は投げられず、name は null のまま返ります。警告が消えたからといって、対処できたわけではありません。

## どう対処すべきか

警告を消す手段は3つあります。良いほうから順に、書き換えをやめる、フラグで許可する、警告だけ非表示にする、と並びます。

一番良いのは、書き換えをやめることです。Jackson なら @JsonCreator を付けたコンストラクタか record にすれば、フィールドへの直接書き込みは起きません。テストで final フィールドを差し替えているなら、コンストラクタから依存を渡す形に直します。JEP 自身も、DI やテストのフレームワークに対して final フィールドを書き換えない設計への見直しを求めています。

2つ目は、フラグでの許可です。ライブラリ側の対応を待つ間は、`--enable-final-field-mutation` で書き換えを許可します。

```bash
java --enable-final-field-mutation=ALL-UNNAMED -jar app.jar
```

指定するのは、書き換えられるクラスのモジュールではなく、書き換える側のモジュールです。クラスパスに置いた jar はモジュール名を持たず、まとめて1つの無名モジュールに入るため、通常は ALL-UNNAMED を指定することになります。`com.google.gson` のようなモジュール名で書けるのは、ライブラリをモジュールパスに置いた場合だけです。コマンドラインのほかに、環境変数 JDK_JAVA_OPTIONS や実行可能 JAR のマニフェストの Enable-Final-Field-Mutation 属性でも指定できます。

なお、Serializable なクラスについては、開発者が何かする必要はありません。JDK のシリアライズと同じ手段が jdk.unsupported モジュールの ReflectionFactory を通してライブラリ向けに用意されており、ライブラリがそちらへ移行すればフラグなしで動きます。逆に言えば、Serializable でないクラスの final フィールドは、将来 JVM が不変だとみなしてよい対象です。

3つ目の、`--illegal-final-field-mutation=allow` で警告を非表示にするアプローチは、避けたほうがよいでしょう。このオプションは将来削除されると明記されていて、消えたときに一気に例外へ変わります。むしろ逆に、CI のテスト実行に `deny` を付けるほうに価値があります。将来のデフォルトを先取りして、どのライブラリがどこで落ちるかを今のうちに知っておけます。

## おわりに

ここまでみてきたようにリフレクションで final フィールドを差し替えるコードは、Java 27 では警告付きで通ります。いつ通らなくなるかは、JEP が「将来のリリース」としか書いていないので分かりません。ただ、Integrity by Default の先行例はどれも数リリースでデフォルトを切り替えてきました。

final を本当に final にするのは JVM の仕事ですが、その日に備えて final フィールドを書き換えないコードにしておくのは開発者の仕事です。まずは自分のアプリケーションで `deny` を付けて動かし、どこに警告がでるかを見るところから始めてみると良いでしょう。

この記事で動かしたサンプルコードは [GitHub](https://github.com/rhumie/tech-blog/tree/main/docs/20260928_jep500_final_means_final/example) で公開しています。
