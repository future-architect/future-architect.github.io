---
title: "Tailwind CSSのドキュメントから見えてくる使い方とCSS設計のヒント"
date: 2025/03/14 00:00:00
postid: a
tag:
  - TailwindCSS
  - CSS
category:
  - Frontend
thumbnail: /images/2025/20250314a/thumbnail.png
author: 澁川喜規
lede: "CSSをわかりやすくメンテナンス性高く書くというのは長い間試行錯誤され続けてきました。命名規則でがんばる、SCSSのようなプリプロセッサを使う、CSS in JSなどいろいろな仕組みがかつて作られたりしてきましたが..."
---
CSSをわかりやすくメンテナンス性高く書くというのは長い間試行錯誤され続けてきました。命名規則でがんばる、SCSSのようなプリプロセッサを使う、CSS in JSなどいろいろな仕組みがかつて作られたりしてきましたが、現在一番シェアを集めているのがTailwind CSSです。[State of CSS 2024](https://2024.stateofcss.com/en-US/tools/#css_frameworks)の調査でも他のカテゴリ含めても一位です。

<img src="/images/2025/20250314a/Screenshot_2025-03-07_at_19.49.08.png" alt="" width="1200" height="589" loading="lazy">

1/23に最新バージョンの4系がリリースされました。そんでもってぼちぼちドキュメントの読書会をしているのですが、いろいろ利用方法のヒントがあったのでまとめてみます。一部「これから使う場合はこうしたい」という僕の意見もありますが、そこに関しては異論とか「実際やってみたけどこうだった」とかあると思いますので、そういうご意見などはXとかでいただければと思います。

# そもそもなぜTailwind CSSを使うのか？

Tailwind CSSは万人に支持されているわけではなく「かえってメンテナンス性が下がるのではないか？」という意見もたまに見られます。その答えとなる考え方もド[キュメントにあります](https://tailwindcss.com/docs/styling-with-utility-classes)。5項目書かれています。V3のドキュメントは3つでしたが増えました。原文の方の説明もご覧ください。

* すばやく実装できるようになる
* 安心して変更できるようになる
* 古いプロジェクトのメンテナンスが楽になる
* コードがよりポータブルになる
* CSSが膨大に育たなくなる

このあたり、実際にTailwind CSSがなかった時代の開発を知っていると「これこれ！」といいたくなるようなことばかりです。

クラス名をいちいち考えなければなりません。最近はReact/Vueのコンポーネントに閉じたCSSが書けるようにビルドツールががんばってくれるので衝突を気にする必要性は減っていますが、それでも時間がかかります。また、大きなディスプレイで、CSSとHTMLの両方のファイルをにらめっこしてあっちに飛んだり、こっちに飛んだりしながら直す必要もなくなります。

また、どのクラスがどこで使われているのかの影響を考えながら修正する必要もなくなります。一部修正しようとして想定外のところまで崩れてしまうという事故もなくなります。

タグ構造とCSSが密接なので、結局再利用するのは難易度が高いというところがポータビリティが以前はなかったという理由になるかと思います。

あと、影響範囲がわからないことで、どのクラスを削除していいのかわからない、というところがCSSファイルにゴミが溜まり続ける理由になっているのかな、という気がしています。だいたい、CSS経験者の誰に聞いても、「他の人が書いたCSSの修正はまず無理」「スタイルシートなら良かったがカスケーディングがあったせいでカオスの扉が開いた」と言うかと思います。

「インラインがいいなら、classじゃなくてsytle直接書けば？」という意見への反論も書かれています。

* デザインにある程度制約をあたえる
* ホバー、フォーカス、メディアクエリーなどインラインスタイルでは表現できないものもある

# ちょっと高度なセレクタ

Tailwind CSSのドキュメントに[ちょっと高度な書き方](https://tailwindcss.com/docs/hover-focus-and-other-states)が紹介されているので特に便利そうなものをいくつか紹介します。それぞれ、以下のようなご利益があります。

* スタイリングのためのタグを減らす
* スタイリング変化のためのJSコードを減らす
* スタイリングのための``class``の定義を減らす

## `::before`, `::after`

ちょっとしたテキストの色付けのために`<span>`タグを生やすというのをやったことがある人は多いでしょう。そんな無駄な作業は今後の人生でやる必要はもうありません。`after:`プリフィックスを駆使することでCSSを書かなくても`::after`が実現できます。

<img src="/images/2025/20250314a/Screenshot_2025-03-07_at_20.40.02.png" alt="ラベルに赤色のアスタリスクがついたEmailの入力フォーム" width="369" height="90" loading="lazy">

```html
<label>
  <span class="after:ml-0.5 after:text-red-500 after:content-['*'] text-gray-700 ...">Email</span>
  <input type="email" name="email" class="..." placeholder="you@example.com" />
</label>
```

ダイアログの背景も ``backdrop:bg-gray-50``で背景指定ができて、全体を覆うdivタグとか作らなくていいです。

## 条件つきのスタイリング

データの状態、例えば有効か無効かで色を変えたいということはよくあります。そのときにReactだと`className`をあの手この手で動的に変更するようなコードを書いたことはあるでしょう。テンプレートリテラル使ったりとか。

属性をもとにスタイルのON/OFFを切り替えるようなプリフィックスを使うと、classは文字列操作を除外した固定値にできて、条件分岐はその属性のON/OFFだけにつければ良くなりシンプルになります。 [has](https://tailwindcss.com/docs/hover-focus-and-other-states#has)で子供の状態を使ったスタイリング、[group](https://tailwindcss.com/docs/hover-focus-and-other-states#styling-based-on-parent-state)を使って親、[peer](https://tailwindcss.com/docs/hover-focus-and-other-states#styling-based-on-sibling-state)を使って兄弟の状態を元にしたスタイル変更もできます。

```html
<!-- disabledのON/OFFで背景のスタイルが変わる -->
<input :disabled="disabled" class="border bg-blue-400 disabled:bg-gray-400 m-4 p-4" placeholder="placeholder" />

<!-- 子のチェックボックスの選択でテキストのスタイルを変える -->
<label class="text-gray-400 has-checked:text-black"><input type="checkbox" v-model="checked">checked</label>
```

``disabled``, ``enabled``, ``checked``, ``indeterminate``, ``required``, ``valid``, ``invalid``, ``read-only``, ``open``, ``close`` などのセマンティックにあった属性が使えるならそれを使います。もしそうでない場合も、 ``data-not-saved:border-gray-400`` のようにdata属性も使えるのでアプリケーションで自由に必要な属性が追加できます。Vue3はfalseを与えると「falseがある」となってしまうので空文字列かnull/undefinedを与えるようにしないといけないのでちょっと冗長になりますが・・・

```html
<!-- data-toggle属性でスタイルを変更 -->
<div :data-toggle="toggle ? '' : null" class="border border-red-400 data-toggle:border-blue-400 m-4 p-4">
  Toggle
</div>
```


## 子供の要素のスタイリング

``*:``というプリフィックスで、子要素、``**:``で子孫全部に適用するスタイルを宣言できます。リストの親要素にだけ書いておけば全部の子要素のclassを書かなくてよくなるので、場合によっては記述量が減ります。ReactとかVueでループを回して作成とかだと変わらないですが。

```html
<div>
  <h2>Categories<h2>
  <ul class="*:rounded-full *:border *:border-sky-100 *:bg-sky-50 *:px-2 *:py-0.5 dark:text-sky-300 dark:*:border-sky-500/15 dark:*:bg-sky-500/10 ...">
    <li>Sales</li>
    <li>Marketing</li>
    <li>SEO</li>
    <!-- ... -->
  </ul>
</div>
```

# レスポンシブデザイン対応

## コンテナクエリーが使えないか検討する

Tailwind CSSには`md:flex`などの「このサイズ以上ならこの定義を利用する」というプリフィックスがあるのをご存知の方は多いと思います。この`sm`, `md`, `lg`, `xl`, `2xl`という5つのプリフィックスを駆使してレスポンシブデザインや！という説明はよく見かけます。こちらはビューポートサイズを基準に適用するスタイルを変更するメディアクエリーで実現されています。

コンテナクエリーは2020年代になって実装されたものでいくつかの技術要素で構成されています。[基本機能はbaseline 2023](https://caniuse.com/css-container-queries)となっています。コンテナクエリーは親要素のサイズ（もしくは名前をつければ直接の親でなくても良い）のサイズでスタイルを切り替える機能です。

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row">
    <!-- ... -->
  </div>
</div>
```

メディアクエリーが5つしかないのに[コンテナクエリーのプリフィックスは13個](https://tailwindcss.com/docs/responsive-design#container-size-reference)もあるあたり、こちらの方が手厚い気がします。

コンテナクエリーは親要素なので、デスクトップではあるがサイドバーなので幅があまりないよ、というケースで小さいコンポーネントを表示させるという使い方ができます。デスクトップ用、モバイル用、という使い分けよりもよりレスポンシブなコンポーネントが作れるので良さそうです。

コンテナクエリーの測定基準と実際にクエリーを書くタグは同じコンポーネントに閉じておくのが良さそうです。

## モバイルファースト

プリフィックスは「これより大きい場合」という意味です。「これより小さい」という `max-xl`のようなプリフィックスもありますが、この両方を混ぜない方が良いでしょう。

上記サンプルでは`flex-col @md:flex-row`という書き方をしていました。これはデフォルトではflex-colだが、448px(28rem)よりも上ならflex-rowになる、という定義です。このように「プリフィックスなし」「特定の条件で有効になるプリフィックスあり」の順番で書くことを公式ドキュメントでは「[モバイルファースト](https://tailwindcss.com/docs/responsive-design#working-mobile-first)」と呼んでいます。

デスクトップで開発していてあとでモバイルを追加するとデスクトップファーストの方が書きやすいとかはあるかもしれませんが、並び方とか`max-`の利用可否は同じルールで統一されている方が読みやすいので公式ドキュメントに従ってモバイルファーストを心がけると良いでしょう。

## ブレークポイントに名前をつける

コンポーネントはコンテナクエリーを使った方が良さそう、というのは最初に説明しましたが、といってもページトップとかは通常のメディアクエリーを使うかもしれません。その場合に、`sm:`とかを**たくさん**書く代わりに`desktop`という名前を定義して使う方が可読性はあがるでしょう。以下のコードは5つのメディアクエリーのプリフィックスを消去し（`initial`の行)、`desktop:`というプリフィックスを追加します。

```css
@import "tailwindcss";
@theme {
  --breakpoint-*: initial;     // デフォルトのプリフィックス削除
  --breakpoint-desktop: 80rem; // desktopを追加
}
```

あくまでも「たくさん同じプリフィックスを書く場合にはセマンティックに合わせた別名を定義すると良い」「それがたまたまブレークポイントだった」というのがここの趣旨です。ポータビリティは下がるけれど、アプリケーションで使うはずだからコンポーネント切り出して共有の対象ではない、最初から別名を定義することを推奨しているわけではないので最初のTailwind CSSのメリットからは外れません。

# テーマ

## 形式

テーマ定義はV3はJavaScript形式でしたが、CSS形式が今は標準のようです。JavaScript形式のテーマは明示的に指定しないと読み込まなくなりました。後方互換性のために残されている状態なので、今後はCSS形式に寄せていく方がよいでしょう。

```css
// 新しい書き方
@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --color-red-50: oklch(0.971 0.013 17.38);
  --color-red-100: oklch(0.936 0.032 17.717);
  --color-red-200: oklch(0.885 0.062 18.334);
  /* ... */
  --shadow-2xs: 0 1px rgb(0 0 0 / 0.05);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  /* ... */
}
```

こちらが古い形式です。

```js tailwind.config.js
// 古い書き方
module.exports = {
  theme: {
    fontFamily: {
      sans: ['ui-sans-serif', 'system-ui', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      serif: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
    },
    colors: {
      red: {
        50: 'oklch(0.971 0.013 17.38)',
        100: 'oklch(0.936 0.032 17.717)',
        200: 'oklch(0.885 0.062 18.334)',
      },
    },
    boxShadow: {
      '2xs': '0 1px rgb(0 0 0 / 0.05)',
      'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
  },
  plugins: [],
}
```

## デザインの共有

複数システム間で共通のデザインを共有したいということがあるかと思います。

そういうのは基本的にテーマとしてまとめて、共有できるようにします。どの要素にも変わらず同じスタイルを当てるという場合も、[Tailwind CSSデフォルトのテーマの変数値](https://tailwindcss.com/docs/theme#default-theme-variable-reference)を上書きするのではなく、次のように用途ごとに新しい変数を定義していく方が安全です。

アプリ内部でもよくつかうグループは名前をつけておくと一括で変更できて便利かもしれません。まあこういう話があると「必ず名前をつけなくてはいけない/Tailwindのユーティリティを直接使ってはいけない」みたいなマナー講師が出てくるかもしれませんが、繰り返し何度も出てきたら考える、ぐらいでいいかと思います。まあ元のTailwind CSSの思想を理解してたらそんなことを言わないとは思いますが。

```css
@import "tailwindcss";
@theme {
  --font-title: sans-serif;
  --font-body: serif;

  --radius-button: 0.375rem;
  --radius-card: 0.5rem;
}
```

## 大きさの単位系をremに統一

テーマ等で使う大きさの単位は主にremとpxがあります。pxは言わずもがなですが、remはrootのem。emはアルファベットの大文字のMのサイズ、rootはルートのということになります。要するにデフォルトフォントサイズです。ほとんどのブラウザは1rem=16pxです。

Tailwind CSSのレスポンシブデザインはV3まではピクセルでブレークポイントが定義されていました。V4ではremとなっています。smは[V3までは640px](https://v3.tailwindcss.com/docs/responsive-design#overview)、[V4からは40rem](https://tailwindcss.com/docs/responsive-design)です。

検索するといろいろ賛否両論ありますが、[開発側の意見としては](https://github.com/tailwindlabs/tailwindcss/issues/800)フォントサイズが変わるなら、それに合わせてパディングとかも変えられる方が便利である、というものです。

ピクセルとフォントサイズの両方が混ざってレイアウトされると、フォントサイズにより、テキストが予期せぬ位置で改行されたりしていろいろな条件でテストしないと正しいと判断できないことになりますが、スペースとかもすべてフォントサイズ依存になればフォントサイズ変更はズームと同じであり、レイアウト崩れの検証は減るものと思います。

なるべくremを統一的に使っていくのがV4以降は良いように思えます。

# まとめ

Tailwind CSSはユーティリティファーストですが、記述量を減らす工夫や、意味が伝わる別名を定義して可読性を上げる方法はいろいろ用意されています。それにより、スタイリング都合でHTMLの構造が複雑になったりというのをCSSレベルで抑制したりできます。このあたりを駆使すると、一歩レベルが上がるのではないかと思います。生成AIと人類の共通言語として定着したというメリットもありますし、賢くTailwind CSSを使っていけるようになる価値もさらに増えていると言えます。

