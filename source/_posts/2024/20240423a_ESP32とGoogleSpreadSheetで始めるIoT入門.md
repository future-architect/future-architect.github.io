---
title: "ESP32とGoogleSpreadSheetで始めるIoT入門"
date: 2024/04/23 00:00:00
postid: a
tag:
  - ESP32
  - スプレッドシート
  - GAS
category:
  - IoT
thumbnail: /images/2024/20240423a/thumbnail.png
author: 高世駿
lede: "IoTという言葉が話題になり始めてから、かなりの時間が経ちました。私自身も身近なIoTに関心を持っていろいろ取り組んできましたが、ソフトウェアだけでなくハードウェアの知識も必要になるなど、初めて挑戦する方にとっては敷居が高いと感じることがしばしばありました。"
---
# はじめに

こんにちは！ 流通・製造サービス事業部所属の高世です。

こちらは[春の入門連載2024](/articles/20240408a/)の10記事目です。

IoTという言葉が話題になり始めてから、かなりの時間が経ちました。私自身も身近なIoTに関心を持っていろいろ取り組んできましたが、ソフトウェアだけでなくハードウェアの知識も必要になるなど、初めて挑戦する方にとっては敷居が高いと感じることがしばしばありました。
特にインターネットに接続するあたりのインフラ周辺は、選択肢が多様で、その分複雑であったり費用がかかったりする場合もあります。

この記事では、そうしたIoTの問題点をGoogleSpreadSheetを利用することで、手軽に実装できた経験を共有したいと思います。

# 今回やること

<img src="/images/2024/20240423a/image.png" alt="" width="1200" height="607" loading="lazy">

今回はESP32というマイコンを利用して温度センサから定期的に温度を計測し、その情報をGoogleSpreadSheet上に保持するシステムを構築します。

温度センサにはDS18B20という安価で入手性の良いセンサを使用し、冷蔵庫内と冷蔵庫の外（室内）の2つのセンサを設置します。

## ESP32とは

<img src="/images/2024/20240423a/115673.jpg" alt="" width="640" height="480" loading="lazy">

https://akizukidenshi.com/catalog/g/g115673/

今回使用するESP32は、いわゆるマイコン（マイクロコントローラー）と呼ばれるもので、PCほど高尚な処理はできませんが、プログラムを書き込むことで決められたInputから何かしらのOutputを出すことができます。

その中でもESP32はWi-FiやBluetoothなどの無線通信機能を搭載し、IoTデバイスの開発などによく用いられます。

またArduino IDEと互換性があるのも強みです。Arduino IDEで利用できる様々なライブラリを用いることでセンサーやデバイスとの接続を容易にします。

## DS18B20とは

<img src="/images/2024/20240423a/image_2.png" alt="" width="438" height="371" loading="lazy">

今回使用する温度センサです。
Amazonにて5本で1000円というかなり安価に手に入りますし、1-wireインタフェースといって1本の信号線でデータのやりとりができたり、複数のDS18B20を1本の信号線で接続して制御できたりなど使い勝手がかなり良かったです。

## 前提

今回のシステムを構築するにあたっての前提条件としてはArduino IDEでESP32を用いたDS18B20の開発環境が整えられていることです。

検索すると多くの記事がでてきますが、私は以下の記事を参考にしました。

