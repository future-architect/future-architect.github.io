---
title: "Electronの使い方 Web開発の技術でデスクトップアプリを作ろう"
date: 2021/01/07 00:00:00
postid: ""
tag:
  - Vue.js
  - Electron
category:
  - Programming
thumbnail: /images/20210107/thumbnail.png
author: 伊藤真彦
lede: "Electronは、GitHubが開発したオープンソースのソフトウェアフレームワークです。ChromiumとNode.jsをコアとして採用する事で、Web開発と同じようにHTML,CSS,JavaScriptを用いて開発したものを.."
---

TIGの伊藤真彦です。

最近Electronを用いたアプリケーション開発を行っています。技術ブログで今まで取り扱った事のないテーマであるため、まずは入門記事を書いてみました。

## Electronとは

[Electron](https://www.electronjs.org/)は、GitHubが開発したオープンソースのソフトウェアフレームワークです。

ChromiumとNode.jsをコアとして採用する事で、Web開発と同じようにHTML,CSS,JavaScriptを用いて開発したものを、デスクトップアプリケーションとしてビルドすることが可能になります。クロスプラットフォームであることも利点の一つであり、同一のソースコードからmacOS、Windows、Linuxへのアプリケーションビルドが可能です。

つまりWeb開発の技術でデスクトップアプリが作成できるものです。

## Electronを使って開発されているもの。

Electronを使って開発されているアプリケーションの中でも有名なものは[公式ページ](https://www.electronjs.org/apps)にリストアップされています。

とりわけ有名なものとして、`Facebook Messenger`、`Slack`、`Twitch`, 更には`Visual Studio Code`等が存在します。

エンジニアの皆さんから、そうでない方まで、Electronのお世話になっていない人の方が少ないかもしれません。習得すると[Visual Studio CodeのGithubリポジトリ](https://github.com/microsoft/vscode)にコミットできるかも...ロマンを感じませんか？

## Electronを使って開発する方法

Electronはnpmパッケージとして提供されています。

```
npm install electron
```

ReactやVue.js等のフロントエンドライブラリと組み合わせて使うようなユースケースが現在では一般的ですが、それらライブラリに依存しない形での開発も可能です。

[electron-quick-startのリポジトリ](https://github.com/electron/electron-quick-start)が参考になります。

git cloneから起動までを体験できる一連のコマンドは[公式ページ](https://www.electronjs.org/)にも記載があります。

```
# Clone the Quick Start repository
$ git clone https://github.com/electron/electron-quick-start

# Go into the repository
$ cd electron-quick-start

# Install the dependencies and run
$ npm install && npm start
```

<img src="/images/20210107/image.png"  style="border:solid 1px #000000" loading="lazy">

`npm start`コマンドでアプリケーションが実行されます、公式にしては少々素朴ですがHello Worldが表示されます。

## proxy環境下でのElectronアプリの開発

proxy認証が必要なネットワークの場合、環境変数の設定及びnpmでのproxy設定をしないと`npm install`が失敗します。

`npm config`は`-g`オプションでグローバル設定にすることができますが、Electronのライブラリがグローバル設定を見に行かない場合があるため、うまく動かない場合はグローバルで設定した覚えがある方でも`-g`オプション無しで設定してみてください。

下記6つの設定を済ませればproxy環境下でも問題なく動きます。id、pass、proxyのドメインは適宜組み替えてください。

```sh
npm config set https-proxy http://id:pass@proxy.example.com:port
npm config set proxy http://id:pass@proxy.example.com:port
SET(linuxの場合export) ELECTRON_GET_USE_PROXY=true
SET GLOBAL_AGENT_HTTPS_PROXY=http://id:pass@proxy.example.com:port
SET HTTPS_PROXY=http://id:pass@proxy.example.com:port
SET HTTP_PROXY=http://id:pass@proxy.example.com:port
```

## Vue.jsでElectronアプリを作る

個人的にはElectronアプリを作成する場合は、Vue.jsとの組み合わせがオススメです。

[Vue CLI Plugin Electron Builder](https://nklayman.github.io/vue-cli-plugin-electron-builder/)の存在が大きいです。このプラグインを導入することで、とても簡単に、Vue.jsで作成したWebアプリケーションをElectronアプリとしてビルドすることができます。

実際に試してみましょう。

まずは環境に応じてnodeをインストールし、`npm`コマンドが叩けるようになっている必要があります。Windowsの場合、[nodejs公式サイト](https://nodejs.org/en/)からインストーラをダウンロードし、インストールしてください。Macの場合、homebrew経由でバージョン管理ツールである[nodebrew](https://github.com/hokaccha/nodebrew)のインストールを行うのが一般的です。

本記事では`npm`コマンドが利用できる状態となっていることを前提条件として取り扱います、詳細なインストール方法は割愛します。

`npm`コマンドが利用できるようになったら、[Vue CLI](https://cli.vuejs.org/)をインストールします。

```
npm install -g @vue/cli
```

インストールが完了したら、Vue CLIを用いてVue.jsのプロジェクトを作成します。

プロジェクト用のフォルダやgitリポジトリを作成することを推奨します。

```sh
mkdir vue-cli-electron-sample
cd vue-cli-electron-sample
vue create vue-cli-electron-sample
```

Vue CLIの案内に従い、バージョンや構成をいくつか選択します。

<img src="/images/20210107/image_2.png" loading="lazy">

全てDefault設定で問題ありません。

アプリケーションの構築が正常に完了すると画像のような案内が表示されます。

<img src="/images/20210107/image_3.png" loading="lazy">

指示に従いひとまず起動してみましょう。

```sh
 cd vue-cli-electron-sample
 npm run serve
```

<img src="/images/20210107/image_4.png" loading="lazy">

<img src="/images/20210107/image_5.png"  style="border:solid 1px #000000" loading="lazy">


サーバーが立ち上がり、ブラウザで`localhost:8080`にアクセスするとHello Worldが表示されます。

ここまではVue.jsの説明ですね。このVue.jsアプリケーションをElectron化してみます。

`npm run serve`コマンドを叩いた場所と同じディレクトリで、`vue add`コマンドを使ってVue CLIプラグインをインストールします。

```
vue add electron-builder
```

<img src="/images/20210107/image_6.png" loading="lazy">

Electronのバージョンを選択できます。

作りたいアプリケーションで利用する、その他のライブラリとの相性問題等が限りは最新バージョンで問題ないと思います。バージョンを選択するとビルドに必要なパッケージのインストールが始まります。ここでproxyに関連する設定を済ませておかないと、クイックスタートを動かす時と同様インストールに失敗します、ご注意ください。

インストールに成功すると、`package.json`に変更が加わるほか、`background.js`が自動生成されます。

```js background.js
'use strict'

import { app, protocol, BrowserWindow } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
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
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
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

ここがVue CLIプラグインの最大の利点です。

<img src="/images/20210107/image_7.png" loading="lazy">

package.jsonにelectronに関連するコマンドが追記されます。

`npm run serve`の代わりに`npm run electron:serve`コマンドを実行してみます。

<img src="/images/20210107/image_8.png" loading="lazy">

npm run serveコマンドと似ていますが、Electronアプリケーションが起動されます。

<img src="/images/20210107/image_9.png" loading="lazy">

表示内容はVue.jsのHello Worldです、これをElectronアプリとして起動することに成功しました。

ではこの状態のアプリケーションをビルドしてみましょう。

```sh
npm run electron:build
```

<img src="/images/20210107/image_10.png" loading="lazy">

ビルドコマンドを実行するとアプリケーションのビルドが走ります。基本的にはアプリケーションをビルドしている端末のOS向けのアプリケーションがビルドされますが、WindowsでMac向けのアプリケーションをビルドするようなことも可能です。詳しくは[公式ガイド](https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/recipes.html#multi-platform-build)をご確認ください。

ビルドに成功すると、dist_electronフォルダ配下に成果物が配置されます。通常のVue.jsアプリケーションのdistフォルダに相当します。

<img src="/images/20210107/image_11.png"  style="border:solid 1px #000000" loading="lazy">

dist_electronフォルダ配下は画像のような状態です。

<img src="/images/20210107/image_12.png"  style="border:solid 1px #000000" loading="lazy">


vue-cli-electron-sample Setup 0.1.0をダブルクリックするとアプリケーションのインストールが開始されます。ちなみに、アプリケーションのバージョン情報は`package.json`記載のバージョンに依存します。
<img src="/images/20210107/image_13.png" class="img-small-size" loading="lazy">


インストールが完了したアプリケーションは一般的なアプリケーション同様に起動することができます。
<img src="/images/20210107/image_14.png" loading="lazy">

vue.config.jsに、下記のように、ビルド設定を`portable`に設定することで、インストール不要な、ダウンロードしたファイルを直接実行、起動できるようなものとしてアプリケーションをビルドする事もできます。

ちょっとしたアプリケーションを毎回インストール、アンインストールするのは手間なので、個人的にはportable形式のアプリが好きです。ここに記載可能な設定は、[electron-builderの公式ページ](https://www.electron.build/configuration/configuration)に記載されています。

```js vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        win: {
          target: [
            {
              target: 'portable', // 'zip', 'nsis', 'portable'
              arch: ['x64'], // 'x64', 'ia32'
            },
          ],
        },
      }
    }
  }
}
```

<img src="/images/20210107/image_15.png" class="img-small-size" loading="lazy">


デフォルトの状態ではアイコンが無いため少々寂しいですが、デスクトップアイコンもvue.config.jsで指定することが可能です。

```js vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        win: {
          icon: 'src/assets/icon.png',
          target: [
            {
              target: 'portable', // 'zip', 'nsis', 'portable'
              arch: ['x64'], // 'x64', 'ia32'
            },
          ],
        },
      }
    }
  }
}
```

なお最小画像サイズ(256 x 256, macの場合512 x 512px)を下回るサイズの画像を指定した場合エラーが発生してビルドできません、ご注意ください。

<img src="/images/20210107/image_16.png" class="img-small-size" loading="lazy">


アイコンを設定することでそれらしくなってきました。

portable形式でビルドしたものをダブルクリックすると、そのままアプリケーションが起動します。依存しているファイルなどは存在しないため、ビルド成果物の保存場所を移動したり、これだけを他のPCに配布しても問題なく動作します。ただし、何も設定をしないと信頼できないアプリケーションとして扱われてしまいます。

これを回避するためには[アプリケーションの署名](https://www.electronjs.org/docs/tutorial/code-signing)が必要になります。仕事で開発する場合は避けては通れない部分ですね。

細かい設定項目はありますが、最小コストとしてはライブラリの導入だけでデスクトップアプリをビルドすることができました。

## ReactでElectronアプリをビルドする

Vue.jsではライブラリを導入するだけでアプリケーションのビルドが可能でした。

Reactの場合はツールが自動でやってくれた部分を自力で整える必要があります。逆に言えばReactアプリケーションをElectronアプリとしてビルドできれば、大抵のものはElectronアプリケーションにできるといっても過言ではありません。
Vue.js同様Hello Worldから導入してみます。

React製アプリケーションを手早く構築するために、[create-react-app](https://github.com/facebook/create-react-app)を導入します。

```sh
npm install create-react-app
```

インストールに成功したら、新しくアプリケーションを構築します。

```
mkdir react-electron-sample
cd react-electron-sample
create-react-app react-electron-sample
```

<img src="/images/20210107/image_17.png" loading="lazy">

アプリケーションの構築に成功すると画像のような案内が表示されます。
指示に従ってアプリケーションを起動してみましょう。

```sh
cd react-electron-sample
npm start
```
<img src="/images/20210107/image_18.png" loading="lazy">

無事にHello Worldが起動しました。

<img src="/images/20210107/image_19.png" loading="lazy">
`Edit src/App.js`の文言を無視するのは忍びないので、Hello Worldらしいメッセージに修正しました。
pタグの文言を修正するだけです。

```js App.js
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" / loading="lazy">
        <p>
          Hello React with Electron
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
```

ここまででReactのHello Worldは完了です。
これをElectronアプリケーションに拡張します。

まずは愚直にelectronパッケージをインストールします。
`npm start`コマンドを実行したディレクトリと同じ場所で、下記コマンドを実行します。

```sh
npm install electron electron-builder --save-dev
```

Vue.jsの場合ライブラリが自動でやってくれた部分ですが、`package.json`に実行できるコマンド、およびビルドのために必要な設定項目を追記します。
Vue.jsでは`vue.config.js`にビルドオプションを記載する形を取ることができましたが、Vue CLIプラグインによる拡張が無いため`package.json`に直接記載する形になります。

```json jsonc

