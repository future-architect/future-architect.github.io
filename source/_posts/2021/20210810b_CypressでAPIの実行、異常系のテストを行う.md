---
title: "CypressでAPIの実行、異常系のテストを行う"
date: 2021/08/10 00:00:01
postid: b
tag:
  - Cypress
  - Node.js
  - E2Eテスト
category:
  - Programming
thumbnail: /images/20210810b/thumbnail.jpg
author: 伊藤真彦
lede: "フューチャー技術ブログでも何度か取り上げているCypressですが、私も最近触り始めました。今回取り上げたいテーマは、フロントエンドアプリケーションで、特定の画面に表示する情報をサーバーから取得する機能や、ボタンを押すとバックエンドサーバーなどにHTTPリクエストを送信するような機能が実装されている場合の話です。"
---

<img src="/images/20210810b/landscape-2022147_640.jpg" alt="" title="Artturi MäntysaariによるPixabayからの画像" width="640" height="360" loading="lazy">

TIGの伊藤真彦です。

フューチャー技術ブログでも何度か取り上げているCypressですが、私も最近触り始めました。

過去記事は[Cypressタグの記事](https://future-architect.github.io/tags/Cypress/)を参照してください。

今回取り上げたいテーマは、フロントエンドアプリケーションで、特定の画面に表示する情報をサーバーから取得する機能や、ボタンを押すとバックエンドサーバーなどにHTTPリクエストを送信するような機能が実装されている場合の話です。

期待通りのリクエストパラメータでAPIが実行されていること、サーバーサイドでエラーがあった場合の異常系の挙動などをテストしたくなった時に調べたことをまとめます。

なお正しいレスポンスが返ってくることもテストできますが、そこはバックエンドでテストできている、するべき部分なのでフロントエンドのテストとしては私は実装していません。

# CypressでAPIの実行を検証する

ボタンを押した時にAPIが実行されていることを検証するテストコードを書く際に便利な機能として、`cy.intercept`が用意されていました。

下記のコードのように利用できます。

```js main.ts
  it('API実行ボタンが動作すること', () => {
    cy.intercept('POST', 'http://localhost:3000/api').as('post_req')
    cy.findByText('submit').click()
    cy.wait('@post_req')
    cy.contains('成功')
  })
```

[ドキュメント](https://docs.cypress.io/api/commands/intercept#Syntax)に記載の通り、`cy.intercept`は様々な形式の引数に対し柔軟に対応できます、いろいろ試して下記の形式に落ち着きました。

```js main.ts
cy.intercept('HTTPメソッド', 'URL')
```

`cy.wait`を利用することで、ボタンを押してもAPIが実行されなかった場合、`cy.intercept`で指定したURL以外にリクエストが送信された場合はテストが失敗します。

# APIのリクエスト、レスポンスの内容を検証する
```js main.ts
  it('API実行ボタンが動作すること', () => {
    cy.intercept('POST', 'http://localhost:3000/api').as('post_req')
    cy.findByText('submit').click()
    cy.wait('@post_req').should(xhr => {
      expect(xhr.response.statusCode).to.eq(201)
      expect(xhr.request.body).to.eq('{"name":"cypress","id":"01"}')
    })
    cy.contains('成功')
  })
```

`cy.wait`の戻り値からHTTPリクエスト、レスポンスを上記のように詳細にテストすることができます。

```js main.ts
  import assert_req_body from '../../fixtures/request/post_api1.json'

  it('API実行ボタンが動作すること', () => {
    cy.intercept('POST', 'http://localhost:3000/api').as('post_req')
    cy.findByText('submit').click()
    cy.wait('@post_req').should(xhr => {
      expect(xhr.response.statusCode).to.eq(201)
      expect(xhr.request.body).to.eq(JSON.stringify(assert_req_body))
    })
    cy.contains('成功')
  })
```

リクエストボディの量によってはJSONファイルとして切り出すことで見通しの良い状態を保つことができます。

JSONとしてのシンタックスハイライトや構文エラーの検知が働くことで凡ミスを回避できる側面もあります。

# APIのレスポンスをスタブする

```js main.ts
  import assert_req_body from '../../fixtures/request/post_api1.json'

  it('API実行が失敗した場合アラートが表示されること', () => {
    cy.intercept(
      'POST',
      'http://localhost:3005/api',
      {
        statusCode: 500,
        body: '{"error": "internal error"}'
      }
    ).as('post_req')
    cy.findByText('submit').click()
    cy.wait('@post_req')
    cy.contains('失敗')
  })
```

`cy.intercept`は第三引数を利用することでレスポンスをスタブすることができます。全てのAPI実行をスタブすればバックエンドサーバーが存在しない状態でもテストできます。

```js main.ts
cy.intercept('HTTPメソッド', 'URL', {期待するレスポンス})
```

`body`ではなく`fixture`というキーを使用することで、fixtureフォルダに配置したJSONファイルを参照することも可能です。

```js main.ts
  import assert_req_body from '../../fixtures/request/post_api1.json'

  it('API実行が失敗した場合アラートが表示されること', () => {
    cy.intercept(
      'POST',
      'http://localhost:3005/api',
      {
        statusCode: 500,
        fixture: 'response/post_error1.json'
      }
    ).as('post_req')
    cy.findByText('submit').click()
    cy.wait('@post_req')
    cy.contains('失敗')
  })
```

異常応答だけでなく、データの内容が画面に影響する場合に全パターンのテストを行う事もこのような方法で行うことができます。

# まとめ

Cypressでは...

* `cy.intercept`を利用してHTTPリクエストの実行を検証できる
* リクエスト、レスポンスの内容を細かくテストできる
* レスポンスをスタブすることもできる

テストはただただ動かすだけでなく、異常系をいかに網羅するかが品質を左右します、リリース前にバグを見抜ける仕組みを整えていきましょう。
