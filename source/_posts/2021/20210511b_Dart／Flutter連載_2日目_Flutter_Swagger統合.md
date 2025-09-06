---
title: "Flutter Swagger統合"
date: 2021/05/11 00:00:01
postid: b
tag:
  - Flutter
  - Dart
  - OpenAPI
  - OpenAPIGenerator
  - Swagger
category:
  - Mobile
thumbnail: /images/2021/20210511b/thumbnail.png
author: 宮崎将太
lede: "Dart/Flutter連載の2記事目です。はじめまして、TIGの宮崎将太です。突然ですがみなさん、Swagger使いたいですよね。"
---
# はじめに

[Dart/Flutter連載](/articles/20210510a/)の2記事目です。

はじめまして、TIGの宮崎将太です。

突然ですがみなさん、Swagger使いたいですよね。当社でもGo言語などでSwaggerを用いてREST APIサーバ/クライアントコードを生成する機会が増えています。

たまたま Flutter+Rails でアプリケーション構築をする機会があったので、今回Flutterのみに着目してSwagger(OpenAPISpec)を使用する方法をコード付きで解説していきます。(Railsは需要があったら書こうと思いますので、SNSでリアクションもらえるとです！ )

# Swaggerとは？

Swagger(OpenAPISpec)とはREST API仕様をyamlやjsonベースで定義できるフォーマットを定めたツールで、定義書を書くとAPI仕様書やサーバ、クライアントコードを生成できちゃう優れものです。

2系、3系いろいろありますが、今回はエコシステムが充実している2系を使用していきます。

Swaggerの詳しい説明は、敬愛する武田さんが以前記載してくださっているので、そちらをチェックしてください。m(__)m

https://future-architect.github.io/articles/20191008/

# 0からクライアントコード実装までやってみる

百聞は一見に如かず。

0の状態からクライアントコード実装までやってみます。

