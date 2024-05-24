---
title: "FlutterをElectronと組み合わせる"
date: 2021/12/28 00:00:00
postid: a
tag:
  - Flutter
  - Electron
  - Dart
category:
  - Infrastructure
thumbnail: /images/20211228a/thumbnail.png
author: 伊藤真彦
lede: "ElectronはHTML、Javascriptをアセットとして利用してデスクトップアプリケーションとして動かすことができます、結論としてはFlutterアプリケーションをWEB向けにビルドして、その成果物をElectronアプリケーションとしてビルドすることができました。"
---
TIGの伊藤真彦です。

最近はFlutterの研究を進めており、一人Flutter連載のような動きをしています。

# FlutterをElectronと組み合わせる

* [入門記事](/articles/20211221a/): Flutterであればデスクトップアプリケーションを構築することができることを説明しました
* [Electronの入門記事](/articles/20210107/): これも私が書きましたが、Electronもクロスプラットフォームのデスクトップアプリケーションを開発できるライブラリです

ElectronはHTML、Javascriptをアセットとして利用してデスクトップアプリケーションとして動かすことができます、結論としてはFlutterアプリケーションをWEB向けにビルドして、その成果物をElectronアプリケーションとしてビルドすることができました。

なぜそのような事を行うかというポイントですが2点あります。

* Flutter on Desktop未対応の機能を使いたい
* Electron向けの資産を活かしたい

### Flutter on Desktop未対応の機能を使いたい

Flutter on Desktopはまだまだリリースから間もないため、安心して利用できるか見極めながら開発していく必要があります。
またFlutter向けパッケージのいくつかはFlutter on Desktopに対応していないものもあります。

