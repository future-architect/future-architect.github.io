---
title: "Goのサーバーの管理画面をFlutter Webで作ってみるための調査"
date: 2021/05/12 00:00:00
postid: a
tag:
  - Flutter
  - Go
  - SPA
  - flutter_web
  - 管理画面
category:
  - Frontend
thumbnail: /images/2021/20210512a/thumbnail.png
author: 澁川喜規
lede: "Flutter連載の3本目はFlutter Webを紹介します。Flutter 2になって、Web向けに出力する機能もStableになりました。Flutter for Webは標準のHTMLにするHTMLレンダラーと、CanvasKitレンダラーと2種類あります。後者はSkiaという2DグラフィックスのライブラリをWebAssembly化したものを使います。Skiaは..."
---
[Dart/Flutter連載](/articles/20210510a/)の3本目はFlutter Webを紹介します。

Flutter 2になって、Web向けに出力する機能もStableになりました。

Flutter for Webは標準のHTMLにするHTMLレンダラーと、CanvasKitレンダラーと2種類あります。後者はSkiaという2DグラフィックスのライブラリをWebAssembly化したものを使います。Skiaはウェブ向けではないFlutterでも使っているため、モバイルとの互換性の高さが期待されます。

現状では明示的に指定しなければauto（モバイルはHTMLレンダラー、PCはCanvasKitレンダラー）になりますが、明示的に指定もできます。これらの違いはまた後で触れますが、せっかくウェブが出せるようになったので、ウェブフロントエンドをFlutterで作ってみるための色々調査をしてみました。React/Vue/Angularを一通り業務で使ってみましたし、フロントエンド開発周りもここ5-6年ぐらい、書き方が違うぐらいでやっていることはあんまり変わらなくて個人的に飽きてきたこともあります。

# ウェブアプリといえばRouter

SPAで管理画面を作っていく上で、最低限必要なことはRouterと呼ばれる機能です。VueやAngularだと標準で用意されています。Reactは標準はないですが、使うときはだいたい何かしら入れるでしょう。

FlutterはデフォルトでNavigotorというクラスがあります。以下のページがめちゃくちゃまとまっていますので、詳細はこちらをご覧ください。

https://medium.com/flutter/learning-flutters-new-navigation-and-routing-system-7c9068155ade

ウェブアプリケーションユーザー目線で、いくつか知っておくべきポイントがあります。

* 1.0と2.0と大きく2種類に分かれる（ここでは2を扱います）ので、ウェブを検索して出てきた内容を参考にするには利用バージョンと同じかどうか注意が必要
* サンプルの一番シンプルな書き方だと、URLのパスを決めるのではなく、その場でウィジェットを上書きする（pushする）モードで、ウェブのよくある挙動とは違う動きになる
* named navigator routesという、ウェブのRouterに近い、パスのルールとその時の表示するウィジェットのマッピングを定義するモードもある（ネストもできる）
* named navigator routesでデフォルトはハッシュを挟んだパスになる（AngularでいうところのHashLocationStrategy）が、PathLocationStrategyも設定可能
* パスの一部をパラメータとして利用しようとすると面倒

あとは次のあたりも僕がFlutterを学び始めたときにちょっと悩んだポイントです。

