---
title: "CheetahGrid+Vue.jsをエンプラで使ってみた"
date: 2020/09/24 00:00:00
postid: ""
tag:
  - CheetahGrid
  - Vue.js
category:
  - Infrastructure
thumbnail: /images/20200924/thumbnail.png
author: 信田和哉
lede: "こんにちは！今回は[CheetahGrid][cheetahgrid-hp]＋[Vue.js][vue-hp]でエンプラ系システムを構築した際の、採用した理由と実装のポイントのご紹介をしようと思います。[CheetahGrid][cheetahgrid-hp]について存じ上げないよーとか、触ったことがないよーという方は、[入門編][beginner-link]も御覧くださいね。初めての投稿ですが、最後までお付き合いいただければ嬉しいです。"
---

<img src="/images/20200924/top.png" class="img-small-size" loading="lazy">

# はじめに

こんにちは！信田です。

[CheetahGrid][cheetahgrid-hp]＋[Vue.js][vue-hp]でエンプラ系システム [^3]を構築した際の、採用した理由と実装のポイントのご紹介をします。[CheetahGrid][cheetahgrid-hp]について存じ上げないよーとか、触ったことがないよーという方は、[入門編][beginner-link]も御覧ください。

 [^3]: エンタプライズ系システムのこと。 https://www.ipa.go.jp/sec/softwareengineering/std/ent.html

初めての投稿ですが、最後までお付き合いいただければ嬉しいです。

## ちょっとした自己紹介

* 新卒で今の会社（[Future株式会社][future-hp]）に入社して2020年時点で9年目
* 物流（5年）、公共インフラ（半年）、アパレル（3年）といった業界のお客様を経験
* 大規模プロジェクト（ピーク時100+名）に所属することが多い
* エンプラアプリの要件定義～構築～運用保守を経験。主に、バックエンド系の経験が多くJavaやSQLでの開発経験を積む
* 並行して、開発環境の整備やアプリ実行環境の整備・運用といったインフラ寄りのミドルウェア領域を担当
* 現在は社内の技術系組織（[TIG][tig-hp]）に所属
* フロントエンドの経験を積みたくなり、今回のプロジェクトにジョイン

# CheetahGrid+Vue.jsの採用に至るまでの経緯

## プロジェクト概要
[CheetahGrid][cheetahgrid-hp]＋[Vue.js][vue-hp]を採用した今回のプロジェクトをさらっとご紹介します。

* アパレルのお客様向けソリューションのフレームワーク刷新プロジェクト
* 業務ロジックの変更は基本的に行わない
* 旧は約10年前に構築し、JSF2（Primefaces）を採用
* 新ではVue.jsを採用
* DBなどの他のミドルウェアもOSS利用に変更

## 課題

今回の刷新をする上で、課題となっていたのは以下のような点です。

### 画面描画のパフォーマンス問題

様々な業界のエンプラシステムを構築する上で、必ず一度は苦しむであろうパフォーマンスチューニング。アパレル業界のお客様でも同様でした。例えば、「配分 [^1]」と呼ばれるディストリビューター業務があり、一覧部の項目数は店舗✕SKU [^2]でかなりの数になります。結果として、JSFベースの画面では項目分だけ部品が描画されるなどHTMLが膨れ上がり、画面がもさっとしてしまっていました。実際に毎日業務で利用する人にとってはかなりのストレスになります。

この対応策として、

* 必須の検索条件を増やして検索結果が膨らまないようにする
* 表示できる検索結果件数に制限を設ける（500件以上検索された場合はエラーにしたりアラートにしたり）
* ページングや遅延ロードによって一度に表示する件数を減らす
* 遅いことを受け入れてもらう（←　運用回避という最終手段）

といったことをしていました。

パフォーマンスが出ない画面で商用ライブラリを利用したこともありますが、「開発できる人が限られ、後々の運用にコストがかかる」、「ライセンス条項を気にする必要がある」など、商用ライブラリ特有の問題が発生したりしていました。

### Excel中心の業務設計

エンプラでシステム化する際によく遭遇するのは、システム化前に利用していた仕組みの呪縛です。その中でも、システム化前にExcelで管理している業務は多く、マクロや関数などを利用して独自の進化を遂げ、一子相伝の秘伝のタレ化している業務に出会うことが多々あります。この問題点は、属人化だけではなく、VBAのバージョンによって動かなくなってしまうといった問題も孕んでいます。

