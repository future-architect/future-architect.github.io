---
title: "GUI GitツールのRebase, Cherry pick"
date: 2021/04/20 00:00:00
postid: b
tag:
  - Git
  - VSCode
  - Gitクライアント
category:
  - DevOps
thumbnail: /images/2021/20210420b/thumbnail.png
author: 市川燿
lede: "Gitを使っての開発で、指定のツールや好みのGitクライアントを使っていると思います。ターミナルの黒画面でGitコマンドを使うのはちょっと不安、GUI画面から画面を確認しながらGitを操作したい方向けの記事です。GitのBranch作成やCheckout, Commit, Pushまで使えた方向けに、次の段階としてRebase, Cherry Pickなどの実行方法を説明します。"
---

Gitを使っての開発で、指定のツールや好みのGitクライアントを使っていると思います。

ターミナルの黒画面でGitコマンドを使うのはちょっと不安、GUI画面から画面を確認しながらGitを操作したい方向けの記事です。

GitのBranch作成やCheckout, Commit, Pushまで使えた方向けに、次の段階としてRebase, Cherry Pickなどの実行方法を説明します。

## 紹介するツール

- [Sourcetree](https://www.sourcetreeapp.com)
- [Visual Studio Code](https://code.visualstudio.com) with [Git Graphプラグイン](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph)
- [IntelliJ IDEA](https://www.jetbrains.com/idea/)

## Git操作イメージ

説明にあたりGitツリーが以下の状態であることを前提としています。
`feature` ブランチは個人の開発ブランチです。`master` ブランチは状況により `develop` ブランチなどに適宜読みかえください。

### 初期状態

<img src="/images/2021/20210420b/commit_base.png" alt="初期状態のブランチ" loading="lazy">

### masterブランチへRebase

`git rebase master` に相当
<img src="/images/2021/20210420b/commit_rebase_master.png" alt="Rebase動作イメージ" loading="lazy">

### コミットをまとめる(Squash)

`git rebase -i` に相当
<img src="/images/2021/20210420b/commit_rebase_squash.png" alt="Squash動作イメージ" loading="lazy">

### 別ブランチのコミットを持ってくる(Cherry-pick)

`git cherry-pick` に相当
<img src="/images/2021/20210420b/2021-03-26-16-34-37.png" alt="Cherry-pick動作イメージ" loading="lazy">

## Sourcetree

### masterブランチへRebase

1. リベースしたい元(featureブランチ)をチェックアウト
2. リベースしたい先(masterブランチ)で右クリックし、「リベース...」を選択
3. 「リベースの確認」ダイアログが立ち上がり、「OK」をクリック
4. featureブランチがmasterブランチから生えていることを確認
<img src="/images/2021/20210420b/sourcetree_rebase_master.gif" alt="Sourcetree Rebase操作動画" loading="lazy">

### コミットをまとめる(Squash)

1. リベースしたいブランチ(featureブランチ)をチェックアウト
2. まとめたいコミットの1つ前のコミット(今回はmaster Bコミット)を右クリック
3. 右クリックメニューから「xxxxの子とインタラクティブなりベースを行う...」を選択、
4. リベースダイアログが立ち上がる。1つ目のコミット(feature E)を選択し、「前のコミットとスカッシュ」を選択
5. コミットがまとまったことを確認し「メッセージを編集」ボタンをクリック
6. コミットメッセージを編集し「OK」ボタンを押し、メッセージが変更されたことを確認
7. 「OK」ボタンを押してリベースを確定する
8. Sourcetree画面に反映されない場合には「F5」を押し更新
<img src="/images/2021/20210420b/sourcetree_rebase_squash.gif" alt="Sourcetree Squash操作動画" loading="lazy">

### 別ブランチのコミットを持ってくる(Cherry-pick)

1. チェリーピックしたい先(featureブランチ)をチェックアウト
2. 持ってきたいコミット(今回はmaster Dコミット)を右クリック
3. 「チェリーピック」を選択
4. チェリーピックダイアログが立ち上がる。「OK」を選択
5. featureブランチに持ってきたコミットが追加されてることを確認
<img src="/images/2021/20210420b/sourcetree_cherrypick.gif" alt="Sourcetree Cherry-pick操作動画" loading="lazy">

## Visual Studio Code with Git Graphプラグイン

### 事前準備

1. 以下のプラグインをインストール
    [Git Graph - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph)
2. Git Graph画面を開く
<img src="/images/2021/20210420b/gitgraph_open.gif" alt="VS Code動作動画" loading="lazy">

### masterブランチへRebase

1. リベースしたい元(featureブランチ)をチェックアウト
2. リベースしたい先(masterブランチ)で右クリックし、「Rebase current branch on this Commit...」を選択
3. ダイアログが立ち上がり、「Yes, rebase」をクリック
4. featureブランチがmasterブランチから生えていることを確認
<img src="/images/2021/20210420b/gitgraph_rebase_master.gif" alt="VS Code動作動画" loading="lazy">

### コミットをまとめる(Squash)

[Issue](https://github.com/mhutchie/vscode-git-graph/issues/410)が上がっているが、GUI単独では現時点でできない。
リベース選択時に「Launch Interactive Rebase in new Terminal」を選択することにより一部CUIを併用することで実現可能。

### 別ブランチのコミットを持ってくる(Cherry-pick)

1. チェリーピックしたい先(featureブランチ)をチェックアウト
2. 持ってきたいコミット(今回はmaster Dコミット)を右クリック
3. 「Cherry Pick...」を選択
4. ダイアログが立ち上がり、「Yes, cherry pick」を選択
5. featureブランチに持ってきたコミットが追加されてることを確認
<img src="/images/2021/20210420b/gitgraph_cherrypick.gif" alt="VS Code動作動画" loading="lazy">

## IntelliJ IDEA

### 事前準備

「View」メニューから「Tool Windows」⇒「Git」と選択しGitの画面を表示する
<img src="/images/2021/20210420b/intellij_open.gif" alt="IntelliJ IDEAのGitプラグインのインストール" loading="lazy">

### masterブランチへRebase

1. リベースしたい元(featureブランチ)をチェックアウト
2. 左のブランチ一覧からリベースしたい先(masterブランチ)で右クリックし、「Rebase Current onto Selected」を選択
3. featureブランチがmasterブランチから生えていることを確認
<img src="/images/2021/20210420b/intellij_rebase_master.gif" alt="IntelliJの操作動画" loading="lazy">

### コミットをまとめる(Squash)

1. リベースしたいブランチ(featureブランチ)をチェックアウト
2. まとめたいコミットの最初(今回はmaster Cコミット)を右クリック
3. 右クリックメニューから「Interactively Rebase from Here...」を選択、
4. リベースダイアログが立ち上がる。1つ目のコミット(feature E)を選択し、「Squash」を選択
5. コミットメッセージを編集しエディタ外をクリックし、メッセージが変更されたことを確認
6. 「Start Rebasing」ボタンを押してリベースを確定する
7. コミットがまとまったことを確認
<img src="/images/2021/20210420b/intellij_rebase_squash.gif" alt="IntelliJの操作動画" loading="lazy">

## おわりに

私は普段IntelliJのGo言語特化版のGolandで開発をメインに行ってます。

本記事は、開発メンバーがGitの使い方に苦労しているのを見たり、相談が来て生まれました。できるだけ視覚的に理解できるよう、記事を書いたつもりです。

本記事を通し、少しでもGitの操作の苦手意識を減らし、理解を深めることができたら幸いです。(この記事を書くにあたり`git reflog`コマンドが非常に役立ちました。)

紹介したツールや実行方法は一例です。

自分にあったツールやコマンドを使い、良いGitライフを！
