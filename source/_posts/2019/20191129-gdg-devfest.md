---
title: "GDG DevFest in 信州2019に登壇しました"
date: 2019/11/29 13:58:44
postid: ""
tag:
  - GCP
  - GCPUG
  - 登壇レポート
category:
  - Infrastructure
author: 伊藤太斉
lede: "普段はGCPの開発支援を行なっているインフラエンジニアです。今回は私の地元である長野で開催された GDG Devfest 信州 に参加しました。今回でこちらの勉強会の参加は2回目になるのですが、登壇する機会をいただいたのでその時のことを書いていきます。"
---
# はじめに
こんにちは。TIG/DXユニットの伊藤です。普段はGCPの開発支援を行なっているインフラエンジニアです。今回は私の地元である長野で開催された[GDG Devfest 信州](https://gdg-shinshu.connpass.com/event/151084/)に参加しました。今回でこちらの勉強会の参加は2回目になるのですが、登壇する機会をいただいたのでその時のことを書いていきます。

<img src="/images/20191129/photo_20191129_01.jpeg" class="img-small-size" loading="lazy">


## GDG信州について
本題に入る前に、この勉強会のコミュニティについて少し説明します。Google Developers Groupを略してGDGと呼び、GDG信州は国内10チャプターあるうちの1つになります。他のチャプターは[こちら](https://sites.google.com/site/gdgjapan/)を見てみてください。

現在はGDG Cloud信州(旧 GCPUG 信州)とオーガナイザーが同じのため、同時開催されていることが多いようです。首都圏ではGCPUGも細分化されている中、ここでは1回の勉強会で幅広い内容が発表されるため、登壇することはもちろん、参加者側としても楽しみでした。


## 登壇を決めたモチベーション
Terraformを当社に入社して以来3ヶ月弱触ってきて、せっかくならTerraformの触りだけでも紹介したい、また人に教える、話すことを通して知識の再確認や新しいことのインプットをしたいと思って登壇を決めました。また、実家に帰るきっかけにしたり、地元のITも盛り上げたい思いがあり、前回は聴く側でしたが今回は登壇することを決めました。


# 当日のセッションについて
## 登壇内容
今回は登壇にあたってのモチベーションにも書きましたが、Terraformについての発表をしました。今回はLTで、かつ幅広い方(ネイティブアプリやハード)が参加されることなんとなく考えていました。そのため、まずはGCPを触るきっかけとして、さらにTerraformを使きっかけになるように資料を作りました。以下がその時の資料になります。

<script async class="speakerdeck-embed" data-id="fea7b09893e0479cb2f4d5a969c43e70" data-ratio="1.33333333333333" src="//speakerdeck.com/assets/embed.js"></script>

内容を要約すると

- Terraformについての説明
- Terraformを使ってGCEインスタンスを立てる
    - 設定を変えても冪等性を保てることを確認してもらう
- 使ってみて便利だった機能
    - `terraform fmt` を使ったコードの整形
    - Workspaceを使ってリソース名を変更

になります。そしてこちらが実際の反応です。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">terraform 便利そう。インフラ担当に教えてあげよう　<a href="https://twitter.com/hashtag/GDG%E4%BF%A1%E5%B7%9E?src=hash&amp;ref_src=twsrc%5Etfw">#GDG信州</a> <a href="https://twitter.com/hashtag/devfest19?src=hash&amp;ref_src=twsrc%5Etfw">#devfest19</a></p>&mdash; GRTN (@GRTN_NXST) <a href="https://twitter.com/GRTN_NXST/status/1198118758948061185?ref_src=twsrc%5Etfw">November 23, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr"><a href="https://twitter.com/hashtag/devfest19?src=hash&amp;ref_src=twsrc%5Etfw">#devfest19</a> <a href="https://twitter.com/hashtag/GDG%E4%BF%A1%E5%B7%9E?src=hash&amp;ref_src=twsrc%5Etfw">#GDG信州</a><br>LT3番目がトップバッターになったterraformの話をkaedemaluさんから <a href="https://t.co/k4KHBPEdZC">pic.twitter.com/k4KHBPEdZC</a></p>&mdash; GDG信州 (@GDGShinshu) <a href="https://twitter.com/GDGShinshu/status/1198118731253043200?ref_src=twsrc%5Etfw">November 23, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

会社に持って帰って共有する、など参加した方からさらに広めていただけるのはとても嬉しいですね。

## その他の勉強会内容
私が参加した午後からの内容をざっくり紹介します。

### セッション
- [DevOps環境のの紹介](https://speakerdeck.com/koda/devfest-in-shinshu-2019-abount-devops-in-gcp)
    - 言葉としては浸透してきているDevOpsを改めて考える機会になりました。インフラで実際に使える例も示していただいたのでとてもわかりやすかったです。
- デバイス＋グーグル：グーグルの技術とDIYのデバイスの繋ぎ方
    - こちらは午前のハンズオンと内容がリンクしたセッションでした。簡単ではありますが、マイコンを使った機械学習の中身等も解説していただきました。

### ガジェット品評会
参加者が持ち寄ったガジェットの品評会を行いました。人によっては昔のガジェットを出展したり、また自作キーボードの数々を並べている方もいました。私も自作キーボードで有名なErgoDoxを時々使うのですが、こういったガジェットを見ると改めて自作も楽しそうだなと思いました。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">いつものレトロPC vs モダンキーボードの構図<a href="https://twitter.com/hashtag/GDG%E4%BF%A1%E5%B7%9E?src=hash&amp;ref_src=twsrc%5Etfw">#GDG信州</a> <a href="https://twitter.com/hashtag/DebFest19?src=hash&amp;ref_src=twsrc%5Etfw">#DebFest19</a> <a href="https://t.co/5m2GFPQrCQ">pic.twitter.com/5m2GFPQrCQ</a></p>&mdash; 魔王 (@swan_match) <a href="https://twitter.com/swan_match/status/1198085871397826560?ref_src=twsrc%5Etfw">November 23, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr"><a href="https://twitter.com/hashtag/devfest19?src=hash&amp;ref_src=twsrc%5Etfw">#devfest19</a> <a href="https://twitter.com/hashtag/GDG%E4%BF%A1%E5%B7%9E?src=hash&amp;ref_src=twsrc%5Etfw">#GDG信州</a><br>信州名物のガジェット品評会始まりました！ <a href="https://t.co/MT0qxwvqDP">pic.twitter.com/MT0qxwvqDP</a></p>&mdash; GDG信州 (@GDGShinshu) <a href="https://twitter.com/GDGShinshu/status/1198112181981593600?ref_src=twsrc%5Etfw">November 23, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


### パネルトーク ~災害とIT~
こちらのセッションでは、まだ皆さんの記憶にも新しい10月の台風の被害から考える、ITをどう災害に用いていくか、また今回の台風では実際に何が役に立ったのかなどを共有していきました。
パネルトーク中で話題になったツールは

- [Google 災害情報マップ](https://www.google.org/crisismap/japan?hl=ja&gl=jp)
- [国土地理院](https://maps.gsi.go.jp/#13/36.680751/138.285317/&base=std&ls=std%7C20191012typhoon19_chikumagawa_1016do_sokuho&blend=0&disp=11&lcd=seamlessphoto&vs=c0j0h0k0l0u0t0z0r0s1m0f0&vs2=f0&sync=1&base2=ort&ls2=ort%7Cexperimental_anno&disp2=11&lcd2=experimental_jhj)
- [waze](https://www.waze.com/ja)

でした。国土地理院のサイトは、今回の台風による浸水地域を現在の地図にオーバーレイ表示させることができます。また過去の水害情報も見ることが可能なので、「歴史に学ぶ」と言う部分において、現在の居住地域に対しての理解が深まりそうでした。
Googlerの[Proppy](https://twitter.com/proppy)がアメリカに住んでいた頃はwazeというアプリを使って、使えなくなってしまった道の共有をしていたと話していました。今回の台風で、地元の人からは実際に通れなくなった橋もいくつかあったという話もありました。参加者からはTwitterが交通情報や被害状況を確認するためによく見ていたという声が多かったです。
一方で、災害用ツールは必要か、といった議論はありましたが、

- 災害時にのみ使うものは浸透しない
- スタンバイしている時のコストがそこそこ高い

といった意見が多く、一方で普段から使い慣れているツールを災害時にも使えるようにしたいといった声が多かったです。

# 最後に
私自身、LTでの登壇は2回目になるのですが、改めて発表することを通して自分の知識が整理されたり、人に説明するにあたって正確さが必要であることを改めて認識しました。5分でTerraformの導入や魅力はまだまだ伝えきれていないと思うので、今度はもう少し知識をつけてハンズオンなども行っていきたいです。

今回参加した勉強会の趣向もありますが、1日でハードからクラウドまで本当に幅広い情報に触れることが出来ました。今まで首都圏の勉強会には積極的に参加してきましたが、自らターゲッティングしており、周辺知識まで同時に入れることはあまりなかったように思います。今回参加して、より自分が興味を持つことができる範囲が広がったと思いました。

最後になりますが、本記事を読んでくださった方も、足を伸ばして遠くの勉強会へ行ってみてはいかがでしょうか？

## 当日のまとめサイト

[DevFest in 信州2019](https://sites.google.com/site/gdgshinshu/home/archive/devfest19)
