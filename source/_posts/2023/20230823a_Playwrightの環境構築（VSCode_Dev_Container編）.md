---
title: "Playwrightの環境構築（VSCode Dev Containers編）"
date: 2023/08/23 00:00:00
postid: a
tag:
  - Playwright
  - VSCode
  - Docker
  - 環境構築
category:
  - Programming
thumbnail: /images/20230823a/thumbnail.png
author: 武田大輝
lede: "VSCode Dev Containersを利用してPlaywrightの実行環境をコンテナ上に構築する手順を説明します。"
---

[Playwright連載](/articles/20230821a/)の2本目です。

## 概要

[VSCode Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)を利用してPlaywrightの実行環境をコンテナ上に構築する手順を説明します。

## Requirements

* Docker
* VSCode with [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) Extension

## X Window Systemのセットアップ

<div class="note warn" style="background:#fdf9e2; padding:16px; margin:24px 0; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>
  <p>【2024/02/26 追記】</br>
    起動したコンテナ内でテストを実行する際 <code>--ui-host</code> オプションに <code>0.0.0.0</code> を指定することで、ホストマシン側のブラウザからGUIにアクセスできます。このオプションを使用することで、本記事記載のX Window System関連の設定は不要となります。</br>
    詳細は<a href="https://playwright.dev/docs/test-ui-mode#docker--github-codespaces">公式ドキュメント</a>を参照してください。</br>
  </p>
</div>


Playwrightをデバッグ起動したりUIモードで起動したりする場合、コンテナ上で起動するGUIをホストOS上に表示する必要があるため、X Window Systemを利用します。（Playwrightをコマンドラインのみで利用する場合、本手順は不要です。）
なお、何も設定をせずにコンテナ上でGUIを起動しようとすると`Missing X server or $DISPLAY`のようなエラーが発生します。

今回はホストOSとしてMacを利用しているため [Xquartz](https://www.xquartz.org/) の導入手順を紹介します。
Windowsの方は[Xming](http://www.straightrunning.com/XmingNotes/)などを利用してください。


Xquartzをインストールし、コンテナからのアクセスを許可するため「ネットワーク・クライアントからの接続を許可」します。
下記はコマンドラインから実行していますがGUI上から実施していただいても構いません。

```bash
# Install Xquartz
$ brew install --cask xquartz
# Go to Preferences -> Security, and check “Allow connections from network clients”
$ defaults write org.xquartz.X11 nolisten_tcp 0
```

設定後はXquartzを再起動して設定を反映させます。
その後ローカルホストからのアクセスを許可した状態（`xhost +localhost` or `xhost +`）で Xquartzを起動させておけば準備は完了です。

## Dev Containersの設定

`devcontainer.json` を抜粋します。

```json
// For format details, see https://aka.ms/devcontainer.json. For config options, see the
// README at: https://github.com/devcontainers/templates/tree/main/src/debian
{
  "name": "Playwright",
  // 1. コンテナイメージの指定
  "image": "mcr.microsoft.com/playwright:v1.36.1",

  // 2. VSCode拡張機能の設定
  "customizations": {
    "vscode": {
      "extensions": ["ms-playwright.playwright"]
    }
  },

  "mounts": [
    // For node modules.
    {
      "type": "volume",
      "source": "${localWorkspaceFolderBasename}-node_modules",
      "target": "${containerWorkspaceFolder}/node_modules"
    },
    // 3. X Window System関連の設定
    {
      "type": "bind",
      "source": "/tmp/.X11-unix",
      "target": "/tmp/.X11-unix"
    }
  ],
  "containerEnv": {
    // 3. X Window System関連の設定
    "DISPLAY": "host.docker.internal:0.0"
  }
}
```

### 1. コンテナイメージの指定

Playwright公式の[Docker Image](https://playwright.dev/docs/docker)を利用するのが良いでしょう。
[Dockerfile](https://github.com/microsoft/playwright/blob/release-1.36/utils/docker/Dockerfile.jammy#L39)を見ると `playwright-core install --with-deps` でブラウザ含め必要な依存関係をインストールしてくれています。

利用可能なタグは[こちら](https://mcr.microsoft.com/en-us/product/playwright/tags)から確認できます。

### 2. VSCode拡張機能の設定

最低限 [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)は導入しておくと良いでしょう。

### 3. X Window System関連の設定

`/tmp/.X11-unix`をホスト側とコンテナ側で共有することにより、ドメインソケットを共有します。

```json
  "mounts": [
    // For X Window System.
    {
      "type": "bind",
      "source": "/tmp/.X11-unix",
      "target": "/tmp/.X11-unix"
    }
  ]
```

ホストOSのディスプレイを利用するため `DISPLAY` 環境変数を指定します。

```json
  "containerEnv": {
    // For X Window System.
    "DISPLAY": "host.docker.internal:0.0"
  }
```

## GUI起動確認

コンテナ上でGUIを起動すると、ホストOS側で表示されることが確認できました。

```bash
npx playwright test --ui
```

<img src="/images/20230823a/Playwright.png" alt="Playwright.png" width="1200" height="738" loading="lazy">

---

次は木戸さんの[イチ押し。Playwrightの快適機能](/articles/20230824a/)です。
