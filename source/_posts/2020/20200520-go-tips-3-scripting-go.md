---
title: "Go Tips連載3: ファイルを扱うちょっとしたスクリプトをGoで書くときのTips5選"
date: 2020/05/20 09:43:46
postid: ""
tag:
  - Go
  - GoTips連載
  - path/filepath
category:
  - Programming
thumbnail: /images/2020/20200520/thumbnail.png
author: 辻大志郎
lede: "筆者は普段ファイルを扱って何か簡単な処理をする場合は、シェルスクリプトで実装することが多かったのですが、実は Go で書くと簡単に、かつ Testable でスクリプトちっくに書くことでできて、幸せになるんじゃないか？と最近考えています。"
---

<img src="/images/2020/20200518/Go-Logo_LightBlue.png" class="img-small-size" loading="lazy">

[Go Tips連載](/tags/GoTips連載/)の第3弾目です。

## はじめに

TIG の辻です。

筆者は普段ファイルを扱って何か簡単な処理をする場合は、シェルスクリプトで実装することが多かったのですが、実は Go で書くと簡単に、かつ Testable でスクリプトちっく  [^2] に書くことでできて、幸せになるんじゃないか？ と最近考えています。

 [^2]: スクリプトちっくとは main.go と main_test.go の 2 ファイルで簡潔に実装できる程度の処理、くらいのニュアンスで使っています。

とある業務でファイルを扱い、ちょっとだけ複雑な繰り返しを要する処理をする必要がありました。手動で作業するのはめんどくさいし、~~(モチベーションも上がらないし)~~ ロジックもちょっと面倒だったので、Go でスクリプトを書いて処理しました。

そこで今回はファイルを扱うようなスクリプトを Go で書くときに役に立ちそうな Tips 5 選を紹介します。

1. ファイルの読み込みにio.Readerを用いる
2. ファイルの書き込みにio.Writerを用いる
3. リストファイルから1行ずつ読み込む
4. `os/exec` を使う
5. ファイルパスの操作に `path/filepath`を使う

## Tips

### 1.ファイルの読み込みにio.Readerを用いる

