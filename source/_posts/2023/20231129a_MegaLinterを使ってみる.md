---
title: "MegaLinterを使ってみる"
date: 2023/11/29 00:00:00
postid: a
tag:
  - Linter
  - Markdownlint
  - GitHubActions
  - 外部寄稿
category:
  - DevOps
thumbnail: /images/2023/20231129a/thumbnail.png
author: 宮永崇史
lede: "MegaLinterを最近個人開発のリポジトリに導入してみたので概要や使い方、所感などを記事にまとめました。"
---
# はじめに

こんにちは、宮永 ( [@orangekame3](https://x.com/orangekame3) ) と申します。

現在は大阪大学で研究員をしておりフューチャー社員ではないですが、外部寄稿という形で記事を執筆しました。

今後も機会があったら寄稿させて頂きますのでよろしくお願いいたします。

---

[MegaLinter](https://megalinter.io/latest/)を最近個人開発のリポジトリに導入してみたので概要や使い方、所感などを記事にまとめました。
とても便利なツールなので本記事を機に利用してみてください。

# MegaLinterとは

MegaLinterはdockerイメージをベースに各種リンターやフォーマッタを各リポジトリに導入できるOSSツールです。ローカルでも利用できますし、dockerイメージが用意されているため、各種CIサービスでも簡単に導入できます。

以下MegaLinterのHPからの引用です。

>MegaLinter is an Open-Source tool for CI/CD workflows that analyzes the consistency of your code, IAC, configuration, and scripts in your repository sources, to ensure all your projects sources are clean and formatted whatever IDE/toolbox is used by their developers, powered by OX Security.
Supporting 55 languages, 24 formats, 20 tooling formats and ready to use out of the box, as a GitHub action or any CI system highly configurable and free for all uses.

55言語というのは55個のLinterツールが用意されている。ということみたいです。例えばGo言語であれば`golangci-lint`と`revive`がサポートされており、これを2つ分とカウントしています。他の言語に関しても1言語1ツールというわけではなく、かなり広範にサポートしているため、普通に利用する分にはMegaLinter1つ入れておけばリンターやフォーマッタはカバーできそうです。

## 概要

基本的なフローは下図のようにコミットがある度にLinterが走り、各種レポートが作成されるというものです。

<div align="center">
▼MegaLinterの基本的なフロー
<img src="/images/2023/20231129a/属性.png" alt="属性" width="1200" height="621" loading="lazy">

</div>

レポートの形式は豊富で、Pull Requestにコメントする方式やEmailに配信する方法などが用意されています。

多くの場合はPull Requestsにコメントする方法を採用するのではないかと思います。

<div align="center">
▼Pull Requestにコメントする例
<img src="/images/2023/20231129a/属性_2.png" alt="属性" width="825" height="499" loading="lazy">
</div>

フォーマッタによってはオートフォーマットが有効なものもあるため、非常に便利です。
「Linterを一箇所に集約して管理したい」「メジャーどころのLinterをとりあえず揃えたい」「LinterをCIに簡単に導入したい」という方にはおすすめのツールです。

一方で、「CIにかかる時間を最適化したい」「MegaLinterにないLinterを使いたい」という方には向かないかもしれないです。

## 実際に使ってみた

サンプル用に"Hello, 世界"と標準出力するGoのファイルを用意します。

コミットID：[0af6a42](https://github.com/orangekame3/megalinter-sample/commit/0af6a42e85460282b43bcbac980ea45c8cc4d79e)([こちらのリポジトリ](https://github.com/orangekame3/megalinter-sample)にサンプルを用意したので参考にしてください)

```go main.go
package main

import "fmt"

func main() {
	fmt.Println("Hello, 世界")
}
```

MegaLinterにはインタラクティブに設定ファイルを生成するコマンドが用意されているので、そちらを利用します。

以下コマンドをプロジェクト直下で実行してください。

::: note info
[node.js](https://nodejs.org/en/)はインストールされているものとします。
:::

```shell
npx mega-linter-runner --install
```

コマンドを実行すると

下図のようなプロンプトが立ち上がるので選択をしていきます。
<img src="/images/2023/20231129a/image.png" alt="image.png" width="1153" height="356" loading="lazy">

今回はGoのプロジェクトを選択しています。自分の環境に合わせて選択してください。

すべて選択し終えると設定ファイルが自動生成されます。
以下、この断面のコミットIとディレクトリ構成です。
コミットID：[98c3d85](https://github.com/orangekame3/megalinter-sample/commit/98c3d85d333584f067f3ed47da3f97e51eaf0eeb)

```shell
.
├── .github
│   └── workflows
│       └── mega-linter.yml
├── .gitignore
├── .jscpd.json
├── .mega-linter.yml
├── README.md
└── main.go
```

主に編集する設定ファイルは`.mega-linter.yml`です。

```yml .megalinter.yml
# Configuration file for MegaLinter
#
# See all available variables at https://megalinter.io/configuration/ and in
# linters documentation

# all, none, or list of linter keys
APPLY_FIXES: all

# If you use ENABLE variable, all other languages/formats/tooling-formats will
# be disabled by default
# ENABLE:

# If you use ENABLE_LINTERS variable, all other linters will be disabled by
# default
# ENABLE_LINTERS:

# DISABLE:
  # - COPYPASTE # Uncomment to disable checks of excessive copy-pastes
  # - SPELL # Uncomment to disable checks of spelling mistakes

SHOW_ELAPSED_TIME: true

FILEIO_REPORTER: false

# Uncomment if you want MegaLinter to detect errors but not block CI to pass
# DISABLE_ERRORS: true

```

デフォルトの設定ではLinterが多すぎるため必要なLinterのみ有効化します。今回は初期設定時にGoのプロジェクトを選択したため、Go Flavorを利用しています。

::: note info
FlavorとはMegaLinterで用意している言語ごとのプリセットです。
:::

Go Flavorに採用されているLinterは[こちら](https://megalinter.io/latest/flavors/go/)で確認できます。

今回はGoのLinterとしてRivive、MarkdownのLinterとしてMarkdownlintを利用します。

```diff
+ENABLE_LINTERS:
+  - GO_REVIVE
+  - MARKDOWN_MARKDOWNLINT
```

ではローカルでLinterを実行してみます。MegaLinterはdockerを利用するため、ローカル環境のDockerエンジンを起動して以下コマンドを実行してください。

```shell
npx mega-linter-runner --flavor go
```

コマンドを実行するとLinterが走ります。
以下実行結果です。

```shell
npx mega-linter-runner --flavor go
Pulling docker image oxsecurity/megalinter-go:v7 ...
INFO: this operation can be long during the first use of mega-linter-runner
The next runs, it will be immediate (thanks to docker cache !)
v7: Pulling from oxsecurity/megalinter-go
Digest: sha256:d3f363206d1f99a5b1def54ed4f6601bd6dbb03d1fd04e5731dafe9813f6ef12
Status: Image is up to date for oxsecurity/megalinter-go:v7
docker.io/oxsecurity/megalinter-go:v7
Command: docker run --platform linux/amd64 -v /var/run/docker.sock:/var/run/docker.sock:rw -v C:\Users\miyao\megalinter-sample:/tmp/lint:rw oxsecurity/megalinter-go:v7
Skipped setting git safe.directory DEFAULT_WORKSPACE:  ...
Setting git safe.directory default: /github/workspace ...
Setting git safe.directory to /tmp/lint ...
[MegaLinter init] ONE-SHOT RUN
[config] /tmp/lint/.mega-linter.yml + Environment variables

    .:oool'                                  ,looo;
    .xNXNXl                                 .dXNNXo.
     lXXXX0c.                              'oKXXN0;
     .oKNXNX0kxdddddddoc,.    .;lodddddddxk0XXXX0c
      .:kKXXXXXXXXXXXXNXX0dllx0XXXXXXXXXXXXXXXKd,
        .,cdkOOOOOOOO0KXXXXXXXXXXK0OOOOOOOkxo:'
                      'ckKXNNNXkc'
              ':::::;.  .c0XX0l.  .;::::;.
              'xXXXXXx'   :kx:   ;OXXXXKd.
               .dKNNXXO;   ..   :0XXXXKl.
                .lKXXXX0:     .lKXXXX0:
                  :0XXXXKl.  .dXXXXXk,
                   ;kXXXXKd:cxXXXXXx'
                    'xXNXXXXXXXXXKo.
                     .oKXXXXNXXX0l.
                      .lKNNXNNXO:
                        ,looool'

==========================================================
=============   MegaLinter, by OX.security   =============
=========  https://ox.security?ref=megalinter  ===========
==========================================================

----------------------------------------------------------------------------------------------------
------------------------------------ MegaLinter, by OX Security ------------------------------------
----------------------------------------------------------------------------------------------------
 - Image Creation Date: 2023-09-22T15:10:52Z
 - Image Revision: a87b2872713c6bdde46d2473c5d7ed23e5752dc2
 - Image Version: v7.4.0
----------------------------------------------------------------------------------------------------
The MegaLinter documentation can be found at:
 - https://megalinter.io/7.4.0
----------------------------------------------------------------------------------------------------
MegaLinter initialization
MegaLinter will analyze workspace [/tmp/lint]

MARKDOWN_REMARK_LINT has been temporary disabled in MegaLinter, please use a previous MegaLinter version or wait for the next one !
Skipped linters: ACTION_ACTIONLINT, ANSIBLE_ANSIBLE_LINT, ARM_ARM_TTK, BASH_EXEC, BASH_SHELLCHECK, BASH_SHFMT, BICEP_BICEP_LINTER, CLOJURE_CLJSTYLE, CLOJURE_CLJ_KONDO, CLOUDFORMATION_CFN_LINT, COFFEE_COFFEELINT, COPYPASTE_JSCPD, CPP_CPPLINT, CSHARP_CSHARPIER, CSHARP_DOTNET_FORMAT, CSS_SCSS_LINT, CSS_STYLELINT, C_CPPLINT, DART_DARTANALYZER, DOCKERFILE_HADOLINT, EDITORCONFIG_EDITORCONFIG_CHECKER, ENV_DOTENV_LINTER, GHERKIN_GHERKIN_LINT, GO_GOLANGCI_LINT, GRAPHQL_GRAPHQL_SCHEMA_LINTER, GROOVY_NPM_GROOVY_LINT, HTML_DJLINT, HTML_HTMLHINT, JAVASCRIPT_ES, JAVASCRIPT_PRETTIER, JAVASCRIPT_STANDARD, JAVA_CHECKSTYLE, JAVA_PMD, JSON_ESLINT_PLUGIN_JSONC, JSON_JSONLINT, JSON_NPM_PACKAGE_JSON_LINT, JSON_PRETTIER, JSON_V8R, JSX_ESLINT, KOTLIN_KTLINT, KUBERNETES_HELM, KUBERNETES_KUBECONFORM, KUBERNETES_KUBESCAPE, LATEX_CHKTEX, LUA_LUACHECK, MAKEFILE_CHECKMAKE, MARKDOWN_MARKDOWN_LINK_CHECK, MARKDOWN_MARKDOWN_TABLE_FORMATTER, MARKDOWN_REMARK_LINT, OPENAPI_SPECTRAL, PERL_PERLCRITIC, PHP_PHPCS, PHP_PHPLINT, PHP_PHPSTAN, PHP_PSALM, POWERSHELL_POWERSHELL, POWERSHELL_POWERSHELL_FORMATTER, PROTOBUF_PROTOLINT, PUPPET_PUPPET_LINT, PYTHON_BANDIT, PYTHON_BLACK, PYTHON_FLAKE8, PYTHON_ISORT, PYTHON_MYPY, PYTHON_PYLINT, PYTHON_PYRIGHT, PYTHON_RUFF, RAKU_RAKU, REPOSITORY_CHECKOV, REPOSITORY_DEVSKIM, REPOSITORY_DUSTILOCK, REPOSITORY_GITLEAKS, REPOSITORY_GIT_DIFF, REPOSITORY_GRYPE, REPOSITORY_KICS, REPOSITORY_SECRETLINT, REPOSITORY_SEMGREP, REPOSITORY_SYFT, REPOSITORY_TRIVY, REPOSITORY_TRIVY_SBOM, REPOSITORY_TRUFFLEHOG, RST_RSTCHECK, RST_RSTFMT, RST_RST_LINT, RUBY_RUBOCOP, RUST_CLIPPY, R_LINTR, SALESFORCE_SFDX_SCANNER_APEX, SALESFORCE_SFDX_SCANNER_AURA, SALESFORCE_SFDX_SCANNER_LWC, SCALA_SCALAFIX, SNAKEMAKE_LINT, SNAKEMAKE_SNAKEFMT, SPELL_CSPELL, SPELL_LYCHEE, SPELL_PROSELINT, SPELL_VALE, SQL_SQLFLUFF, SQL_SQL_LINT, SQL_TSQLLINT, SWIFT_SWIFTLINT, TEKTON_TEKTON_LINT, TERRAFORM_TERRAFORM_FMT, TERRAFORM_TERRAGRUNT, TERRAFORM_TERRASCAN, TERRAFORM_TFLINT, TSX_ESLINT, TYPESCRIPT_ES, TYPESCRIPT_PRETTIER, TYPESCRIPT_STANDARD, VBDOTNET_DOTNET_FORMAT, XML_XMLLINT, YAML_PRETTIER, YAML_V8R, YAML_YAMLLINT
To receive reports as email, please set variable EMAIL_REPORTER_EMAIL

MegaLinter now collects the files to analyse
Listing all files in directory [/tmp/lint], then filter with:
- File extensions: .go, .md
- Excluding .gitignored files [39]: megalinter-reports/.cspell.json, megalinter-reports/IDE-config.txt, megalinter-reports/IDE-config/.checkov.yml, megalinter-reports/IDE-config/.eslintrc-json.json, megalinter-reports/IDE-config/.gitleaks.toml, megalinter-reports/IDE-config/.golangci.yml, megalinter-reports/IDE-config/.grype.yaml, megalinter-reports/IDE-config/.idea/externalDependencies.xml, megalinter-reports/IDE-config/.markdown-link-check.json, megalinter-reports/IDE-config/.markdownlint.json,…(full list in DEBUG)
Kept [2] files on [7] found files

+----MATCHING LINTERS-------+----------+----------------+------------+
| Descriptor | Linter       | Criteria | Matching files | Format/Fix |
+------------+--------------+----------+----------------+------------+
| GO         | revive       | .go      | 1              | no         |
| MARKDOWN   | markdownlint | .md      | 1              | yes        |
+------------+--------------+----------+----------------+------------+

Processing linters on [4] parallel cores…
✅ Linted [MARKDOWN] files with [markdownlint] successfully - (1.93s)
- Using [markdownlint v0.37.0] https://megalinter.io/7.4.0/descriptors/markdown_markdownlint
- MegaLinter key: [MARKDOWN_MARKDOWNLINT]
- Rules config: [.markdownlint.json]
- Number of files analyzed: [1]

❌ Linted [GO] files with [revive]: Found 1 error(s) - (9.25s)
- Using [revive v1.3.4] https://megalinter.io/7.4.0/descriptors/go_revive
- MegaLinter key: [GO_REVIVE]
- Rules config: identified by [revive]
- Number of files analyzed: [1]
--Error detail:
main.go:1:1: should have a package comment



+----SUMMARY--+--------------+---------------+-------+-------+--------+--------------+
| Descriptor  | Linter       | Mode          | Files | Fixed | Errors | Elapsed time |
+-------------+--------------+---------------+-------+-------+--------+--------------+
| ❌ GO       | revive       | list_of_files |     1 |       |      1 |        9.25s |
| ✅ MARKDOWN | markdownlint | list_of_files |     1 |     0 |      0 |        1.93s |
+-------------+--------------+---------------+-------+-------+--------+--------------+

[Updated Sources Reporter] copied 1 fixed source files in folder /tmp/lint/megalinter-reports/updated_sources.
Download it from artifacts then copy-paste it in your local repo to apply linters updates
❌ Error(s) have been found during linting
To disable linters or customize their checks, you can use a .mega-linter.yml file at the root of your repository
More info at https://megalinter.io/7.4.0/configuration/
```

Goでエラーが出ていますね。出力結果の最後にレポートが出力されるため、Linterの結果がわかりやすいです。

では該当の部分を修正して再度Linterを走らせます。

```shell
❌ Linted [GO] files with [revive]: Found 1 error(s) - (9.25s)
- Using [revive v1.3.4] https://megalinter.io/7.4.0/descriptors/go_revive
- MegaLinter key: [GO_REVIVE]
- Rules config: identified by [revive]
- Number of files analyzed: [1]
--Error detail:
main.go:1:1: should have a package comment
```

reviveのログを確認すると、packageのコメントを記載していなかったことが原因そうです。

以下のようにmain.goを修正します。

```go main.go
// Package main print "Hello 世界"
package main

import "fmt"

func main() {
	fmt.Println("Hello, 世界")
}
```

以下再実行した結果です。エラーが解消したことを確認できます。

```shell
+----MATCHING LINTERS-------+----------+----------------+------------+
| Descriptor | Linter       | Criteria | Matching files | Format/Fix |
+------------+--------------+----------+----------------+------------+
| GO         | revive       | .go      | 1              | no         |
| MARKDOWN   | markdownlint | .md      | 1              | yes        |
+------------+--------------+----------+----------------+------------+

Processing linters on [4] parallel cores…
✅ Linted [MARKDOWN] files with [markdownlint] successfully - (1.3s)
- Using [markdownlint v0.37.0] https://megalinter.io/7.4.0/descriptors/markdown_markdownlint
- MegaLinter key: [MARKDOWN_MARKDOWNLINT]
- Rules config: [.markdownlint.json]
- Number of files analyzed: [1]

✅ Linted [GO] files with [revive] successfully - (7.38s)
- Using [revive v1.3.4] https://megalinter.io/7.4.0/descriptors/go_revive
- MegaLinter key: [GO_REVIVE]
- Rules config: identified by [revive]
- Number of files analyzed: [1]


+----SUMMARY--+--------------+---------------+-------+-------+--------+--------------+
| Descriptor  | Linter       | Mode          | Files | Fixed | Errors | Elapsed time |
+-------------+--------------+---------------+-------+-------+--------+--------------+
| ✅ GO       | revive       | list_of_files |     1 |       |      0 |        7.38s |
| ✅ MARKDOWN | markdownlint | list_of_files |     1 |     0 |      0 |         1.3s |
+-------------+--------------+---------------+-------+-------+--------+--------------+

[Updated Sources Reporter] copied 2 fixed source files in folder /tmp/lint/megalinter-reports/updated_sources.
Download it from artifacts then copy-paste it in your local repo to apply linters updates
✅ Successfully linted all files without errors
```

## PR上のコメント機能

では、このブランチをリモートリポジトリにPushしてPR上のコメントを確認します。

以下がPR上でのコメントの様子です。

<img src="/images/2023/20231129a/image_2.png" alt="image.png" width="651" height="725" loading="lazy">

表形式にまとめてくれているため、非常にわかりやすいですね。

PRは[こちら](https://github.com/orangekame3/megalinter-sample/pull/1)です。

# さいごに

以上、 MegaLinterの紹介と簡単な利用方法を解説しました。

欲を言うと[Reviewdog](https://github.com/reviewdog/reviewdog)のようなツールと簡単に連携できると嬉しいです。Reviewdogの[Issue#841](https://github.com/reviewdog/reviewdog/issues/841)で議論されているようですが、まだ簡単に連携できる状態ではなさそうです。

とりあえず、Linterを導入したいと言う方には非常におすすめなツールですのでぜひ活用してみてください。
