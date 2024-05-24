---
title: "Wiresharkで通信プロトコルを見る"
date: 2021/08/23 00:00:01
postid: b
tag:
  - Wireshark
  - Network
  - 初心者向け
  - TCP/IP
category:
  - Infrastructure
thumbnail: /images/20210823b/thumbnail.png
author: 棚井龍之介
lede: "夏の自由研究ブログ連載2021の第1投稿として、Wiresharkで実際に流れるパケットを観察し、通信プロトコルの動きを見てみました。"
---

# はじめに
TIGの棚井龍之介です。

[夏の自由研究ブログ連載2021](/articles/20210823a/)の第1投稿として、Wiresharkで実際に流れるパケットを観察し、通信プロトコルの動きを見てみました。

## 本記事の目標

コンピュータはネットワークを通じて他のコンピュータと通信しています。

みなさんが利用する業務用PCも、いっときも目が離せないiPhoneも、Apple Watchでさえも、ネットワークを通じてデータのやり取りをしています。パソコンとスマートウォッチというように明らかに見た感じが異なるデバイスであっても、どちらもWi-Fiを設定すればインターネットと通信できるのは、**共通のルール**のもとネットワークを介して通信しているからです。この共通ルールのことを**通信プロトコル**と呼びます。

本記事では、基本的な通信プロトコルの中身を見ていくことにより

- 通信プロトコルのやり取りがイメージできる
- IPアドレス、MACアドレスの利用場面がわかる
- ネットワーク分野への誘いになる

ことを目標としています。

# TCP/IPモデル
インターネットの多くは、**TCP/IPプロトコル**によって通信しています。

Twitterで投稿するとき、YouTubeを見るときも、その裏側ではコンピュータがTCP/IPに沿った通信を行っています。この通信は「利用者が意識しないで済む」ことを念頭に設計されています。そのため、TCP/IPで何らかの問題が生じた場合、利用者の認知は「ネットにつながらない」です。

あるコンピュータ(PC)から別のコンピュータ(Server)に通信するとき、以下のようなやりとりが発生しています。

<img src="/images/20210823b/Screen_Shot_2021-08-23_at_3.37.34.png" alt="" width="" height="" loading="lazy">

人間が会話するのと同様に

- PC:「明日の東京の天気は?」
- Server:「晴れです。」

とやり取りしているだけです。

この通信にて、TCP/IPは裏側で以下のようなことをやっています。

PC→Server

<img src="/images/20210823b/Screen_Shot_2021-08-23_at_4.00.52.png" alt="" width="" height="" loading="lazy">

PC←Server

<img src="/images/20210823b/Screen_Shot_2021-08-23_at_4.09.34.png" alt="" width="" height="" loading="lazy">

通信したいデータに対して、カプセル化を繰り返しながら情報を追加していき、符号化してデータを送る。受け手側ではその逆の順序で情報を外していき、最終的に送信元のデータを取得する。各層には独自の役割があり、それぞれがうまく機能することでコンピュータ同士は通信しています。よくある「ネットにつながない」現象は、これらの層のどこかで問題が生じている、ということになります。

コンピュータ同士がやり取りするデータはネットワークを介しているため、ネットワーク自体を覗き見ることで、「やり取りしているデータ自体」を見ることができます。このデータを見る作業を**パケットキャプチャ**といいます。

