---
title: "Policy as Code を実現する Open Policy Agent に憧れて。ポリシーコードでAPI仕様をLintする"
date: 2020/09/30 00:00:00
postid: ""
tags:
  - CNCF
  - OpenPolicyAgent
  - Swagger
  - OpenAPI
  - Go
  - Policy-as-Code
categories:
  - DevOps
series: "CNCF2020"
thumbnail: /images/2020/20200930/thumbnail.png
author: 真野隼記
lede: "Open Policy Agent（OPA）は汎用的なポリシーエンジンで、Rego と呼ばれるポリシー言語で定義されたルールに従って、入力がポリシーに沿っているか否かの判定を移譲させることができます。Regoで宣言的にポリシーを実装し、Policy as Code を実現できます。コーディング規約も一種のポリシーとみなして、Open API Spec（Swagger）をLinter的にチェックするツールを題材に、OPAを用いて開発してみたいと思います。"
---
<img src="/images/2020/20200930/opa-horizontal-color.png" width="1200" height="398" loading="lazy">

## はじめに

こんにちは、TIG DXユニット真野です。

[CNCF連載](/articles/20200928/)2回目はOpen Policy Agent がテーマです。前回は伊藤さんによる、[k3sを知る、動かす、感じる](/articles/20200929/)でした。

* https://www.openpolicyagent.org/

## Open Policy Agentとは

Open Policy Agent（OPA）は汎用的なポリシーエンジンで、[Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) と呼ばれるポリシー言語で定義されたルールに従って、入力がポリシーに沿っているか否かの判定を移譲させることができます。Regoで宣言的にポリシーを実装し、Policy as Code を実現できます。

<img src="/images/2020/20200930/opa.png" width="471" height="302" loading="lazy">

OPAは汎用的というだけあって、Kubernetes上でしか動かせないと言った制約は無いです。Go言語で書かれていることもあって、普通の外部パッケージと同様に関数呼び出しができます。また、公式ドキュメントにも適用ドメインを選ばないと書かかれており、いくつかの活用例も挙げられています。

* どのユーザーがどのリソースにアクセスできるか
* どのサブネットの出力トラフィックが許可されているか
* コンテナが実行できるOS機能
* システムにアクセスできる時間帯

ポリシーエンジンと聞くと、なんとなくOK/NGだけ返すだけなのねと思いがちですが、OPAのAPIはクエリに対してレスポンスを返すような設計になっていて、JSONのような構造データの入出力もできます。

2020/09/27時点で CNCF projectsの `Incubating`、バージョンは `v0.23.2`が最新でした。

## Policy as Code

