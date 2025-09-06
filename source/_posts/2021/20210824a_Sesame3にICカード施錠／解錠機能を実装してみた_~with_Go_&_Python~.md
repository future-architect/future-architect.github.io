---
title: "Sesame3にICカード施錠/解錠機能を実装してみた with Go & Python"
date: 2021/08/24 00:00:00
postid: a
tag:
  - Go
  - Python
  - RaspberryPi
category:
  - IoT
thumbnail: /images/2021/20210824a/thumbnail.png
author: 宮永崇史
lede: "夏の自由研究ブログ連載2021の第2本目の投稿として、Sesame3にFelicaによる施錠解錠を実装しました。Sesame3はCANDY HOUSE JAPANが開発、販売しているスマートロックです。Sesame3本体に加えてwifiモジュールを購入すると、外出先から鍵の施錠/解錠を行うことができます。"
---

<img src="/images/2021/20210824a/サムネ.png" alt="" width="" height="" loading="lazy">

Photo by <a href="https://unsplash.com/@davidclode?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">David Clode</a> on <a href="https://unsplash.com/s/photos/python-programming?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>. The Gopher character is based on the Go mascot designed by [Renee French](http://reneefrench.blogspot.com/).

※本記事で紹介している認証方法はFelicaのIDmのみを使用しております。IDm単体での認証はセキュリティ上望ましくないため、本記事を参考にされる方はご注意ください。

## 0. はじめに

はじめまして、2021年4月入社TIG/DXユニット所属の宮永です。

[夏の自由研究ブログ連載2021](/articles/20210823a/)の第2本目の投稿として、Sesame3にFelicaによる施錠解錠を実装しました。

