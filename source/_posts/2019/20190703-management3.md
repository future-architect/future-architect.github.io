---
title: "マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！（Metabase編） "
date: 2019/07/03 09:00:00
postid: ""
tag:
  - BI
  - Redmine
  - 可視化
category:
  - Management
thumbnail: /images/2019/20190703/photo_20190703_01.jpeg
author: 近藤雅章
lede: "OSSのBIツールであるMetabaseを利用して、Redmineのデータをグラフ表示する方法を紹介します"
---
<img src="/images/2019/20190703/photo_20190703_01.jpeg" loading="lazy">

## はじめに

こんにちは。近藤です。
みなさん、Redmineを使っていますか？
私は使っています。Redmineはタスクをチケット管理する上で便利ですよね。

一方で、Redmineにはデータの可視化機能が標準で搭載されていないという課題があります。
例えばこれが、標準のサマリ画面。グラフがないから傾向とか分かりづらいんですよね。
<img src="/images/2019/20190703/photo_20190703_02.png" style="border:solid 1px #000000" loading="lazy">
参考：http://www.redmine.org/projects/redmine/issues/report

これを何とかしようと、[以前の投稿](/articles/20160920/)では、Kibana+Timelionを使ってRedmineデータをグラフ表示する方法を紹介しました。

ただ、Kibanaを利用する場合、一度Elasticsearchにデータを登録しないといけないので、手間なのですよね。。

