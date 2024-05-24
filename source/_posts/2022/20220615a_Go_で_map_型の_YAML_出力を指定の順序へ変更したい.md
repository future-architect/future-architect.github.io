---
title: "Go で map 型の YAML 出力を指定の順序へ変更したい"
date: 2022/06/15 00:00:00
postid: a
tag:
  - Go
  - YAML
  - map
  - リフレクション
category:
  - Programming
thumbnail: /images/20220615a/thumbnail.png
author: 多賀聡一朗
lede: "!表題の通り、Go で map 型の YAML 出力の際、key を指定した順序にする方法を調査・実装してみました。指定した順序で出力したいので、map を struct へ変換して出力しました"
---

<img src="/images/20220615a/yml.png" alt="" width="512" height="512" loading="lazy">

<a href="https://www.flaticon.com/free-icons/yml" title="yml icons">Yml icons created by Darius Dan - Flaticon</a>


TIG 所属の多賀です。
表題の通り、Go で map 型の YAML 出力の際、key を指定した順序にする方法を調査・実装してみました。

## TL;DR

* map の key は YAML 変換ライブラリ側でソートされた上で、出力することで順序が固定化されている
* 指定した順序で出力したいので、map を struct へ変換して出力した

## 背景

Go の map のソート順は不定であることは、よく言われることかなと思います。
(言語仕様にも明記されています。)

