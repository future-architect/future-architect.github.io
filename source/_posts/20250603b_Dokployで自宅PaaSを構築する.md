---
title: "Dokployで自宅PaaSを構築する"
date: 2025/06/03 00:00:01
postid: b
tag:
  - Dokploy
  - Docker
  - Traefik
category:
  - DevOps
thumbnail: /images/20250603b/thumbnail.png
author: 澁川喜規
lede: "Dokployというのを知ったので動かしてみました。よくあるクラウドサービスのPaaSマネージドサービスようなインフラをオンプレ環境やVPSなどに簡単に構築できるものです。"
---

<img src="/images/20250603b/logo.png" alt="" width="818" height="368">

[CI/CD連載](/articles/20250603a/) 1本目の記事です。

Dokployというのを知ったので動かしてみました。よくあるクラウドサービスのPaaSマネージドサービスようなインフラをオンプレ環境やVPSなどに簡単に構築できるものです。自宅サーバーは欲しいなと思いつつ（昔たててqmailで自宅メールサーバー運用したりしたことはあったが）、K8sはあんまり興味ないな、と思っていて何かしらいいのがないかなと思っていたところ、結構自分の理想に近かったので試してみました。

* ソースコードをアップロードしてコンテナでサービス起動
* 各種OSSのサービスを簡単起動
* これらすべてウェブベースの管理画面があり、AWSとかGoogle Cloudの管理画面のようにシステムの設定や閲覧ができる
* ログ、メトリックスのビューア完備(Dozzleとかを自前で立てる必要はない)

今回試していない機能ですが、以下の機能もあります

* 通知
* Docker Swarmベースの複数のサーバーノード管理
* 管理画面のユーザー管理
* バックアップ機能付きのデータベースサポート
* GitHubやGitLabと連携した自動デプロイ
* スケジュール機能
* SSH鍵管理とか

このサービスはDockerとTraefikのリバースプロキシサーバが主要要素で、コンテナでアプリケーションを起動できます。アプリケーションをビルドしてDocker上で起動したり、Docker上で動いているデータベースのデータをバックアップしたりする便利機能群を提供しています。

なお、Dokployそのものはローカルマシンに入れずに、SaaSで動いているDokployに外部からマシン管理機構だけを任せる運用というサービスも提供されています。月当たり$3.5/台+$1ぐらい。また、さまざまなホスティング環境もサポートしています。

# インストールしてみる

DokployはLinuxのみをサポートしています。macOSでは直接は動かないのでLinuxの仮想PCを入れてその上で動かします。

