---
title: "Go Tips連載8: logパッケージでログ出力している場所の情報を出す"
date: 2020/05/27 10:36:36
postid: ""
tag:
  - Go
  - GoTips連載
  - ログ
category:
  - Programming
thumbnail: /images/20200527/thumbnail.png
author: 澁川喜規
lede: "Go tipsということで、シンプルネタを投稿します。

検索窓に入れると「printデバッグでいつまで消耗しているの？」とか「printデバッグにさようなら」とかサジェストされつつも、根強く生き残っているのがprintデバッグです。むしろ、非同期だったり並列処理が増えてくると、同期的に動くデバッガーが逆に使いにくかったりもありますし、デバッガーを使うにしてもブレークポイントを仕掛ける場所のあたりをつけるためにprintデバッグの力を借りたりもあるし、いっそのことprintデバッグの方が進化しろ、と個人的には思っています。"
---
<img src="/images/20200527/top.png" class="img-small-size" loading="lazy">

[Go Tips連載](/tags/GoTips%E9%80%A3%E8%BC%89/)の第8弾です。

Go tipsということで、シンプルネタを投稿します。

検索窓に入れると「printデバッグでいつまで消耗しているの？」とか「printデバッグにさようなら」とかサジェストされつつも、根強く生き残っているのがprintデバッグです。むしろ、非同期だったり並列処理だったりプロセスまたぎ、ホストまたぎが増えてくると、同期的に動くデバッガーが逆に使いにくかったりもありますし、デバッガーを使うにしてもブレークポイントを仕掛ける場所のあたりをつけるためにprintデバッグの力を借りたりもあるし、いっそのことprintデバッグの方が進化しろ、と個人的には思っています。分散トレーシングは進化したprintデバッグだと思っています。

Goでprintデバッグの友といえば標準ライブラリの[logパッケージ](https://golang.org/pkg/log/)ですね。logパッケージには色々カスタマイズポイントがありますのでそれを紹介します。

# ログ出力している場所を表示

printデバッグをするには、どこから出力された文字列かが分からないと意味がありません。Goの標準のログ出力だと、日付と時間の情報が付与されるだけです。ここはフラグで変更できます。フラグはこんな感じで定義されています。

```go
    Ldate         = 1 << iota     // the date in the local time zone: 2009/01/23
    Ltime                         // the time in the local time zone: 01:23:23
    Lmicroseconds                 // microsecond resolution: 01:23:23.123123.  assumes Ltime.
    Llongfile                     // full file name and line number: /a/b/c/d.go:23
    Lshortfile                    // final file name element and line number: d.go:23. overrides Llongfile
    LUTC                          // if Ldate or Ltime is set, use UTC rather than the local time zone
    Lmsgprefix                    // move the "prefix" from the beginning of the line to before the message
    LstdFlags     = Ldate | Ltime // initial values for the standard logger
```

``Lmicroseconds``のマイクロ秒単位の時間情報があれば、パフォーマンスが遅い、計測が必要な場所のあたりをつけるのに便利そうですね。ファイル名を付与するには、``log.Lshortfile``か``log.Llongfile``を付与します。

```go
package main

import (
	"log"
)

func main() {
	log.Println("標準状態")
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("🐙 ファイル名を付与")
	log.SetFlags(log.LstdFlags | log.Llongfile)
	log.Println("🦑 ディレクトリ付きのファイル名を付与")
}
```

フォルダはデフォルトではフルパス表示されますが、いまどきは``-tirmpath``つけてビルドするでしょうし、そうなるとパッケージ名＋相対パスだけになります。

<img src="/images/20200527/1.png" loading="lazy">

# 出力先とかログに決まった文字列を追加

他にも出力先とかも変更できます。

```go
package main

import (
	"log"
)


func main() {
	log.Println("標準状態")
	log.SetPrefix("🍤 ")
	log.Println("prefixをセット")
	log.SetOutput(&OrigWriter{})
	log.Println("出力先を変更")
}
```

今回は出力先が変わったことがすぐわかるようにちょっとio.Writerを作っていますが、実際はio.MultiWriterを使って、ネットワークとかファイルにクロスポストするぐらいですかね。

```go
type OrigWriter struct {
}

func (w OrigWriter) Write(b []byte) (int, error) {
	return fmt.Fprintf(os.Stderr, "[stderr] %s", b)
}
```

# まとめ

ファイル名の出力を入れると便利です。また、絵文字を今回サンプルに使いましたが、絵文字って色がつくので（たとえ[go playground](https://play.golang.org/p/-wnBrYmGqwI)であっても）視認性がいいんですよね。絵文字を``log.SetPrefix()``に入れてあげるのもおすすめです。絵文字を使う場合はグリフが半角相当の幅か全角相当の幅かはターミナルの設定によって出力のされ方が変わることがあり、半角の幅だと絵に次の文字がめり込んでよみにくくなるため、絵文字の後ろには半角スペースを入れておくのをおすすめします。

<img src="/images/20200527/2.png" loading="lazy">
