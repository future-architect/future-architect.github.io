---
title: "stree：S3バケットをtreeするCLIコマンド"
date: 2023/09/26 00:00:00
postid: a
tag:
  - AWS
  - S3
  - OSS
  - CLI
  - Go
category:
  - Programming
thumbnail: /images/20230926a/thumbnail.png
author: 宮永崇史
lede: "S3バケットをtreeするCLIコマンドを紹介します。"
---
<img src="/images/20230926a/stree-display.png" alt="" width="1200" height="600" loading="lazy">

# はじめに

こんにちは。TIG/EXユニット所属の宮永です。

本記事ではS3バケットをtreeするCLIコマンドを紹介します。

クラスメソッドさんの記事([S3 バケットの中身を tree 形式で表示してくれる s3-tree を Amazon Linux 2 にインストールして使ってみた](https://dev.classmethod.jp/articles/s3-tree-aws-s3-ls/))を拝見して、[s3-tree](https://pypi.org/project/s3-tree/)というツールの存在を知ったのですが、profileを指定できなかったり、バケット単位でしか指定できなかったりと細かな部分で不自由さを感じたためGoでCLIツールを作成しました。

作成したツールは以下リンク先で公開しています。

[![orangekame3/stree - GitHub](https://gh-card.dev/repos/orangekame3/stree.svg)](https://github.com/orangekame3/stree)

>streeは「エスツリー」と読みます。先に語感の良い名称を思いついたため、衝動に身を任せて開発しました。

# 機能概要

まずは利用画面を見ていただいたほうがイメージ付きやすいかと思いますのでgif画像を添付します。

<img src="/images/20230926a/demo.gif" alt="demo" width="1200" height="686" loading="lazy">

streeは以下の機能をサポートしています。

- バケット名、プレフィックス名指定によるtree表示
- プロファイル、リージョンの指定
- LocalStack上のS3バケットのtree表示
- カラー表示（オプションで無効化も可能です）

# インストール方法

GoとHomebrew経由でインストール可能です。

各種ビルド済みのバイナリも公開しているので[Release](https://github.com/orangekame3/stree/releases)から手動インストールもできます。

## Goによるインストール

```shell
go install github.com/orangekame3/stree@latest
```

## Homebrewによるインストール

```sh
brew install orangekame3/tap/stree
```

# 使い方

<div class="note warn" style="background: #fdf9e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

**前提**
aws cliで利用するconfig及びcredentialsは事前に設定しておく必要があります。

</div>

以降、configとcredentialsが以下の通り設定されているものとします。

```ini ~/.aws/config
[my_profile]
region = ap-northeast-1
output = json
```

```ini ~/.aws/credentials
[my_profile]
aws_access_key_id=XXXXXXXXXXXXXXXXXXXXX
aws_secret_access_key=XXXXXXXXXXXXXXXXX
```

## 基本的なコマンド

バケット名とprofileを指定して、以下のコマンドを実行します。

プロファイルは`--profile(-p)`で指定します。

```sh
stree my-bucket -p my_profile
```

以下のような出力が得られます。

```sh
my-bucket
└── test
    ├── dir1
    │   ├── dir1_1
    │   │   └── dir1_1_1
    │   │       ├── file1.csv
    │   │       └── file2.csv
    │   └── dir1_2
    │       ├── file1.csv
    │       ├── file2.csv
    │       └── file3.csv
    ├── dir2
    │   └── dir2_1
    │       └── dir2_1_1
    │           ├── file1.csv
    │           ├── file2.csv
    │           └── file3.csv
    └── dir3
        ├── file1.csv
        └── file2.csv

9 directories, 10 files
```

## プレフィックスを指定

通常のユースケースを考えると、バケットの中には大量のオブジェクトが存在していることが予想されます。

そのため、バケット指定しかできない状況では使い物になりません。バケット名に続けてprefixを指定することで、ユーザーが確認したいパスの情報のみを確認することができます。

```sh
stree my-bucket/test/dir2 -p my_profile
```

このコマンドの実行結果は以下のようになります。

```sh
my-bucket
└── test
    └── dir2
        └── dir2_1
            └── dir2_1_1
                ├── file1.csv
                ├── file2.csv
                └── file3.csv

4 directories, 3 files
```

## リージョンのオーバーライド

`--region(-r)`でリージョンを指定できます。

profileに記載しているリージョンとは別のリージョンを指定したいときなどは`--region`フラグを利用してオーバーライドしてください。

## Localstackでの利用

Localstackでも利用できます。

ローカルスタックで利用する場合、endpointとregionはデフォルトで以下の通り設定していると思います。

```sh
endpoint = http://localhost:4566
region = us-east-1
```

大多数の場合は↑の設定で利用しているかと思いますのでLocalstack用のフラグを追加しています。`--local(-l)`がそれです。

```sh
stree my-bucket/test/dir2 -l
```

特別な事情でエンドポイントやリージョンを変更する場合もあるかと思いますので、`--region(-r)` フラグと`--endpoint(-e)`でオーバーライドすることもできます。

```sh
stree my-bucket/test/dir2 -r us-east-1 -e http://localhost:4537
```

出力は同じであるため省略します。

## カラー出力を無効化
`--no-color(-n)`でカラー出力を無効化できます。

▼カラーつき
<img src="/images/20230926a/color.png" alt="color.png" width="479" height="391" loading="lazy">

▼カラーなし
<img src="/images/20230926a/no-color.png" alt="no-color.png" width="504" height="391" loading="lazy">

# さいごに

実装に取り掛かるうえでtreeは骨が折れそうだなと思ったのですが、既にgteeというパッケージがGitHubで公開されていました。

[![ddddddO/gtree - GitHub](https://gh-card.dev/repos/ddddddO/gtree.svg)](https://github.com/ddddddO/gtree)

パッケージの利用方法なども記事で公開されていて実装に困ることはありませんでした。

▼参考

- [Markdown形式の入力からtreeを出力するCLI](https://zenn.dev/ddddddo/articles/ad97623a004496)
- [Goでtreeを表現する](https://zenn.dev/ddddddo/articles/8cd85c68763f2e)
- [Markdown形式の入力からファイル/ディレクトリを生成するCLI/Goパッケージ](https://zenn.dev/ddddddo/articles/460d12e8c07763)

また、gtreeの作者である[@ddddddO](https://twitter.com/ddddddOpppppp)さんにはstreeに[issue](https://github.com/orangekame3/stree/issues/9)を起票いただいており、本記事公開前に致命的なバグを修正することができました。ありがとうございます。

gtreeでstreeの機能の核は難なく実装することができたため、着想から実装完了まで１日もかかりませんでした。

S3をtreeしてみたくなったらぜひstreeを利用してみてください。

本記事をお読みいただきありがとうございました。