ファイルを読み込む際に [io.Reader](https://golang.org/pkg/io/#Reader) を受け取って処理するようにすると Testable なスクリプトになって安心です。簡単な処理とはいえやはりテストは書きたいですよね。

例として、ファイルの中に「Copyright」という文字列が含まれるかどうか調べる処理を考えてみます。実装例として以下の hasCopyright のような実装が考えられます。ポイントは io.Reader のインタフェースを関数の引数として受け取ることです。

```go io.Readerの引数がポイント
func hasCopyright(r io.Reader) (bool, error) {
	b, err := ioutil.ReadAll(r)
	if err != nil {
		return false, err
	}
	return bytes.Contains(b, []byte("Copyright")), nil
}
```

呼び元の実装例です。"LICENSE" ファイルは MIT のライセンスが書かれたファイルを Open しています。

```go main.go
func main() {
	f, err := os.Open("LICENSE")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	ok, err := hasCopyright(f)
	if err != nil {
		log.Fatal(err)
	}
	// 何らかの処理
	fmt.Println(ok)
}
```

hasCopyright 関数は io.Reader を受け取る関数でした。もちろん以下のように [*os.File](https://golang.org/pkg/os/#File) 構造体を受け取って処理することもできます。しかしこのようにすると、引数には *os.File 構造体を受け取る必要があり、テストケースごとにファイルを作成しないといけません。

```go 非推奨な引数のとり方
// 非推奨: 具象の構造体を引数に取る関数
func hasCopyright(f *os.File) (bool, error) {
	b, err := ioutil.ReadAll(f)
	if err != nil {
		return false, err
	}
	return bytes.Contains(b, []byte("Copyright")), nil
}
```

インタフェースである io.Reader を受け取る関数にすることで io.Reader を満たす任意の構造体を関数に渡すことができます。つまりファイル記述子を示す os.File だけでなく [byte.Buffer](https://golang.org/pkg/bytes/#Buffer) や [strings.Reader](https://golang.org/pkg/strings/#Reader) といった構造体を渡すことができます。文字列の場合は [strings.NewReader](https://golang.org/pkg/strings/#NewReader) を用いて string から io.Reader を生成でき便利です。以下のようにテストすることが可能になります。

```go main_test.go
package main

import (
	"io"
	"strings"
	"testing"
)

func Test_hasCopyright(t *testing.T) {
	type args struct {
		reader io.Reader
	}
	tests := []struct {
		name    string
		args    args
		want    bool
		wantErr bool
	}{
		{"正常", args{strings.NewReader(`Copyright`)}, true, false},
		{"MITライセンス", args{strings.NewReader(`MIT License

Copyright (c) 2020, Future Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`)}, true, false},
		{"空文字", args{strings.NewReader(``)}, false, false},
		{"cが小文字", args{strings.NewReader(`copyright`)}, false, false},
		{"スペース有り", args{strings.NewReader(`Copy right`)}, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := hasCopyright(tt.args.reader)
			if (err != nil) != tt.wantErr {
				t.Errorf("hasCopyright() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("hasCopyright() got = %v, want %v", got, tt.want)
			}
		})
	}
}
```

```bash
$ go test
=== RUN   Test_hasCopyright
=== RUN   Test_hasCopyright/正常
=== RUN   Test_hasCopyright/MITライセンス
=== RUN   Test_hasCopyright/空文字
=== RUN   Test_hasCopyright/cが小文字
=== RUN   Test_hasCopyright/スペース有り
--- PASS: Test_hasCopyright (0.00s)
    --- PASS: Test_hasCopyright/正常 (0.00s)
    --- PASS: Test_hasCopyright/MITライセンス (0.00s)
    --- PASS: Test_hasCopyright/空文字 (0.00s)
    --- PASS: Test_hasCopyright/cが小文字 (0.00s)
    --- PASS: Test_hasCopyright/スペース有り (0.00s)
PASS
```

テストが通ると、想定した動作をしていることがわかり、安心します。シェルスクリプトで同じような確認をしようと思うと、ちょっと手間です。

### 2.ファイルの書き込みにio.Writerを用いる

ファイルの読み込みに io.Reader を用いる場合と同じ話です。ファイルの書き込みに [io.Writer](https://golang.org/pkg/io/#Writer) を用いると Testable なスクリプトになります。簡単な例として、ファイルの末尾に 「Hello World.」という文字列を追記する関数を考えてみます。

```go io.Writerを利用する
// 末尾に Hello World. を書き込むサンプル実装
func writeHello(w io.Writer) {
	fmt.Fprintln(w, "\nHello World.")
}
```

実際のファイルに書き込まなくても io.Writer を実装している [bytes.Buffer](https://golang.org/pkg/bytes/#Buffer) に文字列を書き込み、比較してテストできます。実際にファイルを作成したい場合は [os.Create](https://golang.org/pkg/os/#Create) などとすれば生成できます。

```go main_test.go
package main

import (
	"bytes"
	"testing"
)

func Test_writeHello(t *testing.T) {
	tests := []struct {
		name  string
		wantW string
		diff  bool
	}{
		{"正常", "\nHello World.\n", false},
		{"終端の改行がない", "\nHello World.", true},
		{"先頭の改行がない", "Hello World.\n", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &bytes.Buffer{}
			writeHello(w)
			if gotW := w.String(); gotW != tt.wantW {
				if !tt.diff {
					t.Errorf("writeHello() = %v, want %v", gotW, tt.wantW)
				}
			}
		})
	}
}
```

```bash
$ go test
=== RUN   Test_writeHello
=== RUN   Test_writeHello/正常
=== RUN   Test_writeHello/終端の改行がない
=== RUN   Test_writeHello/先頭の改行がない
--- PASS: Test_writeHello (0.00s)
    --- PASS: Test_writeHello/正常 (0.00s)
    --- PASS: Test_writeHello/終端の改行がない (0.00s)
    --- PASS: Test_writeHello/先頭の改行がない (0.00s)
PASS
```

ちゃんと想定通り書き込めていることが分かります。

### 3.リストファイルから1行ずつ読み込む

ファイルに記載されている文字列を改行コードで区切って一行ずつ処理をする機会は多いと思います。シェルスクリプトだと以下のようにして各行を読み込んでなんやかんやする感じです。

```bash
while read line
do
  # 何らかの処理をする
  echo "${line}"
done < list.txt
```

文字列リストの一覧を list.txt などとしてファイルを生成しておいて、ファイルから 1 行ずつ読み込みたいときの Go の Tips です。以下のような階層になっているとします。

```bash ディレクトリ構成
.
├── list.txt
└── main.go
```

list.txt の中身は以下のようにリポジトリ名が書いてあるファイルとします。

```bash list.txt
future-architect/vuls
future-architect/gcp-instance-scheduler
future-architect/cheetah-grid
future-architect/uroborosql
future-architect/icons
```

[bufio.NewScanner](https://golang.org/pkg/bufio/#NewScanner) を用いて io.Reader (ファイルや標準入出力など)から文字列を読み込むことできます。改行コードを気にせず、各行を読み込むことができるのが嬉しいポイントです。

```go main.go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
)

func main() {
	f, err := os.Open("list.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		// list.txt にかかれている行の文字列を用いて処理をする
		line := sc.Text()
		fmt.Println(line)
	}
	if err := sc.Err(); err != nil {
		log.Fatal(err)
	}
}
// 出力結果:
// future-architect/vuls
// future-architect/gcp-instance-scheduler
// future-architect/cheetah-grid
// future-architect/uroborosql
// future-architect/icons
```

[bufio.Reader](https://golang.org/pkg/bufio/#Reader) を用いても bufio.NewScanner を用いたときと同様に読み込むことができますが `io.EOF` のハンドリングする必要がある分、幾分プリミティブな実装です。

```go 幾分プリミティブな実装
func main() {
	f, err := os.Open("list.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	r := bufio.NewReader(f)
	for {
		// list.txt にかかれている行の文字列を用いて処理をする
		line, _, err := r.ReadLine()
		if err != nil {
			if err == io.EOF {
				break
			}
			log.Fatal(err)
		}
		fmt.Printf("%s\n", string(line))
	}
}
```

### 4. `os/exec` を使う

ファイルを扱うスクリプトに限った話ではないですが Go では [exec.Cmd](https://golang.org/pkg/os/exec/#Cmd) を用いて外部コマンドを実行できます。とても便利です。[exec.Command](https://golang.org/pkg/os/exec/#Command) 関数を用いて Path と Args に実行したい文字列をセットします。外部コマンドの実行結果が不要であれば [Run()](https://golang.org/pkg/os/exec/#Cmd.Run), 必要であれば [Output()](https://golang.org/pkg/os/exec/#Cmd.Output) を用いることができます。たいていの場合この 2 つのメソッドで充足することが多いです。

外部コマンドの実行した結果、エラーが発生すれば戻り値の error に値が格納されます。`_` などとしてエラーを無視しないようにしましょう。ちゃんとエラーをチェックすれば直前のコマンドでエラーが発生していたけど、間違って次のコマンドが実行されてしまった。`cd` でエラーが発生していたけど、後続の `rm` が実行されて意図しないファイルやディレクトリが削除されてしまった。。。などということは防げます。Bash で `set -ue` しておくのと似たような雰囲気です。

その他の情報、例えば PID や終了ステータスといった実行結果を取得したい場合は Cmd 構造体に含まれる ProcessState フィールド([*os.ProcessState](https://golang.org/pkg/os/#ProcessState) 型)にアクセスするといろいろな情報を取得できます。 [^1]

 [^1]: ProcessState フィールドを参照するテクニックは [Umeda.go 2020 Winter](https://umedago.connpass.com/event/159972/) で渋川さんが話されていました。

```go　main.go
package main

import (
	"fmt"
	"log"
	"os/exec"
)

func main() {
	cmd := exec.Command("git", "clone", "-b", "delelop", "https://...")
	if err := cmd.Run(); err != nil {
		log.Fatal(err)
	}
	fmt.Println(cmd.ProcessState.Pid())
	fmt.Println(cmd.ProcessState.String())
}
// 実行結果:
// 1234
// exit status 0
```

注意しておきたいポイントとしてシェルスクリプトで `*` (ワイルドカード)を使ってコマンドを実行するときに Go の exec.Command の引数に `*` を含めても展開されません。以下のような実装はエラーが返ってきます。`*` はシェルスクリプトが展開する(glob でパターンマッチングする)ためです。

```go main.go
package main

import (
	"fmt"
	"log"
	"os/exec"
)

func main() {
	b, err := exec.Command("ls", "*.go").Output()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(string(b))
}
// 実行結果:
// 2020/04/17 10:57:11 exit status 2
```

シェルスクリプトの `*` を使いたい場合は以下のように exec.Command の引数で明示的に `/bin/sh -c` とする必要があります。

```go
b, err := exec.Command("/bin/sh", "-c", "ls", "*.go").Output()
```

その他にも os.exec の [Overview](https://golang.org/pkg/os/exec/#pkg-overview) には、リダイレクトはされない、glob パターンの展開には `filepath.Glob` を用いることができる、などといった os.exec を扱う上での注意点が記載されています。あらためて確認してみてください。

### 5.ファイルパスの操作に `path/filepath` を使う

ファイルパスの結合に以下のように文字列で `/` を結合させて、あるディレクトリにファイルを生成することがあると思います。

```go
testFilePath := tempDir + "/" + "test.txt"
```

ファイルパス関連で問題の1つとして UNIX 系 OS と Windows でパスのセパレータが異なるという問題があります。UNIX 系 OS ではセパレータが `/` であって Windows では `\` という話です。通常、この手のスクリプトを UNIX 系 OS と Windows の両方で動作させることは少ないと思うので、問題になることはあまりないと思いますが、[path/filepath](https://golang.org/pkg/path/filepath/) パッケージを用いるとマルチプラットフォームで扱うことができスマートです。パス/filepath パッケージは対象の OS で定義されているファイルパスと互換性のある方法でファイルパスを操作できるユーティリティを提供しているパッケージです。

以下はカレントディレクトリ直下に一時的なディレクトリ tempxxxx を作成して、その一時ディレクトリにファイルを生成する実装例です。ファイルパスの結合に [filepath.Join](https://golang.org/pkg/path/filepath/#Join) を用いています。以下の実装では tempDir と test.txt を Join していますが、3 つ以上の文字列を Join することも可能です。

```go main.go
package main

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

func main() {
	tempDir, err := ioutil.TempDir(".", "temp")
	if err != nil {
		log.Fatal(err)
	}
	// defer os.RemoveAll(tempDir) とすればスクリプト終了時に一時ディレクトリを削除することも可能

	testFilePath := filepath.Join(tempDir, "test.txt")
	f, err := os.Create(testFilePath)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	writeHello(f)
}
```

## まとめ

ファイル扱うようなスクリプトを Go で実装する上での Tips 5 選を紹介しました。io.Reader や io.Writer といったインタフェースを受け取ることでファイルを扱うスクリプトでも簡単にテストできます。エラーも明示的にハンドリングできていい感じです。ちょっとしたファイルを扱う処理を Go で書いてみてはいかがでしょうか。
