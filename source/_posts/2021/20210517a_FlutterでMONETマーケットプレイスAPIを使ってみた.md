---
title: "FlutterでMONETマーケットプレイスAPIを使ってみた"
date: 2021/05/17 00:00:00
postid: a
tag:
  - MONETマーケットプレイス
  - MaaS
  - Flutter
  - モバイルアプリ
category:
  - Programming
thumbnail: /images/20210517a/thumbnail.png
author: 越島亮介
lede: "MONETマーケットプレイスで購入したAPIとFlutterを使って簡単なスマホアプリを作ってみます。"
---
# はじめに
こんにちは、TIGの越島と申します。

[Dart/Flutter連載](/articles/20210510a/)の6記事目　兼　[MONETマーケットプレイスAPIを使ってみた連載](/tags/MONET%E3%83%9E%E3%83%BC%E3%82%B1%E3%83%83%E3%83%88%E3%83%97%E3%83%AC%E3%82%A4%E3%82%B9/)の2記事目として、**MONETマーケットプレイスで購入したAPI**と**Flutter**を使って簡単なスマホアプリを作ってみます。

MONETマーケットプレイスAPIを使ってみた連載の第1弾では[MONETマーケットプレイスAPIを使ってみた#1 ～概要説明と購入編～](/articles/20210404/)のとして、プラットフォームの概要やAPIを購入するまでの手順について書かれています。

# MONETマーケットプレイスとは

<img src="/images/20210517a/top_page_20210316.png" alt="MONETマーケットプレイストップページ" width="1200" height="554" loading="lazy">

MONETマーケットプレイスAPIを使ってみた連載の[第1弾](/articles/20210404/)でも触れていますが、ここでもう一度MONETマーケットプレイスのおさらいをします。

[MONETマーケットプレイス](https://developer.monet-technologies.co.jp/)は、MaaSビジネスの実現に必要なソリューションをAPIとして提供しているサービスです。オンデマンドバスの配車システムをはじめ、多様な業界・業種の企業から提供されるデータやシステムのAPIを購入して、新たなサービスの開発に活用することができます。

# APIの利用

MONETマーケットプレイスでは、APIを利用するために、APIキー（**X-MONET-APIKey**）を用いて認証を行う必要があります。MONETマーケットプレイスでは一つのキーを使って、提供されているAPIを横断的に利用できます。この特徴を生かして複数サービスを組み合わせた独自サービスの提供が容易に実現できるようになっています。

**X-MONET-APIKey**を用いたAPIの認証ができていれば、あとは各商品ページのエンドポイントの情報を元にAPIを利用していくだけです。
（APIの利用・認証の詳しい手順については、MONETマーケットプレイスの[ディベロッパーガイド](https://developer.monet-technologies.co.jp/docs?tab=service-2)を参照ください。）
<img src="/images/20210517a/api_endpoint.png" alt="API定義画面" width="532" height="552" loading="lazy">

# APIを使ってアプリを作成

今回はデモアプリとして、現在地周辺の観光地情報を検索して、そこまでのルート表示ができる**観光地図アプリ**を**Flutter**で作成しました。MONETマーケットプレイスで提供されているAPIは「**るるぶDATA 観光API**」と「**いつもNAVI API**」を利用し、地図データは「**OpenStreetMap**」を利用しています。

## アプリデモ

<img src="/images/20210517a/app_gif.gif" alt="アプリデモ" width="329" height="593" loading="lazy">

## アプリ詳細

<img src="/images/20210517a/app_flow.png" alt="アプリ画面遷移図" width="1122" height="490" loading="lazy">


今回作成したアプリの利用の流れと、各画面で用いているAPI・サービスは上記のようになっています。
APIは以下のように利用しています。

- **るるぶDATA 観光API**
    - 周辺の観光施設情報の取得に利用
    - スマホから取得できる緯度/経度に加えて、半径とジャンルを指定して絞り込み検索
- **いつもNAVI API**
    - 設定した目的地までのルート情報の取得に利用
    - 観光施設の緯度経度と現在地の緯度経度をインプットに、徒歩と車でのルートを取得して、地図に描画


APIリクエストは、Flutter公式の[Cookbook](https://flutter.dev/docs/cookbook/networking/fetch-data)を参考にして、以下のような形で実装しています。
（下記は**るるぶDATA 観光API**の場合の例）

```dart
Future loadSights(SearchPageArgument args) async {
  var baseURL = 'https://gw-api.monet-technologies.co.jp/jtbp/appif/sight?responsetype=json';
  var query = '';

  if (args.latitude != null) {
    query = query + '&latitude=' + args.latitude;
  }
  if (args.longitude != null) {
    query += '&longitude=' + args.longitude;
  }
  if (args.radius != null) {
    query += '&radius=' + args.radius;
  }
  if (args.lgenre != null) {
    query += '&lgenre=' + args.lgenre;
  }

  final response = await http.get(
      baseURL + query,
      headers: {
        "Content-Type": "application/json",
        "X-MONET-APIKey": "XXXXXXXXXXXXXXX", //APIキーが入る
      });

  if (response.statusCode == 200) {
    final jsonResponse = json.decode(response.body);
    return jsonResponse;
  } else {
    throw Exception('Failed to load sights');
  }
}
```


# まとめと感想

[Dart/Flutter連載](/articles/20210510a/)の6記事目　兼　[MONETマーケットプレイスAPIを使ってみた連載](/tags/MONET%E3%83%9E%E3%83%BC%E3%82%B1%E3%83%83%E3%83%88%E3%83%97%E3%83%AC%E3%82%A4%E3%82%B9/)の2記事目として、
MONETマーケットプレイスで購入したAPIを使って簡単なスマホアプリを作ってみました。

MONETマーケットプレイスのAPIを利用してみた感想としては、適切にAPIを組み合わせることができれば、比較的スピード感を持ってそれなりのユースケースに対応したアプリを作ることができそうだなという実感です。また、複数のAPIの契約・認証が統一できるので、複数のAPIを組み合わせたアプリ開発のハードルが管理的な面でも、心理的な面でも下がるのがメリットかなと思いました。

Flutterを触ってみた感想としては、Flutterは**何も無い状態からプロトタイプを作るまでのモチベーションが保ちやすいフレームワーク**だと感じました。このモチベーションの保ちやすさは、①マテリアルデザインとの親和性の高さと、②Hot Reload/Restartの速さ、が大きな要因なんじゃないかと思っています。Flutterではマテリアルデザインの原則に沿ったWidgetが多く用意されていて、マテリアルデザインベースでアプリを組むと効率良く、「ちゃんとスマホアプリっぽい」画面が作れます。個人的には、アプリの見た目が早い段階で整うと、その後のモチベーションが保ちやすいです。それに加えて、再ビルドをせずにソースコードへの変更を反映できるHot Reload機能が備わっているので、実装と確認のサイクルを速く回せます。ビルドを待っている間にスマホを触り始めて集中力が切れちゃうことが少ないので、結果的にモチベーションが保てた気がします。

明日は村田さんの[Flutter ウィジェットテスト入門](/articles/20210519a/)です。
