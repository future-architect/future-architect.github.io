---
title: "GoでMQTT!!　～温湿度マイスターbotの作成～(後編)"
date: 2021/09/30 00:00:00
postid: a
tags:
  - AWSIoT
  - RaspberryPi
  - Python
  - MQTT
  - BOT
  - ハンズオン
categories:
  - IoT
thumbnail: /images/2021/20210930a/thumbnail.png
author: 宮永崇史
lede: "AWS IoTを使用したMQTTのチュートリアルはAWS公式からも詳細なハンズオン記事が出ています。本記事はこちらのハンズオンを基にGo言語を使用してMQTTで通信しました。(公式の記事はPythonで実装されています。)"
mathjax: true
---

<img src="/images/2021/20210930a/サムネイル2.png" alt="" title="Louis Reed on Unsplash" width="1200" height="675" loading="lazy">

## はじめに

こんにちは。TIG/DXユニット所属の宮永です。

**本記事は[「GoでMQTT\!\!　～温湿度マイスターbotの作成～\(前編\) 」](https://future-architect.github.io/articles/20210929a/)の後半パートです。**

前半パートの記事をご覧になっていない方はそちらもご参照ください。

>今回はAWSサービスのうちの一つAWS IoTを使用してRaspberryPiとのMQTTによる通信を行います。

AWS IoTを使用したMQTTのチュートリアルはAWS公式からも詳細なハンズオン記事が出ています。

* *[AWS IoT Core の設定 :: AWS IoT Core 初級 ハンズオン](https://aws-iot-core-for-beginners.workshop.aws/phase3/step1.html)*

本記事はこちらのハンズオンを基にGo言語を使用してMQTTで通信しました。(公式の記事はPythonで実装されています。)

最終的には室内の快適な温湿度を教えてくれる「温湿度マイスターbot」を作成します。

なお、本記事で作成したコードは

* *[orangekame3/go\-mqtt](https://github.com/orangekame3/go-mqtt)*
* *[orangekame3/th\-meisterBot](https://github.com/orangekame3/th-meisterBot)*

にて公開しています。

## 前回の振り返り

実装は以下の手順で進めます。
前回の記事では**「3. DHT22の温湿度情報をAWS IoTへPublish」**までを行いました。

1. DHT22から温湿度情報を取得する
2. AWS IoTを使用してRaspberryPiからのPublish動作確認
3. DHT22の温湿度情報をAWS IoTへPublish　　　　　　　　👈ココまでやりました。
4. AWS IoTで取得した温湿度情報をDynamoDBに連携
5. Boto3を使用してDynamoDBからデータをQuery、データ整形
6. 取得データをmatplotlibで可視化
7. 作成したプロット図をSlack APIで画像投稿

本記事では**「4. AWS IoTで取得した温湿度情報をDynamoDBに連携」**から取り組みます。

### 4. AWS IoTで取得した温湿度情報をDynamoDBに連携

DynamoDBについては入門記事などが弊社ブログでも投稿されているため説明は割愛いたします。

* *[DynamoDB の記事一覧 \| フューチャー技術ブログ](https://future-architect.github.io/tags/DynamoDB/)*

AWS IoTで受信したデータをDynamoDBに登録する方法は公式に詳細に記載されています。

* *[デバイスデータを DynamoDB テーブルに保存する \- AWS IoT Core](https://docs.aws.amazon.com/ja_jp/iot/latest/developerguide/iot-ddb-rule.html)*

公式のドキュメントは非常に丁寧にまとめられているため、本記事では要点のみ記載します。

#### テーブルの新規作成

まずはテーブルの作成です。テーブル名は任意ですが、今回は`mydht22`としました。Partition keyに`device_id`をSort keyに`timestamp`を定義しています。
<img src="/images/2021/20210930a/image.png" alt="image.png" width="797" height="508" loading="lazy">

#### ルールの作成

作成したテーブルにデータを送信するため、AWS IoT ルールを作成します。

AWS IoTコンソール上Act>Ruleからルールの新規作成が行えます。SQLバージョンの使用は2016-03-23を使用しました。From句には **「2. AWS IoTを使用してRaspberryPiからのPublish動作確認」** の実装にてに定義したトピック名を記載してください。

今回の場合トピック名は「topic/to/publish」です。as句は通常のSQLと同じようにテーブル名となるため適宜定義してください。

```sql
SELECT
    '01' as device_id
,   Timestamp as timestamp
,   Temperature as temperature
,   Humidity as humidity
FROM 'topic/to/publish'
```

アクション追加の際には下図**「DynamoDBテーブル(DynamoDBv2)の複数列にメッセージを分割する」**を追加してください。
<img src="/images/2021/20210930a/image_2.png" alt="DynamoDBコンソール画面" width="818" height="247" loading="lazy">

リソースにテーブル`mydht22`選択してください。また、今回は`mydht22`という名称でロールを新規作成しました。

<img src="/images/2021/20210930a/image_3.png" alt="ロール作成" width="982" height="616" loading="lazy">

#### 疎通確認

最後にDynamoDBにデータが正しく登録されているか確認します。
DynamoDBコンソールにアクセスして、下図の様にデータが登録されていることを確認してください。

<img src="/images/2021/20210930a/image_4.png" alt="データ登録" width="675" height="511" loading="lazy">

作成したルールに従ってデータが登録されていますね！
次の章では、Boto3を使用してDynamoDBからデータを取得したうえで、扱いやすいようにデータを整形します。

### 5. Boto3を使用してDynamoDBからデータをQuery、データ整形

PythonモジュールBoto3を使用してDynamoDBからデータをQuery、最新値15点ほどを抜き出してプロットします。

Boto3を使用したQueryは非常に簡単に行えますが、Queryで取得したデータはDecimal型を含む特殊な構造をしているため、JSONに整形する必要があります。

今回JSONへの整形にはこちらのモジュールを利用させていただきました。

* *[Alonreznik/dynamodb\-json: DynamoDB json util to load and dump strings of Dynamodb json format to python object and vise\-versa](https://github.com/Alonreznik/dynamodb-json)*

それでは、以下のスクリプトによって作成したテーブル*mydht22*よりデータを取得、JSONファイルとして保存します。

>*※本環境ではAWS_PROFILEが設定してあることを前提としています。
AWS_PROFILEの設定方法は以下をご参照ください。

* [名前付きプロファイル \- AWS Command Line Interface](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-profiles.html)*

```python query.py
from dynamodb_json import json_util as util
from boto3.session import Session
from boto3.dynamodb.conditions import Key
import datetime
import boto3
import json

def query_table(executed_time):
    """
    現在日時より過去７日間のデータをクエリ
    """
    begin = executed_time - datetime.timedelta(days=7)
    response = dynamodb_table.query(
        KeyConditionExpression=Key('device_id').eq('01') & Key('timestamp').between(
            begin.isoformat(sep = "T",timespec="milliseconds"),
            executed_time.isoformat(sep = "T",timespec="milliseconds")))
    data = response['Items']
    return data


def unmarshall(dynamodb_json):
    """
    dynamodbで取得したデータを通常のJDONへ整形
    """
    regular_json = util.loads(dynamodb_json)
    return regular_json


def main():
    now = datetime.datetime.now(pytz.timezone('Asia/Tokyo'))
    raw = query_table(now)
    data = unmarshall(raw)
    with open('scan_data.json', mode='wt', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    session = Session(profile_name='default', region_name='ap-northeast-1')
    dynamodb = session.resource('dynamodb')
    dynamodb_table = dynamodb.Table('mydht22')
    main()
```

上記スクリプトの実行により出力されたJSONは

```JSON query_data.json
  {
    "device_id": "01",
    "humidity": 42.5,
    "temperature": 26.9,
    "timestamp": "2021-09-23T17:50:42.522120086+09:00"
  },
  {
    "device_id": "01",
    "humidity": 42.7,
    "temperature": 27,
    "timestamp": "2021-09-23T17:51:45.55949297+09:00"
  },
  {
    "device_id": "01",
    "humidity": 42.7,
    "temperature": 26.9,
    "timestamp": "2021-09-23T17:52:46.600977247+09:00"
  },
...(省略)
]
```

扱いやすいJSONファイルを取得できました！！

それでは、次章で取得したデータをプロットしましょう。

### 6. 取得データをmatplotlibで可視化

先ほど取得したデータを使用してプロットします。

今回はQueryによって得たデータのうち最新データ15点をプロットするようにしました。ただし、取得したデータをプロットするだけでは面白くないので不快指数を可視化できるようにしました。
天気予報で頻繁に耳にする不快指数ですが、以下論文にて数式化が掲載されていました。

* *[木内豪「屋外空間における温冷感指標に関する研究 \(PDF\) 」 『天気』第48巻第9号、2001年、 661\-671頁。](https://www.metsoc.jp/tenki/pdf/2001/2001_09_0661.pdf)*

$T_{d}$を気温(℃)、$H$を湿度(％)としたとき、

$$
不快指数 = {\displaystyle 0.81T_{d}+0.01H(0.99T_{d}-14.3)+46.3\,}
$$

として不快指数を計算できるそうです。

屋外に関する指標ですが、室内環境の調整には十分そうです。

また、屋内における適正温度は夏場において25 ~ 28℃、適正湿度は40 ~ 70％とのことから、該当領域に色付けをして一目で室内環境を把握できるようにしました。

* *[温度と湿度の関係を知って快適に暮らそう！すぐに実践できる温度・湿度の調節方法もご紹介｜EGR](https://www.egmkt.co.jp/column/consumer/20210506_EG_067.html)*

不快指数などのメッセージは**「7. 作成したプロット図をSlack APIで画像投稿」**にてSlackで通知する仕組みとなっています。

```python plot.py
def calc(temp, humid):
    """
    不快指数の計算をする
    """
    return np.round(0.81 * temp + 0.01 * humid *
                    (0.99 * temp - 14.3) + 46.3, 2)


def fetch_latest_value(Timestamp, Temperature, Humidity):
    """
    データより最新値15点を取得
    """
    length = len(Timestamp)
    if length > 15:
        Temperature = Temperature[length - 15:]
        Humidity = Humidity[length - 15:]
        Timestamp = Timestamp[length - 15:]
    return Timestamp, Temperature, Humidity,


def converter(json_data):
    """
    JSONから配列へ変換
    """
    Humidity = []
    Temperature = []
    Timestamp = []
    temp = 0
    humid = 0
    for i in range(len(json_data)):
        temp = json_data[i]['temperature']
        humid = json_data[i]['humidity']
        times = json_data[i]['timestamp'][5:16]
        Humidity.append(humid)
        Temperature.append(temp)
        Timestamp.append(times)
    return Timestamp, Temperature, Humidity,


def generate_figure(Timestamp, Temperature, Humidity):
    """
    プロット図の生成
    """
    plt.rcParams['font.family'] = 'DejaVu Sans'
    plt.rcParams['mathtext.fontset'] = 'stix'
    plt.rcParams["font.size"] = 20
    plt.rcParams['xtick.labelsize'] = 10
    plt.rcParams['ytick.labelsize'] = 10
    plt.rcParams['figure.figsize'] = (8, 6)
    fig = plt.figure()
    ax1 = fig.add_subplot(111)
    ln1 = ax1.plot(
        Timestamp,
        Temperature,
        marker='o',
        markeredgewidth=1.,
        markeredgecolor='k',
        color="orange",
        label=r'$Temperature$')
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
    ax1.set_xlabel(r'$Timestamp$')
    ax1.set_ylabel(r'$Temperature$')
    ax2.set_ylabel(r'$Humidity$')
    ax1.grid(True)
    plt.gcf().autofmt_xdate()
    fig_path = "室内温湿度.jpg"
    plt.savefig(fig_path)
    return fig_path


def worker():
    """
    メインとなる関数
    """
    now = datetime.datetime.now(pytz.timezone('Asia/Tokyo'))
    executed_time = now.strftime('%Y-%m-%d %H:%M:%S')
    print("Executed:", executed_time)
    data = query_table(now)
    json_data = unmarshall(data)
    Timestamp, Temperature, Humidity = converter(json_data)
    Timestamp, Temperature, Humidity = fetch_latest_value(
        Timestamp, Temperature, Humidity)
    fukai = calc(Temperature[-1], Humidity[-1])
    fukai_message = "不快指数は" + str(fukai) + "です。"
    fig = generate_figure(Timestamp, Temperature, Humidity)

```

#### 出力結果

<img src="/images/2021/20210930a/室内温湿度.jpg" alt="室内温湿度" width="800" height="600" loading="lazy">

### 7. 作成したプロット図をSlack APIで画像投稿

それでは、上記で出力した画像をSlackに投稿します。

実装はこちらの準公式記事を参考にしました。

* *[Python で Slack API や Webhook を扱うなら公式 SDK（slack\-sdk/slack\-bolt）を使おう \- Qiita](https://qiita.com/seratch/items/8f93fd0bf815b0b1d557)*

Slackbotの作成などは本記事の主旨ではないため、割愛いたします。

先ほど作成したworker関数に以下を追加します。

```python plot.py
from slack_sdk.web import WebClient

...(省略)

client = WebClient(
        token="xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    response1 = client.chat_postMessage(text=" Temp : " + str(Temperature[-1]) + "℃, Humid : " + str(
        Humidity[-1]) + "%, message : " + fukai_message, channel="#home")
    response2 = client.files_upload(channels="#home", file=fig, title="室内温湿度")

```

たったこれだけでSlackに自由に投稿できるとは！ 便利ですね。

>*注意点が一つあります。テキストメッセージの送信の際はchannel="#home"となっていますが、画像を投稿する際はchannels = "#home"です。*

#### 出力結果

<img src="/images/2021/20210930a/image_5.png" alt="出力結果グラフ" width="647" height="457" loading="lazy">

それでは、最後にSlack投稿を定期実行するようにしましょう。
定期実行には以下のモジュールを使わせていただきました。

* *[dbader/schedule: Python job scheduling for humans\.](https://github.com/dbader/schedule)*

2時間ごとにworkerを実行するように設定しました。
最終的なPythonスクリプトはこちらです。

```python plot.py
from slack_sdk.web import WebClient
from dynamodb_json import json_util as util
from boto3.session import Session
from boto3.dynamodb.conditions import Key
import matplotlib.pyplot as plt
import numpy as np
import boto3
import datetime
import pytz
import schedule
import time


session = Session(profile_name='default', region_name='ap-northeast-1')
dynamodb = session.resource('dynamodb')
dynamodb_table = dynamodb.Table('mydht22')


def query_table(executed_time):
    """
    現在日時より過去７日間のデータをクエリ
    """
    begin = executed_time - datetime.timedelta(days=7)
    response = dynamodb_table.query(
        KeyConditionExpression=Key('device_id').eq('01') & Key('timestamp').between(
            begin.isoformat(sep = "T",timespec="milliseconds"),
            executed_time.isoformat(sep = "T",timespec="milliseconds")))
    data = response['Items']
    return data


def unmarshall(dynamodb_json):
    """
    dynamodbで取得したデータを通常のJDONへ整形
    """
    regular_json = util.loads(dynamodb_json)
    return regular_json


def calc(temp, humid):
    """
    不快指数の計算をする
    """
    return np.round(0.81 * temp + 0.01 * humid *
                    (0.99 * temp - 14.3) + 46.3, 2)


def fetch_latest_value(Timestamp, Temperature, Humidity):
    """
    データより最新値15点を取得
    """
    length = len(Timestamp)
    if length > 15:
        Temperature = Temperature[length - 15:]
        Humidity = Humidity[length - 15:]
        Timestamp = Timestamp[length - 15:]
    return Timestamp, Temperature, Humidity,


def converter(json_data):
    """
    JSONから配列へ変換
    """
    Humidity = []
    Temperature = []
    Timestamp = []
    temp = 0
    humid = 0
    for i in range(len(json_data)):
        temp = json_data[i]['temperature']
        humid = json_data[i]['humidity']
        times = json_data[i]['timestamp'][5:16]
        Humidity.append(humid)
        Temperature.append(temp)
        Timestamp.append(times)
    return Timestamp, Temperature, Humidity,


def generate_figure(Timestamp, Temperature, Humidity):
    """
    プロット図の生成
    """
    plt.rcParams['font.family'] = 'DejaVu Sans'
    plt.rcParams['mathtext.fontset'] = 'stix'
    plt.rcParams["font.size"] = 20
    plt.rcParams['xtick.labelsize'] = 10
    plt.rcParams['ytick.labelsize'] = 10
    plt.rcParams['figure.figsize'] = (8, 6)
    fig = plt.figure()
    ax1 = fig.add_subplot(111)
    ln1 = ax1.plot(
        Timestamp,
        Temperature,
        marker='o',
        markeredgewidth=1.,
        markeredgecolor='k',
        color="orange",
        label=r'$Temperature$')
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
    ax1.set_xlabel(r'$Timestamp$')
    ax1.set_ylabel(r'$Temperature$')
    ax2.set_ylabel(r'$Humidity$')
    ax1.grid(True)
    plt.gcf().autofmt_xdate()
    fig_path = "室内温湿度.jpg"
    plt.savefig(fig_path)
    return fig_path


def worker():
    """
    データを取得し、Slack APIで投稿する
    """
    now = datetime.datetime.now(pytz.timezone('Asia/Tokyo'))
    executed_time = now.strftime('%Y-%m-%d %H:%M:%S')
    print("Executed:", executed_time)
    data = query_table(now)
    json_data = unmarshall(data)
    Timestamp, Temperature, Humidity = converter(json_data)
    Timestamp, Temperature, Humidity = fetch_latest_value(
        Timestamp, Temperature, Humidity)
    fukai = calc(Temperature[-1], Humidity[-1])
    fukai_message = "不快指数は" + str(fukai) + "です。"
    fig = generate_figure(Timestamp, Temperature, Humidity)
    message = "室内温度は" + \
        str(Temperature[-1]) + "度。湿度は" + str(Humidity[-1]) + "%です。" + fukai_message
    client = WebClient(
        token="xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    response1 = client.chat_postMessage(text=" Temp : " + str(Temperature[-1]) + "℃, Humid : " + str(
        Humidity[-1]) + "%, message : " + fukai_message, channel="#home")
    response2 = client.files_upload(channels="#home", file=fig, title="室内温湿度")

    return message


if __name__ == "__main__":
    session = Session(profile_name='default', region_name='ap-northeast-1')
    dynamodb = session.resource('dynamodb')
    dynamodb_table = dynamodb.Table('mydht22')
    schedule.every(2).hours.do(worker)
    while True:
        schedule.run_pending()
        time.sleep(1)

```

## まとめ

GoとAWS IoTを使用してMQTT通信しました。

AWS IoTを使用したのは初めてだったのですが、公式のドキュメントやチュートリアルが非常に丁寧であったため、簡単に実装できました。

AWS以外のクラウドサービスのMQTTサポートなどの使い勝手も気になってきたため、近々まとめられればと思います。

**（2021.10.1）続編が公開されました**

* [PythonでMQTT!! ～Alexaでコマンドを送信する～  | フューチャー技術ブログ](/articles/20211001a/)
