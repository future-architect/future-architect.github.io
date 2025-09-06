---
title: "VSCodeでGitLensを使う"
date: 2024/04/15 00:00:00
postid: a
tag:
  - VSCode
  - Git
  - Gitクライアント
  - コードリーディング
category:
  - DevOps
thumbnail: /images/2024/20240415a/thumbnail.png
author: 棚井龍之介
lede: "VSCodeの拡張機能である「GitLens — Supercharge Git in VS Codeを取り上げます"
---
<img src="/images/2024/20240415a/gitlens-logo-anybg.png" alt="" width="952" height="300" loading="lazy">

[春の入門連載2024](/articles/20240408a/)、5本目の記事です。

# はじめに

こんにちは。CSIG（Cyber Security Innovation Group）の[棚井](/authors/%E6%A3%9A%E4%BA%95%E9%BE%8D%E4%B9%8B%E4%BB%8B/)です。

[春の入門連載2024](/articles/20240408a/)ということで、VSCodeの拡張機能である「[GitLens — Supercharge Git in VS Code](https://github.com/gitkraken/vscode-gitlens)」を取り上げます。

# エディタ選び

みなさんは、普段の開発エディタには何を利用されていますか？

ソフトウェアエンジニアであれば、エディタとの付き合いは絶対に外せないポイントです。私の場合は、「生成系AIとの連携があるか？」と「開発支援ツールが整備されているか」を判断軸としています。

「GitHub Copilot」との連携があり、私がこれまで利用してきたエディタは

* [JetBrains](https://www.jetbrains.com/)
* [VSCode（Visual Studio Code）](https://code.visualstudio.com/)

の2つです。

JetBrainsの製品はインストール時点で豊富な開発支援機能が揃っており、GoLandには長年課金をしておりました。ただし、GitHub Copilotが登場してからは徐々にVSCodeへと傾き始めて、拡張機能の「GitLens」を見つけてからは、VSCode一本の開発環境へと移行しました。

本ブログでは、この「開発支援ツール」である「GitLens」について紹介します。

# GitLensとは

GitLensは、VSCode内での「Gitを用いた開発」を便利にする拡張機能です。

以下、[README](https://github.com/gitkraken/vscode-gitlens?tab=readme-ov-file#gitlens--supercharge-git-in-vs-code) 記載の文章を引用し、合わせて翻訳文を記載しました。

> GitLens supercharges your Git experience in VS Code. Maintaining focus is critical, extra time spent context switching or missing context disrupts your flow. GitLens is the ultimate tool for making Git work for you, designed to improve focus, productivity, and collaboration with a powerful set of tools to help you and your team better understand, write, and review code.
>
> GitLensは、VSCodeでのGit作業をより快適なものにします。集中力を維持することは非常に重要です。コンテキストの切り替えに余分な時間を費やしたり、コンテキストを見失ったりすると、作業の流れが乱れてしまいます。GitLensは、集中力、生産性、コラボレーションを向上させるために設計された究極のツールで、あなたやあなたのチームがコードをよりよく理解し、書き、レビューするための強力なツールセットです。

GitLensが提供する機能は、一言で表現すると「ソースコードの編集履歴をエディタ内で確認する」ためのものです。

システム開発はまっさらな状態から新しい機能を作ることよりも、既存のコードベースを参照しながら改修、アップデートをする機会の方が非常に多くなります。既に存在するソースコードを読み解く「コードリーディング」を効率的に進めるためには、エディタに表示されている最新の実装コードはもちろんのこと、加えて、そのコードに至るまでのプロセスや実装経緯を含めた周辺情報の収集も必要となります。

* 改修対象のコードはいつ実装されたものなのか
* どのような意図で作成されたのか
* どのような更新経緯を辿っているのか

について、「最新版」として目の前にあるコードだけでなく、その経緯を把握しながらアップデートを重ねることが、現場のエンジニアには求められています。

この「編集履歴」はGitに保存されているので、GitコマンドやGitHub、GitLabの画面で確認可能です。その「編集履歴の確認作業」を、コードリーディングしながら「エディタ内で完結」できたら、エディタとブラウザの切り替えが不要となり、開発作業に集中できませんか？ をツールとして実現したのが、今回紹介するGitLensです。

# GitLensの環境設定

導入初期に必要な以下の方法を説明します。

* インストール方法
* チュートリアルの確認
* GitLens設定値の確認、変更

## インストール方法

Visual StudioのMarketplaceで「[GitLens — Git supercharged](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)」として配信されているので、VSCodeの拡張機能から追加可能です。

■ 拡張機能 > `@id:eamodio.gitlens`

<img src="/images/2024/20240415a/コメント_2024-04-15_080229.png" alt="" width="1200" height="385" loading="lazy">

GitLensが提供するほとんどの機能は、無料で利用可能です。
一部、プライベートリポジトリでの利用が制限されている機能や、使用には `GitKraken account` が必要な機能があります。

■ Pricing > Features > GitLens > Free, Pro, Teams, Enterprise
<https://www.gitkraken.com/pricing>

本ブログでは、無料で利用可能な範囲の機能を紹介します。

VSCode内でのGitLens操作方法、設定状況が分からなくなった場合には、以下のショートカットを利用してください。

* `Ctrl + p`
  * `>GitLens: Welcome`
  * `>GitLens: Open Settings`

以下、それぞれの内容を説明します。

## Welcome to GitLens

■ `Ctrl + p` -> `>GitLens: Welcome`

GitLesnの基本操作内容や、各種チュートリアルへのリンクが記載されています。

<img src="/images/2024/20240415a/コメント_2024-04-15_081358.png" alt="コメント_2024-04-15_081358.png" width="1200" height="610" loading="lazy">

「[Tutorial Video](https://www.youtube.com/watch?v=UQPb73Zz9qk)」へのリンクも付与されています。

このページの内容を、実際のコードと突き合わせながら確認すれば、GitLensの機能は一通り確認可能です。本ブログの内容は、Welcome to GitLensを元に作成しております。

## GitLens Settings

■ `Ctrl + p` -> `>Open Settings`

GitLens専用のカスタマイズ画面です。「[GitLens Documentation](https://help.gitkraken.com/gitlens/gitlens-settings/)」に記載された設定値のカスタマイズや、`Ctrl + ,`で開けるユーザ設定値の変更が可能です。

<img src="/images/2024/20240415a/コメント_2024-04-15_082147.png" alt="コメント_2024-04-15_082147.png" width="1200" height="989" loading="lazy">

次の章で説明する「アノテーションの表示」について、その表示フォーマットのカスタマイズも可能です。

# GitLensの機能紹介

GitLensにより「ソースコードの編集履歴をエディタ内で確認する」方法について、基本的な機能を紹介します。

説明用のソースコードとして、以前に公開しました技術ブログ「[Terraformの実装コードを、動かしながら読む](/articles/20240326a/)」でcloneした「[hashicorp/terraform](https://github.com/hashicorp/terraform)」がローカルに残っていましたので、こちらのコードを利用します。

以下、説明対象の機能です。

* 【1】Inline and Status Bar Blame
* 【2】Rich Hovers
* 【3】File Annotations
* 【4】Revision Navigation
* 【5】Open File on Remote

## 【1】Inline and Status Bar Blame

コードラインにカーソルを合わせると、右側に以下のアノテーション情報を表示します。

* 実装者のアカウント名
* 改修時期
* コミットメッセージ

<img src="/images/2024/20240415a/コメント_2024-04-15_090706.png" alt="" width="1175" height="135" loading="lazy">

実装対応箇所: [https://github.com/hashicorp/terraform/blob/main/main.go#L64](https://github.com/hashicorp/terraform/blob/main/main.go#L64)

エディタ下部にも同様のメッセージが表示され、クリックするとさらに追加情報を確認できます。

<img src="/images/2024/20240415a/コメント_2024-04-15_095554.png" alt="" width="307" height="36" loading="lazy">

↓

<img src="/images/2024/20240415a/コメント_2024-04-15_091340.png" alt="" width="861" height="917" loading="lazy">

エディタ内の操作として、複数の方法が提供されていることが分かります。

## 【2】Rich Hovers

【1】で表示されたアノテーションにマウスをホバーすると、コミット内容の詳細が表示されます。

<img src="/images/2024/20240415a/コメント_2024-04-15_091623.png" alt="" width="1132" height="475" loading="lazy">

Changes -> Opens Changesを選択すると、該当行数でのbefore / afterを視覚的に確認できます。

<img src="/images/2024/20240415a/コメント_2024-04-15_091703.png" alt="" width="1200" height="165" loading="lazy">

もちろん、差分の作成元となったPull Request（[PR #29825](https://github.com/hashicorp/terraform/pull/29825)）にもダイレクトで飛べます。

<img src="/images/2024/20240415a/コメント_2024-04-15_092104.png" alt="" width="1200" height="1371" loading="lazy">

Pull Requestでの説明内容を確認すると「実装コードだけ」を見ていた場合と比較して、膨大な情報が得られることが分かります。

PRにはissueが紐づけられていることが多いので、コードリーディング中に「実装意図が分からない」と壁にぶつかったら、この機能により大本のPRへジャンプ可能です。

## 【3】File Annotations

Inline Bar Blameをファイル内のコードブロック単位で表示します。

エディタ右上の「File Annotations」ボタンを選択して、オンオフの切り替えができます。

■ オフ
<img src="/images/2024/20240415a/コメント_2024-04-15_093234.png" alt="" width="240" height="40" loading="lazy">

■ オン
<img src="/images/2024/20240415a/コメント_2024-04-15_093252.png" alt="" width="235" height="46" loading="lazy">

ブロック単位で誰がどの行を編集したのか、サイドバーの内容とソースコードを対応させながら確認できます。

<img src="/images/2024/20240415a/コメント_2024-04-15_093327.png" alt="" width="1200" height="278" loading="lazy">

<img src="/images/2024/20240415a/コメント_2024-04-15_093416.png" alt="" width="1200" height="287" loading="lazy">

## 【4】Revision Navigation

`Revision`機能を利用することで、以下の2つを確認できます。

対象ファイル内で「右クリック」後にOpen Changesを選択し、以下それぞれを選択して下さい。

* Open Line Changes with Previous Revison
  * 「指定した行」の差分を表示
* Open Changes with Previous Revision
  * 「指定したファイル」の差分を表示

<img src="/images/2024/20240415a/コメント_2024-04-15_100132.png" alt="" width="1200" height="396" loading="lazy">

`func main() {` （指定した行）の差分を表示すると

<img src="/images/2024/20240415a/コメント_2024-04-15_095101.png" alt="" width="1200" height="825" loading="lazy">

`main.go`（指定したファイル）の差分を表示すると

<img src="/images/2024/20240415a/コメント_2024-04-15_095031.png" alt="" width="1200" height="819" loading="lazy">

差分は複数回遡れるため、対象のファイルや行数が「どのような経緯で更新され続け、現在に至るのか」を視覚的に確認できます。

## 【5】Open File on Remote

VSCodeで開いているファイルに対して、対応するホスティングページを表示する機能です。

* 該当行数を「右クリック」
  * Open on Remote (Web)
    * Open File on Remote

<img src="/images/2024/20240415a/コメント_2024-04-15_100953.png" alt="" width="915" height="287" loading="lazy">

上記操作により、エディタに対応するページ（[https://github.com/hashicorp/terraform/blob/main/main.go#L63](https://github.com/hashicorp/terraform/blob/main/main.go#L63)）がブラウザで表示され、リンクが取得できます。

<img src="/images/2024/20240415a/コメント_2024-04-15_101215.png" alt="" width="938" height="92" loading="lazy">

エディタでソースコードを確認しながら、かつ、ファイルのリンクを共有したい場合に、この機能は非常に便利で私は多用しています。

# おわりに

本ブログでは、VSCodeの拡張機能であるGitLensについて説明しました。

テクノロジーの発展に合わせて「エディタが提供する機能」も進化していますので、一度「便利な開発環境」を構築済みだとしても、定期的な見直し、アップデートが必要だと実感しました。
