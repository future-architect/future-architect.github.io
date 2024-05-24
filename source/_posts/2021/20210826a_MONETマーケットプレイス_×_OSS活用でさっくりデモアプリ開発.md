---
title: "MONETマーケットプレイス × OSS活用でさっくりデモアプリ開発"
date: 2021/08/26 00:00:00
postid: a
tag:
  - MaaS
  - MONETマーケットプレイス
  - 外部寄稿
  - Vue.js
  - TypeScript
  - Vuetify
category:
  - Programming
thumbnail: /images/20210826a/thumbnail.gif
author: kazuma-takeuchi
lede: "MONET Technologies Inc. の竹内です。このたび、フューチャー技術ブログに寄稿させていただいています。今回は、弊社のMONETマーケットプレイス上のプロダクトを使って、MaaSアプリをイメージしたデモアプリを作ってみました。今回イメージしたデモアプリは「イベント会場へのマルチモーダル移動経路検索&予約&搭乗Webアプリ」です。"
---

# はじめに

MONET Technologies Inc. の竹内です。このたび、フューチャー技術ブログに寄稿させていただいています。

今回は、弊社のMONETマーケットプレイス上のプロダクトを使って、MaaSアプリをイメージしたデモアプリを作ってみました。

今回イメージしたデモアプリは「イベント会場へのマルチモーダル移動経路検索&予約&搭乗Webアプリ」です。

<img src="/images/20210826a/demo_short2.gif" alt="アプリデモ動画" width="640" height="400" loading="lazy">


<img src="/images/20210826a/image.png" alt="アプリ紹介" width="1200" height="367" loading="lazy">


MONETマーケットプレイスのプロダクトを利用することにより、このようなデモアプリを省エネで作成することができます。画面動作の実装単体であれば、2週間弱であらかた完成しました。

本記事では、デモアプリ開発時の利用場面を交えて、MONETマーケットプレイスと各プロダクトの魅力をお伝えできればと思います。

# そもそもMONETマーケットプレイスとは?

こちらは既に[以前の記事](io/articles/20210404/)でも紹介されていますが、MaaS (Mobility As A Service)に関わるAPI/ソフトウェアを提供するプラットフォームです。

弊社を含め、複数の3rd Partyが提供するAPIを同一プラットフォーム上で契約、管理、実行出来るというメリットに加えて、プラットフォーム上に集まるAPIやデータを各サービサー(マーケットプレイス利用者)と共に活用したい、というコンセプトで現在稼働しているサービスです。

