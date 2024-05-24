---
title: "golang.tokyoで発表してきました"
date: 2019/12/11 13:10:53
postid: ""
tag:
  - Go
  - golang.tokyo
  - 登壇レポート
category:
  - Programming
author: 辻大志郎
lede: "こんにちは。TIG の辻です。先日開催された golang.tokyo #28 に当社から2名、登壇しましたのでそのレポートをします。LT 景品で頂いた CNCF のキャラクターです。かわいいです。"
---

# はじめに

こんにちは。TIG の辻です。先日開催された [golang.tokyo #28](https://golangtokyo.connpass.com/event/156678/) に当社から2名、登壇しましたのでそのレポートをします。

LT 景品で頂いた CNCF のキャラクターです。かわいいです。

<img src="/images/20191212/1.jpg" class="img-small-size" loading="lazy">

https://www.cncf.io/phippy/

# インライン展開の話 by 辻

コンパイラがどのような最適化を実施しているか、気にしたことはありますか？コンパイラは定数の畳み込みやデッドコードの削除、インライン展開、他にもいろいろなコードの最適化を実施します。といっても私も正直あまり気にしたことがありませんした。そんなときに Go は積極的にインライン展開をしない言語だ、という噂を聞き、あれ、そもそも Go でインライン展開ってどのような挙動をするんだっけ？という疑問から今回の登壇のネタが生まれました。

当時調べた内容は Qiita の記事 [Go Compilerのインライン展開についてまとめた](https://qiita.com/tutuz/items/caa5d85544c398a2da9a) にまとまっています。

私にとって非常に興味深い内容でした。インライン展開がアセンブリを見て、どのように展開されているのか確認したのはもちろん、Go の標準ツールで逆アセンブリしてアセンブリを見ることができます。Go は標準ツールが充実しているとよく言われますが、低レイヤーの内容もシンプルに調べられる点は嬉しいです。

明日から開発業務で使える内容！ではないと思いますが、多くの Gopher にきっと役に立つだろう！と思い、どこかでお話したいなぁ...と思っていました。そんなときに年末に Go の LT 大会が実施されるという話を聞きました。これは登壇するしかない！と思い、申し込むに至りました。

LT の資料は以下です。

<script async class="speakerdeck-embed" data-id="e2a29b8f2b3c43c1b1f10a73f1e0d343" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

<img src="/images/20191212/2.jpg" class="img-middle-size" loading="lazy">

いろいろな反応をいただきました！聞いていただき、ありがとうございます！

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">objdump知らなかった<a href="https://twitter.com/hashtag/golangtokyo?src=hash&amp;ref_src=twsrc%5Etfw">#golangtokyo</a></p>&mdash; ゴリラ@自宅警備隊 (@gorilla0513) <a href="https://twitter.com/gorilla0513/status/1202179090658164738?ref_src=twsrc%5Etfw">December 4, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">objdumpで逆アセンブリ可能<a href="https://twitter.com/hashtag/golangtokyo?src=hash&amp;ref_src=twsrc%5Etfw">#golangtokyo</a></p>&mdash; エンジニアのホゲさん（hon-D） 🌔 (@yyh_gl) <a href="https://twitter.com/yyh_gl/status/1202179227790917632?ref_src=twsrc%5Etfw">December 4, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">objdump xxx.exe <a href="https://twitter.com/hashtag/golangtokyo?src=hash&amp;ref_src=twsrc%5Etfw">#golangtokyo</a> <br>インライン展開呼び出しコスト<br>5倍程度</p>&mdash; it engineer (@itengineer18) <a href="https://twitter.com/itengineer18/status/1202179602979807233?ref_src=twsrc%5Etfw">December 4, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

年末大 LT 大会ということで総勢 16 名の方が LT を実施しました。いろいろな Gopher の話を聞くことができ、とても有意義でした。当社からは私の他にも澁川が登壇しました。

---


# あなたはContextの挙動を説明できますか？ by 澁川

渋川は「あなたはContextの挙動を説明できますか？」というお題で発表してきました。

<script async class="speakerdeck-embed" data-id="9db3caf5b84a42ee80561f9d9def0a67" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

`Context`にはタイムアウトやらデッドラインの指定やらができますが、時間というものを外部からいじることができない以上、これらのテストにはその時間分かかってしまいかねません。モックを作ってみようと思ったものの、`Context`の正確な挙動ってそういえばよくわからないなと思い、調べてみたのがきっかけです。

怖がらせる意図はなかったのですが、途中のクイズが意地悪すぎて、`Context`が怖くなった、`Context`何もわかっていなかった、というようなコメントも見かけましたが、使う側の人はここまで知らなくてもいいと思います。最初の方で紹介しているベストプラクティスだけ知れば十分かと。ここまで知ると嬉しい人は、モックを作りたい人、あるいはキャンセルとタイムアウトを区別したテストを正確に書きたい人・・・とかですかね。

# GoのContextはなぜこのような設計なのか？

時間が間に合わなそうだったのでバッサリカットしましたが、当初は、`Context`ってなんでこのような設計になっているのか、というエッセーを入れていました。解説ではなくてエッセーなのは、設計ドキュメントがあれば読みたかったのですが、見当たらなかったので推測だからです。僕が知っている各種設計とは似ても似つかなかったのでどのようにここに至ったのか、というのが気になっていました。

上記のスライドのコメントにも書かれていましたが、おそらくはC#の[CancellationToken](https://docs.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken?view=netframework-4.8)あたりからの着想なのかな、と思っています。非同期処理のときにトークンをわたしておき、呼び出し元からキャンセルの意志を伝える、というものです。

Goは例外がない、というのはよく言われてきましたが、旧来の例外処理機構（スタックトレースを巻き戻しながら、マッチするcatch節を探し続け、途中のリソースを開放していく）は最近のプログラミングモデルとは多少合わないところがあります。それは非同期と並列処理です。

非同期の場合、スタックを巻き戻しても本来の呼び出し元にたどり着くとは限りません。JavaScriptのコールバックがネストされた中で、メソッド名の`destroy()`を`destory()`にタイポして涙をのみ続けた人には首の骨が折れるぐらい同意して頷いてくれると思います。JavaScriptは`Promise`の機構の中で例外オブジェクトを持ち回る機能を入れ、`async`関数の中の`try`節がこれを特別扱いして`catch`節に渡すというアクロバティックなことをして非同期でも例外処理を今までどおり書けるようにしています。

Goはgoroutineの起動が早いため、非同期よりも並列処理を良く使います。並列処理もスタックを巻き戻しても分岐したところには戻れないということもありますが、複数のgoroutineにファンアウトして処理を投げている場合に、1つのgoroutineで問題が発生したときに、他のgoroutineもまとめて終了させる必要が出てきます。そこでCancellationToken的なものが役に立ってきます。それがContextの原型になったのでは、と考えています。

もう一つ、Goのgoroutineは「IDを持たず区別がない」とよく言われます。実際にはpanic時にIDが表示されるので内部にはあるはずですが、そこにアクセスして、そのIDをもとにしたプログラミングの手法は提供されていません。スレッドローカルストレージがなくてもIDさえあれば、それをキーにグローバル変数に定義しておいたmapから情報取得とかもできたかもしれませんが、Goはそこでスレッドローカルストレージの代わりに、ストレージっぽいオブジェクトを持ち回ることで、解決するという方法を選んだのでは、と思います。これにより、リクエストを受けたgoroutineがさらにファンアウトしても、その子供goroutineに共通でデータを見せることができるようになります。

まとめると僕のContextの設計の予想は

* Goにない例外処理を、並列処理でも扱いやすい形で入れた
* Goにはないスレッドローカルストレージを、並列処理でも扱いやすい形で入れた

という感じです。オブジェクト指向の設計だと、1つのクラスに責務は1つ、というのがよく言われることですが、`Context`は2つの役割を持っています。`Context`という名前の通り、メインのドメインというか利用されるコードとは世界が違う「環境」を表すものであり、なるべく空気のような薄い存在でいたい、という理由からまとめたのかなぁ、と想像されます。本当のことは聞いてみないとわからないですが。

`Context`の`Err()`の伝搬やら、Valueの伝搬は親方向に行かない、というのは不思議に思えますが、ファンアウトした中からさらにファンアウトした場合に、予想外のところのエラーやら値を拾ってしまうと不具合の発見が極めて困難になるのは容易に想像できるため、このような挙動になっているのではないかと思います。

↑というのはすべて妄想なので、もし何かContextの設計に関する知見をお持ちの方、こっそり教えて下さい！
