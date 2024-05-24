---
title: "AWS内の通信がインターネットを経由しない今、VPC Endpointを利用する意味はあるのか？"
date: 2021/06/18 00:00:00
postid: a
tag:
  - AWS
  - Network
  - VPC
  - 技術選定
category:
  - Infrastructure
thumbnail: /images/20210618a/thumbnail.png
author: 村瀬善則
lede: "AWS内の通信においてインターネットを経由しないことが最近になって公式ドキュメントに明記されたことを受け、改めてVPC Endpointの必要性について調べてみました。"
---

# はじめに
こんにちは。TIG村瀬です。

タイトルの通りですがAWS内の通信においてインターネットを経由しないことが最近になって公式ドキュメントに明記されたことを受け、改めてVPC Endpointの必要性について調べてみました。

> Q:2 つのインスタンスがパブリック IP アドレスを使用して通信する場合、またはインスタンスが AWS のサービスのパブリックエンドポイントと通信する場合、トラフィックはインターネットを経由しますか?
>
> いいえ。パブリックアドレススペースを使用する場合、AWS でホストされているインスタンスとサービス間のすべての通信は AWS のプライベートネットワークを使用します。
> AWS ネットワークから発信され、AWS ネットワーク上の送信先を持つパケットは、AWS 中国リージョンとの間のトラフィックを除いて、AWS グローバルネットワークにとどまります。
>
> [https://aws.amazon.com/jp/vpc/faqs/](https://aws.amazon.com/jp/vpc/faqs/)　より引用

ちなみにこちらのツイートきっかけで知りました。ありがとうございます！

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">これがプライベートネットワークの通信と明示された意味は大きい<br><br>『Q:2つのインスタンスがパブリック IP アドレスを使用して通信する場合、またはインスタンスが AWS のサービスのパブリックエンドポイントと通信する場合、トラフィックはインターネットを経由しますか?』<a href="https://t.co/uy26KyCZKn">https://t.co/uy26KyCZKn</a></p>&mdash; Takuro SASAKI (@dkfj) <a href="https://twitter.com/dkfj/status/1385182566160891909?ref_src=twsrc%5Etfw">April 22, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


# VPC Endpointとは
こちらもAWSの公式サイトから抜粋


> PrivateLink を使用してサポートされている AWS のサービスや VPC エンドポイントサービスに VPC をプライベートに接続できます。
> インターネットゲートウェイ、NAT デバイス、VPN 接続、または AWS Direct Connect 接続は必要ありません。
> VPC のインスタンスは、サービスのリソースと通信するためにパブリック IP アドレスを必要としません。
> VPC と他のサービス間のトラフィックは、Amazon ネットワークを離れません。詳細については、「AWS PrivateLink および VPC エンドポイント」を参照してください。
>
> [https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/what-is-amazon-vpc.html](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/what-is-amazon-vpc.html)　より引用


多少語弊があるかもしれませんが、一言で言うならばVPC内からVPC外に存在するAWSサービスにインターネットを経由せずに接続できる仕組みです。

# 疑問
以前はセキュリティを考慮しインターネットを経由しないようにするにはVPC Endpointが必須でしたが、今はVPC Endpointを利用しなくともインターネットを経由しない通信が可能です。

はたして今でもVPC Endpointを利用するメリットはあるのでしょうか？ケース別に確認してみます。

# 確認
## ケース1 NAT Gatewayが存在せずprivate subnetからAWSのサービスに接続する場合
この場合は明らかでNAT Gatewayを用意せずともprivate subnetからAWSのサービスに接続するためにVPC Endpointは必要ですね。 (NAT Gatewayが存在しないケースはあまりないと思いますが)

## ケース2 NAT Gatewayが存在する場合
この場合のメリットは何なのでしょうか？すぐにわからなかったのでコストの面で確認してみます。

|  サービス  |コスト種別 |  コスト($/h)  |
| ---- | ---- |----: |
| NAT Gateway   | NAT Gatewayあたりの料金| 0.062  |
| NAT Gateway   | 処理データ1GBあたりの料金| 0.062 |
|  VPC Endpoint(ゲートウェイ型)  | - | 0.0 |
|  VPC Endpoint(インターフェイス型)  |VPC エンドポイント1つあたりの料金 | 0.014  |
|  VPC Endpoint(インターフェイス型)  |処理データ1GBあたりの料金 | 0.0035 |

※Tokyoリージョンにおけるコスト

コストを明確にしたことで理解できました。NAT Gatewayの処理データと比較するとVPC Endpointの処理データコストの方が桁違いに安いです。

VPC Endpoint(ゲートウェイ型)に関しては、なんと無料！

マルチAZで2つのAZを利用し、1GB,100GB,1TB,10TB/月の通信をする場合の試算をしてみます。

|  サービス  |計算式 |  1GBコスト($/month)  | 100GBコスト($/month)  | 1TBコスト($/month)  | 10TBコスト($/month)  |
| ---- | ---- |----: |----: |----: |----: |
| NAT Gatewayのみ   | 0.062 * 24 * 31 * 2 + 0.062 * n | 92.32  |98.46  |154.26  |712.26  |
| NAT Gateway + VPC Endpoint(インターフェイス型)  |0.062 * 24 * 31 * 2 + 0.014 * 24 * 31 * 2 + 0.0035 * n  | 113.09  | 113.44  | 116.59  | 148.09  |
| NAT Gateway + VPC Endpoint(ゲートウェイ型)  | 0.062 * 24 * 31 * 2 + 0 * n  | 92.26 |92.26 |92.26 |92.26 |

<img src="/images/20210618a/vpcendpoint.png" alt="通信費用の資産" loading="lazy">


通信量が少ないとインターフェイス自体の料金が掛かる分、メリットが無いですが通信量が増えれば増えるほどVPC Endpointのありがたみが実感できますね！


# まとめ
VPC Endpointを利用せずともAWSサービスとのインターネットを経由しない通信は可能です。

VPC Endpoint(ゲートウェイ型)については導入の手間を考慮しなければコストは掛からないのでデータ量によらず導入した方がお得です。

少量の通信であればVPC Endpoint(インターフェイス型)を利用してもコスト面においてメリットはありません(むしろ割高)が通信量が多いシステムであればあるほどコストメリットを感じられます。

万能なアーキテクチャは存在しないのでデータ量に応じてVPC Endpointの導入を検討すると良いかと思います。



