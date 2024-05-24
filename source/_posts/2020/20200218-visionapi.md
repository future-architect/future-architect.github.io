---
title: "GCP連載#9 初めてのGCP 画像AI(Vision API)をさわってみた"
date: 2020/02/18 10:16:55
postid: ""
tag:
  - GCP
category:
  - DataScience
author: 村瀬善則
lede: "Google Cloud の Vision API は REST API や RPC API を使用して強力な事前トレーニング済みの機械学習モデルを提供します。画像にラベルを割り当てることで、事前定義済みの数百万のカテゴリに画像を高速で分類できます。オブジェクトや顔を検出し、印刷テキストや手書き入力を読み取り、有用なメタデータを画像カタログに作成します。Google Cloudの公式ページによりますと事前トレーニング済みの機械学習モデルを利用してラベルの割り当てやOCRとしてすぐに利用できるようですね。"
---
# はじめに
こんにちは。TIG DXチームの村瀬です。

今回は[GCP連載企画](/articles/20200202/)の9日目です。私個人としてはGCPはほとんど利用したことがないので、せっかくだから面白そうなことを試してみようと思い、画像AIのサービスであるVision APIについて試してみることにしました。

# Vision APIとは

> Google Cloud の Vision API は REST API や RPC API を使用して強力な事前トレーニング済みの機械学習モデルを提供します。画像にラベルを割り当てることで、事前定義済みの数百万のカテゴリに画像を高速で分類できます。オブジェクトや顔を検出し、印刷テキストや手書き入力を読み取り、有用なメタデータを画像カタログに作成します。
> https://cloud.google.com/vision

Google Cloudの公式ページによりますと事前トレーニング済みの機械学習モデルを利用してラベルの割り当てやOCRとしてすぐに利用できるようですね。

機能(検出のタイプ)としては以下のものがあります。

|Feature Type  |Description  |
|---|---|
|Face detection   |顔の検出  |
|Landmark detection   |ランドマークの検出  |
|Logo detection  |ロゴの検出  |
|Label detection  |ラベル検出  |
|Text detection  |光学式文字認識（OCR）  |
|Document text detection (dense text / handwriting)  |PDF/TIFF ドキュメント テキスト検出 |
|Image properties  |画像プロパティの検出  |
|Object localization  |複数のオブジェクトを検出する  |
|Crop hint detection  |クロップヒントの実行  |
|Web entities and pages  |ウェブ エンティティおよびページの検出  |
|Explicit content detection (Safe Search) |セーフサーチ プロパティの検出  |

詳細は公式ページを参照ください。
https://cloud.google.com/vision/docs/features-list?hl=ja

## 料金

無料枠があり、最初の1,000ユニット/月は無料。それを越した場合でも1,000ユニットあたり$1.50。なんと太っ腹！

詳細は公式ページを参照ください。
https://cloud.google.com/vision/pricing?hl=ja

# 準備
## プロジェクト作成
<img src="/images/20200218/photo_20200218_01.png" class="img-middle-size" loading="lazy">

プロジェクト名を入力し作成ボタンをクリック

## Cloud Vision APIの有効化

<img src="/images/20200218/photo_20200218_02.png" class="img-middle-size" loading="lazy">

Cloud Vision APIの画面に移動して有効にするボタンをクリック
https://cloud.google.com/vision/docs/before-you-begin

## APIキーを作成

<img src="/images/20200218/photo_20200218_03.png" class="img-middle-size" loading="lazy">

APIとサービスの画面に移動して認証情報を作成からAPIキーを選択してクリック

<img src="/images/20200218/photo_20200218_04.png" class="img-middle-size" loading="lazy">

これでAPIキーが作成されました。
後ほどこのAPIキーを利用します。

事前準備はこれで完了です。

# APIをコールしてみる

バリエーション豊かな機能がありますが、今回はLabel detection(ラベル検出)とText detection(光学式文字認識（OCR）)を試してみます。

## Label detection(ラベル検出)

