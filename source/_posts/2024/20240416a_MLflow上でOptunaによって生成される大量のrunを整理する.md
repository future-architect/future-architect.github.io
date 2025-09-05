---
title: "MLflow上でOptunaによって生成される大量のrunを整理する"
date: 2024/04/16 00:00:00
postid: a
tag:
  - MLOps
  - MLflow
  - Python
category:
  - DataScience
thumbnail: /images/2024/20240416a/thumbnail.png
author: 齋藤智和
lede: "MLflowはハイパーパラメータを自動調整するツールとしてともに広く使用されているツールです。MLflowとOptunaを同時に利用した際に、Optunaが複数回試行することによってMLflow上にrunが大量に生成され、MLflow上で試行結果が見づらくなります。"
---
## はじめに

こんにちは、SAIG/MLOpsチームでアルバイトをしている齋藤です。

[MLflow](https://mlflow.org/)は機械学習の管理を扱うツールとして、[Optuna](https://www.preferred.jp/ja/projects/optuna/)はハイパーパラメータを自動調整するツールとしてともに広く使用されているツールです。MLflowとOptunaを同時に利用した際に、Optunaが複数回試行することによってMLflow上にrunが大量に生成され、MLflow上で試行結果が見づらくなります。

本記事では、大量に生成されるrunに親のrunを付与することで、MLflowのWeb UIから見やすくする方法を提示します。

## 課題

Optunaは事前に指定した範囲の中からハイパーパラメータの組み合わせを自動的に選択してモデルを学習して評価するという試行を繰り返すことで、良いハイパーパラメータを探索するツールであり、これにより手作業でハイパーパラメータを調整するのを省けます。

MLflowは機械学習の管理について幅広く扱うツールであり、例えば各実験に使用されたハイパーパラメータや性能の記録などが出来るため、実験の再現などに役立ちます。

これらは大変便利なツールなのですが、これらを組み合わせて使用した際、画像のようにMLflow上で結果を見た際に大量のrunが生成されて、結果一覧が見づらくなります。特に、条件を変化させてOptunaによる最適化を実行させた場合に、前回までのOptunaによって生成されたrunと今回分のrunの見分けが付けにくくなるという問題が発生します。

<img src="/images/2024/20240416a/image.png" alt="image.png" width="1200" height="421" loading="lazy">

## 課題の解決

### 方針

MLflowではrun毎にタグを設定できますが、その中でも[システムタグ](https://mlflow.org/docs/latest/tracking/tracking-api.html#system-tags)と呼ばれるタグがあり、MLflowの中で特殊な意味を持ちます。
`mlflow.parentRunId`というタグはシステムタグの1つで、このタグに親のrunのIDを設定すると、Web UI上で親子のrunがネストした形で表示されるようになります。

そのため...

1. MLflowで空のrunを実行する。
2. 1で実行したrunを目的関数の中で親のrunとして設定する。

...という2つの手順を踏めば、Optunaによって生成される大量のrunを1つの親runに結び付けることができます。

### 実装

#### 1. MLflowで空のrunを実行する

まずMLflowで親のrunとなる空のrunを実行します。

この時のrun_idは次に必要になるため保存しておきます。

```python
    with mlflow.start_run(experiment_id=0) as run:
        parent_run_id = run.info.run_id
```

#### 2. 1で実行したrunを目的関数の中で親のrunとして設定する

runにタグを設定するには`mlflow.set_tag`関数を使用すれば出来ます。

sklearnのSGDClassifierの最適化を例にすると、目的関数は次のようになります。

```python
def objective(trial) -> float:
    with mlflow.start_run(experiment_id=0) as run:
        mlflow.set_tag("mlflow.parentRunId", parent_run_id) # start_runの直後に実行する

        alpha = trial.suggest_float("alpha", 1e-5, 1e-1, log=True)

        wine = sklearn.datasets.load_wine()
        classes = list(set(wine.target))

        train_x, valid_x, train_y, valid_y = sklearn.model_selection.train_test_split(
            wine.data, wine.target, test_size=0.25, random_state=0
        )

        clf = sklearn.linear_model.SGDClassifier(alpha=alpha)
        clf.fit(train_x, train_y)

        score = clf.score(valid_x, valid_y)

        mlflow.log_param("alpha", alpha)
        mlflow.log_metric("accuracy", score)

    return score
```

実装全体として次のようになります。

```python
import mlflow
import optuna

import sklearn
import sklearn.datasets
import sklearn.linear_model


def objective(trial) -> float:
    with mlflow.start_run(experiment_id=0) as run:
        mlflow.set_tag("mlflow.parentRunId", parent_run_id) # start_runの直後に実行する

        alpha = trial.suggest_float("alpha", 1e-5, 1e-1, log=True)

        wine = sklearn.datasets.load_wine()
        classes = list(set(wine.target))

        train_x, valid_x, train_y, valid_y = sklearn.model_selection.train_test_split(
            wine.data, wine.target, test_size=0.25, random_state=0
        )

        clf = sklearn.linear_model.SGDClassifier(alpha=alpha)
        clf.fit(train_x, train_y)

        score = clf.score(valid_x, valid_y)

        mlflow.log_param("alpha", alpha)
        mlflow.log_metric("accuracy", score)

    return score


if __name__ == "__main__":
    with mlflow.start_run(experiment_id=0) as run:
        parent_run_id = run.info.run_id

    study = optuna.create_study()
    study.optimize(objective, n_trials=30)
```

## 結果

上のコードを実行すると、Optunaによって実行された全ての試行がMLflowに送信されます。

Web UI上では画像のように表示され、Optunaの実行単位ごとにrunがネストして表示されるので見やすくなりました。

<img src="/images/2024/20240416a/image_2.png" alt="image.png" width="1200" height="391" loading="lazy">

## おわりに

以上、`mlflow.parentRunId`というシステムタグにrunIDを設定するとWeb UI上でrunがネストして表示されることを利用して、自動生成されるrunをUI上で整理して表示させるという話でした。

MLflowのシステムタグはmlflow.parentRunId以外にも存在するので、それらを利用するとUI上で更なる恩恵が得られるかもしれません。

## 参考

- https://mlflow.org/docs/latest/tracking/tracking-api.html#system-tags
- https://mlflow.org/
- https://www.preferred.jp/ja/projects/optuna/
