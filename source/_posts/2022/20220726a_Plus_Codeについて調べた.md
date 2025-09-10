---
title: "Plus Codeについて調べた"
date: 2022/07/26 00:00:00
postid: a
tag:
  - 地図
  - 位置特定
  - GoogleMap
category:
  - Business
thumbnail: /images/2022/20220726a/thumbnail.png
author: 真野隼記
lede: "緯度・経度をコード化する技術に興味があったのでOpen Location Code（Plus Code）について調べました。"
---
# はじめに

[地図・GIS・位置特定テーマの連載](/articles/20220719a/)の最後となる6本目です。

TIG真野です。緯度・経度をコード化する技術に興味があったのでOpen Location Code（Plus Code）について調べました。[澁川さんのRedis記事](/articles/20220721a/)にもあったGeoHashのように、位置を特定するようなコード化はなぜかワクワクします。

## Open Location Code（Plus Codes）とは

Google Mapsのヘルプが簡易的でわかりやすかったため引用します。

> plus code は、番地と同じように使えるコードです。住所代わりの簡略なコードとして使用できるほか、通常の住所だけでは絞り込めない具体的な地点の指定にも役立ちます。
> たとえば同じ建物に入口が複数ある場合に、plus code を使えば入口も含めて指定できます。
> plus code は緯度と経度に基づいています。シンプルなグリッド方式のコードで、20 種類の英数字（混同しやすい「1」と「I」などをあらかじめ除外したもの）の組み合わせで表現されます。

Google Mapsを開くと出てくる、`JPCG+XX 品川区、東京都` コードのことです（図はフューチャーの本社がある大崎アートヴィレッジタワー）の位置情報です。Google Maps上で表示・及び検索で使えるのは便利です。

<img src="/images/2022/20220726a/image.png" alt="image.png" width="1200" height="761" loading="lazy">

