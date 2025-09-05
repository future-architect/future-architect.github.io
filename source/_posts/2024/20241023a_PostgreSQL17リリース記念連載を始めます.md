---
title: "PostgreSQL17リリース記念連載を始めます"
date: 2024/10/23 00:00:00
postid: a
tag:
  - PostgreSQL
  - PostgreSQL17
category:
  - DB
thumbnail: /images/2024/20241023a/thumbnail.png
author: 真野隼記
lede: "PostgreSQL 17がリリースされたことを記念し、ブログ連載を始めます"
---
<img src="/images/2024/20241023a/top.png" alt="top.png" width="761" height="366" loading="lazy">

## はじめに

Technology Innovation Group真野です。

2024年9月26日、PostgreSQL 17がリリースされました。

- [PostgreSQL 17 Released!](https://www.postgresql.org/about/news/postgresql-17-released-2936/)

それを記念して、PostgreSQL17の[プレスキット](https://www.postgresql.org/about/press/presskit17/ja/)や[リリースノート](https://www.postgresql.org/docs/17/release-17.html)から記事ごとにトピックを抜粋して、ブログリレーを行います。

## スケジュール

| 日付|担当者 | タイトル |
| --- | -- | --- |
| 10/23| 山本竜玄 | [to_regtypemod関数と型修飾子について](/articles/20241023b/) |
| 11/06 | 真野隼記 | [排他制約について](/articles/20241106a/) |

## PostgreSQL 17 アップデート概要

主な更新内容をプレスキットからまとめます。

- VACUUMが性能改善で、従来の1/20のメモリ量で動作するようになり、速度向上を実現
- WALの処理改善で、書き込みスループットが最大で2倍向上する可能性
- 新しいストリーミングI/Oインターフェースで、シーケンシャルスキャンやANALYZEの速度向上
- B-Treeインデックスを使用した、IN句の性能向上
- NOT NULL制約の最適化
- 共通テーブル式（いわゆるWITH句）での実行計画の改善
- JSON周り
  - SQL/JSON コンストラクタのサポート
  - クエリ関数（JSON_EXISTS、JSON_QUERY、JSON_VALUE）のサポート
  - jsonpath式の追加
- MERGE文でRETURNINGの利用が可能
- COPYが最大2倍の性の向上と、ON_ERRORオプションの追加
- パーティションテーブルでの識別子、排他制約が利用可能となった
- `postgres_fdw` でEXISTSやIN句をリモートサーバ側にプッシュダウンできるようになった
- 論理レプリケーションスロットを削除する必要がなくなった
- 論理レプリケーションのフェイルオーバ制御が追加された
- TLS オプション sslnegotiation が追加された
- pg_combinebackup ユーティリティが追加された
- pg_dumpに--fiiterオプションが追加された
- EXPLAINに、I/Oブロック読み書き時間が表示されるようになったのと、SERIALIZE、MEMORYオプションが追加された
- インデックスのバキューム進行状況をpg_stat_progress_vacuumで確認できるようになった
- pg_wait_events システムビューが追加され、アクティブなセッションの待機を分析できるようになった

## 最後に

フューチャーではPostgreSQLは大人気で、おそらく一番利用が多いDBMSです。今回はリリース記念という名目ですが、業務で得たPostgreSQLの知見を引き続き発信していきます。
