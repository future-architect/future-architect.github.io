---
title: "はじめてGlue Python Shell Jobを使う時のつまづきポイント集"
date: 2025/08/22 00:00:00
postid: a
tag:
  - AWS
  - Glue
  - ETL
  - Glue Python Shell
  - 初心者向け
category:
  - Infrastructure
thumbnail: /images/2025/20250822a/thumbnail.jpg
author: 八木雅斗
lede: "業務でGlue Python Shell Job（以降、Python Shell）を利用する機会があったのですが、「Lambdaとかだと簡単にできるのに、Python Shellだとできないんか～」とか、ドキュメント上でPySparkジョブ or Python Shellのどちらについて記載しているのか分かりにくかったりと..."
---

<img src="/images/2025/20250822a/top.jpg" alt="" width="700  " height="700">

# はじめに

TIGの八木雅斗です。

業務でGlue Python Shell Job（以降、Python Shell）を利用する機会があったのですが、「Lambdaとかだと簡単にできるのに、Python Shellだとできないんか～」とか、ドキュメント上でPySparkジョブ or Python Shellのどちらについて記載しているのか分かりにくかったりと、戸惑うことがありました。それらの悩みポイントをまとめます。

# ログ出力先のCloudWatch Logsのロググループを選択できない

PySparkジョブでは、`--continuous-log-logGroup`でロギング先のロググループを選択可能です。

一方、Python Shellでは出力先のロググループを指定することはできません。

ログは下記のロググループに出力されるよう設定されており、AWSアカウント上のすべてのPython Shellのログが、以下のロググループに出力されるようになっています。

- 標準出力先
  - `/aws-glue/python-jobs/output`
- 標準エラー出力先
  - `/aws-glue/python-jobs/error`

そのため、指定したロググループにログを出力したい場合は、Pythonスクリプト上からCloudWatch Logsにログを送信する必要があります。

具体的な対処法としては、boto3を利用した下記のようなカスタムハンドラをルートロガーに設定し、指定したロググループ/ログストリームにロギングする等があります。

```py
class CloudWatchLogsHandler(logging.Handler):
    def __init__(self, log_stream_name: str):
        super().__init__()
        self.client = boto3.client("logs")
        # Glueジョブの引数からログ出力先のロググループを取得
        args = getResolvedOptions(sys.argv, ["LOG_GROUP_NAME"])
        log_group_name = args["LOG_GROUP_NAME"]
        self.log_group_name = log_group_name
        self.log_stream_name = log_stream_name
        # ジョブの実行毎にログストリームを分けるために、インスタンス作成時にログストリームを作成
        self.client.create_log_stream(logGroupName=self.log_group_name, logStreamName=self.log_stream_name)

    def emit(self, record: logging.LogRecord):
        log_message = self.format(record)
        timestamp = int(datetime.now().timestamp() * 1000)

        try:
            self.client.put_log_events( # ログを送信
                logGroupName=self.log_group_name,
                logStreamName=self.log_stream_name,
                logEvents=[{"timestamp": timestamp, "message": log_message}],
            )
        except ClientError as e:
            raise RuntimeError(f"Failed to put log event to CloudWatch Logs.: {e}") from e

root_logger = logging.getLogger()
handler = CloudWatchLogsHandler("test_log_stream")
root_logger.addHandler(handler)
```

※Pythonスクリプト上で出力するアプリケーションログでなく、Python Shellが出力するシステムログに関しては引き続き`/aws-glue/python-jobs/xxx`に出力されます。

