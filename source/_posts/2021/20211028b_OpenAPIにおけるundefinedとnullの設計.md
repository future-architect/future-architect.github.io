---
title: "OpenAPIにおけるundefinedとnullの設計"
date: 2021/10/28 00:00:01
postid: b
tag:
  - OpenAPI
  - jsonschema
  - Swagger
  - 設計
category:
  - Programming
thumbnail: /images/20211028b/thumbnail.png
author: 武田大輝
lede: "OpenAPI仕様に則ってREST APIの設計をする際に、値が存在しないという状態をどのように表現するかというお話です。まずはじめに、ここで`undefined`と言っているのは、OpenAPIの仕様において、リクエスト/レスポンスのデータ型を定義するSchema Objectのプロパティの1つである`required`が指定されていない状態を指します。"
---

<img src="/images/20211028b/top.png" alt="" width="800" height="414">

## はじめに

OpenAPI仕様に則ってREST APIの設計をする際に、値が存在しないという状態をどのように表現するかというお話です。

## undefinedとは

まずはじめに、ここで`undefined`と言っているのは、OpenAPIの仕様において、リクエスト/レスポンスのデータ型を定義するSchema Objectのプロパティの1つである`required`が指定されていない状態を指します。

OpenAPIにおける`required`の定義を確認してみましょう。
[OpenAPIの仕様](https://spec.openapis.org/oas/v3.1.0#schema-object)を参照すると、Schema ObjectはJSON Schemaの仕様に従うと記載されています。

> The Schema Object allows the definition of input and output data types. These types can be objects, but also primitives and arrays. This object is a superset of the JSON Schema Specification Draft 2020-12.
>
> For more information about the properties, see JSON Schema Core and JSON Schema Validation.

それでは[JSON Schemaの仕様](https://datatracker.ietf.org/doc/html/draft-wright-json-schema-validation-00#section-5.15)を確認してみましょう。

>An object instance is valid against this keyword if its property set contains all elements in this keyword's array value.

少しわかりづらいですが、`required`として指定されたプロパティはキーとしてインスタンスに含まれなければならないことを意味します。

具体的な例として下記のようなOpenAPI定義を考えてみましょう。

```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type: string
    required:
      - id
```

**正しいケース**

✅ `id`に具体的な文字列が指定されている

```json
{ "id": "00001" }
```

✅ `id`に空文字が指定されている

```json
{ "id": "" }
```

**正しくないケース**

❌ `id`のキーが存在しない

```json
{}
```

❌ `id`の値に`null`が指定されている

```json
{ "id": null }
```

後述しますが、この場合`required`の条件は満たしますが、データ形が文字列ではないため、NGとなります。

このように`required`とはキー自体の必須・非必須を定義するプロパティであり、キーの具体的な値については関与していないということをまずは頭に入れておいてください。

## nullとは

次に`null`というのは、リクエスト/レスポンスにおけるプロパティの値としての`null`を指しています。
リクエスト/レスポンスのフォーマットとしてJSONが用いられることが多いと思いますが、[JSONの仕様](https://www.rfc-editor.org/rfc/rfc8259.html#section-3)として `null`型というのは明確に定義されています。

OpenAPIにおいてこの`null`型はどのように表現されるのでしょうか。
結論から言うとバージョンによって表現が異なります。

**OpenAPI3.0の場合**
https://spec.openapis.org/oas/v3.0.3#data-types

> null is not supported as a type (see nullable for an alternative solution)

`null`は型としてサポートされておらず、代わりにnullableを利用する仕様となっています。


```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type: string
        nullable: true
    required:
      - id
```

**OpenAPI3.1の場合**
https://spec.openapis.org/oas/v3.1.0#data-types
`null`に関する注記は削除され、JSON Schemaの仕様と同じく`null``を型として明確にサポートするようになりました。

```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type:
          - string
          - 'null'
    required:
      - id
```

バージョンによって表現の差異はありますが、意味するところは同じです。

**正しいケース**

✅ `id`に具体的な文字列が指定されている

```json
{ "id": "00001" }
```

✅ `id`に空文字が指定されている

```json
{ "id": "" }
```

✅ `id`に`null`が指定されている

```json
{ "id": null }
```

**正しくないケース**

❌ `id`のキーが存在しない

```json
{}
```

これは先述した`required`の条件を満たしていないためNGとなります。


## undefined vs null

ここまで見てきたように`undefined`と`null`は似て非なるものです。
`undefined`はキーの必須・非必須を定義しているのに対し、`null`は値が`null`かどうかを定義しています。

しかしながらREST APIを設計するにあたって空の項目をどちらで表現するかは意見が分かれているように思います。
例えば以下のようなユーザオブジェクトのJSON表現を考えてみましょう。
オプショナルなユーザ属性としてスコアを持ちますが、スコアが存在しない状態をどのように表現するのでしょうか。

| 項目 | データ型 | 必須 |
|------|----------|------|
| ID   | 文字列   | ○    |
| Name | 文字列   | ○    |
| Score  | 数値     |      |

`undefined`として表現する場合

```json
{ "id": "00001", "name": "Bob" }
```

`null`として表現する場合

```json
{ "id": "00001", "name": "Bob", "score": null }
```

### undefined派

* リクエスト/レスポンスのペイロードサイズを小さくするために`null`値は利用しない方が良い。
* 必要なプロパティのみが含まれている方が視認性が良い。

なおGoogleの[JSON Style Guide](https://google.github.io/styleguide/jsoncstyleguide.xml?showone=Empty/Null_Property_Values#Empty/Null_Property_Values)では、明確に`null`値が必要となる場合以外は、プロパティ自体含めない形が推奨（ここでいう`undefined`派）されています。

>If a property is optional or has an empty or null value, consider dropping the property from the JSON, unless there's a strong semantic reason for its existence.

### null派

* データの構造の全量を把握できるため、`null`値を含めた方が良い。

### null以外の方法で空値を表現する派

`null派`の亜種となりますが、データ型に応じては`null`以外の方法で空値を表現できる場合があり、明示的に`null`型を利用しない方法となります。

| データ型    | 空値の表現       |
|:--------|:------------|
| string  | ""（空文字）     |
| integer | 表現不可        |
| number  | 表現不可        |
| boolean | 表現不可        |
| array   | []（空配列）     |
| object  | {}（空オブジェクト） |

そもそも`integer`や`number`のような数値型やブーリアン型は空値を表現する方法がないので、この方法は採用できません。
数値について、例えば業務上自然数しか入りえない項目（例. 年齢）に対して`-1`のような値を利用して空値を表現するような場合を見かけますが、これは設計上望ましくないと考えます。

さらに言うと、空値の表現が可能な文字列やオブジェクト含め、後述するバリデーションの観点から、`null`型以外の型で空値を表現するのは基本的に望ましくないと考えています。

### 筆者の意見

結論から言うと原則`null`値は利用せずキー自体を含めない`undefined`が良いと思っています。
特にOpenAPIの仕様に基づいてAPI仕様をドキュメントする場合において、`null値`を許容するように記述するのは煩雑です。

ただしここで「原則」と言ったのはAPIのユースケースに応じて明確に`null`値を表現したいケースは存在すると考えています。

#### ユースケースの観点

先程のユーザリソースを例にCRUDを考えてみましょう。

##### 取得（GET）

`score`が存在する場合は、`score`値が返却されます。

```sh
$ curl -X GET /users/00001
{ "id": "00001", "name": "Bob", score: 70 }
```

`score`が存在しない場合は、レスポンスに`score`プロパティは含めません。

```sh
$ curl -X GET /users/00001
{ "id": "00001", "name": "Bob" }
```

##### 新規作成（POST）

作成時に`score`値が存在する場合は、リクエストに`score`値を含めます。

```sh
$curl -X POST /users --data '{ "name": "Bob", "score": 70 }'
{ "id": "00001", "name": "Bob", score: 70 }
```

作成時に`score`値が存在しない場合は、リクエストに`score`プロパティは含めません。もちろんこの時のレスポンスとして作成したリソースを返却する場合、レスポンスの中にも`score`プロパティは含まれません。

```sh
$curl -X POST /users --data '{ "name": "Bob" }'
{ "id": "00001", "name": "Bob" }
```

##### 全件更新（PUT）

新規作成（POST）の場合と同様です。

##### 差分更新（PATCH）

差分更新として指定された一部の項目のみを更新したいというケースは多からず存在するでしょう。この場合はnull値を明示的に指定する必要があると考えています。

というのもリクエストのプロパティからscore自体を除外してしまうと、更新対象外となってしまい意図した挙動となりません。

```sh
$curl -X PATCH /users/00001 --data '{ }'
{ "id": "00001", "name": "Bob", score: 70 } // score　is not cleared.
```

このような場合、明確に`null`値を指定してアップデートをする必要があります。

```sh
$curl -X PATCH /users/00001 --data '{ "score": null }'
{ "id": "00001", "name": "Bob" }  // score　is cleared.
```

#### バリデーションの観点

リクエスト/レスポンス（特にリクエスト）はサーバ側でバリデーションを実施することが基本です。
先程例としてあげたユーザオブジェクトが`score`の代わりにオプショナルな属性として`email`を持つケースをもとに考えてみましょう。
バリデーションを行うため、`email`は[RFC 5321](https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2)の仕様に則ったフォーマットを保持することを前提として考えます。

| 項目 | データ型 | 必須 | フォーマット |
|------|----------|------|-|
| ID   | 文字列   | ○    ||
| Name | 文字列   | ○    ||
| Email  | 文字列     |      |RFC 5321形式|

##### undefinedで表現する場合

OpenAPI定義は次のようになります。

```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      email:
        type: string
        format: email
    required:
      - id
      - name
```

JSON Schemaに基づいたValidation結果は次のようになり、特筆すべき事項はありません。

✅ `email`に適切なフォーマットの値が指定される場合

```json
{ "id": "00001", "name": "Bob", "email": "bob@example.com" } // Valid
```

✅ `email`が存在しない場合

```json
{ "id": "00001", "name": "Bob" } // Valid
```

❌ `email`に不適切なフォーマットの値が指定される場合

```json
{ "id": "00001", "name": "Bob", "email": "invalid" } // Invalid
```

##### null型で表現する場合

OpenAPI定義は次のようになります。

```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      email:
        type:
          - string
          - 'null'
        format: email
    required:
      - id
      - name
```

こちらもundefinedで表現した場合と同様にバリデーションについては特筆すべき事項はありません。

✅ `email`に適切なフォーマットの値が指定される場合

```json
{ "id": "00001", "name": "Bob", "email": "bob@example.com" } // Valid
```

✅ `email`に`null`値が指定される場合

```json
{ "id": "00001", "name": "Bob", "email": null } // Valid
```

❌ `email`に不適切なフォーマットの値が指定される場合

```json
{ "id": "00001", "name": "Bob", "email": "invalid" } // Invalid
```

##### null型以外で空値を表現する場合

最後に`email`の空値を`null`型ではなく空文字で表現する場合を考えてみましょう。
OpenAPI定義は次のようになります。

```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      email:
        type: string
        format: email
    required:
      - id
      - name
```

このときJSONにて空の`email`を表現するためには空文字を利用することになりますが、下記のJSONはJSON Schema ValidationでNGと判断されます。

❌ `email`に空文字が指定される場合

```json
{ "id": "00001", "name": "Bob", "email": "" } // Invalid
```

これは空文字がメールアドレスのフォーマットとして許容されないからです。
null型の代わりに空文字を採用する場合、OpenAPIの定義上`format: email`を除いてあげないと、空値を表現することができません。これは本末転倒と言わざるを得ないでしょう。


##### その他注意事項

空値の表現にnull型を用いる場合で、`enum`（列挙型）を利用している場合は、型だけでなく`enum`の要素としても`null`を含めてあげないとエラーとなります。


```yaml
application/json:
  schema:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      color:
        type:
          - string
          - 'null'
        enum:
          - 'red'
          - 'yellow'
          - 'green'
          - null # これがないとnull指定時にエラーとなる
    required:
      - id
      - name
```


#### プログラムの観点

最後に実装するプログラム視点での注意点を補足しておこうと思います。

##### クライアントサイド

フロントエンドがWEBの場合は、JavaScriptやTypeScriptを用いてクライアント側の実装をすることが多いと思います。
JavaScriptは言語としてundefined型とnull型を持つので上記のいずれのパターンにも、特に問題なく対応できると思っています。（今のところ筆者は課題感を持っていません。）


##### サーバサイド

サーバサイドについては、上述した差分更新のユースケースなどで`undefined`の場合と`null`値の場合を識別したい場合に少し工夫が必要になる場合があるかもしれません。

ほとんどのプログラムにおいてはJSONを対応するオブジェクトにデシリアライズすることになると思いますが、デシリアライズした後に上記の識別をしなければならないケースが該当します。

例えばGolangをで先程のユーザオブジェクトを素直に表現すると次のようになります。

```go
type User struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Email *string `json:"email"`
}
```

この場合、`email`が`undefined`の場合と`null`値の場合を判別することができません。

```go
func main() {
	// The email is undefined.
	user1 := &User{}
	json.Unmarshal([]byte(`{ "id": "00001", "name": "Bob" }`), user1)

	// The email is null.
	user2 := &User{}
	json.Unmarshal([]byte(`{ "id": "00001", "name": "Bob", "email": null }`), user2)

	// Both email values are nil
	fmt.Println(user1.Email == user2.Email)
}
```

`undefined`の場合と`null`値を判別したい場合は別途構造体を用意する形となります。

```go
// NullString represents a string value that may be null.
type NullString struct {
	Value *string
	Set   bool
}


func (v NullString) MarshalJSON() ([]byte, error) {
	if v.Set {
		return json.Marshal(v.Value)
	}
	return json.Marshal(nil)
}

func (v *NullString) UnmarshalJSON(data []byte) error {
	v.Set = true
	// Return if the data is null
	if string(data) == "null" {
		return nil
	}
	if err := json.Unmarshal(data, &v.Value); err != nil {
		return err
	}
	return nil
}

func (v NullString) String() string {
	if !v.Set {
		return "<nil>"
	}
	if v.Value == nil {
		return "null"
	}
	return *v.Value
}
```

これを用いてユーザオブジェクトを再定義すると下記のようになります。

```go
type User struct {
	ID    string     `json:"id"`
	Name  string     `json:"name"`
	Email NullString `json:"email"`
}
```

`undefined`の場合は`Set`プロパティが`false`、`null`値が指定された場合はは`Set`プロパティが`true`となります。

```go
func main() {
	// The email is undefined.
	user1 := &User{}
	json.Unmarshal([]byte(`{ "id": "00001", "name": "Bob" }`), user1)

	// The email is null.
	user2 := &User{}
	json.Unmarshal([]byte(`{ "id": "00001", "name": "Bob", "email": null }`), user2)

	fmt.Println(user1.Email.Set) // false
	fmt.Println(user2.Email.Set) // true
}
```

## おわりに

いかがでしたでしょうか。

この辺りの設計は一概に正解があるというものではないので、ぜひご意見ある方はコメントいただけますと幸いです。

いずれにしても設計・開発を推進していく上では、設計者・開発者でこのあたりの方針について認識を合わせ、システム全体として統一感のとれた作りにしておくことが大切だと思っています。

