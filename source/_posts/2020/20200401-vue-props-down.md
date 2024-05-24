---
title: "Vue.js最初の難関、「props down, event up」を初心者にわかるように解説してみた"
date: 2020/04/01 10:30:55
postid: ""
tag:
  - Vue.js
  - フロントエンド
  - フロントエンド
  - 初心者向け
category:
  - Programming
thumbnail: /images/20200401/thumbnail.png
author: 東郷聡志
lede: "今回はVue.jsの最初の難関（だと思っている）「props down, event up」について、初心者が読んでもわかるような資料を用意してみようと思います。
プロジェクトで独自のコンポーネントを作ったり、会社として用意しているコンポーネントの利用、改良ができるようになってもらいたいという思いから、その導入を解説しようということです。"
---

# はじめに
こんにちは、とあるプロジェクトでアーキチームに所属している東郷です。

今回はVue.jsの最初の難関（だと思っている）「props down, event up」について、初心者（わたしが主に想定しているのは新卒入社の新人さんです）が読んでもわかるような資料を用意してみようと思います。

プロジェクトで独自のコンポーネントを作ったり、会社として用意しているコンポーネントの利用や改良ができるようになってもらいたいという思いから、その導入を解説しようということです。

ちなみに、私自身もアサインされて半年未満。Vue.jsを触り始めて4か月くらいです。
では、簡単なおさらいから始めていきます。

続編が公開されました。

* [Vue.jsのslotの機能を初心者にわかるように解説してみた](/articles/20200428/)

# Vue.jsとMVVM

