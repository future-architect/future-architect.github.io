---
title: "マネージャーがうれしいRedmineデータのダッシュボード表示方法を公開します！！"
date: 2017/05/10 18:00:00
postid: ""
tag:
  - Redmine
  - Kibana
  - Elasticsearch
  - マネジメント
  - 可視化
category:
  - Management
thumbnail: /images/20170510/thumbnail_20170510.jpg
author: 近藤雅章
lede: "Redmineにはデータの可視化機能が標準で搭載されていないという課題があります。そこで、Kibanaを使ってRedmineデータを可視化するダッシュボードを構築する方法を紹介します"
---

<img src="/images/20170510/photo_20170510_00.jpg" alt="">

## はじめに

こんにちは。近藤です。

前回までの記事です
  * [1記事目](/articles/20160920/) はRedmineのデータをKibanaで表示しました
  * [2記事目](/articles/20170119/) はRedmineのデータからEVMグラフを作成しKibanaで表示しました

3記事目となる本記事ではRedmineデータを可視化するダッシュボードをKibana上に構築します。Kibanaを使うことによって例えば、担当者別のタスク量、トラッカー別のタスク量、EVMグラフを同時に把握できます。

◆ダッシュボード例

<img src="/images/20170510/photo_20170510_39.png" loading="lazy">

では早速、Kibanaを使ってみましょう。

なお、下記を前提としています。

- Windows環境で構築する
- Redmineのデータベース(MySQL)に直接接続する

## 大まかな流れ

下記の手順でグラフを表示します。

1. 環境構築
2. データ投入
3. ダッシュボード構築

## 1.環境構築

今回もELK+Timelionを利用して、Redmineデータの可視化環境を構築します。

<img src="/images/20170510/photo_20170510_99.png" loading="lazy">


### モジュールのダウンロード
前回の投稿から時間がたち、ELKのバージョンが上がったのであらためて最新のモジュールをダウンロードします。

