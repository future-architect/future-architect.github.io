---
title: "wasmCloudが夢見る世界"
date: 2023/06/19 00:00:01
postid: b
tag:
  - wasmCloud
  - wasm
  - CNCF
category:
  - Infrastructure
thumbnail: /images/20230619b/thumbnail.png
author: 澁川喜規
lede: "サーバーレスのランタイムに興味があり、CNCFのプロジェクトを見たところ、それに関連しそうなwasmCloudというものがあったので見てみました。ぱっと見wasmで書いたロジックを実行するフレームワークに見えますが、wasm製アプリケーションのためのOSのようなものです。"
---

[CNCF連載](/articles/20230619a/)の1日目の記事です。

サーバーレスのランタイムに興味があり、CNCFのプロジェクトを見たところ、それに関連しそうなwasmCloudというものがあったので見てみました。

# wasmCloudとは？

ぱっと見wasmで書いたロジックを実行するフレームワークに見えますが(他の説明の文書はこういう表現をしていませんが)、wasm製アプリケーションのためのOSのようなものです。

みなさんがこのページを見るのに使うブラウザも、普段コードを書くエディタも、OSから見れば「プロセス」です。プロセスは、それそのものではCPUサイクルを消費して電力を熱に変えるぐらいしか能力はありません。直接物理メモリにアクセスしたり、ファイル読み書きしたり、ネットワークアクセスをしたりはできません。そう言う仕事はシステムコールを通じてOSにお願いする必要があります。

と言う話は、みなさんはGoならわかるシステムプログラミングをお読みになってすでにご存知だと思いますが、もし読んでない方がいたら、下記のサイトで読めます。

* [ASCII PROGRAMMING+: Goならわかるシステムプログラミング/Goから見たシステムコール](https://ascii.jp/elem/000/001/267/1267477/)

wasmのアプリケーションと、OSにあたる機能を実装する部品を組み合わせてアプリケーションを作ってしまおう、というプラットフォームになっています。

wasmのアプリケーションの作成については、TinyGoとRustの雛形が作成できるようになっています。

# wasmCloudの構造

wasm自身は計算をしたり文字列を処理したり（バイトの配列として）といった機能しかありません。それだけでは（現時点では）Webサービスを作ったり、クラウドのAPIを使ったり、データベースへの読み書きはできません。Erlangなどを参考にして、次のような構造でアプリケーションを作れるようにしたものとなっています。

* アクター。処理の中心。wasmで実装。
* キャパシティプロバイダー。外部I/Oなど。ネイティブバイナリ（OS/CPUの組み合わせ)がOCIコンテナでまとめられたもの。
* ホスト。プラットフォーム。この上でアクターとキャパシティプロバイダーを動かし、それらを繋いで1つのアプリケーションにするもの。現時点ではErlang実装。

