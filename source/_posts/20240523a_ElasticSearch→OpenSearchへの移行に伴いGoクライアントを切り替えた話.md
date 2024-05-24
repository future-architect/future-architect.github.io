---
title: "ElasticSearch→OpenSearchへの移行に伴いGoクライアントを切り替えた話"
date: 2024/05/23 00:00:00
postid: a
tag:
  - Go
  - OpenSearch
  - Elasticsearch
category:
  - Programming
thumbnail: /images/20240523a/thumbnail.png
author: 大江聖太郎
lede: "ElasticsearchからOpenSearchに移行した際のGo用クライアントの実装についてまとめます。"
---
<img src="/images/20240523a/top.png" alt="" width="1000" height="484">

# はじめに

はじめまして。2023年秋入社した、Technology Innovation Group (TIG)  大江聖太郎です。

ElasticsearchからOpenSearchに移行した際のGo用クライアントの実装についてまとめます。

# 背景

ElasticsearchからOpenSearchへの移行を行った際に、利用するGoのクライアントもElasticsearch用のものからOpenSearch用に変更しました。

このクライアントに関しては実装例が少なく、公式ドキュメントも情報が足りない印象を受けました。時にはどのような型のデータを入れていいかドキュメントを見ても分からず、クライアントのリポジトリのコードを読み、ようやく分かったということもありました。

そんな苦労がありましたので、少しでもお役に立てればという思いから実装例を紹介していきます。

# 使用するクライアント

