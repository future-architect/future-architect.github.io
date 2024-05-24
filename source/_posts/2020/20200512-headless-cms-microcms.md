---
title: "日本製HeadlessCMSのmicroCMSを触ってみた"
date: 2020/05/12 09:48:20
postid: ""
tag:
  - Vue.js
  - フロントエンド
  - CMS
  - HeadlessCMS
category:
  - Programming
thumbnail: /images/20200512/thumbnail.png
author: 三村遼
lede: "TIG DXチーム　アルバイターの三村です．今回はHeadlessCMSを利用したタスクをやることになりました．私自身HeadlessCMSどころかCMSを聞いたことすら無かったので，初めてCMS使ってみるにあたって感じたことを共有出来たらと思い本記事を作成させていただいております．"
---
# はじめに

はじめまして！TIG DXチーム　アルバイターの三村です．

普段は大学院生をしておりフューチャーには [AtCoder Jobs](https://jobs.atcoder.jp/) 経由でアルバイト採用していただき，5月でちょうど1年になります！ありがとう[AtCoder](https://atcoder.jp/)!!
これまで

- Vue.jsでのフロントエンド画面作成
- Docker上でlocalstackを用いたAWS用の技術検証
- Goでメッシュ計算ツール作成
- Pythonで性能検証用のダミー時系列データの生成

などなどアルバイターですが幅広く様々なタスクをやらせてもらいました．
そして今回はHeadlessCMSを利用したタスクをやることになりました．私自身HeadlessCMSどころかCMSを聞いたことすら無かったので，初めてCMS使ってみるにあたって感じたことを共有出来たらと思い本記事を作成させていただいております．


# そもそもCMSって？
CMSは**Content Management System**の頭文字を取った略称で，文字通り「コンテンツを管理するシステム」のことです．

例えば素朴にwebコンテンツを作成しようとした場合，画面だけでもHTMLやCSS等の技術的なスキルが必要となります．一方でCMSを利用してwebコンテンツを作成すれば，技術的なスキルに依存することなくコンテンツの作成に注力することができます．
すなわちコンテンツ作成者は技術的なことは懸念せずにコンテンツの作成，管理にだけリソースが割くことができて嬉しいです．

具体的なCMSサービスには[WordPress](https://ja.wordpress.org/)が挙げられます．

# HeadlessCMS
HeadlessCMSとはWikipediaに以下のようにあります．


>Whereas a traditional CMS typically combines the content and presentation layers of a website, a headless CMS is just the content component and focuses entirely on the administrative interface for content creators, the facilitation of content workflows and collaboration, and the organization of content into taxonomies. It doesn’t concern itself with presentation layers, templates, site structure, or design, but rather stores its content in pure format and provides access to other components (e.g. delivery front ends, analytics tools, etc.) through stateless or loosely coupled APIs.

[Wikipedia](https://en.wikipedia.org/wiki/Headless_content_management_system) より引用

要約すると以下のような感じでしょうか．

>従来のCMSがウェブサイトのコンテンツとプレゼンテーション層を組み合わせたものであるのに対し，HeadlessCMSはコンテンツの構成要素のみに焦点を当てている．プレゼンテーションレイヤー，テンプレート，サイト構造，デザインには関心がなく純粋な形式でコンテンツを保存しステートレスなAPIを通じて他のコンポーネントへのアクセスを提供する．

すなわち，HeadlessCMSはフロントエンドとバックエンドを切り離して設計します．フロントエンドとバックエンド間はAPIを通じてコンテンツのやり取りをします．これによりフロントエンド側はデザインやレイアウトが固定されず高い自由度で開発が行えます．

これが前述のWordPressに代表されるCMSとの違いです．

## HeadlessCMSサービスの比較

HeadlessCMSは数多くのサービスが存在しています．
ここでは代表的な3つのサービスの [butterCMS](https://buttercms.com/)， [contentful](https://www.contentful.com/)， [microCMS](https://microcms.io/) を比較してみたいと思います．

調査日: **2020年5月8日時点**

| 性能/コスト                                       | butterCMS                 | contentful          | microCMS                |
| ------------------------------------------------- | ------------------------- | ------------------- | ----------------------- |
| 利用料金(月)                                      | 208$ Small Businessプラン | 879$ Businessプラン | 29,000円 Businessプラン |
| CMS管理画面からコンテンツの作成，更新，削除，参照 | 〇                        | 〇                  | 〇                      |
| APIによるコンテンツの取得                         | 〇                        | 〇                  | 〇                      |
| 管理権限                                          | 〇                        | 〇                  | 〇                      |
| 予約公開機能                                      | 〇                        | 〇                  | 〇                      |
| サポート                                          | 海外サポート              | 海外サポート        | 国内サポート            |
| ドキュメント                                      | 英語                      | 英語                | 日本語                  |

どのサービスも基本的な機能は満たされています．microCMSは日本製HeadlessCMSですのでドキュメントからサポートまですべて日本語対応です．サービス開始が2019年8月からということもあり，現在も活発に機能の改善や追加が行われています．
公式で様々な[入門記事やチュートリアル](https://microcms.io/blog/)を書いてくれているので初めてHeadlessCMSを触ってみる場合に取り掛かりやすいと思います．

したがって今回は[microCMS](https://microcms.io/)を使ってみます！無料プランの機能も充実しています．

# microCMSを使ってみる
それでは実際にmicoroCMSを使ってみます．
以降の例では**「ブログ記事の管理」** という場面を想定してmicroCMSの利用を説明していきます．
コンテンツの利用には会員登録を済ませたのち，

1. サービスの作成
2. APIの作成
3. コンテンツの入力

上記の3つのステップが必要です．以下で順に見ていきます！

## 会員登録
まずは[ここ](https://microcms.io/)から会員登録を完了させてください．
画面の手順通りに進めば簡単に会員登録できると思いますので，詳細は省略させていただきます．

料金体系は以下のようになっていますので，ご自身で利用したいプランを選択してください．
本記事ではFreeプランを選択しています．
<img src="/images/20200512/photo_20200512_01.png" loading="lazy">

## サービスの作成
会員登録を済ませたら最初にサービスを作成します．サービスIDはコンテンツのサブドメインです．すなわち，**https://[サービスID].microcms.io/**となりますので半角英数字で作成します．
ここではサービス名を**microCMS入門**，サービスIDを**future-blog-sample**としています．
<img src="/images/20200512/photo_20200512_02.png" style="border:solid 1px #000000" loading="lazy">

また，サービスには識別しやすいように画像を設定することができますので，複数サービスを運用する場合には設定するといいと思います．
<img src="/images/20200512/photo_20200512_03.png" style="border:solid 1px #000000" loading="lazy">
私は既に1つサービスを作成していましたので，画面左上にうっすら既存サービスのアイコンが見えるかと思います．

## APIの作成
サービスの作成が完了したら先ほど作成した**https://[サービスID].microcms.io/**に進みAPIの作成をします．
今回は「ブログ記事」の配信と管理を想定しているので以下のようにAPI名とエンドポイントを作成します．
<img src="/images/20200512/photo_20200512_04.png" style="border:solid 1px #000000" loading="lazy">


APIで得られるデータ形式にはリスト形式かオブジェクト形式を選択することができます．
今回配信するコンテンツの「ブログ記事」はリスト形式で管理したいと思います．
<img src="/images/20200512/photo_20200512_05.png" style="border:solid 1px #000000" loading="lazy">

次にAPIスキーマを定義していきます．
スキーマの種類には以下の画像のように選択できます．一通り想定されるスキーマは備えられており，簡単な説明もあるため，どれを使うべきか非常にわかりやすくなっています．
<img src="/images/20200512/photo_20200512_06.png" loading="lazy">

今回は「ブログ記事」のコンテンツ配信を想定しているので以下のようにスキーマを作成します．スキーマは後から修正を加えることができます．
<img src="/images/20200512/photo_20200512_07.png" style="border:solid 1px #000000" loading="lazy">

## コンテンツの作成
最後に先ほど作成したAPIにコンテンツの作成をします．画面右上の「追加」からコンテンツの作成を行います．
<img src="/images/20200512/photo_20200512_08.png" style="border:solid 1px #000000" loading="lazy">


コンテンツの作成ができたら早速コンテンツの公開をしましょう！右上の公開ボタンを押してコンテンツが公開されます．なおプルダウンメニューから下書きとして保存しておくこともできます．
<img src="/images/20200512/photo_20200512_09.png" style="border:solid 1px #000000" loading="lazy">

これでコンテンツが配信されている状態となりました．次で実際にコンテンツを取得してみたいと思います！

# APIの利用
コンテンツの配信準備が整ったので実際にコンテンツを取得してみます！

microCMSには簡単にAPIを試すことができる「APIプレビュー」が備わっています．まずはここからAPIを利用してみたいと思います．
先ほど作成したコンテンツの画面から右上の「APIプレビュー」を選択します．
<img src="/images/20200512/photo_20200512_10.png" style="border:solid 1px #000000" loading="lazy">

「APIプレビュー」で開かれたメニューから「取得」をクリックすると，APIリクエストが実行されてレスポンスが表示されます！また，curlコマンドも提示してくれているためご自身の環境でもすぐに試せるようになっている親切設計です．
<img src="/images/20200512/photo_20200512_11.png" style="border:solid 1px #000000" loading="lazy">

```bash
curl "https://[サービスID].io/api/v1/blog/l5cn1orii" -H "X-API-KEY: YOUR_API_KEY"
```

# コンテンツ参照
先ほどの例では「ブログ作成者」をべた書きで与えていましたが，実際にブログを作成する際には作成者に対して

- 名前
- アイコン
- プロフィール
- 各種SNSアカウントへのリンク

のように，いくつかの情報を付与したいことがあると思います．このような機能は「コンテンツ参照」を利用することで実現できます！

## 参照先コンテンツの作成
まずは参照先のコンテンツを作成します．今回の例では以下の画像のようなリスト形式の「ブログ作成者」というAPIを作成しました．

<img src="/images/20200512/photo_20200512_12.png" style="border:solid 1px #000000" loading="lazy">



「ブログ作成者」に以下のようなコンテンツを作成します．この未来太郎さんの各種情報ををブログ記事のコンテンツ側から取得したいと思います．
<img src="/images/20200512/photo_20200512_13.png" style="border:solid 1px #000000" loading="lazy">
参照される側のコンテンツ作成はこれで完了です．

## コンテンツ参照の設定
次にブログ記事のコンテンツ側から先ほどの「ブログ作成者」を参照できるように設定します．
writerの種類を**テキストフィールド**から**コンテンツ参照**に変更します．
<img src="/images/20200512/photo_20200512_14.png" style="border:solid 1px #000000" loading="lazy">

参照したいコンテンツには先ほどのブログ作成者を選択します．
<img src="/images/20200512/photo_20200512_15.png" loading="lazy">

「writer」の種類をコンテンツ参照に変更したら，コンテンツ管理から「作成者」を選択しましょう．
先ほど作成した未来太郎さんが選択できるはずです！
<img src="/images/20200512/photo_20200512_16.png" style="border:solid 1px #000000" loading="lazy">

「作成者」の選択が済んだらコンテンツを公開し，先ほどのように「APIプレビュー」からAPIリクエストをしてレスポンスの確認をしましょう！「writer」には指定した「ブログ作成者」が対応しています！
<img src="/images/20200512/photo_20200512_17.png" style="border:solid 1px #000000" loading="lazy">

# リスト形式の要素を持たせる
リスト形式で要素を与えようとした際に，どのAPIを利用して実現できるか分からず少しハマりました．
例えばAWS lambdaについてのブログ記事を作成したとして，

- AWS
- lambda
- golang
- etc...

のように複数のタグを付与させたいことがあると思います．

```json
"tags":["AWS","lambda","golang"]
```
上記のようにタグをリスト形式で作成できればいいですが，現在microCMSではコンテンツに直接リストを与えることができません．
そこで，1つのkeyにリスト形式の要素を与えるには**複数コンテンツ参照**を使用します．
それでは実際に試してみます！

## 参照先コンテンツの作成
まずはタグ一覧を管理するリスト形式の「タグ」コンテンツを作成します．作成方法は今までのコンテンツと同様です．
<img src="/images/20200512/photo_20200512_18.png" style="border:solid 1px #000000" loading="lazy">

## コンテンツ参照の設定
「ブログ記事」のAPIスキーマに「tag」フィールドを追加します．種類には**複数コンテンツ参照** -> **タグ**を選択します．
<img src="/images/20200512/photo_20200512_19.png" style="border:solid 1px #000000" loading="lazy">

次にコンテンツ管理で「タグ」を付与させましょう．今までと異なり複数選択できるようになっていると思います．
<img src="/images/20200512/photo_20200512_20.png" style="border:solid 1px #000000" loading="lazy">

これで準備はできました！
実際にAPIプレビューを試してみると，リスト形式で複数タグを持っていることが分かります．
<img src="/images/20200512/photo_20200512_21.png" style="border:solid 1px #000000" loading="lazy">
これでリスト形式で複数の要素を与えることができました．

# Vue.jsで画面にデータを表示してみる
最後は簡単にVue.jsでmicroCMSのコンテンツを画面に表示してみます．
今回はaxiosを利用してAPIリクエストを行います．以下のようなVue.jsコードを作成しました．

```html
<template>
  <div>
    <h1>{{contents.title}}</h1>
    <h2>
      記事作成者: {{contents.writer.name}}
      日付: {{contents.date}}
    </h2>
    <p v-html="contents.body"></p>
  </div>
</template>

<script>
import axios from "axios";
export default {
  data() {
    return {
      contents: null
    }
  },
  async created() {
    try {
      const res = await axios.get('https://future-blog-sample.microcms.io/api/v1/blog/l5cn1orii', {
        headers: {
          'X-API-KEY': 'YOUR_API_KEY'
        }
      })
      this.contents = res.data;
    } catch (err) {
      console.log(err);
    }
  }
}
</script>

```

ブラウザで確認してみると無事表示されました！リッチエディタで作成したhtml形式の本文もちゃんと機能しています．
これでフロントエンドとmicroCMSの疎通ができたのでAPIで取得したコンテンツを利用して様々なページを作成することが出来るようになりました．

<img src="/images/20200512/photo_20200512_22.png" style="border:solid 1px #000000" loading="lazy">

# おわりに
今回は初めてのCMS利用でmicroCMSを触ってみた！ということで本記事を書かせていただきました．
microCMSはすべて日本語で書かれており，チュートリアルやブログ記事も豊富にあるのですごく始めやすかったです．特にUIがシンプルで分かりやすくて素晴らしいと思いました．APIプレビューで即座に作成したコンテンツの確認ができることなど特徴的だったかと思います．
実際にプロジェクトでmicroCMSを利用している社員の方曰く，サポートはかなり手厚く，チャットのレスポンスもすぐ帰ってくるようです．日本語でやり取りでき，ドキュメントやUIも日本語なので，それだけでもプラスポイントではないでしょうか．

しかし，比較的新しく出てきたサービスのため，細かな機能不足があるように感じました．例えばバリデーション機能，編集履歴の表示などは現在開発中とのことです．
<img src="/images/20200512/photo_20200512_23.png" loading="lazy">

ですが，開発スピードがすごく早いため今後どんどん使いやすくなっていくと思います．機能更新の様子は[公式のブログ](https://microcms.io/blog/)で見ることができます．ですので今後も注目していきたいサービスの１つだと思います．

ありがとうございました！

# 参考記事

https://qiita.com/to4-yanagi/items/4e431b99b78401ef65ca
https://webkikaku.co.jp/homepage/blog/hpseisaku/htmlcss/headless-cms/
https://microcms.io/blog/lets-relation/

