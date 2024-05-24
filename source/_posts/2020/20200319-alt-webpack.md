---
title: "今あえてTypeScriptのビルド＆バンドルツールを探してみる"
date: 2020/03/19 10:12:40
postid: ""
tag:
  - TypeScript
  - JavaScript
  - フロントエンド
  - webpack
  - Node.js
  - Parcel
category:
  - Programming
author: 澁川喜規
lede: "ちょっとしたフロントエンドの開発で、TypeScriptに最初から対応していて、簡単に使えるものは何かないかな、と調べてみたメモです。React/Vue/Angularの場合はそれぞれの初期化コマンドで何から何まで用意してくれます。Next.js、Nuxt.js、Gatsbyなども、これらのビルドのステップを簡略化するコマンドを提供しています。基本的にこれらのウェブフロントエンドを開発するときには、小規模・中規模ぐらいならあんまり気にしなくておまかせでもいいと思います。今回は、それらのフレームワーク固有のビルドツールとは別に環境を作りたい人で、TypeScriptの環境が欲しい、ウェブの開発がしたい、という前提でいろいろ探してみました。"
---

ちょっとしたフロントエンドの開発で、TypeScriptに最初から対応していて、簡単に使えるものは何かないかな、と調べてみたメモです。React/Vue/Angularの場合はそれぞれの初期化コマンドで何から何まで用意してくれます。Next.js、Nuxt.js、Gatsbyなども、これらのビルドのステップを簡略化するコマンドを提供しています。基本的にこれらのウェブフロントエンドを開発するときには、小規模・中規模ぐらいならあんまり気にしなくておまかせでもいいと思います。

今回は、それらのフレームワーク固有のビルドツールとは別に環境を作りたい人で、TypeScriptの環境が欲しい、ウェブの開発がしたい、という前提でいろいろ探してみました。

今回試してみたのは次の4つです。

* Parcel
* Fusebox
* ncc
* Rome.js

# JavaScriptのビルドツールとは

JavaScriptでビルドといっても、いろいろなステップがあります。

1. TypeScriptやBabelを使って、ターゲットとなるバージョンのJavaScriptに変換
2. SCSSとかPostCSSを使ってブラウザにない機能を使って書かれたCSSを素のCSSに変換
3. webpackなどを使って、1つのJavaScriptファイル、もしくは遅延ロードをするJSファイル群を生成

