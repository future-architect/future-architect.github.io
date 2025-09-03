---
title: "マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！"
date: 2016/09/20 18:00:00
postid: ""
tag:
  - Kibana
  - Redmine
  - 可視化
category:
  - Management
thumbnail: /images/2016/20160920/thumbnail_20160920.jpg
author: 近藤雅章
lede: "Redmineにはデータの可視化機能が標準で搭載されていないという課題があります。そこで、Kibana＋Timelionを使ってRedmineデータをグラフ表示する方法を紹介します"
---

<img src="/images/2016/20160920/photo_20160920_00.jpg" alt="">

## はじめに

こんにちは。近藤です。

みなさん、Redmineを使っていますか？

私は使っています。Redmineはタスクをチケット管理する上で便利ですよね。

一方で、Redmineにはデータの可視化機能が標準で搭載されていないという課題があります。

例えばこれが、標準のサマリ画面。グラフがないから傾向とか分かりづらいんですよね。。

<img src="/images/2016/20160920/photo_20160920_01.png" loading="lazy">
参考:[redmine.org](http://www.redmine.org/projects/redmine/issues/report)

そこで、本日はKibana＋Timelionを使ってRedmineデータをグラフ表示する方法を紹介します。

例えば、Kibana+Timelionを利用すると、チケット発生件数の4週移動平均を簡単に表示できるのです。

<img src="/images/2016/20160920/photo_20160920_02.png" loading="lazy">

これがあれば、平均して毎週どれくらいのタスクが発生しているかが分かりますね（このテストデータの場合は9月時点で毎週28件のタスクが発生している）

では早速、Kibana+Timelionを使ってみましょう。

なお、下記を前提としています。

- Windows環境で構築する。
- Redmineのデータベース(MySQL)に直接接続する。

## 大まかな流れ

下記の手順でグラフを表示します。

1. ELKのインストール
2. RedmineデータをELKに取り込む
3. グラフ表示

## 1.ELKのインストール

はじめに、ELKの説明です。

ELKはelastic社が提供する、データ可視化OSSの総称。

Elastic Search＋Logstash＋Kibanaそれぞれの頭文字をとって、ELKと呼びます。

今回、ELKを利用して、Redmineデータの可視化環境を構築します。

<img src="/images/2016/20160920/photo_20160920_03.png" loading="lazy">

ではまず、Elastic Searchをダウンロードします。

◆Elastic Search Download URL

[https://www.elastic.co/jp/downloads/elasticsearch](https://www.elastic.co/jp/downloads/elasticsearch)

→私の場合は、「Elasticsearch 2.4.0」をダウンロードしました。

次に、Kibanaをダウンロード。

◆Kibana Download URL

[https://www.elastic.co/downloads/kibana](https://www.elastic.co/downloads/kibana)

→私の場合は、「Kibana 4.6.1」をダウンロードしました。

最後に、Logstashをダウンロードします。

◆Logstash Download URL

[https://www.elastic.co/downloads/logstash](https://www.elastic.co/downloads/logstash)

→私の場合は、「Logstash 2.4.0 All Plugins」をダウンロードしました。

次に、「c:\elastic」というフォルダを作成。そこへ、それぞれのダウンロードした圧縮ファイルを解凍し配置します。

最終的には下記のようなフォルダ構成になります。

<img src="/images/2016/20160920/photo_20160920_04.png" loading="lazy">

## 2.RedmineデータをELKに取り込む

まず、JDBCドライバをダウンロードします。

私のRemineはMySQLを利用しているので、今回はMysqlのJDBCドライバーをインストールしました。

◆MySQL JDBC ドライバ URL

[https://dev.mysql.com/downloads/connector/j/](https://dev.mysql.com/downloads/connector/j/)

→私の場合は、「Platform Independent (Architecture Independent), ZIP Archive」をダウンロードしました。

ダウンロードしたファイル内の `mysql-connector-java-5.1.39-bin.jar` というファイルを、`C:\elastic\logstash-all-plugins-2.4.0\logstash-2.4.0\bin` に配置します。

次に、「redmine.txt」というファイルを作成。中身は下記のようにします（★を含む箇所は皆様の環境に合わせた値へ変えて下さい）。

```sh
input {
    jdbc {
        jdbc_connection_string => "jdbc:mysql://★IP★:3306/★サービス名★"
        jdbc_user => "★ユーザ名★"
        jdbc_password => "★パスワード★"
        jdbc_driver_library =>"mysql-connector-java-5.1.39-bin.jar"
        jdbc_driver_class => "com.mysql.jdbc.Driver"
        statement => "
select
	*
from
	issues
"
    }
}
output {
    elasticsearch {
	document_id => "%{id}"
    }
}
```

「redmine.txt」も「C:\elastic\logstash-all-plugins-2.4.0\logstash-2.4.0\bin」に配置。

結果的に、下記のようなフォルダ構成になります。

<img src="/images/2016/20160920/photo_20160920_05.png" loading="lazy">

では、ElasticSearchを実行します。ElasticSearchのbinフォルダで下記のコマンドを実行。

`elasticsearch.bat`

<img src="/images/2016/20160920/photo_20160920_06.png" loading="lazy">

次にLogstashを使って、RedmineのデータをElasticSearchへ取り込みます。Logstashのbinフォルダで下記コマンドを実行。

`logstash.bat -f redmine.txt`

<img src="/images/2016/20160920/photo_20160920_07.png" loading="lazy">

取り込みが完了しました。

<img src="/images/2016/20160920/photo_20160920_08.png" loading="lazy">

## 3.グラフ表示

最初に、timelionをインストールします。kibanaのbinフォルダで下記のコマンドを実行。

`kibana plugin -i elastic/timelion`

<img src="/images/2016/20160920/photo_20160920_09.png" loading="lazy">

次に、Kibanaを起動します。下記のコマンドを実行。

`kibana.bat`

<img src="/images/2016/20160920/photo_20160920_10.png" loading="lazy">

Kibanaが起動しました。

<img src="/images/2016/20160920/photo_20160920_11.png" loading="lazy">

では、Kibanaを表示します。ブラウザで `http://localhost:5601`を開く。

<img src="/images/2016/20160920/photo_20160920_12.png" loading="lazy">

[Configure an index pattern]という画面が開くので、[Time-field name]に"created_on"を指定します。

そして、[Create]をクリック。

<img src="/images/2016/20160920/photo_20160920_13.png" loading="lazy">

[★logstash-*]という画面が開くので、画面上部一番右のブロックボタンをクリック。

次に[Timelion]ボタンをクリックします。

<img src="/images/2016/20160920/photo_20160920_14.png" loading="lazy">

[Welcome to timelion]という画面が開きます。

[Don't show again]をクリック。

<img src="/images/2016/20160920/photo_20160920_15.png" loading="lazy">

これでグラフ表示は完了です。

では、実際にRedmineにおける週別チケット発生数のグラフを表示してみます。

## 週別チケット発生数のグラフ表示

まず、右上の[Last 15 minutes]をクリック。画面上部真ん中の"Last 1 years"をクリックします。

そうすると、直近1年間以内に登録されたチケットの情報が表示されます。

<img src="/images/2016/20160920/photo_20160920_16.png" loading="lazy">

次に、右側の"auto"を"1w"に変更。

左下の"Full screen"をクリックします。

<img src="/images/2016/20160920/photo_20160920_17.png" loading="lazy">

そして、`.es(*)`という記載を
`.es(metric='count:id', timefield='created_on').label('【週別】open').bars()`
に変更します。

すると、週ごとの発生チケット数が棒グラフで表示されます。

<img src="/images/2016/20160920/photo_20160920_18.png" loading="lazy">

次に、
`.es(metric='count:id', timefield='created_on').label('【週別】open').bars(),.es(metric='count:id', timefield='created_on').movingaverage(4).label('【4週移動平均】open')`
という記載に変更します。

すると、発生チケット数の4週移動平均が折れ線グラフで表示されます。

timelion便利ですね！

<img src="/images/2016/20160920/photo_20160920_19.png" loading="lazy">

そして、
`.es(metric='count:id', timefield='created_on').label('【週別】open').bars(),.es(metric='count:id', timefield='created_on').movingaverage(4).label('【4週移動平均】open'),.es(metric='count:id', timefield='created_on').cusum().label('[累積]open'),.es(metric='count:id', timefield='closed_on').cusum().label('[累積]close')`
という記載に変更すると、累積のチケット発生数、累積のチケットクローズ数が表示されます。

<img src="/images/2016/20160920/photo_20160920_20.png" loading="lazy">

これがあると、

- 全部でどれくらいのチケットが発生しているの？
- 全部でどれくらいのチケットが対応完了しているの？
- 週にどれくらいのチケットが発生しているの？

という問いに回答できますね。

例えば、チームの増員要否についても検討出来そうです。

## 最後に

今回は、累積グラフと、移動平均グラフを表示しました。それ以外のグラフも簡単に追加することが可能です。

詳しくは[Timelionのリファレンス](https://github.com/elastic/timelion/blob/master/FUNCTIONS.md)をご参照ください。

RedmineをKibana＋Timelionと組み合わせることで、グラフ表示が可能になり、結果的にプロジェクト状況の把握が容易になります。

みなさまのプロジェクトマネジメントに役に立てば幸いです。
