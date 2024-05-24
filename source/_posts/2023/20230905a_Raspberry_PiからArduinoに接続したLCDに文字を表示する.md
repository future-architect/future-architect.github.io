---
title: "Raspberry PiからArduinoに接続したLCDに文字を表示する"
date: 2023/09/05 00:00:00
postid: a
tag:
  - RaspberryPi
  - Arduino
  - 初心者
  - 電子工作
category:
  - IoT
thumbnail: /images/20230905a/thumbnail.png
author: 水田祐介
lede: "Raspberry Piに立てたWebサーバのブラウザから好きな文字列を入力してArduinoに接続したLCDに表示するまでをやっていきます"
---

## はじめに

初めまして。製造（PLMソリューション）所属/九州在住　の水田です。

夏の自由研究連載2023の第3弾の方を執筆させていただきます。

今回が技術ブログ初投稿になります。不慣れな部分もありますが、なるべく分かりやすく書くように心がけていますので、最後までお付き合いください。

## 研究テーマについて

漠然と

- ArduinoやRaspberry Piを触ってみたい
- ArduinoにWebサーバを構築してみたい

...と思ったので**Raspberry Piに立てたWebサーバのブラウザから好きな文字列を入力してArduinoに接続したLCDに表示する** までをやっていきます。

最終的には、在宅勤務している部屋のドアに設置して、スマホ経由でブラウザにアクセスして会議中であることを表示できればいいなとか考えています。

あと、色々とハマったのでその辺りも書いておこうかと思います。

※長くなるのでRaspberry PiやArduinoの基本的な部分の話は、割愛しています。

## 構成(予定)

最終的に以下の図のような構成を予定しています。

<img src="/images/20230905a/image.png" alt="" width="987" height="197" loading="lazy">

## Arduino→LCDへの表示

まずは、LCDに任意の文字列を表示してみます。

### 使用するArduinoについて

家にあるArduinoを使おうとしたのですが、どのLCDを買えばよいのかがよく分からなかったので、新しくスターターキットを購入しました。値段の割に基本的なセンサー類からLCDやコントローラーまでついている上にサンプルコードまでついていて分かりやすいです。

