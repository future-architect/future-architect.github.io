---
title: "S3 TablesのIceberg形式で、timestamptz型の登録に苦戦した話"
date: 2026/07/02 00:00:00
postid: a
tag:
  - S3
  - S3Tables
  - Iceberg
category:
  - Programming
thumbnail: /images/2026/20260702a/thumbnail.png
author: 鈴木風真
lede: "S3 Tablesという型があります。今回、このtimestamptz型でカラムを登録しようとしたとき、いろいろ面白い発見があったので、記事にしたいと思います。"
---

[データエンジニアリング連載](/articles/20260630a/)の3本目です。

# はじめに

こんにちは、フューチャーの鈴木風真です！

S3 Tables(Iceberg形式)にはtimestamptz(タイムゾーンつきタイムスタンプ)という型があります。今回、このtimestamptz型でカラムを登録しようとしたとき、いろいろ面白い発見があったので、記事にしたいと思います。

# timestamptzとは

timestamptzはApache Icebergにおける型の種類の一つで、タイムゾーン付きタイムスタンプと呼ばれます。その名の通り、「日本時間」などのタイムゾーン情報とともに時刻を保持できる型です。時差に左右されない世界中の「まさにあの瞬間！」という絶対的なタイミングを記録できる便利なデータ型です。

日本時間で書き込んでも別の国の時間で書き込んでも、内部的にはすべてUTC（協定世界時）に揃えて保存してくれるため、あとから時間を計算し直すような面倒な手間がかかりません。

# Athenaから登録することはできない！？

Athenaからtimestamptz型を含むCREATE文を書いてS3 Tablesを登録してみましょう。するとこんなエラーがでます。

<img src="/images/2026/20260702a/image.png" alt="image.png" width="1108" height="631" loading="lazy">

