---
title: "Airflow Breeze を利用してローカルで Airflow を起動する"
date: 2021/05/28 00:00:00
postid: a
tag:
  - Airflow
  - OSS
category:
  - Programming
thumbnail: /images/20210528a/thumbnail.png
author: 多賀聡一朗
lede: "OSS として Airflow へ貢献するにあたり、ローカルでの実行やテストの環境整備が必要になります。また、 Airflow を利用するにあたってもローカルでの動作確認をしたいケースは多いかと思います。Airflow では、 Airflow Breeze と呼ばれる環境が整備され、公式より提供されています。当記事では、 Airflow Breeze について概要を記載し、 Airflow への OSS 貢献の入り口となれば良いと考えています。"
---
## 概要

TIG の多賀です。

OSS として Airflow へ貢献するにあたり、ローカルでの実行やテストの環境整備が必要になります。また、 Airflow を利用するにあたってもローカルでの動作確認をしたいケースは多いかと思います。

Airflow では、 `Airflow Breeze` と呼ばれる環境が整備され、公式より提供されています。当記事では、 `Airflow Breeze` について概要を記載し、 Airflow への OSS 貢献の入り口となれば良いと考えています。

## Airflow Breeze とは
Airflow Breeze とは、ローカルで Airflow を簡単に実行できるように整備された環境を指します。実態はコンテナベースで構築され、Docker Compose が利用されています。

<img src="/images/20210528a/AirflowBreeze_logo.png" alt="Airflow Breezeロゴ" loading="lazy">