props down, event upの理解のためにMVVMについて簡単に触れておきましょう。
下記は、Vueの[公式サイト(https://012-jp.vuejs.org/guide/)](https://012-jp.vuejs.org/guide/)から引用しました

> Vue.js はインタラクティブな Web インターフェイスを作るためのライブラリです。
> 技術的に、Vue.js は MVVM パターンの ViewModel レイヤに注目しています。それは two way (双方向)バインディングによって View と Model を接続します。実際の DOM 操作と出力の形式はディレクティブとフィルタによって抽象化されています。

初心者にとってはMVVM パターンと言われてもピンとこないと思います。
そこで、導入として例を交えながら詳しく解説します。

## MVVMはModel-View-ViewModelの頭文字
下の図はVue.jsの公式サイトから拝借しました。
図で見ると何となく分かった感じがしますが、何となくの理解ではなく確実に理解しましょう。
<img src="/images/20200401/photo_20200401_01.png" loading="lazy">

[Vue.js 公式サイト(https://012-jp.vuejs.org/guide/)](https://012-jp.vuejs.org/guide/)より


||実体|役割|
|---|--------------|-------------------------------------------------|
|model|JavaScrptのコード|データ処理の主体|
|view|DOM(最終的なhtml)|人間に情報を伝える、操作を受け付ける末端|
|ViewModel|vue.js|modelで処理したデータをどんなふうにveiwに流し込むかの制御、viewで受けた操作をmodelに伝える|

なぜ、アルファベットで表現してまで分割して考えるのか？それは、具体例を考えれば簡単に理解できるはずです。

ユーザに何らかのデータを伝えるとき、どんな見せ方をしますか？あるいはどんな見方をしたいですか？文章、表、写真、動画、音楽の再生など、データに合わせて適切な見せ方が存在するはずです。では、適切な見せ方が決まって同じ種類のデータを扱うのなら、ある種のテンプレートにデータを流し込んで決まった見せ方にしますよね？

もし変えてしまったらユーザーは混乱しますし、そんな複雑なサイトを作るのは困難かつ望ましくありません。

上記の話の見せ方（ある種のテンプレート）の部分をview(見た目)としてDOMが担当します。viewに流しこむデータの取得・加工、viewで受けた操作の命令を受けるのはmodelとしてのJavaScriptです。（写真管理のwebサービスなんかであればダウンロード操作など）

## MVVMの実現のために重要なData binding

Vue.jsがMVVMを実現するために取り入れている仕組みにData bindingがあります。

Data bindingは、よく「データを流し込む目印を打ち込む」と表現されます。まさにこの言葉がすべてを表しています。本解説の肝、「props down, event up」で再度、上記の表現について触れます。Data Bindingは、その言葉が表すように __"データを特定の個所に結びつけます"__。

しがたって、元のデータが途中で変わっても目印を打ち込んであるので、自動で（Vue.jsが勝手に）目印を打ち込んだ箇所の値を書き換えてくれます。素敵ですね。

一方で誤解しやすいのがこのData bindingという考え方です。

ついつい、Vue.jsにおけるData bindingは、常に双方向にデータが流れ込むものだと思ってしまいます。（特にv-modelに値をバインドすれば値の変更に対応できることを知ったばかりの初心者さんはそう思ってしまう。）もちろん、Vue.jsとしては双方向にデータのやり取りは可能です。しかし、単純なData bindingだけですべての仕様を実現することはできません。

次章では、実際のコードを見ながらData bindingがどんなふうに機能しているかを見ていきましょう。

※初心者の皆さんへ：
ちなみに、MVVMやData bindingはVue.js専用の言葉ではありません。
MVVMはプロダクトの構成パターン、Data bindingは仕組みの名前であり他の言語やFrameworkでも当然登場します。

# props down, event up が何を意味するのか
ちょっと前置きが長くなりましたが、本題のprops down, event upについて、実例を交えながら解説をしていきます。

業務でVue.jsを使うとなると普通はVueCLIを用いた単一コンポーネントファイルによる開発になると思います。当社でもその形式を利用しています。

この記事の題材もそれに倣って、下記のようなファイルの構成で説明を進めます。

```bash
# フォルダの階層構造
src
 └ components
    ├ ParentLayer.vue
    ├ ChildLayer.vue
    └ GrandChildLayer.vue

# Vue内での構造
App.vue ─────────────────────────
│ ParentLayer.vue ─────────────────────────
│ │ ChildLayer.vue ─────────────────────────
│ │ │ GrandChildLayer.vue ─────────────────────────
│ │ │ │
```

※**2020/04/14追記**: なお今回の題材では、3つのコンポーネントを親子孫関係にしていますが、何階層にもわたってデータを連携するのは現場ではあまりお勧めされません。データとイベントの管理が大変になりますのでemitの乱用は避けるべきです。
親コンポーネントがもつデータを浅い階層でやり取りするため、再利用性の高いコンポーネントの利用/作成のためと思ってご覧ください。場合によってはVuexを使ったデータ管理も有効かもしれません

実際の画面はこんな感じです。
<img src="/images/20200401/photo_20200401_02.png" class="img-small-size" loading="lazy">

`components`配下のvueファイルのソースを下記に示します。
`App.vue`は中身を空っぽにして`ParentLayer.vue`を表示しているだけですので割愛します。

```html ParentLayer.vue
<template>
  <div class="parent">
    <!-- 説明のための表示 -->
    <p>Parent:{{ model.testData }}</p>
    <!-- THML5 標準の要素に対するデータバインディング -->
    <input id="ParentInput"
           type="text"
           v-model="model.testData"/>
    <!-- 自作のコンポーネントに対するデータバインディング -->
    <child-layer class="child"
                 v-model="model.testData"></child-layer>
  </div>
</template>

<script>
import ChildLayer from '../components/ChildLayer'

export default {
  name: 'ParentLayer',
  components: {
    ChildLayer
  },
  props: {
    msg: String
  },
  data () {
    return {
      model: {
        testData: null  // 上記のtemplete部で合計3箇所にバインドされている。
      }
    }
  }
}
</script>

<style scoped lang="less">

.parent {
  border: solid gray;
  background: pink;
  height: 300px;
  width: 300px;
}

.child {
  margin-left: 10px;
}

</style>
```

`model.testData`が3か所にbindされています。

1つ目は、`templete`で直接使用するマスタッシュ構文で、
2つ目は、HTML5標準の`input`タグに`v-model`ディレクティブで、
3つ目は、今回自作した`children-layer`タグに`v-model`ディレクティブで
使用しています。


1つ目のマスタッシュ構文は参照だけです。何も困りませんし、`model.testData`が変更されれば勝手に変わります。
2つ目の`input`タグの`v-model`ディレクティブでは、テキストボックスに`model.testData`の値が勝手に入ってきますし、

上記の実装ならテキストボックスを編集すれば、`model.testData`がバインドされた箇所すべてが変更された値に変わります。勝手に値が流れ込んできてくれるし、それを編集すれば他にもその変更が伝わります。つまり、**双方向に値が伝達されていっているように見えてしまいます**。

ここが、Vue.jsのありがたいところであり、props down, event upの理解を困難にする部分です。入力内容が`model.testData`に自動反映される仕組みは次の`ChildLayer.vue`の説明と合わせて行います。


3つ目の`children-layer`タグに`v-model`ディレクティブで指定された値がどんなふうに`ChildLayer.vue`が受け取り、処理するかについてですが、ここからはコンポーネントの理解を深めつつ見ていく必要があります。では、`ChildLayer.vue`のソースを見ながら確認します。

```html ChildLayer.vue
<template>
  <div class="child">
    <p>Child:{{ value }}</p>
    <input id="ChildInput"
           type="text"
           :value="value"
           @input="test"/>
    <button @click="clickChildButton(value)">clickChildButton</button>
    <grand-child-layer class="grand-child"
                       v-model="value"></grand-child-layer>
  </div>
</template>

<script>
import GrandChildLayer from '../components/GrandChildLayer'

export default {
  name: 'ChildLayer',
  components: {
    GrandChildLayer
  },
  props: {
    value: {
      type: String
    },
    msg: String
  },
  methods: {
    test (e) {
      const vm = this
      vm.$emit('input', e.target.value)
    }
  }
}
</script>

<style scoped lang="less">

.child {
  border: solid gray;
  background: palegreen;
}

.grand-child {
    margin-left: 10px;
}

</style>
```

`ParentLayer.vue`で`v-model="testData"`として流れ込んできた値は、`ChildLayer.vue`でどんなふうに受け取り、処理しているのでしょうか？

答えは、`ChildLayer.vue`の`props`の`value`プロパティです。`ParentLayer.vue`では`testData`という変数で扱われていた値は、`ChildLayer.vue`では`value`プロパティの値として扱われます。こうして、親コンポーネントから子コンポーネントへと値が流れ込んできます。`ChildLayer.vue`内では、その`value`を4箇所で使っています。

1つ目は、マスタッシュ構文で、
2つ目は、`input`の`:value`で、
3つ目は、`button`タグのクリックイベントの引数で、
4つ目は、さらに子コンポーネントの`grand-parent-layer`で使用しています。

`ParentLayer.vue`との違いに気づきましたか？`button`タグがあることが一番目立ちますがそれ以外です。

`ParentLayer.vue`では、`input`タグに対して`v-model`を使ってバインドしていたのに`ChildLayer.vue`では、`:value`にバインドしていて、`@input`なんていうイベントも追加されています。なぜ、こんな違いがあるかというと、もう一つ見逃してはいけない違いがあるからです。

それは、バインドしている値が`data.model`に属している値か、コンポーネントのプロパティかということです。

プロパティはあくまで**読み取り専用**であり、それを直接書き換えることはできません。なぜ直接書き換えられないかというと、プロパティは、親コンポーネントが子コンポーネントに対して付与するものです。子コンポーネントから見た親コンポーネントは絶対的な存在で逆らうことは許されていません。子コンポーネントが自らのプロパティを勝手に変えるということは、親コンポーネントでの指定と不整合が起きることを意味します。そんなことができたら、混乱することは必至です。

では、`ParentLayer.vue`や`ChildLayer.vue`のテキストボックスを変更したら、しっかりと変更が伝わったのは何故でしょうか？

答えは、`@input`が重要な役割を果たしているからです。この`@input`はそれが記載されているタグの`input`イベントが呼ばれるたびに実行され、そのたびに`test`という~~センスのない~~名前のメソッドを実行します。

```javascript @input="test"
test (e) {
  const vm = this
  vm.$emit('input', e.target.value)
},
```
上記の`test`というメソッドは何をしているかというと`$emit`というメソッドを実行しています。`'input'`というメソッドを引数`e.target.value`で実行してほしいとお願いしているメソッドです。そう、勝手にプロパティを変更してはいけないので、変更する権限を持つ親コンポーネントに変更をお願いしているのです。

ここで、`ParentLayer.vue`内の`input`タグでの双方向な値のやり取りを解説したいと思います。`これは、親コンポーネントに対して、input`タグに指定された`v-model`は、実は、下記の実装と同じです。

```html
<input id="ParentInput2"
       type="text"
       :value="model.testData"
       @input="ParentInput2"/>
```

```javascript
methods: {
  ParentInput2 (e) {
    const vm = this
    vm.model.testData = e.target.value
  }
}
```

この`input`タグはプロパティではなく、普通のデータを扱っているわけですし、親コンポーネントへemitする必要はないだけで、
裏ではVue.jsが値が双方向に反映されているように見せているのです。

先の`child-layer`タグに戻ってしまいますが、こちらも

```html ParentLayer.vue
    <!-- 自作の要素に対するデータバインディング -->
    <child-layer class="child"
                 :value="model.testData"
                 @input="catchEmit"></child-layer>
```

```javascript
  methods: {
    catchEmit (e) {
      const vm = this
      vm.model.testData = e.target.value
    },
    // ...
  }
```

と記載するのと同じことになります。流れを追っていくと、

子コンポーネントの
　`templete`部で__inputイベント__によって__メソッドA__を起動
　`script`部の__メソッドA__によって親コンポーネントへと__イベントB__をemit
親コンポーネント
　`templete`部のv-on(@)ディレクティブで__イベントB__を受けて__メソッドC__を起動
　`script`部の__メソッドC__によって親コンポーネントのデータの書き換え

ということをしています。

つまり、親から子へのデータの流れはData bindingによるデータの流し込み（props down:流れは高いところから低いところへ）、子から親へのデータの流れは`$emit`によるイベントとメソッドのリレー(event up:上の立場の親が子のイベントを拾い上げる)ということで双方向バインディングを実現しています。

また、こういった複雑でわかりにくい複数の指定をひとまとめに指定することができる構文を__糖衣構文__といいます。つまり、`ParentLayer.vue`と`ChildLayer.vue`にある`input`タグの指定はVue.jsから見たら同じなのです。

ここで、`GrandChildLayer.vue`を見てみましょう。ソース内にもコメントで書いていますが、`props`の`value`を直接`v-model`に放り込んでいるので、テキストボックスに入力をするたびにエラーが出ます。


```html GrandChildLayer.vue
<template>
  <div class="grand-child">
    <p>GrandChild:{{ value }}</p>
    <!-- v-modelに直接propsのvalueを指定しているため、
         inputタグのinputイベントが呼ばれるたびに
         コンソールにエラーが出て、値の更新も行われない -->
    <input id="GrandChildInput"
           type="text"
           v-model="value"/>
  </div>
</template>

<script>
export default {
  name: 'GrandChildLayer',
  props: {
    value: String,
    msg: String
  }
}
</script>

<style scoped lang="less">

.grand-child {
  border: solid gray;
  background: paleturquoise;
}

</style>
```

`v-model`が`:value`と`@input`を一つにまとめて書いていると表現しましたが、`value`プロパティじゃないほかの名前のプロパティへ値を渡したいこともあるでしょう。`@input`でないイベントを拾いたいことことも考えられます。

Vue.jsとしてそういった要望に対応できるにmodelオプションというものを用意されています。必要に応じて勉強してみてください。また`props`や`$emit`を使わない親子間データ連携もあります。特徴も違います。ぜひ使い分けてみててください。

# まとめ

最後に言葉でしっかりと表現して自分のものにしておきましょう。

* Data bindingはあくまで、データの流れ込みの目印である
* 双方向に見えても、それは糖衣構文で暗黙的に変換がかかっているだけである。
* 親コンポーネントへのデータ連携は`$emit`を使って実装しないといけない。(親でもそれを拾い上げる実装が必要)
