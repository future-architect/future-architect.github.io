---
title: "SvelteKitのデフォルトプロジェクトから学ぶ"
date: 2022/04/15 00:00:00
postid: a
tag:
  - Svelte
  - Playwright
category:
  - Frontend
thumbnail: /images/2022/20220415a/thumbnail.png
author: 澁川喜規
lede: "ウェブアプリケーションフレームワークとして最近注目度が少しずつ上がっているのがSvelteです。以前、Svelteをちょびっとサンプルを触ってみた感じ、コードの雰囲気はscript setup版のVue 3っぽいなー、という感じです。あとはプロパティ入力のあるコンポーネントでHTMLを生成するという基本構成はReactもAngularもみんなそうなので、今時のウェブフロントエンドのフレームワークを触ったことがあれば難しくはない気がします。1コンポーネントでおさまる範囲では[ちょっと前に]かんたんなアプリの試作をしてみましたが、じゃあ、一本分のアプリを作るときはどうなんだ、ということでSvelteKitでプロジェクトを新規で作ってみたけど、いろいろな未知の要素がでてきて、これはどうなんだ？というのをドキュメントから探す、という学び方もまあ悪くないな、ということでブログにしてみました。"
---
ウェブアプリケーションフレームワークとして最近注目度が少しずつ上がっているのがSvelteです。以前、Svelteをちょびっとサンプルを触ってみた感じ、コードの雰囲気は[`<script setup>` 版のVue 3](https://vuejs.org/api/sfc-script-setup.html)っぽいなー、という感じです。あとはプロパティ入力のあるコンポーネントでHTMLを生成するという基本構成はReactもAngularもみんなそうなので、今時のウェブフロントエンドのフレームワークを触ったことがあれば難しくはない気がします。

1コンポーネントでおさまる範囲では[ちょっと前に](https://future-architect.github.io/articles/20220207a/)かんたんなアプリの試作をしてみました（毎週何回も使ってるので手間の割に活躍してます）が、じゃあ、一本分のアプリを作るときはどうなんだ、ということでSvelteKitでプロジェクトを新規で作ってみたけど、いろいろな未知の要素がでてきて、これはどうなんだ？ というのをドキュメントから探す、という学び方もまあ悪くないな、ということでブログにしてみました。

ReactにNext.jsがあれば、VueにはNuxt.js、SvelteにはSvelteKitがあります。フロントエンドのフレームワークを拡張して、初回レンダリングをサーバーで行うサーバーサイドレンダリングなどの自分で環境を作ると不便なものが組み込まれていて、さらにサーバー側のAPI実装も同じフレームワーク内でサポートするなどの付加機能も提供してくれているものです。サーバーがNode.jsや、Node.jsベースのPaaSを使えば、JavaScriptだけでフロントもサーバーも完結します。

プロジェクトは次のコマンドで作っていきます。最初のコマンドでいろいろ聞かれるので、好きな条件を入れていきます。デモプロジェクトはYESにするといろいろなコードが生成されます。今回はこれを見ていきます。それ以外は全部YESにしてみました。

```sh
$ npm init svelte@next my-app

Welcome to SvelteKit!

This is beta software; expect bugs and missing features.

Problems? Open an issue on https://github.com/sveltejs/kit/issues if none exists already.

✔ Which Svelte app template? › SvelteKit demo app
✔ Use TypeScript? … No / Yes
✔ Add ESLint for code linting? … No / Yes
✔ Add Prettier for code formatting? … No / Yes
✔ Add Playwright for browser testing? … No / Yes

(以下略)

$ cd my-app
$ npm install
$ npm run dev -- --open
```

# サンプルプロジェクトのページ構成

サンプルプロジェクトは3つのページがあります。静的なAbout以外に、よくあるカウンターと、ToDoがあります。カウンターはSvelte単体でも実現できるような内容で、ToDoはウェブサービスアクセスを伴うサンプルです。

<img src="/images/2022/20220415a/スクリーンショット_2022-04-08_9.57.03.png" alt="カウンターのサンプル" width="1200" height="856" loading="lazy">

<img src="/images/2022/20220415a/スクリーンショット_2022-04-08_9.58.41.png" alt="TODOのサンプル" width="1200" height="856" loading="lazy">

ページ周りのコードを抜き出してきたのがこれです。

```
├── src
│   ├── app.css
│   ├── app.html
│   └── routes
│       ├── __layout.svelte
│       ├── about.svelte
│       ├── index.svelte
│       └── todos
│           ├── _api.ts
│           ├── index.svelte
│           └── index.ts
```

ぱっと見て想像できるルールはこんな感じです。

## ``src/routes``の階層がURLになりそう

Next.jsの``pages``みたいな感じのようです。[Routing](https://kit.svelte.dev/docs/routing)ページを見て答え合わせすると、やはりこのファイルシステムがそのままURLになるよ、と書いてあります。便利ですよねこれ。

## ``src/routes/__layout.svelte``も共通部分を書きそう

おそらくこれはきっとどのページでも今日で使われるヘッダーとかフッターとかを書きそうで、.svelteだからきっと動的なコンポーネントも使えそうな気がします。

[Layouts](https://kit.svelte.dev/docs/layouts)を見て答え合わせをすると、確かにこのようです。書くページのコンテンツは、このコンポーネントの``<slot>``の中に表示されるとのこと。

```html
<slot></slot>
```

複数階層にしてネストしてレイアウトを設定して使ったりもできて、同じフォルダで同じブレッドクラムを表示させたりというのもできるみたいですね。

面白かったのは、名前付きレイアウトで、``src/routes/__layout-foo.svelte``という名前のレイアウトを作っておいて、実際に作られるページのファイル名が``src/routes/my-special-page@foo.svelte``だとすると、この特別な``foo``レイアウトが使われるとのこと。複雑な継承とかもできるようです。

あと、このレイアウトのページにあった注目内容は``__error.svlete``ですね。これでページが見つからなかったときのエラーページが設定できるようです。

階層構造のサポートはSvelteのRouter機能のポイントらしく、レイアウトとかエラーページとかは特定のフォルダ内でのみに適用とかができるみたいです。

## app.htmlが最終的に作られるアプリケーションの枠組みっぽい

__layout.svelteと違い、きっと静的な共通要素、例えばmetaタグとかはここに書くんだろうと思われます。しかし、これに関する直接的な解説はドキュメントにはありません。ドキュメントの中に書かれているapp.htmlに関する要素は、2つだけです。

* [Configure](https://kit.svelte.dev/docs/configuration)で、src/app.htmlの名前を書き換えるコンフィグがあるよ
* [SvelteKitの前身のSapperから乗り換えるとき](https://kit.svelte.dev/docs/migrating#project-files-src-template-html)はapp/template.htmlからsrc/app.htmlに書き換えて、タグも置き換えたり、不要になったタグは削除してね。

[Sapper側のドキュメント](https://sapper.svelte.dev/docs#src_template_html)と合わせて読めば意味が理解できますね:

> サーバーから返されるレスポンスのテンプレートとして使われるファイル。Svelteは次のタグをそれぞれの内容に置き換える:
>
> * ``%svelte.head%`` — ページ固有の`<title>`などの`<head>`に置かれるHTMLに置き換えられる
> * ``%svelte.body%`` — SvelteがレンダリングするボディのHTMLに置き換えられる

# API周り

SvelteじゃなくてSvelteKitを選びたいニーズとしては主にサーバーもTypeScriptやJavaScriptも書きたいというのがあると思います。それ以外にもすでに説明したrouter周りで楽がしたい、静的コンテンツ生成に使いたい、というのもあると思いますが、ここではサーバーAPI提供側のコードを見ていきます。

API周りは以下のコードのようですね。src/routes/todos/index.svelteは``/todos``でアクセスしたときに表示されるページのコンテンツなので、`index.ts`がハンドラー定義のファイルみたいですね。``_api.ts``は名前からして共通コード置き場でrouterからは無視されそうな雰囲気。

```
├── src
│   └── routes
│       └── todos
│           ├── _api.ts
│           ├── index.svelte
│           └── index.ts
```

Next.jsはフォルダ構成をガッチリ決めることでAPIとHTMLを分けていましたが、ミックスできるのは便利ですね。でもこれだと、``/todos``でHTMLを要求するアクセスされたときと、APIのGETの区別が大変そうですね。ドキュメントを見ていきます。

[Endpoints](https://kit.svelte.dev/docs/routing#endpoints)のドキュメントによると、``.ts``でエンドポイントにできることが書かれていますね。その中で、`get`とか`post`という名前で関数を作ってあげるとエンドポイントになるとのこと。それ以外にも、post, put, patch, del(deleteは予約語なのでdel)に対応するとのことです。

```ts
export const get: RequestHandler = async () => {
}
```

ただ、これだとWebページのコンテンツとAPIの区別がつかないので、明治的に`accept: application/json`をリクエストにつけるか、`__data.json`というのをリクエスト側で付与することでJSONのAPIの方を明示的に要求するらしい。確かに、サンプルコードの動きを見ると、`__data.json`がついていますね。

<img src="/images/2022/20220415a/スクリーンショット_2022-04-10_9.40.11.png" alt="API" width="1200" height="412" loading="lazy">

アンダースコアで除外できることは[プライベートモジュール](https://kit.svelte.dev/docs/routing#private-modules)で説明されていました。ピリオドもプライベート扱い（`.well-known`を除く)とのこと。

## メソッドオーバーライド

動かしてみて、おっと思ったのが、`_method=DELETE`というところですね。HTTP的にはメソッドはたくさんありますが、JavaScriptを使わずにHTTPのフォームを使って送れるのはGETとPOSTのみです。そこで、POSTにいろいろなメソッドも振る舞わせるというメソッドオーバーライドというのがあります。

<img src="/images/2022/20220415a/スクリーンショット_2022-04-10_9.50.19.png" alt="メソッドオーバーライド" width="1200" height="250" loading="lazy">

設定を見たときに、メソッドオーバーライドという項目があるのに気づきました。

```js svelte.config.js
const config = {
	preprocess: preprocess(),
	kit: {
		adapter: adapter(),
		methodOverride: {
			allowed: ['PATCH', 'DELETE']
		}
	}
};
```

[メソッドオーバーライド](https://kit.svelte.dev/docs/routing#endpoints-http-method-overrides)のドキュメントにいろいろ書かれています。フロント側でがんばらなくてもできるようにする配慮があるのはいいですね。

## フォームのパース

サンプルを見ると、`request`のメソッドを使うことで、フロントから渡されるリクエストを処理できるみたいですね。

```ts src/routes/todos/index.ts
export const post: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();

	await api('post', `todos/${locals.userid}`, {
		text: form.get('text')
	});

	return {};
};
```

このリクエストオブジェクトは[ボディのパースのドキュメント](https://kit.svelte.dev/docs/routing#endpoints-body-parsing)のリンクを見る限り、[ブラウザのAPIと同じ](https://developer.mozilla.org/en-US/docs/Web/API/Request)っぽい。

## サンプルのAPI実装のバックエンドの中身

サーバーコード側の実装を見てみたら、fetchでsvelteが提供しているサーバーにリクエストを飛ばしているっぽいですね。サンプル用にサーバー維持するのすごい。たしかにストレージ周りだとSQLにしてもMongoDBなどにしても、SvelteKitの書き方を伝えたい、というニーズ以上のさまざまな前提知識が発生しがちなので、この割り切りは理解できます。

```ts /src/routes/todos/_api.ts
const base = 'https://api.svelte.dev';
import type { RequestHandler } from '@sveltejs/kit';

export function api(method: string, resource: string, data?: Record<string, unknown>) {
	return fetch(`${base}/${resource}`, {
		method,
		headers: {
			'content-type': 'application/json'
		},
		body: data && JSON.stringify(data)
	});
}
```

[NeDB](https://dbdb.io/db/nedb)みたいなのでもいいのに、と思ったら、NeDBはもうメンテナンス中止していたんですね。残念。

# フック

ソースフォルダの中にhooks.tsという気になるファイルがありました。中を見ると、CookieからユーザーIDを取り出し、なければUUIDを生成して`event.locals.userid`に格納しています。ウェブアプリケーションフレームワークに頻出するミドルウェアと近そうです。

```
├── src
│   └── hooks.ts
```

[フックのドキュメント](https://kit.svelte.dev/docs/hooks)を見ると、このフックのようにサーバーへのリクエストをちょっと加工する以外に、カスタムコンテンツをフックで返してしまうとか、外部サーバーへのリクエストを加工するなど、いろいろなことができるみたいです。

```ts src/hooks.ts
response.headers.set(
	'set-cookie',
	cookie.serialize('userid', event.locals.userid, {
		path: '/',
		httpOnly: true
	})
);
```

Cookieへの書き込みは、ヘッダーに直接入れていますが、[ドキュメント](https://kit.svelte.dev/docs/routing#endpoints-setting-cookies)でもそうなっていますね。面白いですね。

# それ以外の要素

生成されたコードにはないがドキュメントにある項目は以下の通りです。あとはこのあたりをピックアップして読んでみたら、SvelteKitの機能をざっと掴むには良いかなと思いました。

* [パスで渡すパラメータ](https://kit.svelte.dev/docs/routing#advanced-routing)
* [ページ生成前のコンテンツのロード](https://kit.svelte.dev/docs/loading)
* [モジュール](https://kit.svelte.dev/docs/modules)

あとは、デプロイ時の環境ごとの違いは[アダプター](https://kit.svelte.dev/docs/adapters)というものにまとめられているので、何かしらのアダプターについては学ぶことになるかと思います。

# (補足)Playwright

SvelteKitのプロジェクト作成ではJestとかVitestのような普通のテスティングフレームワークではなくて、E2EのPlaywrightの生成のみに対応しています。

ですが、TypeScriptを使うよオプションと、Playwrightを同時に有効にするとエラーになってしまいました。[Playwrightのマニュアル](https://playwright.dev/docs/test-typescript)に従って事前にビルドしてからテストを実行するようにしたら修正できました。

```json tests/tsconfig.json
{
	"compilerOptions": {
		"target": "ESNext",
		"module": "ES2015",
		"moduleResolution": "Node",
		"sourceMap": true,
		"outDir": "../tests-out"
	}
}
```

```json package.json
		"pretest": "tsc --incremental -p tests/tsconfig.json",
		"test": "playwright test -c tests-out",
```

TypeScript周りはいろいろ[Issueがどんどん修正されている](https://github.com/sveltejs/kit/issues?q=is%3Aissue+playwright+is%3Aopen)ので、もうちょっと新しいバージョンなら問題なくなるんじゃないかと思います。[Issue](https://github.com/sveltejs/kit/issues/4143)を見ると、PlaywrightじゃないUnit Testについて はvitest側のsveltekit対応の改善待ちステータスのようです。

# まとめ

SvelteKitを学ぼうと思ったけど、チュートリアル的なコンテンツがなく、上からドキュメント読むのもいいけど手っ取り早く概要を掴もうと思って、デフォルトプロジェクトのコードリーディングなどをしつつ、ドキュメントをつまみ食いするスタイルで学習してみました。

あと、書き終わってから気づいたのですが、[日本語訳されたドキュメント](https://kit.svelte.jp/)もありましたので、日本語なら早く読めるぞという方はドキュメントを先に読むのでもいいかもしれません。

全体的に、コードを見ると動きが想像できそうなものが多いというか、Next.jsとか類似ソリューションに近いというか、あまり奇をてらったところがない感じがします。あと、Cookieの設定だったり、メソッドオーバーライドだったり、サーバーで使われるReqestがブラウザのそれと同じだったり、既存のウェブ周りの情報がある人には慣れ親しんでいる方法を選択してくれている感じは気に入りました。

テスト周りの対応を見るとまだまだ若い感じが伝わってきますし、今までReact/Vueでやってきたようなことをいきなり全部実現というのは少し手間暇があるかもしれませんが、活発に改善されていっているので、SvelteKitをじっくり触りながら変化を感じるのも楽しいと思います。
