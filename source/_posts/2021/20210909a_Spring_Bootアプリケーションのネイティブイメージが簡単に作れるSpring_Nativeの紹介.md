---
title: "Spring Bootアプリケーションのネイティブイメージが簡単に作れるSpring Nativeの紹介"
date: 2021/09/09 00:00:00
postid: a
tag:
  - Java
  - GraalVM
  - SpringBoot
category:
  - Programming
thumbnail: /images/20210909a/thumbnail.png
author: 本田紘規
lede: "こんにちは、2021年新卒入社の本田です。Spring Bootアプリケーションのネイティブイメージが簡単に作れる[Spring Native]について調べてみたので、それを紹介します。Spring NativeとはSpring Bootアプリケーションをほとんど変更することなく、ネイティブイメージを生成することを目指したプロジェクトです。ネイティブイメージの実行はJVMによる実行と比べて..."
---
## はじめに

こんにちは、2021年新卒入社の本田です。私はJavaもSpring Bootもほとんど何も知らないのですが、業務でSpring Bootを使いそうなので、「Spring勉強しなきゃ😇」という気持ちがあります。

Spring Bootアプリケーションのネイティブイメージが簡単に作れる[Spring Native](https://docs.spring.io/spring-native/docs/current/reference/htmlsingle/)について調べてみたので、それを紹介します。


## Spring Nativeとは?

Spring NativeとはSpring Bootアプリケーションをほとんど変更することなく、ネイティブイメージを生成することを目指したプロジェクトです。ネイティブイメージの実行はJVM(Java仮想マシン)による実行と比べて、起動時間が早い、ピークパフォーマンスに達するのが早い、メモリの使用量が小さい等の利点を持っています。

Spring Nativeでは、Spring Bootアプリケーションのネイティブイメージを生成するためにGraalVMを用いています。

## ネイティブイメージとは?
ネイティブイメージとはJavaをAOTコンパイルしたスタンドアロンな実行可能ファイルのことです(多分GraalVM用語？)。といっても意味が分からないかもしれないので、背景を説明します。

まず、CPUは機械語と呼ばれるCPUが理解できる命令しか実行できません。したがって、プログラムを実行するためには最終的に機械語に変換しなければなりません。この機械語に変換するタイミングには事前に変換、実行時に変換の2種類があります。事前にコンパイルし、機械語を生成する手法はAOT(ahead of time)コンパイル方式と呼ばれます。C、C++、 RustなどでコンパイルするといえばAOTコンパイルをするということを意味します。AOTコンパイルでは、あるCPUに向けて事前にコンパイルするため、その成果物はターゲットプラットフォームでしか動きません。

一方、Javaは事前にコードを機械語にコンパイルするのではなく、バイトコードと呼ばれるJVMが理解できるアセンブリコードに変換します。その後、JVM上でバイトコードを実行時に機械語に変換するインタプリタ方式で処理を行います。JVMが下位のプラットフォームの差異を吸収するため、多くのプラットフォームで単一コードを動かすことができます。

また、代表的なJVMはJIT(just in time)コンパイル機能を持っていて、よく実行されるコードや何度も繰り返すループなどは実行中に機械語にコンパイルされます。AOTコンパイルと比べると、実行時情報を利用することができるため、積極的な最適化を行えることがあります。ただし、JITコンパイラが実行時情報を収集するのに時間がかかるので、繰り返し実行しないとピークパフォーマンスに達しないという性質を持っています。

また、コードを実行するためにはJVMを起動し、クラスをロードする必要があるため、コードを実行するまでに時間がかかります。そのため、AWS Lambdaのようなイベントをトリガーとして、一回だけコードを実行するなどといった状況や、頻繁に再起動を行うマイクロサービスのようなアプリケーションと相性が悪いです。
このようなJVMの起動時間の長さを解消するのがネイティブイメージです。ネイティブイメージではクラスローディングなどの初期化処理が必要ないため、高速に起動できます。


### AOTコンパイル方式(上)とインタプリタ+JITコンパイル方式(下)の比較

<img src="/images/20210909a/コンパイルとインタプリタ.png" alt="コンパイルとインタプリタ.png" width="1200" height="354" loading="lazy">

## GraalVMとは?
[GraalVM](https://www.graalvm.org/)はOracle社が開発する多言語を実行することができる仮想マシンです。

現在主流となっているJVMはHotSpot VMという仮想マシンなのですが、GraalVMはHotSpot VMを拡張したものとなっています。HotSpot VMではC1、C2というJITコンパイラが使われています。C2はC++で記述されているのですが、長年の変更でコードがあまりに複雑になり、機能拡張が困難になっています。GraalVMはC2コンパイラをJava製のGraalVM JITコンパイラに置き換えていて、これにより機能の拡張が容易になりました。さらに、GraalVMはTruffleというGraalVM JITコンパイラの利用を前提とした言語実装用のライブラリを持っています。したがってTruffleを使ってあるプログラミング言語を実装すれば、その言語はGraalVMで走らせることができます。

さらに、GraalVMを使うとJavaからPythonを使う、RubyからJavaScriptを使う、なんてこともできるみたいです。夢が広がります..😳

### GraalVMのアーキテクチャ

<img src="/images/20210909a/graalVMのアーキテクチャ.png" alt="graalVMのアーキテクチャ.png" width="682" height="604" loading="lazy">

Spring Nativeの話だったのに一体何の話をしているんだ。。と思われたかもしれませんが、GraalVMは多言語を実行できる仮想マシンという側面の他に、ネイティブイメージ生成機能をもっています。Spring Nativeで用いられているのはGraalVMのネイティブイメージ生成機能です。

### GraalVMの制約

GraalVMはJavaのコードをネイティブイメージに変換する機能を持っていますが、リフレクションを始めとする動的な機能を変換するためには、JSONファイルを使って設定を記述しなければなりません。Spring BootはJavaの動的機能(リフレクション、動的プロキシ等)を多用しているため、ネイティブイメージに変換するためには大量のJSONファイルを記述する必要があります。

## Spring Native

Spring NativeとはSpring Bootアプリケーションをほとんど変更することなく、ネイティブイメージを生成できることを目指しているプロジェクトです。

Spring Nativeは動的機能を使うためのヒント文をアノテーションとして提供しています。ヒント文を記述することで、ビルド時にGraalVMの設定用JSONファイルの生成やコードの書き換えを自動で行ってくれます。

またライブラリ開発者があらかじめヒント文を書いてくれているので、サポートされているライブラリを使う場合はユーザーは基本的にはヒント文を記述する必要がありません。

## Spring Nativeで簡単なアプリケーションのネイティブイメージを作ってみる。

### ひな型作成
Spring InitializrでSpring WebとSpring Nativeを依存関係に追加してプロジェクトのひな型を生成します。

<img src="/images/20210909a/spring_initializr.png" alt="spring_initializr.png" width="1200" height="675" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;">

非常にシンプルなアプリケーションを記述します。

### コード

```java
package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    @GetMapping("/hello")
    public String hello() {
        return "Hello!";
    }
}
```

### コンテナ化

ネイティブイメージを作るために、[Cloud Native Buildpacks](https://buildpacks.io/)というソースコードからdocker containerを作成できるツールがあるので、これを使います。

Spring Initializrを使ってSpring Nativeを依存関係に追加してプロジェクトを生成した場合、Mavenなら、`mvn spring-boot:build-image`というコマンドを使ってネイティブイメージのコンテナを生成することができます。この機能を使う場合、コンテナ上でビルドが行われるため、GraalVMを端末にインストールしている必要がありません。単にネイティブイメージを生成する場合はGraalVM native build toolを使うみたいです。私はGraalVMをダウンロードしていないので、pom.xmlからnative buildツール関係の依存を削除した後、このコマンドを走らせました。私の環境(Windows 10、Core i5 10210U、 メモリ16GB、Dockerに割り当てたメモリ8GB)だと7分12秒かかりました。

<img src="/images/20210909a/image.png" alt="image.png" width="1200" height="552" loading="lazy">


### コンテナを走らせる。

<img src="/images/20210909a/image_2.png" alt="image.png" width="1200" height="765" loading="lazy">

0.076秒で起動しました。

<img src="/images/20210909a/image_3.png" alt="image.png" width="1200" height="642" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;">

動いているようです。

### ネイティブイメージコンテナと非ネイティブコンテナの比較

ネイティブイメージと非ネイティブイメージの各種メトリクスを比較してみます。ネイティブイメージ、非ネイティブイメージともにCloud Native Buildpacksを使ってコンテナ化しています。

|  | ネイティブ | 非ネイティブ |
|:-:|:-:|:-:|
|  ビルド時間  | 7分12秒  |  1分33秒 |
|  アプリケーション起動時間 |　0.076秒　| 1.911秒  |
|  実行時メモリ使用量 | 45MiB  | 165MiB  |
|  イメージサイズ | 95.5MB  | 261MB  |

ネイティブイメージはビルドが圧倒的に長いですが、アプリケーション起動時間、実行時メモリ使用量、イメージサイズは明確に非ネイティブイメージより優れています。

GraalVMにはCommunity EditionとEnterprise Editonがあり、性能はEnterprise Editionの方が上ですが、このテストはCommunity Editionで行いました。

#### パフォーマンス

[Gatling](https://gatling.io/)というツールを使ってパフォーマンスを計測してみましたが、元々のレスポンス時間が短すぎて差は分かりませんでした。実用的なアプリケーションを使って比較してみると、面白いかもしれません。


## 終わりに
ネイティブイメージは起動時間の短さが魅力的ですが、実務的にはビルド時間の長さがネックになるのかなと思いました。今回は非常にシンプルなアプリにもかかわらず7分かかっているので、プロダクションレベルのアプリのビルドにどれくらい時間がかるのかは要検証だと思います。


### 参考文献

1. Spring Native Documentation, https://docs.spring.io/spring-native/docs/current/reference/htmlsingle/
1. GraalVM https://www.graalvm.org/
1. Toshiaki Maki, JSUG勉強会 2021年その1: Spring Nativeの紹介 #jsug, https://t.co/iRR5vaK7CX?amp=1
1. きしだなおき、吉田真也、山田貴裕、蓮沼賢志、阪田浩一、前多賢太郎, みんなのJava, 技術評論社, 2020

