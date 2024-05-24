---
title: "Difyで生成AIアプリケーション入門　後編：自作プログラムで機能追加して生成AIの指向性と精度を高める"
date: 2024/04/04 00:00:00
postid: a
tag:
  - 生成AI
  - Dify
  - ノーコード
  - "Anthropic Claude"
  - Java
category:
  - Programming
thumbnail: /images/20240404a/thumbnail.png
author: 前川喜洋
lede: "前編のチュートリアル1で作ったSQL生成チャットbotをベースに、セルフレビュー機能を追加し、間違ったSQL文や存在しないテーブルやカラムを使用しようとした時に自動でやり直すように改修します。"
---
## 概要

[前回](/articles/20240402a/)に引き続き [Dify](https://dify.ai/) と [Anthropic Claude](https://console.anthropic.com/dashboard) （OpenAI でも OpenRouter 経由の何かでもOK）を使って簡単に生成AIアプリケーションを構築する方法をご紹介します。

## チュートリアル3：セルフレビュー機能付きのSQL生成AIチャットbot

[前編のチュートリアル1](/articles/20240402a/)で作ったSQL生成チャットbotをベースに、セルフレビュー機能を追加し、間違ったSQL文や存在しないテーブルやカラムを使用しようとした時に自動でやり直すように改修します。

### DB用意

SQLの実行環境が必要になりますが、ちょうど Dify が使用している DB（Postgresql） サービスがあるので、これにホストOSからアクセスできるようにします。別でDBを用意できる場合はそちらでもOKです。

`docker-compose.yml` で以下の行をアンコメントしてください。
 
```yml docker-compoese.yml
    # uncomment to expose db(postgresql) port to host
    # ports:
    #   - "5432:5432"
```

これでホストOSから下記で接続できます。

* ホスト・ポート `localhost:5432` 
* DB名 `dify`
* ユーザ名 `postgres`
* パスワード `difyai123456`

適当に新しいスキーマを作り、DDLを流します。ここでは例としてスキーマ名 `test1` に[前編で例示したDDL](/articles/20240402a/)を実行した事にして話を進めます。

### レビュー機能を提供するアプリケーションを実装

「SQL文を受け取り」「実行結果の正否とエラーメッセージを返す」だけの簡単な Web API を備えたアプリケーションを開発します。このIN/OUTさえ守っていれば言語やフレームワークは問いませんが、この例では Java の Spring Boot アプリケーションにします。

<details><summary>pom.xml & Applicationクラス</summary>

```xml pom.xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>3.2.4</version>
		<relativePath/>
	</parent>
	<groupId>com.example</groupId>
	<artifactId>rdb-repository</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name>rdb-repository</name>
	<properties>
		<java.version>17</java.version>
	</properties>
	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springdoc</groupId>
			<artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
			<version>2.4.0</version>
		</dependency>
		<dependency>
			<groupId>jp.co.future</groupId>
			<artifactId>uroborosql</artifactId>
			<version>0.26.7</version>
		</dependency>
		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
			<version>42.7.3</version>
		</dependency>
		<dependency>
			<groupId>org.projectlombok</groupId>
			<artifactId>lombok</artifactId>
			<version>1.18.32</version>
			<scope>provided</scope>
		</dependency>
	</dependencies>

	<build>
		<plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
			</plugin>
		</plugins>
	</build>
</project>
```

```java RdbRepositoryApplication.java
package com.example.rdbrepository;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class RdbRepositoryApplication {

	public static void main(String[] args) {
		SpringApplication.run(RdbRepositoryApplication.class, args);
	}
}
```

</details>

```java RdbRepositoryController.java
@RestController
@RequestMapping("/api/rdb")
public class RdbRepositoryController {

    private static final Logger logger = LoggerFactory.getLogger(RdbRepositoryController.class);

    @PostMapping("/sql_review")
    public SqlReviewResponse sqlReview(@RequestParam String query) {
        SqlConfig config = UroboroSQL.builder("jdbc:postgresql://localhost:5432/dify?currentSchema=test1", "postgres", "difyai123456")
                .build();

        try (SqlAgent agent = config.agent()) {
            agent.queryWith(query).collect(); // ⛔受け取ったSQL何でも実行するので実験環境以外で真似しない事😱
            logger.info(query);
            return new SqlReviewResponse().setSuccess(true);
        } catch (Exception e) {
            logger.error(e.getMessage(), e);
            return new SqlReviewResponse().setErrorMessage(e.getMessage());
        }
    }

    @Data
    @Accessors(chain = true)
    public static class SqlReviewResponse {
        private String errorMessage = "";
        private boolean isSuccess = false;
    }
}
```

OpenAPI (Swagger) 準拠のスキーマが必要になります。上の例では `dependency` に `springdoc-openapi-starter-webmvc-ui` を加えているのでアプリケーション起動後に [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs) に勝手に生成されています。

### 作ったアプリケーションをDifyにツールとして登録

（先ほど作ったアプリケーションは起動してリクエストを受け付ける状態にしておいてください。）

画面上部のメニュー右端の[ツール](http://localhost/tools?category=api)をクリックし、左上の「カスタムツールを作成する」をクリックします。

<img src="/images/20240404a/image.png" alt="" width="573" height="143" loading="lazy">

名前は適当につけて、APIのスキーマは手動でコピペするか、（Dockerの設定でホスト名 `host.docker.internal` を有効にしているなら） [http://host.docker.internal:8080/v3/api-docs](http://host.docker.internal:8080/v3/api-docs) 等を使ってインポートします。ここで念のためテストして通れば準備OKです。保存してください。

<img src="/images/20240404a/image_2.png" alt="" width="581" height="694" loading="lazy">

<img src="/images/20240404a/image_3.png" alt="" width="450" height="362" loading="lazy">

### AIアプリケーションを開発

チュートリアル2と同様、スタジオ→新しいアプリを作成する→アシスタント で新しいアプリケーションを作成し、アシスタントタイプをエージェントアシスタントにします。

画面中央のツールの「+追加」をクリックし「カスタム」を選択すると、先ほど登録した自作ツールが表示されているので選択して「追加」ボタンをクリックします。

<img src="/images/20240404a/image_4.png" alt="" width="588" height="228" loading="lazy">

「手順」はチュートリアル2の内容に1行追加し、ツールを使うように指示します。変数 `{{DDL}}` `{{DataModelDescriptions}}` は前回同様「段落」に変更するのをお忘れなく。


````
You can behave as an expert of database expert. Provide a clear answer to the main purpose of the order. Omit preamble, phase, and repeating the order.

DDL:
```
{{DDL}}
```
Data model descriptions:
```
{{DataModelDescriptions}}

Generated SQL must be validated using the tool `sqlReview`, then respond only with the SQL that passed the inspection.
````

### 動作確認

チュートリアル2で使用したDDLとデータモデル概要を設定しつつ、「全売上金額を合計するSQL」のようにごく単純な要件でテストすると、ツールを使用してから回答する様子が確認できます。

<img src="/images/20240404a/image_5.png" alt="" width="436" height="451" loading="lazy">

ところが、少し複雑な要求に変更すると途端に回答が破綻します。

<img src="/images/20240404a/image_6.png" alt="" width="820" height="645" loading="lazy">

出力をよく見ると、　`"action_input": " ~ "}` の中身が改行付きのSQL文のため、JSONとして破綻しています。 `{"action": $TOOL_NAME, "action_input": $ACTION_INPUT}` の部分が（ReAct方式での）ツール呼び出しのキモなので、この部分に異常があると上手くツールを使用できないようです。

プロンプトに「SQLは1行に纏めよ」と付け加えれば動作はするのですが……。Function Calling 方式を指定できないモデルでは現状スマートな解決策は無さそうです。 [^1]

<img src="/images/20240404a/image_7.png" alt="" width="827" height="259" loading="lazy">

さて、SQLのレビューに失敗した場合はどうなるのか？少し意地悪をして、変数 `DDL` をオプション扱いにして、空欄にして実行してみます。

<img src="/images/20240404a/image_8.png" alt="" width="608" height="147" loading="lazy">

<img src="/images/20240404a/image_9.png" alt="" width="821" height="872" loading="lazy">

本来なら「カラム名が分からないから答えられない」と回答させるようコンテキストで誘導するのがベストな場面ではありますが、ともあれこれでセルフレビューによりAIが試行錯誤する様子を確認できました。

### このツールの改善アイデア

ここまでの試行の延長として、レビューの質を高めるために例えば次のようなアイデアが挙げられます。よければチャレンジしてみてください。

* 生成されたSQLのSELECT結果を返して「要件通りの検索結果が全パターン・全カラム抽出できたか」「算出項目の数値が期待値通りか」を検証させる
* 実行計画を返して「最大のパフォーマンスが出る結合順序・条件を指定できたか」を考えさせる

また、折角生成AIの領域とプログラマブルな領域に接点が出来たのだから、生成AIから自作プログラムが呼ばれた時のパラメータとそれへの返り値をDBに登録して、「どんな要求を受けた時にどんなSQLが生成されて、それがどう成功(or失敗)したか」を記録する事で後々分析したりAIの教育データとして使うといった事も考えられます。

## まとめ

Dify を使ってノーコードで生成AIを使ったアプリケーションを開発する方法と、従来型のアプリケーションとの連携方法について入門する所までご紹介してきました。入門とは言えある程度までの規模の問題解決の手段としては充分実用レベルになると思います。

が、これを例えばエンタープライズシステム開発など大規模な領域で活用しようと思うとすぐさま「膨大なデータモデルや業務要件を全て詰め込むとコンテキストが飽和する・トークン数が爆発する」といった問題に突き当たります。

RAG（ユーザが入力したプロンプトをAIに投げる前に、関連する情報を抜粋し追記してから生成AIに中継する仕組み）やモデル自体の追加学習によって解決するアプローチもありますがそれはまた別のお話で。

ちなみにただ”RAGとやらを作って使ってみたい”だけであれば Dify では画面上部メニューの「ナレッジ」で作成してアプリ側で「コンテキスト」に追加してやるだけなのですぐにでもできます。RAGの品質を問わなければの話ですが…今回はここまでです。

[^1]: 4月5日に、GPT の Function Calling に相当する機能 "Tool" が Claude に追加されました。 Dify も当日中(!)に対応しました。4月6日現在、まだバージョン付けされた Docker イメージは有りませんが、 `docker-compose.yaml` で `api`,`worker`,`web` の `image` のタグの部分を `main` にすれば一応動作確認はできますので自己責任でどうぞ。複数行に跨るSQLもちゃんとツールに渡されてますね！ <img src="/images/20240404a/image_10.png" alt="" width="759" height="446" loading="lazy">