昨今のシステムWeb化の流れがある中で、Excel業務が残っていてはWebだけでは完結できずシステム外の仕組みも残ってしまい、いつまでも業務的な負債を抱えた状態が続いてしまうことになります。

これらの課題を解決すべく候補として挙がったのが、[CheetahGrid][cheetahgrid-hp]でした。

# 実装例
今回のプロジェクトにおける[CheetahGrid][cheetahgrid-hp]を用いた実装をいくつか紹介します。

## 開発環境
* Node.js(v14.4.0)
* npm(6.14.5)
* Nuxt.js(v2.13.3)
* Cheetah Grid(0.22.3)

npmでCheetah Gridを使用するには、下記のコマンドを実行してください。

```sh
npm install -S cheetah-grid
```

※開発環境については、[入門編の開発環境][beginner-dev-env]に倣っています。

## 実装した画面と全体ソース
今回実装した画面は以下です。
<img src="/images/20200924/2020-09-23_20h26_14.png" loading="lazy">
この画面全体のソースコードは以下です。

```html sample.vue
<template>
  <div>
    <div style="height: 500px; border: solid 1px #ddd; margin: 50px;">
      <label for="inputAllColumn1"
             type="text">
        カラム1
      </label>
      <input id="inputAllColumn1"
             type="text"
             v-model="inputAllColumn1">
      <button type="button"
              name="一括反映"
              @click="onClickInputAllColumn1">
        一括反映
      </button>
      <br>
      <label for=""
             type="text">
        行追加ボタン（最後尾に追加）
      </label>
      <button type="button"
              name="行追加"
              @click="onClickAddRow">
        行追加
      </button>
      <c-grid ref="grid"
              :data="records"
              :frozen-col-count="3"
              :allow-range-paste="true"
              @changed-value="onChangedValueRec($event)">
        <c-grid-column field="id"
                       width="50">
          ID
        </c-grid-column>
        <c-grid-column width="50"
                       :icon="getDeleteIcon"
                       :action="onDelete">
          削除
        </c-grid-column>
        <c-grid-link-column href="link"
                            :icon="getLinkIcon"
                            width="50">
          詳細
        </c-grid-link-column>
        <c-grid-input-column field="column1"
                             width="auto"
                             :message="validateNumCol"
                             @changed-value="onChangedValueRec($event)">
          カラム1（数値1-4桁）
        </c-grid-input-column>
        <c-grid-input-column field="column2"
                             width="auto">
          カラム2
        </c-grid-input-column>
        <c-grid-input-column field="column3"
                             width="auto">
          カラム3
        </c-grid-input-column>
      </c-grid>
    </div>
    <div class="grid-sample"></div>
  </div>
</template>
<script>
import * as cGridAll from 'vue-cheetah-grid'
export default {
    name: 'service',
    components: {
        ...cGridAll
    },
    mounted() {
        this.setRecord()
    },
    data () {
        return {
          inputAllColumn1: null,
          records: []
        }
    },
    methods: {
        /**
         * 一覧に表示するデータを作成する
         * @return {void}
         */
        setRecord () {
            const vm = this
            for (let i=0; i < 100000; i++) {
              vm.records.push(
                {
                  id: i + 1,
                  column1: `カラム1-${i+1}`,
                  column2: `カラム2-${i+1}`,
                  column3: `カラム3-${i+1}`,
                }
              )
            }
        },

        /**
         * 削除ボタン押下イベント
         * @param {object} rec 行データ
         * @return {void}
         */
        onDelete (rec) {
            const vm = this
            vm.$delete(vm.records, vm.records.indexOf(rec));
        },

        /**
         * 行追加ボタン押下イベント
         * @return {void}
         */
        onClickAddRow () {
          const vm = this
          let maxId = 0
          vm.records.forEach(rec => {
            if( rec.id > maxId ) {
              maxId = rec.id
            }
          })
          vm.records.push(
            {
              id: maxId + 1,
              column1: `カラム1-${maxId+1}`,
              column2: `カラム2-${maxId+1}`,
              column3: `カラム3-${maxId+1}`
            }
          )
        },

        /**
         * 行変更イベント処理
         * @param {object} event イベントオブジェクト
         * @returns {void}
         */
        onChangedValueRec (event) {
//          alert(`カラムの値が変わったよ：${event.value}`)
        },

        /**
         * カラム1一括反映ボタンクリックイベント
         * @returns {void}
         */
        onClickInputAllColumn1 () {
          const vm = this
          for ( let i = 0 ; i < vm.records.length ; i++ ) {
            vm.records[i].column1 = vm.inputAllColumn1
          }
          // 再描画
          vm.$refs.grid.invalidate()
        },

        /**
         * 数値カラムのバリデーションメソッド
         * @param {object} rec 一行データ
         * @returns {String} メッセージ
         */
        validateNumCol (rec) {
          return !rec.column1.match('^[0-9]{1,4}$') ? 'エラー：1から4桁の数値を入力してください。' : ''
        },

        /**
         * 遷移用アイコンを取得する
         * @return {object} アイコン情報
         */
        getLinkIcon () {
            return {
                className: 'material-icons',
                content: 'link',
                color: 'cornflowerblue'
            }
        },

        /**
         * 削除用アイコンを取得する
         * @return {object} アイコン情報
         */
        getDeleteIcon () {
          return {
            className: 'material-icons',
            content: 'delete',
            color: 'deepskyblue'
          }
        }
    }
}
</script>
```

