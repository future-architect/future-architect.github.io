---
title: "Vue CLIのデフォルト設定からESLintのベストプラクティスを検討する"
date: 2021/06/16 00:00:00
postid: a
tag:
  - Vue.js
  - Node.js
  - ESLint
  - EditorConfig
category:
  - Frontend
thumbnail: /images/2021/20210616a/thumbnail.png
author: 伊藤真彦
lede: "TIGの伊藤真彦です。この記事はフロントエンド連載の3記事目です。今回は愛用しているVue CLIを利用して、フロントエンドアプリケーションの詳細な設定について調査してみました。"
---
TIGの伊藤真彦です。

この記事は[フロントエンド連載](/articles/20210614a/)の3記事目です。

今回は愛用しているVue CLIを利用して、フロントエンドアプリケーションの詳細な設定について調査してみました。

<img src="/images/2021/20210616a/image.png" alt="Vue.jsアイコン" width="400" height="400" loading="lazy">

# はじめに

プログラムを実装する上で、コードの書き方は絶対的な正解のないトピックとして存在します。

例えば、コードのインデントはタブなのか、半角スペースなのか、文字列リテラルを囲う記号は""なのか''なのか、といった細かいルールです。これらのルールは、究極的には好みの問題で、正解のあるものではありません。

正解がない以上、コードを実装する際にどのようなフォーマットが正しいかを判断することは難しいです。言語によってはコード規約をプロジェクト、チーム、または会社単位で明記、時には社外に公開する事でこれらルールの混乱を防ぐ試みも存在します。

