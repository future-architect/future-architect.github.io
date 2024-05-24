---
title: "Terraform 1.4 Update:Private Service Connectを利用したbackend/gcsへのアクセス"
date: 2023/03/27 00:00:01
postid: b
tag:
  - GCP
  - Terraform
  - Terraform1.4
category:
  - Infrastructure
thumbnail: /images/20230327b/thumbnail.png
author: 渡邉光
lede: "Terraform 1.4.0のENHANCEMENTSで以下の機能が追加されました。backend/gcs: Add storage_custom_endpoint argument, to allow communication with the backend via a Private Service Connect endpoint. 内容はtfstateが保存されているGCSへのアクセスがインターネット経由ではなく.."
---
# 初めに

こんにちは！筋肉エンジニアのTIG渡邉です。[Terraform連載2023](/articles/20230327a/) の1リソース目の記事です。

Terraform 1.4.0の`ENHANCEMENTS`で以下の機能が追加されました。

>backend/gcs: Add storage_custom_endpoint argument, to allow communication with the backend via a Private Service Connect endpoint.

内容はtfstateが保存されているGCSへのアクセスがインターネット経由ではなく、Private Service Connectエンドポイントを利用したプライベートネットワーク経由でbackendに指定したGCSへアクセスすることができる機能です。今回はこの機能を検証します。

以下のリソースは構築済みとします。

- Google Cloud Project
- Network系リソース（VPC/Subnet/Cloud Nat/Cloud Router/Firewall）
- GCE
- GCS

# Private Service Connectを利用しない構成
Private Service Connectを利用しない構成はこちらです。

GCEにTerraformをインストールし、Terraform Serverとしています。Terraform Serverでterraform initを実行するとVPCに構築済みのCloud Nat/インターネット経由でGCSへアクセスされます。

この構成は皆さんお使いのいつもの構成だと思います。

<img src="/images/20230327b/architecture01.drawio.png" alt="" width="772" height="591" loading="lazy">


# Private Service Connectを利用した構成

Private Service Connectを利用した構成はこちらになります。

こちらもGCEにTerraformをインストールし、Terraform Serverとしています。Terraform Serverでterraform initを実行するとVPCに構築済みのCloud Nat/インターネットを経由するのではなく、Private Service Connect Endpoint(10.0.3.0)を経由してGCSへアクセスされます。

今回はこの構成を検証します。

<img src="/images/20230327b/architecture02.drawio.png" alt="architecture02.drawio.png" width="772" height="591" loading="lazy">


## Private Service Connectとは

Private Service Connectとは一言でいうと、Google Cloud API にプライベートネットワーク経由でアクセスするための機能になります。

詳しくはG-genの杉村さんの技術ブログがすごくわかりやすくまとまっているのでこちらを参照ください。

* https://blog.g-gen.co.jp/entry/google-api-private-service-connect-explained

## Private Service Connectの作成
以下公式ドキュメントを参考にPrivate Service Connectを作成します。

https://cloud.google.com/vpc/docs/configure-private-service-connect-apis?hl=ja#console_1

ネットワークサービス→Private Service Connectをクリックします。
Private Service Connectから「エンドポイントを接続」をクリックします。

<img src="/images/20230327b/image.png" alt="" width="1200" height="856" loading="lazy">

- 対象：すべてのGoogle API
- エンドポイント名：sampleendpoint
- ネットワーク：my-stg-environment01-vpc
- sample-endpoint-ip (10.0.3.0)
- リージョン：asia-northeast1
- 名前空間：自動割り当て済みのものを設定

を設定し、「エンドポイントを追加」をクリックします。

<img src="/images/20230327b/image_2.png" alt="" width="1200" height="847" loading="lazy">

するとPrivate Service Connectの接続エンドポイントが作成されます。

<img src="/images/20230327b/image_3.png" alt="" width="1200" height="855" loading="lazy">

Service Directoryも作成されています。

<img src="/images/20230327b/image_4.png" alt="" width="1200" height="851" loading="lazy">



限定公開DNSゾーンも作成されています。
<img src="/images/20230327b/image_5.png" alt="" width="1200" height="852" loading="lazy">

ここまででPrivate Service Connectの設定は完了です。

Private Service Connectエンドポイントが正しく機能しているかを確認するために、GCEへSSHしてcurlコマンドを実行してエンドポイントへアクセスします。

