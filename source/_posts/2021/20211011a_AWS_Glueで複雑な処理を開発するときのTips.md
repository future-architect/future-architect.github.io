---
title: "AWS Glueで複雑な処理を開発するときのTips"
date: 2021/10/11 00:00:00
postid: a
tag:
  - AWS
  - Glue
  - SQL
  - Athena
  - Tips
category:
  - DataEngineering
thumbnail: /images/2021/20211011a/thumbnail.png
author: 藤田春佳
lede: "PySparkを使用したGlueジョブ開発のお話をします。ETLツールとして使用されるAWS Glueですが、業務バッチで行うような複雑な処理も実行できます。また、処理はGlueジョブとして、Apache Spark分散・並列処理のジョブフローに簡単に乗せることができます！"
---

<img src="/images/2021/20211011a/glue_python_spark.png" alt="" width="790" height="260" loading="lazy">

## はじめに

こんにちは。TIGの藤田です。

[Python連載](/articles/20210927b/) の8日目として、PySparkを使用したGlueジョブ開発のお話をします。

ETLツールとして使用されるAWS Glueですが、業務バッチで行うような複雑な処理も実行できます。また、処理はGlueジョブとして、Apache Spark分散・並列処理のジョブフローに簡単に乗せることができます！

特に複雑な処理は、やや割高な開発エンドポイントは使用せず、ローカル端末で、しっかり開発・テストを行いたいですよね。そのためのローカル開発Tipsをご紹介します。

## 内容