そこで、本日はOSSのBIツールである[Metabase](https://metabase.com/)を利用して、Redmineのデータをグラフ表示する方法を紹介します。

例えば、Metabaseを利用すると、チケットの発生件数とクローズ件数の推移を簡単に表示できます。
<img src="/images/2019/20190703/photo_20190703_03.png" style="border:solid 1px #000000" loading="lazy">

構築する環境は下記の通り。Kibana+Timelionで構築した環境よりもシンプルですね。
<img src="/images/2019/20190703/photo_20190703_04.png" style="border:solid 1px #000000" class="img-middle-size" loading="lazy">

では実際にやってみましょう。

なお、下記を前提としています。

- **Windows**環境で構築
- **Redmineのデータベース(MySQL)に直接接続**する

## 大まかな流れ

下記の手順でグラフを表示します。

1. Javaのインストール
2. Metabaseのインストール
3. グラフ表示

## 1.Javaのインストール

まず、MetabaseではJavaを利用するため、事前にインストールします。

お使いの環境にあったインストーラをご利用ください。
なお、私の場合は、下記のインストーラを利用しました。

◆Java SE DevelopmentダウンロードURL
https://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html
の `jdk-8u211-windows-x64.exe`

## 2. Metabaseのインストール

次に、Metabaseをダウンロードします。

◆MetabaseダウンロードURL
https://metabase.com/start/jar.html
→「Download Metabase.jar」をクリックします。すると「metabase.jar」がダウンロードされます。

そして、「c:\metabase」というフォルダを作成し、ダウンロードしたファイルを配置します。

最終的には下記のようなフォルダ構成になります。

```
c:\metabase
└ metabase.jar
```

## 3. グラフ表示

さあ、グラフ表示するにあたり、まずは、Metabaseを起動します。

コマンドプロンプトで `c:\metabase` へ移動し、`java -jar metabase.jar` を実行します。
<img src="/images/2019/20190703/photo_20190703_05.png" loading="lazy">

しばらくすると、下記のように`Metabase Initialization COMPLETE`と表示されます。
<img src="/images/2019/20190703/photo_20190703_06.png" style="border:solid 1px #000000" loading="lazy">

これでMetabaseが起動しました。
ブラウザで `http://localhost:3000` を開きます。

すると下記のような画面が表示されます。
<img src="/images/2019/20190703/photo_20190703_07.png" style="border:solid 1px #000000" loading="lazy">

「開始しましょう」をクリックします。
すると下記のような画面が表示されます。
<img src="/images/2019/20190703/photo_20190703_08.png" style="border:solid 1px #000000" loading="lazy">

姓名、メールアドレス、パスワード、組織名を入力します。
<img src="/images/2019/20190703/photo_20190703_09.png" style="border:solid 1px #000000" loading="lazy">

そして、「次へ」をクリック。
すると、下記のような画面が表示されます。
<img src="/images/2019/20190703/photo_20190703_10.png" style="border:solid 1px #000000" loading="lazy">

「使用するデータベースのタイプを選択する」から、データベースタイプを選択。
私の場合は、「MySQL」を選択しました。
すると、下記のように表示されるので、
<img src="/images/2019/20190703/photo_20190703_11.png" style="border:solid 1px #000000" loading="lazy">

データベースの種類、名前、ホスト、ポート、データベース名、ユーザ名、パスワードを入力。
私の場合は、名前を「redmine」にしました。
<img src="/images/2019/20190703/photo_20190703_12.png" style="border:solid 1px #000000" loading="lazy">

そして、「次へ」をクリックします。
すると、下記のような画面が表示されます。
<img src="/images/2019/20190703/photo_20190703_13.png" style="border:solid 1px #000000" loading="lazy">

「次へ」をクリックしましょう。
すると、下記のような画面が表示されます。

<img src="/images/2019/20190703/photo_20190703_14.png" style="border:solid 1px #000000" loading="lazy">

右上の「照会する」をクリックします。
<img src="/images/2019/20190703/photo_20190703_15.png" style="border:solid 1px #000000" loading="lazy">

「ネイティブクエリ」をクリック。
<img src="/images/2019/20190703/photo_20190703_16.png" style="border:solid 1px #000000" loading="lazy">

「データベースを選択する」から、先ほど入力したデータベースを選択しましょう。
（私の場合は、「redmine」）。
<img src="/images/2019/20190703/photo_20190703_17.png" style="border:solid 1px #000000" loading="lazy">

次に、チケットの発生件数とクローズ件数を取得する下記のSQLを水色のエリアに貼り付けます。

```sql
select
	is1.created_on ymd
	, 'open' kbn
	, sum(is2.id_count) id_count
from
	(
		select
			date_format(created_on, '%Y-%m-%d') as created_on
			, count(id) id_count
		from
			issues
		group by
			date_format(created_on, '%Y-%m-%d')
	) is1
	, (
		select
			date_format(created_on, '%Y-%m-%d') as created_on
			, count(id) id_count
		from
			issues
		group by
			date_format(created_on, '%Y-%m-%d')
	) is2
WHERE
	is2.created_on <= is1.created_on
group by
	is1.created_on
union all
select
	is1.closed_on
	, 'close'
	, sum(is2.id_count) id_count
from
	(
		select
			date_format(closed_on, '%Y-%m-%d') as closed_on
			, count(id) id_count
		from
			issues
		group by
			date_format(closed_on, '%Y-%m-%d')
	) is1
	, (
		select
			date_format(closed_on, '%Y-%m-%d') as closed_on
			, count(id) id_count
		from
			issues
		group by
			date_format(closed_on, '%Y-%m-%d')
	) is2
WHERE
	is2.closed_on <= is1.closed_on
group by
	is1.closed_on
```

貼り付けました。
<img src="/images/2019/20190703/photo_20190703_18.png" style="border:solid 1px #000000" loading="lazy">

そして、「回答を得る」をクリックすると、
<img src="/images/2019/20190703/photo_20190703_19.png" style="border:solid 1px #000000" loading="lazy">

結果が表示されます。
更に、左下の「テーブル」をクリックして、
<img src="/images/2019/20190703/photo_20190703_20.png" style="border:solid 1px #000000" loading="lazy">

「線」をクリックすると、
<img src="/images/2019/20190703/photo_20190703_21.png" style="border:solid 1px #000000" loading="lazy">

出ましたね。
チケットの発生件数とクローズ件数の推移が表示されています。

右上の「エディターを非表示にする」をクリックすると
<img src="/images/2019/20190703/photo_20190703_22.png" style="border:solid 1px #000000" loading="lazy">

グラフが大きくなりましたね。
グラフの線にカーソルを当てると、
<img src="/images/2019/20190703/photo_20190703_23.png" style="border:solid 1px #000000" loading="lazy">

値が表示されますし、右側の「↓」をクリックすると、
<img src="/images/2019/20190703/photo_20190703_24.png" style="border:solid 1px #000000" loading="lazy">
データのダウンロードも可能です。
便利ですね。

## 最後に

今回は、チケットの発生件数とクローズ件数の推移をグラフで表示しました。
それ以外のグラフを簡単に追加することも可能です。
詳しくは下記のMetabaseユーザーガイドをご参照ください。

◆Metabaseユーザーガイド
https://metabase.com/docs/latest/users-guide/start.html

いかがでしたでしょうか？ RedmineをMetabaseと組み合わせることで、グラフ表示が可能になり、結果的にプロジェクト状況の把握が容易になります。

本記事が、皆様のプロジェクトマネジメントに役に立てば幸いです。

なお、今後私がブログを執筆する際は、EVM表示やメール配信、ダッシュボードの構築に関する方法を記載していく予定。

これらの記事が、みなさまにとって参考になりそうでしたら「いいね！」をクリックして頂けますと幸いです。執筆の励みになります。😃

今後ともよろしくお願い致します。

シリーズとして連載しています。こちらもぜひどうぞ。

- [マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！](/articles/20160920/)
- [マネージャーがうれしいRedmineデータのEVM表示方法を公開します！！](/articles/20170119/)
- [マネージャーがうれしいRedmineデータのダッシュボード表示方法を公開します！！](/articles/20170510/)
- マネージャーがうれしいRedmineデータのグラフ表示方法を公開します！！（Metabase編）