macOSは仮想化機能がOS内蔵なのにWSLみたいな直接使えるインタフェースがないので、[UTM](https://mac.getutm.app)を入れてその上でDebianを動かします。WWDCのたびにVirtualization Frameworkの新情報を待ち望んでいるのですが・・・今年は新情報来たらいいな。

UTMはApp Storeでも入れられますし、公式サイトからダウンロードしてもいいですし、Homebrew使って ``brew install --cask utm`` でもお好きな方法を選びます。

## Linuxインストール

DokployがサポートしているOSはDebian, Ubuntu, Centosです。今回はUbuntuを選びました。手元のmacはM3なので[下記のページ](https://www.debian.org/distrib/netinst)の「小さなCDまたはUSBメモリ」のARM64のイメージをダウンロードします。Debian Downloadで出てくるサイトだとAMD64版しかないので要注意

UTMのウインドウで＋ボタンを押して「仮想化」を選びます。OS選択ではLinuxを選び、Apple仮想化と、ISOイメージで先ほどダウンロードした.isoファイルを選択して、あとはすべてデフォルトでインストールしていきました。特にパッケージなども追加はしていません。SSHサーバのみが入った感じですかね。

起動してIDとパスワードを入れて起動できたら、``sudo``と``curl``コマンドだけインストールしておきます。

```sh
$ su -
(rootのパスワードを入れる)
$ apt-get install sudo curl
$ adduser debian sudo
```

内部で起動したサービスにつながるかテスト。ネットワークはデフォルトのホストネットワークを使っています。まずはゲストの中でIPアドレスを確認します。192.168.64.7というIPv4アドレスを持っているようです。

```sh
$ ip a
1: lo: ...
    :
2: enp0s1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_code1...
    link/ether 92:60:fc:72:aa:9c brd ff:ff:ff:ff:ff:ff
    inet 192.168.64.7/24 brd 192.168.64.255 scope global dynamic enp0s1
    :
```

引き続き、ゲストの中からPythonのウェブサーバーを起動してみます。

```sh
$ python3 -m http.server
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

ホストのマシンからこのゲスト上で動いているサービスにアクセスしてみてHTMLが帰ってきたら無事にサーバーがでっきていることの確認ができます。

```sh
% curl http://192.168.64.7:8000
<!DOCTYPE HTML>
<html lang="en">
:
```

これでLinuxのインストールは完了。

## Dokployのインストール

Dokployはシェルでインストールします。さまざまなビルドツールとかをダウンロードするので、そこそこの量のダウンロードが走ります。間違ってもテザリングでやらないように・・・勇気と無謀は違います。この手のシェルでインストールはちょっと怖い気持ちはあるのですが、まあ何もないLinux仮想環境なのでえいやで実行します。最後のシェル実行だけroot権限が必要なので``sudo``をつけます。

```bash
$ curl -sSL https://dokploy.com/install.sh | sudo sh
```

最後に管理画面のURLが表示されますが、IP部分は先ほど``ip a``コマンドで出てきたものを使います。

<img src="/images/20250603b/スクリーンショット_2025-05-12_21.24.11.png" alt="スクリーンショット_2025-05-12_21.24.11.png" width="1200" height="767" loading="lazy">

# アプリケーションのデプロイ

アプリケーションをデプロイしていきます。

## 設定ファイルなしの自動ビルド(Railpack)

まずはGoのアプリケーションを作ってみます。ふつうのウェブアプリケーションです。

```text go.mod
module goapp

go 1.24
```

```go main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"
)

func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "hello world")
}

