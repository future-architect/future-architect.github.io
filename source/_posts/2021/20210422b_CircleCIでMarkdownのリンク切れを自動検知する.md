---
title: "CircleCIでMarkdownのリンク切れを自動検知する"
date: 2021/04/22 00:00:01
postid: b
tag:
  - CircleCI
  - Markdown
  - ドキュメント
category:
  - DevOps
thumbnail: /images/20210422b/thumbnail.png
author: 棚井龍之介
lede: "私のチームでは、「システムの設計情報」や「実装に関わる業務知識」などを、`README.md` に整理して GitHub 管理しています。設計資料や業務系のドキュメントが蓄積され、何度も更新され続けることに伴い、「あれ、この資料のリンクが切れてる。オリジナルのファイルはどこだっけ？」と探す機会が増えてきました。本来ならば PullRequest のレビュー時に気付くべきですが、ファイル名のちょっとしたスペルミスや資料パスの変更などだと、目視でのチェックには限界があります。"
---

<img src="/images/20210422b/chain-312403_640.png" class="img-small-size" alt="" title="Clker-Free-Vector-ImagesによるPixabayからの画像">

# はじめに
フューチャー棚井龍之介です。

私のチームでは、「システムの設計情報」や「実装に関わる業務知識」などを、`README.md` に整理して GitHub 管理しています。

設計資料や業務系のドキュメントが蓄積され、何度も更新され続けることに伴い、「あれ、この資料のリンクが切れてる。オリジナルのファイルはどこだっけ？」と探す機会が増えてきました。

本来ならば PullRequest のレビュー時に気付くべきですが、ファイル名のちょっとしたスペルミスや資料パスの変更などだと、目視でのチェックには限界があります。

こういった状況への対応として「**リンク切れを自動検知する**」ために、CircleCI で Markdown ファイルのリンク切れを検知できるようにしました。

## 完成版コード

<img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/r-ryu/markdown-link-checker.png" width="460px"loading="lazy">

https://github.com/r-ryu/markdown-link-checker

# 使うツール
Markdown チェックのために、[markdown-link-check](https://github.com/tcort/markdown-link-check) を利用します。
Markdown テキストからリンクを抽出し、各リンクが生きている（200 OK）か死んでいるかをチェックします。

> markdown-link-check
> Extracts links from markdown texts and checks whether each link is alive (200 OK) or dead.

node のツールなので、[npm でインストール](https://github.com/tcort/markdown-link-check#installation)すれば、任意の環境でリンクチェックできます。

```bash
Usage: markdown-link-check [options] [filenameOrUrl]

Options:
  -p, --progress         show progress bar
  -c, --config [config]  apply a config file (JSON), holding e.g. url specific header configuration
  -q, --quiet            displays errors only
  -v, --verbose          displays detailed error information
  -a, --alive <code>     comma separated list of HTTP code to be considered as alive
  -r, --retry            retry after the duration indicated in 'retry-after' header when HTTP code is 429
  -h, --help             display help for command
```


# CircleCIへの記述
CircleCI の jobs 内で、markdown-link-check を呼び出します。

[ツール本家の README](https://github.com/tcort/markdown-link-check#check-links-from-a-local-markdown-folder-recursive) に記載された `$ find . -name \*.md -exec markdown-link-check {} \;` による実行方法は、CircleCI で実行した際に欲しい挙動が得られません。リンク切れが1つでも存在したら Task failed で落として欲しいのですが、`-exec` による方法では「最初にチェックされたファイルに、リンク切れがある場合のみ」Task failed で落ちます。2つ目以降のファイルにリンク切れが存在しても、CircleCI は検知してくれません。

CircleCI のチェックで、リンク切れファイルが**1つでも**存在する場合は Task failed で落としてもらうために、`xargs` を利用します。xargs を利用することで、対象ファイル全てに一括でリンターチェックが適用できます。（-exec の場合、1ファイルごとに処理されます。）

- 引用: [今さらながらfindパイセンについてまとめてみた（‐execオプション）](/articles/20210331/)

```bash -execとxargsの違い
# -exex
$ find . -type f -name "*.txt" -exec echo "ファイル名: {}" \;
ファイル名: ./test01.txt
ファイル名: ./test02.txt
ファイル名: ./test03.txt
ファイル名: ./test04.txt
ファイル名: ./test05.txt

# xargs
$ find . -type f -name "*.txt" | xargs echo "ファイル名: "
ファイル名:  ./test01.txt ./test02.txt ./test03.txt ./test04.txt ./test05.txt
```


CircleCI で markdown-link-check を xargs により実行させるコートはこちらです。
ツール自体が node 製なので、プライマリイメージには `cimg/node:15.11.0` を利用しています。

```yml config.yml
version: 2.1

jobs:
  markdown_link_check:
    docker:
      - image: cimg/node:15.11.0
    steps:
      - checkout
      - run:
          name: Install Markdown-Link-Check
          command: sudo npm install -g markdown-link-check
      - run:
          name: Run Markdown-Link-Check
          command: find . -name \*.md | xargs --max-lines=1 markdown-link-check

workflows:
  workflow:
    jobs:
      - markdown_link_check
```

あとは CircleCI を回せば、リポジトリ内のリンク切れを全て検知してくれます。


## 大量のリンク切れを検知したときは
長期間メンテナンスされていないリポジトリの場合、markdown-link-check が大量のリンク切れを検知します。
`.circleci/config.yml` に定義ファイルが追加された時点で、CircleCI が落ち続けてしまうので、まずはローカル実行でリンク切れ状況をチェックしましょう。

```bash
$ circleci local execute --job markdown_link_check
（略）

###############
# リンク切れあり
###############
ERROR: 1 dead links found!
[✖] ../docs/環境構築/README.md → Status: 400

Task failed
Error: task failed

###############
# リンク切れなし
###############
[✓] ../../docs/環境構築/README.md

Success!
```


## 特定のリンクは対象外にしたいとき
正規表現で `ignorePatterns` を設定すれば、特定のリンクをチェック対象外に指定できます。

例えば、別サイトへのリンクをチェック対象外にしたい場合、`config.json` に以下設定を追加します。

```json config.json
{
    "ignorePatterns": [
        {
            "pattern": "^http"
        }
    ]
}
```

`-c` オプションで、config.jsonを渡します。

```yml config.yml
- run:
    name: Run Markdown-Link-Check
    command: find . -name '*.md' | xargs --max-lines=1 markdown-link-check -c config.json
```

その他、config.json の設定次第で様々な動作調整が可能です。
詳細は [Config file format](https://github.com/tcort/markdown-link-check#config-file-format) をご参照ください。


# おわりに
ドキュメントの増加やメンバーの入れ替えなどにより、徐々に資料の陳腐化が進んでしまうのはあるあるだと思います。資料パスのリンク切れは自動検知可能なので、こういった作業は自動化・仕組み化して、エンジニアは開発に集中しましょう。

今回は「CircleCI で Markdown チェックを自動化する」方法でした。

この方法が、読んでいただいた方の役に立てたら幸いです。

## 参照記事

- [markdown-link-check](https://github.com/tcort/markdown-link-check#config-file-format)
- [今さらながらfindパイセンについてまとめてみた](/articles/20210331/)

