---
title: "Cloudflare C3で始めるCloudflare Pages入門"
date: 2024/05/01 00:00:00
postid: a
tag:
  - Cloudflare
  - Vue.js
category:
  - Frontend
thumbnail: /images/2024/20240501a/thumbnail.png
author: 大岩潤矢
lede: "Cloudflareが提供するCLIツール「Cloudflare C3」を利用して、Cloudflare Pagesへ簡単に入門する方法について、ハンズオンを中心に紹介します。"
---

[春の入門連載2024](/articles/20240408a/) 15日目の記事です。

## はじめに

みなさんこんにちは。TIG所属の大岩潤矢( [@920OJ](https://x.com/920OJ) ) です。

Cloudflareが提供するCLIツール「Cloudflare C3」を利用して、Cloudflare Pagesへ簡単に入門する方法について、ハンズオンを中心に紹介します。

## Cloudflare Pagesとは

Cloudflare Pagesとは、一言で言えば **「Cloudflareが提供するWebサイトのホスティングサービス」** です。

<img src="/images/2024/20240501a/ogp.png" alt="ogp.png" width="1200" height="630" loading="lazy">

みなさんは、静的Webサイトを作成した後どこにデプロイしますか？

ホスティングの方法は多種多様、色々な方法が存在します。一昔前までは、レンタルサーバを借りてFTP接続し、各種ファイルを配置する……というものが一般的でした。しかし最近は大手クラウドベンダーの提供するPaaS(Platform as a Service)が台頭し、面倒なサーバ管理無しに、コードさえあればすぐにWebサイトを公開できる、というのも一般的になってきました。

特に静的Webサイトをホスティングするサービスには、AWSの[Amplify](https://aws.amazon.com/jp/amplify/hosting/)（中身はS3+CloudFront構成）やGoogleの[Firebase Hosting](https://firebase.google.com/docs/hosting?hl=ja)など大手クラウドベンダーが提供するクラウドの1サービス、はたまた[Netlify](https://www.netlify.com/)や[Vercel](https://vercel.com/)などの独立系プラットフォーマーのサービスなどが挙げられます。

その中に彗星のごとく現れたのが、大手CDNプロパイダの1つ、Cloudflareが提供する[Cloudflare Pages](https://www.cloudflare.com/ja-jp/developer-platform/pages/)です。

### Cloudflare Pagesの魅力: コストの安さ

Cloudflare Pagesの魅力、それは圧倒的なコストの安さ、CDN基盤の強みを生かした安定・高速な配信です。

まずはコストから見てみましょう。[公式サイト](https://www.cloudflare.com/ja-jp/developer-platform/pages/)の価格表の一番上に、「サイト、シート、リクエスト、帯域幅は全プラン無制限」と記載があります。

<img src="/images/2024/20240501a/image.png" alt="image.png" width="1200" height="712" loading="lazy">

（[公式サイト](https://www.cloudflare.com/ja-jp/developer-platform/pages/)より引用）

Cloudflare Pagesでは**無料プランでも、公開するサイト数、リクエスト数、帯域幅、どれだけ増大しても無料で使い続けることができます**。制限は同時ビルド数が1であること、月のビルド数が500に制限されていること、カスタムドメイン設定が100個までということのみです。

一応他にも制限はあり、[ドキュメント](https://developers.cloudflare.com/pages/platform/limits/)の方にまとまっています。

- 1サイトに含められるファイル数は最大20,000ファイル
- Pagesから配信できる1アセットのサイズ上限は25MB
- 申請なしで作成できるサイト数は100個まで（それ以上は引き上げ申請が必要）

特にファイル数とファイルサイズは、利用用途によってはフィットしない可能性があります。大容量のファイルをホスティングしたい場合は、同じくCloudflareのオブジェクトストレージである[Cloudflare R2](https://www.cloudflare.com/ja-jp/developer-platform/r2/)などの利用を検討しましょう。こちらも帯域幅無料で、コストを抑えてアセットの配信ができます。

同じ用途でよく利用される他のサービスの無料プランとも簡単に比較してみましょう。

| サービス名 | サイト数 | リクエスト数上限 | 帯域幅上限 | ストレージ  | 備考 |
| --- | --- | --- | --- | --- | --- |
| Cloudflare Pages | 無制限(カスタムドメインは100まで) | 無制限 | 無制限 | 無制限<br />(1ファイル25MB) | |
| Firebase Hosting | ５〜10個(プロジェクト数)<br />1プロジェクトあたり36個 | 無制限 | 360MB/日 | 10GB<br />(1ファイル2GB) |
| GitHub Pages | アカウントごとに1個 | 制限あり | 100GB/月 | 1GB<br />(1ファイル100MB) | 商用利用不可 |
| Netlify | 500個 | 無制限 | 100GB/月 | 不明 | |

月の帯域幅制限を設定しているサービスが多いなか、無制限に利用できるのはCloudflare Pagesのみです。CDNプロパイダとしての気概と矜持を感じますね。

### Cloudflare Pagesの魅力: 安定・高速な配信

Cloudflareは世界最大のCDNサービスを提供することから、100カ国以上にデータセンターを所有しています。[公式サイト](https://www.cloudflare.com/ja-jp/network/)によれば、日本だけでも東京、大阪、福岡、那覇と、4箇所も存在しています。

Cloudflare PagesへデプロイされたWebサイトは、この世界中にあるデータセンター（エッジサーバ）へ配置されます。これにより閲覧するユーザから一番近いサーバより配信できるため、物理的距離の短縮がページ表示の高速化につながる……と理解しています。

Cloudflare Pagesの魅力はこれ以外にもあり、リリース時のブログページに詳細が書かれているので、気になる方はぜひご一読ください。

[https://blog.cloudflare.com/ja-jp/cloudflare-pages-ja-jp/](https://blog.cloudflare.com/ja-jp/cloudflare-pages-ja-jp/)

## Cloudflare C3とは

Cloudflare C3とは、Cloudflareが公式で提供しているScaffoldツールです。C3は `create-cloudflare-cli` の略で、頭文字の3つのCを取ってC3のようです。サービスがリリースされた順序は前後しますが、D1、R2、C3と並んでいるのがキレイですね！

Cloudflare C3を利用することで、Pagesのデプロイ設定等も含めた新規Webサイトプロジェクトの構築を実施できます。あくまで新しくWebサイトを構築する際に利用するツールであり、既存のプロジェクトからPagesにデプロイする設定をするものではないので、注意してください。

公式ドキュメントはこちらです。: [https://developers.cloudflare.com/pages/get-started/c3/](https://developers.cloudflare.com/pages/get-started/c3/)

それでは、早速Cloudflare C3を利用してCloudflare Pagesに入門してみましょう！

## ハンズオン

今回のハンズオンは、以下の環境で実施します。ソフトウェアのバージョンによっては動作しないこともあるため、ハンズオン実施前に各種ソフトウェアのバージョンアップをおすすめします。

```sh
Macbook Pro (M1 MAX)
Node.js: v20.12.2
npm: v10.5.0
```

### Cloudflareアカウントの作成

以下リンクより、Cloudflareアカウントを作成します。画面の指示に従ってメールアドレス・パスワードを登録後、メールアドレス宛に届いた認証リンクをクリックすることで登録完了です。

[https://dash.cloudflare.com/sign-up?pt=f](https://dash.cloudflare.com/sign-up?pt=f)

### Cloudflare C3を利用したプロジェクトの作成

まずはCloudflare C3を利用して、プロジェクトを作成します。ここでは、Vueを利用したウェブサイトを構築する想定で設定します。

ターミナルを開き、以下のコマンドを入力します。

```sh
npm create cloudflare@latest
```

```sh
Need to install the following packages:
create-cloudflare@2.21.1
Ok to proceed? (y) # yを入力し、Enter
```

プロジェクト名を入力します。

```sh
using create-cloudflare version 2.21.1

╭ Create an application with Cloudflare Step 1 of 3
│
╰ In which directory do you want to create your application? also used as application name
  ./frontend
```

どの種類のアプリケーションを作成するか尋ねられます。今回は「Website or web app」を選択します。

```sh
╰ What type of application do you want to create?
  ○ "Hello World" Worker
  ○ "Hello World" Worker (Python)
  ○ "Hello World" Durable Object
  ● Website or web app
  ○ Example router & proxy Worker
  ○ Scheduled Worker (Cron Trigger)
  ○ Queue consumer & producer Worker
  ○ API starter (OpenAPI compliant)
  ○ Worker built from a template hosted in a git repository
```

次に何のフレームワークを利用するか選択します。今回はVueを使います。

```sh
╰ Which development framework do you want to use?
  ○ Analog
  ○ Angular
  ○ Astro
  ○ Docusaurus
  ○ Gatsby
  ○ Hono
  ○ Next
  ○ Nuxt
  ○ Qwik
  ○ React
  ○ Remix
  ○ Solid
  ○ Svelte
  ● Vue
```

ここまで入力した情報でプロジェクトの設定は終了です。プロジェクトファイルのインストールが始まるので、yを入力しEnterを押下します。

```sh
using create-cloudflare version 2.21.1

╭ Create an application with Cloudflare Step 1 of 3
│
├ In which directory do you want to create your application?
│ dir ./frontend
│
├ What type of application do you want to create?
│ type Website or web app
│
├ Which development framework do you want to use?
│ framework Vue
│
├ Continue with Vue via `npx create-vue@3.10.2 frontend`
│

Need to install the following packages:
create-vue@3.10.2
Ok to proceed? (y) # yを入力し、Enter
```

続いてVueの設定が始まります。この詳細な設定は割愛しますが、自分は以下の構成で設定しました。

```sh
Vue.js - The Progressive JavaScript Framework

✔ Add TypeScript? … Yes
✔ Add JSX Support? … No
✔ Add Vue Router for Single Page Application development? … Yes
✔ Add Pinia for state management? … No
✔ Add Vitest for Unit Testing? … No
✔ Add an End-to-End Testing Solution? › No
✔ Add ESLint for code quality? … Yes
✔ Add Prettier for code formatting? … Yes
✔ Add Vue DevTools 7 extension for debugging? (experimental) … Yes
```

最後に、今からすぐにデプロイするかどうかを尋ねられます。Yesを選択し、デプロイまでやってしまいましょう。

```sh
╭ Deploy with Cloudflare Step 3 of 3
│
╰ Do you want to deploy your application?
  Yes / No
```

ブラウザが立ち上がるので、ログインします。

<img src="/images/2024/20240501a/image_2.png" alt="image.png" width="1200" height="886" loading="lazy">

権限付与の確認をするコンセントページが表示されます。ページ下部のAllowを押下し、許可します。

<img src="/images/2024/20240501a/image_3.png" alt="image.png" width="1200" height="801" loading="lazy">

<img src="/images/2024/20240501a/image_4.png" alt="image.png" width="1200" height="618" loading="lazy">

ここまで来たら、ブラウザは閉じてもOKです。

<img src="/images/2024/20240501a/image_5.png" alt="image.png" width="1200" height="744" loading="lazy">

裏ではデプロイが走ったままになっているので、このままにします。

<img src="/images/2024/20240501a/image_6.png" alt="image.png" width="1200" height="842" loading="lazy">

少しするとデプロイが完了し、自動でデプロイ先のURLが開きます。

<img src="/images/2024/20240501a/image_7.png" alt="image.png" width="1200" height="777" loading="lazy">

なんと、たった1コマンド（といくつかの設定）で、Cloudflare Workersへのデプロイまで完了してしまいました。

### 更新後の反映

ページの更新をPagesへデプロイするには、本来[Wrangler](https://developers.cloudflare.com/workers/wrangler/)というCloudflareのCLIツールを利用するのが一般的です。一方で、Cloudflare C3を利用して構築したプロジェクトでは、npm scriptsにデプロイ用のコマンドが追加されているため、以下のコマンドだけで反映できます。

```
npm run deploy
```

仕組みを紹介すると、以下のコマンドを実行しているようです。ビルド後に、 `dist` ディレクトリの中身をPagesへデプロイする形になっていますね。

```
npm run build && wrangler pages deploy ./dist
```

試しに先ほどのプロジェクトの一部を変更してデプロイしてみましょう。 `views/HomeView.vue` ファイルを以下のように変更します。

```html
<script setup lang="ts">
import TheWelcome from '../components/TheWelcome.vue'
</script>

<template>
  <main>
    <!-- 以下に変更 -->
    <h2>Cloudflare C3で始めるCloudflare Pages入門</h2>
  </main>
</template>
```

変更を保存した状態で、 `npm run deploy` を走らせてみましょう。

```sh
% npm run deploy

> frontend@0.0.0 deploy
> npm run build && wrangler pages deploy ./dist


> frontend@0.0.0 build
> run-p type-check "build-only {@}" --


> frontend@0.0.0 type-check
> vue-tsc --build --force


> frontend@0.0.0 build-only
> vite build

vite v5.2.10 building for production...
✓ 46 modules transformed.
dist/index.html                      0.43 kB │ gzip:  0.28 kB
dist/assets/AboutView-C6Dx7pxG.css   0.09 kB │ gzip:  0.10 kB
dist/assets/index-D6pr4OYR.css       4.21 kB │ gzip:  1.30 kB
dist/assets/AboutView-CUrwZ76T.js    0.22 kB │ gzip:  0.20 kB
dist/assets/index-DQoQ7Ar8.js       79.46 kB │ gzip: 31.95 kB
✓ built in 395ms
fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
▲ [WARNING] Warning: Your working directory is a git repo and has uncommitted changes

  To silence this warning, pass in --commit-dirty=true


🌎  Uploading... (6/6)

✨ Success! Uploaded 3 files (3 already uploaded) (1.93 sec)

✨ Deployment complete! Take a peek over at https://xxxxxxxxxx.xxxxxxxxxx.pages.dev
```

ほんの10秒程度でデプロイが完了したようです。表示されているリンクをクリックすると……

<img src="/images/2024/20240501a/image_8.png" alt="image.png" width="1200" height="370" loading="lazy">

変更が反映されていました！
デプロイの更新方法が分かれば、あとはガンガンページを更新していって、出来たタイミングでURLを公開するだけですね。

## おわりに

Cloudflare Pagesは素晴らしいサービスであるものの、自分の身のまわりで知名度が低く、あまり使っている人を見たことが無いのが気に掛かっており、この記事を執筆しました。
今回紹介出来なかったCloudflare WorkersとPagesの連携などについても、今後取り上げることができればと思います！
