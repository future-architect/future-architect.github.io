---
title: "DJI Mobile SDKのサンプルコードでシミュレータを動かしてみる"
date: 2024/05/21 00:00:00
postid: a
tag:
  - エミュレータ
  - Android
  - ドローン
category:
  - Mobile
thumbnail: /images/2024/20240521a/thumbnail.png
author: 大前七奈
lede: "ドローンを利用して自動操縦（Autopilot）のロジックを組みたいですが、自宅でドローンを飛ばしたら家が壊されてしまう恐れがあるので、シミュレータを使います。"
---

## やりたいこと

ドローンを利用して自動操縦（Autopilot）のロジックを組みたいですが、自宅でドローンを飛ばしたら家が壊されてしまう恐れがあるので、シミュレータを使いたいなと思いました。

調査した結果、DJI Assistant 2というアプリがあり、開発PCでデバッグしながら動きを見ることができるそうです。

早速、作業に入りましょー！

## 必要なもの

- DJI Phantom 4
- リモートコントローラー(以下、RC)
- USBケーブル数本

<img src="/images/2024/20240521a/image.png" alt="" width="1200" height="904" loading="lazy">

## バージョン

- 開発PC
  - Android Studio Hedgedog
  - Android SDK API Level 31
  - Gradle 7.5
  - Gradle JDK Correcto-11
- シミュレータ用PC
  - DJI Assistant 2 for Phantom
- Bridge App用携帯
  - DJI Bridge App

## システム構成

<img src="/images/2024/20240521a/image_2.png" alt="image.png" width="1200" height="426" loading="lazy">

## 手順

### １（開発PC）DJI Mobile SDK V4をクローン

https://github.com/dji-sdk/Mobile-SDK-Android/tree/master

### ２（開発PC）DJI DeveloperでAPIキーを発行

- [DJI Developer](https://developer.dji.com/user/apps/#all)でログイン
- 「CREATE APP」でアプリケーションを登録する

※Package Nameはサンプルコード内のパッケージ名（各パッケージが存在するパス：Sample Code/app/src/main/java）。その他の項目は適当に記載

<img src="/images/2024/20240521a/image_3.png" alt="image.png" width="1192" height="1130" loading="lazy">

### ３（開発PC）サンプリコード内にAPIキーを入力

AndroidManifest.xml（パス：Sample Code/app/src/main/main)

<img src="/images/2024/20240521a/image_4.png" alt="image.png" width="1200" height="405" loading="lazy">

### ４（開発PC）Sample Codeフォルダーを開いてビルドする

- gradle-wrapper.properties(パス：Sample Code/gradle/wrapper)で一度「Sync」OR「build」
※まず最初からSyncするといいと思うが、大抵の場合ビルドエラーが起こる。こんな感じ

<img src="/images/2024/20240521a/image_5.png" alt="image.png" width="1200" height="569" loading="lazy">

- 「Change Gradle version in Gradle wrapper to 7.5....」を押すと、自動的にgradle-wrapper.propertiesの中身を書き換えてくれて、ビルドする

<img src="/images/2024/20240521a/image_6.png" alt="image.png" width="1200" height="454" loading="lazy">

### ５（開発PC）エミュレータを起動

<img src="/images/2024/20240521a/image_7.png" alt="image.png" width="794" height="1594" loading="lazy">

- 起動後に「Register App」を押すと、DJI SDK利用が可能になる

### ６（BridgeApp用携帯）携帯にBridgeAppをインストール

- iOSはApp Storeからダウンロードする
- Andriodは[dji-sdk/Android-Bridge-App](https://github.com/dji-sdk/Android-Bridge-App/releases/tag/4.14-trial1)からapk経由でインストール

### ７（BridgeApp用携帯）Bridge AppでRCに接続

- 携帯は開発者モードをONにし、USB DebuggingをONにする
- RCの電源をON、Phantom 4の電源をONにする
- Bridge Appを立ち上げて、USBでRCに繋ぐ

<img src="/images/2024/20240521a/image_8.png" alt="image.png" width="880" height="1868" loading="lazy">

- 画面のIPアドレスをメモる(こちらの端末では192.168.1.35)

### ８（開発PC）IPアドレスをエミュレータ画面に入力

- 「WSBridge IP」欄にIPアドレスを入力

(開発PC画面)

<img src="/images/2024/20240521a/image_9.png" alt="image.png" width="772" height="1570" loading="lazy">

(BridgeApp用携帯画面)

<img src="/images/2024/20240521a/image_10.png" alt="image.png" width="888" height="1868" loading="lazy">

### ９（シミュレータ用PC）DJI Assistant 2でPhantom 4に接続

- DJI Assistant 2 for Phantomを立ち上げて、USBでPhantom 4に繋ぐ
- このアプリを使うには、以下の制限と設定が必要です（少し面倒ですね...）
  - ※新し目のMACで使えない
  - ※USBドライブにアクセス制限あるPCはそれを解除する必要

- 検知できると、こんな画面が出てくる

<img src="/images/2024/20240521a/image_11.png" alt="image.png" width="1200" height="748" loading="lazy">

<img src="/images/2024/20240521a/image_12.png" alt="image.png" width="1200" height="753" loading="lazy">

- 「Simulator」＞「Start Simulating」を押すと、Simulatorが立ち上がる
※ファイアウォールを無効化にする必要！ そうしないとRCからの信号が到達できない

<img src="/images/2024/20240521a/image_13.png" alt="image.png" width="1200" height="750" loading="lazy">

### １０．🍷🍷🍷操作できました🍷🍷🍷

## 結論

シミュレーターを動かすことができました。ドローンにUSBで繋ぐところはなぜファイアウォールを無効化する必要があるのか理解できていないため、今後の調査課題とします。

シミュレータで学んだ後は、ドローン本体を調達して動かしていきましょう！
