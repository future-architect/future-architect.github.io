---
title: "PlaywrightをGitHubActions実行したときの初期処理についての試行錯誤"
date: 2023/08/28 00:00:00
postid: a
tag:
  - Playwright
  - GitHubActions
category:
  - Programming
thumbnail: /images/20230828a/thumbnail.png
author: 枇榔晃裕
lede: "近年PlaywrightやCypressを用いたE2Eテスト（エンドツーエンドテスト）が行われるようになってきました。E2Eテストとはソフトウェアやシステムの全体的な動作や機能をテストする手法で..."
---

[Playwright連載](/articles/20230821a/)5日目です。

近年PlaywrightやCypressを用いたE2Eテスト（エンドツーエンドテスト）が行われるようになってきました。

E2Eテストとはソフトウェアやシステムの全体的な動作や機能をテストする手法で、ユーザーが実際に行う操作を模倣したテストを行い、アプリケーションが予想通りに機能するかどうかを確認していきます。

具体的な操作手順をテストケースとして作成し、予期される結果との整合性を確認していくわけです。バグの早期発見のためにも、E2Eテストの自動化を行い、さらにはCIに組み込み定期的に実行していきたい。そしていざ組み込んでみると、CIの実行時間が気になってきます。

テスト自体の実行時間も短縮を行っていきたいですが、テストが始まるまでのイニシャライズ、初期処理の時間もそこそこ掛かってしまうもの。

今回はどのように設定していけば処理時間が短くなるか。試行錯誤とその結果を報告したいと思います。

## 実行するテストの記述

はじめに以下のコマンドでテスト環境を作成します。

```sh
$ mkdir playwright-ci-test && cd playwright-ci-test
$ git init
$ npm init playwright@latest
Initializing project in '.'
√ Do you want to use TypeScript or JavaScript? · JavaScript
√ Where to put your end-to-end tests? · tests
√ Add a GitHub Actions workflow? (y/N) · true
√ Install Playwright browsers (can be done manually via 'npx playwright install')? (Y/n) · true
（省略）
Happy hacking! 🎭
```

続いて、共通して実行するテストを用意します。以下のようなspecファイルを用意しました。フューチャー ブログのトップページにアクセスして HTMLのタイトルが適切であるかを確認するだけの簡単なテストです。また、Playwrightでは様々なブラウザでテストが行えますが、今回はChromiumのみでのテストとします。

```ts
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://future-architect.github.io/');
  await expect(page).toHaveTitle(/フューチャー技術ブログ/);
});
```

## 試行錯誤 その1 NPM インストールでの初期設定

まずはPlaywrightのドキュメントを確認してみましょう。

