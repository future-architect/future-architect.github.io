---
title: "data-testidはいつ使うべきか？そもそも使うべきなのか？"
date: 2023/11/28 00:00:00
postid: a
tag:
  - React
  - Cypress
  - Playwright
category:
  - Infrastructure
thumbnail: /images/20231128a/thumbnail.png
author: 澁川喜規
lede: "Playwrightあるいはそのロケーターの元ネタとなっているTesting Libraryでは、DOMを指定する方法として data-testid 属性を扱ったクエリーを提供しています。"
---

<img src="/images/20231128a/top.png" alt="" width="329" height="153">

Playwrightあるいはそのロケーターの元ネタとなっているTesting Libraryでは、DOMを指定する方法として ``data-testid`` 属性を扱ったクエリーを提供しています。どちらでも ``getByTestId(ID文字列)`` メソッドを使い、この属性値を使った要素の取得が行えます。しかし、ドキュメントを見ると、PlaywrightもTesting Libraryも、「他の手法が使えないときの最終手段」としています。

> In the spirit of the guiding principles, it is recommended to use this only after the other queries don't work for your use case. Using data-testid attributes do not resemble how your software is used and should be avoided if possible. That said, they are way better than querying based on DOM structure or styling css class names. Learn more about data-testids from the blog post "Making your UI tests resilient to change"
>
> [方針の原則](https://testing-library.com/docs/guiding-principles)の精神に基づき、他のクエリではユースケースに合わなかった場合にのみ、これを使用することをお勧めします。 ``data-testid`` 属性の使用は(エンドユーザーが)ソフトウェアを使用する方法とかけ離れているため、可能であれば避けてください。とはいえ、DOM構造に基づいてクエリを実行したり、(テストのために)CSSクラス名を設定するよりもはるかに優れています。 `data-testid` の詳細については、ブログ投稿の [変更に対するUIテストの回復力の強化」](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change)を参照してください。

* [アクセシビリティ情報を使った壊れにくいE2Eテスト](https://future-architect.github.io/articles/20210226/)

以前書いた技術ブログの記事では「人間に近い感覚」で要素を取得するテストが壊れにくいテストであるということを書きました。``data-testid`` はHTMLを見て初めて知り得る情報ですので、E2Eテストではなるべく使うべきではありません。エンドユーザーはDOM構造を見てウェブサイトにアクセスするわけではありません。ユーザーが操作するのはブラウザで操作するウェブアプリケーションであり、レンダリングされたウェブページを見て操作します。エンドユーザーから見れば、DOMの構造は実装の詳細であって、開発者ツールを見ないとわからない情報です。実装の詳細はリファクタリング等で変更されることがありますが、より抽象度の高い操作はそれよりも「意図せぬ変更」にはなりにくいです。

単体テストでも同様に使うべきではありません。同じようにテストできるのであれば、テストコードは少ない方が良いし、ホワイトボックステストよりもブラックボックステストで公開メンバーのみに対するテストで済むならそちらの方が良いというのは多くの開発者が合意してくれる内容だと思います。公開メソッドで済むのにわざわざリフレクション機能を使うのはよくないですよね？DOM構造を使ったテストはなるべく行うべきではないホワイトボックステストです。

そうなると、Testing-Libraryの原則で説明されているように、他の方法がある場合はそちらを使うべき、というのがわかるでしょう。「``data-testid``なんて新しい属性を作らなくても、 ``id`` や ``class`` でいいのでは？」と思う方もいると思います。 ``id`` や ``class``ははテスト専用ではなくて別の役割も持っているため、テスト以外の動機によって変更されてしまうことがあります。 ``data-testid`` の立ち位置は、なるべく使うべきではないが ``id`` や ``class`` よりはまし、と覚えておきましょう。

唯一、気兼ねなく使っても問題がないと思われるケースは、単体テストかつ、これが外部に公開されたAPIである場合です。次のように、省略可能な ``data-testid`` 属性をコンポーネントに付与し、もし指定されたらコンポーネントのルートの要素にこの属性をフォワードして付与するようにします。

``` jsx
// data-testid属性をフォワードして設定するコンポーネント

function Component(props: {["data-testid"]?: string}) {
  return <div data-testid={props["data-testid"]}>My Component</div>
}
```

こうすれば、単体テストにおいては、テストコードの見える場所で宣言と利用が行われます。「どこで定義されたかわからない謎の属性」感はなくなり、テストコードを読んだ人からはコンポーネントの中を知らずともその利用方法が想像できて、ブラックボックステストであるべき、という原則を壊さずに利用できていることがわかるでしょう。

``` jsx
// data-testidの問題ない利用例（Jest + @testing-library/react）

test('loads and displays greeting', async () => {
  render(<Component data-testid="test-target" />)

  expect(screen.getByTestId('test-target')).toHaveTextContent('My Component')
})
```

どちらにせよ、E2Eテストではなるべく使わない方が良いでしょう。眼に見える要素を使ってテストを書くべきです。

# 代わりに何を使えば良いか？

Testing LibraryもPlaywrightも、どちらもリファレンスでは同じような並びに並んでいることがわかります。アルファベット順ではないです。この順番で利用を検討していけば良いという推奨の順番と考えても良いと思います。(Testing-LibraryはByの前に、get, find, query, getAll, findAll, queryAllと6パターンの接頭辞のバリエーションがあります)

| Playwright | Testing-Library | 役割 |
| :------- | :------ | :-----|
| `getByRole()` | `ByRole()` | ロールで取得 |
| `getByLabel()` | `ByLabelText()` | ラベルテキストで取得 |
| `getByPlaceholder()` | `ByPlaceholderText()` | プレースホルダのテキストで取得 |
| `getByText()` | `ByText()` | テキスト情報で取得 |
|  | `ByDisplayValue()` | input/textareaのvalue値で取得 |
| `getByAltText()` | `ByAltText()` | 画像などの代替テキスト(alt属性)で取得 |
| `getByTitle()` | `ByTitle()` | HTMLのtitle属性(ツールチップで表示される)で取得 |
| `getByTestId()` | `ByTestId()` | data-testid属性で取得 |
| `locator()` |  | CSS/XPathで取得 |

檳榔さんから教えてもらったのですが、Cypressのベストプラクティスは``data-``属性を付与することを推奨しています。

* https://docs.cypress.io/guides/references/best-practices#Selecting-Elements

これは本エントリーとは矛盾はしません。というのも、アクセシビリティの要素での要素取得はCypress本体の機能ではなく、外部のライブラリのTesint-Libraryの機能だからです。Cypress本体の機能で実現できるのは``getByText()``と、上記の表の末尾の2つです。このうち、テキストは変更されうるので非推奨としています。

アクセシビリティ要素に関して言えば、機能を起動する起点となるものはたいていロールを使います。テキストは結果の取得程度で、たいていは入力値と同じもの、あるいはそこから算出される期待するテキストの取得に使うと思うので問題はないでしょう。そんでもって末尾の2つの中では``data-testid``の方が優先度が高いのでCypressのドキュメントで書かれていることと矛盾はしないですよね？