- [How to use a CloudWatch custom log group with Python Shell Glue job?](https://stackoverflow.com/questions/61625190/how-to-use-a-cloudwatch-custom-log-group-with-python-shell-glue-job)
- [Logging HOWTO](https://docs.python.org/ja/3/howto/logging.html)

# 自動でメトリクスが取れない

下記の設定もPySpark用の設定であるため、有効化してもメトリクスは取得できません。

- `--enable-job-insights`
- `--enable-observability-metrics`

Google検索すると、[Monitoring with AWS Glue job run insights](https://docs.aws.amazon.com/glue/latest/dg/monitor-job-insights.html)がヒットして設定できそうに見えますが、よく見ると「Spark and PySpark jobs」配下にあり、PySpark用の設定値であることが分かります（見落としがち）

もしCPUやメモリの利用状況をモニタリングしたい場合は、下記のようにpsutilなどを使ってモニタリングする必要があります。

```py
import time
import threading
import psutil

def resource_monitor():
    """バックグラウンドで継続的にリソースを監視するタスク"""
    while True:
        cpu = psutil.cpu_percent()
        mem = psutil.virtual_memory().percent
        print(f"CPU: {cpu}% | Memory: {mem}%")
        time.sleep(1) # メインスレッドに影響のない間隔で設定する

# メインスレッド終了時に一緒に終了させる
monitor_thread = threading.Thread(target=resource_monitor, daemon=True)
monitor_thread.start()
# ～メインの処理～
```

# 選択できるPythonのパッチバージョンが古い

2025.08現在、Python Shell ジョブでは、Pythonのバージョンにv3.6またはv3.9を利用できます。

ただ、Python Shellでのv3.9のバージョンは3.9.x系の最新版かと思いきや、2022年1月にリリースされた3.9.10になっています。

```py
# Python Shellにて
import sys
print(sys.version)
#=> 3.9.10 (main, Jun 2 2022, 18:40:40) [GCC 7.3.1 20180712 (Red Hat 7.3.1-14)]
```

開発環境やビルド環境においてバージョン違いで動かなくなることを避けるため、`3.9.10`まで指定する必要がありました。

- [AWS Glue での Python シェルジョブに関するジョブプロパティの設定](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/add-job-python.html)

# デフォルトで利用できるライブラリのバージョンが古い

Python Shellの実行環境では、boto3などのライブラリがサポートされており、追加の設定なしに利用できます。
ただし、いずれのライブラリも微妙に古いため、ものによっては使えない機能がある可能性があります。

```py
# Python Shellにて
import boto3
print(boto3.__version__) # =>1.21.21
```

もし他のバージョンのライブラリを利用したい場合は、PyPIに登録されているモジュールを追加できる`--additional-python-modules`オプションを利用することで差し替えることが可能です。

> --additional-python-modules オプションでコンマ区切りの Python モジュールのリストを指定することで、新しいモジュールを追加したり、既存のモジュールのバージョンを変更したりできます。

- [サポートされている Python シェルジョブのライブラリ](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/add-job-python.html#python-shell-supported-library)

# 存在しない実行パラメータにアクセスするとSystemExitエラーで落ちる

Python ShellではgetResolvedOptionsを利用して実行パラメータにアクセスできます。

- [getResolvedOptions を使用して、パラメータにアクセスする](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-get-resolved-options.html)

しかし、存在しないパラメータにアクセスしようとすると、Exceptionを継承していないSystemExitのエラーが発生するようになっているため、Exceptionでcatchができません。

具体的には、argparse.ArgumentParserクラスを継承したインスタンスの以下の`parse_known_args`メソッド内でArgumentErrorが発生し、sys.exit(2)が呼ばれるようになっています。

- https://github.com/awslabs/aws-glue-libs/blob/9d8293962e6ffc607e5dc328e246f40b24010fa8/awsglue/utils.py#L119
- https://github.com/python/cpython/blob/06fc882eac0e59220a7b8b127a1e7babe0055d45/Lib/argparse.py#L1859

もしオプションの実行パラメータを設定する場合は、[PEP 8](https://peps.python.org/pep-0008/)で非推奨な方法になりますが、例外の基底クラスであるBaseExceptionでcatchする必要があります（↓例）

```py
import sys
from awsglue.utils import getResolvedOptions

trace_id: str
try:
    args = getResolvedOptions(sys.argv, ['TRACE_ID'])
    trace_id = args['TRACE_ID']
except BaseException:
    trace_id = "unset"
```

- [例外のクラス階層](https://docs.python.org/ja/3.9/library/exceptions.html#exception-hierarchy)

## マネジメントコンソール上での変更で想定外の差分が発生する

原因は不明ですが、マネジメントコンソール上から設定変更を行うと、下記の実行パラメータがPython Shellのデフォルト値に勝手に変更されてしまうことがあります。

- glue_version
  - デフォルト値： `3.0`
- --enable-job-insights
  - デフォルト値： `false`
- --enable-observability-metrics
  - デフォルト値： `false`
- execution_class
  - デフォルト値： `STANDARD`

> 💡利用ツールのバージョン Terraform v1.12.2 / AWS provider v6.3.0

いずれのパラメータもPython Shellの挙動に影響しないですが、Terraformで管理しているとplan実行時に差分が表示されノイズになるので、下記のようにデフォルト値を設定しておくと良いと思います。

```sh
resource "aws_glue_job" "sample" {
  # ~略~
  glue_version = "3.0"
  execution_class = "STANDARD"
  default_arguments = {
    "--job-language"                 = "python",
    "--enable-job-insights"          = false,
    "--enable-observability-metrics" = false,
  }
  # ~略~
}
```

※ちなみに、Glue Python Shell Jobという名前ですが、GlueVersionの設定は動作に影響しないようです。実際に、AWS CLI経由でGlueVersionを1や2に設定しても、Python v3.9の環境で正常に起動していました。

> GlueVersion 設定は Python シェルジョブの動作に影響しないため、GlueVersion をインクリメントするメリットはありません。
> [AWS Glue バージョンサポートポリシー](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/glue-version-support-policy.html)

- [aws_glue_job](https://registry.terraform.io/providers/hashicorp/aws/6.3.0/docs/resources/glue_job)

# 最後に

Python Shellをはじめて使う時に戸惑いそうな仕様について共有しました。

今回の記事では、ややPython Shellのネガティブな内容が多くなりましたが、実行時間制限がLambdaの15分よりもはるかに長い48時間であり、サーバーレス環境で実行できる等のメリットがあるため、Lambdaでは処理できないケースでは選択肢になると思います。

性能限界が1DPU(4vCPUと16GBのメモリ)ということも頭に入れつつ、もし非機能要件を満たせない可能性がある場合はECSに移行しやすい構成にしておくと安心して利用できると思います。

Python Shellは細かなつまづきポイントが多いので、これから使おうと思っている方のお役に立てれば幸いです🙏