エンドポイントが機能している場合は、HTTP 204 レスポンス コードが表示されます。

```bash
xxxxxxxxxx@tky-bastion:~/terraform$ curl -v 10.0.3.0/generate_204
*   Trying 10.0.3.0:80...
* TCP_NODELAY set
* Connected to 10.0.3.0 (10.0.3.0) port 80 (#0)
> GET /generate_204 HTTP/1.1
> Host: 10.0.3.0
> User-Agent: curl/7.68.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 204 No Content　★204のレスポンスを確認
< Content-Length: 0
< Cross-Origin-Resource-Policy: cross-origin
< Date: Sat, 25 Mar 2023 05:02:30 GMT
<
* Connection #0 to host 10.0.3.0 left intact
```


## Terraform の設定

準備ができたのでTerraform 1.4.0の追加機能を検証していきます。
Terraform公式ドキュメント(1.4.0)のBackend/gcsにstorage_custom_endpointが追加されていることが確認できます。

https://developer.hashicorp.com/terraform/language/settings/backends/gcs

> storage_custom_endpoint / GOOGLE_BACKEND_STORAGE_CUSTOM_ENDPOINT / GOOGLE_STORAGE_CUSTOM_ENDPOINT - (Optional) A URL containing three parts: the protocol, the DNS name pointing to a Private Service Connect endpoint, and the path for the Cloud Storage API (/storage/v1/b, see here). You can either use a DNS name automatically made by the Service Directory or a custom DNS name made by you. For example, if you create an endpoint called xyz and want to use the automatically-created DNS name, you should set the field value as https://storage-xyz.p.googleapis.com/storage/v1/b. For help creating a Private Service Connect endpoint using Terraform, see this guide.

## Private Service Connect経由のGCSアクセス確認

### Terraform Backendの設定

backend.tfにterraform 1.4で追加された`storage_custom_endpoint`を追加してみます。

こちらの設定を追加することで、tfstateが保存されているbackendのGCSへのアクセスをPrivate Service Connectのエンドポイント経由にすることができます。
`https://storage-xyz.p.googleapis.com/storage/v1/b`をベースに値の置き換えをします。

- xyz→sampleendpoint（Private Service Connectのエンドポイント名）

```tf backend.tf
terraform {
  backend "gcs" {
    bucket                  = "xxxxxxxxxxxxxxxxx"
    prefix                  = "terraform/state"
    storage_custom_endpoint = "https://storage-sampleendpoint.p.googleapis.com/storage/v1/b" ★追加
  }
}
```

### tcpdumpを利用したPrivate Service Connect経由のGCSアクセス確認

tcpdumpを利用してPrivate Service Connectのエンドポイント(10.0.3.0)を経由してbackendのgcsへアクセスできていることを確認します。

コンソールを2つ開きます。

- terraform initを実行するコンソール
- tcpdumpを実行するコンソール

先にtcpdumpを実行するコンソールからtcpdumpコマンド`sudo tcpdump dst 10.0.3.0`を実行し、Private Service Connectのエンドポイント(10.0.3.0)を経由するパケットをキャプチャする準備をします。

tcpdumpコマンドを実行後に、terraform initを実行するコンソールからterraform initを実行するとPrivate Service Connectのエンドポイント(10.0.3.0)を経由するパケットがキャプチャされていることが確認できました。Private Service Connectのエンドポイント(10.0.3.0)を経由して無事GCSにアクセスできたようです。

