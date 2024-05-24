---
title: "PlantUMLのテーマ（思わぬ展開）"
date: 2021/11/08 00:00:00
postid: a
tag:
  - PlantUML
  - OSS
  - 設計
  - UML
category:
  - Design
thumbnail: /images/20211108a/thumbnail.png
author: ヴーホアン・ミン
lede: "PlantUMLで使えるテーマについてのご紹介です。以前、チームで機能設計するためのPlantUML標準化の記事でも書かせていただきましたが、PlantUMLのデフォルトカラーって少しドライですよね。色の好みは人それぞれで、あれはあれでカッコよさはありますが、複雑な図は少しでも可愛く描きたい・楽しく見たいものです。"
---
<img src="/images/20211108a/example_vibrant.png" alt="example_vibrant.png" width="641" height="424" loading="lazy">

[秋のブログ週間](/articles/20211027a/)連載の7本目です。


## はじめに

PlantUMLで使えるテーマについてのご紹介です。

以前、[チームで機能設計するためのPlantUML標準化](/articles/20200203/)の記事でも書かせていただきましたが、PlantUMLのデフォルトカラーって少しドライですよね。

<img src="/images/20211108a/image.png" alt="image.png" width="253" height="448" loading="lazy">

色の好みは人それぞれで、あれはあれでカッコよさはありますが、複雑な図は少しでも可愛く描きたい・楽しく見たいものです。

この記事ではPlantUMLのテーマについて、いくつかのオプションを紹介していきます。「PlantUMLの色を変えてみたい！」という方は是非ご活用いただければ嬉しいです。

## 前提

* PlantUMLでは、skinparamを利用して図のビジュアル各要素を定義しますが、「テーマ」はskinparamの集合体です
* この記事ではテーマの作り方や、各運用方法等については触れません
* この記事で紹介するオリジナルテーマはシーケンス図のために作られたものです

## オリジナルテーマ
<img src="/images/20211108a/image_2.png" alt="image.png" width="563" height="460" loading="lazy">

