---
title: "GoはJavaのStream APIの夢を見れるか？(見なくてもよい)"
date: 2025/03/17 00:00:00
postid: a
tag:
  - Go
  - Java
category:
  - Programming
thumbnail: /images/20250317a/thumbnail.png
author: 澁川喜規
lede: "ここ最近、Goには基本となる言語機能やパッケージにいくつかの更新が入っています。Go 1.18でジェネリクスが入る、Go 1.21でslicesパッケージが追加されスライスとマップに使える関数が追加される、Go 1.23で..."
---

<img src="/images/20250317a/top.png" alt="" width="800" height="474">

ここ最近、Goには基本となる言語機能やパッケージにいくつかの更新が入っています。

* Go 1.18でジェネリクスが入る
* Go 1.21で[slices](https://pkg.go.dev/slices)パッケージと[maps](https://pkg.go.dev/maps)パッケージが追加されスライスとマップに使える関数が追加される
* Go 1.23でrange over funcがオプションなしで使えるようになる
* Go 1.23でイテレータインタフェースの[iter](https://pkg.go.dev/iter)パッケージが追加され、 [slices](https://pkg.go.dev/slices)と[maps](https://pkg.go.dev/maps)にスライスやマップに対するイテレーションを行うための関数が追加される

# range over func

Goでは初期から ``for range`` でループ変数を使わないループが提供されてきました。ただし、使えるのは言語の組み込みの要素のスライスとチャネルだけでした。組み込み型ではなく、複数要素を持っているが一度に取り出すとメモリを使いすぎる恐れがあるかもしれないようなオブジェクト（＝外部イテレータ、Go用語ではpull型）では、「残りの要素があるかどうか？」を問い合わせてデータをループを1つずつ進める、というAPIを提供していました。たとえば`database/sql`だとこう。

```go
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		if err := rows.Scan(&id); err != nil {
			log.Fatal(err)
		}
		log.Printf("id=%d\n", id)
	}
```

``bufio.Scanner`` ならこう。

```go
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		fmt.Println(scanner.Text()) // Println will add back the final '\n'
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "reading standard input:", err)
	}
```

多くの言語ではこのようにライブラリレベルで提供されているイテレータも ``for`` ループで扱えるように言語自体を拡張する、というのが現在では主流です。RubyやPythonは　``each()`` メソッドのシンタックスシュガーやイテレータプロトコルとしてほぼ初期から備えています。Javaは5から拡張 ``for`` が導入されました。C++も11から範囲ベース ``for`` が、JavaScriptはES2015から ``for ... of`` 構文が導入されています。Goでは1.23で ``iter`` パッケージと、それを扱う文法、range over funcが追加されました。どれも名前は違いますが、ユーザー独自の型も言語組み込みの ``for`` ループで扱いやすくなる(Goでいうpush型）という点で同じです。

Goでは3つの特殊なシグネチャを定義しています。

* ``func(yield func() bool)``
* ``func(yield func(V) bool)``
* ``func(yield func(K, V) bool)``

それぞれ、 ``for range I``, ``for v := range I``, ``for k, v := range I``というループで使えます。また受け取りパラメータを減らすことも可能です。引数で渡された関数を呼ぶたびに、ループが一周回ります。また、ループが中断するとこの関数が ``false`` を返す、という取り決め（プロトコル）になっています。

後者2つはそれぞれ ``iter.Seq[V]``、``iter.Seq2[K, V]``という形で``iter``パッケージの型が宣言されています。

# イテレータを扱う組み込みライブラリ

スライスとマップを扱うライブラリは1.21で導入されていましたが、1.23ではrange over funcと歩調を合わせてイテレータを扱う関数が追加されました。

まず、スライスやマップからイテレータを取り出す関数が以下の5つです。

* ``slices.Values(s) iter.Seq``: 値のイテレータ
* ``slices.All(s) iter.Seq2``: 値とインデックスのイテレータ
* ``maps.Keys(m) iter.Seq``: マップのキーのイテレータ
* ``maps.Values(m) iter.Seq``: マップの値のイテレータ
* ``maps.All(m) iter.Seq2``: マップのキーと値のイテレータ

イテレータを受け取って、スライスやマップにする関数もあります。

* ``slices.Sorted(s iter.Seq)``: イテレータをソートした結果のスライスを作成
* ``slices.SortedStable(s iter.Seq)``: イテレータを安定ソートした結果のスライスを作成
* ``slices.AppendSeq(s, seq iter.Seq)``: イテレータの値をスライスに追加
* ``slices.Collect(seq iter.Seq)``: イテレータをスライスに変換
* ``maps.Collect(seq iter.Seq2)``: イテレータをマップに変換

何も返さないがマップに要素を追加する関数もあります。

* ``maps.Insert(m, s iter.Seq2)``: イテレータの要素をマップに追加

最後のを除外すると、スライスやマップからイテレータを取り出すのと、イテレータからスライスやマップを作成というペアのグループになっています。

# JavaのSteam APIっぽく扱ってみる

Java Stream APIはこんな感じです。stream()のあとはfluent APIで値の変換、フィルタリングなどをやり、最後に.toList()やら.collect()を呼んで、また元の配列に戻します。

```java
List<String> tenTimes = numbers.stream()
    .filter(v -> v % 2 == 0)
    .map(v -> v * 10)
    .toList(); // Java16までは.collect(Collectors.toList());
```

Goでこれをやろうとすると、現状map()相当のものとか、filter()相当のものがありません。

入力と出力に両方 ``iter.Seq`` もしくは ``iter.Seq2`` を受け取れるような関数を作れば連鎖的な変換処理が実装できます。

```Go
func Twice(src iter.Seq[int]) iter.Seq[int] {
	return func(yield func(result int) bool) {
		for v := range src {
			if !yield(v * 2) {
				break
			}
		}
	}
}

numbers := []int{1, 2, 3, 4, 5}
// スライスの値のイテレータを取り出し2倍にしてもとのスライスに戻す
fmt.Println(
    slices.Collect(
        Twice(
            slices.Values(numbers))))
```

毎回変換処理を実装するのではなく、無名関数で処理を与えるmap()やfilter()も作ろうと思えば簡単に作れます。[プロポーザル](https://github.com/golang/go/issues/61898)も出ています。

```go
func Map[P, R any](convert func(p P) R, src iter.Seq[P]) iter.Seq[R] {
	return func(yield func(result R) bool) {
		for p := range src {
			if !yield(convert(p)) {
				break
			}
		}
	}
}

func Filter[P any](check func(p P) bool, src iter.Seq[P]) iter.Seq[P] {
	return func(yield func(result P) bool) {
		for p := range src {
			if check(p) {
				if !yield(p) {
					break
				}
			}
		}
	}
}

fmt.Println(
	slices.Collect(
		Map(func(p int) int { return p * 2 },
			Filter(func(p int) bool { return p%2 == 0 },
				slices.Values(numbers)))))
```

書いてみるとJavaのようにstep1().step2().step3()という流れでは書けず、`Step3(Step2(Step1)))`という順序での書き方になってしまうため、記述性はいまいちです。

``Map()``と``Filter()``が``iter.Seq``のメソッドとして提供されていたなら、使い勝手はだいぶJavaに近いものになったのではという気がしますが、現状メソッドのみでジェネリクスを行うことができません。そのため、``.Map()``メソッドがあったとしても違う型のものを返すことができず、できることは限定されてしまいます。将来、メソッドレベルでもジェネリクスができるようになったらこうできるのにね、というイメージが以下の通りです。

```go
// 今はできないがメソッドのジェネリクスが
// 可能になったらできるようになりそうなコード
fmt.Println(
    slices.
        Values(numbers).
        Filter(func(p int) bool { return p%2 == 0 }).
        Map(func(p int) int { return p * 2 }).
        Collect()
)
```

イテレータにはもう1つサイズがわからないということによる問題もあります。

現状の[slices.Collect()](https://pkg.go.dev/slices#Collect)は次のような実装になっています。``Collect()``を呼ぶと空のスライスに対して``slices.AppendSeq()``を呼びますが、これは愚直に``append()``を要素数分呼ぶという実装になっています。場合によってはなんどもスライスの裏の配列のアロケーションが走ってメモリ確保がなん度も行われてうれしくないコードというのはGo中級者以上なら明確でしょう。

```go
// AppendSeq appends the values from seq to the slice and
// returns the extended slice.
func AppendSeq[Slice ~[]E, E any](s Slice, seq iter.Seq[E]) Slice {
	for v := range seq {
		s = append(s, v)
	}
	return s
}

// Collect collects values from seq into a new slice and returns it.
func Collect[E any](seq iter.Seq[E]) []E {
	return AppendSeq([]E(nil), seq)
}
```

Goはネイティブコードになるが故に実行効率が良いのですが、他の処理が早い分相対的にメモリ確保の時間が長く見えて、速度のペナルティとみなされがちという。あとは生成AIは別かもしれませんが、従来方式の前のコードから後ろのコードの候補を出すようなコード補完ができなかったり、何かしら要素数が明確なスライスなどを扱うにはちょっと牛刀すぎるな、という気がしています。まあメモリの件は``slices.Collect()``ではなく、``slices.AppendSeq(make([]int, size), seq)``を代わりに使えば良い気はしますが、低レイヤーではなく高レイヤーなロジックにフォーカスしていきたいというイテレータに寄せていくモチベーションとは相反するのかなぁ、という気がしています。

そもそも無名関数で引数や返り値の推論がないので型定義を省略せずに書かないといけないとか、複数行に分けて書く時に、他の言語のようにピリオドを先頭に書けない（末尾にピリオドを打つ、もしくは閉じカッコを次の行にする）というのとか、そもそもの言語仕様が高階関数＋fluent APIに適していない、という指摘もありました。

この原稿を書いたあとに[TypeScriptのコード](https://github.com/microsoft/typescript-go/blob/main/internal%2Fcore%2Fcore.go#L315)を教えてもらったのですが、まさにここに書いたようなことをやっていましたね。

# 現状の使い所

メモリの問題は、最後にスライスにしない箇所や、スライスにする場合もサイズがそこまで大きくなる見込みがないとか、もともとサイズが固定でわからないのであれば問題ないでしょう。あとはアプリケーションコードで、そこまでパフォーマンスが気にならない箇所などではどんどん使っても良いかと思います。もし速度とかメモリの懸念があれば`slices.Collect()`などは要チェック、だけ覚えておけば良いかと。

マップのキー名一覧を取得、ソートして取得とかそういうのをワンライナーでばしっと決められるのは良いのかなと思います。

```go
words := map[string]string{"hello": "こんにちわ", "good night": "おやすみなさい"}
keys := slices.Collect(maps.Keys(words))       // キー一覧のスライス
sortedKeys := slices.Sorted(maps.Keys(words))  // キー一覧のソート済みスライス
```

ただ、map/filter相当はプロポーザルの関数が来たとしても、そこまで書きやすいわけでも読みやすいわけでもないし、無理にJava Streamスタイルに持ち込むのではなく、通常の`for`ループで扱えば良いかなと思います。

# まとめ

ジェネリクスの導入からだいぶ進歩してきた感じはありますが、あとラスト1ピースが！という気持ちになったのでブログにまとめてみました。リスト処理がどれだけ便利になるか、今後の開発スタイルが変わるのかな、という興味で調べてみたけど、現時点ではまあ無理に変えていく必要性は薄いな、というのを実感しました。変えるとしたらメソッドのジェネリクスが導入された段階かな、と。

タイトルは「関数型」とした方がよりキャッチーだったかもしれないけど、関数型のエッセンスとしてみるとリスト処理はそのうちの1つでしかなく、パターンマッチも、末尾呼び出しの最適化も遅延評価もないので、リスト処理に限定する＆きっとイメージを持っている人が多いだろうJava Stream APIとしてみました。
