---
title: "Go Tips連載1: ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方"
date: 2020/05/18 09:55:52
postid: ""
tags:
  - Go
  - プロキシ
  - Tips
  - インデックス
categories:
  - Programming
series: "Go Tips"
thumbnail: /images/2020/20200518/thumbnail.png
author: 宮崎将太
lede: "ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方を記載します。"
---

<img src="/images/2020/20200518/Go-Logo_LightBlue.png" class="img-small-size" width="953" height="329" loading="lazy">

## はじめに

Go Tips連載の第1弾目です。連載の記事は以下の8本です。

* Go Tips連載1: ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方（この記事です）
* [Go Tips連載2: Golandで環境変数をさっと貼る方法](/articles/20200519/)
* [Go Tips連載3: ファイルを扱うちょっとしたスクリプトをGoで書くときのTips5選](/articles/20200520/)
* [Go Tips連載4: GoDocの読み方](/articles/20200521/)
* [Go Tips連載5: エラーコードベースの例外ハンドリングの実装＋morikuni/failureサンプル](/articles/20200522/)
* [Go Tips連載6: Error wrappingされた各クラウドSDKの独自型エラーを扱う](/articles/20200523/)
* [Go Tips連載7:【golangci-lint】lint issueを新たに作り出さないためのTips](/articles/20200525/)
* [Go Tips連載8: logパッケージでログ出力している場所の情報を出す](/articles/20200527/)

TIG DXユニットの宮崎です。これまでRuby、Java中心に仕事をしてきましたが、ここ1年は某鉄道会社のID連携基盤サーバサイドをGolangで作っています。今回はGo Tips連載の第1回として、ホワイトリストProxy申請するときのGo依存ライブラリURLドメインの調べ方を記載します。

※パッケージ管理にはGo Modulesを使用している前提です。

## 背景

社内CIサーバからのインターネットアクセスがやんごとなき事情でホワイトリスト形式で許可されており、ライブラリダウンロードでアクセスするドメインへの接続解除申請を上げようとしたのが契機。

go.modでrequireしているドメインへのアクセスを全て許可したのにも関わらず一部のライブラリが落とせなく、(;´・ω・)? となったのでこれ以上の犠牲者を出さないためTips連載ネタにします。

## 結論

* インターネットアクセスできる環境にて`go mod download -v`でアクセス先を全て表示させる。
* この時、ライブラリによってはrequireドメインではないリポジトリにリダイレクトされているので、アクセス許可ドメインとして見逃さないこと。(ハマりポイント)
  * ↓の場合だとrequire先は`cloud.google.com`だがライブラリダウンロード自体は`code.googlesource.com`から実施される。

```bash
get "cloud.google.com/go": found meta tag get.metaImport{Prefix:"cloud.google.com/go", VCS:"git",
RepoRoot:"https://code.googlesource.com/gocloud"} at https://cloud.google.com/go?go-get=1
```

<br>
この記事で少しでも犠牲者が減ることを祈っています。