作成したプログラムは [orangekame3/gopy\-sesame3: Sesame3のAPIをたたくクライアントアプリ](https://github.com/orangekame3/gopy-sesame3)にて公開しています。

## 1. 動機

私が所属しているプロジェクトではGoをメイン言語としています。Go未経験者である私は身の回りで楽しみながら言語を学べるブツはないかと探しました。

するとそこにはSesame3がありました。

## 2. Sesame3とは

<img src="/images/2021/20210824a/DSC_0478.JPG" alt="Sesame3の箱" width="1200" height="676" loading="lazy">

Sesame3は[CANDY HOUSE JAPAN](https://jp.candyhouse.co/)が開発、販売しているスマートロックです。Sesame3本体に加えてwifiモジュールを購入すると、外出先から鍵の施錠/解錠を行うことができます。

また、6月にCANDY HOUSE公式で[Web API](https://doc.candyhouse.co/ja/SesameAPI)が公開されており、鍵の状態確認、施錠/解錠などを行うことができます。

今回はこのデバイスを使ってFelicaによる施錠と解錠の機能を実装したいと思います。

## 3. 必要なもの

実装に使用したものを列挙します

### 3.1. ハード

- [SESAME３ – CANDY HOUSE JAPAN](https://jp.candyhouse.co/products/sesame3?variant=33274924367935)
- [非接触ＩＣカードリーダー \| NFCポート パソリ \| ソニー](https://www.amazon.co.jp/dp/B00VR1WARC)
- [Raspberry Pi 3 Model B\+ – Raspberry Pi](https://www.raspberrypi.org/products/raspberry-pi-3-model-b-plus/)
- [スピーカー　８Ω８Ｗ: パーツ一般 秋月電子通商\-電子部品・ネット通販](https://akizukidenshi.com/catalog/g/gP-03285/)
- [３．５ｍｍステレオミニプラグ⇔スクリュー端子台: パーツ一般 秋月電子通商\-電子部品・ネット通販](https://akizukidenshi.com/catalog/g/gC-08853/)
- [ＰＡＭ８０１２使用２ワットＤ級アンプモジュール: 組立キット\(モジュール\) 秋月電子通商\-電子部品・ネット通販](https://akizukidenshi.com/catalog/g/gK-08217/)

### 3.2. ソフト

開発はWindows10環境、WSL2上で行いました。

- Go1.16.6 linux/amd64
- Python 3.8.10
  - [nfcpy/nfcpy: A Python module to read/write NFC tags or communicate with another NFC device\.](https://github.com/nfcpy/nfcpy)
  - [theskumar/python\-dotenv: Get and set values in your \.env file in local and production servers\.](https://github.com/theskumar/python-dotenv)
  - [Legrandin/pycryptodome: A self\-contained cryptographic library for Python](https://github.com/Legrandin/pycryptodome)

Sesame3を動かすWeb APIは[こちら](https://dash.candyhouse.co/login)からAPI_TOKENを発行してください。
API_TOKENの発行の方法は[こちら](https://zenn.dev/key3/articles/6c1c2841d7a8a2)のブログが参考になりました。

施錠/解錠に必要な情報は

- API_TOKEN
- UUID
- SECRET_KEY

の3つです。

## 4. 構成

PythonでカードリーダーによるIDmの読み取りと`SECRET_KEY`の暗号化を行い、GoでHTTPリクエストを行うという構成にしました。
この構成にした理由は以下の3点です。

1. Pythonに便利なモジュールがあった
2. Goに少しでも慣れたかった
3. cgoというものを見つけてしまった

本来であれば素直にPython1本、Go1本に絞ったほうが良いと思います...。

### 4.1 システム概要図

以下システムの概要図です。

Raspberry Piにカードリーダー、スピーカーを接続しています。PythonでカードーリーダーからFelicaのIDmを取得し、暗号化したSECRET_KEYとAPI_TOKENをGo側に渡します。また、IDmの検知をユーザーに通知音で知らせています。GOではCANDY HOUSEが公開しているWeb APIに向けてHTTPリクエストを行います。リクエストに応じて、SESAME3を開閉できるという構成になっています。

<img src="/images/2021/20210824a/image.png" alt="システム構成図" width="1200" height="933" loading="lazy">

### 4.2. ディレクトリの構成

ビルド前のディレクトリの構成です。

```bash
.
├── README.md
├── export
│   ├── export.go
│   └── go.mod
├── main.py
├── nfcreader.py
└── notify.wav
```

## 5. 実装

 APIの使用方法は[公式](https://doc.candyhouse.co/ja/SesameAPI)にて、PythonおよびJavaScriptで公開されています。

今回は公式に記載された方法を手掛かりにコーディングしました。

### 5.1. HTTPリクエスト

GoでHTTPリクエストを実装します。今回は`cgo`を使用するため、構造体はなるべく使わずメソッドのみで完結させます。

まずは変数定義です。`rootUrl`は公式に記載されたendpointです。コマンドに応じて`rootUrl`に追記していきます。`cmd_unlock`、`cmd_lock`は公式ページに指定された解錠コマンドおよび施錠コマンドです。`src`にはアプリに登録する履歴名を指定しています。今回は`by Felica`という名前で登録しています。

```go export.go
package main

var (
	rootUrl    = "https://app.candyhouse.co/api/sesame2/"
	cmd_unlock = 83
	cmd_lock   = 82
	src        = []byte("by Felica")
	history    = base64.StdEncoding.EncodeToString(src)
)
```

続いて、HTTPリクエストに使用するJSONを格納するための構造体を定義します。こちらも
公式に記載されているJSONの定義を参考にしました。

```go export.go
type RequestBody struct {
	Cmd     int    `json:"cmd"`
	History string `json:"history"`
	Sign    string `json:"sign"`
}

type ResponseBody struct {
	BatteryPercentage int     `json:"batteryPercentage"`
	BatteryVoltage    float64 `json:"batteryVoltage"`
	Position          int     `json:"position"`
	CHSesame2Status   string  `json:"CHSesame2Status"`
	Timestamp         int     `json:"timestamp"`
	Wm2State          bool    `json:"wm2State"`
}
```

それでは、鍵の開閉を行う関数`executeSesame3`を実装します。関数内で指定された引数`signPtr`、`apiPtr`、`uuidPtr`はPythonから渡されることを想定しています。`C.`を指定することで`cgo`内の関数を使用できます。

ここで1つ注意が必要です。`cgo`を利用する際はメソッドの上のコメントを関数名にそろえる必要があります。

開閉の流れとしては「施錠中/解錠中の確認`fetchStatus`」→「解錠中`isUnlocked`であれば`executeLock`を実行」「施錠中であれば`executeUnlock`を実行する」という構成です。

```go export.go
//export executeSesame3
func executeSesame3(signPtr, apiPtr, uuidPtr *C.char) {
	// sign,api,uuidはpython側から入力されるSIGN,API_TOKEN.UUIDに一致する
	sign := C.GoString(signPtr)
	api := C.GoString(apiPtr)
	uuid := C.GoString(uuidPtr)
	// fetchStatusでは鍵の状態を読みこんでいる
	key_status := fetchStatus(api, uuid)
	//executeLockで施錠を、executeUnlockで解錠を行う
	if isUnlocked(key_status) {
		fmt.Println("Key is " + key_status + ". Locking ...")
		executeResponse := executeLock(sign, api, uuid)
		fmt.Println(executeResponse)
	} else {
		fmt.Println("Key is " + key_status + ". Unlocking ...")
		executeResponse := executeUnlock(sign, api, uuid)
		fmt.Println(executeResponse)
	}
}
```

次に、`fetchStatus`をコーディングします。`fetchStatus`は鍵の状態を取得する関数です。鍵の状態取得のHTTPリクエストに必要な情報は`UUID`と`API_TOKEN`です。`rootUrl`に自分のデバイスの`UUID`を追加したものがendpointです。

```go export.go
//export fetchStatus
func fetchStatus(api, uuid string) string {
	// candyhouse公式(https://doc.candyhouse.co/ja/SesameAPI)に記載されているurlを準備する
	fetchUrl := rootUrl + uuid
	req, err := http.NewRequest("GET", fetchUrl, nil)
	if err != nil {
		log.Fatal(err)
	}
	// headerにpython側から受け取ったAPI_TOKENを渡す
	req.Header.Set("x-api-key", api)
	// リクエストの実行
	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()
	respbody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	var statusResponse ResponseBody
	if err := json.Unmarshal(respbody, &statusResponse); err != nil {
		fmt.Println("JSON Unmarshal error:", err)
	}
	key_status := string(statusResponse.CHSesame2Status)
	return key_status
}
```

最後に施錠と解錠の関数`executeLock`、`executeUnlock`をコーディングします。こちらの2つはほぼ同じ内容です。

```go export.go
//export executeUnlock
func executeUnlock(sign, api, uuid string) string {
	// candyhouse公式(https://doc.candyhouse.co/ja/SesameAPI)に記載されているurlを準備する
	cmdUrl := rootUrl + uuid + "/cmd"
	// リクエスト構造体の初期化
	requestBody := RequestBody{
		Cmd:     cmd_unlock,
		History: history,
		Sign:    sign,
	}
	// リクエスト構造体をjson化してPOSTのbodyに追加する
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Fatal(err)
	}
	req, err := http.NewRequest("POST", cmdUrl, bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Fatal(err)
	}
	// headerにpython側から受け取ったAPI_TOKENを渡す
	req.Header.Set("x-api-key", api)
	// リクエストの実行
	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()
	return "Unlock command was executed."
}

//export executeLock
func executeLock(sign, api, uuid string) string {
	// candyhouse公式(https://doc.candyhouse.co/ja/SesameAPI)に記載されているurlを準備する
	cmdUrl := rootUrl + uuid + "/cmd"
	// リクエスト構造体の初期化
	requestBody := RequestBody{
		Cmd:     cmd_lock,
		History: history,
		Sign:    sign,
	}
	// リクエスト構造体をJSON化してPOSTのbodyに追加する
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Fatal(err)
	}
	req, err := http.NewRequest("POST", cmdUrl, bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Fatal(err)
	}
	// headerにpython側から受け取ったAPI_TOKENを渡す
	req.Header.Set("x-api-key", api)
	// リクエストの実行
	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()
	return "Lock command was executed."
}
```

以上でGo側のコーディングは完成です。
Pythonのコーディングを始める前に`export.go`をビルドします。`/exoprt`にて以下コマンドを実行します。

```bash
go build -buildmode=c-shared -o export.so
```

ビルド後、export配下に新たに`export.so`、`export.h`が出力されていることが確認できます。

```bash
.
├── README.md
├── export
│   ├── export.go
│   ├── export.h
│   ├── export.so
│   └── go.mod
├── main.py
├── nfcreader.py
└── notify.wav
```

次にPython側をコーディングしていきます。

### 5.2 NFCの読み込み

Python側ではカードリーダーの制御、環境変数の引き渡し、`SECRET_KEY`の暗号化を行います。また、ICカード検知の通知音を出すために、スピーカーの制御も行っています。

以下必要となるモジュールを読み込みます。自作したモジュールは`nfcreader.py`のみです。

```python main.py
from ctypes import *
import ctypes
import datetime
from Crypto.Hash import CMAC
from Crypto.Cipher import AES
import struct
from time import sleep
import os
from dotenv import load_dotenv
import subprocess
from nfcreader import CardReader
```

まずは環境変数の読み込みです。

ここで環境変数とは`SECRET_KEY`、`API_TOKEN`、`UUID`、ICカードの`IDm`を指しています。環境変数は誤ってGitHubなどに公開しないようにまとめて管理します。

環境変数の管理には`python-dotenv`を使用しました。ソースコードでは相対ディレクトリでプロジェクトディレクトリの直上に配置しています。

```python main.py
load_dotenv('../.env')
SECRET_KEY = os.environ["SECRET_KEY"]
API_TOKEN = os.environ["API_TOKEN"]
UUID = os.environ["UUID"]
ANDROIDO = os.environ["ANDROIDO"].encode()
SUICA = os.environ["SUICA"].encode()
```

まずは`MySesame3`クラスを定義します。

`MySesame3`はコンストラクタにて冒頭で読み込んだ環境変数を格納しています。暗号化する際に`timestamp`が必要となるため、`sign`（署名）のみ空にしています。また、先ほどビルドすることによって生成された`export.so`ファイルを読み込んでいます。メソッドとして`SECRET_KEY`の暗号化`encryptmyKey`、および施錠と解錠`lockOrunlock`を持っています。

```python main.py
class MySesame3:
    '''docstring
    ・セサミ3のクラス、libはGoでビルドしたバイナリファイルを読み込んでいる
    ・API_TOKENはこちら(https://dash.candyhouse.co/login)で取得する
    ・UUIDはアプリに記載されている対象のセサミ3のUUID
    ・SECRET_KEYはアプリを立ち上げて「鍵のシェア（オーナー）」で生成されるQRコードを読み込んで得られる文字列
    ・施錠/解錠の際はSECRET_KEYとタイムスタンプをAES-CMACによって暗号化する必要がある(encryptmyKey)
    ・作成した暗号キーをsignとしてAPI_TOKEN,UUIDとともにPOSTすることで施錠解錠ができる(lockOrunlock)
    ・現在の鍵の状態(施錠中/解除中)はgolang側で判断する
    ・施錠中であれば解錠コマンドを、解錠中であれば施錠コマンドを打ち込む
    '''
    def __init__(self):
        self.lib = cdll.LoadLibrary("./export/export.so")
        self.key = SECRET_KEY
        self.api = API_TOKEN
        self.uuid = UUID
        self.sign = ""

    def encyptmyKey(self):
        timestamp = int(datetime.datetime.now().timestamp()).to_bytes(4, 'little', signed=False)[1:4]
        cmac = CMAC.new(bytes.fromhex(self.key), ciphermod=AES)
        cmac.update(timestamp)
        self.sign =  cmac.hexdigest()

    def lockOrunlock(self):
        self.lib.executeSesame3.restype=c_char_p
        self.lib.executeSesame3(self.sign.encode('utf-8'),self.api.encode('utf-8'),self.uuid.encode('utf-8'))
```

次に一度`main.py`からは離れて、カードリーダーのクラスを定義します。こちらは別ファイル`nfcreader.py`にコーディングします。`nfcreader.py`をコーディングするにあたって[こちら](https://qiita.com/LinaNfinE/items/945a795e53427e768e47)の方の記事を参考にしました。

```python nfcreader.py
import nfc
import binascii

class CardReader():
    '''docstring
    ・カードリーダークラス
    '''
    def __init__(self):
        self.idm = 0
    def on_startup(self,targets):
        for target in targets:
            target.sensef_req = bytearray.fromhex("0000030000")
        return targets
    def on_connect(self,tag):
        print("Detected!!")
        self.idm = binascii.hexlify(tag.idm)

    def read_id(self):
        clf = nfc.ContactlessFrontend('usb')
        print("Waiting Felica...")
        clf.connect(rdwr = {'targets':['212F'],'on-startup':self.on_startup,'on-connect':self.on_connect})
        print(str(self.idm))
        clf.close()
```

`main.py`の本体を記述します。

先ほど定義したクラス、およびカードリーダーのクラスを使用します。

構成としては「`Mysesame3`および`CardReader`インスタンス生成」→「`CardReader`インスタンスに格納されたIDmを取得」→「受信を検知したらスピーカーから音で通知」→「環境変数に登録したIDmを参照」→「一致したら施錠/解錠リクエストを送信」といった流れになっています。スピーカーの音源は`notify.wav`という名前で同`main.py`と同階層に配置しています。

```python main.py
def ismyID(id):
    return bool(id==ANDROIDO or id ==SUICA)

if __name__ == '__main__':
     # セサミ3インスタンスの作成
     mySesame3 = MySesame3()
     try:
        while True:
            # nfcpyによるNFC入力待機
            myreader = CardReader()
            myreader.read_id()
            detectedID = myreader.idm
            # NFCの入力を検知したらスピーカーから通知音を出す
            subprocess.call("aplay notify.wav" ,shell=True)
            if ismyID(detectedID):
                # secret_keyを暗号化
                mySesame3.encyptmyKey()
                # 施錠と解錠の実行
                mySesame3.lockOrunlock()
                detectedID = 0
            sleep(2)

     except KeyboardInterrupt:
        print("KeyboardInterrupt!!")
```

## 6. スピーカーから音を出す

最後にラズパイから音を出すためにスピーカーを取り付けます。高価なスピーカーはもったいないのでこちらはアンプを取り付けて自作します。スピーカーの取り付けは[こちら](https://karaage.hatenadiary.jp/entry/RPi-Speaker)の記事を参考にしました。

## 7. 取り付け

スピーカーを取り付けたらとりあえず、新聞受けに投げ入れます。玄関まで電源コードを延長するのが大変でしたが、[こちら](https://www.amazon.co.jp/gp/product/B019O0JS7C)の延長コードでどうにか電源供給できました。

<img src="/images/2021/20210824a/DSC_0482.JPG" alt="玄関に設置の様子" width="1200" height="676" loading="lazy">

カードリーダーはコクヨの[マグネットプレート](https://www.amazon.co.jp/dp/B0012R6M52)を使って取り付けました。

<img src="/images/2021/20210824a/DSC_0000_BURST20210822170307504.JPG" alt="カードリーダー設置の様子" width="1200" height="676" loading="lazy">

## 8. 動作確認

動作確認の結果です。待機`Waiting Felica...`から検知`Detected!!`→`Lock command was executed.`と正しく動作していることがわかります。

<img src="/images/2021/20210824a/demo.png" alt="デモ" width="1200" height="234" loading="lazy">

こちらは施錠時のスマホの通知画面です。`export.go`に定義した文字列`by Felica`が正しく表示されています。

<img src="/images/2021/20210824a/screenshot.png" alt="スマホ通知画面" width="1200" height="663" loading="lazy">

## 9. まとめ

Sesame3のWeb APIを利用して、Felicaによる施錠解錠の機能を実装しました。

今回認証に使用したIDmはスマホアプリでも簡単に取得できます。そのため、IDm単体に認証を任せてしまうのはセキュリティの観点から適切ではありません。実用に耐えうるにはさらなる工夫が求められます。とはいえ、GoとPythonを使って楽しみながらコーディングできたため、夏休みの自由研究の目的は達成できたと思います。

次は大野さんによる[最高の持ち歩きキーボード考](https://future-architect.github.io/articles/2021082)です。