## 範囲ペースト機能
まずは範囲ペースト機能です。クリップボードにコピーしたTSVデータを貼り付けてGrid上に反映することができます。

```html
      <c-grid ref="grid"
              :data="records"
              :frozen-col-count="3"
              :allow-range-paste="true"
              @changed-value="onChangedValueRec($event)">
```

範囲ペーストを有効化するには`c-grid`に`:allow-range-paste="true"`を指定するだけです！

以下のようなExcel上のデータをコピーし、


<img src="/images/20200924/2020-09-22_00h23_27.png" class="img-small-size" loading="lazy">

`Ctrl+V`でペーストして反映します。

<img src="/images/20200924/capture-range-paste_(1).gif" loading="lazy">

また、以下のようにExcel操作でよく使う`Ctrl+down`で全選択してコピーするような一括ペーストも`c-grid`上で可能になっています。

<img src="/images/20200924/capture-copy-and-paste-row_(1).gif" loading="lazy">

この範囲ペースト機能を利用すればWeb上でExcelライクな操作が可能となり、既存の仕組みがExcel運用だったとしても`c-grid`へ置き換えることも現実的な選択肢となりうると思います。

実際に今回のプロジェクトにおいてはExcel運用をやめ、`c-grid`を利用したWeb上での運用に置き換えを行いました。

## 一括反映

一括反映は`c-gird`の外から値を反映するための仕組みの一例として紹介します。

範囲ペースト機能を利用して列単位に一括して反映でも同じ効果を得られますが、こちらを利用すればすべてがWeb上のみ（クリップボードも利用しない）で完結させることが可能になります。

```html templateタグ内
      <label for="inputAllColumn1"
             type="text">
        カラム1
      </label>
      <input id="inputAllColumn1"
             type="text"
             v-model="inputAllColumn1">
      <button type="button"
              name="一括反映"
              @click="onClickInputAllColumn1">
        一括反映
      </button>
```
```js scriptタグ内
        /**
         * カラム1一括反映ボタンクリックイベント
         * @returns {void}
         */
        onClickInputAllColumn1 () {
          const vm = this
          for ( let i = 0 ; i < vm.records.length ; i++ ) {
            vm.records[i].column1 = vm.inputAllColumn1
          }
          // 再描画
          vm.$refs.grid.invalidate()
        },
```

<img src="/images/20200924/capture-inpute-all.gif" loading="lazy">

仕組みは簡単で、一括反映ボタンの`click`イベントにて`c-grid`で表示しているデータセットの値を`c-gird`外の`inputAllColumn1`で置き換えています。
ここでミソなのが、**再描画**（`vm.$refs.grid.invalidate()`）です。

``` Gridのデータ
    data () {
        return {
          inputAllColumn1: null,
          records: []
        }
    },
```
`records: []`で定義しているため、`records`の各要素はリアクティブな変更の対象となりません。
そこで、JavaScriptで変更した値を`c-grid`で表示させるために`c-grid`の[invalidate API][cheetahgrid-invalidate]を利用して、変更後の`records`で再描画させています。
※`vm.$refs.grid.invalidate()`をコメントアウトすると、一括反映ボタンを押下しても見た目には何も起こりませんが、`records`の値は変更された状態になります。

