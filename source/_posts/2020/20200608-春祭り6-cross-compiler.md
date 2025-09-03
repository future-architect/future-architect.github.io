---
title: "とあるマイコンのクロスコンパイラ"
date: 2020/06/08 10:37:41
postid: ""
tag:
  - マイコン
  - コンパイラ
category:
  - IoT
thumbnail: /images/2020/20200608/thumbnail.png
author: 栗田真
lede: "TIG/DXチームの栗田です。もともと宇宙物理を専攻しており、前職では製鉄メーカーでプラントエンジニアをしていました。
最近ではもっぱら工場IoT案件で制御系システムとクラウドをつなぐようなことをしていますが、その前は組み込みマイコンで制御系開発をしていました（人工衛星時代の話）"
---

[春の入門祭り](/articles/20200529/)🌸の第6弾です

# はじめに

こんにちは、TIG/DXチームの栗田です。もともと宇宙物理を専攻しており、前職では製鉄メーカーでプラントエンジニアをしていました。
最近ではもっぱら工場IoT案件で制御系システムとクラウドをつなぐようなことをしていますが、その前は組み込みマイコンで制御系開発をしていました（人工衛星時代の話）。

IT業界で働き始めると、ソースコードを書いてそれを実行してシステムを動かす、ということを行うことになりますが、その裏で頑張ってくれているのがコンパイラです。普段プログラムを書いていても、「コンパイラ使ったことあるけどその中身までは」「普段Pythonとかで特に意識したことない」な方もいると思います。

そこで今回は[春の入門祭り](/articles/20200529/)ということで、自分でコンパイラを作ります。ただしコンパイラはコンパイラでも、イチから全部作るのはなかなか大変なので、公開されているコンパイラのソースコードを使って、「クロスコンパイラ」を作ってみようと思います。

# クロスコンパイラについて

今回のテーマはクロスコンパイラですが、そもそもコンパイラとはというところから始めようと思います。

## コンパイラって何

人間が理解しやすいプログラミング言語で記述されたプログラムを、機械が理解できるバイナリにすることをコンパイルと言います。

このコンパイルを行うプログラムをコンパイラといいます。

より厳密には言語や開発環境に応じてオブジェクトファイルに変換するプログラムをコンパイラ、各種オブジェクトコードを紐付けて処理するリンクを行うプログラムをリンカ、この一連の流れを通してビルドと呼ぶこともありますが、gccを始めとして世の中でコンパイラと呼ばれるプログラムはこの一連の流れを一手に行えます（もっと細かく言うとプリプロセッサやアセンブルなどの処理もありますが、細かくしすぎること今回の趣旨から外れますので割愛します）。。ここからは平たくプラグラムを実行ファイル（バイナリ）にするプログラムを、コンパイラと呼んでいくことにします。

<img src="/images/2020/20200608/photo_20200608_01.png" loading="lazy">

余談ではありますが、同じ環境で実行できるコンパイラは複数存在します。

Cで使えるコンパイラとしてはgccやclangがあります。WindowsだとVisual Studioに付属しているコンパイラもあります。

コンパイラも特定の実行環境上で動くプログラムなので、当然実行環境やバージョンによって挙動が違います。そして気をつけなければいけないのが、同じ名前のコマンドを叩いているように見えても実際は違うコマンドを叩いているようなことがあります。代表的なところでいうと、MacのXcodeにてデフォルトで使えるgccの実体は、エイリアスがついたclangです。

```bash
$ which gcc
/usr/bin/gcc
$ gcc -v
Configured with: --prefix=/Applications/Xcode.app/Contents/Developer/usr --with-gxx-include-dir=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/usr/include/c++/4.2.1
Apple clang version 11.0.3 (clang-1103.0.32.59)
Target: x86_64-apple-darwin19.5.0
Thread model: posix
InstalledDir: /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin
```

gccもclangもコンパイラであることに変わりはないですが、XcodeでインストールされるclangはAppleが提供するclangでして、古いバージョンのライブラリなどが同梱されていてやられることがあります。

実際に経験した経験したケースでいうと、コンパイルしてできた実行ファイルが特定サイズを超えると余計なバイナリ文字が入ってしまい、結果プログラムが暴走しました。

古いバージョンのライブラリが同梱されている理由は各種ライブラリのライセンスの関係などがあるのですが、そういうときは、HomebrewやMacPortsでインストールした適切なコンパイラに切り替えましょう。

さらに余談ですが、コンパイラもプログラムとすると、コンパイラを作るコンパイラが必要となります。まるで鶏が先か卵が先かと言うような話ですが、特定のプログラムを使って同じバージョンの新しいバージョンを作ることをセルフホスティングと呼びます。例えばGoは1.5以降からセルフホスティングされています。

