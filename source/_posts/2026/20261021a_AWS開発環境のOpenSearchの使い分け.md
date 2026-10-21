---
title: "AWS開発環境のOpenSearchの使い分け"
date: 2026/10/21 00:00:00
postid: a
tags:
  - AWS
  - OpenSearch
  - サーバーレス
  - コスト削減
categories:
  - Cloud
thumbnail: /images/2026/20261021a/thumbnail.png
author: 澁川喜規
lede: "AWSのOpenSearchのManaged ClusterとServerless（NextGen）を実際に開発環境に投入し、Pricing Calculatorでは見えない利用料の様子をまとめました。"
---
検索機能を持つサービスの開発をする場合、検索機能をどのように実現するかいくつか選択肢があります。AWSを使っていると、自前でElasticsearchをホスティングするか、マネージドなOpenSearchを使うか、ということになります。OpenSearchの方にはServerlessの選択肢もあり、そちらでは最近NextGenというのも追加されてclassicとNextGenの2種類になったのですが、どの選択肢が良いのかコストを計算してみようとしてもPricing Calculatorみても全く情報がありません。

Managed Clusterと、Serverlessを実際に開発環境に投入して利用料の様子が見えてきたのでブログにまとめます。なお、現在のテストデータの量は650MBほどです。

## OpenSearchのサービスの種類とコストの考え方の比較

2種類あります。

* Managed Cluster: あらかじめ指定したインスタンス(EC2と同じ)を選びサービスを起動するもの。設定したもので固定で費用がかかる。EC2と似ていますが、残念ながら一時停止などはなく、停止して節約するにはまるごと削除しかありません。Pricing CalculatorではAmazon OpenSearch Service domainとなっている項目。
* OpenSearch Serverless: 1 OCU(6GBのメモリと1 vCPU、120GBのストレージ)単位でリソースが増減する仕組み。1 OCU/h = `$0.334`です。1か月だと$244ぐらい。

他にもIngestionというのもありますが、これはどうも普通の検索サービスではないようなので除外します。

### Managed Cluster

こちらは使うインスタンスとかを入れていけばそれでコストは見えます。他にネットワークのコストが追加になる可能性があります。Managed ClusterはVPCを指定してデプロイができます。開発環境用には一番安いのは次の選択肢になるかと思います。クラスタにはせずにシングル運用。

| インスタンスタイプ | コスト  | vCPU | Mem   |
|:----------------|:-------|:-----|:------|
| t2.micro.search | $22/月 | 1   | 1 GiB  |
| t3.small.search | $42/月 | 2   | 2 GiB  |
| t3.medium.search | $84/月 | 2   | 4 GiB  |

t3.small.searchで複数人(片手ぐらい)で動かしたら待ち時間がすごい多くなって、みたらGCが頻繁に走っているような挙動でした。t3.medium.searchでは安定して早くなりました。まあチーム開発で複数人で触ったりスプリントレビューとかをするならmediumがいいのではないかと思います。

### OpenSearch Serverless

リクエスト数によってスケールするという触れ込みなのにPricing Calculatorを見るとOpenSearch Serverlessに関しては時間変化とかなく、OCU数だけを設定する欄があり、1日の利用時間みたいなのを入れるところがありません。また、classicとnextgenを指定するところもありません。ストレージは誤差だとして、Index OCU=0.5 + Query OCU=1で、$366/月と出ます。それ以外にも、ここでは設定できないものがドキュメントにはいくつかあります。[分散しない開発用モード](https://aws.amazon.com/jp/blogs/news/amazon-opensearch-serverless-cost-effective-search-capabilities-at-any-scale/)だと0.5OCU, 0.5OCUにできますよ、ということです($174)。

classicでは最低限起動するノードがいて、それが上記の通りなので、おそらく$174が最低価格となります。

NextGenはリクエストがなければOCUが0にまで下がると言われています。

## 実際にNextGenで稼働させてみた

実際に開発環境で動かしてみたときの状況です。平日のみアクセスがあります。またインデックス投入をした場合は赤のリクエストが動いています。

<img src="/images/2026/20261021a/ocu_usage.png" alt="" width="1109" height="551" class="bordered">

平日昼間はOCUが2になり(2ずつ上がる)ますが、仕事がない時間は綺麗に0に落ちているのがわかります。また、土日の稼働もありません。1日平均は$8ぐらいなので21日稼働とすると、$168ぐらい？

<img src="/images/2026/20261021a/cost_daily.png" alt="" class="bordered" width="1107" height="555" loading="lazy">

<img src="/images/2026/20261021a/cost_trend.png" alt="" class="bordered" width="1200" height="594" loading="lazy">

とはいえ、2 OCUなので、2vCPUで12GBメモリなので、だいぶ快適です。応答速度は早いです。classicのQuery OCU=0.5(0.5 vCPUと 3GBメモリ)で同じぐらいの金額と考えると、この2つの比較ならNextGenで良さそうです。

## 結局どちらが安いのか？

上記の利用方法はOpenSearch ServerlessのNextGenを使う場合の最低運用価格かと思います。最低限の2 OCU単位での起動かつ業務時間内だけ起動。これ以上は安くなることはなさそうです。土日が休みだとすれば、平均的には5/7=0.7 OCUぐらいでした。Classicの1 OCUよりもさらに安くなります。

ただ、途中で出てきたように開発用で限界を攻めるならManaged Clusterを立てた方が安そうです。mediumで済むなら$84。

なお、半年ぐらい前の2026年3月から、OpenSearchはManaged ClusterもServerlessも[Saving Planの対象になった](https://aws.amazon.com/jp/about-aws/whats-new/2026/03/dbsp-opensearch-service-neptune-analytics/)ので安くできますね。サーバーレスでも最低価格は見えたので効率よくSaving Planが使えそうです。

ただ、どのぐらいのリクエストがあったらどのぐらいのOCUになるのか、本番環境を想定してパフォーマンスを見てみたい、というのであればサーバーレスも十分価値があると思います。国内限定サービスとかなら夜間はだいぶアクセス数が下がるわけで、そこは台数が減って安くなってくれるサーバーレスも価値はあるんじゃないかと思います。正直実際のワークロードを入れてみないと試算しにくいので、動かしてみてもうちょっと特性が知りたいですね。

## まとめ

Pricing CalculatorとドキュメントではわかりにくかったOpenSearch Serverlessの運用価格について実際に動いている開発環境から調べてみました。実際に動かしてみるとわかることが多いですね。だいぶクリアになりました。

ただ、これは開発環境、という前提の話です。本番環境であれば最低3台構成。[推奨構成](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html)だと、マスターノード3つ、データノード3つ、3AZ分散ということなので、だいぶ大きくする必要があります。この記事の台数は、壊れたり停止したりしてもいい前提です。ローカルでもDockerなりdevboxで起動するでしょうし。

なお、グラフはAmazon Qに描いてもらいましたが便利ですね。チャットで指示するだけでざくざく作ってくれます。
