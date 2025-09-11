---
title: "PostgreSQLのPub/Sub機能とJavaのクライアント実装"
date: 2024/06/28 00:00:00
postid: a
tag:
  - PostgreSQL
  - Java
category:
  - DB
thumbnail: /images/2024/20240628a/thumbnail.png
author:  柳原光佑
lede: "Pub/Sub型のメッセージングアーキテクチャを採用するにあたっては、kafkaなどのブローカーミドルウェアや、Amazon SNS、Google Cloud Pub/Subなどのマネージドサービスを利用するケースが多いかと思います。ところでPostgreSQLでも実はPub/Subができます。すでに業務でPostgreSQLを使っていれば、新たにPub/Subブローカーを構築しなくても、疎結合なシステム間通信を簡易的に実現できます。"
---

本記事は[「珠玉のアドベントカレンダー記事をリバイバル公開します」](/articles/20240617a/)企画のために、[以前Qiitaに投稿した記事](https://qiita.com/ksky/items/8933348de5af00e45ffe)を改訂したものです。

## はじめに

Pub/Sub型のメッセージングアーキテクチャを採用するにあたっては、kafkaなどのブローカーミドルウェアや、Amazon SNS、Google Cloud Pub/Subなどのマネージドサービスを利用するケースが多いかと思います。ところでPostgreSQLでも実はPub/Subができます。

すでに業務でPostgreSQLを使っていれば、新たにPub/Subブローカーを構築しなくても、疎結合なシステム間通信を簡易的に実現できます。

本記事ではこの機能の紹介と、Pub/SubクライアントをJavaで実装する場合の選択肢、考慮点を示しています。
※実行環境はPostgreSQL 16.2とJava 21です
※データベースの文字コードはUTF-8としています

# NOTIFY/LISTEN

PostgreSQLのPub/Sub機能に関連するクエリは次の3つです。

* [NOTIFY](https://www.postgresql.org/docs/current/sql-listen.html)（Publishを実行）
  * 構文：`NOTIFY channel [ , payload ]`
  * 同じ機能の関数として`pg_notify`も用意されている
* [LISTEN](https://www.postgresql.org/docs/current/sql-listen.html)（Subscribeを開始）
  * 構文：`LISTEN channel`
* [UNLISTEN](https://www.postgresql.org/docs/current/sql-unlisten.html)（Subscribeを終了）
  * 構文：`UNLISTEN { channel | * }`

基本的な使い方と挙動を見ていきます。

```sql チャネル"foo"のSubscribeを開始
LISTEN foo;
```

```sql チャネル"foo"に"hello"というデータをPublish
NOTIFY foo, 'hello';
-- または
SELECT pg_notify('foo', 'hello');

-- "foo"をSubscribe済みのセッションには次の通知が届く
-- Asynchronous notification "foo" with payload "hello" received from server process with PID 14728.
```

```sql payload無しの通知も可能
NOTIFY foo;

-- Asynchronous notification "foo" received from server process with PID 14728.
```

```sql チャネル"foo"のSuscribeを終了する
UNLISTEN foo;
```

とてもシンプルですね。
続いて、本機能の主な仕様を挙げつつ利用時の考慮点を示します。
詳細は[公式ドキュメント](https://www.postgresql.jp/document/current/index.html)をご覧いただければと思います。

## チャネル

* チャネルはPub/Sub通信する際のキーとなる任意の文字列です。LISTEN対象のチャネルとNOTIFYを実行するチャネルが異なるとデータのやり取りができません。
* 1つのセッションで複数のチャネルをLISTENできます。
* チャネルに指定できる文字は、ASCIIの場合英数字とアンダースコア(_)が使用できます。大文字/小文字は区別されません。なお、マルチバイト文字も使用できることを確認しています。

    ```sql:マルチバイト文字のチャネルに通知
    NOTIFY こんにちは, '世界';

    -- Asynchronous notification "こんにちは" with payload "世界" received from server process with PID 14728.
    ```

* 63バイトを超えるチャネルは登録できません。超えた分は切り捨てて処理されます。この制限はテーブルなど他のデータベースオブジェクトとも共通しています。

## スコープ

* Pub/Subを行うDBセッションは、同一データベースに接続し、かつ同じチャネルを通知対象としなければいけません。
* データベースが同じであれば、スキーマが異なっていても通知できます。!

<img src="/images/2024/20240628a/68747470733a2f2.png" alt="68747470733a2f2.png" width="1200" height="579" loading="lazy">

## ペイロードのデータ型・サイズ

* ペイロードに乗せられるデータはテキストのみで、バイナリは送受信できません。
* バイナリデータを乗せる場合は`encode`関数でテキスト形式に変換したり、呼出元アプリでJSON文字列等にシリアライズしてあげる必要があります。
* ペイロードのサイズ上限は8000バイト未満で、これを超えると次のエラーが返ります。

    ```text
    ERROR:  payload string too long
    SQL state: 22023
    ```

## トランザクション

* トランザクション内でNOTIFYしたデータは、COMMITしたタイミングで、LISTENしたセッションに通知されます。ROLLBACKすると通知されません。
* トランザクション内でNOTIFYしたデータの中で、ペイロードが同一のものはまとめられます。送信順序は保証されます。

```sql まとめられた通知
BEGIN;
NOTIFY foo, 'a';
NOTIFY foo, 'a';
NOTIFY foo, 'a';
NOTIFY foo, 'b';
NOTIFY foo, 'c';
COMMIT;

-- Asynchronous notification "foo" with payload "a" received from server process with PID 14728.
-- Asynchronous notification "foo" with payload "b" received from server process with PID 14728.
-- Asynchronous notification "foo" with payload "c" received from server process with PID 14728.
```

## 未処理メッセージの蓄積サイズ

* DBインスタンスには、トランザクションが未完了なメッセージをメモリ上に溜めておくことが出来るNotificationキューを持っています。標準インストールの場合サイズは8GBで、使用量が半分になると警告ログが出力されます。
* トランザクションが終了するとキューデータがクリーンアップされます。ペイロードを目一杯使った場合およそ100万件で上限に掛かるため、適当な件数単位でCOMMITしましょう。
* Notificationキューの使用率は`pg_notification_queue_usage`関数で確認できます(0から1までの小数で表現)。

# JavaによるPub/Subクライアント実装

これまで記載したPub/Sub通信をJavaで実装するときのパターンを3種類紹介します。

## PostgreSQL JDBCドライバ

PostgreSQL本家のJDBCドライバを使った実装例です（本家の実装例は[こちら](https://jdbc.postgresql.org/documentation/server-prepare/#listen--notify)）。
Mavenを使う場合は以下の依存関係を追加します。

```xml pom.xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.3</version>
</dependency>
```

```java
// 事前にLISTEN用コネクションを作成しておく
private final org.postgresql.jdbc.PgConnection listenerConn = DriverManager.getConnection(URL, USERNAME, PASSWORD).unwrap(PgConnection.class);

/**
 * 通知の受信を開始します。
 *
 * @param channel チャネル
 */
private void startListen(final String channel) {
    try {
        try (var stmt = this.listenerConn.createStatement()) {
            stmt.execute("LISTEN " + channel);
            while (true) {
                var notifications = pgconn.getNotifications(10 * 1000);
                if (this.terminated) {
                    return;
                }
                if (notifications == null) {
                    continue;
                }
                for (var n : notifications) {
                    LOG.info("Received Notification: pid={}, channel={}, payload={}", n.getPID(), n.getName(), n.getParameter());
                }
            }
        }
    } catch (SQLException e) {
        LOG.error("exception thrown {}", e.getMessage());
    }
}

/**
 * PostgreSQLサーバに通知を行います。
 *
 * @param channel チャネル
 * @param payload メッセージペイロード
 */
private void notify(final String channel, final String payload) {
    try {
        var conn = DriverManager.getConnection(URL, USERNAME, PASSWORD).unwrap(PgConnection.class);
        var pstmt = conn.prepareStatement("select pg_notify(?, ?)");
        try (conn; pstmt) {
            pstmt.setString(1, channel);
            pstmt.setString(2, payload);
            pstmt.execute();
        }
        LOG.info("Notified: pid={}, channel={}, payload={}", pgconn.getBackendPID(), channel, payload);
    } catch (SQLException e) {
        LOG.error("exception thrown", e);
    }
}
```

* `PgConnection#getNotifications(int timeoutMillis)`を使うと、通知が来るまで指定の時間ここでブロックするため、ループで囲えばロングポーリング的なロジックになります。
* なお`NOTIFY`クエリでペイロードのパラメータバインドを試みると`org.postgresql.util.PSQLException`が出てしまうので代わりに`pg_notify`を実行しています。[^1]

## PGJDBC-NG

* [PGJDBC-NG](https://impossibl.github.io/pgjdbc-ng/)はJDBC4.2に準拠し、PostgreSQLの機能をより高度に使うことをめざして開発されているOSSです。

```xml pom.xml
<dependency>
    <groupId>com.impossibl.pgjdbc-ng</groupId>
    <artifactId>pgjdbc-ng</artifactId>
    <version>0.8.9</version>
</dependency>
```

```java
// 事前にLISTEN用コネクションを作成しておく
private final com.impossibl.postgres.api.jdbc.PGConnection listenerConn = DriverManager.getConnection(URL, USERNAME, PASSWORD).unwrap(PGConnection.class);

/**
 * 通知の受信を開始します。
 *
 * @param channel チャネル
 */
private void startListen(final String channel) {
    try {
        this.listenerConn.addNotificationListener(new PGNotificationListener() {
            @Override
            public void notification(final int pid, final String channel, final String payload) {
                LOG.info("Received Notification: {}, {}, {}", pid, channel, payload);
            }
        });
        try (var stmt = this.listenerConn.createStatement()) {
            stmt.execute("LISTEN " + channel);
        }
    } catch (SQLException e) {
        LOG.error("exception thrown {}", e.getMessage());
    }
}

// notify()は、PostgreSQL JDBCドライバと同様
```

ご覧の通り、こちらは通知受信時の動作をイベントリスナーの形で実装できます。
チャネルを指定してリスナーを登録することも可能です。

## R2DBC

[R2DBC](https://r2dbc.io/)は、リアクティブプログラミングの観点から新たに開発されたJDBCドライバです。
Reactive Streamsに完全準拠し、I/Oは完全にノンブロッキングであると謳っています。

```xml pom.xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>r2dbc-postgresql</artifactId>
    <version>1.0.5.RELEASE</version>
</dependency>
```

```java
// 事前に送受信用のコネクションを設定しておく
private Mono<PostgresqlConnection> receiver;
private Mono<PostgresqlConnection> sender;

var connFactory = new PostgresqlConnectionFactory(PostgresqlConnectionConfiguration.builder()
        .host("...")
        .port(5432)
        .username("...")
        .password("...")
        .database("...")
        .build());
this.receiver = connFactory.create();
this.sender = connFactory.create();

/**
 * 通知の受信を開始します。
 *
 * @param channel チャネル
 */
private void startListen(final String channel) {
    this.receiver.map(pgconn -> {
        return pgconn.createStatement("LISTEN " + channel)
                .execute()
                .flatMap(PostgresqlResult::getRowsUpdated)
                .thenMany(pgconn.getNotifications())
                .doOnNext(notification -> LOG.info("Received Notification: {}, {}, {}", notification.getProcessId(), notification.getName(), notification.getParameter()))
                .doOnSubscribe(s -> LOG.info("listen start"))
                .subscribe();
    }).subscribe();
}

/**
 * PostgreSQLサーバに通知を行います。
 *
 * @param channel チャネル
 * @param payload メッセージペイロード
 */
private void notify(final String channel, final String payload) {
    this.sender.map(pgconn -> {
        return pgconn.createStatement("NOTIFY " + channel + ", '" + payload + "'")
                .execute()
                .flatMap(PostgresqlResult::getRowsUpdated)
                .then()
                .doOnSubscribe(s -> LOG.info("Notified: channel={}, payload={}", channel, payload))
                .subscribe();
    }).subscribe();
}
```

R2DBCを使う際は、依存する[Project Reactor](https://projectreactor.io/)のAPIを全面的に使うことになります。

今回は簡単な説明にとどめますが、クエリを実行、結果をハンドリングし、指定のタイミングで動く付帯的なアクションを設定する、という一連のフローを構築して、最後にこのフローが動き出すように`subscribe()`を呼び出しています。`doOnNext()`で通知が届いたときのアクションを、`doOnSubscribe()`でsubscribeしたとき（クエリを実行するタイミング）のアクションを設定しており、ここでは単純にログ出力しています。
JavaのStream APIと似たスタイルで非同期・ストリーム処理を作る感じで、私も初見は面食らったのですが、こちらのページがとても勉強になりました。

* [ReactorでN+1問題な処理を実装してみた話](https://cero-t.hatenadiary.jp/entry/20171215/1513290305)
* [怖くないR2DBC](https://bufferings.hatenablog.com/entry/2018/11/18/102433)

# おわりに

PostgreSQLのNOTIFY/LISTENは[リリース9.0](https://www.postgresql.jp/document/9.4/html/release-9-0.html)で、待ち状態イベントの格納先が従来のシステムテーブルからメモリキューに代わり、通知と一緒にペイロードを送信できるようになったことで、おおよそ現在の形になりました。近年もリリース13.0で性能向上を遂げており、地味な機能ながら進化を続けているようです。

機能自体は古くから搭載されています[^2]がQiitaではこれまで記事化されていないため、社内の技術検証で得た情報整理も兼ねて記事化してみました。

[^1]: 公式ドキュメントにはNOTIFYのペイロードにはリテラル文字列を設定しなければならず、一方でpg_notifyには不定のチャネル、ペイロードに対応すると謳われているので、NOTIFYはパラメータバインドには対応していない模様です。

[^2]: NOTIFY/LISTENのリリースノートの初出は[1995年7月のリリース0.03のバグフィックス](https://www.postgresql.org/docs/release/0.03/#:~:text=*%20the%20LISTEN/NOTIFY%20asynchronous%20notification%20mechanism%20now%20work)なので、本当に最初期から搭載された機能だとわかります。
