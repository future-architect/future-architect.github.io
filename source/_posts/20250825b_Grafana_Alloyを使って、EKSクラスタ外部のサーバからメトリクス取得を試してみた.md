---
title: "Grafana Alloyを使って、EKSクラスタ外部のサーバからメトリクス取得を試してみた"
date: 2025/08/25 00:00:01
postid: b
tag:
  - Grafana
  - Grafana Alloy
  - EKS
  - 初心者
  - Docker
  - オブサーバビリティ
category:
  - Infrastructure
thumbnail: /images/20250825b/thumbnail.png
author:  二宮佑斗
lede: "Grafana Alloyの豊富な機能の一部を利用してEKSクラスタ外部のサーバ監視に挑戦してみました。本記事では、その設定手順や使ってみて分かったポイントを、初めてAlloyに触れた目線でご紹介します。"
---
[夏の自由研究2025](/articles/20250825a/)ブログ連載の1日目です。

初めまして、コアテクノロジーグループに所属している二宮と申します。

私たちのチームでは普段Grafanaを利用していますが、Grafana Alloyはまだ使ったことがありませんでした。当初は、promtailの後継ツールとしての利用のみを考えていただけでしたが、ドキュメントを読み進める内にAlloyを使えばテレメトリデータの活用方法がさらに広がるのでは…？ と感じました。

そこで今回は、Alloyの豊富な機能の一部を利用してEKSクラスタ外部のサーバ監視に挑戦してみました。本記事では、その設定手順や使ってみて分かったポイントを、初めてAlloyに触れた目線でご紹介します。

## 1. Grafana Alloyとは

