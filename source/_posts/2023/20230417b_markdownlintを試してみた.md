---
title: "markdownlintで設計書の品質を高める"
date: 2023/04/17 00:00:01
postid: b
tag:
  - Markdown
  - Linter
  - Markdownlint
  - ドキュメント
category:
  - DevOps
thumbnail: /images/2023/20230417b/thumbnail.png
author: 真野隼記
lede: "Markdownで設計書を充実させようとすればするほど、設計書間やメンバー間のちょっとした揺れで、本質的なレビューがしにくく感じるようになりました。そこでMarkdownのLintツールを導入するモチベーションが高まりました。"
---

<img src="/images/2023/20230417b/Microsoft.VisualStudio.Services.Icons.png" alt="" width="128" height="128">

## はじめに

フューチャー技術ブログのリレー形式の連載である、[春の入門祭り2023](/articles/20230417a/)の1日目です。TIG真野です。

ここ数年、Markdownで設計書をチームで書き、GitHub（GitLab）上でレビューするフローを採用しています。なるべくテキストベースで設計開発フローを統一するため、私の所属するチームでは以下のようなツールを採用しています。

* シーケンス図、業務フロー図
  * Markdown中にPlantUMLで記載
  * 参照はGitHub上からも見れるように、[pegmatite](https://chrome.google.com/webstore/detail/pegmatite/jegkfbnfbfnohncpcfcimepibmhlkldo) を利用
* システム構成図など画像系
  * Diagrams.net（draw.io）で作成し、`.drawio.png` の拡張子でMarkdownから参照
  * これだけは目視で差分チェックとなる
* Web API定義
  * OpenAPI SpecのYAMLファイル
  * 参照はGitHub上からも見れるように、[swagger-viewer](https://chrome.google.com/webstore/detail/swagger-viewer/nfmkaonpdmaglhjjlggfhlndofdldfag) を利用
* ERD
  * [A5:SQL Mk-2](https://a5m2.mmatsubara.com/index.html) の `.a5er` 拡張子のファイルをコミット
  * ini形式のテキストファイルであるため、差分がわかりやすい

単体テストデータ管理や区分値管理など、一部Excelを利用する場面はありますが、このようなファイルを同時に複数のブランチで変更することは今の私の環境においては、あまりありません。したがって、Git上でConflictが発生するのはテキストファイルのみとなり、Conflictの解消に大きな手間はかかりません。

Markdownのフォーマッタは[Prettier](https://prettier.io/) と、[EditorConfig](https://editorconfig.org/)を利用し、[textlint](https://textlint.github.io/) はリンク切れチェックのみを利用しています（他のよくあるチェック項目は、あまりにも検知件数が多かったため）。

Markdownに関しては上記のPrettier、EdictorConfig、textlintを通して最低限の品質はカバーできており、個人的には開発者体験が悪くなく気に入っています。

しかし、Markdownで設計書を充実させようとすればするほど、設計書間やメンバー間のちょっとした揺れで、本質的なレビューがしにくく感じるようになりました。そこでMarkdownのLintツールを導入するモチベーションが高まりました。typoチェックの話は別の記事でしたいので今回は割愛します。

## Markdown のスタイルガイド

いくつか存在しますが、掲題のMarkdownlint もチェック内容のインプットにしているのが、以下のスタイルガイドです。

https://cirosantilli.com/markdown-style-guide/

これをきっちり読み込んで、高い意識をもって手動で守るのは大変なので、これをベースに作られたツールを利用します。

## MarkdownのLintツール

[DavidAnson/markdownlint](https://github.com/DavidAnson/markdownlint) が有名で、CLIツールだと[DavidAnson/markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2)が今から導入する際には良さそうです。VS Code拡張にも[markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)という名前で存在し、リアルタイムでチェックができます。

チェック項目は `v0.28.1` で[53のルール](https://github.com/DavidAnson/markdownlint/blob/v0.28.1/doc/Rules.md)が存在します。

[CHANGELOG](https://github.com/DavidAnson/markdownlint/blob/main/CHANGELOG.md)を見る限り、バージョンアップとともにルールが毎回追加されるという開発スタイルではなく、既存のルールのブラッシュアップが継続的に行われていました。

コマンドラインからのインストールと実行は以下です。

```sh
# インストール
npm install --save-dev markdownlint-cli2

# 実行
markdownlint-cli2 "**/*.md"
```

それなりのリポジトリであれば大量に検知されるかも知れませんが、設定ファイルを用いて重要なチェックのみに絞ると良いかと思います。また、デフォルトでは `.git` や `node_modules` もチェックするので、検査対象から外す設定も入れます。私は一通り見てみて、以下の設定にしています。

```json .markdownlint-cli2.jsonc
{
  "config": {
    "line-length": false, // MD013  行の長さ
    "no-hard-tabs": false, // MD010 Markdown中にTSVを書くとエラーになるため
    "no-trailing-punctuation": false, // MD026 ヘディングに句読点（.,;:!?）を許容したい
    "no-inline-html": false, // MD033 HTMLは許容
    "no-bare-urls": false, // MD034 URLのリンク化条件
    "no-space-in-emphasis":false, // MD037  $$など数式で問題になったため外す
    "link-fragments":false // MD051 相対パス設定
  },
  "ignores": [".git", "node_modules"] // 無視するディレクトリ
}
```

## 検知された内容

実際にとあるリポジトリで動かしてみて、200件ほど検知され全て修正してみました。観測範囲がそこだけですが、チームの癖が見えてきて面白かったです。

### ヘディング周り

MD001 というチェックは、ヘディング（見出し、ヘッダー）のレベルは 1つずつだけしか増加させてはならないというものです。

 `###` → `#####` といった、おそらくフォントサイズなどの装飾を調整するため、細かくレベルを調整する人がいて、なるほどなと思いました。まずレビューでは指摘しない細かい内容なので、まさにLinter向きです。

```txt NG.md
### Header 3

xxx

##### Header 4

xxx
```

このヘディング周りは他にもチェックが多く、例えば以下があります。トップレベルが `##` で始まるファイルはたくさんありました。

* MD002 最初のヘディングは `#` から始まる必要がある
* MD003 ヘディングのマークアップを行頭 `#` かアンダーライン形式 `=====` のどちらかに統一する必要がある
  * これに類似して、MD004 は箇条書きの `*`、`-`、`+` などが、同じレベルで異なる文字を使っている場合に検知するものです。おそらくPrettierで強制的に書き換えてくれる内容なため、今まで気にしたことが無かったので新鮮でした

地味に多かったのは、MD022 です。これはヘディングの周りに空行が必須というものです。

```text NG.md
# 見出し1
Some text

Some more text
## 見出し2
```

```text OK.md
# 見出し1

Some text

Some more text

## 見出し 2
```

根拠は、一部のパーサーが前後に空行が存在しないとうまく解析できないためとのこと。類似で、MD031 はコードブロックを空行で囲む必要が、MD032 はリストを空行で囲む必要があるなど、チェック数は多く感じるかも知れませんが、内容は1つ覚えれば応用が効く物が多いので、それほど難しいものではありません。

### ハードタブ

インデントをタブ文字（\t）で揃えるファイルがありませんでしたが、ファイル中に `tsv` のコードブロックでサンプルデータを表現している設計書があり、誤検知されました。意図した動作なのかは調べていないため、回避方法があるかもしれません。

### リンク系

MD011 はリンクのマークアップ誤りを検知してくれます。こんなの存在しないだろうと思っていたら、1件あります。意外と気が付かないものですね。

```md NG.md
(Incorrect link syntax)[http://www.example.com/]
```

```md OK.md
[Correct link syntax](http://www.example.com/)
```

### URL

MD034 は 生のURLを許容するかどうかです。

以下だとリンクが機能しないパーサがあるということが理由です。

```md NG.md
For more information, see http://www.example.com/.
```

回避するためには `<>` でURLを囲みます。

```md OK.md
For more information, see <http://www.example.com/>.
```

ただ、GitHub Flavored Markdownの場合は`<>`が無くても、リンクとして認識してくれるため、その前提の場合は除外しても良いかなと個人的には感じます。

### コードブロック

今回一番学びだと思ったのがこれです。

MD014 は実行するコマンドの表記に使用される行頭ドル記号をチェックします。コマンドの出力結果は記載せず、コマンドだけをドル記号付きで記載していると検知されます。

例えば、手順書において以下のように実行するシェルコマンドだけを記載することがあります。

```txt NG.md
ls
cat foo
less bar
```

このような場合、 $ を外すべきだというチェックです。

```txt OK.md
ls
cat foo
less bar
```

根拠としては、`$` を外したほうが、コピー&ペーストが簡単になるためということ。これはなるほどと思いました。

面白いのは、以下のようにコマンドと出力が混ざるケースは除外されるということです。

```txt
$ ls
foo bar
$ cat foo
Hello world
$ cat bar
baz
```

## fixコマンド

さきほど200件ほど検知されたと記載しましたが、その大部分は以下のコマンドを実行すると自動で修正してくれます（対象のファイルが直接書き換えられるため、事実上フォーマッターのような動きをします）。

```sh
markdownlint-cli2 --fix "**/*.md"
```

全ての検知結果を修正してくれるわけではなく[ドキュメント](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)に `Fixable` とついたもののみ修正してくれるようです。動作もコミット前後で差し込む程度であれば何ら気にならない速度ですので、開発フローに組み込んでしまえば良さそうです。

この`markdownlint-cli2 --fix` は Prettierでも修正されないルールがあるため、併せて設定しておくと良さそうです。

## 所感とまとめ

Markdownlintを導入してみた結果、ドキュメントの一貫性も上がり、リンク切れなど機能していない記法も検知でき品質を上げることができます。個人的には動作が高速であり、VS Codeで随時チェックもできつつ、CLIでも簡単に導入できるため、使わない手は無いなと思いました。

そして `fix` が最高すぎます。とりあえず `fix` で修正させて、GitHubなどのPull Request上のFile diffsで想定外の変換が行われていないかをチェックすれば、生産性と品質を良いバランスで実現できそうです。

次は岸下さんの[お家で電子工作入門 ～上空のフライト情報を可視化する🛫～](/articles/20230418a/)です。