まあ実際にはこんなに綺麗にステップが分かれることはなくて、webpackがimport文を追跡しつつファイルを探し、.tsを見つけてはTypeScriptで処理して（コンパイル）、コード中にSCSSを見つけてはSCSSの処理系に投げて、一つのファイルにまとめる（バンドル）・・みたいな工程を行ったりきたりしながらビルドします。以前は、これにJake、Gulp、Gruntなどのタスクランナーも組み合わせてやってましたが、今はwebpack単体にts-loaderなどを組み合わせる感じで一通りできます。webpackが[シェア80%](https://www.jetbrains.com/lp/devecosystem-2019/javascript/)で一強ですね。

なお、これにファイルの変更検知を行って、変更時に変更部分だけをビルド（ウォッチ）、読み込んでいるブラウザに変更したことを伝えてリロードを行わせる開発サーバーとよぶサーバーも加えると、世間で「JavaScriptのビルドツール」と呼ぶ機能はだいたい網羅されるんじゃないですかね。

# Parcel

[Parcel](https://parceljs.org/)はゼロコンフィグを目指したバンドラーです。TypeScriptも最初からサポートしています。エントリーポイントを指定するだけでビルドしてくれます。tsconfig.jsonがあればそれを拾って解釈してくれますし、なくても動きます。単にtsファイルをエントリーポイントとしてわたしてあげれば、そのままTypeScriptの処理系をインストールしつつビルドしてくれます。最初のビルドも高速ですし、キャッシュもしてくれて2回目以降も速いです。TreeShakingとかの生成されたファイルの最適化機構も入っているとのこと。

```sh
$ npm install -D parcel-bundler
$ npx parcel build src/index.ts
```

エントリーポイントにHTMLファイルを指定できて、フロントエンド開発の開発サーバーも付いている。これは無敵！と思いきや・・・わざと型を間違ったTypeScriptのファイルを入力しても何もエラーも出ません。

これは現在は意図した動作らしく、Parcelは最速でバンドルするだけを目指しており、設計方針としてエラーは出さないとのこと。もしかしたら、TypeScriptで開発し、Visual Studio CodeとかWebStorm上でエラーが出てくるなら問題ないとも言えるかもしれません。とはいえ、せっかくのチェック機構をまったく無視するのはTypeScriptを使うメリットがだいぶ削られてしまいます。また、別途CIなりを整備するのもちょっと手間ですよね。まあ、TypeScriptとかが流行る前は型チェックなんてなかったわけで、ちょっと昔の感覚を思い出しました。

[Parcel 2系になったらTypeScriptのエラーを報告しない問題に対応するよ](https://github.com/parcel-bundler/parcel/issues/1378
)、と昨年のコメントにはあるものの、次の[2.0のリリースまでのハードルはかなり高そう](https://github.com/parcel-bundler/parcel/projects/5)。2.0が出てさえくれれば設定のかんたんさとかは抜群なので、期待しています。

# FuseBox

[FuseBox](https://fuse-box.org/)はそこそこ歴史はあるツールですが、ここで紹介する他のツールと違い、CLIを提供しません。JavaScriptかTypeScriptでビルドの設定ファイルを作ります。現状は3系ですが、これも新バージョンの4系が開発中で、``@next``をつけてインストールします。

```sh
npm install -D fuse-box@next
```

4系の最小は以下の通りです。これはデバッグビルドのための開発サーバーを立ち上げて開発支援をする、という設定ファイルです。

```js:fuse.ts
import { fusebox } from 'fuse-box';
fusebox({
  target: 'browser',
  entry: 'src/index.tsx',
  webIndex: {
    template: 'src/index.html',
  },
  devServer: true,
}).runDev();
```

テンプレートのところのHTMLはこんな感じで、CSSとJavaScriptの成果物を$なプレースホルダーに埋め込むようになっています。

```html
<!DOCTYPE html>
<html>
  <head>
    <title></title>
    $css
  </head>

  <body>
    <div id="root"></div>
    $bundles
  </body>
</html>
```

とはいっても、デバッグ実行だけがしたいわけじゃなくて、productionビルドもしたいわけで、そうなるとたくさん書かないといけない。一応、[フルセットのサンプルとして以下のようなコード](https://github.com/fuse-box/react-example/blob/master/fuse.ts
)が提示されています（今回はReactを作りたいわけではないので.tsxは.tsに書き換えました）。ここまで書かないといけないのであれば、CLIツールも一緒に提供してほしい気が・・・

```js
import { fusebox, sparky } from "fuse-box";

class Context {
  runServer;
  getConfig = () =>
    fusebox({
      target: "browser",
      entry: "src/index.ts",
      webIndex: {
        template: "src/index.html"
      },
      cache : true,
      devServer: this.runServer
    });
}
const { task } = sparky<Context>(Context);

task("default", async ctx => {
  ctx.runServer = true;
  const fuse = ctx.getConfig();
  await fuse.runDev();
});

task("preview", async ctx => {
  ctx.runServer = true;
  const fuse = ctx.getConfig();
  await fuse.runProd({ uglify: false });
});
task("dist", async ctx => {
  ctx.runServer = false;
  const fuse = ctx.getConfig();
  await fuse.runProd({ uglify: false });
});
```

ビルドは高速で快適です。tsconfig.jsonがなくても実行できます。なお、Node.js 10.xや11.xのバージョンではまだexperimentalなworker_threadパッケージを使っているので、12以降を使うか、``--experimental-worker``オプションが必要です。開発サーバーもあり、HMRもできて、ウェブフロントエンド開発でTypeScriptでやりたい人には良いですね。

```sh
% npm start

> fuse-box-test@1.0.0 start /Users/shibukawa/fuse-box-test
> ts-node -T fuse

  [ default ] Starting

  ⚙  FuseBox 4.0.0-next.411
     Mode: development
     Entry: /Users/shibukawa/fuse-box-test/src/index.ts


   SUCCESS   Completed without build issues in 128ms

  [ default ] Completed in 138ms
  development Development server is running at http://localhost:4444
```

# ncc

npmにアップロードするコードをシンプルにする、超快適に開発する、というのを目指して作られているのが[ncc](https://www.npmjs.com/package/@zeit/ncc)です。ある意味browserifyの後継な感じを受けます。簡単。ひたすら簡単。Next.jsで有名なZeitが開発しています。

```sh
$ npm install -D @zeit/ncc
```

npmのサイズを小さくするという目標を体現しているツールで、それ自身もTypeScript内臓だけど、インストールは一瞬で終わります。他への依存もなく、パッケージがとても小さい。

```
$ du -h
9.8M	./node_modules/@zeit
```

コマンド体系はGoを目指していて、ncc build [script]でビルドができます。ncc run [script]で実行ができます。

```
% npx ncc run -q test.ts
ncc: Using typescript@3.7.5 (ncc built-in)
hello world
```

ts-nodeは実行にtypescriptパッケージが必要で、ts-nodeとtypescriptをインストールするとそれだけで52MBぐらいになってしまうので、ncc runをts-nodeがわりにするのも良さそうです。tsconfig.jsonは必要です。

コマンドは基本的にbuildとrunだけなので使い方は迷うことはないと思います。``--watch``で監視しつつビルドしたり、``--minify``で小さくしたり。

一方、ウェブフロントエンドの開発を手助けしてくれる開発サーバーはありません。ExpressとかでAPIサーバーを実装するには良さそうです。

# Rome.js

* https://romejs.dev/

こちらは超新進気鋭のビルドツールです。日本Node.jsユーザグループの会長に「かいちょー、何かJSのバンドラー兼ビルドサーバーまわりで、なんか新しげな良いのないですか」と聞いて教えてもらいました。

Babelの作者とかが関わっているツールです。コンパイラ、Linter、フォーマッター、テスト、バンドラーなどを全部まとめて持っていて、外部依存がないのがウリとのこと。なお、ウェブサイトはありますが、それよりも[GitHubのREADME](https://github.com/facebookexperimental/rome)の方がいろいろプロジェクトの背景等が詳しく書かれていたりします（実行の仕方の説明はREADMEは古くて動かないですが）。

npmにも上がっていないので、git cloneするところから。

```bash
$ git clone --depth 1 https://github.com/facebookexperimental/rome
$ pushd rome
$ ./scripts/build-release dist
$ popd
$ cd rome-test
$ npm install -D ../rome/dist
```

このヘルプメッセージから溢れ出るexperimental感。残念ながら、開発サーバーとかはないようです。Facebookなので、ウェブフロントエンドだけではなくて、React Nativeとかもターゲットに考えているのかもしれないし、そこのあたりはよくわかりません。

```sh
% npx rome --help

 Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ rome [command] [flags]

 Global Flags ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  --benchmark                   no description found
  --benchmark-iterations <num>  no description found
  --collect-markers             no description found
  --cwd <input>                 no description found
  --fieri                       no description found
  --focus <input>               no description found
  --grep <input>                no description found
  --help                        show this help screen
  --inverse-grep                no description found
  --log-path <input>            no description found
  --logs                        no description found
  --log-workers                 no description found
  --markers-path <input>        no description found
  --max-diagnostics <num>       no description found
  --no-profile-workers          no description found
  --no-show-all-diagnostics     no description found
  --profile                     no description found
  --profile-path <input>        no description found
  --profile-sampling <num>      no description found
  --profile-timeout <num>       no description found
  --rage                        no description found
  --rage-path <input>           no description found
  --resolver-mocks              no description found
  --resolver-scale <num>        no description found
  --silent                      no description found
  --temporary-daemon            no description found
  --verbose                     no description found
  --verbose-diagnostics         no description found
  --watch                       no description found

 Commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Code Quality Commands
  - ci run lint and tests
  - lint run lint against a set of files
  - test run tests

  Internal Commands
  - evict evict a file from the memory cache
  - format TODO
  - logs TODO
  - rage TODO

  Process Management Commands
  - develop TODO
  - restart restart daemon
  - start start daemon (if none running)
  - status get the current daemon status
  - stop stop a running daemon if one exists

  Project Management Commands
  - config Modify a project config
  - init create a project config
  - publish TODO
  - run TODO

  Source Code Commands
  - analyzeDependencies analyze and dump the dependencies of a file
  - bundle build a standalone js bundle for a package
  - compile compile a single file
  - parse parse a single file and dump its ast
  - resolve resolve a file
```

``rome run test.ts``で実行はできましたが、残念ながら、現段階ではこれもParcel同様型情報を削ぎ落としているだけっぽくて、TypeScriptの型チェックのエラーは出ませんでした。READMEには"Don't use loose types such as ``any``"と強く書かれているので、型には厳しくなっていくと思われます。

基本方針の中には、修正方法を開発者に伝えないようなエラーメッセージはなくしていく、とか、「トークン」みたいなコンパイラ内部用語（ジャーゴン）が外に出ないようにして、コンパイラ視点ではなくて、プログラマー視点の用語の「文字」を出すようにしていく、みたいなことも書いてあるのは面白いなと思いました。単にTypeScriptとかに変換処理を投げるだけじゃなくて、その出力もラップして、開発者にとって使いやすい処理系を目指しています。なかなかに野心的なプロジェクトです。

・・・人に紹介するにはまだまだexperimentalすぎる感じはありますが。会長曰く「僕も試してないです。渋川さんなら一番早く書籍にしてくれるはず」とのこと。

# まとめ

まだ正式リリースしていないバージョンも含めて、TypeScriptに最初から対応しているビルド・バンドルツールをいくつか紹介してきました。webpack一強だからこそ、そのwebpackにはない強みを出そうと活発に開発されています。このあたりのエコシステムの活発さはNode.js界隈はやはり強いですね。

まあ、お金をいただいてやる仕事はまだまだwebpackでいいかな・・・と思いつつ、手元でちょっと新しいライブラリを試行錯誤する時とかに、新しいものも使ってみようと思います。とりあえず、FuseBox@nextと、nccはすでに実用に耐えられるレベルかな、と思います。今回はウェブフロントエンド開発をするという前提で開発サーバーの有無とかも紹介しましたが、そうなるとFuseBoxは良さそうです。本当は使い捨てのサンプルで活用したかったので、そのユースケースにいちばんマッチしているParcel 2もリリースされたら使ってみようと思います。Rome.jsも新しい開発体験を目指していそうだし、開発者が強い人たちなので楽しみです。