[CI GitHub Actions | Playwright](https://playwright.dev/docs/ci-intro) というページにGitHub ActionsでPlaywrightを実行する際のymlファイルのサンプルが記載されています。こちらに書かれているymlファイルは `npm init playwright@latest` の実行時に `Add a GitHub Actions workflow? (y/N)` で `y` を押したときに生成されるymlファイルと同一のものになります。

作成されたymlファイルは、checkoutと依存ライブラリインストール後に、Playwrightのインストールとテスト実行、最後にテストレポートのアップロードという構成になっています。
今回は初期処理についての比較を行いたいので、テストレポートのアップロード部分を削除して、以下のようなymlファイルを配置しました。

```yaml name Playwright Tests 1
on: push
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
```

こちらをGitHub Actionsで実行してみると33秒かかりました。インストール時のGitHub Action側の混み具合やDL速度によって時間は上下するかと思いますので、実行時間に関してはあくまで目安としてご覧ください。

<img src="/images/20230828a/image.png" alt="image.png" width="654" height="457" loading="lazy">

今回の場合テストしか入っていないレポジトリなので、`npm ci` (Install dependencies) の時間が最小限に収まっています。例えば、フロントエンドのレポジトリにE2Eテストを相乗りさせている場合には依存ライブラリのインストール時間が余計にかかってしまいます。

## 試行錯誤 その2 サブディレクトリでのインストール

相乗りさせたレポジトリの場合に依存ライブラリのインストール時間が余計に掛かってしまうので、サブディレクトリにPlaywrightのもろもろを配置する場合は以下のようなymlファイルを用意することになります。

```yaml # .github\workflows\playwright-2.yml
name: Playwright Tests 2
on: push
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm --prefix ./playwright ci
    - name: Install Playwright Browsers
      run: (cd playwright && npx playwright install --with-deps && cd -)
    - name: Run Playwright tests
      run: (cd playwright && npx playwright test && cd -)
```

そして、レポジトリに`playwright`というディレクトリを作成し、その中で`npm init playwright@latest`を実行。その1と同様にspecファイルを配置しました。

こちらをGitHub Actionsで実行してみると29秒かかりました。

<img src="/images/20230828a/image_2.png" alt="" width="658" height="462" loading="lazy">

こちらも実行時間はその1とほぼ同程度。Playwightでのテストレポジトリであればその1の構成、そうでない場合は、依存ライブラリのインストール時間を削減するためにもその2の構成が良いのではと考えています。

## 試行錯誤 その3 playwright-github-actionを使う

こちらの方法は非推奨です。

以前は `microsoft/playwright-github-action` というPlaywright用のGitHub Actionが用意されていました。

[microsoft/playwright-github-action: Run Playwright tests on GitHub Actions](https://github.com/microsoft/playwright-github-action)

現在もレポジトリは残っていますが、READMEに「❌ You don't need this GitHub Action」と非推奨である旨が大きく書かれています。

非推奨である理由として、どのバージョンのPlaywrightが実行されているかわからないから、と書かれています。おそらくサポート上の問題があったのでしょう。

こちらの`microsoft/playwright-github-action`を動かそうとすると以下のようなymlファイルになるかと思います。

```yaml
# .github\workflows\playwright-3.yml
name: Playwright Tests 3
on: push
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - uses: microsoft/playwright-github-action@v1
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium
    - name: Run Playwright tests
      run: npx playwright test
```

Playwrightのインストール部分(`npx playwright install --with-deps chromium`)は本来不要であったと思いますが、レポジトリが半年以上更新されていないため、インストールをせず実行すると `npx playwright test` のタイミングで以下のエラーが出て止まってしまいます。

```sh
    Error: browserType.launch: Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium-1071/chrome-linux/chrome
    ╔═════════════════════════════════════════════════════════════════════════╗
    ║ Looks like Playwright Test or Playwright was just installed or updated. ║
    ║ Please run the following command to download new browsers:              ║
    ║                                                                         ║
    ║     npx playwright install                                              ║
    ║                                                                         ║
    ║ <3 Playwright Team                                                      ║
    ╚═════════════════════════════════════════════════════════════════════════╝
```

最新版となるようインストールを行い、GitHub Actionsで実行してみると76秒かかりました。

<img src="/images/20230828a/image_3.png" alt="" width="657" height="504" loading="lazy">

`microsoft/playwright-github-action` と `npx playwright install` で二度手間となり長くなった、と考えることもできますが、`microsoft/playwright-github-action` 単体でもほどほどに掛かっています。

このGitHub Actionの活用を考えるよりは、現在推奨されている方法での実行を検討した方がよいでしょう。

## 試行錯誤 その4 コンテナでの環境構築

これまではnpmを用いて実行環境を作ってきましたが、GitHub Actionsではコンテナイメージを読みこんでその中で実行することもできます。

今回はplaywrightの用意している `mcr.microsoft.com/playwright` のコンテナを利用し、以下のようなymlファイルを配置しました。

```yaml
# .github\workflows\playwright-4.yml
name: Playwright Tests 4
on: push
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.36.1-jammy
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium
    - name: Run your tests
      run: npx playwright test
```

こちらをGitHub Actionsで実行してみると54秒かかりました。

<img src="/images/20230828a/image_4.png" alt="" width="656" height="540" loading="lazy">

その1・その2と比較すると、`Install Playwright Browsers` の実行時間が大幅に短縮されています。

実行ログを確認してみると、コンテナ内にPlaywrightがすでに含まれているためアップデートの確認処理のみで終えられていることがわかります。

```sh
Run npx playwright install --with-deps chromium
  npx playwright install --with-deps chromium
  shell: sh -e {0}
Installing dependencies...
（省略）
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
```

しかしながら `Initialize container` で34秒掛かっており、他の方法と比べて大きく優位かとも言えないといったところ。

コンテナでの環境構築のメリットとしては、Playwightの実行時に大量のプラグインを必要とする場合や複数ブラウザでのテストを並列にせず実行する場合などが考えられます。つまり、依存ライブラリのインストールに時間がとても掛かってしまう場合ですね。

逆にデメリットとしては、コンテナ初期化の時間がかかってしまうこと。そして、Playwightのアップデートやコンテナのアップデートに追従してymlファイルの更新を掛けていかなければいけないことでしょうか。

一般的な環境には向かないとは思いますが、もしかするとコンテナ構築が銀の弾丸となるプロジェクトもあるのかもしれません。

## まとめ

PlaywrightをCIで実行する際にどのようなymlファイルを書けばGitHub Actionsでの初期処理にかかる時間を短くできるかを試行錯誤しました。

結果的には、Playwright専用のレポジトリを作る、もしくはサブディレクトリの中で環境を構築。そのあとはnpmでの環境構築を行うのが良さそうだ、という結果になりました。

何かしらの参考になれば幸いです。