`records`の値を設定する際に`$set`でリアクティブにしたりすることも可能ではあります。ただし、エンプラで利用する際にはサーバ側の検索APIを叩いてその結果が`records`に入ることになり、検索結果の件数によってはパフォーマンス悪化の要因になりえますし、返却する項目名も変わる可能性があります。そのため、今回の実装のように再描画を一度やってしまう方が全体的なパフォーマンスとしては良いものになるのではないかと思います。なんと言っても、[CheetahGrid][cheetahgrid-hp]は描画がめちゃくちゃ早いので再描画でもストレスはありません😎

### 行追加
エンプラでの利用シーンとしては、明細行を追加したい場合などで、アパレルでは材料メーカーへの支払明細の追加などが例として挙げられます。

```vuejs templateタグ内
      <label for=""
             type="text">
        行追加ボタン（最後尾に追加）
      </label>
      <button type="button"
              name="行追加"
              @click="onClickAddRow">
        行追加
      </button>
```
```javascript scriptタグ内
        /**
         * 行追加ボタン押下イベント
         * @return {void}
         */
        onClickAddRow () {
          const vm = this
          let maxId = 0
          vm.records.forEach(rec => {
            if( rec.id > maxId ) {
              maxId = rec.id
            }
          })
          vm.records.push(
            {
              id: maxId + 1,
              column1: `カラム1-${maxId+1}`,
              column2: `カラム2-${maxId+1}`,
              column3: `カラム3-${maxId+1}`,
            }
          )
        },
```
<img src="/images/20200924/capture-add-row_(1).gif" loading="lazy">
実装としては、IDの最大値＋１を計算し、`records`へ追加しています。これだけで`c-grid`に新たな行を追加することが可能です。

### 入力データのバリデーション
エンプラ以外でも必須の機能と言っても過言ではない画面入力値のバリデーション実装です。

```vuejs templateタグの実装（c-grid内の各カラム）
        <c-grid-input-column field="column1"
                             width="auto"
                             :message="validateNumCol"
                             @changed-value="onChangedValueRec($event)">
          カラム1（数値1-4桁）
        </c-grid-input-column>
```
```javascript scriptタグの実装（c-grid内の各カラム）
        /**
         * 数値カラムのバリデーションメソッド
         * @param {object} rec 一行データ
         * @returns {String} メッセージ
         */
        validateNumCol (rec) {
          return !rec.column1.match('^[0-9]{1,4}$') ? 'エラー：1から4桁の数値を入力してください。' : ''
        },
```
<img src="/images/20200924/2020-09-23_21h08_40.png" class="img-small-size" loading="lazy">

`:message="validateNumCol"`にてバリデーション用の関数を呼び出し、エラーの場合にエラーメッセージを返却するように実装します。カラム1のいずれかに4桁以内の数字**以外**を入力した場合にエクスクラメーションマークが表示されることが確認できるでしょう。

引数には一行データ（rec）がバインドされるようになっているので、他のカラムとの相関バリデーションも実装することができます。

### イベント処理

カラムの値が変わった場合やフォーカスした場合など、何かしらのイベント処理を行う場合の実装です。
**※`alert('カラムの値が変わったよ')`のコメントアウトを外してください。**

```vuejs templateタグの実装（c-grid内の各カラム）
        <c-grid-input-column field="column1"
                             width="auto"
                             :message="validateNumCol"
                             @changed-value="onChangedValueRec($event)">
          カラム1（数値1-4桁）
        </c-grid-input-column>
```
```javascript scriptタグの実装（c-grid内の各カラム）
        /**
         * 行変更イベント処理
         * @param {object} event イベントオブジェクト
         * @returns {void}
         */
        onChangedValueRec (event) {
          alert(`カラムの値が変わったよ：${event.value}`)
        },
```

<img src="/images/20200924/2020-09-23_21h14_26.png" class="img-middle-size" loading="lazy">

今回は各`c-grid`コンポーネントの`changed-value`イベントの関数（`onChangedValueNumCol($event)`）内でダイアログ表示するようにしています。

カラム入力値は`event.value`、一行データは`event.record`のようにイベントオブジェクトから取得でき、関数内で利用することが可能です。

また、`c-grid`自体にもイベントのバインドが可能です。

```vuejs templateタグの実装（c-grid全体）
      <c-grid ref="grid"
              :data="records"
              :frozen-col-count="3"
              :allow-range-paste="true"
              @changed-value="onChangedValueRec($event)">
```
他にもバインド可能なイベントは用意されていますが、各`c-grid-*`コンポーネントによって利用できるイベントも異なるので[コンポーネント一覧ページ][cheetahgrid-components]より利用可能なイベントを確認して実装してみてください。