例えば[先日の記事](/articles/20211224a/)で技術検証した[google_maps_flutter](https://pub.dev/packages/google_maps_flutter)を利用したアプリケーションをデスクトップ向けにビルドすると、執筆時点ではアラートが表示され正常に動作しません。

<img src="/images/20211228a/image.png" alt="ビルドエラー" width="1200" height="937" loading="lazy">

同じソースコードをWEB向けにビルドし、Electronに組み込むと問題なく動作します。

<img src="/images/20211228a/image_2.png" alt="ElectronでMap表示" width="1200" height="949" loading="lazy">

Flutter on Desktopのエコシステムが充実するまでの繋ぎとしてこのような手法をとることができます。

### Electron向けの資産を活かしたい

ビジネス要件的にどうしても必要な、Electronに向け最適化されたJavaScript、TypeScript製モジュールがありました。これらの資産をDart向けに作り直す必要をなくす、という意味でFlutter on Electronという組み合わせが実現できないかな、という検証を行ったという背景もあります。

あまり頼りすぎるとFlutter on Desktopに本格移行する難易度が跳ね上がりますが、この組み合わせであれば既存の資産や豊富なnpmモジュールを活用することができます。

# Flutter on Desktopのおさらい

Flutterアプリケーションをデスクトップアプリケーションとして動かすことはとても簡単にできます。

起動時、ビルド時のターゲットを指定するだけです。

```sh
flutter create myapp
cd myapp
flutter run -d macos
```

<img src="/images/20211228a/image_3.png" alt="Flutter on Desktopおさらい" width="1200" height="933" loading="lazy">

設定でデスクトップ向けのビルドが有効化されていない場合は`config`コマンドで有効化します。

```sh
flutter config --enable-macos-desktop
```

既存のプロジェクトで有効化する場合は`config`で有効化した後にカレントディレクトリで`create`コマンドを実行すると、対象のプラットフォーム向けの設定ファイルが用意されます。

```sh
flutter create .
```

この辺りの手軽さはやはり素晴らしいと感じますね。

# FlutterアプリケーションをElectronと組み合わせる

さて本題です。

やる事自体はFlutterアプリケーションは素直にFlutter on the WEBとして開発し、ビルド成果物を組み込むElectronライブラリを用意する形です。作成したmyappフォルダと同じ階層にElectron部分を用意するフォルダを作成します、名前は`nodejs`フォルダにしておきます。

```sh
project
  ├ myapp
  └ nodejs
```

`nodejs`フォルダで諸々準備をするとElectronアプリケーションが利用できるようになります。

* 依存モジュールのインストール
* package.jsonの編集
* 必要なファイルの配置

### 依存モジュールのインストール

`nodejs`フォルダで`npm init`コマンドを実行し、Electronを導入します。[electron-builder](https://www.electron.build/)が「Yarn is strongly recommended instead on npm」と強く訴えているので、Yarnを使って依存モジュールを導入します。

```sh
cd nodejs
npm init -y
yarn
yarn add electron --dev
yarn add electron-builder --dev
```

### package.jsonの編集

インストールが完了したら必要なファイルやコマンドを整備します。まずは`package.json`に下記の内容を追加します。

```json package.json
  "main": "src/background.js",
  "scripts": {
    "start": "cd ../myapp flutter run",
    "electron:start": "bash ../build.sh && electron src/background.js",
    "electron:build": "bash ../build.sh && electron-builder"
  }
```

`start`コマンドはピュアにFlutterアプリとして動かしたい場合にいちいちフォルダを移動するのが面倒なのでオマケのようなノリで追加しています。

### 必要なファイルの配置

追加したコマンドはElectronアプリケーションを起動、またはビルドする前にFlutterのビルドコマンドを記載したシェルを叩く、という仕組みにしています。

`build.sh`は下記のような内容です。

```sh build.sh
#!/bin/sh
# flutterアプリをビルド
cd ../mymap
flutter build web
# ビルド成果物をコピー
cp -r ./build/web/ ../nodejs/src/
# electronで動かすためhtmlの内容を修正
sed -i -e 's/base href=\"\/\"/base href=\"\"/' ../nodejs/src/index.html
```

Flutter on the Webには`index.html`に記載された`base`タグを参照してJavascriptのモジュールが動く仕組みになっています。

```html index.html
  <!--
    If you are serving your web app in a path other than the root, change the
    href value below to reflect the base path you are serving from.

    The path provided below has to start and end with a slash "/" in order for
    it to work correctly.

    For more details:
    * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base

    This is a placeholder for base href that will be replaced by the value of
    the `--base-href` argument provided to `flutter build`.
  -->
  <base href="$FLUTTER_BASE_HREF">
```

このbaseタグはビルド時のオプションで変更できます。
Webアプリとしてビルドする時に、デプロイする先のドメインを柔軟に変更できるためのオプションです。

```sh
flutter build web --base-href "/myapp/"
```

デフォルト値は`/`になっています。Electronで利用する場合、`base`タグの値は空文字が都合が良いのですが、オプションで空文字を指定するとエラーが起きてしまいます。

```sh
$ flutter build web --base-href ""
base-href should start and end with /
```

仕方がないので一旦オプション無しでビルドして、sedコマンドで編集しています。

`index.html`のテンプレートを変更してしまっても良いですが、Flutter側の変更は控えることでElectronとFlutterの関係性をなるべく疎結合なものに保ちたい意図があります。ともかくこれだけの変更でFlutter on the WEB向けにビルドしたファイルがElectronのアセットファイルとして利用できます。

あとは`package.json`に追加したコマンドで指定している場所(nodejs/src)に`background.js`を配置しておきます。中身はよくあるElectron向けの起動スクリプトです。個人的にはVue.js向けのElectronプラグインが生成してくれるファイルが一番気が利いていると感じているのですが、MacOSでのエッジケース向けの挙動などはそこから拝借しています。

```js background.js
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    autoHideMenuBar: true,
    useContentSize: true,
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  win.loadURL('file://' + __dirname + '/index.html');
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
```

パスはElectronをVue.jsと組み合わせた場合一般的にここになる、という意図でsrcに配置しています、名前が`main.js`になっても`package.json`に記載した内容と齟齬がなければ問題なく動きます。

Flutter on the Web向けのファイルをビルドすると`main.dart.js`というファイルが生成されますが、今後アップデートによる挙動の変化があってもFlutter側の成果物と名称がぶつからない名前にしておくと良いでしょう。`background.js`という名称もVue.js向けプラグインが生成するファイルに倣っています。

上記の準備を終えるとElectronアプリケーションとしてFlutterのデモアプリが動きます。

```sh
cd nodejs
yarn electron:start
```

<img src="/images/20211228a/image_4.png" alt="Flutter on Electron" width="1200" height="769" loading="lazy">

Flutter on Desktopとして起動したものと比較すると、微妙にフォントが変わるなどの違いが発生しますが、どちらも快適に動作します(右がFlutter on Desktopです)。ウィンドウのリサイズ時の挙動などはFlutter on Desktopの方がスムーズです、この辺りは仕組み上仕方がないかな、といった印象です。

<img src="/images/20211228a/image_5.png" alt="Flutter on Desktopとの表示の違い" width="1200" height="465" loading="lazy">

今回の仕組みではFlutterアプリケーション自体は素直にFlutterアプリケーションとして開発できているので、Flutter on Desktopでも問題なければフットワーク軽めに移行できます。

デスクトップ対応は魅力的だけど、欲しい機能がまだ動かなかったので見送る、というパターンの時の選択肢としてはオススメできるかなと思います。

# まとめ

* Flutter on Desktop未対応のパッケージはまだ存在する
* Flutter on the WEBとElectronの組み合わせは簡単に実現できる

なかなかトリッキーな試みでブログ記事にするか迷いましたが、面白いという意見をいただけたのと意外と需要があるかも...?ということで記事にしてみました。

