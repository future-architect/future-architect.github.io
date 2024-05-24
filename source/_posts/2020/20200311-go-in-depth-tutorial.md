---
title: "JavaプログラマーのためのGo言語入門"
date: 2020/03/11 09:39:47
postid: ""
tag:
  - Go
  - Java
  - 翻訳
  - 入門
  - 他言語からGoへ
category:
  - Programming
author:
  - 柏木祥子
  - 佐藤尚至
lede: "Java to Go in-depth tutorialの日本語訳です。原文の著者に許諾を得て翻訳・公開いたします。このチュートリアルは、JavaプログラマーがすばやくGo言語にキャッチアップできるようにすることを目的としています。"
---
## JavaプログラマーのためのGo言語入門

こちらは[Java to Go in-depth tutorial](https://yourbasic.org/golang/go-java-tutorial/)の日本語訳です
原文の著者に許諾を得て翻訳・公開いたします。

このチュートリアルは、JavaプログラマーがすばやくGo言語にキャッチアップできるようにすることを目的としています。

## 目次

* [Hello stack](./#Hello-stack1)
* [主な違い](./#主な違い)
* [シンタックス（文法）](./#シンタックス（文法)
* [定数](./#定数)
* [構造体](./#構造体)
* [ポインタ](./#ポインタ)
* [スライス](./#スライス)
* [値の作成](./#値の作成)
* [メソッドとインターフェース](./#メソッドとインターフェース)
* [エラー](./#エラー)
* [PanicとRecover](./#PanicとRecover)
* [ゴルーチンとチャネル](./#ゴルーチンとチャネル)
* [Hello server](./#Hello-server)

## Hello stack [^1]

 [^1]: 後入れ先出し（LIFO: Last In First Out; FILO: First In Last Out）の構造

まずはじめに簡単な例を見ていきましょう。この例ではシンプルな抽象データ型をGoで実装しています。

```go
// collectionパッケージはstring型を格納できるスタックを実装している
package collection

// Stackのゼロ値はすぐに使用できる空のスタック
type Stack struct {
    data []string
}

// Pushメソッドはスタックの一番上にxを追加する
func (s *Stack) Push(x string) {
    s.data = append(s.data, x)
}

// Popメソッドは最後に追加された要素をスタックから削除しつつ、その要素を返す
// 空のスタックでPopメソッドを呼ぶとランタイムエラーが発生する
func (s *Stack) Pop() string {
    n := len(s.data) - 1
    res := s.data[n]
    s.data[n] = "" // メモリリークを避けるための処理
    s.data = s.data[:n]
    return res
}

// Sizeメソッドはスタックの要素数を返す
func (s *Stack) Size() int {
    return len(s.data)
}
```

* 最上位の宣言文の前に直接書かれているコメントはドキュメントコメントになります。ドキュメントコメントはプレーンテキストで書かれます。
* 変数を宣言するときは、変数名の後ろに型を書きます。
* 構造体( `struct` )はJavaでいうところのクラスに該当します。Goの構造体はメソッドをメンバに含めることはできません。変数のみを構造体のメンバに含めることができます。
* コード上の `(s *Stach)` という部分でメソッドのレシーバーを宣言しています。これはJavaでいうところの `this` に該当します。
* `:=` という演算子は変数の宣言と初期化を同時に行ってくれます。変数の型は初期化式から自動で導かれます。

以下のコードは、抽象データ型 `collection.Stack` を用いたHello worldプログラムです。

```go
package collection_test

import (
    "fmt"
    "go-for-java-programmers/collection"
)

func ExampleStack() {
    var s collection.Stack
    s.Push("world!")
    s.Push("Hello, ")
    for s.Size() > 0 {
        fmt.Print(s.Pop())
    }
    fmt.Println()
    // Output: Hello, world!
}
```

* この `collection_test` というテストパッケージは `collection` パッケージと同じディレクトリに配置します。
* 1つめの`import` 文の `fmt` はGoの標準パッケージです。 2つめ `import` 文は“go-for-java-programmers/collection”ディレクトリのパッケージを使うことを示しています。
* ソースコード上では `fmt` や `collection` という短い名前でこれらのパッケージにアクセスできます。

NOTE: Goでスタックを実装する慣用的な方法は、スライスを直接使用することです。詳しくは[Implement a stack (LIFO)](https://yourbasic.org/golang/implement-stack/)を参照してください。

## 主な違い

### オブジェクト指向プログラミング

* Goにはコンストラクタを伴うクラスという概念がありません。インスタンスメソッド、クラスの継承構造、メソッドの動的ルックアップで実現したいことを、Goでは[struct](https://yourbasic.org/golang/structs-explained/)と[interface](https://yourbasic.org/golang/interfaces-explained/)を用いて実現します。
* Goでは、どんな型に対しても[メソッド](https://yourbasic.org/golang/methods-explained/)を作成することができます。レシーバーをボックス化する必要もありません。レシーバーはJavaでいうところの `this` に対応します。レシーバーには値そのものかポインタが入ります。
* Javaの `public`や `package-private` に似た２つのアクセスレベルがGoには存在します。トップレベルで宣言された [^2]変数や関数の名前が大文字で始まる場合は `public` 、小文字で始まる場合は `package-private` のアクセスレベルになります。

 [^2]: `{}` の中で宣言されていない変数・関数をトップレベルで宣言された変数・関数と読んでいる。import文はトップレベルで宣言されている。main packageのmain関数はトップレベルで宣言されている。

### 関数型プログラミング

* Goの関数は第一級オブジェクトです。[関数値](https://yourbasic.org/golang/function-pointer-type-declaration/)は他の値と同じように使用したり、関数の引数として渡すことができます。[関数リテラル](https://yourbasic.org/golang/anonymous-function-literal-lambda-closure/)は外側の関数で定義された変数を参照できます。

### ポインタと参照

* Goは、オブジェクトや配列だけでなく、すべての型で[ポインタ](https://yourbasic.org/golang/pointers-explained/)を使用することができます。任意の型 `T` には対応するポインタ型 `*T` が存在します。これは型 `T` の値へのポインタを示しています。
* Goでは無効なポインタに `nil` を使用しますが、Javaでは `null` を使用します。
* Goの配列は値型です。配列が関数の引数として使用される場合、その関数は配列へのポインターではなく配列のコピーを受け取ります。実際には、配列ではなくスライスを関数の引数に渡すことがほとんどです。スライスは参照型です。
* 特定の型(マップ, スライス, チャネル)は値型ではなく、参照型です。つまり、マップを関数に渡してもマップはコピーされません。渡されたマップを関数内で変更した場合、変更は呼び出し元にも反映されます。Javaの用語を使うと、これはマップへの参照が行われているからだと説明できます。

### 組み込み型

* 文字列型はGoの言語仕様として組み込まれています。[string](https://yourbasic.org/golang/string-functions-reference-cheat-sheet/) はbyte型のスライスのように振る舞いますが、イミュータブルです。
* ハッシュテーブルはGoの言語自体に組み込まれています。Goでは[map](https://yourbasic.org/golang/maps-explained/)と呼びます。

### エラーハンドリング

* Goでは例外処理(exceptions)の代わりに、[error](https://yourbasic.org/golang/errors-explained/)を使用します。EOFなどのイベント、配列の範囲外の領域にアクセスしようとしたしたときのランタイム[パニック](https://yourbasic.org/golang/recover-from-panic/)はerrorで表現されます。

### 並行処理

* Goでは個別に動く実行スレッドを[ゴルーチン](https://yourbasic.org/golang/goroutines-explained/)と呼びます。またゴルーチン間の通信は[チャネル](https://yourbasic.org/golang/channels-explained/)を使用します。これらは言語が提供しています。

### 用意されていない機能

* Goは暗黙的な型変換をサポートしていません。異なる型を混在させるような操作では、明示的な型変換が必要です。一方、数値型の定数を宣言するときには、型を指定せずに定数を宣言できます。この場合、宣言時の段階では、数値の上限は未確定になります。詳しくは[Untyped numeric constants with no limits](https://yourbasic.org/golang/untyped-constants/)を参照してください。
* Goでは関数のオーバロードをサポートしていません。同じスコープ内の関数及びメソッドにはユニークな名前を付ける必要があります。代替手段としては[Optional parameters and method overloading](https://yourbasic.org/golang/overload-overwrite-optional-parameter/)を参照してください。
* Goには組み込みのスライスやマップといったジェネリクス及び、`append` や `copy` といったジェネリクス用関数があります。しかし、ジェネリクス用関数を独自実装できる機構はありません。代替手段としては、[Generics (alternatives and workarounds)](https://yourbasic.org/golang/generics/)を参照してください。

## シンタックス（文法）

### 宣言

変数の宣言の仕方は、Javaと比べると逆になっています。Goでは変数名の後ろに型名を記述します。これによってGoのコンパイラが「変数××の型は○○である」と解釈しやすくなります。

| Goの書き方              | Javaでざっくりイコールな書き方                                                    |
| :---------------------- | :-------------------------------------------------------------------------------- |
| var v1 int              | int v1 = 0;                                                                       |
| var v2 *int             | Integer v2 = null;                                                                |
| var v3 string           | String v3 = "";                                                                   |
| var v4 [10]int          | int[] v4 = new int[10];  <br> (Arrays are values in Go.)                          |
| var v5 []int            | int[] v5 = null;                                                                  |
| var v6 *struct{ a int } | class C { int a; } <br> C v6 = null;                                              |
| var v7 map[string]int   | HashMap<String, Integer> v7; <br> v7 = null;                                      |
| var v8 func(a int) int  | interface F { <br> &nbsp;&nbsp;&nbsp;&nbsp;int f(int a); <br> } <br> F v8 = null; |

一般的に、宣言ではキーワードの後ろにオブジェクト [^3]の名称が続きます。キーワードとは`const`、`type`、`var`や`func`などです。キーワードの後ろに括弧でまとめて宣言を書くこともできます。
 [^3]: Javaの世界で呼ばれる「オブジェクト」と同義です。

```go
var (
    n int
    x float64
)
```

関数を定義する時、引数の名前の付け方は統一する必要があります。それぞれの引数に名前をつけるか、または全く名前をつけないかです。いずれかに名前をつけ、いずれかは省略するということはできません。複数の引数が同じ型の場合、グループ化することは可能です。

```go
func f(i, j, k int, s, t string)
```

変数は宣言の時に初期化することもできます。初期化も行う場合、変数の型を特定することもできますが、必須ではありません。型が特定されていない場合は、初期化式の右辺の値の型が設定されます。

```go
var v9 = *v2
```

もしも変数が明示的に初期化されていない場合でも、型は指定する必要があります。この場合、初期値は暗黙的に[ゼロ値](https://yourbasic.org/golang/default-zero-value/)（0、`nil`、""など）が与えられます。Goの世界では初期化されていない変数は存在しません。

### 宣言の省略形

関数の中では、`:=`で宣言を簡略化することもできます。例えばこの文は

```go
v10 := v1
```

下の文と同様の意味を持ちます。

```go
var v10 = v1
```

### 関数型

Goでは、関数は第一級オブジェクトに属しています。Goの世界では、引数と戻り値の型が同一の関数は全て同じ[関数型](https://yourbasic.org/golang/function-pointer-type-declaration/)をしているとみなされます。

```go
type binOp func(int, int) int

var op binOp
add := func(i, j int) int { return i + j }

op = add
n = op(100, 200)  // n = 100 + 200
```

### 複数割り当て

Goでは代入で複数の値を割り当てることができます。右側の式は左側の被演算子に割り当てられる前に評価されます。

```go
i, j = j, i  // iとjを置き換える
```

関数が複数の値を戻り値として返すこともできます。その場合括弧()の中に列挙して示します。戻り値を一度に複数の変数に保存することもできます。

```go
func f() (i int, pj *int) { ... }
v1, v2 = f()
```

### ブランク識別子

[ブランク識別子](https://yourbasic.org/golang/underscore/)は`_`(アンダースコア）で表され、複数の戻り値が返ってくる式で値を無視したい場合に用いられます。

```go
v1, _ = f()  // f()の関数から返ってきた2つ目の値を無視する
```

### セミコロンとフォーマット

セミコロンやフォーマットで悩む必要はありません。「gofmt」を使えば、唯一のスタンダードであるGoのスタイルに整形することができます。このスタイルは最初は違和感を感じるかもしれませんが、他のスタイルと同じように良く、また慣れてしまえば快適なものとなるでしょう。

実際、セミコロンを使う機会はGoではめったにありません。理論上、Goの全ての宣言はセミコロンで終わります。しかしGoは、行が明らかに処理途中のものでない限り、空白でない行の終わりに暗黙的にセミコロンを挿入します。これによって、場合によっては改行が許されないケースもでてくるのです。例えば、下のような書き方は許されません。

```go
func g()
{            // 不正: "{" は前の行に存在すべきである
}
```

この場合、`g()` のすぐあとにセミコロンが挿入されてしまいます。その結果、関数を定義しているのではなく関数を宣言しているとみなされてしまいます。同様に、下のような書き方もできません。

```go
if n == 0 {
}
else {       // 不正: "else {" は前の行に存在すべきである
}
```

この場合、`else`の前の`}`の直後にセミコロンが挿入されてしまい、結果として文法エラーになります。

### if文（条件文）

Goではif文、for文の条件式、switch文の値を括弧()で囲みません。一方、if文やfor文のボディは中括弧{}で囲む必要があります。

```go
if a < b { f() }
if (a < b) { f() }          // 括弧は不要
if (a < b) f()              // 不正

for i = 0; i < 10; i++ {}
for (i = 0; i < 10; i++) {} // 不正
```

さらに、if文やswitch文ではオプショナルな初期化式を記述することもできます。多くの場合これはローカル変数を設定するときに用いられます。

```go
if err := file.Chmod(0664); err != nil {
    log.Print(err)
    return err
}
```

### For文

Goにはwhile文もdo-while文もありません。for文を単一の条件と一緒に用いることができ、これがwhile文と同様の動きになります。条件を完全に省略すると無限ループ文となります。

[for文](https://yourbasic.org/golang/for-loop/)は文字列（`string`）、配列（`array`）、スライス（`slice`）、マップ（`map`）やチャネル（`channel`）を `range` 句に指定できます。通常であれば下のように書きますが、

```go
for i := 0; i < len(a); i++ { ... }
```

`a`の各要素に対して繰り返して処理をしたい場合、下のように書くことができます。

```go
for i, v := range a { ... }
```

上の書き方では、`i`にインデックスが割り当てられ、`v`に配列やスライス、文字列などの要素の連続する値が割り当てられます。

* 文字列の場合は、`i`はバイトごとのインデックスとなり、`v`は`rune`型のUnicodeのコードポイント [^4]となります（`rune`は`int32`のエイリアスです）。
* mapでの繰り返しはキー・バリューのペアの反復値を生成しますが、チャネルは反復値を１つだけ生成します。
 [^4]: Unicodeの[コードポイント](https://ja.wikipedia.org/wiki/%E7%AC%A6%E5%8F%B7%E7%82%B9)とは、全ての文字を4桁の16進数で一意に表現したコード体系の値です。

### BreakとContinue

Javaと同じように、Goでも`break`と`continue`でラベルを指定することができますが、for文、switch文、select文の中でラベルを参照する必要があります。

### Switch文

Goの[switch文](https://yourbasic.org/golang/switch-statement/)では、`break`を書かなくても、`switch` から抜け出ることができます。コードブロックの最後に`fallthrough`文を置くことで、次の `case`に処理を回すことができます。

```go
switch n {
case 0: // caseの中身は空である
case 1:
    f() // n == 0のときf()は呼ばれない
}
```

しかし、`case`は複数の値を持つことができます。

```go
switch n {
case 0, 1:
    f() // n == 0 または n == 1のときf()が呼ばれる
}
```

`case`の中の値は、例えば文字列やポインタなど、等価比較演算子で扱うことのできるどんな型でも使えます。switch式がない場合、その式は`true`とみなされます。

```go
switch {
case n < 0:
    f1()
case n == 0:
    f2()
default:
    f3()
}
```

### インクリメントとデクリメント

`++`と`--`は後置演算子として文の中でのみ使うことができます。式の中で扱うことはできません。例えば、`n = i++`と書くことはできません。

### Defer文

[defer文](https://yourbasic.org/golang/defer/)を使うことで、呼び出し元の関数がreturnされたタイミングで実行されるべき処理を記述することができます。

* defer宣言された関数は、呼び出し元の関数がどのようにretrunされたかに関わらず実行されます。 [^5]

 [^5]: panicが発生して、呼び出し元の関数が強制的にreturnされても、defer宣言された関数は実行されます。

* defer宣言された関数の引数は、defer宣言されたタイミングで計算され、実行時に使用されるまで保存されます。 [^6]
 [^6]: サンプルコード ( <https://play.golang.org/p/XDaWkZqEZ9K> )

```go
f, err := os.Open("filename")
defer f.Close() // fはこの関数がreturnされたときに終了する
```

## 定数

Goの定数は[untypedな状態](https://yourbasic.org/golang/untyped-constants/)にすることもできます [^7]。このルールは下記に適用されます。

* 数値リテラル、
* 型なしの定数のみを用いている式、
* 型が与えられていない、もしくは初期化式が型なしであるconst式

 [^7]: untypedな状態の時は型が決まっておらず、式や代入の中でその定数が用いられる時、型が決定されます。

型なしの定数の値は、型のある値が必要になったタイミングで型定義されます。これにより、Goでは明示的な型変換が行われないにも関わらず、定数を比較的自由に扱うことができます。

```go
var a uint
f(a + 1)   // 型の定義されていない数値1はuintとして型定義される
f(a + 1e3) // 1e3もuintとして定義される
```

Go言語では型定義のない数値の定数に上限値は明確にされません。型が必要になったときにのみ上限は適用されます。

```go
const huge = 1 << 100
var n int = huge >> 98
```

もしも変数宣言において型が定義されておらず、対応する式が型のない数値の定数だった場合、その数値は、値が文字列なのかintegerなのか浮動小数点なのか複素定数なのかによって`rune`、`int`、`float64`か`complex128`の型にそれぞれ変換されます。

```go
c := 'å'    // rune (int32のエイリアス)
n := 1 + 2  // int
x := 2.7    // float64
z := 1 + 2i // complex128
```

Goでは列挙型を扱いません。その代わりに、連続して増え続ける値を唯一const宣言することができる`iota`という特別な名称をつけることができます。constの初期化式が省略された時は、先に定義された式が再利用されます。

```go
const (
    red = iota // red == 0
    blue       // blue == 1
    green      // green == 2
)
```

## 構造体

[構造体](https://yourbasic.org/golang/structs-explained/)はJavaでいうクラスのようなものですが、構造体のメンバにはメソッドを含めることはできません。構造体は変数のみで構成されます。構造体のポインタは、Javaでいう参照変数のようなものです。Javaのクラスとは対照的に、Goの構造体は直接の値として定義することもできます。どちらの場合でも、構造体のメンバにアクセスするには`.`を用います。

```go
type MyStruct struct {
    s string
    n int64
}

var x MyStruct     // x は MyStruct{"", 0} に初期化される
var px *MyStruct   // px は nil に初期化される
px = new(MyStruct) // px は新たに作られる MyStruct{"", 0} のポインタとなる

x.s = "Foo"
px.s = "Bar"
```

Goでは、ユーザー定義型に対してメソッドを追加することができます。これは構造体をベースにしたユーザー定義型に限った話ではありません。詳しくは[メソッドとインターフェース](https://yourbasic.org/golang/go-java-tutorial/#methods-and-interfaces)をご参照ください。

## ポインタ

int, struct, arrayの代入操作は、オブジェクト実体をコピーすることを意味します。Javaでいう参照変数をGoで実現するためには[ポインタ](https://yourbasic.org/golang/pointers-explained/)を使用します。

任意の型Tには、対応するポインタ型 `*T` があり、型Tの値へのポインタを示します。

ポインタ変数が参照するメモリ領域を割り当てるには、組み込み関数 `new` を使用します。これは、型を引数として受け取り、割り当てられたストレージへのポインタを返す関数です。割り当てられたストレージ領域は、その型に対応するゼロ値で初期化されます。例えば、`new(int)` はint用にストレージの割り当てを新規で行い、その領域を値0で初期化し、そして `*int` 型を持つそのアドレスを返します。

`T p = new T()` というJavaコードをGoコードに置き換えてみましょう。`T` は２つの `int` 型インスタンスを持つクラスだとします。これに対応するGoコードは次のとおりです。

```go
type T struct { a, b int }
var p *T = new(T)
```

より慣用的には次のように書きます。

```go
p := new(T)
```

 `var v T` は型Tの値を保持するための変数を宣言していますが、こういった宣言方法はJavaには存在しません。
複合リテラルを使用して値を初期化することもできます。例えば：

```go
v := T{1, 2}
```

これは以下と同じです。

```go
var v T
v.a = 1
v.b = 2
```

型Tの変数xの場合、アドレス演算子 `＆x` はxのアドレス(`*T` 型の値)を提供します。例えば：

```go
p := &T{1, 2} // pは型 *Tを持つ
```

変数xがポインタ型変数の場合、ポインタの間接参照 `*x`は、xが指す値を示します。ポインタの間接指定はほとんど使用されません。GoはJavaと同様に、変数のアドレスを自動的に取得できます。

```go
p := new(T)
p.a = 1 // (*p).a = 1 に等しい
```

## スライス

[スライス](https://yourbasic.org/golang/slices-explained/)は概念的には下記の3つのフィールドをもつ構造体です。

* 配列に対するポインタ
* 長さ
* 容量

スライスでは`[]`演算子を使ってスライス内部の配列の要素にアクセスします。

* 組み込み関数である`len`関数はスライスの長さ(`length`)を返します。
* 組み込み関数である`cap`関数はスライスの容量(`capacity`)を返します。

ある配列やスライス(例えば`a`)から新規のスライスを生成する場合、`a[i:j]`の形で生成することができます。この`a[i:j]`は

* インデックス`i`からインデックス`j`の手前までの`a`を参照したスライスになります。
* `j-i`の長さを持っています。
* `i`が省略されていた場合、スライスは0を起点とします。
* `j`が省略された場合、スライスはaの長さ（len(a)）までの長さとなります。

新しくできたスライスは`a`が参照しているものと同一の配列を参照します。つまり、新しいスライスで要素が変更された場合、`a`の要素も同じように変更されます [^8]。

 [^8]: サンプルコード ( <https://play.golang.org/p/J3JBKvSmYJW> )

新しいスライスの容量は、純粋に`a`から`i`を引いた差分となります。配列の容量と配列の長さはイコールです。

```go
var s []int
var a [10]int

s = a[:] // s = a[0:len(a)]の短縮形
```

もし、`[100]byte`型の値（`byte`100個分の配列、例えばバッファ）を作り、関数に参照渡しをしたいのであれば、`[]byte`型の引数を持つ関数を宣言し、配列をスライスに変えて、その引数に渡してあげるのが良いでしょう [^9]。スライスは、[下記](https://yourbasic.org/golang/go-java-tutorial/#making-values)に書いてあるような`make`関数でも作り出すことができます。

 [^9]: サンプルコード ( <https://play.golang.org/p/jTKvVIBqwMa> )

スライスには組み込み関数`append`が備え付けられており、Javaの`ArrayList`とほぼ同様の機能を持っています。

```go
s0 := []int{1, 2}
s1 := append(s0, 3)     // 要素を1つ追加する
s2 := append(s1, 4, 5)  // 要素を複数追加する
s3 := append(s2, s0...) // スライスを1つ追加する
```

スライス構文は文字列と一緒に使うこともできます。文字列のスライスは、オリジナルの文字列の部分文字列を返します。

## 値の作成

Mapやチャネルの値は、組み込み関数である`make`関数によって割り当てられていなければなりません。例えば、

```go
make(map[string]int)
```

をコールすると、新しく`map[string]int`型で割り当てられた値が返ってきます。

`new`とは対照的に、`make`はアドレスではなくオブジェクトそのものが返ってきます。これはMapやチャネルが参照型であるという事実に一致しています。

Mapの場合、`make`では第2オプション引数に容量ヒントを渡すことができます。

チャネルの場合は、第2オプション引数はチャネルのバッファの容量となります。デフォルトは`0`です。（バッファがない状態）

`make`関数はスライスを割り当てる場合にも使用されます。この場合`make`関数は、スライスのもとになる配列にメモリを割り当て、それを参照するスライスを返します。必須の引数として、スライスの要素数を渡さなければなりません。第2オプション引数でスライスの容量を指定できます。

```go
m := make([]int, 10, 20) // new([20]int)[:10]と同意
```

## メソッドとインターフェース

メソッドは、レシーバーを持っていることを除いて、通常の関数定義のような見た目をしています。レシーバーは、Javaインスタンスメソッドのthis参照に似ています。

```go
type MyType struct { i int }

func (p *MyType) Get() int {
    return p.i
}

var pm = new(MyType)
var n = pm.Get()
```

上記の例では、 `MyType` に関連付けられた `Get` メソッドを宣言しています。このメソッドの中で、レシーバーはpという名前を付けられています。

メソッドは定義済みの型に対して宣言されます。レシーバーを別の型に変換すると、変換後の新しい変数は変換前の型のメソッドではなく、変換後の型のメソッドを持つようになります。

組み込み型から派生した新しい型を宣言することにより、組み込み型にメソッドを定義できます。その新しい型は、もとの組み込み型とは全く別のものとなります。

```go
type MyInt int

func (p MyInt) Get() int {
    return int(p) // intへの変換は必須
}

func f(i int) {}
var v MyInt

v = v * v // 派生元の演算子は引き続き使用できる
f(int(v)) // int(v) には宣言されたメソッドがない
f(v)      // INVALID
```

### インターフェース

Go[インターフェース](https://yourbasic.org/golang/interfaces-explained/)はJavaインターフェースに似ていますが、Goインターフェースの場合、インターフェースが要求するメソッド群を提供している型はみな、そのインターフェースの実装として扱われます。明示的な宣言は必要ありません。

以下のインターフェースが定義されているとします。

```go
type MyInterface interface {
    Get() int
    Set(i int)
}
```

`MyType` はすでに `Get` メソッドを持っているので、 `Set` メソッドを追加することにより、 `MyType` が `MyInterface` を満たすようになります。

```go
func (p *MyType) Set(i int) {
    p.i = i
}
```

`MyInterface` を引数にもつ関数は皆、 `*MyType` 型の変数を受け容れます。

```go
func GetAndSet(x MyInterface) {}

func f1() {
    var p MyType
    GetAndSet(&p)
}
```

Javaの用語を使うとすると、 `*MyType` の `Set` および `Get` を定義すると、 `*MyType` が自動的に `MyInterface` を `implement` します。
型は複数のインターフェースを満たすことができます。これはダックタイピングの一種です。

> アヒルのように歩き、アヒルのように泳ぎ、アヒルのように鳴く鳥を見るとき、私はその鳥をアヒルと呼ぶ。
> – James Whitcomb Riley

### 埋め込み（委譲）

型を匿名フィールドとして埋め込むことで、派生型を実装することができます。

```go
type MySubType struct {
    MyType
    j int
}

func (p *MySubType) Get() int {
    p.j++
    return p.MyType.Get()
}
```

事実上、MySubTypeがMyTypeの派生型として実装されます。

```go
func f2() {
    var p MySubType
    GetAndSet(&p)
}
```

`Set` メソッドは `MyType` 型から継承されます。これは匿名フィールドのメソッドが、派生型のメソッドへと昇格されるためです。

この場合、 `MySubType` には `MyType` 型の匿名フィールドがあるため、 `MyType` のメソッドは `MySubType` のメソッドになります。`Get` メソッドはオーバーライドされ、 `Set` メソッドは継承されています。

これはJavaのクラス継承と同じではなく、委譲という方式をとっています。匿名フィールドのメソッドが呼び出されたとき、そのメソッドのレシーバは、派生型(`MySubType`)の方ではなく、内包する匿名フィールド(`MyType`)になります。つまり、匿名フィールドのメソッドは動的に派生型のメソッドとしてディスパッチされません。Javaの動的メソッドルックアップに相当するものが必要な場合、`interface` を使用してください。

```go
func f3() {
    var v MyInterface

    v = new(MyType)
    v.Get() // *MyTypeのGetメソッドをコールしている

    v = new(MySubType)
    v.Get() // *MySubTypeのGetメソッドをコールしている
}
```

### 型アサーション

あるインターフェース型が実装されている変数は、[型アサーション](https://yourbasic.org/golang/type-assertion-switch/)を使用して、異なるインターフェース型を持つように変換できます。これは実行時に動的に変換されます。Javaとは異なり、2つのインターフェース間の関係を宣言する必要はありません。

```go
type Printer interface {
    Print()
}

func f4(x MyInterface) {
    x.(Printer).Print() // Printerへの型アサーション
}
```

`Printer` への変換は動的に行われます。xが `Print` メソッドを定義している限り機能します。

## エラー

Javaでは通常例外を使用するケースでも、Goでは2つの異なるメカニズムがあります。

* 大抵の関数ではエラーを返します。
* 本当にリカバーできない状況のとき、例えば範囲外のインデックスだった場合などにのみ、実行時の例外を生み出します。

Goでは複数の値を返すことができますが、それによって通常の戻り値に加え、詳細なエラーメッセージを返すことが簡単にできます。慣例的に、そのようなメッセージには、シンプルな組み込みインターフェースであるerror型が存在します。

```go
type error interface {
    Error() string
}
```

例えば`os.Open`関数は、ファイルを開くことができなかった場合、`nil`でないエラー値を返します。

```go
func Open(name string) (file *File, err error)
```

下記のコードではファイルを開くために`os.Open`関数を用いています。エラーが生じた場合は、エラーメッセージをログに出力して処理を中断する`log.Fatal`関数を呼び出します。

```go
f, err := os.Open("filename.ext")
if err != nil {
    log.Fatal(err)
}
// オープンされた*File型のfを使った何らかの処理を行う
```

エラーのインターフェースは`Error`のメソッドのみ必要としますが、特定のエラーとなるとしばしばその他のメソッドも持っています。それによって、呼び出し側がエラーの詳細を検知することができます。

## PanicとRecover

[panic](https://yourbasic.org/golang/recover-from-panic/)は、ゴルーチンのスタックを巻き戻し、途中でdefer宣言された関数を実行してからプログラムを停止するランタイムエラーです。

panicはJavaの例外処理(exceptions)に似ていますが、ランタイムエラーのみを対象としています。例えば、`nil` ポインタを参照しようとしたときや、配列の範囲外領域にインデックスしようとしたときにpanicが発生します。EOFなどエラーイベントを表現するために、Goプログラムは[上記](https://qiita.com/wagi0716/private/37c8fa3398717a4d6b3b#%E3%82%A8%E3%83%A9%E3%83%BC)の `error` という組み込み型を使用します。

組み込み関数[recover](https://yourbasic.org/golang/recover-from-panic/)を使用して、panic状態のゴルーチンの制御を取り戻し、通常の実行を再開できます。

* `recover` を呼び出すとスタックの巻き戻しが停止します。`recover` は `panic` に渡した引数を返します。

巻き戻し中に実行されるコードはdefer宣言された関数内のコードのみであるため、`recover` はdefer宣言された関数内でのみ有用です。ゴルーチンがパニックになっていない場合、`recover` は `nil` を返します。

## ゴルーチンとチャネル

### ゴルーチン

Goでは、`go` 文を使用して、新たなスレッド(ゴルーチン)を立ち上げることができます。`go` 文に続く関数は新しく作成された[ゴルーチン](https://yourbasic.org/golang/goroutines-explained/)上で実行されます。 1つのプログラム内のすべてのゴルーチンは、同じアドレス空間を共有します。

ゴルーチンは軽量であり、スタック領域割り当て程度のコストしかかかりません。はじめはスタックの割り当てを小さく抑え、必要に応じてヒープストレージへの割り当てと解放を行いながら大きくしていきます。内部的にゴルーチンは、複数のオペレーティングシステムスレッド間で多重化されるコルーチンのように機能します。

```go
go list.Sort() // list.Sort()はパラレルに実行される
```

Goには関数リテラルがあります。関数リテラルは[クロージャー](https://yourbasic.org/golang/anonymous-function-literal-lambda-closure/)として機能し、 `go` 文と組み合わせると強力になります。

```go
// delayで指定した時間が立つと、Publish関数は標準出力にtextを書き出す
func Publish(text string, delay time.Duration) {
    go func() {
        time.Sleep(delay)
        fmt.Println(text)
    }() // 括弧をつけてください。go句直後の関数はコールする必要がある
}
```

変数 `text` および `delay` は、`Publish` 関数とその内部の関数リテラルの間で共有されます。

### チャネル

[チャネル](https://yourbasic.org/golang/channels-explained/)は、2つのゴルーチンの処理を同期させたり、通信させたりするメカニズムを提供します。 `<-` 演算子は、チャネルの方向(送信または受信)を指定します。方向が指定されていない場合、そのチャネルは送受信可能です。

```go
chan Sushi     // Sushi型の値を送受信するために使用できる
chan<- float64 // float64型を送信するためにのみ使用できる
<-chan int     // int型を受信するためにのみ使用できる
```

チャネルは参照型であり、`make` で作成することができます。

```go
ic := make(chan int)       // バッファを持たないint型のチャネル
wc := make(chan *Work, 10) // バッファを持つ*Work型のチャネル
```

チャネルに値を送信するには、`<-` を二項演算子のように使用します。チャネルから値を受信するには、`<-` を単項演算子のように使用します。

```go
ic <- 3      // チャネルに3を送信する
work := <-wc // チャネルから*Workを受信する
```

* チャネルがバッファを持たない場合、受信チャネルから値を取り出すまでの間、送信チャネルは処理をブロックします。
* チャネルがバッファを持つ場合、送信チャネルから渡される値がバッファに書き込まれる余地があるときは処理がブロックされません。逆に、バッファがいっぱいになっているときは、受信チャネルから値を取り出すまで、送信チャネルは処理をブロックします。
* 受信チャネルは取り出せる値が存在するまでの間、処理をブロックします。

`close` 関数はこれ以上チャネルに値を送信できないようにすることができます。

* `close` 関数が呼び出されたとします。`close` 関数が呼び出されるまでの間にすでにチャネルに送信された値は問題なく受信チャネルから取り出すことができます。その後の受信処理ではブロックは発生されず、ゼロ値を返します。
* 受信チャネルからは値の他に、チャネルが閉じているかどうかの指標を取り出すことができます。

```go
ch := make(chan string)
go func() {
    ch <- "Hello!"
    close(ch)
}()
fmt.Println(<-ch) // "Hello!"が表示される
fmt.Println(<-ch) // ここではブロックされず、string型のゼロ値である""が表示される
fmt.Println(<-ch) // もう一度""が表示される
v, ok := <-ch     // vは"", okはfalseの値をとる
```

次の例では `Publish` 関数がチャネルを返すようにします。 `text` が発行されたときにメッセージをブロードキャストするためにこのチャネルが使われます。

```go
// delayで指定した時間が経過したのち、Publish関数はtextを標準出力に書き出す
// textが表示されたタイミングでwaitチャネルをクローズする
func Publish(text string, delay time.Duration) (wait <-chan struct{}) {
    ch := make(chan struct{})
    go func() {
        time.Sleep(delay)
        fmt.Println(text)
        close(ch)
    }()
    return ch
}
```

Publish関数はこのように使えます。

```go
wait := Publish("important news", 2 * time.Minute)
// ここに何らかの処理が入る
<-wait // textが表示されるまで、ここで処理がブロックされる
```

### select文

select文はGoの重要な並行処理ツールキットの一つです。`select` は通信時に続行する処理を選択します。

* どの通信も成功し得るとき、そのうちの一つがランダム選択され、対応する処理が実行されます。
* defaultのケースが存在しない場合、いずれかの通信が成功するまでselect文は処理をブロックします。

以下のコードは、select文を使用した乱数ジェネレーターの実装例です。

```go
rand := make(chan int)
for { // ランダムで0か1のどちらかをを続けざまに送信している
    select {
    case rand <- 0:
    case rand <- 1:
    }
}
```

もう少し現実的な実装例を見てみましょう。次のコードはselect文をつかって、受信操作にタイムリミットを設けている例です。

```go
select {
case news := <-AFP:
    fmt.Println(news)
case <-time.After(time.Minute):
    fmt.Println("Time out: no news in one minute.")
}
```

`time.After` は標準ライブラリの関数です。一定時間たった後に、現在時刻を送信するチャネルを返す関数です。

## Hello server

これまでのピースがどのようにはまっていくのかを、ちょっとした例でお見せして終わることにしましょう。`server`パッケージはチャネルを経由して`Work`リクエストを受け入れるサーバーを実装しています。

* リクエストごとに別々の`goroutine`で処理が行われます。
* `Work`の構造体それ自身は、結果を返すために用いられるチャンネルを含んでいます。

```go
package server

import "log"


// Newでreqチャネルを経由してWorkのリクエストを受け入れるサーバーを生成する
func New() (req chan<- *Work) {
    wc := make(chan *Work)
    go serve(wc)
    return wc
}

type Work struct {
    Op    func(int, int) int
    A, B  int
    Reply chan int // Serverはこのチャネルに結果を返す
}

func serve(wc <-chan *Work) {
    for w := range wc {
        go safelyDo(w)
    }
}

func safelyDo(w *Work) {
    // 実行中の他のgoroutineをkillしないように、パニック状態になっているgoroutineの制御を取り戻す
    defer func() {
        if err := recover(); err != nil {
            log.Println("work failed:", err)
        }
    }()
    do(w)
}

func do(w *Work) {
    w.Reply <- w.Op(w.A, w.B)
}
```

こんな風に使えるでしょう。

```go
package server_test

import (
    "fmt"
    "server"
    "time"
)

func main() {
    s := server.New()

    divideByZero := &server.Work{
        Op:    func(a, b int) int { return a / b },
        A:     100,
        B:     0,
        Reply: make(chan int),
    }
    s <- divideByZero

    select {
    case res := <-divideByZero.Reply:
        fmt.Println(res)
    case <-time.After(time.Second):
        fmt.Println("No result in one second.")
    }
    // 出力結果: No result in one second.
}
```

### さらに学びたい場合

[Tutorials](https://yourbasic.org/golang/tutorials/)は初心者にも上級者にもためになるサイトです。ベストプラクティスや、本番環境に匹敵するコード例が揃っています。


## オススメの記事

Goに関連した入門記事です。

* [Goを学ぶときにつまずきやすいポイントFAQ](/articles/20190713/)
* [PythonistaがGo言語に入門してみた](/articles/20201119/)
