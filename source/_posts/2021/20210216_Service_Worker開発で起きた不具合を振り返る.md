---
title: "Service Worker開発で起きた不具合を振り返る"
date: 2021/02/16 00:00:00
postid: ""
tag:
  - JavaScript
  - フロントエンド
  - Vue.js
  - トラブルシュート
category:
  - Programming
thumbnail: /images/20210216/thumbnail.png
author: 川端一輝
lede: "Service Worker開発で起きた不具合と対応方法を記載します。Service Workerは、ブラウザがWebページとは別にバックグラウンドで実行するJavaScriptになります。"
---
# はじめに

TIGの川端です。

先日、Vue.js + Service Worker開発案件が終わりました。その振り返りとして、Service Worker開発で起きた不具合と対応方法を記載します。

<img src="/images/20210216/thumbnail.png" class="img-middle-size" alt="" title="Diego VelázquezによるPixabayからの画像" loading="lazy">


# Service Workerとは
Service Workerは、ブラウザがWebページとは別にバックグラウンドで実行するJavaScriptになります。

# 利用ブラウザ/バージョン情報など
- Chrome v88.0.4324.146
- Vue.js v2.6.11

# 起きた不具合その１

## 事象
Service Worker上で、`setInterval`の処理を用意したところ、数分で止まるという報告が上がりました。
`setInterval`は、バックグランド上で定期的にある処理をするために用意したものです。

```js service-worker.js
const timer = setInterval(() => {
  // 1秒ごとに処理を実行
}, 1000)
```

## 原因
調べてみるとService Workerの活動には制限があるようでした。

またブラウザのDevToolを起動している場合は、Service Workerは常時活動中となり、`setInterval`の処理が止まることはありません。開発中はブラウザのDevToolを常時起動中であったため、本件不具合に気づかないという事態になりました...

[参考：Service Worker Lifetime](https://w3c.github.io/ServiceWorker/#service-worker-lifetime)


## 対応
`setInterval`の処理をService WorkerからVue.js側（Webアプリ側）に移動しました。

簡単な例ですが、下記のように実行したい画面のComponentに組み込みました。

```html sample1.vue
<template>
<!-- 省略 -->
</template>
<script>
export default {
  name: 'sample1',
  created () {
    const timer = setInterval(() => {
    // 1秒ごとに処理を実行
    }, 1000)
  }
}
</script>
```

## 補足
本記事は、`setInterval`に焦点を当てましたが、Service Worker側に用意したWebSocket受信処理も止まってしまったため、WebSocket受信処理もVue.js側に移動する対応も実施しました。

# 起きた不具合その２

## 事象
［Ctrl］＋［Shift］＋［R］キーでリロードすると、下記のエラーが出てVue.jsからService Workerへのメッセージ送信が失敗するという事象が起きました。

```
Uncaught TypeError: Cannot read property 'postMessage' of null
```

## 原因
［Ctrl］＋［Shift］＋［R］キーでリロードすると、Service Workerが解除され、下記の`controller`が`null`になったことが原因でした。

```
navigator.serviceWorker.controller.postMessage({ msg })
```

[Service Worker Controller](https://w3c.github.io/ServiceWorker/#dom-serviceworkercontainer-controller)を確認すると、

>navigator.serviceWorker.controller returns null if the request is a force refresh (shift+refresh).

の記載があり、［Ctrl］＋［Shift］＋［R］キーでリロードしたときに`controller`が`null`になるのは仕様でした。

## 対応
再度Service WorkerがWebアプリをコントロールする状態になるように下記を実施しました。
まずVue.js側に、Service Workerが`active`になったら、Service Worker側に`claim`するようにメッセージを送ります。

```js main.js
if ('serviceWorker' in navigator) {
  window.onload = async () => {
    // Service Workerの登録
    const registration = await navigator.serviceWorker.register('/service-worker.js')

    ...

    // Service Workerがactiveになったら、実行される
    const activeRegistration = await navigator.serviceWorker.ready
    // この段階では、まだcontrollerはnullのため、active.postMessageでメッセージを送信
    activeRegistration.active.postMessage({ action: 'claim' })
  }
}
```

次にService Worker側で該当のメッセージを受け取ったら、`self.clients.claim()`を実施します。

```js service-worker.js
self.onmessage = (message) => {
  if (message.data.action === 'claim') {
    self.clients.claim()
    return
  }
}
```
ここまで対応すると、Service WorkerがWebアプリをコントロールしている状態になります。
またService Workerがコントロールする状態になるまで、`navigator.serviceWorker.controller.postMessage`の処理は失敗します。
その失敗した処理のリカバリ方法として、下記のように画面をリロードして再実行するように対応しました。

```js main.js
if ('serviceWorker' in navigator) {
  window.onload = async () => {
    // Service WorkerがWebアプリをコントロール開始
    navigator.serviceWorker.oncontrollerchange = () => {
      window.location.reload()
    }
    const registration = await navigator.serviceWorker.register('/service-worker.js')

    ...

    const activeRegistration = await navigator.serviceWorker.ready
    activeRegistration.active.postMessage({ action: 'claim' })
  }
}
```

# 所感
Service Worker開発で起きた不具合を２例紹介しました。

なかなか解決策が見つからず辛いと感じることもありましたが、こうして考えた解決策を公開することができて、大変嬉しく思っています。
