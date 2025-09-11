---
title: "超薄いGoのCLI作成パッケージ google/subcommands 入門"
date: 2023/10/20 00:00:00
postid: a
tag:
  - Go
  - CLI
category:
  - Programming
thumbnail: /images/2023/20231020a/thumbnail.png
author: 真野隼記
lede: "Google Go Coding Guideで紹介されていたgoogle/subcommandsについて理解を深めて行こうと思います。"
---

<img src="/images/2023/20231020a/subcommands.png" alt="" width="491" height="213">

## はじめに

TIG真野です。育休明けです。

GoでCLI（コマンドラインインタフェース）の開発に役立つツールといえばいくつか選択肢があります。大きく分ければフラグのパースを支援するもの（[標準のflagパッケージ](https://pkg.go.dev/flag)、[alecthomas/kong/go-flags](https://github.com/jessevdk/go-flags)、[alecthomas/kong](https://github.com/alecthomas/kong)など）と、開発フレームワークと言っても良い包括的に支援するもの（[urfave/cli](https://github.com/urfave/cli)、[spf13/cobra](https://github.com/spf13/cobra)など）の2つに分けられるかなと思います（※概念的に分けてみただけで捉え方によっては全てパーサだしフレームワークとみなしても良いかもしれません。あくまで個人的なイメージです）。

私は `urfave/cli` を利用することが多いのですが、`spf13/cobra` も人気ですよね。どちらも広く利用されていますが、支配的と言った感じではなく、例えば私がよく用いるterraformコマンドは[mitchellh/cli](https://github.com/mitchellh/cli)という[ライブラリが使われていました](https://github.com/hashicorp/terraform/blob/main/main.go#L29C3-L29C27)し、Go製のテンプレートエンジンで有名なHugoは、Hugoの要件にフィットするように[bep/simplecobra](https://github.com/bep/simplecobra)というライブラリを開発しているようでした。Protocol Bufferのprotocコマンドに至っては[標準パッケージのflag](https://github.com/golang/protobuf/blob/master/protoc-gen-go/main.go#L32)を使っています。気に入ったのを好きに使えば良いんだ感があります。

## subcommands

そんな中、今回取り上げるのは[google/subcommands](https://github.com/google/subcommands) です。

私がこの存在を認識したのは、[Google Go Coding Guide](https://google.github.io/styleguide/go/) のベストプラクティス編の[complex-command-line-interfaces](https://google.github.io/styleguide/go/best-practices#complex-command-line-interfaces)に記載されているのを読んだことがキッカケです。

その部分を引用＋意訳します。

- `kubectl create`、`kubectl run` といったサブコマンドを含むCLI開発の場合は、シンプルで正しく利用しやすい `subcommands` がお勧め
- `subcommands` が提供されていない機能を求める場合は`cobra`がお勧め

`subcommands` は開発元がGoogleだけあって推しを感じますね（なお、READMEには "This is not an official Google product（「Google公式プロダクトじゃないよ」）" とあります）。。ちなみに、`kubectl` は`cobra`を使っています。さらに余談ですが、 `docker` コマンドも `cobra` で開発されています。

Goのコーディング規約として、`Google Coding Guide` には今後少なからず影響を受けていくと思うので、 `subcommands` について理解を深めようと思います。

## subcommands を使っているプロダクト

subcommandsのGoDocにある[importedby](https://pkg.go.dev/github.com/google/subcommands?tab=importedby)から調べると、[wire](https://github.com/google/wire)、[gvisitor](https://github.com/google/gvisor)、[vuls](https://github.com/future-architect/vuls)などのプロダクトなどがsubcommandsを利用しています。Vuls、お前もそうだったのか。

importbyはForkされたリポジトリ数も拾われますし、スター数で絞れるわけではないので単純化できませんが、2023.10.13時点でsubcommandsは628パッケージインポートされていました。ちなみに、cobraは9.4万、urfave/cliは1.4万で桁違いでした。擁護するわけではないですがsubcommandsの公開が2019年2月（1.0.0のRelease日）と比較的新しいことがあるかもしれません（cobra v0.0.1の2017年10月、urfave/clin v0.0.1の2013年6月。どのバージョンと比較するのが適切か難しいですが）。

## 使ってみた

subcommandsですが、利用ガイド的なものは見当たらなく、[README.md](https://github.com/google/subcommands)も色気は無いですが、実装は[subcommands.go](https://github.com/google/subcommands/blob/master/subcommands.go)のみ（！）で、こちらが500行程度と、とても薄いライブラリだという事がわかります。この薄さが魅力だと感じるかどうかがsubcommandsを使う判断ポイントな気がします。READMEにはprintコマンドのサンプルが載っていますが、少しだけオリジナリティを出すため簡単なオプションを追加したクリップボードを読み取り/書き込みする簡単なツールを作ります。

なお、クリップボードを操作するためのパッケージは[golang-design/clipboard](https://github.com/golang-design/clipboard)を使いました。

最初に、`printCmd`、`writeCmd` を実装していきます。実装すべきは `Name()`、`Synopsis()`、 `Usage()`、`SetFlags()`、`Execute()` です。`Name()`、`Synopsis()`、 `Usage()` はヘルプメッセージに用いるメソッドで、実態は `SetFlags()`、`Execute()` の2種類です。シンプルですね。

```go commands.go
package main

import (
	"bufio"
	"bytes"
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/google/subcommands"
	"golang.design/x/clipboard"
)

type printCmd struct {
	num  int
	trim bool
}

func (*printCmd) Name() string     { return "print" }
func (*printCmd) Synopsis() string { return "Print clipboard to stdout." }
func (*printCmd) Usage() string {
	return `print [-n number] [-trim]:
  Print clipboard content.
`
}

func (p *printCmd) SetFlags(f *flag.FlagSet) {
	f.IntVar(&p.num, "n", 0, "display within particular line number")
	f.BoolVar(&p.trim, "trim", false, "enable trimming space chars")
}

func (p *printCmd) Execute(_ context.Context, f *flag.FlagSet, _ ...any) subcommands.ExitStatus {
	err := clipboard.Init()
	if err != nil {
		log.Printf("[clip] %v\n", err)
		return subcommands.ExitFailure
	}

	reader := bufio.NewReader(bytes.NewReader(clipboard.Read(clipboard.FmtText)))
	for i := 0; ; i++ {
		if p.num != 0 && i == p.num {
			break
		}
		line, _, err := reader.ReadLine()
		if err == io.EOF {
			break
		} else if err != nil {
			log.Printf("[clip] %v\n", err)
			return subcommands.ExitFailure
		}

		out := string(line)
		if p.trim {
			out = strings.TrimSpace(out)
		}
		fmt.Println(out)
	}

	return subcommands.ExitSuccess
}

type writeCmd struct{}

func (*writeCmd) Name() string     { return "write" }
func (*writeCmd) Synopsis() string { return "Write to clipboard" }
func (*writeCmd) Usage() string {
	return `write [text]:
  Write to clipboard.
`
}

func (p *writeCmd) SetFlags(_ *flag.FlagSet) {}

func (p *writeCmd) Execute(_ context.Context, f *flag.FlagSet, _ ...any) subcommands.ExitStatus {
	err := clipboard.Init()
	if err != nil {
		log.Printf("[clip] %v\n", err)
		return subcommands.ExitFailure
	}
	clipboard.Write(clipboard.FmtText, []byte(strings.Join(f.Args(), "\n")))
	return subcommands.ExitSuccess
}
```

宣言した、`printCmd`, `writeCmd` を `subcommands` パッケージに登録します。

```go main.go
package main

import (
	"context"
	"flag"
	"os"

	"github.com/google/subcommands"
)

func main() {
	subcommands.Register(subcommands.HelpCommand(), "")
	subcommands.Register(subcommands.FlagsCommand(), "")
	subcommands.Register(subcommands.CommandsCommand(), "")
	subcommands.Register(&printCmd{}, "")
	subcommands.Register(&writeCmd{}, "")

	flag.Parse()
	ctx := context.Background()
	os.Exit(int(subcommands.Execute(ctx)))
}
```

これをビルドして、ヘルプコマンドを表示します。

```sh
$ go build -o subclip .
$ subclip help
Usage: subclip <flags> <subcommand> <subcommand args>

Subcommands:
commands         list all command names
flags            describe all known top-level flags
help             describe subcommands and their syntax
print            Print clipboard to stdout.
write            Write to clipboard
```

見ると分かる通り、`Name()` で宣言したコマンドの一覧と `Synopsis()` で書いた説明が表示されます。`commands`, `flags`, `help` は `subcommands` パッケージに予め宣言されたコマンドたちで、main関数内で登録しています。特にhelpは必須かなと思います。

さて、printにはオプションを2つ追加しています。どうやって確認するのでしょうか。答えはflagsかhelp の引数に、オプションを確認したいコマンド名を渡す必要があります。

```sh オプションを確認
$ subclip flags print 
  -n int
        display within particular line number
  -trim
        enable trimming space chars

$ subclip help print
print [-n number] [-trim]:
  Print clipboard content.
  -n int
        display within particular line number
  -trim
        enable trimming space chars
```

こうしてみると、 `flags` は `help` に包含されている内容であるため、コマンドラインとして用意しなくても良い気がしますね（wireなんかはすべて登録しているので、subcommandsを利用する場合はすべて登録する流れかもしれませんが）。

続いて予め用意された`commands` ですが、これはコマンドの一覧を表示します。`help` で詳細を確認するとその通りの内容です（どのようなケースで嬉しいのかいまいち掴みきれませんが）。

```sh
$ subclip commands
help
flags
commands
print
write

$ subclip help commands 
commands:
        Print a list of all commands.
```

`help` と `commands` の並び順も異なるのが気になりましたが、、おそらく仕様なのでしょう。

## `help` でサブコマンドのオプションを表示する。

利用頻度が高く重要なオプションは、 `help` コマンドで表示してほしいことも多いと思います。`subcommands.ImportantFlag()` が対応してくれそうですが、これはトップレベルのフラグにしか対応していないようです（awscli で言えば、 --profile などの全コマンドに適用するオプションのイメージ）。
そのため、必要であれば、 `Synopsis()` に利用例を書くなどの工夫が必要そうです。

## グループ化

subcommandsに登録する際、第2引数にgroup名を登録することが可能です。以下の様に書き換えます。

```diff
func main() {
-	subcommands.Register(subcommands.HelpCommand(), "")
-	subcommands.Register(subcommands.FlagsCommand(), "")
-	subcommands.Register(subcommands.CommandsCommand(), "")
+	subcommands.Register(subcommands.HelpCommand(), "help")
+	subcommands.Register(subcommands.FlagsCommand(), "help")
+	subcommands.Register(subcommands.CommandsCommand(), "help")
-	subcommands.Register(&printCmd{}, "")
-	subcommands.Register(&writeCmd{}, "")
+	subcommands.Register(&printCmd{}, "main")
+	subcommands.Register(&writeCmd{}, "main")
	// 省略
```

そうすると `help` メッセージを出すときにグルーピングが行われます。類似性の高いサブコマンドごとに設定すると便利かもしれません。

```sh
$ subclip help     
Usage: subclip <flags> <subcommand> <subcommand args>

Subcommands for help:
        commands         list all command names
        flags            describe all known top-level flags
        help             describe subcommands and their syntax

Subcommands for main:
        print            Print clipboard to stdout.
        write            Write to clipboard
```

## サブコマンドのエイリアス

サブコマンドのエイリアスもつけることができます。 `subcommands.Alias()` を利用すればいけました。

```diff
func main() {
    // 省略
	subcommands.Register(&printCmd{}, "main")
	subcommands.Register(&writeCmd{}, "main")
+	subcommands.Register(subcommands.Alias("p", &printCmd{}), "main")
+	subcommands.Register(subcommands.Alias("w", &writeCmd{}), "main")
```

ヘルプメッセージにも表現されています。

```sh
$ subclip help
Usage: subclip <flags> <subcommand> <subcommand args>

Subcommands for help:
        commands         list all command names
        flags            describe all known top-level flags
        help             describe subcommands and their syntax

Subcommands for main:
        print, p         Print clipboard to stdout.
        write, w         Write to clipboard
```

利用頻度が高そうだと思いました。

## サブコマンドのサブコマンド

[Goでsubcommandsを使う - yunomuのブログ](https://yunomu.hatenablog.jp/entry/2020/06/16/170027) にかかれている通り、`subcommands.Commander` を自前で重ねることでN階層にネストしたコマンドを作れるそうです。READMEに実装例が無かったので実現できないと私は最初、勘違いしていました。おそらく勘違いしやすいポイントなので、覚えておくと良いと思います。

## その他の機能

以下のような機能は無さそうでした。

フラグのパースは標準パッケージのflagを用いているため、同様の壁がある。

- `--number`, `-n` のような、ロング・ショートバージョンのオプション
  - フラグのパースは、標準パッケージのflagを使っているため、必要であれば自前で実装する必要があります
- 環境変数からオプション指定、上書き
  - 標準パッケージのflagを用いているため、必要であれば自前で実装する必要があります

コマンドのtypoから一番近いコマンドを提案するような機能。

- `subclip wite` じゃなくて、`subclip write` みたいな提案をする機能は無いです
  - 存在しないコマンドを指定した場合、 `help` が表示されます

## まとめ

subcommandsは非常に薄く、シンプルであるため機能を特化したCLIツールを作るのに適していると思います。また、subcommandsの[go.mod](https://github.com/google/subcommands/blob/master/go.mod) を見ると3rdパーティパッケージの依存がゼロなため依存先のパッケージのアップデートで壊れるといったことが無いため安定的で、おそらくバイナリサイズも小さくできると思います（こちらは誤差レベルでしょうが）。

その割にはコマンドのエイリアスや階層化できたりとパワフルなところもあり、リッチに作り込むこともできます。

オプションのショート・ロングバージョンの準備や、環境変数とのマージなど、細かな作り込みを不要とできるのであれば採用してみても良いのではないでしょうか。

## 参考

- https://osinet.fr/go/en/articles/cli-google-subcommands/#13-passing-non-cli-arguments-to-commands
- https://osinet.fr/go/en/articles/cli-google-subcommands/