{
  "name": "react-electron-sample",
  "version": "0.1.0",
  "private": true,
  "main": "main.js",
  "build": {
    "extends": null,
    "files": [
      "build/**/*",
      "*.js"
    ],
    "directories": {
      "output": "dist_electron"
    },
    "win": {
      "target": "portable"
    }
  },
  "homepage": ".",
  // 中略 //
  "devDependencies": {
    "electron": "^11.1.1",
    "electron-builder": "^22.9.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "electron:serve": "electron .",
    "electron:build": "react-scripts build && electron-builder",
    "postinstall": "electron-builder install-app-deps",
    "postuninstall": "electron-builder install-app-deps"
  },
}
```

アプリケーション起動時のエントリポイントの設定に当たる`"main": "main.js"`は`"main": "electron/starter.js"`のように、ディレクトリを分けて整理するような事例など諸説確認しましたが、今回はクイックスタートの雰囲気に合わせようと思います。

加えて、Vue CLIプラグインの場合自動生成された`background.js`が担当してくれた部分を手動で書き換えます。

Vue CLIが自動生成した`background.js`は若干Vue.js向けの拡張が為されているため、[electron-quick-start](https://github.com/electron/electron-quick-start)の内容をベースに`index.html`のパスなどを調整します。

```js main.js
// Modules to control application life and create native browser window
const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('build/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
```

上記ファイルは`preload.js`を読み込んでいるため、こちらも同様にディレクトリ直下に作成します。

```js preload.js
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

```

`package.json`の修正、`main.js`, `preload.js`の配置が完了したら、いよいよ起動です。

下記コマンドを実行するとElectronアプリケーションが起動します。

```
npm run electron:serve
```

無事に成功しました。

<img src="/images/20210107/image_20.png" loading="lazy">

アプリケーションのビルドは下記コマンドです。

```
npm run electron:build
```

dis_electron配下にアプリケーションがビルドされました。
package.jsonに何も設定が無いとdistディレクトリに生成されます。

<img src="/images/20210107/image_21.png" class="img-small-size" loading="lazy">


作業の抜け漏れ、typoの確認や、理想のディレクトリ構成を検討して迷うコストを鑑みると体感でVue.jsの3倍くらいの時間がかかる感触でした。

既存のReact製アプリをElectron化したい、Vueより慣れてるフレームワークがある、など事情はあると思いますので、どちらが良いかはチーム構成と趣味次第ですが、エッジケースの挙動や脆弱性の穴埋め等をライブラリ側である程度保証してくれるVue CLIプラグインの利点は大きいかなと感じています。

## Vue.js（ブラウザ）でできてElectronアプリでできないこと

無いといっても良いかなというレベル感です。

Webアプリケーションとして一通りの機能を持ったアプリケーションをVue.js x Electronの組み合わせで作りました。最初は技術的実現性を調査しながら実装を進めていく形になりますが、Electronの問題でどうしてもできなかったという機能はありませんでした。少々の調査や努力が必要だった部分はあります。

当初心配だった部分の一例を紹介します。

> httpクライアントライブラリ(axiosなど)を用いた外部APIへのアクセスは可能か

→問題なく可能だった

> VueRouterを用いた画面遷移は可能か

→[少々設定が必要](https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/commonIssues.html#blank-screen-on-builds-but-works-fine-on-serve)だが動いた

> ファイルのダウンロード、生成は可能か

→問題なく可能だった

> パスワード付きProxy認証を通すことは可能か

→ライブラリ側での担保はされないので自前で実装する必要があった

> クライアント証明書を利用することは可能か

→可能、クライアント証明書が端末に複数インストールされているような場合は自前で選択処理を実装する必要があった

初めて触る場合は色々不安になると思いますが、想像以上に大丈夫でした。
これらハマりどころやtipsは今あるもの、今後気が付いたもの含め適宜記事にしたいと考えています。

## Electronアプリの開発フロー

上記の通り、Vue.jsとして動かしているときは問題なかったがビルドすると動かなくなった、というケースは少ないです。（0ではありません）

そのため、基本は完全にWeb開発の流れで、Vue.jsのホットリロードを効かせた状態でWebアプリとして開発しています。機能が出来上がった段階でElectronアプリケーションとしてビルドし、ビルドが通り、正常に動作するか確認するような形で開発を行うことが可能です。Electronアプリケーションとして起動しつつ、ホットリロードを行う[electron-reload](https://www.npmjs.com/package/electron-reload)のようなパッケージも存在します。万全を期すために、これを導入して常にElectronアプリケーションとして問題ないか検証しながら作業するようなフローにすることも可能かもしれません。導入コストや通常時の動作が重くなる可能性などを考慮し、私のチームでは現在導入していません。

## まとめ

ElectronはWebの技術で開発可能な、デスクトップアプリケーションのフレームワークです。

クロスプラットフォームで、フロントエンドライブラリに依存しない、デスクトップアプリケーションの開発プラットフォームがElectronです。ライブラリの導入以外でWeb開発と開発手法が大きく異なるようなことはありません。

記事にするために整理したhello world状態のアプリケーション2種類をプライベートのgithubで公開しています。参考になれば、もしくはこれをベースに何かアプリケーションを作って頂ければ嬉しいです。

* [vue-cli-electron-sample](https://github.com/maito1201/vue-cli-electron-sample)
* [react-electron-sample](https://github.com/maito1201/react-electron-sample)

余談ですが、昨年の[Qiita クソアプリ Advent Calendar 2020](https://qiita.com/advent-calendar/2020/kuso-app)でもElectronを使った開発事例がありましたね。

お仕事で役立つことはもちろんですが、ちょっとした便利ツールでも、クソアプリ Advent Calendar向けの小ネタでも、いつものWeb開発からちょっと趣向を変えて、デスクトップアプリケーションという選択肢を視野に入れていただければ幸いです。

