---
title: "GitHub 標準の Annotation を活用してレビューを可視化する"
date: 2025/06/04 00:00:00
postid: a
tag:
  - GitHub
  - GitHubActions
  - CI/CD
category:
  - DevOps
thumbnail: /images/2025/20250604a/thumbnail.png
author: 武田大輝
lede: "コードレビューを自動で可視化するためのツールといえばreviewdogが有名です。"
---
[CI/CD連載](/articles/20250603a/) 2本目の記事です。

## はじめに

コードレビューを自動で可視化するためのツールといえば [reviewdog](https://github.com/reviewdog) が有名です。

最近（2025年03月）reviewdog のソースリポジトリが侵害され、reviewdog を実行しているリポジトリにおいて [シークレット情報がワークフロー上に漏洩するセキュリティインシデントが発生](https://www.wiz.io/blog/new-github-action-supply-chain-attack-reviewdog-action-setup) したことは記憶に新しいでしょう。

筆者も reviewdog にはお世話になっている開発者の一人ですが、本件を受けて「そもそも GitHub の標準機能だけで同じようなことができないか」という考えを持ち、あらためて GitHub 標準の Annotation 機能について調べてみた記事になります。

なお、reviewdog 自体の有用性を否定するものでは一切ありません。

## レビューの可視化とは

まず誤解のないよう本記事における「レビューの可視化」とは具体的に何を指すのかを説明しておきます。

レビューの可視化とは、Linter や Formatter などソースコードの解析結果をもとに、結果をわかりやすく表示してくれるしくみのことを指しています。実際にソースコードのエラーや警告を検出する部分の話ではなく、その結果を解析してよい感じに開発者へフィードバックしてくれる部分の話となります。

## reviewdog とは

reviewdog は Linter や Formatter などの出力結果を GitHub などのコードホスティングサービス上にコメントなどで投稿してくれるツールです。

その思想や誕生の背景については、開発者のブログを貼る形で本記事では割愛したいと思います。

<http://haya14busa.com/reviewdog/>

## GitHub Annotation とは

GitHub Annotation（アノテーション）とは、GitHub Actions のワークフロー実行中に出力されるエラーや警告などを、対象のファイルや行に紐付けて GitHub の UI 上に表示する標準のしくみです。公式ドキュメントでは、GitHub Actions のワークフローコマンドの中で説明されています。

<https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions>

具体的には `::error`, `::warning`, `::notice` といったコマンドをファイルパスや行数とともに出力することで、アノテーションを作成できます。

```text
::error file={name},line={line},endLine={endLine},title={title}::{message}
```

実際にアノテーションを作成するサンプルを見てみましょう。
次のようなワークフローファイルを作成して GitHub Actions を実行してみます。`echo "::error ..."` や `echo "::warning..."` と記載している部分がコマンド部分になります。

```yaml
name: Emit Annotation Directly

on:
  pull_request:
  workflow_dispatch:

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Emit Error and Warning Annotations
        run: |
          echo "::error file=.github/workflows/annotation.yaml,line=16,col=5::Example Error: This is a sample error message for demonstration purposes."
          echo "::warning file=.github/workflows/annotation.yaml,line=17,col=5::Example Warning: This is a sample warning message for demonstration purposes."
```

このワークフローを実行して GitHub Actions の実行結果サマリをみると [次のように](https://github.com/rhumie/github-annotation-demo/actions/runs/14806970834) アノテーションが出力されます。

<img src="/images/2025/20250604a/annotations_in_summary.png" alt="annotations_in_summary.png" width="1200" height="653" loading="lazy">

また、このワークフローが PR（Pull Request）をトリガとして実行されている場合は、 [次のように](https://github.com/rhumie/github-annotation-demo/pull/1/files) PR の「Files changed」タブから該当する箇所にインラインでアノテーションが表示されていることが確認できます。

<img src="/images/2025/20250604a/annotations_in_pull_request.png" alt="annotations_in_pull_request.png" width="1200" height="726" loading="lazy">

このように、GitHub Annotation を活用することで該当ファイル・該当行にピンポイントでメッセージを表示できます。
サンプルではファイルや行数をベタ書きしましたが、 Linter や Formatter などの解析ツールと組み合わせることで、これらのツールの実行結果をアノテーションとしてユーザにフィードバックできます。

## GitHub Annotation の実践的な活用方法

GitHub Annotation の概要について理解できたところで、実践的な使い方について説明していきます。

### Problem Matcher の利用

[Problem Matcher](https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md) とは、GitHub Actions におけるログ出力からエラーや警告の情報を自動的に抽出し、アノテーションとして表示するためのしくみです。

先ほどの例では直接 `echo "::error ..."` と記述していましたが、これをより汎用的に使いやすくした機能だと理解してもらえれば OK です。

Problem Matcher はパターン（正規表現）を JSON 形式で定義することで、任意のツールの出力形式にマッチさせます。
公式ドキュメントにも記載されている ESLint の出力結果に対応させる例をみてみましょう。

```text
test.js
  1:0   error  Missing "use strict" statement                 strict
  5:10  error  'addOne' is defined but never used             no-unused-vars
✖ 2 problems (2 errors, 0 warnings)
```

#### 設定ファイル

この ESLint の出力結果に対応する Problem Matcher の設定ファイルは次のとおりです。

```json
{
  "problemMatcher": [
    {
      "owner": "eslint-stylish",
      "pattern": [
        {
          // Matches the 1st line in the output
          "regexp": "^([^\\s].*)$",
          "file": 1
        },
        {
          // Matches the 2nd and 3rd line in the output
          "regexp": "^\\s+(\\d+):(\\d+)\\s+(error|warning|info)\\s+(.*)\\s\\s+(.*)$",
          // File is carried through from above, so we define the rest of the groups
          "line": 1,
          "column": 2,
          "severity": 3,
          "message": 4,
          "code": 5,
          "loop": true
        }
      ]
    }
  ]
}
```

ESLint の出力のように、最初にファイル名が 1 行だけ表示され、その後に複数のエラーや警告が続く「マルチライン形式」の出力に対応するため、Problem Matcher では複数の `pattern` を組み合わせて定義できます。

最初のパターンでは、ファイル名の行を検出します。正規表現（`"regexp": "^([^\\s].*)$"`）により、先頭が空白で始まらない行をファイル名として抽出し、ファイル名として指定（`"file": 1`）しています。ここでの 1 は、正規表現内の括弧 () によって囲まれた 1 番目のキャプチャグループを指しています。

最初のパターンはファイル名の出力に対応する部分となります。正規表現（`"regexp": "^([^\\s].*)$"`）でマッチした部分をファイル名（`"file": 1`）として設定しています。`"file": 1` の `1` は正規表現のキャプチャグループの番号を表しています。
続く 2 つ目のパターンでは、各エラー・警告行の情報（行番号、列番号、深刻度、メッセージ、ルール名など）をそれぞれのキャプチャグループから取り出し、アノテーションとして表示するための各要素にマッピングしています。各要素は次のとおりです。

| 項目     | 説明                                 | 実際の値                       |
| -------- | ------------------------------------ | ------------------------------ |
| line     | 行番号                               | 1                              |
| column   | 列番号                               | 0                              |
| severity | エラーの重大度                       | error                          |
| message  | メッセージ                           | Missing "use strict" statement |
| code     | メッセージに対応するルール名や識別子 | strict                         |

最後の `"loop": true` は、同じファイルに対して複数行のエラー・警告が連続して出力される場合に、1 回目に取得したファイル名を保持したまま、後続の行に繰り返しこのパターンを適用するための設定です。

#### 登録と削除

Problem Matcher は、GitHub Actions のワークフロー内で `::add-matcher::` および `::remove-matcher::` コマンドを使用することで動的に登録・削除できます。

たとえば、先ほどの `eslint-matcher.json` ファイルを `.github/matchers/` ディレクトリに保存した場合、次のように登録できます。

```yaml
- name: Add ESLint Problem Matcher
  run: echo "::add-matcher::.github/matchers/eslint-matcher.json"
```

このようにすると、以降のステップで ESLint の出力に応じたアノテーションが自動的に表示されます。
不要になった場合は、次のように削除します。

```yaml
- name: Remove ESLint Problem Matcher
  run: echo "::remove-matcher::eslint-stylish"
```

ここで指定する `eslint-stylish` は、Problem Matcher の設定ファイル内で定義した `owner` に対応しています。

ただし、実際のところ ESLint を GitHub Actions 上で実行する場合、通常この登録処理を明示的に記述することはありません。
なぜなら、ESLint を実行する前には一般的に [actions/setup-node](https://github.com/actions/setup-node/tree/main) を使って Node.js のセットアップを行いますが、このステップの中で [ESLint 用の Problem Matcher](https://github.com/actions/setup-node/blob/main/.github/eslint-stylish.jsons) が自動的に登録されるためです。

ほかにも `setup-python` や `setup-go` そして `setup-dotnet` などでも言語に応じて標準的な Problem Matcher が登録されるようになっています。

### GitHub Annotation にネイティブに対応しているツールの利用

Python 用の Linter である [Ruff](https://github.com/astral-sh/ruff) など GitHub Annotation に対応した出力をサポートしているツールもあります。
Ruff では `--output-format` に `github` を指定することで、次のような出力を得ることができます。

```shell
ruff check test.py --output-format github
::error title=Ruff (F401),file=test.py,line=1,col=8,endLine=1,endColumn=10::test.py:1:8: F401 `os` imported but unused
```

## GitHub Annotation の制約

GitHub Actions はワークフロー実行時のアノテーション数を次のように制限しています。
<https://github.com/orgs/community/discussions/26680>

- 1 ステップ（ワークフロー定義の `run` や `uses` の単位）あたりエラー 10 件、警告 10 件、通知 10 件
- 1 ジョブ（ワークフロー定義のステップを 1 つ以上含む `jobs` の単位）あたり 50 件
- 1 実行（ワークフローの実行）あたり 50 件

大量にエラーや警告が出力される場合は、一度にすべてを表示できないため、注意が必要です。
ただし通常 Linter などはローカルでも動作させてエラーを確認できるため、このあたりは割り切れるケースが多いのではないでしょうか。

## reviewdog との比較

ここまで GitHub 標準の Annotation 機能を紹介してきましたが、先に紹介した reviewdog と比較したときのメリット・デメリットを整理しておきます。

Annotation 機能を利用するメリットは次のとおりです。

- **サードバーティのアクションに依存しない**
  GitHub が公式に提供しているしくみであり、追加のツールや依存パッケージを導入する必要がありません。
- **パーミッションの付与が不要でセキュア**
  reviewdog を使用する場合は GitHub API を操作するため、GITHUB_TOKEN を使います。一方、Annotation 機能はログ出力ベースで動作するため、追加の認証情報を必要とせずセキュリティ的に安心です。
- **GitHub API の Rate Limit を気にしなくてよい**
  reviewdog は PR コメントを投稿する際に GitHub API を呼び出すため、大量のコメントや高頻度の実行で Rate Limit に引っかかる恐れがあります。Annotation はログ出力ベースで動作するため、Rate Limit の考慮は不要です。
- **標準機能であるため将来的な安定性が高い**
  GitHub が提供するしくのため、GitHub Actions のアップデートや仕様変更にも継続的に対応される可能性が高く、メンテナンスコストや不具合のリスクが比較的小さいと考えられます。

Annotation 機能にはない、reviewdog ならではのメリットは次のとおりです。

- **コメントの対象を差分ファイルに限定できる**
  reviewdog では、差分のある行に限定してコメントを残すことができるため、古いコードや無関係な部分に過剰にコメントが付与されることを防げます。これにより、修正しなければならない対象が明確になります。
- **多くのツールに標準で対応している**
  reviewdog は [Checkstyle 形式](https://checkstyle.sourceforge.io/) や [SARIF 形式](https://sarifweb.azurewebsites.net/) など [さまざまな形式に標準で対応](https://github.com/reviewdog/reviewdog?tab=readme-ov-file#input-format) しており、自分でフォーマットを定義しなくてもさまざまなツールに対応するできます。
- **PR コメントとして明示的に残せる**
  reviewdog は PR 上に直接コメントを残すことができます。これにより通知などでレビューイが気付きやすく、PR 上でディスカッションするトリガにもなります。
  そのほか、GitHub の Annotation や GitHub PR Checks などの出力にも対応しており、さまざまな出力先を選べるのが特徴です。
- **GitHub 以外のプラットフォームに対応できる**
  GitLab や Bitbucket など、複数の SCM プラットフォームで利用可能な点も reviewdog の強みです。マルチリポジトリ・マルチサービス環境を前提とした CI にも対応できます。

## どちらを使うべきか

機能的には当然 GitHub Annotation より reviewdog の方が高機能です。

当たり前のことを言ってしまえば、reviewdog の機能が必要であれば reviewdog を使うべきですし、GitHub Annotation で事足りるなら標準機能のみで実現する形が望ましいでしょう。

根本的にはフラットに比較すべきものではないような気がします。

おそらく多くの場合ポイントになるのは、差分出力ではないでしょうか。

ここについては Linter や Formatter が導入されていない既存のコードに対して後から CI を導入する場合は、大量のエラーや警告が発生し、それがノイズになることが多くあります。逆に、新規開発において始めから PR 駆動できっちりと CI を回すケースにおいては、全件出力でも問題にならないでしょう。

## おわりに

案外 GitHub Annotation でもやれるんじゃないか、という記事でした。