func main() {
	http.HandleFunc("/hello", hello) // /hello以下でリクエストを受ける
	srv := &http.Server{
		Addr: ":8080",
	}
	go func() {
		log.Printf("start listening at %s\n", srv.Addr)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe(): %v", err)
		}
	}()
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	<-ctx.Done()
	ctx2, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx2); err != nil {
		log.Fatalf("Fail to shutdown: %v", err)
	}
}
```

すべてのアプリケーション、データベースなどは「サービス」という名前のインスタンスで、各サービスは必ず「プロジェクト」に属すという構成になっています。プロジェクト共有で環境変数を設定したり、サービスごとに環境変数を設定することもできます。まずはプロジェクトを作ります。名前を入れるだけですね。go appにしました。

<img src="/images/20250603b/スクリーンショット_2025-05-16_10.36.28.png" alt="スクリーンショット_2025-05-16_10.36.28.png" width="1082" height="620" loading="lazy">

プロジェクトの中にはサービスをおきます。サービスは（自作）アプリケーション、データベース、Compose、テンプレート（後述）、AIで相談して作る、というのがあります。今回はアプリケーションを作ります。こちらもほぼ名前だけです。サーバーはDokployを複数サーバー管理に使っている場合に選びます。今回は1台だけなので選ぶ必要はありません。

<img src="/images/20250603b/スクリーンショット_2025-05-16_10.37.27.png" alt="スクリーンショット_2025-05-16_10.37.27.png" width="1173" height="731" loading="lazy">

アプリケーションのGeneralタブでアプリケーションをデプロイします。ビルドタイプはDockerやBuildpackなどいろいろありますがデフォルトのRailpackにしました。Gitとかと接続もできますが、今回はローカルで作ったzipのソースをドラッグしてデプロイします。Railpackの場合、Goアプリケーションはトップにmain.goがあればこれをアプリとみなしてビルドするようです。Deployボタンをおせば初回は50秒、2回目は9秒ほどでビルドが終わりました。

<img src="/images/20250603b/スクリーンショット_2025-05-16_10.31.46.png" alt="スクリーンショット_2025-05-16_10.31.46.png" width="912" height="724" loading="lazy">

外からアクセスできるようにするためにはドメインを作成します。DMZで動いているマシンならtraefik.meのサブドメインの無料のドメイン発行機能もあり、ボタン一発（サイコロアイコン）で外からもアクセスさせることもできます。

<img src="/images/20250603b/スクリーンショット_2025-05-14_11.57.26.png" alt="スクリーンショット_2025-05-14_11.57.26.png" width="1200" height="766" loading="lazy">

Deokployが動いているサーバーの80番ポートでサービスは公開されるので、そのアドレスで起動すればOKですね。

<img src="/images/20250603b/スクリーンショット_2025-05-16_19.52.19.png" alt="スクリーンショット_2025-05-16_19.52.19.png" width="848" height="336" loading="lazy">

複数アプリケーション起動したくなると思うので、その場合はドメインのパスを ``/`` から ``/hello``とすればそれ以外のパスは他のアプリから使えます。ただし、アプリケーションが受け取るパスはこのプリフィックス部分も含むため、プリフィックス部分は環境変数とかで変えられる機能をアプリ側につけると良さそうです。パスのプリフィックスをトリムする機能はなさげですので。

なおブラウザの管理画面からデプロイ（ビルド）時のログが見れたり、アプリケーションのログも見れるし、メトリックスも見れるし、シェルがあるならコンテナの中に入ることもできるし、コマンドを起動もできるし、ローカル開発と遜色なく利用できます。

## 複数のアプリケーションを起動の準備

PaaSなので複数のアプリケーションを稼働させられます。ただ、各アプリケーションはみんな自分のパスの空間を持っています。例えば、`/health`でヘルスチェック用のエンドポイントを提供というのはみんなやっているので、80番ポートにフラットにマウントされてしまうと複数のアプリケーションが稼働できません。そこで、バーチャルホストの設定をして複数起動できるようにします。

先ほどのGoアプリと、このPythonアプリ、どちらも ``/hello``というエンドポイントを持っています。192.168のアドレスにマッピングすると使い分けられません。DokployにはTraefikというプロキシが内蔵されています。このプロキシがリクエストを受けるときに、HTTPリクエストに含まれるhostヘッダーフィールドを見て後続のサービスを判断してリクエストを投げ分けます。

<img src="/images/20250603b/virtualhost.png" alt="virtualhost.png" width="561" height="181" loading="lazy">

そのためにはサービスごとにドメインを発行する必要があります。hostsファイルでも良かったのですがワイルドカード対応のためにdnsmasqをローカルに入れて使います。macOSの手順を書いています。他のOSの方は生成AIにでも投げて自分の環境に合わせて変更してください。

```bash
# dnsmasqをインストール
$ brew install dnsmasq
```

設定ファイルは以下の通りです。Linuxだと/etc/dnsmasq.confですかね。ローカル用に`private`というトップレベルドメインを作ってしまいましょう。次の行を足します。どんなサブドメイン向けのリクエストもこのIPアドレスが返ります。

```text /opt/homebrew/etc/dnsmasq.conf
address=/.private/192.168.64.7
```

privateドメインだけはこのDNSサーバーを見にいくようにします。`/etc/resolver/`フォルダを作り`private`というファイルを作成して以下の内容を書きます。

```text /etc/resolver/private
nameserver 127.0.0.1
```

最後にDNSサーバーとOSキャッシュをクリアします。

```bash
$ sudo brew services restart dnsmasq
$ sudo killall -HUP mDNSResponder
```

試しに`ping test.private`とかいろいろ叩いてみて、192.168.64.7を向いているか確認します。確認できたらアプリをインストールします。

## Docker形式のアプリのビルド

以下の記事で書いたPythonアプリケーションをデプロイしてみます。

* [FastAPI on Dockerがかなりシンプルになった(2025年版)](https://qiita.com/shibukawa/private/8fe5b17883f420c86b5b)

プロジェクトは先ほどの使い回しでも新規で作っても大丈夫です。その後サービスを作ります。今度のアプリケーションはDockerファイル入りなので、ビルドタイプにDockerfileを選び、ファイル名のDockerfileも入れます。あとはまたzipにしてドロップしてデプロイボタンを押せばビルド完了です。

<img src="/images/20250603b/スクリーンショット_2025-05-18_18.57.02.png" alt="スクリーンショット_2025-05-18_18.57.02.png" width="946" height="591" loading="lazy">

ドメイン設定では``pyapp.private``というドメインを追加します。

<img src="/images/20250603b/スクリーンショット_2025-05-18_18.59.35.png" alt="スクリーンショット_2025-05-18_18.59.35.png" width="991" height="514" loading="lazy">

先ほどのGoのアプリケーションの方のドメイン設定には``goapp.private``というドメインを追加しておきます。ドメインは複数設定できるので前のものは消さなくても大丈夫です。

<img src="/images/20250603b/スクリーンショット_2025-05-18_19.15.38.png" alt="スクリーンショット_2025-05-18_19.15.38.png" width="1030" height="744" loading="lazy">

新しいドメインでアクセスすると複数のサービスが同時に利用できました。

<img src="/images/20250603b/スクリーンショット_2025-05-18_19.17.42.png" alt="スクリーンショット_2025-05-18_19.17.42.png" width="776" height="555" loading="lazy">

## テンプレートカタログからアプリケーションのデプロイ

自作のアプリケーション以外にも人気のアプリケーションを簡単にデプロイできるテンプレートがあります。

<img src="/images/20250603b/スクリーンショット_2025-05-16_20.24.16.png" alt="スクリーンショット_2025-05-16_20.24.16.png" width="1200" height="663" loading="lazy">

試しにminioを選択しました。サーバー選択だけですぐにアプリが登録できました。デプロイ（コンテナのダウンロード）はされていない状態です。ドメインはtraefikの自動生成になっていているので``minio.private``に書き換えて、デプロイボタンをおしたところ、あっという間に起動しました。パスワードなどは環境変数のところに書いてありました。楽勝ですね。

<img src="/images/20250603b/スクリーンショット_2025-05-18_19.29.01.png" alt="スクリーンショット_2025-05-18_19.29.01.png" width="913" height="608" loading="lazy">

# Dokployでできないこと

ドメインの管理はdnsmasqでやりました。AWSとかだとRoute 53みたいなサービスでドメインも一緒にコントロールできますが、ネットワーク周りはオンプレだったり外からアクセスできるサービスだったり、有料のドメインだったりが絡むので扱いきれないのはまあ仕方がないですね。

Dokployそのものの制限というよりも下で動いているDocker/Traefikの制約でできないのがオートスケールです。スケールそのものはDocker Composeの機能にあるのですが、明示的にコマンドを打つ必要があります。AWSやGoogle CloudのロードバランサーはサービスのメモリやCPUの計測値や接続数をみてスケーリングを行えます。モニタリングは大変でも、接続数が70超えたらインスタンス増やす、みたいなのが簡単にできる（ついでにしばらくアクセスがなかったらインスタンスがなくなる）とかがあれば、少なめリソースの自宅サーバーでたくさんサービスを起動しておいて・・・・みたいなのができるんですけどね。

# まとめ

「アプリケーション」「データベース」の2つに特化したローカルPaaSのDokployで遊んでみた記録でした。今回はデータベース周りの機能はまだ触らず、またcomposeで複数のアプリの組み合わせを起動みたいなことはしていませんが、基本的なアプリケーションのデプロイを色々試したり、

クラウドのコンソールでちょいちょいアプリケーションを動かして遊んでいた人は、それがそのままオンプレやローカルで動くと考えると興味を持つ人は多いんじゃないでしょうか。「技術は螺旋で行ったり来たりする」と言われますが、コンテナや12 factors appといったクラウドで発展したものがオンプレでも便利に使えるようになるという流れは自然な発展な気がします。

もちろん、フルサービスなGoogle CloudやAWSと比べるとネットワーク周りの設定がなかったり機能が少ない点はありますが、モニタリングやログビューアとかも備えており、ローカルで動かしてテストするのと遜色なく利用できます。今回紹介したもの以外にも色々同様のものもあり、今後さらに発展していていってくれるんじゃないかと思っています。

* [Coolify](https://coolify.io/docs/)
* [CapOver](https://caprover.com)
* [Kubero](https://github.com/kubero-dev/kubero)
* [Dokku](https://dokku.com)

DNSサーバーを建てるときに、最初.localでやろうとしてハマって「[macOSのmDNSが別の用途で使う](https://support.apple.com/ja-jp/101903)からダメ」というアドバイスを[@takabow](https://x.com/takabow)と[@takuan_osho](https://x.com/takuan_osho)にもらってなんとか書き切りました。ありがとうございます。

* 参考
  * [Buildpacksのビルダーをスクラッチから作ってみる](https://future-architect.github.io/articles/20201002/)