## クロスコンパイラの必要性

<img src="/images/2020/20200608/photo_20200608_02.png" loading="lazy">

大学在学時の研究やあるいは趣味でプログラミングしている場合、開発（コンパイル）環境と実行環境が同じケースが多いかと思いますが、異なる環境で動作させなければならないケースがあります。

このような「開発（コンパイル）環境と異なる実行環境で動くようにプログラムをコンパイルするプログラム」をクロスコンパイラと呼びます。この場合の環境とはアーキテクチャレベルでの話であり、最たる例はマイコンなどの組み込み開発です。ラズパイのようなOSが搭載されているようなものではなく、もっと低レイヤーのものになります。有名どころだとArduinoなどがそれに当たりますが、他にはSTM32bitマイコン、もっと前だとH8マイコンなどがあります。

マイコンは昨今だと家電の制御部などを想像していただければ良いですが、これらマイコンは開発環境を備えておらず、起動時に記憶領域に書き込まれたプログラムをロードして動くことになります。となると、このマイコン上で動くプログラムを別のマシン上で作る必要があり、このときに必要となるのがクロスコンパイラです。

開発環境としてはマイコンを提供している会社がIDEの形で提供しており、書き込み用のツールなどもセットで存在します。このツール、会社によっては有償になっていることがあり、確かに無料で使える試用期間が設けられていますが、やはり長期に渡る開発には向きません。

こんなときの選択肢は、買うか、作るかです。

今回は作りましょう。

# 実際に作ってみる

今回作るターゲットは arm-none-eabi-gcc です。

これはARMという組込みアーキテクチャ用のクロスコンパイラです。環境としては、macOS Catalina 10.15.5 & MacPorts とします。なお、過去Ubuntuでもクロスコンパイラを作成したことはありますが、ここではややこしくなるため省きます。

## 材料

今回の材料は次のとおりです。他にコンパイルに必要なものは、適宜インストールするものとします（さすがにcommand line toolいるでしょ、とかそういう話は特にしません）。

なお、バージョンとしては基本現時点での最新版でいいと思いますが、gccとbinutilsは直近当てられたパッチ部分がうまく対応してくれなかったので、少し古いものにしました。

