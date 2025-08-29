---
title: "protoファイルからコードを自動生成するprotocのプラグインの作り方"
date: 2024/06/04 00:00:00
postid: a
tag:
  - gRPC
  - ProtocolBuffers
category:
  - Programming
thumbnail: /images/2024/20240604a/thumbnail.jpg
author: 関靖秀
lede: "protocのプラグインについて深掘りしました。Protocol Buffers概観"
---
# はじめに

関です。以前、[grpc-gatewayでgRPCとREST両対応のサーバを作る](/articles/20220624a/)を書きました。その記事でほんの少し触れていたprotocのプラグインについて深掘りします。

内容は以下です。

- Protocol Buffers概観
- proto compiler(protoc)とそのプラグインがコードを生成する仕組み
- protocのプラグインをgolangで実装する方法

# Protocol Buffers概観

Protocol Buffersは、構造化データをシリアライズするための拡張可能な機構です。言語やプラットフォームに対して中立であるため、拡張機能が対応する範囲で様々なプログラミング言語やプラットフォームに対応できます。また、自分で拡張機能を用意することで対応範囲を広げることもできます。

イメージとしては、JSONに近く、Protocol Buffersで定義した構造化データはJSONと相互に変換可能なのですが、シリアライズ結果はJSONに比べてコンパクトな代わりに、データの解釈には事前にシリアライズやデシリアライズの方法を知っておく必要があるのが大きな違いです。

用途として最も有名なものはgRPCにおけるIDL(Interface Definition Language)でしょう。これ以外にも、レコードライクで型付きの構造化データをシリアライズし、言語やプラットフォームに依存しない形で利用可能にしたいというようなユースケースにはフィットします。

Protocol Buffersを利用する際の基本的なワークフローは以下です。

- データ構造を定義する.protoファイルを作成する
- 作成した.protoファイルを入力にして、proto compiler(protoc)を起動、コードを生成する
- 生成されたコードを使ってプロジェクトのコードを実装

先ほど触れた、シリアライズやデシリアライズの方法が、proto compilerが生成するコードの中に含まれているイメージです。

# proto compiler(protoc)とそのプラグインがコードを生成する仕組み

## 全体の流れ

<img src="/images/2024/20240604a/overview.jpg" alt="overview.jpg" width="691" height="321" loading="lazy">

まず、簡単な例を使って、全体の流れを説明します。`protoc-gen-myplugin`というプラグインを使ってコードを生成したいと仮定します。また、コンパイルの対象ファイルは`example1.proto`, `example2.proto`の2つであるとして、コンパイル結果の出力先ディレクトリは`out`ディレクトリであるとします。この時、protocの呼び出しは以下のように行います。

```sh
protoc --myplugin_out=out example1.proto example2.proto
```

