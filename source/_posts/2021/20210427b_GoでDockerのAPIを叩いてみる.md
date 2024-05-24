---
title: "GoでDockerのAPIを叩いてみる"
date: 2021/04/27 00:00:03
postid: b
tag:
  - Docker
  - TechNight
  - 登壇レポート
  - Go
  - OSS
  - ログ
category:
  - Programming
thumbnail: /images/20210427b/thumbnail.png
author: 澁川喜規
lede: "Future Tech Night #7で「GoでDockerのAPIを叩いてみる」という発表をしてきました。近年、コンテナの利用はますます増えています。実行環境としても、クラウドサービスでコンテナをホストするサービスは増えています。コンテナを動かすサービスもあれば、K8Sの利用も増えています。Kubernetesも最小のビルディングブロックはコンテナです。K8SのKnativeベースのGCP Cloud Runが僕の最近のお気に入りです。AWS Lambdaもコンテナを実行できるようになりました"
---
[Future Tech Night #7](https://future.connpass.com/event/206387/)で「GoでDockerのAPIを叩いてみる」という発表をしてきました。

他の登壇者のレポートはこちらです。

* [Goのフラットパッケージについて登壇しました](/articles/20210427a/)
* [GoにおけるAPIドキュメントベースのWeb API開発について登壇しました](/articles/20210427c/)


近年、コンテナの利用はますます増えています。実行環境としても、クラウドサービスでコンテナをホストするサービスは増えています。コンテナを動かすサービスもあれば、K8Sの利用も増えています。Kubernetesも最小のビルディングブロックはコンテナです。K8SのKnativeベースのGCP Cloud Runが僕の最近のお気に入りです。

<img src="/images/20210427b/スクリーンショット_2021-03-18_23.43.23.png" alt="Clloud Runロゴ" loading="lazy">

AWS Lambdaもコンテナを実行できるようになりました

* https://www.publickey1.jp/blog/20/aws_lambdaaws_reinvent_2021.html

実行環境だけではなく、開発環境としても必要不可欠なツールになってきています。OSやバージョンが違っても同じ環境を再現できます。データベースなどのミドルウェアもOSにインストールすることなく、プロジェクトごとに個別の環境を作るのも簡単になりました。

そのコンテナのデファクトとなっているのがDockerです。Dockerはコンテナのオールインワンツールで、コンテナのビルドから実行までできますし、複数のコンテナを連携して動かす機能（オーケストレーション）もdocker-composeコマンドで提供されています。

コンテナ自体はDockerだけに限定されるされるものではありません。ビルドはdocker build以外にも、Bazelでも、Buildpacksでも、作成する手段は他にもあります。実行する部分はOCI Runtime Specificationという規格があり、Dockerもその1つです。

とはいえDockerは便利です。WindowsでもmacでもLinuxでもインストーラで環境が整うので、Dockerの環境構築でトラブル、という例は聞いたことがありません。Docker Hubでさまざまなイメージが1コマンドでダウンロードして起動できるのも良いですし、何よりも情報が多いというメリットがあります。

[M1 Macの互換性情報のメモ](https://qiita.com/shibukawa/items/797b7cbb7e530842e6f7)をQiitaに公開したときも感想として一番多かったのが、「Dockerが動くなら買おうかな」というものでした。このエントリーではDockerをもっと活用する方法について紹介します。

# Dockerの仕組み

Dockerをインストールして実際にサーバーなりを起動する場合、操作はdockerコマンドで行います。このdockerコマンドは単に命令を送るだけで、実態はWindowsなりLinuxなりmacOSで常駐プログラムとして実装されているサーバー(dockerd)が行います。

<img src="/images/20210427b/スクリーンショット_2021-04-23_0.32.50.png" alt="dockerdがdockerコマンドを受け取る図" loading="lazy">

Linuxはプロセスやファイルシステムを隔離してそのプロセスだけが動いているように見える状態で動きます。Linuxカーネルが持つ機能を使います。WindowsとmacはHyperVやHypervisor.FrameworkといったOSが持つ仮想PC機能を使い、Linuxを動かし、その中でLinuxカーネルの機能を使って動かします。コンテナごとに独立したOSが起動しているわけではなく、1つのLinuxの中で隔離機能を使って作った環境の中でそれぞれのプロセスが起動します。

コマンドからサーバーへのアクセスは、通常は/var/run/docker.sockというUnixドメインソケットを通じて動かします。これはHTTPサーバーがこのUDPの中で動いています。別ホストであればDOCKER_HOST環境変数を設定することでTCP/IPを使った連携ができます。

このサーバーにアクセスすると、コンテナを起動したり止めたりといったコンテナの操作ができます。また、このUDPはDockerのボリュームマウントを使ってコンテナの中に持ち込むことができます。そうすると、コンテナの中からあらゆるコンテナ操作ができる、特権コンテナのようなことも可能になります。

UDPベースのHTTPなので、curlコマンドでコンテナを操作できます。次のサンプルはhello-worldイメージを実行してそのログをコンソールに出力するコマンドです（CIDは最初のコマンド実行後に出力されるコンテナのIDが代入されているものとします)。

```sh
$ curl --unix-socket /var/run/docker.sock -H "Content-Type: application/json" \
  -d '{"Image": "hello-world"}' \
  -X POST http://localhost/containers/create

$ curl --unix-socket /var/run/docker.sock -X POST http://localhost/containers/${CID}/start

$ curl --unix-socket /var/run/docker.sock -X POST http://localhost/containers/${CID}/wait

$ curl --unix-socket /var/run/docker.sock "http://localhost/containers/${CID}/logs?stdout=1"
```

dockerコマンドなどはこの命令を自分で組み立てているわけではなく、GoやPythonのSDKを使って実装されています。このSDKを使うことでこれらの公式コマンドと同じことができます。

https://docs.docker.com/engine/api/sdk/

<img src="/images/20210427b/スクリーンショット_2021-03-18_23.20.12.png" alt="Docker Engine SDKsページのキャプチャ" loading="lazy">

# Dockerのログビューアを作ってみる

近年のサービス開発では、オブザーバビリティが大事という機運が高まっています。ただ、数多くのSaaSなサービスはあるものの、手元で開発環境を用意するのは意外と面倒だったりします。オブザーバビリティでは次のような項目が技術要素として挙げられています。

* 構造化ログ
* トレーシング
* メトリックス

オブザーバビリティではこれらのルールに従ったログを出すアプリケーションと、それを閲覧するビューアが二人三脚で必要となります。とりあえず先頭の要素を実現するものを実装してみます。ログ出力は[JSONを出力する構造化ロガーが各言語にあったり](https://github.com/ymotongpoo/cloud-logging-configurations)しますので、そのあたりを使って行区切りのJSON（JSONL）として出力したものをパースして色付けして出力します。

このブログの[フューチャーOSS推進タスクフォース始めます](/articles/20201107/)の記事の中で、ログビューアというものがこっそり書かれていましたが、それがこれにあたります。

<img src="/images/20210427b/スクリーンショット_2021-04-23_1.24.57.png" alt="構造ログビューアをやると書いているブログ記事" loading="lazy">

最終的に出来上がったコードがこれです。

https://gitlab.com/osaki-lab/secondsight

アーキテクチャはこんな感じです。

<img src="/images/20210427b/スクリーンショット_2021-04-23_1.25.24.png" alt="DockerログをオンメモリDBに保存、GoでWebAPIをたててgo:embedでHTML/JSを配信してするReactアプリ" loading="lazy">

## Docker APIの利用

前述のドキュメントページのリファレンスなどをまず確認し、実行したい機能をまずは探します。dockerコマンドと必ずしも1:1になっているとは限らないので注意が必要です。ログビューアを作るには次のAPIを利用してみると良さそうです。

* コンテナのIDをリストアップ
     [Containers - List Containers](https://docs.docker.com/engine/api/v1.41/#operation/ContainerList)
* コンテナの詳細情報を知る
     [Containers - Inspect a Container](https://docs.docker.com/engine/api/v1.41/#operation/ContainerInspect)
* コンテナのイベント（起動とか停止）を取得
     [System - Monitor Events](https://docs.docker.com/engine/api/v1.41/#operation/SystemEvents)
* コンテナのログを取得
     [Containers - Get Container Logs](https://docs.docker.com/engine/api/v1.41/#operation/ContainerLogs)
* コンテナの消費リソースを取得
     [Containers - Get container stats based on resource usage](https://docs.docker.com/engine/api/v1.41/#operation/ContainerStats)

なお、Docker SDKを網羅するサンプルコードとして、dockerコマンド自身があります。コードなんかを探索するとパラメータや返り値の加工方法が一発で理解できます。ためしに``ContainerStats()``などを検索してみてください。

https://github.com/docker/cli

完成したのが次のプログラムです。半年ぐらい前に作って放置していたものを、発表の一週間前ぐらいからいじり初めてGoのコードをゼロから作り直して、動くようにしてみました（ので実践投入はまだ）。壮大な構想のために複雑化していたところをバサッと切り捨ててシンプルにしました。

<img src="/images/20210427b/secondsight.gif" alt="ログビューアの動作イメージ動画" loading="lazy">

なお、これの実装中に調べて書いたのが次のエントリーです。

* [Go 1.16のembedとchiとSingle Page Application](/articles/20210408/)

それ以外の実装部分の理解の助けになるエントリーもいくつもあります。

* [Go 1.16のsignal.NotifyContext()](/articles/20210212/)
* [Go 1.16からリリースされたgo:embedとは](/articles/20210208/)
* [Parcel 2.0 beta.1を試す](/articles/20201111/)
* [TypeScriptでReactをやるときは、小さいアプリでもReduxを最初から使ってもいいかもねというお話](/articles/20200501/)

他にも、サーバーレス連載などでDockerやCloud Runについて書いた記事も多数あります

軽く作ってみると、構造化ログが見えるのは便利です。色がつくとわかりやすいです。今後も、暇を見つけていろいろ機能を足していきたいです。フィルタや検索機能OpenCensus/OpenTelemetryのトレースログ、メトリクスの表示などです。ログ出力ライブラリによっていろいろクセがあったりするので、それぞれの出力をパースしてみやすくするのもいいですね。

# まとめ

Dockerは今時な開発を支える重要なツールですが、Go SDKでいじってみるのは簡単でカスタマイズが可能です。実際にそれらを使うサンプルコードも紹介しました。クラウドサービスを使えば便利なものをローカルで気軽に実現するツールとかは作ってみるチャンスな予感（大手は投資しないだろうし）


今後、フューチャーでもいろいろOSSを作ったりしていきたいと思っています