```bash terraform init実行
xxxxxxxxxx@tky-bastion:~/terraform$ date && terraform init
Sat Mar 25 02:13:50 UTC 2023

Initializing the backend...

Initializing provider plugins...
- Reusing previous version of hashicorp/google from the dependency lock file
- Using previously-installed hashicorp/google v4.57.0

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

```bash tcpdumpの実行
xxxxxxxxxx@tky-bastion:~$ date && sudo tcpdump dst 10.0.3.0
Sat Mar 25 02:13:49 UTC 2023
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on ens4, link-type EN10MB (Ethernet), capture size 262144 bytes
02:13:50.920469 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [S], seq 665228907, win 65320, options [mss 1420,sackOK,TS val 3343093648 ecr 0,nop,wscale 7], length 0
02:13:50.921158 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 692049395, win 511, options [nop,nop,TS val 3343093649 ecr 2560562916], length 0
02:13:50.921387 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 0:305, ack 1, win 511, options [nop,nop,TS val 3343093649 ecr 2560562916], length 305
02:13:50.959772 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 7041, win 479, options [nop,nop,TS val 3343093687 ecr 2560562955], length 0
02:13:50.959781 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 9820, win 467, options [nop,nop,TS val 3343093687 ecr 2560562955], length 0
02:13:50.975543 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 305:369, ack 9820, win 501, options [nop,nop,TS val 3343093703 ecr 2560562955], length 64
02:13:50.975657 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 369:455, ack 9820, win 501, options [nop,nop,TS val 3343093703 ecr 2560562955], length 86
02:13:50.975798 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 9913, win 501, options [nop,nop,TS val 3343093703 ecr 2560562971], length 0
02:13:50.975857 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 455:1659, ack 9913, win 501, options [nop,nop,TS val 3343093703 ecr 2560562971], length 1204
02:13:50.976394 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 1659:1690, ack 9913, win 501, options [nop,nop,TS val 3343093704 ecr 2560562971], length 31
02:13:50.993635 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 11081, win 501, options [nop,nop,TS val 3343093721 ecr 2560562989], length 0
02:13:50.993983 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 11151, win 501, options [nop,nop,TS val 3343093722 ecr 2560562989], length 0
02:13:50.994012 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 1690:1729, ack 11151, win 501, options [nop,nop,TS val 3343093722 ecr 2560562989], length 39
02:13:51.194072 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 1729:1854, ack 11151, win 501, options [nop,nop,TS val 3343093922 ecr 2560562994], length 125
02:13:51.213234 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 11863, win 501, options [nop,nop,TS val 3343093941 ecr 2560563208], length 0
02:13:51.213423 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 1854:1893, ack 11863, win 501, options [nop,nop,TS val 3343093941 ecr 2560563208], length 39
02:13:51.213662 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 1893:2137, ack 11863, win 501, options [nop,nop,TS val 3343093941 ecr 2560563208], length 244
02:13:51.237109 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 12963, win 501, options [nop,nop,TS val 3343093965 ecr 2560563232], length 0
02:13:51.237265 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 2137:2176, ack 12963, win 501, options [nop,nop,TS val 3343093965 ecr 2560563232], length 39
02:13:51.237810 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 2176:2256, ack 12963, win 501, options [nop,nop,TS val 3343093965 ecr 2560563232], length 80
02:13:51.257360 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 13326, win 501, options [nop,nop,TS val 3343093985 ecr 2560563253], length 0
02:13:51.257569 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 13396, win 501, options [nop,nop,TS val 3343093985 ecr 2560563253], length 0
02:13:51.257665 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 2256:2295, ack 13396, win 501, options [nop,nop,TS val 3343093985 ecr 2560563253], length 39
02:13:51.257755 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 2295:2450, ack 13396, win 501, options [nop,nop,TS val 3343093985 ecr 2560563253], length 155
02:13:51.273998 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 14405, win 501, options [nop,nop,TS val 3343094002 ecr 2560563269], length 0
02:13:51.274108 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 14475, win 501, options [nop,nop,TS val 3343094002 ecr 2560563269], length 0
02:13:51.274127 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [P.], seq 2450:2489, ack 14475, win 501, options [nop,nop,TS val 3343094002 ecr 2560563269], length 39
02:13:51.707967 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [F.], seq 2489, ack 14475, win 501, options [nop,nop,TS val 3343094436 ecr 2560563274], length 0
02:13:51.708100 IP tky-bastion.asia-northeast1-c.c.xxxxxxxxxxxxx.internal.44474 > 10.0.3.0.https: Flags [.], ack 14476, win 501, options [nop,nop,TS val 3343094436 ecr 2560563703], length 0
```

また、nslookupコマンドでbackend.tfのstorage_custom_endpointに設定している`storage-sampleendpoint.p.googleapis.com`を指定して実行すると10.0.3.0で名前解決されることも確認できました。

```sh
xxxxxxxxxx@tky-bastion:~/terraform$ nslookup storage-sampleendpoint.p.googleapis.com
Server:         127.0.0.53
Address:        127.0.0.53#53