出典：[Future Tech Blog](https://future-architect.github.io/articles/20200203/)


以前投稿した[「チームで機能設計するためのPlantUML標準化」の記事](/articles/20200203/)では、ユーザが自分で設定できるカラーパレットを２セット紹介しました。嬉しいことに、記事公開後、社内外問わず、沢山の方にこれらのカラーセットを活用してもらうようになりした。

その後、より多くの方に簡単に使ってもらおうと、これらのパレットをテーマ「toy」と「vibrant」として、フューチャーリポジトリに公開しました。ユーザはテーマを自分で定義する必要がなく、以下の一行をファイルに含めるだけでテーマが読み込まれます。

```pu
!include https://raw.githubusercontent.com/future-architect/puml-themes/master/themes/puml-theme-toy.puml
```

### toyの使用例

```sql toy_example.pu
@startuml
!include https://raw.githubusercontent.com/future-architect/puml-themes/master/themes/puml-theme-toy.puml

participant Participant as Foo
note over Foo: Event
actor       Actor       as Foo1
boundary    Boundary    as Foo2
control     Control     as Foo3
entity      Entity      as Foo4
database    Database    as Foo5
collections Collections as Foo6
queue       Queue       as Foo7
Foo -> Foo1 : To actor
Foo -> Foo2 : To boundary
Foo -> Foo3 : To control
Foo -> Foo4 : To entity
Foo -> Foo5 : To database
Foo -> Foo6 : To collections
Foo -> Foo7: To queue

@enduml
```

<img src="/images/20211108a/example_toy.png" alt="example_toy.png" width="641" height="424" loading="lazy">

### vibrantの使用例

```sql vibrant_example.pu
@startuml
!include https://raw.githubusercontent.com/future-architect/puml-themes/master/themes/puml-theme-vibrant.puml

participant Participant as Foo
note over Foo: Event
actor       Actor       as Foo1
boundary    Boundary    as Foo2
control     Control     as Foo3
entity      Entity      as Foo4
database    Database    as Foo5
collections Collections as Foo6
queue       Queue       as Foo7
Foo -> Foo1 : To actor
Foo -> Foo2 : To boundary
Foo -> Foo3 : To control
Foo -> Foo4 : To entity
Foo -> Foo5 : To database
Foo -> Foo6 : To collections
Foo -> Foo7: To queue

@enduml
```

<img src="/images/20211108a/example_vibrant_2.png" alt="example_vibrant.png" width="641" height="424" loading="lazy">

フューチャーリポジトリに公開されているテーマは、フューチャー社内のプロジェクトでも使われており、日々のブラッシュアップはもちろん（最近はアクセシビリティを考慮したコントラスト比やボーダーの微調整等）、外部からのコントリビューションも大歓迎です！（先日、「queueの定義がないぞ！」と[フランスからプルリクエスト](https://github.com/future-architect/puml-themes/pull/5)が上がりました）

## PlantUML公式テーマ

<img src="/images/20211108a/image_3.png" alt="image.png" width="1085" height="452" loading="lazy">

出典：[PlantUML](https://plantuml.com/en/)

そもそも、テーマ自体、PlantUMLにとっては比較的新しい概念のようです。

最近、PlantUMLはいくつかの公式テーマをコアライブラリにて提供しているようで、これらのテーマはライブラリに含まれているため、追加のインストールなし、外部接続なしで、「!theme」ディレクティブだけで使用できるようになっています。

ちなみに、現在公式で提供しているテーマはPlantUMLの[公式ホームページ](https://plantuml.com/en/theme)で紹介されています↓

<img src="/images/20211108a/image_4.png" alt="image.png" width="639" height="785" loading="lazy">

ん？

<img src="/images/20211108a/image_5.png" alt="image.png" width="225" height="375" loading="lazy">

・・・

<img src="/images/20211108a/image_6.png" alt="image.png" width="321" height="242" loading="lazy">

## フューチャーオリジナルテーマがPlantUML公式テーマに！

なんと、フューチャーリポジトリで公開したテーマ「toy」と「vibrant」がPlantUMLの公式テーマとして採用されました！
ということで、以下のように「toy」と「vibrant」がPlantUML内部のライブラリで使えるようになっています。

```plantuml toyテーマの利用
!theme toy
```

```plantuml vibrantテーマの利用
!theme vibrant
```

さらに使いやすくなりました。これは嬉しいですね。

なお、今後のフューチャーレポジトリへのアップデートは公式ライブラリにも反映できるように運用していく予定ですが、多少の時差はあるので「常に最新の状態が良い」という方は「!include」でフューチャーレポジトリより読み込むのが良いかもしれません。
また、今後も新しいテーマを追加していきたいので、これらに関しても、もちろんフューチャーレポジトリの方で先行公開されます。

ということで、さっそく…


## 新テーマ「mars」
「toy」と「vibrant」が公式テーマになったことを記念して、３つ目のオリジナルテーマ「mars」をフューチャーレポジトリにて公開しました。しかも、こちらもPlantUMLの次のリリースで公式テーマになる予定です！

### marsのサンプル
<img src="/images/20211108a/example_mars.png" alt="example_mars.png" width="641" height="424" loading="lazy">

```sql mars_example.pu
@startuml
!include https://raw.githubusercontent.com/future-architect/puml-themes/master/themes/puml-theme-mars.puml

participant Participant as Foo
note over Foo: Event
actor       Actor       as Foo1
boundary    Boundary    as Foo2
control     Control     as Foo3
entity      Entity      as Foo4
database    Database    as Foo5
collections Collections as Foo6
queue       Queue       as Foo7
Foo -> Foo1 : To actor
Foo -> Foo2 : To boundary
Foo -> Foo3 : To control
Foo -> Foo4 : To entity
Foo -> Foo5 : To database
Foo -> Foo6 : To collections
Foo -> Foo7: To queue

@enduml
```

## おわりに

今後引き続きテーマを追加したり、使いやすくアップデートいきますので、ぜひご活用ください！

詳細はフューチャーのGitHubリポジトリまで：https://github.com/future-architect/puml-themes

[秋のブログ週間](/articles/20211027a/)連載の7本目でした。
