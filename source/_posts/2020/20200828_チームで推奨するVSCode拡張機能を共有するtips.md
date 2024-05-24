---
title: "チームで推奨するVSCode拡張機能を共有するtips"
date: 2020/08/28 00:00:00
postid: ""
tag:
  - VSCode
  - チーム開発
category:
  - Programming
thumbnail: /images/20200828/thumbnail.png
author: 市川浩暉
lede: "プロジェクトにアサインされて、まずやらなければならないのは環境構築だと思います。私が新人としてプロジェクトに参画した頃は、リポジトリのクローンからローカルサーバーを起動させるまでの手順は詳細に記載されていたものの、開発で使用するエディタの説明は特になく、VSCodeに各々が好きな拡張機能をインストールしている状態でした。当時開発経験が浅かった私は開発中に必要となる拡張機能を都度入れていたり、作業を効率化できる拡張機能を入れられておらず、非常に困っていました。"
---
こんにちは。
TIG DXユニットの市川です。

プロジェクトにアサインされて、まずやらなければならないのは環境構築だと思います。

私が新人としてプロジェクトに参画した頃は、リポジトリのクローンからローカルサーバーを起動させるまでの手順は詳細に記載されていたものの、開発で使用するエディタの説明は特になく、VSCodeに各々が好きな拡張機能をインストールしている状態でした。当時開発経験が浅かった私は開発中に必要となる拡張機能を都度入れていたり、作業を効率化できる拡張機能を入れられておらず、非常に困っていました。

そういった背景もあり、私のプロジェクトではプロジェクトで必要となる・開発を効率的に行うことができる拡張機能を選定し、それらをVSCodeに一括でインストールする環境を整えたことで、プロジェクトに参画をした新人やキャリア入社の方、インターンの方がスムーズにエディタの設定を行うことができました。

今回は、どのようにプロジェクト推奨の拡張機能を設定するのか、新規参画者がどのように拡張機能を導入するかについてご説明します。

# 設定手順

まず、どのようにプロジェクト推奨の拡張機能を設定するかについてご説明します。

## .vscode/extensions.jsonの作成

まず、VSCodeを起動してインストールを推奨したい拡張機能のページにアクセスします。（今回はESLintを例に説明します。）

<img src="/images/20200828/image.png" loading="lazy">

そのあと、下記画像のようにコマンドパレットを開き、`Extensions: Add to Recommended Extensions (Workspace Folder)` を選択します。

<img src="/images/20200828/image_2.png" loading="lazy">

すると、`.vscode/extensions.json` が新規作成され、ESLintの拡張機能が`recommendations` に追加されていることがわかります。
また、`unwantedRecommendations` の項目も作成されてしますが、こちらはプロジェクトで推奨しない拡張機能を指定することが可能です。

<img src="/images/20200828/image_3.png" loading="lazy">

この手順を繰り返し、プロジェクトに必要な拡張機能を`recommendations` に追加していきます。

## 新規参画者の手順

次に新規参画者が拡張機能をインストールする手順を記載します。

VSCode起動後、まず ctrl + O (Macの方は⌘ + O) を押下して、対象のアプリケーションを選択し、ディレクトリを開きます。
下記の順で操作することで、推奨する拡張機能の候補が表示されます。

<img src="/images/20200828/recommended.png" loading="lazy">

下記画像の④のマーククリックし、拡張機能をインストールしてください。
もしVSCodeの使用に慣れており、独自で拡張機能を導入している場合は、下記に記載している拡張機能の概要を確認し、必要なものは緑色のinstallをクリックすることで、個別にインストールすることも可能です。

<img src="/images/20200828/extension_install.png" class="img-middle-size" loading="lazy">

# 最後に

今回は拡張機能に絞って説明しましたが、VSCodeでは様々な設定をjson形式でチームに共有することが可能です。
チームで設定を共有し、開発効率を高めていきましょう！

# 参考

* [Extension Marketplace - Workspace recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions)
* [VSCode の Go extension でよく利用するコマンド 7選](/articles/20200707/)
