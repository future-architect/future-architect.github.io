---
title: "ChatGPTでE2Eテストコード自動作成"
date: 2023/09/25 00:00:00
postid: a
tag:
  - ChatGPT
  - プロンプト
  - E2E
  - 技育CAMPアカデミア
  - Playwright
  - Cypress
  - 登壇レポート
category:
  - Programming
thumbnail: /images/20230925a/thumbnail.png
author: 澁川喜規
lede: "9/7に行われた技育CAMPアカデミアというイベントでPlaywrightについて話をしてきました。テストというと、設計手法であるところのテスト駆動開発は別としてちょっと業務っぽい感じがして学生さんにはちょっと響かないかな、というのも心配でしたが"
---

<img src="/images/20230925a/mv_logo.png" alt="" width="510" height="210">

9/7に行われた技育CAMPアカデミアというイベントでPlaywrightについて話をしてきました。テストというと、設計手法であるところのテスト駆動開発は別としてちょっと業務っぽい感じがして学生さんにはちょっと響かないかな、というのも心配でしたが、アンケートを見る限り、わかりやすかったという声も多くてほっとしました。

次のスライドが今回の資料です。スライドの内容の多くは[Playwright連載始まります](https://future-architect.github.io/articles/20230821a/)に掲載されている記事にもぼつぼつある内容も多い（APIテストはないですが）のですが、本エントリーでは発表の最後に触れたChatGPTなどの生成AIを使ったE2Eテストの生成について説明していきます。

<iframe src="https://docs.google.com/presentation/d/e/2PACX-1vTHcJ_bPEFpogd1hOy16uhOUOwEupUcKopM9kRYXFBJ4MUbfIbCmBbGsjd-_EyBkw/embed?start=false&loop=false&delayms=3000" frameborder="0" width="100%" height="569" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

ChatGPTが話題を席巻してしばらく経ちます。とはいえ、内製開発での利用以外はソースコード開発にばりばり使う、みたいな宣言はあまり聞かない気がします。利用を制限している会社も数多くあります。

* [ZDNET: 企業の75％が「ChatGPT」利用を禁止する方向--BlackBerry調査](https://japan.zdnet.com/article/35207866/)

生成AIを使うかどうか判断の分かれ目になりそうな問題としては大きく３つあるように思います。これ以外にも書かれた内容の品質担保もありますが、利用側の努力だけでは厳しい内容がこの3つかな、と。このあたり、業界団体か法律の専門家がバシッと白黒つけてくれれば利用は進みそうな気がしますが、もうちょっと待ちですかね。

* 生成した著作物の著作権
* 生成の過程で機密情報をアップロードする問題
* 生成したものが既存の著作物に似てしまって問題になる可能性

現在の著作権法では、生成AIの成果物には著作権が及ばないため、納品物として出して対価をもらうものに対して使うのは厳しいですね。自分の著作物じゃないものですからね。OSSの開発も基本的にソースコードの著作権が自分にある前提でその利用の自由を決めるものなのでOSS開発にも使えなそうです。そうなると内製開発ぐらいしか残らないのかな、と。

2つめは学習データに使うオプションのオプトアウトとかAPI利用とかでだいぶ緩和された感じがありますが、無料版のChatGPTとかBing Chatを使うと問題がありそうなので企業のガイドライン整備みたいな話でまとまりそうな気はします。

3つめに関しては、GitHubは損害が発生したら保証するというライセンスになっていますが、しかし実際に訴訟が起きてどれぐらいで保証されるのかなど、実際に裁判が起こってみないとこには、どれぐらい裁判に時間がかかるのかなどビジネスのダメージわからないことが多いですよね。

プログラム以外だと特化AIの学習素材の権利侵害とか、他者著作物をアップロードする問題とかありますがプログラムにはあまりない気がします。このあたりは素人判断は危ないので、専門家が書いてくれたブログとかが参考になります。

* [STORIA法律事務所: ブログ/人工知能（ＡＩ）、ビッグデータ法務](https://storialaw.jp/blog/category/bigdata)

そんなこんなで、生成AIの利用としては、現状は成果物を作るためのアドバイスをもらう用途が無難と言えます。そうなると、テストコードなら良さそうです。ソフトウェアの品質はテストコードに宿るのではなく、あくまでもコードに宿るものであり、テストは品質の悪化を見つけるための手段です。実際の成果物のソースコードには生成結果は含まれません。

まあテストのうち、設計ドキュメントも兼ねているようなアジャイル開発のユニットテストコードは使わない方が良いかもしれません。火事になったら製品コードではなくテストコードを持って逃げろ、というぐらいテストコードそのものが大事という文化なので。

生成されたものは自分の著作物ではないので、テストコードには「ChatGPTで生成しました」みたいな引用元を書いて引用として扱うとさらに安全なのではないかと思います。他者著作物の利用の手段として。

# PlaywrightのE2Eテストを生成してみる

本ブログでもすでにCypressの記事が何本かあったり、[Software DesignでCypress連載](https://future-architect.github.io/articles/20211218a/)をしたり、[Playwright連載](https://future-architect.github.io/articles/20230821a/)をおこなったり、E2Eテストについてはかなり触れています。

E2EテストはEnd to Endの意味です。まあAPIで提供するサービスであればEはAPIになるとは思いますが、ここでは最終的にできあがったウェブアプリケーションをブラウザで操作するテストのことをE2Eと呼んでいます。早速やってみましょう。pageオブジェクトについての文がないとテストコード形式ではないものが出てくるので追加しました。

````text
次のHTMLに対してPlaywrightでフォームを埋めて送信ボタンを押すテストコードを書いてください。pageオブジェクトはtestの第二引数から取得してください。

```
<form action="login.php" method="post">
    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>

    <label for="password">Password:</label>
    <input type="password" id="password" name="password" required>
    <input type="submit" value="Login">
</form>
```
````

このHTMLは実際の本物のフォームである必要はなく、セマンティック要素(aタグ、buttonタグ、formタグ、labelタグ、mainタグ、navタグ、articleタグ)ぐらいだけに整理して、id属性とかCSSとか全部とっぱらったシンプルなHTMLを作って入力にする方が良いでしょう。

生成されたコードは以下の通りです。

```js
const { test, expect } = require('@playwright/test');

test('フォーム送信テスト', async ({ page }) => {
  // テスト対象のURLに移動
  await page.goto('URLをここに入力');

  // フォームの入力フィールドを埋める
  await page.fill('input[name="username"]', 'ユーザー名をここに入力');
  await page.fill('input[name="password"]', 'パスワードをここに入力');

  // 送信ボタンをクリック
  await page.click('input[type="submit"]');

  // 送信後のページで特定の条件を確認する（例: ログイン成功のメッセージ）
  await expect(page).toHaveText('ログイン成功のメッセージをここに入力');
});
```

CSSセレクターを使ってしまっているのがいまいちですね。

「ブラウザを操作」といっても、ある程度HTMLを理解した上でテストコードを書く必要があります。Playwrightは標準で、``getByLabel()``とか``getByRole()``というAPIを持っています。Cypressは[@testing-library/cypress](https://testing-library.com/docs/cypress-testing-library/intro/)という追加ライブラリがあります。過去のブログで書いたように、これらを使うとHTMLのセレクターではなく、「ユーザーから見た見た目」に近いテストコードが書けるようになり、より抽象度が高くなって壊れにくくなります。

* [アクセシビリティ情報を使った壊れにくいE2Eテスト](https://future-architect.github.io/articles/20210226/)

とはいうものの、 "要素選択はCSSセレクタを使わずにgetByRole、getByLabelなどをなるべく使って書き換えてください" というのを書いても、5回に1回ぐらいしかなかなか書いてくれないですね。うまく行った時のコードはこんな感じです。

```js
const usernameInput = await page.getByLabel('Username:');
await usernameInput.fill('your_username'); // Replace with the actual username

const passwordInput = await page.getByLabel('Password:');
await passwordInput.fill('your_password'); // Replace with the actual password

// Submit the form
const submitButton = await page.getByRole('button', { name: 'Login' });
await submitButton.click()
```

ここは手修正する必要がありそうです。BardとかBing Chatを使ってもだいたい同じでしたが、Bing Chatは「getByRole、getByLabelを使って書き換えてください」というと、そこそこの打率で書き換えてくれましたが、たまに公式の1.27から提供されたAPIではなく[@testing-library/playwright](https://github.com/testing-library/playwright-testing-library)ベースのコードを出力することもありました。独創的、バランス、安定問わず。

# Cypress向けはどうか？

実はCypress向けだとばっちり決まります。

```text
次のHTMLに対してCypressでフォームを埋めて送信ボタンを押すテストコードを書いてください。testing-library/cypressを使ってください
```

```js
import '@testing-library/cypress/add-commands';

describe('Login Form', () => {
  it('should fill out the form and submit', () => {
    cy.visit('/'); // Replace with the actual URL

    cy.findByLabelText('Username:').type('your-username');
    cy.findByLabelText('Password:').type('your-password');

    cy.findByText('Login').click();

    // You can add assertions or further testing logic here
  });
});
```

いい感じですね。このまま使えそうな勢い。Cypressはずっと安定したAPIを提供し、Playwrightはアクティブに機能追加したりしている印象がありますが、これが生成AI経由に使い勝手に影響を与えるというのはなかなか興味深い結果です。

# まとめ

Playwrightの方がちょっとイマイチでしたが、将来性は感じる結果は得られました。HTMLを渡すだけでそれを操作するコードを書いてくれました。Cypressはばっちりでしたので、いっそのことPlaywrightでテストを書く場合に、Cypress向けに生成したコードを何かしらのスクリプトで書き換えて使う方が良いかもしれません。

今回はログインフォームだけですが、より複雑なフォームやメニュー選択なども作ってくれるでしょうし、入力パラメータをテーブルにしておいて、複数のケースをまとめて生成とかもやってくれそうです。「こうしたい」という自然言語で書かれた仕様書とHTMLを渡せばある程度作ってくれる見込みはありそうなので、うまく使えばテストコードを量産する手間は少し減らせそうです。

もちろん、知識ゼロでいきなりできるかというと、やはりある程度知識がある人じゃないと使いこなせない感じはありました。
