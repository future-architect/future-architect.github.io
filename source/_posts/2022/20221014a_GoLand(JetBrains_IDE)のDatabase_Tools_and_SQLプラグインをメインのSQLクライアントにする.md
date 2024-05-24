---
title: "GoLand(JetBrains IDE)のDatabase Tools and SQLプラグインをメインのSQLクライアントにする"
date: 2022/10/14 00:00:00
postid: a
tag:
  - GoLand
  - JetBrains
  - 便利ツール
  - SQL
category:
  - DB
thumbnail: /images/20221014a/thumbnail.png
author: 真野隼記
lede: "RDB（ここでは社内でも実績が多いPostgreSQLとさせてください）のGUIクライアントツールと言えば何を利用していますか？ チーム内で聞くと様々なプロダクトの名前が挙がりました。そんな中で私が推したいのは、 GoLand（JetBrainsの有償ライセンスを購入している人）を利用している人に対しては、Database Tools and SQLプラグインを利用することです"
---
## はじめに

Technogoly Innovation Group 真野です。

RDB（ここでは社内でも実績が多いPostgreSQLとさせてください）のGUIクライアントツールと言えば何を利用していますか？ チーム内で聞くと様々なプロダクトの名前が挙がりました。

* [DBeaver](https://dbeaver.io/)
    * 有名、機能リッチ、UIデザイン良い
* [A5:SQL Mk-2](https://a5m2.mmatsubara.com/)
    * データモデリングツールに用いていると、DBクライアントとしても用いる流れになりやすい
* [PSqlEdit](http://www.hi-ho.ne.jp/a_ogawa/psqledit/index.htm)
    * 高速かつシンプル、直感的な動作
    * Oracle版の[OSqlEdit](http://www.hi-ho.ne.jp/a_ogawa/osqledit/)に課金し、お世話になった。最初に使ったSQLクライアントツール（私です）
* [pgAdmin 4](https://www.pgadmin.org/)
    * データモデリングも、DBクライアントとしても利用

10数年前の所属していたプロジェクトだと、こういう開発ツールもチームで統一しないと駄目！みたいな雰囲気でしたが、いつの間にか↑あたりから自由に選んでね、という良い意味でのゆるふわさに変わっていたのが新鮮でした（規模やリーダーのポリシーによるんでしょうが）。

上記の4つのツールはどれも素晴らしいし、名前がたまたま挙がらなかったけど優れているツールもあるかと思います。そんな中で私が推したいのは、 **GoLand（JetBrainsの有償ライセンスを購入している人）を利用している人に対しては、Database Tools and SQLプラグインを利用する** ことです。GoLandはJetBrainsの提供するIDEの、Go言語版です。Python版のPyCharm(Professional)、Java（JVM）版のIntelliJ(Ultimate)などでも同様の機能を有すると思います

<img src="/images/20221014a/image.png" alt="" width="1200" height="659" loading="lazy">

私がちょうど開発で用いているGoLand 2022.2.3 のバージョンで説明していきます。

GoLand には、30 日間無料体験版期間があるので、気になる人はお試しもできます。もし、ここに投資したくないって方は最初に上げた4つのツールなどを利用すると良いと思います。

* https://www.jetbrains.com/ja-jp/go/download

## Database Tools and SQLの利用

GoLandでDatabase Tools and SQLを使うためには、プラグインをインストールする必要があります。

* https://pleiades.io/help/go/relational-databases.html


Pluginから検索して追加ください。

<img src="/images/20221014a/image_2.png" alt="" width="1200" height="582" loading="lazy">

JetBrains製品に詳しい人は、[DataGrip](https://www.jetbrains.com/datagrip/) との違い何？と思うでしょう。ぶっちゃけ同じです。このプラグインを入れると DataGrip で利用可能なすべての機能のサポートしてくれるそうです。DataGripも30日より長く利用する場合は有償なのでお得ですね。


## おすすめする理由

次で機能面でのおすすめポイントを紹介しますが、GoLandでそのままSQL開発やクエリを発行できることの利点は個人的に大きいと思います。

* **複数のウィンドウを切り替えなくても良い** （迷子になりにくい）
    * 開発していると、VSCode、ブラウザ、テストデータ用に複数のExcelブックなど開くのですが、減らせるのは個人的に嬉しい
* ショートカットを始めとした操作感が、JetBrainsと同等なので、コンテキストスイッチの負荷が下がる
    * （当然ですが）デザインに一貫性があるのも強みに感じます
* 開発するPJごとに、DB接続情報が紐づくので便利
    * 最初にDB接続情報を登録しておけば、複数のリポジトリを開発するときに脳内マッチングしなくても済む

このあたりは人によって逆にマイナスに働く部分かもしれませんが、作業によってウィンドウを行ったり来たりしなくても良いのは、個人的意見ですが本当に楽です。

SQLはORマッパーで隠蔽化されていて、SQLを生で書くことは殆どないよって方もいらっしゃるかと思います。その場合は確かに恩恵は受けにくいかもと思います。


## 機能について

Database Tools and SQLプラグインがDataGripと同等と伝えてしまったので、ここからはDataGripの機能説明と同義になってしまいます。自分が使って気に入っている点・便利だなと思っている点を紹介します。

次から、いくつかGIF動画を貼っていますが、[PostgreSQL TutorialのDVDレンタルのスキーマ](https://www.postgresqltutorial.com/postgresql-getting-started/postgresql-sample-database/)を取り込んでいます[^1]。


[^1]: 余り需要は無い気もしますが、 https://github.com/ma91n/goland_Database_Tools_and_SQL のdocker-compose.yaml で利用すると、このブログで利用したスキーマを再現できます。

### スキーマの探索

いったんDBに接続できてしまえば、ドリルダウン的にテーブル定義を確認することができます。キーの定義などをさっと確認したいときに便利です。

<img src="/images/20221014a/スキーマ探索.gif" alt="スキーマ探索" width="1200" height="569" loading="lazy">

DDLを見たほうが嬉しいという人にも、サクッと生成する機能があります。テーブルを右クリック＞SQLスクリプト＞SQLジェネレータ

<img src="/images/20221014a/DDL生成.gif" alt="DDL生成" width="1200" height="926" loading="lazy">


### SQLの実行

何かしらのSQLを選択肢、 `ctrl + Enter`で実行することができます。

<img src="/images/20221014a/SQL実行.gif" alt="SQL実行" width="1200" height="648" loading="lazy">

JetBrains製のIDEらしく、補完もバッチリしていて、テーブル名、列名、ファンクションなどもバッチリです。

<img src="/images/20221014a/補完.gif" alt="補完" width="1200" height="641" loading="lazy">

他にも次の点が個人的に気に入っています。

* **カラムをダブルクリックするとDDLの定義元にジャンプ**する（！）。最初は驚きました
* **存在しないテーブル、カラムなどを指定すると、エラーになる** （コンパイル検出みたいに、実行前に気がつけて良いです）
* （実はあまりやったことがないですが）、テーブル名をダブルクリックした表を、Excelのように直接編集してコミットできる
* 検索結果をCSV/TSV/JSON/Markdown/xlsxなどの様々なフォーマットでダウンロードもできます
    * その時、縦横変換なども設定で可能
    * なんというか、作り込まれている..と感じることができました

### SQL生成

Insert, Updateなどの基本的なSQL生成もできます。

<img src="/images/20221014a/SQL生成.gif" alt="SQL生成" width="1200" height="392" loading="lazy">

この辺はまぁ..大抵のツールに備わっていそうだなという感想です。


### プレスホルダー

アプリケーションで用いるライブラリによっては、プレスホルダーの書き方が `?` 以外の、 `$1` や `@id` といった書き方があり得ると思います。

このときにも、正規表現による設定でエディタにプレスホルダーだと認識させることができます。

* https://www.jetbrains.com/help/datagrip/settings-tools-database-user-parameters.html

「ツール＞データべース＞クエリと実行＞ユーザーパラメータ」に、 `$1` の場合は、`\$(\d+)`、 `@id` の場合は `@(\w+)` を追加。

<img src="/images/20221014a/image_3.png" alt="" width="1200" height="857" loading="lazy">


### 背景色の変更

例えば、develop, staging, production と3つのDB接続先があり、develop環境に流したつもりが、実はproduction環境であったといったヒューマンエラーを防ぎたいと思います。そもそも、staging, production環境の接続情報を同等に扱うのではなく、権限をREAD_ONLYにするなど様々な工夫はあるかと思いますが、それでもどの環境に接続しているかは非常に重要です。


「データベースエクスプローラから右クリック＞ツール＞色設定」変更できます。

<img src="/images/20221014a/背景色変更.png" alt="背景色変更" width="751" height="374" loading="lazy">

例えば、本番環境は背景色をオレンジにした例です。GIFだとタブ色だけ変えていますが、エディタ全体の色を変えることもできます。

<img src="/images/20221014a/background-color.gif" alt="オレンジにした例" width="1200" height="604" loading="lazy">

個人的にはツールを選ぶ上で最重要にしている機能かもしれません。


## まとめ

JetBrainsで有償ライセンスを持っている方でも、Database Tools and SQLプラグインを使っている人が周りで少ないなと思ったので書きました。

DataGripと同等の機能を有するため非常に高機能で作り込まれており、おすすめです（せっかくなので一度は試さないともったいないという精神もあるかもです）。

また、GoなりPythonなりNode.jsなりJavaなりで開発しているIDE上で、そのままの開発者体験でSQLのクエリの実装を行えるのはかなりプラスだと思います。これはORマッパーなど使っているかどうかでかなり変わってきそうですが、ちょっとしたデータ調査にもシームレスにSQLを触ろうと思える準備を整えておくのは良いでしょう。