- 今まで使っていたクライアント: [olivere/elastic](https://github.com/olivere/elastic)
- 今回新たに使うクライアント: [opensearch-go](https://github.com/opensearch-project/opensearch-go)

# 各メソッド

それでは、各メソッドの実装の違いについて詳しく見ていきましょう。

<div class="note warn" style="background: #fdf9e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

この記事では分量を少なくする目的で、[ステータスコードのエラーハンドリング](#ステータスコードのエラーハンドリング)の章を除き、エラーハンドリングを全て握りつぶして記載します。

</div>

## 追加/更新系メソッド

### Index
Indexメソッドは、OpenSearchにおいてデータをIndex[^1]に登録し、既に既存のデータがある場合は上書きする処理です。RDSにおけるUpsertのようなものです。

[^1]: IndexとはRDSにおけるテーブルのようなものです。Elasticsearch/OpenSearchの用語について詳しくは[こちら](https://www.elastic.co/jp/blog/what-is-an-elasticsearch-index)をご覧ください。

#### olivere/elasticの実装
``` golang
package main

import (
	"context"
	"fmt"

	elastic "github.com/olivere/elastic/v7"
)

func main() {
	c, _ := elastic.NewClient()

	item := &map[string]any{"key": "value"}
	resp, _ := c.Index().Index("indexname").BodyJson(item).
    Id("documentId01").Refresh("true").Do(context.Background())

	fmt.Println(resp)
}
```

#### opensearch-goの実装

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	opensearch "github.com/opensearch-project/opensearch-go/v2"
)

func main() {
	c, _ := opensearch.NewDefaultClient()

	item := &map[string]any{"key": "value"}
	jsonItem, _ := json.Marshal(item)

	resp, _ := c.Index(
		"indexname",
		bytes.NewReader(jsonItem), // io.Readerを満たす型であれば何でも入れられる
		c.Index.WithDocumentID("documentId01"),
		c.Index.WithRefresh("true"),
		c.Index.WithContext(context.Background()),
	)
	fmt.Println(resp)
}
```

### Update

Updateはその名の通り既に存在するドキュメントを更新する操作です。

ドキュメントを更新する際、IndexとUpdateのどちらを使用するのが適切かは、次の三点の違いを考慮すると良いでしょう。

1. 内部の動作として、Indexは今あるドキュメントを削除して新しいドキュメントに置き換える一方、Updateはドキュメントの特定のフィールドのみを更新する
2. 特にドキュメントに変更点がない場合、Indexはバージョンがインクリメントされるが、Updateはされない
3. Updateの方がパフォーマンス面では優れている

#### olivere/elasticの実装

```go
package main

import (
	"context"
	"fmt"

	elastic "github.com/olivere/elastic/v7"
)

func main() {
	c, _ := elastic.NewClient()

	item := &map[string]any{"key": "updatedvalue"}
	resp, _ := c.Update().Index("indexname").Doc(item).Id("documentId01").
    Refresh("true").Do(context.Background())

	fmt.Println(resp)
}
```

#### opensearch-goの実装

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	opensearch "github.com/opensearch-project/opensearch-go/v2"
)

func main() {
	c, _ := opensearch.NewDefaultClient()

	item := &map[string]any{"doc": &map[string]any{"key": "updatedvalue"}}
	jsonItem, _ := json.Marshal(item)

	resp, _ := c.Update(
		"indexname",
		"documentId01",
		bytes.NewReader(jsonItem), // io.Readerを満たす型であれば何でも入れられる
		c.Update.WithContext(context.Background()),
	)
	fmt.Println(resp)
}
```

#### 実装方法の違い
パラメーターは同じですが、大きな違いとして4点あります。

1. ドキュメントの渡し方
    - olivere/elasticでは、ドキュメントがinterface{}型で渡せたので、Goの構造体をそのまま渡すことが出来ましたが、opensearch-goではio.Reader型を満たす型に変換する必要があります。例では*bytes.Reader型に変換しています
2. 引数の記述方法
    - olivere/elasticではメソッドチェーンで書くことが出来ましたが、opensearch-goではIndex()のパラメーターとして記述します
3. olivere/elasticはDo()メソッドを明示的に呼び出して操作を適用しますが、opensearch-goはIndex()メソッドが自動的にDo()を実行する設計となっています
4. opensearch-goではアップデートするフィールドと値を、"doc"フィールドの中に入れてネストする必要があります。olivere/elasticの方ではそのようにする必要はないです

## 取得系メソッド

### GET

Getは、特定の一つのドキュメントを取得する操作です。

#### olivere/elasticの実装

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"

	elastic "github.com/olivere/elastic/v7"
)

func main() {
	c, _ := elastic.NewClient()

	resp, _ := c.Get().Index("indexname").Id("documentId01").Do(context.Background())

	// 取得したドキュメント本体を格納するための構造体
	type EsItem struct {
		Key string `json:"key"`
	}
	var item EsItem
	_ = json.Unmarshal(*&resp.Source, &item)
	fmt.Println(item)
}
```

#### opensearch-goの実装

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"

	opensearch "github.com/opensearch-project/opensearch-go/v2"
)

func main() {
	c, _ := opensearch.NewDefaultClient()

	resp, _ := c.Get(
		"indexname",
		"documentId01",
		c.Get.WithContext(context.Background()),
	)

	// Getメソッドのレスポンスを格納するための構造体。Sourceの中にドキュメント本体が格納される。
	type GetResult struct {
		Source      *json.RawMessage `json:"_source"`
		SeqNo       int              `json:"_seq_no"`
		PrimaryTerm int              `json:"_primary_term"`
	}
	var result GetResult
	_ = json.NewDecoder(resp.Body).Decode(&result)
	data, _ := result.Source.MarshalJSON()
	fmt.Println(string(data))

	// 取得したSourceを格納するための構造体
	type OsItem struct {
		Key string `json:"key"`
	}
	var item OsItem
	_ = json.Unmarshal(*getResult.Source, &item)
	fmt.Println(item)
}
```

### SEARCH

Searchは、クエリパラメーターを渡し、特定の条件に当てはまるドキュメントのリストを取得する操作です。

#### olivere/elasticの実装

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"

	elastic "github.com/olivere/elastic/v7"
)

func main() {
	c, _ := elastic.NewClient()

	sortInfoList := []elastic.Sorter{
		elastic.SortInfo{
			Field:     "key",
			Ascending: true,
			Missing:   "_first",
		},
	}

	query := elastic.NewQueryStringQuery("key:value")

	resp, _ := c.Search("indexname").Query(query).SortBy(sortInfoList...).From(0).Size(100).Do(context.Background())

	// 取得したドキュメント本体を格納するための構造体
	type EsItem struct {
		Key string `json:"key"`
	}
	searchList := make([]*EsItem, len(resp.Hits.Hits))
	for i, hit := range resp.Hits.Hits {
		var item EsItem
		_ = json.Unmarshal(*&hit.Source, &item)
		searchList[i] = &item
	}
	fmt.Println(searchList)
}
```

#### opensearch-goの実装

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	opensearch "github.com/opensearch-project/opensearch-go/v2"
)

func main() {
	c, _ := opensearch.NewDefaultClient()

	sortFields := map[string]any{
		"sort": []map[string]any{
			{
				"key": map[string]any{
					"order":   "asc",
					"missing": "_first",
				},
			},
		},
	}
	jsonSortFields, _ := json.Marshal(sortFields)

	result, _ := c.Search(
		c.Search.WithIndex("indexname"),
		c.Search.WithQuery("key:value"),
		c.Search.WithBody(bytes.NewReader(jsonSortFields)),
		c.Search.WithFrom(0),
		c.Search.WithSize(100),
		c.Search.WithContext(context.Background()),
	)

	// Searchメソッドのレスポンスを格納するための各構造体。
	type Total struct {
		Value    int64  `json:"value"`
		Relation string `json:"relation"`
	}

	type SearchHit struct {
		Index  string           `json:"_index"`  // index name
		Id     string           `json:"_id"`     // external or internal
		Source *json.RawMessage `json:"_source"` // stored document source
	}

	type SearchHits struct {
		Total    *Total       `json:"total"`     // total number of hits found
		MaxScore *float64     `json:"max_score"` // maximum score of all hits
		Hits     []*SearchHit `json:"hits"`      // the actual hits returned
	}

	type SearchResult struct {
		Hits *SearchHits `json:"hits"` // the actual search hits
	}

	var sr SearchResult
	_ = json.NewDecoder(result.Body).Decode(&sr)

	// 取得したドキュメント本体を格納するための構造体
	type OsItem struct {
		Key string `json:"key"`
	}
	searchList := make([]*OsItem, len(sr.Hits.Hits))
	for i, hit := range sr.Hits.Hits {
		var item OsItem
		_ = json.Unmarshal(*hit.Source, &item)
		searchList[i] = &item
	}
	fmt.Println(searchList)
}
```

### 実装方法の違い

- olivere/elasticでは取得したドキュメント本体がそのまま*json.RawMessage型のレスポンスで返るのに対し、opensearch-goではドキュメント本体以外にSeqNoやPrimaryTermを含むio.ReadCloser型の構造体として返る。そのためopensearch-goではアプリ側でレスポンスをjson.Decoderを使ってDecodeした上で、そこからドキュメント本体を抜き出す必要がある
- queryStringを渡す際、olivere/elasticの場合はNewQueryStringQueryを呼び出し、elastic.QueryStringQueryの構造体にする必要がある。opensearch-goの場合はWithQueryにそのまま渡せる
- ソートフィールドを渡す時、olivere/elasticの場合はSort項目用に[]elastic.Sorter型が用意されていて、SortByに[]elastic.Sorter型の構造体を渡せばよい。一方opensearch-goの場合はそもそもソートフィールド用の型が用意されていないため、自前の構造体を作成し、WithBodyの形で渡す必要がある

## ステータスコードのエラーハンドリング

#### olivere/elasticの実装

```go
package main

import (
	"context"
	"log/slog"

	elastic "github.com/olivere/elastic/v7"
)

func main() {
	c, _ := elastic.NewClient()

	item := &map[string]any{"key": "value"}

	_, err := c.Index().Index("indexname").BodyJson(item).
    Id("documentId01").Refresh("true").Do(context.Background())

	// ステータスコード400で返ってきた場合はこれでエラーが返る
	if err != nil {
		slog.Error(err.Error())
	}
}
```

#### opensearch-goの実装

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"

	opensearch "github.com/opensearch-project/opensearch-go/v2"
)

