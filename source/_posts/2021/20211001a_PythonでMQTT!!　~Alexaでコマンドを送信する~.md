---
title: "PythonでMQTT!! ～Alexaでコマンドを送信する～"
date: 2021/10/01 00:00:00
postid: a
tag:
  - MQTT
  - Alexa
  - RaspberryPi
  - Python
  - IoT
category:
  - IoT
thumbnail: /images/20211001a/thumbnail.jpg
author: 宮永崇史
lede: "この記事は温度と湿度、不快指数を定期投稿するbotの作成を目指してハンズオンを進める構成となっています。"
---

<img src="/images/20211001a/volodymyr-hryshchenko-V5vqWC9gyEU-unsplash.jpg" alt="" title="Volodymyr Hryshchenko on Unsplash" width="1200" height="800" loading="lazy">

# はじめに
こんにちは。TIG/DXユニット所属の宮永です。

本記事は[Python連載](/articles/20210927b/)第3回目の投稿です。よろしくお願いします。

* [Python連載始まります＆Python翻訳プロジェクト \| フューチャー技術ブログ](/articles/20210927b/)

突然ですが、私は以前以下2つの記事をこの技術ブログに投稿しました。

* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(前編\) \| フューチャー技術ブログ](/articles/20210929a/)
* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(後編\) \| フューチャー技術ブログ](/articles/20210930a/)

上記の記事ではAWS IoTと温湿度センサーを使用して「温湿度マイスターbot」を作成する内容を紹介しています。

記事では温度と湿度、不快指数を定期投稿するbotの作成を目指してハンズオンを進める構成となっています。
<img src="/images/20211001a/image.png" alt="BOT投稿画面" width="647" height="457" loading="lazy">

MQTTを使用して、室内温度を定点観測するだけならば以上の記事で十分ですが、ここまで作成してふと思いました。

**「室内温度を知りたいのに2時間も待てない。。。」**

上記の記事では、定期的にworkerを実行する構成としたため、能動的に温度や湿度を知ることができないのです。

ということで、本記事ではAlexaとMQTT、そしてPythonを使って以上の悩みを解決する記事を書きました。前記事に続いてハンズオン形式で記載したので手元にRaspberrypiを添えながら読み進めてほしいです。

また、本章で使用するスクリプトは以下で公開しています。参考にしてください。

* [orangekame3/lambda\-alexa](https://github.com/orangekame3/lambda-alexa)
* [orangekame3/py\-subscriber](https://github.com/orangekame3/py-subscriber)


# 本記事で作成するもの

本記事と以下2つの記事

* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(前編\) \| フューチャー技術ブログ](/articles/20210929a/)
* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(後編\) \| フューチャー技術ブログ](/articles/20210930a/)

に取り組むことで以下の動画のようにリアルタイムで室内の不快指数を知ることができるようになります。

<iframe width="560" height="315" src="https://www.youtube.com/embed/YfbDl6xolV8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

# システム構成

* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(前編\) \| フューチャー技術ブログ](/articles/20210929a/)

で作成したシステム構成に修正を加えます。

RaspberrypiでAWS IoTをSubscribeしておきます。(PublishとSubscribeについては[前回記事](/articles/20210929a/)に記載しているのでご参照ください)

AWS IoTからMQTTでコマンドを送信し、Subscriberではコマンド受信をトリガーとしてローカルのワーカーを起動するという構成になっています。AWS IoTのPublishのタイミングはAlexa Home Skillをトリガーとしています。

<img src="/images/20211001a/image_2.png" alt="image.png" width="1200" height="528" loading="lazy">

# 開発環境

開発はwindows10環境、WSL2上で行いました。標準モジュール以外で使用したものを以下に列挙します。(※前回記事との差分です)

## ハードウェア
- Amazon Echo Dot第3世代

## ソフトウェア

