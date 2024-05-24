---
title: "Prometheus/Grafanaを使ってみる"
date: 2024/04/17 00:00:01
postid: b
tag:
  - Prometheus
  - Grafana
category:
  - Infrastructure
thumbnail: /images/20240417b/thumbnail.png
author: 伊藤太斉
lede: "PrometheusはSoundCloud社によって開発されたオープンソースの監視ソフトウェアです。GoogleでKubernetesの前身となったBorgという分散システムがあり..."
---

こんにちは。TIGの伊藤です。

[春の入門連載](/articles/20240408a/)7日目です。

## 新しいこと、始めたい、知りたい

普段、私の仕事はTerraformを主としたIaCを書いてインフラを作ったり管理することなのですが、ふと考えると、IaC以外の部分に対して取り組むきっかけがなく今までやってきていたような気もしてきました。とはいえ、いきなり全然違うことをするのでもなく、自分の裾野を少し広げる方向で考えていたところ、こちらの勉強会を見つけました。

https://grafana-meetup-japan.connpass.com/event/314500/

[![From connpass: Grafana Meetup Japan #1 - connpass | ## Grafana Meetup Japanへようこそ！  このイベントは、オープンソースの監視・可視化ツールであるGrafanaについて、互いに学び、発信し、交流することを目的としています。  Grafanaは、ITインフラやアプリケーションの監視から、IoTデバイス、ビジネス指標、工場、物流、自然災害、宇宙に至るまで、あらゆる分野でのデータ可視化と監視を支援するツールです。  日本でも広く利用されつつありますが、Grafanaの最新情報や導入事例、プラクティスを学んだり発信したりする場は多くありませんでした。そこで、Grafana Labsと共にGrafana Meetup Jap...](/images/20240417b/2024-04-17_Grafana_Meetup_Japan_1___connpass.jpg)](https://grafana-meetup-japan.connpass.com/event/314500/)

知り合いが告知していたことや、登壇される方々に興味を持って参加しました。しかし、「Grafanaほぼ触ったことない」の丸腰で行っても得るものが少なくなりそうなので、せっかくならと記事を書いています。

動機としては上に書いた通りですが、監視システムとして同時に持ち上がってくるPrometheusもちょっとだけ入門して、取り組んでいきます。

## 今回のサンプル

今回のサンプルは以下に置いてあるので、このブログを読んで試してみたい方はぜひ使ってみてください。

https://github.com/kaedemalu/prometheus-grafana-blog

## Prometheus

PrometheusはSoundCloud社によって開発されたオープンソースの監視ソフトウェアです。GoogleでKubernetesの前身となったBorgという分散システムがあり、これらを監視しているシステムであるBorgmonからも大いにインスパイアを受けており、いずれも分散システムのモニタリングに最適化されています。

現在ではCloudNative Computing Foundation（CNCF）のGraduatedプロジェクトとしており、多くのユーザを持つOSSとなりました。

仕組みとしては、従来の監視システムでよく使われるZabbixをはじめとしてエージェントを利用してメトリクスを取得、監視するものではなく、管理サーバ側が指定されたサーバに対しメトリクスを取得するPull型となっているのが大きな違いでしょう。
(今回の話では、だいたい下半分くらいが対象の記事となっています。）

<img src="/images/20240417b/prom_architecture.png" alt="prom_architecture.png" width="1200" height="721" loading="lazy">

> [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)より引用

EC2などのIaaSレベルでは、EC2本体のメトリクスを取得して、サーバ自体のリソース監視を行えますが、コンテナアプリであればコンテナアプリから取得される必要があります。この時にPrometheusであればコンテナ自体のメトリクスを取得することが可能になります。エージェントレスであることで従来EC2にインストールしていたエージェント分のリソースを減らすことができます。

### アプリケーションを動かしてみる

実際にアプリケーションから取れるメトリクスをPrometheusで見てみましょう。

今回、アプリケーションの言語はPythonを使用し、簡易なAPIサーバを立てるためにFastAPIを用いました。

アプリケーションは以下のようにヘルスチェックパスとPrometheusで`/metrics`のパスから情報を取得できるようにしました。

```py app.py
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()

Instrumentator(
    excluded_handlers=["/metrics"],
).instrument(app).expose(app=app, endpoint="/metrics")

@app.get("/health")
def health():
    response = {
        'status': 'up'
    }
    return response
```

FastAPIでPrometheusのメトリクスを取得可能にするため、以下のライブラリを使用しています。今回はカスタマイズをかけていないですが、がっつり使い込むことを考えるとさらに作り込める余地はありそうです。

https://github.com/trallnag/prometheus-fastapi-instrumentator

これでコンテナを起動させ、`/metrics`にcURLを実行すると以下のようにたくさん情報が出てきます。

```bash
$ curl http://localhost:8080/metrics

# HELP python_gc_objects_collected_total Objects collected during gc
# TYPE python_gc_objects_collected_total counter
python_gc_objects_collected_total{generation="0"} 2396.0
python_gc_objects_collected_total{generation="1"} 8411.0
python_gc_objects_collected_total{generation="2"} 2168.0
# HELP python_gc_objects_uncollectable_total Uncollectable objects found during GC
# TYPE python_gc_objects_uncollectable_total counter
python_gc_objects_uncollectable_total{generation="0"} 0.0
python_gc_objects_uncollectable_total{generation="1"} 0.0
python_gc_objects_uncollectable_total{generation="2"} 0.0
# HELP python_gc_collections_total Number of times this generation was collected
# TYPE python_gc_collections_total counter
python_gc_collections_total{generation="0"} 141.0
python_gc_collections_total{generation="1"} 12.0
python_gc_collections_total{generation="2"} 1.0

...(中略)...

http_request_duration_highr_seconds_bucket{le="10.0"} 1.0
http_request_duration_highr_seconds_bucket{le="30.0"} 1.0
http_request_duration_highr_seconds_bucket{le="60.0"} 1.0
http_request_duration_highr_seconds_bucket{le="+Inf"} 1.0
http_request_duration_highr_seconds_count 1.0
http_request_duration_highr_seconds_sum 0.0015817060047993436
# HELP http_request_duration_highr_seconds_created Latency with many buckets but no API specific labels. Made for more accurate percentile calculations.
# TYPE http_request_duration_highr_seconds_created gauge
http_request_duration_highr_seconds_created 1.7132794545039835e+09
# HELP http_request_duration_seconds Latency with only few buckets by handler. Made to be only used if aggregation by handler is important.
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{handler="/health",le="0.1",method="GET"} 1.0
http_request_duration_seconds_bucket{handler="/health",le="0.5",method="GET"} 1.0
http_request_duration_seconds_bucket{handler="/health",le="1.0",method="GET"} 1.0
http_request_duration_seconds_bucket{handler="/health",le="+Inf",method="GET"} 1.0
http_request_duration_seconds_count{handler="/health",method="GET"} 1.0
http_request_duration_seconds_sum{handler="/health",method="GET"} 0.0015817060047993436
# HELP http_request_duration_seconds_created Latency with only few buckets by handler. Made to be only used if aggregation by handler is important.
# TYPE http_request_duration_seconds_created gauge
http_request_duration_seconds_created{handler="/health",method="GET"} 1.7132806219318378e+09
```
それぞれメトリクスがさし示している情報が何なのかを示してくれていて、わかりやすさを感じました。

次にPrometheus自体の設定です。Prometheusの設定には`prometheus.yml`を用いて読み込ませる必要があります。

今回使用したYAMLファイルは以下です。

```yml prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    scrape_interval: 5s
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'fastapi-app'
    scrape_interval: 5s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['app:8080']
```

`job_name`以下でメトリクスを取得する対象や取得するためのパスを指定しています。

ソースレベルの設定、確認はここまでで、具体的にPrometheusの設定をしていきましょう。
コンテナを立ち上げた状態で `http://localhost:9090/graph`にアクセスすると、以下のような画面になります。

<img src="/images/20240417b/スクリーンショット_2024-04-17_1.01.38.png" alt="" width="1192" height="797" loading="lazy">

そして、検索バーにFastAPIのコンテナの`/health`に対して受けたパスの合計が出力される `http_requests_total`を入れてみてみましょう。

<img src="/images/20240417b/スクリーンショット_2024-04-17_1.10.32.png" alt="" width="1200" height="950" loading="lazy">

手打ちでcURLを実行してはいますが、リクエストした数だけグラフが上がってきていることがわかります。

このようにアプリケーションから出力されたメトリクスを取得することができました。

## Grafana

GrafanaはGrafana Labsによって開発されている可視化ツールであり、ダッシュボードの作成はもちろんのことながら前述したPrometheusで実行したクエリをGrafanaでも同等にサポートしています。

PrometheusでできることはわざわざGrafanaでまたやらなくていいのでは？と思いましたが、そこは一旦飲み込んで試してみることにします。

### メトリクスの取得を行う

アプリケーションなどは先ほど使っていたものをそのまま利用します。

コンテナを立ち上げたあと　`http://localhost:3000/login`にアクセスすると、ログイン画面になるので、初期ユーザ/パスワードである admin / adminを打ち込んで、ログインしましょう。(そのあと、初期パスワードの変更を求められますが、今回の検証の本題からは外れるので割愛します）

<img src="/images/20240417b/スクリーンショット_2024-04-17_1.19.48.png" alt="" width="1200" height="950" loading="lazy">

さて、ログインまでできたので、次はGrafanaからPrometheusを参照できるようにしましょう。サイドバーにある Connections > Add new connection を押下しましょう。たくさんのツールをデータソースにできることがわかります。今回は検索バーにPrometheusと入力し、必要なものを選択しましょう。

<img src="/images/20240417b/スクリーンショット_2024-04-17_11.52.25.png" alt="" width="1200" height="459" loading="lazy">

Promehteusを選択し、Add new data sourceを押下してホストの設定をしましょう。Prometheus Server URLに `http://prometheus:9090`を入力して画面下部にある　Save & testを押下して保存しましょう。

保存ができたら、今度はサイドバーにある、Dashboardsを押下し、Create Dashboard > Add visualization からダッシュボードを作りましょう。ここで、先ほど登録したデータソースが使えるようになります。メトリクスの追加ですが、下のスクリーンショットのように入力できる欄があるので、Metricに先ほどPrometheusでも利用した `http_requests_total`を入力して　Run queriesを押してみましょう。

<img src="/images/20240417b/スクリーンショット_2024-04-17_12.00.23.png" alt="" width="793" height="280" loading="lazy">

そうすると、こちらでもグラフを表示することができました。（先ほどと概形が異なるのは取得時間が異なるためです。）

<img src="/images/20240417b/スクリーンショット_2024-04-17_12.03.30.png" alt="" width="793" height="351" loading="lazy">

Metricの欄では、Prometheusが取得可能なすべてのメトリクスが使えるので、ものによっては2つ以上取得できるものがありますが、これは Label filtersで絞ることが可能です。

そして、右上の Apply を押下してダッシュボード化しましょう。

<img src="/images/20240417b/スクリーンショット_2024-04-17_12.06.32.png" alt="" width="1200" height="588" loading="lazy">


### どんなことに使えそうか

Grafanaはデータソースの一覧からわかるように多様なソースをサポートしています。今回試したPrometheus以外にもPostgreSQLなどのRDB、各クラウドの監視ツールとの連携、Google Analyticsなどの可視化も行えます。それぞれで可視化の部分はサポートされているとは思いますが、可視化ツールの一元管理、という意味ではGrafanaに多様なデータソースを束ねるというのは良いのかもしれません。
参考）[Grafana data sources > Built-in core data sources](https://grafana.com/docs/grafana/latest/datasources/#built-in-core-data-sources)

## まとめ

監視・可視化ツールであるPrometheus、Grafanaを触って動かし、知るきっかけに十分なりました。

今いるプロジェクトではGrafanaのデータソースとして使えるOpenSearchを利用しているので、継続して導入タイミングを伺いながら知見を貯めていきます！

## 参考書籍

- [Prometheus実践ガイド: クラウドネイティブな監視システムの構築](https://booth.pm/ja/items/3907516)

