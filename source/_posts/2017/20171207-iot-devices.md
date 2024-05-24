---
title: "Future IoT デバイス"
date: 2017/12/07 13:00:00
postid: ""
tag:
  - IoT
  - FutureIoT
category:
  - IoT
thumbnail: /images/20171207/thumbnail_20171207.png
author: 山本力世
lede: "今年、社内のR&Dチームにて開発し利用を開始した汎用IoTデバイスについて紹介したいと思います。"
---

[フューチャーアーキテクト Advent Calendar 2017](https://qiita.com/advent-calendar/2017/future)の7日目です。

---

# はじめに

2017年、社内のR&Dチームにて開発した汎用IoTデバイスについて紹介したいと思います。
デバイスの各辺の長さは約4.5cmの立方体で、異なる拡張モジュールを最大8つ内蔵、もしくはGroveコネクタ準拠のセンサーなどを外付けできる形になっています。

こんな感じのサイコロ型のデバイスです。
<img src="/images/20171207/photo_20171207_02.jpeg" loading="lazy">


アップすると FutureIoT のロゴが印字されています。
<img src="/images/20171207/asset_20171207_01.png" loading="lazy">

ちなみに、なんで鶴なんだ？とよく聞かれるのでこの場をお借りして回答しておきます。

**FutureIoTのロゴの由来**

* 点はデバイスやセンサーで、線がネットワークで、様々なコネクティッドを表しています
* 鶴を形どっていて縁起がよく「仲良きことの象徴」の鳥です
* 鳴き声が共鳴して遠方まで届くことから「天に届く＝天上界に通ずる鳥」といわれるなどのシンボルなので、遠隔のフィールドの情報がネットワークの先（クラウド）まで届くこと祈願してます

ロゴデザインは[99design](https://99designs.jp)さん経由にて作成を依頼しました。


# 作成の目的

このデバイスは、IoT関連ソリューションのワークショップ、[PoC](https://ja.wikipedia.org/wiki/%E6%A6%82%E5%BF%B5%E5%AE%9F%E8%A8%BC)、プロトタイピング、パイロット導入などの用途をカバーすることを目指して開発したものとなります。
直近では、お客様向けのIoT関連研修での教材として10数台程利用しました。


# 力を入れた点

とにかく簡易に素早く使えることをコンセプトに、下記の特徴をもたせました。

* 多くの拡張用コネクタ(Groveコネクタx8)をコンパクトな筐体(4.5cm)に格納
* ユーザを選ばない幅広いプログラミング環境
* フルワイヤレス
* 追加モジュールによる柔軟な拡張性


# スペック
スペックは次の通りです。（随時ブラッシュアップしているので変更される/している可能性があります）

## ハードウェア

<img src="/images/20171207/photo_20171207_03.jpeg" loading="lazy">

### [MPU](https://ja.wikipedia.org/wiki/%E3%83%9E%E3%82%A4%E3%82%AF%E3%83%AD%E3%83%97%E3%83%AD%E3%82%BB%E3%83%83%E3%82%B5)
MPUとしては、Wi-Fi、BLEも内蔵した比較的安価なESP32を採用しました。
* [ESP32](https://ja.wikipedia.org/wiki/ESP32)

### 通信
基本的に無線での運用となります。Wi-Fi APやLoRaWAN GW などを経由してクラウドに接続します。
* 有線
    * シリアル通信(USB)
* 無線
    * [Wi-Fi](https://ja.wikipedia.org/wiki/Wi-Fi)
    * [BLE](https://ja.wikipedia.org/wiki/Bluetooth_Low_Energy)
    * [LTE](https://ja.wikipedia.org/wiki/Long_Term_Evolution)(オプション)
    * [LoRaWAN](https://ja.wikipedia.org/wiki/LPWA_(%E7%84%A1%E7%B7%9A)#LoRa)(オプション)

### コネクタ
コネクタとしては、PCなどの通信や充電のためのmicroUSBと、センサーなどの外部モジュールや内蔵モジュールのためのGroveコネクタがあります。

* microUSB コネクタ x1
    * 充電
    * シリアル通信
* Grove コネクタ x8
    * デジタル入力
    * アナログ入力
    * UART
    * I2C

### ストレージ

基本的に内蔵Flashにプログラムを書き込みますが、大きめのデータを利用したい場合はスロットにmicroSDを差して使用する形になります。

* 内蔵Flash
* microSDスロット(対応予定)

### 電源

充電池を内蔵しているためワイヤレスな利用が可能です。特に低消費電力を考えたプログラミングを行わなくても満充電後数時間は利用できます。プログラム次第になりますがより長時間の運用も可能です。電源を外部から取ることも可能です。

* 内蔵：Li-Poバッテリ
* 外付：microUSBケーブルでACアダプタ、PC、モバイルバッテリと接続


## ソフトウェア

### OS
現在はその完成度の面から下記のOSを利用しています。
* [Mongoose OS](https://mongoose-os.com/)

### プログラミング言語
非エンジニアまでターゲット層を広げているため、複数のプログラミング環境をWeb上に用意しています。

* プログラミング初学者向け
    * [Blockly](https://developers.google.com/blockly/)
* Web開発者向け
    * JavaScript
* 組込開発者向け
    * C++
    * C

<img width="400" alt="Blocklyの編集画面" src="/images/20171207/asset_20171207_04.jpeg">

<img width="400" alt="JavaScriptの編集画面" src="/images/20171207/asset_20171207_05.png">


## クラウド
弊社のIoTプラットフォームである Future IoT との連携や、AWS、GCP、Azuleなどの主要なクラウドとの連携を行うことができます。

## 対応プロトコル

* [MQTT](https://ja.wikipedia.org/wiki/MQ_Telemetry_Transport)
* [WebSocket](https://ja.wikipedia.org/wiki/WebSocket)
* HTTP


# 今後の展開

今後、次のような点を進めていく予定です。
ぜひ、興味がある方は連絡下さい！

* 追加モジュールの拡充
* プログラミング環境のブラッシュアップ

