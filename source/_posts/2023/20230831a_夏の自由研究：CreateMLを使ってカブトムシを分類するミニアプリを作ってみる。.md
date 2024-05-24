---
title: "夏の自由研究：CreateMLを使ってカブトムシを分類するミニアプリを作ってみる。"
date: 2023/08/31 00:00:00
postid: a
tag:
  - Swift
  - iOS
  - 機械学習
  - 画像認識
category:
  - DataScience
thumbnail: /images/20230831a/thumbnail.png
author: 橋本竜我
lede: "こんにちは！HealthCare Innovation Group[^1]所属の橋本です。本記事は、[夏の自由研究ブログ連載2023]の1本目です。夏の風物詩であるカブトムシやクワガタを識別するミニアプリを作りました。"
---

## はじめに
こんにちは！HealthCare Innovation Group(HIG)[^1]所属の橋本です。

本記事は、[夏の自由研究ブログ連載2023](/articles/20230830a/)の1本目です。

夏の風物詩であるカブトムシやクワガタを識別するミニアプリを作りました。

夏の自由研究ブログの連載があると聞いて、せっかくなら夏っぽい題材にしたいなと、私が小さい時にたくさん捕まえていたカブトムシを題材にしようと考えました。

「Swiftと機械学習あたりを絡めて何かできないかな？」と考えたところ、CreateMLという様々な機械学習モデルをGUIで作ることができると知ったため、カブトムシやクワガタの画像を学習させたモデルを使ったミニアプリを作ることにしました。

今回は、作成したミニアプリをもとに、CreateMLの使い方について紹介したいと思います。
<img src="/images/20230831a/image.png" alt="" width="718" height="247" loading="lazy">

**作成したカブトムシ・クワガタを分類するミニアプリ**
<img src="/images/20230831a/beatle_app.gif" alt="" width="177" height="384" loading="lazy">

## 目次

- CreateML、CoreMLとは
- CreateMLを使ってカブトムシ・クワガタを識別するモデルの作成からアプリへ実装まで
  - 学習データ、テストデータを用意する
  - 識別モデルを作成
  - アプリへ実装する
- 最後に

## CreateML、CoreMLとは

CreateMLとは、Appleが提供する機械学習のフレームワークの一つで、機械学習モデルを作成するツールです。また、このCreateMLで作成したモデルを実際にiOSアプリなどで使用ために使われるフレームワークとしてCoreMLがあります。簡単に説明すると、

- CreateMLが機械学習モデル（画像認識、オブジェクト認識、音声認識、文字認識など）を作成するもの
- CoreMLが作成したモデルを様々な実際にアプリに組み込むもの

というイメージで問題ないと思います。

以下のApple公式の機械学習に関するページにて、それぞれの説明が記載されています。

https://developer.apple.com/jp/machine-learning/

CreateMLの説明文の引用です。

> Create MLアプリでは、コードを書かずにMac上でCore MLモデルをすばやく構築およびトレーニングすることができます。使いやすいアプリのインターフェイスとトレーニング向けに利用できるモデルにより、プロセスがこれまでになく簡単になり、トレーニングデータさえ用意すれば開始できます。モデルのトレーニングと正確性を可視化する手助けとして、スナップショットやプレビューといった機能でトレーニングプロセスをコントロールすることもできます。Create MLフレームワークおよびCreate ML Componentsを使用すると、モデル作成をより細部まで詳細にコントロールできます。

CoreMLの説明文の引用です。

> Core MLなら、アプリに機械学習モデルを容易に組み込むことができる上、Appleデバイス上で目を見張るほど速いパフォーマンスを実現します。Core MLのAPIを使うと、構築済みの機械学習機能をアプリに追加することができます。またはCreate MLを使って、カスタムCore MLモデルをMac上で直接トレーニングすることも可能です。他のトレーニングライブラリからのモデルをCore ML Toolsを使って変換したり、すぐに使えるCore MLモデルをダウンロードしたりすることもできます。Xcodeで直接、モデルをプレビューしてそのパフォーマンスを把握することも簡単です。

## CreateMLを使ってカブトムシ・クワガタを識別するモデルの作成からアプリへ実装まで

まず、CreateMLを使って、カブトムシ・クワガタを識別する機械学習モデルを作成していきます。
こちらのページに学習済みのCoreMLが組み込まれたサンプルコードがあるため、こちらの中の`MobileNetV2`（画像識別のモデル）を使用してミニアプリを作成していきます。

https://developer.apple.com/jp/machine-learning/models/

環境は、次のとおりです。

### 実装環境

- macOS: Ventura 13.4.1(c)
- Xcode: Version 14.3.1 (14E300c)

#### 学習データ、テストデータを用意する

4種類のカブトムシ・クワガタの画像を用意します。
学習データが100枚、テストデータが20枚それぞれ用意し、以下のフォルダ階層のように準備します。

##### フォルダ階層

