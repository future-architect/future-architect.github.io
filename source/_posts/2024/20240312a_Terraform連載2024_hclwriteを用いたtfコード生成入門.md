---
title: "Terraform連載2024 hclwriteを用いたtfコード生成入門"
date: 2024/03/12 00:00:00
postid: a
tag:
  - Terraform
  - コード生成
  - Go
category:
  - DevOps
thumbnail: /images/2024/20240312a/thumbnail.png
author: 真野隼記
lede: "Terraformファイルをコード生成するため、hclwriteというGoパッケージの使い方を調べました。"
---
[Terraform 連載2024](/articles/20240311a/) の2本目の記事です。

## はじめに

TIG真野です。

Terraformファイルをコード生成するため、hclwriteというGoパッケージの使い方を調べました。

## モチベーション

ある複数のリソースをセットで定義する設計開発ルールがあったとします。AWSの例ですが、以下のようにDynamoDBとその監視をCloudwatch Metricsを用いてセットで行いたいとします。

```tf
# DynamoDB
resource "aws_dynamodb_table" "myproduct_read" {
  name         = "${terraform.workspace}-myproduct-read"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "content_id"

  deletion_protection_enabled = true

  attribute {
    name = "user_id"
    type = "S"
  }
  attribute {
    name = "content_id"
    type = "S"
  }
}

# DynamoDBに対して、Cloudwatch Metricsで監視する。例では1件だが複数あるとする
resource "aws_cloudwatch_metric_alarm" "myproduct_read_dynamodb_throttledrequests" {
  alarm_name          = "${aws_dynamodb_table.myproduct_read.name}-ThrottledRequests"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_actions       = aws_sns_topic.myproduct_alert.arn
  dimensions = {
    TableName = aws_dynamodb_table.read.name
  }
}
```

ここではスロットリング数だけを監視していますが、もう1~5個くらい監視したい項目があったとします。この例のように、あるリソースの追加に合わせて整合性を保ちつつ別のリソースを追加することは難しく、抜け漏れがちです。

正攻法だとTerraform module化でしょう。しかし、このケースではモジュール化するにしてはリソース数が少なく、モジュール化すること自体が新規参画した開発者にとって認知負荷が高いことを考えると、もう少しプロダクトが成長して、関連するリソースが増えるかどうかを待ってから対応を考えたいケースもあるでしょう。もちろんチームの方針としてこれくらいでもすぐにモジュール化に取り掛かる場合もあるかと思いますが、チームのTerraform習熟度にバラツキがあり設計パターンを抑えたいなど、様々な背景があったとします。

こうした場面で、あるTerraformで定義したリソース（ここではDynamoDB）をインプットに別のコード（Cloudwatch Metrics）を生成し、モジュール化しなくとも不整合が生じにくい開発フローを整備したいと思います。これでモジュール化の判断を先送りにできますね。

<img src="/images/2024/20240312a/dynamodb_hclwrite.drawio.png" alt="" width="1200" height="631" loading="lazy">

ちなみに、通常、DynamoDBはそこまで数が増えない（ほいほい増えるようであればおそらくDynamoDBを使うべきではない）し、監視項目もそう変更しないだろうから、コード生成もモジュール化しなくても良いんじゃないか？ という意見もあるかと思いますが、それはそれとします。

## 整合性チェック

