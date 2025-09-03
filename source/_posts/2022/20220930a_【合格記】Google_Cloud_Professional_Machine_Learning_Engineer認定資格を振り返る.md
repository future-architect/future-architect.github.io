---
title: "【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る"
date: 2022/09/30 00:00:00
postid: a
tag:
  - GoogleCloud
  - 合格記
  - PMLE
  - 機械学習
category:
  - DataScience
thumbnail: /images/2022/20220930a/thumbnail.png
author: 岸下優介
lede: "先日、Google Cloudの認定資格であるProfessional Machine Learning Engineer認定資格を受験し、取得することができました。また、今回はリモート試験にて受験をしてみました。この記事ではProfessional Machine Learning Engineer認定資格の合格に至った学習過程とリモート試験体験記について..."
---

<img src="/images/2022/20220930a/tokyo.png" alt="" width="800" height="333">

こんにちは、TIGの岸下です。

先日、Google Cloudの認定資格である[Professional Machine Learning Engineer認定資格](https://cloud.google.com/certification/machine-learning-engineer)を受験し、取得できました。
また、今回はリモート試験にて受験をしてみました。
この記事では

- Professional Machine Learning Engineer認定資格の合格に至った学習過程
- リモート試験体験記

について書いていこうと思います。

## 筆者のバックグラウンドについて

今回の試験では受験者のバックグラウンドによって学習過程・学習量がかなり変わると思うので、以下に筆者のバックグラウンドを記しておきます。

- 大学・大学院の研究室が医用工学系で機械学習（ML）、DeepLearning（DL）の発表をほぼ毎週聞いていたため、基礎はある程度身についていた。
- 新卒から約2年ほど画像処理AI関連の業務に従事。
  - データの前処理から学習・推論・評価といった一連の処理・計算は知っており、Pythonで書くことができた。
  - MLOpsは経験無し。
  - ML/DL, AI大好き人間ではなかったがTwitter等でトレンドは追っかけていたため、画像処理以外でもML/DL技術の仕組みと何に使われるかはある程度知っていた。
    - 強化学習
    - NLP
    - など
- 現在、8ヶ月ほどGCP関連のプロジェクトに従事。
  - どういったサービスが何に使われるかや、Googleオススメのアーキテクトなどがなんとなーくわかってきたフェーズ。
  - [Processional Cloud Architect](https://cloud.google.com/certification/guides/professional-cloud-architect?hl=ja)は取得済み。

## 試験と出題範囲について

2022年9月25日現在だと、Professional Machine Learning Engineerの試験は**英語試験**のみとなります。
問題数は60問で試験時間は2時間となります。
英語に関しては類似の言い回しも多く、ML/DL系の英単語を知っていれば難なく完遂できると思います。

出題範囲は[公式](https://cloud.google.com/certification/machine-learning-engineer?hl=ja)からの抜粋です。
各出題範囲に対して受験後の体感を書いておきます。

|  出題範囲  |  ざっくりした内容  |
| ---- | ---- |
|  ML 問題の枠組み  |  ■ このML/DLで何ができるのか？  |
|  ML ソリューションの設計  | ■ 利用者の前提知識によって、BigQueryML, AutoML, VertexAIの使い分けをどうするか。<br>■ 「最小限のエフォートで」「インフラを管理したくない」「Python使いたい」などユーザーの要望に沿うことのできるソリューション設計など。  |
|  データ準備 / 処理システムの設計  |   ■ 特徴量エンジニアリング（連続値どうするか、カテゴリ値どうするか、標準化・正規化...）。<br> ■ Dataflow, DataFusion, BigQueryの使い分けなど。  |
|  ML モデルの開発  |  ■ ML/DLモデルの評価方法（**Recall/Accuracy/Precisionは絶対に理解しておきましょう。**） <br>■ モデル開発におけるアンチパターンとその対応など。  |
|  ML パイプラインの自動化とオーケストレーション  |  ■ KubeFlow/TFXの使い分けなど。 <br> ■ MLOpsのベストプラクティス（データがCloud Storageに置かれたらPubSubに通知してCloud Functionで～的な）など。  |
|  ML ソリューションのモニタリング、最適化、メンテナンス  |  ■ データセットやモデルのモニタリング（精度が急に落ちていないか、データセットに異常値が発生していないかなど）など。<br> ■ 上記のような問題が起きないようにするにはどうするかなど。 |

## 学習過程

### 1. Coursera

8月に学習を開始し、ちょうどCourseraで[Google Cloud関連コース1ヶ月無料＆1ヶ月で完遂すればバウチャーあげるよキャンペーン](https://www.coursera.org/promo/googlecloud-training-promotion?utm_campaign=July22_blog&utm_medium=institutions&utm_source=googlecloud)（既に終了済）やっていたので、[Preparing for Google Cloud Certification: Machine Learning Engineer Professional Certificate](https://www.coursera.org/professional-certificates/preparing-for-google-cloud-machine-learning-engineer-professional-certificate)を受講しました。

以下9コースの詰め合わせセットになっています。

- Google Cloud Big Data and Machine Learning Fundamentals
- How Google does Machine Learning
- Launching into Machine Learning
- TensorFlow on Google Cloud
- Feature Engineering
- Machine Learning in the Enterprise
- Production Machine Learning Systems
- MLOps (Machine Learning Operations) Fundamentals
- ML Pipelines on Google Cloud

#### 良さみ

- 各コースでハンズオン形式で学べるQuikLabが付いており、手を動かしながら以下の内容について学べる。
  - DataPrepを利用した学習用データセットの準備
  - DataFusionを利用したUIによるデータETL処理構築
  - PythonとDataFlowを利用したデータETL処理構築
  - BigQueryMLを利用した機械学習モデルの構築（学習・推論・評価）
  - AutoMLを利用した機械学習モデルの構築（学習・推論・評価）
  - VertexAI上でのKubeFlowを利用したMLOps構築
  - VertexAI上でのTFXを利用したMLOps構築
  - ...etc.
- 9コース終わると、GCPにおけるMLOpsの知識は身につく。
  - Googleのベストプラクティスがわかるようになりました。
  - 試験に出てくる内容の80％以上は網羅できていると思います。
    - この単語・サービス知らない！ はほとんどありませんでした。

#### つらみ

- 全9コース＆英語音声/字幕しかない。
  - 英語の肩慣らしだと思って頑張りました。
- GKE立ち上げるのに10分かかったり、学習回すのに1時間かかったりし、時間が溶ける。
  - パイプラインの仕組みや処理の流れで類似した箇所が多いので、ある程度掴んだら飛ばし飛ばしやるといいと思います。
  - （たまに、完遂しないと修了認定出してくれないレクチャーもあるのでそこは注意…）
- ML/DLのバックグラウンドがある人にとっては既知の内容も多い。
  - 特にFeature Engineeringのコースは基礎的な前処理の話が多く、飛ばし飛ばし or 倍速で見て雰囲気感じるだけでもいいと思います。

#### 感想

ボリュームがかなりある分、中身がかなり濃いです。ML/DL関連は最近全く触れていなかったので改めて復習をできました。
特にRecall/Precision/Accuracy/F1-scoreあたりの使い分けは完全に忘れていました（PrecisionとAccuracyがややこしい…）。
また、GCPではML/DL向けに多くのサービスを用意しており、MLOpsに関してはステップを踏んで導入（コードをプッシュして自動ビルドする初期段階から、データがGCSに置かれた時点でETL処理→学習処理に入る半自動段階など）を進めていくことができるようで、非常に勉強になりました。

### 2. Udemy

Udemyにて模擬試験を購入し、Coursera終了後はひたすらこちらをやっていました。
[Google Cloud Professional Machine Learning Engineer \*2022\*](https://www.udemy.com/course/google-cloud-professional-machine-learning-engineer-2022/)

#### 良さみ

- 試験問題の雰囲気がわかる。
  - 問題の出題形式が網羅されており、大体こんな感じで問題出されるんだなーというのが掴めます。
- 回答の解説が秀逸
  - 間違えた問題の解説がしっかりしており、Google公式のリンクも付いているので勉強になります。
- 英語の勉強になる。
  - こちらの教材でわからない単語はしっかり潰しておきましょう。

#### つらみ

- あくまで**模擬試験**
  - こちらの模擬試験と本試験の出題内容は全く別物になります。
  - 類似問題はあり、Googleオススメのベストプラクティスを適用するのは同様なので、この模擬試験やっておいて損はないです。
- 本試験は**60問**
  - 模擬試験は50問になっています。
  - もうこれは調べてなかった自分が悪いのですが、受験開始して60問ということを知りました…

#### 感想

Udemyの模擬問題集をやったことでどのような形式で問題を出されるのかという部分で良い練習となりました。
問題内容から要望を汲み取ってGCPでの実装を提案するというのは模擬問題集も実際の試験も変わりはないです。
以下のような言い回しから意図をくみ取るのが大切だと思いました。

- 「コストを最小にしたい」
- 「インフラの管理コストは抑えたい」
- 「マネージドサービスで」
- 「最小限のエフォートで」
- 「早く実装したい」
- 「機械学習のバックグラウンドがなく、SQLは使える」
- ...etc.

## リモート受験について

今回、テストセンターで受けずにリモート環境での受験を体験してみました。
注意点としては以下になります。

### 受験前

- アカウントの作成
  - **言語別でアカウントの作成が必要**です。
  - 自分はPCAを日本語で受けたので、英語試験用にアカウントをもう1つ作りました。

- 受験時間の予約
  - テストセンターと違い、早朝や夜遅くにも受けることができます。
  - 英語を読むのに体力使うと思ったので朝9時の一番元気な時間に予約しました😂
- 受験時間はJST（日本時間）
  - 受験予約時にタイムゾーンが書かれていないのですが、ちゃんとJSTでした。
  - 受験時間確定時にタイムゾーン出てくるので、そこで念のため確認してください。
- 事前に専用のブラウザをダウンロード・インストールしておく
  - 当日は専用ブラウザから試験を受けます。
  - 受験用のページから事前にダウンロードできます。
- 顔認証用の画像を事前に撮っておく。
  - こちらも受験用のページから事前に撮影できます。

### 受験当日

- バックグラウンドソフトは切っておく。
  - Slack等通知がきそうなものは切っておきましょう。
- 机の上、周辺は何も置かない。
  - 筆記用具❌
  - デュアルディスプレイ❌
  - 本❌
  - スマホ❌
  - 水❌
  - ラップトップ用スタンドデスクはOKでした。
- PCに差し込まれているUSBは最小限とする。
  - 特に注意は受けませんでしたが、マウスのみ挿すようにしていました。
  - 盗聴・盗撮などに敏感らしく、念のための対応です。
- 大きめの手鏡を用意しておく。
  - 足元やPC周辺を監視員の人に見せるためにスマホのカメラ or 手鏡で写すように言われるのですが、スマホは画面が小さく大きめの手鏡で見せたほうがスムーズです。
- **PCが安定動作することを確認する。**
  - これが一番大事です。
  - Surface Pro4で受験したのですが、受験中に[初期不良の画面揺れが発生](https://muichinoblog.com/gadget/sur4-flick)し、40問くらい問題文が揺れて目が死にました。
- 監視員とのチャットが英語
  - 難しい内容は聞かれないですが、質問によっては「I'm ready.」「Just a moment, please.」と回答できるようにしておきましょう。
  - 質問例：「トイレ行く時間あげるから帰ってきたら教えてね」「スマホもう使わないから手の届かないところおいてね」など

### 試験終了後

- 試験終了後すぐに結果がでる。
  - 「Pass」で合格、「Fail」で不合格です。
  - ここはテストセンターと同じですね。
- アンケートのお願いがくる。
  - アンケートは受けても受けなくてもどちらでもOKです。
  - 自分は画面揺れで諦めました。

## 受験した感想

GCPにおけるML/DLのベストプラクティスやMLOpsについて網羅的に学習する良い機会になりました。
受験前は「BigQueryMLなにそれ？ おいしいの？」みたいな状態でしたが、GCPのML/DLサービスの棲み分けはある程度理解できました。もし業務で使うことがあればすんなり入れるのかなと思います。

また、GoogleはML/DLのサービス（前処理からデプロイまで全て）に力入れているんだなーということを学習と受験の過程で体感できました。GoogleのAIスゴイ！

これからGCPでMLOpsやっていこう・やっていきたい方には学習のきっかけとなる良い試験だと思います（合格特典ももらえますし）。ぜひ受験してみてください！