```sh
├trainingData
｜├beatle #カブトムシ
｜├SawToothStagBeatle #ノコギリクワガタ
｜├GiantBeatle #オオクワガタ
｜└MiyamaStagBeatle #ミヤマクワガタ
├testData
　├beatle #カブトムシ
　├SawToothStagBeatle #ノコギリクワガタ
　├GiantStagBeatle #オオクワガタ
　└MiyamaStagBeatle #ミヤマクワガタ
```

（飼育経験のあるこの四種類を分類することにしてみました。）

### 識別モデルを作成

CreateMLを`Xcode` > `Open Developer Tool` > `CreatML`をクリックし、ウィンドウを開きます。

先程用意したtrainingDataフォルダを以下の”＋”部分に、ドラック＆ドロップで追加します。

<img src="/images/20230831a/image_2.png" alt="" width="1103" height="333" loading="lazy">

追加されると、次のようになります。

<img src="/images/20230831a/image_3.png" alt="" width="1108" height="345" loading="lazy">

左上の`Train`を押下すると、渡したデータをもとに学習が始まります。

数秒で学習が完了し、以下のように学習時の様子が`Trainingタブ`で確認することができます。

<img src="/images/20230831a/image_4.png" alt="" width="868" height="362" loading="lazy">

これで機械学習モデルの作成自体は完了です。

作成したモデルが未知のデータをどれほどの精度で分類できるか評価する方法として、学習時に使用していないテストデータを渡すことができます。CreateML上での実施方法は、Evaluationタブでtraining時と同様に、Testing dataにテスト用のデータをドラック＆ドロップで追加します。

<img src="/images/20230831a/image_5.png" alt="" width="1114" height="398" loading="lazy">

今回の四種類のカブトムシ・クワガタの分類精度は、ノコギリクワガタが50％をわずかに下回っているが、4分類であることを考えると何もパラメータチューニングをしていない割に、オオクワガタ(giantStagBeatle)は65%とまずまずの精度となっていました。

#### 画像中のMetrics

| Class | Count | Correct | FP | FN | Precision | Recall | F1 Score |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SawTooth<br>StagBeatle | 20 | 9 | 10 | 11 | 47% | 45% | 0.46 |
| Miyama<br>StagBeatle | 20 | 10 | 6 |10 | 62% | 50% | 0.56 |
| Giant<br>StagBeatle | 20 | 15 | 8 |5 | 65% | 75% | 0.7 |
| beatle | 20 |9 | 7 | 7 | 59% | 65% | 0.62 |

<img src="/images/20230831a/image_6.png" alt="" width="1153" height="480" loading="lazy">

CreateMLで今回作ったモデルをCoreML　Model形式（`.mlmodel`）として取得します。

Outputタグに移動し、右上のGetから、`beatleAndStagBeatlesClassifier.mlmodel`を任意の場所に保存できます。

<img src="/images/20230831a/image_7.png" alt="" width="1153" height="553" loading="lazy">

### アプリへ実装する

こちらのサイト上部のdownloadからサンプルコード（`Vision+Core-ML.xcodeproj`）を落としてきます。

https://developer.apple.com/documentation/vision/classifying_images_with_vision_and_core_ml

サンプルコードの`Vision+Core-ML.xcodeproj`プロジェクトを開き、識別時に使用している分類器を`MobileNet.mlmodel`から`beatleAndStagBeatlesClassifier.mlmodel`に修正します。

具体的には、`ImagePredictor.swift`の中の　`MobileNet.mlmodel`から`beatleAndStagBeatlesClassifier.mlmodel`に書き換える対応のみを行います。

```swift
class ImagePredictor {
    /// - Tag: name
    static func createImageClassifier() -> VNCoreMLModel {
        // Use a default model configuration.
        let defaultConfig = MLModelConfiguration()

        // Create an instance of the image classifier's wrapper class.
        let imageClassifierWrapper = try? beatlesAndStagBeatlesClassifier(configuration: defaultConfig)　// ここを書き換えています。

        guard let imageClassifier = imageClassifierWrapper else {
            fatalError("App failed to create an image classifier model instance.")
        }
```

これで学習させたモデルで撮影した画像が『カブトムシ』か『〇〇クワガタ』かを識別することができます。

**作成したカブトムシ・クワガタを分類するミニアプリ(再掲)**

（これを使えば、道端で遭遇したカブトムシ・クワガタの種類がわかるようになる？）

<img src="/images/20230831a/beatle_app_2.gif" alt="" width="177" height="384" loading="lazy">

## 最後に

今回は、CreateMLをつかって機械学習モデルを作ってみることができました。しかし、分類精度はあまり良くなかったため、細部までチューニングができるCreate ML Componentsを使用してモデル作成を行ってみたい思います。

今後もSwift周りで学習した内容を投稿していきたいと思いますので、その際もお読みいただけると嬉しいです。

## 参考リンク

https://developer.apple.com/machine-learning/create-ml/

https://developer.apple.com/documentation/createml/

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは[未来報](https://note.future.co.jp/n/n8b57d4bf4604)の記事をご覧ください。
