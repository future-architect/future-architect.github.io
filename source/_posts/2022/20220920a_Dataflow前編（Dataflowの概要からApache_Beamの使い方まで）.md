---
title: "Dataflow前編（Dataflowの概要からApache Beamの使い方まで）"
date: 2022/09/20 00:00:00
postid: a
tag:
  - Dataflow
  - インターン
  - インターン2022
category:
  - DataEngineering
thumbnail: "/images/2022/20220920a/thumbnail.png"
author: "平野甫"
lede: "フューチャーのインターンEngineer Campに参加した平野と申します。今回のインターンでは、Google Cloud Platform (GCP)のサービスとして提供されているDataflowについて調査し、その仕組みや使い方についてこの技術ブログにまとめることに取り組みました。"
---

<img src="/images/2022/20220920a/dataflow_top1.png" alt="" width="1000" height="655">

# はじめに

はじめまして、フューチャーのインターン"Engineer Camp"に参加した平野と申します。

今回のインターンでは、Google Cloud Platform (GCP)のサービスとして提供されているDataflowについて調査し、その仕組みや使い方についてこの技術ブログにまとめることに取り組みました。

フューチャーのインターンについては[こちら](/tags/インターン/)をご覧ください！

今回の記事は前編・後編に分かれており

* 前編:
  * Dataflowの概要
  * Apache Beamの概要・内部的な仕組み
  * Apache Beamのコードの書き方
* 後編：
  * Dataflowを使う上での事前準備と基本的な使い方
  * GPUを使う上での事前準備と基本的な使い方
  * Pub/Sub・BigQueryとの連携例

という構成になっています。[後編](/articles/20220920b/)も公開しています。

# Dataflowとは

Dataflowは様々なデータの分散処理を簡単に実現できるプラットフォームです。

大規模なデータを処理したいけれど、十分な計算資源がない場合やそのためのインフラの構築・管理が面倒な場合には、Dataflowは有効な選択肢の1つです。Dataflowではそのような環境構築が不要で、後述するApache Beamでデータ処理の流れを記述すれば、データの分散処理を実行できます。

また、Dataflowにはオートスケーリングという機能が備わっており、データ処理の重さに応じて自動で最適な計算リソースを割り当ててくれます。さらにDataflowはGCPのサービスなので、他のGCPサービス（Cloud Strage, Cloud Pub/Sub, BigQueryなど）との連携がしやすくなっています。

Dataflowの活用事例は多く、例えばメルペイさんはさまざまなマイクロサービスで必要とされる典型的なデータ処理にDataflow Templateを活用されています。[^1]

また、SUBARUさんでは学習データにアノテーションを付与する処理にDataflowを利用されています。[^2]
>「学習用の画像データにアノテーション データを付与して TFRecord を生成する前処理が、日を追うごとに増えていき、これまでのやり方だと並列でやっても丸一日以上かかってしまうようになってしまいました。そこで、これを
Apache Beam を使って Cloud Dataflow で処理するようにしています。結果、データを流すと数百CPU くらいまで一気にオートスケールして、だいたい 30 分くらいで終わるようになりました」（大久保氏）

