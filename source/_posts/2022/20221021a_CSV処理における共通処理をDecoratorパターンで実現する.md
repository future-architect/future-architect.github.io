---
title: "CSV処理における共通処理をDecoratorパターンで実現する"
date: 2022/10/21 00:00:00
postid: a
tag:
  - Go
  - デザインパターン
  - CSV
  - encoding/csv
category:
  - Programming
thumbnail: /images/2022/20221021a/thumbnail.png
author: 辻大志郎
lede: "システム間のデータ連携として、他システムが出力した CSV ファイルを Go で読み込んでリレーショナルデータベースにファイルのデータを保存する、という処理がありました。CSV の値をデコードしたあとに共通的な処理を差し込みたいユースケースで Decorator パターンを使って実装をしました。"
---
## はじめに

Technogoly Innovation Group 辻です。

システム間のデータ連携として、他システムが出力した CSV ファイルを Go で読み込んでリレーショナルデータベースにファイルのデータを保存する、という処理がありました。CSV の値をデコードしたあとに共通的な処理を差し込みたいユースケースで [Decorator パターン](https://ja.wikipedia.org/wiki/Decorator_%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3)を使って実装をしました。コードベースをシンプルに保ちつつ共通処理をフックできます。実用的なユースケースで Decorator パターンを紹介する記事は少ないと思ったので、本記事を書きました。
まず Decorator パターンが必要になった背景を説明したあとに具体的な Go の実装を見ていきます。

## 背景

他システムが出力した CSV ファイルを Go でデコードして、PostgreSQL にデータを投入するような処理がありました。簡略化したイメージは以下です。

<img src="/images/2022/20221021a/abstract.png" alt="" width="666" height="156" loading="lazy">

このとき、連携元システムが出力した CSV ファイルにヌル文字（NUL）[^1] が稀に含まれることがわかりました。ヌル文字は PostgreSQL では扱えません。ヌル文字が含まれるデータを PostgreSQL に投入しようとするとエラーになります。

[^1]: 文字コード 0 番の制御文字のことです。データや文字列の終端を示す特殊な文字として使用されることがあります。 https://e-words.jp/w/%E7%A9%BA%E6%96%87%E5%AD%97.html

```
ERROR: invalid byte sequence for encoding "UTF8": 0x00 (SQLSTATE 22021)
```

PostgreSQL のエラーコード [22021](https://www.postgresql.jp/document/14/html/errcodes-appendix.html#:~:text=22021,character_not_in_repertoire) や PostgreSQL の開発グループが運営する QA のスレッド ["Re: ERROR: invalid byte sequence for encoding "UTF8": 0x00"](https://www.postgresql.org/message-id/1510040474.2845.41.camel%40cybertec.at) などを見ると、PostgreSQL ではヌル文字は許容されていないことがわかります。

このことから PostgreSQL にデータを投入する前にヌル文字を削除する必要がありました。連携元システムの CSV ファイル出力処理は手を加えることができなかったため、**Go の実装のなかでヌル文字を削除する**ことにしました。

## 実装方針

実装方針として大きく２つ考えらます。

* 案１：ナイーブにヌル文字を除外する
* 案２：Decorator パターンを使ってヌル文字を除外する

本ケースでは後者の方法がより望ましい実装方針です。

まずヌル文字を除外する前の実装を確認します。その上でヌル文字を除外するためのナイーブな実装方法と、その実装をするとコードベースがどうなるか考えたあと、最後に Decorator パターンを使った実装を紹介します。

### ヌル文字を除外する前の実装

まずヌル文字を除外する前の実装例です。CSV ファイルを読み込んで [gocarina/gocsv](https://github.com/gocarina/gocsv) でデコードし標準出力する実装です。データベースにデータを投入するコードは省略します。説明の便宜上 CSV ファイルの値は標準出力してヌル文字が含まれていることを確認します。

CSV ファイルの `"future"` の文字列の後ろにはヌル文字が含まれています。

```csv company.csv
id,company_name
"1","future "
```

```go model.go
type Company struct {
	ID          string `csv:"id"`
	CompanyName string `csv:"company_name"`
}
```

```go main.go
package main

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"

	"github.com/gocarina/gocsv"
)

func main() {
	f, err := os.Open("company.csv")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	r := csv.NewReader(f)

	var ss []Company
	if err := gocsv.UnmarshalCSV(r, &ss); err != nil {
		panic(err)
	}
	for _, s := range ss {
		// ヌル文字は目には見えないため、バイト列として表示します
		// 値が 0 であるバイトがヌル文字です
		fmt.Printf("ID = %v, CompanyName = %v",
			[]byte(s.ID),
			[]byte(s.CompanyName),
		)

	// データベースを投入する何らかの処理（省略）
}
```

* 出力結果

バイト列で確認すると、たしかに `CompanyName` の終端にヌル文字（バイトが 0）が含まれています。

```
ID = [49], CompanyName = [102 117 116 117 114 101 0]
```

### 案１：ナイーブにヌル文字を除外する実装

さて、ヌル文字を除外する実装を考えます。ナイーブな実装は `ID` や `CompanyName` の各構造体の値をデータベースへ投入するときにヌル文字を除外するという方法です。実装例のコードでは標準出力時に除外することに相当します。

実装例は以下です。

```go delete_nul.go
// deleteNUL はヌル文字を削除した文字列を返却します
// "\x00" がヌル文字です
func deleteNUL(s string) string {
	return strings.ReplaceAll(s, "\x00", "")
}
```

```go main.go
func main() {

	// ... 省略

	for _, s := range ss {
		// 表示するときに各フィールドに deleteNUL() を挟み、ヌル文字を除外する
		fmt.Printf("ID = %v, CompanyName = %v",
			[]byte(deleteNUL(s.ID)),
			[]byte(deleteNUL(s.CompanyName)),
		)

	// ...
}
```

* 出力結果

出力結果を見ると、ヌル文字が削除されています。

```
ID = [49], CompanyName = [102 117 116 117 114 101]
```

この実装方法でヌル文字を除外できますが、以下のような課題があります。

* コードの見通し、可読性が悪くなる。ビジネスロジックのコードにシステム都合によるコードが混ざるため
* 実装やテストが漏れてしまうおそれがある。構造体の全フィールドに適用する必要があるため

Decorator パターンを使って実装することで上記の課題を解決できます。

### 案２：Decorator パターンを使ってヌル文字を除外する実装

本ケースでベターな方法である Decorator パターンを使った実装を紹介します。Decorator パターンはデザインパターンの１つとして知られています。もともとの振る舞いに対して、新しい振る舞いを動的に追加できます。

今回のケースでは「CSV の値を読み込む」という振る舞いに対して「ヌル文字を除去する」という振る舞いを追加します。これにより `gocsv.UnmarshalCSV()` で CSV をデコードするときにヌル文字を除去できます。まず `gocsv.UnmarshalCSV()` の API のシグネチャを確認したあとに、どのように Decorator を実装するか説明します。

`gocsv.UnmarshalCSV` の API は以下のようになっています。

```go
UnmarshalCSV(in CSVReader, out interface{}) error
```

第一引数に `gocsv.CSVReader` のインタフェースを受け取っていることがポイントです。 `gocsv.CSVReader` は以下のメソッドがあるインタフェースです。

```go
type CSVReader interface {
	Read() ([]string, error)
	ReadAll() ([][]string, error)
}
```

またヌル文字を除外する前の実装で `gocsv.UnmarshalCSV` の引数として渡している `*csv.Reader` 構造体は当然ながら `Read()` と `ReadAll()` メソッドがあります。

このとき **`gocsv.CSVReader` インタフェースを満たす `Read()` と `ReadAll()` メソッドを持つ構造体を用意し、それぞれメソッドで `*csv.Reader` の `Read()` と `ReadAll()` を呼び出したあとに、ヌル文字を除外するような実装ができます。この構造体を `gocsv.UnmarshalCSV()` の引数に渡すことで `gocsv` によるデコード時にヌル文字を除去できます**。

具体的な Decorator の実装例は以下のとおりです。

```go decorator_reader.go
type deleteNulReader struct {
	// 型は *csv.Reader でも良いです
	// ただ Decorator と呼ぶ場合、振る舞いをラップするインターフェースと
	// 同じインターフェースを型に持つのが一般的です
	r gocsv.CSVReader
}

// NewDeleteNulReader は Decorator したインターフェースを返却します
func NewDeleteNulReader(r gocsv.CSVReader) gocsv.CSVReader {
	return &deleteNulReader{r: r}
}

func (dr *deleteNulReader) Read() ([]string, error) {
	// 最初に引数に渡された値の Read() を呼び出す
	ss, err := dr.r.Read()
	if err != nil {
		return ss, err
	}

	// Read() の結果に対して、ヌル文字を除去する処理をおこなう
	for i := range ss {
		ss[i] = strings.ReplaceAll(ss[i], "\x00", "")
	}
	return ss, nil
}

func (dr *deleteNulReader) ReadAll() ([][]string, error) {
	// 最初に引数に渡された値の ReadAll() を呼び出す
	ss, err := dr.r.ReadAll()
	if err != nil {
		return ss, err
	}

	// ReadAll() の結果に対して、ヌル文字を除去する処理をおこなう
	for i := range ss {
		for j := range ss[i] {
			ss[i][j] = strings.ReplaceAll(ss[i][j], "\x00", "")
		}
	}
	return ss, nil
}
```

これで Decorator は完成です。アプリケーションのコードに Decorator を適用する場合は以下のようになります。デコード処理以降の実装は手を加えずとも `gocsv.UnmarshalCSV()` で得られる結果ではヌル文字が削除されているのが非常に嬉しいポイントです。

```go main.go
func main() {
	// ... 省略

	// NewDeleteNulReader() として Decorator を適用する
	r := NewDeleteNulReader(csv.NewReader(f))

	// デコード処理以降の実装は手を加えずにヌル文字を除外することができる
	var ss []Company
	if err := gocsv.UnmarshalCSV(r, &ss); err != nil {
		panic(err)
	}
	for _, s := range ss {
		fmt.Printf("ID = %v, CompanyName = %v",
			[]byte(s.ID),
			[]byte(s.CompanyName),
		)

	// データベースを投入する何らかの処理（省略）
}
```

* 出力結果

このような方法でヌル文字を除外できました。

```
ID = [49], CompanyName = [102 117 116 117 114 101]
```

## まとめ

CSV ファイルのデコード時に必要な共通的な処理を Decorator パターンを使って実装しました。この方法はコードベースをシンプルに保ちつつ、必要な共通処理をフックできる方法として役に立ちます。Decorator パターンの実用的な適用例として、みなさんの参考になれば嬉しいです。
