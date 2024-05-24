---
title: "Playwright連載始まります"
date: 2023/08/21 00:00:00
postid: a
tag:
  - Playwright
  - E2Eテスト
  - フロントエンド
  - Cypress
category:
  - Programming
thumbnail: /images/20230821a/thumbnail.png
author: 澁川喜規
lede: "現在人気が高まりつつあって、Cypressを追い抜こうとしているのがPlaywrightです。かなりCypressを意識して機能追加を行なってきている印象があります。現時点では..."
---

<img src="/images/20230821a/playwright.png" alt="" width="800" height="379">

E2Eフレームワークとして高い人気を誇ってきたのがCypressです。使いやすいテストランナー、わかりやすいテスト結果、TypeScriptの組み込みサポート、プラグインによる拡張、(Seleniumと比較して)高速な実行などを提供しています。フューチャー社内でも使っているプロジェクトがいくつもあり、過去にCypress連載をブログ上で行い、それがきっかけとなってSoftware Designに連載も行いました。

一方で、現在人気が高まりつつあって、Cypressを追い抜こうとしているのがPlaywrightです。かなりCypressを意識して機能追加を行なってきている印象があります。現時点では特徴的なタイムトラベルデバッガー（過去の履歴すべてを保持しておいて気軽に前後DOMの状態を比較したりできる)、スクリーンショット、どちらもExperimentalなコンポーネントテストなど、できることはほぼ互角と言える状況です。

## スケジュール

全部で7記事を予定しています。

| 日付 | タイトル | 投稿者 |
| ----- | ------- | ---------- |
| 8/22 | 藤戸四恩 | [Playwrightのインストール方法と使い方](/articles/20230822a/) |
| 8/23 | 武田大輝  | [Playwrightの環境構築（VSCode Dev Container編）](/articles/20230823a/) |
| 8/24 | 木戸俊輔 | [イチ押し。Playwrightの快適機能](/articles/20230824a/) |
| 8/25 | 澁川喜規 |[Playwrightのテストランナーを他のテストライブラリと比較する](/articles/20230825a/)
| 8/28 | 枇榔晃裕 | [PlaywrightをGitHubActions実行したときの初期処理についての試行錯誤](/articles/20230828a/)
| 8/29 | 武田大輝  | [クライアント/サーバ構成でみるPlaywright](/articles/20230829a/) |
| 8/30 | 小澤泰河 | (仮)Next.js × Playwright の E2E テスト入門ハンズオン（App Router / Tailwind CSS / Headless UI） |

## さいごに

どれだけ人気が高まっているかGoogleトレンドを見てみましょう。世界的傾向をみると、３年前はほとんどトレンドに表れていなかったPlaywrightですが、1.5年ほど前から徐々に伸び始めていることがわかります。直近ではCypressの半分程度まで上がってきています。

<img src="/images/20230821a/スクリーンショット_2023-07-25_9.55.13.png" alt="" width="1173" height="699" loading="lazy">

日本だけに限定すると、ここ1ヶ月はCypressよりもPlaywrightの方が上となっています。

<img src="/images/20230821a/スクリーンショット_2023-07-25_9.54.32.png" alt="" width="1174" height="443" loading="lazy">

本連載ではなぜPlaywrightがこれほど人気になっているのかが明らかになると思います。逆にもしかしたらライバルの良いところも見つかるかもしれません。
