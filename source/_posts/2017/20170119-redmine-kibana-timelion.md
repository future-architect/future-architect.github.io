---
title: "マネージャーがうれしいRedmineデータのEVM表示方法を公開します！！"
date: 2017/01/19 18:00:00
postid: ""
tag:
  - Kibana
  - Redmine
  - 可視化
category:
  - Management
thumbnail: /images/20170119/thumbnail_20170119.jpg
author: 近藤雅章
lede: "Redmineにはデータの可視化機能が標準で搭載されていないという課題があります。そこで、Kibana＋Timelionを使ってRedmineデータをEVM表示する方法を紹介します"
---

<img src="/images/20170119/top.jpg" alt="">

## はじめに

こんにちは。近藤です。

[前回](/articles/20160920/)はRedmileのデータをKibanaで表示してみました。

今回はRedmineデータをEVMグラフとして表示します。

例えば、Kibana+Timelionを使うと、RedmineデータからEVMグラフを表示することができるのです。

**◆EVMグラフ例**

<img src="/images/20170119/photo_20170119_40.png" loading="lazy">


では早速、Kibana+Timelionを使ってみましょう。

なお、下記を前提としています。

- Windows環境で構築する。
- Redmineのデータベース(MySQL)に直接接続する。

## EVMとは？

**EVM**(Earned Value Management:アーンド・バリュー・マネジメント)はPMBOKでも説明されている有名なプロジェクト管理技法です。

今回は下記の値を計測します。

|計測値        |説明   |略称|
|-------------|------|--|
|Planned Value|計画価値|PV|
|Actual Cost  |実コスト|AC|
|Earned Value |出来高  |EV|

それぞれの計測値をITプロジェクトにおける数値に置き換えると、下記のように言えます。

- 画面開発に必要な工数（Planned Value：**PV**）
- メンバーが稼働した時間（Actual Cost：**AC**）
- 開発が完了した作業量（Earned Value：**EV**）

<img src="/images/20170119/photo_20170119_00.png" loading="lazy">

これらの数値を別々に把握できると、下記が別々に管理できそうです。

- ①.画面開発の進捗（EV ÷ PV）
- ②.メンバーの生産性（EV ÷ AC）

①の値を**SPI**(Schedule Performance Index)、②の値を**CPI**(Cost Performance Index)と呼びます。

いずれも標準値が"1.00"。それを下回る場合は、課題があると考えられます。


## RedmineのデータをEVM表示するとどうなる？

例えば、下記のような4件のチケットがRedmineに登録されているプロジェクトがあったとします。

チケット番号#4の進捗が50%の状況ですね。

<img src="/images/20170119/photo_20170119_49.png" loading="lazy">

この場合、**PV**の累計は"**32h**"、**EV**の累計は"**28h**"。PVに対して**EV**が"**4h**"足りていないことが分かります。

また、**SPI**は"**0.875**"。**進捗**が"**0.125**"つまり、**12.5%**遅延していることが分かります。


## 作業時間を付記した場合のEVMの例

今度は作業時間を付記してみました。

<img src="/images/20170119/photo_20170119_50.png" loading="lazy">

この場合、**AC**の累計は"**28h**"です。

また、**CPI**は"**1.00**"。つまり、生産性は標準であることがわかります。

つまり、遅延はしているが、メンバーの生産性は標準。
メンバーの作業時間を確保することで、進捗が向上する事が検討出来そうです。

EVMを使うことで多角的にプロジェクトを把握する事ができますね。

今回は、このEVMをグラフで表示します。


## 大まかな流れ

下記の手順でグラフを表示します。

1. 環境構築
2. データ投入
3. EVM 表示

## 1.環境構築

**環境構成図**
<img src="/images/20170119/photo_201720160928_03.png" loading="lazy">

今回もELK+Timelionを利用して、Redmineデータの可視化環境を構築します。

