---
title: "Jest + TypeScript + Vue 3環境で Vue Testing Library(@testing-library／vue) を動かす"
date: 2021/06/14 00:00:01
postid: b
tag:
  - Vue.js
  - テスト
  - フロントエンド
category:
  - Programming
thumbnail: /images/20210614b/thumbnail.png
author: 中川旭
lede: "フロントエンド記事連載の1記事目です。Vue Testing LibraryはVue.js公式のライブラリであるvue-test-utilをベースとする、DOM Testing LibraryのVue.js用拡張です。Vue Testing Libraryを用いると、Vue.js公式ライブラリであるvue-test-utilと比較して内部構造を意識せずにテストを作成できます。"
---

[フロントエンド連載](/articles/20210614a/)の1記事目です。

TIG DXユニットの中川旭です。新卒で2020年10月に入社しました。初記事です。

作業が詰まったときや実際に作業するのが面倒なときのために、この記事を最後まで作業をした後のコードを下のリポジトリに置きます。

* https://github.com/modockey/Init-VueTestingLibrary


## Vue Testing Libraryのいいところ
Vue Testing LibraryはVue.js公式のライブラリであるvue-test-utilをベースとする、DOM Testing LibraryのVue.js用拡張です。

Vue Testing Libraryを用いると、Vue.js公式ライブラリであるvue-test-utilと比較して内部構造を意識せずにテストを作成できます。

この記事では環境構築までとし、詳細な機能や具体的なメリットやテストの書き方の紹介はまたの機会に。

## Vue.jsプロジェクトの開始 ~ JestでTypeScript部分のテストを動かすまで

### 使用するものの紹介

