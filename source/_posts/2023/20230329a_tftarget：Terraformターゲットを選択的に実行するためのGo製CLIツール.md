---
title: "tftarget:Terraformターゲットを選択的に実行するためのGo製CLIツール"
date: 2023/03/29 00:00:00
postid: a
tag:
  - Terraform
  - OSS
  - CLI
  - Go
category:
  - Programming
thumbnail: /images/20230329a/thumbnail.jpg
author: 宮永崇史
lede: "Terraformのtargetオプションを簡単に実行するためのCLIツールを紹介します。このCLIツールを開発するきっかけとなった経緯もご紹介します。"
---
<img src="/images/20230329a/tftarget-eyecatch.jpg" alt="" width="960" height="540" loading="lazy">

# 1 はじめに

こんにちは。フューチャーアーキテクト株式会社のTIG/EXユニット所属、宮永です。

[Terraform連載2023](/articles/20230327a/)の3リソース目の記事です

本記事では、Terraformのtargetオプションを簡単に実行するためのCLIツールを紹介します。
また、このCLIツールを開発するきっかけとなった経緯もご紹介します。

## Terraformのtarget指定に関する課題

チームで開発を行っている際、Terraformのtargetオプションを使ってリソースを適用するケースはしばしばあるかと思います。

私のチームでは、環境を本番環境、検証環境、開発環境の3つに分けています。本番環境と検証環境では、差分が出ないようにtargetオプションを使用せず、常にクラウド環境とTerraformの記述が同期された状態に保っています。

一方で、開発環境ではtargetオプションを頻繁に利用します。機能開発時に開発者それぞれがTerraformのmainブランチからブランチを切って開発を進めるため、クラウドの開発環境にはそれぞれの.tfファイルに定義されていないリソースが生成されるからです。

この状況下で、各開発者が無条件で`terraform apply`を実行すると、リソースが突然消えることがあります。

▼開発環境における各人の開発の様子
<img src="/images/20230329a/image.png" alt="" width="1200" height="826" loading="lazy">

そこで、新しい機能を作成する際は、まず`terraform plan`を実行し、自分の変更点以外の差分が出た場合は`terraform apply -target=`コマンドを用意するようにしていました。

特定のリソースにのみapplyをしたいだけなのに、自分の差分だけをgrepして`terraform apply -target=`コマンドを準備するのは大変です。terraformのtargetオプションを簡単に実行したいとSlackで呟いたところ、共感を得たため、今回CLIツールとして開発することにしました。

## tftargetの紹介

作成したツールはtftargetと命名し、こちらで公開しています。

https://github.com/future-architect/tftarget/releases

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>
このCLIツールはTerraformコマンドのラッパーであり、内部でTerraformコマンドを呼び出しています。そのため、TerraformのCLIコマンドのインストールが必須です。
</div>

# 2 tftargetの概要
## Terraformターゲットを選択的に実行する機能

動作を直接見る方がわかりやすいと思いますので、tftargetを利用して`terraform apply`を実行するデモ画像を添付します。

<img src="/images/20230329a/tftarget-apply.gif" alt="tftarget-apply.gif" width="854" height="431" loading="lazy">


`terraform apply`の代わりに`tftarget apply`を実行します。
実行後、しばらく待つと`terraform plan`によって出力された差分がリソース名とアクション（`create`や`destroy`など）ともに表示されます。ユーザーは、`terraform apply`を適用したいリソースにチェックを入れてEnterを押すことで、選択的に`terraform apply`を実行できます。

`apply`だけではなく、`plan`と`destroy`にも対応しています。

## どのようなシチュエーションで役立つか
冒頭で述べたように、複数人で開発を行い、各人が個別に定義したリソースに影響を与えずに開発を進める際に役立ちます。`terraform target`を簡単に実行したい場面全般で利用価値があるおもいます。

<div class="note alert" style="background: #feebee; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-times-circle"></span>
動作検証はAWS環境でしか行っていないため、GCPやAzure環境で利用する際は事前に動作確認をお願いします。
</div>

# 3 tftargetのインストール方法
## Go

Go製のCLIツールであるtftargetは、`go install`コマンドを使ってインストールできます。次のコマンドを実行してください。

```shell
go install github.com/future-architect/tftarget@latest
```

## Homebrew

Homebrewを利用している場合も、tftargetをインストールできます。以下のコマンドでインストールできます。

```shell
brew install future-architect/tap/tftarget
```

## マニュアルインストール

各OS向けのバイナリファイルも提供されています。以下のリンクから、適切なシステムに対応するバイナリをダウンロードし、パスを設定して利用できます。

https://github.com/future-architect/tftarget/releases

# 4 tftargetの使い方
## 基本的なコマンドの紹介

