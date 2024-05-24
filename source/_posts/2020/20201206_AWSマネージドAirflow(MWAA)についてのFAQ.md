---
title: "AWSマネージドAirflow(MWAA)についてのFAQ"
date: 2020/12/06 00:00:00
postid: ""
tag:
  - Airflow
  - AWS
  - Python
  - ジョブ設計
category:
  - Programming
thumbnail: /images/20201206/thumbnail.png
author: 多賀聡一朗
lede: "AWS マネージド Airflow  が 2020/11/24 にリリースされました。 [Introducing Amazon Managed Workflows for Apache Airflow サービスを利用するにあたって知りたかったことを調査し、FAQ ベースで整理しましたので公開します。"
---

## 概要

[フューチャー Advent Calendar 6日目](https://qiita.com/advent-calendar/2020/future) です。TIG DXチーム所属の多賀です。

AWS マネージド Airflow (MWAA) が 2020/11/24 にリリースされました。

* [Introducing Amazon Managed Workflows for Apache Airflow (MWAA)](https://aws.amazon.com/jp/blogs/aws/introducing-amazon-managed-workflows-for-apache-airflow-mwaa/)

サービスを利用するにあたって知りたかったことを調査し、FAQ ベースで整理しましたので公開します。

<img src="/images/20201206/wordmark_1.png" loading="lazy">
[Airflow logos](https://cwiki.apache.org/confluence/display/AIRFLOW/Airflow+logos) からの画像


## MWAA (Managed Workflow for Apache Airflow) とは?

[Airflow](https://airflow.apache.org/) のマネージドサービスで、インスタンスやDB管理不要で、Airflowを利用することができます。Airflow 完全互換を謳っており、フォークしたソースではなく、Airflow 本体が利用されています。Auto Scaling に対応しており、 worker 数を設定した最大数まで自動でスケールアップしてくれます。また、ログインのための、ユーザー権限制御に IAM を利用しており、詳細な権限制御が可能です。

[MWAA 公式ドキュメント](https://docs.aws.amazon.com/mwaa/latest/userguide/what-is-mwaa.html)

## MWAA FAQ

- [Airflow のバージョンは?](#airflow-のバージョンは)
- [Executorはどのタイプ?](#executorはどのタイプ)
- [DAGの定義と配置方法は?](#dagの定義と配置方法は)
- [Python のライブラリの取得方法は？](#python-のライブラリの取得方法は)
- [階層化した dag の読み込みは可能か?](#階層化した-dag-の読み込みは可能か)
- [Airflow UI へのアクセス方法は?](#airflow-ui-へのアクセス方法は)
- [metadata DBの移行は可能?](#metadata-dbの移行は可能)
- [ネットワーク構成は?](#ネットワーク構成は)
- [Airflow CLIの実行方法は?](#airflow-cliの実行方法は)
- [ワンタイムログイントークンの発行方法は?](#ワンタイムログイントークンの発行方法は)

### Airflow のバージョンは?

現状(2020/12/03)は `1.10.12` のみが指定できます。
パッチバージョンアップグレードは7日以内、マイナーバージョンアップグレードは30日以内に自動で実行されます。
アップグレードに失敗した場合は、自動復旧されます。

### Executorはどのタイプ?

[Celery Executor](https://airflow.apache.org/docs/stable/executor/celery.html) を利用している旨が、[公式ドキュメント](https://docs.aws.amazon.com/mwaa/latest/userguide/what-is-mwaa.html)に記載されています。

Celery Executor の構成は以下の図の通りです。
<img src="/images/20201206/graphviz-91fd3ca4f3dc01a69b3f84fbcd6b5c7975945ba4.png" loading="lazy">
[Architecture-Celery Executor](https://airflow.apache.org/docs/stable/_images/graphviz-91fd3ca4f3dc01a69b3f84fbcd6b5c7975945ba4.png) からの画像

プロセスの種類は全部で3つで、webserver, scheduler と worker になります。
履歴やメタデータ管理のため、DB (metadata DB) があります。scheduler と worker の間に キューが存在しているはずですが、公式には記載されていません。(Elatsic Cache (Redis) の可能性が高いかなと推測してます。)

各プロセスは Fargate を利用しており、コンテナ起動です。scheduler と worker は VPC 内での実行が保証されています。metadata DB と webserver は サービスアカウントレベルで共有して利用する模様です。


### DAGの定義と配置方法は?

DAGファイルは S3 に配置することで、自動で読み込みを実施してくれます。

配置先は、MWAA 作成時に指定します(更新も可能です)。plugin も同様に S3 に配置します。 配置する際は、plugin のみ zip に固めます。

※ S3 バケット名は、 `airflow-` プレフィックスで始まる必要があります。
<img src="/images/20201206/スクリーンショット_2020-12-03_21.32.58のコピー.png" loading="lazy">


### Python のライブラリの取得方法は？

`requirements.txt` を S3 に配置することで、ライブラリを読み込んでくれます。
配置先は MWAA に設定します。
<img src="/images/20201206/スクリーンショット_2020-12-03_21.32.58のコピー2.png" loading="lazy">



### 階層化した dag の読み込みは可能か?

Airflow 本来の実装方法と変わらずに実現できます。
以下コードを ./dags 直下に指定します。

```py
import os
from airflow.models import DagBag
# ディレクトリを指定
dags_dirs = ['~/dags/sample']

for dir in dags_dirs:
    dag_bag = DagBag(os.path.expanduser(dir))

    if dag_bag:
        for dag_id, dag in dag_bag.dags.items():
            globals()[dag_id] = dag
```

S3 への配置方法は、以下です。

```bash
.
└── dags
    ├── add_dag_bags.py
    └── sample
        └── test_dag.py
```

### Airflow UI へのアクセス方法は?

AWS コンソール上に UI へのリンクが表示されます。
<img src="/images/20201206/スクリーンショット_2020-12-03_22.22.23.png" loading="lazy">

上記リンクを押下すると、認証を自動で実施後に以下の画面が表示されます。
<img src="/images/20201206/スクリーンショット_2020-12-03_22.23.47.png" loading="lazy">

ちなみに IAM での認証が必須のため、直接URLにアクセスするとログインを求められます。
<img src="/images/20201206/image.png" loading="lazy">



### metadata DBの移行は可能?

現在(2020/12/03) サポートされていません。過去の実行履歴は metadata DB に保持されているため、現状MWAA へ移行する際は、履歴なしでの移行になります。


### ネットワーク構成は?

VPC の設定が必須です。

構成としては、以下が必要との記載があります。

[詳細はこちら](https://docs.aws.amazon.com/mwaa/latest/userguide/vpc-create.html)

- public subnet: 2リージョン
- private subnet: 2リージョン
- inbound/outbound all security group
- Elastic IP: 2つ
- Internet Gateway
- Nat Gateway

※ 適当に subnet 指定した場合、起動しませんでした..


### Airflow CLIの実行方法は?

CLI は http ごしに実行することができます。

① aws cli でトークンを取得

```sh
aws mwaa create-cli-token --name ${airflow name}
{
    "CliToken": "${トークン}",
    "WebServerHostname": "${ホスト名}"
}
```

② airflow cli を実行
リクエスト Body にコマンドを指定します。標準出力と、標準エラー出力が base64 エンコードされて返ってきます。

```sh
export WEB_SERVER_HOSTNAME="${ホスト名}"
export CLI_TOKEN="${トークン}"
curl --request POST "https://$WEB_SERVER_HOSTNAME/aws_mwaa/cli" \
    --header "Authorization: Bearer $CLI_TOKEN" \
    --header "Content-Type: text/plain" \
    --data-raw "version"
{
    "stderr": "",
    "stdout": "Q2xvdWR3YXRjaCBsb2dnaW5nIGlzIGRpc2FibGVkIGZvciBDbG91ZHdhdGNoUHJvY2Vzc29ySGFuZGxlcgoxLjEwLjEyCg=="
}
```

デコードすると、コマンド実行結果を表示できます。

```sh
❯ echo 'Q2xvdWR3YXRjaCBsb2dnaW5nIGlzIGRpc2FibGVkIGZvciBDbG91ZHdhdGNoUHJvY2Vzc29ySGFuZGxlcgoxLjEwLjEyCg==' | base64 -D
Cloudwatch logging is disabled for CloudwatchProcessorHandler
1.10.12
```

### ワンタイムログイントークンの発行方法は?

Airflow UI にAWS コンソールからでなく、トークンのみでログインさせることもできます。
まず、ログイン用のトークンを取得します。トークンは60秒間のみ、有効です。

```sh
❯ aws mwaa create-web-login-token --name MyAirflowEnvironment --profile midori
{
    "WebServerHostname": "${ホスト名}",
    "WebToken": "${トークン}"
}
```

取得したトークンを `#` 以降に指定して、URLアクセスすることでログインできます。

```
https://${WebServerHostname}/aws_mwaa/aws-console-sso?login=true#${WebTokenを指定}
```

## 感想

MWAA を利用するにあたって、気になる点を調べてみました。

EC2 上への構築では、EC2複数台、RDS、Redis と管理するコンポーネントが多かったので、マネージドで気軽に利用できるようになり、より今後広がりを見せるかなと思います。

現状、機能的には十分足りており、実利用は問題なさそうです。ただ、metadata DBの移行はできないので機能としてサポートされると嬉しいですね。


## 参考

- [Introducing Amazon Managed Workflows for Apache Airflow (MWAA)](https://aws.amazon.com/jp/blogs/aws/introducing-amazon-managed-workflows-for-apache-airflow-mwaa/)
- [MWAA公式ドキュメント](https://docs.aws.amazon.com/mwaa/latest/userguide/what-is-mwaa.html)
- [AWSのマネージドAirflow、Amazon Managed Workflow for Apache Airflow（MWAA）が登場！](https://dev.classmethod.jp/articles/amazon-managed-workflows-for-apache-airflow-mwaa-ga/)
- [Amazon Managed Workflows for Apache Airflow（MWAA）によるデータパイプラインの構築 #reinvent #emb007](https://dev.classmethod.jp/articles/reinvent2020-emb007-data-pipelines-with-amazon-managed-workflows-for-apache-airflow/)
