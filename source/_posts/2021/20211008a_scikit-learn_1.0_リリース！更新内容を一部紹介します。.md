---
title: "scikit-learn 1.0 リリース！更新内容を一部紹介します。"
date: 2021/10/08 00:00:00
postid: a
tag:
  - 機械学習
  - pandas
  - Python
category:
  - DataScience
thumbnail: /images/2021/20211008a/thumbnail.png
author: 玉木竜二
lede: "2021年9月24日にscikit-learn 1.0がリリースされました。私が大学院生のころ、scikit-learnのサンプルを動かすところから機械学習を勉強したので、ついに1.0かとなんだか感慨深い気持ちがありますから、個人的に気になった以下の4つの内容を紹介しようと思います。"
---
こんにちは、TIG所属の玉木です。この記事は[Python連載](/articles/20210927b/)の7本目の記事になります。

2021年9月24日にscikit-learn 1.0がリリースされました。私が大学院生のころ、scikit-learnのサンプルを動かすところから機械学習を勉強したので、ついに1.0かとなんだか感慨深い気持ちがあります([この記事](/articles/20210511a/)で紹介しているPython 機械学習プログラミングです)。本記事ではリリースから少し時間が経ってしまいましたが、[リリースハイライト](https://scikit-learn.org/stable/auto_examples/release_highlights/plot_release_highlights_1_0_0.html)、[チェンジログ](https://scikit-learn.org/stable/whats_new/v1.0.html)から、個人的に気になった以下の4つの内容を紹介しようと思います。

1. キーワード引数の強制
2. pandasのデータフレームからの特徴量名のサポート
3. 新しいplot用のクラス追加
4. StratifiedGroupKFoldの追加

## 1. キーワード引数の強制

scikit-learnの機械学習のモデルのクラス、メソッドは、多くの入力パラメータを持ちます。

以前のscikit-learnでは以下のようにクラスをインスタンスできました。以下[リリースハイライト](https://scikit-learn.org/stable/auto_examples/release_highlights/plot_release_highlights_1_0_0.html)からの引用です。

```python
est = HistGradientBoostingRegressor("squared_error", 0.1, 100, 31, None,
    20, 0.0, 255, None, None, False, "auto", "loss", 0.1, 10, 1e-7,
    0, None)
```

上記は極端な例ですが、この記述の仕方だと、各位置の引数がどんな意味をもつかわからず、APIドキュメントを確認する必要があります。このような位置引数を用いた初期化はTypeErrorが発生するようになります。代わりに以下のようにキーワード引数を用いて初期化します。

```python
est = HistGradientBoostingRegressor(
    loss="squared_error",
    learning_rate=0.1,
    max_iter=100,
    max_leaf_nodes=31,
    max_depth=None,
    min_samples_leaf=20,
    l2_regularization=0.0,
    max_bins=255,
    categorical_features=None,
    monotonic_cst=None,
    warm_start=False,
    early_stopping="auto",
    scoring="loss",
    validation_fraction=0.1,
    n_iter_no_change=10,
    tol=1e-7,
    verbose=0,
    random_state=None,
)
```

位置引数を用いた初期化に比べて、キーワード引数を持ちいた初期化の方が各引数の意味がわかり、非常に読みやすいです。すべての位置引数が禁止されるわけではないのですが、ライブラリの方で可読性が良くなるように書き方を強制してくれるのは嬉しい変更です。

## 2. pandasのデータフレームからの特徴量名のサポート

scikit-learnでは機械学習のためのデータ変換、前処理の機能が多くあります。例えばscikit-learnのpreprocessモジュールのOneHotEncoderを用いればカテゴリ変数を数値表現に変換でき、StandardScalerを用いれば、数値を標準化できます。

これまでは変換器の入力がpandasのデータフレームであっても、元の列名を保持できず、列名が欲しい場合は自分で列名を作って与える必要がありました。scikit-learn 1.0ではColumnTransformerのような変換器が列名を保持するようになり、get_feature_names_outメソッドを使うだけで簡単にデータ変換後の列名も取得できるようになりました。

```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import pandas as pd

X = pd.DataFrame({
    "category_name": ["Men/T-shirts", "Women/T-shirts", "Women/T-shirts"],
    "brand_name": ["Nike", "adidas", "PUMA"],
    "price": [100, 150, 200]
})
```

Xは以下のようなデータフレームになります。

<img src="/images/2021/20211008a/X_origin.png" alt="Xのデータフレーム" width="591" height="262" loading="lazy">

ColumnTransformerを用いて、Xのカテゴリ変数に対してはone-hot encoding、量的変数に対しては標準化を行います。

```python
preprocessor = ColumnTransformer(
    [
        ("numerical", StandardScaler(), ["price"]),
        ("categorical", OneHotEncoder(), ["category_name", "brand_name"]),
    ],
    verbose_feature_names_out=False,
).fit(X)

preprocessor.get_feature_names_out()
```

preprocessor.get_feature_names_out()の出力は以下のようになります。列名が保持されているだけでなく、変換後の特徴量に対しても列名がつけられていることがわかります。

```python
Out:
array(['price', 'category_name_Men/T-shirts',
       'category_name_Women/T-shirts', 'brand_name_Nike',
       'brand_name_PUMA', 'brand_name_adidas'], dtype=object)
```

今回追加されたget_feature_names_out()はscikit-learnでデータ変換を行い、pandasのデータフレームに再度変換したい場合などに便利です。

```python
pd.DataFrame(preprocessor.transform(X), columns=preprocessor.get_feature_names_out())
```

以下の画像のように変換後のデータを簡単にデータフレームに戻すことができます。
<img src="/images/2021/20211008a/scikit.png" alt="データフレームに戻した表現" width="1200" height="161" loading="lazy">

pandasのget_dummiesメソッドを使っても同様のone-hot encodingは可能です。

```python
pd.get_dummies(X)
```

以下get_dummiesの出力です。
<img src="/images/2021/20211008a/pandas.png" alt="get_dummies出力結果の表" width="1200" height="162" loading="lazy">

ほぼ同じデータフレームが得られました。今回のように数値変換も同時にscikit-learnで行いたい場合などには、scikit-learnの変換器を通してget_feature_names_out()を使うのがいいのかなと思います。

## 3. 新しいplot用のクラス追加

これまで混合行列やROC曲線を描画したいときは、sklearn.metricsモジュールのplot_confusion_matrixやplot_roc_curveが使えましたが、scikit-lean 1.0からは非推奨になり、1.2では削除の予定とのことです。代わりにConfusionMatrixDisplay、PrecisionRecallDisplayといったクラスが追加されました。元のplot_*関数はestimatorが引数に必要だったのですが、from_predictionsメソッドを使うことにより、ラベルと予測した値を渡せば描画ができるようになりました。

以下[APIドキュメント](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ConfusionMatrixDisplay.html)からサンプルコードの引用です。

```python
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.metrics import ConfusionMatrixDisplay
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
X, y = make_classification(random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)
clf = SVC(random_state=0)
clf.fit(X_train, y_train)
SVC(random_state=0)
y_pred = clf.predict(X_test)
ConfusionMatrixDisplay.from_predictions(y_test, y_pred)

plt.show()
```

描画される混合行列は以下になります。
<img src="/images/2021/20211008a/confusion_matrix.png" alt="描画される混合行列のマトリクス図" width="306" height="266" loading="lazy">

## 4. StratifiedGroupKFoldの追加

機械学習のモデルの評価において、交差検証における検証データの作り方は非常に重要です。例として、以下のKaggle State Farm Distracted Driver Detectionに参加したスライドが参考になります。

https://speakerdeck.com/iwiwi/kaggle-state-farm-distracted-driver-detection?slide=22

このスライドでは検証データに同じドライバーのデータを使っていたために、学習データの汎化性能を正しく評価できなかった、学習データと検証データ間に同じドライバーのデータを含めないようにしたら正しく評価できるようになった、と報告しています。

このようにデータの分割の手法は重要なのですが、今回追加されたStratifiedGroupKFoldは、そのデータ分割の手法のうちの１つです。StratifiedGroupKFoldはStratifiedKFoldとGroupKFoldの２つの機能をあわせたデータの分割方法です。StratifiedKFoldは各セブセットのクラスの比率が維持されるようにデータを分割します。特にクラスの分布が均等でない場合に有効です。

GroupKFoldは、各セブセット間に同じグループが含まれないように分割します。先程の例のように、同じドライバーを含めてしまうと不当に高くモデルの性能を評価してしまう、といったことを防ぎます。この２つの特徴をどちらも同時に使いたいときがあるのですが、これまでscikit-learnにはこの機能はなく、自分で実装する必要がありました。scikit-learn 1.0からは簡単に使えるようになりました。

## まとめ

本記事ではscikit-learn 1.0に追加された以下の機能を簡単に紹介しました。

1. キーワード引数の強制
1. pandasのデータフレームからの特徴量名のサポート
1. 新しいplot用のクラス追加
1. StratifiedGroupKFoldの追加

普段scikit-learnを使っている方の参考になれば幸いです。
