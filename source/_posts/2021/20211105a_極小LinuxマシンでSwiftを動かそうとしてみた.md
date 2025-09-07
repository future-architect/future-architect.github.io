---
title: "極小LinuxマシンでSwiftを動かそうとしてみた"
date: 2021/11/05 00:00:00
postid: a
tag:
  - Rust
  - M5stack
  - Linux
category:
  - IoT
thumbnail: /images/2021/20211105a/thumbnail.jpeg
author: 山本力世
lede: "今回ターゲットとした極小Linuxマシンは、M5Stack UnitV2になります。こちらのマシンは、ARM Cortex-A7デュアルコア1.2GHz、128MBメモリ、512MB内蔵フラッシュ、microSDスロット、Full HDカメラ、Wi-Fi、冷却ファンを搭載し、OSはLinuxがプリインストールされていますが..."
---
<img src="/images/2021/20211105a/Image_20211102_160635.jpeg" alt="" width="1108" height="663" loading="lazy">

[秋のブログ週間](/articles/20211027a/)連載の7本目です。

## 初めに

今回ターゲットとした極小Linuxマシンは、[M5Stack UnitV2](https://www.switch-science.com/catalog/7160/)になります。

こちらのマシンは、ARM Cortex-A7デュアルコア1.2GHz、128MBメモリ、512MB内蔵Flash、microSDスロット、Full HDカメラ、Wi-Fi、冷却ファンを搭載し、OSはLinuxがプリインストールされていますが、非常にコンパクトで1万円弱で購入できます。

[Python、Jupyter Notebookはプリインストールされている](https://docs.m5stack.com/en/quick_start/unitv2/jupyter_notebook)ので、あえて、他の手段を試す必然性は全くないのですが、Swiftのインストールを試してみました。

## Swiftのインストール手順

まずは、[buildSwiftOn ARM](https://github.com/uraimo/buildSwiftOnARM)を見つけたのですが、swiftコマンドのサイズがほぼメインメモリの容量と同じ、かつ、導入時のサイズが約650MBのため、microSDをマウントしたり色々ファイルシステムをいじらないといけないので断念。

そこで、ターゲット上でビルド環境を整えるのは諦め、クロスコンパイル環境を探すことに。
[Swift Cross Compilation Toolchains](https://github.com/CSCIX65G/SwiftCrossCompilers)を見つけるも、[5.3.3](https://github.com/CSCIX65G/SwiftCrossCompilers/releases/tag/5.3.3)からはARM32のサポートがなくなると。。

そもそも、Swiftは困難なようなので代わりにRustの環境を調べてみる方針へ変更。

手順は、まず、rustupを開発環境であるMacへ導入。

``` sh
brew install rustup
brew install arm-linux-gnueabihf-binutils
```

ビルド時にターゲットとしてarmv7-unknown-linux-gnueabihfを指定するも、エラーでうまくいかず、[ここの記述](https://sigmaris.info/blog/2019/02/cross-compiling-rust-on-mac-os-for-an-arm-linux-router/)を参考に、ターゲットをarmv7-unknown-linux-musleabihfへ変更することでようやくビルドがエラーなく実行できるようになりました。

```sh .cargo/config
[target.armv7-unknown-linux-musleabihf]
linker = "arm-linux-gnueabihf-ld"
```

```sh
rustup target add armv7-unknown-linux-musleabihf
cargo init
cargo build --target armv7-unknown-linux-musleabihf
```

環境は出来上がったので次回はRustでカメラを使ったアプリを組みたいと思います。

[秋のブログ週間](/articles/20211027a/)連載の7本目でした。
