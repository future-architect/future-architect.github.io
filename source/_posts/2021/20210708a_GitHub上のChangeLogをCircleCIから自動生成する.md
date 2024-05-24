---
title: "GitHub上のChangeLogをCircleCIから自動生成する"
date: 2021/07/08 00:00:00
postid: a
tag:
  - GitHub
  - 自動化
  - CircleCI
category:
  - Infrastructure
thumbnail: /images/20210708a/thumbnail.png
author: 富山龍之介
lede: "リリースした際に、機能強化や不具合修正の内容などをユーザーや他開発メンバーに示すために、ChangeLogを作成されている方も多いと思います。読者の皆さんはどのようにChangeLogを作成されていますか？"
---

<img src="/images/20210708a/space-1951858_960_720.png" alt="" title="Onur Ömer Yavuzによる[Pixabay]からの画像" width="960" height="540">

## はじめに

こんにちは。TIG/DXユニットの富山です。

リリースした際に、機能強化や不具合修正の内容などをユーザーや他開発メンバーに示すために、ChangeLogを作成されている方も多いと思います。

読者の皆さんはどのようにChangeLogを作成されていますか？

例えば手作業で作成されている場合、「内容に記載漏れが発生する」や「作成に時間がかかる」といったデメリットが考えられます。

本記事では、**バージョン（タグ）間にマージされたPullRequestの差分のChangeLogを、GitHubのリリースページにCircleCIから自動生成する方法** をテーマに執筆したいと思います！

## ChangeLogとは

ChangeLogとは、機能拡張や不具合修正の内容などをユーザーや他開発メンバーに示すために作成されるウェブページや資料のことです。

リモートリポジトリにGitHubを利用されている場合、リポジトリの `Releases` ページにChangeLogを作成することができます。
`CHANGELOG.md`というファイルに追記していく事例もよく目にします。