なお、flutter/dartはインストール済みの前提として進めます。まだの方は[公式](https://flutter.dev/docs/get-started/install)にインストール方法がありますので、準備してからやってみてください。

各バージョン情報は以下の通りです。

* 開発機OS: Mac Catalina
* Flutter: 2.0.4
* Dart: 2.12.2
* Swagger: 2.0

## openapi-generatorインストール

後ほどSwaggerからコードを生成するので、まずは生成ツールである`openapi-generator`をインストールします。

生成ツールはjar、dockerなどいろいろな形式で提供されていますが、今回は楽にHomebrew経由でインストールします。

```bash
brew install openapi-generator
```

その他の形式については下記参考に導入してください。
https://openapi-generator.tech/docs/installation/

## Flutterプロジェクト作成

ツール導入が完了したので、プロジェクトを作成。
`flutter_swagger`という名称でプロジェクトを作成します。

``` bash
flutter create flutter_swagger
```

以下のようなプロジェクトが生成されるはずです。

あくまでAPIリクエスト実行までを実装するので、今回いじるのは`pubspec.yaml`と`lib/main.dart`のみです。

※Flutter基本的なディレクトリ構造に関しての説明は今回は割愛します。

<img src="/images/2021/20210511b/image.png" alt="ディレクトリ構成" width="580" height="758" loading="lazy">

## swagger.yaml配置

プロジェクト作成が完了したので、プロジェクトルートに`swagger.yaml`を作成します。
swaggerはヘルスチェックに対して200OKを返すのみの簡単なもの。

```yaml
swagger: "2.0"
info:
  title: "api"
  version: "0.0.1-SNAPSHOT"
# host: "localhost:8080"
basePath: /api/v1
schemes:
  - http
consumes:
  - "application/json"
produces:
  - "application/json"
tags:
  - name: System
    description: "システム共通機能"
paths:
  /health:
    get:
      tags:
        - System
      responses:
        200:
          description: OK
          schema:
            $ref: "#/definitions/health"
definitions:
  health:
    type: string
    enum: [OK]

```

## APIクライアントコード生成

`swagger.yaml`の配置が終わったので`openapi-generator`でAPIクライアントコードを生成します。

dartのクライアントコードはパッケージ形式で生成されるので、`lib`配下には生成せず別ディレクトリに生成（`client`配下）し、後ほどimportします。

terminalにて以下を実行してください。

``` bash
openapi-generator generate -i ./swagger.yaml -g dart -o ./client
```

各オプションは以下の通りです。

* `i`: swagger.yamlへのパス
* `g`: 生成コードの形式(≒言語)を指定します。様々な形式での生成ができるので以下参考にしてください（dartも別形式である`dart-dio`を指定可能）。
  https://openapi-generator.tech/docs/generators/
* `o`: 生成コードの出力先パス

クライアントコードの生成が完了すると、以下のように`client`配下に別パッケージが確認できます。

※コンパイルエラーが発生している場合は`client`配下で`flutter pub get`を実行して依存ライブラリを解決してください。

<img src="/images/2021/20210511b/image_2.png" alt="openapi-generatorでの生成先ディレクトリ" width="554" height="1102"  loading="lazy">

主たる生成コードの役割は以下の通りです。

* `lib/api/xxx_api.dart`: swaggerの`tag`ごとに生成されます。APIレスポンスのモデルバインド等を実行するAPIクライアントラッパーが定義されます。
* `lib/auth/xxx.dart`: 認証系の生成コードです。APIキー認証、basic認証、Bearer認証、OAuth認証が可能。今回は使用しません。
* `lib/model/xxx.dart`: swaggerの`definition`ディレクティブで定義するAPIリクエスト/レスポンスがモデルクラスとして生成されます。
* `lib/api_client.dart`: APIクライアントが定義されます。

## openapiパッケージの導入

生成されたコードは`openapi`という名称のパッケージになっているので、プロジェクトルートの`pubspec.yaml`にて依存定義を記載します。

以下、最後2行を`pubspec.yaml`に記載後、プロジェクトルートにて`flutter pub get`を実行してください。

``` yaml
dependencies:
  flutter:
    sdk: flutter


  # The following adds the Cupertino Icons font to your application.
  # Use with the CupertinoIcons class for iOS style icons.
  cupertino_icons: ^1.0.2

  # 以下2行追記
  openapi:
    path: ./client/
```

## APIリクエスト実行

ここまででようやくAPIリクエストを実行する準備が整いました。

あとは通常通り`openapi`パッケージをimportし、`main.dart`など任意の箇所にコーディングするだけです。

以下、参考コードになります。

```dart
    import 'package:openapi/api.dart';
    import 'package:http/http.dart';

    // ① ベースとなるAPIクライアント生成
    var client = ApiClient(basePath: "http://localhost:8080");
    // ヘッダを追加したい場合はクライアントに設定可能
    client.addDefaultHeader("key", "value");

    // ② APIクライアントラッパーを生成
    // APIレスポンスをモデルに変換してくれる
    var api = SystemApi(client);

    // ③ レスポンスボディのみが欲しい場合は${パス名+HTTPメッソド名}のメソッドをcall
    Health health = await api.healthGet();
    print(health.value); // => OK

    // ④ HTTPステータスや、その他ヘッダ情報が欲しい場合は${パス名+HTTPメッソド名}WithHttpInfoのメソッドをcall
    Response res = await api.healthGetWithHttpInfo();
    print(res.statusCode); // => 200
    print(res.headers); // => HTTPヘッダーMap
    print(res.body); // => OK
```

1. ベースとなるAPIクライアント生成
  `ApiClient`をインスタンス化しています。アクセスの設定や共通ヘッダを実装したい場合は此処に実装することになります。
`ApiClient`の定義は`client/lib/api_client.dart`に生成されます。
1. APIクライアントラッパーを生成
  swaggerの`tag`ごとに生成されるクラスです。APIレスポンスのモデルへバインド等を実行します。swaggerの`path`1つにつき後述の3と4の2メソッドが生成されます。クラス定義は`client/lib/api/xxx_api.dart`に生成されます。
1. リクエスト発行（レスポンスボディのみが欲しい場合）
  単純にレスポンスボディのみが欲しい場合は`${パス名+HTTPメッソド名}`のメソッドをcallします（この場合は`healthGet`）。HTTPステータスが400以上の場合やレスポンスボディがnullの場合は例外(`ApiException`)をthrowしてくれます。
1. リクエスト発行（ヘッダも含めて欲しい場合）
  （3）のメソッドではHTTPヘッダ情報が取得できなかったり、HTTPステータスが400以上の場合には例外をthrowしてしまうので、この挙動が嫌な場合は`${パス名+HTTPメッソド名}WithHttpInfo`をcallします（例の場合は`healthGetWithHttpInfo`）。
  ただし、返り値は`http/http.dart`パッケージの`Response`インスタンスとなるので、レスポンスボディのモデルバインドは自前で実装する必要がある点に注意してください。生成コード的には（3）の中で（4）をcallするような構造になっています。

# さいごに

お手軽にSwaggerからAPIクライアントコードの生成&実装ができました。

今回はスキップしましたが、認証機構も生成されていたり、APIクライアントのカスタマイズも可能なので自動生成コードの中身は是非見てみてください。

Flutterに関しては他にもいろいろ知見を深めることができたので、別の機会があれば記事にできればと。m(__)m

# おまけ

需要があるかわかりませんが、サンプルとして載せたSwaggerから生成されたコードを載せておきます。
コード見てみたいけど手元に環境がない、なんて方の参考になればと。

<details><summary>▽Swaggerから生成したコード（クリックで開けます）</summary><div>

```dart
// client/lib/api/sytem_api.dart

part of openapi.api;

class SystemApi {
  final ApiClient apiClient;

  SystemApi([ApiClient apiClient]) : apiClient = apiClient ?? defaultApiClient;

  ///  with HTTP info returned
  Future<Response> healthGetWithHttpInfo() async {
    Object postBody;

    // verify required params are set

    // create path and map variables
    String path = "/health".replaceAll("{format}","json");

    // query params
    List<QueryParam> queryParams = [];
    Map<String, String> headerParams = {};
    Map<String, String> formParams = {};

    List<String> contentTypes = [];

    String nullableContentType = contentTypes.isNotEmpty ? contentTypes[0] : null;
    List<String> authNames = [];

    if(nullableContentType != null && nullableContentType.startsWith("multipart/form-data")) {
      bool hasFields = false;
      MultipartRequest mp = MultipartRequest(null, null);
      if(hasFields)
        postBody = mp;
    }
    else {
    }

    var response = await apiClient.invokeAPI(path,
                                             'GET',
                                             queryParams,
                                             postBody,
                                             headerParams,
                                             formParams,
                                             nullableContentType,
                                             authNames);
    return response;
  }

  Future<Health> healthGet() async {
    Response response = await healthGetWithHttpInfo();
    if(response.statusCode >= 400) {
      throw ApiException(response.statusCode, _decodeBodyBytes(response));
    } else if(response.body != null) {
      return apiClient.deserialize(_decodeBodyBytes(response), 'Health') as Health;
    } else {
      return null;
    }
  }

}
```

```dart
// client/lib/model/health.dart

part of openapi.api;

class Health {
  /// The underlying value of this enum member.
  final String value;

  const Health._internal(this.value);

  static const Health oK_ = const Health._internal("OK");

  static Health fromJson(String value) {
    return new HealthTypeTransformer().decode(value);
  }

  static List<Health> listFromJson(List<dynamic> json) {
    return json == null ? new List<Health>() : json.map((value) => Health.fromJson(value)).toList();
  }
}

class HealthTypeTransformer {

  dynamic encode(Health data) {
    return data.value;
  }

  Health decode(dynamic data) {
    switch (data) {
      case "OK": return Health.oK_;
      default: throw('Unknown enum value to decode: $data');
    }
  }
}
```

```dart
// client/lib/api_client.dart
part of openapi.api;

class QueryParam {
  String name;
  String value;

  QueryParam(this.name, this.value);
}

class ApiClient {

  String basePath;
  var client = Client();

  Map<String, String> _defaultHeaderMap = {};
  Map<String, Authentication> _authentications = {};

  final _regList = RegExp(r'^List<(.*)>$');
  final _regMap = RegExp(r'^Map<String,(.*)>$');

  ApiClient({this.basePath = "http://localhost/api/v1"}) {
  }

  void addDefaultHeader(String key, String value) {
     _defaultHeaderMap[key] = value;
  }

  dynamic _deserialize(dynamic value, String targetType) {
    try {
      switch (targetType) {
        case 'String':
          return '$value';
        case 'int':
          return value is int ? value : int.parse('$value');
        case 'bool':
          return value is bool ? value : '$value'.toLowerCase() == 'true';
        case 'double':
          return value is double ? value : double.parse('$value');
        case 'Health':
          return new HealthTypeTransformer().decode(value);
        default:
          {
            Match match;
            if (value is List &&
                (match = _regList.firstMatch(targetType)) != null) {
              var newTargetType = match[1];
              return value.map((v) => _deserialize(v, newTargetType)).toList();
            } else if (value is Map &&
                (match = _regMap.firstMatch(targetType)) != null) {
              var newTargetType = match[1];
              return Map.fromIterables(value.keys,
                  value.values.map((v) => _deserialize(v, newTargetType)));
            }
          }
      }
    } on Exception catch (e, stack) {
      throw ApiException.withInner(500, 'Exception during deserialization.', e, stack);
    }
    throw ApiException(500, 'Could not find a suitable class for deserialization');
  }

  dynamic deserialize(String json, String targetType) {
    // Remove all spaces.  Necessary for reg expressions as well.
    targetType = targetType.replaceAll(' ', '');

    if (targetType == 'String') return json;

    var decodedJson = jsonDecode(json);
    return _deserialize(decodedJson, targetType);
  }

  String serialize(Object obj) {
    String serialized = '';
    if (obj == null) {
      serialized = '';
    } else {
      serialized = json.encode(obj);
    }
    return serialized;
  }

  // We don't use a Map<String, String> for queryParams.
  // If collectionFormat is 'multi' a key might appear multiple times.
  Future<Response> invokeAPI(String path,
                             String method,
                             Iterable<QueryParam> queryParams,
                             Object body,
                             Map<String, String> headerParams,
                             Map<String, String> formParams,
                             String nullableContentType,
                             List<String> authNames) async {

    _updateParamsForAuth(authNames, queryParams, headerParams);

    var ps = queryParams
      .where((p) => p.value != null)
      .map((p) => '${p.name}=${Uri.encodeQueryComponent(p.value)}');

    String queryString = ps.isNotEmpty ?
                         '?' + ps.join('&') :
                         '';

    String url = basePath + path + queryString;

    headerParams.addAll(_defaultHeaderMap);
    if (nullableContentType != null) {
      final contentType = nullableContentType;
      headerParams['Content-Type'] = contentType;
    }

    if(body is MultipartRequest) {
      var request = MultipartRequest(method, Uri.parse(url));
      request.fields.addAll(body.fields);
      request.files.addAll(body.files);
      request.headers.addAll(body.headers);
      request.headers.addAll(headerParams);
      var response = await client.send(request);
      return Response.fromStream(response);
    } else {
      var msgBody = nullableContentType == "application/x-www-form-urlencoded" ? formParams : serialize(body);
      final nullableHeaderParams = (headerParams.isEmpty)? null: headerParams;
      switch(method) {
        case "POST":
          return client.post(url, headers: nullableHeaderParams, body: msgBody);
        case "PUT":
          return client.put(url, headers: nullableHeaderParams, body: msgBody);
        case "DELETE":
          return client.delete(url, headers: nullableHeaderParams);
        case "PATCH":
          return client.patch(url, headers: nullableHeaderParams, body: msgBody);
        case "HEAD":
          return client.head(url, headers: nullableHeaderParams);
        default:
          return client.get(url, headers: nullableHeaderParams);
      }
    }
  }

  /// Update query and header parameters based on authentication settings.
  /// @param authNames The authentications to apply
  void _updateParamsForAuth(List<String> authNames, List<QueryParam> queryParams, Map<String, String> headerParams) {
    authNames.forEach((authName) {
      Authentication auth = _authentications[authName];
      if (auth == null) throw ArgumentError("Authentication undefined: " + authName);
      auth.applyToParams(queryParams, headerParams);
    });
  }

  T getAuthentication<T extends Authentication>(String name) {
    var authentication = _authentications[name];

    return authentication is T ? authentication : null;
  }
}
```

</div></details>

[Dart/Flutter連載](/articles/20210510a/)の2記事目でした。次回は澁川さんの [Goのサーバーの管理画面をFlutter Webで作ってみるための調査](/articles/20210512a/) です。
