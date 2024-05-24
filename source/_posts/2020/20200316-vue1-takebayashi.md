---
title: "その値、Vue.jsは監視していますか？～Vue.jsで値が更新されないときに気をつけるところ～"
date: 2020/03/16 11:49:57
postid: ""
tag:
  - フロントエンド
  - Vue.js
  - フロントエンド
  - 初心者向け
category:
  - Programming
author: 竹林康太
lede: "私が所属するコアテクノロジーチームでは、Futureの各プロジェクトでの生産性・品質向上および設計開発プロセスの標準化を目標に、内製ライブラリ・フレームワーク・インフラ等の提供を行っております。そんな内製フレームワークの一部として採用されているのがVue.jsです。フレームワーク自体の設計開発を行う一方、顧客・プロジェクト向け画面の開発を行うために、自分たちもそのフレームワークを用いた開発を行う機会がありました。今回はそんなとある画面開発をするにあたって、私がVue.jsをキャッチアップしていく過程の中で遭遇したトラブルに関する解決方法を共有します。"
---

# その値、Vue.jsは監視していますか？～Vue.jsで値が更新されないときに気をつけるところ～
## はじめに

こんにちは、TIG コアテクノロジーチーム竹林です。
こちらのブログでは前回 [その問い合わせ、AIが解決します！～Redmineチケットレコメンドシステムのご紹介～](/articles/20181031/) を書かせていただきました。

この記事を書いてから早くも1年半が経ち、間もなく社会人4年目を迎えようとしております。
新人の後輩たちや、競技プログラミング上級者なキャリア入社の凄腕な皆さんもチームメンバに加わり、個性豊かな楽しい職場になってまいりました。

ちなみに[前回の記事](/articles/20181031/)はAI(自然言語処理によるレコメンドシステム開発)に関するものです。まだご覧になっていない方はよろしければどうぞ！
さて、今回はAIではなくフロントエンド(Vue.js)の話です。

## コアテクノロジーチームについて

私が所属するコアテクノロジーチームでは、Futureの各プロジェクトでの生産性・品質向上および設計開発プロセスの標準化を目標に、内製ライブラリ・フレームワーク・インフラ等の提供を行っております。