func main() {
	c, _ := opensearch.NewDefaultClient()

	item := &map[string]any{"key": "value"}
	jsonItem, _ := json.Marshal(item)

	resp, err := c.Index(
		"indexname",
		bytes.NewReader(jsonItem),
		c.Index.WithDocumentID("documentId01"),
		c.Index.WithRefresh("true"),
		c.Index.WithContext(context.Background()),
	)

	// errの中にステータスコードのエラーは含まれず、ステータスコード400で返ってきた場合はこれでエラーが返らない。
	if err != nil {
		slog.Error(err.Error())
	}

	// ステータスコードのエラーはレスポンスの中に含まれており、レスポンスの中身を見て判断する
	if resp.IsError() {
		res, _ := io.ReadAll(resp.Body)
		slog.Error(string(res))
	}
}
```

### 実装方法の違い

ドキュメントが見つからなかったとき、登録に失敗したときなど、Elasticsearch/OpenSearchから400や404のステータスコードでのエラーが返ってきますが、その際に以下の違いがあります。

- olivere/elasticでは返り値のerrとして返るのでそれを見ればよいが、opensearch-goではステータスコードのエラーはレスポンスの中に含まれており、レスポンスの中身を見て判断する必要がある

# おわりに

ElasticsearchのクライアントとOpenSearchのクライアントの違いについてまとめました。

ElasticsearchからOpenSearchへ切り替えるときなどにお役に立てれば幸いです。

どちらのクライアントも一長一短あり、やりたいことによっては一工夫する必要があることが分かりました。個人的には、あまりこねくり回すことなくビジネスロジックに集中できるライブラリが出来たらいいなと感じました。

[^1]: IndexとはRDSにおけるテーブルのようなものです。詳しくは[こちら](https://www.elastic.co/jp/blog/what-is-an-elasticsearch-index)をご覧ください。
