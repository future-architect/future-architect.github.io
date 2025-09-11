---
title: "RDS Proxy環境下でpg_hint_planを導入する際の注意点"
date: 2023/04/11 00:00:00
postid: a
tag:
  - RDS
  - AWS
  - 実行計画
category:
  - DB
thumbnail: /images/2023/20230411a/thumbnail.png
author: 辻大志郎
lede: "PostgreSQL を使用する際、最適な実行計画が選択されず、クエリの速度が遅くなることがあります。オプティマイザが最適な実行計画を選択できない理由はいくつかありますが、たとえばバッチ処理で大量のデータを投入した直後、統計情報と実データの乖離により、少ないデータに適した計画が大量のデータでは不適切になることがあります。このような場合、PostgreSQL の拡張モジュールである pg_hint_plan により実行計画を固定することで、チューニングが可能です。"
---
## はじめに

Technogoly Innovation Group 辻です。

PostgreSQL を使用する際、最適な実行計画が選択されず、クエリの速度が遅くなることがあります。オプティマイザが最適な実行計画を選択できない理由はいくつかありますが、たとえばバッチ処理で大量のデータを投入した直後、統計情報と実データの乖離により、少ないデータに適した計画が大量のデータでは不適切になることがあります。このような場合、PostgreSQL の拡張モジュールである [`pg_hint_plan`](https://pghintplan.osdn.jp/pg_hint_plan-ja.html) を用いた SQL ヒントや [`pg_dbms_stats`](https://pgdbmsstats.osdn.jp/pg_dbms_stats-ja.html) により実行計画を固定することで、チューニングが可能です。

私たちのユースケースでは `pg_hint_plan` を使った SQL ヒントによりクエリをチューニングしましたが、 Aurora PostgreSQL と RDS Proxy を使っている環境下で `pg_hint_plan` を導入する際にいくつかの問題が発生しました。本記事では [Amazon Aurora for PostgreSQL](https://aws.amazon.com/jp/rds/aurora/) と [Amazon RDS Proxy](https://aws.amazon.com/jp/rds/proxy/) 環境下で `pg_hint_plan` を導入した際の問題点、原因とその解決方法について紹介します。

以下に説明する環境の概要を示します。PostgreSQL のバージョンは 13.7 、`pg_hint_plan` のバージョンは 1.3.7 です。なお、Aurora インスタンス上に構築したデータベースは `sampledb` としています。

<img src="/images/2023/20230411a/image.png" alt="image.png" width="600" height="208" loading="lazy">

## `pg_hint_plan` の導入方法

導入方法は[pg_hint_plan 日本語マニュアルのインストール](https://pghintplan.osdn.jp/pg_hint_plan-ja.html#install)に記載がある手順が基本ですが、Aurora PostgreSQL 環境ではいくつか手順が異なります。以下の手順で `pg_hint_plan` を利用できるようにしました。

1.マスタユーザーで `sampledb` データベースにログインし、`pg_hint_plan` の拡張を有効にする

```sql
psql -h ${接続先インスタンス名} -U ${マスターユーザー名} -d sampledb -c "CREATE EXTENSION pg_hint_plan;"
```

2.DBインスタンスのパラメータグループで以下のパラメータを設定する

| パラメータ                     | 設定値                              |
| ------------------------------ | ----------------------------------- |
| pg_hint_plan.enable_hint       | 1                                   |
| pg_hint_plan.enable_hint_table | 1                                   |
| pg_hint_plan.parse_messages    | info                                |
| pg_hint_plan.message_level     | info                                |
| pg_hint_plan.debug_print       | on                                  |
| shared_preload_libraries       | pg_stat_statements[^1],pg_hint_plan |

[^1]: pg_stat_statements はデフォルトで設定されています

なお shared_preload_libraries の設定値の反映はDBインスタンスの再起動が必要です。その他のパラメータは起動したまま順次反映されます。

## 注意点

### 発生した事象

`pg_hint_plan.enable_hint` などのパラメータを `1` にして有効にした直後から、データベースに接続できなくなる事象が発生しました。リソースモニター上からは接続数が突如10000を超えていました。

<img src="/images/2023/20230411a/image_2.png" alt="image.png" width="706" height="280" loading="lazy">

また、PostgreSQL のサーバーログを確認すると、以下のようなログが大量に出力されていました。

```log
2023-03-15 09:01:27 UTC:10.182.44.174(15965):rdsproxyadmin@postgres:[1095]:ERROR:  relation "hint_plan.hints" does not exist at character 21
2023-03-15 09:01:27 UTC:10.182.44.174(15965):rdsproxyadmin@postgres:[1095]:QUERY:  SELECT hints   FROM hint_plan.hints  WHERE norm_query_string = $1    AND ( application_name = $2     OR application_name = '' )  ORDER BY application_name DESC

...

2023-03-15 09:17:28 UTC:10.182.46.151(47361):rdsproxyadmin@postgres:[16740]:ERROR:  relation "hint_plan.hints" does not exist at character 21
2023-03-15 09:17:28 UTC:10.182.46.151(47361):rdsproxyadmin@postgres:[16740]:QUERY:  SELECT hints   FROM hint_plan.hints  WHERE norm_query_string = $1    AND ( application_name = $2     OR application_name = '' )  ORDER BY application_name DESC
```

### 原因

社内の有識者から、**RDS Proxy が DB インスタンスの `postgres` データベースにも接続する仕組みになっている**、と教えていただきました。たしかに上記のログからも `rdsproxyadmin` ユーザーで `postgres` データベースで実行しているクエリがエラーになっていることがわかります[^2]。

<img src="/images/2023/20230411a/image_3.png" alt="image.png" width="926" height="318" loading="lazy">

[^2]: 実際、このエラーはデータベースに `pg_hint_plan` の拡張が登録されていないときに発生します。https://pghintplan.osdn.jp/pg_hint_plan-ja.html#install

### 解決方法

`postgres` データベースに接続して `pg_hint_plan` の拡張を有効にします。以下のコマンドを実行します。

```sql
psql -h ${接続先インスタンス名} -U ${マスターユーザー名} -d postgres -c "CREATE EXTENSION pg_hint_plan;"
```

このコマンドを実行後に `pg_hint_plan.enable_hint` などのパラメータを `1` などにして機能を有効にしたら、エラーなく `pg_hint_plan` のヒントが利用できるようになりました。

## まとめ

本記事では、Aurora PostgreSQL と RDS Proxy の環境で `pg_hint_plan` 拡張を利用する際に遭遇した問題、その原因、そして解決方法を説明しました。ポイントは、`postgres` データベースにも `pg_hint_plan` の拡張を適用することが必要である、ということです。Aurora PostgreSQL と RDS Proxy の環境下で SQL ヒントを利用するために `pg_hint_plan` の拡張を導入する方の参考になれば幸いです。
