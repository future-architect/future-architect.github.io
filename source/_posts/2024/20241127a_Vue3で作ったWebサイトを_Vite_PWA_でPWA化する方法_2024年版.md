---
title: "Vue3で作ったWebサイトを Vite PWA でPWA化する方法 2024年版"
date: 2024/11/27 00:00:00
postid: a
tag:
  - Vue.js
  - PWA
  - Service Worker
  - Vite
category:
  - Frontend
thumbnail: /images/2024/20241127a/thumbnail.png
author: 大岩潤矢
lede: "Vue3で作ったWebサイトをPWA(Progressive Web Apps)化する方法を紹介します。"
---
## はじめに

<img src="/images/2024/20241127a/ogp-2.png" alt="ogp-2.png" width="1200" height="730" loading="lazy">

本記事は [Vue連載2024](/articles/20241125a/) 3日目の記事です。

こんにちは。Technology Innovation Group (TIG) 所属の、大岩([@920OJ](https://x.com/920OJ))です。

本記事では、Vue3で作ったWebサイトをPWA(Progressive Web Apps)化する方法を紹介します。

これまでも多くの方がVueで作られたWebサイトをPWA化する方法について発信されていますが、Webpackプラグインを導入するものであったり、メンテナスモードに入ってしまった `@vue/cli-plugin-pwa` を利用されているものが多いため、ここでは改めて2024年現在どのように実装すれば良いか紹介します。

## PWA技術のいま

Progressive Web Apps、直訳すると「革新的なWebアプリ」です。かっこいいですね。

誤解を恐れずに言えば、Webページを各プラットフォームのネイティブアプリのように表示・利用できるようにする技術です。ただネイティブアプリのように振る舞うだけでなく、ServiceWorkerを併用することでPush通知を受信可能にしたり、オフライン時にもキャッシュから表示できるようにしたり、バックグラウンド処理をはじめとする様々な機能を利用できます。

Google Trendsによると、PWAは2017年頃から盛り上がりを見せ、2020年頃に一度ピークが落ち着いたものの、最近じわじわと話題が盛り返しているようです。2017年〜2020年頃にPWAに触れたものの、それっきり追っていないという方も多いのではないでしょうか？

<img src="/images/2024/20241127a/Pasted_image_20241125132625.png" alt="Pasted_image_20241125132625.png" width="1200" height="713" loading="lazy">

個人的な主観とはなりますが、一時期PWAが次世代のアプリの姿として持て囃されていたものの、日本の約半数のシェアを占めるiOSがPWAサポートに消極的であったことが採用の障壁となり話題も落ち着いたものと推測します。

AndroidのGoogle ChromeにおいてPWAサポートが始まったのが2015年。一方で、iOS SafariがWeb App ManifestとService Workerのサポートを始めたのがiOS 11.3リリースの2018年3月です。しかしその当時も限定的なサポートにとどまり、別ドメインの遷移がPWA内で完結しない、カメラが起動できない等の問題が発生していました。

参考: https://qiita.com/zprodev/items/e5db743727c5722874cb

しかし、iOSのバージョンが上がるにつれてそれらの問題も徐々に改善していきます。特に昨今一番のアップデートとして、バックグラウンドでのPush通知に対応したことが挙げられます。2023年3月27日リリースのiOS16.4から、Service WorkerでバックグラウンドのPush通知を受信する `ServiceWorkerRegistration.showNotification()` に対応しました。これにより、iOSでのPWA実現の一番の障壁だったPush通知がそれなりに動くようになり、一層PWAが完成に近づいたと言えるでしょう。

<img src="/images/2024/20241127a/Pasted_image_20241125133903.png" alt="Pasted_image_20241125133903.png" width="1200" height="615" loading="lazy">

https://developer.mozilla.org/ja/docs/Web/API/ServiceWorkerRegistration/showNotification

ただし今年頭にネガティブなニュースもあり、AppleはiOS17.4のβ版にてEU圏内においてPWAサポートを削除すると発表したことがあります。理由はEUのデジタル市場法（DMA）への準拠により、iOSでのPWAをWebkitエンジン以外のレンダリングエンジンに対応させることによりセキュリティ・プライバシーの懸念を引き起こすため、とのことです。これは後にユーザからの反発によって撤回されたようですが、App Storeを主体とするiOSの収益モデルと競合し得る技術を忌避しようとする動きはこれからも警戒する必要があると考えます。

……と長々と書いてしまいましたが、結局のところ伝えたいのは「iOSでもやっとPWAがちゃんと使えるようになってきたぜ！」です。早速その威力を体感するためにも、Vue3でサクッとアプリを作り、PWA化してみましょう。

## Vite PWA を使って PWA化してみよう

その前に、今回利用する Vite PWA について紹介します。

<img src="/images/2024/20241127a/Pasted_image_20241125170224.png" alt="Pasted_image_20241125170224.png" width="1200" height="401" loading="lazy">

https://vite-pwa-org.netlify.app/

最近のVue3は、開発サーバやビルドツールとしてViteを利用しています。このViteのプラグインとして、PWAに必要なmanifestファイルやServiceWorkerのスクリプトファイルを出力してくれるのが Vite PWA です。

> Vite PWAは、既存のアプリケーションをほとんど設定不要でPWA（プログレッシブウェブアプリ）に変換するのをサポートします。一般的な使用例に適した実用的なデフォルト設定があらかじめ用意されています。
> vite-plugin-pwaプラグインでは以下のことが可能です：
> - Webアプリケーションのマニフェストを生成し、それをエントリーポイントに追加する（マニフェスト生成についてはセットアップガイドを参照してください）。
> - strategies オプションを使用してサービスワーカーを生成する（詳細は「サービスワーカーの戦略」セクションを参照してください）。
> - ブラウザにサービスワーカーを登録するスクリプトを生成する（「サービスワーカーを登録する」セクションを参照してください）。
> https://vite-pwa-org.netlify.app/guide/#vite-pwa

本来であれば自分で用意しないといけない複雑な設定ファイルを、Viteのコンフィグファイルにオプションを記載するだけで自動で出力してくれるというすぐれものです。

<img src="/images/2024/20241127a/Pasted_image_20241125200146.png" alt="Pasted_image_20241125200146.png" width="1200" height="699" loading="lazy">

PWAはウェブマニフェストファイルとServiceWorkerのファイルから成り立ちます。前者はPWAをインストールする際に使われるメタ情報的な役割で、後者はキャッシュ対応やバックグラウンド処理等のJSコードです。Vite PWAはこの2つのファイルを自動生成してくれます。

### アプリを準備する

まずはVue3で作成したアプリをPWA化してみましょう。ここでは、簡易的に天気予報APIを叩いて各地の天気予報を取得する簡単なアプリを用意しました。

<img src="/images/2024/20241127a/Pasted_image_20241125170033.png" alt="Pasted_image_20241125170033.png" width="1200" height="672" loading="lazy">

ソースコードとデモサイトは以下に配置しています。

- GitHub: https://github.com/920oj/pwa-example-20241126/tree/main/vue-example
- デモサイト: https://pwa-example-20241126.vercel.app/

今回は以下をPWAで実現できるようにしてみます。

- PWAをインストールできるようにする
- プリキャッシュでオフライン対応する
- 外部リソースをキャッシュする

### Vite PWA のインストール

まずはプラグインをインストールします。

```
npm install -D vite-plugin-pwa
```

次に、 `vite.config.ts` に以下を記載します。

```typescript
// (前略)
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({ // プラグインを追加
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // 開発サーバでも動作させる設定
      },
    }),
  ],
  // (後略)
```

最後に `npm run dev` で開発サーバを立ち上げてみましょう。立ち上がったら、F12で開発者ツールを開き、「Application」タブから「Service workers」を開いてください。

このように `dev-sw.js` がService Workerとして読み込まれている事がわかります。

<img src="/images/2024/20241127a/Pasted_image_20241125173130.png" alt="Pasted_image_20241125173130.png" width="1200" height="621" loading="lazy">

ターミナルのほうを見てみると、 `sw.js` と `workbox-xxxxxxxx.js` が自動生成されていることがわかります。

<img src="/images/2024/20241127a/Pasted_image_20241125173237.png" alt="Pasted_image_20241125173237.png" width="889" height="180" loading="lazy">

### PWAをインストールできるようにする（Webマニフェスト設定）

上記設定を実施しても、Webマニフェストの設定が不十分であるためPWAとしてインストールできません。Webマニフェスト用の設定を書く必要がありますが、その前にPWAのアイコンを用意しましょう。ただし、Webマニフェストで指定する必要があるアイコンは種類が非常に多く、すべてを手作業で用意するには骨が折れる作業です。

そこで、Vite PWA にはアセットを自動生成してくれるツールが用意されています。

```
npm i @vite-pwa/assets-generator -D
```

インストール後、 `pwa-assets.config.ts` として以下を記載します。今回は `public/icon.png` にアプリアイコンとして利用したいファイルを配置しました。

```typescript pwa-assets.config.ts
import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  images: [
    'public/icon.png', // ここに用意した画像を指定する
  ],
})
```

記載できたら、 `npx pwa-assets-generator --preset minimal-2023` で実行しましょう。

<img src="/images/2024/20241127a/Pasted_image_20241125203153.png" alt="Pasted_image_20241125203153.png" width="1072" height="746" loading="lazy">

正しく書き出せていそうです。

<img src="/images/2024/20241127a/Pasted_image_20241125203351.png" alt="Pasted_image_20241125203351.png" width="1200" height="710" loading="lazy">

後は `vite.config.ts` に設定を記載するだけです。

```typescript
VitePWA({
  registerType: 'autoUpdate',
  devOptions: {
    enabled: true,
  },
  manifest: {
    name: 'PWAテストアプリ', // アプリケーションリスト等で表示される名前
    short_name: 'PWAテスト', // ホーム画面で表示される名前
    description: 'PWAテストアプリです。天気予報を確認できます。',
    theme_color: '#e6eeff', // テーマカラー　最低限指定が必要
    display: 'standalone', // 表示モード standaloneにするとネイティブアプリっぽくなる
    icons: [ // 先ほどコンソールに出力されたものをコピペでOK
      {
        src: 'pwa-64x64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: 'maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
}),
```

`manifest` にオプションを記載していきます。ブラウザごとに対応している値は異なるので、MDNのサイトで対応状況を確認しておくと良いでしょう。

https://developer.mozilla.org/en-US/docs/Web/Manifest

保存したら、再度開発サーバを立ち上げてみましょう。アドレスバー横にアイコンが表示され、クリックするとPWAのインストールダイアログが表示されます。

<img src="/images/2024/20241127a/Pasted_image_20241125204440.png" alt="Pasted_image_20241125204440.png" width="544" height="242" loading="lazy">

iPhoneでも試してみましょう。cloudflaredを使って外からアクセスできるようにして、ページを開いて「ホーム画面に追加」をタップします。

<img src="/images/2024/20241127a/スライド3.png" alt="スライド3.png" width="1200" height="675" loading="lazy">

問題なく表示できていますね。

<img src="/images/2024/20241127a/スライド4.png" alt="スライド4.png" width="1200" height="675" loading="lazy">

### プリキャッシュを導入する

続いて、PWAをオフライン状態でも機能するように、プリキャッシュ設定を導入しましょう。ここまではWebマニフェストと呼ばれるJSONファイルによって機能が動作していましたが、ここからはServiceWorkerのコードによって動作します。本来であればServiceWorkerのソースコードを一から書いていく必要がありますが、Vite PWAでは `generateSW` (generate ServiceWorkerの略)オプションを有効化することで、ServiceWorkerのコードを自動生成してくれます。

実際にオプションを記載していく前に、Workboxというライブラリについて説明する必要があります。

Workboxとは、ServiceWorkerをより簡単に制御できるようにGoogleが開発しているモジュール群です。

https://developer.chrome.com/docs/workbox/what-is-workbox?hl=ja

Workboxには以下のモジュールが用意されています。

| #   | モジュール名             | 機能                    |
| --- | ------------------ | --------------------- |
| 1   | workbox-routing    | リクエスト                 |
| 2   | workbox-strategies | キャッシュ戦略               |
| 3   | workbox-precaching | プリキャッシュ設定の導入          |
| 4   | workbox-expiration | キャッシュの管理              |
| 5   | workbox-window     | ServiceWorkerの登録・更新作業 |
| 6   | workbox-build      | ServiceWorkerの自動生成    |

Vite PWAでは内部的にこの `workbox-build` を呼んでおり、`vite.config.ts` に記載した設定値をWorkboxモジュールに渡すことでPWAに必要なServiceWorkerのソースコードを生成しています。そのため、プリキャッシュの導入においてもVite PWAがWorkboxを使ってよしなに生成してくれるので、我々は設定値をコンフィグファイルに記載するだけで良いのです。

 Vite PWAでは、 `globePatterns` オプションを変更することでVueアプリのキャッシュに必要なファイルをプリキャッシュできます。一度この設定をしないままビルドをしてみて、書き出されたファイルの拡張子を指定するとやりやすいと思います。

```
$ find . -type f -name "*.*" | sed 's/.*\.//' | sort -u
css
html
ico
js
png
webmanifest
```
 
 今回の場合、css、html、ico、js、png、webmanifestを指定すると良さそうです。globパターンを記載します。

```typescript
VitePWA({
  registerType: 'autoUpdate',
  devOptions: {
	enabled: true,
  },
  manifest: {
    // (中略)
  },
  workbox: { // 追加
    globPatterns: ['**/*.{css,html,ico,js,png,webmanifest}'], // ここにプリキャッシュ対象としたいファイルを記載する
  },
```

この状態でビルドすると、ターミナルにVite PWAが書き出されたファイルをVite PWAが探して、プリキャッシュに含めてくれます。

```
PWA v0.21.0
mode      generateSW
precache  22 entries (195.30 KiB)
files generated
  dist/sw.js
  dist/workbox-5ffe50d4.js
```

書き出された `dist/sw.js` を見てみると、 `e.precacheAndRoute()` の引数に、書き出されたファイルが一覧されているようです。 

<img src="/images/2024/20241127a/Pasted_image_20241128142353.png" alt="Pasted_image_20241128142353.png" width="1200" height="1165" loading="lazy">

では実際に試してみましょう。ビルドした後、先ほどと同様 cloudflared を使ってhttps通信でスマホからアクセスし、ホーム画面に追加。PWAアプリを一度開き、その後オフライン状態にして再度開くと……

<img src="/images/2024/20241127a/スライド5.png" alt="スライド5.png" width="1200" height="675" loading="lazy">

オフライン状態でも表示できました！しかし、外部リソース（ここでは天気予報APIやそこから取得した画像ファイル）からの取得は失敗してしまっていますね。

### 外部リソースのキャッシュを有効化する

先程も軽く触れましたが、ServiceWorkerはブラウザとネットワーク間に入り仮想キャッシュとして機能します。すなわち、ネットワークへのアクセス(fetch)が発生するたびにServiceWorkerがそれをハンドリングし、そのリソースをキャッシュから返すか、ネットワークへアクセスしに行くかを判断し挙動を変えることができます。

このキャッシュ戦略にはいくつかあり、workbox-strategiesの機能で切り替えることができます。以下にその種類を簡単に記載しますが、詳細は[web.davの記事](https://web.dev/articles/runtime-caching-with-workbox?hl=ja)を参考にしてください。

- Network First(ネットワーク優先)
	- まずはネットワークを見に行き、最新のデータを返す。リクエストが失敗したり、時間がかかりすぎたりすると、最新のキャッシュを返す。
- Cache First(キャッシュ優先)
	- まずは最新のキャッシュを返す。キャッシュが存在しない場合やキャッシュに不備がある場合はネットワークを見に行く。
- Stale While Revalidate(SWR)
	- まずは最新のキャッシュを返すが、その裏でネットワークを見に行き、キャッシュを最新化する。

今回はNetwork Firstで実装してみようと思います。Vite PWAで外部リソースのキャッシュを有効化するには、 `runtimeCaching` オプションを利用します。また、今回は tsukumijima 氏によって公開されている「天気予報API(livedoor 天気互換)」のドメイン `weather.tsukumijima.net` と、気象庁のドメイン `www.jma.go.jp` から外部リソースが読み込まれているので、この2ドメインをruntimeCacheの対象としましょう。

```typescript
// (前略)
workbox: {
  globPatterns: ['**/*.{css,html,ico,js,png,webmanifest}'],
  runtimeCaching: [ // 追加
    {
      urlPattern: /^https:\/\/weather\.tsukumijima\.net\/.*/i, //正規表現で記載
      handler: 'NetworkFirst', // 'CacheFirst' | 'CacheOnly' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate';
    },
    {
      urlPattern: /^https:\/\/www\.jma\.go\.jp\/.*/i,
      handler: 'NetworkFirst',
    },
  ],
},
// (後略)
```

では実際に試してみましょう。build後、PWAをインストールし直してみます。

<img src="/images/2024/20241127a/スライド6.png" alt="スライド6.png" width="1200" height="675" loading="lazy">

今回はオフライン状態でもAPIリクエストをキャッシュできました！

## もう一つのモード: injectManifest について

さて、ここまで `generateSW` を指定しServiceWorkerファイルを自動生成する方法で説明してきましたが、もう一つ `injectManifest` というモードがあります。これは、自前で用意したServiceWorkerのコードにプリキャッシュや外部リソースのキャッシュに対応させるコードをWorkboxが挿入(inject)してくれるモードです。

https://vite-pwa-org.netlify.app/workbox/inject-manifest.html

本記事では尺（？）の都合上触れませんでしたが、例えばPush通知を受信可能とするには別途自前でServiceWorkerコードを作成する必要があります。 `generateSW` ではServiceWorkerコードが自動生成されてしまうため、組み入れることができません。これを解決するのが `injectManifest` モードです。

[Chrome for Developersのウェブサイト](https://developer.chrome.com/docs/workbox/modules/workbox-build?hl=ja#which-mode-to-use)では、各モードの選択を以下のように実施するべきとしています。

- generateSWを使用するケース
	- ファイルをプリキャッシュしたい場合
	- 単純なランタイムキャッシュ（外部リソースのキャッシュ）が必要な場合
- injectManifestを使用するケース
	- ServiceWorkerをより詳細に制御したい場合
	- ファイルをプリキャッシュしたい場合
	- ルーティングおよびキャッシュ戦略をカスタマイズする必要がある場合
	- ServiceWorkerを他のプラットフォーム機能（Web Push等）と併用する場合

`injectManifest` モードを利用したVite PWAの設定についてもある程度知見が溜まってきたので、別途記事にできればと思います。

## おわりに

色々ドキュメントを読み解いていくにつれて、やはりPWA技術は難しいと感じました。その難解さを簡易なインターフェースに抽象化してくれるVite PWAは非常に助かるプラグインですが、どうしてもその裏側で使われているライブラリやPWAの仕様をちゃんと把握しておかなければ嵌まってしまう落とし穴が多いように思います。

この記事に書ききれなかった様々な試行錯誤も沢山ストックしているので、また別の機会に記事化できればと思います。それでは！

### おまけ

色々調べるうえで役に立ったWebサイトを以下に記載します。Google系のドキュメントは機械翻訳されており、誤った訳も多いので、なるべく英語のドキュメントを読むことをおすすめします。

- ServiceWorker についての理解
    - [Service worker overview - Chrome for Developers](https://developer.chrome.com/docs/workbox/service-worker-overview)
- 初心者向けのServiceWorkerの図解
    - [【イラスト付き】Servie Worker API【利用方法】](https://zenn.dev/peter_norio/articles/2896d638dece0e)
- プリキャッシュ対応
    - [Workboxを使ってPWAを完全オフライン対応した](https://zenn.dev/cureapp/articles/f66551b3995aaf)
    - [workbox-precaching - Chrome for Developers](https://developer.chrome.com/docs/workbox/modules/workbox-precaching)