> #### Map types
> A map is **an unordered group** of elements of one type, called the element type, indexed by a set of unique keys of another type, called the key type. The value of an uninitialized map is nil.
>
> [The Go Programming Language Specification - Map types](https://go.dev/ref/spec#Map_types)


そのため、map をソートして出力したい場合は、 map に含まれる key のリストをソートし、ソートされた key ごとに map の value を出力することで実現します。

例: [The Go Playground - map sort sample](https://go.dev/play/p/5LC2H8ziPpI)
```go
import (
	"fmt"
	"sort"
)

func main() {
	m := map[string]string{
		"a": "xxx",
		"d": "xxx",
		"c": "xxx",
		"b": "xxx",
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, key := range keys {
		fmt.Printf("key: %v, val: %v\n", key, m[key])
	}
}

// Output
// key: a, val: xxx
// key: b, val: xxx
// key: c, val: xxx
// key: d, val: xxx
```

同様に、map を [YAML](https://ja.wikipedia.org/wiki/YAML) へ出力する際も key でソートして出力したかったのですが、YAML を扱うライブラリ側でソート順が固定化されており、できませんでした。ライブラリの調査について以下に記載します。
まず、Go で YAML を扱うためには、一般的に以下ライブラリが利用することができます。

* [go-yaml/yaml.v3](https://github.com/go-yaml/yaml)
* [goccy/go-yaml](https://github.com/goccy/go-yaml)

(今回のサンプルは、 [go-yaml/yaml.v3](https://github.com/go-yaml/yaml) を利用しています。)

map を YAML 形式へ出力するコードを以下の通りに実装してみました。

例: [The Go Playground - map to yaml sample](https://go.dev/play/p/19g1PtgoyRq)
```go
import (
	"fmt"
	"log"

	"gopkg.in/yaml.v3"
)

func main() {
	m := map[string]string{
		"a": "xxx",
		"d": "xxx",
		"c": "xxx",
		"b": "xxx",
	}

	b, err := yaml.Marshal(&m)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(string(b))
}

// Output
// a: xxx
// b: xxx
// c: xxx
// d: xxx
```

出力を見てみると(もしくは、PlayGround上で複数回実行していみると) 固定でアルファベット順にソートされて出力されていることがわかります。
ソースコードを読んでみると、ライブラリ内で key をソートした上で出力するように実装されていました。
それぞれのライブラリの該当行は以下になります。

* [go-yaml/yaml - encode.go#mapv](https://github.com/go-yaml/yaml/blob/f6f7691b1fdeb513f56608cd2c32c51f8194bf51/encode.go#L186)
* [goccy/go-yaml - encode.go#encodeMap](https://github.com/goccy/go-yaml/blob/883a73b67b4e35d8f5bad112c918363aad961e3c/encode.go#L503)

(key がソートされてないと出力ごとに余計な差分が出て不便なので、ライブラリ側で吸収してくれているのかと思いました。)

ライブラリ側で**固定で**ソート順が定められている以上、map の出力を**指定の**ソート順にできないことになります。
今回、 **指定の**ソート順にしたい要望があり、どうにかできないか調査・実装してみました。

## 対応方法

やりたいことは、 「map の YAML 出力時の key を指定した順序で出力すること」になります。
上記記載の通り、map のソート順はライブラリ側で固定化されているので、map 型のままだと難しそうです。
map 型の他に、key/value 形式でソート順が固定されているデータ構造としては、 struct が該当すると考え、map → struct の変換をすれば良いのではと思いつきました。

ですが、map は任意の key/value 値になるため、コンパイル前に struct を定義することはできません。
そのため、map の key/value 値を元にして、実行時に struct を生成することにしました。

また、YAML 形式へ変換する実装を map → struct への変換処理にカスタマイズしたいです。
変換処理を独自カスタマイズするには、[go-yaml/yaml.v3](https://github.com/go-yaml/yaml) の場合は `Marshaler` interface を実装することで可能です。

[yaml/yaml.go at v3 · go-yaml/yaml · GitHub](https://github.com/go-yaml/yaml/blob/v3/yaml.go#L50)
```go
// The Marshaler interface may be implemented by types to customize their
// behavior when being marshaled into a YAML document. The returned value
// is marshaled in place of the original value implementing Marshaler.
//
// If an error is returned by MarshalYAML, the marshaling procedure stops
// and returns with the provided error.
type Marshaler interface {
	MarshalYAML() (interface{}, error)
}
```

(`goccy/go-yaml` の場合も同様の interface ([InterfaceMarshaler](https://github.com/goccy/go-yaml/blob/883a73b67b4e35d8f5bad112c918363aad961e3c/yaml.go#L29)) でカスタマイズ可能な模様です。)


整理すると、以下の 2点を実装する必要があります。

**① map の値から実行時に struct を新たに生成し、struct のフィールドを指定したソート順で定義する。**
**② YAML 出力時に map → struct 変換を実装するため、出力カスタマイズ可能な interface を満たすように実装する。**

こちらの 2点を満たす実装を以下の通り実施してみました。
(※ reflection が多用されたナイーブな実装なので、本運用等のコードに使うのは少しリスキーだと思います。今回は CLI ツールでの利用であったため、問題ないとしています。)

[The Go Playground - sort map to yaml sample](https://go.dev/play/p/-ZlYbk2_La-)
```go
import (
	"fmt"
	"log"
	"reflect"

	"github.com/iancoleman/strcase"
	"gopkg.in/yaml.v3"
)

// ② Marshaler interface を実装する専用の構造体を定義
type SortedMap struct {
	output     map[string]any
	sortedKeys []string
}

// ② Marshaler interface を満たすメソッドを定義
func (o SortedMap) MarshalYAML() (interface{}, error) {
	if o.sortedKeys == nil {
		return o.output, nil
	}

	// ① の map → struct 生成を実装

	// 構造体のフィールドを定義
	newStructFields := make([]reflect.StructField, 0, len(o.output))
	for _, key := range o.sortedKeys {
		var newStructField reflect.StructField
		if o.output[key] != nil {
			newStructField = reflect.StructField{
				Name: strcase.ToCamel(key),
				Type: reflect.ValueOf(o.output[key]).Type(),
				Tag:  reflect.StructTag(fmt.Sprintf(`yaml:"%v"`, key)),
			}
		} else {
			// nil 値の場合 zero value error となるため、ポインタ型で定義して型を抽出
			var ptrTyp *struct{} = nil
			newStructField = reflect.StructField{
				Name: strcase.ToCamel(key),
				Type: reflect.ValueOf(ptrTyp).Type(),
				Tag:  reflect.StructTag(fmt.Sprintf(`yaml:"%v"`, key)),
			}
		}
		newStructFields = append(newStructFields, newStructField)
	}

	// 構造体型の生成
	newStructType := reflect.StructOf(newStructFields)
	// 構造体の生成
	newStruct := reflect.New(newStructType).Elem()

	// 構造体へ値を詰める
	for _, key := range o.sortedKeys {
		newStructValue := newStruct.FieldByName(strcase.ToCamel(key))
		value := o.output[key]
		if value != nil {
			newStructValue.Set(reflect.ValueOf(value))
		} else {
			// nil 値の場合 zero value error となるため、ポインタ型で定義して nil を定義
			// YAML ファイル上に nil で出力したいため
			var ptrValue *struct{} = nil
			newStructValue.Set(reflect.ValueOf(ptrValue))
		}
	}

	return newStruct.Interface(), nil
}

func main() {
	m := map[string]any{
		"a": "xxx",
		"d": "xxx",
		"c": "xxx",
		"b": "xxx",
	}
	// ソート順を指定
	sortedKeys := []string{"d", "c", "b", "a"}

	sm := SortedMap{output: m, sortedKeys: sortedKeys}

	b, err := yaml.Marshal(&sm)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(string(b))
}


// Output
// d: xxx
// c: xxx
// b: xxx
// a: xxx
```

## まとめ

Go で map の YAML 出力時のソート順を指定する方法を実装してみました。
YAML 形式に閉じずに、他の形式でも似た実装で同じような結果が得られそうです。
実装方法としては、reflection 利用のあまり良くないコードかなとは思いつつ、他に方法も浮かばなかったのが実際のところです。
(他に良い実現方法があれば、ぜひ知りたいです。)

最後まで読んでいただきありがとうございました。


## 参考

- [Goのreflectで任意の構造体のフィールド変数を1つ増やしちゃう - Qiita](https://qiita.com/uechoco@github/items/b51df877659226d2893e)

