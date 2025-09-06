---
title: "SORACOM USBドングルの自動接続"
date: 2019/12/01 12:02:03
postid: ""
tag:
  - Ruby
  - Selenium
category:
  - IoT
thumbnail: /images/2019/20191201/thumbnail.png
author: 棚井龍之介
lede: "自動化できる業務ならば極力自動化したいというのは万国共通だとは思いますが、例えばWebページであれば Selenium によるUI操作自動化が可能です。しかし、PCにインストールされたGUIアプリには、Webページの「idタグ」に相当するものがなく、UIの自動化は難しいと考えていました。今回、業務で利用しているWindowsのGUIアプリを「マウスで手動クリック」から「コードで自動操作」に切り替える機会があったので、そのときの試行錯誤を紹介します"
---

[フューチャー2 Advent Calendar 2019](https://qiita.com/advent-calendar/2019/future2) の1日目の記事です。

## はじめに

自動化できる業務ならば極力自動化したいというのは万国共通だとは思います。例えば対象がWebページであれば Selenium によるUI操作自動化が可能ですが、PCにインストールされたGUIアプリに対しては、Webページの「idタグ」に相当するものがなく、UIの自動化は簡単にはできないと考えている方が多いのではないでしょうか。

このWindowsにインストールされたGUIアプリを「マウスで手動クリック」から「コードで自動操作」に切り替える仕事が業務でありましたので、その手法について紹介します。

## 無人化要求

技術的な可否に関わらず、ニュース等で最新のテクノロジー知識を仕入れた人ならば、「無人化したい/自動化したい」という要求が当然出てきます。それらの試みは技術的に面白いものが多く、エンジニア的には「解決しがいのある課題」だと感じます。

ただし、「無人化したい/自動化したい」案件では、「無人化/自動化を行うプログラムのメンテナンスを行うという、新しい業務が生まれてしまう」ことがあります。
開発側から見れば「全体から見ると総作業量は効率化されるのだから、この新しい作業にはお客様側で担当者をアサインしてほしい」となりますが、お客様側から見ると「既存の業務プロセスに新しい業務を追加することは難しい。可能な限り自動化してほしい」という回答となります。

この場合、エンジニアは...

1. 「申し訳ありません。不可能です」と頭を下げる。
2. なんとか解決策を見つけて「課題は解決しました。本件はクローズします」と報告する。

...のどちらかだと思います。
幸いにも、私が担当したタスクでは「2」で対応できましたので、その際の試みを紹介します。

## 工場とクラウドを接続したい。

あらゆる現場、例えば工場などではIoT化の波があり、あらゆる機器をクラウドとつなげたいニーズがあります。そのようなケースでは、「どのように工場とクラウドをつなぐのか」が鍵となります。というわけで、今回は工場を例にとって紹介します。

### 工場とクラウドを阻む最大の壁

<img src="/images/2019/20191201/products_ux302nc-r.png" class="img-middle-size" loading="lazy">

工場現場の機器とインターネットを直接繋ぐのはセキュリティ上よろしくないので、例えば「工場→踏み台PC→クラウド」という構成が考えられます。また、新たに物理的なケーブルを用意するのも大変なので、踏み台PC→クラウドは SORACOM社の提供する USB wi-fi Network Adapter 「NCXX UX302NC-R」という製品を利用してみました。

NCXX UX302NC-Rとは？
> LTE/3G/GSM 対応 USB スティック型データ通信端末です。
> デバイスへセットすることで、SORACOM の提供する通信環境を利用した無線通信が可能となります。
> [参照サイト](https://soracom.jp/products/module/ux302nc-r/)

工場とクラウドを繋ぐ「接続の窓口」として SORACOM USBドングル（NCXX UX302NC-R）を設置したのですが、そのアプリが接続における壁となってしまいました。

SORACOM USBドングルは、デバイスにセットした段階ではインターネットに接続されず、専用のGUIアプリを立ち上げて「**マウスで接続ボタンをクリックする**」ことでネットに繋がる仕様でした。

CLI経由による操作は見当たらず、カスタマーセンターに電話で問い合わせても...
「**コマンド等による操作は想定しておりません。**Connection Manager（SORACOM USBドングル専用のGUIアプリ）を立ち上げ、接続ボタンをクリックしていただけると幸いです」
...という丁寧な忠告をいただきました。

つまり、このままでは停電対応などでPCを再起動させるたびに、マウスを手動でクリックするという業務をお客様にお願いする必要がありました。「絶対にその業務はお客様に忘れられるのではないか？ むしろ忘れられる自信がある！」ということで、自動化を試みるモチベーションが生まれました。

## マウスによるクリックを自動化する

WindowsのGUIアプリの操作自動化と言っても大げさなものではなく、

1. アプリを立ち上げる
2. 任意の文字列を入力する
3. 任意のボタンをクリックする

...といった程度です。

### 作業環境/利用ツール

- Windows 10
- Ruby 2.5.x
- `selenium-webdriver` 3.142.6
- `appium_lib` 10.4.1
- WinAppDriver 1.2
- Inspect.exe

### Ruby側の準備

Gemによるパッケージのインストールと、Ruby設定ファイルの一部を編集をしてください。

Gemによるインストールコマンド

```sh
gem install selenium-webdriver -v 3.142.6
gem install appium_lib -v 10.4.1
```

Ruby設定ファイルの編集:

`eventmachine.rb` を開き、以下の1文を追加してください。
（筆者の環境では以下のパスにありました）。
`C:¥Ruby25-x64¥lib¥ruby¥gems¥2.5.0gems¥eventmachine-1.2.7-x64-mingw32¥lib¥eventmachine.rb`

```ruby:eventmachine.rb
require 'em/pure_ruby'
```

### Windows側の準備

WinAppDriverというドライバと、Inspect.exe というアプリをインストールしてください。

- WinAppDriver ([Microsoftの公式リリース](https://github.com/microsoft/WinAppDriver))
- Inspect.exe ([Microsoftの公式リリース](https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk)) ※Windows 10 SDK に Inspect.exe が含まれています

また、WinAppDriver を起動するために、PCを「開発者モード」に変更してください。

以上により、Ruby・Windowsの事前準備が完了です。
ここまで長かったですが、これからGUI操作を自動化するコーディングを開始します。

### 自動操作の環境整備

まずは、自動化したいアプリへの絶対パスを取得しましょう。
今回は「SORACOM USBドングル」を自動操作するので、そのGUIアプリまでの絶対パスを記載します。
（自動操作したいアプリに合わせて、適宜パスを書き換えてください）

```ruby connect.rb
app_path = 'C:/Program Files (x86)/UX302NC Data Connection Manager/Main/USB Modem.exe'
```

また、自動操作は WinAppDriver が担当するので、その起動スクリプトも書いてしまいましょう。

```ruby connect.rb
start_driver_cmd = 'start "" "C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe" 127.0.0.1 4723/wd/hub'
system(start_driver_cmd)
```

次は「ボタンをクリックする」を自動化するために、GUIアプリの「ボタンの要素」を取得します。Webページならば「デベロッパーツール」を使えば ページ内要素のidタグが取得できますが、Windows GUIアプリでは「Inspect.exe」を使います。

自動操作したいGUIアプリと Inspect.exe を立ち上げ、カーソルをボタン等の上にホバーすれば、その要素名が取得できます。

ex) SORACOM USBドングルの「接続」ボタンの場合
接続ボタンの名前は「接続」だとわかります。それ以外にも IsEnabled（ボタンが押せるか）が true になっていることもわかります。
<img src="/images/2019/20191201/photo_20191201_01.png" loading="lazy">

### 実装コード

以上の作業により

- ドライバの起動コマンド
- GUIアプリへのパス
- GUIアプリ内要素の名前

が準備できたので、GUI操作を自動化するコードを書きます。

```ruby connect.rb
require 'selenium-webdriver'
require 'appium_lib'
require 'rubygems'

# ドライバの起動コマンド
start_driver_cmd = 'start "" "C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe" 127.0.0.1 4723/wd/hub'

# GUIアプリへの絶対パス
app_path = 'C:/Program Files (x86)/UX302NC Data Connection Manager/Main/USB Modem.exe'

$ConnectorSession
def start()
    opts =
    {
        caps:
        {
            platformName: "WINDOWS",
            platform: "WINDOWS",
            deviceName: "WindowsPC",
            app: app_path
        }
    }

    $ConnectorSession = Appium::Driver.new(opts, false).start_driver     # GUIアプリを起動する
    wait = Selenium::WebDriver::Wait.new :timeout => 120                 # GUIアプリからの応答を120秒まで待つ

    wait.until{ $ConnectorSession.find_element(:name, "接続").enabled? }  # "接続"ボタンの IsEnabled が true になるまで待つ
    $ConnectorSession.find_element(:name, "接続").click()
end


# ドライバを起動する
system(start_driver_cmd)

# GUIアプリを立ち上げ、自動操作を開始する
start()
```

## まとめ

今回の実装コードでは

1. アプリを立ち上げる
2. ボタンが押せるようになるのを待つ
3. ボタンを押す
という簡単な操作を自動化しました。

これまでは「UI操作の自動化はWebアプリでのみ可能」と思っていましたが、WinAppDriverとAppiumを使うことで「GUIアプリ操作の自動化も可能」だとわかりました。これにより私自身の「自動化スキルの裾野が広がったこと」は、今後増えるであろう「無人化したい/自動化したい」案件に向けても良い兆候だと感じています。

以上、長文にお付き合いいただき、ありがとうございました。
