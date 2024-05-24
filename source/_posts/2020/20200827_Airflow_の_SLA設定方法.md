---
title: "Airflow の SLA設定方法"
date: 2020/08/27 00:00:00
postid: ""
tag:
  - Airflow
  - Python
category:
  - Infrastructure
thumbnail: /images/20200827/thumbnail.png
author: 多賀聡一朗
lede: "TIG DXチームの多賀です。Airflowの SLA 設定方法を紹介します。sla_miss_callback 関数は以下の引数が必要"
---

<img src="/images/20200827/feature-image.png" class="img-middle-size" loading="lazy">

## 概要

TIG DXチームの多賀です。Airflowの SLA 設定方法を紹介します。

## TL;DR

sla_miss_callback 関数は以下の引数が必要

```py
def sla_alert(
    dag: DAG,
    task_list: str,
    blocking_task_list: str,
    slas: List[SlaMiss],
    blocking_tis: List[TaskInstance]
):
```

## SLA設定

SLA とは Service Level Agreement の略で、サービス提供者が保証する品質を明示する際に利用されます。当 Airflow の SLA は、各 Task が指定の時間内に終わることを保証する形で定義されます。

そのため、Airflow は 各 Task に対して SLA 値(時間) を設定できます。

[Concepts-SLAs](https://airflow.apache.org/docs/stable/concepts.html#slas)

SLA 値は以下のように Task に対して定義します。10秒以上 Task が実行されると SLA 違反となります。

```py
t1 = PythonOperator(
    task_id='sla_test',
    python_callable=example_call,
    sla=timedelta(seconds=10), # SLA 設定
    dag=dag
)
```


SLA 違反をした Task が発生した場合、以下2パターンで通知をすることができます

- Email
- sla_miss_callback (Function) の任意実装

注意点として、SLA 違反のチェックタイミングは、対象タスクの実行完了後ではなく、対象タスクの次のタスクの実行前(別 run_id の可能性もあり) になります。

Task 実行時に、過去の SLA 違反の一覧 (sla_miss テーブル) を取得して通知する仕組みになっています。

また、Task が実行されているいないに関わらず、 start_time と schedule_interval と 現在時刻から 実行されているべき Task を洗い出してエラー通知します。過去分の再実行等を実施すると、現在時刻まで実行されているべき Task まとめて SLA 違反が出たりします。

### Email 設定方法

ドキュメントと実装を読む限り、Operator の引数に渡す必要がありそうでした。
email が設定されていない場合は、エラーになることなく Task の実行が完了します。

```py
t1 = PythonOperator(
    task_id='sla_test',
    python_callable=example_call,
    sla=timedelta(seconds=10),
    email="xxx.yyy@example.com",
    dag=dag
)
```

### sla_miss_callback 設定方法

ドキュメント上は、関数を設定と記載されてますが、以下のように設定しても動きません。

https://airflow.readthedocs.io/en/1.10.11/_api/airflow/models/dag/index.html#airflow.models.dag.DAG

```py

def sla_alert():
    # alert 設定

def example_call():
    # task 処理

dag = DAG(
    dag_id,
    start_date=datetime(2020, 8, 1, 10, 0),
    schedule_interval=timedelta(days=1),
    sla_miss_callback=sla_alert,
)

t1 = PythonOperator(
    task_id='sla_test',
    python_callable=example_call,
    sla=timedelta(seconds=10),
    dag=dag
)

```

Scheduelr のログを見ると以下がはかれています。

```sh
[2020-08-11 18:27:00,766] {{scheduler_job.py:541}} ERROR - Could not call sla_miss_callback for DAG example_sla
Traceback (most recent call last):
  File "/Users/xxx/.venv/lib/python3.7/site-packages/airflow/jobs/scheduler_job.py", line 537, in manage_slas
    blocking_tis)
TypeError: sla_alert() takes 0 positional arguments but 5 were given
```

#### 修正

ソースコードを grep してみると 以下の実装を見つけました。
引数が必要みたいですね。

https://github.com/apache/airflow/blob/master/airflow/jobs/scheduler_job.py#L455

```py
# schduler_job.py

if dag.sla_miss_callback:
    # Execute the alert callback
    self.log.info(' --------------> ABOUT TO CALL SLA MISS CALL BACK ')
    try:
        dag.sla_miss_callback(dag, task_list, blocking_task_list, slas,
                                blocking_tis)
        notification_sent = True
    except Exception:  # pylint: disable=broad-except
        self.log.exception("Could not call sla_miss_callback for DAG %s",
                            dag.dag_id)
```

DAG の設定を修正してみると、無事に動きました。

```py
def sla_alert(
    dag: DAG,
    task_list: str,
    blocking_task_list: str,
    slas: List[SlaMiss],
    blocking_tis: List[TaskInstance]
):
    dag_id = dag.dag_id
    task_id = slas[0].task_id
    execution_date = "{}".format(slas[0].execution_date) # UtcDateTime 型のため
```

#### sla_miss_callback の引数

| 引数 | 型 | 値 |
| :-- | :---- | :------------ |
| dag| airflow.DAG| DAG オブジェクト dag.dag_id で ID取得可能 |
| task_list | str | 過去のSLA エラーの Task の List <br> 以下フォーマットの文字列リスト <br> `${task_id} on ${execution_date}`|
| blocking_task_list | str | 過去の失敗した Task の List <br> 以下フォーマットの文字列リスト <br> `${task_id} on ${execution_date}` |
| slas | List[airflow.models.SlaMiss] | 過去のSLA エラーオブジェクトの List|
| blocking_tis | List[airflow.models.TaskInstance]| 失敗した TaskInstance の List |

SlaMiss
https://airflow.apache.org/docs/stable/_api/airflow/models/slamiss/index.html

TaskInstance
https://airflow.apache.org/docs/stable/_api/airflow/models/taskinstance/index.html

## 所感

ドキュメントに記載してほしいところでしたが、見つけられなかったため別途整理しました。

