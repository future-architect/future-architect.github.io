---
title: "Chromeの拡張機能作ってみた！"
date: 2020/06/25 10:34:33
postid: ""
tag:
  - JavaScript
  - ChromeExtension
category:
  - Programming
thumbnail: /images/20200625/thumbnail.png
author: 彩花谷田
lede: "現在業務では直接開発をする機会はないのですが、業務の合間を縫って日々プログラミングを勉強中です。
そんな中、お世話になっている先輩から手始めに、Google Chromeの拡張機能の作成方法を教えて頂いたので、拡張機能の作成方法入門を書いていこうと思います。"
---

<img src="/images/20200625/top.png" class="img-small-size" loading="lazy">

[春の入門祭り](/articles/20200529/)の第19弾です


# はじめに
フューチャーに入社して約半年が経ちました。CSIGの谷田です。

現在業務では直接開発をする機会はないのですが、業務の合間を縫って日々プログラミングを勉強中です。そんな中、お世話になっている先輩から手始めに、Google Chromeの拡張機能の作成方法を教えて頂いたので、拡張機能の作成方法入門を書いていこうと思います。

作成方法自体はとっても簡単なので、ぜひ皆様もやってみてください！

# 拡張機能とは

Webページの閲覧や情報の検索に使用するブラウザに、自身で選んだ機能を追加することで、日常業務や作業を効率化して、便利にしてくれるものです。

皆さんもお気に入りのものを追加して日々の業務で使用されているのではないでしょうか？拡張機能はChrome以外のブラウザ（IE、Firefox等）でも存在し、アドオンとかextensionという言い方もしますよね。

この拡張機能、Google Storeから好きなものを追加できますが、自分で作成することもできるのです。

* What are extensions?: https://developer.chrome.com/extensions
* 拡張機能とは何か？: https://developer.mozilla.org/ja/docs/Mozilla/Add-ons/WebExtensions/What_are_WebExtensions

# 用意する物

以下のファイルは、manifest.jsonファイルへのパスの記載が楽なので同一フォルダに入れます（今回は/desktop/Myextension）。manifest.jsonとは、拡張機能の仕様を書くファイルのことです。

```sh
desktop
   └ Myextension
       ├ manifest.json      # 拡張機能の仕様を記載するファイル
       ├ calendar.png       # アイコン
       ├ calendar.html      # 表示したい画面、今回はカレンダー
       ├ calendar.css       # 表示したい画面、今回はカレンダー
       └ calendar.js        # 表示したい画面、今回はカレンダー
```