[ELEGOO Arduino用UNO R3スターターキット レベルアップ チュートリアル付 mega2560 r3 nanoと互換 [並行輸入品] ](https://www.amazon.co.jp/dp/B06XF2HZGT/ref=as_sl_pc_qf_sp_asin_til?tag=amazon0b2-22&linkCode=w00&linkId=e5061d4d72ecf8efbd042e6417de9ad3&creativeASIN=B06XF2HZGT)

以下、実際につないで動かしてみた画像と使用したソースコードです。

<img src="/images/20230905a/lcd.jpg" alt="" width="1200" height="900" loading="lazy">

```cpp Arduino
// LCDを使用するためのライブラリをインクルード
#include <LiquidCrystal.h>

// Arduinoから出力するPin番号とLCDのPin番号との対応を定義
const int rs = 7, en = 8, d4 = 9, d5 = 10, d6 = 11, d7 = 12;

// LCDの初期化（使用するPin番号の指定）
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

void setup() {
  lcd.begin(16, 2);             // 桁数と行数の指定
  lcd.clear();                  // 画面のクリア
  lcd.setCursor(0, 0);          // カーソル位置の指定（1行目の1文字目に設定）
  lcd.print("Hello, World!");   // 文字出力
}

void loop() {
  lcd.setCursor(0, 1);          // カーソル位置の指定（2行目の1文字目に設定）
  lcd.print(millis() / 1000);   // 文字出力
  lcd.print(" [sec]");
}
```

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

以下の理由で少しハマりました。ハードウェアは原因の特定が難しい、、、<br>
- 可変抵抗の初期不良なのかブレッドボードにうまく刺さらない為、LCDのコントラストがうまく調整できず文字が表示できなかった。→可変にする必要もないので固定抵抗で対応<br>
- LCDもブレッドボードにちゃんと刺さらないので、出力されなかったり文字化けが発生したりした

</div>

## Raspberry Pi の準備

Raspberry Piについては、昔購入したModel Bを使用。OSの状態とか覚えていないので、まずは付属のSDカードよりRaspian（wheezy）を再インストール＆以下の作業を実施

- packageの更新
- python3とpipの更新
- pyserial（＝シリアル通信で使用するpythonモジュール）のインストール

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

wheezyはサポートが切れているので、新しいバージョン（BusterとかBullseeye）にしたかったのですがRaspberry Pi Imagerを使用して書き込むとOSが全然立ち上がってくれない為、諦めてwheezyでやっています。

</div>

### packageの更新

apt-getがうまく動かなかったので苦労しました。

色々と調べてみるとapt-getでパッケージを更新する際に使用するミラーサイトのURLが古いのが原因だったみたいです。以下に記載があるURLを最新のURLに書き換えて対応しました。

- /etc/apt/sources.list
- /etc/apt/sources.list.d/collabora.list

### python3とpipの更新

apt-getでインストールしようとするとエラーになるのでこっちも苦労しました。色々と調べた結果、pyenvを使用してインストールするとうまくいきました。

### pyserial（＝シリアル通信で使用するpythonモジュール）のインストール

pipでインストールしたらすぐに終わりました。

## Raspberry Pi →Arduinoへシリアル通信

Raspberry PiとArduinoの準備が大体整ったので試しにシリアル通信を行ってみます。
以下のような文字列送信用のPythonを用意します。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

ser.open()時にPermissionエラーが出た場合は、portに指定しているポートに対して権限を付与すれば大丈夫です。
例）sudo chmod 666 /dev/ttyACM0

</div>

```python Raspberry Pi（送信側）
import serial

ser = serial.Serial()
ser.port = '/dev/ttyACM0'
ser.baundrate = 9600
ser.open()

data = 'NOW MEETING...  16:30 - 17:30'
ser.write(data.encode())
ser.close()
```

Arduino側は、上記コードを以下のように書き換えます。なお、送られてくる文字列は1文字目～16文字目までを1行目に、17文字目～32文字目までを2行目に出す想定にしています

```cpp Arduino（受信側）
// LCDを使用するためのライブラリをインクルード
#include <LiquidCrystal.h>

// Arduinoから出力するPin番号とLCDのPin番号との対応を定義
const int rs = 7, en = 8, d4 = 9, d5 = 10, d6 = 11, d7 = 12;

// LCDの初期化（使用するPin番号の指定）
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

void setup() {
  lcd.begin(16, 2);             // 桁数と行数の指定
  lcd.clear();                  // 画面のクリア
  lcd.setCursor(0, 0);          // カーソル位置の指定（1行目の1文字目に設定）
  lcd.print("INPUT...OK");      // 文字出力
  Serial.begin(9600);           // ボーレートの設定
}

void loop() {
  if (Serial.available())                         // シリアル通信が有効かどうかの確認
  {
    String input = Serial.readString();           // 文字列取得
    lcd.clear();                                  // 画面のクリア
    lcd.setCursor(0, 0);                          // カーソル位置の指定（1行目の1文字目に設定）
    lcd.print(input);                             // 文字出力

    String input2 = String(input.substring(16));  // 文字列の後半部分を抜き出し
    lcd.setCursor(0, 1);                          // カーソル位置の指定（2行目の1文字目に設定）
    lcd.print(input2);                            // 文字出力
  }
}
```

以下、結果です。
<img src="/images/20230905a/2.jpg" alt="" width="1200" height="1600" loading="lazy">

### うまくいっているように見えますが

実は、うまくいっていないんです。。。笑

具体的に書くと

- 上記Pythonファイルを叩いても、LCDが点滅するだけ
- Pythonファイルの内容をPython3のコマンドラインに張り付けて実行
  →LCDに表示される（上記は、この時の写真となります）

調べてみると、Arduino Unoには「USB経由でシリアル通信した場合にDTR端子の状態がLOWであればリセットがかかる」仕様があるらしくこれが原因でLCDがリセットされているようです。DTR端子をHIGHにすればよいのでは？とは思うので設定してみてはいるのですがなぜかうまくいかない。

### 仮説

open()後にsleepを入れるとうまくいくのでは？という仮説が出てきました。
ファイル実行では、open→writeまでの処理に間が無いので、open処理完了→DTRリセット処理　のリセット中に書き込みを行っていてうまくいっていないような気がしてきました。

コマンドライン実行では、ser.open()→数秒後にser.writeを実行という流れなので、数秒の間にリセット処理が完了→LCDへの書き込みがうまくいくという流れのような気がしています。

コマンドライン実行時のopen処理直後のLCDを見ていると、open直後のタイミングでLCDにリセットがかかっているように見えます。試す価値がありそうです。

（open＝シリアル通信開始なので当たり前と言ったら当たり前ですが、、、）

以下のようにsleepを2秒入れて実行してみました。

```python Raspberry Pi（送信側）
import serial
import time

ser = serial.Serial()
ser.port = '/dev/ttyACM0'
ser.baundrate = 9600
ser.open()
time.sleep(2)

data = 'NOW MEETING...  16:30 - 17:30'
ser.write(data.encode())
ser.close()
```

結果としてはうまくいきました。仮説が当たっていたみたいです。

個人的には、以下の理由で上記方法は気に入らないのですがひとまず、これで進めます。

- 本来であればDTR端子を何とかする（＝設定やらなんやらで何とかする）のが筋
- sleepで解決するのが力技っぽくて、あまり好みではない

### よくよく考えると、、、

sleepを入れない方向でもいいのでは？と考えています。

まず、Webサーバの方に必要なモジュールをブラウザに表示する内容から考えると以下のようになると考えています。

**ブラウザ表示（仮）**
<img src="/images/20230905a/image_2.png" alt="" width="597" height="301" loading="lazy">

- シリアル通信開始（接続ボタン押下）
- シリアル通信終了（切断ボタン押下）
- 文字列送信（送信ボタン押下）

上記のようなUIで考えると、シリアル通信開始～送信ボタン押下までには、タイムラグがあると思います。

仮に接続ボタンを無くしたようなUIであっても、文字列送信部分に入力するのに数秒はかかるはずなので、sleepは無くて良いと想像しています。
<span style="font-size: 70%;">（接続ボタン押下からコンマ数秒で入力する超人または、RTA挑戦者は考えていないです）</span>

そのため、この後の方向としては、以下のようになると考えています。

- 文字列送信については、sleepを入れない形でひとまず実装を進める
- 上記実装で問題が発生した場合、改めてsleepを入れることを検討する

## おわりに

### Webサーバは？

という声が聞こえてきそうですが、これ以上自由研究に作業時間が取れそうにないので今回はここまでとさせていただきます。今後執筆する機会があれば、続きを書きます。

メモ：残作業

- Webサーバ構築（Apache?nginx?マシンスペックが弱いので軽いのがいい）
- マイコンへの書き込み及び、基盤へのはんだ付け作業
- マイコンとRaspberry Piを設置するようの箱を用意（木？近所に3Dプリンターが使える店があるのでプラスチック？)
- ドアへの設置

### あとがき

初めてArduinoやRaspberry Piに触ってみましたが色々とトラブルが続いて思うように進まなかったです。ハードウェア周りは、未経験だったので、良い経験にはなったかなと考えています。

あと、今回のような誰かに見せるようなものを書いたりすると、アウトプットの仕方を考えたりする練習にもなると思うので、書いたことが無くて二の足を踏んでいるような方がいれば、挑戦してみると良い経験になるかと思います。

では、また執筆する機会があればお会いしましょう