[airflow/AirflowBreeze_logo.png at master · apache/airflow](https://github.com/apache/airflow/blob/master/images/AirflowBreeze_logo.png)

Airflow Breeze の環境を整備することで、Airflow が依存する外部コンポーネント(MySQL, Redis, etc..) を完全に含んだ環境を作成できます。
一方、リソースを結構使うため注意が必要です。

詳細はドキュメントととしてまとまっています。当記事ではピックアップした情報を記載します。
[airflow/BREEZE.rst at master · apache/airflow](https://github.com/apache/airflow/blob/master/BREEZE.rst)


### 環境

以下環境で整備します。

* macOS Mojave 10.14.6
* Docker version 20.10.6, build 370c289
* docker-compose version 1.29.1, build c34c88b2
* Airflow master branch (commit hash: 180df03482b07c18a57d20235ccdd1c3a12d9173)


### Breeze Install

`getopt` と `gstat` が必要なため、インストールします。

```
brew install gnu-getopt coreutils
```

`getopt` 向けに PATH を通します。

```sh
export PATH="/usr/local/opt/gnu-getopt/bin:$PATH
```

```sh
❯ getopt --version
getopt from util-linux 2.36.2

❯ gstat --version
stat (GNU coreutils) 8.32
Copyright (C) 2020 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <https://gnu.org/licenses/gpl.html>.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Written by Michael Meskes.
```

つづいて、Airflow のリポジトリを clone します。

```sh
git clone https://github.com/apache/airflow.git
```

clone した Airflow リポジトリへ移動して、Breeze をインストールして Airflow を 起動します。
( `./breeze` 内部は 長大な Shell Script になっています。)

```sh
./breeze start-airflow
```

ここから完了まで 10分程度待ちます。

完了すると、Airflow コンテナ内にログインした状態になります。

自動で tmux のセッションが開始され、以下のような画面が出てきます。

<img src="/images/20210528a/スクリーンショット_2021-05-20_10.45.22.png" alt="tmuxの画面" loading="lazy">

各 Pane ごとに整理すると以下のようになります。

| Pane 位置 | | 実行コマンド|
| -- | -- | -- |
| 左上 | airflow コンテナシェルログイン | - |
| 右上 |  airflow ui |  `cd /opt/airflow/airflow/www/; yarn install --frozen-lockfile; yarn dev` |
| 左下 | airflow scheduler 実行 |  `airflow scheduler` |
| 右下 | airflow webserver 実行 | `airflow webserver` |

Airflow の実行と tmux を終了したい場合は、 `airflow_stop` コマンドをコンテナ内で実行することで終了できます。
ブラウザで  `http://127.0.0.1:28080` へリクエストすると Airflow UI へアクセスできます。(ログインは ユーザー/パスワード 共に `admin` です。)

<img src="/images/20210528a/スクリーンショット_2021-05-20_10.35.21.png" alt="Airflow管理画面" loading="lazy">



### Breeze 環境

環境変数 `AIRFLOW_HOME` は、 `/root/airflow` になっています。
ログイン後には、 環境変数 `AIRFLOW_SOURCE` である `/opt/airflow` 配下におり、こちらはローカル端末の Airflow ソースコードがコピーされています。(対象は `.dockerignore` で絞り込まれているので全ソースコードではないです。)

動作確認用に DAG ファイルを配置したい場合、ローカル端末の airflow 直下 `./files/dags` 以下に配置することで反映されます。コンテナ内の `AIRFLOW__CORE__DAGS_FOLDER` 環境変数がコンテナ内 `/files/dags`  を指しており、コンテナ内 `/files/dags` はローカル端末上の `./files/dags` をマウントしているためです。

[AIRFLOW__CORE__DAGS_FOLDER — Airflow Documentation](https://airflow.apache.org/docs/apache-airflow/stable/configurations-ref.html#dags-folder)

ファイルを配置してから Airflow UI への反映は5分程度ラグがあります。

<img src="/images/20210528a/スクリーンショット_2021-05-20_11.13.08.png" alt="Airflow UI" loading="lazy">


**※ 補足**
UI 反映のラグを短くしたい場合は、 コンテナ内 `/root/airflow/airflow.cfg` の以下設定値を修正の上、airflow webserver/scheduler を再起動することで反映できます。
(※ ディレクトリの読み込み頻度を上げるほど、サーバー負荷は上がります。)

```sh
# デフォルトで 5分設定のためより短い秒数を指定

# How often (in seconds) to scan the DAGs directory for new files. Default to 5 minutes.
dag_dir_list_interval = 300
```



### breeze コマンド

breeze コマンドにはいくつかのサブコマンドが用意されています。

`コンテナ内シェルログイン`
(※ airflow webserver/scheduler は起動しない)

```sh
./breeze (shell)
```

`再起動`

```sh
./breeze restart
```

`開始/停止`
(※ airflow webserver/scheduler を起動する)

```sh
./breeze start-airflow/stop
```

`イメージの削除`

```sh
./breeze cleanup-image
```

その他いろいろ用意されています。
[airflow/BREEZE.rst at master · apache/airflow](https://github.com/apache/airflow/blob/master/BREEZE.rst#airflow-breeze-syntax)

### テスト実行

CI の環境としても利用されていることもあり、テストを実行することができます。

Airflow ではテストの種類としては以下3種類が定義されています。 ([airflow/TESTING.rst at master · apache/airflow](https://github.com/apache/airflow/blob/master/TESTING.rst#airflow-test-infrastructure) より)

- Unit Tests
	- 単体テスト。追加の Integration は不要であり、Airflow 実行環境内で完結する。
	- ローカル仮想環境 or Breeze 環境下で実施
- Integration Tests
	- 結合テスト。外部 Integration を用意しテストを行う。Integration は実際のサービスを起動して実施する。(コンテナ利用)
	- Breeze 環境下で実施
- System Tests
	- システムテスト。外部システムと連携して行うテスト
	- システム実行環境下(クラウド環境等) で実際に動かすテストを指す

ここでは、 Unit Tests と Integration Tests について詳細を記載します。

#### Unit Tests

Breeze 環境へログインして、 `pytest` を実行することでテスト可能です。

```sh
# Breeze 環境へログイン
❯ ./breeze shell

root@b12df7904cd7:/opt/airflow# pytest tests/core/test_core.py::TestCore::test_check_operators
============================================================================== test session starts ===============================================================================
platform linux -- Python 3.6.13, pytest-6.2.4, py-1.10.0, pluggy-0.13.1 -- /usr/local/bin/python
cachedir: .pytest_cache
rootdir: /opt/airflow, configfile: pytest.ini
plugins: forked-1.3.0, rerunfailures-9.1.1, xdist-2.2.1, flaky-3.7.0, celery-4.4.7, timeouts-1.2.1, cov-2.11.1, httpx-0.12.0, instafail-0.4.2, requests-mock-1.9.2
setup timeout: 0.0s, execution timeout: 0.0s, teardown timeout: 0.0s
collected 1 item

tests/core/test_core.py::TestCore::test_check_operators PASSED                                                                                                             [100%]
========================================================================= 1 passed, 7 warnings in 8.43s ==========================================================================
```

#### Integration Test

Breeze 環境はデフォルトでは、 Integration コンポーネントを起動しない設定になっており、該当の Integration Test もスキップされます。
Integration Test を実施したい場合は、Breeze 起動時にフラグを指定します。

```sh
# Redis 利用テスト準備
./breeze --integration redis

# Redis コンテナも起動される
❯ docker ps
CONTAINER ID   IMAGE                                COMMAND                  CREATED          STATUS                    PORTS                                                                                      NAMES
f9687f175fb7   apache/airflow:master-python3.6-ci   "/usr/bin/dumb-init …"   30 seconds ago   Up 21 seconds             0.0.0.0:25555->5555/tcp, :::25555->5555/tcp, 0.0.0.0:28080->8080/tcp, :::28080->8080/tcp   docker-compose_airflow_run_748d17ffd2bd
c3fe4b732d64   redis:5.0.1                          "docker-entrypoint.s…"   41 seconds ago   Up 37 seconds (healthy)   0.0.0.0:26379->6379/tcp, :::26379->6379/tcp                                                docker-compose_redis_1
```

テスト実行は、 `pytest` が利用されています。起動したコンテナ内で実行します。
Integration テスト実行のためには、 `--integration` パラメータで利用する Integration を指定します。内部的には `@pytest.mark.integration` アノテーションで制御されており、パラメータ指定した Integration テストを実行します。

```sh
# Breeze 環境へログイン
❯ ./breeze shell

root@319e81b37959:/opt/airflow# pytest --tb=no --integration redis tests/providers/redis/hooks/
__init__.py    test_redis.py
root@319e81b37959:/opt/airflow# pytest --tb=no --integration redis tests/providers/redis/hooks/test_redis.py::TestRedisHook::test_real_get_and_set
============================================================================== test session starts ===============================================================================
platform linux -- Python 3.6.13, pytest-6.2.4, py-1.10.0, pluggy-0.13.1 -- /usr/local/bin/python
cachedir: .pytest_cache
rootdir: /opt/airflow, configfile: pytest.ini
plugins: forked-1.3.0, rerunfailures-9.1.1, xdist-2.2.1, flaky-3.7.0, celery-4.4.7, timeouts-1.2.1, cov-2.11.1, httpx-0.12.0, instafail-0.4.2, requests-mock-1.9.2
setup timeout: 0.0s, execution timeout: 0.0s, teardown timeout: 0.0s
collected 1 item

tests/providers/redis/hooks/test_redis.py::TestRedisHook::test_real_get_and_set PASSED                                                                                     [100%]

=============================================================================== 1 passed in 1.34s ================================================================================
```

#### Kubernetes Tests

Integration Tests の一種である、Kubernetes 上での実行のテストも Breeze 上で実行することができます。(標準で整備されていることからも Kubernetes 上での実行が当たり前な世界が垣間見えますね。)
Kubernetes Cluster は [Kind](https://kind.sigs.k8s.io/) を利用してローカル環境上に起動します。

```sh
./breeze kind-cluster start
```

Cluster が起動したら、Airflow を Kubernetes へデプロイします。(少し待ちます)

```sh
./breeze kind-cluster deploy
```

デプロイが完了すると Airflow が Kubernetes 上で起動してます。
`http://127.0.0.1:8080` へアクセスすると Airflow UI が確認できます。(※ ポートが Breeze と違うので注意してください。ユーザー/パスは `admin` です。)

<img src="/images/20210528a/Pasted_image_20210520175955.png" alt="Airflow UI" loading="lazy">

テストを実行してみます。テストはローカル端末上で以下コマンドで実行できます。
(ローカル端末上に仮想環境が作成されます。コマンド内で `./scripts/ci/kubernetes/ci_run_kubernetes_tests.sh` ([参照](https://github.com/apache/airflow/blob/master/scripts/ci/kubernetes/ci_run_kubernetes_tests.sh))を実行しています。)

```sh
❯ ./breeze kind-cluster test

============================================================================== test session starts ===============================================================================
platform darwin -- Python 3.6.9, pytest-6.2.4, py-1.10.0, pluggy-0.13.1 -- /Users/taga3041/.ghq/github.com/apache/airflow/.build/.kubernetes_venv/airflow-python-3.6-v1.20.2_host_python_3.6/bin/python3
cachedir: .pytest_cache
rootdir: /Users/taga3041/.ghq/github.com/apache/airflow, configfile: pytest.ini
plugins: cov-2.11.1
collected 53 items

kubernetes_tests/test_kubernetes_executor.py::TestKubernetesExecutor::test_integration_run_dag PASSED                                                                      [  1%]
kubernetes_tests/test_kubernetes_executor.py::TestKubernetesExecutor::test_integration_run_dag_with_scheduler_failure PASSED                                               [  3%]
kubernetes_tests/test_kubernetes_pod_operator.py::TestKubernetesPodOperatorSystem::test_config_path_move PASSED                                                            [  5%]
...
kubernetes_tests/test_other_executors.py::TestCeleryAndLocalExecutor::test_integration_run_dag SKIPPED (Does not run on KubernetesExecutor)                                [ 98%]
kubernetes_tests/test_other_executors.py::TestCeleryAndLocalExecutor::test_integration_run_dag_with_scheduler_failure SKIPPED (Does not run on KubernetesExecutor)         [100%]

============================================================= 51 passed, 2 skipped, 4 warnings in 404.65s (0:06:44) ==============================================================
Exported logs for cluster "airflow-python-3.6-v1.20.2" to:
/tmp/kind_logs_2021-05-20_0_0
```

最後に Cluster を停止します。

```sh
./breeze kind-cluster stop
```

## 所感

Airflow にて提供されている、ローカル環境/テスト環境向けの Airflow Breeze について紹介しました。`./breeze` コマンドで諸々整備されていて便利ですが、様々なコンポーネントが関与しているため、動かすのに少し苦労しました(プロキシ周りがほとんどですが)。

それだけ複雑なテストケースが想定されていて、OSS でここまで管理されているのは改めてすごいなと思いました。

Airflow はクセが強いですが 最近(2020/12) バージョン 2.0 にアップデートされたりして、積極的に改善されており今後も注目な OSS だと思います。次は何かしらコントリビュートしたいです。

## 参考

- [airflow/BREEZE.rst at master · apache/airflow](https://github.com/apache/airflow/blob/master/BREEZE.rst#running-kubernetes-tests)
- [airflow/TESTING.rst at master · apache/airflow](https://github.com/apache/airflow/blob/master/TESTING.rst#running-tests-with-kubernetes)

