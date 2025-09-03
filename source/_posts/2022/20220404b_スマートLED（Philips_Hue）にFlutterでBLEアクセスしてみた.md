---
title: "スマートLED（Philips Hue）にFlutterでBLEアクセスしてみた"
date: 2022/04/04 00:00:01
postid: b
tag:
  - Flutter
  - Bluetooth
category:
  - Mobile
thumbnail: /images/2022/20220404b/thumbnail.png
author: 真野隼記
lede: "PhilipsののLEDをLチカ（LEDをチカチカさせる）する記事です。普通のLEDだと面白くないので、[Philips HueのLED]を購入しました。接続ですが、Bluetooth（BLE: Bluetooth Low Energy）で直接LEDの操作をします。"
---
# はじめに

TIG DXユニット真野です。[電子工作/IoT連載](/articles/20220404a/)は電子工作らしく、LEDをLチカ（LEDをチカチカさせる）する記事です。

普通のLEDだと面白くないので、[Philips HueのLED](https://www.amazon.co.jp/dp/B0848YBKGW/)を購入しました。Philipsと言えば電動歯ブラシなどのイメージが強いかもしれませんが、スマートLED界では非常に有名で、ON/OFFはもちろんのこと、1600万色以上のカラー制御ができるので気分や何かしらの状態に合わせて照明の色を変えるなどのお楽しみができます。パリピになりたいですね。

接続ですが、Bluetooth（BLE: Bluetooth Low Energy）で接続可能。Hueブリッジと呼ばれるIoTゲートウェイ（Webサーバ的なもの）を経由してWeb API連携も可能という、いたせりつくせりです。Hueから各デバイスはZigBeeが用いられているということでいかした感じがします。Hueブリッジを経由する例は、Pythonを始め多くの自動化を試みる日本語記事も多く見かけます。今回は先週までブログ連載を開催していた[Flutter](/articles/20220315a/)を用いて、Hueブリッジを用いずBLEで直接LEDの操作をします。

## FlutterでBLE

FlutterでBLEのライブラリはいくつか存在しますが、[PhilipsHue/flutter_reactive_ble](https://github.com/PhilipsHue/flutter_reactive_ble) を利用します。理由は以下の記事をパット見てメンテナンスがされていそうだからということです。

* https://medium.com/flutter-community/bluetooth-low-energy-in-flutter-an-overview-937d0a68bc41

flutter_reactive_bleはPhilips社が開発元なので、Hue LEDとの接続性もバッチリかと思いましたが、特段それに特化しているわけではなくBLE全般をあつかうライブラリのようです。

## Hue LEDのBLE仕様

Hue LEDのBluetoothの仕様ですが公式は存在しないようです。そのため有志の人が調査した（？）gistや、Python製のライブラリの実装を参考にします。

* https://gist.github.com/shinyquagsire23/f7907fdf6b470200702e75a30135caf3
* https://github.com/npaun/philble

1つ目のgistを見てもBLEをよくしらない人からするとサッパリだと思うので補足します。BLE論理的な構造は以下のように、あるDeviceには複数のServiceが紐づいており、その配下にCharacteristicと呼ばれる構造で管理されています。この構成によってデータのやり取りを行います。ServiceもCharacteristicも特定のためにUUIDを用いています。

<img src="/images/2022/20220404b/ble_strucutre.png" alt="ble_strucutre.png" width="791" height="441" loading="lazy">

さきほどのgistを確認すると、Service `932c32bd-0000-47a2-835a-a8d455b859dd` に、電源ON/OFFをする `932c32bd-0002-47a2-835a-a8d455b859dd` というCharacteristicがあり、そちらに 1/0 のバイナリを送信すると、LEDがついたり消えたりするわけです。何に使うかわからないCharacteristicもいくつかありますが、ライトの操作は大まかこのシートから推測して行うことができます。Python側のライブラリは補足情報としてあつかうと良いかなと思います。

## Flutter実装

さきほど紹介したPhilipsHue/flutter_reactive_bleを用いてBLE通信を行います。`scanForDevices()` が周囲のBLE端末を検出するAPIです。デバイスの特定ですが、device名が `Hue Lamp` だったのでそれで特定しています。複数のLED操作を行う際はそれぞれ別名で管理するなど工夫すると良いでしょう。実際にデバイスに接続するためには`connectToDevice()` を用います。

実際の処理は `QualifiedCharacteristic()` で送信データを作成し、 `writeCharacteristicWithoutResponse()` でBLEに通信しています。途中で出ているUUIDはgistのシートを参考にしました。製品固定です。

```dart
  @override
  void initState() {
    super.initState();

    Future(() async {
      var ble = FlutterReactiveBle();
      var device = await FlutterReactiveBle().scanForDevices(withServices: [], scanMode: ScanMode.lowLatency).firstWhere((device) => device.name == "Hue Lamp");
      _deviceName = device.name;

      ble.connectToDevice(id: device.id, servicesWithCharacteristicsToDiscover: {}, connectionTimeout: const Duration(seconds: 2)).listen((state) async {
        print('State: ${state.toString()}');

        if (state.connectionState == DeviceConnectionState.connected) {
          var services = await ble.discoverServices(device.id);
          var service = services;

          for (int i = 0;; i++) {
            if (_color) {
              const colors = [
                // RGB color
                [1, 1, 1],
                [128, 51, 51],
                [128, 128, 51],
                [51, 128, 51],
                [51, 128, 128],
                [128, 70, 70]
              ];
              final colorControl = QualifiedCharacteristic(
                  serviceId: Uuid.parse("932c32bd-0000-47a2-835a-a8d455b859dd"), characteristicId: Uuid.parse("932c32bd-0005-47a2-835a-a8d455b859dd"), deviceId: device.id);
              await ble.writeCharacteristicWithoutResponse(colorControl, value: [1, ...colors[i % 5]]);
            } else if (_onOff) {
              final lightControl = QualifiedCharacteristic(
                  serviceId: Uuid.parse("932c32bd-0000-47a2-835a-a8d455b859dd"), characteristicId: Uuid.parse("932c32bd-0002-47a2-835a-a8d455b859dd"), deviceId: device.id);
              await ble.writeCharacteristicWithoutResponse(lightControl, value: [i % 2]);
            } else if (_temperature) {
              // Index ranges from 153 (bluest) to 454 (bluest), or 500 on some models
              final temperatureControl = QualifiedCharacteristic(
                  serviceId: Uuid.parse("932c32bd-0000-47a2-835a-a8d455b859dd"), characteristicId: Uuid.parse("932c32bd-0004-47a2-835a-a8d455b859dd"), deviceId: device.id);
              await ble.writeCharacteristicWithoutResponse(temperatureControl, value: [50, i % 255]); // sample value
            } else if (_brightness) {
              final brightnessControl = QualifiedCharacteristic(
                  serviceId: Uuid.parse("932c32bd-0000-47a2-835a-a8d455b859dd"), characteristicId: Uuid.parse("932c32bd-0003-47a2-835a-a8d455b859dd"), deviceId: device.id);
              await ble.writeCharacteristicWithoutResponse(brightnessControl, value: [i % 2 == 0 ? 1 : 254]); // 1~254
            }

            await Future.delayed(const Duration(seconds: 2));
          }
        }
      }, onError: (dynamic error) {
        print(error.toString());
      });
    });
  }
```

全文は次に載せています。

https://github.com/ma91n/flutter-hue-led-sample

## 動かしてみた

さきほどのFlutterで作成したアプリから、LEDを操作してみます。

### ON/OFF

Lチカです。照明のON/OFFでカメラのフォーカスが変わってしまっていますが、ついたり消えたりしているのがわかります。手ブレですが、撮影中に飼い猫がじゃれついてきているためにいつもより多めに発生しています。

<video src="/images/2022/20220404b/Lチカ.mp4" controls width="50%"></video>

### 色変更

適当にRGBで指定した色に変更するようにしてています。

<video src="/images/2022/20220404b/色変更.mp4" controls width="50%"></video>

## まとめ

BLEで操作する概念のとっかりが難しかったですが、Lチカが無事できて良かったです。BLEがたまにdisconnectになるなど、実用性はまだまだであるため、精度を上げるためには実験を繰り返しながらのトライが必要そうです。