今回は、一体MONETマーケットプレイスで何が出来るのか、イメージ作りに貢献できればと思い、デモアプリ開発を行ってみました。デモアプリについては、[MONETマーケットプレイス チュートリアルページ](https://developer.monet-technologies.co.jp/tutorials#tutorial-eventdrt)に実装など詳細を記載しています。

別途、ご参考にしていただけると幸いです。

# MaaSを題材にしたデモアプリ開発

それでは簡単に今回作ったデモアプリを紹介していきます。大まかに、

1. デモアプリのコンセプト
1. 構成
1. 各機能でのマーケットプレイス利用場面

といった構成で説明します。

## デモアプリコンセプトとエンドユーザのイメージ

今回作成するデモアプリの簡単な背景を決めておきます。私はデマンド交通サービスの提供者であり、複数のイベント提供会社と提携しながら、エリア内のエンドユーザをイベント会場付近まで送迎するサービスを開始したいサービサーだとします。


<img src="/images/20210826a/image_2.png" alt="デモアプリコンセプトとエンドユーザのイメージ" width="1198" height="526" loading="lazy">

この時、エンドユーザ向けのアプリとして「**イベント会場への移動をシームレスに検索できるマルチモーダルMaaSアプリ**」を考えました。今回は、移動手段として、電車とデマンド交通サービス、徒歩を組み合わせた移動を想定します。

<img src="/images/20210826a/image_3.png" alt="イベント会場への移動をシームレスに検索できるマルチモーダルMaaSアプリイメージ" width="1022" height="210" loading="lazy">

このような流れで移動するエンドユーザに対して、イベントの開始時刻に合わせたデマンド交通サービスを検索/予約を提供できるシステムを提供したいと思います。

## システムの構成

作成するデモアプリのイメージがついたので、実際のサービスに関わるシステムを図に起こしてみます。

<img src="/images/20210826a/image_4.png" alt="システム構成図" width="1200" height="462" loading="lazy">


実際のオンデマンドモビリティサービス運用を考えると、

1. 車両や乗客、ドライバーの情報を管理する機能
1. 実際の道路(地図情報)に従って移動経路や時間を計算する機能
1. 予約を管理する機能
1. ドライバー用の運行案内機能

などなど、エンドユーザが使うアプリケーションの他に多くの管理機能を実装する必要があります。しかし、MONETマーケットプレイスでは、**オンデマンドモビリティに普遍的に必要であろう機能をパッケージ化して利用できる**ようにしています。

これは **「サービサーはMaaSアプリ開発において付加価値を提供したい部分(エンドユーザ向けアプリ)の開発に注力できる」**ことを意味します。

<img src="/images/20210826a/image_5.png" alt="サービサーはMaaSアプリ開発において付加価値を提供したい部分(エンドユーザ向けアプリ)の開発に注力できる図" width="1200" height="454" loading="lazy">


エンドユーザ向けアプリに必要な機能のインターフェイスとしてAPIを提供しているため、こちらを利用してデモアプリを開発します。

## MONETマーケットプレイスを利用した各種開発

今回は、エンドユーザ向けアプリをWebアプリとして実装することにより、**PC/Android/iPhoneなどデバイスを問わずに利用できるアプリ**を目指します。

ここで利用するのは、Vueフレームワークのマテリアルデザインライブラリである[Vuetify](https://vuetifyjs.com/en/)です。

こちらのOSSを使うことにより、

- **ブラウザの機能を活用してPC/スマホ両方に対応したアプリケーションの開発**
- **実装済みのコンポーネントを活用することで実装時間の短縮**

を図ることができ、短期間でサクッと予約アプリを実装できます。



それでは以下で、実際にどのような場面でMONETマーケットプレイス上のAPIを利用出来るのか、いくつか例を紹介します。



### 各種APIを使った管理者Web登録用ポイントの決定

MONETマーケットプレイスが提供する[「デマンド交通サービス開発キット」](https://developer.monet-technologies.co.jp/products/2c92a0fd76f5b2b00176f99cea7463a3)では、運行するデマンド交通サービス用に「ポイント(利用者の乗降地点)」を管理者が設定する必要があります。登録自体はマスタ管理用の画面が用意されているので簡単な操作で追加登録可能です。

<img src="/images/20210826a/image_6.png" alt="デマンド交通サービス開発キット" width="1200" height="449" loading="lazy">


ただ、登録するポイントの緯度経度は管理者があらかじめ自身で用意する必要があります。


今回のデモアプリではエリア内の駅からイベント付近までの送迎を扱いたいため、駅やイベント会場の緯度経度を取得する必要がありますが、この時に便利なのが以下のAPIです。

1. [株式会社ゼンリンデータコム提供「いつもNAVI API」](https://developer.monet-technologies.co.jp/products/2c92a00e70cd67470170e25e80cb497d)
1. [ぴあ株式会社提供「イベント・公演情報検索 API」 ](https://developer.monet-technologies.co.jp/products/2c92a00e77dd376a0177eca2514329af)

「いつもNAVI API」では、**POI(Point of Interest)情報を取得することができ、あるエリア内の駅や施設の情報を取得することができます。**しかも、単なる駅の大雑把な緯度経度ではなく、出入り口付近の道路といった細かい緯度経度情報を取得することができ、デマンド交通サービスとの相性が最高です。

また、イベント会場に関しては、「イベント・公演情報検索 API」を用いることによって会場の地点情報を取得することができます。なお、こちらは建物自体の緯度経度情報になるので、降車ポイントとしては、付近の道路の緯度経度に補正する必要があります。

ここで嬉しい情報なのですが、「いつもNAVI API」には、"与えられた緯度経度から最寄りの道路上の緯度経度を返すAPI"が存在するため、ふたつを組み合わせることで"イベント会場付近の道路の緯度経度"を取得することができます。

さらに、パラメータを設定することによって、大きめの道路を選択する、といった細やかな調節も可能になります。

今回のデモアプリでは、せっかくなので、これらのAPIを活用した乗降地点の設定を行ってみました。

1. エリア内の駅の出入り口の緯度経度を取得・乗車用ポイントとして登録
1. エリア内のイベント会場の緯度経度を取得
1. イベント会場の緯度経度をk-means法でk個に分類
1. 各クラスタの重心の緯度経度を計算
1. 計算した緯度経度を道路上に補正・降車用ポイントとして登録

といった流れで、いい感じのエリア内の乗降車ポイント登録をすることが出来ます。

<img src="/images/20210826a/image_7.png" alt="乗降車ポイントの登録フロー" width="1026" height="394" loading="lazy">

実際のスクリプトとしては2段階に分けて、

- レスポンス形式の加工(XML→CSV)
- クラスタリング処理

を行いました。レスポンスの形式加工は少々煩雑になってしまいますが、以下のようなPythonスクリプトになります。

```python
# 「イベント・公演情報検索 API」で取得したイベント情報を利用しやすい形に加工
import xmltodict
import json
import csv
import datetime

# 一旦ぴあAPIのレスポンスを保存して、そちらを読み込む
with open("example/events.xml", "r") as f:
  data = f.read()

# CSV形式にコンバート
d = xmltodict.parse(data)
with open("example/events.csv", "w") as f:
  writer = csv.writer(f)
  writer.writerow(["id", "venueCode", "venueName", "venueLat", "venueLon"])

  event_releases = d["result"]["eventReleases"]["eventRelease"]
  idx = 1
  for event_release in event_releases:
    event = event_release["event"]
    performs = event_release["performs"]["perform"]
    if not isinstance(performs, list):
      performs = [performs]

    for perform in performs:
      venue = perform["venue"]
      venue_name = venue["venueName"]
      venue_code = venue["venueCode"]
      if ("worldLatitude" not in venue.keys()) or ("worldLongitude" not in venue.keys()):
        continue

      venue_lat = float(venue["worldLatitude"])
      venue_lon = float(venue["worldLongitude"])

      # 東京会場のみに絞る
      if venue["prefectureCode"] != "13":
        continue

      writer.writerow([idx, venue_code, venue_name, venue_lat, venue_lon])
      idx += 1
```

加工したレスポンスから、イベント会場をクラスタリングして重心座標を取得するPythonスクリプトは以下になります。

```python
# イベント会場を抽出
import pandas as pd
import numpy as np

# イベント会場を抽出
df = pd.read_csv("example/events.csv")
df_reduced = df.loc[:, ["venueCode", "venueName", "venueLat", "venueLon"]]
df_reduced = df_reduced.drop_duplicates()
df_reduced.to_csv("example/venues.csv", index=False)

# イベント会場をまとめたポイントを生成

df = pd.read_csv("example/venues.csv")

# イベント会場を7クラスタに分割
staNum = 7
kmeans_model = KMeans(n_clusters=staNum, random_state=10).fit(
    df.loc[:, ["venueLat", "venueLon"]])
labels = kmeans_model.labels_
print("---assigned label---")
print(labels)
print("---------")

df["nearestPointId"] = labels+1
df.to_csv("example/fixedVenues.csv", index=False)

with open("example/reducedVenues.csv", "w") as f:
  writer = csv.writer(f)
  writer.writerow(["id", "name", "meanLat", "meanLon"])
  for i in range(staNum):
    name = f"イベント会場{i+1}"
    mean_lat = df[df["nearestPointId"] == (i+1)].mean()["venueLat"]
    mean_lon = df[df["nearestPointId"] == (i+1)].mean()["venueLon"]
    writer.writerow([i + 1, name, mean_lat, mean_lon])

print("done!!!")
```

このような形で得られた```reducedVenues.csv```を参照して、```[meanLat,meanLon]```を引数として「いつもNAVI API」を利用すると、道路上に補正された緯度経度を得ることができます。

今回は単なる緯度経度情報のクラスタリングを行いましたが、「イベント・公演情報検索 API」で取得できるイベント情報にはイベント規模を示す情報も含まれているので、こちらで重み付けしたクラスタを計算することも可能です。


### イベント情報やチケット販売情報の表示

イベント参加を促進させるためには、イベントやチケットの情報を分かりやすく伝える必要があります。

「イベント・公演情報検索 API」を用いると、イベントの雰囲気を想起させるような画像や説明だけでなく、チケット購入用のURLまで取得できるため、実際のイベント参加に繋がる情報を取得可能です。

これらの情報をAPIで取得した後、画面にわかりやすく表示する必要がありますが、こちらはVuetifyのコンポーネントを活用することによって、短時間で実装することができます。

例えば、成形したデータをVuetifyのカレンダーに渡すことによって、1時間もかからずにイベントスケジュールを表示することができました。

<img src="/images/20210826a/image_8.png" alt="イベントスケジュール" width="1200" height="638" loading="lazy">

また、今回はイベントという情報に注目したデモアプリを作ってみましたが、MONETマーケットプレイスには、

- [るるぶDATA 観光API](https://developer.monet-technologies.co.jp/products/2c92a0ff74a2d6c00174b89bc12f42de)
- [るるぶDATA 温泉地API](https://developer.monet-technologies.co.jp/products/2c92a00774a2c96e0174b8a19e0779d5)

といった、観光情報を提供するAPIも存在しますし、

- [天気予報 API](https://developer.monet-technologies.co.jp/products/2c92a0fe74b89a350174b89f6c1a04b7)

を組み合わせることで当日の天気に応じた情報提供なども可能で、実現できることは多岐に渡ります。

### 地図上に各種情報を表示

MaaSサービスではさまざまな情報を地図上に表示する必要がありますが、
今回は[vue2leaflet](https://github.com/vue-leaflet/Vue2Leaflet)と呼ばれるライブラリを利用して、さっくり地図の表示を行ってみました。

この地図上には、イベント情報や乗降車地点ポイントをピンとして乗せたり、ピンに対して詳細を表示するポップアップを追加することができます。

また、ゼンリンAPIを使って取得した徒歩経路を地図上に乗せることができます。今回はGeoJSON形式に整形することにより、汎用性を持たせた形で地図上に乗せることができました。

<img src="/images/20210826a/image_9.png" alt="地図表示" width="698" height="435" loading="lazy">

さらに、デマンド交通サービス開発キットの予約検索APIや「いつもNAVI API」の徒歩ルート検索APIを組み合わせることで、経路検索結果をポップアップとして表示することができました。

なお、予約検索APIでは、

- 予約しようとした日時に対して運行している車が稼働しているか
- その時間の前後に既に予約している乗客が存在する場合、希望時間通りに車が到着できるか

などを見ながら予約可能かどうかを判断し結果を返すため、オーバーブッキングや物理的に不可能な予約は予め弾けるようにレスポンスを返します。

<img src="/images/20210826a/image_10.png" alt="イベント会場まで移動するまでの経路" width="1200" height="747" loading="lazy">

上記画像のように、エンドユーザが自身の最寄り駅からイベント会場まで移動するまでの経路をマルチモーダル的に表示することができました。

こちらの画面実装もAPIとVuetifyのコンポーネントの組み合わせなので、実装時間はAPIの使い方に慣れる時間を含めても、おおよそ数日です。

# まとめ

本記事のまとめは、

「MONETマーケットプレイス上のプロダクトとOSSを活用することによって、短時間でMaaSアプリを作成することができる」

この一言に尽きます。

もちろん、実際にサービス運用するためには細々した部分を洗練させる必要がありますが、むしろそういったこだわりに時間をかけられるようになるのではないかと感じています。

本記事を通して、MONETマーケットプレイス上の各プロダクトを用いて独自のMaaSアプリを開発するイメージに繋がれば幸いです。