アクター・キャパシティプロバイダーはそれぞれ「インタフェース」を通じてやりとりします。インタフェースは[ここ](https://github.com/wasmCloud/interfaces/tree/main)で定義されていますが、かなりの種類あります。

アクターとキャパシティプロバイダーは、「リンク」を使って繋ぎます。そのあたりは管理画面で手でもできますし、washコマンドを使ってもできますし、wadm.yamlという、docker composeみたいな設定を使ってもできます。

<img src="/images/20230619b/名称未設定ファイル-ページ3.drawio.png" alt="名称未設定ファイル-ページ3.drawio.png" width="471" height="271" loading="lazy">

# WASIは？

「wasmCloudがwasmのためのOS」「外部とのやりとりはプロバイダーにまかせる」という説明を見て、最近のwasm事情を追いかけている人は「あれ？ WASIあるじゃん」と思われる方もいると思います。

* [WASI Proposals](https://github.com/WebAssembly/WASI/blob/main/Proposals.md)

wasmCloudは、サーバーレスのプロセスがマイクロサービス的に連携する世界を目指しているようです。

* 各アプリケーション（アクター）はシングルスレッドで動く(並列数はwasmCloudが決める)
* 各アプリケーション（アクター）はステートレスである

自前でファイル読み書きしてローカルに出力したりスレッドを増やして処理したり自前で常駐して何かを処理するとなると、ステートレスではなくなってしまいます。そのため、wasmCloudでは、wasmのプロセスはWASIの外部I/Oやスレッドの機能を使わせないようにして、そのような処理はプロバイダーに委譲させる、という方針をとっています。セキュリティ上の問題も回避すると説明されています。

最近はwasmerが[WASIX](https://wasmer.io/posts/announcing-wasix)というのを出してきました。WASIがなかなか実用にならないので作ってしまえ、的なノリを感じます。POSIXのAPIのうち、ネットワークやプロセス、スレッドあたりに追加対応したもので、curlコマンドが実行できる、とされています。

# やってみよう・・・かな？

簡単なチュートリアル以外のことをやってみようかな・・・と思って試したものの、まだうまくいかなかったメモです。

## アクター同士の連携もできる？

ドキュメントには[アクター同士の通信もできる](https://wasmcloud.com/docs/fundamentals/actors/a2a/)、とあります。サンプルはRustです。Goでもできるかも？ と思って試しました。

使えそうなAPIは次のところにありました。

https://pkg.go.dev/github.com/wasmcloud/actor-tinygo#ToActor

これでトランスポートができるので、これをインタフェースのSender側の初期化に渡してあげたら、アクター間の通信ができる？

```go
transport := actor.ToActor("アクターID")
```

さっそく、乱数の素数生成のActorを作って(numbergenインタフェース)これにアクセスするアクターを作ろうと思ったのですが・・・自動生成されたインタフェースの[Senderの初期化メソッド](https://pkg.go.dev/github.com/wasmcloud/interfaces/numbergen/tinygo
)を見ても、トランスポートを受け入れられるようにはできていません・・・

うまくいかず！

```go
type NumberGenSender struct{ transport actor.Transport }

func NewProviderNumberGen() *NumberGenSender {
	transport := actor.ToProvider("wasmcloud:builtin:numbergen", "default")
	return &NumberGenSender{transport: transport}
}

func NewProviderNumberGenLink(linkName string) *NumberGenSender {
	transport := actor.ToProvider("wasmcloud:builtin:numbergen", linkName)
	return &NumberGenSender{transport: transport}
}
```

このあたりをおっかけるので見てみましたが、メッセージ類は、MessagePackか、CBORのどちらかにシリアライズされていそうでした。結構たくさんコードやらドキュメント読んだのですが・・・ドキュメントもいっぱいり、サンプルやインタフェースもいろいろあるものの、Goでは少しドキュメントが少なかったり、生成されるコードの使い方がわからなかったり、いろいろあって、若くて発展途上な感じがありました。

# アプリケーションの構造についての感想

* プロバイダーとアクターを分けて、アクターはポータブルにしてどこでも動くウェブアプリケーションを実現！ という思想は面白いな、と思いました。

一方で、ファイルを管理したいときにblobプロバイダーを置いて、リンクを作ってアクセス、というのはちょっとめんどいな、と思いました。プログラミング言語はインストールしたら標準ライブラリでファイルアクセスしたり、HTTPアクセスできるわけで、「プロバイダーは最初から全部使えるようになっている」「ただし、blobがどこかのS3バケットなのか、ローカルファイルなのかは設定でアプリの外から変えられる」ぐらいが使いやすいんじゃないかな、と思いました。

WASIの形が見えてくる前に走り出しているプロジェクトであり、セキュリティとかも考えられているので、ないかもしれませんが、WASIが対応したら、いっそのことプロバイダーなしでアクターが直接外部とやりとりできるようにした方が、FaaSのLambdaやCloud Functionsなどと近い形態で、開発者は慣れているのでやりやすいんじゃないかな、という気もしました。

まあ、WASIの仕様をみて、それありきで突っ走った感もあり、夢の若さが溢れるアーキテクチャだな！ という気がしました。

ちょうど今日、似たようなプラットフォームが発表されました。上に書いたWASIXはこれの布石だったんですかね。

* [Publickey: 分散モノリスとWebAssemblyランタイムを用いた新しいアプリプラットフォーム「Wasmer Edge」登場。オーケストレーションもサービスメッシュも不要](https://www.publickey1.jp/blog/23/webassemblywasmer_edge.html)

やはり、プロバイダーを個別にOSごとに個別に実装する、というアプローチはなかなか難易度が高いというか、やはりこっちのようにwasm自身にできることを増やして、プロバイダーという要素をなくした方が理解はしやすくなるというのはありますよね。

# まとめ

wasmCloudは、複数のwasmプロセスで実現するアプリケーションのためのOSでした。セキュリティなどのためにWASI相当やスレッドを取り除き、アプリケーション（アクター）が行えることを減らし、サーバーレスなマイクロサービス環境が実現できるOSとなっています。アクターはインタフェースを通じてアクターとやりとりをします。アクターからリクエストを受けるインタフェースと、アクターを呼び出すインタフェースがあり、アクターが見える世界はそれだけです。JavaのDIコンテナのように、そのインタフェースの先に何が繋がっているかは検知できませんし、実際、何を繋ぐかは実行時のリンク定義で行います。

これが成立するかというと、今はまだドキュメントが足りなかったり、利用実績をもとに生成コードが修正されたりするといいな、という状況でした。個人的な思いとはちょっとベクトルは違うのですが、これはこれで夢を持って活動しているプロジェクトなので、今後のアップデートは定期的にチェックしてみようと思いました。