Open Location Codeは[google/open-location-code](https://github.com/google/open-location-code)で実装も[仕様](https://github.com/google/open-location-code/blob/main/docs/specification.md)もApache License 2.0で公開されています。変換はこれらの実装を用いればオフラインで可能です。

2015年にリリースされたようです。

* [【地図ウォッチ】 Google、地球上の場所をピンポイントで示すコード「OLC」を生成できるサイト「plus+codes」公開 - INTERNET Watch](https://internet.watch.impress.co.jp/docs/column/chizu/720142.html)
* [グーグル、地球上のあらゆる地点をコード化する「plus+codes」リリース - CNET Japan](https://japan.cnet.com/article/35068908/)

公式ページは[Plus Codes](https://maps.google.com/pluscodes/) です。Plus Codeを生成する仕組みがOpen Location Code（OLC）で、ロケーションコードを生成するオープンな仕組みのためこの名前になったそうです。そもそも、なんでPlus Codeかというと、生成されるコードにプラス記号が含まれているためだそうです（なるほど！）。

## なぜ生まれたか

[公式のLearnタブ](https://maps.google.com/pluscodes/learn/)にどのような用途で使われることを想定しているかが短くまとめてくれています。

* 個人用途: 通りの名前や通りがない場合でも、自宅、店舗、待ち合わせ場所など、あらゆる場所を共有できる
* 企業: 顧客が店舗を探しやすく、また商品を配達する場合に通りの名前や番号がなくても場所を得的できる
  * 正確な集荷・降車場所を取得する
* 救急: 救助活動を迅速化する
* 政府: どこにすんでいても、郵便・社会扶助・投票などの市民サービスを提供できるように
* NGO: 人道的・災害救援を提供し、地図データが不完全な地域を支援する。サービスの記録管理と追跡を改善する

読めば分かる通り、どちらかと言えば通りに名前がないとか災害時にも活用できるような意図が感じられます。

気になったので、[Evaluation-of-Location-Encoding-Systems](https://github.com/google/open-location-code/wiki/Evaluation-of-Location-Encoding-Systems)を読んでみるとまさにそのような意図が最初に書いてあります。

* 世界の多くの地域・世界都市人口の半分以上が住所が無い（出典が2005年世界銀行の[Street Addressing and the Management of Cities](https://www.citiesalliance.org/sites/default/files/CA_Images/Street_Addressing_Manual.pdf)だったので改善していると思いたいですが..）
  * 都市部でも多くの道路に名前が無いため、それらの道路沿いの場所には住所が無い（！）
    * 住所にStreet Addressが出てくる、文化の違いを感じる説明だなと感じますね
* スマートフォンの価格の下落と普及により、GPSを落ちいてアドレスとして利用できるソリューションが求められる
* 要求事項（抜粋）
  * コードは短く覚えられるように
  * コードにはなるべくどの言語の単語も含めない
  * 2つのコードを見て、近いか遠いか、方向も判断したい
  * オフラインでエンコード/デコードができる（モバイル通信が発生すると安価ではない）
  * アルゴリズムは公開され自由に使える。1つのプロバイダーに依存しない

### 緯度・経度じゃダメなのか？

この手のソリューションでたまに思う、（GeoHashのように文字列プレフィックスで検索するのではないなら）緯度・経度を生で共有すればよいじゃないか？ に関しても記載がありました。まとめます。

* 緯度・経度は順序が重要で逆にすると異なる場所を示す
* 約10m精度で表現すると、15〜20文字のテキスト文字（「0.39122,9.45225」〜「-43.95134、-176.55053」）が必要。一般的な電話番号の約2倍の長さ
* 緯度・経度はポイント（点）を示すので、公園といった領域を示すのには不適。　緯度・経度の精度を切り捨て≒場所の移動 である

極論、自分の住所を町名・番地とかじゃなくて緯度経度で覚えているの？ って言われた気持ちになりました。確かに覚えられないですし扱いにくいですね。

### GeoHashじゃダメなのか？

同様にGeoHashとの相違点についても触れていました。

* GeoHashはA, I, L, Oを除く0-9A-Zの32文字を利用するため、アルファベットのO,Iに似た数値の0,1を利用できてしまう
* 単語（例として"DRUGGED"）とか、ほぼ単語に見える（"ZUR1CH"）などが生成されてしまう
  * （筆者補足）システム的に内部で検索キーとして持つのであればこの特性は全く問題ないですが、エンドユーザーに住所として利用可能とする（露出させる）前提では問題あるということです
* 経度180、経度0、赤道、および北極と南極で5つの不連続性（近くの場所に異なるジオハッシュコードがある場所）が出てくる。赤道と経度0は人口密集地帯があり許容できない
* たとえば、「c216ne4」と「c216new」（およびその他）は同じ座標（45.37 -121.7）にデコードされるといったことができる

他にも要求事項に沿った既存サービス・規格がなかったため生まれたと書かれています。

## コード体系

さきほど見せたPlus Codeは `JPCG+XX 品川区、東京都` でしたが、これがどのようなルールで構成されるか見ていきましょう。

* 利用可能な文字は20
  * すでに共有済みですが数字0,1,2,5と似ているアルファベットO,I,Z,Sは利用しない。単語の利用頻度が高いA, B, D, E, K, L, N, T, U, Yも利用しない）
  * 23456789CFGHJMPQRVWX
  * ドキュメントにもよく書かれていますが、W9とWCは隣接するという、わかりにくさがあります
* 桁数
  * 最小2桁～最大15桁
  * デフォルト10桁
  * 10桁未満では、偶数のみが有効
* 書式
  * 区切り文字の「+」は8桁の後に挿入する
* 精度
  * プラスコードの精度は、「+」記号の後の桁数で表現される
    * プラス記号の後の2桁: およそ13.7×13.7メートルの領域
    * プラス記号の後の3桁: 約2.7×3.5メートルの領域
    * プラス記号の後の4桁: 約0.5×0.8メートルの領域
  * 細かい精度表は[こちら](https://github.com/google/open-location-code/blob/main/docs/specification.md#code-precision)

`JPCG+XX 品川区、東京都`が、「+」が挿入されるオフセット位置が異なるとか、後ろの `品川区、東京都` って何って思われた方も多いかと思います。

じつはPlus Codeには **ショートコード** と呼ばれる省略版が存在します。省略しないものはオープンロケーションコードと呼ばれます。

* ショートコード
  * 現在の位置（GPSなどから取得）を基準にして、最も近い位置にある場所を特定する
  * 例えば、 `CG+XX` という略称も可能です
  * 現在位置の代わりに、 `品川区、東京都` といった都市名を入れることもできます
  * ローカルコードとも呼ばれます
* オープンロケーションコード
  * 先程のショートコードなプラスコードを、オープンロケーションコードにすると[8Q7XJPCG+XX](https://plus.codes/8Q7XJPCG+XX)です
  * グローバルコードとも呼ばれます
  * ためしに、 `JPCG+XX ギリシャ` などとすると、山の中？ が特定されます

<img src="/images/2022/20220726a/image_2.png" alt="image.png" width="1200" height="751" loading="lazy">

## Web API

オフラインでも使えるライブリが公開されていますが、まずplus.codes のWeb APIを使ってみます。
[ドキュメント](https://github.com/google/open-location-code/wiki/Plus-codes-API)から、Google APIキーなしだと以下。

```
https://plus.codes/api?address=35.62253406128506,139.72745939860533&email=YOUR_EMAIL_HERE
https://plus.codes/api?address=8Q7XJPCG%2BXX&email=YOUR_EMAIL_HERE
```

どちらも以下のようなJSONを取得できます。

```json
{
"plus_code": {
"global_code": "8Q7XJPFG+2X",
"geometry": {
  "bounds": {
    "northeast": {
      "lat": 35.622624999999985,
      "lng": 139.72749999999996
    },
    "southwest": {
      "lat": 35.62249999999999,
      "lng": 139.72737499999994
    }
  },
  "location": {
    "lat": 35.62256249999999,
    "lng": 139.72743749999995
    }
  },
  "locality": {}
},
"status": "OK"
}
```

boundsのnortheast, southwestは書いているママですが、北東と南西の座標です。locationはその中心を提供座標です。Google APIキーを用いればlocalityの部分に論理的な住所情報も取得できますし、ショートコードでの変換もできるようです。

```json
    "locality": {
      "local_address": "Shinagawa, Tokyo"
    },
```

## Go SDK

主要な言語のライブラリは揃っています（PL/SQLまである）。せっかくなのでGoで遊んでみます。

* https://github.com/google/open-location-code
* https://pkg.go.dev/github.com/google/open-location-code/go

```go
package main

import (
	"fmt"
	"github.com/google/open-location-code/go"
)

func main() {
	// 緯度経度 -> OLC
	locationCD := olc.Encode(35.622375, 139.727375, 10) //緯度(float64),経度(float64),OLCの桁数(int)
	fmt.Printf("緯度経度->ロケーションコード: %s\n", locationCD)

	// OLC -> 緯度経度
	area, err := olc.Decode("8Q7XJPCG+XX")
	if err != nil {
		// エラーハンドリング
	}
	fmt.Printf("ロケーションコード->緯度経度: %v\n", area)

	// 横浜駅の緯度経度を指定して、ショートコード　-> ロケーションコードの復元
	nearest, err := olc.RecoverNearest("JPCG+XX", 35.466260702365226, 139.62208345627434)
	if err != nil {
		// エラーハンドリング
	}
	fmt.Printf("ショートコード->ロケーションコード: %s\n", nearest)

	// 横浜駅の緯度経度を指定して、ロケーションコード -> ショートコード
	shorten, err := olc.Shorten("8Q7XJPCG+XX", 35.466260702365226, 139.62208345627434)
	if err != nil {
		// エラーハンドリング
	}
	fmt.Printf("ロケーションコード->ショートコード: %s\n", shorten)

}
```

実行結果です。

```
>go run main.go
緯度経度->ロケーションコード: 8Q7XJPCG+XX
ロケーションコード->緯度経度: {35.622375 139.727375 35.6225 139.7275 10}
ショートコード->ロケーションコード: 8Q7XJPCG+XX
ロケーションコード->ショートコード: JPCG+XX
```

ショートコードの場合は、「品川区、東京」の代わりに、現在位置を示した緯度経度を指定すると、近隣のコードを探してくれるのが便利だなと思いました。

## まとめ

Plus Codeとは何か、どのような意図で作られたかについてまとめました。調べるまではGeoHash（やQuadKey）との違いはなんだろうか？ と疑問でしたが、背景を抑えていくと使い分けも分かってくると思います。GoのSDKも中身の実装までは軽くしか見れていませんが、コア部分はコンパクトに見えます。少なくてもSDKのAPIを見てみると、どこまでがアルゴリズムで、どこからはGoogle Maps APIのジオコーディングで行われているかイメージが湧きます。

最後まで読んでいただきありがとうございました。
