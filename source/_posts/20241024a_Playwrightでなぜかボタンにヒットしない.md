---
title: "Playwrightでなぜかボタンにヒットしない"
date: 2024/10/24 00:00:00
postid: a
tag:
  - Playwright
  - E2Eテスト
  - フロントエンド
  - accessibility
category:
  - Programming
thumbnail: /images/20241024a/thumbnail.jpg
author: 澁川喜規
lede: "getByRoleでボタンがヒットしないです、という相談を受けて調べた内容のメモです。次のようなHTMLになっていました。"
---

<img src="/images/20241024a/playwright.jpg" alt="" width="200" height="200">

`getByRole()`でボタンがヒットしないです、という相談を受けて調べた内容のメモです。次のようなHTMLになっていました。

```html
<label for="my-button">ラベル</label>
<button id="my-button">
    ボタンキャプション
</button>
```

ボタンに対して、ラベルがついていない場合は、`<button>`タグの中のキャプション（ここでは「ボタンキャプション」という文字列）を指定して、`getByRole('button', {name: 'ボタンキャプション'})`でヒットするのですが、上記のようなラベルがついていると、そちらのキャプションにはヒットしなくなって、ラベルの方にのみヒットするようになります。

```ts
test('has title', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  // ヒットする
  await page.getByRole('button', {name: 'ボタンキャプション'}).click();
  // ヒットしない
  await page.getByRole('button', {name: 'ラベル'}).click();
  await expect(page.getByRole("status")).toHaveText('1')
});
```

[W3Cのアクセシビリティの実践的ガイド](https://www.w3.org/WAI/ARIA/apg/patterns/button/)のボタンのページを見ると次のように書かれています。

> The button has an accessible label. By default, the accessible name is computed from any text content inside the button element. However, it can also be provided with aria-labelledby or aria-label.
>
> 訳: ボタンはアクセス可能なラベルを持っています。デフォルトではボタン要素の中のテキストコンテンツから算出されます。しかし、aria-labelledbyやaria-labelでも提供できます。

ということで、ボタンキャプションはラベルがない場合にのみ有効なデフォルト値ということで、こちらはバグなどではなく、アクセシビリティのガイドラインに従った動きをしているということがわかります。