* ダウンロードして用意するもの（コンパイルするもの）
  * [gcc-9.1.0](http://gcc.gnu.org/)
  * [binutils-2.32](https://www.gnu.org/software/binutils/)
  * [newlib-3.3.0](https://sourceware.org/newlib/)
* MacPortsでインストールするもの
  * MPC
  * GMP
  * MPFR

binutilsはアセンブラや逆アセンブラあるいはリンカなどを目的として利用します。

gccはコンパイラとして利用するために利用します。newlibは組込みシステム向けに実装された標準Cライブラリで、今回gccをコンパイルするときに利用します。

MacPortsでインストールするとした３つは、gccをコンパイルするときに必要になるものです。

gcc4.3以降で依存しているMPC, GMP, MPFRをインストールします。

## コマンド

### MacPortsでのインストール

コマンド1つで終わり、あとは確認です。

```bash
$ sudo port -v install libmpc
$ port deps libmpc
Full Name: libmpc @1.1.0_1
Library Dependencies: gmp, mpfr
$ port installed | grep -e mpc -e gmp -e mpfr
  gmp @6.2.0_1 (active)
  libmpc @1.1.0_1 (active)
  mpfr @4.0.2_1 (active)
```

### コンパイル時に使うgccの選択

先程「MacのXcodeでデフォルトされているclang」について説明し、確かにgccで呼び出されているものがAppleのclangだと確認できました。

これから、コンパイラを切り替えます。

```bash
$ sudo port -v install gcc10
$ port select --list gcc
Available versions for gcc:
	mp-gcc10
	none
$ sudo port -v select --set gcc mp-gcc10
Password:
Selecting 'mp-gcc10' for 'gcc' succeeded. 'mp-gcc10' is now active.
$ gcc -v
Using built-in specs.
COLLECT_GCC=gcc
COLLECT_LTO_WRAPPER=/opt/local/libexec/gcc/x86_64-apple-darwin19/10.1.0/lto-wrapper
Target: x86_64-apple-darwin19
Configured with: /opt/local/var/macports/build/_opt_bblocal_var_buildworker_ports_build_ports_lang_gcc10/gcc10/work/gcc-10.1.0/configure --prefix=/opt/local --build=x86_64-apple-darwin19 --enable-languages=c,c++,objc,obj-c++,lto,fortran --libdir=/opt/local/lib/gcc10 --includedir=/opt/local/include/gcc10 --infodir=/opt/local/share/info --mandir=/opt/local/share/man --datarootdir=/opt/local/share/gcc-10 --with-local-prefix=/opt/local --with-system-zlib --disable-nls --program-suffix=-mp-10 --with-gxx-include-dir=/opt/local/include/gcc10/c++/ --with-gmp=/opt/local --with-mpfr=/opt/local --with-mpc=/opt/local --with-isl=/opt/local --enable-stage1-checking --disable-multilib --enable-lto --enable-libstdcxx-time --with-build-config=bootstrap-debug --with-as=/opt/local/bin/as --with-ld=/opt/local/bin/ld --with-ar=/opt/local/bin/ar --with-bugurl=https://trac.macports.org/newticket --disable-tls --with-pkgversion='MacPorts gcc10 10.1.0_0' --with-sysroot=/Library/Developer/CommandLineTools/SDKs/MacOSX10.15.sdk
Thread model: posix
Supported LTO compression algorithms: zlib
gcc version 10.1.0 (MacPorts gcc10 10.1.0_0)
```

確かに、gccが切り替わりました。

### コンパイル

上述したリンク先から必要なソースをダウンロードし、下記のように配置します。

```text
work
├── arm-none-eabi-gcc
└── src
    ├── binutils-2.32.tar.xz
    ├── gcc-10.1.0.tar.gz
    └── newlib-3.3.0.tar.gz
```

#### binutilsのコンパイル

一気にいきます。

```bash
export CFLAGS="-I/opt/local/include -O2"
export CXXFLAGS="-I/opt/local/include -O2"
export LDFLAGS="-L/opt/local/lib"
tar zxvf binutils-2.32.tar.xz
cd binutils-2.32
./configure --prefix=/Users/kurita/work/arm-none-eabi-gcc --disable-werror --target=arm-none-eabi --enable-interwork --enable-multilib
make -j4
make install
```

特にエラーなどでなければ成功です。

#### gccのコンパイル

こちらも一気にいきます。なお、newlibはgccのコンパイル時に使用するもので、それ自体でコンパイルすることはしません。

```bash
cd ~/work/src
tar zxvf newlib-3.3.0.tar.gz
tar zxvf gcc-9.1.0.tar.gz
cd gcc-9.1.0
ln -s ../newlib-3.3.0/newlib .
mkdir build
cd build
../configure --prefix=/Users/kurita/work/arm-none-eabi-gcc  --target=arm-none-eabi --enable-interwork --enable-multilib --with-newlib --enable-langages="c,c++"
make -j4
make install
```

最後に、パスを通して終わりです。

```bash
export PATH=$PATH:/Users/kurita/work/arm-none-eabi-gcc/bin
```

簡単ではありますが、試しに `--version` で情報表示してみましょう。

```bash
$ arm-none-eabi-gcc --version
arm-none-eabi-gcc (GCC) 9.1.0
Copyright (C) 2019 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

これでMacでARM開発する準備が整いました。
どうやって書き込むのだとかそういう話はありますが、そこはぜひ実際に買ってみて、試行錯誤しながら開発してみていただきたいと思います。

# クロスコンパイラはマイコンの世界だけではない

「開発（コンパイル）環境と異なる実行環境で動くようにプログラムをコンパイルするプログラムがクロスコンパイラ」と言いましたが、これはマイコンの世界には閉じません。

次のコマンドはこのFuture Tech Blogでも何度か出てきている、GoのプログラムをAWS Lambda向けの実行ファイルを作るコマンドです。

```bash
GOOS=linux GOARCH=amd64 go build -o lambda/lambda ./lambda/main.go
```

AWS Lambdaで提供されるgoのランタイムはgo1.xなのですが、これはAmazon Linux上で動くことになります。

そのため、AWS Lambdaに登録するGoのコードは、OSとしてlinuxを指定し、またアーキテクチャとしてamd64を指定します。

これもクロスコンパイルになります。

# 車輪の再実装

今回のブログで私は1つだけ嘘を付きました。「マイコン用開発環境を用意するときの選択肢は、買うか、作るか」だけではなく、「フリーで公開されているものを使う」という方法が取れます。すでにarm-none-eabi-gccはMacPortsでインストール可能です。Homebrewなどでも公開されているようですので、わざわざ自分で作る必要はありません。

そのため使いたければ各種パッケージ管理ツールでインストールすればいいだけですが、自分が今使用しているツールがどのようにして作られているかを知ることは、原理原則を理解するには非常に大切かと思います。

例えば新人さんなど、最初はひたすらポチポチコマンドの写経から始まるかもしれませんが、コマンド1つ1つの意味を考えながら、「このオプションにはこういう意味があるのだ」「今自分はこういうことをしているのだ」ということを理解しながらお仕事していければいいなと思います。