- Python 3.8.10
    - [eclipse/paho\.mqtt\.python: paho\.mqtt\.python](https://github.com/eclipse/paho.mqtt.python)
- [thorsten\-gehrig/alexa\-remote\-control: control Amazon Alexa from command Line \(set volume, select station from tunein or pandora\)](https://github.com/thorsten-gehrig/alexa-remote-control)
- Alexa Smart Home Skill
- AWS Lambda

# 実装

以下の手順で実装します。

1. PythonでSubscribe、AWS IoTからPublishする
2. AWS LambdaからAWS IoT経由でPublishする
3. Alexa Home Skillでスキルを作成する
4. Alexa Home SkillとAWS Lambda、 AWS IoTを連携する
5. Alexa Home Skillを開発する
6. Alexaアプリと連携する
7. ローカルのスクリプトを実行し、Alexaをしゃべらせる

まずは、PythonのMQTTモジュールである[eclipse/paho\.mqtt\.python: paho\.mqtt\.python](https://github.com/eclipse/paho.mqtt.python)に触ってAWS IoTからのテスト送信をSubscribeしましょう。

## 1. PythonでSubscribe、AWS IoTからPublishする

PythonでAWS IoTをSubscribeします。使用するPythonモジュールは[eclipse/paho\.mqtt\.python: paho\.mqtt\.python](https://github.com/eclipse/paho.mqtt.python)です。

モジュールの使い方はREADMEに記載されています。Getting Startedをコピペしたものが以下のスクリプトです。

```python main.py
import paho.mqtt.client
import ssl
import subprocess
import json

Endpoint = "xxxxxxxxxxxxxxxxxxxxx.iot.ap-northeast-1.amazonaws.com"
Port = 8883
SubTopic = "topic/to/subscribe"
RootCAFile = "AmazonRootCA1.pem"
CertFile = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-certificate.pem.crt"
KeyFile = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-private.pem.key"


def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))
    client.subscribe(SubTopic)


def on_message(client, userdata, msg):
    print("Received:" + msg.payload.decode("utf-8"))


if __name__ == '__main__':
    client = paho.mqtt.client.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.tls_set(
        RootCAFile,
        certfile=CertFile,
        keyfile=KeyFile,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLSv1_2,
        ciphers=None)
    client.connect(Endpoint, port=Port, keepalive=60)
    client.loop_forever()
```

適切にSubscribeできているのかAWS IoTのMQTT test clientで確かめます。

上記Pythonスクリプトを実行した状態でAWS IoTコンソールから「トピックをサブスクライブする」で`topic/to/subscribe`をサブスクライブした後に「トピックを公開する」でメッセージペイロードを発行してください。下図の様に「”AWS IoTコンソールからの挨拶”」を受信できていれば成功です。

<img src="/images/20211001a/pymqtt.gif" alt="pymqtt.gif" width="1200" height="432" loading="lazy">

## 2. AWS LambdaからAWS IoT経由でPublishする

次に、AWS LambdaからAWS IoT経由でメッセージをPublishしましょう。

ここで1点注意点があります。AWS Lambdaのリージョンは「オレゴン」としてください。これは後の工程でAlexa Home Skillと連携するためです。AWS IoTのリージョンは「東京」のままで大丈夫です。

大事なことなのでもう一度言います。

**「AWS Lambdaのリージョンは「オレゴン」としてください。」**

まずはLambdaに設定するIAMロールを作成します。

コンソールからポリシーを新規作成してください。

* [IAM Management Console](https://console.aws.amazon.com/iamv2/home#/roles)

### ポリシーの作成
JSON タブを選択して以下を入力してください。

```JSON
{
    "Version": "2012-10-17",
    "Statement": {
        "Effect": "Allow",
        "Action": "iot:Publish",
        "Resource": "*"
    }
}
```

上記の設定でAWS IoTでのPublishの権限のみが付与されます。適当なポリシー名を設定しましょう。タグは選択しなくて問題ありません。

次に上記で作成したポリシーを付与するIAMロールを作成します。ユースケースは「Lambda」を選択してください。「権限の設定」ページで作成したポリシーを検索、付与します。ここでもタグの設定ページがありますが、入力はしなくても問題ありません。

<img src="/images/20211001a/image_3.png" alt="image.png" width="1200" height="455" loading="lazy">

以上の設定を行うことでAWS Lambda作成時に「既存のロール」から作成したロールを付与することが可能となります。(今回は「my」という名前のロールを作成しています。)

### AWS Lambdaの作成
以下の様スクリプトをlambda_function.pyに張り付けてください。Lambdaのリージョンが「オレゴン」`iot = boto3.client('iot-data','ap-northeast-1')`の設定に東京('ap-northeast-1')が選択されていることに注意してください。AWS IoTが「オレゴン」で設定されている場合は'ap-northeast-1'は不要です。

```python lambda_function.py
# coding: utf-8
import json
import boto3

iot = boto3.client("iot-data","ap-northeast-1")


def lambda_handler(event, context):

    topic = "topic/to/subscribe"
    payload = {
        "message": "AWS Lambda からの挨拶"
    }

    try:
        iot.publish(
            topic=topic,
            qos=0,
            payload=json.dumps(payload, ensure_ascii=False)
        )

        return "Succeeeded."

    except Exception as e:
        print(e)
        return "Failed."
```


<img src="/images/20211001a/py-mqtt2.gif" alt="py-mqtt2.gif" width="1200" height="432" loading="lazy">

上記スクリプトを実行して下図の様に「AWS Lambdaからの挨拶」が表示されていれば成功です。

次の章でAlexa Home Skillを作成します。

## 3. Alexa Home Skillでスキルを作成する
Alexa Home Skillを作成する前にAmazon　Developerアカウントを作成します。Amazon DeveloperアカウントやAlexa Developerコンソールを使用した経験がある方も本章の内容確認は必ず行ってください。**特に、amazon.comでの購入経験がある方は要注意です。**ここで手順を誤ってしまうと無限に時間を溶かします。
（私は溶かしました。）

泥沼の中から私を救ってくれた記事はこちらです。

* [Amazon\.comアカウントが優先してAlexaアプリに入れない問題の解決法 \| DevelopersIO](https://dev.classmethod.jp/articles/solution-of-a-problem-amazon-com-account-conflict/)

結論から申し上げると、amazon.comのアカウントをお持ちの方（過去にamazon.comでの購入経験がある方）はパスワードをamazon.jpとは異なるパスワードで設定してください。

その上で、[Amazon開発者ポータル](https://developer.amazon.com/ja/)から普段amazon.jpで使用しているアカウントでログインしてください。(正確には使用するAmazon Echo Dotに紐づいているアカウントです。)

<img src="/images/20211001a/image_4.png" alt="image.png" width="1200" height="545" loading="lazy">

それでは、スキルを作成します。Alexa>スキル開発>開発者コンソールよりスキル作成画面に遷移してください。[Amazon Alexa Console \- Amazon Alexa Official Site](https://developer.amazon.com/alexa/console/ask)

本記事では、`alexa-dht22`というスキルを作成しました。

<img src="/images/20211001a/image_5.png" alt="image.png" width="1075" height="439" loading="lazy">

スキル作成画面では以下の項目を選択してください。「スマートホーム」「ユーザー定義のプロビジョニング」です。
<img src="/images/20211001a/image_6.png" alt="image.png" width="1010" height="891" loading="lazy">

スキルの作成は以上で完了です。次にAlexa Home SkillとAWS Lambdaの連携を行います。

## 4. Alexa Home SkillとAWS Lambda、 AWS IoTを連携する
本章で説明する内容は以下のWikiに記載されています。不明瞭なことがある場合は参照してください。

* [Build a Working Smart Home Skill in 15 Minutes · alexa/alexa\-smarthome Wiki](https://github.com/alexa/alexa-smarthome/wiki/Build-a-Working-Smart-Home-Skill-in-15-Minutes)

まずはセキュリティプロファイルを作成します。[Amazon開発者ポータル](https://developer.amazon.com/ja/)＞Login with Amazonでセキュリティプロファイルを新規作成してください。

今回は`alexa-dht22`という名称で作成しています。

<img src="/images/20211001a/image_7.png" alt="image.png" width="742" height="642" loading="lazy">

作成が完了するとクライアントIDとクライアントシークレットの2つが発行されます。
この2つは後程使用するので、手元にメモしておきましょう。

ここで一度Alexa Developerコンソールに戻って設定を行います。
以下、Wikiに記載されている手順です。

> - Lambda ARN default = enter your Lambda ARN noted from the previous step
> - Authorization URI = https://www.amazon.com/ap/oa
> - Client ID = your client ID from LWA noted in a previous step
> - Scope: profile (click Add Scope first to add)
> - Access Token URI: https://api.amazon.com/auth/o2/token
> - Client Secret: your client secret from LWA noted in a previous step
> - Client Authentication Scheme: HTTP Basic (Recommended)
> - Click Save

作成したスキルを選択後「スマートホーム」という画面でLambad関数のArnを設定します。

<img src="/images/20211001a/skill.png" alt="skill.png" width="1200" height="618" loading="lazy">
次に以下の項目を設定してください。

|項目 |設定内容  |
|---|---|
|Web認証画面のURI| https://www.amazon.com/ap/oa |
|アクセストークンのURI  |https://api.amazon.com/auth/o2/token  |
|ユーザーのクライアントID|セキュリティプロファイル作成時に発行されたID  |
|ユーザーのシークレット  |セキュリティプロファイル作成時に発行されたシークレット  |
|ユーザーの認可スキーム|HTTP Basic認証  |
|スコープ  |profile  |

Alexaのリダイレクト先のURLには3つのURLが記載されていると思います。

こちらは後の工程で使用するため、手元にメモしておきます(保存後に確認することもできます)。

<img src="/images/20211001a/skill2.png" alt="skill2.png" width="1200" height="735" loading="lazy">

次に[Amazon開発者ポータル](https://developer.amazon.com/ja/)にて先ほどの3つのURLを設定します。

「許可された返信URL」に先ほどメモしたURLを一つずつ登録します。
<img src="/images/20211001a/skill3.png" alt="skill3.png" width="1200" height="402" loading="lazy">

次が最後の設定項目です。Alexa Developerコンソールのスマートホーム画面にてスキルIDをコピーしてください。こちらをAWS Lambdaのトリガーに設定することで連携の完了です。

先ほど作成したLambad関数でトリガーを設定します。

<img src="/images/20211001a/skill4.png" alt="skill4.png" width="1200" height="719" loading="lazy">
「アプリケーションID」の部分に先ほどメモした「スキルID」を設定すれば完了です。

## 5. Alexa Home Skillを開発する

スクラッチで開発するのは大変ですので、こちらのリポジトリを転用します。

* [alexa/alexa\-smarthome: Resources for Alexa Smart Home developers\.](https://github.com/alexa/alexa-smarthome)

実装はこちらの公式サイトを参考にさせていただきました。
* [スマートホームスキルを作る （１） サンプルコードからスキルの基本要素を作る : Alexa Blogs](https://developer.amazon.com/ja/blogs/alexa/post/6cca52f7-1008-4506-9d75-283555c628d3/how-to-create-smart-home-jp-skill-1)
* [スマートホームスキルを作る \(２\) 各ディレクテイブを処理する : Alexa Blogs](https://developer.amazon.com/ja/blogs/alexa/post/954bdd49-e657-4059-930a-5658010d1234/how-to-create-smart-home-jp-skill-2)

今回は”Smart Switch”を使用します。


編集するのはlambda.pyのみです。

上記のリポジトリを編集したコードを

* [lambda\-alexa/python at main · orangekame3/lambda\-alexa](https://github.com/orangekame3/lambda-alexa/tree/main/python)

で公開しているので参考にしてください。

サンプルコードのSAMPLE_APPLIANCESを以下に置き換えてください。

```python lambda.py
SAMPLE_APPLIANCES = [
    {
        "applianceId": "Bot",
        "manufacturerName": "Sample Manufacturer",
        "modelName": "Smart Switch",
        "version": "1",
        "friendlyName": "温湿度マイスター",
        "friendlyDescription": "最適な室内環境を目指します。",
        "isReachable": True,
        "actions": [
            "turnOn",
            "turnOff"
        ],
        "additionalApplianceDetails": {
            "detail1": "For simplicity, this is the only appliance",
            "detail2": "that has some values in the additionalApplianceDetails"
        }
    },
]
```

サンプルコードでは「スマートスイッチ」「スマート温度計」「スマート鍵」など各種機能があらかじめ設定されているため、残していると今回作成したスキルを見失ってしまいます。消してしまいましょう。

ここで`modelName`には`Smart Switch`を指定します。`Smart Switch`はサンプルコードでロジックに組み込まれた文字列であるため、変更はしないでください。`friendlyName`や`friendlyDescription`はAlexaアプリ上での表示名です。自由に変更して構いません。

また、アプリ上での画面は温度計の表示したいため、`get_display_categories_from_v2_appliance(appliance)`に変更を加えました。
UIを温度計にする場合は`displayCategories`を`THERMOSTAT`を指定してください。

```python lambda.py
def get_display_categories_from_v2_appliance(appliance):
    model_name = appliance["modelName"]
    if model_name == "Smart Switch": displayCategories = ["THERMOSTAT"]
    return displayCategories
```

最後にRaspberryPiに向けてMQTTでPublishを行うために以下の関数を追加します。

```python lambda.py
import boto3

...
省略
...

client = boto3.client("iot-data", region_name="ap-northeast-1")

def send_command() :
    payload = {
        "message": "関数を実行するぜ！！"
    }

    topic ="topic/to/subscribe"
    client.publish(
        topic=topic,
        qos=0,
        payload=json.dumps(payload, ensure_ascii=False)
    )
```

`send_command()`の実行は`def handle_non_discovery_v3(request)`の末尾に仕込みます。もし、`ON`と`OFF`で操作を変えたい場合は関数内のif文にロジックを記載してください。今回はトリガーとしてのみAlexaを使用するため、関数末尾に記載しています。

ここまで変更ができたら関数をデプロイしましょう。

サンプルコードのpythonディレクトリをzip化してAWS Lambdaにアップロードしてください。この時handler関数の設定は`lambda.lambda_handler`としてください。

## 6. Alexaアプリと連携する
Alexaアプリを起動し、「デバイス>スマートホームスキル」と進むと先ほど作成したスキルが表示されます。スキルを有効化し、デバイスの探索を行ってください。Lambad関数が正しく記述できている場合はデバイスの探索が無事完了し、「温湿度マイスター」が登録されているはずです。

<img src="/images/20211001a/alexa2.png" alt="alexa2.png" width="1200" height="958" loading="lazy">

それでは最後にAlexaアプリ上で「その他>定型アクション」より、「アレクサ、不快指数は？」という呼びかけをトリガーとして「温湿度マイスターを起動する」アクションを作成します。

続く章ではローカルで実行するワーカーの実装を行います。

## 7. ローカルのスクリプトを実行し、Alexaをしゃべらせる
本章のスクリプトは以下で公開していますので、参考にしてください。
[orangekame3/py\-subscriber](https://github.com/orangekame3/py-subscriber)

あと少しで完成です。ローカルのスクリプトを実行するためにAWS IoTをSubscribeします。

```python main.py
import paho.mqtt.client
import ssl
import subprocess
import json
import plot

Endpoint = "xxxxxxxxxxxxxxxxxxxxxxx.iot.ap-northeast-1.amazonaws.com"
Port = 8883
SubTopic = "topic/to/subscribe"
RootCAFile = "AmazonRootCA1.pem"
CertFile = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-certificate.pem.crt"
KeyFile = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-private.pem.key"


def on_connect(client, userdata, flags, respons_code):
    print("connected")
    client.subscribe(SubTopic)


def on_message(client, userdata, msg):
    print("received:" + msg.payload.decode("utf-8"))
    data = json.loads(msg.payload.decode("utf-8"))
    message = plot.worker()
    cmd = ["./alexa_remote_control.sh", "-e", "speak:" + message]
    res = subprocess.call(cmd)


if __name__ == '__main__':
    client = paho.mqtt.client.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.tls_set(
        RootCAFile,
        certfile=CertFile,
        keyfile=KeyFile,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLSv1_2,
        ciphers=None)
    client.connect(Endpoint, port=Port, keepalive=60)
    client.loop_forever()
```

AWS LambdaからPublishされたメッセージを受信した際に

* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(前編\) \| フューチャー技術ブログ](/articles/20210929a/)
* [GoでMQTT\!\!　～温湿度マイスターbotの作成～\(後編\) \| フューチャー技術ブログ](/articles/20210930a/)

で作成した

「温湿度マイスターbot」のワーカーを起動しています。worker()の戻り値は温湿度情報の最新値および不快指数です。

workerはplot.pyにて以下の様に定義されています。

```python plot.py
from slack_sdk.web import WebClient
from dynamodb_json import json_util as util
from boto3.session import Session
import matplotlib.pyplot as plt
import numpy as np
import boto3
import datetime
import pytz
import schedule
import time
from boto3.dynamodb.conditions import Key

session = Session(profile_name="default", region_name='ap-northeast-1')
dynamodb = session.resource("dynamodb")
dynamodb_table = dynamodb.Table("mydht22")


def query_table(now):
    begin = now - datetime.timedelta(days=7)
    response = dynamodb_table.query(
        KeyConditionExpression=Key("device_id").eq('01') & Key("timestamp").between(
            begin.isoformat(sep = "T",timespec="milliseconds"),
            now.isoformat(sep = "T",timespec="milliseconds")))
    data = response["Items"]
    return data


def unmarshall(dynamodb_json):
    regular_json = util.loads(dynamodb_json)
    return regular_json


def worker():
    now = datetime.datetime.now(pytz.timezone("Asia/Tokyo"))
    executed_time = now.strftime("%Y-%m-%d %H:%M:%S")
    print("Executed:", executed_time)

    data = query_table(now)
    json_data = unmarshall(data)
    Humidity = []
    Temperature = []
    Timestamp = []
    temp = 0
    humid = 0
    for i in range(len(json_data)):
        temp = json_data[i]["temperature"]
        humid = json_data[i]["humidity"]
        times = json_data[i]["timestamp"][5:16]
        Humidity.append(humid)
        Temperature.append(temp)
        Timestamp.append(times)

    fukaisisuu = np.round(0.81 * temp + 0.01 * humid *
                          (0.99 * temp - 14.3) + 46.3, 2)
    fukai = "不快指数は" + str(fukaisisuu) + "です。"
    if len(Temperature) > 15:
        Temperature = Temperature[len(Temperature) - 15:]
        Humidity = Humidity[len(Humidity) - 15:]
        Timestamp = Timestamp[len(Timestamp) - 15:]

    plt.rcParams["font.family"] = "DejaVu Sans"
    plt.rcParams["mathtext.fontset"] = "stix"
    plt.rcParams["font.size"] = 20
    plt.rcParams["xtick.labelsize"] = 10
    plt.rcParams["ytick.labelsize"] = 10
    plt.rcParams["figure.figsize"] = (8, 6)
    print(fukai)

    fig = plt.figure()
    ax1 = fig.add_subplot(111)
    ln1 = ax1.plot(
        Timestamp,
        Temperature,
        marker='o',
        markeredgewidth=1.,
        markeredgecolor='k',
        color="orange",
        label=r"$Temperature$")
    ax2 = ax1.twinx()
    ln2 = ax2.plot(
        Timestamp,
        Humidity,
        marker='o',
        markeredgewidth=1.,
        markeredgecolor='k',
        color="blue",
        label=r'$Humidity$')
    h1, l1 = ax1.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax1.legend(h1 + h2, l1 + l2, loc='upper right')
    ax1.set_ylim([20, 32])
    ax2.set_ylim([25, 85])
    ax1.axhspan(25, 28, color="olive", alpha=0.3)
    ax2.axhspan(40, 70, color="royalblue", alpha=0.2)
    ax1.set_xlabel(r"$Timestamp$")
    ax1.set_ylabel(r"$Temperature$")
    ax2.set_ylabel(r"$Humidity$")
    ax1.grid(True)
    plt.gcf().autofmt_xdate()
    plt.savefig("室内温湿度.jpg")

    client = WebClient(
        token="xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    response = client.chat_postMessage(text=" Temp : " + str(Temperature[-1]) + "℃, Humid : " + str(
        Humidity[-1]) + "%, message : " + fukai, channel="#home")
    response = client.files_upload(
        channels="#home",
        file="./室内温湿度.jpg",
        title="室内温湿度")

    message = "室内温度は" + str(Temperature[-1]) + \
        "度。湿度は" + str(Humidity[-1]) + "%です。" + fukai
    return message


if __name__ == '__main__':
    session = Session(profile_name="default", region_name="ap-northeast-1")
    dynamodb = session.resource("dynamodb")
    dynamodb_table = dynamodb.Table("mydht22")
    schedule.every(2).seconds.do(worker)
    while True:
        schedule.run_pending()
        time.sleep(1)
```

alexaの音声操作にはこちらのシェルスクリプトを使用しています。

* [thorsten\-gehrig/alexa\-remote\-control: control Amazon Alexa from command Line \(set volume, select station from tunein or pandora\)](https://github.com/thorsten-gehrig/alexa-remote-control)

使い方についてはこちらの日本語の記事で詳細に紹介されています。

* [Alexaを自由に喋らせる方法（コマンドライン編） \| 育児×家事×IoT](https://dream-soft.mydns.jp/blog/developper/smarthome/2021/03/2932/)

リポジトリからローカルにクローンをし、アカウントのセットアップ後すぐに使うことができます。
例えば、

```bash
 ./alexa_remote_control.sh -e "speak:おはよう"
```

などを実行することで自分のEcho端末を自由に喋らせることができます。

それでは`main.py`を実行してAWS IoTをSubscribeしましょう。

# Alexaに話しかける

それではAlexaに話しかけましょう。

「Alexa 、不快指数は？」


<iframe width="560" height="315" src="https://www.youtube.com/embed/YfbDl6xolV8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

どうでしょうか、Alexaは不快指数を教えてくれたでしょうか。

温湿度センサーを用いたデータの取得、MQTTによるDynamoDBへのデータ連携、Alexaを使ったデバイス操作などを行ってきましたが、能動的に動作するプロダクトはこれまでとは違った喜びがありますね。

Alexa周りはまだまだ分からないことばかりですが、これを機に学習してみようと思います。