# まとめ

## 恩恵

今回のプロジェクトにおいては[CheetahGrid][cheetahgrid-hp]を利用することで画面描画までの速度が大幅に改善しました。今回のフレームワーク刷新に伴って開発時に新旧画面を比較しつつ実装するわけですが、同じデータ量で比べた場合に旧で30秒くらい待っていたのが、新では数秒で描画できてしまうのを体感すると本当に感動します。（[CheetahGrid][cheetahgrid-hp]の速度について詳しくは[こちら][cheetahgrid-performance]）

上記のサンプルコードでも画面表示してもらえるとわかりますが、6カラムを1,000レコード描画するのにかかる時間はトータル1～2秒ほどでした。（ちなみに、6カラム✕100,000レコードでも1.5秒ほどです。）

この圧倒的な速さの恩恵を[CheetahGrid][cheetahgrid-hp]を採用するだけで得られるのです。

また、Excelライクな操作について今回はコピー＆ペイストについてご紹介しましたが、「入力データのバリデーション」でご紹介したとおり各イベントのバインドが可能であり呼び出す関数内でJavaScriptを実行できることから、Excelの機能、ましてや、Excelでは実現が難しい機能でも実装できる、という業務をWeb上で完結させる可能性も垣間見れたのではないでしょうか。

## 注意点

見ていただいたとおり[CheetahGrid][cheetahgrid-hp]は描画は非常に早いのですが、イベント処理やバリデーションロジックの実装は開発者の腕次第です。よって、場合にによっては描画以外の部分で時間がかかり、全体として遅くなってしまいます。例えば、毎回全データのチェックが走るような書き方をしてしまうと、カラムクリックや入力のたびに画面がもっさりしてしまうので、ボタン押下時だけにチェックを寄せるなどのロジックの最適化は必要になります。

# 最後に
弊社内でも[CheetahGrid][cheetahgrid-hp]＋[Vue.js][vue-hp]の組み合わせで本格的に業務システムを作成した初のプロジェクトだったこともあり手探りでの開発ではありましたが、これまでのエンプラのフロントエンド開発で苦労した点がほとんど問題にならず、使ってみてホントに良いなと思いました。


ある先輩は、「お客様は我々と業務要件を詰めることはできるが、パフォーマンスはお客様にはどうしようもない。だけど、使ってみて実は一番気になるのは動作が遅かった場合だし遅いと使ってくれない。だからこそプロとしてパフォーマンスに妥協してはいけない。」のようなことを言っていて感銘を受けたものです。それもあって私自身もいくつかのプロジェクトで遅い画面というものに出会うことは少なくなく毎回考えを振り絞ってきたわけですが、[CheetahGrid][cheetahgrid-hp]を利用すればそれらのいくつかの解になり得るものだと思いました。


チューニングによってパフォーマンスが改善していくのも気持ちがいいものでその機会が減ってしまうのはちょっぴり悲しさもありますが😅、最初から速いに越したことはないですよね！

パフォーマンスが遅くて困っている方、[CheetahGrid][cheetahgrid-hp]ぜひ試してみてください！

 [^1]: 配分：各店舗の売上や在庫、納品の管理や分析を行い、どの店舗にどのような商品をどれだけ割り振るかを決める業務
 [^2]: SKU：Stock Keeping Unit。商品の管理単位。アパレルではブランド・商品番号・サイズ・カラーの組み合わせとすることが多い

[cheetahgrid-hp]:https://future-architect.github.io/cheetah-grid/
[cheetahgrid-performance]:https://future-architect.github.io/cheetah-grid/documents/introduction/
[cheetahgrid-components]:https://future-architect.github.io/cheetah-grid/documents/api/vue/components/
[vue-hp]:https://jp.vuejs.org/index.html
[beginner-link]:/articles/20200901/
[beginner-dev-env]:/articles/20200901/
[future-hp]:https://www.future.co.jp/
[tig-hp]:https://www.future.co.jp/recruit/new/about/tech/engineers_corps/
[motivation-performance]:https://qiita.com/ota-meshi/items/a2b68e132fa7c5a32c3d
[cheetahgrid-invalidate]:https://future-architect.github.io/cheetah-grid/documents/api/vue/components/CGrid.html#methods

