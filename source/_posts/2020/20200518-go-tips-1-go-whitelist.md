---
title: "Go Tips連載1: ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方"
date: 2020/05/18 09:55:52
postid: ""
tag:
  - Go
  - GoTips連載
  - プロキシ
category:
  - Programming
thumbnail: /images/20200518/thumbnail.png
author: 宮崎将太
lede: "ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方を記載します。"
---

<img src="/images/20200518/Go-Logo_LightBlue.png" class="img-small-size" loading="lazy">

# はじめに

[Go Tips連載](/tags/GoTips連載/)の第1弾目です。

TIG DXユニットの宮崎です。これまでRuby、Java中心に仕事をしてきましたが、ここ1年は某鉄道会社のID連携基盤サーバサイドをGolangで作っています。今回はGo Tips連載の第一回として、ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方を記載します。

※パッケージ管理にはGo Modulesを使用している前提です。

# 背景
社内CIサーバからのインターネットアクセスがやんごとなき事情でホワイトリスト形式で許可されており、ライブラリダウンロードでアクセスするドメインへの接続解除申請を上げようとしたのが契機。

go.modでrequireしているドメインへのアクセスを全て許可したのにも関わらず一部のライブラリが落とせなく、(;´･ω･)? となったのでこれ以上の犠牲者を出さないためTips連載ネタにします。


# 結論

* インターネットアクセスできる環境にて`go mod download -v`でアクセス先を全て表示させる。
* この時、ライブラリによってはrequireドメインではないリポジトリにリダイレクトされているので、アクセス許可ドメインとして見逃さないこと。(ハマりポイント)
  * ↓の場合だとrequire先は`cloud.google.com`だがライブラリダウンロード自体は`code.googlesource.com`から実施される。

```bash
get "cloud.google.com/go": found meta tag get.metaImport{Prefix:"cloud.google.com/go", VCS:"git",
RepoRoot:"https://code.googlesource.com/gocloud"} at https://cloud.google.com/go?go-get=1
```

<br>
この記事で少しでも犠牲者が減ることを祈っています。