tftargetには、`plan`、`apply`、`destroy`の3つのコマンドが用意されています。基本的な使い方は、これらのコマンドに共通しています。まず、`plan`コマンドの使い方を紹介します。

### tftarget plan

通常の`plan`と同様に、以下のコマンドを実行します。

```shell
tftarget plan
```

しばらく待つと、チェックボックスが表示されます。これは、`terraform plan`を実行した結果をリソース名とアクションとして表示したものです。

<img src="/images/20230329a/simple-usage-1.png" alt="simple-usage-1.png" width="1079" height="297" loading="lazy">

Spaceキーを押すことでチェックを付けることができます。右方向キーで全選択、左方向キーで選択解除ができます。上下方向キーとスペースキーで、`plan`を実行したいリソースを選択してください。

赤字で示しているexitのチェックを選択すると、何も実行せずに処理が終了します。

<img src="/images/20230329a/simple-usage-2.png" alt="simple-usage-2.png" width="1079" height="297" loading="lazy">

リソースの選択が完了したら、Enterキーを押して処理を進めます。

<img src="/images/20230329a/simple-usage-3.png" alt="simple-usage-3.png" width="1074" height="165" loading="lazy">

`plan`の場合は、`terraform plan`の実行だけが行われます。そのため、処理はここで終了します。通常の`terraform plan`を実行した際の出力結果と共に、最後に選択したリソースのサマリが表示されます。

このサマリは、後述する`--summary`オプションを`false`に設定することで非表示にすることもできます。

`tftarget plan`の説明は以上です。次に、`tftarget apply`について説明します。

### tftarget apply

`tftarget plan`とリソース選択する部分までは同じです。

リソースを選択してEnterキーを押すと、通常の`terraform apply`のように実行確認のプロンプトが表示されます。内容に問題がなければ、`yes`を選択してください。
<img src="/images/20230329a/simple-usage-4.png" alt="simple-usage-4.png" width="1074" height="134" loading="lazy">

`apply`が成功すると、`plan`の時と同様に、通常の`terraform apply`の出力結果に加えて、以下のようなサマリが出力されます。

<img src="/images/20230329a/simple-usage-5.png" alt="simple-usage-5.png" width="1074" height="147" loading="lazy">

### tftarget destroy
`tftarget apply`と利用方法は全く同じですので、ここでは説明を省略します。

## オプション

それぞれのコマンドには、以下のオプションが用意されています。

```shell
Flags:
  -f, --filter string   filter by action. You can select create, destroy, update, or replace
  -i, --items int       check box item size (default 25)
  -p, --parallel int    limit the number of concurrent operations (default 10)
  -s, --summary         summary of selected items (default true)
```

### --filter, -f

`--filter`オプションでは、最初の選択肢表示画面でアクション別にフィルタリングを追加できます。例えば、新規作成のリソースの場合、`create`と指定することで選択肢に`create`のリソースのみを表示できます。利用可能なアクションは、`create`、`destroy`、`update`、`replace`の4つです。

```shell
tftarget apply -f create
```

このオプションは、複数のアクションを指定することはできません。そのため、以下のようなコマンドはエラーとなります。

```shell
tftarget apply -f create destroy
```

### --items, -i

`--items`オプションでは、チェックボックスの表示数を指定できます。デフォルトでは25個のリソースが表示されますが、このオプションを使用して表示数を増減させることができます。

```shell
tftarget apply -i 50
```

このコマンドは、最初の選択肢表示画面で最大50個のリソースが表示されるように設定します。

### --parallel, -p
`--parallel`オプションはTerraform CLIで実装されている`-parallelism`に並列数を渡すためのオプションです。デフォルトでは10が設定されています。

```shell
tftarget apply -p 30
```

### --summary, -s
`--summary`オプションでは、選択したリソースのサマリ表示を有効または無効にすることができます。デフォルトでは、`plan`や`apply`の結果にサマリが表示されますが、このオプションを使用してサマリ表示をオフにすることができます。

<img src="/images/20230329a/simple-usage-5_2.png" alt="simple-usage-5.png" width="1074" height="147" loading="lazy">

```shell
tftarget apply -s false
```

このコマンドは、`apply`の結果にサマリが表示されないように設定します。

以上で、tftargetの使い方についての説明を終了します。

# 5 バグ報告や機能提案の受付方法
開発してまだ日が浅いのでバグや機能提案がある際はこちらに起票のほどよろしくお願いします。

https://github.com/future-architect/tftarget/issues

# 6 まとめ
## tftargetが解決する問題点
tftargetを使用することで、簡単に`terraform target`を実行できます。特に、複数のメンバーが開発を行う際、各メンバーが定義したリソースを破壊することなく、安全に運用できるようになります。

## 今後の展望やアップデート予定
現在、tftargetはAWS環境でのみ動作検証が行われています。今後は、GCPやAzureでの動作確認や改善を行っていく予定です。