[future-architect/vuls](https://github.com/future-architect/vuls)もChangelog（リリースノート)を付けています。

https://github.com/future-architect/vuls/releases

<img src="/images/20210708a/スクリーンショット_2021-06-27_13.55.17.png" alt="Vuls ChangeLog" width="1200" height="695">


## 今回作成するChangelog
今回は、以下のようなChangeLogを作成していきます。

<img src="/images/20210708a/Screen_Shot_2021-06-27_at_12.42.40.png" alt="ChangeLog出力例" width="1200" height="549">


今回作成するChangeLogに含ませる情報は以下の2つとします。

```
1. バージョン（git tag情報）
2. リリースまでにマージされたタグ間のPullRequestの①タイトル ②実装者名 ③IDとリンク
```

ChangeLogを生成するツールやOSSは沢山ありますが、生成されるログの粒度がコミット単位であったり、開発言語に依存してしまうなど、使用するツールの選定に結構苦戦しました。

私が所属してるプロジェクトでは、サーバサイドにGoを使用している関係で、真っ先に [goreleaser](goreleaser/goreleaser)を採用することを考えましたが、バイナリ配布ではやりすぎ感（あくまでやりたかったことはChangeLogの生成）があり、かつ、あまり上手く制御できなかった背景があり採用しませんでした。

結果、今回は下記2つのツールを合わせることで実現しました。

- [Songmu/ghch](https://github.com/Songmu/ghch)
- [github-release/github-release](https://github.com/github-release/github-release)

## 実装方法
CircleCIからChangeLogを生成するため、 `.circleci/config.yml` に実装していきます。

### 手順

以下の3ステップで進めていきます。

```
1. GitHubの個人アクセストークンを取得する
2. CircleCIの環境変数にGitHubの個人アクセストークンを設定する
3. .circleci/config.yml　を編集する
```

##### 1. GitHubの個人アクセストークンを取得する

GitHubから取得する方法については、[個人アクセストークンを使用する](https://docs.github.com/ja/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)をご参照ください。

##### 2. CircleCIの環境変数にGitHubの個人アクセストークンを設定する

CircleCIの環境変数の設定方法は、[コンテキストの使用](https://circleci.com/docs/ja/2.0/contexts/)をご参照ください。

以下のように、 `GITHUB_TOKEN` を定義し、個人アクセストークンを設定しましょう。

<img src="/images/20210708a/スクリーンショット_2021-06-27_8.19.12.png" alt="アクセストークンの設定" width="853" height="471">

##### 3. `.circleci/config.yml` を編集する

該当部分のソースコードは下記です。
tagがリモートリポジトリにpushされた場合のみ、 `release`ジョブが発火するようにしています。

```yaml .circleci/config.yml
version: 2.1

jobs:
  release:
    working_directory: {YOUR_WORKING_DIRECTORY}
    docker:
      - image: circleci/golang:1.16.0
    steps:
      - checkout
      - run:
          name: Install ghch and github-release
          command: |
            go install github.com/Songmu/ghch/cmd/ghch@v0.10.2
            go install github.com/github-release/github-release@v0.10.0
      - run:
          name: Create release note
          command: |
            github-release release \
              --user {YOUR_GITHUB_USER} \
              --repo {YOUR_REPOSITORY} \
              --tag "${CIRCLE_TAG}" \
              --name "${CIRCLE_TAG}" \
              --description "$(ghch --format=markdown --latest)"

workflows:
  workflow:
    jobs:
      - release:
          filters:
            branches:
              ignore: /.*/
            tags:
              only: /.*/
```

ソースコード上の以下3点をご自身のものに置き換えてください。

```
1. {YOUR_WORKING_DIRECTORY} -> CI上のワーキングディレクトリ
2. {YOUR_GITHUB_USER} 　　-> GitHubユーザーネーム
3. {YOUR_REPOSITORY} 　　-> ChangeLogを生成するリポジトリ名
```

### 生成しているコマンドについて簡単に解説
「ChangeLogを生成し、GitHub上で公開する」部分は上記ソースコード上の以下にあたります。

```bash
github-release release \
  --user {YOUR_GITHUB_USER} \
  --repo {YOUR_REPOSITORY} \
  --tag "${CIRCLE_TAG}" \
  --name "${CIRCLE_TAG}" \
  --description "$(ghch --format=markdown --latest)"
```

`ghch` で、最新のタグと最新-1のタグの差分のChangeLogのテキストをマークダウンで生成し、`github-release` で、GitHubに反映させています。

**あとは、試しにPullRequestをマージして、タグを切ってpushしてChangeLogが生成されることを確認できたら成功です！🎉**

## おまけ
Tipsを載せておきます。

#### ローカルからChangeLogを更新したい
ローカルにGoが入っている方は以下コマンドでインストール、入っていない方はバイナリをインストールしてください。

```bash
# Goが1.16以下の方は go get でインストールしてください。
$ go install github.com/Songmu/ghch/cmd/ghch@v0.10.2
$ go install github.com/github-release/github-release@v0.10.0
```

次に、 [GitHubの個人アクセストークンを取得する](#1-GitHubの個人アクセストークンを取得する)パートにて取得した個人アクセストークンを環境変数として定義します。

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxx
```

上記が完了したら、下記コマンドで生成できます。

```bash
$ github-release release \
  --user {YOUR_GITHUB_USER} \
  --repo {YOUR_REPOSITORY} \
  --tag {TAG} #公開するバージョン名 \
  --name {TAG} #公開するバージョン名（ChangeLogを生成するバージョンのタイトルになります）　\
  --description "$(ghch --format=markdown --latest)"
```


#### 最新バージョンの「ChangeLog」は生成できたけど、過去分のバージョンにもChangeLogを作成したい

`ghch` にはタグを明示的に指定することで、過去分のタグのChangeLogも生成できるので、ローカルから下記コマンドを参考に実行してください。

`--from` オプションから `--to` オプションまでの差分を公開できます。
※ ↑で記した、インストールや環境変数の定義は完了していることを前提とします。

```bash 例
$ github-release release \
  --user {YOUR_GITHUB_USER} \
  --repo {YOUR_REPOSITORY} \
  --tag v0.2.0　\
  --name v0.2.0 \
  --description "$(ghch --format=markdown --from=v0.1.0 --to=v0.2.0)"
```

## おわりに
OSSを利用することで、簡単にChangeLogを自動化することができます。

ChangeLogとともに、高品質なプロダクト作成に寄与できたら嬉しいです！