- [ESP32開発ボード Arduino IDE開発環境の構築](https://interface.cqpub.co.jp/esp32-arduino-ide-2/)
- [温度センサー DS18B20をESP32で動かすメモ](https://qiita.com/takudooon/items/f6386a45860004aa37e7)

# 温度センサ(DS18B20)で温度を測ってみる

温度センサ(DS18B20)を使って温度を測ってみます。

DS18B20から3本の線が出ており、電源線(赤)・信号線(黄)・GND線(黒)となっております。

ブレッドボートに挿せるようにピンヘッダをハンダ付けしてあげて、ESP32と接続します。

余談ですがハンダ付けしたあとの保護のためにホットボンドを利用しています（左下画像）。

<img src="/images/2024/20240423a/image_3.png" alt="" width="704" height="316" loading="lazy">

シンプルな1センサに対しての温度計測と表示を行ってみます。

```c++ 温度計測テストプログラム
#include <OneWire.h>
#include <DallasTemperature.h>

// 1-Wire設定
#define ONE_WIRE_BUS 4

// 1-Wire接続インスタンスの作成
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void setup(void)
{
  // シリアル通信の設定
  Serial.begin(115200);
  
  // 1-Wire接続スタート
  pinMode(ONE_WIRE_BUS, INPUT_PULLUP);
  sensors.begin();
}

void loop(void)
{ 
  delay(500);
  Serial.print("温度測定中...");
  
  // デバイスに対して温度計測をリクエスト
  sensors.requestTemperatures();
  
  // 計測結果をプリント
  Serial.println(sensors.getTempCByIndex(0));
}
```

ソースは[こちらのサンプルコード](https://github.com/milesburton/Arduino-Temperature-Control-Library/blob/master/examples/Simple/Simple.ino)を参考にしました。
ちょっと変更を入れている点としては、`pinMode(ONE_WIRE_BUS, INPUT_PULLUP)`によって1-Wireの信号線に対して、ESP32の内蔵プルアップを設定しています。

実際に書き込みを行い、Arduino IDEのシリアルモニタで見てみます。

<img src="/images/2024/20240423a/sokutei2.gif" alt="sokutei2.gif" width="645" height="321" loading="lazy">

温度の変化がわかるようにセンサ部を指で温めています。
最初`26.44度`からスタートし、指で触り始めると温度が上がっていくことを確認しました。

# GoogleSpreadSheetでWebアプリをデプロイする

GoogleSpreadSheetでPOSTリクエストを受け付けるWebアプリを作っていきます。

まずスプシを作成し、拡張機能>Apps ScriptからGASを作成します。

<img src="/images/2024/20240423a/image_4.png" alt="" width="783" height="249" loading="lazy">

今回はESP32から計測した温度データをJSONに詰めて、POSTリクエストを飛ばします。

送信するJSONをあらかじめ以下のように定義しておきます。

今回は2つのセンサからの温度情報を送るため、温度が問題なく取得できたことを確認する属性`success`と温度情報`temp`を持つオブジェクトをリストで持つように設計しました。

```json ESP32から送信するJSONデータ
{
	"data": [
		{
			"success": true,
			"temp": 1.23
		},
		{
			"success": true,
			"temp": 2.34
		}
	]
}
```

上記のJSONを受け取ってスプシにデータを挿入するスクリプトを書きます。

空行を挿入して、そこに受信した温度データを書き込む仕様としました。

```javascript
function doPost(e) {
  const params = JSON.parse(e.postData.getDataAsString()); 

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1).setValue((new Date).toLocaleString('ja-JP'));
  sheet.getRange(2, 2).setValue(params.data[0].success ? params.data[0].temp : "err");
  sheet.getRange(2, 3).setValue(params.data[1].success ? params.data[1].temp : "err");

  return ContentService.createTextOutput("OK");
}
```

それではこちらのPOSTリクエストを受け付けるWebアプリをデプロイします。

デプロイ方法は簡単で以下手順でボタン押下するだけでURLが発行されます。

<img src="/images/2024/20240423a/image_5.png" alt="" width="1110" height="443" loading="lazy">

<img src="/images/2024/20240423a/image_6.png" alt="" width="1200" height="631" loading="lazy">

<img src="/images/2024/20240423a/image_7.png" alt="" width="1200" height="631" loading="lazy">

このURLにPOSTリクエストを投げれば、先程のスクリプトが実行されます。
注意点としては、このURLはデプロイするたびに変わるということと、認証などの仕組みはないため、URLが漏洩すると誰でもアクセスできるので取り扱いには注意してください。

# ESP32からデータをアップロードする

プログラムを作る前に温度センサを冷蔵庫に設置します。

冷蔵庫内部にセンサをマスキングテープで付けて、ケーブルを冷蔵庫の外に出してESP32と接続しました。

<img src="/images/2024/20240423a/image_8.png" alt="" width="507" height="377" loading="lazy">

それではESP32から先程デプロイしたWebアプリに対してPOSTリクエストを送信するプログラムを作成していきます。
ちょっと長くなってしまいましたが、やってることとしてはWi-Fiの接続設定と1分間隔で温度計測とAPIリクエストの実行となっています。

```c++
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>

// 1-Wire設定
#define ONE_WIRE_BUS 4
#define TEMPERATURE_PRECISION 12

// 1-Wire接続インスタンスの作成
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// 接続するデバイスのアドレスを指定（以下サンプルソースを利用して取得）
// https://github.com/milesburton/Arduino-Temperature-Control-Library/blob/master/examples/oneWireSearch/oneWireSearch.ino
DeviceAddress refrigeratorDevice = { 0x28, 0xC3, 0x9F, 0x46, 0xD4, 0x09, 0x76, 0xF9 };
DeviceAddress outsideDevice = { 0x28, 0x75, 0x4B, 0x46, 0xD4, 0x4B, 0x21, 0x5F };

// Wi-Fi接続設定
char ssid[] = "xxx";
char password[] = "yyy";

// リクエストURL設定
char requestURL[] = "GASでデプロイしたWEBアプリのURL";

unsigned long timer;

void setup() {
  // シリアル通信設定
  Serial.begin(115200);

  // WiFi接続スタート.
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  WiFi.setAutoConnect(true);
  WiFi.setAutoReconnect(true);
  // WiFi接続完了まで待機.
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  // WiFi接続完了.
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  // 1-Wire接続スタート
  pinMode(ONE_WIRE_BUS, INPUT_PULLUP);
  sensors.begin();
  sensors.setResolution(refrigeratorDevice, TEMPERATURE_PRECISION);
  sensors.setResolution(outsideDevice, TEMPERATURE_PRECISION);

  // タイマ初期化
  timer = 0;
}

void loop() {
  // 1分間隔で実行
  if (timer < millis()) {
    timer = millis() + 60 * 1000;
    measureAndRequestSend();
  }
}

void measureAndRequestSend() {
  // デバイスに対して温度計測をリクエスト
  Serial.print("温度測定中...");
  sensors.requestTemperatures();

  float refrigeratorTemp = sensors.getTempC(refrigeratorDevice);
  float outsideTemp = sensors.getTempC(outsideDevice);

  // 計測結果をプリント
  Serial.print(refrigeratorTemp);
  Serial.print(", ");
  Serial.println(outsideTemp);

  // 送信するJSON文字列生成
  String requestStr = String("{\"data\":[") +
                      "{\"success\":" + String(refrigeratorTemp != DEVICE_DISCONNECTED_C) + ",\"temp\":" + String(refrigeratorTemp, 2) + "}," +
                      "{\"success\":" + String(outsideTemp != DEVICE_DISCONNECTED_C) + ",\"temp\":" + String(outsideTemp, 2) + "}]}";

  // データ送信
  apiRequest(requestStr);
}

void apiRequest(String body) {
  // 指定されたデータを送信する
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    http.begin(requestURL);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(body);
    if (httpResponseCode < 0) {
      Serial.print("通信に失敗しました。");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Wi-Fi接続に失敗しました。");
  }
}
```

こちらのプログラムをESP32に書き込み、実行してみます。

するとスプシ側に送信したデータが書き込まれていることを確認できました。

<img src="/images/2024/20240423a/image_9.png" alt="" width="405" height="348" loading="lazy">

試しに1日動かして結果をプロットしてみました。
室内温度は昼間になるにつれて温度が高くなっていき、15時過ぎごろにピークを迎えます。
冷蔵庫温度は細かな上がり下がりが確認できますが、1日中一定を保っています。おそらく基準の温度があってそこを超えたら冷却をON、下回ったらOFFにするような制御が入っているのではと予想できます。

<img src="/images/2024/20240423a/image_10.png" alt="" width="590" height="363" loading="lazy">

# まとめ

IoTで取得したデータをクラウド上にストアすることを考えると、AWSだったりのクラウドサービスを使ったりやHerokuなどのPaaSを利用する方法が考えられますが、インフラの構築コストだったり、利用料金がかかってしまいます。

ですが今回紹介したGoogleSpreadSheetとGASを利用する方法では、無料ですし、たった数行のコードを書くだけでWebアプリをデプロイできるのが強みだと思います。

またGASのトリガーを使えば定期的にスクリプトを実行できるので、例えば温度が規定値を上回った場合にメール通知を送ることなども実装できるので、応用すれば色々できそうです。

# 参考URL

- [ESP32開発ボード Arduino IDE開発環境の構築](https://interface.cqpub.co.jp/esp32-arduino-ide-2/)
- [温度センサー DS18B20をESP32で動かすメモ](https://qiita.com/takudooon/items/f6386a45860004aa37e7)
- [DS18B20 Programmable Resolution 1-Wire Digital Thermometer](https://www.ne.jp/asahi/shared/o-family/ElecRoom/AVRMCOM/DS18B20/DS18B20manual.html)
- [外部からJSONをPOSTするだけでGoogleSpreadSheetにデータを書き込む](https://rooter.jp/programming/edit-spreadsheet-with-gas/)