上記のコマンドが実行されると、protocはコンパイル対象が`example1.proto`, `example2.proto`の2つであること、オプションの`myplugin_out`から利用プラグインが`protoc-gen-myplugin`であることと、そのプラグインの出力先ディレクトリが`out`であることを把握します（※プラグインは、`protoc-gen-${NAME}`という名前でPATH上に配置されている必要があり、protocがプラグインを使う時には`-${NAME}_out`というオプションで出力先ディレクトリを指定する必要があります）。その後、コンパイル対象ファイルとその依存先ファイルを解析し、その結果を[CodeGeneratorRequest](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto#L43)に詰めます。次に、利用プラグインを呼び出した上で、その標準入力に解析結果であるCodeGeneratorRequestをシリアライズしたバイト列を書き込みます。プラグインは書き込まれたCodeGeneratorRequestをデシリアライズの上、自身の処理を実行し、実行結果を[CodeGeratorResponse](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto#L83)に詰め、シリアライズしたバイト列を標準出力に書き込みます。protocはプラグインの実行結果であるCodeGeratorResponseを受け取ったら、そこに書かれている指示を元にファイルを生成します。

次に、プラグインに対して何らかのパラメータを渡すケースを見てみます。下記はいずれも同じ意味になります。

```sh
# ${NAME}_opt オプションを使って渡す。
protoc --myplugin_out=gen --myplugin_opt=param1=foo1,param2=foo2 proto/example1.proto

# ${NAME}_out オプションに含めて渡す。
protoc --myplugin_out=param1=foo1,param2=foo2:gen proto/example1.proto
```

ここで渡すパラメータは、コマンドライン引数ではなく、`CodeGeneratorRequest`の`pamrameter`フィールドに、`param1=foo1,param2=foo2`という文字列が設定されて渡されます。このため、実際に利用する際にはこの文字列を解析する必要があります。

## protocのプラグインに対する要件

以上を踏まえると、以下のような要件を満たすように実装すればprotocのプラグインとして動作させられることがわかります。

- 標準入力からバイト列を読み取り、それを[CodeGeneratorRequest](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto#L43)として解釈できること
- 解釈したCodeGeneratorを元に、自身の処理結果を[CodeGeratorResponse](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto#L83)に詰め、シリアライズしたバイト列を標準出力に書き込むこと
- PATH上に`protoc-gen-${NAME}`というファイル名で配置されていること

以上から、protocのプラグインは言語に依存せず実装ができ、GoのプラグインはGoで、C++のプラグインはC++でといった実装が可能な仕組みになっています。

# protocのプラグインをGoで実装する方法

## ナイーブな実装

[CodeGeneratorRequest](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto#L43)や[CodeGeratorResponse](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto#L83)のコンパイル結果は、Goだと`google.golang.org/protobuf/types/pluginpb`パッケージ（[公式ドキュメント](https://pkg.go.dev/google.golang.org/protobuf/types/pluginpb)）に含まれています。

この方針での実装方法については他記事の[protocプラグインの書き方](https://qiita.com/yugui/items/87d00d77dee159e74886)が詳しいのでそちらを参照していただけたらと思います。

## プラグイン実装用のライブラリを使った実装

上記の方針に則っても良いのですが、実際にコード生成をしようとすると、依存パッケージをimportしたり、protoファイルのsnake_caseからGoファイルで利用するCamelCaseへの変換が必要だったりと、全てを自分でやるのはいささか面倒です。

Goの場合、プラグイン実装に便利な,`google.golang.org/protobuf/compiler/protogen`というライブラリ（[公式ドキュメント](https://pkg.go.dev/google.golang.org/protobuf/compiler/protogen)）が整備されています。このライブラリは、標準のプラグインである`protoc-gen-go`や`protoc-gen-go-grpc`の[実装](https://github.com/golang/protobuf/blob/master/protoc-gen-go/main.go)、`protoc-gen-grpc`の[実装](https://github.com/grpc-ecosystem/grpc-gateway/blob/main/protoc-gen-grpc-gateway/main.go)や`protoc-gen-connect-go`の[実装](https://github.com/connectrpc/connect-go/blob/main/cmd/protoc-gen-connect-go/main.go)でも利用されている実績あるものです。今回はこちらを使って典型的なプラグインの構造を説明します。

### プラグイン実装のアウトライン

```go
package main

import (
	"flag"
	"log"

	"google.golang.org/protobuf/compiler/protogen"
)

func main() {
	// CodeGeneratorRequestからパラメータを読み出すための変数.
	flags := flag.NewFlagSet("", flag.ContinueOnError)
	param1 := flags.String("param1", "default", "")
	param2 := flags.String("param2", "default", "")

	opt := protogen.Options{
		// ParamFuncは, opt.Runした際にCodeGeneratorRequestのparameterごとに呼び出される.
		// これにより, 前段で宣言していた変数に値がセットされる.
		ParamFunc: flags.Set,
	}

	opt.Run(func(plugin *protogen.Plugin) error {
		// ここの処理が実行されるタイミングでは、paramに値がセット済み.
		// 行末コメントは以下コマンド実行時の標準エラー出力.
		// protoc --myplugin_out=gen --myplugin_opt=param1=foo1,param2=foo2,module=github.com/sayshu-7s/protoc-gen-myplugin/gen proto/example1.proto
		log.Print(*param1) // foo1
		log.Print(*param2) // foo2

		for _, f := range plugin.Files {
			// protoファイルごとの処理
			// 引数で渡したファイル以外に, その依存先のprotoファイルもFilesには含まれる.
			// トポロジカルソートされているため, あるファイルが依存している先は必ずそのファイルより先に現れる.

			if f.Generate {
				// 引数で指定したファイルが生成対象とされ, f.Generate == trueとなっている.
				outFile := plugin.NewGeneratedFile(f.GeneratedFilenamePrefix+".myplugin.go", f.GoImportPath)
				if _, err := outFile.Write([]byte(`// Code generated by protoc-gen-myplugin. DO NOT EDIT.
				package ` + f.GoPackageName + "\n")); err != nil {
					return err
				}
				// TODO: 生成先ファイルへの書き込み.
			}
		}

		return nil
	})
}
```

CodeGeneratorRequestに含まれているプラグインに渡されるパラメータは、main関数冒頭のように, `flag.FlagSet`を使うことで変数に読み出すことができます。

実際にコードを生成する処理は、`opt.Run()`に渡した関数の中で指定します。ここで渡されてくる`plugin`には、生の`CodeGeneratorRequest`や、そこから読み出した情報を元にGoのコードの生成に便利な機能を追加した様々な構造体が含まれています。ファイルの生成は、`plugin.NewGeneratedFile()`ででき、生成した`outFile`に対して, Writeすると、あとはpluginがCodeGeneratorResponseに変換してよしなにやってくれる仕組みになっています。

TODOの箇所では、`template`パッケージなどを使って必要なコードを生成し、書き込むと良いでしょう。ライブラリの機能を使うことで、importなどが楽に行えます。

### 実装例

簡単な実装例を[protoc-gen-myplugin](https://github.com/sayshu-7s/protoc-gen-myplugin)として解説コメント付きで実装しました。このプラグインは、protoファイルに含まれるMessageから、その名前をPrintするだけの簡単な関数が書かれたコードを生成し、その際に渡されてきたCodeGeneratorRequestをJSONとして生成する機能があります。

`proto`ディレクトリにサンプルのprotoファイルを、`gen`ディレクトリにコンパイル結果を配置しています。中身を確認するとprotocが行なっている解析がどのようなものかのイメージが掴みやすくなると思います。

また、Makefileに記載してある`make install`でプラグインのインストールが、`make gen`でコードの生成ができます。コマンドのインストール先が`PATH`に含まれる必要があることに注意してください。`proto`ファイルに自前のprotoファイルを作成し、`CondeGeneratorRequest`に何が入るのか確認してみるとプラグインを自作する際に便利かもしれません。

# おわりに

protocのプラグインを全体像と、Goの実践的な実装で利用されるライブラリを紹介しました。

ナイーブな実装について解説する記事はあったものの、より実践的なライブラリについて触れられている記事はあまりなかったのでこの記事を書きました。プラグイン実装する際の参考になれたら幸いです。

# 参考

- [Protocol Buffers公式](https://protobuf.dev)
- protocが利用するMessageの定義情報と、そのコンパイル結果を含むgolangライブラリ
  - [plugin.proto](https://github.com/protocolbuffers/protobuf/blob/v27.0/src/google/protobuf/compiler/plugin.proto)
  - [google.golang.org/protobuf/types/pluginpb](https://pkg.go.dev/google.golang.org/protobuf/types/pluginpb)（plugin.protoのコンパイル結果を含むgolangライブラリの公式ドキュメント）
- プラグイン実装に利用可能なより実践的なgolangライブラリ
  - [google.golang.org/protobuf/compiler/protogen](https://pkg.go.dev/google.golang.org/protobuf/compiler/protogen)
- [protocプラグインの書き方](https://qiita.com/yugui/items/87d00d77dee159e74886)
