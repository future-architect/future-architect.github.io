---
title: "Systemdにおけるservice unitの起動フロー入門"
date: 2024/04/12 00:00:00
postid: a
tag:
  - Linux
category:
  - Infrastructure
thumbnail: /images/2024/20240412a/thumbnail.jpg
author: 森大作
lede: "Linuxのsystemdにおけるservice unitの起動と停止のフローに関して説明します"
---
<img src="/images/2024/20240412a/IMG_8598.jpg" alt="" width="1200" height="831" loading="lazy">

[春の入門連載2024](/articles/20240408a/) の4本目です。

# はじめに

こんにちは、最近寒暖差が激しくて体調崩しがちなTIGの森です。

入門向け記事としてLinuxの `systemd` における `service unit` の起動と停止のフローについて説明します。

## service unit とは

`service unit` とは `systemd` の設定単位の1つで、Linuxにおけるサービスの振る舞いを定義する設定をまとめたものです。主にデーモンやその他のシステムプロセスといった、起動や停止を含む管理を行います。

## サービス起動の大まかな流れ

サービスの起動のおおまかな流れを説明します。

ここでは話を簡単にするため、`Type`ディレクティブ(後述)がデフォルトの `simple` に指定されているとします。

### サービス起動の流れ

1. `systemctl start [サービス名].service`を実行すると、`systemd`は指定された`service unit`を起動する
2. `systemd`は`service unit`の設定ファイル(`.service`)を確認し、サービスが有効かどうかなどを調べる
3. `systemd`が`fork()`を実行し、成功した時点で`service unit`が`active`になる。この新しく生成されたプロセスはサービスを起動するためのプロセスとなる
4. この新しいプロセスが必要な環境設定（環境変数の設定など）を行った後、`ExecStart`で指定されたプログラムを`execve()`で実行する
5. サービスのプログラムが実行され、サービスが開始する

以上がざっとした流れです。もちろんLinuxにおけるサービス管理全てを網羅しているということではありません。初期化だけを実施する`iptables`などの例外もあります。

## サービス起動・終了時の前後の処理に関して

サービス実行の主要なコマンドの前に環境変数の設定や通信路の準備や初期化などを実施する場合、`ExecStart`の前処理として実行される`ExecStartPre`や、`active`となった時点で実行される`ExecStartPost`、また終了時に実行される`ExecStopPost`などのディレクトリが用意されています。

サービス起動・終了に関連するディレクティブは下記です。

| 名称 | 概要 |
|---| ---- |
|`ExecStartPre`|依存関係を満たすためのリソースの確保、前段処理を実施する |
|`ExecStart`|環境変数を読み込み、サービス処理のプログラムを実行する |
|`ExecStartPost`|`active`になる前のタイミングで実施する後処理を実施する |
|`ExecStop`|サービス停止のプログラムを実施する |
|`ExecStopPost`|サービス終了後の後処理を実施する。`inactive`になる前の実施する |
|`ExecReload`|サービスのリロードを実施する|

## サンプル

例として、`ExecStartPre`で実際にどのような前処理が実施できるか試してみましょう。

EC2のインスタンスのメタデータから自身のリージョンを取得し、それをサービスから呼び出して出力させます。

### 手順

1. 環境変数の設定ファイル`/etc/environment`に下記の行を追加して、デフォルトのリージョンを指定

    ```bash /etc/environment
    Region=default
    ```

2. `ExecStartPre`で叩かれる事によって自分のリージョンを取得するシェル`/etc/setEnvConf.sh`を作成

    ```bash /etc/setEnvConf.sh
    #!/bin/bash
    
    REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed -e 's/.$//')
    sudo sed -i "/^Region=/c\Region=$REGION" /etc/environment
    ```

3. `/etc/systemd/system`配下に`test.service`を作成

    ```ini test.service
     [Unit]
    Description=Test Service
    After=network.target

    [Service]
    EnvironmentFile=/etc/environment
    ExecStartPre=/bin/bash /etc/setEnvConf.sh
    ExecStart=/bin/bash -c 'echo "The region of this instance is ${Region}" > /tmp/output.txt'

    [Install]
    WantedBy=multi-user.target
    ```

4. サービスファイルを読み込んで起動

    ```sh
    sudo systemctl daemon-reload
    sudo systemctl start test
    ```

以上が手順になります。
サービスが無事起動したら`/tmp/output.txt`を見てみましょう。

```txt /tmp/output.txt
The region of this instance is ap-northeast-1
```

ちゃんと自身のインスタンスのリージョンが取得できています。

災対環境などでAMIからインスタンスを起動する時に自身のリージョンを取得して、処理に繋げる際などに応用できるでしょう。

## 注意点

今回は触れませんでしたが`unit` が`active`や`inactive`になるタイミングは `Type` ディレクティブの指定によって微妙に変化します。
  
この記事ではデフォルトの`simple`を用いていますが、これは代表プロセスが`fork()`の実行に成功したときに`active`になります。つまり、`ExecStart`が失敗しようがその前段階の環境変数の設定や`ExecStartPre`ができていれば`active`にはなってくれるということです。

一方で明示的に`Type`を`exec`に指定した場合、`ExecStart`で指定したプログラムから`execve()`の実行が成功したときに`active`になります。他にも様々な Type ディレクティブがありますが、`active` になるタイミングがいつなのかはしっかり意識して前処置や後処理を運用していくことが運用上求められるでしょう。

## まとめ

システムを安定させる上で重要なのは、サービスが`active`になるタイミングやその前後の処理の流れを正確に理解することです。

また、`[Unit]`セクションに`After`を記述し、異なるサービス間で起動順序を制御することも一般的です。したがって、これらの順序をより一層意識した運用が求められるでしょう。
