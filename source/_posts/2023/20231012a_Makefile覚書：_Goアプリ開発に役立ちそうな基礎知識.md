---
title: "Makefile覚書: Goアプリ開発に役立ちそうな基礎知識"
date: 2023/10/12 00:00:00
postid: a
tag:
  - Makefile
  - タスクランナー
  - Go
  - チーム開発
  - EditorConfig
category:
  - DevOps
thumbnail: /images/2023/20231012a/thumbnail.png
author: 真野隼記
lede: "makeを用いてWebバックエンドアプリをGoで開発するということをテーマに、役立ちそうな情報をまとめます。"
---
<img src="/images/2023/20231012a/gnu-make.png" alt="" width="800" height="418">

## はじめに

TIG真野です。育休明けです。

フューチャー社内のタスクランナーはmakeや[Task](https://taskfile.dev/)など複数の流派があり、チームによって使い分けられています。個人的にはmakeで良いんじゃないかと思っていますが、Taskも良いですよね。

makeは細かい記法をいつも忘れる＋調べるとC言語向けの情報が出てきて脳内変換に手間を感じたため、makeを用いてWebバックエンドアプリをGoで開発するということをテーマに、役立ちそうな情報をまとめます。

なお、今記事におけるmakeは、GNU Makeを指します。バージョンは以下で動かしています。

```sh
$ make -v | head -n 1
GNU Make 4.2.1
```

## MakefileのためのEditorConfig

Makefileのインデントはハードタブである必要があります。誤りを防ぐためにも[EditorConfig](https://editorconfig.org/)を設定しておくと良いでしょう。

makeは通常、Makefileという名称をデフォルトで認識しますが、同一フォルダに複数のファイルを用意したいときや、includeように共通の変数などを定義したファイルを作る場合は、`.mk` という拡張子を付けますので、`[{Makefile,**.mk}]` というセクションが良いでしょう（[小文字の`makefile` より `Makefile` の方を推奨する](https://www.gnu.org/software/make/manual/html_node/Makefile-Names.html)とのことなので小文字の方はあえて入れてません）。

```ini .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.go]
indent_style = tab

[{Makefile,**.mk}]
indent_style = tab
```

記事によっては以下のように `indent_size` を指定する設定例もよく見かけます。こちらを指定していると、ハードタブの場合でも、エディタやGitHub上の表示幅を制御してくれるため、チーム開発で見た目まで統一を効かせたい場合は追加すると良いでしょう。個人的にはここは個々人に委ねても良い領域だと感じたので上の例から省いています。

```ini .editorconfig
[{Makefile,**.mk}]
# 表示幅もEditorconfigで制御したい場合はindent_sizeの設定を加える
indent_size = 4
indent_style = tab
```

## リンター

Makefileのリンターとして[mrtazz/checkmake](https://github.com/mrtazz/checkmake) があります。2023.10.6時点でv0.2.2、`experimental tool` とREADMEにかかれているGo製のツールです。まだ実験的な取り組みのようですが、すでに [MegaLinter](https://github.com/oxsecurity/megalinter)にネイティブで組み込まれており、利用しているチームも増えているように感じます。

v0.2.2時点での[実装](https://github.com/mrtazz/checkmake/tree/main/rules)から、次の4種類のチェックを行ってくれるようです。

1. ターゲットボディがN行以内（デフォルト5）
2. all, clean, testのターゲットがPHONYにあること
3. ボディがないターゲットはPHONY宣言すること
4. ビルドの一貫性のためdateの利用有無

また、先のEditorConfigの設定値が正しく反映されたエディタで編集されているかチェックするため、[editorconfig-checker](https://github.com/editorconfig-checker/editorconfig-checker)を使うという考え方もあります。こちらはMakefile以外のファイルに対しても利用できるものなので、一律設定しておくとベターだと思います。

リンターと合わせてフォーマッターについても触れたかったですが、有益なものを探せませんでした。もし、ご存知の方がいれば教えてください。

## コーディング規約

Makefileそのものの、コーディング規約（スタイルガイド）で広く周知されているものの1つが[GNUのマニュアル](https://www.gnu.org/prep/standards/html_node/Makefile-Conventions.html) でしょう。多くの慣習がここから来ていそうな大本です。

重要そうなものを抜粋します。

- Makefile Basics（Makefile基礎）
  - すべてのMakefileは `SHELL = /bin/sh` が含まれるべきとある
  - こちらについては後述しますが、 `bash` の方がベターだと思います
- Standard Targets（標準ターゲット）
  - すべてのGNUプログラムには次のターゲットが含まれるべきとある
    - `all`、`install`、`install-html`、(中略)、`clean`、(中略)、`TAGS`、`info`、`dvi`、`html`、`pdf`、`ps`、`dist`、`check`、(省略)
  - `install-html` の例にある通り、 **ターゲット名はハイフン区切り** が推奨だと思われます

ターゲット名はこれをベースにできるのが嬉しいですね。GoでWebバックエンドアプリ開発だと、`all`, `install`, `uninstall`, `clean`, `dist`, `check` あたりは使えそうですが、変わって来ているものもあります。

- `all`: make の慣習でプログラム全体をビルドするターゲット名です。`make`コマンドのみでターゲット名を指定しない場合に通常呼び出されます。`test`、`build` などすべてを実施しておくとよいでしょう。デプロイは行わないほうが良いかと思います
- `check`: `test` にすることがWebアプリ開発では多いように思います。先程の`mrtazz/checkmake`も`test`想定です。
- `install`: 本来は開発中のプログラムのインストールを行うターゲットで、開発環境セットアップの意味では無いです。そのため `setup` と別の用語を用いることも多いと思います。しかし Goだと `go install` で必要なツールを入れることも多いこともあり、 `install` を使っている場面もよく見ますが、意味合いが異なるため `setup` がベターだと思います
- `dist`: サーバデプロイ用にzipで固める場合などに使っても良い気がしますし、開発者にとってはさして重要でなければ `bootstrap.zip` などというターゲット名のみにして良い気がします
- `clean`: 生成したバイナリを削除したり、Goアプリ開発の場合は`go clean` なども合わせて実施すると良いでしょう

次にメジャーだと思われる規約に[clarkgrubbのスタイルガイド](https://clarkgrubb.com/makefile-style-guide)があります。こちらについてはまた別の機会で紹介します。

## Makefileオプション

Makefileの先頭によく設定するオプションは次です。それぞれ説明していきます。

```Makefile Makefile
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
```

- `SHELL`: 次の `.SHELLFLAGS` を利用するために `bash` を宣言します。`/bin/bash` でも良いと思いますが、`bash` そのままの方が移植性が高いと考えます
- `.SHELLFLAGS`: シェルスクリプトの実行時オプション（疑似ターゲット）です
  - `-eu`: `-e` はbashで実行したコマンドが失敗した場合に終了させるものです。`;` などで複数のコマンドをワンライナーで記述した場合でも止めたいのでオプションに加えます。 `-u` はbashで変数未定義の場合にエラーで止めるためのオプションです
  - `-o pipefail`: パイプを使った処理を書いた場合に、パイプの最初や途中で処理が失敗した場合、全体を失敗したとみなすためのオプションです
  - `-c`: `.SHELLFLAGS` オプションを用いるときには最後につけるのが必須です。理由は内部的には各行が `$(SHELL) -$(SHELLFLAGS) 何かしらのcommands` といった形で動くためです（`bash -c "echo 'Hello'"` のようにコマンドとして評価させるためのオプションです）。`.SHELLFLAGS`のデフォルト値は `-c` が入っています。

- `.DEFAULT_GOAL`: デフォルト（ターゲットを未指定にした場合に選ばれる対象）は一番最初に定義したターゲットです。慣習的には `all` ターゲットを最初に定義することが多いようです。しかし、後述するスクリプトを機械的に追加して、`help` にしておくと便利だと思います（allだと実行時間が長いので）。これは好みなのでチームによってはなくしても良いと思います

特に `.SHELLFLAGS` で渡す値は個人的に重要で、指定を忘れるとその後、高確率でハマるメンバーが出現する体感がありますので、Makefileには機械的につける慣習化しておくと良いかなと思います。

makeには様々な設定ができますが、以下は1度は付けたものの運用をとして外した設定値です。備忘に残しておきます

- `MAKEFLAGS += --warn-undefined-variables`: makeの実行オプションで、`--warn-undefined-variables` はmake上で未定義の変数を $(undefined_var) などで利用すると警告を上げるものです。これ自体は良さそうだと思いましたが、後述する `go test $(option) ./...` のように拡張用のパラメータを指定するときにノイズだったので削除しました
- `MAKEFLAGS += --no-print-directory`: 後述がありますが、こちらは一律指定しても良いレベルだと思います。この記事では先頭行をあまり増やすのも、makeを難しいものと思われそうだったので除外しています
- `MAKEFLAGS += --no-builtin-rules`: `make` が暗黙的に探すファイルを無効化する設定です。性能向上が見込まれるようですが、Go環境だと大きな差は生まれなかったため、シンプル化のためなくします
- `.SUFFIXES:`:  `MAKEFLAGS += --no-builtin-rules` と同様です
- `.DELETE_ON_ERROR`: レシピが失敗した場合にターゲットのファイルを削除するオプション（疑似ターゲット）です。便利そうですがmakeを知らない開発者からするとこの挙動が直感的ではないため、make上級者が集うチームでない限りは未設定で良いと思いました
- `.ONESHELL`: `make`は通常1行ごと別のプロセスで起動しますが、これを1つのシェルとして動かすオプションです（`;`や`\`を減らせて便利です）。 規模感にもよりますが私が関わったGo Webアプリ開発の規模感では `make` にそれほど複雑な処理を行うことはなかったので、なるべく先頭の宣言部分をシンプルにしたかったため外す方針としました

## Goアプリに環境変数を渡す

クラウドネイティブなアプリケーション開発のためにThe Twelve-Factor Appを守っているチームは多いと思います。そうすると、DBや外部接続先など、それなりの数の環境変数をGoのアプリケーションに渡す必要が出てくるでしょう。

このとき、有名なよくある間違いは次のようなターゲット内のコマンドに変数をexportして記載するパターンです（※パスワードはラフに扱ってますのがイメージとして捉えてください）。

```ini Makefile（NG例）
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: run

# run is launching server
run:
	@export DB_HOST=localhost
	@export DB_PORT=5432
	@export DB_NAME=pg
	@export DB_USER=pg
	@export DB_PASS=xxxxx
	@go run cmd/main/main.go
```

```go cmd/main/main.go
package main

import (
	"fmt"
	"log"

	"github.com/kelseyhightower/envconfig"
)

type DBConfig struct {
	Host string
	Port int
	Name string
	User string
	Pass string
}

func main() {
	var dc DBConfig
	if err := envconfig.Process("db", &dc); err != nil {
		log.Fatal(err.Error())
	}

	fmt.Printf("Load env: %+v\n", dc)
}
```

環境変数は適用されません。

```sh
$ make run
Load env: {Host: Port:0 Name: User: Pass:}
```

これは make のターゲットのレシピ1行1行でシェルスクリプトのプロセスが別々になるためです（※ `.ONESHELL:` の疑似ターゲットが無い場合）。

回避するには、インラインで変数宣言するか（エスケープで改行しているのでインライン感は無いですが）、`&&` で同一シェル内で宣言するかなどが考えられます。

```ini Makefile(インラインパターン）
run:
	@DB_HOST=localhost \
    DB_PORT=5432 \
    DB_NAME=pg \
    DB_USER=pg \
    DB_PASS=pgpass \
    go run cmd/main/main.go
```

```ini Makefile（同一シェルで動かすパターン）
run:
	@export DB_HOST=localhost && \
	export DB_PORT=5432 && \
	export DB_NAME=pg && \
	export DB_USER=pg && \
	export DB_PASS=pgpass && \
	go run cmd/main/main.go
```

どちらもgit差分がわかりやすくするため改行を入れています。また先頭行はmake実行時にコマンドを非表示にするため`@`を追加しています。

個人的には開発上もっとも利用頻度が高い値に関してはトップレベルで変数宣言 + export（これだけ記載すると全変数をexportする）するのがてっとり早いと思います。たまに `.EXPORT_ALL_VARIABLES` という疑似ターゲットで説明した例がありますが、[古いmakeのバージョンで用いるもの](https://www.gnu.org/software/make/manual/html_node/Variables_002fRecursion.html)であるとのことで、通常はexportを使えば良いと思います。

```ini Makefile
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: run

export
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pg
DB_USER=pg
DB_PASS=pgpass

# run is launching server
run:
	@go run cmd/main/main.go
```

あるいは、 `make` に慣れないメンバーが多い場合、 `export` が少しわかりにくいのでいっそ変数毎に付けたほうが直感的かもしれません。

```Makefile Makefile
# ...省略...
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=pg
export DB_USER=pg
export DB_PASS=pgpass

# run is launching server
run:
	@go run cmd/main/main.go
```

すこし冗長ですが、こちらの方がサブプロセスに引き継がせたくない変数が出てきた場合に都合が良いため、すべての変数を環境変数としてGoのプロセスに与えたい場合も、あえてこちらの方針を採用するのもありじゃないかと思います。

## .env を読み込む

チームによっては `.env` で環境変数を管理している場合もあるでしょう。記載された変数をGoのプログラムにすべて渡すには以下のように `include` を用います。[こちら](https://dev.to/serhatteker/get-environment-variables-from-a-file-into-makefile-2m5l)を参考にしました。

```Makefile Makefile
include $(PWD)/.env
export

run:
	go run cmd/main/main.go
```

これは少しテクニカルで、 `include` は本来は別のMakefileを読み込むディレクティブです。たまたま `.env` のファイルレイアウトがMakefileとして読み込める形式であったため、このように扱えます。 私は `.env` の形式に詳しくないため、厳密には扱えないケースがあるかもしれませんが、key1=value1、key2=${value1} といった代表的なユースケースであれば問題なかったので、シンプルな使い方に留めるのであれば利用して良いのではないかと考えています。

ここでややこしいのは、developなど別環境に接続したい場合です。利用する環境変数を書き換える必要があります。もし、 `.env.develop` などのファイルが存在する場合は、`.env` の読み込みを変数化して切り替えられるようにすると良いかもしれません。基本的にはローカル環境、動作確認など限られたケースでのみクラウド上の開発環境に接続するといった場合を想定しています。

```Makefile
DOTENV := $(PWD)/.env
include $(DOTENV)
export

run: ## run launches go server
	go run cmd/main/main.go
```

develop環境に接続する場合は、次のように`DOTENV` 変数を指定して実行します。

```sh
make DOTENV=.env.develop run
```

もし、 `run-dev` のようなターゲットを補完目的などで個別に定義したい場合は厄介です。ターゲット内のコマンドをインラインで変数上書きするか、以下のように `$(MAKECMDGOALS)` で includeするファイルを動的に `.env.develop` を書き換える必要があります。後者の例をあげます。 `lastword` は最後の文字列が一致するか判定するmakeの関数で `-dev` で終わっているかどうかを示します。

```Makefile
DOTENV := $(PWD)/.env

# run-dev 時に環境変数を書き換えたいため、includeをmakeのゴールのsuffixによって分岐する
ifeq ($(lastword $(MAKECMDGOALS)), -dev)
	DOTENV := $(PWD)/.env.develop
endif

include $(DOTENV)

export

run: ## run launches go server
	go run cmd/main/main.go

run-dev: ## run-dev launches go server with development configurations
	go run cmd/main/main.go
```

このあたりから、初見の人から見ると魔術感が漂ってくるため、ベタに環境変数をインラインで上書きするの戦略としてありだと思います。用法用量はチームメンバーのスキルセットも鑑み、調整していきましょう。

## サブフォルダのMakefileを呼び出す

クラウドネイティブ時代になり、複数の機能を1つのAPサーバにデプロイするのではなく、レポート、監視、システム間I/Fなどの非同期処理はAWS Lambdaなど別サービスにデプロイすることが多くなりました。そのため、あるサービスを開発中にも複数のmainパッケージを持つプログラムを開発していると思います。それに相応してMakefile自体もそれぞれ存在していると思います。例えば、以下のようにMakefileを束ねるMakefileが存在し、一括でテスト、デプロイなどをしたいケースが出てくるかと思います。

```sh
.
├── Makefile         # ルートのMakefile
├── go.mod
├── go.sum
├── batch
│   ├── Makefile     # ラッパー（一括実行用）
│   ├── ***batch1
│   │   └── Makefile # 個別のMakefile
│   ├── ***batch2
│       └── Makefile # 個別のMakefile
├── send
│   ├── Makefile     # ラッパー（一括実行用）
│   ├── enterprisesystem1
│   │   └── Makefile # 個別のMakefile
│   ├── enterprisesystem2
│       └── Makefile # 個別のMakefile
├── receive
│   ├── Makefile     # ラッパー（一括実行用）
│   ├── johoukeisystem1
│       └── Makefile # 個別のMakefile
├── job
│   ├── Makefile     # ラッパー（一括実行用）
│   ├── ***-db-snapshot
│       └── Makefile # 個別のMakefile
├── webapi
```

Makefileが多段になるイメージですが、注意としてサブフォルダ側のMakefileは親フォルダ側のMakefileに依存しないように作るべきでしょう。例えば親側で環境変数のロードしたとして、それが無いと子ども側のMakefileが実行できないといった状態は避けるべきです。

上記のようなあるMakefileから別のMakefileを呼ぶ方法は次のように書くと良いでしょう。

```Makefile Makefile
build:
    $(MAKE) -C batch   build --no-print-directory
    $(MAKE) -C send    build --no-print-directory
    $(MAKE) -C receive build --no-print-directory
    $(MAKE) -C job     build --no-print-directory
    $(MAKE) -C webapi  build --no-print-directory
```

- `$(MAKE)`: `make` ではなく `$(MAKE)` の変数を利用することで、[-t (--touch), -n (--just-print) or --q (--question) のオプションが引き継がれたり](https://www.gnu.org/software/make/manual/html_node/MAKE-Variable.html)、`make ENV=dev build` などの変数を引き継いだりします
- `-C`: `--directory` と同義で、 `cd subdir && $(MAKE)` と `$(MAKE) -C subdir` は同義です
- `--no-print-directory`: サブディレクトリへの移動したことの標準出力を抑制します。Goアプリ開発でmakeをタスクランナーのように利用する場合において、そこまで有益ではない情報なので消して良いでしょう。これについては、`MAKEFLAGS += --no-print-directory` をMakefileの先頭行に毎回つけるルールにするのもありかもしれません。

ちなみにですが、次のように `-f` でMakefileを指定することもができますがこの場合には、makeを動かす作業ディレクトリが`subdir`ではなく、親側のディレクトリであるためおそらくうまく動作しません。たまにハマる人を見かけますのでご注意ください。

```Makefile Makefile（うまく動かない例）
run:
	$(MAKE) -f subdir/Makefile build --no-print-directory
```

余談ですが、おそらく上述の `go build` はbatch, sendなどのパッケージ間で依存関係はないので、並列実行ができそうです（元の書き方では、batch→send→receive→job→webapiの順番で同期的に動作します）

面倒ですが個別にターゲットを定義する＋前提条件（Prerequisites）に追加すると、並列実行できます（前提条件同士は依存が無いと認識できるので、makeが並列で動かしてくれます）。例えばCIでビルドが可能か一括でチェックしているなどの場面で高速化したいケースがあるかと思います。

```Makefile
build-batch: ## build all batch packages
    $(MAKE) -C batch build --no-print-directory

build-send: ## build all send packages 
    $(MAKE) -C send build --no-print-directory

build-receive: ## build all receive packages 
    $(MAKE) -C receive build --no-print-directory

build-job: ## build all job packages 
    $(MAKE) -C job build --no-print-directory

build-webapi: ## build all webapi package
    $(MAKE) -C webapi build --no-print-directory

build: build-batch build-send build-receive build-job build-webapi
```

実行する場合には、`-j` オプションで並列度を指定します。

```
make build -j 4
```

ここまでチューニングが必要な場合、このMakefileを手動でメンテナンスすることは大変なので、Makefileを自動生成するコードを準備すると良さそうです。

## CIサービスとの棲み分け

意識しないと、 `make` と CI（CircleCIやGitHub Actions）で用いるYAMLに重複した内容を記述してしまいがちです。ポリシーとしては、リント・フォーマッタ・ビルド・デプロイなど基本的な操作はMakefileに記載し、CIからは makeコマンド経由でそれらを呼び出す形がよいでしょう。

例えば、[CircleCIにはテスト並列](https://circleci.com/docs/parallelism-faster-jobs/)の仕組みがあります。Go側のテストがDBのデータに依存し、 `go test -p 4` で分割すると、同じテーブルに対しての複数のテストで書き込みされることでうまく動作しないことがあります。そのため、アプリ・DBのセットでまとめて並列実行してくれるようなCI側の仕組みを用いると便利です。

この場合もYAMLに記載するのではなく、Makefile側に `circleci tests split` というテスト並列の仕組みを記載すると統一感を維持できます。あまり Makefileにif文を記載するのはおすすめしませんが、この程度であれば許容しても良いでしょう。

```Makefile Makefile
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: test

PACKAGES ?= $(shell go list ./...)
ifneq ($(CIRCLECI),)
	PACKAGES=$(shell go list ./... | circleci tests split --split-by=timings)
endif

test: ## test calls go test
	go test -p 1 -race -timeout 30m $(PACKAGES)
```

## 環境別のデプロイ

CI/CDパイプラインが整理されており、開発者が手動でデプロイするケースが減っているかもしれませんが、緊急パッチなど運用として環境別のデプロイが行えると一定の利便性があると思います。よくある構成例として、develop（dev）, staging（stg）, production（prod） の3つの環境へのデプロイを行うとします。

通常は各環境でリソース名に命名体系を持たせることが多いため、環境識別子だけ異なるにコマンドが並んでしまうと見通しが悪い場合があります。一方で、makeの引数に環境識別子を渡すときのチェックも行いたいです。そこで[make は強いタスクランナーだった。Lambda Function のライフサイクルを Makefile でまわす | DevelopersIO](https://dev.classmethod.jp/articles/lambda-deploy-with-make/) にあるように、`gurd-%`のターゲットを前提条件とすることで、環境識別子（env）を必須入力とさせることがおすすめです。

また、`deploy-dev`, `deploy-stg`, `deploy-prod` などのターゲット名を宣言すると、ターミナルの補完が効くため利便性が高くなります。合わせると以下のような設定になると思います。AWS Lambdaにデプロイする例で書いています。

```Makefile Makefile
# ...(省略)....

deploy-dev: ## deploy development
	$(MAKE) deploy env=dev -s

deploy-stg: ## deploy staging
	$(MAKE) deploy env=stg -s

deploy-prod: ## deploy production
	$(MAKE) deploy env=prod -s

deploy: guard-env build
	echo "deploy ${env}"
	aws lambda update-function-code --profile my_${env} --region ap-northeast-1 --function-name ${env}-fuga-web-api --zip-file fileb://bin/bootstrap.zip

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "[ERROR] Environment variable $* not set"; \
		exit 1; \
	fi
```

本来であれば、 `deploy` や `guard-%` のターゲットはプライベート関数のような扱いで、直接開発者には呼び出しも補完もされず非可視化したかったのですが、残念ながらmakeにはそのような仕組みはありません（共通化したいターゲットを別Makefileにしてincludeしても無駄でした）。どこまでコードの冗長さを許容するかですが、扱うリソースや環境は増えやすいので、これくらいの集約は行ったほうがオススメしたいと思います。

## help

[Makefileを自己文書化する | POSTD](https://postd.cc/auto-documented-makefile/) から流用して、ファイルの最後に次のようにhelpコマンドを追加します。そうすると、 ターゲットの右側に `help: ## display this help screen` といったコメントを記載すると、helpコマンドで内容が表示されるようになります。

```Makefile
# ...(省略)...
.DEFAULT_GOAL := help
# ...(省略)...

help: ## display this help screen
    @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
```

```sh
$ make help
run                  run launches go server
test                 test calls go test
deploy-dev           deploy development
deploy-stg           deploy staging
deploy-prod          deploy production
help                 display this help screen
```

さきほど、`deploy`、`guard-%` などのターゲットは内部処理用でなるべく外に出したくないという話をしました。完全ではないですが、この`help`コマンドではそういった内部処理用のターゲットはコメントを書かないことで、公開用のターゲットではないという意図を込めることができます（やや婉曲的ですが）。

もし、ターゲットの右側にコメントを書くのではなく、以下のようにコメント＋改行で表現したい場合は、Songmuさんの[Songmu/make2help](https://github.com/Songmu/make2help)というツールもあります。コメントを記載するお作法としてはこちらの方がおそらく直感的であるため、コマンドのインストールが必要ですが、チームの方針としてこちらを採用することもお勧めです。

```Makefile
## Run tests
test:
    go test ./...

## Show help
help:
  @make2help $(MAKEFILE_LIST)
```

## ターゲット名をtypoした場合にhelpメッセージを出す

趣味的な作り込みですが、`make bulid` や `make h`のように、タイポしたり短縮形のコマンドを入力してしまった場合に、helpメッセージを出したいとします（helpが実装されているかどうか気が付かない場合があるので、気づきやすくする目的です）。その場合、全てに一致する `%` というターゲットを利用するのも手です。

例として次のように定義します。

```Makefile
%:
	@echo 'command "$@" is not found.'
	@$(MAKE) help
	@exit 2
```

実行すると、 "h" というターゲット名が存在しない場合は、helpの内容を出すことができます。

```sh
$ make h
command "h" is not found.
run                  run launches go server
test                 test calls go test
deploy-dev           deploy development
deploy-stg           deploy staging
deploy-prod          deploy production
help                 display this help screen
make: *** [Makefile:80: 1] エラー 2

$ echo $?
2
```

元の挙動と合わせるために、終了ステータスを2に設定しているため、エラー文が出てしまうのがノイズですね。なるべく `help` を出して問い合わせを減らしたい場合など、状況を見て追加すると良いでしょう。

## 標準的なターゲット名と成果物ファイル名

開発者フレンドリーを目指すと、`make build` でコードがビルドできたほうが直感的でしょう。一方でmakeの成果物管理を考えると、 `go build -o bootstrap main.go` などで用いる、コンパイル対象の.goのファイルや ビルド結果の `bootstrap` をmakeファイルとして定義していきたいです。両者をバランスを取ると、どちらも定義していくことが多いと思います。

例えば次のように、 `build` は `bootstrap` への依存のみで、実態は `bootstrap` 側に処理を記載すると行った具合です。

```Makefile
# ...(省略)...
GO_FILES:=$(shell find . -type f -name '*.go' -print)
# ...(省略)...

build: bootstrap ## build creates go binary
	@:

bootstrap: $(GO_FILES) go.mod go.sum .git/HEAD .git/refs/tags .git/refs/heads
	@GOOS=linux GOARCH=amd64 go build \
		-ldflags="-s -w -buildid= -X main.version=$(shell git describe --tags --abbrev=0) -X main.revision=$(shell git rev-parse --short HEAD)" \
		-trimpath -o bootstrap cmd/main/main.go
```

bootstrapターゲット内で `go build` を行っています。業務でよく使いそうなオプションを渡したり、GitタグやGitリビジョンも埋め込むようにしています。依存関係として `.go` のファイル以外にもgo.mod, go.sum を追加しています。`.git` 系の3フォルダは通常不要ですが、Gitのタグ名やリビジョンをビルド時に含めているため追加しています。他にも `go:embed` で外部ファイルを埋め込みしている場合は個別に依存関係に追加する必要があります（ややこしいので、goファイルが配備されるパッケージ配下すべてを追加するのもありですね）。

`build` ターゲットで `@:` としているのは、もしbootstrapが作成済みの場合に`make: 'build' に対して行うべき事はありません.` という警告を無視するためのハックです。`@`がコマンドを表示させないという意味で、`:` は何も行わないシェルスクリプト側のコマンドです。`@:` は無くても構いません。

他にも有名な標準ターゲットは定義しておくと良いでしょう。追加で私がよく用いるターゲットもまとめます。

```Makefile
all: generate fmt lint test build

setup: ## install tools for development
    @go install xxxx  

generate: ## code generate
    @# コード生成処理があれば

fmt: ## code format
    @# フォーマット処理

lint: ## Lint
    @# リント処理（go vet ./...など）、markdownlint、misspell、govulncheck、など（いくつかは前提条件にしたほうが並列化が効く）

test: ## test calls go test（e.g. make option=-v test、 make option="-v -short" test、 make option="-run TestAttach"）
	date
	go test -race -timeout 30m $(option) ./...

test-coverage: cover.html ## test-coverage displays code coverage per package
	@go tool cover -func cover.out

cover.out:
	@go test -race -timeout 30m -cover ./... -coverprofile=cover.out
	@echo "create cover.out"

cover.html: cover.out
	@go tool cover -html=cover.out -o cover.html
	@echo "create cover.html"

clean: ## Remove output files and clean cache
    @rm -rf bootstrap
    @go clean
```

Goのテストですが、`$(option)` というオプションを追加しています。Goでテスト実行の場合、特定のテストだけ実行したい場合は `-run TestSum` などと指定したいときや、 `-v`、`-short`、`-vet=all` など様々なオプションを渡したいときがあります。その場合にmake経由で対応できるようにするため拡張用に用意しています。

```sh
# 通常
$ make test

# -v を渡したい
$ make option=-v test

# -v と-short を渡したい
$ make option="-v -short" test

# -run を渡したい
$ make option="-run TestCalcPoint" test
```

## まとめ

ここ数年間、業務ではGoを用いてアプリケーションを開発してきました。そのお供にとしてMakefileもよく編集してきたのですが、一度仕様が固まるとめったに書き換えないため、知識が定着しないのが悩みでした。今回、複数チームで利用頻度が高そう＋実践的な内容を抽出して、まとめました。よい機会でした。

それでは良いmakeライフを。ありがとうございました。