1. [Glueジョブの開発と実行概要](#Glueジョブの開発と実行概要)
2. [Tip1: ローカル環境構築](#Tip1-ローカル環境構築)
3. [Tip2: PySpark, SparkSQL開発](#Tip2-pyspark-sparksql開発)
4. [Tip3: 単体テスト(pytest)](#Tip3-単体テスト-pytest)
5. [Tip4: データカタログどうする問題](#Tip4-データカタログどうする問題)

## Glueジョブの開発と実行概要

ローカル開発の前に、AWS Glueでのジョブ実行方法を簡単にお話します。複雑な処理をSparkジョブで実行するには、以下4ステップでOKです。

１）ジョブズクリプトを作成、S3に配置
２）ジョブ実行定義
３）「ワークフロー」によるジョブフロー定義
４）AWS Athenaを使った実行結果確認

３）のジョブフロー定義については、規模や構成によって他の方法を検討する余地が大きいですが、Glueの「ワークフロー」でも、以下のような機能は用意されています。

・画面GUIでのジョブフロー定義
・ジョブの並列実行、分岐、待合せ
・オンディマンド、スケジュール、EventBridgeイベントによるトリガ実行
・画面からの実行状態、結果、エラー確認、リトライ実行

４）について、[Athena](https://docs.aws.amazon.com/ja_jp/athena/latest/ug/what-is.html)は、標準的なSQLを使用してS3のデータを直接分析できるサービスです。Athenaのクエリ実行には、AWS Glueデータカタログ（DatabaseやTable）の登録が必要ですが、これはAthenaのクエリエディタにDDLを実行すると簡単に行えます（Glueのデータカタログ定義はTerraform等でも行えるので運用上は他の方法でもよいと思います）。

## Tip1: ローカル環境構築

[AWS公式にGlueコンテナが配布](https://aws.amazon.com/jp/blogs/big-data/developing-aws-glue-etl-jobs-locally-using-a-container/)されて、docker-composeによる環境構築が容易になりました。ローカル環境構築の詳細は、[AWS Glueの開発環境の構築(2021)](/articles/20210521a/)を参照ください。

## Tip2: PySpark, SparkSQL開発

Glueでは、3つのジョブタイプ、Python shell, Spark streaming, Spark script （Python, Scala）が選択できますが、今回はSpark script（PySpark, SparkSQL）を採用しました。[PySpark](https://spark.apache.org/docs/latest/api/python/index.html)は、[Apache Spark](http://spark.apache.org/)をPythonで呼出すライブラリです。[SparkSQL](https://spark.apache.org/sql/)は、Apache Sparkのモジュールの1つで、SQLとDataFrameによる構造化データの処理を可能にします。

複雑な業務処理の実装にも以下のメリットがありました。

- 構造化データ（Table）をメモリ上のDataFrameに取込み効率的に加工できる。
- データカタログ（Table定義）があれば、プログラム上データ取込用のモデル定義を別につくる必要がない。
- SparkSQLにより、複数ファイル（Table）の結合を含む、[標準的なSQLによる操作が可能](https://databricks.com/blog/2016/07/26/introducing-apache-spark-2-0.html)。
- SQL関数に含まれないPythonの関数やライブラリを使いたい場合にも、ユーザー定義関数 （UDF）を使えば、DataFrameの構造を維持したまま、特定のカラムに対してのみ処理を実行できる。

以下、2ファイル(2 Tables)を結合してユーザー定義関数処理をするスクリプト例です。

```python
import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.utils import getResolvedOptions
from pyspark.sql import functions as F
from pyspark.sql.types import DecimalType
from decimal import Decimal, ROUND_FLOOR, ROUND_HALF_UP, ROUND_CEILING


def round_fraction(target: Decimal, meth: str, pos: str):
    p = {
        "1": "1.",
        "2": "0.1",
        "3": "0.01",
        "4": "0.001",
    }
    methods = {
        "1": ROUND_FLOOR,
        "2": ROUND_HALF_UP,
        "3": ROUND_CEILING,
    }
    if meth is None or pos is None or meth == "" or pos == "":
        return target
    return target.quantize(Decimal(p[pos]), rounding=methods[meth])


udf_round_fraction = F.udf(round_fraction, DecimalType(10, 3))


def exec_sample(glueContext, spark, input_dir, output_dir):
    data = ["calc_source", "attributes"]
    for d in data:
        p = f"s3://{input_dir}/{d}/"
        # Sample to convert DynamicFrame to DataFrame then create temporary view
        glueContext.create_dynamic_frame.from_options(
            connection_type="s3",
            connection_options={"paths": [p]},
            format="parquet",
        ).toDF().createOrReplaceTempView(d)

    # SQL sample to join two tables
    wk_main = spark.sql("""
        SELECT
            src.id
        ,	src.number1
        ,	src.number2
        ,	src.position
        ,	src.method
        ,	src.group
        ,	att.attribute1
        FROM
            calc_source	src
        INNER JOIN
            attributes	att
        ON
            src.group	=	att.group
        WHERE
            src.number1	IS	NOT NULL
        AND	src.number2	IS	NOT NULL
        AND	src.number2	<>	0
    """)

    # UDF sample to calculate fractions
    wk_main = wk_main.withColumn(
        "calc_result",
        udf_round_fraction(
            F.col("number1") / F.col("number2"),
            F.col("method"),
            F.col("position"))
    )

    wk_main.write.mode("overwrite").format("parquet").save(f"s3://{output_dir}/sample_out/")


def main():
    args = getResolvedOptions(sys.argv, ["input_dir", "output_dir"])
    glueContext = GlueContext(SparkContext.getOrCreate())
    spark = glueContext.spark_session
    # Exec
    exec_sample(glueContext, spark, args["input_dir"], args["output_dir"])


if __name__ == '__main__':
    main()

```

## Tip3: 単体テスト(pytest)

ローカル環境での、PySparkスクリプトの単体テストは[pytest](https://github.com/pytest-dev/pytest/)で可能です。方法は[AWS Glueの単体テスト環境の構築手順](/articles/20191206/)を参照ください。実行結果のアサーションをファイル単位で行う場合は、DataFrameを比較できるツール（[chispa](https://github.com/MrPowers/chispa)など）を利用すると便利です。

## Tip4: データカタログどうする問題

データカタログは、データのファイルシステムをDatabaseとTableのように定義して管理する[Hive](https://hive.apache.org/index.html)メタストア同様の機能を担っています。

データカタログは、上記Glueコンテナのデフォルト設定では呼出すことができず、CSVファイルを読込む際にデータ型定義ができない課題がありました。

CSVファイルをDataFrameに読込む際に、schema定義をかいてやることはできますが、ローカル環境でしか使わないコードを、対象データのカラムすべてに対して書くのは嬉しくありません。AWS環境のGlueデータカタログの定義と二重管理にもなります。そこで、2パターンの解決策をご紹介します。

- Tip4-1. AWS環境に接続してGlueデータカタログを使用する
- Tip4-2. CSVではなく、Parquetファイルを使う

### Tip4-1. AWS環境に接続してGlueデータカタログを使用する

AWSアカウントの使える状態であれば、AWS環境のS3からGlueデータカタログを使用してファイルを読込むのが楽です。ローカル環境のGlueコンテナ内から、以下のようなコードが実行できます。

```python
from pyspark.context import SparkContext
from awsglue.context import GlueContext


glueContext = GlueContext(SparkContext.getOrCreate())
df = glueContext.create_dynamic_frame.from_catalog(
    database="sampledb",
    table_name="departuredelays",
    push_down_predicate="(any=='sample')",
).toDF()

df.write.mode("overwrite").format("parquet").save(
    "s3://bucket_name/departuredelays_out/any=sample/"
)
```

このスクリプト実行のためには、DatabaseとTable定義を予めGlueデータカタログに登録しておく必要があります。Athenaから登録するには以下のようなDDLを使用します。読込みファイルがCSVの場合です。

```sql
CREATE DATABASE sampledb
  LOCATION 's3://bucket_name/';


CREATE EXTERNAL TABLE sampledb.departuredelays (
  `date` string,
  `delay` int,
  `distance` int,
  `origin` string,
  `destination` string)
PARTITIONED BY (
  `any` string)
ROW FORMAT SERDE
  'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ('separatorChar'=',', 'escapeChar'='\\', 'quoteChar'='\"')
STORED AS INPUTFORMAT
  'org.apache.hadoop.mapred.TextInputFormat'
OUTPUTFORMAT
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION
  's3://bucket_name/departuredelays'
TBLPROPERTIES (
  'has_encrypted_data'='false',
  'skip.header.line.count'='1'
  )
;
```

おまけですが、出力結果をAthenaから確認するためには、出力ディレクトリのTable定義を登録します。今回出力ファイルはParquetなので、DDLは以下のようになります。

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS sampledb.departuredelays_out (
  `date` string,
  `delay` int,
  `distance` int,
  `origin` string,
  `destination` string)
PARTITIONED BY (
  `any` string)
ROW FORMAT SERDE
  'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
STORED AS INPUTFORMAT
  'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
OUTPUTFORMAT
  'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
LOCATION
  's3://bucket_name/departuredelays_out'
TBLPROPERTIES (
  'has_encrypted_data'='false'
  )
;
```

</br>
</br>

### Tip4-2. CSVではなく、Parquetファイルを使う

AWS環境の使えない状態でも、ファイルをParquetフォーマットで作成できれば、型の保存された状態で読込ができます。Parquetは、CSVよりも保存性や読書き性能の面で有利です（[Apache Parquetについて](https://databricks.com/jp/glossary/what-is-parquet)）。

Parquetファイルは直接開いて中が確認できないですが、上記のようにAthenaで確認できますし、ローカル環境でも、Jupyter Notebook上でDataFrameに読込んでschema表示・データ表示できます。

## まとめ

AWS Glueで複雑な処理を開発するときのTipsをご紹介しました。複雑なロジック開発とテストにAWS Glue環境を用いるのは費用面で不利なので、ぜひローカル環境を活用したいところです。特にファイルI/Oについては、ローカル環境とAWS環境で同じコードで処理できるようにするのがポイントだと思います。Glueジョブ開発の一助になれば幸いです。

## 参考リンク

- [AWS Glue Data CatalogでCSVを扱う - フューチャー技術ブログ](/articles/20211006a/)
  - AWS環境で、Glueデータカタログを使ってCSVファイルを扱う方法が紹介されています。
