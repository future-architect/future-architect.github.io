---
title: "子育てDIY：YouTubeの視聴をご褒美に変えた話"
date: 2025/06/23 00:00:00
postid: a
tag:
  - プロキシ
  - Network
  - Squid
  - 育児
  - 子ども
category:
  - Infrastructure
thumbnail: /images/2025/20250623a/thumbnail.png
author: 西田好孝
lede: "子育てをする中で、意外にも本職の知識でDIYして役に立つことってありませんか？子どもの年齢や家庭でのデバイス・IT環境も千差万別ありますが、抽象化した悩みとしては2つに集約すると思います"
---
# はじめに

子育てをする中で、意外にも本職の知識でDIYして役に立つことってありませんか？子どもの年齢や家庭でのデバイス・IT環境も千差万別ありますが、抽象化した悩みとしては2つに集約すると思います。

1. 子どもが夢中になっている事を後押しするためにやる事
2. 子どもが夢中になっている事を制限するためにやる事

私の話で言えば、1はマインクラフトのサーバ構築やマルチプレイ環境の構築が当てはまり、
2は本記事の主題の通り、YouTube視聴に制限をかけてご褒美にした話です。

# 具体的な悩み事

* 男の子はとにかくゲーム/YouTubeが大好き！放っておくと無限にやってしまいます！
  * 私の家庭では、やること自体はもちろんいいんですが、生活や体調に支障をきたすレベルに過度に依存しないルールを設けています
  * Nintendo Switchはみまもりアプリで時間の上限が設定できるのでそれで問題ありませんでした
* 問題はテレビ/DVD含めた映像媒体です。一度つけたら最後、そんなに見たいわけでもないのに宿題/夕ご飯/風呂/歯磨きなど、とにかく自分で進められない。親が促しても『今じゃない』とかいろいろ言い訳つけて、21時過ぎてあわてて寝る準備するなんて言う日も普通にありました
* そこで、『それらの準備を終わらせたらYouTubeを見ても良い』『早ければ早いほど見える時間が増える』、というルールと、それを実現するITインフラを準備しました

# フローチャート

* まず、子どもがYouTubeを見ることが出来るフローチャートはこんな感じです
* 基本的には、生活の上で最低限やるべきことをやった後で、ご褒美的な位置づけに変えました

<img src="/images/2025/20250623a/flowchart.png" alt="flowchart.png" width="481" height="381" loading="lazy">

# 構成

* 構成に関しては、特に難しい要素はありません

<img src="/images/2025/20250623a/diagram.drawio.png" alt="diagram.drawio.png" width="591" height="341" loading="lazy">

* Windows はいつの頃からか、pac ファイルはローカルを参照できなくなったので、github 上に pac を公開しています
* 後は Proxy コンテナを `docker compose up` するかどうかで Youtube を見えるかどうかを制御しています

# Config 等

## 子どものPC側の設定など

* 子どものアカウント（標準ユーザ）にて、Pac ファイルの指定

<img src="/images/2025/20250623a/2025-06-12_222922.png" alt="2025-06-12_222922.png" width="1020" height="724" loading="lazy">

* 管理者アカウントにて、プロキシの設定を変更出来ない設定
  * `gpedit.msc` でグループポリシーエディタを起動

  <img src="/images/2025/20250623a/2025-06-12_222625.png" alt="2025-06-12_222625.png" width="400" height="204" loading="lazy">

  * `プロキシの変更が出来ない` というポリシーを有効にする

  <img src="/images/2025/20250623a/2025-03-09_201437.png" alt="2025-03-09_201437.png" width="1200" height="704" loading="lazy">

## github に上がっているPac

* Pacファイル

```js user.pac
function FindProxyForURL(url, host)
{
    // . が含まれない場合。つまりローカルドメイン
    if (isPlainHostName(host))
        return "DIRECT";

    // ローカルIP宛の通信は direct
    if (isInNet(host, "192.168.0.0", "255.255.0.0"))
        return "DIRECT";

    // ドメイン名に基づくproxyの設定 基本的には www.youtube.com を向ければ問題な
い
    if (shExpMatch(host, "youtube.com"))
        return "PROXY 192.168.11.64:10080";
    else if (shExpMatch(host, "*.youtube.com"))
        return "PROXY 192.168.11.64:10080";
    else if (shExpMatch(host, "youtu.be"))
        return "PROXY 192.168.11.64:10080";
    else if (shExpMatch(host, "youtubekids.com"))
        return "PROXY 192.168.11.64:10080";
    else if (shExpMatch(host, "*.youtubekids.com"))
        return "PROXY 192.168.11.64:10080";
    else if (shExpMatch(host, "*.netflix.com"))
        return "PROXY 192.168.11.64:10080";

    // どこにも合致しない場合は、諦めて direct 接続
    return "DIRECT";
}
```

## 親のPC側でやること

* docker compose でプロキシを起動

```yaml compose.yaml
services:
  proxy:
    image: ubuntu/squid:latest
#    volumes: # マウントは特に要りませんでした、細かくホワイトリスト設定したい場合などは必要
#      - ./work:/work
#      - ./conf/squid.conf:/etc/squid/squid.conf
    ports:
      - "10080:3128"
```

* 後は、子どもの準備が整ったら、`docker compose up` をすると `youtube.com` にアクセスが出来る様になります

# その他細かい話

* YouTubeは、動画のストリーミング自体は、別の FQDN から行われているらしく、全量は調べられていません。なので動画を見ている途中でコンテナを落としても動画は見えてしまいます。でも、次の動画は見えない挙動になります
* 逆にこの仕様を逆手にとって、21:00にコンテナを落とすので、「その動画を最後まで見たら終わり」という整理にしています

# あとがき

* 話としては以上です。非常に簡単な仕組みなので、技術として難しい要素はないですね
* 子どもアカウント側で、『Proxy の変更が出来ない』制御はいらないかもしれません。『Proxy を変更すると見える！』という事がわかるくらいの年齢なら、どっちかというと自制心を育てる何かの活動をすべきです
* タブレットやスマホも同様にwifi設定する際に、PAC URL を指定できるので、同じ制御が可能です
  * 可能ですが、SIMを入れて外で使いたい場合は、PACを外すか、PAC内で判別させるか、もう一歩複雑な処理を入れる必要があります
* Chrome Cast など経由ではなく、TVで直接 Youtube を見る場合は... ちょっとわかりません
* Youtube のチャネルによって制御したいケースは、試していませんが、Proxyで中間CA局を立てて、中間サーバ証明書をhttpsリクエストのたびに発行する、という設定をすればおそらく細かい制御も出来るとは思いますが、httpsのどのリクエストパラメータにチャネル名が入っているのか？などは確認できていません
* 嫁の反応は、基本的には自分のスマホが取り上げられなくなる事、PCのキー操作を覚える事などは肯定的です。ですが、マインクラフトのマシンガントーク実況のチャンネルの音量がとても大きく、そこは否定的です😂