[フューチャー株式会社 コアテクノロジーチーム \- Qiita Jobs](https://jobs.qiita.com/employers/future/development_teams/57)

そんな内製フレームワークの一部として採用されているのがVue.jsです。

フレームワーク自体の設計開発を行う一方、顧客・プロジェクト向け画面の開発を行うために、自分たちもそのフレームワークを用いた開発を行う機会がありました。

今回はそんなとある画面開発をするにあたって、私がVue.jsをキャッチアップしていく過程の中で遭遇したトラブルに関する解決方法を共有します。

## Vue.jsで値が更新されないとき？
### 事象について
Vue.jsで何かしらのAPIをaxios等で入手し、テーブル描画などの外部ライブラリと連携した際、外部ライブラリ側で値を書き換えてもうまく更新した値が取得できないケースが有りました。

私の場合、DB上のあるテーブルの一覧を[cheetah-grid](https://github.com/future-architect/cheetah-grid)を用いて表に描画し、[`<c-grid-check-column>`コンポーネント](https://www.npmjs.com/package/vue-cheetah-grid#available-vue-component-tag-names)によりチェック欄を設けてそのtrue/falseを取得しようとした際にうまく値が反映されておらず「あれ？おかしいぞ？」となりました。

### DBにあるデータ

ダミーのテーブルで例を示します。

|名前|職場|説明|
|---|---|---|
|Aさん|東京|フロントエンドエンジニア|
|Bさん|名古屋|バックエンドエンジニア|
|Cさん|大分|インフラエンジニア|


### 画面で見せたいデータ

DB上のテーブルを取得した上に、フロントエンド側でチェックカラムを追加します。
デフォルト値はfalseを入れておきます。

* [cheetah-grid](https://github.com/future-architect/cheetah-grid)では、[`<c-grid-check-column>`コンポーネント](https://www.npmjs.com/package/vue-cheetah-grid#available-vue-component-tag-names)を利用するとチェックカラムを簡単に用意することが出来ます。

|(★追加)チェックカラム|名前|職場|説明|
|---|---|---|---|
|true/false(デフォルト:false)|Aさん|東京|フロントエンドエンジニア|
|true/false(デフォルト:false)|Bさん|名古屋|バックエンドエンジニア|
|true/false(デフォルト:false)|Cさん|大分|インフラエンジニア|

ユーザがレコードごとのチェックカラムを操作し、その変更を検知できるかどうかを見てみます。

### 正しい例

```html
<template>
  <div>
    <h1>ユーザ一覧</h1>
    <!-- テーブル -->
    <c-grid :data="users">
      <c-grid-check-column field="check"></c-grid-check-column>
      <c-grid-column field="name">名前</c-grid-column>
      <c-grid-column field="workplace">職場</c-grid-column>
      <c-grid-column field="note"
                     width="200px">説明</c-grid-column>
    </c-grid>
    <!-- 値の更新を確認するため、テーブルの中身をそのまま出力してみる -->
    <p>テーブルの中身: {{ users }}</p>
  </div>
</template>

<script>
// import箇所省略

export default {
  name: 'users',
  components: {
  },

  data () {
    return {
      users: [] // cheetah-gridにバインドされる変数
    }
  },

  mounted () {
    const vm = this
    vm.onLoad()
  },

  methods: {
    /**
     * ユーザ一覧取得
     *
     * @returns {void}
     */
    onLoad () {
      const vm = this

      // バックエンドサーバからユーザ一覧データを取得
      vm.axios.get('/api/v1/users').then(response => {
        vm.users = response.data.map(e => {
          // チェックカラム用、デフォルトはfalse
          e.check = false
          return e
        })
      })
    }
  }
}
</script>
```

画面での出力:

下図のように、テーブルとデバッグ用にテーブルの中身がそれぞれ出力されます。
<img src="/images/20200316/photo_20200316_01.png" loading="lazy">

チェックカラムをクリックすると、チェックが付きます。
デバッグ用に出力したテーブルの中身データにも反映されています。
<img src="/images/20200316/photo_20200316_02.png" loading="lazy">

### うまくいかない例

当初、私は`forEach()`ループを用いた代入操作を行っていました。

* `onLoad()`メソッド以外共通のため省略

```js
onLoad () {
  const vm = this

  // バックエンドサーバからユーザ一覧データを取得
  vm.axios.get('/api/v1/users').then(response => {
    vm.users = response.data
    vm.users.forEach(e => {
      // チェックカラム用、デフォルトはfalse
      e.check = false
    })
  })
}
```

画面での出力:

チェックカラムをクリックしても、デバッグ用に出したデータは書き換わっていません。
<img src="/images/20200316/photo_20200316_03.png" loading="lazy">

## 解決方法
配列の各要素ごとの直接操作をやめ、代わりに`Array.prototype.map()`などを用いて**新しい配列インスタンス**を生成してあげるようにしましょう。

```js
onLoad () {
  const vm = this

  vm.axios.get('/api/v1/files').then(response => {
    // ★Array.prototype.map()でインスタンスを新規生成
    vm.users = response.data.map(e => {
      e.check = false
      return e
    })
  })
}
```

## なぜ配列の各要素ごとに直接操作すると値が更新されないのか
公式マニュアルの [リストレンダリング](https://jp.vuejs.org/v2/guide/list.html) に詳しく書かれています。

以下、 https://jp.vuejs.org/v2/guide/list.html#オブジェクトの変更検出の注意 からの引用です。

> 再度になりますが、現代の JavaScript の制約のため、Vue は**プロパティの追加や削除を検出することはできません**。
> (中略)
> Vue はすでに作成されたインスタンスに新しいルートレベルのリアクティブプロパティを動的に追加することはできません。

また、公式マニュアルの [リアクティブの探求](https://jp.vuejs.org/v2/guide/reactivity.html)も併せて参照してください。

配列の中に新たなプロパティを生やそうとしても、Vue.jsはそれを監視していないため、値の更新検知や再描画ができないよ。新しくインスタンスを作ってあげてね。ということでした。

## おわりに

今回のトラブルを通じてVue.jsの仕組みについてより理解が深まりました。

Vue.jsは便利で手軽ですが、このあたりの内部的な仕組みもしっかりと把握しておきたいですね。