* Elastic Search Download URL
  * [https://www.elastic.co/jp/downloads/elasticsearch](https://www.elastic.co/jp/downloads/elasticsearch)
  * 私の場合は、「elasticsearch-5.4.0.zip」をダウンロードしました。
* Kibana Download URL
  * [https://www.elastic.co/downloads/kibana](https://www.elastic.co/downloads/kibana)
  * 私の場合は、「kibana-5.4.0-windows-x86.zip」をダウンロードしました。
* Logstash Download URL
  * [https://www.elastic.co/downloads/logstash](https://www.elastic.co/downloads/logstash)
  * 私の場合は、「logstash-5.4.0.zip」をダウンロードしました。

### モジュールの配備
次に、「C:\elastic」というフォルダを作成。そして、先ほどダウンロードしたそれぞれの圧縮ファイルを解凍し、「C:\elastic」へ配置します。

最終的には下記のようなフォルダ構成になります。
```c
C:\elastic
 └ elasticsearch-5.4.0
 └ kibana-5.4.0-windows-x86
 └ logstash-5.4.0
```

### JDBCドライバ設定
次に、JDBCドライバを用意します。

[前々回](/articles/20160920/)ダウンロードした「mysql-connector-java-5.1.39-bin.jar」というファイルを、
「C:\elastic\logstash-5.4.0\bin」以下に配置します。

次に、「redmine.txt」というファイルを作成。中身は下記のようにします。（★を含む箇所は皆様の環境に合わせた値へ変えてください。）

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
	iss.due_date due_date
	, iss.updated_on updated_on
	, iss.estimated_hours pv
	, iss.estimated_hours * iss.done_ratio / 100 ev
	, tim.hours ac
	, concat(usr.lastname, usr.firstname) user_name
	, tra.name tracker_name
from
	issues iss
	left join (
		select
			issue_id
			, sum(hours) hours
		from
			time_entries
		group by
			issue_id
	) tim
	on iss.id = tim.issue_id
	left join users usr
	on iss.assigned_to_id = usr.id
	left join trackers tra
	on iss.tracker_id = tra.id
"
    }
}
output {
    elasticsearch {
    }
}
```

中に記載されているSQLでは、下記7つの値を取得します。なお、pv、ec、acについては、[前回の記事:EVMとは？](/articles/20170119/#EVMとは？)をご参照ください。

| SQL上の項目名 | Redmine上の項目名 　|
|:-----------|:-----------------|
| due_date 　|「期日」 　　　　　　　　|
| updated_on |「更新日」　　　　　　　|
| pv 　　　　　|「予定工数」        　 |
| ev         |「予定工数」×「進捗率」 |
| ac     　　 |「作業時間の記録」 　　　|
| user_name   |「担当者名」 　　　    |
| tracker_name |「トラッカー名」 　　　|

この「redmine.txt」も「C:\elastic\logstash-5.4.0\bin」に配置します。

結果的に、下記のようなフォルダ構成になります。

```c
C:\elastic
 └ elasticsearch-5.4.0
 └ kibana-5.4.0-windows-x86
 └ logstash-5.4.0
 └ bin
   └ mysql-connector-java-5.1.39-bin.jar
   └ redmine.txt
```


## 2.RedmineデータをELKに取り込む

### ElasticSearchの起動
まず、ElasticSearchを実行します。
「C:\elasticsearch-5.4.0\bin」フォルダで下記のコマンドを実行。

`elasticsearch.bat`

コマンドプロンプトの右下に"started"と表示されたら起動完了です。

### Logstashを使ったデータ取り込み
次に、Logstashを使って、RedmineのデータをElasticSearchへ取り込みます。
「C:\elastic\logstash-5.4.0\bin」フォルダで下記コマンドを実行。

`logstash.bat -f redmine.txt`

<img src="/images/20170510/photo_20170510_40.png" loading="lazy">

取り込みが完了しました。

### Kibanaの起動
次に、Kibanaを起動します。
「C:\elastic\kibana-5.4.0-windows-x86\bin」フォルダで下記コマンドを実行。

`kibana.bat`

<img src="/images/20170510/photo_20170510_02.png" loading="lazy">

Kibanaが起動しました。

### Kibanaでグラフ表示
では、Kibanaを表示します。ブラウザで `http://localhost:5601`を開く。

<img src="/images/20170510/photo_20170510_03.png" loading="lazy">

[Configure an index pattern]という画面が開くので、[Time-field name]に"due_date"を指定します。

そして、[Create]をクリック。

<img src="/images/20170510/photo_20170510_10.png" loading="lazy">

そして、左側の[Visualize]をクリックすると、Visualizeの画面が開きます。

<img src="/images/20170510/photo_20170510_06.png" loading="lazy">

ここで、「Create a visualizetion」をクリック。

<img src="/images/20170510/photo_20170510_11.png" loading="lazy">

[Select visualization type]画面が表示されるので、「Vertical bar」をクリックします。

<img src="/images/20170510/photo_20170510_08.png" loading="lazy">

そして、「logstash-*」をクリックすると、

<img src="/images/20170510/photo_20170510_12.png" loading="lazy">

グラフ画面が出ましたね！


### 担当者別のPVグラフ作成
次は、担当者別のPVを表示するグラフを作成。下記の設定箇所にそれぞれの値を設定します。

| 設定箇所 | 値 　|
|:-----------|:-----------------|
| \[metrics\]->\[Y-Axis\]->\[Aggregation\] | Sum |
| \[metrics\]->\[Y-Axis\]->\[Field\] | pv |
| \[buckets\]->\[X-Axis\]->\[Terms\] | user_name.keyword |

そして、画面左上の「再生ボタン」をクリックすると、

<img src="/images/20170510/photo_20170510_13.png" loading="lazy">

担当者別のPVが表示されました！

では、グラフを保存します。

画面右上の「Save」をクリック。
テキストボックスが表示されるので”PvUser”と入力します。

<img src="/images/20170510/photo_20170510_15.png" loading="lazy">

そして、青色の「Save」をクリックすると、グラフが保存されました。



## 3.ダッシュボード構築

続いて、画面左側の「Dashboard」をクリックします。

<img src="/images/20170510/photo_20170510_16.png" loading="lazy">

画面中央の「Create a dashboard」をクリック。

<img src="/images/20170510/photo_20170510_17.png" loading="lazy">

そして、画面中央の「Add」をクリックします。

<img src="/images/20170510/photo_20170510_18.png" loading="lazy">

続いて、「PvUser」をクリックすると、

<img src="/images/20170510/photo_20170510_19.png" loading="lazy">

グラフが追加されました！

<img src="/images/20170510/photo_20170510_19.png" loading="lazy">

次にダッシュボードを保存します。

右上の「Save」をクリックし、表示されたテキストボックスに”main”と入力。

<img src="/images/20170510/photo_20170510_20.png" loading="lazy">

「Save」をクリックします。これで作成したダッシュボードが保存されました。

<img src="/images/20170510/photo_20170510_21.png" loading="lazy">

では、もう一つグラフを作成します。

作成したグラフの上にカーソルを当てると、右上にボタンが出てくるので、

<img src="/images/20170510/photo_20170510_22.png" loading="lazy">

その中の「鉛筆マーク」をクリックします。

<img src="/images/20170510/photo_20170510_23.png" loading="lazy">

グラフの編集画面が開きました。

今度、トラッカー別のPVを表示するグラフを作成。下記の通り値を変更し、「再生ボタン」をクリックし、画面右上の「Save」をクリック。

| 設定箇所 | 値 　|
|:-----------|:-----------------|
|\[buckets\]->\[X-Axis\]->\[Terms\] | tracker_name.keyword |

表示されたテキストボックスに”PvTracker”と入力し、「Save as a new visualization」にチェックを入れます。

<img src="/images/20170510/photo_20170510_27.png" loading="lazy">

そして、「Save」をクリック。グラフが保存されます。

画面左の「Dashboard」をクリック。そして、画面右上の、「Add」をクリックします。

<img src="/images/20170510/photo_20170510_25.png" loading="lazy">

「PvTracker」をクリックすると、

<img src="/images/20170510/photo_20170510_28.png" loading="lazy">

トラッカー別PVグラフが追加されました。

次に右上の「Add new Visualization」ボタンをクリック。

<img src="/images/20170510/photo_20170510_30.png" loading="lazy">

「Select visualization type」画面で「Timelion」をクリックします。

ここで、EVMグラフを作成します。

内容は[前回](/articles/20170119/)のEVMグラフと一緒。

まず、「Timelion」画面が開くので、「Interval」に”1d”を指定。

次に、「Timelion Expression」に下記の値を指定し、再生ボタンをクリックします。

`.es(metric='sum:pv', timefield='due_date').cusum().label('[累積]pv'),.es(metric='sum:ev', timefield='updated_on').cusum().label('[累積]ev'),.es(metric='sum:ac', timefield='updated_on').cusum().label('[累積]ac')`

<img src="/images/20170510/photo_20170510_31.png" loading="lazy">

EVMグラフが表示されました。

右上の「Save」をクリック。表示されるテキストボックスに、”EvmAll”と入力し、青い「Save」をクリックします。

これでEVMグラフが保存されました。

画面左側の「Dashboard」をクリック。

そして、画面右上の「Add」をクリックし、「EvmAll」をクリックします。

<img src="/images/20170510/photo_20170510_33.png" loading="lazy">

さらに、画面右上の”＾”をクリックすると、

<img src="/images/20170510/photo_20170510_34.png" loading="lazy">

EVMグラフの大きさを調整すると、

<img src="/images/20170510/photo_20170510_35.png" loading="lazy">

ダッシュボードの完成です。

ではドリルダウン機能も使ってみましょう。

操作はとても簡単。

例えば、特定の担当者名をクリックすると。

<img src="/images/20170510/photo_20170510_36.png" loading="lazy">

その担当者が、アサインされているチケットのトラッカー、及び担当者のEVMが表示されます。

<img src="/images/20170510/photo_20170510_37.png" loading="lazy">

また、表示期間を絞り込む事もできます。Timelion上で期間を選択することで、

<img src="/images/20170510/photo_20170510_38.png" loading="lazy">

この通り。選択された期間で絞り込むことができました。

## 最後に

今回は、Redmineデータを可視化するダッシュボードを構築しました。今回の設定を拡張することで、様々な軸で、様々な値を可視化することが可能。RedmineをKibanaと組み合わせることで、結果的にプロジェクト状況の把握が容易になります。

本記事が、皆様のプロジェクトマネジメントに役に立てば幸いです。
みなさまにとって参考になりそうでしたら「いいね！」をクリックして頂けますと幸いです。執筆の励みになります。＾＾

なお、次回以降私がブログを執筆する際は、ダッシュボード画像のメール配信に関する方法を記載する予定。
今後ともよろしくお願い致します。

シリーズとして連載しています。こちらもぜひどうぞ。

* [マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！](/articles/20160920/)
* [マネージャーがうれしいRedmineデータのEVM表示方法を公開します！！](/articles/20170119/)
* マネージャーがうれしいRedmineデータのダッシュボード表示方法を公開します！！
* [マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！（Metabase編）](/articles/20190703/)

