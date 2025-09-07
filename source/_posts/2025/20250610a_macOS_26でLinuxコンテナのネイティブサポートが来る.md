---
title: "macOS 26でLinuxコンテナのネイティブサポートが来る"
date: 2025/06/10 00:00:00
postid: a
tag:
  - Mac
  - Docker
  - Linux
  - コンテナ
category:
  - DevOps
thumbnail: /images/2025/20250610a/thumbnail.png
author: 澁川喜規
lede: "現在開催中のWWDCで、Linuxコンテナネイティブサポートが発表されました。毎年WWDCの時期になると仮想化のアップデートの話が来るのをずっと首を長くしてまっていた日々だったので、待望のアップデートです。macOSは以前から、Linux仮想化の機能がOSのAPIレベルでサポートしており.."
---

現在開催中の WWDC で、Linux コンテナネイティブサポートが発表されました。

- [Containerization の紹介 - WWDC25 - ビデオ - Apple Developer](https://developer.apple.com/jp/videos/play/wwdc2025/346)

毎年 WWDC の時期になると仮想化のアップデートの話が来るのをずっと首を長くしてまっていた日々だったので、待望のアップデートです。macOS は以前から、Linux 仮想化の機能が OS の API レベルでサポートしており、[カーネルイメージを指定して起動](https://developer.apple.com/documentation/virtualization/running-linux-in-a-virtual-machine)できたりしました。これで、WSL2 に負けない環境はすぐにでも出るんじゃないかと思いはや数年。それがとうとうきました。なお、今回は macOS 26 beta 1 と、0.1.0 の[container](https://github.com/apple/container/releases)をもとにしていますので、時間がたてば状況が変わる可能性がある点にご注意ください。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">WWDCで一番楽しみにしていたVirtualization Frameworkのセッション。EC2のmacインスタンスを実装しているような人には嬉しそうなネットワークブロックデバイス。I/Oパフォーマンスアップはどれぐらいのものだろうか？<a href="https://t.co/f3UF03wUxa">https://t.co/f3UF03wUxa</a></p>&mdash; 渋川よしき (@shibu_jp) <a href="https://twitter.com/shibu_jp/status/1666585761741959168?ref_src=twsrc%5Etfw">June 7, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">WWDCで一番期待しているのは、AIでも新型Macの発表でもなくて、macOS Subsystem for Linuxです。メモリバルーニングで固定メモリ割り当てなくてもいいLinuxサブシステムが実現できるAPIはすでにある。そうすれば少ないメモリでも効率よくコンテナ起動したりできる。</p>&mdash; 渋川よしき (@shibu_jp) <a href="https://twitter.com/shibu_jp/status/1788736360934965574?ref_src=twsrc%5Etfw">May 10, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

# container

今回、Apple は 2 つの OSS を公開しました。前者がコマンドラインツールで後者はバックエンドのサービス？のようです。[前者の Release にあるインストーラ](https://github.com/apple/container/releases)でインストールすれば後者からは特にダウンロードする必要はありません。OSS で修正したい人向けにソースが公開されています。

- [github.com/apple/container](https://github.com/apple/container)
- [github.com/apple/containerization](https://github.com/apple/containerization)

<img src="/images/2025/20250610a/スクリーンショット_2025-06-10_8.38.48.png" alt="スクリーンショット_2025-06-10_8.38.48.png" width="732" height="560" loading="lazy">

インストールしたら以下のコマンドを実行すると必要なものを追加でダウンロードしてきます。

```sh
container system start
```

Docker とほぼ互換の container コマンドで起動すれば素早く立ち上がります。起動早いですね。

```sh
container run --rm -it --name debian debian:bookworm
```

# コンテナを Linux 以外で動かす歴史

コンテナは Linux の軽量なリソース分離の仕組みを活用して、VM よりもコンパクトな独立した OS 環境を作って起動する、というのが元の始まりです。ただし、Linux 以外だと Linux カーネルの仕組みは使えないため、仮想 OS で Linux を入れてから動かす必要がありました。

当初は 4GB だと 8GB だの固定のメモリ領域を持った仮想 PC の Linux を起動し、その中で Docker を動かしていました。どんな小さなアプリケーションを起動するのにも固定のリソースのリソースが必要でした。

Windows は WSL2 という、Linux 仮想環境を 5 年前にリリースしました。Windows の持つ Hyper-V という仮想化の仕組みの上で Linux を動かします。Linux と Windows はメモリを共有しており、デフォルト設定では、Linux からは Windows の持つ物理メモリの 50%のメモリもしくは 8GB の少ない容量が見えます。アプリケーションがメモリを必要として Linux カーネルにリクエストしてきたら、Windows からメモリをもらってきてアプリケーションに渡します。

- [WSL2: 開発環境構築＆ツール開発ガイド](https://zenn.dev/ys/books/6e3f3bc6e3cf741484df)

ただし、Linux は本来は自分だけが管理する世界でパフォーマンスに全力を出すという世界の中で生きています。ディスクアクセスをすると、二回目のロードのためにすべてバッファとしてメモリがある限りはキャッシュします。そんな感じで一度 Linux カーネルが持ったメモリはあまり Windows に帰ってこないという問題がありました。当初は Windows の 80%が見えていましたが減らされて現在に至ります。

その後アップデートで多少の改善はありました。

- [zenn: dozo 氏 WSL のアップデートでメモリ開放？](https://zenn.dev/dozo/articles/f47e7df7dfa41e)

Apple は確か 2022 年に Virtualization Framework をリリースしました。これも WSL2 同様メモリを macOS と融通し合うメモリバルーニングに対応しているし、将来に期待、と思っていましたが、残念ながらこれを活用するコンテナエンジンはこれまで出てきませんでした。ただ、パフォーマンスは良くなったので体験は良くなりました。mac でよく問題として言われていたホストとのストレージの共有はそもそも必要性は減っていますが、速度もアップしました。

今回の仕組みは軽量なカーネルと独自の initd のみの軽量な VM をコンテナごとに動かすという方法を Apple は発表しました。

<img src="/images/2025/20250610a/スクリーンショット_2025-06-10_6.24.42.png" alt="スクリーンショット_2025-06-10_6.24.42.png" width="1200" height="631" loading="lazy">

[こちらの説明](https://github.com/apple/container/blob/main/docs/technical-overview.md#releasing-container-memory-to-macos)を見ると、Windows 同様 OS にメモリを返すところはまだ部分的なサポートとありますが、コンテナ=VM の場合の macOS では影響範囲としては単独のコンテナになります。WSL とは違ってコンテナさえ再起動しちゃえば OK のように見えます。Go のように言語ランタイムの TCMalloc で OS とのメモリのやり取りを減らしてメモリを使い回すとか、sync.Pool でアプリ内部でメモリ再利用を積極的に行うようにすればさらに問題は軽減されるかと思われます。

Linux カーネルは[ここの説明](https://github.com/apple/containerization/tree/main?tab=readme-ov-file#pre-build-kernel)によると、virtio だけカーネルに組み込み（モジュールではなく）にしておけば良いうという感じのようですね。Microsoft は[いろいろカスタム](https://github.com/microsoft/WSL2-Linux-Kernel)していた気がしますが。

# WSL2 との違い

現状の僕の理解で WSL2 との違いはこうじゃないかというのを書いてみました。

今どきの Windows は Hyper-V の上で動いている OS の 1 つという構成です。Windows 10 のときは WSL2 や Hyper-V の仮想化をした時だけこのような構成になっていましたが、Windows 11 からはセキュリティ対策も兼ねてこの構成が標準にになったと理解しています。Docker は WSL2 の中で動きます。Linux カーネルがあってその中にコンテナのランタイムがあり、その中でコンテナが動いています。

macOS はそのようなハイパーバイザの上で動く感じではなく、おそらく通常の darwin カーネルの中で Virtualization Framework がいます。絵には書いてないですが、その下にさらに低レベルな Hypervisor Framework があります。今回の発表では、コンテナごとに VM があがり、その中でコンテナが実行されるということだったので、この図のような感じかと思います。Docker のランタイムにあたるプログラムは Linux カーネルの外側にあるというのが違いかな、と思います。

<img src="/images/2025/20250610a/名称未設定ファイル.drawio.png" alt="名称未設定ファイル.drawio.png" width="541" height="201" loading="lazy">

皆さんのパソコンではプログラムはたくさんの共有ライブラリを使っています。100 個のプログラムが共通の dll なり.so なりを使ていたとして、100 個分のメモリは使わず、ディスクから読み込んだプログラムイメージは物理メモリ上は 1 つだけ配置されて、仮想メモリの形で見た目のアドレスだけ複製されているような形になります。macOS のほうの Linux カーネルも同じような感じでメモリ共有されるのかどうかはわからないのですが、もし共有されるとしたら面白いな、と思っています。

# compose や Dev Containers はまだ動かない

現状は単独の Docker 相当の機能のみの提供となっています。compose もありません。

コンテナというと開発環境をすべてコンテナのなかで動かす Dev Containers が実用になるかどうかが気になるところかと思います。podman とかも起動コマンドが違うので、Dev Containers 側でコマンドは変更できるようになっています。一応これを設定してみても・・・

<img src="/images/2025/20250610a/スクリーンショット_2025-06-10_12.13.51.png" alt="スクリーンショット_2025-06-10_12.13.51.png" width="1029" height="132" loading="lazy">

実行時にはエラーになります。

<img src="/images/2025/20250610a/スクリーンショット_2025-06-10_9.08.02.png" alt="スクリーンショット_2025-06-10_9.08.02.png" width="563" height="112" loading="lazy">

また、Docker Desktop のようなコンテナのインスペクタとか管理画面はありません。Docker はという Unix ドメインソケットを`/var/run/docker.sock`というパスにつくり、そこに対してリクエストを送ることで、リモートで制御できます。container は XPC というプロセス間通信を使っており、`/var/run/docker.sock`はないので、[dozzle](https://dozzle.dev)や[Portainer](https://www.portainer.io)といった既存の管理画面は動きません。

あとは、まだ GPU や NPU を使う方法とかも情報はないですね。

とはいえ、このあたりは些細な差というか、まだ正式リリースまでは先だと思うので更新が楽しみです。