Policy as Codeの先駆けは自分が知る限り HashiCorp の [Sentinel](https://www.hashicorp.com/sentinel)だと認識しています。Terraformは Infrastructure as Codeを実現しますが、Sentinelのような Policy as Codeなツールと組み合わせ、インフラ構成全体のアクセスポリシーを設定することで、より安全にインフラ作成を自動化したり、不用意な破壊を防ぐことできるとされています。古いイメージを使わないといったセキュリティの観点や、あまり高すぎるインスタンスを立ち上げすぎないと言ったクラウド破産を防ぐといった使い方もよく聞きますよね。

* [HashiCorp、インフラ変更全体にまたがるアクセス権を設定する「Sentinel」発表「Policy as Code」を実現するフレームワーク。HashiConf'17 - Publickey](https://www.publickey1.jp/blog/17/hashicorpsentinelpolicy_as_codehashiconf17.html)

Sentinelは非常に気になっていて、最近[バイナリがダウンロード](https://docs.hashicorp.com/sentinel/downloads/)できるぞ！ と、伊藤さんに教えてもらいましたが、利用ライセンスがよく分からないため触れずでした（ご存知の方は教えて下さい）

Sentinelと同様にOpen Policy AgentはPolicy as Codeを掲げています。個人的にはチーム開発において大小様々なポリシーが明示的にも暗黙的にも存在するため、これをポリシーコード化することで、良い成果を生み出せるのではと期待しています。

今回は後で記載している通り、コーディング規約も一種のポリシーとみなして、Open API Spec（Swagger）をLinter的にチェックするツールを題材に、OPAを用いて開発してみたいと思います。

## Rego概要

RegoはDatalogというクエリ言語にインスパイアされて開発された言語です。Datalogは聞き慣れないですが、Prologの流れを組む言語です。RegoはDatalogを拡張してJSONのような構造化モデルに対応させたようです。

基本的な文法は[こちら](https://www.openpolicyagent.org/docs/latest/policy-language/)にまとめられています。

[Rego Playground](https://play.openpolicyagent.org/)というサイトがあり、簡単に動作検証できます。何はともあれ色々触ってみるのが良いと思います。

見たまんまですが、画像の左側がRegoエディタ、右枠のINPUTが入力、DATAがRegoで参照する外部データ、OUTPUTがEvaluateボタンを押した後の実行結果です。
ご覧のように入力も出力も構造化データ（JSON）なのがよく分かります。

<img src="/images/2020/20200930/image.png" width="1200" height="500" loading="lazy">

公式ドキュメントでは以下3つの例が載っていました。

* https://play.openpolicyagent.org/p/ikesWCFIH8
* https://play.openpolicyagent.org/p/DqXNKeLm20
* https://play.openpolicyagent.org/p/qUkvgJRpIU

PlaygroudのExamplesをクリックすると、他にも色々な例が載っています。

<img src="/images/2020/20200930/image_2.png" width="912" height="449" loading="lazy">

## Regoの文法さわり

Prologをやってれば当たり前かもしれませんが、JavaやGoやJSくらいしか書いたことが無い私から見て、特徴的だなと思った[Regoの文法](https://www.openpolicyagent.org/docs/latest/policy-language/)のつかみを紹介します。かなり異次元だなと思いました。

まずは 変数 pi に 3.14159を代入したコードです。`:=` ですでに変数宣言済みかどうかチェックしてくれます。 `{"pi":3.14159}` というJSONが実行結果です。まぁそういうものかと納得できます。

```prolog
package test

pi := 3.14159

# 実行結果
# {
#    "pi": 3.14159
# }
```

次は式が入りました。 x > y が最初にきて、 x,yの代入がその後になっていて実行時エラーになりそうですが、問題なく判定できます。公式ドキュメントに `The order of expressions in a rule does not affect the document’s content.` と書かれている通り、書いた順番は影響ないようです。なるほど。

```prolog
package test

s {
    x > y
    y = 41
    x = 42
}

# 実行結果
# {
#    "s": true
# }
```

次は `sites` というネストしたデータを使ってルール`r1`, `r2`, `r3`, `r4`, `r5`を作りました。site[_]でループを回すような処理になり、`r1` は `prod` が存在するので `true`です。`r2` は `false` となってほしいところですが、出力されません。一度も true と評価されなかったのでドキュメントが生成されないようです。`r3`のようにルールを作って、`r4`から利用すると言った事もできます。`r4` は `true` ですが `r5` は一度も `true` にならなかったので出力されません。

```prolog
package test

sites := [{"name": "prod"}, {"name": "smoke1"}, {"name": "dev"}]

r1 { sites[_].name == "prod" }
r2 { sites[_].name == "uat" } # 存在しないキーを指定

r3[name] { name := sites[_].name }
r4 { r2["prod"] }
r5 { r2["local"] }  # 存在しないキーを指定

# 実行結果(sitesは省略）
# {
#     "r1": true,
#     "r3": [
#         "prod",
#         "smoke1",
#         "dev"
#     ],
#     "r4": true
# }
```

次は予約語のdefaultを利用して、allowの初期値をfalseにします。

allowの宣言が2箇所にありますが、ブロック同士はOR条件になります。allowのBody内はAND条件になります。

```prolog
package test

# よくあるdefaultの使い方で、初期値をfalseで設定する
default allow = false

# allowのブロック同士はOR条件になる
allow {
	input.attributes.request.http.method == "GET" # 同じBody内はAND条件になる
	input.attributes.request.http.path == "/"     # 同じBody内はAND条件になる
}

# allowのブロック同士はOR条件になる
allow {
	input.attributes.request.http.headers.authorization == "Basic charlie"
}
```

上記のルールに、以下の入力1.jsonで評価すると、`{"allow": true}` になります。１つ目のallowが `true` になるためです。

```json 入力1.json
{
    "attributes": {
        "request": {
            "http": {
                "headers": {
                    ":authority": "example-app",
                    ":method": "GET",
                    ":path": "/",
                    "accept": "*/*",
                    "authorization": "Basic ZXZlOnBhc3N3b3Jk"
                },
                "method": "GET",
                "path": "/",
                "protocol": "HTTP/1.1"
            }
        }
   }
}
```

予約後は他にも `some`、`with`、`else` があります。使いこなせばSQLの自己結合みたいな表現もできるようですが、慣れないうちは道のりがとてつもなく長く感じます。パズルみたいで楽しいと思えた人は才能だなと思います。

## GoからOPAを呼ぶ

OPAは`github.com/open-policy-agent/opa/rego`パッケージを利用することで、Goから組み込みライブラリ形式で呼び出せます。

* 参考: https://www.openpolicyagent.org/docs/latest/integration/#integrating-with-the-go-api

ドキュメントそのままですが、転載します。いわゆるルールは module 変数に代入しています。`rego.New`で `rego.Rego` を作成してから、`PrepareForEval` で `PreparedEvalQuery` を作成すると、`Eval` で評価できます。OPAからするとRegoはモジュールと呼ばれているので、ここの表現は慣れかなと思います。

Regoモジュールの内容は、HTTP Requestが指定のパスか、Adminだったら評価するというものです。リクエストが1つ目の条件を満たしているので、評価結果は `x:true` を取得できています（最後のコメント部分）

全文は[こちら](https://github.com/laqiiz/openpolicyagent-example/blob/master/exmaple/example.go)に載せています。

```go main.go
package main

import (
	"context"
	"fmt"
	"github.com/open-policy-agent/opa/rego"
	"log"
)

func main() {
	module := `<Regoコード>`
	ctx := context.Background()

	query, err := rego.New(
		rego.Query("x = data.example.authz.allow"),
		rego.Module("example.rego", module),
	).PrepareForEval(ctx)

	if err != nil {
		log.Fatal(err)
	}

	input := map[string]interface{}{
		"method": "GET",
		"path":   []interface{}{"salary", "bob"},
		"subject": map[string]interface{}{
			"user":   "bob",
			"groups": []interface{}{"sales", "marketing"},
		},
	}

	eval, err := query.Eval(ctx, rego.EvalInput(input))
	if err != nil {
		log.Fatal(err)
	}

	for _, result := range eval {
		fmt.Printf("eval: %+v\n", result) // eval: {Expressions:[true] Bindings:map[x:true]}
	}

}
```

この構成を利用すれば、他の領域にも展開できそうです。

## Open API Spec（Swagger）にポリシーを適用してみる

Open API Specを用いてチームで開発する際、API定義の設定方法で揺れることは無いでしょうか？　以下のようなブログ記事が出るくらい、フューチャーでは設計の揺れを無くす努力をしています。

* [スキーマファースト開発のためのOpenAPI（Swagger）設計規約](/articles/20200409/)

一方でこの手の規約は生み出してしまえば、チェックするのはLinterにやらせたいものです。上記の設計規約の一部をOPAで実装してみたいと思います。Open API SpecはYAML or JSONで記載するので入力としてはOPAにフィットすると思います。

とりあえずルールは上から2つにしぼり、tagsとoperationIdについてのルールを書きます。

* paths/tags
  * 1URIで１つのタグのみ定義する
* paths/operationId
  * {HTTPメソッド}{機能物理名}を記載する
  * キャメルケース

### Rego設計

tagsの数=1を実現するためには[ビルトイン関数](https://www.openpolicyagent.org/docs/latest/policy-reference/#built-in-functions)である `count` を利用します。

```prolog tagsの数チェック
package test

deny_tags_multiple[msg] {
    some path, method
    count(input.paths[path][method].tags) != 1               # タグが複数設定
    msg := sprintf("path(%v) method(%v) tags must keep only one", [path, method])
}

deny_tags_none[msg] {
    some path, method
    object.get(input.paths[path][method], "tags", "none") == "none" # タグが存在しない場合
    msg := sprintf("path(%v) method(%v) tags must keep only one", [path, method])
}
```

operationIdのcamelCaseのチェック方法は、あまり良い手じゃないですが、snake_caseでないことと、最初の1文字が小文字であることだけチェックします（単語の区切りがムズカシイので）。他にも、`split`、`object.get` など多数の組み込み関数を利用しています。

```prolog operationIdのチェック
package test

# アンダースコアが含まれないことをチェック
deny_opeId_snake_case[msg] {
    some path, method
    opeId := input.paths[path][method].operationId

    count(split(opeId, "_")) != 1                           # snake_caseじゃないこと
    msg := sprintf("path(%v) method(%v) operationId must be camelCase: %v", [path, method, opeId])
}

# 最初の1文字が小文字である
deny_opeId_not_camel_case[msg] {
    some path, method
    opeId := input.paths[path][method].operationId

    substring(opeId, 0, 1) != lower(substring(opeId, 0, 1)) # 最初の1文字が小文字
    msg := sprintf("path(%v) method(%v) operationId must be camelCase: %v", [path, method, opeId])
}

# HTTPメソッドから始まっていることチェック
deny_opeId_startwith_http_method[msg] {
    some path, method
    opeId := input.paths[path][method].operationId

    indexof(opeId, method) != 0  # HTTPメソッドから始まっていない
    msg := sprintf("path(%v) method(%v) operationId must be startwith http method: %v", [path, method, opeId])
}
```

これらを1つのファイルとしてまとめて、`policy.rego` に保存しておきます。

### 入力とする Open API Spec

OAIのexamplesを参考に入力となる違反した定義を作成します。

https://github.com/OAI/OpenAPI-Specification/blob/master/examples/v3.0/api-with-examples.yaml

```yml swagger.yml(抜粋）
openapi: "3.0.0"
info:
  title: Simple API overview
  version: 2.0.0
paths:
  /:
    get:
      tags:                             # 🔥tagsが複数
       - v1
       - list
      operationId: list_Versions_v2     # 🔥OperationIdがsnake_case、getから始まっていない
      summary: List API versions
      responses:
        '200':
          description: |-
            200 response
  /v2:
    get:                                 # 🔥tagsが未設定
      operationId: GetVersionDetailsv2   # 🔥大文字始まり
      summary: Show API version details
    put:                                 # 🔥tagsが未設定
      operationId: saveVersionDetailsv2  # 🔥putから始まっていない
      summary: Show API version details

```

これを `input.yml` に保存しておきます。

これを先ほどのRegoモジュールを利用したOPA評価をGoから行います。

### Go実装

先ほど定義したregoとYAMLは外部ファイルから読み込めるようにしておく。今回は雑にハードコードしています。

ほとんど公式ドキュメントに合ったコードと同じで動かせました。

```go linter.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/goccy/go-yaml"
	"github.com/open-policy-agent/opa/rego"
	"io/ioutil"
	"log"
	"os"
)

// This is POC code
func main() {
	ctx := context.Background()

	module, err := readFile("policy.rego")
	if err != nil {
		log.Fatal(err)
	}

	query, err := rego.New(
		rego.Query("x = data"),
		rego.Module("policy.rego", string(module)),
	).PrepareForEval(ctx)

	if err != nil {
		log.Fatal(err)
	}

	yml, err := readFile("input.yml")
	if err != nil {
		log.Fatal(err)
	}

	var input map[string]interface{}
	if err := yaml.Unmarshal(yml, &input); err != nil {
		log.Fatal(err)
	}

	eval, err := query.Eval(ctx, rego.EvalInput(input))
	if err != nil {
		log.Fatal(err)
	}

	for _, result := range eval {
		for _, binding := range result.Bindings {
			body, err := json.MarshalIndent(binding, "", "  ")
			if err != nil {
				log.Fatal(err)
			}
			fmt.Println(string(body))
		}
	}

}

func readFile(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	return ioutil.ReadAll(file)
}
```

全文はこちらにコミットしておきました。参考までに。
https://github.com/laqiiz/openpolicyagent-example

### 実行結果

さきほどのGoのプログラムを動かすと以下のJSONが出力されます！

メッセージは各ルールごとに、コメントが出せています。行番号は出力できていませんが、どのパスでどの関数なのかは指定できるようにしています。

出力結果を見ると、tagsはtagsでまとめて表示するなど、Regoのルールを束ねるなど工夫をすると、もっと扱いやすい結果が作れそうです。

```json
{
  "test": {
    "deny_opeId_not_camel_case": [
      "path(/v2) method(get) operationId must be camelCase: GetVersionDetailsv2"
    ],
    "deny_opeId_snake_case": [
      "path(/) method(get) operationId must be camelCase: list_Versions_v2"
    ],
    "deny_opeId_startwith_http_method": [
      "path(/v2) method(get) operationId must be startwith http method: GetVersionDetailsv2",
      "path(/v2) method(put) operationId must be startwith http method: saveVersionDetailsv2",
      "path(/) method(get) operationId must be startwith http method: list_Versions_v2"
    ],
    "deny_tags_multiple": [
      "path(/) method(get) tags must keep only one"
    ],
    "deny_tags_none": [
      "path(/v2) method(get) tags must keep only one",
      "path(/v2) method(put) tags must keep only one"
    ]
  }
}
```

### その他

利用したのと同じRegoと入力を、PlaygroundでもPublishしておきました。お手軽に触ってみたい人はどうぞ。

https://play.openpolicyagent.org/p/1ZhZasqT22

## まとめ

* Open Policy Agent（OPA）は汎用的なポリシーエンジンで、Policy as Codeの実現を手伝ってくれる
* OPAが利用するRego言語の文法は特徴的（だと大半の人は思うと思う）
* OPAはGoから組み込みライブラリとして呼び出せるので、これを活用したLinterを開発可能

長い記事を最後まで読んでいただき、ありがとうございました！
