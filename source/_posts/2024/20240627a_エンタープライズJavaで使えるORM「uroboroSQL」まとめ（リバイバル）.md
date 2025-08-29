---
title: "エンタープライズJavaで使えるORM「uroboroSQL」まとめ（リバイバル）"
date: 2024/06/27 00:00:00
postid: a
tag:
  - Java
  - SQL
  - 2WaySQL
  - ORM
  - 永続化
  - uroboroSQL
category:
  - Programming
thumbnail: /images/2024/20240627a/thumbnail
author: 星賢一
lede: "筆者自身もコミッターとして関わるJavaのDB永続化ライブラリ「uroboroSQL」の紹介です。"
---
本記事は[「珠玉のアドベントカレンダー記事をリバイバル公開します」](/articles/20240617a/)企画のために、[以前Qiitaに投稿した記事](https://qiita.com/hoshi-k/items/51b57d485b3e51836539)を7年ぶりに改訂したものです。

---

筆者自身もコミッターとして関わるJavaのDB永続化ライブラリ「uroboroSQL」の紹介です。

<img src="/images/2024/20240627a/uroboroSQL.png" alt="" width="1200" height="288" loading="lazy">

https://github.com/future-architect/uroborosql

# はじめに

エンタープライズシステム開発では、まだまだJavaで作られていることが多く、システム特性上、やはりRDBを利用するケースが多いですよね。

[Amazon Aurora](https://aws.amazon.com/jp/rds/aurora/)や[Cloud Spanner](https://cloud.google.com/spanner/?hl=ja)といったプロダクトに注目が集まるのも、時代の変化とともにDBも並列分散型でスケールアウトはしたいけれども、トランザクションもSQLも使いたいというCAP定理を覆す特徴を持っていることが要因だと思います。

2016/12/24に[クリスマス・イブにCockroachDBに負荷をかけてみる](https://qiita.com/hoshi-k/items/cf0ce018db62de9291dc)という記事を投稿したのですが、このCockroachDBもそんな理想を追い求めるプロダクトで、RDBでNoSQLのメリットを教授したいニーズはもはやエンジニアが切望する夢なんですね✨️

::: note info
*2024年6月追記*
現在では、TiDB、yugabyteDBなどの選択肢も増えました。
CockroachDBもしぶとく生き残っていて何よりです。
:::

# JavaとRDBの歴史

2000年代前半にJavaで作られたシステムは、JDBCのAPIをそのまま利用することも多かったのですが、その後、Hibernate、iBatis(現在のMyBatis)、SeaserプロジェクトのS2Daoなどをはじめとして、O/Rマッパー(O/Rマッパ)が開発され、利用されるようになりました。

その後、2006年にJPA(Java Persistence API)の1.0がJava標準の永続化フレームワークとして策定され、2009年にJPA2.0、2013年にJPA2.1と、Java SEでも利用はできるのですが、Java EEのEJBと共に進化を続けているという状況ですね。

なお、2017年時点のライブラリ比較については、[2017年度 Java 永続化フレームワークについての考察(1)](https://qiita.com/shiroma_yuki/items/8d434862bba072bff264)の記事が非常に参考になります（残念ながらこれから紹介するuroboroSQLは入ってません😢）。

::: note info
*2024年6月追記*
執筆から6年半ほど経ち、改めて調査してみましたが、大きな変化はないように思います。

ここ数年でアプリケーションフレームワークの領域は、Spring Boot以外に、Quarkus、Micronautのようなマイクロサービス、コンテナネイティブ、ネイティブビルド最適化されたものが登場していますが、O/Rマッパは独立して選定されているように感じます。
（SpringBootの場合、王道的にSpring Data JPAを選定しているケースも多いとは思います）
:::

# uroboroSQLとは

uroboroSQLは、JavaにおけるDB永続化ライブラリの1つであり、基本的にはJavaからSQLを生成することよりも、SQLに足りないところをJavaで補うアプローチを採用しています。

もちろん、1レコードのINSERT/UPDATE/DELETEでSQLをいちいち書くのも辛いので、O/RマッパとしてのAPIも提供しています。

2017年にOSSとして公開後も、社内で脈々と使い続け、都度フィードバックを受けて、2024年6月現在までバージョンアップを継続しています。

## 特徴的な機能

### 開発時に便利なREPL機能搭載

2Way-SQLでの開発時にビルド不要で即試すことが可能です。

<a href="https://asciinema.org/a/122312" rel="nofollow noopener" target="_blank">
<img src="/images/2024/20240627a/asciicast.png" alt="asciicast" width="1200" height="558" loading="lazy">
</a>

### カバレッジレポート

SQL文の条件分岐を集計してカバレッジレポートを行うことが可能です。

<img src="/images/2024/20240627a/coverage.png" alt="" width="1200" height="1133" loading="lazy">

## その他の特徴

| 項目              | uroboroSQLの対応                |
|-------------------|-------------------------------|
| ライセンス        | MIT                           |
| 体制              | OSS                           |
| latest            | v0.26.8 (2024/05)                       |
| SQL外部化         | ○                             |
| DSL               | ×                             |
| Java              | 8<=                           |
| Stream Lamdba対応 | ○                             |
| エンティティ自動生成 | ○                              |
| 区分値対応        | ○（列挙体、定数クラスいずれも可）     |
| ストアドプロシージャ呼出    | ○                        |
| ResultSetのカスタマイズ  | ○                        |
| Oracle            | ○                             |
| DB2               | -                             |
| MySQL             | ○                             |
| PostgreSQL        | ○                             |
| MariaDB           | -                             |
| MS-SQL            | ○                             |
| H2                | ○                             |
| Derby             | ○                             |
| Sybase            | -                             |
| SQLite            | ○                             |
| 依存（必須）         | slf4j-api                     |
| 依存（任意）         | ognl,spring-expression,jline,jansi,logback-classic |

※2024/06/25時点最新バージョンとなるv0.26.8時点

# uroboroSQLのコードサンプル

さて、ライブラリを理解するには、利用時にどんな実装になるのか見るのが手っ取り早いですよね。
というわけで、よく利用する実装をサンプルとして、まとめました。

2017年の初版執筆時点では、公式ドキュメントよりも豊富だと思っていましたが、2024年時点では公式ドキュメントが充実していますので、是非こちら↓もご覧ください。
https://future-architect.github.io/uroborosql-doc/

## 接続

```java
SqlConfig config = UroboroSQL.builder("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1", "sa", "sa").build();
```

## トランザクション

| トランザクションタイプ | トランザクション有り                                                                                                                                 | トランザクションなし                       |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| required               | トランザクション内で処理を実行                                                                                                                       | 新たなトランザクションを開始して処理を実行 |
| requiresNew            | 既存のトランザクションを停止し、新たなトランザクションを開始して処理を実行。<br>トランザクションが終了すると停止していたトランザクションを再開させる | 新たなトランザクションを開始して処理を実行 |

```java
try (SqlAgent agent = config.agent()) {
  // 
  agent.required(() -> {
    // insert/update/delete
  });

  agent.requiresNew(() -> {
    // insert/update/delete
  });
}
```

## SQLファイルインタフェース（2way-SQL）

```sql department/select_department.sql
SELECT /* _SQL_ID_ */
    DEPT.DEPT_NO    AS  DEPT_NO
,   DEPT.DEPT_NAME  AS  DEPT_NAME
FROM
    DEPARTMENT  DEPT
WHERE
    1               =   1
/*IF SF.isNotEmpty(dept_no)*/
AND DEPT.DEPT_NO    =      /*dept_no*/1
/*END*/
/*IF SF.isNotEmpty(dept_name)*/
AND DEPT.DEPT_NAME  LIKE   '%' || /*dept_name*/'' || '%'
/*END*/

```

```sql department/insert_department.sql
INSERT /* _SQL_ID_ */
INTO
    DEPARTMENT
(
    DEPT_NO
,   DEPT_NAME
) VALUES (
    /*dept_no*/1
,   /*dept_name*/'sample'
)
```

```sql department/update_department.sql
UPDATE /* _SQL_ID_ */
    DEPARTMENT  DEPT
SET
    DEPT.DEPT_NAME      =   /*dept_name*/'sample'
    DEPT.LOCK_VERSION   =   DEPT.LOCK_VERSION   +   1
WHERE
    DEPT.DEPT_NO        =   /*dept_no*/1
AND DEPT.LOCK_VERSION   =   /*lock_version*/0
```

```sql department/delete_department.sql
DELETE /* _SQL_ID_ */
FROM
    DEPARTMENT  DEPT
WHERE
    DEPT.DEPT_NO    =   /*dept_no*/1
```

> S2Dao等と同じ文法で、SQL内でコメント標記で分岐を記述することができます。

### SELECT(リスト取得)

```java
try (SqlAgent agent = config.agent()) {
  List<Map<String, Object>> deptList =
    agent.query("department/select_department")
      .param("dept_name", "retail")
      .collect();
}
```

### SELECT(Stream取得、Map型)

```java
try (SqlAgent agent = config.agent()) {
  Stream<Map<String, Object>> depts =
    agent.query("department/select_department")
      .param("dept_name", "retail")
      .stream();
}
```

### SELECT(Stream取得、モデル型)

```java
try (SqlAgent agent = config.agent()) {
  Stream<Department> depts =
    agent.query("department/select_department")
      .param("dept_name", "retail")
      .stream(Department.class);
}
```

### SELECT(1件取得、Map型、取得できない場合例外)

```java
try (SqlAgent agent = config.agent()) {
  Map<String, Object> dept =
    agent.query("department/select_department")
      .param("dept_no", 1001)
      .first();
}
```

### SELECT(1件取得、モデル型、取得できない場合例外)

```java
try (SqlAgent agent = config.agent()) {
  Department dept =
    agent.query("department/select_department")
      .param("dept_no", 1001)
      .first(Department.class);
}
```

### SELECT(1件取得、Map型、Optional)

```java
try (SqlAgent agent = config.agent()) {
  Map<String, Object> dept =
    agent.query("department/select_department")
      .param("dept_no", 1001)
      .findFirst()
      .orElse(null);
}
```

### SELECT(1件取得、モデル型、Optional)

```java
try (SqlAgent agent = config.agent()) {
  Department dept =
    agent.query("department/select_department")
      .param("dept_no", 1001)
      .findFirst(Department.class)
      .orElse(null);
}
```

### SELECT(1件のみ取得、モデル型、取得できない場合と2件以上取得した場合に例外)

```java
try (SqlAgent agent = config.agent()) {
  Department dept =
    agent.query("department/select_department")
      .param("dept_no", 1001)
      .one(Department.class);
}
```

---

### INSERT/UPDATE/DELETE

```java
try (SqlAgent agent = config.agent()) {
  agent.required(() -> {
    // insert
    agent.update("department/insert_department")
      .param("dept_no", 1001)
      .param("dept_name", "sales")
      .count();
    // update
    agent.update("department/update_department")
      .param("dept_no", 1001)
      .param("dept_name", "HR")
      .count();
    // delete
    agent.update("department/delete_department")
      .param("dept_no", 1001)
      .count();
  });
}
```

### INSERT/UPDATE/DELETE(バッチ実行)

```java
List<Map<String, Object>> inputList = new ArrayList<>();
// 中略

try (SqlAgent agent = config.agent()) {
  agent.required(() -> {
    // default configuration
    agent.batch("department/insert_department")
      .paramStream(inputList.stream())
      .count();

    // custom configuration
    agent.batch("department/insert_department")
      .paramStream(inputList.stream())
      .by((ctx, row) -> ctx.batchCount() == 100)  // 100件毎にSQL実行
      .batchWhen((agent, ctx) -> agent.commit())  // SQL実行が成功したらコミットする
      .errorWhen((agent, ctx, ex) -> {
        // 例外が発生したらログ出力する
        log.error("error occured. ex:{}", ex.getMessage());
      })
      .count();
  });
}
```

## DAOインタフェース

下記のようなモデルクラスがある前提とします。

```java
@Data
@Table(name = "DEPARTMENT")
public class Department {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private int deptNo;
  private String deptName;
  private String location;

  @Version
  private int lockVersion = 0;
}
```

- `@Id/@GeneratedValue`が付与されたフィールドはDBの自動採番を利用することをマークします。
- `@Version`が付与されたフィールドは楽観ロック用のバージョン情報としてuroboroSQLが認識し、UPDATE時にはSET句で+1され、WHERE句の検索条件に追加されてSQLを発行し、更新件数が0の場合に`OptimisticLockException`を発生させます。

### SELECT(主キー検索)

```java
try (SqlAgent agent = config.agent()) {
  Department dept =
      agent.find(Department.class, 1001).orElse(null);
}

```

### SELECT(条件指定検索、ソート順、悲観ロック)

```java
try (SqlAgent agent = config.agent()) {
  // dept_no = 1 のレコードをList<Department>で取得
  List<Department> deptList = agent.query(Department.class)
    .equal("dept_no", 1)
    .collect();

  // dept_no = 10 又は 20 のレコードをList<Department>で取得
  List<Department> deptList = agent.query(Department.class)
    .in("dept_no", 10, 20)
    .collect();

  // dept_name like '%Sales%' のレコードをList<Department>で取得
  List<Department> deptList = agent.query(Department.class)
    .contains("dept_name", "Sales")
    .collect();

  // where句を直接記述(dept_name = 'Sales' and location = 'Boston')した結果をList<Employee>で取得
  List<Department> deptList = agent.query(Department.class)
    .where("dept_name =''/*deptName*/", "deptName", "Sales")
    .where("location = ''/*location*/", "location", "Boston")
    .collect();

  // ソート順
  List<Department> deptList = agent.query(Department.class)
    .desc("dept_no") // 昇順の場合は asc
    .collect();

  // 悲観ロック（SELECT FOR UPDATE)
  Department dept = agent.query(Department.class)
    .equal("dept_no", 1)
    .forUpdate() // forUpdateNoWaitやforUpdateWaitのバリエーションあり
    .collect();
}

```

---

### INSERT

```java
try (SqlAgent agent = config.agent()) {
  agent.required(() -> {
    Department hrDept = new Department();
    hrDept.setDeptNo(1002);
    hrDept.setDeptName("HR");
    agent.insert(hrDept);

    // 主キーを自動採番にしている場合に、主キーを取得したエンティティを取得する
    Department insertedDept = agent.insertAndReturn(hrDept);

    // バッチINSERT
    agent.inserts(
      agent.query(Department.class).equal("domestic", false).stream()
        .map(d -> {
          ForeignDepartment fd = new ForeignDepartment();
          fd.setDeptName(d.getDeptName());
          return fd;
        })
    );
  });
}

```

### UPDATE

```java
try (SqlAgent agent = config.agent()) {
  agent.required(() -> {
    Department dept =
        agent.find(Department.class, 1001).orElseThrow(Exception::new);
    dept.setDeptName("Human Resources");
    agent.update(dept); // 戻り値を返す場合はupdateAndReturnを利用する

    // バッチUPDATE
    agent.updates(
      agent.query(Department.class).stream()
        .map(d -> {
          d.location = "Chicago";
          return d;
        })
    );    
  });
}

```

### MERGE

PKによるレコードの検索を行い、レコードがない場合はINSERT、ある場合はUPDATEします。

```java
try (SqlAgent agent = config.agent()) {
  agent.required(() -> {
    Department hrDept = new Department();
    hrDept.setDeptNo(1002);
    hrDept.setDeptName("HR");
    agent.merge(hrDept); // 悲観ロックする場合はmergeWithLockingを利用する
  });
}
```

### DELETE / TRUNCATE

```java
try (SqlAgent agent = config.agent()) {
  agent.required(() -> {
    // DELETE
    Department dept =
        agent.find(Department.class, 1001).orElseThrow(Exception::new);
    agent.delete(dept); // 戻り値を返す場合はdeleteAndReturnを利用する

    // TRUNCATE
    agent.truncate(Department.class);
  });
}

```

# おわりに

この記事の初版公開から7年ぶりに更新しようとしたら、自分でも驚くほど機能追加されていて、よい振り返りとなりました。
OSSにしても社内プロダクトにしても、継続的にアップデートし続けるのが一番大変だなとしみじみ感じますね。

顧客向けの大規模エンタープライズ開発では、リリースしてから5-10年後にさくっと全部作り直しましょうというケースのほうが稀で、長く使い続けたいというニーズが強いため、下位互換性を失うにしても移行しやすいかどうかも重要なので、これからも継続の価値と意義を再認識して、アップデートを続けていきたいと思います。

# 参考：uroboroSQLドキュメント、ツール、サンプル

- uroboroSQL日本語ドキュメント
  - https://future-architect.github.io/uroborosql-doc/
- uroboroSQLの紹介 (OSC2017 Nagoya) #oscnagoya
  - https://www.slideshare.net/KenichiHoshi1/uroborosql-osc2017-nagoya-oscnagoya
- uroboroSQL ソースジェネレータ
  - https://github.com/shout-star/uroborosql-generator
- uroboroSQL サンプルCLIアプリケーション
  - https://github.com/future-architect/uroborosql-sample
- uroboroSQL サンプルWebアプリケーション(with Spring Boot)
  - https://github.com/shout-star/uroborosql-springboot-demo