この回のケースではRego（[Conftest](https://www.conftest.dev/)）を使って整合性チェックを入れるのも有効でしょう。しかし開発チームにRego経験者はほとんど供給され無いと思うので、学習コストが多少なりとも掛かります。また、不整合を検知できるのであれば自動でFixしてくれた方が開発者フレンドリーです。

そのため、この記事では .tf ファイルの自動生成に注目します。

## 利用パッケージ

Terraformの .tf コードをパース、生成する方法として有名なのは、[hashicorp/hcl](https://github.com/hashicorp/hcl) を用いることです。Go言語でインポートしてライブラリとして使えます。HCLはTerraformの.tfファイルが利用するファイルフォーマットのことです。

管理されているパッケージはいくつかあり、以下のようなものが含まれていて、いい感じに使い分けるリテラシーが求められます。

パッケージの概略はthaimさんのZenn記事の[HCLファイルを hashicorp/hcl で読み書きする](https://zenn.dev/thaim/articles/2023-03-go-hcl)が実装もありイメージしやすいです。

ここでも簡単に一覧を載せます。

| Name | Memo |
| -- | -- |
| hclsimple | HCLをGoの構造体にマッピングする、encoding/json 的な高レベルなパッケージです。しかし、拡張子.tf には対応しておらず、全ての.tfファイルに対応していないことを言外に伝えています。 |
| hclparse | HCLファイルをパースして、結果を独自のStructで取得できます |
| hclwrite | HCLファイルを加工するのに適したペッケージです。元のHCLファイルの構造を壊さず、リソースの追加/削除、コメントや属性などの編集を行えます |
| hclsyntax | HCLを解析してASTを作るパッケージです。hclparseなどにも使われています |

今回はTerraformコードの細かい解析は不要であるため、hclwriteパッケージを利用します。

## hclwrite でファイル読み込み

バージョンは `hashicorp/hcl/v2 v2.20.0` を利用します。

まずは.tfファイルを読み込みます。

`hclwrite.ParseConfig()` でパースしたいファイルを指定します。

```go
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclwrite"
)

func main() {
	if len(os.Args) == 1 {
		log.Fatalf("Usage: %s <filepath>\n", os.Args[0])
	}

	hclFilePath := os.Args[1]
	file, err := os.ReadFile(os.Args[1])
	if err != nil {
		log.Fatalf("Usage: %s <filepath>\n", os.Args[1])
	}

	tfFile, diags := hclwrite.ParseConfig(file, hclFilePath, hcl.Pos{Line: 1, Column: 1})
	if diags != nil && diags.HasErrors() {
		log.Fatalf("hclwrite parse: %s", diags)
	}
	if tfFile == nil {
		log.Fatalf("parse result is nil: %s", hclFilePath)
	}

	blocks := tfFile.Body().Blocks()
	referenceNames := make([]string, 0, len(blocks))
	for _, b := range blocks {
		if b.Type() != "resource" || b.Labels()[0] != "aws_dynamodb_table" {
			continue
		}
		referenceNames = append(referenceNames, b.Labels()[1])
	}

	fmt.Println(referenceNames)
}
```

結果の取得は `tfFile.Body().Blocks()` という部分で取得できます。

Blockとはなにかですが、 `resource`、`module`、`locals` のようなTerraform上でインデントをともなうような塊を指します。例えば、`resource "aws_dynamodb_table" "table1" {...}` といった定義が10あれば、for文が10呼ばれます。

次にわかりにくいのが `b.Labels()` の部分です。これは `aws_dynamodb_table`, `table1` といったブロックを開くときに設定されるTerraformのリソースタイプ、リソース名が入ります。

今回はTerraformのリソース名を取得して表示するとします。

次のようなファイルがあるとします。

```tf dynamodb_table.tf
resource "aws_dynamodb_table" "myproduct_read" {
  name         = "${terraform.workspace}-myproduct-read"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "content_id"

  deletion_protection_enabled = true

  attribute {
    name = "user_id"
    type = "S"
  }
  attribute {
    name = "content_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "myproduct_content" {
  name         = "${terraform.workspace}-myproduct-read"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "content_id"

  deletion_protection_enabled = true

  attribute {
    name = "content_id"
    type = "S"
  }
}
```

さきほどのコードを実行すると、Terraformリソース名が取れています。

```sh
$ go run . ../example/dynamodb_table.tf
[myproduct_read myproduct_content]
```

属性を取得するためには、`b.Body().GetAttribute()` などで取得できますので、目的に応じて条件を追加できます。

## 空リソース生成

次に.tfファイルを生成します。

`hclwrite.NewFile()` で初期化し、そこにブロック（Terraformリソース）を追加していきます。

今回は新規コード生成なので、先頭に `// DO NOT EDIT` コメントを追加しましょう。

hclwriteを用いるとコメントを追加する便利な関数は（おそらく）存在しないので、いきなりですがトークンレベルの操作となる、`AppendUnstructedTokens()` を用います。

```go
func main() {
	// 中略

	newFile := hclwrite.NewFile()
	newFile.Body().AppendUnstructuredTokens(hclwrite.Tokens{ // 先頭行にコメント追加
		{
			Type:  hclsyntax.TokenIdent,
			Bytes: []byte("// DO NOT EDIT, MADE BY hclwrite-dynamodb-generator\n"),
		},
	})

	for _, resourceName := range referenceNames {
		newFile.Body().AppendUnstructuredTokens(hclwrite.Tokens{
			{Type: hclsyntax.TokenNewline, Bytes: []byte("\n")}, // 先頭行に改行を入れる
		})
		labels := []string{"aws_cloudwatch_metric_alarm", fmt.Sprintf("dynamodb_throttledrequests_%s", resourceName)}
		newFile.Body().AppendNewBlock("resource", labels)
	}

	out := hclwrite.Format(newFile.BuildTokens(nil).Bytes())
	_, _ = fmt.Fprint(os.Stdout, string(out))
}
```

for 文の中にある、 `AppendNewBlock()` が今回出力したい本丸の、`aws_cloudwatch_metric_alarm` リソースを追加する部分です。

実行すると次のような空リソースが生成されます。

```sh
$ go run . ../example/dynamodb_table_one.tf
// DO NOT EDIT, MADE BY hclwrite-dynamodb-generator

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttledrequests_myproduct_read" {
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttledrequests_myproduct_content" {
}
```

## 属性の追加

`SetAttributeRaw()` を用いて各属性ごとに項目を追加していきます。 `SetAttributeRaw()` は低レベルのAPIで、トークンを直接追加します。今回、`"${aws_dynamodb_table.myproduct_read.name}-throttledrequests"` といったリファレンスを追加したいため利用しています。`SetAttributeValue()` を使う方法だと、 `$` がエスケープされて、 `$$` と出力されてしまうためです。

また、特記したいことは[zclconf/go-cty](https://github.com/zclconf/go-cty) というライブラリの型で値を競ってしないとならないことです。ここでさらに別のライブラリ？ と一瞬焦る気持ちがありますが、慣れていきましょう。

属性の型がオブジェクトであり、その中にリファレンスが入ると、再び `AppendNewBlock()` を呼び出す必要があるなど、生成したい定義によっては試行錯誤する必要があるので、注意してください。

```go
func main() {
	// 中略

    for _, resourceName := range referenceNames {
		newFile.Body().AppendUnstructuredTokens(hclwrite.Tokens{
			{Type: hclsyntax.TokenNewline, Bytes: []byte("\n")}, // 先頭行に改行を入れる
		})
		labels := []string{"aws_cloudwatch_metric_alarm", fmt.Sprintf("dynamodb_throttledrequests_%s", resourceName)}
		resource := newFile.Body().AppendNewBlock("resource", labels).Body()

		// 属性の定義
		resource.SetAttributeRaw("alarm_name", hclwrite.Tokens{
			{
				Type:  hclsyntax.TokenIdent,
				Bytes: []byte(`"${aws_dynamodb_table.myproduct_read.name}-throttledrequests"`),
			},
		})
		resource.SetAttributeValue("comparison_operator", cty.StringVal("GreaterThanOrEqualToThreshold"))
		resource.SetAttributeValue("datapoints_to_alarm", cty.StringVal("1"))
		resource.SetAttributeValue("evaluation_periods", cty.StringVal("1"))
		resource.SetAttributeValue("metric_name", cty.StringVal("ThrottledRequests"))
		resource.SetAttributeValue("namespace", cty.StringVal("AWS/DynamoDB"))
		resource.SetAttributeValue("period", cty.StringVal("60"))
		resource.SetAttributeValue("statistic", cty.StringVal("Maximum"))
		resource.SetAttributeValue("threshold", cty.StringVal("1"))
		resource.SetAttributeTraversal("alarm_actions", hcl.Traversal{
			hcl.TraverseRoot{Name: "aws_sns_topic"},
			hcl.TraverseAttr{Name: "myproduct_alert"},
			hcl.TraverseAttr{Name: "arn"},
		})
		dimensions := resource.AppendNewBlock("dimensions", nil).Body()
		dimensions.SetAttributeTraversal("TableName", hcl.Traversal{
			hcl.TraverseRoot{Name: "aws_dynamodb_table"},
			hcl.TraverseAttr{Name: "myproduct_read"},
			hcl.TraverseAttr{Name: "name"},
		})
	}

	out := hclwrite.Format(newFile.BuildTokens(nil).Bytes())
	_, _ = fmt.Fprint(os.Stdout, string(out))
}
```

これを実行すると次のようにTerraformコードが生成されます。

```sh
$ go run . example/dynamodb_table_one.tf
// DO NOT EDIT, MADE BY hclwrite-dynamodb-generator

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttledrequests_myproduct_read" {
  alarm_name          = "${aws_dynamodb_table.myproduct_read.name}-throttledrequests"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_actions       = aws_sns_topic.myproduct_alert.arn
  dimensions {
    TableName = aws_dynamodb_table.myproduct_read.name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttledrequests_myproduct_content" {
  alarm_name          = "${aws_dynamodb_table.myproduct_read.name}-throttledrequests"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  datapoints_to_alarm = "1"
  evaluation_periods  = "1"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_actions       = aws_sns_topic.myproduct_alert.arn
  dimensions {
    TableName = aws_dynamodb_table.myproduct_read.name
  }
}
```

hclwriteパッケージ自体は文法チェックを行いません。そのため　`alarm_actions = aws_sns_topic.myproduct_alert.arn` としれっと存在しないリソースを参照してもエラーにはなりません。

説明を省きましたが `hclwrite.Format()` でフォーマットをかけられるので、お手軽です。

今回使用したコードの全量は↓のリポジトリにコミットしています。

https://github.com/ma91n/hclwrite-dynamodb

## hclwriteパッケージを利用すべきか

究極的には生成したいTerraformコードがどのようなものであるかに依存しますが、あるTerraformコードを読み取って別のファイルを生成するだけであれば、hclwriteパッケージを用いてもそれほど難しくはありません。

今回の内容であれば、パース部分もHCLの構造を無視し、スクラッチで解析しても良さそうなレベルではあります。しかし、複数のリソースタイプが混ざったり、ある属性の条件でのみを対象としたいといった拡張はしばしばありえるので、こういったライブラリを用いてパースすると良いでしょう。

一方で生成側です。今回の用途だと、既存ファイルの更新ではなく新規生成です。しかも成果物の構造のシンプル。この場合は、`hclwrite` の仕様を学んでゴリッと出力するより、Go Templateなどお好きなてプレートエンジンで生成するほうが遥かにメンテナンスがしやすいいと思います。HCLのフォーマットだけは使っても良いかもしれませんが、全てをhclwriteで閉じて生成するのは、出力がこれだけであれば割に合わない気がしました。

`hclwrite` ですが主な用途はすでに存在するTerraformのコードを破壊せず、一律でタグを付けたり属性を変えたりといった用途に向いているパッケージのようです。

## 最後に

hclwriteというパッケージを用いてあるTerraformリソースから、別のリソースを生成しました。新規生成については別のテンプレートエンジンを利用する方が良いかなと個人的には思います。

こういった開発フローは少し特殊で、通常はTerraformモジュール化などを試みると思いますが、モジュール化するにしてはリソース対象が少なく、ちょっと抽象度が弱いんだよな～といった場面では、コード生成案も考えてみても良いのではないでしょうか。
