---
title: "Go Tips連載2: Golandで環境変数をさっと貼る方法 "
date: 2020/05/19 21:52:54
postid: ""
tag:
  - Go
  - Goland
  - GoTips連載
category:
  - Programming
thumbnail: /images/20200519/thumbnail.png
author: 真野隼記
lede: "今回はGoでアプリ開発するときにお世話になっている人が多い、GolandのTipsを紹介します。"
---

<img src="/images/20200519/top.png" loading="lazy">


# はじめに

[Go Tips連載](/tags/GoTips%E9%80%A3%E8%BC%89/)の第2弾です。

こんにちは。TIG DXユニットの真野です。ここ数ヶ月は某IoT案件でGoを用いてバックエンド開発に勤しんでいました。連載第1弾の[ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方](/articles/20200518/)を書いた宮崎さんとは、Goでメッセージ管理のライブラリとか、2-Way-SQLのライブラリとかを作りたいよねといったネタを交換を良くする仲です。

今回はGoでアプリ開発するときにお世話になっている人が多い、[Goland](https://www.jetbrains.com/go/)のTipsを紹介します。


# 背景

[The Twelve-Factor App](https://12factor.net/ja/)の方法論や、Dockerなどコンテナの流行に合わせて、環境変数でアプリケーションの設定を切り替えることが増えていると思います。

単純にこの言葉通りに設計すると、以下のように環境変数の種類が増えてくる場合が多いと思います。噂では30~40の環境変数を使うコンテナアプリも聞いたことがあります。

```bash まだこれでも少ない方かもしれない環境変数が沢山ある例
export DYNAMO_TABLE_USER=local_user
export DYNAMO_TABLE_ITEM=local_item
export DYNAMO_TABLE_PROFILE=local_profile
export DYNAMO_TABLE_INSTALLATION=local_installation
export DYNAMO_TABLE_CALENDAR=local_calendar
export AUDIT_API_ENDPOINT=http://localhost:8000
export AUDIT_ID_TRACE_ENDPOINT=http://localhost:8001
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_REGION=ap-northeast-1
```

ターミナルでGoのテスト実行やアプリ起動を行う場合は、上記をそのまま動かせばよいだけですが、Goland上でDebug実行するときなどは大変です。なぜなら `Run Configurations` で心を込めてポチポチ環境変数を設定する必要があるからです。とても面倒だと思いました。

<img src="/images/20200519/photo_20200519_01.png" loading="lazy">

これは大変なタスクです。


# 結論

Key=Value形式をセミコロン区切りでクリップボードにコピーすると、一括で貼り付け可能です。

今回の例だと、exportを外して改行コードの代わりにセミコロンに書き換えてCtr+C...

`DYNAMO_TABLE_USER=local_user;DYNAMO_TABLE_ITEM=local_item;DYNAMO_TABLE_PROFILE=local_profile;DYNAMO_TABLE_INSTALLATION=local_installation;DYNAMO_TABLE_CALENDAR=local_calendar;AUDIT_API_ENDPOINT=http://localhost:8000;AUDIT_ID_TRACE_ENDPOINT=http://localhost:8001;AWS_ACCESS_KEY_ID=dummy;AWS_SECRET_ACCESS_KEY=dummy;AWS_REGION=ap-northeast-1;`

Environment VariablesのアイコンをクリックすればOKです。

<img src="/images/20200519/photo_20200519_02.gif" loading="lazy">

CLI操作では無いのが強いていうと不満ですが、とても楽ちんです。

# おまけ

`envfile` を読み込むプラグインが存在します。
https://plugins.jetbrains.com/plugin/7861-envfile

これを用いれば、ターミナルはdirenv 、Goland上ではEnvFileに任せると一貫性があるかも知れません。


# まとめ

* Golandはセミコロン区切りで複数の環境変数をコピペ可能
* プラグインを入れればもう少し固く管理も可能

皆さまの開発生産性に少しでも役立てれば幸いです。