[Grafana Alloy](https://grafana.com/docs/alloy/latest/)は、Grafana Labsが開発するOSSのテレメトリ収集エージェントです。

メトリクス・ログ・トレース・プロファイルをこれ1つで統合的に扱うことができます。[Grafana Agentの正式な後継製品](https://grafana.com/blog/2024/04/09/grafana-agent-to-grafana-alloy-opentelemetry-collector-faq/)であり、Promtailが担っていたログ収集機能もAlloyに統合されています。OpenTelemetryをベースに作られているため、柔軟で強力なデータパイプラインを構築できるのが特徴です。

## 2. 構成説明

- EKSクラスタ: メトリクスの管理先となるPrometheusと、可視化ツールであるGrafanaをすでに構築済みです
- EC2インスタンス: 監視対象であるEKSクラスタ外部のサーバです。このサーバ上にGrafana Alloyをコンテナとして構築します
  - EC2インスタンスの準備: Alloyをコンテナとして動かすため、監視対象のEC2インスタンスにはDockerおよびDocker Composeを事前にインストールしています。
- 通信経路の確保: 本記事では詳細を割愛しますが、AlloyからPrometheusへデータを送信できるよう、事前にセキュリティグループの設定を行っています。
- 本記事作成時の環境: 今回の検証で使用した、主なソフトウェアの構成は以下の通りです

    | ツール | バージョン |
    | ---- | ---- |
    | Grafana | 12.0.0 |
    | Grafana Alloy | 1.8.3 |
    | Prometheus | 3.4.1 |

<img src="/images/20250825b/Alloy記事作成_構成図.drawio.png" alt="Alloy記事作成_構成図.drawio.png" width="882" height="537" loading="lazy">

## 3. 今回の検証で利用するAlloyコンポーネントの概要

本記事の中では以下のコンポーネントを利用しています。

実際の利用方法と記載内容は後述します。

- [prometheus.export.unix](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.exporter.unix/)
    メトリクスを生成します。
    このコンポーネントを利用することで、別途node_exporterをインストールしなくても、CPU、メモリ、ディスクスペース、ディスクI/O、ネットワークなどUNIXシステムのメトリクスを公開できます。
- [prometheus.scrape](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/)
    exporterが公開したメトリクスを定期的に収集(スクレイプ)します。
    指定されたtargetsのHTTPエンドポイントにアクセスしてデータを取得します。
    収集したメトリクスは、`forward_to`で指定された次のコンポーネントに渡されます。
- [prometheus.relabel](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.relabel/)
    Prometheus形式のメトリクスが持つラベルを、動的なルールに基づいて書き換え・追加・削除します。
    正規表現を使ったラベルの生成や、不要なメタデータラベルの削除など、メトリクスの整形・加工を担います。
- [prometheus.remote_write](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/)
    収集・加工したメトリクスを、最終的な保存先であるPrometheus互換のバックエンドに送信します。
    Prometheus Remote Writeプロトコルを使って、設定されたendpointのURLにデータをまとめて送信します。
    今回、送信先はPrometheusにしていますが、Grafana MimirやGrafana Cloudなども指定可能です。
    送信先のエンドポイントURLはIngressやNodePortまたはTargetGroupBinding等で設定したものを指定します。

## 4. 設定方法

### 4-1. コンポーネント同士の連携方法

Grafana Alloyではconfig.alloyという設定ファイルで、機能単位である「コンポーネント」を繋ぎ合わせ、テレメトリデータの取得ができます。

設定ファイルは、Grafana agentの設定言語である[river言語](https://grafana.com/docs/agent/latest/flow/concepts/config-language/)をベースに記述され、宣言的に記述できるという特徴があります。

この連携には、データを次のコンポーネントに押し出すPush方式と、他のコンポーネントからデータを引き出すPull方式があります。

Push方式は、Alloy内部にてコンポーネント間でデータを渡す仕組みで、`forward_to`引数で出力先を指定し、データを受け取る側のコンポーネントは`receiver`という入力口を持っています。Pull方式も、Alloy内部でコンポーネントが連携するための仕組みで、`targets`引数で入力元を指定します。データを提供する側のコンポーネントは`targets`という監視対象リストを公開しています。

他のコンポーネントを参照する際は、`<コンポーネント種別>.<コンポーネント名>.<公開名>`の形式で記述します。

- コンポーネント種別 : prometheus.scrapeやprometheus.exporter.unixなど
- コンポーネント名   : "internal_node_metrics"や"set_instance_name"など、自分で付けた名前
- 公開名            : receiverやtargetsなど、各コンポーネントが公開している名前

### 4-2. config.alloy

config.alloyの設定です。

```js config.alloy
// Node Exporter相当の機能をAlloy内部で提供
prometheus.exporter.unix "default" {
  // コンテナ内でホストOSの各パスがどこにマウントされているかを指定(compose.ymlのvolumes設定と合わせる)
  // procfs: CPU使用率、メモリ情報、実行中プロセスの一覧などの情報
  procfs_path = "/host/proc"
  // sysfs: 接続されているデバイスやドライバに関する情報
  sysfs_path  = "/host/sys"
  // rootfs_path: ホストOSのルートファイルシステム(/)のマウントパスを指定,ディスク使用量などのファイルシステム関連のメトリクスを正しく収集できるようにする
  rootfs_path = "/rootfs"
}

// prometheus.exporter.unixが公開するメトリクスをスクレイプする設定を記載
prometheus.scrape "internal_node_metrics" {
  targets    = prometheus.exporter.unix.default.targets          // 内部エクスポーターターゲットを指定
  forward_to = [prometheus.relabel.set_instance_name.receiver]   // スクレイプしたメトリクスの転送先の指定
  scrape_interval = "15s"                                        // メトリクス収集頻度を15sに変更(デフォルトは60s)
}

// 収集したメトリクスのラベルを整形
// コンポーネントを"set_instance_name"という名前で定義
prometheus.relabel "set_instance_name" {
  // relabelコンポーネントからの転送先を、remote_writeに設定
  forward_to = [prometheus.remote_write.stg_prometheus.receiver]

  // 書き換えルールを定義
  rule {
    // 書き換えの元となるラベルとして "instance" を指定
    source_labels = ["instance"]
    // 上書きしたいラベルとして "instance" を指定
    target_label  = "instance"
    // 上書きする値として、環境変数からホスト名を直接取得
    replacement   = env("HOSTOS_HOSTNAME")
  }
}

// Prometheusにメトリクスを送信
// Prometheusへの送信設定を定義
prometheus.remote_write "stg_prometheus" {
  // メトリクスの送信先となるPrometheusサーバのremote_writeエンドポイントURLを指定
  endpoint {
    url = "http://<prometheus-endpoint>/api/v1/write"
  }

  // WAL(Write-Ahead Log)の設定
  // 送信先のサーバがダウンしている場合などに、メトリクスを一時的にディスクに保存してデータ損失を防ぐための仕組みです。
  wal {
    // 正常に送信が完了した古いデータを、WALから削除する頻度を1時間に設定。
    truncate_frequency = "1h"
  }

  // このAlloyインスタンスから送られる全てのメトリクスに共通のラベルを付与
   external_labels = {
     cluster = "external",
   }
}
```

この設定によって構築される、メトリクスデータのパイプラインを図にすると以下のようになります。

<img src="/images/20250825b/config.alloyのパイプライン.png" alt="config.alloyのパイプライン.png" width="1144" height="691" loading="lazy">

### 4-3. その他のファイル、ディレクトリ構成

作成したconfig.alloyを読み込み、Alloyコンテナを起動するため、compose.ymlは以下のように記載しています。

```yml compose.yml
services:
  grafana-alloy:
    image: grafana/alloy:v1.8.3     # 今回の検証で利用したバージョンです
    container_name: grafana-alloy
    hostname: grafana-alloy
    restart: always
    user: root
    pid: host  # Node Exporter機能がホストのプロセス情報を正確に収集するため
    environment:
      - TZ=Asia/Tokyo
      - HOSTOS_HOSTNAME=${HOSTNAME}
    volumes:
      - /opt/volumes/grafana_alloy/grafana_alloy:/grafana_alloy/:ro
      # Alloy の WAL (Write-Ahead Log) データ用永続ボリューム
      - /data/app/grafana_alloy/wal:/var/lib/alloy/data
      - /etc/localtime:/etc/localtime:ro
      # prometheus.scrapeのためにホストの重要なパスをマウント
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
      #diskstatsコレクターが参照するため
      - /run/udev/data:/run/udev/data:ro
    ports:
      - "12340:12340"
    command:
      # 'run' サブコマンドで設定ファイルを指定してAlloyを実行
      - "run"
      - "/grafana_alloy/etc/config.alloy"
      # --storage.path で WAL などのデータディレクトリを指定 (volumes でマウントしたパスと合わせる)
      - "--storage.path=/var/lib/alloy/data"
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"

networks:
  default:
    external:
      name: stg_network
```

- /data配下のディレクトリ構成
AlloyのWAL(Write-Ahead Log)機能によるデータ永続化のため、compose.ymlでホストOSのディレクトリマウントを行っています。
送信先のPrometheusがダウンしていても、Alloyは未送信のメトリクスをこのWALに一時的に保存します。
コンテナを再起動してもデータが消えないようにホストOSに保存し、メトリクスの損失を防ぎます。
マウント先のディレクトリまで作成後、ディレクトリ配下に作成されるファイルやディレクトリは、Alloyが自動で作成・削除します。

```sh
/data/app/grafana_alloy/
└── wal                                        # WALデータが格納されます
    ├── prometheus.remote_write.stg_prometheus
    │   └── wal
    │       ├── 00000325
    │       └── checkpoint.00000324
```

- Prometheus側の設定
Grafana Alloyからデータを受け取るには、送信先であるPrometheus側でremote-writeリクエストを有効にする必要があります。
今回、Prometheusはkube-prometheus-stackのHelm Chartを利用しているので、values.yamlを編集してこの設定を有効にしています。
  - values.yamlの設定方法
  values.yamlで`--web.enable-remote-write-receiver`という起動オプションを追記する必要があります。

      ```yaml
          containers:
      - name: prometheus
        args:
        # 下の行を追記
        - "--web.enable-remote-write-receiver"
      ```

      この設定を追記し反映させることで、PrometheusがAlloyからのデータを受け付けられるようになりました。

## 5. Grafana上からダッシュボードを用いたメトリクス可視化

ダッシュボードにはGrafana Labsから提供されている[Node Exporter Full](https://grafana.com/grafana/dashboards/1860-node-exporter-full/) を利用します。

上記URLからJSONをダウンロードして、Grafana上の`Dashdoards`を選択し、`Import dashboard`でJSONをアップロードしダッシュボードを作成します。

### 5-1. Variables(変数)の設定

GrafanaのVariables設定を行い、監視対象のサーバをドロップダウンで選択できるように設定します。

1. ダッシュボード右上の`edit`をクリックし、`Settings`を選択します。
1. Variablesタブに移動してnodeを選択します
1. Label filtersに設定されているラベルを削除して、Label filtersに`cluster = external`を設定
1. 画面下のRun Queryを押して対象のサーバが表示されたら、`Save dashboard`から保存します。

### 5-2. 主なダッシュボードパネル

「Node Exporter Full」ダッシュボードには多くの情報が表示されますが、一部パネルについてご紹介します。

- **CPU Basic**: CPUの基本的な使用率をuser,system,iowaitなどのモード別に表示し、サーバの負荷状況を確認できます
- **Memory Basic**: システム全体のメモリ使用量、空き容量、バッファやキャッシュとして利用されている量が表示され、メモリ不足の兆候を把握できます
- **ディスク Space Used Basic**: ディスクごとの使用率(％)を確認できます
- **Network Traffic Basic**

ネットワークインタフェースごとの送受信トラフィック(MB/s)を表示し、通信量の急増や異常を検知できます。

インポートしたダッシュボードは自由にカスタマイズが可能なので、必要に応じてパネルの追加や削除ができます。

### 5-3. 複数サーバの監視

`4. 設定方法`に記載した設定のサーバを複数台構築した場合、`instance`を切り替えることで監視対象サーバを切り替えることができます。

<img src="/images/20250825b/Grafana_dashboards.png" alt="Grafana_dashboards.png" width="1200" height="624" loading="lazy">

### 5-4. 監視設定

今回はメトリクスの可視化までを行いましたが、収集したメトリクスを元に閾値を設定し、アラート設定も可能です。

アラートの通知先として、Slackやメール等、様々なツールを指定できるため、システムの異常を迅速に検知する体制を構築できます。

## 6. まとめ

Grafana Alloyの機能の一部である、メトリクスの収集・送信設定を行い、複数サーバの監視にも対応できるダッシュボードを作成しました。

コンポーネントの記載方法は少し独特ですが、慣れたらパズルのように組み合わせて直感的に設定できそうと感じました。Alloyはメトリクス以外にもログ、トレース、プロファイルも収集できます。

今後はこれらの機能も試し、Grafanaを利用したデータ利活用をさらに広げていきたいです。
