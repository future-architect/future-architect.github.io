---
title: "VS Code / プラグインを活用したDraw.ioの便利な使い方"
date: 2021/05/25 00:00:01
postid: b
tag:
  - draw.io
  - VSCode
category:
  - Programming
thumbnail: /images/20210525b/thumbnail.gif
author: 山田勇一
lede: "Draｗ.io（Diagrams.net）はとても便利ですが、VScodeやプラグインと組み合わせると更に便利になります。特に便利と感じた機能を紹介します。ここ数年、GitHubでドキュメント（Markdown）を管理するケースが増えており、Markdownに埋め込む編集可能な図として、Draｗ.ioのメタ情報を埋め込んだ画像を利用しています。"
---
# 概要

[Draｗ.io（Diagrams.net）](https://www.diagrams.net/)はとても便利ですが、VScodeやプラグインと組み合わせるとさらに便利になります。

特に便利と感じた機能を紹介します。

# VS Code プラグイン

ここ数年、GitHubでドキュメント（Markdown）を管理するケースが増えており、Markdownに埋め込む編集可能な図として、Draｗ.ioのメタ情報を埋め込んだ画像を利用しています。

当初、ブラウザ（もしくはデスクトップ版）を利用していたのですが、こちらのプランを利用すると、VSCodeから直接png/svgをDraｗ.ioで表示・編集・画像保存が可能となり、とても便利です。

https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio

<img src="/images/20210525b/vscode.gif" alt="VS Codeでdraw.ioを編集する動画" width="720" height="480" loading="lazy">

# Draｗ.io プラグイン

[公式](https://drawio-app.com/?s=plugin)でもブログでサラッと紹介してあるのみですが、メニューから、`拡張 > プラグイン`で追加可能です。

網羅性はありませんが、使ってみたプラグインを幾つか紹介します。urlからも追加できるようなので、探してみると可能性が広がりそうです。

<img src="/images/20210525b/plugin.gif" alt="draw.ioのプラグインを追加する動画" width="720" height="480" loading="lazy">

## SQL

DDLからDraｗ.ioのERDを作れます。

凄く便利！と思うのですが、リレーション貼れなかったりあと1歩な感じです。

https://drawio-app.com/sql-plugin/

## Text

Draｗ.ioに含まれるTextを一括でExportできます。どこかで使えそうですね。

https://drawio-app.com/text-plugin/

## anim

オブジェクトにアニメーションを付けられます。巨大なオブジェクトにアニメーションをつけるのはかなり労力を使いそうです。

<img src="/images/20210525b/anim.gif" alt="draw.ioでオブジェクトにアニメーションを追加する動画" width="720" height="480" loading="lazy">


## flow

こちらもアニメーションですが、線が動きます。面白いです。

https://drawio-app.com/connector-styles-and-animations-in-draw-io/

<img src="/images/20210525b/flow.gif" alt="draw.ioで矢印の線が流れるアニメーション" width="720" height="480" loading="lazy">


## tags

オブジェクトにタグを付けて、表示非表示を切り替えられます。レイヤーでよいのではないでしょうか？

<img src="/images/20210525b/tags.gif" alt="draw.ioでタグでオブジェクトの表示制御する動画" width="720" height="480" loading="lazy">

## props

右上にオブジェクトのプロパティが表示されます。邪魔です。

<img src="/images/20210525b/props.gif" alt="draw.ioでオブジェクトの左上にプロパティが表示される動画" width="720" height="480" loading="lazy">

# 所感

Draｗ.io単品でも無料でここまで使えるものかと驚きます。改めて可能性を感じました。
