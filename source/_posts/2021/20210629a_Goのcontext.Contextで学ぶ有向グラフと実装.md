---
title: "Goのcontext.Contextで学ぶ有向グラフと実装"
date: 2021/06/29 00:00:00
postid: a
tag:
  - アルゴリズム
  - Go
category:
  - Programming
thumbnail: /images/20210629a/thumbnail.png
author: 辻大志郎
lede: "今回は身近なところに潜むグラフの例を紹介します。データ構造の一つに「グラフ」があります。グラフは対象物の関係性を数理的に表すものです。世の中の事象をグラフとして定式化することで、問題の見通しがよくなるなど、グラフの応用範囲はとても広く、かつ有用です。グラフそのものの説明については本記事で書ききれる内容ではないので割愛しますが、「グラフ理論」などで検索すればたくさん記事が見つかるでしょう。"
---
TIGの辻 ([@d_tutuz](https://twitter.com/d_tutuz)) です。

[アルゴリズムとデータ構造](/articles/20210628a/)連載の2日目です。今回は身近なところに潜むグラフの例を紹介します。

### はじめに

データ構造の一つに「グラフ」があります。グラフは対象物の関係性を数理的に表すものです。世の中の事象をグラフとして定式化することで、問題の見通しがよくなるなど、グラフの応用範囲はとても広く、かつ有用です。グラフそのものの説明については本記事で書ききれる内容ではないので割愛しますが、「グラフ理論」などで検索すればたくさん記事が見つかるでしょう。本記事では、グラフが活用されている例としてGoの標準パッケージにおける `Context` を紹介します。

### グラフとして考えるGoの `context` パッケージ

Goの `context` パッケージは `Context` インターフェース(コンテキスト)を提供しています。コンテキストはAPIサーバ/クライアント、バッチ処理などGoのプログラムの中で多く使われており、主な機能として

* 処理のキャンセル(タイムアウト/デッドライン)シグナルの伝達
* (リクエストスコープの)値の伝播

があります。

コンテキストは親子関係を保持することができます。すなわち、ルートとなるコンテキストをもとに、子のコンテキストを生成でき、さらに子のコンテキストから子のコンテキストを生成でき、全体として親子関係を持つことできます。データ構造としてはグラフ(狭義では有向木)となっています。

親子関係を持っているコンテキストの特徴として、値の伝播は、子から親のコンテキストを参照できます。また、キャンセル処理は親から子に伝播します。子から親のコンテキストはキャンセルできません。

以下のようなコンテキストを考えてみます。

<img src="/images/20210629a/d3199f99-d617-d616-6cb4-9f95910f44f3.png" alt="Contextのチェーン" width="361" height="441" loading="lazy">

コンテキストは `context.Context` でルートとなるコンテキストを作成できます。キャンセル処理は `context.WithCancel` タイムアウトは `context.WithTimeout` デッドラインは `context.WithDeadline` の関数を用いて、子コンテキストを生成できます。また値の伝播は `context.WithValue` で値を伝播できる子コンテキストを生成できます。

- 値の伝播

上記の図 `3.WithCancel()` で生成した子コンテキストから値を参照するときは親方向に値を参照するため、キー `x` で参照した場合は値として `aaa` が取得できます。`4.WithValue()` で生成した子コンテキストからキー `x` で値を参照したときは、新しい値である `gopher` の値が取得できます。

- 処理のキャンセル

処理のキャンセルは子のコンテキストのみに影響し、親のコンテキストには影響がありません。`3.WithCancel()` で生成した子コンテキストがキャンセルを実行した場合は、`4.WithValue()` のコンテキストはキャンセルされますが、`2.WithValue()` で生成した親のコンテキストの処理はキャンセルされません。

### グラフの扱い方と実装

コンテキストがどのように親子関係を保持するグラフを扱っているのか `context` パッケージの実装を見てみましょう。

参照しているGoのバージョンは `1.16.4` です。

#### 値の伝播：データの保持と親方向へのキーの探索

値の伝播と子から親方向への値の探索を実現するために `context` パッケージで扱っている実装はシンプルです。子のコンテキストから親方向のコンテキストを再帰的に探索しています。

<img src="/images/20210629a/38e34076-d4dd-4aa8-8dd9-610c49933417.png" alt="親方向へのキーの探索をしている図" width="361" height="518" loading="lazy">

値を伝播するために `context.WithValue` を用いることができました。また、コンテキストから値を取得するときは `Value` メソッドを用います。

```go
func WithValue(parent Context, key, val interface{}) Context {
	if parent == nil {
		panic("cannot create context from nil parent")
	}
	if key == nil {
		panic("nil key")
	}
	if !reflectlite.TypeOf(key).Comparable() {
		panic("key is not comparable")
	}
	return &valueCtx{parent, key, val}
}
```

`context` パッケージの実装の詳細としては `valueCtx` という構造体が値をキーバリューを保持します。`Context` のインターフェースが `valueCtx` に埋め込みされています。

```go
type valueCtx struct {
	Context
	key, val interface{}
}
```

上記のように `WithValue` で渡されたときの親のコンテキストを `valueCtx` のフィールドとして保持することで親コンテキストへの参照を保持しています。`valueCtx` の `Value` メソッドは以下の実装になっています。`valueCtx` で保持している `key` が引数のキーと一致すれば、キーに紐づく値が見つかったものとして、`valueCtx` で保持している値を返却し、保持しているキーではない場合は親コンテキストの `Value` メソッドを呼び出すことで子コンテキストから親方向のコンテキストに値を探索しています。

```go
func (c *valueCtx) Value(key interface{}) interface{} {
	if c.key == key {
		return c.val
	}
	return c.Context.Value(key)
}
```

仮にコンテキストのグラフに探索対象のキーが存在しないときは、もととなったコンテキスト `context.Background()` で生成しているコンテキストが実装している `nil` が取得されます。

```go
func (*emptyCtx) Value(key interface{}) interface{} {
	return nil
}
```

#### キャンセル処理：親から子のキャンセル

親のコンテキストがキャンセルされると、子のコンテキストもキャンセルされます。`context` パッケージの実装としては、`map` を用いて、キャンセル可能なコンテキストのグラフを実装します。キャンセル可能な親のコンテキストから子のキャンセル可能なコンテキストにキャンセルを伝播します。

<img src="/images/20210629a/9289157e-5141-0104-b3a1-008e25e60232.png" alt="枝分かれしたContext" width="401" height="411" loading="lazy">

`context.WithCancel` ではキャンセルできるコンテキスト `cancelCtx` と、キャンセルする関数を返却します。

```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc) {
	if parent == nil {
		panic("cannot create context from nil parent")
	}
	c := newCancelCtx(parent)
	propagateCancel(parent, &c)
	return &c, func() { c.cancel(true, Canceled) }
}
```

`cancelCtx` の構造体のフィールドを見るとわかるように、非公開フィールドである `children` を保持しており、この `map` を用いて、子のコンテキストへの参照を保持しています。

```go
type cancelCtx struct {
	Context

	mu       sync.Mutex            // protects following fields
	done     chan struct{}         // created lazily, closed by first cancel call
	children map[canceler]struct{} // set to nil by the first cancel call
	err      error                 // set to non-nil by the first cancel call
}
```

`WithCancel` の実装に含まれている `propagateCancel` 関数が親のキャンセル可能なコンテキストを探索して、見つかったキャンセル可能な親コンテキストの `children` の `map` に子のコンテキストを追加しています。

```go
func propagateCancel(parent Context, child canceler) {
	done := parent.Done()
	if done == nil {
		return // parent is never canceled
	}

	select {
	case <-done:
		// parent is already canceled
		child.cancel(false, parent.Err())
		return
	default:
	}

	if p, ok := parentCancelCtx(parent); ok {
		p.mu.Lock()
		if p.err != nil {
			// parent has already been canceled
			child.cancel(false, p.err)
		} else {
			if p.children == nil {
				p.children = make(map[canceler]struct{})
			}
			p.children[child] = struct{}{}
		}
		p.mu.Unlock()
	} else {
		atomic.AddInt32(&goroutines, +1)
		go func() {
			select {
			case <-parent.Done():
				child.cancel(false, parent.Err())
			case <-child.Done():
			}
		}()
	}
}
```

親のキャンセル可能なコンテキストがキャンセルされたときは、`map` である `children` をたどって、子のコンテキストをキャンセルします。

```go
func (c *cancelCtx) cancel(removeFromParent bool, err error) {
	if err == nil {
		panic("context: internal error: missing cancel error")
	}
	c.mu.Lock()
	if c.err != nil {
		c.mu.Unlock()
		return // already canceled
	}
	c.err = err
	if c.done == nil {
		c.done = closedchan
	} else {
		close(c.done)
	}
	for child := range c.children {
		// NOTE: acquiring the child's lock while holding parent's lock.
		child.cancel(false, err)
	}
	c.children = nil
	c.mu.Unlock()

	if removeFromParent {
		removeChild(c.Context, c)
	}
}
```

子のキャンセル可能なコンテキストから、親のキャンセル可能なコンテキストは参照できないため、子から親をキャンセルすることはできません。

<img src="/images/20210629a/cd0c070e-4683-749d-675e-b646d8251d7b.png" alt="キャンセルは親に伝播しない図" width="161" height="291" loading="lazy">

### まとめ

身近にグラフを扱っている例としてGoのコンテキストを紹介しました。

* 値の伝播はコンテキストの構造体の中にキーと値を保持し、探索時は再帰的に親のコンテキストを探索
* キャンセルの伝播は `map` を用いてキャンセルのグラフを実装し、キャンセルされたときは `map` を用いてキャンセルを伝播

としている実装例を紹介しました。`context` パッケージの実装の他にも [AirflowのTips 11選](https://future-architect.github.io/articles/20200131/) の記事で紹介されているような[Airflow](https://airflow.apache.org/)もDAG(グラフの一種)を扱います。グラフは応用範囲が広いデータ構造ですので、皆さんの身近な問題を解決する際にも役に立つでしょう。

