---
title: "ShellCheckでシェルスクリプトの品質を高めよう"
date: 2021/03/29 00:00:00
postid: ""
tag:
  - ShellScript
  - Linter
  - 静的解析
category:
  - Infrastructure
thumbnail: /images/2021/20210329/thumbnail.png
author: 辻大志郎
lede: "シェルスクリプト連載の第一弾です。シェルスクリプトは強力かつ便利で、いろいろなところで使われています。ただ、自由度が高い一方で、ちょっとしたミスを犯しやすく、かつミスに気づきにくい、ということも多いです。また、ミスに気づいたときには大きな影響が及んでいる、ということもあるでしょう。"
---

<img src="/images/2021/20210329/eye-catch.webp" alt="eye-catch-shell" loading="lazy">

> [Hans](https://pixabay.com/ja/users/hans-2/)による[Pixabay](https://pixabay.com/ja/)からの画像

[シェルスクリプト連載](/articles/20210321/)の第1弾です。

シェルスクリプトは強力かつ便利で、いろいろなところで使われています。ただ、自由度が高い一方で、ちょっとしたミスを犯しやすく、かつミスに気づきにくい、ということも多いです。また、ミスに気づいたときには大きな影響が及んでいる、ということもあるでしょう。

本記事では、シェルスクリプトの品質を高めるために [ShellCheck](https://github.com/koalaman/shellcheck) というツールを使って、シェルスクリプトの品質や安全性を高めよう、という趣旨の記事です。

[<img src="https://github.com/koalaman/shellcheck" alt="koalaman/shellcheck - GitHub](https://gh-card.dev/repos/koalaman/shellcheck.svg)" loading="lazy">

## `ShellCheck` を使うと何がうれしいの？

`ShellCheck` はシェルスクリプトのための静的解析ツールです。`ShellCheck` は以下を目標として作成されています。

* シェルスクリプト初心者が書いた、ハマりやすい構文上の問題を指摘する
* シェルスクリプト中級者が書いた、直感に反する挙動を指摘する
* シェルスクリプト上級者が書いた、将来的に問題になる可能性がある細かい点を指摘する

ツールを実行すると、シェルスクリプトの実装を静的解析して、よくあるミスや不具合になる可能性がある点を指摘してくれます。 `ShellCheck` が指摘した点を予め修正することで、プルリクエストなどでの人によるレビューは、実現したい機能やロジックといった内容に焦点をあてることができるでしょう。なぜこのコードだとまずいのか？ という根拠が [Wiki](https://github.com/koalaman/shellcheck/wiki) に記載されている点も嬉しいポイントです。

シェルスクリプトを開発する上で、品質向上や生産性向上が見込めます。

## `ShellCheck` の検知サンプル例

`ShellCheck` が検知するごく一部のサンプルを紹介します。

### クォートしていない変数

例えばクォートしていない変数を検知して、指摘してくれます。

```sh a.sh
#!/bin/bash

echo $1
```

```
$ shellcheck a.sh

In a.sh line 3:
echo $1
     ^-- SC2086: Double quote to prevent globbing and word splitting.
```

正しい実装は以下のようにクォートすることです。

```sh
echo "$1"
```

### `cd` の結果を確認しない

`cd` の戻り値をチェックせずに、後続のコマンドを実行する実装は意図しない挙動になる可能性があります。

例えば以下で、`work` ディレクトリが存在しない場合に `cd work` し、`rm -f *.txt` をするとしましょう。

```
$ tree
.
├── b.sh
└── important.txt
```

```sh b.sh
#!/bin/bash

cd work
rm -r ./*.txt
```

`b.sh` を実行したときに `work` ディレクトリへの `cd` が失敗したときに意図しないファイル(`important.txt`)が削除されてしまいます。

```
$ ./b.sh
b.sh: 3: cd: can't cd to work
$ tree
.
└── b.sh
```

`ShellCheck` は上記のような実装を指摘してくれます。

```
$ shellcheck b.sh

In b.sh line 3:
cd work
^-- SC2164: Use 'cd ... || exit' or 'cd ... || return' in case cd fails.
```

安全な実装は、`cd` コマンドの戻り値をチェックして、エラーがあった場合(`exit 0` 以外がリターンされた場合)は `exit` するなどといった方法や

```sh
cd work || exit
rm -r ./*.txt
```

`set` オプションの `-e` を用いて、エラーが有った場合に終了して、後続の処理が実行されないようにする、

```
set -e

cd work
rm -r ./*.txt
```

などといった方法があります。

### 空文字判定のミス

変数の文字列が空文字ではないことを判定する場合に `test` コマンドの `-n` オプションを用いることができます。

ただし以下のスクリプトには実装ミスがあります、変数の文字列の内容に関わらず常に `true` になります。

```sh c.sh
#!/bin/bash

foo=""

if [[ -n "{$foo}" ]]
then
  echo "not zero length"
fi
```

上記のようなよくある実装ミスも `ShellChell` で検知できます。

```
$ shellcheck c.sh

In c.sh line 5:
if [[ -n "{$foo}" ]]
          ^-- SC2157: Argument to -n is always true due to literal strings.
```

正しくは

```sh
#!/bin/bash

foo=""

if [[ -n "${foo}" ]]
then
  echo "not zero length"
fi
```

となります。

## `ShellCheck` を使ってみよう

`ShellCheck` は強力なシェルスクリプトの静的解析ツールです。2021/03/29現在、400以上ものパターンが登録されています。どのようなパターンがあるかは [Wiki](https://github.com/koalaman/shellcheck/wiki) を見てみてください。よくあるミスを指摘し、どのように対応すればいいか出力されるコードから調べることができます。まだ `ShellCheck` を使ったことがない、という方はこれを機に一度導入してみてはいかがでしょうか。

明日は真野さんの[CSVと親しくなるAWK](/articles/20210329/)です。