表示させるカレンダーは至って普通のもの。こちらのサイトを参考に作成しました。
* [JavaScriptでカレンダーを自作したら勉強になった](https://qiita.com/kan_dai/items/b1850750b883f83b9bee)

縦の軸と横の軸を考えて、毎月曜日や日にちが変わる状況で、土日祝日も反映させるにはどうすればいいか..？など頭を使いますが、for文とif文の練習になりますよ！

JavaScriptの基本から勉強するには、MDNのこちらのサイトがおすすめです。
* https://developer.mozilla.org/ja/docs/Learn/JavaScript/Building_blocks/conditionals


以上！！


## manifest.json

さて、ここで肝となるのがmanifest.jsonファイルですが、さっそくこちらの中身を見ていきましょう。

```json manifest.json
{
  "name": "calendar",
  "description" : "calendar",
  "version": "1.0",
  "manifest_version": 2,
  "browser_action": {
    "default_icon": {
      "16": "calendar.png"
    },
    "default_popup": "calendar.html"
  }
}
```


以下、今回記載した項目と簡単な説明です。

### name（必須）
拡張機能の名前を書きます。
ブラウザに追加した際に、拡張機能の管理画面にも名前として表示されます。

### discription（推奨）
必要に応じて拡張機能の説明を記載します。
なくても動作しますが、あったほうが分かりやすいです。

### version（必須）
拡張機能自体のバージョンを記載します。
最初なので1.0を記載しておきます。

### manifest_version（必須）
拡張機能で使用される manifest.json のバージョンを指定します。
現在のバージョンは2なので2を記載します。

### browser_action
ツールバーに拡張機能を追加します。

#### - default_icon（推奨）
拡張機能を有効化した際に、ブラウザのツールバーに表示するアイコンを指定できます。16は、16px×16pxの大きさという意味です。

#### - default_popup
アイコンをクリックすると、指定したファイルがポップアップとして表示されます。


### その他

今回は、記載するのは上記だけです。

その他の項目の意味や詳細は、manifest.jsonの公式リファレンスも参考にしてみてください。
* https://developer.chrome.com/extensions/manifest

MDNにも詳しく載っています。
* https://developer.mozilla.org/ja/docs/Mozilla/Add-ons/WebExtensions/manifest.json


## Chrome拡張機能に追加

ここまでできたら、実際に自分のChromeの拡張機能に追加していきます。
「右上のその他のアイコンを右クリック→その他のツール→拡張機能」を選択もしくは、URLバーに「chrome://extensions」と入力して拡張機能の管理画面を表示したら、右上のデベロッパーモードをオンにして、

<img src="/images/20200625/photo_20200625_01.png" style="border:solid 1px #000000" loading="lazy">

左上に出現する「パッケージ化されていない拡張機能を読み込む」を選択します。
ここで、作成した拡張機能が入っているフォルダ（今回は/desktop/Myextension）を選択すると追加できます。

ツールバーに”default_icon”で指定したカレンダーアイコンが表示され、クリックするとポップアップとしてカレンダーが表示されます。

注意点としては、拡張機能を編集したらその都度読み込みし直すことです。

<img src="/images/20200625/photo_20200625_02.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

ちなみに、以下のkuma.html、kuma.pngを同一フォルダに配置し、"default_popup"をkuma.htmlに変更すると、こうなります。

```html kuma.html
<body>
  <p><img src="kuma.png"></p loading="lazy">
</body>
```

<img src="/images/20200625/kuma.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">



## jQueryを用いた拡張

次に、jQueryを使用して、指定した画面にカレンダーをが表示されるようにしてみました。
https://jquery.com/
からjQueryをインストールし、同一フォルダにjquery.jsとして保存して、manifest.jsonを以下の様に記載します。

```json manifest.json
{
  "name": "calendar",
  "description" : "calendar",
  "version": "1.0",
  "manifest_version": 2,
  "browser_action": {
    "default_icon": {
      "16": "calendar.png"
    }
  },
  "content_scripts":[
    {
      "matches":[
        "https://www.google.com/"
      ],
      "css":["calendar.css"],
      "js":["jquery.js","calendar.js"]
    }
  ]
}
```

### content_scripts

配列で記載し、特定のウェブページのコンテキストで実行される拡張機能の一部を指定します。

#### - matches
動作対象のURLを記載します。
今回はhttps://www.google.com/
を開いたときに画面にカレンダーを表示する仕様です。
カレンダーを表示したいサイトのURLを記載します。

#### - css
動作させるcssファイルを記載します。

#### - js
動作させるjsファイルを記載します。ここにjquery.jsも記載します。

`www.google.com` には、searchformというidのdivがあります。
calendar.jsに以下を追記し、https://www.google.com/ を開いたときに、`www.google.com`のsearchformというidを持ったdivにcalendarというidを持ったdivが追加され、calendar.jsに記載されているカレンダーが表示されるようにします。

jQueryのappendメソッドは、要素を追加できるメソッドで、HTMLを直接指定することができます。

```js calendar.js
$('#searchform').append(`<div id="calendar"></div>`)
```

フォルダの中身は以下となります。上記により、calendar.htmlは不要となります。

```sh
Myextension
  ├ manifest.json # 拡張機能の仕様を記載するファイル
  ├ calendar.png  # アイコン
  ├ calendar.css  # 表示したい画面、今回はカレンダー
  ├ calendar.js   # 表示したい画面、今回はカレンダー
  └ jquery.js     # wwww.google.comにdivを追加するために使用
```


拡張機能を読み込み直し、”matches”で指定したhttps://www.google.com/ を開くと、カレンダーを表示することができました。
<img src="/images/20200625/photo_20200625_03.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

今回は以上です。いかがでしたでしょうか？

この基本を元に、他の動きも組み合わせて現在使用しているアプリのAPIと連携したりすると、便利な拡張機能が作成できるかもしれませんね！

何か便利な機能を思いついたときに、ぜひ"無いものは作って"みてください！

