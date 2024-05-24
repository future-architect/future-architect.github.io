---
title: "GCP連載#4 Cloud Life Sciencesを見てみた"
date: 2020/02/10 11:53:19
postid: ""
tag:
  - GCP
  - ヘルスケア
  - BigQuery
category:
  - Infrastructure
author: 伊藤太斉
lede: "本記事を書くためのモチベーションとしては、現在はインフラやネットワークエンジニアとして日々働いていますが、大学時代は化学を専攻し、大学院では感染症を専門に研究していました。最終的に遺伝子を触ることなく修了しましたが、生物系に少しでも在籍していたこともあり、今回はわずかな記憶を頼りながら調べています。この記事が最終的にかつての研究の何かに使えたかもしれない、と私の中で知識が落とし込めればいいなと思っています。"
---
## はじめに
こんにちは。TIG/DXチームの[伊藤](https://twitter.com/kaedemalu)です。[GCP連載](/articles/20200202/)の4日目です。

さて、私は業務ではGCPとTerraformを扱っています。コンピューティング・ネットワーキングなどが現在の業務領域でである一方で、ビッグデータ・機械学習関連のサービスはあまり使う機会がなく理解もまだまだな部分が多いです。今回は、Cloud Life Sciencesという、ビッグデータの中でも毛色の違うサービスを調べてみようと思いこの連載に参加しております。割と読み物に近くなったのでさらっと読み流していただければ幸いです。

## 私の今まで

本記事を書くためのモチベーションとしては昔話をすこし挟みます。現在はインフラやネットワークエンジニアとして日々働いていますが、大学時代は化学を専攻し大学院では感染症を専門に研究していました。最終的に遺伝子を触ることなく修了しましたが、生物系に少しでも在籍していたこともあり、今回はわずかな記憶を頼りながら調べています。この記事が最終的にかつての研究の何かに使えたかもしれないと私の中で知識が落とし込めればいいなと考えています。

## [Cloud Life Sciences](https://cloud.google.com/life-sciences)について
<img src="/images/20200210/1.png" class="img-very-small-size" loading="lazy">

GCPの中ではビッグデータに属するサービスになります。大規模な生物医学データの処理を費用対効果が高くできることがウリで、対象ユーザーは`ライフ サイエンス機関と学術研究機関向け`となっています。特に強く謳われているのが、研究に集中できることと結果の再現性にです。遺伝子情報は特に大きなデータ量になるので、得たデータの検証をスピードアップさせることは研究スピード全体を上げることにも繋がります。

また、アーキテクチャは以下になっており、サービス単体としてではなく、1つのプラットフォームとして動くようです。
<img src="/images/20200210/photo_20200210_01.png" loading="lazy">
(引用：https://cloud.google.com/life-sciences/?hl=ja)

### VCF
Variant Call Formatと言われる、遺伝子配列の変異データを保存するときに利用されるファイル形式になります。ファイル内の記載内容は以下になります。

- VCFヘッダー行(1~8行目)
- データのフォーマット行(カラムタイトル)
    - 染色体番号
    - 塩基の位置
    - 塩基(変異箇所)のID
    - リファレンス配列上の塩基
    - シーケンスデータ上の塩基
    - シーケンシングデータのスコア
    - フィルタリング条件の通過の有無
    - key:dataの形の追加情報

このような形でシーケンス結果を記載しています。DNAの塩基配列についてはアデニン(A)、チミン(T)、グアニン(G)、シトシン(C)の4種類がありますが、それぞれ、A=T、G≡Cとしてペアになっているのでぜひ試すときには思い出してみてください。また後のクエリに使います。

### [Variant Transforms](https://github.com/googlegenomics/gcp-variant-transforms)ツール
こちらのツールはGoogleが作成したオープンソースになります。実際にBigQueryに読み込ませるためにはデータの加工が必要になりますので、こちらのツールを使って分析に最適な形で出力することができます。実際のフローにはDataflowが使用されており、BigQueryで分析するまでは以下の図になります。

## 実際に流れを掴む

実際に公開データセットを使ってバリアントを使って少しいじってみましょう。ここは実際のチュートリアルの一部を行なっているので、本記事以外の方法を試したい方は[こちら](https://cloud.google.com/life-sciences/docs/how-tos/variant-transforms)から確認してください。Cloud Consoleで行うとクリーンに進められます。

### GCSからVariant TransformsツールからBigQueryに送る

GCSにバリアントファイルを配置したら実際にツールを使います。使うためには公式のDockerイメージがあるのでこちらを落としてきます。イメージが2GB近くあるので、ダウンロードは気長に待ちましょう。

```bash
$ docker pull gcr.io/cloud-lifesciences/gcp-variant-transforms
```

次にスクリプトを実行します。変数は実際に使っているプロジェクト名、バケットなどに置き換えてください。

```sh script.sh
#!/bin/bash
# Parameters to replace:
# The GOOGLE_CLOUD_PROJECT is the project that contains your BigQuery dataset.
GOOGLE_CLOUD_PROJECT=GOOGLE_CLOUD_PROJECT
INPUT_PATTERN=gs://BUCKET/*.vcf
OUTPUT_TABLE=GOOGLE_CLOUD_PROJECT:BIGQUERY_DATASET.BIGQUERY_TABLE
TEMP_LOCATION=gs://BUCKET/temp

COMMAND="vcf_to_bq \
    --input_pattern ${INPUT_PATTERN} \
    --output_table ${OUTPUT_TABLE} \
    --temp_location ${TEMP_LOCATION} \
    --job_name vcf-to-bigquery \
    --runner DataflowRunner"
docker run -v ~/.config:/root/.config \
    gcr.io/cloud-lifesciences/gcp-variant-transforms \
    --project "${GOOGLE_CLOUD_PROJECT}" \
    --zones us-west1-b \
    "${COMMAND}"
```

スクリプト実行後は時間がかかるようなので、これも気長に待ちます。
実行が終わったら`bq`コマンドでアウトプットがあるか確認しましょう。

```bash
bq ls --format=pretty GOOGLE_CLOUD_PROJECT:BIGQUERY_DATASET
```

これでVariant Transformツールを使ってファイルをBigQueryに適した形にすることが出来ました。

### BigQueryに読み込ませる

こちらでは公開プロジェクトのデータを使ってバリアントの分析を行います。データを用いるプロジェクトは[Illumina Platinum Genomes](https://www.illumina.com/platinumgenomes.html)、テーブル名は`platinum_genomes_deepvariant_variants_20180823`になります。実際のテーブルを５件出力しました。
<img src="/images/20200210/photo_20200210_02.png" loading="lazy">

実際に流すクエリは以下になります。

```sql
WITH filtered_snp_calls AS (
   SELECT
     reference_name,
     c.name,
     CONCAT(reference_bases, '->', alternate_bases[ORDINAL(1)].alt) AS mutation
   FROM
     `bigquery-public-data.human_genome_variants.platinum_genomes_deepvariant_variants_20180823` AS v, UNNEST(v.call) AS c
   WHERE
     # Only include biallelic SNPs.
     reference_bases IN ('A','C','G','T')
     AND alternate_bases[ORDINAL(1)].alt IN ('A','C','G','T')
     AND (ARRAY_LENGTH(alternate_bases) = 1
       OR (ARRAY_LENGTH(alternate_bases) = 2 AND alternate_bases[ORDINAL(2)].alt = '<*>'))
     # Skip homozygous reference calls and no-calls.
     AND EXISTS (SELECT g FROM UNNEST(c.genotype) AS g WHERE g > 0)
     AND NOT EXISTS (SELECT g FROM UNNEST(c.genotype) AS g WHERE g < 0)
     # Include only high quality calls.
     AND NOT EXISTS (SELECT ft FROM UNNEST(c.filter) ft WHERE ft NOT IN ('PASS', '.'))
 ),

 mutation_type_counts AS (
   SELECT
     reference_name,
     name,
     SUM(CAST(mutation IN ('A->G', 'G->A', 'C->T', 'T->C') AS INT64)) AS transitions,
     SUM(CAST(mutation IN ('A->C', 'C->A', 'G->T', 'T->G',
                           'A->T', 'T->A', 'C->G', 'G->C') AS INT64)) AS transversions
   FROM filtered_snp_calls
   GROUP BY
     reference_name,
     name
 )

 SELECT
   reference_name,
   name,
   transitions,
   transversions,
   transitions/transversions AS titv
 FROM mutation_type_counts
 WHERE
   transversions > 0
 ORDER BY
   titv DESC,
   name
```

`mutation_type_counts`のところで、正確にペアになっている塩基対(A=T、もしくはG≡C)については`transitions`、正しいペアになっていない塩基対は`transversions`(変異)しているものをそれぞれint型にCASTして合計を取っています。上記クエリをBigQueryに流すと以下の結果が出力されます(上記10件)。

| 行 | referencce_name | name | transitions | transversions | titv |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | chr22 | NA12892 | 35299 | 15017 | 2.3506026503296265 |
| 2 | chr22 | NA12889 | 34091 | 14624 |  2.331167943107221 |
| 3 | chr17 | NA12892 | 67297 | 28885 | 2.3298251687727194 |
| 4 | chr22 | NA12878 | 33627 | 14439 | 2.3289008934136715 |
| 5 | chr22 | NA12877 | 34751 | 14956 | 2.3235490772933938 |
| 6 | chr22 | NA12891 | 33534 | 14434 | 2.323264514341139 |
| 7 | chr17 | NA12877 | 70600 | 30404 | 2.3220628864623074 |
| 8 | chr17 | NA12878 | 66010 | 28475 | 2.3181738366988585 |
| 9 | chr17 | NA12890 | 67242 | 29057 | 2.314141170802216 |
| 10 | chr17 | NA12889 | 69767 | 30189 | 2.311007320547219 |

最終列の`titv`では正しいペア、および変異の入ったペアの比をとっているので、各リファレンスに対してどれくらい変異は入っているかがわかります。ここでは20 GBほど読み込んでいますが、実際にクエリにかかった時間は1秒を切っているので、ローカルで同様のクエリ実行するよりははるかに早いでしょう。

## まとめ
本記事では簡単ですが、Cloud Life Sciencesを触る記事を書いてきました。エンジニアとして分析に使うものはうっすら理解していても、実際に使うファイルフォーマットなどは知識が深くないとそもそも何もできないなと改めて感じたところです。今回はVCFファイルという専門的なファイルからBigQueryに流すところまで行いましたが、Cloud Life Sciencesはもともと Google Genomicsというサービスだったようで、以前よりGoogleが力を入れていた部分の一つであることが今回色々調べてわかりました。医療分野は正確さを求められる一方で、そのデータ量は膨大な量になります。大学院時代に肌で感じたことですが、ローカルで分析している先輩がかなり時間をかけていたことを思い出しました。このサービスの知名度が上がるとともに、研究ユース、非エンジニアでも使いやすいプラットフォームになるとより良いなと思いました。


[GCP連載](/articles/20200202/)の4日目でした。次は市川さんの[【もう鍵なくさない】GCPのSecret ManagerとBerglasで幸せになる](/articles/20200212/)です。

## 最後に

先日、GCPのProfessional Cloud Architectに合格しました！結果が出力される瞬間はなかなかドキドキでしたが、なんとか合格できました。私も参考にしましたが、本技術ブログでも合格体験記を出しておりますので、そちらもぜひご覧ください！

[【合格記】GCP Professional Cloud Architect認定資格を振り返る](/articles/20190530/)

## 参考

[VFC フォーマットファイルの特徴および Python でパースする方法](https://bi.biopapyrus.jp/gwas/vcf.html)
