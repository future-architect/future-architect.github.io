---
title: "Terraformの実装コードを、動かしながら読む"
date: 2024/03/26 00:00:00
postid: a
tag:
  - Terraform
  - CodeReading
  - Go
  - Copilot
category:
  - Programming
thumbnail: /images/20240326a/thumbnail.png
author: 棚井龍之介
lede: "Terraform 連載ということで、そういえば、実装コードは Go で書かれていたな、コマンドの使い方はインフラエンジニアの皆様が書いてくれるはずなので、コードリーディングしようかな"
---
<img src="/images/20240326a/top.png" alt="" width="800" height="539">

[Terraform連載2024](/articles/20240311a/) の10本目記事です。

# はじめに

こんにちは。CSIG（Cyber Security Innovation Group）の棚井です。

Terraform 連載ということで

* そういえば、実装コードは Go で書かれていたな
* コマンドの使い方はインフラエンジニアの皆様が書いてくれるはずなので、コードリーディングしようかな

との考えに至り、ソースコードリーディング自体をブログ化しました。
参考になる点が1つでもあれば幸いです。

# エディタの準備

今回のコードリーディングでは VSCode を利用します。

Go のコードジャンプやテスト実行のため、以下の拡張機能を追加します。

* [Go](https://marketplace.visualstudio.com/items?itemName=golang.go)
* [Go Outliner](https://marketplace.visualstudio.com/items?itemName=766b.go-outliner)
* [Go Test Explorer](https://marketplace.visualstudio.com/items?itemName=premparihar.gotestexplorer)

また、コードリーディングのお供として「GitHub Copilot」も追加します。
GitHub アカウントで Copilot を有効化する方法や、VSCode の拡張機能とリンクする方法については、ネット上に多数情報がありますのでそちらをご参照ください。（ex. [GitHub Copilot のドキュメント](https://docs.github.com/ja/copilot)）

* [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
* [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)

「コードリーディングで生成系AIを使うの？」という疑問を持たれた方向けへの回答として、GitHub Copilotには「コード生成機能」以外に、「コードの説明機能」があります。

使い方としては、

1. 解説して欲しいコードをハイライトする
1. `Ctrl + i` によりCopilotのポップアップを表示する
1. `/explain`を入力する

の3ステップで利用可能です。

VSCodeで表示されている実コードベースで解説してくれますので、途中に詰まる部分があったとしても、Copilotのサポートにより大抵は独力で解決可能です。OSSのコードリーディングでは、まさにこの解説機能が非常に便利だと感じています。

# 実行環境の準備

コードリーディング中には「実際に動かしてみないと、イメージがつきにくい処理」が見つかります。いざという時にローカル環境で動かせるように、Terraformのビルド、動作検証が可能な環境を準備します。

ソースコードはこちらの [hashicorp/terraform](https://github.com/hashicorp/terraform/tree/main) リポジトリに公開されています。
Goのバージョンを確認したところ、トップディレクトリ配下の [`.go-version`](https://github.com/hashicorp/terraform/blob/main/.go-version) に `1.22.1`（執筆時点）と記載されていることを確認しました。

執筆時点での [Go All releases](https://go.dev/dl/) も `1.22.1` なので、最新のGoバージョンに対応していることが分かります。

> == 宣伝 ==
> FutureではGoリリース連載を実施しております。
> [Go 1.22リリース連載始まります](https://future-architect.github.io/articles/20240129a/)
> [Goリリースノートから技術ブログを書く流れ基礎](https://future-architect.github.io/articles/20240307a/)

リポジトリ側でGoのバージョンが指定されているので、ローカル環境もそれに合わせて構築します。

ちなみに、私は [asdf](https://asdf-vm.com/) を利用して開発言語のバージョン管理を行っています。asdf の利用方法は、左記の公式ドキュメント、および、こちらの解説記事（[asdf で開発言語と利用ツールのバージョン管理](https://qiita.com/RuyPKG/items/d4ea8baab1e0a17ae927)）をご覧ください。

`$ go version` 実行時に、`1.22.1` が表示されていれば、実行環境の準備は完了です。

```sh
$ go version
go version go1.22.1 linux/amd64
```

# リポジトリの取得、テスト実行

それではさっそく、Terraform のソースコードを取得していきます。
といっても、ここでは [hashicorp/terraform](https://github.com/hashicorp/terraform/tree/main) リポジトリをクローンするだけです。

クローンに成功したら、まずはテストに通過するかを確認します。

<details>
<summary>テスト実行ログ</summary><div>

```sh
$ cd terraform/

$ go test ./...
?       github.com/hashicorp/terraform/internal/backend [no test files]
ok      github.com/hashicorp/terraform  0.065s
ok      github.com/hashicorp/terraform/internal/addrs   0.030s
ok      github.com/hashicorp/terraform/internal/backend/backendbase     0.007s
ok      github.com/hashicorp/terraform/internal/backend/backendrun      0.009s
ok      github.com/hashicorp/terraform/internal/backend/init    0.051s
?       github.com/hashicorp/terraform/internal/cloudplugin/cloudproto1 [no test files]
?       github.com/hashicorp/terraform/internal/cloudplugin/mock_cloudproto1    [no test files]
ok      github.com/hashicorp/terraform/internal/backend/local   6.211s
ok      github.com/hashicorp/terraform/internal/backend/remote  4.009s
ok      github.com/hashicorp/terraform/internal/backend/remote-state/http       7.266s
ok      github.com/hashicorp/terraform/internal/backend/remote-state/inmem      0.010s
ok      github.com/hashicorp/terraform/internal/builtin/providers/terraform     0.150s
ok      github.com/hashicorp/terraform/internal/builtin/provisioners/file       0.008s
ok      github.com/hashicorp/terraform/internal/builtin/provisioners/local-exec 0.196s
ok      github.com/hashicorp/terraform/internal/builtin/provisioners/remote-exec        2.050s
ok      github.com/hashicorp/terraform/internal/checks  0.060s
?       github.com/hashicorp/terraform/internal/command/jsonformat/collections  [no test files]
?       github.com/hashicorp/terraform/internal/command/jsonformat/computed     [no test files]
?       github.com/hashicorp/terraform/internal/command/jsonformat/jsondiff     [no test files]
?       github.com/hashicorp/terraform/internal/command/jsonformat/structured   [no test files]
?       github.com/hashicorp/terraform/internal/command/testing [no test files]
?       github.com/hashicorp/terraform/internal/e2e     [no test files]
?       github.com/hashicorp/terraform/internal/experiments     [no test files]
?       github.com/hashicorp/terraform/internal/getmodules      [no test files]
?       github.com/hashicorp/terraform/internal/grpcwrap        [no test files]
?       github.com/hashicorp/terraform/internal/lang/langrefs   [no test files]
?       github.com/hashicorp/terraform/internal/lang/marks      [no test files]
?       github.com/hashicorp/terraform/internal/lang/types      [no test files]
?       github.com/hashicorp/terraform/internal/modsdir [no test files]
?       github.com/hashicorp/terraform/internal/plans/planproto [no test files]
?       github.com/hashicorp/terraform/internal/plugin/mock_proto       [no test files]
?       github.com/hashicorp/terraform/internal/plugin6/mock_proto      [no test files]
?       github.com/hashicorp/terraform/internal/provider-simple [no test files]
?       github.com/hashicorp/terraform/internal/provider-simple/main    [no test files]
?       github.com/hashicorp/terraform/internal/provider-simple-v6      [no test files]
?       github.com/hashicorp/terraform/internal/provider-simple-v6/main [no test files]
?       github.com/hashicorp/terraform/internal/provider-terraform/main [no test files]
ok      github.com/hashicorp/terraform/internal/cloud   36.011s
ok      github.com/hashicorp/terraform/internal/cloud/cloudplan 0.111s
ok      github.com/hashicorp/terraform/internal/cloud/e2e       8.538s
ok      github.com/hashicorp/terraform/internal/cloudplugin     0.239s
ok      github.com/hashicorp/terraform/internal/cloudplugin/cloudplugin1        0.029s
ok      github.com/hashicorp/terraform/internal/collections     0.013s
?       github.com/hashicorp/terraform/internal/providers/testing       [no test files]
?       github.com/hashicorp/terraform/internal/provisioner-local-exec/main     [no test files]
?       github.com/hashicorp/terraform/internal/provisioners    [no test files]
?       github.com/hashicorp/terraform/internal/registry/test   [no test files]
?       github.com/hashicorp/terraform/internal/replacefile     [no test files]
?       github.com/hashicorp/terraform/internal/rpcapi/dynrpcserver     [no test files]
?       github.com/hashicorp/terraform/internal/rpcapi/dynrpcserver/generator   [no test files]
?       github.com/hashicorp/terraform/internal/rpcapi/terraform1       [no test files]
?       github.com/hashicorp/terraform/internal/stacks/stackconfig/stackconfigtypes     [no test files]
?       github.com/hashicorp/terraform/internal/stacks/stackconfig/typeexpr     [no test files]
?       github.com/hashicorp/terraform/internal/schemarepo/loadschemas  [no test files]
?       github.com/hashicorp/terraform/internal/schemarepo      [no test files]
?       github.com/hashicorp/terraform/internal/stacks/stackaddrs       [no test files]
?       github.com/hashicorp/terraform/internal/stacks/stackruntime/hooks       [no test files]
?       github.com/hashicorp/terraform/internal/stacks/stackruntime/testing     [no test files]
?       github.com/hashicorp/terraform/internal/stacks/stackutils       [no test files]
?       github.com/hashicorp/terraform/internal/tfplugin5       [no test files]
?       github.com/hashicorp/terraform/internal/tfplugin6       [no test files]
?       github.com/hashicorp/terraform/tools/loggraphdiff       [no test files]
?       github.com/hashicorp/terraform/tools/protobuf-compile   [no test files]
ok      github.com/hashicorp/terraform/internal/command 88.238s
ok      github.com/hashicorp/terraform/internal/command/arguments       0.014s
ok      github.com/hashicorp/terraform/internal/command/cliconfig       0.027s
ok      github.com/hashicorp/terraform/internal/command/clistate        0.010s
ok      github.com/hashicorp/terraform/internal/command/e2etest 30.692s
ok      github.com/hashicorp/terraform/internal/command/format  0.010s
ok      github.com/hashicorp/terraform/internal/command/jsonchecks      0.009s
ok      github.com/hashicorp/terraform/internal/command/jsonconfig      0.013s
ok      github.com/hashicorp/terraform/internal/command/jsonformat      0.111s
ok      github.com/hashicorp/terraform/internal/command/jsonformat/computed/renderers   0.035s
ok      github.com/hashicorp/terraform/internal/command/jsonformat/differ       0.058s
ok      github.com/hashicorp/terraform/internal/command/jsonformat/structured/attribute_path    0.014s
ok      github.com/hashicorp/terraform/internal/command/jsonfunction    0.019s
ok      github.com/hashicorp/terraform/internal/command/jsonplan        0.028s
ok      github.com/hashicorp/terraform/internal/command/jsonprovider    0.024s
ok      github.com/hashicorp/terraform/internal/command/jsonstate       0.036s
ok      github.com/hashicorp/terraform/internal/command/views   3.473s
ok      github.com/hashicorp/terraform/internal/command/views/json      0.053s
ok      github.com/hashicorp/terraform/internal/command/webbrowser      0.016s
ok      github.com/hashicorp/terraform/internal/command/workdir 0.029s
ok      github.com/hashicorp/terraform/internal/communicator    1.049s
ok      github.com/hashicorp/terraform/internal/communicator/remote     0.010s [no tests to run]
ok      github.com/hashicorp/terraform/internal/communicator/shared     0.005s
ok      github.com/hashicorp/terraform/internal/communicator/ssh        3.183s
ok      github.com/hashicorp/terraform/internal/communicator/winrm      0.045s
ok      github.com/hashicorp/terraform/internal/configs 7.155s
ok      github.com/hashicorp/terraform/internal/configs/configload      0.888s
ok      github.com/hashicorp/terraform/internal/configs/configschema    0.038s
ok      github.com/hashicorp/terraform/internal/configs/configtesting   0.004s
ok      github.com/hashicorp/terraform/internal/configs/hcl2shim        0.036s
ok      github.com/hashicorp/terraform/internal/copy    0.012s
ok      github.com/hashicorp/terraform/internal/dag     2.168s
ok      github.com/hashicorp/terraform/internal/depsfile        0.214s
ok      github.com/hashicorp/terraform/internal/didyoumean      0.012s
ok      github.com/hashicorp/terraform/internal/genconfig       0.051s
ok      github.com/hashicorp/terraform/internal/getmodules/moduleaddrs  0.063s
ok      github.com/hashicorp/terraform/internal/getproviders    4.428s
ok      github.com/hashicorp/terraform/internal/getproviders/providerreqs       0.101s
ok      github.com/hashicorp/terraform/internal/helper/slowmessage      0.105s
ok      github.com/hashicorp/terraform/internal/httpclient      0.020s
ok      github.com/hashicorp/terraform/internal/initwd  0.312s
ok      github.com/hashicorp/terraform/internal/instances       0.019s
ok      github.com/hashicorp/terraform/internal/ipaddr  0.026s
ok      github.com/hashicorp/terraform/internal/lang    0.250s
ok      github.com/hashicorp/terraform/internal/lang/blocktoattr        0.016s
ok      github.com/hashicorp/terraform/internal/lang/funcs      0.792s
ok      github.com/hashicorp/terraform/internal/lang/globalref  0.326s
ok      github.com/hashicorp/terraform/internal/logging 0.004s
ok      github.com/hashicorp/terraform/internal/moduledeps      0.021s
ok      github.com/hashicorp/terraform/internal/moduletest      0.203s
ok      github.com/hashicorp/terraform/internal/moduletest/config       0.028s
ok      github.com/hashicorp/terraform/internal/moduletest/hcl  0.045s
ok      github.com/hashicorp/terraform/internal/moduletest/mocking      0.025s
ok      github.com/hashicorp/terraform/internal/namedvals       0.010s
ok      github.com/hashicorp/terraform/internal/plans   0.018s
ok      github.com/hashicorp/terraform/internal/plans/deferring 0.010s
ok      github.com/hashicorp/terraform/internal/plans/objchange 0.115s
ok      github.com/hashicorp/terraform/internal/plans/planfile  0.331s
ok      github.com/hashicorp/terraform/internal/plugin  0.040s
ok      github.com/hashicorp/terraform/internal/plugin/convert  0.027s
ok      github.com/hashicorp/terraform/internal/plugin/discovery        0.013s
ok      github.com/hashicorp/terraform/internal/plugin6 0.028s
ok      github.com/hashicorp/terraform/internal/plugin6/convert 0.022s
ok      github.com/hashicorp/terraform/internal/promising       0.041s
ok      github.com/hashicorp/terraform/internal/providercache   0.232s
ok      github.com/hashicorp/terraform/internal/providers       0.012s
ok      github.com/hashicorp/terraform/internal/refactoring     0.261s
ok      github.com/hashicorp/terraform/internal/registry        3.826s
ok      github.com/hashicorp/terraform/internal/registry/regsrc 0.008s
ok      github.com/hashicorp/terraform/internal/registry/response       0.010s
ok      github.com/hashicorp/terraform/internal/releaseauth     0.167s
ok      github.com/hashicorp/terraform/internal/repl    0.096s
ok      github.com/hashicorp/terraform/internal/rpcapi  0.263s
ok      github.com/hashicorp/terraform/internal/stacks/stackconfig      0.017s
ok      github.com/hashicorp/terraform/internal/stacks/stackplan        0.029s
ok      github.com/hashicorp/terraform/internal/stacks/stackruntime     0.484s
ok      github.com/hashicorp/terraform/internal/stacks/stackruntime/internal/stackeval  1.489s
ok      github.com/hashicorp/terraform/internal/stacks/stackstate       0.022s
ok      github.com/hashicorp/terraform/internal/stacks/stackstate/statekeys     0.028s
ok      github.com/hashicorp/terraform/internal/stacks/tfstackdata1     0.017s
ok      github.com/hashicorp/terraform/internal/states  0.018s
ok      github.com/hashicorp/terraform/internal/states/remote   0.032s
ok      github.com/hashicorp/terraform/internal/states/statefile        0.070s
ok      github.com/hashicorp/terraform/internal/states/statemgr 5.951s
ok      github.com/hashicorp/terraform/internal/terminal        0.005s
ok      github.com/hashicorp/terraform/internal/terraform       8.988s
ok      github.com/hashicorp/terraform/internal/tfdiags 0.012s
ok      github.com/hashicorp/terraform/version  0.003s
```

</div></details>

テストを実行してみたところ、`[no test files]` が多数見つかりました。
少し気になりますので、テストのカバレッジを見てみます。

```sh
$ go test -cover
Terraform has no command named "bar".

To see all of Terraform's top-level commands, run:
  terraform -help

PASS
coverage: 36.7% of statements
ok      github.com/hashicorp/terraform  0.049s
```

上記ログには

> coverage: 36.7% of statements

とありますので、Terraform 実装コードのテストカバレッジ率は `36.7%` です。
数字の是非はさておいて、テストが通過することは確認できました。

# ビルドして動かしてみる

`terraform` がコマンドの1つである以上、「ビルドして動かせる」はずなので、実際に試してみます。

Go言語では王道の [Makefile](https://github.com/hashicorp/terraform/blob/main/Makefile) を見たところ、`go build` に相当しそうなコマンドは見つかりません。
ただし、いくつかのコマンドが `$(CURDIR)/scripts/` 配下のシェルスクリプトを参照していますので、当該ディレクトリにお目当てのファイルがないかを確認します。

```sh
$ ls -l scripts/
total 40
-rwxr-xr-x 1 blog-user blog-user 2853 Mar 25 05:19 build.sh
-rwxr-xr-x 1 blog-user blog-user  958 Mar 24 22:52 changelog-links.sh
-rwxr-xr-x 1 blog-user blog-user  610 Mar 24 22:52 copyright.sh
-rwxr-xr-x 1 blog-user blog-user 1171 Mar 24 22:52 debug-terraform
-rwxr-xr-x 1 blog-user blog-user  344 Mar 24 22:52 exhaustive.sh
-rwxr-xr-x 1 blog-user blog-user  401 Mar 24 22:52 gofmtcheck.sh
-rwxr-xr-x 1 blog-user blog-user  351 Mar 24 22:52 gogetcookie.sh
-rwxr-xr-x 1 blog-user blog-user 2730 Mar 24 22:52 goimportscheck.sh
-rwxr-xr-x 1 blog-user blog-user  666 Mar 24 22:52 staticcheck.sh
-rwxr-xr-x 1 blog-user blog-user 1096 Mar 24 22:52 syncdeps.sh
```

`scripts/` 配下に、[`build.sh`](https://github.com/hashicorp/terraform/blob/main/scripts/build.sh) というシェルスクリプトが見つかりました。
また、VSCode で `Ctrl + Shift + f` を実行して `build.sh` を検索すると、[Dockerfile](https://github.com/hashicorp/terraform/blob/main/Dockerfile#L23) の中でこのシェルスクリプトが呼ばれていることも確認できます。

シェル冒頭に以下の記載があり、`bash` によリコールされた後、1つ上のディレクトリでビルドプロセスを動かしていることが分かります。

```sh build.sh
# Get the parent directory of where this script is.
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ] ; do SOURCE="$(readlink "$SOURCE")"; done
DIR="$( cd -P "$( dirname "$SOURCE" )/.." && pwd )"
```

上記を踏まえて、さっそくビルドしてみます。

```sh
$ /usr/bin/bash build.sh
==> Removing old directory...
==> Installing gox...
==> Building...
Number of parallel builds: 11

-->   solaris/amd64: github.com/hashicorp/terraform
-->   windows/amd64: github.com/hashicorp/terraform
-->     freebsd/arm: github.com/hashicorp/terraform
-->     openbsd/386: github.com/hashicorp/terraform
-->   openbsd/amd64: github.com/hashicorp/terraform
-->       linux/arm: github.com/hashicorp/terraform
-->       linux/386: github.com/hashicorp/terraform
-->     freebsd/386: github.com/hashicorp/terraform
-->     linux/amd64: github.com/hashicorp/terraform
-->   freebsd/amd64: github.com/hashicorp/terraform
-->     windows/386: github.com/hashicorp/terraform
```

計11個のビルドプロセスが並列で動いています。

このまましばらく放置していれば、11環境分すべての `terraform` 実行バイナリが作成されるのですが、私のPC環境では以下の問題が発生しました。

<img src="/images/20240326a/disc.png" alt="disc.png" width="544" height="170" loading="lazy">

リポジトリからクローンしたソースコード全体と、ビルドで生成した実行バイナリのダブルパンチにより、ローカル PC が悲鳴を上げていました。

```sh
$ du -h terraform/bin/terraform
119M    terraform

$ du -h terraform/
...
820M    terraform/
```

何とかならないか？と `build.sh` を読み進めたところ、環境変数 `TF_DEV` に値を設定すれば、ビルド環境だけの実行バイナリを生成してくれるとありました。

```sh build.sh
# If its dev mode, only build for ourself
if [[ -n "${TF_DEV}" ]]; then
    XC_OS=$(go env GOOS)
    XC_ARCH=$(go env GOARCH)
fi
```

また、`TF_DEV` を設定しない場合には、ビルドした実行バイナリのパッケージ化が行われるとの記載も見つかりました。

```sh build.sh
if [ "${TF_DEV}x" = "x" ]; then
    # Zip and copy to the dist dir
    echo "==> Packaging..."
    for PLATFORM in $(find ./pkg -mindepth 1 -maxdepth 1 -type d); do
        OSARCH=$(basename ${PLATFORM})
        echo "--> ${OSARCH}"

        pushd $PLATFORM >/dev/null 2>&1
        zip ../${OSARCH}.zip ./*
        popd >/dev/null 2>&1
    done
fi
```

今回はローカル環境でのみビルド、動作検証ができれば十分ですので、環境変数 `TF_DEV` を設定し再ビルドします。

```sh
$ export TF_DEV=yes
$ echo $TF_DEV
yes

$ go env GOOS
linux

$ go env GOARCH
amd64

$ /usr/bin/bash build.sh
==> Removing old directory...
==> Building...
Number of parallel builds: 11

-->     linux/amd64: github.com/hashicorp/terraform
==> Creating GOPATH/bin directory...

==> Results:
total 119M
-rwxr-xr-x 1 blog-user blog-user 119M Mar 25 03:45 terraform
```

無事に、`linux/amd64` 分のビルドに成功しました。
実行バイナリは、以下2つのディレクトリに出力されています。

* terraform/bin
* GOPATH/bin

```sh
$ ./terraform/bin/terraform version
Terraform v1.9.0-dev
on linux_amd64
```

ここまでの操作により、ソースコードのビルドから、コマンドの実行手順まで確認できました。

続いて、コードに手を加えた場合には、ビルド後のコマンド中身に反映されていることを検証してみます。

サブコマンドの `version` が分かりやすいので、以下のログを追加します。
（[対応箇所](https://github.com/hashicorp/terraform/blob/main/internal/command/version.go#L81-L84)）

```go version.go
...
fmt.Fprintf(&versionString, "Terraform v%s", c.Version)
if c.VersionPrerelease != "" {
 fmt.Fprintf(&versionString, "-%s", c.VersionPrerelease)
}
...
```

↓

```go version.go
...
fmt.Println("バージョン確認コマンドを実行してみた。") // 追加
fmt.Fprintf(&versionString, "Terraform v%s", c.Version)
if c.VersionPrerelease != "" {
 fmt.Fprintf(&versionString, "-%s", c.VersionPrerelease)
}
...
```

この1行が追記された状態で実行バイナリをビルドすると、コマンドのログ出力が増えていることを確認できます。

```sh
$ /usr/bin/bash ./terraform/scripts/build.sh
...

$ ./terraform/bin/terraform version
バージョン確認コマンドを実行してみた。
Terraform v1.9.0-dev
on linux_amd64
```

# エントリーポイントから見ていく

ここまでが事前準備です。
さっそく、Terraform の実コードを見ていきます。

まずはプログラムの始まりとなる「エントリーポイント」を探します。

Go であれば

* main.go
* func main() {...}

がプログラムのエントリーポイントです。
トップディレクトリ配下の「[terraform/main.go](https://github.com/hashicorp/terraform/blob/main/main.go#L63-L65)」に以下の記述が見つかりました。

```go
func main() {
 os.Exit(realMain())
}
```

初手、`main()` の中で `realMain()`（直訳すると「本当のmain」）を呼び出しているようです。
呼び出し先の関数を見ると、今度は defer で `logging.PanicHandler()` を呼び出しているようなので、この関数の中身を見てみます。

```go
func realMain() int {
 defer logging.PanicHandler()
 ...
}
```

VSCode のコードジャンプが有効となっていれば、Ctrl を押しながら対象関数を左クリックすることにより、関数の定義元にジャンプすることができます。

## `PanicHandler()`

「[PanicHandler()の実装](https://github.com/hashicorp/terraform/blob/main/internal/logging/panic.go#L41)」を見ますと、**TERRAFORM CRASH** という仰々しい言葉が沢山の `!` で囲まれていることが分かります。
通常のインフラ構築、運用保守作業にてこのようなメッセージをお目にかかることは、まずないと思います。私は今回、初めてこんなメッセージが仕込まれていることを知りました。

メッセージ内容を日本語訳しますと「Terraform が壊れたよ！ 公式リポジトリの issue に記票して」とありますので、さっそく、壊してみます。

panic 発生時に **TERRAFORM CRASH** が表示されるようなので、エントリーポイントの直後で強制的に panic を起こす1行を入れます。

```go
func realMain() int {
 defer logging.PanicHandler()
 panic("バルス！")
 ...
}
```

また、`terraform` のビルド時に渡される `GOFLAGS` を「[リポジトリのコード](https://github.com/hashicorp/terraform/blob/main/scripts/build.sh#L41-L42)」のまま利用した場合、ビルド環境のフルパスが表示されてしまいますので、以下の `-trimpath` フラグを追加します。

```sh
export GOFLAGS="-mod=readonly"
```

↓

```sh
export GOFLAGS="-mod=readonly -trimpath"
```

この状態でソースコードのビルド、及び、コマンドの実行を試してみます。

サブコマンドを与えずに `terraform` を実行した場合、本来ならば `help` が表示されますが、無事に「壊す」ことができました。

```sh
$ ./terraform

!!!!!!!!!!!!!!!!!!!!!!!!!!! TERRAFORM CRASH !!!!!!!!!!!!!!!!!!!!!!!!!!!!

Terraform crashed! This is always indicative of a bug within Terraform.
Please report the crash with Terraform[1] so that we can fix this.

When reporting bugs, please include your terraform version, the stack trace
shown below, and any additional information which may help replicate the issue.

[1]: https://github.com/hashicorp/terraform/issues

!!!!!!!!!!!!!!!!!!!!!!!!!!! TERRAFORM CRASH !!!!!!!!!!!!!!!!!!!!!!!!!!!!

panic: バルス！
goroutine 1 [running]:
runtime/debug.Stack()
        runtime/debug/stack.go:24 +0x5e
github.com/hashicorp/terraform/internal/logging.PanicHandler()
        github.com/hashicorp/terraform/internal/logging/panic.go:84 +0x18b
panic({0x1ade400?, 0x249fc00?})
        runtime/panic.go:770 +0x132
main.realMain()
        github.com/hashicorp/terraform/main.go:69 +0x47
main.main()
        github.com/hashicorp/terraform/main.go:64 +0x13
```

`terraform` コマンドの実行時、何らかの理由により panic が起きてしまった場合には、**TERRAFORM CRASH** のメッセージ表示と issue の起票催促、デバックトレースが表示されることを確認できました。

それでは、意図的に仕込んだ panic の1行を削除して、再ビルドまで完了したら、次の処理を見ていきます。

## `openTelemetryInit()`

次の実装として、Open Telemetry を扱う処理が見つかります。

```go
var err error

err = openTelemetryInit()
if err != nil {
  // openTelemetryInit can only fail if Terraform was run with an
  // explicit environment variable to enable telemetry collection,
  // so in typical use we cannot get here.
  Ui.Error(fmt.Sprintf("Could not initialize telemetry: %s", err)) 
  Ui.Error(fmt.Sprintf("Unset environment variable %s if you don't intend to collect telemetry from Terraform.", openTelemetryExporterEnvVar))
  return 1
}
var ctx context.Context
var otelSpan trace.Span
{
  // At minimum we emit a span covering the entire command execution.
  _, displayArgs := shquot.POSIXShellSplit(os.Args)
  ctx, otelSpan = tracer.Start(context.Background(), fmt.Sprintf("terraform %s", displayArgs))
  defer otelSpan.End()
}
```

`openTelemetryInit()` の定義元にコードジャンプしますと、トップディレクトリ配下の「[terraform/telemetry.go](https://github.com/hashicorp/terraform/blob/main/telemetry.go#L56-L63)」にて詳細内容が説明されています。

まず、実装コードのコメントには以下の記載があります。

```go
// If this environment variable is set to "otlp" when running Terraform CLI
// then we'll enable an experimental OTLP trace exporter.
//
// BEWARE! This is not a committed external interface.
//
// Everything about this is experimental and subject to change in future
// releases. Do not depend on anything about the structure of this output.
// This mechanism might be removed altogether if a different strategy seems
// better based on experience with this experiment.
const openTelemetryExporterEnvVar = "OTEL_TRACES_EXPORTER"
```

Terraform の実行環境にて、環境変数として以下を設定した場合のみ、Open Telemetry 機能が有効となるようです。
`otlp` 以外の値（値ナシも含む）が設定された場合には、この機能は有効化されずに関数の呼び出し元へ戻ります。

```sh
export OTEL_TRACES_EXPORTER=otlp
```

コメントには「[OpenTelemetry Protocol Exporter Configuration Options](https://opentelemetry.io/docs/specs/otel/protocol/exporter/#configuration-options)」へのリンクが添付されています。

ただし、Open Telemetry について本記事では立ち入りません。
気になる方は、以下の公式ドキュメント・日本語記事・翻訳書籍をご参照ください。

* 公式ドキュメント
  * [What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry/)
* 日本語記事
  * [OpenTelemetryに触れてみた](https://zenn.dev/yuta28/articles/what-is-opentelemetry)
* 翻訳書籍
  * [オブザーバビリティ・エンジニアリング](https://www.oreilly.co.jp/books/9784814400126/)

ここでは、実装コードを参照する中で、Terraform には「環境変数の `OTEL_TRACES_EXPORTER` に `otlp` を与えることで、Open Telemetry が有効化される」ことが分かりました。

このような知識はもちろん公式ドキュメントを漁れば見つかるのだとは思いますが、自分で探索して見つけたときの「自力で発見できた感覚」を味わえるのが、OSS コードリーディングの面白さだと私は感じております。少々、蛇足に過ぎましたので、元のコードに戻ります。

## `tmpLogPath`

続いて、`tmpLogPath` という「一時的なログファイルの出力先」になりそうな変数が見つかりました。
適切な変数名は「適切なメンタルモデル」を脳内に作るために重要なので、こういった側面においても、OSS のコードリーディングでは書籍からは得られない実践知が詰っていると感じます。

```go
tmpLogPath := os.Getenv(envTmpLogPath)
if tmpLogPath != "" {
  f, err := os.OpenFile(tmpLogPath, os.O_RDWR|os.O_APPEND, 0666)
  if err == nil {
    defer f.Close()

    log.Printf("[DEBUG] Adding temp file log sink: %s", f.Name())
    logging.RegisterSink(f)
  } else {
    log.Printf("[ERROR] Could not open temp log file: %v", err)
  }
}
```

ここの実装では、環境変数の `TF_TEMP_LOG_PATH` で指定したファイルに、ログを追記する処理が定義されています。
それでは、ログの出力先を指定して、出力ログと実装コードの対応を確認していきます。

```sh
# ログの出力先を /tmp/tf.log に指定
export TF_TEMP_LOG_PATH="/tmp/tf.log"
```

ログ出力先の環境変数を設定してから任意の `terraform` コマンドを実行すると、ファイルには以下のログが追記されます。

```log
2024-03-25T05:07:16.800+0900 [INFO]  Terraform version: 1.9.0 dev
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/hashicorp/go-tfe v1.41.0
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/hashicorp/hcl/v2 v2.20.0
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/hashicorp/terraform-svchost v0.1.1
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/zclconf/go-cty v1.14.3
2024-03-25T05:07:16.800+0900 [INFO]  Go runtime version: go1.22.1
2024-03-25T05:07:16.800+0900 [INFO]  CLI args: []string{"./terraform", "version"}
2024-03-25T05:07:16.800+0900 [TRACE] Stdout is a terminal of width 125
2024-03-25T05:07:16.800+0900 [TRACE] Stderr is a terminal of width 125
2024-03-25T05:07:16.800+0900 [TRACE] Stdin is a terminal
2024-03-25T05:07:16.800+0900 [DEBUG] Attempting to open CLI config file: /home/blog-user/.terraformrc
2024-03-25T05:07:16.800+0900 [DEBUG] File doesn't exist, but doesn't need to. Ignoring.
2024-03-25T05:07:16.800+0900 [DEBUG] ignoring non-existing provider search directory terraform.d/plugins
2024-03-25T05:07:16.800+0900 [DEBUG] ignoring non-existing provider search directory /home/blog-user/.terraform.d/plugins
2024-03-25T05:07:16.800+0900 [DEBUG] ignoring non-existing provider search directory /home/blog-user/.local/share/terraform/plugins
2024-03-25T05:07:16.800+0900 [DEBUG] ignoring non-existing provider search directory /usr/local/share/terraform/plugins
2024-03-25T05:07:16.800+0900 [DEBUG] ignoring non-existing provider search directory /usr/share/terraform/plugins
2024-03-25T05:07:16.800+0900 [DEBUG] ignoring non-existing provider search directory /var/lib/snapd/desktop/terraform/plugins
2024-03-25T05:07:16.801+0900 [INFO]  CLI command args: []string{"version"}
```

これらのログと実装コードの対応を見ますと、`TF_TEMP_LOG_PATH` を設定した「[直後の処理内容](https://github.com/hashicorp/terraform/blob/main/main.go#L103-L134)」が、そのままログとして格納されていることが分かります。

例えば、`version.InterestingDependencies()` により取得された「[依存モジュールのバージョン情報](https://github.com/hashicorp/terraform/blob/main/version/dependencies.go#L11-L16)」は、以下のように記録されています。

```log
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/hashicorp/go-tfe v1.41.0
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/hashicorp/hcl/v2 v2.20.0
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/hashicorp/terraform-svchost v0.1.1
2024-03-25T05:07:16.800+0900 [DEBUG] using github.com/zclconf/go-cty v1.14.3
```

ログの対応を1つ1つ、実装コードと突き合わせてみますと、以下に対応するログが出力されていないことが分かります。

```go
if ExperimentsAllowed() {
  log.Printf("[INFO] This build of Terraform allows using experimental features")
}
```

`ExperimentsAllowed()` の定義にコードジャンプすると、「[terraform/experiments.go](https://github.com/hashicorp/terraform/blob/main/experiments.go#L25)」のコメントとして、この関数を有効化する方法（返り値がtrueにする方法）が記載されています。

```go
// experimentsAllowed can be set to any non-empty string using Go linker
// arguments in order to enable the use of experimental features for a
// particular Terraform build:
//
//   go install -ldflags="-X 'main.experimentsAllowed=yes'"
//
// By default this variable is initialized as empty, in which case
// experimental features are not available.
```

コメントの内容に従うと、`terraform` のビルド時に

```sh
go install -ldflags="-X 'main.experimentsAllowed=yes'"
```

を混ぜ込むことにより、`experiments`（実験的機能）を有効化できるようです。

「[scripts/build.sh](https://github.com/hashicorp/terraform/blob/main/scripts/build.sh)」を確認すると、`-ldflags` に渡される値は以下のように定義されていることが分かります。`TF_RELEASE` に値を設定した場合のみ、`gox -ldflags ""${LD_FLAGS}""` が「[ビルド時に追加](https://github.com/hashicorp/terraform/blob/main/scripts/build.sh#L44-L62)」されています。

```sh
# In release mode we don't want debug information in the binary and we don't
# want the -dev version marker
if [[ -n "${TF_RELEASE}" ]]; then
    LD_FLAGS="-s -w -X 'github.com/hashicorp/terraform/version.dev=no'"
fi
```

今回は `TF_RELEASE` を利用しないので、以下の分岐を追加します。

```sh
if [[ -n "${TF_RELEASE}" ]]; then
    LD_FLAGS="-s -w -X 'github.com/hashicorp/terraform/version.dev=no'"
else
    LD_FLAGS="-X 'main.experimentsAllowed=yes'"
fi
```

この状態で実行バイナリをビルドし、任意の `terraform` コマンドを実行すると、ログファイルに以下の1文が追記されることを確認できます。

```log
...
[INFO]  This build of Terraform allows using experimental features
...
```

`experiments` を有効化することにより、何かしらの実験的コマンドが利用可能となったのだと思います。しかし、ここまでのコードリーディングの範囲では「どのような機能が有効化されたのか？」についての情報に遭遇していないため、`ExperimentsAllowed()` の探索はここまでとします。

## `terminal.Init()`

コードリーディングとしては、ログ後半に注目してみます。
ここでは、ターミナルを初期化しているような `terminal.Init()` という関数と、その関数の返り値を利用して

* 標準入力
* 標準出力
* 標準エラー出力

のそれぞれに対して、`IsXXX()` の方式で「ターミナルであるか、否か」を判断している以下の実装が見つかります。

```go
streams, err := terminal.Init()
if err != nil {
  Ui.Error(fmt.Sprintf("Failed to configure the terminal: %s", err))
  return 1
}
if streams.Stdout.IsTerminal() {
  log.Printf("[TRACE] Stdout is a terminal of width %d", streams.Stdout.Columns())
} else {
  log.Printf("[TRACE] Stdout is not a terminal")
}
if streams.Stderr.IsTerminal() {
  log.Printf("[TRACE] Stderr is a terminal of width %d", streams.Stderr.Columns())
} else {
  log.Printf("[TRACE] Stderr is not a terminal")
}
if streams.Stdin.IsTerminal() {
  log.Printf("[TRACE] Stdin is a terminal")
} else {
  log.Printf("[TRACE] Stdin is not a terminal")
}
```

`terminal.Init()` の定義元にコードジャンプすると、こちらも「[長文コメント](https://github.com/hashicorp/terraform/blob/main/internal/terminal/streams.go#L4-L17)」で実装内容、実装意図が説明されています。

コマンドの実行環境は `terraform` が正しく入力・出力を扱える環境なのか、この terminal パッケージ内にて確認処理を行っています。普段、ツールやコマンドを取得する際には `Requirements` を確認してインストールしますが、コマンドの実行プロセス内においても、実行環境の確認を行っていることが確認できました。

...

本ブログでのコードリーディングは一旦ここまでとします。
`func main() {...}` から読み始め、進捗行数としては70行程度です。ただし、途中でコードジャンプやシェルスクリプトの確認が入ったため、単純に「`main()` からの進捗行数 = コードリーディング行数」というカウントにはなりません。「実際に動かしながらのコードリーディング」のスピードを実感いただけたでしょうか。

# おわりに

本ブログでは、「Terraform の実装コードを、動かしながら読む」という目標を掲げ、実行バイナリのビルドやコードの改造を取り入れながら、OSS のコードリーディングを行いました。前半の環境準備に原稿の多くが割かれているため、実際のコードリーディング行数は100行未満ではないかと思います。OSS コードリーディングの面白さは「各自が、自分の好き勝手に読めること」にあると思いますので、私ならどのように読むか？を詳しく解説してきました。

ここまで長文にお付き合いいただき、ありがとうございました。

