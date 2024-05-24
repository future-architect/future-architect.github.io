---
title: "FlutterでGoogleマップを表示してみる"
date: 2021/12/24 00:00:00
postid: a
tag:
  - Flutter
  - Dart
  - GoogleMapsAPI
category:
  - Infrastructure
thumbnail: /images/20211224a/thumbnail.png
author: 伊藤真彦
lede: "Flutterの実践的なアプリケーションの作り込みも試してみました。FlutterではGoogleマップを表示するためのウィジェットが存在するため、どのくらい簡単に実現できるか検証してみました。"
---
TIGの伊藤真彦です

先日[入門記事](/articles/20211221a/)を書いたFlutterですが、実践的なアプリケーションの作り込みも試してみました。

# FlutterでGoogleマップを表示したい

FlutterではGoogleマップを表示するためのウィジェットが存在するため、どのくらい簡単に実現できるか検証してみました。

# 実装の準備

[Google Maps Platform](https://developers.google.com/maps/documentation?hl=ja)を活用することで、任意のアプリケーションからGoogleマップの機能を利用することができます。
アプリケーションの実装の前に、GCPアカウントを用意し、`Maps JavaScript API`など必要な機能を有効化し、APIを実行するためのキーを払い出す必要があります。

# google_maps_flutter

Flutterでは[google_maps_flutter](https://pub.dev/packages/google_maps_flutter)というパッケージが存在します。Flutterチームのオフィシャルプラグインで安心感が高いです。このプラグインの機能を試してみます。

今回もFlutter on the Webで検証します。

## パッケージの導入

環境構築、Hello Worldアプリケーションの用意は[環境構築の記事](https://future-architect.github.io/articles/20211221a/)を参照してください。
アプリケーションの用意ができたらパッケージをインストールします。

```
flutter pub add google_maps_flutter
```

Flutter on the Webでは[google_maps_flutter_web](https://pub.dev/packages/google_maps_flutter_web)も導入します。

```
flutter pub add google_maps_flutter_web
```

導入するとGoogleMapウィジェットが使えるようになります。

```dart main.dart
import 'package:google_maps_flutter/google_maps_flutter.dart';

Widget build(BuildContext context) {
    return GoogleMap(
      mapType: MapType.normal,
      initialCameraPosition: _kGooglePlex,
      markers: _markers,
      polylines: _lines,
      onMapCreated: (GoogleMapController controller) {
        _controller.complete(controller);
      },
    );
}
```

Flutter on the Webでは`index.html`のヘッダー部分にGoogle MapsのJavascriptを追加するとウィジェットが正常に動作します。

```html index.html
<head>
  <script src="https://maps.googleapis.com/maps/api/js?key=MyApiKey"></script>
</head>
```

## ウィジェットを組み込む

[公式example](https://pub.dev/packages/google_maps_flutter/example)は中々壮大な例となっており、最小限の機能を抜粋するのが逆に難しいくらいです.
[GitHubのREADME](https://github.com/flutter/plugins/tree/master/packages/google_maps_flutter/google_maps_flutter)には比較的ミニマムな実装が用意されています。

```dart main.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Google Maps Demo',
      home: MapSample(),
    );
  }
}

class MapSample extends StatefulWidget {
  @override
  State<MapSample> createState() => MapSampleState();
}

class MapSampleState extends State<MapSample> {
  Completer<GoogleMapController> _controller = Completer();

  static final CameraPosition _kGooglePlex = CameraPosition(
    target: LatLng(37.42796133580664, -122.085749655962),
    zoom: 14.4746,
  );

  static final CameraPosition _kLake = CameraPosition(
      bearing: 192.8334901395799,
      target: LatLng(37.43296265331129, -122.08832357078792),
      tilt: 59.440717697143555,
      zoom: 19.151926040649414);

  @override
  Widget build(BuildContext context) {
    return new Scaffold(
      body: GoogleMap(
        mapType: MapType.hybrid,
        initialCameraPosition: _kGooglePlex,
        onMapCreated: (GoogleMapController controller) {
          _controller.complete(controller);
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _goToTheLake,
        label: Text('To the lake!'),
        icon: Icon(Icons.directions_boat),
      ),
    );
  }

  Future<void> _goToTheLake() async {
    final GoogleMapController controller = await _controller.future;
    controller.animateCamera(CameraUpdate.newCameraPosition(_kLake));
  }
}
```

`main.dart`を上記コードに置き換えてアプリケーションを起動すると画像のような状態になります。

<img src="/images/20211224a/image.png" alt="Google Mapサンプルアプリ" width="628" height="719" loading="lazy">

実際のアプリケーションではGoogleMapウィジェットを全画面に表示するだけのものを作ることにはならないと思います。
サンプルの様々な部分を参考に何らかの機能を追加したり、他のウィジェットと組み合わせたりと拡張していきましょう。

例えば他の情報を表示する余白を作るためにContainerウィジェットでGoogleMapウィジェットをラッピングするようなことができます。
<img src="/images/20211224a/image_2.png" alt="ウィジェットを用いてラッピングしたマップ" width="1200" height="1278" loading="lazy">

README記載のサンプルで表示される地図の場所はGoogle本社オフィスのようです、近くにゴルフ場やコンピュータ歴史博物館があるんですね、楽しそうです。

# 地図のプロパティを変更する

GoogleMapウィジェットのプロパティを設定する事で地図の描画スタイルや機能の有無など様々な変更ができます。
[ドキュメント](https://pub.dev/documentation/google_maps_flutter/latest/google_maps_flutter/GoogleMap-class.html)を参考に変更してみましょう。

例えば`mapType`プロパティをnormalに変更することで、地図の描画が航空写真から地図らしい描画に切り替わります。

```dart dart main.dart
GoogleMap(
  mapType: MapType.normal,
  // 以下省略
)
```

<img src="/images/20211224a/image_3.png" alt="地図画像" width="1200" height="909" loading="lazy">

# 地図にマーカーを表示する

独自のアプリケーションを作り込むからには、任意の地点を地図に表示したい要望が出てくるでしょう。GoogleMapウィジェットの[markersプロパティ](https://pub.dev/documentation/google_maps_flutter/latest/google_maps_flutter/GoogleMap/markers.html)に`Set<Marker>`の適切なデータを追加することでマーカーが表示されます。

[Markerクラス](https://pub.dev/documentation/google_maps_flutter_platform_interface/latest/google_maps_flutter_platform_interface/Marker-class.html)は位置情報、アイコンなどのプロパティの他、オンクリックイベントのコールバック関数などを設定することができます。マーカーの位置情報である[LatLngクラス](https://pub.dev/documentation/google_maps_flutter_platform_interface/latest/google_maps_flutter_platform_interface/LatLng-class.html)は緯度経度の情報です。

infoWindowでマーカーの名称や情報を追加できます。

```dart main.dart
Set<Marker> _markers = {
  Marker(
    markerId: MarkerId("marker1"),
    position: LatLng(37.4224411,-122.0884808),
    infoWindow: InfoWindow(title: "フューチャー株式会社"),
  )
};

GoogleMap(
  markers: _markers,
  // 以下省略
)
```

<img src="/images/20211224a/image_4.png" alt="地図上にマーカー" width="1200" height="616" loading="lazy">

# 地図に線を引く

GoogleMapウィジェットは[polylinesプロパティ](https://pub.dev/documentation/google_maps_flutter/latest/google_maps_flutter/GoogleMap/polylines.html)で２点間のルート情報を表示することもできます。

```dart main.dart
Set<Marker> _markers = {
  Marker(
    markerId: MarkerId("marker1"),
    position: LatLng(37.42246006639176, -122.08409675340478),
    infoWindow: InfoWindow(title: "Google本社"),
  ),
  Marker(
    markerId: MarkerId("marker2"),
    position: LatLng(37.42747752203552, -122.08057852883495),
    infoWindow: InfoWindow(title: "ショアライン・アンフィシアター"),
  ),
};
Set<Polyline> _lines = {
  Polyline(
    polylineId: PolylineId("line1"),
    points: [
      LatLng(37.42246006639176, -122.08409675340478),
      LatLng(37.42747752203552, -122.08057852883495),
    ],
    color: Colors.blue,
  ),
};

GoogleMap(
  markers: _markers,
  polylines: _lines,
  // 以下省略
)
```

`Set<Polyline>`のデータを用意することで青い線を引くことができました。

<img src="/images/20211224a/image_5.png" alt="2点間で線を引く" width="1200" height="770" loading="lazy">

しかしこれではスタートとゴールの間に山があろうと谷があろうと乗り越え直進するという無茶なルートしか表示できません。

## Directions APIを活用する

これまで紹介したGoogle MapのAPIは地図の描画に専念して用意されたAPIです。経路探索や距離の計算は別のAPIとして公開されています。

[Directions API](https://developers.google.com/maps/documentation/directions/overview?hl=ja)を利用することで、任意の２点間の現実的で最適な経路を取得することができます。  `Directions API`も`Javascript API`のようにGCPの管理画面で機能を有効化する必要があります。

`Directions API`を実行するDartパッケージとして[flutter_polyline_points](https://pub.dev/packages/flutter_polyline_points)が存在しますが、執筆時点ではレスポンスのパース処理に不具合があったため、愚直に`Directions API`を実行し、レスポンスのパースは[google_polyline_algorithm](https://pub.dev/packages/google_polyline_algorithm)で行いました。

```dart main.dart
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';
Future<List<LatLng>> getPolylineResult(
  LatLng origin,
  LatLng destination,
  List<LatLng> wayPoints) async {
  var params = {
    "origin": "${origin.latitude},${origin.longitude}",
    "destination": "${destination.latitude},${destination.longitude}",
    "mode": "driving",
    "avoidHighways": "false",
    "avoidFerries": "true",
    "avoidTolls": "false",
    "key": "MyApiKey",
  };
  if (wayPoints.isNotEmpty) {
    List wayPointsArray = [];
    wayPoints.forEach((point) {
      String encoded = encodePolyline([[point.latitude.toDouble(), point.longitude.toDouble()]]);
      wayPointsArray.add("enc:${encoded}:");
    });
    String wayPointsString = wayPointsArray.join('|');
    params.addAll({"waypoints": wayPointsString});
  }
  Uri uri = Uri.https("maps.googleapis.com", "maps/api/directions/json", params);
  var response = await http.get(uri);
  List<LatLng> polylineCoordinates = [];
  if (response.statusCode != 200) {
    return [];
  }
  var parsedJson = json.decode(response.body);
  if (parsedJson["status"]?.toLowerCase() != "ok" || parsedJson["routes"] == null || parsedJson["routes"].isEmpty) {
    return [];
  }
  List<List<num>> points = decodePolyline(parsedJson["routes"][0]["overview_polyline"]["points"]);
  points.forEach((point) {
    polylineCoordinates.add(LatLng(point[0].toDouble(), point[1].toDouble()));
  });
  return polylineCoordinates;
}
```

パッケージを導入すると使えるようになる`decodePolyline()`はレスポンスにあるエンコードされた経路情報をデコードして緯度経度の配列にする関数です。

曲がり角の情報だけでなく、線を道に沿って表示するにはどこを繋ぐとよいのか、という詳細な緯度経度情報の配列が取得できます。[エンコードされた緯度軽度の圧縮アルゴリズム](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)はドキュメントとして公開されているため、仕様に則ってデコードするだけですが、中々難しいことをしています。

`Drection API`の実行結果を地図に反映させると画像のようになります。完璧なルートが出力されました、当たり前のように使ってるGoogleマップって改めて考えると凄いなと感じますね。

<img src="/images/20211224a/image_6.png" alt="image.png" width="1200" height="1337" loading="lazy">

なおFlutter on the Webとして動かす場合、`maps.googleapis.com`へのGETリクエストはCORS設定の都合で失敗してしまいます。ウェブサイトとして完成させるには同一ドメインで`maps.googleapis.com`へのリクエストを代行してくれるプロキシ的なバックエンドを作る必要があります。単にローカルでは一旦ブラウザで動かしたい、という場合は`chromium`をインストールして、オプション付きで起動すると動作します。

下記のようなシェルスクリプトを用意します。

```sh google-chrome-unsafe.sh
#!/bin/sh
/usr/local/bin/chromium --disable-web-security --user-data-dir="A-TEMP-LOCATION" $*
```

環境変数`CHROME_EXECUTABLE`でFlutterが起動するブラウザの起動設定をカスタマイズできます。

```sh
CHROME_EXECUTABLE=`pwd`/google-chrome-unsafe.sh flutter run
```

Flutter on the Webは、対象プラットフォームがモバイルアプリだけだった頃に作られたライブラリがCORS対策の問題などで上手く動かない、という可能性があるかもしれません。

# アプリケーションとして整備する

最低限やれることはわかってきました。ウィジェットとしてリファクタリングする、データの取得と画面描画をリファクタリングする、オンクリックイベントの実装などアプリケーションとして作り込んでいきます。サンプルアプリケーションを見るとGoogleMapウィジェットはExpandウィジェットなどと組み合わせて利用されています。今回はColumnウィジェットの一要素としてGoogleMapウィジェットを読み込んでみるスタイルにしてみます。Columnウィジェットに積み込む他のウィジェットは適当にflutterロゴを出してみます。

<img src="/images/20211224a/image_7.png" alt="image.png" width="1200" height="730" loading="lazy">

オンクリックイベントの実験と、infoWindowより自由度の高いUIを実現したい、という観点で、マーカーをタップするとサイドバーが表示されるような作り込みもしてみました。

<img src="/images/20211224a/image_8.png" alt="image.png" width="1200" height="728" loading="lazy">

サンプルを試していた時にはマーカーやルートの位置情報をソースコードに愚直に書きましたが、実際にアプリケーションとして作り込むにあたっては、ウィジェットのレイアウトとビジネスロジックはなるべく切り分けたいですね。

表示したい情報の取得は一般的にサーバーサイドへアクセスする処理を非同期な関数で実装する事になることを想定しています。律儀にデータの取得完了を待ってから[FutureBuilderウィジェット](https://api.flutter.dev/flutter/widgets/FutureBuilder-class.html)を利用して描画する手法も試してみましたが、地図に描画するデータの更新ではマーカーやルートを取得して差し替えた際に地図そのものの再描画は発生せず綺麗に動くため、素直に`setState`を利用した方が快適に動きました。

上記の作り込みをまとめると下記のようになります。

今回は大掛かりなファイル分割は行わず、`main.dart`と`service.dart`の2ファイルに分けて、GoogleMap用のトークンを書き換えたら動くような形にしました。

```dart main.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import './service.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Google Maps Demo',
      home: MapSample(),
    );
  }
}

class MapSample extends StatefulWidget {
  @override
  State<MapSample> createState() => MapSampleState();
}

class MapSampleState extends State<MapSample> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  Completer<GoogleMapController> _controller = Completer();
  static final CameraPosition _kGooglePlex = CameraPosition(
    target: LatLng(37.42796133580684, -122.085749655962),
    zoom: 14.4746,
  );
  Set<Polyline> _lines = {};
  Set<Marker> _markers = {};
  String _drawer_name = "";
  String _drawer_info = "";
  String _drawer_lat = "";
  String _drawer_lng = "";

  @override
  void initState() {
    super.initState();
    createPolylines();
    createMarkers();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        FlutterLogo(),
        MapContainer(),
        FlutterLogo(),
      ],
    );
  }

  MapContainer() {
    return Expanded(
      child: Container(
        width: 1000,
        height: 900,
        child: Scaffold(
          key: _scaffoldKey,
          resizeToAvoidBottomInset: false,
          drawer: MapDrawer(),
          body: GoogleMap(
            mapType: MapType.normal,
            initialCameraPosition: _kGooglePlex,
            markers: _markers,
            polylines: _lines,
            onMapCreated: (GoogleMapController controller) {
              _controller.complete(controller);
            },
          ),
        ),
      )
    );
  }

  MapDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          ListTile(
            title: Text("name: ${_drawer_name}"),
          ),
          ListTile(
            title: Text("info: ${_drawer_info}"),
          ),
          ListTile(
            title: Text("latitude: ${_drawer_lat}"),
          ),
          ListTile(
            title: Text("longitude: ${_drawer_lng}"),
          ),
        ],
      ),
    );
  }

  marker_tapped(Place place){
    setState(() {
      _drawer_name = place.name;
      _drawer_info = place.info;
      _drawer_lat= place.latlng.latitude.toString();
      _drawer_lng= place.latlng.longitude.toString();
    });
    _scaffoldKey.currentState?.openDrawer();
  }

  void createMarkers() async {
    Set<Marker> markers = await getMarkers(marker_tapped);
    setState(() {
      _markers = markers;
    });
  }

  void createPolylines() async {
    Set<Polyline> lines = await getLines();
    setState(() {
      _lines = lines;
    });
  }
}
```

```dart service.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';

const String apiKey = "MyApiKey";

Future<Set<Marker>> getMarkers(void Function(Place) callback) async {
  Set<Place> places = await getPlaces();
  Set<Marker> markers = {};
  places.toList().asMap().forEach((k, v) {
    markers.add(Marker(
      markerId: MarkerId(k.toString()),
      position: v.latlng,
      onTap: () => callback(v),
    ));
  });
  return markers;
}

// DBから取得する想定
Future<Set<Place>> getPlaces() async {
  LatLng latLng1 = LatLng(37.42747752203552, -122.08057852883495);
  LatLng latLng2 = LatLng(37.42246006639176, -122.08409675340478);
  LatLng latLng3 = LatLng(37.41746006639176, -122.08409675340478);
  LatLng latLng4 = LatLng(37.42546006639176, -122.09809675340478);
  Set<Place> places = {};
  [latLng1, latLng2, latLng3, latLng4].asMap().forEach((int i, LatLng v) {
    places.add(
      Place(
        name: "place${i}",
        info: "it is place ${i}",
        latlng: v,
      )
    );
  });
  return places;
}

Future<Set<Polyline>> getLines() async {
  Set<MapRoute> routes = await getRoutes();
  Set<Polyline> lines = {};
  for(int i = 0; i < routes.length; i++) {
    var route = routes.elementAt(i);
    List<LatLng> polylineCoordinates = [];
    polylineCoordinates.add(route.origin);
    List<LatLng> result = await getPolylineResult(
      route.origin,
      route.destination,
      route.wayPoints
    );
    polylineCoordinates.addAll(result);
    polylineCoordinates.add(route.destination);
    lines.add(
      Polyline(
        polylineId: PolylineId(i.toString()),
        jointType: JointType.round,
        points: polylineCoordinates,
        color: Colors.blue,
      )
    );
  };
  return lines;
}

// DBから取得する想定
Future<Set<MapRoute>> getRoutes() async {
  LatLng latLng1 = LatLng(37.42747752203552, -122.08057852883495);
  LatLng latLng2 = LatLng(37.42246006639176, -122.08409675340478);
  LatLng latLng3 = LatLng(37.41746006639176, -122.08409675340478);
  LatLng latLng4 = LatLng(37.42546006639176, -122.09809675340478);
  return {
    MapRoute(
      origin: latLng1,
      destination: latLng2,
    ),
    MapRoute(
      origin: latLng1,
      destination: latLng2,
      wayPoints: [
        latLng3,
        latLng4,
      ],
    ),
  };
}

Future<List<LatLng>> getPolylineResult(
  LatLng origin,
  LatLng destination,
  List<LatLng> wayPoints) async {
  var params = {
    "origin": "${origin.latitude},${origin.longitude}",
    "destination": "${destination.latitude},${destination.longitude}",
    "mode": "driving",
    "avoidHighways": "false",
    "avoidFerries": "true",
    "avoidTolls": "false",
    "key": apiKey
  };
  if (wayPoints.isNotEmpty) {
    List wayPointsArray = [];
    wayPoints.forEach((point) {
      String encoded = encodePolyline([[point.latitude.toDouble(), point.longitude.toDouble()]]);
      wayPointsArray.add("enc:${encoded}:");
    });
    String wayPointsString = wayPointsArray.join('|');
    params.addAll({"waypoints": wayPointsString});
  }
  Uri uri = Uri.https("maps.googleapis.com", "maps/api/directions/json", params);
  var response = await http.get(uri);
  List<LatLng> polylineCoordinates = [];
  if (response.statusCode != 200) {
    return [];
  }
  var parsedJson = json.decode(response.body);
  if (parsedJson["status"]?.toLowerCase() != "ok" || parsedJson["routes"] == null || parsedJson["routes"].isEmpty) {
    return [];
  }
  List<List<num>> points = decodePolyline(parsedJson["routes"][0]["overview_polyline"]["points"]);
  points.forEach((point) {
    polylineCoordinates.add(LatLng(point[0].toDouble(), point[1].toDouble()));
  });
  return polylineCoordinates;
}

class Place {
  LatLng latlng;
  String name;
  String info;
  Place({this.name = "", this.info = "", this.latlng = const LatLng(0, 0)});
}

class MapRoute {
  LatLng origin;
  LatLng destination;
  List<LatLng> wayPoints;
  MapRoute({this.origin = const LatLng(0, 0), this.destination = const LatLng(0,0), this.wayPoints = const []});
}
```

# まとめ

* Flutterにはチーム公式のGoogleMapライブラリが存在する
* ルートの計算を行うにはDirections APIを活用する
* Flutter on the WebはCORS対策の必要性がある
* ウィジェットの組み合わせなどは公式サンプルが参考になる

特にウィジェットの組み合わせに頭を悩ませる時間が最初のうちはあると思います、OSSパッケージやサンプルコードなど様々な事例を参考にすると良いと思います。