- [Vue CLI](https://cli.vuejs.org/)
- [Jest](https://jestjs.io/ja/docs/getting-started)

### 前提
Windows上で Node.js v14.17.0 (npm v6.14.13) を使用しています。

この環境の準備に関しては、Microsoftのページにとても丁寧な説明があります。

* [Windows での NodeJS のインストール](https://docs.microsoft.com/ja-jp/windows/dev-environment/javascript/nodejs-on-windows)

### Vue CLI のインストール

Vue.js開発ツールとして、Vue CLIが提供されています。まずはこれをインストールします。

```bash
npm install -g @vue/cli
```

### Vueプロジェクトの作成
適当な場所で"sample"という名前のVueプロジェクトを作成します。

```bash
cd ~
vue create sample
```

以下のような画面から基本設定をすることができます。今回はせっかくなので"Manually select features"を選択してみます。

```log
Vue CLI v4.5.13
? Please pick a preset: (Use arrow keys)
  Default ([Vue 2] babel, eslint)
  Default (Vue 3) ([Vue 3] babel, eslint)
❯  Manually select features
```

するとさらに詳細な設定画面が表示されます。
今回は下のように、`Babel` `TypeScript` を選択します。

```log
Vue CLI v4.5.13
? Please pick a preset: Manually select features
? Check the features needed for your project:
 (*) Choose Vue version
 (*) Babel
>(*) TypeScript
 ( ) Progressive Web App (PWA) Support
 ( ) Router
 ( ) Vuex
 ( ) CSS Pre-processors
 ( ) Linter / Formatter
 ( ) Unit Testing
 ( ) E2E Testing
```

Enterキーを押すとVue.jsのバージョン選択画面に。今回は3.xを選択します。

```log
Vue CLI v4.5.13
? Please pick a preset: Manually select features
? Check the features needed for your project: Choose Vue version, Babel, TS, Linter, Unit, E2E
? Choose a version of Vue.js that you want to start the project with (Use arrow keys)
 2.x
❯  3.x
```


その後、いくつか設定ありますが、好みで設定しましょう。("?"のあとが今回選択したものです)

```log
Vue CLI v4.5.13
? Please pick a preset: Manually select features
? Check the features needed for your project: Choose Vue version, Babel, TS, Linter
? Choose a version of Vue.js that you want to start the project with 3.x
? Use class-style component syntax? No
? Use Babel alongside TypeScript (required for modern mode, auto-detected polyfills, transpiling JSX)? No
? Where do you prefer placing config for Babel, ESLint, etc.? In dedicated config files
? Save this as a preset for future projects? (y/N) No
```

このあとEnterキーを押し、しばらくするとこのように表示されます。この指示に従いコマンドを実行すると、無事にサーバーが立って、ブラウザからVue.jsのサンプルページを開くことができます。

```log
🎉  Successfully created project sample.
👉  Get started with the following commands:

 $ cd sample
 $ npm run serve
```

```log
 DONE  Compiled successfully in 3230ms                                                                                                                                                                                               23:54:10

  App running at:
  - Local:   http://localhost:8080/
  - Network: http://192.168.1.10:8080/

  Note that the development build is not optimized.
  To create a production build, run npm run build.

Issues checking in progress...
No issues found.
```

ブラウザで `http://localhost:8080/` を開くと以下のページが表示されます。

<img src="/images/20210614b/image.png" alt="Vue起動画面" height="1200" width="993" loading="lazy">

### Jestの単体テストを動かす

まずはJest関連のパッケージをインストールしましょう。

```bash
cd ~/sample
npm install --save-dev jest ts-jest @types/jest
```

#### jest.config.js配置
[Jest](https://typescript-jp.gitbook.io/deep-dive/intro-1/jest)のページにあるテンプレートをコピーしてプロジェクトルートに配置します。

```js jest.config.js
module.exports = {
  "roots": [
    "<rootDir>/src"
  ],
  "testMatch": [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}
```

#### tsconfig.json に"jest"を追記

"compilerOptions"->"types"に`jest`を追加します。

```json tsconfig.json
"types": ["webpack-env", "jest"],
```

#### テスト用ファイル配置
```ts src/service/calc.ts
export function plus(a: number, b: number): number {
  return a + b;
}
```

```ts src/service/__tests__/calc.test.ts
import { plus } from "../calc";

describe("plus test", () => {
  test("1 + 1", () => {
    expect(plus(1, 1)).toEqual(2);
  });
});

```

#### npm script追記

テスト用にnpm scriptを追記します。
package.jsonの"scripts"に`"test": "jest"`を追加しました。これで`npm run test`でテストを起動できます。

```json package.json
"scripts": {
  "serve": "vue-cli-service serve",
  "build": "vue-cli-service build",
  "lint": "vue-cli-service lint",
  "test": "jest"
},
```

#### 単体テスト実行
テストを実行してみましょう。

```bash
npm run test
```

以下のようにテスト結果が表示されます。テスト成功です！
<img src="/images/20210614b/image_2.png" alt="テスト成功ログ" width="722" height="316" loading="lazy">


## Vue Testing Libraryを動かす
[公式ページ](https://testing-library.com/docs/vue-testing-library/examples)にある例を使用します。
今回は上のページの例をここまでの設定で生成されたスタイルに合わせて少し改変して使用します。

#### テスト用パッケージのインストール

vue-jestと記事の主役である`@testing-library/vue@next`をインストールします。

`@testing-library/vue@next`がVue 3用のパッケージです。`@testing-library/vue`はVue 3では動作しません。

`@testing-library/vue`で動かそうとするとvue-template-compilerのバージョンが合わない、とエラーが出ます。Vue 3 では同機能は`@vue/compiler-sfc`に移行しているようです。

```bash
cd ~/sample
npm install --save-dev vue-jest@next
npm install --save-dev @testing-library/vue@next
```


#### テスト用コンポーネント&テストコード配置

```html src/components/Counter.vue
<template>
  <div>
    <p>Times clicked: {{ count }}</p>
    <button @click="increment">increment</button>
  </div>
</template>

<script>
import { defineComponent } from "vue";
export default defineComponent({
  name: "Counter",
  data: () => ({
    count: 0,
  }),

  methods: {
    increment() {
      this.count++;
    },
  },
});
</script>
```

```ts src/tests/counter.test.ts
import { render, fireEvent } from "@testing-library/vue";
import Counter from "../components/Counter.vue";

test("increments value on click", async () => {
  // The render method returns a collection of utilities to query your component.
  const { getByText } = render(Counter);

  // getByText returns the first matching node for the provided text, and
  // throws an error if no elements match or if more than one match is found.
  getByText("Times clicked: 0");

  const button = getByText("increment");

  // Dispatch a native click event to our button element.
  await fireEvent.click(button);
  await fireEvent.click(button);

  getByText("Times clicked: 2");
});
```

#### jest.config.js の"transform"に追記

"transform"には以下のように、vueファイルに対してvue-jestを使うよう指示します。

```js jest.config.js
"transform": {
  "^.+\\.(ts|tsx)$": "ts-jest",
  "^.+\\.vue$": "vue-jest"
},
```

#### jestのバージョンに気を付けよう
ここまでの設定を追えて`npm run test`を実行すると、以下のようにエラーが発生します。

```log
 FAIL  src/tests/counter.test.ts
  ● Test suite failed to run

    TypeError: Cannot destructure property 'config' of 'undefined' as it is undefined.

      at Object.getCacheKey (node_modules/vue-jest/lib/index.js:10:7)
      at ScriptTransformer._getCacheKey (node_modules/@jest/transform/build/ScriptTransformer.js:280:41)
      at ScriptTransformer._getFileCachePath (node_modules/@jest/transform/build/ScriptTransformer.js:351:27)
      at ScriptTransformer.transformSource (node_modules/@jest/transform/build/ScriptTransformer.js:588:32)
      at ScriptTransformer._transformAndBuildScript (node_modules/@jest/transform/build/ScriptTransformer.js:758:40)
      at ScriptTransformer.transform (node_modules/@jest/transform/build/ScriptTransformer.js:815:19)
```

https://github.com/kulshekhar/ts-jest/issues/2612 のように、
jest, ts-jestの27系でバグがあるようです。jestとts-jestは26系にします。

```bash
npm install --save-dev jest@26 ts-jest@26
```

#### babalの設定をする
これでもまだ`npm run test`を実行すると、以下のようにエラーが発生します。

```log
 ● Test suite failed to run

    Jest encountered an unexpected token

    This usually means that you are trying to import a file which Jest cannot parse, e.g. it's not plain JavaScript.

    By default, if Jest sees a Babel config, it will use that to transform your files, ignoring "node_modules".

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/en/ecmascript-modules for how to enable it.
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/en/configuration.html

    Details:

    C:\Users\{UserName}\sample\src\components\Counter.vue:1
    ({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,global,jest){import { defineComponent } from "vue";
                                                                                             ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      1 | import { render, fireEvent } from "@testing-library/vue";
    > 2 | import Counter from "../components/Counter.vue";
        | ^
      3 |
      4 | test("increments value on click", async () => {
      5 |   // The render method returns a collection of utilities to query your component.

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1350:14)
      at Object.<anonymous> (src/tests/counter.test.ts:2:1)
```

babelの設定が足りないようです。
今回は環境に合わせた設定をしてくれる[@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env)を使用します。

```bash
npm install --save-dev @babel/preset-env
```

```js babel.config.js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
  ],
};

```

### テスト実行
`npm run test`を実行します。

<img src="/images/20210614b/image_3.png" alt="Vue Testing Libraryのテスト実行結果で成功した様子" width="699" height="285" loading="lazy">

やっと動きました！

## まとめ

改めて書くと当然のことばかりですが、この記事の要点は以下の3点です。

- パッケージを使うときは、Vue 3に対応しているか確認する
- ts.config.js, jest.config.js にコンパイラ設定をちゃんと書く
- 通常の手順に沿ってもエラーが出る場合、パッケージのバージョンを確認して調べる

## さいごに

この記事の存在で環境構築でハマる人が一人でも減れば幸いです。
今回は環境構築だけの内容になってしまいましたが、冒頭にも書いた通りVue Testing Libraryの詳細な記事を今後書きます。お楽しみに。

これまでWeb記事を書いたことがなかったので、自分にとってはフューチャー技術ブログのみならず人生初となる記事でした。
記事を書くことで自分が理解している領域と理解していない領域の境界が明確になることと、記事を書くために調べることで理解している領域が少しだけ広がることを感じました。

新卒研修後すぐの2021年1月から技術ブログ運営をしている真野さん([記事](/authors/%E7%9C%9F%E9%87%8E%E9%9A%BC%E8%A8%98/))のいるプロジェクトにアサインされ、さらにフューチャー技術ブログのエースである澁川さん([記事](/authors/%E6%BE%81%E5%B7%9D%E5%96%9C%E8%A6%8F))にOJTを見て頂くという恵まれた環境に置かれたことへの感謝を今後の自身の成長と記事の執筆につなげていきたいと思います。

