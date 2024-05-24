---
title: "GoでMQTT!!　～温湿度マイスターbotの作成～(前編)"
date: 2021/09/29 00:00:00
postid: a
tag:
  - AWSIoT
  - RaspberryPi
  - IoT
  - Python
  - MQTT
  - BOT
  - ハンズオン
category:
  - IoT
thumbnail: /images/20210929a/thumbnail.png
author: 宮永崇史
lede: "今回はAWSサービスのうちの一つAWS IoTを使用してRaspberryPiとのMQTTによる通信を行います。最終的には室内の快適な温湿度を教えてくれる「温湿度マイスターbot」を作成します。"
---
<img src="/images/20210929a/サムネイル1.png" alt="Louis Reed on unsplash.com Unsplash" title="" width="1200" height="676" loading="lazy">

# はじめに
こんにちは。TIG/DXユニット所属の宮永です。

今回はAWSサービスのうちの一つAWS IoTを使用してRaspberryPiとのMQTTによる通信を行います。

AWS IoTを使用したMQTTのチュートリアルはAWS公式からも詳細なハンズオン記事が出ています。

* *[AWS IoT Core の設定 :: AWS IoT Core 初級 ハンズオン](https://aws-iot-core-for-beginners.workshop.aws/phase3/step1.html)*

本記事はこちらのハンズオンを基にGo言語を使用してMQTTによる通信を行いました。(公式の記事はPythonで実装されています。)

最終的には室内の快適な温湿度を教えてくれる「温湿度マイスターbot」を作成します。
<img src="/images/20210929a/image.png" alt="image.png" width="647" height="457" loading="lazy">

なお、本記事で作成したコードは

* *[orangekame3/go\-mqtt](https://github.com/orangekame3/go-mqtt)*
* *[orangekame3/th\-meisterBot](https://github.com/orangekame3/th-meisterBot)*

にて公開しています。


# MQTTとは
MQTTはメッセージングプロトコルです。
以下 [mqtt.org](https://mqtt.org/)より引用です。

>*MQTTは、モノのインターネット（IoT）用のOASIS標準メッセージングプロトコルです。これは、非常に軽量なパブリッシュ/サブスクライブメッセージングトランスポートとして設計されており、コードフットプリントが小さくネットワーク帯域幅が最小のリモートデバイスを接続するのに理想的です。今日のMQTTは、自動車、製造、電気通信、石油およびガスなど、さまざまな業界で使用されています。
[MQTT \- The Standard for IoT Messaging](https://mqtt.org/)*

MQTTはHTTPリクエストのようなリクエスト/レスポンスといったプロトコルとは異なり、イベント駆動型のパブリッシュ/サブスクライブプロトコルです。

下図にパブリッシュ/サブスクライブの概要を示します。

Publisherはセンシングの情報（温度や湿度、速度など）をBrokerに配信します。SubscriberはBrokerをSubscribeし、一定間隔で情報を受け取ります。このような構成から、PublisherとSubscriberは疎な結合となっています。拡張性が高く、軽量であるという点でIoTデバイスを使用した通信プロトコルとして注目されているとのことです。

<img src="/images/20210929a/image_2.png" alt="image.png" width="1200" height="688" loading="lazy">

# AWS IoTとは
>*AWS IoT は、IoT デバイスを他のデバイスおよび AWS クラウドサービスに接続するクラウドサービスを提供します。AWS IoT は、IoT デバイスを AWS IoT ベースのソリューションに統合するのに役立つデバイスソフトウェアを提供します。デバイスが AWS IoT に接続できる場合、AWS IoT は AWS が提供するクラウドサービスにそれらのデバイスを接続できます。
[AWS IoT とは \- AWS IoT Core](https://docs.aws.amazon.com/ja_jp/iot/latest/developerguide/what-is-aws-iot.html)*


AWSIoTは各種AWSサービスとIoTデバイスとを手軽に連携できるサービスを展開しています。
今回はAWS IoT標準サービスで提供されているMQTTブローカーを利用してMQTT通信にトライします。

# システム構成
今回作成するものは室内の温湿度を定期的にセンシングし、Slackに温湿度のプロット図を定期的に送信する仕組みです。

DHT22という温湿度センサをRaspberryPi3B+に取り付けて2時間ごとに温湿度を取得します。取得した温湿度をMQTTによってAWS IoTにPublishします。AWS IoTはDynamoDBと連携させることで、Subscribeしたデータを蓄積します。

また、RaspberryPiではPythonスクリプトも同時に起動しておきます。PythonではBoto3を使用してDynamoDBに向けて定期的にQueryを行います。受け取った情報からtimestampを横軸、温度湿度を縦軸にとったプロット図を作成します。作成したプロット図は2時間ごとにSlackに投稿するという仕組みにしています。
（※冒頭のプロット図は便宜的に１分毎のデータをプロットしています。）

<img src="/images/20210929a/image_3.png" alt="image.png" width="1200" height="849" loading="lazy">



# 開発環境

## ハードウェア

* Raspberrypi3B+
* DHT22[ (DSD TECH DHT22 温湿度センサーモジュール AM2302チップ付き)](https://aax-fe.amazon-adsystem.com/x/c/Qr8CAcIgUZEla94kNzcQWMkAAAF8AoohIgcAAAIAAZlrWxE/http://www.amazon.co.jp/gp/slredirect/picassoRedirect.html?ie=UTF8&adId=A3TSWYUGZXCE00&qualifier=1632130179&id=8652485946611051&widgetName=sd_onsite_desktop&url=%2Fdp%2FB06ZXXJL2B%2Fref%3Dsyn_sd_onsite_desktop_95%3Fpsc%3D1)
* ジャンパワイヤー

## ソフトウェア

開発はwindows10環境、WSL2上で行いました。標準モジュール以外で使用したものを以下に列挙します。

* go1.16.6 linux/amd64
    * [MichaelS11/go\-dht: Golang DHT22 / AM2302 / DHT11 interface using periph\.io driver](https://github.com/MichaelS11/go-dht)
    * [eclipse/paho\.mqtt\.golang](https://github.com/eclipse/paho.mqtt.golang)
* Python 3.8.10
    * [boto/boto3: AWS SDK for Python](https://github.com/boto/boto3)
    * [Alonreznik/dynamodb\-json: DynamoDB json util to load and dump strings of Dynamodb json format to python object and vise\-versa](https://github.com/Alonreznik/dynamodb-json)
    * [slackapi/python\-slack\-sdk: Slack Developer Kit for Python](https://github.com/slackapi/python-slack-sdk)
    * [stub42/pytz: pytz Python historical timezone library and database](https://github.com/stub42/pytz)
    * [dbader/schedule: Python job scheduling for humans\.](https://github.com/dbader/schedule)
* AWS IoT
* DynamoDB
* Slack

>*こちらは余談ですが、VSCodeを使ってRaspberryPi上のソースコードを編集する際はVSCodeのSSH機能が非常に便利です。*
*以下の記事に詳しく記載されているのでぜひ利用してみてください。*
*[VSCodeのSSH接続機能で、RaspberryPi内のコードを編集してデバッグ \- Qiita](https://qiita.com/c60evaporator/items/26ab9cfb9cd36facc8fd)*

# 実装
実装は以下の手順で進めます。

1. DHT22から温湿度情報を取得する
2. AWS IoTを使用してRaspberryPiからのPublish動作確認
3. DHT22の温湿度情報をAWS IoTへPublish
4. AWS IoTで取得した温湿度情報をDynamoDBに連携
5. Boto3を使用してDynamoDBからデータをQuery、データ整形
6. 取得データをmatplotlibで可視化
7. 作成したプロット図をSlack APIで画像投稿

## 1. DHT22から温湿度情報を取得する。
使用した温湿度センサはこちらです。
[DSD TECH DHT22 温湿度センサーモジュール AM2302チップ付き](https://aax-fe.amazon-adsystem.com/x/c/Qr8CAcIgUZEla94kNzcQWMkAAAF8AoohIgcAAAIAAZlrWxE/http://www.amazon.co.jp/gp/slredirect/picassoRedirect.html?ie=UTF8&adId=A3TSWYUGZXCE00&qualifier=1632130179&id=8652485946611051&widgetName=sd_onsite_desktop&url=%2Fdp%2FB06ZXXJL2B%2Fref%3Dsyn_sd_onsite_desktop_95%3Fpsc%3D1)

<img src="/images/20210929a/DHT22.JPG" alt="DHT22.JPG" width="1200" height="676" loading="lazy">

まずはこちらの温湿度センサをジャンパワイヤーを使用してRaspberryPiに接続します。

接続するピンはVccが物理ピン1、GNDが物理ピン6,DATがGPIO2(物理ピン3)です。

DHT22からGo言語を使用して温湿度情報を取得するためにこちらのモジュールを利用させていただきました。

* [MichaelS11/go\-dht: Golang DHT22 / AM2302 / DHT11 interface using periph\.io driver](https://github.com/MichaelS11/go-dht)

非常にシンプルに記述されており、摂氏と華氏の変換も実装されていたため使いやすかったです。

以下のコマンドでモジュールを取得してください。

```go
go get github.com/MichaelS11/go-dht
```

まずは、温湿度情報を格納する`MyDHT22`構造体を定義します。

```go model.go
package dht22

import (
	"fmt"
	"github.com/MichaelS11/go-dht"
	"time"
)

type MyDHT22 struct {
	Temperature float64
	Humidity    float64
	Timestamp   time.Time
}
```

この構造体に対して温湿度を情報を取得する`Read`メソッドを定義します。

```go model.go
func (d MyDHT22) Read() MyDHT22 {
	err := dht.HostInit()
	if err != nil {
		fmt.Println("HostInit error:", err)
		return d
	}

	dht, err := dht.NewDHT("GPIO2", dht.Celsius, "")
	if err != nil {
		fmt.Println("NewDHT error:", err)
		return d
	}

	humidity, temperature, err := dht.ReadRetry(11)
	if err != nil {
		fmt.Println("Read error:", err)
		return d
	}
	d.Humidity = humidity
	d.Temperature = temperature
	d.Timestamp = time.Now()
	return d
}
```
`dht.NewDHT("GPIO2", dht.Celsius, "")`にてDATの接続先を指定してください。また、`Celsius`(摂氏)と`Fahrenheit(`華氏)が選択できるため、`Celsius`を入力します。
それでは、DHT22よりセンシング情報を正しく取得できているか確かめます。
`sample`フォルダを作成し、以下の様に`model.go`を`dht22`配下に格納します。

```bash
.
├── dht22
│   └── model.go
├── go.mod
├── go.sum
└── main.go
```
`main.go`は以下の様に記述します。

```go main.go
package main

import (
	"fmt"
	"time"

	"github.com/sample/dht22"
)

func main() {
	for {
		var mydht dht22.MyDHT22
		PubMsg := mydht.Read()
		fmt.Println(PubMsg)
		time.Sleep(2 * time.Second)
	}
}
```
`go mod init`、`go mod tidy`を実行した後、上記のようなディレクトリ構成となるはずです。
それでは`go run main.go`で`main.go`を実行します。以下の様にターミナル上に表示されれば成功です。
1列目が温度、2列目が湿度、3列目が取得時刻です。

```bash
{25.3 48.1 2021-09-20 18:59:59.716042512 +0900 JST m=+7.022936648}
{25.3 48.1 2021-09-20 19:00:02.724946254 +0900 JST m=+10.031840338}
{25.4 50.5 2021-09-20 19:00:07.733240959 +0900 JST m=+15.040135043}
{25.3 50.4 2021-09-20 19:00:10.7415645 +0900 JST m=+18.048459365}
{25.3 48.1 2021-09-20 19:00:13.749694254 +0900 JST m=+21.056588391}
...
```

ここで作成した`model.go`は後の工程でも使用するので削除しないようにしてください。

## 2. AWS IoTを使用してPublishの動作確認
AWS IoTとRaspberryPiの連携は、「ポリシーの作成」から始まります。
「ポリシーの作成」から「モノの作成」までの工程はこちらのページに記載されている通りに行ってください。
[AWS IoT Core の設定 :: AWS IoT Core 初級 ハンズオン](https://aws-iot-core-for-beginners.workshop.aws/phase3/step1.html)
手順通り進めると以下の様に5つのファイルが作成されるはずです。こちらは後程使用するため、RaspberryPi上に格納してください。

```bash
.
├── xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-certificate.pem.crt
├── xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-private.pem.key
├── xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-public.pem.key
├── AmazonRootCA1.pem
└── AmazonRootCA3.pem
```


それでは、RaspberryPiからMQTTを使用してメッセージを送信します。

実装はGo言語で行います。実装の際には以下2点の記事を大いに参考にさせていただきました。

* *[golang\+MQTTでAWS IoTにPubslish \- Qiita](https://qiita.com/sat0ken/items/249b1f01da4dd2cc5b4f)*
* *[AWS IoT MQTT の 443 ポートへ Go からアクセスする · Yutaka 🍊 Kato](https://mikan.github.io/2018/10/22/accessing-aws-iot-mqtt-through-port-443-from-go/)*

以下、実装したコードです。

```go main.go
package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"log"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	ThingName  = "xxxxxxxxxxxxxxxxx"
	RootCAFile = "AmazonRootCA1.pem"
	CertFile   = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-certificate.pem.crt"
	KeyFile    = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-private.pem.key"
	PubTopic   = "topic/to/publish"
	endpoint   = "xxxxxxxxxxxxxxxx.iot.ap-northeast-1.amazonaws.com"
	QoS        = 1
)

func main() {

	tlsConfig, err := newTLSConfig()
	if err != nil {
		panic(fmt.Sprintf("failed to construct tls config: %v", err))
	}
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("ssl://%s:%d", endpoint, 443))
	opts.SetTLSConfig(tlsConfig)
	opts.SetClientID(ThingName)
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		panic(fmt.Sprintf("failed to connect broker: %v", token.Error()))
	}
    PubMsg := `{"MQTT":{"message":"Messaging from my RaspberryPi!!"}}`
	log.Printf("publishing %s...\n", PubTopic)
	if token := client.Publish(PubTopic, QoS, false, PubMsg); token.Wait() && token.Error() != nil {
		panic(fmt.Sprintf("failed to publish %s: %v", PubTopic, token.Error()))
	}
	fmt.Println(PubMsg)
	client.Disconnect(250)
}

func newTLSConfig() (*tls.Config, error) {
	rootCA, err := ioutil.ReadFile(RootCAFile)
	if err != nil {
		return nil, err
	}
	certpool := x509.NewCertPool()
	certpool.AppendCertsFromPEM(rootCA)
	cert, err := tls.LoadX509KeyPair(CertFile, KeyFile)
	if err != nil {
		return nil, err
	}
	cert.Leaf, err = x509.ParseCertificate(cert.Certificate[0])
	if err != nil {
		return nil, err
	}
	return &tls.Config{
		RootCAs:            certpool,
		InsecureSkipVerify: true,
		Certificates:       []tls.Certificate{cert},
		NextProtos:         []string{"x-amzn-mqtt-ca"},
	}, nil
}
```

こちらのスクリプトではPubMsgで定義されたJSONを送信しています。

それでは上記スクリプトを実行したときにAWS IoTコンソール上でSubscribeが正しく動作しているか確かめます。

以下、画像上部はVSCode上で`main.go`を実行しています。画像上部はAWS IoTコンソールにてRaspberryPiからのメッセージをSubscribeしています。

`main.go`の実行とともにコンソール上でも配信を受け取っていることが確認できます。

<img src="/images/20210929a/mqttdemo.gif" alt="mqttdemo.gif" width="859" height="601" loading="lazy">

メッセージの送受信が確認できたところで、次に先ほどの実装で取得した温湿度をpayloadとして配信します。

## 3. DHT22の温湿度情報をPublish
**「2. AWS IoTを使用してPublishの動作確認」**にて取得した各種証明書と`main.go`を同階層に格納してください。
同様に**「1. DHT22から温湿度情報を取得する」**にて実装した`model.go`を`dht22`サブディレクトリとして格納してください。
### ディレクトリ構成


```bash
.
├── xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-certificate.pem.crt
├── xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-private.pem.key
├── xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-public.pem.key
├── AmazonRootCA1.pem
├── AmazonRootCA3.pem
├── dht22
│   └── model.go
├── go.mod
├── go.sum
└── main.go
```

**「2. AWS IoTを使用してPublishの動作確認」**の実装よりmain関数部分を少し変更します。
**「1. DHT22から温湿度情報を取得する」**にて実装したMYDHT22構造体を呼び出し、`json.Marshall`でJSONにして`PubMsg`に渡しています。

データの取得と送信は2秒間隔でおこなっています。

```go main.go
...(省略)

func main() {

	tlsConfig, err := newTLSConfig()
	if err != nil {
		panic(fmt.Sprintf("failed to construct tls config: %v", err))
	}
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("ssl://%s:%d", endpoint, 443))
	opts.SetTLSConfig(tlsConfig)
	opts.SetClientID(ThingName)
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		panic(fmt.Sprintf("failed to connect broker: %v", token.Error()))
	}
	for {
		var mydht dht22.MyDHT22
		PubMsg, _ := json.Marshal(mydht.Read())

		log.Printf("publishing %s...\n", PubTopic)
		if token := client.Publish(PubTopic, QoS, false, PubMsg); token.Wait() && token.Error() != nil {
			panic(fmt.Sprintf("failed to publish %s: %v", PubTopic, token.Error()))
		}

		time.Sleep(2 * time.Second)
	}
}

...(省略)

```


下図上部が`main.go`の実行、下部がSubscriptionの様子を示しています。

TimeStampに注目すると、2秒毎に新規データが蓄積されていることがわかります。

<img src="/images/20210929a/mqttdemo2.gif" alt="mqttdemo2.gif" width="859" height="662" loading="lazy">

# 前編まとめ

前編では温湿度センサーDHT22より取得したデータをMQTTでAWS IoTにPublishするところまでを行いました。

[後編](/articles/20210930a/)ではAWS IoTで受け取ったデータをDynamoDBに連携します。

DynamoDBに蓄積されたデータをBoto3によって取得し、Slackbotで配信するところまで行います。
