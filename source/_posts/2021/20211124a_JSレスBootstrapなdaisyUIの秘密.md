---
title: "JSレスBootstrapなdaisyUIの秘密"
date: 2021/11/24 00:00:00
postid: a
tag:
  - CSS
  - TailwindCSS
  - daisyUI
  - フロントエンド
category:
  - Programming
thumbnail: /images/20211124a/thumbnail.png
author: 澁川喜規
lede: "最近、趣味開発でフロントエンドをいじる場合とか、Reactの技術サポートで手っ取り早く使い捨ての環境を作る場合は次の組み合わせで作っています。[Vite.jsでReact + TypeScriptプロジェクト作成。Tailwind CSS。これにESLintとPrettierを入れて完了です。。"
---
最近、趣味開発でフロントエンドをいじる場合とか、Reactの技術サポートで手っ取り早く使い捨ての環境を作る場合は次の組み合わせで作っています。

* [Vite.js](https://vitejs.dev/)でReact + TypeScriptプロジェクト作成
* [Tailwind CSS](https://tailwindcss.com/)

これにESLintとPrettierを入れて完了です。何かすごい便利、というよりもJSON設定ファイルいじりを最小にして、手間最小な必要十分なところを狙っています。eslint-config-prettierを入れた後に"prettier"ってESLintの設定に足すところだけは設定ファイルの修正が必要です。

UI部品は[MUI](https://mui.com/)（以前のMaterial UI)を使ったり、WebComponentsベースのものとかいろいろ試していましたが、最近お気に入りなのは[daisyUI](https://daisyui.com/)です。

<img src="/images/20211124a/スクリーンショット_2021-11-17_19.39.55.png" alt="daisyUIトップページ" width="1200" height="842">

本記事の執筆にあたっては、[@wozozo](https://twitter.com/wozozo), [@moriyoshit](https://twitter.com/moriyoshit), [@aodag](https://twitter.com/aodag)が雑談に乗ってくれましたので、感謝申し上げます。

# Bootstrap風な使い勝手

Tailwind CSSの設定が終わっていれば、`npm install daisyui`してからTailwind CSSの設定ファイルに一行足すだけで設定は完了します。

```js tailwind.config.js
module.exports = {
  plugins: [
    require('daisyui'),
  ],
}
```

使い方は、CSSのクラスにちょっと書き足すだけで動きます。使い勝手はBootstrapみたいですね。ドキュメントが検索しやすくて、サンプルが豊富で、シンプルに書かれているので、フロントエンドが苦手でCopy And Paste from Stack Overflowな人にも使いやすいと思います。

```html
<button class="btn">neutral</button>
<button class="btn btn-primary">primary</button>
<button class="btn btn-secondary">secondary</button>
<button class="btn btn-accent">accent</button>
<button class="btn btn-ghost">ghost</button>
<button class="btn btn-link">link</button>
```

<img src="/images/20211124a/スクリーンショット_2021-11-17_19.50.40.png" alt="ボタン" width="1200" height="134" loading="lazy">

優れている点は、Tailwind CSSに乗っかっているので、CSSの最適化がTailwind CSSのお作法で適切に行われて、サイズが小さいCSSが出力される点と、CSSだけなので、Reactだろうが、Vue.jsだろうが、Svelteだろうが、どんなフレームワークとも食い合わせが悪くなくて、ラッパーライブラリとか不要な点です。標準のHTMLのinput要素とかタグを扱う使い方で自然と扱えます。

UI部品の種類もそこそこ多いのも嬉しいですね。Headless UIよりも多い。

デフォルトで普通に使えるデザイン済みの部品が提供されていますが、[ソースを見ると](https://github.com/saadeghi/daisyui/tree/master/src/components)、styledと、unstyledというフォルダーがあります。設定で[スタイルをオフにする](https://daisyui.com/docs/customize)こともでき、コンポーネントの機構はそのまま利用して、独自デザインも作り込むことができるようになっています。

ステート管理をReactとかVue.jsとかで作り込まなくても、サンプル通りに置くだけで動作する点もうれしいですね。最近はUI部品はuncontrolledで使うのが流行りっぽいですが、そういう使い方にも合致していると言えます。

# ちょっと待てよ？なんでお前動くの？？？？

UI部品にはこんなものもあります。

* プルダウンメニュー
* ドロワー（サイズ変更でサイドバーが出たり、ボタンでサイドバーが出たり）
* モーダル（いわゆるダイアログ）
* 数字が勝手に減っていくカウントダウン

設定したときにはCSSの変更しかしてないわけですよ。JavaScriptをロードしたり組み込んだりを一切していない。まあプルダウンメニューぐらいは擬似セレクターでできるというのは想像できるのですが、クリックなしでモーダルとかドロワーとかどうやるんだ？というのがここ数日眠れないほど悩んでいた（嘘です）ことです。

というわけでコードを読んでみました。まずはドロップダウン。`.dropdown-open`をつければ開けっ放しになるし、あとはホバー時、フォーカス時に表示、みたいな感じですかね。DOMの擬似セレクタをうまくつかっていますね。

```scss /src/components/unstyled/dropdown.css
.dropdown.dropdown-open .dropdown-content,
.dropdown.dropdown-hover:hover .dropdown-content,
.dropdown:not(.dropdown-hover):focus .dropdown-content,
.dropdown:not(.dropdown-hover):focus-within .dropdown-content{
  @apply visible opacity-100;
}
```

ボタンでドロワーが表示される機能は次のようなHTMLで実現します。

```html
<div class="rounded-lg shadow bg-base-200 drawer h-52">
  <input id="my-drawer" type="checkbox" class="drawer-toggle">
  <div class="flex flex-col items-center justify-center drawer-content">
    <label for="my-drawer" class="btn btn-primary drawer-button">open menu</label>
  </div>
  <div class="drawer-side">
    <label for="my-drawer" class="drawer-overlay"></label>
    <ul class="menu p-4 overflow-y-auto w-80 bg-base-100 text-base-content">
      <li>
        <a>Menu Item</a>
      </li>
      <li>
        <a>Menu Item</a>
      </li>
    </ul>
  </div>
</div>
```

チェックボックスとラベルがありますね。ラベルをつけると、場所が離れたinputつまり、チェックボックスの操作ができます。ON/OFFの切り替えはボタンに見えるラベルを使い、ON/OFFの状態管理はチェックボックスを使っておこなっています。ちなみに、この状態管理をしているチェックボックスは非表示要素となっています。

```scss /src/components/unstyled/drawer.css
.drawer-toggle{
  @apply appearance-none opacity-0 w-0 h-0 absolute;
  :
  &:checked{
    & ~ .drawer-side{
      @apply overflow-y-auto;
      &>.drawer-overlay{
        @apply visible;
      }
      &>.drawer-overlay + *{
        @apply translate-x-0;
      }
    }
  }
}
```

最後に、一番摩訶不思議だったモーダルです。モーダルもドロワーみたいなチェックボックスを使うモードもありますが、そうじゃないモードもあります。アンカーリンクモードのコードは次のようになっています。意味不明ですね。

```html
<a href="/components/modal#my-modal" class="btn btn-primary">open modal</a>
<div id="my-modal" class="modal">
  <div class="modal-box">
    <p>Enim dolorem dolorum omnis atque necessitatibus. Consequatur aut adipisci qui iusto illo eaque. Consequatur repudiandae et. Nulla ea quasi eligendi. Saepe velit autem minima.</p>
    <div class="modal-action">
      <a href="/components/modal#" class="btn btn-primary">Accept</a>
      <a href="/components/modal#" class="btn">Close</a>
    </div>
  </div>
</div>
```

種明かしのCSSを見てみると、`:target`擬似セレクタを使っています。aタグをクリックしたときに選択されている要素であればこのセレクタが発動します。チェックボックスは同じ要素をON/OFFしますが、これであれば、クリックしたのと別の要素を使って選択を外せます。モーダルの場合、表示した後は元の表示ボタンは隠れてしまうわけで、モーダル上のOK/キャンセルボタンを使って閉じたいわけなので、こういう機能になっているのだと思います。

```scss /src/components/unstyled/modal.css
.modal-open,
.modal:target,
.modal-toggle:checked + .modal{
  @apply visible opacity-100 pointer-events-auto;
}
```

単なるお手軽部品かと思いきや、C++やRustで実装されているブラウザネイティブな機能のみをつかっているということは、ある意味、最速のUIコンポーネントなのでは？

# コードからコントロールしたい場合はどうするか？

フォーカスやら隠れた`<input>`タグやら、`<label>`タグやら、`<a>`タグやらを使って制御しているということはわかりました。

例えば、最初のチュートリアルで自動でサイドバーを開きたい、エラーが発生したのでスクリプトからモーダルを開きたい、といった場合はどうすればいいでしょうか？もちろん、これらのタグをDOM経由で操作すれば一応できますが、今まで説明してきたように、かなりトリッキーなタグの使い方をしているので、コードの見た目が変になってしまいますし、ReactとかVue.jsとか、せっかく宣言的な感じで書けるのに、急に手続型っぽくなってしまいます。

ドロップダウンからは強制的にモードを切り替えるCSSのクラス`dropdown-open`が提供されているので、このCSSのON/OFFで制御するのが良いと思います。まあ、あとは隠されたチェックボックスをcontrolledフォームにして、この状態をスクリプトで制御するのが良いですかね。

# アクセシビリティの懸念

紹介したコードは、いくつか、HTMLの元のタグのセマンティクスから外れた使い方をしていました。このようなものは本来はロールをきちんとつけてアクセシビリティに配慮すべきものです。

| コンポーネント | 付けるべきロール |
|:-|:-|
| [alert](https://daisyui.com/components/alert)  | [alert](https://w3c.github.io/aria/#alert)ロール  |
| [breadcrumbs](https://daisyui.com/components/breadcrumbs)  | [navigation](https://w3c.github.io/aria/#navigation)ロール(もしリンク集になっていたら) |
| [drawer](https://daisyui.com/components/drawer) | サイドバーは[menu](https://w3c.github.io/aria/#menu)ロール, [button](https://w3c.github.io/aria/#button)ロール(開閉要素), 本体は[main](https://w3c.github.io/aria/#main)ロールか[document](https://w3c.github.io/aria/#document)ロール, [landmark](https://w3c.github.io/aria/#landmark)ロール |
| [dropdown](https://daisyui.com/components/dropdown)  | [combobox](https://w3c.github.io/aria/#combobox)ロール |
| [footer](https://daisyui.com/components/footer)  | [navigation](https://w3c.github.io/aria/#navigation)ロール  |
| [menu](https://daisyui.com/components/menu)  |  [menu](https://w3c.github.io/aria/#menu)ロール |
| [modal](https://daisyui.com/components/modal)  | [dialog](https://w3c.github.io/aria/#dialog)ロールか[alertdialog](https://w3c.github.io/aria/#alertdialog)ロール, [button](https://w3c.github.io/aria/#button)ロール(開閉要素)  |
| [navbar](https://daisyui.com/components/navbar)  | [toolbar](https://w3c.github.io/aria/#toolbar)ロール  |
| [tooltip](https://daisyui.com/components/tooltip)  |  [tooltip](https://w3c.github.io/aria/#tooltip)ロール |

僕はアクセシビリティの専門家ではないので、もしこれも付与すべき、これよりもこちらの方が良い、というのがあればTwitterのDMか、ここのブログに編集リクエストを送っていただけると助かります。あとは、選べるなら最初からセマンティクスに合致したタグを選ぶというのも手ですね。ドロワーの真ん中のコンテンツのところに`<main>`とか`<content>`タグを使うとか。daisyUIのサンプルでも[footer](https://daisyui.com/components/footer)は`<footer>`タグを使っていますし、[kbd](https://daisyui.com/components/kbd)は`<kbd>`タグを使っていますね。

これは目安で、条件によって別のロールが良かったりとかあると思うのでロール一覧を見て付与するのがよいと思います。

daisyUIのサイトにPRでも送ってサンプルにロールをつけてもらおうかとも思ってコードのフォークをしていくつかrole属性をつけたりしていたのですが、かつてBootstrapはサンプルにロールを入れていたが、アクセシビリティについてよく知らない人がそのままコピペして広まった結果、アクセシビリティの世間の使われ方が破滅した、ということがあったと聞いたので、自分できちんと考えて付与してください。

breadcrumbsで、現在ページにはaria-currentもつけたりした方がいいんですかね・・・

# 用法容量を守ってご利用ください

うまく、標準のHTMLの状態管理をハイジャックしてUIの状態管理を実現していることがわかりました。おかげで、JavaScriptを使わずに動くUIを実現している仕組みがわかると同時にアクセシビリティ的には少し行儀が良くないね、というのも見えたと思います。

裏の仕組みがわかったので、daisyUIを書いていてうまく動かない場合のトラブルシュートも方向性が見えてきたので、今後はもっとうまく使えそうです。

僕個人はかっこいいCSS書けない勢なので、UI部品は積極的に使いたいし、その方向性でWebComponentsに期待していたところもあったのですが、JSを読み込まずにしゅっと表示できてしまうので、個人的なニーズにはすごく合致しています。ただ、最後に触れたようにアクセシビリティ的にはちょっとあれなので、きちんとロールを付けながら使っていきたいですね。

ちなみに、紹介しなかった実装面白コンポーネントに[カウントダウン](https://daisyui.com/components/countdown)があります。ぜひどう実装されているのか見てみてください。

