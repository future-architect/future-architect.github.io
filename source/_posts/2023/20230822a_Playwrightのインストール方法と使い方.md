---
title: "Playwrightのインストール方法と使い方"
date: 2023/08/22 00:00:00
postid: a
tag:
  - Playwright
  - 環境構築
category:
  - Programming
thumbnail: /images/20230822a/thumbnail.png
author: 藤戸四恩
lede: "Playwrightは、Microsoftが開発したE2Eテストフレームワークです。Cypressと同様に、Chromium、Firefox、Safariなどのブラウザ上でE2Eテストの実行を自動化できます。 "
---

# はじめに

藤戸四恩です。[Playwright連載](/articles/20230821a/)の1本目は環境構築について説明します。

## Playwrightとは

Playwrightは、Microsoftが開発したE2Eテストフレームワークです。Cypressと同様に、Chromium、Firefox、Safariなどのブラウザ上でE2Eテストの実行を自動化できます。

## Playwrightのインストール

Playwrightをインストールするには、npm yarn pnpmのいずれを使用してインストールすることができます。

今回は、npmを使用します。

Playwrightによるテストを構築したいディレクトリ下で、以下のコマンドを実行します。

```sh
$ npm init playwright@latest
```

実行すると初期化に伴うオプションの変更をあれこれ聞かれます。 特にこだわりがなければそのままEnterを押していってください。空白で送信した場合はデフォルト値で設定されます。

```sh
$ npm init playwright@latest

Need to install the following packages:
  create-playwright@1.17.128
Ok to proceed? (y)

...略...

✔ Success! Created a Playwright Test project at /Users/shion/dev/playwright

Inside that directory, you can run several commands:

  npx playwright test
    Runs the end-to-end tests.

  npx playwright test --ui
    Starts the interactive UI mode.

  npx playwright test --project=chromium
    Runs the tests only on Desktop Chrome.

  npx playwright test example
    Runs the tests in a specific file.

  npx playwright test --debug
    Runs the tests in debug mode.

  npx playwright codegen
    Auto generate tests with Codegen.

We suggest that you begin by typing:

    npx playwright test

And check out the following files:
  - ./tests/example.spec.ts - Example end-to-end test
  - ./tests-examples/demo-todo-app.spec.ts - Demo Todo App end-to-end tests
  - ./playwright.config.ts - Playwright Test configuration

Visit https://playwright.dev/docs/intro for more information. ✨

Happy hacking! 🎭
```

Happy hacking!と表示されたらインストール成功です。

## Playwrightの基本的な使い方

```ts
test('テストケース名', async ({ page }) => {
  // 処理内容
});
```

test関数にテストケースを記載を行っていきます。test関数の第1引数には、テストケース名、第2引数にはテスト関数を書きます。

ここでは、よく使う基本的なコマンドをいくつか紹介します。

### Webサイトを訪れる

```ts test1.spec.ts
import { test, expect, type Page } from '@playwright/test';

test('webサイトを訪れる', async ({ page }) => {
  await page.goto('https://playwright.dev/');
});
```

`page.goto`関数内で指定したURLへ遷移します。

### 要素の取得

要素を取得する際は、コードジェネレータを使って要素名を取得するのが便利です。

下記のコマンドを実行します。

```sh
npx playwright codegen https://playwright.dev/
```

実行すると下図のように playwright.devが立ち上がります。

<img src="/images/20230822a/画像2.png" alt="" width="1200" height="750" loading="lazy">

今回はgithubのアイコンをカーソルを当てると`getByLabel('GitHub repository')`と表示されます。

```ts
await page.getByLabel('GitHub repository')
```

getByLabel以外にも要素を取得する方法はあります。

* [公式ドキュメント_locators](https://playwright.dev/docs/locators)

### 要素を操作

GitHubアイコンの要素を取得できたので、クリックをしたいと思います。

クリックは `locator.click()`です。

※locatorとは、ページ上の要素をいつでも見つけるための方法で先ほどのgetByLabel()などがあてはまります。

```ts
await page.getByLabel('GitHub repository').click();
```

また、画面遷移との実装を合わせると下記のようになります。

```ts test1.spec.ts
import { test, expect, type Page } from '@playwright/test';

test('Githubアイコンをクリック', async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Click the get started link.
    await page.getByLabel('GitHub repository').click();
}
```

## チェックする

GitHubのアイコンをクリックした際に遷移先のURLに`playwright`が含まれることをテストします。

アサーションにもいくつかの種類があります。

* [公式ドキュメント_assertions](https://playwright.dev/docs/test-assertions)

今回はURLに`playwright`が含まれているのかを確認するため`toHaveURL()`を使用します。

```ts
await expect(page).toHaveURL(/.*playwright/);
```

これまでの実装と合わせると下記のようになります。

```ts test1.spec.ts
import { test, expect, type Page } from '@playwright/test';

test('githubアイコンの遷移先URLにplaywrightが含まれる', async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Click the get started link.
    await page.getByLabel('GitHub repository').click();

    // Expects the URL to contain intro.
    await expect(page).toHaveURL(/.*playwright/);
  });
```

## テストの実行

全てのテストを実行するには以下のコマンドを実行します。

```sh
$ npx playwright test

Running 9 tests using 4 workers
  9 passed (15.1s)

To open last HTML report run:

  npx playwright show-report
```

用意された9件のテストすべてに成功（passed）したことが表示されました。

### テストファイルの指定

ファイル名(今回はtest1.spec.ts)を指定して実行するには以下のコマンドを実行します。

```sh
$ npx playwright test tests/test1.spec.ts

Running 3 tests using 3 workers
  3 passed (4.3s)

To open last HTML report run:

  npx playwright show-report
```

作成した3件のテストすべてに成功（passed）したことが表示されました。

## テストレポートの出力

Playwrightでは実行結果をHTMLのレポートとして表示することができます。

表示するには以下のコマンドを実行します。

```sh
npx playwright show-report
```

実行するとブラウザ上で下図のように表示されます。

<img src="/images/20230822a/画像1.png" alt="" width="1060" height="346" loading="lazy">

## 終わりに

Playwrightのインストール方法と基本的な使い方を紹介しました。

明日は、武田さんの[Playwrightの環境構築（VSCode Dev Container編）](/articles/20230823a/)です。
