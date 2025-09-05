---
title: "TensorFlow Liteを使ったFlutterによるモバイル画像識別器を作ってみた"
date: 2022/03/21 00:00:00
postid: a
tag:
  - TensorFlow
  - 画像処理
  - Flutter
category:
  - Mobile
thumbnail: /images/2022/20220321a/thumbnail.png
author: 岸下優介
lede: "初めまして、2022年中途入社でTIG所属の岸下です。FlutterとTensorFlow Liteを使ったモバイル画像識別について執筆させて頂きます。TensorFlow Liteとは..."
---
# はじめに

初めまして、2022年中途入社でTIG所属の岸下です。
本記事は[Flutter連載](/articles/20220315a/)の5記事目になり、FlutterとTensorFlow Liteを使ったモバイル画像識別について執筆させて頂きます。

# TensorFlow Liteとは

近年ではご存じの方も多くなってきたかと思いますが、[TensorFlow](https://www.tensorflow.org/?hl=ja)はGoogle社が開発を行っているディープラーニングを行うためのフレームワークの一種です。
TensorFlowを使えば、

- 画像識別
- 物体検出
- 姿勢推定
- ...

などのAI処理を手軽に行うことができます。

ただ、TensorFlowそのままだと計算コストが非常に高く、リアルタイムで推論を行うにはGPUが必須となってきます。そこで、TensorFlowには[TensorFlow Lite](https://www.tensorflow.org/lite?hl=ja)（TFLite）と呼ばれるエッジデバイス・モバイル向けのフレームワークが公開されております。

TFLiteはCPU上で演算を行うことに特化しており、スマホなどのモバイル端末上でもほぼリアルタイム（CPU次第）でAI処理を行うことが可能となります。

# なぜTFLiteだとCPU上で演算可能なのか

主にTFLiteでは**量子化**されたAIモデルを推論に用います。

AIモデルの中身では入力された特徴量に対して重み付け演算して、その結果を伝搬するためのネットワークが構築されております。この演算の際に本来であれば32bitの浮動小数点精度（float32）が用いられるのですが、それを8bitまで精度を落とすことで高速化を狙います。

これをint8量子化と呼び、TFLiteには他にもfloat16量子化や重み量子化などのオプションが存在します。簡単に言えば予測精度を若干犠牲にして、推論速度を高めようというのがモデルの量子化になります（もちろん、量子化によって精度がガタ落ちするパターンもあります）。

詳しくは、[TensorFlow Lite 8ビット量子化の仕様](https://www.tensorflow.org/lite/performance/quantization_spec?hl=ja)を読まれるとわかりやすいと思います。

# FlutterとTFLiteを用いてホットドッグ識別器を作ってみる

<img src="/images/2022/20220321a/eca77278-952d-59c0-aa1b-97aa98a5d453.png" alt="ホットドッグ画像" width="533" height="1113" loading="lazy">

前置きはここまでにして、早速本題へ入っていきましょう！
元ネタは海外ドラマの[シリコンバレー](https://www.amazon.co.jp/gp/video/detail/B07D43SV5F/ref=atv_dp_season_select_s4)です。
ぜひドラマも見てみてください。

## モデルの準備

モデルはPythonを使って学習し、量子化しました。
モデルの学習は[転移学習と微調整](https://www.tensorflow.org/tutorials/images/transfer_learning)を参考に学習しています。
モデルの量子化は[トレーニング後の量子化](https://www.tensorflow.org/lite/performance/post_training_quantization?hl=ja)を参考にpbモデルから.tfliteへint8量子化を行っています。

### assetsファイルの準備

Flutterのプロジェクトファイルに`assets`ディレクトリを作って、tfliteファイルを入れましょう。
`pubspec.yaml`の変更も忘れずに。

```yaml pubspec.yaml
name: tflite_img_recognition
#...途中省略
flutter:
#...途中省略
  assets:
      - assets/hotdog.tflite
      - assets/labels.txt
```

## 使用ライブラリ

- [tflite_flutter](https://pub.dev/packages/tflite_flutter)^0.9.0
  - TFLiteの演算処理を担ってくれます。
- [tflite_flutter_helper](https://pub.dev/packages/tflite_flutter_helper)^0.3.1
  - TFLiteモデルに入力するための画像前処理など便利ツール詰め合わせです。
- [image_picker](https://pub.dev/packages/image_picker)^0.8.4+10
  - カメラやフォトライブラリから画像を取得するために使います。
- [google_fonts](https://pub.dev/packages/google_fonts/install)^2.3.1
  - UIにそれっぽいフォントが欲しかったので使いました。

## tflite_flutterの注意点

tflite_flutterを使用する前にTFliteの動的ライブラリをワークフォルダにインストールする必要があります。
[Initial setup : Add dynamic libraries to your app](https://pub.dev/packages/tflite_flutter#important-initial-setup--add-dynamic-libraries-to-your-app)

使用PCがLinuxであれば`install.sh`、Windowsであれば`install.bat`を↑のpub.devページからダウンロードして、Flutterのプロジェクトフォルダに置いてください。置いた後、コマンドラインから`sh install.sh`や`insatall.bat`を入力してファイルの実行を行ってください。あとはよしなにやってくれます。

## 画像識別クラス（classifier.dart）

画像を識別するためのClassifierクラスを作っていきます。

重要そうな部分だけ解説を入れていきます。

全体コードは[こちら](https://github.com/bigface0202/Hotdog_or_NotHotdog/tree/master/tflite_img_recognition/lib)から参考にしてください。

### 変数の宣言

```dart classifier.dart（変数の宣言）
  // 推論エンジン
  late Interpreter _interpreter;
  // 推論用のオプション
  // 例えば推論に使うCPUのスレッド数やAndroid/iOS用の特殊なライブラリの使用などを指定できる
  late InterpreterOptions _interpreterOptions;

  // 入力画像サイズ
  late List<int> _inputShape;
  // 出力画像サイズ
  late List<int> _outputShape;

  // 出力結果格納バッファ
  late TensorBuffer _outputBuffer;

  // 入力の型
  late TfLiteType _inputType;
  // 出力の型
  late TfLiteType _outputType;

  // 重みファイル名
  late final String _modelName;

  // 前処理に使用する正規化オプション
  final NormalizeOp _preProcessNormalizeOp = NormalizeOp(0, 1);
```

まずは推論に使われる変数の宣言を行っています。
中身はコード内のコメントの通りで、注意する点としては

- コンストラクタ内で後から変数の初期化を行うため`late`を指定
- 出力結果の格納用に`TensorBuffer`を用意する必要

などがあります。
他にも`NormalizeOp`は正規化オプションで、入力画像の正規化に使われます。
ちなみに`NormalizeOp`に入力する値は`NormalizeOp(mean, stddev)`になっています。平均と標準偏差ですね。

### コンストラクタ、モデルのロード

```dart classifier.dart（コンストラクタ、モデルのロード）
  /* コンストラクタ */
  Classifier(this._modelName) {
    _interpreterOptions = InterpreterOptions();
    _interpreterOptions.threads = 1;

    loadModel();
  }

  /* モデルのロード */
  Future<void> loadModel() async {
    try {
      _interpreter =
          await Interpreter.fromAsset(_modelName, options: _interpreterOptions);

      _inputShape = _interpreter.getInputTensor(0).shape;
      _inputType = _interpreter.getInputTensor(0).type;
      _outputShape = _interpreter.getOutputTensor(0).shape;
      _outputType = _interpreter.getOutputTensor(0).type;

      _outputBuffer = TensorBuffer.createFixedSize(_outputShape, _outputType);
      print('Successfully model file is loaded.');
    } catch (e) {
      print('Something is happened during loading the models: $e');
    }
  }
```

コンストラクタ内では`modelName`、`labelName`、`labelsLength`を受け取り、変数の初期化を行います。
また、モデルのロードを行います。

`loadModel`では.tflite形式の重みファイルをロードします。ロードを待つために非同期の`await`が指定されていますね。
また、ロードしたモデルから`_inputShape`などの入力・出力サイズとデータの型（intやfloatなど）の情報を取得します。
今回は入力画像サイズが160×160で、int8量子化されたモデルを使うので型はuint8になります。
また、出力を格納する`_outputBuffer`もここで出力サイズと型を指定します。

### 画像の前処理と推論

```dart classifier.dart（画像から推論）
  /* 画像の前処理 */
  TensorImage preProcess(TensorImage inputImage) {
    // クロップサイズの指定
    // 入力画像の高さと幅のうち、小さい方が入力画像のクロップサイズとなる
    int cropSize = min(inputImage.height, inputImage.width);

    // 画像の前処理を行う
    return ImageProcessorBuilder()
        .add(ResizeWithCropOrPadOp(cropSize, cropSize))
        .add(ResizeOp(
            _inputShape[1], _inputShape[2], ResizeMethod.NEAREST_NEIGHBOUR))
        .add(_preProcessNormalizeOp)
        .build()
        .process(inputImage);
  }

  /* 推論処理 */
  double predict(Image image) {
    // 入力の型を使ってTensorImageを初期化
    TensorImage inputImage = TensorImage(_inputType);

    // 画像をロード
    inputImage.loadImage(image);
    // inputImageに対して前処理を行う
    inputImage = preProcess(inputImage);

    // 推論処理
    _interpreter.run(inputImage.buffer, _outputBuffer.getBuffer());
    return _outputBuffer.getDoubleList()[0];
  }

  /* 推論エンジンのDestroy */
  void close() {
    _interpreter.close();
  }
```

ここでは画像の前処理と推論処理を行います。

AIモデルの中では、画像の色合いや配色パターンの特徴から「この画像はホットドッグ」、もしくは「そうではない」の判断を下します。

そこで特徴を際立たせたり、無意味な特徴をかき消したりするなどの前処理を行うことによって推論の精度を高めることができます。
また、入力できる画像のサイズが決まっていたり、`TensorImage`の型で画像を入力する必要があったりするので、入力画像サイズを変更したり、`Image`型を`TensorImage`型でキャストしたりする必要があります。そのための前処理となります。前処理が行われた画像は推論エンジンへ入力されて、`_outputBuffer`へ結果が入力されます。

`_outputBuffer`へは画像がホットドッグかどうかの確率が0～1（1だったらホットドッグで、0だったらホットドッグではない）の値で入力されています。

推論エンジンをDestroyする場合は、`close()`でいけます。

## 画面の構築と画像の取得（main.dart, index_scree.dart, image_input.dart）

画像を取得するための`image_input.dart`と画面を作っていきます。
重要そうな部分だけ解説を入れていきます。
画面の全体コードは[こちら](https://github.com/bigface0202/Hotdog_or_NotHotdog/tree/master/tflite_img_recognition/lib)から参考にしてください。

### 画像の取得とinitState

```dart image_input.dart（画像の取得と初期化）
  // 取得した画像ファイル
  File? _storedImage;
  // ImagePickerのインスタンス
  final picker = ImagePicker();
  // 推論結果のテキスト
  String resultText = '';
  // ホットドッグかどうか
  bool isHotdog = false;
  // 推論済みかどうか
  bool isPredicted = false;
  // Classifierのインストラクタ
  late Classifier _classifier;

  /* カメラから画像を取得 */
  Future<void> _takePicture() async {
    final imageFile = await picker.pickImage(
      source: ImageSource.camera,
    );
    if (imageFile == null) {
      return;
    }
    setState(() {
      _storedImage = File(imageFile.path);
    });
    predict();
  }

  /* ギャラリーから画像を取得 */
  Future<void> _getImageFromGallery() async {
    final imageFile = await picker.pickImage(
      source: ImageSource.gallery,
    );
    if (imageFile == null) {
      return;
    }
    setState(() {
      _storedImage = File(imageFile.path);
    });
    predict();
  }

  /* initState */
  @override
  void initState() {
    super.initState();
    _classifier = Classifier('hotdog.tflite', 'assets/labels.txt');
  }
```

画像を取得するための`ImagePicker`や推論を行うための`Classifer`を事前に変数として定義しておきます。

また、image_pickerを使って画像の取得を行います。
カメラで画像を撮るのも、ギャラリーから取得するのも`source`が違うだけで処理は同じです。
`setState`で`_storedImage`に`File`を代入し、この段階で`predict()`を呼び出して推論を行います。
`predict()`は後ほど説明します。

また、`initState()`内で`Classifier`のコンストラクタを呼び出し、初期化します。

### 推論

```dart image_input.dart（推論）
  /* 推論処理 */
  void predict() async {
    // classifierへの入力はImage型なので、Image型にデコード
    img.Image inputImage = img.decodeImage(_storedImage!.readAsBytesSync())!;
    // 推論を行う
    double confidence = _classifier.predict(inputImage);

    // 推論結果から識別を行う
    if (confidence < 0.5) {
      setState(() {
        isPredicted = true;
        isHotdog = true;
        resultText = "Hotdog";
      });
    } else {
      setState(() {
        isPredicted = true;
        isHotdog = false;
        resultText = "Not Hotdog";
      });
    }
  }
```

ここでは、入力された画像に対して`_classifier`を用いて推論を行います。

入力画像は`Image`型なので、デコードを行います。ここで`_storedImage`はnull許容型として定義しているため、`!`をつけることでnullではないことを明記します。推論結果からは`confidence`（確信度）を取り出します。

今回の場合だと、0.5をしきい値としてホットドッグかそうではないかを判断しています。学習に使った画像数が数十枚なので、かなりガバガバです笑。

ホットドッグであれば、`isPredicted`を`true`にして、`resultText`には`Hotdog`を入れます。そうでなければ逆となります。

これでインタラクティブに推論できるように構築できました。レイアウトは適当なので、色々変えてみてもいいかもしれません。

# 推論してみる

<img src="/images/2022/20220321a/fa8d1a39-a1b8-044e-4faa-04523e5bf10f.gif" alt="" width="532" height="1118" loading="lazy">

お！ うまくホットドッグを識別できていますね！

推論処理自体は大体80～90msで結構スムーズに動いてそうです！
原作通りいけば、これで僕にもベンチャーキャピタルから話が…

# おわりに

TFLiteを使えばFlutterでもDeepLearningができます！

今回は2クラス分類でしたが、多クラス分類であれば[ライブラリ側が公開しているデモ](https://github.com/am15h/tflite_flutter_helper/tree/master/example/image_classification)が参考になりそうですね。

ただ、多クラス分類になると後処理（confidenceが高い配列を抽出する、confidenceからラベルを選択するなど）が追加されるのでそこだけ注意です。

flutter_tfliteを使いましたが、まだver.1.0がリリースされていないので業務で使うには少し怖いかもですね🙄
というか、TFLiteもFlutterもGoogle謹製なので早くFlutter向けTFLite公式版を出してほしいところです🤔

また、null safetyが実装されたFlutter2.0リリース後のFlutterは初だったので`late`の存在や、変数宣言時の初期化等にかなり四苦八苦してしまいました...

機会があれば、次はFlutterでの物体検出や姿勢推定についてやってみたいと思います！

今回使用したコードはこちら：https://github.com/bigface0202/Hotdog_or_NotHotdog
