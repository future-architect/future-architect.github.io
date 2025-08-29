---
title: "Future Tech Night #10 ～進化するJava。標準API／Tomcat編　を開催しました"
date: 2021/06/30 00:00:00
postid: a
tag:
  - OSS
  - Java
  - Tomcat
  - TechNight
  - 登壇レポート
category:
  - Programming
thumbnail: /images/2021/20210630a/thumbnail.jpg
author: 藤野圭一
lede: "こんにちは。TIG藤野です。2021/5/21を開催しました。私は、Tomcatコミッタがお送りするちょっとマニアックなTomcatのコンフィグレーション10選というタイトルでお話させていただきました。"
---
## はじめに

<img src="/images/2021/20210630a/cat-3937880_1280.jpg" alt="" width="1280" height="790">

こんにちは。TIG藤野です。

2021/5/21(金)に[Future Tech Night #10 ～進化するJava。標準API/Tomcat編～](https://future.connpass.com/event/211765/)を開催しました。

私は、Tomcatコミッタがお送りするちょっとマニアックなTomcatのコンフィグレーション10選というタイトルでお話させていただきました。

## 発表内容

<script async class="speakerdeck-embed" data-id="44d18c9ad91d41cda1732b65917fbb8c" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

目次は以下の通りです。

 1. 自己紹介
 2. ちょっとマニアックなTomcatのコンフィグレーション10選
 3. Tomcat 10以降のバージョン体系の話

Tomcatでは大々的に機能が追加されるわけではなく、しれっと有益な機能が追加されることが多々あります。そんなしれっと追加されている機能のうち、少しマニアックで且つ、役立ちそうなものを10個紹介しました。

また、発表の後半ではTomcat 10以降の難解なバージョン体系についても説明しました。

では、発表した内容をもう少し詳しく紹介します。

## 発表で話したことの概要

### ちょっとマニアックなTomcatのコンフィグレーション10選

コンフィグレーション10選として以下を紹介しました。

* **設定値を外部リソースから読み込む**
設定ファイルの設定値を直接値を設定するのではなく、${Key}指定で別ソースから経由する方法の紹介
* **ポートオフセット**
同一筐体で複数台のTomcatを立ち上げる際のポート番号の設定方法の紹介
* **Json Error Report**
TomcatのデフォルトのエラーページをHTMLからJSONに変更する方法の紹介
* **StuckThreadDetectionValve**
スタックしているリクエスト処理スレッドの検知方法の紹介
* **Legacyアプリケーションベース**
javaEE→jakartaEEへのマイグレーションを可能にするLegacyアプリケーションベースの紹介
* **静的クラスタメンバーシップ**
マルチキャストが利用できない環境下でのクラスタメンバーシップの設定方法
静的クラスタメンバーシップの紹介
* **Cloudクラスタメンバーシップ**
kubernetesクラスタ上でのTomcatのクラスタメンバーシップ構築方法の紹介
* **組込みTomcatのコンフィグソース**
組込みTomcatから設定ファイルを読み込む方法の紹介
* **ソースコード生成**
Tomcat起動時に組込みTomcatのソースコードを出力するオプションの紹介
* **多言語化対応**
最後はコンフィグではないですが、Tomcatの多言語対応はどうやっているかの紹介

### Tomcat 10以降のバージョン体系の話

Tomcat 10以降から変更されるTomcatのバージョン体系とサポートする仕様の関係について説明しました。発表内容をダイジェストで紹介します。

まず、はじめに知っておくこととして、従来のバージョン体系と仕様の関係です。TomcatはJava EEのサブセットをsupportしています。

* Tomcat 7.0.x : support Java EE 6
* Tomcat 8.5.x : support Java EE 7
* Tomcat 9.0.x : support Java EE 8

Java EEがEclipse Foundationに移管されたことにより、Java EE 8 → JakartaEE8となりました。JakartaEE8は名前が変わっているだけでJava EE 8とは完全互換になります。

そして、JakartaEE8→JakartaEE9へのバージョンアップにより、javax.* -> jakarta.* のネームスペースの変更が発生します。簡単にいうと、Java EE 8（JakartaEE8）のアプリケーションはJakartaEE9と互換性はありません。つまりはアプリケーションが動かなくなります。

では、Tomcat 10について説明します。Tomcat 10.0.xはJakartaEE9をサポートします。なので、Tomcat 9以前で稼働しているアプリケーションはTomcat 10では（マイグレーションしないと）動作しません。

Tomcat 10を含めたサポート状況は以下のなります（※これが今現在の状態になります）。

* Tomcat 7.0.x : support Java EE 6
* Tomcat 8.5.x : support Java EE 7
* Tomcat 9.0.x : support Java EE 8（JakartaEE8）
* Tomcat 10.0.x : support JakartaEE9

そして、JakartaEE10がリリースされると、サポート状況は以下のようになります。

* Tomcat 8.5.x : support Java EE 7
* Tomcat 9.0.x : support Java EE 8
* Tomcat 9.10.x : support Java EE 8 with Tomcat 10 API
* Tomcat 10.0.x : EOL
* Tomcat 10.1.x : support JakartaEE10

ポイントは、「JakartaEE9をサポートするTomcat 10.0.xはEOLになり、JakartaEEのバージョンとTomcatのメジャーバージョンを合わせ、Java EE 8を長くサポートするため、Tomcat 9系を拡張する」です。

さらに、JakartaEE11がリリースされるとこんな感じになります。

* Tomcat 8.5.x : support Java EE 7 →EOL
* Tomcat 9.0.x : support Java EE 8
* Tomcat 9.10.x : EOL
* Tomcat 9.11.x : support Java EE 8 with Tomcat 11 API
* Tomcat 10.1.x : support JakartaEE10
* Tomcat 11.0.x : support JakartaEE11

少し複雑ですが、自分のアプリケーションをどのTomcatで実行するのか適切に判断してください。

## 最後に

Tomcatは、その長い歴史故、最新プロダクトではないが、今もなお、様々な場所で現役で稼働しています。コミュニティにより開発も継続して行われ、まだまだ進化していきます。これからもTomcatを安心してお使いいただければと思います。