ちなみにフューチャーでは[JavaとSQLのコード規約](https://future-architect.github.io/coding-standards/)を公開しています。

しかし、コード規約を明示しても、その全てを把握してルールを守ってコードを書くこと、ルールが守られている事を人が判断することは難しいです。そこで、Linterを採用することでコードの一貫性を自動で維持することが可能になります。

(上記のJavaコード規約の著者である[Otaさん](https://github.com/ota-meshi)は奇しくも[eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue)のメインコミッターです、凄い。

憧れのあの人と一緒に働いてみたい、そんな転職の応募はいつでもお待ちしていますよ...!)

# Linterとは

Linterとは、ソースコードを静的解析し、問題点を指摘、または自動でフォーマットするツールのことです。各種言語、プラットフォームで公式、ないしサードパーティー製のLinterが存在します。

開発を行う上で、敢えてLinterを利用しない選択をする事は少ないのではないでしょうか。

Vue.js、Reactなど、Node.jsを用いたアプリケーションの開発では、[ESLint](https://eslint.org/)が利用できます。

# Linterの設定

Linterを導入すると、ルールに違反しているコードを検知することが可能になります。

前述の通り、プログラムの書き方には絶対的な正解を決めることのできないルールが存在する為、設定をカスタマイズする事が可能になっています。ちなみにGoの場合は[gofmt](https://golang.org/cmd/gofmt/)がデフォルトで利用できる機能として存在します、設定が存在しないシンプルなツールであるため迷う事はありません。

より細かく、厳しく規約を設定したい場合は[staticcheck](https://staticcheck.io/)などを導入する事も可能ですが、言語仕様レベルで素朴でシンプルである事を目指すカルチャーがある故の特徴ですね、個人的には好きです。

絶対的な良し悪しとして比較はできませんが、ESLintは基本的な仕組みとしては別途インストールして、設定ファイルを用意する必要があります。

それら設定の煩雑さを解消するために、ESLintはフレームワークやツールの初期設定でビルトインする事が可能だったり、デフォルト設定がインストール可能なnpmモジュールとして公開されていたりします。

本記事ではVue.jsのアプリケーションを高速で開発できる[Vue CLI](https://cli.vuejs.org/)が生成するデフォルト状態を比較する事で、詳細なLinterの設定がどのように行われているのかを比較検証してみます。

# Vue CLIとは

連載初日の記事[Jest + TypeScript + Vue 3環境で Vue Testing Library(@testing-library／vue) を動かす](https://future-architect.github.io/articles/20210614b/)でも紹介がありましたね。

[Vue CLI](https://cli.vuejs.org/)とは`Vue.js`のアプリケーションを開発するためのツールです。インストールすることで、アプリケーションの骨組みを自動生成したり、プラグインを追加、削除できるようになります。

このツールを利用することで、`Vue CLI`のインストールからアプリケーションの生成、起動までを僅かなコマンドを入力するだけで行えます。

```bash
npm install -g @vue/cli
vue create my-project
cd my-project
npm run serve
```

最近バンドルに依存しない軽量なビルドツールとして[Vite](https://vitejs.dev/guide/)が台頭するなど動きがありましたが、私はまだまだVue CLIを愛用しています。

# Vue CLIのアプリケーション生成結果を、Linterの設定別に比較してみた

前置きが長くなりましたが、Vue CLIでアプリケーションを自動生成する際に、詳細な設定を対話的に選択する事が可能です。

下記画像は`vue create {app-name}`コマンドを実行した際に表示される選択肢です。

<img src="/images/2021/20210616a/image_2.png" alt="vue create {app-name}コマンドを実行した際に表示される選択肢" width="588" height="523" loading="lazy">

その際、Vue.jsのバージョンの他、Linter/Formatterの有無等の詳細な設定を選択する事が可能です。

今回は、TypeScriptを利用した状態で、Linter/Formatterを利用しない設定と、利用した状態の差分を比較する事で、Linterを有効にするにあたって必要な、また推奨される設定、準備を確認します。

<img src="/images/2021/20210616a/image_3.png" alt="Linter設定" width="642" height="529" loading="lazy">

## ESLint with errpr prevention only

<img src="/images/2021/20210616a/image_4.png" alt="VueCLIではESLint設定" width="1200" height="506" loading="lazy">

VueCLIではESLintを最低限有効に設定した状態を設定できます。

速度優先でラフに書きたい時や、ここから詳細に好みの設定を作っていきたい時は有効です。

Linter/Formatter無しの状態とpackage.jsonを比較してみます。

<img src="/images/2021/20210616a/image_5.png" alt="package.jsonの比較" width="709" height="844" loading="lazy">

`scripts`の設定にに`lint`コマンドが追加されています。

これにより`npm run lint`コマンドでLinterの指摘事項を確認できます。
`npm run lint --fix`コマンドで、ある程度自動フォーマットすることも可能です。

またeslintの各種プラグインがインストールされています。

生成したフロントエンドのプロジェクト直下に`.eslintrc.js`が追記されます。

```js
module.exports = {
  root: true,
  env: {
    node: true
  },
  'extends': [
    'plugin:vue/essential',
    'eslint:recommended',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
}
```

このファイルによって、ESLintの設定が記述されています。

## ESLint + Prettier

<img src="/images/2021/20210616a/image_6.png" alt="" width="" height="" loading="lazy">

ESLintに加え、[Prettier](https://prettier.io/)も有効にした状態を確認してみます。

[Prettier](https://prettier.io/)とは、HTMLやVue.js等各種ファイル、フレームワークの記法に対応したフォーマットルールが適用可能なプラグインです。

ESLintは、Prettierと比較するとJavaScriptの言語としてのコーディングのみにフォーカスしたLinterであると言えます。  Prettierも有効にすることで、HTMLテンプレート部分のコードなどもフォーマット可能になります。

このオプションを有効にすると、package.jsonにPrettierも追加されている事が確認できます。

<img src="/images/2021/20210616a/image_7.png" alt="" width="" height="" loading="lazy">

`.eslintrc.js`にもPrettier向けの設定が追記されています。

```js
module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    "plugin:vue/essential",
    "eslint:recommended",
    "@vue/typescript/recommended",
    "@vue/prettier",
    "@vue/prettier/@typescript-eslint",
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
  },
};
```

このオプションを有効にすると、Vue.jsのHTMLテンプレート部分も成形されている事が確認できます。

<img src="/images/2021/20210616a/image_8.png" alt="Vue.jsのHTMLテンプレート生成" width="1200" height="399" loading="lazy">

デフォルトの設定では1行に収めることができる文字数が80文字であるため、個人的には若干過剰に改行される傾向があるなと感じます。

## ESLint + Airbnb config

<img src="/images/2021/20210616a/image_9.png" alt="Airbnb Config" width="1200" height="399" loading="lazy">

Airbnb Configも見てみます、バケーションレンタルで有名なあの[Airbnb](https://www.airbnb.jp/)ですね。

Airbnbは[Javascriptのコーディング規約](https://github.com/airbnb/javascript)もホストしています。

Airbnbのテック企業としての立ち位置について私は詳しくないのですが、メインコミッターの一人である[Jordan Harband氏](https://github.com/ljharb)はTwitter社にも在籍経験があり、[ECMAScriptへのコントリビュート](https://tc39.es/)において、[ECMAScriptのwikipedia](https://ja.wikipedia.org/wiki/ECMAScript)に名を残す程の実力者のようです。

[The ReadME Project](https://github.com/readme/jordan-harband)のインタビューでも存在を確認でき、結婚式や子供が生まれた日にすらOSSコントリビュートを行ったという超人的な活躍ぶりが書かれています、輝いていますね。

そんなAirbnbスタイルがVue CLIの公式オプションとして選択できるようになっているわけですが、ひとまず`package.json`の差分を見てみましょう。

<img src="/images/2021/20210616a/image_10.png" alt="" width="" height="" loading="lazy">

`eslint-config-airbnb`がインポートされています。

`.eslintrc.js`は下記の内容です。

```js
module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb',
    '@vue/typescript/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
};
```

Airbnb configでは、上記の差分に加え、`.editorconfig`というファイルが生成されます。
他の方法でも設定可能なオプション項目も含まれていますが、ここでインデントのスタイルや一行の長さの限界などが設定できます。

```ini
[*.{js,jsx,ts,tsx,vue}]
indent_style = space
indent_size = 2
end_of_line = lf
trim_trailing_whitespace = true
insert_final_newline = true
max_line_length = 100
```

このオプションではPrettierがインストールされないため、Vue.jsコンポーネントのHTML部分のインデントを崩したりしてもフォーマットされませんでした。

eslintそのもののオプションは`eslint:recommended`と比較すると厳しめです。

# 既存のプロジェクトにESLint、Prettierを追加する

上記の設定変更で確認できた差分は、Vue CLIでアプリケーションを作り直さなくても追加可能です。
またESLint、PrettierはVue.js以外のフレームワークを利用したプロジェクトでも利用可能です。

`Vue CLI`で作成したアプリケーションの場合は`vue add`コマンドを利用できます。

```bash
vue add @vue/cli-plugin-eslint
```

`package.json`へのlintコマンドの追加など、詳細な変更漏れが無いよう気を付ける必要がありますが、各パッケージを個別にインストールし、手動で`.eslintrc.js`等を追加することで同様の状態を再現できます。

```bash
cd {app-name}
npm install eslint
npm install eslint-plugin-vue
npm install @vue/cli-plugin-eslint
npm install @vue/eslint-config-typescript
npm install @typescript-eslint/parser
npm install @typescript-eslint/eslint-plugin
```

ちなみにESLintとPrettierを組み合わせる手法は、2020年に[公式での推奨方法](https://prettier.io/docs/en/integrating-with-linters.html)に変更がありました。
古くなってしまった情報が検索結果に出てくる可能性がありますのでお気を付けください。
具体的には[eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)が非推奨となっています。

# 個人的なお勧め

HTML、CSSの細かいインデント修正等はツールが行ってくれるに越したことはないので、`ESLint + Prettier`を軸に、`.editorconfig`を適宜追加して好みの状態に持っていくのが良いかなと個人的には考えています。

`.editorconfig`ではなく`.prettierrc`を設置する事でもPrettierの設定は可能です。

`.prettierrc`で設定できる項目とデフォルト値は下記の通りです。

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "none",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "arrowParens": "avoid",
  "rangeStart": 0,
  "rangeEnd": Infinity,
  "parser": "none",
  "filepath": "none",
  "requirePragma": false,
  "insertPragma": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "vueIndentScriptAndStyle": false,
  "endOfLine": "auto",
  "embeddedLanguageFormatting": "auto"
}
```

前述しましたが、個人的には`printWidth`(1行に書くことができる文字数)は150文字くらいあっても良いかなと感じます。

# まとめ

JavaScript、TypeScriptはESLintでフォーマットできる。HTML、CSSはPrettierでフォーマットできる。

Vue CLIであれば適宜推奨設定をインストールしつつアプリケーションを構築できる。

手動で行う場合は各種ライブラリをnpm installし、`.eslintrc.js`等設定ファイルを設置することでLinterを設定できる。

この手の作業はアプリケーションがある程度出来上がってから行うと、自動修正できない大量の警告に苦しむ可能性があります。

構築の初期段階にしっかり行っておきたいですね。