* statefulとstatelessでウィジェットを作り分ける必要がある
* buildメソッドはReactのrender
* builderという言葉はVueのslot的な、特定のライフサイクルで呼ばれてビューの一部を返す何か←某握力王の人に教えてもらいました
* debug(）関数でconsole.logに出力できる

## 最小のRouter

次のコードが↑に書いてあるnamed navigator routesを使った最小のコードです。2つの画面の間の遷移をします。まず、ルートのMaterialAppに、routesの引数でURLとページのマップを定義します。あとは、Navigatorクラスを使って、pushNamed()メソッドや、pop()メソッドを使ってページ遷移ができます。よくあるSPAと変わらないですね。

```dart lib/main.dart
import 'package:flutter/material.dart';

void main() {
  configureApp();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      routes: {
        '/': (context) => HomeScreen(),
        '/details': (context) => DetailScreen(),
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: TextButton(
          child: Text('View Details'),
          onPressed: () {
            Navigator.pushNamed(context, '/details');
          },
        )
      ),
    );
  }
}

class DetailScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: TextButton(
          child: Text('Pop!'),
          onPressed: () {
            Navigator.pop(context);
          }
        )
      ),
    );
  }
}
```

こちらができあがりです。Android Studioで作った環境でウェブで表示してみたものになります。

<img src="/images/2021/20210512a/スクリーンショット_2021-05-11_8.49.21.png" alt="Routerのデモをウェブ表示" width="1200" height="1659"  loading="lazy">

なお、URLの一部がエンティティのIDとしてパスパラメータとして使いたい場合は、RouteInformationParserを継承したクラスを作ってアプリに渡す必要があります。上記のmediumのページの中でRouteInformationParserで検索して見てみれば書き方がわかりますが、面倒です。ここはそのうち改善されるのでは、ということを期待しています。

## ハッシュがURLに入ってしまうのをやめる

PathLocationStrategy相当への切り替え方法については次のページで説明されています。

https://flutter.dev/docs/development/ui/navigation/url-strategies

まず、依存パッケージにflutter_web_pluginsを追加します。

```yaml pubspec.yaml
dependencies:
  flutter_web_plugins:
    sdk: flutter
```

次に、main関数の中で、URLのルールを変更します。↑のページには、Web向けとそれ以外向けでルールを切り替える方法も紹介されていますが、ここではウェブでしか使わない前提でシンプルにmainに書いてしまっています。

```dart main.dart
import 'package:flutter_web_plugins/flutter_web_plugins.dart';

void main() {
    setUrlStrategy(PathUrlStrategy());

    runApp(MyApp());
}
```

これでパスにハッシュが入ることがなくなりました。

<img src="/images/2021/20210512a/スクリーンショット_2021-05-11_8.56.50.png" alt="URLにハッシュが入っていないデモ画面" width="1006" height="260"  loading="lazy">

# Goのアプリケーションに組み込む

Goで作ったサーバーの管理画面をFlutterで作る前提で、go:embedでアプリにバンドルしてみます。以前、本技術ブログでVueで行ったことをFlutterでもやってみます。

https://future-architect.github.io/articles/20210408/

まずビルドします。[CanvasKitのほうが描画性能は高いとのこと](https://recruit.gmo.jp/engineer/jisedai/blog/flutter2-canvaskit-performance/)ですが、たぶん、レンダラーはHTMLが良いかと思います。

```bash
flutter build web --web-renderer=html --source-maps
```

ビルドオプションには--releaseをつけることができます。つけるとビルドは遅くなります（M1 MacBook Proで20秒ほど。つけないと0.3秒）。

ビルド結果は``build/web``フォルダに出力されます。

一見、CanvasKitもHTMLもファイルサイズがほとんど変わらない（3.4MBと3.5MB)のですが、CanvasKitでビルドすると、CanvasKitの本体のwasmのビルド済みのファイルをネット越しにダウンロードしているようです。これが2MBぐらいあるみたいですし、もしかしたらプロキシが必要なイントラネットで利用とか考えると、外部依存はないに越したことはありません。

```js main.dart.js
14151:$2:function(a,b){return"https://unpkg.com/canvaskit-wasm@0.25.1/bin/"+a},
41865:s($,"ae9","a2x",function(){return"https://unpkg.com/canvaskit-wasm@0.25.1/bin/canvaskit.js"})
```

Goのファイルをいくつか作成します。go:embedが、今いるフォルダよりも子供のフォルダしか読み込めないので、Flutterのルートのフォルダでgo mod init flutter_with_goを叩いて、go.modを作成します。

ファイルを参照するgo:embedは次のように書きます。

```go asest.go
package flutter_with_go

import (
	"embed"
)

//go:embed build/web/*
var assets embed.FS
```

NotFoundHandlerハンドラーは[前回の記事のファイルの配信のハンドラー](/articles/20210408/)で紹介したコードとほぼ同じです。ファイルの置き場をプロジェクトルートにしてみたのと、パスがbuild/webになったぐらいです。main関数もほぼ以前と同じです。

無事、GoでもFlutter Webのビルド結果をホストできました。

<img src="/images/2021/20210512a/スクリーンショット_2021-05-11_18.15.39.png" alt="GoでもFlutter Webのビルド結果をホストしたデモ表示" width="1200" height="1398"  loading="lazy">

今回のフォルダ構成は次の通りです。Goのコードはserverみたいなサブパッケージを作って入れてもよかったかも。

```tree
├── README.md
├── android
├── asset.go
├── cmd
│   └── flutter_with_go
│       └── main.go
├── flutter_with_go.iml
├── go.mod
├── go.sum
├── ios
├── lib
│   └── main.dart
├── notfound.go
├── pubspec.lock
├── pubspec.yaml
└── web
    ├── favicon.png
    ├── icons
    │   ├── Icon-192.png
    │   └── Icon-512.png
    ├── index.html
    └── manifest.json
```

# サーバーへのHTTPアクセス

静的HTMLを表示するだけでは管理画面にはなりませんので、HTTPアクセスを行ってみます。より高度なサービスになると、昨日のエントリーの[Swaggerを使ったサーバーアクセス](/articles/20210511b/)や、GraphQLやgRPCを使いたくなるかもしれません。今時なプロトコルはどれでも利用できるのも、Flutterの良いところですが、今回はシンプルなHTTPアクセスをします。

題材としては今話題沸騰のイケてるWeb APIである[ケンオール](https://kenall.jp/)にアクセスしてみます。

<img src="/images/2021/20210512a/スクリーンショット_2021-05-11_20.34.54.png" alt="ケンオールのサイト画面" width="1200" height="952"  loading="lazy">

ケンオールはアカウント登録するとAPIキーが発行され、これを使ってアクセスします。サンプルと言えど、APIキーはフロントエンドに置きたくないので、サーバー側で中継することとします。

## サーバー側の実装

``/api/postal/{code}``にアクセスしたら、住所情報を返すAPIをGoで実装しました。APIキーは環境変数で渡します。Vue.jsのときのサンプルの差分だけ表示します。

```go cmd/flutter_with_go/main.go

type Env struct {
	Port         uint16 `envconfig:"PORT" default:"8000"`
	KenAllAPIKey string `envconfig:"KENALL_API_KEY" required:"true"`
}

func newHandler(apiKey string) http.Handler {
	router := chi.NewRouter()

	router.Route("/api", func(r chi.Router) {
		r.Get("/postal/{code}", func(w http.ResponseWriter, r *http.Request) {
			code := chi.URLParam(r, "code")
			req, _ := http.NewRequestWithContext(r.Context(), "GET", "https://api.kenall.jp/v1/postalcode/"+code, nil)
			req.Header.Set("Authorization", "Token "+apiKey)
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			defer res.Body.Close()
			io.Copy(w, res.Body)
		})
	})

	router.NotFound(flutter_with_go.NotFoundHandler)
	return router
}

func main() {
	// これの前後は同じ
	server := &http.Server{
		Addr:    ":" + strconv.FormatUint(uint64(env.Port), 10),
		Handler: newHandler(env.KenAllAPIKey),
	}
}
```

ビルドしたら試しにcurlでこのサーバーAPIを叩いてみます。バッチリですね(長いのでレスポンスは短くしてます)。

```bash
% curl http://localhost:8000/api/postal/1410032
{
  "version": "2021-04-30",
  "data": [
    {
      "postal_code": "1410032",
      "prefecture_kana": "トウキョウト",
      "city_kana": "シナガワク",
      "town_kana": "オオサキ",
      "prefecture": "東京都",
      "city": "品川区",
      "town": "大崎"
    }
  ]
}
```

## フロント側の実装

フロント側からはサーバーアクセスをさせたいと思います。状態をもつのでstatefulなウィジェットとします。

```dart lib/main.dart
class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: Text('KenAll Sample'),
        ),
        body: Center(
          child: KenAll(),
        ),
      ),
    );
  }
}

class KenAll extends StatefulWidget {
  @override
  _KenAllState createState() => _KenAllState();
}
```

実サーバーアクセスと表示を行う部分はこちらです。フィールドの入力が7文字になったらサーバーアクセスを行い、取得してきた情報をStateに入れています。

```dart lib/main.dart
class _KenAllState extends State<KenAll> {
  final _formKey = GlobalKey<FormState>();
  String prefecture = '';
  String city = '';
  String town = '';
  String koaza = '';
  String kyoto_street = '';
  String building = '';
  String floor = '';

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            decoration: InputDecoration(
              filled: true,
              hintText: 'Enter a postal code...',
              labelText: 'Postal Code',
            ),
            onChanged: (value) async {
              if (value.length == 7) {
                final response = await http.get(Uri.parse('/api/postal/${value}'));
                debugPrint(response.body);
                if (response.statusCode == 200) {
                  final json = jsonDecode(response.body);
                  final body = json['data'][0];
                  print(body);
                  setState(() {
                    prefecture = body['prefecture'];
                    city = body['city'];
                    town = body['town'];
                    koaza = body['koaza'];
                    kyoto_street = body['kyoto_street'];
                    building = body['building'];
                    floor = body['floor'];
                  });
                  return;
                }
              }
              setState(() {
                prefecture = '';
                city = '';
                town = '';
                koaza = '';
                kyoto_street = '';
                building = '';
                floor = '';
              });
            },
          ),
          Expanded(
            child:  ListView(
              children: [
                ListTile(
                  leading: Text('Prefecture'),
                  title: Text(prefecture),
                ),
                ListTile(
                  leading: Text('City'),
                  title: Text(city),
                ),
                ListTile(
                  leading: Text('Town'),
                  title: Text(town),
                ),
                ListTile(
                  leading: Text('Koaza'),
                  title: Text(koaza),
                ),
                ListTile(
                  leading: Text('Kyoto Street'),
                  title: Text(kyoto_street),
                ),
                ListTile(
                  leading: Text('Building'),
                  title: Text(building),
                ),
                ListTile(
                  leading: Text('Floor'),
                  title: Text(floor),
                ),
              ],
            ),
          ),
        ]
      ),
    );
  }
}
```

このHTTPアクセスには外部パッケージが必要なため、pubspec.yamlとHTTPリクエストを送っているコードへのimportの追加を行いま。

```yaml:pubspec.yaml
dependencies:
 http: ^0.13.3
```

```dart:lib/main.dart
import 'package:http/http.dart' as http;
```

無事動いたようです。

<img src="/images/2021/20210512a/スクリーンショット_2021-05-11_22.32.50.png" alt="ケンオールAPIを利用したFlutter画面" width="1200" height="1371"  loading="lazy">

# まとめ

そろそろReact/Vue/Angularに飽きてきたかも？ な人の新たなおもちゃとしてFlutter Webの紹介をしました。機能的には以下の3つを紹介しました

* Router周り
* ビルドした成果物がどうなっていて他の言語(Go)のサーバーにどう組み込めばいいのか
* サーバーへのHTTPアクセス

モバイルアプリ開発案件じゃなくてもFlutterができてしまうので、スカンクワークスにぴったりですね。用途が広くていつの間にかシェアを広げていた黎明期のGoと同じように、上司に内緒でこっそり導入に最適です。

[Dart/Flutter連載](/articles/20210510a/)の3記事目でした。次回は鶴巻さんの[Flutterレイアウト入門](/articles/20210513b/)です。
