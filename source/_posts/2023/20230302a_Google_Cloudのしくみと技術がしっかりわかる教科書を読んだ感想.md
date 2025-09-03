---
title: "Google Cloudのしくみと技術がしっかりわかる教科書を読んだ感想"
date: 2023/03/02 00:00:00
postid: a
tag:
  - 書評
  - GoogleCloud
  - 入門
  - BigQuery
category:
  - Infrastructure
thumbnail: /images/2023/20230302a/thumbnail.png
author: 藤戸四恩
lede: "積読消化目的で参加させていただきました。図解即戦力 Google Cloudのしくみと技術がこれ1冊でしっかりわかる教科書を選んだ理由としては、CCoEメンバーに参加しGoogle Cloud に触れる機会があったのですが、いままではCloudというものに触れてこなかったため掴みたいと考えたからです"
---
# はじめに

金融グループ所属、新人の藤戸四恩です。
インデックス記事に書かせていただきましたが、積読消化目的で参加させていただきました。
<img src="/images/2023/20230302a/image.png" alt="" width="400" height="564" loading="lazy">

[読書感想文連載](/articles/20230217a/) の8冊目は、技術評論社から出版されている [図解即戦力 Google Cloudのしくみと技術がこれ1冊でしっかりわかる教科書](https://gihyo.jp/book/2021/978-4-297-12301-7) です。

この書籍を選んだ理由としては、CCoE(クラウド活用推進組織)メンバーに参加しGoogle Cloud に触れる機会があったのですが、いままではCloudというものに触れてこなかったため全体像を掴みたいと考えたからです。

気になったところについて感想を書いていきたいと思います。

## 書籍の概要

この書籍は2021年9月3日に発売された本で、Google Cloudに関する基本的な知識を学ぶことができます。
下記の通り10章から構成されています。

- 1章 Google Cloud の基礎知識
- 2章 クラウドの仕組みとGoogleの取り組み
- 3章 Google Cloud を使うには
- 4章 サーバーサービス「Compute Engine」
- 5章 ネットワークサービス「VPC」
- 6章 ストレージサービス「Cloud Storage」
- 7章 コンテナとサーバーレスのサービス
- 8章 データベースサービス
- 9章 データ分析のサービス
- 10章 そのほかに知っておきたい Google Cloud のサービス

## Google Cloudのシェア率と検索比率について

書籍内の内容ではないですが、読み進めるにあたり、Google Cloud がどれくらいのシェアがあるのか気になり、調べてみました。

Publickey社の記事内では[^1]、Canalys社が調査した、2022年度第2四半期時点のクラウドのシェア率について記載されており、AWS が31％で1位、 Azure が24％で2位、Google Cloud が8％が記載されています。[^2]

また、Googleでの検索比率を Google Trends でそれぞれのクラウドサービス名を検索しました。
比較したクラウドサービスは、Amazon Web Services (以下AWS)、Microsoft Azure (以下Azure)、Google Cloudの3つです。

※Google Cloud は2022年6月に Google Cloud Platform から Goolge Cloud に[名称変更](https://cloud.google.com/blog/ja/topics/developers-practitioners/introducing-new-homepage-google-cloud)されたため、Google Cloud Platform をトピックにいれています。

<img src="/images/2023/20230302a/スクリーンショット_2023-02-27_19.54.39.png" alt="" width="1160" height="686" loading="lazy">

個人的には、Google Cloud のシェアが思っていたよりも低く驚きました。

## ライブマイグレーションについて

4章 サーバーサービス「Compute Engine」の障害発生時の対応（1）~ライブマイグレーション(p.92)でCompute Engine の障害発生時の対応方法についての説明があり、対応方法の1つとして`ライブマイグレーション`が紹介されています。

> Compute Engineは、ハードウェアを購入することなくオンデマンドで仮想マシンを利用できるコンピューティングサービスです。
> Compute Engineでは仮想マシンが、仮想マシンを実行するためのソフトウェアであるハイパーバイザ上で複数実行されます。

Compute Engineは仮想マシンのことで、AWSだとAmazon EC2、AzureだとAzure Virtual Machineのことです。

> ComputeEngineには障害発生時の対応として、ライブマイグレーションとホストエラー対応という、大きく2つの機能が備わっています。
ライブマイグレーションとは、仮想マシンを稼働した状態のまま、仮想マシンを実行する物理サーバを別の物理サーバに移動する仕組みです。

`ライブマイグレーション`という単語は初めて知ったのですが、　Compute Engineはどのようにライブマイグレーションを実現しているのか調べてみました。[^3]

<img src="/images/2023/20230302a/image_2.png" alt="" width="875" height="661" loading="lazy">
※ライブマイグレーションのコンポーネントの図を引用[^3]

VMの移行は3つのステップで行われます。

1. VM上のメモリやディスクを移行先のVMにコピーします。
1. 移行元のVMは停止し、1でコピーしたメモリの差分を移行先にコピーします。
1. VMが移行先のVMで実行されます。

移行が完了すると、移行元のVMが削除されることによって実現されます。
Google Cloud は障害の事前検知を行っているため[^4]、検知した際にライブマイグレーションに影響がない場合は、上記のようなライブマイグレーションで障害対応を行っていることがわかりました。

### BigQuery と RDB の違い

9章 データ分析のサービスのBigQueryとRDBの違い(p.253)で下記の記載があります。
> BigQueryは、RDB同様にテーブルを持ち、SQLによってデータの処理要求を行います。
> では、どのような点がRDBと異なるのでしょうか。
> 1つ目は、カラム型ストレージである点です。必要なカラムにのみアクセスできるため、データ走査を最小化できます。
> 2つ目は、ツリーアーキテクチャである点です。クライアントから受け取ったクエリの処理をツリー構造の処理に分解して、複数のサーバーに分散することで、大規模な分散処理を実現しています。
> .....
> BigQueryはSQLの構文をサポートしつつ、NoSQLの特徴を併せ持つハイブリットなシステムといえます。

2022年11月18日に開催された国際度量衡総会では新しい単位ロナ(ronna)10の27乗とクエタ(quetta)10の30乗が追加された[^5]ことからも
データ量はどんどん大規模になっていて、大規模なデータを高速で処理する必要性はどんどん増しているように感じています。

カラム型ストレージ(列指向)とツリーアーキテクチャは、どのような仕組みか気になったため、調べてみました。

理由の1つ目のカラム型ストレージについては、弊社の2021年に開催された、春の入門連載2021の4日目の`IT初学者がカラムナデータベースを勉強してみた`で解りやすく解説されていました。[^6]
つまりカラム型ストレージは、データを列方向に保持するとデータの定義情報(型など)や値が同一のデータを格納しているため圧縮効率が高いため高速化されていることがわかりました。

理由の2つ目のツリーアーキテクチャは、クエリをRootServer、MixerServer、LeafServerの順にツリー構造分解されることにより分散処理を実行することで高速されています。[^7]

これらによりBigQueryは大規模なデータを効率よく処理されています。

## おわりに

図解即戦力 Google Cloudのしくみと技術がこれ1冊でしっかりわかる教科書の読書感想文でした。

クラウドサービスを触ったことがなかった自分でも躓くことなく読み進めることができました。
Google Cloudを使用する上で基礎的な知識を学ぶことができたと思います。
クラウドサービスを触ったことがなく、Google Cloudをこれから使う方にはぜひ手に取ってみてください。

明日の読書感想連載は工藤さんの[SQLアンチパターン](/articles/20230303a/)です。

[^1]: https://www.publickey1.jp/blog/22/202221aws2azure3google_cloud3.html
[^2]: https://www.canalys.com/newsroom/global-cloud-services-Q2-2022
[^3]: https://cloud.google.com/compute/docs/instances/live-migration-process?hl=ja
[^4]: https://cloud.google.com/support/docs/dashboard?hl=ja#lifecycle_of_an_incident
[^5]: https://www.asahi.com/articles/ASQCL441NQC6ULBH006.html
[^6]: https://future-architect.github.io/articles/20210419b/
[^7]: https://tech.plaid.co.jp/inside_bigquery
