---
title: "API Meetup Online #3で限定公開URL（Capability URLs）について話をしてきました。"
date: 2020/08/09 00:00:00
postid: ""
tag:
  - HTTP
  - Web
  - 署名付きURL
  - WebAPI
  - 登壇レポート
category:
  - Programming
thumbnail: /images/2020/20200809/thumbnail.png
author: 澁川喜規
lede: "[API Meetup Online #3]での登壇をお誘いをいただいたので、以前から調査していたものの、発表の機会のなかった限定公開URLについて調べていた内容を発表しました。Real World HTTPの第3版が出るとしたら（具体的な計画とかはないですが）入れるかも、なネタでした。どちらかというとコンシューマー向けな機能な気がしますが、hipchatは以前、共有したファイルがこのCapability URLsだった...."
---

<img src="/images/2020/20200809/93281_normal.png" class="img-middle-size" loading="lazy">

[API Meetup Online #3](https://api-meetup.doorkeeper.jp/events/109648)での登壇をお誘いをいただいたので、以前から調査していたものの、発表の機会のなかった限定公開URLについて調べていた内容を発表しました。

<iframe src="https://docs.google.com/presentation/d/e/2PACX-1vRLdRFqBXd35VgVUCvrXsn3kN4rUu7HDzIoy0Kibs_ThTD3mnWpagkGkpNY1a7J8uWijf0lX8SdRBo3/embed?start=false&loop=false&delayms=3000" frameborder="0"  width="100%" height="569px" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

Real World HTTPの第3版が出るとしたら（具体的な計画とかはないですが）入れるかも、なネタでした。どちらかというとコンシューマー向けな機能な気がしますが、hipchatは以前、共有したファイルがこのCapability URLsだったという噂も聞きますし、サービスによってはエンプラでも使っているものもあるかもしれません。自分で実装するにしても、利用する側だったりといろんな立場でこの機能に関わる場合に、その安全性を評価する物差しは持っておきたいな、ということで調べました。

セキュリティ的には、「特定の誰かのファイルを見つける」でも、「誰でもいいからコンテンツを見つける」でも、かなり見つけるのは難しいんじゃないか、というのが所感です。ただ、「誰がいつアクセスしたのか」という証跡が必要な場合には合わないかもね、というのもありますし、ユーザー情報などをやりとりしないで「知っている」という条件だけで他のシステムとの連携が簡単に行えたりもするので、使えるかどうかはシステムごとの要件次第ですね。その要件と照らし合わせて使えるかどうか判断するためにもまとまった資料として価値があるんじゃないかと思います。

当日質問された、キーの衝突に関してですが、生成したキーはDBに登録しておく必要があります。これは本番のコンテンツを参照するのにも必要ですし、誰が生成したものか、リソースオーナーとの紐付けのためにも必要です。あとからオーナーが共有を解除したりとかもありますからね。そのため、DBに保存しておいて、それとの重複チェックは可能です。参考のGo実装を貼っておきます。

```go
import (
   "io"
   "crypto/rand"
   "encoding/base64"
   "image"
)

//本当はDBとかを使う
var existingImages := map[string]image.Image

func genPublicKey() string {
    baseCode := make([]byte, 30)
    // 重複した公開URLを生成しないように、ループしてぶつからないキーが確実に生成されるようにする
    for {
        io.ReadFull(rand, baseCode)
        publicKey := base64.StdEncoding.EncodeToString(baseCode)
        if _, ok := existingImages[publicKey]; !ok {
            return publicKey;
        }
    }
}

func registerImage(img image.Image) string {
    key := genPublicKey()
    existingImages[key] = img
    return "https://example.com/images/" + key
}
```

このサンプルは雑にbase64にしていますが、記号が入らないエンコードとしてbase62があります。UUID v4なんだけどbase64でなるべく文字列長を短くするGoライブラリも昔作ってみました。このあたり、どれだけ短くするか、利便性とセキュリティや空間の広さをどうするかはエンジニアリング的にチャレンジが楽しい分野かと思います。どういったID生成ロジックを使ってはいけないか、とかも資料では触れています。

https://github.com/shibukawa/uuid62

他には、Google CloudのAI系のAPIの発表がありました。仕事や趣味で使うチャンスもあるので知らない内容はなかったのですが、「アンパンマン」を含む音声をリアルタイムにテキスト化し、さらに英語翻訳するというクラウドエースの藏持さんの発表のデモは面白かったです。ウェザーニューズ（ズは濁点）の井原さんの発表も、データ量とかもろもろでその分野での圧倒的な感じがあって良かったです。チャンスがあれば使ってみたい。

API Meetupの運営のみなさま、発表の機会をいただきありがとうございました。