Non-authoritative answer:
Name:   storage-sampleendpoint.p.googleapis.com
Address: 10.0.3.0
```

# 余談

余談ですが、`tcpdump -n -vv dst port 443`コマンドを実行してterraform initを実施し、GCEから443ポートへアクセスしたパケットをキャプチャしてみました。

```bash tcpdump -n -vv dst port 443コマンド実行結果
xxxxxxxxxx@tky-bastion:~/terraform$ sudo tcpdump -n -vv dst port 443
tcpdump: listening on ens4, link-type EN10MB (Ethernet), capture size 262144 bytes
05:14:59.618319 IP (tos 0x0, ttl 64, id 11848, offset 0, flags [DF], proto TCP (6), length 60)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [S], cksum 0x1730 (incorrect -> 0xad7d), seq 1890652633, win 65320, options [mss 1420,sackOK,TS val 3353962346 ecr 0,nop,wscale 7], length 0
05:14:59.618778 IP (tos 0x0, ttl 64, id 11849, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x3d3b), seq 1890652634, ack 3216389491, win 511, options [nop,nop,TS val 3353962346 ecr 1133339465], length 0
05:14:59.619011 IP (tos 0x0, ttl 64, id 11850, offset 0, flags [DF], proto TCP (6), length 357)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x1859 (incorrect -> 0x80b7), seq 0:305, ack 1, win 511, options [nop,nop,TS val 3353962347 ecr 1133339465], length 305
05:14:59.655194 IP (tos 0x0, ttl 64, id 11851, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x2063), seq 305, ack 7041, win 477, options [nop,nop,TS val 3353962383 ecr 1133339501], length 0
05:14:59.655208 IP (tos 0x0, ttl 64, id 11852, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x1596), seq 305, ack 9822, win 461, options [nop,nop,TS val 3353962383 ecr 1133339501], length 0
05:14:59.671136 IP (tos 0x0, ttl 64, id 11853, offset 0, flags [DF], proto TCP (6), length 116)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x1768 (incorrect -> 0x3471), seq 305:369, ack 9822, win 501, options [nop,nop,TS val 3353962399 ecr 1133339501], length 64
05:14:59.671287 IP (tos 0x0, ttl 64, id 11854, offset 0, flags [DF], proto TCP (6), length 138)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x177e (incorrect -> 0x3286), seq 369:455, ack 9822, win 501, options [nop,nop,TS val 3353962399 ecr 1133339501], length 86
05:14:59.671463 IP (tos 0x0, ttl 64, id 11855, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x145b), seq 455, ack 9915, win 501, options [nop,nop,TS val 3353962399 ecr 1133339517], length 0
05:14:59.671615 IP (tos 0x0, ttl 64, id 11856, offset 0, flags [DF], proto TCP (6), length 1246)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x1bd2 (incorrect -> 0xb465), seq 455:1649, ack 9915, win 501, options [nop,nop,TS val 3353962399 ecr 1133339517], length 1194
05:14:59.671989 IP (tos 0x0, ttl 64, id 11857, offset 0, flags [DF], proto TCP (6), length 83)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x1747 (incorrect -> 0xfb7a), seq 1649:1680, ack 9915, win 501, options [nop,nop,TS val 3353962400 ecr 1133339517], length 31
05:14:59.695902 IP (tos 0x0, ttl 64, id 11858, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x0ab2), seq 1680, ack 11114, win 501, options [nop,nop,TS val 3353962423 ecr 1133339542], length 0
05:14:59.696324 IP (tos 0x0, ttl 64, id 11859, offset 0, flags [DF], proto TCP (6), length 91)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x174f (incorrect -> 0x000a), seq 1680:1719, ack 11153, win 501, options [nop,nop,TS val 3353962424 ecr 1133339542], length 39
05:14:59.896847 IP (tos 0x0, ttl 64, id 11860, offset 0, flags [DF], proto TCP (6), length 177)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x17a5 (incorrect -> 0x7c61), seq 1719:1844, ack 11153, win 501, options [nop,nop,TS val 3353962624 ecr 1133339548], length 125
05:14:59.919871 IP (tos 0x0, ttl 64, id 11861, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x0577), seq 1844, ack 11841, win 501, options [nop,nop,TS val 3353962647 ecr 1133339766], length 0
05:14:59.920025 IP (tos 0x0, ttl 64, id 11862, offset 0, flags [DF], proto TCP (6), length 91)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x174f (incorrect -> 0xf0a1), seq 1844:1883, ack 11841, win 501, options [nop,nop,TS val 3353962648 ecr 1133339766], length 39
05:14:59.920303 IP (tos 0x0, ttl 64, id 11863, offset 0, flags [DF], proto TCP (6), length 296)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x181c (incorrect -> 0x465c), seq 1883:2127, ack 11841, win 501, options [nop,nop,TS val 3353962648 ecr 1133339766], length 244
05:14:59.935230 IP (tos 0x0, ttl 64, id 11864, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0x001d), seq 2127, ack 12897, win 501, options [nop,nop,TS val 3353962663 ecr 1133339781], length 0
05:14:59.935406 IP (tos 0x0, ttl 64, id 11865, offset 0, flags [DF], proto TCP (6), length 91)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x174f (incorrect -> 0x01e6), seq 2127:2166, ack 12936, win 501, options [nop,nop,TS val 3353962663 ecr 1133339781], length 39
05:14:59.935919 IP (tos 0x0, ttl 64, id 11866, offset 0, flags [DF], proto TCP (6), length 133)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x1779 (incorrect -> 0x2c27), seq 2166:2247, ack 12936, win 501, options [nop,nop,TS val 3353962663 ecr 1133339781], length 81
05:14:59.959617 IP (tos 0x0, ttl 64, id 11867, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0xfde0), seq 2247, ack 13300, win 501, options [nop,nop,TS val 3353962687 ecr 1133339806], length 0
05:14:59.959735 IP (tos 0x0, ttl 64, id 11868, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0xfd9a), seq 2247, ack 13370, win 501, options [nop,nop,TS val 3353962687 ecr 1133339806], length 0
05:14:59.959759 IP (tos 0x0, ttl 64, id 11869, offset 0, flags [DF], proto TCP (6), length 91)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x174f (incorrect -> 0x5782), seq 2247:2286, ack 13370, win 501, options [nop,nop,TS val 3353962687 ecr 1133339806], length 39
05:14:59.959992 IP (tos 0x0, ttl 64, id 11870, offset 0, flags [DF], proto TCP (6), length 208)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x17c4 (incorrect -> 0x4db0), seq 2286:2442, ack 13370, win 501, options [nop,nop,TS val 3353962688 ecr 1133339806], length 156
05:14:59.975804 IP (tos 0x0, ttl 64, id 11871, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0xf8ac), seq 2442, ack 14405, win 501, options [nop,nop,TS val 3353962703 ecr 1133339822], length 0
05:14:59.975974 IP (tos 0x0, ttl 64, id 11872, offset 0, flags [DF], proto TCP (6), length 91)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [P.], cksum 0x174f (incorrect -> 0x1781), seq 2442:2481, ack 14444, win 501, options [nop,nop,TS val 3353962704 ecr 1133339822], length 39
05:14:59.990384 IP (tos 0x0, ttl 64, id 49768, offset 0, flags [DF], proto TCP (6), length 60)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [S], cksum 0xe6c8 (incorrect -> 0x3154), seq 804049769, win 65320, options [mss 1420,sackOK,TS val 118988064 ecr 0,nop,wscale 7], length 0
05:14:59.992174 IP (tos 0x0, ttl 64, id 49769, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x36cd), seq 804049770, ack 2881392399, win 511, options [nop,nop,TS val 118988066 ecr 3287754621], length 0
05:14:59.992465 IP (tos 0x0, ttl 64, id 49770, offset 0, flags [DF], proto TCP (6), length 339)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [P.], cksum 0xe7df (incorrect -> 0xcbaf), seq 0:287, ack 1, win 511, options [nop,nop,TS val 118988066 ecr 3287754621], length 287
05:14:59.994083 IP (tos 0x0, ttl 64, id 49771, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x1fc4), seq 287, ack 5633, win 485, options [nop,nop,TS val 118988068 ecr 3287754623], length 0
05:14:59.995701 IP (tos 0x0, ttl 64, id 49772, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x1dd9), seq 287, ack 6105, win 501, options [nop,nop,TS val 118988069 ecr 3287754625], length 0
05:14:59.996879 IP (tos 0x0, ttl 64, id 49773, offset 0, flags [DF], proto TCP (6), length 116)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [P.], cksum 0xe700 (incorrect -> 0x0739), seq 287:351, ack 6105, win 501, options [nop,nop,TS val 118988070 ecr 3287754625], length 64
05:14:59.996970 IP (tos 0x0, ttl 64, id 49774, offset 0, flags [DF], proto TCP (6), length 138)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [P.], cksum 0xe716 (incorrect -> 0x6424), seq 351:437, ack 6105, win 501, options [nop,nop,TS val 118988071 ecr 3287754625], length 86
05:14:59.997049 IP (tos 0x0, ttl 64, id 49775, offset 0, flags [DF], proto TCP (6), length 184)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [P.], cksum 0xe744 (incorrect -> 0xeaa5), seq 437:569, ack 6105, win 501, options [nop,nop,TS val 118988071 ecr 3287754625], length 132
05:14:59.998619 IP (tos 0x0, ttl 64, id 49776, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x1be0), seq 569, ack 6322, win 501, options [nop,nop,TS val 118988072 ecr 3287754628], length 0
05:14:59.998648 IP (tos 0x0, ttl 64, id 49777, offset 0, flags [DF], proto TCP (6), length 83)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [P.], cksum 0xe6df (incorrect -> 0x4699), seq 569:600, ack 6322, win 501, options [nop,nop,TS val 118988072 ecr 3287754628], length 31
05:15:00.001052 IP (tos 0x0, ttl 64, id 27837, offset 0, flags [DF], proto TCP (6), length 60)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [S], cksum 0xe6d1 (incorrect -> 0xe0d7), seq 4293780694, win 65320, options [mss 1420,sackOK,TS val 2768777777 ecr 0,nop,wscale 7], length 0
05:15:00.002878 IP (tos 0x0, ttl 64, id 27838, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [.], cksum 0xe6c9 (incorrect -> 0x5b53), seq 4293780695, ack 1618472241, win 511, options [nop,nop,TS val 2768777778 ecr 4104875756], length 0
05:15:00.003079 IP (tos 0x0, ttl 64, id 27839, offset 0, flags [DF], proto TCP (6), length 339)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [P.], cksum 0xe7e8 (incorrect -> 0xa7d9), seq 0:287, ack 1, win 511, options [nop,nop,TS val 2768777779 ecr 4104875756], length 287
05:15:00.015189 IP (tos 0x0, ttl 64, id 27840, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [.], cksum 0xe6c9 (incorrect -> 0x4435), seq 287, ack 5633, win 485, options [nop,nop,TS val 2768777791 ecr 4104875768], length 0
05:15:00.019172 IP (tos 0x0, ttl 64, id 27841, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [.], cksum 0xe6c9 (incorrect -> 0x4245), seq 287, ack 6105, win 501, options [nop,nop,TS val 2768777795 ecr 4104875772], length 0
05:15:00.020132 IP (tos 0x0, ttl 64, id 27842, offset 0, flags [DF], proto TCP (6), length 116)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [P.], cksum 0xe709 (incorrect -> 0x4fa9), seq 287:351, ack 6105, win 501, options [nop,nop,TS val 2768777796 ecr 4104875772], length 64
05:15:00.020226 IP (tos 0x0, ttl 64, id 27843, offset 0, flags [DF], proto TCP (6), length 138)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [P.], cksum 0xe71f (incorrect -> 0xbc63), seq 351:437, ack 6105, win 501, options [nop,nop,TS val 2768777796 ecr 4104875772], length 86
05:15:00.020313 IP (tos 0x0, ttl 64, id 27844, offset 0, flags [DF], proto TCP (6), length 171)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [P.], cksum 0xe740 (incorrect -> 0x1e38), seq 437:556, ack 6105, win 501, options [nop,nop,TS val 2768777796 ecr 4104875772], length 119
05:15:00.025659 IP (tos 0x0, ttl 64, id 27845, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [.], cksum 0xe6c9 (incorrect -> 0x4052), seq 556, ack 6322, win 501, options [nop,nop,TS val 2768777801 ecr 4104875779], length 0
05:15:00.025711 IP (tos 0x0, ttl 64, id 27846, offset 0, flags [DF], proto TCP (6), length 83)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [P.], cksum 0xe6e8 (incorrect -> 0xd5e8), seq 556:587, ack 6322, win 501, options [nop,nop,TS val 2768777801 ecr 4104875779], length 31
05:15:00.043638 IP (tos 0x0, ttl 64, id 49778, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x1665), seq 600, ack 7648, win 501, options [nop,nop,TS val 118988117 ecr 3287754629], length 0
05:15:00.233601 IP (tos 0x0, ttl 64, id 27847, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [.], cksum 0xe6c9 (incorrect -> 0x2bd4), seq 587, ack 11121, win 501, options [nop,nop,TS val 2768778009 ecr 4104875987], length 0
05:15:00.234626 IP (tos 0x0, ttl 64, id 27848, offset 0, flags [DF], proto TCP (6), length 87)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [P.], cksum 0xe6ec (incorrect -> 0x6bac), seq 587:622, ack 11152, win 501, options [nop,nop,TS val 2768778010 ecr 4104875987], length 35
05:15:00.434281 IP (tos 0x0, ttl 64, id 27849, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [F.], cksum 0xe6c9 (incorrect -> 0x2ac5), seq 622, ack 11152, win 501, options [nop,nop,TS val 2768778210 ecr 4104875990], length 0
05:15:00.434304 IP (tos 0x0, ttl 64, id 49779, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [F.], cksum 0xe6c0 (incorrect -> 0x14dd), seq 600, ack 7648, win 501, options [nop,nop,TS val 118988508 ecr 3287754629], length 0
05:15:00.434314 IP (tos 0x0, ttl 64, id 11873, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [F.], cksum 0x1728 (incorrect -> 0xf68d), seq 2481, ack 14444, win 501, options [nop,nop,TS val 3353963162 ecr 1133339827], length 0
05:15:00.434467 IP (tos 0x0, ttl 64, id 11874, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [.], cksum 0x1728 (incorrect -> 0xf4c6), seq 2482, ack 14445, win 501, options [nop,nop,TS val 3353963162 ecr 1133340281], length 0
05:15:00.436252 IP (tos 0x0, ttl 64, id 27850, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.50122 > 18.65.202.96.443: Flags [.], cksum 0xe6c9 (incorrect -> 0x29fb), seq 623, ack 11153, win 501, options [nop,nop,TS val 2768778212 ecr 4104876189], length 0
05:15:00.436271 IP (tos 0x0, ttl 64, id 49780, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x1325), seq 601, ack 7649, win 501, options [nop,nop,TS val 118988510 ecr 3287755066], length 0
```

以下はGCE(10.0.0.2)からPrivate Service Connectエンドポイント(10.0.3.0)へのアクセスしてGCSへアクセスしているパケットのキャプチャだと思います。

> 05:14:59.618319 IP (tos 0x0, ttl 64, id 11848, offset 0, flags [DF], proto TCP (6), length 60)
    10.0.0.2.53478 > 10.0.3.0.443: Flags [S], cksum 0x1730 (incorrect -> 0xad7d), seq 1890652633, win 65320, options [mss 1420,sackOK,TS val 3353962346 ecr 0,nop,wscale 7], length 0

もう一つterraform init時にGCE(10.0.0.2)から18.65.202.87へアクセスしているパケットをキャプチャすることができました。

> 05:15:00.436271 IP (tos 0x0, ttl 64, id 49780, offset 0, flags [DF], proto TCP (6), length 52)
    10.0.0.2.34760 > 18.65.202.87.443: Flags [.], cksum 0xe6c0 (incorrect -> 0x1325), seq 601, ack 7649, win 501, options [nop,nop,TS val 118988510 ecr 3287755066], length 0

こちらについてもう少し調べてみます。
tcpdump -n -vv dst port 53コマンドを実行してterraform initを実施し、GCEから53ポートへアクセスしたパケットをキャプチャしてみました。

```bash tcpdump -n -vv dst port 53コマンド実行結果
xxxxxxxxxx@tky-bastion:~/terraform$ sudo tcpdump -n -vv dst port 53
tcpdump: listening on ens4, link-type EN10MB (Ethernet), capture size 262144 bytes
05:28:31.201384 IP (tos 0x0, ttl 64, id 52411, offset 0, flags [DF], proto UDP (17), length 96)
    10.0.0.2.59890 > 169.254.169.254.53: [bad udp cksum 0x5e5c -> 0xa496!] 31699+ [1au] AAAA? storage-sampleendpoint.p.googleapis.com. ar: . OPT UDPsize=512 (68)
05:28:31.201482 IP (tos 0x0, ttl 64, id 37003, offset 0, flags [DF], proto UDP (17), length 96)
    10.0.0.2.52697 > 169.254.169.254.53: [bad udp cksum 0x5e5c -> 0x3727!] 8284+ [1au] A? storage-sampleendpoint.p.googleapis.com. ar: . OPT UDPsize=512 (68)
05:28:31.596564 IP (tos 0x0, ttl 64, id 831, offset 0, flags [DF], proto UDP (17), length 78)
    10.0.0.2.43466 > 169.254.169.254.53: [bad udp cksum 0x5e4a -> 0x143a!] 35627+ [1au] A? registry.terraform.io. ar: . OPT UDPsize=512 (50)
05:28:31.596653 IP (tos 0x0, ttl 64, id 27444, offset 0, flags [DF], proto UDP (17), length 78)
    10.0.0.2.58257 > 169.254.169.254.53: [bad udp cksum 0x5e4a -> 0x126e!] 14384+ [1au] AAAA? registry.terraform.io. ar: . OPT UDPsize=512 (50)
```
すると、`storage-sampleendpoint.p.googleapis.com`のほかに`registry.terraform.io`を名前解決していることがわかりました。
>05:28:31.596564 IP (tos 0x0, ttl 64, id 831, offset 0, flags [DF], proto UDP (17), length 78)
    10.0.0.2.43466 > 169.254.169.254.53: [bad udp cksum 0x5e4a -> 0x143a!] 35627+ [1au] A? registry.terraform.io. ar: . OPT UDPsize=512 (50)
05:28:31.596653 IP (tos 0x0, ttl 64, id 27444, offset 0, flags [DF], proto UDP (17), length 78)
    10.0.0.2.58257 > 169.254.169.254.53: [bad udp cksum 0x5e4a -> 0x126e!] 14384+ [1au] AAAA? registry.terraform.io. ar: . OPT UDPsize=512 (50

今度はdigコマンドを利用して`registry.terraform.io`を名前解決してみます。
すると先ほどの`tcpdump -n -vv dst port 443`コマンドを実行して出力されたIPアドレス`18.65.202.87`が存在することがわかりました。
registry.terraform.io(18.65.202.87)への通信はCloud Nat/インターネット経由でアクセスしています。

```bash dig registry.terraform.ioコマンド実行結果
xxxxxxxxxx@tky-bastion:~/terraform$ dig registry.terraform.io

; <<>> DiG 9.16.1-Ubuntu <<>> registry.terraform.io
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 7463
;; flags: qr rd ra; QUERY: 1, ANSWER: 5, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 65494
;; QUESTION SECTION:
;registry.terraform.io.         IN      A

;; ANSWER SECTION:
registry.terraform.io.  80      IN      CNAME   d3rdzqodp6w8cx.cloudfront.net.
d3rdzqodp6w8cx.cloudfront.net. 60 IN    A       18.65.202.96
d3rdzqodp6w8cx.cloudfront.net. 60 IN    A       18.65.202.27
d3rdzqodp6w8cx.cloudfront.net. 60 IN    A       18.65.202.107
d3rdzqodp6w8cx.cloudfront.net. 60 IN    A       18.65.202.87　★該当IPアドレス

;; Query time: 52 msec
;; SERVER: 127.0.0.53#53(127.0.0.53)
;; WHEN: Sat Mar 25 05:32:10 UTC 2023
;; MSG SIZE  rcvd: 157
```

このことからTerraform 1.4.0で追加されたPrivate Service Connectを利用したbackend/gcsへのアクセスの機能を利用してもbackendのGCSへの通信のみプライベート接続され、Terraformのgoogle providerなどを利用するためにregistry.terraform.ioへのインターネットアクセスは避けられず完全プライベートではterraformは利用できないことが分かりました（当たり前か...）


# 最後に

今回はTerraform 1.4で追加されたPrivate Service Connectエンドポイント経由でbackendに指定したGCSへアクセスできることができる機能を検証しました。

Private Service Connect自体も実務で使用したことがなかったので、勉強になりました。Private Service Connectを利用しプライベートネットワーク経由で backendのGCSへアクセスすることは確認できましたが、結局Terraformを利用するためには、インターネットへ接続できることが条件なので、Private Service Connectの構築・運用コストを考えるとよほどのセキュリティ要件がなければ通常のインターネット経由でbackendのGCSへアクセスする構成が無難かと思いました。
