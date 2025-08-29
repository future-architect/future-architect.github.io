---
title: "VSCodeの拡張機能（Notebooks類）を自作して公開するまでの流れ"
date: 2024/10/11 00:00:00
postid: a
tag:
  - VSCode
  - VSCode拡張
  - JupyterNotebook
category:
  - Programming
thumbnail: /images/2024/20241011a/thumbnail.png
author: 王紹宇
lede: "VSCode は、多くの IT 従事者に愛用されています。開発、コンパイル、テストに限らず、コードレビューや障害調査、ドキュメント整理など、さまざまな場面で活躍します。さらに、拡張機能を活用すれば、"
---
## 前書き

VSCode は、多くの IT 従事者に愛用されています。開発、コンパイル、テストに限らず、コードレビューや障害調査、ドキュメント整理など、さまざまな場面で活躍します。さらに、拡張機能を活用すれば、日常の繰り返し作業を自動化することもできます。

普段は VSCode の恩恵を受けてばかりですが、自分でも何か貢献したいと思い、少しでも重複作業から解放できる拡張機能を作ることにしました。

### TL;DR

この VSCode 拡張機能を作りました。

https://marketplace.visualstudio.com/items?itemName=wsysuper.vscode-pipe-run-notebook

## 調査

VSCode の拡張機能は、[マーケットプレイス](https://marketplace.visualstudio.com/search?target=VSCode&category=All%20categories&sortBy=Installs)で集中管理されています。現時点は 64000 以上の拡張機能が作られています。

<img src="/images/2024/20241011a/1.png" alt="" width="1200" height="652" loading="lazy">

OSS のおかげで、言語のパックだけではなく、スニペット、配色テーマ、フォーマッター、テストツール、AI/ML、データサイエンスに関わるツールなど、多彩な拡張機能が満載ですね。

<img src="/images/2024/20241011a/2.png" alt="" width="238" height="521" loading="lazy">

今回は、まだ数がそこまで多くない Notebooks の拡張機能を作りたいと思います。

## 機能イメージ

日常で発生する煩雑な繰り返し作業は、基本的に「決まったコマンドや API を実行して情報を取得し、その情報をフィルタリング・変形し、結果をどこかに保存する」という流れに抽象化できると思います。

そこで、このプロセスをサポートするために、以下の機能を持つツールを考えました。

- Input
  - RestAPI の GET をイメージしています。
  - 有名な [Axios](https://axios-http.com/) を使用して、JSON 形式の Config を書けば HTTP リクエストを送信できるようにします。
  - また、テストでダミーデータが必要な場合も多いので、数年前に作った [json-creator](https://www.npmjs.com/package/json-creator) を使って、テスト用の JSON 形式のダミーデータを生成することも可能です。
- Extract
  - 例えば、JSON 形式のデータから必要な項目を抽出・変形します。
  - この部分には、AWS CLI でも採用されている [JMESPath](https://jmespath.org/) を活用します。
- Output
  - RestAPI の POST や PUT の操作を想定しています。（Axios）
  - Text の結果はクリップボード経由に他の作業と連携もできる想定です。

さらに、ローカル作業をメインとするため、シェルコマンドもサポートします。たとえば、Input 系は `cat`/`curl`/`find` など、Extract 系は `grep`/`sed`/`jq` など、Output 系はファイルにパイプする形での対応ができるようにし、自由な組み合わせで機能強化できるようにします。

通常、ローカルツールを開発するときに悩ましいのが UI の部分ですが、VSCode の拡張機能として作成することで、既存のインターフェースを利用でき、純粋に機能開発に集中できるのも大きな利点です。

さらに、ユーザーとしても慣れ親しんだ VSCode の環境でツールを使用できるため、導入のハードルも低くなります。

このツールでは、Notebook のセルのようにタスクを自然に分けて、1 ステップずつ開発・デバッグを行い、最後に全体を一連の流れで実行できるような機能を実装します。

最終的には、これらのツール群をそれぞれのタイプに応じたセルで実行し、前のセルで生成した出力を次のセルの入力として利用する、パイプライン型のワークフローツール「`Pipe Run Notebook`」を作成したいと考えています。

## 実現手順

初回ですので、全部公式の推奨のやり方で一通り実施したいと思います。

### Step 1 Extension プロジェクトの大枠を作成する

オフィシャルのサイト「[初めての拡張機能](https://code.visualstudio.com/api/get-started/your-first-extension)」を参考して、手順通りに実施すれば「[Hello World](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-sample)」のサンプルが作られます。

#### Step 1-1 ツールのインストール

まずは、自分環境の Node バージョンを確認します。
Node のバージョンを切り替えたりしたい場合は、バージョン管理ツール [nvm](https://github.com/nvm-sh/nvm) がおすすめです。今回の本題ではないため割愛します。

一旦現時点の最新を利用する。

```txt
➜  vscode-ext node --version
v22.9.0
```

最初は [Yeoman](https://yeoman.io/) と [VS Code Extension Generator](https://www.npmjs.com/package/generator-code) のインストールです。

今回以外使う予定がないため、一時的コマンド実行用の `npx` を使う。以降も使いたい場合は `npm install --global yo generator-code` のやり方も記載してありますが、 `npx` で実行する場合でもローカルキャッシュが効くと思うので、開発ツールぐらいは `npx` を利用して最新版を使うのが無難でしょう。

_※ 自分は `oh-my-zsh` を使って、 `vscode-ext` というパスの配下で作業していますので、以降、のプロンプトは `➜  vscode-ext` になります。_

```console
➜  vscode-ext npx --package yo --package generator-code -- yo code
(node:42073) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)

     _-----_     ╭──────────────────────────╮
    |       |    │   Welcome to the Visual  │
    |--(o)--|    │   Studio Code Extension  │
   `---------´   │        generator!        │
    ( _´U`_ )    ╰──────────────────────────╯
    /___A___\   /
     |  ~  |
   __'.___.'__
 ´   `  |° ´ Y `
```

依存ライブラリのバージョンが古くなっている警告は一旦無視し、スタイルが良いキャラクタの絵文字が出ました。

#### Step 1-2 Hello World のデモプロジェクト作成

その続きで、いくつかの質問を回答すると、Hello World 拡張の大枠(scaffold 形式)が作られます。

```console
? What type of extension do you want to create? (Use arrow keys)
❯ New Extension (TypeScript)
  New Extension (JavaScript)
  New Color Theme
  New Language Support
  New Code Snippets
  New Keymap
  New Extension Pack
  New Language Pack (Localization)
  New Web Extension (TypeScript)
  New Notebook Renderer (TypeScript)
```

最初の質問は作る拡張機能のタイプを決めます。おすすめの TypeScript の新拡張機能を選びます。

```console
? What type of extension do you want to create? New Extension (TypeScript)
? What's the name of your extension? vscode-pipe-run-notebook
? What's the identifier of your extension? vscode-pipe-run-notebook
? What's the description of your extension? Pipe Run allows you to perform Axios requests / Shell commands / JMESPath / JsonCreator in a notebook environment in a pipeline style.
? Initialize a git repository? Yes
? Which bundler to use? esbuild
? Which package manager to use? npm

(node:42073) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
Writing in /Users/wsysuper/playground/vscode-ext/vscode-pipe-run-notebooks...
   create vscode-pipe-run-notebooks/.vscode/extensions.json
   create vscode-pipe-run-notebooks/.vscode/launch.json
   create vscode-pipe-run-notebooks/.vscode/settings.json
   create vscode-pipe-run-notebooks/.vscode/tasks.json
   create vscode-pipe-run-notebooks/package.json
   create vscode-pipe-run-notebooks/tsconfig.json
   create vscode-pipe-run-notebooks/.vscodeignore
   create vscode-pipe-run-notebooks/esbuild.js
   create vscode-pipe-run-notebooks/vsc-extension-quickstart.md
   create vscode-pipe-run-notebooks/.gitignore
   create vscode-pipe-run-notebooks/README.md
   create vscode-pipe-run-notebooks/CHANGELOG.md
   create vscode-pipe-run-notebooks/src/extension.ts
   create vscode-pipe-run-notebooks/src/test/extension.test.ts
   create vscode-pipe-run-notebooks/.vscode-test.mjs
   create vscode-pipe-run-notebooks/eslint.config.mjs

Changes to package.json were detected.

Running npm install for you to install the required dependencies.
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@8.1.0: Glob versions prior to v9 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

added 371 packages, and audited 372 packages in 18s

125 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

Your extension vscode-pipe-run-notebooks has been created!

To start editing with Visual Studio Code, use the following commands:

     code vscode-pipe-run-notebooks

Open vsc-extension-quickstart.md inside the new extension for further instructions
on how to modify, test and publish your extension.

To run the extension you need to install the recommended extension 'connor4312.esbuild-problem-matchers'.

For more information, also visit http://code.visualstudio.com and follow us @code.


? Do you want to open the new folder with Visual Studio Code? Open with `code`
➜  vscode-ext
```

上記通りに、拡張機能名や識別子など、いくつかの質問を回答することによって、VSCode の拡張開発プロジェクトが作られました。

生成されたディレクトリ構造は以下。（他の bundler を選んだ場合は生成したファイルに差異があるはず。）

```console
➜  vscode-ext tree -I 'node_modules' vscode-pipe-run-notebooks
vscode-pipe-run-notebook
├── CHANGELOG.md
├── README.md
├── dist
│   ├── extension.js
│   └── extension.js.map
├── esbuild.js
├── eslint.config.mjs
├── out
│   ├── extension.js
│   ├── extension.js.map
│   └── test
│       ├── extension.test.js
│       └── extension.test.js.map
├── package-lock.json
├── package.json
├── src
│   ├── extension.ts
│   └── test
│       └── extension.test.ts
├── tsconfig.json
└── vsc-extension-quickstart.md

6 directories, 16 files
```

生成された package.json の中身を覗けば、以下のことが分かります。

1. 入口は `extension.js` である
1. いくつかコンパイル用、テスト用、リリース前のパッケージ用のスクリプトが作られている
1. 普段のライブラリやアプリではあまり見慣れていない `contributes` の部が作られている

```json
{
  "name": "vscode-pipe-run-notebook",

  ...

  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "vscode-pipe-run-notebooks.helloWorld",
        "title": "Hello World"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "npm run check-types && npm run lint && node esbuild.js",
    "watch": "npm-run-all -p watch:*",
    "watch:esbuild": "node esbuild.js --watch",
    "watch:tsc": "tsc --noEmit --watch --project tsconfig.json",
    "package": "npm run check-types && npm run lint && node esbuild.js --production",
    "compile-tests": "tsc -p . --outDir out",
    "watch-tests": "tsc -p . -w --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    "check-types": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vscode-test"
  },
  ...

}
```

#### Step 1-3 Hello World の拡張機能の動作確認

この時点で、もう `F5` を押してデバッグすれば、新しい VSCode ウィンドウが自動的に開かれ、プラグイン動作確認ができる状態になっています。

**新しい VSCode ウィンドウ**のコマンドパレット（`F1` もしくは `Ctrl/Cmd + Shift + P`）で、`Hello`を打つと、今回自動生成で作られた`Hello World`コマンドの存在が確認できます。

下記スクショのように、`Hello World`コマンドを実行すると、右下のメッセージ欄でメッセージがポップアップされる。

<img src="/images/2024/20241011a/3.png" alt="" width="1200" height="237" loading="lazy">

<img src="/images/2024/20241011a/4.png" alt="" width="1022" height="250" loading="lazy">

上記の挙動は、`package.json` に `contributes.commands` の記載と `src/extension.ts` の下記ロジックで実現されています。

<img src="/images/2024/20241011a/5.png" alt="" width="1200" height="947" loading="lazy">

`vscode.window.showInformationMessage`のような **VS Code 拡張機能**を開発する際に使える便利な API は、それ以外も数多くありますので、詳細は[レファレンスページ](https://code.visualstudio.com/api/references/vscode-api#window.showInformationMessage)を参考してください。

### Step 2 マイ拡張機能の作成

Notebook 形式の拡張を作るので、ガイドページのその他を一旦飛ばし、いきなり [Notebook の紹介ページ](https://code.visualstudio.com/api/extension-guides/notebook)に進みます。

ファイルの読み書きを担当する Serializer、セル内のコードの実行ロジックを担当する Controller (Kernel)そして結果の表示を担当する Renderer という構成になっており、MVC 的な疎結合の構成になっています。

今回は、文字列や JSON オブジェクトの出力になる想定で、カスタマイズの Renderer を一旦実装しないことにします。（デフォルト流用）

具体的なソースコードは下記の Github で参照してください。
ここでは、簡単な説明だけします。

https://github.com/forsleeping/vscode-pipe-run-notebook/tree/0.0.1

#### Step 2-1 package.json の編集

サポートする言語の ID の追加、notebook type の追加、notebook ファイルのパターンを `*.piperun` にします。

```json
  "contributes": {
    "languages": [
      {
        "id": "axios",
        "aliases": [
          "Axios"
        ]
      },
      {
        "id": "jmespath",
        "aliases": [
          "JMESPath"
        ]
      },
      {
        "id": "json-creator",
        "aliases": [
          "JsonCreator"
        ]
      },
      {
        "id": "shell",
        "aliases": [
          "Shell"
        ]
      }
    ],
    "notebooks": [
      {
        "type": "pipe-run-notebook",
        "displayName": "Pipe Run Notebook",
        "selector": [
          {
            "filenamePattern": "*.piperun"
          }
        ]
      }
    ]
  },
```

そして、必要な外部ライブラリを `npm install` します。

```sh
npm install axios jmespath json-creator
```

#### Step 2-2 ファイルの読み書き、Serializer の作成

このファイルを参照してください。

https://github.com/forsleeping/vscode-pipe-run-notebook/blob/0.0.1/src/notebookSerializer.ts

deserializeNotebook は、ファイルから bytes を読み取り、内部の Object に変換します。ほぼバイナリを `Decode` してから `JSON.parse` するだけです。

serializeNotebook は逆で、内部表示の Object をファイルのバイナリへ変換します。ここでは、一部永続化したい情報のみ抽出しています。

セルの実行 Output は`Uint8Array`で表示する部分があり、そのまま `JSON.stringify` や `JSON.parse` だと、Object の形が保持できないことを注意してください。

今回の実装は、方便上 Output をシリアライズする時に排除していますので上記の問題をさけています。つまり、セルの実行結果を notebook ファイルに保持しない方針にします。

#### Step 2-3 セル内のコードの実行、Controller の作成

この 4 種類の言語 ID を定義し、この言語と Controller をバインドします。（つまり、これ以外の言語はこのコントローラーはハンドリングしないです。）

```ts
enum SupportedLanguages {
  Axios = "axios",
  JMESPath = "jmespath",
  JsonCreator = "json-creator",
  Shell = "shell",
}
```

それぞれセルの実行時、languageId によって挙動がそれぞれ定義しています。

詳細はこのファイルを参照してください。

https://github.com/forsleeping/vscode-pipe-run-notebook/blob/0.0.1/src/notebookKernel.ts

将来サポートの言語の種類を増やしやすいように、共通機能を抽出しており、各言語の独自実装の部分を`_xxxHandler` メソッドで分離しています。

#### Step 2-4 example を作って動作確認

`example`ディレクトリを作り、その中に`test.piperun`を作ります。
F5 を押してデバグして、ポップアップした新ウィンドウで`example`ディレクトリを開きます。

test.piperun をクリックしたら、notebook の形式で開かれることが確認できます。
`package.json` で `"filenamePattern": "*.piperun"` という selector の定義が効いているからです。

<img src="/images/2024/20241011a/image.png" alt="image.png" width="1105" height="844" loading="lazy">

図のように、各セルの右下に `Axios` や `JEMSPath` など言語の表記があります。
それをクリックすると、言語の切り替えはできます。`Markdown` 以外は、controller の `supportedLanguages` で定義したものになります。

<img src="/images/2024/20241011a/image_2.png" alt="image.png" width="616" height="198" loading="lazy">

セル左側の三角の Play ボタンで単独実行したら、一番上の`Run All`で一括実行したりして、動作確認します。

親の開発画面（F5 を押す側）で Breakpoint を入れてデバグしたりすることもできます。ソース上の `console.log()`のメッセージも開発画面側の DEBUG CONSOLE ウィンドウで確認できます。

`Run All`の実行結果イメージは以下です。

<img src="/images/2024/20241011a/image_3.png" alt="image.png" width="939" height="994" loading="lazy">

### Step 3 作成した拡張機能をマーケットプレイスでリリース

作成した拡張機能を VSIX 形式のにパックすれば、他人に共有することができます。

より多くの人に便利に利用させるために、VSCode 拡張マーケットプレイスに公開するのが一般的です。

その方法は、[オフィシャルドキュメント](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)にも書かれています。

#### Step 3-1 拡張機能を公開するツールのインストール

VSCode 拡張機能専用のパッケージ化、公開、管理ツール `vsce` (_Visual Studio Code Extensions の略_) を手に入れます。

```sh
npm install -g @vscode/vsce
```

使い方は簡単で、よく使うコマンドは以下のようです。

- `vsce ls` パッケージ化、公開する対象ファイルを確認する
- `vsce login` Publisher としてログインする
- `vsce package` 対象ファイルをパッケージ化する
- `vsce publish` 対象ファイルをマーケットプレイスで公開する

ちなみに、今回の公開する対象ファイルのリストアップは以下になります。

```console
➜  vscode-pipe-run-notebook git:(main) vsce ls
package.json
README.md
LICENSE
CHANGELOG.md
example/test.piperun
dist/extension.js
example/.vscode/settings.json
```

#### Step 3-2 公開前、最終的な準備

README はもちろん、LICENSE ファイルも追加したほうが良いでしょう。（なければパッケージ化する際に警告文が出ます。）

また、せっかく作ったものなので、以下のような meta 情報を package.json に入れましょう。

- 簡潔で正確な説明文 `description`
- カテゴリ `categories`
- バージョン情報 `version`
- パブリッシャー ID `publisher`
- ソースのリポジトリ `repository.url`

初めてなので、publisher を登録する手続きも必要です。

1. 最初は、Azure DevOps で、自分の組織を作る必要があります。[参考](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/create-organization?view=azure-devops)
1. そして、個人アクセストークン(Personal access tokens) を作成します（`vsce login` 時に必要です）
1. [VSCode Publisher 管理画面](https://marketplace.visualstudio.com/manage)で Publisher を作ります

#### Step 3-3 Publish

拡張機能のプロジェクトディレクトリ配下で、`vsce login`, `vsce package`, `vsce publish` を実行します。

```console
vsce login wsysuper
https://marketplace.visualstudio.com/manage/publishers/
Personal Access Token for publisher 'wsysuper': ****************************************************

The Personal Access Token verification succeeded for the publisher 'wsysuper'.
```

まだバグと改善点があったりすると思いますので、今回は pre-release 版を公開します。command に `--pre-release` のオプションをつけます。

```console
➜  vscode-pipe-run-notebook git:(main) vsce package --pre-release
Executing prepublish script 'npm run vscode:prepublish'...

> vscode-pipe-run-notebook@0.0.1 vscode:prepublish
> npm run package


> vscode-pipe-run-notebook@0.0.1 package
> npm run check-types && npm run lint && node esbuild.js --production


> vscode-pipe-run-notebook@0.0.1 check-types
> tsc --noEmit


> vscode-pipe-run-notebook@0.0.1 lint
> eslint src

=============

WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.

You may find that it works just fine, or you may not.

SUPPORTED TYPESCRIPT VERSIONS: >=4.7.4 <5.6.0

YOUR TYPESCRIPT VERSION: 5.6.2

Please only submit bug reports when using the officially supported version.

=============
[watch] build started
[watch] build finished
 INFO  Files included in the VSIX:
vscode-pipe-run-notebook-0.0.1.vsix
├─ [Content_Types].xml
├─ extension.vsixmanifest
└─ extension/
   ├─ CHANGELOG.md [0.25 KB]
   ├─ LICENSE.txt [11.09 KB]
   ├─ README.md [1.4 KB]
   ├─ package.json [2.21 KB]
   ├─ dist/
   │  └─ extension.js [1.51 MB]
   └─ example/
      ├─ test.piperun [0.64 KB]
      └─ .vscode/
         └─ settings.json [0.81 KB]

The file extension/dist/extension.js is large (1.51 MB)

 DONE  Packaged: /Users/wsysuper/playground/vscode-ext/vscode-pipe-run-notebook/vscode-pipe-run-notebook-0.0.1.vsix (9 files, 412.36 KB)
```

パッケージ化後のディレクトリ構成の結果は以下になります。`vscode-pipe-run-notebook-0.0.1.vsix` が作られています。

```console
➜ vscode-ext tree -I 'node_modules' vscode-pipe-run-notebook
vscode-pipe-run-notebook
├── CHANGELOG.md
├── LICENSE
├── README.md
├── dist
│   ├── extension.js
│   └── extension.js.map
├── esbuild.js
├── eslint.config.mjs
├── example
│   └── test.piperun
├── out
│   ├── extension.js
│   ├── extension.js.map
│   ├── notebookKernel.js
│   ├── notebookKernel.js.map
│   ├── notebookSerializer.js
│   ├── notebookSerializer.js.map
│   ├── qiita.md
│   └── test
│   ├── extension.test.js
│   └── extension.test.js.map
├── package-lock.json
├── package.json
├── src
│   ├── extension.ts
│   ├── notebookKernel.ts
│   ├── notebookSerializer.ts
│   └── test
│   └── extension.test.ts
├── tsconfig.json
├── vsc-extension-quickstart.md
└── vscode-pipe-run-notebook-0.0.1.vsix

7 directories, 26 files
```

さて、いよいよ公開のコマンドを打ちます！

```console
vsce publish --pre-release
Executing prepublish script 'npm run vscode:prepublish'...

> vscode-pipe-run-notebook@0.0.1 vscode:prepublish
> npm run package


> vscode-pipe-run-notebook@0.0.1 package
> npm run check-types && npm run lint && node esbuild.js --production


> vscode-pipe-run-notebook@0.0.1 check-types
> tsc --noEmit


> vscode-pipe-run-notebook@0.0.1 lint
> eslint src

=============

WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.

You may find that it works just fine, or you may not.

SUPPORTED TYPESCRIPT VERSIONS: >=4.7.4 <5.6.0

YOUR TYPESCRIPT VERSION: 5.6.2

Please only submit bug reports when using the officially supported version.

=============
[watch] build started
[watch] build finished
 INFO  Files included in the VSIX:
vscode-pipe-run-notebook-0.0.1.vsix
├─ [Content_Types].xml
├─ extension.vsixmanifest
└─ extension/
   ├─ CHANGELOG.md [0.25 KB]
   ├─ LICENSE.txt [11.09 KB]
   ├─ README.md [1.4 KB]
   ├─ package.json [2.21 KB]
   ├─ dist/
   │  └─ extension.js [1.51 MB]
   └─ example/
      ├─ test.piperun [0.64 KB]
      └─ .vscode/
         └─ settings.json [0.81 KB]

The file extension/dist/extension.js is large (1.51 MB)

 INFO  Publishing 'wsysuper.vscode-pipe-run-notebook v0.0.1'...
 INFO  Extension URL (might take a few minutes): https://marketplace.visualstudio.com/items?itemName=wsysuper.vscode-pipe-run-notebook
 INFO  Hub URL: https://marketplace.visualstudio.com/manage/publishers/wsysuper/extensions/vscode-pipe-run-notebook/hub
 DONE  Published wsysuper.vscode-pipe-run-notebook v0.0.1.
```

しばらくすると、通知メールも届きました。

<img src="/images/2024/20241011a/image_4.png" alt="" width="1200" height="587" loading="lazy">

[管理画面](https://marketplace.visualstudio.com/manage)でも確認できます。

<img src="/images/2024/20241011a/image_5.png" alt="" width="1200" height="278" loading="lazy">

最後に、マーケットプレイスで[Pipe Run Notebook](https://marketplace.visualstudio.com/items?itemName=wsysuper.vscode-pipe-run-notebook)を検索したら、出てきました！

まだアイコンもなくて寂しいですね。継続的にメンテナンスしていきたいと思います。

<img src="/images/2024/20241011a/image_6.png" alt="png" width="790" height="509" loading="lazy">

## まとめ

VSCode 拡張機能の開発からマーケットプレイスでリリースするまでの流れを実践しました。

初めての VSCode 拡張機能開発でしたが、スムーズな開発体験だったと思います。

ハンズオンや API のリファレンスドキュメントは英語のみで書かれていますが、だいぶ分かりやすく、支障なく進められたと思います。また、ほとんどの拡張機能は Github 上でオープンソースになっていますので、参考になれる類似のプロジェクトも簡単に手に入れます。

最後に、現時点にまだ pre-release 版ですが、ぜひ、今回公開した [Pipe Run Notebook](https://marketplace.visualstudio.com/items?itemName=wsysuper.vscode-pipe-run-notebook) を VSCode にインストールしてお試しください。追加の機能開発やバグ修正を継続的に実施するつもりです。