# Wiresharkでパケットキャプチャ
パケットキャプチャのために、OSS(Open Source Software)の[Wireshark](https://www.wireshark.org/)を使います。

パケットキャプチャツールは、キャプチャ実行端末のNIC(Network Interface Card)を通信傍受することで、端末の送受信する通信データを取得するものです。

Wiresharkを起動するとキャプチャするNICの選択画面が表示されるので、インターフェース表示を無線にして「Wi-Fi」を選択すれば、無線で送受信されるパケットが見れます。

<img src="/images/20210823b/1_wifi_en0.png" alt="" width="" height="" loading="lazy">

パケットを見る機会などほとんどないので、しばらく見続けてみましょう。

`TCP`や`192.168.1.1`など、なんとなく見覚えのある情報もあれば、正体不明のIPも見つかると思います。Wiresharkで続々と表示されるレコードは、全てパソコンで送受信しているデータです。実際に見てみると、想像していたよりも沢山のやり取りをしていませんか?

それでは、WiresharkでTCP/IPでの代表的な3つの通信プロトコルを見ていきます。

- データリンク層
    - ARP
- ネットワーク層
    - ICMP
- トランスポート層
    - TCP

アプリケーション層の内容はWiresharkのみでは扱いきれない場面が多いため、本記事では取り扱っていません。

# データリンク層
IPアドレスとMacアドレスの対応表を作成する`ARP`の通信を見ていきます。ARPはブロードキャスト通信の「ARP Request」とユニキャスト通信「ARP Reply」により実現されます。

Wiresharkは表示レコードを制限できるので、表示条件を`arp`にしてしばらく待つとルータからのARP通信をキャッチできます。

<img src="/images/20210823b/2_arp_1.png" alt="" width="" height="" loading="lazy">

今回キャッチした内容は以下です。

<img src="/images/20210823b/2_arp_2.png" alt="" width="" height="" loading="lazy">

- Source
    - MAC: Buffalo_(UAA)
    - IP: 192.168.11.1
- Destination
    - MAC: 00:00:00_00:00:00
    - IP: 192.168.11.7
- ARP Request
- Info
    - Who has 192.168.11.7? Tell 192.168.11.1

<img src="/images/20210823b/2_apr_3.png" alt="" width="" height="" loading="lazy">

- Source
    - MAC: Apple_(UAA)
    - IP: 192.168.11.7
- Destination
    - MAC: Buffalo_(UAA)
    - IP: 192.168.11.1
- ARP Reply
- Info
    - 192.168.11.7 is at Apple_(UAA)

Infoをみると、ルータとPCが会話していることが分かります。

- ルータ: 192.168.11.7を持っている方、Macアドレスを私に教えてください。
- PC: 私が192.168.11.7です。MacアドレスはApple_(UAA)です。

ARPはIPアドレスとMacアドレスの対応表を作成するプロトコルなので、上記会話にて「ルータのARPテーブルに、192.168.11.7に紐づくMacアドレスはApple_(UAA)」と登録されたようです。

# ネットワーク層
トラブルシュートでお馴染みのpingを見ていきます。pingは`ICMP`プロトコルを用いたネットワーク監視の王道ツールです。ICMPは「Echo Request」と「Echo Reply」により会話します。

ネットワークの障害切り分けでは、pingに対してEcho Replyが

- 返ってくる: ネットワーク層より上の層(トランスポート層、アプリケーション層)に問題あり
- 返ってこない: ネットワーク層より下の層(データリンク層、物理層)に問題あり

と疎通問題を切り分けられます。

作業PC(192.168.11.7)から、ルータ(192.168.11.1)に向けて、pingを打ってみます。

```bash
$  ping -t 5 192.168.11.1
PING 192.168.11.1 (192.168.11.1): 56 data bytes
64 bytes from 192.168.11.1: icmp_seq=0 ttl=64 time=8.456 ms
64 bytes from 192.168.11.1: icmp_seq=1 ttl=64 time=8.293 ms
64 bytes from 192.168.11.1: icmp_seq=2 ttl=64 time=8.138 ms
64 bytes from 192.168.11.1: icmp_seq=3 ttl=64 time=8.310 ms
64 bytes from 192.168.11.1: icmp_seq=4 ttl=64 time=7.234 ms

--- 192.168.11.1 ping statistics ---
5 packets transmitted, 5 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 7.234/8.086/8.456/0.438 ms
```

このとき、Wiresharkでは5つの通信全てをキャッチしています。
`icmp`で表示を絞り込むと...

<img src="/images/20210823b/3_icmp_1.png" alt="" width="" height="" loading="lazy">

各通信ごとに「Echo (ping) Request」と「Echo (ping) Reply」を送り合っていることが分かります。

Echo (ping) Request

<img src="/images/20210823b/3_icmp_2.png" alt="" width="" height="" loading="lazy">

Echo (ping) Reply

<img src="/images/20210823b/3_icmp_3.png" alt="" width="" height="" loading="lazy">

ネットワーク疎通確認のとき、ping単体だと通信がイメージできないならば、裏でWiresharkを起動すると理解が進むかもしれません。その場合、デフォルトのWiresharkはNICを通過する全パケットを取得&表示してしまうため、メモリ負荷を下げるために「キャプチャフィルタ」や「表示フィルタ」の利用がオススメです。

# トランスポート層
トランスポート層はTCP(Transmission Control Protocol)とUDP(User Datagram Protocol)の2つがメインです。今回は`TCP`側での、通信の開始と終了を見ていきます。

TCPは通信の信頼性を保証するため、その開始と終了タイミングで特徴的なデータのやり取りを実施しています。

- 開始
    - 3ウェイハンドシェイク
        - 相互に通信を開始する
    - 通信内容
        1. SYN
        2. SYN + ACK
        3. ACK
- 終了
    - コネクションの切断
        - 各自で通信を終了する
    - 通信内容
        1. FIN + ACK
        2. ACK
        3. FIN + ACK
        4. ACK

Wiresharkには、TCP通信の開始からコネクションの終了までをグルーピングしてくれる`StreamID`という識別子があります。これ利用して、あるTCP通信が始まってから終わるまでの流れを見ていきます。

開始・終了

<img src="/images/20210823b/4_tpc_3.png" alt="" width="" height="" loading="lazy">

開始のSYN+ACKと、終了のFIN+ACKがキャッチできました。

本ブログ執筆まで、「コネクション切断」の通信は「FIN→ACK→FIN→ACK」パターンだと理解していたのですが、Wireshackでのキャプチャで「**FIN/ACK→ACK→FIN/ACK→ACK**」と表示されて、自分の理解が間違っていたことに気づきました。

ネットで検索したところ、日本語で分かりやすい記事が見つかったので、URLを添付します。

[FIN -> FIN/ACK -> ACK という TCP の幻想](https://kawasin73.hatenablog.com/entry/2019/08/31/153809)

要するに、TCP通信が開始された(3ウェイハンドシェイクが完了してESTABLISHED状態になった)相手との通信では、基本的に`ACK`を付与しなければならない、ということです。コネクション終了時は`FIN`ではなく、`FIN/ACK`が正解です。

ネットワークは教科書的な理解よりも「実際の運用で、ちゃんと疎通させられる知識」の方が重要です。Wiresharkでリアルなパケットを見て「知識と実挙動の対応を確認する」ことの重要性を改めて実感しました。

パケットの詳細を確認すると、行列のような形で SYN・ACK・FIN が表現されていることが分かります。

SYN

<img src="/images/20210823b/5_syn.png" alt="" width="" height="" loading="lazy">

SYN・ACK

<img src="/images/20210823b/5_syn_ack.png" alt="" width="" height="" loading="lazy">

FIN・ACK

<img src="/images/20210823b/5_fin_ack.png" alt="" width="" height="" loading="lazy">

ACK
<img src="/images/20210823b/5_ack.png" alt="" width="" height="" loading="lazy">

Wiresharkでパケットをしばらく監視していると、通信失敗やリトライ時の挙動が見れるので、「Wiresharkを眺める→新しい情報を見つける→ネットで調べる」を繰り返せば、色々な生きた知識が身についていきます。

# おわりに
Wiresharkを利用して、代表的なネットワーク通信プロトコルの「ARP, ICMP, TCP」の中身を見てきました。

各種通信プロトコルを「知識としては知っている」で終わらせずに、パケットキャプチャツールでインターセプトして「実際にどのように通信しているかイメージできる」まで体得すれば、ネットワーク系の問題が発生したときに、より正確に問題の切り分けができると思います。

アプリケーションと異なり、ネットワークは「見えない」が勉強の壁になりがちです。今回ご紹介した「Wiresharkでの可視化」を導入することで、ネットワーク分野への参入障壁が下がればいいなと思います。
