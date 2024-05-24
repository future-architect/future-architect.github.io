---
title: "GoとAWS LambdaのためのMakefile"
date: 2020/10/22 00:00:00
postid: ""
tag:
  - Go
  - AWS
  - Lambda
  - Makefile
category:
  - Programming
thumbnail: /images/20201022/thumbnail.webp
author: 筒井悠平
lede: "筒井です。GoとAWS LambdaのためのMakefileを整理しました。Lambda Functionの増加と同時に増えていくターゲットにはオサラバです。"
---

<img src="/images/20201022/GNU-make.webp" class="img-middle-size" loading="lazy">

筒井です。

GoとAWS LambdaのためのMakefileを整理しました。
Lambda Functionの増加と同時に増えていくターゲットにはオサラバです。


## 前提・ディレクトリ構造

次のようなディレクトリ構造を前提としています。

```bash
.
├── dist
│   ├── func1
│   └── func2
├── handler
│   ├── func1
│   │   └── main.go
│   └── func2
├── lib1
│   ├── lib1.go
│   └── lib1_test.go
├── lib2
├── go.mod
├── go.sum
├── Makefile
└── serverless.yml
```

- dist : ビルドしたバイナリの出力先。このディレクトリを固めてデプロイします
- handler/funcN : 各Lambda Function用のパッケージ
- lib1, lib2 : Lambda Functionが依存するパッケージ（ライブラリ）

またデプロイは[Serverless Framework](https://www.serverless.com/)を使用することを想定しています。
次のようにServerlessの設定を書けば、良い感じにバイナリのみをデプロイ出来るようにします。

```yaml
# serverless.yml
package:
  exclude:
    - ./**
  include:
    - dist/**
```


## Makefile

各Lambda Functionを一気にビルドするためのMakefileです。

```makefile
# Makefile
GO := go
GO_BUILD := $(GO) build
GO_ENV := CGO_ENABLED=0 GOOS=linux
GO_FLAGS := \
	-ldflags="-s -w"
SUFFIX := .go

.PHONY: all
all: handlers

DEPFILES :=

LIBS := \
	lib1 \
	lib2
DEPFILES += $(LIBS:%=%/*$(SUFFIX))

LAMBDA_HANDLER_DIR := handler
LAMBDA_HANDLERS := \
	func1 \
	func2
DEPFILES += $(addprefix $(LAMBDA_HANDLER_DIR)/, $(LAMBDA_HANDLERS:%=%/*$(SUFFIX)))
DIST_DIR := dist
TARGETS := $(LAMBDA_HANDLERS:%=$(DIST_DIR)/%)

$(DIST_DIR)/%: $(LAMBDA_HANDLER_DIR)/% $(DEPFILES) go.sum
	$(GO_ENV) $(GO_BUILD) $(GO_FLAGS) -o $@ ./$<

.PHONY: handlers
handlers: $(TARGETS)

.PHONY: clean
clean:
	$(GO) clean
	rm -rf $(DIST_DIR)
```

これだけだと黒魔術に近いので解説していきます。
変数の扱いがわかりにくと思いますので、コメントで展開例を記載しています。

まずターゲット `handlers` の依存に、各バイナリを追加します。

```makefile
# TARGETS := dist/func1 dist/func2
TARGETS := $(LAMBDA_HANDLERS:%=$(DIST_DIR)/%)

.PHONY: handlers
handlers: $(TARGETS)
```

各バイナリのビルド方法を書きます。
自動変数 `$<` の手前につけた `./` は、相対パスでパッケージを指定する際は必須です。

```makefile
# dist/func1: handler/func1 handler/func1/main.go ... go.sum
$(DIST_DIR)/%: $(LAMBDA_HANDLER_DIR)/% $(DEPFILES) go.sum
    # CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o dist/func1 ./handler/func1
    $(GO_ENV) $(GO_BUILD) $(GO_FLAGS) -o $@ ./$<
```

依存の `$(DEPFILES)` 以下が無くてもビルドは可能です。
しかしここで各ソースファイルを指定しておかないと、Makeがソースの変更を検知できません。

`$(DEPFILES)` には、各パッケージ配下の `.go` ファイルを集めています。

```makefile
DEPFILES :=
LIBS := \
	lib1 \
	lib2
# DEPFILES += lib1/*.go lib2/*.go
DEPFILES += $(LIBS:%=%/*$(SUFFIX))

LAMBDA_HANDLER_DIR := handler
LAMBDA_HANDLERS := \
	func1 \
	func2
# DEPFILES += handler/func1/*.go handler/func2/*.go
DEPFILES += $(addprefix $(LAMBDA_HANDLER_DIR)/, $(LAMBDA_HANDLERS:%=%/*$(SUFFIX)))
```

これで `make handlers` で一度に全てのバイナリがビルドできるようになりました。

また `make -j` で並列実行も出来て便利です。Lambda Functionを追加した際には、`LAMBDA_HANDLERS` を追記するだけでOKです。

`make func1`、`make func2`…と繰り返すのと比べると、「Makefileは直したけどCIの設定ファイルを直してなかった！」なんてことも無く安心ですね。