まずは、Label detection。Futureの[キャリア採用ページ](https://www.future.co.jp/recruit/career/job/engineer/)にある、つよつよエンジニア渋川の[画像](https://www.future.co.jp/recruit/common/img/member/er_popup_14_pc.jpg)を利用してどのようなラベルが検出がされるか見てみましょう。今回の検証では改めて説明する必要はないと思いますがお手軽万能HTTPアクセスツールcURLを利用します。

<img src="/images/20200218/photo_20200218_05.jpeg" class="img-middle-size" loading="lazy">

keyの項目に先ほど取得したAPIキーを設定します。

```sh Request
curl -H 'Content-Type:application/json' -d '{"requests":[{"image":{"source":{"imageUri":"https://www.future.co.jp/recruit/common/img/member/er_popup_14_pc.jpg"}},"features":[{"type":"LABEL_DETECTION","maxResults":10,"model":"builtin/stable"}],"imageContext":{"languageHints":[]}}]}' https://vision.googleapis.com/v1/images:annotate?key=xxxxxxxxxxx
```

リクエストのJSONを整形するとこんな感じ

```json json
{
	"requests": [
		{
			"image": {
				"source": {
					"imageUri": "https://www.future.co.jp/recruit/common/img/member/er_popup_14_pc.jpg"
				}
			},
			"features": [
				{
					"type": "LABEL_DETECTION",
					"maxResults": 10,
					"model": "builtin/stable"
				}
			],
			"imageContext": {
				"languageHints": []
			}
		}
	]
}
```

レスポンスは以下の通りJSON形式で返却されます。

```json Response
{
  "responses": [
    {
      "labelAnnotations": [
        {
          "mid": "/m/015c4z",
          "description": "Sitting",
          "score": 0.84581405,
          "topicality": 0.84581405
        },
        {
          "mid": "/m/0dzf4",
          "description": "Arm",
          "score": 0.82127464,
          "topicality": 0.82127464
        },
        {
          "mid": "/m/0c_jw",
          "description": "Furniture",
          "score": 0.7518786,
          "topicality": 0.7518786
        },
        {
          "mid": "/m/01kq3x",
          "description": "White-collar worker",
          "score": 0.74684197,
          "topicality": 0.74684197
        },
        {
          "mid": "/m/0dzd8",
          "description": "Neck",
          "score": 0.7371684,
          "topicality": 0.7371684
        },
        {
          "mid": "/m/019nj4",
          "description": "Smile",
          "score": 0.6944891,
          "topicality": 0.6944891
        },
        {
          "mid": "/m/0dnr7",
          "description": "Textile",
          "score": 0.6563325,
          "topicality": 0.6563325
        },
        {
          "mid": "/m/05wkw",
          "description": "Photography",
          "score": 0.62422496,
          "topicality": 0.62422496
        },
        {
          "mid": "/m/08xgn7",
          "description": "Comfort",
          "score": 0.55251026,
          "topicality": 0.55251026
        },
        {
          "mid": "/m/02crq1",
          "description": "Couch",
          "score": 0.5395869,
          "topicality": 0.5395869
        }
      ]
    }
  ]
}
```


descriptionだけ抜き出して整理すると

|description  |日本語  |
|---|---|
|Sitting　   |座っている  |
|Arm　|腕  |
|Furniture　|家具  |
|White-collar worker　   |サラリーマン  |
|Neck　|首  |
|Smile　|ほほえみ  |
|Textile　|織物  |
|Photography　|写真撮影  |
|Comfort　|快適さ  |
|Couch　|ソファー  |

当たり前と言えば当たり前なのですが、画像から連想される説明が返却されてます。
サラリーマンが快適にソファーに座っていてほほえんでおり、首や腕、ソファーの繊維も映っていますね。

## Text detection(光学式文字認識（OCR）)

続いてText detection。渋川の[スペックのレーダーチャート](https://www.future.co.jp/recruit/common/img/member/chart_14_pc.png)を解析してみましょう。

<img src="/images/20200218/photo_20200218_06.png" class="img-middle-size" loading="lazy">


```sh Request
curl -H 'Content-Type:application/json' -d '{"requests":[{"image":{"source":{"imageUri":"https://www.future.co.jp/recruit/common/img/member/chart_14_pc.png"}},"features":[{"type":"TEXT_DETECTION"}]}]}' https://vision.googleapis.com/v1/images:annotate?key=xxxxxxxxxxx
```

```json:Response
{
  "responses": [
    {
      "textAnnotations": [
      "～～　中略　～～"
        ],
        "text": "コミュケーションカ\nメイタリティ\n画性\n5.\n3\n4\n5.\nインライン\nスケート\nメタ学習法\nオタク度\nLO\n"
    }
  ]
}
```

解析したワードを整理すると

|text|
|---|
|コミュケーションカ|
|メイタリティ|
|画性|
|5|
|3|
|4|
|5|
|インラインスケート　   |
|メタ学習法オタク度|


一部の文字はレーダーチャートの線と重なって別の文字として認識されてしまったり、読み込めなかったりしていますが(目的にもよりますが)十分な精度かと思います。

画像AIってすごいですね。


# さいごに

機械学習と聞くと利用できるようにするのにトレーニングが必要で、ある種の車輪の再発明に近い作業が必要になり、コストと時間が掛かるものと思っていたのですが、事前トレーニング済みの機械学習モデルが安価にお手軽に利用できてとても便利ですね。様々な検出のタイプがあり、(当たり前ではありますが)適切なタイプを選ぶ必要があるのでそこさえ間違えなければ多種多様なニーズに応えられる素晴らしいAPIかと思います。Vision APIのすばらしさを実感できる検証となりました。

今回は検証目的でプロジェクトを作成したのでプロジェクトを削除して完了です。


[GCP連載企画](/articles/20200202/)の9日目でした。次は前原さんの[Cloud Build を知ってみよう](/articles/20210315/)です。