(a)ELKをダウンロード
  * [Elastic Search Download URL](https://www.elastic.co/jp/downloads/elasticsearch](https://www.elastic.co/jp/downloads/elasticsearch)
  * →前回の構築時から最新版が出ているため（2017/1/19時点）私の場合は、「elasticsearch-5.1.2.zip」をダウンロードしました。

(b) Kibanaをダウンロード
  * [Kibana Download URL](https://www.elastic.co/downloads/kibana](https://www.elastic.co/downloads/kibana)
    * →私の場合は、「kibana-5.1.2-windows-x86.zip」をダウンロードしました。

(c) Logstashをダウンロード
  * [Logstash Download URL](https://www.elastic.co/downloads/logstash](https://www.elastic.co/downloads/logstash)
    * →私の場合は、「logstash-5.1.2.zip」をダウンロードしました。

(d) 「c:\elastic」というフォルダを作成

(e) 先ほどダウンロードしたそれぞれの圧縮ファイルを解凍し、「c:\elastic」へ配置します。


最終的には下記のようなフォルダ構成になります。

```
C:\elastic
  └elasticsearch-5.1.2
  └kibana-5.1.2-windows-x86
  └logstash-5.1.2
```

## 2.RedmineデータをELKに取り込む

次に、JDBCドライバを用意します。

[前回](/articles/20160920/)ダウンロードした「mysql-connector-java-5.1.39-bin.jar」というファイルを、
「C:\elastic\logstash-5.1.2\bin」以下に配置します。

次に、「redmine.txt」というファイルを作成。中身は下記のようにします。（★を含む箇所は皆様の環境に合わせた値へ変えて下さい。）

```json
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
"
    }
}
output {
    elasticsearch {
    }
}
```

中に記載されているSQLでは、下記5つの値を取得します。

| SQL上の項目名 | Redmine上の項目名 　|
|:-----------|:-----------------|
| due_date 　|「期日」 　　　　　　　　|
| updated_on |「更新日」　　　　　　　|
| pv 　　　　　|「予定工数」        　 |
| ev         |「予定工数」×「進捗率」 |
| ac     　　 |「作業時間の記録」 　　　|

この「redmine.txt」も「C:\elastic\logstash-5.1.2\bin」に配置。

結果的に、下記のようなフォルダ構成になります。

```
C:\elastic
└elasticsearch-5.1.2
└kibana-5.1.2-windows-x86
└logstash-5.1.2
 └bin
  └mysql-connector-java-5.1.39-bin.jar
  └redmine.txt
```

では、ElasticSearchを実行します。
「C:\elasticsearch-5.1.2\bin」フォルダで下記のコマンドを実行。

`elasticsearch.bat`

コマンドプロンプトの右下に"started"と表示されたら起動完了です。

次にLogstashを使って、RedmineのデータをElasticSearchへ取り込みます。
「C:\elastic\logstash-5.1.2\bin」フォルダで下記コマンドを実行。

`logstash.bat -f redmine.txt`

<img src="/images/20170119/photo_20170119_29.png" loading="lazy">

取り込みが完了しました。

次に、Kibanaを起動します。
「C:\elastic\kibana-5.1.2-windows-x86\bin」フォルダで下記コマンドを実行。

`kibana.bat`

<img src="/images/20170119/photo_20170119_16.png" loading="lazy">

Kibanaが起動しました。

では、Kibanaを表示します。ブラウザで `http://localhost:5601`を開く。

<img src="/images/20170119/photo_20170119_17.png" loading="lazy">

[Configure an index pattern]という画面が開くので、[Time-field name]に"due_date"を指定します。

そして、[Create]をクリック。

<img src="/images/20170119/photo_20170119_30.png" loading="lazy">

そして、左側の[Timelion]をクリックすると、Timelionの画面が開きます。

<img src="/images/20170119/photo_20170119_21.png" loading="lazy">

グラフが出ましたね！

次は、少し見やすくするために、グラフエリアを最大化します。
グラフにカーソルを当てると[Full screen]ボタンが表示されるのでクリック。

<img src="/images/20170119/photo_20170119_22.png" loading="lazy">

するとグラフが最大化されます。
そして、次は表示期間を変更します。右上[Last 15 minutes]ををクリック。

<img src="/images/20170119/photo_20170119_23.png" loading="lazy">

すると日付が選べます。今回は[Last 1 Year]をクリック。

<img src="/images/20170119/photo_20170119_08.png" loading="lazy">

次に、画面右上あたりの[Last 1 Year]をクリック。

<img src="/images/20170119/photo_20170119_24.png" loading="lazy">

グラフが大きく見やすくなりましたね。

<img src="/images/20170119/photo_20170119_25.png" loading="lazy">

## 3.EVM 表示

では、`.es(*)`という記載を
`.es(metric='sum:pv', timefield='due_date').cusum().label('[累積]pv')`
に変更します。

<img src="/images/20170119/photo_20170119_38.png" loading="lazy">

PVの累計が期日別に表示されました。

記載の意味は下記の通りです。
- .es(metric)：表示する項目を指定する。今回はPVの合計を指定。
- .es(timefield)：X軸の項目名を指定する。今回は期日(due_date)を指定。
- .cusum()：累積表示するという意味。

次は、`.es(metric='sum:pv', timefield='due_date').cusum().label('[累積]pv')`という記載を

`.es(metric='sum:pv', timefield='due_date').cusum().label('[累積]pv'),.es(metric='sum:ev', timefield='updated_on').cusum().label('[累積]ev')`
に変更します。

<img src="/images/20170119/photo_20170119_39.png" loading="lazy">

すると、EVの累計が更新日別に表示されます。

記載の意味は下記の通りです。
- .es(metric)：表示する項目を指定する。今回はEVの合計を指定。
- .es(timefield)：X軸の項目名を指定する。今回は更新日(updated_on)を指定。
- .cusum()：累積表示するという意味。

次は、`.es(metric='sum:pv', timefield='due_date').cusum().label('[累積]pv'),.es(metric='sum:ev', timefield='updated_on').cusum().label('[累積]ev')`という記載を

`.es(metric='sum:pv', timefield='due_date').cusum().label('[累積]pv'),.es(metric='sum:ev', timefield='updated_on').cusum().label('[累積]ev'),.es(metric='sum:ac', timefield='updated_on').cusum().label('[累積]ac')`
に変更します。

<img src="/images/20170119/photo_20170119_40.png" loading="lazy">

すると、ACの累計が更新日別に表示されます。

これで、PVとEV、ACが表示されましたね。

さらに、CPIも併記させます。

左下の[Exit full screen]をクリックし、グラフの大きさを元に戻します。

<img src="/images/20170119/photo_20170119_41.png" loading="lazy">

そして、右上の[Add]をクリック。

<img src="/images/20170119/photo_20170119_42.png" loading="lazy">

グラフが追加されました。

<img src="/images/20170119/photo_20170119_43.png" loading="lazy">

そして、`.es(*)`という記載を
`.es(metric='sum:ev', timefield='updated_on').cusum().divide(.es(metric='sum:ac', timefield='updated_on').cusum()).label('cpi').yaxis(min=0.75, max=1.25)`
に変更すると。

<img src="/images/20170119/photo_20170119_48.png" loading="lazy">

CPIが表示されました。

記載の意味は下記の通りです。
- .divide()：割り算するという意味。今回は、EV÷ACを指定。
- .yaxis()：Y軸の表示範囲を指定する。今回は、0.75～1.25を指定。

これでTimelionの左側に、PVとEVとAC。右側にCPIが併記されました。

## 最後に

今回は、EVMグラフを表示しました。

いかがでしたでしょうか？
RedmineをKibana＋Timelionと組み合わせることで、グラフ表示が可能になり、結果的にプロジェクト状況の把握が容易になります。

本記事が、皆様のプロジェクトマネジメントに役に立てば幸いです。

なお、次回以降私がブログを執筆する際は、グラフのドリルダウン、プロジェクトダッシュボードの構築、ダッシュボード画像のメール配信に関する方法を記載していく予定。

これらの記事が、みなさまにとって参考になりそうでしたら「いいね！」をクリックして頂けますと幸いです。執筆の励みになります。＾＾

今後ともよろしくお願い致します。


シリーズとして連載しています。こちらもぜひどうぞ。

* [マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！](/articles/20160920/)
* マネージャーがうれしいRedmineデータのEVM表示方法を公開します！！
* [マネージャーがうれしいRedmineデータのダッシュボード表示方法を公開します！！](/articles/20170510/)
* [マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！（Metabase編）](/articles/20190703/)