timestamp with timezoneに変えて実行してもうまくいきません。AWS公式サイトを確認してみると、以下の文言が。。。
>CREATE TABLE などの Athena Iceberg DDL ステートメントでサポートされているのは、Iceberg タイムスタンプ (タイムゾーンなし) のみですが、Athena を介してすべてのタイムスタンプ型をクエリできます。
[Athena の Iceberg テーブルでサポートされているデータ型](https://docs.aws.amazon.com/ja_jp/athena/latest/ug/querying-iceberg-supported-data-types.html)

つまり、AthenaではtimestamptzのSELECTはできるがCREATEはできないということです。(なんじゃそれ！)この時点で、AthenaでDDLを実行してテーブルを作成する選択肢はなくなりました。

調べてみると、AWS Glue経由でDDLを実行すると、timetamptz型も登録できるようです。DDL実行用のGlueジョブを作成するのは少々面倒でしたが、Glueを使えば、**DDLファイルの配置→配置をトリガーにDDLを実行** みたいなパイプラインを作るのもやりやすいかなと思い、Glueでやることにしました。

# Glue経由でDDLを実行

というわけで、簡単なDDL実行用のGlueジョブを作ってみました。

DDLファイルには複数のCREATE文を含む想定で、Glueジョブ側でステートメントごとにループ処理させるようにしました。既存のテーブルを登録しようとするとエラーになりますが、かといって```DROP TABLE IF EXISTS```みたいなことをやって事故るのは怖かったので、あえてそのままエラーになるようにしています。結果として、100行程度のシンプルなGlueジョブになりました。

```py
# ... (boto3やGlue、Spark関連の標準的なimport文は省略) ...

# 接続先のカタログ名・ネームスペース名・バケットARN
S3TABLES_CATALOG = "s3tables"
S3TABLES_NAMESPACE = "default"
S3TABLES_BUCKET_ARN = "<your-bucket-arn>"

def main() -> None:
    # ... (ジョブパラメータ取得・Glue/Sparkセッションの初期化処理は省略) ...
    # ※ ここでは変数 spark (SparkSession) と args が利用可能な状態とします

    # S3 Tables用のIcebergカタログをSparkに登録する
    spark.conf.set(
        f"spark.sql.catalog.{S3TABLES_CATALOG}",
        "org.apache.iceberg.spark.SparkCatalog",
    )
    spark.conf.set(
        f"spark.sql.catalog.{S3TABLES_CATALOG}.catalog-impl",
        "software.amazon.s3tables.iceberg.S3TablesCatalog",
    )
    spark.conf.set(
        f"spark.sql.catalog.{S3TABLES_CATALOG}.warehouse",
        S3TABLES_BUCKET_ARN,
    )

    # テーブルの親となるネームスペースを作成する（未作成の場合のみ）
    spark.sql(
        f"CREATE NAMESPACE IF NOT EXISTS {S3TABLES_CATALOG}.{S3TABLES_NAMESPACE}"
    )

    # S3からDDLファイルをテキストとして読み込む
    # ※ read_s3_file: boto3による単純なS3オブジェクト読み込み処理のため実装は省略
    ddl_content = read_s3_file(args["ddl_file_path"])

    # 読み込んだDDLをセミコロンで分割し、実行可能なステートメントのリストに変換
    statements = parse_ddl(ddl_content)
    print(f"[INFO] {len(statements)} 件のDDL文を実行します。")

    # ★ここがポイント: 分割したDDL文をループ処理で1つずつSparkSQLで実行する
    for i, stmt in enumerate(statements, start=1):
        spark.sql(stmt)
        print(f"[INFO] DDL ({i}/{len(statements)}) 完了")

    print("[INFO] 全DDL実行完了。")
    job.commit()


def parse_ddl(ddl_content: str) -> list[str]:
    """
    DDLテキストをセミコロンで分割し、空行やコメントのみの断片を除外して返す関数
    """
    return [
        stmt.strip()
        for stmt in ddl_content.split(";")
        if any(
            line.strip() and not line.strip().startswith("--")
            for line in stmt.strip().splitlines()
        )
    ]

# ... (if __name__ == "__main__": などの呼び出し部は省略) ...
```

次にDDLファイルを用意します。その前に、S3 Tables(Iceberg)と、Glue(Spark SQL)、AthenaのSQLにおけるtimestamp型の対応を確認します。

## Icebergのタイムスタンプ型対応表

| Icebergの型 | 説明 | Spark SQLのDDL | AthenaのDDL |
| :--- | :--- | :--- | :--- |
| **`timestamptz`** | タイムゾーンつきタイムスタンプ | **`TIMESTAMP`** | **定義不可**<br>（※Spark等で作成する必要あり） |
| **`timestamp`** | タイムゾーンなしタイムスタンプ | **`TIMESTAMP_NTZ`** | **`TIMESTAMP`** |

>[Apache Spark公式サイトを参考に作成](https://spark.apache.org/docs/latest/sql-ref-datatypes.html)

表で書くと分かりやすいですが、ここに大きなトラップがありますね！
つまり、

- Spark SQLで TIMESTAMP と書く → timestamptz（タイムゾーンあり）になる
- Athenaで TIMESTAMP と書く → timestamp（タイムゾーンなし）になる

という風に、**同じTIMESTAMPと指定しても真逆になる**ということです。

したがって、Spark SQLだとtimestamptzに相当するのが「TIMESTAMP」になるので、作成するSQLファイルでは単にTIMESTAMPと定義しておきます。

※当然「timestamptz」と定義すると「そんな型はない！」とエラーになります。

```sql
CREATE TABLE event_time (
  event_time timestamp COMMENT 'イベント日時'
)
USING iceberg
COMMENT 'イベント日次テーブル'
TBLPROPERTIES (
  'format-version'='2',
  'write_compression'='zstd'
);
```

このDDLファイルをS3に配置します。Glue側でSQLファイルパスをパラメータで指定してあげると、それをGlueが見に行って実行してくれるようにしました。

<img src="/images/2026/20260702a/image_2.png" alt="image.png" width="811" height="529" loading="lazy">

試しに実行してみます。すると1分ほどで成功します。簡単な処理でもGlueって結構遅いんですよね。

<img src="/images/2026/20260702a/image_3.png" alt="image.png" width="1104" height="671" loading="lazy">

実際にテーブルが作成されているかを見てみましょう。S3の画面から作成されたテーブルを見てみます。

<img src="/images/2026/20260702a/image_4.png" alt="image.png" width="1200" height="287" loading="lazy">

たしかに、テーブルが作成されていることを確認できます。しかしこれだと、型が確認できないので肝心のtimestamptz型が登録されているかが分かりません。そこで、Athenaから登録されたテーブルを見てみます。Athenaからはエディタの画面からテーブルのデータ型が確認できます。

<img src="/images/2026/20260702a/image_5.png" alt="image.png" width="366" height="502" loading="lazy">

よしよし、ってあれっ？timestamptzになってない！

# Athenaからtimestamptzは確認できない！？

どういうわけか、わざわざGlue経由でDDLを実行したのに、timestamptzで登録されていないです。しかし、SparkにおけるtimestampはIcebergだとtimestamptzになるはず、、もしかして、Athena画面上の表示の問題か？ ...というわけで、テーブル定義そのものを覗いてみることにしました。テーブルの実体は、S3のテーブルバケットから確認できるように、メタデータで定義されています。

<img src="/images/2026/20260702a/40600451-1f33-483c-885e-c4340cedc2c9.png" alt="40600451-1f33-483c-885e-c4340cedc2c9.png" width="1200" height="510" loading="lazy">

このファイルはダウンロードしてみることはできないので、AWSコマンドを叩いて覗くしかないです。以下コマンドを実行してみます。

```sh
aws s3 cp [テーブルメタデータARN] - | jq .
```

(jsonファイルの中身を取得し、コマンドライン上で見やすく表示させる簡単なコマンドです)
すると、こんな結果が返ってきます。

```json
"schemas": [
    {
      "type": "struct",
      "schema-id": 0,
      "fields": [
        {
          "id": 1,
          "name": "event_time",
          "required": false,
          "type": "timestamptz",
          "doc": "イベント日時"
        }
      ]
    }
  ],
```

いや、ちゃんとtimetamptzで登録されてる笑

逆にAthenaで登録したテーブルはしっかりタイムゾーン無しtimestamp型で登録されていることも確認できます。つまり、**Athenaではtimestamp型もtimestamptz型も、画面上では書き分けずに表示する仕様**っぽいです！ややこしいですね！

S3 Tablesの型定義がS3の画面上から確認できないなど、S3 Tablesは新しい技術だからか、まだ整備されていない感があるなと思いました。

# おわりに～AI時代の技術ブログについて～

この記事では、試行錯誤する中での驚きだったり笑いなどの**感情**を乗せて書くことを意識しました。

AIで答えがすぐに得られる時代に、技術ブログに求められることは何だろうかと考えたとき、それは**ファクトと人間味**なのではないかと思います。AIはハルシネーションも起こすし、結局のところ「言っているだけ」です。だからこそ、「実際にやってみた」というファクトが価値を持つと思います。その次に人間っぽい感想。筆者が何を考え、感じたのか。一読者としてはそれが見たいです。

今回の記事も、せんじ詰めれば「timestamptzはAthenaからだと登録できないが、Glue経由なら登録が可能。型の確認はメタデータを直接見る必要がある」というだけです。でも、それだけだと面白くない。その答えにたどり着くまでの、推理・発見・驚き・笑いといった、人間味のある試行錯誤の過程が、一読者としては読みたいです。

自分含め、トラブルシュートで「ググる」人はどんどん減っている気がします。それに伴いあらゆるWebサイトは徐々に見られなくなっている。そんな時代でも「フューチャーの技術ブログは読みたい」と思ってもらえる記事を出していきたいなと思っています。最後まで読んでいただきありがとうございました！
