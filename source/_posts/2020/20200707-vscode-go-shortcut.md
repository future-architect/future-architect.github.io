---
title: "VSCode の Go extension でよく利用するコマンド 7選"
date: 2020/07/07 10:15:05
postid: ""
tag:
  - Go
  - VSCode
  - しょーとかっと
category:
  - Programming
thumbnail: /images/20200707/thumbnail.png
author: 多賀聡一朗
lede: "最近 Go 開発本体への加入が発表されるなど、盛り上がっている VSCode の Go extension ですが、私も基本は VSCode + Go extension を利用して開発しています。開発する際によく利用するコマンドがいくつかありますので、まとめました。"
---

TIG DX チーム所属の多賀です。また Go についての記事を書きます。

最近 Go 開発本体への加入が発表されるなど、盛り上がっている VSCode の Go extension ですが、私も基本は VSCode + Go extension を利用して開発しています。
開発する際によく利用するコマンドがいくつかありますので、まとめました。

## 環境

- VSCode: 1.45.1
- Go extension: 0.14.4

補完やその他機能を利用するために Go の Language Server Protocol の実装である `gopls` を利用しています。
https://github.com/golang/tools/tree/master/gopls

Go extension 設定の `go.useLanguageServer` を `true` にしています。
その他の設定は以下の公式設定を利用しています。
https://github.com/golang/tools/blob/master/gopls/doc/vscode.md


## コマンドの出し方

そもそもコマンドはどうやって出すかですが、
VSCode を開いて以下ショートカットキーで出てきます。

- Windows: Ctrl + Shift + P
- Mac: Command + Shift + P

あとは利用したいコマンドを検索して Enter を押せば実行できます。
(各コマンドに対してショートカットキーを割り振ることも可能です。)


## 利用するコマンド

### 1. Go: Restart Language Server

<img src="/images/20200707/photo_20200707_01.png" loading="lazy">

gopls を再起動するコマンドです。
コードを実装していて、何かしらうまく動かない (おかしなエラーが出る、補完が効かなくなる、etc) 場合に即座に試します。 **大体治ります** 。

### 2. Go: Generate Unit Tests For Function

<img src="/images/20200707/photo_20200707_02.png" loading="lazy">

カーソル直下の関数のテストコードを自動生成してくれます。
デフォルトで Table Driven Test の形で生成してくれるため、生成後はテストケースを追加するだけで Unit Test が書けてしまいます。

例えば以下の関数のテストを書きたいとなった場合に、コマンドを実行すると、

```go
package util

func Add(a, b int) int {
	return a + b
}
```

このようなコードが生成されます。 TODO 以下にケースを随時追加すれば動作します。

```go
package util

import "testing"

func TestAdd(t *testing.T) {
	type args struct {
		a int
		b int
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Add(tt.args.a, tt.args.b); got != tt.want {
				t.Errorf("Add() = %v, want %v", got, tt.want)
			}
		})
	}
}

```


### 3. Go: Generate Interface Stubs

<img src="/images/20200707/photo_20200707_03.png" loading="lazy">


特定の interface を実装するためのメソッドを自動生成してくれます。

例: `XXXReader` struct に io.Reader を実装したい

```go
type XXXReader struct {}
```

コマンドを入力すると、入力ダイアログが出てくるので以下を入力

```sh
# ${レシーバの変数名} ${struct名} ${interface}
x XXXReader io.Reader
```

すると以下のコードが生成されます。

```go
type XXXReader struct {}

func (x XXXReader) Read(p []byte) (n int, err error) {
	panic("not implemented") // TODO: Implement
}
```

大量のメソッドを実装する必要があるケースでとても便利に使えます。


### 4. Go: Fill Struct

<img src="/images/20200707/photo_20200707_04.png" loading="lazy">

カーソル下の struct を field を初期値で穴埋めする形で自動生成してくれます。

このような struct 定義がある場合

```go
type Hoge struct {
	A string
	B int
	C float64
	D *string
}
```

以下のように生成されます。


```go
h := Hoge{
	A: "",
	B: 0,
	C: 0.0,
	D: nil,
}
```

field 定義がたくさんあり、どれが必要かわからなくなった際に、
とりあえず全部生成して必要な field だけ残すことがよくあります。

### 5. Go: Add Tags To Struct Fields

<img src="/images/20200707/photo_20200707_05.png" loading="lazy">


カーソル下の struct にタグを付与します。
struct 内にカーソル当てておく必要があります。
初期設定は、 json かつ omitempty で生成されます。 (設定で他のタグにできます。)

```go
type Hoge struct {
	A string  `json:"a,omitempty"`  // カッコ内にカーソルを当てる
	B int     `json:"b,omitempty"`
	C float64 `json:"c,omitempty"`
	D *string `json:"d,omitempty"`
}
```

### 6. Go: Test Function At Cursor

<img src="/images/20200707/photo_20200707_06.png" loading="lazy">


カーソル下のテスト関数のみのテストを実行してくれます。
テストコードを修正して、すぐに試したいといったときに便利です。

### 7. Go: Install/Update Tools

<img src="/images/20200707/photo_20200707_07.png" loading="lazy">


Go extension で利用している コマンドを install/update します。
extension をいれたタイミングで install は自動でされるため、 update したいときに使います。

## 所感

個人的にはとりあえず `1. Go: Restart Language Server` だけでも覚えればだいぶ開発体験上がると思います。
ぜひ利用して、開発効率を向上させてください。