[^1]: [メルペイにおけるDataflow Templateの活用](https://engineering.mercari.com/blog/entry/2019-05-30-120000/)
[^2]: [SUBARU：次世代「アイサイト」に向けた AI 開発をマネージドな機械学習プラットフォーム Vertex AI でスピードアップ](https://cloud.google.com/customers/subaru/?hl=ja)

Dataflowでは、データ処理パイプラインの中に機械学習モデルの推論を組み込むことも可能で、ストリーム処理と組み合わせるとリアルタイム推論もできるようになります。今回はそのようなMLシステムへの応用を見据えて基本から整理しました。

# Apache Beamとは

Dataflow上で実行するデータ処理の内容はApache Beamを用いて記述します。

Apache Beam自体は、データ処理パイプラインを定義・実行するソフトウェア開発キット (SDK) で、OSSなので誰でも利用できます。Dataflow以外にもFlink, Nemo, Spark, AWS KDAなどの環境（Runnerという）で動かすことができ、Go, Java, Pythonといった様々なプログラミング言語で利用できます。

<img src="/images/2022/20220920a/Apache_Beam_flow.png" alt="Apache_Beam_flow.png" width="1200" height="534" loading="lazy">

Apache Beamの特徴としては、パイプライン処理を実行するWorkerの確保、各Workerへのデータの割り当てなどはRunnerが自動で行なってくれるという点があります。そのため、コードを書く際にはパイプライン処理の流れだけに注力すればよく、大規模なデータの分散処理を簡単に実行できます。

また、バッチ処理・ストリーム処理の両方のデータ処理を同じようなコードで記述できるというのも大きな特徴の1つで、バッチ処理⇄ストリーム処理の切り替えが簡単にできます。ちなみにBeamという名前は __B__ atch + st __eam__ から来ています。

## Apache Beamの構成要素

Apache Beamでは以下の図のような構成となっています。
<img src="/images/2022/20220920a/Apache_Beam_flow_2.png" alt="Apache_Beam_flow.png" width="1200" height="241" loading="lazy">

* Pipeline:
データ処理タスク全体（入力データの読み取り→データの処理→データの書き出し）をカプセル化したもの。
* PCollection:
パイプラインを流れるデータ。パイプラインの最初は外部ソースからデータを読み出して、PCollectionにすることから始まる。
* PTransfrom:
パイプライン内の個々のデータ処理オペレーション。PTransformの入出力はPCollection。
* I/O transforms:
外部ソースからのデータの読み取り、外部ソースへのデータの書き出しを行う際に用いるPTransform。

## Apache Beamの仕組み

ここでは、Apache Beamがどのようにして分散処理を行っているのかについて、[公式ドキュメント](https://beam.apache.org/documentation/runtime/model/)の内容をもとに説明します。
以下の説明で用いている図は[公式ドキュメント](https://beam.apache.org/documentation/runtime/model/)から引用しています。

### Transform並列化の仕組み

1. Runnerは入力されたPCollectionをいくつかのBundleに分ける。
2. 各BundleをWorkerが並列に処理する。

いくつのBundleに分割するかはRunnerが決定します。以下の図では9つのelementからなるPCollectionを2つのBundleに分割しています。

<img src="/images/2022/20220920a/Bundleに分割する例.svg" alt="Bundleに分割する例" loading="lazy">

ParDo1を実行する際に、各BundleはWorkerに渡され、並列に実行されます。

<img src="/images/2022/20220920a/Bundleの並列処理.svg" alt="Bundleの並列処理" loading="lazy">

PCollectionに含まれるelementよりも小さく分割することはできないため、Bundle数の最大はPCollectionのelement数です。

<img src="/images/2022/20220920a/最も細かくBundleに分割した例.svg" alt="最も細かくBundleに分割した例" loading="lazy">

_※Splittable ParDoを使えば、1つのelementを複数のBundleで処理できるらしい。この機能は開発中とのこと。_

### Transform間に従属関係がある場合の挙動

以下の例では、入力に対してParDo1を適用した後に、ParDo2を適用します。

図ではBundle AにParDo1を適用した出力がBundle C、Bundle BにParDo1を適用した出力がBundle Dとなっています。

<img src="/images/2022/20220920a/Transform間に従属関係がある場合.svg" alt="Transform間に従属関係がある場合" loading="lazy">

RunnerがParDo1を適用前と後でBundleの再構成を行わない場合、各Bundleは同じWorkerでParDo1とParDo2を適用されます。

<img src="/images/2022/20220920a/各Bundleは同じWorkerで処理される.svg" alt="各Bundleは同じWorkerで処理される" loading="lazy">

こうすることで、Worker間の通信を省くことができ、他のWorkerの処理を待つ必要がなくなります。

### 1つのTransformに失敗した場合の挙動

Bundle内のあるelementの処理に失敗した場合、そのelementが属するBundle全体に対して処理を再度実行する必要があります。

ただし、処理を実行するWorkerは変わってもよく、以下の例ではWorker2が処理に失敗したBundleをWorker1が引き受けています。

<img src="/images/2022/20220920a/1つのTransformに失敗した時.svg" alt="1つのTransformに失敗した時" loading="lazy">

### 従属関係にあるTransformに失敗した場合の挙動

2つのTransform間に従属関係があり、後続のTransformの処理に失敗した場合、Bundleは再度最初からTransformを適用される必要があります。

<img src="/images/2022/20220920a/従属関係にあるTransformに失敗した場合.svg" alt="従属関係にあるTransformに失敗した場合" loading="lazy">

_このような挙動となっている理由は、Transform間のelementを保持しておくとメモリを圧迫してしまうため？公式DocにはPersistence costを節約するためとあった。ラージスケールなデータを処理することを念頭においた設計となっている？_

## Apache Beamのコードの書き方

Apache Beamでは、以下のような流れでコードを書いていきます。

1. Pipelineの生成と実行オプションの設定（ここでRunnerも指定）
2. I/O transformsを用いて最初のPCollectionの生成。外部ソースからデータを取ってきたり、コード内で定義してもOK
3. PTransformの適用
4. PTransform適用後のPCollectionを外部ソースへ書き込み
5. RunnerでPipelineを実行

上記の流れで実装したサンプルコードが以下になります。以下の例では`input.txt`の各行の文字数を`output.txt`に出力するコードです。

```python beam_sample.py
import apache_beam as beam
from apache_beam.options.pipeline_options import StandardOptions


class ComputeWordLength(beam.DoFn):
    def __init__(self):
        pass

    def process(self, element):
        yield len(element)


def main():
    options = StandardOptions()  # 1. 実行オプションの設定
    options.runner = "DirectRunner"  # Runnerもここで決めている

    p = beam.Pipeline(options=options)  # 1. Pipelineの生成

    (
        p
        | "ReadFromText" >> beam.io.ReadFromText("./input.txt")  # 2. input.txtから最初のPCollectionを生成
        | "ComputeWordLength" >> beam.ParDo(ComputeWordLength())  # 3. PTransformの適用
        | "WriteToText" >> beam.io.WriteToText("./output", file_name_suffix=".txt", shard_name_template="")  # 4. output.txtへPCollectionの書き込み
    )

    p.run()  # 5. RunnerでPipelineを実行


if __name__ == "__main__":
    main()
```

例えば、以下のようなinput.txtに対して、上のコードを実行すると

```text input.txt
Hello World!
foo bar
hoge hoge
```

以下のようなoutput.txtが生成されます。

```text output.txt
12
7
9
```

Apache Beamのパイプライン処理はLinuxコマンドのパイプライン処理と同じように

```bash
Pipeline | PTransform1 | PTransform2 | ...
```

と記述します。Pipelineのインスタンスがパイプラインのスタートとなります。
また、パイプライン内の各Transformにはラベルが割り振られ、コード中で明示的にラベルを与えなかった場合には、そのTransform自体がラベルとなります。
パイプライン内に同一のラベルを持つTransformが存在してしまうと、エラーとなってしまうため注意です。

```python
p
| "ReadFromText" >> beam.io.ReadFromText("./input.txt")  # このTransformのラベルは"ReadFromText"
| "ComputeWordLength" >> beam.ParDo(ComputeWordLength()) # このTransformのラベルは"ComputeWordLength"
| beam.Map(print)  # この場合は"Map(print)"がラベルとなる。
```

## パイプラインの分岐・合流

Apache Beamは一直線のパイプラインだけでなく、分岐や合流を含む複雑なパイプラインを構成できます。
パイプラインを分岐させたい場合には、分岐の直前までを変数に代入することで、その変数をスタートとしてパイプラインの分岐させることができます。

```python beam_branch.py
import apache_beam as beam


if __name__ == "__main__":
    with beam.Pipeline() as p:
        input_data = (  # 分岐を直前までの処理を変数(input_data)に代入
            p
            | "Create" >> beam.Create([
                {"name": "Alice", "height": 165, "weight": 49},
                {"name": "Bob", "height": 171, "weight": 60},
                {"name": "Charlie", "height": 184, "weight": 76}
            ])
        )

        height_average = (
            input_data  # input_dataから分岐後の処理(身長の平均算出)を記述
            | "Extract height" >> beam.Map(lambda x: x["height"])
            | "Compute mean height" >> beam.combiners.Mean.Globally()
            | "Print mean height" >> beam.Map(lambda x: print("height average =", x))
        )

        weight_average = (
            input_data  # input_dataから分岐後の処理(体重の平均算出)を記述
            | "Extract weight" >> beam.Map(lambda x: x["weight"])
            | "Compute mean weight" >> beam.combiners.Mean.Globally()
            | "Print mean weight" >> beam.Map(lambda x: print("weight average =", x))
        )

# output
# height average = 173.33333333333334
# weight average = 61.666666666666664
```

この場合、パイプラインのグラフは次のようになります。
<img src="/images/2022/20220920a/caf53485-704f-545e-4c3d-119c96a1615e.png" alt="" width="880" height="926" loading="lazy">

また、合流させたい場合には、`beam.Flatten()`を使うことで、分岐したパイプラインを合流させることができます。上の分岐のコードではターミナルへの出力を別々にやっていましたが、下の例では`height_average`と`weight_average`を合流させて、ターミナルへの出力を一括化しています。

```python beam_merge.py
import apache_beam as beam


if __name__ == "__main__":
    with beam.Pipeline() as p:
        input_data = (
            p
            | "Create" >> beam.Create([
                {"name": "Alice", "height": 165, "weight": 49},
                {"name": "Bob", "height": 171, "weight": 60},
                {"name": "Charlie", "height": 184, "weight": 76}
            ])
        )

        height_average = (
            input_data
            | "Extract height" >> beam.Map(lambda x: x["height"])
            | "Compute mean height" >> beam.combiners.Mean.Globally()
            | "Add height key" >> beam.Map(lambda x: ("height", x))
        )

        weight_average = (
            input_data
            | "Extract weight" >> beam.Map(lambda x: x["weight"])
            | "Compute mean weight" >> beam.combiners.Mean.Globally()
            | "Add weight key" >> beam.Map(lambda x: ("weight", x))
        )

        print_mean = (
            (height_average, weight_average)  # 合流させたいPCollectionを()でまとめる
            | beam.Flatten()  # Flatten()で1つのPCollectionにする
            | beam.Map(lambda x: print(x[0], "average =", x[1]))
        )

# output
# height average = 173.33333333333334
# weight average = 61.666666666666664
```

この場合、パイプラインのグラフは次のようになります。
<img src="/images/2022/20220920a/bd3c7575-0cd5-a2a6-6f31-b6914a43bf50.png" alt="" width="870" height="1438" loading="lazy">

# 最後に

ここまでお読みいただきありがとうございます。稚拙な文章で読みづらい箇所が多々あったかと思います。よければ[後編](/articles/20220920b/)もお読みいただければと思います。

# 参考

* [Apache Beam (Dataflow) 実践入門【Python】](https://qiita.com/esakik/items/3c5c18d4a645db7a8634)
* [How Beam executes a pipeline (公式ドキュメント)](https://beam.apache.org/documentation/runtime/model/)
* [Python を使用して Dataflow パイプラインを作成する](https://cloud.google.com/dataflow/docs/quickstarts/create-pipeline-python)

アイキャッチは<a href="https://pixabay.com/ja/users/paulbr75-2938186/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=2471293">Paul Brennan</a>による<a href="https://pixabay.com/ja//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=2471293">Pixabay</a>からの画像です。
